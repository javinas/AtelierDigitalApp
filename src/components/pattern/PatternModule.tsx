// ==============================================================================
// ATELIER DIGITAL — COMPONENTE MAESTRO: MÓDULO 02 — PATRONAJE PARAMÉTRICO
// Archivo: src/components/pattern/PatternModule.tsx
// ==============================================================================
// Orquestador declarativo modular de alta costura:
// Clienta → Sesión de Medidas → Prenda → Validación → Holguras → Motor → Geometría → Exportación
// ==============================================================================

import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { GarmentType } from '../../types/pattern/pattern';
import { styles } from './patternModuleStyles';
import { usePatternStudioState, formatDate, formatSessionDate } from './usePatternStudioState';
import { usePatternEngineActions } from './usePatternEngineActions';
import { PatternStudioMainHeader, PatternStudioWorkflowSubHeader } from './PatternStudioHeaderBar';
import { PatternStudioHub } from './PatternStudioHub';
import { PatternStudioMeasuresFlow } from './PatternStudioMeasuresFlow';
import { AtelierMeasurementGuideModal } from './AtelierMeasurementGuideModal';
import { PatternStudioWorkspace } from './PatternStudioWorkspace';
import { PatternStudioModals } from './PatternStudioModals';

interface PatternModuleProps {
    onBack: () => void;
    titleBack?: string;
    initialClientId?: string | null;
    initialSessionId?: string | null;
    initialCreationId?: string | null;
    initialGarmentType?: GarmentType | null;
    initialWorkflow?: 'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern' | null;
}

