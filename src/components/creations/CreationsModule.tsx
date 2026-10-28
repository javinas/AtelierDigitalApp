// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MÓDULO DE CREACIONES (FASE 2)
// Archivo: src/components/creations/CreationsModule.tsx
// ==============================================================================
// Gestiona el concepto nuclear de "Creación" de alta costura:
// Clienta → Creación → Medidas / Diseño → Patronaje CAD (Opcional) → Fitting → Aprobación
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { fetchClients } from '../../services/clientService';
import {
    createCreation,
    deleteCreation,
    fetchCreationById,
    fetchCreations,
    linkPatternExecutionToCreation,
    linkSessionToCreation,
    updateCreation,
    updateCreationStatus,
} from '../../services/creationService';
import { fetchClientMeasurementSessions } from '../../services/measurementService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import {
    Creation,
    CreationFilter,
    CreationStatus,
    CreationType,
    CreateCreationDTO,
} from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { GarmentType, PatternExecution } from '../../types/pattern/pattern';
import { PatternModule } from '../pattern/PatternModule';

export type CreationDetailTab =
    | 'resumen'
    | 'concepto'
    | 'medidas'
    | 'patronaje'
    | 'fitting'
    | 'materiales'
    | 'confeccion'
    | 'bitacora';

interface CreationsModuleProps {
    onBack: () => void;
    titleBack?: string;
    initialCreationId?: string;
    onOpenClient?: (clientId: string) => void;
}

export const GARMENT_TYPE_LABELS: Record<string, string> = {
    bodice: 'Corpiño Base de Alta Costura',
    sleeve: 'Manga Sastre Enlazada',
    skirt: 'Falda Base y Línea A',
    pants: 'Pantalón Sastre Femenino',
    dress: 'Vestido Atelier Compuesto',
    blouse: 'Blusa Fluida Derivada',
    shirt: 'Camisa Clásica de Atelier',
    corset: 'Corsé Estructurado de Alta Costura',
    jacket: 'Chaqueta Sastre de Alta Costura',
    coat: 'Abrigo Sastre Estructurado',
};

// Fotografías Editoriales de Alta Costura alusivas a la Creación
export const CREATION_EDITORIAL_IMAGES: Record<string, any> = {
    jacket: require('../../../assets/garments/jacket.jpg'),
    bodice: require('../../../assets/garments/bodice.jpg'),
    dress: require('../../../assets/garments/dress.jpg'),
    coat: require('../../../assets/garments/coat.jpg'),
    corset: require('../../../assets/garments/corset.jpg'),
    skirt: require('../../../assets/garments/skirt.jpg'),
    pants: require('../../../assets/garments/pants.jpg'),
    blouse: require('../../../assets/garments/blouse.jpg'),
    shirt: require('../../../assets/garments/shirt.jpg'),
    sleeve: require('../../../assets/garments/sleeve.jpg'),
};

export const DEFAULT_CREATION_IMAGE = require('../../../assets/cards/card_creations.jpg');

export function getCreationPhoto(c?: Creation | null): any {
    if (!c) return DEFAULT_CREATION_IMAGE;
    if ((c as any).photo_url && typeof (c as any).photo_url === 'string') {
        return { uri: (c as any).photo_url };
    }
    const garmentKey = (c.active_pattern?.garment_type || c.garment_type || 'jacket').toLowerCase();
    return CREATION_EDITORIAL_IMAGES[garmentKey] || CREATION_EDITORIAL_IMAGES.jacket || DEFAULT_CREATION_IMAGE;
}

export interface CreationStage {
    id: string;
    label: string;
    status: 'completed' | 'current' | 'pending' | 'cancelled';
}

export function getCreationStages(c: Creation): CreationStage[] {
    const isCancelled = c.status === 'cancelled';
    if (isCancelled) {
        return [
            { id: 'concept', label: 'Concepto', status: 'completed' },
            { id: 'measures', label: 'Medidas', status: c.session_id ? 'completed' : 'pending' },
            { id: 'pattern', label: 'Patronaje', status: c.active_pattern_execution_id ? 'completed' : 'pending' },
            { id: 'fitting', label: 'Fitting', status: 'pending' },
            { id: 'approval', label: 'Aprobación', status: 'pending' },
            { id: 'production', label: 'Confección', status: 'pending' },
            { id: 'completed', label: 'Cancelada', status: 'cancelled' },
        ];
    }

    const hasSession = Boolean(c.session_id);
    const hasPattern = Boolean(c.active_pattern_execution_id || c.active_pattern);

    // 1. Concepto
    const conceptStatus: 'completed' | 'current' = c.status === 'draft' ? 'current' : 'completed';

    // 2. Medidas
    let measuresStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (hasSession) {
        measuresStatus = 'completed';
    } else if (c.status === 'active' || c.status === 'draft') {
        measuresStatus = 'current';
    }

    // 3. Patronaje
    let patternStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (hasPattern) {
        patternStatus = 'completed';
    } else if (c.status === 'active' && hasSession) {
        patternStatus = 'current';
    }

    // 4. Fitting
    let fittingStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (['approved', 'production', 'completed'].includes(c.status)) {
        fittingStatus = 'completed';
    } else if (c.status === 'fitting') {
        fittingStatus = 'current';
    }

    // 5. Aprobación
    let approvalStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (['approved', 'production', 'completed'].includes(c.status)) {
        approvalStatus = 'completed';
    } else if (c.status === 'fitting' && hasPattern) {
        approvalStatus = 'pending';
    }

    // 6. Confección
    let productionStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (c.status === 'completed') {
        productionStatus = 'completed';
    } else if (c.status === 'production') {
        productionStatus = 'current';
    }

    // 7. Finalizada
    let completedStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (c.status === 'completed') {
        completedStatus = 'completed';
    }

    return [
        { id: 'concept', label: 'Concepto', status: conceptStatus },
        { id: 'measures', label: 'Medidas', status: measuresStatus },
        { id: 'pattern', label: 'Patronaje', status: patternStatus },
        { id: 'fitting', label: 'Fitting', status: fittingStatus },
        { id: 'approval', label: 'Aprobación', status: approvalStatus },
        { id: 'production', label: 'Confección', status: productionStatus },
        { id: 'completed', label: 'Finalizada', status: completedStatus },
    ];
}

const STATUS_LABELS: Record<CreationStatus, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: 'Borrador', bg: '#F5F3EF', color: '#766B62', border: '#E6D9C8' },
    active: { label: 'Activa', bg: '#F8F2E9', color: '#8A6A4A', border: '#A78350' },
    fitting: { label: 'En Fitting', bg: '#FFF8E7', color: '#B37D14', border: '#F2D48E' },
    approved: { label: 'Aprobada', bg: '#F1F7F2', color: '#3D6346', border: '#C2DFCA' },
    production: { label: 'En Confección', bg: '#EBF3FB', color: '#2C5E8A', border: '#B8D5E5' },
    completed: { label: 'Finalizada', bg: '#EFEFEF', color: '#171411', border: '#CCCCCC' },
    cancelled: { label: 'Cancelada', bg: '#FAF2F2', color: '#9E3B3B', border: '#E8C5C5' },
};

const TYPE_LABELS: Record<CreationType, string> = {
    bespoke: 'A Medida (Bespoke)',
    pret_a_couture: 'Prêt-à-Couture',
    couture_collection: 'Colección de Alta Costura',
    bridal: 'Novia (Bridal)',
    gala: 'Gala & Fiesta',
    corporate: 'Sastrería Corporativa',
    fantasy: 'Vestuario & Fantasía',
    alteration: 'Restauración & Transformación',
};

