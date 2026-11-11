// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: BIBLIOTECA DE RECURSOS DE AUTOR (M04)
// Archivo: src/components/design/DesignLibraryModal.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    DesignLibraryCategory,
    DesignLibraryItem,
    MoodboardItem,
} from '../../types/design';
import {
    createDesignLibraryItem,
    fetchDesignLibrary,
    importLibraryItemToCreation,
} from '../../services/designService';
import {
    CREATION_EDITORIAL_IMAGES,
    DEFAULT_CREATION_IMAGE,
} from '../creations/creationsModel';
import { designStyles as styles } from './designStyles';

export interface DesignLibraryModalProps {
    visible: boolean;
    creationId?: string;
    creationName?: string;
    existingLibraryItemIds?: string[];
    onClose: () => void;
    onImportedToMoodboard?: (item: MoodboardItem) => void;
}

const LIBRARY_CATEGORIES: { id: DesignLibraryCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Todo el Archivo' },
    { id: 'silhouette', label: '👗 Siluetas' },
    { id: 'neckline', label: '💎 Escotes & Cuellos' },
    { id: 'sleeve', label: '✂ Mangas & Puños' },
    { id: 'fabric_drape', label: '🧶 Caídas Textiles' },
    { id: 'embroidery_finish', label: '✦ Bordados & Acabados' },
    { id: 'historical_archive', label: '🏛 Piezas Insignia' },
];

