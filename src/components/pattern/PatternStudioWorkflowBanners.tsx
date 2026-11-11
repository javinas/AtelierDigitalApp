import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Client } from '../../types/client';
import { MeasurementSession } from '../../types/pattern/measurement';
import { Creation } from '../../types/creation';
import { PatternTemplate, PatternExecution, GarmentType } from '../../types/pattern/pattern';
import { GARMENT_PACKAGES, TemplateMeasurementDiagnostic } from '../../engine/pattern/catalog/garmentPackages';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { AtelierClientAnatomyWorkspace } from './AtelierClientAnatomyWorkspace';
import { AnatomicalPerspective } from '../../engine/pattern/catalog/anatomicalMapping';

const PATTERN_FREE_HERO_IMAGE = require('../../../assets/patterns/pattern_free_hero.jpg');

export interface FreePatternLifecycleState {
    hasRealPattern: boolean;
    code: string;
    label: string;
    versionLabel: string;
    clientLabel: string;
    creationLabel: string;
    tracingLabel: string;
    approvalLabel: string;
    piecesCount: number;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    dotColor: string;
}

export interface PatternStudioDirectWorkflowBannerProps {
    styles: any;
    isDirectAnatomyCollapsed: boolean;
    setIsDirectAnatomyCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    selectedClient: Client | null;
    selectedSession: MeasurementSession | null;
    garmentType: GarmentType | string;
    selectedTemplate: PatternTemplate | null;
    geometryResult: PatternGeometryResult | null;
    templateMeasurementDiagnostic: TemplateMeasurementDiagnostic;
    lastGeneratedSessionId: string | null;
    formatSessionDate: (date?: string | null) => string;
    // AtelierClientAnatomyWorkspace props
    clients: Client[];
    setSelectedClient: (client: Client | null) => void;
    loadingClients: boolean;
    sessions: MeasurementSession[];
    setSelectedSession: (session: MeasurementSession | null) => void;
    activeMeasurementsMm: Record<string, number>;
    executionHistory: PatternExecution[];
    clientCreations: Creation[];
    isMannequinCollapsed: boolean;
    setIsMannequinCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    setModalPreviousSession: (session: MeasurementSession | null) => void;
    setIsMeasurementModalOpen: (open: boolean) => void;
    selectedMeasureCode: string | null;
    setSelectedMeasureCode: (code: string | null) => void;
    mannequinViewMode: 'full_body' | 'torso';
    setMannequinViewMode: (mode: 'full_body' | 'torso') => void;
    mannequinPerspective: AnatomicalPerspective;
    setMannequinPerspective: (persp: AnatomicalPerspective) => void;
    templateRequirementsCheck: any;
    showMmEquivalencies: boolean;
    setShowMmEquivalencies: React.Dispatch<React.SetStateAction<boolean>>;
    isMeasuresTableCollapsed: boolean;
    setIsMeasuresTableCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    expandedMeasureCategories: Record<string, boolean>;
    toggleMeasureCategory: (cat: string) => void;
    handleOpenMeasureGuide: (code: string) => void;
    setViewingDerivedSessionId: (id: string | null) => void;
    isExportMenuOpen: boolean;
    setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    formatDate: (date?: string | null) => string;
}

