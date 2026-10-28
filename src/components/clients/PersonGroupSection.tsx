// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: SECCIÓN EDITORIAL PERSONAS Y GRUPOS (FASE 1)
// Archivo: src/components/clients/PersonGroupSection.tsx
// ==============================================================================
// Permite a la diseñadora administrar los sujetos anatómicos y agrupaciones
// pertenecientes a un cliente responsable (familia, escuela, empresa).
// Identidad visual de Alta Costura: Marfil, Negro Atelier, Champagne y Arena.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import {
    CreateGroupDTO,
    CreatePersonDTO,
    DemographicCategory,
    DEMOGRAPHIC_LABELS,
    GroupType,
    GROUP_TYPE_LABELS,
    MeasurementGroup,
    MeasuredPerson,
    UpdatePersonDTO,
} from '../../types/personGroup';
import {
    assignPersonToGroup,
    createGroup,
    createPerson,
    fetchClientGroups,
    fetchClientPersons,
    fetchGroupMembers,
    removePersonFromGroup,
    updatePerson,
} from '../../services/personGroupService';
import { MeasurementSession, MeasurementUnit } from '../../types/pattern/measurement';
import { MeasurementSessionModal } from '../pattern/MeasurementSessionModal';
import { MeasurementCampaign, MeasurementCampaignParticipant } from '../../types/pattern/measurementCampaign';
import { MeasurementUsageMode } from '../../types/pattern/measurementTemplate';
import { MEASUREMENT_TEMPLATES, getMeasurementTemplateById } from '../../engine/pattern/catalog/measurementTemplates';
import {
    createMeasurementCampaign,
    fetchClientCampaigns,
    fetchCampaignParticipants,
} from '../../services/measurementCampaignService';
import { MeasurementCampaignFastCaptureModal } from './MeasurementCampaignFastCaptureModal';
import { PrintableMeasurementSheetModal } from '../pattern/PrintableMeasurementSheetModal';
import { PersonCreationCadWizardModal } from '../pattern/PersonCreationCadWizardModal';

const DEMOGRAPHIC_AVATARS: Record<DemographicCategory, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

interface PersonGroupSectionProps {
    client: Client;
    onSessionCreated?: (session: MeasurementSession) => void;
}

