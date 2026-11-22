// ==============================================================================
// ATELIER DIGITAL — PANTALLA CLIENTA: ACEPTACIÓN LOCAL DE INVITACIÓN M09
// Archivo: src/components/portalInvitations/ClientPortalInvitationScreen.tsx
// ==============================================================================
// Experiencia de revisión y aceptación local en memoria (rol 'client'):
// - Verifica guardia estricta de destinataria (aislamiento multi-clienta).
// - Respeta todos los estados locales: unprepared, draft, ready_for_preview,
//   preview_accepted_local, expired_local y revoked_local.
// - Muestra el mensaje personalizado y el resumen de permisos configurado por
//   la diseñadora en portalLocalMemoryStore.ts (Zero Trust, Doble Candado,
//   deny-overrides).
// - Exige consentimiento explícito Ley 1581 de 2012 antes de habilitar el paso
//   local hacia /mi-portal, sin simular activación ni persistencia real E2.
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
import { AtelierBrandBadge } from '../AtelierBrandBadge';
import {
    ACCESS_STATUS_META,
    LOCAL_REFERENCE_PORTAL_CLIENTS,
} from '../portal/portalDesignerModel';
import {
    acceptLocalInvitationPreviewInMemory,
    getPortalLocalMemorySnapshot,
    PortalLocalInvitationRecord,
    subscribePortalLocalMemory,
} from '../portal/portalLocalMemoryStore';
import {
    buildDefaultInvitationMessage,
    buildInvitationPermissionsSummary,
    evaluateInvitationRecipientGuard,
    getCanonicalInvitationClient,
    LOCAL_INVITATION_STATUS_META,
    resolveDraftForInvitation,
    resolveEffectivePreviewAccessStatus,
} from './portalInvitationModel';
import { portalInvitationStyles as styles } from './portalInvitationStyles';

