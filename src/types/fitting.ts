// ==============================================================================
// ATELIER DIGITAL — TIPOS: MÓDULO 06 — PRUEBAS, AJUSTES Y ENTREGA (FITTINGS)
// Archivo: src/types/fitting.ts
// ==============================================================================
// Contratos tipados para sesiones de prueba sobre cuerpo real, bitácora auditable
// de ajustes físicos sin borrado operativo, ceremonial de entrega final,
// evidencia multimedia y sincronización con creaciones de alta costura.
// ==============================================================================

import { CommercialMediaAsset } from './commercial';

// ==============================================================================
// 1. ENUMS Y VALORES CANÓNICOS DEL DOMINIO DE FITTING
// ==============================================================================

/**
 * Tipo de ronda o fase física de prueba en el taller.
 */
export const FITTING_ROUND_TYPES = [
    'toile_first',      // 1ª Prueba en glasilla / muselina
    'second_fitting',   // 2ª Prueba en tela definitiva / hilván avanzado
    'final_fitting',    // Prueba final / postura con calzado y acabados
    'alteration_check', // Revisión de transformación o restauración
    'extra_fitting',    // Prueba intermedia adicional
] as const;

export type FittingRoundType = (typeof FITTING_ROUND_TYPES)[number];

/**
 * Estado del ciclo de vida de la sesión física de prueba.
 */
export const FITTING_SESSION_STATUSES = [
    'scheduled',            // Programada / por realizar
    'completed',            // Realizada sin ajustes abiertos (pendiente dictamen)
    'adjustments_required', // Realizada con ajustes abiertos por atender
    'approved',             // Calce físico aprobado y sellado (ver approval_scope)
    'cancelled',            // Cita programada cancelada antes de realizarse (inmutable)
] as const;

export type FittingSessionStatus = (typeof FITTING_SESSION_STATUSES)[number];

/**
 * Alcance explícito de aprobación física de calce (F-10 / Hallazgo M06).
 * Diferencia rotundamente una aprobación intermedia de una lista para entrega.
 */
export const FITTING_APPROVAL_SCOPES = [
    'intermediate_round', // Glasilla o hilván conforme; continúan pruebas posteriores
    'final_for_delivery', // Calce final impecable; habilita el ceremonial de entrega
] as const;

export type FittingApprovalScope = (typeof FITTING_APPROVAL_SCOPES)[number];

/**
 * Dictamen general de aplomo, caída y postura sobre cuerpo real.
 */
export const FITTING_BALANCE_ASSESSMENTS = [
    'pending',             // Pendiente de evaluación
    'balanced',            // Aplomo y balance impecable
    'minor_tweaks',        // Ajustes menores estéticos o de holgura
    'structural_revision', // Revisión estructural de patrón o sisa
] as const;

export type FittingBalanceAssessment = (typeof FITTING_BALANCE_ASSESSMENTS)[number];

/**
 * Nivel de visibilidad para la clienta en el portal/expediente.
 */
export const FITTING_CLIENT_VISIBILITIES = [
    'internal_only', // Exclusivo de Katherine Carroll y el equipo de taller
    'summary_ready', // Resumen visible para la clienta en su expediente
] as const;

export type FittingClientVisibility = (typeof FITTING_CLIENT_VISIBILITIES)[number];

/**
 * Zonas anatómicas y estructurales de la prenda sujetas a ajuste (15 códigos).
 */
export const FITTING_ADJUSTMENT_ZONE_CODES = [
    'escote',
    'hombro',
    'sisa',
    'busto',
    'cintura',
    'cadera',
    'centro_delantero',
    'centro_espalda',
    'costado',
    'manga',
    'copa_manga',
    'largo',
    'ruedo',
    'forro_acabado',
    'otro',
] as const;

export type FittingAdjustmentZoneCode = (typeof FITTING_ADJUSTMENT_ZONE_CODES)[number];

/**
 * Naturaleza o técnica del ajuste en taller (10 tipos).
 */
