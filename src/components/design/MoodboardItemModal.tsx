// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MODAL DE REGISTRO / EDICIÓN DE ELEMENTO MOODBOARD (M04)
// Archivo: src/components/design/MoodboardItemModal.tsx
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
} from 'react-native';
import { MoodboardItem, MoodboardItemType } from '../../types/design';
import { MaterialItem } from '../../types/commercial';
import {
    addMoodboardItem,
    pickAndUploadDesignImage,
    updateMoodboardItem,
} from '../../services/designService';
import { fetchMaterials } from '../../services/commercialService';
import { CREATION_EDITORIAL_IMAGES } from '../creations/creationsModel';
import { designStyles as styles } from './designStyles';

export interface MoodboardItemModalProps {
    visible: boolean;
    creationId: string;
    moodboardId?: string | null;
    editingItem?: MoodboardItem | null;
    onClose: () => void;
    onItemCreated: (item: MoodboardItem) => void;
    onItemUpdated?: (item: MoodboardItem) => void;
}

const ITEM_TYPE_OPTIONS: { type: MoodboardItemType; icon: string; label: string }[] = [
    { type: 'sketch', icon: '✎', label: 'Boceto / Figurín' },
    { type: 'fabric_swatch', icon: '🧶', label: 'Muestra de Tela' },
    { type: 'silhouette_ref', icon: '👗', label: 'Silueta' },
    { type: 'detail_finish', icon: '✦', label: 'Detalle / Bordado' },
    { type: 'color_inspiration', icon: '🎨', label: 'Luz & Color' },
    { type: 'editorial_note', icon: '📜', label: 'Nota de Autor' },
];

const ATELIER_IMAGE_KEYS: { key: string; label: string }[] = [
    { key: 'dress', label: 'Vestido Gala' },
    { key: 'jacket', label: 'Chaqueta Sastre' },
    { key: 'corset', label: 'Corsé Alta Costura' },
    { key: 'bodice', label: 'Corpiño Base' },
    { key: 'skirt', label: 'Falda Evasé' },
    { key: 'coat', label: 'Abrigo Estructurado' },
    { key: 'blouse', label: 'Blusa Seda' },
    { key: 'sleeve', label: 'Manga Sastre' },
];