export const PatternStudioDirectWorkflowBanner: React.FC<PatternStudioDirectWorkflowBannerProps> = ({
    styles,
    isDirectAnatomyCollapsed,
    setIsDirectAnatomyCollapsed,
    selectedClient,
    selectedSession,
    garmentType,
    selectedTemplate,
    geometryResult,
    templateMeasurementDiagnostic,
    lastGeneratedSessionId,
    formatSessionDate,
    clients,
    setSelectedClient,
    loadingClients,
    sessions,
    setSelectedSession,
    activeMeasurementsMm,
    executionHistory,
    clientCreations,
    isMannequinCollapsed,
    setIsMannequinCollapsed,
    setModalPreviousSession,
    setIsMeasurementModalOpen,
    selectedMeasureCode,
    setSelectedMeasureCode,
    mannequinViewMode,
    setMannequinViewMode,
    mannequinPerspective,
    setMannequinPerspective,
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
    setIsExportMenuOpen,
    formatDate,
}) => {
    return (
        <View style={styles.persistentWorkflowCard}>
            <View style={styles.persistentWorkflowTopRow}>
                <View style={[styles.persistentWorkflowPill, { backgroundColor: '#EDF5EE', borderColor: '#C2DFCA' }]}>
                    <Text style={[styles.persistentWorkflowPillText, { color: '#2B5E35' }]}>
                        ✂️ PATRONAJE DIRECTO
                    </Text>
                </View>
                <Text style={styles.persistentWorkflowTagline}>
                    PATRONAJE DIRECTO: Este patrón pertenece a la clienta, pero no está asociado a una Creación.
                </Text>
                <TouchableOpacity
                    style={styles.directAnatomyToggleBtn}
                    onPress={() => setIsDirectAnatomyCollapsed((prev) => !prev)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.directAnatomyToggleBtnText}>
                        {isDirectAnatomyCollapsed
                            ? '👁️ [CONSULTAR CLIENTA & ANATOMÍA COMPLETA ▾]'
                            : '▲ [COLAPSAR ZONA DE CLIENTA & ANATOMÍA]'}
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={styles.persistentWorkflowDetailsGrid}>
                <View style={styles.persistentWorkflowDetailCol}>
                    <Text style={styles.persistentWorkflowLabel}>CLIENTA</Text>
                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                        {selectedClient?.full_name || 'No seleccionada'}
                    </Text>
                </View>
                <View style={styles.persistentWorkflowDetailCol}>
                    <Text style={styles.persistentWorkflowLabel}>SESIÓN</Text>
                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                        {selectedSession ? `v${selectedSession.version_number} · ${formatSessionDate(selectedSession.session_date)}` : 'Sin sesión'}
                    </Text>
                </View>
                <View style={styles.persistentWorkflowDetailCol}>
                    <Text style={styles.persistentWorkflowLabel}>PRENDA</Text>
                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                        {GARMENT_PACKAGES[garmentType as GarmentType]?.name || garmentType}
                    </Text>
                </View>
                <View style={styles.persistentWorkflowDetailCol}>
                    <Text style={styles.persistentWorkflowLabel}>PLANTILLA</Text>
                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                        {selectedTemplate ? `${selectedTemplate.name} (v${selectedTemplate.version})` : 'Sin plantilla'}
                    </Text>
                </View>
                <View style={styles.persistentWorkflowDetailCol}>
                    <Text style={styles.persistentWorkflowLabel}>ESTADO GENERACIÓN</Text>
                    <Text style={[
                        styles.persistentWorkflowVal,
                        { color: geometryResult ? '#2B5E35' : '#8A6A4A', fontWeight: '700' }
                    ]} numberOfLines={1}>
                        {geometryResult ? `✓ GENERADO (${geometryResult.pieces.length} piezas)` : 'PENDIENTE DE TRAZADO'}
                    </Text>
                </View>
                <View style={styles.persistentWorkflowDetailCol}>
                    <Text style={styles.persistentWorkflowLabel}>ESTADO VALIDACIÓN</Text>
                    <Text style={[
                        styles.persistentWorkflowVal,
                        {
                            color: templateMeasurementDiagnostic.hasUnresolved
                                ? '#CF1322'
                                : templateMeasurementDiagnostic.hasEstimated
                                ? '#D48806'
                                : '#2B5E35',
                            fontWeight: '700',
                        }
                    ]} numberOfLines={1}>
                        {templateMeasurementDiagnostic.hasUnresolved
                            ? '⚠ MEDIDAS INCOMPLETAS'
                            : templateMeasurementDiagnostic.hasEstimated
                            ? 'ℹ INCLUYE ESTIMACIONES'
                            : '✓ 100% REALES / C10'}
                    </Text>
                </View>
            </View>

            {/* Alerta si cambia la sesión después de haber generado un patrón */}
            {lastGeneratedSessionId && selectedSession && lastGeneratedSessionId !== selectedSession.id && (
                <View style={styles.sessionChangedAlertBox}>
                    <Text style={styles.sessionChangedAlertText}>
                        ⚠️ Ha seleccionado una sesión de medidas diferente a la utilizada para generar el patrón actual. El patrón existente y su snapshot permanecen inalterados. Para reflejar las medidas de la nueva sesión, genere una nueva versión en la Mesa CAD.
                    </Text>
                </View>
            )}

            {/* ZONA DE CLIENTA Y ANATOMÍA COMPLETA CANÓNICA */}
            {!isDirectAnatomyCollapsed && (
                <View style={styles.directAnatomyWorkspaceWrapper}>
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
                        formatDateFn={formatDate}
                    />
                </View>
            )}
        </View>
    );
};

export interface PatternStudioFreeWorkflowBannerProps {
    styles: any;
    isMobile: boolean;
    freePatternProfileLabel: string;
    garmentType: GarmentType | string;
    selectedTemplate: PatternTemplate | null;
    isFreeMannequinCollapsed: boolean;
    setIsFreeMannequinCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    freePatternLifecycleState: FreePatternLifecycleState;
    associatedClientName: string | null;
    associatedCreationName: string | null;
    onOpenLinkClient: () => void;
    onOpenLinkCreation: () => void;
}