export const FITTING_ADJUSTMENT_KINDS = [
    'hem',                  // Bastilla / largo final con calzado
    'silhouette_pin',       // Entalle o pinza marcada con alfileres en cuerpo real
    'shoulder_pad',         // Hombrera, inclinación u aplomo de hombro
    'neckline_contour',     // Asentado o escote en busto/espalda
    'armhole_sleeve',       // Desahogo de sisa o caída de manga
    'closure_fastening',    // Cremallera, corchetes, ojales, botonadura
    'lining_structure',     // Forrería, ballenas, entretela interna
    'drape_embroidery',     // Drapeado artesanal, encaje o pedrería
    'cad_repattern_needed', // Requiere nueva ejecución paramétrica en M02
    'other',
] as const;

export type FittingAdjustmentKind = (typeof FITTING_ADJUSTMENT_KINDS)[number];

/**
 * Severidad o criticidad del ajuste para la prenda.
 */
export const FITTING_ADJUSTMENT_SEVERITIES = [
    'minor',    // Ajuste menor (permite dispensa justificada)
    'normal',   // Ajuste estándar de confección (permite dispensa justificada)
    'critical', // Defecto estructural crítico (prohíbe dispensa en base de datos)
] as const;

export type FittingAdjustmentSeverity = (typeof FITTING_ADJUSTMENT_SEVERITIES)[number];

/**
 * Estado del ajuste físico en prenda (bitácora sin borrado operativo).
 */
export const FITTING_ADJUSTMENT_STATUSES = [
    'pending',   // Detectado en prueba; pendiente de intervención en taller
    'applied',   // Ejecutado en prenda por taller; pendiente de validar en cuerpo real
    'verified',  // Verificado conforme en prueba física (terminal inmutable)
    'waived',    // Dispensado explícitamente con motivo (solo minor/normal; terminal inmutable)
    'cancelled', // Descartado con motivo auditable por diseño/clienta (terminal inmutable)
] as const;

export type FittingAdjustmentStatus = (typeof FITTING_ADJUSTMENT_STATUSES)[number];

// ==============================================================================
// 2. CÓDIGOS DE ERROR Y CONSTANTES DE NEGOCIO M06
// ==============================================================================

/**
 * Códigos SQLSTATE y de aplicación específicos para el Módulo 06.
 * En particular, F-12 sustituye '40001' por 'PT409' para evitar el loop de reintentos
 * automáticos de PostgREST 14.18 que desencadenaba HTTP 504.
 */
export const M06_SQLSTATE_CODES = {
    CONCURRENCY_CONFLICT: 'PT409',     // PostgREST 14.18 mapea directo a HTTP 409
    IDEMPOTENCY_CONFLICT: '23505',     // Unique violation / colisión de payload divergente
    CHECK_VIOLATION: '23514',          // Regla de integridad de dominio violada
    FOREIGN_KEY_VIOLATION: '23503',    // Referencia inexistente o RLS invoker
    PERMISSION_DENIED: '42501',        // Permiso denegado por rol o histórico sellado
} as const;

export const M06_ERROR_NAMES = {
    CONCURRENCY_CONFLICT: 'M06_CONCURRENCY_CONFLICT',
    IDEMPOTENCY_CONFLICT: 'M06_IDEMPOTENCY_CONFLICT',
    RULE_VIOLATION: 'M06_RULE_VIOLATION',
    ACCESS_DENIED: 'M06_ACCESS_DENIED',
    UNKNOWN_ERROR: 'M06_UNKNOWN_ERROR',
} as const;

export interface FittingServiceErrorDetails {
    code: string;
    message: string;
    httpStatus?: number;
    hint?: string | null;
    details?: unknown;
}

// ==============================================================================
// 3. ESTRUCTURAS JSON ANIDADAS
// ==============================================================================

/**
 * Lista de verificación para el ceremonial de entrega de alta costura.
 */
export interface FittingDeliveryChecklist {
    calce_general?: boolean;
    ruedo_bastilla?: boolean;
    cremallera_botones?: boolean;
    limpieza_planchado?: boolean;
    accesorios_entregados?: boolean;
    empaque_perchas?: boolean;
    client_satisfaction_confirmed?: boolean;
    notes?: string | null;
    [key: string]: unknown;
}

/**
 * Recibo inmutable de eliminación de activo multimedia en sesión.
 * Permite la recuperación transparente de file_path y la idempotencia ante reintentos de red.
 */
