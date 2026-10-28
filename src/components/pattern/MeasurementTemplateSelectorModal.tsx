// ==============================================================================
// ATELIER DIGITAL — SELECTOR VISUAL DE PLANTILLAS DE MEDIDAS (FASE 2)
// Archivo: src/components/pattern/MeasurementTemplateSelectorModal.tsx
// ==============================================================================
// Experiencia editorial de alta costura para elegir la plantilla de medidas pertinente.
// Identidad visual: Marfil #F8F2E9, Negro #171411, Champagne #A78350 y Arena #E6D9C8.
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import {
    MeasurementTemplate,
    MeasurementTemplateCategory,
} from '../../types/pattern/measurementTemplate';
import { DemographicCategory } from '../../types/personGroup';
import {
    MEASUREMENT_TEMPLATES,
    TEMPLATE_CATEGORY_LABELS,
    TEMPLATE_IMAGES,
} from '../../engine/pattern/catalog/measurementTemplates';

interface MeasurementTemplateSelectorModalProps {
    visible: boolean;
    activeTemplateId?: string | null;
    personDemographic?: DemographicCategory | null;
    onSelectTemplate: (template: MeasurementTemplate) => void;
    onClose: () => void;
}

export function MeasurementTemplateSelectorModal({
    visible,
    activeTemplateId,
    personDemographic,
    onSelectTemplate,
    onClose,
}: MeasurementTemplateSelectorModalProps) {
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [onlyCompatible, setOnlyCompatible] = useState<boolean>(Boolean(personDemographic));

    const categoryTabs = useMemo(() => [
        { key: 'all', label: 'Todas las Plantillas' },
        { key: 'alta_costura', label: 'Alta Costura' },
        { key: 'tailoring', label: 'Sastrería' },
        { key: 'daily_wear', label: 'Camisería' },
        { key: 'lower_body', label: 'Inferior' },
        { key: 'specialty', label: 'Especiales & Infantil' },
    ], []);

    const filteredTemplates = useMemo(() => {
        return MEASUREMENT_TEMPLATES.filter((template) => {
            if (!template.is_active) return false;
            if (selectedCategoryFilter !== 'all' && template.category !== selectedCategoryFilter) {
                return false;
            }
            if (onlyCompatible && personDemographic) {
                if (!template.demographic_categories.includes(personDemographic)) {
                    return false;
                }
            }
            return true;
        });
    }, [selectedCategoryFilter, onlyCompatible, personDemographic]);

    const getDemographicBadges = (categories: DemographicCategory[]) => {
        const icons: Record<DemographicCategory, string> = {
            woman: '👩 Damas',
            man: '👨 Caballeros',
            girl: '👧 Niñas',
            boy: '👦 Niños',
            baby: '👶 Bebés',
        };
        return categories.map((c) => icons[c] || c);
    };

    const getAnatomicalLabels = (template: MeasurementTemplate) => {
        const map: Record<string, string> = {
            torso_body: 'Torso',
            arms_sleeves: 'Brazos',
            legs_pants: 'Piernas',
            fit_adjustment: 'Ajuste',
            garment_design: 'Diseño',
        };
        return template.anatomical_categories.map((c) => map[c] || c).join(' · ');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    {/* Header Editorial */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={styles.superTitle}>ATELIER DE ALTA COSTURA · MÓDULO 02</Text>
                            <Text style={styles.title}>Plantillas Reutilizables de Medidas</Text>
                            <Text style={styles.subtitle}>
                                Seleccione el protocolo curado de medidas según la prenda o servicio para optimizar la toma anatómica.
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Barra de Filtros y Recomendación */}
                    <View style={styles.filterBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                            {categoryTabs.map((tab) => {
                                const isSelected = selectedCategoryFilter === tab.key;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                        onPress={() => setSelectedCategoryFilter(tab.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {personDemographic && (
                            <TouchableOpacity
                                style={[styles.compatToggle, onlyCompatible && styles.compatToggleActive]}
                                onPress={() => setOnlyCompatible(!onlyCompatible)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.compatToggleText, onlyCompatible && styles.compatToggleTextActive]}>
                                    {onlyCompatible ? '✓ Filtrando por sujeto medido' : 'Mostrar todas'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Grilla Visual de Tarjetas */}
                    <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContainer}>
                        {filteredTemplates.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateTitle}>No hay plantillas con los filtros actuales</Text>
                                <Text style={styles.emptyStateDesc}>
                                    Intente desactivar el filtro demográfico o seleccionar "Todas las Plantillas".
                                </Text>
                                <TouchableOpacity
                                    style={styles.resetFilterBtn}
                                    onPress={() => {
                                        setSelectedCategoryFilter('all');
                                        setOnlyCompatible(false);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.resetFilterBtnText}>Restablecer Filtros</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.cardsGrid}>
                                {filteredTemplates.map((template) => {
                                    const isCurrentActive = activeTemplateId === template.id;
                                    const imgSource = TEMPLATE_IMAGES[template.id];

                                    return (
                                        <View
                                            key={template.id}
                                            style={[
                                                styles.templateCard,
                                                isCurrentActive && styles.templateCardActive,
                                            ]}
                                        >
                                            {/* Imagen Editorial de Referencia */}
                                            <View style={styles.cardImageContainer}>
                                                {imgSource ? (
                                                    <Image source={imgSource} style={styles.cardImage} resizeMode="cover" />
                                                ) : (
                                                    <View style={styles.fallbackImage}>
                                                        <Text style={{ fontSize: 32 }}>{template.icon}</Text>
                                                    </View>
                                                )}
                                                <View style={styles.categoryPill}>
                                                    <Text style={styles.categoryPillText}>
                                                        {TEMPLATE_CATEGORY_LABELS[template.category]}
                                                    </Text>
                                                </View>
                                                {isCurrentActive && (
                                                    <View style={styles.activePill}>
                                                        <Text style={styles.activePillText}>✓ EN USO</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Contenido Editorial */}
                                            <View style={styles.cardContent}>
                                                <View style={styles.cardHeaderRow}>
                                                    <Text style={styles.cardIcon}>{template.icon}</Text>
                                                    <Text style={styles.cardName} numberOfLines={1}>
                                                        {template.name}
                                                    </Text>
                                                </View>

                                                <Text style={styles.cardDescription} numberOfLines={2}>
                                                    {template.shortDescription}
                                                </Text>

                                                {/* Metadatos Técnicos de Alta Costura */}
                                                <View style={styles.metaRow}>
                                                    <View style={styles.metaItem}>
                                                        <Text style={styles.metaLabel}>MEDIDAS</Text>
                                                        <Text style={styles.metaValue}>
                                                            {template.measurement_codes.length} cotas
                                                        </Text>
                                                    </View>
                                                    <View style={styles.metaDivider} />
                                                    <View style={styles.metaItem}>
                                                        <Text style={styles.metaLabel}>OBLIGATORIAS</Text>
                                                        <Text style={styles.metaValue}>
                                                            {template.required_codes.length} mínimas
                                                        </Text>
                                                    </View>
                                                    <View style={styles.metaDivider} />
                                                    <View style={[styles.metaItem, { flex: 1.2 }]}>
                                                        <Text style={styles.metaLabel}>ANATOMÍA</Text>
                                                        <Text style={styles.metaValue} numberOfLines={1}>
                                                            {getAnatomicalLabels(template)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Demográficos Compatibles */}
                                                <View style={styles.demographicRow}>
                                                    {getDemographicBadges(template.demographic_categories).map((badgeText, idx) => (
                                                        <View key={idx} style={styles.demographicChip}>
                                                            <Text style={styles.demographicChipText}>{badgeText}</Text>
                                                        </View>
                                                    ))}
                                                </View>

                                                {/* Botón de Selección */}
                                                <TouchableOpacity
                                                    style={[
                                                        styles.selectBtn,
                                                        isCurrentActive && styles.selectBtnActive,
                                                    ]}
                                                    onPress={() => onSelectTemplate(template)}
                                                    activeOpacity={0.85}
                                                >
                                                    <Text style={[styles.selectBtnText, isCurrentActive && styles.selectBtnTextActive]}>
                                                        {isCurrentActive ? '✓ Plantilla Activa' : '✓ Usar Plantilla'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerHint}>
                            * La plantilla solo determina las cotas solicitadas en la sesión. La matemática y precisión del motor CAD se conservan al 100%.
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.footerCloseBtn} activeOpacity={0.8}>
                            <Text style={styles.footerCloseBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 1040,
        maxHeight: '92%',
        backgroundColor: colors.ivoryWarm, // Marfil #F8F2E9
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand, // Arena #E6D9C8
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#EAE1D3',
        backgroundColor: '#FFFFFF',
    },
    superTitle: {
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold, // Champagne #A78350
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    title: {
        fontFamily: typography.serif,
        fontSize: 22,
        fontWeight: '700',
        color: colors.atelierBlack, // Negro #171411
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5EFE6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        backgroundColor: '#FAF5EE',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterScroll: {
        flexDirection: 'row',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    filterChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    filterChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    compatToggle: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        backgroundColor: '#F0E7D8',
    },
    compatToggleActive: {
        backgroundColor: '#E4D6C0',
    },
    compatToggleText: {
        fontSize: 11,
        color: '#6E5528',
        fontWeight: '600',
    },
    compatToggleTextActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    gridScroll: {
        flex: 1,
    },
    gridContainer: {
        padding: 20,
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    templateCard: {
        width: '48.5%',
        minWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    templateCardActive: {
        borderColor: colors.champagneGold,
        borderWidth: 1.5,
    },
    cardImageContainer: {
        height: 140,
        width: '100%',
        backgroundColor: '#F5EFE6',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    fallbackImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#EFE7DB',
    },
    categoryPill: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
    },
    categoryPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F8F2E9',
        letterSpacing: 0.5,
    },
    activePill: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
    },
    activePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cardContent: {
        padding: 14,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    cardIcon: {
        fontSize: 20,
    },
    cardName: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        flex: 1,
    },
    cardDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
        marginBottom: 12,
        minHeight: 34,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF6F0',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EFE8DC',
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 1,
    },
    metaDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E0D5C3',
        marginHorizontal: 6,
    },
    demographicRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    demographicChip: {
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    demographicChipText: {
        fontSize: 10,
        color: '#6A5328',
        fontWeight: '600',
    },
    selectBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 9,
        borderRadius: 4,
        alignItems: 'center',
    },
    selectBtnActive: {
        backgroundColor: colors.champagneGold,
    },
    selectBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    selectBtnTextActive: {
        color: '#FFFFFF',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateTitle: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 6,
    },
    emptyStateDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 18,
        marginBottom: 16,
    },
    resetFilterBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 4,
    },
    resetFilterBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#EAE1D3',
        backgroundColor: '#FFFFFF',
        gap: 12,
    },
    footerHint: {
        fontSize: 10,
        color: colors.textSecondary,
        fontStyle: 'italic',
        flex: 1,
    },
    footerCloseBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 4,
        backgroundColor: '#F5EFE6',
    },
    footerCloseBtnText: {
        fontSize: 12,
        color: colors.textPrimary,
        fontWeight: '600',
    },
});