export interface ClientPortalInvitationScreenProps {
    onBack: () => void;
    onOpenPortal: () => void;
    initialTargetClientId?: string;
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

export const ClientPortalInvitationScreen: React.FC<ClientPortalInvitationScreenProps> = ({
    onBack,
    onOpenPortal,
    initialTargetClientId,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isExclusiveClient = role === 'client';

    const defaultClientId = useMemo(() => {
        if (
            initialTargetClientId &&
            LOCAL_REFERENCE_PORTAL_CLIENTS.some((c) => c.id === initialTargetClientId)
        ) {
            return initialTargetClientId;
        }
        return LOCAL_REFERENCE_PORTAL_CLIENTS[1]?.id || LOCAL_REFERENCE_PORTAL_CLIENTS[0].id;
    }, [initialTargetClientId]);

    const [trackedInitialId, setTrackedInitialId] = useState<string | undefined>(
        initialTargetClientId
    );
    const [targetClientId, setTargetClientId] = useState<string>(defaultClientId);
    const [viewerClientId, setViewerClientId] = useState<string>(defaultClientId);
    const [controlsOpen, setControlsOpen] = useState<boolean>(false);
    const [consentChecked, setConsentChecked] = useState<boolean>(false);

    if (trackedInitialId !== initialTargetClientId) {
        setTrackedInitialId(initialTargetClientId);
        if (
            initialTargetClientId &&
            LOCAL_REFERENCE_PORTAL_CLIENTS.some((c) => c.id === initialTargetClientId)
        ) {
            setTargetClientId(initialTargetClientId);
            setViewerClientId(initialTargetClientId);
            setConsentChecked(false);
        }
    }

    const { draftsByClientId, statusByClientId, invitationsByClientId } = useSyncExternalStore(
        subscribePortalLocalMemory,
        getPortalLocalMemorySnapshot,
        getPortalLocalMemorySnapshot
    );

    const targetClient =
        getCanonicalInvitationClient(targetClientId) || LOCAL_REFERENCE_PORTAL_CLIENTS[0];
    const invitationRecord =
        invitationsByClientId[targetClient.id] || getFallbackEmptyInvitation(targetClient.id);
    const localInvMeta = LOCAL_INVITATION_STATUS_META[invitationRecord.localStatus];
    const persistentMeta = ACCESS_STATUS_META[targetClient.accessStatus];
    const effectiveAccessStatus = resolveEffectivePreviewAccessStatus(
        targetClient.id,
        statusByClientId
    );
    const effectiveAccessMeta = ACCESS_STATUS_META[effectiveAccessStatus];

    const recipientGuard = useMemo(
        () =>
            evaluateInvitationRecipientGuard({
                targetClientId: targetClient.id,
                viewerClientId,
            }),
        [targetClient.id, viewerClientId]
    );

    const draft = resolveDraftForInvitation(targetClient.id, draftsByClientId);
    const permissionsSummary = useMemo(
        () =>
            buildInvitationPermissionsSummary({
                client: targetClient,
                draft,
            }),
        [targetClient, draft]
    );

    const handleSelectTargetClient = (clientId: string) => {
        setTargetClientId(clientId);
        setViewerClientId(clientId);
        setConsentChecked(false);
    };

    const handleSelectViewerIdentity = (clientId: string) => {
        setViewerClientId(clientId);
        setConsentChecked(false);
    };

    const handleAcceptLocalPreview = () => {
        if (!consentChecked || !recipientGuard.allowed) return;
        acceptLocalInvitationPreviewInMemory(targetClient.id);
    };

    if (authLoading) {
        return (
            <View style={styles.centerBlock} testID="client-inv-loading">
                <ActivityIndicator color={colors.champagneGold} size="small" />
                <Text style={styles.cardBodyText}>Verificando acceso exclusivo...</Text>
            </View>
        );
    }

    if (!isExclusiveClient) {
        return (
            <View style={styles.centerBlock} testID="client-inv-role-denied">
                <AtelierBrandBadge compact subtitle="Acceso Exclusivo para Clientas" />
                <Text style={styles.cardTitle}>Vista Reservada para Rol Clienta</Text>
                <Text style={[styles.cardBodyText, { textAlign: 'center', maxWidth: 460 }]}>
                    Esta pantalla muestra la experiencia local de aceptación de invitación del portal
                    para cuentas con rol clienta.
                </Text>
                <TouchableOpacity style={styles.primaryGoldBtn} onPress={onBack}>
                    <Text style={styles.primaryGoldBtnText}>Volver a mi espacio</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const customLetter =
        invitationRecord.customMessage.trim() || buildDefaultInvitationMessage(targetClient);

    return (
        <View style={styles.container} testID="client-inv-root">
            <View style={styles.headerBar}>
                <View style={styles.headerInner}>
                    <View style={[styles.headerLeft, !isDesktop && styles.headerFullWidthMobile]}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={onBack}
                            testID="client-inv-back-btn"
                        >
                            <Text style={styles.backBtnText}>← Volver</Text>
                        </TouchableOpacity>

                        {isDesktop ? (
                            <View style={{ marginBottom: -14 }}>
                                <AtelierBrandBadge compact subtitle="Invitación Privada" />
                            </View>
                        ) : null}

                        <View style={styles.headerTitleBlock}>
                            <Text style={styles.eyebrow}>
                                ATELIER BY KATHERINE CARROLL · M09 INVITACIÓN CLIENTA
                            </Text>
                            <Text style={styles.headerTitle}>{targetClient.fullName}</Text>
                            <Text style={styles.headerSubtitle}>
                                Vista previa local en memoria RAM · Sin tokens reales ni activación E2.
                            </Text>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.headerRightPills,
                            !isDesktop && styles.headerFullWidthMobile,
                        ]}
                    >
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: localInvMeta.badgeBg,
                                    borderColor: localInvMeta.badgeBorder,
                                },
                            ]}
                            testID="client-inv-status-badge"
                        >
                            <Text style={[styles.statusBadgeText, { color: localInvMeta.badgeText }]}>
                                {localInvMeta.badgeLabel}
                            </Text>
                        </View>

