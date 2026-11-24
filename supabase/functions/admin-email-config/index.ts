// ==============================================================================
// ATELIER DIGITAL — EDGE FUNCTION ADMINISTRATIVA DE COMUNICACIONES (SMTP ZIMBRA)
// Archivo: supabase/functions/admin-email-config/index.ts
// ==============================================================================
// Gestiona de forma segura y exclusiva para role = 'admin':
// - Consulta y edición de las 5 cuentas/propósitos en public.atelier_email_accounts
// - Alta y rotación write-only de contraseñas SMTP en Supabase Vault
// - Activación / desactivación validada (prohibido activar sin credenciales)
// - Prueba de conectividad TLS/SMTP sin envío de correos (verify)
// - Envío de correo de prueba controlado al administrador autenticado
// - Consulta filtrable del historial en public.atelier_email_logs
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
    CANONICAL_SMTP_HOST,
    CANONICAL_SMTP_PORT,
    dispatchEmailByPurpose,
    EMAIL_LOG_STATUSES,
    EMAIL_MODULE_ORIGINS,
    EMAIL_PURPOSES,
    extractEmailAddress,
    hasHeaderInjection,
    isValidEmailPurpose,
    ResolvedEmailAccount,
    verifySmtpConnection,
} from '../_shared/emailDispatcher.ts';

export const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PURPOSE_SORT_ORDER: Record<string, number> = {
    portal_invitations: 1,
    commercial_quotes: 2,
    agenda_reminders: 3,
    contact_support: 4,
    billing_notifications: 5,
};

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

function projectSafeAccount(row: Record<string, any>) {
    return {
        id: row.id,
        purpose: row.purpose,
        display_name: row.display_name,
        from_email: row.from_email ?? null,
        reply_to_email: row.reply_to_email ?? null,
        smtp_host: row.smtp_host,
        smtp_port: row.smtp_port,
        smtp_secure: Boolean(row.smtp_secure),
        smtp_user: row.smtp_user ?? null,
        has_credential: Boolean(row.vault_secret_id),
        is_active: Boolean(row.is_active),
        last_verified_at: row.last_verified_at ?? null,
        last_verification_status: row.last_verification_status || 'untested',
        created_at: row.created_at,
        updated_at: row.updated_at,
        updated_by: row.updated_by ?? null,
    };
}

