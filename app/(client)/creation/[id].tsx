// ==============================================================================
// ATELIER DIGITAL — PANTALLA DE DETALLE DE CREACIÓN DEL PORTAL (M09 P1.3)
// Archivo: app/(client)/creation/[id].tsx
// ==============================================================================
// Vista individual de una creación autorizada (creations:view) con:
// - Protección fail-closed ante UUID inválido o prenda no autorizada/inexistente.
// - Integración del lector aditivo P1.2 (fetchPortalCreationProgressView).
// - Stepper de 8 etapas M03 aplicando Opción A (proyecto más reciente principal +
//   acceso discreto a historial anterior sin mezclar cronologías).
// - Degradación elegante sin proyecto o ante PGRST205/42P01, y reintento ante
//   errores transitorios recuperables (H-05).
// - Layout responsive Atelier de Autor (móvil, tablet y escritorio).
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useClientPortal } from '../../../src/context/ClientPortalContext';
import { usePortalResponsive } from '../../../src/hooks/usePortalResponsive';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { PortalCreationProgressView, PortalViewReadResult } from '../../../src/types/portal';
import { fetchPortalCreationProgressView } from '../../../src/services/portalService';
import {
    formatBogotaDate,
    formatBogotaScheduleRange,
    formatCreationStatusLabel,
    formatCreationTypeLabel,
    formatCurrency,
    formatFittingRoundLabel,
    formatFittingStatusLabel,
    formatPaymentScheduleSummary,
    formatQuoteStatusLabel,
} from '../../../src/utils/portalFormatters';
import {
    classifyPortalProgressReadResult,
    isValidPortalUuid,
    PortalProgressDisplayState,
} from '../../../src/utils/portalCreationProgress';
import {
    CreationProgressStepper,
    PortalAccessRestrictedCard,
    PortalDemoModeBanner,
    PortalErrorBanner,
    PortalLegalCard,
    PortalTopBar,
} from '../../../src/components/portalClient';

