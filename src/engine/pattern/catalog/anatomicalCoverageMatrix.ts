// ==============================================================================
// ATELIER DIGITAL — MATRIZ DE COBERTURA ANATÓMICA Y VISTAS DE MANIQUÍ
// Archivo: src/engine/pattern/catalog/anatomicalCoverageMatrix.ts
// ==============================================================================
// Determina con exactitud la representación espacial de cada medida del catálogo:
// si aparece en la vista actual, si requiere otra perspectiva/silueta,
// si es de consulta en tabla únicamente o si es un parámetro técnico de taller.
// ==============================================================================

import {
    MASTER_MEASUREMENT_CATALOG,
    WORKSHOP_PARAMETER_CODES,
    WORKSHOP_PARAMETER_DEFINITIONS,
    BODY_MEASUREMENT_CODES,
    DESIGN_PARAMETER_CODES,
} from './masterCatalog';
import {
    ANATOMICAL_COTAS_BY_CODE,
    AnatomicalPerspective,
    isCotaCompatibleWithPerspective,
    isCotaVisibleInTorsoView,
    COTA_CANONICAL_MEASURE_KEYS,
} from './anatomicalMapping';

export type CoverageStatus =
    | 'current_view'          // Representada y visible en la vista actual del maniquí
    | 'other_view'            // Tiene anchor, pero requiere otra silueta o perspectiva
    | 'table_only'             // Medida corporal válida de tabla, sin cota visual individual en maniquí
    | 'not_applicable';        // Parámetro de diseño o taller (no es una medida anatómica del cuerpo)

export interface CoverageDetail {
    code: string;
    canonicalCode: string;
    name: string;
    category: 'body' | 'design' | 'workshop';
    hasAnchor: boolean;
    supportsTorsoStockman: boolean;
    supportsFullBodyFront: boolean;
    supportsFullBodyBack: boolean;
    status: CoverageStatus;
    statusInCurrentView: CoverageStatus;
    badgeLabel: string;
    badgeBg: string;
    badgeColor: string;
    reasonNotVisible?: string;
    switchAction?: {
        viewMode: 'full_body' | 'torso';
        perspective: 'front' | 'back';
        targetView?: 'full_body' | 'torso';
        targetPerspective?: 'front' | 'back';
        label: string;
    };
    actionHint?: string;
}

// Mapa inverso de alias para resolución rápida
const ALIAS_TO_COTA_MAP: Record<string, string> = {};
for (const [cotaCode, aliases] of Object.entries(COTA_CANONICAL_MEASURE_KEYS)) {
    for (const al of aliases) {
        ALIAS_TO_COTA_MAP[al] = cotaCode;
    }
}

/**
 * Resuelve el código canónico de cota si existe para una medida
 */
export function resolveCotaCode(measureCode: string): string | null {
    if (ANATOMICAL_COTAS_BY_CODE[measureCode]) return measureCode;
    if (ALIAS_TO_COTA_MAP[measureCode]) return ALIAS_TO_COTA_MAP[measureCode];
    return null;
}

/**
 * Evalúa las vistas compatibles para una cota anatómica
 */
export function evaluateCotaCompatibility(cotaCode: string): {
    hasAnchor: boolean;
    supportsTorsoStockman: boolean;
    supportsFullBodyFront: boolean;
    supportsFullBodyBack: boolean;
} {
    const cota = ANATOMICAL_COTAS_BY_CODE[cotaCode];
    if (!cota) {
        return {
            hasAnchor: false,
            supportsTorsoStockman: false,
            supportsFullBodyFront: false,
            supportsFullBodyBack: false,
        };
    }

    const supportsFront = isCotaCompatibleWithPerspective(cotaCode, 'front');
    const supportsBack = isCotaCompatibleWithPerspective(cotaCode, 'back');
    const visibleInTorso = isCotaVisibleInTorsoView(cota.zone, cotaCode);

    return {
        hasAnchor: true,
        supportsTorsoStockman: visibleInTorso && supportsFront,
        supportsFullBodyFront: supportsFront,
        supportsFullBodyBack: supportsBack,
    };
}

/**
 * Obtiene el detalle de cobertura de una medida dada la vista activa
 */
