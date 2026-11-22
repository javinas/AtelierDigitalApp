// ==============================================================================
// ATELIER DIGITAL — PANTALLA DISEÑADORA: PREPARACIÓN DE INVITACIONES M09
// Archivo: src/components/portalInvitations/DesignerPortalInvitationsScreen.tsx
// ==============================================================================
// Flujo completo desde el perfil de Katherine Carroll / Administración para:
// - Identificar la destinataria dentro de las 5 clientas canónicas.
// - Redactar mensaje editorial personalizado en memoria RAM.
// - Inspeccionar en vivo el resumen de permisos configurados en el store
//   compartido (Zero Trust DEFAULT false, Doble Candado, deny-overrides).
// - Revisar la vista previa del correo sin tokens ficticios ni envío real.
// - Gestionar estados locales de invitación diferenciados de E1/E2.
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
import { AtelierBrandBadge } from '../AtelierBrandBadge';
import {
    ACCESS_STATUS_META,
    LOCAL_REFERENCE_PORTAL_CLIENTS,
} from '../portal/portalDesignerModel';
import {
    getPortalLocalMemorySnapshot,
    PortalLocalInvitationRecord,
    resetLocalInvitationInMemory,
    saveLocalInvitationDraftInMemory,
    setLocalInvitationStatusInMemory,
    subscribePortalLocalMemory,
} from '../portal/portalLocalMemoryStore';
import { InvitationEmailPreviewCard } from './InvitationEmailPreviewCard';
import {
    buildDefaultInvitationMessage,
    buildInvitationPermissionsSummary,
    buildLocalInvitationEmailPreview,
    LOCAL_INVITATION_STATUS_META,
    M09_INVITATION_E2_LIMITATIONS,
    resolveDraftForInvitation,
    resolveEffectivePreviewAccessStatus,
} from './portalInvitationModel';
import { portalInvitationStyles as styles } from './portalInvitationStyles';

export interface DesignerPortalInvitationsScreenProps {
    onBack: () => void;
    onOpenPermissions: (clientId: string) => void;
    initialClientId?: string;
}

function getFallbackEmptyInvitation(clientId: string): PortalLocalInvitationRecord {
    return {
        clientId,
        localStatus: 'unprepared',
        customMessage: '',
        updatedAtLabel: null,
        consentAcceptedLocal: false,
        persistenceState: 'not_persisted_pending_e2',
        emailDeliveryState: 'blocked_pending_e2',
    };
}

export const DesignerPortalInvitationsScreen: React.FC<
    DesignerPortalInvitationsScreenProps
