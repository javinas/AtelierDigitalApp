// ==============================================================================
// ATELIER DIGITAL — SERVICIO: MÓDULO 06 — PRUEBAS, AJUSTES Y ENTREGA (FITTINGS)
// Archivo: src/services/fittingService.ts
// ==============================================================================
// Capa de servicio para las 8 RPCs transaccionales atómicas de alta costura,
// consultas enriquecidas de sesiones y ajustes, gestión multimedia con
// compensación segura en Storage y ceremonial de entrega final.
// ==============================================================================

import { supabase } from '../supabase';
import {
    CommercialMediaAsset,
    CommercialStorageScope,
} from '../types/commercial';
import {
    AddFittingAdjustmentRpcResult,
    ApproveFittingSessionDTO,
    ApproveFittingSessionRpcResult,
    ConfirmCreationDeliveryRpcResult,
    ConfirmDeliveryDTO,
    CreateFittingAdjustmentDTO,
    CreateFittingSessionDTO,
    CreateFittingSessionRpcResult,
    DeleteFittingMediaDTO,
    DeleteFittingMediaRpcResult,
    FittingAdjustment,
    FittingDesignerQueueFilter,
    FittingQueueItem,
    FittingRoundType,
    FittingServiceErrorDetails,
    FittingSession,
    FittingSessionStatus,
    FittingSessionWithRelations,
    M06_ERROR_NAMES,
    M06_SQLSTATE_CODES,
    RegisterFittingMediaDTO,
    RegisterFittingMediaRpcResult,
    ResolveFittingAdjustmentDTO,
    ResolveFittingAdjustmentRpcResult,
    UpdateFittingSessionDTO,
    UpdateFittingSessionRpcResult,
    normalizeFittingDeliveryChecklist,
} from '../types/fitting';
import {
    createCommercialAssetSignedUrl,
    createCommercialAssetSignedUrls,
    removeCommercialAsset,
    uploadCommercialAsset,
} from './commercialService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): boolean {
    return Boolean(value && UUID_REGEX.test(value));
}

/**
 * Obtiene la fecha local en formato ISO YYYY-MM-DD sin desviaciones por huso UTC.
 */
export function getLocalIsoDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Genera una llave de idempotencia única para intenciones de red.
 */
export function generateFittingIdempotencyKey(prefix: string = 'm06'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    const rand = Math.random().toString(36).substring(2, 10);
    const ts = Date.now().toString(36);
    return `${prefix}_${ts}_${rand}`;
}

/**
 * Normaliza y formatea los errores provenientes de PostgREST, PostgreSQL y RPCs M06.
 * Maneja específicamente el código PT409 (conflicto optimista) para avisar al usuario
 * que recargue el expediente sin provocar bucles de reintento.
 */
