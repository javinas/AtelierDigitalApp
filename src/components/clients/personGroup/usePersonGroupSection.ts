// ==============================================================================
// HOOK DE LÓGICA Y ESTADO: PERSONAS, GRUPOS Y JORNADAS
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { Client } from '../../../types/client';
import {
    DemographicCategory,
    GroupType,
    MeasurementGroup,
    MeasuredPerson,
} from '../../../types/personGroup';
import {
    assignPersonToGroup,
    createGroup,
    createPerson,
    fetchClientGroups,
    fetchClientPersons,
    fetchGroupMembers,
    removePersonFromGroup,
    updatePerson,
} from '../../../services/personGroupService';
import { MeasurementSession, MeasurementUnit } from '../../../types/pattern/measurement';
import { MeasurementCampaign, MeasurementCampaignParticipant } from '../../../types/pattern/measurementCampaign';
import { MeasurementUsageMode } from '../../../types/pattern/measurementTemplate';
import {
    createMeasurementCampaign,
    fetchClientCampaigns,
    fetchCampaignParticipants,
} from '../../../services/measurementCampaignService';
import {
    exportPersonsAndMeasurementsToCSV,
    exportPersonsAndMeasurementsToExcel,
    downloadOfficialExcelTemplate,
} from '../../../helpers/exportMeasurementDataHelper';
import { PersonSortColumn, SortDirection } from './PersonTableView';

interface UsePersonGroupSectionProps {
    client: Client;
    onSessionCreated?: (session: MeasurementSession) => void;
}

export function usePersonGroupSection({ client }: UsePersonGroupSectionProps) {
    const [persons, setPersons] = useState<MeasuredPerson[]>([]);
    const [groups, setGroups] = useState<MeasurementGroup[]>([]);
    const [campaigns, setCampaigns] = useState<MeasurementCampaign[]>([]);

    const [loadingPersons, setLoadingPersons] = useState<boolean>(true);
    const [loadingGroups, setLoadingGroups] = useState<boolean>(true);
    const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
    const [personsError, setPersonsError] = useState<string | null>(null);
    const [groupsError, setGroupsError] = useState<string | null>(null);
    const [campaignsError, setCampaignsError] = useState<string | null>(null);

    const loading = loadingPersons && loadingGroups && loadingCampaigns;

    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);

    const [activeSubTab, setActiveSubTab] = useState<'persons' | 'groups' | 'campaigns'>('persons');

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);

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

    const [selectedGroupForManage, setSelectedGroupForManage] = useState<MeasurementGroup | null>(null);
    const [groupMembers, setGroupMembers] = useState<MeasuredPerson[]>([]);
    const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

    const [measuringPerson, setMeasuringPerson] = useState<MeasuredPerson | null>(null);

    const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
    const [campaignTitle, setCampaignTitle] = useState<string>('');
    const [campaignGroupId, setCampaignGroupId] = useState<string>('');
    const [campaignDate, setCampaignDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [campaignTemplateId, setCampaignTemplateId] = useState<string>('tmpl_standard_general');
    const [campaignMode, setCampaignMode] = useState<MeasurementUsageMode>('standard_with_adjustments');
    const [campaignUnit, setCampaignUnit] = useState<MeasurementUnit>('cm');
    const [campaignNotes, setCampaignNotes] = useState<string>('');
    const [savingCampaign, setSavingCampaign] = useState<boolean>(false);

    const [activeFastCaptureCampaign, setActiveFastCaptureCampaign] = useState<MeasurementCampaign | null>(null);
    const [activePrintCampaign, setActivePrintCampaign] = useState<MeasurementCampaign | null>(null);
    const [printCampaignParticipants, setPrintCampaignParticipants] = useState<MeasurementCampaignParticipant[]>([]);

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

    const retryPersons = useCallback(() => {
        const reqId = requestIdRef.current;
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

    const filteredPersons = useMemo(() => {
        let list = persons;

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

        if (selectedCategoryFilter !== 'all') {
            list = list.filter((p) => p.demographic_category === selectedCategoryFilter);
        }

        if (selectedStatusFilter !== 'all') {
            if (selectedStatusFilter === 'none') {
                list = list.filter((p) => !p.last_session_id);
            } else {
                list = list.filter((p) => p.last_session_status === selectedStatusFilter);
            }
        }

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

    const totalFiltered = filteredPersons.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedPersons = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        return filteredPersons.slice(start, start + pageSize);
    }, [filteredPersons, safeCurrentPage, pageSize]);

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

    return {
        // Data & Loading
        persons,
        groups,
        campaigns,
        loading,
        loadingPersons,
        loadingGroups,
        loadingCampaigns,
        personsError,
        groupsError,
        campaignsError,
        loadData,
        retryPersons,
        retryGroups,
        retryCampaigns,

        // Subtabs
        activeSubTab,
        setActiveSubTab,

        // Search & Filters
        searchQuery,
        handleSearchChange,
        selectedGroupFilter,
        handleGroupFilterChange,
        selectedCategoryFilter,
        handleCategoryFilterChange,
        selectedStatusFilter,
        handleStatusFilterChange,
        handleClearFilters,
        hasActiveFilters,

        // Sort & View Mode
        sortColumn,
        sortDirection,
        handleSort,
        isMobileCards,
        setViewModeOverride,

        // Pagination & Mappings
        pageSize,
        handlePageSizeChange,
        safeCurrentPage,
        setCurrentPage,
        totalPages,
        filteredPersons,
        paginatedPersons,
        personToGroupMap,

        // Person Modal Form
        showPersonModal,
        setShowPersonModal,
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
        handleOpenCreatePerson,
        handleOpenEditPerson,
        handleSavePerson,
        handleToggleActivePerson,

        // Group Modal Form
        showGroupModal,
        setShowGroupModal,
        groupName,
        setGroupName,
        groupType,
        setGroupType,
        groupNotes,
        setGroupNotes,
        savingGroup,
        handleSaveGroup,

        // Group Manage Modal
        selectedGroupForManage,
        setSelectedGroupForManage,
        groupMembers,
        setGroupMembers,
        loadingMembers,
        handleOpenManageGroup,
        handleToggleMember,

        // Campaign Modal Form
        showCampaignModal,
        setShowCampaignModal,
        campaignTitle,
        setCampaignTitle,
        campaignGroupId,
        setCampaignGroupId,
        campaignTemplateId,
        setCampaignTemplateId,
        campaignMode,
        setCampaignMode,
        campaignUnit,
        setCampaignUnit,
        campaignNotes,
        setCampaignNotes,
        savingCampaign,
        handleOpenCreateCampaign,
        handleSaveCampaign,

        // Interactive Campaigns
        activeFastCaptureCampaign,
        setActiveFastCaptureCampaign,
        activePrintCampaign,
        setActivePrintCampaign,
        printCampaignParticipants,
        handleOpenPrintCampaign,

        // Measure & CAD
        measuringPerson,
        setMeasuringPerson,
        cadPerson,
        setCadPerson,

        // Import & Export
        showImportModal,
        setShowImportModal,
        showExportModal,
        setShowExportModal,
        handleExportExcel,
        handleExportCSV,
        handleDownloadTemplate,
    };
}