export interface FittingMediaDeleteReceipt {
    asset_id: string;
    file_path: string;
    asset_type: string;
    deleted_at: string;
    deleted_by: string;
}

export type FittingMediaDeleteReceiptsMap = Record<string, FittingMediaDeleteReceipt>;

export type FittingStructuredMetadata = Record<string, unknown>;

// ==============================================================================
// 4. MODELOS DE ENTIDAD (BASE DE DATOS SUPABASE / POSTGRESQL)
// ==============================================================================

/**
 * Fila en la tabla public.atelier_fitting_sessions.
 */
export interface FittingSession {
    id: string;
    creation_id: string;
    project_id?: string | null;
    pattern_execution_id?: string | null;

    session_number: number;
    round_type: FittingRoundType;
    title: string;
    status: FittingSessionStatus;

    scheduled_at?: string | null;
    conducted_at?: string | null;
    location_note?: string | null;
    garment_state_note?: string | null;
    footwear_heel_cm?: number | null;

    balance_assessment: FittingBalanceAssessment;
    summary_notes?: string | null;
    client_feedback_notes?: string | null;
    requires_cad_revision: boolean;

    // Aprobación física de calce
    approval_scope?: FittingApprovalScope | null;
    fit_approved_at?: string | null;
    fit_approved_by?: string | null;
    fit_approved_by_name?: string | null;
    fit_approval_notes?: string | null;
    approval_idempotency_key?: string | null;

    // Cancelación auditada
    cancelled_at?: string | null;
    cancelled_by?: string | null;
    cancellation_reason?: string | null;

    // Ceremonial de entrega
    delivery_confirmed_at?: string | null;
    delivery_confirmed_by?: string | null;
    delivery_confirmed_by_name?: string | null;
    delivery_notes?: string | null;
    delivery_checklist: FittingDeliveryChecklist;
    delivery_idempotency_key?: string | null;
    delivery_intent_fingerprint?: string | null;

    // Control de concurrencia optimista, idempotencia y auditoría
    idempotency_key?: string | null;
    last_update_idempotency_key?: string | null;
    media_delete_receipts: FittingMediaDeleteReceiptsMap;
    row_version: number;
    client_visibility: FittingClientVisibility;
    structured_metadata: FittingStructuredMetadata;

    created_by: string;
    created_by_name?: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Fila en la tabla public.atelier_fitting_adjustments.
 */
export interface FittingAdjustment {
    id: string;
    creation_id: string;
    fitting_session_id: string;
    related_pattern_adjustment_id?: string | null;

    zone_code: FittingAdjustmentZoneCode;
    adjustment_kind: FittingAdjustmentKind;
    severity: FittingAdjustmentSeverity;
    requires_cad_update: boolean;

    description: string;
    delta_mm?: number | null;
    workshop_notes?: string | null;

    status: FittingAdjustmentStatus;

    // Trazabilidad de taller (aplicado)
    applied_at?: string | null;
    applied_by?: string | null;
    applied_by_name?: string | null;

    // Verificado en prueba física
    verified_at?: string | null;
    verified_by?: string | null;
    verified_by_name?: string | null;
    verified_in_session_id?: string | null;

    // Dispensa auditada
    waived_at?: string | null;
    waived_by?: string | null;
    waived_by_name?: string | null;
    waived_in_session_id?: string | null;
    waiver_reason?: string | null;

    // Descarte o cancelación auditada
    cancelled_at?: string | null;
    cancelled_by?: string | null;
    cancellation_reason?: string | null;

    // Control de concurrencia e idempotencia
    idempotency_key?: string | null;
    resolution_idempotency_key?: string | null;
    row_version: number;

