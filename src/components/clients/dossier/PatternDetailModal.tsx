// ==============================================================================
// MODAL: DETALLE DEL PATRÓN, INMUTABILIDAD Y LINAJE (ALTA COSTURA)
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { Client } from '../../../types/client';
import { Creation } from '../../../types/creation';
import { MeasuredPerson } from '../../../types/personGroup';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { PatternAdjustment, PatternExecution } from '../../../types/pattern/pattern';
import { MASTER_MEASUREMENT_CATALOG } from '../../../engine/pattern/catalog/masterCatalog';
import { styles } from './clientDossierStyles';

interface PatternDetailModalProps {
    visible: boolean;
    pattern: PatternExecution | null;
    client: Client;
    patterns: PatternExecution[];
    creationMap: Map<string, Creation>;
    sessionMap: Map<string, MeasurementSession>;
    personMap: Map<string, MeasuredPerson>;
    lineageChain: PatternExecution[];
    patternAdjustments: PatternAdjustment[];
    loadingAdjustments: boolean;
    isInstitutional: boolean;
    latestTitularSession: MeasurementSession | null;
    getPatternGarmentPhoto: (garmentType: string, creation?: Creation | null) => any;
    getGarmentLabel: (type: string) => string;
    getTemplateLabel: (garmentType: string) => string;
    onInspectPattern: (p: PatternExecution) => void;
    onClose: () => void;
}