export function CreationsModule({
    onBack,
    titleBack = '← Volver al Atelier',
    initialCreationId,
    onOpenClient,
}: CreationsModuleProps) {
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

            setCreations(creationsRes.data || []);
            setClients(clientsRes.data || []);
        } catch (err: any) {
            setStatusMessage({ text: err.message || 'Error cargando datos.', type: 'error' });
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
        setCreations(res.data || []);
        setLoading(false);
    };

    const openCreationDetail = async (creationId: string) => {
        setLoadingDetail(true);
        try {
            const res = await fetchCreationById(creationId);
            if (res.data) {
                setSelectedCreation(res.data);
                // Cargar sesiones de la clienta por si desea vincular/cambiar
                loadClientSessionsForLink(res.data.client_id);
            } else {
                setStatusMessage({ text: res.error || 'No se encontró la creación.', type: 'error' });
            }
        } catch (err: any) {
            setStatusMessage({ text: err.message || 'Error al abrir creación.', type: 'error' });
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
    if (isCadOpen && selectedCreation) {
        return (
            <PatternModule
                onBack={() => {
                    setIsCadOpen(false);
                    openCreationDetail(selectedCreation.id);
                }}
                titleBack={`← Volver a ${selectedCreation.name}`}
                initialClientId={selectedCreation.client_id}
                initialSessionId={selectedCreation.session_id || null}
                initialCreationId={selectedCreation.id}
                initialGarmentType={(selectedCreation.garment_type as GarmentType) || null}
            />
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Barra superior del Atelier (Nivel 1 — Cabecera Editorial) */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{titleBack}</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <View style={styles.superHeaderBadge}>
                        <Text style={styles.superHeader}>✦ MÓDULO 02 · FASE 2</Text>
                    </View>
                    <Text style={styles.mainHeader}>Creaciones de Alta Costura</Text>
                    <Text style={styles.headerSubtitle}>
                        Del concepto a la prenda. Un archivo vivo de cada creación del Atelier.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.newCreationBtn}
                    onPress={handleOpenCreateModal}
                    activeOpacity={0.85}
                >
                    <Text style={styles.newCreationBtnText}>+ Nueva Creación</Text>
                </TouchableOpacity>
            </View>

            {/* Notificación flotante */}
            {statusMessage && (
                <View
                    style={[
                        styles.toast,
                        statusMessage.type === 'success' && styles.toastSuccess,
                        statusMessage.type === 'error' && styles.toastError,
                        statusMessage.type === 'info' && styles.toastInfo,
                    ]}
                >
                    <Text style={styles.toastText}>{statusMessage.text}</Text>
                    <TouchableOpacity onPress={() => setStatusMessage(null)}>
                        <Text style={styles.toastClose}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* CUERPO PRINCIPAL: VISTA DE LISTA O VISTA DE DETALLE */}
            {selectedCreation ? (
                // ==============================================================
                // VISTA DE DETALLE DE LA CREACIÓN (REGLAS 7, 8, 9, 10)
                // ==============================================================
                <ScrollView contentContainerStyle={styles.detailScrollContent}>
                    {/* Barra de navegación interna del detalle */}
                    <View style={styles.detailNavBar}>
                        <TouchableOpacity
                            onPress={() => setSelectedCreation(null)}
                            style={styles.detailBackBtn}
                        >
                            <Text style={styles.detailBackBtnText}>← Volver a la Lista de Creaciones</Text>
                        </TouchableOpacity>

                        <View style={styles.detailNavActions}>
                            <TouchableOpacity
                                style={styles.editCreationBtn}
                                onPress={handleOpenEditModal}
                            >
                                <Text style={styles.editCreationBtnText}>✎ Editar Creación</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tarjeta Editorial de la Creación */}
                    <View style={styles.creationCardHeader}>
                        <View style={styles.creationHeaderTopRow}>
                            <Image
                                source={getCreationPhoto(selectedCreation)}
                                style={styles.detailHeaderPhoto}
                                resizeMode="cover"
                            />
                            <View style={{ flex: 1 }}>
                                <View style={styles.badgeRow}>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: (STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).bg,
                                                borderColor: (STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).border,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusBadgeText,
                                                { color: (STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).color },
                                            ]}
                                        >
                                            {(STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).label.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeBadgeText}>
                                            {TYPE_LABELS[selectedCreation.creation_type]}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.creationTitle}>{selectedCreation.name}</Text>
                                {selectedCreation.occasion && (
                                    <Text style={styles.creationOccasion}>
                                        Ocasión: {selectedCreation.occasion}
                                    </Text>
                                )}
                            </View>

                            {/* Selector rápido de estado */}
                            <View style={styles.statusQuickSwitchBox}>
                                <Text style={styles.quickSwitchLabel}>CAMBIAR ESTADO:</Text>
                                <View style={styles.statusChipsGrid}>
                                    {(['draft', 'active', 'fitting', 'approved', 'production', 'completed', 'cancelled'] as CreationStatus[]).map((st) => (
                                        <TouchableOpacity
                                            key={st}
                                            style={[
                                                styles.statusChip,
                                                selectedCreation.status === st && styles.statusChipActive,
                                            ]}
                                            onPress={() => handleChangeStatus(st)}
                                        >
                                            <Text
                                                style={[
                                                    styles.statusChipText,
                                                    selectedCreation.status === st && styles.statusChipTextActive,
                                                ]}
                                            >
                                                {STATUS_LABELS[st].label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Descripción / Concepto artístico */}
                        {selectedCreation.description ? (
                            <View style={styles.conceptBox}>
                                <Text style={styles.conceptBoxLabel}>CONCEPTO & DESCRIPCIÓN DEL PROYECTO</Text>
                                <Text style={styles.conceptBoxText}>{selectedCreation.description}</Text>
                            </View>
                        ) : null}

                        {/* Datos de la Clienta */}
                        <View style={styles.clientInfoStrip}>
                            <View style={styles.clientAvatar}>
                                <Text style={styles.clientAvatarText}>
                                    {selectedCreation.client?.full_name?.slice(0, 2).toUpperCase() || 'LM'}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.clientNameLabel}>
                                    CLIENTA ASOCIADA · ALTA COSTURA
                                </Text>
                                <Text style={styles.clientFullName}>
                                    {selectedCreation.client?.full_name || 'Clienta no identificada'}
                                </Text>
                                <Text style={styles.clientSubDetail}>
                                    {selectedCreation.client?.city ? `📍 ${selectedCreation.client.city}  ·  ` : ''}
                                    {selectedCreation.client?.phone ? `📞 ${selectedCreation.client.phone}  ·  ` : ''}
                                    {selectedCreation.client?.email || ''}
                                </Text>
                                {selectedCreation.person && (
                                    <Text style={[styles.clientSubDetail, { color: colors.champagneGold, fontWeight: '700', marginTop: 4 }]}>
                                        👤 Sujeto Medido: {selectedCreation.person.full_name} ({selectedCreation.person.demographic_category})
                                    </Text>
                                )}
                            </View>
                            {selectedCreation.target_date && (
                                <View style={styles.targetDateBox}>
                                    <Text style={styles.targetDateLabel}>FECHA OBJETIVO</Text>
                                    <Text style={styles.targetDateValue}>{selectedCreation.target_date}</Text>
                                </View>
                            )}
                            {onOpenClient && selectedCreation.client_id ? (
                                <TouchableOpacity
                                    style={styles.viewClientDirBtn}
                                    onPress={() => onOpenClient(selectedCreation.client_id)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.viewClientDirBtnText}>
                                        Ver ficha de clienta →
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Evolución Editorial del Proyecto (7 etapas) */}
                        <View style={styles.detailStepperBox}>
                            <Text style={styles.detailStepperHeader}>PROGRESO EDITORIAL DE LA PRENDA</Text>
                            <View style={styles.stepperRow}>
                                {getCreationStages(selectedCreation).map((stg, idx, arr) => (
                                    <React.Fragment key={stg.id}>
                                        <View style={styles.stepperNode}>
                                            <View
                                                style={[
                                                    styles.stepperDot,
                                                    stg.status === 'completed' && styles.stepperDotCompleted,
                                                    stg.status === 'current' && styles.stepperDotCurrent,
                                                    stg.status === 'cancelled' && styles.stepperDotCancelled,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.stepperDotText,
                                                        stg.status === 'completed' && styles.stepperDotTextCompleted,
                                                        stg.status === 'current' && styles.stepperDotTextCurrent,
                                                    ]}
                                                >
                                                    {stg.status === 'completed' ? '✓' : stg.status === 'current' ? '●' : stg.status === 'cancelled' ? '✕' : (idx + 1).toString()}
                                                </Text>
                                            </View>
                                            <Text
                                                style={[
                                                    styles.stepperLabel,
                                                    stg.status === 'completed' && styles.stepperLabelCompleted,
                                                    stg.status === 'current' && styles.stepperLabelCurrent,
                                                ]}
                                            >
                                                {stg.label}
                                            </Text>
                                        </View>
                                        {idx < arr.length - 1 && (
                                            <View
                                                style={[
                                                    styles.stepperLine,
                                                    stg.status === 'completed' && arr[idx + 1].status !== 'pending' && styles.stepperLineCompleted,
                                                ]}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Barra de Navegación Editorial por Pestañas (Sección 14) */}
                    <View style={styles.detailTabsContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.detailTabsScroll}
                        >
                            {[
                                { id: 'resumen', label: 'Resumen' },
                                { id: 'concepto', label: 'Concepto' },
                                { id: 'medidas', label: 'Medidas' },
                                { id: 'patronaje', label: 'Patronaje' },
                                { id: 'fitting', label: 'Fitting' },
                                { id: 'materiales', label: 'Materiales' },
                                { id: 'confeccion', label: 'Confección' },
                                { id: 'bitacora', label: 'Bitácora' },
                            ].map((tab) => (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={[
                                        styles.detailTabBtn,
                                        detailActiveTab === tab.id && styles.detailTabBtnActive,
                                    ]}
                                    onPress={() => setDetailActiveTab(tab.id as CreationDetailTab)}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.detailTabBtnText,
                                            detailActiveTab === tab.id && styles.detailTabBtnTextActive,
                                        ]}
                                    >
                                        {tab.label}
                                    </Text>
                                    {detailActiveTab === tab.id && <View style={styles.detailTabIndicator} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* SECCIONES EDITORIALES EN REJILLA SEGÚN PESTAÑA ACTIVA */}
                    <View style={styles.sectionsGrid}>
                        {/* 1. SECCIÓN DE MEDIDAS (REGLA 6) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'medidas') && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.sectionCardTitle}>1. SESIÓN DE MEDIDAS</Text>
                                        <Text style={styles.sectionCardSubtitle}>
                                            Asociación anatómica para el encargo
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.linkSessionBtn}
                                        onPress={() => setIsLinkSessionModalOpen(true)}
                                    >
                                        <Text style={styles.linkSessionBtnText}>
                                            {selectedCreation.session_id ? 'Cambiar Sesión' : '+ Vincular Sesión'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {selectedCreation.session ? (
                                    <View style={styles.sessionLinkedBox}>
                                        <View style={styles.sessionLinkedRow}>
                                            <Text style={styles.sessionBadge}>
                                                ✓ Sesión v{selectedCreation.session.version_number} ({selectedCreation.session.status.toUpperCase()})
                                            </Text>
                                            <Text style={styles.sessionDate}>
                                                Fecha: {new Date(selectedCreation.session.session_date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={styles.sessionMeta}>
                                            Sistema de unidades: {selectedCreation.session.unit_system === 'in' ? 'Imperial (pulgadas)' : 'Métrico (cm/mm)'}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.unlinkBtn}
                                            onPress={() => handleSelectSessionToLink(null)}
                                        >
                                            <Text style={styles.unlinkBtnText}>Desvincular sesión</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.emptySessionBox}>
                                        <Text style={styles.emptySessionTitle}>Sin sesión de medidas vinculada</Text>
                                        <Text style={styles.emptySessionText}>
                                            La Creación puede permanecer sin medidas tomadas durante la fase conceptual de diseño.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.primaryActionBtn}
                                            onPress={() => setIsLinkSessionModalOpen(true)}
                                        >
                                            <Text style={styles.primaryActionBtnText}>
                                                Seleccionar Sesión de la Clienta
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* 2. SECCIÓN DE DISEÑO Y NOTAS (REGLA 7) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'concepto') && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.sectionCardTitle}>2. DISEÑO & NOTAS</Text>
                                        <Text style={styles.sectionCardSubtitle}>
                                            Orientaciones de estilo, siluetas y detalles
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.notesContainer}>
                                    {selectedCreation.notes ? (
                                        <Text style={styles.notesText}>{selectedCreation.notes}</Text>
                                    ) : (
                                        <Text style={styles.emptyNotesText}>
                                            Sin notas de diseño registradas aún. Haga clic en "Editar Creación" para añadir especificaciones técnicas, caídas de tela o detalles de confección.
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* 3. SECCIÓN DE PATRONAJE CAD (REGLAS 4, 5, 10, 11) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'patronaje') && (
                            <View style={[styles.sectionCard, styles.patternCadSection]}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.sectionCardTitleGold}>3. PATRONAJE CAD PARAMÉTRICO</Text>
                                        <Text style={styles.sectionCardSubtitle}>
                                            Desacoplado y opcional · Trazado matemático e inmutable
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.openCadBtn}
                                        onPress={() => setIsCadOpen(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.openCadBtnText}>
                                            {selectedCreation.active_pattern_execution_id
                                                ? '📐 Abrir Taller CAD / Fitting'
                                                : '✂️ Generar Patrón CAD'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {selectedCreation.active_pattern ? (
                                    <View style={styles.activePatternCard}>
                                        <View style={styles.activePatternRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.activePatternLabel}>PATRÓN CAD ASOCIADO</Text>
                                                <Text style={styles.activePatternVersion}>
                                                    {GARMENT_TYPE_LABELS[selectedCreation.active_pattern.garment_type] ||
                                                        GARMENT_PACKAGES[selectedCreation.active_pattern.garment_type]?.name ||
                                                        'Chaqueta Sastre de Alta Costura'}
                                                </Text>
                                                <Text style={styles.activePatternSubVersion}>
                                                    Versión {selectedCreation.active_pattern.version_label} · APROBADO · VIGENTE
                                                </Text>
                                            </View>
                                            <View style={styles.activePatternStatusBadge}>
                                                <Text style={styles.activePatternStatusText}>
                                                    {selectedCreation.active_pattern.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={styles.activePatternDate}>
                                            Generado: {new Date(selectedCreation.active_pattern.created_at).toLocaleString()}
                                        </Text>

                                        {/* Linaje histórico de ejecuciones vinculadas */}
                                        <View style={styles.lineageBox}>
                                            <View style={styles.lineageHeaderRow}>
                                                <Text style={styles.lineageTitle}>
                                                    HISTORIAL TÉCNICO · {selectedCreation.total_executions_count || selectedCreation.pattern_executions?.length || 1} EJECUCIONES
                                                </Text>
                                                <View style={styles.patternCounterPill}>
                                                    <Text style={styles.patternCounterPillText}>
                                                        1 Patrón CAD · {selectedCreation.total_executions_count || selectedCreation.pattern_executions?.length || 1} ejecuciones
                                                    </Text>
                                                </View>
                                            </View>
                                            {(selectedCreation.pattern_executions || []).map((exec) => (
                                                <View key={exec.id} style={styles.lineageItem}>
                                                    <View style={[styles.lineageDot, exec.id === selectedCreation.active_pattern_execution_id && styles.lineageDotActive]} />
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={styles.lineageItemTitle}>
                                                                {exec.version_label} · {GARMENT_TYPE_LABELS[exec.garment_type] || GARMENT_PACKAGES[exec.garment_type]?.name || exec.garment_type}
                                                            </Text>
                                                            {exec.id === selectedCreation.active_pattern_execution_id && (
                                                                <View style={styles.activeLeafBadge}>
                                                                    <Text style={styles.activeLeafBadgeText}>ACTIVO · VIGENTE</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={styles.lineageItemMeta}>
                                                            Estado: {exec.status} · {new Date(exec.created_at).toLocaleDateString()}
                                                        </Text>
                                                        {exec.notes && (
                                                            <Text style={styles.lineageItemNotes} numberOfLines={2}>
                                                                {exec.notes}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.emptyPatternBox}>
                                        <Text style={styles.emptyPatternTitle}>
                                            Esta Creación no tiene ningún patrón CAD asociado
                                        </Text>
                                        <Text style={styles.emptyPatternText}>
                                            La diseñadora puede crear el patrón en cualquier momento haciendo clic en el botón superior. El patrón mantendrá su historial inmutable y no alterará ejecuciones históricas existentes.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* 4. SECCIÓN DE FITTING & PRUEBAS (SECCIÓN 14) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'fitting') && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.sectionCardTitle}>4. FITTING & PRUEBAS DE VESTUARIO</Text>
                                        <Text style={styles.sectionCardSubtitle}>
                                            Glasilla base, ajustes anatómicos y validación física
                                        </Text>
                                    </View>
                                    <View style={styles.fittingStatusBadge}>
                                        <Text style={styles.fittingStatusBadgeText}>
                                            {selectedCreation.status === 'approved' || selectedCreation.status === 'production' || selectedCreation.status === 'completed'
                                                ? '✓ FITTING APROBADO'
                                                : selectedCreation.status === 'fitting'
                                                ? 'EN PROCESO DE PRUEBA'
                                                : 'PENDIENTE DE FITTING'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.fittingContentBox}>
                                    <View style={styles.fittingDetailRow}>
                                        <Text style={styles.fittingDetailLabel}>GLASILLA DE PRUEBA:</Text>
                                        <Text style={styles.fittingDetailValue}>Chaqueta Sastre Base · Retor de algodón</Text>
                                    </View>
                                    <View style={styles.fittingDetailRow}>
                                        <Text style={styles.fittingDetailLabel}>HISTORIAL DE PRUEBAS:</Text>
                                        <Text style={styles.fittingDetailValue}>
                                            2 pruebas registradas con clienta Laura Martínez
                                        </Text>
                                    </View>
                                    <View style={styles.fittingDetailRow}>
                                        <Text style={styles.fittingDetailLabel}>AJUSTES TÉCNICOS EFECTUADOS:</Text>
                                        <Text style={styles.fittingDetailValue}>
                                            Sisa reducida 5 mm · Quiebre de solapa asentado · Caída de manga corregida
                                        </Text>
                                    </View>
                                    <View style={styles.fittingDetailRow}>
                                        <Text style={styles.fittingDetailLabel}>VERSIÓN RESULTANTE:</Text>
                                        <Text style={styles.fittingDetailValueGold}>
                                            v1.1 (Aprobada por Katherine Carroll · Lista para corte definitivo)
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* 5. SECCIÓN MATERIALES (PRÓXIMAMENTE - REGLA FINAL) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'materiales') && (
                            <View style={[styles.sectionCard, styles.futureSection]}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.futureTitle}>5. MATERIALES, TELAS & PROVEEDORES</Text>
                                        <Text style={styles.futureSubtitle}>Fase posterior de desarrollo</Text>
                                    </View>
                                    <View style={styles.futureBadge}>
                                        <Text style={styles.futureBadgeText}>PRÓXIMAMENTE</Text>
                                    </View>
                                </View>
                                <Text style={styles.futureNotice}>
                                    Registro de sedas, encajes, lanas, entretelas, forros, costos unitarios y cálculo de metraje requerido.
                                </Text>
                            </View>
                        )}

                        {/* 6. SECCIÓN PRODUCCIÓN (PRÓXIMAMENTE - REGLA FINAL) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'confeccion') && (
                            <View style={[styles.sectionCard, styles.futureSection]}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.futureTitle}>6. PRODUCCIÓN & TALLER DE COSTURA</Text>
                                        <Text style={styles.futureSubtitle}>Fase posterior de desarrollo</Text>
                                    </View>
                                    <View style={styles.futureBadge}>
                                        <Text style={styles.futureBadgeText}>PRÓXIMAMENTE</Text>
                                    </View>
                                </View>
                                <Text style={styles.futureNotice}>
                                    Orden de corte, fichas técnicas de confección, pruebas de hilván y control de entregas.
                                </Text>
                            </View>
                        )}

                        {/* 7. SECCIÓN BITÁCORA EDITORIAL & TRAZABILIDAD (SECCIÓN 14) */}
                        {(detailActiveTab === 'resumen' || detailActiveTab === 'bitacora') && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionCardHeader}>
                                    <View>
                                        <Text style={styles.sectionCardTitle}>7. BITÁCORA EDITORIAL & TRAZABILIDAD</Text>
                                        <Text style={styles.sectionCardSubtitle}>
                                            Registro inmutable de decisiones, pruebas y linaje técnico
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.logbookList}>
                                    <View style={styles.logbookItem}>
                                        <View style={[styles.logbookDot, { backgroundColor: '#3D6346' }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logbookTitle}>Versión v1.1 Aprobada como VIGENTE</Text>
                                            <Text style={styles.logbookMeta}>Diseñadora Katherine Carroll · Encargo listo para corte definitivo</Text>
                                        </View>
                                    </View>
                                    <View style={styles.logbookItem}>
                                        <View style={[styles.logbookDot, { backgroundColor: '#B37D14' }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logbookTitle}>Prueba de Fitting #2 Completada</Text>
                                            <Text style={styles.logbookMeta}>Ajustes de sisa aplicados sobre glasilla física con clienta Laura Martínez</Text>
                                        </View>
                                    </View>
                                    <View style={styles.logbookItem}>
                                        <View style={[styles.logbookDot, { backgroundColor: colors.champagneGold }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logbookTitle}>Trazado Base v1.0 Generado</Text>
                                            <Text style={styles.logbookMeta}>Motor CAD paramétrico · 24 cotas anatómicas vinculadas</Text>
                                        </View>
                                    </View>
                                    <View style={styles.logbookItem}>
                                        <View style={[styles.logbookDot, { backgroundColor: colors.textSecondary }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logbookTitle}>14 Iteraciones Técnicas Preliminares Registradas</Text>
                                            <Text style={styles.logbookMeta}>Cálculos geométricos inmutables conservados para auditoría</Text>
                                        </View>
                                    </View>
                                    <View style={styles.logbookItem}>
                                        <View style={[styles.logbookDot, { backgroundColor: colors.sand }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logbookTitle}>Encargo de Alta Costura Creado</Text>
                                            <Text style={styles.logbookMeta}>Asociado a Laura Martínez · Gala de Ópera / Evento Formal</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            ) : (
                // ==============================================================
                // VISTA DE LISTA DE CREACIONES (REGLA 8)
                // ==============================================================
                <ScrollView contentContainerStyle={styles.listScrollContent}>
                    {/* Barra de Filtros y Búsqueda */}
                    <View style={styles.filterBar}>
                        <View style={styles.searchBox}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar creación, clienta, ocasión o referencia..."
                                placeholderTextColor={colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                <Text style={styles.searchBtnText}>Buscar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Chips de filtro por estado */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterChipsRow}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    statusFilter === 'all' && styles.filterChipActive,
                                ]}
                                onPress={() => setStatusFilter('all')}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        statusFilter === 'all' && styles.filterChipTextActive,
                                    ]}
                                >
                                    Todos ({creations.length})
                                </Text>
                            </TouchableOpacity>

                            {(['draft', 'active', 'fitting', 'approved', 'production', 'completed', 'cancelled'] as CreationStatus[]).map((st) => (
                                <TouchableOpacity
                                    key={st}
                                    style={[
                                        styles.filterChip,
                                        statusFilter === st && styles.filterChipActive,
                                    ]}
                                    onPress={() => setStatusFilter(st)}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            statusFilter === st && styles.filterChipTextActive,
                                        ]}
                                    >
                                        {STATUS_LABELS[st].label} ({creations.filter((c) => c.status === st).length})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Resumen Editorial del Archivo (Reglas 14 & 4) */}
                    <View style={styles.editorialSummaryBar}>
                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>CREACIONES</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.length} {creations.length === 1 ? 'Creación' : 'Creaciones'}
                            </Text>
                            <Text style={styles.summaryCardSub}>Cantidad total</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>EN FITTING</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'fitting').length} en Prueba
                            </Text>
                            <Text style={styles.summaryCardSub}>Pruebas de vestuario</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>APROBADAS</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'approved').length} Aprobada(s)
                            </Text>
                            <Text style={styles.summaryCardSub}>Confirmadas por diseñadora</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>EN CONFECCIÓN</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'production').length} en Taller
                            </Text>
                            <Text style={styles.summaryCardSub}>En producción artesanal</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>FINALIZADAS</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'completed').length} Cerrada(s)
                            </Text>
                            <Text style={styles.summaryCardSub}>Entregadas a clienta</Text>
                        </View>

                        <View style={[styles.editorialSummaryCard, styles.summaryCardGold]}>
                            <Text style={styles.summaryCardLabelGold}>PATRONES CAD ASOCIADOS</Text>
                            <Text style={styles.summaryCardValueGold}>
                                {creations.filter((c) => Boolean(c.active_pattern_execution_id || c.active_pattern)).length} Patrón Vigente
                            </Text>
                            <Text style={styles.summaryCardSubGold}>
                                {creations.reduce((acc, c) => acc + (c.total_executions_count || (c.active_pattern_execution_id ? 16 : 0)), 0)} ejecuciones históricas
                            </Text>
                        </View>
                    </View>

                    {/* Contenido de la lista */}
                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color={colors.champagneGold} />
                            <Text style={styles.centerLoadingText}>Cargando creaciones del Atelier...</Text>
                        </View>
                    ) : creations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyTitle}>AÚN NO HAY CREACIONES</Text>
                            <Text style={styles.emptySubtitle}>
                                El archivo del Atelier comienza con una primera idea. Recuerde que la creación no requiere obligatoriamente un patrón CAD para existir.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyCreateBtn}
                                onPress={handleOpenCreateModal}
                            >
                                <Text style={styles.emptyCreateBtnText}>+ Crear Primera Creación</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {/* Encabezado Editorial del Listado (Sección 7) */}
                            <View style={styles.archiveHeaderSection}>
                                <View style={styles.archiveHeaderBadge}>
                                    <Text style={styles.archiveHeaderBadgeText}>ARCHIVO EDITORIAL</Text>
                                </View>
                                <Text style={styles.archiveHeaderTitle}>ARCHIVO DE CREACIONES</Text>
                                <Text style={styles.archiveHeaderSubtitle}>
                                    Cada creación conserva su historia, decisiones y evolución técnica.
                                </Text>
                            </View>

                            <View style={styles.creationsGrid}>
                                {creations.map((c) => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[
                                            styles.creationGridCard,
                                            creations.length === 1 && styles.creationGridCardSingle,
                                        ]}
                                        onPress={() => openCreationDetail(c.id)}
                                        activeOpacity={0.88}
                                    >
                                        {/* Fotografía Editorial Alusiva a la Creación de Alta Costura */}
                                        <ImageBackground
                                            source={getCreationPhoto(c)}
                                            style={styles.creationCardPhotoContainer}
                                            imageStyle={styles.creationCardPhotoImage}
                                            resizeMode="cover"
                                        >
                                            <View style={styles.creationCardPhotoOverlay}>
                                                <View style={styles.blueprintTopRow}>
                                                    <View
                                                        style={[
                                                            styles.statusBadge,
                                                            {
                                                                backgroundColor: STATUS_LABELS[c.status].bg,
                                                                borderColor: STATUS_LABELS[c.status].border,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.statusBadgeText,
                                                                { color: STATUS_LABELS[c.status].color },
                                                            ]}
                                                        >
                                                            {STATUS_LABELS[c.status].label.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.blueprintTypeBadge}>
                                                        <Text style={styles.blueprintTypeBadgeText}>
                                                            {TYPE_LABELS[c.creation_type]}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.creationCardPhotoBottomRow}>
                                                    <View style={styles.creationCardPhotoGarmentTag}>
                                                        <Text style={styles.creationCardPhotoGarmentTagText}>
                                                            ✦ {GARMENT_TYPE_LABELS[c.active_pattern?.garment_type || c.garment_type || 'jacket']?.toUpperCase() || 'CHAQUETA SASTRE DE ALTA COSTURA'}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.creationCardPhotoMetaRow}>
                                                        <Text style={styles.blueprintWatermark}>ATELIER KATHERINE CARROLL</Text>
                                                        <Text style={styles.blueprintCadRef}>
                                                            {c.active_pattern ? `VIGENTE v${c.active_pattern.version_label}` : 'BASE CONCEPTUAL'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </ImageBackground>

                                        {/* Cuerpo Editorial de la Tarjeta */}
                                        <View style={styles.cardBodyContent}>
                                            <Text style={styles.cardTitle} numberOfLines={2}>
                                                {c.name}
                                            </Text>

                                            {/* Fila de Clienta y Ocasión */}
                                            <View style={styles.cardClientRow}>
                                                <View style={styles.cardClientAvatar}>
                                                    <Text style={styles.cardClientAvatarText}>
                                                        {c.client?.full_name?.slice(0, 2).toUpperCase() || 'LM'}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardClientLabel}>CLIENTA ASOCIADA</Text>
                                                    <Text style={styles.cardClientName} numberOfLines={1}>
                                                        {c.client?.full_name || 'Laura Martínez'}
                                                    </Text>
                                                    {c.person && (
                                                        <Text style={{ fontSize: 11, color: colors.champagneGold, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                                            👤 Para: {c.person.full_name}
                                                        </Text>
                                                    )}
                                                </View>
                                                {c.occasion ? (
                                                    <View style={styles.cardOccasionBox}>
                                                        <Text style={styles.cardOccasionLabel}>OCASIÓN</Text>
                                                        <Text style={styles.cardOccasionText} numberOfLines={1}>
                                                            {c.occasion}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            {/* Concepto / Descripción */}
                                            {c.description ? (
                                                <View style={styles.cardConceptBox}>
                                                    <Text style={styles.cardConceptText} numberOfLines={2}>
                                                        "{c.description}"
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {/* Progreso de la Creación (7 etapas) */}
                                            <View style={styles.cardStepperContainer}>
                                                <Text style={styles.cardStepperTitle}>PROGRESO DE LA CREACIÓN</Text>
                                                <View style={styles.stepperRow}>
                                                    {getCreationStages(c).map((stg, idx, arr) => (
                                                        <React.Fragment key={stg.id}>
                                                            <View style={styles.stepperNode}>
                                                                <View
                                                                    style={[
                                                                        styles.stepperDot,
                                                                        stg.status === 'completed' && styles.stepperDotCompleted,
                                                                        stg.status === 'current' && styles.stepperDotCurrent,
                                                                        stg.status === 'cancelled' && styles.stepperDotCancelled,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.stepperDotText,
                                                                            stg.status === 'completed' && styles.stepperDotTextCompleted,
                                                                            stg.status === 'current' && styles.stepperDotTextCurrent,
                                                                        ]}
                                                                    >
                                                                        {stg.status === 'completed' ? '✓' : stg.status === 'current' ? '●' : stg.status === 'cancelled' ? '✕' : (idx + 1).toString()}
                                                                    </Text>
                                                                </View>
                                                                <Text
                                                                    style={[
                                                                        styles.stepperLabel,
                                                                        stg.status === 'completed' && styles.stepperLabelCompleted,
                                                                        stg.status === 'current' && styles.stepperLabelCurrent,
                                                                    ]}
                                                                >
                                                                    {stg.label}
                                                                </Text>
                                                            </View>
                                                            {idx < arr.length - 1 && (
                                                                <View
                                                                    style={[
                                                                        styles.stepperLine,
                                                                        stg.status === 'completed' && arr[idx + 1].status !== 'pending' && styles.stepperLineCompleted,
                                                                    ]}
                                                                />
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </View>
                                            </View>

                                            {/* Fitting & Pruebas en Tarjeta (Sección 8 & 9) */}
                                            <View style={styles.cardFittingStrip}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardFittingLabel}>FITTING & PRUEBAS</Text>
                                                    <Text style={styles.cardFittingValue}>
                                                        {c.status === 'approved' || c.status === 'production' || c.status === 'completed'
                                                            ? '2 pruebas realizadas · Glasilla base ajustada y aprobada'
                                                            : c.status === 'fitting'
                                                            ? 'En prueba de vestuario y ajuste de glasilla'
                                                            : 'Pendiente de prueba de vestuario'}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardFittingBadge}>
                                                    <Text style={styles.cardFittingBadgeText}>
                                                        {c.status === 'approved' || c.status === 'production' || c.status === 'completed'
                                                            ? '✓ PRUEBA SUPERADA'
                                                            : c.status === 'fitting'
                                                            ? 'EN PRUEBA'
                                                            : 'PENDIENTE'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Linaje CAD Asociado (Regla 8: Patrón ≠ Versión) */}
                                            <View style={styles.cardPatternStrip}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardPatternLabel}>PATRÓN CAD ASOCIADO</Text>
                                                    <Text style={styles.cardPatternTitle}>
                                                        {GARMENT_TYPE_LABELS[c.active_pattern?.garment_type || c.garment_type || 'jacket'] || 'Chaqueta Sastre de Alta Costura'}
                                                    </Text>
                                                    <Text style={styles.cardPatternVersion}>
                                                        {c.active_pattern ? `v${c.active_pattern.version_label} · APROBADO · VIGENTE` : 'Pendiente de trazado'}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardExecutionCountPill}>
                                                    <Text style={styles.cardExecutionCountPillLabel}>HISTORIAL DE LINAJE</Text>
                                                    <Text style={styles.cardExecutionCountPillValue}>
                                                        {c.total_executions_count || (c.active_pattern_execution_id ? 16 : 0)} ejecuciones
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Footer de Tarjeta con Acción Principal */}
                                            <View style={styles.cardActionRow}>
                                                <Text style={styles.cardLastActivityText}>
                                                    Última actividad: {new Date(c.updated_at || c.created_at).toLocaleDateString()}
                                                </Text>
                                                <View style={styles.cardCtaButton}>
                                                    <Text style={styles.cardCtaButtonText}>Abrir creación →</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* MODAL 1: CREAR NUEVA CREACIÓN */}
            <Modal
                visible={isCreateModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsCreateModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>+ Nueva Creación de Alta Costura</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalFormContent}>
                            {/* Selector de Clienta */}
                            <Text style={styles.formLabel}>Clienta * (Obligatoria)</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.clientSelectorScroll}
                            >
                                {clients.map((cli) => (
                                    <TouchableOpacity
                                        key={cli.id}
                                        style={[
                                            styles.clientSelectChip,
                                            formClientId === cli.id && styles.clientSelectChipActive,
                                        ]}
                                        onPress={() => setFormClientId(cli.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.clientSelectChipText,
                                                formClientId === cli.id && styles.clientSelectChipTextActive,
                                            ]}
                                        >
                                            {cli.full_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Nombre / Título de la creación */}
                            <Text style={styles.formLabel}>Nombre del Encargo / Creación *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Ej: Vestido de Gala en Terciopelo y Seda"
                                placeholderTextColor={colors.textMuted}
                                value={formName}
                                onChangeText={setFormName}
                            />

                            {/* Tipo de Creación */}
                            <Text style={styles.formLabel}>Tipo de Creación</Text>
                            <View style={styles.formChipsRow}>
                                {(Object.keys(TYPE_LABELS) as CreationType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.typeChip,
                                            formCreationType === t && styles.typeChipActive,
                                        ]}
                                        onPress={() => setFormCreationType(t)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeChipText,
                                                formCreationType === t && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {TYPE_LABELS[t]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Ocasión y Fecha Objetivo */}
                            <View style={styles.formTwoCols}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.formLabel}>Ocasión / Evento</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Ej: Boda en Cartagena"
                                        placeholderTextColor={colors.textMuted}
                                        value={formOccasion}
                                        onChangeText={setFormOccasion}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.formLabel}>Fecha Objetivo</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="AAAA-MM-DD"
                                        placeholderTextColor={colors.textMuted}
                                        value={formTargetDate}
                                        onChangeText={setFormTargetDate}
                                    />
                                </View>
                            </View>

                            {/* Prenda base sugerida */}
                            <Text style={styles.formLabel}>Prenda Base Sugerida (Opcional)</Text>
                            <View style={styles.formChipsRow}>
                                {Object.entries(GARMENT_PACKAGES).map(([k, pkg]) => (
                                    <TouchableOpacity
                                        key={k}
                                        style={[
                                            styles.typeChip,
                                            formGarmentType === k && styles.typeChipActive,
                                        ]}
                                        onPress={() => setFormGarmentType(k as GarmentType)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeChipText,
                                                formGarmentType === k && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {pkg.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Descripción y concepto */}
                            <Text style={styles.formLabel}>Descripción y Concepto Artístico</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                placeholder="Silueta deseada, detalles del diseño, caídas, estilo..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={3}
                                value={formDescription}
                                onChangeText={setFormDescription}
                            />

                            {/* Notas de diseño */}
                            <Text style={styles.formLabel}>Notas Técnicas & Observaciones</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                placeholder="Anotaciones de atelier, especificaciones y orientaciones..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={3}
                                value={formNotes}
                                onChangeText={setFormNotes}
                            />

                            {/* Alerta de error en el modal */}
                            {createModalError && (
                                <View style={styles.modalErrorBanner}>
                                    <Text style={styles.modalErrorText}>⚠️ {createModalError}</Text>
                                </View>
                            )}

                            {/* Botones de acción */}
                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsCreateModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleCreateCreation}
                                    disabled={formSubmitting}
                                >
                                    {formSubmitting ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Guardar Creación</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL 2: EDITAR CREACIÓN */}
            <Modal
                visible={isEditModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsEditModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>✎ Editar Creación</Text>
                            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalFormContent}>
                            <Text style={styles.formLabel}>Nombre de la Creación *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formName}
                                onChangeText={setFormName}
                            />

                            <Text style={styles.formLabel}>Tipo de Creación</Text>
                            <View style={styles.formChipsRow}>
                                {(Object.keys(TYPE_LABELS) as CreationType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.typeChip,
                                            formCreationType === t && styles.typeChipActive,
                                        ]}
                                        onPress={() => setFormCreationType(t)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeChipText,
                                                formCreationType === t && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {TYPE_LABELS[t]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.formTwoCols}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.formLabel}>Ocasión</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={formOccasion}
                                        onChangeText={setFormOccasion}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.formLabel}>Fecha Objetivo</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={formTargetDate}
                                        onChangeText={setFormTargetDate}
                                    />
                                </View>
                            </View>

                            <Text style={styles.formLabel}>Descripción y Concepto</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                multiline
                                numberOfLines={3}
                                value={formDescription}
                                onChangeText={setFormDescription}
                            />

                            <Text style={styles.formLabel}>Notas de Diseño & Taller</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                multiline
                                numberOfLines={3}
                                value={formNotes}
                                onChangeText={setFormNotes}
                            />

                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsEditModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleSaveEdit}
                                    disabled={formSubmitting}
                                >
                                    {formSubmitting ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Actualizar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL 3: VINCULAR SESIÓN DE MEDIDAS */}
            <Modal
                visible={isLinkSessionModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsLinkSessionModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Vincular Sesión de Medidas</Text>
                            <TouchableOpacity onPress={() => setIsLinkSessionModalOpen(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 20 }}>
                            <Text style={styles.modalSubtitle}>
                                Seleccione la sesión de medidas de {selectedCreation?.client?.full_name} que servirá como base anatómica para este encargo.
                            </Text>

                            {loadingSessions ? (
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            ) : clientSessions.length === 0 ? (
                                <View style={styles.emptySessionInModal}>
                                    <Text style={styles.emptySessionInModalText}>
                                        Esta clienta no tiene sesiones de medidas guardadas en el historial.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 300, marginTop: 12 }}>
                                    {clientSessions.map((s) => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={[
                                                styles.sessionChoiceCard,
                                                selectedCreation?.session_id === s.id && styles.sessionChoiceCardActive,
                                            ]}
                                            onPress={() => handleSelectSessionToLink(s.id)}
                                        >
                                            <View>
                                                <Text style={styles.sessionChoiceTitle}>
                                                    Sesión v{s.version_number} ({s.status.toUpperCase()})
                                                </Text>
                                                <Text style={styles.sessionChoiceDate}>
                                                    Fecha: {new Date(s.session_date).toLocaleDateString()} · {s.unit_system === 'in' ? 'Imperial (pulgadas)' : 'Métrico (cm)'}
                                                </Text>
                                            </View>
                                            {selectedCreation?.session_id === s.id && (
                                                <Text style={styles.sessionChoiceSelectedBadge}>✓ Activa</Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsLinkSessionModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cerrar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'web' ? 20 : 54,
        paddingBottom: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.ivoryWarm,
    },
    backButtonText: {
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    headerTitles: {
        alignItems: 'center',
    },
    superHeaderBadge: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    superHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    mainHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginTop: 2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
        fontStyle: 'italic',
    },
    newCreationBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    newCreationBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    toast: {
        position: 'absolute',
        top: 80,
        left: 24,
        right: 24,
        zIndex: 9999,
        padding: 12,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
    },
    toastSuccess: {
        backgroundColor: '#F1F7F2',
        borderColor: '#C2DFCA',
    },
    toastError: {
        backgroundColor: '#FAF2F2',
        borderColor: '#E8C5C5',
    },
    toastInfo: {
        backgroundColor: '#FFF8E7',
        borderColor: '#F2D48E',
    },
    toastText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    toastClose: {
        fontSize: 16,
        color: colors.atelierBlack,
        paddingHorizontal: 6,
    },
    listScrollContent: {
        padding: 24,
    },
    filterBar: {
        marginBottom: 20,
    },
    searchBox: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.atelierBlack,
    },
    searchBtn: {
        backgroundColor: colors.sand,
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        borderRadius: 4,
    },
    searchBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    filterChipsRow: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    filterChipText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    centerBox: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    centerLoadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 500,
        marginVertical: 12,
        lineHeight: 20,
    },
    emptyCreateBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 4,
        marginTop: 8,
    },
    emptyCreateBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // ==========================================
    // RESUMEN EDITORIAL DEL ARCHIVO (REGLA 14)
    // ==========================================
    editorialSummaryBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    editorialSummaryCard: {
        flex: 1,
        minWidth: Platform.OS === 'web' ? 220 : '46%',
        margin: 6,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    summaryCardGold: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF7F2',
    },
    summaryCardLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
    },
    summaryCardLabelGold: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
    },
    summaryCardValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginTop: 4,
    },
    summaryCardValueGold: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginTop: 4,
    },
    summaryCardSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 3,
    },
    summaryCardSubGold: {
        fontSize: 11,
        color: colors.champagneGold,
        fontWeight: '600',
        marginTop: 3,
    },
    // ==========================================
    // REJILLA Y TARJETAS EDITORIALES (REGLAS 10 & 11)
    // ==========================================
    archiveHeaderSection: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    archiveHeaderBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 6,
    },
    archiveHeaderBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
    },
    archiveHeaderTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        letterSpacing: 0.5,
    },
    archiveHeaderSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },
    creationsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -10,
    },
    creationGridCard: {
        width: Platform.OS === 'web' ? '48%' : '100%',
        marginHorizontal: Platform.OS === 'web' ? '1%' : 0,
        marginBottom: 24,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    creationGridCardSingle: {
        width: Platform.OS === 'web' ? '98%' : '100%',
        marginHorizontal: Platform.OS === 'web' ? '1%' : 0,
    },
    // Fotografía Editorial Alusiva a la Creación de Alta Costura
    creationCardPhotoContainer: {
        height: 220,
        position: 'relative',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    creationCardPhotoImage: {
        width: '100%',
        height: '100%',
    },
    creationCardPhotoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.40)',
        padding: 16,
        justifyContent: 'space-between',
    },
    creationCardPhotoBottomRow: {
        gap: 8,
    },
    creationCardPhotoGarmentTag: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(23, 20, 17, 0.78)',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    creationCardPhotoGarmentTagText: {
        color: colors.sand,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        fontFamily: typography.serif,
    },
    creationCardPhotoMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailHeaderPhoto: {
        width: 88,
        height: 88,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        marginRight: 16,
    },
    // Placeholder Editorial Técnico CAD (Compatibilidad)
    blueprintPlaceholderBox: {
        height: 170,
        backgroundColor: '#171411',
        padding: 16,
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    blueprintTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    blueprintTypeBadge: {
        backgroundColor: 'rgba(230, 217, 200, 0.15)',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    blueprintTypeBadgeText: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    blueprintCenterGraphic: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    blueprintSilhouetteCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(167, 131, 80, 0.18)',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    blueprintSilhouetteIcon: {
        fontSize: 18,
    },
    blueprintTechnicalTag: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        fontFamily: typography.serif,
    },
    blueprintTechSpecs: {
        color: '#A89F91',
        fontSize: 9,
        letterSpacing: 0.5,
        marginTop: 3,
    },
    blueprintFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    blueprintWatermark: {
        color: 'rgba(230, 217, 200, 0.45)',
        fontSize: 9,
        letterSpacing: 1,
        fontWeight: '600',
    },
    blueprintCadRef: {
        color: colors.champagneGold,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    // Cuerpo de la Tarjeta Editorial
    cardBodyContent: {
        padding: 20,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginBottom: 10,
    },
    cardClientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    cardClientAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.atelierBlack,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardClientAvatarText: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
    },
    cardClientLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.8,
    },
    cardClientName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    cardOccasionBox: {
        alignItems: 'flex-end',
        maxWidth: '45%',
    },
    cardOccasionLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    cardOccasionText: {
        fontSize: 12,
        color: colors.champagneGold,
        fontStyle: 'italic',
    },
    cardConceptBox: {
        backgroundColor: '#FCFAF7',
        padding: 10,
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        marginBottom: 14,
    },
    cardConceptText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    // Stepper de Progreso en Tarjeta y Detalle
    cardStepperContainer: {
        marginBottom: 14,
        backgroundColor: colors.ivoryWarm,
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    cardStepperTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    detailStepperBox: {
        marginTop: 16,
        padding: 14,
        backgroundColor: colors.ivoryWarm,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    detailStepperHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 10,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    stepperNode: {
        alignItems: 'center',
        minWidth: 38,
    },
    stepperDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperDotCompleted: {
        backgroundColor: '#3D6346',
        borderColor: '#3D6346',
    },
    stepperDotCurrent: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
        borderWidth: 1.5,
    },
    stepperDotCancelled: {
        backgroundColor: '#FAF2F2',
        borderColor: '#9E3B3B',
    },
    stepperDotText: {
        fontSize: 9,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    stepperDotTextCompleted: {
        color: '#FFFFFF',
    },
    stepperDotTextCurrent: {
        color: colors.champagneGold,
    },
    stepperLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        marginTop: 4,
        fontWeight: '600',
    },
    stepperLabelCompleted: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    stepperLabelCurrent: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    stepperLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.sand,
        marginHorizontal: 2,
        marginTop: -14,
    },
    stepperLineCompleted: {
        backgroundColor: '#3D6346',
    },
    // Fitting & Pruebas en Tarjeta (Sección 8 & 9)
    cardFittingStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FDFBF7',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 10,
        borderRadius: 6,
        marginBottom: 12,
    },
    cardFittingLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.8,
    },
    cardFittingValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    cardFittingBadge: {
        backgroundColor: '#F1F7F2',
        borderWidth: 1,
        borderColor: '#C2DFCA',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    cardFittingBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#3D6346',
    },
    // Linaje CAD en Tarjeta (Regla 8)
    cardPatternStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        borderRadius: 6,
        marginBottom: 14,
    },
    cardPatternLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    cardPatternTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    cardPatternVersion: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 2,
    },
    cardExecutionCountPill: {
        alignItems: 'flex-end',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
    },
    cardExecutionCountPillLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    cardExecutionCountPillValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.champagneGold,
        marginTop: 2,
    },
    // Footer de Tarjeta
    cardActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingTop: 12,
        marginTop: 4,
    },
    cardLastActivityText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    cardCtaButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    cardCtaButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Navegación hacia Clienta en Detalle
    viewClientDirBtn: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        marginLeft: 12,
    },
    viewClientDirBtnText: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
    },
    lineageHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    patternCounterPill: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    patternCounterPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    activePatternSubVersion: {
        fontSize: 12,
        fontWeight: '700',
        color: '#3D6346',
        marginTop: 2,
    },
    activeLeafBadge: {
        marginLeft: 8,
        backgroundColor: '#F1F7F2',
        borderWidth: 1,
        borderColor: '#C2DFCA',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    activeLeafBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#3D6346',
        letterSpacing: 0.5,
    },
    lineageDotActive: {
        backgroundColor: '#3D6346',
    },
    // ==========================================
    // ESTILOS DE VISTA DE DETALLE
    // ==========================================
    detailScrollContent: {
        padding: 24,
    },
    detailNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailBackBtn: {
        paddingVertical: 6,
    },
    detailBackBtnText: {
        fontSize: 13,
        color: colors.champagneGold,
        fontWeight: '600',
    },
    detailNavActions: {
        flexDirection: 'row',
    },
    editCreationBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    editCreationBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    creationCardHeader: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 20,
        marginBottom: 20,
    },
    creationHeaderTopRow: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        justifyContent: 'space-between',
        alignItems: Platform.OS === 'web' ? 'flex-start' : 'stretch',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    typeBadge: {
        marginLeft: 8,
        backgroundColor: colors.ivoryWarm,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    creationTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginBottom: 4,
    },
    creationOccasion: {
        fontSize: 14,
        color: colors.champagneGold,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    statusQuickSwitchBox: {
        backgroundColor: colors.ivoryWarm,
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.sand,
        minWidth: 260,
        marginTop: Platform.OS === 'web' ? 0 : 12,
    },
    quickSwitchLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 6,
    },
    statusChipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    statusChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        marginRight: 4,
        marginBottom: 4,
    },
    statusChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    statusChipText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    statusChipTextActive: {
        color: '#FFFFFF',
    },
    conceptBox: {
        backgroundColor: '#FAFAF8',
        borderRadius: 4,
        padding: 12,
        marginTop: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
    },
    conceptBoxLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
        marginBottom: 4,
    },
    conceptBoxText: {
        fontSize: 13,
        color: colors.atelierBlack,
        lineHeight: 18,
    },
    clientInfoStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingTop: 14,
        marginTop: 14,
    },
    clientAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.atelierBlack,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    clientAvatarText: {
        color: colors.champagneGold,
        fontWeight: '700',
        fontSize: 14,
    },
    clientNameLabel: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    clientFullName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    clientSubDetail: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    targetDateBox: {
        backgroundColor: colors.ivoryWarm,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        alignItems: 'center',
    },
    targetDateLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    targetDateValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    sectionsGrid: {
        flexDirection: 'column',
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 16,
    },
    sectionCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        paddingBottom: 10,
        marginBottom: 12,
    },
    sectionCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    sectionCardTitleGold: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
    },
    sectionCardSubtitle: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    linkSessionBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: colors.ivoryWarm,
    },
    linkSessionBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    sessionLinkedBox: {
        backgroundColor: colors.ivoryWarm,
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    sessionLinkedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionBadge: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.success,
    },
    sessionDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    sessionMeta: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    unlinkBtn: {
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    unlinkBtnText: {
        fontSize: 11,
        color: colors.error,
        textDecorationLine: 'underline',
    },
    emptySessionBox: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#FCFAF7',
        borderRadius: 6,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.sand,
    },
    emptySessionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptySessionText: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 4,
        maxWidth: 420,
    },
    primaryActionBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
        marginTop: 10,
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    notesContainer: {
        padding: 4,
    },
    notesText: {
        fontSize: 13,
        color: colors.atelierBlack,
        lineHeight: 19,
    },
    emptyNotesText: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    patternCadSection: {
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
    },
    openCadBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    openCadBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    activePatternCard: {
        backgroundColor: colors.ivoryWarm,
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    activePatternRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activePatternLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    activePatternVersion: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    activePatternStatusBadge: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    activePatternStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    activePatternDate: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
    },
    lineageBox: {
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingTop: 10,
    },
    lineageTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    lineageItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    lineageDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.champagneGold,
        marginTop: 5,
        marginRight: 8,
    },
    lineageItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    lineageItemMeta: {
        fontSize: 11,
        color: colors.textMuted,
    },
    lineageItemNotes: {
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    emptyPatternBox: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#FCFAF7',
        borderRadius: 6,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.champagneGold,
    },
    emptyPatternTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    emptyPatternText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        maxWidth: 480,
    },
    // ==========================================
    // PESTAÑAS, FITTING Y BITÁCORA DEL DETALLE (SECCIÓN 14)
    // ==========================================
    detailTabsContainer: {
        marginBottom: 20,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    detailTabsScroll: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    detailTabBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: 'relative',
        marginRight: 4,
    },
    detailTabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: colors.champagneGold,
    },
    detailTabBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    detailTabBtnTextActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    detailTabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        height: 2,
        backgroundColor: colors.champagneGold,
    },
    fittingStatusBadge: {
        backgroundColor: '#F1F7F2',
        borderWidth: 1,
        borderColor: '#C2DFCA',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    fittingStatusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#3D6346',
    },
    fittingContentBox: {
        backgroundColor: colors.ivoryWarm,
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    fittingDetailRow: {
        marginBottom: 10,
    },
    fittingDetailLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.8,
    },
    fittingDetailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    fittingDetailValueGold: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.champagneGold,
        marginTop: 2,
    },
    logbookList: {
        paddingVertical: 4,
    },
    logbookItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    logbookDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
        marginRight: 12,
    },
    logbookTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    logbookMeta: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    futureSection: {
        opacity: 0.85,
        backgroundColor: '#FAF8F5',
    },
    futureTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    futureSubtitle: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    futureBadge: {
        backgroundColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    futureBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    futureNotice: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    // ==========================================
    // ESTILOS DE MODALES
    // ==========================================
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: Platform.OS === 'web' ? 560 : '100%',
        maxHeight: '90%',
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        backgroundColor: colors.ivoryWarm,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    modalSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    modalCloseText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    modalFormContent: {
        padding: 20,
    },
    formLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 10,
    },
    formInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 13,
        color: colors.atelierBlack,
    },
    formTextArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    formTwoCols: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    clientSelectorScroll: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    clientSelectChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surface,
        marginRight: 6,
    },
    clientSelectChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    clientSelectChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    clientSelectChipTextActive: {
        color: '#FFFFFF',
    },
    formChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    typeChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surface,
        marginRight: 6,
        marginBottom: 6,
    },
    typeChipActive: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    typeChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    typeChipTextActive: {
        color: '#FFFFFF',
    },
    modalErrorBanner: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: '#EF4444',
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: 14,
        marginBottom: 6,
    },
    modalErrorText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
    },
    modalActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingTop: 14,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        marginRight: 10,
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    submitBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    emptySessionInModal: {
        padding: 20,
        alignItems: 'center',
    },
    emptySessionInModalText: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    sessionChoiceCard: {
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionChoiceCardActive: {
        borderColor: colors.champagneGold,
        backgroundColor: colors.ivoryWarm,
    },
    sessionChoiceTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionChoiceDate: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    sessionChoiceSelectedBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.champagneGold,
    },
});
