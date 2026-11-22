// ==============================================================================
// ATELIER DIGITAL — SUPABASE EDGE FUNCTION: ACCEPT-PORTAL-INVITATION (M09-E2)
// Archivo: supabase/functions/accept-portal-invitation/index.ts
// ==============================================================================
// Orquestador server-side de invitaciones del Portal de Clientas de Alta Costura:
// - Verificación criptográfica de tokens (SHA-256 de 256 bits, CSPRNG).
// - Cero exposición de PII a invocadores anónimos (correo enmascarado únicamente).
// - Máquina de estados Saga para aceptación idempotente (claim -> finalize / release).
// - Forward Recovery estricto: PROHIBIDO invocar auth.admin.deleteUser() ante fallos.
// - Vinculación segura de Auth (Rama A con JWT verificado; Rama B con consentimiento Ley 1581).
// - Extracción de IP a prueba de suplantación (4 vectores) con fallback fail-closed.
// - Candado operativo de seguridad: aceptación y envío real permanecen deshabilitados
//   hasta completar la certificación de IP Gateway y pruebas de seguridad E2.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { dispatchPortalInvitationEmail } from './emailService.ts';

export const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, x-forwarded-for, cf-connecting-ip, x-real-ip, x-e2-test-bypass',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PRIVILEGED_ROLES = new Set(['admin', 'designer', 'superadmin']);

export function jsonResponse(
    data: unknown,
    status = 200,
    extraHeaders: Record<string, string> = {}
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    });
}

/**
 * Calcula el hash SHA-256 en hexadecimal en minúsculas usando Web Crypto API.
 */
export async function computeSha256Hex(token: string): Promise<string> {
    const bytes = new TextEncoder().encode(token.trim());
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Valida el formato de un token de invitación (32 a 128 caracteres, Base64URL/Hex seguro).
 */
export function validateTokenFormat(token?: string | null): boolean {
    if (!token || typeof token !== 'string') return false;
    const trimmed = token.trim();
    if (trimmed.length < 32 || trimmed.length > 128) return false;
    return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Valida formato RFC 4122 UUID v4 para operationId y claves foráneas.
 */
export function isValidUuid(id?: string | null): boolean {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id.trim()
    );
}

/**
 * Enmascara direcciones de correo electrónico para evitar enumeración y fuga de PII.
 * Ejemplo: "catherine.carroll@atelier.com" -> "c***l@a***r.com"
 */
export function maskEmailForDisplay(email?: string | null): string {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return '***@***.***';
    }
    const parts = email.trim().split('@');
    const local = parts[0];
    const domain = parts[1] || '';

    const maskedLocal =
        local.length <= 2
            ? local[0] + '***'
            : local[0] + '***' + local[local.length - 1];

    const dotIdx = domain.lastIndexOf('.');
    if (dotIdx <= 0) {
        return `${maskedLocal}@${domain}`;
    }

    const domainName = domain.slice(0, dotIdx);
    const tld = domain.slice(dotIdx);
    const maskedDomain =
        domainName.length <= 2
            ? domainName[0] + '***'
            : domainName[0] + '***' + domainName[domainName.length - 1];

    return `${maskedLocal}@${maskedDomain}${tld}`;
}

/**
 * Extrae y valida la dirección IP del cliente aplicando defensas contra suplantación (4 vectores).
 * - Evalúa: cf-connecting-ip > x-real-ip > salto derecho de x-forwarded-for.
 * - Rechaza rangos privados (RFC 1918), loopback, CGNAT y sintaxis CIDR/malformada.
 * - Fail-closed: si el Gateway no está formalmente certificado en HTTP real, retorna
 *   ip = null con source = 'untrusted_gateway_fallback'.
 */
