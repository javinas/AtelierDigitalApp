// ==============================================================================
// ATELIER DIGITAL — ESPACIO DE TRABAJO COMPARTIDO: CLIENTAS Y ANATOMÍA
// Archivo: src/components/pattern/AtelierClientAnatomyWorkspace.tsx
// ==============================================================================
// Provee la experiencia unificada y canónica de gestión de clientas, historial
// de sesiones, maniquí anatómico maestro y desglose exhaustivo de medidas.
// Compartido entre el Flujo A (Medidas) y el Flujo B (Patronaje Directo).
// ==============================================================================

import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Client } from '../../types/client';
import { MeasurementSession } from '../../types/pattern/measurement';
import { PatternExecution, PatternTemplate } from '../../types/pattern/pattern';
import { Creation } from '../../types/creation';
import { AtelierClientSelector } from './AtelierClientSelector';
import { AtelierGrandAnatomicalMannequin } from './AtelierGrandAnatomicalMannequin';
import { IconBodyRuler, IconInfoGuide, getCategoryCoutureIcon } from './AtelierCoutureIcons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { roundTo } from '../../engine/pattern/geometry/geometry2d';
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

export interface AtelierClientAnatomyWorkspaceProps {
    clients: Client[];
    selectedClient: Client | null;
    onSelectClient: (client: Client) => void;
    loadingClients?: boolean;
    sessions: MeasurementSession[];
    selectedSession: MeasurementSession | null;
    onSelectSession: (session: MeasurementSession) => void;
    activeMeasurementsMm: Record<string, number>;
    executionHistory: PatternExecution[];
    clientCreations?: Creation[];
    isMannequinCollapsed: boolean;
    onToggleMannequinCollapse: () => void;
    onRectifySession: (session: MeasurementSession) => void;
    onNewSession: () => void;
    selectedMeasureCode: string | null;
    onSelectMeasureCode: (code: string | null) => void;
    mannequinViewMode: 'torso' | 'full_body';
    onViewModeChange: (mode: 'torso' | 'full_body') => void;
    mannequinPerspective: 'front' | 'back';
    onPerspectiveChange: (perspective: 'front' | 'back') => void;
    selectedTemplate?: PatternTemplate | null;
    templateRequirementsCheck?: { present: string[]; missing: string[]; valid?: boolean };
    showMmEquivalencies: boolean;
    onToggleShowMm: () => void;
    isMeasuresTableCollapsed: boolean;
    onToggleCollapseMeasuresTable: () => void;
    expandedMeasureCategories: Record<string, boolean>;
    onToggleMeasureCategory: (catId: string) => void;
    onOpenMeasureGuide: (code: string) => void;
    onViewDerivedPatterns: (sessionId: string) => void;
    isExportMenuOpen: boolean;
    onToggleExportMenu: () => void;
    onCloseExportMenu: () => void;
    formatDateFn?: (dateStr?: string | null) => string;
}

const defaultFormatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return new Date(y, m, d).toLocaleDateString();
        }
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return String(dateStr);
    }
};

