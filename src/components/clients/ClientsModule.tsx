// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: DIRECTORIO DE CLIENTAS DE ALTA COSTURA
// Archivo: src/components/clients/ClientsModule.tsx
// ==============================================================================
// Rediseño visual editorial integral alineado con la identidad
// "By Katherine Carroll · Atelier Digital" y los Flujos A-D de Alta Costura.
//
// CARACTERÍSTICAS PRINCIPALES:
// 1. Galería editorial de fichas de clientas (2-3 columnas en desktop, 2 en tablet, 1 en móvil).
// 2. Soporte para fotografía real en Supabase Storage (bucket 'client-photos') con URLs firmadas.
// 3. Colección de avatares editoriales realistas como fallback determinístico.
// 4. Integración completa de expo-image-picker para subida, cambio y eliminación de fotos.
// 5. Jerarquía visual: Fotografía → Identidad → Estilo → Expediente → Acciones.
// 6. Acceso directo al Expediente Integral de Alta Costura (ClientDossierView).
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { FormInput } from '../FormInput';
import { FormButton } from '../FormButton';
import { ClientDossierView } from './ClientDossierView';
import { router } from 'expo-router';
import {
    Client,
    ClientStatus,
    createClient,
    deleteClient,
    deleteClientPhoto,
    fetchClients,
    setClientStatus,
    updateClient,
    uploadClientPhoto,
    validateClientData,
} from '../../services/clientService';
import {
    CLIENTS_EMPTY_STATE_IMAGE,
    getClientInitials,
    getEditorialAvatarSource,
} from '../../utils/clientAvatarHelper';

interface ClientsModuleProps {
    onBack: () => void;
    titleBack?: string;
    initialDossierClientId?: string | null;
    onNavigateToCreations?: (creationId?: string) => void;
    onNavigateToPattern?: (params: {
        clientId: string;
        sessionId?: string | null;
        creationId?: string | null;
        garmentType?: any;
    }) => void;
}

