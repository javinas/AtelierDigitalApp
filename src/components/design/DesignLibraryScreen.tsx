// ==============================================================================
// ATELIER DIGITAL — MÓDULO 04: PANTALLA BIBLIOTECA DE DISEÑO & ARCHIVO DE AUTOR
// Archivo: src/components/design/DesignLibraryScreen.tsx
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import {
    archiveDesignLibraryItem,
    createDesignLibraryItem,
    fetchDesignLibrary,
    pickAndUploadDesignImage,
    toggleDesignLibrarySignature,
    updateDesignLibraryItem,
} from '../../services/designService';
import {
    NECKLINE_OPTIONS,
    SIGNATURE_COLOR_PALETTES,
    SILHOUETTE_OPTIONS,
    SLEEVE_OPTIONS,
} from '../../services/designMockData';
import {
    CreateLibraryItemDTO,
    DesignLibraryCategory,
    DesignLibraryItem,
} from '../../types/design';
import {
    CREATION_EDITORIAL_IMAGES,
    DEFAULT_CREATION_IMAGE,
} from '../creations/creationsModel';

export interface DesignLibraryScreenProps {
    onBack: () => void;
    onOpenCreations?: () => void;
}

const CATEGORY_LABELS: Record<DesignLibraryCategory, string> = {
    silhouette: 'Siluetas Maestras',
    neckline: 'Escotes & Cuellos',
    sleeve: 'Mangas & Puños',
    fabric_drape: 'Caídas Textiles',
    embroidery_finish: 'Bordados & Acabados',
    color_palette: 'Armonía Cromática',
    historical_archive: 'Archivo Insignia KC',
};

const CATEGORIES: Array<{ key: DesignLibraryCategory | 'all'; label: string }> = [
    { key: 'all', label: 'Todo el Archivo' },
    { key: 'silhouette', label: '👗 Siluetas' },
    { key: 'neckline', label: '💎 Escotes & Cuellos' },
    { key: 'sleeve', label: '✂ Mangas & Puños' },
    { key: 'fabric_drape', label: '🧶 Caídas Textiles' },
    { key: 'embroidery_finish', label: '✦ Bordados & Acabados' },
    { key: 'historical_archive', label: '🏛 Piezas Insignia' },
];

