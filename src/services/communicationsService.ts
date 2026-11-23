// ==============================================================================
// ATELIER DIGITAL — SERVICIO ADMINISTRATIVO DE COMUNICACIONES (SMTP ZIMBRA)
// Archivo: src/services/communicationsService.ts
// ==============================================================================
// Gestiona cuentas SMTP por propósito, pruebas de conectividad, envío de prueba
// controlado al administrador e historial de correos mediante la Edge Function
// exclusiva de administración `admin-email-config`.
// - Nunca lee ni devuelve contraseñas en texto plano.
// - Nunca registra credenciales en console logs.
// ==============================================================================

import { supabase } from '../supabase';
import {
    AgendaReminderEmailPreparationDTO,
    AtelierEmailAccount,
    AtelierEmailLogItem,
    CommercialQuoteEmailPreparationDTO,
    EmailConnectionTestResult,
    EmailLogStatus,
    EmailLogsFilter,
    EmailModuleOrigin,
    EmailPurpose,
    EmailTestSendResult,
    UpsertAtelierEmailAccountDTO,
} from '../types/communications';

export const ADMIN_EMAIL_EDGE_FUNCTION = 'admin-email-config';
export const CANONICAL_ZIMBRA_HOST = 'mail.itss-proactive.com';
export const CANONICAL_ZIMBRA_PORT = 465;

export const EMAIL_PURPOSE_META: Record<
    EmailPurpose,
    {
        title: string;
        moduleBadge: string;
        description: string;
        defaultSenderHint: string;
    }
> = {
    portal_invitations: {
        title: 'Invitaciones Portal de Clientas',
        moduleBadge: 'M09',
        description:
            'Despacho de enlaces de activación privada y onboarding Zero Trust para clientas.',
        defaultSenderHint: 'invitaciones@bykatherinecarroll.com',
    },
    commercial_quotes: {
        title: 'Cotizaciones Comerciales',
        moduleBadge: 'M03',
        description:
            'Envío de propuestas formales y cotizaciones de alta costura preparadas en M03.',
        defaultSenderHint: 'gerente@bykatherinecarroll.com',
    },
    agenda_reminders: {
        title: 'Recordatorios de Agenda y Pruebas',
        moduleBadge: 'M08',
        description:
            'Recordatorios de citas en el atelier, pruebas de calce y entregas preservando privacidad M08.',
        defaultSenderHint: 'info@bykatherinecarroll.com',
    },
    contact_support: {
        title: 'Contacto Institucional y Soporte',
        moduleBadge: 'CONTACTO',
        description:
            'Comunicaciones generales, atención institucional y solicitudes de Habeas Data.',
        defaultSenderHint: 'info@bykatherinecarroll.com',
    },
    billing_notifications: {
        title: 'Notificaciones de Facturación y Pagos',
        moduleBadge: 'FACTURACIÓN',
        description:
            'Avisos de pagos, abonos y vencimientos. Permanecerá inactivo hasta definir y validar su cuenta.',
        defaultSenderHint: 'Pendiente de definir',
    },
};

export const EMAIL_MODULE_ORIGIN_LABELS: Record<EmailModuleOrigin, string> = {
    M09: 'M09 · Portal Clientas',
    M03: 'M03 · Cotizaciones',
    M08: 'M08 · Agenda',
    contact: 'Contacto',
    billing: 'Facturación',
    admin_test: 'Prueba Admin',
};

export const EMAIL_STATUS_META: Record<
    EmailLogStatus,
    { label: string; detail: string; bg: string; text: string; border: string }
