// ==============================================================================
// ATELIER DIGITAL — MODAL: EXPORTACIÓN EDITORIAL & COMPARTICIÓN DE CALENDARIOS (M08)
// Archivo: src/components/agenda/AgendaExportShareModal.tsx
// ==============================================================================
// Solo lectura: exporta PDF A4, Impresión Directa, Excel (.xlsx), .ics individual
// y múltiple, enlaces a Google Calendar / Microsoft Outlook / Apple Calendar,
// con privacidad protegida por defecto y sección honesta de sincronización futura.
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    EXTERNAL_SYNC_CONNECTORS,
    buildGoogleCalendarUrl,
    buildOutlookCalendarUrl,
    downloadAgendaIcs,
    exportAgendaToExcel,
    formatAgendaItemWithPrivacy,
    openAgendaPrintWindow,
    prepareAgendaExportDataset,
    resolveAgendaExportDateRange,
} from '../../services/agendaExportService';
import {
    addDaysToBogotaDate,
    fetchAtelierAgenda,
    formatBogotaDateHeading,
    formatBogotaMonthHeading,
    getBogotaIsoDate,
    getBogotaMonthGridDates,
} from '../../services/agendaService';
import { colors } from '../../theme/colors';
import {
    AgendaExportFilterSummary,
    AgendaExportPeriodMode,
    AgendaExportPreparedDataset,
    AgendaPrivacyLevel,
    AgendaViewMode,
    UnifiedAgendaItem,
} from '../../types/agenda';
import { AGENDA_SOURCE_META, LOCATION_SPACE_LABELS, WEEKDAY_SHORT_ES } from './agendaLabels';
import { agendaStyles as styles } from './agendaStyles';

export interface AgendaExportShareModalProps {
    visible: boolean;
    defaultDate: string;
    defaultViewMode: AgendaViewMode;
    items: UnifiedAgendaItem[];
    filteredItems: UnifiedAgendaItem[];
    activeFilterSummary: Omit<AgendaExportFilterSummary, 'respectActiveFilters' | 'includeCancelled'>;
    focusedItem?: UnifiedAgendaItem | null;
    onClose: () => void;
    onOpenPrintPreview: (dataset: AgendaExportPreparedDataset) => void;
}

export const AgendaExportShareModal: React.FC<AgendaExportShareModalProps> = (props) => {
    const { visible, defaultDate, defaultViewMode, focusedItem, onClose } = props;
    if (!visible) return null;
    const modalKey = `${focusedItem?.agenda_item_id || 'period'}_${defaultDate}_${defaultViewMode}`;
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <AgendaExportShareContent key={modalKey} {...props} />
        </Modal>
    );
};

