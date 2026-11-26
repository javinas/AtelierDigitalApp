// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: STEPPER DE CONFECCIÓN M03 (M09 P1.3)
// Archivo: src/components/portalClient/CreationProgressStepper.tsx
// ==============================================================================
// Visualiza las 8 etapas canónicas de confección de alta costura desde
// v_portal_creation_progress aplicando estrictamente la Opción A:
// - Proyecto principal más reciente (updated_at DESC, id DESC).
// - Historial discreto colapsable cuando existan proyectos anteriores, sin mezclar
//   etapas, fechas ni cronologías entre proyectos distintos.
// - Degradación elegante ante ausencia de proyecto o vista SQL no disponible
//   (PGRST205 / 42P01), y manejo recuperable ante error transitorio (H-05).
// ==============================================================================

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PortalCreationProgressView, PortalResponsiveMetrics } from '../../types/portal';
import {
    formatBogotaDate,
    formatCreationStatusLabel,
    getPortalM03StageMetadata,
    PORTAL_M03_STAGES,
} from '../../utils/portalFormatters';
import { PortalProgressDisplayState } from '../../utils/portalCreationProgress';

export interface CreationProgressStepperProps {
    creationStatus: string;
    progressState: PortalProgressDisplayState;
    responsive: PortalResponsiveMetrics;
    onRetry?: () => void;
}

const HistoricalProjectItem: React.FC<{ project: PortalCreationProgressView }> = ({ project }) => {
    const stageMeta = getPortalM03StageMetadata(project.current_stage);
    return (
        <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
                <Text style={styles.historyProjectNumber}>
                    Orden {project.project_number || 'de Taller'}
                </Text>
                <View style={styles.historyStagePill}>
                    <Text style={styles.historyStagePillText}>
                        {stageMeta ? `${stageMeta.step}/8 · ${stageMeta.shortLabel}` : project.current_stage}
                    </Text>
                </View>
            </View>
            <View style={styles.historyMetaRow}>
                {project.actual_delivery_date ? (
                    <Text style={styles.historyMetaText}>
                        Entrega realizada: {formatBogotaDate(project.actual_delivery_date)}
                    </Text>
                ) : project.estimated_delivery_date ? (
                    <Text style={styles.historyMetaText}>
                        Entrega estimada: {formatBogotaDate(project.estimated_delivery_date)}
                    </Text>
                ) : null}
                {project.updated_at ? (
                    <Text style={styles.historyMetaText}>
                        Última actualización: {formatBogotaDate(project.updated_at)}
                    </Text>
                ) : null}
            </View>
        </View>
    );
};