export async function handleAdminEmailAction(params: {
    req: Request;
    body: Record<string, any>;
    supabaseAdmin: any;
    verifyFn?: typeof verifySmtpConnection;
    dispatchFn?: typeof dispatchEmailByPurpose;
}): Promise<Response> {
    const { req, body, supabaseAdmin } = params;
    const verifyFn = params.verifyFn ?? verifySmtpConnection;
    const dispatchFn = params.dispatchFn ?? dispatchEmailByPurpose;

    // 1. Autenticación estricta de administrador (JWT Bearer + role === 'admin')
    const authHeader = req.headers.get('authorization') || '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const jwt = bearerMatch ? bearerMatch[1].trim() : '';
    if (!jwt) {
        return jsonResponse(
            {
                ok: false,
                code: 'unauthorized',
                error: 'Se requiere sesión autenticada de administrador.',
            },
            401
        );
    }

    const { data: callerData, error: callerError } =
        await supabaseAdmin.auth.getUser(jwt);
    const actorUser = callerData?.user || null;
    if (callerError || !actorUser?.id) {
        return jsonResponse(
            {
                ok: false,
                code: 'invalid_token',
                error: 'Sesión inválida o expirada.',
            },
            401
        );
    }

    const { data: profileRow, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', actorUser.id)
        .maybeSingle();

    const actorRole =
        typeof profileRow?.role === 'string' ? profileRow.role.trim().toLowerCase() : '';
    if (profileErr || actorRole !== 'admin') {
        return jsonResponse(
            {
                ok: false,
                code: 'forbidden_admin_only',
                error:
                    'Acceso denegado. Solo los usuarios con rol administrador pueden gestionar comunicaciones.',
            },
            403
        );
    }

    const action = typeof body.action === 'string' ? body.action.trim() : '';

    // ==========================================================================
    // ACCIÓN 1: list_accounts — Lista las 5 cuentas sin exponer secretos
    // ==========================================================================
    if (action === 'list_accounts') {
        const { data, error } = await supabaseAdmin
            .from('atelier_email_accounts')
            .select(
                'id, purpose, display_name, from_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_user, vault_secret_id, is_active, last_verified_at, last_verification_status, created_at, updated_at, updated_by'
            );

        if (error) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'db_read_error',
                    error: 'No se pudieron consultar las cuentas de correo.',
                },
                500
            );
        }

        const sorted = (data || [])
            .map(projectSafeAccount)
            .sort(
                (a: any, b: any) =>
                    (PURPOSE_SORT_ORDER[a.purpose] ?? 99) -
                    (PURPOSE_SORT_ORDER[b.purpose] ?? 99)
            );

        return jsonResponse({ ok: true, accounts: sorted }, 200);
    }

    // ==========================================================================
    // ACCIÓN 2: upsert_account — Guarda configuración + rotación write-only Vault
    // ==========================================================================
    if (action === 'upsert_account') {
        const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
        if (!isValidEmailPurpose(purpose)) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_purpose',
                    error: `Propósito inválido. Valores permitidos: ${EMAIL_PURPOSES.join(', ')}.`,
                },
                400
            );
        }

        const displayName =
            typeof body.display_name === 'string' ? body.display_name.trim() : '';
        if (displayName.length < 2 || hasHeaderInjection(displayName)) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_display_name',
                    error: 'El nombre del remitente debe tener al menos 2 caracteres válidos.',
                },
                400
            );
        }

        const rawFrom =
            typeof body.from_email === 'string' ? body.from_email.trim() : '';
        const fromEmail = rawFrom ? extractEmailAddress(rawFrom) : null;
        if (rawFrom && !fromEmail) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_from_email',
                    error: 'La dirección de correo remitente no es válida.',
                },
                400
            );
        }

        const rawReplyTo =
            typeof body.reply_to_email === 'string' ? body.reply_to_email.trim() : '';
        const replyToEmail = rawReplyTo ? extractEmailAddress(rawReplyTo) : null;
        if (rawReplyTo && !replyToEmail) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_reply_to_email',
                    error: 'La dirección de respuesta (Reply-To) no es válida.',
                },
                400
            );
        }

        const smtpHost = (
            typeof body.smtp_host === 'string' && body.smtp_host.trim()
                ? body.smtp_host.trim()
                : CANONICAL_SMTP_HOST
        ).toLowerCase();
        if (smtpHost !== CANONICAL_SMTP_HOST) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_smtp_host',
                    error:
                        'Host SMTP no autorizado para validación TLS estricta. Utiliza mail.itss-proactive.com.',
                },
                400
            );
        }

        const smtpPort =
            body.smtp_port !== undefined ? Number(body.smtp_port) : CANONICAL_SMTP_PORT;
        if (!Number.isInteger(smtpPort) || smtpPort !== CANONICAL_SMTP_PORT) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_smtp_port',
                    error: 'Puerto SMTP inválido. Zimbra corporativo requiere puerto 465.',
                },
                400
            );
        }

        const smtpSecure = body.smtp_secure === undefined ? true : Boolean(body.smtp_secure);
        if (!smtpSecure) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'insecure_smtp_rejected',
                    error: 'SSL/TLS implícito (smtp_secure=true) es obligatorio en puerto 465.',
                },
                400
            );
        }

        const rawSmtpUser =
            typeof body.smtp_user === 'string' ? body.smtp_user.trim() : '';
        const smtpUser = rawSmtpUser ? extractEmailAddress(rawSmtpUser) : null;
        if (rawSmtpUser && !smtpUser) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_smtp_user',
                    error: 'El usuario SMTP debe ser una dirección de correo válida.',
                },
                400
            );
        }

        if (fromEmail && smtpUser && fromEmail !== smtpUser) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'sender_user_mismatch',
                    error:
                        'En Zimbra el remitente (from_email) debe coincidir con el usuario SMTP autenticado.',
                },
                400
            );
        }

        // Consultar registro existente para saber si ya tiene credencial en Vault y estado de verificación
        const { data: existingRow } = await supabaseAdmin
            .from('atelier_email_accounts')
            .select(
                'id, vault_secret_id, is_active, from_email, smtp_user, last_verification_status, last_verified_at'
            )
            .eq('purpose', purpose)
            .maybeSingle();

        const incomingPassword =
            typeof body.smtp_password === 'string' ? body.smtp_password : '';
        const hasNewPassword = incomingPassword.trim().length > 0;
        const willHaveCredential = Boolean(existingRow?.vault_secret_id) || hasNewPassword;

        const credentialsOrIdentityChanged =
            hasNewPassword ||
            (existingRow?.smtp_user ?? null) !== smtpUser ||
            (existingRow?.from_email ?? null) !== fromEmail;

        const requestedActive =
            typeof body.is_active === 'boolean' ? body.is_active : undefined;

        if (requestedActive === true && (!fromEmail || !smtpUser || !willHaveCredential)) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'incomplete_account_for_activation',
                    error:
                        'No es posible activar una cuenta sin remitente, usuario SMTP y credencial almacenada en Vault.',
                },
                400
            );
        }

        // Control R1: Separación estricta entre guardar/rotar credenciales y activar la cuenta.
        // upsert_account jamás activa una cuenta inactiva, sin verificar o con credenciales recién modificadas.
        const wasVerifiedAndActive =
            Boolean(existingRow?.is_active) &&
            existingRow?.last_verification_status === 'verified';

        if (
            requestedActive === true &&
            (!wasVerifiedAndActive || credentialsOrIdentityChanged)
        ) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'activation_requires_separate_verified_step',
                    error:
                        'Guardar configuración no activa la cuenta automáticamente. Guarda los cambios, ejecuta "Probar Conexión" hasta obtener estado VERIFICADO y luego activa la cuenta por separado.',
                },
                400
            );
        }

        // Control R2: Al rotar contraseña o cambiar remitente/usuario SMTP, reiniciar verificación y desactivar
        const nextVerificationStatus = credentialsOrIdentityChanged
            ? 'untested'
            : existingRow?.last_verification_status || 'untested';
        const nextVerifiedAt = credentialsOrIdentityChanged
            ? null
            : existingRow?.last_verified_at ?? null;
        const nextIsActive = credentialsOrIdentityChanged
            ? false
            : requestedActive === false
              ? false
              : Boolean(existingRow?.is_active);

        const upsertPayload = {
            purpose,
            display_name: displayName,
            from_email: fromEmail,
            reply_to_email: replyToEmail,
            smtp_host: CANONICAL_SMTP_HOST,
            smtp_port: CANONICAL_SMTP_PORT,
            smtp_secure: true,
            smtp_user: smtpUser,
            is_active: nextIsActive,
            last_verification_status: nextVerificationStatus,
            last_verified_at: nextVerifiedAt,
            updated_by: actorUser.id,
        };

        let savedRow: Record<string, any> | null = null;
        if (existingRow?.id) {
            const { data, error } = await supabaseAdmin
                .from('atelier_email_accounts')
                .update(upsertPayload)
                .eq('id', existingRow.id)
                .select(
                    'id, purpose, display_name, from_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_user, vault_secret_id, is_active, last_verified_at, last_verification_status, created_at, updated_at, updated_by'
                )
                .single();
            if (error || !data) {
                return jsonResponse(
                    {
                        ok: false,
                        code: 'db_update_error',
                        error: 'No se pudo actualizar la configuración de correo.',
                    },
                    500
                );
            }
            savedRow = data;
        } else {
            const { data, error } = await supabaseAdmin
                .from('atelier_email_accounts')
                .insert(upsertPayload)
                .select(
                    'id, purpose, display_name, from_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_user, vault_secret_id, is_active, last_verified_at, last_verification_status, created_at, updated_at, updated_by'
                )
                .single();
            if (error || !data) {
                return jsonResponse(
                    {
                        ok: false,
                        code: 'db_insert_error',
                        error: 'No se pudo crear la configuración de correo.',
                    },
                    500
                );
            }
            savedRow = data;
        }

        // Si se proporcionó contraseña, guardarla/rotarla write-only en Supabase Vault
        if (hasNewPassword && savedRow?.id) {
            const { data: vaultId, error: vaultErr } = await supabaseAdmin.rpc(
                '_atelier_email_upsert_secret',
                {
                    p_account_id: savedRow.id,
                    p_secret_value: incomingPassword,
                }
            );
            if (vaultErr) {
                console.error(
                    '[admin-email-config] Error almacenando credencial en Vault (sin exponer clave).'
                );
                return jsonResponse(
                    {
                        ok: false,
                        code: 'vault_upsert_error',
                        error:
                            'No fue posible almacenar la credencial SMTP en Supabase Vault.',
                    },
                    500
                );
            }

            savedRow.vault_secret_id = vaultId || savedRow.vault_secret_id || 'stored';
        }

        return jsonResponse(
            {
                ok: true,
                credential_updated: hasNewPassword,
                verification_reset: credentialsOrIdentityChanged,
                account: projectSafeAccount(savedRow!),
            },
            200
        );
    }

    // ==========================================================================
    // ACCIÓN 3: toggle_account — Activa o desactiva un propósito
    // ==========================================================================
    if (action === 'toggle_account') {
        const accountId =
            typeof body.account_id === 'string' ? body.account_id.trim() : '';
        if (!UUID_REGEX.test(accountId) || typeof body.is_active !== 'boolean') {
            return jsonResponse(
                {
                    ok: false,
                    code: 'invalid_toggle_payload',
                    error: 'Se requiere account_id válido y estado booleano is_active.',
                },
                400
            );
        }

        const { data: existing, error: fetchErr } = await supabaseAdmin
            .from('atelier_email_accounts')
            .select(
                'id, from_email, smtp_user, vault_secret_id, last_verification_status'
            )
            .eq('id', accountId)
            .maybeSingle();

        if (fetchErr || !existing) {
            return jsonResponse(
                { ok: false, code: 'account_not_found', error: 'Cuenta no encontrada.' },
                404
            );
        }

        if (
            body.is_active &&
            (!existing.from_email || !existing.smtp_user || !existing.vault_secret_id)
        ) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'incomplete_account_for_activation',
                    error:
                        'No se puede activar esta cuenta: falta remitente, usuario SMTP o credencial en Vault.',
                },
                400
            );
        }

        // Control R1: Prohibido activar una cuenta sin verificación SMTP exitosa previa
        if (body.is_active && existing.last_verification_status !== 'verified') {
            return jsonResponse(
                {
                    ok: false,
                    code: 'verification_required_for_activation',
                    error:
                        'Debes ejecutar "Probar Conexión" y obtener estado VERIFICADO antes de activar esta cuenta.',
                },
                400
            );
        }

        const { data: updated, error: updErr } = await supabaseAdmin
            .from('atelier_email_accounts')
            .update({ is_active: body.is_active, updated_by: actorUser.id })
            .eq('id', accountId)
            .select(
                'id, purpose, display_name, from_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_user, vault_secret_id, is_active, last_verified_at, last_verification_status, created_at, updated_at, updated_by'
            )
            .single();

        if (updErr || !updated) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'db_update_error',
                    error: 'No se pudo actualizar el estado de la cuenta.',
                },
                500
            );
        }

        return jsonResponse({ ok: true, account: projectSafeAccount(updated) }, 200);
    }

    // ==========================================================================
    // ACCIÓN 4: test_connection — Prueba TLS + SMTP AUTH sin enviar correos
    // ==========================================================================
    if (action === 'test_connection') {
        const accountId =
            typeof body.account_id === 'string' ? body.account_id.trim() : '';
        if (!UUID_REGEX.test(accountId)) {
            return jsonResponse(
                { ok: false, code: 'invalid_account_id', error: 'ID de cuenta inválido.' },
                400
            );
        }

        const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc(
            '_atelier_email_get_account_with_secret',
            { p_account_id: accountId }
        );
        const resolved = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as
            | ResolvedEmailAccount
            | undefined;

        if (rpcErr || !resolved) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'account_not_found',
                    error: 'Cuenta de correo no encontrada.',
                },
                404
            );
        }

        const verifyResult = await verifyFn(resolved);
        const verifiedAt = new Date().toISOString();

        await supabaseAdmin
            .from('atelier_email_accounts')
            .update({
                last_verified_at: verifiedAt,
                last_verification_status: verifyResult.status,
                updated_by: actorUser.id,
            })
            .eq('id', accountId);

        return jsonResponse(
            {
                ok: verifyResult.ok,
                status: verifyResult.status,
                reason: verifyResult.reason,
                message: verifyResult.message,
                last_verified_at: verifiedAt,
            },
            verifyResult.ok ? 200 : 502
        );
    }

    // ==========================================================================
    // ACCIÓN 5: send_test_email — Envío controlado al administrador autenticado
    // ==========================================================================
    if (action === 'send_test_email') {
        const accountId =
            typeof body.account_id === 'string' ? body.account_id.trim() : '';
        if (!UUID_REGEX.test(accountId)) {
            return jsonResponse(
                { ok: false, code: 'invalid_account_id', error: 'ID de cuenta inválido.' },
                400
            );
        }

        if (body.confirmed !== true) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'confirmation_required',
                    error:
                        'Se requiere confirmación explícita del administrador antes de enviar un correo de prueba.',
                },
                400
            );
        }

        const adminRecipient = extractEmailAddress(actorUser.email || '');
        if (!adminRecipient) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'missing_admin_email',
                    error: 'La cuenta de administrador autenticada no posee un correo válido.',
                },
                400
            );
        }

        const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc(
            '_atelier_email_get_account_with_secret',
            { p_account_id: accountId }
        );
        const resolved = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as
            | ResolvedEmailAccount
            | undefined;

        if (rpcErr || !resolved) {
            return jsonResponse(
                { ok: false, code: 'account_not_found', error: 'Cuenta no encontrada.' },
                404
            );
        }

        const testTimestamp = new Date().toISOString();
        const dispatchResult = await dispatchFn({
            purpose: resolved.purpose,
            moduleOrigin: 'admin_test',
            recipientEmail: adminRecipient,
            subject: `[Prueba SMTP · ${resolved.purpose}] Atelier Digital — By Katherine Carroll`,
            html: `<p><strong>Prueba técnica controlada del Módulo de Comunicaciones</strong></p><p>Propósito: <code>${resolved.purpose}</code><br/>Servidor: <code>${resolved.smtp_host}:${resolved.smtp_port}</code> (TLS estricto)<br/>Marca temporal UTC: ${testTimestamp}</p><p>Este mensaje confirma aceptación SMTP por Zimbra; la verificación de entrega final depende de tu bandeja.</p>`,
            text: `Prueba técnica controlada del Módulo de Comunicaciones\nPropósito: ${resolved.purpose}\nServidor: ${resolved.smtp_host}:${resolved.smtp_port} (TLS estricto)\nMarca temporal UTC: ${testTimestamp}\n`,
            supabaseAdmin,
            resolvedAccountOverride: resolved,
            allowInactiveOverride: true,
        });

        await supabaseAdmin
            .from('atelier_email_accounts')
            .update({
                last_verified_at: testTimestamp,
                last_verification_status: dispatchResult.sent ? 'verified' : 'failed',
                updated_by: actorUser.id,
            })
            .eq('id', accountId);

        return jsonResponse(
            {
                ok: dispatchResult.sent,
                status: dispatchResult.status,
                log_id: dispatchResult.logId,
                message_id: dispatchResult.messageId,
                recipient_email: adminRecipient,
                reason: dispatchResult.reason || (dispatchResult.sent ? 'smtp_accepted' : 'failed'),
                message: dispatchResult.sent
                    ? 'Correo de prueba aceptado por el servidor SMTP Zimbra (estado: smtp_accepted). Verifica la recepción en tu bandeja.'
                    : dispatchResult.error || 'No fue posible enviar el correo de prueba.',
            },
            dispatchResult.sent ? 200 : 502
        );
    }

    // ==========================================================================
    // ACCIÓN 6: list_logs — Historial filtrable de correos y estados
    // ==========================================================================
    if (action === 'list_logs') {
        const limitRaw = Number(body.limit ?? 50);
        const limit = Number.isFinite(limitRaw)
            ? Math.max(1, Math.min(Math.floor(limitRaw), 200))
            : 50;

        let query = supabaseAdmin
            .from('atelier_email_logs')
            .select(
                'id, purpose, module_origin, account_id, recipient_email, from_email, message_id, status, smtp_response, sent_at, delivered_at, bounced_at, error_code, error_description, created_at'
            )
            .order('created_at', { ascending: false })
            .limit(limit);

        if (typeof body.purpose === 'string' && isValidEmailPurpose(body.purpose.trim())) {
            query = query.eq('purpose', body.purpose.trim());
        }
        if (
            typeof body.module_origin === 'string' &&
            (EMAIL_MODULE_ORIGINS as readonly string[]).includes(body.module_origin.trim())
        ) {
            query = query.eq('module_origin', body.module_origin.trim());
        }
        if (
            typeof body.status === 'string' &&
            (EMAIL_LOG_STATUSES as readonly string[]).includes(body.status.trim())
        ) {
            query = query.eq('status', body.status.trim());
        }
        if (typeof body.date_from === 'string' && body.date_from.trim()) {
            query = query.gte('created_at', body.date_from.trim());
        }
        if (typeof body.date_to === 'string' && body.date_to.trim()) {
            query = query.lte('created_at', body.date_to.trim());
        }

        const { data, error } = await query;
        if (error) {
            return jsonResponse(
                {
                    ok: false,
                    code: 'db_read_error',
                    error: 'No se pudo consultar el historial de correos.',
                },
                500
            );
        }

        return jsonResponse({ ok: true, logs: data || [] }, 200);
    }

    return jsonResponse(
        {
            ok: false,
            code: 'unsupported_action',
            error: `Acción '${action}' no admitida.`,
        },
        400
    );
}

