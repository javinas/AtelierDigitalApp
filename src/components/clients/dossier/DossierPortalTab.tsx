// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: CENTRO DE CONTROL DEL PORTAL DE CLIENTA (M09-B)
// Archivo: src/components/clients/dossier/DossierPortalTab.tsx
// ==============================================================================
// Panel de control para Katherine Carroll dentro del Expediente de Clienta.
// Gobierna:
// 1. Estado de vinculación y ciclo de vida de la cuenta (invited/active/suspended/revoked).
// 2. Interruptores de visibilidad modular (Nivel 1 — Zero Trust: DEFAULT false).
// 3. Doble candado por creación (Nivel 2: visibilidad y permisos granulares por prenda).
// 4. Emisión de invitaciones criptográficas y trazabilidad.
// 5. Bitácora forense de auditoría y telemetría de accesos.
// ==============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { usePortalResponsive } from '../../../hooks/usePortalResponsive';
import { supabase } from '../../../supabase';
import { Client } from '../../../types/client';
import { Creation } from '../../../types/creation';
import {
    ClientPortalAccess,
    ClientPortalActivityLog,
    ClientPortalInvitation,
    ClientPortalPermission,
    IssuePortalInvitationResult,
    PortalAccessStatus,
    PortalAction,
    PortalEmailDispatchStatus,
    PortalInvitationStatus,
    PortalResource,
} from '../../../types/portal';
import {
    buildPortalPermissionsProjection,
    dispatchPortalInvitationEmailViaEdge,
    fetchClientPortalAccess,
    fetchClientPortalInvitations,
    fetchPortalActivityLog,
    fetchPortalPermissions,
    getPortalServiceOperatingMode,
    issuePortalInvitation,
    reissuePortalInvitation,
    resolveInvitationDisplayStatus,
    revokeAllCreationScopedPermissions,
    revokeCreationPortalPermissions,
    revokePortalInvitation,
    setPortalPermission,
    updatePortalAccessStatus,
} from '../../../services/portalService';

interface DossierPortalTabProps {
    client: Client;
    creations: Creation[];
    formatDate?: (dateStr?: string | null) => string;
}

interface OneTimeInviteDelivery {
    invitationId: string;
    inviteUrl: string;
    email: string;
    expiresAt: string;
    message: string;
    isReissue: boolean;
    emailStatus?: PortalEmailDispatchStatus | 'dispatching';
    emailNotice?: string;
}

const INVITATION_STATUS_META: Record<
    PortalInvitationStatus,
    { label: string; bg: string; text: string; border: string }
> = {
    pending: { label: 'PENDIENTE', bg: '#FFF8E7', text: '#8A5D10', border: '#E8D5B0' },
    processing: { label: 'EN PROCESO', bg: '#EEF4FA', text: '#2C5E8A', border: '#C7DAEC' },
    accepted: { label: 'ACEPTADA', bg: '#E8F5E9', text: '#2E7D32', border: '#B9DFBC' },
    expired: { label: 'EXPIRADA', bg: '#F4F1ED', text: '#7A6F64', border: '#DCD4C9' },
    revoked: { label: 'REVOCADA', bg: '#FAF2F2', text: '#9E3B3B', border: '#E8C5C5' },
    failed: { label: 'FALLIDA', bg: '#FCEAEA', text: '#9E2A2B', border: '#E5B3B3' },
};

const ACTIVITY_EVENT_LABELS: Record<string, string> = {
    invitation_accepted: 'Invitación aceptada y cuenta vinculada',
    invitation_email_dispatched: 'Correo de invitación despachado vía SMTP',
    portal_switches_updated_demo: 'Permisos modulares actualizados (DEMO)',
};

