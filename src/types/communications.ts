// ==============================================================================
// ATELIER DIGITAL — CONTRATOS TYPESCRIPT: MÓDULO CENTRALIZADO DE COMUNICACIONES
// Archivo: src/types/communications.ts
// ==============================================================================

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

export type EmailVerificationStatus = 'untested' | 'verified' | 'failed';

/**
 * Vista segura de cuenta SMTP por propósito.
 * Nunca incluye contraseñas ni vault_secret_id (solo indicador booleano has_credential).
 */
export interface AtelierEmailAccount {
    id: string;
    purpose: EmailPurpose;
    display_name: string;
    from_email: string | null;
    reply_to_email: string | null;
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_user: string | null;
    has_credential: boolean;
    is_active: boolean;
    last_verified_at: string | null;
    last_verification_status: EmailVerificationStatus;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
}

export interface UpsertAtelierEmailAccountDTO {
    purpose: EmailPurpose;
    display_name: string;
    from_email: string | null;
    reply_to_email: string | null;
    smtp_host: string;
    smtp_port: number;
    smtp_secure: boolean;
    smtp_user: string | null;
    /** Campo write-only: si se omite o queda vacío, se conserva la credencial previa en Vault */
    smtp_password?: string;
    is_active: boolean;
}

export interface AtelierEmailLogItem {
    id: string;
    purpose: EmailPurpose;
    module_origin: EmailModuleOrigin;
    account_id: string | null;
    recipient_email: string;
    from_email: string;
    message_id: string | null;
    status: EmailLogStatus;
    smtp_response: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    bounced_at: string | null;
    error_code: string | null;
    error_description: string | null;
    created_at: string;
}

export interface EmailLogsFilter {
    purpose?: EmailPurpose | 'all';
    module_origin?: EmailModuleOrigin | 'all';
    status?: EmailLogStatus | 'all';
    date_from?: string;
    date_to?: string;
    limit?: number;
}

export interface EmailConnectionTestResult {
    ok: boolean;
    status: 'verified' | 'failed';
    reason: string;
    message: string;
    last_verified_at: string | null;
}

export interface EmailTestSendResult {
    ok: boolean;
    status: EmailLogStatus;
    log_id: string | null;
    message_id: string | null;
    recipient_email: string | null;
    reason: string;
    message: string;
}

// Contratos preparados para futura integración con M03 y M08 (sin alterar flujos actuales)
export interface CommercialQuoteEmailPreparationDTO {
    quoteId: string;
    quoteCode: string;
    recipientEmail: string;
    clientName: string;
    totalLabel: string;
    validUntilLabel?: string;
}

export interface AgendaReminderEmailPreparationDTO {
    appointmentId: string;
    recipientEmail: string;
    clientName: string;
    /** Proyección sanitizada M08 (creationDisplay) respetando privacidad de prendas */
    creationDisplay: string;
    scheduledDateLabel: string;
    locationLabel?: string;
}
