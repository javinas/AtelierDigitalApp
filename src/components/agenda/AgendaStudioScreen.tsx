// ==============================================================================
// ATELIER DIGITAL — MÓDULO 08: PANTALLA TRANSVERSAL DE AGENDA DEL ATELIER
// Archivo: src/components/agenda/AgendaStudioScreen.tsx
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
    addDaysToBogotaDate,
    cancelAtelierAppointment,
    computeAgendaOverview,
    fetchAtelierAgenda,
    formatBogotaDateHeading,
    formatBogotaMonthHeading,
    generateAgendaIdempotencyKey,
    getBogotaIsoDate,
    getBogotaMonthGridDates,
    getBogotaRangeForView,
    getBogotaWeekDates,
    updateAtelierAppointment,
} from '../../services/agendaService';
import { colors } from '../../theme/colors';
import {
    AgendaExportPreparedDataset,
    AgendaSourceKind,
    AgendaViewMode,
    AtelierLocationSpace,
    UnifiedAgendaItem,
} from '../../types/agenda';
import {
    AGENDA_SOURCE_META,
    LOCATION_SPACE_LABELS,
    WEEKDAY_SHORT_ES,
} from './agendaLabels';
import { agendaStyles as styles } from './agendaStyles';
import { AgendaExportShareModal } from './AgendaExportShareModal';
import { AppointmentCard } from './AppointmentCard';
import { AppointmentFormModal } from './AppointmentFormModal';
import { PrintableAgendaModal } from './PrintableAgendaModal';

export interface AgendaStudioScreenProps {
    onBack: () => void;
    onOpenClient?: (clientId: string) => void;
    onOpenCreation?: (creationId: string) => void;
    onOpenFittings?: () => void;
}

type SourceFilter = AgendaSourceKind | 'all';
type QuickModeFilter = 'active' | 'pending_confirm' | 'internal_only' | 'include_cancelled';

