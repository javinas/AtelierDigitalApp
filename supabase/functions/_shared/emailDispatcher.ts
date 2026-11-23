// ==============================================================================
// ATELIER DIGITAL — DESPACHADOR SMTP COMPARTIDO (ZIMBRA CORPORATIVO)
// Archivo: supabase/functions/_shared/emailDispatcher.ts
// ==============================================================================
// Centraliza el transporte SMTP Zimbra (mail.itss-proactive.com:465, SSL/TLS
// implícito con validación estricta de certificado TLS >= 1.2) para:
// - M09: portal_invitations (invitaciones@bykatherinecarroll.com)
// - M03: commercial_quotes (gerente@bykatherinecarroll.com)
// - M08: agenda_reminders (info@bykatherinecarroll.com)
// - Contacto: contact_support (info@bykatherinecarroll.com)
// - Facturación: billing_notifications (inactivo hasta definir cuenta)
//
// REGLAS DE SEGURIDAD Y HONESTIDAD DE ENTREGA:
// - Solo SMTP Zimbra (cero Resend, cero SES, cero proveedores alternativos).
// - Cero contraseñas, tokens, URLs ni correos completos en console logs.
// - Nunca marcar status = 'delivered' solo por aceptación SMTP (250 OK -> 'smtp_accepted').
// - Validación de certificado TLS obligatoria (rejectUnauthorized: true, TLSv1.2+).
// - Cierre garantizado del transporte (transporter.close()) y guardia de timeout.
// ==============================================================================

import nodemailer from 'npm:nodemailer@10.6.1';

export const CANONICAL_SMTP_HOST = 'mail.itss-proactive.com';
export const CANONICAL_SMTP_PORT = 465;
export const DEFAULT_SMTP_TIMEOUT_MS = 15_000;

export const EMAIL_PURPOSES = [
    'portal_invitations',
    'commercial_quotes',
    'agenda_reminders',
    'contact_support',
    'billing_notifications',
] as const;

export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export const EMAIL_LOG_STATUSES = [
    'queued',
    'sending',
    'smtp_accepted',
    'delivered',
    'bounced',
    'failed',
    'delivery_unknown',
] as const;

export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

export const EMAIL_MODULE_ORIGINS = [
    'M09',
    'M03',
    'M08',
    'contact',
    'billing',
    'admin_test',
] as const;

export type EmailModuleOrigin = (typeof EMAIL_MODULE_ORIGINS)[number];

export interface ResolvedEmailAccount {
    id: string | null;
    purpose: EmailPurpose;
    display_name: string;
    from_email: string | null;
    reply_to_email: string | null;
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_user: string | null;
    is_active: boolean;
    smtp_password: string | null;
}

export interface SmtpTransportConfig {
    host: string;
    port: number;
    secure: true;
    auth: {
        user: string;
        pass: string;
    };
    tls: {
        servername: string;
        rejectUnauthorized: true;
        minVersion: 'TLSv1.2';
    };
    connectionTimeout: number;
    greetingTimeout: number;
    socketTimeout: number;
}

export interface SmtpMailOptions {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
}

export interface SmtpSendInfo {
    messageId?: string;
    accepted?: unknown[];
    rejected?: unknown[];
    response?: string;
}

export interface SmtpTransporter {
    sendMail(mailOptions: SmtpMailOptions): Promise<SmtpSendInfo>;
    verify?: () => Promise<boolean | void>;
    close?: () => void;
}

export type SmtpTransportFactory = (
    config: SmtpTransportConfig
) => SmtpTransporter;

export type EmailDispatchTrigger = 'manual' | 'cron';
export type EnvGetter = (key: string) => string | undefined;

export const MODULE_DISPATCH_FLAGS = {
    M09: 'PORTAL_EMAIL_DISPATCH_ENABLED',
    M03: 'M03_QUOTE_EMAIL_DISPATCH_ENABLED',
    M08: 'M08_REMINDER_EMAIL_DISPATCH_ENABLED',
    M08_CRON: 'M08_REMINDER_CRON_ENABLED',
} as const;

