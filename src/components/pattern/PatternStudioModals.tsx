// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: MODALES DE ESTUDIO, TRAZABILIDAD Y AUDITORÍA
// Archivo: src/components/pattern/PatternStudioModals.tsx
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { linkPatternExecutionToCreation, updateCreation } from '../../services/creationService';
import { supabase } from '../../supabase';
import { styles } from './patternModuleStyles';
import { colors } from '../../theme/colors';
import {
    AdjustmentUnit,
    FIT_ADJUSTMENT_TYPES,
    FitAdjustmentCode,
    TECHNICAL_LOCATIONS,
    PatternExecution,
    PatternTemplate,
    GarmentType,
    PatternAdjustment,
} from '../../types/pattern/pattern';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { EaseProfile, GarmentDesignParameters } from '../../types/pattern/ease';
import { AICopilotModal } from './AICopilotModal';
import { MeasurementSessionModal } from './MeasurementSessionModal';
import { PatternAdjustmentsModal } from './PatternAdjustmentsModal';
import { ProductionDossierModal } from './ProductionDossierModal';
import { ZoomableImageModal, InfoSheet, ZoomTarget, ContextInfoKind } from './creationFlow/CreationFlowViews';

const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
        const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = clean.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return clean;
    } catch {
        return dateStr;
    }
};

const formatSessionDate = (d?: string | null): string => {
    if (!d) return '—';
    const clean = d.includes('T') ? d.split('T')[0] : d;
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
};

export interface PatternStudioModalsProps {
    viewingDerivedSessionId: string | null;
    setViewingDerivedSessionId: (id: string | null) => void;
    isMeasurementModalOpen: boolean;
    setIsMeasurementModalOpen: (open: boolean) => void;
    isAdjustmentsModalOpen: boolean;
    setIsAdjustmentsModalOpen: (open: boolean) => void;
    isCopilotModalOpen: boolean;
    setIsCopilotModalOpen: (open: boolean) => void;
    isProductionModalOpen: boolean;
    setIsProductionModalOpen: (open: boolean) => void;
    isApprovalConfirmOpen: boolean;
    setIsApprovalConfirmOpen: (open: boolean) => void;
    isComparisonModalOpen: boolean;
    setIsComparisonModalOpen: (open: boolean) => void;
    isReturnModalOpen: boolean;
    setIsReturnModalOpen: (open: boolean) => void;
    isAddAdjustmentModalOpen: boolean;
    setIsAddAdjustmentModalOpen: (open: boolean) => void;
    isRegenerateConfirmOpen: boolean;
    setIsRegenerateConfirmOpen: (open: boolean) => void;
    isHistoryAuditOpen?: boolean;
    setIsHistoryAuditOpen?: (open: boolean) => void;
    showEstimatedModal: boolean;
    setShowEstimatedModal: (open: boolean) => void;
    creationZoomTarget: ZoomTarget | null;
    setCreationZoomTarget: (target: ZoomTarget | null) => void;
    isCustomMeasurementsOpen: boolean;
    setIsCustomMeasurementsOpen: (open: boolean) => void;
    isLinkClientModalOpen: boolean;
    setIsLinkClientModalOpen: (open: boolean) => void;
    isLinkCreationModalOpen: boolean;
    setIsLinkCreationModalOpen: (open: boolean) => void;

    selectedClient: Client | null;
    setSelectedClient: (c: Client | null) => void;
    selectedSession: MeasurementSession | null;
    setSelectedSession: (s: MeasurementSession | null) => void;
    modalPreviousSession: MeasurementSession | null;
    setModalPreviousSession: (s: MeasurementSession | null) => void;
    activeMeasurementsMm: Record<string, number>;
    sessions: MeasurementSession[];
    setSessions: React.Dispatch<React.SetStateAction<MeasurementSession[]>>;
    clients: Client[];
    selectedCreation: Creation | null;
    setSelectedCreation: React.Dispatch<React.SetStateAction<Creation | null>>;
    clientCreations: Creation[];
    setClientCreations: React.Dispatch<React.SetStateAction<Creation[]>>;
    currentExecution: PatternExecution | null;
    setCurrentExecution: (exec: PatternExecution | null) => void;
    executionHistory: PatternExecution[];
    setExecutionHistory: React.Dispatch<React.SetStateAction<PatternExecution[]>>;
    adjustmentsHistory: PatternAdjustment[];
    setAdjustmentsHistory: React.Dispatch<React.SetStateAction<PatternAdjustment[]>>;
    stagedAdjustments: any[];
    garmentType: GarmentType;
    selectedTemplate: PatternTemplate | null;
    selectedEaseProfile: EaseProfile;
    designParams: GarmentDesignParameters;
    setDesignParams: React.Dispatch<React.SetStateAction<GarmentDesignParameters>>;
    geometryResult: PatternGeometryResult | null;
    validationResult: any;
    fittingNotes: string;
    setFittingNotes: (notes: string) => void;
    fittingStatus: any;
    setPatternStatus: (status: any) => void;
    activeWorkflow: string;
    setActiveWorkflow: (w: any) => void;
    setActiveStudioTab: (t: any) => void;
    setActiveCreationStage: (s: any) => void;
    creationContextConfirmedRef: React.MutableRefObject<boolean>;
    comparisonResult: any;
    handleSelectExecution: (exec: PatternExecution) => void;
    handleApprovePatternConfirm: () => void;
    handleConfirmReturnToReview: () => void;
    handleAddAdjustment: () => void;
    handleExecuteRegenerateWithAdjustments: () => void;
    handleGeneratePattern: (allowEstimated?: boolean) => void;
    handleSelectAdjType: (type: any) => void;
    setStatusMessage: (msg: any) => void;
    freeMeasurements: Record<string, number>;
    setFreeMeasurements: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    loadClientSessions: (clientId: string, preferredSessionId?: string) => Promise<void>;
    activeInfoKind: ContextInfoKind | null;
    setActiveInfoKind: (kind: ContextInfoKind | null) => void;
    activeInfoSheetData: any;

    adjType: any;
    adjLocation: string;
    setAdjLocation: (loc: string) => void;
    selectedPieceIdForAdj: string;
    setSelectedPieceIdForAdj: (id: string) => void;
    adjValue: string;
    setAdjValue: (val: string) => void;
    adjUnit: AdjustmentUnit;
    setAdjUnit: (unit: AdjustmentUnit) => void;
    adjDirection: any;
    setAdjDirection: (dir: any) => void;
    adjMotive: string;
    setAdjMotive: (mot: string) => void;
    adjObservation: string;
    setAdjObservation: (obs: string) => void;
    adjError: string | null;
    setAdjError: (err: string | null) => void;
    returnReason: string;
    setReturnReason: (reason: string) => void;
    returnObservation: string;
    setReturnObservation: (obs: string) => void;
    showEstimatedDetailsReview: boolean;
    setShowEstimatedDetailsReview: (show: boolean) => void;
    setAllowEstimatedGeneration: (allow: boolean) => void;
    customMeasurementsDraft: Record<string, string>;
    setCustomMeasurementsDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    linkSearchQuery: string;
    setLinkSearchQuery: (query: string) => void;
    associatedClientId: string | null;
    setAssociatedClientId: (id: string | null) => void;
    setAssociatedClientName: (name: string | null) => void;
    associatedCreationId: string | null;
    setAssociatedCreationId: (id: string | null) => void;
    setAssociatedCreationName: (name: string | null) => void;
    setSelectedReferenceDemographic: (demo: any) => void;
    setSelectedReferenceProfileCode: (code: any) => void;
    initialCreationId?: string | null;
    templateMeasurementDiagnostic?: any;
}

