// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: ETIQUETAS CANÓNICAS Y FORMATEADORES DE FITTING
// Archivo: src/components/fitting/fittingLabels.ts
// ==============================================================================
// Diccionarios en español de alta costura, formateadores de calce, colores semánticos
// y utilidades de presentación para sesiones de prueba, ajustes y entrega.
// ==============================================================================

import {
    FittingAdjustmentKind,
    FittingAdjustmentSeverity,
    FittingAdjustmentStatus,
    FittingAdjustmentZoneCode,
    FittingApprovalScope,
    FittingBalanceAssessment,
    FittingRoundType,
    FittingSessionStatus,
} from '../../types/fitting';

// ==============================================================================
// 1. DICCIONARIOS Y OPCIONES DE SESIÓN DE PRUEBA
// ==============================================================================

export const FITTING_ROUND_OPTIONS: { id: FittingRoundType; label: string; badge: string; description: string }[] = [
    {
        id: 'toile_first',
        label: '1ª Prueba en Glasilla (Toile)',
        badge: 'Glasilla',
        description: 'Verificación de volumen, silueta base y aplomo en muselina/toile sobre cuerpo real.',
    },
    {
        id: 'second_fitting',
        label: '2ª Prueba en Tela Definitiva',
        badge: 'Tela Real',
        description: 'Prenda cortada e hilvanada en tejido noble; ajuste de pinzas, costados y caída.',
    },
    {
        id: 'final_fitting',
        label: 'Prueba Final de Acabados',
        badge: 'Prueba Final',
        description: 'Postura con calzado de ocasión, nivelación de bastilla/ruedo y revisión de cierres.',
    },
    {
        id: 'alteration_check',
        label: 'Revisión de Transformación',
        badge: 'Restauración',
        description: 'Control de ajuste para prendas de transformación, alta costura restaurativa o modificación.',
    },
    {
        id: 'extra_fitting',
        label: 'Prueba Intermedia Adicional',
        badge: 'Intermedia',
        description: 'Cita complementaria para entalles complejos, drapeados o bordados sobre puesto.',
    },
];

export const FITTING_ROUND_LABELS: Record<FittingRoundType, string> = {
    toile_first: '1ª Prueba en Glasilla',
    second_fitting: '2ª Prueba en Tela Definitiva',
    final_fitting: 'Prueba Final de Acabados',
    alteration_check: 'Revisión de Transformación',
    extra_fitting: 'Prueba Intermedia Adicional',
};

export const FITTING_SESSION_STATUS_LABELS: Record<FittingSessionStatus, string> = {
    scheduled: 'Programada',
    completed: 'Realizada',
    adjustments_required: 'Con Ajustes por Atender',
    approved: 'Calce Aprobado',
    cancelled: 'Cancelada',
};

export const FITTING_APPROVAL_SCOPE_LABELS: Record<FittingApprovalScope, string> = {
    intermediate_round: 'Aprobación de Ronda Intermedia',
    final_for_delivery: 'Calce Final Listo para Entrega',
};

export const FITTING_BALANCE_ASSESSMENT_LABELS: Record<FittingBalanceAssessment, string> = {
    pending: 'Evaluación Pendiente',
    balanced: 'Aplomo & Balance Impecable',
    minor_tweaks: 'Ajustes Menores Requeridos',
    structural_revision: 'Revisión Estructural de Patrón',
};

// ==============================================================================
// 2. DICCIONARIOS Y OPCIONES DE AJUSTES FÍSICOS
// ==============================================================================

export const FITTING_ZONE_OPTIONS: { id: FittingAdjustmentZoneCode; label: string }[] = [
    { id: 'escote', label: 'Escote & Cuello' },
    { id: 'hombro', label: 'Hombro & Caída' },
    { id: 'sisa', label: 'Sisa & Desahogo' },
    { id: 'busto', label: 'Busto & Pinzas' },
    { id: 'cintura', label: 'Cintura & Talle' },
    { id: 'cadera', label: 'Cadera & Evasé' },
    { id: 'centro_delantero', label: 'Centro Delantero' },
    { id: 'centro_espalda', label: 'Centro Espalda' },
    { id: 'costado', label: 'Costados' },
    { id: 'manga', label: 'Manga & Largo' },
    { id: 'copa_manga', label: 'Copa de Manga' },
    { id: 'largo', label: 'Largo General' },
    { id: 'ruedo', label: 'Ruedo / Bastilla' },
    { id: 'forro_acabado', label: 'Forro & Acabados' },
    { id: 'otro', label: 'Otra Zona' },
];

export const FITTING_ZONE_LABELS: Record<FittingAdjustmentZoneCode, string> = {
    escote: 'Escote & Cuello',
    hombro: 'Hombro & Caída',
    sisa: 'Sisa & Desahogo',
    busto: 'Busto & Pinzas',
    cintura: 'Cintura & Talle',
    cadera: 'Cadera & Evasé',
    centro_delantero: 'Centro Delantero',
    centro_espalda: 'Centro Espalda',
    costado: 'Costados',
    manga: 'Manga & Largo',
    copa_manga: 'Copa de Manga',
    largo: 'Largo General',
    ruedo: 'Ruedo / Bastilla',
    forro_acabado: 'Forro & Acabados',
    otro: 'Otra Zona',
};

