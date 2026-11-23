// ==============================================================================
// ATELIER DIGITAL — SERVICIO EDITORIAL DE CORREO DE INVITACIÓN (M09 · SMTP ZIMBRA)
// Archivo: supabase/functions/accept-portal-invitation/emailService.ts
// ==============================================================================
// Plantillas de correo de alta costura (HTML editorial y texto plano) conectadas
// al despachador SMTP compartido (../_shared/emailDispatcher.ts) bajo el propósito
// canónico 'portal_invitations' (invitaciones@bykatherinecarroll.com).
//
// REGLAS DE SEGURIDAD ESTRICTAS:
// - El envío real permanece DESHABILITADO por defecto (fail-closed) mientras
//   PORTAL_EMAIL_DISPATCH_ENABLED !== 'true' (0 conexiones SMTP ni datos transmitidos).
// - Transporte SMTP único vía _shared/emailDispatcher.ts (sin duplicación).
// - Validación TLS estricta sobre mail.itss-proactive.com:465 (rejectUnauthorized: true).
// - Cero contraseñas, tokens, URLs ni correos completos en logs.
// - Plantillas conformes con la Ley Estatutaria 1581 de 2012 (Colombia).
// ==============================================================================

import {
    CANONICAL_SMTP_HOST,
    CANONICAL_SMTP_PORT,
    DEFAULT_SMTP_TIMEOUT_MS,
    dispatchEmailByPurpose,
    EmailLogStatus,
    extractEmailAddress,
    ResolvedEmailAccount,
    SmtpMailOptions,
    SmtpSendInfo,
    SmtpTransportConfig,
    SmtpTransporter,
    SmtpTransportFactory,
} from '../_shared/emailDispatcher.ts';

export {
    CANONICAL_SMTP_HOST,
    CANONICAL_SMTP_PORT,
    DEFAULT_SMTP_TIMEOUT_MS,
};
export type {
    SmtpMailOptions,
    SmtpSendInfo,
    SmtpTransportConfig,
    SmtpTransporter,
    SmtpTransportFactory,
};

export const PORTAL_INVITATIONS_PURPOSE = 'portal_invitations' as const;
export const AUTHORIZED_SMTP_SENDER = 'invitaciones@bykatherinecarroll.com';
export const DEFAULT_PORTAL_EMAIL_FROM =
    'Atelier Katherine Carroll <invitaciones@bykatherinecarroll.com>';

export interface InvitationEmailPayload {
    recipientEmail: string;
    recipientName: string;
    inviteUrl: string;
    customMessage?: string;
    permissionsBullets?: readonly string[] | string[];
    expiresAt?: string;
}

export interface EmailDispatchResult {
    sent: boolean;
    simulated: boolean;
    messageId?: string | null;
    logId?: string | null;
    deliveryStatus?: EmailLogStatus;
    reason?: string;
    error?: string;
}

export type EnvGetter = (key: string) => string | undefined;

export interface EmailDispatchOptions {
    getEnv?: EnvGetter;
    createTransport?: SmtpTransportFactory;
    timeoutMs?: number;
    supabaseAdmin?: any;
    dedupeKey?: string;
}

export type ResolvedSmtpConfigResult =
    | {
          ok: true;
          config: SmtpTransportConfig;
          fromAddress: string;
          account: ResolvedEmailAccount;
      }
    | {
          ok: false;
          reason: 'missing_smtp_credentials' | 'invalid_smtp_config';
          error: string;
      };

const DEFAULT_INVITATION_MESSAGE =
    'Katherine Carroll te invita cordialmente a acceder a tu espacio exclusivo en el Atelier. A través de este portal privado podrás consultar los detalles y la evolución de tus creaciones de alta costura, agendar citas y realizar el seguimiento personalizado de tu confección.';

const ATELIER_COLORS = {
    charcoal: '#1A1817',
    cream: '#FDFBF7',
    gold: '#9E7D47',
    sand: '#D9CEBF',
    mutedGray: '#736B63',
    cardBorder: '#E6E0D6',
    white: '#FFFFFF',
};

/**
 * Genera la plantilla HTML con estética editorial "Atelier de Autor — By Katherine Carroll".
 */