export const DossierPortalTab: React.FC<DossierPortalTabProps> = ({
    client,
    creations,
    formatDate = (d) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return String(d);
        }
    },
}) => {
    const responsive = usePortalResponsive();
    const isMobile = responsive.isMobile;
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [savingSwitchKey, setSavingSwitchKey] = useState<string | null>(null);
    const [access, setAccess] = useState<ClientPortalAccess | null>(null);
    const [invitations, setInvitations] = useState<ClientPortalInvitation[]>([]);
    const [permissions, setPermissions] = useState<ClientPortalPermission[]>([]);
    const [activityLogs, setActivityLogs] = useState<ClientPortalActivityLog[]>([]);
    const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
    const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);

    // Compuertas visuales efímeras Nivel 1 para Creaciones y Fittings (nunca conceden acceso global en BD)
    const [creationsGateOpenInUi, setCreationsGateOpenInUi] = useState<boolean>(false);
    const [fittingsGateOpenInUi, setFittingsGateOpenInUi] = useState<boolean>(false);
    const [permissionsNotice, setPermissionsNotice] = useState<string | null>(null);

    // Modal de emisión y entrega única de invitación
    const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
    const [inviteEmail, setInviteEmail] = useState<string>(client.email || '');
    const [expiresInHours, setExpiresInHours] = useState<number>(168);
    const [inviting, setInviting] = useState<boolean>(false);
    const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);
    const [oneTimeDelivery, setOneTimeDelivery] = useState<OneTimeInviteDelivery | null>(null);
    const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

    // Ciclo de vida por fila de invitación (revocar / reemitir)
    const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);
    const [pendingRevokeConfirmId, setPendingRevokeConfirmId] = useState<string | null>(null);
    const [lifecycleNotice, setLifecycleNotice] = useState<string | null>(null);

    const resolveAuthenticatedActorId = useCallback(async (): Promise<string> => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user?.id) {
                return sessionData.session.user.id;
            }
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.id) {
                return userData.user.id;
            }
        } catch {
            // Falla cerrado devolviendo cadena vacía para que el servicio rechace sin actor
        }
        return '';
    }, []);

    const fetchSnapshot = useCallback(async () => {
        const accessData = await fetchClientPortalAccess(client.id);
        const [invs, logs, perms] = await Promise.all([
            fetchClientPortalInvitations(client.id),
            fetchPortalActivityLog(client.id, 15),
            accessData ? fetchPortalPermissions(accessData.id) : Promise.resolve([]),
        ]);
        const modeInfo = getPortalServiceOperatingMode();
        return { accessData, invs, logs, perms, modeInfo };
    }, [client.id]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const snap = await fetchSnapshot();
                if (!active) return;
                setAccess(snap.accessData);
                setInvitations(snap.invs);
                setActivityLogs(snap.logs);
                setPermissions(snap.perms);
                setIsDemoMode(snap.modeInfo.isDemoMode);
                setSupabaseErrorMsg(snap.modeInfo.supabaseError);
            } catch (err: any) {
                if (active) {
                    setPermissionsNotice(
                        'No fue posible consultar los permisos del portal: ' + (err?.message || err)
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [fetchSnapshot]);

    const handleRefreshPortalData = async () => {
        setLifecycleNotice(null);
        setPermissionsNotice(null);
        setRefreshing(true);
        try {
            const snap = await fetchSnapshot();
            setAccess(snap.accessData);
            setInvitations(snap.invs);
            setActivityLogs(snap.logs);
            setPermissions(snap.perms);
            setIsDemoMode(snap.modeInfo.isDemoMode);
            setSupabaseErrorMsg(snap.modeInfo.supabaseError);
        } catch (err: any) {
            setPermissionsNotice(
                'No fue posible actualizar los datos del portal: ' + (err?.message || err)
            );
        } finally {
            setRefreshing(false);
        }
    };

    const syncOperatingModeBanner = () => {
        const modeInfo = getPortalServiceOperatingMode();
        setIsDemoMode(modeInfo.isDemoMode);
        setSupabaseErrorMsg(modeInfo.supabaseError);
    };

    // Alternancia Nivel 1 de módulos estrictamente globales (creation_id = NULL)
    const handleToggleGlobalResourceSwitch = async (
        switchKey: string,
        resource: PortalResource,
        action: PortalAction,
        currentValue: boolean
    ) => {
        if (!access) return;
        const actorId = await resolveAuthenticatedActorId();
        if (!actorId) {
            setPermissionsNotice(
                'Se requiere una sesión autenticada válida para modificar los permisos del portal.'
            );
            return;
        }

        setSavingSwitchKey(switchKey);
        setPermissionsNotice(null);

        try {
            const res = await setPortalPermission({
                portalAccessId: access.id,
                clientId: client.id,
                creationId: null,
                resource,
                action,
                isGranted: !currentValue,
                grantedBy: actorId,
            });
            syncOperatingModeBanner();
            if (res.ok) {
                setPermissions(res.permissions);
            } else {
                setPermissionsNotice(res.message);
                if (Platform.OS !== 'web') {
                    Alert.alert('No se pudo actualizar', res.message);
                }
            }
        } catch (err: any) {
            const msg = 'No fue posible actualizar el permiso: ' + (err?.message || err);
            setPermissionsNotice(msg);
            if (Platform.OS !== 'web') {
                Alert.alert('Error', msg);
            }
        } finally {
            setSavingSwitchKey(null);
        }
    };

    // Compuerta maestra Nivel 1 para Creaciones (NUNCA escribe creations:view con creation_id = NULL)
    const handleToggleCreationsMasterGate = async (currentlyOpen: boolean) => {
        if (!access) return;
        const nextOpen = !currentlyOpen;
        setPermissionsNotice(null);

        if (nextOpen) {
            setCreationsGateOpenInUi(true);
            setPermissionsNotice(
                'Compuerta de Creaciones habilitada en el panel. Activa "Visible" individualmente en cada prenda autorizada (Nivel 2).'
            );
            return;
        }

        setCreationsGateOpenInUi(false);
        setFittingsGateOpenInUi(false);

        const hasGrantedCreationScoped = permissions.some(
            (p) =>
                p.creation_id !== null &&
                p.is_granted &&
                (p.resource === 'creations' ||
                    p.resource === 'sketches' ||
                    p.resource === 'fabrics' ||
                    p.resource === 'fittings')
        );

        if (!hasGrantedCreationScoped) {
            return;
        }

        const actorId = await resolveAuthenticatedActorId();
        if (!actorId) {
            setPermissionsNotice('Sesión requerida para revocar permisos de creaciones.');
            return;
        }

        setSavingSwitchKey('creations_master');
        try {
            const res = await revokeAllCreationScopedPermissions({
                portalAccessId: access.id,
                grantedBy: actorId,
                resources: ['creations', 'sketches', 'fabrics', 'fittings'],
            });
            syncOperatingModeBanner();
            if (res.ok) {
                setPermissions(res.permissions);
            } else {
                setPermissionsNotice(res.message);
            }
        } catch (err: any) {
            setPermissionsNotice('Error revocando permisos por creación: ' + (err?.message || err));
        } finally {
            setSavingSwitchKey(null);
        }
    };

    // Compuerta maestra Nivel 1 para Fittings (opt-in por prenda, revoca filas fittings si se apaga)
    const handleToggleFittingsMasterGate = async (currentlyOpen: boolean) => {
        if (!access) return;
        const nextOpen = !currentlyOpen;
        setPermissionsNotice(null);

        if (nextOpen) {
            setFittingsGateOpenInUi(true);
            setPermissionsNotice(
                'Compuerta de Pruebas/Fitting preparada. Activa "Pruebas / Fitting" en las prendas autorizadas.'
            );
            return;
        }

        setFittingsGateOpenInUi(false);

        const hasGrantedFittings = permissions.some(
            (p) => p.creation_id !== null && p.is_granted && p.resource === 'fittings'
        );
        if (!hasGrantedFittings) {
            return;
        }

        const actorId = await resolveAuthenticatedActorId();
        if (!actorId) {
            setPermissionsNotice('Sesión requerida para revocar permisos de fitting.');
            return;
        }

        setSavingSwitchKey('fittings_master');
        try {
            const res = await revokeAllCreationScopedPermissions({
                portalAccessId: access.id,
                grantedBy: actorId,
                resources: ['fittings'],
            });
            syncOperatingModeBanner();
            if (res.ok) {
                setPermissions(res.permissions);
            } else {
                setPermissionsNotice(res.message);
            }
        } catch (err: any) {
            setPermissionsNotice('Error revocando permisos de fitting: ' + (err?.message || err));
        } finally {
            setSavingSwitchKey(null);
        }
    };

    // Manejo de cambio de estado de acceso (Ciclo de Vida en client_portal_access)
    const handleUpdateStatus = async (newStatus: PortalAccessStatus) => {
        if (!access || access.status === newStatus) return;

        if (newStatus === 'active' && !access.auth_user_id) {
            const msg =
                'No es posible activar manualmente el portal hasta que la clienta acepte su invitación privada y vincule su cuenta.';
            setLifecycleNotice(msg);
            if (Platform.OS !== 'web') {
                Alert.alert('Activación bloqueada', msg);
            }
            return;
        }

        const actorId = await resolveAuthenticatedActorId();
        if (!actorId) {
            const msg =
                'Se requiere una sesión autenticada con UUID válido para modificar el estado del acceso.';
            setLifecycleNotice(msg);
            if (Platform.OS !== 'web') {
                Alert.alert('Sesión requerida', msg);
            }
            return;
        }

        setSavingSwitchKey('status');
        setLifecycleNotice(null);

        try {
            const updated = await updatePortalAccessStatus(client.id, access.id, {
                status: newStatus,
                updatedBy: actorId,
            });
            setAccess(updated);
            syncOperatingModeBanner();
        } catch (err: any) {
            syncOperatingModeBanner();
            const msg = 'No fue posible cambiar el estado de acceso: ' + (err?.message || err);
            setLifecycleNotice(msg);
            if (Platform.OS !== 'web') {
                Alert.alert('Error', msg);
            }
        } finally {
            setSavingSwitchKey(null);
        }
    };

    // Manejo de permisos por creación (Nivel 2: Doble Candado en public.client_portal_permissions)
    const handleToggleCreationPermission = async (
        creationId: string,
        resource: PortalResource,
        action: PortalAction,
        currentValue: boolean
    ) => {
        if (!access) return;
        const actorId = await resolveAuthenticatedActorId();
        if (!actorId) {
            setPermissionsNotice(
                'Se requiere una sesión autenticada con UUID válido para modificar permisos por creación.'
            );
            return;
        }

        const switchLockKey = `${creationId}:${resource}:${action}`;
        const nextValue = !currentValue;
        setSavingSwitchKey(switchLockKey);
        setPermissionsNotice(null);

        try {
            if (resource === 'creations' && action === 'view' && !nextValue) {
                const revRes = await revokeCreationPortalPermissions({
                    portalAccessId: access.id,
                    creationId,
                    grantedBy: actorId,
                    resources: ['creations', 'sketches', 'fabrics', 'fittings'],
                });
                syncOperatingModeBanner();
                if (revRes.ok) {
                    setPermissions(revRes.permissions);
                } else {
                    setPermissionsNotice(revRes.message);
                }
                return;
            }

            const res = await setPortalPermission({
                portalAccessId: access.id,
                clientId: client.id,
                creationId,
                resource,
                action,
                isGranted: nextValue,
                grantedBy: actorId,
            });
            syncOperatingModeBanner();
            if (res.ok) {
                setPermissions(res.permissions);
            } else {
                setPermissionsNotice(res.message);
                if (Platform.OS !== 'web') {
                    Alert.alert('No se pudo actualizar', res.message);
                }
            }
        } catch (err: any) {
            const msg = 'No fue posible actualizar el permiso de la creación: ' + (err?.message || err);
            setPermissionsNotice(msg);
            if (Platform.OS !== 'web') {
                Alert.alert('Error', msg);
            }
        } finally {
            setSavingSwitchKey(null);
        }
    };

    const openInviteModal = () => {
        setInviteEmail(client.email || '');
        setExpiresInHours(168);
        setInviteErrorMsg(null);
        setOneTimeDelivery(null);
        setCopiedFeedback(false);
        setInviteModalVisible(true);
    };

    const handleCloseInviteModal = () => {
        setInviteModalVisible(false);
        setOneTimeDelivery(null);
        setCopiedFeedback(false);
        setInviteErrorMsg(null);
    };

    const applyInvitationResultToState = (
        result: IssuePortalInvitationResult,
        isReissue: boolean,
        revokedPreviousId: string | null = null
    ) => {
        syncOperatingModeBanner();
        if (result.portalAccess) {
            setAccess(result.portalAccess);
        }

        if (result.ok && result.invitation) {
            const issuedInvite = result.invitation;
            setInvitations((prev) => {
                const updatedPrev = revokedPreviousId
                    ? prev.map((item) =>
                        item.id === revokedPreviousId
                            ? { ...item, status: 'revoked' as PortalInvitationStatus, lease_until: null }
                            : item
                    )
                    : prev;
                return [issuedInvite, ...updatedPrev.filter((item) => item.id !== issuedInvite.id)];
            });

            if (result.oneTimeInviteUrl) {
                setOneTimeDelivery({
                    invitationId: issuedInvite.id,
                    inviteUrl: result.oneTimeInviteUrl,
                    email: issuedInvite.email,
                    expiresAt: issuedInvite.expires_at,
                    message: result.message,
                    isReissue,
                    emailStatus: result.oneTimeToken ? 'dispatching' : 'failed',
                    emailNotice: result.oneTimeToken
                        ? 'Solicitando despacho de correo vía Edge Function SMTP...'
                        : 'Enlace disponible para entrega privada directa.',
                });
                setLifecycleNotice(null);

                // Paso desacoplado post-commit: un fallo SMTP jamás invalida la invitación emitida
                if (result.oneTimeToken) {
                    const tokenForDispatch = result.oneTimeToken;
                    const inviteUrlForDispatch = result.oneTimeInviteUrl;
                    void dispatchPortalInvitationEmailViaEdge({
                        invitationId: issuedInvite.id,
                        token: tokenForDispatch,
                        inviteUrl: inviteUrlForDispatch,
                        recipientName: client.full_name,
                    }).then((dispatchRes) => {
                        setOneTimeDelivery((prev) => {
                            if (!prev || prev.invitationId !== issuedInvite.id) return prev;
                            return {
                                ...prev,
                                emailStatus: dispatchRes.status,
                                emailNotice: dispatchRes.message,
                            };
                        });
                    });
                }
            }
            return;
        }

        const errText = result.message;
        setInviteErrorMsg(errText);
        if (result.outcome === 'backend_unavailable') {
            setLifecycleNotice(errText);
        }
    };

    // Emisión criptográfica controlada (jamás fabrica enlaces en DEMO)
    const handleSendInvitation = async () => {
        setInviteErrorMsg(null);
        setInviting(true);
        try {
            const actorId = await resolveAuthenticatedActorId();
            const result = await issuePortalInvitation({
                clientId: client.id,
                clientEmail: inviteEmail.trim(),
                invitedBy: actorId,
                expiresInHours,
            });
            applyInvitationResultToState(result, false);
        } catch (err: any) {
            setInviteErrorMsg('No fue posible emitir la invitación: ' + (err?.message || err));
        } finally {
            setInviting(false);
        }
    };

    const handleConfirmRevokeInvitation = async (invitationId: string) => {
        setActingInvitationId(invitationId);
        setLifecycleNotice(null);
        try {
            const result = await revokePortalInvitation(invitationId, client.id);
            syncOperatingModeBanner();
            setPendingRevokeConfirmId(null);

            if (result.ok && result.invitation) {
                const updatedInvite = result.invitation;
                setInvitations((prev) =>
                    prev.map((item) => (item.id === updatedInvite.id ? updatedInvite : item))
                );
                setLifecycleNotice(result.message);
            } else {
                if (result.invitation) {
                    const freshRow = result.invitation;
                    setInvitations((prev) =>
                        prev.map((item) => (item.id === freshRow.id ? freshRow : item))
                    );
                }
                setLifecycleNotice(result.message);
            }
        } catch (err: any) {
            setLifecycleNotice('Error al revocar invitación: ' + (err?.message || err));
        } finally {
            setActingInvitationId(null);
        }
    };

    const handleReissueInvitation = async (inv: ClientPortalInvitation) => {
        setActingInvitationId(inv.id);
        setLifecycleNotice(null);
        setPendingRevokeConfirmId(null);
        try {
            const actorId = await resolveAuthenticatedActorId();
            const result = await reissuePortalInvitation(inv.id, {
                clientId: client.id,
                clientEmail: inv.email,
                invitedBy: actorId,
                expiresInHours: 168,
            });

            if (result.ok && result.invitation && result.oneTimeInviteUrl) {
                setInviteEmail(inv.email);
                setInviteErrorMsg(null);
                setCopiedFeedback(false);
                applyInvitationResultToState(result, true, result.revokedPreviousInvitationId);
                setInviteModalVisible(true);
            } else {
                syncOperatingModeBanner();
                setLifecycleNotice(result.message);
            }
        } catch (err: any) {
            setLifecycleNotice('No fue posible reemitir la invitación: ' + (err?.message || err));
        } finally {
            setActingInvitationId(null);
        }
    };

    const handleCopyInviteUrl = async () => {
        if (!oneTimeDelivery?.inviteUrl) return;
        const url = oneTimeDelivery.inviteUrl;

        if (
            Platform.OS === 'web' &&
            typeof navigator !== 'undefined' &&
            navigator.clipboard?.writeText
        ) {
            try {
                await navigator.clipboard.writeText(url);
                setCopiedFeedback(true);
                return;
            } catch {
                // Continúa con Share fallback
            }
        }

        try {
            await Share.share({
                message: `Invitación privada a tu Portal Atelier Digital (${oneTimeDelivery.email}): ${url}`,
            });
            setCopiedFeedback(true);
        } catch {
            setCopiedFeedback(false);
        }
    };

    const getStatusBadgeStyle = (status: PortalAccessStatus | 'unprovisioned') => {
        switch (status) {
            case 'active':
                return { bg: '#E8F5E9', text: '#2E7D32', label: 'ACTIVO' };
            case 'invited':
                return { bg: '#FFF8E7', text: '#B37D14', label: 'INVITACIÓN PENDIENTE' };
            case 'suspended':
                return { bg: '#F0F0F0', text: '#666666', label: 'SUSPENDIDO' };
            case 'revoked':
                return { bg: '#FAF2F2', text: '#9E3B3B', label: 'REVOCADO' };
            case 'unprovisioned':
                return { bg: '#F4F1ED', text: '#7A6F64', label: 'SIN INVITACIÓN EMITIDA' };
            default:
                return { bg: '#F0F0F0', text: '#666666', label: status };
        }
    };

    if (loading) {
        return (
            <View style={localStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.champagneGold} />
                <Text style={localStyles.loadingText}>Cargando centro de control de permisos...</Text>
            </View>
        );
    }

    const statusBadge = getStatusBadgeStyle(access ? access.status : 'unprovisioned');
    const latestAcceptedInvite = invitations.find(
        (inv) => inv.status === 'accepted' && Boolean(inv.used_at)
    );
    const canActivatePortal = Boolean(access?.auth_user_id);

    const permissionsProjection = buildPortalPermissionsProjection({
        access,
        permissions,
        creationIds: creations.map((c) => c.id),
        requireActiveAccess: false,
    });
    const isCreationsGateOpen =
        permissionsProjection.creationModules.hasAnyVisibleCreation || creationsGateOpenInUi;
    const isFittingsGateOpen =
        permissionsProjection.creationModules.hasAnyVisibleFittings || fittingsGateOpenInUi;

    return (
        <View style={localStyles.tabContainer}>
            {/* 1. Banner Distintivo de Modo DEMO / Producción */}
            {isDemoMode && (
                <View style={localStyles.demoBanner}>
                    <View style={localStyles.demoBadge}>
                        <Text style={localStyles.demoBadgeText}>MODO DEMO · SIMULACIÓN LOCAL EN MEMORIA</Text>
                    </View>
                    <Text style={localStyles.demoBannerTitle}>
                        Gobernanza de Permisos en Entorno de Pruebas
                    </Text>
                    <Text style={localStyles.demoBannerText}>
                        La migración DDL oficial de M09-A (20261118000000_client_portal_m09.sql) se encuentra
                        en espera de revisión y autorización expresa por Katherine Carroll. La interfaz opera
                        con persistencia defensiva en memoria, garantizando cero mutaciones en Supabase remoto.
                    </Text>
                    {supabaseErrorMsg && (
                        <View style={localStyles.demoErrorPill}>
                            <Text style={localStyles.demoErrorText}>{supabaseErrorMsg}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* 2. Tarjeta de Estado de Vinculación y Ciclo de Vida */}
            <View style={[localStyles.card, isMobile && localStyles.cardMobile]}>
                <View style={localStyles.cardHeaderRow}>
                    <View
                        style={[
                            localStyles.cardHeaderTitleCol,
                            isMobile && localStyles.cardHeaderTitleColMobile,
                        ]}
                    >
                        <Text style={localStyles.cardEyebrow}>IDENTIDAD Y ACCESO DIGITAL</Text>
                        <Text style={localStyles.cardTitle}>Estado de Vinculación de la Clienta</Text>
                    </View>
                    <View style={localStyles.headerRightGroup}>
                        <TouchableOpacity
                            style={localStyles.refreshBtn}
                            onPress={handleRefreshPortalData}
                            disabled={refreshing}
                            activeOpacity={0.8}
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" color={colors.atelierBlack} />
                            ) : (
                                <Text style={localStyles.refreshBtnText}>↻ Actualizar</Text>
                            )}
                        </TouchableOpacity>
                        <View style={[localStyles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[localStyles.statusBadgeText, { color: statusBadge.text }]}>
                                {statusBadge.label}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={localStyles.divider} />

                <View style={[localStyles.identityRow, isMobile && localStyles.identityRowMobile]}>
                    <View style={[localStyles.identityCol, isMobile && localStyles.identityColMobile]}>
                        <Text style={localStyles.metaLabel}>Clienta Titular:</Text>
                        <Text style={localStyles.metaValue}>{client.full_name}</Text>
                    </View>
                    <View style={[localStyles.identityCol, isMobile && localStyles.identityColMobile]}>
                        <Text style={localStyles.metaLabel}>Correo Electrónico:</Text>
                        <Text style={localStyles.metaValue}>{client.email || 'No registrado'}</Text>
                    </View>
                    <View style={[localStyles.identityCol, isMobile && localStyles.identityColMobile]}>
                        <Text style={localStyles.metaLabel}>Cuenta Vinculada (Auth):</Text>
                        <Text
                            style={[
                                localStyles.metaValue,
                                access?.auth_user_id ? localStyles.boundValueText : localStyles.unboundValueText,
                            ]}
                        >
                            {access?.auth_user_id
                                ? `Vinculada ✓ (···${access.auth_user_id.slice(-6)})`
                                : 'Pendiente de aceptación'}
                        </Text>
                    </View>
                    <View style={[localStyles.identityCol, isMobile && localStyles.identityColMobile]}>
                        <Text style={localStyles.metaLabel}>Aceptación Confirmada:</Text>
                        <Text style={localStyles.metaValue}>
                            {latestAcceptedInvite?.used_at
                                ? formatDate(latestAcceptedInvite.used_at)
                                : access?.auth_user_id
                                    ? formatDate(access.updated_at)
                                    : 'Aún no aceptada'}
                        </Text>
                    </View>
                </View>

                {/* Acciones de Estado del Portal */}
                {access && (
                    <View style={localStyles.statusActionsContainer}>
                        <Text style={localStyles.statusActionLabel}>Cambiar Estado de Acceso:</Text>
                        <View
                            style={[
                                localStyles.statusButtonsRow,
                                isMobile && localStyles.statusButtonsRowMobile,
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    localStyles.statusBtn,
                                    isMobile && localStyles.statusBtnMobile,
                                    access.status === 'active' && localStyles.statusBtnActive,
                                    !canActivatePortal && localStyles.statusBtnDisabled,
                                ]}
                                onPress={() => handleUpdateStatus('active')}
                                disabled={!canActivatePortal || savingSwitchKey === 'status'}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        localStyles.statusBtnText,
                                        access.status === 'active' && localStyles.statusBtnTextActive,
                                        !canActivatePortal && localStyles.statusBtnTextDisabled,
                                    ]}
                                >
                                    Activar Acceso
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    localStyles.statusBtn,
                                    isMobile && localStyles.statusBtnMobile,
                                    access.status === 'suspended' && localStyles.statusBtnActive,
                                ]}
                                onPress={() => handleUpdateStatus('suspended')}
                                disabled={savingSwitchKey === 'status'}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        localStyles.statusBtnText,
                                        access.status === 'suspended' && localStyles.statusBtnTextActive,
                                    ]}
                                >
                                    Suspender
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    localStyles.statusBtn,
                                    isMobile && localStyles.statusBtnMobile,
                                    access.status === 'revoked' && localStyles.statusBtnActive,
                                ]}
                                onPress={() => handleUpdateStatus('revoked')}
                                disabled={savingSwitchKey === 'status'}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        localStyles.statusBtnText,
                                        access.status === 'revoked' && localStyles.statusBtnTextActive,
                                    ]}
                                >
                                    Revocar
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {!canActivatePortal && (
                            <Text style={localStyles.orphanGuardNote}>
                                La activación manual se habilita únicamente cuando la clienta acepta su invitación y vincula su cuenta.
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {/* 3. Interruptores de Visibilidad Modular (Nivel 1 — Única Fuente de Verdad: client_portal_permissions) */}
            <View style={[localStyles.card, isMobile && localStyles.cardMobile]}>
                <View style={localStyles.cardHeaderRow}>
                    <View
                        style={[
                            localStyles.cardHeaderTitleCol,
                            isMobile && localStyles.cardHeaderTitleColMobile,
                        ]}
                    >
                        <Text style={localStyles.cardEyebrow}>NIVEL 1 · AUTORIZACIÓN GENERAL</Text>
                        <Text style={localStyles.cardTitle}>Interruptores de Visibilidad Modular</Text>
                    </View>
                    <View style={localStyles.zeroTrustBadge}>
                        <Text style={localStyles.zeroTrustBadgeText}>ZERO TRUST · DEFAULT FALSE</Text>
                    </View>
                </View>

                <Text style={localStyles.sectionExplainer}>
                    Por defecto, la clienta no tiene visibilidad sobre ningún componente hasta que Katherine Carroll
                    lo autorice expresamente sobre el registro normalizado en client_portal_permissions:
                </Text>

                {permissionsNotice && (
                    <View style={localStyles.lifecycleNoticeBox}>
                        <Text style={localStyles.lifecycleNoticeText}>{permissionsNotice}</Text>
                    </View>
                )}

                <View style={localStyles.divider} />

                {/* Switch 1: Compuerta Creaciones */}
                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>1. Colección de Creaciones y Vestuario</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Habilita la curaduría por prenda en el Nivel 2 (las creaciones exigen autorización individual explícita).
                        </Text>
                    </View>
                    <Switch
                        value={isCreationsGateOpen}
                        onValueChange={() => handleToggleCreationsMasterGate(isCreationsGateOpen)}
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'creations_master'}
                    />
                </View>

                {/* Switch 2: Medidas */}
                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>2. Ficha Antropométrica y Medidas</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Permite consultar los valores anatómicos y sesiones de toma de medidas registradas.
                        </Text>
                    </View>
                    <Switch
                        value={permissionsProjection.globalModules.measurementsView}
                        onValueChange={() =>
                            handleToggleGlobalResourceSwitch(
                                'measurements:view',
                                'measurements',
                                'view',
                                permissionsProjection.globalModules.measurementsView
                            )
                        }
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'measurements:view'}
                    />
                </View>

                {/* Switch 3: Cotizaciones */}
                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>3. Presupuesto y Cotización Aprobada (M03)</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Expone el resumen económico y cronograma acordado de pagos (sin pasarelas ni cobros web).
                        </Text>
                    </View>
                    <Switch
                        value={permissionsProjection.globalModules.quotationsView}
                        onValueChange={() =>
                            handleToggleGlobalResourceSwitch(
                                'quotations:view',
                                'quotations',
                                'view',
                                permissionsProjection.globalModules.quotationsView
                            )
                        }
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'quotations:view'}
                    />
                </View>

                {/* Switch 4: Agenda */}
                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>4. Citas y Agenda del Atelier (M08)</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Visualización de fechas reservadas, lugar y horario oficial de Colombia (-05:00).
                        </Text>
                    </View>
                    <Switch
                        value={permissionsProjection.globalModules.appointmentsView}
                        onValueChange={() =>
                            handleToggleGlobalResourceSwitch(
                                'appointments:view',
                                'appointments',
                                'view',
                                permissionsProjection.globalModules.appointmentsView
                            )
                        }
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'appointments:view'}
                    />
                </View>

                {/* Switch 5: Compuerta Fittings */}
                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>5. Sesiones de Prueba y Ajuste (Fitting M06)</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Habilita el seguimiento técnico por prenda a pruebas de hilván, estructura y caída.
                        </Text>
                    </View>
                    <Switch
                        value={isFittingsGateOpen}
                        onValueChange={() => handleToggleFittingsMasterGate(isFittingsGateOpen)}
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'fittings_master'}
                    />
                </View>

                <View style={localStyles.divider} />

                {/* Extensibilidad Fases Futuras */}
                <Text style={localStyles.subSectionHeader}>EXTENSIBILIDAD DE INTERACCIÓN (FASES M09-C / M09-D)</Text>

                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>Aprobación Interactiva de Bocetos (M09-C)</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Habilita el visto bueno digital sobre ilustraciones de diseño (`sketches:approve`).
                        </Text>
                    </View>
                    <Switch
                        value={permissionsProjection.globalModules.sketchesApprove}
                        onValueChange={() =>
                            handleToggleGlobalResourceSwitch(
                                'sketches:approve',
                                'sketches',
                                'approve',
                                permissionsProjection.globalModules.sketchesApprove
                            )
                        }
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'sketches:approve'}
                    />
                </View>

                <View style={localStyles.switchRow}>
                    <View style={localStyles.switchInfoCol}>
                        <Text style={localStyles.switchTitle}>Canal de Mensajería Editorial (M09-D)</Text>
                        <Text style={localStyles.switchSubtitle}>
                            Habilita el hilo de notas y observaciones directas (`messaging:observe`).
                        </Text>
                    </View>
                    <Switch
                        value={permissionsProjection.globalModules.messagingObserve}
                        onValueChange={() =>
                            handleToggleGlobalResourceSwitch(
                                'messaging:observe',
                                'messaging',
                                'observe',
                                permissionsProjection.globalModules.messagingObserve
                            )
                        }
                        trackColor={{ false: colors.border, true: colors.champagneGold }}
                        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                        disabled={!access || savingSwitchKey === 'messaging:observe'}
                    />
                </View>
            </View>

            {/* 4. Doble Candado por Creación (Nivel 2 de Autorización) */}
            <View style={[localStyles.card, isMobile && localStyles.cardMobile]}>
                <View style={localStyles.cardHeaderRow}>
                    <View
                        style={[
                            localStyles.cardHeaderTitleCol,
                            isMobile && localStyles.cardHeaderTitleColMobile,
                        ]}
                    >
                        <Text style={localStyles.cardEyebrow}>NIVEL 2 · DOBLE CANDADO POR PRENDA</Text>
                        <Text style={localStyles.cardTitle}>Permisos Granulares por Creación</Text>
                    </View>
                    <View style={localStyles.doubleLockBadge}>
                        <Text style={localStyles.doubleLockBadgeText}>DOBLE CANDADO ACTIVO</Text>
                    </View>
                </View>

                <Text style={localStyles.sectionExplainer}>
                    Cada prenda requiere autorización explícita (`creation_id` específico en `client_portal_permissions`).
                    La activación de una creación jamás abre otras prendas actuales ni futuras:
                </Text>

                {!isCreationsGateOpen && (
                    <View style={localStyles.warningBox}>
                        <Text style={localStyles.warningText}>
                            ⚠️ Ninguna prenda tiene visibilidad concedida actualmente. Enciende la compuerta de
                            Creaciones en el Nivel 1 o autoriza directamente las prendas individuales a continuación.
                        </Text>
                    </View>
                )}

                <View style={localStyles.divider} />

                {creations.length === 0 ? (
                    <Text style={localStyles.emptyText}>
                        No hay creaciones de alta costura registradas para esta clienta.
                    </Text>
                ) : (
                    creations.map((creation) => {
                        const creationProj = permissionsProjection.byCreationId[creation.id];
                        const isVisible = creationProj?.canViewCreation ?? false;
                        const allowSketches = creationProj?.canViewSketches ?? false;
                        const allowFabrics = creationProj?.canViewFabrics ?? false;
                        const allowFittings = creationProj?.canViewFittings ?? false;

                        return (
                            <View key={creation.id} style={localStyles.creationCard}>
                                <View
                                    style={[
                                        localStyles.creationHeaderRow,
                                        isMobile && localStyles.creationHeaderRowMobile,
                                    ]}
                                >
                                    <View style={localStyles.creationTitleCol}>
                                        <Text style={localStyles.creationTitle}>{creation.name}</Text>
                                        <Text style={localStyles.creationSub}>
                                            Tipo: {creation.garment_type || 'Alta Costura'} · Estado: {creation.status}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            localStyles.creationMasterSwitch,
                                            isMobile && localStyles.creationMasterSwitchMobile,
                                        ]}
                                    >
                                        <Text style={localStyles.masterSwitchLabel}>Visible:</Text>
                                        <Switch
                                            value={isVisible}
                                            onValueChange={() =>
                                                handleToggleCreationPermission(
                                                    creation.id,
                                                    'creations',
                                                    'view',
                                                    isVisible
                                                )
                                            }
                                            trackColor={{ false: colors.border, true: colors.champagneGold }}
                                            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                                            disabled={
                                                !access || savingSwitchKey === `${creation.id}:creations:view`
                                            }
                                        />
                                    </View>
                                </View>

                                {/* Sub-interruptores canónicos de la prenda (solo activos si isVisible es true) */}
                                <View
                                    style={[
                                        localStyles.subSwitchesRow,
                                        isMobile && localStyles.subSwitchesRowMobile,
                                        !isVisible && { opacity: 0.45 },
                                    ]}
                                >
                                    <View
                                        style={[
                                            localStyles.subSwitchItem,
                                            isMobile && localStyles.subSwitchItemMobile,
                                        ]}
                                    >
                                        <Text style={localStyles.subSwitchLabel}>Bocetos:</Text>
                                        <Switch
                                            value={allowSketches}
                                            onValueChange={() =>
                                                handleToggleCreationPermission(
                                                    creation.id,
                                                    'sketches',
                                                    'view',
                                                    allowSketches
                                                )
                                            }
                                            disabled={
                                                !access ||
                                                !isVisible ||
                                                savingSwitchKey === `${creation.id}:sketches:view`
                                            }
                                            trackColor={{ false: colors.border, true: colors.champagneGold }}
                                        />
                                    </View>

                                    <View
                                        style={[
                                            localStyles.subSwitchItem,
                                            isMobile && localStyles.subSwitchItemMobile,
                                        ]}
                                    >
                                        <Text style={localStyles.subSwitchLabel}>Telas / Materiales:</Text>
                                        <Switch
                                            value={allowFabrics}
                                            onValueChange={() =>
                                                handleToggleCreationPermission(
                                                    creation.id,
                                                    'fabrics',
                                                    'view',
                                                    allowFabrics
                                                )
                                            }
                                            disabled={
                                                !access ||
                                                !isVisible ||
                                                savingSwitchKey === `${creation.id}:fabrics:view`
                                            }
                                            trackColor={{ false: colors.border, true: colors.champagneGold }}
                                        />
                                    </View>

                                    <View
                                        style={[
                                            localStyles.subSwitchItem,
                                            isMobile && localStyles.subSwitchItemMobile,
                                        ]}
                                    >
                                        <Text style={localStyles.subSwitchLabel}>Pruebas / Fitting:</Text>
                                        <Switch
                                            value={allowFittings}
                                            onValueChange={() =>
                                                handleToggleCreationPermission(
                                                    creation.id,
                                                    'fittings',
                                                    'view',
                                                    allowFittings
                                                )
                                            }
                                            disabled={
                                                !access ||
                                                !isVisible ||
                                                savingSwitchKey === `${creation.id}:fittings:view`
                                            }
                                            trackColor={{ false: colors.border, true: colors.champagneGold }}
                                        />
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {/* 5. Emisión y Ciclo de Vida de Invitaciones Criptográficas */}
            <View style={[localStyles.card, isMobile && localStyles.cardMobile]}>
                <View style={localStyles.cardHeaderRow}>
                    <View
                        style={[
                            localStyles.cardHeaderTitleCol,
                            isMobile && localStyles.cardHeaderTitleColMobile,
                        ]}
                    >
                        <Text style={localStyles.cardEyebrow}>INVITACIONES CRIPTOGRÁFICAS (ZERO-KNOWLEDGE)</Text>
                        <Text style={localStyles.cardTitle}>Historial de Invitaciones al Portal</Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            localStyles.inviteButton,
                            isMobile && localStyles.inviteButtonMobile,
                        ]}
                        onPress={openInviteModal}
                        activeOpacity={0.8}
                    >
                        <Text style={localStyles.inviteButtonText}>+ Emitir Invitación</Text>
                    </TouchableOpacity>
                </View>

                <Text style={localStyles.sectionExplainer}>
                    Cada invitación genera un token criptográfico de 256 bits en memoria y almacena exclusivamente su hash
                    SHA-256 en backend autorizado. El envío automático de correos permanece pendiente de Edge Function;
                    entrega el enlace único generado por tu canal privado.
                </Text>

                {lifecycleNotice && (
                    <View style={localStyles.lifecycleNoticeBox}>
                        <Text style={localStyles.lifecycleNoticeText}>{lifecycleNotice}</Text>
                    </View>
                )}

                <View style={localStyles.divider} />

                {invitations.length === 0 ? (
                    <Text style={localStyles.emptyText}>
                        No hay invitaciones registradas previamente para esta clienta.
                    </Text>
                ) : (
                    invitations.map((inv) => {
                        const displayStatus = resolveInvitationDisplayStatus(inv);
                        const meta = INVITATION_STATUS_META[displayStatus];
                        const isBusy = actingInvitationId === inv.id;
                        const canRevoke = displayStatus === 'pending';
                        const canReissue =
                            displayStatus === 'pending' ||
                            displayStatus === 'expired' ||
                            displayStatus === 'revoked' ||
                            displayStatus === 'failed';
                        const isConfirmingRevoke = pendingRevokeConfirmId === inv.id;

                        return (
                            <View key={inv.id} style={localStyles.invitationItemBlock}>
                                <View style={localStyles.invitationRow}>
                                    <View style={localStyles.invitationInfoCol}>
                                        <Text style={localStyles.invitationEmail}>{inv.email}</Text>
                                        <Text style={localStyles.invitationMeta}>
                                            Emitida: {formatDate(inv.created_at)} · Caduca: {formatDate(inv.expires_at)}
                                            {inv.used_at ? ` · Aceptada: ${formatDate(inv.used_at)}` : ''}
                                        </Text>
                                        {displayStatus === 'processing' && inv.lease_until && (
                                            <Text style={localStyles.invitationSubNote}>
                                                Reserva temporal Saga hasta: {formatDate(inv.lease_until)}
                                            </Text>
                                        )}
                                        {inv.failure_reason && (
                                            <Text style={localStyles.invitationFailureText}>
                                                Motivo registrado: {inv.failure_reason}
                                            </Text>
                                        )}
                                    </View>
                                    <View
                                        style={[
                                            localStyles.invitationBadge,
                                            {
                                                backgroundColor: meta.bg,
                                                borderColor: meta.border,
                                                borderWidth: 1,
                                            },
                                        ]}
                                    >
                                        <Text style={[localStyles.invitationBadgeText, { color: meta.text }]}>
                                            {meta.label}
                                        </Text>
                                    </View>
                                </View>

                                {(canRevoke || canReissue) && (
                                    <View style={localStyles.invitationActionsRow}>
                                        {canRevoke && !isConfirmingRevoke && (
                                            <TouchableOpacity
                                                style={localStyles.revokeBtn}
                                                onPress={() => setPendingRevokeConfirmId(inv.id)}
                                                disabled={isBusy}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={localStyles.revokeBtnText}>Revocar</Text>
                                            </TouchableOpacity>
                                        )}

                                        {canReissue && !isConfirmingRevoke && (
                                            <TouchableOpacity
                                                style={localStyles.reissueBtn}
                                                onPress={() => handleReissueInvitation(inv)}
                                                disabled={isBusy}
                                                activeOpacity={0.8}
                                            >
                                                {isBusy ? (
                                                    <ActivityIndicator size="small" color={colors.atelierBlack} />
                                                ) : (
                                                    <Text style={localStyles.reissueBtnText}>Reemitir enlace</Text>
                                                )}
                                            </TouchableOpacity>
                                        )}

                                        {isConfirmingRevoke && (
                                            <View style={localStyles.confirmRevokeBar}>
                                                <Text style={localStyles.confirmRevokeLabel}>
                                                    ¿Invalidar este enlace?
                                                </Text>
                                                <TouchableOpacity
                                                    style={localStyles.confirmRevokeActionBtn}
                                                    onPress={() => handleConfirmRevokeInvitation(inv.id)}
                                                    disabled={isBusy}
                                                    activeOpacity={0.8}
                                                >
                                                    {isBusy ? (
                                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                                    ) : (
                                                        <Text style={localStyles.confirmRevokeActionText}>
                                                            Confirmar
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={localStyles.cancelRevokeBtn}
                                                    onPress={() => setPendingRevokeConfirmId(null)}
                                                    disabled={isBusy}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={localStyles.cancelRevokeText}>Cancelar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </View>

            {/* 6. Bitácora Inmutable de Actividad (client_portal_activity_log) */}
            <View style={[localStyles.card, isMobile && localStyles.cardMobile]}>
                <View style={localStyles.cardHeaderRow}>
                    <View
                        style={[
                            localStyles.cardHeaderTitleCol,
                            isMobile && localStyles.cardHeaderTitleColMobile,
                        ]}
                    >
                        <Text style={localStyles.cardEyebrow}>BITÁCORA INMUTABLE DE ACTIVIDAD (M09-A v2.10)</Text>
                        <Text style={localStyles.cardTitle}>Eventos de Vinculación y Uso</Text>
                    </View>
                </View>

                <View style={localStyles.divider} />

                {activityLogs.length === 0 ? (
                    <Text style={localStyles.emptyText}>
                        No se registran eventos recientes en la bitácora de actividad para esta clienta.
                    </Text>
                ) : (
                    activityLogs.map((log) => {
                        const isAcceptedEvent = log.event_type === 'invitation_accepted';
                        const friendlyTitle = ACTIVITY_EVENT_LABELS[log.event_type] || log.event_type;
                        return (
                            <View key={log.id} style={localStyles.auditRow}>
                                <View
                                    style={[
                                        localStyles.auditCategoryDot,
                                        isAcceptedEvent && { backgroundColor: '#2E7D32' },
                                    ]}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={localStyles.auditEventType}>{friendlyTitle}</Text>
                                    <Text style={localStyles.auditMeta}>
                                        Evento: {log.event_type} · Categoría: {log.category} · Origen: {log.origin} ·{' '}
                                        {formatDate(log.created_at)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {/* MODAL PARA EMISIÓN CRIPTOGRÁFICA Y ENTREGA ÚNICA */}
            <Modal
                visible={inviteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseInviteModal}
            >
                <View
                    style={[
                        localStyles.modalOverlay,
                        isMobile && localStyles.modalOverlayMobile,
                    ]}
                >
                    <View
                        style={[
                            localStyles.modalContent,
                            isMobile && localStyles.modalContentMobile,
                        ]}
                    >
                        <ScrollView
                            style={localStyles.modalScroll}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                        {oneTimeDelivery ? (
                            <>
                                <Text style={localStyles.modalEyebrow}>
                                    {oneTimeDelivery.isReissue
                                        ? 'ENLACE REEMITIDO (USO ÚNICO)'
                                        : 'INVITACIÓN EMITIDA (USO ÚNICO)'}
                                </Text>
                                <Text style={localStyles.modalTitle}>Entrega Privada a la Clienta</Text>

                                <View style={localStyles.oneTimeWarningBox}>
                                    <Text style={localStyles.oneTimeWarningTitle}>
                                        Visible una sola vez por seguridad Zero-Knowledge
                                    </Text>
                                    <Text style={localStyles.oneTimeWarningText}>
                                        Solo se guardó el hash SHA-256 en el servidor. Al cerrar esta ventana, el
                                        enlace desaparecerá y no podrá recuperarse sin reemitir uno nuevo.
                                    </Text>
                                </View>

                                <Text style={localStyles.inputLabel}>
                                    Destinataria: {oneTimeDelivery.email} · Vence:{' '}
                                    {formatDate(oneTimeDelivery.expiresAt)}
                                </Text>

                                <View style={localStyles.oneTimeUrlBox}>
                                    <Text selectable style={localStyles.oneTimeUrlText}>
                                        {oneTimeDelivery.inviteUrl}
                                    </Text>
                                </View>

                                <Text style={localStyles.pendingEmailNote}>
                                    {oneTimeDelivery.emailNotice ||
                                        'Comparte este enlace directamente por tu canal privado con la clienta si el correo automático está deshabilitado.'}
                                </Text>

                                <View
                                    style={[
                                        localStyles.modalActionsRow,
                                        isMobile && localStyles.modalActionsRowMobile,
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={[
                                            localStyles.copyUrlBtn,
                                            isMobile && localStyles.modalBtnMobile,
                                        ]}
                                        onPress={handleCopyInviteUrl}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={localStyles.copyUrlBtnText}>
                                            {copiedFeedback ? '✓ Enlace Copiado / Compartido' : 'Copiar o Compartir Enlace'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            localStyles.confirmModalBtn,
                                            isMobile && localStyles.modalBtnMobile,
                                        ]}
                                        onPress={handleCloseInviteModal}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={localStyles.confirmModalBtnText}>
                                            Cerrar y Limpiar Enlace
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={localStyles.modalEyebrow}>INVITACIÓN AL PORTAL DE CLIENTAS</Text>
                                <Text style={localStyles.modalTitle}>Emitir Acceso Digital Exclusivo</Text>

                                <Text style={localStyles.modalExplainer}>
                                    {isDemoMode
                                        ? 'Entorno actual en MODO DEMO (tablas M09-A no desplegadas en remoto). Al intentar emitir, no se generará ningún token criptográfico ni enlace /portal/invite simulado.'
                                        : 'Se generará un token aleatorio de 256 bits y se almacenará únicamente su hash SHA-256 en Supabase. Podrás copiar el enlace privado una única vez al finalizar.'}
                                </Text>

                                <Text style={localStyles.inputLabel}>Correo Electrónico de la Clienta:</Text>
                                <TextInput
                                    style={localStyles.textInput}
                                    value={inviteEmail}
                                    onChangeText={setInviteEmail}
                                    placeholder="ejemplo@clienta.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <Text style={localStyles.inputLabel}>Vigencia del Enlace:</Text>
                                <View style={localStyles.expiryChipsRow}>
                                    {[
                                        { hours: 24, label: '24 horas' },
                                        { hours: 168, label: '7 días' },
                                        { hours: 336, label: '14 días' },
                                    ].map((opt) => (
                                        <TouchableOpacity
                                            key={opt.hours}
                                            style={[
                                                localStyles.expiryChip,
                                                expiresInHours === opt.hours && localStyles.expiryChipActive,
                                            ]}
                                            onPress={() => setExpiresInHours(opt.hours)}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    localStyles.expiryChipText,
                                                    expiresInHours === opt.hours &&
                                                    localStyles.expiryChipTextActive,
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {inviteErrorMsg && (
                                    <View style={localStyles.modalErrorBox}>
                                        <Text style={localStyles.modalErrorText}>{inviteErrorMsg}</Text>
                                    </View>
                                )}

                                <View
                                    style={[
                                        localStyles.modalActionsRow,
                                        isMobile && localStyles.modalActionsRowMobile,
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={[
                                            localStyles.cancelModalBtn,
                                            isMobile && localStyles.modalBtnMobile,
                                        ]}
                                        onPress={handleCloseInviteModal}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={localStyles.cancelModalBtnText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            localStyles.confirmModalBtn,
                                            isMobile && localStyles.modalBtnMobile,
                                        ]}
                                        onPress={handleSendInvitation}
                                        disabled={inviting}
                                        activeOpacity={0.8}
                                    >
                                        {inviting ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={localStyles.confirmModalBtnText}>
                                                Generar Invitación
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const localStyles = StyleSheet.create({
    tabContainer: {
        marginBottom: 32,
    },
    loadingContainer: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        color: colors.textSecondary,
        fontFamily: typography.sans,
    },
    demoBanner: {
        backgroundColor: '#FFFDF9',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    demoBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3E5D8',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 8,
    },
    demoBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A5D10',
        letterSpacing: 0.5,
    },
    demoBannerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
        fontFamily: typography.serif,
    },
    demoBannerText: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.textSecondary,
        fontFamily: typography.sans,
    },
    demoErrorPill: {
        marginTop: 8,
        backgroundColor: '#FAF2F2',
        borderWidth: 1,
        borderColor: '#E8C5C5',
        borderRadius: 4,
        padding: 6,
    },
    demoErrorText: {
        fontSize: 11,
        color: '#9E3B3B',
        fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    },
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 18,
        marginBottom: 16,
    },
    cardMobile: {
        padding: 14,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 10,
    },
    cardHeaderTitleCol: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 200,
    },
    cardHeaderTitleColMobile: {
        minWidth: 0,
        width: '100%',
    },
    headerRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    refreshBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAF8F4',
    },
    refreshBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    boundValueText: {
        color: '#2E7D32',
    },
    unboundValueText: {
        color: '#8A5D10',
    },
    cardEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    zeroTrustBadge: {
        backgroundColor: '#F3EFE9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    zeroTrustBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    doubleLockBadge: {
        backgroundColor: '#EBF3ED',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    doubleLockBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2E7D32',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 14,
    },
    identityRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 14,
    },
    identityRowMobile: {
        flexDirection: 'column',
        gap: 10,
    },
    identityCol: {
        minWidth: 140,
        flexShrink: 1,
    },
    identityColMobile: {
        minWidth: 0,
        width: '100%',
    },
    metaLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    statusActionsContainer: {
        backgroundColor: colors.surfaceSubtle,
        padding: 12,
        borderRadius: 6,
    },
    statusActionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginBottom: 8,
    },
    statusButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusButtonsRowMobile: {
        flexDirection: 'column',
        gap: 8,
    },
    statusBtn: {
        flex: 1,
        minWidth: 100,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    statusBtnMobile: {
        flex: 0,
        minWidth: 0,
        width: '100%',
        paddingVertical: 10,
    },
    statusBtnDisabled: {
        backgroundColor: '#F6F4F0',
        borderColor: '#E5DFD6',
        opacity: 0.7,
    },
    statusBtnActive: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF5ED',
    },
    statusBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    statusBtnTextDisabled: {
        color: '#9B9288',
    },
    statusBtnTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    orphanGuardNote: {
        marginTop: 8,
        fontSize: 11,
        lineHeight: 16,
        color: '#8A5D10',
    },
    sectionExplainer: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.textSecondary,
        marginTop: 6,
    },
    subSectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE3',
    },
    switchInfoCol: {
        flex: 1,
        paddingRight: 16,
    },
    switchTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginBottom: 2,
    },
    switchSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 15,
    },
    warningBox: {
        backgroundColor: '#FFF8E7',
        borderWidth: 1,
        borderColor: '#F0D499',
        borderRadius: 6,
        padding: 10,
        marginTop: 10,
    },
    warningText: {
        fontSize: 11,
        color: '#8A5D10',
        lineHeight: 16,
    },
    creationCard: {
        backgroundColor: '#FCFAF6',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
    },
    creationHeaderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    creationHeaderRowMobile: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
    },
    creationTitleCol: {
        flex: 1,
        minWidth: 0,
    },
    creationTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    creationSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    creationMasterSwitch: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    creationMasterSwitchMobile: {
        width: '100%',
        justifyContent: 'space-between',
        paddingTop: 4,
    },
    masterSwitchLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    subSwitchesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ECE5DB',
    },
    subSwitchesRowMobile: {
        flexDirection: 'column',
        gap: 10,
    },
    subSwitchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    subSwitchItemMobile: {
        width: '100%',
        justifyContent: 'space-between',
    },
    subSwitchLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    inviteButton: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    inviteButtonMobile: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    inviteButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    invitationItemBlock: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE3',
    },
    invitationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
    },
    invitationInfoCol: {
        flex: 1,
        minWidth: 0,
    },
    invitationEmail: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    invitationMeta: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    invitationSubNote: {
        fontSize: 10,
        color: '#2C5E8A',
        marginTop: 3,
    },
    invitationFailureText: {
        fontSize: 10,
        color: '#9E2A2B',
        marginTop: 3,
    },
    invitationActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    revokeBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E8C5C5',
        backgroundColor: '#FAF2F2',
    },
    revokeBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9E3B3B',
    },
    reissueBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAF8F4',
    },
    reissueBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    confirmRevokeBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FAF2F2',
        borderWidth: 1,
        borderColor: '#E8C5C5',
        borderRadius: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        width: '100%',
    },
    confirmRevokeLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9E3B3B',
        marginRight: 4,
    },
    confirmRevokeActionBtn: {
        backgroundColor: '#9E3B3B',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    confirmRevokeActionText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    cancelRevokeBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    cancelRevokeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    lifecycleNoticeBox: {
        marginTop: 10,
        padding: 10,
        borderRadius: 6,
        backgroundColor: '#FFFDF9',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    lifecycleNoticeText: {
        fontSize: 11,
        lineHeight: 16,
        color: '#7A5410',
    },
    invitationBadge: {
        backgroundColor: '#F3EFE9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    invitationBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    auditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E9',
        gap: 10,
    },
    auditCategoryDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.champagneGold,
    },
    auditEventType: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    auditMeta: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 1,
    },
    emptyText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalOverlayMobile: {
        padding: 12,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 24,
        width: '100%',
        maxWidth: 480,
        maxHeight: '90%',
    },
    modalContentMobile: {
        padding: 16,
    },
    modalScroll: {
        width: '100%',
    },
    modalEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginBottom: 10,
    },
    modalExplainer: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginBottom: 6,
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: colors.atelierBlack,
        backgroundColor: '#FAF8F4',
        marginBottom: 20,
    },
    modalActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalActionsRowMobile: {
        flexDirection: 'column-reverse',
        alignItems: 'stretch',
        gap: 8,
    },
    modalBtnMobile: {
        width: '100%',
        alignItems: 'center',
    },
    expiryChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    expiryChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FAF8F4',
    },
    expiryChipActive: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF5ED',
    },
    expiryChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    expiryChipTextActive: {
        color: '#8A5D10',
        fontWeight: '700',
    },
    modalErrorBox: {
        marginBottom: 14,
        padding: 10,
        borderRadius: 6,
        backgroundColor: '#FAF2F2',
        borderWidth: 1,
        borderColor: '#E8C5C5',
    },
    modalErrorText: {
        fontSize: 11,
        lineHeight: 16,
        color: '#9E3B3B',
    },
    oneTimeWarningBox: {
        backgroundColor: '#FFF8E7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 6,
        padding: 12,
        marginBottom: 14,
    },
    oneTimeWarningTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8A5D10',
        marginBottom: 4,
    },
    oneTimeWarningText: {
        fontSize: 11,
        lineHeight: 16,
        color: '#6E501A',
    },
    oneTimeUrlBox: {
        backgroundColor: '#FAF8F4',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
    },
    oneTimeUrlText: {
        fontSize: 11,
        color: colors.atelierBlack,
        fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
        flexShrink: 1,
        ...(Platform.OS === 'web' ? ({ wordBreak: 'break-all' } as any) : {}),
    },
    pendingEmailNote: {
        fontSize: 11,
        lineHeight: 16,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    copyUrlBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF5ED',
    },
    copyUrlBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8A5D10',
    },
    cancelModalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelModalBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    confirmModalBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 4,
    },
    confirmModalBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
