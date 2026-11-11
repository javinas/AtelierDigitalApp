// ==============================================================================
// MODAL: CREAR GRUPO O NÚCLEO
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { GroupType, GROUP_TYPE_LABELS } from '../../../types/personGroup';
import { styles } from './personGroupStyles';

interface GroupFormModalProps {
    visible: boolean;
    groupName: string;
    setGroupName: (val: string) => void;
    groupType: GroupType;
    setGroupType: (type: GroupType) => void;
    groupNotes: string;
    setGroupNotes: (val: string) => void;
    savingGroup: boolean;
    onSave: () => void;
    onClose: () => void;
}

export function GroupFormModal({
    visible,
    groupName,
    setGroupName,
    groupType,
    setGroupType,
    groupNotes,
    setGroupNotes,
    savingGroup,
    onSave,
    onClose,
}: GroupFormModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalDialog}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Crear Grupo o Núcleo</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View>
                        <Text style={styles.formLabel}>Nombre del Grupo *</Text>
                        <TextInput
                            style={styles.formInput}
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder="Ej: Familia Gómez / Danza Juvenil 2026"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.formLabel}>Tipo de Agrupación</Text>
                        <View style={styles.categoryPillsRow}>
                            {(['family', 'school', 'corporate', 'atelier', 'other'] as GroupType[]).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.categoryPill, groupType === t && styles.categoryPillActive]}
                                    onPress={() => setGroupType(t)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            groupType === t && styles.categoryPillTextActive,
                                        ]}
                                    >
                                        {GROUP_TYPE_LABELS[t]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>Descripción / Observaciones</Text>
                        <TextInput
                            style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                            value={groupNotes}
                            onChangeText={setGroupNotes}
                            placeholder="Notas sobre el proyecto o encargo grupal..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                        />
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                            <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalSaveBtn}
                            onPress={onSave}
                            disabled={savingGroup}
                        >
                            {savingGroup ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.modalSaveBtnText}>Crear Grupo</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

