// ==============================================================================
// ATELIER DIGITAL — LABORATORIO SANDBOX PROTOTIPO 3D (BY KATHERINE CARROLL)
// Archivo: src/components/mannequin3d/Mannequin3DStudioSandbox.tsx
// ==============================================================================
// Interfaz de demostración independiente para evaluación de usabilidad,
// deformación de siluetas de alta costura y diagnóstico de rendimiento en vivo.
// ==============================================================================

import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    DEFAULT_FEMALE_MEASUREMENTS,
    FEMALE_SILHOUETTE_PRESETS,
    MANNEQUIN_PARAM_BOUNDS,
    Mannequin3DMeasurements,
    RenderPerformanceStats,
} from './types';
import { Mannequin3DViewer } from './Mannequin3DViewer';

export interface Mannequin3DStudioSandboxProps {
    onClose?: () => void;
}

export const Mannequin3DStudioSandbox: React.FC<Mannequin3DStudioSandboxProps> = ({ onClose }) => {
    const [measurements, setMeasurements] = useState<Mannequin3DMeasurements>({
        ...DEFAULT_FEMALE_MEASUREMENTS,
    });
    const [showPedestal, setShowPedestal] = useState(true);
    const [showTapeLines, setShowTapeLines] = useState(true);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('standard_atelier');
    const [stats, setStats] = useState<RenderPerformanceStats>({
        fps: 60,
        trianglesCount: 2304,
        geometriesCount: 5,
        deformationTimeMs: 0.4,
        lastRenderDurationMs: 1.2,
    });

    // Ajuste paramétrico milimétrico
    const handleAdjustParam = (key: keyof Mannequin3DMeasurements, deltaMm: number) => {
        const bounds = MANNEQUIN_PARAM_BOUNDS[key];
        setMeasurements((prev) => {
            const current = prev[key];
            const nextVal = Math.max(bounds.min, Math.min(bounds.max, current + deltaMm));
            return {
                ...prev,
                [key]: nextVal,
            };
        });
        setSelectedPresetId('custom');
    };

    // Aplicar preset de silueta
    const handleSelectPreset = (presetId: string) => {
        const p = FEMALE_SILHOUETTE_PRESETS.find((item) => item.id === presetId);
        if (!p) return;
        setSelectedPresetId(presetId);
        setMeasurements({ ...p.measurements });
    };

    // Restablecer valores estándar
    const handleReset = () => {
        setSelectedPresetId('standard_atelier');
        setMeasurements({ ...DEFAULT_FEMALE_MEASUREMENTS });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* 1. CABECERA EDITORIAL */}
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerSupertitle}>ATELIER DIGITAL · M02 EXPERIMENTAL</Text>
                    <Text style={styles.headerTitle}>Visualizador Corporal 3D Auxiliar</Text>
                    <Text style={styles.headerSubtitle}>
                        Prototipo visual independiente: Busto sastre de alta costura con deformación paramétrica en tiempo real.
                    </Text>
                </View>

                {onClose && (
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.closeBtnText}>✕ Cerrar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 2. ESPACIO PRINCIPAL: VISUALIZADOR 3D + PANEL DE CONTROL */}
            <View style={styles.workspaceGrid}>
                {/* Columna Izquierda / Central: Visor 3D */}
                <View style={styles.viewerColumn}>
                    <Mannequin3DViewer
                        measurements={measurements}
                        showPedestal={showPedestal}
                        showTapeLines={showTapeLines}
                        height={560}
                        onRenderStats={setStats}
                    />

                    {/* Barra de diagnóstico técnico en vivo */}
                    <View style={styles.diagnosticBar}>
                        <View style={styles.diagItem}>
                            <Text style={styles.diagLabel}>Tasa de Refresco:</Text>
                            <Text style={[styles.diagValue, { color: stats.fps >= 55 ? '#2E5A39' : '#C59A30' }]}>
                                {stats.fps} FPS
                            </Text>
                        </View>
                        <View style={styles.diagDivider} />
                        <View style={styles.diagItem}>
                            <Text style={styles.diagLabel}>Deformación:</Text>
                            <Text style={styles.diagValue}>{stats.deformationTimeMs} ms</Text>
                        </View>
                        <View style={styles.diagDivider} />
                        <View style={styles.diagItem}>
                            <Text style={styles.diagLabel}>Triángulos:</Text>
                            <Text style={styles.diagValue}>{stats.trianglesCount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.diagDivider} />
                        <View style={styles.diagItem}>
                            <Text style={styles.diagLabel}>Render:</Text>
                            <Text style={styles.diagValue}>On-Demand (0% idle)</Text>
                        </View>
                    </View>
                </View>

                {/* Columna Derecha: Panel de Parámetros y Presets */}
                <View style={styles.controlsColumn}>
                    {/* A. Selector de Siluetas de Alta Costura */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>✦ Siluetas Predefinidas</Text>
                        <View style={styles.presetsGrid}>
                            {FEMALE_SILHOUETTE_PRESETS.map((p) => {
                                const isSelected = selectedPresetId === p.id;
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.presetCard, isSelected && styles.presetCardActive]}
                                        onPress={() => handleSelectPreset(p.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.presetName, isSelected && styles.presetNameActive]}>
                                            {p.name}
                                        </Text>
                                        <Text style={[styles.presetDesc, isSelected && styles.presetDescActive]}>
                                            {p.description}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* B. Controles de Deformación Paramétrica */}
                    <View style={styles.sectionCard}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.sectionTitle}>✦ Deformación de Cotas (6 Parámetros)</Text>
                            <TouchableOpacity onPress={handleReset}>
                                <Text style={styles.resetText}>↻ Restablecer</Text>
                            </TouchableOpacity>
                        </View>

                        {(Object.keys(MANNEQUIN_PARAM_BOUNDS) as Array<keyof Mannequin3DMeasurements>).map((key) => {
                            const bounds = MANNEQUIN_PARAM_BOUNDS[key];
                            const currentMm = measurements[key];
                            const currentCm = (currentMm / 10).toFixed(1);

                            return (
                                <View key={key} style={styles.paramRow}>
                                    <View style={styles.paramInfo}>
                                        <Text style={styles.paramLabel}>{bounds.label}</Text>
                                        <Text style={styles.paramValue}>
                                            {currentCm} <Text style={styles.paramUnit}>cm</Text>
                                        </Text>
                                    </View>

                                    <View style={styles.stepperGroup}>
                                        <TouchableOpacity
                                            style={styles.stepBtn}
                                            onPress={() => handleAdjustParam(key, -10)} // -1 cm
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.stepBtnText}>−</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.stepBtn}
                                            onPress={() => handleAdjustParam(key, 10)} // +1 cm
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.stepBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* C. Opciones Visuales de Estudio */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>✦ Opciones de Atelier</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, showPedestal && styles.toggleBtnActive]}
                                onPress={() => setShowPedestal(!showPedestal)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.toggleBtnText, showPedestal && styles.toggleBtnTextActive]}>
                                    {showPedestal ? '✓ Pedestal Visible' : 'Pedestal Oculto'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.toggleBtn, showTapeLines && styles.toggleBtnActive]}
                                onPress={() => setShowTapeLines(!showTapeLines)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.toggleBtnText, showTapeLines && styles.toggleBtnTextActive]}>
                                    {showTapeLines ? '✓ Cintas Doradas' : 'Cintas Ocultas'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Nota editorial de limitación de alcance */}
                    <View style={styles.noticeBlock}>
                        <Text style={styles.noticeTitle}>✦ Distinción de Alta Costura:</Text>
                        <Text style={styles.noticeText}>
                            Este maniquí 3D opera como herramienta visual auxiliar de proporción y silueta. Las plantillas y curvas de corte milimétricas permanecen gobernadas de forma inmutable por el motor CAD 2D de M02.
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F5F0',
    },
    content: {
        padding: 24,
        maxWidth: 1320,
        marginHorizontal: 'auto',
        width: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
    },
    headerLeft: {
        flex: 1,
        minWidth: 280,
    },
    headerSupertitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#8A6A4A',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#171411',
        fontFamily: 'serif',
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#655A4E',
        lineHeight: 18,
    },
    closeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#EFECE6',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    closeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4A3E31',
    },
    workspaceGrid: {
        flexDirection: 'row',
        gap: 24,
        flexWrap: 'wrap',
    },
    viewerColumn: {
        flex: 1,
        minWidth: 340,
    },
    diagnosticBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EBE5DC',
        flexWrap: 'wrap',
        gap: 8,
    },
    diagItem: {
        alignItems: 'center',
    },
    diagLabel: {
        fontSize: 10,
        color: '#8A7E72',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    diagValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
    },
    diagDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#EAE4DA',
    },
    controlsColumn: {
        width: 440,
        maxWidth: '100%',
        gap: 16,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#EBE5DC',
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
        letterSpacing: 0.3,
        marginBottom: 12,
    },
    resetText: {
        fontSize: 11,
        color: '#8A6A4A',
        fontWeight: '600',
    },
    presetsGrid: {
        gap: 8,
    },
    presetCard: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EAE4DA',
        backgroundColor: '#FAF8F5',
    },
    presetCardActive: {
        borderColor: '#A78350',
        backgroundColor: '#FFFBF5',
    },
    presetName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4A3E31',
        marginBottom: 2,
    },
    presetNameActive: {
        color: '#8A6A4A',
    },
    presetDesc: {
        fontSize: 11,
        color: '#7A6E62',
    },
    presetDescActive: {
        color: '#5A4E42',
    },
    paramRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F1EB',
    },
    paramInfo: {
        flex: 1,
    },
    paramLabel: {
        fontSize: 12,
        color: '#4A3E31',
        fontWeight: '500',
    },
    paramValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
        marginTop: 1,
    },
    paramUnit: {
        fontSize: 10,
        fontWeight: '500',
        color: '#8A7E72',
    },
    stepperGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    stepBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3EFE9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0D8CE',
    },
    stepBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4A3E31',
        lineHeight: 18,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#F7F4EF',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2DBD2',
    },
    toggleBtnActive: {
        backgroundColor: '#EFE9DE',
        borderColor: '#A78350',
    },
    toggleBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7A6E62',
    },
    toggleBtnTextActive: {
        color: '#4A3E31',
    },
    noticeBlock: {
        backgroundColor: '#FAF5EE',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: '#A78350',
    },
    noticeTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6A4A',
        marginBottom: 4,
    },
    noticeText: {
        fontSize: 11,
        color: '#6A5E52',
        lineHeight: 16,
    },
});

