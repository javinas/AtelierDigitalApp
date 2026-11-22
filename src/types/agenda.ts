// ==============================================================================
// ATELIER DIGITAL — TIPOS: MÓDULO 08 — AGENDA DEL ATELIER
// Archivo: src/types/agenda.ts
// ==============================================================================

export const APPOINTMENT_TYPES = [
    'consultation',
    'measurement_session',
    'design_presentation',
    'toile_fitting',
    'garment_fitting',
    'final_fitting',
    'delivery_ceremony',
    'pickup_return',
    'alteration_review',
    'supplier_meeting',
    'group_campaign',
    'internal_activity',
    'other',
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = [
    'scheduled',
    'confirmed',
    'rescheduled',
    'completed',
    'cancelled',
    'no_show',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const ATELIER_LOCATION_SPACES = [
    'probador_principal',
    'salon_privado',
    'mesa_corte_taller',
    'taller_general',
    'visita_externa',
    'virtual',
] as const;

export type AtelierLocationSpace = (typeof ATELIER_LOCATION_SPACES)[number];

export const AGENDA_SOURCE_KINDS = [
    'm08_appointment',
    'm06_fitting_session',
    'm03_delivery_milestone',
    'm02_measurement_campaign',
] as const;

export type AgendaSourceKind = (typeof AGENDA_SOURCE_KINDS)[number];

export const CLIENT_VISIBILITY_MODES = ['internal_only', 'client_visible'] as const;

export type ClientVisibilityMode = (typeof CLIENT_VISIBILITY_MODES)[number];

export type AgendaViewMode = 'day' | 'week' | 'month';

export const M08_SQLSTATE_CODES = {
    CONCURRENCY_CONFLICT: 'PT409',
    OVERLAP_CONFLICT: '23P01',
    UNAUTHORIZED: '42501',
    CHECK_VIOLATION: '23514',
    FK_VIOLATION: '23503',
    UNIQUE_VIOLATION: '23505',
} as const;

export const M08_ERROR_NAMES = {
    CONCURRENCY_CONFLICT: 'M08_CONCURRENCY_CONFLICT',
    OVERLAP_CONFLICT: 'M08_OVERLAP_CONFLICT',
    UNAUTHORIZED: 'M08_UNAUTHORIZED',
    VALIDATION_ERROR: 'M08_VALIDATION_ERROR',
    NOT_FOUND: 'M08_NOT_FOUND',
    UNKNOWN_ERROR: 'M08_UNKNOWN_ERROR',
} as const;

export interface AtelierAppointment {
    id: string;
    client_id: string | null;
    person_id: string | null;
    creation_id: string | null;
    fitting_session_id: string | null;
    campaign_id: string | null;
    supplier_id: string | null;
    appointment_type: AppointmentType;
    status: AppointmentStatus;
    title: string;
    starts_at: string;
    ends_at: string;
    location_space: AtelierLocationSpace;
    assigned_staff: string | null;
    preparation_notes: string | null;
    outcome_notes: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
    cancelled_by_name: string | null;
    cancellation_reason: string | null;
    client_visibility: ClientVisibilityMode;
    idempotency_key: string | null;
    last_update_idempotency_key: string | null;
    row_version: number;
    created_by: string;
    created_by_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface UnifiedAgendaItem {
    agenda_item_id: string;
    source_kind: AgendaSourceKind;
    source_id: string;
    appointment_id: string | null;
    row_version: number;
    is_editable: boolean;
    title: string;
    appointment_type: AppointmentType;
    status: AppointmentStatus;
    starts_at: string;
    ends_at: string;
    bogota_date: string;
    bogota_start_time: string;
    bogota_end_time: string;
    location_space: AtelierLocationSpace;
    location_label_override: string | null;
    client_id: string | null;
    client_name: string | null;
    client_phone: string | null;
    person_id: string | null;
    person_name: string | null;
    creation_id: string | null;
    creation_name: string | null;
    fitting_session_id: string | null;
    campaign_id: string | null;
    supplier_id: string | null;
    supplier_name: string | null;
    assigned_staff: string | null;
    preparation_notes: string | null;
    outcome_notes: string | null;
    cancellation_reason: string | null;
    client_visibility: ClientVisibilityMode;
    completed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
}

export interface FetchAtelierAgendaResult {
    timezone: string;
    generated_at: string;
    today_bogota: string;
    items: UnifiedAgendaItem[];
}

export interface AgendaOverviewSummary {
    todayCount: number;
    weekFittingsCount: number;
    upcomingDeliveriesCount: number;
    pendingConfirmationCount: number;
    todayItems: UnifiedAgendaItem[];
    upcomingItems: UnifiedAgendaItem[];
}

export interface ScheduleAppointmentDTO {
    title: string;
    startsAt: string;
    endsAt: string;
    appointmentType: AppointmentType;
    locationSpace: AtelierLocationSpace;
    clientId?: string | null;
    personId?: string | null;
    creationId?: string | null;
    fittingSessionId?: string | null;
    campaignId?: string | null;
    supplierId?: string | null;
    assignedStaff?: string | null;
    preparationNotes?: string | null;
    clientVisibility?: ClientVisibilityMode;
    initialStatus?: 'scheduled' | 'confirmed';
    idempotencyKey?: string;
}

export interface UpdateAppointmentDTO {
    appointmentId: string;
    expectedRowVersion: number;
    idempotencyKey?: string;
    title?: string;
    appointmentType?: AppointmentType;
    status?: Exclude<AppointmentStatus, 'cancelled'>;
    startsAt?: string;
    endsAt?: string;
    locationSpace?: AtelierLocationSpace;
    assignedStaff?: string | null;
    preparationNotes?: string | null;
    outcomeNotes?: string | null;
    clientVisibility?: ClientVisibilityMode;
    clearCreation?: boolean;
    creationId?: string | null;
    clearClient?: boolean;
    clientId?: string | null;
    supplierId?: string | null;
}

export interface CancelAppointmentDTO {
    appointmentId: string;
    expectedRowVersion: number;
    cancellationReason: string;
    idempotencyKey?: string;
}

export interface AgendaMutationRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    appointment: AtelierAppointment;
}

export interface AgendaServiceErrorDetails {
    code: string;
    message: string;
    httpStatus?: number;
    hint?: string | null;
}

export type AgendaExportPeriodMode = 'day' | 'week' | 'month' | 'custom';

export type AgendaPrivacyLevel = 'protected_external' | 'full_internal';

export interface AgendaExportDateRange {
    fromDate: string;
    toDate: string;
    label: string;
}

export interface AgendaExportFilterSummary {
    respectActiveFilters: boolean;
    sourceLabel?: string;
    quickLabel?: string;
    spaceLabel?: string;
    searchQuery?: string;
    includeCancelled: boolean;
}

export interface AgendaExportPreparedDataset {
    periodMode: AgendaExportPeriodMode;
    range: AgendaExportDateRange;
    privacyLevel: AgendaPrivacyLevel;
    generatedAtBogota: string;
    totalBeforeDedup: number;
    duplicatesRemoved: number;
    items: UnifiedAgendaItem[];
    filterSummary: AgendaExportFilterSummary;
}

export interface ExternalCalendarConnectorDescriptor {
    provider: 'google' | 'outlook' | 'apple';
    label: string;
    status: 'not_configured';
    badgeText: string;
    detailText: string;
}
