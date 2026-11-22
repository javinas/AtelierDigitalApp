// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: MODAL DE APROBACIÓN FÍSICA DE CALCE
// Archivo: src/components/fitting/FittingApprovalModal.tsx
// ==============================================================================
// Dictamen explícito de calce diferenciando con rigor:
// 1) Aprobación Intermedia (glasilla/hilván superado; siguen pruebas)
// 2) Calce Final Listo para Entrega (habilita ceremonial de entrega si 0 ajustes)
// ==============================================================================

import React, { useState } from 'react';
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
    FittingApprovalScope,
    FittingSession,
    M06_ERROR_NAMES,
} from '../../types/fitting';
import {
    approveFittingSession,
    generateFittingIdempotencyKey,
} from '../../services/fittingService';
import { FITTING_ROUND_LABELS } from './fittingLabels';
import { fittingStyles as styles } from './fittingStyles';

export interface FittingApprovalModalProps {
    visible: boolean;
    session: FittingSession;
    openAdjustmentsInCreationCount?: number;
    onClose: () => void;
    onApproved: (updatedSession: FittingSession) => void;
}

export const FittingApprovalModal: React.FC<FittingApprovalModalProps> = ({
    visible,
    session,
    openAdjustmentsInCreationCount = 0,
    onClose,
    onApproved,
}) => {
    const [approvalScope, setApprovalScope] = useState<FittingApprovalScope>(
        session.round_type === 'final_fitting' ? 'final_for_delivery' : 'intermediate_round'
    );
    const [approvalNotes, setApprovalNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConcurrencyConflict, setIsConcurrencyConflict] = useState(false);

    const roundLabel = FITTING_ROUND_LABELS[session.round_type] || session.round_type;

    const handleApprove = async () => {
        setIsSubmitting(true);
        setErrorMessage(null);
        setIsConcurrencyConflict(false);

        try {
            const res = await approveFittingSession({
                sessionId: session.id,
                expectedRowVersion: session.row_version,
                idempotencyKey: generateFittingIdempotencyKey('approve'),
                approvalScope,
                approvalNotes: approvalNotes.trim() || null,
            });

            setIsSubmitting(false);

            if (res.error) {
                if (res.error.code === M06_ERROR_NAMES.CONCURRENCY_CONFLICT) {
                    setIsConcurrencyConflict(true);
                }
                setErrorMessage(res.error.message);
                return;
            }

            if (res.data?.session) {
                onApproved(res.data.session);
                onClose();
            }
        } catch (err: unknown) {
            setIsSubmitting(false);
            const msg = err instanceof Error ? err.message : 'Error inesperado al aprobar calce.';
            setErrorMessage(msg);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalContainer, { maxWidth: 560 }]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                Dictamen de Aprobación · Prueba {session.session_number}
                            </Text>
                            <Text style={styles.subtitleEditorial}>{roundLabel} · Atelier By Katherine Carroll</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Body */}
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Banner de error inline */}
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

                        {/* Alerta de ajustes abiertos en la creación si elige final_for_delivery */}
                        {openAdjustmentsInCreationCount > 0 && approvalScope === 'final_for_delivery' && (
                            <View style={[styles.feedbackBanner, styles.errorBanner]}>
                                <Text style={styles.errorText}>
                                    ⚠️ Atención: Existen {openAdjustmentsInCreationCount} ajuste(s) abierto(s) en la prenda. Puedes aprobar el calce final, pero la confirmación de entrega solo se habilitará cuando todos los ajustes queden resueltos conforme en taller.
                                </Text>
                            </View>
                        )}

                        {/* Selector bifurcado de Alcance de Aprobación */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Alcance de la Aprobación Física *</Text>

                            <TouchableOpacity
                                style={[
                                    styles.notesBlock,
                                    approvalScope === 'intermediate_round' && {
                                        borderLeftColor: '#171411',
                                        backgroundColor: '#FAF5EE',
                                    },
                                    { cursor: 'pointer' as any },
                                ]}
                                onPress={() => setApprovalScope('intermediate_round')}
                                activeOpacity={0.85}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={[styles.checkbox, approvalScope === 'intermediate_round' && styles.checkboxChecked]}>
                                        {approvalScope === 'intermediate_round' && <Text style={styles.checkboxCheckText}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.titleEditorial, { fontSize: 14 }]}>
                                            1. Aprobación de Ronda Intermedia
                                        </Text>
                                        <Text style={styles.subtitleEditorial}>
                                            Glasilla, muselina o hilván inicial conforme. Se superó esta fase y se continuará con las siguientes pruebas de taller en tela definitiva.
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.notesBlock,
                                    approvalScope === 'final_for_delivery' && {
                                        borderLeftColor: '#A78350',
                                        backgroundColor: '#F7F2E7',
                                    },
                                    { cursor: 'pointer' as any },
                                ]}
                                onPress={() => setApprovalScope('final_for_delivery')}
                                activeOpacity={0.85}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={[styles.checkbox, approvalScope === 'final_for_delivery' && styles.checkboxChecked]}>
                                        {approvalScope === 'final_for_delivery' && <Text style={styles.checkboxCheckText}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.titleEditorial, { fontSize: 14, color: '#8A6A4A' }]}>
                                            2. Calce Final Listo para Entrega (final_for_delivery)
                                        </Text>
                                        <Text style={styles.subtitleEditorial}>
                                            Prenda probada con calzado definitivo, bastilla nivelada y acabados impecables. Habilita el ceremonial de entrega final de alta costura.
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Notas de aprobación */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Dictamen & Notas de Aprobación</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={approvalNotes}
                                onChangeText={setApprovalNotes}
                                placeholder="Ej: Calce perfecto en cintura y sisa; clienta satisfecha con caída y volumen."
                                placeholderTextColor="#968A7E"
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={isSubmitting}>
                            <Text style={styles.secondaryBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                approvalScope === 'final_for_delivery' && { backgroundColor: '#A78350' },
                                isSubmitting && styles.disabledBtn,
                            ]}
                            onPress={handleApprove}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#F8F2E9" />
                            ) : (
                                <Text style={styles.primaryBtnText}>
                                    {approvalScope === 'final_for_delivery'
                                        ? '✓ Aprobar Calce Final para Entrega'
                                        : 'Aprobar Ronda Intermedia'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

