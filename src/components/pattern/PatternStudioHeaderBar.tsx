import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Client } from '../../types/client';
import { MeasurementSession } from '../../types/pattern/measurement';
import { Creation } from '../../types/creation';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';

export type PatternWorkflowType = 'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern';
export type StudioTabType = 'garment' | 'cad' | 'fitting' | 'specifications' | 'history';
export type ResultsTabType = 'fitting' | 'specifications' | 'history';

export interface PatternStudioMainHeaderProps {
    styles: any;
    onBack?: () => void;
    titleBack?: string;
    activeWorkflow: PatternWorkflowType;
    initialCreationId?: string | null;
    onOpenPatternBank: () => void;
    onOpenCopilot: () => void;
}

export const PatternStudioMainHeader: React.FC<PatternStudioMainHeaderProps> = ({
    styles,
    onBack,
    titleBack = '← Volver',
    activeWorkflow,
    initialCreationId,
    onOpenPatternBank,
    onOpenCopilot,
}) => {
    return (
        <View style={styles.topHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
                <Text style={styles.backButtonText}>{titleBack}</Text>
            </TouchableOpacity>

            <View style={styles.headerTitles}>
                <View style={styles.headerBrandBadge}>
                    <Text style={styles.headerStar}>✦</Text>
                    <Text style={styles.superHeader}>BY KATHERINE CARROLL · ATELIER DIGITAL</Text>
                </View>
                <Text style={styles.mainHeader}>
                    {activeWorkflow === 'free_pattern'
                        ? 'Patrón Libre'
                        : initialCreationId
                        ? 'MÓDULO 02 · CREACIÓN VINCULADA'
                        : 'MÓDULO 02 · ALTA COSTURA'}
                </Text>
                <Text style={styles.headerSubLead}>
                    {activeWorkflow === 'free_pattern'
                        ? 'Experimentación, geometría y oficio sin límites.'
                        : initialCreationId
                        ? 'Patronaje CAD para Creación'
                        : 'Banco de Patrones & Copiloto Consultivo'}
                </Text>
            </View>

            <View style={styles.headerActionsGroup}>
                {/* Botón de Banco Global de Patrones */}
                <TouchableOpacity
                    style={styles.bankHeaderBtn}
                    onPress={onOpenPatternBank}
                    activeOpacity={0.8}
                >
                    <Text style={styles.bankHeaderBtnText}>📚 Banco de Patrones</Text>
                </TouchableOpacity>

                {/* Botón de Copiloto Consultivo */}
                <TouchableOpacity
                    style={styles.copilotHeaderBtn}
                    onPress={onOpenCopilot}
                    activeOpacity={0.8}
                >
                    <Text style={styles.copilotHeaderBtnText}>✨ Copiloto Consultivo</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export interface PatternStudioWorkflowSubHeaderProps {
    styles: any;
    activeWorkflow: PatternWorkflowType;
    selectedClient: Client | null;
    selectedSession: MeasurementSession | null;
    selectedCreation: Creation | null;
    sessions: MeasurementSession[];
    freePatternProfileLabel: string;
    onBackToHub: () => void;
}

export const PatternStudioWorkflowSubHeader: React.FC<PatternStudioWorkflowSubHeaderProps> = ({
    styles,
    activeWorkflow,
    selectedClient,
    selectedSession,
    selectedCreation,
    sessions,
    freePatternProfileLabel,
    onBackToHub,
}) => {
    if (activeWorkflow === 'hub') return null;

    return (
        <View style={styles.workflowSubHeader}>
            <TouchableOpacity
                style={styles.workflowBackToHubBtn}
                onPress={onBackToHub}
                activeOpacity={0.8}
            >
                <Text style={styles.workflowBackToHubBtnText}>← Menú Módulo 02</Text>
            </TouchableOpacity>

            <View style={styles.workflowBadgeContainer}>
                <View
                    style={[
                        styles.workflowPillBadge,
                        activeWorkflow === 'measurements' && styles.workflowPillA,
                        activeWorkflow === 'direct_pattern' && styles.workflowPillB,
                        activeWorkflow === 'creation_pattern' && styles.workflowPillC,
                        activeWorkflow === 'free_pattern' && styles.workflowPillD,
                    ]}
                >
                    <Text style={styles.workflowPillBadgeText}>
                        {activeWorkflow === 'measurements' && '📏 FLUJO A · GESTIÓN DE MEDIDAS'}
                        {activeWorkflow === 'direct_pattern' && '✂️ FLUJO B · PATRONAJE DIRECTO'}
                        {activeWorkflow === 'creation_pattern' && '👗 FLUJO C · PATRÓN PARA CREACIÓN'}
                        {activeWorkflow === 'free_pattern' && '🧪 FLUJO D · PATRÓN LIBRE / BANCO'}
                    </Text>
                </View>

                <Text style={styles.workflowContextSummary} numberOfLines={1}>
                    {activeWorkflow === 'measurements' && (selectedClient ? `${selectedClient.full_name} (${sessions.length} sesiones)` : 'Seleccionar clienta')}
                    {activeWorkflow === 'direct_pattern' && (selectedClient ? `${selectedClient.full_name} · ${selectedSession ? `v${selectedSession.version_number}` : 'Sin sesión'}` : 'Seleccionar clienta')}
                    {activeWorkflow === 'creation_pattern' && (selectedClient ? `${selectedClient.full_name} · ${selectedCreation ? selectedCreation.name : 'Seleccionar creación'}` : 'Seleccionar clienta')}
                    {activeWorkflow === 'free_pattern' && `Perfil: ${freePatternProfileLabel} · Banco Global`}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.switchFlowHeaderBtn}
                onPress={onBackToHub}
                activeOpacity={0.8}
            >
                <Text style={styles.switchFlowHeaderBtnText}>Cambiar Flujo ▾</Text>
            </TouchableOpacity>
        </View>
    );
};

export interface PatternStudioTabBarProps {
    styles: any;
    activeStudioTab: StudioTabType;
    setActiveStudioTab: (tab: StudioTabType) => void;
    setActiveResultsTab: (tab: ResultsTabType) => void;
    geometryResult: PatternGeometryResult | null;
    adjustmentsHistoryCount: number;
    executionHistoryCount: number;
}

export const PatternStudioTabBar: React.FC<PatternStudioTabBarProps> = ({
    styles,
    activeStudioTab,
    setActiveStudioTab,
    setActiveResultsTab,
    geometryResult,
    adjustmentsHistoryCount,
    executionHistoryCount,
}) => {
    return (
        <View style={styles.studioTabBar}>
            <TouchableOpacity
                style={[
                    styles.studioTabBtn,
                    activeStudioTab === 'garment' && styles.studioTabBtnActive,
                ]}
                onPress={() => {
                    setActiveStudioTab('garment');
                }}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        styles.studioTabBtnText,
                        activeStudioTab === 'garment' && styles.studioTabBtnTextActive,
                    ]}
                >
                    👗 Prenda & Silueta
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.studioTabBtn,
                    activeStudioTab === 'cad' && styles.studioTabBtnActive,
                ]}
                onPress={() => {
                    setActiveStudioTab('cad');
                }}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        styles.studioTabBtnText,
                        activeStudioTab === 'cad' && styles.studioTabBtnTextActive,
                    ]}
                >
                    📐 Mesa CAD {geometryResult ? '✓' : ''}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.studioTabBtn,
                    activeStudioTab === 'fitting' && styles.studioTabBtnActive,
                ]}
                onPress={() => {
                    setActiveStudioTab('fitting');
                    setActiveResultsTab('fitting');
                }}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        styles.studioTabBtnText,
                        activeStudioTab === 'fitting' && styles.studioTabBtnTextActive,
                    ]}
                >
                    ✂️ Fitting & Ajustes {adjustmentsHistoryCount > 0 ? `(${adjustmentsHistoryCount})` : ''}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.studioTabBtn,
                    activeStudioTab === 'specifications' && styles.studioTabBtnActive,
                ]}
                onPress={() => {
                    setActiveStudioTab('specifications');
                    setActiveResultsTab('specifications');
                }}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        styles.studioTabBtnText,
                        activeStudioTab === 'specifications' && styles.studioTabBtnTextActive,
                    ]}
                >
                    📋 Ficha & Auditoría C13
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.studioTabBtn,
                    activeStudioTab === 'history' && styles.studioTabBtnActive,
                ]}
                onPress={() => {
                    setActiveStudioTab('history');
                    setActiveResultsTab('history');
                }}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        styles.studioTabBtnText,
                        activeStudioTab === 'history' && styles.studioTabBtnTextActive,
                    ]}
                >
                    📜 Bitácora ({executionHistoryCount})
                </Text>
            </TouchableOpacity>
        </View>
    );
};

