// ==============================================================================
// ATELIER DIGITAL — SERVICIO DE EXPORTACIÓN Y COMPARTICIÓN: MÓDULO 08 — AGENDA
// Archivo: src/services/agendaExportService.ts
// ==============================================================================
// Solo lectura: prepara rangos en America/Bogota, deduplica compromisos,
// aplica privacidad protegida por defecto y genera PDF/Impresión A4, Excel XLSX,
// archivos .ics (RFC 5545) y enlaces profundos para Google Calendar y Outlook.
// ==============================================================================

import { Platform, Share } from 'react-native';
import * as XLSX from 'xlsx';
import {
    APPOINTMENT_STATUS_META,
    APPOINTMENT_TYPE_LABELS,
    AGENDA_SOURCE_META,
    LOCATION_SPACE_LABELS,
} from '../components/agenda/agendaLabels';
import {
    AgendaExportDateRange,
    AgendaExportFilterSummary,
    AgendaExportPeriodMode,
    AgendaExportPreparedDataset,
    AgendaPrivacyLevel,
    ExternalCalendarConnectorDescriptor,
    UnifiedAgendaItem,
} from '../types/agenda';
import {
    extractBogotaDateAndTime,
    formatBogotaDateHeading,
    formatBogotaMonthHeading,
    getBogotaIsoDate,
    getBogotaWeekDates,
} from './agendaService';

export const EXTERNAL_SYNC_CONNECTORS: ExternalCalendarConnectorDescriptor[] = [
    {
        provider: 'google',
        label: 'Google Calendar (Sincronización automática)',
        status: 'not_configured',
        badgeText: 'Funcionalidad futura no disponible',
        detailText:
            'Requiere integración OAuth 2.0 y autorización de cuenta Google en backend antes de habilitar envío automático.',
    },
    {
        provider: 'outlook',
        label: 'Microsoft Outlook / M365 (Sincronización automática)',
        status: 'not_configured',
        badgeText: 'Funcionalidad futura no disponible',
        detailText:
            'Requiere registro de aplicación en Microsoft Entra ID (Graph API) y revocación de tokens en servidor.',
    },
    {
        provider: 'apple',
        label: 'Apple Calendar / iCloud (Sincronización automática)',
        status: 'not_configured',
        badgeText: 'Funcionalidad futura no disponible',
        detailText:
            'Requiere configuración CalDAV / credenciales específicas de app en servidor. Actualmente disponible mediante descarga .ics.',
    },
];

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeIcsText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\r\n|\r|\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const SARTORIAL_ATTRIBUTES_REGEX = new RegExp(
    [
        '\\bcuello\\s+(?:mao|camisero|smoking|redondo|v|halter|barco|cisne|perkins|italiano|franc[eé]s|solapa)\\b',
        '\\bmanga\\s+(?:ragl[aá]n|sastre|abullonada|corta|larga|francesa|japonesa|obispo|campana)\\b',
        '\\bcorte\\s+(?:imperio|princesa|sirena|evas[eé]|recto|franc[eé]s|asim[eé]trico)\\b',
        '\\bl[ií]nea\\s+[ab]\\b',
        '\\bdos[- ]piezas\\b',
        '\\btres[- ]piezas\\b',
        '\\bdoble\\s+abotonadura\\b',
        '\\bsolapa\\s+(?:chal|muesca|pico)\\b',
        '\\bplisad[oa]\\b',
        '\\bdrap[eé]ad[oa]\\b',
        '\\bbordad[oa]\\b',
        '\\bpedrer[ií]a\\b',
        '\\bseda(?:\\s+salvaje)?\\b',
        '\\bmikado\\b',
        '\\bchantilly\\b',
        '\\btweed\\b',
        '\\blana\\b',
        '\\blino\\b',
        '\\balgod[oó]n\\b',
        '\\bbrocado\\b',
        '\\borganza\\b',
        '\\btul\\b',
        '\\bterciopelo\\b',
        '\\bcrep[eé]\\b',
        '\\bsat[eé]n\\b',
        '\\braso\\b',
        '\\btafet[aá]n\\b',
        '\\bgasa\\b',
        '\\bchif[oó]n\\b',
        '\\bencaje\\b',
        '\\bcuero\\b',
        '\\bpre[- ]fall(?:\\s+\\d{4})?\\b',
        '\\bspring[- ]summer(?:\\s+\\d{4})?\\b',
        '\\bfall[- ]winter(?:\\s+\\d{4})?\\b',
        '\\bprimavera[- ]verano(?:\\s+\\d{4})?\\b',
        '\\boto[ñn]o[- ]invierno(?:\\s+\\d{4})?\\b',
        '\\balta\\s+costura\\b',
        '\\bhaute\\s+couture\\b',
        '\\bedici[oó]n\\s+(?:limitada|especial)\\b',
        '\\bc[aá]psula\\b',
        '\\bbespoke\\b',
        '\\batelier\\b',
        '\\bpr[eê]t[- ][aà][- ]porter\\b',
        '\\bnovia\\b',
        '\\bgala\\b',
        '\\bcoctel\\b',
        '\\bc[oó]ctel\\b',
        '\\bquincea[ñn]era\\b',
        '\\bgraduaci[oó]n\\b',
        '\\bceremonia\\b',
        '\\bazul(?:\\s+noche)?\\b',
        '\\bnegro\\b',
        '\\bblanco(?:\\s+marfil)?\\b',
        '\\bmarfil\\b',
        '\\brojo\\b',
        '\\bverde(?:\\s+esmeralda)?\\b',
        '\\besmeralda\\b',
        '\\bdorad[oa]\\b',
        '\\bplatead[oa]\\b',
        '\\bchampagne\\b',
        '\\bburdeos\\b',
        '\\bc\\d{2}\\b',
        '\\btalla\\s+\\w+\\b',
        '\\bmuestra\\s+\\d+\\b',
        '\\bprototipo\\s+\\w+\\b',
        '\\bprueba\\s+\\d+\\b',
    ].join('|'),
    'i'
);

