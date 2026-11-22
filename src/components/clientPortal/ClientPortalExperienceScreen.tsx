// ==============================================================================
// ATELIER DIGITAL — PANTALLA PRINCIPAL: PORTAL DE LA CLIENTA (M09)
// Archivo: src/components/clientPortal/ClientPortalExperienceScreen.tsx
// ==============================================================================
// Experiencia visual local exclusiva para rol 'client':
// - Sin conexión a Supabase, sin persistencia simulada ni datos privados.
// - Aislamiento estricto multi-clienta por clientId.
// - Modelo mixto Zero Trust (DEFAULT false), Doble Candado y deny-overrides.
// - Incluye simulador local colapsable para validar estados de acceso y reglas
//   mixtas directamente en esta vista previa de desarrollo.
// ==============================================================================

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { PortalAction, PortalResource } from '../../types/portal';
import { AtelierBrandBadge } from '../AtelierBrandBadge';
import {
    getPortalLocalMemorySnapshot,
    setClientPortalDraftInMemory,
    setClientPortalStatusOverrideInMemory,
    subscribePortalLocalMemory,
    updateClientPortalDraftInMemory,
} from '../portal/portalLocalMemoryStore';
import { ClientPortalAccessGateView } from './ClientPortalAccessGateView';
import {
    CLIENT_ACCESS_LIFECYCLE_META,
    CLIENT_PORTAL_REFERENCE_RECORDS,
    CLIENT_PORTAL_SECTIONS,
    ClientPortalLifecycleStatus,
    ClientPortalSectionId,
    ClientQuoteOverrideMode,
    createCuratedDemoPermissions,
    createDefaultClientPermissions,
    createDenyOverrideDemoPermissions,
    makeClientPermissionKey,
    projectAuthorizedClientPortalView,
    setCreationClientQuoteOverride,
    toggleCreationClientPermission,
    toggleGlobalClientPermission,
} from './clientPortalModel';
import { ClientPortalSectionViews } from './ClientPortalSectionViews';
import { clientPortalStyles as styles } from './clientPortalStyles';

export interface ClientPortalExperienceScreenProps {
    onBack: () => void;
}

const LIFECYCLE_STATUS_ORDER: readonly ClientPortalLifecycleStatus[] = [
    'active',
    'unprovisioned',
    'invited',
    'suspended',
    'revoked',
];

const GLOBAL_TOGGLE_CONTROLS: readonly {
    resource: PortalResource;
    action: PortalAction;
    label: string;
}[] = [
    { resource: 'appointments', action: 'view', label: 'appointments:view (Citas)' },
    { resource: 'measurements', action: 'view', label: 'measurements:view (Sesiones M02)' },
    { resource: 'quotations', action: 'view', label: 'quotations:view (Global)' },
    { resource: 'messaging', action: 'observe', label: 'messaging:observe (Comunicación)' },
    { resource: 'sketches', action: 'approve', label: 'sketches:approve (Acción futura)' },
    { resource: 'sketches', action: 'download', label: 'sketches:download (Acción futura)' },
    { resource: 'quotations', action: 'download', label: 'quotations:download (Acción futura)' },
];

const CREATION_TOGGLE_CONTROLS: readonly {
    resource: PortalResource;
    action: PortalAction;
    label: string;
}[] = [
    { resource: 'creations', action: 'view', label: 'creations:view (Candado Maestro)' },
    { resource: 'sketches', action: 'view', label: 'sketches:view' },
    { resource: 'fabrics', action: 'view', label: 'fabrics:view' },
    { resource: 'fittings', action: 'view', label: 'fittings:view' },
    { resource: '3d_viewer', action: 'view', label: '3d_viewer:view' },
];

