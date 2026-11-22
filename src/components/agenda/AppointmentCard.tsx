// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: TARJETA DE CITA / HITO (MÓDULO 08)
// Archivo: src/components/agenda/AppointmentCard.tsx
// ==============================================================================

import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { UnifiedAgendaItem } from '../../types/agenda';
import {
    AGENDA_SOURCE_META,
    APPOINTMENT_STATUS_META,
    APPOINTMENT_TYPE_LABELS,
    LOCATION_SPACE_LABELS,
} from './agendaLabels';
import { agendaStyles as styles } from './agendaStyles';

export interface AppointmentCardProps {
    item: UnifiedAgendaItem;
    showDate?: boolean;
    busy?: boolean;
    onConfirm?: (item: UnifiedAgendaItem) => void;
    onComplete?: (item: UnifiedAgendaItem) => void;
    onEdit?: (item: UnifiedAgendaItem) => void;
    onCancel?: (item: UnifiedAgendaItem, reason: string) => Promise<boolean> | boolean;
    onShareOrExport?: (item: UnifiedAgendaItem) => void;
    onOpenClient?: (clientId: string) => void;
    onOpenCreation?: (creationId: string) => void;
    onOpenFittings?: () => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
    item,
    showDate = false,
    busy = false,
    onConfirm,
    onComplete,
    onEdit,
    onCancel,
    onShareOrExport,
    onOpenClient,
    onOpenCreation,
    onOpenFittings,
}) => {
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelError, setCancelError] = useState<string | null>(null);

    const statusMeta = APPOINTMENT_STATUS_META[item.status] || APPOINTMENT_STATUS_META.scheduled;
    const sourceMeta = AGENDA_SOURCE_META[item.source_kind] || AGENDA_SOURCE_META.m08_appointment;
    const spaceLabel = item.location_label_override || LOCATION_SPACE_LABELS[item.location_space] || item.location_space;
    const typeLabel = APPOINTMENT_TYPE_LABELS[item.appointment_type] || item.appointment_type;

    const isCancelled = item.status === 'cancelled';
    const isCompleted = item.status === 'completed';
    const canMutateM08 = item.source_kind === 'm08_appointment' && item.is_editable && !isCancelled;

    const handleSubmitCancel = async () => {
        if (!cancelReason.trim()) {
            setCancelError('Ingresa el motivo de cancelación para la bitácora.');
            return;
        }
        setCancelError(null);
        if (onCancel) {
            const ok = await onCancel(item, cancelReason.trim());
            if (ok) {
                setShowCancelForm(false);
                setCancelReason('');
            }
        }
    };

    return (
        <View
            style={[
                styles.card,
                { borderLeftWidth: 4, borderLeftColor: sourceMeta.accent },
                isCancelled && styles.cardCancelled,
            ]}
        >
            <View style={styles.cardTopRow}>
                <View style={styles.cardTimePill}>
                    <Text style={styles.cardTimeText}>
                        {showDate ? `${item.bogota_date} · ` : ''}
                        {item.bogota_start_time} – {item.bogota_end_time} (BOG)
                    </Text>
                </View>

                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: sourceMeta.bg, borderColor: sourceMeta.border }]}>
                        <Text style={[styles.badgeText, { color: sourceMeta.accent }]}>{sourceMeta.badge}</Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                        <Text style={[styles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.cardTitle}>{item.title}</Text>

            <View style={styles.badgeRow}>
                <Text style={styles.cardMetaText}>✦ {typeLabel}</Text>
                <Text style={styles.cardMetaText}>· 📍 {spaceLabel}</Text>
                {item.client_visibility === 'client_visible' && (
                    <Text style={[styles.cardMetaText, { color: colors.champagneGold, fontWeight: '700' }]}>
                        · Portal M09 listo
                    </Text>
                )}
            </View>

            {(item.client_name || item.creation_name || item.supplier_name || item.assigned_staff) && (
                <View style={{ gap: 2 }}>
                    {item.client_name ? (
                        <Text style={styles.cardMetaText}>
                            👤 Clienta: <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{item.client_name}</Text>
                            {item.person_name ? ` (Sujeto: ${item.person_name})` : ''}
                            {item.client_phone ? ` · ${item.client_phone}` : ''}
                        </Text>
                    ) : (
                        <Text style={styles.cardMetaText}>
                            🏷️ Actividad sin clienta asociada (interna / proveedor)
                        </Text>
                    )}

                    {item.creation_name ? (
                        <Text style={styles.cardMetaText}>
                            ✂️ Encargo: <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{item.creation_name}</Text>
                        </Text>
                    ) : null}

                    {item.supplier_name ? (
                        <Text style={styles.cardMetaText}>
                            🧵 Proveedor: <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{item.supplier_name}</Text>
                        </Text>
                    ) : null}

                    {item.assigned_staff ? (
                        <Text style={styles.cardMetaText}>👥 Responsable: {item.assigned_staff}</Text>
                    ) : null}
                </View>
            )}

            {(item.preparation_notes || item.outcome_notes || item.cancellation_reason) && (
                <View style={styles.cardNotesBox}>
                    {item.preparation_notes ? (
                        <Text style={styles.cardNotesText}>📝 {item.preparation_notes}</Text>
                    ) : null}
                    {item.outcome_notes ? (
                        <Text style={[styles.cardNotesText, { marginTop: item.preparation_notes ? 4 : 0 }]}>
                            ✓ Resultado: {item.outcome_notes}
                        </Text>
                    ) : null}
                    {item.cancellation_reason ? (
                        <Text style={[styles.cardNotesText, { color: colors.error, marginTop: 4 }]}>
                            ✕ Cancelada: {item.cancellation_reason}
                        </Text>
                    ) : null}
                </View>
            )}

            <View style={styles.cardActionsRow}>
                {canMutateM08 && (item.status === 'scheduled' || item.status === 'rescheduled') && onConfirm && (
                    <TouchableOpacity
                        disabled={busy}
                        onPress={() => onConfirm(item)}
                        style={[styles.actionBtn, styles.actionBtnGold]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>✓ Confirmar</Text>
                    </TouchableOpacity>
                )}

                {canMutateM08 && !isCompleted && onComplete && (
                    <TouchableOpacity
                        disabled={busy}
                        onPress={() => onComplete(item)}
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>✓ Realizada</Text>
                    </TouchableOpacity>
                )}

                {canMutateM08 && !isCompleted && onEdit && (
                    <TouchableOpacity
                        disabled={busy}
                        onPress={() => onEdit(item)}
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>✎ Reprogramar / Editar</Text>
                    </TouchableOpacity>
                )}

                {canMutateM08 && !isCompleted && onCancel && (
                    <TouchableOpacity
                        disabled={busy}
                        onPress={() => {
                            setShowCancelForm((prev) => !prev);
                            setCancelError(null);
                        }}
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnDangerText}>
                            {showCancelForm ? 'Cerrar' : '✕ Cancelar'}
                        </Text>
                    </TouchableOpacity>
                )}

                {item.client_id && onOpenClient && (
                    <TouchableOpacity
                        onPress={() => onOpenClient(item.client_id!)}
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>Clienta →</Text>
                    </TouchableOpacity>
                )}

                {item.creation_id && onOpenCreation && (
                    <TouchableOpacity
                        onPress={() => onOpenCreation(item.creation_id!)}
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>Creación →</Text>
                    </TouchableOpacity>
                )}

                {item.source_kind === 'm06_fitting_session' && onOpenFittings && (
                    <TouchableOpacity
                        onPress={onOpenFittings}
                        style={[styles.actionBtn, styles.actionBtnGold]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>Ir a Fitting M06 →</Text>
                    </TouchableOpacity>
                )}

                {onShareOrExport && (
                    <TouchableOpacity
                        disabled={busy}
                        onPress={() => onShareOrExport(item)}
                        style={styles.actionBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>📅 Calendario / PDF</Text>
                    </TouchableOpacity>
                )}
            </View>

            {showCancelForm && canMutateM08 && !isCompleted && (
                <View style={[styles.cardNotesBox, { gap: 8, backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
                    <Text style={[styles.fieldLabel, { color: colors.error, marginBottom: 0 }]}>
                        Motivo obligatorio de cancelación
                    </Text>
                    <TextInput
                        value={cancelReason}
                        onChangeText={setCancelReason}
                        placeholder="Ej. Clienta solicitó cambio de semana..."
                        placeholderTextColor={colors.textMuted}
                        style={[styles.input, { backgroundColor: '#FFFFFF' }]}
                    />
                    {cancelError ? <Text style={{ color: colors.error, fontSize: 12 }}>{cancelError}</Text> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => {
                                setShowCancelForm(false);
                                setCancelReason('');
                                setCancelError(null);
                            }}
                            style={styles.actionBtn}
                        >
                            <Text style={styles.actionBtnText}>Volver</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={busy}
                            onPress={handleSubmitCancel}
                            style={[styles.actionBtn, styles.actionBtnDanger]}
                        >
                            <Text style={styles.actionBtnDangerText}>Confirmar Cancelación</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};
