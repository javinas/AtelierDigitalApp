// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: BANDEJA TRANSVERSAL DE PRUEBAS Y AJUSTES
// Archivo: src/components/fitting/FittingQueueScreen.tsx
// ==============================================================================
// Bandeja transversal de taller By Katherine Carroll para supervisar el calce,
// las rondas de pruebas sobre glasilla, la trazabilidad de ajustes anatómicos,
// las alertas de recálculo CAD (M02) y el ceremonial de entrega final.
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import {
    FittingDesignerQueueFilter,
    FittingQueueItem,
    FittingSessionStatus,
} from '../../types/fitting';
import { fetchDesignerFittingQueue } from '../../services/fittingService';
import {
    FITTING_ROUND_LABELS,
    FITTING_SESSION_STATUS_LABELS,
    formatFittingDate,
    getFittingSessionStatusColors,
} from './fittingLabels';
import { fittingStyles } from './fittingStyles';

export interface FittingQueueScreenProps {
    onBack: () => void;
    onOpenCreation?: (creationId: string) => void;
    onOpenCreations?: () => void;
}

const STATUS_FILTERS: { id: FittingSessionStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'Todas las Sesiones' },
    { id: 'scheduled', label: 'Programadas' },
    { id: 'adjustments_required', label: 'Con Ajustes' },
    { id: 'approved', label: 'Aprobadas' },
    { id: 'completed', label: 'Realizadas' },
];

