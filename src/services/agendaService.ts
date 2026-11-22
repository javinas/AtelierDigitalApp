// ==============================================================================
// ATELIER DIGITAL — SERVICIO: MÓDULO 08 — AGENDA DEL ATELIER
// Archivo: src/services/agendaService.ts
// ==============================================================================
// Gestiona la zona horaria America/Bogota (-05:00), las 4 RPCs transaccionales
// de agenda, prevención de traslapes y métricas del tablero.
// ==============================================================================

import { supabase } from '../supabase';
import {
    AgendaMutationRpcResult,
    AgendaOverviewSummary,
    AgendaServiceErrorDetails,
    AgendaViewMode,
    AtelierLocationSpace,
    CancelAppointmentDTO,
    FetchAtelierAgendaResult,
    M08_ERROR_NAMES,
    M08_SQLSTATE_CODES,
    ScheduleAppointmentDTO,
    UnifiedAgendaItem,
    UpdateAppointmentDTO,
} from '../types/agenda';

const BOGOTA_TIMEZONE = 'America/Bogota';
const BOGOTA_FIXED_OFFSET_HOURS = -5;

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/**
 * Obtiene la fecha ISO (YYYY-MM-DD) en hora oficial de Colombia (America/Bogota).
 */
export function getBogotaIsoDate(date: Date = new Date()): string {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: BOGOTA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(date);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const d = parts.find((p) => p.type === 'day')?.value;
        if (y && m && d) return `${y}-${m}-${d}`;
    } catch {
        // Fallback determinístico a UTC-5 (Colombia sin horario de verano)
    }
    const shifted = new Date(date.getTime() + BOGOTA_FIXED_OFFSET_HOURS * 3600_000);
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/**
 * Extrae fecha y hora HH:mm en America/Bogota desde cualquier TIMESTAMPTZ ISO.
 */
export function extractBogotaDateAndTime(isoTimestamp: string): { date: string; time: string } {
    const parsed = new Date(isoTimestamp);
    if (Number.isNaN(parsed.getTime())) {
        return { date: getBogotaIsoDate(), time: '09:00' };
    }
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: BOGOTA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(parsed);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const d = parts.find((p) => p.type === 'day')?.value;
        let hh = parts.find((p) => p.type === 'hour')?.value || '09';
        if (hh === '24') hh = '00';
        const mm = parts.find((p) => p.type === 'minute')?.value || '00';
        if (y && m && d) {
            return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
        }
    } catch {
        // Fallback UTC-5
    }
    const shifted = new Date(parsed.getTime() + BOGOTA_FIXED_OFFSET_HOURS * 3600_000);
    return {
        date: `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`,
        time: `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`,
    };
}

/**
 * Construye TIMESTAMPTZ con offset explícito de Colombia (-05:00).
 */
export function buildBogotaTimestamptz(dateStr: string, timeStr: string): string {
    const cleanDate = dateStr.trim().slice(0, 10);
    const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
    const hh = match ? pad2(Math.min(23, Math.max(0, Number(match[1])))) : '09';
    const mm = match ? pad2(Math.min(59, Math.max(0, Number(match[2])))) : '00';
    return `${cleanDate}T${hh}:${mm}:00-05:00`;
}

/**
 * Suma minutos a una fecha/hora de Bogotá preservando exactamente el offset -05:00.
 */
export function addMinutesToBogotaIso(dateStr: string, timeStr: string, durationMinutes: number): string {
    const startIso = buildBogotaTimestamptz(dateStr, timeStr);
    const startMs = new Date(startIso).getTime();
    if (Number.isNaN(startMs)) return startIso;
    const endDate = new Date(startMs + durationMinutes * 60_000);
    const { date, time } = extractBogotaDateAndTime(endDate.toISOString());
    return `${date}T${time}:00-05:00`;
}

export function addDaysToBogotaDate(isoDate: string, deltaDays: number): string {
    const baseMs = new Date(`${isoDate}T12:00:00-05:00`).getTime();
    const target = new Date(baseMs + deltaDays * 86_400_000);
    return getBogotaIsoDate(target);
}

/**
 * Devuelve las 7 fechas YYYY-MM-DD (Lunes -> Domingo) de la semana de anchorDate.
 */