export function ClientsModule({
    onBack,
    titleBack = '← Volver al Atelier Diseñadora',
    initialDossierClientId,
    onNavigateToCreations,
    onNavigateToPattern,
}: ClientsModuleProps) {
    const { role } = useAuth();
    const isAdmin = role === 'admin';
    const { width: windowWidth } = useWindowDimensions();

    // Detección responsive de columnas
    const isDesktop = windowWidth >= 1180;
    const isTablet = windowWidth >= 768 && windowWidth < 1180;
    const isMobile = windowWidth < 768;

    // Estado del Expediente Integral
    const [dossierClient, setDossierClient] = useState<Client | null>(null);

    // Estados de lista y filtros
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');

    // Estados de notificaciones
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Estados de modal (creación / edición)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Campos del formulario
    const [fullName, setFullName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [city, setCity] = useState<string>('');
    const [stylePreferences, setStylePreferences] = useState<string>('');
    const [internalNotes, setInternalNotes] = useState<string>('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
    const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
    const [pendingImageMimeType, setPendingImageMimeType] = useState<string>('image/jpeg');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
    const [photoStatusMessage, setPhotoStatusMessage] = useState<string | null>(null);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<boolean>(false);

    // Modal de confirmación para eliminar o archivar
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean;
        type: 'archive' | 'unarchive' | 'delete';
        client: Client | null;
    }>({ visible: false, type: 'archive', client: null });
    const [confirmActionLoading, setConfirmActionLoading] = useState<boolean>(false);

    useEffect(() => {
        loadClients();
    }, [statusFilter]);

    const loadClients = async () => {
        setLoading(true);
        setErrorMessage(null);
        const res = await fetchClients(statusFilter);
        if (res.error) {
            setErrorMessage(res.error);
        } else {
            setClients(res.data);
            if (initialDossierClientId) {
                const target = res.data.find((c) => c.id === initialDossierClientId);
                if (target) {
                    setDossierClient(target);
                }
            }
        }
        setLoading(false);
    };

    // Filtrado reactivo por texto de búsqueda
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const term = searchQuery.toLowerCase().trim();
        return clients.filter((c) => {
            const nameMatch = c.full_name?.toLowerCase().includes(term);
            const emailMatch = c.email?.toLowerCase().includes(term);
            const phoneMatch = c.phone?.toLowerCase().includes(term);
            const cityMatch = c.city?.toLowerCase().includes(term);
            const styleMatch = c.style_preferences?.toLowerCase().includes(term);
            return nameMatch || emailMatch || phoneMatch || cityMatch || styleMatch;
        });
    }, [clients, searchQuery]);

    // Contadores para pestañas
    const counts = useMemo(() => {
        const total = clients.length;
        const active = clients.filter((c) => c.status === 'active').length;
        const archived = clients.filter((c) => c.status === 'archived').length;
        return { total, active, archived };
    }, [clients]);

    // Apertura del formulario para crear cliente
    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedClientId(null);
        setFullName('');
        setEmail('');
        setPhone('');
        setCity('');
        setStylePreferences('');
        setInternalNotes('');
        setPhotoUrl(null);
        setPendingImageUri(null);
        setPendingImageBase64(null);
        setPhotoStatusMessage(null);
        setFieldErrors({});
        setIsModalOpen(true);
    };

    // Apertura del formulario para consultar/editar cliente
    const handleOpenEdit = (client: Client) => {
        setModalMode('edit');
        setSelectedClientId(client.id);
        setFullName(client.full_name || '');
        setEmail(client.email || '');
        setPhone(client.phone || '');
        setCity(client.city || '');
        setStylePreferences(client.style_preferences || '');
        setInternalNotes(client.internal_notes || '');
        setPhotoUrl(client.photo_url || null);
        setPendingImageUri(null);
        setPendingImageBase64(null);
        setPhotoStatusMessage(null);
        setFieldErrors({});
        setIsModalOpen(true);
    };

    // Selector de fotografía desde la biblioteca del dispositivo
    const handlePickImage = async () => {
        try {
            setPhotoStatusMessage(null);
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                setErrorMessage('Se requiere permiso para acceder a las fotografías.');
                return;
            }

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
                base64: true,
            });

            if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
                return;
            }

            const asset = pickerResult.assets[0];
            const uri = asset.uri;
            const mime = asset.mimeType || 'image/jpeg';
            const base64 = asset.base64 || null;
            const size = asset.fileSize;

            // Validación de formato
            const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validMimes.some((m) => mime.toLowerCase().includes(m.replace('image/', '')))) {
                setErrorMessage('Formato no compatible. Por favor selecciona una imagen JPG, PNG o WebP.');
                return;
            }

            // Validación de tamaño (máx 5MB)
            if (size && size > 5 * 1024 * 1024) {
                setErrorMessage('La imagen no debe superar los 5 MB de tamaño.');
                return;
            }

            // Si estamos editando un cliente existente, subir inmediatamente a Supabase Storage
            if (modalMode === 'edit' && selectedClientId) {
                setIsUploadingPhoto(true);
                setPhotoStatusMessage('Subiendo fotografía…');

                const uploadRes = await uploadClientPhoto(selectedClientId, uri, {
                    mimeType: mime,
                    fileSize: size,
                    base64Data: base64 || undefined,
                });

                setIsUploadingPhoto(false);

                if (uploadRes.error) {
                    setErrorMessage(uploadRes.error);
                    setPhotoStatusMessage(null);
                } else {
                    setPhotoUrl(uploadRes.photoUrl);
                    setPendingImageUri(null);
                    setPendingImageBase64(null);
                    setPhotoStatusMessage('Fotografía actualizada');
                    loadClients();
                }
            } else {
                // Modo creación: almacenar temporalmente para subir al guardar la clienta
                setPendingImageUri(uri);
                setPendingImageBase64(base64);
                setPendingImageMimeType(mime);
                setPhotoStatusMessage('Fotografía lista para vincular al guardar');
            }
        } catch (err: any) {
            console.error('[ClientsModule] Error seleccionando imagen:', err);
            setErrorMessage('No fue posible cargar la fotografía. Intenta nuevamente.');
        }
    };

    // Eliminación de la fotografía de la clienta
    const handleDeletePhoto = async () => {
        try {
            if (modalMode === 'edit' && selectedClientId && photoUrl) {
                setIsUploadingPhoto(true);
                const res = await deleteClientPhoto(selectedClientId, photoUrl);
                setIsUploadingPhoto(false);
                if (res.error) {
                    setErrorMessage(res.error);
                } else {
                    setPhotoUrl(null);
                    setPhotoStatusMessage('Fotografía eliminada');
                    loadClients();
                }
            } else {
                setPendingImageUri(null);
                setPendingImageBase64(null);
                setPhotoUrl(null);
                setPhotoStatusMessage(null);
            }
        } catch (err: any) {
            setErrorMessage('No fue posible eliminar la fotografía.');
        }
    };

    const handleSave = async () => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const clientData = {
            full_name: fullName,
            email: email.trim() ? email : null,
            phone: phone.trim() ? phone : null,
            city: city.trim() ? city : null,
            style_preferences: stylePreferences.trim() ? stylePreferences : null,
            internal_notes: internalNotes.trim() ? internalNotes : null,
            photo_url: photoUrl,
        };

        const validation = validateClientData(clientData);
        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            const firstErr = Object.values(validation.errors)[0];
            setErrorMessage(firstErr);
            return;
        }

        setFieldErrors({});
        setSaving(true);

        if (modalMode === 'create') {
            const res = await createClient(clientData);
            if (res.error || !res.data) {
                setSaving(false);
                setErrorMessage(res.error || 'No se pudo registrar la clienta.');
                return;
            }

            const newClient = res.data;

            // Si hay una foto pendiente de subir para la nueva clienta, subirla ahora vinculada al nuevo id
            if (pendingImageUri) {
                setIsUploadingPhoto(true);
                const uploadRes = await uploadClientPhoto(newClient.id, pendingImageUri, {
                    mimeType: pendingImageMimeType,
                    base64Data: pendingImageBase64 || undefined,
                });
                setIsUploadingPhoto(false);
                if (uploadRes.error) {
                    console.warn('[ClientsModule] Cliente creado pero error en foto:', uploadRes.error);
                }
            }

            setSaving(false);
            setSuccessMessage(`Clienta «${fullName}» registrada exitosamente en el Atelier.`);
            setIsModalOpen(false);
            loadClients();
        } else if (modalMode === 'edit' && selectedClientId) {
            const res = await updateClient(selectedClientId, clientData);
            setSaving(false);
            if (res.error) {
                setErrorMessage(res.error);
            } else {
                setSuccessMessage(`Ficha de «${fullName}» actualizada exitosamente.`);
                setIsModalOpen(false);
                loadClients();
            }
        }
    };

    // Confirmación de archivo o reactivación
    const handleToggleArchiveConfirm = (client: Client) => {
        const isCurrentlyActive = client.status === 'active';
        setConfirmModal({
            visible: true,
            type: isCurrentlyActive ? 'archive' : 'unarchive',
            client,
        });
    };

    // Confirmación de eliminación
    const handleDeleteConfirm = (client: Client) => {
        setConfirmModal({
            visible: true,
            type: 'delete',
            client,
        });
    };

    // Ejecución de la acción confirmada
    const handleExecuteConfirmAction = async () => {
        if (!confirmModal.client) return;
        setConfirmActionLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        if (confirmModal.type === 'archive') {
            const res = await setClientStatus(confirmModal.client.id, 'archived');
            setConfirmActionLoading(false);
            setConfirmModal({ visible: false, type: 'archive', client: null });
            if (res.error) {
                setErrorMessage(`No se pudo archivar la clienta: ${res.error}`);
            } else {
                setSuccessMessage(`Clienta «${confirmModal.client.full_name}» archivada correctamente.`);
                if (isModalOpen) setIsModalOpen(false);
                loadClients();
            }
        } else if (confirmModal.type === 'unarchive') {
            const res = await setClientStatus(confirmModal.client.id, 'active');
            setConfirmActionLoading(false);
            setConfirmModal({ visible: false, type: 'unarchive', client: null });
            if (res.error) {
                setErrorMessage(`No se pudo reactivar la clienta: ${res.error}`);
            } else {
                setSuccessMessage(`Clienta «${confirmModal.client.full_name}» reactivada correctamente.`);
                if (isModalOpen) setIsModalOpen(false);
                loadClients();
            }
        } else if (confirmModal.type === 'delete') {
            const res = await deleteClient(confirmModal.client.id);
            setConfirmActionLoading(false);
            setConfirmModal({ visible: false, type: 'delete', client: null });
            if (res.error) {
                setErrorMessage(`No se pudo eliminar la clienta: ${res.error}`);
            } else {
                setSuccessMessage(`Clienta «${confirmModal.client.full_name}» eliminada del sistema.`);
                if (isModalOpen) setIsModalOpen(false);
                loadClients();
            }
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    // Vista de Expediente de Alta Costura
    if (dossierClient) {
        return (
            <ClientDossierView
                client={dossierClient}
                onBack={() => setDossierClient(null)}
                onEditClient={(c) => {
                    setDossierClient(null);
                    handleOpenEdit(c);
                }}
                onOpenCad={(params) => {
                    if (onNavigateToPattern) {
                        onNavigateToPattern(params);
                    } else {
                        router.push({
                            pathname: '/(designer)/patterns',
                            params: {
                                client_id: params.clientId,
                                session_id: params.sessionId || undefined,
                                creation_id: params.creationId || undefined,
                                garment_type: params.garmentType || undefined,
                            },
                        });
                    }
                }}
                onOpenCreation={(creationId) => {
                    if (onNavigateToCreations) {
                        onNavigateToCreations(creationId);
                    } else {
                        router.push('/(designer)/creations');
                    }
                }}
            />
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="dark" />

            {/* Fila superior de navegación de Alta Costura */}
            <View style={styles.topNavRow}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>{titleBack}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleOpenCreate}
                    style={styles.newClientButton}
                    activeOpacity={0.85}
                >
                    <Text style={styles.newClientButtonText}>+ Nueva Clienta</Text>
                </TouchableOpacity>
            </View>

            {/* Cabecera Editorial "By Katherine Carroll · Atelier Digital" */}
            <View style={styles.header}>
                <View style={styles.brandRow}>
                    <Text style={styles.brand}>ATELIER DIGITAL</Text>
                    <Text style={styles.brandDot}>·</Text>
                    <Text style={styles.brandAuthor}>BY KATHERINE CARROLL</Text>
                </View>
                <Text style={styles.title}>Directorio de Clientas</Text>
                <Text style={styles.subtitle}>
                    El universo de clientas del Atelier: identidad, estilo, medidas y trayectoria de cada creación.
                </Text>
            </View>

            {/* Banners de notificación */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <Text style={styles.successText}>✦ {successMessage}</Text>
                    <TouchableOpacity onPress={() => setSuccessMessage(null)}>
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)}>
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Barra Editorial de Búsqueda y Filtros de Estado */}
            <View style={styles.controlsCard}>
                <View style={styles.searchBox}>
                    <Text style={styles.searchIcon}>🔎</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar clienta por nombre, correo, teléfono o ciudad..."
                        placeholderTextColor="#8C827A"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                            <Text style={styles.clearSearchText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.filterPillsRow}>
                    {(
                        [
                            { id: 'all', label: 'TODAS', count: counts.total },
                            { id: 'active', label: 'ACTIVAS', count: counts.active },
                            { id: 'archived', label: 'ARCHIVADAS', count: counts.archived },
                        ] as const
                    ).map((f) => {
                        const isSelected = statusFilter === f.id;
                        return (
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => setStatusFilter(f.id)}
                                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.filterPillText,
                                        isSelected && styles.filterPillTextActive,
                                    ]}
                                >
                                    {f.label} <Text style={styles.filterCountBadge}>({f.count})</Text>
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* GALERÍA EDITORIAL DE CLIENTAS */}
            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#A78350" />
                    <Text style={styles.loadingText}>Accediendo al universo de clientas del Atelier...</Text>
                </View>
            ) : filteredClients.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Image
                        source={CLIENTS_EMPTY_STATE_IMAGE}
                        style={styles.emptyStateImage}
                        resizeMode="cover"
                    />
                    <View style={styles.emptyOverlay}>
                        <Text style={styles.emptyEyebrow}>ATELIER DE ALTA COSTURA</Text>
                        <Text style={styles.emptyTitle}>
                            {searchQuery
                                ? 'No se encontraron clientas coincidentes'
                                : 'EL ATELIER COMIENZA CON UNA HISTORIA'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery
                                ? 'Intenta con otro término de búsqueda o limpia los filtros activos.'
                                : 'Registra tu primera clienta para comenzar a construir su expediente de Alta Costura, registrar sus medidas anatómicas y modelar sus patrones.'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity
                                onPress={handleOpenCreate}
                                style={styles.emptyActionButton}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.emptyActionButtonText}>+ Nueva Clienta</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.galleryGrid}>
                    {filteredClients.map((client) => {
                        const isArchived = client.status === 'archived';
                        const imageSource = client.photo_url
                            ? { uri: client.photo_url }
                            : getEditorialAvatarSource(client.id || client.full_name);
                        const initials = getClientInitials(client.full_name);

                        return (
                            <View
                                key={client.id}
                                style={[
                                    styles.clientCard,
                                    isDesktop && styles.clientCardDesktop,
                                    isTablet && styles.clientCardTablet,
                                    isMobile && styles.clientCardMobile,
                                ]}
                            >
                                {/* 1. CABECERA: FOTOGRAFÍA / AVATAR + IDENTIDAD */}
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.photoContainer}>
                                        <Image
                                            source={imageSource}
                                            style={styles.photoImage}
                                            resizeMode="cover"
                                        />
                                        <View
                                            style={[
                                                styles.photoTypeBadge,
                                                client.photo_url ? styles.photoTypeReal : styles.photoTypeEditorial,
                                            ]}
                                        >
                                            <Text style={styles.photoTypeBadgeText}>
                                                {client.photo_url ? 'FOTO REAL' : 'ATELIER'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.identityCol}>
                                        <View style={styles.statusBadgeRow}>
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    isArchived ? styles.badgeArchived : styles.badgeActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusBadgeText,
                                                        isArchived ? styles.badgeArchivedText : styles.badgeActiveText,
                                                    ]}
                                                >
                                                    {isArchived ? 'ARCHIVADA' : 'ACTIVA'}
                                                </Text>
                                            </View>
                                            <Text style={styles.registrationDateText}>
                                                {formatDate(client.created_at)}
                                            </Text>
                                        </View>

                                        <Text style={styles.clientFullName} numberOfLines={2}>
                                            {client.full_name}
                                        </Text>

                                        {/* Contacto esencial */}
                                        <View style={styles.contactItemsWrap}>
                                            {client.city ? (
                                                <Text style={styles.contactItemText} numberOfLines={1}>
                                                    📍 {client.city}
                                                </Text>
                                            ) : null}
                                            {client.phone ? (
                                                <Text style={styles.contactItemText} numberOfLines={1}>
                                                    📞 {client.phone}
                                                </Text>
                                            ) : null}
                                            {client.email ? (
                                                <Text style={styles.contactItemText} numberOfLines={1}>
                                                    ✉️ {client.email}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>

                                {/* 2. ESTILO Y PREFERENCIAS */}
                                {client.style_preferences ? (
                                    <View style={styles.stylePreferencesBox}>
                                        <Text style={styles.sectionEyebrow}>ESTILO & SILUETA</Text>
                                        <Text style={styles.stylePreferencesText} numberOfLines={3}>
                                            "{client.style_preferences}"
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.stylePreferencesPlaceholder}>
                                        <Text style={styles.placeholderText}>
                                            ✦ Sin preferencias de estilo registradas
                                        </Text>
                                    </View>
                                )}

                                {/* 3. NOTAS PRIVADAS DEL ATELIER */}
                                {client.internal_notes ? (
                                    <View style={styles.internalNotesBox}>
                                        <Text style={styles.internalNotesEyebrow}>NOTAS PRIVADAS DEL ATELIER</Text>
                                        <Text style={styles.internalNotesText} numberOfLines={2}>
                                            {client.internal_notes}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* 4. ACCIÓN PRINCIPAL HERO: EXPEDIENTE DE ALTA COSTURA */}
                                <TouchableOpacity
                                    onPress={() => setDossierClient(client)}
                                    style={styles.dossierHeroButton}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.dossierHeroButtonText}>
                                        Expediente de Alta Costura →
                                    </Text>
                                </TouchableOpacity>

                                {/* 5. ACCIONES SECUNDARIAS */}
                                <View style={styles.secondaryActionsRow}>
                                    <TouchableOpacity
                                        onPress={() => handleOpenEdit(client)}
                                        style={styles.viewDetailButton}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.viewDetailButtonText}>Ver Ficha & Editar</Text>
                                    </TouchableOpacity>

                                    <View style={styles.rightSecondaryButtons}>
                                        <TouchableOpacity
                                            onPress={() => handleToggleArchiveConfirm(client)}
                                            style={styles.archiveSmallBtn}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.archiveSmallBtnText}>
                                                {isArchived ? 'Reactivar' : 'Archivar'}
                                            </Text>
                                        </TouchableOpacity>

                                        {isAdmin && (
                                            <TouchableOpacity
                                                onPress={() => handleDeleteConfirm(client)}
                                                style={styles.deleteSmallBtn}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.deleteSmallBtnText}>Eliminar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* MODAL: FORMULARIO CREAR / EDITAR CLIENTA CON FOTOGRAFÍA EDITORIAL */}
            <Modal
                visible={isModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {/* Cabecera del modal */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalEyebrow}>
                                    {modalMode === 'create' ? 'NUEVO REGISTRO' : 'EXPEDIENTE PERSONAL'}
                                </Text>
                                <Text style={styles.modalTitle}>
                                    {modalMode === 'create' ? 'Registrar Nueva Clienta' : 'Editar Ficha de la Clienta'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsModalOpen(false)}
                                style={styles.closeModalButton}
                            >
                                <Text style={styles.closeModalText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* SECCIÓN DE FOTOGRAFÍA DE ALTA COSTURA */}
                            <View style={styles.photoUploadSection}>
                                <Text style={styles.photoSectionLabel}>FOTOGRAFÍA DE LA CLIENTA</Text>
                                <View style={styles.photoUploadRow}>
                                    <View style={styles.photoUploadPreviewWrapper}>
                                        <Image
                                            source={
                                                pendingImageUri
                                                    ? { uri: pendingImageUri }
                                                    : photoUrl
                                                    ? { uri: photoUrl }
                                                    : getEditorialAvatarSource(selectedClientId || fullName || 'new')
                                            }
                                            style={styles.photoUploadPreview}
                                            resizeMode="cover"
                                        />
                                        {(photoUrl || pendingImageUri) && (
                                            <View style={styles.photoPreviewBadge}>
                                                <Text style={styles.photoPreviewBadgeText}>✓</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.photoUploadControls}>
                                        <TouchableOpacity
                                            style={styles.uploadPhotoButton}
                                            onPress={handlePickImage}
                                            disabled={isUploadingPhoto || saving}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.uploadPhotoButtonText}>
                                                {photoUrl || pendingImageUri ? '📷 Cambiar fotografía' : '📷 Subir fotografía'}
                                            </Text>
                                        </TouchableOpacity>

                                        {(photoUrl || pendingImageUri) && (
                                            <TouchableOpacity
                                                style={styles.deletePhotoButton}
                                                onPress={handleDeletePhoto}
                                                disabled={isUploadingPhoto || saving}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.deletePhotoButtonText}>✕ Eliminar fotografía</Text>
                                            </TouchableOpacity>
                                        )}

                                        <Text style={styles.photoFormatHint}>
                                            Formatos JPG, PNG o WebP (máx. 5 MB). Si no se proporciona foto, se asignará un avatar editorial realista.
                                        </Text>

                                        {isUploadingPhoto && (
                                            <View style={styles.photoLoadingInline}>
                                                <ActivityIndicator size="small" color="#A78350" />
                                                <Text style={styles.photoLoadingText}>Subiendo fotografía a Supabase Storage…</Text>
                                            </View>
                                        )}

                                        {photoStatusMessage && !isUploadingPhoto && (
                                            <Text style={styles.photoStatusSuccessText}>
                                                ✦ {photoStatusMessage}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.modalDivider} />

                            {/* CAMPOS DE IDENTIDAD Y CONTACTO */}
                            <FormInput
                                label="Nombre completo de la clienta *"
                                placeholder="ej. Valentina Restrepo Henao"
                                value={fullName}
                                onChangeText={(t) => {
                                    setFullName(t);
                                    if (fieldErrors.full_name) setFieldErrors((p) => ({ ...p, full_name: '' }));
                                }}
                                error={fieldErrors.full_name}
                                editable={!saving}
                            />

                            <FormInput
                                label="Correo electrónico (opcional)"
                                placeholder="ej. valentina.restrepo@atelier.com"
                                value={email}
                                onChangeText={(t) => {
                                    setEmail(t);
                                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                                }}
                                error={fieldErrors.email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!saving}
                            />

                            <FormInput
                                label="Teléfono de contacto (opcional)"
                                placeholder="ej. +57 310 987 6543"
                                value={phone}
                                onChangeText={(t) => {
                                    setPhone(t);
                                    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                                }}
                                error={fieldErrors.phone}
                                keyboardType="phone-pad"
                                editable={!saving}
                            />

                            <FormInput
                                label="Ciudad de residencia (opcional)"
                                placeholder="ej. Medellín, Colombia"
                                value={city}
                                onChangeText={setCity}
                                editable={!saving}
                            />

                            <FormInput
                                label="Preferencias de estilo y silueta (opcional)"
                                placeholder="ej. Siluetas estructuradas de alta costura, escotes limpios y entalle anatómico perfecto."
                                value={stylePreferences}
                                onChangeText={setStylePreferences}
                                multiline
                                numberOfLines={3}
                                editable={!saving}
                            />

                            <FormInput
                                label="Notas privadas del Atelier (opcional)"
                                placeholder="Notas confidenciales de diseño, ocasiones especiales, detalles de confección..."
                                value={internalNotes}
                                onChangeText={setInternalNotes}
                                multiline
                                numberOfLines={3}
                                editable={!saving}
                            />

                            {/* Botones de acción del modal */}
                            <View style={styles.modalActionButtons}>
                                <FormButton
                                    title={
                                        modalMode === 'create'
                                            ? 'Guardar Clienta'
                                            : 'Guardar Cambios'
                                    }
                                    onPress={handleSave}
                                    variant="primary"
                                    loading={saving || isUploadingPhoto}
                                />

                                <TouchableOpacity
                                    onPress={() => setIsModalOpen(false)}
                                    style={styles.cancelModalBtn}
                                    disabled={saving || isUploadingPhoto}
                                >
                                    <Text style={styles.cancelModalBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL: CONFIRMACIÓN ARCHIVAR / ELIMINAR */}
            <Modal
                visible={confirmModal.visible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setConfirmModal({ visible: false, type: 'archive', client: null })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>
                            {confirmModal.type === 'delete'
                                ? '¿Eliminar clienta definitivamente?'
                                : confirmModal.type === 'archive'
                                ? '¿Archivar clienta?'
                                : '¿Reactivar clienta?'}
                        </Text>
                        <Text style={styles.confirmDescription}>
                            {confirmModal.type === 'delete'
                                ? `Esta acción eliminará de forma irreversible la ficha de «${confirmModal.client?.full_name}». Si la clienta tiene proyectos o historial, se recomienda archivarla.`
                                : confirmModal.type === 'archive'
                                ? `«${confirmModal.client?.full_name}» pasará a la lista de archivadas. Podrás reactivarla en cualquier momento sin perder su historial.`
                                : `«${confirmModal.client?.full_name}» volverá a la lista de clientas activas.`}
                        </Text>

                        <View style={styles.confirmActionRow}>
                            <TouchableOpacity
                                onPress={() =>
                                    setConfirmModal({ visible: false, type: 'archive', client: null })
                                }
                                style={styles.confirmCancelBtn}
                                disabled={confirmActionLoading}
                            >
                                <Text style={styles.confirmCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleExecuteConfirmAction}
                                style={[
                                    styles.confirmSubmitBtn,
                                    confirmModal.type === 'delete' && styles.confirmDeleteBtn,
                                ]}
                                disabled={confirmActionLoading}
                            >
                                {confirmActionLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.confirmSubmitBtnText}>
                                        {confirmModal.type === 'delete'
                                            ? 'Eliminar'
                                            : confirmModal.type === 'archive'
                                            ? 'Archivar'
                                            : 'Reactivar'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F2E9', // Marfil cálido Atelier
    },
    content: {
        padding: 24,
        paddingBottom: 80,
        maxWidth: 1380,
        alignSelf: 'center',
        width: '100%',
    },
    topNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        ...Platform.select({
            web: { boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
            default: { elevation: 1 },
        }),
    },
    backButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#171411',
        letterSpacing: 0.3,
    },
    newClientButton: {
        backgroundColor: '#A78350', // Oro Champagne
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 22,
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(167, 131, 80, 0.25)' },
            default: { elevation: 2 },
        }),
    },
    newClientButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    header: {
        marginBottom: 26,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    brand: {
        fontSize: 11,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 2,
    },
    brandDot: {
        fontSize: 12,
        color: '#A78350',
    },
    brandAuthor: {
        fontSize: 11,
        fontWeight: '600',
        color: '#766B62',
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#171411',
        fontFamily: typography.serif,
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#766B62',
        lineHeight: 22,
        maxWidth: 780,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F8F2',
        borderLeftWidth: 4,
        borderLeftColor: '#2E7D32',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    successText: {
        fontSize: 13,
        color: '#1B5E20',
        fontWeight: '600',
        flex: 1,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FDF2F2',
        borderLeftWidth: 4,
        borderLeftColor: '#C62828',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    errorText: {
        fontSize: 13,
        color: '#B71C1C',
        fontWeight: '600',
        flex: 1,
    },
    dismissText: {
        fontSize: 15,
        color: '#766B62',
        paddingLeft: 12,
        fontWeight: '700',
    },
    controlsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        marginBottom: 26,
        gap: 14,
        ...Platform.select({
            web: { boxShadow: '0 4px 14px rgba(23, 20, 17, 0.04)' },
            default: { elevation: 2 },
        }),
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF7F2',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#171411',
        padding: 0,
    },
    clearSearchBtn: {
        padding: 4,
    },
    clearSearchText: {
        fontSize: 14,
        color: '#766B62',
    },
    filterPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    filterPill: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 18,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    filterPillActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.8,
    },
    filterPillTextActive: {
        color: '#FAF7F2',
    },
    filterCountBadge: {
        fontSize: 11,
        fontWeight: '600',
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        gap: 14,
    },
    loadingText: {
        fontSize: 14,
        color: '#766B62',
        fontStyle: 'italic',
    },
    emptyCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
        ...Platform.select({
            web: { boxShadow: '0 6px 20px rgba(23, 20, 17, 0.05)' },
            default: { elevation: 2 },
        }),
    },
    emptyStateImage: {
        width: '100%',
        height: 280,
    },
    emptyOverlay: {
        padding: 30,
        alignItems: 'center',
        textAlign: 'center',
        backgroundColor: '#FFFFFF',
    },
    emptyEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 2,
        marginBottom: 6,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#171411',
        fontFamily: typography.serif,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#766B62',
        textAlign: 'center',
        maxWidth: 580,
        lineHeight: 21,
        marginBottom: 20,
    },
    emptyActionButton: {
        backgroundColor: '#A78350',
        paddingVertical: 12,
        paddingHorizontal: 26,
        borderRadius: 22,
    },
    emptyActionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        justifyContent: 'flex-start',
    },
    clientCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 20,
        gap: 14,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 16px rgba(23, 20, 17, 0.04)',
                transition: 'all 0.2s ease',
            },
            default: { elevation: 2 },
        }),
    },
    clientCardDesktop: {
        width: '31.8%',
        minWidth: 340,
    },
    clientCardTablet: {
        width: '48.4%',
        minWidth: 320,
    },
    clientCardMobile: {
        width: '100%',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-start',
    },
    photoContainer: {
        position: 'relative',
        width: 90,
        height: 100,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        backgroundColor: '#F8F2E9',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoTypeBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoTypeReal: {
        backgroundColor: 'rgba(23, 20, 17, 0.82)',
    },
    photoTypeEditorial: {
        backgroundColor: 'rgba(167, 131, 80, 0.88)',
    },
    photoTypeBadgeText: {
        color: '#FFFFFF',
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    identityCol: {
        flex: 1,
        justifyContent: 'flex-start',
        gap: 4,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    statusBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeActive: {
        backgroundColor: '#FBF8F3',
        borderColor: '#A78350',
    },
    badgeArchived: {
        backgroundColor: '#F5F5F5',
        borderColor: '#CCCCCC',
    },
    statusBadgeText: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    badgeActiveText: {
        color: '#A78350',
    },
    badgeArchivedText: {
        color: '#766B62',
    },
    registrationDateText: {
        fontSize: 11,
        color: '#8C827A',
    },
    clientFullName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#171411',
        fontFamily: typography.serif,
        lineHeight: 22,
        marginBottom: 2,
    },
    contactItemsWrap: {
        gap: 2,
        marginTop: 2,
    },
    contactItemText: {
        fontSize: 12,
        color: '#766B62',
    },
    stylePreferencesBox: {
        backgroundColor: '#FAF7F2',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#A78350',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 3,
    },
    stylePreferencesPlaceholder: {
        backgroundColor: '#FAF7F2',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    placeholderText: {
        fontSize: 11.5,
        color: '#A59D94',
        fontStyle: 'italic',
    },
    sectionEyebrow: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 1,
    },
    stylePreferencesText: {
        fontSize: 12.5,
        color: '#171411',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    internalNotesBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 3,
    },
    internalNotesEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        color: '#766B62',
        letterSpacing: 0.8,
    },
    internalNotesText: {
        fontSize: 12,
        color: '#766B62',
        lineHeight: 17,
    },
    dossierHeroButton: {
        backgroundColor: '#171411', // Negro Atelier
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#A78350',
        marginTop: 4,
        ...Platform.select({
            web: { boxShadow: '0 3px 10px rgba(23, 20, 17, 0.15)' },
            default: { elevation: 2 },
        }),
    },
    dossierHeroButtonText: {
        color: '#F8F2E9',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0E8DC',
        paddingTop: 10,
        marginTop: 2,
    },
    viewDetailButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    viewDetailButtonText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#171411',
    },
    rightSecondaryButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    archiveSmallBtn: {
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    archiveSmallBtnText: {
        fontSize: 11.5,
        color: '#766B62',
        fontWeight: '600',
    },
    deleteSmallBtn: {
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    deleteSmallBtnText: {
        fontSize: 11.5,
        color: '#C62828',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxWidth: 620,
        maxHeight: '90%',
        padding: 24,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        ...Platform.select({
            web: { boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
            default: { elevation: 6 },
        }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    modalEyebrow: {
        fontSize: 10,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#171411',
        fontFamily: typography.serif,
    },
    closeModalButton: {
        padding: 6,
    },
    closeModalText: {
        fontSize: 20,
        color: '#766B62',
        fontWeight: '600',
    },
    modalScroll: {
        flex: 1,
    },
    photoUploadSection: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#FAF7F2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    photoSectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#171411',
        letterSpacing: 1,
        marginBottom: 12,
    },
    photoUploadRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    photoUploadPreviewWrapper: {
        position: 'relative',
        width: 100,
        height: 110,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#A78350',
        backgroundColor: '#FFFFFF',
    },
    photoUploadPreview: {
        width: '100%',
        height: '100%',
    },
    photoPreviewBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#2E7D32',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPreviewBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    photoUploadControls: {
        flex: 1,
        gap: 8,
    },
    uploadPhotoButton: {
        backgroundColor: '#171411',
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#A78350',
        alignItems: 'center',
    },
    uploadPhotoButtonText: {
        color: '#F8F2E9',
        fontSize: 12.5,
        fontWeight: '700',
    },
    deletePhotoButton: {
        backgroundColor: '#FAF0F0',
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFCDD2',
        alignItems: 'center',
    },
    deletePhotoButtonText: {
        color: '#C62828',
        fontSize: 11.5,
        fontWeight: '600',
    },
    photoFormatHint: {
        fontSize: 11,
        color: '#766B62',
        lineHeight: 15,
    },
    photoLoadingInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    photoLoadingText: {
        fontSize: 11.5,
        color: '#A78350',
        fontStyle: 'italic',
    },
    photoStatusSuccessText: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: '600',
        marginTop: 2,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#E6D9C8',
        marginVertical: 14,
    },
    modalActionButtons: {
        gap: 12,
        marginTop: 20,
        paddingBottom: 16,
    },
    cancelModalBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelModalBtnText: {
        color: '#766B62',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 24,
        maxWidth: 420,
        width: '100%',
        gap: 14,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#171411',
        fontFamily: typography.serif,
    },
    confirmDescription: {
        fontSize: 14,
        color: '#766B62',
        lineHeight: 20,
    },
    confirmActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    confirmCancelBtn: {
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#FAF7F2',
    },
    confirmCancelBtnText: {
        fontSize: 13,
        color: '#766B62',
        fontWeight: '600',
    },
    confirmSubmitBtn: {
        paddingVertical: 9,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#171411',
    },
    confirmDeleteBtn: {
        backgroundColor: '#C62828',
    },
    confirmSubmitBtnText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