export function buildInvitationHtmlTemplate(payload: InvitationEmailPayload): string {
    const name = payload.recipientName?.trim() || 'Estimada Clienta';
    const message = payload.customMessage?.trim() || DEFAULT_INVITATION_MESSAGE;
    const bullets =
        payload.permissionsBullets && payload.permissionsBullets.length > 0
            ? payload.permissionsBullets
            : [
                  'Visualización de tus creaciones y bocetos de alta costura',
                  'Fichas de patronaje y cotizaciones comerciales autorizadas',
                  'Agenda de citas en el Atelier y sesiones de prueba de calce',
              ];

    const bulletsHtml = bullets
        .map(
            (bullet) => `
            <li style="margin-bottom: 8px; color: ${ATELIER_COLORS.charcoal}; font-size: 14px; line-height: 1.5;">
                ${escapeHtml(bullet)}
            </li>`
        )
        .join('');

    const formattedExpiry = payload.expiresAt
        ? new Date(payload.expiresAt).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación Privada — Atelier Katherine Carroll</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F2EB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F2EB; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${ATELIER_COLORS.cream}; border: 1px solid ${ATELIER_COLORS.cardBorder}; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
                    <!-- Header Editorial -->
                    <tr>
                        <td style="padding: 40px 40px 24px 40px; text-align: center; background-color: ${ATELIER_COLORS.charcoal};">
                            <p style="margin: 0 0 8px 0; color: ${ATELIER_COLORS.gold}; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">
                                ATELIER DIGITAL · BY KATHERINE CARROLL
                            </p>
                            <h1 style="margin: 0; color: ${ATELIER_COLORS.white}; font-size: 24px; font-weight: 300; letter-spacing: 1px; font-family: Georgia, serif;">
                                Invitación Privada de Alta Costura
                            </h1>
                        </td>
                    </tr>

                    <!-- Cuerpo Principal -->
                    <tr>
                        <td style="padding: 40px 40px 32px 40px;">
                            <p style="margin: 0 0 16px 0; color: ${ATELIER_COLORS.charcoal}; font-size: 16px; font-weight: 600;">
                                Bienvenida, ${escapeHtml(name)}
                            </p>
                            <p style="margin: 0 0 24px 0; color: ${ATELIER_COLORS.charcoal}; font-size: 15px; line-height: 1.6;">
                                ${escapeHtml(message)}
                            </p>

                            <!-- Sección de Permisos -->
                            <div style="background-color: #FFFFFF; border: 1px solid ${ATELIER_COLORS.sand}; padding: 20px; margin-bottom: 32px; border-radius: 2px;">
                                <p style="margin: 0 0 12px 0; color: ${ATELIER_COLORS.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">
                                    ALCANCE CONFIGURADO PARA TU PORTAL
                                </p>
                                <ul style="margin: 0; padding-left: 20px;">
                                    ${bulletsHtml}
                                </ul>
                            </div>

                            <!-- Botón de Activación -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td align="center">
                                        <a href="${escapeHtml(payload.inviteUrl)}" target="_blank" style="display: inline-block; background-color: ${ATELIER_COLORS.charcoal}; color: ${ATELIER_COLORS.white}; text-decoration: none; padding: 16px 36px; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border: 1px solid ${ATELIER_COLORS.gold};">
                                            Activar Mi Acceso Privado
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Nota de Expiración -->
                            ${
                                formattedExpiry
                                    ? `<p style="margin: 0 0 16px 0; text-align: center; color: ${ATELIER_COLORS.mutedGray}; font-size: 12px;">
                                    Esta invitación personalizada es válida hasta el <strong>${escapeHtml(formattedExpiry)}</strong>.
                                </p>`
                                    : ''
                            }

                            <!-- Advertencia de Seguridad -->
                            <div style="border-top: 1px solid ${ATELIER_COLORS.cardBorder}; padding-top: 20px; margin-top: 24px;">
                                <p style="margin: 0 0 8px 0; color: ${ATELIER_COLORS.mutedGray}; font-size: 12px; line-height: 1.5;">
                                    <strong>Aviso de seguridad Zero Trust:</strong> Este enlace es personal, intransferible y de un solo uso. Katherine Carroll jamás te solicitará tu contraseña por teléfono, WhatsApp o correo no verificado.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Pie Legal -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #F2EDE4; border-top: 1px solid ${ATELIER_COLORS.cardBorder}; text-align: center;">
                            <p style="margin: 0 0 6px 0; color: ${ATELIER_COLORS.mutedGray}; font-size: 11px; line-height: 1.4;">
                                Atelier de Autor — Katherine Carroll · Alta Costura a Medida
                            </p>
                            <p style="margin: 0; color: ${ATELIER_COLORS.mutedGray}; font-size: 10px; line-height: 1.4;">
                                Tratamiento de datos personales conforme a la Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013 (República de Colombia). Si no reconoces esta invitación, puedes ignorarla de forma segura.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Genera la versión en texto plano para clientes de correo sin renderizado HTML.
 */
export function buildInvitationTextTemplate(payload: InvitationEmailPayload): string {
    const name = payload.recipientName?.trim() || 'Estimada Clienta';
    const message = payload.customMessage?.trim() || DEFAULT_INVITATION_MESSAGE;
    const bullets =
        payload.permissionsBullets && payload.permissionsBullets.length > 0
            ? payload.permissionsBullets
            : [
                  'Visualización de tus creaciones y bocetos de alta costura',
                  'Fichas de patronaje y cotizaciones comerciales autorizadas',
                  'Agenda de citas en el Atelier y sesiones de prueba de calce',
              ];

    const bulletLines = bullets.map((b) => `• ${b}`).join('\n');
    const expiryLine = payload.expiresAt
        ? `\nVálido hasta: ${payload.expiresAt}\n`
        : '';

    return `ATELIER DIGITAL · BY KATHERINE CARROLL
Invitación Privada de Alta Costura
==================================================

Bienvenida, ${name}

${message}

ALCANCE CONFIGURADO PARA TU PORTAL:
${bulletLines}

Para activar tu acceso privado, abre el siguiente enlace seguro en tu navegador:
${payload.inviteUrl}
${expiryLine}
SEGURIDAD ZERO TRUST:
Este enlace es personal e intransferible. Katherine Carroll jamás te solicitará tu clave por teléfono o mensaje.

Tratamiento de datos personales conforme a la Ley 1581 de 2012 de la República de Colombia.
`;
}

function defaultGetEnv(key: string): string | undefined {
    if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
        return Deno.env.get(key);
    }
    return undefined;
}

