// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MOODBOARD Y CONCEPTO DE LA CREACIÓN (M04)
// Archivo: src/components/design/CreationMoodboardTab.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Creation } from '../../types/creation';
import {
    CreationMoodboard,
    MoodboardColorSwatch,
    MoodboardItem,
    MoodboardItemType,
} from '../../types/design';
import {
    approveCreationMoodboard,
    deleteMoodboardItem,
    fetchMoodboardByCreation,
    fetchMoodboardItems,
    reopenCreationMoodboard,
    reorderMoodboardItem,
    updateMoodboardItem,
    upsertCreationMoodboard,
} from '../../services/designService';
import {
    NECKLINE_OPTIONS,
    SILHOUETTE_OPTIONS,
    SLEEVE_OPTIONS,
} from '../../services/designMockData';
import {
    CREATION_EDITORIAL_IMAGES,
    DEFAULT_CREATION_IMAGE,
} from '../creations/creationsModel';
import { ColorPaletteSection } from './ColorPaletteSection';
import { MoodboardItemModal } from './MoodboardItemModal';
import { DesignLibraryModal } from './DesignLibraryModal';
import { designStyles as styles } from './designStyles';

export interface CreationMoodboardTabProps {
    creation: Creation;
    compactMode?: boolean;
    onOpenFullConceptTab?: () => void;
}

const ITEM_TYPE_LABELS: Record<MoodboardItemType, string> = {
    sketch: '✎ Boceto / Figurín',
    fabric_swatch: '🧶 Muestra Textil',
    silhouette_ref: '👗 Silueta',
    detail_finish: '✦ Detalle / Bordado',
    color_inspiration: '🎨 Luz & Color',
    editorial_note: '📜 Nota de Autor',
};