export const PatternStudioFreeWorkflowBanner: React.FC<PatternStudioFreeWorkflowBannerProps> = ({
    styles,
    isMobile,
    freePatternProfileLabel,
    garmentType,
    selectedTemplate,
    isFreeMannequinCollapsed,
    setIsFreeMannequinCollapsed,
    freePatternLifecycleState,
    associatedClientName,
    associatedCreationName,
    onOpenLinkClient,
    onOpenLinkCreation,
}) => {
    return (
        <>
            {/* HERO EDITORIAL EXCLUSIVO DEL FLUJO D: DEL GESTO A LA GEOMETRÍA */}
            <View style={[styles.freePatternHeroCard, isMobile && styles.freePatternHeroCardMobile]}>
                <View style={styles.freePatternHeroContent}>
                    <View style={styles.freePatternHeroEyebrowRow}>
                        <Text style={styles.freePatternHeroStar}>✦</Text>
                        <Text style={styles.freePatternHeroEyebrow}>FLUJO D · PATRÓN LIBRE / BANCO GLOBAL</Text>
                        <View style={styles.freePatternHeroTag}>
                            <Text style={styles.freePatternHeroTagText}>ALTA COSTURA</Text>
                        </View>
                    </View>
                    <Text style={styles.freePatternHeroTitle}>Del gesto a la geometría.</Text>
                    <Text style={styles.freePatternHeroSubtitle}>
                        Estudio de patronaje libre y archivo técnico para el Banco Global del Atelier.
                    </Text>
                    <Text style={styles.freePatternHeroDescription}>
                        Un espacio de experimentación y patronaje técnico independiente de clientas y creaciones. Formulación de volúmenes, exploración de siluetas y desarrollo de moldería arquetípica de alta costura con precisión milimétrica.
                    </Text>
                    <View style={styles.freePatternHeroBadgesRow}>
                        <View style={styles.freePatternHeroBadge}>
                            <Text style={styles.freePatternHeroBadgeText}>✦ Origen: Patrón Libre</Text>
                        </View>
                        <View style={styles.freePatternHeroBadge}>
                            <Text style={styles.freePatternHeroBadgeText}>📐 Perfil: {freePatternProfileLabel}</Text>
                        </View>
                        <View style={styles.freePatternHeroBadge}>
                            <Text style={styles.freePatternHeroBadgeText}>🏛️ Destino: Banco Global</Text>
                        </View>
                        <View style={styles.freePatternHeroBadge}>
                            <Text style={styles.freePatternHeroBadgeText}>✂️ Trazado Paramétrico Puro</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.freePatternHeroImageWrapper, isMobile && styles.freePatternHeroImageWrapperMobile]}>
                    <Image
                        source={PATTERN_FREE_HERO_IMAGE}
                        style={styles.freePatternHeroImage}
                        resizeMode="cover"
                    />
                    <View style={styles.freePatternHeroImageOverlay} />
                    <View style={styles.freePatternHeroImageCaption}>
                        <Text style={styles.freePatternHeroImageCaptionText}>
                            MESA DE TRAZADO & ALTA COSTURA · ATELIER DIGITAL
                        </Text>
                    </View>
                </View>
            </View>

            {/* TARJETA PERSISTENTE DE IDENTIDAD Y METADATOS TÉCNICOS */}
            <View style={styles.persistentWorkflowCard}>
                <View style={styles.persistentWorkflowTopRow}>
                    <View style={styles.persistentWorkflowPill}>
                        <Text style={styles.persistentWorkflowPillText}>
                            PATRÓN LIBRE · BANCO GLOBAL
                        </Text>
                    </View>
                    <Text style={styles.persistentWorkflowTagline}>
                        Perfil: {freePatternProfileLabel} · Alta Costura
                    </Text>
                    <TouchableOpacity
                        style={styles.directAnatomyToggleBtn}
                        onPress={() => setIsFreeMannequinCollapsed((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.directAnatomyToggleBtnText}>
                            {isFreeMannequinCollapsed
                                ? '👁️ [MOSTRAR MANIQUÍ DE REFERENCIA ▾]'
                                : '▲ [OCULTAR MANIQUÍ DE REFERENCIA]'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.persistentWorkflowGridWrap}>
                    {/* EJE PRINCIPAL DE ATRIBUTOS TÉCNICOS: ORIGEN / PERFIL / PRENDA / PLANTILLA / DESTINO */}
                    <View style={styles.persistentWorkflowPrimaryRow}>
                        <View style={styles.persistentWorkflowPrimaryCol}>
                            <Text style={styles.persistentWorkflowPrimaryLabel}>ORIGEN</Text>
                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                Patrón Libre
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowPrimaryCol}>
                            <Text style={styles.persistentWorkflowPrimaryLabel}>PERFIL ANATÓMICO</Text>
                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                {freePatternProfileLabel}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowPrimaryCol}>
                            <Text style={styles.persistentWorkflowPrimaryLabel}>PRENDA</Text>
                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                {GARMENT_PACKAGES[garmentType as GarmentType]?.name || garmentType}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowPrimaryCol}>
                            <Text style={styles.persistentWorkflowPrimaryLabel}>PLANTILLA</Text>
                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                {selectedTemplate ? selectedTemplate.name : 'Plantilla Base'}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowPrimaryCol}>
                            <Text style={styles.persistentWorkflowPrimaryLabel}>DESTINO</Text>
                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                Banco Global
                            </Text>
                        </View>
                    </View>

                    {/* METADATOS TÉCNICOS SECUNDARIOS DE TALLER: ESTADO / VERSIÓN / CLIENTE / CREACIÓN / TRAZADO / APROBACIÓN */}
                    <View style={styles.persistentWorkflowSecondaryRow}>
                        <View style={[styles.persistentWorkflowSecondaryCol, { minWidth: 140 }]}>
                            <Text style={styles.persistentWorkflowSecondaryLabel}>ESTADO</Text>
                            <View style={[
                                styles.freePatternStatusBadge,
                                {
                                    backgroundColor: freePatternLifecycleState.badgeBg,
                                    borderColor: freePatternLifecycleState.badgeBorder,
                                }
                            ]}>
                                <View style={[styles.freePatternStatusDot, { backgroundColor: freePatternLifecycleState.dotColor }]} />
                                <Text style={[styles.freePatternStatusText, { color: freePatternLifecycleState.badgeText }]}>
                                    {freePatternLifecycleState.label}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.persistentWorkflowSecondaryCol}>
                            <Text style={styles.persistentWorkflowSecondaryLabel}>VERSIÓN ACTUAL</Text>
                            <Text style={[styles.persistentWorkflowSecondaryVal, { fontWeight: '700' }]} numberOfLines={1}>
                                {freePatternLifecycleState.versionLabel}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowSecondaryCol}>
                            <Text style={styles.persistentWorkflowSecondaryLabel}>CLIENTE</Text>
                            <Text style={[styles.persistentWorkflowSecondaryVal, { fontStyle: 'italic', color: associatedClientName ? '#A78350' : '#8C8275' }]} numberOfLines={1}>
                                {freePatternLifecycleState.clientLabel}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowSecondaryCol}>
                            <Text style={styles.persistentWorkflowSecondaryLabel}>CREACIÓN</Text>
                            <Text style={[styles.persistentWorkflowSecondaryVal, { fontStyle: 'italic', color: associatedCreationName ? '#A78350' : '#8C8275' }]} numberOfLines={1}>
                                {freePatternLifecycleState.creationLabel}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowSecondaryCol}>
                            <Text style={styles.persistentWorkflowSecondaryLabel}>TRAZADO</Text>
                            <Text style={styles.persistentWorkflowSecondaryVal} numberOfLines={1}>
                                {freePatternLifecycleState.tracingLabel}
                            </Text>
                        </View>
                        <View style={styles.persistentWorkflowSecondaryCol}>
                            <Text style={styles.persistentWorkflowSecondaryLabel}>APROBACIÓN</Text>
                            <Text style={[
                                styles.persistentWorkflowSecondaryVal,
                                { color: freePatternLifecycleState.code === 'approved' ? '#2E7D32' : '#8C8275' }
                            ]} numberOfLines={1}>
                                {freePatternLifecycleState.approvalLabel}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ACCIONES POSTERIORES OPCIONALES (NO BLOQUEANTES) */}
                <View style={styles.persistentWorkflowOptionalActions}>
                    <TouchableOpacity
                        style={[
                            styles.optionalActionBtn,
                            associatedClientName && styles.optionalActionBtnActive,
                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnDisabled,
                        ]}
                        onPress={onOpenLinkClient}
                        disabled={!freePatternLifecycleState.hasRealPattern}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.optionalActionBtnText,
                            associatedClientName && styles.optionalActionBtnTextActive,
                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnTextDisabled,
                        ]}>
                            {associatedClientName ? `✓ Clienta: ${associatedClientName}` : '+ Asociar a Clienta'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.optionalActionBtn,
                            associatedCreationName && styles.optionalActionBtnActive,
                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnDisabled,
                        ]}
                        onPress={onOpenLinkCreation}
                        disabled={!freePatternLifecycleState.hasRealPattern}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.optionalActionBtnText,
                            associatedCreationName && styles.optionalActionBtnTextActive,
                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnTextDisabled,
                        ]}>
                            {associatedCreationName ? `✓ Creación: ${associatedCreationName}` : '+ Asociar a Creación'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
};

