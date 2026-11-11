// ==============================================================================
// ATELIER DIGITAL — MÓDULO 05: MODAL DE CREACIÓN / EDICIÓN DE PROVEEDORES
// Archivo: src/components/commercial/SupplierFormModal.tsx
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
    CreateSupplierDTO,
    SUPPLIER_CURRENCIES,
    SupplierCurrency,
    SupplierType,
} from '../../types/commercial';
import {
    cleanupUnusedCommercialAsset,
    createCommercialAssetSignedUrl,
    createSupplier,
    pickAndUploadCommercialAssetImage,
    removeCommercialAsset,
    updateSupplier,
} from '../../services/commercialService';
import { colors } from '../../theme/colors';
import { commercialStyles as styles } from './commercialStyles';
import { SUPPLIER_TYPE_OPTIONS } from './materialLabels';

export interface SupplierFormModalProps {
    visible: boolean;
    initialSupplier?: AtelierSupplier | null;
    onClose: () => void;
    onSaved: (supplier: AtelierSupplier) => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = (props) => {
    if (!props.visible) return null;
    return (
        <Modal
            visible={props.visible}
            transparent
            animationType="fade"
            onRequestClose={props.onClose}
        >
            <SupplierFormModalInner
                key={props.initialSupplier?.id || 'new-supplier'}
                {...props}
            />
        </Modal>
    );
};

const SupplierFormModalInner: React.FC<SupplierFormModalProps> = ({
    initialSupplier,
    onClose,
    onSaved,
}) => {
    const { width } = useWindowDimensions();
    const isCompact = width < 640;
    const isEditing = Boolean(initialSupplier?.id);

    const [code, setCode] = useState(initialSupplier?.code || '');
    const [name, setName] = useState(initialSupplier?.name || '');
    const [tradeName, setTradeName] = useState(initialSupplier?.trade_name || '');
    const [supplierType, setSupplierType] = useState<SupplierType>(
        initialSupplier?.supplier_type || 'fabric_house'
    );
    const [defaultCurrency, setDefaultCurrency] = useState<SupplierCurrency>(
        initialSupplier?.default_currency || 'COP'
    );
    const [isPreferred, setIsPreferred] = useState(Boolean(initialSupplier?.is_preferred));
    const [contactName, setContactName] = useState(initialSupplier?.contact_name || '');
    const [email, setEmail] = useState(initialSupplier?.email || '');
    const [phone, setPhone] = useState(initialSupplier?.phone || '');
    const [whatsapp, setWhatsapp] = useState(initialSupplier?.whatsapp || '');
    const [website, setWebsite] = useState(initialSupplier?.website || '');
    const [city, setCity] = useState(initialSupplier?.city || '');
    const [country, setCountry] = useState(initialSupplier?.country || 'Colombia');
    const [address, setAddress] = useState(initialSupplier?.address || '');
    const [leadTimeDays, setLeadTimeDays] = useState(
        initialSupplier?.lead_time_days !== null &&
            initialSupplier?.lead_time_days !== undefined
            ? String(initialSupplier.lead_time_days)
            : ''
    );
    const [minOrderPolicy, setMinOrderPolicy] = useState(
        initialSupplier?.min_order_policy || ''
    );
    const [paymentTerms, setPaymentTerms] = useState(initialSupplier?.payment_terms || '');
    const [taxId, setTaxId] = useState(initialSupplier?.tax_id || '');
    const [tagsInput, setTagsInput] = useState(
        (initialSupplier?.specialty_tags || []).join(', ')
    );
    const [notes, setNotes] = useState(initialSupplier?.notes || '');
    const [storagePath, setStoragePath] = useState<string | null>(
        initialSupplier?.storage_path || null
    );
    const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
    const [tempUploadedPath, setTempUploadedPath] = useState<string | null>(null);

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        const pathToSign = initialSupplier?.storage_path;
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
    }, [initialSupplier?.storage_path]);

    const handlePickLogo = async () => {
        setFormError(null);
        setUploadingPhoto(true);
        const res = await pickAndUploadCommercialAssetImage({
            scope: 'suppliers',
            entityId: initialSupplier?.id || null,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        setUploadingPhoto(false);

        if (res.cancelled) return;
        if (res.error || !res.data) {
            setFormError(res.error || 'No fue posible subir el logotipo o tarjeta.');
            return;
        }

        if (tempUploadedPath && tempUploadedPath !== res.data.storagePath) {
            await removeCommercialAsset(tempUploadedPath);
        }

        setStoragePath(res.data.storagePath);
        setPreviewSignedUrl(res.data.signedUrl);
        setTempUploadedPath(res.data.storagePath);
    };

    const handleClearLogo = async () => {
        if (tempUploadedPath && tempUploadedPath === storagePath) {
            await removeCommercialAsset(tempUploadedPath);
            setTempUploadedPath(null);
        }
        setStoragePath(null);
        setPreviewSignedUrl(null);
    };

    const handleCancel = async () => {
        if (tempUploadedPath && tempUploadedPath !== initialSupplier?.storage_path) {
            await removeCommercialAsset(tempUploadedPath);
        }
        onClose();
    };

    const handleSave = async () => {
        setFormError(null);
        if (!name.trim()) {
            setFormError('El nombre del proveedor es obligatorio.');
            return;
        }

        const parsedLead = leadTimeDays.trim() ? Number(leadTimeDays.trim()) : null;
        if (parsedLead !== null && (!Number.isFinite(parsedLead) || parsedLead < 0)) {
            setFormError('El tiempo de entrega en días debe ser un número mayor o igual a 0.');
            return;
        }

        const specialtyTags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const dto: CreateSupplierDTO = {
            code: code.trim() || null,
            name: name.trim(),
            trade_name: tradeName.trim() || null,
            supplier_type: supplierType,
            default_currency: defaultCurrency,
            is_preferred: isPreferred,
            contact_name: contactName.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            website: website.trim() || null,
            city: city.trim() || null,
            country: country.trim() || 'Colombia',
            address: address.trim() || null,
            lead_time_days: parsedLead !== null ? Math.round(parsedLead) : null,
            min_order_policy: minOrderPolicy.trim() || null,
            payment_terms: paymentTerms.trim() || null,
            tax_id: taxId.trim() || null,
            specialty_tags: specialtyTags,
            storage_path: storagePath,
            notes: notes.trim() || null,
        };

        const initialSavedPath = initialSupplier?.storage_path || null;
        setSaving(true);
        const res =
            isEditing && initialSupplier
                ? await updateSupplier(initialSupplier.id, dto)
                : await createSupplier(dto);
        setSaving(false);

        if (res.error || !res.data) {
            setFormError(res.error || 'No fue posible guardar el proveedor.');
            return;
        }

        const nextSavedPath = res.data.storage_path || null;
        if (isEditing && initialSavedPath && initialSavedPath !== nextSavedPath) {
            await cleanupUnusedCommercialAsset(initialSavedPath, { supplierId: res.data.id });
        }

        setTempUploadedPath(null);
        onSaved(res.data);
        onClose();
    };

    return (
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { maxWidth: 760 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={styles.modalTitle}>
                                {isEditing ? 'Editar Proveedor' : 'Registrar Casa Textil / Proveedor'}
                            </Text>
                            <Text style={styles.sectionCardSubtitle}>
                                Directorio privado M05 · Contacto, moneda habitual y condiciones comerciales
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

                        {/* Tarjeta de identidad visual / logotipo en Storage privado */}
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
                                    width: 68,
                                    height: 68,
                                    borderRadius: 10,
                                    backgroundColor: '#171411',
                                    borderWidth: 1,
                                    borderColor: colors.champagneGold,
                                    overflow: 'hidden',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {previewSignedUrl ? (
                                    <Image
                                        source={{ uri: previewSignedUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={{ fontFamily: 'serif', fontSize: 22, color: '#C5A880' }}>
                                        {name.trim() ? name.trim().charAt(0).toUpperCase() : '✦'}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.formLabel, { marginBottom: 2 }]}>
                                    Logotipo / Tarjeta del Proveedor (commercial-assets)
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                                    {storagePath
                                        ? `Ruta privada: ${storagePath}`
                                        : 'Opcional · Almacenado de forma privada bajo URL firmada.'}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    <TouchableOpacity
                                        style={styles.secondaryOutlineBtn}
                                        onPress={handlePickLogo}
                                        disabled={uploadingPhoto || saving}
                                    >
                                        {uploadingPhoto ? (
                                            <ActivityIndicator size="small" color={colors.atelierBlack} />
                                        ) : (
                                            <Text style={styles.secondaryOutlineBtnText}>
                                                {storagePath ? 'Cambiar Imagen' : '+ Subir Imagen'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                    {storagePath ? (
                                        <TouchableOpacity
                                            style={[styles.secondaryOutlineBtn, { borderColor: colors.errorBorder }]}
                                            onPress={handleClearLogo}
                                            disabled={uploadingPhoto || saving}
                                        >
                                            <Text style={[styles.secondaryOutlineBtnText, { color: colors.error }]}>
                                                Quitar
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, { flex: 2 }]}>
                                <Text style={styles.formLabel}>Nombre del Proveedor *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Taroni Seta Como"
                                    placeholderTextColor={colors.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.formLabel}>Código Interno</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: PROV-COMO-01"
                                    placeholderTextColor={colors.textMuted}
                                    value={code}
                                    onChangeText={setCode}
                                />
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Razón Social / Nombre Comercial</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Opcional"
                                    placeholderTextColor={colors.textMuted}
                                    value={tradeName}
                                    onChangeText={setTradeName}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>NIT / Tax ID</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Opcional"
                                    placeholderTextColor={colors.textMuted}
                                    value={taxId}
                                    onChangeText={setTaxId}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Especialidad del Proveedor</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {SUPPLIER_TYPE_OPTIONS.map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[styles.chipBtn, supplierType === t.id && styles.chipBtnActive]}
                                        onPress={() => setSupplierType(t.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipBtnText,
                                                supplierType === t.id && styles.chipBtnTextActive,
                                            ]}
                                        >
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Moneda Predeterminada</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {SUPPLIER_CURRENCIES.map((curr) => (
                                        <TouchableOpacity
                                            key={curr}
                                            style={[styles.chipBtn, defaultCurrency === curr && styles.chipBtnActive]}
                                            onPress={() => setDefaultCurrency(curr)}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipBtnText,
                                                    defaultCurrency === curr && styles.chipBtnTextActive,
                                                ]}
                                            >
                                                {curr}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Casa Preferida de Autor</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.chipBtn,
                                        isPreferred && {
                                            backgroundColor: '#FFF8E7',
                                            borderColor: colors.champagneGold,
                                        },
                                    ]}
                                    onPress={() => setIsPreferred(!isPreferred)}
                                >
                                    <Text
                                        style={[
                                            styles.chipBtnText,
                                            isPreferred && { color: colors.bronze, fontWeight: '700' },
                                        ]}
                                    >
                                        {isPreferred ? '★ Proveedor Preferido Activo' : '☆ Marcar como Preferido'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Persona de Contacto</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Nombre asesor"
                                    placeholderTextColor={colors.textMuted}
                                    value={contactName}
                                    onChangeText={setContactName}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Correo Electrónico</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="ventas@casatextil.com"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Teléfono</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="+57 601 ..."
                                    placeholderTextColor={colors.textMuted}
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>WhatsApp Directo</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="+57 3..."
                                    placeholderTextColor={colors.textMuted}
                                    value={whatsapp}
                                    onChangeText={setWhatsapp}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Sitio Web</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="https://..."
                                    placeholderTextColor={colors.textMuted}
                                    autoCapitalize="none"
                                    value={website}
                                    onChangeText={setWebsite}
                                />
                            </View>
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Ciudad</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Bogotá / Como / París"
                                    placeholderTextColor={colors.textMuted}
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>País</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Colombia"
                                    placeholderTextColor={colors.textMuted}
                                    value={country}
                                    onChangeText={setCountry}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Lead Time (días)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="15"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={leadTimeDays}
                                    onChangeText={setLeadTimeDays}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Dirección Física</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Dirección de showroom o bodega"
                                placeholderTextColor={colors.textMuted}
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>

                        <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Política de Compra Mínima</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Corte mínimo 3 metros por referencia"
                                    placeholderTextColor={colors.textMuted}
                                    value={minOrderPolicy}
                                    onChangeText={setMinOrderPolicy}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Términos de Pago</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: 50% orden / 50% despacho"
                                    placeholderTextColor={colors.textMuted}
                                    value={paymentTerms}
                                    onChangeText={setPaymentTerms}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Especialidades (separadas por coma)</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="seda natural, organza, encajes franceses"
                                placeholderTextColor={colors.textMuted}
                                value={tagsInput}
                                onChangeText={setTagsInput}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Notas Privadas</Text>
                            <TextInput
                                style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                                multiline
                                placeholder="Horarios de despacho, aranceles o acuerdos especiales..."
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
                                    {isEditing ? 'Guardar Cambios' : 'Guardar Proveedor'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
    );
};