export const SARTORIAL_UNIFORM_KEYWORDS_REGEX =
    /\b(escolar|uniforme|colegio|diario|jardinera|delantal|camibuso|chomba|prom|senior)\b/i;

export const SARTORIAL_INSTITUTIONAL_CLIENT_REGEX =
    /\b(colegio|escuela|liceo|gimnasio|instituto|academia|fundaci[oó]n|compa[ñn][ií]a|ballet|coro|orquesta|uniformes)\b/i;

export interface CreationPrivacyContext {
    personName?: string | null;
    clientName?: string | null;
    campaignId?: string | null;
    appointmentType?: string | null;
    sourceKind?: string | null;
}

export function maskCreationNameForExternal(
    creationName?: string | null,
    context?: CreationPrivacyContext | null
): string {
    if (!creationName) return '';
    const cleaned = creationName.trim();
    if (!cleaned) return '';

    // 1. Coincidencia directa con person_name conocido del sujeto
    if (context?.personName && context.personName.trim()) {
        const trimmedPerson = context.personName.trim();
        const rxPerson = new RegExp(escapeRegExp(trimmedPerson), 'gi');
        if (rxPerson.test(cleaned)) {
            return cleaned.replace(rxPerson, 'Participante');
        }

        const personTokens = trimmedPerson.split(/\s+/).filter(Boolean);
        if (personTokens.length >= 2) {
            const firstName = personTokens[0];
            const lastName = personTokens[personTokens.length - 1];
            const rxShort = new RegExp(`\\b${escapeRegExp(firstName)}\\b.*\\b${escapeRegExp(lastName)}\\b`, 'i');
            if (rxShort.test(cleaned)) {
                const sepMatch = cleaned.match(/^(.+?)\s+(?:—|–|-)\s+(.+)$/);
                if (sepMatch && rxShort.test(sepMatch[2])) {
                    return `${sepMatch[1].trim()} — Participante`;
                }
            }
        }
    }

    // 2. Coincidencia con client_name de persona física en encargos particulares
    if (context?.clientName && context.clientName.trim()) {
        const trimmedClient = context.clientName.trim();
        if (!SARTORIAL_INSTITUTIONAL_CLIENT_REGEX.test(trimmedClient) && !trimmedClient.startsWith('[')) {
            const rxClient = new RegExp(escapeRegExp(trimmedClient), 'gi');
            if (rxClient.test(cleaned)) {
                const masked = maskClientNameForExternal(trimmedClient);
                return cleaned.replace(rxClient, masked || 'Participante');
            }
        }
    }

    // 3. Evaluar separadores típicos de confección (" — ", " – ", " - ")
    const separatorMatch = cleaned.match(/^(.+?)\s+(?:—|–|-)\s+(.+)$/);
    if (!separatorMatch) {
        return cleaned;
    }

    const garmentPart = separatorMatch[1].trim();
    const suffixPart = separatorMatch[2].trim();

    // 4. Prioridad colectiva/escolar: si hay evidencia positiva de campaña, colegio o uniforme,
    // el sufijo tras el separador corresponde siempre al participante/estudiante medido,
    // garantizando su enmascaramiento incluso si su nombre o apellido coincide con términos textiles o colores (ej: Lino, Gala, Blanco, Azul, etc.)
    const isCollective = Boolean(
        context?.campaignId ||
        context?.appointmentType === 'group_campaign' ||
        context?.sourceKind === 'm02_measurement_campaign' ||
        (context?.clientName && SARTORIAL_INSTITUTIONAL_CLIENT_REGEX.test(context.clientName)) ||
        SARTORIAL_UNIFORM_KEYWORDS_REGEX.test(garmentPart) ||
        SARTORIAL_UNIFORM_KEYWORDS_REGEX.test(cleaned)
    );

    if (isCollective) {
        return `${garmentPart} — Participante`;
    }

    // 5. Para prendas individuales (no colectivas), evaluar lista blanca sartorial legítima (atributos técnicos, cortes, temporadas, telas)
    if (SARTORIAL_ATTRIBUTES_REGEX.test(suffixPart)) {
        return cleaned;
    }

    // 6. Prenda individual de alta costura sin contexto colectivo: preservar íntegra
    return cleaned;
}

