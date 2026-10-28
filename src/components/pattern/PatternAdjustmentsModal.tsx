// ==============================================================================
// ATELIER DIGITAL — MODAL: PRUEBA DE VESTUARIO Y AJUSTES DE PATRONAJE (COMPONENTE 13)
// Archivo: src/components/pattern/PatternAdjustmentsModal.tsx
// ==============================================================================
// Ciclo de Fitting: Resultado general, observaciones técnicas, ajustes estructurados,
// validación matemática numérica estricta y regeneración con conservación de linaje.
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
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
import {
    createAdjustedChildExecution,
    getCompatibleAdjustmentsForGarment,
    recordPatternAdjustment,
    updatePatternStatus,
    validateAdjustmentNumericValue,
} from '../../services/patternService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import {
    AdjustmentDirection,
    AdjustmentType,
    AdjustmentUnit,
    FittingResultType,
    PatternAdjustment,
    PatternExecution,
} from '../../types/pattern/pattern';

const QUICK_ZONES = [
    'hombro izquierdo',
    'hombro derecho',
    'busto',
    'cintura',
    'cadera',
    'manga',
    'largo',
    'cuello',
    'otra',
];

const ADJUSTMENT_ACTIONS = [
    'aumentar',
    'reducir',
    'desplazar',
    'corregir inclinación',
    'modificar forma',
    'otro',
];

interface PatternAdjustmentsModalProps {
    visible: boolean;
    execution: PatternExecution | null;
    onClose: () => void;
    onAdjustmentRecorded: (
        childExecution?: PatternExecution,
        adjustment?: PatternAdjustment,
        message?: string
    ) => void;
}

