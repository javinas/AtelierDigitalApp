// ==============================================================================
// ATELIER DIGITAL — PANTALLA DE DISEÑADORA: GESTIÓN DEL PORTAL DE CLIENTES (M09)
// Archivo: src/components/portal/PortalDesignerStudioScreen.tsx
// ==============================================================================
// Pantalla dedicada al perfil de Katherine Carroll / Administración para:
// - Consultar el estado de acceso de cada clienta al portal.
// - Configurar visualmente en memoria los permisos mixtos (consulta y acciones).
// - Mostrar con transparencia el estado desconectado de backend sin simular
//   persistencia ni exponer datos reservados de taller.
// ==============================================================================

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { PortalAction, PortalResource } from '../../types/portal';
import { PortalClientAccessCard } from './PortalClientAccessCard';
import {
    ACCESS_STATUS_META,
    createEmptyDraftPermissions,
    CreationQuoteOverrideMode,
    LOCAL_REFERENCE_PORTAL_CLIENTS,
    M09_PENDING_BACKEND_DEPENDENCIES,
    PortalAccessLifecycleViewStatus,
    setCreationQuoteOverride,
    summarizeDraftPermissions,
    toggleCreationDraftPermission,
    toggleGlobalDraftPermission,
} from './portalDesignerModel';
import { portalDesignerStyles as styles } from './portalDesignerStyles';
import {
    getPortalLocalMemorySnapshot,
    setClientPortalDraftInMemory,
    subscribePortalLocalMemory,
    updateClientPortalDraftInMemory,
} from './portalLocalMemoryStore';
import { PortalPermissionsMatrix } from './PortalPermissionsMatrix';

export interface PortalDesignerStudioScreenProps {
    onBack: () => void;
    initialClientId?: string;
}

type StatusFilter = PortalAccessLifecycleViewStatus | 'all';

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activa' },
    { key: 'invited', label: 'Invitada' },
    { key: 'unprovisioned', label: 'Sin aprovisionar' },
    { key: 'suspended', label: 'Suspendida' },
    { key: 'revoked', label: 'Revocada' },
];