export function maskClientNameForExternal(fullName?: string | null): string {
    if (!fullName) return '';
    const cleaned = fullName.trim();
    if (!cleaned) return '';
    if (cleaned.startsWith('[')) return 'Clienta Reservada';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

export interface PrivacyProjectedAgendaFields {
    title: string;
    clientDisplay: string;
    phoneDisplay: string;
    locationDisplay: string;
    notesDisplay: string;
    descriptionText: string;
    creationDisplay: string;
}

export function formatAgendaItemWithPrivacy(
    item: UnifiedAgendaItem,
    privacyLevel: AgendaPrivacyLevel
): PrivacyProjectedAgendaFields {
    const typeLabel = APPOINTMENT_TYPE_LABELS[item.appointment_type] || item.appointment_type;
    const statusLabel = APPOINTMENT_STATUS_META[item.status]?.label || item.status;
    const sourceBadge = AGENDA_SOURCE_META[item.source_kind]?.badge || item.source_kind;
    const spaceLabel =
        item.location_label_override ||
        LOCATION_SPACE_LABELS[item.location_space] ||
        item.location_space;

    if (privacyLevel === 'full_internal') {
        const notesParts = [
            item.preparation_notes ? `Preparación: ${item.preparation_notes}` : '',
            item.outcome_notes ? `Resultado: ${item.outcome_notes}` : '',
            item.cancellation_reason ? `Cancelación: ${item.cancellation_reason}` : '',
        ].filter(Boolean);

        const descLines = [
            `Tipo: ${typeLabel} (${sourceBadge})`,
            `Estado: ${statusLabel}`,
            item.client_name
                ? `Clienta: ${item.client_name}${item.person_name ? ` · Sujeto: ${item.person_name}` : ''}`
                : 'Actividad interna / proveedor',
            item.client_phone ? `Teléfono: ${item.client_phone}` : '',
            item.creation_name ? `Creación: ${item.creation_name}` : '',
            item.supplier_name ? `Proveedor: ${item.supplier_name}` : '',
            item.assigned_staff ? `Responsable: ${item.assigned_staff}` : '',
            ...notesParts,
            'Zona horaria: America/Bogota (UTC-5)',
        ].filter(Boolean);

        return {
            title: item.title,
            clientDisplay: item.client_name || 'Sin clienta (Interna / Proveedor)',
            phoneDisplay: item.client_phone || '',
            locationDisplay: `Atelier By Katherine Carroll · ${spaceLabel}`,
            notesDisplay: notesParts.join(' | '),
            descriptionText: descLines.join('\n'),
            creationDisplay: item.creation_name || '',
        };
    }

    // Modo protected_external (predeterminado para compartir fuera del Atelier)
    const maskedClient = maskClientNameForExternal(item.client_name);
    let safeTitle = item.title;
    if (item.client_name && maskedClient) {
        const rx = new RegExp(escapeRegExp(item.client_name.trim()), 'gi');
        safeTitle = safeTitle.replace(rx, maskedClient);
    }
    if (item.person_name) {
        const rxPerson = new RegExp(escapeRegExp(item.person_name.trim()), 'gi');
        safeTitle = safeTitle.replace(rxPerson, 'Participante');
    }
    if (!safeTitle.trim()) {
        safeTitle = `${typeLabel}${maskedClient ? ` · ${maskedClient}` : ''}`;
    }

    const maskedCreation = maskCreationNameForExternal(item.creation_name, {
        personName: item.person_name,
        clientName: item.client_name,
        campaignId: item.campaign_id,
        appointmentType: item.appointment_type,
        sourceKind: item.source_kind,
    });

    const descLines = [
        `${typeLabel} (${sourceBadge})`,
        `Estado: ${statusLabel}`,
        maskedClient ? `Clienta: ${maskedClient}` : 'Compromiso interno / proveedor',
        maskedCreation ? `Encargo: ${maskedCreation}` : '',
        item.supplier_name ? `Proveedor: ${item.supplier_name}` : '',
        item.assigned_staff ? `Responsable: ${item.assigned_staff}` : '',
        'Detalle confidencial resguardado en Atelier Digital · Hora Colombia (America/Bogota)',
    ].filter(Boolean);

    return {
        title: safeTitle,
        clientDisplay: maskedClient || 'Sin clienta (Interna / Proveedor)',
        phoneDisplay: '',
        locationDisplay: `Atelier By Katherine Carroll · ${spaceLabel}`,
        notesDisplay: '',
        descriptionText: descLines.join('\n'),
        creationDisplay: maskedCreation,
    };
}

export function resolveAgendaExportDateRange(
    mode: AgendaExportPeriodMode,
    anchorDate: string,
    customFromDate?: string,
    customToDate?: string
): AgendaExportDateRange {
    const safeAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorDate) ? anchorDate : getBogotaIsoDate();

    if (mode === 'day') {
        return {
            fromDate: safeAnchor,
            toDate: safeAnchor,
            label: formatBogotaDateHeading(safeAnchor),
        };
    }

    if (mode === 'week') {
        const week = getBogotaWeekDates(safeAnchor);
        return {
            fromDate: week[0],
            toDate: week[6],
            label: `Semana ${week[0]} → ${week[6]}`,
        };
    }

    if (mode === 'month') {
        const monthPrefix = safeAnchor.slice(0, 7);
        const year = Number(monthPrefix.slice(0, 4));
        const month = Number(monthPrefix.slice(5, 7));
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const fromDate = `${monthPrefix}-01`;
        const toDate = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;
        return {
            fromDate,
            toDate,
            label: `${formatBogotaMonthHeading(safeAnchor)} (${fromDate} → ${toDate})`,
        };
    }

    const validFrom =
        customFromDate && /^\d{4}-\d{2}-\d{2}$/.test(customFromDate) ? customFromDate : safeAnchor;
    const validTo =
        customToDate && /^\d{4}-\d{2}-\d{2}$/.test(customToDate) ? customToDate : validFrom;

    const fromDate = validFrom <= validTo ? validFrom : validTo;
    const toDate = validFrom <= validTo ? validTo : validFrom;
    return {
        fromDate,
        toDate,
        label: fromDate === toDate ? formatBogotaDateHeading(fromDate) : `Rango ${fromDate} → ${toDate}`,
    };
}

