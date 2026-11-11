// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: PANEL IZQUIERDO Y DRAWER ANATÓMICO (M02)
// Archivo: src/components/pattern/PatternStudioLeftSidebar.tsx
// ==============================================================================

import React from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { roundTo } from '../../engine/pattern/geometry/geometry2d';
import { styles } from './patternModuleStyles';
import { AtelierGrandAnatomicalMannequin } from './AtelierGrandAnatomicalMannequin';
import { AtelierClientSelector } from './AtelierClientSelector';
import { AtelierMannequinDisplay } from './AtelierMannequinDisplay';
import { Client } from '../../types/client';
import { MeasurementSession } from '../../types/pattern/measurement';
import { GarmentType, PatternTemplate } from '../../types/pattern/pattern';
import { AnatomicalPerspective } from '../../engine/pattern/catalog/anatomicalMapping';

export interface PatternStudioLeftSidebarProps {
    activeWorkflow: string;
    isTabletPortrait: boolean;
    isClientDrawerOpen: boolean;
    setIsClientDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    selectedReferenceDemographic: any;
    selectedClient: Client | null;
    setSelectedClient: (client: Client | null) => void;
    freePatternShortSubtitle: string;
    freeMeasurements: Record<string, number>;
    activeMeasurementsMm: Record<string, number>;
    selectedSession: MeasurementSession | null;
    setSelectedSession: (session: MeasurementSession | null) => void;
    selectedReferenceProfileCode: string;
    currentReferenceProfile: any;
    handleSelectReferenceDemographic: (d: any) => void;
    setIsCustomMeasurementsOpen: (open: boolean) => void;
    selectedMeasureCode: string | null;
    setSelectedMeasureCode: (code: string | null) => void;
    mannequinViewMode: 'full_body' | 'torso';
    setMannequinViewMode: (mode: 'full_body' | 'torso') => void;
    mannequinPerspective: AnatomicalPerspective;
    setMannequinPerspective: (persp: AnatomicalPerspective) => void;
    setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    clients: Client[];
    loadingClients: boolean;
    garmentType: GarmentType;
    setGarmentType: (gt: GarmentType) => void;
    selectedTemplate: PatternTemplate | null;
    setModalPreviousSession: (session: MeasurementSession | null) => void;
    setIsMeasurementModalOpen: (open: boolean) => void;
    isFreeWorkflowTwoCol: boolean;
    isFreeMannequinCollapsed: boolean;
    setIsFreeMannequinCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    sessions: MeasurementSession[];
}

