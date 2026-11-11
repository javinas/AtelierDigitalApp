// ==============================================================================
// CONTENIDO DE PESTAÑA: LISTA DE JORNADAS DE MEDICIÓN
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { MeasurementCampaign } from '../../../types/pattern/measurementCampaign';
import { styles } from './personGroupStyles';

interface CampaignsTabContentProps {
    loading: boolean;
    error: string | null;
    campaigns: MeasurementCampaign[];
    onRetry: () => void;
    onCreateCampaign: () => void;
    onFastCapture: (camp: MeasurementCampaign) => void;
    onPrintSheet: (camp: MeasurementCampaign) => void;
}

export const CampaignsTabContent: React.FC<CampaignsTabContentProps> = ({
    loading,
    error,
    campaigns,
    onRetry,
    onCreateCampaign,
    onFastCapture,
    onPrintSheet,
}) => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.champagneGold} />
                <Text style={styles.loadingText}>Cargando jornadas de medición...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>Error al cargar jornadas</Text>
                <Text style={styles.emptyStateDesc}>{error}</Text>
                <TouchableOpacity style={styles.emptyStateBtn} onPress={onRetry}>
                    <Text style={styles.emptyStateBtnText}>🔄 Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.cardsGrid}>
            {campaigns.length === 0 ? (
                <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>Sin jornadas de medición planificadas</Text>
                    <Text style={styles.emptyStateDesc}>
                        Organice tomas de medidas masivas para cursos escolares, comparsas, familias o dotaciones corporativas con plantillas predefinidas y fichas imprimibles A4.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyStateBtn}
                        onPress={onCreateCampaign}
                    >
                        <Text style={styles.emptyStateBtnText}>+ Planificar Primera Jornada</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                campaigns.map((camp) => {
                    const isCompleted = camp.status === 'completed';
                    const isInProgress = camp.status === 'in_progress';

                    const modeLabel =
                        camp.mode === 'standard_only'
                            ? 'Solo Talla'
                            : camp.mode === 'standard_with_adjustments'
                                ? 'Talla + Ajustes'
                                : 'Medidas Manuales';

                    return (
                        <View key={camp.id} style={styles.campaignCard}>
                            <View style={styles.campaignCardHeader}>
                                <View style={styles.campaignBadgeRow}>
                                    <View
                                        style={[
                                            styles.campaignStatusBadge,
                                            isCompleted
                                                ? styles.campaignStatusDone
                                                : isInProgress
                                                    ? styles.campaignStatusProgress
                                                    : styles.campaignStatusDraft,
                                        ]}
                                    >
                                        <Text style={styles.campaignStatusBadgeText}>
                                            {isCompleted ? '✓ COMPLETADA' : isInProgress ? '⏳ EN CURSO' : '○ BORRADOR'}
                                        </Text>
                                    </View>

                                    <Text style={styles.campaignDateText}>📅 {camp.campaign_date}</Text>
                                </View>

                                <Text style={styles.campaignTitle}>{camp.title}</Text>
                                <Text style={styles.campaignGroupText}>
                                    Grupo: <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{camp.group_name || 'Grupo'}</Text>
                                </Text>
                            </View>

                            <View style={styles.campaignMetaBox}>
                                <Text style={styles.campaignMetaText}>
                                    Plantilla: <Text style={{ fontWeight: '600' }}>{camp.template_name || camp.template_id}</Text>
                                </Text>
                                <Text style={styles.campaignMetaText}>
                                    Modalidad: <Text style={{ fontWeight: '600' }}>{modeLabel}</Text>
                                </Text>
                            </View>

                            {/* Barra de Progreso */}
                            <View style={styles.campaignProgressBox}>
                                <View style={styles.campaignProgressLabels}>
                                    <Text style={styles.campaignProgressCount}>
                                        👥 {camp.completed_count || 0} de {camp.total_participants || 0} personas
                                    </Text>
                                    <Text style={styles.campaignProgressPercent}>
                                        {camp.progress_percentage || 0}%
                                    </Text>
                                </View>
                                <View style={styles.campaignProgressTrack}>
                                    <View
                                        style={[
                                            styles.campaignProgressFill,
                                            { width: `${camp.progress_percentage || 0}%` },
                                        ]}
                                    />
                                </View>
                            </View>

                            {/* Acciones */}
                            <View style={styles.campaignCardActionsRow}>
                                <TouchableOpacity
                                    style={styles.fastCaptureActionBtn}
                                    onPress={() => onFastCapture(camp)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.fastCaptureActionBtnText}>⚡ Captura Rápida</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.printSheetActionBtn}
                                    onPress={() => onPrintSheet(camp)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.printSheetActionBtnText}>📄 Fichas A4</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })
            )}
        </View>
    );
};

