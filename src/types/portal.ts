// ==============================================================================
// ATELIER DIGITAL — CONTRATOS DE TIPOS: PORTAL DE CLIENTAS (M09)
// Archivo: src/types/portal.ts
// ==============================================================================
// Cimentación TypeScript alineada con M09-A v2.10 (Canónica Definitiva)
// Principio rector: Gobernanza Zero Trust (DEFAULT false en todos los interruptores).
// ==============================================================================

import { FittingRoundType, FittingSessionStatus } from './fitting';

export type PortalAccessStatus = 'invited' | 'active' | 'suspended' | 'revoked';

export type PortalInvitationStatus =
    | 'pending'
    | 'processing'
    | 'accepted'
    | 'expired'
    | 'revoked'
    | 'failed';

export type PortalActivityCategory = 'business' | 'telemetry';

export type PortalActivityOrigin = 'system' | 'client';

/**
 * Recursos canónicos permitidos por el constraint CHECK de public.client_portal_permissions (M09-A v2.10).
 */
export const PORTAL_RESOURCES = [
    'creations',
    'sketches',
    'fabrics',
    'fittings',
    'quotations',
    'measurements',
    'appointments',
    'messaging',
    '3d_viewer',
] as const;

export type PortalResource = (typeof PORTAL_RESOURCES)[number];

/**
 * Acciones canónicas permitidas por el constraint CHECK de public.client_portal_permissions (M09-A v2.10).
 */
export const PORTAL_ACTIONS = ['view', 'approve', 'observe', 'download'] as const;

export type PortalAction = (typeof PORTAL_ACTIONS)[number];

/**
 * Control global de identidad y ciclo de vida del Portal de Clienta (public.client_portal_access).
 * Alineado 1:1 con las 8 columnas canónicas de M09-A v2.10 (sin columnas de permisos heredadas).
 */
