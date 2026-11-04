// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: SECCIÓN EDITORIAL PERSONAS Y GRUPOS (FASE 1)
// Archivo: src/components/clients/PersonGroupSection.tsx
// ==============================================================================
// Permite a la diseñadora administrar los sujetos anatómicos y agrupaciones
// pertenecientes a un cliente responsable (familia, escuela, empresa).
// Identidad visual de Alta Costura: Marfil, Negro Atelier, Champagne y Arena.
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
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
import { MeasurementImportReviewModal } from './MeasurementImportReviewModal';
import {
    exportPersonsAndMeasurementsToCSV,
    exportPersonsAndMeasurementsToExcel,
    downloadOfficialExcelTemplate,
} from '../../helpers/exportMeasurementDataHelper';

const DEMOGRAPHIC_AVATARS: Record<DemographicCategory, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

export type PersonSortColumn = 'name' | 'reference' | 'group' | 'last_session_date' | 'status';
export type SortDirection = 'asc' | 'desc';

interface PersonGroupSectionProps {
    client: Client;
    onSessionCreated?: (session: MeasurementSession) => void;
    onViewPersonHistory?: (person: MeasuredPerson) => void;
}

export function PersonGroupSection({ client, onSessionCreated, onViewPersonHistory }: PersonGroupSectionProps) {
    const [persons, setPersons] = useState<MeasuredPerson[]>([]);
    const [groups, setGroups] = useState<MeasurementGroup[]>([]);
    const [campaigns, setCampaigns] = useState<MeasurementCampaign[]>([]);

    // Estados de carga granulares por recurso
    const [loadingPersons, setLoadingPersons] = useState<boolean>(true);
    const [loadingGroups, setLoadingGroups] = useState<boolean>(true);
    const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
    const [personsError, setPersonsError] = useState<string | null>(null);
    const [groupsError, setGroupsError] = useState<string | null>(null);
    const [campaignsError, setCampaignsError] = useState<string | null>(null);

    // Estado derivado para compatibilidad (true solo mientras TODOS estén cargando)
    const loading = loadingPersons && loadingGroups && loadingCampaigns;

    // Protección contra race conditions y componentes desmontados
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);

    const [activeSubTab, setActiveSubTab] = useState<'persons' | 'groups' | 'campaigns'>('persons');

    // Estados de Búsqueda, Filtros y Paginación (Fase B1 — M02)
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all'); // 'all' | 'none' | groupId
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all'); // 'all' | DemographicCategory
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all'); // 'all' | 'none' | 'draft' | 'verified' | 'completed'
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25); // 25 | 50 | 100

    // Ordenamiento por columna interactivo (Fase B1 — M02)
    const [sortColumn, setSortColumn] = useState<PersonSortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSort = (column: PersonSortColumn) => {
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    // Sincronización de scroll horizontal superior e inferior de la tabla
    const topScrollRef = useRef<ScrollView>(null);
    const tableScrollRef = useRef<ScrollView>(null);
    const bottomScrollRef = useRef<ScrollView>(null);
    const isSyncingScrollRef = useRef<'top' | 'table' | 'bottom' | null>(null);

    const handleTopScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isSyncingScrollRef.current && isSyncingScrollRef.current !== 'top') return;
        isSyncingScrollRef.current = 'top';
        const x = e.nativeEvent.contentOffset.x;
        tableScrollRef.current?.scrollTo({ x, animated: false });
        bottomScrollRef.current?.scrollTo({ x, animated: false });
        setTimeout(() => {
            if (isSyncingScrollRef.current === 'top') isSyncingScrollRef.current = null;
        }, 60);
    }, []);

    const handleTableScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isSyncingScrollRef.current && isSyncingScrollRef.current !== 'table') return;
        isSyncingScrollRef.current = 'table';
        const x = e.nativeEvent.contentOffset.x;
        topScrollRef.current?.scrollTo({ x, animated: false });
        bottomScrollRef.current?.scrollTo({ x, animated: false });
        setTimeout(() => {
            if (isSyncingScrollRef.current === 'table') isSyncingScrollRef.current = null;
        }, 60);
    }, []);

    const handleBottomScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isSyncingScrollRef.current && isSyncingScrollRef.current !== 'bottom') return;
        isSyncingScrollRef.current = 'bottom';
        const x = e.nativeEvent.contentOffset.x;
        topScrollRef.current?.scrollTo({ x, animated: false });
        tableScrollRef.current?.scrollTo({ x, animated: false });
        setTimeout(() => {
            if (isSyncingScrollRef.current === 'bottom') isSyncingScrollRef.current = null;
        }, 60);
    }, []);

    const scrollTableLeft = useCallback(() => {
        topScrollRef.current?.scrollTo({ x: 0, animated: true });
        tableScrollRef.current?.scrollTo({ x: 0, animated: true });
        bottomScrollRef.current?.scrollTo({ x: 0, animated: true });
    }, []);

    const scrollTableRight = useCallback(() => {
        topScrollRef.current?.scrollTo({ x: 380, animated: true });
        tableScrollRef.current?.scrollTo({ x: 380, animated: true });
        bottomScrollRef.current?.scrollTo({ x: 380, animated: true });
    }, []);

    // Detección adaptable para tabletas y celulares (Cards vs Table)
    const { width: screenWidth } = useWindowDimensions();
    const [viewModeOverride, setViewModeOverride] = useState<'auto' | 'table' | 'cards'>('auto');
    const isMobileCards = viewModeOverride === 'cards' || (viewModeOverride === 'auto' && screenWidth <= 768);

    // Modales de creación/edición
    const [showPersonModal, setShowPersonModal] = useState<boolean>(false);
    const [showImportModal, setShowImportModal] = useState<boolean>(false);
    const [showExportModal, setShowExportModal] = useState<boolean>(false);
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

    const fetchPersonsData = useCallback(async (reqId: number) => {
        setLoadingPersons(true);
        setPersonsError(null);
        try {
            const pList = await fetchClientPersons(client.id);
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setPersons(pList);
            }
        } catch (err: any) {
            console.warn('[PersonGroupSection] Error cargando personas:', err);
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setPersonsError(err?.message || 'Error al cargar personas');
            }
        } finally {
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setLoadingPersons(false);
            }
        }
    }, [client.id]);

    const fetchGroupsData = useCallback(async (reqId: number) => {
        setLoadingGroups(true);
        setGroupsError(null);
        try {
            const gList = await fetchClientGroups(client.id);
            // Enriquecer cada grupo con sus miembros para alimentar personToGroupMap
            const enrichedGroups = await Promise.all(
                gList.map(async (g) => {
                    try {
                        const members = await fetchGroupMembers(g.id);
                        return { ...g, members };
                    } catch {
                        return { ...g, members: [] };
                    }
                })
            );
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setGroups(enrichedGroups);
            }
        } catch (err: any) {
            console.warn('[PersonGroupSection] Error cargando grupos:', err);
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setGroupsError(err?.message || 'Error al cargar grupos');
            }
        } finally {
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setLoadingGroups(false);
            }
        }
    }, [client.id]);

    const fetchCampaignsData = useCallback(async (reqId: number) => {
        setLoadingCampaigns(true);
        setCampaignsError(null);
        try {
            const cList = await fetchClientCampaigns(client.id);
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setCampaigns(cList);
            }
        } catch (err: any) {
            console.warn('[PersonGroupSection] Error cargando jornadas:', err);
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setCampaignsError(err?.message || 'Error al cargar jornadas');
            }
        } finally {
            if (isMountedRef.current && requestIdRef.current === reqId) {
                setLoadingCampaigns(false);
            }
        }
    }, [client.id]);

    const loadData = useCallback(() => {
        const reqId = ++requestIdRef.current;
        // Lanzar las tres cargas en paralelo de forma independiente
        fetchPersonsData(reqId);
        fetchGroupsData(reqId);
        fetchCampaignsData(reqId);
    }, [fetchPersonsData, fetchGroupsData, fetchCampaignsData]);

    useEffect(() => {
        isMountedRef.current = true;
        loadData();
        return () => {
            isMountedRef.current = false;
        };
    }, [loadData]);

    // Funciones de reintento individual
    const retryPersons = useCallback(() => {
        const reqId = requestIdRef.current; // Reutilizar el ID actual
        fetchPersonsData(reqId);
    }, [fetchPersonsData]);

    const retryGroups = useCallback(() => {
        const reqId = requestIdRef.current;
        fetchGroupsData(reqId);
    }, [fetchGroupsData]);

    const retryCampaigns = useCallback(() => {
        const reqId = requestIdRef.current;
        fetchCampaignsData(reqId);
    }, [fetchCampaignsData]);

    // Mapeo eficiente de personas a grupos en memoria
    const personToGroupMap = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        groups.forEach((g) => {
            if (g.members && g.members.length > 0) {
                g.members.forEach((m) => {
                    map.set(m.id, { id: g.id, name: g.name });
                });
            }
        });
        return map;
    }, [groups]);

    // Filtrado y búsqueda combinada en memoria sobre el conjunto completo
    const filteredPersons = useMemo(() => {
        let list = persons;

        // 1. Búsqueda por texto (nombre, referencia, notas, nombre de grupo)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter((p) => {
                const matchName = p.full_name?.toLowerCase().includes(q);
                const matchRef = p.reference_id?.toLowerCase().includes(q);
                const matchNotes = p.notes?.toLowerCase().includes(q);
                const groupInfo = personToGroupMap.get(p.id);
                const matchGroup = groupInfo?.name?.toLowerCase().includes(q);
                return matchName || matchRef || matchNotes || matchGroup;
            });
        }

        // 2. Filtro por grupo
        if (selectedGroupFilter !== 'all') {
            if (selectedGroupFilter === 'none') {
                list = list.filter((p) => !personToGroupMap.has(p.id));
            } else {
                list = list.filter((p) => {
                    const g = personToGroupMap.get(p.id);
                    return g?.id === selectedGroupFilter;
                });
            }
        }

        // 3. Filtro por categoría demográfica
        if (selectedCategoryFilter !== 'all') {
            list = list.filter((p) => p.demographic_category === selectedCategoryFilter);
        }

        // 4. Filtro por estado de sesión de medidas
        if (selectedStatusFilter !== 'all') {
            if (selectedStatusFilter === 'none') {
                list = list.filter((p) => !p.last_session_id);
            } else {
                list = list.filter((p) => p.last_session_status === selectedStatusFilter);
            }
        }

        // 5. Ordenamiento dinámico por columna seleccionada (Fase B1)
        list = [...list].sort((a, b) => {
            let comp = 0;
            switch (sortColumn) {
                case 'name':
                    comp = (a.full_name || '').localeCompare(b.full_name || '', 'es', { sensitivity: 'base' });
                    break;
                case 'reference':
                    comp = (a.reference_id || '').localeCompare(b.reference_id || '', 'es', { sensitivity: 'base', numeric: true });
                    break;
                case 'group': {
                    const groupA = personToGroupMap.get(a.id)?.name || '';
                    const groupB = personToGroupMap.get(b.id)?.name || '';
                    comp = groupA.localeCompare(groupB, 'es', { sensitivity: 'base' });
                    break;
                }
                case 'last_session_date': {
                    const dateA = a.last_session_date || '';
                    const dateB = b.last_session_date || '';
                    comp = dateA.localeCompare(dateB);
                    break;
                }
                case 'status': {
                    const statusOrder: Record<string, number> = {
                        completed: 4,
                        verified: 3,
                        draft: 2,
                    };
                    const valA = a.last_session_status ? (statusOrder[a.last_session_status] || 1) : 0;
                    const valB = b.last_session_status ? (statusOrder[b.last_session_status] || 1) : 0;
                    comp = valA - valB;
                    break;
                }
            }
            return sortDirection === 'asc' ? comp : -comp;
        });

        return list;
    }, [persons, searchQuery, selectedGroupFilter, selectedCategoryFilter, selectedStatusFilter, personToGroupMap, sortColumn, sortDirection]);

    // Cálculo de paginación
    const totalFiltered = filteredPersons.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedPersons = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        return filteredPersons.slice(start, start + pageSize);
    }, [filteredPersons, safeCurrentPage, pageSize]);

    // Reseteo de página al buscar o filtrar
    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        setCurrentPage(1);
    };

    const handleGroupFilterChange = (val: string) => {
        setSelectedGroupFilter(val);
        setCurrentPage(1);
    };

    const handleCategoryFilterChange = (val: string) => {
        setSelectedCategoryFilter(val);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (val: string) => {
        setSelectedStatusFilter(val);
        setCurrentPage(1);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedGroupFilter('all');
        setSelectedCategoryFilter('all');
        setSelectedStatusFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters =
        Boolean(searchQuery.trim()) ||
        selectedGroupFilter !== 'all' ||
        selectedCategoryFilter !== 'all' ||
        selectedStatusFilter !== 'all';

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

    const handleExportExcel = () => {
        exportPersonsAndMeasurementsToExcel({
            client,
            persons: filteredPersons,
            groupMap: personToGroupMap,
        });
        setShowExportModal(false);
    };

    const handleExportCSV = () => {
        exportPersonsAndMeasurementsToCSV({
            client,
            persons: filteredPersons,
            groupMap: personToGroupMap,
        });
        setShowExportModal(false);
    };

    const handleDownloadTemplate = () => {
        downloadOfficialExcelTemplate();
        setShowExportModal(false);
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
                        style={styles.importHeaderBtn}
                        onPress={() => setShowImportModal(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.importHeaderBtnText}>📥 Importar (Excel/PDF/Foto)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.exportHeaderBtn}
                        onPress={() => setShowExportModal(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.exportHeaderBtnText}>📤 Exportar ({filteredPersons.length})</Text>
                    </TouchableOpacity>

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
                /* LISTA DE PERSONAS MEDIDAS — TABLA EDITORIAL COMPACTA (FASE B1) */
                loadingPersons ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando personas del atelier...</Text>
                    </View>
                ) : personsError ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateTitle}>Error al cargar personas</Text>
                        <Text style={styles.emptyStateDesc}>{personsError}</Text>
                        <TouchableOpacity style={styles.emptyStateBtn} onPress={retryPersons}>
                            <Text style={styles.emptyStateBtnText}>🔄 Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.editorialTableContainer}>
                        {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS COMPACTOS */}
                        <View style={styles.toolbarCard}>
                            {/* Fila 1: Buscador Flexible + Filtros de Estado Inmediatos */}
                            <View style={styles.searchBarRow}>
                                <View style={styles.searchInputWrap}>
                                    <Text style={styles.searchIcon}>🔍</Text>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Buscar por nombre, referencia o grupo..."
                                        placeholderTextColor={colors.textMuted}
                                        value={searchQuery}
                                        onChangeText={handleSearchChange}
                                    />
                                    {Boolean(searchQuery) && (
                                        <TouchableOpacity
                                            style={styles.searchClearBtn}
                                            onPress={() => handleSearchChange('')}
                                        >
                                            <Text style={styles.searchClearBtnText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Filtro rápido de Estado en la misma fila */}
                                <View style={styles.quickStatusWrap}>
                                    <TouchableOpacity
                                        style={[styles.filterPill, selectedStatusFilter === 'all' && styles.filterPillActive]}
                                        onPress={() => handleStatusFilterChange('all')}
                                    >
                                        <Text style={[styles.filterPillText, selectedStatusFilter === 'all' && styles.filterPillTextActive]}>
                                            Todos
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterPill, selectedStatusFilter === 'draft' && styles.filterPillActive]}
                                        onPress={() => handleStatusFilterChange('draft')}
                                    >
                                        <Text style={[styles.filterPillText, selectedStatusFilter === 'draft' && styles.filterPillTextActive]}>
                                            ⏳ Borrador
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterPill, selectedStatusFilter === 'verified' && styles.filterPillActive]}
                                        onPress={() => handleStatusFilterChange('verified')}
                                    >
                                        <Text style={[styles.filterPillText, selectedStatusFilter === 'verified' && styles.filterPillTextActive]}>
                                            ✅ Verificada
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterPill, selectedStatusFilter === 'completed' && styles.filterPillActive]}
                                        onPress={() => handleStatusFilterChange('completed')}
                                    >
                                        <Text style={[styles.filterPillText, selectedStatusFilter === 'completed' && styles.filterPillTextActive]}>
                                            🛡️ Finalizada
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {hasActiveFilters && (
                                    <TouchableOpacity
                                        style={styles.clearAllFiltersBtn}
                                        onPress={handleClearFilters}
                                    >
                                        <Text style={styles.clearAllFiltersText}>Limpiar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Fila 2: Filtros Compactos Facetados (Grupo y Categoría) */}
                            <View style={styles.compactFiltersRow}>
                                {/* Filtro de Grupo */}
                                <View style={styles.filterInlineGroup}>
                                    <Text style={styles.filterInlineLabel}>GRUPO:</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlinePillsScroll}>
                                        <TouchableOpacity
                                            style={[styles.filterPillCompact, selectedGroupFilter === 'all' && styles.filterPillActive]}
                                            onPress={() => handleGroupFilterChange('all')}
                                        >
                                            <Text style={[styles.filterPillText, selectedGroupFilter === 'all' && styles.filterPillTextActive]}>
                                                Todos ({persons.length})
                                            </Text>
                                        </TouchableOpacity>
                                        {groups.map((g) => (
                                            <TouchableOpacity
                                                key={g.id}
                                                style={[styles.filterPillCompact, selectedGroupFilter === g.id && styles.filterPillActive]}
                                                onPress={() => handleGroupFilterChange(g.id)}
                                            >
                                                <Text style={[styles.filterPillText, selectedGroupFilter === g.id && styles.filterPillTextActive]}>
                                                    {g.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={[styles.filterPillCompact, selectedGroupFilter === 'none' && styles.filterPillActive]}
                                            onPress={() => handleGroupFilterChange('none')}
                                        >
                                            <Text style={[styles.filterPillText, selectedGroupFilter === 'none' && styles.filterPillTextActive]}>
                                                Sin grupo
                                            </Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>

                                {/* Filtro Demográfico */}
                                <View style={styles.filterInlineGroup}>
                                    <Text style={styles.filterInlineLabel}>CATEGORÍA:</Text>
                                    <View style={styles.inlinePillsWrap}>
                                        <TouchableOpacity
                                            style={[styles.filterPillCompact, selectedCategoryFilter === 'all' && styles.filterPillActive]}
                                            onPress={() => handleCategoryFilterChange('all')}
                                        >
                                            <Text style={[styles.filterPillText, selectedCategoryFilter === 'all' && styles.filterPillTextActive]}>
                                                Todas
                                            </Text>
                                        </TouchableOpacity>
                                        {(['woman', 'man', 'girl', 'boy', 'baby'] as DemographicCategory[]).map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.filterPillCompact, selectedCategoryFilter === cat && styles.filterPillActive]}
                                                onPress={() => handleCategoryFilterChange(cat)}
                                            >
                                                <Text style={[styles.filterPillText, selectedCategoryFilter === cat && styles.filterPillTextActive]}>
                                                    {DEMOGRAPHIC_LABELS[cat].split(' ')[0]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* ENCABEZADO DE TABLA EDITORIAL */}
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
                        ) : filteredPersons.length === 0 ? (
                            <View style={styles.emptyStateCard}>
                                <Text style={styles.emptyStateTitle}>No se encontraron personas</Text>
                                <Text style={styles.emptyStateDesc}>
                                    Ninguna persona coincide con los criterios de búsqueda o filtros seleccionados.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyStateBtn}
                                    onPress={handleClearFilters}
                                >
                                    <Text style={styles.emptyStateBtnText}>Restablecer Filtros</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {/* BARRA DE ESTADÍSTICAS Y RESUMEN */}
                                <View style={styles.tableMetaHeader}>
                                    <Text style={styles.tableMetaCount}>
                                        Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, totalFiltered)}–{Math.min(safeCurrentPage * pageSize, totalFiltered)} de {totalFiltered} personas
                                        {totalFiltered !== persons.length && ` (filtradas de ${persons.length})`}
                                    </Text>

                                    <View style={styles.pageSizeRow}>
                                        {/* Selector de modo de visualización: Tabla vs Fichas */}
                                        <View style={styles.viewModeToggleGroup}>
                                            <TouchableOpacity
                                                style={[styles.viewModeBtn, !isMobileCards && styles.viewModeBtnActive]}
                                                onPress={() => setViewModeOverride('table')}
                                                activeOpacity={0.8}
                                                accessibilityLabel="Vista en Tabla con columnas"
                                                {...Platform.select({ web: { title: 'Ver como tabla con ordenamiento por columnas' } as any })}
                                            >
                                                <Text style={[styles.viewModeBtnText, !isMobileCards && styles.viewModeBtnTextActive]}>📋 Tabla</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.viewModeBtn, isMobileCards && styles.viewModeBtnActive]}
                                                onPress={() => setViewModeOverride('cards')}
                                                activeOpacity={0.8}
                                                accessibilityLabel="Vista en Fichas completas"
                                                {...Platform.select({ web: { title: 'Ver como fichas completas para tablet/móvil' } as any })}
                                            >
                                                <Text style={[styles.viewModeBtnText, isMobileCards && styles.viewModeBtnTextActive]}>🗂️ Fichas</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <Text style={styles.pageSizeLabel}>Por página:</Text>
                                        {[25, 50, 100].map((size) => (
                                            <TouchableOpacity
                                                key={size}
                                                style={[styles.pageSizePill, pageSize === size && styles.pageSizePillActive]}
                                                onPress={() => handlePageSizeChange(size)}
                                            >
                                                <Text style={[styles.pageSizePillText, pageSize === size && styles.pageSizePillTextActive]}>
                                                    {size}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {isMobileCards ? (
                                    /* VISTA EN FICHAS / TARJETAS TÁCTILES (RESPONSIVE TABLET Y MÓVIL) */
                                    <View style={styles.cardsContainer}>
                                        {paginatedPersons.map((p) => {
                                            const avatar = DEMOGRAPHIC_AVATARS[p.demographic_category];
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
                                                            onPress={() => setMeasuringPerson(p)}
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
                                                            onPress={() => setCadPerson(p)}
                                                            activeOpacity={0.8}
                                                            accessibilityLabel="Taller CAD"
                                                            {...Platform.select({ web: { title: '✨ Taller CAD y patronaje digital' } as any })}
                                                        >
                                                            <Text style={styles.personCardIconBtnCadText}>✨ CAD</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.personCardIconBtn}
                                                            onPress={() => handleOpenEditPerson(p)}
                                                            activeOpacity={0.8}
                                                            accessibilityLabel="Editar persona"
                                                            {...Platform.select({ web: { title: '✎ Editar datos de la persona' } as any })}
                                                        >
                                                            <Text style={styles.personCardIconBtnText}>✎</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={[styles.personCardIconBtn, !p.is_active && styles.actionIconBtnInactive]}
                                                            onPress={() => handleToggleActivePerson(p)}
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
                                ) : (
                                    <>
                                        {/* BARRA DE DESPLAZAMIENTO HORIZONTAL SUPERIOR */}
                                        <View style={styles.topScrollHeaderBar}>
                                    <View style={styles.tableScrollNavGroup}>
                                        <Text style={styles.tableScrollNavHint}>↔ Desplazar tabla:</Text>
                                        <TouchableOpacity
                                            style={styles.tableScrollNavBtn}
                                            onPress={scrollTableLeft}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tableScrollNavBtnText}>◀ Inicio</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.tableScrollNavBtn}
                                            onPress={scrollTableRight}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tableScrollNavBtnText}>Acciones ▶</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView
                                        ref={topScrollRef}
                                        horizontal
                                        showsHorizontalScrollIndicator={true}
                                        onScroll={handleTopScroll}
                                        scrollEventThrottle={16}
                                        style={styles.topScrollBar}
                                        contentContainerStyle={{ width: 830, height: 14 }}
                                    >
                                        <View style={{ width: 830, height: 14 }} />
                                    </ScrollView>
                                </View>

                                {/* TABLA EDITORIAL DE PERSONAS (CON HORIZONTAL SCROLLVIEW SINCRONIZADO) */}
                                <ScrollView
                                    ref={tableScrollRef}
                                    horizontal
                                    showsHorizontalScrollIndicator={true}
                                    onScroll={handleTableScroll}
                                    scrollEventThrottle={16}
                                    contentContainerStyle={styles.tableScrollContainer}
                                >
                                    <View style={styles.tableWrapper}>
                                        {/* CABECERA DE COLUMNAS ORDENABLES (ESCRITORIO / TABLET) */}
                                        <View style={styles.tableHeaderRow}>
                                            {/* Columna 1: Persona */}
                                            <TouchableOpacity
                                                style={[styles.tableColHeaderBtn, { flex: 2.2, minWidth: 160 }]}
                                                onPress={() => handleSort('name')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.tableColHeader, sortColumn === 'name' && styles.tableColHeaderActive]}>
                                                    PERSONA / SUJETO MEDIDO
                                                </Text>
                                                <Text style={[styles.sortIndicatorIcon, sortColumn === 'name' && styles.sortIndicatorIconActive]}>
                                                    {sortColumn === 'name' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Columna 2: Referencia */}
                                            <TouchableOpacity
                                                style={[styles.tableColHeaderBtn, { width: 90, minWidth: 90 }]}
                                                onPress={() => handleSort('reference')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.tableColHeader, sortColumn === 'reference' && styles.tableColHeaderActive]}>
                                                    REFERENCIA
                                                </Text>
                                                <Text style={[styles.sortIndicatorIcon, sortColumn === 'reference' && styles.sortIndicatorIconActive]}>
                                                    {sortColumn === 'reference' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Columna 3: Grupo / Núcleo */}
                                            <TouchableOpacity
                                                style={[styles.tableColHeaderBtn, { flex: 1.5, minWidth: 135 }]}
                                                onPress={() => handleSort('group')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.tableColHeader, sortColumn === 'group' && styles.tableColHeaderActive]}>
                                                    GRUPO / NÚCLEO
                                                </Text>
                                                <Text style={[styles.sortIndicatorIcon, sortColumn === 'group' && styles.sortIndicatorIconActive]}>
                                                    {sortColumn === 'group' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Columna 4: Última Medición */}
                                            <TouchableOpacity
                                                style={[styles.tableColHeaderBtn, { width: 115, minWidth: 115 }]}
                                                onPress={() => handleSort('last_session_date')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.tableColHeader, sortColumn === 'last_session_date' && styles.tableColHeaderActive]}>
                                                    ÚLTIMA MEDICIÓN
                                                </Text>
                                                <Text style={[styles.sortIndicatorIcon, sortColumn === 'last_session_date' && styles.sortIndicatorIconActive]}>
                                                    {sortColumn === 'last_session_date' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Columna 5: Estado */}
                                            <TouchableOpacity
                                                style={[styles.tableColHeaderBtn, { width: 115, minWidth: 115 }]}
                                                onPress={() => handleSort('status')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.tableColHeader, sortColumn === 'status' && styles.tableColHeaderActive]}>
                                                    ESTADO
                                                </Text>
                                                <Text style={[styles.sortIndicatorIcon, sortColumn === 'status' && styles.sortIndicatorIconActive]}>
                                                    {sortColumn === 'status' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Columna 6: Acciones Rápidas (fija) */}
                                            <View style={{ width: 225, minWidth: 225, alignItems: 'flex-end', justifyContent: 'center' }}>
                                                <Text style={[styles.tableColHeader, { textAlign: 'right' }]}>
                                                    ACCIONES RÁPIDAS
                                                </Text>
                                            </View>
                                        </View>

                                        {/* FILAS DE LA TABLA EDITORIAL */}
                                        <View style={styles.tableBody}>
                                            {paginatedPersons.map((p) => {
                                                const avatar = DEMOGRAPHIC_AVATARS[p.demographic_category];
                                                const groupInfo = personToGroupMap.get(p.id);
                                                const isDraft = p.last_session_status === 'draft';
                                                const isVerified = p.last_session_status === 'verified';
                                                const isCompleted = p.last_session_status === 'completed';

                                                return (
                                                    <View
                                                        key={p.id}
                                                        style={[styles.tableRow, !p.is_active && styles.tableRowInactive]}
                                                    >
                                                        {/* Columna 1: Persona */}
                                                        <View style={[styles.tableColCell, { flex: 2.2, minWidth: 160, flexDirection: 'row', alignItems: 'center' }]}>
                                                            <View style={styles.avatarMiniWrap}>
                                                                <Image source={avatar} style={styles.avatarMiniImg} resizeMode="cover" />
                                                            </View>
                                                            <View style={{ flex: 1, marginLeft: 8 }}>
                                                                <Text style={styles.rowPersonName} numberOfLines={1}>
                                                                    {p.full_name}
                                                                </Text>
                                                                <View style={styles.demographicMiniTag}>
                                                                    <Text style={styles.demographicMiniTagText}>
                                                                        {DEMOGRAPHIC_LABELS[p.demographic_category].toUpperCase()}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>

                                                        {/* Columna 2: Referencia */}
                                                        <View style={[styles.tableColCell, { width: 90, minWidth: 90 }]}>
                                                            <Text style={styles.rowRefText} numberOfLines={1}>
                                                                {p.reference_id || '—'}
                                                            </Text>
                                                        </View>

                                                        {/* Columna 3: Grupo */}
                                                        <View style={[styles.tableColCell, { flex: 1.5, minWidth: 135 }]}>
                                                            <Text style={styles.rowGroupText} numberOfLines={1}>
                                                                {groupInfo ? `👥 ${groupInfo.name}` : <Text style={{ color: colors.textMuted }}>Sin grupo</Text>}
                                                            </Text>
                                                        </View>

                                                        {/* Columna 4: Última Medición */}
                                                        <View style={[styles.tableColCell, { width: 115, minWidth: 115 }]}>
                                                            {p.last_session_date ? (
                                                                <View>
                                                                    <Text style={styles.rowSessionDate}>
                                                                        📅 {p.last_session_date}
                                                                    </Text>
                                                                    <Text style={styles.rowSessionVer}>
                                                                        v{p.last_session_version || 1}
                                                                    </Text>
                                                                </View>
                                                            ) : (
                                                                <Text style={styles.rowSessionEmpty}>Sin sesión</Text>
                                                            )}
                                                        </View>

                                                        {/* Columna 5: Estado */}
                                                        <View style={[styles.tableColCell, { width: 115, minWidth: 115, alignItems: 'flex-start' }]}>
                                                            {p.last_session_id ? (
                                                                <View
                                                                    style={[
                                                                        styles.statusBadge,
                                                                        isCompleted
                                                                            ? styles.statusBadgeCompleted
                                                                            : isVerified
                                                                                ? styles.statusBadgeVerified
                                                                                : styles.statusBadgeDraft,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.statusBadgeText,
                                                                            isCompleted
                                                                                ? styles.statusBadgeTextCompleted
                                                                                : isVerified
                                                                                    ? styles.statusBadgeTextVerified
                                                                                    : styles.statusBadgeTextDraft,
                                                                        ]}
                                                                    >
                                                                        {isCompleted ? '🛡️ FINALIZADA' : isVerified ? '✅ VERIFICADA' : '⏳ BORRADOR'}
                                                                    </Text>
                                                                </View>
                                                            ) : (
                                                                <View style={styles.statusBadgeNone}>
                                                                    <Text style={styles.statusBadgeTextNone}>○ PENDIENTE</Text>
                                                                </View>
                                                            )}
                                                        </View>

                                                        {/* Columna 6: Acciones Rápidas Compactas */}
                                                        <View style={[styles.tableColCell, { width: 225, minWidth: 225, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }]}>
                                                            <TouchableOpacity
                                                                style={styles.actionBtnMeasureCompact}
                                                                onPress={() => setMeasuringPerson(p)}
                                                                activeOpacity={0.8}
                                                                accessibilityLabel="Capturar y editar medidas anatómicas"
                                                                {...Platform.select({ web: { title: '📐 Tomar medidas anatómicas' } as any })}
                                                            >
                                                                <Text style={styles.actionBtnMeasureCompactText}>📐 Medir</Text>
                                                            </TouchableOpacity>

                                                            {onViewPersonHistory && (
                                                                <TouchableOpacity
                                                                    style={styles.actionIconBtn}
                                                                    onPress={() => onViewPersonHistory(p)}
                                                                    activeOpacity={0.8}
                                                                    accessibilityLabel="Ver historial de medidas anatómicas"
                                                                    {...Platform.select({ web: { title: '📜 Ver historial de medidas' } as any })}
                                                                >
                                                                    <Text style={styles.actionIconBtnText}>📜</Text>
                                                                </TouchableOpacity>
                                                            )}

                                                            <TouchableOpacity
                                                                style={styles.actionIconBtnCad}
                                                                onPress={() => setCadPerson(p)}
                                                                activeOpacity={0.8}
                                                                accessibilityLabel="Taller CAD de Alta Costura y patronaje"
                                                                {...Platform.select({ web: { title: '✨ Taller CAD y patronaje digital' } as any })}
                                                            >
                                                                <Text style={styles.actionIconBtnCadText}>✨</Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={styles.actionIconBtn}
                                                                onPress={() => handleOpenEditPerson(p)}
                                                                activeOpacity={0.8}
                                                                accessibilityLabel="Editar ficha de la persona"
                                                                {...Platform.select({ web: { title: '✎ Editar datos y perfil' } as any })}
                                                            >
                                                                <Text style={styles.actionIconBtnText}>✎</Text>
                                                            </TouchableOpacity>

                                                            <TouchableOpacity
                                                                style={[styles.actionIconBtn, !p.is_active && styles.actionIconBtnInactive]}
                                                                onPress={() => handleToggleActivePerson(p)}
                                                                activeOpacity={0.8}
                                                                accessibilityLabel={p.is_active ? 'Desactivar persona' : 'Reactivar persona'}
                                                                {...Platform.select({ web: { title: p.is_active ? '⊘ Desactivar persona' : '↺ Reactivar persona' } as any })}
                                                            >
                                                                <Text style={[styles.actionIconBtnText, !p.is_active && { color: colors.champagneGold }]}>
                                                                    {p.is_active ? '⊘' : '↺'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </ScrollView>

                                {/* BARRA DE DESPLAZAMIENTO HORIZONTAL INFERIOR */}
                                <View style={styles.bottomScrollHeaderBar}>
                                    <View style={styles.tableScrollNavGroup}>
                                        <Text style={styles.tableScrollNavHint}>↔ Desplazar tabla:</Text>
                                        <TouchableOpacity
                                            style={styles.tableScrollNavBtn}
                                            onPress={scrollTableLeft}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tableScrollNavBtnText}>◀ Inicio</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.tableScrollNavBtn}
                                            onPress={scrollTableRight}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tableScrollNavBtnText}>Acciones ▶</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView
                                        ref={bottomScrollRef}
                                        horizontal
                                        showsHorizontalScrollIndicator={true}
                                        onScroll={handleBottomScroll}
                                        scrollEventThrottle={16}
                                        style={styles.bottomScrollBar}
                                        contentContainerStyle={{ width: 830, height: 14 }}
                                    >
                                        <View style={{ width: 830, height: 14 }} />
                                    </ScrollView>
                                </View>
                            </>
                        )}

                                {/* CONTROLES DE PAGINACIÓN */}
                                {totalPages > 1 && (
                                    <View style={styles.paginationRow}>
                                        <TouchableOpacity
                                            style={[styles.pageNavBtn, safeCurrentPage === 1 && styles.pageNavBtnDisabled]}
                                            disabled={safeCurrentPage === 1}
                                            onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        >
                                            <Text style={[styles.pageNavBtnText, safeCurrentPage === 1 && styles.pageNavBtnTextDisabled]}>
                                                ← Anterior
                                            </Text>
                                        </TouchableOpacity>

                                        <Text style={styles.paginationInfoText}>
                                            Página <Text style={{ fontWeight: '700', color: colors.atelierBlack }}>{safeCurrentPage}</Text> de {totalPages}
                                        </Text>

                                        <TouchableOpacity
                                            style={[styles.pageNavBtn, safeCurrentPage === totalPages && styles.pageNavBtnDisabled]}
                                            disabled={safeCurrentPage === totalPages}
                                            onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        >
                                            <Text style={[styles.pageNavBtnText, safeCurrentPage === totalPages && styles.pageNavBtnTextDisabled]}>
                                                Siguiente →
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )
            ) : activeSubTab === 'groups' ? (
                /* LISTA DE GRUPOS / NÚCLEOS */
                loadingGroups ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando grupos y núcleos...</Text>
                    </View>
                ) : groupsError ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateTitle}>Error al cargar grupos</Text>
                        <Text style={styles.emptyStateDesc}>{groupsError}</Text>
                        <TouchableOpacity style={styles.emptyStateBtn} onPress={retryGroups}>
                            <Text style={styles.emptyStateBtnText}>🔄 Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
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
                )
            ) : (
                /* LISTA DE JORNADAS DE MEDICIÓN (FASE 3) */
                loadingCampaigns ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando jornadas de medición...</Text>
                    </View>
                ) : campaignsError ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateTitle}>Error al cargar jornadas</Text>
                        <Text style={styles.emptyStateDesc}>{campaignsError}</Text>
                        <TouchableOpacity style={styles.emptyStateBtn} onPress={retryCampaigns}>
                            <Text style={styles.emptyStateBtnText}>🔄 Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
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
                )
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

            {/* MODAL DE IMPORTACIÓN ASISTIDA CON REVISIÓN HUMANA OBLIGATORIA */}
            {showImportModal && (
                <MeasurementImportReviewModal
                    visible={showImportModal}
                    client={client}
                    existingPersons={persons}
                    existingGroups={groups}
                    onSuccess={() => {
                        loadData();
                    }}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            {/* MODAL EDITORIAL DE EXPORTACIÓN */}
            <Modal visible={showExportModal} animationType="fade" transparent onRequestClose={() => setShowExportModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalDialog, { maxWidth: 540 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Exportar Personas y Medidas</Text>
                                <Text style={styles.modalSub}>
                                    {filteredPersons.length} personas seleccionadas según los filtros actuales
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowExportModal(false)}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 20, gap: 14 }}>
                            <TouchableOpacity
                                style={styles.exportOptionCard}
                                onPress={handleExportExcel}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.exportOptionIcon}>📊</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exportOptionTitle}>Excel Profesional Estilizado (.xls)</Text>
                                    <Text style={styles.exportOptionDesc}>
                                        Libro formateado con membrete de Alta Costura Katherine Carroll, encabezados dorados, bordes y columnas anatómicas ordenadas.
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.exportOptionCard}
                                onPress={handleExportCSV}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.exportOptionIcon}>📄</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exportOptionTitle}>Archivo de Datos Crudos (.csv)</Text>
                                    <Text style={styles.exportOptionDesc}>
                                        Compatible con cualquier hoja de cálculo o sistema externo, delimitado por comas con codificación UTF-8 BOM.
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.exportOptionCard, { borderColor: '#E0D2C0' }]}
                                onPress={handleDownloadTemplate}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.exportOptionIcon}>📥</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exportOptionTitle}>Descargar Plantilla Oficial en Blanco (.xls)</Text>
                                    <Text style={styles.exportOptionDesc}>
                                        Plantilla vacía con instrucciones y ejemplos para enviar a colegios, empresas o familias antes de la toma de medidas.
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowExportModal(false)}
                            >
                                <Text style={styles.modalCancelBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        flexWrap: 'wrap',
        gap: 8,
    },
    importHeaderBtn: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
    },
    importHeaderBtnText: {
        color: colors.atelierBlack,
        fontWeight: '700',
        fontSize: 12,
    },
    exportHeaderBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
    },
    exportHeaderBtnText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 12,
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
    exportOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.sand,
        gap: 14,
    },
    exportOptionIcon: {
        fontSize: 26,
    },
    exportOptionTitle: {
        fontSize: 13,
        fontFamily: typography.serif,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 3,
    },
    exportOptionDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 15,
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
        gap: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    fastCaptureActionBtn: {
        flex: 1.4,
        backgroundColor: colors.champagneGold,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fastCaptureActionBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12.5,
        letterSpacing: 0.3,
    },
    printSheetActionBtn: {
        flex: 1,
        backgroundColor: colors.atelierBlack,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3D3630',
    },
    printSheetActionBtnText: {
        color: colors.ivoryWarm,
        fontWeight: '700',
        fontSize: 12.5,
        letterSpacing: 0.3,
    },

    // =========================================================================
    // ESTILOS DE LA TABLA EDITORIAL COMPACTA (FASE B1 — M02)
    // =========================================================================
    editorialTableContainer: {
        gap: 12,
    },
    toolbarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 9,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
    },
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    searchInputWrap: {
        flex: 1,
        minWidth: 220,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 33,
    },
    searchIcon: {
        fontSize: 13,
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontFamily: typography.sans,
        fontSize: 12.5,
        color: colors.atelierBlack,
        paddingVertical: 0,
    },
    searchClearBtn: {
        padding: 4,
    },
    searchClearBtnText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '600',
    },
    quickStatusWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    clearAllFiltersBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: '#F3EFE9',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    clearAllFiltersText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    compactFiltersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        borderTopWidth: 1,
        borderTopColor: '#F5EFE6',
        paddingTop: 6,
    },
    filterInlineGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    filterInlineLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.6,
    },
    inlinePillsScroll: {
        flexDirection: 'row',
        maxWidth: 320,
    },
    inlinePillsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    filterPillCompact: {
        paddingVertical: 2.5,
        paddingHorizontal: 7,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        marginRight: 4,
    },
    filterPill: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        marginRight: 4,
    },
    filterPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    filterPillText: {
        fontSize: 10.5,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    tableMetaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    tableMetaCount: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    pageSizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pageSizeLabel: {
        fontSize: 11,
        color: colors.textMuted,
    },
    pageSizePill: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pageSizePillActive: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    pageSizePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    pageSizePillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    topScrollHeaderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 6,
        gap: 10,
    },
    bottomScrollHeaderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 6,
        marginBottom: 8,
        gap: 10,
    },
    tableScrollNavGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tableScrollNavHint: {
        fontSize: 10.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tableScrollNavBtn: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    tableScrollNavBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    topScrollBar: {
        flex: 1,
        height: 16,
    },
    bottomScrollBar: {
        flex: 1,
        height: 16,
    },
    tableScrollContainer: {
        minWidth: '100%',
    },
    tableWrapper: {
        minWidth: 800,
        flex: 1,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    tableColHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    tableColHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    tableColHeaderActive: {
        color: colors.atelierBlack,
        fontWeight: '800',
    },
    sortIndicatorIcon: {
        fontSize: 10,
        color: colors.textMuted,
        marginLeft: 4,
    },
    sortIndicatorIconActive: {
        color: colors.champagneGold,
        fontWeight: '800',
    },
    tableBody: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F5EFE6',
        minHeight: 58,
    },
    tableRowInactive: {
        backgroundColor: '#FAFAFA',
        opacity: 0.65,
    },
    tableColCell: {
        justifyContent: 'center',
    },
    avatarMiniWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF6F0',
    },
    avatarMiniImg: {
        width: '100%',
        height: '100%',
    },
    rowPersonName: {
        fontFamily: typography.serif,
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    demographicMiniTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 2,
        marginTop: 2,
    },
    demographicMiniTagText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#8C6826',
        letterSpacing: 0.5,
    },
    rowRefText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    rowGroupText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: colors.atelierBlack,
    },
    rowSessionDate: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    rowSessionVer: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 1,
    },
    rowSessionEmpty: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textMuted,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 4,
        minWidth: 106,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadgeCompleted: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    statusBadgeVerified: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    statusBadgeDraft: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    statusBadgeNone: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 4,
        minWidth: 106,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    statusBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    statusBadgeTextCompleted: {
        color: '#1B5E20',
    },
    statusBadgeTextVerified: {
        color: '#0D47A1',
    },
    statusBadgeTextDraft: {
        color: '#E65100',
    },
    statusBadgeTextNone: {
        fontSize: 9.5,
        fontWeight: '600',
        color: colors.textMuted,
        textAlign: 'center',
    },
    actionBtnMeasureCompact: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 4,
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnMeasureCompactText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    actionIconBtn: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        width: 34,
        height: 34,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionIconBtnText: {
        fontSize: 13,
        color: colors.atelierBlack,
    },
    actionIconBtnCad: {
        backgroundColor: '#2A2521',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        width: 34,
        height: 34,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionIconBtnCadText: {
        fontSize: 12,
        color: colors.champagneGold,
    },
    actionIconBtnInactive: {
        backgroundColor: '#EFE7DC',
    },
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderTopWidth: 1,
        borderTopColor: '#EFE7DC',
        marginTop: 6,
    },
    pageNavBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 4,
    },
    pageNavBtnDisabled: {
        backgroundColor: '#E5E0D8',
    },
    pageNavBtnText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '600',
    },
    pageNavBtnTextDisabled: {
        color: '#9C9388',
    },
    paginationInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    // Selector de vista y Fichas Adaptables (Tablet / Celular)
    viewModeToggleGroup: {
        flexDirection: 'row',
        backgroundColor: '#EFE7DC',
        borderRadius: 4,
        padding: 2,
        marginRight: 8,
    },
    viewModeBtn: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
    },
    viewModeBtnActive: {
        backgroundColor: colors.atelierBlack,
    },
    viewModeBtnText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    viewModeBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    cardsContainer: {
        gap: 10,
        paddingVertical: 6,
    },
    personCardItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        gap: 10,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    personCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    personCardIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    personCardAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FAF6F0',
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
    },
    personCardFullName: {
        fontFamily: typography.serif,
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    demographicPill: {
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 3,
    },
    demographicPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8C6826',
        letterSpacing: 0.5,
    },
    personCardRefText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    personCardDetailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FAF8F5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        gap: 8,
    },
    personCardDetailText: {
        fontSize: 11,
        color: colors.atelierBlack,
        fontWeight: '500',
    },
    personCardActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#F3ECE3',
    },
    personCardMeasureBtn: {
        flex: 1.5,
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 38,
    },
    personCardMeasureBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    personCardIconBtn: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 38,
    },
    personCardIconBtnText: {
        fontSize: 11.5,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    personCardIconBtnCad: {
        backgroundColor: '#2A2521',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 38,
    },
    personCardIconBtnCadText: {
        fontSize: 11.5,
        color: colors.champagneGold,
        fontWeight: '700',
    },
});
