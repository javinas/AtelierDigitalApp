// ==============================================================================
// ATELIER DIGITAL — MODAL: PROGRAMAR / EDITAR CITA DE AGENDA (MÓDULO 08)
// Archivo: src/components/agenda/AppointmentFormModal.tsx
// ==============================================================================
// Permite crear o editar actividades CON o SIN clienta/creación asociada,
// validando traslapes preventivos y manejo optimista PT409 en America/Bogota.
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { fetchClients } from '../../services/clientService';
import { fetchSuppliers } from '../../services/commercialService';
import { fetchCreations } from '../../services/creationService';
import {
    addDaysToBogotaDate,
    addMinutesToBogotaIso,
    buildBogotaTimestamptz,
    extractBogotaDateAndTime,
    findLocalSpaceOverlaps,
    formatBogotaDateHeading,
    formatBogotaMonthHeading,
    generateAgendaIdempotencyKey,
    getBogotaIsoDate,
    getBogotaMonthGridDates,
    isAutomatedTestClientRecord,
    scheduleAtelierAppointment,
    updateAtelierAppointment,
} from '../../services/agendaService';
import { colors } from '../../theme/colors';
import {
    AppointmentType,
    AtelierAppointment,
    AtelierLocationSpace,
    ClientVisibilityMode,
    M08_ERROR_NAMES,
    UnifiedAgendaItem,
} from '../../types/agenda';
import { Client } from '../../types/client';
import { AtelierSupplier } from '../../types/commercial';
import { Creation } from '../../types/creation';
import {
    APPOINTMENT_TYPE_LABELS,
    APPOINTMENT_TYPE_OPTIONS,
    DURATION_PRESET_MINUTES,
    LOCATION_SPACE_OPTIONS,
    WEEKDAY_SHORT_ES,
} from './agendaLabels';
import { agendaStyles as styles } from './agendaStyles';

export interface AppointmentFormModalProps {
    visible: boolean;
    defaultDate: string;
    initialItem?: UnifiedAgendaItem | null;
    existingItems: UnifiedAgendaItem[];
    onClose: () => void;
    onSaved: (appointment: AtelierAppointment, message: string) => void;
    onConflictReload?: () => void;
}

const TIME_PRESETS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
    '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = (props) => {
    const { visible, initialItem, defaultDate, onClose } = props;
    if (!visible) return null;
    const formKey = `${initialItem?.appointment_id || 'new'}_${initialItem?.row_version ?? 0}_${defaultDate}`;
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <AppointmentFormContent key={formKey} {...props} />
        </Modal>
    );
};