export function PatternModule({
    onBack,
    titleBack = '← Volver al Atelier',
    initialClientId,
    initialSessionId,
    initialCreationId,
    initialGarmentType,
    initialWorkflow,
}: PatternModuleProps) {
    const state = usePatternStudioState({
        initialClientId,
        initialSessionId,
        initialCreationId,
        initialGarmentType,
        initialWorkflow,
    });

    const {
        role,
        user,
        profile,
        activeWorkflow,
        setActiveWorkflow,
        activeWorkflowRef,
        creationContextConfirmedRef,
        clientCreations,
        setClientCreations,
        selectedCreation,
        setSelectedCreation,
        loadingCreations,
        setLoadingCreations,
        activeCreationStage,
        setActiveCreationStage,
        creationZoomTarget,
        setCreationZoomTarget,
        activeInfoKind,
        setActiveInfoKind,
        selectedReferenceDemographic,
        setSelectedReferenceDemographic,
        selectedReferenceProfileCode,
        setSelectedReferenceProfileCode,
        freeMeasurements,
        setFreeMeasurements,
        freePatternProfileLabel,
        currentReferenceProfile,
        freePatternShortSubtitle,
        handleSelectReferenceDemographic,
        associatedClientId,
        setAssociatedClientId,
        associatedClientName,
        setAssociatedClientName,
        associatedCreationId,
        setAssociatedCreationId,
        associatedCreationName,
        setAssociatedCreationName,
        isLinkClientModalOpen,
        setIsLinkClientModalOpen,
        isLinkCreationModalOpen,
        setIsLinkCreationModalOpen,
        linkSearchQuery,
        setLinkSearchQuery,
        customMeasurementsDraft,
        setCustomMeasurementsDraft,
        viewingDerivedSessionId,
        setViewingDerivedSessionId,
        flujoAView,
        setFlujoAView,
        isCustomMeasurementsOpen,
        setIsCustomMeasurementsOpen,
        clients,
        setClients,
        selectedClient,
        setSelectedClient,
        loadingClients,
        sessions,
        setSessions,
        selectedSession,
        setSelectedSession,
        modalPreviousSession,
        setModalPreviousSession,
        isMeasurementModalOpen,
        setIsMeasurementModalOpen,
        garmentType,
        setGarmentType,
        selectedEaseProfile,
        setSelectedEaseProfile,
        designParams,
        setDesignParams,
        templates,
        setTemplates,
        selectedTemplate,
        setSelectedTemplate,
        loadingTemplates,
        isEaseManuallySetByUser,
        setIsEaseManuallySetByUser,
        isMobile,
        isTablet,
        isDesktop,
        isTabletPortrait,
        isFreeMannequinCollapsed,
        setIsFreeMannequinCollapsed,
        isFreeWorkflowTwoCol,
        isClientDrawerOpen,
        setIsClientDrawerOpen,
        activeStudioTab,
        setActiveStudioTab,
        showChecklistDetails,
        setShowChecklistDetails,
        showMeasurementsBreakdown,
        setShowMeasurementsBreakdown,
        isMannequinCollapsed,
        setIsMannequinCollapsed,
        mannequinViewMode,
        setMannequinViewMode,
        mannequinPerspective,
        setMannequinPerspective,
        selectedMeasureCode,
        setSelectedMeasureCode,
        previousSelectedMeasureCode,
        activeGuideModalCode,
        handleOpenMeasureGuide,
        handleCloseMeasureGuide,
        handleHighlightInMannequin,
        expandedMeasureCategories,
        toggleMeasureCategory,
        isExportMenuOpen,
        setIsExportMenuOpen,
        isMeasuresTableCollapsed,
        setIsMeasuresTableCollapsed,
        showMmEquivalencies,
        setShowMmEquivalencies,
        isDirectAnatomyCollapsed,
        setIsDirectAnatomyCollapsed,
        lastGeneratedSessionId,
        setLastGeneratedSessionId,
        showEstimatedModal,
        setShowEstimatedModal,
        allowEstimatedGeneration,
        setAllowEstimatedGeneration,
        showEstimatedDetailsReview,
        setShowEstimatedDetailsReview,
        statusMessage,
        setStatusMessage,
        activeResultsTab,
        setActiveResultsTab,
        isGenerating,
        setIsGenerating,
        geometryResult,
        setGeometryResult,
        validationResult,
        setValidationResult,
        currentExecution,
        setCurrentExecution,
        patternStatus,
        setPatternStatus,
        executionHistory,
        setExecutionHistory,
        adjustmentsHistory,
        setAdjustmentsHistory,
        lastExportInfo,
        setLastExportInfo,
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
        comparisonResult,
        setComparisonResult,
        isReturnModalOpen,
        setIsReturnModalOpen,
        returnReason,
        setReturnReason,
        returnObservation,
        setReturnObservation,
        stagedAdjustments,
        setStagedAdjustments,
        isAddAdjustmentModalOpen,
        setIsAddAdjustmentModalOpen,
        selectedPieceIdForAdj,
        setSelectedPieceIdForAdj,
        adjType,
        setAdjType,
        adjZone,
        setAdjZone,
        adjLocation,
        setAdjLocation,
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
        fittingNotes,
        setFittingNotes,
        isRegenerateConfirmOpen,
        setIsRegenerateConfirmOpen,
        isRegenerating,
        setIsRegenerating,
        lastRegenerationResult,
        setLastRegenerationResult,
        fittingStatus,
        freePatternLifecycleState,
        handleSelectGarmentInGrid,
        handleSelectAdjType,
        handleOpenAddAdjustmentModal,
        handleAddAdjustment,
        handleRemoveStagedAdjustment,
        handleOpenRegenerateConfirm,
        handleExecuteRegenerateWithAdjustments,
        handleOpenComparison,
        handleConfirmReturnToReview,
        handleSelectExecution,
        loadTemplatesForGarment,
        handleSelectTemplate,
        handleApplySuggestedEase,
        loadClients,
        loadClientCreations,
        loadClientSessions,
        handleAssignGarmentToCreation,
        activeMeasurementsMm,
        currentRequirementsCheck,
        templateRequirementsCheck,
        templateMeasurementDiagnostic,
        garmentDiagnosis,
        creationFlowSummary,
        creationTimelineNodes,
        handleSelectCreationStage,
        creationGateActive,
        isStudioTabShown,
        handleOpenCreation,
        handleChangeCreationContext,
        handleChangeCreationClient,
        activeInfoSheetData,
        validationChecklist,
        handleFinalizeSelectedSession,
    } = state;

    const actions = usePatternEngineActions({ state, initialCreationId });
    const {
        commitActiveExecution,
        handleGeneratePattern,
        handleSendToFitting,
        handleRequestApproval,
        handleApprovePattern,
        handleApprovePatternConfirm,
        handleExportSvg,
        handlePrintTiled,
        handleExportDxf,
        renderBankClosureSection,
    } = actions;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <PatternStudioMainHeader
                styles={styles}
                onBack={onBack}
                titleBack={titleBack}
                activeWorkflow={activeWorkflow}
                initialCreationId={initialCreationId}
                onOpenPatternBank={() => router.push('/(designer)/pattern-bank')}
                onOpenCopilot={() => setIsCopilotModalOpen(true)}
            />

            <PatternStudioWorkflowSubHeader
                styles={styles}
                activeWorkflow={activeWorkflow}
                selectedClient={selectedClient}
                selectedSession={selectedSession}
                selectedCreation={selectedCreation}
                sessions={sessions}
                freePatternProfileLabel={freePatternProfileLabel}
                onBackToHub={() => setActiveWorkflow('hub')}
            />

            <ScrollView contentContainerStyle={[styles.scrollContent, activeWorkflow === 'free_pattern' && styles.scrollContentFree]}>
                {/* Notificación Flotante Toast para Tableta (no empuja el contenido) */}
                {statusMessage && (
                    <View
                        style={[
                            styles.floatingToast,
                            statusMessage.type === 'success' && styles.floatingToastSuccess,
                            statusMessage.type === 'error' && styles.floatingToastError,
                            statusMessage.type === 'info' && styles.floatingToastInfo,
                        ]}
                    >
                        <Text style={styles.floatingToastIcon}>
                            {statusMessage.type === 'success' ? '✓' : statusMessage.type === 'error' ? '⚠️' : 'ℹ️'}
                        </Text>
                        <Text style={styles.floatingToastText}>{statusMessage.text}</Text>
                        <TouchableOpacity
                            onPress={() => setStatusMessage(null)}
                            style={styles.floatingToastClose}
                        >
                            <Text style={styles.floatingToastCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ============================================================================== */}
                {/* 1. VISTA EDITORIAL: HUB PRINCIPAL (MÓDULO 02 · ALTA COSTURA - MODULARIZADO Paso 3.2) */}
                {/* ============================================================================== */}
                {activeWorkflow === 'hub' && (
                    <PatternStudioHub
                        onNavigateMeasurements={() => setActiveWorkflow('measurements')}
                        onNavigateDirectPattern={() => {
                            setSelectedCreation(null);
                            setActiveWorkflow('direct_pattern');
                        }}
                        onNavigateCreationPattern={() => {
                            if (!(creationContextConfirmedRef.current && selectedClient && selectedCreation)) {
                                creationContextConfirmedRef.current = false;
                                setSelectedCreation(null);
                                setSelectedClient(null);
                            }
                            setActiveCreationStage('creation');
                            setActiveWorkflow('creation_pattern');
                        }}
                        onNavigateFreePattern={() => {
                            setSelectedClient(null);
                            setSelectedCreation(null);
                            setSelectedSession(null);
                            setClientCreations([]);
                            setSessions([]);
                            setCurrentExecution(null);
                            setGeometryResult(null);
                            setValidationResult(null);
                            setPatternStatus('draft');
                            setExecutionHistory([]);
                            setAdjustmentsHistory([]);
                            setStagedAdjustments([]);
                            setActiveWorkflow('free_pattern');
                            setActiveStudioTab('garment');
                        }}
                    />
                )}

                {/* ============================================================================== */}
                {/* 2. FLUJO A: GESTIÓN DE MEDIDAS (SECCIÓN 4 Y 5 - MODULARIZADO Paso 3.3) */}
                {/* ============================================================================== */}
                {activeWorkflow === 'measurements' && (
                    <PatternStudioMeasuresFlow
                        clients={clients}
                        selectedClient={selectedClient}
                        setSelectedClient={setSelectedClient}
                        loadingClients={loadingClients}
                        sessions={sessions}
                        selectedSession={selectedSession}
                        setSelectedSession={setSelectedSession}
                        clientCreations={clientCreations}
                        associatedCreationName={associatedCreationName}
                        setViewingDerivedSessionId={setViewingDerivedSessionId}
                        setModalPreviousSession={setModalPreviousSession}
                        setIsMeasurementModalOpen={setIsMeasurementModalOpen}
                        selectedTemplate={selectedTemplate}
                        isMannequinCollapsed={isMannequinCollapsed}
                        setIsMannequinCollapsed={setIsMannequinCollapsed}
                        mannequinViewMode={mannequinViewMode}
                        setMannequinViewMode={setMannequinViewMode}
                        mannequinPerspective={mannequinPerspective}
                        setMannequinPerspective={setMannequinPerspective}
                        selectedMeasureCode={selectedMeasureCode}
                        setSelectedMeasureCode={setSelectedMeasureCode}
                        isExportMenuOpen={isExportMenuOpen}
                        setIsExportMenuOpen={setIsExportMenuOpen}
                        isMeasuresTableCollapsed={isMeasuresTableCollapsed}
                        setIsMeasuresTableCollapsed={setIsMeasuresTableCollapsed}
                        showMmEquivalencies={showMmEquivalencies}
                        setShowMmEquivalencies={setShowMmEquivalencies}
                        handleOpenMeasureGuide={handleOpenMeasureGuide}
                        expandedMeasureCategories={expandedMeasureCategories}
                        toggleMeasureCategory={toggleMeasureCategory}
                        executionHistory={executionHistory}
                        activeMeasurementsMm={activeMeasurementsMm}
                        templateRequirementsCheck={templateRequirementsCheck}
                    />
                )}

                {/* MODAL COMPARTIDO DE GUÍA VISUAL Y FOTOGRÁFICA DE MEDIDAS (COMPARTIDO CON MANIQUÍ) */}
    <AtelierMeasurementGuideModal
        visible={Boolean(activeGuideModalCode)}
        measureCode={activeGuideModalCode}
        sessionValueMm={activeGuideModalCode ? activeMeasurementsMm[activeGuideModalCode] : null}
        showMmEquivalencies={showMmEquivalencies}
        onClose={handleCloseMeasureGuide}
        onHighlightInMannequin={handleHighlightInMannequin}
    />

                {/* ============================================================================== */}
                {/* 3. FLUJO B, C Y D: ESTUDIO CAD Y MESA DE CORTE */}
                {/* ============================================================================== */}
                {activeWorkflow !== 'hub' && activeWorkflow !== 'measurements' && (
                    <PatternStudioWorkspace
                        styles={styles}
                        state={state}
                        actions={actions}
                        isMobile={state.isMobile}
                        isTabletPortrait={state.isTabletPortrait}
                        isFreeWorkflowTwoCol={state.isFreeWorkflowTwoCol}
                        formatDate={formatDate}
                        formatSessionDate={formatSessionDate}
                    />
                )}
                </ScrollView>

        <PatternStudioModals
            viewingDerivedSessionId={viewingDerivedSessionId}
            setViewingDerivedSessionId={setViewingDerivedSessionId}
            isMeasurementModalOpen={isMeasurementModalOpen}
            setIsMeasurementModalOpen={setIsMeasurementModalOpen}
            isAdjustmentsModalOpen={isAdjustmentsModalOpen}
            setIsAdjustmentsModalOpen={setIsAdjustmentsModalOpen}
            isCopilotModalOpen={isCopilotModalOpen}
            setIsCopilotModalOpen={setIsCopilotModalOpen}
            isProductionModalOpen={isProductionModalOpen}
            setIsProductionModalOpen={setIsProductionModalOpen}
            isApprovalConfirmOpen={isApprovalConfirmOpen}
            setIsApprovalConfirmOpen={setIsApprovalConfirmOpen}
            isComparisonModalOpen={isComparisonModalOpen}
            setIsComparisonModalOpen={setIsComparisonModalOpen}
            isReturnModalOpen={isReturnModalOpen}
            setIsReturnModalOpen={setIsReturnModalOpen}
            isAddAdjustmentModalOpen={isAddAdjustmentModalOpen}
            setIsAddAdjustmentModalOpen={setIsAddAdjustmentModalOpen}
            isRegenerateConfirmOpen={isRegenerateConfirmOpen}
            setIsRegenerateConfirmOpen={setIsRegenerateConfirmOpen}
            showEstimatedModal={showEstimatedModal}
            setShowEstimatedModal={setShowEstimatedModal}
            creationZoomTarget={creationZoomTarget}
            setCreationZoomTarget={setCreationZoomTarget}
            isCustomMeasurementsOpen={isCustomMeasurementsOpen}
            setIsCustomMeasurementsOpen={setIsCustomMeasurementsOpen}
            isLinkClientModalOpen={isLinkClientModalOpen}
            setIsLinkClientModalOpen={setIsLinkClientModalOpen}
            isLinkCreationModalOpen={isLinkCreationModalOpen}
            setIsLinkCreationModalOpen={setIsLinkCreationModalOpen}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            selectedSession={selectedSession}
            setSelectedSession={setSelectedSession}
            modalPreviousSession={modalPreviousSession}
            setModalPreviousSession={setModalPreviousSession}
            activeMeasurementsMm={activeMeasurementsMm}
            sessions={sessions}
            setSessions={setSessions}
            clients={clients}
            selectedCreation={selectedCreation}
            setSelectedCreation={setSelectedCreation}
            clientCreations={clientCreations}
            setClientCreations={setClientCreations}
            currentExecution={currentExecution}
            setCurrentExecution={setCurrentExecution}
            executionHistory={executionHistory}
            setExecutionHistory={setExecutionHistory}
            adjustmentsHistory={adjustmentsHistory}
            setAdjustmentsHistory={setAdjustmentsHistory}
            stagedAdjustments={stagedAdjustments}
            garmentType={garmentType}
            selectedTemplate={selectedTemplate}
            selectedEaseProfile={selectedEaseProfile}
            designParams={designParams}
            setDesignParams={setDesignParams}
            geometryResult={geometryResult}
            validationResult={validationResult}
            fittingNotes={fittingNotes}
            setFittingNotes={setFittingNotes}
            fittingStatus={fittingStatus}
            setPatternStatus={setPatternStatus}
            activeWorkflow={activeWorkflow}
            setActiveWorkflow={setActiveWorkflow}
            setActiveStudioTab={setActiveStudioTab}
            setActiveCreationStage={setActiveCreationStage}
            creationContextConfirmedRef={creationContextConfirmedRef}
            comparisonResult={comparisonResult}
            handleSelectExecution={handleSelectExecution}
            handleApprovePatternConfirm={handleApprovePatternConfirm}
            handleConfirmReturnToReview={handleConfirmReturnToReview}
            handleAddAdjustment={handleAddAdjustment}
            handleExecuteRegenerateWithAdjustments={handleExecuteRegenerateWithAdjustments}
            handleGeneratePattern={handleGeneratePattern}
            handleSelectAdjType={handleSelectAdjType}
            setStatusMessage={setStatusMessage}
            freeMeasurements={freeMeasurements}
            setFreeMeasurements={setFreeMeasurements}
            loadClientSessions={loadClientSessions}
            activeInfoKind={activeInfoKind}
            setActiveInfoKind={setActiveInfoKind}
            activeInfoSheetData={activeInfoSheetData}
            adjType={adjType}
            adjLocation={adjLocation}
            setAdjLocation={setAdjLocation}
            selectedPieceIdForAdj={selectedPieceIdForAdj}
            setSelectedPieceIdForAdj={setSelectedPieceIdForAdj}
            adjValue={adjValue}
            setAdjValue={setAdjValue}
            adjUnit={adjUnit}
            setAdjUnit={setAdjUnit}
            adjDirection={adjDirection}
            setAdjDirection={setAdjDirection}
            adjMotive={adjMotive}
            setAdjMotive={setAdjMotive}
            adjObservation={adjObservation}
            setAdjObservation={setAdjObservation}
            adjError={adjError}
            setAdjError={setAdjError}
            returnReason={returnReason}
            setReturnReason={setReturnReason}
            returnObservation={returnObservation}
            setReturnObservation={setReturnObservation}
            showEstimatedDetailsReview={showEstimatedDetailsReview}
            setShowEstimatedDetailsReview={setShowEstimatedDetailsReview}
            setAllowEstimatedGeneration={setAllowEstimatedGeneration}
            customMeasurementsDraft={customMeasurementsDraft}
            setCustomMeasurementsDraft={setCustomMeasurementsDraft}
            linkSearchQuery={linkSearchQuery}
            setLinkSearchQuery={setLinkSearchQuery}
            associatedClientId={associatedClientId}
            setAssociatedClientId={setAssociatedClientId}
            setAssociatedClientName={setAssociatedClientName}
            associatedCreationId={associatedCreationId}
            setAssociatedCreationId={setAssociatedCreationId}
            setAssociatedCreationName={setAssociatedCreationName}
            setSelectedReferenceDemographic={setSelectedReferenceDemographic}
            setSelectedReferenceProfileCode={setSelectedReferenceProfileCode}
            initialCreationId={initialCreationId}
            templateMeasurementDiagnostic={templateMeasurementDiagnostic}
        />
        </View>
    );
}