export const AgendaStudioScreen: React.FC<AgendaStudioScreenProps> = ({
    onBack,
    onOpenClient,
    onOpenCreation,
    onOpenFittings,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isAuthorized = role === 'designer' || role === 'admin';
    const isDesktop = width >= 980;

    const [todayBogota, setTodayBogota] = useState<string>(() => getBogotaIsoDate());
    const [selectedDate, setSelectedDate] = useState<string>(() => getBogotaIsoDate());
    const [viewMode, setViewMode] = useState<AgendaViewMode>('week');

    const [items, setItems] = useState<UnifiedAgendaItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [mutating, setMutating] = useState<boolean>(false);

    const [errorBanner, setErrorBanner] = useState<string | null>(null);
    const [successBanner, setSuccessBanner] = useState<string | null>(null);

    // Filtros sencillos
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [quickFilter, setQuickFilter] = useState<QuickModeFilter>('active');
    const [spaceFilter, setSpaceFilter] = useState<AtelierLocationSpace | 'all'>('all');
    const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState<boolean>(false);

    // Modal crear / reprogramar
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<UnifiedAgendaItem | null>(null);

    // Modales de exportación e impresión / calendarios externos (solo lectura)
    const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
    const [exportFocusedItem, setExportFocusedItem] = useState<UnifiedAgendaItem | null>(null);
    const [printableDataset, setPrintableDataset] = useState<AgendaExportPreparedDataset | null>(null);

    const activeRange = useMemo(() => getBogotaRangeForView(selectedDate, viewMode), [selectedDate, viewMode]);

    const computeWindowIso = useCallback(() => {
        const nowToday = getBogotaIsoDate();
        const upcomingHorizon = addDaysToBogotaDate(nowToday, 21);
        const fromDate = activeRange.fromDate < nowToday ? activeRange.fromDate : nowToday;
        const toDate = activeRange.toDate > upcomingHorizon ? activeRange.toDate : upcomingHorizon;
        return {
            fromIso: `${fromDate}T00:00:00-05:00`,
            toIso: `${toDate}T23:59:59-05:00`,
        };
    }, [activeRange.fromDate, activeRange.toDate]);

    const applyAgendaResult = useCallback(
        (data: Awaited<ReturnType<typeof fetchAtelierAgenda>>['data'], error: Awaited<ReturnType<typeof fetchAtelierAgenda>>['error']) => {
            if (error || !data) {
                setErrorBanner(error?.message || 'No se pudo cargar la agenda consolidada.');
            } else {
                setItems(data.items || []);
                if (data.today_bogota) {
                    setTodayBogota(data.today_bogota);
                }
            }
            setLoading(false);
            setRefreshing(false);
        },
        []
    );

    const loadAgenda = useCallback(
        async (isRefresh = false) => {
            if (!isAuthorized) return;
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setErrorBanner(null);

            const { fromIso, toIso } = computeWindowIso();
            const { data, error } = await fetchAtelierAgenda(fromIso, toIso);
            applyAgendaResult(data, error);
        },
        [isAuthorized, computeWindowIso, applyAgendaResult]
    );

    useEffect(() => {
        if (!isAuthorized) return;
        let active = true;
        const { fromIso, toIso } = computeWindowIso();
        fetchAtelierAgenda(fromIso, toIso).then(({ data, error }) => {
            if (!active) return;
            setErrorBanner(null);
            applyAgendaResult(data, error);
        });
        return () => {
            active = false;
        };
    }, [isAuthorized, computeWindowIso, applyAgendaResult]);

    const overview = useMemo(() => computeAgendaOverview(items, todayBogota), [items, todayBogota]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
            if (quickFilter === 'active' && item.status === 'cancelled') return false;
            if (quickFilter === 'pending_confirm' && (item.status !== 'scheduled' || item.source_kind !== 'm08_appointment')) {
                return false;
            }
            if (quickFilter === 'internal_only' && (item.client_id !== null || item.status === 'cancelled')) {
                return false;
            }
            if (sourceFilter !== 'all' && item.source_kind !== sourceFilter) return false;
            if (spaceFilter !== 'all' && item.location_space !== spaceFilter) return false;

            if (q) {
                const haystack = [
                    item.title,
                    item.client_name,
                    item.person_name,
                    item.creation_name,
                    item.supplier_name,
                    item.assigned_staff,
                    LOCATION_SPACE_LABELS[item.location_space],
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [items, quickFilter, sourceFilter, spaceFilter, searchQuery]);

    const activeFiltersCount =
        (sourceFilter !== 'all' ? 1 : 0) +
        (quickFilter !== 'active' ? 1 : 0) +
        (spaceFilter !== 'all' ? 1 : 0) +
        (searchQuery.trim() ? 1 : 0);
    const showFiltersBlock = isDesktop || mobileFiltersExpanded;

    const itemsInViewRange = useMemo(() => {
        return filteredItems.filter(
            (i) => i.bogota_date >= activeRange.fromDate && i.bogota_date <= activeRange.toDate
        );
    }, [filteredItems, activeRange.fromDate, activeRange.toDate]);

    const groupedByDate = useMemo(() => {
        const map = new Map<string, UnifiedAgendaItem[]>();
        for (const item of itemsInViewRange) {
            const list = map.get(item.bogota_date) || [];
            list.push(item);
            map.set(item.bogota_date, list);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [itemsInViewRange]);

    const daySelectedItems = useMemo(
        () => filteredItems.filter((i) => i.bogota_date === selectedDate),
        [filteredItems, selectedDate]
    );

    const weekDates = useMemo(() => getBogotaWeekDates(selectedDate), [selectedDate]);
    const monthGrid = useMemo(() => getBogotaMonthGridDates(selectedDate), [selectedDate]);

    const handleStepPeriod = (direction: -1 | 1) => {
        if (viewMode === 'day') {
            setSelectedDate((prev) => addDaysToBogotaDate(prev, direction));
            return;
        }
        if (viewMode === 'week') {
            setSelectedDate((prev) => addDaysToBogotaDate(prev, direction * 7));
            return;
        }
        const year = Number(selectedDate.slice(0, 4));
        const month = Number(selectedDate.slice(5, 7));
        const targetMonth = new Date(Date.UTC(year, month - 1 + direction, 1));
        setSelectedDate(
            `${targetMonth.getUTCFullYear()}-${String(targetMonth.getUTCMonth() + 1).padStart(2, '0')}-01`
        );
    };

    const handleConfirmAppointment = async (item: UnifiedAgendaItem) => {
        if (!item.appointment_id) return;
        setMutating(true);
        setErrorBanner(null);
        setSuccessBanner(null);
        const { error } = await updateAtelierAppointment({
            appointmentId: item.appointment_id,
            expectedRowVersion: item.row_version,
            status: 'confirmed',
            idempotencyKey: generateAgendaIdempotencyKey('confirm'),
        });
        setMutating(false);
        if (error) {
            setErrorBanner(error.message);
            return;
        }
        setSuccessBanner(`Cita “${item.title}” confirmada.`);
        await loadAgenda(true);
    };

    const handleCompleteAppointment = async (item: UnifiedAgendaItem) => {
        if (!item.appointment_id) return;
        setMutating(true);
        setErrorBanner(null);
        setSuccessBanner(null);
        const { error } = await updateAtelierAppointment({
            appointmentId: item.appointment_id,
            expectedRowVersion: item.row_version,
            status: 'completed',
            idempotencyKey: generateAgendaIdempotencyKey('complete'),
        });
        setMutating(false);
        if (error) {
            setErrorBanner(error.message);
            return;
        }
        setSuccessBanner(`Actividad “${item.title}” marcada como realizada.`);
        await loadAgenda(true);
    };

    const handleCancelAppointment = async (item: UnifiedAgendaItem, reason: string): Promise<boolean> => {
        if (!item.appointment_id) return false;
        setMutating(true);
        setErrorBanner(null);
        setSuccessBanner(null);
        const { error } = await cancelAtelierAppointment({
            appointmentId: item.appointment_id,
            expectedRowVersion: item.row_version,
            cancellationReason: reason,
            idempotencyKey: generateAgendaIdempotencyKey('cancel'),
        });
        setMutating(false);
        if (error) {
            setErrorBanner(error.message);
            return false;
        }
        setSuccessBanner(`Cita “${item.title}” cancelada en bitácora; horario liberado.`);
        await loadAgenda(true);
        return true;
    };

    if (authLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.champagneGold} size="small" />
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Text style={styles.pageTitle}>Acceso restringido al equipo del Atelier</Text>
                <TouchableOpacity onPress={onBack} style={[styles.backBtn, { marginTop: 14 }]}>
                    <Text style={styles.backBtnText}>← Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const periodHeading =
        viewMode === 'day'
            ? formatBogotaDateHeading(selectedDate)
            : viewMode === 'week'
              ? `Semana ${weekDates[0]} → ${weekDates[6]}`
              : formatBogotaMonthHeading(selectedDate);

    return (
        <View style={styles.container}>
            {/* CABECERA EDITORIAL */}
            <View style={styles.headerBar}>
                <View style={[styles.headerInner, !isDesktop && { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={[styles.headerLeft, isDesktop && { flex: 1, minWidth: 280 }]}>
                        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.85}>
                            <Text style={styles.backBtnText}>← Atelier Diseñadora</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, minWidth: 180, flexShrink: 1 }}>
                            <Text style={styles.eyebrow}>✦ MÓDULO 08 · ZONA HORARIA COLOMBIA (AMERICA/BOGOTA)</Text>
                            <Text style={styles.pageTitle}>Agenda del Atelier</Text>
                        </View>
                    </View>

                    <View style={styles.dateNavRow}>
                        <TouchableOpacity
                            onPress={() => loadAgenda(true)}
                            style={styles.navMiniBtn}
                            disabled={refreshing}
                        >
                            <Text style={styles.navMiniBtnText}>
                                {refreshing ? 'Actualizando...' : '↻ Actualizar'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setExportFocusedItem(null);
                                setExportModalVisible(true);
                            }}
                            style={[styles.navMiniBtn, { borderColor: colors.champagneGold, backgroundColor: '#FFFDF8' }]}
                        >
                            <Text style={styles.navMiniBtnText}>⤓ Exportar / Calendarios</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setEditingItem(null);
                                setModalVisible(true);
                            }}
                            style={styles.primaryActionBtn}
                            activeOpacity={0.88}
                        >
                            <Text style={styles.primaryActionBtnText}>+ Nueva Cita / Actividad</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {errorBanner ? (
                    <View style={styles.bannerError}>
                        <Text style={styles.bannerTextError}>{errorBanner}</Text>
                        <TouchableOpacity onPress={() => loadAgenda(true)} style={styles.actionBtn}>
                            <Text style={styles.actionBtnText}>Recargar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setErrorBanner(null)}>
                            <Text style={styles.bannerCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {successBanner ? (
                    <View style={styles.bannerSuccess}>
                        <Text style={styles.bannerTextSuccess}>{successBanner}</Text>
                        <TouchableOpacity onPress={() => setSuccessBanner(null)}>
                            <Text style={styles.bannerCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* 4 KPIs DE ATELIER */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Citas & Hitos Hoy</Text>
                        <Text style={styles.kpiValue}>{overview.todayCount}</Text>
                        <Text style={styles.kpiSub}>Hoy {todayBogota} (BOG)</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Pruebas (7 días)</Text>
                        <Text style={styles.kpiValue}>{overview.weekFittingsCount}</Text>
                        <Text style={styles.kpiSub}>Consolida M06 + M08</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Entregas (7 días)</Text>
                        <Text style={styles.kpiValue}>{overview.upcomingDeliveriesCount}</Text>
                        <Text style={styles.kpiSub}>Sin duplicar M03/M08</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Por Confirmar</Text>
                        <Text style={styles.kpiValue}>{overview.pendingConfirmationCount}</Text>
                        <Text style={styles.kpiSub}>Citas M08 programadas</Text>
                    </View>
                </View>

                {/* CONTROLES DE VISTA, NAVEGACIÓN TEMPORAL Y FILTROS */}
                <View style={styles.controlsCard}>
                    <View style={styles.topNavRow}>
                        <View style={styles.segmentedWrap}>
                            {([
                                { id: 'day', label: 'Día' },
                                { id: 'week', label: 'Semana' },
                                { id: 'month', label: 'Mes' },
                            ] as { id: AgendaViewMode; label: string }[]).map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setViewMode(m.id)}
                                    style={[styles.segmentBtn, viewMode === m.id && styles.segmentBtnActive]}
                                >
                                    <Text
                                        style={[
                                            styles.segmentBtnText,
                                            viewMode === m.id && styles.segmentBtnTextActive,
                                        ]}
                                    >
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.dateNavRow, !isDesktop && { width: '100%' }]}>
                            <TouchableOpacity onPress={() => handleStepPeriod(-1)} style={styles.navMiniBtn}>
                                <Text style={styles.navMiniBtnText}>‹ Anterior</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSelectedDate(todayBogota)}
                                style={[styles.navMiniBtn, { borderColor: colors.champagneGold }]}
                            >
                                <Text style={styles.navMiniBtnText}>Hoy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleStepPeriod(1)} style={styles.navMiniBtn}>
                                <Text style={styles.navMiniBtnText}>Siguiente ›</Text>
                            </TouchableOpacity>
                            <Text style={[styles.activePeriodLabel, !isDesktop && { width: '100%' }]}>
                                {periodHeading}
                            </Text>
                        </View>
                    </View>

                    {!isDesktop && (
                        <TouchableOpacity
                            onPress={() => setMobileFiltersExpanded((prev) => !prev)}
                            style={[
                                styles.navMiniBtn,
                                {
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: colors.ivoryWarm,
                                },
                                activeFiltersCount > 0 && { borderColor: colors.champagneGold },
                            ]}
                        >
                            <Text style={styles.navMiniBtnText}>
                                🔍 Filtros y búsqueda{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                            </Text>
                            <Text style={styles.navMiniBtnText}>
                                {mobileFiltersExpanded ? '▲ Ocultar' : '▼ Mostrar'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showFiltersBlock && (
                        <>
                            <View style={styles.filtersRow}>
                                <TextInput
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Buscar por clienta, creación, proveedor o espacio..."
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.searchInput}
                                />
                            </View>

                            <View style={styles.chipScroll}>
                                {([
                                    { id: 'all', label: 'Todo el Atelier' },
                                    { id: 'm08_appointment', label: 'Citas M08' },
                                    { id: 'm06_fitting_session', label: 'Pruebas M06' },
                                    { id: 'm03_delivery_milestone', label: 'Entregas M03' },
                                    { id: 'm02_measurement_campaign', label: 'Jornadas M02' },
                                ] as { id: SourceFilter; label: string }[]).map((sf) => (
                                    <TouchableOpacity
                                        key={sf.id}
                                        onPress={() => setSourceFilter(sf.id)}
                                        style={[styles.filterChip, sourceFilter === sf.id && styles.filterChipActive]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                sourceFilter === sf.id && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {sf.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                {([
                                    { id: 'active', label: 'Activas' },
                                    { id: 'pending_confirm', label: 'Por confirmar' },
                                    { id: 'internal_only', label: 'Sin clienta (Internas/Prov.)' },
                                    { id: 'include_cancelled', label: 'Incluir canceladas' },
                                ] as { id: QuickModeFilter; label: string }[]).map((qf) => (
                                    <TouchableOpacity
                                        key={qf.id}
                                        onPress={() => setQuickFilter(qf.id)}
                                        style={[styles.filterChip, quickFilter === qf.id && styles.filterChipActive]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                quickFilter === qf.id && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {qf.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.chipScroll}>
                                <TouchableOpacity
                                    onPress={() => setSpaceFilter('all')}
                                    style={[styles.filterChip, spaceFilter === 'all' && styles.filterChipActive]}
                                >
                                    <Text style={[styles.filterChipText, spaceFilter === 'all' && styles.filterChipTextActive]}>
                                        Todos los espacios
                                    </Text>
                                </TouchableOpacity>
                                {(Object.keys(LOCATION_SPACE_LABELS) as AtelierLocationSpace[]).map((sp) => (
                                    <TouchableOpacity
                                        key={sp}
                                        onPress={() => setSpaceFilter(sp)}
                                        style={[styles.filterChip, spaceFilter === sp && styles.filterChipActive]}
                                    >
                                        <Text style={[styles.filterChipText, spaceFilter === sp && styles.filterChipTextActive]}>
                                            {LOCATION_SPACE_LABELS[sp]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {/* CONTENIDO PRINCIPAL: DÍA / SEMANA / MES + RESUMEN LATERAL */}
                {loading ? (
                    <View style={[styles.sectionCard, { alignItems: 'center', paddingVertical: 40 }]}>
                        <ActivityIndicator color={colors.champagneGold} size="small" />
                        <Text style={styles.sectionSubtitle}>Cargando agenda consolidada...</Text>
                    </View>
                ) : (
                    <View style={[styles.mainColumns, !isDesktop && { flexDirection: 'column' }]}>
                        {/* COLUMNA PRINCIPAL DE CALENDARIO Y LISTA */}
                        <View style={[styles.primaryColumn, !isDesktop && { width: '100%' }]}>
                            {viewMode === 'week' && (
                                <View style={styles.sectionCard}>
                                    <Text style={styles.sectionTitle}>Vista Semanal ({weekDates[0]} → {weekDates[6]})</Text>
                                    <View style={styles.weekGrid}>
                                        {weekDates.map((d, idx) => {
                                            const dayCount = filteredItems.filter((it) => it.bogota_date === d).length;
                                            const isSelected = d === selectedDate;
                                            const isToday = d === todayBogota;
                                            return (
                                                <TouchableOpacity
                                                    key={d}
                                                    onPress={() => setSelectedDate(d)}
                                                    style={[
                                                        styles.weekDayBtn,
                                                        isSelected && styles.weekDayBtnSelected,
                                                    ]}
                                                >
                                                    <Text style={[styles.kpiLabel, isToday && { color: colors.champagneGold }]}>
                                                        {WEEKDAY_SHORT_ES[idx]} {isToday ? '· HOY' : ''}
                                                    </Text>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.atelierBlack }}>
                                                        {d.slice(8)}
                                                    </Text>
                                                    <Text style={styles.kpiSub}>
                                                        {dayCount} {dayCount === 1 ? 'actividad' : 'actividades'}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {viewMode === 'month' && (
                                <View style={styles.sectionCard}>
                                    <Text style={styles.sectionTitle}>
                                        {formatBogotaMonthHeading(selectedDate)}
                                    </Text>
                                    <View style={styles.monthGridHeader}>
                                        {WEEKDAY_SHORT_ES.map((wd) => (
                                            <View key={wd} style={styles.monthWeekdayCell}>
                                                <Text style={styles.monthWeekdayText}>{wd}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    {Array.from({ length: monthGrid.gridDates.length / 7 }, (_, rowIdx) => (
                                        <View key={rowIdx} style={styles.monthWeekRow}>
                                            {monthGrid.gridDates.slice(rowIdx * 7, rowIdx * 7 + 7).map((d) => {
                                                const count = filteredItems.filter((it) => it.bogota_date === d).length;
                                                const inMonth = d.startsWith(monthGrid.monthPrefix);
                                                const isSel = d === selectedDate;
                                                return (
                                                    <TouchableOpacity
                                                        key={d}
                                                        onPress={() => setSelectedDate(d)}
                                                        style={[
                                                            styles.monthDayCell,
                                                            !inMonth && styles.monthDayCellMuted,
                                                            isSel && styles.monthDayCellSelected,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: d === todayBogota ? '800' : '600',
                                                                color: d === todayBogota ? colors.champagneGold : colors.atelierBlack,
                                                            }}
                                                        >
                                                            {Number(d.slice(8))}
                                                        </Text>
                                                        {count > 0 ? (
                                                            <View
                                                                style={{
                                                                    backgroundColor: colors.atelierBlack,
                                                                    borderRadius: 6,
                                                                    paddingHorizontal: 5,
                                                                    paddingVertical: 2,
                                                                    alignSelf: 'flex-start',
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700' }}>
                                                                    {count}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* LISTADO DETALLADO DEL DÍA O PERÍODO */}
                            {viewMode === 'day' || viewMode === 'month' ? (
                                <View style={styles.sectionCard}>
                                    <View style={styles.dayGroupHeader}>
                                        <Text style={styles.dayGroupTitle}>{formatBogotaDateHeading(selectedDate)}</Text>
                                        <Text style={styles.dayGroupCount}>
                                            {daySelectedItems.length} {daySelectedItems.length === 1 ? 'registro' : 'registros'}
                                        </Text>
                                    </View>
                                    {daySelectedItems.length === 0 ? (
                                        <View style={{ paddingVertical: 18, alignItems: 'center', gap: 10 }}>
                                            <Text style={styles.sectionSubtitle}>
                                                No hay citas ni hitos programados para {selectedDate}.
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingItem(null);
                                                    setModalVisible(true);
                                                }}
                                                style={styles.navMiniBtn}
                                            >
                                                <Text style={styles.navMiniBtnText}>+ Programar para este día</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={{ gap: 12 }}>
                                            {daySelectedItems.map((item) => (
                                                <AppointmentCard
                                                    key={item.agenda_item_id}
                                                    item={item}
                                                    busy={mutating}
                                                    onConfirm={handleConfirmAppointment}
                                                    onComplete={handleCompleteAppointment}
                                                    onEdit={(it) => {
                                                        setEditingItem(it);
                                                        setModalVisible(true);
                                                    }}
                                                    onCancel={handleCancelAppointment}
                                                    onShareOrExport={(it) => {
                                                        setExportFocusedItem(it);
                                                        setExportModalVisible(true);
                                                    }}
                                                    onOpenClient={onOpenClient}
                                                    onOpenCreation={onOpenCreation}
                                                    onOpenFittings={onOpenFittings}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ) : groupedByDate.length === 0 ? (
                                <View style={[styles.sectionCard, { alignItems: 'center', paddingVertical: 28, gap: 10 }]}>
                                    <Text style={styles.sectionSubtitle}>
                                        Sin actividades registradas en esta semana con los filtros actuales.
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingItem(null);
                                            setModalVisible(true);
                                        }}
                                        style={styles.navMiniBtn}
                                    >
                                        <Text style={styles.navMiniBtnText}>+ Programar primera cita de la semana</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                groupedByDate.map(([dateKey, dayList]) => (
                                    <View key={dateKey} style={styles.sectionCard}>
                                        <View style={styles.dayGroupHeader}>
                                            <Text style={styles.dayGroupTitle}>
                                                {formatBogotaDateHeading(dateKey)}
                                                {dateKey === todayBogota ? ' · HOY' : ''}
                                            </Text>
                                            <Text style={styles.dayGroupCount}>
                                                {dayList.length} {dayList.length === 1 ? 'registro' : 'registros'}
                                            </Text>
                                        </View>
                                        <View style={{ gap: 12 }}>
                                            {dayList.map((item) => (
                                                <AppointmentCard
                                                    key={item.agenda_item_id}
                                                    item={item}
                                                    busy={mutating}
                                                    onConfirm={handleConfirmAppointment}
                                                    onComplete={handleCompleteAppointment}
                                                    onEdit={(it) => {
                                                        setEditingItem(it);
                                                        setModalVisible(true);
                                                    }}
                                                    onCancel={handleCancelAppointment}
                                                    onShareOrExport={(it) => {
                                                        setExportFocusedItem(it);
                                                        setExportModalVisible(true);
                                                    }}
                                                    onOpenClient={onOpenClient}
                                                    onOpenCreation={onOpenCreation}
                                                    onOpenFittings={onOpenFittings}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* PANEL LATERAL / INFERIOR: RESUMEN DEL DÍA Y PRÓXIMAS ACTIVIDADES */}
                        <View style={[styles.sideColumn, !isDesktop && { width: '100%' }]}>
                            <View style={styles.sectionCard}>
                                <Text style={styles.eyebrow}>✦ HOY EN EL ATELIER ({todayBogota})</Text>
                                <Text style={styles.sectionTitle}>Resumen del Día</Text>
                                {overview.todayItems.length === 0 ? (
                                    <Text style={styles.sectionSubtitle}>
                                        No tienes compromisos programados para hoy.
                                    </Text>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {overview.todayItems.map((it) => (
                                            <TouchableOpacity
                                                key={it.agenda_item_id}
                                                onPress={() => {
                                                    setSelectedDate(it.bogota_date);
                                                    setViewMode('day');
                                                }}
                                                style={[styles.cardNotesBox, { gap: 2 }]}
                                            >
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.champagneGold }}>
                                                    {it.bogota_start_time}–{it.bogota_end_time} · {AGENDA_SOURCE_META[it.source_kind].badge}
                                                </Text>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.atelierBlack }}>
                                                    {it.title}
                                                </Text>
                                                <Text style={styles.cardMetaText}>
                                                    {it.client_name || 'Actividad interna / Proveedor'} · {LOCATION_SPACE_LABELS[it.location_space]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.sectionCard}>
                                <Text style={styles.eyebrow}>✦ PRÓXIMAS ACTIVIDADES</Text>
                                <Text style={styles.sectionTitle}>Horizonte Cercano</Text>
                                {overview.upcomingItems.length === 0 ? (
                                    <Text style={styles.sectionSubtitle}>Sin próximos compromisos registrados.</Text>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {overview.upcomingItems.map((it) => (
                                            <TouchableOpacity
                                                key={it.agenda_item_id}
                                                onPress={() => {
                                                    setSelectedDate(it.bogota_date);
                                                    setViewMode('day');
                                                }}
                                                style={[styles.cardNotesBox, { gap: 2 }]}
                                            >
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.bronze }}>
                                                    {it.bogota_date} · {it.bogota_start_time} · {AGENDA_SOURCE_META[it.source_kind].badge}
                                                </Text>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.atelierBlack }}>
                                                    {it.title}
                                                </Text>
                                                <Text style={styles.cardMetaText}>
                                                    {it.client_name || it.supplier_name || 'Taller / Interna'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <AppointmentFormModal
                visible={modalVisible}
                defaultDate={selectedDate}
                initialItem={editingItem}
                existingItems={items}
                onClose={() => {
                    setModalVisible(false);
                    setEditingItem(null);
                }}
                onSaved={async (_appointment, msg) => {
                    setModalVisible(false);
                    setEditingItem(null);
                    setSuccessBanner(msg);
                    await loadAgenda(true);
                }}
                onConflictReload={async () => {
                    setModalVisible(false);
                    setEditingItem(null);
                    await loadAgenda(true);
                }}
            />

            <AgendaExportShareModal
                visible={exportModalVisible}
                defaultDate={selectedDate}
                defaultViewMode={viewMode}
                items={items}
                filteredItems={filteredItems}
                activeFilterSummary={{
                    sourceLabel:
                        sourceFilter === 'all' ? 'Todo el Atelier' : AGENDA_SOURCE_META[sourceFilter]?.badge,
                    quickLabel: quickFilter,
                    spaceLabel: spaceFilter === 'all' ? 'Todos los espacios' : LOCATION_SPACE_LABELS[spaceFilter],
                    searchQuery: searchQuery.trim() || undefined,
                }}
                focusedItem={exportFocusedItem}
                onClose={() => {
                    setExportModalVisible(false);
                    setExportFocusedItem(null);
                }}
                onOpenPrintPreview={(ds) => {
                    setExportModalVisible(false);
                    setPrintableDataset(ds);
                }}
            />

            <PrintableAgendaModal
                visible={Boolean(printableDataset)}
                dataset={printableDataset}
                onClose={() => setPrintableDataset(null)}
            />
        </View>
    );
};