export const DesignLibraryScreen: React.FC<DesignLibraryScreenProps> = ({
    onBack,
    onOpenCreations,
}) => {
    const [items, setItems] = useState<DesignLibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<DesignLibraryCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [onlySignature, setOnlySignature] = useState(false);
    const [activeSection, setActiveSection] = useState<'catalog' | 'palettes' | 'architecture'>('catalog');

    // Estado para nuevo / edición de recurso
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingItem, setEditingItem] = useState<DesignLibraryItem | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState<DesignLibraryCategory>('silhouette');
    const [newSubtitle, setNewSubtitle] = useState('Sello de Autor · By Katherine Carroll');
    const [newDescription, setNewDescription] = useState('');
    const [newTechNotes, setNewTechNotes] = useState('');
    const [newImageKey, setNewImageKey] = useState('dress');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newStoragePath, setNewStoragePath] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [newTags, setNewTags] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await fetchDesignLibrary({
                category: selectedCategory,
                searchQuery,
                onlySignature,
            });
            setItems(data);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, searchQuery, onlySignature]);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const stats = useMemo(() => {
        return {
            total: items.length,
            signature: items.filter((i) => i.is_signature).length,
            silhouettes: items.filter((i) => i.category === 'silhouette' || i.category === 'historical_archive').length,
            textiles: items.filter((i) => i.category === 'fabric_drape' || i.category === 'embroidery_finish').length,
        };
    }, [items]);

    const handleToggleSignature = async (item: DesignLibraryItem) => {
        setActionError(null);
        const { error } = await toggleDesignLibrarySignature(item.id, !item.is_signature);
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        await loadCatalog();
    };

    const handleArchiveItem = async (id: string) => {
        setActionError(null);
        const { success, error } = await archiveDesignLibraryItem(id);
        if (error || !success) {
            const msg = error || 'No fue posible archivar el recurso.';
            setActionError(msg);
            Alert.alert('Aviso', msg);
            return;
        }
        await loadCatalog();
    };

    const handleStartEditItem = (item: DesignLibraryItem) => {
        setActionError(null);
        setEditingItem(item);
        setNewCategory(item.category);
        setNewTitle(item.title);
        setNewSubtitle(item.subtitle || '');
        setNewDescription(item.description);
        setNewTechNotes(item.technical_notes || '');
        setNewImageKey(item.image_key || 'dress');
        setNewImageUrl(item.image_url || '');
        setNewStoragePath(item.storage_path || null);
        setNewTags((item.tags || []).join(', '));
        setShowCreateForm(true);
    };

    const handleUploadImage = async () => {
        setUploadingImage(true);
        setActionError(null);
        const { uri, storagePath, error } = await pickAndUploadDesignImage('library');
        setUploadingImage(false);
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (uri) {
            setNewImageUrl(uri);
            setNewStoragePath(storagePath);
        }
    };

    const handleCreateResource = async () => {
        if (!newTitle.trim() || !newDescription.trim()) return;
        setSaving(true);
        setActionError(null);
        try {
            const parsedTags = newTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            if (editingItem) {
                const { data, error } = await updateDesignLibraryItem(editingItem.id, {
                    category: newCategory,
                    title: newTitle.trim(),
                    subtitle: newSubtitle.trim() || null,
                    description: newDescription.trim(),
                    technical_notes: newTechNotes.trim() || null,
                    image_key: newImageKey,
                    image_url: newImageUrl.trim() || null,
                    storage_path: newStoragePath,
                    tags: parsedTags,
                });
                if (error || !data) {
                    const msg = error || 'No fue posible actualizar el recurso.';
                    setActionError(msg);
                    Alert.alert('Aviso', msg);
                    return;
                }
            } else {
                const dto: CreateLibraryItemDTO = {
                    category: newCategory,
                    title: newTitle.trim(),
                    subtitle: newSubtitle.trim() || null,
                    description: newDescription.trim(),
                    technical_notes: newTechNotes.trim() || null,
                    image_key: newImageKey,
                    image_url: newImageUrl.trim() || null,
                    storage_path: newStoragePath,
                    tags: parsedTags,
                    is_signature: true,
                };
                const { data, error } = await createDesignLibraryItem(dto);
                if (error || !data) {
                    const msg = error || 'No fue posible catalogar el recurso.';
                    setActionError(msg);
                    Alert.alert('Aviso', msg);
                    return;
                }
            }
            setEditingItem(null);
            setNewTitle('');
            setNewDescription('');
            setNewTechNotes('');
            setNewImageUrl('');
            setNewStoragePath(null);
            setNewTags('');
            setShowCreateForm(false);
            await loadCatalog();
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={s.screen}>
            {/* BARRA SUPERIOR EDITORIAL */}
            <View style={s.topBar}>
                <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
                    <Text style={s.backBtnText}>← Volver al Atelier Diseñadora</Text>
                </TouchableOpacity>

                <View style={s.topActions}>
                    {onOpenCreations && (
                        <TouchableOpacity
                            style={s.secondaryTopBtn}
                            onPress={onOpenCreations}
                            activeOpacity={0.85}
                        >
                            <Text style={s.secondaryTopBtnText}>Ir a Creaciones (M03)</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={s.primaryTopBtn}
                        onPress={() => {
                            if (showCreateForm) {
                                setShowCreateForm(false);
                                setEditingItem(null);
                            } else {
                                setEditingItem(null);
                                setShowCreateForm(true);
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={s.primaryTopBtnText}>
                            {showCreateForm ? 'Cerrar Formulario' : '+ Catalogar Recurso de Autor'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                {actionError ? (
                    <View
                        style={{
                            backgroundColor: '#FAF2F2',
                            borderWidth: 1,
                            borderColor: '#E8C5C5',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 14,
                        }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#9E3B3B' }}>
                            ⚠ {actionError}
                        </Text>
                    </View>
                ) : null}

                {/* HERO BANNER */}
                <View style={s.heroCard}>
                    <Text style={s.heroEyebrow}>✦ MÓDULO 04 · ATELIER DE AUTOR BY KATHERINE CARROLL</Text>
                    <Text style={s.heroTitle}>Biblioteca de Diseño, Moodboard & Archivo Creativo</Text>
                    <Text style={s.heroSubtitle}>
                        Repositorio permanente de siluetas de alta costura, muestrario de caídas textiles, detalles de bordado Luneville,
                        figurines históricos y armonías cromáticas reutilizables en los expedientes de cada clienta.
                    </Text>

                    <View style={s.kpiRow}>
                        <View style={s.kpiBox}>
                            <Text style={s.kpiValue}>{stats.total}</Text>
                            <Text style={s.kpiLabel}>RECURSOS ACTIVOS</Text>
                        </View>
                        <View style={s.kpiBox}>
                            <Text style={s.kpiValue}>{stats.signature}</Text>
                            <Text style={s.kpiLabel}>SELLO DE AUTOR ★</Text>
                        </View>
                        <View style={s.kpiBox}>
                            <Text style={s.kpiValue}>{SIGNATURE_COLOR_PALETTES.length}</Text>
                            <Text style={s.kpiLabel}>PALETAS DE FIRMA</Text>
                        </View>
                        <View style={s.kpiBox}>
                            <Text style={s.kpiValue}>{SILHOUETTE_OPTIONS.length}</Text>
                            <Text style={s.kpiLabel}>SILUETAS BASE</Text>
                        </View>
                    </View>
                </View>

                {/* FORMULARIO COLAPSABLE DE CATALOGACIÓN */}
                {showCreateForm && (
                    <View style={s.createFormCard}>
                        <Text style={s.formSectionTitle}>
                            {editingItem
                                ? `Editar Recurso de Autor (${editingItem.code})`
                                : 'Catalogar Nuevo Recurso Permanente en la Biblioteca'}
                        </Text>
                        <Text style={s.formSectionSub}>
                            Todo recurso añadido aquí estará disponible para vincularse en 1 clic al Moodboard de cualquier Creación.
                        </Text>

                        <Text style={s.fieldLabel}>CATEGORÍA DEL RECURSO</Text>
                        <View style={s.chipsWrap}>
                            {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => {
                                const active = newCategory === cat.key;
                                return (
                                    <TouchableOpacity
                                        key={cat.key}
                                        style={[s.chip, active && s.chipActive]}
                                        onPress={() => setNewCategory(cat.key as DesignLibraryCategory)}
                                    >
                                        <Text style={[s.chipText, active && s.chipTextActive]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={s.formGrid}>
                            <View style={s.formCol}>
                                <Text style={s.fieldLabel}>TÍTULO DEL RECURSO *</Text>
                                <TextInput
                                    style={s.input}
                                    value={newTitle}
                                    onChangeText={setNewTitle}
                                    placeholder="Ej: Drapeado líquido en Charmeuse de Seda"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <View style={s.formCol}>
                                <Text style={s.fieldLabel}>COLECCIÓN / SUBTÍTULO</Text>
                                <TextInput
                                    style={s.input}
                                    value={newSubtitle}
                                    onChangeText={setNewSubtitle}
                                    placeholder="Ej: Sello de Autor · By Katherine Carroll"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <View style={s.formGrid}>
                            <View style={s.formCol}>
                                <Text style={s.fieldLabel}>DIRECTRIZ TÉCNICA / CONSTRUCCIÓN</Text>
                                <TextInput
                                    style={s.input}
                                    value={newTechNotes}
                                    onChangeText={setNewTechNotes}
                                    placeholder="Ej: Corte a 45° exactos, colgar 48h en maniquí antes de nivelar bajo"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <View style={s.formCol}>
                                <Text style={s.fieldLabel}>ETIQUETAS (SEPARADAS POR COMA)</Text>
                                <TextInput
                                    style={s.input}
                                    value={newTags}
                                    onChangeText={setNewTags}
                                    placeholder="Ej: novia, drapeado, seda, espalda joya"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={s.fieldLabel}>FOTOGRAFÍA EDITORIAL DE REFERENCIA O ARCHIVO SUBIDO</Text>
                            <TouchableOpacity
                                style={s.secondaryTopBtn}
                                onPress={handleUploadImage}
                                disabled={uploadingImage}
                            >
                                <Text style={s.secondaryTopBtnText}>
                                    {uploadingImage ? 'Subiendo...' : '📤 Subir Imagen / Boceto'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={s.chipsWrap}>
                            {['dress', 'bodice', 'jacket', 'corset', 'skirt', 'pants'].map((k) => {
                                const active = newImageKey === k && !newImageUrl;
                                return (
                                    <TouchableOpacity
                                        key={k}
                                        style={[s.chip, active && s.chipActive]}
                                        onPress={() => {
                                            setNewImageKey(k);
                                            setNewImageUrl('');
                                        }}
                                    >
                                        <Text style={[s.chipText, active && s.chipTextActive]}>
                                            {k.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {newImageUrl ? (
                            <Text style={{ fontSize: 11, color: colors.champagneGold, marginBottom: 10 }}>
                                ✓ Imagen vinculada: {newImageUrl.slice(0, 70)}...
                            </Text>
                        ) : null}

                        <Text style={s.fieldLabel}>DESCRIPCIÓN CONCEPTUAL DE AUTOR *</Text>
                        <TextInput
                            style={[s.input, { minHeight: 74, textAlignVertical: 'top' }]}
                            value={newDescription}
                            onChangeText={setNewDescription}
                            placeholder="Descripción estética, caída de tela o intención sartorial..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                        />

                        <View style={s.formActionsRow}>
                            <TouchableOpacity
                                style={s.secondaryTopBtn}
                                onPress={() => setShowCreateForm(false)}
                            >
                                <Text style={s.secondaryTopBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.primaryTopBtn}
                                onPress={handleCreateResource}
                                disabled={saving || !newTitle.trim() || !newDescription.trim()}
                            >
                                <Text style={s.primaryTopBtnText}>
                                    {saving ? 'Guardando...' : 'Guardar en Biblioteca de Autor'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* NAVEGACIÓN DE SECCIONES DE LA BIBLIOTECA */}
                <View style={s.sectionTabsRow}>
                    <TouchableOpacity
                        style={[s.sectionTab, activeSection === 'catalog' && s.sectionTabActive]}
                        onPress={() => setActiveSection('catalog')}
                    >
                        <Text style={[s.sectionTabText, activeSection === 'catalog' && s.sectionTabTextActive]}>
                            1. Archivo Visual & Textil ({items.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.sectionTab, activeSection === 'palettes' && s.sectionTabActive]}
                        onPress={() => setActiveSection('palettes')}
                    >
                        <Text style={[s.sectionTabText, activeSection === 'palettes' && s.sectionTabTextActive]}>
                            2. Armonías Cromáticas de Firma ({SIGNATURE_COLOR_PALETTES.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.sectionTab, activeSection === 'architecture' && s.sectionTabActive]}
                        onPress={() => setActiveSection('architecture')}
                    >
                        <Text style={[s.sectionTabText, activeSection === 'architecture' && s.sectionTabTextActive]}>
                            3. Guía de Siluetas, Escotes & Mangas
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* SECCIÓN 1: CATÁLOGO DE RECURSOS */}
                {activeSection === 'catalog' && (
                    <View>
                        <View style={s.filterCard}>
                            <View style={s.searchRow}>
                                <TextInput
                                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Buscar por código, título, técnica o etiqueta..."
                                    placeholderTextColor={colors.textMuted}
                                />
                                <TouchableOpacity
                                    style={[s.chip, onlySignature && s.chipActive]}
                                    onPress={() => setOnlySignature((v) => !v)}
                                >
                                    <Text style={[s.chipText, onlySignature && s.chipTextActive]}>
                                        ★ Solo Sello de Autor
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={[s.chipsWrap, { marginTop: 12, marginBottom: 0 }]}>
                                    {CATEGORIES.map((cat) => {
                                        const active = selectedCategory === cat.key;
                                        return (
                                            <TouchableOpacity
                                                key={cat.key}
                                                style={[s.chip, active && s.chipActive]}
                                                onPress={() => setSelectedCategory(cat.key)}
                                            >
                                                <Text style={[s.chipText, active && s.chipTextActive]}>
                                                    {cat.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>

                        {loading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            </View>
                        ) : (
                            <View style={s.cardsGrid}>
                                {items.map((item) => {
                                    const imgSource = item.image_url
                                        ? { uri: item.image_url }
                                        : CREATION_EDITORIAL_IMAGES[item.image_key || 'dress'] || DEFAULT_CREATION_IMAGE;

                                    return (
                                        <View key={item.id} style={s.libraryCard}>
                                            <Image
                                                source={imgSource}
                                                style={s.cardImage}
                                                resizeMode="cover"
                                            />
                                            <View style={s.cardBody}>
                                                <View style={s.cardHeaderRow}>
                                                    <Text style={s.cardCategory}>
                                                        {CATEGORY_LABELS[item.category]} · {item.code}
                                                    </Text>
                                                    <TouchableOpacity onPress={() => handleToggleSignature(item)}>
                                                        <Text style={{ fontSize: 16, color: colors.champagneGold }}>
                                                            {item.is_signature ? '★' : '☆'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                <Text style={s.cardTitle}>{item.title}</Text>
                                                {item.subtitle ? (
                                                    <Text style={s.cardSubtitle}>{item.subtitle}</Text>
                                                ) : null}
                                                <Text style={s.cardDesc}>{item.description}</Text>

                                                {item.technical_notes ? (
                                                    <View style={s.metaBadge}>
                                                        <Text style={s.metaBadgeLabel}>NOTA TÉCNICA DE TALLER:</Text>
                                                        <Text style={s.metaBadgeValue}>{item.technical_notes}</Text>
                                                    </View>
                                                ) : null}

                                                {item.tags.length > 0 && (
                                                    <View style={s.tagsRow}>
                                                        {item.tags.map((tag, i) => (
                                                            <View key={`${item.id}_t_${i}`} style={s.tagBadge}>
                                                                <Text style={s.tagText}>#{tag}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}

                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'flex-end',
                                                        gap: 12,
                                                        marginTop: 10,
                                                        paddingTop: 8,
                                                        borderTopWidth: 1,
                                                        borderTopColor: '#EFECE6',
                                                    }}
                                                >
                                                    <TouchableOpacity onPress={() => handleStartEditItem(item)}>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6A4A' }}>
                                                            ✎ Editar
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleArchiveItem(item.id)}>
                                                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#9E3B3B' }}>
                                                            🗄 Archivar
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* SECCIÓN 2: ARMONÍAS CROMÁTICAS DE FIRMA */}
                {activeSection === 'palettes' && (
                    <View style={s.cardsGrid}>
                        {SIGNATURE_COLOR_PALETTES.map((pal) => (
                            <View key={pal.id} style={s.paletteCard}>
                                <Text style={s.cardCategory}>{pal.season}</Text>
                                <Text style={s.cardTitle}>{pal.name}</Text>

                                <View style={s.swatchesRow}>
                                    {pal.swatches.map((sw) => (
                                        <View key={sw.id} style={s.swatchItem}>
                                            <View style={[s.swatchCircle, { backgroundColor: sw.hex }]} />
                                            <Text style={s.swatchName}>{sw.name}</Text>
                                            <Text style={s.swatchMeta}>
                                                {sw.role.toUpperCase()} · {sw.finish}
                                            </Text>
                                            <Text style={s.swatchHint}>{sw.hex}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* SECCIÓN 3: ARQUITECTURA DE PRENDA */}
                {activeSection === 'architecture' && (
                    <View style={{ gap: 18 }}>
                        <View style={s.archCard}>
                            <Text style={s.formSectionTitle}>Catálogo de Siluetas de Alta Costura</Text>
                            <View style={s.archGrid}>
                                {SILHOUETTE_OPTIONS.map((sil) => (
                                    <View key={sil.code} style={s.archBox}>
                                        <Text style={s.archTitle}>{sil.label}</Text>
                                        <Text style={s.archSub}>Código técnico: {sil.code}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={s.archCard}>
                            <Text style={s.formSectionTitle}>Tipologías de Escote & Construcción Superior</Text>
                            <View style={s.archGrid}>
                                {NECKLINE_OPTIONS.map((neck) => (
                                    <View key={neck.code} style={s.archBox}>
                                        <Text style={s.archTitle}>{neck.label}</Text>
                                        <Text style={s.archSub}>Código técnico: {neck.code}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={s.archCard}>
                            <Text style={s.formSectionTitle}>Tipologías de Manga & Hombro</Text>
                            <View style={s.archGrid}>
                                {SLEEVE_OPTIONS.map((slv) => (
                                    <View key={slv.code} style={s.archBox}>
                                        <Text style={s.archTitle}>{slv.label}</Text>
                                        <Text style={s.archSub}>Código técnico: {slv.code}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
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
    },
    primaryTopBtn: {
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    primaryTopBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
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
        borderRadius: 14,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    heroEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1.4,
        marginBottom: 6,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
        maxWidth: 880,
        marginBottom: 18,
    },
    kpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    kpiBox: {
        flex: 1,
        minWidth: 150,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    kpiLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.8,
        marginTop: 4,
    },
    createFormCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        marginBottom: 20,
    },
    formSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    formSectionSub: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    input: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: colors.textPrimary,
        marginBottom: 12,
    },
    formGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    formCol: {
        flex: 1,
        minWidth: 260,
    },
    formActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 8,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: {
        backgroundColor: 'rgba(197, 160, 89, 0.16)',
        borderColor: colors.champagneGold,
    },
    chipText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    chipTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    sectionTabsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 18,
    },
    sectionTab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTabActive: {
        borderColor: colors.champagneGold,
        backgroundColor: 'rgba(197, 160, 89, 0.12)',
    },
    sectionTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    sectionTabTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    filterCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 18,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    libraryCard: {
        width: '31.5%',
        minWidth: 290,
        flexGrow: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: 170,
        backgroundColor: colors.surfaceSubtle,
    },
    cardBody: {
        padding: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardCategory: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    cardDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 10,
    },
    metaBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
    },
    metaBadgeLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.7,
    },
    metaBadgeValue: {
        fontSize: 11,
        color: colors.textPrimary,
        fontWeight: '600',
        marginTop: 2,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tagBadge: {
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        color: colors.textMuted,
    },
    paletteCard: {
        width: '48%',
        minWidth: 320,
        flexGrow: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
    },
    swatchesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 10,
    },
    swatchItem: {
        width: '46%',
        minWidth: 130,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    swatchCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.18)',
        marginBottom: 6,
    },
    swatchName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    swatchMeta: {
        fontSize: 10,
        color: colors.champagneGold,
        fontWeight: '600',
        marginTop: 2,
    },
    swatchHint: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
    },
    archCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
    },
    archGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 10,
    },
    archBox: {
        width: '31%',
        minWidth: 220,
        flexGrow: 1,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    archTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    archSub: {
        fontSize: 11,
        color: colors.textSecondary,
    },
});