export const FITTING_KIND_OPTIONS: { id: FittingAdjustmentKind; label: string }[] = [
    { id: 'hem', label: 'Bastilla / Ruedo con Calzado' },
    { id: 'silhouette_pin', label: 'Pinzas & Entalle Alfilereado' },
    { id: 'shoulder_pad', label: 'Hombrera / Aplomo Hombro' },
    { id: 'neckline_contour', label: 'Asentado de Escote' },
    { id: 'armhole_sleeve', label: 'Desahogo Sisa / Caída Manga' },
    { id: 'closure_fastening', label: 'Cremallera & Botonadura' },
    { id: 'lining_structure', label: 'Forrería & Ballenas' },
    { id: 'drape_embroidery', label: 'Drapeado & Pedrería' },
    { id: 'cad_repattern_needed', label: 'Recálculo Paramétrico CAD (M02)' },
    { id: 'other', label: 'Otro Ajuste de Taller' },
];

export const FITTING_KIND_LABELS: Record<FittingAdjustmentKind, string> = {
    hem: 'Bastilla / Ruedo con Calzado',
    silhouette_pin: 'Pinzas & Entalle Alfilereado',
    shoulder_pad: 'Hombrera / Aplomo Hombro',
    neckline_contour: 'Asentado de Escote',
    armhole_sleeve: 'Desahogo Sisa / Caída Manga',
    closure_fastening: 'Cremallera & Botonadura',
    lining_structure: 'Forrería & Ballenas',
    drape_embroidery: 'Drapeado & Pedrería',
    cad_repattern_needed: 'Recálculo Paramétrico CAD',
    other: 'Otro Ajuste',
};

export const FITTING_SEVERITY_OPTIONS: { id: FittingAdjustmentSeverity; label: string; description: string }[] = [
    { id: 'minor', label: 'Menor / Cosmético', description: 'Corrección leve que no compromete la estructura ni la confección.' },
    { id: 'normal', label: 'Estándar de Confección', description: 'Ajuste habitual de entalle, bastilla o asentado de costuras.' },
    { id: 'critical', label: 'Estructural Crítico', description: 'Defecto de aplomo o sisa que prohíbe dispensa y exige validación obligatoria.' },
];

export const FITTING_SEVERITY_LABELS: Record<FittingAdjustmentSeverity, string> = {
    minor: 'Menor',
    normal: 'Estándar',
    critical: 'Crítico',
};

export const FITTING_STATUS_LABELS: Record<FittingAdjustmentStatus, string> = {
    pending: 'Pendiente en Taller',
    applied: 'Aplicado en Prenda',
    verified: 'Verificado Conforme',
    waived: 'Dispensado con Motivo',
    cancelled: 'Descartado / Anulado',
};

// ==============================================================================
// 3. FORMATEADORES Y BADGES VISUALES
// ==============================================================================

/**
 * Formatea una fecha ISO para visualización editorial en español.
 */
export function formatFittingDate(isoString?: string | null): string {
    if (!isoString) return 'Sin fecha programada';
    try {
        const parts = isoString.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const months = [
                'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
            ];
            return `${day} ${months[month - 1]} ${year}`;
        }
        return isoString.slice(0, 10);
    } catch {
        return isoString || 'Fecha no disponible';
    }
}

/**
 * Formatea la altura del tacón de calzado en centímetros.
 */
export function formatHeelHeight(cm?: number | null): string {
    if (cm === null || cm === undefined) return 'Plano / Sin tacón';
    if (cm === 0) return 'Calzado plano (0 cm)';
    return `${cm.toFixed(1)} cm`;
}

/**
 * Formatea la variación milimétrica (+/- mm).
 */
export function formatDeltaMm(delta?: number | null): string {
    if (delta === null || delta === undefined) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta} mm`;
}

/**
 * Paleta de color y contraste para los badges de severidad.
 */
export function getAdjustmentSeverityColors(severity: FittingAdjustmentSeverity): {
    background: string;
    text: string;
    border: string;
} {
    switch (severity) {
        case 'critical':
            return {
                background: '#FAF2F2',
                text: '#9E3B3B',
                border: '#E8C5C5',
            };
        case 'minor':
            return {
                background: '#F8F6F0',
                text: '#8A6A4A',
                border: '#E6D9C8',
            };
        case 'normal':
        default:
            return {
                background: '#F1F7F2',
                text: '#3D6346',
                border: '#C2DFCA',
            };
    }
}

/**
 * Paleta de color para el estado de la sesión física de prueba.
 */
export function getFittingSessionStatusColors(
    status: FittingSessionStatus,
    approvalScope?: FittingApprovalScope | null,
    isDelivered?: boolean
): {
    background: string;
    text: string;
    border: string;
    badgeLabel: string;
} {
    if (isDelivered) {
        return {
            background: '#F7F2E7',
            text: '#8A6A4A',
            border: '#A78350',
            badgeLabel: '👑 Prenda Entregada',
        };
    }

    if (status === 'approved') {
        if (approvalScope === 'final_for_delivery') {
            return {
                background: '#F1F7F2',
                text: '#3D6346',
                border: '#C2DFCA',
                badgeLabel: '✓ Calce Final Listo para Entrega',
            };
        }
        return {
            background: '#F8F6F0',
            text: '#8A6A4A',
            border: '#E6D9C8',
            badgeLabel: 'Aprobación Intermedia Conforme',
        };
    }

    switch (status) {
        case 'adjustments_required':
            return {
                background: '#FAF2F2',
                text: '#9E3B3B',
                border: '#E8C5C5',
                badgeLabel: 'Ajustes Requeridos en Taller',
            };
        case 'completed':
            return {
                background: '#F1F7F2',
                text: '#3D6346',
                border: '#C2DFCA',
                badgeLabel: 'Prueba Realizada',
            };
        case 'cancelled':
            return {
                background: '#F4F2EE',
                text: '#766B62',
                border: '#E6D9C8',
                badgeLabel: 'Cita Cancelada',
            };
        case 'scheduled':
        default:
            return {
                background: '#F8F2E9',
                text: '#171411',
                border: '#A78350',
                badgeLabel: 'Cita Programada',
            };
    }
}

