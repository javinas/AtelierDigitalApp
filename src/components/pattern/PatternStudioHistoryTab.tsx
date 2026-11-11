// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: BITÁCORA Y LINAJE HISTÓRICO DE TALLER (M02.15)
// Archivo: src/components/pattern/PatternStudioHistoryTab.tsx
// ==============================================================================

import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { styles } from './patternModuleStyles';
import {
    GarmentType,
    PatternExecution,
    PatternTemplate,
} from '../../types/pattern/pattern';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { CreationTimeline } from './creationFlow/CreationFlowViews';
import { CreationTimelineNode } from './creationFlow/creationFlowModel';

export interface PatternStudioHistoryTabProps {
    activeWorkflow: string;
    creationTimelineNodes: any[];
    executionHistory: PatternExecution[];
    handleSelectExecution: (exec: PatternExecution) => void;
    setActiveStudioTab: (tab: any) => void;
    garmentType: GarmentType;
    freePatternProfileLabel: string;
    selectedClient: Client | null;
    selectedCreation: Creation | null;
    currentExecution: PatternExecution | null;
    templates: PatternTemplate[];
    selectedTemplate: PatternTemplate | null;
    handleOpenComparison: (exec: PatternExecution) => void;
    renderBankClosureSection: () => React.ReactNode;
}