const AppointmentFormContent: React.FC<AppointmentFormModalProps> = ({
    defaultDate,
    initialItem,
    existingItems,
    onClose,
    onSaved,
    onConflictReload,
}) => {
    const isEditing = Boolean(initialItem && initialItem.source_kind === 'm08_appointment' && initialItem.appointment_id);
    const initialBogota = useMemo(
        () => (isEditing && initialItem ? extractBogotaDateAndTime(initialItem.starts_at) : null),
        [isEditing, initialItem]
    );
    const initialDuration = useMemo(() => {
        if (!isEditing || !initialItem) return 60;
        const durMs = new Date(initialItem.ends_at).getTime() - new Date(initialItem.starts_at).getTime();
        return Math.max(15, Math.round(durMs / 60_000));
    }, [isEditing, initialItem]);

    const todayBogota = useMemo(() => getBogotaIsoDate(), []);
    const tomorrowBogota = useMemo(() => addDaysToBogotaDate(todayBogota, 1), [todayBogota]);

    const [clients, setClients] = useState<Client[]>([]);
    const [creations, setCreations] = useState<Creation[]>([]);
    const [suppliers, setSuppliers] = useState<AtelierSupplier[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);

    const [appointmentType, setAppointmentType] = useState<AppointmentType>(
        isEditing && initialItem ? initialItem.appointment_type : 'consultation'
    );
    const [title, setTitle] = useState(isEditing && initialItem ? initialItem.title : '');
    const [dateStr, setDateStr] = useState(initialBogota?.date || defaultDate || todayBogota);
    const [calendarAnchorDate, setCalendarAnchorDate] = useState(
        initialBogota?.date || defaultDate || todayBogota
    );
    const [showCalendarPicker, setShowCalendarPicker] = useState(false);
    const [startTimeStr, setStartTimeStr] = useState(initialBogota?.time || '10:00');
    const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
    const [locationSpace, setLocationSpace] = useState<AtelierLocationSpace>(
        isEditing && initialItem ? initialItem.location_space : 'probador_principal'
    );

    const [clientId, setClientId] = useState<string | null>(
        isEditing && initialItem ? initialItem.client_id : null
    );
    const [creationId, setCreationId] = useState<string | null>(
        isEditing && initialItem ? initialItem.creation_id : null
    );
    const [supplierId, setSupplierId] = useState<string | null>(
        isEditing && initialItem ? initialItem.supplier_id : null
    );
    const [clientFilter, setClientFilter] = useState('');

    const [assignedStaff, setAssignedStaff] = useState(
        isEditing && initialItem ? initialItem.assigned_staff || 'Katherine Carroll' : 'Katherine Carroll'
    );
    const [preparationNotes, setPreparationNotes] = useState(
        isEditing && initialItem ? initialItem.preparation_notes || '' : ''
    );
    const [outcomeNotes, setOutcomeNotes] = useState(
        isEditing && initialItem ? initialItem.outcome_notes || '' : ''
    );
    const [clientVisibility, setClientVisibility] = useState<ClientVisibilityMode>(
        isEditing && initialItem ? initialItem.client_visibility || 'internal_only' : 'internal_only'
    );

    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConcurrencyError, setIsConcurrencyError] = useState(false);

    useEffect(() => {
        let active = true;
        Promise.all([
            fetchClients('active'),
            fetchCreations(),
            fetchSuppliers({ onlyActive: true }),
        ])
            .then(([cRes, crRes, supRes]) => {
                if (!active) return;
                setClients(cRes.data || []);
                setCreations(crRes.data || []);
                setSuppliers(supRes.data || []);
            })
            .finally(() => {
                if (active) setCatalogLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const filteredClients = useMemo(() => {
        const visiblePool = clients.filter(
            (c) => c.id === clientId || !isAutomatedTestClientRecord(c.full_name)
        );
        const q = clientFilter.trim().toLowerCase();
        if (!q) return visiblePool.slice(0, 12);
        return visiblePool.filter((c) => c.full_name.toLowerCase().includes(q)).slice(0, 12);
    }, [clients, clientFilter, clientId]);

    const creationsForSelectedClient = useMemo(() => {
        if (!clientId) return [];
        return creations.filter((cr) => cr.client_id === clientId && cr.status !== 'cancelled');
    }, [creations, clientId]);

    const computedStartsAt = useMemo(() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return null;
        if (!/^\d{1,2}:\d{2}$/.test(startTimeStr.trim())) return null;
        return buildBogotaTimestamptz(dateStr, startTimeStr);
    }, [dateStr, startTimeStr]);

    const computedEndsAt = useMemo(() => {
        if (!computedStartsAt) return null;
        return addMinutesToBogotaIso(dateStr, startTimeStr, durationMinutes);
    }, [computedStartsAt, dateStr, startTimeStr, durationMinutes]);

    const endTimeLabel = useMemo(() => {
        if (!computedEndsAt) return '';
        return extractBogotaDateAndTime(computedEndsAt).time;
    }, [computedEndsAt]);

    const monthGrid = useMemo(() => getBogotaMonthGridDates(calendarAnchorDate), [calendarAnchorDate]);

    const localOverlaps = useMemo(() => {
        if (!computedStartsAt || !computedEndsAt) return [];
        return findLocalSpaceOverlaps(
            existingItems,
            locationSpace,
            computedStartsAt,
            computedEndsAt,
            isEditing ? initialItem?.appointment_id : null
        );
    }, [existingItems, locationSpace, computedStartsAt, computedEndsAt, isEditing, initialItem?.appointment_id]);

    const handleSelectDate = (nextDate: string) => {
        setDateStr(nextDate);
        setCalendarAnchorDate(nextDate);
    };

    const handleShiftCalendarMonth = (direction: -1 | 1) => {
        const year = Number(calendarAnchorDate.slice(0, 4));
        const month = Number(calendarAnchorDate.slice(5, 7));
        const targetMonth = new Date(Date.UTC(year, month - 1 + direction, 1));
        setCalendarAnchorDate(
            `${targetMonth.getUTCFullYear()}-${String(targetMonth.getUTCMonth() + 1).padStart(2, '0')}-01`
        );
    };

    const handleShiftStartTime = (deltaMinutes: number) => {
        const match = /^(\d{1,2}):(\d{2})$/.exec(startTimeStr.trim());
        const baseMins = match ? Number(match[1]) * 60 + Number(match[2]) : 10 * 60;
        const clamped = Math.max(0, Math.min(23 * 60 + 45, baseMins + deltaMinutes));
        const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
        const mm = String(clamped % 60).padStart(2, '0');
        setStartTimeStr(`${hh}:${mm}`);
    };

    const handleSelectType = (nextType: AppointmentType) => {
        setAppointmentType(nextType);
        if (nextType === 'supplier_meeting' || nextType === 'internal_activity') {
            setClientId(null);
            setCreationId(null);
            if (nextType === 'internal_activity') {
                setLocationSpace('taller_general');
            }
        }
    };

    const handleSave = async () => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
            setErrorMessage('Selecciona una fecha válida en el calendario o accesos rápidos.');
            return;
        }
        if (!/^\d{1,2}:\d{2}$/.test(startTimeStr.trim())) {
            setErrorMessage('Selecciona una hora de inicio válida desde los bloques horarios.');
            return;
        }
        if (!computedStartsAt || !computedEndsAt) {
            setErrorMessage('Verifica la fecha y hora seleccionadas.');
            return;
        }

        const resolvedTitle =
            title.trim() ||
            `${APPOINTMENT_TYPE_LABELS[appointmentType]}${
                clientId
                    ? ` · ${clients.find((c) => c.id === clientId)?.full_name || 'Clienta'}`
                    : supplierId
                      ? ` · ${suppliers.find((s) => s.id === supplierId)?.name || 'Proveedor'}`
                      : ''
            }`;

        setSaving(true);
        setErrorMessage(null);
        setIsConcurrencyError(false);

        if (isEditing && initialItem?.appointment_id) {
            const { data, error } = await updateAtelierAppointment({
                appointmentId: initialItem.appointment_id,
                expectedRowVersion: initialItem.row_version,
                idempotencyKey: generateAgendaIdempotencyKey('modal_upd'),
                title: resolvedTitle,
                appointmentType,
                startsAt: computedStartsAt,
                endsAt: computedEndsAt,
                locationSpace,
                clientId: clientId ?? null,
                clearClient: !clientId && Boolean(initialItem.client_id),
                creationId: creationId ?? null,
                clearCreation: !creationId && Boolean(initialItem.creation_id),
                supplierId: supplierId ?? null,
                assignedStaff: assignedStaff.trim() || null,
                preparationNotes: preparationNotes.trim() || null,
                outcomeNotes: outcomeNotes.trim() || null,
                clientVisibility,
            });
            setSaving(false);

            if (error || !data?.appointment) {
                setErrorMessage(error?.message || 'No se pudo actualizar la cita.');
                setIsConcurrencyError(error?.code === M08_ERROR_NAMES.CONCURRENCY_CONFLICT);
                return;
            }
            onSaved(data.appointment, 'Cita actualizada correctamente en la agenda.');
            return;
        }

        const { data, error } = await scheduleAtelierAppointment({
            title: resolvedTitle,
            startsAt: computedStartsAt,
            endsAt: computedEndsAt,
            appointmentType,
            locationSpace,
            clientId,
            creationId,
            supplierId,
            assignedStaff: assignedStaff.trim() || null,
            preparationNotes: preparationNotes.trim() || null,
            clientVisibility,
            idempotencyKey: generateAgendaIdempotencyKey('modal_new'),
        });
        setSaving(false);

        if (error || !data?.appointment) {
            setErrorMessage(error?.message || 'No se pudo programar la cita.');
            return;
        }
        onSaved(data.appointment, 'Compromiso agendado correctamente (hora Colombia).');
    };

    return (
        <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
                            <Text style={styles.eyebrow}>AGENDA DEL ATELIER · HORA BOGOTÁ (UTC-5)</Text>
                            <Text style={styles.modalTitle}>
                                {isEditing ? 'Reprogramar o Editar Compromiso' : 'Nuevo Compromiso de Agenda'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.actionBtn}>
                            <Text style={styles.actionBtnText}>✕ Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalBody}>
                        {errorMessage ? (
                            <View style={styles.bannerError}>
                                <Text style={styles.bannerTextError}>{errorMessage}</Text>
                                {isConcurrencyError && onConflictReload ? (
                                    <TouchableOpacity onPress={onConflictReload} style={styles.actionBtn}>
                                        <Text style={styles.actionBtnText}>Recargar agenda</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : null}

                        {localOverlaps.length > 0 && (
                            <View style={[styles.bannerError, { backgroundColor: '#FFF8E7', borderColor: '#F2D48E' }]}>
                                <Text style={[styles.bannerTextError, { color: '#9A6700' }]}>
                                    ⚠ Conflicto horario en este espacio con “{localOverlaps[0].title}” ({localOverlaps[0].bogota_start_time}–{localOverlaps[0].bogota_end_time}). La base de datos bloqueará reservas simultáneas en el mismo espacio.
                                </Text>
                            </View>
                        )}

                        <View>
                            <Text style={styles.fieldLabel}>Tipo de Actividad o Cita</Text>
                            <View style={styles.chipScroll}>
                                {APPOINTMENT_TYPE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        onPress={() => handleSelectType(opt.value)}
                                        style={[
                                            styles.filterChip,
                                            appointmentType === opt.value && styles.filterChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                appointmentType === opt.value && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View>
                            <Text style={styles.fieldLabel}>Título descriptivo (opcional si seleccionas clienta/proveedor)</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Ej. 1ª Prueba Glasilla Vestido Esmeralda / Reunión Sedería"
                                placeholderTextColor={colors.textMuted}
                                style={styles.input}
                            />
                        </View>

                        <View style={{ gap: 8 }}>
                            <Text style={styles.fieldLabel}>Fecha de la Cita (Calendario Bogotá)</Text>
                            <View
                                style={[
                                    styles.input,
                                    {
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        paddingVertical: 10,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1, minWidth: 160 }}>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: '700',
                                            color: colors.atelierBlack,
                                        }}
                                    >
                                        {formatBogotaDateHeading(dateStr)}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                        Fecha seleccionada: {dateStr}
                                        {dateStr === todayBogota
                                            ? ' · Hoy'
                                            : dateStr === tomorrowBogota
                                              ? ' · Mañana'
                                              : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        setCalendarAnchorDate(dateStr);
                                        setShowCalendarPicker((prev) => !prev);
                                    }}
                                    style={[
                                        styles.navMiniBtn,
                                        showCalendarPicker && {
                                            borderColor: colors.champagneGold,
                                            backgroundColor: '#FFFDF8',
                                        },
                                    ]}
                                >
                                    <Text style={styles.navMiniBtnText}>
                                        {showCalendarPicker ? '▲ Ocultar calendario' : '📅 Elegir en calendario'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.chipScroll}>
                                <TouchableOpacity
                                    onPress={() => handleSelectDate(todayBogota)}
                                    style={[
                                        styles.filterChip,
                                        dateStr === todayBogota && styles.filterChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            dateStr === todayBogota && styles.filterChipTextActive,
                                        ]}
                                    >
                                        Hoy
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleSelectDate(tomorrowBogota)}
                                    style={[
                                        styles.filterChip,
                                        dateStr === tomorrowBogota && styles.filterChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            dateStr === tomorrowBogota && styles.filterChipTextActive,
                                        ]}
                                    >
                                        Mañana
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleSelectDate(addDaysToBogotaDate(dateStr, -1))}
                                    style={styles.filterChip}
                                >
                                    <Text style={styles.filterChipText}>‹ Día ant.</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleSelectDate(addDaysToBogotaDate(dateStr, 1))}
                                    style={styles.filterChip}
                                >
                                    <Text style={styles.filterChipText}>Día sig. ›</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleSelectDate(addDaysToBogotaDate(dateStr, 7))}
                                    style={styles.filterChip}
                                >
                                    <Text style={styles.filterChipText}>+7 días</Text>
                                </TouchableOpacity>
                            </View>

                            {showCalendarPicker && (
                                <View
                                    style={[
                                        styles.sectionCard,
                                        { padding: 12, gap: 8, backgroundColor: colors.ivoryWarm },
                                    ]}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => handleShiftCalendarMonth(-1)}
                                            style={styles.navMiniBtn}
                                        >
                                            <Text style={styles.navMiniBtnText}>‹ Mes ant.</Text>
                                        </TouchableOpacity>
                                        <Text
                                            style={{
                                                flex: 1,
                                                minWidth: 96,
                                                textAlign: 'center',
                                                fontSize: 14,
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
                                            <Text style={styles.navMiniBtnText}>Mes sig. ›</Text>
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
                                                        const isSel = d === dateStr;
                                                        const isToday = d === todayBogota;
                                                        return (
                                                            <TouchableOpacity
                                                                key={d}
                                                                onPress={() => {
                                                                    handleSelectDate(d);
                                                                    setShowCalendarPicker(false);
                                                                }}
                                                                style={[
                                                                    styles.monthDayCell,
                                                                    {
                                                                        minHeight: 38,
                                                                        padding: 4,
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    },
                                                                    !inMonth && styles.monthDayCellMuted,
                                                                    isSel && styles.monthDayCellSelected,
                                                                    isSel && {
                                                                        backgroundColor: colors.atelierBlack,
                                                                    },
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        fontSize: 12,
                                                                        fontWeight:
                                                                            isSel || isToday ? '800' : '600',
                                                                        color: isSel
                                                                            ? '#FFFFFF'
                                                                            : isToday
                                                                              ? colors.champagneGold
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

                        <View style={{ gap: 8 }}>
                            <Text style={styles.fieldLabel}>Hora de Inicio y Duración (Hora Bogotá UTC-5)</Text>
                            <View
                                style={[
                                    styles.input,
                                    {
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        paddingVertical: 10,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '700',
                                        color: colors.atelierBlack,
                                    }}
                                >
                                    🕙 {startTimeStr}
                                    {endTimeLabel ? ` → ${endTimeLabel}` : ''} · {durationMinutes} min
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    <TouchableOpacity
                                        onPress={() => handleShiftStartTime(-15)}
                                        style={styles.navMiniBtn}
                                    >
                                        <Text style={styles.navMiniBtnText}>‹ -15 min</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleShiftStartTime(15)}
                                        style={styles.navMiniBtn}
                                    >
                                        <Text style={styles.navMiniBtnText}>+15 min ›</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.chipScroll}>
                                {TIME_PRESETS.map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        onPress={() => setStartTimeStr(t)}
                                        style={[styles.filterChip, startTimeStr === t && styles.filterChipActive]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                startTimeStr === t && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.chipScroll}>
                                {DURATION_PRESET_MINUTES.map((mins) => (
                                    <TouchableOpacity
                                        key={mins}
                                        onPress={() => setDurationMinutes(mins)}
                                        style={[
                                            styles.filterChip,
                                            durationMinutes === mins && styles.filterChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                durationMinutes === mins && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {mins} min
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View>
                            <Text style={styles.fieldLabel}>Espacio del Atelier</Text>
                            <View style={styles.chipScroll}>
                                {LOCATION_SPACE_OPTIONS.map((sp) => (
                                    <TouchableOpacity
                                        key={sp.value}
                                        onPress={() => setLocationSpace(sp.value)}
                                        style={[
                                            styles.filterChip,
                                            locationSpace === sp.value && styles.filterChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                locationSpace === sp.value && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {sp.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ gap: 8 }}>
                            <Text style={styles.fieldLabel}>Clienta asociada (opcional)</Text>
                            <TextInput
                                value={clientFilter}
                                onChangeText={setClientFilter}
                                placeholder="Filtrar clienta por nombre..."
                                placeholderTextColor={colors.textMuted}
                                style={styles.input}
                            />
                            {catalogLoading ? (
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            ) : (
                                <View style={styles.chipScroll}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setClientId(null);
                                            setCreationId(null);
                                        }}
                                        style={[styles.filterChip, clientId === null && styles.filterChipActive]}
                                    >
                                        <Text style={[styles.filterChipText, clientId === null && styles.filterChipTextActive]}>
                                            Sin clienta (Interna / Proveedor)
                                        </Text>
                                    </TouchableOpacity>
                                    {filteredClients.map((cl) => (
                                        <TouchableOpacity
                                            key={cl.id}
                                            onPress={() => {
                                                setClientId(cl.id);
                                                setCreationId(null);
                                            }}
                                            style={[styles.filterChip, clientId === cl.id && styles.filterChipActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    clientId === cl.id && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {cl.full_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {clientId && creationsForSelectedClient.length > 0 && (
                            <View>
                                <Text style={styles.fieldLabel}>Creación vinculada (opcional · ON DELETE SET NULL)</Text>
                                <View style={styles.chipScroll}>
                                    <TouchableOpacity
                                        onPress={() => setCreationId(null)}
                                        style={[styles.filterChip, creationId === null && styles.filterChipActive]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                creationId === null && styles.filterChipTextActive,
                                            ]}
                                        >
                                            Solo con clienta (sin encargo aún)
                                        </Text>
                                    </TouchableOpacity>
                                    {creationsForSelectedClient.map((cr) => (
                                        <TouchableOpacity
                                            key={cr.id}
                                            onPress={() => setCreationId(cr.id)}
                                            style={[styles.filterChip, creationId === cr.id && styles.filterChipActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    creationId === cr.id && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {cr.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {appointmentType === 'supplier_meeting' && (
                            <View>
                                <Text style={styles.fieldLabel}>Proveedor / Casa Textil (M05 · opcional)</Text>
                                {suppliers.length === 0 ? (
                                    <View style={styles.cardNotesBox}>
                                        <Text style={styles.cardNotesText}>
                                            No hay proveedores activos registrados en el catálogo M05. Puedes anotar el proveedor o sedería en el título o en las notas de preparación.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.chipScroll}>
                                        <TouchableOpacity
                                            onPress={() => setSupplierId(null)}
                                            style={[styles.filterChip, supplierId === null && styles.filterChipActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    supplierId === null && styles.filterChipTextActive,
                                                ]}
                                            >
                                                Proveedor general / otro
                                            </Text>
                                        </TouchableOpacity>
                                        {suppliers.slice(0, 10).map((sup) => (
                                            <TouchableOpacity
                                                key={sup.id}
                                                onPress={() => setSupplierId(sup.id)}
                                                style={[styles.filterChip, supplierId === sup.id && styles.filterChipActive]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.filterChipText,
                                                        supplierId === sup.id && styles.filterChipTextActive,
                                                    ]}
                                                >
                                                    {sup.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.rowGap}>
                            <View style={{ flex: 1, minWidth: 180 }}>
                                <Text style={styles.fieldLabel}>Responsable en Atelier</Text>
                                <TextInput
                                    value={assignedStaff}
                                    onChangeText={setAssignedStaff}
                                    placeholder="Katherine Carroll"
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.input}
                                />
                            </View>
                            <View style={{ flex: 1, minWidth: 180 }}>
                                <Text style={styles.fieldLabel}>Visibilidad futura (M09)</Text>
                                <View style={styles.chipScroll}>
                                    <TouchableOpacity
                                        onPress={() => setClientVisibility('internal_only')}
                                        style={[
                                            styles.filterChip,
                                            clientVisibility === 'internal_only' && styles.filterChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                clientVisibility === 'internal_only' && styles.filterChipTextActive,
                                            ]}
                                        >
                                            Solo interna taller
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setClientVisibility('client_visible')}
                                        style={[
                                            styles.filterChip,
                                            clientVisibility === 'client_visible' && styles.filterChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                clientVisibility === 'client_visible' && styles.filterChipTextActive,
                                            ]}
                                        >
                                            Visible portal M09
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View>
                            <Text style={styles.fieldLabel}>Notas de preparación (muestras, tacón, telas, agenda)</Text>
                            <TextInput
                                value={preparationNotes}
                                onChangeText={setPreparationNotes}
                                multiline
                                placeholder="Ej. Tener glasilla hilvanada y muestras Mikado #124E3F listas..."
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, styles.textarea]}
                            />
                        </View>

                        {isEditing && (
                            <View>
                                <Text style={styles.fieldLabel}>Notas de resultado / acuerdo</Text>
                                <TextInput
                                    value={outcomeNotes}
                                    onChangeText={setOutcomeNotes}
                                    multiline
                                    placeholder="Resumen breve tras concluir o ajustar la cita..."
                                    placeholderTextColor={colors.textMuted}
                                    style={[styles.input, styles.textarea]}
                                />
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity onPress={onClose} style={styles.actionBtn} disabled={saving}>
                            <Text style={styles.actionBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={styles.primaryActionBtn}
                            disabled={saving}
                        >
                            <Text style={styles.primaryActionBtnText}>
                                {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Programar en Agenda'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
    );
};
