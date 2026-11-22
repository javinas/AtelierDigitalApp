// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: PESTAÑA PRINCIPAL DE PRUEBAS, AJUSTES Y ENTREGA
// Archivo: src/components/fitting/CreationFittingTab.tsx
// ==============================================================================
// Orquesta el expediente completo de calce físico sobre clienta real:
// 1) Selector histórico de sesiones (ronda intermedia vs final_for_delivery vs entregada).
// 2) Galería privada de fotos con URL firmada e inmutabilidad tras sellado.
// 3) Checklist de ajustes de la sesión + sección de ajustes abiertos de rondas previas.
// 4) Bloque puente M02 CAD de solo lectura y retroalimentación técnica.
// 5) Dictamen de calce bifurcado y ceremonial solemne de entrega final.
// 6) Cero Alert.alert (banners inline) y resolución de concurrencia optimista (PT409).
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Creation, CreationStatus } from '../../types/creation';
import { CreationCommercialProfile } from '../../types/commercial';
import {
    FittingAdjustment,
    FittingAdjustmentStatus,
    FittingSession,
    FittingSessionWithRelations,
    M06_ERROR_NAMES,
} from '../../types/fitting';
import { fetchCommercialProfile } from '../../services/commercialService';
import {
    fetchCreationM02FittingContext,
    fetchFittingSessionsByCreation,
} from '../../services/fittingService';
import {
    FITTING_APPROVAL_SCOPE_LABELS,
    FITTING_ROUND_LABELS,
    formatFittingDate,
    getFittingSessionStatusColors,
} from './fittingLabels';
import { fittingStyles } from './fittingStyles';
import { FittingSessionCard } from './FittingSessionCard';
import { FittingAdjustmentItem } from './FittingAdjustmentItem';
import { FittingMediaGallery } from './FittingMediaGallery';
import { FittingSessionModal } from './FittingSessionModal';
import {
    AdjustmentModalMode,
    FittingAdjustmentModal,
} from './FittingAdjustmentModal';
import { FittingApprovalModal } from './FittingApprovalModal';
import { DeliveryCeremonyModal } from './DeliveryCeremonyModal';

interface M02FittingContextState {
    patternExecutions: unknown[];
    patternAdjustments: unknown[];
    garmentType?: string | null;
    summaryText?: string | null;
}

export interface CreationFittingTabProps {
    creation: Creation;
    compactMode?: boolean;
    onOpenFullFittingTab?: () => void;
    onOpenCad?: () => void;
    onStatusChange?: (status: CreationStatus) => void;
}

