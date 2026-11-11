// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: FLUJO C (CREACIONES DE ALTA COSTURA)
// Archivo: src/components/pattern/PatternStudioCreationFlow.tsx
// ==============================================================================

import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { styles } from './patternModuleStyles';
import {
    CreationEntrySelector,
    CreationContextBar,
    CreationStepper,
    CreationHero,
    ReadinessCard,
    AnatomyDiagnosisCard,
    ZoomTarget,
    ContextInfoKind,
} from './creationFlow/CreationFlowViews';
import { CreationStageId } from './creationFlow/creationFlowModel';
import { AtelierClientAnatomyWorkspace } from './AtelierClientAnatomyWorkspace';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { GarmentType, PatternExecution, PatternTemplate } from '../../types/pattern/pattern';
import { MeasurementSession } from '../../types/pattern/measurement';
import { AnatomicalPerspective } from '../../engine/pattern/catalog/anatomicalMapping';

// ==============================================================================
// 1. CABECERA Y STEPPER DE CREACIONES
// ==============================================================================

export interface PatternStudioCreationHeaderProps {
    creationGateActive: boolean;
    clients: Client[];
    loadingClients: boolean;
    selectedClient: Client | null;
    setSelectedClient: (client: Client | null) => void;
    clientCreations: Creation[];
    loadingCreations: boolean;
    selectedCreation: Creation | null;
    setSelectedCreation: (creation: Creation | null) => void;
    handleOpenCreation: (creation: Creation) => void;
    handleChangeCreationClient: () => void;
    handleChangeCreationContext: () => void;
    creationContextConfirmedRef: React.MutableRefObject<boolean>;
    garmentType: GarmentType;
    selectedSession: MeasurementSession | null;
    currentExecution: PatternExecution | null;
    creationFlowSummary: any;
    setActiveInfoKind: (kind: ContextInfoKind) => void;
    activeCreationStage: CreationStageId;
    handleSelectCreationStage: (stage: CreationStageId) => void;
}

export const PatternStudioCreationHeader: React.FC<PatternStudioCreationHeaderProps> = ({
    creationGateActive,
    clients,
    loadingClients,
    selectedClient,
    setSelectedClient,
    clientCreations,
    loadingCreations,
    selectedCreation,
    setSelectedCreation,
    handleOpenCreation,
    handleChangeCreationClient,
    handleChangeCreationContext,
    creationContextConfirmedRef,
    garmentType,
    selectedSession,
    currentExecution,
    creationFlowSummary,
    setActiveInfoKind,
    activeCreationStage,
    handleSelectCreationStage,
}) => {
    if (creationGateActive) {
        return (
            <CreationEntrySelector
                clients={clients}
                loadingClients={loadingClients}
                selectedClient={selectedClient}
                onSelectClient={(c: Client) => {
                    if (selectedClient?.id !== c.id) {
                        creationContextConfirmedRef.current = false;
                        setSelectedClient(c);
                    }
                }}
                clientCreations={clientCreations}
                loadingCreations={loadingCreations}
                onOpenCreation={handleOpenCreation}
                onOpenCreationsModule={() => {
                    router.push({
                        pathname: '/(designer)/creations',
                        params: { client_id: selectedClient?.id },
                    });
                }}
                onChangeClient={handleChangeCreationClient}
            />
        );
    }

    return (
        <View style={{ marginBottom: 16 }}>
            <CreationContextBar
                client={selectedClient}
                creation={selectedCreation}
                garmentType={garmentType}
                session={selectedSession}
                activePatternLabel={
                    currentExecution
                        ? currentExecution.version_label
                        : (selectedCreation && !selectedCreation.active_pattern_execution_id ? 'Sin patrón activo (Patronaje pendiente)' : null)
                }
                patternLink={creationFlowSummary.patternLink}
                onOpenInfo={(kind: ContextInfoKind) => setActiveInfoKind(kind)}
                onChangeContext={handleChangeCreationContext}
            />
            <CreationStepper
                summary={creationFlowSummary}
                activeStage={activeCreationStage}
                onSelect={handleSelectCreationStage}
            />
        </View>
    );
};