/**
 * Resuelve la configuración SMTP de respaldo desde variables de entorno cuando no
 * se dispone de cuenta resuelta desde public.atelier_email_accounts / Vault.
 * Exige mail.itss-proactive.com:465, TLS estricto y remitente invitaciones@bykatherinecarroll.com.
 */
export function resolveSmtpConfig(
    getEnv: EnvGetter = defaultGetEnv,
    timeoutMs: number = DEFAULT_SMTP_TIMEOUT_MS
): ResolvedSmtpConfigResult {
    const rawHost = (getEnv('SMTP_HOST') ?? CANONICAL_SMTP_HOST).trim().toLowerCase();
    if (rawHost !== CANONICAL_SMTP_HOST) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Host SMTP no autorizado para validación TLS estricta. Se requiere mail.itss-proactive.com.',
        };
    }

    const rawPort = (getEnv('SMTP_PORT') ?? String(CANONICAL_SMTP_PORT)).trim();
    if (!/^\d+$/.test(rawPort) || Number(rawPort) !== CANONICAL_SMTP_PORT) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Puerto SMTP no permitido. La configuración corporativa Zimbra requiere puerto 465 (SSL/TLS implícito).',
        };
    }

    const rawSecure = (getEnv('SMTP_SECURE') ?? 'true').trim().toLowerCase();
    if (rawSecure !== 'true') {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Modo SMTP inseguro rechazado. El puerto 465 requiere SSL/TLS implícito (SMTP_SECURE=true).',
        };
    }

    const smtpUser = (getEnv('SMTP_USER') ?? '').trim();
    const smtpPass = getEnv('SMTP_PASS') ?? '';
    if (!smtpUser || !smtpPass.trim()) {
        return {
            ok: false,
            reason: 'missing_smtp_credentials',
            error: 'Credenciales SMTP incompletas en variables de entorno.',
        };
    }

    const normalizedUser = extractEmailAddress(smtpUser);
    if (!normalizedUser || normalizedUser !== AUTHORIZED_SMTP_SENDER) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Usuario SMTP no autorizado para M09. Se requiere invitaciones@bykatherinecarroll.com.',
        };
    }

    const fromAddress = (getEnv('PORTAL_EMAIL_FROM') ?? DEFAULT_PORTAL_EMAIL_FROM).trim();
    const normalizedFrom = extractEmailAddress(fromAddress);
    if (!normalizedFrom || normalizedFrom !== AUTHORIZED_SMTP_SENDER) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Remitente PORTAL_EMAIL_FROM no autorizado para invitaciones M09.',
        };
    }

    const displayNameMatch = fromAddress.match(/^([^<]+)</);
    const displayName = displayNameMatch
        ? displayNameMatch[1].trim()
        : 'Atelier Katherine Carroll';

    const safeTimeout =
        Number.isFinite(timeoutMs) && timeoutMs > 0
            ? Math.floor(timeoutMs)
            : DEFAULT_SMTP_TIMEOUT_MS;

    return {
        ok: true,
        fromAddress,
        config: {
            host: CANONICAL_SMTP_HOST,
            port: CANONICAL_SMTP_PORT,
            secure: true,
            auth: {
                user: normalizedUser,
                pass: smtpPass,
            },
            tls: {
                servername: CANONICAL_SMTP_HOST,
                rejectUnauthorized: true,
                minVersion: 'TLSv1.2',
            },
            connectionTimeout: safeTimeout,
            greetingTimeout: safeTimeout,
            socketTimeout: safeTimeout,
        },
        account: {
            id: null,
            purpose: PORTAL_INVITATIONS_PURPOSE,
            display_name: displayName,
            from_email: normalizedFrom,
            reply_to_email: 'info@bykatherinecarroll.com',
            smtp_host: CANONICAL_SMTP_HOST,
            smtp_port: CANONICAL_SMTP_PORT,
            smtp_secure: true,
            smtp_user: normalizedUser,
            is_active: true,
            smtp_password: smtpPass,
        },
    };
}