export function AtelierClientAnatomyWorkspace({
    clients,
    selectedClient,
    onSelectClient,
    loadingClients = false,
    sessions,
    selectedSession,
    onSelectSession,
    activeMeasurementsMm,
    executionHistory,
    clientCreations = [],
    isMannequinCollapsed,
    onToggleMannequinCollapse,
    onRectifySession,
    onNewSession,
    selectedMeasureCode,
    onSelectMeasureCode,
    mannequinViewMode,
    onViewModeChange,
    mannequinPerspective,
    onPerspectiveChange,
    selectedTemplate,
    templateRequirementsCheck,
    showMmEquivalencies,
    onToggleShowMm,
    isMeasuresTableCollapsed,
    onToggleCollapseMeasuresTable,
    expandedMeasureCategories,
    onToggleMeasureCategory,
    onOpenMeasureGuide,
    onViewDerivedPatterns,
    isExportMenuOpen,
    onToggleExportMenu,
    onCloseExportMenu,
    formatDateFn = defaultFormatDate,
}: AtelierClientAnatomyWorkspaceProps) {
    const activeSessionStats = analyzeSessionMeasurements(activeMeasurementsMm);
    const latestSessionStats = analyzeSessionMeasurements(sessions[0]?.values);

    return (
        <View style={workspaceStyles.container}>
            {/* 1. ÁREA SUPERIOR: CLIENTA/SESIONES (IZQ) Y MANIQUÍ ANATÓMICO MAESTRO (DER) */}
            <View style={workspaceStyles.topLayout}>
                {/* COLUMNA IZQUIERDA: CLIENTA Y SESIONES */}
                <View style={workspaceStyles.leftCol}>
                    {/* SECCIÓN A: Selector de Clientas */}
                    <AtelierClientSelector
                        clients={clients}
                        selectedClient={selectedClient}
                        onSelectClient={onSelectClient}
                        loading={loadingClients}
                        showSelectedSummary={false}
                    />

                    {/* SECCIÓN B: Resumen de la Clienta Seleccionada */}
                    {selectedClient && (
                        <View style={workspaceStyles.clientSingleSummaryCard}>
                            <View style={workspaceStyles.clientSingleSummaryHeader}>
                                <View style={workspaceStyles.clientSummaryAvatar}>
                                    <Text style={workspaceStyles.clientSummaryAvatarText}>
                                        {selectedClient.full_name.slice(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={workspaceStyles.clientSingleSummaryEyebrow}>ANATOMÍA DE LA SESIÓN</Text>
                                    <Text style={workspaceStyles.clientSingleSummaryName}>{selectedClient.full_name.toUpperCase()}</Text>
                                    <View style={workspaceStyles.clientSingleStatusBadge}>
                                        <Text style={workspaceStyles.clientSingleStatusText}>
                                            {selectedClient.status ? selectedClient.status.toUpperCase() : 'ACTIVA'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={workspaceStyles.clientSingleDataGrid}>
                                <View style={workspaceStyles.clientSingleDataRow}>
                                    <Text style={workspaceStyles.clientSingleDataLabel}>Sesiones de medidas:</Text>
                                    <Text style={workspaceStyles.clientSingleDataValue}>{sessions.length}</Text>
                                </View>
                                <View style={workspaceStyles.clientSingleDataRow}>
                                    <Text style={workspaceStyles.clientSingleDataLabel}>Última sesión:</Text>
                                    <Text style={workspaceStyles.clientSingleDataValue}>
                                        {sessions[0]?.session_date ? formatDateFn(sessions[0].session_date) : 'Sin registro'}
                                    </Text>
                                </View>
                                <View style={workspaceStyles.clientSingleDataRow}>
                                    <Text style={workspaceStyles.clientSingleDataLabel}>Medidas corporales registradas:</Text>
                                    <Text style={workspaceStyles.clientSingleDataValue}>
                                        {latestSessionStats.bodyCount} de {latestSessionStats.totalApplicableBody}
                                    </Text>
                                </View>
                                <View style={workspaceStyles.clientSingleDataRow}>
                                    <Text style={workspaceStyles.clientSingleDataLabel}>Medidas de diseño registradas:</Text>
                                    <Text style={workspaceStyles.clientSingleDataValue}>
                                        {latestSessionStats.designCount}
                                    </Text>
                                </View>
                                <View style={workspaceStyles.clientSingleDataRow}>
                                    <Text style={workspaceStyles.clientSingleDataLabel}>Completitud de la sesión:</Text>
                                    <Text style={workspaceStyles.clientSingleDataValue}>
                                        {latestSessionStats.bodyCompletionPct}%
                                    </Text>
                                </View>
                            </View>

                            <View style={workspaceStyles.clientSingleActionsRow}>
                                <TouchableOpacity
                                    style={workspaceStyles.clientSingleActionBtn}
                                    onPress={() => {
                                        if (sessions[0]) onSelectSession(sessions[0]);
                                        if (isMeasuresTableCollapsed) onToggleCollapseMeasuresTable();
                                        if (isMannequinCollapsed) onToggleMannequinCollapse();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={workspaceStyles.clientSingleActionBtnText}>👁️ Ver medidas</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={workspaceStyles.clientSingleActionBtnExport}
                                    onPress={() => {
                                        if (sessions[0]) onSelectSession(sessions[0]);
                                        if (isMeasuresTableCollapsed) onToggleCollapseMeasuresTable();
                                        onToggleExportMenu();
                                    }}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Exportar expediente de medidas"
                                >
                                    <Text style={workspaceStyles.clientSingleActionBtnExportText}>✦ Exportar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[workspaceStyles.clientSingleActionBtn, workspaceStyles.clientSingleActionBtnPrimary]}
                                    onPress={onNewSession}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[workspaceStyles.clientSingleActionBtnText, workspaceStyles.clientSingleActionBtnPrimaryText]}>
                                        + Nueva sesión
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* SECCIÓN C: Historial de Sesiones */}
                    {selectedClient && (
                        <View style={workspaceStyles.sessionsHistorySection}>
                            <View style={workspaceStyles.sessionsHistoryHeaderRow}>
                                <Text style={workspaceStyles.sessionsHistoryTitle}>
                                    SESIONES DE MEDIDAS · {sessions.length}
                                </Text>
                            </View>

                            {sessions.length === 0 ? (
                                <View style={workspaceStyles.emptySessionsCard}>
                                    <Text style={workspaceStyles.emptySessionsText}>
                                        Esta clienta aún no tiene sesiones anatómicas registradas.
                                    </Text>
                                    <TouchableOpacity
                                        style={workspaceStyles.createFirstSessionBtn}
                                        onPress={onNewSession}
                                    >
                                        <Text style={workspaceStyles.createFirstSessionBtnText}>+ Tomar Primera Sesión</Text>
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
                                                workspaceStyles.workflowSessionCardCompact,
                                                isSelected && workspaceStyles.sessionCardActive,
                                            ]}
                                        >
                                            <View style={workspaceStyles.sessionCardTop}>
                                                <Text style={workspaceStyles.sessionCompactTitle}>
                                                    Sesión v{s.version_number} · {formatDateFn(s.session_date)}
                                                </Text>
                                                <View
                                                    style={[
                                                        workspaceStyles.sessionStatusPill,
                                                        s.status === 'completed'
                                                            ? workspaceStyles.sessionStatusCompleted
                                                            : s.status === 'verified'
                                                            ? workspaceStyles.sessionStatusCompleted
                                                            : workspaceStyles.sessionStatusDraft,
                                                    ]}
                                                >
                                                    <Text style={workspaceStyles.sessionStatusPillText}>
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

                                            <Text style={workspaceStyles.sessionCompactSubtitle}>
                                                {sStats.totalRegistered} medidas registradas ({sStats.bodyCount}/{sStats.totalApplicableBody} corporales · {sStats.bodyCompletionPct}% completitud)
                                            </Text>

                                            <View style={workspaceStyles.sessionCompactActionsRow}>
                                                <TouchableOpacity
                                                    style={[workspaceStyles.sessionActionBtnCompact, isSelected && workspaceStyles.sessionActionBtnActive]}
                                                    onPress={() => {
                                                        onSelectSession(s);
                                                        if (isMeasuresTableCollapsed) onToggleCollapseMeasuresTable();
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[workspaceStyles.sessionActionBtnText, isSelected && workspaceStyles.sessionActionBtnTextActive]}>
                                                        Ver medidas
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={workspaceStyles.sessionActionBtnCompact}
                                                    onPress={() => onRectifySession(s)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={workspaceStyles.sessionActionBtnText}>
                                                        Rectificar
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={workspaceStyles.sessionActionBtnCompact}
                                                    onPress={() => onViewDerivedPatterns(s.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={workspaceStyles.sessionActionBtnText}>
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
                <View style={workspaceStyles.rightCol}>
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
                        onToggleCollapse={onToggleMannequinCollapse}
                        onRectify={() => {
                            if (selectedSession) onRectifySession(selectedSession);
                        }}
                        onNewSession={onNewSession}
                        selectedMeasureCode={selectedMeasureCode}
                        onSelectMeasureCode={onSelectMeasureCode}
                        viewMode={mannequinViewMode}
                        onViewModeChange={onViewModeChange}
                        perspective={mannequinPerspective}
                        onPerspectiveChange={onPerspectiveChange}
                        onOpenExport={onToggleExportMenu}
                    />
                </View>
            </View>

            {/* 2. ÁREA INFERIOR: SECCIÓN CENTRADA Y DE ANCHO COMPLETO DE MEDIDAS DE LA SESIÓN */}
            <View style={workspaceStyles.fullWidthSection}>
                <View style={workspaceStyles.detailedMeasuresTableCard}>
                    {/* Encabezado */}
                    <View style={workspaceStyles.detailedMeasuresHeaderRow}>
                        <View style={{ flex: 1, minWidth: 260 }}>
                            <Text style={workspaceStyles.detailedMeasuresTitle}>
                                MEDIDAS DE LA SESIÓN
                            </Text>
                            <Text style={workspaceStyles.detailedMeasuresSub}>
                                {selectedClient ? selectedClient.full_name : 'Clienta'} · Sesión v{selectedSession?.version_number || 1} · {selectedSession?.session_date ? formatDateFn(selectedSession.session_date) : 'Sin fecha'}
                            </Text>
                            <Text style={workspaceStyles.detailedMeasuresCount}>
                                {activeSessionStats.totalRegistered} medidas registradas en total
                            </Text>
                        </View>

                        <View style={workspaceStyles.detailedMeasuresControlsRow}>
                            {/* Menú Desplegable de Exportación */}
                            <View style={{ position: 'relative', zIndex: 1002 }}>
                                <TouchableOpacity
                                    style={[workspaceStyles.detailedMeasuresBtn, workspaceStyles.exportMenuBtn]}
                                    onPress={onToggleExportMenu}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Exportar medidas, maniquíes y cobertura"
                                >
                                    <Text style={workspaceStyles.exportMenuBtnText}>✦ Exportar ⌄</Text>
                                </TouchableOpacity>

                                {isExportMenuOpen && (
                                    <>
                                        <TouchableOpacity
                                            style={workspaceStyles.exportMenuBackdrop}
                                            onPress={onCloseExportMenu}
                                            activeOpacity={1}
                                            accessibilityLabel="Cerrar menú de exportación"
                                        />
                                        <View style={workspaceStyles.exportDropdownMenu}>
                                            <TouchableOpacity
                                                style={workspaceStyles.exportDropdownItem}
                                                onPress={() => {
                                                    onCloseExportMenu();
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
                                                <Text style={workspaceStyles.exportItemIcon}>📄</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={workspaceStyles.exportItemTitle}>Ficha Anatómica (PDF)</Text>
                                                    <Text style={workspaceStyles.exportItemSub}>Dossier A4 completo con cotas y tablas</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={workspaceStyles.exportDropdownItem}
                                                onPress={() => {
                                                    onCloseExportMenu();
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
                                                <Text style={workspaceStyles.exportItemIcon}>📐</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={workspaceStyles.exportItemTitle}>Maniquí Anotado (SVG)</Text>
                                                    <Text style={workspaceStyles.exportItemSub}>Gráfico vectorial 1:1 de la vista activa</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={workspaceStyles.exportDropdownItem}
                                                onPress={() => {
                                                    onCloseExportMenu();
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
                                                <Text style={workspaceStyles.exportItemIcon}>📊</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={workspaceStyles.exportItemTitle}>Listado de Medidas (CSV)</Text>
                                                    <Text style={workspaceStyles.exportItemSub}>Valores y estado sin ceros ficticios</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={workspaceStyles.exportDropdownItem}
                                                onPress={() => {
                                                    onCloseExportMenu();
                                                    const csv = exportCoverageMatrixCsv();
                                                    downloadFileInBrowser(csv, 'Matriz_Cobertura_Catalogo_Antropometrico.csv', 'text/csv');
                                                }}
                                            >
                                                <Text style={workspaceStyles.exportItemIcon}>🗺️</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={workspaceStyles.exportItemTitle}>Matriz de Cobertura (CSV)</Text>
                                                    <Text style={workspaceStyles.exportItemSub}>Diagnóstico exhaustivo de todas las medidas</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>

                            <TouchableOpacity
                                style={workspaceStyles.detailedMeasuresBtn}
                                onPress={onToggleShowMm}
                                activeOpacity={0.8}
                            >
                                <Text style={workspaceStyles.detailedMeasuresBtnText}>
                                    {showMmEquivalencies ? 'Ocultar equivalencias en mm' : 'Mostrar equivalencias en mm'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={workspaceStyles.detailedMeasuresBtn}
                                onPress={onToggleCollapseMeasuresTable}
                                activeOpacity={0.8}
                            >
                                <Text style={workspaceStyles.detailedMeasuresBtnText}>
                                    {isMeasuresTableCollapsed ? 'Mostrar medidas' : 'Ocultar medidas'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Métricas de Clasificación */}
                    <View style={workspaceStyles.catalogMetricsStrip}>
                        <View style={workspaceStyles.catalogMetricCell}>
                            <Text style={workspaceStyles.catalogMetricLabel}>Medidas corporales registradas</Text>
                            <Text style={workspaceStyles.catalogMetricValue}>
                                {activeSessionStats.bodyCount} de {activeSessionStats.totalApplicableBody}
                            </Text>
                        </View>

                        <View style={workspaceStyles.catalogMetricDivider} />

                        <View style={workspaceStyles.catalogMetricCell}>
                            <Text style={workspaceStyles.catalogMetricLabel}>Medidas de diseño registradas</Text>
                            <Text style={workspaceStyles.catalogMetricValue}>
                                {activeSessionStats.designCount}
                            </Text>
                        </View>

                        <View style={workspaceStyles.catalogMetricDivider} />

                        <View style={workspaceStyles.catalogMetricCell}>
                            <Text style={workspaceStyles.catalogMetricLabel}>Parámetros de taller</Text>
                            <Text style={workspaceStyles.catalogMetricValue}>
                                {activeSessionStats.workshopCount > 0 ? `${activeSessionStats.workshopCount} registrados` : `${WORKSHOP_PARAMETER_CODES.length} predeterminados`}
                            </Text>
                        </View>

                        <View style={workspaceStyles.catalogMetricDivider} />

                        <View style={workspaceStyles.catalogMetricCell}>
                            <Text style={workspaceStyles.catalogMetricLabel}>Cotas representadas en el maniquí</Text>
                            <Text style={workspaceStyles.catalogMetricValue}>
                                {TOTAL_MANNEQUIN_COTAS} cotas
                            </Text>
                        </View>

                        <View style={workspaceStyles.catalogMetricDivider} />

                        <View style={workspaceStyles.catalogMetricCell}>
                            <Text style={workspaceStyles.catalogMetricLabel}>Completitud de la sesión</Text>
                            <Text style={workspaceStyles.catalogMetricValue}>
                                {activeSessionStats.bodyCompletionPct}%
                            </Text>
                        </View>

                        <View style={workspaceStyles.catalogMetricDivider} />

                        <View style={workspaceStyles.catalogMetricCell}>
                            <Text style={workspaceStyles.catalogMetricLabel}>Medidas requeridas para esta plantilla</Text>
                            <Text style={workspaceStyles.catalogMetricValue}>
                                {selectedTemplate && templateRequirementsCheck
                                    ? `${templateRequirementsCheck.present.length}/${selectedTemplate.required_measurements.length} cubiertas`
                                    : 'Sin plantilla asignada'}
                            </Text>
                        </View>
                    </View>

                    {!isMeasuresTableCollapsed && (
                        <>
                            {/* Resumen de Medidas Principales (Hero Metrics) */}
                            <View style={workspaceStyles.measuresHeroContainer}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <IconBodyRuler size={13} color="#996B1F" />
                                    <Text style={workspaceStyles.measuresHeroEyebrow}>MEDIDAS PRINCIPALES DEL CUERPO (CLIC PARA ABRIR GUÍA)</Text>
                                </View>
                                <View style={workspaceStyles.measuresHeroRow}>
                                    <TouchableOpacity
                                        style={[
                                            workspaceStyles.measuresHeroCard,
                                            selectedMeasureCode === 'contorno_busto' && workspaceStyles.measuresHeroCardSelected,
                                        ]}
                                        onPress={() => onOpenMeasureGuide('contorno_busto')}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ver guía de Contorno de Busto"
                                    >
                                        <Text style={workspaceStyles.measuresHeroLabel}>BUSTO</Text>
                                        <Text style={workspaceStyles.measuresHeroVal}>
                                            {activeMeasurementsMm.contorno_busto ? `${roundTo(activeMeasurementsMm.contorno_busto / 10, 1)} cm` : '—'}
                                        </Text>
                                        {showMmEquivalencies && activeMeasurementsMm.contorno_busto ? (
                                            <Text style={workspaceStyles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_busto)} mm</Text>
                                        ) : null}
                                        <View style={workspaceStyles.measuresHeroActionRow}>
                                            <IconInfoGuide size={11} color="#A78350" />
                                            <Text style={workspaceStyles.measuresHeroActionText}>Ver guía ↗</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            workspaceStyles.measuresHeroCard,
                                            selectedMeasureCode === 'contorno_cintura' && workspaceStyles.measuresHeroCardSelected,
                                        ]}
                                        onPress={() => onOpenMeasureGuide('contorno_cintura')}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ver guía de Contorno de Cintura"
                                    >
                                        <Text style={workspaceStyles.measuresHeroLabel}>CINTURA</Text>
                                        <Text style={workspaceStyles.measuresHeroVal}>
                                            {activeMeasurementsMm.contorno_cintura ? `${roundTo(activeMeasurementsMm.contorno_cintura / 10, 1)} cm` : '—'}
                                        </Text>
                                        {showMmEquivalencies && activeMeasurementsMm.contorno_cintura ? (
                                            <Text style={workspaceStyles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_cintura)} mm</Text>
                                        ) : null}
                                        <View style={workspaceStyles.measuresHeroActionRow}>
                                            <IconInfoGuide size={11} color="#A78350" />
                                            <Text style={workspaceStyles.measuresHeroActionText}>Ver guía ↗</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            workspaceStyles.measuresHeroCard,
                                            selectedMeasureCode === 'contorno_cadera' && workspaceStyles.measuresHeroCardSelected,
                                        ]}
                                        onPress={() => onOpenMeasureGuide('contorno_cadera')}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ver guía de Contorno de Cadera"
                                    >
                                        <Text style={workspaceStyles.measuresHeroLabel}>CADERA</Text>
                                        <Text style={workspaceStyles.measuresHeroVal}>
                                            {activeMeasurementsMm.contorno_cadera ? `${roundTo(activeMeasurementsMm.contorno_cadera / 10, 1)} cm` : '—'}
                                        </Text>
                                        {showMmEquivalencies && activeMeasurementsMm.contorno_cadera ? (
                                            <Text style={workspaceStyles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_cadera)} mm</Text>
                                        ) : null}
                                        <View style={workspaceStyles.measuresHeroActionRow}>
                                            <IconInfoGuide size={11} color="#A78350" />
                                            <Text style={workspaceStyles.measuresHeroActionText}>Ver guía ↗</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                {/* Medidas Secundarias de Referencia */}
                                <View style={workspaceStyles.measuresSecondaryGrid}>
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
                                                    workspaceStyles.measuresSecondaryItem,
                                                    isSelected && workspaceStyles.measuresSecondaryItemSelected,
                                                ]}
                                                onPress={() => {
                                                    const cov = getMeasurementCoverageDetail(item.code, mannequinViewMode, mannequinPerspective);
                                                    if (cov.status === 'other_view' && cov.switchAction) {
                                                        if (cov.switchAction.targetView) onViewModeChange(cov.switchAction.targetView);
                                                        if (cov.switchAction.targetPerspective) onPerspectiveChange(cov.switchAction.targetPerspective);
                                                        onSelectMeasureCode(item.code);
                                                    } else {
                                                        onOpenMeasureGuide(item.code);
                                                    }
                                                }}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Ver guía de ${item.label}`}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={workspaceStyles.measuresSecondaryLabel}>{item.label}</Text>
                                                    <Text style={{ fontSize: 9, color: '#A78350' }}>↗</Text>
                                                </View>
                                                {(() => {
                                                    const cov = getMeasurementCoverageDetail(item.code, mannequinViewMode, mannequinPerspective);
                                                    return (
                                                        <View style={[workspaceStyles.coveragePill, { backgroundColor: cov.badgeBg, borderColor: cov.badgeColor + '55', marginTop: 3, marginBottom: 3 }]}>
                                                            <Text style={[workspaceStyles.coveragePillText, { color: cov.badgeColor }]}>{cov.badgeLabel}</Text>
                                                        </View>
                                                    );
                                                })()}
                                                <Text style={[workspaceStyles.measuresSecondaryVal, !hasVal && workspaceStyles.measuresSecondaryValMissing]}>
                                                    {hasVal ? `${roundTo(val / 10, 1)} cm${showMmEquivalencies ? ` (${Math.round(val)} mm)` : ''}` : 'No registrada'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Acordeones por Categoría */}
                            <View style={workspaceStyles.measureAccordionsContainer}>
                                {MEASURE_CATEGORIES_DEFINITION.map((cat: MeasureCategoryDefinition, idx: number) => {
                                    const prevCat = idx > 0 ? MEASURE_CATEGORIES_DEFINITION[idx - 1] : null;
                                    const isNewSection = !prevCat || prevCat.groupSection !== cat.groupSection;
                                    const isExpanded = expandedMeasureCategories[cat.id] ?? false;
                                    const isWorkshop = cat.groupSection === 'Parámetros de taller';
                                    const registeredCount = cat.codes.filter((c: string) => {
                                        const val = activeMeasurementsMm[c];
                                        return (typeof val === 'number' && Number.isFinite(val) && val > 0) || (isWorkshop && WORKSHOP_PARAMETER_DEFINITIONS[c] !== undefined);
                                    }).length;

                                    return (
                                        <View key={cat.id}>
                                            {isNewSection && (
                                                <View style={workspaceStyles.measureCategorySectionBanner}>
                                                    <Text style={workspaceStyles.measureCategorySectionBadge}>
                                                        {cat.groupSection.toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={workspaceStyles.measureAccordionCard}>
                                                <TouchableOpacity
                                                    style={workspaceStyles.measureAccordionHeader}
                                                    onPress={() => onToggleMeasureCategory(cat.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        {getCategoryCoutureIcon(cat.id, { size: 16, color: colors.champagneGold })}
                                                        <Text style={workspaceStyles.measureAccordionTitle}>{cat.title}</Text>
                                                        <View style={workspaceStyles.measureAccordionCountBadge}>
                                                            <Text style={workspaceStyles.measureAccordionCountText}>
                                                                {registeredCount} / {cat.codes.length}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={workspaceStyles.measureAccordionChevron}>
                                                        {isExpanded ? '⌃' : '⌄'}
                                                    </Text>
                                                </TouchableOpacity>

                                                {isExpanded && (
                                                    <View style={workspaceStyles.measureAccordionBody}>
                                                        {cat.codes.map((code: string) => {
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
                                                                        workspaceStyles.measureCardCell,
                                                                        !hasVal && workspaceStyles.measureCardCellEmpty,
                                                                        isSelected && workspaceStyles.measureCardCellSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        const cov = getMeasurementCoverageDetail(code, mannequinViewMode, mannequinPerspective);
                                                                        if (cov.status === 'other_view' && cov.switchAction) {
                                                                            if (cov.switchAction.targetView) onViewModeChange(cov.switchAction.targetView);
                                                                            if (cov.switchAction.targetPerspective) onPerspectiveChange(cov.switchAction.targetPerspective);
                                                                            onSelectMeasureCode(code);
                                                                        } else {
                                                                            onOpenMeasureGuide(code);
                                                                        }
                                                                    }}
                                                                    activeOpacity={0.8}
                                                                    accessibilityRole="button"
                                                                    accessibilityLabel={`Ver guía de ${name}`}
                                                                >
                                                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                                                        <Text style={workspaceStyles.measureCardName}>{name}</Text>
                                                                        <Text style={workspaceStyles.measureCardCode}>
                                                                            {code}{workshopDef && rawVal === undefined ? ' · taller base' : ''}
                                                                        </Text>
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                                            <View style={workspaceStyles.measureCardCellAction}>
                                                                                <IconInfoGuide size={10} color="#A78350" />
                                                                                <Text style={workspaceStyles.measureCardActionText}>Ver guía ↗</Text>
                                                                            </View>
                                                                            {(() => {
                                                                                const cov = getMeasurementCoverageDetail(code, mannequinViewMode, mannequinPerspective);
                                                                                return (
                                                                                    <View style={[workspaceStyles.coveragePill, { backgroundColor: cov.badgeBg, borderColor: cov.badgeColor + '55' }]}>
                                                                                        <Text style={[workspaceStyles.coveragePillText, { color: cov.badgeColor }]}>{cov.badgeLabel}</Text>
                                                                                    </View>
                                                                                );
                                                                            })()}
                                                                        </View>
                                                                    </View>
                                                                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                                        {hasVal ? (
                                                                            <>
                                                                                <Text style={workspaceStyles.measureCardValCm}>
                                                                                    {isSmallMm ? `${Math.round(valMm)} mm` : `${cmVal} cm`}
                                                                                </Text>
                                                                                {showMmEquivalencies && (
                                                                                    <Text style={workspaceStyles.measureCardValMm}>
                                                                                        {isSmallMm ? `(${cmVal} cm)` : `(${Math.round(valMm)} mm)`}
                                                                                    </Text>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <Text style={workspaceStyles.measureCardValMissing}>No registrada</Text>
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
            </View>
        </View>
    );
}

const workspaceStyles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 1600,
        alignSelf: 'center',
        paddingBottom: 24,
        gap: 24,
    },
    topLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        width: '100%',
        alignItems: 'flex-start',
    },
    leftCol: {
        flex: 1,
        minWidth: 320,
        maxWidth: 380,
        gap: 16,
    },
    rightCol: {
        flex: 2,
        minWidth: 500,
        gap: 16,
    },
    clientSingleSummaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        gap: 12,
    },
    clientSingleSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    clientSummaryAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.atelierBlack,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    clientSummaryAvatarText: {
        color: colors.champagneGold,
        fontWeight: '700',
        fontSize: 13,
    },
    clientSingleSummaryEyebrow: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#996B1F',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    clientSingleSummaryName: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    clientSingleStatusBadge: {
        backgroundColor: '#EDF5EE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#D3E8D6',
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    clientSingleStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2B5E35',
        letterSpacing: 0.5,
    },
    clientSingleDataGrid: {
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#EFE7DA',
        gap: 6,
    },
    clientSingleDataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clientSingleDataLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    clientSingleDataValue: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    clientSingleActionsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingTop: 4,
    },
    clientSingleActionBtn: {
        flex: 1,
        backgroundColor: '#FAF7F2',
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E0D6C3',
        alignItems: 'center',
    },
    clientSingleActionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    clientSingleActionBtnExport: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FAF7F2',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientSingleActionBtnExportText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#996B1F',
    },
    clientSingleActionBtnPrimary: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    clientSingleActionBtnPrimaryText: {
        color: colors.ivoryWarm,
        fontWeight: '700',
    },
    sessionsHistorySection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        gap: 12,
    },
    sessionsHistoryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionsHistoryTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: '#766B62',
    },
    emptySessionsCard: {
        padding: 16,
        alignItems: 'center',
        gap: 10,
    },
    emptySessionsText: {
        fontSize: 12,
        color: '#766B62',
        textAlign: 'center',
    },
    createFirstSessionBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    createFirstSessionBtnText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
    },
    workflowSessionCardCompact: {
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EFE7DA',
        gap: 6,
    },
    sessionCardActive: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF9',
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
    },
    sessionCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionCompactTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionStatusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    sessionStatusCompleted: {
        backgroundColor: '#EDF5EE',
    },
    sessionStatusDraft: {
        backgroundColor: '#FFF8E7',
    },
    sessionStatusPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#2B5E35',
    },
    sessionCompactSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    sessionCompactActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    sessionActionBtnCompact: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#E0D6C3',
    },
    sessionActionBtnActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    sessionActionBtnText: {
        fontSize: 10,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    sessionActionBtnTextActive: {
        color: colors.ivoryWarm,
        fontWeight: '700',
    },
    fullWidthSection: {
        width: '100%',
        maxWidth: 1600,
        alignSelf: 'center',
        marginTop: 16,
        position: 'relative',
        zIndex: 50,
    },
    detailedMeasuresTableCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        gap: 16,
    },
    detailedMeasuresHeaderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    detailedMeasuresTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    detailedMeasuresSub: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    detailedMeasuresCount: {
        fontSize: 11,
        color: '#996B1F',
        fontWeight: '600',
        marginTop: 2,
    },
    detailedMeasuresControlsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    detailedMeasuresBtn: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E0D6C3',
    },
    detailedMeasuresBtnText: {
        fontSize: 11,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    exportMenuBtn: {
        backgroundColor: '#FAF7F2',
        borderColor: colors.champagneGold,
    },
    exportMenuBtnText: {
        color: '#996B1F',
        fontWeight: '700',
        fontSize: 11,
    },
    exportMenuBackdrop: {
        position: 'absolute',
        top: -500,
        left: -1000,
        right: -1000,
        bottom: -2000,
        zIndex: 1000,
    },
    exportDropdownMenu: {
        position: 'absolute',
        top: 36,
        right: 0,
        width: 250,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0D6C3',
        padding: 6,
        zIndex: 1001,
        ...Platform.select({
            web: {
                boxShadow: '0 8px 24px rgba(44, 39, 32, 0.15)',
            },
            default: {
                elevation: 8,
            },
        }),
    },
    exportDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        gap: 8,
    },
    exportItemIcon: {
        fontSize: 16,
    },
    exportItemTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    exportItemSub: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    catalogMetricsStrip: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#EFE7DA',
        gap: 8,
    },
    catalogMetricCell: {
        flex: 1,
        minWidth: 140,
    },
    catalogMetricLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    catalogMetricValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    catalogMetricDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#EFE7DA',
    },
    measuresHeroContainer: {
        gap: 10,
        paddingVertical: 4,
    },
    measuresHeroEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#996B1F',
    },
    measuresHeroRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    measuresHeroCard: {
        flex: 1,
        minWidth: 160,
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8DFC8',
    },
    measuresHeroCardSelected: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF9',
        borderWidth: 2,
    },
    measuresHeroLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    measuresHeroVal: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    measuresHeroSubVal: {
        fontSize: 11,
        color: '#8A6A4A',
        marginTop: 2,
    },
    measuresHeroActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    measuresHeroActionText: {
        fontSize: 10,
        color: '#A78350',
        fontWeight: '600',
    },
    measuresSecondaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    measuresSecondaryItem: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        padding: 8,
        borderWidth: 1,
        borderColor: '#EFE7DA',
    },
    measuresSecondaryItemSelected: {
        borderColor: colors.champagneGold,
        borderWidth: 1.5,
    },
    measuresSecondaryLabel: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    measuresSecondaryVal: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    measuresSecondaryValMissing: {
        color: '#A0978E',
        fontWeight: 'normal',
        fontStyle: 'italic',
    },
    coveragePill: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    coveragePillText: {
        fontSize: 8,
        fontWeight: '700',
    },
    measureAccordionsContainer: {
        gap: 12,
        marginTop: 8,
    },
    measureCategorySectionBanner: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: '#FAF7F2',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        marginVertical: 4,
    },
    measureCategorySectionBadge: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#8A6A4A',
    },
    measureAccordionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E8DFC8',
        overflow: 'hidden',
    },
    measureAccordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FAF7F2',
    },
    measureAccordionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureAccordionCountBadge: {
        backgroundColor: '#EFE7DA',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 3,
    },
    measureAccordionCountText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    measureAccordionChevron: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    measureAccordionBody: {
        padding: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    measureCardCell: {
        flex: 1,
        minWidth: 200,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#FAF7F2',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EFE7DA',
    },
    measureCardCellEmpty: {
        opacity: 0.75,
    },
    measureCardCellSelected: {
        borderColor: colors.champagneGold,
        borderWidth: 1.5,
        backgroundColor: '#FFFDF9',
    },
    measureCardName: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureCardCode: {
        fontSize: 9,
        color: colors.textSecondary,
    },
    measureCardCellAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    measureCardActionText: {
        fontSize: 9,
        color: '#A78350',
        fontWeight: '600',
    },
    measureCardValCm: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureCardValMm: {
        fontSize: 10,
        color: '#8A6A4A',
    },
    measureCardValMissing: {
        fontSize: 11,
        color: '#A0978E',
        fontStyle: 'italic',
    },
});