export function PatternAdjustmentsModal({
    visible,
    execution,
    onClose,
    onAdjustmentRecorded,
}: PatternAdjustmentsModalProps) {
    // 1. Resultado general del Fitting
    const [fittingResult, setFittingResult] = useState<FittingResultType>('needs_adjustments');

    // 2. Parámetros de ajuste estructurado
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('waist');
    const [targetPiece, setTargetPiece] = useState<string>('Delantero y Espalda');
    const [zone, setZone] = useState<string>('cintura');
    const [rawMagnitude, setRawMagnitude] = useState<string>('1.5');
    const [unit, setUnit] = useState<AdjustmentUnit>('cm');
    const [direction, setDirection] = useState<AdjustmentDirection>('decrease');
    const [adjustmentAction, setAdjustmentAction] = useState<string>('reducir');
    const [evidence, setEvidence] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [fittingNotes, setFittingNotes] = useState<string>('');

    // 3. Estados de operación
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'adjust' | 'measurements' | 'ease' | 'design'>('adjust');

    // Taxonomía dinámica filtrada por prenda para C13 (evita parámetros incompatibles)
    const taxonomyOptions = useMemo(() => {
        return getCompatibleAdjustmentsForGarment(execution?.garment_type || 'bodice');
    }, [execution?.garment_type]);

    useEffect(() => {
        if (taxonomyOptions.length > 0) {
            const isCurrentValid = taxonomyOptions.some((o) => o.type === adjustmentType);
            if (!isCurrentValid) {
                setAdjustmentType(taxonomyOptions[0].type);
                setZone(taxonomyOptions[0].defaultZone);
            }
        }
    }, [taxonomyOptions, adjustmentType]);

    const handleSelectTaxonomy = (opt: { type: AdjustmentType; defaultZone: string }) => {
        setAdjustmentType(opt.type);
        setZone(opt.defaultZone);
    };

    // Cálculo matemático del delta en mm respetando signo y unidad
    const calculateDeltaMm = (): { value: number; valid: boolean; error?: string } => {
        const isCompatible = taxonomyOptions.some((o) => o.type === adjustmentType);
        if (!isCompatible && adjustmentType !== 'custom' && adjustmentType !== 'other') {
            return { value: 0, valid: false, error: `El ajuste de tipo "${adjustmentType}" no es compatible con prendas de tipo ${execution?.garment_type}.` };
        }
        const parsed = parseFloat(rawMagnitude.trim());
        const numCheck = validateAdjustmentNumericValue(parsed);
        if (!numCheck.valid) {
            return { value: 0, valid: false, error: numCheck.error };
        }
        if (parsed <= 0) {
            return { value: 0, valid: false, error: 'El valor de magnitud debe ser estrictamente mayor a 0.' };
        }
        // Conversión a mm
        const magnitudeMm = unit === 'cm' ? parsed * 10 : parsed;
        const signedDeltaMm = direction === 'decrease' ? -magnitudeMm : magnitudeMm;
        return { value: signedDeltaMm, valid: true };
    };

    const deltaCalculation = calculateDeltaMm();

    // Guardar Fitting o Ajuste
    const handleSave = async () => {
        if (!execution) return;
        setErrorMessage(null);

        // CASO A: Ajuste Correcto (Sin modificaciones geométricas)
        if (fittingResult === 'correct') {
            if (!fittingNotes.trim()) {
                setErrorMessage('Por favor registre las observaciones de la prueba conforme.');
                return;
            }

            setSaving(true);
            try {
                // Registrar observación de fitting conforme
                const recRes = await recordPatternAdjustment({
                    executionId: execution.id,
                    adjustmentType: 'custom',
                    targetPiece: 'Prenda Completa',
                    deltaMm: 0,
                    description: `[FITTING CONFORME] ${fittingNotes.trim()}`,
                });

                // Si está en 'generated', transicionar a 'pending_fitting'
                if (execution.status === 'generated') {
                    await updatePatternStatus(
                        execution.id,
                        'pending_fitting',
                        `Prueba de vestuario completada con resultado CONFORME. ${fittingNotes.trim()}`
                    );
                }

                onAdjustmentRecorded(
                    undefined,
                    recRes.adjustment,
                    '✓ Prueba de vestuario registrada como CONFORME. El patrón está listo para su aprobación final.'
                );
                onClose();
            } catch (err: any) {
                setErrorMessage(err?.message || 'Error registrando resultado de prueba.');
            } finally {
                setSaving(false);
            }
            return;
        }

        // CASO B: Requiere Ajustes Estructurados
        if (!deltaCalculation.valid) {
            setErrorMessage(deltaCalculation.error || 'Magnitud inválida.');
            return;
        }

        const noteText = description.trim() || fittingNotes.trim();
        if (!noteText) {
            setErrorMessage('Por favor ingrese una observación técnica del ajuste observado en la prueba.');
            return;
        }

        setSaving(true);

        try {
            const formattedDelta = deltaCalculation.value > 0 ? `+${deltaCalculation.value}` : `${deltaCalculation.value}`;
            const fullDescription = `[${zone}] (${adjustmentAction}) ${direction === 'increase' ? 'Aumentar' : 'Reducir'} ${rawMagnitude} ${unit} (${formattedDelta} mm) — ${noteText}${evidence.trim() ? ` [Evidencia: ${evidence.trim()}]` : ''}`;

            const res = await createAdjustedChildExecution({
                parentExecution: execution,
                adjustmentType,
                targetPiece: targetPiece.trim() || zone,
                deltaMm: deltaCalculation.value,
                description: fullDescription,
            });

            if (!res.success) {
                setErrorMessage(res.error || 'No se pudo aplicar el ajuste ni generar la nueva revisión.');
                return;
            }

            onAdjustmentRecorded(res.childExecution, res.adjustment, res.message);
            onClose();
        } catch (err: any) {
            setErrorMessage(err?.message || 'Error guardando ajuste y regenerando patrón.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.superTitle}>MÓDULO 02 · FITTING & AJUSTES</Text>
                            <Text style={styles.title}>Prueba de Vestuario del Patrón</Text>
                            <Text style={styles.subtitle}>
                                Patrón Base: {execution?.version_label || 'v1.0'} ({execution?.garment_type}) · Inmutabilidad Protegida
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>
                        {errorMessage && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                            </View>
                        )}

                        {/* SELECTOR DE ÁREAS TÉCNICAS C13: Medidas, Holgura, Diseño y Fitting */}
                        <View style={styles.contextTabsRow}>
                            <TouchableOpacity
                                style={[styles.contextTab, activeTab === 'adjust' && styles.contextTabActive]}
                                onPress={() => setActiveTab('adjust')}
                            >
                                <Text style={[styles.contextTabText, activeTab === 'adjust' && styles.contextTabTextActive]}>
                                    ✂ D. AJUSTE DE FITTING
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contextTab, activeTab === 'measurements' && styles.contextTabActive]}
                                onPress={() => setActiveTab('measurements')}
                            >
                                <Text style={[styles.contextTabText, activeTab === 'measurements' && styles.contextTabTextActive]}>
                                    📏 A. MEDIDAS ANATÓMICAS
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contextTab, activeTab === 'ease' && styles.contextTabActive]}
                                onPress={() => setActiveTab('ease')}
                            >
                                <Text style={[styles.contextTabText, activeTab === 'ease' && styles.contextTabTextActive]}>
                                    🌿 B. HOLGURA
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contextTab, activeTab === 'design' && styles.contextTabActive]}
                                onPress={() => setActiveTab('design')}
                            >
                                <Text style={[styles.contextTabText, activeTab === 'design' && styles.contextTabTextActive]}>
                                    📐 C. PARÁMETROS DISEÑO
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* PANEL A: MEDIDAS ANATÓMICAS (SOLO LECTURA - PROTEGIDAS) */}
                        {activeTab === 'measurements' && (
                            <View style={styles.technicalContextCard}>
                                <View style={styles.protectedNoticeBanner}>
                                    <Text style={styles.protectedNoticeTitle}>🔒 FICHA ANATÓMICA ORIGINAL INMUTABLE</Text>
                                    <Text style={styles.protectedNoticeSub}>
                                        Regla de Alta Costura: Las pruebas de fitting nunca modifican las medidas corporales originales de la clienta. Los ajustes pertenecen a la ejecución derivada de patronaje.
                                    </Text>
                                </View>
                                <View style={styles.kvGrid}>
                                    {execution?.measurement_snapshot &&
                                        Object.entries(execution.measurement_snapshot).map(([key, val]) => (
                                            <View key={key} style={styles.kvItem}>
                                                <Text style={styles.kvKey}>{key}:</Text>
                                                <Text style={styles.kvVal}>{val} mm ({Math.round(val / 10 * 10) / 10} cm)</Text>
                                            </View>
                                        ))}
                                </View>
                            </View>
                        )}

                        {/* PANEL B: PERFIL DE HOLGURA ACTIVO */}
                        {activeTab === 'ease' && (
                            <View style={styles.technicalContextCard}>
                                <View style={styles.infoBanner}>
                                    <Text style={styles.infoBannerText}>
                                        Perfil de holgura activo: {execution?.ease_profile_snapshot?.name || 'Estándar'} ({execution?.ease_profile_snapshot?.code}). Desahogos milimétricos incorporados en la silueta.
                                    </Text>
                                </View>
                                <View style={styles.kvGrid}>
                                    {execution?.ease_profile_snapshot?.ease_values &&
                                        Object.entries(execution.ease_profile_snapshot.ease_values).map(([k, v]) => (
                                            <View key={k} style={styles.kvItem}>
                                                <Text style={styles.kvKey}>Holgura {k}:</Text>
                                                <Text style={styles.kvVal}>+{v} mm</Text>
                                            </View>
                                        ))}
                                </View>
                            </View>
                        )}

                        {/* PANEL C: PARÁMETROS DE DISEÑO */}
                        {activeTab === 'design' && (
                            <View style={styles.technicalContextCard}>
                                <View style={styles.infoBanner}>
                                    <Text style={styles.infoBannerText}>
                                        Parámetros de estilo, márgenes de costura y tolerancias geométricas configuradas para esta prenda.
                                    </Text>
                                </View>
                                <View style={styles.kvGrid}>
                                    {execution?.design_parameters &&
                                        Object.entries(execution.design_parameters).map(([k, v]) => (
                                            <View key={k} style={styles.kvItem}>
                                                <Text style={styles.kvKey}>{k}:</Text>
                                                <Text style={styles.kvVal}>{String(v)}</Text>
                                            </View>
                                        ))}
                                </View>
                            </View>
                        )}

                        {/* PANEL D: FORMULARIO DE AJUSTES DE FITTING */}
                        {activeTab === 'adjust' && (
                            <>
                                {/* 1. SELECCIÓN DE RESULTADO GENERAL */}
                                <Text style={styles.sectionLabel}>1. RESULTADO GENERAL DE LA PRUEBA:</Text>
                                <View style={styles.resultToggleRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.resultBtn,
                                            fittingResult === 'correct' && styles.resultBtnCorrectActive,
                                        ]}
                                        onPress={() => setFittingResult('correct')}
                                    >
                                        <Text
                                            style={[
                                                styles.resultBtnText,
                                                fittingResult === 'correct' && styles.resultBtnTextActive,
                                            ]}
                                        >
                                            ✓ AJUSTE CORRECTO
                                        </Text>
                                        <Text style={styles.resultBtnSub}>Calce óptimo sin variaciones geométricas</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.resultBtn,
                                            fittingResult === 'needs_adjustments' && styles.resultBtnAdjustActive,
                                        ]}
                                        onPress={() => setFittingResult('needs_adjustments')}
                                    >
                                        <Text
                                            style={[
                                                styles.resultBtnText,
                                                fittingResult === 'needs_adjustments' && styles.resultBtnTextActive,
                                            ]}
                                        >
                                            ✂ REQUIERE AJUSTES
                                        </Text>
                                        <Text style={styles.resultBtnSub}>Aplica variaciones y regenera nueva revisión</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* MODO A: AJUSTE CORRECTO */}
                                {fittingResult === 'correct' && (
                                    <View style={styles.correctSection}>
                                        <View style={styles.infoBanner}>
                                            <Text style={styles.infoBannerText}>
                                                La prueba de vestuario es satisfactoria. Ingrese las observaciones de prueba para validar formalmente el patrón y habilitar su aprobación definitiva para corte.
                                            </Text>
                                        </View>

                                        <Text style={styles.label}>Observaciones del Fitting de Katherine Carroll:</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={fittingNotes}
                                            onChangeText={setFittingNotes}
                                            multiline
                                            numberOfLines={4}
                                            placeholder="Ej. Glasilla verificada sobre la clienta. El equilibrio frontal y dorsal es impecable; holguras confortables y aplomos alineados..."
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>
                                )}

                                {/* MODO B: REQUIERE AJUSTES */}
                                {fittingResult === 'needs_adjustments' && (
                                    <View style={styles.adjustSection}>
                                        <Text style={styles.sectionLabel}>2. TIPO Y ACCIÓN DE AJUSTE:</Text>
                                        <View style={styles.actionChipRow}>
                                            {ADJUSTMENT_ACTIONS.map((act) => (
                                                <TouchableOpacity
                                                    key={act}
                                                    style={[styles.smallChip, adjustmentAction === act && styles.smallChipActive]}
                                                    onPress={() => {
                                                        setAdjustmentAction(act);
                                                        if (act === 'aumentar') setDirection('increase');
                                                        if (act === 'reducir') setDirection('decrease');
                                                    }}
                                                >
                                                    <Text style={[styles.smallChipText, adjustmentAction === act && styles.smallChipTextActive]}>
                                                        {act}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <Text style={[styles.label, { marginTop: 8 }]}>Parámetro Anatómico Base:</Text>
                                        <View style={styles.optionsGrid}>
                                            {taxonomyOptions.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.type}
                                                    style={[styles.optBtn, adjustmentType === opt.type && styles.optBtnActive]}
                                                    onPress={() => handleSelectTaxonomy(opt)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.optBtnText,
                                                            adjustmentType === opt.type && styles.optBtnTextActive,
                                                        ]}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <Text style={[styles.label, { marginTop: 8 }]}>Zona Anatómica (selección rápida o personalizada):</Text>
                                        <View style={styles.actionChipRow}>
                                            {QUICK_ZONES.map((qz) => (
                                                <TouchableOpacity
                                                    key={qz}
                                                    style={[styles.smallChip, zone.toLowerCase() === qz.toLowerCase() && styles.smallChipActive]}
                                                    onPress={() => setZone(qz)}
                                                >
                                                    <Text style={[styles.smallChipText, zone.toLowerCase() === qz.toLowerCase() && styles.smallChipTextActive]}>
                                                        {qz}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        <View style={styles.twoColRow}>
                                            <View style={styles.col}>
                                                <Text style={styles.label}>Pieza Afectada:</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={targetPiece}
                                                    onChangeText={setTargetPiece}
                                                    placeholder="Ej. Delantero, Espalda, Manga..."
                                                    placeholderTextColor={colors.textMuted}
                                                />
                                            </View>
                                            <View style={styles.col}>
                                                <Text style={styles.label}>Detalle de Zona:</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={zone}
                                                    onChangeText={setZone}
                                                    placeholder="Ej. Cintura lateral, Copa..."
                                                    placeholderTextColor={colors.textMuted}
                                                />
                                            </View>
                                        </View>

                                        <Text style={styles.sectionLabel}>3. MAGNITUD, DIRECCIÓN Y UNIDAD:</Text>
                                        <View style={styles.adjustParamsRow}>
                                            {/* Dirección */}
                                            <View style={styles.paramBox}>
                                                <Text style={styles.paramBoxLabel}>Dirección:</Text>
                                                <View style={styles.toggleGroup}>
                                                    <TouchableOpacity
                                                        style={[styles.toggleBtn, direction === 'increase' && styles.toggleBtnActive]}
                                                        onPress={() => setDirection('increase')}
                                                    >
                                                        <Text style={[styles.toggleBtnText, direction === 'increase' && styles.toggleBtnTextActive]}>
                                                            + Aumentar
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.toggleBtn, direction === 'decrease' && styles.toggleBtnActive]}
                                                        onPress={() => setDirection('decrease')}
                                                    >
                                                        <Text style={[styles.toggleBtnText, direction === 'decrease' && styles.toggleBtnTextActive]}>
                                                            - Reducir
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* Unidad */}
                                            <View style={styles.paramBox}>
                                                <Text style={styles.paramBoxLabel}>Unidad:</Text>
                                                <View style={styles.toggleGroup}>
                                                    <TouchableOpacity
                                                        style={[styles.toggleBtn, unit === 'cm' && styles.toggleBtnActive]}
                                                        onPress={() => setUnit('cm')}
                                                    >
                                                        <Text style={[styles.toggleBtnText, unit === 'cm' && styles.toggleBtnTextActive]}>
                                                            cm
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.toggleBtn, unit === 'mm' && styles.toggleBtnActive]}
                                                        onPress={() => setUnit('mm')}
                                                    >
                                                        <Text style={[styles.toggleBtnText, unit === 'mm' && styles.toggleBtnTextActive]}>
                                                            mm
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* Magnitud numérico */}
                                            <View style={[styles.paramBox, { flex: 1.2 }]}>
                                                <Text style={styles.paramBoxLabel}>Valor numérico:</Text>
                                                <TextInput
                                                    style={styles.magnitudeInput}
                                                    value={rawMagnitude}
                                                    onChangeText={setRawMagnitude}
                                                    keyboardType="numeric"
                                                    placeholder="1.5"
                                                    placeholderTextColor={colors.textMuted}
                                                />
                                            </View>
                                        </View>

                                        {/* Vista previa del delta calculado */}
                                        <View style={styles.computedDeltaBox}>
                                            <Text style={styles.computedDeltaLabel}>Variación milimétrica para el motor matemático:</Text>
                                            <Text
                                                style={[
                                                    styles.computedDeltaValue,
                                                    deltaCalculation.valid
                                                        ? deltaCalculation.value > 0
                                                            ? styles.deltaPositive
                                                            : styles.deltaNegative
                                                        : styles.deltaInvalid,
                                                ]}
                                            >
                                                {deltaCalculation.valid
                                                    ? `${deltaCalculation.value > 0 ? '+' : ''}${deltaCalculation.value} mm (${direction === 'increase' ? 'Desahogar / Ampliar' : 'Entallar / Reducir'})`
                                                    : '⚠️ Ingrese un número válido (no NaN / no infinito)'}
                                            </Text>
                                        </View>

                                        <Text style={styles.label}>Observaciones Técnicas de la Prueba:</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={description}
                                            onChangeText={setDescription}
                                            multiline
                                            numberOfLines={3}
                                            placeholder="Describa el comportamiento en tela: ej. Se observa sobrante de 1.5 cm en costado de cintura al sentarse..."
                                            placeholderTextColor={colors.textMuted}
                                        />

                                        <Text style={styles.label}>Evidencia o Registro de Prueba (opcional):</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={evidence}
                                            onChangeText={setEvidence}
                                            placeholder="Ej. Foto 01: Marca con tiza en sisa / Muestra glasilla en busto"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                fittingResult === 'correct' ? styles.saveBtnCorrect : styles.saveBtnAdjust,
                            ]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveBtnText}>
                                    {fittingResult === 'correct'
                                        ? '✓ Registrar Fitting Conforme'
                                        : '⚡ Guardar Ajuste y Regenerar Patrón'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.70)',
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
        maxWidth: 680,
        maxHeight: '92%',
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
        fontSize: 18,
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
    scrollContent: {
        padding: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: colors.accent,
        marginTop: 8,
        marginBottom: 10,
    },
    resultToggleRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    resultBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
    },
    resultBtnCorrectActive: {
        borderColor: '#2E7D32',
        backgroundColor: '#E8F5E9',
    },
    resultBtnAdjustActive: {
        borderColor: colors.accent,
        backgroundColor: '#FDFBF7',
    },
    resultBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    resultBtnTextActive: {
        color: colors.textPrimary,
    },
    resultBtnSub: {
        fontSize: 11,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 4,
    },
    correctSection: {
        paddingVertical: 6,
    },
    adjustSection: {
        paddingVertical: 6,
    },
    infoBanner: {
        padding: 12,
        borderRadius: 6,
        backgroundColor: '#F4EFE6',
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        marginBottom: 14,
    },
    infoBannerText: {
        fontSize: 12,
        color: colors.textPrimary,
        lineHeight: 18,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    optBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
    },
    optBtnActive: {
        borderColor: colors.accent,
        backgroundColor: colors.accent,
    },
    optBtnText: {
        fontSize: 12,
        color: colors.textPrimary,
    },
    optBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    twoColRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14,
    },
    col: {
        flex: 1,
    },
    adjustParamsRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    paramBox: {
        flex: 1,
    },
    paramBoxLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    toggleGroup: {
        flexDirection: 'row',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: colors.accent,
    },
    toggleBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    toggleBtnTextActive: {
        color: '#FFFFFF',
    },
    magnitudeInput: {
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 10,
        backgroundColor: colors.surfaceSubtle,
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    computedDeltaBox: {
        padding: 10,
        backgroundColor: '#F5EFE6',
        borderRadius: 6,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    computedDeltaLabel: {
        fontSize: 11,
        color: colors.textMuted,
        marginBottom: 2,
    },
    computedDeltaValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    deltaPositive: {
        color: '#1565C0',
    },
    deltaNegative: {
        color: '#C62828',
    },
    deltaInvalid: {
        color: '#D32F2F',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceSubtle,
        marginBottom: 12,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    errorBox: {
        padding: 10,
        backgroundColor: '#FFEBEE',
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#C62828',
        marginBottom: 14,
    },
    errorText: {
        fontSize: 12,
        color: '#C62828',
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        padding: 16,
        backgroundColor: colors.surfaceSubtle,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    saveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnCorrect: {
        backgroundColor: '#2E7D32',
    },
    saveBtnAdjust: {
        backgroundColor: colors.accent,
    },
    saveBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    contextTabsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    contextTab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
    },
    contextTabActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    contextTabText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: colors.textSecondary,
    },
    contextTabTextActive: {
        color: '#FFFFFF',
    },
    technicalContextCard: {
        padding: 16,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    protectedNoticeBanner: {
        padding: 12,
        borderRadius: 4,
        backgroundColor: '#E8F5E9',
        borderLeftWidth: 3,
        borderLeftColor: '#2E7D32',
        marginBottom: 14,
    },
    protectedNoticeTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1B5E20',
        marginBottom: 4,
    },
    protectedNoticeSub: {
        fontSize: 11,
        color: '#2E7D32',
        lineHeight: 16,
    },
    kvGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    kvItem: {
        width: '48%',
        padding: 8,
        backgroundColor: colors.surface,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    kvKey: {
        fontSize: 11,
        color: colors.textMuted,
        marginBottom: 2,
    },
    kvVal: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    actionChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    smallChip: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
    },
    smallChipActive: {
        borderColor: colors.accent,
        backgroundColor: colors.accent,
    },
    smallChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },
    smallChipTextActive: {
        color: '#FFFFFF',
    },
});
