// ==============================================================================
// ATELIER DIGITAL — MÓDULO 05: MODAL DE CREACIÓN / EDICIÓN DE MATERIALES
// Archivo: src/components/commercial/MaterialFormModal.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    AtelierSupplier,
    CANONICAL_MATERIAL_UNITS,
    CreateMaterialDTO,
    MaterialCategory,
    MaterialDrapeProfile,
    MaterialItem,
    MaterialUnit,
} from '../../types/commercial';
import {
    cleanupUnusedCommercialAsset,
    createCommercialAssetSignedUrl,
    createMaterial,
    pickAndUploadCommercialAssetImage,
    removeCommercialAsset,
    updateMaterial,
} from '../../services/commercialService';
import { colors } from '../../theme/colors';
import { commercialStyles as styles } from './commercialStyles';
import {
    MATERIAL_CATEGORY_OPTIONS,
    MATERIAL_DRAPE_OPTIONS,
    MATERIAL_UNIT_LABELS,
    isValidHexColor,
} from './materialLabels';

export interface MaterialFormModalProps {
    visible: boolean;
    initialMaterial?: MaterialItem | null;
    suppliers: AtelierSupplier[];
    onClose: () => void;
    onSaved: (material: MaterialItem) => void;
}

export const MaterialFormModal: React.FC<MaterialFormModalProps> = (props) => {
    if (!props.visible) return null;
    return (
        <Modal
            visible={props.visible}
            transparent
            animationType="fade"
            onRequestClose={props.onClose}
        >
            <MaterialFormModalInner
                key={props.initialMaterial?.id || 'new-material'}
                {...props}
            />
        </Modal>
    );
};

