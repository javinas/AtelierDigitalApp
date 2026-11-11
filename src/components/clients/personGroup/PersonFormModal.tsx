// ==============================================================================
// MODAL: CREAR / EDITAR PERSONA MEDIDA
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import {
    DemographicCategory,
    DEMOGRAPHIC_LABELS,
    MeasuredPerson,
} from '../../../types/personGroup';
import { styles } from './personGroupStyles';

interface PersonFormModalProps {
    visible: boolean;
    editingPerson: MeasuredPerson | null;
    personFullName: string;
    setPersonFullName: (val: string) => void;
    personCategory: DemographicCategory;
    setPersonCategory: (cat: DemographicCategory) => void;
    personRefId: string;
    setPersonRefId: (val: string) => void;
    personNotes: string;
    setPersonNotes: (val: string) => void;
    savingPerson: boolean;
    onSave: () => void;
    onClose: () => void;
}

export function PersonFormModal({
    visible,
    editingPerson,
    personFullName,
    setPersonFullName,
    personCategory,
    setPersonCategory,
    personRefId,
    setPersonRefId,
    personNotes,
    setPersonNotes,
    savingPerson,
    onSave,
    onClose,
}: PersonFormModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalDialog}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingPerson ? 'Editar Persona Medida' : 'Registrar Nueva Persona'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 420 }}>
                        <Text style={styles.formLabel}>Nombre Completo *</Text>
                        <TextInput
                            style={styles.formInput}
                            value={personFullName}
                            onChangeText={setPersonFullName}
                            placeholder="Ej: Valentina Gómez"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.formLabel}>Categoría Demográfica *</Text>
                        <View style={styles.categoryPillsRow}>
                            {(['woman', 'man', 'girl', 'boy', 'baby'] as DemographicCategory[]).map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.categoryPill, personCategory === cat && styles.categoryPillActive]}
                                    onPress={() => setPersonCategory(cat)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            personCategory === cat && styles.categoryPillTextActive,
                                        ]}
                                    >
                                        {DEMOGRAPHIC_LABELS[cat]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>Referencia / Rol dentro del Grupo (Opcional)</Text>
                        <TextInput
                            style={styles.formInput}
                            value={personRefId}
                            onChangeText={setPersonRefId}
                            placeholder="Ej: Alumna 12 · 4to Grado / Hija Mayor"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.formLabel}>Notas Anatómicas o de Estilo</Text>
                        <TextInput
                            style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                            value={personNotes}
                            onChangeText={setPersonNotes}
                            placeholder="Particularidades corporales o preferencias..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                        />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                            <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalSaveBtn}
                            onPress={onSave}
                            disabled={savingPerson}
                        >
                            {savingPerson ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.modalSaveBtnText}>Guardar Persona</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
