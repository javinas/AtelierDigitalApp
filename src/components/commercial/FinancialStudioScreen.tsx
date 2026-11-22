// ==============================================================================
// ATELIER DIGITAL — MÓDULO 07: BANDEJA TRANSVERSAL DE FINANZAS & COSTOS
// Archivo: src/components/commercial/FinancialStudioScreen.tsx
// ==============================================================================
// Tablero transversal de taller By Katherine Carroll para supervisar recaudos,
// carteras por cobrar, egresos operativos y rentabilidad bimoneda (COP/USD)
// sin conversiones retroactivas ficticias. M05 opcional y no destructivo.
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
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import {
    AtelierFinancialCreationItem,
    AtelierFinancialOverview,
    CommercialCurrency,
} from '../../types/commercial';
import {
    fetchAtelierFinancialCreationsM07,
    fetchAtelierFinancialOverviewM07,
} from '../../services/commercialService';

export interface FinancialStudioScreenProps {
    onBack: () => void;
    onOpenCreation?: (creationId: string) => void;
    onOpenCreations?: () => void;
}

type PaymentStatusFilter = 'all' | 'pending' | 'cleared';
type CurrencyFilter = 'all' | 'COP' | 'USD';

export const FinancialStudioScreen: React.FC<FinancialStudioScreenProps> = ({
    onBack,
    onOpenCreation,
    onOpenCreations,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 720;
    const isTablet = width >= 720 && width < 1040;
    const isDesktop = width >= 1040;

    const [overview, setOverview] = useState<AtelierFinancialOverview | null>(null);
    const [creations, setCreations] = useState<AtelierFinancialCreationItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filtros
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
    const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');

    // Carga de datos
    const loadFinancialData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setErrorMessage(null);

        try {
            const [overviewRes, creationsRes] = await Promise.all([
                fetchAtelierFinancialOverviewM07(),
                fetchAtelierFinancialCreationsM07(),
            ]);

            if (overviewRes.error) {
                setErrorMessage(overviewRes.error);
            } else {
                setOverview(overviewRes.data);
            }

            if (creationsRes.error) {
                setErrorMessage((prev) => (prev ? `${prev} | ${creationsRes.error}` : creationsRes.error));
            } else {
                setCreations(creationsRes.data || []);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al cargar finanzas del atelier';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadFinancialData();
    }, [loadFinancialData]);

    // Filtrado reactivo de creaciones
    const filteredCreations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return creations.filter((item) => {
            // Filtro por texto
            if (query) {
                const matchName = item.name.toLowerCase().includes(query);
                const matchClient = item.client_name.toLowerCase().includes(query);
                const matchCode = item.creation_code?.toLowerCase().includes(query);
                const matchQuote = item.quote_number?.toLowerCase().includes(query);
                if (!matchName && !matchClient && !matchCode && !matchQuote) {
                    return false;
                }
            }

            // Filtro por estado de pago
            if (statusFilter === 'pending') {
                if (item.payment_status === 'paid_in_full') return false;
            } else if (statusFilter === 'cleared') {
                if (item.payment_status !== 'paid_in_full') return false;
            }

            // Filtro por divisa
            if (currencyFilter !== 'all') {
                if (item.contract_currency !== currencyFilter) return false;
            }

            return true;
        });
    }, [creations, searchQuery, statusFilter, currencyFilter]);

    // Formateadores monetarios independientes (cero mezclas COP/USD)
    const formatMoney = (amount: number, curr: CommercialCurrency = 'COP') => {
        const rounded = Math.round(Number(amount) || 0);
        if (curr === 'USD') {
            return `$${rounded.toLocaleString('en-US')} USD`;
        }
        return `$${rounded.toLocaleString('es-CO')} COP`;
    };

    // Formateador de fechas
    const formatDate = (isoString?: string | null) => {
        if (!isoString) return '—';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return isoString.slice(0, 10);
        }
    };

    // Guarda de autorización
    if (authLoading) {
        return (
            <View style={localStyles.centeredState}>
                <ActivityIndicator size="large" color={colors.champagneGold} />
                <Text style={localStyles.stateText}>Verificando credenciales de atelier...</Text>
            </View>
        );
    }

    if (role !== 'designer' && role !== 'admin') {
        return (
            <View style={localStyles.centeredState}>
                <Text style={localStyles.deniedTitle}>Acceso Exclusivo de Taller</Text>
                <Text style={localStyles.deniedSubtitle}>
                    La gestión de finanzas, costos y recaudos está reservada para Katherine Carroll y dirección de taller.
                </Text>
                <TouchableOpacity style={localStyles.backPrimaryBtn} onPress={onBack}>
                    <Text style={localStyles.backPrimaryBtnText}>← Volver al Portal</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={localStyles.screenScroll} contentContainerStyle={localStyles.screenContent}>
            {/* 1. CABECERA EDITORIAL */}
            <View style={localStyles.headerWrapper}>
                <View style={localStyles.headerTopRow}>
                    <TouchableOpacity
                        style={localStyles.backLinkBtn}
                        onPress={onBack}
                        activeOpacity={0.85}
                        accessibilityLabel="Volver al Atelier"
                    >
                        <Text style={localStyles.backLinkText}>← Volver al Atelier</Text>
                    </TouchableOpacity>

                    <View style={localStyles.topActionsGroup}>
                        <TouchableOpacity
                            style={localStyles.refreshBtn}
                            onPress={() => loadFinancialData(true)}
                            disabled={refreshing || loading}
                            activeOpacity={0.85}
                            accessibilityLabel="Actualizar finanzas"
                        >
                            {refreshing ? (
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            ) : (
                                <Text style={localStyles.refreshBtnText}>↻ Actualizar</Text>
                            )}
                        </TouchableOpacity>

                        {onOpenCreations && (
                            <TouchableOpacity
                                style={localStyles.creationsLinkBtn}
                                onPress={onOpenCreations}
                                activeOpacity={0.85}
                                accessibilityLabel="Abrir Creaciones"
                            >
                                <Text style={localStyles.creationsLinkText}>Expedientes de Creación →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={localStyles.titleSection}>
                    <View style={localStyles.eyebrowRow}>
                        <Text style={localStyles.eyebrowStar}>✦</Text>
                        <Text style={localStyles.eyebrowText}>MÓDULO 07 · COSTOS & FINANZAS DEL ATELIER</Text>
                    </View>
                    <Text style={localStyles.screenTitle}>Bandeja de Finanzas & Costos</Text>
                    <Text style={localStyles.screenSubtitle}>
                        Supervisión ejecutiva de recaudos del mes, carteras por cobrar, egresos operativos de taller y rentabilidad bimoneda sin conversiones forzadas.
                    </Text>
                </View>
            </View>

            {/* 2. BANNERS INLINE (Cero Alert.alert) */}
            {errorMessage && (
                <View style={localStyles.errorBanner}>
                    <Text style={localStyles.errorBannerText}>{errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)}>
                        <Text style={localStyles.dismissBannerText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 3. KPIS CONSOLIDADOS DEL ATELIER (Consumo get_atelier_financial_overview_m07) */}
            <View
                style={[
                    localStyles.kpiGrid,
                    isDesktop ? localStyles.kpiGridDesktop : isTablet ? localStyles.kpiGridTablet : localStyles.kpiGridMobile,
                ]}
            >
                {/* KPI 1: Recaudos del Mes */}
                <View style={localStyles.kpiCard}>
                    <Text style={localStyles.kpiLabel}>RECAUDOS DEL MES</Text>
                    <Text style={localStyles.kpiPrimaryNumber}>
                        {formatMoney(overview?.total_revenue_month_cop || 0, 'COP')}
                    </Text>
                    {Number(overview?.total_revenue_month_usd || 0) > 0 && (
                        <Text style={localStyles.kpiSecondaryNumber}>
                            + {formatMoney(overview?.total_revenue_month_usd || 0, 'USD')}
                        </Text>
                    )}
                    <Text style={localStyles.kpiSub}>Anticipos y abonos netos</Text>
                </View>

                {/* KPI 2: Cartera por Cobrar */}
                <View style={[localStyles.kpiCard, localStyles.kpiCardHighlight]}>
                    <Text style={[localStyles.kpiLabel, { color: '#8A6A4A' }]}>CARTERA POR COBRAR</Text>
                    <Text style={[localStyles.kpiPrimaryNumber, { color: '#A78350' }]}>
                        {formatMoney(overview?.total_pending_receivables_cop || 0, 'COP')}
                    </Text>
                    {Number(overview?.total_pending_receivables_usd || 0) > 0 && (
                        <Text style={[localStyles.kpiSecondaryNumber, { color: '#A78350' }]}>
                            + {formatMoney(overview?.total_pending_receivables_usd || 0, 'USD')}
                        </Text>
                    )}
                    <Text style={localStyles.kpiSub}>Saldos sobre cotizaciones activas</Text>
                </View>

                {/* KPI 3: Egresos del Mes */}
                <View style={localStyles.kpiCard}>
                    <Text style={localStyles.kpiLabel}>EGRESOS DEL MES</Text>
                    <Text style={localStyles.kpiPrimaryNumber}>
                        {formatMoney(overview?.total_expenses_month_cop || 0, 'COP')}
                    </Text>
                    {Number(overview?.total_expenses_month_usd || 0) > 0 && (
                        <Text style={localStyles.kpiSecondaryNumber}>
                            + {formatMoney(overview?.total_expenses_month_usd || 0, 'USD')}
                        </Text>
                    )}
                    <Text style={localStyles.kpiSub}>Insumos, telas y taller (M05/M07)</Text>
                </View>

                {/* KPI 4: Estado de Prendas */}
                <View style={localStyles.kpiCard}>
                    <Text style={localStyles.kpiLabel}>PRENDAS EN TALLER</Text>
                    <Text style={localStyles.kpiPrimaryNumber}>
                        {overview?.active_creations_count ?? creations.length} activas
                    </Text>
                    <View style={localStyles.breakdownRow}>
                        <Text style={localStyles.breakdownBadgePaz}>
                            ✓ {overview?.paid_in_full_creations_count ?? 0} al día
                        </Text>
                        <Text style={localStyles.breakdownBadgeAbono}>
                            ◐ {overview?.partially_paid_creations_count ?? 0} anticipo
                        </Text>
                        <Text style={localStyles.breakdownBadgeSin}>
                            ○ {overview?.unpaid_creations_count ?? 0} sin pago
                        </Text>
                    </View>
                    <Text style={localStyles.kpiSub}>Distribución de recaudo</Text>
                </View>
            </View>

            {/* 4. BARRA DE BÚSQUEDA Y FILTROS RÁPIDOS */}
            <View style={localStyles.filterSection}>
                <View style={localStyles.searchRow}>
                    <TextInput
                        style={localStyles.searchInput}
                        placeholder="Buscar por clienta, nombre de creación, código o cotización..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity style={localStyles.clearSearchBtn} onPress={() => setSearchQuery('')}>
                            <Text style={localStyles.clearSearchBtnText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={localStyles.filterChipsRow}>
                    <Text style={localStyles.filterGroupLabel}>Estado de Pago:</Text>
                    <TouchableOpacity
                        style={[localStyles.chipBtn, statusFilter === 'all' && localStyles.chipBtnActive]}
                        onPress={() => setStatusFilter('all')}
                    >
                        <Text style={[localStyles.chipBtnText, statusFilter === 'all' && localStyles.chipBtnTextActive]}>
                            Todas ({creations.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[localStyles.chipBtn, statusFilter === 'pending' && localStyles.chipBtnActive]}
                        onPress={() => setStatusFilter('pending')}
                    >
                        <Text style={[localStyles.chipBtnText, statusFilter === 'pending' && localStyles.chipBtnTextActive]}>
                            Pendientes de Cobro
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[localStyles.chipBtn, statusFilter === 'cleared' && localStyles.chipBtnActive]}
                        onPress={() => setStatusFilter('cleared')}
                    >
                        <Text style={[localStyles.chipBtnText, statusFilter === 'cleared' && localStyles.chipBtnTextActive]}>
                            Paz y Salvo
                        </Text>
                    </TouchableOpacity>

                    <View style={localStyles.chipDivider} />

                    <Text style={localStyles.filterGroupLabel}>Moneda:</Text>
                    <TouchableOpacity
                        style={[localStyles.chipBtn, currencyFilter === 'all' && localStyles.chipBtnActive]}
                        onPress={() => setCurrencyFilter('all')}
                    >
                        <Text style={[localStyles.chipBtnText, currencyFilter === 'all' && localStyles.chipBtnTextActive]}>
                            Todas
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[localStyles.chipBtn, currencyFilter === 'COP' && localStyles.chipBtnActive]}
                        onPress={() => setCurrencyFilter('COP')}
                    >
                        <Text style={[localStyles.chipBtnText, currencyFilter === 'COP' && localStyles.chipBtnTextActive]}>
                            COP
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[localStyles.chipBtn, currencyFilter === 'USD' && localStyles.chipBtnActive]}
                        onPress={() => setCurrencyFilter('USD')}
                    >
                        <Text style={[localStyles.chipBtnText, currencyFilter === 'USD' && localStyles.chipBtnTextActive]}>
                            USD
                        </Text>
                    </TouchableOpacity>

                    {(searchQuery || statusFilter !== 'all' || currencyFilter !== 'all') && (
                        <TouchableOpacity
                            style={localStyles.resetFilterBtn}
                            onPress={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setCurrencyFilter('all');
                            }}
                        >
                            <Text style={localStyles.resetFilterText}>Limpiar Filtros</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 5. CUADRÍCULA DE CREACIONES CON ESTADO FINANCIERO */}
            {loading ? (
                <View style={localStyles.centeredState}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={localStyles.stateText}>Cargando estado financiero de creaciones...</Text>
                </View>
            ) : filteredCreations.length === 0 ? (
                <View style={localStyles.emptyStateCard}>
                    <Text style={localStyles.emptyStateStar}>✦</Text>
                    <Text style={localStyles.emptyStateTitle}>Sin registros coincidentes</Text>
                    <Text style={localStyles.emptyStateText}>
                        {searchQuery || statusFilter !== 'all' || currencyFilter !== 'all'
                            ? 'No se encontraron prendas que coincidan con los filtros seleccionados.'
                            : 'Aún no se registran creaciones con actividad comercial o cotizaciones en el taller.'}
                    </Text>
                </View>
            ) : (
                <View
                    style={[
                        localStyles.creationGrid,
                        isDesktop ? localStyles.creationGridDesktop : isTablet ? localStyles.creationGridTablet : localStyles.creationGridMobile,
                    ]}
                >
                    {filteredCreations.map((item) => {
                        const isCleared = item.payment_status === 'paid_in_full';
                        const isPartial = item.payment_status === 'partially_paid';
                        const progressPct =
                            item.quoted_total > 0
                                ? Math.min(100, Math.round((item.advance_paid / item.quoted_total) * 100))
                                : 0;

                        return (
                            <View key={item.id} style={localStyles.creationCard}>
                                {/* Cabecera de la Tarjeta */}
                                <View style={localStyles.creationCardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={localStyles.creationCardName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text style={localStyles.creationCardClient} numberOfLines={1}>
                                            👤 {item.client_name} {item.client_phone ? `· ${item.client_phone}` : ''}
                                        </Text>
                                    </View>

                                    {/* Badge de Estado de Pago */}
                                    {isCleared ? (
                                        <View style={localStyles.badgeCleared}>
                                            <Text style={localStyles.badgeClearedText}>✓ Paz y Salvo</Text>
                                        </View>
                                    ) : isPartial ? (
                                        <View style={localStyles.badgePartial}>
                                            <Text style={localStyles.badgePartialText}>◐ Con Anticipo</Text>
                                        </View>
                                    ) : (
                                        <View style={localStyles.badgeUnpaid}>
                                            <Text style={localStyles.badgeUnpaidText}>○ Sin Pagos</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Barra de Progreso de Recaudo */}
                                <View style={localStyles.progressContainer}>
                                    <View style={localStyles.progressBarBackground}>
                                        <View
                                            style={[
                                                localStyles.progressBarFill,
                                                {
                                                    width: `${progressPct}%`,
                                                    backgroundColor: isCleared ? '#4A7C59' : '#A78350',
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={localStyles.progressText}>{progressPct}% cubierto</Text>
                                </View>

                                {/* Importes Desglosados */}
                                <View style={localStyles.amountsGrid}>
                                    <View style={localStyles.amountCol}>
                                        <Text style={localStyles.amountColLabel}>COTIZADO</Text>
                                        <Text style={localStyles.amountColValue}>
                                            {item.quoted_total > 0
                                                ? formatMoney(item.quoted_total, item.contract_currency)
                                                : 'Sin cotización'}
                                        </Text>
                                    </View>

                                    <View style={localStyles.amountCol}>
                                        <Text style={localStyles.amountColLabel}>RECAUDADO</Text>
                                        <Text style={[localStyles.amountColValue, { color: '#4A7C59' }]}>
                                            {formatMoney(item.advance_paid, item.contract_currency)}
                                        </Text>
                                    </View>

                                    <View style={localStyles.amountCol}>
                                        <Text style={localStyles.amountColLabel}>SALDO</Text>
                                        <Text
                                            style={[
                                                localStyles.amountColValue,
                                                item.balance_pending > 0 && { color: '#A78350', fontWeight: '800' },
                                            ]}
                                        >
                                            {formatMoney(item.balance_pending, item.contract_currency)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Pie de Tarjeta con Enlace al Expediente */}
                                <View style={localStyles.cardFooterRow}>
                                    <Text style={localStyles.cardDateText}>
                                        {item.quote_number ? `Cot: ${item.quote_number} · ` : ''}
                                        Creada: {formatDate(item.created_at)}
                                    </Text>

                                    {onOpenCreation && (
                                        <TouchableOpacity
                                            style={localStyles.openCreationBtn}
                                            onPress={() => onOpenCreation(item.id)}
                                            activeOpacity={0.85}
                                            accessibilityLabel={`Abrir expediente de ${item.name}`}
                                        >
                                            <Text style={localStyles.openCreationBtnText}>✦ Abrir Expediente →</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
};

// ==============================================================================
// ESTILOS LOCALES DE ALTA COSTURA
// ==============================================================================

const localStyles = StyleSheet.create({
    screenScroll: {
        flex: 1,
        backgroundColor: colors.background,
    },
    screenContent: {
        padding: 24,
        paddingBottom: 64,
        maxWidth: 1320,
        width: '100%',
        alignSelf: 'center',
    },
    centeredState: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stateText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
        fontFamily: 'serif',
    },
    deniedTitle: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 8,
    },
    deniedSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 480,
        marginBottom: 24,
        lineHeight: 20,
    },
    backPrimaryBtn: {
        backgroundColor: '#171411',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backPrimaryBtnText: {
        color: '#FAF7F2',
        fontSize: 13,
        fontWeight: '600',
    },

    // Header
    headerWrapper: {
        marginBottom: 24,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    backLinkBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    backLinkText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#171411',
    },
    topActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    refreshBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    refreshBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8A6A4A',
    },
    creationsLinkBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
        backgroundColor: '#171411',
    },
    creationsLinkText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#C5A880',
    },
    titleSection: {
        marginTop: 4,
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    eyebrowStar: {
        color: '#A78350',
        fontSize: 12,
    },
    eyebrowText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: '#8A6A4A',
    },
    screenTitle: {
        fontFamily: 'serif',
        fontSize: 28,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 6,
    },
    screenSubtitle: {
        fontSize: 14,
        color: '#6B635B',
        lineHeight: 20,
        maxWidth: 820,
    },

    // Banners
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FDF0ED',
        borderLeftWidth: 4,
        borderLeftColor: '#C0392B',
        padding: 14,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorBannerText: {
        fontSize: 13,
        color: '#962D22',
        flex: 1,
        marginRight: 10,
    },
    dismissBannerText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#962D22',
    },

    // KPIs Grid
    kpiGrid: {
        gap: 16,
        marginBottom: 24,
    },
    kpiGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },
    kpiGridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    kpiGridMobile: {
        flexDirection: 'column',
    },
    kpiCard: {
        flex: 1,
        minWidth: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 16,
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    kpiCardHighlight: {
        borderColor: '#E4D5B7',
        backgroundColor: '#FCFAF7',
    },
    kpiLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#7D756D',
        marginBottom: 6,
    },
    kpiPrimaryNumber: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: '700',
        color: '#171411',
    },
    kpiSecondaryNumber: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B635B',
        marginTop: 2,
    },
    kpiSub: {
        fontSize: 11,
        color: '#999086',
        marginTop: 6,
    },
    breakdownRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    breakdownBadgePaz: {
        fontSize: 11,
        color: '#2E5A39',
        fontWeight: '600',
    },
    breakdownBadgeAbono: {
        fontSize: 11,
        color: '#8A6A4A',
        fontWeight: '600',
    },
    breakdownBadgeSin: {
        fontSize: 11,
        color: '#A43E2B',
        fontWeight: '600',
    },

    // Filtros
    filterSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 16,
        marginBottom: 24,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        height: 42,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 8,
        paddingHorizontal: 14,
        fontSize: 13,
        color: '#171411',
    },
    clearSearchBtn: {
        position: 'absolute',
        right: 12,
        padding: 4,
    },
    clearSearchBtnText: {
        fontSize: 14,
        color: '#8A6A4A',
        fontWeight: '700',
    },
    filterChipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterGroupLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7D756D',
        marginRight: 2,
    },
    chipBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    chipBtnActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    chipBtnText: {
        fontSize: 12,
        color: '#6B635B',
        fontWeight: '500',
    },
    chipBtnTextActive: {
        color: '#FAF7F2',
        fontWeight: '700',
    },
    chipDivider: {
        width: 1,
        height: 18,
        backgroundColor: '#EFECE6',
        marginHorizontal: 4,
    },
    resetFilterBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 'auto',
    },
    resetFilterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#C0392B',
    },

    // Cuadrícula de Creaciones
    creationGrid: {
        gap: 16,
    },
    creationGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    creationGridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    creationGridMobile: {
        flexDirection: 'column',
    },
    creationCard: {
        flex: 1,
        minWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 18,
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    creationCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 12,
    },
    creationCardName: {
        fontFamily: 'serif',
        fontSize: 17,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 4,
    },
    creationCardClient: {
        fontSize: 12,
        color: '#6B635B',
    },
    badgeCleared: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#EBF5EE',
        borderWidth: 1,
        borderColor: '#C3E6CB',
    },
    badgeClearedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2E5A39',
    },
    badgePartial: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#FFF9ED',
        borderWidth: 1,
        borderColor: '#E4D5B7',
    },
    badgePartialText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6A4A',
    },
    badgeUnpaid: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#FDF0ED',
        borderWidth: 1,
        borderColor: '#F5C6CB',
    },
    badgeUnpaidText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A43E2B',
    },

    // Barra de Progreso
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    progressBarBackground: {
        flex: 1,
        height: 6,
        backgroundColor: '#EFECE6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6A4A',
        width: 80,
        textAlign: 'right',
    },

    // Métricas por Tarjeta
    amountsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAF7F2',
        borderRadius: 8,
        padding: 10,
        marginBottom: 14,
    },
    amountCol: {
        flex: 1,
        alignItems: 'center',
    },
    amountColLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.6,
        color: '#8A6A4A',
        marginBottom: 2,
    },
    amountColValue: {
        fontFamily: 'serif',
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
    },

    // Pie de Tarjeta
    cardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5F3EF',
    },
    cardDateText: {
        fontSize: 11,
        color: '#999086',
        flex: 1,
        marginRight: 8,
    },
    openCreationBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#171411',
    },
    openCreationBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C5A880',
    },

    // Estado Vacío
    emptyStateCard: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    emptyStateStar: {
        fontSize: 24,
        color: '#A78350',
        marginBottom: 12,
    },
    emptyStateTitle: {
        fontFamily: 'serif',
        fontSize: 18,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 6,
    },
    emptyStateText: {
        fontSize: 13,
        color: '#7D756D',
        textAlign: 'center',
        maxWidth: 420,
        lineHeight: 18,
    },
});