const MaterialFormModalInner: React.FC<MaterialFormModalProps> = ({
    initialMaterial,
    suppliers,
    onClose,
    onSaved,
}) => {
    const { width } = useWindowDimensions();
    const isCompact = width < 640;
    const isEditing = Boolean(initialMaterial?.id);

    const [name, setName] = useState(initialMaterial?.name || '');
    const [skuCode, setSkuCode] = useState(initialMaterial?.sku_code || '');
    const [category, setCategory] = useState<MaterialCategory>(
        initialMaterial?.category || 'fabric'
    );
    const [unit, setUnit] = useState<MaterialUnit>(initialMaterial?.unit || 'm');
    const [unitPriceCop, setUnitPriceCop] = useState(
        initialMaterial?.unit_price !== undefined && initialMaterial?.unit_price !== null
            ? String(initialMaterial.unit_price)
            : ''
    );
    const [unitPriceUsd, setUnitPriceUsd] = useState(
        initialMaterial?.unit_price_usd !== undefined && initialMaterial?.unit_price_usd !== null
            ? String(initialMaterial.unit_price_usd)
            : ''
    );
    const [minPurchaseUnit, setMinPurchaseUnit] = useState(
        String(initialMaterial?.min_purchase_unit ?? 1.0)
    );
    const [initialStock, setInitialStock] = useState(
        String(initialMaterial?.current_stock ?? 0)
    );
    const [supplierId, setSupplierId] = useState<string | null>(
        initialMaterial?.supplier_id || null
    );
    const [supplierName, setSupplierName] = useState(initialMaterial?.supplier_name || '');
    const [supplierRef, setSupplierRef] = useState(initialMaterial?.supplier_ref || '');
    const [composition, setComposition] = useState(initialMaterial?.composition || '');
    const [widthCm, setWidthCm] = useState(
        initialMaterial?.width_cm !== null && initialMaterial?.width_cm !== undefined
            ? String(initialMaterial.width_cm)
            : ''
    );
    const [weightGsm, setWeightGsm] = useState(
        initialMaterial?.weight_gsm !== null && initialMaterial?.weight_gsm !== undefined
            ? String(initialMaterial.weight_gsm)
            : ''
    );
    const [drapeProfile, setDrapeProfile] = useState<MaterialDrapeProfile | null>(
        initialMaterial?.drape_profile || null
    );
    const [colorName, setColorName] = useState(initialMaterial?.color_name || '');
    const [colorCode, setColorCode] = useState(initialMaterial?.color_code || '');
    const [careInstructions, setCareInstructions] = useState(
        initialMaterial?.care_instructions || ''
    );
    const [tagsInput, setTagsInput] = useState((initialMaterial?.tags || []).join(', '));
    const [notes, setNotes] = useState(initialMaterial?.notes || '');
    const [storagePath, setStoragePath] = useState<string | null>(
        initialMaterial?.storage_path || null
    );
    const [legacyPhotoUrl, setLegacyPhotoUrl] = useState<string | null>(
        initialMaterial?.photo_url || null
    );
    const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
    const [tempUploadedPath, setTempUploadedPath] = useState<string | null>(null);

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        const pathToSign = initialMaterial?.storage_path;
        if (!pathToSign) return;
        let active = true;
        createCommercialAssetSignedUrl(pathToSign).then((res) => {
            if (active && res.data) {
                setPreviewSignedUrl(res.data);
            }
        });
        return () => {
            active = false;
        };
    }, [initialMaterial?.storage_path]);

    const handleSelectSupplier = (selected: AtelierSupplier | null) => {
        if (!selected) {
            setSupplierId(null);
            return;
        }
        const prevSelected = suppliers.find((s) => s.id === supplierId);
        setSupplierId(selected.id);
        if (!supplierName.trim() || (prevSelected && supplierName.trim() === prevSelected.name)) {
            setSupplierName(selected.name);
        }
    };

    const handlePickPhoto = async () => {
        setFormError(null);
        setUploadingPhoto(true);
        const res = await pickAndUploadCommercialAssetImage({
            scope: 'materials',
            entityId: initialMaterial?.id || null,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        setUploadingPhoto(false);

        if (res.cancelled) return;
        if (res.error || !res.data) {
            setFormError(res.error || 'No fue posible subir la muestra fotográfica.');
            return;
        }

        if (tempUploadedPath && tempUploadedPath !== res.data.storagePath) {
            await removeCommercialAsset(tempUploadedPath);
        }

        setStoragePath(res.data.storagePath);
        setPreviewSignedUrl(res.data.signedUrl);
        setTempUploadedPath(res.data.storagePath);
    };

    const handleClearPhoto = async () => {
        if (tempUploadedPath && tempUploadedPath === storagePath) {
            await removeCommercialAsset(tempUploadedPath);
            setTempUploadedPath(null);
        }
        setStoragePath(null);
        setLegacyPhotoUrl(null);
        setPreviewSignedUrl(null);
    };

    const handleCancel = async () => {
        if (tempUploadedPath && tempUploadedPath !== initialMaterial?.storage_path) {
            await removeCommercialAsset(tempUploadedPath);
        }
        onClose();
    };

    const handleSave = async () => {
        setFormError(null);
        if (!name.trim()) {
            setFormError('El nombre del material o tela es obligatorio.');
            return;
        }
        if (!unitPriceCop.trim() && !unitPriceUsd.trim()) {
            setFormError('Ingrese al menos un precio unitario en COP o en USD.');
            return;
        }

        const parsedCop = unitPriceCop.trim() ? Number(unitPriceCop.replace(/,/g, '.')) : 0;
        const parsedUsd = unitPriceUsd.trim() ? Number(unitPriceUsd.replace(/,/g, '.')) : 0;
        const parsedMin = minPurchaseUnit.trim() ? Number(minPurchaseUnit.replace(/,/g, '.')) : 1.0;
        const parsedStock = initialStock.trim() ? Number(initialStock.replace(/,/g, '.')) : 0;
        const parsedWidth = widthCm.trim() ? Number(widthCm.replace(/,/g, '.')) : null;
        const parsedGsm = weightGsm.trim() ? Number(weightGsm.replace(/,/g, '.')) : null;

        if (!Number.isFinite(parsedCop) || parsedCop < 0) {
            setFormError('El precio unitario en COP debe ser mayor o igual a 0.');
            return;
        }
        if (!Number.isFinite(parsedUsd) || parsedUsd < 0) {
            setFormError('El precio unitario en USD debe ser mayor o igual a 0.');
            return;
        }
        if (!Number.isFinite(parsedMin) || parsedMin < 0) {
            setFormError('La compra mínima debe ser mayor o igual a 0.');
            return;
        }
        if (!isEditing && (!Number.isFinite(parsedStock) || parsedStock < 0)) {
            setFormError('El stock inicial debe ser mayor o igual a 0.');
            return;
        }
        if (parsedWidth !== null && (!Number.isFinite(parsedWidth) || parsedWidth < 0)) {
            setFormError('El ancho (cm) debe ser un valor numérico válido >= 0.');
            return;
        }
        if (parsedGsm !== null && (!Number.isFinite(parsedGsm) || parsedGsm < 0)) {
            setFormError('El gramaje (gr/m²) debe ser un valor numérico válido >= 0.');
            return;
        }

        const parsedTags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const basePayload: CreateMaterialDTO = {
            name: name.trim(),
            sku_code: skuCode.trim() || null,
            category,
            unit,
            unit_price: parsedCop,
            unit_price_usd: parsedUsd,
            min_purchase_unit: parsedMin,
            supplier_id: supplierId,
            supplier_name: supplierName.trim() || null,
            supplier_ref: supplierRef.trim() || null,
            composition: composition.trim() || null,
            width_cm: parsedWidth,
            weight_gsm: parsedGsm,
            drape_profile: drapeProfile,
            color_name: colorName.trim() || null,
            color_code: colorCode.trim() || null,
            care_instructions: careInstructions.trim() || null,
            storage_path: storagePath,
            photo_url: legacyPhotoUrl,
            tags: parsedTags,
            notes: notes.trim() || null,
        };

        if (!isEditing) {
            basePayload.current_stock = parsedStock;
        }

        const initialSavedPath = initialMaterial?.storage_path || null;
        setSaving(true);
        const res =
            isEditing && initialMaterial
                ? await updateMaterial(initialMaterial.id, basePayload)
                : await createMaterial(basePayload);
        setSaving(false);

        if (res.error || !res.data) {
            setFormError(res.error || 'No fue posible guardar el material.');
            return;
        }

        const nextSavedPath = res.data.storage_path || null;
        if (isEditing && initialSavedPath && initialSavedPath !== nextSavedPath) {
            await cleanupUnusedCommercialAsset(initialSavedPath, { materialId: res.data.id });
        }

        setTempUploadedPath(null);
        onSaved(res.data);
        onClose();
    };

    const resolvedPhotoUri = previewSignedUrl || legacyPhotoUrl;
    const activeSuppliers = suppliers.filter((s) => s.is_active || s.id === supplierId);

    return (
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { maxWidth: 760 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={styles.modalTitle}>
                                {isEditing ? 'Editar Material / Insumo' : 'Registrar Material / Insumo'}
                            </Text>
                            <Text style={styles.sectionCardSubtitle}>
                                Catálogo maestro · 8 categorías · 7 unidades · Precios independientes COP/USD
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleCancel} style={styles.modalCloseBtn} activeOpacity={0.7}>
                            <Text style={styles.modalCloseBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
                        {formError ? (
                            <View
                                style={{
                                    backgroundColor: colors.errorBg,
                                    borderWidth: 1,
                                    borderColor: colors.errorBorder,
                                    padding: 10,
                                    borderRadius: 8,
                                    marginBottom: 14,
                                }}
                            >
                                <Text style={{ color: colors.error, fontSize: 12 }}>{formError}</Text>
                            </View>
                        ) : null}

                        {/* Fotografía privada en commercial-assets */}
                        <View
                            style={{
                                flexDirection: isCompact ? 'column' : 'row',
                                alignItems: isCompact ? 'flex-start' : 'center',
                                gap: 14,
                                backgroundColor: '#FAF8F5',
                                borderWidth: 1,
                                borderColor: colors.sand,
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 16,
                            }}
                        >
                            <View
                                style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 10,
                                    backgroundColor: isValidHexColor(colorCode) ? colorCode.trim() : '#EFECE6',
                                    borderWidth: 1,
                                    borderColor: colors.sand,
                                    overflow: 'hidden',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {resolvedPhotoUri ? (
                                    <Image
                                        source={{ uri: resolvedPhotoUri }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'center', padding: 4 }}>
                                        Sin foto
                                    </Text>
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[styles.formLabel, { marginBottom: 2 }]}>
                                    Muestra Fotográfica (Bucket privado commercial-assets)
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                                    {storagePath
                                        ? `Ruta privada: ${storagePath}`
                                        : 'JPG, PNG o WEBP (máx. 10 MB) accesible mediante URL firmada temporal.'}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        style={styles.secondaryOutlineBtn}
                                        onPress={handlePickPhoto}
                                        disabled={uploadingPhoto || saving}
                                    >
                                        {uploadingPhoto ? (
                                            <ActivityIndicator size="small" color={colors.atelierBlack} />
                                        ) : (
                                            <Text style={styles.secondaryOutlineBtnText}>
                                                {storagePath ? 'Cambiar Fotografía' : '+ Subir Muestra Textil'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                    {(storagePath || legacyPhotoUrl) ? (
                                        <TouchableOpacity
                                            style={[styles.secondaryOutlineBtn, { borderColor: colors.errorBorder }]}
                                            onPress={handleClearPhoto}
                                            disabled={uploadingPhoto || saving}
                                        >
                                            <Text style={[styles.secondaryOutlineBtnText, { color: colors.error }]}>
                                                Quitar Foto
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        </View>

                        {/* Identificación */}
                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, { flex: 2 }]}>
                                <Text style={styles.formLabel}>Nombre del Material / Tela *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Mikado de Seda Italiana"
                                    placeholderTextColor={colors.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>Código SKU único</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: TELA-MKD-001"
                                    placeholderTextColor={colors.textMuted}
                                    value={skuCode}
                                    onChangeText={setSkuCode}
                                />
                            </View>
                        </View>

                        {/* Categoría (8) */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Categoría Canónica *</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {MATERIAL_CATEGORY_OPTIONS.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.chipBtn, category === cat.id && styles.chipBtnActive]}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipBtnText,
                                                category === cat.id && styles.chipBtnTextActive,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Unidad (7) */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Unidad de Medida *</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {CANONICAL_MATERIAL_UNITS.map((u) => (
                                    <TouchableOpacity
                                        key={u}
                                        style={[styles.chipBtn, unit === u && styles.chipBtnActive]}
                                        onPress={() => setUnit(u)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipBtnText,
                                                unit === u && styles.chipBtnTextActive,
                                            ]}
                                        >
                                            {MATERIAL_UNIT_LABELS[u]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Precios, mínimo y stock */}
                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Precio Unitario (COP)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: 185000"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={unitPriceCop}
                                    onChangeText={setUnitPriceCop}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Precio Unitario (USD)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: 45.00"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={unitPriceUsd}
                                    onChangeText={setUnitPriceUsd}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Mínimo Compra</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="1.0"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={minPurchaseUnit}
                                    onChangeText={setMinPurchaseUnit}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>
                                    {isEditing ? 'Stock Actual (solo bitácora)' : 'Stock Inicial'}
                                </Text>
                                <TextInput
                                    style={[styles.formInput, isEditing && styles.formInputDisabled]}
                                    editable={!isEditing}
                                    keyboardType="numeric"
                                    value={initialStock}
                                    onChangeText={setInitialStock}
                                />
                            </View>
                        </View>

                        {/* Proveedor vinculado */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Proveedor Vinculado (Directorio M05)</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                            >
                                <TouchableOpacity
                                    style={[styles.chipBtn, !supplierId && styles.chipBtnActive]}
                                    onPress={() => handleSelectSupplier(null)}
                                >
                                    <Text style={[styles.chipBtnText, !supplierId && styles.chipBtnTextActive]}>
                                        Sin vínculo directo
                                    </Text>
                                </TouchableOpacity>
                                {activeSuppliers.map((sup) => (
                                    <TouchableOpacity
                                        key={sup.id}
                                        style={[styles.chipBtn, supplierId === sup.id && styles.chipBtnActive]}
                                        onPress={() => handleSelectSupplier(sup)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipBtnText,
                                                supplierId === sup.id && styles.chipBtnTextActive,
                                            ]}
                                        >
                                            {sup.is_preferred ? '★ ' : ''}
                                            {sup.name} ({sup.default_currency})
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Casa Textil (Texto compatibilidad M03)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Taroni Seta Como"
                                    placeholderTextColor={colors.textMuted}
                                    value={supplierName}
                                    onChangeText={setSupplierName}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Referencia de Proveedor</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: ART-4082-IVORY"
                                    placeholderTextColor={colors.textMuted}
                                    value={supplierRef}
                                    onChangeText={setSupplierRef}
                                />
                            </View>
                        </View>

                        {/* Propiedades textiles */}
                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, { flex: 2 }]}>
                                <Text style={styles.formLabel}>Composición</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: 100% Seda Natural"
                                    placeholderTextColor={colors.textMuted}
                                    value={composition}
                                    onChangeText={setComposition}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>Ancho (cm)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="145"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={widthCm}
                                    onChangeText={setWidthCm}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>Gramaje (gr/m²)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="220"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={weightGsm}
                                    onChangeText={setWeightGsm}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Perfil de Caída Textil</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                <TouchableOpacity
                                    style={[styles.chipBtn, !drapeProfile && styles.chipBtnActive]}
                                    onPress={() => setDrapeProfile(null)}
                                >
                                    <Text style={[styles.chipBtnText, !drapeProfile && styles.chipBtnTextActive]}>
                                        Sin definir
                                    </Text>
                                </TouchableOpacity>
                                {MATERIAL_DRAPE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.chipBtn, drapeProfile === opt.id && styles.chipBtnActive]}
                                        onPress={() => setDrapeProfile(opt.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipBtnText,
                                                drapeProfile === opt.id && styles.chipBtnTextActive,
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, { flex: 1.5 }]}>
                                <Text style={styles.formLabel}>Color / Tono Comercial</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Marfil Atelier"
                                    placeholderTextColor={colors.textMuted}
                                    value={colorName}
                                    onChangeText={setColorName}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>Hexadecimal (#RRGGBB)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="#F5EFE6"
                                    placeholderTextColor={colors.textMuted}
                                    value={colorCode}
                                    onChangeText={setColorCode}
                                />
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Etiquetas (separadas por coma)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="novia, sastrería, noche"
                                    placeholderTextColor={colors.textMuted}
                                    value={tagsInput}
                                    onChangeText={setTagsInput}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Cuidados de Limpieza</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Lavado en seco · Vapor suave"
                                    placeholderTextColor={colors.textMuted}
                                    value={careInstructions}
                                    onChangeText={setCareInstructions}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Notas Técnicas de Atelier</Text>
                            <TextInput
                                style={[styles.formInput, { minHeight: 64, textAlignVertical: 'top' }]}
                                multiline
                                placeholder="Observaciones de corte al sesgo, sentido de pelo o encogimiento..."
                                placeholderTextColor={colors.textMuted}
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </ScrollView>

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 10,
                            marginTop: 14,
                            paddingTop: 12,
                            borderTopWidth: 1,
                            borderTopColor: '#F5F3EF',
                        }}
                    >
                        <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={handleCancel} disabled={saving}>
                            <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.primaryGoldBtn}
                            onPress={handleSave}
                            disabled={saving || uploadingPhoto}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.atelierBlack} />
                            ) : (
                                <Text style={styles.primaryGoldBtnText}>
                                    {isEditing ? 'Guardar Cambios' : 'Registrar Material'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
    );
};