export function formatFittingError(err: unknown): FittingServiceErrorDetails {
    if (!err || typeof err !== 'object') {
        return {
            code: M06_ERROR_NAMES.UNKNOWN_ERROR,
            message: 'Ocurrió un error inesperado en el servicio de pruebas y ajustes.',
        };
    }

    const candidate = err as {
        code?: string;
        message?: string;
        status?: number;
        hint?: string | null;
        details?: unknown;
    };

    const rawCode = candidate.code || '';
    const rawMessage = candidate.message || '';
    const httpStatus = candidate.status;

    // F-12: Conflicto optimista PT409 (HTTP 409 sin reintentos de PostgREST 14.18)
    if (
        rawCode === M06_SQLSTATE_CODES.CONCURRENCY_CONFLICT ||
        httpStatus === 409 ||
        rawMessage.includes('PT409') ||
        rawMessage.toLowerCase().includes('conflicto de concurrencia')
    ) {
        return {
            code: M06_ERROR_NAMES.CONCURRENCY_CONFLICT,
            message:
                rawMessage ||
                'Conflicto de concurrencia: la prueba o ajuste fue modificado por otra operación en el taller. Por favor recarga el expediente para ver la versión más reciente.',
            httpStatus: 409,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Idempotencia / Clave duplicada 23505
    if (
        rawCode === M06_SQLSTATE_CODES.IDEMPOTENCY_CONFLICT ||
        rawMessage.includes('23505') ||
        rawMessage.toLowerCase().includes('conflicto de idempotencia')
    ) {
        return {
            code: M06_ERROR_NAMES.IDEMPOTENCY_CONFLICT,
            message:
                rawMessage ||
                'Conflicto de idempotencia: los datos enviados difieren de una operación ya registrada con el mismo identificador.',
            httpStatus: 409,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Violación de reglas CHECK 23514
    if (rawCode === M06_SQLSTATE_CODES.CHECK_VIOLATION || rawMessage.includes('23514')) {
        return {
            code: M06_ERROR_NAMES.RULE_VIOLATION,
            message:
                rawMessage ||
                'Regla de integridad no cumplida: la operación no cumple con las restricciones de prueba o ajuste.',
            httpStatus: 400,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Permiso denegado 42501 o registro sellado
    if (
        rawCode === M06_SQLSTATE_CODES.PERMISSION_DENIED ||
        rawMessage.includes('42501') ||
        rawMessage.toLowerCase().includes('acceso denegado') ||
        rawMessage.toLowerCase().includes('historial sellado')
    ) {
        return {
            code: M06_ERROR_NAMES.ACCESS_DENIED,
            message:
                rawMessage ||
                'Acceso denegado o registro sellado: no es posible modificar una sesión ya aprobada, cancelada o entregada.',
            httpStatus: 403,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Referencia inexistente o RLS invoker 23503
    if (rawCode === M06_SQLSTATE_CODES.FOREIGN_KEY_VIOLATION || rawMessage.includes('23503')) {
        return {
            code: 'FOREIGN_KEY_VIOLATION',
            message: rawMessage || 'Registro vinculado no encontrado o fuera de alcance RLS.',
            httpStatus: 404,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    return {
        code: rawCode || M06_ERROR_NAMES.UNKNOWN_ERROR,
        message: rawMessage || 'Error al procesar la operación de fitting.',
        httpStatus: httpStatus || 500,
        hint: candidate.hint,
        details: candidate.details,
    };
}

// ==============================================================================
// 1. CONSULTAS DE SESIONES Y EXPEDIENTE DE PRUEBAS
// ==============================================================================

/**
 * Consulta todas las sesiones físicas de una Creación con sus respectivos ajustes,
 * fotografías de prueba, actas de entrega y URLs firmadas de visualización.
 */
export async function fetchFittingSessionsByCreation(
    creationId: string
): Promise<{ data: FittingSessionWithRelations[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: [], error: 'Identificador de creación inválido (no UUID).' };
    }

    try {
        // 1. Consultar sesiones ordenadas por session_number descendente
        const { data: sessionsData, error: sessionsError } = await supabase
            .from('atelier_fitting_sessions')
            .select('*')
            .eq('creation_id', creationId)
            .order('session_number', { ascending: false });

        if (sessionsError) {
            return { data: [], error: sessionsError.message };
        }

        const rawSessions = (sessionsData as FittingSession[]) || [];
        if (rawSessions.length === 0) {
            return { data: [], error: null };
        }

        // 2. Consultar todos los ajustes pertenecientes a esta creación
        const { data: adjustmentsData, error: adjError } = await supabase
            .from('atelier_fitting_adjustments')
            .select('*')
            .eq('creation_id', creationId)
            .order('created_at', { ascending: true });

        if (adjError) {
            return { data: [], error: adjError.message };
        }

        const allAdjustments = (adjustmentsData as FittingAdjustment[]) || [];

        // 3. Consultar activos multimedia vinculados a las sesiones de esta creación
        const { data: mediaData, error: mediaError } = await supabase
            .from('commercial_media_assets')
            .select('*')
            .eq('creation_id', creationId)
            .in('asset_type', ['fitting_photo', 'delivery_note']);

        if (mediaError) {
            return { data: [], error: mediaError.message };
        }

        const allMedia = (mediaData as CommercialMediaAsset[]) || [];

        // 4. Firmar en lote todas las rutas de Storage privadas encontradas
        const storagePathsToSign = allMedia
            .map((m) => m.file_path)
            .filter((p): p is string => Boolean(p && p.trim().length > 0));

        let signedUrlsMap: Record<string, string | null> = {};
        if (storagePathsToSign.length > 0) {
            const { data: urls } = await createCommercialAssetSignedUrls(storagePathsToSign, 3600);
            if (urls) {
                signedUrlsMap = urls;
            }
        }

        // 5. Ensamblar sesiones enriquecidas con relaciones
        const enrichedSessions: FittingSessionWithRelations[] = rawSessions.map((session) => {
            const sessionAdjustments = allAdjustments.filter(
                (a) => a.fitting_session_id === session.id
            );
            const sessionMedia = allMedia.filter(
                (m) => m.fitting_session_id === session.id
            );

            return {
                ...session,
                adjustments: sessionAdjustments,
                mediaAssets: sessionMedia,
                signedMediaUrls: signedUrlsMap,
            };
        });

        return { data: enrichedSessions, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar sesiones de prueba.';
        return { data: [], error: message };
    }
}

/**
 * Consulta la bandeja transversal de Pruebas y Entregas para Katherine Carroll y el taller.
 */
export async function fetchDesignerFittingQueue(
    filter?: FittingDesignerQueueFilter
): Promise<{ data: FittingQueueItem[]; error: string | null }> {
    try {
        // Consultar creaciones activas / en proceso de fitting o producción
        let creationsQuery = supabase
            .from('creations')
            .select('id, name, status, client_id, client:clients(id, full_name, fantasy_name)')
            .not('status', 'in', '("draft","cancelled")')
            .order('updated_at', { ascending: false });

        if (filter?.creationId) {
            creationsQuery = creationsQuery.eq('id', filter.creationId);
        }
        if (filter?.clientId) {
            creationsQuery = creationsQuery.eq('client_id', filter.clientId);
        }

        const { data: creationsData, error: creationsError } = await creationsQuery;
        if (creationsError) {
            return { data: [], error: creationsError.message };
        }

        const creations = creationsData || [];
        if (creations.length === 0) {
            return { data: [], error: null };
        }

        const creationIds = creations.map((c) => c.id);

        // Consultar sesiones de esas creaciones
        const { data: sessionsData, error: sessionsError } = await supabase
            .from('atelier_fitting_sessions')
            .select('*')
            .in('creation_id', creationIds)
            .order('session_number', { ascending: false });

        if (sessionsError) {
            return { data: [], error: sessionsError.message };
        }

        // Consultar ajustes abiertos de esas creaciones
        const { data: adjustmentsData, error: adjError } = await supabase
            .from('atelier_fitting_adjustments')
            .select('id, creation_id, status, severity, requires_cad_update')
            .in('creation_id', creationIds)
            .in('status', ['pending', 'applied']);

        if (adjError) {
            return { data: [], error: adjError.message };
        }

        const allSessions = (sessionsData as FittingSession[]) || [];
        const allOpenAdjustments = (adjustmentsData as {
            id: string;
            creation_id: string;
            status: string;
            severity: string;
            requires_cad_update: boolean;
        }[]) || [];

        const queueItems: FittingQueueItem[] = [];

        for (const cr of creations) {
            const rawClient = Array.isArray(cr.client) ? cr.client[0] : cr.client;
            const clientInfo = rawClient as unknown as { id?: string; full_name?: string; fantasy_name?: string } | null;
            const clientName = clientInfo?.fantasy_name || clientInfo?.full_name || 'Clienta de Atelier';

            const crSessions = allSessions.filter((s) => s.creation_id === cr.id);
            const latestSession = crSessions[0] || null;

            const crOpenAdj = allOpenAdjustments.filter((a) => a.creation_id === cr.id);
            const openAdjustmentsCount = crOpenAdj.length;
            const criticalAdjustmentsCount = crOpenAdj.filter((a) => a.severity === 'critical').length;
            const requiresCadRevision = Boolean(
                latestSession?.requires_cad_revision ||
                crOpenAdj.some((a) => a.requires_cad_update)
            );

            // Una creación está lista para entrega cuando existe al menos una sesión aprobada como final_for_delivery
            // y el conteo de ajustes abiertos en toda la creación es exactamente 0
            const hasFinalApproval = crSessions.some(
                (s) => s.status === 'approved' && s.approval_scope === 'final_for_delivery'
            );
            const isReadyForDelivery = hasFinalApproval && openAdjustmentsCount === 0;

            const deliverySession = crSessions.find((s) => s.delivery_confirmed_at !== null);
            const isDelivered = Boolean(deliverySession || cr.status === 'completed');

            // Aplicar filtros opcionales
            if (filter?.status && filter.status !== 'all') {
                if (latestSession?.status !== filter.status) {
                    continue;
                }
            }
            if (filter?.requiresCadRevision && !requiresCadRevision) {
                continue;
            }
            if (filter?.onlyOpenAdjustments && openAdjustmentsCount === 0) {
                continue;
            }
            if (filter?.onlyReadyForDelivery && (!isReadyForDelivery || isDelivered)) {
                continue;
            }
            if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
                const term = filter.searchQuery.toLowerCase();
                const matches =
                    cr.name.toLowerCase().includes(term) ||
                    clientName.toLowerCase().includes(term);
                if (!matches) {
                    continue;
                }
            }

            queueItems.push({
                creationId: cr.id,
                creationName: cr.name,
                creationStatus: cr.status,
                clientId: cr.client_id,
                clientName,
                latestSessionId: latestSession?.id || null,
                latestSessionNumber: latestSession?.session_number || null,
                latestRoundType: latestSession?.round_type || null,
                latestSessionStatus: latestSession?.status || null,
                scheduledAt: latestSession?.scheduled_at || null,
                openAdjustmentsCount,
                criticalAdjustmentsCount,
                requiresCadRevision,
                isReadyForDelivery,
                isDelivered,
                deliveryConfirmedAt: deliverySession?.delivery_confirmed_at || null,
            });
        }

        return { data: queueItems, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar bandeja de pruebas y entregas.';
        return { data: [], error: message };
    }
}

/**
 * Consulta de solo lectura del contexto M02 (Patronaje CAD y ajustes técnicos vinculados).
 */
export async function fetchCreationM02FittingContext(
    creationId: string
): Promise<{
    data: { patternExecutions: unknown[]; patternAdjustments: unknown[] };
    error: string | null;
}> {
    if (!isValidUuid(creationId)) {
        return { data: { patternExecutions: [], patternAdjustments: [] }, error: 'ID de creación no válido.' };
    }

    try {
        const { data: executions, error: execError } = await supabase
            .from('pattern_executions')
            .select('*')
            .eq('creation_id', creationId)
            .order('execution_number', { ascending: false });

        if (execError) {
            return { data: { patternExecutions: [], patternAdjustments: [] }, error: execError.message };
        }

        const { data: adjustments, error: adjError } = await supabase
            .from('pattern_adjustments')
            .select('*')
            .eq('creation_id', creationId)
            .order('created_at', { ascending: true });

        if (adjError) {
            return { data: { patternExecutions: [], patternAdjustments: [] }, error: adjError.message };
        }

        return {
            data: {
                patternExecutions: executions || [],
                patternAdjustments: adjustments || [],
            },
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar contexto CAD M02.';
        return { data: { patternExecutions: [], patternAdjustments: [] }, error: message };
    }
}

// ==============================================================================
// 2. MUTACIONES TRANSACCIONALES VÍA RPCs ATÓMICAS (8 RPCs)
// ==============================================================================

/**
 * 2.1. Invocación de create_fitting_session_m06.
 */
export async function createFittingSession(
    dto: CreateFittingSessionDTO
): Promise<{ data: CreateFittingSessionRpcResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('session');

    try {
        const { data, error } = await supabase.rpc('create_fitting_session_m06', {
            p_creation_id: dto.creationId,
            p_idempotency_key: idempotencyKey,
            p_round_type: dto.roundType ?? 'toile_first',
            p_title: dto.title ?? null,
            p_project_id: dto.projectId ?? null,
            p_pattern_execution_id: dto.patternExecutionId ?? null,
            p_scheduled_at: dto.scheduledAt ?? null,
            p_conducted_at: dto.conductedAt ?? null,
            p_location_note: dto.locationNote ?? null,
            p_garment_state_note: dto.garmentStateNote ?? null,
            p_footwear_heel_cm: dto.footwearHeelCm ?? null,
            p_balance_assessment: dto.balanceAssessment ?? 'pending',
            p_summary_notes: dto.summaryNotes ?? null,
            p_client_feedback_notes: dto.clientFeedbackNotes ?? null,
            p_requires_cad_revision: dto.requiresCadRevision ?? false,
            p_initial_status: dto.initialStatus ?? 'scheduled',
        });

        if (error) {
            return { data: null, error: formatFittingError(error) };
        }

        return { data: data as CreateFittingSessionRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatFittingError(err) };
    }
}

/**
 * 2.2. Invocación de update_fitting_session_m06.
 * Exige expectedRowVersion e idempotencyKey para control optimista.
 */
export async function updateFittingSession(
    dto: UpdateFittingSessionDTO
): Promise<{ data: UpdateFittingSessionRpcResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('update_session');

    try {
        const { data, error } = await supabase.rpc('update_fitting_session_m06', {
            p_session_id: dto.sessionId,
            p_expected_row_version: dto.expectedRowVersion,
            p_idempotency_key: idempotencyKey,
            p_title: dto.title ?? null,
            p_status: dto.status ?? null,
            p_scheduled_at: dto.scheduledAt ?? null,
            p_conducted_at: dto.conductedAt ?? null,
            p_location_note: dto.locationNote ?? null,
            p_garment_state_note: dto.garmentStateNote ?? null,
            p_footwear_heel_cm: dto.footwearHeelCm ?? null,
            p_balance_assessment: dto.balanceAssessment ?? null,
            p_summary_notes: dto.summaryNotes ?? null,
            p_client_feedback_notes: dto.clientFeedbackNotes ?? null,
            p_requires_cad_revision: dto.requiresCadRevision ?? null,
            p_cancellation_reason: dto.cancellationReason ?? null,
        });

        if (error) {
            return { data: null, error: formatFittingError(error) };
        }

        return { data: data as UpdateFittingSessionRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatFittingError(err) };
    }
}

/**
 * 2.3. Invocación de add_fitting_adjustment_m06.
 * Exige expectedSessionRowVersion e idempotencyKey.
 */
export async function createFittingAdjustment(
    dto: CreateFittingAdjustmentDTO
): Promise<{ data: AddFittingAdjustmentRpcResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('adj');

    try {
        const { data, error } = await supabase.rpc('add_fitting_adjustment_m06', {
            p_fitting_session_id: dto.fittingSessionId,
            p_expected_session_row_version: dto.expectedSessionRowVersion,
            p_idempotency_key: idempotencyKey,
            p_zone_code: dto.zoneCode,
            p_adjustment_kind: dto.adjustmentKind,
            p_description: dto.description,
            p_severity: dto.severity ?? 'normal',
            p_requires_cad_update: dto.requiresCadUpdate ?? false,
            p_delta_mm: dto.deltaMm ?? null,
            p_workshop_notes: dto.workshopNotes ?? null,
            p_related_pattern_adjustment_id: dto.relatedPatternAdjustmentId ?? null,
        });

        if (error) {
            return { data: null, error: formatFittingError(error) };
        }

        return { data: data as AddFittingAdjustmentRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatFittingError(err) };
    }
}

/**
 * 2.4. Invocación de resolve_fitting_adjustment_m06.
 * Exige expectedRowVersion e idempotencyKey.
 */
export async function resolveFittingAdjustment(
    dto: ResolveFittingAdjustmentDTO
): Promise<{ data: ResolveFittingAdjustmentRpcResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('resolve_adj');

    try {
        const { data, error } = await supabase.rpc('resolve_fitting_adjustment_m06', {
            p_adjustment_id: dto.adjustmentId,
            p_expected_row_version: dto.expectedRowVersion,
            p_idempotency_key: idempotencyKey,
            p_target_status: dto.targetStatus,
            p_workshop_notes: dto.workshopNotes ?? null,
            p_reason: dto.reason ?? null,
            p_resolution_session_id: dto.resolutionSessionId ?? null,
        });

        if (error) {
            return { data: null, error: formatFittingError(error) };
        }

        return { data: data as ResolveFittingAdjustmentRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatFittingError(err) };
    }
}

/**
 * 2.5. Invocación de approve_fitting_session_m06.
 * Exige expectedRowVersion, idempotencyKey y approvalScope explícito.
 */
export async function approveFittingSession(
    dto: ApproveFittingSessionDTO
): Promise<{ data: ApproveFittingSessionRpcResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('approve');

    try {
        const { data, error } = await supabase.rpc('approve_fitting_session_m06', {
            p_session_id: dto.sessionId,
            p_expected_row_version: dto.expectedRowVersion,
            p_idempotency_key: idempotencyKey,
            p_approval_scope: dto.approvalScope,
            p_approval_notes: dto.approvalNotes ?? null,
        });

        if (error) {
            return { data: null, error: formatFittingError(error) };
        }

        return { data: data as ApproveFittingSessionRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatFittingError(err) };
    }
}

// ==============================================================================
// 3. GESTIÓN MULTIMEDIA Y COMPENSACIÓN SEGURA EN STORAGE
// ==============================================================================

export interface UploadFittingMediaInput {
    creationId: string;
    sessionId: string;
    expectedSessionRowVersion: number;
    assetType: 'fitting_photo' | 'delivery_note';
    fileUri: string;
    fileName: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    description?: string | null;
    idempotencyKey?: string;
}

export interface UploadFittingMediaResult {
    asset: CommercialMediaAsset;
    signedUrl: string | null;
    idempotentReplay: boolean;
}

/**
 * Sube una fotografía o acta de entrega a Storage determinista y la registra
 * atómicamente mediante register_fitting_media_asset_m06.
 * Ante fallo en BD, compensa inmediatamente eliminando únicamente el archivo recién subido
 * si este no existía previamente registrado.
 */
export async function uploadFittingMediaAsset(
    input: UploadFittingMediaInput
): Promise<{ data: UploadFittingMediaResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = input.idempotencyKey?.trim() || generateFittingIdempotencyKey('media');

    // 1. Resolver extensión y ruta determinista
    const extension = input.fileName.includes('.')
        ? input.fileName.split('.').pop()?.toLowerCase() || 'jpg'
        : 'jpg';

    const scope: CommercialStorageScope = input.assetType === 'delivery_note' ? 'deliveries' : 'fittings';
    const targetStoragePath = `${scope}/${input.creationId}/${input.sessionId}/${idempotencyKey}.${extension}`;

    // 2. Subir archivo a Storage privado
    const uploadRes = await uploadCommercialAsset({
        uri: input.fileUri,
        scope,
        entityId: `${input.creationId}/${input.sessionId}`,
        fileName: `${idempotencyKey}.${extension}`,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        upsert: true,
    });

    if (uploadRes.error || !uploadRes.data?.storagePath) {
        return {
            data: null,
            error: {
                code: 'STORAGE_UPLOAD_ERROR',
                message: uploadRes.error || 'Error al subir activo fotográfico a Storage privado.',
            },
        };
    }

    const uploadedPath = uploadRes.data.storagePath;

    // 3. Registrar en base de datos vía RPC transaccional
    try {
        const { data, error } = await supabase.rpc('register_fitting_media_asset_m06', {
            p_session_id: input.sessionId,
            p_expected_session_row_version: input.expectedSessionRowVersion,
            p_idempotency_key: idempotencyKey,
            p_asset_type: input.assetType,
            p_file_path: uploadedPath,
            p_file_name: input.fileName,
            p_mime_type: input.mimeType ?? null,
            p_file_size_bytes: input.fileSizeBytes ?? null,
            p_description: input.description ?? null,
        });

        if (error) {
            // COMPENSACIÓN SEGURA EN STORAGE:
            // Si el error no es por una ruta preexistente idéntica registrada, limpiar el archivo subido
            const isPreexistingPath =
                error.code === M06_SQLSTATE_CODES.IDEMPOTENCY_CONFLICT &&
                (error.message || '').includes('ya fue registrada');

            if (!isPreexistingPath) {
                await removeCommercialAsset(uploadedPath).catch(() => {});
            }

            return { data: null, error: formatFittingError(error) };
        }

        const rpcResult = data as RegisterFittingMediaRpcResult;
        const { data: signedUrl } = await createCommercialAssetSignedUrl(uploadedPath, 3600);

        return {
            data: {
                asset: rpcResult.asset,
                signedUrl: signedUrl || null,
                idempotentReplay: rpcResult.idempotent_replay,
            },
            error: null,
        };
    } catch (err: unknown) {
        await removeCommercialAsset(uploadedPath).catch(() => {});
        return { data: null, error: formatFittingError(err) };
    }
}

export interface DeleteFittingMediaResult {
    success: boolean;
    deletedAssetId: string;
    filePath: string;
    session: FittingSession;
    idempotentReplay: boolean;
}

/**
 * 2.8. Invocación de delete_fitting_media_asset_m06 con eliminación segura en Storage.
 * ÚNICAMENTE elimina el archivo físico en Storage tras confirmar la eliminación/replay en BD.
 */
export async function deleteFittingMediaAsset(
    dto: DeleteFittingMediaDTO
): Promise<{ data: DeleteFittingMediaResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('del_media');

    try {
        // 1. Eliminar primero en PostgreSQL para registrar el recibo inmutable y validar estado sellado/versión
        const { data, error } = await supabase.rpc('delete_fitting_media_asset_m06', {
            p_asset_id: dto.assetId,
            p_session_id: dto.sessionId,
            p_expected_session_row_version: dto.expectedSessionRowVersion,
            p_idempotency_key: idempotencyKey,
        });

        if (error) {
            // NUNCA eliminar de Storage si la base de datos rechazó la operación
            return { data: null, error: formatFittingError(error) };
        }

        const rpcResult = data as DeleteFittingMediaRpcResult;

        // 2. SOLO tras confirmación en BD, retirar de Storage (tolerante a reintentos)
        if (rpcResult.file_path && rpcResult.file_path.trim().length > 0) {
            await removeCommercialAsset(rpcResult.file_path).catch(() => {});
        }

        return {
            data: {
                success: rpcResult.success,
                deletedAssetId: rpcResult.deleted_asset_id,
                filePath: rpcResult.file_path,
                session: rpcResult.session,
                idempotentReplay: rpcResult.idempotent_replay,
            },
            error: null,
        };
    } catch (err: unknown) {
        return { data: null, error: formatFittingError(err) };
    }
}

// ==============================================================================
// 4. CEREMONIAL DE ENTREGA FINAL
// ==============================================================================

export interface ConfirmCreationDeliveryInput extends ConfirmDeliveryDTO {
    actaFileUri?: string | null;
    creationId?: string;
}

/**
 * 2.6. Invocación de confirm_creation_delivery_m06.
 * Congela la fecha local, normaliza el checklist y maneja el acta opcional con compensación.
 */
export async function confirmCreationDelivery(
    dto: ConfirmCreationDeliveryInput
): Promise<{ data: ConfirmCreationDeliveryRpcResult | null; error: FittingServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateFittingIdempotencyKey('delivery');
    const effectiveLocalDate = dto.localDate?.trim() || getLocalIsoDate();
    const normalizedChecklist = normalizeFittingDeliveryChecklist(dto.deliveryChecklist);

    let uploadedActaPath: string | null = null;
    let deliveryNotePayload = dto.deliveryNoteAsset || null;

    // Si se pasa un URI local para el acta física y aún no se subió
    if (dto.actaFileUri && dto.creationId && !deliveryNotePayload) {
        const ext = dto.actaFileUri.toLowerCase().endsWith('.pdf') ? 'pdf' : 'png';
        const targetActaPath = `deliveries/${dto.creationId}/${dto.sessionId}/acta_${idempotencyKey}.${ext}`;

        const uploadRes = await uploadCommercialAsset({
            uri: dto.actaFileUri,
            scope: 'deliveries',
            entityId: `${dto.creationId}/${dto.sessionId}`,
            fileName: `acta_${idempotencyKey}.${ext}`,
            mimeType: ext === 'pdf' ? 'application/pdf' : 'image/png',
            upsert: true,
        });

        if (uploadRes.error || !uploadRes.data?.storagePath) {
            return {
                data: null,
                error: {
                    code: 'STORAGE_UPLOAD_ERROR',
                    message: uploadRes.error || 'Error al subir acta de entrega a Storage.',
                },
            };
        }

        uploadedActaPath = uploadRes.data.storagePath;
        deliveryNotePayload = {
            filePath: uploadedActaPath,
            fileName: `acta_entrega_${effectiveLocalDate}.${ext}`,
            mimeType: ext === 'pdf' ? 'application/pdf' : 'image/png',
            idempotencyKey: `acta_${idempotencyKey}`,
        };
    }

    try {
        const { data, error } = await supabase.rpc('confirm_creation_delivery_m06', {
            p_session_id: dto.sessionId,
            p_expected_row_version: dto.expectedRowVersion,
            p_idempotency_key: idempotencyKey,
            p_delivery_notes: dto.deliveryNotes ?? null,
            p_delivery_checklist: normalizedChecklist,
            p_local_date: effectiveLocalDate,
            p_delivery_note_asset: deliveryNotePayload
                ? {
                      file_path: deliveryNotePayload.filePath,
                      file_name: deliveryNotePayload.fileName,
                      mime_type: deliveryNotePayload.mimeType ?? null,
                      file_size_bytes: deliveryNotePayload.fileSizeBytes ?? null,
                      idempotency_key: deliveryNotePayload.idempotencyKey ?? null,
                  }
                : null,
        });

        if (error) {
            // Si falló la RPC y subimos un acta en esta intención, compensar Storage
            if (uploadedActaPath) {
                await removeCommercialAsset(uploadedActaPath).catch(() => {});
            }
            return { data: null, error: formatFittingError(error) };
        }

        return { data: data as ConfirmCreationDeliveryRpcResult, error: null };
    } catch (err: unknown) {
        if (uploadedActaPath) {
            await removeCommercialAsset(uploadedActaPath).catch(() => {});
        }
        return { data: null, error: formatFittingError(err) };
    }
}