export const MoodboardItemModal: React.FC<MoodboardItemModalProps> = ({
    visible,
    creationId,
    moodboardId,
    editingItem,
    onClose,
    onItemCreated,
    onItemUpdated,
}) => {
    const [itemType, setItemType] = useState<MoodboardItemType>('sketch');
    const [title, setTitle] = useState<string>('');
    const [subtitle, setSubtitle] = useState<string>('Referencia de Alta Costura');
    const [description, setDescription] = useState<string>('');
    const [imageKey, setImageKey] = useState<string>('dress');
    const [customImageUrl, setCustomImageUrl] = useState<string>('');
    const [storagePath, setStoragePath] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);
    const [colorHex, setColorHex] = useState<string>('#C5A880');
    const [tagsInput, setTagsInput] = useState<string>('Alta Costura, Boceto, Seda');
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Puente M04 ↔ M03: Catálogo textil atelier_materials
    const [materialsCatalog, setMaterialsCatalog] = useState<MaterialItem[]>([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        if (editingItem) {
            setItemType(editingItem.item_type);
            setTitle(editingItem.title);
            setSubtitle(editingItem.subtitle || 'Referencia de Alta Costura');
            setDescription(editingItem.description || '');
            setImageKey(editingItem.image_key || 'dress');
            setCustomImageUrl(editingItem.image_url || '');
            setStoragePath(editingItem.storage_path || null);
            setUploadedFileName(editingItem.storage_path ? editingItem.storage_path.split('/').pop() || null : null);
            setColorHex(editingItem.color_hex || '#C5A880');
            setTagsInput((editingItem.tags || []).join(', '));
            const matId = editingItem.metadata?.material_id as string | undefined;
            setSelectedMaterialId(matId || null);
        } else {
            setItemType('sketch');
            setTitle('');
            setSubtitle('Referencia de Alta Costura');
            setDescription('');
            setImageKey('dress');
            setCustomImageUrl('');
            setStoragePath(null);
            setUploadedFileName(null);
            setColorHex('#C5A880');
            setTagsInput('Alta Costura, Boceto, Seda');
            setSelectedMaterialId(null);
        }
        setErrorMsg(null);
    }, [visible, editingItem]);

    useEffect(() => {
        if (visible && itemType === 'fabric_swatch' && materialsCatalog.length === 0) {
            fetchMaterials().then(({ data }) => {
                setMaterialsCatalog(data || []);
            });
        }
    }, [visible, itemType, materialsCatalog.length]);

    const handleSelectCatalogMaterial = (mat: MaterialItem) => {
        setSelectedMaterialId(mat.id);
        setTitle(mat.name);
        const subParts = [mat.supplier_name, mat.composition].filter(Boolean);
        setSubtitle(subParts.length > 0 ? subParts.join(' · ') : 'Muestra Textil M03');
        if (mat.color_code) {
            setColorHex(mat.color_code);
        }
        if (mat.notes) {
            setDescription(mat.notes);
        }
        setTagsInput(
            ['Muestra Textil', mat.category, mat.color_name || '', mat.supplier_name || '']
                .filter(Boolean)
                .join(', ')
        );
    };

    const handlePickDeviceImage = async () => {
        setUploadingImage(true);
        setErrorMsg(null);
        const res = await pickAndUploadDesignImage(`creations/${creationId}`);
        setUploadingImage(false);
        if (res.error) {
            setErrorMsg(res.error);
            return;
        }
        if (res.uri) {
            setCustomImageUrl(res.uri);
            setStoragePath(res.storagePath);
            setUploadedFileName(res.fileName);
        }
    };

    const handleSave = async () => {
        setErrorMsg(null);
        if (!title.trim()) {
            setErrorMsg('Ingrese el título del boceto o referencia visual.');
            return;
        }

        const parsedTags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        const linkedMaterial = materialsCatalog.find((m) => m.id === selectedMaterialId);
        const metadata: Record<string, unknown> = {
            ...(editingItem?.metadata || {}),
        };
        if (selectedMaterialId && linkedMaterial) {
            metadata.material_id = linkedMaterial.id;
            metadata.material_name = linkedMaterial.name;
            metadata.supplier_name = linkedMaterial.supplier_name || null;
            metadata.composition = linkedMaterial.composition || null;
        }

        setSaving(true);
        if (editingItem) {
            const { data, error } = await updateMoodboardItem(editingItem.id, {
                item_type: itemType,
                title: title.trim(),
                subtitle: subtitle.trim() || null,
                description: description.trim() || null,
                image_key: imageKey,
                image_url: customImageUrl.trim() || null,
                storage_path: storagePath,
                color_hex: colorHex.trim() || '#C5A880',
                tags: parsedTags,
                metadata,
            });
            setSaving(false);
            if (error) {
                setErrorMsg(error);
            } else if (data) {
                if (onItemUpdated) onItemUpdated(data);
                onClose();
            }
            return;
        }

        const { data, error } = await addMoodboardItem({
            creation_id: creationId,
            moodboard_id: moodboardId || null,
            item_type: itemType,
            title: title.trim(),
            subtitle: subtitle.trim() || null,
            description: description.trim() || null,
            image_key: imageKey,
            image_url: customImageUrl.trim() || null,
            storage_path: storagePath,
            color_hex: colorHex.trim() || '#C5A880',
            tags: parsedTags,
            is_pinned: true,
            metadata,
        });
        setSaving(false);

        if (error) {
            setErrorMsg(error);
        } else if (data) {
            onItemCreated(data);
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { maxWidth: 680 }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.eyebrowGold}>✦ PINBOARD CREATIVO DE TALLER</Text>
                            <Text style={styles.titleSerif}>
                                {editingItem
                                    ? 'Editar Pieza del Moodboard'
                                    : 'Fijar Boceto o Referencia en el Moodboard'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            testID="close-item-modal"
                            style={styles.closeCircleBtn}
                            onPress={onClose}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#171411' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 490 }} showsVerticalScrollIndicator={false}>
                        {errorMsg && (
                            <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{errorMsg}</Text>
                            </View>
                        )}

                        <Text style={styles.formLabel}>1. Categoría Visual de la Tarjeta</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                            {ITEM_TYPE_OPTIONS.map((opt) => {
                                const active = itemType === opt.type;
                                return (
                                    <TouchableOpacity
                                        key={opt.type}
                                        testID={`item-type-${opt.type}`}
                                        style={{
                                            flexBasis: '31%',
                                            flexGrow: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: active ? '#171411' : '#FAF8F5',
                                            borderWidth: 1,
                                            borderColor: active ? '#171411' : '#E6D9C8',
                                            borderRadius: 8,
                                            paddingVertical: 8,
                                            paddingHorizontal: 10,
                                            gap: 6,
                                        }}
                                        onPress={() => setItemType(opt.type)}
                                    >
                                        <Text style={{ fontSize: 14 }}>{opt.icon}</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FAF8F5' : '#171411' }}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* PUENTE M04 ↔ M03: Vinculación opcional con Catálogo Textil atelier_materials */}
                        {itemType === 'fabric_swatch' && materialsCatalog.length > 0 && (
                            <View
                                style={{
                                    backgroundColor: '#FAF8F5',
                                    borderWidth: 1,
                                    borderColor: '#E6D9C8',
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 14,
                                }}
                            >
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#A78350', letterSpacing: 0.8, marginBottom: 4 }}>
                                    ✦ VINCULAR CON CATÁLOGO TEXTIL DEL ATELIER (M03 · OPCIONAL)
                                </Text>
                                <Text style={{ fontSize: 11, color: '#6E6359', marginBottom: 8 }}>
                                    Seleccione una tela del catálogo comercial para autocompletar composición, proveedor y tono:
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {materialsCatalog.map((mat) => {
                                        const isSelected = selectedMaterialId === mat.id;
                                        return (
                                            <TouchableOpacity
                                                key={mat.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 6,
                                                    borderRadius: 16,
                                                    backgroundColor: isSelected ? '#171411' : '#FFFFFF',
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? '#C5A880' : '#E6D9C8',
                                                }}
                                                onPress={() => handleSelectCatalogMaterial(mat)}
                                            >
                                                <View
                                                    style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 5,
                                                        backgroundColor: mat.color_code || '#C5A880',
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(0,0,0,0.2)',
                                                    }}
                                                />
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: '600',
                                                        color: isSelected ? '#FFFFFF' : '#171411',
                                                    }}
                                                >
                                                    {mat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <Text style={styles.formLabel}>2. Título del Concepto o Boceto</Text>
                        <TextInput
                            style={styles.formInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Ej: Estudio de Drapeado Asimétrico en Espalda"
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.formLabel}>Subtítulo / Autoría</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={subtitle}
                                    onChangeText={setSubtitle}
                                    placeholder="Ej: Trazo a mano alzada · Katherine Carroll"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formLabel}>Acento HEX</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={colorHex}
                                    onChangeText={setColorHex}
                                    placeholder="#C5A880"
                                />
                            </View>
                        </View>

                        <Text style={styles.formLabel}>3. Fotografía o Figurín de Referencia del Atelier</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {ATELIER_IMAGE_KEYS.map((img) => {
                                const active = imageKey === img.key && !customImageUrl;
                                return (
                                    <TouchableOpacity
                                        key={img.key}
                                        style={{
                                            width: 74,
                                            borderRadius: 8,
                                            borderWidth: active ? 2 : 1,
                                            borderColor: active ? '#C5A880' : '#E6D9C8',
                                            overflow: 'hidden',
                                            backgroundColor: '#FAF8F5',
                                        }}
                                        onPress={() => {
                                            setImageKey(img.key);
                                            setCustomImageUrl('');
                                            setStoragePath(null);
                                            setUploadedFileName(null);
                                        }}
                                    >
                                        <Image
                                            source={CREATION_EDITORIAL_IMAGES[img.key]}
                                            style={{ width: '100%', height: 50 }}
                                            resizeMode="cover"
                                        />
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                fontSize: 9,
                                                fontWeight: active ? '700' : '600',
                                                color: active ? '#A78350' : '#5C5248',
                                                textAlign: 'center',
                                                paddingVertical: 3,
                                            }}
                                        >
                                            {img.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* CARGA REAL DE ARCHIVO DESDE DISPOSITIVO (GAP-02 / design-assets) */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 10,
                                backgroundColor: '#FAF8F5',
                                padding: 10,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#E6D9C8',
                                marginBottom: 12,
                            }}
                        >
                            <View style={{ flex: 1, minWidth: 200 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#171411' }}>
                                    Archivo Propio de Boceto / Fotografía (Bucket design-assets)
                                </Text>
                                <Text style={{ fontSize: 10, color: '#6E6359' }}>
                                    {uploadedFileName
                                        ? `✓ Archivo cargado: ${uploadedFileName}`
                                        : 'Seleccione un boceto escaneado o fotografía desde su dispositivo (.jpg, .png, .webp)'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.outlineBtn}
                                onPress={handlePickDeviceImage}
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? (
                                    <ActivityIndicator size="small" color="#171411" />
                                ) : (
                                    <Text style={styles.outlineBtnText}>📤 Subir desde Dispositivo</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.formLabel}>URL de Imagen Externa o Boceto Digital (Opcional)</Text>
                        <TextInput
                            style={styles.formInput}
                            value={customImageUrl}
                            onChangeText={setCustomImageUrl}
                            placeholder="https://... (dejar vacío para usar la fotografía editorial seleccionada)"
                        />

                        <Text style={styles.formLabel}>4. Especificaciones de Costura, Caída y Composición</Text>
                        <TextInput
                            style={[styles.formInput, { height: 74, textAlignVertical: 'top' }]}
                            multiline
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Describa el comportamiento de la tela, tipo de costura francesa, ballenas o intención estética..."
                        />

                        <Text style={styles.formLabel}>Etiquetas de Búsqueda (separadas por coma)</Text>
                        <TextInput
                            style={styles.formInput}
                            value={tagsInput}
                            onChangeText={setTagsInput}
                            placeholder="Alta Costura, Bies, Encaje Chantilly"
                        />
                    </ScrollView>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F2EFE9' }}>
                        <TouchableOpacity style={styles.outlineBtn} onPress={onClose}>
                            <Text style={styles.outlineBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.goldBtn} onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color="#171411" />
                            ) : (
                                <Text style={styles.goldBtnText}>
                                    {editingItem ? '✓ Guardar Cambios' : '✦ Fijar en el Moodboard'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