// ==============================================================================
// 2. VISTAS DE ETAPAS EDITORIALES DEL FLUJO C (CREACIÓN Y ANATOMÍA)
// ==============================================================================

export interface PatternStudioCreationStageViewsProps {
    creationGateActive: boolean;
    activeCreationStage: CreationStageId;
    selectedClient: Client | null;
    setSelectedClient: (client: Client | null) => void;
    selectedCreation: Creation | null;
    garmentType: GarmentType;
    selectedSession: MeasurementSession | null;
    setSelectedSession: (session: MeasurementSession | null) => void;
    creationFlowSummary: any;
    clientCreations: Creation[];
    loadingCreations: boolean;
    handleOpenCreation: (cr: Creation) => void;
    handleSelectCreationStage: (stage: CreationStageId) => void;
    setActiveInfoKind: (kind: ContextInfoKind) => void;
    setCreationZoomTarget: (z: ZoomTarget | null) => void;
    garmentDiagnosis: any;
    setSelectedMeasureCode: (code: string | null) => void;
    selectedMeasureCode: string | null;
    handleOpenMeasureGuide: (code: string) => void;
    setModalPreviousSession: (session: MeasurementSession | null) => void;
    setIsMeasurementModalOpen: (open: boolean) => void;
    clients: Client[];
    loadingClients: boolean;
    sessions: MeasurementSession[];
    activeMeasurementsMm: Record<string, number>;
    executionHistory: PatternExecution[];
    isMannequinCollapsed: boolean;
    setIsMannequinCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    mannequinViewMode: 'full_body' | 'torso';
    setMannequinViewMode: (mode: 'full_body' | 'torso') => void;
    mannequinPerspective: AnatomicalPerspective;
    setMannequinPerspective: (persp: AnatomicalPerspective) => void;
    selectedTemplate: PatternTemplate | null;
    templateRequirementsCheck: any;
    showMmEquivalencies: boolean;
    setShowMmEquivalencies: React.Dispatch<React.SetStateAction<boolean>>;
    isMeasuresTableCollapsed: boolean;
    setIsMeasuresTableCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    expandedMeasureCategories: Record<string, boolean>;
    toggleMeasureCategory: (catId: string) => void;
    setViewingDerivedSessionId: (id: string | null) => void;
    isExportMenuOpen: boolean;
    setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    formatDateFn: (d?: string | null) => string;
}