    created_by: string;
    created_by_name?: string | null;
    created_at: string;
    updated_at: string;
}

// ==============================================================================
// 5. MODELOS COMPUESTOS Y VISTAS DE TALLER
// ==============================================================================

/**
 * Sesión enriquecida con sus ajustes, fotografías privadas y recibos firmados.
 */
export interface FittingSessionWithRelations extends FittingSession {
    adjustments: FittingAdjustment[];
    mediaAssets: CommercialMediaAsset[];
    signedMediaUrls?: Record<string, string | null>;
}

/**
 * Elemento de la bandeja transversal de pruebas y entregas para el taller.
 */
export interface FittingQueueItem {
    creationId: string;
    creationName: string;
    creationStatus: string;
    clientId: string;
    clientName: string;
    projectId?: string | null;
    latestSessionId?: string | null;
    latestSessionNumber?: number | null;
    latestRoundType?: FittingRoundType | null;
    latestSessionStatus?: FittingSessionStatus | null;
    scheduledAt?: string | null;
    openAdjustmentsCount: number;
    criticalAdjustmentsCount: number;
    requiresCadRevision: boolean;
    isReadyForDelivery: boolean;
    isDelivered: boolean;
    deliveryConfirmedAt?: string | null;
}

/**
 * Filtros para la bandeja transversal del taller.
 */
export interface FittingDesignerQueueFilter {
    creationId?: string;
    clientId?: string;
    status?: FittingSessionStatus | 'all';
    requiresCadRevision?: boolean;
    onlyOpenAdjustments?: boolean;
    onlyReadyForDelivery?: boolean;
    searchQuery?: string;
}

// ==============================================================================
// 6. DTOs DE ENTRADA ESTRICTOS PARA LAS 8 RPCs TRANSACCIONALES
// ==============================================================================

/**
 * DTO para create_fitting_session_m06.
 */
export interface CreateFittingSessionDTO {
    creationId: string;
    idempotencyKey: string;
    roundType?: FittingRoundType;
    title?: string | null;
    projectId?: string | null;
    patternExecutionId?: string | null;
    scheduledAt?: string | null;
    conductedAt?: string | null;
    locationNote?: string | null;
    garmentStateNote?: string | null;
    footwearHeelCm?: number | null;
    balanceAssessment?: FittingBalanceAssessment;
    summaryNotes?: string | null;
    clientFeedbackNotes?: string | null;
    requiresCadRevision?: boolean;
    initialStatus?: 'scheduled' | 'completed' | 'adjustments_required';
}

/**
 * DTO para update_fitting_session_m06.
 * Exige estrictamente expectedRowVersion e idempotencyKey.
 */
export interface UpdateFittingSessionDTO {
    sessionId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    title?: string | null;
    status?: 'scheduled' | 'completed' | 'adjustments_required' | 'cancelled' | null;
    scheduledAt?: string | null;
    conductedAt?: string | null;
    locationNote?: string | null;
    garmentStateNote?: string | null;
    footwearHeelCm?: number | null;
    balanceAssessment?: FittingBalanceAssessment | null;
    summaryNotes?: string | null;
    clientFeedbackNotes?: string | null;
    requiresCadRevision?: boolean | null;
    cancellationReason?: string | null;
}

/**
 * DTO para add_fitting_adjustment_m06.
 * Exige estrictamente expectedSessionRowVersion e idempotencyKey.
 */
export interface CreateFittingAdjustmentDTO {
    fittingSessionId: string;
    expectedSessionRowVersion: number;
    idempotencyKey: string;
    zoneCode: FittingAdjustmentZoneCode;
    adjustmentKind: FittingAdjustmentKind;
    description: string;
    severity?: FittingAdjustmentSeverity;
    requiresCadUpdate?: boolean;
    deltaMm?: number | null;
    workshopNotes?: string | null;
    relatedPatternAdjustmentId?: string | null;
}

/**
 * DTO para resolve_fitting_adjustment_m06.
 * Exige estrictamente expectedRowVersion e idempotencyKey.
 */
export interface ResolveFittingAdjustmentDTO {
    adjustmentId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    targetStatus: 'applied' | 'verified' | 'waived' | 'cancelled';
    workshopNotes?: string | null;
    reason?: string | null;
    resolutionSessionId?: string | null;
}

/**
 * DTO para approve_fitting_session_m06.
 * Exige estrictamente expectedRowVersion, idempotencyKey y approvalScope.
 */
export interface ApproveFittingSessionDTO {
    sessionId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    approvalScope: FittingApprovalScope;
    approvalNotes?: string | null;
}

/**
 * DTO para el activo opcional adjunto en la confirmación de entrega (acta/recibo).
 */
export interface DeliveryNoteAssetPayload {
    filePath: string;
    fileName: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    idempotencyKey?: string | null;
}

/**
 * DTO para confirm_creation_delivery_m06.
 * Exige estrictamente expectedRowVersion e idempotencyKey.
 */
export interface ConfirmDeliveryDTO {
    sessionId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    deliveryNotes?: string | null;
    deliveryChecklist?: FittingDeliveryChecklist;
    localDate?: string | null; // Formato YYYY-MM-DD
    deliveryNoteAsset?: DeliveryNoteAssetPayload | null;
}

/**
 * DTO para register_fitting_media_asset_m06.
 * Exige estrictamente expectedSessionRowVersion e idempotencyKey.
 */
export interface RegisterFittingMediaDTO {
    sessionId: string;
    expectedSessionRowVersion: number;
    idempotencyKey: string;
    assetType: 'fitting_photo' | 'delivery_note';
    filePath: string;
    fileName: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    description?: string | null;
}

/**
 * DTO para delete_fitting_media_asset_m06.
 * Exige estrictamente assetId, sessionId, expectedSessionRowVersion e idempotencyKey.
 */
export interface DeleteFittingMediaDTO {
    assetId: string;
    sessionId: string;
    expectedSessionRowVersion: number;
    idempotencyKey: string;
}

// ==============================================================================
// 7. RESPUESTAS JSON RETORNADAS POR LAS 8 RPCs TRANSACCIONALES
// ==============================================================================

export interface CreateFittingSessionRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    session: FittingSession;
}