> = ({ onBack, onOpenPermissions, initialClientId }) => {
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
        return LOCAL_REFERENCE_PORTAL_CLIENTS[1]?.id || LOCAL_REFERENCE_PORTAL_CLIENTS[0].id;
    }, [initialClientId]);

    const [trackedInitialId, setTrackedInitialId] = useState<string | undefined>(initialClientId);
    const [selectedClientId, setSelectedClientId] = useState<string>(resolvedInitialId);
    if (trackedInitialId !== initialClientId) {
        setTrackedInitialId(initialClientId);
        if (
            initialClientId &&
            LOCAL_REFERENCE_PORTAL_CLIENTS.some((c) => c.id === initialClientId)
        ) {
            setSelectedClientId(initialClientId);
        }
    }

    const [mobileDirectoryOpen, setMobileDirectoryOpen] = useState<boolean>(false);
    const [editorMessagesByClientId, setEditorMessagesByClientId] = useState<
        Record<string, string>
    >({});

    const { draftsByClientId, statusByClientId, invitationsByClientId } = useSyncExternalStore(
        subscribePortalLocalMemory,
        getPortalLocalMemorySnapshot,
        getPortalLocalMemorySnapshot
    );

    const selectedClient = useMemo(
        () =>
            LOCAL_REFERENCE_PORTAL_CLIENTS.find((c) => c.id === selectedClientId) ||
            LOCAL_REFERENCE_PORTAL_CLIENTS[0],
        [selectedClientId]
    );

    const selectedDraft = resolveDraftForInvitation(selectedClient.id, draftsByClientId);
    const selectedInvitation =
        invitationsByClientId[selectedClient.id] || getFallbackEmptyInvitation(selectedClient.id);
    const effectiveLocalAccessStatus = resolveEffectivePreviewAccessStatus(
        selectedClient.id,
        statusByClientId
    );
    const persistentAccessMeta = ACCESS_STATUS_META[selectedClient.accessStatus];
    const effectiveAccessMeta = ACCESS_STATUS_META[effectiveLocalAccessStatus];
    const localInvitationMeta = LOCAL_INVITATION_STATUS_META[selectedInvitation.localStatus];

    const activeMessageText =
        editorMessagesByClientId[selectedClient.id] ??
        (selectedInvitation.customMessage || buildDefaultInvitationMessage(selectedClient));

    const permissionsSummary = useMemo(
        () =>
            buildInvitationPermissionsSummary({
                client: selectedClient,
                draft: selectedDraft,
            }),
        [selectedClient, selectedDraft]
    );

    const emailPreview = useMemo(
        () =>
            buildLocalInvitationEmailPreview({
                client: selectedClient,
                record: {
                    ...selectedInvitation,
                    customMessage: activeMessageText,
                },
                permissionsSummary,
            }),
        [selectedClient, selectedInvitation, activeMessageText, permissionsSummary]
    );

    const handleSelectClient = (clientId: string) => {
        setSelectedClientId(clientId);
        if (!isDesktop) {
            setMobileDirectoryOpen(false);
        }
    };

    const handleMessageChange = (text: string) => {
        setEditorMessagesByClientId((prev) => ({
            ...prev,
            [selectedClient.id]: text,
        }));
    };

    const handleApplyDefaultTemplate = () => {
        setEditorMessagesByClientId((prev) => ({
            ...prev,
            [selectedClient.id]: buildDefaultInvitationMessage(selectedClient),
        }));
    };

    const handleResetLocal = () => {
        resetLocalInvitationInMemory(selectedClient.id);
        setEditorMessagesByClientId((prev) => {
            const next = { ...prev };
            delete next[selectedClient.id];
            return next;
        });
    };

    if (authLoading) {
        return (
            <View style={styles.centerBlock} testID="invitations-designer-loading">
                <ActivityIndicator color={colors.champagneGold} size="small" />
                <Text style={styles.cardBodyText}>Cargando módulo local de invitaciones...</Text>
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={styles.centerBlock} testID="invitations-designer-denied">
                <AtelierBrandBadge compact subtitle="Acceso Restringido" />
                <Text style={styles.cardTitle}>
                    Gestión Exclusiva de Dirección del Atelier
                </Text>
                <Text style={[styles.cardBodyText, { textAlign: 'center', maxWidth: 460 }]}>
                    La preparación de invitaciones al portal pertenece únicamente a los perfiles de
                    diseñadora y administración.
                </Text>
                <TouchableOpacity style={styles.primaryGoldBtn} onPress={onBack}>
                    <Text style={styles.primaryGoldBtnText}>Volver a mi espacio</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const showDirectoryPanel = isDesktop || mobileDirectoryOpen;

    return (
        <View style={styles.container} testID="invitations-designer-root">
            <View style={styles.headerBar}>
                <View style={styles.headerInner}>
                    <View style={[styles.headerLeft, !isDesktop && styles.headerFullWidthMobile]}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={onBack}
                            testID="invitations-designer-back-btn"
                        >
                            <Text style={styles.backBtnText}>← Panel Principal</Text>
                        </TouchableOpacity>

                        {isDesktop ? (
                            <View style={{ marginBottom: -14 }}>
                                <AtelierBrandBadge compact subtitle="Invitaciones M09" />
                            </View>
                        ) : null}

                        <View style={styles.headerTitleBlock}>
                            <Text style={styles.eyebrow}>
                                MÓDULO 09 · PREPARACIÓN Y VISTA PREVIA DE INVITACIONES
                            </Text>
                            <Text style={styles.headerTitle}>Invitaciones al Portal</Text>
                            <Text style={styles.headerSubtitle}>
                                Preparación editorial integrada con memoria RAM compartida · Sin envío ni
                                persistencia E2.
                            </Text>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.headerRightPills,
                            !isDesktop && styles.headerFullWidthMobile,
                        ]}
                    >
                        <View style={styles.localOnlyPill}>
                            <Text style={styles.localOnlyPillText}>
                                FLUJO LOCAL EN RAM · SIN ENVÍO E2
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.secondaryActionBtn}
                            onPress={() => onOpenPermissions(selectedClient.id)}
                            testID="invitations-open-permissions-btn"
                        >
                            <Text style={styles.secondaryActionBtnText}>
                                Configurar Permisos →
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.maxWidthWrapper}>
                    {/* Comparación honesta de estados Persistente vs Local en Memoria */}
                    <View style={styles.dualStatusBanner}>
                        <Text style={styles.eyebrow}>
                            SEPARACIÓN EXPLÍCITA DE ESTADOS (ZERO SIMULACIÓN DE BACKEND)
                        </Text>
                        <View style={styles.dualStatusGrid}>
                            <View style={styles.dualStatusCol}>
                                <Text style={styles.eyebrow}>
                                    ESTADO PERSISTENTE (BACKEND E1/E2)
                                </Text>
                                <Text style={styles.honestyTitle}>
                                    Referencia estática: {persistentAccessMeta.label} · Envío: No enviado
                                </Text>
                                <Text style={styles.honestyText}>
                                    Sin tablas M09 ni Edge Function accept-portal-invitation desplegadas. No
                                    se generan tokens criptográficos ni se activan cuentas reales.
                                </Text>
                            </View>
                            <View style={styles.dualStatusCol}>
                                <Text style={styles.eyebrow}>
                                    ESTADO EN MEMORIA VOLÁTIL (RAM COMPARTIDA)
                                </Text>
                                <Text style={styles.honestyTitle} testID="invitations-designer-local-status-title">
                                    {localInvitationMeta.badgeLabel} · Portal local:{' '}
                                    {effectiveAccessMeta.label}
                                </Text>
                                <Text style={styles.honestyText}>{localInvitationMeta.designerHint}</Text>
                            </View>
                        </View>
                    </View>

                    {!isDesktop ? (
                        <TouchableOpacity
                            style={styles.secondaryActionBtn}
                            onPress={() => setMobileDirectoryOpen((open) => !open)}
                            testID="invitations-mobile-directory-toggle"
                        >
                            <Text style={styles.secondaryActionBtnText}>
                                {mobileDirectoryOpen
                                    ? '▲ Ocultar destinatarias'
                                    : `▼ Destinataria: ${selectedClient.fullName}`}
                            </Text>
                        </TouchableOpacity>
                    ) : null}

                    <View style={isDesktop ? styles.workspaceRow : styles.workspaceColMobile}>
                        {showDirectoryPanel ? (
                            <View
                                style={
                                    isDesktop
                                        ? styles.directoryColumnDesktop
                                        : styles.directoryColumnMobile
                                }
                            >
                                <View style={styles.card}>
                                    <Text style={styles.eyebrow}>DESTINATARIAS CANÓNICAS (5)</Text>
                                    <Text style={styles.cardTitle}>Directorio de Envío Local</Text>
                                    {LOCAL_REFERENCE_PORTAL_CLIENTS.map((client) => {
                                        const isSel = client.id === selectedClient.id;
                                        const invRec =
                                            invitationsByClientId[client.id] ||
                                            getFallbackEmptyInvitation(client.id);
                                        const invMeta =
                                            LOCAL_INVITATION_STATUS_META[invRec.localStatus];
                                        const permSummary = buildInvitationPermissionsSummary({
                                            client,
                                            draft: resolveDraftForInvitation(
                                                client.id,
                                                draftsByClientId
                                            ),
                                        });

                                        return (
                                            <TouchableOpacity
                                                key={client.id}
                                                style={[
                                                    styles.clientListItem,
                                                    isSel && styles.clientListItemSelected,
                                                ]}
                                                onPress={() => handleSelectClient(client.id)}
                                                testID={`invitations-client-item-${client.id}`}
                                            >
                                                <Text style={styles.clientListName}>
                                                    {client.fullName}
                                                </Text>
                                                <Text style={styles.clientListMeta}>
                                                    {client.email} · {client.city}
                                                </Text>
                                                <View style={styles.badgesWrapRow}>
                                                    <View
                                                        style={[
                                                            styles.statusBadge,
                                                            {
                                                                backgroundColor: invMeta.badgeBg,
                                                                borderColor: invMeta.badgeBorder,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.statusBadgeText,
                                                                { color: invMeta.badgeText },
                                                            ]}
                                                        >
                                                            {invMeta.shortLabel}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.clientListMeta}>
                                                        {permSummary.totalConfigured} permisos
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : null}

                        <View style={styles.detailColumn}>
                            {/* 1. Identificación de la Destinataria */}
                            <View style={styles.card} testID="invitations-recipient-card">
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.cardTitleGroup}>
                                        <Text style={styles.eyebrow}>
                                            1 · IDENTIFICACIÓN DE LA DESTINATARIA
                                        </Text>
                                        <Text style={styles.cardTitle}>
                                            {selectedClient.fullName}
                                        </Text>
                                        <Text style={styles.cardBodyText}>
                                            Correo: {selectedClient.email} · Ciudad:{' '}
                                            {selectedClient.city}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: localInvitationMeta.badgeBg,
                                                borderColor: localInvitationMeta.badgeBorder,
                                            },
                                        ]}
                                        testID="invitations-status-badge"
                                    >
                                        <Text
                                            style={[
                                                styles.statusBadgeText,
                                                { color: localInvitationMeta.badgeText },
                                            ]}
                                        >
                                            {localInvitationMeta.badgeLabel}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* 2. Mensaje Personalizado */}
                            <View style={styles.card}>
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.cardTitleGroup}>
                                        <Text style={styles.eyebrow}>
                                            2 · MENSAJE PERSONALIZADO DE ATELIER
                                        </Text>
                                        <Text style={styles.cardTitle}>
                                            Carta Editorial de Invitación
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.outlineBtn}
                                        onPress={handleApplyDefaultTemplate}
                                        testID="invitations-template-btn"
                                    >
                                        <Text style={styles.outlineBtnText}>
                                            Restaurar plantilla
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    multiline
                                    value={activeMessageText}
                                    onChangeText={handleMessageChange}
                                    placeholder="Escribe una nota editorial privada para acompañar la invitación..."
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.messageInput}
                                    testID="invitations-custom-message-input"
                                />
                                <Text style={styles.clientListMeta}>
                                    Caracteres redactados: {activeMessageText.trim().length} · Solo
                                    contenido editorial (sin datos reservados ni apuntes de taller).
                                </Text>
                            </View>

                            {/* 3. Resumen de Permisos Configurados en portalLocalMemoryStore */}
                            <View
                                style={styles.card}
                                testID="invitations-permissions-summary-card"
                            >
                                <View style={styles.cardHeaderRow}>
                                    <View style={styles.cardTitleGroup}>
                                        <Text style={styles.eyebrow}>
                                            3 · RESUMEN DE PERMISOS EN MEMORIA COMPARTIDA
                                        </Text>
                                        <Text style={styles.cardTitle}>
                                            Alcance Autorizado ({permissionsSummary.totalConfigured}{' '}
                                            activos)
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.outlineBtn}
                                        onPress={() => onOpenPermissions(selectedClient.id)}
                                        testID="invitations-edit-permissions-inline-btn"
                                    >
                                        <Text style={styles.outlineBtnText}>
                                            Editar en Matriz M09
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {permissionsSummary.isZeroTrustEmpty ? (
                                    <View
                                        style={styles.honestyBox}
                                        testID="invitations-zero-trust-summary"
                                    >
                                        <Text style={styles.honestyTitle}>
                                            Zero Trust DEFAULT false (0 permisos habilitados)
                                        </Text>
                                        <Text style={styles.honestyText}>
                                            Si preparas la invitación sin encender permisos previos,
                                            la clienta verá su portal en bienvenida protegida con cero
                                            datos expuestos hasta que autorices cada sección o prenda.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {permissionsSummary.summaryLines.map((line, i) => (
                                            <View
                                                key={`${i}-${line.slice(0, 14)}`}
                                                style={styles.permissionBulletRow}
                                            >
                                                <Text style={styles.clientListMeta}>• {line}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* 4. Vista Previa del Correo */}
                            <View style={styles.card}>
                                <Text style={styles.eyebrow}>4 · VISTA PREVIA DEL CORREO</Text>
                                <Text style={styles.cardTitle}>
                                    Previsualización Editorial Sin Envío Real
                                </Text>
                                <InvitationEmailPreviewCard preview={emailPreview} />
                            </View>

                            {/* 5. Controles de Ciclo Local vs Botones Reales Bloqueados */}
                            <View style={styles.card}>
                                <Text style={styles.eyebrow}>
                                    5 · CICLO LOCAL DE INVITACIÓN Y LÍMITES BACKEND
                                </Text>
                                <Text style={styles.cardTitle}>
                                    Transiciones Locales en RAM y Acciones Reales Bloqueadas
                                </Text>

                                <View style={styles.chipsRow}>
                                    <TouchableOpacity
                                        style={styles.outlineBtn}
                                        onPress={() =>
                                            saveLocalInvitationDraftInMemory(
                                                selectedClient.id,
                                                activeMessageText,
                                                'draft'
                                            )
                                        }
                                        testID="invitations-btn-save-draft"
                                    >
                                        <Text style={styles.outlineBtnText}>
                                            Guardar borrador (RAM)
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.primaryBlackBtn}
                                        onPress={() =>
                                            saveLocalInvitationDraftInMemory(
                                                selectedClient.id,
                                                activeMessageText,
                                                'ready_for_preview'
                                            )
                                        }
                                        testID="invitations-btn-mark-ready"
                                    >
                                        <Text style={styles.primaryBlackBtnText}>
                                            Marcar lista para vista previa
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.outlineBtn}
                                        onPress={() =>
                                            setLocalInvitationStatusInMemory(
                                                selectedClient.id,
                                                'expired_local'
                                            )
                                        }
                                        testID="invitations-btn-mark-expired"
                                    >
                                        <Text style={styles.outlineBtnText}>
                                            Simular expirada (local)
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.outlineBtn}
                                        onPress={() =>
                                            setLocalInvitationStatusInMemory(
                                                selectedClient.id,
                                                'revoked_local'
                                            )
                                        }
                                        testID="invitations-btn-mark-revoked"
                                    >
                                        <Text style={styles.outlineBtnText}>
                                            Simular revocada (local)
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.outlineBtn}
                                        onPress={handleResetLocal}
                                        testID="invitations-btn-reset"
                                    >
                                        <Text style={styles.outlineBtnText}>
                                            Restablecer borrador
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.chipsRow}>
                                    <TouchableOpacity
                                        disabled
                                        accessibilityState={{ disabled: true }}
                                        style={styles.blockedActionBtn}
                                        testID="invitations-btn-blocked-crypto-link"
                                    >
                                        <Text style={styles.blockedActionBtnText}>
                                            Generar enlace criptográfico real (Requiere E1/E2)
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        disabled
                                        accessibilityState={{ disabled: true }}
                                        style={styles.blockedActionBtn}
                                        testID="invitations-btn-blocked-send-email"
                                    >
                                        <Text style={styles.blockedActionBtnText}>
                                            Enviar correo real a clienta (Requiere E2)
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.honestyBox}>
                                    <Text style={styles.honestyTitle}>
                                        Limitaciones pendientes hasta desplegar E1 y E2:
                                    </Text>
                                    {M09_INVITATION_E2_LIMITATIONS.map((lim) => (
                                        <Text key={lim.id} style={styles.honestyText}>
                                            • [{lim.phase}] {lim.title}: {lim.detail}
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};
