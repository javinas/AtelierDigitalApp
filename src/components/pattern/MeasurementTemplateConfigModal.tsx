// ==============================================================================
// ATELIER DIGITAL — MODAL: CONFIGURADOR DE MEDIDAS POR PLANTILLA / JORNADA
// Archivo: src/components/pattern/MeasurementTemplateConfigModal.tsx
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { MASTER_MEASUREMENT_CATALOG } from '../../engine/pattern/catalog/masterCatalog';
import { MeasurementCatalogItem } from '../../types/pattern/measurement';

interface MeasurementTemplateConfigModalProps {
    visible: boolean;
    templateName: string;
    initialCodes: string[];
    onSave: (selectedCodes: string[]) => void;
    onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    torso_body: 'TORSO Y BUSTO',
    arms_sleeves: 'BRAZOS Y MANGAS',
    legs_pants: 'PIERNAS Y CINTURA',
    fit_adjustment: 'AJUSTE Y HOLGURAS',
    garment_design: 'DISEÑO DE PRENDA',
};

const UNIFORME_ESCOLAR_PRESET = [
    'estatura',
    'contorno_cuello',
    'contorno_busto',
    'contorno_cintura',
    'contorno_cadera',
    'ancho_hombros',
    'largo_talle_espalda',
    'largo_brazo',
    'profundidad_tiro',
    'largo_exterior_pierna',
    'largo_falda',
    'largo_camisa',
];

const SASTRERIA_PRESET = [
    'estatura',
    'contorno_cuello',
    'contorno_busto',
    'contorno_cintura',
    'contorno_cadera',
    'ancho_hombros',
    'largo_hombro',
    'ancho_pecho',
    'ancho_espalda',
    'largo_talle_delantero',
    'largo_talle_espalda',
    'largo_brazo',
    'contorno_biceps',
    'contorno_muneca',
    'profundidad_tiro',
    'largo_entrepierna',
    'largo_exterior_pierna',
    'contorno_muslo',
    'contorno_rodilla',
    'contorno_tobillo',
];

