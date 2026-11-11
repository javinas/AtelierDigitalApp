// ==============================================================================
// VISTA: FICHAS / TARJETAS TÁCTILES DE PERSONAS (RESPONSIVE TABLET Y MÓVIL)
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    Image,
    Platform,
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

interface PersonCardsViewProps {
    persons: MeasuredPerson[];
    personToGroupMap: Map<string, { id: string; name: string } | MeasurementGroup>;
    demographicAvatars: Record<DemographicCategory, any>;
    onMeasurePerson: (person: MeasuredPerson) => void;
    onViewPersonHistory?: (person: MeasuredPerson) => void;
    onCadPerson: (person: MeasuredPerson) => void;
    onEditPerson: (person: MeasuredPerson) => void;
    onToggleActivePerson: (person: MeasuredPerson) => void;
}

export const PersonCardsView: React.FC<PersonCardsViewProps> = ({
    persons,
    personToGroupMap,
    demographicAvatars,
    onMeasurePerson,
    onViewPersonHistory,
    onCadPerson,
    onEditPerson,
    onToggleActivePerson,
}) => {
    return (
        <View style={styles.cardsContainer}>
            {persons.map((p) => {
                const avatar = demographicAvatars[p.demographic_category];
                const groupInfo = personToGroupMap.get(p.id);
                const isDraft = p.last_session_status === 'draft';
                const isVerified = p.last_session_status === 'verified';
                const isCompleted = p.last_session_status === 'completed';

                return (
                    <View key={p.id} style={styles.personCardItem}>
                        <View style={styles.personCardTopRow}>
                            <View style={styles.personCardIdentity}>
                                {avatar ? (
                                    <Image source={avatar} style={styles.personCardAvatar} resizeMode="contain" />
                                ) : (
                                    <View style={styles.avatarMiniWrap} />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.personCardFullName} numberOfLines={1}>
                                        {p.full_name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <View style={styles.demographicPill}>
                                            <Text style={styles.demographicPillText}>
                                                {DEMOGRAPHIC_LABELS[p.demographic_category]}
                                            </Text>
                                        </View>
                                        <Text style={styles.personCardRefText}>
                                            Ref: {p.reference_id || 'ALUM'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Pastilla de Estado */}
                            {isDraft ? (
                                <View style={styles.statusBadgeDraft}>
                                    <Text style={styles.statusBadgeTextDraft}>⏳ BORRADOR</Text>
                                </View>
                            ) : isVerified ? (
                                <View style={styles.statusBadgeVerified}>
                                    <Text style={styles.statusBadgeTextVerified}>✅ VERIFICADA</Text>
                                </View>
                            ) : isCompleted ? (
                                <View style={styles.statusBadgeCompleted}>
                                    <Text style={styles.statusBadgeTextCompleted}>🛡️ FINALIZADA</Text>
                                </View>
                            ) : (
                                <View style={styles.statusBadgeNone}>
                                    <Text style={styles.statusBadgeTextNone}>○ PENDIENTE</Text>
                                </View>
                            )}
                        </View>

                        {/* Metadatos (Grupo y Fecha de medición) */}
                        <View style={styles.personCardDetailsRow}>
                            <Text style={styles.personCardDetailText} numberOfLines={1}>
                                👥 {groupInfo ? groupInfo.name : 'Sin grupo asignado'}
                            </Text>
                            <Text style={styles.personCardDetailText}>
                                📅 {p.last_session_date ? `Medición: ${p.last_session_date}` : 'Sin medición'}
                            </Text>
                        </View>

                        {/* Botonera de Acciones Táctiles al alcance del dedo */}
                        <View style={styles.personCardActionsRow}>
                            <TouchableOpacity
                                style={styles.personCardMeasureBtn}
                                onPress={() => onMeasurePerson(p)}
                                activeOpacity={0.8}
                                accessibilityLabel="Capturar medidas"
                                {...Platform.select({ web: { title: '📐 Tomar medidas anatómicas' } as any })}
                            >
                                <Text style={styles.personCardMeasureBtnText}>📐 Medir</Text>
                            </TouchableOpacity>

                            {onViewPersonHistory && (
                                <TouchableOpacity
                                    style={styles.personCardIconBtn}
                                    onPress={() => onViewPersonHistory(p)}
                                    activeOpacity={0.8}
                                    accessibilityLabel="Ver historial"
                                    {...Platform.select({ web: { title: '📜 Ver historial de medidas' } as any })}
                                >
                                    <Text style={styles.personCardIconBtnText}>📜 Historial</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.personCardIconBtnCad}
                                onPress={() => onCadPerson(p)}
                                activeOpacity={0.8}
                                accessibilityLabel="Taller CAD"
                                {...Platform.select({ web: { title: '✨ Taller CAD y patronaje digital' } as any })}
                            >
                                <Text style={styles.personCardIconBtnCadText}>✨ CAD</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.personCardIconBtn}
                                onPress={() => onEditPerson(p)}
                                activeOpacity={0.8}
                                accessibilityLabel="Editar persona"
                                {...Platform.select({ web: { title: '✎ Editar datos de la persona' } as any })}
                            >
                                <Text style={styles.personCardIconBtnText}>✎</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.personCardIconBtn, !p.is_active && styles.actionIconBtnInactive]}
                                onPress={() => onToggleActivePerson(p)}
                                activeOpacity={0.8}
                                accessibilityLabel={p.is_active ? 'Desactivar persona' : 'Reactivar persona'}
                                {...Platform.select({ web: { title: p.is_active ? '⊘ Desactivar persona' : '↺ Reactivar persona' } as any })}
                            >
                                <Text style={[styles.personCardIconBtnText, !p.is_active && { color: colors.champagneGold }]}>
                                    {p.is_active ? '⊘' : '↺'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

