// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: PESTAÑA MESA CAD Y TRAZADO VECTORIAL
// Archivo: src/components/pattern/PatternStudioCadTab.tsx
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GARMENT_PACKAGES, TemplateMeasurementDiagnostic } from '../../engine/pattern/catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';
import { roundTo } from '../../engine/pattern/geometry/geometry2d';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { STANDARD_EASE_PROFILES } from '../../services/patternService';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { EaseProfile, GarmentDesignParameters } from '../../types/pattern/ease';
import { MeasurementSession } from '../../types/pattern/measurement';
import {
    GarmentType,
    PatternExecution,
    PatternStatus,
    PatternTemplate,
    PatternValidationResult,
} from '../../types/pattern/pattern';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { fetchExecutionLineage } from '../../services/patternService';
import { GARMENT_PIECE_COUNTS } from './creationFlow/CreationFlowViews';
import { styles } from './patternModuleStyles';
import { PatternPreviewCanvas } from './PatternPreviewCanvas';

const GARMENT_EDITORIAL_IMAGES: Record<string, any> = {
    skirt: require('../../../assets/garments/skirt.jpg'),
    bodice: require('../../../assets/garments/bodice.jpg'),
    pants: require('../../../assets/garments/pants.jpg'),
    dress: require('../../../assets/garments/dress.jpg'),
    sleeve: require('../../../assets/garments/sleeve.jpg'),
    blouse: require('../../../assets/garments/blouse.jpg'),
    shirt: require('../../../assets/garments/shirt.jpg'),
    corset: require('../../../assets/garments/corset.jpg'),
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

export interface PatternStudioCadTabProps {
    garmentType: GarmentType;
    selectedTemplate: PatternTemplate | null;
    templates: PatternTemplate[];
    handleSelectTemplate: (tpl: PatternTemplate) => void;
    activeWorkflow: 'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern';
    selectedEaseProfile: EaseProfile;
    setSelectedEaseProfile: (profile: EaseProfile) => void;
    setIsEaseManuallySetByUser: (manual: boolean) => void;
    designParams: GarmentDesignParameters;
    setDesignParams: React.Dispatch<React.SetStateAction<GarmentDesignParameters>>;
    handleApplySuggestedEase: () => void;
    activeMeasurementsMm: Record<string, number>;
    selectedSession: MeasurementSession | null;
    selectedClient: Client | null;
    selectedCreation: Creation | null;
    currentExecution: PatternExecution | null;
    geometryResult: PatternGeometryResult | null;
    isGenerating: boolean;
    handleGeneratePattern: () => void;
    patternStatus: PatternStatus;
    handleSendToFitting: () => void;
    handleApprovePattern: () => void;
    handleOpenComparison: (exec?: PatternExecution) => void;
    setIsAdjustmentsModalOpen: (open: boolean) => void;
    setIsProductionModalOpen: (open: boolean) => void;
    handleExportSvg: () => void;
    handleExportDxf: () => void;
    handlePrintTiled: () => void;
    lastExportInfo: any;
    setLastExportInfo: (info: any) => void;
    showChecklistDetails: boolean;
    setShowChecklistDetails: React.Dispatch<React.SetStateAction<boolean>>;
    showMeasurementsBreakdown: boolean;
    setShowMeasurementsBreakdown: React.Dispatch<React.SetStateAction<boolean>>;
    templateRequirementsCheck: any;
    templateMeasurementDiagnostic: TemplateMeasurementDiagnostic | null;
    validationChecklist: any;
    executionHistory: PatternExecution[];
    handleSelectExecution: (exec: PatternExecution) => void;
    setModalPreviousSession: (s: MeasurementSession | null) => void;
    setIsMeasurementModalOpen: (open: boolean) => void;
    setIsCustomMeasurementsOpen: (open: boolean) => void;
    setActiveStudioTab: (tab: 'garment' | 'cad' | 'fitting' | 'specifications' | 'history') => void;
    setActiveResultsTab?: (tab: 'fitting' | 'specifications' | 'history') => void;
    renderBankClosureSection: () => React.ReactNode;
    freePatternProfileLabel?: string;
    selectedReferenceProfileCode?: string | null;
}

export const PatternStudioCadTab: React.FC<PatternStudioCadTabProps> = ({
    garmentType,
    selectedTemplate,
    templates,
    handleSelectTemplate,
    activeWorkflow,
    selectedEaseProfile,
    setSelectedEaseProfile,
    setIsEaseManuallySetByUser,
    designParams,
    setDesignParams,
    handleApplySuggestedEase,
    activeMeasurementsMm,
    selectedSession,
    selectedClient,
    selectedCreation,
    currentExecution,
    geometryResult,
    isGenerating,
    handleGeneratePattern,
    patternStatus,
    handleSendToFitting,
    handleApprovePattern,
    handleOpenComparison,
    setIsAdjustmentsModalOpen,
    setIsProductionModalOpen,
    handleExportSvg,
    handleExportDxf,
    handlePrintTiled,
    lastExportInfo,
    setLastExportInfo,
    showChecklistDetails,
    setShowChecklistDetails,
    showMeasurementsBreakdown,
    setShowMeasurementsBreakdown,
    templateRequirementsCheck,
    templateMeasurementDiagnostic,
    validationChecklist,
    executionHistory,
    handleSelectExecution,
    setModalPreviousSession,
    setIsMeasurementModalOpen,
    setIsCustomMeasurementsOpen,
    setActiveStudioTab,
    setActiveResultsTab,
    renderBankClosureSection,
    freePatternProfileLabel,
    selectedReferenceProfileCode,
}) => {
    const { role } = useAuth();
    return (
                            <View style={styles.tabContentArea}>
                                {/* ============================================================================== */}
                                {/* PASO 3 & 4: ESPECIFICACIÓN TÉCNICA & TRAZADO (COMPACTO DE TALLER) */}
                                {/* ============================================================================== */}
                                <View style={styles.technicalConfigCard}>
                                    {/* Cabecera Editorial Visual Haute Couture */}
                                    <View style={styles.cadGarmentHeroRow}>
                                        {garmentType && GARMENT_EDITORIAL_IMAGES[garmentType] && (
                                            <View style={styles.cadGarmentImgWrap}>
                                                <Image
                                                    source={GARMENT_EDITORIAL_IMAGES[garmentType]}
                                                    style={styles.cadGarmentImg}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        )}
                                        <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
                                            <View style={styles.badgeRow}>
                                                <Text style={styles.stepBadge}>PASO 3 & 4</Text>
                                                <Text style={styles.stepperSubtitle}>ESPECIFICACIÓN & TRAZADO</Text>
                                            </View>
                                            <Text style={styles.cadGarmentTitle}>
                                                {GARMENT_PACKAGES[garmentType]?.name || garmentType}
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                                {selectedTemplate && (
                                                    <View style={styles.templateActivePill}>
                                                        <Text style={styles.templateActivePillText}>
                                                            Plantilla: {selectedTemplate.name} (v{selectedTemplate.version})
                                                        </Text>
                                                    </View>
                                                )}
                                                {garmentType && GARMENT_PACKAGES[garmentType] && (
                                                    <View style={styles.cadPiecesBadge}>
                                                        <Text style={styles.cadPiecesBadgeText}>
                                                            ✦ {GARMENT_PIECE_COUNTS[garmentType] || 'Alta costura'} piezas técnicas
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                            {/* Selector de plantilla y desahogos en fila compacta */}
                            <View style={styles.compactConfigGrid}>
                                {/* Selección de Plantilla */}
                                {templates.length > 0 && (
                                    <View style={styles.compactConfigCol}>
                                        <Text style={styles.paramsSubLabel}>Plantilla Metodológica Base:</Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                                        >
                                            {templates.map((tpl) => {
                                                const isSelected = selectedTemplate?.id === tpl.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={tpl.id}
                                                        style={[
                                                            styles.templateChip,
                                                            isSelected && styles.templateChipActive,
                                                        ]}
                                                        onPress={() => handleSelectTemplate(tpl)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.templateChipName,
                                                                isSelected && styles.templateChipNameActive,
                                                            ]}
                                                        >
                                                            {isSelected ? '✓ ' : ''}{tpl.name} v{tpl.version}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Perfil de Holgura */}
                                <View style={styles.compactConfigCol}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.paramsSubLabel}>Holgura Sugerida:</Text>
                                        {selectedTemplate?.default_ease_profile_code && selectedEaseProfile.code !== selectedTemplate.default_ease_profile_code && (
                                            <TouchableOpacity
                                                style={styles.applyEaseSmallBtn}
                                                onPress={handleApplySuggestedEase}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.applyEaseSmallBtnText}>✦ Sugerida ({selectedTemplate.default_ease_profile_code})</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.easeSelectorCompact}>
                                        {STANDARD_EASE_PROFILES.map((p) => (
                                            <TouchableOpacity
                                                key={p.code}
                                                style={[
                                                    styles.easeChipCompact,
                                                    selectedEaseProfile.code === p.code && styles.easeChipActive,
                                                ]}
                                                onPress={() => {
                                                    setSelectedEaseProfile(p);
                                                    setIsEaseManuallySetByUser(true);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.easeChipText,
                                                        selectedEaseProfile.code === p.code && styles.easeChipTextActive,
                                                    ]}
                                                >
                                                    {p.name.replace(' Alta Costura', '').replace(' (Recomendado)', '')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Margen de Costura & Silueta */}
                                <View style={styles.compactConfigRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.paramsSubLabelInline}>Margen:</Text>
                                        {[10, 15].map((sa) => (
                                            <TouchableOpacity
                                                key={sa}
                                                style={[
                                                    styles.silChipCompact,
                                                    designParams.seam_allowance_default_mm === sa && styles.silChipActive,
                                                ]}
                                                onPress={() =>
                                                    setDesignParams({
                                                        ...designParams,
                                                        seam_allowance_default_mm: sa,
                                                    })
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.silChipText,
                                                        designParams.seam_allowance_default_mm === sa && styles.silChipTextActive,
                                                    ]}
                                                >
                                                    {sa} mm
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {(garmentType === 'skirt' || garmentType === 'dress') && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.paramsSubLabelInline}>Silueta:</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.silChipCompact,
                                                    designParams.skirt_silhouette === 'straight' && styles.silChipActive,
                                                ]}
                                                onPress={() => setDesignParams({ ...designParams, skirt_silhouette: 'straight' })}
                                            >
                                                <Text
                                                    style={[
                                                        styles.silChipText,
                                                        designParams.skirt_silhouette === 'straight' && styles.silChipTextActive,
                                                    ]}
                                                >
                                                    Recta
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.silChipCompact,
                                                    designParams.skirt_silhouette === 'a_line' && styles.silChipActive,
                                                ]}
                                                onPress={() => setDesignParams({ ...designParams, skirt_silhouette: 'a_line' })}
                                            >
                                                <Text
                                                    style={[
                                                        styles.silChipText,
                                                        designParams.skirt_silhouette === 'a_line' && styles.silChipTextActive,
                                                    ]}
                                                >
                                                    Línea A (+60mm)
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* DIAGNÓSTICO ESTRUCTURADO PASO 3 & 4 (SECCIÓN 6) */}
                            <View style={styles.technicalDiagnosticBox}>
                                <View style={styles.diagnosticHeaderRow}>
                                    <Text style={styles.technicalDiagnosticHeader}>
                                        ✦ DIAGNÓSTICO PREVIO AL TRAZADO (PASO 3 & 4)
                                    </Text>
                                    <View style={[
                                        styles.diagnosticStatusBadge,
                                        templateRequirementsCheck.valid ? styles.diagStatusReady : styles.diagStatusIncomplete
                                    ]}>
                                        <Text style={[
                                            styles.diagnosticStatusBadgeText,
                                            templateRequirementsCheck.valid ? styles.diagStatusReadyText : styles.diagStatusIncompleteText
                                        ]}>
                                            {templateMeasurementDiagnostic?.hasUnresolved
                                                ? '⚠ MEDIDAS INCOMPLETAS'
                                                : templateMeasurementDiagnostic?.hasEstimated
                                                ? 'ℹ INCLUYE MEDIDAS ESTIMADAS'
                                                : '✓ LISTO PARA GENERAR'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.technicalDiagnosticGrid}>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>CLIENTA:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>CREACIÓN:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>
                                            {activeWorkflow === 'free_pattern' ? 'ORIGEN MEDIDAS:' : 'SESIÓN:'}
                                        </Text>
                                        <Text style={styles.diagItemValue}>
                                            {activeWorkflow === 'free_pattern'
                                                ? (selectedReferenceProfileCode === 'custom'
                                                    ? 'MEDIDAS PERSONALIZADAS'
                                                    : `REFERENCIA: ${(freePatternProfileLabel || 'Estándar').toUpperCase()}`)
                                                : selectedSession
                                                ? `v${selectedSession.version_number} · ${formatSessionDate(selectedSession.session_date)}`
                                                : 'Sin sesión activa'}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>PRENDA:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {GARMENT_PACKAGES[garmentType]?.name || garmentType}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>PLANTILLA:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {selectedTemplate ? `${selectedTemplate.name} (v${selectedTemplate.version})` : 'Sin plantilla seleccionada'}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>MEDIDAS REQUERIDAS:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {selectedTemplate?.required_measurements.length || 0}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>MEDIDAS DISPONIBLES:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {templateRequirementsCheck.present.length}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>REALES REGISTRADAS:</Text>
                                        <Text style={[styles.diagItemValue, { color: '#2B5E35', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic?.real?.length || 0} cotas
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>CÁLCULOS C10 AUTORIZADOS:</Text>
                                        <Text style={[styles.diagItemValue, { color: '#8A6A4A', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic?.calculated?.length || 0} fórmulas
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>ESTIMADAS NORMALIZADAS:</Text>
                                        <Text style={[styles.diagItemValue, { color: templateMeasurementDiagnostic?.hasEstimated ? '#D48806' : '#766B62', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic?.estimated?.length || 0} proporciones
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>NO RESUELTAS:</Text>
                                        <Text style={[styles.diagItemValue, { color: templateMeasurementDiagnostic?.hasUnresolved ? '#CF1322' : '#2B5E35', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic?.unresolved?.length || 0} medidas
                                        </Text>
                                    </View>
                                </View>

                                {/* AVISO DE ESTIMACIÓN ANATÓMICA */}
                                {Boolean(templateMeasurementDiagnostic?.hasEstimated) && (
                                    <View style={styles.estimatedMeasuresNoticeBox}>
                                        <Text style={styles.estimatedMeasuresNoticeTitle}>
                                            ℹ AVISO DE ESTIMACIÓN ANATÓMICA NORMALIZADA
                                        </Text>
                                        <Text style={styles.estimatedMeasuresNoticeText}>
                                            El patrón requiere {templateMeasurementDiagnostic?.estimated?.length || 0} medida(s) no registradas físicamente. Se propone estimarlas mediante proporciones normalizadas de referencia (T40 Haute Couture). Se solicitará confirmación explícita antes de trazar la geometría.
                                        </Text>
                                    </View>
                                )}

                                {templateRequirementsCheck.valid ? (
                                    <View style={styles.diagReadyDetailsRow}>
                                        <TouchableOpacity
                                            style={styles.inspectValuesSmallBtn}
                                            onPress={() => setShowMeasurementsBreakdown((prev) => !prev)}
                                        >
                                            <Text style={styles.inspectValuesSmallBtnText}>
                                                {showMeasurementsBreakdown ? '▲ Ocultar desglose anatómico' : '👁️ [INSPECCIONAR MEDIDAS]'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.missingMeasuresAlertBox}>
                                        <Text style={styles.missingMeasuresAlertTitle}>
                                            ⚠ FALTAN {templateRequirementsCheck.missing.length} MEDIDAS (Requeridas: {selectedTemplate?.required_measurements.length || 0} · Disponibles: {templateRequirementsCheck.present.length})
                                        </Text>
                                        <Text style={styles.missingMeasuresListTitle}>Faltan:</Text>
                                        {templateRequirementsCheck.missing.map((code: string) => (
                                            <Text key={code} style={styles.missingMeasureCodeItem}>
                                                • {code} — {MEASUREMENT_MAP[code]?.name || 'Medida requerida'}
                                            </Text>
                                        ))}
                                        {activeWorkflow !== 'free_pattern' && selectedSession && (
                                            <TouchableOpacity
                                                style={styles.missingMeasureRectifyBtn}
                                                onPress={() => {
                                                    setModalPreviousSession(selectedSession);
                                                    setIsMeasurementModalOpen(true);
                                                }}
                                            >
                                                <Text style={styles.missingMeasureRectifyBtnText}>
                                                    ✏️ [RECTIFICAR SESIÓN]
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Botón Maestro de Generación */}
                            <View style={styles.compactGenerationBar}>
                                <TouchableOpacity
                                    style={[
                                        styles.generateButtonCompact,
                                        (isGenerating ||
                                            !templateRequirementsCheck.valid ||
                                            (activeWorkflow !== 'free_pattern' && (!selectedClient || !selectedSession || selectedSession.status === 'draft' || selectedSession.status === 'archived'))
                                        ) && styles.generateButtonDisabled,
                                    ]}
                                    onPress={() => handleGeneratePattern()}
                                    disabled={
                                        isGenerating ||
                                        !templateRequirementsCheck.valid ||
                                        (activeWorkflow !== 'free_pattern' && (!selectedClient || !selectedSession || selectedSession.status === 'draft' || selectedSession.status === 'archived'))
                                    }
                                    activeOpacity={0.85}
                                >
                                    {isGenerating ? (
                                        <ActivityIndicator color="#FAF7F2" size="small" />
                                    ) : (
                                        <Text style={styles.generateButtonCompactText}>
                                            ⚡ GENERAR PATRÓN EN MESA DE CORTE →
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* DESGLOSE DESPLEGABLE DE LAS MEDIDAS ANATÓMICAS (C05, C06, C10) */}
                            {showMeasurementsBreakdown && (
                                <View style={styles.measurementsBreakdownCard}>
                                    <View style={styles.measurementsBreakdownHeader}>
                                        <View style={{ flex: 1, minWidth: 200 }}>
                                            <Text style={styles.measurementsBreakdownTitle}>
                                                {activeWorkflow === 'free_pattern'
                                                    ? `DETALLE DE MEDIDAS TÉCNICAS · PERFIL ${(freePatternProfileLabel || 'Estándar').toUpperCase()}`
                                                    : `DETALLE DE MEDIDAS CORPORALES · ${selectedClient?.full_name?.toUpperCase() || 'CLIENTA'}`}
                                            </Text>
                                            <Text style={styles.measurementsBreakdownSubtitle}>
                                                {activeWorkflow === 'free_pattern'
                                                    ? (selectedReferenceProfileCode === 'custom'
                                                        ? 'Medidas paramétricas personalizadas para prototipo experimental de taller · Destino: Banco Global'
                                                        : `Perfil anatómico de referencia estándar (${freePatternProfileLabel || 'Estándar'}) · Destino: Banco Global`)
                                                    : (selectedSession
                                                        ? `Sesión v${selectedSession.version_number} (${selectedSession.session_date || 'Sin fecha'}) · Medidas corporales verificadas para corte`
                                                        : 'Sin sesión activa seleccionada')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.measurementsEditBtn}
                                            onPress={() => {
                                                if (activeWorkflow === 'free_pattern') {
                                                    setIsCustomMeasurementsOpen(true);
                                                } else if (selectedSession) {
                                                    setModalPreviousSession(selectedSession);
                                                    setIsMeasurementModalOpen(true);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.measurementsEditBtnText}>
                                                {activeWorkflow === 'free_pattern' ? '✏️ Ajustar Cotas Libres' : '✏️ Rectificar o Editar Medidas'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.measurementsGrid}>
                                        {templateRequirementsCheck.present.map((code: string) => {
                                            const meta = MEASUREMENT_MAP[code];
                                            const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
                                            const fallback = pkg?.calculableFallbacks?.[code];
                                            const isDerived = !activeMeasurementsMm[code] && !!fallback;
                                            const valMm = activeMeasurementsMm[code] ?? (fallback ? fallback.calculate(activeMeasurementsMm) : null);
                                            const valCm = typeof valMm === 'number' ? roundTo(valMm / 10, 1) : '-';

                                            return (
                                                <View key={code} style={styles.measurementChip}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                                        <Text style={styles.measurementChipLabel} numberOfLines={1}>
                                                            {meta?.name || code}
                                                        </Text>
                                                        <Text style={styles.measurementChipBadge}>
                                                            {isDerived ? 'C10 DERIVADA' : 'DIRECTA'}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.measurementChipValue}>
                                                        {valCm} <Text style={styles.measurementChipUnit}>cm</Text>
                                                    </Text>
                                                    <Text style={styles.measurementChipCategory} numberOfLines={1}>
                                                        {isDerived
                                                            ? (fallback?.formulaDescription || 'Fórmula automática C10')
                                                            : (meta?.category || 'Cuerpo')}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Mensaje de espera si aún no se ha generado la geometría */}
                        {!geometryResult && (
                            <View style={styles.emptyMesaCard}>
                                <Text style={styles.emptyMesaIcon}>✂️</Text>
                                <Text style={styles.emptyMesaTitle}>Mesa CAD en Espera de Trazado</Text>
                                <Text style={styles.emptyMesaDesc}>
                                    Prenda seleccionada: <Text style={{ fontWeight: '700', color: '#8C6826' }}>{garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No seleccionada'}</Text>.
                                    {selectedClient ? ` Clienta: ${selectedClient.full_name}.` : ''} Revisa las holguras y márgenes en el panel superior y pulsa "Generar Patrón en Mesa de Corte" para calcular la geometría sastre en tiempo real.
                                </Text>
                            </View>
                        )}

                        {/* SECCIÓN DE RESULTADOS Y PREVISUALIZACIÓN */}
                        {geometryResult && (
                            <View style={styles.resultsContainer}>
                        {/* BARRA DE LINAJE Y REVISIONES HISTÓRICAS (C12) */}
                        <View style={styles.lineageBar}>
                            <View style={styles.lineageTitleRow}>
                                <Text style={styles.lineageBarLabel}>
                                    CADENA DE LINAJE Y REVISIONES (HISTORIAL INMUTABLE):
                                </Text>
                                <Text style={styles.lineageFlowHint}>
                                    PATRÓN ORIGINAL → PRUEBA → AJUSTE → PATRÓN CORREGIDO
                                </Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.lineagePillsContainer}
                            >
                                {(currentExecution
                                    ? fetchExecutionLineage(currentExecution.id, executionHistory)
                                    : (activeWorkflow === 'creation_pattern' && selectedCreation
                                        ? executionHistory.filter((e) => e.creation_id === selectedCreation.id)
                                        : executionHistory
                                    )
                                ).map((exec: PatternExecution, idx: number) => {
                                    const isSelected = currentExecution?.id === exec.id;
                                    const isBase = !exec.parent_execution_id;
                                    return (
                                        <View key={exec.id} style={styles.lineageItemWrap}>
                                            {idx > 0 && <Text style={styles.lineageArrow}>→</Text>}
                                            <TouchableOpacity
                                                style={[
                                                    styles.lineagePill,
                                                    isSelected && styles.lineagePillActive,
                                                    exec.status === 'approved_by_designer' && styles.lineagePillApproved,
                                                ]}
                                                onPress={() => handleSelectExecution(exec)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.lineagePillText,
                                                        isSelected && styles.lineagePillTextActive,
                                                    ]}
                                                >
                                                    {exec.version_label} {isBase ? '(Base Original)' : `(Revisión)`}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.lineagePillStatus,
                                                        isSelected && styles.lineagePillStatusActive,
                                                    ]}
                                                >
                                                    {exec.status === 'approved_by_designer'
                                                        ? '✓ Aprobado'
                                                        : exec.status === 'pending_fitting'
                                                        ? 'Fitting'
                                                        : 'Generado'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                            {(currentExecution ? fetchExecutionLineage(currentExecution.id, executionHistory) : []).length <= 1 && (
                                <Text style={styles.lineageSingleNote}>
                                    ✦ Versión original activa ({currentExecution?.version_label || 'v1.0.0'}). Cada ajuste técnico en la etapa de Fitting generará una nueva revisión derivada conservando esta versión base intacta.
                                </Text>
                            )}
                        </View>

                        {/* ============================================================================== */}
                        
                        
                        {/* CABECERA RÁPIDA DE ESTADO Y ACCIONES DE TALLER */}
                        <View style={styles.fastActionHeaderRow}>
                            <View style={styles.fastActionLeft}>
                                <View style={styles.fastActionBadgeRow}>
                                    <Text style={styles.stepBadge}>PASO 5</Text>
                                    <Text style={styles.fastActionPrendaText}>
                                        {garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'Patrón'} — {currentExecution?.version_label || 'v1.0'}
                                    </Text>
                                </View>
                                <Text style={styles.fastActionClientText}>
                                    Mesa de Corte para: {activeWorkflow === 'free_pattern' ? 'Patrón Libre / Banco Global' : (selectedClient?.full_name || 'Sin clienta')}
                                </Text>
                            </View>

                            <View style={styles.fastActionRight}>
                                <View
                                    style={[
                                        styles.patternStatusBadge,
                                        patternStatus === 'approved_by_designer'
                                            ? styles.statusBadgeApproved
                                            : patternStatus === 'pending_fitting'
                                            ? styles.statusBadgeFitting
                                            : styles.statusBadgePending,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.patternStatusBadgeText,
                                            patternStatus === 'approved_by_designer'
                                                ? styles.statusTextApproved
                                                : patternStatus === 'pending_fitting'
                                                ? styles.statusTextFitting
                                                : styles.statusTextPending,
                                        ]}
                                    >
                                        {patternStatus === 'approved_by_designer'
                                            ? '✓ APROBADO POR KATHERINE CARROLL'
                                            : patternStatus === 'pending_fitting'
                                            ? 'EN PRUEBA DE VESTUARIO'
                                            : 'PATRÓN GENERADO — LISTO'}
                                    </Text>
                                </View>

                                {role !== 'client' && (
                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        {patternStatus === 'generated' && (
                                            <TouchableOpacity
                                                style={styles.fittingButtonCompact}
                                                onPress={handleSendToFitting}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.fittingButtonCompactText}>
                                                    👗 Enviar a Fitting
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {(patternStatus === 'pending_fitting' || patternStatus === 'needs_revision') && (
                                            <TouchableOpacity
                                                style={styles.adjustButtonCompact}
                                                onPress={() => setIsAdjustmentsModalOpen(true)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.adjustButtonCompactText}>
                                                    ✂ Registrar Ajuste
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {patternStatus !== 'approved_by_designer' && (
                                            <TouchableOpacity
                                                style={[
                                                    styles.approveButtonCompact,
                                                    validationChecklist.hasBlocked && styles.approveButtonDisabled,
                                                ]}
                                                onPress={handleApprovePattern}
                                                disabled={validationChecklist.hasBlocked}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.approveButtonCompactText}>
                                                    ✓ Aprobar Patrón
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {patternStatus === 'approved_by_designer' && (
                                            <TouchableOpacity
                                                style={styles.adjustButtonCompact}
                                                onPress={() => setIsAdjustmentsModalOpen(true)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.adjustButtonCompactText}>
                                                    ✂ Nuevo Ajuste
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Lienzo vectorial interactivo */}
                        {/* CHECKLIST C13 PLEGABLE PARA TABLETA (No empuja la mesa CAD) */}
                        <View style={styles.compactChecklistBar}>
                            <TouchableOpacity
                                style={styles.compactChecklistTouchable}
                                onPress={() => setShowChecklistDetails(!showChecklistDetails)}
                                activeOpacity={0.8}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={styles.checklistPillIcon}>
                                        <Text style={styles.checklistPillIconText}>✓ C13</Text>
                                    </View>
                                    <Text style={styles.checklistPillTitle}>
                                        11 Criterios de Corte Validados ({validationChecklist.hasBlocked ? 'Requiere Atención' : '100% Conforme'})
                                    </Text>
                                </View>
                                <Text style={styles.checklistPillAction}>
                                    {showChecklistDetails ? 'Ocultar Criterios ▲' : 'Ver 11 Criterios ▼'}
                                </Text>
                            </TouchableOpacity>

                            {showChecklistDetails && (
                                <View style={styles.checklistDropdownWrap}>
                                    {validationChecklist.items.map((item: any) => (
                                        <View key={item.id} style={styles.checklistItemRow}>
                                            <View
                                                style={[
                                                    styles.itemStatusPill,
                                                    item.status === 'PASS'
                                                        ? styles.pillPass
                                                        : item.status === 'WARNING'
                                                        ? styles.pillWarning
                                                        : styles.pillBlocked,
                                                ]}
                                            >
                                                <Text style={styles.itemStatusPillText}>{item.status}</Text>
                                            </View>
                                            <View style={styles.itemContentCol}>
                                                <Text style={styles.itemLabelText}>{item.label}</Text>
                                                <Text style={styles.itemDescText}>{item.desc}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <PatternPreviewCanvas
                            geometry={geometryResult}
                            compareGeometry={
                                currentExecution?.parent_execution_id
                                    ? executionHistory.find((e) => e.id === currentExecution.parent_execution_id)?.geometry_result
                                    : undefined
                            }
                            title={`${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'Patrón'} — ${selectedClient?.full_name || 'Clienta'}`}
                        />

                        
                        {/* Barra de exportaciones y ajustes */}
                        <View style={styles.exportBar}>
                            <TouchableOpacity
                                style={styles.exportActionBtn}
                                onPress={handleExportSvg}
                            >
                                <Text style={styles.exportActionText}>💾 Descargar SVG (1:1 mm)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.exportActionBtn}
                                onPress={handlePrintTiled}
                            >
                                <Text style={styles.exportActionText}>🖨 Imprimir Mosaico A4/Carta</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.exportActionBtn}
                                onPress={handleExportDxf}
                            >
                                <Text style={styles.exportActionText}>📐 Exportar CAD DXF (R12)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.exportActionBtn, styles.exportActionBtnProduction]}
                                onPress={() => setIsProductionModalOpen(true)}
                            >
                                <Text style={styles.exportActionTextProduction}>
                                    📋 Ficha Técnica & Paquete de Producción
                                </Text>
                            </TouchableOpacity>

                            {currentExecution?.parent_execution_id && (
                                <TouchableOpacity
                                    style={[styles.exportActionBtn, styles.exportActionBtnComparison]}
                                    onPress={() => handleOpenComparison()}
                                >
                                    <Text style={styles.exportActionTextComparison}>
                                        ⚖ Comparar con Versión Anterior
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.exportActionBtn, styles.exportActionBtnHighlight]}
                                onPress={() => setIsAdjustmentsModalOpen(true)}
                            >
                                <Text style={styles.exportActionTextHighlight}>
                                    ✂ Registrar Ajuste de Prueba
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* PASO 11 — INFORMACIÓN DE EXPORTACIÓN */}
                        {lastExportInfo && (
                            <View style={styles.exportSuccessCard}>
                                <View style={styles.exportSuccessHeader}>
                                    <Text style={styles.exportSuccessTitle}>✓ Patrón exportado correctamente</Text>
                                    <TouchableOpacity onPress={() => setLastExportInfo(null)}>
                                        <Text style={styles.exportSuccessClose}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.exportSuccessGrid}>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Archivo:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.fileName}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Prenda:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.garmentName}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Plantilla:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.templateName}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Versión:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.version}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Fecha:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.date}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Unidades:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.units}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Cantidad de piezas:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.piecesCount} piezas técnicas</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        
                        
                        {/* Banner de Navegación de Taller: Etapas Siguientes */}
                        <View style={styles.cadNextStepsBanner}>
                            <TouchableOpacity
                                style={styles.cadNextStepBtn}
                                onPress={() => {
                                    setActiveStudioTab('fitting');
                                    setActiveResultsTab?.('fitting' as any);
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cadNextStepBtnText}>👗 Pasar a Fitting & Ajustes →</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cadNextStepBtn}
                                onPress={() => {
                                    setActiveStudioTab('specifications');
                                    setActiveResultsTab?.('specifications');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cadNextStepBtnText}>📋 Consultar Ficha & Auditoría C13 →</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cadNextStepBtn}
                                onPress={() => {
                                    setActiveStudioTab('history');
                                    setActiveResultsTab?.('history');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cadNextStepBtnText}>📜 Ver Bitácora & Linaje ({executionHistory.length}) →</Text>
                            </TouchableOpacity>
                        </View>
                        {renderBankClosureSection()}
                    </View>
                )}
            </View>
    );
};