export interface DispatchByPurposeParams {
    purpose: EmailPurpose;
    moduleOrigin: EmailModuleOrigin;
    trigger?: EmailDispatchTrigger;
    recipientEmail: string;
    subject: string;
    html: string;
    text: string;
    dedupeKey?: string;
    sensitiveValues?: readonly string[];
    supabaseAdmin?: any;
    resolvedAccountOverride?: ResolvedEmailAccount | null;
    allowInactiveOverride?: boolean;
}

export interface ModuleDispatchLockEvaluation {
    allowed: boolean;
    requiredFlag: string | null;
    reason?:
        | 'm09_dispatch_disabled'
        | 'm03_dispatch_disabled'
        | 'm08_dispatch_disabled'
        | 'm08_cron_dispatch_disabled';
    message?: string;
}

export interface SharedEmailDispatchResult {
    sent: boolean;
    simulated: boolean;
    deduplicated: boolean;
    status: EmailLogStatus;
    logId: string | null;
    messageId: string | null;
    smtpResponse: string | null;
    fromEmail: string | null;
    reason?: string;
    error?: string;
}

export interface SmtpVerifyResult {
    ok: boolean;
    status: 'verified' | 'failed';
    reason: string;
    message: string;
}

export interface DispatcherRuntimeOptions {
    createTransport?: SmtpTransportFactory;
    timeoutMs?: number;
    getEnv?: EnvGetter;
}

// Barreras de deduplicación en memoria del aislado para evitar envíos duplicados
const inFlightDedupeMap = new Map<string, Promise<SharedEmailDispatchResult>>();
const acceptedDedupeCache = new Map<string, { logId: string | null; messageId: string | null }>();

export function resetEmailDispatcherDedupeForTests(): void {
    inFlightDedupeMap.clear();
    acceptedDedupeCache.clear();
}

export function isValidEmailPurpose(value: unknown): value is EmailPurpose {
    return typeof value === 'string' && (EMAIL_PURPOSES as readonly string[]).includes(value);
}

export function hasHeaderInjection(value: string): boolean {
    return /[\r\n]/.test(value);
}

export function extractEmailAddress(raw: string): string | null {
    const trimmed = (raw || '').trim();
    if (!trimmed || hasHeaderInjection(trimmed)) {
        return null;
    }
    const angleMatch = trimmed.match(/<([^<>]+)>/);
    const candidate = (angleMatch ? angleMatch[1] : trimmed).trim().toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(candidate)) {
        return null;
    }
    return candidate;
}

