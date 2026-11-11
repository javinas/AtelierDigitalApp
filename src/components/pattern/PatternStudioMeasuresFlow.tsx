// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: FLUJO DE MEDIDAS Y MANIQUÍ ANATÓMICO
// Archivo: src/components/pattern/PatternStudioMeasuresFlow.tsx
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { PatternExecution, PatternTemplate } from '../../types/pattern/pattern';
import { AnatomicalPerspective } from '../../engine/pattern/catalog/anatomicalMapping';
import {
    MEASUREMENT_MAP,
    analyzeSessionMeasurements,
    WORKSHOP_PARAMETER_DEFINITIONS,
    WORKSHOP_PARAMETER_CODES,
    TOTAL_MANNEQUIN_COTAS,
} from '../../engine/pattern/catalog/masterCatalog';
import {
    MEASURE_CATEGORIES_DEFINITION,
    MeasureCategoryDefinition,
} from '../../engine/pattern/catalog/measurementCategories';
import { roundTo } from '../../engine/pattern/geometry/geometry2d';
import {
    getMeasurementCoverageDetail,
    exportCoverageMatrixCsv,
} from '../../engine/pattern/catalog/anatomicalCoverageMatrix';
import {
    printAnatomicalDossier,
    generateStandaloneMannequinSvg,
    generateMeasurementsCsv,
    downloadFileInBrowser,
} from '../../engine/pattern/export/measurementSessionExporter';
import { styles } from './patternModuleStyles';
import { colors } from '../../theme/colors';
import { AtelierClientSelector } from './AtelierClientSelector';
import { AtelierGrandAnatomicalMannequin } from './AtelierGrandAnatomicalMannequin';
import { getCategoryCoutureIcon, IconBodyRuler, IconInfoGuide } from './AtelierCoutureIcons';

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

export interface PatternStudioMeasuresFlowProps {
    clients: Client[];
    selectedClient: Client | null;
    setSelectedClient: (c: Client | null) => void;
    loadingClients: boolean;
    sessions: MeasurementSession[];
    selectedSession: MeasurementSession | null;
    setSelectedSession: (s: MeasurementSession | null) => void;
    clientCreations: Creation[];
    associatedCreationName?: string | null;
    setViewingDerivedSessionId: (id: string | null) => void;
    setModalPreviousSession: (s: MeasurementSession | null) => void;
    setIsMeasurementModalOpen: (open: boolean) => void;
    selectedTemplate: PatternTemplate | null;
    isMannequinCollapsed: boolean;
    setIsMannequinCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    mannequinViewMode: 'full_body' | 'torso';
    setMannequinViewMode: (mode: 'full_body' | 'torso') => void;
    mannequinPerspective: AnatomicalPerspective;
    setMannequinPerspective: (persp: AnatomicalPerspective) => void;
    selectedMeasureCode: string | null;
    setSelectedMeasureCode: (code: string | null) => void;
    isExportMenuOpen: boolean;
    setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isMeasuresTableCollapsed: boolean;
    setIsMeasuresTableCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    showMmEquivalencies: boolean;
    setShowMmEquivalencies: React.Dispatch<React.SetStateAction<boolean>>;
    handleOpenMeasureGuide: (code: string) => void;
    expandedMeasureCategories: Record<string, boolean>;
    toggleMeasureCategory: (cat: string) => void;
    executionHistory: PatternExecution[];
    activeMeasurementsMm: Record<string, number>;
    templateRequirementsCheck: any;
}