export function getBogotaWeekDates(anchorDate: string): string[] {
    const d = new Date(`${anchorDate}T12:00:00-05:00`);
    const dayOfWeek = d.getUTCDay(); // en mediodía Bogotá es el mismo día UTC
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = addDaysToBogotaDate(anchorDate, diffToMonday);
    return Array.from({ length: 7 }, (_, i) => addDaysToBogotaDate(monday, i));
}

/**
 * Devuelve las fechas (múltiplo de 7) para renderizar la cuadrícula mensual Lunes-Domingo.
 */
export function getBogotaMonthGridDates(anchorDate: string): { monthPrefix: string; gridDates: string[] } {
    const monthPrefix = anchorDate.slice(0, 7);
    const firstOfMonth = `${monthPrefix}-01`;
    const firstDayObj = new Date(`${firstOfMonth}T12:00:00-05:00`);
    const dow = firstDayObj.getUTCDay();
    const leadDays = dow === 0 ? 6 : dow - 1;

    const year = Number(anchorDate.slice(0, 4));
    const month = Number(anchorDate.slice(5, 7));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const totalCells = Math.ceil((leadDays + daysInMonth) / 7) * 7;

    const gridStart = addDaysToBogotaDate(firstOfMonth, -leadDays);
    const gridDates = Array.from({ length: totalCells }, (_, i) => addDaysToBogotaDate(gridStart, i));
    return { monthPrefix, gridDates };
}

export function getBogotaRangeForView(
    anchorDate: string,
    viewMode: AgendaViewMode
): { fromIso: string; toIso: string; fromDate: string; toDate: string } {
    if (viewMode === 'day') {
        return {
            fromDate: anchorDate,
            toDate: anchorDate,
            fromIso: `${anchorDate}T00:00:00-05:00`,
            toIso: `${anchorDate}T23:59:59-05:00`,
        };
    }
    if (viewMode === 'week') {
        const week = getBogotaWeekDates(anchorDate);
        const fromDate = week[0];
        const toDate = week[week.length - 1];
        return {
            fromDate,
            toDate,
            fromIso: `${fromDate}T00:00:00-05:00`,
            toIso: `${toDate}T23:59:59-05:00`,
        };
    }
    const { gridDates } = getBogotaMonthGridDates(anchorDate);
    const fromDate = gridDates[0];
    const toDate = gridDates[gridDates.length - 1];
    return {
        fromDate,
        toDate,
        fromIso: `${fromDate}T00:00:00-05:00`,
        toIso: `${toDate}T23:59:59-05:00`,
    };
}