> = {
    queued: {
        label: 'EN COLA',
        detail: 'Pendiente de procesamiento.',
        bg: '#F4F1ED',
        text: '#6E645A',
        border: '#DDD5CA',
    },
    sending: {
        label: 'ENVIANDO',
        detail: 'Transmisión SMTP en curso.',
        bg: '#EEF4FA',
        text: '#2C5E8A',
        border: '#C7DAEC',
    },
    smtp_accepted: {
        label: 'ACEPTADO SMTP',
        detail: 'Zimbra aceptó el mensaje (250 OK). No equivale a entrega confirmada en bandeja.',
        bg: '#FFF8E7',
        text: '#8A5D10',
        border: '#E8D5B0',
    },
    delivered: {
        label: 'ENTREGADO',
        detail: 'Entrega posterior confirmada mediante evidencia verificable.',
        bg: '#E8F5E9',
        text: '#2E7D32',
        border: '#B9DFBC',
    },
    bounced: {
        label: 'REBOTADO',
        detail: 'Mensaje devuelto o rechazado posteriormente por el servidor receptor.',
        bg: '#FCEAEA',
        text: '#9E2A2B',
        border: '#E5B3B3',
    },
    failed: {
        label: 'FALLIDO',
        detail: 'Error de conexión, autenticación o rechazo durante el envío SMTP.',
        bg: '#FAF2F2',
        text: '#9E3B3B',
        border: '#E8C5C5',
    },
    delivery_unknown: {
        label: 'ENTREGA NO CONFIRMADA',
        detail: 'Zimbra no provee confirmación posterior de bandeja para este envío.',
        bg: '#F3EFEA',
        text: '#7A6F64',
        border: '#D6CEC3',
    },
};

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export interface EmailAccountValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export function validateEmailAccountInput(
    dto: UpsertAtelierEmailAccountDTO,
    hasExistingCredential: boolean
): EmailAccountValidationResult {
    const errors: Record<string, string> = {};

    if (!dto.display_name || dto.display_name.trim().length < 2) {
        errors.display_name = 'El nombre visible del remitente debe tener al menos 2 caracteres.';
    } else if (/[\r\n]/.test(dto.display_name)) {
        errors.display_name = 'El nombre del remitente no puede contener saltos de línea.';
    }

    const fromEmail = (dto.from_email || '').trim().toLowerCase();
    if (fromEmail && !EMAIL_REGEX.test(fromEmail)) {
        errors.from_email = 'Ingrese un correo remitente válido.';
    }

    const replyTo = (dto.reply_to_email || '').trim().toLowerCase();
    if (replyTo && !EMAIL_REGEX.test(replyTo)) {
        errors.reply_to_email = 'Ingrese una dirección de respuesta (Reply-To) válida.';
    }

    const host = (dto.smtp_host || '').trim().toLowerCase();
    if (host !== CANONICAL_ZIMBRA_HOST) {
        errors.smtp_host = `El host SMTP autorizado para TLS estricto es ${CANONICAL_ZIMBRA_HOST}.`;
    }

    if (Number(dto.smtp_port) !== CANONICAL_ZIMBRA_PORT) {
        errors.smtp_port = 'El puerto SMTP corporativo Zimbra debe ser 465.';
    }

    if (!dto.smtp_secure) {
        errors.smtp_secure = 'SSL/TLS implícito (puerto 465) es obligatorio.';
    }

    const smtpUser = (dto.smtp_user || '').trim().toLowerCase();
    if (smtpUser && !EMAIL_REGEX.test(smtpUser)) {
        errors.smtp_user = 'El usuario SMTP debe tener formato de correo válido.';
    }

    if (fromEmail && smtpUser && fromEmail !== smtpUser) {
        errors.smtp_user =
            'En Zimbra el usuario SMTP debe coincidir con el correo remitente autorizado.';
    }

    const hasPasswordAfterSave =
        hasExistingCredential || Boolean(dto.smtp_password && dto.smtp_password.trim().length > 0);

    if (dto.is_active) {
        if (!fromEmail) {
            errors.from_email = 'Define un correo remitente antes de activar este propósito.';
        }
        if (!smtpUser) {
            errors.smtp_user = 'Define un usuario SMTP antes de activar este propósito.';
        }
        if (!hasPasswordAfterSave) {
            errors.smtp_password =
                'Ingresa una contraseña SMTP (se guarda en Vault) antes de activar esta cuenta.';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

export interface AdminEmailInvokeOptions {
    invokeFn?: (
        fnName: string,
        opts: { body: Record<string, unknown>; headers?: Record<string, string> }
    ) => Promise<{ data: any; error: any }>;
    accessToken?: string;
}

async function invokeAdminEmailFunction(
    body: Record<string, unknown>,
    options?: AdminEmailInvokeOptions
): Promise<{ ok: boolean; status: number; data: any; error: string | null }> {
    const invoke =
        options?.invokeFn ||
        ((fnName: string, invokeOpts: { body: Record<string, unknown>; headers?: Record<string, string> }) =>
            supabase.functions.invoke(fnName, invokeOpts));

    try {
        let token = options?.accessToken?.trim() || '';
        if (!token) {
            const { data: sessionData } = await supabase.auth.getSession();
            token = sessionData?.session?.access_token?.trim() || '';
        }

        const headers: Record<string, string> = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const { data, error } = await invoke(ADMIN_EMAIL_EDGE_FUNCTION, {
            body,
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
        });

        if (error) {
            let parsedBody: any = null;
            let status = 500;
            if (error?.context) {
                status = typeof error.context.status === 'number' ? error.context.status : 500;
                try {
                    const text = await error.context.text();
                    parsedBody = text ? JSON.parse(text) : null;
                } catch {
                    parsedBody = null;
                }
            }
            const errMsg =
                parsedBody?.error ||
                parsedBody?.message ||
                error?.message ||
                'No fue posible comunicarse con el módulo de comunicaciones.';
            return { ok: false, status, data: parsedBody, error: errMsg };
        }

        return {
            ok: Boolean(data?.ok),
            status: 200,
            data,
            error: data?.ok ? null : data?.error || data?.message || 'Error en la operación.',
        };
    } catch (err: any) {
        return {
            ok: false,
            status: 503,
            data: null,
            error:
                err?.message ||
                'Servicio administrativo de comunicaciones no disponible (verifica despliegue de Edge Function).',
        };
    }
}

export async function fetchEmailAccounts(
    options?: AdminEmailInvokeOptions
): Promise<{ accounts: AtelierEmailAccount[]; error: string | null }> {
    const res = await invokeAdminEmailFunction({ action: 'list_accounts' }, options);
    if (!res.ok) {
        return { accounts: [], error: res.error };
    }
    return {
        accounts: Array.isArray(res.data?.accounts) ? res.data.accounts : [],
        error: null,
    };
}

export async function saveEmailAccount(
    dto: UpsertAtelierEmailAccountDTO,
    hasExistingCredential: boolean,
    options?: AdminEmailInvokeOptions
): Promise<{
    success: boolean;
    account?: AtelierEmailAccount;
    credentialUpdated?: boolean;
    error: string | null;
}> {
    const validation = validateEmailAccountInput(dto, hasExistingCredential);
    if (!validation.isValid) {
        const firstErr = Object.values(validation.errors)[0];
        return { success: false, error: firstErr || 'Revisa los campos del formulario.' };
    }

    const payload: Record<string, unknown> = {
        action: 'upsert_account',
        purpose: dto.purpose,
        display_name: dto.display_name.trim(),
        from_email: dto.from_email ? dto.from_email.trim().toLowerCase() : null,
        reply_to_email: dto.reply_to_email ? dto.reply_to_email.trim().toLowerCase() : null,
        smtp_host: dto.smtp_host.trim().toLowerCase(),
        smtp_port: Number(dto.smtp_port),
        smtp_secure: Boolean(dto.smtp_secure),
        smtp_user: dto.smtp_user ? dto.smtp_user.trim().toLowerCase() : null,
        is_active: Boolean(dto.is_active),
    };

    if (dto.smtp_password && dto.smtp_password.trim().length > 0) {
        payload.smtp_password = dto.smtp_password;
    }

    const res = await invokeAdminEmailFunction(payload, options);
    if (!res.ok || !res.data?.account) {
        return { success: false, error: res.error || 'No se pudo guardar la cuenta.' };
    }

    return {
        success: true,
        account: res.data.account as AtelierEmailAccount,
        credentialUpdated: Boolean(res.data.credential_updated),
        error: null,
    };
}

export async function toggleEmailAccount(
    accountId: string,
    isActive: boolean,
    options?: AdminEmailInvokeOptions
): Promise<{ success: boolean; account?: AtelierEmailAccount; error: string | null }> {
    const res = await invokeAdminEmailFunction(
        { action: 'toggle_account', account_id: accountId, is_active: isActive },
        options
    );
    if (!res.ok || !res.data?.account) {
        return { success: false, error: res.error || 'No se pudo cambiar el estado.' };
    }
    return { success: true, account: res.data.account as AtelierEmailAccount, error: null };
}

export async function testEmailAccountConnection(
    accountId: string,
    options?: AdminEmailInvokeOptions
): Promise<EmailConnectionTestResult> {
    const res = await invokeAdminEmailFunction(
        { action: 'test_connection', account_id: accountId },
        options
    );
    return {
        ok: Boolean(res.data?.ok),
        status: res.data?.status === 'verified' ? 'verified' : 'failed',
        reason: typeof res.data?.reason === 'string' ? res.data.reason : 'connection_failed',
        message:
            typeof res.data?.message === 'string'
                ? res.data.message
                : res.error || 'No fue posible verificar la conexión SMTP.',
        last_verified_at:
            typeof res.data?.last_verified_at === 'string' ? res.data.last_verified_at : null,
    };
}

export async function sendControlledTestEmail(
    accountId: string,
    confirmed: boolean,
    options?: AdminEmailInvokeOptions
): Promise<EmailTestSendResult> {
    if (!confirmed) {
        return {
            ok: false,
            status: 'failed',
            log_id: null,
            message_id: null,
            recipient_email: null,
            reason: 'confirmation_required',
            message: 'Debes confirmar explícitamente antes de enviar un correo de prueba.',
        };
    }

    const res = await invokeAdminEmailFunction(
        { action: 'send_test_email', account_id: accountId, confirmed: true },
        options
    );
    return {
        ok: Boolean(res.data?.ok),
        status: (res.data?.status as EmailLogStatus) || 'failed',
        log_id: typeof res.data?.log_id === 'string' ? res.data.log_id : null,
        message_id: typeof res.data?.message_id === 'string' ? res.data.message_id : null,
        recipient_email:
            typeof res.data?.recipient_email === 'string' ? res.data.recipient_email : null,
        reason: typeof res.data?.reason === 'string' ? res.data.reason : 'failed',
        message:
            typeof res.data?.message === 'string'
                ? res.data.message
                : res.error || 'No se pudo enviar el correo de prueba.',
    };
}

export async function fetchEmailLogs(
    filter: EmailLogsFilter = {},
    options?: AdminEmailInvokeOptions
): Promise<{ logs: AtelierEmailLogItem[]; error: string | null }> {
    const body: Record<string, unknown> = {
        action: 'list_logs',
        limit: filter.limit ?? 50,
    };
    if (filter.purpose && filter.purpose !== 'all') body.purpose = filter.purpose;
    if (filter.module_origin && filter.module_origin !== 'all') {
        body.module_origin = filter.module_origin;
    }
    if (filter.status && filter.status !== 'all') body.status = filter.status;
    if (filter.date_from && filter.date_from.trim()) body.date_from = filter.date_from.trim();
    if (filter.date_to && filter.date_to.trim()) body.date_to = filter.date_to.trim();

    const res = await invokeAdminEmailFunction(body, options);
    if (!res.ok) {
        return { logs: [], error: res.error };
    }
    return {
        logs: Array.isArray(res.data?.logs) ? res.data.logs : [],
        error: null,
    };
}

// ==============================================================================
// ADAPTADORES PREPARADOS PARA FUTURA INTEGRACIÓN CON M03 Y M08 (SOLO CONTRATO)
// ==============================================================================

export function prepareCommercialQuoteEmailEnvelope(
    dto: CommercialQuoteEmailPreparationDTO
) {
    return {
        purpose: 'commercial_quotes' as const,
        moduleOrigin: 'M03' as const,
        expectedSender: 'gerente@bykatherinecarroll.com',
        dedupeKey: `m03_quote_${dto.quoteId}`,
        recipientEmail: dto.recipientEmail.trim().toLowerCase(),
        quoteCode: dto.quoteCode.trim(),
        clientName: dto.clientName.trim(),
        totalLabel: dto.totalLabel.trim(),
        validUntilLabel: dto.validUntilLabel?.trim() || undefined,
    };
}

export function prepareAgendaReminderEmailEnvelope(
    dto: AgendaReminderEmailPreparationDTO
) {
    return {
        purpose: 'agenda_reminders' as const,
        moduleOrigin: 'M08' as const,
        expectedSender: 'info@bykatherinecarroll.com',
        dedupeKey: `m08_reminder_${dto.appointmentId}`,
        recipientEmail: dto.recipientEmail.trim().toLowerCase(),
        clientName: dto.clientName.trim(),
        creationDisplay: dto.creationDisplay.trim(),
        scheduledDateLabel: dto.scheduledDateLabel.trim(),
        locationLabel: dto.locationLabel?.trim() || undefined,
    };
}