export const PatternStudioHistoryTab: React.FC<PatternStudioHistoryTabProps> = ({
    activeWorkflow,
    creationTimelineNodes,
    executionHistory,
    handleSelectExecution,
    setActiveStudioTab,
    garmentType,
    freePatternProfileLabel,
    selectedClient,
    selectedCreation,
    currentExecution,
    templates,
    selectedTemplate,
    handleOpenComparison,
    renderBankClosureSection,
}) => {
    return (
        <View style={styles.tabContentArea}>
            {/* Árbol Genealógico Inmutable de la Creación (Flujo C) */}
            {activeWorkflow === 'creation_pattern' && (
                <View style={{ marginBottom: 16 }}>
                    <CreationTimeline
                        nodes={creationTimelineNodes}
                        onSelectNode={(n: CreationTimelineNode) => {
                            if (n.executionId) {
                                const found = executionHistory.find((e) => e.id === n.executionId);
                                if (found) handleSelectExecution(found);
                            }
                        }}
                    />
                </View>
            )}
            {executionHistory.length === 0 ? (
                <View style={styles.emptyMesaCard}>
                    <Text style={styles.emptyMesaIcon}>📜</Text>
                    <Text style={styles.emptyMesaTitle}>Bitácora de Linaje Vacía</Text>
                    <Text style={styles.emptyMesaDesc}>
                        {activeWorkflow === 'free_pattern'
                            ? 'Aún no se han generado versiones para este patrón libre. Cada vez que traces o ajustes una pieza en base a medidas de referencia, se registrará aquí su linaje inmutable hacia el Banco Global.'
                            : 'Aún no se han generado versiones de patrón para esta clienta. Cada vez que traces o ajustes una pieza, se registrará aquí su linaje inmutable con fecha, medidas y estado.'}
                    </Text>
                    <TouchableOpacity
                        style={styles.goToCadBtn}
                        onPress={() => setActiveStudioTab('cad')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.goToCadBtnText}>📐 Ir a Mesa CAD para Trazar Primer Patrón</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {/* PASO 12 — HISTORIAL DE EJECUCIONES INMUTABLES */}
                    {executionHistory.length > 0 && (
                        <View style={styles.historySectionCard}>
                            <View style={styles.historySectionHeader}>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <Text style={styles.stepBadge}>BITÁCORA</Text>
                                        <Text style={styles.historySectionSuper}>LINAJE DE ALTA COSTURA</Text>
                                    </View>
                                    <Text style={styles.historySectionTitle}>
                                        BITÁCORA Y LINAJE HISTÓRICO DE TALLER
                                    </Text>
                                    <Text style={styles.historySectionSubtitle}>
                                        Protección de corte y evolución de versiones. Cada molde, prueba y ajuste en tela queda registrado de forma permanente e inalterable.
                                    </Text>
                                </View>
                                <View style={styles.historyCountBadge}>
                                    <Text style={styles.historyCountBadgeText}>
                                        {executionHistory.length} ejecución(es)
                                    </Text>
                                </View>
                            </View>

                            {/* ÁRBOL DE FAMILIA Y LINAJE HISTÓRICO (C13: Historial y Linaje) */}
                            <View style={styles.atelierGuideCard}>
                                <View style={styles.atelierGuideItem}>
                                    <Text style={styles.atelierGuideIcon}>🛡️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.atelierGuideTitle}>Seguridad de Corte Total</Text>
                                        <Text style={styles.atelierGuideDesc}>
                                            {activeWorkflow === 'free_pattern'
                                                ? 'Ningún patrón se sobreescribe jamás. Si se requiere probar distintas holguras o regresar al prototipo original, la versión base siempre está protegida.'
                                                : 'Ningún patrón se sobreescribe jamás. Si una clienta cambia de silueta o necesitas regresar al molde original, la versión base siempre está protegida.'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.atelierGuideItem}>
                                    <Text style={styles.atelierGuideIcon}>🌿</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.atelierGuideTitle}>Linaje de Versiones</Text>
                                        <Text style={styles.atelierGuideDesc}>
                                            Al registrar un ajuste de fitting en tela (ej. entalle en cintura o sisa), el motor genera una versión derivada hija conectada a su molde base.
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.atelierGuideItem}>
                                    <Text style={styles.atelierGuideIcon}>⚖️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.atelierGuideTitle}>Comparación Milimétrica</Text>
                                        <Text style={styles.atelierGuideDesc}>
                                            Usa el botón "Comparar" en cualquier versión derivada para ver en pantalla las diferencias exactas de cada pieza en milímetros.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.lineageTreeCard}>
                                <Text style={styles.lineageTreeTitle}>
                                    {activeWorkflow === 'free_pattern'
                                        ? `ÁRBOL DE FAMILIA Y LINAJE TÉCNICO · BANCO GLOBAL (${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name.toUpperCase() : 'PRENDA'}):`
                                        : `ÁRBOL DE FAMILIA Y LINAJE TÉCNICO (${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name.toUpperCase() : 'PRENDA'}):`}
                                </Text>
                                <Text style={styles.lineageTreeRoot}>
                                    {activeWorkflow === 'free_pattern'
                                        ? `Patrón Técnico Libre — Perfil: ${freePatternProfileLabel} · Clienta: No asociada · Creación: No asociada · Destino: Banco Global`
                                        : `Patrón ${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'Técnico'} — Clienta: ${selectedClient?.full_name || 'Sin clienta'}`}
                                </Text>
                                {executionHistory
                                    .slice()
                                    .reverse()
                                    .map((item, treeIdx) => {
                                        const branchPrefix = treeIdx === 0 ? '  └── ' : '       '.repeat(treeIdx) + '└── ';
                                        const statusTag = item.status === 'approved_by_designer'
                                            ? '✓ [APROBADO PARA CORTE]'
                                            : item.status === 'pending_fitting'
                                            ? '✂ [EN PRUEBA / FITTING]'
                                            : '⚡ [GENERADO]';
                                        return (
                                            <View key={item.id} style={styles.treeNodeRow}>
                                                <Text style={styles.treeBranchText}>
                                                    {branchPrefix}Ejecución {item.version_label} ({statusTag}) — {item.notes || 'Revisión paramétrica'}
                                                </Text>
                                            </View>
                                        );
                                    })}
                            </View>

                            {/* CABECERA ESTRUCTURADA C13: FECHA | CLIENTE | PRENDA | PLANTILLA | VERSIÓN | ESTADO | DISEÑADORA */}
                            <View style={styles.historyTableHeaderRow}>
                                <Text style={[styles.historyTableHeaderText, { flex: 1.5 }]}>FECHA</Text>
                                <Text style={[styles.historyTableHeaderText, { flex: 1.4 }]}>
                                    {activeWorkflow === 'free_pattern' ? 'DESTINO / REF' : 'CLIENTE'}
                                </Text>
                                <Text style={[styles.historyTableHeaderText, { flex: 1.1 }]}>PRENDA</Text>
                                <Text style={[styles.historyTableHeaderText, { flex: 1.5 }]}>PLANTILLA</Text>
                                <Text style={[styles.historyTableHeaderText, { flex: 0.9 }]}>VERSIÓN</Text>
                                <Text style={[styles.historyTableHeaderText, { flex: 1.1 }]}>ESTADO</Text>
                                <Text style={[styles.historyTableHeaderText, { flex: 1.5 }]}>DISEÑADORA</Text>
                            </View>

                            {executionHistory.map((exec, idx) => {
                                const isCurrent = currentExecution?.id === exec.id;
                                const isApproved = exec.status === 'approved_by_designer';
                                const versionIndex = executionHistory.length - idx;
                                const motivo = exec.notes
                                    ? exec.notes
                                    : !exec.parent_execution_id
                                    ? 'Generación inicial paramétrica'
                                    : 'Ajuste de prueba de vestuario';
                                const matchingTpl = templates.find((t) => t.id === exec.template_id);
                                const tplName = matchingTpl?.name || (selectedTemplate && selectedTemplate.id === exec.template_id ? selectedTemplate.name : 'Plantilla Base');
                                const tplVersion = matchingTpl?.version || (selectedTemplate && selectedTemplate.id === exec.template_id ? selectedTemplate.version : '1.0.0');

                                return (
                                    <View
                                        key={exec.id || idx}
                                        style={[
                                            styles.historyRowCard,
                                            isCurrent && styles.historyRowCardActive,
                                            isApproved && styles.historyRowCardApproved,
                                        ]}
                                    >
                                        <View style={styles.historyRowMain}>
                                            <View style={styles.historyRowTop}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <Text style={styles.historyRowVersion}>
                                                        VERSIÓN {versionIndex}: {exec.version_label}
                                                    </Text>
                                                    <View style={!exec.parent_execution_id ? styles.historyOriginalBadge : styles.historyDerivedBadge}>
                                                        <Text style={!exec.parent_execution_id ? styles.historyOriginalBadgeText : styles.historyDerivedBadgeText}>
                                                            {!exec.parent_execution_id ? 'EJECUCIÓN ORIGINAL' : 'EJECUCIÓN DERIVADA'}
                                                        </Text>
                                                    </View>
                                                    {isApproved && (
                                                        <View style={styles.historyApprovedTag}>
                                                            <Text style={styles.historyApprovedTagText}>
                                                                ✓ VERSIÓN ACTUALMENTE APROBADA
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View
                                                    style={[
                                                        styles.historyStatusPill,
                                                        isApproved
                                                            ? styles.statusBadgeApproved
                                                            : exec.status === 'pending_fitting'
                                                            ? styles.statusBadgeFitting
                                                            : styles.statusBadgePending,
                                                    ]}
                                                >
                                                    <Text style={styles.historyStatusPillText}>
                                                        {isApproved
                                                            ? 'APROBADO'
                                                            : exec.status === 'pending_fitting'
                                                            ? 'FITTING'
                                                            : 'GENERADO'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Motivo descriptivo de la versión */}
                                            <View style={styles.historyMotivoRow}>
                                                <Text style={styles.historyMotivoLabel}>Motivo:</Text>
                                                <Text style={styles.historyMotivoText}>{motivo}</Text>
                                            </View>

                                            {/* Información de linaje y derivación (Sección 12) */}
                                            {exec.parent_execution_id && (
                                                <View style={styles.historyDerivedBanner}>
                                                    <Text style={styles.historyDerivedBannerText}>
                                                        ↳ Derivada de ejecución: {exec.parent_execution_id.slice(0, 8)}... {exec.notes ? `· Ajustes: ${exec.notes}` : ''}
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={styles.historyRowMetaGrid}>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Fecha: {exec.created_at ? new Date(exec.created_at).toLocaleString() : 'N/A'}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Usuario: Katherine Carroll (Alta Costura)
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Clienta: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No asociada')}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Creación: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Destino: {activeWorkflow === 'free_pattern' ? 'Banco Global' : 'Creación Bespoke'}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Plantilla: {tplName}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Versión plantilla: v{tplVersion}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Estado: {exec.status.toUpperCase()}
                                                </Text>
                                                <Text style={styles.historyRowMetaItem}>
                                                    Linaje: {exec.parent_execution_id ? `Hija de ${exec.parent_execution_id.slice(0, 8)}...` : 'Base inicial'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.historyRowActions}>
                                            {!isCurrent && (
                                                <TouchableOpacity
                                                    style={styles.historyLoadBtn}
                                                    onPress={() => handleSelectExecution(exec)}
                                                >
                                                    <Text style={styles.historyLoadBtnText}>Cargar Vista</Text>
                                                </TouchableOpacity>
                                            )}
                                            {exec.parent_execution_id && (
                                                <TouchableOpacity
                                                    style={styles.historyCompareBtn}
                                                    onPress={() => handleOpenComparison(exec)}
                                                >
                                                    <Text style={styles.historyCompareBtnText}>⚖ Comparar</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}
            {renderBankClosureSection()}
        </View>
    );
};
