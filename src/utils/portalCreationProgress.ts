// ==============================================================================
// ATELIER DIGITAL — RESOLUCIÓN PURA DE PROGRESO M03 Y NAVEGACIÓN (M09 P1.3)
// Archivo: src/utils/portalCreationProgress.ts
// ==============================================================================
// Lógica pura sin dependencias de red, React Native ni Supabase:
// - Implementación estricta de Opción A (proyecto principal determinista
//   updated_at DESC, id DESC + historial discreto separado sin mezclar etapas).
// - Clasificación de estados con diferenciación H-05 (PGRST205/42P01 vs error
//   transitorio recuperable vs error de identificador 22P02 vs unauthorized).
// - Cálculo de secciones autorizadas para la navegación modular del portal.
// ==============================================================================

import {
    PortalCreationProgressView,
    PortalPermissionsProjection,
    PortalViewReadResult,
} from '../types/portal';

export const PORTAL_CLIENT_UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidPortalUuid(value?: string | null): boolean {
    if (!value) return false;
    return PORTAL_CLIENT_UUID_REGEX.test(String(value).trim());
}

/**
 * Comparador determinista: updated_at DESC, con desempate secundario id DESC.
 * Coherente 1:1 con el orden SQL/PostgREST de fetchPortalCreationProgressView (H-04).
 */
export function comparePortalProjectsDesc(
    a: PortalCreationProgressView,
    b: PortalCreationProgressView
): number {
    const timeA = Date.parse(a.updated_at || '');
    const timeB = Date.parse(b.updated_at || '');
    const safeA = Number.isNaN(timeA) ? 0 : timeA;
    const safeB = Number.isNaN(timeB) ? 0 : timeB;

    if (safeA !== safeB) {
        return safeB - safeA;
    }

    // Fallback lexicográfico sobre updated_at si ambos timestamps fueran no parseables
    const rawCmp = String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
    if (rawCmp !== 0) {
        return rawCmp;
    }

    // Desempate determinista secundario: id DESC
    return String(b.id || '').localeCompare(String(a.id || ''));
}

export interface CreationProjectsOptionAResult {
    primaryProject: PortalCreationProgressView | null;
    historicalProjects: PortalCreationProgressView[];
    hasHistory: boolean;
    totalProjects: number;
}

/**
 * Aplica la decisión de producto Opción A sobre la lista de proyectos M03 de una creación:
 * - Descarta defensivamente cualquier registro cancelado o sin id/creation_id.
 * - Ordena determinísticamente por updated_at DESC, id DESC.
 * - Separa estrictamente primaryProject (índice 0) de historicalProjects (índices 1..N)
 *   para jamás mezclar etapas, fechas ni cronologías entre proyectos distintos.
 */
export function resolveCreationProjectsOptionA(
    rows: PortalCreationProgressView[]
): CreationProjectsOptionAResult {
    if (!Array.isArray(rows) || rows.length === 0) {
        return {
            primaryProject: null,
            historicalProjects: [],
            hasHistory: false,
            totalProjects: 0,
        };
    }

    const validActiveRows = rows.filter(
        (row) =>
            Boolean(row && row.id && row.creation_id && row.current_stage) &&
            row.current_stage.trim().toLowerCase() !== 'cancelled'
    );

    if (validActiveRows.length === 0) {
        return {
            primaryProject: null,
            historicalProjects: [],
            hasHistory: false,
            totalProjects: 0,
        };
    }

    const sorted = [...validActiveRows].sort(comparePortalProjectsDesc);
    const primaryProject = sorted[0];
    const historicalProjects = sorted.slice(1);

    return {
        primaryProject,
        historicalProjects,
        hasHistory: historicalProjects.length > 0,
        totalProjects: sorted.length,
    };
}

export type PortalProgressDisplayKind =
    | 'loading'
    | 'ready'
    | 'empty'
    | 'view_unavailable'
    | 'recoverable_error'
    | 'invalid_id'
    | 'unauthorized';

export interface PortalProgressDisplayState {
    kind: PortalProgressDisplayKind;
    primaryProject: PortalCreationProgressView | null;
    historicalProjects: PortalCreationProgressView[];
    hasHistory: boolean;
    errorCode: string | null;
    errorMessage: string | null;
}

/**
 * Clasifica el resultado del lector P1.2 (fetchPortalCreationProgressView) en un estado
 * inequívoco de presentación, diferenciando explícitamente H-05:
 * - 'view_unavailable': exclusivamente PGRST205 o 42P01 (vista SQL aún no desplegada).
 * - 'recoverable_error': caídas transitorias de red/backend (502/503/504, failed to fetch, otros).
 * - 'invalid_id': error de parámetro 22P02.
 * - 'unauthorized': denegación RLS / sesión 42501 / 401 / 403.
 * - 'empty': creación válida sin proyecto M03 asociado.
 * - 'ready': proyecto principal disponible (+ historial discreto opcional).
 */
