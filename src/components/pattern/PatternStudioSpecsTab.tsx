// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: FICHA TÉCNICA, AUDITORÍA Y CICLO DE VIDA (C13)
// Archivo: src/components/pattern/PatternStudioSpecsTab.tsx
// ==============================================================================

import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { roundTo } from '../../engine/pattern/geometry/geometry2d';
import { colors } from '../../theme/colors';
import { styles } from './patternModuleStyles';
import {
    GarmentType,
    PatternAdjustment,
    PatternExecution,
    PatternTemplate,
} from '../../types/pattern/pattern';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { EaseProfile } from '../../types/pattern/ease';
import {
    CreationDossierOverview,
    ZoomTarget,
    ContextInfoKind,
} from './creationFlow/CreationFlowViews';

export interface PatternStudioSpecsTabProps {
    activeWorkflow: string;
    selectedClient: Client | null;
    selectedCreation: Creation | null;
    garmentType: GarmentType;
    selectedSession: MeasurementSession | null;
    creationFlowSummary: any;
    currentExecution: PatternExecution | null;
    geometryResult: PatternGeometryResult | null;
    adjustmentsHistory: PatternAdjustment[];
    setActiveInfoKind: (kind: ContextInfoKind | null) => void;
    setCreationZoomTarget: (z: ZoomTarget | null) => void;
    setIsAdjustmentsModalOpen: (open: boolean) => void;
    handleApprovePattern: () => void;
    setActiveStudioTab: (tab: any) => void;
    selectedTemplate: PatternTemplate | null;
    freePatternProfileLabel: string;
    validationChecklist: any;
    patternStatus: any;
    associatedClientName: string | null;
    associatedCreationName: string | null;
    selectedEaseProfile: EaseProfile;
    role?: string | null;
    handleSendToFitting: () => void;
    setIsReturnModalOpen: (open: boolean) => void;
    renderBankClosureSection: () => React.ReactNode;
}

