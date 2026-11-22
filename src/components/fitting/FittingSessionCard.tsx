// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: TARJETA EDITORIAL DE SESIÓN DE PRUEBA
// Archivo: src/components/fitting/FittingSessionCard.tsx
// ==============================================================================
// Representa una sesión física sobre cuerpo real, aplomo, altura de tacón,
// estado de calce (intermedio vs final_for_delivery) y versión de fila optimista.
// ==============================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FittingSession } from '../../types/fitting';
import {
    FITTING_BALANCE_ASSESSMENT_LABELS,
    FITTING_ROUND_LABELS,
    formatFittingDate,
    formatHeelHeight,
    getFittingSessionStatusColors,
} from './fittingLabels';
import { fittingStyles as styles } from './fittingStyles';

export interface FittingSessionCardProps {
    session: FittingSession;
    openAdjustmentsCount?: number;
    canDeliver?: boolean;
    onEdit?: (session: FittingSession) => void;
    onApprove?: (session: FittingSession) => void;
    onAddAdjustment?: (session: FittingSession) => void;
    onDeliver?: (session: FittingSession) => void;
}

export const FittingSessionCard: React.FC<FittingSessionCardProps> = ({
    session,
    openAdjustmentsCount = 0,
    canDeliver = false,
    onEdit,
    onApprove,
    onAddAdjustment,
    onDeliver,
}) => {
    const isDelivered = Boolean(session.delivery_confirmed_at);
    const isApproved = session.status === 'approved';
    const isCancelled = session.status === 'cancelled';
    const isSealed = isApproved || isCancelled || isDelivered;

    const statusColors = getFittingSessionStatusColors(
        session.status,
        session.approval_scope,
        isDelivered
    );

    const roundLabel = FITTING_ROUND_LABELS[session.round_type] || session.round_type;
    const balanceLabel =
        FITTING_BALANCE_ASSESSMENT_LABELS[session.balance_assessment] || session.balance_assessment;

    return (
        <View style={styles.sectionCard}>
            {/* Cabecera de la sesión */}
            <View style={styles.sessionHeader}>
                <View style={{ flex: 1, minWidth: 200 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={styles.roundBadge}>
                            <Text style={styles.roundBadgeText}>
                                {String(session.session_number).padStart(2, '0')} · {roundLabel}
                            </Text>
                        </View>
                        <View style={styles.versionBadge}>
                            <Text style={styles.versionBadgeText}>v{session.row_version}</Text>
                        </View>
                    </View>
                    <Text style={styles.titleEditorial}>{session.title}</Text>
                </View>

                {/* Badge de estado con distinción intermedia vs final */}
                <View
                    style={[
                        styles.badge,
                        {
                            backgroundColor: statusColors.background,
                            borderColor: statusColors.border,
                        },
                    ]}
                >
                    <Text style={[styles.badgeText, { color: statusColors.text }]}>
                        {statusColors.badgeLabel}
                    </Text>
                </View>
            </View>

            {/* Cuadrícula de metadatos técnicos de calce */}
            <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Cita Programada</Text>
                    <Text style={styles.metaValue}>{formatFittingDate(session.scheduled_at)}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Realizada en Atelier</Text>
                    <Text style={styles.metaValue}>
                        {session.conducted_at ? formatFittingDate(session.conducted_at) : 'Pendiente de prueba'}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Tacón Calzado</Text>
                    <Text style={styles.metaValue}>{formatHeelHeight(session.footwear_heel_cm)}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Aplomo & Balance</Text>
                    <Text style={styles.metaValue}>{balanceLabel}</Text>
                </View>
            </View>

            {/* Lugar y estado de la prenda */}
            {(session.location_note || session.garment_state_note) && (
                <View style={{ marginBottom: 6 }}>
                    {session.location_note ? (
                        <Text style={styles.subtitleEditorial}>📍 {session.location_note}</Text>
                    ) : null}
                    {session.garment_state_note ? (
                        <Text style={styles.subtitleEditorial}>👗 {session.garment_state_note}</Text>
                    ) : null}
                </View>
            )}

            {/* Alerta de revisión CAD */}
            {session.requires_cad_revision && (
                <View
                    style={[
                        styles.badge,
                        {
                            backgroundColor: '#FAF5EE',
                            borderColor: '#A78350',
                            marginVertical: 4,
                        },
                    ]}
                >
                    <Text style={[styles.badgeText, { color: '#8A6A4A' }]}>
                        ⚡ Requiere revisión o recálculo paramétrico en CAD (M02)
                    </Text>
                </View>
            )}

            {/* Notas técnicas de calce */}
            {session.summary_notes && (
                <View style={styles.notesBlock}>
                    <Text style={styles.metaLabel}>Notas de Calce y Caída:</Text>
                    <Text style={styles.notesText}>{session.summary_notes}</Text>
                </View>
            )}

            {/* Percepción de la clienta */}
            {session.client_feedback_notes && (
                <View style={[styles.notesBlock, { borderLeftColor: '#8A6A4A' }]}>
                    <Text style={styles.metaLabel}>Percepción de la Clienta:</Text>
                    <Text style={styles.notesText}>{session.client_feedback_notes}</Text>
                </View>
            )}

            {/* Sellos inmutables de aprobación / entrega */}
            {isApproved && session.fit_approved_at && (
                <View style={{ marginTop: 6, paddingVertical: 4 }}>
                    <Text style={styles.traceabilityText}>
                        ✦ Calce aprobado el {formatFittingDate(session.fit_approved_at)} por{' '}
                        {session.fit_approved_by_name || 'Dirección de Taller'}
                        {session.fit_approval_notes ? ` · "${session.fit_approval_notes}"` : ''}
                    </Text>
                </View>
            )}

            {isDelivered && session.delivery_confirmed_at && (
                <View style={{ marginTop: 4, paddingVertical: 4 }}>
                    <Text style={[styles.traceabilityText, { color: '#8A6A4A', fontWeight: '600' }]}>
                        👑 Ceremonial de entrega confirmado el {formatFittingDate(session.delivery_confirmed_at)} por{' '}
                        {session.delivery_confirmed_by_name || 'Katherine Carroll'}
                        {session.delivery_notes ? ` · "${session.delivery_notes}"` : ''}
                    </Text>
                </View>
            )}

            {isCancelled && session.cancelled_at && (
                <View style={{ marginTop: 4, paddingVertical: 4 }}>
                    <Text style={[styles.traceabilityText, { color: '#9E3B3B' }]}>
                        Cita cancelada el {formatFittingDate(session.cancelled_at)} · Motivo:{' '}
                        {session.cancellation_reason || 'Sin motivo especificado'}
                    </Text>
                </View>
            )}

            {/* Acciones de la sesión */}
            <View style={styles.actionBtnRow}>
                {!isSealed && onEdit && (
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => onEdit(session)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryBtnText}>Editar Cita</Text>
                    </TouchableOpacity>
                )}

                {!isSealed && onAddAdjustment && (
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => onAddAdjustment(session)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryBtnText}>+ Anotar Ajuste</Text>
                    </TouchableOpacity>
                )}

                {!isSealed && onApprove && (
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => onApprove(session)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryBtnText}>Dictaminar / Aprobar</Text>
                    </TouchableOpacity>
                )}

                {/* Confirmar entrega solo si está aprobada final y cumple condiciones */}
                {isApproved &&
                    session.approval_scope === 'final_for_delivery' &&
                    !isDelivered &&
                    onDeliver && (
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                { backgroundColor: '#A78350' },
                                !canDeliver && styles.disabledBtn,
                            ]}
                            disabled={!canDeliver}
                            onPress={() => onDeliver(session)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryBtnText}>
                                {canDeliver
                                    ? '👑 Ceremonial de Entrega'
                                    : `Entrega bloqueada (${openAdjustmentsCount} ajuste(s) pendiente(s))`}
                            </Text>
                        </TouchableOpacity>
                    )}
            </View>
        </View>
    );
};