function getCanonicalEntityKeys(item: UnifiedAgendaItem): string[] {
    const keys: string[] = [`id:${item.agenda_item_id}`];
    if (item.source_kind === 'm08_appointment' && item.appointment_id) {
        keys.push(`appt:${item.appointment_id}`);
    }
    if (item.fitting_session_id) {
        keys.push(`fitting:${item.fitting_session_id}`);
    } else if (item.source_kind === 'm06_fitting_session') {
        keys.push(`fitting:${item.source_id}`);
    }
    if (item.source_kind === 'm03_delivery_milestone') {
        keys.push(`delivery:${item.creation_id || item.source_id}`);
    }
    if (item.source_kind === 'm02_measurement_campaign') {
        keys.push(`campaign:${item.campaign_id || item.source_id}`);
    }
    return keys;
}

export function deduplicateAgendaItemsForExport(
    items: UnifiedAgendaItem[]
): { items: UnifiedAgendaItem[]; duplicatesRemoved: number } {
    // Priorizar citas nativas m08_appointment sobre proyecciones heredadas si comparten enlace
    const sortedForPriority = [...items].sort((a, b) => {
        if (a.source_kind === 'm08_appointment' && b.source_kind !== 'm08_appointment') return -1;
        if (a.source_kind !== 'm08_appointment' && b.source_kind === 'm08_appointment') return 1;
        return 0;
    });

    const seenKeys = new Set<string>();
    const unique: UnifiedAgendaItem[] = [];
    let duplicatesRemoved = 0;

    for (const item of sortedForPriority) {
        const entityKeys = getCanonicalEntityKeys(item);
        const alreadySeen = entityKeys.some((k) => seenKeys.has(k));
        if (alreadySeen) {
            duplicatesRemoved += 1;
            continue;
        }
        for (const k of entityKeys) seenKeys.add(k);
        unique.push(item);
    }

    unique.sort((a, b) => {
        const d = a.bogota_date.localeCompare(b.bogota_date);
        if (d !== 0) return d;
        const t = a.bogota_start_time.localeCompare(b.bogota_start_time);
        if (t !== 0) return t;
        return a.title.localeCompare(b.title);
    });

    return { items: unique, duplicatesRemoved };
}

export function prepareAgendaExportDataset(params: {
    items: UnifiedAgendaItem[];
    periodMode: AgendaExportPeriodMode;
    range: AgendaExportDateRange;
    privacyLevel: AgendaPrivacyLevel;
    filterSummary: AgendaExportFilterSummary;
}): AgendaExportPreparedDataset {
    const inPeriod = params.items.filter((item) => {
        if (item.bogota_date < params.range.fromDate || item.bogota_date > params.range.toDate) {
            return false;
        }
        if (!params.filterSummary.includeCancelled && item.status === 'cancelled') {
            return false;
        }
        return true;
    });

    const { items: deduped, duplicatesRemoved } = deduplicateAgendaItemsForExport(inPeriod);
    const nowParts = extractBogotaDateAndTime(new Date().toISOString());

    return {
        periodMode: params.periodMode,
        range: params.range,
        privacyLevel: params.privacyLevel,
        generatedAtBogota: `${nowParts.date} ${nowParts.time} (America/Bogota UTC-5)`,
        totalBeforeDedup: inPeriod.length,
        duplicatesRemoved,
        items: deduped,
        filterSummary: params.filterSummary,
    };
}

function getDurationMinutes(item: UnifiedAgendaItem): number {
    const startMs = new Date(item.starts_at).getTime();
    const endMs = new Date(item.ends_at).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 60;
    return Math.round((endMs - startMs) / 60_000);
}

