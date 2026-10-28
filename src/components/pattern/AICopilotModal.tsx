// ==============================================================================
// ATELIER DIGITAL — MODAL: COPILOTO DE IA CONSULTIVO (M02.13)
// Archivo: src/components/pattern/AICopilotModal.tsx
// ==============================================================================
// Proporciona asistencia de diseño opcional y explicaciones técnicas de alta costura.
// No ejecuta fórmulas arbitrarias; toda propuesta requiere aprobación de la diseñadora.
// ==============================================================================

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AICopilotService, AIPatternSuggestion } from '../../services/aiCopilotService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { GarmentDesignParameters } from '../../types/pattern/ease';
import { GarmentType } from '../../types/pattern/pattern';

interface AICopilotModalProps {
    visible: boolean;
    garmentType: GarmentType;
    currentParams: GarmentDesignParameters;
    engineWarnings: string[];
    onClose: () => void;
    onApplyParameters: (params: Partial<GarmentDesignParameters>) => void;
}

export function AICopilotModal({
    visible,
    garmentType,
    currentParams,
    engineWarnings,
    onClose,
    onApplyParameters,
}: AICopilotModalProps) {
    const [prompt, setPrompt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [suggestion, setSuggestion] = useState<AIPatternSuggestion | null>(null);

    const copilotStatus = AICopilotService.getStatus();
    const explainedWarnings = AICopilotService.explainEngineWarnings(engineWarnings);

    const handleConsult = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            const res = await AICopilotService.interpretGarmentPrompt(prompt, garmentType);
            setSuggestion(res);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (suggestion) {
            onApplyParameters(suggestion.suggestedParameters);
            onClose();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.superTitle}>ASISTENCIA DE ALTA COSTURA</Text>
                            <Text style={styles.title}>Copiloto Consultivo de Patronaje</Text>
                            <Text style={styles.subtitle}>{copilotStatus.providerName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Indicador de Seguridad y Desacoplamiento */}
                        <View style={styles.securityBanner}>
                            <Text style={styles.securityTitle}>🛡️ Reglas de Seguridad Activas</Text>
                            <Text style={styles.securityText}>
                                El copiloto propone parámetros estilísticos estructurados. El motor matemático es
                                100% determinístico y ninguna fórmula es alterada por inteligencia artificial.
                            </Text>
                        </View>

                        {/* Explicación de advertencias si existen */}
                        {explainedWarnings.length > 0 && (
                            <View style={styles.warningsSection}>
                                <Text style={styles.sectionHeader}>Explicación de Avisos Técnicos del Motor:</Text>
                                {explainedWarnings.map((w, idx) => (
                                    <View key={idx} style={styles.warningItem}>
                                        <Text style={styles.warningText}>{w}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Consulta de diseño */}
                        <Text style={styles.sectionHeader}>Describir estilo deseado para sugerir parámetros:</Text>
                        <TextInput
                            style={styles.promptInput}
                            placeholder="Ej. Vestido evasé midi con escote en V y manga francesa para fiesta..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                            value={prompt}
                            onChangeText={setPrompt}
                        />

                        {/* Ideas rápidas */}
                        <View style={styles.quickPrompts}>
                            {[
                                'Silueta Línea A con vuelo amplio',
                                'Falda formato Midi (750 mm)',
                                'Manga tres cuartos francesa',
                                'Escote en V profundo',
                            ].map((q) => (
                                <TouchableOpacity
                                    key={q}
                                    style={styles.quickChip}
                                    onPress={() => setPrompt(q)}
                                >
                                    <Text style={styles.quickChipText}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.consultBtn}
                            onPress={handleConsult}
                            disabled={loading || !prompt.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.consultBtnText}>Interpretar Descripción</Text>
                            )}
                        </TouchableOpacity>

                        {/* Propuesta del Copiloto */}
                        {suggestion && (
                            <View style={styles.proposalBox}>
                                <Text style={styles.proposalTitle}>Propuesta Estructurada para Katherine Carroll:</Text>
                                <Text style={styles.proposalRationale}>{suggestion.rationaleSpanish}</Text>

                                <View style={styles.paramsTable}>
                                    {Object.entries(suggestion.suggestedParameters).map(([k, v]) => (
                                        <View key={k} style={styles.paramRow}>
                                            <Text style={styles.paramKey}>{k}:</Text>
                                            <Text style={styles.paramVal}>{String(v)}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                                    <Text style={styles.applyBtnText}>
                                        Aprobar y Aplicar Parámetros al Motor
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
        maxWidth: 640,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        padding: 20,
        backgroundColor: colors.surfaceSubtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    superTitle: {
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 2,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: typography.serif,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 3,
    },
    closeBtn: {
        padding: 6,
    },
    closeBtnText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    content: {
        padding: 20,
    },
    securityBanner: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
    },
    securityTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    securityText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    warningsSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    warningItem: {
        backgroundColor: colors.surfaceSubtle,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        padding: 8,
        borderRadius: 4,
        marginBottom: 6,
    },
    warningText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    promptInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 12,
        fontSize: 13,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceSubtle,
        minHeight: 75,
        textAlignVertical: 'top',
        marginBottom: 10,
    },
    quickPrompts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14,
    },
    quickChip: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickChipText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    consultBtn: {
        backgroundColor: colors.atelierBlack,
        borderRadius: 4,
        paddingVertical: 10,
        alignItems: 'center',
    },
    consultBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    proposalBox: {
        marginTop: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 6,
        padding: 16,
    },
    proposalTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 6,
    },
    proposalRationale: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
        marginBottom: 10,
    },
    paramsTable: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        padding: 10,
        marginBottom: 12,
        gap: 4,
    },
    paramRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    paramKey: {
        fontSize: 11,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    paramVal: {
        fontSize: 11,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    applyBtn: {
        backgroundColor: colors.accent,
        borderRadius: 4,
        paddingVertical: 10,
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
