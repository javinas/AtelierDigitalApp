// ==============================================================================
// CONTENIDO DE PESTAÑA: LISTA DE GRUPOS / NÚCLEOS
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import {
    GROUP_TYPE_LABELS,
    MeasurementGroup,
} from '../../../types/personGroup';
import { styles } from './personGroupStyles';

interface GroupsTabContentProps {
    loading: boolean;
    error: string | null;
    groups: MeasurementGroup[];
    onRetry: () => void;
    onCreateGroup: () => void;
    onManageGroup: (group: MeasurementGroup) => void;
}

export const GroupsTabContent: React.FC<GroupsTabContentProps> = ({
    loading,
    error,
    groups,
    onRetry,
    onCreateGroup,
    onManageGroup,
}) => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.champagneGold} />
                <Text style={styles.loadingText}>Cargando grupos y núcleos...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>Error al cargar grupos</Text>
                <Text style={styles.emptyStateDesc}>{error}</Text>
                <TouchableOpacity style={styles.emptyStateBtn} onPress={onRetry}>
                    <Text style={styles.emptyStateBtnText}>🔄 Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.cardsGrid}>
            {groups.length === 0 ? (
                <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>Sin grupos o núcleos registrados</Text>
                    <Text style={styles.emptyStateDesc}>
                        Agrupe a las personas en núcleos familiares, cursos escolares o divisiones corporativas para organizar encargos de alta costura.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyStateBtn}
                        onPress={onCreateGroup}
                    >
                        <Text style={styles.emptyStateBtnText}>+ Crear Primer Grupo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                groups.map((g) => (
                    <View key={g.id} style={styles.groupCard}>
                        <View style={styles.groupCardHeader}>
                            <View style={styles.groupTypeTag}>
                                <Text style={styles.groupTypeTagText}>
                                    {GROUP_TYPE_LABELS[g.type].toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.groupName}>{g.name}</Text>
                            {g.notes ? <Text style={styles.groupNotes}>{g.notes}</Text> : null}
                        </View>

                        <View style={styles.groupStatsRow}>
                            <Text style={styles.groupMembersCount}>
                                👥 {g.members_count || 0} personas integradas
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.manageGroupBtn}
                            onPress={() => onManageGroup(g)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.manageGroupBtnText}>Gestionar Integrantes →</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </View>
    );
};

