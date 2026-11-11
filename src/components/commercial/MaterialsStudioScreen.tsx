// ==============================================================================
// ATELIER DIGITAL — MÓDULO 05: PANTALLA MAESTRA DE MATERIALES, PROVEEDORES Y TRM
// Archivo: src/components/commercial/MaterialsStudioScreen.tsx
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    AtelierCurrencyRate,
    AtelierSupplier,
    MaterialCategory,
    MaterialDrapeProfile,
    MaterialItem,
    MaterialStockAdjustment,
    SupplierCurrency,
    SupplierType,
} from '../../types/commercial';
import {
    archiveSupplier,
    createCommercialAssetSignedUrls,
    fetchActiveCurrencyRates,
    fetchMaterials,
    fetchRecentStockAdjustments,
    fetchSuppliers,
    updateMaterial,
    updateSupplier,
} from '../../services/commercialService';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { MaterialFormModal } from './MaterialFormModal';
import { SupplierFormModal } from './SupplierFormModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { ManualTrmPanel } from './ManualTrmPanel';
import {
    MATERIAL_CATEGORY_LABELS,
    MATERIAL_CATEGORY_OPTIONS,
    MATERIAL_DRAPE_LABELS,
    MATERIAL_DRAPE_OPTIONS,
    STOCK_ADJUSTMENT_TYPE_LABELS,
    SUPPLIER_TYPE_LABELS,
    SUPPLIER_TYPE_OPTIONS,
    formatCurrencyRateValue,
    formatMaterialMoney,
    formatShortDateEs,
    getSwatchContrastTextColor,
    isValidHexColor,
} from './materialLabels';

export interface MaterialsStudioScreenProps {
    onBack: () => void;
    onOpenCreations?: () => void;
}

type StudioTab = 'catalog' | 'suppliers' | 'stock' | 'trm';