                        <View style={styles.localOnlyPill}>
                            <Text style={styles.localOnlyPillText}>VISTA PREVIA RAM · SIN E2</Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.secondaryActionBtn,
                                controlsOpen && styles.outlineBtnActive,
                            ]}
                            onPress={() => setControlsOpen((o) => !o)}
                            testID="client-inv-controls-toggle"
                        >
                            <Text
                                style={[
                                    styles.secondaryActionBtnText,
                                    controlsOpen && styles.outlineBtnTextActive,
                                ]}
                            >
                                {controlsOpen ? 'Cerrar Control Local' : 'Control de Prueba Local'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.clientStageWrapper}>
                    {/* Control colapsable para inspeccionar las 5 clientas y mismatch multi-tenant */}
                    {controlsOpen ? (
                        <View style={styles.card} testID="client-inv-controls-panel">
                            <Text style={styles.eyebrow}>
                                CONTROL DE PRUEBA LOCAL EN MEMORIA COMPARTIDA
                            </Text>
                            <Text style={styles.cardTitle}>
                                Selector de Destinataria y Discrepancia Multi-Clienta
                            </Text>

                            <Text style={styles.clientListMeta}>
                                1. Destinataria de la invitación (sincronizada desde /client-portal-invitations):
                            </Text>
                            <View style={styles.chipsRow}>
                                {LOCAL_REFERENCE_PORTAL_CLIENTS.map((c) => {
                                    const isSel = c.id === targetClient.id;
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[styles.outlineBtn, isSel && styles.outlineBtnActive]}
                                            onPress={() => handleSelectTargetClient(c.id)}
                                            testID={`client-inv-select-${c.id}`}
                                        >
                                            <Text
                                                style={[
                                                    styles.outlineBtnText,
                                                    isSel && styles.outlineBtnTextActive,
                                                ]}
                                            >
                                                {c.fullName}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.clientListMeta}>
                                2. Identidad de sesión en vista previa (probar bloqueo mismatch multi-tenant):
                            </Text>
                            <View style={styles.chipsRow}>
                                {LOCAL_REFERENCE_PORTAL_CLIENTS.map((c) => {
                                    const isSel = c.id === viewerClientId;
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[styles.outlineBtn, isSel && styles.outlineBtnActive]}
                                            onPress={() => handleSelectViewerIdentity(c.id)}
                                            testID={`client-inv-viewer-${c.id}`}
                                        >
                                            <Text
                                                style={[
                                                    styles.outlineBtnText,
                                                    isSel && styles.outlineBtnTextActive,
                                                ]}
                                            >
                                                Sesión: {c.fullName.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ) : null}

                    {/* Cinta dual transparente Persistente vs Local RAM */}
                    <View style={styles.dualStatusBanner}>
                        <View style={styles.dualStatusGrid}>
                            <View style={styles.dualStatusCol}>
                                <Text style={styles.eyebrow}>
                                    ESTADO PERSISTENTE (SIN BACKEND E1/E2)
                                </Text>
                                <Text style={styles.honestyTitle}>
                                    Cuenta real: No vinculada ({persistentMeta.label})
                                </Text>
                                <Text style={styles.honestyText}>
                                    No existe token criptográfico ni envío SMTP real en esta vista.
                                </Text>
                            </View>
                            <View style={styles.dualStatusCol}>
                                <Text style={styles.eyebrow}>ESTADO EN MEMORIA LOCAL (RAM)</Text>
                                <Text style={styles.honestyTitle}>
                                    {localInvMeta.badgeLabel} · Portal local: {effectiveAccessMeta.label}
                                </Text>
                                <Text style={styles.honestyText}>
                                    {invitationRecord.updatedAtLabel ||
                                        'Pendiente de preparación por la diseñadora.'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 1. Bloqueo estricto por discrepancia multi-clienta */}
                    {!recipientGuard.allowed ? (
                        <View style={styles.card} testID="client-inv-mismatch-blocked">
                            <Text style={styles.eyebrow}>GUARDIA MULTI-TENANT · EXPOSICIÓN 0</Text>
                            <Text style={styles.cardTitle}>
                                Acceso Denegado por Discrepancia de Destinataria
                            </Text>
                            <Text style={styles.cardBodyText}>{recipientGuard.message}</Text>
                            <View style={styles.honestyBox}>
                                <Text style={styles.honestyTitle}>Aislamiento Activo</Text>
                                <Text style={styles.honestyText}>
                                    Mensaje personalizado oculto · Permisos ocultos · Enlace al portal
                                    bloqueado.
                                </Text>
                            </View>
                        </View>
                    ) : invitationRecord.localStatus === 'unprepared' ||
                      invitationRecord.localStatus === 'draft' ||
                      invitationRecord.localStatus === 'expired_local' ||
                      invitationRecord.localStatus === 'revoked_local' ? (
                        /* 2. Estados bloqueados: sin preparar, borrador, expirada o revocada */
                        <View
                            style={styles.card}
                            testID={`client-inv-gate-${invitationRecord.localStatus}`}
                        >
                            <View style={styles.cardHeaderRow}>
                                <View style={styles.cardTitleGroup}>
                                    <Text style={styles.eyebrow}>
                                        DESTINATARIA: {targetClient.fullName.toUpperCase()} ·{' '}
                                        {targetClient.city.toUpperCase()}
                                    </Text>
                                    <Text style={styles.cardTitle}>{localInvMeta.clientHeadline}</Text>
                                </View>
                            </View>

                            <Text style={styles.cardBodyText}>{localInvMeta.clientBody}</Text>

                            <View style={styles.honestyBox}>
                                <Text style={styles.honestyTitle}>Cero Exposición de Contenido</Text>
                                <Text style={styles.honestyText}>
                                    Mientras la invitación no esté lista y aceptada, no se muestran
                                    mensajes internos, prendas, cotizaciones ni el botón de ingreso al
                                    portal.
                                </Text>
                            </View>

                            <TouchableOpacity
                                disabled
                                accessibilityState={{ disabled: true }}
                                style={styles.blockedActionBtn}
                            >
                                <Text style={styles.blockedActionBtnText}>
                                    Activar cuenta real en Supabase (Bloqueado · Requiere E1/E2)
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : invitationRecord.localStatus === 'ready_for_preview' ? (
                        /* 3. Invitación lista para revisión y aceptación local en RAM */
                        <View style={styles.card} testID="client-inv-acceptance-ready">
                            <Text style={styles.eyebrow}>
                                INVITACIÓN DE ATELIER DE AUTOR · DESTINATARIA VERIFICADA
                            </Text>
                            <Text style={styles.cardTitle}>
                                Bienvenida, {targetClient.fullName}
                            </Text>
                            <Text style={styles.cardBodyText}>
                                Destinataria: {targetClient.email} · {targetClient.city}
                            </Text>

                            <View style={styles.divider} />

                            <View style={{ gap: 6 }}>
                                <Text style={styles.eyebrow}>
                                    MENSAJE PERSONALIZADO DE KATHERINE CARROLL
                                </Text>
                                <View style={styles.honestyBox}>
                                    <Text
                                        style={styles.cardBodyText}
                                        testID="client-inv-custom-letter"
                                    >
                                        {customLetter}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ gap: 6 }}>
                                <Text style={styles.eyebrow}>
                                    MÓDULOS Y PERMISOS CONFIGURADOS ({permissionsSummary.totalConfigured}{' '}
                                    ACTIVOS · ZERO TRUST)
                                </Text>
                                {permissionsSummary.isZeroTrustEmpty ? (
                                    <View style={styles.honestyBox}>
                                        <Text style={styles.honestyTitle}>
                                            Sin módulos visibles todavía (DEFAULT false)
                                        </Text>
                                        <Text style={styles.honestyText}>
                                            Podrás ingresar a tu bienvenida privada mientras la
                                            diseñadora habilita tus piezas o citas.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 6 }} testID="client-inv-permissions-list">
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

                            <View style={styles.divider} />

                            <TouchableOpacity
                                style={styles.consentCheckboxRow}
                                onPress={() => setConsentChecked((prev) => !prev)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: consentChecked }}
                                testID="client-inv-consent-checkbox"
                            >
                                <View
                                    style={[
                                        styles.consentBoxSquare,
                                        consentChecked && styles.consentBoxSquareChecked,
                                    ]}
                                >
                                    {consentChecked ? (
                                        <Text style={styles.consentCheckMark}>✓</Text>
                                    ) : null}
                                </View>
                                <Text style={[styles.cardBodyText, { flex: 1 }]}>
                                    Autorizo de forma informada el tratamiento confidencial de mis datos
                                    para esta vista previa local de acceso al Portal Privado conforme a
                                    la Ley 1581 de 2012 (sin registro remoto hasta E1/E2).
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.chipsRow}>
                                <TouchableOpacity
                                    disabled={!consentChecked}
                                    accessibilityState={{ disabled: !consentChecked }}
                                    style={[
                                        styles.primaryGoldBtn,
                                        !consentChecked && { opacity: 0.48 },
                                    ]}
                                    onPress={handleAcceptLocalPreview}
                                    testID="client-inv-accept-local-btn"
                                >
                                    <Text style={styles.primaryGoldBtnText}>
                                        Confirmar aceptación (Solo vista previa local en RAM)
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    disabled
                                    accessibilityState={{ disabled: true }}
                                    style={styles.blockedActionBtn}
                                    testID="client-inv-blocked-activate-real"
                                >
                                    <Text style={styles.blockedActionBtnText}>
                                        Activar cuenta real en Supabase (Bloqueado · Requiere E1/E2)
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* 4. Estado preview_accepted_local: aceptada solo en RAM y acceso condicionado a /mi-portal */
                        <View style={styles.card} testID="client-inv-accepted-local-card">
                            <Text style={styles.eyebrow}>
                                CONFIRMACIÓN LOCAL EN RAM · SIN PERSISTENCIA REMOTA
                            </Text>
                            <Text style={styles.cardTitle}>
                                Vista Previa Aceptada para {targetClient.fullName}
                            </Text>
                            <Text style={styles.cardBodyText}>{localInvMeta.clientBody}</Text>

                            <View style={styles.honestyBox}>
                                <Text style={styles.honestyTitle}>
                                    Transparencia Backend M09 (E1/E2 Pendientes)
                                </Text>
                                <Text style={styles.honestyText}>
                                    Esta confirmación habilitó tu acceso únicamente en la memoria RAM de
                                    esta sesión de prueba. No se envió correo, no se consumió ningún
                                    token real ni se escribió en Supabase.
                                </Text>
                            </View>

                            <View style={styles.chipsRow}>
                                <TouchableOpacity
                                    style={styles.primaryBlackBtn}
                                    onPress={onOpenPortal}
                                    testID="client-inv-open-portal-btn"
                                >
                                    <Text style={styles.primaryBlackBtnText}>
                                        Ir a Mi Portal Privado (/mi-portal) →
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    disabled
                                    accessibilityState={{ disabled: true }}
                                    style={styles.blockedActionBtn}
                                    testID="client-inv-blocked-activate-real"
                                >
                                    <Text style={styles.blockedActionBtnText}>
                                        Activar cuenta real en Supabase (Bloqueado · Requiere E1/E2)
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