export const PatternStudioLeftSidebar: React.FC<PatternStudioLeftSidebarProps> = ({
    activeWorkflow,
    isTabletPortrait,
    isClientDrawerOpen,
    setIsClientDrawerOpen,
    selectedReferenceDemographic,
    selectedClient,
    setSelectedClient,
    freePatternShortSubtitle,
    freeMeasurements,
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
    isFreeWorkflowTwoCol,
    isFreeMannequinCollapsed,
    setIsFreeMannequinCollapsed,
    sessions,
}) => {
    return (
        <>
            {/* EN TABLETA VERTICAL: BOTÓN RÁPIDO PARA ABRIR MANIQUÍ Y CLIENTAS */}
            {isTabletPortrait && activeWorkflow !== 'direct_pattern' && activeWorkflow !== 'creation_pattern' && activeWorkflow !== 'free_pattern' && (
                <TouchableOpacity
                    style={styles.tabletClientTriggerBar}
                    onPress={() => setIsClientDrawerOpen(true)}
                    activeOpacity={0.85}
                >
                    <View style={styles.tabletClientTriggerLeft}>
                        <View style={styles.tabletAvatarCircle}>
                            <Text style={styles.tabletAvatarText}>
                                {activeWorkflow === 'free_pattern'
                                    ? (selectedReferenceDemographic === 'woman' ? '👗' : selectedReferenceDemographic === 'man' ? '👔' : selectedReferenceDemographic === 'girl' ? '🎀' : selectedReferenceDemographic === 'boy' ? '🧢' : '✏️')
                                    : (selectedClient ? selectedClient.full_name.slice(0, 2).toUpperCase() : 'KC')}
                            </Text>
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                            <Text style={styles.tabletClientNameText} numberOfLines={1}>
                                {activeWorkflow === 'free_pattern'
                                    ? `PERFIL: ${freePatternShortSubtitle}`
                                    : (selectedClient ? selectedClient.full_name : 'Seleccionar Clienta')}
                            </Text>
                            <Text style={styles.tabletClientMeasureText} numberOfLines={1}>
                                {activeWorkflow === 'free_pattern'
                                    ? `B: ${roundTo((freeMeasurements.contorno_busto || 0)/10, 1)}cm · C: ${roundTo((freeMeasurements.contorno_cintura || 0)/10, 1)}cm · Cad: ${roundTo((freeMeasurements.contorno_cadera || 0)/10, 1)}cm`
                                    : (selectedSession
                                        ? `v${selectedSession.version_number} · B: ${roundTo((activeMeasurementsMm.contorno_busto || 0)/10, 1)}cm · C: ${roundTo((activeMeasurementsMm.contorno_cintura || 0)/10, 1)}cm · Cad: ${roundTo((activeMeasurementsMm.contorno_cadera || 0)/10, 1)}cm`
                                        : 'Sin sesión de medidas activa')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.tabletMannequinBadge}>
                        <Text style={styles.tabletMannequinBadgeText}>
                            {activeWorkflow === 'free_pattern' ? '👗 Maniquí de Referencia ▾' : '👗 Maniquí & Clientas ▾'}
                        </Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* MODAL DRAWER LATERAL PARA TABLETA VERTICAL */}
            <Modal
                visible={isTabletPortrait && isClientDrawerOpen && activeWorkflow !== 'free_pattern'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsClientDrawerOpen(false)}
            >
                <View style={styles.drawerOverlay}>
                    <View style={styles.drawerContentCard}>
                        <View style={styles.drawerHeaderRow}>
                            <Text style={styles.drawerHeaderTitle}>
                                {activeWorkflow === 'free_pattern' ? 'PERFIL ANATÓMICO DE REFERENCIA' : 'DIRECTORIO & ANATOMÍA DE TALLER'}
                            </Text>
                            <TouchableOpacity
                                style={styles.drawerCloseBtn}
                                onPress={() => setIsClientDrawerOpen(false)}
                            >
                                <Text style={styles.drawerCloseText}>✕ Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                            {activeWorkflow === 'free_pattern' ? (
                                <AtelierGrandAnatomicalMannequin
                                    headerEyebrow="✦ PERFIL ANATÓMICO DE REFERENCIA"
                                    headerTitle={freePatternShortSubtitle}
                                    headerSubtitle="BANCO GLOBAL · BASE DE TALLER"
                                    referenceProfileLabel={freePatternShortSubtitle}
                                    badgeVersionText={selectedReferenceProfileCode === 'custom' ? 'LIBRE' : `TALLA ${currentReferenceProfile?.sizeLabel || 'BASE'}`}
                                    measurementsMm={freeMeasurements}
                                    session={null}
                                    clientName={undefined}
                                    demographic={selectedReferenceDemographic === 'custom' ? 'woman' : selectedReferenceDemographic}
                                    onDemographicChange={(d) => handleSelectReferenceDemographic(d)}
                                    onRectify={() => {
                                        setIsClientDrawerOpen(false);
                                        setIsCustomMeasurementsOpen(true);
                                    }}
                                    onNewSession={() => {
                                        setIsClientDrawerOpen(false);
                                        setIsCustomMeasurementsOpen(true);
                                    }}
                                    selectedMeasureCode={selectedMeasureCode}
                                    onSelectMeasureCode={setSelectedMeasureCode}
                                    viewMode={mannequinViewMode}
                                    onViewModeChange={setMannequinViewMode}
                                    perspective={mannequinPerspective}
                                    onPerspectiveChange={setMannequinPerspective}
                                    onOpenExport={() => setIsExportMenuOpen((prev) => !prev)}
                                />
                            ) : (
                                <>
                                    <AtelierClientSelector
                                        clients={clients}
                                        selectedClient={selectedClient}
                                        onSelectClient={(c) => {
                                            setSelectedClient(c);
                                            setIsClientDrawerOpen(false);
                                        }}
                                        loading={loadingClients}
                                    />
                                    <AtelierMannequinDisplay
                                        clientName={selectedClient?.full_name}
                                        measurementsMm={activeMeasurementsMm}
                                        session={selectedSession}
                                        garmentType={garmentType}
                                        selectedTemplateName={selectedTemplate?.name}
                                        onSelectGarmentType={(gt) => setGarmentType(gt)}
                                        onNewSession={() => {
                                            setModalPreviousSession(null);
                                            setIsMeasurementModalOpen(true);
                                        }}
                                        onCorrectSession={() => {
                                            if (selectedSession) {
                                                setModalPreviousSession(selectedSession);
                                                setIsMeasurementModalOpen(true);
                                            }
                                        }}
                                    />
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* EN TABLETA HORIZONTAL Y ESCRITORIO: PANEL LATERAL FIJO O SUPERIOR EN VERTICAL */}
            {((!isTabletPortrait && activeWorkflow !== 'direct_pattern' && activeWorkflow !== 'creation_pattern') || (activeWorkflow === 'free_pattern')) && (
                <View
                    style={[
                        styles.leftStudioColumn,
                        activeWorkflow === 'free_pattern' && (
                            isFreeMannequinCollapsed
                                ? styles.leftStudioColumnFreeCollapsed
                                : (isFreeWorkflowTwoCol ? styles.leftStudioColumnFree : styles.leftStudioColumnFreeStacked)
                        ),
                    ]}
                >
                    {activeWorkflow === 'free_pattern' ? (
                        <AtelierGrandAnatomicalMannequin
                            headerEyebrow="✦ PERFIL ANATÓMICO DE REFERENCIA"
                            headerTitle={freePatternShortSubtitle}
                            headerSubtitle="BANCO GLOBAL · BASE DE TALLER"
                            referenceProfileLabel={freePatternShortSubtitle}
                            badgeVersionText={selectedReferenceProfileCode === 'custom' ? 'LIBRE' : `TALLA ${currentReferenceProfile?.sizeLabel || 'BASE'}`}
                            measurementsMm={freeMeasurements}
                            session={null}
                            clientName={undefined}
                            demographic={selectedReferenceDemographic === 'custom' ? 'woman' : selectedReferenceDemographic}
                            onDemographicChange={(d) => handleSelectReferenceDemographic(d)}
                            onRectify={() => setIsCustomMeasurementsOpen(true)}
                            onNewSession={() => setIsCustomMeasurementsOpen(true)}
                            selectedMeasureCode={selectedMeasureCode}
                            onSelectMeasureCode={setSelectedMeasureCode}
                            viewMode={mannequinViewMode}
                            onViewModeChange={setMannequinViewMode}
                            perspective={mannequinPerspective}
                            onPerspectiveChange={setMannequinPerspective}
                            onOpenExport={() => setIsExportMenuOpen((prev) => !prev)}
                            isCollapsed={isFreeMannequinCollapsed}
                            onToggleCollapse={() => setIsFreeMannequinCollapsed((prev) => !prev)}
                        />
                    ) : (
                        <>
                            {/* 1. Selector y Buscador de Clientas con Avatares Monograma y Soporte para Cientos de Registros */}
                            <AtelierClientSelector
                                clients={clients}
                                selectedClient={selectedClient}
                                onSelectClient={(c) => setSelectedClient(c)}
                                loading={loadingClients}
                            />

                            {/* 2. Maniquí Anatómico de Alta Costura sobre Fondo Oscuro de Lujo con Cotas Métricas */}
                            <AtelierMannequinDisplay
                                clientName={selectedClient?.full_name}
                                measurementsMm={activeMeasurementsMm}
                                session={selectedSession}
                                garmentType={garmentType}
                                selectedTemplateName={selectedTemplate?.name}
                                onSelectGarmentType={(gt) => setGarmentType(gt)}
                                onNewSession={() => {
                                    setModalPreviousSession(null);
                                    setIsMeasurementModalOpen(true);
                                }}
                                onCorrectSession={() => {
                                    if (selectedSession) {
                                        setModalPreviousSession(selectedSession);
                                        setIsMeasurementModalOpen(true);
                                    }
                                }}
                            />

                            {/* Selector de Otras Sesiones Históricas de la Misma Clienta */}
                            {sessions.length > 1 && (
                                <View style={styles.sessionHistoryCard}>
                                    <Text style={styles.sessionHistoryCardTitle}>
                                        OTRAS SESIONES HISTÓRICAS ({sessions.length}):
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                                    >
                                        {sessions.map((s) => {
                                            const isAct = selectedSession?.id === s.id;
                                            return (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    style={[
                                                        styles.sessionHistoryChip,
                                                        isAct && styles.sessionHistoryChipActive,
                                                    ]}
                                                    onPress={() => setSelectedSession(s)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.sessionHistoryChipText,
                                                            isAct && styles.sessionHistoryChipTextActive,
                                                        ]}
                                                    >
                                                        v{s.version_number} · {s.session_date || 'Sin fecha'}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                        </>
                    )}
                </View>
            )}
        </>
    );
};

