// ==============================================================================
// ATELIER DIGITAL — CUSTOM HOOK: ESTADO Y LÓGICA DE CREACIONES
// Archivo: src/components/creations/useCreationsState.ts
// ==============================================================================

import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchClients } from '../../services/clientService';
import {
    createCreation,
    deleteCreation,
    fetchCreationById,
    fetchCreations,
    linkSessionToCreation,
    updateCreation,
    updateCreationStatus,
} from '../../services/creationService';
import { fetchClientMeasurementSessions } from '../../services/measurementService';
import { fetchClientPersons } from '../../services/personGroupService';
import { Client } from '../../types/client';
import {
    Creation,
    CreationFilter,
    CreationStatus,
    CreationType,
    CreateCreationDTO,
} from '../../types/creation';
import { MeasuredPerson } from '../../types/personGroup';
import { MeasurementSession } from '../../types/pattern/measurement';
import { GarmentType } from '../../types/pattern/pattern';
import { CreationDetailTab, SAMPLE_CLIENTS, SAMPLE_CREATIONS, STATUS_LABELS } from './creationsModel';

export interface UseCreationsStateProps {
    initialCreationId?: string | null;
}

export function useCreationsState({ initialCreationId }: UseCreationsStateProps = {}) {
    const { role } = useAuth();

    // 1. Estados principales
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [statusFilter, setStatusFilter] = useState<CreationStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    // 2. Detalle y selección de Creación
    const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null);
    const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
    const [detailActiveTab, setDetailActiveTab] = useState<CreationDetailTab>('resumen');

    // 3. Clientes y sesiones para formularios y vínculos
    const [clients, setClients] = useState<Client[]>([]);
    const [clientSessions, setClientSessions] = useState<MeasurementSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState<boolean>(false);

    // 4. Modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isLinkSessionModalOpen, setIsLinkSessionModalOpen] = useState<boolean>(false);

    // 5. Estado para abrir el Taller CAD paramétrico integrado
    const [isCadOpen, setIsCadOpen] = useState<boolean>(false);

    // Formulario de nueva / edición de creación
    const [formClientId, setFormClientId] = useState<string>('');
    const [clientPersons, setClientPersons] = useState<MeasuredPerson[]>([]);
    const [loadingPersons, setLoadingPersons] = useState<boolean>(false);
    const [personsError, setPersonsError] = useState<string | null>(null);
    const [formPersonId, setFormPersonId] = useState<string | null>(null);
    const [formName, setFormName] = useState<string>('');
    const [formDescription, setFormDescription] = useState<string>('');
    const [formCreationType, setFormCreationType] = useState<CreationType>('bespoke');
    const [formOccasion, setFormOccasion] = useState<string>('');
    const [formGarmentType, setFormGarmentType] = useState<GarmentType | ''>('bodice');
    const [formTargetDate, setFormTargetDate] = useState<string>('');
    const [formNotes, setFormNotes] = useState<string>('');
    const [formStatus, setFormStatus] = useState<CreationStatus>('draft');
    const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
    const [createModalError, setCreateModalError] = useState<string | null>(null);

    // Cargar personas asociadas al cambiar la clienta seleccionada en el formulario
    useEffect(() => {
        if (!isCreateModalOpen) return;
        if (!formClientId) {
            setClientPersons([]);
            setFormPersonId(null);
            setPersonsError(null);
            setLoadingPersons(false);
            return;
        }

        let isMounted = true;
        setLoadingPersons(true);
        setPersonsError(null);
        setFormPersonId(null); // Limpiar selección previa obligatoriamente al cambiar de clienta

        fetchClientPersons(formClientId)
            .then((persons) => {
                if (isMounted) {
                    setClientPersons(persons || []);
                }
            })
            .catch((err: any) => {
                if (isMounted) {
                    console.warn('[CreationsModule] Error cargando personas de clienta:', err);
                    setPersonsError('No se pudieron cargar las personas asociadas.');
                    setClientPersons([]);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoadingPersons(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [formClientId, isCreateModalOpen]);

    // Auto-cierre de toasts
    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    // Cargar creaciones y clientes
    useEffect(() => {
        loadData();
    }, [statusFilter]);

    // Apertura inicial si viene parametrizada por URL / navegación
    useEffect(() => {
        if (initialCreationId) {
            openCreationDetail(initialCreationId);
        }
    }, [initialCreationId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [creationsRes, clientsRes] = await Promise.all([
                fetchCreations({
                    status: statusFilter,
                    searchQuery: searchQuery.trim(),
                }),
                fetchClients('active'),
            ]);

            const finalCreations = (creationsRes.data && creationsRes.data.length > 0)
                ? creationsRes.data
                : (statusFilter === 'all'
                    ? SAMPLE_CREATIONS
                    : SAMPLE_CREATIONS.filter((c) => c.status === statusFilter));

            setCreations(finalCreations);
            setClients((clientsRes.data && clientsRes.data.length > 0) ? clientsRes.data : (SAMPLE_CLIENTS as any));
        } catch {
            const fallbackCreations = statusFilter === 'all'
                ? SAMPLE_CREATIONS
                : SAMPLE_CREATIONS.filter((c) => c.status === statusFilter);
            setCreations(fallbackCreations);
            setClients(SAMPLE_CLIENTS as any);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        const res = await fetchCreations({
            status: statusFilter,
            searchQuery: searchQuery.trim(),
        });
        if (res.data && res.data.length > 0) {
            setCreations(res.data);
        } else if (!searchQuery.trim()) {
            setCreations(statusFilter === 'all' ? SAMPLE_CREATIONS : SAMPLE_CREATIONS.filter((c) => c.status === statusFilter));
        } else {
            const q = searchQuery.toLowerCase().trim();
            const filtered = SAMPLE_CREATIONS.filter(
                (c) =>
                    (statusFilter === 'all' || c.status === statusFilter) &&
                    (c.name.toLowerCase().includes(q) ||
                    (c.occasion && c.occasion.toLowerCase().includes(q)) ||
                    (c.client?.full_name && c.client.full_name.toLowerCase().includes(q)))
            );
            setCreations(filtered);
        }
        setLoading(false);
    };

    const openCreationDetail = async (creationId: string) => {
        setLoadingDetail(true);
        try {
            const res = await fetchCreationById(creationId);
            if (res.data) {
                setSelectedCreation(res.data);
                loadClientSessionsForLink(res.data.client_id);
            } else {
                const sampleMatch = SAMPLE_CREATIONS.find((c) => c.id === creationId) || SAMPLE_CREATIONS[0];
                setSelectedCreation(sampleMatch);
            }
        } catch {
            const sampleMatch = SAMPLE_CREATIONS.find((c) => c.id === creationId) || SAMPLE_CREATIONS[0];
            setSelectedCreation(sampleMatch);
        } finally {
            setLoadingDetail(false);
        }
    };

    const loadClientSessionsForLink = async (clientId: string) => {
        setLoadingSessions(true);
        try {
            const sessions = await fetchClientMeasurementSessions(clientId);
            setClientSessions(sessions);
        } catch {
            setClientSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    };

    // Apertura modal "+ Nueva Creación"
    const handleOpenCreateModal = () => {
        setCreateModalError(null);
        setFormClientId(clients.length > 0 ? clients[0].id : '');
        setFormPersonId(null);
        setClientPersons([]);
        setPersonsError(null);
        setFormName('');
        setFormDescription('');
        setFormCreationType('bespoke');
        setFormOccasion('');
        setFormGarmentType('bodice');
        setFormTargetDate('');
        setFormNotes('');
        setFormStatus('draft');
        setIsCreateModalOpen(true);
    };

    // Guardar nueva Creación
    const handleCreateCreation = async () => {
        setCreateModalError(null);
        if (!formClientId) {
            setCreateModalError('Debe seleccionar una clienta.');
            return;
        }
        if (!formName.trim()) {
            setCreateModalError('Ingrese el nombre o título del encargo.');
            return;
        }
        if (formName.trim().length < 3) {
            setCreateModalError('El nombre debe tener al menos 3 caracteres.');
            return;
        }

        setFormSubmitting(true);
        try {
            const cleanDate = (formTargetDate.trim() && formTargetDate.trim().match(/^\d{4}-\d{2}-\d{2}$/))
                ? formTargetDate.trim()
                : undefined;

            const payload: CreateCreationDTO = {
                client_id: formClientId,
                person_id: formPersonId || null,
                name: formName.trim(),
                description: formDescription.trim() || undefined,
                creation_type: formCreationType,
                status: formStatus,
                occasion: formOccasion.trim() || undefined,
                garment_type: formGarmentType ? (formGarmentType as GarmentType) : undefined,
                target_date: cleanDate,
                notes: formNotes.trim() || undefined,
            };

            const res = await createCreation(payload);
            if (res.data) {
                setIsCreateModalOpen(false);
                setCreateModalError(null);
                setStatusMessage({
                    text: `✓ Creación "${res.data.name}" creada exitosamente.`,
                    type: 'success',
                });
                await loadData();
                await openCreationDetail(res.data.id);
            } else {
                setCreateModalError(res.error || 'Error al guardar la creación en el servidor.');
                setStatusMessage({ text: res.error || 'Error al crear la creación.', type: 'error' });
            }
        } catch (err: any) {
            setCreateModalError(err.message || 'Error inesperado al crear la creación.');
            setStatusMessage({ text: err.message || 'Error inesperado.', type: 'error' });
        } finally {
            setFormSubmitting(false);
        }
    };

    // Apertura modal editar creación
    const handleOpenEditModal = () => {
        if (!selectedCreation) return;
        setFormName(selectedCreation.name);
        setFormDescription(selectedCreation.description || '');
        setFormCreationType(selectedCreation.creation_type);
        setFormOccasion(selectedCreation.occasion || '');
        setFormGarmentType((selectedCreation.garment_type as GarmentType) || '');
        setFormTargetDate(selectedCreation.target_date || '');
        setFormNotes(selectedCreation.notes || '');
        setFormStatus(selectedCreation.status);
        setIsEditModalOpen(true);
    };

    // Guardar edición
    const handleSaveEdit = async () => {
        if (!selectedCreation) return;
        if (!formName.trim()) {
            setStatusMessage({ text: 'El nombre es obligatorio.', type: 'error' });
            return;
        }

        setFormSubmitting(true);
        try {
            const res = await updateCreation(selectedCreation.id, {
                name: formName.trim(),
                description: formDescription.trim() || null,
                creation_type: formCreationType,
                status: formStatus,
                occasion: formOccasion.trim() || null,
                garment_type: formGarmentType ? (formGarmentType as GarmentType) : null,
                target_date: formTargetDate.trim() || null,
                notes: formNotes.trim() || null,
            });

            if (res.data) {
                setIsEditModalOpen(false);
                setSelectedCreation(res.data);
                setStatusMessage({ text: '✓ Creación actualizada correctamente.', type: 'success' });
                await loadData();
            } else {
                setStatusMessage({ text: res.error || 'Error al actualizar.', type: 'error' });
            }
        } catch (err: any) {
            setStatusMessage({ text: err.message || 'Error inesperado.', type: 'error' });
        } finally {
            setFormSubmitting(false);
        }
    };

    // Cambio rápido de estado
    const handleChangeStatus = async (newStatus: CreationStatus) => {
        if (!selectedCreation) return;
        const res = await updateCreationStatus(selectedCreation.id, newStatus);
        if (res.data) {
            setSelectedCreation({ ...selectedCreation, status: newStatus });
            setStatusMessage({ text: `Estado cambiado a ${STATUS_LABELS[newStatus].label}.`, type: 'info' });
            loadData();
        } else {
            setStatusMessage({ text: res.error || 'Error cambiando estado.', type: 'error' });
        }
    };

    // Vincular sesión de medidas
    const handleSelectSessionToLink = async (sessionId: string | null) => {
        if (!selectedCreation) return;
        const res = await linkSessionToCreation(selectedCreation.id, sessionId);
        if (res.success) {
            setIsLinkSessionModalOpen(false);
            setStatusMessage({
                text: sessionId ? '✓ Sesión de medidas asociada a la creación.' : 'Sesión desvinculada.',
                type: 'success',
            });
            await openCreationDetail(selectedCreation.id);
        } else {
            setStatusMessage({ text: res.error || 'Error vinculando sesión.', type: 'error' });
        }
    };

    // Si el usuario abrió el Taller CAD para esta creación:

    return {
        role,
        creations,
        setCreations,
        loading,
        setLoading,
        statusFilter,
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        statusMessage,
        setStatusMessage,
        selectedCreation,
        setSelectedCreation,
        loadingDetail,
        setLoadingDetail,
        detailActiveTab,
        setDetailActiveTab,
        clients,
        setClients,
        clientSessions,
        setClientSessions,
        loadingSessions,
        setLoadingSessions,
        clientPersons,
        setClientPersons,
        loadingPersons,
        setLoadingPersons,
        personsError,
        setPersonsError,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isLinkSessionModalOpen,
        setIsLinkSessionModalOpen,
        formClientId,
        setFormClientId,
        formPersonId,
        setFormPersonId,
        formName,
        setFormName,
        formCreationType,
        setFormCreationType,
        formOccasion,
        setFormOccasion,
        formTargetDate,
        setFormTargetDate,
        formGarmentType,
        setFormGarmentType,
        formDescription,
        setFormDescription,
        formNotes,
        setFormNotes,
        formSubmitting,
        setFormSubmitting,
        createModalError,
        setCreateModalError,
        isCadOpen,
        setIsCadOpen,
        loadData,
        openCreationDetail,
        handleSearch,
        handleOpenCreateModal,
        handleCreateCreation,
        handleOpenEditModal,
        handleSaveEdit,
        handleChangeStatus,
        handleSelectSessionToLink,
    };
}

export type CreationsStudioState = ReturnType<typeof useCreationsState>;
