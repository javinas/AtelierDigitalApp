// ==============================================================================
// ATELIER DIGITAL — FORMATEADORES EDITORIALES DEL PORTAL DE CLIENTA (M09 P1.1)
// Archivo: src/utils/portalFormatters.ts
// ==============================================================================
// Utilidades puras extraídas desde app/(client)/index.tsx para reutilización
// transversal entre el inicio del portal y futuras vistas del Bloque P1.
// Incluye también el catálogo canónico de las 8 etapas M03 (puro, sin BD).
// ==============================================================================

import {
    PortalCommercialQuoteView,
    PortalM03CanonicalStage,
    PortalM03StageMetadata,
} from '../types/portal';

const BOGOTA_TIMEZONE = 'America/Bogota';

export function toSafeDateObject(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    const trimmed = String(dateStr).trim();
    if (!trimmed) return null;
    // Las columnas DATE sin hora (YYYY-MM-DD) se anclan al mediodía de Bogotá para evitar desfase -05:00
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? `${trimmed}T12:00:00-05:00`
        : trimmed;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatBogotaDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const parsed = toSafeDateObject(dateStr);
    if (!parsed) return String(dateStr);
    try {
        return new Intl.DateTimeFormat('es-CO', {
            timeZone: BOGOTA_TIMEZONE,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(parsed);
    } catch {
        return String(dateStr);
    }
}

export function formatBogotaTime(dateStr?: string | null): string {
    if (!dateStr) return '';
    const parsed = toSafeDateObject(dateStr);
    if (!parsed) return '';
    try {
        return new Intl.DateTimeFormat('es-CO', {
            timeZone: BOGOTA_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(parsed);
    } catch {
        return '';
    }
}

export function formatBogotaScheduleRange(
    startsAt?: string | null,
    endsAt?: string | null
): string {
    if (!startsAt) return 'Por confirmar';
    const dateLabel = formatBogotaDate(startsAt);
    const startTime = formatBogotaTime(startsAt);
    const endTime = formatBogotaTime(endsAt);
    if (startTime && endTime) {
        return `${dateLabel} · ${startTime} – ${endTime} (COT)`;
    }
    if (startTime) {
        return `${dateLabel} · ${startTime} (COT)`;
    }
    return dateLabel;
}

export function formatCurrency(amount?: number | null, curr: string = 'COP'): string {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
    try {
        return `$ ${amount.toLocaleString('es-CO')} ${curr}`;
    } catch {
        return `$ ${amount} ${curr}`;
    }
}

export function formatCreationTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
        bespoke: 'Alta Costura a Medida',
        pret_a_couture: 'Prêt-à-Couture',
        couture_collection: 'Pieza de Colección',
        bridal: 'Nupcial & Novia',
        gala: 'Gala & Fiesta',
        corporate: 'Sastrería de Autor',
        fantasy: 'Vestuario de Arte',
        alteration: 'Restauración de Alta Costura',
    };
    return (type && map[type]) || 'Diseño de Autor';
}

export function formatCreationStatusLabel(st?: string | null): string {
    const map: Record<string, string> = {
        draft: 'Borrador de Taller',
        active: 'En Diseño Activo',
        fitting: 'En Pruebas de Calce',
        approved: 'Aprobada para Confección',
        production: 'En Corte y Confección',
        completed: 'Finalizada y Entregada',
        cancelled: 'Archivada',
    };
    return (st && map[st]) || st || 'Activa';
}

export function formatAppointmentTypeLabel(type?: string | null): string {
    switch (type) {
        case 'toile_fitting':
            return 'PRUEBA DE RETOR (TOILE)';
        case 'garment_fitting':
            return 'PRUEBA DE VESTUARIO';
        case 'final_fitting':
            return 'PRUEBA FINAL DE CALCE';
        case 'consultation':
            return 'CONSULTA DE DISEÑO';
        case 'design_presentation':
            return 'PRESENTACIÓN DE BOCETOS';
        case 'measurement_session':
            return 'TOMA DE MEDIDAS';
        case 'delivery_ceremony':
            return 'ENTREGA DE PRENDA';
        default:
            return 'CITA ATELIER';
    }
}

export function formatAppointmentStatusLabel(status?: string | null): string {
    switch (status) {
        case 'confirmed':
            return 'CONFIRMADA';
        case 'completed':
            return 'REALIZADA';
        case 'rescheduled':
            return 'REPROGRAMADA';
        case 'scheduled':
        default:
            return 'PROGRAMADA';
    }
}

export function formatQuoteStatusLabel(status?: string | null): string {
    switch (status) {
        case 'accepted':
        case 'approved':
            return 'APROBADA';
        case 'sent':
            return 'VIGENTE';
        case 'expired':
            return 'VENCIDA';
        default:
            return 'FORMALIZADA';
    }
}

// E3.1 — Enums canónicos M06 (src/types/fitting.ts)
// FITTING_ROUND_TYPES: 'toile_first' | 'second_fitting' | 'final_fitting' | 'alteration_check' | 'extra_fitting'
export function formatFittingRoundLabel(roundType?: string | null): string {
    switch (roundType) {
        case 'toile_first':
            return '1ª Prueba en Glasilla (Toile)';
        case 'second_fitting':
            return '2ª Prueba en Tela Definitiva';
        case 'final_fitting':
            return 'Prueba Final de Acabados';
        case 'alteration_check':
            return 'Revisión de Transformación';
        case 'extra_fitting':
            return 'Prueba Intermedia Adicional';
        default:
            return 'Sesión de Prueba de Calce';
    }
}

// E3.1 — FITTING_SESSION_STATUSES: 'scheduled' | 'completed' | 'adjustments_required' | 'approved' | 'cancelled'
export function formatFittingStatusLabel(status?: string | null): string {
    switch (status) {
        case 'scheduled':
            return 'PROGRAMADA';
        case 'completed':
            return 'REALIZADA';
        case 'adjustments_required':
            return 'CON AJUSTES';
        case 'approved':
            return 'CALCE APROBADO';
        case 'cancelled':
            return 'CANCELADA';
        default:
            return 'PROGRAMADA';
    }
}

export function formatMeasurementStatusLabel(status?: string | null): string {
    if (status === 'verified') return 'VERIFICADA';
    if (status === 'completed') return 'COMPLETADA';
    return 'REGISTRADA';
}

export function formatPaymentScheduleSummary(
    schedule: PortalCommercialQuoteView['payment_schedule']
): string | null {
    if (!schedule) return null;
    if (typeof schedule === 'string') {
        const clean = schedule.trim();
        return clean.length > 0 ? clean : null;
    }
    if (Array.isArray(schedule)) {
        if (schedule.length === 0) return null;
        return `${schedule.length} ${schedule.length === 1 ? 'hito de pago acordado' : 'hitos de pago acordados'}`;
    }
    if (typeof schedule === 'object') {
        const keys = Object.keys(schedule);
        if (keys.length === 0) return null;
        if (typeof schedule.summary === 'string' && schedule.summary.trim()) {
            return schedule.summary.trim();
        }
        return 'Plan de pagos formalizado en documento comercial.';
    }
    return null;
}

// ==============================================================================
// CATÁLOGO CANÓNICO DE LAS 8 ETAPAS DE CONFECCIÓN M03 (CONTRATO PURO P1.1)
// ==============================================================================

export const PORTAL_M03_STAGES: readonly PortalM03StageMetadata[] = [
    {
        step: 1,
        key: 'planning',
        label: 'Planificación de Atelier',
        shortLabel: 'Planificación',
        editorialDescription: 'Preparación de ficha técnica, patronaje base y selección de materiales.',
    },
    {
        step: 2,
        key: 'cutting',
        label: 'Trazado y Corte',
        shortLabel: 'Corte',
        editorialDescription: 'Trazado anatómico sobre patrón personalizado y corte de precisión.',
    },
    {
        step: 3,
        key: 'assembly',
        label: 'Armado e Hilván',
        shortLabel: 'Armado',
        editorialDescription: 'Ensamblaje inicial de la estructura para evaluación de silueta.',
    },
    {
        step: 4,
        key: 'first_fitting',
        label: 'Primera Prueba',
        shortLabel: '1ª Prueba',
        editorialDescription: 'Evaluación inicial de postura, proporciones y línea de calce.',
    },
    {
        step: 5,
        key: 'adjustments',
        label: 'Ajustes de Calce',
        shortLabel: 'Ajustes',
        editorialDescription: 'Refinamiento milimétrico en taller según observaciones de la primera prueba.',
    },
    {
        step: 6,
        key: 'second_fitting',
        label: 'Segunda Prueba',
        shortLabel: '2ª Prueba',
        editorialDescription: 'Validación avanzada de caída, escote y acabados estructurales.',
    },
    {
        step: 7,
        key: 'finishing',
        label: 'Acabados a Mano',
        shortLabel: 'Acabados',
        editorialDescription: 'Terminaciones artesanales, planchado de alta costura y control de calidad.',
    },
    {
        step: 8,
        key: 'delivered',
        label: 'Entrega Final',
        shortLabel: 'Entrega',
        editorialDescription: 'Prenda finalizada y entregada oficialmente desde el atelier.',
    },
] as const;

const M03_STAGE_ALIAS_MAP: Record<string, PortalM03CanonicalStage> = {
    planning: 'planning',
    cutting: 'cutting',
    pattern_cut: 'cutting',
    assembly: 'assembly',
    basting: 'assembly',
    first_fitting: 'first_fitting',
    adjustments: 'adjustments',
    fitting_adjustments: 'adjustments',
    second_fitting: 'second_fitting',
    finishing: 'finishing',
    hand_finishing: 'finishing',
    delivered: 'delivered',
    final_delivery: 'delivered',
};

/**
 * Normaliza cualquier etapa operativa de public.atelier_projects (incluyendo alias históricos)
 * a una de las 8 etapas canónicas de confección. Retorna null para 'cancelled' o valores desconocidos.
 */
export function normalizePortalM03Stage(rawStage?: string | null): PortalM03CanonicalStage | null {
    if (!rawStage) return null;
    const key = String(rawStage).trim().toLowerCase();
    return M03_STAGE_ALIAS_MAP[key] ?? null;
}

export function getPortalM03StageMetadata(
    rawStage?: string | null
): PortalM03StageMetadata | null {
    const normalized = normalizePortalM03Stage(rawStage);
    if (!normalized) return null;
    return PORTAL_M03_STAGES.find((stage) => stage.key === normalized) ?? null;
}