export const CreationMoodboardTab: React.FC<CreationMoodboardTabProps> = ({
    creation,
    compactMode = false,
    onOpenFullConceptTab,
}) => {
    const [moodboard, setMoodboard] = useState<CreationMoodboard | null>(null);
    const [items, setItems] = useState<MoodboardItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeFilter, setActiveFilter] = useState<MoodboardItemType | 'all'>('all');
    const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<MoodboardItem | null>(null);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
    const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
    const [themeConceptText, setThemeConceptText] = useState<string>('');
    const [artisticNotesText, setArtisticNotesText] = useState<string>('');
    const [approving, setApproving] = useState<boolean>(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadMoodboardData = async () => {
        setLoading(true);
        setActionError(null);
        const [mbRes, itemsRes] = await Promise.all([
            fetchMoodboardByCreation(creation.id, creation.name),
            fetchMoodboardItems(creation.id),
        ]);
        setMoodboard(mbRes.data);
        setThemeConceptText(mbRes.data.theme_concept || creation.description || '');
        setArtisticNotesText(mbRes.data.artistic_notes || creation.notes || '');
        setItems(itemsRes.data);
        setLoading(false);
    };

    useEffect(() => {
        if (creation.id) {
            loadMoodboardData();
        }
    }, [creation.id]);

    const handleSelectArchitecture = async (
        field: 'silhouette_code' | 'neckline_code' | 'sleeve_code',
        code: string
    ) => {
        setActionError(null);
        const { data, error } = await upsertCreationMoodboard(creation.id, {
            [field]: code,
        });
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data) setMoodboard(data);
    };

    const handleUpdatePalette = async (newPalette: MoodboardColorSwatch[]) => {
        setActionError(null);
        const { data, error } = await upsertCreationMoodboard(creation.id, {
            color_palette: newPalette,
        });
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data) setMoodboard(data);
    };

    const handleSaveConceptAndNotes = async () => {
        setActionError(null);
        const { data, error } = await upsertCreationMoodboard(creation.id, {
            theme_concept: themeConceptText.trim() || null,
            artistic_notes: artisticNotesText.trim() || null,
        });
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data) {
            setMoodboard(data);
            setIsEditingNotes(false);
        }
    };

    const handleApproveMoodboard = async () => {
        setApproving(true);
        setActionError(null);
        const { data, error } = await approveCreationMoodboard(creation.id);
        setApproving(false);
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data) setMoodboard(data);
    };

    const handleReopenMoodboard = async () => {
        setApproving(true);
        setActionError(null);
        const { data, error } = await reopenCreationMoodboard(creation.id);
        setApproving(false);
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data) setMoodboard(data);
    };

    const handleReorderItem = async (itemId: string, direction: 'up' | 'down') => {
        setActionError(null);
        const { data, error } = await reorderMoodboardItem(creation.id, itemId, direction);
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data && data.length > 0) {
            setItems(data);
        }
    };

    const handleTogglePin = async (item: MoodboardItem) => {
        setActionError(null);
        const { data, error } = await updateMoodboardItem(item.id, {
            is_pinned: !item.is_pinned,
        });
        if (error) {
            setActionError(error);
            Alert.alert('Aviso', error);
            return;
        }
        if (data) {
            setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
        }
    };

    const handleRemoveItem = async (id: string) => {
        setActionError(null);
        const { success, error } = await deleteMoodboardItem(id);
        if (error || !success) {
            const msg = error || 'No fue posible quitar el elemento del moodboard.';
            setActionError(msg);
            Alert.alert('Aviso', msg);
            return;
        }
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    if (loading) {
        return (
            <View style={styles.containerCard}>
                <ActivityIndicator size="small" color="#C5A880" />
                <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#8A7E72' }}>
                    Cargando Moodboard y Biblioteca de Diseño...
                </Text>
            </View>
        );
    }

    // Vista resumida cuando se muestra en la pestaña 'Resumen'
    if (compactMode && moodboard) {
        return (
            <View style={styles.containerCard}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.eyebrowGold}>2. DIRECCIÓN DE ARTE & MOODBOARD (M04)</Text>
                        <Text style={styles.titleSerif}>{moodboard.title}</Text>
                    </View>
                    {onOpenFullConceptTab && (
                        <TouchableOpacity style={styles.goldBtn} onPress={onOpenFullConceptTab}>
                            <Text style={styles.goldBtnText}>Abrir Moodboard & Biblioteca →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={{ fontSize: 13, color: '#4A4036', lineHeight: 20, marginBottom: 12 }}>
                    {moodboard.theme_concept || creation.description || 'Sin concepto estético definido.'}
                </Text>

                {/* Mini vista de paleta y contador de bocetos */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, backgroundColor: '#FAF8F5', padding: 12, borderRadius: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6A4A' }}>PALETA ACTIVA:</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {moodboard.color_palette.map((sw) => (
                                <View
                                    key={sw.id}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 11,
                                        backgroundColor: sw.hex,
                                        borderWidth: 1,
                                        borderColor: '#C5A880',
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#171411' }}>
                        {items.length} referencias visuales fijadas en el Pinboard
                    </Text>
                </View>
            </View>
        );
    }

    const filteredItems =
        activeFilter === 'all'
            ? items
            : items.filter((i) => i.item_type === activeFilter);

    const isApproved = moodboard?.status === 'approved';

    return (
        <View style={styles.containerCard}>
            {actionError ? (
                <View
                    style={{
                        backgroundColor: '#FAF2F2',
                        borderWidth: 1,
                        borderColor: '#E8C5C5',
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 12,
                    }}
                >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9E3B3B' }}>
                        ⚠ {actionError}
                    </Text>
                </View>
            ) : null}

            {/* 1. CABECERA PRINCIPAL DEL MOODBOARD */}
            <View style={styles.headerRow}>
                <View style={{ flex: 1, minWidth: 260 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.eyebrowGold}>✦ MÓDULO 04 · DISEÑO, MOODBOARD & BIBLIOTECA</Text>
                        <View
                            style={{
                                backgroundColor: isApproved ? '#F1F7F2' : '#FFF8E7',
                                borderWidth: 1,
                                borderColor: isApproved ? '#C2DFCA' : '#F2D48E',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 10,
                                    fontWeight: '700',
                                    color: isApproved ? '#3D6346' : '#B37D14',
                                }}
                            >
                                {isApproved ? '✓ CONCEPTO APROBADO' : 'EN COMPOSICIÓN CREATIVA'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.titleSerif}>
                        {moodboard?.title || `Moodboard · ${creation.name}`}
                    </Text>
                    <Text style={styles.subtitleMuted}>
                        Mesa de inspiración visual, arquitectura de silueta, paleta cromática y archivo de autor By Katherine Carroll
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <TouchableOpacity
                        style={styles.darkBtn}
                        onPress={() => setIsLibraryModalOpen(true)}
                    >
                        <Text style={styles.darkBtnText}>🏛 Biblioteca de Autor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.goldBtn}
                        onPress={() => {
                            setEditingItem(null);
                            setIsItemModalOpen(true);
                        }}
                    >
                        <Text style={styles.goldBtnText}>+ Fijar Boceto / Referencia</Text>
                    </TouchableOpacity>

                    {!isApproved ? (
                        <TouchableOpacity
                            style={styles.outlineBtn}
                            onPress={handleApproveMoodboard}
                            disabled={approving}
                        >
                            <Text style={styles.outlineBtnText}>
                                {approving ? 'Aprobando...' : '✓ Aprobar Dirección Estética'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.outlineBtn}
                            onPress={handleReopenMoodboard}
                            disabled={approving}
                        >
                            <Text style={styles.outlineBtnText}>
                                {approving ? 'Reabriendo...' : '↺ Reabrir para Ajuste Estético'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 2. NARRATIVA CONCEPTUAL Y NOTAS DE ESTILO */}
            <View style={styles.architecturePanel}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.eyebrowGold}>✦ CONCEPTO NARRATIVO Y ARQUITECTURA DE LA PRENDA</Text>
                    <TouchableOpacity
                        onPress={() =>
                            isEditingNotes ? handleSaveConceptAndNotes() : setIsEditingNotes(true)
                        }
                    >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#A78350' }}>
                            {isEditingNotes ? '✓ Guardar Notas' : '✎ Editar Concepto y Notas'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isEditingNotes ? (
                    <View style={{ marginTop: 10 }}>
                        <Text style={styles.formLabel}>Inspiración y Atmósfera Estética</Text>
                        <TextInput
                            style={[styles.formInput, { height: 60 }]}
                            multiline
                            value={themeConceptText}
                            onChangeText={setThemeConceptText}
                        />
                        <Text style={styles.formLabel}>Directrices de Costura, Forrería y Acabados</Text>
                        <TextInput
                            style={[styles.formInput, { height: 60 }]}
                            multiline
                            value={artisticNotesText}
                            onChangeText={setArtisticNotesText}
                        />
                    </View>
                ) : (
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontFamily: 'serif', fontSize: 14, color: '#171411', fontStyle: 'italic', lineHeight: 20 }}>
                            “{themeConceptText || 'Defina la inspiración poética y estética de esta pieza de alta costura.'}”
                        </Text>
                        {artisticNotesText ? (
                            <Text style={{ fontSize: 12, color: '#5C5248', marginTop: 6, lineHeight: 18 }}>
                                • Directriz de Taller (M04): {artisticNotesText}
                            </Text>
                        ) : null}
                        {creation.notes && creation.notes !== artisticNotesText ? (
                            <View
                                style={{
                                    marginTop: 8,
                                    padding: 8,
                                    borderRadius: 6,
                                    backgroundColor: '#F5EFE6',
                                    borderLeftWidth: 3,
                                    borderLeftColor: '#C5A880',
                                }}
                            >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6A4A' }}>
                                    📋 Notas originales del Expediente de Creación (M03 preservadas):
                                </Text>
                                <Text style={{ fontSize: 11, color: '#4A4036', marginTop: 2 }}>
                                    {creation.notes}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {/* Selectores Estructurales: Silueta, Escote y Manga */}
                <View style={styles.archGrid}>
                    {/* Silueta */}
                    <View style={styles.archCol}>
                        <Text style={styles.archLabel}>1. Silueta Estructural</Text>
                        <View style={styles.archChipsWrap}>
                            {SILHOUETTE_OPTIONS.map((opt) => {
                                const active = moodboard?.silhouette_code === opt.code;
                                return (
                                    <TouchableOpacity
                                        key={opt.code}
                                        style={[
                                            styles.archOptionChip,
                                            active && styles.archOptionChipActive,
                                        ]}
                                        onPress={() => handleSelectArchitecture('silhouette_code', opt.code)}
                                    >
                                        <Text style={[styles.archOptionChipText, active && styles.archOptionChipTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Escote */}
                    <View style={styles.archCol}>
                        <Text style={styles.archLabel}>2. Escote & Cuello</Text>
                        <View style={styles.archChipsWrap}>
                            {NECKLINE_OPTIONS.map((opt) => {
                                const active = moodboard?.neckline_code === opt.code;
                                return (
                                    <TouchableOpacity
                                        key={opt.code}
                                        style={[
                                            styles.archOptionChip,
                                            active && styles.archOptionChipActive,
                                        ]}
                                        onPress={() => handleSelectArchitecture('neckline_code', opt.code)}
                                    >
                                        <Text style={[styles.archOptionChipText, active && styles.archOptionChipTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Manga */}
                    <View style={styles.archCol}>
                        <Text style={styles.archLabel}>3. Manga & Hombro</Text>
                        <View style={styles.archChipsWrap}>
                            {SLEEVE_OPTIONS.map((opt) => {
                                const active = moodboard?.sleeve_code === opt.code;
                                return (
                                    <TouchableOpacity
                                        key={opt.code}
                                        style={[
                                            styles.archOptionChip,
                                            active && styles.archOptionChipActive,
                                        ]}
                                        onPress={() => handleSelectArchitecture('sleeve_code', opt.code)}
                                    >
                                        <Text style={[styles.archOptionChipText, active && styles.archOptionChipTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. PALETA CROMÁTICA Y ACABADOS TEXTILES */}
            <ColorPaletteSection
                palette={moodboard?.color_palette || []}
                onUpdatePalette={handleUpdatePalette}
            />

            {/* 4. MURO PINBOARD VISUAL DE BOCETOS, TELAS Y DETALLES */}
            <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <View>
                        <Text style={styles.eyebrowGold}>✦ MURO PINBOARD DE INSPIRACIÓN</Text>
                        <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '700', color: '#171411' }}>
                            Bocetos, Figurines, Muestras Textiles y Detalles ({filteredItems.length})
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'sketch', label: '✎ Bocetos' },
                            { id: 'fabric_swatch', label: '🧶 Telas' },
                            { id: 'silhouette_ref', label: '👗 Siluetas' },
                            { id: 'detail_finish', label: '✦ Detalles' },
                            { id: 'editorial_note', label: '📜 Notas' },
                        ].map((tab) => {
                            const active = activeFilter === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    style={[
                                        styles.archOptionChip,
                                        active && styles.archOptionChipActive,
                                    ]}
                                    onPress={() => setActiveFilter(tab.id as MoodboardItemType | 'all')}
                                >
                                    <Text style={[styles.archOptionChipText, active && styles.archOptionChipTextActive]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.pinboardGrid}>
                    {filteredItems.map((item) => {
                        const imgSource = item.image_url
                            ? { uri: item.image_url }
                            : (item.image_key && CREATION_EDITORIAL_IMAGES[item.image_key]) ||
                              DEFAULT_CREATION_IMAGE;

                        return (
                            <View key={item.id} style={styles.pinCard}>
                                <View style={styles.pinImageWrap}>
                                    <Image
                                        source={imgSource}
                                        style={styles.pinImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.pinTypeBadge}>
                                        <Text style={styles.pinTypeBadgeText}>
                                            {ITEM_TYPE_LABELS[item.item_type] || 'Referencia'}
                                        </Text>
                                    </View>
                                    {item.color_hex && (
                                        <View
                                            style={[
                                                styles.pinColorDot,
                                                { backgroundColor: item.color_hex },
                                            ]}
                                        />
                                    )}
                                </View>

                                <View style={styles.pinBody}>
                                    <Text style={styles.pinTitle}>{item.title}</Text>
                                    {item.subtitle && (
                                        <Text style={styles.pinSubtitle}>{item.subtitle}</Text>
                                    )}
                                    {item.description && (
                                        <Text style={styles.pinDescription}>{item.description}</Text>
                                    )}

                                    {typeof item.metadata?.material_name === 'string' && (
                                        <View
                                            style={{
                                                marginTop: 6,
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                backgroundColor: '#F3EFEA',
                                                borderWidth: 1,
                                                borderColor: '#D8C7B1',
                                                alignSelf: 'flex-start',
                                            }}
                                        >
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#7A5C38' }}>
                                                🧶 Insumo M03: {String(item.metadata.material_name)}
                                            </Text>
                                        </View>
                                    )}

                                    {item.tags && item.tags.length > 0 && (
                                        <View style={styles.pinTagsRow}>
                                            {item.tags.map((tag) => (
                                                <View key={tag} style={styles.pinTagPill}>
                                                    <Text style={styles.pinTagText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.pinFooterActions}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity onPress={() => handleTogglePin(item)}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: item.is_pinned ? '#A78350' : '#8A7E72' }}>
                                                    {item.is_pinned ? '📌 Fijado' : '○ Fijar'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleReorderItem(item.id, 'up')}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#5C5248' }}>↑</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleReorderItem(item.id, 'down')}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#5C5248' }}>↓</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingItem(item);
                                                    setIsItemModalOpen(true);
                                                }}
                                            >
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#8A6A4A' }}>
                                                    ✎ Editar
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#9E3B3B' }}>
                                                    Quitar
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Modal para añadir o editar boceto o referencia */}
            <MoodboardItemModal
                visible={isItemModalOpen}
                creationId={creation.id}
                moodboardId={moodboard?.id}
                editingItem={editingItem}
                onClose={() => {
                    setIsItemModalOpen(false);
                    setEditingItem(null);
                }}
                onItemCreated={(newItem) => setItems((prev) => [newItem, ...prev])}
                onItemUpdated={(updated) =>
                    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
                }
            />

            {/* Modal explorador de la Biblioteca Permanente de Autor */}
            <DesignLibraryModal
                visible={isLibraryModalOpen}
                creationId={creation.id}
                creationName={creation.name}
                existingLibraryItemIds={items
                    .flatMap((i) => [
                        i.library_item_id,
                        typeof i.metadata?.source_library_id === 'string'
                            ? i.metadata.source_library_id
                            : undefined,
                    ])
                    .filter((id): id is string => Boolean(id))}
                onClose={() => setIsLibraryModalOpen(false)}
                onImportedToMoodboard={(importedItem) =>
                    setItems((prev) => [importedItem, ...prev])
                }
            />
        </View>
    );
};