export const PatternStudioCreationStageViews: React.FC<PatternStudioCreationStageViewsProps> = ({
    creationGateActive,
    activeCreationStage,
    selectedClient,
    setSelectedClient,
    selectedCreation,
    garmentType,
    selectedSession,
    setSelectedSession,
    creationFlowSummary,
    clientCreations,
    loadingCreations,
    handleOpenCreation,
    handleSelectCreationStage,
    setActiveInfoKind,
    setCreationZoomTarget,
    garmentDiagnosis,
    setSelectedMeasureCode,
    selectedMeasureCode,
    handleOpenMeasureGuide,
    setModalPreviousSession,
    setIsMeasurementModalOpen,
    clients,
    loadingClients,
    sessions,
    activeMeasurementsMm,
    executionHistory,
    isMannequinCollapsed,
    setIsMannequinCollapsed,
    mannequinViewMode,
    setMannequinViewMode,
    mannequinPerspective,
    setMannequinPerspective,
    selectedTemplate,
    templateRequirementsCheck,
    showMmEquivalencies,
    setShowMmEquivalencies,
    isMeasuresTableCollapsed,
    setIsMeasuresTableCollapsed,
    expandedMeasureCategories,
    toggleMeasureCategory,
    setViewingDerivedSessionId,
    isExportMenuOpen,
    setIsExportMenuOpen,
    formatDateFn,
}) => {
    if (creationGateActive) return null;

    return (
        <>
            {/* ETAPA 1 DEL FLUJO C: VISTA EDITORIAL DE LA CREACIÓN */}
            {activeCreationStage === 'creation' && (
                <View style={styles.tabContentArea}>
                    <CreationHero
                        client={selectedClient}
                        creation={selectedCreation}
                        garmentType={garmentType}
                        session={selectedSession}
                        summary={creationFlowSummary}
                        clientCreations={clientCreations}
                        loadingCreations={loadingCreations}
                        onSelectCreation={handleOpenCreation}
                        onContinue={() => {
                            handleSelectCreationStage(creationFlowSummary.nextStep.stage);
                        }}
                        onSelectStage={(stage: CreationStageId) => handleSelectCreationStage(stage)}
                        onOpenInfo={(kind: ContextInfoKind) => setActiveInfoKind(kind)}
                        onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                        onOpenCreationsModule={() => {
                            router.push({
                                pathname: '/(designer)/creations',
                                params: { client_id: selectedClient?.id },
                            });
                        }}
                    />
                    <ReadinessCard
                        summary={creationFlowSummary}
                        onSelectStage={(st: CreationStageId) => handleSelectCreationStage(st)}
                    />
                </View>
            )}

            {/* ETAPA 2 DEL FLUJO C: ANATOMÍA & DIAGNÓSTICO DE MEDIDAS */}
            {activeCreationStage === 'anatomy' && (
                <View style={styles.tabContentArea}>
                    <AnatomyDiagnosisCard
                        summary={creationFlowSummary}
                        diagnosis={garmentDiagnosis}
                        onOpenGuide={(code) => {
                            setSelectedMeasureCode(code);
                            handleOpenMeasureGuide(code);
                        }}
                        onGoGarment={() => handleSelectCreationStage('garment')}
                        onOpenSession={() => {
                            setModalPreviousSession(selectedSession);
                            setIsMeasurementModalOpen(true);
                        }}
                    />
                    <View style={{ marginTop: 16 }}>
                        <AtelierClientAnatomyWorkspace
                            clients={clients}
                            selectedClient={selectedClient}
                            onSelectClient={(c) => setSelectedClient(c)}
                            loadingClients={loadingClients}
                            sessions={sessions}
                            selectedSession={selectedSession}
                            onSelectSession={(s) => setSelectedSession(s)}
                            activeMeasurementsMm={activeMeasurementsMm}
                            executionHistory={executionHistory}
                            clientCreations={clientCreations}
                            isMannequinCollapsed={isMannequinCollapsed}
                            onToggleMannequinCollapse={() => setIsMannequinCollapsed((prev) => !prev)}
                            onRectifySession={(prevSession) => {
                                setModalPreviousSession(prevSession);
                                setIsMeasurementModalOpen(true);
                            }}
                            onNewSession={() => {
                                setModalPreviousSession(null);
                                setIsMeasurementModalOpen(true);
                            }}
                            selectedMeasureCode={selectedMeasureCode}
                            onSelectMeasureCode={(code) => setSelectedMeasureCode(code)}
                            mannequinViewMode={mannequinViewMode}
                            onViewModeChange={(mode) => setMannequinViewMode(mode)}
                            mannequinPerspective={mannequinPerspective}
                            onPerspectiveChange={(persp) => setMannequinPerspective(persp)}
                            selectedTemplate={selectedTemplate}
                            templateRequirementsCheck={templateRequirementsCheck}
                            showMmEquivalencies={showMmEquivalencies}
                            onToggleShowMm={() => setShowMmEquivalencies((prev) => !prev)}
                            isMeasuresTableCollapsed={isMeasuresTableCollapsed}
                            onToggleCollapseMeasuresTable={() => setIsMeasuresTableCollapsed((prev) => !prev)}
                            expandedMeasureCategories={expandedMeasureCategories}
                            onToggleMeasureCategory={toggleMeasureCategory}
                            onOpenMeasureGuide={handleOpenMeasureGuide}
                            onViewDerivedPatterns={(sessionId) => setViewingDerivedSessionId(sessionId)}
                            isExportMenuOpen={isExportMenuOpen}
                            onToggleExportMenu={() => setIsExportMenuOpen((prev) => !prev)}
                            onCloseExportMenu={() => setIsExportMenuOpen(false)}
                            formatDateFn={formatDateFn}
                        />
                    </View>
                </View>
            )}
        </>
    );
};