/**
 * Despachador de correos de invitación M09 delegando el transporte al despachador
 * SMTP compartido (_shared/emailDispatcher.ts) bajo el propósito 'portal_invitations'.
 * - Con PORTAL_EMAIL_DISPATCH_ENABLED !== 'true' retorna estado simulado sin abrir sockets.
 * - Si se provee supabaseAdmin, resuelve cuenta activa + credencial desde Vault y registra
 *   traza honesta en public.atelier_email_logs (smtp_accepted / failed; jamás delivered).
 */
export async function dispatchPortalInvitationEmail(
    payload: InvitationEmailPayload,
    options: EmailDispatchOptions = {}
): Promise<EmailDispatchResult> {
    const getEnv = options.getEnv ?? defaultGetEnv;
    const isEnabled = getEnv('PORTAL_EMAIL_DISPATCH_ENABLED') === 'true';

    if (!isEnabled) {
        console.log(
            '[emailService] Despacho omitido de forma segura: PORTAL_EMAIL_DISPATCH_ENABLED = false (modo fail-closed).'
        );
        return {
            sent: false,
            simulated: true,
            reason: 'dispatch_disabled_by_protocol',
            messageId: null,
        };
    }

    const recipientEmail = extractEmailAddress(payload.recipientEmail || '');
    if (!recipientEmail) {
        console.warn(
            '[emailService] Destinatario inválido o malformado. Despacho abortado sin conexión SMTP.'
        );
        return {
            sent: false,
            simulated: false,
            reason: 'invalid_recipient',
            messageId: null,
            error: 'Dirección de correo de destinatario inválida.',
        };
    }

    const subject =
        'Tu Invitación Exclusiva al Portal Privado — Atelier Katherine Carroll';
    const html = buildInvitationHtmlTemplate(payload);
    const text = buildInvitationTextTemplate(payload);

    // Si existe supabaseAdmin con RPC Vault disponible, resolver desde atelier_email_accounts;
    // de lo contrario usar resolución de variables de entorno validada (compatibilidad unitaria).
    let resolvedAccountOverride: ResolvedEmailAccount | undefined;
    const canResolveViaDb =
        Boolean(options.supabaseAdmin) &&
        typeof options.supabaseAdmin.rpc === 'function';

    if (!canResolveViaDb) {
        const envResolved = resolveSmtpConfig(getEnv, options.timeoutMs);
        if (!envResolved.ok) {
            console.warn(
                `[emailService] Configuración SMTP no válida (${envResolved.reason}). Despacho no completado.`
            );
            return {
                sent: false,
                simulated: false,
                reason: envResolved.reason,
                messageId: null,
                error: envResolved.error,
            };
        }
        resolvedAccountOverride = envResolved.account;
    }

    const sharedResult = await dispatchEmailByPurpose(
        {
            purpose: PORTAL_INVITATIONS_PURPOSE,
            moduleOrigin: 'M09',
            recipientEmail,
            subject,
            html,
            text,
            dedupeKey: options.dedupeKey,
            sensitiveValues: [payload.inviteUrl],
            supabaseAdmin: options.supabaseAdmin,
            resolvedAccountOverride,
        },
        {
            createTransport: options.createTransport,
            timeoutMs: options.timeoutMs,
            getEnv,
        }
    );

    return {
        sent: sharedResult.sent,
        simulated: sharedResult.simulated,
        messageId: sharedResult.messageId,
        logId: sharedResult.logId,
        deliveryStatus: sharedResult.status,
        reason: sharedResult.reason,
        error: sharedResult.error,
    };
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
