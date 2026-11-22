// ==============================================================================
// ATELIER DIGITAL — SERVICIO EDITORIAL DE CORREO DE INVITACIÓN (M09-E2)
// Archivo: supabase/functions/accept-portal-invitation/emailService.ts
// ==============================================================================
// Plantillas de correo de alta costura (HTML editorial y texto plano) y pasarela
// de despacho con seguro de bloqueo activo (PORTAL_EMAIL_DISPATCH_ENABLED).
//
// REGLAS DE SEGURIDAD ESTRICTAS:
// - El envío real permanece DESHABILITADO por defecto (fail-closed) hasta
//   la certificación completa de seguridad e IP Gateway de la Entrega E2.
// - Cero exposición de tokens en logs del servidor.
// - Plantillas conformes con el estatuto de privacidad de la Ley 1581 de 2012.
// ==============================================================================

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
    reason?: string;
    error?: string;
}

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

/**
 * Despachador de correos con seguro de bloqueo activo.
 * - Si PORTAL_EMAIL_DISPATCH_ENABLED !== 'true', bloquea el envío real y retorna estado simulado.
 * - Cero PII ni enlaces en logs.
 */
export async function dispatchPortalInvitationEmail(
    payload: InvitationEmailPayload
): Promise<EmailDispatchResult> {
    const isEnabled =
        typeof Deno !== 'undefined' &&
        Deno.env.get('PORTAL_EMAIL_DISPATCH_ENABLED') === 'true';

    if (!isEnabled) {
        console.log(
            '[emailService] Despacho omitido de forma segura: PORTAL_EMAIL_DISPATCH_ENABLED = false (Entrega E2 en modo preparación).'
        );
        return {
            sent: false,
            simulated: true,
            reason: 'dispatch_disabled_by_protocol',
            messageId: null,
        };
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
        console.warn(
            '[emailService] Configuración incompleta: RESEND_API_KEY no definida. Despacho no completado.'
        );
        return {
            sent: false,
            simulated: false,
            reason: 'missing_resend_api_key',
            error: 'Servicio de correo no configurado en variables de entorno.',
        };
    }

    try {
        const fromAddress =
            Deno.env.get('PORTAL_EMAIL_FROM') ||
            'Katherine Carroll <invitaciones@atelierdigital.co>';
        const subject =
            'Tu Invitación Exclusiva al Portal Privado — Atelier Katherine Carroll';

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [payload.recipientEmail],
                subject,
                html: buildInvitationHtmlTemplate(payload),
                text: buildInvitationTextTemplate(payload),
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(
                `[emailService] Error de proveedor de correo (HTTP ${res.status}): ${res.statusText}`
            );
            return {
                sent: false,
                simulated: false,
                reason: 'provider_rejected',
                error: `HTTP ${res.status}: ${errBody.slice(0, 200)}`,
            };
        }

        const data = (await res.json()) as { id?: string };
        console.log('[emailService] Correo despachado exitosamente con ID:', data?.id);
        return {
            sent: true,
            simulated: false,
            messageId: data?.id || null,
        };
    } catch (err: any) {
        console.error(
            '[emailService] Excepción durante el despacho de correo:',
            err?.message || String(err)
        );
        return {
            sent: false,
            simulated: false,
            reason: 'network_exception',
            error: err?.message || 'Error de red en el despacho de correo',
        };
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