export const FittingQueueScreen: React.FC<FittingQueueScreenProps> = ({
    onBack,
    onOpenCreation,
    onOpenCreations,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 720;
    const isDesktop = width >= 1040;
    const isAuthorized = role === 'designer' || role === 'admin';

    // Estados de datos
    const [queueItems, setQueueItems] = useState<FittingQueueItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Estados de filtrado
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<FittingSessionStatus | 'all'>('all');
    const [onlyOpenAdjustments, setOnlyOpenAdjustments] = useState<boolean>(false);
    const [onlyReadyForDelivery, setOnlyReadyForDelivery] = useState<boolean>(false);
    const [requiresCadFilter, setRequiresCadFilter] = useState<boolean>(false);

    const loadQueue = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setErrorMessage(null);

        const filter: FittingDesignerQueueFilter = {
            searchQuery: searchQuery.trim() || undefined,
            status: statusFilter,
            onlyOpenAdjustments: onlyOpenAdjustments ? true : undefined,
            onlyReadyForDelivery: onlyReadyForDelivery ? true : undefined,
            requiresCadRevision: requiresCadFilter ? true : undefined,
        };

        const { data, error } = await fetchDesignerFittingQueue(filter);

        if (error) {
            setErrorMessage(error);
        } else {
            setQueueItems(data);
        }

        setLoading(false);
        setRefreshing(false);
    }, [searchQuery, statusFilter, onlyOpenAdjustments, onlyReadyForDelivery, requiresCadFilter]);

    useEffect(() => {
        if (isAuthorized) {
            loadQueue();
        }
    }, [isAuthorized, loadQueue]);

    // Métricas calculadas para la cabecera
    const metrics = useMemo(() => {
        const total = queueItems.length;
        const withOpenAdj = queueItems.filter((i) => i.openAdjustmentsCount > 0).length;
        const criticalCount = queueItems.reduce((acc, i) => acc + i.criticalAdjustmentsCount, 0);
        const readyDelivery = queueItems.filter((i) => i.isReadyForDelivery && !i.isDelivered).length;
        const deliveredCount = queueItems.filter((i) => i.isDelivered).length;
        const cadPending = queueItems.filter((i) => i.requiresCadRevision).length;

        return {
            total,
            withOpenAdj,
            criticalCount,
            readyDelivery,
            deliveredCount,
            cadPending,
        };
    }, [queueItems]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setOnlyOpenAdjustments(false);
        setOnlyReadyForDelivery(false);
        setRequiresCadFilter(false);
    };

    const hasActiveFilters = Boolean(
        searchQuery.trim().length > 0 ||
        statusFilter !== 'all' ||
        onlyOpenAdjustments ||
        onlyReadyForDelivery ||
        requiresCadFilter
    );

    const handleNavigateToCreation = (creationId: string) => {
        if (onOpenCreation) {
            onOpenCreation(creationId);
        } else {
            router.push({
                pathname: '/(designer)/creations',
                params: { creation_id: creationId },
            });
        }
    };

    // Guarda de autenticación y roles
    if (authLoading) {
        return (
            <View style={[fittingStyles.container, localStyles.centerBox]}>
                <ActivityIndicator size="small" color={colors.champagneGold} />
                <Text style={localStyles.loadingText}>Verificando credenciales de taller...</Text>
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={[fittingStyles.container, localStyles.centerBox]}>
                <View style={localStyles.restrictedCard}>
                    <Text style={localStyles.restrictedBadge}>ACCESO RESTRINGIDO</Text>
                    <Text style={localStyles.restrictedTitle}>Área Exclusiva de Diseñadora</Text>
                    <Text style={localStyles.restrictedText}>
                        La bandeja transversal de pruebas, calce y ceremonial de entrega está reservada exclusivamente para el equipo directivo y técnico del Atelier.
                    </Text>
                    <TouchableOpacity
                        style={fittingStyles.primaryBtn}
                        onPress={onBack}
                        activeOpacity={0.88}
                        accessibilityLabel="Regresar al inicio"
                    >
                        <Text style={fittingStyles.primaryBtnText}>← Volver al Atelier</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            style={fittingStyles.container}
            contentContainerStyle={localStyles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* 1. CABECERA EDITORIAL DE ALTA COSTURA */}
            <View style={localStyles.headerWrapper}>
                <View style={localStyles.topNavigationRow}>
                    <TouchableOpacity
                        style={localStyles.backButton}
                        onPress={onBack}
                        activeOpacity={0.85}
                        accessibilityLabel="Volver al Atelier"
                    >
                        <Text style={localStyles.backButtonText}>← Volver al Atelier</Text>
                    </TouchableOpacity>

                    <View style={localStyles.topActionsGroup}>
                        <TouchableOpacity
                            style={localStyles.refreshButton}
                            onPress={() => loadQueue(true)}
                            disabled={refreshing || loading}
                            activeOpacity={0.85}
                            accessibilityLabel="Recargar bandeja de pruebas"
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" color={colors.bronze} />
                            ) : (
                                <Text style={localStyles.refreshButtonText}>↻ Actualizar</Text>
                            )}
                        </TouchableOpacity>

                        {onOpenCreations ? (
                            <TouchableOpacity
                                style={localStyles.creationsLinkButton}
                                onPress={onOpenCreations}
                                activeOpacity={0.85}
                                accessibilityLabel="Ir a Creaciones"
                            >
                                <Text style={localStyles.creationsLinkText}>Expedientes de Creación →</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <View style={localStyles.titleSection}>
                    <View style={localStyles.eyebrowRow}>
                        <Text style={localStyles.eyebrowStar}>✦</Text>
                        <Text style={localStyles.eyebrowText}>MÓDULO 06 · PRUEBAS, CALCE & ENTREGA</Text>
                    </View>
                    <Text style={localStyles.screenTitle}>Bandeja Transversal de Pruebas & Ajustes</Text>
                    <Text style={localStyles.screenSubtitle}>
                        Supervisión integral de citas de fitting, control milimétrico sobre glasilla (toile), alertas de actualización CAD (M02) y ceremonial solemne de entrega.
                    </Text>
                </View>
            </View>

            {/* 2. BANNER DE ERROR INLINE (Cero Alert.alert) */}
            {errorMessage ? (
                <View style={[fittingStyles.feedbackBanner, fittingStyles.errorBanner]}>
                    <Text style={fittingStyles.errorText}>
                        Error en bandeja de taller: {errorMessage}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setErrorMessage(null)}
                        accessibilityLabel="Cerrar error"
                    >
                        <Text style={{ fontWeight: '700', color: colors.error }}>✕</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* 3. BARRA DE MÉTRICAS / KPIS DE TALLER */}
            <View style={[localStyles.kpiGrid, isDesktop ? localStyles.kpiGridDesktop : isMobile ? localStyles.kpiGridMobile : localStyles.kpiGridTablet]}>
                <View style={localStyles.kpiCard}>
                    <Text style={localStyles.kpiNumber}>{metrics.total}</Text>
                    <Text style={localStyles.kpiLabel}>En Seguimiento</Text>
                    <Text style={localStyles.kpiSub}>Creaciones activas</Text>
                </View>

                <View style={[localStyles.kpiCard, metrics.withOpenAdj > 0 && localStyles.kpiCardWarning]}>
                    <Text style={[localStyles.kpiNumber, metrics.criticalCount > 0 && { color: colors.error }]}>
                        {metrics.withOpenAdj}
                    </Text>
                    <Text style={localStyles.kpiLabel}>Con Ajustes Abiertos</Text>
                    <Text style={localStyles.kpiSub}>
                        {metrics.criticalCount > 0 ? `🚨 ${metrics.criticalCount} crítico(s)` : 'En proceso en mesa'}
                    </Text>
                </View>

                <View style={[localStyles.kpiCard, metrics.cadPending > 0 && localStyles.kpiCardCad]}>
                    <Text style={[localStyles.kpiNumber, { color: '#8A5C12' }]}>{metrics.cadPending}</Text>
                    <Text style={localStyles.kpiLabel}>Revisión CAD</Text>
                    <Text style={localStyles.kpiSub}>Requieren M02</Text>
                </View>

                <View style={[localStyles.kpiCard, metrics.readyDelivery > 0 && localStyles.kpiCardGold]}>
                    <Text style={[localStyles.kpiNumber, { color: colors.bronze }]}>{metrics.readyDelivery}</Text>
                    <Text style={localStyles.kpiLabel}>Listas para Entrega</Text>
                    <Text style={localStyles.kpiSub}>0 ajustes pendientes</Text>
                </View>

                <View style={localStyles.kpiCard}>
                    <Text style={[localStyles.kpiNumber, { color: '#3D6346' }]}>{metrics.deliveredCount}</Text>
                    <Text style={localStyles.kpiLabel}>Entregadas</Text>
                    <Text style={localStyles.kpiSub}>Acta formal firmada</Text>
                </View>
            </View>

            {/* 4. BARRA DE HERRAMIENTAS, BÚSQUEDA Y FILTROS */}
            <View style={localStyles.filterCard}>
                {/* Campo de búsqueda */}
                <View style={localStyles.searchRow}>
                    <TextInput
                        style={localStyles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Buscar por clienta o nombre de creación..."
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="search"
                        onSubmitEditing={() => loadQueue(false)}
                    />
                    {searchQuery.length > 0 ? (
                        <TouchableOpacity
                            style={localStyles.clearSearchBtn}
                            onPress={() => setSearchQuery('')}
                            accessibilityLabel="Limpiar búsqueda"
                        >
                            <Text style={localStyles.clearSearchText}>✕</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Filtros de estado de sesión */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={localStyles.filterTabsScroll}
                >
                    {STATUS_FILTERS.map((f) => {
                        const isSelected = statusFilter === f.id;
                        return (
                            <TouchableOpacity
                                key={f.id}
                                style={[localStyles.statusChip, isSelected && localStyles.statusChipActive]}
                                onPress={() => setStatusFilter(f.id)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        localStyles.statusChipText,
                                        isSelected && localStyles.statusChipTextActive,
                                    ]}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Filtros rápidos tipo toggles */}
                <View style={localStyles.togglesRow}>
                    <TouchableOpacity
                        style={[localStyles.toggleChip, onlyOpenAdjustments && localStyles.toggleChipActive]}
                        onPress={() => setOnlyOpenAdjustments((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Text style={[localStyles.toggleChipText, onlyOpenAdjustments && localStyles.toggleChipTextActive]}>
                            {onlyOpenAdjustments ? '✓' : '+'} Solo con Ajustes Abiertos
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[localStyles.toggleChip, onlyReadyForDelivery && localStyles.toggleChipGoldActive]}
                        onPress={() => setOnlyReadyForDelivery((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Text style={[localStyles.toggleChipText, onlyReadyForDelivery && localStyles.toggleChipGoldText]}>
                            👑 Solo Listas para Entrega
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[localStyles.toggleChip, requiresCadFilter && localStyles.toggleChipCadActive]}
                        onPress={() => setRequiresCadFilter((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Text style={[localStyles.toggleChipText, requiresCadFilter && localStyles.toggleChipCadText]}>
                            📐 Requiere Revisión CAD
                        </Text>
                    </TouchableOpacity>

                    {hasActiveFilters ? (
                        <TouchableOpacity
                            style={localStyles.clearAllFiltersBtn}
                            onPress={handleClearFilters}
                            activeOpacity={0.8}
                        >
                            <Text style={localStyles.clearAllFiltersText}>Limpiar Filtros</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* 5. LISTADO / CUADRÍCULA DE ELEMENTOS EN SEGUIMIENTO */}
            {loading ? (
                <View style={localStyles.loadingBox}>
                    <ActivityIndicator size="small" color={colors.champagneGold} />
                    <Text style={localStyles.loadingText}>Cargando expediente de pruebas y calce...</Text>
                </View>
            ) : queueItems.length === 0 ? (
                <View style={localStyles.emptyCard}>
                    <Text style={localStyles.emptyStar}>✨</Text>
                    <Text style={localStyles.emptyTitle}>Bandeja de Pruebas al Día</Text>
                    <Text style={localStyles.emptyDescription}>
                        {hasActiveFilters
                            ? 'No se encontraron creaciones que coincidan con los filtros seleccionados.'
                            : 'No hay creaciones activas con pruebas programadas o ajustes pendientes en este momento.'}
                    </Text>
                    {hasActiveFilters ? (
                        <TouchableOpacity
                            style={[fittingStyles.secondaryBtn, { marginTop: 12 }]}
                            onPress={handleClearFilters}
                            activeOpacity={0.85}
                        >
                            <Text style={fittingStyles.secondaryBtnText}>Restablecer Filtros</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : (
                <View style={[localStyles.queueGrid, isDesktop && localStyles.queueGridDesktop]}>
                    {queueItems.map((item) => {
                        const statusColors = item.latestSessionStatus
                            ? getFittingSessionStatusColors(
                                  item.latestSessionStatus,
                                  null,
                                  item.isDelivered
                              )
                            : {
                                  background: colors.surfaceSubtle,
                                  text: colors.textMuted,
                                  border: colors.sand,
                                  badgeLabel: 'Sin Sesiones',
                              };

                        return (
                            <View
                                key={item.creationId}
                                style={[
                                    localStyles.itemCard,
                                    isDesktop && localStyles.itemCardDesktop,
                                    item.isReadyForDelivery && !item.isDelivered && localStyles.itemCardReadyGold,
                                ]}
                            >
                                {/* Cabecera de la Creación */}
                                <View style={localStyles.itemHeader}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={localStyles.creationName} numberOfLines={1}>
                                            {item.creationName}
                                        </Text>
                                        <Text style={localStyles.clientName} numberOfLines={1}>
                                            👤 {item.clientName}
                                        </Text>
                                    </View>

                                    <View style={localStyles.badgesCol}>
                                        <View
                                            style={[
                                                fittingStyles.badge,
                                                {
                                                    backgroundColor: statusColors.background,
                                                    borderColor: statusColors.border,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    fittingStyles.badgeText,
                                                    { color: statusColors.text },
                                                ]}
                                            >
                                                {statusColors.badgeLabel}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Ronda y Fecha */}
                                <View style={localStyles.sessionMetaRow}>
                                    <View style={localStyles.roundTag}>
                                        <Text style={localStyles.roundTagText}>
                                            {item.latestRoundType
                                                ? FITTING_ROUND_LABELS[item.latestRoundType]
                                                : 'Ronda Inicial'}
                                            {item.latestSessionNumber ? ` · Sesión #${item.latestSessionNumber}` : ''}
                                        </Text>
                                    </View>

                                    <Text style={localStyles.dateText}>
                                        📅 {formatFittingDate(item.scheduledAt)}
                                    </Text>
                                </View>

                                {/* Indicadores de Estado y Taller */}
                                <View style={localStyles.workshopIndicatorsRow}>
                                    {/* Ajustes Abiertos */}
                                    {item.openAdjustmentsCount > 0 ? (
                                        <View
                                            style={[
                                                localStyles.indicatorBadge,
                                                item.criticalAdjustmentsCount > 0
                                                    ? localStyles.indicatorCritical
                                                    : localStyles.indicatorWarning,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    localStyles.indicatorText,
                                                    item.criticalAdjustmentsCount > 0
                                                        ? { color: colors.error }
                                                        : { color: '#8A5C12' },
                                                ]}
                                            >
                                                {item.criticalAdjustmentsCount > 0
                                                    ? `🚨 ${item.openAdjustmentsCount} ajuste(s) (${item.criticalAdjustmentsCount} crítico)`
                                                    : `📐 ${item.openAdjustmentsCount} ajuste(s) en taller`}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={[localStyles.indicatorBadge, localStyles.indicatorSuccess]}>
                                            <Text style={[localStyles.indicatorText, { color: '#3D6346' }]}>
                                                ✓ Sin ajustes abiertos
                                            </Text>
                                        </View>
                                    )}

                                    {/* Revisión CAD */}
                                    {item.requiresCadRevision ? (
                                        <View style={[localStyles.indicatorBadge, localStyles.indicatorCad]}>
                                            <Text style={[localStyles.indicatorText, { color: '#8A5C12' }]}>
                                                📐 Requiere CAD M02
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Alerta de Ceremonial de Entrega */}
                                    {item.isReadyForDelivery && !item.isDelivered ? (
                                        <View style={[localStyles.indicatorBadge, localStyles.indicatorGoldReady]}>
                                            <Text style={[localStyles.indicatorText, { color: colors.bronze, fontWeight: '700' }]}>
                                                👑 Lista para Entrega
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Entregada */}
                                    {item.isDelivered ? (
                                        <View style={[localStyles.indicatorBadge, localStyles.indicatorDelivered]}>
                                            <Text style={[localStyles.indicatorText, { color: '#8A6A4A' }]}>
                                                👑 Entregada
                                                {item.deliveryConfirmedAt ? ` (${formatFittingDate(item.deliveryConfirmedAt)})` : ''}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Acción directa al Expediente */}
                                <TouchableOpacity
                                    style={[fittingStyles.primaryBtn, { marginTop: 12 }]}
                                    onPress={() => handleNavigateToCreation(item.creationId)}
                                    activeOpacity={0.88}
                                    accessibilityLabel={`Abrir expediente de ${item.creationName}`}
                                >
                                    <Text style={fittingStyles.primaryBtnText}>
                                        ✦ Abrir Expediente de Calce →
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
};

const localStyles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    centerBox: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 10,
    },
    restrictedCard: {
        backgroundColor: colors.surface,
        borderColor: colors.sand,
        borderWidth: 1,
        borderRadius: 8,
        padding: 24,
        maxWidth: 480,
        alignItems: 'center',
    },
    restrictedBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.error,
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    restrictedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 8,
        textAlign: 'center',
    },
    restrictedText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: 16,
    },
    headerWrapper: {
        marginBottom: 20,
    },
    topNavigationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
    },
    backButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    backButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.bronze,
    },
    topActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    refreshButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: colors.surface,
    },
    refreshButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.bronze,
    },
    creationsLinkButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    creationsLinkText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.ivoryWarm,
    },
    titleSection: {
        marginTop: 4,
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    eyebrowStar: {
        fontSize: 13,
        color: colors.champagneGold,
    },
    eyebrowText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
        letterSpacing: 0.8,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.2,
        marginBottom: 6,
    },
    screenSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
        maxWidth: 820,
    },
    kpiGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 18,
    },
    kpiGridDesktop: {
        flexWrap: 'nowrap',
    },
    kpiGridTablet: {
        flexWrap: 'wrap',
    },
    kpiGridMobile: {
        flexWrap: 'wrap',
    },
    kpiCard: {
        flex: 1,
        minWidth: 120,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 6,
        padding: 12,
        alignItems: 'flex-start',
    },
    kpiCardWarning: {
        borderColor: '#F2D48E',
        backgroundColor: '#FFFDF7',
    },
    kpiCardCad: {
        borderColor: '#E6D9C8',
        backgroundColor: '#FCFAF7',
    },
    kpiCardGold: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF9',
    },
    kpiNumber: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 2,
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    kpiSub: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
    },
    filterCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 14,
        marginBottom: 18,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 6,
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        height: 38,
        fontSize: 13,
        color: colors.atelierBlack,
    },
    clearSearchBtn: {
        padding: 6,
    },
    clearSearchText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '700',
    },
    filterTabsScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 10,
    },
    statusChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surface,
    },
    statusChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    statusChipText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    statusChipTextActive: {
        color: colors.ivoryWarm,
        fontWeight: '700',
    },
    togglesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    toggleChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    toggleChipActive: {
        borderColor: '#F2D48E',
        backgroundColor: '#FFF8E7',
    },
    toggleChipGoldActive: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFF8E7',
    },
    toggleChipCadActive: {
        borderColor: '#C5A880',
        backgroundColor: '#FCFAF7',
    },
    toggleChipText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    toggleChipTextActive: {
        color: '#8A5C12',
        fontWeight: '700',
    },
    toggleChipGoldText: {
        color: colors.bronze,
        fontWeight: '700',
    },
    toggleChipCadText: {
        color: '#8A5C12',
        fontWeight: '700',
    },
    clearAllFiltersBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    clearAllFiltersText: {
        fontSize: 11,
        color: colors.bronze,
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    emptyCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    emptyStar: {
        fontSize: 24,
        color: colors.champagneGold,
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 6,
    },
    emptyDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 440,
        lineHeight: 18,
    },
    queueGrid: {
        flexDirection: 'column',
        gap: 12,
    },
    queueGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    itemCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 16,
    },
    itemCardDesktop: {
        width: '49%',
    },
    itemCardReadyGold: {
        borderColor: colors.champagneGold,
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    creationName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 2,
    },
    clientName: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    badgesCol: {
        alignItems: 'flex-end',
    },
    sessionMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 8,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.sand,
    },
    roundTag: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    roundTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    dateText: {
        fontSize: 11,
        color: colors.textMuted,
    },
    workshopIndicatorsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginVertical: 4,
    },
    indicatorBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    indicatorWarning: {
        backgroundColor: '#FFF8E7',
        borderColor: '#F2D48E',
    },
    indicatorCritical: {
        backgroundColor: '#FAF2F2',
        borderColor: '#E8C5C5',
    },
    indicatorSuccess: {
        backgroundColor: '#F1F7F2',
        borderColor: '#C2DFCA',
    },
    indicatorCad: {
        backgroundColor: '#FCFAF7',
        borderColor: '#E6D9C8',
    },
    indicatorGoldReady: {
        backgroundColor: '#FFF8E7',
        borderColor: colors.champagneGold,
    },
    indicatorDelivered: {
        backgroundColor: '#F7F2E7',
        borderColor: '#A78350',
    },
    indicatorText: {
        fontSize: 10,
        fontWeight: '600',
    },
});