export function formatSenderHeader(displayName: string, fromEmail: string): string {
    const cleanName = (displayName || 'Atelier Katherine Carroll')
        .replace(/[\r\n"<>]/g, '')
        .trim();
    return cleanName ? `${cleanName} <${fromEmail}>` : fromEmail;
}

export function sanitizeTextForLogs(
    rawText: string,
    sensitiveValues: readonly string[] = [],
    maxLen = 220
): string {
    let cleaned = String(rawText || '')
        .replace(/[\r\n]+/g, ' ')
        .trim();

    for (const secret of sensitiveValues) {
        if (secret && secret.length > 0) {
            cleaned = cleaned.split(secret).join('[redacted]');
        }
    }

    cleaned = cleaned
        .replace(/token=[^\s&"']+/gi, 'token=[redacted]')
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]');

    return cleaned.slice(0, maxLen);
}

export function defaultCreateTransport(config: SmtpTransportConfig): SmtpTransporter {
    return nodemailer.createTransport(config) as unknown as SmtpTransporter;
}

export function validateAccountForSmtp(
    account: ResolvedEmailAccount | null,
    options: { requireActive: boolean; timeoutMs?: number }
):
    | {
          ok: true;
          config: SmtpTransportConfig;
          fromEmail: string;
          fromHeader: string;
          replyTo?: string;
      }
    | {
          ok: false;
          reason:
              | 'account_not_found'
              | 'account_inactive'
              | 'missing_smtp_credentials'
              | 'invalid_smtp_config';
          error: string;
      } {
    if (!account) {
        return {
            ok: false,
            reason: 'account_not_found',
            error: 'No existe configuración registrada para el propósito solicitado.',
        };
    }

    if (options.requireActive && !account.is_active) {
        return {
            ok: false,
            reason: 'account_inactive',
            error: 'La cuenta configurada para este propósito se encuentra inactiva.',
        };
    }

    const host = (account.smtp_host || '').trim().toLowerCase();
    if (host !== CANONICAL_SMTP_HOST) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Host SMTP no autorizado para validación TLS estricta. Se requiere mail.itss-proactive.com.',
        };
    }

    if (account.smtp_port !== CANONICAL_SMTP_PORT || account.smtp_secure !== true) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'Configuración SMTP insegura rechazada. Se requiere puerto 465 con SSL/TLS implícito (smtp_secure=true).',
        };
    }

    const fromEmail = extractEmailAddress(account.from_email || '');
    const smtpUser = extractEmailAddress(account.smtp_user || '');
    const smtpPass = account.smtp_password || '';

    if (!fromEmail || !smtpUser || !smtpPass.trim()) {
        return {
            ok: false,
            reason: 'missing_smtp_credentials',
            error: 'La cuenta no tiene remitente, usuario SMTP o credencial configurada en Vault.',
        };
    }

    if (fromEmail !== smtpUser) {
        return {
            ok: false,
            reason: 'invalid_smtp_config',
            error:
                'El remitente from_email debe coincidir con el usuario SMTP autenticado para el servidor Zimbra.',
        };
    }

    let replyTo: string | undefined;
    if (account.reply_to_email && account.reply_to_email.trim()) {
        const parsedReply = extractEmailAddress(account.reply_to_email);
        if (!parsedReply) {
            return {
                ok: false,
                reason: 'invalid_smtp_config',
                error: 'La dirección reply_to_email no tiene un formato válido.',
            };
        }
        replyTo = parsedReply;
    }

    const safeTimeout =
        typeof options.timeoutMs === 'number' &&
        Number.isFinite(options.timeoutMs) &&
        options.timeoutMs > 0
            ? Math.floor(options.timeoutMs)
            : DEFAULT_SMTP_TIMEOUT_MS;

    return {
        ok: true,
        fromEmail,
        fromHeader: formatSenderHeader(account.display_name, fromEmail),
        replyTo,
        config: {
            host: CANONICAL_SMTP_HOST,
            port: CANONICAL_SMTP_PORT,
            secure: true,
            auth: {
                user: smtpUser,
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
    };
}

export function classifySmtpError(err: unknown): {
    reason:
        | 'smtp_auth_failed'
        | 'smtp_timeout'
        | 'smtp_connection_error'
        | 'smtp_rejected'
        | 'smtp_dispatch_error';
    publicMessage: string;
} {
    const errorObj = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
    const code = typeof errorObj.code === 'string' ? errorObj.code.toUpperCase() : '';
    const responseCode =
        typeof errorObj.responseCode === 'number' ? errorObj.responseCode : null;
    const message =
        typeof errorObj.message === 'string' ? errorObj.message : String(err ?? '');

    if (
        code === 'EAUTH' ||
        responseCode === 535 ||
        responseCode === 534 ||
        responseCode === 530 ||
        /authentication failed|invalid login|invalid credentials/i.test(message)
    ) {
        return {
            reason: 'smtp_auth_failed',
            publicMessage: 'Error de autenticación contra el servidor SMTP corporativo.',
        };
    }

    if (
        code === 'ETIMEDOUT' ||
        code === 'SMTP_TIMEOUT' ||
        /timeout|timed out/i.test(message)
    ) {
        return {
            reason: 'smtp_timeout',
            publicMessage: 'Tiempo de espera agotado al conectar con el servidor SMTP.',
        };
    }

    if (
        code === 'ECONNECTION' ||
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        code === 'ENOTFOUND' ||
        code === 'EHOSTUNREACH' ||
        code === 'ENETUNREACH' ||
        code === 'ESOCKET' ||
        code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
        code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
        code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
        code === 'CERT_HAS_EXPIRED' ||
        /tls|ssl|certificate|socket|econn|enotfound|connect/i.test(message)
    ) {
        return {
            reason: 'smtp_connection_error',
            publicMessage:
                'Error de conexión o validación de certificado TLS con el servidor SMTP.',
        };
    }

    if (
        code === 'EENVELOPE' ||
        code === 'EMESSAGE' ||
        (responseCode !== null && responseCode >= 400)
    ) {
        return {
            reason: 'smtp_rejected',
            publicMessage: 'El servidor SMTP rechazó el mensaje.',
        };
    }

    return {
        reason: 'smtp_dispatch_error',
        publicMessage: 'Error inesperado durante la operación SMTP.',
    };
}

async function runWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
): Promise<T> {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
            const timeoutErr = new Error(
                `SMTP operation timed out after ${timeoutMs}ms`
            ) as Error & { code?: string };
            timeoutErr.code = 'SMTP_TIMEOUT';
            reject(timeoutErr);
        }, timeoutMs);
    });

    try {
        return await Promise.race([operation(), timeoutPromise]);
    } finally {
        if (timerId !== undefined) {
            clearTimeout(timerId);
        }
    }
}