export const PatternDetailModal: React.FC<PatternDetailModalProps> = ({
    visible,
    pattern,
    client,
    patterns,
    creationMap,
    sessionMap,
    personMap,
    lineageChain,
    patternAdjustments,
    loadingAdjustments,
    isInstitutional,
    latestTitularSession,
    getPatternGarmentPhoto,
    getGarmentLabel,
    getTemplateLabel,
    onInspectPattern,
    onClose,
}) => {
    if (!pattern) return null;

    const formatDate = (dateStr?: string | null): string => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const getPatternOrigin = (p: PatternExecution) => {
        const isDirect = !p.creation_id;
        const isCreation = Boolean(p.creation_id);
        const isDerived = Boolean(p.parent_execution_id);

        let badgeText = '';
        let badgeColor = '#333333';

        if (isCreation && isDerived) {
            badgeText = 'CREACIÓN · DERIVADO';
            badgeColor = '#B37D14';
        } else if (isDirect && isDerived) {
            badgeText = 'PATRONAJE DIRECTO · DERIVADO';
            badgeColor = '#2E7D32';
        } else if (isCreation) {
            badgeText = 'CREACIÓN';
            badgeColor = '#8A5D10';
        } else {
            badgeText = 'PATRONAJE DIRECTO';
            badgeColor = '#4A5568';
        }

        return { badgeText, badgeColor };
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Image
                            source={getPatternGarmentPhoto(
                                pattern.garment_type,
                                pattern.creation_id ? creationMap.get(pattern.creation_id) : null
                            )}
                            style={styles.modalGarmentPhoto}
                            resizeMode="cover"
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.modalSuper}>DETALLE TÉCNICO DEL PATRÓN · ALTA COSTURA</Text>
                            <Text style={styles.modalTitle}>
                                {getGarmentLabel(pattern.garment_type)} · {pattern.version_label}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseBtn}
                        >
                            <Text style={styles.modalCloseBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 520, padding: 16 }} showsVerticalScrollIndicator={false}>
                        {/* AVISO DE INMUTABILIDAD ESTRICTA */}
                        <View style={styles.inmutabilityNoticeBox}>
                            <Text style={styles.inmutabilityNoticeTitle}>
                                🛡️ EJECUCIÓN HISTÓRICA INMUTABLE
                            </Text>
                            <Text style={styles.inmutabilityNoticeBody}>
                                Esta ejecución es estrictamente inmutable para garantizar la reproducibilidad y trazabilidad técnica en taller. No se permite edición directa. Las modificaciones de fitting engendran una nueva versión derivada.
                            </Text>
                        </View>

                        {/* DETALLE TÉCNICO */}
                        <View style={styles.modalDetailCard}>
                            <Text style={styles.modalDetailCardTitle}>FICHA DE TRAZABILIDAD</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Prenda:</Text>
                                <Text style={styles.detailValue}>{getGarmentLabel(pattern.garment_type)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Plantilla:</Text>
                                <Text style={styles.detailValue}>
                                    {pattern.template?.name || getTemplateLabel(pattern.garment_type)}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Versión:</Text>
                                <Text style={styles.detailValueBold}>{pattern.version_label}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Estado:</Text>
                                <Text style={styles.detailValueBold}>{pattern.status}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Clienta:</Text>
                                <Text style={styles.detailValue}>{client.full_name}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Sesión de medidas:</Text>
                                <Text style={styles.detailValue}>
                                    {pattern.session_id
                                        ? sessionMap.get(pattern.session_id)
                                            ? `Sesión v${sessionMap.get(pattern.session_id)!.version_number} (${formatDate(sessionMap.get(pattern.session_id)!.session_date)})`
                                            : `ID #${pattern.session_id.slice(0, 8)}`
                                        : 'Sin sesión asignada'}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Creación:</Text>
                                <Text style={styles.detailValue}>
                                    {pattern.creation_id
                                        ? creationMap.get(pattern.creation_id)?.name || 'Creación vinculada'
                                        : 'Sin Creación (Patronaje Directo)'}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Origen:</Text>
                                <Text style={[styles.detailValueBold, { color: getPatternOrigin(pattern).badgeColor }]}>
                                    {getPatternOrigin(pattern).badgeText}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Fecha:</Text>
                                <Text style={styles.detailValue}>{formatDate(pattern.created_at)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Patrón Padre (Linaje):</Text>
                                {pattern.parent_execution_id ? (
                                    <TouchableOpacity
                                        onPress={() => {
                                            const parentP = patterns.find((p) => p.id === pattern.parent_execution_id);
                                            if (parentP) onInspectPattern(parentP);
                                        }}
                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                    >
                                        <Text style={[styles.detailValueBold, { color: colors.champagneGold, textDecorationLine: 'underline' }]}>
                                            {patterns.find((p) => p.id === pattern.parent_execution_id)?.version_label || 'Versión anterior'} (#{pattern.parent_execution_id.slice(0, 8)}) →
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.detailValue}>Raíz original (Trazado base)</Text>
                                )}
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Aprobación Técnica:</Text>
                                <Text style={[styles.detailValueBold, { color: pattern.status === 'approved_by_designer' ? '#2E7D32' : colors.textSecondary }]}>
                                    {pattern.status === 'approved_by_designer'
                                        ? '✓ Aprobado para corte final · Katherine Carroll'
                                        : pattern.status === 'pending_fitting'
                                        ? '⏳ En prueba de vestuario (Fitting pendiente)'
                                        : 'Pendiente de fitting y aprobación'}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Diseñadora:</Text>
                                <Text style={styles.detailValue}>Katherine Carroll · Atelier Digital</Text>
                            </View>
                        </View>

                        {/* LINAJE DE VERSIONES HISTÓRICAS */}
                        <View style={styles.modalDetailCard}>
                            <Text style={styles.modalDetailCardTitle}>LINAJE & HISTORIAL DE VERSIONES</Text>
                            <Text style={styles.modalDetailCardSub}>
                                Selecciona cualquier versión para inspeccionar su histórico inmutable:
                            </Text>

                            <View style={styles.lineageTreeContainer}>
                                {lineageChain.map((item, idx) => {
                                    const isCurrent = item.id === pattern.id;
                                    return (
                                        <View key={item.id} style={styles.lineageNodeWrapper}>
                                            <TouchableOpacity
                                                onPress={() => onInspectPattern(item)}
                                                style={[
                                                    styles.lineageNodeCard,
                                                    isCurrent && styles.lineageNodeCardCurrent,
                                                ]}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.lineageNodeTop}>
                                                    <Text
                                                        style={[
                                                            styles.lineageVersionText,
                                                            isCurrent && styles.lineageVersionTextCurrent,
                                                        ]}
                                                    >
                                                        {item.version_label}
                                                    </Text>
                                                    <Text style={styles.lineageStatusTag}>
                                                        {item.status === 'approved_by_designer'
                                                            ? '✓ APROBADO'
                                                            : item.status.toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={styles.lineageNodeDate}>
                                                    {formatDate(item.created_at)} · {item.parent_execution_id ? 'Derivada' : 'Raíz original'}
                                                </Text>
                                            </TouchableOpacity>
                                            {idx < lineageChain.length - 1 && (
                                                <View style={styles.lineageArrowWrap}>
                                                    <Text style={styles.lineageArrowText}>↓</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* COMPARACIÓN DE MEDIDAS: SNAPSHOT VS MEDIDAS ACTUALES */}
                        <View style={styles.modalDetailCard}>
                            <Text style={styles.modalDetailCardTitle}>TRAZABILIDAD DE MEDIDAS ANATÓMICAS</Text>
                            <Text style={styles.modalDetailCardSub}>
                                Diferencia entre el snapshot utilizado al generar este patrón y las medidas actuales de la clienta.
                            </Text>

                            <View style={styles.measComparisonBox}>
                                <View style={styles.measCol}>
                                    <Text style={styles.measColHeader}>
                                        MEDIDAS UTILIZADAS EN ESTE PATRÓN (Snapshot Inmutable)
                                    </Text>
                                    {pattern.measurement_snapshot ? (
                                        Object.entries(pattern.measurement_snapshot).slice(0, 8).map(([code, val]) => (
                                            <View key={code} style={styles.measItemSmall}>
                                                <Text style={styles.measItemSmallKey}>
                                                    {(MASTER_MEASUREMENT_CATALOG as Record<string, any>)[code]?.name || code}:
                                                </Text>
                                                <Text style={styles.measItemSmallVal}>{val} cm</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.emptyStateNotice}>Sin snapshot registrado</Text>
                                    )}
                                </View>

                                <View style={styles.measColDivider} />

                                <View style={styles.measCol}>
                                    {(() => {
                                        const patSession = pattern.session_id ? sessionMap.get(pattern.session_id) : null;
                                        const comparisonSession = patSession || (!isInstitutional ? latestTitularSession : null);
                                        const comparisonPerson = comparisonSession?.person_id ? personMap.get(comparisonSession.person_id) : null;

                                        return (
                                            <>
                                                <Text style={styles.measColHeader}>
                                                    {comparisonPerson
                                                        ? `MEDIDAS: ${comparisonPerson.full_name.toUpperCase()}`
                                                        : isInstitutional
                                                        ? 'MEDIDAS DE SESIÓN VINCULADA'
                                                        : 'MEDIDAS ACTUALES DE LA CLIENTA (Última Sesión)'}
                                                </Text>
                                                {comparisonSession?.values ? (
                                                    Object.entries(comparisonSession.values).slice(0, 8).map(([code, item]) => {
                                                        const cm = item.value_mm ? (item.value_mm / 10).toFixed(1) : '—';
                                                        return (
                                                            <View key={code} style={styles.measItemSmall}>
                                                                <Text style={styles.measItemSmallKey}>
                                                                    {(MASTER_MEASUREMENT_CATALOG as Record<string, any>)[code]?.name || code}:
                                                                </Text>
                                                                <Text style={styles.measItemSmallVal}>{cm} cm</Text>
                                                            </View>
                                                        );
                                                    })
                                                ) : (
                                                    <Text style={styles.emptyStateNotice}>
                                                        {isInstitutional
                                                            ? 'Sin sesión de medidas vinculada a este patrón'
                                                            : 'Sin medidas actuales'}
                                                    </Text>
                                                )}
                                            </>
                                        );
                                    })()}
                                </View>
                            </View>
                        </View>

                        {/* AJUSTES DE FITTING HISTÓRICOS */}
                        <View style={styles.modalDetailCard}>
                            <Text style={styles.modalDetailCardTitle}>AJUSTES DE FITTING REGISTRADOS ({patternAdjustments.length})</Text>
                            {loadingAdjustments ? (
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            ) : patternAdjustments.length === 0 ? (
                                <Text style={styles.emptyStateNotice}>
                                    Esta versión no tiene ajustes manuales registrados.
                                </Text>
                            ) : (
                                <View style={{ gap: 8, marginTop: 6 }}>
                                    {patternAdjustments.map((adj) => (
                                        <View key={adj.id} style={styles.adjItemCard}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <Text style={styles.adjItemType}>{adj.adjustment_type?.toUpperCase()}</Text>
                                                <Text style={styles.adjItemDate}>{formatDate(adj.fitting_date)}</Text>
                                            </View>
                                            <Text style={styles.adjItemDesc}>{adj.description}</Text>
                                            <Text style={styles.adjItemPiece}>
                                                Pieza: {adj.target_piece} · Delta: {adj.delta_mm > 0 ? `+${adj.delta_mm}` : adj.delta_mm} mm
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalDoneBtn}
                        >
                            <Text style={styles.modalDoneBtnText}>Cerrar Detalle</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

