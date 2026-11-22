// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: MODAL DE AJUSTE FÍSICO EN PRENDA
// Archivo: src/components/fitting/FittingAdjustmentModal.tsx
// ==============================================================================
// Creación de ajuste físico en taller o resolución/dispensa auditada,
// con control de severidad crítica (prohibición de dispensa) y concurrencia optimista.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    FittingAdjustment,
    FittingAdjustmentKind,
    FittingAdjustmentSeverity,
    FittingAdjustmentStatus,
    FittingAdjustmentZoneCode,
    FittingSession,
    M06_ERROR_NAMES,
} from '../../types/fitting';
import {
    createFittingAdjustment,
    generateFittingIdempotencyKey,
    resolveFittingAdjustment,
} from '../../services/fittingService';
import {
    FITTING_KIND_OPTIONS,
    FITTING_SEVERITY_OPTIONS,
    FITTING_ZONE_OPTIONS,
} from './fittingLabels';
import { fittingStyles as styles } from './fittingStyles';

export type AdjustmentModalMode = 'create' | 'resolve';

export interface FittingAdjustmentModalProps {
    visible: boolean;
    session: FittingSession;
    initialAdjustment?: FittingAdjustment | null;
    mode?: AdjustmentModalMode;
    initialTargetStatus?: FittingAdjustmentStatus;
    onClose: () => void;
    onSaved: (adjustment: FittingAdjustment, updatedSession?: FittingSession) => void;
}