/**
 * Prueba conectividad TLS + autenticación SMTP contra Zimbra SIN enviar ningún mensaje.
 */
export async function verifySmtpConnection(
    account: ResolvedEmailAccount | null,
    options: DispatcherRuntimeOptions = {}
): Promise<SmtpVerifyResult> {
    const validated = validateAccountForSmtp(account, {
        requireActive: false,
        timeoutMs: options.timeoutMs,
    });

    if (!validated.ok) {
        return {
            ok: false,
            status: 'failed',
            reason: validated.reason,
            message: validated.error,
        };
    }

    const createTransport = options.createTransport ?? defaultCreateTransport;
    let transporter: SmtpTransporter | null = null;
    try {
        transporter = createTransport(validated.config);
        if (typeof transporter.verify !== 'function') {
            return {
                ok: false,
                status: 'failed',
                reason: 'verify_not_supported',
                message: 'El transporte SMTP no expone método verify().',
            };
        }

        await runWithTimeout(
            () => Promise.resolve(transporter!.verify!()),
            validated.config.socketTimeout
        );

        console.log(
            `[emailDispatcher] Verificación TLS+SMTP exitosa para propósito ${account?.purpose}.`
        );
        return {
            ok: true,
            status: 'verified',
            reason: 'verified',
            message:
                'Conexión TLS estricta y autenticación SMTP verificadas sin enviar correos.',
        };
    } catch (err: unknown) {
        const classified = classifySmtpError(err);
        const safeDetail = sanitizeTextForLogs(
            err instanceof Error ? err.message : String(err ?? ''),
            [validated.config.auth.pass, validated.config.auth.user]
        );
        console.error(
            `[emailDispatcher] Fallo en verificación SMTP (${classified.reason}): ${safeDetail}`
        );
        return {
            ok: false,
            status: 'failed',
            reason: classified.reason,
            message: classified.publicMessage,
        };
    } finally {
        if (transporter && typeof transporter.close === 'function') {
            try {
                transporter.close();
            } catch {
                // Ignorar error secundario al cerrar socket
            }
        }
    }
}

async function resolveAccountFromDatabase(
    supabaseAdmin: any,
    purpose: EmailPurpose
): Promise<ResolvedEmailAccount | null> {
    const { data, error } = await supabaseAdmin.rpc('_atelier_email_resolve_account', {
        p_purpose: purpose,
    });
    if (error) {
        console.error(
            `[emailDispatcher] Error resolviendo cuenta SMTP para ${purpose}:`,
            sanitizeTextForLogs(error.message || 'rpc_error')
        );
        return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? (row as ResolvedEmailAccount) : null;
}

function defaultGetEnv(key: string): string | undefined {
    if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
        return Deno.env.get(key);
    }
    return undefined;
}

