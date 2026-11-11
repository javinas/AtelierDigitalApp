// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: CATÁLOGO MAESTRO DE MATERIALES Y TELAS (M03/M05)
// Archivo: src/components/commercial/MaterialsCatalogModal.tsx
// ==============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AtelierSupplier,
    CommercialCurrency,
    MaterialCategory,
    MaterialItem,
} from '../../types/commercial';
import {
    createCommercialAssetSignedUrls,
    fetchMaterials,
    fetchSuppliers,
} from '../../services/commercialService';
import { colors } from '../../theme/colors';
import { commercialStyles as styles } from './commercialStyles';
import { MaterialFormModal } from './MaterialFormModal';
import {
    MATERIAL_CATEGORY_LABELS,
    MATERIAL_CATEGORY_OPTIONS,
    MATERIAL_DRAPE_LABELS,
    formatMaterialMoney,
    getSwatchContrastTextColor,
    isValidHexColor,
} from './materialLabels';

export interface MaterialsCatalogModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectMaterial?: (material: MaterialItem) => void;
    targetCurrency?: CommercialCurrency;
}

const FILTER_CATEGORIES: { id: MaterialCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos' },
    ...MATERIAL_CATEGORY_OPTIONS,
];

export const MaterialsCatalogModal: React.FC<MaterialsCatalogModalProps> = ({
    visible,
    onClose,
    onSelectMaterial,
    targetCurrency,
}) => {
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [suppliers, setSuppliers] = useState<AtelierSupplier[]>([]);
    const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [usdWarningNotice, setUsdWarningNotice] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

    const applyCatalogResults = useCallback(
        async (
            matRes: Awaited<ReturnType<typeof fetchMaterials>>,
            supRes: Awaited<ReturnType<typeof fetchSuppliers>>,
            isStillActive?: () => boolean
        ) => {
            if (isStillActive && !isStillActive()) return;
            setMaterials(matRes.data);
            setSuppliers(supRes.data);
            setLoadError(matRes.error);
            setLoading(false);

            const storagePaths = matRes.data
                .map((m) => m.storage_path)
                .filter((p): p is string => Boolean(p && p.trim().length > 0));
            if (storagePaths.length > 0) {
                const { data: urls } = await createCommercialAssetSignedUrls(storagePaths, 3600);
                if ((!isStillActive || isStillActive()) && Object.keys(urls).length > 0) {
                    setSignedUrlMap((prev) => ({ ...prev, ...urls }));
                }
            }
        },
        []
    );

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        const [matRes, supRes] = await Promise.all([
            fetchMaterials({
                category: selectedCategory,
                searchQuery,
                onlyActive: true,
            }),
            fetchSuppliers({ onlyActive: true }),
        ]);
        await applyCatalogResults(matRes, supRes);
    }, [selectedCategory, searchQuery, applyCatalogResults]);

    useEffect(() => {
        if (!visible || formModalOpen) return;
        let active = true;
        Promise.all([
            fetchMaterials({
                category: selectedCategory,
                searchQuery,
                onlyActive: true,
            }),
            fetchSuppliers({ onlyActive: true }),
        ]).then(([matRes, supRes]) => applyCatalogResults(matRes, supRes, () => active));
        return () => {
            active = false;
        };
    }, [visible, formModalOpen, selectedCategory, searchQuery, applyCatalogResults]);

    const handleAttemptSelectMaterial = (mat: MaterialItem) => {
        if (!onSelectMaterial) return;
        const hasUsdRate = Boolean(mat.unit_price_usd && mat.unit_price_usd > 0);
        if (targetCurrency === 'USD' && !hasUsdRate) {
            setUsdWarningNotice(
                `"${mat.name}" no tiene tarifa en USD registrada. Usa "Editar" para ingresar su precio unitario USD antes de asignarlo a esta propuesta en USD.`
            );
            return;
        }
        setUsdWarningNotice(null);
        onSelectMaterial(mat);
        onClose();
    };

    const handleFormSaved = (saved: MaterialItem) => {
        setFormModalOpen(false);
        setEditingMaterial(null);
        const hasUsdRate = Boolean(saved.unit_price_usd && saved.unit_price_usd > 0);
        if (!editingMaterial && onSelectMaterial) {
            if (targetCurrency === 'USD' && !hasUsdRate) {
                setUsdWarningNotice(
                    `"${saved.name}" se guardó en el catálogo, pero falta su tarifa USD. Edítala para asignar un precio USD antes de seleccionarla.`
                );
                loadCatalog();
                return;
            }
            setUsdWarningNotice(null);
            onSelectMaterial(saved);
            onClose();
            return;
        }
        setUsdWarningNotice(null);
        loadCatalog();
    };

    return (
        <>
            <Modal
                visible={visible && !formModalOpen}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Cabecera */}
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <Text style={styles.modalTitle}>Catálogo de Telas & Insumos</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    8 categorías · 7 unidades · Proveedores vinculados · Moneda independiente COP / USD
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setUsdWarningNotice(null);
                                    onClose();
                                }}
                                style={styles.modalCloseBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {targetCurrency === 'USD' ? (
                            <View
                                style={{
                                    backgroundColor: '#FFF8E7',
                                    borderWidth: 1,
                                    borderColor: '#E5CFA0',
                                    borderRadius: 8,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 12, color: '#6E5023', fontWeight: '600' }}>
                                    Propuesta en USD · Sin conversión automática. Los materiales sin tarifa USD muestran el aviso correspondiente y requieren tarifa USD antes de asignarse.
                                </Text>
                            </View>
                        ) : null}

                        {usdWarningNotice ? (
                            <View
                                style={{
                                    backgroundColor: '#FAF2F2',
                                    borderWidth: 1,
                                    borderColor: '#E5B4B4',
                                    borderRadius: 8,
                                    paddingHorizontal: 12,
                                    paddingVertical: 9,
                                    marginBottom: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                }}
                            >
                                <Text style={{ color: '#9E3B3B', fontSize: 12, flex: 1 }}>
                                    {usdWarningNotice}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setUsdWarningNotice(null)}
                                    accessibilityLabel="Cerrar aviso de tarifa USD"
                                >
                                    <Text style={{ color: '#9E3B3B', fontWeight: '700', fontSize: 13 }}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {/* Búsqueda y Nuevo */}
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                            <TextInput
                                style={[styles.formInput, { flex: 1, minWidth: 190 }]}
                                placeholder="Buscar por tela, SKU, color, proveedor o referencia..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#8A7E72"
                            />
                            <TouchableOpacity
                                style={styles.primaryGoldBtn}
                                onPress={() => {
                                    setUsdWarningNotice(null);
                                    setEditingMaterial(null);
                                    setFormModalOpen(true);
                                }}
                            >
                                <Text style={styles.primaryGoldBtnText}>+ Nueva Tela / Insumo</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Selector de Categorías (wrap visible en móvil y escritorio) */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {FILTER_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.chipBtn,
                                        selectedCategory === cat.id && styles.chipBtnActive,
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Text
                                        style={[
                                            styles.chipBtnText,
                                            selectedCategory === cat.id && styles.chipBtnTextActive,
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {loadError ? (
                            <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{loadError}</Text>
                            </View>
                        ) : null}

                        {/* Lista de Telas */}
                        {loading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#C5A880" />
                                <Text style={{ marginTop: 10, color: '#8A7E72', fontSize: 13 }}>
                                    Cargando catálogo textil...
                                </Text>
                            </View>
                        ) : materials.length === 0 ? (
                            <View style={styles.emptyStateBox}>
                                <Text style={styles.emptyStateTitle}>Sin materiales registrados</Text>
                                <Text style={styles.emptyStateText}>
                                    No se encontraron telas ni insumos reales con los filtros actuales. Use &laquo;+ Nueva Tela / Insumo&raquo; para registrar el catálogo del atelier.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                                {materials.map((mat) => {
                                    const signedThumb = mat.storage_path ? signedUrlMap[mat.storage_path] : null;
                                    const thumbUri = signedThumb || mat.photo_url || null;
                                    const supplierDisplay = mat.supplier?.name || mat.supplier_name;

                                    return (
                                        <View key={mat.id} style={styles.materialCard}>
                                            <View style={styles.materialCardHeader}>
                                                <View style={{ flexDirection: 'row', gap: 10, flex: 1, alignItems: 'center' }}>
                                                    <View
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 8,
                                                            backgroundColor: isValidHexColor(mat.color_code)
                                                                ? mat.color_code!.trim()
                                                                : '#EFECE6',
                                                            borderWidth: 1,
                                                            borderColor: colors.sand,
                                                            overflow: 'hidden',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        {thumbUri ? (
                                                            <Image
                                                                source={{ uri: thumbUri }}
                                                                style={{ width: '100%', height: '100%' }}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <Text
                                                                style={{
                                                                    fontSize: 14,
                                                                    color: getSwatchContrastTextColor(mat.color_code),
                                                                }}
                                                            >
                                                                ✦
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 2 }}>
                                                            <View style={styles.materialCategoryBadge}>
                                                                <Text style={styles.materialCategoryBadgeText}>
                                                                    {MATERIAL_CATEGORY_LABELS[mat.category]}
                                                                </Text>
                                                            </View>
                                                            {mat.drape_profile ? (
                                                                <View style={[styles.materialCategoryBadge, { backgroundColor: '#FAF8F5' }]}>
                                                                    <Text style={[styles.materialCategoryBadgeText, { color: '#4A3E31' }]}>
                                                                        {MATERIAL_DRAPE_LABELS[mat.drape_profile]}
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                            {targetCurrency === 'USD' && !(mat.unit_price_usd && mat.unit_price_usd > 0) ? (
                                                                <View
                                                                    style={[
                                                                        styles.materialCategoryBadge,
                                                                        {
                                                                            backgroundColor: '#FFF3E0',
                                                                            borderWidth: 1,
                                                                            borderColor: '#E2B478',
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.materialCategoryBadgeText,
                                                                            { color: '#8A4F16' },
                                                                        ]}
                                                                    >
                                                                        Sin tarifa USD
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                        <Text style={styles.materialName}>{mat.name}</Text>
                                                        <Text style={styles.materialMetaText}>
                                                            {mat.sku_code ? `SKU: ${mat.sku_code} · ` : ''}
                                                            {mat.composition || 'Alta costura'} · {mat.color_name || 'Tono sastre'}
                                                            {supplierDisplay ? ` · Casa: ${supplierDisplay}` : ''}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                                    {mat.unit_price > 0 || !(mat.unit_price_usd && mat.unit_price_usd > 0) ? (
                                                        <Text style={styles.materialPriceText}>
                                                            {formatMaterialMoney(mat.unit_price, 'COP')} / {mat.unit}
                                                        </Text>
                                                    ) : null}
                                                    {mat.unit_price_usd && mat.unit_price_usd > 0 ? (
                                                        <Text
                                                            style={
                                                                mat.unit_price > 0
                                                                    ? { fontSize: 11, color: '#8A7E72' }
                                                                    : styles.materialPriceText
                                                            }
                                                        >
                                                            {formatMaterialMoney(mat.unit_price_usd, 'USD')} / {mat.unit}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>

                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: 8,
                                                    marginTop: 6,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, color: '#766B62' }}>
                                                    Mínimo de compra: {mat.min_purchase_unit} {mat.unit} · Stock taller:{' '}
                                                    {mat.current_stock ?? 0} {mat.unit}
                                                </Text>

                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity
                                                        style={[styles.secondaryOutlineBtn, { paddingVertical: 6, paddingHorizontal: 10 }]}
                                                        onPress={() => {
                                                            setEditingMaterial(mat);
                                                            setFormModalOpen(true);
                                                        }}
                                                    >
                                                        <Text style={[styles.secondaryOutlineBtnText, { fontSize: 11 }]}>
                                                            Editar
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {onSelectMaterial ? (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.primaryGoldBtn,
                                                                targetCurrency === 'USD' &&
                                                                !(mat.unit_price_usd && mat.unit_price_usd > 0)
                                                                    ? {
                                                                          backgroundColor: '#EDE6DB',
                                                                          borderWidth: 1,
                                                                          borderColor: '#D6C7B2',
                                                                      }
                                                                    : null,
                                                            ]}
                                                            onPress={() => handleAttemptSelectMaterial(mat)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.primaryGoldBtnText,
                                                                    targetCurrency === 'USD' &&
                                                                    !(mat.unit_price_usd && mat.unit_price_usd > 0)
                                                                        ? { color: '#6E5B46' }
                                                                        : null,
                                                                ]}
                                                            >
                                                                {targetCurrency === 'USD' &&
                                                                !(mat.unit_price_usd && mat.unit_price_usd > 0)
                                                                    ? 'Requiere USD'
                                                                    : '+ Asignar a Prenda'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <MaterialFormModal
                visible={visible && formModalOpen}
                initialMaterial={editingMaterial}
                suppliers={suppliers}
                onClose={() => {
                    setFormModalOpen(false);
                    setEditingMaterial(null);
                }}
                onSaved={handleFormSaved}
            />
        </>
    );
};
