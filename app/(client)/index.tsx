// ==============================================================================
// ATELIER DIGITAL — PORTAL WEB DE CLIENTA AUTENTICADA (M09-B.3 / B.6 / B.7)
// Archivo: app/(client)/index.tsx
// ==============================================================================
// Experiencia editorial de alta costura para clientas autenticadas de By Katherine Carroll.
// Gobierna:
// 1. Lectura exclusiva desde las 6 vistas canónicas SECURITY BARRIER (v_portal_*).
// 2. Control de ciclo de vida de acceso (invited/active/suspended/revoked).
// 3. Gobernanza Zero Trust sobre public.client_portal_permissions (Única Fuente de Verdad).
// 4. Doble Candado por Creación: Nivel 1 (global) + Nivel 2 (granular por prenda).
// 5. Cero ampliación ni fabricación de datos (sin medidas hardcodeadas ni muestras locales).
// 6. Telemetría no bloqueante vía public.log_portal_event (jamás simulada en MODO DEMO).
// 7. Transparencia de entorno y cumplimiento Ley 1581 de 2012 (Habeas Data).
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { LEGAL_DOCUMENT_VERSIONS } from '../../src/constants/legalDocuments';
import {
    ClientPortalDashboardData,
    PortalAppointmentView,
    PortalCommercialQuoteView,
    PortalCreationView,
    PortalFittingSessionView,
    PortalMeasurementSessionView,
} from '../../src/types/portal';
import {
    fetchClientPortalDashboardData,
    logPortalTelemetryEvent,
} from '../../src/services/portalService';

const BOGOTA_TIMEZONE = 'America/Bogota';