export function getMeasurementCoverageDetail(
    measureCode: string,
    currentViewMode: 'full_body' | 'torso',
    currentPerspective: AnatomicalPerspective
): CoverageDetail {
    const isWorkshop = WORKSHOP_PARAMETER_CODES.includes(measureCode);
    const masterItem = MASTER_MEASUREMENT_CATALOG.find((m) => m.code === measureCode);
    const isDesign = masterItem?.scope === 'design_parameter';
    const category: 'body' | 'design' | 'workshop' = isWorkshop
        ? 'workshop'
        : isDesign
        ? 'design'
        : 'body';

    const name = isWorkshop
        ? WORKSHOP_PARAMETER_DEFINITIONS[measureCode]?.name || measureCode
        : masterItem?.name || measureCode;

    const cotaCode = resolveCotaCode(measureCode);

    if (category === 'workshop') {
        return {
            code: measureCode,
            canonicalCode: measureCode,
            name,
            category: 'workshop',
            hasAnchor: false,
            supportsTorsoStockman: false,
            supportsFullBodyFront: false,
            supportsFullBodyBack: false,
            status: 'not_applicable',
            statusInCurrentView: 'not_applicable',
            badgeLabel: 'Parámetro de taller',
            badgeBg: 'rgba(167, 131, 80, 0.12)',
            badgeColor: '#A78350',
            reasonNotVisible: 'Parámetro de confección y holgura en taller: no corresponde a una cota anatómica corporal.',
        };
    }

    if (category === 'design' && !cotaCode) {
        return {
            code: measureCode,
            canonicalCode: measureCode,
            name,
            category: 'design',
            hasAnchor: false,
            supportsTorsoStockman: false,
            supportsFullBodyFront: false,
            supportsFullBodyBack: false,
            status: 'not_applicable',
            statusInCurrentView: 'not_applicable',
            badgeLabel: 'Medida de diseño',
            badgeBg: 'rgba(197, 160, 89, 0.12)',
            badgeColor: '#C5A059',
            reasonNotVisible: 'Dimensión estilística de prenda: se modela sobre el patrón y no como contorno corporal.',
        };
    }

    if (!cotaCode) {
        return {
            code: measureCode,
            canonicalCode: measureCode,
            name,
            category: 'body',
            hasAnchor: false,
            supportsTorsoStockman: false,
            supportsFullBodyFront: false,
            supportsFullBodyBack: false,
            status: 'table_only',
            statusInCurrentView: 'table_only',
            badgeLabel: 'Solo tabla',
            badgeBg: 'rgba(148, 163, 184, 0.12)',
            badgeColor: '#94A3B8',
            reasonNotVisible: 'Medida corporal antropométrica registrada en tabla; sin cota vectorial individual en maniquí.',
        };
    }

    const compat = evaluateCotaCompatibility(cotaCode);

    // Evaluar si es visible en la vista actual
    let isVisibleNow = false;
    if (currentViewMode === 'torso') {
        isVisibleNow = compat.supportsTorsoStockman;
    } else {
        isVisibleNow = currentPerspective === 'front' ? compat.supportsFullBodyFront : compat.supportsFullBodyBack;
    }

    if (isVisibleNow) {
        return {
            code: measureCode,
            canonicalCode: cotaCode,
            name,
            category: 'body',
            hasAnchor: true,
            supportsTorsoStockman: compat.supportsTorsoStockman,
            supportsFullBodyFront: compat.supportsFullBodyFront,
            supportsFullBodyBack: compat.supportsFullBodyBack,
            status: 'current_view',
            statusInCurrentView: 'current_view',
            badgeLabel: 'En maniquí',
            badgeBg: 'rgba(16, 185, 129, 0.12)',
            badgeColor: '#10B981',
        };
    }

    // Está en otra vista: identificar a cuál debe conmutar
    let switchAction: CoverageDetail['switchAction'];
    let reason = '';
    let badgeText = 'En otra vista';

    if (currentViewMode === 'torso' && !compat.supportsTorsoStockman) {
        // Requiere cuerpo completo
        const targetPerspective: AnatomicalPerspective = compat.supportsFullBodyFront ? 'front' : 'back';
        switchAction = {
            viewMode: 'full_body',
            perspective: targetPerspective,
            targetView: 'full_body',
            targetPerspective,
            label: 'Ver en Cuerpo Completo',
        };
        badgeText = 'Vista cuerpo completo';
        reason = 'Cota de extremidad o dimensión total: no visible en Torso Stockman, disponible en Cuerpo Completo.';
    } else if (currentPerspective === 'front' && !compat.supportsFullBodyFront && compat.supportsFullBodyBack) {
        // Requiere vista dorsal / posterior
        switchAction = {
            viewMode: currentViewMode,
            perspective: 'back',
            targetView: currentViewMode,
            targetPerspective: 'back',
            label: 'Ver en Vista Posterior',
        };
        badgeText = 'Vista posterior';
        reason = 'Cota dorsal: pertenece a la espalda, visible en Perspectiva Posterior.';
    } else if (currentPerspective === 'back' && !compat.supportsFullBodyBack && compat.supportsFullBodyFront) {
        // Requiere vista frontal
        switchAction = {
            viewMode: currentViewMode,
            perspective: 'front',
            targetView: currentViewMode,
            targetPerspective: 'front',
            label: 'Ver en Vista Frontal',
        };
        badgeText = 'Vista frontal';
        reason = 'Cota anterior: pertenece al frente del cuerpo, visible en Perspectiva Frontal.';
    }

    return {
        code: measureCode,
        canonicalCode: cotaCode,
        name,
        category: 'body',
        hasAnchor: true,
        supportsTorsoStockman: compat.supportsTorsoStockman,
        supportsFullBodyFront: compat.supportsFullBodyFront,
        supportsFullBodyBack: compat.supportsFullBodyBack,
        status: 'other_view',
        statusInCurrentView: 'other_view',
        badgeLabel: badgeText,
        badgeBg: 'rgba(212, 175, 55, 0.12)',
        badgeColor: '#D4AF37',
        reasonNotVisible: reason,
        switchAction,
    };
}

