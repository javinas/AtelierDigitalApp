// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: MODAL DE CEREMONIAL DE ENTREGA FINAL
// Archivo: src/components/fitting/DeliveryCeremonyModal.tsx
// ==============================================================================
// Confirma la entrega solemne de la prenda de alta costura, checklist de satisfacción,
// fecha efectiva local, soporte de acta firmada y sellado inmutable en M03/M06.
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
import * as ImagePicker from 'expo-image-picker';
import {
    FittingDeliveryChecklist,
    FittingSession,
    M06_ERROR_NAMES,
} from '../../types/fitting';
import {
    confirmCreationDelivery,
    generateFittingIdempotencyKey,
    getLocalIsoDate,
} from '../../services/fittingService';
import { fittingStyles as styles } from './fittingStyles';

export interface DeliveryCeremonyModalProps {
    visible: boolean;
    session: FittingSession;
    creationName?: string;
    clientName?: string;
    pendingBalanceInfo?: string | null;
    isFinanciallyCleared?: boolean;
    balancePendingAmount?: number | null;
    currency?: string | null;
    onClose: () => void;
    onDelivered: (updatedSession: FittingSession) => void;
}

export const DeliveryCeremonyModal: React.FC<DeliveryCeremonyModalProps> = ({
    visible,
    session,
    creationName = 'Pieza de Alta Costura',
    clientName = 'Clienta de Atelier',
    pendingBalanceInfo,
    isFinanciallyCleared,
    balancePendingAmount,
    currency = 'COP',
    onClose,
    onDelivered,
}) => {
    const [localDate, setLocalDate] = useState(getLocalIsoDate());
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [actaFileUri, setActaFileUri] = useState<string | null>(null);
    const [actaFileName, setActaFileName] = useState<string | null>(null);

    // Checklist interactivo ceremonial
    const [checklist, setChecklist] = useState<FittingDeliveryChecklist>({
        calce_general: true,
        ruedo_bastilla: true,
        cremallera_botones: true,
        limpieza_planchado: true,
        empaque_perchas: true,
        accesorios_entregados: true,
        client_satisfaction_confirmed: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConcurrencyConflict, setIsConcurrencyConflict] = useState(false);

    const toggleChecklistItem = (key: keyof FittingDeliveryChecklist) => {
        setChecklist((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handlePickActa = async () => {
        setErrorMessage(null);
        try {
            const permRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permRes.granted) {
                setErrorMessage('Permiso denegado para adjuntar acta de entrega.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.85,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const picked = result.assets[0];
            setActaFileUri(picked.uri);
            setActaFileName(picked.fileName || `acta_entrega_${Date.now()}.jpg`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al seleccionar documento de acta.';
            setErrorMessage(msg);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!checklist.client_satisfaction_confirmed) {
            setErrorMessage('Se requiere constancia de satisfacción confirmada por la clienta para proceder con el ceremonial.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);
        setIsConcurrencyConflict(false);

        try {
            const res = await confirmCreationDelivery({
                sessionId: session.id,
                expectedRowVersion: session.row_version,
                idempotencyKey: generateFittingIdempotencyKey('delivery'),
                deliveryNotes: deliveryNotes.trim() || null,
                deliveryChecklist: checklist,
                localDate: localDate.trim() || getLocalIsoDate(),
                creationId: session.creation_id,
                actaFileUri,
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
                onDelivered(res.data.session);
                onClose();
            }
        } catch (err: unknown) {
            setIsSubmitting(false);
            const msg = err instanceof Error ? err.message : 'Error inesperado al confirmar entrega.';
            setErrorMessage(msg);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalContainer, { maxWidth: 580 }]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: '#8A6A4A' }]}>
                                👑 Ceremonial de Entrega Final
                            </Text>
                            <Text style={styles.subtitleEditorial}>
                                {creationName} · {clientName}
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

                        {/* Estado Financiero Informativo M07 (Paz y Salvo vs Saldo Pendiente) */}
                        {isFinanciallyCleared ? (
                            <View style={[styles.notesBlock, { backgroundColor: '#F4F8F4', borderLeftColor: '#4A7C59' }]}>
                                <Text style={[styles.metaLabel, { color: '#2E5A39', fontWeight: '700' }]}>
                                    ✦ Paz y Salvo Financiero Confirmado (M07):
                                </Text>
                                <Text style={[styles.notesText, { color: '#2E5A39' }]}>
                                    Esta creación de alta costura se encuentra 100% saldada en el Atelier.
                                </Text>
                            </View>
                        ) : (pendingBalanceInfo || (balancePendingAmount !== undefined && balancePendingAmount !== null && balancePendingAmount > 0)) ? (
                            <View style={[styles.notesBlock, { backgroundColor: '#FFF9ED', borderLeftColor: '#A78350' }]}>
                                <Text style={[styles.metaLabel, { color: '#8A6A4A', fontWeight: '700' }]}>
                                    Nota Financiera de Atelier (M07 — Informativo):
                                </Text>
                                <Text style={styles.notesText}>
                                    {pendingBalanceInfo ||
                                        `Esta creación registra un saldo pendiente de ${currency === 'USD' ? '$' + Number(balancePendingAmount).toLocaleString() + ' USD' : '$' + Number(balancePendingAmount).toLocaleString() + ' COP'}. La clienta puede cancelar en el momento de la entrega o Katherine Carroll puede autorizar crédito comercial.`}
                                </Text>
                                <Text style={[styles.formHelpText, { color: '#8A6A4A', marginTop: 4 }]}>
                                    * Aviso no bloqueante: la entrega física puede concretarse libremente según la autonomía y criterio de la diseñadora.
                                </Text>
                            </View>
                        ) : null}

                        {/* Fecha de Entrega Local Efectiva */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Fecha de Entrega Efectiva (YYYY-MM-DD) *</Text>
                            <TextInput
                                style={styles.textInput}
                                value={localDate}
                                onChangeText={setLocalDate}
                                placeholder="2026-11-15"
                                placeholderTextColor="#968A7E"
                            />
                            <Text style={styles.formHelpText}>
                                Fecha local del atelier que quedará registrada de forma inmutable en el expediente.
                            </Text>
                        </View>

                        {/* Checklist Ceremonial */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Lista de Verificación de Entrega:</Text>

                            <TouchableOpacity
                                style={styles.checklistRow}
                                onPress={() => toggleChecklistItem('calce_general')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, checklist.calce_general && styles.checkboxChecked]}>
                                    {checklist.calce_general && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Calce & postura anatómica impecable comprobada en prueba final.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checklistRow}
                                onPress={() => toggleChecklistItem('ruedo_bastilla')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, checklist.ruedo_bastilla && styles.checkboxChecked]}>
                                    {checklist.ruedo_bastilla && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Bastilla y largo de ruedo nivelados con el calzado de ocasión.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checklistRow}
                                onPress={() => toggleChecklistItem('cremallera_botones')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, checklist.cremallera_botones && styles.checkboxChecked]}>
                                    {checklist.cremallera_botones && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Cierres, corchetes, botonadura y ojales verificados en postura.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checklistRow}
                                onPress={() => toggleChecklistItem('limpieza_planchado')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, checklist.limpieza_planchado && styles.checkboxChecked]}>
                                    {checklist.limpieza_planchado && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Planchado sastre de alta costura y limpieza textil completada.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checklistRow}
                                onPress={() => toggleChecklistItem('empaque_perchas')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, checklist.empaque_perchas && styles.checkboxChecked]}>
                                    {checklist.empaque_perchas && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Empaque de autor, percha de madera y porta-trajes de protección.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checklistRow}
                                onPress={() => toggleChecklistItem('accesorios_entregados')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.checkbox, checklist.accesorios_entregados && styles.checkboxChecked]}>
                                    {checklist.accesorios_entregados && <Text style={styles.checkboxCheckText}>✓</Text>}
                                </View>
                                <Text style={styles.checklistLabel}>
                                    Accesorios de autor incluidos (velo, cinturón, estuche o lazo).
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.checklistRow, { borderBottomWidth: 0, marginTop: 4 }]}
                                onPress={() => toggleChecklistItem('client_satisfaction_confirmed')}
                                activeOpacity={0.8}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        checklist.client_satisfaction_confirmed && {
                                            backgroundColor: '#A78350',
                                            borderColor: '#A78350',
                                        },
                                    ]}
                                >
                                    {checklist.client_satisfaction_confirmed && (
                                        <Text style={styles.checkboxCheckText}>✓</Text>
                                    )}
                                </View>
                                <Text style={[styles.checklistLabel, { fontWeight: '700', color: '#8A6A4A' }]}>
                                    Plena satisfacción y conformidad expresa de la clienta (Obligatorio).
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Adjuntar soporte o acta de entrega */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Soporte / Acta de Entrega Firmada (Opcional)</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.secondaryBtn, { flex: 1 }]}
                                    onPress={handlePickActa}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.secondaryBtnText}>
                                        {actaFileName ? `📄 ${actaFileName}` : '📷 Adjuntar Foto / Documento de Acta'}
                                    </Text>
                                </TouchableOpacity>
                                {actaFileUri && (
                                    <TouchableOpacity
                                        style={styles.dangerBtn}
                                        onPress={() => {
                                            setActaFileUri(null);
                                            setActaFileName(null);
                                        }}
                                    >
                                        <Text style={styles.dangerBtnText}>✕</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Observaciones solemnes de entrega */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Notas y Observaciones de Entrega</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={deliveryNotes}
                                onChangeText={setDeliveryNotes}
                                placeholder="Agradecimientos, recomendaciones de conservación o notas especiales..."
                                placeholderTextColor="#968A7E"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Advertencia de irreversibilidad */}
                        <View style={[styles.notesBlock, { backgroundColor: '#FAF5EE' }]}>
                            <Text style={[styles.metaLabel, { color: '#8A6A4A' }]}>✦ Efectos en el Atelier:</Text>
                            <Text style={styles.notesText}>
                                Al confirmar la entrega, la creación pasará a estado completado/entregada, esta sesión se sellará de forma definitiva y se emitirá el evento comercial de cierre.
                            </Text>
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
                                { backgroundColor: '#A78350' },
                                isSubmitting && styles.disabledBtn,
                            ]}
                            onPress={handleConfirmDelivery}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#F8F2E9" />
                            ) : (
                                <Text style={styles.primaryBtnText}>👑 Confirmar Entrega Solemne</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