export interface UpdateFittingSessionRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    session: FittingSession;
}

export interface AddFittingAdjustmentRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    adjustment: FittingAdjustment;
    session: FittingSession;
}

export interface ResolveFittingAdjustmentRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    adjustment: FittingAdjustment;
    session: FittingSession;
}

export interface ApproveFittingSessionRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    session: FittingSession;
}

export interface ConfirmCreationDeliveryRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    session: FittingSession;
}

export interface RegisterFittingMediaRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    asset: CommercialMediaAsset;
}

export interface DeleteFittingMediaRpcResult {
    success: boolean;
    idempotent_replay: boolean;
    deleted_asset_id: string;
    file_path: string;
    session: FittingSession;
}

// ==============================================================================
// 8. FUNCIONES HELPER DE VALIDACIÓN EN RUNTIME
// ==============================================================================

export function isFittingRoundType(value: unknown): value is FittingRoundType {
    return typeof value === 'string' && (FITTING_ROUND_TYPES as readonly string[]).includes(value);
}

export function isFittingSessionStatus(value: unknown): value is FittingSessionStatus {
    return typeof value === 'string' && (FITTING_SESSION_STATUSES as readonly string[]).includes(value);
}

export function isFittingApprovalScope(value: unknown): value is FittingApprovalScope {
    return typeof value === 'string' && (FITTING_APPROVAL_SCOPES as readonly string[]).includes(value);
}

export function isFittingAdjustmentZoneCode(value: unknown): value is FittingAdjustmentZoneCode {
    return typeof value === 'string' && (FITTING_ADJUSTMENT_ZONE_CODES as readonly string[]).includes(value);
}

export function isFittingAdjustmentKind(value: unknown): value is FittingAdjustmentKind {
    return typeof value === 'string' && (FITTING_ADJUSTMENT_KINDS as readonly string[]).includes(value);
}

export function isFittingAdjustmentSeverity(value: unknown): value is FittingAdjustmentSeverity {
    return typeof value === 'string' && (FITTING_ADJUSTMENT_SEVERITIES as readonly string[]).includes(value);
}

export function isFittingAdjustmentStatus(value: unknown): value is FittingAdjustmentStatus {
    return typeof value === 'string' && (FITTING_ADJUSTMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Normaliza y congela de manera determinista un checklist de entrega para asegurar
 * coherencia en comparaciones y cálculo de huellas de intención.
 */
export function normalizeFittingDeliveryChecklist(
    checklist?: FittingDeliveryChecklist | null
): FittingDeliveryChecklist {
    if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist)) {
        return {};
    }
    const normalized: Record<string, unknown> = {};
    const sortedKeys = Object.keys(checklist).sort();
    for (const key of sortedKeys) {
        const val = checklist[key];
        if (val !== undefined) {
            normalized[key] = val;
        }
    }
    return normalized as FittingDeliveryChecklist;
}