export const FittingAdjustmentModal: React.FC<FittingAdjustmentModalProps> = ({
    visible,
    session,
    initialAdjustment,
    mode = 'create',
    initialTargetStatus,
    onClose,
    onSaved,
}) => {
    const isResolving = mode === 'resolve' && Boolean(initialAdjustment);

    // Campos de creación
    const [zoneCode, setZoneCode] = useState<FittingAdjustmentZoneCode>('escote');
    const [adjustmentKind, setAdjustmentKind] = useState<FittingAdjustmentKind>('silhouette_pin');
    const [severity, setSeverity] = useState<FittingAdjustmentSeverity>('normal');
    const [description, setDescription] = useState('');
    const [deltaMm, setDeltaMm] = useState('');
    const [workshopNotes, setWorkshopNotes] = useState('');
    const [requiresCadUpdate, setRequiresCadUpdate] = useState(false);

    // Campos de resolución / dispensa
    const [targetStatus, setTargetStatus] = useState<FittingAdjustmentStatus>(
        initialTargetStatus || 'applied'
    );
    const [reason, setReason] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConcurrencyConflict, setIsConcurrencyConflict] = useState(false);

    useEffect(() => {
        if (isResolving && initialAdjustment) {
            setZoneCode(initialAdjustment.zone_code);
            setAdjustmentKind(initialAdjustment.adjustment_kind);
            setSeverity(initialAdjustment.severity);
            setDescription(initialAdjustment.description);
            setDeltaMm(
                initialAdjustment.delta_mm !== null && initialAdjustment.delta_mm !== undefined
                    ? String(initialAdjustment.delta_mm)
                    : ''
            );
            setWorkshopNotes(initialAdjustment.workshop_notes || '');
            setRequiresCadUpdate(Boolean(initialAdjustment.requires_cad_update));
            setTargetStatus(initialTargetStatus || 'applied');
            setReason('');
        } else {
            setZoneCode('escote');
            setAdjustmentKind('silhouette_pin');
            setSeverity('normal');
            setDescription('');
            setDeltaMm('');
            setWorkshopNotes('');
            setRequiresCadUpdate(false);
            setTargetStatus('applied');
            setReason('');
        }
        setErrorMessage(null);
        setIsConcurrencyConflict(false);
    }, [initialAdjustment, mode, initialTargetStatus, visible]);

    const isCritical = (initialAdjustment?.severity || severity) === 'critical';

    const handleSubmit = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        setIsConcurrencyConflict(false);

        try {
            if (isResolving && initialAdjustment) {
                // Validación de dispensa en ajuste crítico
                if (targetStatus === 'waived' && initialAdjustment.severity === 'critical') {
                    setIsSaving(false);
                    setErrorMessage('Prohibido dispensar: las correcciones estructurales críticas no pueden dispensarse.');
                    return;
                }

                if ((targetStatus === 'waived' || targetStatus === 'cancelled') && !reason.trim()) {
                    setIsSaving(false);
                    setErrorMessage(
                        `Por favor indica el motivo o justificación técnica para ${targetStatus === 'waived' ? 'dispensar' : 'descartar'} este ajuste.`
                    );
                    return;
                }

                const res = await resolveFittingAdjustment({
                    adjustmentId: initialAdjustment.id,
                    expectedRowVersion: initialAdjustment.row_version,
                    idempotencyKey: generateFittingIdempotencyKey('resolve_adj'),
                    targetStatus: targetStatus as 'applied' | 'verified' | 'waived' | 'cancelled',
                    workshopNotes: workshopNotes.trim() || null,
                    reason: reason.trim() || null,
                    resolutionSessionId: session.id,
                });

                setIsSaving(false);

                if (res.error) {
                    if (res.error.code === M06_ERROR_NAMES.CONCURRENCY_CONFLICT) {
                        setIsConcurrencyConflict(true);
                    }
                    setErrorMessage(res.error.message);
                    return;
                }

                if (res.data?.adjustment) {
                    onSaved(res.data.adjustment, res.data.session);
                    onClose();
                }
            } else {
                if (!description.trim()) {
                    setIsSaving(false);
                    setErrorMessage('Por favor ingresa la descripción técnica de la corrección.');
                    return;
                }

                let deltaValue: number | null = null;
                if (deltaMm.trim()) {
                    const parsed = parseFloat(deltaMm);
                    if (!isNaN(parsed)) {
                        deltaValue = parsed;
                    }
                }

                const res = await createFittingAdjustment({
                    fittingSessionId: session.id,
                    expectedSessionRowVersion: session.row_version,
                    idempotencyKey: generateFittingIdempotencyKey('add_adj'),
                    zoneCode,
                    adjustmentKind,
                    description: description.trim(),
                    severity,
                    requiresCadUpdate,
                    deltaMm: deltaValue,
                    workshopNotes: workshopNotes.trim() || null,
                });

                setIsSaving(false);

                if (res.error) {
                    if (res.error.code === M06_ERROR_NAMES.CONCURRENCY_CONFLICT) {
                        setIsConcurrencyConflict(true);
                    }
                    setErrorMessage(res.error.message);
                    return;
                }

                if (res.data?.adjustment) {
                    onSaved(res.data.adjustment, res.data.session);
                    onClose();
                }
            }
        } catch (err: unknown) {
            setIsSaving(false);
            const msg = err instanceof Error ? err.message : 'Error inesperado al guardar ajuste.';
            setErrorMessage(msg);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                {isResolving
                                    ? `Resolver Ajuste · v${initialAdjustment?.row_version}`
                                    : `Anotar Ajuste en Prueba ${session.session_number}`}
                            </Text>
                            <Text style={styles.subtitleEditorial}>
                                {isResolving ? 'Trazabilidad y dictamen de taller' : 'Checklist auditable de corrección física'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Body */}
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Banner de error o conflicto optimista */}
                        {errorMessage && (
                            <View
                                style={[
                                    styles.feedbackBanner,
                                    isConcurrencyConflict ? styles.concurrencyBanner : styles.errorBanner,
                                ]}
                            >
                                <Text style={isConcurrencyConflict ? styles.concurrencyText : styles.errorText}>
                                    {isConcurrencyConflict ? '⚠️ ' : '❌ '}
                                    {errorMessage}
                                </Text>
                                <TouchableOpacity
                                    style={styles.bannerDismissBtn}
                                    onPress={() => setErrorMessage(null)}
                                >
                                    <Text style={styles.bannerDismissText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {isResolving ? (
                            <>
                                <View style={[styles.notesBlock, { marginBottom: 12 }]}>
                                    <Text style={styles.metaLabel}>Ajuste a Resolver:</Text>
                                    <Text style={[styles.titleEditorial, { fontSize: 15 }]}>
                                        {initialAdjustment?.description}
                                    </Text>
                                    <Text style={styles.traceabilityText}>
                                        Zona: {initialAdjustment?.zone_code} · Severidad: {initialAdjustment?.severity}
                                    </Text>
                                </View>

                                {/* Selector de estado destino */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Dictamen o Acción:</Text>
                                    <View style={styles.chipGroup}>
                                        {(['applied', 'verified', 'waived', 'cancelled'] as FittingAdjustmentStatus[]).map(
                                            (st) => {
                                                const active = targetStatus === st;
                                                const disabledWaiver = st === 'waived' && isCritical;

                                                return (
                                                    <TouchableOpacity
                                                        key={st}
                                                        style={[
                                                            styles.chipItem,
                                                            active && styles.chipItemActive,
                                                            disabledWaiver && styles.disabledBtn,
                                                        ]}
                                                        disabled={disabledWaiver}
                                                        onPress={() => setTargetStatus(st)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                            {st === 'applied' && '✂️ Aplicado en Taller'}
                                                            {st === 'verified' && '✓ Verificado Conforme'}
                                                            {st === 'waived' && (disabledWaiver ? 'Dispensa Bloqueada' : '✦ Dispensar')}
                                                            {st === 'cancelled' && '✕ Descartar'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            }
                                        )}
                                    </View>
                                </View>

                                {targetStatus === 'waived' && isCritical && (
                                    <View style={[styles.feedbackBanner, styles.errorBanner]}>
                                        <Text style={styles.errorText}>
                                            🔒 Regla de Alta Costura: este ajuste fue marcado como crítico y no puede ser dispensado. Debe verificarse conforme en una prueba física.
                                        </Text>
                                    </View>
                                )}

                                {(targetStatus === 'waived' || targetStatus === 'cancelled') && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>
                                            Motivo / Justificación {targetStatus === 'waived' ? 'de Dispensa' : 'de Descarte'} *
                                        </Text>
                                        <TextInput
                                            style={[styles.textInput, styles.textArea]}
                                            value={reason}
                                            onChangeText={setReason}
                                            placeholder="Detalla el motivo técnico o la decisión consensuada con la clienta..."
                                            placeholderTextColor="#968A7E"
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>
                                )}

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Notas de Taller (Opcional)</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.textArea]}
                                        value={workshopNotes}
                                        onChangeText={setWorkshopNotes}
                                        placeholder="Puntadas empleadas, hilván o indicaciones para acabados..."
                                        placeholderTextColor="#968A7E"
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>
                            </>
                        ) : (
                            <>
                                {/* Selector de Zona Anatómica */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Zona Anatómica (15 Zonas Canónicas):</Text>
                                    <View style={styles.chipGroup}>
                                        {FITTING_ZONE_OPTIONS.map((z) => {
                                            const active = zoneCode === z.id;
                                            return (
                                                <TouchableOpacity
                                                    key={z.id}
                                                    style={[styles.chipItem, active && styles.chipItemActive]}
                                                    onPress={() => setZoneCode(z.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                        {z.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Naturaleza del Ajuste */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Técnica / Naturaleza de Corrección:</Text>
                                    <View style={styles.chipGroup}>
                                        {FITTING_KIND_OPTIONS.map((k) => {
                                            const active = adjustmentKind === k.id;
                                            return (
                                                <TouchableOpacity
                                                    key={k.id}
                                                    style={[styles.chipItem, active && styles.chipItemActive]}
                                                    onPress={() => setAdjustmentKind(k.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                        {k.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Severidad */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Severidad del Ajuste:</Text>
                                    <View style={styles.chipGroup}>
                                        {FITTING_SEVERITY_OPTIONS.map((s) => {
                                            const active = severity === s.id;
                                            return (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    style={[
                                                        styles.chipItem,
                                                        active && {
                                                            backgroundColor: s.id === 'critical' ? '#9E3B3B' : '#171411',
                                                            borderColor: s.id === 'critical' ? '#9E3B3B' : '#171411',
                                                        },
                                                    ]}
                                                    onPress={() => setSeverity(s.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                        {s.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.formHelpText}>
                                        {severity === 'critical'
                                            ? '⚠️ Crítico: Prohíbe dispensa en base de datos. Exige verificación conforme obligatoria.'
                                            : 'Permite dispensa justificada con motivo auditable si es necesario.'}
                                    </Text>
                                </View>

                                {/* Descripción y delta */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Descripción de la Corrección *</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Ej: Entallar 1.5 cm en costado izquierdo y bajar sisa 5 mm"
                                        placeholderTextColor="#968A7E"
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                                    <View style={[styles.formGroup, { flex: 1, minWidth: 140 }]}>
                                        <Text style={styles.formLabel}>Variación (Delta en mm)</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={deltaMm}
                                            onChangeText={setDeltaMm}
                                            placeholder="Ej: 15 (o -10)"
                                            placeholderTextColor="#968A7E"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Notas para el Taller de Costura</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.textArea]}
                                        value={workshopNotes}
                                        onChangeText={setWorkshopNotes}
                                        placeholder="Indicaciones para descoser, hilvanar o planchar..."
                                        placeholderTextColor="#968A7E"
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>

                                {/* Switch de ajuste CAD */}
                                <View style={styles.formGroup}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                        onPress={() => setRequiresCadUpdate(!requiresCadUpdate)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.checkbox, requiresCadUpdate && styles.checkboxChecked]}>
                                            {requiresCadUpdate && <Text style={styles.checkboxCheckText}>✓</Text>}
                                        </View>
                                        <Text style={styles.checklistLabel}>
                                            Requiere actualización paramétrica en el patrón CAD (M02)
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={isSaving}>
                            <Text style={styles.secondaryBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryBtn, isSaving && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={isSaving}
                            activeOpacity={0.8}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#F8F2E9" />
                            ) : (
                                <Text style={styles.primaryBtnText}>
                                    {isResolving ? 'Aplicar Dictamen' : 'Registrar Ajuste'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