function toSafeDateObject(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    const trimmed = String(dateStr).trim();
    if (!trimmed) return null;
    // Las columnas DATE sin hora (YYYY-MM-DD) se anclan al mediodía de Bogotá para evitar desfase -05:00
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? `${trimmed}T12:00:00-05:00`
        : trimmed;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatBogotaDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const parsed = toSafeDateObject(dateStr);
    if (!parsed) return String(dateStr);
    try {
        return new Intl.DateTimeFormat('es-CO', {
            timeZone: BOGOTA_TIMEZONE,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(parsed);
    } catch {
        return String(dateStr);
    }
}

function formatBogotaTime(dateStr?: string | null): string {
    if (!dateStr) return '';
    const parsed = toSafeDateObject(dateStr);
    if (!parsed) return '';
    try {
        return new Intl.DateTimeFormat('es-CO', {
            timeZone: BOGOTA_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(parsed);
    } catch {
        return '';
    }
}

function formatBogotaScheduleRange(startsAt?: string | null, endsAt?: string | null): string {
    if (!startsAt) return 'Por confirmar';
    const dateLabel = formatBogotaDate(startsAt);
    const startTime = formatBogotaTime(startsAt);
    const endTime = formatBogotaTime(endsAt);
    if (startTime && endTime) {
        return `${dateLabel} · ${startTime} – ${endTime} (COT)`;
    }
    if (startTime) {
        return `${dateLabel} · ${startTime} (COT)`;
    }
    return dateLabel;
}

function formatCurrency(amount?: number | null, curr: string = 'COP'): string {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
    try {
        return `$ ${amount.toLocaleString('es-CO')} ${curr}`;
    } catch {
        return `$ ${amount} ${curr}`;
    }
}

function formatCreationTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
        bespoke: 'Alta Costura a Medida',
        pret_a_couture: 'Prêt-à-Couture',
        couture_collection: 'Pieza de Colección',
        bridal: 'Nupcial & Novia',
        gala: 'Gala & Fiesta',
        corporate: 'Sastrería de Autor',
        fantasy: 'Vestuario de Arte',
        alteration: 'Restauración de Alta Costura',
    };
    return (type && map[type]) || 'Diseño de Autor';
}

function formatCreationStatusLabel(st?: string | null): string {
    const map: Record<string, string> = {
        draft: 'Borrador de Taller',
        active: 'En Diseño Activo',
        fitting: 'En Pruebas de Calce',
        approved: 'Aprobada para Confección',
        production: 'En Corte y Confección',
        completed: 'Finalizada y Entregada',
        cancelled: 'Archivada',
    };
    return (st && map[st]) || st || 'Activa';
}

function formatAppointmentTypeLabel(type?: string | null): string {
    switch (type) {
        case 'toile_fitting':
            return 'PRUEBA DE RETOR (TOILE)';
        case 'garment_fitting':
            return 'PRUEBA DE VESTUARIO';
        case 'final_fitting':
            return 'PRUEBA FINAL DE CALCE';
        case 'consultation':
            return 'CONSULTA DE DISEÑO';
        case 'design_presentation':
            return 'PRESENTACIÓN DE BOCETOS';
        case 'measurement_session':
            return 'TOMA DE MEDIDAS';
        case 'delivery_ceremony':
            return 'ENTREGA DE PRENDA';
        default:
            return 'CITA ATELIER';
    }
}

function formatAppointmentStatusLabel(status?: string | null): string {
    switch (status) {
        case 'confirmed':
            return 'CONFIRMADA';
        case 'completed':
            return 'REALIZADA';
        case 'rescheduled':
            return 'REPROGRAMADA';
        case 'scheduled':
        default:
            return 'PROGRAMADA';
    }
}

function formatQuoteStatusLabel(status?: string | null): string {
    switch (status) {
        case 'accepted':
        case 'approved':
            return 'APROBADA';
        case 'sent':
            return 'VIGENTE';
        case 'expired':
            return 'VENCIDA';
        default:
            return 'FORMALIZADA';
    }
}

// E3.1 — Enums canónicos M06 (src/types/fitting.ts)
// FITTING_ROUND_TYPES: 'toile_first' | 'second_fitting' | 'final_fitting' | 'alteration_check' | 'extra_fitting'
function formatFittingRoundLabel(roundType?: string | null): string {
    switch (roundType) {
        case 'toile_first':
            return '1ª Prueba en Glasilla (Toile)';
        case 'second_fitting':
            return '2ª Prueba en Tela Definitiva';
        case 'final_fitting':
            return 'Prueba Final de Acabados';
        case 'alteration_check':
            return 'Revisión de Transformación';
        case 'extra_fitting':
            return 'Prueba Intermedia Adicional';
        default:
            return 'Sesión de Prueba de Calce';
    }
}

// E3.1 — FITTING_SESSION_STATUSES: 'scheduled' | 'completed' | 'adjustments_required' | 'approved' | 'cancelled'
function formatFittingStatusLabel(status?: string | null): string {
    switch (status) {
        case 'scheduled':
            return 'PROGRAMADA';
        case 'completed':
            return 'REALIZADA';
        case 'adjustments_required':
            return 'CON AJUSTES';
        case 'approved':
            return 'CALCE APROBADO';
        case 'cancelled':
            return 'CANCELADA';
        default:
            return 'PROGRAMADA';
    }
}

function formatMeasurementStatusLabel(status?: string | null): string {
    if (status === 'verified') return 'VERIFICADA';
    if (status === 'completed') return 'COMPLETADA';
    return 'REGISTRADA';
}

function formatPaymentScheduleSummary(
    schedule: PortalCommercialQuoteView['payment_schedule']
): string | null {
    if (!schedule) return null;
    if (typeof schedule === 'string') {
        const clean = schedule.trim();
        return clean.length > 0 ? clean : null;
    }
    if (Array.isArray(schedule)) {
        if (schedule.length === 0) return null;
        return `${schedule.length} ${schedule.length === 1 ? 'hito de pago acordado' : 'hitos de pago acordados'}`;
    }
    if (typeof schedule === 'object') {
        const keys = Object.keys(schedule);
        if (keys.length === 0) return null;
        if (typeof schedule.summary === 'string' && schedule.summary.trim()) {
            return schedule.summary.trim();
        }
        return 'Plan de pagos formalizado en documento comercial.';
    }
    return null;
}

export default function ClientHomeScreen() {
    const { user, profile, signOut } = useAuth();
    const authUserId = user?.id ?? null;
    const authUserEmail = user?.email ?? null;

    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [dashboard, setDashboard] = useState<ClientPortalDashboardData | null>(null);
    const [uiError, setUiError] = useState<string | null>(null);
    const lastLoggedAccessIdRef = useRef<string | null>(null);

    const applyDashboardResult = useCallback((result: ClientPortalDashboardData) => {
        setDashboard(result);
        setUiError(null);

        if (
            result.status === 'ok' &&
            result.access?.status === 'active' &&
            !result.isDemoMode &&
            lastLoggedAccessIdRef.current !== result.access.id
        ) {
            lastLoggedAccessIdRef.current = result.access.id;
            const authorizedModules =
                Number(result.projection.creationModules.hasAnyVisibleCreation) +
                Number(result.projection.globalModules.measurementsView) +
                Number(
                    result.projection.globalModules.quotationsView ||
                        result.commercialQuotes.length > 0
                ) +
                Number(result.projection.globalModules.appointmentsView) +
                Number(result.projection.creationModules.hasAnyVisibleFittings);

            void logPortalTelemetryEvent('view_portal_home', {
                visible_creations: result.creations.length,
                authorized_modules: authorizedModules,
            });
        }
    }, []);

    const loadClientDashboard = useCallback(async () => {
        try {
            setUiError(null);
            const result = await fetchClientPortalDashboardData({
                authUserId,
                userEmail: authUserEmail,
            });
            applyDashboardResult(result);
        } catch {
            setUiError(
                'No pudimos actualizar tu dossier digital en este momento. Intenta nuevamente en unos segundos.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [applyDashboardResult, authUserEmail, authUserId]);

    useEffect(() => {
        let isMounted = true;
        async function initialLoad() {
            try {
                const result = await fetchClientPortalDashboardData({
                    authUserId,
                    userEmail: authUserEmail,
                });
                if (isMounted) {
                    applyDashboardResult(result);
                }
            } catch {
                if (isMounted) {
                    setUiError(
                        'No pudimos cargar tu espacio privado en este momento. Por favor reintenta.'
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }
        void initialLoad();
        return () => {
            isMounted = false;
        };
    }, [applyDashboardResult, authUserEmail, authUserId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void loadClientDashboard();
    }, [loadClientDashboard]);

    const handleSignOut = async () => {
        if (dashboard?.access?.status === 'active' && !dashboard.isDemoMode) {
            await logPortalTelemetryEvent('auth_logout', {
                source: 'client_dashboard',
            }).catch(() => undefined);
        }
        await signOut();
    };

    const access = dashboard?.access ?? null;
    const projection = dashboard?.projection ?? null;
    const viewProfile = dashboard?.profile ?? null;
    const creations: PortalCreationView[] = useMemo(
        () => dashboard?.creations ?? [],
        [dashboard?.creations]
    );
    const measurementSessions: PortalMeasurementSessionView[] =
        dashboard?.measurementSessions ?? [];
    const commercialQuotes: PortalCommercialQuoteView[] = dashboard?.commercialQuotes ?? [];
    const appointments: PortalAppointmentView[] = dashboard?.appointments ?? [];
    const fittingSessions: PortalFittingSessionView[] = dashboard?.fittingSessions ?? [];

    const authorizedCreationNameMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const cr of creations) {
            map.set(cr.id, cr.name);
        }
        return map;
    }, [creations]);

    const displayName =
        viewProfile?.full_name ||
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        'Clienta de Alta Costura';
    const displayEmail = viewProfile?.email || profile?.email || user?.email || '';
    const displayCity = viewProfile?.city || null;

    const isRestricted = access?.status === 'suspended' || access?.status === 'revoked';
    const isPendingActivation = access?.status === 'invited';
    const isActiveAccess = access?.status === 'active';
    const hasUnauthorizedFailure = dashboard?.status === 'unauthorized';
    const hasTechnicalReadError = dashboard?.status === 'error' || Boolean(uiError);

    const hasQuotationsSection =
        Boolean(projection?.globalModules.quotationsView) || commercialQuotes.length > 0;

    const hasAnySectionToShow = Boolean(
        projection?.hasAnyAuthorizedModule || commercialQuotes.length > 0
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Barra Superior Editorial */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.brandTitle}>ATELIER DIGITAL</Text>
                    <Text style={styles.brandSubtitle}>
                        Espacio de Clienta · By Katherine Carroll
                    </Text>
                </View>

                <View style={styles.topBarActions}>
                    <TouchableOpacity
                        style={styles.publicHomeButton}
                        onPress={() => router.push('/diseno' as any)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.publicHomeButtonText}>Explorar Atelier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent}
                        colors={[colors.accent]}
                    />
                }
            >
                {/* Banner Explícito y Aislado de MODO DEMO */}
                {dashboard?.isDemoMode && !hasUnauthorizedFailure && (
                    <View style={styles.demoBanner}>
                        <View style={styles.demoBannerHeader}>
                            <Text style={styles.demoBannerIcon}>✦</Text>
                            <Text style={styles.demoBannerTitle}>
                                MODO DEMO · VISTAS CANÓNICAS NO DISPONIBLES
                            </Text>
                        </View>
                        <Text style={styles.demoBannerText}>
                            El backend seguro del portal (M09-A v2.10) aún no está disponible en este entorno. Por protección Zero Trust no se muestran datos simulados ni se registra telemetría ficticia en memoria local.
                        </Text>
                    </View>
                )}

                {/* Estado de Carga */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.loadingText}>
                            Verificando credenciales de clienta y permisos del dossier...
                        </Text>
                    </View>
                )}

                {/* Error de Autorización RLS o Sesión Inválida (Zero Data Leak; sin DEMO) */}
                {!loading && hasUnauthorizedFailure && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>
                            ✦ No fue posible verificar tu autorización vigente sobre el dossier protegido. Si tu acceso fue modificado recientemente, vuelve a intentarlo o contacta al atelier.
                        </Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadClientDashboard}>
                            <Text style={styles.retryButtonText}>Reintentar Verificación</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Error Técnico Sanitizado */}
                {!loading && !hasUnauthorizedFailure && hasTechnicalReadError && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>
                            ✦{' '}
                            {uiError ||
                                'Ocurrió una interrupción temporal al consultar tu dossier protegido. Tus datos permanecen resguardados.'}
                        </Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadClientDashboard}>
                            <Text style={styles.retryButtonText}>Reintentar Carga</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && (
                    <>
                        {/* Tarjeta de Identidad y Bienvenida */}
                        <View style={styles.welcomeCard}>
                            <View style={styles.welcomeHeaderRow}>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>CLIENTA AUTENTICADA</Text>
                                </View>
                                {access && (
                                    <View
                                        style={[
                                            styles.statusPill,
                                            access.status === 'active' && styles.statusPillActive,
                                            access.status === 'invited' && styles.statusPillInvited,
                                            access.status === 'suspended' &&
                                                styles.statusPillSuspended,
                                            access.status === 'revoked' && styles.statusPillRevoked,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusPillText,
                                                access.status === 'active' &&
                                                    styles.statusPillTextActive,
                                                access.status === 'invited' &&
                                                    styles.statusPillTextInvited,
                                                access.status === 'suspended' &&
                                                    styles.statusPillTextSuspended,
                                                access.status === 'revoked' &&
                                                    styles.statusPillTextRevoked,
                                            ]}
                                        >
                                            {access.status === 'active' && 'ACTIVA'}
                                            {access.status === 'invited' &&
                                                'INVITADA · CONFIRMACIÓN PENDIENTE'}
                                            {access.status === 'suspended' &&
                                                'SUSPENDIDA TEMPORALMENTE'}
                                            {access.status === 'revoked' && 'ACCESO REVOCADO'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.greetingTitle}>Bienvenida, {displayName}</Text>
                            {(displayEmail || displayCity) && (
                                <Text style={styles.greetingSubtitle}>
                                    {displayEmail}
                                    {displayEmail && displayCity ? ' · ' : ''}
                                    {displayCity || ''}
                                </Text>
                            )}

                            <View style={styles.divider} />

                            <Text style={styles.sessionInfoText}>
                                Canal cifrado bajo aislamiento estricto por fila (RLS) y vistas protegidas. Solo se despliega información autorizada explícitamente para tu cuenta.
                            </Text>
                        </View>

                        {/* ESTADO 1: ACCESO RESTRINGIDO (suspended o revoked) */}
                        {isRestricted ? (
                            <View style={styles.restrictedCard}>
                                <Text style={styles.restrictedIcon}>🔒</Text>
                                <Text style={styles.restrictedTitle}>
                                    Acceso al Portal Restringido
                                </Text>
                                <Text style={styles.restrictedText}>
                                    Tu acceso a las vistas interactivas del atelier ha sido pausado o revocado según las políticas de privacidad del taller. Para reactivar tu dossier digital, comunícate directamente con Katherine Carroll.
                                </Text>
                                <TouchableOpacity
                                    style={styles.contactAtelierButton}
                                    onPress={() => router.push('/contacto' as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.contactAtelierButtonText}>
                                        CONTACTAR A KATHERINE CARROLL →
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : isPendingActivation ? (
                            /* ESTADO 2: INVITACIÓN PENDIENTE DE CONFIRMACIÓN (invited) */
                            <View style={styles.restrictedCard}>
                                <Text style={styles.restrictedIcon}>✦</Text>
                                <Text style={styles.restrictedTitle}>
                                    Confirmación de Invitación Pendiente
                                </Text>
                                <Text style={styles.restrictedText}>
                                    Tu vínculo al Portal de Clientas se encuentra en estado invitado. Por política Zero Trust, ninguna creación, medida, cotización o cita se libera hasta completar la aceptación segura desde el enlace enviado por Katherine Carroll.
                                </Text>
                                <TouchableOpacity
                                    style={styles.contactAtelierButton}
                                    onPress={() => router.push('/contacto' as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.contactAtelierButtonText}>
                                        SOLICITAR ASISTENCIA AL ATELIER →
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : !isActiveAccess && !dashboard?.isDemoMode ? (
                            /* ESTADO 3: SIN REGISTRO DE PORTAL ACTIVO O SIN AUTORIZACIÓN */
                            <View style={styles.restrictedCard}>
                                <Text style={styles.restrictedIcon}>✧</Text>
                                <Text style={styles.restrictedTitle}>
                                    Portal Privado sin Vinculación Activa
                                </Text>
                                <Text style={styles.restrictedText}>
                                    Esta cuenta aún no dispone de un acceso activo al Portal de Clientas. Si recibiste una invitación privada, ábrela desde el enlace oficial compartido por tu diseñadora.
                                </Text>
                                <TouchableOpacity
                                    style={styles.contactAtelierButton}
                                    onPress={() => router.push('/contacto' as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.contactAtelierButtonText}>
                                        CONTACTAR A KATHERINE CARROLL →
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* ESTADO 4: PORTAL ACTIVO (o vista DEMO explícita sin datos simulados) */
                            <>
                                {/* Tarjeta de Transparencia de Gobernanza */}
                                <View style={styles.governanceCard}>
                                    <View style={styles.governanceHeader}>
                                        <Text style={styles.governanceEyebrow}>
                                            GOBERNANZA ZERO TRUST & PRIVACIDAD
                                        </Text>
                                        <Text style={styles.governanceTitle}>
                                            Módulos Habilitados en tu Cuenta
                                        </Text>
                                        <Text style={styles.governanceSubtitle}>
                                            Katherine Carroll administra de forma granular cada interruptor para proteger la confidencialidad de tus piezas.
                                        </Text>
                                    </View>

                                    <View style={styles.switchesGrid}>
                                        <View style={styles.switchStatusRow}>
                                            <Text style={styles.switchLabel}>
                                                👗 Creaciones de Alta Costura
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.switchBadge,
                                                    projection?.creationModules
                                                        .hasAnyVisibleCreation
                                                        ? styles.switchBadgeGranted
                                                        : styles.switchBadgeRestricted,
                                                ]}
                                            >
                                                {projection?.creationModules.hasAnyVisibleCreation
                                                    ? 'Autorizado (Doble Candado)'
                                                    : 'Restringido'}
                                            </Text>
                                        </View>

                                        <View style={styles.switchStatusRow}>
                                            <Text style={styles.switchLabel}>
                                                📏 Historial de Sesiones de Medidas
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.switchBadge,
                                                    projection?.globalModules.measurementsView
                                                        ? styles.switchBadgeGranted
                                                        : styles.switchBadgeRestricted,
                                                ]}
                                            >
                                                {projection?.globalModules.measurementsView
                                                    ? 'Autorizado'
                                                    : 'Restringido'}
                                            </Text>
                                        </View>

                                        <View style={styles.switchStatusRow}>
                                            <Text style={styles.switchLabel}>
                                                💼 Cotizaciones Formales
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.switchBadge,
                                                    hasQuotationsSection
                                                        ? styles.switchBadgeGranted
                                                        : styles.switchBadgeRestricted,
                                                ]}
                                            >
                                                {hasQuotationsSection ? 'Autorizado' : 'Restringido'}
                                            </Text>
                                        </View>

                                        <View style={styles.switchStatusRow}>
                                            <Text style={styles.switchLabel}>
                                                📅 Agenda & Citas Atelier
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.switchBadge,
                                                    projection?.globalModules.appointmentsView
                                                        ? styles.switchBadgeGranted
                                                        : styles.switchBadgeRestricted,
                                                ]}
                                            >
                                                {projection?.globalModules.appointmentsView
                                                    ? 'Autorizado'
                                                    : 'Restringido'}
                                            </Text>
                                        </View>

                                        <View style={styles.switchStatusRow}>
                                            <Text style={styles.switchLabel}>
                                                ✦ Pruebas de Calce (Fittings)
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.switchBadge,
                                                    projection?.creationModules
                                                        .hasAnyVisibleFittings
                                                        ? styles.switchBadgeGranted
                                                        : styles.switchBadgeRestricted,
                                                ]}
                                            >
                                                {projection?.creationModules.hasAnyVisibleFittings
                                                    ? 'Autorizado'
                                                    : 'Restringido'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* ESTADO VACÍO ZERO TRUST (Si no hay módulos habilitados) */}
                                {!hasAnySectionToShow && (
                                    <View style={styles.preparationCard}>
                                        <Text style={styles.preparationEyebrow}>
                                            EXPEDIENTE EN CURADURÍA
                                        </Text>
                                        <Text style={styles.preparationTitle}>
                                            Tu Espacio Digital está en Preparación
                                        </Text>
                                        <Text style={styles.preparationText}>
                                            Katherine Carroll se encuentra curando tu dossier de alta costura y habilitando tus permisos exclusivos. Conforme avancen las etapas en el atelier, se liberarán aquí tus piezas, sesiones de medidas verificadas, propuestas y citas.
                                        </Text>

                                        <View style={styles.preparationFeatures}>
                                            <View style={styles.prepFeatureItem}>
                                                <Text style={styles.prepBullet}>✦</Text>
                                                <Text style={styles.prepFeatureText}>
                                                    Creaciones autorizadas con visibilidad granular por prenda.
                                                </Text>
                                            </View>
                                            <View style={styles.prepFeatureItem}>
                                                <Text style={styles.prepBullet}>✦</Text>
                                                <Text style={styles.prepFeatureText}>
                                                    Registro verificado de tus sesiones de medidas en el taller.
                                                </Text>
                                            </View>
                                            <View style={styles.prepFeatureItem}>
                                                <Text style={styles.prepBullet}>✦</Text>
                                                <Text style={styles.prepFeatureText}>
                                                    Coordinación de pruebas de calce, citas y cotizaciones formales.
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* MÓDULO 1: CREACIONES DE ALTA COSTURA (v_portal_creations) */}
                                {projection?.creationModules.hasAnyVisibleCreation && (
                                    <View style={styles.moduleSection}>
                                        <View style={styles.moduleHeaderRow}>
                                            <Text style={styles.moduleSectionTitle}>
                                                CREACIONES DE ALTA COSTURA
                                            </Text>
                                            <Text style={styles.moduleCountBadge}>
                                                {creations.length}{' '}
                                                {creations.length === 1
                                                    ? 'prenda autorizada'
                                                    : 'prendas autorizadas'}
                                            </Text>
                                        </View>

                                        {creations.length === 0 ? (
                                            <View style={styles.emptyModuleCard}>
                                                <Text style={styles.emptyModuleTitle}>
                                                    Prendas en Proceso Creativo
                                                </Text>
                                                <Text style={styles.emptyModuleText}>
                                                    Aún no hay creaciones publicadas para visualización en esta vista segura. Se mostrarán automáticamente en cuanto queden habilitadas para tu dossier.
                                                </Text>
                                            </View>
                                        ) : (
                                            creations.map((creation) => (
                                                <View key={creation.id} style={styles.creationCard}>
                                                    <View style={styles.creationCardHeader}>
                                                        <View style={styles.creationTitleWrap}>
                                                            <Text style={styles.creationTypeBadge}>
                                                                {formatCreationTypeLabel(
                                                                    creation.creation_type
                                                                )}
                                                            </Text>
                                                            <Text style={styles.creationName}>
                                                                {creation.name}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.creationStatusBadge}>
                                                            <Text
                                                                style={
                                                                    styles.creationStatusBadgeText
                                                                }
                                                            >
                                                                {formatCreationStatusLabel(
                                                                    creation.status
                                                                )}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {creation.description && (
                                                        <Text style={styles.creationDescription}>
                                                            {creation.description}
                                                        </Text>
                                                    )}

                                                    <View style={styles.creationDetailsGrid}>
                                                        {creation.occasion && (
                                                            <View style={styles.detailItem}>
                                                                <Text style={styles.detailLabel}>
                                                                    Ocasión
                                                                </Text>
                                                                <Text style={styles.detailValue}>
                                                                    {creation.occasion}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {creation.target_date && (
                                                            <View style={styles.detailItem}>
                                                                <Text style={styles.detailLabel}>
                                                                    Fecha Estimada
                                                                </Text>
                                                                <Text style={styles.detailValue}>
                                                                    {formatBogotaDate(
                                                                        creation.target_date
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {creation.garment_type && (
                                                            <View style={styles.detailItem}>
                                                                <Text style={styles.detailLabel}>
                                                                    Silueta
                                                                </Text>
                                                                <Text style={styles.detailValue}>
                                                                    {creation.garment_type}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Sub-permisos exactos proyectados por v_portal_creations */}
                                                    <View style={styles.subPermissionsContainer}>
                                                        <Text style={styles.subPermissionsHeader}>
                                                            ELEMENTOS AUTORIZADOS DE ESTA CREACIÓN:
                                                        </Text>
                                                        <View style={styles.subPermissionsRow}>
                                                            <View
                                                                style={[
                                                                    styles.subPermPill,
                                                                    creation.can_view_sketches
                                                                        ? styles.subPermPillActive
                                                                        : styles.subPermPillInactive,
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.subPermPillText,
                                                                        creation.can_view_sketches
                                                                            ? styles.subPermPillTextActive
                                                                            : styles.subPermPillTextInactive,
                                                                    ]}
                                                                >
                                                                    {creation.can_view_sketches
                                                                        ? '✦ Bocetos de Diseño Autorizados'
                                                                        : '✦ Bocetos Reservados en Taller'}
                                                                </Text>
                                                            </View>

                                                            <View
                                                                style={[
                                                                    styles.subPermPill,
                                                                    creation.can_view_fittings
                                                                        ? styles.subPermPillActive
                                                                        : styles.subPermPillInactive,
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.subPermPillText,
                                                                        creation.can_view_fittings
                                                                            ? styles.subPermPillTextActive
                                                                            : styles.subPermPillTextInactive,
                                                                    ]}
                                                                >
                                                                    {creation.can_view_fittings
                                                                        ? '✦ Pruebas de Calce Habilitadas'
                                                                        : '✦ Pruebas en Coordinación de Taller'}
                                                                </Text>
                                                            </View>

                                                            <View
                                                                style={[
                                                                    styles.subPermPill,
                                                                    creation.can_view_fabrics
                                                                        ? styles.subPermPillActive
                                                                        : styles.subPermPillInactive,
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.subPermPillText,
                                                                        creation.can_view_fabrics
                                                                            ? styles.subPermPillTextActive
                                                                            : styles.subPermPillTextInactive,
                                                                    ]}
                                                                >
                                                                    {creation.can_view_fabrics
                                                                        ? '✦ Selección Textil Autorizada'
                                                                        : '✦ Selección Textil Reservada en Taller'}
                                                                </Text>
                                                            </View>

                                                            {creation.can_approve_sketches && (
                                                                <View
                                                                    style={[
                                                                        styles.subPermPill,
                                                                        styles.subPermPillActive,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.subPermPillText,
                                                                            styles.subPermPillTextActive,
                                                                        ]}
                                                                    >
                                                                        ✦ Aprobación de Bocetos Activa
                                                                    </Text>
                                                                </View>
                                                            )}

                                                            {creation.can_view_budget && (
                                                                <View
                                                                    style={[
                                                                        styles.subPermPill,
                                                                        styles.subPermPillActive,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.subPermPillText,
                                                                            styles.subPermPillTextActive,
                                                                        ]}
                                                                    >
                                                                        ✦ Presupuesto Habilitado
                                                                    </Text>
                                                                </View>
                                                            )}

                                                            {creation.can_send_observations && (
                                                                <View
                                                                    style={[
                                                                        styles.subPermPill,
                                                                        styles.subPermPillActive,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.subPermPillText,
                                                                            styles.subPermPillTextActive,
                                                                        ]}
                                                                    >
                                                                        ✦ Observaciones Habilitadas
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}

                                {/* MÓDULO 2: HISTORIAL DE SESIONES DE MEDIDAS (v_portal_measurement_sessions) */}
                                {projection?.globalModules.measurementsView && (
                                    <View style={styles.moduleSection}>
                                        <View style={styles.moduleHeaderRow}>
                                            <Text style={styles.moduleSectionTitle}>
                                                HISTORIAL DE SESIONES DE MEDIDAS
                                            </Text>
                                            <Text style={styles.moduleCountBadge}>
                                                {measurementSessions.length}{' '}
                                                {measurementSessions.length === 1
                                                    ? 'sesión verificada'
                                                    : 'sesiones verificadas'}
                                            </Text>
                                        </View>

                                        {measurementSessions.length === 0 ? (
                                            <View style={styles.emptyModuleCard}>
                                                <Text style={styles.emptyModuleTitle}>
                                                    Sin Sesiones Certificadas Aún
                                                </Text>
                                                <Text style={styles.emptyModuleText}>
                                                    Todavía no existen sesiones en estado completado o verificado en tu expediente. Una vez auditadas por el atelier, aparecerán aquí con su versión y fecha oficial.
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.measurementsCard}>
                                                <View style={styles.measurementsHeader}>
                                                    <View style={styles.measurementsHeaderTextWrap}>
                                                        <Text style={styles.measurementsTitle}>
                                                            Sesiones Antropométricas Certificadas
                                                        </Text>
                                                        <Text style={styles.measurementsSubtitle}>
                                                            Última calibración:{' '}
                                                            {formatBogotaDate(
                                                                measurementSessions[0].session_date
                                                            )}
                                                            {measurementSessions[0]
                                                                .version_number != null
                                                                ? ` · Versión v${measurementSessions[0].version_number}`
                                                                : ''}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.certifiedBadge}>
                                                        <Text style={styles.certifiedBadgeText}>
                                                            {formatMeasurementStatusLabel(
                                                                measurementSessions[0].status
                                                            )}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.measurementSessionsList}>
                                                    {measurementSessions.map((ms) => (
                                                        <View
                                                            key={ms.id}
                                                            style={styles.measurementSessionRow}
                                                        >
                                                            <View>
                                                                <Text
                                                                    style={
                                                                        styles.measurementSessionTitle
                                                                    }
                                                                >
                                                                    Sesión del{' '}
                                                                    {formatBogotaDate(
                                                                        ms.session_date
                                                                    )}
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.measurementSessionMeta
                                                                    }
                                                                >
                                                                    Sistema:{' '}
                                                                    {(
                                                                        ms.unit_system || 'cm'
                                                                    ).toUpperCase()}
                                                                    {ms.version_number != null
                                                                        ? ` · Versión v${ms.version_number}`
                                                                        : ''}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.certifiedBadge}>
                                                                <Text
                                                                    style={styles.certifiedBadgeText}
                                                                >
                                                                    {formatMeasurementStatusLabel(
                                                                        ms.status
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>

                                                <Text style={styles.measurementsFootnote}>
                                                    Por confidencialidad del atelier, esta sección expone únicamente tu historial certificado de sesiones completadas o verificadas; el detalle técnico anatómico completo permanece bajo custodia exclusiva del taller.
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* MÓDULO 3: PROPUESTAS Y COTIZACIONES FORMALES (v_portal_commercial_quotes) */}
                                {hasQuotationsSection && (
                                    <View style={styles.moduleSection}>
                                        <View style={styles.moduleHeaderRow}>
                                            <Text style={styles.moduleSectionTitle}>
                                                PROPUESTAS & COTIZACIONES FORMALES
                                            </Text>
                                            <Text style={styles.moduleCountBadge}>
                                                {commercialQuotes.length}{' '}
                                                {commercialQuotes.length === 1
                                                    ? 'cotización'
                                                    : 'cotizaciones'}
                                            </Text>
                                        </View>

                                        {commercialQuotes.length === 0 ? (
                                            <View style={styles.emptyModuleCard}>
                                                <Text style={styles.emptyModuleTitle}>
                                                    Sin Cotizaciones Vigentes
                                                </Text>
                                                <Text style={styles.emptyModuleText}>
                                                    No se registran cotizaciones autorizadas en este momento. Las propuestas formalizadas por Katherine Carroll se publicarán aquí.
                                                </Text>
                                            </View>
                                        ) : (
                                            commercialQuotes.map((quote) => {
                                                const linkedCreationName = quote.creation_id
                                                    ? authorizedCreationNameMap.get(
                                                          quote.creation_id
                                                      ) || null
                                                    : null;
                                                const paymentSummary = formatPaymentScheduleSummary(
                                                    quote.payment_schedule
                                                );

                                                return (
                                                    <View key={quote.id} style={styles.quoteCard}>
                                                        <View style={styles.quoteCardHeader}>
                                                            <View style={styles.creationTitleWrap}>
                                                                <Text style={styles.quoteNumber}>
                                                                    {quote.quote_number}
                                                                </Text>
                                                                <Text
                                                                    style={styles.quoteCreationName}
                                                                >
                                                                    {linkedCreationName ||
                                                                        'Propuesta Formal de Atelier'}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.quoteStatusBadge}>
                                                                <Text
                                                                    style={
                                                                        styles.quoteStatusBadgeText
                                                                    }
                                                                >
                                                                    {formatQuoteStatusLabel(
                                                                        quote.status
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.quoteFinancialRow}>
                                                            <View>
                                                                <Text
                                                                    style={
                                                                        styles.quoteFinancialLabel
                                                                    }
                                                                >
                                                                    Total Acordado
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.quoteFinancialValue
                                                                    }
                                                                >
                                                                    {formatCurrency(
                                                                        quote.total_amount,
                                                                        quote.currency
                                                                    )}
                                                                </Text>
                                                            </View>
                                                            <View>
                                                                <Text
                                                                    style={
                                                                        styles.quoteFinancialLabel
                                                                    }
                                                                >
                                                                    {quote.approved_at
                                                                        ? 'Fecha Aprobación'
                                                                        : 'Vigencia'}
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        styles.quoteFinancialDate
                                                                    }
                                                                >
                                                                    {quote.approved_at
                                                                        ? formatBogotaDate(
                                                                              quote.approved_at
                                                                          )
                                                                        : formatBogotaDate(
                                                                              quote.valid_until
                                                                          )}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        {paymentSummary && (
                                                            <Text style={styles.quoteTermsText}>
                                                                ✦ {paymentSummary}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                )}

                                {/* MÓDULO 4: AGENDA Y CITAS ATELIER (v_portal_appointments) */}
                                {projection?.globalModules.appointmentsView && (
                                    <View style={styles.moduleSection}>
                                        <View style={styles.moduleHeaderRow}>
                                            <Text style={styles.moduleSectionTitle}>
                                                AGENDA & CITAS ATELIER
                                            </Text>
                                            <Text style={styles.moduleCountBadge}>
                                                {appointments.length}{' '}
                                                {appointments.length === 1
                                                    ? 'cita programada'
                                                    : 'citas programadas'}
                                            </Text>
                                        </View>

                                        {appointments.length === 0 ? (
                                            <View style={styles.emptyModuleCard}>
                                                <Text style={styles.emptyModuleTitle}>
                                                    Sin Citas Próximas
                                                </Text>
                                                <Text style={styles.emptyModuleText}>
                                                    Actualmente no tienes citas visibles en el taller. Tu diseñadora coordinará contigo las fechas para próximas sesiones.
                                                </Text>
                                            </View>
                                        ) : (
                                            appointments.map((item) => (
                                                <View key={item.id} style={styles.appointmentCard}>
                                                    <View style={styles.appointmentHeader}>
                                                        <View style={styles.creationTitleWrap}>
                                                            <Text
                                                                style={styles.appointmentTypeBadge}
                                                            >
                                                                {formatAppointmentTypeLabel(
                                                                    item.appointment_type
                                                                )}
                                                            </Text>
                                                            <Text style={styles.appointmentTitle}>
                                                                Encuentro Privado en Atelier
                                                            </Text>
                                                        </View>
                                                        <View style={styles.appointmentStatusBadge}>
                                                            <Text
                                                                style={
                                                                    styles.appointmentStatusBadgeText
                                                                }
                                                            >
                                                                {formatAppointmentStatusLabel(
                                                                    item.status
                                                                )}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.appointmentDetailsRow}>
                                                        <View style={styles.appointmentDetailItem}>
                                                            <Text style={styles.detailLabel}>
                                                                Fecha & Hora
                                                            </Text>
                                                            <Text style={styles.detailValue}>
                                                                {formatBogotaScheduleRange(
                                                                    item.starts_at,
                                                                    item.ends_at
                                                                )}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.appointmentDetailItem}>
                                                            <Text style={styles.detailLabel}>
                                                                Lugar
                                                            </Text>
                                                            <Text style={styles.detailValue}>
                                                                {item.location_space ||
                                                                    'Atelier By Katherine Carroll'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {item.preparation_notes && (
                                                        <View style={styles.preparationNotesBox}>
                                                            <Text
                                                                style={styles.preparationNotesLabel}
                                                            >
                                                                Recomendación del Taller:
                                                            </Text>
                                                            <Text
                                                                style={styles.preparationNotesText}
                                                            >
                                                                {item.preparation_notes}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}

                                {/* MÓDULO 5: PRUEBAS DE CALCE / FITTINGS (v_portal_fitting_sessions) */}
                                {projection?.creationModules.hasAnyVisibleFittings && (
                                    <View style={styles.moduleSection}>
                                        <View style={styles.moduleHeaderRow}>
                                            <Text style={styles.moduleSectionTitle}>
                                                PRUEBAS DE CALCE & FITTINGS
                                            </Text>
                                            <Text style={styles.moduleCountBadge}>
                                                {fittingSessions.length}{' '}
                                                {fittingSessions.length === 1
                                                    ? 'sesión habilitada'
                                                    : 'sesiones habilitadas'}
                                            </Text>
                                        </View>

                                        {fittingSessions.length === 0 ? (
                                            <View style={styles.emptyModuleCard}>
                                                <Text style={styles.emptyModuleTitle}>
                                                    Sin Pruebas de Calce Registradas
                                                </Text>
                                                <Text style={styles.emptyModuleText}>
                                                    Aún no hay sesiones de calce agendadas o realizadas para tus piezas autorizadas.
                                                </Text>
                                            </View>
                                        ) : (
                                            fittingSessions.map((fitting) => {
                                                const creationName =
                                                    authorizedCreationNameMap.get(
                                                        fitting.creation_id
                                                    ) || null;
                                                const referenceDate =
                                                    fitting.conducted_at || fitting.scheduled_at;

                                                return (
                                                    <View key={fitting.id} style={styles.fittingCard}>
                                                        <View style={styles.appointmentHeader}>
                                                            <View style={styles.creationTitleWrap}>
                                                                <Text
                                                                    style={
                                                                        styles.appointmentTypeBadge
                                                                    }
                                                                >
                                                                    PRUEBA #{fitting.session_number}
                                                                    {creationName
                                                                        ? ` · ${creationName.toUpperCase()}`
                                                                        : ''}
                                                                </Text>
                                                                <Text
                                                                    style={styles.appointmentTitle}
                                                                >
                                                                    {fitting.title ||
                                                                        formatFittingRoundLabel(
                                                                            fitting.round_type
                                                                        )}
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={styles.appointmentStatusBadge}
                                                            >
                                                                <Text
                                                                    style={
                                                                        styles.appointmentStatusBadgeText
                                                                    }
                                                                >
                                                                    {formatFittingStatusLabel(
                                                                        fitting.status
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.appointmentDetailsRow}>
                                                            <View
                                                                style={styles.appointmentDetailItem}
                                                            >
                                                                <Text style={styles.detailLabel}>
                                                                    {fitting.conducted_at
                                                                        ? 'Fecha de Sesión'
                                                                        : 'Fecha Programada'}
                                                                </Text>
                                                                <Text style={styles.detailValue}>
                                                                    {referenceDate
                                                                        ? formatBogotaScheduleRange(
                                                                              referenceDate,
                                                                              null
                                                                          )
                                                                        : 'Por confirmar en taller'}
                                                                </Text>
                                                            </View>
                                                            {fitting.location_note && (
                                                                <View
                                                                    style={
                                                                        styles.appointmentDetailItem
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={styles.detailLabel}
                                                                    >
                                                                        Ubicación / Sala
                                                                    </Text>
                                                                    <Text
                                                                        style={styles.detailValue}
                                                                    >
                                                                        {fitting.location_note}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                )}
                            </>
                        )}

                        {/* Tarjeta de Privacidad, Derechos ARCO y Transparencia Legal (Ley 1581 de 2012) */}
                        <View style={styles.legalCard}>
                            <View style={styles.legalHeaderRow}>
                                <Text style={styles.legalEyebrow}>
                                    PRIVACIDAD, HABEAS DATA & TRANSPARENCIA · LEY 1581 DE 2012
                                </Text>
                                <Text style={styles.legalVersionBadge}>
                                    v{LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY}
                                </Text>
                            </View>

                            <Text style={styles.legalTitle}>
                                Custodia de tus Datos y Derechos de Titular
                            </Text>
                            <Text style={styles.legalText}>
                                Tus datos de contacto, historial de medidas y registros de confección se encuentran protegidos bajo políticas de seguridad por fila (Row Level Security). En cualquier momento puedes ejercer tus derechos a conocer, actualizar, rectificar o solicitar la supresión de tus datos.
                            </Text>

                            <View style={styles.legalPillsRow}>
                                <TouchableOpacity
                                    style={styles.legalPill}
                                    onPress={() => router.push('/politica-privacidad' as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.legalPillText}>Política de Privacidad</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.legalPill}
                                    onPress={() => router.push('/terminos-condiciones' as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.legalPillText}>Términos de Uso</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.legalPill}
                                    onPress={() => router.push('/aviso-privacidad' as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.legalPillText}>Aviso de Privacidad</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.legalPill}
                                    onPress={() => router.push('/politica-cookies' as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.legalPillText}>Política de Cookies</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.legalPill}
                                    onPress={() => router.push('/ia-transparencia' as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.legalPillText}>Transparencia IA</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.arcoActionButton}
                                onPress={() =>
                                    router.push({
                                        pathname: '/contacto' as any,
                                        params: { servicio: 'proteccion-datos' },
                                    })
                                }
                                activeOpacity={0.85}
                            >
                                <Text style={styles.arcoActionButtonText}>
                                    RADICAR CONSULTA, RECTIFICACIÓN O SOLICITUD SOBRE MIS DATOS →
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    topBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingTop: Platform.select({ ios: 52, android: 44, default: 28 }),
        paddingBottom: 18,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    brandTitle: {
        color: colors.accent,
        fontSize: 14,
        letterSpacing: 3,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    brandSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        fontFamily: typography.sans,
    },
    topBarActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
    },
    publicHomeButton: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    publicHomeButtonText: {
        color: colors.accentDark,
        fontSize: 12,
        fontWeight: '600',
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: colors.surfaceSubtle,
    },
    signOutButtonText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        maxWidth: 860,
        width: '100%',
        alignSelf: 'center',
    },

    /* Banner de MODO DEMO */
    demoBanner: {
        backgroundColor: '#FFF8E7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 6,
        padding: 16,
        marginBottom: 20,
    },
    demoBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    demoBannerIcon: {
        color: colors.champagneGold,
        fontSize: 13,
        fontWeight: '700',
    },
    demoBannerTitle: {
        color: '#6E4D1A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    demoBannerText: {
        color: '#5C4418',
        fontSize: 12,
        lineHeight: 18,
    },

    /* Estados de Carga y Error */
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 6,
        padding: 16,
        marginBottom: 20,
        gap: 10,
    },
    errorText: {
        color: colors.error,
        fontSize: 12.5,
        lineHeight: 18,
    },
    retryButton: {
        alignSelf: 'flex-start',
        backgroundColor: colors.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '600',
    },

    /* Tarjeta de Bienvenida y Perfil */
    welcomeCard: {
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#29231F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    welcomeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    roleBadge: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    roleBadgeText: {
        color: colors.ivoryWarm,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
    },
    statusPillActive: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    statusPillInvited: {
        backgroundColor: '#FFF8E7',
        borderColor: colors.champagneGold,
    },
    statusPillSuspended: {
        backgroundColor: '#F7EDDA',
        borderColor: '#C79D58',
    },
    statusPillRevoked: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statusPillTextActive: {
        color: colors.success,
    },
    statusPillTextInvited: {
        color: '#7A5B20',
    },
    statusPillTextSuspended: {
        color: '#6E4D1A',
    },
    statusPillTextRevoked: {
        color: colors.error,
    },
    greetingTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 4,
    },
    greetingSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: colors.line,
        marginVertical: 12,
        width: 48,
    },
    sessionInfoText: {
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
    },

    /* Estado Restringido / Pendiente */
    restrictedCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    restrictedIcon: {
        fontSize: 32,
        marginBottom: 12,
    },
    restrictedTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 8,
        textAlign: 'center',
    },
    restrictedText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 580,
    },
    contactAtelierButton: {
        backgroundColor: colors.atelierBlack,
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    contactAtelierButtonText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },

    /* Tarjeta de Gobernanza & Permisos */
    governanceCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 20,
        marginBottom: 20,
    },
    governanceHeader: {
        marginBottom: 14,
    },
    governanceEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    governanceTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 4,
    },
    governanceSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },
    switchesGrid: {
        gap: 8,
    },
    switchStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    switchLabel: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '500',
    },
    switchBadge: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    switchBadgeGranted: {
        backgroundColor: colors.successBg,
        color: colors.success,
    },
    switchBadgeRestricted: {
        backgroundColor: colors.surfaceSubtle,
        color: colors.textMuted,
    },

    /* Estado de Preparación / Curaduría (Zero Trust) */
    preparationCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 24,
        marginBottom: 20,
    },
    preparationEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    preparationTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 8,
    },
    preparationText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 18,
    },
    preparationFeatures: {
        gap: 10,
    },
    prepFeatureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    prepBullet: {
        color: colors.accent,
        fontSize: 12,
        marginTop: 2,
    },
    prepFeatureText: {
        color: colors.textPrimary,
        fontSize: 12.5,
        lineHeight: 18,
        flex: 1,
    },

    /* Secciones de Módulos Autorizados */
    moduleSection: {
        marginBottom: 24,
    },
    moduleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    moduleSectionTitle: {
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 2,
    },
    moduleCountBadge: {
        color: colors.accentDark,
        fontSize: 11.5,
        fontWeight: '500',
    },
    emptyModuleCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 20,
    },
    emptyModuleTitle: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    emptyModuleText: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
    },

    /* Tarjeta de Creación de Alta Costura */
    creationCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 20,
        marginBottom: 14,
    },
    creationCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    creationTitleWrap: {
        flex: 1,
        minWidth: 180,
    },
    creationTypeBadge: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    creationName: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '600',
        fontFamily: typography.serif,
    },
    creationDescription: {
        color: colors.textSecondary,
        fontSize: 12.5,
        lineHeight: 18,
        marginBottom: 12,
    },
    creationStatusBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    creationStatusBadgeText: {
        color: colors.textPrimary,
        fontSize: 10.5,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    creationDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.line,
        marginBottom: 14,
    },
    detailItem: {
        minWidth: 120,
    },
    detailLabel: {
        color: colors.textMuted,
        fontSize: 10.5,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    detailValue: {
        color: colors.textPrimary,
        fontSize: 12.5,
        fontWeight: '500',
    },
    subPermissionsContainer: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        padding: 12,
    },
    subPermissionsHeader: {
        color: colors.accentDark,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    subPermissionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    subPermPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
    },
    subPermPillActive: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    subPermPillInactive: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },
    subPermPillText: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    subPermPillTextActive: {
        color: colors.success,
    },
    subPermPillTextInactive: {
        color: colors.textMuted,
    },

    /* Tarjeta de Historial de Sesiones de Medidas */
    measurementsCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 20,
    },
    measurementsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    measurementsHeaderTextWrap: {
        flex: 1,
        minWidth: 180,
    },
    measurementsTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 3,
    },
    measurementsSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    certifiedBadge: {
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    certifiedBadgeText: {
        color: colors.success,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1,
    },
    measurementSessionsList: {
        gap: 10,
        marginBottom: 14,
    },
    measurementSessionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
    },
    measurementSessionTitle: {
        color: colors.textPrimary,
        fontSize: 13.5,
        fontWeight: '600',
        marginBottom: 2,
    },
    measurementSessionMeta: {
        color: colors.textSecondary,
        fontSize: 11.5,
    },
    measurementsFootnote: {
        color: colors.textMuted,
        fontSize: 11.5,
        lineHeight: 16,
        fontStyle: 'italic',
    },

    /* Tarjeta de Cotizaciones Formales */
    quoteCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 20,
        marginBottom: 12,
    },
    quoteCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    quoteNumber: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    quoteCreationName: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: typography.serif,
    },
    quoteStatusBadge: {
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    quoteStatusBadgeText: {
        color: colors.success,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    quoteFinancialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.line,
        marginBottom: 12,
    },
    quoteFinancialLabel: {
        color: colors.textMuted,
        fontSize: 10.5,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    quoteFinancialValue: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
        fontFamily: typography.serif,
    },
    quoteFinancialDate: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    quoteTermsText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        lineHeight: 16,
    },

    /* Tarjeta de Citas y Fittings */
    appointmentCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 20,
        marginBottom: 12,
    },
    fittingCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        borderRadius: 6,
        padding: 20,
        marginBottom: 12,
    },
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    appointmentTypeBadge: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    appointmentTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: typography.serif,
    },
    appointmentStatusBadge: {
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    appointmentStatusBadgeText: {
        color: colors.success,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1,
    },
    appointmentDetailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 6,
    },
    appointmentDetailItem: {
        flex: 1,
        minWidth: 150,
    },
    preparationNotesBox: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        padding: 10,
        marginTop: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
    },
    preparationNotesLabel: {
        color: colors.accentDark,
        fontSize: 10.5,
        fontWeight: '700',
        marginBottom: 2,
    },
    preparationNotesText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        lineHeight: 16,
    },

    /* Tarjeta Legal y Derechos ARCO */
    legalCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 24,
        marginTop: 10,
    },
    legalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    legalEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    legalVersionBadge: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '600',
    },
    legalTitle: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 8,
    },
    legalText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 16,
    },
    legalPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
    },
    legalPill: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    legalPillText: {
        color: colors.textPrimary,
        fontSize: 11.5,
        fontWeight: '500',
    },
    arcoActionButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    arcoActionButtonText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
    },
});