export interface ClientPortalAccess {
    id: string;
    client_id: string;
    auth_user_id: string | null;
    status: PortalAccessStatus;
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Registro de invitación criptográfica de un solo uso (client_portal_invitations).
 * Gobernado por protocolo Saga no destructivo con lease temporal de 15 minutos.
 */
export interface ClientPortalInvitation {
    id: string;
    client_id: string;
    email: string;
    token_hash: string;
    expires_at: string;
    used_at: string | null;
    status: PortalInvitationStatus;
    failure_reason?: string | null;
    invited_by: string;
    lease_until: string | null;
    operation_id: string | null;
    created_at: string;
}

/**
 * Única Fuente de Verdad de permisos normalizados (public.client_portal_permissions · M09-A v2.10).
 * Soporta filas globales (creation_id = null) y específicas por creación (creation_id != null).
 */
export interface ClientPortalPermission {
    id: string;
    portal_access_id: string;
    creation_id: string | null;
    resource: PortalResource;
    action: PortalAction;
    is_granted: boolean;
    granted_by: string;
    granted_at: string;
    updated_at: string;
}

/**
 * Registro inmutable de actividad y negocio del portal (public.client_portal_activity_log).
 * Alineado con el esquema canónico M09-A v2.10.
 */
export interface ClientPortalActivityLog {
    id: string;
    portal_access_id: string | null;
    client_id: string;
    auth_user_id: string | null;
    category: PortalActivityCategory;
    origin: PortalActivityOrigin;
    event_type: string;
    metadata: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

/**
 * DTO canónico para actualizar exclusivamente el estado del acceso en public.client_portal_access.
 */
export interface UpdatePortalAccessStatusDTO {
    status: PortalAccessStatus;
    updatedBy: string;
}

/**
 * DTO para mutar un permiso canónico en public.client_portal_permissions.
 */
export interface SetPortalPermissionDTO {
    portalAccessId: string;
    clientId: string;
    creationId: string | null;
    resource: PortalResource;
    action: PortalAction;
    isGranted: boolean;
    grantedBy: string;
}

export type PortalPermissionMutationOutcome =
    | 'updated'
    | 'inserted'
    | 'deleted'
    | 'forbidden_global_creations_view'
    | 'forbidden_global_creation_resource'
    | 'invalid_resource_or_action'
    | 'unauthorized_actor'
    | 'integrity_violation'
    | 'backend_unavailable'
    | 'error';

export interface PortalPermissionMutationResult {
    ok: boolean;
    outcome: PortalPermissionMutationOutcome;
    permission: ClientPortalPermission | null;
    permissions: ClientPortalPermission[];
    message: string;
    environment: PortalEnvironmentMode;
    errorCode?: string | null;
}

export interface PortalBatchRevokeResult {
    ok: boolean;
    outcome:
        | 'revoked'
        | 'unauthorized_actor'
        | 'integrity_violation'
        | 'backend_unavailable'
        | 'error';
    revokedCount: number;
    permissions: ClientPortalPermission[];
    /** Verdadero cuando la mutación sobre client_portal_permissions usó una sola sentencia DELETE filtrada */
    singleStatementOnPermissionsTable: boolean;
    /** Verdadero mientras M09-A v2.10 no provea RPC transaccional multi-tabla permiso+auditoría */
    crossTableAuditTransactionPendingBackend: boolean;
    message: string;
    environment: PortalEnvironmentMode;
    errorCode?: string | null;
}

/**
 * Proyección derivada solo en memoria (jamás persistida) para una creación específica.
 */
export interface PortalCreationPermissionsProjection {
    creationId: string;
    canViewCreation: boolean;
    canViewSketches: boolean;
    canApproveSketches: boolean;
    canViewFabrics: boolean;
    canViewFittings: boolean;
    canViewQuotations: boolean;
    canSendObservations: boolean;
}

/**
 * Proyección agregada derivada únicamente de public.client_portal_permissions y public.client_portal_access.
 */
export interface PortalPermissionsProjection {
    isAccessActive: boolean;
    globalModules: {
        measurementsView: boolean;
        appointmentsView: boolean;
        quotationsView: boolean;
        sketchesApprove: boolean;
        messagingObserve: boolean;
    };
    creationModules: {
        hasAnyVisibleCreation: boolean;
        visibleCreationIds: string[];
        hasAnyVisibleFittings: boolean;
        fittingsCreationIds: string[];
    };
    hasAnyAuthorizedModule: boolean;
    byCreationId: Record<string, PortalCreationPermissionsProjection>;
}

/**
 * DTO para generación de una nueva invitación criptográfica.
 */
export interface CreatePortalInvitationDTO {
    clientId: string;
    email: string;
    expiresInHours?: number;
}

/**
 * Estado agregado del Portal de una Clienta para renderizado en el Centro de Control.
 */
export interface ClientPortalSummary {
    access: ClientPortalAccess | null;
    latestInvitation: ClientPortalInvitation | null;
    activeCreationsCount: number;
    visibleCreationsCount: number;
    auditEventsCount: number;
}

// ==============================================================================
// CONTRATOS M09-B.4: ACEPTACIÓN SEGURA DE INVITACIONES (/portal/invite)
// ==============================================================================

export type PortalEnvironmentMode = 'production' | 'demo_unavailable';

export type PortalInvitationFlowOutcome =
    | 'missing_token'
    | 'invalid'
    | 'valid'
    | 'expired'
    | 'revoked'
    | 'reused'
    | 'failed'
    | 'processing_locked'
    | 'reconciliation_pending'
    | 'privileged_role_blocked'
    | 'email_mismatch'
    | 'already_accepted_self'
    | 'accepted'
    | 'backend_unavailable'
    | 'server_error';

export interface PortalInvitationVerifyResult {
    outcome: PortalInvitationFlowOutcome;
    environment: PortalEnvironmentMode;
    canAccept: boolean;
    message: string;
    technicalDetail?: string | null;
    tokenFormatValid: boolean;
    maskedEmail?: string | null;
    invitedEmail?: string | null;
    clientDisplayName?: string | null;
    expiresAt?: string | null;
    accountHint?: 'existing_account' | 'new_account' | 'either';
    httpStatus?: number | null;
    retryAfterSeconds?: number | null;
}

export interface AcceptPortalInvitationDTO {
    token: string;
    operationId: string;
    password?: string;
    consents?: {
        ageConfirmed: boolean;
        termsAccepted: boolean;
        privacyAccepted: boolean;
        termsVersion: string;
        privacyVersion: string;
    };
    sessionUser?: {
        id: string;
        email?: string | null;
    } | null;
    profileRole?: string | null;
    appMetadataRole?: string | null;
    expectedInvitedEmail?: string | null;
}

export interface PortalInvitationAcceptResult {
    outcome: PortalInvitationFlowOutcome;
    environment: PortalEnvironmentMode;
    accepted: boolean;
    idempotentReplay: boolean;
    operationId: string;
    message: string;
    technicalDetail?: string | null;
    accessId?: string | null;
    authUserId?: string | null;
    httpStatus?: number | null;
    retryAfterSeconds?: number | null;
    requiresSignIn?: boolean;
}

export interface PortalIdentityGuardResult {
    allowed: boolean;
    outcome: 'ok' | 'privileged_role_blocked' | 'email_mismatch';
    message: string;
}

export interface IssuePortalInvitationDTO {
    clientId: string;
    clientEmail: string;
    invitedBy: string;
    expiresInHours?: number;
    baseUrl?: string;
}

export type PortalInvitationMutationOutcome =
    | 'issued'
    | 'revoked'
    | 'reissued'
    | 'already_finalized'
    | 'invalid_email'
    | 'unauthorized_actor'
    | 'backend_unavailable'
    | 'conflict'
    | 'error';

export interface IssuePortalInvitationResult {
    ok: boolean;
    outcome: PortalInvitationMutationOutcome;
    invitation: ClientPortalInvitation | null;
    portalAccess: ClientPortalAccess | null;
    /** Token en claro entregado en memoria una única vez; jamás persistido en BD ni storage */
    oneTimeToken: string | null;
    /** Enlace único /portal/invite?token=... para entrega asistida por la diseñadora */
    oneTimeInviteUrl: string | null;
    /** Indica dependencia pendiente de Edge Function para envío automático de correo */
    emailDeliveryPendingBackend: boolean;
    message: string;
    environment: PortalEnvironmentMode;
    errorCode?: string | null;
}

export interface RevokePortalInvitationResult {
    ok: boolean;
    outcome: PortalInvitationMutationOutcome;
    invitation: ClientPortalInvitation | null;
    message: string;
    environment: PortalEnvironmentMode;
    errorCode?: string | null;
}

export interface ReissuePortalInvitationResult extends IssuePortalInvitationResult {
    revokedPreviousInvitationId: string | null;
}

export type PortalEmailDispatchStatus =
    | 'sent'
    | 'simulated_disabled'
    | 'deduplicated'
    | 'failed'
    | 'backend_unavailable';

export interface DispatchPortalInvitationEmailDTO {
    invitationId: string;
    token: string;
    inviteUrl: string;
    recipientName?: string;
    customMessage?: string;
    permissionsBullets?: readonly string[];
}

export interface PortalInvitationEmailDispatchResult {
    ok: boolean;
    status: PortalEmailDispatchStatus;
    sent: boolean;
    simulated: boolean;
    deduplicated: boolean;
    invitationPreserved: boolean;
    messageId: string | null;
    code: string;
    message: string;
    httpStatus?: number | null;
}

export interface PortalOperatingModeSnapshot {
    isDemoMode: boolean;
    postgrestDemoMode: boolean;
    edgeFunctionUnavailable: boolean;
    supabaseError: string | null;
    edgeFunctionError: string | null;
    emailDeliveryPendingBackend: boolean;
}

// ==============================================================================
// CONTRATOS M09-B.7: LECTURA SEGURA SOBRE LAS 6 VISTAS CANÓNICAS M09-A v2.10
// ==============================================================================

/**
 * Nombres exactos de las vistas canónicas SECURITY BARRIER del Portal del Cliente
 * (6 vistas base M09-A v2.10 + vista aditiva P1.2 de progreso de confección M03).
 */
export const PORTAL_CANONICAL_VIEWS = {
    clientProfile: 'v_portal_client_profile',
    creations: 'v_portal_creations',
    measurementSessions: 'v_portal_measurement_sessions',
    commercialQuotes: 'v_portal_commercial_quotes',
    appointments: 'v_portal_appointments',
    fittingSessions: 'v_portal_fitting_sessions',
    creationProgress: 'v_portal_creation_progress',
} as const;

export type PortalCanonicalViewKey = keyof typeof PORTAL_CANONICAL_VIEWS;

/**
 * Eventos exactos permitidos por la lista blanca de public.log_portal_event(p_event_type, p_metadata).
 */
export const PORTAL_TELEMETRY_EVENTS = [
    'view_portal_home',
    'view_creation',
    'view_sketches',
    'view_quotation',
    'view_appointment',
    'view_measurements',
    'view_fittings',
    'auth_logout',
] as const;

export type PortalTelemetryEventType = (typeof PORTAL_TELEMETRY_EVENTS)[number];

/**
 * Proyección exacta de public.v_portal_client_profile (M09-A v2.10).
 * Excluye explícitamente internal_notes y cualquier metadato privado del taller.
 */
export interface PortalClientProfileView {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    style_preferences: string | null;
    photo_url: string | null;
    status: string;
}

/**
 * Proyección exacta de public.v_portal_creations (M09-A v2.10).
 */
export interface PortalCreationView {
    id: string;
    name: string;
    description: string | null;
    creation_type: string | null;
    status: string;
    occasion: string | null;
    garment_type: string | null;
    target_date: string | null;
    created_at: string;
    can_view_sketches: boolean;
    can_approve_sketches: boolean;
    can_view_fabrics: boolean;
    can_view_fittings: boolean;
    can_view_budget: boolean;
    can_send_observations: boolean;
}

/**
 * Proyección exacta de public.v_portal_measurement_sessions (M09-A v2.10).
 * Expone exclusivamente metadatos de sesiones completadas o verificadas (sin medidas anatómicas individuales).
 */
export interface PortalMeasurementSessionView {
    id: string;
    session_date: string;
    status: 'completed' | 'verified' | string;
    unit_system: string | null;
    version_number: number | null;
}

/**
 * Proyección exacta de public.v_portal_commercial_quotes (M09-A v2.10).
 */
export interface PortalCommercialQuoteView {
    id: string;
    creation_id: string | null;
    quote_number: string;
    currency: string;
    total_amount: number;
    payment_schedule: Record<string, unknown> | unknown[] | string | null;
    valid_until: string | null;
    status: string;
    approved_at: string | null;
}

/**
 * Proyección exacta de public.v_portal_appointments (M09-A v2.10).
 */
export interface PortalAppointmentView {
    id: string;
    appointment_type: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
    location_space: string | null;
    preparation_notes: string | null;
}

/**
 * Proyección exacta de public.v_portal_fitting_sessions (M09-A v2.10).
 */
export interface PortalFittingSessionView {
    id: string;
    creation_id: string;
    session_number: number;
    round_type: FittingRoundType | null;
    title: string | null;
    status: FittingSessionStatus;
    scheduled_at: string | null;
    conducted_at: string | null;
    location_note: string | null;
}

export type PortalViewReadStatus =
    | 'ok'
    | 'inactive_access'
    | 'unauthorized'
    | 'backend_unavailable'
    | 'error';

export interface PortalViewReadResult<T> {
    ok: boolean;
    status: PortalViewReadStatus;
    data: T;
    environment: PortalEnvironmentMode;
    errorCode?: string | null;
    errorMessage?: string | null;
}

export interface ClientPortalDashboardData {
    access: ClientPortalAccess | null;
    clientId: string | null;
    permissions: ClientPortalPermission[];
    projection: PortalPermissionsProjection;
    profile: PortalClientProfileView | null;
    creations: PortalCreationView[];
    measurementSessions: PortalMeasurementSessionView[];
    commercialQuotes: PortalCommercialQuoteView[];
    appointments: PortalAppointmentView[];
    fittingSessions: PortalFittingSessionView[];
    status: PortalViewReadStatus;
    isDemoMode: boolean;
    environment: PortalEnvironmentMode;
    errorCode: string | null;
    supabaseError: string | null;
    viewErrors: Partial<
        Record<PortalCanonicalViewKey, { status: PortalViewReadStatus; code: string | null }>
    >;
}

export type PortalTelemetryOutcome =
    | 'logged'
    | 'invalid_event'
    | 'metadata_too_large'
    | 'unauthorized_or_inactive'
    | 'backend_unavailable'
    | 'error';

export interface PortalTelemetryLogResult {
    ok: boolean;
    outcome: PortalTelemetryOutcome;
    environment: PortalEnvironmentMode;
    eventType: string;
    errorCode?: string | null;
    message: string;
}

// ==============================================================================
// CONTRATOS M09 P1.1 / P1.2: BASE RESPONSIVE Y PROYECCIÓN DE AVANCE M03
// ==============================================================================
// Nota P1.2: La migración aditiva v_portal_creation_progress y su lector en
// portalService.ts están preparados localmente, pendientes de validación controlada.
// ==============================================================================

export type PortalResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop';

export interface PortalResponsiveMetrics {
    width: number;
    height: number;
    breakpoint: PortalResponsiveBreakpoint;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    contentMaxWidth: number;
    horizontalPadding: number;
    cardPadding: number;
    gridColumns: 1 | 2 | 3;
}

export type PortalM03CanonicalStage =
    | 'planning'
    | 'cutting'
    | 'assembly'
    | 'first_fitting'
    | 'adjustments'
    | 'second_fitting'
    | 'finishing'
    | 'delivered';

export interface PortalM03StageMetadata {
    step: number;
    key: PortalM03CanonicalStage;
    label: string;
    shortLabel: string;
    editorialDescription: string;
}

/**
 * Contrato proyectado (whitelist de 7 columnas seguras) para el seguimiento
 * de confección M03 desde la futura vista aditiva v_portal_creation_progress (P1.2).
 * Excluye explícitamente assigned_tailor, priority, notes y quote_id.
 */
export interface PortalCreationProgressView {
    id: string;
    creation_id: string;
    project_number: string;
    current_stage: string;
    estimated_delivery_date: string | null;
    actual_delivery_date: string | null;
    updated_at: string;
}
