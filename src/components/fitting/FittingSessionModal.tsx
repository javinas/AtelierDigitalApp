// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: MODAL DE PROGRAMACIÓN Y EDICIÓN DE SESIÓN
// Archivo: src/components/fitting/FittingSessionModal.tsx
// ==============================================================================
// Gestiona la creación de una nueva prueba física o la edición de una cita abierta,
// con selección de ronda, tacón, balance, notas y control de concurrencia optimista.
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
    FittingBalanceAssessment,
    FittingRoundType,
    FittingSession,
    M06_ERROR_NAMES,
} from '../../types/fitting';
import {
    createFittingSession,
    generateFittingIdempotencyKey,
    getLocalIsoDate,
    updateFittingSession,
} from '../../services/fittingService';
import {
    FITTING_BALANCE_ASSESSMENT_LABELS,
    FITTING_ROUND_OPTIONS,
} from './fittingLabels';
import { fittingStyles as styles } from './fittingStyles';

export interface FittingSessionModalProps {
    visible: boolean;
    creationId: string;
    initialSession?: FittingSession | null;
    onClose: () => void;
    onSaved: (session: FittingSession) => void;
}

export const FittingSessionModal: React.FC<FittingSessionModalProps> = ({
    visible,
    creationId,
    initialSession,
    onClose,
    onSaved,
}) => {
    const isEditing = Boolean(initialSession && initialSession.id);

    const [roundType, setRoundType] = useState<FittingRoundType>('toile_first');
    const [title, setTitle] = useState('');
    const [scheduledDate, setScheduledDate] = useState(getLocalIsoDate());
    const [conductedDate, setConductedDate] = useState('');
    const [locationNote, setLocationNote] = useState('Atelier Principal · Probador de Autor');
    const [garmentStateNote, setGarmentStateNote] = useState('');
    const [footwearHeelCm, setFootwearHeelCm] = useState('');
    const [balanceAssessment, setBalanceAssessment] = useState<FittingBalanceAssessment>('pending');
    const [summaryNotes, setSummaryNotes] = useState('');
    const [clientFeedbackNotes, setClientFeedbackNotes] = useState('');
    const [requiresCadRevision, setRequiresCadRevision] = useState(false);
    const [status, setStatus] = useState<'scheduled' | 'completed' | 'adjustments_required' | 'cancelled'>('scheduled');
    const [cancellationReason, setCancellationReason] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConcurrencyConflict, setIsConcurrencyConflict] = useState(false);

    useEffect(() => {
        if (initialSession) {
            setRoundType(initialSession.round_type);
            setTitle(initialSession.title);
            setScheduledDate(initialSession.scheduled_at ? initialSession.scheduled_at.slice(0, 10) : getLocalIsoDate());
            setConductedDate(initialSession.conducted_at ? initialSession.conducted_at.slice(0, 10) : '');
            setLocationNote(initialSession.location_note || 'Atelier Principal · Probador de Autor');
            setGarmentStateNote(initialSession.garment_state_note || '');
            setFootwearHeelCm(
                initialSession.footwear_heel_cm !== null && initialSession.footwear_heel_cm !== undefined
                    ? String(initialSession.footwear_heel_cm)
                    : ''
            );
            setBalanceAssessment(initialSession.balance_assessment);
            setSummaryNotes(initialSession.summary_notes || '');
            setClientFeedbackNotes(initialSession.client_feedback_notes || '');
            setRequiresCadRevision(Boolean(initialSession.requires_cad_revision));
            setStatus((initialSession.status as any) || 'scheduled');
            setCancellationReason(initialSession.cancellation_reason || '');
        } else {
            setRoundType('toile_first');
            setTitle('1ª Prueba en Glasilla');
            setScheduledDate(getLocalIsoDate());
            setConductedDate('');
            setLocationNote('Atelier Principal · Probador de Autor');
            setGarmentStateNote('');
            setFootwearHeelCm('');
            setBalanceAssessment('pending');
            setSummaryNotes('');
            setClientFeedbackNotes('');
            setRequiresCadRevision(false);
            setStatus('scheduled');
            setCancellationReason('');
        }
        setErrorMessage(null);
        setIsConcurrencyConflict(false);
    }, [initialSession, visible]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            setErrorMessage('Por favor ingresa un título para la prueba de vestuario.');
            return;
        }

        let heelValue: number | null = null;
        if (footwearHeelCm.trim()) {
            const parsed = parseFloat(footwearHeelCm);
            if (isNaN(parsed) || parsed < 0 || parsed > 25) {
                setErrorMessage('La altura del tacón debe ser un número válido entre 0 y 25 cm.');
                return;
            }
            heelValue = parsed;
        }

        setIsSaving(true);
        setErrorMessage(null);
        setIsConcurrencyConflict(false);

        try {
            if (isEditing && initialSession) {
                const res = await updateFittingSession({
                    sessionId: initialSession.id,
                    expectedRowVersion: initialSession.row_version,
                    idempotencyKey: generateFittingIdempotencyKey('update_session'),
                    title: title.trim(),
                    status,
                    scheduledAt: scheduledDate.trim() ? `${scheduledDate}T10:00:00Z` : null,
                    conductedAt: conductedDate.trim() ? `${conductedDate}T12:00:00Z` : null,
                    locationNote: locationNote.trim() || null,
                    garmentStateNote: garmentStateNote.trim() || null,
                    footwearHeelCm: heelValue,
                    balanceAssessment,
                    summaryNotes: summaryNotes.trim() || null,
                    clientFeedbackNotes: clientFeedbackNotes.trim() || null,
                    requiresCadRevision,
                    cancellationReason: status === 'cancelled' ? cancellationReason.trim() || 'Cancelada en taller' : null,
                });

                setIsSaving(false);

                if (res.error) {
                    if (res.error.code === M06_ERROR_NAMES.CONCURRENCY_CONFLICT) {
                        setIsConcurrencyConflict(true);
                    }
                    setErrorMessage(res.error.message);
                    return;
                }

                if (res.data?.session) {
                    onSaved(res.data.session);
                    onClose();
                }
            } else {
                const res = await createFittingSession({
                    creationId,
                    idempotencyKey: generateFittingIdempotencyKey('create_session'),
                    roundType,
                    title: title.trim(),
                    scheduledAt: scheduledDate.trim() ? `${scheduledDate}T10:00:00Z` : null,
                    conductedAt: conductedDate.trim() ? `${conductedDate}T12:00:00Z` : null,
                    locationNote: locationNote.trim() || null,
                    garmentStateNote: garmentStateNote.trim() || null,
                    footwearHeelCm: heelValue,
                    balanceAssessment,
                    summaryNotes: summaryNotes.trim() || null,
                    clientFeedbackNotes: clientFeedbackNotes.trim() || null,
                    requiresCadRevision,
                    initialStatus: conductedDate.trim() ? 'completed' : 'scheduled',
                });

                setIsSaving(false);

                if (res.error) {
                    setErrorMessage(res.error.message);
                    return;
                }

                if (res.data?.session) {
                    onSaved(res.data.session);
                    onClose();
                }
            }
        } catch (err: unknown) {
            setIsSaving(false);
            const msg = err instanceof Error ? err.message : 'Error inesperado al guardar sesión.';
            setErrorMessage(msg);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    {/* Cabecera */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                {isEditing ? `Editar Prueba · v${initialSession?.row_version}` : 'Programar Nueva Prueba de Calce'}
                            </Text>
                            <Text style={styles.subtitleEditorial}>Atelier de Alta Costura By Katherine Carroll</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Cuerpo del formulario con Scroll */}
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Banner de error o conflicto optimista inline */}
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

                        {/* Selección de Tipo de Ronda */}
                        {!isEditing && (
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Tipo de Ronda Física:</Text>
                                <View style={styles.chipGroup}>
                                    {FITTING_ROUND_OPTIONS.map((opt) => {
                                        const active = roundType === opt.id;
                                        return (
                                            <TouchableOpacity
                                                key={opt.id}
                                                style={[styles.chipItem, active && styles.chipItemActive]}
                                                onPress={() => {
                                                    setRoundType(opt.id);
                                                    if (!title || FITTING_ROUND_OPTIONS.some((o) => o.label === title)) {
                                                        setTitle(opt.label);
                                                    }
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                    {opt.badge}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Título de la prueba */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Título de la Sesión *</Text>
                            <TextInput
                                style={styles.textInput}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Ej: 1ª Prueba en Glasilla · Ajuste de Corpiño"
                                placeholderTextColor="#968A7E"
                            />
                        </View>

                        {/* Fechas de cita y realización */}
                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                            <View style={[styles.formGroup, { flex: 1, minWidth: 140 }]}>
                                <Text style={styles.formLabel}>Fecha Cita (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={scheduledDate}
                                    onChangeText={setScheduledDate}
                                    placeholder="2026-11-15"
                                    placeholderTextColor="#968A7E"
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1, minWidth: 140 }]}>
                                <Text style={styles.formLabel}>Realizada en Fecha</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={conductedDate}
                                    onChangeText={setConductedDate}
                                    placeholder="Opcional si es a futuro"
                                    placeholderTextColor="#968A7E"
                                />
                            </View>
                        </View>

                        {/* Altura de tacón y Ubicación */}
                        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                            <View style={[styles.formGroup, { flex: 1, minWidth: 140 }]}>
                                <Text style={styles.formLabel}>Tacón Calzado (cm)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={footwearHeelCm}
                                    onChangeText={setFootwearHeelCm}
                                    placeholder="Ej: 8.5 (o 0 para plano)"
                                    placeholderTextColor="#968A7E"
                                    keyboardType="numeric"
                                />
                                <Text style={styles.formHelpText}>Referencia para bastilla y ruedo.</Text>
                            </View>
                            <View style={[styles.formGroup, { flex: 1, minWidth: 140 }]}>
                                <Text style={styles.formLabel}>Ubicación / Probador</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={locationNote}
                                    onChangeText={setLocationNote}
                                    placeholder="Atelier Central · Probador 1"
                                    placeholderTextColor="#968A7E"
                                />
                            </View>
                        </View>

                        {/* Estado de la prenda */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Estado de la Prenda al Probar</Text>
                            <TextInput
                                style={styles.textInput}
                                value={garmentStateNote}
                                onChangeText={setGarmentStateNote}
                                placeholder="Ej: Glasilla armada con ballenas base y hombrera derecha hilvanada"
                                placeholderTextColor="#968A7E"
                            />
                        </View>

                        {/* Evaluación de Aplomo y Balance */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Dictamen de Aplomo & Balance:</Text>
                            <View style={styles.chipGroup}>
                                {(['pending', 'balanced', 'minor_tweaks', 'structural_revision'] as FittingBalanceAssessment[]).map(
                                    (bKey) => {
                                        const active = balanceAssessment === bKey;
                                        return (
                                            <TouchableOpacity
                                                key={bKey}
                                                style={[styles.chipItem, active && styles.chipItemActive]}
                                                onPress={() => setBalanceAssessment(bKey)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                    {FITTING_BALANCE_ASSESSMENT_LABELS[bKey]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }
                                )}
                            </View>
                        </View>

                        {/* Notas de calce y clienta */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Notas de Calce y Postura en Taller</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={summaryNotes}
                                onChangeText={setSummaryNotes}
                                placeholder="Observaciones de caída, tensión en costuras o tirantez..."
                                placeholderTextColor="#968A7E"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Percepción de Comodidad de la Clienta</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={clientFeedbackNotes}
                                onChangeText={setClientFeedbackNotes}
                                placeholder="Expresiones de la clienta al caminar, sentarse o respirar..."
                                placeholderTextColor="#968A7E"
                                multiline
                                numberOfLines={2}
                            />
                        </View>

                        {/* Requiere revisión CAD paramétrica */}
                        <View style={styles.formGroup}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                onPress={() => setRequiresCadRevision(!requiresCadRevision)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, requiresCadRevision && styles.checkboxChecked]}>
                                    {requiresCadRevision && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Requiere ajuste o regeneración paramétrica en el motor CAD (M02)
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Si se está editando, opción de cancelar la cita */}
                        {isEditing && (
                            <View style={[styles.notesBlock, { backgroundColor: '#FAF2F2', borderLeftColor: '#9E3B3B' }]}>
                                <Text style={[styles.formLabel, { color: '#9E3B3B' }]}>Estado de la Cita</Text>
                                <View style={styles.chipGroup}>
                                    {(['scheduled', 'completed', 'adjustments_required', 'cancelled'] as const).map((st) => {
                                        const active = status === st;
                                        return (
                                            <TouchableOpacity
                                                key={st}
                                                style={[
                                                    styles.chipItem,
                                                    active && { backgroundColor: st === 'cancelled' ? '#9E3B3B' : '#171411' },
                                                ]}
                                                onPress={() => setStatus(st)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                    {st === 'cancelled' ? '⚠️ Cancelar Cita' : st}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {status === 'cancelled' && (
                                    <View style={{ marginTop: 8 }}>
                                        <Text style={styles.metaLabel}>Motivo de Cancelación Obligatorio:</Text>
                                        <TextInput
                                            style={[styles.textInput, { marginTop: 4 }]}
                                            value={cancellationReason}
                                            onChangeText={setCancellationReason}
                                            placeholder="Ej: Clienta aplazó cita por viaje"
                                            placeholderTextColor="#968A7E"
                                        />
                                    </View>
                                )}
                            </View>
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
                                    {isEditing ? 'Guardar Cambios' : 'Programar Prueba'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