export default function ClientCreationDetailScreen() {
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const creationId = typeof rawId === 'string' ? rawId.trim() : '';
    const isUuidValid = isValidPortalUuid(creationId);

    const responsive = usePortalResponsive();
    const {
        dashboard,
        loading: dashboardLoading,
        refreshing: dashboardRefreshing,
        uiError,
        reloadDashboard,
        refreshDashboard,
        signOutPortal,
        getAuthorizedCreationById,
        logTelemetryOnce,
    } = useClientPortal();

    const [progressLoading, setProgressLoading] = useState<boolean>(false);
    const [progressRecord, setProgressRecord] = useState<{
        creationId: string;
        result: PortalViewReadResult<PortalCreationProgressView[]>;
    } | null>(null);

    const access = dashboard?.access ?? null;
    const isRestricted = access?.status === 'suspended' || access?.status === 'revoked';
    const isPendingActivation = access?.status === 'invited';
    const isActiveAccess = access?.status === 'active';
    const hasUnauthorizedFailure = dashboard?.status === 'unauthorized';
    const hasTechnicalReadError = dashboard?.status === 'error' || Boolean(uiError);

    const creation = useMemo(
        () => (isUuidValid ? getAuthorizedCreationById(creationId) : null),
        [creationId, getAuthorizedCreationById, isUuidValid]
    );

    const creationFittings = useMemo(() => {
        if (!creation || !creation.can_view_fittings || !dashboard) return [];
        return dashboard.fittingSessions.filter((fs) => fs.creation_id === creation.id);
    }, [creation, dashboard]);

    const creationQuotes = useMemo(() => {
        if (!creation || !creation.can_view_budget || !dashboard) return [];
        return dashboard.commercialQuotes.filter((q) => q.creation_id === creation.id);
    }, [creation, dashboard]);

    const isDemoMode = Boolean(dashboard?.isDemoMode);

    const loadCreationProgress = useCallback(async () => {
        if (!isUuidValid || !creation || !isActiveAccess || isDemoMode) {
            return;
        }
        setProgressLoading(true);
        try {
            const res = await fetchPortalCreationProgressView({
                creationId: creation.id,
                allowedCreationIds: [creation.id],
            });
            setProgressRecord({ creationId: creation.id, result: res });
        } finally {
            setProgressLoading(false);
        }
    }, [creation, isActiveAccess, isDemoMode, isUuidValid]);

    useEffect(() => {
        if (!isUuidValid || !creation || !isActiveAccess || isDemoMode) {
            return;
        }

        let isMounted = true;
        logTelemetryOnce('view_creation', creation.id, {
            creation_id: creation.id,
            source: 'creation_detail',
        });

        async function fetchProgress() {
            const targetId = creation!.id;
            const res = await fetchPortalCreationProgressView({
                creationId: targetId,
                allowedCreationIds: [targetId],
            });
            if (isMounted) {
                setProgressRecord({ creationId: targetId, result: res });
            }
        }

        void fetchProgress();
        return () => {
            isMounted = false;
        };
    }, [creation, isActiveAccess, isDemoMode, isUuidValid, logTelemetryOnce]);

    const activeProgressResult =
        creation && progressRecord?.creationId === creation.id ? progressRecord.result : null;

    const progressState: PortalProgressDisplayState = useMemo(() => {
        if (!activeProgressResult) {
            return {
                kind: 'loading',
                primaryProject: null,
                historicalProjects: [],
                hasHistory: false,
                errorCode: null,
                errorMessage: null,
            };
        }
        return classifyPortalProgressReadResult(activeProgressResult);
    }, [activeProgressResult]);

    const handleBackToHome = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(client)' as any);
        }
    }, []);

    const handleRefreshAll = useCallback(async () => {
        await refreshDashboard();
        await loadCreationProgress();
    }, [loadCreationProgress, refreshDashboard]);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <PortalTopBar
                responsive={responsive}
                backLabel="Volver a mi dossier"
                onBack={handleBackToHome}
                onExploreAtelier={() => router.push('/diseno' as any)}
                onSignOut={signOutPortal}
            />

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        maxWidth: responsive.contentMaxWidth,
                        paddingHorizontal: responsive.horizontalPadding,
                    },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={dashboardRefreshing || progressLoading}
                        onRefresh={handleRefreshAll}
                        tintColor={colors.accent}
                        colors={[colors.accent]}
                    />
                }
            >
                {/* Banner de MODO DEMO si el backend base no está disponible */}
                {dashboard?.isDemoMode && !hasUnauthorizedFailure && <PortalDemoModeBanner />}

                {/* Caso 1: Identificador de ruta inválido (fail-closed, 0 consultas) */}
                {!isUuidValid ? (
                    <View style={[styles.neutralCard, { padding: responsive.cardPadding }]}>
                        <Text style={styles.neutralEyebrow}>IDENTIFICADOR NO VÁLIDO</Text>
                        <Text style={styles.neutralTitle}>
                            Enlace de Creación Incorrecto
                        </Text>
                        <Text style={styles.neutralText}>
                            El identificador recibido en la dirección no corresponde a una creación válida de tu dossier. Regresa al inicio de tu portal para seleccionar tus prendas autorizadas.
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryReturnButton}
                            onPress={handleBackToHome}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryReturnButtonText}>
                                ← VOLVER A MI DOSSIER
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : dashboardLoading ? (
                    /* Caso 2: Hidratación de credenciales y dossier */
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.loadingText}>
                            Verificando autorización y cargando ficha de tu creación...
                        </Text>
                    </View>
                ) : hasUnauthorizedFailure ? (
                    <PortalErrorBanner
                        message="No fue posible verificar tu autorización vigente sobre el dossier protegido. Si tu acceso fue modificado recientemente, vuelve a intentarlo o contacta al atelier."
                        retryLabel="Reintentar Verificación"
                        onRetry={reloadDashboard}
                    />
                ) : hasTechnicalReadError ? (
                    <PortalErrorBanner
                        message={
                            uiError ||
                            'Ocurrió una interrupción temporal al consultar tu dossier protegido. Tus datos permanecen resguardados.'
                        }
                        retryLabel="Reintentar Carga"
                        onRetry={reloadDashboard}
                    />
                ) : isRestricted ? (
                    <PortalAccessRestrictedCard
                        variant="restricted"
                        responsive={responsive}
                        onContactAtelier={() => router.push('/contacto' as any)}
                    />
                ) : isPendingActivation ? (
                    <PortalAccessRestrictedCard
                        variant="pending_activation"
                        responsive={responsive}
                        onContactAtelier={() => router.push('/contacto' as any)}
                    />
                ) : !isActiveAccess && !dashboard?.isDemoMode ? (
                    <PortalAccessRestrictedCard
                        variant="unlinked"
                        responsive={responsive}
                        onContactAtelier={() => router.push('/contacto' as any)}
                    />
                ) : !creation ? (
                    /* Caso 3: Creación inexistente o no autorizada (respuesta neutra anti-oráculo) */
                    <View style={[styles.neutralCard, { padding: responsive.cardPadding }]}>
                        <Text style={styles.neutralEyebrow}>ACCESO PROTEGIDO · ZERO TRUST</Text>
                        <Text style={styles.neutralTitle}>
                            Creación No Disponible en tu Dossier
                        </Text>
                        <Text style={styles.neutralText}>
                            Esta prenda no se encuentra habilitada actualmente para visualización en tu portal. Si acabas de recibir una actualización del atelier, recarga tu dossier o comunícate con Katherine Carroll.
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryReturnButton}
                            onPress={handleBackToHome}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryReturnButtonText}>
                                ← VOLVER A MI DOSSIER
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Caso 4: Creación autorizada verificada */
                    <>
                        <View
                            style={[
                                styles.detailLayout,
                                responsive.isDesktop && styles.detailLayoutDesktop,
                            ]}
                        >
                            {/* Columna Principal */}
                            <View
                                style={[
                                    styles.mainColumn,
                                    responsive.isDesktop && styles.mainColumnDesktop,
                                ]}
                            >
                                {/* Hero Editorial de la Creación */}
                                <View
                                    style={[
                                        styles.heroCard,
                                        { padding: responsive.cardPadding },
                                    ]}
                                >
                                    <View style={styles.heroHeaderRow}>
                                        <Text style={styles.heroEyebrow}>
                                            {formatCreationTypeLabel(
                                                creation.creation_type
                                            ).toUpperCase()}
                                        </Text>
                                        <View style={styles.heroStatusBadge}>
                                            <Text style={styles.heroStatusBadgeText}>
                                                {formatCreationStatusLabel(creation.status)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text
                                        style={[
                                            styles.heroTitle,
                                            responsive.isMobile && styles.heroTitleMobile,
                                        ]}
                                    >
                                        {creation.name}
                                    </Text>

                                    {creation.description ? (
                                        <Text style={styles.heroDescription}>
                                            {creation.description}
                                        </Text>
                                    ) : (
                                        <Text style={styles.heroDescriptionMuted}>
                                            Pieza exclusiva en diseño y confección artesanal de alta costura By Katherine Carroll.
                                        </Text>
                                    )}
                                </View>

                                {/* Stepper de Progreso M03 (Lector P1.2 + Opción A) */}
                                <CreationProgressStepper
                                    creationStatus={creation.status}
                                    progressState={progressState}
                                    responsive={responsive}
                                    onRetry={loadCreationProgress}
                                />

                                {/* Pruebas de Calce vinculadas (solo si can_view_fittings === true) */}
                                {creation.can_view_fittings && (
                                    <View
                                        style={[
                                            styles.contextCard,
                                            { padding: responsive.cardPadding },
                                        ]}
                                    >
                                        <Text style={styles.sectionEyebrow}>
                                            PRUEBAS DE CALCE DE ESTA PRENDA
                                        </Text>
                                        {creationFittings.length === 0 ? (
                                            <Text style={styles.contextEmptyText}>
                                                Aún no hay sesiones de prueba publicadas para esta creación.
                                            </Text>
                                        ) : (
                                            <View style={styles.contextList}>
                                                {creationFittings.map((fitting) => (
                                                    <View
                                                        key={fitting.id}
                                                        style={styles.contextRowCard}
                                                    >
                                                        <View style={styles.contextRowHeader}>
                                                            <Text style={styles.contextRowTitle}>
                                                                {fitting.title ||
                                                                    formatFittingRoundLabel(
                                                                        fitting.round_type
                                                                    )}
                                                            </Text>
                                                            <Text style={styles.contextRowBadge}>
                                                                {formatFittingStatusLabel(
                                                                    fitting.status
                                                                )}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.contextRowMeta}>
                                                            {fitting.conducted_at
                                                                ? `Realizada: ${formatBogotaDate(fitting.conducted_at)}`
                                                                : fitting.scheduled_at
                                                                  ? formatBogotaScheduleRange(
                                                                        fitting.scheduled_at,
                                                                        null
                                                                    )
                                                                  : 'Fecha por confirmar en atelier'}
                                                        </Text>
                                                        {fitting.location_note && (
                                                            <Text style={styles.contextRowMeta}>
                                                                Sala: {fitting.location_note}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Cotizaciones vinculadas (solo si can_view_budget === true) */}
                                {creation.can_view_budget && (
                                    <View
                                        style={[
                                            styles.contextCard,
                                            { padding: responsive.cardPadding },
                                        ]}
                                    >
                                        <Text style={styles.sectionEyebrow}>
                                            COTIZACIÓN FORMAL DE ESTA PRENDA
                                        </Text>
                                        {creationQuotes.length === 0 ? (
                                            <Text style={styles.contextEmptyText}>
                                                No hay propuestas económicas emitidas aún para esta creación.
                                            </Text>
                                        ) : (
                                            <View style={styles.contextList}>
                                                {creationQuotes.map((quote) => {
                                                    const scheduleText =
                                                        formatPaymentScheduleSummary(
                                                            quote.payment_schedule
                                                        );
                                                    return (
                                                        <View
                                                            key={quote.id}
                                                            style={styles.contextRowCard}
                                                        >
                                                            <View style={styles.contextRowHeader}>
                                                                <Text
                                                                    style={styles.contextRowTitle}
                                                                >
                                                                    {quote.quote_number ||
                                                                        'Propuesta Formal'}
                                                                </Text>
                                                                <Text
                                                                    style={styles.contextRowBadge}
                                                                >
                                                                    {formatQuoteStatusLabel(
                                                                        quote.status
                                                                    )}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.quoteAmount}>
                                                                {formatCurrency(
                                                                    quote.total_amount,
                                                                    quote.currency
                                                                )}
                                                            </Text>
                                                            {quote.valid_until && (
                                                                <Text style={styles.contextRowMeta}>
                                                                    Vigencia:{' '}
                                                                    {formatBogotaDate(
                                                                        quote.valid_until
                                                                    )}
                                                                </Text>
                                                            )}
                                                            {scheduleText && (
                                                                <Text style={styles.contextRowMeta}>
                                                                    Plan de pagos: {scheduleText}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Barra Lateral Editorial (Ficha Técnica y Permisos Autorizados) */}
                            <View
                                style={[
                                    styles.sideColumn,
                                    responsive.isDesktop && styles.sideColumnDesktop,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.sideCard,
                                        { padding: responsive.cardPadding },
                                    ]}
                                >
                                    <Text style={styles.sectionEyebrow}>FICHA DE LA CREACIÓN</Text>
                                    <View style={styles.metaList}>
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaLabel}>Categoría</Text>
                                            <Text style={styles.metaValue}>
                                                {formatCreationTypeLabel(creation.creation_type)}
                                            </Text>
                                        </View>
                                        {creation.occasion && (
                                            <View style={styles.metaRow}>
                                                <Text style={styles.metaLabel}>Ocasión</Text>
                                                <Text style={styles.metaValue}>
                                                    {creation.occasion}
                                                </Text>
                                            </View>
                                        )}
                                        {creation.garment_type && (
                                            <View style={styles.metaRow}>
                                                <Text style={styles.metaLabel}>Silueta</Text>
                                                <Text style={styles.metaValue}>
                                                    {creation.garment_type}
                                                </Text>
                                            </View>
                                        )}
                                        {creation.target_date && (
                                            <View style={styles.metaRow}>
                                                <Text style={styles.metaLabel}>
                                                    Fecha Objetivo
                                                </Text>
                                                <Text style={styles.metaValue}>
                                                    {formatBogotaDate(creation.target_date)}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaLabel}>Inicio en Dossier</Text>
                                            <Text style={styles.metaValue}>
                                                {formatBogotaDate(creation.created_at)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View
                                    style={[
                                        styles.sideCard,
                                        { padding: responsive.cardPadding },
                                    ]}
                                >
                                    <Text style={styles.sectionEyebrow}>
                                        ELEMENTOS HABILITADOS
                                    </Text>
                                    <View style={styles.permList}>
                                        <Text style={styles.permItemActive}>
                                            ✦ Ficha y seguimiento de la prenda
                                        </Text>
                                        <Text
                                            style={
                                                creation.can_view_sketches
                                                    ? styles.permItemActive
                                                    : styles.permItemReserved
                                            }
                                        >
                                            {creation.can_view_sketches
                                                ? '✦ Bocetos de diseño autorizados'
                                                : '· Bocetos reservados en taller'}
                                        </Text>
                                        <Text
                                            style={
                                                creation.can_view_fabrics
                                                    ? styles.permItemActive
                                                    : styles.permItemReserved
                                            }
                                        >
                                            {creation.can_view_fabrics
                                                ? '✦ Selección textil autorizada'
                                                : '· Selección textil reservada en taller'}
                                        </Text>
                                        <Text
                                            style={
                                                creation.can_view_fittings
                                                    ? styles.permItemActive
                                                    : styles.permItemReserved
                                            }
                                        >
                                            {creation.can_view_fittings
                                                ? '✦ Pruebas de calce habilitadas'
                                                : '· Pruebas en coordinación de taller'}
                                        </Text>
                                        <Text
                                            style={
                                                creation.can_view_budget
                                                    ? styles.permItemActive
                                                    : styles.permItemReserved
                                            }
                                        >
                                            {creation.can_view_budget
                                                ? '✦ Cotización formal habilitada'
                                                : '· Propuesta económica reservada'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <PortalLegalCard
                            responsive={responsive}
                            onOpenLegalRoute={(routePath) => router.push(routePath as any)}
                            onOpenArcoRequest={() =>
                                router.push({
                                    pathname: '/contacto' as any,
                                    params: { servicio: 'proteccion-datos' },
                                })
                            }
                        />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingVertical: 24,
        width: '100%',
        alignSelf: 'center',
    },
    loadingContainer: {
        paddingVertical: 64,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
    },
    neutralCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 20,
    },
    neutralEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    neutralTitle: {
        color: colors.textPrimary,
        fontSize: 19,
        fontWeight: '600',
        fontFamily: typography.serif,
        textAlign: 'center',
        marginBottom: 8,
    },
    neutralText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 560,
        marginBottom: 20,
    },
    primaryReturnButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 4,
        paddingHorizontal: 18,
        paddingVertical: 11,
    },
    primaryReturnButtonText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    detailLayout: {
        gap: 20,
    },
    detailLayoutDesktop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 24,
    },
    mainColumn: {
        width: '100%',
    },
    mainColumnDesktop: {
        flex: 1.85,
    },
    sideColumn: {
        width: '100%',
    },
    sideColumnDesktop: {
        flex: 1,
    },
    heroCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        marginBottom: 20,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    heroEyebrow: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    heroStatusBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    heroStatusBadgeText: {
        color: colors.accentDark,
        fontSize: 11,
        fontWeight: '600',
    },
    heroTitle: {
        color: colors.textPrimary,
        fontSize: 24,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 10,
    },
    heroTitleMobile: {
        fontSize: 21,
    },
    heroDescription: {
        color: colors.textSecondary,
        fontSize: 13.5,
        lineHeight: 21,
    },
    heroDescriptionMuted: {
        color: colors.textMuted,
        fontSize: 13,
        lineHeight: 20,
    },
    contextCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        marginBottom: 20,
    },
    sectionEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    contextEmptyText: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
    },
    contextList: {
        gap: 10,
    },
    contextRowCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 4,
        padding: 12,
        gap: 4,
    },
    contextRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    contextRowTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '600',
    },
    contextRowBadge: {
        color: colors.accentDark,
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    contextRowMeta: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    quoteAmount: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: typography.serif,
        marginVertical: 2,
    },
    sideCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        marginBottom: 20,
    },
    metaList: {
        gap: 10,
    },
    metaRow: {
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    metaLabel: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metaValue: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '500',
    },
    permList: {
        gap: 8,
    },
    permItemActive: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    permItemReserved: {
        color: colors.textMuted,
        fontSize: 12,
    },
});