export function extractClientIp(req: Request): { ip: string | null; source: string } {
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    const xRealIp = req.headers.get('x-real-ip');
    const xForwardedFor = req.headers.get('x-forwarded-for');

    let candidate: string | null = null;
    let headerSource = 'unavailable';

    if (cfConnectingIp && cfConnectingIp.trim()) {
        candidate = cfConnectingIp.trim();
        headerSource = 'cf-connecting-ip';
    } else if (xRealIp && xRealIp.trim()) {
        candidate = xRealIp.trim();
        headerSource = 'x-real-ip';
    } else if (xForwardedFor && xForwardedFor.trim()) {
        const hops = xForwardedFor
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean);
        if (hops.length > 0) {
            candidate = hops[hops.length - 1];
            headerSource = 'x-forwarded-for-rightmost';
        }
    }

    if (!candidate) {
        return { ip: null, source: 'untrusted_gateway_fallback' };
    }

    // Validación de longitud y caracteres extraños (rechaza inyecciones y CIDR)
    if (
        candidate.length > 45 ||
        candidate.includes('/') ||
        candidate.includes(' ') ||
        candidate.includes('%')
    ) {
        return { ip: null, source: 'invalid_rejected' };
    }

    // Detección de rangos privados / loopback / RFC 1918 / CGNAT / IPv4-en-IPv6
    if (
        /^127\./.test(candidate) ||
        /^10\./.test(candidate) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(candidate) ||
        /^192\.168\./.test(candidate) ||
        /^169\.254\./.test(candidate) ||
        /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(candidate) ||
        /^0\./.test(candidate) ||
        candidate === '::1' ||
        /^fc[0-9a-f]{2}:/i.test(candidate) ||
        /^fe80:/i.test(candidate) ||
        /^::ffff:127\./i.test(candidate) ||
        /^::ffff:10\./i.test(candidate) ||
        /^::ffff:192\.168\./i.test(candidate)
    ) {
        return { ip: null, source: 'non_public_rejected' };
    }

    // Control de certificación de Gateway: hasta que se complete la prueba con dos IPs públicas
    // de salida (EGRESS_IP_1 y EGRESS_IP_2), la Edge Function adopta la postura fail-closed.
    const isGatewayCertified =
        typeof Deno !== 'undefined' &&
        Deno.env.get('PORTAL_IP_GATEWAY_CERTIFIED') === 'true';

    if (!isGatewayCertified) {
        return { ip: null, source: 'untrusted_gateway_fallback' };
    }

    return { ip: candidate, source: 'edge_gateway_verified' };
}

/**
 * Sanitiza la cabecera User-Agent (máximo 512 caracteres, sin caracteres de control).
 */
export function sanitizeUserAgent(ua?: string | null): string | null {
    if (!ua || typeof ua !== 'string') return null;
    const clean = ua.replace(/[\x00-\x1F\x7F]/g, '').trim();
    return clean ? clean.slice(0, 512) : null;
}

/**
 * Manejador principal de la Edge Function (compatible con invocaciones Deno y pruebas unitarias).
 */