/**
 * Evalúa los candados independientes fail-closed por módulo y disparador.
 * Si el candado falta o no es exactamente 'true', bloquea ANTES de abrir
 * cualquier conexión SMTP o consultar Vault.
 * - M09 / portal_invitations -> PORTAL_EMAIL_DISPATCH_ENABLED === 'true'
 * - M03 / commercial_quotes  -> M03_QUOTE_EMAIL_DISPATCH_ENABLED === 'true'
 * - M08 / agenda_reminders   -> M08_REMINDER_EMAIL_DISPATCH_ENABLED === 'true'
 *   + si trigger === 'cron'  -> exige además M08_REMINDER_CRON_ENABLED === 'true'
 */
export function evaluateModuleDispatchLock(
    params: {
        purpose: EmailPurpose;
        moduleOrigin: EmailModuleOrigin;
        trigger?: EmailDispatchTrigger;
    },
    getEnv: EnvGetter = defaultGetEnv
): ModuleDispatchLockEvaluation {
    if (params.moduleOrigin === 'admin_test') {
        return { allowed: true, requiredFlag: null };
    }

    if (params.moduleOrigin === 'M09' || params.purpose === 'portal_invitations') {
        if (getEnv(MODULE_DISPATCH_FLAGS.M09) !== 'true') {
            return {
                allowed: false,
                requiredFlag: MODULE_DISPATCH_FLAGS.M09,
                reason: 'm09_dispatch_disabled',
                message:
                    'Despacho M09 bloqueado (fail-closed): PORTAL_EMAIL_DISPATCH_ENABLED !== true.',
            };
        }
        return { allowed: true, requiredFlag: MODULE_DISPATCH_FLAGS.M09 };
    }

    if (params.moduleOrigin === 'M03' || params.purpose === 'commercial_quotes') {
        if (getEnv(MODULE_DISPATCH_FLAGS.M03) !== 'true') {
            return {
                allowed: false,
                requiredFlag: MODULE_DISPATCH_FLAGS.M03,
                reason: 'm03_dispatch_disabled',
                message:
                    'Despacho M03 bloqueado (fail-closed): M03_QUOTE_EMAIL_DISPATCH_ENABLED !== true.',
            };
        }
        return { allowed: true, requiredFlag: MODULE_DISPATCH_FLAGS.M03 };
    }

    if (params.moduleOrigin === 'M08' || params.purpose === 'agenda_reminders') {
        if (getEnv(MODULE_DISPATCH_FLAGS.M08) !== 'true') {
            return {
                allowed: false,
                requiredFlag: MODULE_DISPATCH_FLAGS.M08,
                reason: 'm08_dispatch_disabled',
                message:
                    'Despacho M08 bloqueado (fail-closed): M08_REMINDER_EMAIL_DISPATCH_ENABLED !== true.',
            };
        }
        if (params.trigger === 'cron' && getEnv(MODULE_DISPATCH_FLAGS.M08_CRON) !== 'true') {
            return {
                allowed: false,
                requiredFlag: MODULE_DISPATCH_FLAGS.M08_CRON,
                reason: 'm08_cron_dispatch_disabled',
                message:
                    'Despacho programado (cron) M08 bloqueado (fail-closed): M08_REMINDER_CRON_ENABLED !== true.',
            };
        }
        return {
            allowed: true,
            requiredFlag:
                params.trigger === 'cron'
                    ? MODULE_DISPATCH_FLAGS.M08_CRON
                    : MODULE_DISPATCH_FLAGS.M08,
        };
    }

    return { allowed: true, requiredFlag: null };
}

/**
 * Despachador centralizado por propósito (M09, M03, M08, contact, billing, admin_test).
 * Registra ciclo de vida honesto en atelier_email_logs:
 *   queued -> sending -> smtp_accepted (o failed).
 * JAMÁS marca status = 'delivered' solo por aceptación SMTP 250 OK.
 */