export function MeasurementTemplateConfigModal({
    visible,
    templateName,
    initialCodes,
    onSave,
    onClose,
}: MeasurementTemplateConfigModalProps) {
    const [selectedCodes, setSelectedCodes] = useState<string[]>(initialCodes);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const filteredItems = useMemo(() => {
        return MASTER_MEASUREMENT_CATALOG.filter((item) => {
            const matchesCat = activeCategory === 'all' || item.category === activeCategory;
            const query = searchFilter.trim().toLowerCase();
            const matchesSearch =
                !query ||
                item.code.toLowerCase().includes(query) ||
                item.name.toLowerCase().includes(query) ||
                (item.instructions && item.instructions.toLowerCase().includes(query));
            return matchesCat && matchesSearch;
        });
    }, [activeCategory, searchFilter]);

    if (!visible) return null;

    const handleToggleCode = (code: string) => {
        setSelectedCodes((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
        );
    };

    const handleApplyPreset = (presetCodes: string[]) => {
        setSelectedCodes(presetCodes);
    };

    const handleSelectAll = () => {
        setSelectedCodes(MASTER_MEASUREMENT_CATALOG.map((m) => m.code));
    };

    const handleClearAll = () => {
        setSelectedCodes([]);
    };

    const handleConfirm = () => {
        if (selectedCodes.length === 0) {
            alert('Debe seleccionar al menos una medida para la plantilla.');
            return;
        }
        onSave(selectedCodes);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.superTitle}>CONFIGURACIÓN EDITORIAL · ATELIER DIGITAL</Text>
                            <Text style={styles.title}>Configurar Medidas de la Plantilla</Text>
                            <Text style={styles.subtitle}>
                                Plantilla activa: <Text style={styles.goldText}>{templateName}</Text> · {selectedCodes.length} de {MASTER_MEASUREMENT_CATALOG.length} medidas seleccionadas
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕ Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Presets Rápidos */}
                    <View style={styles.presetsRow}>
                        <Text style={styles.presetsLabel}>PRESETS:</Text>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => handleApplyPreset(UNIFORME_ESCOLAR_PRESET)}
                        >
                            <Text style={styles.presetPillText}>🎒 Uniforme Escolar (12)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={() => handleApplyPreset(SASTRERIA_PRESET)}
                        >
                            <Text style={styles.presetPillText}>✂️ Sastrería (20)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.presetPill}
                            onPress={handleSelectAll}
                        >
                            <Text style={styles.presetPillText}>👑 Todas ({MASTER_MEASUREMENT_CATALOG.length})</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.presetPill, { backgroundColor: '#FBE9E7', borderColor: '#FFCCBC' }]}
                            onPress={handleClearAll}
                        >
                            <Text style={[styles.presetPillText, { color: '#D84315' }]}>✕ Desmarcar todas</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Barra de Filtros y Búsqueda */}
                    <View style={styles.filterBar}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="🔍 Buscar medida por nombre o código anatómico..."
                            placeholderTextColor="#999"
                            value={searchFilter}
                            onChangeText={setSearchFilter}
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            <TouchableOpacity
                                style={[styles.catPill, activeCategory === 'all' && styles.catPillActive]}
                                onPress={() => setActiveCategory('all')}
                            >
                                <Text style={[styles.catPillText, activeCategory === 'all' && styles.catPillTextActive]}>
                                    Todas ({MASTER_MEASUREMENT_CATALOG.length})
                                </Text>
                            </TouchableOpacity>
                            {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
                                const countInCat = MASTER_MEASUREMENT_CATALOG.filter((m) => m.category === catKey).length;
                                return (
                                    <TouchableOpacity
                                        key={catKey}
                                        style={[styles.catPill, activeCategory === catKey && styles.catPillActive]}
                                        onPress={() => setActiveCategory(catKey)}
                                    >
                                        <Text style={[styles.catPillText, activeCategory === catKey && styles.catPillTextActive]}>
                                            {catLabel} ({countInCat})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Lista Seleccionable de Medidas */}
                    <ScrollView style={styles.listContainer}>
                        <View style={styles.itemsGrid}>
                            {filteredItems.map((item) => {
                                const isChecked = selectedCodes.includes(item.code);
                                return (
                                    <TouchableOpacity
                                        key={item.code}
                                        style={[styles.itemCard, isChecked && styles.itemCardChecked]}
                                        onPress={() => handleToggleCode(item.code)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.checkboxWrap}>
                                            <Text style={[styles.checkboxIcon, isChecked && styles.checkboxIconChecked]}>
                                                {isChecked ? '☑' : '☐'}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <View style={styles.itemHeaderRow}>
                                                <Text style={styles.itemCode}>{item.code}</Text>
                                                <Text style={styles.itemCategoryBadge}>
                                                    {CATEGORY_LABELS[item.category] || item.category}
                                                </Text>
                                            </View>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            {item.instructions ? (
                                                <Text style={styles.itemInstructions} numberOfLines={1}>
                                                    {item.instructions}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleConfirm}>
                            <Text style={styles.saveBtnText}>
                                ✓ Guardar Selección ({selectedCodes.length} Medidas)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: 820,
        maxWidth: '100%',
        maxHeight: '90%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 24,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    superTitle: {
        fontSize: 9.5,
        fontFamily: typography.serif,
        color: colors.champagneGold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 18,
        fontFamily: typography.serif,
        color: colors.ivoryWarm,
        fontWeight: '700',
        marginTop: 2,
    },
    subtitle: {
        fontSize: 11.5,
        color: '#B0A398',
        marginTop: 2,
    },
    goldText: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    closeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#443D36',
    },
    closeBtnText: {
        color: colors.ivoryWarm,
        fontSize: 11.5,
    },
    presetsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#FAF6F0',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    presetsLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    presetPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    presetPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    filterBar: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0E8DD',
        gap: 8,
    },
    searchInput: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        fontSize: 12,
        color: colors.atelierBlack,
    },
    categoryScroll: {
        flexDirection: 'row',
        gap: 6,
    },
    catPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EAE1D5',
    },
    catPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    catPillText: {
        fontSize: 10.5,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    catPillTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    listContainer: {
        flex: 1,
        padding: 16,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    itemCard: {
        width: '49%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        backgroundColor: '#FAF6F0',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EFE7DC',
    },
    itemCardChecked: {
        backgroundColor: '#F5EFE6',
        borderColor: colors.champagneGold,
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
    },
    checkboxWrap: {
        marginTop: 1,
    },
    checkboxIcon: {
        fontSize: 16,
        color: '#9C9388',
    },
    checkboxIconChecked: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    itemHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemCode: {
        fontFamily: 'monospace',
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    itemCategoryBadge: {
        fontSize: 8,
        color: '#8A7E75',
        textTransform: 'uppercase',
    },
    itemName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    itemInstructions: {
        fontSize: 9.5,
        color: '#766B62',
        marginTop: 2,
    },
    modalFooter: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        backgroundColor: '#FAF6F0',
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    saveBtn: {
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 4,
        backgroundColor: colors.champagneGold,
    },
    saveBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