function capitalizeFirstEs(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return text;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function isAutomatedTestClientRecord(fullName?: string | null): boolean {
    if (!fullName) return false;
    return /^\[TEST-M\d+/i.test(fullName.trim());
}

export function formatBogotaDateHeading(isoDate: string): string {
    const d = new Date(`${isoDate}T12:00:00-05:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    try {
        return capitalizeFirstEs(
            new Intl.DateTimeFormat('es-CO', {
                timeZone: BOGOTA_TIMEZONE,
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(d)
        );
    } catch {
        return isoDate;
    }
}

export function formatBogotaMonthHeading(isoDate: string): string {
    const d = new Date(`${isoDate.slice(0, 7)}-15T12:00:00-05:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    try {
        return capitalizeFirstEs(
            new Intl.DateTimeFormat('es-CO', {
                timeZone: BOGOTA_TIMEZONE,
                month: 'long',
                year: 'numeric',
            }).format(d)
        );
    } catch {
        return isoDate.slice(0, 7);
    }
}

export function generateAgendaIdempotencyKey(prefix: string = 'm08'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}:${crypto.randomUUID()}`;
    }
    return `${prefix}:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatAgendaError(err: unknown): AgendaServiceErrorDetails {
    if (!err || typeof err !== 'object') {
        return {
            code: M08_ERROR_NAMES.UNKNOWN_ERROR,
            message: 'Ocurrió un error inesperado al consultar o guardar la agenda.',
        };
    }

    const e = err as { code?: string; message?: string; status?: number; hint?: string | null };
    const code = e.code || '';
    const msg = e.message || '';

    if (
        code === M08_SQLSTATE_CODES.CONCURRENCY_CONFLICT ||
        e.status === 409 ||
        msg.includes('PT409') ||
        msg.toLowerCase().includes('conflicto de concurrencia')
    ) {
        return {
            code: M08_ERROR_NAMES.CONCURRENCY_CONFLICT,
            message:
                msg ||
                'Conflicto de concurrencia: esta cita fue modificada en otro dispositivo. Recarga la agenda.',
            httpStatus: 409,
            hint: e.hint,
        };
    }

    if (code === M08_SQLSTATE_CODES.OVERLAP_CONFLICT || msg.includes('M08_OVERLAP_CONFLICT')) {
        return {
            code: M08_ERROR_NAMES.OVERLAP_CONFLICT,
            message: msg.replace(/^M08_OVERLAP_CONFLICT:\s*/i, ''),
            httpStatus: 409,
            hint: e.hint,
        };
    }

    if (code === M08_SQLSTATE_CODES.UNAUTHORIZED) {
        return {
            code: M08_ERROR_NAMES.UNAUTHORIZED,
            message: msg || 'Solo la diseñadora o el administrador pueden acceder a la Agenda del Atelier.',
            httpStatus: 403,
        };
    }

    if (code === M08_SQLSTATE_CODES.CHECK_VIOLATION || code === M08_SQLSTATE_CODES.FK_VIOLATION) {
        return {
            code: M08_ERROR_NAMES.VALIDATION_ERROR,
            message: msg || 'Datos de agenda inválidos o referencia inexistente.',
            httpStatus: 400,
        };
    }

    return {
        code: M08_ERROR_NAMES.UNKNOWN_ERROR,
        message: msg || 'Error en operación de Agenda del Atelier.',
        httpStatus: e.status,
    };
}

/**
 * Detector preventivo en cliente de traslapes horarios en el mismo espacio físico.
 */
export function findLocalSpaceOverlaps(
    items: UnifiedAgendaItem[],
    locationSpace: AtelierLocationSpace,
    startsAtIso: string,
    endsAtIso: string,
    excludeAppointmentId?: string | null
): UnifiedAgendaItem[] {
    if (locationSpace === 'virtual') return [];
    const s = new Date(startsAtIso).getTime();
    const e = new Date(endsAtIso).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return [];

    return items.filter((item) => {
        if (item.source_kind !== 'm08_appointment') return false;
        if (excludeAppointmentId && item.appointment_id === excludeAppointmentId) return false;
        if (item.location_space !== locationSpace) return false;
        if (!['scheduled', 'confirmed', 'rescheduled'].includes(item.status)) return false;
        const iStart = new Date(item.starts_at).getTime();
        const iEnd = new Date(item.ends_at).getTime();
        return iStart < e && iEnd > s;
    });
}

export function computeAgendaOverview(
    items: UnifiedAgendaItem[],
    todayBogota: string = getBogotaIsoDate()
): AgendaOverviewSummary {
    const sevenDaysEnd = addDaysToBogotaDate(todayBogota, 7);

    const activeItems = items.filter((i) => i.status !== 'cancelled');
    const todayItems = activeItems.filter((i) => i.bogota_date === todayBogota);

    const weekFittingsCount = activeItems.filter(
        (i) =>
            i.bogota_date >= todayBogota &&
            i.bogota_date <= sevenDaysEnd &&
            ['toile_fitting', 'garment_fitting', 'final_fitting', 'alteration_review'].includes(i.appointment_type)
    ).length;

    const upcomingDeliveriesCount = activeItems.filter(
        (i) =>
            i.bogota_date >= todayBogota &&
            i.bogota_date <= sevenDaysEnd &&
            ['delivery_ceremony', 'pickup_return'].includes(i.appointment_type)
    ).length;

    const pendingConfirmationCount = activeItems.filter(
        (i) => i.source_kind === 'm08_appointment' && i.status === 'scheduled' && i.bogota_date >= todayBogota
    ).length;

    const upcomingItems = activeItems
        .filter((i) => i.bogota_date >= todayBogota && i.status !== 'completed' && i.status !== 'no_show')
        .slice(0, 6);

    return {
        todayCount: todayItems.length,
        weekFittingsCount,
        upcomingDeliveriesCount,
        pendingConfirmationCount,
        todayItems,
        upcomingItems,
    };
}

// ==============================================================================
// ENVOLTORIOS DE LAS 4 RPCS DE SUPABASE (M08)
// ==============================================================================

export async function fetchAtelierAgenda(
    fromIso?: string | null,
    toIso?: string | null
): Promise<{ data: FetchAtelierAgendaResult | null; error: AgendaServiceErrorDetails | null }> {
    try {
        const { data, error } = await supabase.rpc('fetch_atelier_agenda_m08', {
            p_from: fromIso ?? null,
            p_to: toIso ?? null,
        });
        if (error) {
            return { data: null, error: formatAgendaError(error) };
        }
        return { data: data as FetchAtelierAgendaResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatAgendaError(err) };
    }
}

export async function scheduleAtelierAppointment(
    dto: ScheduleAppointmentDTO
): Promise<{ data: AgendaMutationRpcResult | null; error: AgendaServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateAgendaIdempotencyKey('schedule');
    try {
        const { data, error } = await supabase.rpc('schedule_atelier_appointment_m08', {
            p_title: dto.title.trim(),
            p_starts_at: dto.startsAt,
            p_ends_at: dto.endsAt,
            p_idempotency_key: idempotencyKey,
            p_appointment_type: dto.appointmentType,
            p_location_space: dto.locationSpace,
            p_client_id: dto.clientId ?? null,
            p_person_id: dto.personId ?? null,
            p_creation_id: dto.creationId ?? null,
            p_fitting_session_id: dto.fittingSessionId ?? null,
            p_campaign_id: dto.campaignId ?? null,
            p_supplier_id: dto.supplierId ?? null,
            p_assigned_staff: dto.assignedStaff?.trim() || null,
            p_preparation_notes: dto.preparationNotes?.trim() || null,
            p_client_visibility: dto.clientVisibility ?? 'internal_only',
            p_initial_status: dto.initialStatus ?? 'scheduled',
        });
        if (error) {
            return { data: null, error: formatAgendaError(error) };
        }
        return { data: data as AgendaMutationRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatAgendaError(err) };
    }
}

export async function updateAtelierAppointment(
    dto: UpdateAppointmentDTO
): Promise<{ data: AgendaMutationRpcResult | null; error: AgendaServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateAgendaIdempotencyKey('update');
    try {
        const { data, error } = await supabase.rpc('update_atelier_appointment_m08', {
            p_appointment_id: dto.appointmentId,
            p_expected_row_version: dto.expectedRowVersion,
            p_idempotency_key: idempotencyKey,
            p_title: dto.title?.trim() ?? null,
            p_appointment_type: dto.appointmentType ?? null,
            p_status: dto.status ?? null,
            p_starts_at: dto.startsAt ?? null,
            p_ends_at: dto.endsAt ?? null,
            p_location_space: dto.locationSpace ?? null,
            p_assigned_staff: dto.assignedStaff !== undefined ? dto.assignedStaff : null,
            p_preparation_notes: dto.preparationNotes !== undefined ? dto.preparationNotes : null,
            p_outcome_notes: dto.outcomeNotes !== undefined ? dto.outcomeNotes : null,
            p_client_visibility: dto.clientVisibility ?? null,
            p_clear_creation: dto.clearCreation ?? false,
            p_creation_id: dto.creationId ?? null,
            p_clear_client: dto.clearClient ?? false,
            p_client_id: dto.clientId ?? null,
            p_supplier_id: dto.supplierId ?? null,
        });
        if (error) {
            return { data: null, error: formatAgendaError(error) };
        }
        return { data: data as AgendaMutationRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatAgendaError(err) };
    }
}

export async function cancelAtelierAppointment(
    dto: CancelAppointmentDTO
): Promise<{ data: AgendaMutationRpcResult | null; error: AgendaServiceErrorDetails | null }> {
    const idempotencyKey = dto.idempotencyKey?.trim() || generateAgendaIdempotencyKey('cancel');
    try {
        const { data, error } = await supabase.rpc('cancel_atelier_appointment_m08', {
            p_appointment_id: dto.appointmentId,
            p_expected_row_version: dto.expectedRowVersion,
            p_cancellation_reason: dto.cancellationReason.trim(),
            p_idempotency_key: idempotencyKey,
        });
        if (error) {
            return { data: null, error: formatAgendaError(error) };
        }
        return { data: data as AgendaMutationRpcResult, error: null };
    } catch (err: unknown) {
        return { data: null, error: formatAgendaError(err) };
    }
}