export function generatePrintableAgendaHtml(dataset: AgendaExportPreparedDataset): string {
    const grouped = new Map<string, UnifiedAgendaItem[]>();
    for (const item of dataset.items) {
        const list = grouped.get(item.bogota_date) || [];
        list.push(item);
        grouped.set(item.bogota_date, list);
    }

    const totalCount = dataset.items.length;
    const fittingsCount = dataset.items.filter((i) =>
        ['toile_fitting', 'garment_fitting', 'final_fitting', 'alteration_review'].includes(i.appointment_type)
    ).length;
    const deliveriesCount = dataset.items.filter((i) =>
        ['delivery_ceremony', 'pickup_return'].includes(i.appointment_type)
    ).length;
    const confirmedCount = dataset.items.filter((i) => i.status === 'confirmed').length;

    const filterBadges = [
        dataset.filterSummary.respectActiveFilters ? 'Filtros de pantalla aplicados' : 'Sin filtros de tipo/espacio',
        dataset.filterSummary.sourceLabel ? `Origen: ${dataset.filterSummary.sourceLabel}` : '',
        dataset.filterSummary.spaceLabel ? `Espacio: ${dataset.filterSummary.spaceLabel}` : '',
        dataset.filterSummary.searchQuery ? `Búsqueda: "${dataset.filterSummary.searchQuery}"` : '',
        dataset.filterSummary.includeCancelled ? 'Incluye canceladas' : 'Solo activas/programadas',
    ]
        .filter(Boolean)
        .map((b) => `<span class="meta-pill">${escapeHtml(b)}</span>`)
        .join('');

    const privacyBadge =
        dataset.privacyLevel === 'protected_external'
            ? 'Privacidad protegida (clientas abreviadas, sin teléfonos ni notas internas)'
            : 'Uso interno completo del Atelier (incluye datos completos y notas)';

    const sectionsHtml =
        totalCount === 0
            ? `<div class="empty-box">No existen compromisos registrados para este período y filtros seleccionados.</div>`
            : Array.from(grouped.entries())
                  .map(([dateKey, dayItems]) => {
                      const rowsHtml = dayItems
                          .map((it) => {
                              const formatted = formatAgendaItemWithPrivacy(it, dataset.privacyLevel);
                              const typeLabel = APPOINTMENT_TYPE_LABELS[it.appointment_type] || it.appointment_type;
                              const statusMeta = APPOINTMENT_STATUS_META[it.status] || APPOINTMENT_STATUS_META.scheduled;
                              const sourceMeta = AGENDA_SOURCE_META[it.source_kind] || AGENDA_SOURCE_META.m08_appointment;
                              const spaceLabel =
                                  it.location_label_override ||
                                  LOCATION_SPACE_LABELS[it.location_space] ||
                                  it.location_space;
                              const durMins = getDurationMinutes(it);

                              return `
                                <div class="agenda-row">
                                    <div class="agenda-time">
                                        <div class="time-pill">${escapeHtml(it.bogota_start_time)} – ${escapeHtml(it.bogota_end_time)}</div>
                                        <div class="dur-sub">${durMins} min · BOG</div>
                                    </div>
                                    <div class="agenda-main">
                                        <div class="row-top">
                                            <strong class="row-title">${escapeHtml(formatted.title)}</strong>
                                            <div class="badges">
                                                <span class="badge">${escapeHtml(sourceMeta.badge)}</span>
                                                <span class="badge badge-status">${escapeHtml(statusMeta.label)}</span>
                                            </div>
                                        </div>
                                        <div class="row-meta">
                                            <span>✦ ${escapeHtml(typeLabel)}</span>
                                            <span>· 📍 ${escapeHtml(spaceLabel)}</span>
                                            <span>· 👤 ${escapeHtml(formatted.clientDisplay)}${formatted.phoneDisplay ? ` (${escapeHtml(formatted.phoneDisplay)})` : ''}</span>
                                        </div>
                                        ${
                                            formatted.creationDisplay || it.supplier_name || it.assigned_staff
                                                ? `<div class="row-meta">
                                                    ${formatted.creationDisplay ? `<span>✂️ Encargo: ${escapeHtml(formatted.creationDisplay)}</span>` : ''}
                                                    ${it.supplier_name ? `<span>· 🧵 Proveedor: ${escapeHtml(it.supplier_name)}</span>` : ''}
                                                    ${it.assigned_staff ? `<span>· 👥 ${escapeHtml(it.assigned_staff)}</span>` : ''}
                                                  </div>`
                                                : ''
                                        }
                                        ${
                                            formatted.notesDisplay
                                                ? `<div class="row-notes">${escapeHtml(formatted.notesDisplay)}</div>`
                                                : ''
                                        }
                                    </div>
                                </div>`;
                          })
                          .join('');

                      return `
                        <section class="day-group">
                            <div class="day-header">
                                <h2>${escapeHtml(formatBogotaDateHeading(dateKey))}</h2>
                                <span>${dayItems.length} ${dayItems.length === 1 ? 'compromiso' : 'compromisos'}</span>
                            </div>
                            ${rowsHtml}
                        </section>`;
                  })
                  .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agenda del Atelier · By Katherine Carroll (${escapeHtml(dataset.range.fromDate)} a ${escapeHtml(dataset.range.toDate)})</title>
    <style>
        @page { size: A4 portrait; margin: 14mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            background: #F8F2E9;
            color: #171411;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .toolbar {
            background: #171411;
            color: #FFFFFF;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .toolbar-actions { display: flex; gap: 10px; }
        .btn-gold {
            background: #A78350;
            color: #171411;
            border: none;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-dark {
            background: #2C2722;
            color: #FFFFFF;
            border: 1px solid #A78350;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
        }
        .sheet {
            max-width: 210mm;
            margin: 18px auto;
            background: #FFFFFF;
            border: 1px solid #E6D9C8;
            border-radius: 10px;
            padding: 24px 28px;
        }
        .brand-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            border-bottom: 2px solid #A78350;
            padding-bottom: 14px;
            margin-bottom: 14px;
            flex-wrap: wrap;
        }
        .eyebrow {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.8px;
            color: #A78350;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        h1 {
            margin: 0;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 24px;
            color: #171411;
        }
        .subtitle { font-size: 12px; color: #766B62; margin-top: 4px; }
        .period-box {
            background: #F8F2E9;
            border: 1px solid #E6D9C8;
            border-radius: 8px;
            padding: 10px 14px;
            text-align: right;
            min-width: 220px;
        }
        .period-box strong { display: block; font-size: 13px; color: #171411; }
        .period-box span { font-size: 11px; color: #766B62; }
        .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 12px;
        }
        .kpi {
            background: #FAF7F2;
            border: 1px solid #E6D9C8;
            border-radius: 8px;
            padding: 8px 10px;
        }
        .kpi-label { font-size: 10px; text-transform: uppercase; color: #766B62; font-weight: 700; }
        .kpi-val { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #171411; }
        .meta-strip { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .meta-pill {
            font-size: 10px;
            background: #F8F2E9;
            border: 1px solid #E6D9C8;
            border-radius: 999px;
            padding: 3px 9px;
            color: #766B62;
        }
        .privacy-note {
            font-size: 11px;
            background: #FAF7F2;
            border-left: 3px solid #A78350;
            padding: 7px 10px;
            margin-bottom: 16px;
            color: #766B62;
        }
        .day-group { margin-bottom: 16px; break-inside: avoid; }
        .day-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 1px solid #E6D9C8;
            padding-bottom: 4px;
            margin-bottom: 8px;
        }
        .day-header h2 {
            margin: 0;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 15px;
            color: #171411;
        }
        .day-header span { font-size: 11px; color: #8A6A4A; font-weight: 700; }
        .agenda-row {
            display: flex;
            gap: 12px;
            border: 1px solid #E6D9C8;
            border-left: 3px solid #A78350;
            border-radius: 8px;
            padding: 9px 11px;
            margin-bottom: 7px;
            break-inside: avoid;
        }
        .agenda-time { width: 118px; flex-shrink: 0; }
        .time-pill {
            background: #171411;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 7px;
            border-radius: 5px;
            text-align: center;
        }
        .dur-sub { font-size: 10px; color: #766B62; text-align: center; margin-top: 4px; }
        .agenda-main { flex: 1; min-width: 0; }
        .row-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 4px;
        }
        .row-title { font-family: Georgia, serif; font-size: 14px; color: #171411; }
        .badges { display: flex; gap: 4px; flex-shrink: 0; }
        .badge {
            font-size: 10px;
            font-weight: 700;
            border: 1px solid #E6D9C8;
            background: #F8F2E9;
            color: #8A6A4A;
            padding: 2px 7px;
            border-radius: 999px;
        }
        .badge-status { background: #FFFFFF; color: #171411; }
        .row-meta { font-size: 11px; color: #766B62; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
        .row-notes {
            margin-top: 6px;
            background: #FAF7F2;
            border: 1px solid #E6D9C8;
            border-radius: 5px;
            padding: 6px 8px;
            font-size: 11px;
            color: #171411;
        }
        .empty-box {
            border: 1px dashed #E6D9C8;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            color: #766B62;
            font-size: 13px;
        }
        .footer {
            border-top: 1px solid #E6D9C8;
            margin-top: 18px;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #968A7E;
        }
        @media print {
            body { background: #FFFFFF; }
            .no-print { display: none !important; }
            .sheet { margin: 0; border: none; border-radius: 0; padding: 0; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="toolbar no-print">
        <span style="font-size:12px;font-weight:700;">✦ Agenda Editorial A4 · By Katherine Carroll</span>
        <div class="toolbar-actions">
            <button class="btn-gold" onclick="window.print()">🖨️ Imprimir / Guardar PDF (A4)</button>
            <button class="btn-dark" onclick="window.close()">✕ Cerrar</button>
        </div>
    </div>
    <main class="sheet">
        <header class="brand-header">
            <div>
                <div class="eyebrow">✦ Atelier de Autor · By Katherine Carroll</div>
                <h1>Agenda Consolidada del Atelier</h1>
                <div class="subtitle">Alta Costura &amp; Sastrería Bespoke · Zona horaria Colombia (America/Bogota UTC-5)</div>
            </div>
            <div class="period-box">
                <strong>${escapeHtml(dataset.range.label)}</strong>
                <span>Generado: ${escapeHtml(dataset.generatedAtBogota)}</span>
            </div>
        </header>

        <section class="kpi-row">
            <div class="kpi"><div class="kpi-label">Compromisos</div><div class="kpi-val">${totalCount}</div></div>
            <div class="kpi"><div class="kpi-label">Confirmados</div><div class="kpi-val">${confirmedCount}</div></div>
            <div class="kpi"><div class="kpi-label">Pruebas Fitting</div><div class="kpi-val">${fittingsCount}</div></div>
            <div class="kpi"><div class="kpi-label">Entregas / Recogidas</div><div class="kpi-val">${deliveriesCount}</div></div>
        </section>

        <div class="meta-strip">${filterBadges}</div>
        <div class="privacy-note">🔒 ${escapeHtml(privacyBadge)} · Registros deduplicados (${dataset.duplicatesRemoved} duplicados omitidos)</div>

        ${sectionsHtml}

        <footer class="footer">
            <span>Atelier Digital · Módulo 08 Agenda</span>
            <span>Documento editorial sin firma contractual · Hora oficial America/Bogota</span>
        </footer>
    </main>
</body>
</html>`;
}

export function openAgendaPrintWindow(
    dataset: AgendaExportPreparedDataset,
    autoTriggerPrint: boolean = false
): { ok: boolean; html: string; reason?: string } {
    const html = generatePrintableAgendaHtml(dataset);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.open === 'function') {
        const win = window.open('', '_blank');
        if (win) {
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.focus();
            if (autoTriggerPrint) {
                setTimeout(() => {
                    try {
                        win.print();
                    } catch {
                        // El usuario puede pulsar el botón superior en la ventana emergente
                    }
                }, 250);
            }
            return { ok: true, html };
        }
        return {
            ok: false,
            html,
            reason: 'El navegador bloqueó la ventana emergente de impresión. Usa el botón de vista previa A4 para imprimir o guardar PDF.',
        };
    }
    return {
        ok: false,
        html,
        reason: 'La impresión directa de navegador está disponible desde la versión Web.',
    };
}

export function buildAgendaExcelWorkbook(dataset: AgendaExportPreparedDataset): XLSX.WorkBook {
    const detailRows = dataset.items.map((item) => {
        const formatted = formatAgendaItemWithPrivacy(item, dataset.privacyLevel);
        const typeLabel = APPOINTMENT_TYPE_LABELS[item.appointment_type] || item.appointment_type;
        const statusLabel = APPOINTMENT_STATUS_META[item.status]?.label || item.status;
        const sourceLabel = AGENDA_SOURCE_META[item.source_kind]?.badge || item.source_kind;
        const spaceLabel =
            item.location_label_override ||
            LOCATION_SPACE_LABELS[item.location_space] ||
            item.location_space;

        return {
            'Fecha (BOG)': item.bogota_date,
            'Hora Inicio': item.bogota_start_time,
            'Hora Fin': item.bogota_end_time,
            'Duración (min)': getDurationMinutes(item),
            Título: formatted.title,
            'Tipo de Compromiso': typeLabel,
            Estado: statusLabel,
            Módulo: sourceLabel,
            'Espacio del Atelier': spaceLabel,
            Clienta: formatted.clientDisplay,
            Teléfono: formatted.phoneDisplay || (dataset.privacyLevel === 'protected_external' ? 'Protegido' : ''),
            Creación: formatted.creationDisplay,
            Proveedor: item.supplier_name || '',
            Responsable: item.assigned_staff || '',
            Notas: formatted.notesDisplay || (dataset.privacyLevel === 'protected_external' ? 'Protegido' : ''),
        };
    });

    const summaryRows = [
        { Concepto: 'Atelier', Valor: 'By Katherine Carroll · Atelier Digital (M08)' },
        { Concepto: 'Período Exportado', Valor: dataset.range.label },
        { Concepto: 'Rango de Fechas (BOG)', Valor: `${dataset.range.fromDate} a ${dataset.range.toDate}` },
        { Concepto: 'Zona Horaria', Valor: 'America/Bogota (UTC-5)' },
        { Concepto: 'Modo de Privacidad', Valor: dataset.privacyLevel === 'protected_external' ? 'Protegido externo' : 'Completo interno' },
        { Concepto: 'Generado el', Valor: dataset.generatedAtBogota },
        { Concepto: 'Total Compromisos Exportados', Valor: dataset.items.length },
        { Concepto: 'Duplicados Omitidos', Valor: dataset.duplicatesRemoved },
        { Concepto: 'Filtros Activos Respetados', Valor: dataset.filterSummary.respectActiveFilters ? 'Sí' : 'No' },
        { Concepto: 'Incluye Canceladas', Valor: dataset.filterSummary.includeCancelled ? 'Sí' : 'No' },
    ];

    const wb = XLSX.utils.book_new();
    const wsDetail = XLSX.utils.json_to_sheet(
        detailRows.length > 0
            ? detailRows
            : [{ 'Fecha (BOG)': dataset.range.fromDate, Título: 'Sin compromisos en el período seleccionado' }]
    );
    wsDetail['!cols'] = [
        { wch: 13 },
        { wch: 11 },
        { wch: 11 },
        { wch: 14 },
        { wch: 34 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
        { wch: 26 },
        { wch: 16 },
        { wch: 26 },
        { wch: 20 },
        { wch: 20 },
        { wch: 36 },
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 48 }];

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Compromisos_Agenda');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Periodo');
    return wb;
}

export async function exportAgendaToExcel(
    dataset: AgendaExportPreparedDataset
): Promise<{ ok: boolean; filename: string; rowCount: number; reason?: string }> {
    const filename = `Atelier_Agenda_${dataset.range.fromDate}_a_${dataset.range.toDate}.xlsx`;
    const wb = buildAgendaExcelWorkbook(dataset);

    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { ok: true, filename, rowCount: dataset.items.length };
    }

    return {
        ok: false,
        filename,
        rowCount: dataset.items.length,
        reason: 'La descarga directa de archivo Excel (.xlsx) está habilitada desde el navegador Web.',
    };
}

function toCompactBogotaStamp(dateStr: string, timeStr: string): string {
    const d = dateStr.replace(/-/g, '').slice(0, 8);
    const tParts = timeStr.split(':');
    const hh = String(tParts[0] || '09').padStart(2, '0');
    const mm = String(tParts[1] || '00').padStart(2, '0');
    return `${d}T${hh}${mm}00`;
}

function toUtcDtstamp(isoOrDate: Date = new Date()): string {
    const y = isoOrDate.getUTCFullYear();
    const m = String(isoOrDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(isoOrDate.getUTCDate()).padStart(2, '0');
    const hh = String(isoOrDate.getUTCHours()).padStart(2, '0');
    const mm = String(isoOrDate.getUTCMinutes()).padStart(2, '0');
    const ss = String(isoOrDate.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function generateAgendaIcsContent(
    rawItems: UnifiedAgendaItem[],
    privacyLevel: AgendaPrivacyLevel,
    calendarName: string = 'Agenda Atelier By Katherine Carroll'
): string {
    const { items } = deduplicateAgendaItemsForExport(rawItems);
    const dtstamp = toUtcDtstamp(new Date());
    const singleCancelled = items.length === 1 && items[0].status === 'cancelled';

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//By Katherine Carroll//Atelier Digital M08//ES',
        'CALSCALE:GREGORIAN',
        `METHOD:${singleCancelled ? 'CANCEL' : 'PUBLISH'}`,
        `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
        'X-WR-TIMEZONE:America/Bogota',
        'BEGIN:VTIMEZONE',
        'TZID:America/Bogota',
        'X-LIC-LOCATION:America/Bogota',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:-0500',
        'TZOFFSETTO:-0500',
        'TZNAME:-05',
        'DTSTART:19700101T000000',
        'END:STANDARD',
        'END:VTIMEZONE',
    ];

    for (const item of items) {
        const formatted = formatAgendaItemWithPrivacy(item, privacyLevel);
        const startCompact = toCompactBogotaStamp(item.bogota_date, item.bogota_start_time);
        const endParts = extractBogotaDateAndTime(item.ends_at);
        const endCompact = toCompactBogotaStamp(endParts.date || item.bogota_date, item.bogota_end_time || endParts.time);
        const uid = `m08-${item.source_kind}-${item.appointment_id || item.source_id || item.agenda_item_id}@bykatherinecarroll.com`;
        const icsStatus =
            item.status === 'cancelled'
                ? 'CANCELLED'
                : item.status === 'confirmed' || item.status === 'completed'
                  ? 'CONFIRMED'
                  : 'CONFIRMED';

        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `SEQUENCE:${Math.max(0, item.row_version || 1)}`,
            `DTSTART;TZID=America/Bogota:${startCompact}`,
            `DTEND;TZID=America/Bogota:${endCompact}`,
            `SUMMARY:${escapeIcsText(formatted.title)}`,
            `LOCATION:${escapeIcsText(formatted.locationDisplay)}`,
            `DESCRIPTION:${escapeIcsText(formatted.descriptionText)}`,
            `STATUS:${icsStatus}`,
            'END:VEVENT'
        );
    }

    lines.push('END:VCALENDAR');
    return `${lines.join('\r\n')}\r\n`;
}

export async function downloadAgendaIcs(
    items: UnifiedAgendaItem[],
    privacyLevel: AgendaPrivacyLevel,
    filenameBase: string
): Promise<{ ok: boolean; filename: string; count: number; content: string; reason?: string }> {
    const content = generateAgendaIcsContent(items, privacyLevel);
    const cleanBase = filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanBase || 'atelier_agenda'}.ics`;

    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { ok: true, filename, count: items.length, content };
    }

    try {
        await Share.share({
            title: filename,
            message: content,
        });
        return { ok: true, filename, count: items.length, content };
    } catch {
        return {
            ok: false,
            filename,
            count: items.length,
            content,
            reason: 'No fue posible abrir el selector nativo para compartir el archivo .ics.',
        };
    }
}

export function buildGoogleCalendarUrl(
    item: UnifiedAgendaItem,
    privacyLevel: AgendaPrivacyLevel
): string {
    const formatted = formatAgendaItemWithPrivacy(item, privacyLevel);
    const startCompact = toCompactBogotaStamp(item.bogota_date, item.bogota_start_time);
    const endParts = extractBogotaDateAndTime(item.ends_at);
    const endCompact = toCompactBogotaStamp(endParts.date || item.bogota_date, item.bogota_end_time || endParts.time);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: formatted.title,
        dates: `${startCompact}/${endCompact}`,
        ctz: 'America/Bogota',
        location: formatted.locationDisplay,
        details: formatted.descriptionText,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(
    item: UnifiedAgendaItem,
    privacyLevel: AgendaPrivacyLevel,
    variant: 'personal' | 'office365' = 'personal'
): string {
    const formatted = formatAgendaItemWithPrivacy(item, privacyLevel);
    const base =
        variant === 'office365'
            ? 'https://outlook.office.com/calendar/0/deeplink/compose'
            : 'https://outlook.live.com/calendar/0/deeplink/compose';

    const startBogIso = `${item.bogota_date}T${item.bogota_start_time}:00-05:00`;
    const endParts = extractBogotaDateAndTime(item.ends_at);
    const endBogIso = `${endParts.date || item.bogota_date}T${item.bogota_end_time || endParts.time}:00-05:00`;

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: formatted.title,
        startdt: startBogIso,
        enddt: endBogIso,
        location: formatted.locationDisplay,
        body: formatted.descriptionText,
    });
    return `${base}?${params.toString()}`;
}