export const MaterialsStudioScreen: React.FC<MaterialsStudioScreenProps> = ({
    onBack,
    onOpenCreations,
}) => {
    const { role, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 720;
    const isDesktop = width >= 1040;
    const isAuthorizedDesigner = role === 'designer' || role === 'admin';

    const [activeTab, setActiveTab] = useState<StudioTab>('catalog');

    // Catálogo textil
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [allActiveMaterials, setAllActiveMaterials] = useState<MaterialItem[]>([]);
    const [materialsLoading, setMaterialsLoading] = useState(true);
    const [materialsError, setMaterialsError] = useState<string | null>(null);
    const [materialCategoryFilter, setMaterialCategoryFilter] = useState<MaterialCategory | 'all'>('all');
    const [materialDrapeFilter, setMaterialDrapeFilter] = useState<MaterialDrapeProfile | 'all'>('all');
    const [materialSearch, setMaterialSearch] = useState('');
    const [materialWithStockOnly, setMaterialWithStockOnly] = useState(false);
    const [showArchivedMaterials, setShowArchivedMaterials] = useState(false);
    const [filterSupplierId, setFilterSupplierId] = useState<string | null>(null);

    // Proveedores
    const [suppliers, setSuppliers] = useState<AtelierSupplier[]>([]);
    const [allSuppliersForPickers, setAllSuppliersForPickers] = useState<AtelierSupplier[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(true);
    const [suppliersError, setSuppliersError] = useState<string | null>(null);
    const [supplierTypeFilter, setSupplierTypeFilter] = useState<SupplierType | 'all'>('all');
    const [supplierCurrencyFilter, setSupplierCurrencyFilter] = useState<SupplierCurrency | 'all'>('all');
    const [onlyPreferredSuppliers, setOnlyPreferredSuppliers] = useState(false);
    const [showArchivedSuppliers, setShowArchivedSuppliers] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState('');

    // Bitácora global de stock + TRM + URLs firmadas
    const [recentAdjustments, setRecentAdjustments] = useState<MaterialStockAdjustment[]>([]);
    const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
    const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
    const [activeRates, setActiveRates] = useState<AtelierCurrencyRate[]>([]);
    const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string | null>>({});

    // Modales
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<AtelierSupplier | null>(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [stockTargetMaterial, setStockTargetMaterial] = useState<MaterialItem | null>(null);
    const [actionBannerError, setActionBannerError] = useState<string | null>(null);
    const [pendingArchiveTarget, setPendingArchiveTarget] = useState<
        | { kind: 'material'; item: MaterialItem }
        | { kind: 'supplier'; item: AtelierSupplier }
        | null
    >(null);
    const [archivingConfirming, setArchivingConfirming] = useState(false);

    const signStoragePaths = useCallback(async (paths: (string | null | undefined)[]) => {
        const clean = paths.filter((p): p is string => Boolean(p && p.trim().length > 0));
        if (clean.length === 0) return;
        const { data } = await createCommercialAssetSignedUrls(clean, 3600);
        if (Object.keys(data).length > 0) {
            setSignedUrlMap((prev) => ({ ...prev, ...data }));
        }
    }, []);

    const applyMaterialsResults = useCallback(
        async (
            filteredRes: Awaited<ReturnType<typeof fetchMaterials>>,
            activeAllRes: Awaited<ReturnType<typeof fetchMaterials>>,
            isStillActive?: () => boolean
        ) => {
            if (isStillActive && !isStillActive()) return;
            setMaterials(filteredRes.data);
            setAllActiveMaterials(activeAllRes.data);
            setMaterialsError(filteredRes.error);
            setMaterialsLoading(false);
            await signStoragePaths(filteredRes.data.map((m) => m.storage_path));
        },
        [signStoragePaths]
    );

    const loadMaterialsData = useCallback(async () => {
        if (!isAuthorizedDesigner) return;
        setMaterialsLoading(true);
        setMaterialsError(null);
        const [filteredRes, activeAllRes] = await Promise.all([
            fetchMaterials({
                category: materialCategoryFilter,
                drapeProfile: materialDrapeFilter,
                searchQuery: materialSearch,
                onlyActive: !showArchivedMaterials,
                withStockOnly: materialWithStockOnly,
                supplierId: filterSupplierId || undefined,
            }),
            fetchMaterials({ onlyActive: true }),
        ]);
        await applyMaterialsResults(filteredRes, activeAllRes);
    }, [
        isAuthorizedDesigner,
        materialCategoryFilter,
        materialDrapeFilter,
        materialSearch,
        showArchivedMaterials,
        materialWithStockOnly,
        filterSupplierId,
        applyMaterialsResults,
    ]);

    const applySuppliersResults = useCallback(
        async (
            filteredRes: Awaited<ReturnType<typeof fetchSuppliers>>,
            allRes: Awaited<ReturnType<typeof fetchSuppliers>>,
            isStillActive?: () => boolean
        ) => {
            if (isStillActive && !isStillActive()) return;
            setSuppliers(filteredRes.data);
            setAllSuppliersForPickers(allRes.data);
            setSuppliersError(filteredRes.error);
            setSuppliersLoading(false);
            await signStoragePaths(filteredRes.data.map((s) => s.storage_path));
        },
        [signStoragePaths]
    );

    const loadSuppliersData = useCallback(async () => {
        if (!isAuthorizedDesigner) return;
        setSuppliersLoading(true);
        setSuppliersError(null);
        const [filteredRes, allRes] = await Promise.all([
            fetchSuppliers({
                onlyActive: !showArchivedSuppliers,
                onlyPreferred: onlyPreferredSuppliers,
                supplierType: supplierTypeFilter,
                currency: supplierCurrencyFilter,
                searchQuery: supplierSearch,
            }),
            fetchSuppliers({ onlyActive: false }),
        ]);
        await applySuppliersResults(filteredRes, allRes);
    }, [
        isAuthorizedDesigner,
        showArchivedSuppliers,
        onlyPreferredSuppliers,
        supplierTypeFilter,
        supplierCurrencyFilter,
        supplierSearch,
        applySuppliersResults,
    ]);

    const loadStockAndRates = useCallback(async () => {
        if (!isAuthorizedDesigner) return;
        setAdjustmentsLoading(true);
        const [adjRes, ratesRes] = await Promise.all([
            fetchRecentStockAdjustments(50),
            fetchActiveCurrencyRates(),
        ]);
        setRecentAdjustments(adjRes.data);
        setAdjustmentsError(adjRes.error);
        setActiveRates(ratesRes.data);
        setAdjustmentsLoading(false);
    }, [isAuthorizedDesigner]);

    useEffect(() => {
        if (!isAuthorizedDesigner) return;
        let active = true;
        Promise.all([
            fetchMaterials({
                category: materialCategoryFilter,
                drapeProfile: materialDrapeFilter,
                searchQuery: materialSearch,
                onlyActive: !showArchivedMaterials,
                withStockOnly: materialWithStockOnly,
                supplierId: filterSupplierId || undefined,
            }),
            fetchMaterials({ onlyActive: true }),
        ]).then(([filteredRes, activeAllRes]) =>
            applyMaterialsResults(filteredRes, activeAllRes, () => active)
        );
        return () => {
            active = false;
        };
    }, [
        isAuthorizedDesigner,
        materialCategoryFilter,
        materialDrapeFilter,
        materialSearch,
        showArchivedMaterials,
        materialWithStockOnly,
        filterSupplierId,
        applyMaterialsResults,
    ]);

    useEffect(() => {
        if (!isAuthorizedDesigner) return;
        let active = true;
        Promise.all([
            fetchSuppliers({
                onlyActive: !showArchivedSuppliers,
                onlyPreferred: onlyPreferredSuppliers,
                supplierType: supplierTypeFilter,
                currency: supplierCurrencyFilter,
                searchQuery: supplierSearch,
            }),
            fetchSuppliers({ onlyActive: false }),
        ]).then(([filteredRes, allRes]) =>
            applySuppliersResults(filteredRes, allRes, () => active)
        );
        return () => {
            active = false;
        };
    }, [
        isAuthorizedDesigner,
        showArchivedSuppliers,
        onlyPreferredSuppliers,
        supplierTypeFilter,
        supplierCurrencyFilter,
        supplierSearch,
        applySuppliersResults,
    ]);

    useEffect(() => {
        if (!isAuthorizedDesigner) return;
        let active = true;
        Promise.all([fetchRecentStockAdjustments(50), fetchActiveCurrencyRates()]).then(
            ([adjRes, ratesRes]) => {
                if (!active) return;
                setRecentAdjustments(adjRes.data);
                setAdjustmentsError(adjRes.error);
                setActiveRates(ratesRes.data);
                setAdjustmentsLoading(false);
            }
        );
        return () => {
            active = false;
        };
    }, [isAuthorizedDesigner]);

    const usdCopRate = useMemo(
        () =>
            activeRates.find(
                (r) => r.base_currency === 'USD' && r.target_currency === 'COP' && r.is_active
            ) || null,
        [activeRates]
    );

    const selectedSupplierFilterObj = useMemo(
        () => allSuppliersForPickers.find((s) => s.id === filterSupplierId) || null,
        [allSuppliersForPickers, filterSupplierId]
    );

    const kpiStats = useMemo(() => {
        const activeCount = allActiveMaterials.length;
        const withStockCount = allActiveMaterials.filter(
            (m) => Number(m.current_stock ?? 0) > 0
        ).length;
        const activeSuppliersCount = allSuppliersForPickers.filter((s) => s.is_active).length;
        return {
            activeCount,
            withStockCount,
            activeSuppliersCount,
        };
    }, [allActiveMaterials, allSuppliersForPickers]);

    const handleToggleMaterialArchive = async (item: MaterialItem) => {
        if (item.is_active) {
            setPendingArchiveTarget({ kind: 'material', item });
            return;
        }
        setActionBannerError(null);
        const res = await updateMaterial(item.id, { is_active: true });
        if (res.error) {
            setActionBannerError(res.error);
            return;
        }
        await loadMaterialsData();
    };

    const handleToggleSupplierArchive = async (sup: AtelierSupplier) => {
        if (sup.is_active) {
            setPendingArchiveTarget({ kind: 'supplier', item: sup });
            return;
        }
        setActionBannerError(null);
        const res = await updateSupplier(sup.id, { is_active: true });
        if (res.error) {
            setActionBannerError(res.error);
            return;
        }
        await loadSuppliersData();
    };

    const handleConfirmArchive = async () => {
        if (!pendingArchiveTarget) return;
        setArchivingConfirming(true);
        setActionBannerError(null);

        if (pendingArchiveTarget.kind === 'material') {
            const res = await updateMaterial(pendingArchiveTarget.item.id, { is_active: false });
            setArchivingConfirming(false);
            if (res.error) {
                setActionBannerError(res.error);
                setPendingArchiveTarget(null);
                return;
            }
            setPendingArchiveTarget(null);
            await loadMaterialsData();
            return;
        }

        const res = await archiveSupplier(pendingArchiveTarget.item.id);
        setArchivingConfirming(false);
        if (res.error) {
            setActionBannerError(res.error);
            setPendingArchiveTarget(null);
            return;
        }
        setPendingArchiveTarget(null);
        await loadSuppliersData();
    };

    const gridContainerStyle = [
        s.cardsGrid,
        Platform.OS === 'web' &&
            ({
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                gap: 16,
                alignItems: 'stretch',
            } as any),
    ];

    if (!authLoading && !isAuthorizedDesigner) {
        return (
            <View style={s.screen}>
                <View style={s.topBar}>
                    <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
                        <Text style={s.backBtnText}>← Volver</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ padding: 28, maxWidth: 560, alignSelf: 'center', marginTop: 40 }}>
                    <View style={s.sectionCard}>
                        <Text style={s.heroTitle}>Acceso Exclusivo del Atelier</Text>
                        <Text style={s.heroSubtitle}>
                            La administración de materiales, directorio de proveedores, bitácora de stock y TRM manual está reservada para el perfil de diseñadora.
                        </Text>
                        <TouchableOpacity style={s.primaryTopBtn} onPress={onBack}>
                            <Text style={s.primaryTopBtnText}>Regresar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={s.screen}>
            {/* Barra superior editorial */}
            <View style={s.topBar}>
                <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
                    <Text style={s.backBtnText}>← Volver al Atelier Diseñadora</Text>
                </TouchableOpacity>

                <View style={s.topActions}>
                    {onOpenCreations ? (
                        <TouchableOpacity style={s.secondaryTopBtn} onPress={onOpenCreations}>
                            <Text style={s.secondaryTopBtnText}>Ir a Creaciones (M03)</Text>
                        </TouchableOpacity>
                    ) : null}

                    {activeTab === 'suppliers' ? (
                        <TouchableOpacity
                            style={s.primaryTopBtn}
                            onPress={() => {
                                setEditingSupplier(null);
                                setSupplierModalOpen(true);
                            }}
                        >
                            <Text style={s.primaryTopBtnText}>+ Nuevo Proveedor</Text>
                        </TouchableOpacity>
                    ) : activeTab === 'catalog' ? (
                        <TouchableOpacity
                            style={s.primaryTopBtn}
                            onPress={() => {
                                setEditingMaterial(null);
                                setMaterialModalOpen(true);
                            }}
                        >
                            <Text style={s.primaryTopBtnText}>+ Nuevo Material</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Editorial M05 */}
                <View style={s.heroCard}>
                    <Text style={s.heroEyebrow}>
                        ✦ MÓDULO 05 · ATELIER DE AUTOR · KATHERINE CARROLL
                    </Text>
                    <Text style={[s.heroTitle, isMobile && { fontSize: 22 }]}>
                        Materiales, Proveedores & Control Textil
                    </Text>
                    <Text style={s.heroSubtitle}>
                        Catálogo maestro de telas e insumos con soporte de 8 categorías y 7 unidades, casas textiles, fotografías privadas en Storage con URLs firmadas, bitácora append-only de inventario y TRM manual informativa.
                    </Text>

                    <View style={s.kpiGrid}>
                        <View style={[s.kpiBox, isMobile && s.kpiBoxMobile]}>
                            <Text style={[s.kpiValue, isMobile && s.kpiValueMobile]}>
                                {kpiStats.activeCount}
                            </Text>
                            <Text style={s.kpiLabel}>MATERIALES ACTIVOS</Text>
                        </View>
                        <View style={[s.kpiBox, isMobile && s.kpiBoxMobile]}>
                            <Text style={[s.kpiValue, isMobile && s.kpiValueMobile]}>
                                {kpiStats.withStockCount}
                            </Text>
                            <Text style={s.kpiLabel}>CON EXISTENCIA &gt; 0</Text>
                        </View>
                        <View style={[s.kpiBox, isMobile && s.kpiBoxMobile]}>
                            <Text style={[s.kpiValue, isMobile && s.kpiValueMobile]}>
                                {kpiStats.activeSuppliersCount}
                            </Text>
                            <Text style={s.kpiLabel}>PROVEEDORES ACTIVOS</Text>
                        </View>
                        <View style={[s.kpiBox, isMobile && s.kpiBoxMobile]}>
                            <Text
                                style={[
                                    s.kpiValue,
                                    { fontSize: usdCopRate ? (isMobile ? 14 : 17) : (isMobile ? 12 : 14) },
                                ]}
                            >
                                {usdCopRate
                                    ? formatCurrencyRateValue(usdCopRate.rate_value, usdCopRate.target_currency)
                                    : 'Sin configurar'}
                            </Text>
                            <Text style={s.kpiLabel}>TRM MANUAL USD → COP</Text>
                        </View>
                    </View>
                </View>

                {actionBannerError ? (
                    <View style={s.errorBox}>
                        <Text style={s.errorText}>{actionBannerError}</Text>
                    </View>
                ) : null}

                {/* Pestañas M05 */}
                <View style={s.tabsRow}>
                    {(
                        [
                            { id: 'catalog', label: 'Catálogo Textil' },
                            { id: 'suppliers', label: 'Proveedores' },
                            { id: 'stock', label: 'Bitácora de Stock' },
                            { id: 'trm', label: 'TRM Manual' },
                        ] as { id: StudioTab; label: string }[]
                    ).map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[s.tabBtn, isMobile && s.tabBtnMobile, active && s.tabBtnActive]}
                                onPress={() => setActiveTab(tab.id)}
                            >
                                <Text style={[s.tabBtnText, active && s.tabBtnTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ============================================================== */}
                {/* TAB 1: CATÁLOGO TEXTIL                                         */}
                {/* ============================================================== */}
                {activeTab === 'catalog' && (
                    <View>
                        <View style={s.filterCard}>
                            <View style={[s.searchRow, isMobile && { flexDirection: 'column' }]}>
                                <TextInput
                                    style={[s.searchInput, { flex: 1 }]}
                                    placeholder="Buscar por nombre, SKU, color, casa textil o composición..."
                                    placeholderTextColor={colors.textMuted}
                                    value={materialSearch}
                                    onChangeText={setMaterialSearch}
                                />
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        style={[s.togglePill, materialWithStockOnly && s.togglePillActive]}
                                        onPress={() => setMaterialWithStockOnly(!materialWithStockOnly)}
                                    >
                                        <Text
                                            style={[
                                                s.togglePillText,
                                                materialWithStockOnly && s.togglePillTextActive,
                                            ]}
                                        >
                                            Solo Stock &gt; 0
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.togglePill, showArchivedMaterials && s.togglePillActive]}
                                        onPress={() => setShowArchivedMaterials(!showArchivedMaterials)}
                                    >
                                        <Text
                                            style={[
                                                s.togglePillText,
                                                showArchivedMaterials && s.togglePillTextActive,
                                            ]}
                                        >
                                            Incluir Archivados
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {selectedSupplierFilterObj ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: '#FFF8E7',
                                        borderColor: colors.sand,
                                        borderWidth: 1,
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: colors.bronze, fontWeight: '700' }}>
                                        Filtrando por proveedor: {selectedSupplierFilterObj.name}
                                    </Text>
                                    <TouchableOpacity onPress={() => setFilterSupplierId(null)}>
                                        <Text style={{ fontSize: 12, color: colors.atelierBlack, fontWeight: '700' }}>
                                            Limpiar ×
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            {/* 8 Categorías */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={s.chipsRow}
                            >
                                <TouchableOpacity
                                    style={[
                                        s.chip,
                                        materialCategoryFilter === 'all' && s.chipActive,
                                    ]}
                                    onPress={() => setMaterialCategoryFilter('all')}
                                >
                                    <Text
                                        style={[
                                            s.chipText,
                                            materialCategoryFilter === 'all' && s.chipTextActive,
                                        ]}
                                    >
                                        Todas las Categorías
                                    </Text>
                                </TouchableOpacity>
                                {MATERIAL_CATEGORY_OPTIONS.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            s.chip,
                                            materialCategoryFilter === cat.id && s.chipActive,
                                        ]}
                                        onPress={() => setMaterialCategoryFilter(cat.id)}
                                    >
                                        <Text
                                            style={[
                                                s.chipText,
                                                materialCategoryFilter === cat.id && s.chipTextActive,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Filtro de caída textil */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 6, paddingTop: 6 }}
                            >
                                <TouchableOpacity
                                    style={[
                                        s.chipSub,
                                        materialDrapeFilter === 'all' && s.chipSubActive,
                                    ]}
                                    onPress={() => setMaterialDrapeFilter('all')}
                                >
                                    <Text
                                        style={[
                                            s.chipSubText,
                                            materialDrapeFilter === 'all' && s.chipSubTextActive,
                                        ]}
                                    >
                                        Cualquier Caída
                                    </Text>
                                </TouchableOpacity>
                                {MATERIAL_DRAPE_OPTIONS.map((d) => (
                                    <TouchableOpacity
                                        key={d.id}
                                        style={[
                                            s.chipSub,
                                            materialDrapeFilter === d.id && s.chipSubActive,
                                        ]}
                                        onPress={() => setMaterialDrapeFilter(d.id)}
                                    >
                                        <Text
                                            style={[
                                                s.chipSubText,
                                                materialDrapeFilter === d.id && s.chipSubTextActive,
                                            ]}
                                        >
                                            {d.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {materialsError ? (
                            <View style={s.errorBox}>
                                <Text style={s.errorText}>{materialsError}</Text>
                            </View>
                        ) : null}

                        {materialsLoading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                                <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                                    Cargando catálogo textil...
                                </Text>
                            </View>
                        ) : materials.length === 0 ? (
                            <View style={s.emptyBox}>
                                <Text style={s.emptyTitle}>Sin materiales para los filtros actuales</Text>
                                <Text style={s.emptyText}>
                                    Registra una nueva tela o insumo para el catálogo del atelier, o ajusta los filtros activos.
                                </Text>
                                <TouchableOpacity
                                    style={s.primaryTopBtn}
                                    onPress={() => {
                                        setEditingMaterial(null);
                                        setMaterialModalOpen(true);
                                    }}
                                >
                                    <Text style={s.primaryTopBtnText}>+ Nuevo Material</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={gridContainerStyle}>
                                {materials.map((mat) => {
                                    const signedImg = mat.storage_path
                                        ? signedUrlMap[mat.storage_path]
                                        : null;
                                    const thumbUri = signedImg || mat.photo_url || null;
                                    const supplierLabel = mat.supplier?.name || mat.supplier_name;

                                    return (
                                        <View
                                            key={mat.id}
                                            style={[
                                                s.itemCard,
                                                !mat.is_active && { opacity: 0.72, borderStyle: 'dashed' },
                                            ]}
                                        >
                                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                                <View
                                                    style={[
                                                        s.thumbBox,
                                                        isValidHexColor(mat.color_code) && {
                                                            backgroundColor: mat.color_code!.trim(),
                                                        },
                                                    ]}
                                                >
                                                    {thumbUri ? (
                                                        <Image
                                                            source={{ uri: thumbUri }}
                                                            style={{ width: '100%', height: '100%' }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Text
                                                            style={[
                                                                s.thumbPlaceholderText,
                                                                { color: getSwatchContrastTextColor(mat.color_code) },
                                                            ]}
                                                        >
                                                            ✦
                                                        </Text>
                                                    )}
                                                </View>

                                                <View style={{ flex: 1 }}>
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            flexWrap: 'wrap',
                                                            gap: 6,
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        <View style={s.badgeGold}>
                                                            <Text style={s.badgeGoldText}>
                                                                {MATERIAL_CATEGORY_LABELS[mat.category]}
                                                            </Text>
                                                        </View>
                                                        {mat.drape_profile ? (
                                                            <View style={s.badgeNeutral}>
                                                                <Text style={s.badgeNeutralText}>
                                                                    {MATERIAL_DRAPE_LABELS[mat.drape_profile]}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                        {!mat.is_active ? (
                                                            <View style={s.badgeMuted}>
                                                                <Text style={s.badgeMutedText}>ARCHIVADO</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    <Text style={s.itemTitle}>{mat.name}</Text>
                                                    <Text style={s.itemMeta}>
                                                        {mat.sku_code ? `SKU: ${mat.sku_code} · ` : ''}
                                                        {mat.composition || 'Alta costura'}
                                                        {mat.color_name ? ` · ${mat.color_name}` : ''}
                                                    </Text>
                                                    {supplierLabel ? (
                                                        <Text style={s.itemMeta}>
                                                            Proveedor: {supplierLabel}
                                                            {mat.supplier_ref ? ` (Ref: ${mat.supplier_ref})` : ''}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>

                                            {/* Especificaciones y precios */}
                                            <View style={s.itemSpecStrip}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={s.specLabel}>TARIFA UNITARIA ({mat.unit})</Text>
                                                    {mat.unit_price > 0 || !(mat.unit_price_usd && mat.unit_price_usd > 0) ? (
                                                        <Text style={s.specValue}>
                                                            {formatMaterialMoney(mat.unit_price, 'COP')} / {mat.unit}
                                                        </Text>
                                                    ) : null}
                                                    {mat.unit_price_usd && mat.unit_price_usd > 0 ? (
                                                        <Text style={s.specSubValue}>
                                                            {formatMaterialMoney(mat.unit_price_usd, 'USD')} / {mat.unit}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={s.specLabel}>EXISTENCIA EN ATELIER</Text>
                                                    <Text style={s.specValue}>
                                                        {mat.current_stock ?? 0} {mat.unit}
                                                    </Text>
                                                    <Text style={s.specSubValue}>
                                                        Mín. compra: {mat.min_purchase_unit} {mat.unit}
                                                    </Text>
                                                </View>
                                            </View>

                                            {(mat.width_cm || mat.weight_gsm || mat.care_instructions) ? (
                                                <Text style={s.itemSubNote}>
                                                    {mat.width_cm ? `Ancho: ${mat.width_cm} cm` : ''}
                                                    {mat.width_cm && mat.weight_gsm ? ' · ' : ''}
                                                    {mat.weight_gsm ? `Gramaje: ${mat.weight_gsm} gr/m²` : ''}
                                                    {(mat.width_cm || mat.weight_gsm) && mat.care_instructions ? ' · ' : ''}
                                                    {mat.care_instructions ? `Cuidados: ${mat.care_instructions}` : ''}
                                                </Text>
                                            ) : null}

                                            {mat.tags && mat.tags.length > 0 ? (
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                                    {mat.tags.map((t) => (
                                                        <View key={t} style={s.tagPill}>
                                                            <Text style={s.tagPillText}>#{t}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : null}

                                            <View style={s.cardActionsRow}>
                                                <TouchableOpacity
                                                    style={s.cardActionBtn}
                                                    onPress={() => {
                                                        setEditingMaterial(mat);
                                                        setMaterialModalOpen(true);
                                                    }}
                                                >
                                                    <Text style={s.cardActionBtnText}>Editar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[s.cardActionBtn, s.cardActionGold]}
                                                    onPress={() => {
                                                        setStockTargetMaterial(mat);
                                                        setStockModalOpen(true);
                                                    }}
                                                >
                                                    <Text style={[s.cardActionBtnText, { color: colors.atelierBlack }]}>
                                                        Stock / Bitácora
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={s.cardActionBtn}
                                                    onPress={() => handleToggleMaterialArchive(mat)}
                                                >
                                                    <Text style={s.cardActionBtnText}>
                                                        {mat.is_active ? 'Archivar' : 'Reactivar'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* ============================================================== */}
                {/* TAB 2: PROVEEDORES                                             */}
                {/* ============================================================== */}
                {activeTab === 'suppliers' && (
                    <View>
                        <View style={s.filterCard}>
                            <View style={[s.searchRow, isMobile && { flexDirection: 'column' }]}>
                                <TextInput
                                    style={[s.searchInput, { flex: 1 }]}
                                    placeholder="Buscar por nombre, razón social, código, ciudad o contacto..."
                                    placeholderTextColor={colors.textMuted}
                                    value={supplierSearch}
                                    onChangeText={setSupplierSearch}
                                />
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        style={[s.togglePill, onlyPreferredSuppliers && s.togglePillActive]}
                                        onPress={() => setOnlyPreferredSuppliers(!onlyPreferredSuppliers)}
                                    >
                                        <Text
                                            style={[
                                                s.togglePillText,
                                                onlyPreferredSuppliers && s.togglePillTextActive,
                                            ]}
                                        >
                                            ★ Solo Preferidos
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.togglePill, showArchivedSuppliers && s.togglePillActive]}
                                        onPress={() => setShowArchivedSuppliers(!showArchivedSuppliers)}
                                    >
                                        <Text
                                            style={[
                                                s.togglePillText,
                                                showArchivedSuppliers && s.togglePillTextActive,
                                            ]}
                                        >
                                            Incluir Archivados
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={s.chipsRow}
                            >
                                <TouchableOpacity
                                    style={[s.chip, supplierTypeFilter === 'all' && s.chipActive]}
                                    onPress={() => setSupplierTypeFilter('all')}
                                >
                                    <Text
                                        style={[
                                            s.chipText,
                                            supplierTypeFilter === 'all' && s.chipTextActive,
                                        ]}
                                    >
                                        Todos los Tipos
                                    </Text>
                                </TouchableOpacity>
                                {SUPPLIER_TYPE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            s.chip,
                                            supplierTypeFilter === opt.id && s.chipActive,
                                        ]}
                                        onPress={() => setSupplierTypeFilter(opt.id)}
                                    >
                                        <Text
                                            style={[
                                                s.chipText,
                                                supplierTypeFilter === opt.id && s.chipTextActive,
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: 6 }}>
                                {(['all', 'COP', 'USD', 'EUR'] as const).map((curr) => (
                                    <TouchableOpacity
                                        key={curr}
                                        style={[
                                            s.chipSub,
                                            supplierCurrencyFilter === curr && s.chipSubActive,
                                        ]}
                                        onPress={() => setSupplierCurrencyFilter(curr)}
                                    >
                                        <Text
                                            style={[
                                                s.chipSubText,
                                                supplierCurrencyFilter === curr && s.chipSubTextActive,
                                            ]}
                                        >
                                            {curr === 'all' ? 'Todas las Monedas' : curr}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {suppliersError ? (
                            <View style={s.errorBox}>
                                <Text style={s.errorText}>{suppliersError}</Text>
                            </View>
                        ) : null}

                        {suppliersLoading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            </View>
                        ) : suppliers.length === 0 ? (
                            <View style={s.emptyBox}>
                                <Text style={s.emptyTitle}>Sin proveedores registrados</Text>
                                <Text style={s.emptyText}>
                                    Registra tus casas textiles, mercerías y talleres de bordado para vincularlos al catálogo de materiales.
                                </Text>
                                <TouchableOpacity
                                    style={s.primaryTopBtn}
                                    onPress={() => {
                                        setEditingSupplier(null);
                                        setSupplierModalOpen(true);
                                    }}
                                >
                                    <Text style={s.primaryTopBtnText}>+ Nuevo Proveedor</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={gridContainerStyle}>
                                {suppliers.map((sup) => {
                                    const signedLogo = sup.storage_path
                                        ? signedUrlMap[sup.storage_path]
                                        : null;
                                    return (
                                        <View
                                            key={sup.id}
                                            style={[
                                                s.itemCard,
                                                !sup.is_active && { opacity: 0.72, borderStyle: 'dashed' },
                                            ]}
                                        >
                                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                                <View style={[s.thumbBox, { backgroundColor: colors.atelierBlack }]}>
                                                    {signedLogo ? (
                                                        <Image
                                                            source={{ uri: signedLogo }}
                                                            style={{ width: '100%', height: '100%' }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Text style={{ fontFamily: 'serif', fontSize: 20, color: '#C5A880' }}>
                                                            {sup.name.charAt(0).toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>

                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                                        <View style={s.badgeGold}>
                                                            <Text style={s.badgeGoldText}>
                                                                {SUPPLIER_TYPE_LABELS[sup.supplier_type]}
                                                            </Text>
                                                        </View>
                                                        <View style={s.badgeNeutral}>
                                                            <Text style={s.badgeNeutralText}>
                                                                {sup.default_currency}
                                                            </Text>
                                                        </View>
                                                        {sup.is_preferred ? (
                                                            <View style={s.badgeSuccess}>
                                                                <Text style={s.badgeSuccessText}>★ PREFERIDO</Text>
                                                            </View>
                                                        ) : null}
                                                        {!sup.is_active ? (
                                                            <View style={s.badgeMuted}>
                                                                <Text style={s.badgeMutedText}>ARCHIVADO</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    <Text style={s.itemTitle}>{sup.name}</Text>
                                                    <Text style={s.itemMeta}>
                                                        {sup.code ? `Cód: ${sup.code} · ` : ''}
                                                        {[sup.city, sup.country].filter(Boolean).join(', ') || 'Ubicación sin especificar'}
                                                    </Text>
                                                    {sup.contact_name ? (
                                                        <Text style={s.itemMeta}>
                                                            Contacto: {sup.contact_name}
                                                            {sup.whatsapp || sup.phone ? ` · ${sup.whatsapp || sup.phone}` : ''}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>

                                            {(sup.lead_time_days !== null && sup.lead_time_days !== undefined) ||
                                            sup.min_order_policy ||
                                            sup.payment_terms ? (
                                                <View style={s.itemSpecStrip}>
                                                    <View style={{ flex: 1 }}>
                                                        {sup.lead_time_days !== null && sup.lead_time_days !== undefined ? (
                                                            <Text style={s.specSubValue}>
                                                                Tiempo entrega: {sup.lead_time_days} días
                                                            </Text>
                                                        ) : null}
                                                        {sup.min_order_policy ? (
                                                            <Text style={s.specSubValue}>
                                                                Mínimos: {sup.min_order_policy}
                                                            </Text>
                                                        ) : null}
                                                        {sup.payment_terms ? (
                                                            <Text style={s.specSubValue}>
                                                                Pago: {sup.payment_terms}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            ) : null}

                                            {sup.specialty_tags && sup.specialty_tags.length > 0 ? (
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                                    {sup.specialty_tags.map((t) => (
                                                        <View key={t} style={s.tagPill}>
                                                            <Text style={s.tagPillText}>{t}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : null}

                                            <View style={s.cardActionsRow}>
                                                <TouchableOpacity
                                                    style={s.cardActionBtn}
                                                    onPress={() => {
                                                        setEditingSupplier(sup);
                                                        setSupplierModalOpen(true);
                                                    }}
                                                >
                                                    <Text style={s.cardActionBtnText}>Editar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[s.cardActionBtn, s.cardActionGold]}
                                                    onPress={() => {
                                                        setFilterSupplierId(sup.id);
                                                        setActiveTab('catalog');
                                                    }}
                                                >
                                                    <Text style={[s.cardActionBtnText, { color: colors.atelierBlack }]}>
                                                        Ver Materiales
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={s.cardActionBtn}
                                                    onPress={() => handleToggleSupplierArchive(sup)}
                                                >
                                                    <Text style={s.cardActionBtnText}>
                                                        {sup.is_active ? 'Archivar' : 'Reactivar'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* ============================================================== */}
                {/* TAB 3: BITÁCORA APPEND-ONLY DE STOCK                           */}
                {/* ============================================================== */}
                {activeTab === 'stock' && (
                    <View style={{ gap: 16 }}>
                        <View style={s.sectionCard}>
                            <Text style={s.sectionCardTitle}>
                                Ajuste Manual Rápido de Stock (Bitácora Append-Only)
                            </Text>
                            <Text style={s.sectionCardSub}>
                                Selecciona un material activo para registrar ingresos por compra, salidas de taller o conteos físicos. Cada movimiento es inmutable y nunca se descuenta de forma automática desde propuestas o cotizaciones.
                            </Text>

                            {allActiveMaterials.length === 0 ? (
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10 }}>
                                    Registra primero al menos un material en el Catálogo Textil.
                                </Text>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 8, paddingTop: 12 }}
                                >
                                    {allActiveMaterials.map((mat) => (
                                        <TouchableOpacity
                                            key={mat.id}
                                            style={s.quickStockPill}
                                            onPress={() => {
                                                setStockTargetMaterial(mat);
                                                setStockModalOpen(true);
                                            }}
                                        >
                                            <Text style={s.quickStockTitle}>{mat.name}</Text>
                                            <Text style={s.quickStockSub}>
                                                Stock: {mat.current_stock ?? 0} {mat.unit} · Ajustar →
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        <View style={s.sectionCard}>
                            <Text style={s.sectionCardTitle}>
                                Movimientos Recientes de Inventario ({recentAdjustments.length})
                            </Text>
                            <Text style={s.sectionCardSub}>
                                Registro cronológico inmutable (sin edición ni eliminación permitidas).
                            </Text>

                            {adjustmentsError ? (
                                <View style={[s.errorBox, { marginTop: 10 }]}>
                                    <Text style={s.errorText}>{adjustmentsError}</Text>
                                </View>
                            ) : null}

                            {adjustmentsLoading ? (
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color={colors.champagneGold} />
                                </View>
                            ) : recentAdjustments.length === 0 ? (
                                <View style={[s.emptyBox, { marginTop: 12 }]}>
                                    <Text style={s.emptyTitle}>Sin ajustes de inventario registrados</Text>
                                    <Text style={s.emptyText}>
                                        Selecciona un material arriba para registrar su carga inicial o primer movimiento físico.
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ marginTop: 12 }}>
                                    {recentAdjustments.map((adj) => {
                                        const isPositive = adj.quantity_delta >= 0;
                                        return (
                                            <View key={adj.id} style={s.ledgerRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.atelierBlack }}>
                                                        {adj.material_name_snapshot || 'Material'} ·{' '}
                                                        {STOCK_ADJUSTMENT_TYPE_LABELS[adj.adjustment_type]}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                                        Stock: {adj.previous_stock ?? '—'} → {adj.new_stock ?? '—'}{' '}
                                                        {adj.unit_snapshot || ''}
                                                        {adj.reference_code ? ` · Ref: ${adj.reference_code}` : ''}
                                                    </Text>
                                                    {adj.notes ? (
                                                        <Text style={{ fontSize: 11, color: '#4A3E31', marginTop: 2 }}>
                                                            {adj.notes}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text
                                                        style={{
                                                            fontSize: 14,
                                                            fontWeight: '700',
                                                            color: isPositive ? colors.success : colors.error,
                                                        }}
                                                    >
                                                        {isPositive ? `+${adj.quantity_delta}` : adj.quantity_delta}{' '}
                                                        {adj.unit_snapshot || ''}
                                                    </Text>
                                                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                                                        {formatShortDateEs(adj.created_at)}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* ============================================================== */}
                {/* TAB 4: TRM MANUAL DE REFERENCIA                                */}
                {/* ============================================================== */}
                {activeTab === 'trm' && <ManualTrmPanel onRatesChanged={setActiveRates} />}
            </ScrollView>

            {/* Modales operativos */}
            <MaterialFormModal
                visible={materialModalOpen}
                initialMaterial={editingMaterial}
                suppliers={allSuppliersForPickers}
                onClose={() => {
                    setMaterialModalOpen(false);
                    setEditingMaterial(null);
                }}
                onSaved={() => {
                    loadMaterialsData();
                }}
            />

            <SupplierFormModal
                visible={supplierModalOpen}
                initialSupplier={editingSupplier}
                onClose={() => {
                    setSupplierModalOpen(false);
                    setEditingSupplier(null);
                }}
                onSaved={() => {
                    loadSuppliersData();
                }}
            />

            <StockAdjustmentModal
                visible={stockModalOpen}
                material={stockTargetMaterial}
                suppliers={allSuppliersForPickers}
                onClose={() => {
                    setStockModalOpen(false);
                    setStockTargetMaterial(null);
                }}
                onAdjusted={() => {
                    loadMaterialsData();
                    loadStockAndRates();
                }}
            />

            {/* Confirmación explícita antes de archivar material o proveedor */}
            <Modal
                visible={pendingArchiveTarget !== null}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!archivingConfirming) setPendingArchiveTarget(null);
                }}
            >
                <View style={s.confirmBackdrop}>
                    <View style={s.confirmCard}>
                        <Text style={s.confirmTitle}>
                            {pendingArchiveTarget?.kind === 'material'
                                ? '¿Archivar material del catálogo?'
                                : '¿Archivar proveedor del directorio?'}
                        </Text>
                        <Text style={s.confirmBody}>
                            Se archivará &ldquo;{pendingArchiveTarget?.item.name}&rdquo;. Dejará de aparecer en las búsquedas activas, aunque podrás reactivarlo activando el filtro &ldquo;Ver archivados&rdquo; sin perder su trazabilidad histórica.
                        </Text>
                        <View style={s.confirmActions}>
                            <TouchableOpacity
                                style={s.confirmCancelBtn}
                                disabled={archivingConfirming}
                                onPress={() => setPendingArchiveTarget(null)}
                            >
                                <Text style={s.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.confirmPrimaryBtn, archivingConfirming && { opacity: 0.65 }]}
                                disabled={archivingConfirming}
                                onPress={handleConfirmArchive}
                            >
                                <Text style={s.confirmPrimaryText}>
                                    {archivingConfirming ? 'Archivando...' : 'Sí, archivar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const s = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexWrap: 'wrap',
        gap: 10,
    },
    backBtn: {
        paddingVertical: 6,
    },
    backBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    primaryTopBtn: {
        backgroundColor: '#C5A880',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    primaryTopBtnText: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    secondaryTopBtn: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    secondaryTopBtnText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 24,
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: 60,
    },
    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 24,
        marginBottom: 18,
    },
    heroEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1.8,
        marginBottom: 6,
    },
    heroTitle: {
        fontFamily: typography.serif,
        fontSize: 28,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
        maxWidth: 840,
        marginBottom: 18,
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    kpiBox: {
        flex: 1,
        minWidth: 150,
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 10,
        padding: 14,
    },
    kpiBoxMobile: {
        flexBasis: '46%',
        minWidth: 130,
        padding: 10,
    },
    kpiValue: {
        fontFamily: typography.serif,
        fontSize: 22,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    kpiValueMobile: {
        fontSize: 18,
    },
    kpiLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.7,
        marginTop: 4,
    },
    tabsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
    },
    tabBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
    },
    tabBtnMobile: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    tabBtnActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    tabBtnText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tabBtnTextActive: {
        color: '#FAF7F2',
        fontWeight: '700',
    },
    filterCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 16,
        marginBottom: 16,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    searchInput: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: colors.atelierBlack,
    },
    togglePill: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    togglePillActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    togglePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4A3E31',
    },
    togglePillTextActive: {
        color: '#FAF7F2',
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 6,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    chipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    chipTextActive: {
        color: '#FAF7F2',
    },
    chipSub: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    chipSubActive: {
        backgroundColor: '#FFF8E7',
        borderColor: colors.champagneGold,
    },
    chipSubText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    chipSubTextActive: {
        color: colors.bronze,
        fontWeight: '700',
    },
    cardsGrid: {
        gap: 16,
    },
    itemCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 16,
        justifyContent: 'space-between',
    },
    thumbBox: {
        width: 72,
        height: 72,
        borderRadius: 10,
        backgroundColor: '#EFECE6',
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbPlaceholderText: {
        fontSize: 20,
        color: colors.champagneGold,
    },
    badgeGold: {
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeGoldText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.bronze,
        textTransform: 'uppercase',
    },
    badgeNeutral: {
        backgroundColor: '#F5F3EF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeNeutralText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4A3E31',
    },
    badgeSuccess: {
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeSuccessText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.success,
    },
    badgeMuted: {
        backgroundColor: '#EFEFEF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeMutedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666666',
    },
    itemTitle: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 2,
    },
    itemMeta: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    itemSpecStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FAF8F5',
        borderRadius: 8,
        padding: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#F0ECE4',
    },
    specLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    specValue: {
        fontFamily: typography.serif,
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    specSubValue: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    itemSubNote: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 8,
    },
    tagPill: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
    },
    tagPillText: {
        fontSize: 10,
        color: '#4A3E31',
    },
    cardActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 14,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5F3EF',
    },
    cardActionBtn: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 6,
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    cardActionGold: {
        backgroundColor: '#F5EFE6',
        borderColor: '#C5A880',
    },
    cardActionBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#4A3E31',
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 20,
    },
    sectionCardTitle: {
        fontFamily: typography.serif,
        fontSize: 17,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
    },
    sectionCardSub: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    quickStockPill: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 180,
    },
    quickStockTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    quickStockSub: {
        fontSize: 11,
        color: colors.bronze,
        marginTop: 3,
        fontWeight: '600',
    },
    ledgerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
        gap: 10,
    },
    emptyBox: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.sand,
        borderStyle: 'dashed',
        padding: 28,
        alignItems: 'center',
    },
    emptyTitle: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 460,
        marginBottom: 14,
        lineHeight: 18,
    },
    errorBox: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 8,
        padding: 12,
        marginBottom: 14,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
    },
    confirmBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.56)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmCard: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 22,
    },
    confirmTitle: {
        fontFamily: typography.serif,
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 8,
    },
    confirmBody: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
        marginBottom: 18,
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    confirmCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FAF8F5',
    },
    confirmCancelText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#4A3E31',
    },
    confirmPrimaryBtn: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8,
        backgroundColor: colors.atelierBlack,
    },
    confirmPrimaryText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#FAF7F2',
    },
});