export function classifyPortalProgressReadResult(
    result: PortalViewReadResult<PortalCreationProgressView[]> | null
): PortalProgressDisplayState {
    if (!result) {
        return {
            kind: 'loading',
            primaryProject: null,
            historicalProjects: [],
            hasHistory: false,
            errorCode: null,
            errorMessage: null,
        };
    }

    const normalizedCode = String(result.errorCode || '').trim().toUpperCase();

    if (!result.ok) {
        if (normalizedCode === '22P02') {
            return {
                kind: 'invalid_id',
                primaryProject: null,
                historicalProjects: [],
                hasHistory: false,
                errorCode: normalizedCode,
                errorMessage: result.errorMessage || 'Identificador de creación inválido.',
            };
        }

        if (result.status === 'unauthorized') {
            return {
                kind: 'unauthorized',
                primaryProject: null,
                historicalProjects: [],
                hasHistory: false,
                errorCode: normalizedCode || '42501',
                errorMessage:
                    result.errorMessage || 'No cuentas con autorización vigente para este seguimiento.',
            };
        }

        // Diferenciación H-05: vista SQL aún no disponible vs fallo transitorio de red/backend.
        // Nota: classifyViewReadError en portalService.ts sintetiza code='PGRST205' cuando
        // un error de red ('Failed to fetch') llega sin error.code; por ello excluimos mensajes
        // explícitos de red/gateway para garantizar la clasificación recuperable.
        const lowerMsg = String(result.errorMessage || '').toLowerCase();
        const isTransientNetworkMessage =
            lowerMsg.includes('failed to fetch') ||
            lowerMsg.includes('network request failed') ||
            lowerMsg.includes('fetcherror') ||
            lowerMsg.includes('timeout') ||
            lowerMsg.includes('service unavailable') ||
            lowerMsg.includes('bad gateway') ||
            lowerMsg.includes('gateway timeout');

        const isSchemaViewMissing =
            result.status === 'backend_unavailable' &&
            !isTransientNetworkMessage &&
            (normalizedCode === 'PGRST205' || normalizedCode === '42P01');

        if (isSchemaViewMissing) {
            return {
                kind: 'view_unavailable',
                primaryProject: null,
                historicalProjects: [],
                hasHistory: false,
                errorCode: normalizedCode,
                errorMessage: result.errorMessage || null,
            };
        }

        return {
            kind: 'recoverable_error',
            primaryProject: null,
            historicalProjects: [],
            hasHistory: false,
            errorCode: normalizedCode || null,
            errorMessage:
                result.errorMessage ||
                'No fue posible consultar el seguimiento del taller en este momento.',
        };
    }

    const resolved = resolveCreationProjectsOptionA(result.data);
    if (!resolved.primaryProject) {
        return {
            kind: 'empty',
            primaryProject: null,
            historicalProjects: [],
            hasHistory: false,
            errorCode: null,
            errorMessage: null,
        };
    }

    return {
        kind: 'ready',
        primaryProject: resolved.primaryProject,
        historicalProjects: resolved.historicalProjects,
        hasHistory: resolved.hasHistory,
        errorCode: null,
        errorMessage: null,
    };
}

export type PortalSectionKey =
    | 'all'
    | 'creations'
    | 'measurements'
    | 'quotations'
    | 'appointments'
    | 'fittings';

export interface PortalSectionNavItem {
    key: PortalSectionKey;
    label: string;
    count?: number;
}

/**
 * Construye las pestañas de navegación modular visibles exclusivamente para
 * los módulos realmente autorizados por la proyección Zero Trust de la clienta.
 */
export function buildAvailablePortalSections(params: {
    projection: PortalPermissionsProjection | null;
    creationsCount: number;
    measurementsCount: number;
    quotesCount: number;
    appointmentsCount: number;
    fittingsCount: number;
}): PortalSectionNavItem[] {
    const {
        projection,
        creationsCount,
        measurementsCount,
        quotesCount,
        appointmentsCount,
        fittingsCount,
    } = params;

    const moduleTabs: PortalSectionNavItem[] = [];

    if (projection?.creationModules.hasAnyVisibleCreation) {
        moduleTabs.push({ key: 'creations', label: 'Creaciones', count: creationsCount });
    }
    if (projection?.globalModules.measurementsView) {
        moduleTabs.push({ key: 'measurements', label: 'Medidas', count: measurementsCount });
    }
    if (projection?.globalModules.quotationsView || quotesCount > 0) {
        moduleTabs.push({ key: 'quotations', label: 'Cotizaciones', count: quotesCount });
    }
    if (projection?.globalModules.appointmentsView) {
        moduleTabs.push({ key: 'appointments', label: 'Agenda', count: appointmentsCount });
    }
    if (projection?.creationModules.hasAnyVisibleFittings) {
        moduleTabs.push({ key: 'fittings', label: 'Pruebas', count: fittingsCount });
    }

    if (moduleTabs.length <= 1) {
        return moduleTabs;
    }

    return [{ key: 'all', label: 'Todo mi Dossier' }, ...moduleTabs];
}