export async function handleRequest(req: Request): Promise<Response> {
    // 1. Manejo de Preflight CORS (OPTIONS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // 2. Control de método HTTP (Solo admite POST)
    if (req.method !== 'POST') {
        return jsonResponse(
            {
                error: `Método HTTP '${req.method}' no permitido. Esta función solo acepta peticiones POST y OPTIONS.`,
            },
            405,
            { Allow: 'POST, OPTIONS' }
        );
    }

    try {
        const supabaseUrl =
            (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : null) ||
            process?.env?.SUPABASE_URL ||
            '';
        const supabaseAnonKey =
            (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_ANON_KEY') : null) ||
            process?.env?.SUPABASE_ANON_KEY ||
            '';
        const supabaseServiceRoleKey =
            (typeof Deno !== 'undefined'
                ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
                : null) ||
            process?.env?.SUPABASE_SERVICE_ROLE_KEY ||
            '';

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
            console.error(
                '[accept-portal-invitation] Variables de entorno de Supabase no configuradas.'
            );
            return jsonResponse(
                { error: 'Error de configuración interna del servidor.' },
                500
            );
        }

        // Cliente con Service Role para RPCs y operaciones administrativas
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // 3. Parseo del cuerpo de la petición
        let body: Record<string, any>;
        try {
            body = (await req.json()) || {};
        } catch {
            return jsonResponse(
                { error: 'Cuerpo de petición JSON inválido o malformado.' },
                400
            );
        }

        const action = typeof body.action === 'string' ? body.action.trim() : '';

        // ==============================================================================
        // ACCIÓN 1: 'verify' — Validación criptográfica previa (Lectura sin PII)
        // ==============================================================================
        if (action === 'verify') {
            const rawToken = typeof body.token === 'string' ? body.token.trim() : '';
            if (!validateTokenFormat(rawToken)) {
                return jsonResponse(
                    {
                        valid: false,
                        status: 'invalid',
                        code: 'invalid_format',
                        message:
                            'El formato del código de invitación no es válido. Debe contener entre 32 y 128 caracteres.',
                    },
                    400
                );
            }

            const tokenHash = await computeSha256Hex(rawToken);

            // Búsqueda en client_portal_invitations vía service_role
            const { data: inv, error: invError } = await supabaseAdmin
                .from('client_portal_invitations')
                .select(
                    'id, client_id, email, status, expires_at, lease_until, operation_id'
                )
                .eq('token_hash', tokenHash)
                .maybeSingle();

            if (invError) {
                console.error(
                    '[accept-portal-invitation:verify] Error consultando invitación:',
                    invError.message
                );
                return jsonResponse(
                    {
                        valid: false,
                        status: 'error',
                        code: 'query_failed',
                        message: 'Error en la verificación de la invitación.',
                    },
                    500
                );
            }

            if (!inv) {
                return jsonResponse(
                    {
                        valid: false,
                        status: 'invalid',
                        code: 'not_found',
                        message:
                            'Invitación no encontrada o enlace incorrecto. Solicita un nuevo enlace al Atelier.',
                    },
                    404
                );
            }

            const now = Date.now();
            const expiresAtMs = new Date(inv.expires_at).getTime();

            // Evaluación de estados terminales y temporales
            if (inv.status === 'expired' || expiresAtMs <= now) {
                return jsonResponse(
                    {
                        valid: false,
                        status: 'expired',
                        code: 'expired',
                        message:
                            'Este enlace de invitación ha caducado. Comunícate con el Atelier para recibir uno nuevo.',
                    },
                    410
                );
            }

            if (inv.status === 'revoked') {
                return jsonResponse(
                    {
                        valid: false,
                        status: 'revoked',
                        code: 'revoked',
                        message:
                            'Esta invitación ha sido revocada por Katherine Carroll. Solicita una nueva invitación al Atelier.',
                    },
                    410
                );
            }

            if (inv.status === 'failed') {
                return jsonResponse(
                    {
                        valid: false,
                        status: 'failed',
                        code: 'failed',
                        message:
                            'La invitación quedó en estado terminal por una regla de seguridad. Solicita una nueva al Atelier.',
                    },
                    410
                );
            }

            // Nombre comercial de la clienta (para saludo personalizado)
            const { data: clientRow } = await supabaseAdmin
                .from('clients')
                .select('full_name')
                .eq('id', inv.client_id)
                .maybeSingle();
            const clientName = clientRow?.full_name || null;

            // Detección de sesión previa (para idempotencia already_accepted_self)
            const authHeader =
                req.headers.get('Authorization') ?? req.headers.get('authorization');
            const callerJwt =
                authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.replace(/^Bearer\s+/i, '').trim()
                    : null;

            let callerUserId: string | null = null;
            if (callerJwt) {
                try {
                    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
                        global: { headers: { Authorization: `Bearer ${callerJwt}` } },
                        auth: { persistSession: false },
                    });
                    const {
                        data: { user },
                    } = await userClient.auth.getUser(callerJwt);
                    callerUserId = user?.id || null;
                } catch {
                    callerUserId = null;
                }
            }

            if (inv.status === 'accepted') {
                // Verificar si pertenece al usuario que ya la aceptó
                if (callerUserId) {
                    const { data: accessCheck } = await supabaseAdmin
                        .from('client_portal_access')
                        .select('auth_user_id')
                        .eq('client_id', inv.client_id)
                        .eq('auth_user_id', callerUserId)
                        .eq('status', 'active')
                        .maybeSingle();

                    if (accessCheck) {
                        return jsonResponse(
                            {
                                valid: false,
                                status: 'already_accepted_self',
                                code: 'already_accepted_self',
                                idempotent: true,
                                masked_email: maskEmailForDisplay(inv.email),
                                client_name: clientName,
                                message:
                                    'Tu cuenta ya se encuentra vinculada y activa en el Portal Exclusivo del Atelier.',
                            },
                            200
                        );
                    }
                }

                return jsonResponse(
                    {
                        valid: false,
                        status: 'reused',
                        code: 'reused',
                        message:
                            'Esta invitación ya fue utilizada anteriormente. Ingresa con tu cuenta habitual.',
                    },
                    410
                );
            }

            // Reserva activa en curso
            if (
                inv.status === 'processing' &&
                inv.lease_until &&
                new Date(inv.lease_until).getTime() > now
            ) {
                return jsonResponse(
                    {
                        valid: false,
                        status: 'locked',
                        code: 'locked',
                        message:
                            'Esta invitación se encuentra en proceso de activación en este instante. Por favor espera unos segundos antes de reintentar.',
                        retry_after_seconds: 5,
                    },
                    409
                );
            }

            // Consulta de cuenta existente vía RPC privado _portal_lookup_auth_user_by_email
            let accountHint: 'existing_account' | 'new_account' = 'new_account';
            try {
                const { data: lookupUsers } = await supabaseAdmin.rpc(
                    '_portal_lookup_auth_user_by_email',
                    { p_email: inv.email }
                );
                if (Array.isArray(lookupUsers) && lookupUsers.length > 0) {
                    accountHint = 'existing_account';
                }
            } catch (rpcErr: any) {
                console.warn(
                    '[accept-portal-invitation:verify] No fue posible determinar account_hint:',
                    rpcErr?.message
                );
            }

            // Respuesta 200: CERO PII en claro a llamadas anónimas (solo masked_email)
            return jsonResponse(
                {
                    valid: true,
                    status: 'pending',
                    code: 'valid',
                    masked_email: maskEmailForDisplay(inv.email),
                    client_name: clientName,
                    expires_at: inv.expires_at,
                    account_hint: accountHint,
                    already_accepted_self: false,
                    requires_legal_consent: true,
                    message:
                        'Invitación verificada criptográficamente. Lista para activar tu acceso privado.',
                },
                200
            );
        }

        // ==============================================================================
        // ACCIÓN 2: 'accept' — Aceptación Saga Idempotente con Forward Recovery
        // ==============================================================================
        if (action === 'accept') {
            // Candado de seguridad: verificación de flag de activación
            const isAcceptanceActive =
                (typeof Deno !== 'undefined'
                    ? Deno.env.get('PORTAL_ACCEPTANCE_ACTIVE')
                    : null) === 'true' ||
                (typeof process !== 'undefined' &&
                    process?.env?.PORTAL_ACCEPTANCE_ACTIVE === 'true');

            // Permite bypass en suite de pruebas SOLO si PORTAL_TEST_BYPASS_SECRET está explícitamente configurado
            const testBypassSecret =
                (typeof Deno !== 'undefined'
                    ? Deno.env.get('PORTAL_TEST_BYPASS_SECRET')
                    : null) ||
                (typeof process !== 'undefined'
                    ? process?.env?.PORTAL_TEST_BYPASS_SECRET
                    : null);
            const isTestBypass =
                Boolean(testBypassSecret && testBypassSecret.length >= 16) &&
                req.headers.get('x-e2-test-bypass') === testBypassSecret;

            if (!isAcceptanceActive && !isTestBypass) {
                console.log(
                    '[accept-portal-invitation:accept] Aceptación bloqueada: PORTAL_ACCEPTANCE_ACTIVE !== true (Modo pre-vuelo E2).'
                );
                return jsonResponse(
                    {
                        success: false,
                        accepted: false,
                        status: 'preflight_disabled',
                        code: 'acceptance_disabled_preflight',
                        message:
                            'La activación del portal permanece temporalmente deshabilitada en el servidor hasta completar las certificaciones de seguridad e IP Gateway de la Entrega E2.',
                    },
                    503
                );
            }

            const rawToken = typeof body.token === 'string' ? body.token.trim() : '';
            const operationId =
                typeof body.operation_id === 'string' ? body.operation_id.trim() : '';

            if (!validateTokenFormat(rawToken) || !isValidUuid(operationId)) {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'invalid',
                        code: 'invalid_request',
                        message:
                            'El código de invitación o el identificador de operación no cumplen los requisitos de seguridad.',
                    },
                    400
                );
            }

            const tokenHash = await computeSha256Hex(rawToken);

            // SAGA PASO 1: Reclamar la invitación (claim_portal_invitation)
            const { data: claimRows, error: claimErr } = await supabaseAdmin.rpc(
                'claim_portal_invitation',
                {
                    p_token_hash: tokenHash,
                    p_operation_id: operationId,
                }
            );

            if (claimErr) {
                console.error(
                    '[accept-portal-invitation:accept] Error en claim_portal_invitation:',
                    claimErr.message
                );
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'error',
                        code: 'claim_failed',
                        message: 'Error al reservar la invitación en el servidor.',
                    },
                    500
                );
            }

            const claim = Array.isArray(claimRows) ? claimRows[0] : null;
            if (!claim) {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'error',
                        code: 'claim_empty',
                        message: 'Respuesta inesperada al reservar la invitación.',
                    },
                    500
                );
            }

            // Manejo de estados de la reserva
            if (claim.claim_status === 'not_found') {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'not_found',
                        code: 'not_found',
                        message: 'Invitación no encontrada.',
                    },
                    404
                );
            }

            if (claim.claim_status === 'expired') {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'expired',
                        code: 'expired',
                        message: 'Este enlace de invitación ha caducado.',
                    },
                    410
                );
            }

            if (claim.claim_status === 'revoked') {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'revoked',
                        code: 'revoked',
                        message: 'Esta invitación ha sido revocada por Katherine Carroll.',
                    },
                    410
                );
            }

            if (claim.claim_status === 'failed') {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'failed',
                        code: 'failed',
                        message: 'La invitación quedó en estado terminal por seguridad.',
                    },
                    410
                );
            }

            if (claim.claim_status === 'locked') {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'processing_locked',
                        code: 'locked',
                        message:
                            'Esta invitación se encuentra en proceso de activación en este instante.',
                        retry_after_seconds: 5,
                    },
                    409
                );
            }

            // Extracción de usuario autenticado si existe Bearer JWT
            const authHeader =
                req.headers.get('Authorization') ?? req.headers.get('authorization');
            const callerJwt =
                authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.replace(/^Bearer\s+/i, '').trim()
                    : null;

            let callerUser: any = null;
            if (callerJwt) {
                try {
                    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
                        global: { headers: { Authorization: `Bearer ${callerJwt}` } },
                        auth: { persistSession: false },
                    });
                    const {
                        data: { user },
                    } = await userClient.auth.getUser(callerJwt);
                    callerUser = user;
                } catch {
                    callerUser = null;
                }
            }

            if (claim.claim_status === 'accepted') {
                // Idempotencia: si el usuario autenticado coincide con el titular del portal
                if (callerUser?.id) {
                    const { data: activeAccess } = await supabaseAdmin
                        .from('client_portal_access')
                        .select('id, auth_user_id')
                        .eq('client_id', claim.client_id)
                        .eq('auth_user_id', callerUser.id)
                        .eq('status', 'active')
                        .maybeSingle();

                    if (activeAccess) {
                        return jsonResponse(
                            {
                                success: true,
                                accepted: true,
                                status: 'accepted',
                                idempotent: true,
                                code: 'already_accepted_self',
                                access_id: activeAccess.id,
                                auth_user_id: callerUser.id,
                                access_status: 'active',
                                requires_sign_in: false,
                                message:
                                    'Esta invitación ya había sido confirmada para tu cuenta. Tu acceso sigue activo sin duplicados.',
                            },
                            200
                        );
                    }
                }

                return jsonResponse(
                    {
                        accepted: false,
                        status: 'reused',
                        code: 'already_accepted_other',
                        message:
                            'Esta invitación de un solo uso ya fue aceptada y vinculada por otra cuenta.',
                    },
                    409
                );
            }

            if (claim.claim_status !== 'claimed') {
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'error',
                        code: 'unknown_claim_status',
                        message: `Estado de reserva no reconocido: ${claim.claim_status}`,
                    },
                    500
                );
            }

            // SAGA PASO 2: Vinculación de Identidad y Guardias de Seguridad
            let targetAuthUserId: string;
            let isExistingAccount = false;

            if (callerJwt) {
                // -------------------------------------------------------------
                // RAMA A: Cuenta existente con sesión activa (JWT obligatorio)
                // -------------------------------------------------------------
                if (!callerUser || !callerUser.id) {
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: 'unauthorized_jwt',
                        p_mark_failed: false,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'unauthorized',
                            code: 'requires_sign_in',
                            message:
                                'Autenticación requerida. La sesión no es válida o ha caducado.',
                        },
                        401
                    );
                }

                // Verificación de coincidencia de correo (anti-suplantación NEG-08)
                const callerEmail = (callerUser.email || '').toLowerCase().trim();
                const invitedEmail = (claim.email || '').toLowerCase().trim();
                if (callerEmail !== invitedEmail) {
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: 'email_mismatch',
                        p_mark_failed: false,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'conflict',
                            code: 'account_mismatch',
                            message:
                                'El correo de tu sesión autenticada no coincide con el destinatario de la invitación.',
                        },
                        409
                    );
                }

                // Blindaje contra cuentas de administración o diseñadora (NEG-14)
                const { data: profileRow } = await supabaseAdmin
                    .from('profiles')
                    .select('role')
                    .eq('id', callerUser.id)
                    .maybeSingle();

                const profileRole = (profileRow?.role || '').toLowerCase();
                const appMetadataRole = (
                    callerUser.app_metadata?.role || ''
                ).toLowerCase();

                if (
                    PRIVILEGED_ROLES.has(profileRole) ||
                    PRIVILEGED_ROLES.has(appMetadataRole)
                ) {
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: 'privileged_role_blocked',
                        p_mark_failed: true,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'forbidden',
                            code: 'privileged_role_blocked',
                            message:
                                'Las cuentas administrativas o de diseñadora no pueden vincularse al portal de clientes.',
                        },
                        403
                    );
                }

                targetAuthUserId = callerUser.id;
                isExistingAccount = true;
            } else {
                // -------------------------------------------------------------
                // RAMA B: Nueva Clienta (Onboarding) sin sesión previa
                // -------------------------------------------------------------
                // Comprobar si el correo ya existe en auth.users
                const { data: existingAuthUsers } = await supabaseAdmin.rpc(
                    '_portal_lookup_auth_user_by_email',
                    { p_email: claim.email }
                );

                if (Array.isArray(existingAuthUsers) && existingAuthUsers.length > 0) {
                    // Si ya existe en auth.users, exigir inicio de sesión (Rama A)
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: 'existing_account_requires_sign_in',
                        p_mark_failed: false,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'unauthorized',
                            code: 'requires_sign_in',
                            requires_sign_in: true,
                            message:
                                'Ya existe una cuenta registrada con este correo electrónico. Por favor inicia sesión para activar tu portal.',
                        },
                        401
                    );
                }

                // Validación de consentimientos Ley 1581 de 2012 (C-04)
                const consents = body.consents;
                const hasAgeConsent = consents?.ageConfirmed === true;
                const hasTermsConsent = consents?.termsAccepted === true;
                const hasPrivacyConsent = consents?.privacyAccepted === true;

                if (!hasAgeConsent || !hasTermsConsent || !hasPrivacyConsent) {
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: 'missing_legal_consents',
                        p_mark_failed: false,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'bad_request',
                            code: 'legal_consent_required',
                            message:
                                'Debes confirmar mayoría de edad, Términos de Uso y Política de Privacidad (Ley 1581 de 2012) para activar tu portal.',
                        },
                        400
                    );
                }

                // Validación de robustez de contraseña
                const password =
                    typeof body.password === 'string' ? body.password : '';
                if (!password || password.length < 8) {
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: 'invalid_password',
                        p_mark_failed: false,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'bad_request',
                            code: 'invalid_password',
                            message:
                                'Por tu seguridad, define una contraseña de al menos 8 caracteres.',
                        },
                        400
                    );
                }

                const fullName =
                    typeof body.full_name === 'string' && body.full_name.trim()
                        ? body.full_name.trim()
                        : undefined;

                // Creación de usuario en Supabase Auth vía Admin API
                // NOTA CRÍTICA C-05 / Forward Recovery: NUNCA se invoca auth.admin.deleteUser()
                const { data: createdAuthData, error: createAuthErr } =
                    await supabaseAdmin.auth.admin.createUser({
                        email: claim.email.toLowerCase().trim(),
                        password,
                        email_confirm: true,
                        user_metadata: {
                            full_name: fullName,
                        },
                    });

                if (createAuthErr || !createdAuthData?.user) {
                    console.error(
                        '[accept-portal-invitation:accept] Error en createUser:',
                        createAuthErr?.message
                    );
                    await supabaseAdmin.rpc('release_portal_invitation', {
                        p_token_hash: tokenHash,
                        p_operation_id: operationId,
                        p_reason: `auth_create_user_failed: ${createAuthErr?.message || 'unknown'}`,
                        p_mark_failed: false,
                    });
                    return jsonResponse(
                        {
                            accepted: false,
                            status: 'error',
                            code: 'auth_create_user_failed',
                            message:
                                'No fue posible crear la cuenta de acceso para la clienta.',
                        },
                        500
                    );
                }

                targetAuthUserId = createdAuthData.user.id;
                isExistingAccount = false;
            }

            // SAGA PASO 3: Finalización SQL y Transición a 'accepted' / 'active'
            const { ip: clientIp, source: ipSource } = extractClientIp(req);
            const userAgent = sanitizeUserAgent(req.headers.get('user-agent'));

            const { error: finalizeErr } = await supabaseAdmin.rpc(
                'finalize_portal_invitation',
                {
                    p_token_hash: tokenHash,
                    p_operation_id: operationId,
                    p_auth_user_id: targetAuthUserId,
                    p_full_name:
                        typeof body.full_name === 'string' && body.full_name.trim()
                            ? body.full_name.trim()
                            : null,
                    p_legal_consents: body.consents || {},
                    p_client_ip: clientIp,
                    p_user_agent: userAgent,
                    p_ip_source: ipSource,
                }
            );

            if (finalizeErr) {
                console.error(
                    '[accept-portal-invitation:accept] Error en finalize_portal_invitation:',
                    finalizeErr.message,
                    'Código:',
                    finalizeErr.code
                );

                // Clasificación de errores:
                // Errores deterministas de violación de integridad (23505, 23514, 42501) marcan failed = true
                const isDeterministicViolation =
                    finalizeErr.code === '23505' ||
                    finalizeErr.code === '23514' ||
                    finalizeErr.code === '42501';

                await supabaseAdmin.rpc('release_portal_invitation', {
                    p_token_hash: tokenHash,
                    p_operation_id: operationId,
                    p_reason: `finalize_error: ${finalizeErr.message}`,
                    p_mark_failed: isDeterministicViolation,
                });

                // FORWARD RECOVERY: NO invocar deleteUser(). La cuenta Auth permanece inerte
                // sin acceso 'active' y converge limpiamente en la siguiente visita vía Rama A.

                const httpCode = finalizeErr.code === '42501' ? 403 : 409;
                return jsonResponse(
                    {
                        accepted: false,
                        status: 'error',
                        code: isDeterministicViolation
                            ? 'integrity_violation'
                            : 'finalize_failed',
                        message: finalizeErr.message,
                    },
                    httpCode
                );
            }

            // Recuperación del ID de acceso provisionado
            const { data: accessRow } = await supabaseAdmin
                .from('client_portal_access')
                .select('id')
                .eq('client_id', claim.client_id)
                .eq('auth_user_id', targetAuthUserId)
                .maybeSingle();

            // Respuesta canónica de éxito (compatible con mapInvitationAcceptResponse de portalService.ts)
            return jsonResponse(
                {
                    success: true,
                    accepted: true,
                    status: 'accepted',
                    code: 'accepted',
                    idempotent: false,
                    access_id: accessRow?.id || null,
                    auth_user_id: targetAuthUserId,
                    access_status: 'active',
                    requires_sign_in: !isExistingAccount,
                    message:
                        '¡Bienvenida a tu Portal Exclusivo! Tu acceso privado ha quedado vinculado con seguridad Zero Trust.',
                },
                200
            );
        }

        return jsonResponse(
            {
                error: `Acción '${action}' no admitida. Las acciones válidas son 'verify' y 'accept'.`,
            },
            400
        );
    } catch (err: any) {
        console.error(
            '[accept-portal-invitation] Excepción no controlada:',
            err?.message || String(err)
        );
        return jsonResponse(
            { error: 'Error interno no controlado en el servidor.' },
            500
        );
    }
}

// Inicia el servidor HTTP de Deno en producción
if (typeof Deno !== 'undefined' && Deno.env.get('DENO_DEPLOYMENT_ID')) {
    serve(handleRequest);
}