export async function dispatchEmailByPurpose(
    params: DispatchByPurposeParams,
    options: DispatcherRuntimeOptions = {}
): Promise<SharedEmailDispatchResult> {
    if (!isValidEmailPurpose(params.purpose)) {
        return {
            sent: false,
            simulated: false,
            deduplicated: false,
            status: 'failed',
            logId: null,
            messageId: null,
            smtpResponse: null,
            fromEmail: null,
            reason: 'invalid_purpose',
            error: 'Propósito de correo no admitido.',
        };
    }

    // Capa 1 Fail-Closed: evaluación de candado independiente ANTES de abrir sockets o leer Vault
    const getEnv = options.getEnv ?? defaultGetEnv;
    const lock = evaluateModuleDispatchLock(
        {
            purpose: params.purpose,
            moduleOrigin: params.moduleOrigin,
            trigger: params.trigger ?? 'manual',
        },
        getEnv
    );
    if (!lock.allowed) {
        console.log(
            `[emailDispatcher] Despacho bloqueado de forma segura (${lock.reason}) para ${params.moduleOrigin}/${params.purpose}.`
        );
        return {
            sent: false,
            simulated: true,
            deduplicated: false,
            status: 'queued',
            logId: null,
            messageId: null,
            smtpResponse: null,
            fromEmail: null,
            reason: lock.reason,
            error: lock.message,
        };
    }

    const recipientEmail = extractEmailAddress(params.recipientEmail);
    if (!recipientEmail) {
        return {
            sent: false,
            simulated: false,
            deduplicated: false,
            status: 'failed',
            logId: null,
            messageId: null,
            smtpResponse: null,
            fromEmail: null,
            reason: 'invalid_recipient',
            error: 'Dirección de destinatario inválida.',
        };
    }

    const cleanSubject = (params.subject || '').replace(/[\r\n]+/g, ' ').trim();
    if (!cleanSubject) {
        return {
            sent: false,
            simulated: false,
            deduplicated: false,
            status: 'failed',
            logId: null,
            messageId: null,
            smtpResponse: null,
            fromEmail: null,
            reason: 'invalid_subject',
            error: 'El asunto del correo es obligatorio.',
        };
    }

    const dedupeKey = params.dedupeKey?.trim() || '';
    if (dedupeKey) {
        const cached = acceptedDedupeCache.get(dedupeKey);
        if (cached) {
            return {
                sent: false,
                simulated: false,
                deduplicated: true,
                status: 'smtp_accepted',
                logId: cached.logId,
                messageId: cached.messageId,
                smtpResponse: null,
                fromEmail: null,
                reason: 'already_dispatched',
            };
        }
        const existingPromise = inFlightDedupeMap.get(dedupeKey);
        if (existingPromise) {
            return existingPromise;
        }
    }

    const execute = async (): Promise<SharedEmailDispatchResult> => {
        let account: ResolvedEmailAccount | null =
            params.resolvedAccountOverride !== undefined
                ? params.resolvedAccountOverride
                : null;

        if (params.resolvedAccountOverride === undefined && params.supabaseAdmin) {
            account = await resolveAccountFromDatabase(params.supabaseAdmin, params.purpose);
        }

        const validated = validateAccountForSmtp(account, {
            requireActive: !params.allowInactiveOverride,
            timeoutMs: options.timeoutMs,
        });

        if (!validated.ok) {
            console.warn(
                `[emailDispatcher] Cuenta no lista para propósito ${params.purpose} (${validated.reason}).`
            );
            return {
                sent: false,
                simulated: false,
                deduplicated: false,
                status: 'failed',
                logId: null,
                messageId: null,
                smtpResponse: null,
                fromEmail: account?.from_email ?? null,
                reason: validated.reason,
                error: validated.error,
            };
        }

        const sensitiveList = [
            validated.config.auth.pass,
            validated.config.auth.user,
            recipientEmail,
            params.recipientEmail,
            ...(params.sensitiveValues ?? []),
        ];

        // 1. Registrar estado inicial 'queued' en public.atelier_email_logs (si hay supabaseAdmin)
        let logId: string | null = null;
        if (params.supabaseAdmin && typeof params.supabaseAdmin.from === 'function') {
            try {
                const { data: insertedLog } = await params.supabaseAdmin
                    .from('atelier_email_logs')
                    .insert({
                        purpose: params.purpose,
                        module_origin: params.moduleOrigin,
                        account_id: account?.id ?? null,
                        recipient_email: recipientEmail,
                        from_email: validated.fromEmail,
                        status: 'queued',
                    })
                    .select('id')
                    .single();
                logId = insertedLog?.id ?? null;
            } catch {
                logId = null;
            }
        }

        const updateLogSafe = async (patch: Record<string, unknown>) => {
            if (!logId || !params.supabaseAdmin || typeof params.supabaseAdmin.from !== 'function') {
                return;
            }
            try {
                await params.supabaseAdmin
                    .from('atelier_email_logs')
                    .update(patch)
                    .eq('id', logId);
            } catch {
                // No interrumpir flujo principal por fallo secundario de actualización de log
            }
        };

        await updateLogSafe({ status: 'sending' });

        const createTransport = options.createTransport ?? defaultCreateTransport;
        let transporter: SmtpTransporter | null = null;
        try {
            transporter = createTransport(validated.config);
            const info = await runWithTimeout(
                () =>
                    transporter!.sendMail({
                        from: validated.fromHeader,
                        to: recipientEmail,
                        ...(validated.replyTo ? { replyTo: validated.replyTo } : {}),
                        subject: cleanSubject,
                        html: params.html,
                        text: params.text,
                    }),
                validated.config.socketTimeout
            );

            const safeResponse = info?.response
                ? sanitizeTextForLogs(info.response, sensitiveList, 300)
                : null;
            const safeMessageId =
                typeof info?.messageId === 'string' && info.messageId.trim().length > 0
                    ? info.messageId.trim()
                    : null;

            if (Array.isArray(info?.rejected) && info.rejected.length > 0) {
                await updateLogSafe({
                    status: 'failed',
                    message_id: safeMessageId,
                    smtp_response: safeResponse,
                    error_code: 'smtp_rejected',
                    error_description: 'El servidor SMTP rechazó al menos un destinatario.',
                });
                console.error(
                    `[emailDispatcher] Destinatario rechazado por SMTP (${params.purpose}).`
                );
                return {
                    sent: false,
                    simulated: false,
                    deduplicated: false,
                    status: 'failed',
                    logId,
                    messageId: safeMessageId,
                    smtpResponse: safeResponse,
                    fromEmail: validated.fromEmail,
                    reason: 'smtp_rejected',
                    error: 'El servidor SMTP rechazó la entrega al destinatario.',
                };
            }

            // REGLA OBLIGATORIA: Aceptación 250 OK de Zimbra = 'smtp_accepted' (NUNCA 'delivered')
            await updateLogSafe({
                status: 'smtp_accepted',
                message_id: safeMessageId,
                smtp_response: safeResponse,
                sent_at: new Date().toISOString(),
            });

            if (dedupeKey) {
                acceptedDedupeCache.set(dedupeKey, { logId, messageId: safeMessageId });
            }

            console.log(
                `[emailDispatcher] Mensaje aceptado por SMTP (${params.purpose}, ${params.moduleOrigin}) con ID:`,
                safeMessageId || 'sin-id'
            );

            return {
                sent: true,
                simulated: false,
                deduplicated: false,
                status: 'smtp_accepted',
                logId,
                messageId: safeMessageId,
                smtpResponse: safeResponse,
                fromEmail: validated.fromEmail,
            };
        } catch (err: unknown) {
            const classified = classifySmtpError(err);
            const safeDetail = sanitizeTextForLogs(
                err instanceof Error ? err.message : String(err ?? ''),
                sensitiveList
            );

            await updateLogSafe({
                status: 'failed',
                error_code: classified.reason,
                error_description: classified.publicMessage,
            });

            console.error(
                `[emailDispatcher] Error SMTP (${params.purpose} · ${classified.reason}): ${safeDetail}`
            );

            return {
                sent: false,
                simulated: false,
                deduplicated: false,
                status: 'failed',
                logId,
                messageId: null,
                smtpResponse: null,
                fromEmail: validated.fromEmail,
                reason: classified.reason,
                error: classified.publicMessage,
            };
        } finally {
            if (transporter && typeof transporter.close === 'function') {
                try {
                    transporter.close();
                } catch {
                    // Ignorar error secundario al cerrar conexión SMTP
                }
            }
        }
    };

    const promise = execute();
    if (dedupeKey) {
        inFlightDedupeMap.set(dedupeKey, promise);
        try {
            return await promise;
        } finally {
            inFlightDedupeMap.delete(dedupeKey);
        }
    }
    return promise;
}