const AgendaExportShareContent: React.FC<AgendaExportShareModalProps> = ({
    defaultDate,
    defaultViewMode,
    items,
    filteredItems,
    activeFilterSummary,
    focusedItem,
    onClose,
    onOpenPrintPreview,
}) => {
    const todayBogota = useMemo(() => getBogotaIsoDate(), []);
    const initialAnchor = defaultDate || todayBogota;

    const [privacyLevel, setPrivacyLevel] = useState<AgendaPrivacyLevel>('protected_external');
    const [periodMode, setPeriodMode] = useState<AgendaExportPeriodMode>(defaultViewMode);
    const [customFromDate, setCustomFromDate] = useState<string>(initialAnchor);
    const [customToDate, setCustomToDate] = useState<string>(addDaysToBogotaDate(initialAnchor, 6));
    const [activeCalendarSide, setActiveCalendarSide] = useState<'from' | 'to' | null>(null);
    const [calendarAnchorDate, setCalendarAnchorDate] = useState<string>(initialAnchor);

    const [respectActiveFilters, setRespectActiveFilters] = useState<boolean>(true);
    const [includeCancelled, setIncludeCancelled] = useState<boolean>(false);

    const [fetchedCustomItems, setFetchedCustomItems] = useState<UnifiedAgendaItem[] | null>(null);
    const [loadingRange, setLoadingRange] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<{ kind: 'success' | 'info' | 'error'; text: string } | null>(
        null
    );

    const activeRange = useMemo(
        () => resolveAgendaExportDateRange(periodMode, initialAnchor, customFromDate, customToDate),
        [periodMode, initialAnchor, customFromDate, customToDate]
    );

    const monthGrid = useMemo(() => getBogotaMonthGridDates(calendarAnchorDate), [calendarAnchorDate]);

    const sourceItemsForPeriod = useMemo(() => {
        if (periodMode === 'custom' && fetchedCustomItems) {
            return fetchedCustomItems;
        }
        return respectActiveFilters ? filteredItems : items;
    }, [periodMode, fetchedCustomItems, respectActiveFilters, filteredItems, items]);

    const previewDataset = useMemo(
        () =>
            prepareAgendaExportDataset({
                items: sourceItemsForPeriod,
                periodMode,
                range: activeRange,
                privacyLevel,
                filterSummary: {
                    ...activeFilterSummary,
                    respectActiveFilters: periodMode === 'custom' && fetchedCustomItems ? false : respectActiveFilters,
                    includeCancelled,
                },
            }),
        [
            sourceItemsForPeriod,
            periodMode,
            activeRange,
            privacyLevel,
            activeFilterSummary,
            respectActiveFilters,
            includeCancelled,
            fetchedCustomItems,
        ]
    );

    const focusedPreview = useMemo(
        () => (focusedItem ? formatAgendaItemWithPrivacy(focusedItem, privacyLevel) : null),
        [focusedItem, privacyLevel]
    );

    const handleShiftCalendarMonth = (direction: -1 | 1) => {
        const year = Number(calendarAnchorDate.slice(0, 4));
        const month = Number(calendarAnchorDate.slice(5, 7));
        const targetMonth = new Date(Date.UTC(year, month - 1 + direction, 1));
        setCalendarAnchorDate(
            `${targetMonth.getUTCFullYear()}-${String(targetMonth.getUTCMonth() + 1).padStart(2, '0')}-01`
        );
    };

    const handlePickCustomDate = (side: 'from' | 'to', nextDate: string) => {
        setFetchedCustomItems(null);
        if (side === 'from') {
            setCustomFromDate(nextDate);
            if (nextDate > customToDate) setCustomToDate(nextDate);
        } else {
            setCustomToDate(nextDate);
            if (nextDate < customFromDate) setCustomFromDate(nextDate);
        }
    };

    const resolveDatasetWithRemoteIfNeeded = async (): Promise<AgendaExportPreparedDataset> => {
        if (periodMode !== 'custom') {
            return previewDataset;
        }
        setLoadingRange(true);
        const { data, error } = await fetchAtelierAgenda(
            `${activeRange.fromDate}T00:00:00-05:00`,
            `${activeRange.toDate}T23:59:59-05:00`
        );
        setLoadingRange(false);
        if (error || !data) {
            setStatusMessage({
                kind: 'info',
                text: 'Se usaron los registros en memoria para el rango seleccionado (no se pudo refrescar desde servidor).',
            });
            return previewDataset;
        }
        setFetchedCustomItems(data.items || []);
        return prepareAgendaExportDataset({
            items: data.items || [],
            periodMode: 'custom',
            range: activeRange,
            privacyLevel,
            filterSummary: {
                ...activeFilterSummary,
                respectActiveFilters: false,
                includeCancelled,
            },
        });
    };

    const handleOpenExternalUrl = async (url: string, providerLabel: string) => {
        try {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.open === 'function') {
                const win = window.open(url, '_blank', 'noopener,noreferrer');
                if (win) {
                    setStatusMessage({
                        kind: 'success',
                        text: `Enlace preparado y abierto en ${providerLabel} (zona horaria America/Bogota).`,
                    });
                    return;
                }
            }
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
                setStatusMessage({
                    kind: 'success',
                    text: `Abriendo ${providerLabel}...`,
                });
                return;
            }
            setStatusMessage({
                kind: 'error',
                text: `El navegador o dispositivo bloqueó la apertura externa hacia ${providerLabel}.`,
            });
        } catch {
            setStatusMessage({
                kind: 'error',
                text: `No fue posible abrir ${providerLabel}. Intenta descargar el archivo .ics estándar.`,
            });
        }
    };

    const handleSingleIcs = async () => {
        if (!focusedItem) return;
        const res = await downloadAgendaIcs(
            [focusedItem],
            privacyLevel,
            `Atelier_Cita_${focusedItem.bogota_date}_${focusedItem.bogota_start_time.replace(':', '')}`
        );
        setStatusMessage({
            kind: res.ok ? 'success' : 'info',
            text: res.ok
                ? `Archivo ${res.filename} descargado para Apple Calendar / Outlook / Google.`
                : res.reason || 'Archivo .ics generado.',
        });
    };

    const handleSinglePrint = () => {
        if (!focusedItem) return;
        const singleDataset = prepareAgendaExportDataset({
            items: [focusedItem],
            periodMode: 'day',
            range: {
                fromDate: focusedItem.bogota_date,
                toDate: focusedItem.bogota_date,
                label: formatBogotaDateHeading(focusedItem.bogota_date),
            },
            privacyLevel,
            filterSummary: {
                respectActiveFilters: false,
                includeCancelled: true,
            },
        });
        onOpenPrintPreview(singleDataset);
    };

    const handleOpenPrintPreview = async () => {
        const ds = await resolveDatasetWithRemoteIfNeeded();
        onOpenPrintPreview(ds);
    };

    const handleDirectPrint = async () => {
        const ds = await resolveDatasetWithRemoteIfNeeded();
        const res = openAgendaPrintWindow(ds, true);
        if (!res.ok) {
            onOpenPrintPreview(ds);
            setStatusMessage({
                kind: 'info',
                text: res.reason || 'Se abrió la vista previa A4 en pantalla para imprimir o guardar PDF.',
            });
            return;
        }
        setStatusMessage({
            kind: 'success',
            text: `Documento A4 (${ds.items.length} compromisos) enviado a impresión / PDF.`,
        });
    };

    const handleExcelExport = async () => {
        const ds = await resolveDatasetWithRemoteIfNeeded();
        const res = await exportAgendaToExcel(ds);
        setStatusMessage({
            kind: res.ok ? 'success' : 'info',
            text: res.ok
                ? `Excel ${res.filename} descargado (${res.rowCount} compromisos en 2 hojas).`
                : res.reason || 'Excel preparado.',
        });
    };

    const handlePeriodIcsExport = async () => {
        const ds = await resolveDatasetWithRemoteIfNeeded();
        if (ds.items.length === 0) {
            setStatusMessage({
                kind: 'info',
                text: 'No hay compromisos en el período seleccionado para generar el archivo .ics.',
            });
            return;
        }
        const res = await downloadAgendaIcs(
            ds.items,
            privacyLevel,
            `Atelier_Agenda_${ds.range.fromDate}_a_${ds.range.toDate}`
        );
        setStatusMessage({
            kind: res.ok ? 'success' : 'info',
            text: res.ok
                ? `Calendario ${res.filename} descargado con ${res.count} compromisos únicos.`
                : res.reason || 'Archivo .ics generado.',
        });
    };

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                    <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                        <Text style={styles.eyebrow}>✦ EXPORTACIÓN & CALENDARIOS EXTERNOS · M08</Text>
                        <Text style={styles.modalTitle}>Exportar, Imprimir y Compartir Agenda</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>✕ Cerrar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalBody}>
                    {statusMessage ? (
                        <View
                            style={
                                statusMessage.kind === 'error'
                                    ? styles.bannerError
                                    : statusMessage.kind === 'success'
                                      ? styles.bannerSuccess
                                      : [styles.cardNotesBox, { borderColor: colors.champagneGold }]
                            }
                        >
                            <Text
                                style={
                                    statusMessage.kind === 'error'
                                        ? styles.bannerTextError
                                        : statusMessage.kind === 'success'
                                          ? styles.bannerTextSuccess
                                          : styles.cardNotesText
                                }
                            >
                                {statusMessage.text}
                            </Text>
                        </View>
                    ) : null}

                    {/* CONTROL TRANSVERSAL DE PRIVACIDAD */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.fieldLabel}>Nivel de Privacidad (Clientas & Notas Internas)</Text>
                        <View style={styles.chipScroll}>
                            <TouchableOpacity
                                onPress={() => setPrivacyLevel('protected_external')}
                                style={[
                                    styles.filterChip,
                                    privacyLevel === 'protected_external' && styles.filterChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        privacyLevel === 'protected_external' && styles.filterChipTextActive,
                                    ]}
                                >
                                    🔒 Privacidad protegida (por defecto)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setPrivacyLevel('full_internal')}
                                style={[
                                    styles.filterChip,
                                    privacyLevel === 'full_internal' && styles.filterChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        privacyLevel === 'full_internal' && styles.filterChipTextActive,
                                    ]}
                                >
                                    📋 Completo interno del Atelier
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            {privacyLevel === 'protected_external'
                                ? 'Recomendado para compartir en Google, Outlook o Apple: abrevia nombres de clientas y omite teléfonos o notas privadas del taller.'
                                : 'Uso exclusivo interno del Atelier: incluye nombres completos, teléfonos, encargos y notas de preparación/resultado.'}
                        </Text>
                    </View>

                    {/* BLOQUE INDIVIDUAL CUANDO SE ABRE DESDE UNA TARJETA */}
                    {focusedItem && focusedPreview ? (
                        <View style={[styles.sectionCard, { borderColor: colors.champagneGold }]}>
                            <Text style={styles.eyebrow}>
                                ✦ COMPROMISO SELECCIONADO · {AGENDA_SOURCE_META[focusedItem.source_kind].badge}
                            </Text>
                            <Text style={styles.cardTitle}>{focusedPreview.title}</Text>
                            <Text style={styles.cardMetaText}>
                                📅 {formatBogotaDateHeading(focusedItem.bogota_date)} · {focusedItem.bogota_start_time}–
                                {focusedItem.bogota_end_time} (BOG) · 📍{' '}
                                {focusedItem.location_label_override ||
                                    LOCATION_SPACE_LABELS[focusedItem.location_space]}
                            </Text>
                            <Text style={styles.cardMetaText}>
                                👤 Vista previa compartida: {focusedPreview.clientDisplay}
                            </Text>

                            <View style={styles.chipScroll}>
                                <TouchableOpacity
                                    onPress={() =>
                                        handleOpenExternalUrl(
                                            buildGoogleCalendarUrl(focusedItem, privacyLevel),
                                            'Google Calendar'
                                        )
                                    }
                                    style={[styles.actionBtn, styles.actionBtnGold]}
                                >
                                    <Text style={styles.actionBtnText}>🗓️ Google Calendar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() =>
                                        handleOpenExternalUrl(
                                            buildOutlookCalendarUrl(focusedItem, privacyLevel, 'personal'),
                                            'Microsoft Outlook'
                                        )
                                    }
                                    style={styles.actionBtn}
                                >
                                    <Text style={styles.actionBtnText}>📧 Outlook</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() =>
                                        handleOpenExternalUrl(
                                            buildOutlookCalendarUrl(focusedItem, privacyLevel, 'office365'),
                                            'Outlook M365'
                                        )
                                    }
                                    style={styles.actionBtn}
                                >
                                    <Text style={styles.actionBtnText}>🏢 Outlook M365</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSingleIcs} style={styles.actionBtn}>
                                    <Text style={styles.actionBtnText}>🍎 Apple Calendar / .ics</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSinglePrint} style={styles.actionBtn}>
                                    <Text style={styles.actionBtnText}>🖨️ Imprimir / PDF cita</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}

                    {/* BLOQUE EXPORTACIÓN POR PERÍODO Y LOTE .ICS */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.eyebrow}>✦ EXPORTACIÓN EDITORIAL Y LOTE DE AGENDA</Text>
                        <Text style={styles.sectionTitle}>Período, Filtros y Formatos</Text>

                        <View style={styles.chipScroll}>
                            {(
                                [
                                    { id: 'day', label: 'Día seleccionado' },
                                    { id: 'week', label: 'Semana actual' },
                                    { id: 'month', label: 'Mes completo' },
                                    { id: 'custom', label: 'Rango personalizado' },
                                ] as { id: AgendaExportPeriodMode; label: string }[]
                            ).map((pm) => (
                                <TouchableOpacity
                                    key={pm.id}
                                    onPress={() => {
                                        setPeriodMode(pm.id);
                                        setActiveCalendarSide(null);
                                    }}
                                    style={[styles.filterChip, periodMode === pm.id && styles.filterChipActive]}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            periodMode === pm.id && styles.filterChipTextActive,
                                        ]}
                                    >
                                        {pm.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {periodMode === 'custom' && (
                            <View style={{ gap: 10 }}>
                                {(['from', 'to'] as const).map((side) => {
                                    const currentVal = side === 'from' ? customFromDate : customToDate;
                                    const isOpen = activeCalendarSide === side;
                                    return (
                                        <View key={side} style={[styles.cardNotesBox, { gap: 8 }]}>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                }}
                                            >
                                                <View style={{ flex: 1, minWidth: 160 }}>
                                                    <Text style={styles.fieldLabel}>
                                                        {side === 'from' ? 'Desde (Bogotá)' : 'Hasta (Bogotá)'}
                                                    </Text>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.atelierBlack }}>
                                                        {formatBogotaDateHeading(currentVal)} ({currentVal})
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setCalendarAnchorDate(currentVal);
                                                        setActiveCalendarSide(isOpen ? null : side);
                                                    }}
                                                    style={styles.navMiniBtn}
                                                >
                                                    <Text style={styles.navMiniBtnText}>
                                                        {isOpen ? '▲ Ocultar' : '📅 Elegir'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.chipScroll}>
                                                <TouchableOpacity
                                                    onPress={() => handlePickCustomDate(side, todayBogota)}
                                                    style={styles.filterChip}
                                                >
                                                    <Text style={styles.filterChipText}>Hoy</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        handlePickCustomDate(side, addDaysToBogotaDate(currentVal, -1))
                                                    }
                                                    style={styles.filterChip}
                                                >
                                                    <Text style={styles.filterChipText}>‹ Día ant.</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        handlePickCustomDate(side, addDaysToBogotaDate(currentVal, 1))
                                                    }
                                                    style={styles.filterChip}
                                                >
                                                    <Text style={styles.filterChipText}>Día sig. ›</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        handlePickCustomDate(side, addDaysToBogotaDate(currentVal, 7))
                                                    }
                                                    style={styles.filterChip}
                                                >
                                                    <Text style={styles.filterChipText}>+7 días</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {isOpen && (
                                                <View style={{ gap: 6, paddingTop: 4 }}>
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            flexWrap: 'wrap',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <TouchableOpacity
                                                            onPress={() => handleShiftCalendarMonth(-1)}
                                                            style={styles.navMiniBtn}
                                                        >
                                                            <Text style={styles.navMiniBtnText}>‹ Mes</Text>
                                                        </TouchableOpacity>
                                                        <Text
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 96,
                                                                textAlign: 'center',
                                                                fontSize: 13,
                                                                fontWeight: '700',
                                                                color: colors.atelierBlack,
                                                            }}
                                                        >
                                                            {formatBogotaMonthHeading(calendarAnchorDate)}
                                                        </Text>
                                                        <TouchableOpacity
                                                            onPress={() => handleShiftCalendarMonth(1)}
                                                            style={styles.navMiniBtn}
                                                        >
                                                            <Text style={styles.navMiniBtnText}>Mes ›</Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    <View style={styles.monthGridHeader}>
                                                        {WEEKDAY_SHORT_ES.map((wd) => (
                                                            <View key={wd} style={styles.monthWeekdayCell}>
                                                                <Text style={styles.monthWeekdayText}>{wd}</Text>
                                                            </View>
                                                        ))}
                                                    </View>

                                                    {Array.from(
                                                        { length: monthGrid.gridDates.length / 7 },
                                                        (_, rowIdx) => (
                                                            <View key={rowIdx} style={styles.monthWeekRow}>
                                                                {monthGrid.gridDates
                                                                    .slice(rowIdx * 7, rowIdx * 7 + 7)
                                                                    .map((d) => {
                                                                        const inMonth = d.startsWith(monthGrid.monthPrefix);
                                                                        const isSel = d === currentVal;
                                                                        return (
                                                                            <TouchableOpacity
                                                                                key={d}
                                                                                onPress={() => {
                                                                                    handlePickCustomDate(side, d);
                                                                                    setActiveCalendarSide(null);
                                                                                }}
                                                                                style={[
                                                                                    styles.monthDayCell,
                                                                                    {
                                                                                        minHeight: 34,
                                                                                        padding: 3,
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                    },
                                                                                    !inMonth && styles.monthDayCellMuted,
                                                                                    isSel && styles.monthDayCellSelected,
                                                                                    isSel && {
                                                                                        backgroundColor:
                                                                                            colors.atelierBlack,
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                <Text
                                                                                    style={{
                                                                                        fontSize: 11,
                                                                                        fontWeight: isSel ? '800' : '600',
                                                                                        color: isSel
                                                                                            ? '#FFFFFF'
                                                                                            : colors.atelierBlack,
                                                                                    }}
                                                                                >
                                                                                    {Number(d.slice(8))}
                                                                                </Text>
                                                                            </TouchableOpacity>
                                                                        );
                                                                    })}
                                                            </View>
                                                        )
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={styles.chipScroll}>
                            <TouchableOpacity
                                onPress={() => setRespectActiveFilters((prev) => !prev)}
                                style={[styles.filterChip, respectActiveFilters && styles.filterChipActive]}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        respectActiveFilters && styles.filterChipTextActive,
                                    ]}
                                >
                                    {respectActiveFilters ? '✓ Respetar filtros en pantalla' : 'Toda la agenda del período'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setIncludeCancelled((prev) => !prev)}
                                style={[styles.filterChip, includeCancelled && styles.filterChipActive]}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        includeCancelled && styles.filterChipTextActive,
                                    ]}
                                >
                                    {includeCancelled ? '✓ Incluyendo canceladas' : 'Excluir canceladas'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.cardNotesBox}>
                            <Text style={styles.cardNotesText}>
                                📅 Período: <Text style={{ fontWeight: '700' }}>{activeRange.label}</Text>
                                {'\n'}📊 Registros listos (sin duplicados):{' '}
                                <Text style={{ fontWeight: '700' }}>{previewDataset.items.length}</Text>
                                {previewDataset.duplicatesRemoved > 0
                                    ? ` (${previewDataset.duplicatesRemoved} duplicados filtrados)`
                                    : ''}
                                {periodMode === 'custom' && !fetchedCustomItems
                                    ? '\nℹ Al exportar se consultará la agenda exacta de este rango personalizado en solo lectura.'
                                    : ''}
                            </Text>
                        </View>

                        {loadingRange ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                                <Text style={styles.sectionSubtitle}>Consultando rango personalizado...</Text>
                            </View>
                        ) : null}

                        <View style={styles.chipScroll}>
                            <TouchableOpacity
                                onPress={handleOpenPrintPreview}
                                disabled={loadingRange}
                                style={[styles.primaryActionBtn, { paddingVertical: 9, paddingHorizontal: 14 }]}
                            >
                                <Text style={styles.primaryActionBtnText}>📄 Vista Previa & PDF (A4)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDirectPrint}
                                disabled={loadingRange}
                                style={[styles.actionBtn, styles.actionBtnGold]}
                            >
                                <Text style={styles.actionBtnText}>🖨️ Impresión Directa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleExcelExport}
                                disabled={loadingRange}
                                style={styles.actionBtn}
                            >
                                <Text style={styles.actionBtnText}>📊 Exportar Excel (.xlsx)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handlePeriodIcsExport}
                                disabled={loadingRange}
                                style={styles.actionBtn}
                            >
                                <Text style={styles.actionBtnText}>📅 Descargar .ics del período</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionSubtitle}>
                            Nota sobre archivos .ics: compatibles con Apple Calendar, Microsoft Outlook y Google Calendar en zona horaria America/Bogota. Al reimportar un archivo .ics, el comportamiento de actualización o duplicado depende de cada aplicación externa.
                        </Text>
                    </View>

                    {/* SECCIÓN INDEPENDIENTE Y HONESTA: SINCRONIZACIÓN AUTOMÁTICA FUTURA */}
                    <View style={[styles.sectionCard, { backgroundColor: colors.ivoryWarm }]}>
                        <Text style={styles.eyebrow}>✦ INTEGRACIÓN FUTURA · SIN CONEXIÓN ACTIVA</Text>
                        <Text style={styles.sectionTitle}>Sincronización Automática con Calendarios Externos</Text>
                        <Text style={styles.sectionSubtitle}>
                            La conexión OAuth/CalDAV en segundo plano aún no está habilitada en esta versión. Ninguna cuenta externa está vinculada ni se envían datos automáticamente al crear, editar o cancelar citas.
                        </Text>

                        <View style={{ gap: 8 }}>
                            {EXTERNAL_SYNC_CONNECTORS.map((conn) => (
                                <View
                                    key={conn.provider}
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.sand,
                                        borderRadius: 10,
                                        padding: 11,
                                        gap: 4,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.atelierBlack }}>
                                            {conn.label}
                                        </Text>
                                        <View
                                            style={[
                                                styles.badge,
                                                { backgroundColor: '#FAF2F2', borderColor: colors.errorBorder },
                                            ]}
                                        >
                                            <Text style={[styles.badgeText, { color: colors.error }]}>
                                                {conn.badgeText}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardMetaText}>{conn.detailText}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                    <TouchableOpacity onPress={onClose} style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