export const DesignLibraryModal: React.FC<DesignLibraryModalProps> = ({
    visible,
    creationId,
    creationName,
    existingLibraryItemIds = [],
    onClose,
    onImportedToMoodboard,
}) => {
    const [items, setItems] = useState<DesignLibraryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeCategory, setActiveCategory] = useState<DesignLibraryCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [importingId, setImportingId] = useState<string | null>(null);
    const [showNewForm, setShowNewForm] = useState<boolean>(false);

    // Estado para nuevo recurso de biblioteca
    const [newCategory, setNewCategory] = useState<DesignLibraryCategory>('silhouette');
    const [newTitle, setNewTitle] = useState<string>('');
    const [newSubtitle, setNewSubtitle] = useState<string>('Sello de Autor · By Katherine Carroll');
    const [newDescription, setNewDescription] = useState<string>('');
    const [newTechNotes, setNewTechNotes] = useState<string>('');
    const [newImageKey, setNewImageKey] = useState<string>('dress');
    const [savingNew, setSavingNew] = useState<boolean>(false);

    const loadLibrary = async () => {
        setLoading(true);
        const { data } = await fetchDesignLibrary({
            category: activeCategory,
            searchQuery,
        });
        setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        if (visible) {
            loadLibrary();
        }
    }, [visible, activeCategory, searchQuery]);

    const handleImport = async (libItem: DesignLibraryItem) => {
        if (!creationId) return;
        setImportingId(libItem.id);
        const { data, error } = await importLibraryItemToCreation(libItem, creationId);
        setImportingId(null);
        if (error || !data) {
            Alert.alert('Aviso', error || 'No fue posible fijar el recurso en el moodboard.');
            return;
        }
        if (onImportedToMoodboard) {
            onImportedToMoodboard(data);
            onClose();
        }
    };

    const handleCreateLibraryItem = async () => {
        if (!newTitle.trim() || !newDescription.trim()) return;
        setSavingNew(true);
        const { data, error } = await createDesignLibraryItem({
            category: newCategory,
            title: newTitle.trim(),
            subtitle: newSubtitle.trim() || null,
            description: newDescription.trim(),
            technical_notes: newTechNotes.trim() || null,
            image_key: newImageKey,
            is_signature: true,
        });
        setSavingNew(false);
        if (error || !data) {
            Alert.alert('Aviso', error || 'No fue posible catalogar el recurso.');
            return;
        }
        setItems((prev) => [data, ...prev]);
        setNewTitle('');
        setNewDescription('');
        setNewTechNotes('');
        setShowNewForm(false);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { maxWidth: 880 }]}>
                    {/* Cabecera */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.eyebrowGold}>✦ ARCHIVO PERMANENTE DE ALTA COSTURA</Text>
                            <Text style={styles.titleSerif}>Biblioteca de Diseño & Recursos de Autor</Text>
                            <Text style={styles.subtitleMuted}>
                                Siluetas maestras, escotes, mangas, bordados Luneville y técnicas de la Casa Carroll
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <TouchableOpacity
                                style={styles.outlineBtn}
                                onPress={() => setShowNewForm(!showNewForm)}
                            >
                                <Text style={styles.outlineBtnText}>
                                    {showNewForm ? '✕ Cerrar Formulario' : '+ Nuevo Recurso de Autor'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                testID="close-library-modal"
                                style={styles.closeCircleBtn}
                                onPress={onClose}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#171411' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Formulario para catalogar nuevo recurso en la Biblioteca */}
                    {showNewForm && (
                        <View style={{ backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: '#E6D9C8', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                            <Text style={[styles.eyebrowGold, { marginBottom: 8 }]}>
                                CATALOGAR NUEVA TÉCNICA O SILUETA EN LA BIBLIOTECA
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                {LIBRARY_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.archOptionChip,
                                            newCategory === cat.id && styles.archOptionChipActive,
                                        ]}
                                        onPress={() => setNewCategory(cat.id as DesignLibraryCategory)}
                                    >
                                        <Text style={[styles.archOptionChipText, newCategory === cat.id && styles.archOptionChipTextActive]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 2 }}>
                                    <Text style={styles.formLabel}>Título Técnico / Editorial</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={newTitle}
                                        onChangeText={setNewTitle}
                                        placeholder="Ej: Drapeado Helénico al Bies sobre Hombro"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.formLabel}>Subtítulo</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={newSubtitle}
                                        onChangeText={setNewSubtitle}
                                    />
                                </View>
                            </View>

                            <Text style={styles.formLabel}>Descripción Estética y Estructural</Text>
                            <TextInput
                                style={[styles.formInput, { height: 52 }]}
                                multiline
                                value={newDescription}
                                onChangeText={setNewDescription}
                                placeholder="Descripción de la silueta, caída o técnica artesanal..."
                            />

                            <Text style={styles.formLabel}>Directriz de Costura y Patronaje CAD</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newTechNotes}
                                onChangeText={setNewTechNotes}
                                placeholder="Ej: Cortar a 45° exactos, dejar colgar 24h en maniquí antes de nivelar ruedo."
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowNewForm(false)}>
                                    <Text style={styles.outlineBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.goldBtn} onPress={handleCreateLibraryItem} disabled={savingNew}>
                                    <Text style={styles.goldBtnText}>✓ Guardar en Biblioteca Permanente</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Buscador y Filtros de Categoría */}
                    <View style={{ marginBottom: 12 }}>
                        <TextInput
                            style={[styles.formInput, { marginBottom: 10 }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="🔍 Buscar en la biblioteca por código (SIL-KC), silueta, escote, bordado Luneville, seda..."
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {LIBRARY_CATEGORIES.map((cat) => {
                                    const active = activeCategory === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.archOptionChip,
                                                active && styles.archOptionChipActive,
                                            ]}
                                            onPress={() => setActiveCategory(cat.id)}
                                        >
                                            <Text style={[styles.archOptionChipText, active && styles.archOptionChipTextActive]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Cuadrícula de Recursos de la Biblioteca */}
                    <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
                        {loading ? (
                            <View style={{ padding: 30, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#C5A880" />
                                <Text style={{ marginTop: 8, color: '#8A7E72', fontSize: 12 }}>
                                    Consultando Biblioteca de Autor...
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.pinboardGrid}>
                                {items.map((item) => {
                                    const imgSource =
                                        (item.image_key && CREATION_EDITORIAL_IMAGES[item.image_key]) ||
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
                                                    <Text style={styles.pinTypeBadgeText}>{item.code}</Text>
                                                </View>
                                                {item.is_signature && (
                                                    <View
                                                        style={{
                                                            position: 'absolute',
                                                            top: 10,
                                                            right: 10,
                                                            backgroundColor: '#C5A880',
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 3,
                                                            borderRadius: 6,
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#171411' }}>
                                                            ✦ SELLO BY KC
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.pinBody}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                                    <Text style={[styles.pinTitle, { flex: 1 }]}>{item.title}</Text>
                                                    {existingLibraryItemIds.includes(item.id) && (
                                                        <View
                                                            style={{
                                                                backgroundColor: '#F1F7F2',
                                                                borderWidth: 1,
                                                                borderColor: '#C2DFCA',
                                                                borderRadius: 6,
                                                                paddingHorizontal: 7,
                                                                paddingVertical: 2,
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#3D6346' }}>
                                                                ✓ Ya en este Moodboard
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {item.subtitle && (
                                                    <Text style={styles.pinSubtitle}>{item.subtitle}</Text>
                                                )}
                                                <Text style={styles.pinDescription}>{item.description}</Text>

                                                {item.technical_notes && (
                                                    <View
                                                        style={{
                                                            backgroundColor: '#FAF8F5',
                                                            borderLeftWidth: 3,
                                                            borderLeftColor: '#C5A880',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            marginTop: 8,
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#8A6A4A' }}>
                                                            DIRECTRIZ TÉCNICA & CAD:
                                                        </Text>
                                                        <Text style={{ fontSize: 11, color: '#4A4036', marginTop: 2 }}>
                                                            {item.technical_notes}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View style={styles.pinTagsRow}>
                                                    {item.tags.map((t) => (
                                                        <View key={t} style={styles.pinTagPill}>
                                                            <Text style={styles.pinTagText}>{t}</Text>
                                                        </View>
                                                    ))}
                                                </View>

                                                {creationId && (
                                                    <View style={styles.pinFooterActions}>
                                                        {existingLibraryItemIds.includes(item.id) ? (
                                                            <View
                                                                style={{
                                                                    backgroundColor: '#F1F7F2',
                                                                    borderWidth: 1,
                                                                    borderColor: '#C2DFCA',
                                                                    borderRadius: 6,
                                                                    paddingHorizontal: 8,
                                                                    paddingVertical: 3,
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#3D6346' }}>
                                                                    ✓ Ya en este Moodboard
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={{ fontSize: 10, color: '#8A7E72' }}>
                                                                Destino: {creationName || 'Creación activa'}
                                                            </Text>
                                                        )}
                                                        <TouchableOpacity
                                                            style={styles.goldBtn}
                                                            onPress={() => handleImport(item)}
                                                            disabled={importingId === item.id}
                                                        >
                                                            <Text style={styles.goldBtnText}>
                                                                {importingId === item.id
                                                                    ? 'Fijando...'
                                                                    : existingLibraryItemIds.includes(item.id)
                                                                        ? '+ Duplicar Ficha'
                                                                        : '✦ Fijar en Moodboard'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