export async function handleRequest(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
        return jsonResponse(
            { ok: false, error: `Método HTTP '${req.method}' no permitido.` },
            405,
            { Allow: 'POST, OPTIONS' }
        );
    }

    try {
        const supabaseUrl =
            (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : null) ||
            process?.env?.SUPABASE_URL ||
            '';
        const supabaseServiceRoleKey =
            (typeof Deno !== 'undefined'
                ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
                : null) ||
            process?.env?.SUPABASE_SERVICE_ROLE_KEY ||
            '';

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            return jsonResponse(
                { ok: false, error: 'Configuración interna de Supabase incompleta.' },
                500
            );
        }

        let body: Record<string, any>;
        try {
            body = (await req.json()) || {};
        } catch {
            return jsonResponse(
                { ok: false, error: 'Cuerpo de petición JSON inválido.' },
                400
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        return await handleAdminEmailAction({ req, body, supabaseAdmin });
    } catch (err: any) {
        console.error(
            '[admin-email-config] Excepción no controlada:',
            err?.message || 'internal_error'
        );
        return jsonResponse(
            { ok: false, error: 'Error interno no controlado.' },
            500
        );
    }
}

if (typeof Deno !== 'undefined' && Deno.env.get('DENO_DEPLOYMENT_ID')) {
    serve(handleRequest);
}
