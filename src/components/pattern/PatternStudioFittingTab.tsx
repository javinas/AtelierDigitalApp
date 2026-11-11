// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: PESTAÑA DE FITTING Y PRUEBAS DE CALCE
// Archivo: src/components/pattern/PatternStudioFittingTab.tsx
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { styles } from './patternModuleStyles';
import {
    FIT_ADJUSTMENT_TYPES,
    FitAdjustmentCode,
    PatternAdjustment,
    PatternExecution,
    PatternTemplate,
} from '../../types/pattern/pattern';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { CreationFittingNotebook, ZoomTarget } from './creationFlow/CreationFlowViews';

export interface PatternStudioFittingTabProps {
    activeWorkflow: string;
    adjustmentsHistory: PatternAdjustment[];
    currentExecution: PatternExecution | null;
    setCreationZoomTarget: (z: ZoomTarget) => void;
    handleOpenAddAdjustmentModal: () => void;
    geometryResult: PatternGeometryResult | null;
    setActiveStudioTab: (tab: any) => void;
    fittingStatus: any;
    lastRegenerationResult: any;
    selectedClient: Client | null;
    selectedCreation: Creation | null;
    selectedTemplate: PatternTemplate | null;
    freePatternProfileLabel: string;
    selectedSession: MeasurementSession | null;
    role?: string | null;
    stagedAdjustments: any[];
    handleRemoveStagedAdjustment: (id: string) => void;
    fittingNotes: string;
    setFittingNotes: (notes: string) => void;
    isRegenerating: boolean;
    handleOpenRegenerateConfirm: () => void;
}