// ==============================================================================
// CONTRATOS PREPARADOS PARA INTEGRACIÓN FUTURA DE M03 Y M08 (SIN ALTERAR FLUJOS)
// ==============================================================================

export interface CommercialQuoteEmailContractInput {
    quoteId: string;
    quoteCode: string;
    recipientEmail: string;
    clientName: string;
    totalLabel: string;
    validUntilLabel?: string;
}

export function buildCommercialQuoteEmailDispatchParams(
    input: CommercialQuoteEmailContractInput
): Omit<DispatchByPurposeParams, 'supabaseAdmin'> {
    const safeName = (input.clientName || 'Estimada Clienta').replace(/[\r\n<>]/g, '').trim();
    const safeCode = (input.quoteCode || 'COT').replace(/[\r\n<>]/g, '').trim();
    const safeTotal = (input.totalLabel || '').replace(/[\r\n<>]/g, '').trim();
    const validLine = input.validUntilLabel
        ? `Vigencia de la propuesta: ${input.validUntilLabel}.`
        : '';

    return {
        purpose: 'commercial_quotes',
        moduleOrigin: 'M03',
        recipientEmail: input.recipientEmail,
        subject: `Propuesta Comercial ${safeCode} — Atelier Katherine Carroll`,
        dedupeKey: `m03_quote_${input.quoteId}`,
        html: `<p>Estimada ${safeName},</p><p>Adjuntamos el resumen de su propuesta comercial <strong>${safeCode}</strong> por valor de <strong>${safeTotal}</strong>. ${validLine}</p><p>Atelier de Autor — By Katherine Carroll.</p>`,
        text: `Estimada ${safeName},\n\nResumen de su propuesta comercial ${safeCode} por valor de ${safeTotal}. ${validLine}\n\nAtelier de Autor — By Katherine Carroll.`,
    };
}