/**
 * Genera la matriz de cobertura completa de todos los elementos del catálogo
 */
export function generateFullCoverageMatrix(
    currentViewMode: 'full_body' | 'torso' = 'torso',
    currentPerspective: AnatomicalPerspective = 'front'
): CoverageDetail[] {
    const list: CoverageDetail[] = [];

    // 1. Todas las medidas corporales del catálogo maestro
    for (const code of BODY_MEASUREMENT_CODES) {
        list.push(getMeasurementCoverageDetail(code, currentViewMode, currentPerspective));
    }

    // 2. Medidas de diseño
    for (const code of DESIGN_PARAMETER_CODES) {
        list.push(getMeasurementCoverageDetail(code, currentViewMode, currentPerspective));
    }

    // 3. Parámetros de taller
    for (const code of WORKSHOP_PARAMETER_CODES) {
        list.push(getMeasurementCoverageDetail(code, currentViewMode, currentPerspective));
    }

    return list;
}

/**
 * Genera el CSV de la Matriz de Cobertura para exportación técnica
 */
export function exportCoverageMatrixCsv(): string {
    const matrix = generateFullCoverageMatrix('torso', 'front');

    const headers = [
        'Código Canónico',
        'Nombre de la Medida',
        'Categoría',
        'Tiene Anchor en Maniquí',
        'Cuerpo Completo Frontal',
        'Cuerpo Completo Posterior',
        'Torso Stockman',
        'Arquetipos Compatibles',
        'Estado de Cobertura Base',
        'Motivo / Justificación Técnica',
        'Recomendación de Acción',
    ];

    const escapeCsv = (str: string) => {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = matrix.map((item) => {
        const catLabel = item.category === 'body' ? 'Corporal' : item.category === 'design' ? 'Diseño' : 'Taller';
        const hasAnchorStr = item.hasAnchor ? 'SÍ' : 'NO';
        const fullFrontStr = item.supportsFullBodyFront ? 'SÍ' : 'NO';
        const fullBackStr = item.supportsFullBodyBack ? 'SÍ' : 'NO';
        const torsoStr = item.supportsTorsoStockman ? 'SÍ' : 'NO';
        const arquetipos = 'Mujer, Hombre, Niña, Niño';

        let coverageStatusStr = '';
        let recomendacion = 'Sin acción requerida.';

        if (item.category === 'workshop') {
            coverageStatusStr = 'Parámetro de taller (No aplicable a silueta)';
            recomendacion = 'Conservar en panel de parámetros de taller y ficha técnica de corte.';
        } else if (item.hasAnchor) {
            coverageStatusStr = item.supportsTorsoStockman
                ? 'Representada en Torso y Cuerpo Completo'
                : 'Representada en Cuerpo Completo exclusivamente';
            recomendacion = 'Cota activa y calibrada con relajación anti-colisión.';
        } else if (item.category === 'design') {
            coverageStatusStr = 'Medida de diseño (No aplicable a silueta)';
            recomendacion = 'Ajustar según proporciones de la prenda en modelado o tabla de medidas.';
        } else {
            coverageStatusStr = 'Solo tabla (Sin anchor individual)';
            recomendacion = 'Medida complementaria; conservar visualización en tabla y modal explicativo.';
        }

        return [
            escapeCsv(item.canonicalCode),
            escapeCsv(item.name),
            escapeCsv(catLabel),
            escapeCsv(hasAnchorStr),
            escapeCsv(fullFrontStr),
            escapeCsv(fullBackStr),
            escapeCsv(torsoStr),
            escapeCsv(arquetipos),
            escapeCsv(coverageStatusStr),
            escapeCsv(item.reasonNotVisible || 'Representación anatómica calibrada.'),
            escapeCsv(recomendacion),
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
}