export const PortalDesignerStudioScreen: React.FC<PortalDesignerStudioScreenProps> = ({
    onBack,
    initialClientId,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isAuthorized = role === 'designer' || role === 'admin';

    const resolvedInitialId = useMemo(() => {
        if (
            initialClientId &&
            LOCAL_REFERENCE_PORTAL_CLIENTS.some((c) => c.id === initialClientId)
        ) {
            return initialClientId;
        }
        return LOCAL_REFERENCE_PORTAL_CLIENTS[0].id;
    }, [initialClientId]);

    const [trackedInitialClientId, setTrackedInitialClientId] = useState<string | undefined>(
        initialClientId
    );
    const [selectedClientId, setSelectedClientId] = useState<string>(resolvedInitialId);
    if (trackedInitialClientId !== initialClientId) {
        setTrackedInitialClientId(initialClientId);
        if (
            initialClientId &&
            LOCAL_REFERENCE_PORTAL_CLIENTS.some((c) => c.id === initialClientId)
        ) {
            setSelectedClientId(initialClientId);
        }
    }
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [mobileDirectoryOpen, setMobileDirectoryOpen] = useState<boolean>(false);
    const { draftsByClientId } = useSyncExternalStore(
        subscribePortalLocalMemory,
        getPortalLocalMemorySnapshot,
        getPortalLocalMemorySnapshot
    );

    const filteredClients = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return LOCAL_REFERENCE_PORTAL_CLIENTS.filter((c) => {
            if (statusFilter !== 'all' && c.accessStatus !== statusFilter) {
                return false;
            }
            if (!q) return true;
            return (
                c.fullName.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.city.toLowerCase().includes(q)
            );
        });
    }, [searchQuery, statusFilter]);

    const selectedClient = useMemo(() => {
        return (
            LOCAL_REFERENCE_PORTAL_CLIENTS.find((c) => c.id === selectedClientId) ||
            LOCAL_REFERENCE_PORTAL_CLIENTS[0]
        );
    }, [selectedClientId]);

    const selectedDraft =
        draftsByClientId[selectedClient.id] || createEmptyDraftPermissions();

    const handleSelectClient = (clientId: string) => {
        setSelectedClientId(clientId);
        if (!isDesktop) {
            setMobileDirectoryOpen(false);
        }
    };

    const handleToggleGlobalPermission = (resource: PortalResource, action: PortalAction) => {
        updateClientPortalDraftInMemory(selectedClient.id, (current) =>
            toggleGlobalDraftPermission(current, resource, action)
        );
    };

    const handleToggleCreationPermission = (
        creationId: string,
        resource: PortalResource,
        action: PortalAction
    ) => {
        updateClientPortalDraftInMemory(selectedClient.id, (current) =>
            toggleCreationDraftPermission(current, creationId, resource, action)
        );
    };

    const handleChangeCreationQuoteOverride = (
        creationId: string,
        mode: CreationQuoteOverrideMode
    ) => {
        updateClientPortalDraftInMemory(selectedClient.id, (current) =>
            setCreationQuoteOverride(current, creationId, mode)
        );
    };

    const handleResetZeroTrust = () => {
        setClientPortalDraftInMemory(selectedClient.id, createEmptyDraftPermissions());
    };

    if (authLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.champagneGold} />
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={styles.container}>
                <View style={styles.restrictedCard}>
                    <Text style={styles.eyebrow}>ACCESO RESTRINGIDO</Text>
                    <Text style={styles.restrictedTitle}>
                        Gestión Exclusiva de Dirección del Atelier
                    </Text>
                    <Text style={styles.restrictedText}>
                        Esta interfaz pertenece exclusivamente al perfil de diseñadora y administración
                        para gobernar el acceso y los permisos del Portal de Clientes.
                    </Text>
                    <TouchableOpacity
                        style={styles.resetZeroTrustBtn}
                        onPress={onBack}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.resetZeroTrustBtnText}>Volver al inicio</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const showDirectoryPanel = isDesktop || mobileDirectoryOpen;

    return (
        <View style={styles.container}>
            {/* Cabecera Editorial */}
            <View style={styles.headerBar}>
                <View style={styles.headerInner}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={onBack}
                            activeOpacity={0.8}
                            accessibilityLabel="Volver al panel principal de diseñadora"
                        >
                            <Text style={styles.backBtnText}>← Panel Principal</Text>
                        </TouchableOpacity>

                        <View style={styles.headerTitleBlock}>
                            <Text style={styles.eyebrow}>
                                MÓDULO 09 · PORTAL PRIVADO DE CLIENTES
                            </Text>
                            <Text style={styles.headerTitle}>
                                Centro de Gestión del Portal
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                Consulta de estado de acceso y configuración visual Zero Trust desde
                                el perfil de la diseñadora.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerRightPills}>
                        <View style={styles.localOnlyPill}>
                            <Text style={styles.localOnlyPillText}>
                                INTERFAZ LOCAL · CERO CONEXIÓN REMOTA
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.maxWidthWrapper}>
                    {/* Banner Transparente: Alcance Real Local vs Dependencias Backend */}
                    <View style={styles.honestyBanner}>
                        <View style={styles.honestyBannerHeader}>
                            <Text style={styles.honestyBannerTitle}>
                                Alcance Activo de Esta Interfaz Visual (Modelo Mixto Zero Trust)
                            </Text>
                            <View style={styles.honestyTag}>
                                <Text style={styles.honestyTagText}>
                                    SIN PERSISTENCIA REMOTA ACTIVA
                                </Text>
                            </View>
                        </View>

                        <View style={styles.honestyGrid}>
                            <View style={styles.honestyCol}>
                                <Text style={styles.honestyColLabel}>OPERATIVO EN LOCAL HOY</Text>
                                <Text style={styles.honestyColText}>
                                    Inspección de los 5 estados de acceso de referencia, búsqueda/filtro
                                    de clientas y configuración visual del borrador de permisos en
                                    memoria (todo apagado por defecto) con evaluación inmediata del Doble
                                    Candado.
                                </Text>
                            </View>
                            <View style={styles.honestyCol}>
                                <Text style={styles.honestyColLabel}>
                                    PENDIENTE DE BACKEND M09
                                </Text>
                                <Text style={styles.honestyColText}>
                                    El guardado real, emisión criptográfica de invitaciones, cambio de
                                    estado de acceso y descargas/aprobaciones permanecen bloqueados hasta
                                    autorizar y desplegar la migración E1 y las Edge Functions de E2.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Toggle colapsable de directorio en móvil */}
                    {!isDesktop && (
                        <TouchableOpacity
                            testID="portal-mobile-directory-toggle"
                            style={styles.mobileDirectoryToggleBtn}
                            onPress={() => setMobileDirectoryOpen((prev) => !prev)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.mobileDirectoryToggleText}>
                                {mobileDirectoryOpen
                                    ? '▲ Ocultar directorio de clientas'
                                    : `▼ Clienta seleccionada: ${selectedClient.fullName}`}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Cuerpo Principal Responsivo */}
                    <View style={isDesktop ? styles.workspaceRow : styles.workspaceColMobile}>
                        {showDirectoryPanel && (
                            <View
                                style={
                                    isDesktop
                                        ? styles.directoryColumnDesktop
                                        : styles.directoryColumnMobile
                                }
                            >
                                <View style={styles.card}>
                                    <View>
                                        <Text style={styles.eyebrow}>
                                            DIRECTORIO DE REFERENCIA LOCAL
                                        </Text>
                                        <Text style={styles.cardTitle}>Clientas del Portal</Text>
                                    </View>

                                    <TextInput
                                        testID="portal-search-input"
                                        style={styles.searchInput}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Buscar por nombre, correo o ciudad..."
                                        placeholderTextColor={colors.textMuted}
                                    />

                                    <View style={styles.filterChipsRow}>
                                        {FILTER_OPTIONS.map((opt) => {
                                            const active = statusFilter === opt.key;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.key}
                                                    testID={`portal-filter-${opt.key}`}
                                                    style={[
                                                        styles.filterChip,
                                                        active && styles.filterChipActive,
                                                    ]}
                                                    onPress={() => setStatusFilter(opt.key)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.filterChipText,
                                                            active && styles.filterChipTextActive,
                                                        ]}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <View style={styles.divider} />

                                    <Text testID="portal-directory-count" style={styles.clientListMeta}>
                                        Mostrando {filteredClients.length} de{' '}
                                        {LOCAL_REFERENCE_PORTAL_CLIENTS.length} fichas de referencia
                                    </Text>

                                    <View style={styles.clientListContainer}>
                                        {filteredClients.length === 0 ? (
                                            <View style={{ gap: 10 }}>
                                                <Text style={styles.cardExplainer}>
                                                    Ninguna clienta coincide con el filtro actual.
                                                </Text>
                                                <TouchableOpacity
                                                    testID="portal-clear-filters-btn"
                                                    style={[
                                                        styles.resetZeroTrustBtn,
                                                        { alignSelf: 'flex-start' },
                                                    ]}
                                                    onPress={() => {
                                                        setSearchQuery('');
                                                        setStatusFilter('all');
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.resetZeroTrustBtnText}>
                                                        Limpiar búsqueda y filtros
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            filteredClients.map((client) => {
                                                const isSelected = client.id === selectedClient.id;
                                                const badgeMeta =
                                                    ACCESS_STATUS_META[client.accessStatus];
                                                const clientDraft =
                                                    draftsByClientId[client.id] ||
                                                    createEmptyDraftPermissions();
                                                const clientSummary = summarizeDraftPermissions(
                                                    clientDraft,
                                                    client
                                                );

                                                return (
                                                    <TouchableOpacity
                                                        key={client.id}
                                                        testID={`portal-client-item-${client.id}`}
                                                        style={[
                                                            styles.clientListItem,
                                                            isSelected && styles.clientListItemSelected,
                                                        ]}
                                                        onPress={() => handleSelectClient(client.id)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <View style={styles.clientListTopRow}>
                                                            <Text style={styles.clientListName}>
                                                                {client.fullName}
                                                            </Text>
                                                            <View
                                                                style={[
                                                                    styles.statusBadge,
                                                                    {
                                                                        backgroundColor:
                                                                            badgeMeta.badgeBg,
                                                                        borderColor:
                                                                            badgeMeta.badgeBorder,
                                                                    },
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.statusBadgeText,
                                                                        {
                                                                            color: badgeMeta.badgeText,
                                                                        },
                                                                    ]}
                                                                >
                                                                    {badgeMeta.label}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text style={styles.clientListMeta}>
                                                            {client.city} · Borrador:{' '}
                                                            {clientSummary.totalEnabled} permisos ·{' '}
                                                            {client.creations.length} prendas
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.detailColumn}>
                            <PortalClientAccessCard client={selectedClient} />

                            <PortalPermissionsMatrix
                                client={selectedClient}
                                draft={selectedDraft}
                                onToggleGlobalPermission={handleToggleGlobalPermission}
                                onToggleCreationPermission={handleToggleCreationPermission}
                                onChangeCreationQuoteOverride={handleChangeCreationQuoteOverride}
                                onResetZeroTrust={handleResetZeroTrust}
                            />

                            {/* Tarjeta Transparente de Dependencias Backend Pendientes */}
                            <View style={styles.card}>
                                <View>
                                    <Text style={styles.eyebrow}>
                                        ARQUITECTURA Y DEPENDENCIAS PENDIENTES
                                    </Text>
                                    <Text style={styles.cardTitle}>
                                        Requisitos de Backend M09 para Persistir Operaciones
                                    </Text>
                                </View>
                                <View style={styles.divider} />
                                {M09_PENDING_BACKEND_DEPENDENCIES.map((dep) => (
                                    <View key={dep.id} style={styles.dependencyRow}>
                                        <Text style={styles.dependencyPhase}>{dep.phase}</Text>
                                        <Text style={styles.dependencyTitle}>{dep.title}</Text>
                                        <Text style={styles.dependencyDetail}>{dep.detail}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};