export function PersonGroupSection({ client, onSessionCreated }: PersonGroupSectionProps) {
    const [persons, setPersons] = useState<MeasuredPerson[]>([]);
    const [groups, setGroups] = useState<MeasurementGroup[]>([]);
    const [campaigns, setCampaigns] = useState<MeasurementCampaign[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeSubTab, setActiveSubTab] = useState<'persons' | 'groups' | 'campaigns'>('persons');

    // Modales de creación/edición
    const [showPersonModal, setShowPersonModal] = useState<boolean>(false);
    const [editingPerson, setEditingPerson] = useState<MeasuredPerson | null>(null);
    const [personFullName, setPersonFullName] = useState<string>('');
    const [personCategory, setPersonCategory] = useState<DemographicCategory>('woman');
    const [personRefId, setPersonRefId] = useState<string>('');
    const [personNotes, setPersonNotes] = useState<string>('');
    const [savingPerson, setSavingPerson] = useState<boolean>(false);

    const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
    const [groupName, setGroupName] = useState<string>('');
    const [groupType, setGroupType] = useState<GroupType>('family');
    const [groupNotes, setGroupNotes] = useState<string>('');
    const [savingGroup, setSavingGroup] = useState<boolean>(false);

    // Modal de asignación a grupo
    const [selectedGroupForManage, setSelectedGroupForManage] = useState<MeasurementGroup | null>(null);
    const [groupMembers, setGroupMembers] = useState<MeasuredPerson[]>([]);
    const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

    // Modal de toma de medidas desde persona
    const [measuringPerson, setMeasuringPerson] = useState<MeasuredPerson | null>(null);

    // Modal de creación de jornada (Fase 3)
    const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
    const [campaignTitle, setCampaignTitle] = useState<string>('');
    const [campaignGroupId, setCampaignGroupId] = useState<string>('');
    const [campaignDate, setCampaignDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [campaignTemplateId, setCampaignTemplateId] = useState<string>('tmpl_standard_general');
    const [campaignMode, setCampaignMode] = useState<MeasurementUsageMode>('standard_with_adjustments');
    const [campaignUnit, setCampaignUnit] = useState<MeasurementUnit>('cm');
    const [campaignNotes, setCampaignNotes] = useState<string>('');
    const [savingCampaign, setSavingCampaign] = useState<boolean>(false);

    // Modales interactivos de jornada
    const [activeFastCaptureCampaign, setActiveFastCaptureCampaign] = useState<MeasurementCampaign | null>(null);
    const [activePrintCampaign, setActivePrintCampaign] = useState<MeasurementCampaign | null>(null);
    const [printCampaignParticipants, setPrintCampaignParticipants] = useState<MeasurementCampaignParticipant[]>([]);

    // Modal de Creación y Patronaje CAD (Fase 4)
    const [cadPerson, setCadPerson] = useState<MeasuredPerson | null>(null);

    useEffect(() => {
        loadData();
    }, [client.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pList, gList, cList] = await Promise.all([
                fetchClientPersons(client.id),
                fetchClientGroups(client.id),
                fetchClientCampaigns(client.id),
            ]);
            setPersons(pList);
            setGroups(gList);
            setCampaigns(cList);
        } catch (err) {
            console.warn('[PersonGroupSection] Error cargando datos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreatePerson = () => {
        setEditingPerson(null);
        setPersonFullName('');
        setPersonCategory('woman');
        setPersonRefId('');
        setPersonNotes('');
        setShowPersonModal(true);
    };

    const handleOpenEditPerson = (p: MeasuredPerson) => {
        setEditingPerson(p);
        setPersonFullName(p.full_name);
        setPersonCategory(p.demographic_category);
        setPersonRefId(p.reference_id || '');
        setPersonNotes(p.notes || '');
        setShowPersonModal(true);
    };

    const handleSavePerson = async () => {
        if (!personFullName.trim()) {
            Alert.alert('Nombre Requerido', 'Por favor ingrese el nombre completo de la persona.');
            return;
        }

        setSavingPerson(true);
        try {
            if (editingPerson) {
                const res = await updatePerson(editingPerson.id, {
                    full_name: personFullName,
                    demographic_category: personCategory,
                    reference_id: personRefId,
                    notes: personNotes,
                });
                if (res.data) {
                    setPersons((prev) => prev.map((p) => (p.id === editingPerson.id ? res.data! : p)));
                }
            } else {
                const res = await createPerson({
                    client_id: client.id,
                    full_name: personFullName,
                    demographic_category: personCategory,
                    reference_id: personRefId,
                    notes: personNotes,
                });
                if (res.data) {
                    setPersons((prev) => [...prev, res.data!]);
                }
            }
            setShowPersonModal(false);
        } catch (err) {
            console.warn('Error guardando persona:', err);
        } finally {
            setSavingPerson(false);
        }
    };

    const handleToggleActivePerson = async (p: MeasuredPerson) => {
        const nextState = !p.is_active;
        await updatePerson(p.id, { is_active: nextState });
        setPersons((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_active: nextState } : item)));
    };

    const handleSaveGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Nombre Requerido', 'Por favor ingrese el nombre del grupo o núcleo.');
            return;
        }

        setSavingGroup(true);
        try {
            const res = await createGroup({
                client_id: client.id,
                name: groupName,
                type: groupType,
                notes: groupNotes,
            });
            if (res.data) {
                setGroups((prev) => [...prev, res.data!]);
            }
            setShowGroupModal(false);
            setGroupName('');
            setGroupNotes('');
        } catch (err) {
            console.warn('Error creando grupo:', err);
        } finally {
            setSavingGroup(false);
        }
    };

    const handleOpenManageGroup = async (group: MeasurementGroup) => {
        setSelectedGroupForManage(group);
        setLoadingMembers(true);
        try {
            const members = await fetchGroupMembers(group.id);
            setGroupMembers(members);
        } catch (err) {
            console.warn('Error cargando miembros:', err);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleToggleMember = async (person: MeasuredPerson) => {
        if (!selectedGroupForManage) return;
        const isMember = groupMembers.some((m) => m.id === person.id);
        if (isMember) {
            await removePersonFromGroup(selectedGroupForManage.id, person.id);
            setGroupMembers((prev) => prev.filter((m) => m.id !== person.id));
        } else {
            await assignPersonToGroup(selectedGroupForManage.id, person.id);
            setGroupMembers((prev) => [...prev, person]);
        }
        // Actualizar conteo
        loadData();
    };

    const handleOpenCreateCampaign = () => {
        if (groups.length === 0) {
            Alert.alert(
                'Primero cree un grupo',
                'Debe registrar al menos un grupo o núcleo (colegio, familia, dotación) antes de planificar una jornada de medición.'
            );
            return;
        }
        setCampaignTitle('');
        setCampaignGroupId(groups[0].id);
        setCampaignDate(new Date().toISOString().slice(0, 10));
        setCampaignTemplateId('tmpl_standard_general');
        setCampaignMode('standard_with_adjustments');
        setCampaignUnit('cm');
        setCampaignNotes('');
        setShowCampaignModal(true);
    };

    const handleSaveCampaign = async () => {
        if (!campaignTitle.trim()) {
            Alert.alert('Título Requerido', 'Por favor ingrese el título de la jornada.');
            return;
        }
        if (!campaignGroupId) {
            Alert.alert('Grupo Requerido', 'Por favor seleccione el grupo o núcleo objetivo.');
            return;
        }

        setSavingCampaign(true);
        try {
            const res = await createMeasurementCampaign({
                client_id: client.id,
                group_id: campaignGroupId,
                title: campaignTitle,
                campaign_date: campaignDate,
                template_id: campaignTemplateId,
                mode: campaignMode,
                unit_system: campaignUnit,
                notes: campaignNotes,
            });

            if (res.data) {
                setShowCampaignModal(false);
                await loadData();
                setActiveFastCaptureCampaign(res.data);
            } else if (res.error) {
                Alert.alert('Error', res.error);
            }
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Error inesperado creando jornada.');
        } finally {
            setSavingCampaign(false);
        }
    };

    const handleOpenPrintCampaign = async (camp: MeasurementCampaign) => {
        setActivePrintCampaign(camp);
        const parts = await fetchCampaignParticipants(camp.id);
        setPrintCampaignParticipants(parts);
    };

    return (
        <View style={styles.container}>
            {/* Cabecera Editorial de la Sección */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.superTitle}>MÓDULO 02 · GESTIÓN ANATÓMICA Y JORNADAS</Text>
                    <Text style={styles.title}>Personas, Grupos y Jornadas</Text>
                    <Text style={styles.subtitle}>
                        Administre los sujetos medidos, núcleos y jornadas de captura masiva asociadas al responsable comercial.
                    </Text>
                </View>

                <View style={styles.headerActionBtns}>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={handleOpenCreatePerson}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryGoldBtnText}>+ Nueva Persona</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryDarkBtn}
                        onPress={() => setShowGroupModal(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.secondaryDarkBtnText}>+ Nuevo Grupo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.campaignHeaderBtn}
                        onPress={handleOpenCreateCampaign}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.campaignHeaderBtnText}>+ Nueva Jornada</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Pestañas de Navegación Interna */}
            <View style={styles.subTabsRow}>
                <TouchableOpacity
                    style={[styles.subTabBtn, activeSubTab === 'persons' && styles.subTabBtnActive]}
                    onPress={() => setActiveSubTab('persons')}
                >
                    <Text style={[styles.subTabBtnText, activeSubTab === 'persons' && styles.subTabBtnTextActive]}>
                        👤 Personas Medidas ({persons.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.subTabBtn, activeSubTab === 'groups' && styles.subTabBtnActive]}
                    onPress={() => setActiveSubTab('groups')}
                >
                    <Text style={[styles.subTabBtnText, activeSubTab === 'groups' && styles.subTabBtnTextActive]}>
                        👥 Grupos y Núcleos ({groups.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.subTabBtn, activeSubTab === 'campaigns' && styles.subTabBtnActive]}
                    onPress={() => setActiveSubTab('campaigns')}
                >
                    <Text style={[styles.subTabBtnText, activeSubTab === 'campaigns' && styles.subTabBtnTextActive]}>
                        📅 Jornadas de Medición ({campaigns.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={styles.loadingText}>Cargando personas y núcleos del atelier...</Text>
                </View>
            ) : activeSubTab === 'persons' ? (
                /* LISTA DE PERSONAS MEDIDAS */
                <View style={styles.cardsGrid}>
                    {persons.length === 0 ? (
                        <View style={styles.emptyStateCard}>
                            <Text style={styles.emptyStateTitle}>Sin personas registradas aún</Text>
                            <Text style={styles.emptyStateDesc}>
                                Este cliente aún no tiene personas o integrantes asociados. Registre integrantes individuales para tomarles medidas sin convertirlos en clientes comerciales.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStateBtn}
                                onPress={handleOpenCreatePerson}
                            >
                                <Text style={styles.emptyStateBtnText}>+ Registrar Primera Persona</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        persons.map((p) => {
                            const avatar = DEMOGRAPHIC_AVATARS[p.demographic_category];
                            return (
                                <View
                                    key={p.id}
                                    style={[styles.personCard, !p.is_active && styles.personCardInactive]}
                                >
                                    <View style={styles.personCardTop}>
                                        <View style={styles.avatarWrap}>
                                            <Image source={avatar} style={styles.avatarImg} resizeMode="cover" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <View style={styles.demographicBadge}>
                                                <Text style={styles.demographicBadgeText}>
                                                    {DEMOGRAPHIC_LABELS[p.demographic_category].toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.personName}>{p.full_name}</Text>
                                            {p.reference_id ? (
                                                <Text style={styles.personRefText}>Ref: {p.reference_id}</Text>
                                            ) : null}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.editIconBtn}
                                            onPress={() => handleOpenEditPerson(p)}
                                        >
                                            <Text style={styles.editIconText}>✎</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Estado de Medición */}
                                    <View style={styles.sessionStatusBox}>
                                        <Text style={styles.sessionStatusLabel}>ÚLTIMA SESIÓN DE MEDIDAS:</Text>
                                        {p.last_session_id ? (
                                            <Text style={styles.sessionStatusVal}>
                                                Versión v{p.last_session_version || 1} · {p.last_session_date} ({p.last_session_status})
                                            </Text>
                                        ) : (
                                            <Text style={styles.sessionStatusEmpty}>Sin sesión de medidas registrada</Text>
                                        )}
                                    </View>

                                    {/* Acciones de Tarjeta */}
                                    <View style={styles.cardActionsRow}>
                                        <TouchableOpacity
                                            style={styles.takeMeasureBtn}
                                            onPress={() => setMeasuringPerson(p)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.takeMeasureBtnText}>📐 Medir</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.cadPatternBtn}
                                            onPress={() => setCadPerson(p)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.cadPatternBtnText}>✨ Prenda CAD</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.toggleActiveBtn, !p.is_active && styles.toggleActiveBtnInactive]}
                                            onPress={() => handleToggleActivePerson(p)}
                                        >
                                            <Text style={styles.toggleActiveBtnText}>
                                                {p.is_active ? 'Desactivar' : 'Reactivar'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            ) : activeSubTab === 'groups' ? (
                /* LISTA DE GRUPOS / NÚCLEOS */
                <View style={styles.cardsGrid}>
                    {groups.length === 0 ? (
                        <View style={styles.emptyStateCard}>
                            <Text style={styles.emptyStateTitle}>Sin grupos o núcleos registrados</Text>
                            <Text style={styles.emptyStateDesc}>
                                Agrupe a las personas en núcleos familiares, cursos escolares o divisiones corporativas para organizar encargos de alta costura.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStateBtn}
                                onPress={() => setShowGroupModal(true)}
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
                                    onPress={() => handleOpenManageGroup(g)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.manageGroupBtnText}>Gestionar Integrantes →</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            ) : (
                /* LISTA DE JORNADAS DE MEDICIÓN (FASE 3) */
                <View style={styles.cardsGrid}>
                    {campaigns.length === 0 ? (
                        <View style={styles.emptyStateCard}>
                            <Text style={styles.emptyStateTitle}>Sin jornadas de medición planificadas</Text>
                            <Text style={styles.emptyStateDesc}>
                                Organice tomas de medidas masivas para cursos escolares, comparsas, familias o dotaciones corporativas con plantillas predefinidas y fichas imprimibles A4.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStateBtn}
                                onPress={handleOpenCreateCampaign}
                            >
                                <Text style={styles.emptyStateBtnText}>+ Planificar Primera Jornada</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        campaigns.map((camp) => {
                            const isDraft = camp.status === 'draft';
                            const isInProgress = camp.status === 'in_progress';
                            const isCompleted = camp.status === 'completed';

                            const modeLabel =
                                camp.mode === 'standard_only'
                                    ? 'Solo Talla'
                                    : camp.mode === 'standard_with_adjustments'
                                    ? 'Talla + Ajustes'
                                    : 'Medidas Manuales';

                            return (
                                <View key={camp.id} style={styles.campaignCard}>
                                    <View style={styles.campaignCardHeader}>
                                        <View style={styles.campaignBadgeRow}>
                                            <View
                                                style={[
                                                    styles.campaignStatusBadge,
                                                    isCompleted
                                                        ? styles.campaignStatusDone
                                                        : isInProgress
                                                        ? styles.campaignStatusProgress
                                                        : styles.campaignStatusDraft,
                                                ]}
                                            >
                                                <Text style={styles.campaignStatusBadgeText}>
                                                    {isCompleted ? '✓ COMPLETADA' : isInProgress ? '⏳ EN CURSO' : '○ BORRADOR'}
                                                </Text>
                                            </View>

                                            <Text style={styles.campaignDateText}>📅 {camp.campaign_date}</Text>
                                        </View>

                                        <Text style={styles.campaignTitle}>{camp.title}</Text>
                                        <Text style={styles.campaignGroupText}>
                                            Grupo: <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{camp.group_name || 'Grupo'}</Text>
                                        </Text>
                                    </View>

                                    <View style={styles.campaignMetaBox}>
                                        <Text style={styles.campaignMetaText}>
                                            Plantilla: <Text style={{ fontWeight: '600' }}>{camp.template_name || camp.template_id}</Text>
                                        </Text>
                                        <Text style={styles.campaignMetaText}>
                                            Modalidad: <Text style={{ fontWeight: '600' }}>{modeLabel}</Text>
                                        </Text>
                                    </View>

                                    {/* Barra de Progreso */}
                                    <View style={styles.campaignProgressBox}>
                                        <View style={styles.campaignProgressLabels}>
                                            <Text style={styles.campaignProgressCount}>
                                                👥 {camp.completed_count || 0} de {camp.total_participants || 0} personas
                                            </Text>
                                            <Text style={styles.campaignProgressPercent}>
                                                {camp.progress_percentage || 0}%
                                            </Text>
                                        </View>
                                        <View style={styles.campaignProgressTrack}>
                                            <View
                                                style={[
                                                    styles.campaignProgressFill,
                                                    { width: `${camp.progress_percentage || 0}%` },
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    {/* Acciones */}
                                    <View style={styles.campaignCardActionsRow}>
                                        <TouchableOpacity
                                            style={styles.fastCaptureActionBtn}
                                            onPress={() => setActiveFastCaptureCampaign(camp)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.fastCaptureActionBtnText}>⚡ Captura Rápida</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.printSheetActionBtn}
                                            onPress={() => handleOpenPrintCampaign(camp)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.printSheetActionBtnText}>📄 Fichas A4</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            )}

            {/* MODAL: CREAR / EDITAR PERSONA */}
            <Modal visible={showPersonModal} animationType="fade" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalDialog}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingPerson ? 'Editar Persona Medida' : 'Registrar Nueva Persona'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowPersonModal(false)}>
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
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowPersonModal(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSavePerson}
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

            {/* MODAL: CREAR GRUPO */}
            <Modal visible={showGroupModal} animationType="fade" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalDialog}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Crear Grupo o Núcleo</Text>
                            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
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
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowGroupModal(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSaveGroup}
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

            {/* MODAL: GESTIONAR MIEMBROS DE GRUPO */}
            <Modal visible={Boolean(selectedGroupForManage)} animationType="fade" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalDialog}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{selectedGroupForManage?.name}</Text>
                                <Text style={styles.modalSub}>
                                    Seleccione las personas que pertenecen a este grupo
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedGroupForManage(null)}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingMembers ? (
                            <ActivityIndicator size="large" color={colors.champagneGold} style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 380 }}>
                                {persons.length === 0 ? (
                                    <Text style={styles.noPersonsHint}>No hay personas registradas para asignar.</Text>
                                ) : (
                                    persons.map((p) => {
                                        const isMember = groupMembers.some((m) => m.id === p.id);
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[styles.memberCheckRow, isMember && styles.memberCheckRowActive]}
                                                onPress={() => handleToggleMember(p)}
                                            >
                                                <Text style={styles.checkboxIcon}>{isMember ? '☑' : '☐'}</Text>
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.memberName}>{p.full_name}</Text>
                                                    <Text style={styles.memberSub}>
                                                        {DEMOGRAPHIC_LABELS[p.demographic_category]} {p.reference_id ? `· ${p.reference_id}` : ''}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>
                        )}

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={() => setSelectedGroupForManage(null)}
                            >
                                <Text style={styles.modalSaveBtnText}>Listo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE TOMA DE MEDIDAS CONECTADO A LA PERSONA */}
            {measuringPerson && (
                <MeasurementSessionModal
                    visible={Boolean(measuringPerson)}
                    client={client}
                    person={measuringPerson}
                    onClose={() => setMeasuringPerson(null)}
                    onSessionCreated={(session) => {
                        setMeasuringPerson(null);
                        loadData();
                        onSessionCreated?.(session);
                    }}
                />
            )}

            {/* MODAL: PLANIFICAR JORNADA DE MEDICIÓN (FASE 3) */}
            <Modal visible={showCampaignModal} animationType="fade" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalDialog, { maxWidth: 540 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Planificar Jornada de Medición</Text>
                                <Text style={styles.modalSub}>
                                    Organice la captura masiva para un grupo con una plantilla especializada
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCampaignModal(false)}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 460 }}>
                            <Text style={styles.formLabel}>Título / Referencia de la Jornada *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={campaignTitle}
                                onChangeText={setCampaignTitle}
                                placeholder="Ej: Toma de Medidas Promoción 2027"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.formLabel}>Grupo / Núcleo Destino *</Text>
                            <View style={styles.categoryPillsRow}>
                                {groups.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[styles.categoryPill, campaignGroupId === g.id && styles.categoryPillActive]}
                                        onPress={() => setCampaignGroupId(g.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryPillText,
                                                campaignGroupId === g.id && styles.categoryPillTextActive,
                                            ]}
                                        >
                                            {g.name} ({g.members_count || 0})
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Plantilla de Medidas Reutilizable *</Text>
                            <View style={styles.categoryPillsRow}>
                                {MEASUREMENT_TEMPLATES.map((tmpl) => (
                                    <TouchableOpacity
                                        key={tmpl.id}
                                        style={[
                                            styles.categoryPill,
                                            campaignTemplateId === tmpl.id && styles.categoryPillActive,
                                        ]}
                                        onPress={() => setCampaignTemplateId(tmpl.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryPillText,
                                                campaignTemplateId === tmpl.id && styles.categoryPillTextActive,
                                            ]}
                                        >
                                            {tmpl.name} ({tmpl.measurement_codes.length})
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Modalidad de Captura</Text>
                            <View style={styles.categoryPillsRow}>
                                {[
                                    { key: 'standard_with_adjustments', label: 'Talla + Ajustes' },
                                    { key: 'standard_only', label: 'Solo Talla' },
                                    { key: 'manual_direct', label: 'Medidas Manuales' },
                                ].map((m) => (
                                    <TouchableOpacity
                                        key={m.key}
                                        style={[styles.categoryPill, campaignMode === m.key && styles.categoryPillActive]}
                                        onPress={() => setCampaignMode(m.key as MeasurementUsageMode)}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryPillText,
                                                campaignMode === m.key && styles.categoryPillTextActive,
                                            ]}
                                        >
                                            {m.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Sistema de Unidades</Text>
                            <View style={styles.categoryPillsRow}>
                                {(['cm', 'mm', 'in'] as MeasurementUnit[]).map((u) => (
                                    <TouchableOpacity
                                        key={u}
                                        style={[styles.categoryPill, campaignUnit === u && styles.categoryPillActive]}
                                        onPress={() => setCampaignUnit(u)}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryPillText,
                                                campaignUnit === u && styles.categoryPillTextActive,
                                            ]}
                                        >
                                            {u.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Notas de la Jornada (Opcional)</Text>
                            <TextInput
                                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                                value={campaignNotes}
                                onChangeText={setCampaignNotes}
                                placeholder="Observaciones logísticas o de confección..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowCampaignModal(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSaveCampaign}
                                disabled={savingCampaign}
                            >
                                {savingCampaign ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalSaveBtnText}>Planificar e Iniciar Captura</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE CAPTURA RÁPIDA DE JORNADA */}
            {activeFastCaptureCampaign && (
                <MeasurementCampaignFastCaptureModal
                    visible={Boolean(activeFastCaptureCampaign)}
                    campaign={activeFastCaptureCampaign}
                    client={client}
                    onClose={() => {
                        setActiveFastCaptureCampaign(null);
                        loadData();
                    }}
                    onCampaignUpdated={() => loadData()}
                />
            )}

            {/* MODAL DE FICHAS IMPRIMIBLES A4 */}
            {activePrintCampaign && (
                <PrintableMeasurementSheetModal
                    visible={Boolean(activePrintCampaign)}
                    campaign={activePrintCampaign}
                    template={getMeasurementTemplateById(activePrintCampaign.template_id) || MEASUREMENT_TEMPLATES[0]}
                    participants={printCampaignParticipants}
                    clientName={client.full_name}
                    onClose={() => setActivePrintCampaign(null)}
                />
            )}

            {/* MODAL DE CREACIÓN Y PATRONAJE CAD (FASE 4) */}
            {cadPerson && (
                <PersonCreationCadWizardModal
                    visible={Boolean(cadPerson)}
                    client={client}
                    person={cadPerson}
                    onClose={() => {
                        setCadPerson(null);
                        loadData();
                    }}
                    onCadExecutionGenerated={() => {
                        loadData();
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        backgroundColor: colors.ivoryWarm, // Marfil #F8F2E9
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand, // Arena #E6D9C8
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#EFE7DC',
        paddingBottom: 16,
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
    },
    superTitle: {
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: {
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.textSecondary,
        maxWidth: 550,
    },
    headerActionBtns: {
        flexDirection: 'row',
        gap: 8,
    },
    primaryGoldBtn: {
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    primaryGoldBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    secondaryDarkBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    secondaryDarkBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    subTabsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    subTabBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    subTabBtnActive: {
        backgroundColor: '#FAF6F0',
        borderColor: colors.champagneGold,
    },
    subTabBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    subTabBtnTextActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: colors.textSecondary,
        fontSize: 12,
    },
    cardsGrid: {
        gap: 12,
    },
    emptyStateCard: {
        backgroundColor: '#FAF6F0',
        padding: 30,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFE7DC',
    },
    emptyStateTitle: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 6,
    },
    emptyStateDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 480,
        lineHeight: 18,
        marginBottom: 16,
    },
    emptyStateBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 4,
    },
    emptyStateBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    personCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    personCardInactive: {
        opacity: 0.6,
        backgroundColor: '#F9F9F9',
    },
    personCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF6F0',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    demographicBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        marginBottom: 3,
    },
    demographicBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8C6826',
        letterSpacing: 0.5,
    },
    personName: {
        fontFamily: typography.serif,
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    personRefText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    editIconBtn: {
        padding: 8,
    },
    editIconText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    sessionStatusBox: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
    },
    sessionStatusLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    sessionStatusVal: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    sessionStatusEmpty: {
        fontSize: 11.5,
        fontStyle: 'italic',
        color: colors.textMuted,
    },
    cardActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    takeMeasureBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    takeMeasureBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    cadPatternBtn: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    cadPatternBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    toggleActiveBtn: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    toggleActiveBtnInactive: {
        backgroundColor: '#EFE7DC',
    },
    toggleActiveBtnText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    groupCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
    },
    groupCardHeader: {
        marginBottom: 8,
    },
    groupTypeTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        marginBottom: 4,
    },
    groupTypeTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    groupName: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    groupNotes: {
        fontSize: 11.5,
        color: colors.textSecondary,
        marginTop: 2,
    },
    groupStatsRow: {
        marginVertical: 8,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F0ECE4',
    },
    groupMembersCount: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    manageGroupBtn: {
        alignSelf: 'flex-start',
        backgroundColor: colors.champagneGold,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginTop: 4,
    },
    manageGroupBtnText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '700',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        width: '100%',
        maxWidth: 520,
        padding: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#EFE7DC',
        paddingBottom: 10,
        marginBottom: 14,
    },
    modalTitle: {
        fontFamily: typography.serif,
        fontSize: 17,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    modalSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    closeBtnText: {
        fontSize: 18,
        color: colors.textSecondary,
        padding: 4,
    },
    formLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
        marginTop: 8,
        letterSpacing: 0.3,
    },
    formInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontSize: 13,
        color: colors.textPrimary,
        backgroundColor: '#FAFAFA',
    },
    categoryPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    categoryPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
    },
    categoryPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    categoryPillText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    categoryPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 18,
        borderTopWidth: 1,
        borderTopColor: '#EFE7DC',
        paddingTop: 12,
    },
    modalCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: '#F5F0E8',
    },
    modalCancelBtnText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    modalSaveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: colors.champagneGold,
    },
    modalSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    memberCheckRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F5EFE6',
    },
    memberCheckRowActive: {
        backgroundColor: '#FAF5EE',
    },
    checkboxIcon: {
        fontSize: 18,
        color: colors.champagneGold,
    },
    memberName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    memberSub: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    noPersonsHint: {
        textAlign: 'center',
        padding: 20,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    campaignHeaderBtn: {
        backgroundColor: '#2C2723',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    campaignHeaderBtnText: {
        color: colors.champagneGold,
        fontWeight: '700',
        fontSize: 12,
    },
    campaignCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    campaignCardHeader: {
        marginBottom: 10,
    },
    campaignBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    campaignStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
    },
    campaignStatusDraft: {
        backgroundColor: '#F3EFE9',
    },
    campaignStatusProgress: {
        backgroundColor: '#FEF3C7',
    },
    campaignStatusDone: {
        backgroundColor: '#F5EBDD',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    campaignStatusBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    campaignDateText: {
        fontSize: 11,
        color: '#766B62',
    },
    campaignTitle: {
        fontSize: 16,
        fontFamily: typography.serif,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 2,
    },
    campaignGroupText: {
        fontSize: 12,
        color: '#766B62',
    },
    campaignMetaBox: {
        flexDirection: 'row',
        gap: 16,
        backgroundColor: colors.ivoryWarm,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    campaignMetaText: {
        fontSize: 11,
        color: colors.atelierBlack,
    },
    campaignProgressBox: {
        marginBottom: 14,
    },
    campaignProgressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    campaignProgressCount: {
        fontSize: 11,
        color: '#766B62',
    },
    campaignProgressPercent: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    campaignProgressTrack: {
        height: 6,
        backgroundColor: '#EAE1D5',
        borderRadius: 3,
        overflow: 'hidden',
    },
    campaignProgressFill: {
        height: '100%',
        backgroundColor: colors.champagneGold,
    },
    campaignCardActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    fastCaptureActionBtn: {
        flex: 1,
        backgroundColor: colors.champagneGold,
        paddingVertical: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    fastCaptureActionBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    printSheetActionBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    printSheetActionBtnText: {
        color: colors.ivoryWarm,
        fontWeight: '600',
        fontSize: 12,
    },
});