export const CreationProgressStepper: React.FC<CreationProgressStepperProps> = ({
    creationStatus,
    progressState,
    responsive,
    onRetry,
}) => {
    const [showHistory, setShowHistory] = useState<boolean>(false);

    if (progressState.kind === 'loading') {
        return (
            <View style={[styles.card, { padding: responsive.cardPadding }]}>
                <Text style={styles.eyebrow}>SEGUIMIENTO DE ALTA COSTURA</Text>
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.loadingText}>
                        Consultando etapa actual en el atelier...
                    </Text>
                </View>
            </View>
        );
    }

    if (progressState.kind === 'invalid_id') {
        return (
            <View style={[styles.card, { padding: responsive.cardPadding }]}>
                <Text style={styles.eyebrow}>SEGUIMIENTO DE ALTA COSTURA</Text>
                <Text style={styles.fallbackTitle}>Identificador de Creación Inválido</Text>
                <Text style={styles.fallbackText}>
                    No fue posible validar el identificador de esta pieza para consultar su seguimiento de confección.
                </Text>
            </View>
        );
    }

    if (progressState.kind === 'unauthorized') {
        return (
            <View style={[styles.card, { padding: responsive.cardPadding }]}>
                <Text style={styles.eyebrow}>SEGUIMIENTO DE ALTA COSTURA</Text>
                <Text style={styles.fallbackTitle}>Seguimiento Restringido</Text>
                <Text style={styles.fallbackText}>
                    Tu acceso vigente no dispone de autorización activa para consultar el seguimiento de esta pieza.
                </Text>
            </View>
        );
    }

    if (progressState.kind === 'recoverable_error') {
        return (
            <View style={[styles.card, styles.recoverableCard, { padding: responsive.cardPadding }]}>
                <Text style={styles.eyebrow}>SEGUIMIENTO DE ALTA COSTURA</Text>
                <Text style={styles.fallbackTitle}>
                    Interrupción Temporal al Consultar el Taller
                </Text>
                <Text style={styles.fallbackText}>
                    No pudimos actualizar la línea de confección en este momento. La información general de tu pieza permanece disponible.
                </Text>
                {onRetry && (
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={onRetry}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.retryButtonText}>REINTENTAR SEGUIMIENTO</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // Degradación elegante: vista SQL aún no disponible (PGRST205/42P01) o creación aún sin orden M03
    if (progressState.kind === 'view_unavailable' || progressState.kind === 'empty') {
        const isViewUnavailable = progressState.kind === 'view_unavailable';
        return (
            <View style={[styles.card, { padding: responsive.cardPadding }]}>
                <View style={styles.headerRow}>
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.eyebrow}>SEGUIMIENTO DE ALTA COSTURA</Text>
                        <Text style={styles.title}>
                            {isViewUnavailable
                                ? 'Seguimiento Detallado en Preparación'
                                : 'Prenda en Etapa Previa a Confección'}
                        </Text>
                    </View>
                    <View style={styles.preProductionPill}>
                        <Text style={styles.preProductionPillText}>
                            {formatCreationStatusLabel(creationStatus)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.fallbackText}>
                    {isViewUnavailable
                        ? 'El tablero detallado por etapas de taller se activará próximamente en tu portal. Mientras tanto, el estado editorial actual de tu creación permanece actualizado aquí.'
                        : 'Tu creación se encuentra actualmente en fase de curaduría y diseño inicial con Katherine Carroll. En cuanto se abra la orden de confección en taller, podrás seguir aquí cada una de las 8 etapas artesanales.'}
                </Text>
            </View>
        );
    }

    // Estado 'ready': proyecto principal determinista (Opción A) + historial discreto separado
    const primary = progressState.primaryProject;
    if (!primary) return null;

    const currentStageMeta = getPortalM03StageMetadata(primary.current_stage);
    const activeStepNumber = currentStageMeta?.step ?? 0;
    const progressPercent =
        activeStepNumber > 0 ? Math.round((activeStepNumber / PORTAL_M03_STAGES.length) * 100) : 0;

    return (
        <View style={[styles.card, { padding: responsive.cardPadding }]}>
            <View style={styles.headerRow}>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.eyebrow}>
                        SEGUIMIENTO DE CONFECCIÓN · ORDEN {primary.project_number || 'ATELIER'}
                    </Text>
                    <Text style={styles.title}>
                        {currentStageMeta
                            ? `Etapa ${currentStageMeta.step} de 8 · ${currentStageMeta.label}`
                            : 'En Proceso de Taller'}
                    </Text>
                </View>
                <View style={styles.percentPill}>
                    <Text style={styles.percentPillText}>{progressPercent}%</Text>
                </View>
            </View>

            {currentStageMeta && (
                <Text style={styles.stageDescription}>{currentStageMeta.editorialDescription}</Text>
            )}

            {/* Barra editorial de avance */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            {/* Fechas clave exclusivamente del proyecto principal */}
            <View style={styles.datesRow}>
                {primary.estimated_delivery_date && (
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Entrega Estimada</Text>
                        <Text style={styles.dateValue}>
                            {formatBogotaDate(primary.estimated_delivery_date)}
                        </Text>
                    </View>
                )}
                {primary.actual_delivery_date && (
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Entrega Realizada</Text>
                        <Text style={styles.dateValue}>
                            {formatBogotaDate(primary.actual_delivery_date)}
                        </Text>
                    </View>
                )}
                {primary.updated_at && (
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Última Actualización</Text>
                        <Text style={styles.dateValue}>{formatBogotaDate(primary.updated_at)}</Text>
                    </View>
                )}
            </View>

            {/* Stepper adaptativo: timeline vertical en móvil, cuadrícula editorial 4x2 en tablet/escritorio */}
            <View
                style={[
                    styles.stagesContainer,
                    !responsive.isMobile && styles.stagesGridDesktop,
                ]}
            >
                {PORTAL_M03_STAGES.map((stage) => {
                    const isCompleted = activeStepNumber > 0 && stage.step < activeStepNumber;
                    const isCurrent = activeStepNumber > 0 && stage.step === activeStepNumber;

                    return (
                        <View
                            key={stage.key}
                            style={[
                                styles.stageItem,
                                !responsive.isMobile && styles.stageItemDesktop,
                                isCurrent && styles.stageItemCurrent,
                                isCompleted && styles.stageItemCompleted,
                            ]}
                        >
                            <View
                                style={[
                                    styles.stageDot,
                                    isCompleted && styles.stageDotCompleted,
                                    isCurrent && styles.stageDotCurrent,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.stageDotText,
                                        (isCompleted || isCurrent) && styles.stageDotTextActive,
                                    ]}
                                >
                                    {isCompleted ? '✓' : stage.step}
                                </Text>
                            </View>
                            <View style={styles.stageTextWrap}>
                                <Text
                                    style={[
                                        styles.stageLabel,
                                        isCurrent && styles.stageLabelCurrent,
                                        isCompleted && styles.stageLabelCompleted,
                                    ]}
                                >
                                    {responsive.isMobile ? stage.label : stage.shortLabel}
                                </Text>
                                {isCurrent && (
                                    <Text style={styles.stageCurrentHint}>Etapa actual</Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Opción A: Acceso discreto al historial cuando existen órdenes anteriores (aisladas) */}
            {progressState.hasHistory && (
                <View style={styles.historySection}>
                    <TouchableOpacity
                        style={styles.historyToggleButton}
                        onPress={() => setShowHistory((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.historyToggleText}>
                            {showHistory
                                ? `Ocultar órdenes anteriores (${progressState.historicalProjects.length}) ▲`
                                : `Ver órdenes anteriores (${progressState.historicalProjects.length}) ▼`}
                        </Text>
                    </TouchableOpacity>

                    {showHistory && (
                        <View style={styles.historyList}>
                            <Text style={styles.historyDisclaimer}>
                                Registro histórico independiente. Cada orden conserva su propia etapa y cronología sin mezclarse con la orden principal actual.
                            </Text>
                            {progressState.historicalProjects.map((histProject) => (
                                <HistoricalProjectItem key={histProject.id} project={histProject} />
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        marginBottom: 20,
    },
    recoverableCard: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF8',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
    },
    headerTitleWrap: {
        flex: 1,
        minWidth: 160,
    },
    eyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '600',
        fontFamily: typography.serif,
    },
    percentPill: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    percentPillText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    preProductionPill: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    preProductionPillText: {
        color: colors.accentDark,
        fontSize: 11,
        fontWeight: '600',
    },
    stageDescription: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 19,
        marginBottom: 14,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.surfaceSubtle,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.champagneGold,
        borderRadius: 3,
    },
    datesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.line,
        marginBottom: 16,
    },
    dateItem: {
        minWidth: 110,
    },
    dateLabel: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    dateValue: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '600',
    },
    stagesContainer: {
        gap: 8,
    },
    stagesGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    stageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surfaceSubtle,
    },
    stageItemDesktop: {
        width: '23.5%',
        minWidth: 140,
        flexGrow: 1,
    },
    stageItemCompleted: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    stageItemCurrent: {
        backgroundColor: '#FFF8E7',
        borderColor: colors.champagneGold,
    },
    stageDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stageDotCompleted: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    stageDotCurrent: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    stageDotText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
    },
    stageDotTextActive: {
        color: '#FFFFFF',
    },
    stageTextWrap: {
        flex: 1,
    },
    stageLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    stageLabelCompleted: {
        color: colors.success,
        fontWeight: '600',
    },
    stageLabelCurrent: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    stageCurrentHint: {
        fontSize: 10,
        fontWeight: '600',
        color: '#7A5B20',
        marginTop: 1,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 12.5,
    },
    fallbackTitle: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 6,
    },
    fallbackText: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 19,
    },
    retryButton: {
        alignSelf: 'flex-start',
        marginTop: 12,
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    retryButtonText: {
        color: colors.ivoryWarm,
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 1,
    },
    historySection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.line,
    },
    historyToggleButton: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
    },
    historyToggleText: {
        color: colors.accentDark,
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: 0.4,
    },
    historyList: {
        marginTop: 10,
        gap: 8,
    },
    historyDisclaimer: {
        color: colors.textMuted,
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 4,
    },
    historyCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        padding: 12,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    historyProjectNumber: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '600',
    },
    historyStagePill: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    historyStagePillText: {
        color: colors.textSecondary,
        fontSize: 10.5,
        fontWeight: '600',
    },
    historyMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    historyMetaText: {
        color: colors.textMuted,
        fontSize: 11,
    },
});