export const PatternStudioSpecsTab: React.FC<PatternStudioSpecsTabProps> = ({
    activeWorkflow,
    selectedClient,
    selectedCreation,
    garmentType,
    selectedSession,
    creationFlowSummary,
    currentExecution,
    geometryResult,
    adjustmentsHistory,
    setActiveInfoKind,
    setCreationZoomTarget,
    setIsAdjustmentsModalOpen,
    handleApprovePattern,
    setActiveStudioTab,
    selectedTemplate,
    freePatternProfileLabel,
    validationChecklist,
    patternStatus,
    associatedClientName,
    associatedCreationName,
    selectedEaseProfile,
    role,
    handleSendToFitting,
    setIsReturnModalOpen,
    renderBankClosureSection,
}) => {
    return (
        <View style={styles.tabContentArea}>
            {/* Dossier Técnico Editorial de la Creación (Flujo C) */}
            {activeWorkflow === 'creation_pattern' && (
                <View style={{ marginBottom: 16 }}>
                    <CreationDossierOverview
                        client={selectedClient}
                        creation={selectedCreation}
                        garmentType={garmentType}
                        session={selectedSession}
                        summary={creationFlowSummary}
                        execution={currentExecution}
                        geometry={geometryResult}
                        adjustments={adjustmentsHistory}
                        onOpenInfo={(kind: ContextInfoKind) => setActiveInfoKind(kind)}
                        onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                        onOpenAdjustments={() => setIsAdjustmentsModalOpen(true)}
                        onApprovePattern={handleApprovePattern}
                    />
                </View>
            )}
            {!geometryResult ? (
                <View style={styles.emptyMesaCard}>
                    <Text style={styles.emptyMesaIcon}>📋</Text>
                    <Text style={styles.emptyMesaTitle}>Ficha Técnica y Auditoría C13</Text>
                    <Text style={styles.emptyMesaDesc}>
                        La ficha técnica y la auditoría de los 11 criterios de corte se computan a partir de la geometría del patrón trazado.
                    </Text>
                    <TouchableOpacity
                        style={styles.goToCadBtn}
                        onPress={() => setActiveStudioTab('cad')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.goToCadBtnText}>📐 Ir a Mesa CAD para Trazar Patrón</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {/* PASO 7 — RESULTADO: VISTA TÉCNICA Y ESPECIFICACIONES */}
                    <View style={styles.technicalSpecsCard}>
                        <View style={styles.technicalSpecsHeader}>
                            <Text style={styles.technicalSpecsTitle}>FICHA TÉCNICA DEL PATRÓN GENERADO</Text>
                            <View style={styles.technicalSpecsBadge}>
                                <Text style={styles.technicalSpecsBadgeText}>Escala 1:1 · Unidades mm</Text>
                            </View>
                        </View>
                        <View style={styles.technicalSpecsGrid}>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>ID del Patrón:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {currentExecution?.id ? `${currentExecution.id.slice(0, 12)}...` : 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Origen:</Text>
                                <Text style={[styles.technicalSpecValue, { color: activeWorkflow === 'free_pattern' ? '#A78350' : '#171411', fontWeight: '700' }]}>
                                    {activeWorkflow === 'free_pattern'
                                        ? 'Patrón Libre'
                                        : activeWorkflow === 'direct_pattern'
                                        ? 'Patronaje Directo'
                                        : 'Creación Bespoke'}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Destino:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {activeWorkflow === 'free_pattern' ? 'Banco Global de Patrones' : 'Expediente Bespoke'}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Prenda:</Text>
                                <Text style={styles.technicalSpecValue}>{garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No asignada'}</Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Plantilla:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {selectedTemplate ? selectedTemplate.name : 'Plantilla Base'}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Versión:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {currentExecution?.version_label || (selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0')}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Método:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {selectedTemplate ? selectedTemplate.method_reference : (garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].methodReference : 'No asignado')}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Clienta:</Text>
                                <Text style={[styles.technicalSpecValue, activeWorkflow === 'free_pattern' && { fontStyle: 'italic', color: '#766B62' }]}>
                                    {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Creación:</Text>
                                <Text style={[styles.technicalSpecValue, activeWorkflow === 'free_pattern' && { fontStyle: 'italic', color: '#766B62' }]}>
                                    {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>
                                    {activeWorkflow === 'free_pattern' ? 'Perfil Anatómico:' : 'Sesión de Medidas:'}
                                </Text>
                                <Text style={styles.technicalSpecValue}>
                                    {activeWorkflow === 'free_pattern'
                                        ? `Perfil ${freePatternProfileLabel}`
                                        : (selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'N/A')}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Diseñadora:</Text>
                                <Text style={styles.technicalSpecValue}>Katherine Carroll</Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Fecha/Hora:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleString() : new Date().toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Envergadura:</Text>
                                <Text style={styles.technicalSpecValue}>
                                    {roundTo(geometryResult.boundingBox.width)} × {roundTo(geometryResult.boundingBox.height)} mm
                                </Text>
                            </View>
                            <View style={styles.technicalSpecItem}>
                                <Text style={styles.technicalSpecLabel}>Estado Auditoría:</Text>
                                <Text style={[styles.technicalSpecValue, { color: validationChecklist.hasBlocked ? '#9E2A2B' : '#2B5E35', fontWeight: '700' }]}>
                                    {validationChecklist.hasBlocked ? 'BLOQUEADO' : 'CONFORME PARA CORTE'}
                                </Text>
                            </View>
                        </View>

                        {/* Desglose de piezas geométricas (Paso 7: nombre, identificación, geometría, dimensiones) */}
                        <Text style={styles.piecesListSubtitle}>PIEZAS COMPONENTES ({geometryResult.pieces.length}):</Text>
                        <View style={styles.piecesListGrid}>
                            {geometryResult.pieces.map((piece) => (
                                <View key={piece.id} style={styles.pieceDetailCard}>
                                    <View style={styles.pieceDetailHeader}>
                                        <Text style={styles.pieceDetailName}>{piece.name}</Text>
                                        <Text style={styles.pieceDetailCode}>ID: {piece.id}</Text>
                                    </View>
                                    <View style={styles.pieceDetailMeta}>
                                        <Text style={styles.pieceDetailDim}>
                                            Dimensiones: {roundTo(piece.boundingBox.width)} × {roundTo(piece.boundingBox.height)} mm
                                        </Text>
                                        <Text style={styles.pieceDetailSub}>
                                            Costura: {piece.seamAllowanceMm} mm · Cortar: {piece.quantityToCut} {piece.cutOnFold ? '(al doblez)' : ''}
                                        </Text>
                                        <Text style={styles.pieceDetailSub}>
                                            Aplomo: {piece.grainline.label || 'Definido'} · Piquetes: {piece.notches.length}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* SECCIÓN 2: REVISIÓN Y PRUEBA DEL PATRÓN (COMPONENTE 13) */}
                    <View style={styles.reviewSectionCard}>
                        <View style={styles.reviewSectionHeader}>
                            <View>
                                <Text style={styles.reviewSectionSuper}>MÓDULO 02 · ALTA COSTURA</Text>
                                <Text style={styles.reviewSectionTitle}>REVISIÓN Y PRUEBA DEL PATRÓN</Text>
                            </View>
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
                                        ? 'EN PRUEBA DE VESTUARIO (FITTING)'
                                        : 'PATRÓN GENERADO — LISTO PARA PRUEBA'}
                                </Text>
                            </View>
                        </View>

                        {/* FICHA TÉCNICA DE REVISIÓN (METADATOS EXIGIDOS POR EL COMPONENTE 13) */}
                        <View style={styles.reviewMetaGrid}>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>CLIENTE:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {activeWorkflow === 'free_pattern'
                                        ? (associatedClientName ? `${associatedClientName} (Asociada)` : 'No asociada')
                                        : (selectedClient?.full_name || 'No seleccionada')}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>CREACIÓN:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {activeWorkflow === 'free_pattern'
                                        ? (associatedCreationName ? `${associatedCreationName} (Asociada)` : 'No asociada')
                                        : (selectedCreation?.name || 'No asociada')}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>DESTINO:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {activeWorkflow === 'free_pattern' ? 'Banco Global' : 'Creación Bespoke'}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>SESIÓN DE MEDIDAS:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {activeWorkflow === 'free_pattern'
                                        ? `Perfil: ${freePatternProfileLabel}`
                                        : (selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'N/A')}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>PRENDA:</Text>
                                <Text style={styles.reviewMetaValue}>{garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No asignada'}</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>PLANTILLA:</Text>
                                <Text style={styles.reviewMetaValue}>{selectedTemplate?.name || 'Plantilla Base'}</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>VERSIÓN:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {currentExecution?.version_label || (selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0')}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>MÉTODO:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {selectedTemplate ? selectedTemplate.method_reference : (garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].methodReference : 'No asignado')}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>HOLGURA:</Text>
                                <Text style={styles.reviewMetaValue}>{selectedEaseProfile.name}</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>FECHA:</Text>
                                <Text style={styles.reviewMetaValue}>
                                    {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleString() : new Date().toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>DISEÑADORA:</Text>
                                <Text style={styles.reviewMetaValue}>Katherine Carroll (Alta Costura)</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>ESTADO:</Text>
                                <Text style={[styles.reviewMetaValue, { fontWeight: '700', color: patternStatus === 'approved_by_designer' ? '#2E7D32' : colors.accent }]}>
                                    {patternStatus === 'approved_by_designer'
                                        ? 'APPROVED (Inmutable)'
                                        : patternStatus === 'pending_fitting'
                                        ? 'FITTING (En Prueba)'
                                        : 'GENERATED (Generado)'}
                                </Text>
                            </View>
                        </View>

                        {/* FLUJO VISUAL DEL CICLO C13 (C13.14) */}
                        <View style={styles.cycleFlowCard}>
                            <Text style={styles.cycleFlowTitle}>ESTADO DEL CICLO DE VIDA TÉCNICO (C13):</Text>
                            <View style={styles.cycleFlowStepsRow}>
                                <View style={[styles.cycleStepBadge, styles.cycleStepActive]}>
                                    <Text style={styles.cycleStepText}>1. GENERADO</Text>
                                </View>
                                <Text style={styles.cycleArrow}>→</Text>
                                <View style={[styles.cycleStepBadge, styles.cycleStepActive]}>
                                    <Text style={styles.cycleStepText}>2. REVISAR</Text>
                                </View>
                                <Text style={styles.cycleArrow}>→</Text>
                                <View
                                    style={[
                                        styles.cycleStepBadge,
                                        (patternStatus === 'pending_fitting' || patternStatus === 'needs_revision') && styles.cycleStepActive,
                                        patternStatus === 'needs_revision' && styles.cycleStepAlert,
                                    ]}
                                >
                                    <Text style={styles.cycleStepText}>
                                        {patternStatus === 'needs_revision' ? '3. DEVUELTO' : '3. AJUSTAR'}
                                    </Text>
                                </View>
                                <Text style={styles.cycleArrow}>→</Text>
                                <View style={[styles.cycleStepBadge, !validationChecklist.hasBlocked && styles.cycleStepActive]}>
                                    <Text style={styles.cycleStepText}>4. VALIDAR</Text>
                                </View>
                                <Text style={styles.cycleArrow}>→</Text>
                                <View style={[styles.cycleStepBadge, patternStatus === 'approved_by_designer' && styles.cycleStepApproved]}>
                                    <Text style={styles.cycleStepText}>5. APROBADO</Text>
                                </View>
                            </View>
                        </View>

                        {/* CHECKLIST VISUAL DE VALIDACIÓN TÉCNICA (C13.7) */}
                        <View style={styles.checklistCard}>
                            <View style={styles.checklistHeaderRow}>
                                <View>
                                    <Text style={styles.checklistTitle}>LISTA DE VALIDACIÓN TÉCNICA (CHECKLIST C13)</Text>
                                    <Text style={styles.checklistSubtitle}>
                                        Control riguroso de 11 criterios obligatorios antes del corte de alta costura
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.checklistOverallBadge,
                                        validationChecklist.hasBlocked
                                            ? styles.badgeBlocked
                                            : validationChecklist.warningCount > 0
                                            ? styles.badgeWarning
                                            : styles.badgePass,
                                    ]}
                                >
                                    <Text style={styles.checklistOverallText}>
                                        {validationChecklist.hasBlocked
                                            ? '⛔ BLOQUEADO (NO APTO)'
                                            : validationChecklist.warningCount > 0
                                            ? '⚠️ APTO CON ADVERTENCIAS'
                                            : '✓ 100% APTO PARA CORTE'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.checklistGrid}>
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
                        </View>

                        {/* SECCIÓN 10: PATRÓN APROBADO O ACCIONES DE CICLO DE VIDA */}
                        {patternStatus === 'approved_by_designer' ? (
                            <View style={styles.approvedBannerCard}>
                                <View style={styles.approvedBannerTop}>
                                    <Text style={styles.approvedBannerCheck}>✓</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.approvedBannerTitle}>✓ PATRÓN APROBADO</Text>
                                        <Text style={styles.approvedBannerSub}>
                                            Patrón validado y formalmente bloqueado como versión histórica inmutable.
                                        </Text>
                                    </View>
                                    <View style={styles.readOnlyBadge}>
                                        <Text style={styles.readOnlyBadgeText}>SOLO LECTURA</Text>
                                    </View>
                                </View>
                                <View style={styles.approvedDetailsGrid}>
                                    <Text style={styles.approvedDetailText}>
                                        • Clienta: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                    </Text>
                                    <Text style={styles.approvedDetailText}>
                                        • Creación: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                    </Text>
                                    <Text style={styles.approvedDetailText}>
                                        • Destino: {activeWorkflow === 'free_pattern' ? 'Banco Global de Patrones' : 'Expediente Bespoke'}
                                    </Text>
                                    <Text style={styles.approvedDetailText}>• Prenda: {garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No asignada'}</Text>
                                    <Text style={styles.approvedDetailText}>• Plantilla: {selectedTemplate?.name || 'Base'}</Text>
                                    <Text style={styles.approvedDetailText}>• Versión de plantilla: {selectedTemplate?.version || '1.0.0'}</Text>
                                    <Text style={styles.approvedDetailText}>• Fecha: {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
                                    <Text style={styles.approvedDetailText}>• Diseñadora: Katherine Carroll</Text>
                                    <Text style={styles.approvedDetailText}>• Versión de ejecución: {currentExecution?.version_label || 'v1.0'}</Text>
                                    <Text style={styles.approvedDetailText}>• Cantidad de piezas: {geometryResult.pieces.length} piezas técnicas</Text>
                                </View>
                                {role !== 'client' && (
                                    <View style={{ marginTop: 14 }}>
                                        <TouchableOpacity
                                            style={[styles.exportActionBtn, styles.exportActionBtnHighlight]}
                                            onPress={() => setIsAdjustmentsModalOpen(true)}
                                        >
                                            <Text style={styles.exportActionTextHighlight}>
                                                ✂ Registrar Nuevo Ajuste (Genera Nueva Versión Derivada)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            /* ACCIONES FUNCIONALES DE PRUEBA Y APROBACIÓN */
                            role !== 'client' ? (
                                <View style={styles.lifecycleActionRow}>
                                    {patternStatus === 'generated' && (
                                        <TouchableOpacity
                                            style={styles.fittingButton}
                                            onPress={handleSendToFitting}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.fittingButtonText}>
                                                Enviar a Prueba de Vestuario (Fitting)
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {(patternStatus === 'pending_fitting' || patternStatus === 'needs_revision') && (
                                        <TouchableOpacity
                                            style={styles.adjustFromHeaderBtn}
                                            onPress={() => setIsAdjustmentsModalOpen(true)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.adjustFromHeaderBtnText}>
                                                ✂ Registrar Ajuste de Fitting
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.returnButton}
                                        onPress={() => setIsReturnModalOpen(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.returnButtonText}>
                                            ↩ Devolver a Ajuste
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.approveButton,
                                            validationChecklist.hasBlocked && styles.approveButtonDisabled,
                                        ]}
                                        onPress={handleApprovePattern}
                                        disabled={validationChecklist.hasBlocked}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.approveButtonText}>
                                            ✓ Aprobar Patrón
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.clientReadOnlyNotice}>
                                    <Text style={styles.clientReadOnlyNoticeText}>
                                        🔒 Vista exclusiva de clienta: los ajustes técnicos y la aprobación de corte son facultad reservada de Katherine Carroll.
                                    </Text>
                                </View>
                            )
                        )}
                    </View>
                </View>
            )}
            {renderBankClosureSection()}
        </View>
    );
};