export interface AgendaReminderEmailContractInput {
    appointmentId: string;
    recipientEmail: string;
    clientName: string;
    /** Proyección sanitizada M08 (creationDisplay): jamás exponer notas privadas */
    creationDisplay: string;
    scheduledDateLabel: string;
    locationLabel?: string;
}

export function buildAgendaReminderEmailDispatchParams(
    input: AgendaReminderEmailContractInput
): Omit<DispatchByPurposeParams, 'supabaseAdmin'> {
    const safeName = (input.clientName || 'Estimada Clienta').replace(/[\r\n<>]/g, '').trim();
    const safeDisplay = (input.creationDisplay || 'Sesión en el Atelier').replace(/[\r\n<>]/g, '').trim();
    const safeDate = (input.scheduledDateLabel || '').replace(/[\r\n<>]/g, '').trim();
    const safeLocation = (input.locationLabel || 'Atelier By Katherine Carroll').replace(/[\r\n<>]/g, '').trim();

    return {
        purpose: 'agenda_reminders',
        moduleOrigin: 'M08',
        recipientEmail: input.recipientEmail,
        subject: `Recordatorio de Cita — Atelier Katherine Carroll`,
        dedupeKey: `m08_reminder_${input.appointmentId}`,
        html: `<p>Estimada ${safeName},</p><p>Le recordamos su próxima cita en el Atelier: <strong>${safeDisplay}</strong> el <strong>${safeDate}</strong> en ${safeLocation}.</p><p>Atelier de Autor — By Katherine Carroll.</p>`,
        text: `Estimada ${safeName},\n\nRecordatorio de cita: ${safeDisplay} el ${safeDate} en ${safeLocation}.\n\nAtelier de Autor — By Katherine Carroll.`,
    };
}