export const ClientPortalExperienceScreen: React.FC<ClientPortalExperienceScreenProps> = ({
    onBack,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isExclusiveClient = role === 'client';

    const [activeClientId, setActiveClientId] = useState<string>(
        CLIENT_PORTAL_REFERENCE_RECORDS[0].id
    );
    const [activeSection, setActiveSection] = useState<ClientPortalSectionId>('inicio');
    const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
    const { draftsByClientId, statusByClientId } = useSyncExternalStore(
        subscribePortalLocalMemory,
        getPortalLocalMemorySnapshot,
        getPortalLocalMemorySnapshot
    );

    const currentStatus = statusByClientId[activeClientId] || 'unprovisioned';
    const currentPermissions = useMemo(
        () => draftsByClientId[activeClientId] || createDefaultClientPermissions(),
        [draftsByClientId, activeClientId]
    );

    const authorizedView = useMemo(
        () =>
            projectAuthorizedClientPortalView({
                clientId: activeClientId,
                accessStatus: currentStatus,
                permissions: currentPermissions,
            }),
        [activeClientId, currentStatus, currentPermissions]
    );

    const statusMeta = CLIENT_ACCESS_LIFECYCLE_META[currentStatus];

    const handleSelectClient = (clientId: string) => {
        setActiveClientId(clientId);
        setActiveSection('inicio');
    };

    const handleSetStatus = (status: ClientPortalLifecycleStatus) => {
        setClientPortalStatusOverrideInMemory(activeClientId, status);
    };

    const handleApplyPreset = (preset: 'zero_trust' | 'curated' | 'deny_override') => {
        const nextPermissions =
            preset === 'zero_trust'
                ? createDefaultClientPermissions()
                : preset === 'curated'
                  ? createCuratedDemoPermissions(activeClientId)
                  : createDenyOverrideDemoPermissions(activeClientId);
        setClientPortalDraftInMemory(activeClientId, {
            globalGrants: { ...nextPermissions.globalGrants },
            creationGrants: { ...nextPermissions.creationGrants },
            creationQuoteOverrides: { ...nextPermissions.creationQuoteOverrides },
        });
    };

    const handleToggleGlobal = (resource: PortalResource, action: PortalAction) => {
        updateClientPortalDraftInMemory(activeClientId, (current) => {
            const next = toggleGlobalClientPermission(current, resource, action);
            return {
                globalGrants: { ...next.globalGrants },
                creationGrants: { ...next.creationGrants },
                creationQuoteOverrides: { ...next.creationQuoteOverrides },
            };
        });
    };

    const handleToggleCreation = (
        creationId: string,
        resource: PortalResource,
        action: PortalAction
    ) => {
        updateClientPortalDraftInMemory(activeClientId, (current) => {
            const next = toggleCreationClientPermission(current, creationId, resource, action);
            return {
                globalGrants: { ...next.globalGrants },
                creationGrants: { ...next.creationGrants },
                creationQuoteOverrides: { ...next.creationQuoteOverrides },
            };
        });
    };

    const handleSetQuoteOverride = (creationId: string, mode: ClientQuoteOverrideMode) => {
        updateClientPortalDraftInMemory(activeClientId, (current) => {
            const next = setCreationClientQuoteOverride(current, creationId, mode);
            return {
                globalGrants: { ...next.globalGrants },
                creationGrants: { ...next.creationGrants },
                creationQuoteOverrides: { ...next.creationQuoteOverrides },
            };
        });
    };

    if (authLoading) {
        return (
            <View style={styles.centerBlock} testID="client-portal-loading">
                <ActivityIndicator color={colors.champagneGold} size="small" />
                <Text style={styles.cardSubtitle}>Verificando acceso exclusivo de clienta...</Text>
            </View>
        );
    }

    if (!isExclusiveClient) {
        return (
            <View style={styles.centerBlock} testID="client-portal-role-denied">
                <AtelierBrandBadge compact subtitle="Acceso Exclusivo para Clientas" />
                <Text style={styles.accessGateTitle}>Espacio Reservado para Rol Clienta</Text>
                <Text style={[styles.accessGateBody, { textAlign: 'center', maxWidth: 460 }]}>
                    Esta ruta pertenece exclusivamente al Portal Privado de la Clienta. Los perfiles
                    de diseño, administración o visitantes anónimos no acceden a esta experiencia.
                </Text>
                <TouchableOpacity
                    style={styles.primaryGoldBtn}
                    onPress={onBack}
                    testID="client-portal-denied-back"
                >
                    <Text style={styles.primaryGoldBtnText}>Volver a mi espacio autorizado</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const activeClient = authorizedView.client;

    const sectionBadgeCount = (sectionId: ClientPortalSectionId): number | null => {
        if (sectionId === 'creaciones') return authorizedView.authorizedCreations.length;
        if (sectionId === 'citas') return authorizedView.authorizedAppointments.length;
        if (sectionId === 'seguimiento') {
            return (
                authorizedView.authorizedFittings.length +
                authorizedView.authorizedMeasurementSessions.length
            );
        }
        if (sectionId === 'comunicacion') return authorizedView.authorizedMessages.length;
        return null;
    };

    return (
        <View style={styles.container} testID="client-portal-experience-root">
            {/* Cabecera Editorial */}
            <View style={styles.headerBar}>
                <View style={styles.headerInner}>
                    <View style={[styles.headerLeft, !isDesktop && styles.headerFullWidthMobile]}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={onBack}
                            accessibilityRole="button"
                            testID="client-portal-back-btn"
                        >
                            <Text style={styles.backBtnText}>← Volver</Text>
                        </TouchableOpacity>

                        <View style={styles.headerIdentityRow}>
                            {isDesktop ? (
                                <View style={{ marginBottom: -14 }}>
                                    <AtelierBrandBadge compact subtitle="Portal Privado" />
                                </View>
                            ) : null}
                            <View style={styles.headerTitleBlock}>
                                <Text style={styles.eyebrow}>
                                    ATELIER BY KATHERINE CARROLL · M09 CLIENTA
                                </Text>
                                <Text style={styles.headerTitle}>
                                    {activeClient ? activeClient.fullName : 'Mi Portal Privado'}
                                </Text>
                                <Text style={styles.headerSubtitle}>
                                    {activeClient ? `${activeClient.city} · ` : ''}
                                    Datos de referencia locales en memoria · Sin Supabase
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.headerRightControls,
                            !isDesktop && styles.headerFullWidthMobile,
                        ]}
                    >
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: statusMeta.badgeBg,
                                    borderColor: statusMeta.badgeBorder,
                                },
                            ]}
                            testID="client-header-status-badge"
                        >
                            <Text style={[styles.statusBadgeText, { color: statusMeta.badgeText }]}>
                                {statusMeta.badgeLabel}
                            </Text>
                        </View>

                        <View style={styles.localPreviewBadge}>
                            <Text style={styles.localPreviewBadgeText}>MODO LOCAL · ZERO DB</Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.simulatorToggleBtn,
                                simulatorOpen && styles.simulatorToggleBtnActive,
                            ]}
                            onPress={() => setSimulatorOpen((open) => !open)}
                            accessibilityRole="button"
                            testID="client-simulator-toggle"
                        >
                            <Text
                                style={[
                                    styles.simulatorToggleText,
                                    simulatorOpen && styles.simulatorToggleTextActive,
                                ]}
                            >
                                {simulatorOpen ? 'Cerrar Simulador Local' : 'Simulador Local'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Barra de Navegación de 5 Secciones (solo visible cuando accessStatus === 'active') */}
            {authorizedView.isAccessible ? (
                <View style={styles.navShell} testID="client-portal-nav-tabs">
                    <View style={styles.navInner}>
                        <View style={styles.navTabsRow}>
                            {CLIENT_PORTAL_SECTIONS.map((sec) => {
                                const selected = activeSection === sec.id;
                                const badgeCount = sectionBadgeCount(sec.id);
                                return (
                                    <TouchableOpacity
                                        key={sec.id}
                                        style={[
                                            styles.navTabBtn,
                                            selected && styles.navTabBtnActive,
                                        ]}
                                        onPress={() => setActiveSection(sec.id)}
                                        accessibilityRole="tab"
                                        accessibilityState={{ selected }}
                                        testID={`client-tab-${sec.id}`}
                                    >
                                        <Text
                                            style={[
                                                styles.navTabText,
                                                selected && styles.navTabTextActive,
                                            ]}
                                        >
                                            {sec.label}
                                        </Text>
                                        {badgeCount !== null ? (
                                            <View
                                                style={[
                                                    styles.navCountPill,
                                                    selected && styles.navCountPillActive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.navCountText,
                                                        selected && styles.navCountTextActive,
                                                    ]}
                                                >
                                                    {badgeCount}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            ) : null}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                testID="client-portal-scroll"
            >
                <View style={styles.maxWidthWrapper}>
                    {/* Simulador Local Colapsable (solo vista previa local en memoria) */}
                    {simulatorOpen ? (
                        <View style={styles.simulatorPanel} testID="client-local-simulator-panel">
                            <View style={styles.cardHeaderRow}>
                                <View style={styles.cardTitleGroup}>
                                    <Text style={styles.eyebrow}>
                                        VISTA PREVIA EN MEMORIA · SIN PERSISTENCIA NI SUPABASE
                                    </Text>
                                    <Text style={styles.cardTitle}>
                                        Simulador Local de Estados, Aislamiento y Modelo Mixto
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.secondaryOutlineBtn}
                                    onPress={() => handleApplyPreset('zero_trust')}
                                    testID="sim-preset-zero-trust"
                                >
                                    <Text style={styles.secondaryOutlineBtnText}>
                                        Restablecer Zero Trust (OFF)
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.itemRowMeta}>
                                1. Identidad de referencia aislada (multi-tenant estricto):
                            </Text>
                            <View style={styles.simulatorChipsRow}>
                                {CLIENT_PORTAL_REFERENCE_RECORDS.map((rec) => {
                                    const isSel = rec.id === activeClientId;
                                    return (
                                        <TouchableOpacity
                                            key={rec.id}
                                            style={[styles.simChip, isSel && styles.simChipActive]}
                                            onPress={() => handleSelectClient(rec.id)}
                                            testID={`sim-client-${rec.id}`}
                                        >
                                            <Text
                                                style={[
                                                    styles.simChipText,
                                                    isSel && styles.simChipTextActive,
                                                ]}
                                            >
                                                {rec.fullName} ({rec.city})
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.itemRowMeta}>
                                2. Estado de ciclo de vida del acceso (client_portal_access):
                            </Text>
                            <View style={styles.simulatorChipsRow}>
                                {LIFECYCLE_STATUS_ORDER.map((st) => {
                                    const isSel = currentStatus === st;
                                    return (
                                        <TouchableOpacity
                                            key={st}
                                            style={[styles.simChip, isSel && styles.simChipActive]}
                                            onPress={() => handleSetStatus(st)}
                                            testID={`sim-status-${st}`}
                                        >
                                            <Text
                                                style={[
                                                    styles.simChipText,
                                                    isSel && styles.simChipTextActive,
                                                ]}
                                            >
                                                {CLIENT_ACCESS_LIFECYCLE_META[st].shortLabel}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.itemRowMeta}>
                                3. Escenarios rápidos de permisos (inicia siempre en DEFAULT false):
                            </Text>
                            <View style={styles.simulatorChipsRow}>
                                <TouchableOpacity
                                    style={styles.simChip}
                                    onPress={() => handleApplyPreset('curated')}
                                    testID="sim-preset-curated"
                                >
                                    <Text style={styles.simChipText}>
                                        Activar Curaduría Completa
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.simChip}
                                    onPress={() => handleApplyPreset('deny_override')}
                                    testID="sim-preset-deny-override"
                                >
                                    <Text style={styles.simChipText}>
                                        Escenario Mixto + deny-overrides
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.itemRowMeta}>
                                4. Nivel 1 Global y Acciones (se aplican solo con acceso Activo):
                            </Text>
                            <View style={styles.simulatorChipsRow}>
                                {GLOBAL_TOGGLE_CONTROLS.map((ctrl) => {
                                    const key = makeClientPermissionKey(ctrl.resource, ctrl.action);
                                    const active = Boolean(currentPermissions.globalGrants[key]);
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[styles.simChip, active && styles.simChipActive]}
                                            onPress={() =>
                                                handleToggleGlobal(ctrl.resource, ctrl.action)
                                            }
                                            testID={`sim-global-${ctrl.resource}-${ctrl.action}`}
                                        >
                                            <Text
                                                style={[
                                                    styles.simChipText,
                                                    active && styles.simChipTextActive,
                                                ]}
                                            >
                                                {active ? 'ON · ' : 'OFF · '}
                                                {ctrl.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {activeClient && activeClient.creations.length > 0 ? (
                                <View style={{ gap: 8 }}>
                                    <Text style={styles.itemRowMeta}>
                                        5. Nivel 2 Doble Candado y deny-overrides por creación de{' '}
                                        {activeClient.greetingName}:
                                    </Text>
                                    {activeClient.creations.map((cr) => {
                                        const crMap =
                                            currentPermissions.creationGrants[cr.id] || {};
                                        const masterOn = Boolean(
                                            crMap[makeClientPermissionKey('creations', 'view')]
                                        );
                                        const quoteMode =
                                            currentPermissions.creationQuoteOverrides[cr.id] ||
                                            'inherit';

                                        return (
                                            <View key={cr.id} style={styles.simCreationBox}>
                                                <Text style={styles.simCreationTitle}>
                                                    {cr.name}
                                                </Text>
                                                <View style={styles.simulatorChipsRow}>
                                                    {CREATION_TOGGLE_CONTROLS.map((ctrl) => {
                                                        const key = makeClientPermissionKey(
                                                            ctrl.resource,
                                                            ctrl.action
                                                        );
                                                        const active = Boolean(crMap[key]);
                                                        const locked =
                                                            ctrl.resource !== 'creations' &&
                                                            !masterOn;
                                                        return (
                                                            <TouchableOpacity
                                                                key={key}
                                                                disabled={locked}
                                                                style={[
                                                                    styles.simChip,
                                                                    active && styles.simChipActive,
                                                                    locked && { opacity: 0.45 },
                                                                ]}
                                                                onPress={() =>
                                                                    handleToggleCreation(
                                                                        cr.id,
                                                                        ctrl.resource,
                                                                        ctrl.action
                                                                    )
                                                                }
                                                                testID={`sim-cr-${cr.id}-${ctrl.resource}-${ctrl.action}`}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.simChipText,
                                                                        active &&
                                                                            styles.simChipTextActive,
                                                                    ]}
                                                                >
                                                                    {active ? 'ON · ' : 'OFF · '}
                                                                    {ctrl.label}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                                <View style={styles.simulatorChipsRow}>
                                                    {(['inherit', 'allow', 'deny'] as const).map(
                                                        (mode) => {
                                                            const isSel = quoteMode === mode;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={mode}
                                                                    style={[
                                                                        styles.simChip,
                                                                        isSel &&
                                                                            styles.simChipActive,
                                                                    ]}
                                                                    onPress={() =>
                                                                        handleSetQuoteOverride(
                                                                            cr.id,
                                                                            mode
                                                                        )
                                                                    }
                                                                    testID={`sim-quote-${cr.id}-${mode}`}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.simChipText,
                                                                            isSel &&
                                                                                styles.simChipTextActive,
                                                                        ]}
                                                                    >
                                                                        Cotización: {mode}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            );
                                                        }
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {/* Cuerpo Principal: Acceso Restringido vs Experiencia Autorizada */}
                    {!authorizedView.isAccessible ? (
                        <ClientPortalAccessGateView
                            clientFullName={activeClient?.fullName || 'Clienta del Atelier'}
                            clientCity={activeClient?.city || 'Atelier Privado'}
                            accessStatus={
                                currentStatus as Exclude<ClientPortalLifecycleStatus, 'active'>
                            }
                        />
                    ) : (
                        <ClientPortalSectionViews
                            section={activeSection}
                            authorizedView={authorizedView}
                            onSelectSection={setActiveSection}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
