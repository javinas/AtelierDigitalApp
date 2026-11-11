// ==============================================================================
// MODAL: GESTIONAR MIEMBROS DE GRUPO
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import {
    DemographicCategory,
    DEMOGRAPHIC_LABELS,
    MeasurementGroup,
    MeasuredPerson,
} from '../../../types/personGroup';
import { styles } from './personGroupStyles';

interface GroupMembersModalProps {
    group: MeasurementGroup | null;
    persons: MeasuredPerson[];
    groupMembers: MeasuredPerson[];
    loadingMembers: boolean;
    onToggleMember: (p: MeasuredPerson) => void;
    onClose: () => void;
}

export function GroupMembersModal({
    group,
    persons,
    groupMembers,
    loadingMembers,
    onToggleMember,
    onClose,
}: GroupMembersModalProps) {
    if (!group) return null;

    return (
        <Modal visible={Boolean(group)} animationType="fade" transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalDialog}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>{group.name}</Text>
                            <Text style={styles.modalSub}>
                                Seleccione las personas que pertenecen a este grupo
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {loadingMembers ? (
                        <ActivityIndicator
                            size="large"
                            color={colors.champagneGold}
                            style={{ marginVertical: 30 }}
                        />
                    ) : (
                        <ScrollView style={{ maxHeight: 380 }}>
                            {persons.length === 0 ? (
                                <Text style={styles.noPersonsHint}>
                                    No hay personas registradas para asignar.
                                </Text>
                            ) : (
                                persons.map((p) => {
                                    const isMember = groupMembers.some((m) => m.id === p.id);
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[
                                                styles.memberCheckRow,
                                                isMember && styles.memberCheckRowActive,
                                            ]}
                                            onPress={() => onToggleMember(p)}
                                        >
                                            <Text style={styles.checkboxIcon}>
                                                {isMember ? '☑' : '☐'}
                                            </Text>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.memberName}>{p.full_name}</Text>
                                                <Text style={styles.memberSub}>
                                                    {DEMOGRAPHIC_LABELS[p.demographic_category as DemographicCategory]}{' '}
                                                    {p.reference_id ? `· ${p.reference_id}` : ''}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    )}

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalSaveBtn} onPress={onClose}>
                            <Text style={styles.modalSaveBtnText}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
