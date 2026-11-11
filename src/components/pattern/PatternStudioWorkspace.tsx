import React from 'react';
import { View } from 'react-native';
import { PatternStudioLeftSidebar } from './PatternStudioLeftSidebar';
import { PatternStudioDirectWorkflowBanner, PatternStudioFreeWorkflowBanner } from './PatternStudioWorkflowBanners';
import { PatternStudioCreationHeader, PatternStudioCreationStageViews } from './PatternStudioCreationFlow';
import { PatternStudioTabBar } from './PatternStudioHeaderBar';
import { PatternStudioGarmentTab } from './PatternStudioGarmentTab';
import { PatternStudioCadTab } from './PatternStudioCadTab';
import { PatternStudioFittingTab } from './PatternStudioFittingTab';
import { PatternStudioSpecsTab } from './PatternStudioSpecsTab';
import { PatternStudioHistoryTab } from './PatternStudioHistoryTab';
import { PatternStudioState } from './usePatternStudioState';
import { usePatternEngineActions } from './usePatternEngineActions';

export interface PatternStudioWorkspaceProps {
    styles: any;
    state: PatternStudioState;
    actions: ReturnType<typeof usePatternEngineActions>;
    isMobile: boolean;
    isTabletPortrait: boolean;
    isFreeWorkflowTwoCol: boolean;
    formatDate: (d?: string | null) => string;
    formatSessionDate: (d?: string | null) => string;
}

