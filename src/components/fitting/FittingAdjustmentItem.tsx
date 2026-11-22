// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: ÍTEM AUDITABLE DE AJUSTE EN PRENDA
// Archivo: src/components/fitting/FittingAdjustmentItem.tsx
// ==============================================================================
// Representa una corrección física en prenda real, severidad (minor/normal/critical),
// trazabilidad de taller y acciones de resolución/dispensa (bloqueada en critical).
// ==============================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FittingAdjustment } from '../../types/fitting';
import {
    FITTING_KIND_LABELS,
    FITTING_SEVERITY_LABELS,
    FITTING_STATUS_LABELS,
    FITTING_ZONE_LABELS,
    formatDeltaMm,
    formatFittingDate,
    getAdjustmentSeverityColors,
} from './fittingLabels';
import { fittingStyles as styles } from './fittingStyles';

export interface FittingAdjustmentItemProps {
    adjustment: FittingAdjustment;
    isParentSessionSealed?: boolean;
    onApply?: (adjustment: FittingAdjustment) => void;
    onVerify?: (adjustment: FittingAdjustment) => void;
    onWaive?: (adjustment: FittingAdjustment) => void;
    onCancel?: (adjustment: FittingAdjustment) => void;
}

export const FittingAdjustmentItem: React.FC<FittingAdjustmentItemProps> = ({
    adjustment,
    isParentSessionSealed = false,
    onApply,
    onVerify,
    onWaive,
    onCancel,
}) => {
    const isTerminal =
        adjustment.status === 'verified' ||
        adjustment.status === 'waived' ||
        adjustment.status === 'cancelled';

    const severityColors = getAdjustmentSeverityColors(adjustment.severity);
    const zoneLabel = FITTING_ZONE_LABELS[adjustment.zone_code] || adjustment.zone_code;
    const kindLabel = FITTING_KIND_LABELS[adjustment.adjustment_kind] || adjustment.adjustment_kind;
    const statusLabel = FITTING_STATUS_LABELS[adjustment.status] || adjustment.status;
    const severityLabel = FITTING_SEVERITY_LABELS[adjustment.severity] || adjustment.severity;

    const isCritical = adjustment.severity === 'critical';

    return (
        <View style={styles.adjustmentCard}>
            {/* Cabecera del ajuste */}
            <View style={styles.adjustmentHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.adjustmentTitle}>
                        📍 {zoneLabel} · {kindLabel}
                    </Text>

                    {/* Badge de severidad */}
                    <View
                        style={[
                            styles.badge,
                            {
                                backgroundColor: severityColors.background,
                                borderColor: severityColors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: severityColors.text }]}>
                            {severityLabel}
                        </Text>
                    </View>

                    {/* Versión de fila */}
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionBadgeText}>v{adjustment.row_version}</Text>
                    </View>
                </View>

                {/* Badge de estado del ajuste */}
                <View style={[styles.badge, { backgroundColor: '#F8F6F0', borderColor: '#E6D9C8' }]}>
                    <Text style={[styles.badgeText, { color: '#766B62' }]}>{statusLabel}</Text>
                </View>
            </View>

            {/* Descripción y variación */}
            <Text style={styles.adjustmentDescription}>{adjustment.description}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
                {adjustment.delta_mm !== null && adjustment.delta_mm !== undefined && (
                    <View style={styles.deltaBadge}>
                        <Text style={styles.deltaBadgeText}>
                            Variación: {formatDeltaMm(adjustment.delta_mm)}
                        </Text>
                    </View>
                )}

                {adjustment.requires_cad_update && (
                    <View style={[styles.badge, { backgroundColor: '#FAF5EE', borderColor: '#A78350' }]}>
                        <Text style={[styles.badgeText, { color: '#8A6A4A' }]}>
                            📐 Requiere ajuste CAD (M02)
                        </Text>
                    </View>
                )}
            </View>

            {/* Notas técnicas de taller */}
            {adjustment.workshop_notes && (
                <View style={[styles.notesBlock, { marginVertical: 4, padding: 8 }]}>
                    <Text style={styles.metaLabel}>Notas de Confección:</Text>
                    <Text style={styles.notesText}>{adjustment.workshop_notes}</Text>
                </View>
            )}

            {/* Trazabilidad de ciclo de vida */}
            <View style={{ marginTop: 4 }}>
                {adjustment.applied_at && (
                    <Text style={styles.traceabilityText}>
                        ✂️ Aplicado en prenda el {formatFittingDate(adjustment.applied_at)} por{' '}
                        {adjustment.applied_by_name || 'Taller'}
                    </Text>
                )}
                {adjustment.verified_at && (
                    <Text style={[styles.traceabilityText, { color: '#3D6346' }]}>
                        ✓ Verificado conforme el {formatFittingDate(adjustment.verified_at)} por{' '}
                        {adjustment.verified_by_name || 'Diseño'}
                    </Text>
                )}
                {adjustment.waived_at && (
                    <Text style={[styles.traceabilityText, { color: '#8A6A4A' }]}>
                        ✦ Dispensado el {formatFittingDate(adjustment.waived_at)} por{' '}
                        {adjustment.waived_by_name || 'Diseño'} · Motivo:{' '}
                        {adjustment.waiver_reason || 'Sin justificación'}
                    </Text>
                )}
                {adjustment.cancelled_at && (
                    <Text style={[styles.traceabilityText, { color: '#9E3B3B' }]}>
                        Descartado el {formatFittingDate(adjustment.cancelled_at)} · Motivo:{' '}
                        {adjustment.cancellation_reason || 'Sin motivo'}
                    </Text>
                )}
            </View>

            {/* Acciones de taller sobre el ajuste */}
            {!isTerminal && !isParentSessionSealed && (
                <View style={[styles.actionBtnRow, { marginTop: 8 }]}>
                    {adjustment.status === 'pending' && onApply && (
                        <TouchableOpacity
                            style={[styles.primaryBtn, { minHeight: 34, paddingVertical: 6 }]}
                            onPress={() => onApply(adjustment)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryBtnText}>Marcar Aplicado</Text>
                        </TouchableOpacity>
                    )}

                    {adjustment.status === 'applied' && onVerify && (
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                { backgroundColor: '#3D6346', minHeight: 34, paddingVertical: 6 },
                            ]}
                            onPress={() => onVerify(adjustment)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryBtnText}>✓ Verificar Conforme</Text>
                        </TouchableOpacity>
                    )}

                    {onWaive && (
                        <TouchableOpacity
                            style={[
                                styles.secondaryBtn,
                                { minHeight: 34, paddingVertical: 6 },
                                isCritical && styles.disabledBtn,
                            ]}
                            disabled={isCritical}
                            onPress={() => onWaive(adjustment)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryBtnText}>
                                {isCritical ? 'Dispensa Prohibida (Crítico)' : 'Dispensar'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {onCancel && (
                        <TouchableOpacity
                            style={[styles.dangerBtn, { minHeight: 34, paddingVertical: 6 }]}
                            onPress={() => onCancel(adjustment)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.dangerBtnText}>Descartar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