export const CreationFittingTab: React.FC<CreationFittingTabProps> = ({
    creation,
    compactMode = false,
    onOpenFullFittingTab,
    onOpenCad,
    onStatusChange,
}) => {
    // --------------------------------------------------------------------------
    // ESTADO DE DATOS Y CARGA
    // --------------------------------------------------------------------------
    const [sessions, setSessions] = useState<FittingSessionWithRelations[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [m02Context, setM02Context] = useState<M02FittingContextState | null>(null);
    const [commercialProfile, setCommercialProfile] = useState<CreationCommercialProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConcurrencyConflict, setIsConcurrencyConflict] = useState<boolean>(false);

    // --------------------------------------------------------------------------
    // ESTADO DE MODALES
    // --------------------------------------------------------------------------
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [sessionModalInitialSession, setSessionModalInitialSession] = useState<FittingSession | null>(null);

    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjustmentModalInitialAdjustment, setAdjustmentModalInitialAdjustment] = useState<FittingAdjustment | null>(null);
    const [adjustmentModalMode, setAdjustmentModalMode] = useState<AdjustmentModalMode>('create');
    const [adjustmentModalTargetStatus, setAdjustmentModalTargetStatus] = useState<FittingAdjustmentStatus | undefined>(undefined);
    const [adjustmentModalTargetSession, setAdjustmentModalTargetSession] = useState<FittingSession | null>(null);

    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

    // --------------------------------------------------------------------------
    // CARGA DE DATOS CENTRALIZADA
    // --------------------------------------------------------------------------
    const loadFittingData = useCallback(async (preferredSessionId?: string | null) => {
        if (!creation?.id) return;
        setIsLoading(true);
        setErrorMessage(null);
        setIsConcurrencyConflict(false);

        try {
            const [sessionsRes, m02Res, profileRes] = await Promise.all([
                fetchFittingSessionsByCreation(creation.id),
                fetchCreationM02FittingContext(creation.id),
                fetchCommercialProfile(creation.id),
            ]);

            if (sessionsRes.error) {
                if (sessionsRes.error.includes('PT409') || sessionsRes.error.includes(M06_ERROR_NAMES.CONCURRENCY_CONFLICT)) {
                    setIsConcurrencyConflict(true);
                }
                setErrorMessage(sessionsRes.error);
            } else {
                const loadedSessions = sessionsRes.data || [];
                setSessions(loadedSessions);

                // Resolver sesión seleccionada
                setSelectedSessionId((current) => {
                    const target = preferredSessionId ?? current;
                    if (target && loadedSessions.some((s) => s.id === target)) {
                        return target;
                    }
                    // Si no hay seleccionada previa o ya no existe, elegir la más relevante
                    // Preferir última prueba activa o la primera en lista
                    return loadedSessions[0]?.id || null;
                });
            }

            if (m02Res.data) {
                const raw = m02Res.data;
                const firstExec = raw.patternExecutions[0] as Record<string, unknown> | undefined;
                setM02Context({
                    ...raw,
                    garmentType: (firstExec?.garment_type as string) || null,
                    summaryText: raw.patternExecutions.length > 0
                        ? `${raw.patternExecutions.length} ejecución(es) CAD · ${raw.patternAdjustments.length} ajuste(s) paramétrico(s)`
                        : null,
                });
            }

            if (profileRes.data) {
                setCommercialProfile(profileRes.data);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error inesperado al cargar el expediente de calce.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    }, [creation]);

    useEffect(() => {
        loadFittingData();
    }, [loadFittingData]);

    // --------------------------------------------------------------------------
    // CÁLCULOS Y VALORES DERIVADOS
    // --------------------------------------------------------------------------
    const selectedSession = useMemo(() => {
        if (!sessions.length) return null;
        return sessions.find((s) => s.id === selectedSessionId) || sessions[0];
    }, [sessions, selectedSessionId]);

    // Ajustes de la sesión actualmente seleccionada
    const currentSessionAdjustments = useMemo(() => {
        return selectedSession?.adjustments || [];
    }, [selectedSession]);

    // Total de ajustes abiertos en toda la creación
    const allCreationAdjustments = useMemo(() => {
        return sessions.flatMap((s) => s.adjustments || []);
    }, [sessions]);

    const totalOpenAdjustmentsCount = useMemo(() => {
        return allCreationAdjustments.filter(
            (a) => a.status === 'pending' || a.status === 'applied'
        ).length;
    }, [allCreationAdjustments]);

    // Ajustes abiertos que pertenecen a sesiones anteriores distintas a la actual
    const openAdjustmentsFromOtherSessions = useMemo(() => {
        if (!selectedSession) return [];
        return allCreationAdjustments.filter(
            (a) =>
                (a.status === 'pending' || a.status === 'applied') &&
                a.fitting_session_id !== selectedSession.id
        );
    }, [allCreationAdjustments, selectedSession]);

    // Estados de entrega y aprobación
    const isDelivered = useMemo(() => {
        return sessions.some((s) => Boolean(s.delivery_confirmed_at));
    }, [sessions]);

    const sessionReadyForDelivery = useMemo(() => {
        return sessions.find(
            (s) => s.status === 'approved' && s.approval_scope === 'final_for_delivery'
        );
    }, [sessions]);

    // Requisito técnico estricto M06: Solo se puede entregar si hay sesión con calce final aprobado
    // y ZERO ajustes abiertos en toda la Creación
    const canDeliver = useMemo(() => {
        return Boolean(sessionReadyForDelivery) && totalOpenAdjustmentsCount === 0 && !isDelivered;
    }, [sessionReadyForDelivery, totalOpenAdjustmentsCount, isDelivered]);

    // Info comercial de saldo pendiente (M03)
    const pendingBalanceInfo = useMemo(() => {
        if (!commercialProfile) return null;
        if (commercialProfile.payment_status === 'unpaid') {
            return 'Atención: No registra pagos en M03 (Estado: Sin pagar).';
        }
        if (commercialProfile.payment_status === 'partially_paid') {
            return 'Aviso: Pago parcial registrado en M03. Saldo pendiente de cobro.';
        }
        return null;
    }, [commercialProfile]);

    // --------------------------------------------------------------------------
    // MANEJADORES DE ACCIONES DE SESIÓN
    // --------------------------------------------------------------------------
    const handleOpenNewSession = () => {
        setSessionModalInitialSession(null);
        setIsSessionModalOpen(true);
    };

    const handleOpenEditSession = (sessionToEdit: FittingSession) => {
        setSessionModalInitialSession(sessionToEdit);
        setIsSessionModalOpen(true);
    };

    const handleOpenApproveSession = (sessionToApprove: FittingSession) => {
        if (selectedSession?.id !== sessionToApprove.id) {
            setSelectedSessionId(sessionToApprove.id);
        }
        setIsApprovalModalOpen(true);
    };

    const handleOpenDelivery = (sessionForDelivery: FittingSession) => {
        if (selectedSession?.id !== sessionForDelivery.id) {
            setSelectedSessionId(sessionForDelivery.id);
        }
        setIsDeliveryModalOpen(true);
    };

    const handleSessionSaved = (savedSession: FittingSession) => {
        setIsSessionModalOpen(false);
        loadFittingData(savedSession.id);
        if (creation.status === 'draft' || creation.status === 'active') {
            onStatusChange?.('fitting');
        }
    };

    const handleSessionApproved = (updatedSession: FittingSession) => {
        setIsApprovalModalOpen(false);
        loadFittingData(updatedSession.id);
        if (updatedSession.approval_scope === 'final_for_delivery') {
            if (creation.status === 'fitting') {
                onStatusChange?.('production');
            }
        }
    };

    const handleDeliveryConfirmed = (updatedSession: FittingSession) => {
        setIsDeliveryModalOpen(false);
        loadFittingData(updatedSession.id);
        onStatusChange?.('completed');
    };

    // --------------------------------------------------------------------------
    // MANEJADORES DE AJUSTES AUDITABLES
    // --------------------------------------------------------------------------
    const handleOpenAddAdjustment = (targetSession?: FittingSession) => {
        setAdjustmentModalTargetSession(targetSession || selectedSession);
        setAdjustmentModalInitialAdjustment(null);
        setAdjustmentModalMode('create');
        setAdjustmentModalTargetStatus(undefined);
        setIsAdjustmentModalOpen(true);
    };

    const handleApplyAdjustment = (adjustment: FittingAdjustment) => {
        const parent = sessions.find((s) => s.id === adjustment.fitting_session_id) || selectedSession;
        setAdjustmentModalTargetSession(parent);
        setAdjustmentModalInitialAdjustment(adjustment);
        setAdjustmentModalMode('resolve');
        setAdjustmentModalTargetStatus('applied');
        setIsAdjustmentModalOpen(true);
    };

    const handleVerifyAdjustment = (adjustment: FittingAdjustment) => {
        const parent = sessions.find((s) => s.id === adjustment.fitting_session_id) || selectedSession;
        setAdjustmentModalTargetSession(parent);
        setAdjustmentModalInitialAdjustment(adjustment);
        setAdjustmentModalMode('resolve');
        setAdjustmentModalTargetStatus('verified');
        setIsAdjustmentModalOpen(true);
    };

    const handleWaiveAdjustment = (adjustment: FittingAdjustment) => {
        if (adjustment.severity === 'critical') {
            setErrorMessage('Regla de Atelier: Un ajuste de severidad CRÍTICA no puede ser dispensado.');
            return;
        }
        const parent = sessions.find((s) => s.id === adjustment.fitting_session_id) || selectedSession;
        setAdjustmentModalTargetSession(parent);
        setAdjustmentModalInitialAdjustment(adjustment);
        setAdjustmentModalMode('resolve');
        setAdjustmentModalTargetStatus('waived');
        setIsAdjustmentModalOpen(true);
    };

    const handleCancelAdjustment = (adjustment: FittingAdjustment) => {
        const parent = sessions.find((s) => s.id === adjustment.fitting_session_id) || selectedSession;
        setAdjustmentModalTargetSession(parent);
        setAdjustmentModalInitialAdjustment(adjustment);
        setAdjustmentModalMode('resolve');
        setAdjustmentModalTargetStatus('cancelled');
        setIsAdjustmentModalOpen(true);
    };

    const handleAdjustmentSaved = () => {
        setIsAdjustmentModalOpen(false);
        loadFittingData(selectedSessionId);
    };

    // ==========================================================================
    // RENDERIZADO: MODO COMPACTO (PESTAÑA RESUMEN DEL EXPEDIENTE)
    // ==========================================================================
    if (compactMode) {
        const latestSession = sessions[0] || null;
        const statusColors = latestSession
            ? getFittingSessionStatusColors(
                latestSession.status,
                latestSession.approval_scope,
                Boolean(latestSession.delivery_confirmed_at)
            )
            : null;

        return (
            <View style={localStyles.compactCard}>
                <View style={localStyles.compactHeaderRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={localStyles.eyebrowGold}>4. FITTING & PRUEBAS DE VESTUARIO (M06)</Text>
                        <Text style={localStyles.titleSerif}>Pruebas Anatómicas y Control de Calce</Text>
                    </View>
                    {onOpenFullFittingTab && (
                        <TouchableOpacity
                            style={localStyles.goldBtn}
                            onPress={onOpenFullFittingTab}
                            activeOpacity={0.8}
                        >
                            <Text style={localStyles.goldBtnText}>Abrir Expediente de Fitting →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Resumen ejecutivo de pruebas y estado */}
                {latestSession && statusColors ? (
                    <View style={localStyles.compactBody}>
                        <View style={localStyles.compactKpiRow}>
                            <View style={localStyles.compactKpiItem}>
                                <Text style={localStyles.compactKpiLabel}>HISTORIAL</Text>
                                <Text style={localStyles.compactKpiValue}>
                                    {sessions.length} {sessions.length === 1 ? 'Prueba' : 'Pruebas'}
                                </Text>
                            </View>

                            <View style={localStyles.compactKpiItem}>
                                <Text style={localStyles.compactKpiLabel}>ÚLTIMA RONDA</Text>
                                <Text style={localStyles.compactKpiValue} numberOfLines={1}>
                                    {FITTING_ROUND_LABELS[latestSession.round_type] || latestSession.round_type}
                                </Text>
                            </View>

                            <View style={localStyles.compactKpiItem}>
                                <Text style={localStyles.compactKpiLabel}>ESTADO DE CALCE</Text>
                                <View
                                    style={[
                                        localStyles.compactStatusPill,
                                        {
                                            backgroundColor: statusColors.background,
                                            borderColor: statusColors.border,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            localStyles.compactStatusPillText,
                                            { color: statusColors.text },
                                        ]}
                                    >
                                        {statusColors.badgeLabel}
                                    </Text>
                                </View>
                            </View>

                            <View style={localStyles.compactKpiItem}>
                                <Text style={localStyles.compactKpiLabel}>AJUSTES ABIERTOS</Text>
                                <Text
                                    style={[
                                        localStyles.compactKpiValue,
                                        totalOpenAdjustmentsCount > 0 && { color: colors.error },
                                    ]}
                                >
                                    {totalOpenAdjustmentsCount} pendientes
                                </Text>
                            </View>
                        </View>

                        {/* Banner de entrega final o lista para entrega */}
                        {isDelivered && (
                            <View style={localStyles.compactDeliveryNotice}>
                                <Text style={localStyles.compactDeliveryNoticeText}>
                                    👑 Prenda entregada ceremonialmente a la clienta el{' '}
                                    {formatFittingDate(latestSession.delivery_confirmed_at)}
                                </Text>
                            </View>
                        )}

                        {!isDelivered && sessionReadyForDelivery && (
                            <View style={localStyles.compactReadyNotice}>
                                <Text style={localStyles.compactReadyNoticeText}>
                                    ✓ Calce final aprobado.{' '}
                                    {totalOpenAdjustmentsCount === 0
                                        ? 'Lista para ceremonial de entrega.'
                                        : `Pendiente resolver ${totalOpenAdjustmentsCount} ajustes de taller.`}
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={localStyles.emptyCompactBox}>
                        <Text style={localStyles.emptyCompactTitle}>Sin sesiones de prueba registradas</Text>
                        <Text style={localStyles.emptyCompactSub}>
                            La fase de fitting iniciará tras el corte de la glasilla o hilván base en taller.
                        </Text>
                        <TouchableOpacity
                            style={localStyles.primaryPillBtn}
                            onPress={onOpenFullFittingTab || handleOpenNewSession}
                        >
                            <Text style={localStyles.primaryPillBtnText}>+ Programar 1ª Prueba</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    // ==========================================================================
    // RENDERIZADO: MODO COMPLETO (PESTAÑA 'FITTING' DEL EXPEDIENTE)
    // ==========================================================================
    return (
        <View style={localStyles.fullContainer}>
            {/* ------------------------------------------------------------------ */}
            {/* 1. BARRA SUPERIOR DE ACCIONES EDITORIALES                          */}
            {/* ------------------------------------------------------------------ */}
            <View style={localStyles.tabTopBar}>
                <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={localStyles.eyebrowGold}>MÓDULO 06 · EXPEDIENTE SARTORIAL DE PRUEBAS</Text>
                    <Text style={localStyles.tabTitle}>Fitting, Ajustes Anatómicos & Entrega</Text>
                    <Text style={localStyles.tabSubtitle}>
                        Control físico sobre clienta, aplomo de alta costura y cierre ceremonial inmutable
                    </Text>
                </View>

                <View style={localStyles.topBarActions}>
                    <TouchableOpacity
                        style={localStyles.actionBtnPrimary}
                        onPress={handleOpenNewSession}
                        activeOpacity={0.85}
                    >
                        <Text style={localStyles.actionBtnPrimaryText}>+ Programar Prueba</Text>
                    </TouchableOpacity>

                    {/* Botón de Ceremonial de Entrega (Habilitado solo si calce final aprobado y 0 ajustes) */}
                    {sessionReadyForDelivery && !isDelivered && (
                        <TouchableOpacity
                            style={[
                                localStyles.actionBtnGold,
                                !canDeliver && localStyles.actionBtnDisabled,
                            ]}
                            onPress={() => handleOpenDelivery(sessionReadyForDelivery)}
                            disabled={!canDeliver}
                            activeOpacity={0.85}
                        >
                            <Text style={localStyles.actionBtnGoldText}>
                                {canDeliver ? '👑 Ceremonial de Entrega' : '👑 Entrega Bloqueada (Ajustes Abiertos)'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ------------------------------------------------------------------ */}
            {/* 2. BANNERS INLINE (CERO ALERT.ALERT EN WEB)                        */}
            {/* ------------------------------------------------------------------ */}
            {isConcurrencyConflict && (
                <View style={[fittingStyles.feedbackBanner, fittingStyles.concurrencyBanner]}>
                    <View style={{ flex: 1 }}>
                        <Text style={fittingStyles.concurrencyText}>
                            ⚠️ Conflicto de Concurrencia (PT409): Los datos de calce fueron modificados recientemente en otro dispositivo o sesión.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={localStyles.reloadBtn}
                        onPress={() => loadFittingData(selectedSessionId)}
                    >
                        <Text style={localStyles.reloadBtnText}>Recargar Expediente</Text>
                    </TouchableOpacity>
                </View>
            )}

            {errorMessage && !isConcurrencyConflict && (
                <View style={[fittingStyles.feedbackBanner, fittingStyles.errorBanner]}>
                    <Text style={fittingStyles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={fittingStyles.bannerDismissBtn}
                        onPress={() => setErrorMessage(null)}
                    >
                        <Text style={fittingStyles.bannerDismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Banner de ajustes anteriores pendientes (aviso no bloqueante pero visible) */}
            {openAdjustmentsFromOtherSessions.length > 0 && (
                <View style={localStyles.warningBanner}>
                    <Text style={localStyles.warningBannerText}>
                        📍 Hay {openAdjustmentsFromOtherSessions.length} ajustes pendientes de rondas previas.
                        Deben ser verificados o resueltos antes de confirmar la entrega final.
                    </Text>
                </View>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 3. ESTADO DE CARGA O EXPEDIENTE VACÍO                              */}
            {/* ------------------------------------------------------------------ */}
            {isLoading && !sessions.length ? (
                <View style={localStyles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={localStyles.loadingText}>Cargando historial de fitting y evidencias...</Text>
                </View>
            ) : sessions.length === 0 ? (
                <View style={localStyles.emptyFullState}>
                    <Text style={localStyles.emptyFullIcon}>✂️</Text>
                    <Text style={localStyles.emptyFullTitle}>No hay pruebas físicas programadas</Text>
                    <Text style={localStyles.emptyFullDescription}>
                        El proceso de Alta Costura By Katherine Carroll requiere al menos una prueba en glasilla (toile)
                        para verificar aplomo, caída de hombro y proporciones antes de cortar el tejido definitivo.
                    </Text>
                    <TouchableOpacity
                        style={localStyles.actionBtnPrimary}
                        onPress={handleOpenNewSession}
                    >
                        <Text style={localStyles.actionBtnPrimaryText}>+ Programar 1ª Prueba en Glasilla</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* -------------------------------------------------------------- */}
                    {/* 4. SELECTOR HORIZONTAL DE SESIONES / RONDAS                    */}
                    {/* -------------------------------------------------------------- */}
                    <View style={localStyles.sessionsTimelineContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={localStyles.sessionsTimelineScroll}
                        >
                            {sessions.map((sess, idx) => {
                                const isSelected = sess.id === selectedSession?.id;
                                const sessColors = getFittingSessionStatusColors(
                                    sess.status,
                                    sess.approval_scope,
                                    Boolean(sess.delivery_confirmed_at)
                                );
                                const roundTitle = FITTING_ROUND_LABELS[sess.round_type] || sess.round_type;

                                return (
                                    <TouchableOpacity
                                        key={sess.id}
                                        style={[
                                            localStyles.sessionTabPill,
                                            isSelected && localStyles.sessionTabPillActive,
                                        ]}
                                        onPress={() => setSelectedSessionId(sess.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text
                                                style={[
                                                    localStyles.sessionTabPillIndex,
                                                    isSelected && localStyles.sessionTabPillIndexActive,
                                                ]}
                                            >
                                                Ronda {idx + 1}
                                            </Text>
                                            <View
                                                style={[
                                                    localStyles.sessionTabDot,
                                                    { backgroundColor: sessColors.border },
                                                ]}
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                localStyles.sessionTabPillTitle,
                                                isSelected && localStyles.sessionTabPillTitleActive,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {roundTitle}
                                        </Text>
                                        <Text style={localStyles.sessionTabPillDate}>
                                            {formatFittingDate(sess.conducted_at || sess.scheduled_at)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* -------------------------------------------------------------- */}
                    {/* 5. VISTA DE LA SESIÓN SELECCIONADA                             */}
                    {/* -------------------------------------------------------------- */}
                    {selectedSession && (
                        <View style={localStyles.selectedSessionWrapper}>
                            {/* Tarjeta de sesión con aplomo, balance y acciones */}
                            <FittingSessionCard
                                session={selectedSession}
                                openAdjustmentsCount={currentSessionAdjustments.filter(
                                    (a) => a.status === 'pending' || a.status === 'applied'
                                ).length}
                                canDeliver={canDeliver}
                                onEdit={handleOpenEditSession}
                                onApprove={handleOpenApproveSession}
                                onAddAdjustment={handleOpenAddAdjustment}
                                onDeliver={handleOpenDelivery}
                            />

                            {/* Galería de evidencias fotográficas privadas */}
                            <FittingMediaGallery
                                session={selectedSession}
                                mediaAssets={selectedSession.mediaAssets || []}
                                signedUrls={selectedSession.signedMediaUrls || {}}
                                onMediaUpdated={() => loadFittingData(selectedSession.id)}
                            />

                            {/* Lista de ajustes específicos de esta prueba */}
                            <View style={localStyles.adjustmentsSectionCard}>
                                <View style={localStyles.sectionSubHeaderRow}>
                                    <View>
                                        <Text style={localStyles.sectionSubTitle}>
                                            AJUSTES DE ESTA PRUEBA ({currentSessionAdjustments.length})
                                        </Text>
                                        <Text style={localStyles.sectionSubDesc}>
                                            Correcciones anatómicas registradas durante esta sesión
                                        </Text>
                                    </View>
                                    {selectedSession.status !== 'approved' &&
                                        selectedSession.status !== 'cancelled' &&
                                        !selectedSession.delivery_confirmed_at && (
                                            <TouchableOpacity
                                                style={localStyles.addAdjustmentBtn}
                                                onPress={() => handleOpenAddAdjustment(selectedSession)}
                                            >
                                                <Text style={localStyles.addAdjustmentBtnText}>
                                                    + Añadir Ajuste
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                </View>

                                {currentSessionAdjustments.length === 0 ? (
                                    <View style={localStyles.emptyAdjustmentsBox}>
                                        <Text style={localStyles.emptyAdjustmentsText}>
                                            No se han registrado ajustes específicos en esta prueba.
                                        </Text>
                                    </View>
                                ) : (
                                    currentSessionAdjustments.map((adj) => (
                                        <FittingAdjustmentItem
                                            key={adj.id}
                                            adjustment={adj}
                                            isParentSessionSealed={
                                                selectedSession.status === 'approved' ||
                                                selectedSession.status === 'cancelled' ||
                                                Boolean(selectedSession.delivery_confirmed_at)
                                            }
                                            onApply={handleApplyAdjustment}
                                            onVerify={handleVerifyAdjustment}
                                            onWaive={handleWaiveAdjustment}
                                            onCancel={handleCancelAdjustment}
                                        />
                                    ))
                                )}
                            </View>

                            {/* Sección: Ajustes abiertos de pruebas anteriores */}
                            {openAdjustmentsFromOtherSessions.length > 0 && (
                                <View style={localStyles.previousAdjustmentsSectionCard}>
                                    <View style={localStyles.sectionSubHeaderRow}>
                                        <View>
                                            <Text style={localStyles.sectionSubTitleWarning}>
                                                📍 AJUSTES ABIERTOS DE PRUEBAS ANTERIORES ({openAdjustmentsFromOtherSessions.length})
                                            </Text>
                                            <Text style={localStyles.sectionSubDesc}>
                                                Correcciones previas pendientes de aplicar o verificar en taller
                                            </Text>
                                        </View>
                                    </View>

                                    {openAdjustmentsFromOtherSessions.map((adj) => (
                                        <FittingAdjustmentItem
                                            key={adj.id}
                                            adjustment={adj}
                                            isParentSessionSealed={false}
                                            onApply={handleApplyAdjustment}
                                            onVerify={handleVerifyAdjustment}
                                            onWaive={handleWaiveAdjustment}
                                            onCancel={handleCancelAdjustment}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* Puente M02 CAD de solo lectura y enlace */}
                            <View style={localStyles.cadBridgeCard}>
                                <View style={localStyles.cadBridgeHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={localStyles.cadBridgeEyebrow}>
                                            📐 PUENTE DE PATRONAJE CAD (MÓDULO 02)
                                        </Text>
                                        <Text style={localStyles.cadBridgeTitle}>
                                            {m02Context?.garmentType
                                                ? `Paquete: ${m02Context.garmentType}`
                                                : 'Patronaje Paramétrico Desacoplado'}
                                        </Text>
                                        <Text style={localStyles.cadBridgeDesc}>
                                            {m02Context?.summaryText ||
                                                'Los ajustes anatómicos registrados en fitting físico alimentan la confección y pueden sincronizarse con el patrón CAD sin alterar versiones selladas.'}
                                        </Text>
                                    </View>
                                    {onOpenCad && (
                                        <TouchableOpacity
                                            style={localStyles.cadBridgeBtn}
                                            onPress={onOpenCad}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={localStyles.cadBridgeBtnText}>
                                                Abrir Taller CAD / Fitting →
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 6. MODALES ORQUESTADOS                                             */}
            {/* ------------------------------------------------------------------ */}
            {/* Modal de Sesión de Prueba */}
            <FittingSessionModal
                visible={isSessionModalOpen}
                creationId={creation.id}
                initialSession={sessionModalInitialSession}
                onClose={() => setIsSessionModalOpen(false)}
                onSaved={handleSessionSaved}
            />

            {/* Modal de Ajuste Físico */}
            {adjustmentModalTargetSession && (
                <FittingAdjustmentModal
                    visible={isAdjustmentModalOpen}
                    session={adjustmentModalTargetSession}
                    initialAdjustment={adjustmentModalInitialAdjustment}
                    mode={adjustmentModalMode}
                    initialTargetStatus={adjustmentModalTargetStatus}
                    onClose={() => setIsAdjustmentModalOpen(false)}
                    onSaved={handleAdjustmentSaved}
                />
            )}

            {/* Modal de Dictamen de Calce / Aprobación */}
            {selectedSession && (
                <FittingApprovalModal
                    visible={isApprovalModalOpen}
                    session={selectedSession}
                    openAdjustmentsInCreationCount={totalOpenAdjustmentsCount}
                    onClose={() => setIsApprovalModalOpen(false)}
                    onApproved={handleSessionApproved}
                />
            )}

            {/* Modal de Ceremonial Solemne de Entrega */}
            {selectedSession && (
                <DeliveryCeremonyModal
                    visible={isDeliveryModalOpen}
                    session={selectedSession}
                    creationName={creation.name}
                    clientName={creation.client ? creation.client.full_name : 'Clienta de Atelier'}
                    pendingBalanceInfo={pendingBalanceInfo}
                    isFinanciallyCleared={commercialProfile?.payment_status === 'paid_in_full'}
                    balancePendingAmount={commercialProfile?.balance_pending_amount ?? null}
                    currency={commercialProfile?.currency || 'COP'}
                    onClose={() => setIsDeliveryModalOpen(false)}
                    onDelivered={handleDeliveryConfirmed}
                />
            )}
        </View>
    );
};

// ==============================================================================
// ESTILOS LOCALES ESPECÍFICOS DEL COMPONENTE
// ==============================================================================
const localStyles = StyleSheet.create({
    compactCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
        marginBottom: 16,
    },
    compactHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
    },
    eyebrowGold: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    titleSerif: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    goldBtn: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    goldBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.bronze,
    },
    compactBody: {
        marginTop: 4,
    },
    compactKpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        backgroundColor: colors.surfaceSubtle,
        padding: 12,
        borderRadius: 6,
        marginBottom: 10,
    },
    compactKpiItem: {
        flex: 1,
        minWidth: 110,
    },
    compactKpiLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 3,
    },
    compactKpiValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    compactStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    compactStatusPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    compactDeliveryNotice: {
        backgroundColor: '#F7F2E7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        padding: 10,
        borderRadius: 6,
        marginTop: 4,
    },
    compactDeliveryNoticeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.bronze,
    },
    compactReadyNotice: {
        backgroundColor: '#F1F7F2',
        borderWidth: 1,
        borderColor: '#C2DFCA',
        padding: 10,
        borderRadius: 6,
        marginTop: 4,
    },
    compactReadyNoticeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3D6346',
    },
    emptyCompactBox: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    emptyCompactTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
    },
    emptyCompactSub: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    primaryPillBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    primaryPillBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '700',
    },

    // Full Tab Styles
    fullContainer: {
        flex: 1,
        marginBottom: 20,
    },
    tabTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
        marginBottom: 16,
    },
    tabTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginVertical: 2,
    },
    tabSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    topBarActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionBtnPrimary: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 6,
        minHeight: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnPrimaryText: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    actionBtnGold: {
        backgroundColor: '#8A6A4A',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 6,
        minHeight: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnGoldText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    actionBtnDisabled: {
        opacity: 0.5,
    },
    reloadBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'center',
    },
    reloadBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
    },
    warningBanner: {
        backgroundColor: '#FFF8EC',
        borderWidth: 1,
        borderColor: '#F1D6A7',
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    warningBannerText: {
        fontSize: 12,
        color: '#8A5D18',
        fontWeight: '600',
        lineHeight: 17,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 13,
        color: colors.textSecondary,
    },
    emptyFullState: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyFullIcon: {
        fontSize: 36,
        marginBottom: 8,
    },
    emptyFullTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 6,
    },
    emptyFullDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 19,
        maxWidth: 500,
        marginBottom: 16,
    },
    sessionsTimelineContainer: {
        marginBottom: 16,
    },
    sessionsTimelineScroll: {
        gap: 10,
    },
    sessionTabPill: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 140,
    },
    sessionTabPillActive: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF7F2',
        borderWidth: 1.5,
    },
    sessionTabPillIndex: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    sessionTabPillIndexActive: {
        color: colors.bronze,
    },
    sessionTabDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    sessionTabPillTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginVertical: 2,
    },
    sessionTabPillTitleActive: {
        color: '#694F32',
    },
    sessionTabPillDate: {
        fontSize: 11,
        color: colors.textMuted,
    },
    selectedSessionWrapper: {
        gap: 16,
    },
    adjustmentsSectionCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
    },
    previousAdjustmentsSectionCard: {
        backgroundColor: '#FFFDF9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EFE0CD',
        padding: 16,
    },
    sectionSubHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    sectionSubTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.3,
    },
    sectionSubTitleWarning: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8A5D18',
        letterSpacing: 0.3,
    },
    sectionSubDesc: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    addAdjustmentBtn: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
    },
    addAdjustmentBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    emptyAdjustmentsBox: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    emptyAdjustmentsText: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    cadBridgeCard: {
        backgroundColor: '#FAF8F5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 16,
    },
    cadBridgeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    cadBridgeEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.bronze,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    cadBridgeTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
    },
    cadBridgeDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
        maxWidth: 600,
    },
    cadBridgeBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    cadBridgeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.bronze,
    },
});