export const PatternStudioWorkspace: React.FC<PatternStudioWorkspaceProps> = ({
    styles,
    state,
    actions,
    isMobile,
    isTabletPortrait,
    isFreeWorkflowTwoCol,
    formatDate,
    formatSessionDate,
}) => {
    const {
        activeWorkflow,
        isClientDrawerOpen,
        setIsClientDrawerOpen,
        selectedReferenceDemographic,
        selectedClient,
        setSelectedClient,
        freePatternShortSubtitle,
        freeMeasurements,
        setFreeMeasurements,
        activeMeasurementsMm,
        selectedSession,
        setSelectedSession,
        selectedReferenceProfileCode,
        currentReferenceProfile,
        handleSelectReferenceDemographic,
        setIsCustomMeasurementsOpen,
        selectedMeasureCode,
        setSelectedMeasureCode,
        mannequinViewMode,
        setMannequinViewMode,
        mannequinPerspective,
        setMannequinPerspective,
        setIsExportMenuOpen,
        clients,
        loadingClients,
        garmentType,
        setGarmentType,
        selectedTemplate,
        setModalPreviousSession,
        setIsMeasurementModalOpen,
        isFreeMannequinCollapsed,
        setIsFreeMannequinCollapsed,
        sessions,
        isDirectAnatomyCollapsed,
        setIsDirectAnatomyCollapsed,
        geometryResult,
        templateMeasurementDiagnostic,
        lastGeneratedSessionId,
        executionHistory,
        clientCreations,
        isMannequinCollapsed,
        setIsMannequinCollapsed,
        templateRequirementsCheck,
        showMmEquivalencies,
        setShowMmEquivalencies,
        isMeasuresTableCollapsed,
        setIsMeasuresTableCollapsed,
        expandedMeasureCategories,
        toggleMeasureCategory,
        handleOpenMeasureGuide,
        setViewingDerivedSessionId,
        isExportMenuOpen,
        creationGateActive,
        loadingCreations,
        selectedCreation,
        setSelectedCreation,
        handleOpenCreation,
        handleChangeCreationClient,
        handleChangeCreationContext,
        creationContextConfirmedRef,
        currentExecution,
        creationFlowSummary,
        setActiveInfoKind,
        activeCreationStage,
        handleSelectCreationStage,
        freePatternProfileLabel,
        associatedClientName,
        associatedCreationName,
        setLinkSearchQuery,
        setIsLinkClientModalOpen,
        setIsLinkCreationModalOpen,
        freePatternLifecycleState,
        activeStudioTab,
        setActiveStudioTab,
        setActiveResultsTab,
        adjustmentsHistory,
        setCreationZoomTarget,
        garmentDiagnosis,
        isStudioTabShown,
        setSelectedReferenceDemographic,
        setSelectedReferenceProfileCode,
        setCurrentExecution,
        setPatternStatus,
        setStatusMessage,
        handleSelectGarmentInGrid,
        templates,
        handleSelectTemplate,
        selectedEaseProfile,
        setSelectedEaseProfile,
        setIsEaseManuallySetByUser,
        designParams,
        setDesignParams,
        handleApplySuggestedEase,
        isGenerating,
        patternStatus,
        showChecklistDetails,
        setShowChecklistDetails,
        showMeasurementsBreakdown,
        setShowMeasurementsBreakdown,
        validationChecklist,
        handleSelectExecution,
        handleOpenAddAdjustmentModal,
        fittingStatus,
        lastRegenerationResult,
        role,
        stagedAdjustments,
        handleRemoveStagedAdjustment,
        fittingNotes,
        setFittingNotes,
        isRegenerating,
        handleOpenRegenerateConfirm,
        handleOpenComparison,
        setIsReturnModalOpen,
        creationTimelineNodes,
        lastExportInfo,
        setLastExportInfo,
        setIsAdjustmentsModalOpen,
        setIsProductionModalOpen,
    } = state;

    const {
        handleGeneratePattern,
        handleSendToFitting,
        handleApprovePattern,
        handleExportSvg,
        handleExportDxf,
        handlePrintTiled,
        renderBankClosureSection,
    } = actions;

    return (
        <View
            style={[
                styles.studioWorkflowLayout,
                activeWorkflow === 'free_pattern'
                    ? (isFreeWorkflowTwoCol ? styles.studioWorkflowLayoutFreeRow : styles.studioWorkflowLayoutFreeCol)
                    : (isTabletPortrait && { flexDirection: 'column' }),
            ]}
        >
            {/* PANEL IZQUIERDO: CLIENTA Y ANATOMÍA */}
            <PatternStudioLeftSidebar
                activeWorkflow={activeWorkflow}
                isTabletPortrait={isTabletPortrait}
                isClientDrawerOpen={isClientDrawerOpen}
                setIsClientDrawerOpen={setIsClientDrawerOpen}
                selectedReferenceDemographic={selectedReferenceDemographic}
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                freePatternShortSubtitle={freePatternShortSubtitle}
                freeMeasurements={freeMeasurements}
                activeMeasurementsMm={activeMeasurementsMm}
                selectedSession={selectedSession}
                setSelectedSession={setSelectedSession}
                selectedReferenceProfileCode={selectedReferenceProfileCode}
                currentReferenceProfile={currentReferenceProfile}
                handleSelectReferenceDemographic={handleSelectReferenceDemographic}
                setIsCustomMeasurementsOpen={setIsCustomMeasurementsOpen}
                selectedMeasureCode={selectedMeasureCode}
                setSelectedMeasureCode={setSelectedMeasureCode}
                mannequinViewMode={mannequinViewMode}
                setMannequinViewMode={setMannequinViewMode}
                mannequinPerspective={mannequinPerspective}
                setMannequinPerspective={setMannequinPerspective}
                setIsExportMenuOpen={setIsExportMenuOpen}
                clients={clients}
                loadingClients={loadingClients}
                garmentType={garmentType}
                setGarmentType={setGarmentType}
                selectedTemplate={selectedTemplate}
                setModalPreviousSession={setModalPreviousSession}
                setIsMeasurementModalOpen={setIsMeasurementModalOpen}
                isFreeWorkflowTwoCol={isFreeWorkflowTwoCol}
                isFreeMannequinCollapsed={isFreeMannequinCollapsed}
                setIsFreeMannequinCollapsed={setIsFreeMannequinCollapsed}
                sessions={sessions}
            />

            {/* PANEL DERECHO: MESA DE CORTE Y ESTUDIO CAD */}
            <View style={[styles.rightStudioColumn, activeWorkflow === 'free_pattern' && styles.rightStudioColumnFree]}>
                {/* BANNER IDENTIFICADOR PERSISTENTE FLUJO B */}
                {activeWorkflow === 'direct_pattern' && (
                    <PatternStudioDirectWorkflowBanner
                        styles={styles}
                        isDirectAnatomyCollapsed={isDirectAnatomyCollapsed}
                        setIsDirectAnatomyCollapsed={setIsDirectAnatomyCollapsed}
                        selectedClient={selectedClient}
                        selectedSession={selectedSession}
                        garmentType={garmentType}
                        selectedTemplate={selectedTemplate}
                        geometryResult={geometryResult}
                        templateMeasurementDiagnostic={templateMeasurementDiagnostic}
                        lastGeneratedSessionId={lastGeneratedSessionId}
                        formatSessionDate={formatSessionDate}
                        clients={clients}
                        setSelectedClient={setSelectedClient}
                        loadingClients={loadingClients}
                        sessions={sessions}
                        setSelectedSession={setSelectedSession}
                        activeMeasurementsMm={activeMeasurementsMm}
                        executionHistory={executionHistory}
                        clientCreations={clientCreations}
                        isMannequinCollapsed={isMannequinCollapsed}
                        setIsMannequinCollapsed={setIsMannequinCollapsed}
                        setModalPreviousSession={setModalPreviousSession}
                        setIsMeasurementModalOpen={setIsMeasurementModalOpen}
                        selectedMeasureCode={selectedMeasureCode}
                        setSelectedMeasureCode={setSelectedMeasureCode}
                        mannequinViewMode={mannequinViewMode}
                        setMannequinViewMode={setMannequinViewMode}
                        mannequinPerspective={mannequinPerspective}
                        setMannequinPerspective={setMannequinPerspective}
                        templateRequirementsCheck={templateRequirementsCheck}
                        showMmEquivalencies={showMmEquivalencies}
                        setShowMmEquivalencies={setShowMmEquivalencies}
                        isMeasuresTableCollapsed={isMeasuresTableCollapsed}
                        setIsMeasuresTableCollapsed={setIsMeasuresTableCollapsed}
                        expandedMeasureCategories={expandedMeasureCategories}
                        toggleMeasureCategory={toggleMeasureCategory}
                        handleOpenMeasureGuide={handleOpenMeasureGuide}
                        setViewingDerivedSessionId={setViewingDerivedSessionId}
                        isExportMenuOpen={isExportMenuOpen}
                        setIsExportMenuOpen={setIsExportMenuOpen}
                        formatDate={formatDate}
                    />
                )}

                {/* FLUJO C: CABECERA CONTEXTUAL Y STEPPER ÚNICO DE 7 ETAPAS */}
                {activeWorkflow === 'creation_pattern' && (
                    <PatternStudioCreationHeader
                        creationGateActive={creationGateActive}
                        clients={clients}
                        loadingClients={loadingClients}
                        selectedClient={selectedClient}
                        setSelectedClient={setSelectedClient}
                        clientCreations={clientCreations}
                        loadingCreations={loadingCreations}
                        selectedCreation={selectedCreation}
                        setSelectedCreation={setSelectedCreation}
                        handleOpenCreation={handleOpenCreation}
                        handleChangeCreationClient={handleChangeCreationClient}
                        handleChangeCreationContext={handleChangeCreationContext}
                        creationContextConfirmedRef={creationContextConfirmedRef}
                        garmentType={garmentType}
                        selectedSession={selectedSession}
                        currentExecution={currentExecution}
                        creationFlowSummary={creationFlowSummary}
                        setActiveInfoKind={setActiveInfoKind}
                        activeCreationStage={activeCreationStage}
                        handleSelectCreationStage={handleSelectCreationStage}
                    />
                )}

                {/* BANNER IDENTIFICADOR PERSISTENTE FLUJO D */}
                {activeWorkflow === 'free_pattern' && (
                    <PatternStudioFreeWorkflowBanner
                        styles={styles}
                        isMobile={isMobile}
                        freePatternProfileLabel={freePatternProfileLabel}
                        garmentType={garmentType}
                        selectedTemplate={selectedTemplate}
                        isFreeMannequinCollapsed={isFreeMannequinCollapsed}
                        setIsFreeMannequinCollapsed={setIsFreeMannequinCollapsed}
                        freePatternLifecycleState={freePatternLifecycleState}
                        associatedClientName={associatedClientName}
                        associatedCreationName={associatedCreationName}
                        onOpenLinkClient={() => {
                            if (!freePatternLifecycleState.hasRealPattern) {
                                setStatusMessage({
                                    text: 'Para asociar a una clienta, primero debe trazar/generar el patrón en la Mesa CAD.',
                                    type: 'info',
                                });
                                return;
                            }
                            setLinkSearchQuery('');
                            setIsLinkClientModalOpen(true);
                        }}
                        onOpenLinkCreation={() => {
                            if (!freePatternLifecycleState.hasRealPattern) {
                                setStatusMessage({
                                    text: 'Para asociar a una creación, primero debe trazar/generar el patrón en la Mesa CAD.',
                                    type: 'info',
                                });
                                return;
                            }
                            setLinkSearchQuery('');
                            setIsLinkCreationModalOpen(true);
                        }}
                    />
                )}

                {/* Barra de 5 pestañas de estudio: solo Flujos B y D */}
                {activeWorkflow !== 'creation_pattern' && (
                    <PatternStudioTabBar
                        styles={styles}
                        activeStudioTab={activeStudioTab}
                        setActiveStudioTab={setActiveStudioTab}
                        setActiveResultsTab={setActiveResultsTab}
                        geometryResult={geometryResult}
                        adjustmentsHistoryCount={adjustmentsHistory.length}
                        executionHistoryCount={executionHistory.length}
                    />
                )}

                {/* ETAPAS 1 Y 2 DEL FLUJO C: CREACIÓN & ANATOMÍA */}
                {activeWorkflow === 'creation_pattern' && (
                    <PatternStudioCreationStageViews
                        creationGateActive={creationGateActive}
                        activeCreationStage={activeCreationStage}
                        selectedClient={selectedClient}
                        setSelectedClient={setSelectedClient}
                        selectedCreation={selectedCreation}
                        garmentType={garmentType}
                        selectedSession={selectedSession}
                        setSelectedSession={setSelectedSession}
                        creationFlowSummary={creationFlowSummary}
                        clientCreations={clientCreations}
                        loadingCreations={loadingCreations}
                        handleOpenCreation={handleOpenCreation}
                        handleSelectCreationStage={handleSelectCreationStage}
                        setActiveInfoKind={setActiveInfoKind}
                        setCreationZoomTarget={setCreationZoomTarget}
                        garmentDiagnosis={garmentDiagnosis}
                        setSelectedMeasureCode={setSelectedMeasureCode}
                        selectedMeasureCode={selectedMeasureCode}
                        handleOpenMeasureGuide={handleOpenMeasureGuide}
                        setModalPreviousSession={setModalPreviousSession}
                        setIsMeasurementModalOpen={setIsMeasurementModalOpen}
                        clients={clients}
                        loadingClients={loadingClients}
                        sessions={sessions}
                        activeMeasurementsMm={activeMeasurementsMm}
                        executionHistory={executionHistory}
                        isMannequinCollapsed={isMannequinCollapsed}
                        setIsMannequinCollapsed={setIsMannequinCollapsed}
                        mannequinViewMode={mannequinViewMode}
                        setMannequinViewMode={setMannequinViewMode}
                        mannequinPerspective={mannequinPerspective}
                        setMannequinPerspective={setMannequinPerspective}
                        selectedTemplate={selectedTemplate}
                        templateRequirementsCheck={templateRequirementsCheck}
                        showMmEquivalencies={showMmEquivalencies}
                        setShowMmEquivalencies={setShowMmEquivalencies}
                        isMeasuresTableCollapsed={isMeasuresTableCollapsed}
                        setIsMeasuresTableCollapsed={setIsMeasuresTableCollapsed}
                        expandedMeasureCategories={expandedMeasureCategories}
                        toggleMeasureCategory={toggleMeasureCategory}
                        setViewingDerivedSessionId={setViewingDerivedSessionId}
                        isExportMenuOpen={isExportMenuOpen}
                        setIsExportMenuOpen={setIsExportMenuOpen}
                        formatDateFn={formatDate}
                    />
                )}

                {/* PESTAÑA 1: PRENDA & SILUETA */}
                {isStudioTabShown('garment') && (
                    <PatternStudioGarmentTab
                        activeWorkflow={activeWorkflow}
                        selectedReferenceDemographic={selectedReferenceDemographic}
                        handleSelectReferenceDemographic={handleSelectReferenceDemographic}
                        setSelectedReferenceDemographic={setSelectedReferenceDemographic}
                        setSelectedReferenceProfileCode={setSelectedReferenceProfileCode}
                        setIsCustomMeasurementsOpen={setIsCustomMeasurementsOpen}
                        selectedReferenceProfileCode={selectedReferenceProfileCode}
                        currentExecution={currentExecution}
                        setCurrentExecution={setCurrentExecution}
                        setPatternStatus={setPatternStatus}
                        setStatusMessage={setStatusMessage}
                        freeMeasurements={freeMeasurements}
                        setFreeMeasurements={setFreeMeasurements}
                        selectedCreation={selectedCreation}
                        garmentType={garmentType}
                        geometryResult={geometryResult}
                        creationFlowSummary={creationFlowSummary}
                        setActiveInfoKind={setActiveInfoKind}
                        handleSelectCreationStage={handleSelectCreationStage}
                        setCreationZoomTarget={setCreationZoomTarget}
                        handleSelectGarmentInGrid={handleSelectGarmentInGrid}
                        setActiveStudioTab={setActiveStudioTab}
                        activeMeasurementsMm={activeMeasurementsMm}
                        selectedClient={selectedClient}
                        freePatternProfileLabel={freePatternProfileLabel}
                        selectedSession={selectedSession}
                    />
                )}

                {/* PESTAÑA 2: MESA CAD */}
                {isStudioTabShown('cad') && (
                    <PatternStudioCadTab
                        garmentType={garmentType}
                        selectedTemplate={selectedTemplate}
                        templates={templates}
                        handleSelectTemplate={handleSelectTemplate}
                        activeWorkflow={activeWorkflow}
                        selectedEaseProfile={selectedEaseProfile}
                        setSelectedEaseProfile={setSelectedEaseProfile}
                        setIsEaseManuallySetByUser={setIsEaseManuallySetByUser}
                        designParams={designParams}
                        setDesignParams={setDesignParams}
                        handleApplySuggestedEase={handleApplySuggestedEase}
                        activeMeasurementsMm={activeMeasurementsMm}
                        selectedSession={selectedSession}
                        selectedClient={selectedClient}
                        selectedCreation={selectedCreation}
                        currentExecution={currentExecution}
                        geometryResult={geometryResult}
                        isGenerating={isGenerating}
                        handleGeneratePattern={handleGeneratePattern}
                        patternStatus={patternStatus}
                        handleSendToFitting={handleSendToFitting}
                        handleApprovePattern={handleApprovePattern}
                        handleOpenComparison={handleOpenComparison}
                        setIsAdjustmentsModalOpen={setIsAdjustmentsModalOpen}
                        setIsProductionModalOpen={setIsProductionModalOpen}
                        handleExportSvg={handleExportSvg}
                        handleExportDxf={handleExportDxf}
                        handlePrintTiled={handlePrintTiled}
                        lastExportInfo={lastExportInfo}
                        setLastExportInfo={setLastExportInfo}
                        showChecklistDetails={showChecklistDetails}
                        setShowChecklistDetails={setShowChecklistDetails}
                        showMeasurementsBreakdown={showMeasurementsBreakdown}
                        setShowMeasurementsBreakdown={setShowMeasurementsBreakdown}
                        templateRequirementsCheck={templateRequirementsCheck}
                        templateMeasurementDiagnostic={templateMeasurementDiagnostic}
                        validationChecklist={validationChecklist}
                        executionHistory={executionHistory}
                        handleSelectExecution={handleSelectExecution}
                        setModalPreviousSession={setModalPreviousSession}
                        setIsMeasurementModalOpen={setIsMeasurementModalOpen}
                        setIsCustomMeasurementsOpen={setIsCustomMeasurementsOpen}
                        setActiveStudioTab={setActiveStudioTab}
                        setActiveResultsTab={setActiveResultsTab}
                        renderBankClosureSection={renderBankClosureSection}
                        freePatternProfileLabel={freePatternProfileLabel}
                        selectedReferenceProfileCode={selectedReferenceProfileCode}
                    />
                )}

                {/* PESTAÑA 3: FITTING & AJUSTES */}
                {isStudioTabShown('fitting') && (
                    <PatternStudioFittingTab
                        activeWorkflow={activeWorkflow}
                        adjustmentsHistory={adjustmentsHistory}
                        currentExecution={currentExecution}
                        setCreationZoomTarget={setCreationZoomTarget}
                        handleOpenAddAdjustmentModal={handleOpenAddAdjustmentModal}
                        geometryResult={geometryResult}
                        setActiveStudioTab={setActiveStudioTab}
                        fittingStatus={fittingStatus}
                        lastRegenerationResult={lastRegenerationResult}
                        selectedClient={selectedClient}
                        selectedCreation={selectedCreation}
                        selectedTemplate={selectedTemplate}
                        freePatternProfileLabel={freePatternProfileLabel}
                        selectedSession={selectedSession}
                        role={role}
                        stagedAdjustments={stagedAdjustments}
                        handleRemoveStagedAdjustment={handleRemoveStagedAdjustment}
                        fittingNotes={fittingNotes}
                        setFittingNotes={setFittingNotes}
                        isRegenerating={isRegenerating}
                        handleOpenRegenerateConfirm={handleOpenRegenerateConfirm}
                    />
                )}

                {/* PESTAÑA 4: FICHA TÉCNICA & AUDITORÍA C13 */}
                {isStudioTabShown('specifications') && (
                    <PatternStudioSpecsTab
                        activeWorkflow={activeWorkflow}
                        selectedClient={selectedClient}
                        selectedCreation={selectedCreation}
                        garmentType={garmentType}
                        selectedSession={selectedSession}
                        creationFlowSummary={creationFlowSummary}
                        currentExecution={currentExecution}
                        geometryResult={geometryResult}
                        adjustmentsHistory={adjustmentsHistory}
                        setActiveInfoKind={setActiveInfoKind}
                        setCreationZoomTarget={setCreationZoomTarget}
                        setIsAdjustmentsModalOpen={setIsAdjustmentsModalOpen}
                        handleApprovePattern={handleApprovePattern}
                        setActiveStudioTab={setActiveStudioTab}
                        selectedTemplate={selectedTemplate}
                        freePatternProfileLabel={freePatternProfileLabel}
                        validationChecklist={validationChecklist}
                        patternStatus={patternStatus}
                        associatedClientName={associatedClientName}
                        associatedCreationName={associatedCreationName}
                        selectedEaseProfile={selectedEaseProfile}
                        role={role}
                        handleSendToFitting={handleSendToFitting}
                        setIsReturnModalOpen={setIsReturnModalOpen}
                        renderBankClosureSection={renderBankClosureSection}
                    />
                )}

                {/* PESTAÑA 5: BITÁCORA Y LINAJE HISTÓRICO */}
                {isStudioTabShown('history') && (
                    <PatternStudioHistoryTab
                        activeWorkflow={activeWorkflow}
                        creationTimelineNodes={creationTimelineNodes}
                        executionHistory={executionHistory}
                        handleSelectExecution={handleSelectExecution}
                        setActiveStudioTab={setActiveStudioTab}
                        garmentType={garmentType}
                        freePatternProfileLabel={freePatternProfileLabel}
                        selectedClient={selectedClient}
                        selectedCreation={selectedCreation}
                        currentExecution={currentExecution}
                        templates={templates}
                        selectedTemplate={selectedTemplate}
                        handleOpenComparison={handleOpenComparison}
                        renderBankClosureSection={renderBankClosureSection}
                    />
                )}
            </View>
        </View>
    );
};