export const PatternStudioModals: React.FC<PatternStudioModalsProps> = ({
    viewingDerivedSessionId,
    setViewingDerivedSessionId,
    isMeasurementModalOpen,
    setIsMeasurementModalOpen,
    isAdjustmentsModalOpen,
    setIsAdjustmentsModalOpen,
    isCopilotModalOpen,
    setIsCopilotModalOpen,
    isProductionModalOpen,
    setIsProductionModalOpen,
    isApprovalConfirmOpen,
    setIsApprovalConfirmOpen,
    isComparisonModalOpen,
    setIsComparisonModalOpen,
    isReturnModalOpen,
    setIsReturnModalOpen,
    isAddAdjustmentModalOpen,
    setIsAddAdjustmentModalOpen,
    isRegenerateConfirmOpen,
    setIsRegenerateConfirmOpen,
    isHistoryAuditOpen,
    setIsHistoryAuditOpen,
    showEstimatedModal,
    setShowEstimatedModal,
    creationZoomTarget,
    setCreationZoomTarget,
    isCustomMeasurementsOpen,
    setIsCustomMeasurementsOpen,
    isLinkClientModalOpen,
    setIsLinkClientModalOpen,
    isLinkCreationModalOpen,
    setIsLinkCreationModalOpen,
    selectedClient,
    setSelectedClient,
    selectedSession,
    setSelectedSession,
    modalPreviousSession,
    setModalPreviousSession,
    activeMeasurementsMm,
    sessions,
    setSessions,
    clients,
    selectedCreation,
    setSelectedCreation,
    clientCreations,
    setClientCreations,
    currentExecution,
    setCurrentExecution,
    executionHistory,
    setExecutionHistory,
    adjustmentsHistory,
    setAdjustmentsHistory,
    stagedAdjustments,
    garmentType,
    selectedTemplate,
    selectedEaseProfile,
    designParams,
    setDesignParams,
    geometryResult,
    validationResult,
    fittingNotes,
    setFittingNotes,
    fittingStatus,
    setPatternStatus,
    activeWorkflow,
    setActiveWorkflow,
    setActiveStudioTab,
    setActiveCreationStage,
    creationContextConfirmedRef,
    comparisonResult,
    handleSelectExecution,
    handleApprovePatternConfirm,
    handleConfirmReturnToReview,
    handleAddAdjustment,
    handleExecuteRegenerateWithAdjustments,
    handleGeneratePattern,
    handleSelectAdjType,
    setStatusMessage,
    freeMeasurements,
    setFreeMeasurements,
    loadClientSessions,
    activeInfoKind,
    setActiveInfoKind,
    activeInfoSheetData,
    adjType,
    adjLocation,
    setAdjLocation,
    selectedPieceIdForAdj,
    setSelectedPieceIdForAdj,
    adjValue,
    setAdjValue,
    adjUnit,
    setAdjUnit,
    adjDirection,
    setAdjDirection,
    adjMotive,
    setAdjMotive,
    adjObservation,
    setAdjObservation,
    adjError,
    setAdjError,
    returnReason,
    setReturnReason,
    returnObservation,
    setReturnObservation,
    showEstimatedDetailsReview,
    setShowEstimatedDetailsReview,
    setAllowEstimatedGeneration,
    customMeasurementsDraft,
    setCustomMeasurementsDraft,
    linkSearchQuery,
    setLinkSearchQuery,
    associatedClientId,
    setAssociatedClientId,
    setAssociatedClientName,
    associatedCreationId,
    setAssociatedCreationId,
    setAssociatedCreationName,
    setSelectedReferenceDemographic,
    setSelectedReferenceProfileCode,
    initialCreationId,
    templateMeasurementDiagnostic,
}) => {
    return (
        <>
        {/* MODAL AUXILIAR: Patrones derivados de una sesión (Flujo A) */}
        <Modal
            visible={Boolean(viewingDerivedSessionId)}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setViewingDerivedSessionId(null)}
        >
            <View style={styles.derivedPatternsOverlay}>
                <View style={styles.derivedPatternsCard}>
                    <View style={styles.derivedPatternsHeader}>
                        <View>
                            <Text style={styles.derivedPatternsSuper}>TRAZABILIDAD Y DERIVACIONES DE SESIÓN</Text>
                            <Text style={styles.derivedPatternsTitle}>
                                Patrones Derivados · {selectedSession ? `Sesión v${selectedSession.version_number}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setViewingDerivedSessionId(null)}
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 420, paddingVertical: 12 }}>
                        {executionHistory.filter((e) => e.session_id === viewingDerivedSessionId).length === 0 ? (
                            <View style={styles.emptyDerivedState}>
                                <Text style={styles.emptyDerivedIcon}>📐</Text>
                                <Text style={styles.emptyDerivedTitle}>
                                    Esta sesión de medidas aún no tiene patrones derivados.
                                </Text>
                                <Text style={styles.emptyDerivedDesc}>
                                    Puedes generar un patrón directo para la clienta o vincularlo a un proyecto de Creación utilizando estas medidas anatómicas.
                                </Text>

                                <View style={styles.emptyDerivedActions}>
                                    <TouchableOpacity
                                        style={styles.emptyDerivedPrimaryBtn}
                                        onPress={() => {
                                            setViewingDerivedSessionId(null);
                                            setSelectedCreation(null);
                                            setActiveWorkflow('direct_pattern');
                                        }}
                                    >
                                        <Text style={styles.emptyDerivedPrimaryBtnText}>
                                            ✂️ Crear Patrón Directo con esta Sesión
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.emptyDerivedSecondaryBtn}
                                        onPress={() => {
                                            setViewingDerivedSessionId(null);
                                            creationContextConfirmedRef.current = false;
                                            setSelectedCreation(null);
                                            setActiveCreationStage('creation');
                                            setActiveWorkflow('creation_pattern');
                                        }}
                                    >
                                        <Text style={styles.emptyDerivedSecondaryBtnText}>
                                            👗 Crear Patrón para una Creación
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            executionHistory
                                .filter((e) => e.session_id === viewingDerivedSessionId)
                                .map((exec) => {
                                    const isApproved = exec.status === 'approved_by_designer';
                                    return (
                                        <View key={exec.id} style={styles.derivedExecItem}>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.derivedExecGarment}>
                                                        {GARMENT_PACKAGES[exec.garment_type]?.name?.toUpperCase() || exec.garment_type.toUpperCase()}
                                                    </Text>
                                                    <Text style={styles.derivedExecVersion}>{exec.version_label}</Text>
                                                    <View
                                                        style={[
                                                            styles.statusPillSmall,
                                                            isApproved ? styles.statusApprovedSmall : styles.statusFittingSmall,
                                                        ]}
                                                    >
                                                        <Text style={styles.statusPillSmallText}>
                                                            {isApproved ? 'Aprobado' : exec.status.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.derivedExecMeta}>
                                                    Fecha: {new Date(exec.created_at).toLocaleDateString()} · Piezas: {exec.geometry_result?.pieces?.length || 0}
                                                    {exec.creation ? ` · Creación: ${exec.creation.name}` : ' · Patronaje directo'}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.derivedOpenCadBtn}
                                                onPress={() => {
                                                    setViewingDerivedSessionId(null);
                                                    handleSelectExecution(exec);
                                                    creationContextConfirmedRef.current = !!exec.creation_id;
                                                    setActiveWorkflow(exec.creation_id ? 'creation_pattern' : 'direct_pattern');
                                                    setActiveStudioTab('cad');
                                                }}
                                            >
                                                <Text style={styles.derivedOpenCadBtnText}>Abrir en CAD →</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>

{/* MODAL 1: Toma de medidas y rectificaciones históricas */}
            <MeasurementSessionModal
                visible={isMeasurementModalOpen}
                client={selectedClient}
                initialValuesMm={activeMeasurementsMm}
                previousSession={modalPreviousSession}
                onClose={() => {
                    setIsMeasurementModalOpen(false);
                    setModalPreviousSession(null);
                }}
                onSessionCreated={async (newSession) => {
                    setSelectedSession({ ...newSession });
                    setSessions((prev: MeasurementSession[]) => [newSession, ...prev.filter((s: MeasurementSession) => s.id !== newSession.id)]);
                    setModalPreviousSession(null);

                    // Si estamos trabajando en una creación específica, vincular la sesión formalmente
                    if (initialCreationId) {
                        try {
                            await supabase
                                .from('creations')
                                .update({ session_id: newSession.id })
                                .eq('id', initialCreationId);
                        } catch (linkErr) {
                            console.warn('[PatternModule] Error asociando sesión a la creación:', linkErr);
                        }
                    }

                    if (selectedClient?.id) {
                        await loadClientSessions(selectedClient.id, newSession.id);
                    }
                    setStatusMessage({
                        text:
                            newSession.status === 'draft'
                                ? `Borrador de medidas guardado (v${newSession.version_number}). Puede seguir editándolo.`
                                : `Sesión de medidas v${newSession.version_number} protegida de forma inmutable.`,
                        type: 'success',
                    });
                }}
            />

            {/* MODAL 2: Ajustes de prueba de confección (Componente 12 - M02.12) */}
            <PatternAdjustmentsModal
                visible={isAdjustmentsModalOpen}
                execution={currentExecution}
                onClose={() => setIsAdjustmentsModalOpen(false)}
                onAdjustmentRecorded={(childExecution, adjustment, message) => {
                    if (adjustment) {
                        setAdjustmentsHistory((prev: PatternAdjustment[]) => [adjustment, ...prev]);
                    }
                    if (childExecution) {
                        setExecutionHistory((prev: PatternExecution[]) => [childExecution, ...prev.filter((e: PatternExecution) => e.id !== childExecution.id)]);
                        handleSelectExecution(childExecution);
                        if (activeWorkflow === 'creation_pattern' && selectedCreation) {
                            setSelectedCreation((prev: Creation | null) =>
                                prev ? { ...prev, active_pattern_execution_id: childExecution.id } : null
                            );
                            setClientCreations((prev: Creation[]) =>
                                prev.map((c: Creation) =>
                                    c.id === selectedCreation.id
                                        ? { ...c, active_pattern_execution_id: childExecution.id }
                                        : c
                                )
                            );
                            updateCreation(selectedCreation.id, {
                                active_pattern_execution_id: childExecution.id,
                            }).catch((err) => console.warn('[PatternModule] Error updating creation active execution:', err));
                        }
                        setStatusMessage({
                            text: message || `Ajuste aplicado con éxito. Se generó la nueva revisión ${childExecution.version_label} (parent_execution_id vinculado).`,
                            type: 'success',
                        });
                    } else if (message) {
                        setStatusMessage({
                            text: message,
                            type: 'info',
                        });
                    }
                }}
            />

            {/* MODAL 3: Copiloto de IA opcional y seguro */}
            <AICopilotModal
                visible={isCopilotModalOpen}
                garmentType={garmentType}
                currentParams={designParams}
                engineWarnings={validationResult?.warnings || []}
                onClose={() => setIsCopilotModalOpen(false)}
                onApplyParameters={(suggested) => {
                    setDesignParams({ ...designParams, ...suggested });
                    setStatusMessage({
                        text: 'Parámetros del Copiloto aprobados y aplicados. Regenere el patrón.',
                        type: 'info',
                    });
                }}
            />

            {/* MODAL 4: Paquete de Producción y Ficha Técnica (Componente 13 - M02.13) */}
            <ProductionDossierModal
                visible={isProductionModalOpen}
                execution={currentExecution}
                client={selectedClient}
                session={selectedSession}
                template={selectedTemplate}
                executionHistory={executionHistory}
                adjustmentsHistory={adjustmentsHistory}
                onClose={() => setIsProductionModalOpen(false)}
                onStatusMessage={(msg) => setStatusMessage(msg)}
            />

            {/* MODAL 5: Confirmación de Aprobación Formal con Bloqueo Histórico Inmutable */}
            <Modal visible={isApprovalConfirmOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · APROBACIÓN TÉCNICA</Text>
                                <Text style={styles.confirmModalTitle}>Aprobación Oficial del Patrón</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsApprovalConfirmOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.confirmModalBody}>
                            <View style={styles.confirmWarningBox}>
                                <Text style={styles.confirmWarningTitle}>⚠️ AVISO DE INMUTABILIDAD HISTÓRICA:</Text>
                                <Text style={styles.confirmWarningText}>
                                    Una vez aprobado, este patrón quedará bloqueado como versión histórica.
                                </Text>
                            </View>

                            <Text style={styles.confirmDetailIntro}>
                                Está a punto de aprobar el patrón definitivo para corte con las siguientes especificaciones verificadas:
                            </Text>

                            <View style={styles.confirmDetailGrid}>
                                <Text style={styles.confirmDetailItem}>• 1. CLIENTA: {selectedClient?.full_name}</Text>
                                <Text style={styles.confirmDetailItem}>• 2. SESIÓN DE MEDIDAS: {selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'Sesión activa'}</Text>
                                <Text style={styles.confirmDetailItem}>• 3. PRENDA: {garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No seleccionada'}</Text>
                                <Text style={styles.confirmDetailItem}>• 4. PLANTILLA: {selectedTemplate?.name || 'Base'} (v{selectedTemplate?.version || '1.0.0'})</Text>
                                <Text style={styles.confirmDetailItem}>• 5. VERSIÓN DE EJECUCIÓN: {currentExecution?.version_label || 'v1.0'}</Text>
                                <Text style={styles.confirmDetailItem}>• 6. MÉTODO: {selectedTemplate?.method_reference || (garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].methodReference : 'Base')}</Text>
                                <Text style={styles.confirmDetailItem}>• 7. HOLGURA: {selectedEaseProfile.name} ({selectedEaseProfile.code})</Text>
                                <Text style={styles.confirmDetailItem}>• 8. AJUSTES: {adjustmentsHistory.length > 0 ? `${adjustmentsHistory.length} ajuste(s) registrado(s)` : 'Ninguno (conforme sin alteración)'}</Text>
                                <Text style={styles.confirmDetailItem}>• 9. PIEZAS GEOMÉTRICAS: {geometryResult?.pieces.length} piezas listas para corte</Text>
                                <Text style={styles.confirmDetailItem}>• 10. VALIDACIÓN: Conforme (0 errores, medidas completas)</Text>
                                <Text style={styles.confirmDetailItem}>• 11. FECHA: {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleString() : new Date().toLocaleString()}</Text>
                                <Text style={styles.confirmDetailItem}>• 12. DISEÑADORA RESPONSABLE: Katherine Carroll</Text>
                            </View>
                        </View>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsApprovalConfirmOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmApproveBtn}
                                onPress={handleApprovePatternConfirm}
                            >
                                <Text style={styles.confirmApproveText}>✓ Confirmar y Bloquear Patrón Aprobado</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 6: Comparación Técnica Antes / Después (C13: Comparación de Revisiones) */}
            <Modal visible={isComparisonModalOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · COMPARACIÓN TÉCNICA (C13)</Text>
                                <Text style={styles.confirmModalTitle}>
                                    Revisión {comparisonResult?.parentVersionLabel} → {comparisonResult?.childVersionLabel}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsComparisonModalOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            <View style={styles.infoBanner}>
                                <Text style={styles.infoBannerText}>
                                    {comparisonResult?.summary}
                                </Text>
                            </View>

                            <View style={styles.confirmDetailGrid}>
                                <Text style={styles.confirmDetailItem}>• Diseñadora responsable: {comparisonResult?.designer}</Text>
                                <Text style={styles.confirmDetailItem}>• Prenda: {comparisonResult?.garmentType ? (GARMENT_PACKAGES as Record<string, any>)[comparisonResult.garmentType]?.name || comparisonResult.garmentType : ''}</Text>
                                <Text style={styles.confirmDetailItem}>• Fecha y hora: {comparisonResult?.date ? new Date(comparisonResult.date).toLocaleString() : ''}</Text>
                                <Text style={styles.confirmDetailItem}>• Ejecución Padre (Original): {comparisonResult?.parentExecutionId}</Text>
                                <Text style={styles.confirmDetailItem}>• Ejecución Derivada (Ajustada): {comparisonResult?.childExecutionId}</Text>
                            </View>

                            {/* Desglose de piezas geométricas antes / después */}
                            <Text style={styles.sectionLabel}>ANÁLISIS DE PIEZAS AFECTADAS Y DIMENSIONES (MM):</Text>
                            {comparisonResult?.piecesComparison?.map((p: any) => (
                                <View key={p.pieceId} style={[styles.pieceComparisonRow, p.isAffected && styles.pieceComparisonRowAffected]}>
                                    <View style={styles.pieceComparisonHeader}>
                                        <Text style={styles.pieceComparisonName}>{p.pieceName}</Text>
                                        <View style={[styles.pieceStatusPill, p.isAffected ? styles.statusPillAffected : styles.statusPillUnchanged]}>
                                            <Text style={styles.pieceStatusPillText}>{p.isAffected ? 'ALTERADA' : 'SIN CAMBIO'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.pieceComparisonDimGrid}>
                                        <Text style={styles.pieceDimText}>Anterior: {p.widthBeforeMm} × {p.heightBeforeMm} mm</Text>
                                        <Text style={styles.pieceDimText}>Nueva: {p.widthAfterMm} × {p.heightAfterMm} mm</Text>
                                        <Text style={[styles.pieceDeltaText, p.isAffected ? styles.deltaPositive : styles.deltaMuted]}>
                                            Δ Ancho: {p.deltaWidthMm > 0 ? `+${p.deltaWidthMm}` : p.deltaWidthMm} mm | Δ Alto: {p.deltaHeightMm > 0 ? `+${p.deltaHeightMm}` : p.deltaHeightMm} mm
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            {/* Diferencias paramétricas de holgura */}
                            {comparisonResult && Object.keys(comparisonResult.easeDeltas).length > 0 && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={styles.sectionLabel}>VARIACIÓN DE HOLGURAS (DESAHOGOS ANATÓMICOS):</Text>
                                    {Object.entries(comparisonResult.easeDeltas).map(([k, d]: [string, any]) => (
                                        <Text key={k} style={styles.confirmDetailItem}>
                                            • Holgura {k}: {d.before} mm → {d.after} mm (Δ {d.delta > 0 ? `+${d.delta}` : d.delta} mm)
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsComparisonModalOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cerrar Comparación</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 7: Devolución a Revisión / Rechazo Técnico (C13.10) */}
            <Modal visible={isReturnModalOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · CONTROL DE CALIDAD</Text>
                                <Text style={styles.confirmModalTitle}>Devolver Patrón a Ajuste / Revisión</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsReturnModalOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            <View style={styles.infoBanner}>
                                <Text style={styles.infoBannerText}>
                                    Registre formalmente el motivo morfológico o técnico por el cual este patrón requiere ajustes antes de continuar su ciclo hacia la aprobación.
                                </Text>
                            </View>

                            <Text style={styles.sectionLabel}>MOTIVO DE LA DEVOLUCIÓN:</Text>
                            <View style={{ gap: 6, marginVertical: 6 }}>
                                {[
                                    'Corrección morfológica observada en prueba de vestuario',
                                    'Desahogo o holgura insuficiente para movimiento',
                                    'Ajuste en largo / proporciones visuales de silueta',
                                    'Corrección de caída o aplomo en hombro / sisa',
                                    'Modificación estética solicitada por Katherine Carroll',
                                ].map((reason) => (
                                    <TouchableOpacity
                                        key={reason}
                                        style={[
                                            styles.reasonOptionBtn,
                                            returnReason === reason && styles.reasonOptionBtnActive,
                                        ]}
                                        onPress={() => setReturnReason(reason)}
                                    >
                                        <Text
                                            style={[
                                                styles.reasonOptionText,
                                                returnReason === reason && styles.reasonOptionTextActive,
                                            ]}
                                        >
                                            {returnReason === reason ? '● ' : '○ '} {reason}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.sectionLabel}>OBSERVACIÓN TÉCNICA DETALLADA:</Text>
                            <TextInput
                                style={styles.returnTextInput}
                                multiline
                                numberOfLines={3}
                                placeholder="Describa el comportamiento observado: ej. La pinza de busto requiere 15 mm adicionales..."
                                placeholderTextColor={colors.textMuted}
                                value={returnObservation}
                                onChangeText={setReturnObservation}
                            />

                            <Text style={styles.returnSignText}>
                                Diseñadora Responsable: Katherine Carroll (Alta Costura) · Fecha: {new Date().toLocaleString()}
                            </Text>
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsReturnModalOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmApproveBtn, { backgroundColor: '#8B0000' }]}
                                onPress={handleConfirmReturnToReview}
                            >
                                <Text style={styles.confirmApproveText}>↩ Confirmar Devolución</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 8: Formulario de Registro de Ajuste Estructurado (Componente 13 — Sección 4, 5, 6) */}
            <Modal visible={isAddAdjustmentModalOpen} animationType="slide" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · PRUEBA DE VESTUARIO Y AJUSTES (C13)</Text>
                                <Text style={styles.confirmModalTitle}>Registrar ajuste de prueba</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsAddAdjustmentModalOpen(false);
                                    setAdjError(null);
                                }}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            {adjError && (
                                <View style={styles.adjErrorBox}>
                                    <Text style={styles.adjErrorText}>⚠️ {adjError}</Text>
                                </View>
                            )}

                            {/* 1. SELECCIÓN DE PIEZA AFECTADA (Sección 4) */}
                            <Text style={styles.sectionLabel}>PIEZA DEL PATRÓN AFECTADA:</Text>
                            <Text style={styles.adjFieldHelp}>
                                Seleccionada exclusivamente de las piezas generadas por el motor paramétrico:
                            </Text>
                            <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#D8CFC4', borderRadius: 8, padding: 6, marginVertical: 6, backgroundColor: '#FAF8F5' }}>
                                <ScrollView nestedScrollEnabled style={{ maxHeight: 186 }}>
                                    <View style={{ gap: 6 }}>
                                        {currentExecution?.geometry_result?.pieces && currentExecution.geometry_result.pieces.length > 0 ? (
                                            currentExecution.geometry_result.pieces.map((p) => {
                                                const isSelected = selectedPieceIdForAdj === p.id;
                                                const w = Math.round(p.boundingBox?.width || 0);
                                                const h = Math.round(p.boundingBox?.height || 0);
                                                return (
                                                    <TouchableOpacity
                                                        key={p.id}
                                                        style={[styles.adjPieceCard, isSelected && styles.adjPieceCardActive]}
                                                        onPress={() => setSelectedPieceIdForAdj(p.id)}
                                                    >
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text style={[styles.adjPieceCardName, isSelected && styles.adjPieceCardNameActive]}>
                                                                {p.name.toUpperCase()}
                                                            </Text>
                                                            <Text style={[styles.adjPieceCardType, isSelected && styles.adjPieceCardTypeActive]}>
                                                                {p.code.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                            <Text style={styles.adjPieceCardId}>ID: {p.id}</Text>
                                                            <Text style={styles.adjPieceCardDims}>{w} × {h} mm</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : (
                                            <Text style={styles.adjEmptyPieceText}>No hay piezas generadas disponibles.</Text>
                                        )}
                                    </View>
                                </ScrollView>
                            </View>


                            {/* 2. TIPO DE AJUSTE (Sección 2 y 12) */}
                            <Text style={[styles.sectionLabel, { marginTop: 10 }]}>TIPO DE AJUSTE:</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                                {Object.values(FIT_ADJUSTMENT_TYPES).map((opt) => {
                                    const active = adjType === opt.code;
                                    const isPending = opt.geometricApplicationStatus === 'pending_geometric_implementation';
                                    return (
                                        <TouchableOpacity
                                            key={opt.code}
                                            style={[
                                                styles.adjTypeChip,
                                                active && styles.adjTypeChipActive,
                                                isPending && styles.adjTypeChipPending,
                                            ]}
                                            onPress={() => handleSelectAdjType(opt.code)}
                                        >
                                            <Text style={[styles.adjTypeChipText, active && styles.adjTypeChipTextActive]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {FIT_ADJUSTMENT_TYPES[adjType as FitAdjustmentCode]?.geometricApplicationStatus === 'pending_geometric_implementation' && (
                                <View style={styles.adjWarningBox}>
                                    <Text style={styles.adjWarningText}>
                                        ⚠️ Registrado — aplicación geométrica pendiente: Este ajuste técnico se registra en la bitácora pero bloquea la regeneración automática para evitar deformaciones no seguras.
                                    </Text>
                                </View>
                            )}

                            {/* 3. UBICACIÓN TÉCNICA (Sección 5) */}
                            <Text style={[styles.sectionLabel, { marginTop: 10 }]}>UBICACIÓN DEL AJUSTE (OPCIONAL):</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                                {TECHNICAL_LOCATIONS.map((loc) => {
                                    const active = adjLocation === loc.code;
                                    return (
                                        <TouchableOpacity
                                            key={loc.code}
                                            style={[styles.adjLocationChip, active && styles.adjLocationChipActive]}
                                            onPress={() => {
                                                setAdjLocation(loc.code);
                                            }}
                                        >
                                            <Text style={[styles.adjLocationChipText, active && styles.adjLocationChipTextActive]}>
                                                {loc.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* 4. VALOR DEL AJUSTE Y UNIDAD (Sección 3) */}
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                                <View style={{ flex: 1.2 }}>
                                    <Text style={styles.sectionLabel}>VALOR DEL AJUSTE:</Text>
                                    <TextInput
                                        style={styles.adjFormInput}
                                        value={adjValue}
                                        onChangeText={setAdjValue}
                                        keyboardType="numeric"
                                        placeholder="Ej: 1.5 (o 15 en mm)"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.sectionLabel}>UNIDAD:</Text>
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                        {(['cm', 'mm'] as AdjustmentUnit[]).map((u) => {
                                            const active = adjUnit === u;
                                            return (
                                                <TouchableOpacity
                                                    key={u}
                                                    style={[styles.unitToggleBtn, active && styles.unitToggleBtnActive]}
                                                    onPress={() => setAdjUnit(u)}
                                                >
                                                    <Text style={[styles.unitToggleText, active && styles.unitToggleTextActive]}>
                                                        {u}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>

                            {/* 5. DIRECCIÓN / EFECTO */}
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>DIRECCIÓN / EFECTO:</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                <TouchableOpacity
                                    style={[styles.directionToggleBtn, adjDirection === 'decrease' && styles.directionToggleBtnActive]}
                                    onPress={() => setAdjDirection('decrease')}
                                >
                                    <Text style={[styles.directionToggleText, adjDirection === 'decrease' && styles.directionToggleTextActive]}>
                                        - Reducir / Entallar
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.directionToggleBtn, adjDirection === 'increase' && styles.directionToggleBtnActive]}
                                    onPress={() => setAdjDirection('increase')}
                                >
                                    <Text style={[styles.directionToggleText, adjDirection === 'increase' && styles.directionToggleTextActive]}>
                                        + Aumentar / Desahogar
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* 6. MOTIVO DEL AJUSTE */}
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>MOTIVO DEL AJUSTE:</Text>
                            <TextInput
                                style={styles.adjFormInput}
                                value={adjMotive}
                                onChangeText={setAdjMotive}
                                placeholder="Ej: Reducir cintura, Subir hombro, Aumentar contorno de cadera..."
                                placeholderTextColor={colors.textMuted}
                            />

                            {/* 7. OBSERVACIÓN TÉCNICA */}
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>OBSERVACIÓN TÉCNICA DETALLADA:</Text>
                            <TextInput
                                style={[styles.adjFormInput, { height: 60, textAlignVertical: 'top' }]}
                                value={adjObservation}
                                onChangeText={setAdjObservation}
                                placeholder="Observación observada durante la prueba de vestuario sobre la clienta..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => {
                                    setIsAddAdjustmentModalOpen(false);
                                    setAdjError(null);
                                }}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmApproveBtn}
                                onPress={handleAddAdjustment}
                            >
                                <Text style={styles.confirmApproveText}>Agregar ajuste</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 9: Confirmación Antes de Regenerar el Patrón (Sección 10) */}
            <Modal visible={isRegenerateConfirmOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · REGENERACIÓN CONTROLADA (C13)</Text>
                                <Text style={styles.confirmModalTitle}>Confirmar Regeneración con Ajustes</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsRegenerateConfirmOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            {/* Declaración obligatoria de inmutabilidad (Sección 10) */}
                            <View style={styles.regenerationBannerBox}>
                                <Text style={styles.regenerationBannerTitle}>
                                    Se generará una nueva ejecución del patrón. La ejecución actual permanecerá intacta.
                                </Text>
                            </View>

                            <View style={styles.confirmDetailGrid}>
                                <Text style={styles.confirmDetailItem}>
                                    • Ejecución de origen: {currentExecution?.version_label} (ID: {currentExecution?.id})
                                </Text>
                                <Text style={styles.confirmDetailItem}>
                                    • Prenda: {currentExecution ? GARMENT_PACKAGES[currentExecution.garment_type].name : ''}
                                </Text>
                                <Text style={styles.confirmDetailItem}>
                                    • Cantidad de ajustes: {stagedAdjustments.length} ajuste(s) programado(s)
                                </Text>
                                <Text style={styles.confirmDetailItem}>
                                    • Diseñadora responsable: Katherine Carroll
                                </Text>
                            </View>

                            <Text style={styles.sectionLabel}>RESUMEN DE AJUSTES A APLICAR:</Text>
                            <View style={{ gap: 6, marginVertical: 8 }}>
                                {stagedAdjustments.map((adj, idx) => (
                                    <View key={adj.id || idx} style={styles.confirmAdjRow}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={styles.confirmAdjZone}>
                                                [{adj.zone.toUpperCase()}] {adj.direction === 'increase' ? 'Aumentar' : 'Reducir'} {adj.value} {adj.unit}
                                            </Text>
                                            <Text style={styles.confirmAdjType}>
                                                Tipo: {adj.adjustmentType}
                                            </Text>
                                        </View>
                                        <Text style={styles.confirmAdjDesc}>
                                            {adj.observation || adj.motive || 'Sin observación'}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {fittingNotes.trim() ? (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={styles.sectionLabel}>OBSERVACIONES DE FITTING:</Text>
                                    <Text style={styles.confirmDetailItem}>"{fittingNotes.trim()}"</Text>
                                </View>
                            ) : null}
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsRegenerateConfirmOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmApproveBtn}
                                onPress={handleExecuteRegenerateWithAdjustments}
                            >
                                <Text style={styles.confirmApproveText}>Crear nueva ejecución</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 10: Patrones Derivados de una Sesión Anatómica Concreta (Flujo A) */}
            <Modal
                visible={Boolean(viewingDerivedSessionId)}
                animationType="fade"
                transparent
                onRequestClose={() => setViewingDerivedSessionId(null)}
            >
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · HISTORIAL Y TRAZABILIDAD ANATÓMICA</Text>
                                <Text style={styles.confirmModalTitle}>
                                    Patrones Derivados de esta Sesión
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setViewingDerivedSessionId(null)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            {(() => {
                                const targetSession = sessions.find((s) => s.id === viewingDerivedSessionId);
                                const derived = executionHistory.filter((e) => e.session_id === viewingDerivedSessionId);
                                return (
                                    <>
                                        <View style={styles.infoBanner}>
                                            <Text style={styles.infoBannerText}>
                                                {selectedClient ? `Clienta: ${selectedClient.full_name} · ` : ''}
                                                {targetSession ? `Sesión v${targetSession.version_number} (${formatSessionDate(targetSession.session_date)}) · ${targetSession.status === 'completed' ? 'Finalizada' : targetSession.status === 'verified' ? 'Verificada' : 'Borrador'}` : 'Sesión Anatómica'}
                                            </Text>
                                        </View>

                                        <Text style={styles.sectionLabel}>
                                            PATRONES GENERADOS A PARTIR DE ESTAS MEDIDAS ({derived.length}):
                                        </Text>

                                        {derived.length === 0 ? (
                                            <View style={styles.emptySessionsCard}>
                                                <Text style={styles.emptySessionsText}>
                                                    Aún no se ha generado ningún patrón a partir de esta sesión anatómica.
                                                </Text>
                                                <TouchableOpacity
                                                    style={[styles.createFirstSessionBtn, { marginTop: 10 }]}
                                                    onPress={() => {
                                                        if (targetSession) setSelectedSession(targetSession);
                                                        setViewingDerivedSessionId(null);
                                                        setSelectedCreation(null);
                                                        setActiveWorkflow('direct_pattern');
                                                    }}
                                                >
                                                    <Text style={styles.createFirstSessionBtnText}>
                                                        ✂️ Generar Patrón Directo con esta Sesión
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={{ gap: 8, marginVertical: 6 }}>
                                                {derived.map((exec) => (
                                                    <View key={exec.id} style={styles.workflowSessionCard}>
                                                        <View style={styles.sessionCardTop}>
                                                            <Text style={styles.sessionVersionTag}>
                                                                {GARMENT_PACKAGES[exec.garment_type]?.name?.toUpperCase() || exec.garment_type.toUpperCase()} · {exec.version_label}
                                                            </Text>
                                                            <View style={[styles.sessionStatusPill, exec.status === 'approved_by_designer' ? styles.sessionStatusCompleted : styles.sessionStatusDraft]}>
                                                                <Text style={styles.sessionStatusPillText}>
                                                                    {exec.status === 'approved_by_designer' ? 'APROBADO' : exec.status.toUpperCase()}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.sessionCardDetailsRow}>
                                                            <Text style={[styles.sessionDetailItem, { fontWeight: '700', color: exec.creation_id ? '#996B1F' : '#2B5E35' }]}>
                                                                {exec.creation ? `👗 Creación: ${exec.creation.name}` : '✂️ Patronaje Directo'}
                                                            </Text>
                                                            <Text style={styles.sessionDetailItem}>
                                                                📅 {formatDate(exec.created_at)}
                                                            </Text>
                                                            <Text style={styles.sessionDetailItem}>
                                                                🧩 {exec.geometry_result?.pieces?.length || 0} piezas
                                                            </Text>
                                                        </View>
                                                        <View style={styles.sessionCardActionsRow}>
                                                            <TouchableOpacity
                                                                style={[styles.sessionActionBtn, styles.sessionActionBtnActive]}
                                                                onPress={() => {
                                                                    handleSelectExecution(exec);
                                                                    setViewingDerivedSessionId(null);
                                                                    creationContextConfirmedRef.current = !!exec.creation_id;
                                                                    setActiveWorkflow(exec.creation_id ? 'creation_pattern' : 'direct_pattern');
                                                                    setActiveStudioTab('cad');
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={[styles.sessionActionBtnText, styles.sessionActionBtnTextActive]}>
                                                                    Abrir en Mesa CAD →
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                );
                            })()}
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setViewingDerivedSessionId(null)}
                            >
                                <Text style={styles.confirmCancelText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL CANÓNICO: ADVERTENCIA Y CONTROL DE MEDIDAS ESTIMADAS */}
            <Modal
                visible={showEstimatedModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEstimatedModal(false)}
            >
                <View style={styles.estimatedModalOverlay}>
                    <View style={styles.estimatedModalCard}>
                        <View style={styles.estimatedModalHeaderRow}>
                            <Text style={styles.estimatedModalIcon}>⚖️</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.estimatedModalTitle}>
                                    EL PATRÓN INCLUIRÁ MEDIDAS ESTIMADAS
                                </Text>
                                <Text style={styles.estimatedModalSubtitle}>
                                    Medidas no registradas físicamente en la clienta
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.estimatedModalSectionHeader}>
                            Medidas no registradas ({templateMeasurementDiagnostic?.estimated?.length || 0}):
                        </Text>
                        <ScrollView style={styles.estimatedModalList} nestedScrollEnabled={true}>
                            {templateMeasurementDiagnostic?.estimated?.map((item: any) => (
                                <View key={item.code} style={styles.estimatedModalListItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.estimatedItemName}>• {item.name}</Text>
                                        <Text style={styles.estimatedItemCode}>{item.code}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.estimatedItemVal}>
                                            {item.valueMm ? `${(item.valueMm / 10).toFixed(1)} cm` : '—'}
                                        </Text>
                                        <Text style={styles.estimatedItemValSub}>
                                            {item.valueMm ? `${item.valueMm} mm` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <Text style={styles.estimatedModalNotice}>
                            Se propone utilizar las proporciones del perfil anatómico normalizado seleccionado (T40 Haute Couture). La procedencia de estas estimaciones quedará registrada en el linaje y trazabilidad de la ejecución sin alterar las medidas reales de la clienta.
                        </Text>

                        {showEstimatedDetailsReview && (
                            <View style={styles.estimatedReviewDetailsBox}>
                                <Text style={styles.estimatedReviewDetailsTitle}>
                                    AUDITORÍA DE ESTIMACIONES Y TOLERANCIAS:
                                </Text>
                                <Text style={styles.estimatedReviewDetailsText}>
                                    • Perfil de referencia: Alta Costura T40 (Proporciones anatómicas canónicas).{'\n'}
                                    • Impacto: Las piezas calculadas ajustarán según las proporciones arquetípicas.{'\n'}
                                    • Recomendación del Atelier: Se sugiere una prueba intermedia (Toile de prueba) o completar las cotas físicas con la clienta antes de corte en paño definitivo.
                                </Text>
                            </View>
                        )}

                        <View style={styles.estimatedModalActionsRow}>
                            <TouchableOpacity
                                style={styles.estimatedBtnSecondary}
                                onPress={() => {
                                    setShowEstimatedModal(false);
                                    if (selectedSession) {
                                        setModalPreviousSession(selectedSession);
                                        setIsMeasurementModalOpen(true);
                                    }
                                }}
                            >
                                <Text style={styles.estimatedBtnSecondaryText}>
                                    [Completar medidas]
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.estimatedBtnReview}
                                onPress={() => setShowEstimatedDetailsReview(!showEstimatedDetailsReview)}
                            >
                                <Text style={styles.estimatedBtnReviewText}>
                                    {showEstimatedDetailsReview ? '[Ocultar revisión]' : '[Revisar estimaciones]'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.estimatedBtnPrimary}
                                onPress={() => {
                                    setShowEstimatedModal(false);
                                    setAllowEstimatedGeneration(true);
                                    handleGeneratePattern(true);
                                }}
                            >
                                <Text style={styles.estimatedBtnPrimaryText}>
                                    [Continuar con estimaciones]
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODALES EDITORIALES DEL FLUJO C */}
            <ZoomableImageModal target={creationZoomTarget} onClose={() => setCreationZoomTarget(null)} />
            <InfoSheet
                visible={activeInfoKind !== null}
                eyebrow={activeInfoSheetData.eyebrow}
                title={activeInfoSheetData.title}
                rows={activeInfoSheetData.rows}
                footerNote={activeInfoSheetData.footerNote}
                onClose={() => setActiveInfoKind(null)}
            />

            {/* MODAL FLUJO D: COTAS PERSONALIZADAS DE PATRÓN LIBRE */}
            <Modal
                visible={isCustomMeasurementsOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCustomMeasurementsOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.customModalContainer}>
                        <View style={styles.customModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.customModalSuper}>FLUJO D · PATRÓN LIBRE</Text>
                                <Text style={styles.customModalTitle}>Cotas Personalizadas</Text>
                                <Text style={styles.customModalSubtitle}>
                                    Ingrese o rectifique las medidas anatómicas milimétricas de taller.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsCustomMeasurementsOpen(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.customModalBody} showsVerticalScrollIndicator={true}>
                            <View style={styles.customNoticeBox}>
                                <Text style={styles.customNoticeText}>
                                    💡 Ingrese los valores en centímetros (cm). El motor paramétrico los convertirá a milímetros (mm) exactos para el trazado vectorial.
                                </Text>
                            </View>

                            <View style={styles.customInputsGrid}>
                                {[
                                    { code: 'contorno_busto', label: 'Contorno de Busto' },
                                    { code: 'contorno_pecho', label: 'Contorno de Pecho (Masculino)' },
                                    { code: 'contorno_cintura', label: 'Contorno de Cintura' },
                                    { code: 'contorno_cadera', label: 'Contorno de Cadera' },
                                    { code: 'contorno_cuello', label: 'Contorno de Cuello' },
                                    { code: 'ancho_espalda', label: 'Ancho de Espalda' },
                                    { code: 'ancho_pecho', label: 'Ancho de Pecho' },
                                    { code: 'largo_talle_delantero', label: 'Largo Talle Delantero' },
                                    { code: 'largo_talle_espalda', label: 'Largo Talle Espalda' },
                                    { code: 'altura_busto', label: 'Altura de Busto' },
                                    { code: 'separacion_busto', label: 'Separación de Busto' },
                                    { code: 'largo_hombro', label: 'Largo de Hombro' },
                                    { code: 'ancho_hombros', label: 'Ancho de Hombros' },
                                    { code: 'largo_brazo', label: 'Largo de Brazo' },
                                    { code: 'contorno_biceps', label: 'Contorno de Bíceps' },
                                    { code: 'contorno_muneca', label: 'Contorno de Muñeca' },
                                    { code: 'profundidad_sisa', label: 'Profundidad de Sisa' },
                                    { code: 'altura_cadera', label: 'Altura de Cadera' },
                                    { code: 'altura_tiro', label: 'Altura de Tiro' },
                                    { code: 'largo_falda', label: 'Largo de Falda' },
                                    { code: 'largo_pantalon', label: 'Largo de Pantalón' },
                                    { code: 'largo_chaqueta', label: 'Largo de Chaqueta' },
                                    { code: 'largo_abrigo', label: 'Largo de Abrigo' },
                                ].map((item) => {
                                    const currentVal = customMeasurementsDraft[item.code] !== undefined
                                        ? customMeasurementsDraft[item.code]
                                        : freeMeasurements[item.code]
                                        ? (freeMeasurements[item.code] / 10).toFixed(1)
                                        : '';
                                    return (
                                        <View key={item.code} style={styles.customInputCol}>
                                            <Text style={styles.customInputLabel}>{item.label}</Text>
                                            <View style={styles.customInputWrap}>
                                                <TextInput
                                                    style={styles.customInputField}
                                                    keyboardType="numeric"
                                                    value={currentVal}
                                                    onChangeText={(txt) => {
                                                        setCustomMeasurementsDraft((prev) => ({
                                                            ...prev,
                                                            [item.code]: txt,
                                                        }));
                                                    }}
                                                    placeholder="0.0"
                                                    placeholderTextColor="#999"
                                                />
                                                <Text style={styles.customInputSuffix}>cm</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={styles.customModalFooter}>
                            <TouchableOpacity
                                style={styles.customModalCancelBtn}
                                onPress={() => {
                                    setCustomMeasurementsDraft({});
                                    setIsCustomMeasurementsOpen(false);
                                }}
                            >
                                <Text style={styles.customModalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.customModalApplyBtn}
                                onPress={() => {
                                    const updated: Record<string, number> = { ...freeMeasurements };
                                    for (const [k, v] of Object.entries(customMeasurementsDraft)) {
                                        const parsed = parseFloat(v.replace(',', '.'));
                                        if (!isNaN(parsed) && parsed > 0) {
                                            updated[k] = Math.round(parsed * 10);
                                        }
                                    }
                                    setFreeMeasurements(updated);
                                    setSelectedReferenceProfileCode('custom');
                                    setSelectedReferenceDemographic('custom');
                                    setCustomMeasurementsDraft({});
                                    setIsCustomMeasurementsOpen(false);
                                    if (activeWorkflow === 'free_pattern' && currentExecution && currentExecution.status === 'approved_by_designer') {
                                        setCurrentExecution({ ...currentExecution, status: 'needs_revision' });
                                        setPatternStatus('needs_revision');
                                        setStatusMessage({
                                            text: 'Cotas anatómicas personalizadas modificadas: La aprobación previa ha quedado revocada. El patrón vuelve a estado EN REVISIÓN.',
                                            type: 'info',
                                        });
                                    } else {
                                        setStatusMessage({
                                            text: '✓ Cotas personalizadas aplicadas al maniquí anatómico y mesa CAD.',
                                            type: 'success',
                                        });
                                    }
                                }}
                            >
                                <Text style={styles.customModalApplyBtnText}>
                                    Guardar y Aplicar al Maniquí →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL FLUJO D: ASOCIAR A CLIENTA (OPCIONAL, NO BLOQUEANTE) */}
            <Modal
                visible={isLinkClientModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsLinkClientModalOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.linkModalContainer}>
                        <View style={styles.linkModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.linkModalSuper}>ASOCIACIÓN POSTERIOR OPCIONAL</Text>
                                <Text style={styles.linkModalTitle}>Asociar Patrón a una Clienta</Text>
                                <Text style={styles.linkModalSubtitle}>
                                    Esta acción no altera el patrón original ni su destino en el Banco Global.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsLinkClientModalOpen(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.linkModalSearchInput}
                            placeholder="Buscar clienta por nombre..."
                            placeholderTextColor="#766B62"
                            value={linkSearchQuery}
                            onChangeText={setLinkSearchQuery}
                        />

                        <ScrollView style={{ maxHeight: 320, marginVertical: 8 }}>
                            {clients
                                .filter((c) => !linkSearchQuery.trim() || c.full_name.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                                .map((c) => {
                                    const isSelected = associatedClientId === c.id;
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[styles.linkModalItem, isSelected && styles.linkModalItemActive]}
                                            onPress={() => {
                                                setAssociatedClientId(c.id);
                                                setAssociatedClientName(c.full_name);
                                                setIsLinkClientModalOpen(false);
                                                setStatusMessage({
                                                    text: `✓ Patrón libre asociado a la clienta "${c.full_name}" sin alterar el patrón original.`,
                                                    type: 'success',
                                                });
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.linkAvatarCircle}>
                                                <Text style={styles.linkAvatarText}>
                                                    {c.full_name.slice(0, 2).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.linkItemTitle}>{c.full_name}</Text>
                                                <Text style={styles.linkItemSub}>{c.email || 'Clienta Bespoke'}</Text>
                                            </View>
                                            {isSelected && (
                                                <Text style={styles.linkItemCheck}>✓ Asociada</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>

                        <View style={styles.linkModalFooter}>
                            {associatedClientId && (
                                <TouchableOpacity
                                    style={styles.linkModalClearBtn}
                                    onPress={() => {
                                        setAssociatedClientId(null);
                                        setAssociatedClientName(null);
                                        setIsLinkClientModalOpen(false);
                                        setStatusMessage({
                                            text: 'Vínculo con clienta removido. Patrón conservado como libre.',
                                            type: 'info',
                                        });
                                    }}
                                >
                                    <Text style={styles.linkModalClearBtnText}>Desasociar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.linkModalCloseBtn}
                                onPress={() => setIsLinkClientModalOpen(false)}
                            >
                                <Text style={styles.linkModalCloseBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL FLUJO D: ASOCIAR A CREACIÓN (OPCIONAL, NO BLOQUEANTE) */}
            <Modal
                visible={isLinkCreationModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsLinkCreationModalOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.linkModalContainer}>
                        <View style={styles.linkModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.linkModalSuper}>ASOCIACIÓN POSTERIOR OPCIONAL</Text>
                                <Text style={styles.linkModalTitle}>Asociar Patrón a una Creación</Text>
                                <Text style={styles.linkModalSubtitle}>
                                    Vincula este patrón a una pieza de alta costura conservando el linaje inmutable.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsLinkCreationModalOpen(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.linkModalSearchInput}
                            placeholder="Buscar creación por nombre..."
                            placeholderTextColor="#766B62"
                            value={linkSearchQuery}
                            onChangeText={setLinkSearchQuery}
                        />

                        <ScrollView style={{ maxHeight: 320, marginVertical: 8 }}>
                            {clientCreations
                                .filter((cr) => !linkSearchQuery.trim() || cr.name.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                                .map((cr) => {
                                    const isSelected = associatedCreationId === cr.id;
                                    return (
                                        <TouchableOpacity
                                            key={cr.id}
                                            style={[styles.linkModalItem, isSelected && styles.linkModalItemActive]}
                                            onPress={async () => {
                                                setAssociatedCreationId(cr.id);
                                                setAssociatedCreationName(cr.name);
                                                setIsLinkCreationModalOpen(false);
                                                if (currentExecution) {
                                                    try {
                                                        await linkPatternExecutionToCreation(cr.id, currentExecution.id);
                                                    } catch (err) {
                                                        console.warn('[PatternModule] link to creation error:', err);
                                                    }
                                                }
                                                setStatusMessage({
                                                    text: `✓ Patrón libre asociado a la creación "${cr.name}". Linaje y trazabilidad inmutables preservados.`,
                                                    type: 'success',
                                                });
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontSize: 20 }}>👗</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.linkItemTitle}>{cr.name}</Text>
                                                <Text style={styles.linkItemSub}>
                                                    Estado: {cr.status?.toUpperCase()} · Prenda: {(cr.garment_type && cr.garment_type in GARMENT_PACKAGES ? GARMENT_PACKAGES[cr.garment_type as keyof typeof GARMENT_PACKAGES]?.name : null) || cr.garment_type || 'Alta Costura'}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Text style={styles.linkItemCheck}>✓ Asociada</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            {clientCreations.length === 0 && (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: '#766B62', fontSize: 13, textAlign: 'center' }}>
                                        No se encontraron creaciones activas cargadas en este contexto.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.linkModalFooter}>
                            {associatedCreationId && (
                                <TouchableOpacity
                                    style={styles.linkModalClearBtn}
                                    onPress={() => {
                                        setAssociatedCreationId(null);
                                        setAssociatedCreationName(null);
                                        setIsLinkCreationModalOpen(false);
                                        setStatusMessage({
                                            text: 'Vínculo con creación removido. Patrón conservado como libre.',
                                            type: 'info',
                                        });
                                    }}
                                >
                                    <Text style={styles.linkModalClearBtnText}>Desasociar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.linkModalCloseBtn}
                                onPress={() => setIsLinkCreationModalOpen(false)}
                            >
                                <Text style={styles.linkModalCloseBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};