export const PatternStudioFittingTab: React.FC<PatternStudioFittingTabProps> = ({
    activeWorkflow,
    adjustmentsHistory,
    currentExecution,
    setCreationZoomTarget,
    handleOpenAddAdjustmentModal,
    geometryResult,
    setActiveStudioTab,
    fittingStatus,
    lastRegenerationResult,
    selectedClient,
    selectedCreation,
    selectedTemplate,
    freePatternProfileLabel,
    selectedSession,
    role,
    stagedAdjustments,
    handleRemoveStagedAdjustment,
    fittingNotes,
    setFittingNotes,
    isRegenerating,
    handleOpenRegenerateConfirm,
}) => {
    return (
        <View style={styles.tabContentArea}>
            {/* Cuaderno de Fitting de Atelier (Flujo C) */}
            {activeWorkflow === 'creation_pattern' && (
                <View style={{ marginBottom: 16 }}>
                    <CreationFittingNotebook
                        adjustments={adjustmentsHistory}
                        hasActivePattern={!!currentExecution}
                        patternLabel={currentExecution ? currentExecution.version_label : null}
                        onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                        onRegisterFirstTrial={handleOpenAddAdjustmentModal}
                    />
                </View>
            )}
            {!geometryResult ? (
                <View style={styles.emptyMesaCard}>
                    <Text style={styles.emptyMesaIcon}>👗</Text>
                    <Text style={styles.emptyMesaTitle}>
                        {activeWorkflow === 'free_pattern' ? 'Prueba Técnica del Patrón en Espera' : 'Fitting & Pruebas en Espera'}
                    </Text>
                    <Text style={styles.emptyMesaDesc}>
                        {activeWorkflow === 'free_pattern'
                            ? 'Para realizar pruebas técnicas de volumen, aplomos y registrar ajustes de entalle sobre el patrón libre, primero debes generarlo en la Mesa CAD.'
                            : 'Para registrar pruebas de vestuario en muselina (toile) y registrar ajustes de entalle (C12), primero debes generar el patrón en la Mesa CAD.'}
                    </Text>
                    <TouchableOpacity
                        style={styles.goToCadBtn}
                        onPress={() => setActiveStudioTab('cad')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.goToCadBtnText}>📐 Ir a Mesa CAD para Generar Patrón</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {/* HISTORIAL DE AJUSTES REGISTRADOS (C12) */}
                    {adjustmentsHistory.length > 0 && (
                        <View style={styles.adjustmentsHistoryCard}>
                            <View style={styles.adjustmentsHistoryHeader}>
                                <Text style={styles.adjustmentsHistoryTitle}>
                                    HISTORIAL DE AJUSTES DE PRUEBA (FITTING)
                                </Text>
                                <Text style={styles.adjustmentsHistoryCount}>
                                    {adjustmentsHistory.length} ajuste(s) registrado(s)
                                </Text>
                            </View>
                            {adjustmentsHistory.map((adj, index) => (
                                <View key={adj.id || index} style={styles.adjustmentItemRow}>
                                    <View style={styles.adjustmentBadge}>
                                        <Text style={styles.adjustmentBadgeText}>
                                            FITTING #{adjustmentsHistory.length - index}
                                        </Text>
                                    </View>
                                    <View style={styles.adjustmentDetails}>
                                        <View style={styles.adjustmentMainLine}>
                                            <Text style={styles.adjustmentType}>
                                                {adj.adjustment_type.toUpperCase()} ({adj.target_piece})
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.adjustmentDelta,
                                                    Number(adj.delta_mm) > 0 ? styles.deltaPositive : styles.deltaNegative,
                                                ]}
                                            >
                                                {Number(adj.delta_mm) > 0 ? `+${adj.delta_mm}` : adj.delta_mm} mm
                                            </Text>
                                        </View>
                                        <Text style={styles.adjustmentDescription}>
                                            {adj.description}
                                        </Text>
                                        <Text style={styles.adjustmentDate}>
                                            Fecha de prueba: {adj.fitting_date}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* SECCIÓN 9 — PRUEBA DE VESTUARIO Y AJUSTES (COMPONENTE 13) */}
                    {currentExecution && (
                        <View style={styles.fittingSectionCard}>
                            <View style={styles.fittingSectionHeader}>
                                <View>
                                    <Text style={styles.fittingSectionTitle}>Prueba de Vestuario y Ajustes</Text>
                                    <Text style={styles.fittingSectionSubtitle}>Registrar observaciones y correcciones para nueva ejecución paramétrica</Text>
                                </View>
                                <View style={[styles.fittingSectionBadge, { backgroundColor: fittingStatus.color }]}>
                                    <Text style={styles.fittingSectionBadgeText}>ESTADO DE FITTING: {fittingStatus.label.toUpperCase()}</Text>
                                </View>
                            </View>

                            {/* RESULTADO DE LA ÚLTIMA REGENERACIÓN (SECCIÓN 11) */}
                            {lastRegenerationResult && (
                                <View style={styles.regenerationSuccessCard}>
                                    <View style={styles.regenerationSuccessHeader}>
                                        <Text style={styles.regenerationSuccessTitle}>✓ Nueva ejecución generada correctamente</Text>
                                    </View>
                                    <View style={styles.regenerationGrid}>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Número / ID:</Text>
                                            <Text style={styles.regenerationValue} numberOfLines={1}>{lastRegenerationResult.executionId}</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Prenda:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.garmentName}</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Plantilla:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.templateName}</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Versión generada:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.versionLabel}</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Ejecución de origen:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.parentVersion}</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Cantidad de ajustes:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.adjustmentsCount} ajuste(s)</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Fecha:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.date}</Text>
                                        </View>
                                        <View style={styles.regenerationItem}>
                                            <Text style={styles.regenerationLabel}>Diseñadora:</Text>
                                            <Text style={styles.regenerationValue}>{lastRegenerationResult.designer}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.regenerationHelpText}>
                                        El nuevo patrón derivado está cargado en el visor 2D y listo para inspección geométrica o exportación DXF.
                                    </Text>
                                </View>
                            )}

                            {/* EJECUCIÓN BASE */}
                            <View style={styles.fittingSubCard}>
                                <Text style={styles.fittingSubTitle}>
                                    {activeWorkflow === 'free_pattern' ? 'EJECUCIÓN BASE · PATRÓN LIBRE' : 'EJECUCIÓN BASE'}
                                </Text>
                                <View style={styles.fittingBaseGrid}>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Clienta:</Text>
                                        <Text style={styles.fittingBaseValue}>
                                            {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                        </Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Creación:</Text>
                                        <Text style={styles.fittingBaseValue}>
                                            {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                        </Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Prenda:</Text>
                                        <Text style={styles.fittingBaseValue}>{GARMENT_PACKAGES[currentExecution.garment_type].name}</Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Plantilla:</Text>
                                        <Text style={styles.fittingBaseValue}>{selectedTemplate?.name || 'Plantilla Base'}</Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Versión:</Text>
                                        <Text style={styles.fittingBaseValue}>{currentExecution.version_label}</Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Fecha:</Text>
                                        <Text style={styles.fittingBaseValue}>
                                            {currentExecution.created_at ? new Date(currentExecution.created_at).toLocaleString() : 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>
                                            {activeWorkflow === 'free_pattern' ? 'Perfil anatómico:' : 'Sesión de medidas:'}
                                        </Text>
                                        <Text style={styles.fittingBaseValue}>
                                            {activeWorkflow === 'free_pattern'
                                                ? `Perfil ${freePatternProfileLabel} (Referencia de Talla)`
                                                : (selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'N/A')}
                                        </Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Destino:</Text>
                                        <Text style={styles.fittingBaseValue}>
                                            {activeWorkflow === 'free_pattern' ? 'Banco Global de Patrones' : 'Bespoke / Clienta'}
                                        </Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Diseñadora:</Text>
                                        <Text style={styles.fittingBaseValue}>Katherine Carroll</Text>
                                    </View>
                                    <View style={styles.fittingBaseItem}>
                                        <Text style={styles.fittingBaseLabel}>Estado:</Text>
                                        <Text style={styles.fittingBaseValue}>{currentExecution.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* AJUSTES DE FITTING */}
                            <View style={styles.fittingSubCard}>
                                <View style={styles.fittingSubHeader}>
                                    <Text style={styles.fittingSubTitle}>AJUSTES DE FITTING</Text>
                                    {role !== 'client' && (
                                        <TouchableOpacity
                                            style={styles.addAdjustmentBtn}
                                            onPress={handleOpenAddAdjustmentModal}
                                        >
                                            <Text style={styles.addAdjustmentBtnText}>+ Agregar ajuste</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {stagedAdjustments.length === 0 ? (
                                    <View style={styles.emptyAdjustmentsBox}>
                                        <Text style={styles.emptyAdjustmentsText}>
                                            No hay ajustes pendientes de aplicar. Presione "+ Agregar ajuste" para registrar correcciones observadas durante la prueba de vestuario.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.stagedTableContainer}>
                                        <View style={styles.stagedTableHeader}>
                                            <Text style={[styles.stagedColHeader, { flex: 1.5 }]}>PIEZA</Text>
                                            <Text style={[styles.stagedColHeader, { flex: 1.2 }]}>AJUSTE</Text>
                                            <Text style={[styles.stagedColHeader, { flex: 1.2 }]}>UBICACIÓN</Text>
                                            <Text style={[styles.stagedColHeader, { flex: 1 }]}>VALOR</Text>
                                            <Text style={[styles.stagedColHeader, { flex: 1.8 }]}>MOTIVO</Text>
                                            <Text style={[styles.stagedColHeader, { flex: 1.4 }]}>RESPONSABLE</Text>
                                            <Text style={[styles.stagedColHeader, { flex: 0.8, textAlign: 'center' }]}>ACCIÓN</Text>
                                        </View>
                                        {stagedAdjustments.map((adj) => (
                                            <View key={adj.id} style={styles.stagedTableRow}>
                                                <Text style={[styles.stagedCell, { flex: 1.5, fontWeight: '700' }]}>
                                                    {adj.pieceName || adj.targetPiece || 'General'}
                                                </Text>
                                                <Text style={[styles.stagedCell, { flex: 1.2 }]}>
                                                    {FIT_ADJUSTMENT_TYPES[adj.adjustmentType as FitAdjustmentCode]?.label || adj.adjustmentType}
                                                </Text>
                                                <Text style={[styles.stagedCell, { flex: 1.2 }]}>
                                                    {adj.location || adj.zone || '—'}
                                                </Text>
                                                <Text style={[styles.stagedCell, { flex: 1, fontWeight: '700' }]}>
                                                    {adj.direction === 'increase' ? `+${adj.value}` : `-${adj.value}`} {adj.unit}
                                                </Text>
                                                <Text style={[styles.stagedCell, { flex: 1.8 }]} numberOfLines={2}>
                                                    {adj.motive || adj.observation || '—'}
                                                </Text>
                                                <Text style={[styles.stagedCell, { flex: 1.4, fontSize: 10 }]} numberOfLines={1}>
                                                    {adj.recordedBy || 'Katherine Carroll'}
                                                </Text>
                                                <TouchableOpacity
                                                    style={[styles.stagedCellAction, { flex: 0.8 }]}
                                                    onPress={() => handleRemoveStagedAdjustment(adj.id)}
                                                >
                                                    <Text style={styles.deleteStagedText}>Eliminar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Observaciones de fitting */}
                                <View style={styles.fittingNotesBlock}>
                                    <Text style={styles.fittingNotesLabel}>Observaciones de fitting (bitácora de confección):</Text>
                                    <TextInput
                                        style={styles.fittingNotesInput}
                                        placeholder="Detalles técnicos de caída, balance, drapeado o aplomo observados en la prueba..."
                                        placeholderTextColor="#8C7A6B"
                                        value={fittingNotes}
                                        onChangeText={setFittingNotes}
                                        multiline
                                    />
                                </View>
                            </View>

                            {/* RESULTADO Y ACCIÓN DE REGENERACIÓN */}
                            <View style={styles.fittingSubCard}>
                                <Text style={styles.fittingSubTitle}>RESULTADO</Text>
                                <Text style={styles.regenerateDescription}>
                                    La regeneración paramétrica calculará un nuevo patrón derivado aplicando los ajustes sobre la holgura y diseño, dejando la ejecución actual {currentExecution.version_label} completamente intacta en la base de datos.
                                </Text>
                                {role !== 'client' && (
                                    <TouchableOpacity
                                        style={[
                                            styles.regeneratePatternBtn,
                                            (stagedAdjustments.length === 0 || isRegenerating) && styles.regeneratePatternBtnDisabled,
                                        ]}
                                        onPress={handleOpenRegenerateConfirm}
                                        disabled={stagedAdjustments.length === 0 || isRegenerating}
                                    >
                                        {isRegenerating ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.regeneratePatternBtnText}>
                                                ⚡ Regenerar Patrón con Ajustes ({stagedAdjustments.length})
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