export const PatternStudioMeasuresFlow: React.FC<PatternStudioMeasuresFlowProps> = ({
    clients,
    selectedClient,
    setSelectedClient,
    loadingClients,
    sessions,
    selectedSession,
    setSelectedSession,
    clientCreations,
    associatedCreationName,
    setViewingDerivedSessionId,
    setModalPreviousSession,
    setIsMeasurementModalOpen,
    selectedTemplate,
    isMannequinCollapsed,
    setIsMannequinCollapsed,
    mannequinViewMode,
    setMannequinViewMode,
    mannequinPerspective,
    setMannequinPerspective,
    selectedMeasureCode,
    setSelectedMeasureCode,
    isExportMenuOpen,
    setIsExportMenuOpen,
    isMeasuresTableCollapsed,
    setIsMeasuresTableCollapsed,
    showMmEquivalencies,
    setShowMmEquivalencies,
    handleOpenMeasureGuide,
    expandedMeasureCategories,
    toggleMeasureCategory,
    executionHistory,
    activeMeasurementsMm,
    templateRequirementsCheck,
}) => {
    return (
<View style={styles.measurementsWorkflowContainer}>
                        {/* 1. ÁREA SUPERIOR: CLIENTA/SESIONES (IZQ) Y MANIQUÍ ANATÓMICO (DER) */}
                        <View style={styles.measurementsTopLayout}>
                            {/* COLUMNA IZQUIERDA: CLIENTA Y SESIONES */}
                            <View style={styles.measurementsLeftCol}>
                            {/* SECCIÓN A: Selector de Clientas */}
                            <AtelierClientSelector
                                clients={clients}
                                selectedClient={selectedClient}
                                onSelectClient={(c) => setSelectedClient(c)}
                                loading={loadingClients}
                                showSelectedSummary={false}
                            />

                            {/* SECCIÓN B: Resumen de la Clienta Seleccionada (UNA SOLA VEZ) */}
                            {selectedClient && (
                                <View style={styles.clientSingleSummaryCard}>
                                    <View style={styles.clientSingleSummaryHeader}>
                                        <View style={styles.clientSummaryAvatar}>
                                            <Text style={styles.clientSummaryAvatarText}>
                                                {selectedClient.full_name.slice(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.clientSingleSummaryEyebrow}>ANATOMÍA DE LA SESIÓN</Text>
                                            <Text style={styles.clientSingleSummaryName}>{selectedClient.full_name.toUpperCase()}</Text>
                                            <View style={styles.clientSingleStatusBadge}>
                                                <Text style={styles.clientSingleStatusText}>
                                                    {selectedClient.status ? selectedClient.status.toUpperCase() : 'ACTIVA'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {(() => {
                                        const latestSessionStats = analyzeSessionMeasurements(sessions[0]?.values);
                                        return (
                                            <View style={styles.clientSingleDataGrid}>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Sesiones de medidas:</Text>
                                                    <Text style={styles.clientSingleDataValue}>{sessions.length}</Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Última sesión:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {sessions[0]?.session_date ? formatDate(sessions[0].session_date) : 'Sin registro'}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Medidas corporales registradas:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {latestSessionStats.bodyCount} de {latestSessionStats.totalApplicableBody}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Medidas de diseño registradas:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {latestSessionStats.designCount}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Completitud de la sesión:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {latestSessionStats.bodyCompletionPct}%
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    <View style={styles.clientSingleActionsRow}>
                                        <TouchableOpacity
                                            style={styles.clientSingleActionBtn}
                                            onPress={() => {
                                                if (sessions[0]) setSelectedSession(sessions[0]);
                                                setIsMeasuresTableCollapsed(false);
                                                setIsMannequinCollapsed(false);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.clientSingleActionBtnText}>👁️ Ver medidas</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.clientSingleActionBtnExport}
                                            onPress={() => {
                                                if (sessions[0]) setSelectedSession(sessions[0]);
                                                setIsMeasuresTableCollapsed(false);
                                                setIsExportMenuOpen(true);
                                            }}
                                            activeOpacity={0.8}
                                            accessibilityRole="button"
                                            accessibilityLabel="Exportar expediente de medidas"
                                        >
                                            <Text style={styles.clientSingleActionBtnExportText}>✦ Exportar</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.clientSingleActionBtn, styles.clientSingleActionBtnPrimary]}
                                            onPress={() => {
                                                setModalPreviousSession(null);
                                                setIsMeasurementModalOpen(true);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.clientSingleActionBtnText, styles.clientSingleActionBtnPrimaryText]}>
                                                + Nueva sesión
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* SECCIÓN C: Historial de Sesiones (TARJETAS COMPACTAS) */}
                            {selectedClient && (
                                <View style={styles.sessionsHistorySection}>
                                    <View style={styles.sessionsHistoryHeaderRow}>
                                        <Text style={styles.sessionsHistoryTitle}>
                                            SESIONES DE MEDIDAS · {sessions.length}
                                        </Text>
                                    </View>

                                    {sessions.length === 0 ? (
                                        <View style={styles.emptySessionsCard}>
                                            <Text style={styles.emptySessionsText}>
                                                Esta clienta aún no tiene sesiones anatómicas registradas.
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.createFirstSessionBtn}
                                                onPress={() => {
                                                    setModalPreviousSession(null);
                                                    setIsMeasurementModalOpen(true);
                                                }}
                                            >
                                                <Text style={styles.createFirstSessionBtnText}>+ Tomar Primera Sesión</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        sessions.map((s) => {
                                            const isSelected = selectedSession?.id === s.id;
                                            const derivedCount = executionHistory.filter((e) => e.session_id === s.id).length;
                                            const sStats = analyzeSessionMeasurements(s.values);

                                            return (
                                                <View
                                                    key={s.id}
                                                    style={[
                                                        styles.workflowSessionCardCompact,
                                                        isSelected && styles.sessionCardActive,
                                                    ]}
                                                >
                                                    <View style={styles.sessionCardTop}>
                                                        <Text style={styles.sessionCompactTitle}>
                                                            Sesión v{s.version_number} · {formatDate(s.session_date)}
                                                        </Text>
                                                        <View
                                                            style={[
                                                                styles.sessionStatusPill,
                                                                s.status === 'completed'
                                                                    ? styles.sessionStatusCompleted
                                                                    : s.status === 'verified'
                                                                    ? styles.sessionStatusCompleted
                                                                    : styles.sessionStatusDraft,
                                                            ]}
                                                        >
                                                            <Text style={styles.sessionStatusPillText}>
                                                                {s.status === 'completed'
                                                                    ? 'FINALIZADA'
                                                                    : s.status === 'verified'
                                                                    ? 'VERIFICADA'
                                                                    : s.status === 'archived'
                                                                    ? 'ARCHIVADA'
                                                                    : 'BORRADOR'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text style={styles.sessionCompactSubtitle}>
                                                        {sStats.totalRegistered} medidas registradas ({sStats.bodyCount}/{sStats.totalApplicableBody} corporales · {sStats.bodyCompletionPct}% completitud)
                                                    </Text>

                                                    <View style={styles.sessionCompactActionsRow}>
                                                        <TouchableOpacity
                                                            style={[styles.sessionActionBtnCompact, isSelected && styles.sessionActionBtnActive]}
                                                            onPress={() => {
                                                                setSelectedSession(s);
                                                                setIsMeasuresTableCollapsed(false);
                                                            }}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={[styles.sessionActionBtnText, isSelected && styles.sessionActionBtnTextActive]}>
                                                                Ver medidas
                                                            </Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.sessionActionBtnCompact}
                                                            onPress={() => {
                                                                setModalPreviousSession(s);
                                                                setIsMeasurementModalOpen(true);
                                                            }}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.sessionActionBtnText}>
                                                                Rectificar
                                                            </Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.sessionActionBtnCompact}
                                                            onPress={() => setViewingDerivedSessionId(s.id)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.sessionActionBtnText}>
                                                                Ver patrones derivados ({derivedCount})
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            )}
                        </View>

                        {/* COLUMNA DERECHA: MANIQUÍ ANATÓMICO MAESTRO */}
                        <View style={styles.measurementsRightCol}>
                            {/* 2. MANIQUÍ ANATÓMICO MAESTRO DE ALTA COSTURA */}
                            <AtelierGrandAnatomicalMannequin
                                clientName={selectedClient?.full_name}
                                measurementsMm={activeMeasurementsMm}
                                session={selectedSession}
                                associatedCreationName={
                                    selectedSession?.creation_id
                                        ? clientCreations.find((c) => c.id === selectedSession.creation_id)?.name
                                        : undefined
                                }
                                isCollapsed={isMannequinCollapsed}
                                onToggleCollapse={() => setIsMannequinCollapsed(!isMannequinCollapsed)}
                                onRectify={() => {
                                    if (selectedSession) {
                                        setModalPreviousSession(selectedSession);
                                        setIsMeasurementModalOpen(true);
                                    }
                                }}
                                onNewSession={() => {
                                    setModalPreviousSession(null);
                                    setIsMeasurementModalOpen(true);
                                }}
                                selectedMeasureCode={selectedMeasureCode}
                                onSelectMeasureCode={setSelectedMeasureCode}
                                viewMode={mannequinViewMode}
                                onViewModeChange={setMannequinViewMode}
                                perspective={mannequinPerspective}
                                onPerspectiveChange={setMannequinPerspective}
                                onOpenExport={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            />
                        </View>
                    </View>

                    {/* 2. ÁREA INFERIOR: SECCIÓN CENTRADA Y DE ANCHO COMPLETO DE MEDIDAS DE LA SESIÓN (RESPONSIVE) */}
                    <View style={styles.measurementsFullWidthSection}>
                        {(() => {
                            const activeSessionStats = analyzeSessionMeasurements(activeMeasurementsMm);
                            return (
                                <View style={styles.detailedMeasuresTableCard}>
                                    {/* 4.A Encabezado compacto */}
                                    <View style={styles.detailedMeasuresHeaderRow}>
                                        <View style={{ flex: 1, minWidth: 260 }}>
                                            <Text style={styles.detailedMeasuresTitle}>
                                                MEDIDAS DE LA SESIÓN
                                            </Text>
                                            <Text style={styles.detailedMeasuresSub}>
                                                {selectedClient ? selectedClient.full_name : 'Clienta'} · Sesión v{selectedSession?.version_number || 1} · {selectedSession?.session_date ? formatDate(selectedSession.session_date) : 'Sin fecha'}
                                            </Text>
                                            <Text style={styles.detailedMeasuresCount}>
                                                {activeSessionStats.totalRegistered} medidas registradas en total
                                            </Text>
                                        </View>

                                        <View style={styles.detailedMeasuresControlsRow}>
                                            {/* MENÚ DESPLEGABLE DE EXPORTACIÓN EDITORIAL */}
                                            <View style={{ position: 'relative', zIndex: 1002 }}>
                                                <TouchableOpacity
                                                    style={[styles.detailedMeasuresBtn, styles.exportMenuBtn]}
                                                    onPress={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                                    activeOpacity={0.8}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Exportar medidas, maniquíes y cobertura"
                                                >
                                                    <Text style={styles.exportMenuBtnText}>✦ Exportar ⌄</Text>
                                                </TouchableOpacity>

                                                {isExportMenuOpen && (
                                                    <>
                                                        <TouchableOpacity
                                                            style={styles.exportMenuBackdrop}
                                                            onPress={() => setIsExportMenuOpen(false)}
                                                            activeOpacity={1}
                                                            accessibilityLabel="Cerrar menú de exportación"
                                                        />
                                                        <View style={styles.exportDropdownMenu}>
                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                printAnatomicalDossier({
                                                                    clientName: selectedClient?.full_name,
                                                                    session: selectedSession,
                                                                    measurementsMm: activeMeasurementsMm,
                                                                    viewMode: mannequinViewMode,
                                                                    perspective: mannequinPerspective,
                                                                    demographic: 'woman',
                                                                });
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>📄</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Ficha Anatómica (PDF)</Text>
                                                                <Text style={styles.exportItemSub}>Dossier A4 completo con cotas y tablas</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                const svg = generateStandaloneMannequinSvg({
                                                                    clientName: selectedClient?.full_name,
                                                                    session: selectedSession,
                                                                    measurementsMm: activeMeasurementsMm,
                                                                    viewMode: mannequinViewMode,
                                                                    perspective: mannequinPerspective,
                                                                    demographic: 'woman',
                                                                });
                                                                const filename = `Maniqui_${selectedClient?.full_name || 'Clienta'}_v${selectedSession?.version_number || 1}_${mannequinViewMode}_${mannequinPerspective}.svg`.replace(/\s+/g, '_');
                                                                downloadFileInBrowser(svg, filename, 'image/svg+xml');
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>📐</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Maniquí Anotado (SVG)</Text>
                                                                <Text style={styles.exportItemSub}>Gráfico vectorial 1:1 de la vista activa</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                const csv = generateMeasurementsCsv({
                                                                    clientName: selectedClient?.full_name,
                                                                    session: selectedSession,
                                                                    measurementsMm: activeMeasurementsMm,
                                                                    viewMode: mannequinViewMode,
                                                                    perspective: mannequinPerspective,
                                                                });
                                                                const filename = `Medidas_${selectedClient?.full_name || 'Clienta'}_v${selectedSession?.version_number || 1}.csv`.replace(/\s+/g, '_');
                                                                downloadFileInBrowser(csv, filename, 'text/csv');
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>📊</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Listado de Medidas (CSV)</Text>
                                                                <Text style={styles.exportItemSub}>Valores y estado sin ceros ficticios</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                const csv = exportCoverageMatrixCsv();
                                                                downloadFileInBrowser(csv, 'Matriz_Cobertura_Catalogo_Antropometrico.csv', 'text/csv');
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>🗺️</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Matriz de Cobertura (CSV)</Text>
                                                                <Text style={styles.exportItemSub}>Diagnóstico exhaustivo de todas las medidas</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    </View>
                                                </>
                                            )}
                                            </View>

                                            <TouchableOpacity
                                                style={styles.detailedMeasuresBtn}
                                                onPress={() => setShowMmEquivalencies(!showMmEquivalencies)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.detailedMeasuresBtnText}>
                                                    {showMmEquivalencies ? 'Ocultar equivalencias en mm' : 'Mostrar equivalencias en mm'}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.detailedMeasuresBtn}
                                                onPress={() => setIsMeasuresTableCollapsed(!isMeasuresTableCollapsed)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.detailedMeasuresBtnText}>
                                                    {isMeasuresTableCollapsed ? 'Mostrar medidas' : 'Ocultar medidas'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* 4.A.2 Métricas de clasificación del catálogo (6 Indicadores Diferenciados) */}
                                    <View style={styles.catalogMetricsStrip}>
                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Medidas corporales registradas</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.bodyCount} de {activeSessionStats.totalApplicableBody}
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Medidas de diseño registradas</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.designCount}
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Parámetros de taller</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.workshopCount > 0 ? `${activeSessionStats.workshopCount} registrados` : `${WORKSHOP_PARAMETER_CODES.length} predeterminados`}
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Cotas representadas en el maniquí</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {TOTAL_MANNEQUIN_COTAS} cotas
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Completitud de la sesión</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.bodyCompletionPct}%
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Medidas requeridas para esta plantilla</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {selectedTemplate
                                                    ? `${templateRequirementsCheck.present.length}/${selectedTemplate.required_measurements.length} cubiertas`
                                                    : 'Sin plantilla asignada'}
                                            </Text>
                                        </View>
                                    </View>

                            {!isMeasuresTableCollapsed && (
                                <>
                                    {/* 4.B Resumen visual de medidas principales (Hero Metrics) */}
                                    <View style={styles.measuresHeroContainer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <IconBodyRuler size={13} color="#996B1F" />
                                            <Text style={styles.measuresHeroEyebrow}>MEDIDAS PRINCIPALES DEL CUERPO (CLIC PARA ABRIR GUÍA)</Text>
                                        </View>
                                        <View style={styles.measuresHeroRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.measuresHeroCard,
                                                    selectedMeasureCode === 'contorno_busto' && styles.measuresHeroCardSelected,
                                                ]}
                                                onPress={() => handleOpenMeasureGuide('contorno_busto')}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ver guía de Contorno de Busto"
                                            >
                                                <Text style={styles.measuresHeroLabel}>BUSTO</Text>
                                                <Text style={styles.measuresHeroVal}>
                                                    {activeMeasurementsMm.contorno_busto ? `${roundTo(activeMeasurementsMm.contorno_busto / 10, 1)} cm` : '—'}
                                                </Text>
                                                {showMmEquivalencies && activeMeasurementsMm.contorno_busto ? (
                                                    <Text style={styles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_busto)} mm</Text>
                                                ) : null}
                                                <View style={styles.measuresHeroActionRow}>
                                                    <IconInfoGuide size={11} color="#A78350" />
                                                    <Text style={styles.measuresHeroActionText}>Ver guía ↗</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.measuresHeroCard,
                                                    selectedMeasureCode === 'contorno_cintura' && styles.measuresHeroCardSelected,
                                                ]}
                                                onPress={() => handleOpenMeasureGuide('contorno_cintura')}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ver guía de Contorno de Cintura"
                                            >
                                                <Text style={styles.measuresHeroLabel}>CINTURA</Text>
                                                <Text style={styles.measuresHeroVal}>
                                                    {activeMeasurementsMm.contorno_cintura ? `${roundTo(activeMeasurementsMm.contorno_cintura / 10, 1)} cm` : '—'}
                                                </Text>
                                                {showMmEquivalencies && activeMeasurementsMm.contorno_cintura ? (
                                                    <Text style={styles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_cintura)} mm</Text>
                                                ) : null}
                                                <View style={styles.measuresHeroActionRow}>
                                                    <IconInfoGuide size={11} color="#A78350" />
                                                    <Text style={styles.measuresHeroActionText}>Ver guía ↗</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.measuresHeroCard,
                                                    selectedMeasureCode === 'contorno_cadera' && styles.measuresHeroCardSelected,
                                                ]}
                                                onPress={() => handleOpenMeasureGuide('contorno_cadera')}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ver guía de Contorno de Cadera"
                                            >
                                                <Text style={styles.measuresHeroLabel}>CADERA</Text>
                                                <Text style={styles.measuresHeroVal}>
                                                    {activeMeasurementsMm.contorno_cadera ? `${roundTo(activeMeasurementsMm.contorno_cadera / 10, 1)} cm` : '—'}
                                                </Text>
                                                {showMmEquivalencies && activeMeasurementsMm.contorno_cadera ? (
                                                    <Text style={styles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_cadera)} mm</Text>
                                                ) : null}
                                                <View style={styles.measuresHeroActionRow}>
                                                    <IconInfoGuide size={11} color="#A78350" />
                                                    <Text style={styles.measuresHeroActionText}>Ver guía ↗</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Medidas secundarias de referencia anatómica */}
                                        <View style={styles.measuresSecondaryGrid}>
                                            {[
                                                { label: 'Alto de busto', code: 'contorno_alto_busto' },
                                                { label: 'Bajo busto', code: 'contorno_bajo_busto' },
                                                { label: 'Ancho de hombros', code: 'ancho_hombros' },
                                                { label: 'Ancho de espalda', code: 'ancho_espalda' },
                                                { label: 'Largo talle delantero', code: 'largo_talle_delantero' },
                                                { label: 'Largo talle espalda', code: 'largo_talle_espalda' },
                                            ].map((item) => {
                                                const val = activeMeasurementsMm[item.code];
                                                const hasVal = typeof val === 'number' && Number.isFinite(val) && val > 0;
                                                const isSelected = selectedMeasureCode === item.code;
                                                return (
                                                    <TouchableOpacity
                                                        key={item.code}
                                                        style={[
                                                            styles.measuresSecondaryItem,
                                                            isSelected && styles.measuresSecondaryItemSelected,
                                                        ]}
                                                        onPress={() => {
                                                            const cov = getMeasurementCoverageDetail(item.code, mannequinViewMode, mannequinPerspective);
                                                            if (cov.status === 'other_view' && cov.switchAction) {
                                                                if (cov.switchAction.targetView) setMannequinViewMode(cov.switchAction.targetView);
                                                                if (cov.switchAction.targetPerspective) setMannequinPerspective(cov.switchAction.targetPerspective);
                                                                setSelectedMeasureCode(item.code);
                                                            } else {
                                                                handleOpenMeasureGuide(item.code);
                                                            }
                                                        }}
                                                        activeOpacity={0.8}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Ver guía de ${item.label}`}
                                                    >
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text style={styles.measuresSecondaryLabel}>{item.label}</Text>
                                                            <Text style={{ fontSize: 9, color: '#A78350' }}>↗</Text>
                                                        </View>
                                                        {(() => {
                                                            const cov = getMeasurementCoverageDetail(item.code, mannequinViewMode, mannequinPerspective);
                                                            return (
                                                                <View style={[styles.coveragePill, { backgroundColor: cov.badgeBg, borderColor: cov.badgeColor + '55', marginTop: 3, marginBottom: 3 }]}>
                                                                    <Text style={[styles.coveragePillText, { color: cov.badgeColor }]}>{cov.badgeLabel}</Text>
                                                                </View>
                                                            );
                                                        })()}
                                                        <Text style={[styles.measuresSecondaryVal, !hasVal && styles.measuresSecondaryValMissing]}>
                                                            {hasVal ? `${roundTo(val / 10, 1)} cm${showMmEquivalencies ? ` (${Math.round(val)} mm)` : ''}` : 'No registrada'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* 4.C Secciones Desplegables con Jerarquía Editorial y Separación por Grupos */}
                                    <View style={styles.measureAccordionsContainer}>
                                        {MEASURE_CATEGORIES_DEFINITION.map((cat, idx) => {
                                            const prevCat = idx > 0 ? MEASURE_CATEGORIES_DEFINITION[idx - 1] : null;
                                            const isNewSection = !prevCat || prevCat.groupSection !== cat.groupSection;
                                            const isExpanded = expandedMeasureCategories[cat.id] ?? false;
                                            const isWorkshop = cat.groupSection === 'Parámetros de taller';
                                            const registeredCount = cat.codes.filter(c => {
                                                const val = activeMeasurementsMm[c];
                                                return (typeof val === 'number' && Number.isFinite(val) && val > 0) || (isWorkshop && WORKSHOP_PARAMETER_DEFINITIONS[c] !== undefined);
                                            }).length;

                                            return (
                                                <View key={cat.id}>
                                                    {isNewSection && (
                                                        <View style={styles.measureCategorySectionBanner}>
                                                            <Text style={styles.measureCategorySectionBadge}>
                                                                {cat.groupSection.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.measureAccordionCard}>
                                                        <TouchableOpacity
                                                            style={styles.measureAccordionHeader}
                                                            onPress={() => toggleMeasureCategory(cat.id)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                {getCategoryCoutureIcon(cat.id, { size: 16, color: colors.champagneGold })}
                                                                <Text style={styles.measureAccordionTitle}>{cat.title}</Text>
                                                                <View style={styles.measureAccordionCountBadge}>
                                                                    <Text style={styles.measureAccordionCountText}>
                                                                        {registeredCount} / {cat.codes.length}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.measureAccordionChevron}>
                                                                {isExpanded ? '⌃' : '⌄'}
                                                            </Text>
                                                        </TouchableOpacity>

                                                        {isExpanded && (
                                                            <View style={styles.measureAccordionBody}>
                                                                {cat.codes.map((code) => {
                                                                    const workshopDef = WORKSHOP_PARAMETER_DEFINITIONS[code];
                                                                    const def = MEASUREMENT_MAP[code] || workshopDef;
                                                                    const rawVal = activeMeasurementsMm[code];
                                                                    const valMm = rawVal ?? (workshopDef ? workshopDef.defaultValMm : undefined);
                                                                    const hasVal = typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0;
                                                                    const isSmallMm = code.includes('holgura') || code.includes('margen') || code.includes('inclinacion');
                                                                    const cmVal = roundTo((valMm || 0) / 10, 1);
                                                                    const name = def?.name || code;

                                                                    const isSelected = selectedMeasureCode === code;
                                                                    return (
                                                                        <TouchableOpacity
                                                                            key={code}
                                                                            style={[
                                                                                styles.measureCardCell,
                                                                                !hasVal && styles.measureCardCellEmpty,
                                                                                isSelected && styles.measureCardCellSelected,
                                                                            ]}
                                                                            onPress={() => {
                                                                                const cov = getMeasurementCoverageDetail(code, mannequinViewMode, mannequinPerspective);
                                                                                if (cov.status === 'other_view' && cov.switchAction) {
                                                                                    if (cov.switchAction.targetView) setMannequinViewMode(cov.switchAction.targetView);
                                                                                    if (cov.switchAction.targetPerspective) setMannequinPerspective(cov.switchAction.targetPerspective);
                                                                                    setSelectedMeasureCode(code);
                                                                                } else {
                                                                                    handleOpenMeasureGuide(code);
                                                                                }
                                                                            }}
                                                                            activeOpacity={0.8}
                                                                            accessibilityRole="button"
                                                                            accessibilityLabel={`Ver guía de ${name}`}
                                                                        >
                                                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                                                <Text style={styles.measureCardName}>{name}</Text>
                                                                                <Text style={styles.measureCardCode}>
                                                                                    {code}{workshopDef && rawVal === undefined ? ' · taller base' : ''}
                                                                                </Text>
                                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                                                    <View style={styles.measureCardCellAction}>
                                                                                        <IconInfoGuide size={10} color="#A78350" />
                                                                                        <Text style={styles.measureCardActionText}>Ver guía ↗</Text>
                                                                                    </View>
                                                                                    {(() => {
                                                                                        const cov = getMeasurementCoverageDetail(code, mannequinViewMode, mannequinPerspective);
                                                                                        return (
                                                                                            <View style={[styles.coveragePill, { backgroundColor: cov.badgeBg, borderColor: cov.badgeColor + '55' }]}>
                                                                                                <Text style={[styles.coveragePillText, { color: cov.badgeColor }]}>{cov.badgeLabel}</Text>
                                                                                            </View>
                                                                                        );
                                                                                    })()}
                                                                                </View>
                                                                            </View>
                                                                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                                                {hasVal ? (
                                                                                    <>
                                                                                        <Text style={styles.measureCardValCm}>
                                                                                            {isSmallMm ? `${Math.round(valMm)} mm` : `${cmVal} cm`}
                                                                                        </Text>
                                                                                        {showMmEquivalencies && (
                                                                                            <Text style={styles.measureCardValMm}>
                                                                                                {isSmallMm ? `(${cmVal} cm)` : `(${Math.round(valMm)} mm)`}
                                                                                            </Text>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <Text style={styles.measureCardValMissing}>No registrada</Text>
                                                                                )}
                                                                            </View>
                                                                        </TouchableOpacity>
                                                                    );
                                                                })}
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </View>
                    );
                })()}
            </View>
        </View>
    );
};
