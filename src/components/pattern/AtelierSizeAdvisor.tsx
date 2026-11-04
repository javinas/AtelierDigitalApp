// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: GUÍA DE MEDIDAS, TALLAS DE REFERENCIA Y ASESOR (M02)
// Archivo: src/components/pattern/AtelierSizeAdvisor.tsx
// ==============================================================================
// Reutiliza y unifica la Guía de Medidas y Tallas de Referencia de Alta Costura
// con el algoritmo inteligente de recomendación antropométrica por proporciones.
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import {
    getAvailableStandardSizes,
    getPertinentFieldsForCategory,
    getStandardSizeEntry,
    STANDARD_CATEGORIES,
    STANDARD_REFERENCE_NOTICE,
    STANDARD_SOURCE_DISCLAIMER,
    STANDARD_SOURCE_REFERENCE,
    StandardCategoryKey,
} from '../../engine/pattern/catalog/standardReferenceSizes';

export const STANDARD_CATEGORY_IMAGES: Record<StandardCategoryKey, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

export type GarmentTypeAdvisor = 'upper' | 'lower' | 'full';

export interface GarmentTypeAdvisorConfig {
    key: GarmentTypeAdvisor;
    label: string;
    description: string;
    icon: string;
    criticalCodes: string[];
}

export const GARMENT_ADVISOR_CONFIGS: GarmentTypeAdvisorConfig[] = [
    {
        key: 'upper',
        label: 'Prenda Superior',
        description: 'Busto, cintura, espalda y hombros',
        icon: '👗',
        criticalCodes: ['contorno_busto', 'contorno_cintura', 'ancho_espalda', 'ancho_hombros'],
    },
    {
        key: 'lower',
        label: 'Prenda Inferior',
        description: 'Cintura, cadera y tiro/largo',
        icon: '👖',
        criticalCodes: ['contorno_cintura', 'contorno_cadera', 'largo_exterior_pierna'],
    },
    {
        key: 'full',
        label: 'Prenda Completa',
        description: 'Busto, cintura, cadera y estatura',
        icon: '✨',
        criticalCodes: ['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'estatura'],
    },
];

export interface AtelierSizeAdvisorProps {
    demographicCategory?: StandardCategoryKey;
    measurementsMm?: Record<string, number>;
    onApplyBaseValues?: (suggestedValuesCm: Record<string, number>, sizeKey: string) => void;
    onClose?: () => void;
}

export const AtelierSizeAdvisor: React.FC<AtelierSizeAdvisorProps> = ({
    demographicCategory = 'woman',
    measurementsMm = {},
    onApplyBaseValues,
    onClose,
}) => {
    const [selectedCategory, setSelectedCategory] = useState<StandardCategoryKey>(demographicCategory);
    const [selectedSize, setSelectedSize] = useState<string>('M');
    const [selectedGarment, setSelectedGarment] = useState<GarmentTypeAdvisor>('full');

    const availableSizes = useMemo(() => {
        return getAvailableStandardSizes(selectedCategory);
    }, [selectedCategory]);

    // Medidas del sujeto en cm
    const subjectValuesCm = useMemo(() => {
        const res: Record<string, number> = {};
        Object.entries(measurementsMm).forEach(([code, mm]) => {
            if (typeof mm === 'number' && Number.isFinite(mm) && mm > 0) {
                res[code] = Math.round((mm / 10.0) * 10) / 10;
            }
        });
        return res;
    }, [measurementsMm]);

    const currentConfig = useMemo(() => {
        return (
            GARMENT_ADVISOR_CONFIGS.find((g) => g.key === selectedGarment) ||
            GARMENT_ADVISOR_CONFIGS[0]
        );
    }, [selectedGarment]);

    // Algoritmo de recomendación transparente de talla más cercana
    const evaluationResult = useMemo(() => {
        const availableCodes = currentConfig.criticalCodes.filter(
            (c) => subjectValuesCm[c] && subjectValuesCm[c] > 0
        );

        if (availableCodes.length === 0) {
            return { suggestedSize: null, hasData: false };
        }

        let bestSize: string | null = null;
        let lowestTotalDiff = Infinity;

        availableSizes.forEach((sizeKey) => {
            const entry = getStandardSizeEntry(selectedCategory, sizeKey);
            if (!entry) return;

            let diffSum = 0;
            let evaluatedCount = 0;

            availableCodes.forEach((code) => {
                const subjectVal = subjectValuesCm[code];
                const refVal = entry.measurementsCm[code];
                if (subjectVal && refVal) {
                    diffSum += Math.abs(subjectVal - refVal);
                    evaluatedCount++;
                }
            });

            if (evaluatedCount > 0) {
                const avgDiff = diffSum / evaluatedCount;
                if (avgDiff < lowestTotalDiff) {
                    lowestTotalDiff = avgDiff;
                    bestSize = sizeKey;
                }
            }
        });

        return { suggestedSize: bestSize, hasData: true };
    }, [selectedCategory, availableSizes, currentConfig, subjectValuesCm]);

    // Cambiar de categoría actualiza automáticamente la talla si no existe
    const handleSelectCategory = (cat: StandardCategoryKey) => {
        setSelectedCategory(cat);
        const sizes = getAvailableStandardSizes(cat);
        if (!sizes.includes(selectedSize)) {
            setSelectedSize(sizes[0] || 'M');
        }
    };

    const activeCategoryDef = useMemo(() => {
        return STANDARD_CATEGORIES.find((c) => c.key === selectedCategory) || STANDARD_CATEGORIES[0];
    }, [selectedCategory]);

    const activeSizeEntry = useMemo(() => {
        return getStandardSizeEntry(selectedCategory, selectedSize);
    }, [selectedCategory, selectedSize]);

    const pertinentFields = useMemo(() => {
        return getPertinentFieldsForCategory(selectedCategory);
    }, [selectedCategory]);

    const girthFields = useMemo(() => {
        return pertinentFields.filter((f) => f.section === 'girth');
    }, [pertinentFields]);

    const lengthFields = useMemo(() => {
        return pertinentFields.filter((f) => f.section === 'length');
    }, [pertinentFields]);

    const estaturaVal = activeSizeEntry?.measurementsCm['estatura'];

    const handleApply = () => {
        if (!activeSizeEntry) return;
        if (onApplyBaseValues) {
            onApplyBaseValues(activeSizeEntry.measurementsCm, selectedSize);
        }
        if (onClose) {
            onClose();
        }
    };

    return (
        <View style={styles.container}>
            {/* 1. Header de la Guía */}
            <View style={styles.guideHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.guideSuperTitle}>ATELIER DIGITAL · MÓDULO 02</Text>
                    <Text style={styles.guideTitle}>Guía de Medidas y Tallas de Referencia</Text>
                    <Text style={styles.guideSubtitle}>
                        Punto de partida antropométrico para inicializar una nueva sesión de medidas
                    </Text>
                </View>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.guideCloseBtn} activeOpacity={0.7}>
                        <Text style={styles.guideCloseBtnText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 2. Categorías Principales con Maniquíes Reales de Alta Costura */}
            <View style={styles.guideCategoryTabs}>
                {STANDARD_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    const mannequinImg = STANDARD_CATEGORY_IMAGES[cat.key];
                    return (
                        <TouchableOpacity
                            key={cat.key}
                            style={[styles.guideCategoryTab, isSelected && styles.guideCategoryTabActive]}
                            onPress={() => handleSelectCategory(cat.key)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.guideAvatarWrapper, isSelected && styles.guideAvatarWrapperActive]}>
                                <Image
                                    source={mannequinImg}
                                    style={styles.guideCategoryAvatar}
                                    resizeMode="cover"
                                />
                            </View>
                            <Text style={[styles.guideCategoryText, isSelected && styles.guideCategoryTextActive]}>
                                {cat.label}
                            </Text>
                            <Text style={[styles.guideCategorySubText, isSelected && styles.guideCategorySubTextActive]}>
                                {cat.key === 'woman'
                                    ? 'Damas'
                                    : cat.key === 'man'
                                        ? 'Caballeros'
                                        : cat.key === 'girl'
                                            ? 'Niñas'
                                            : cat.key === 'boy'
                                                ? 'Niños'
                                                : 'Bebés'}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* 3. Selector Horizontal de Tallas con indicador de Talla Sugerida */}
            <View style={styles.guideSizesBar}>
                <Text style={styles.guideSizesLabel}>Tallas:</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.guideSizesScroll}
                >
                    {availableSizes.map((s) => {
                        const isSizeActive = selectedSize === s;
                        const isSuggested = evaluationResult.suggestedSize === s;
                        return (
                            <TouchableOpacity
                                key={s}
                                style={[
                                    styles.guideSizePill,
                                    isSizeActive && styles.guideSizePillActive,
                                    isSuggested && !isSizeActive && styles.guideSizePillSuggested,
                                ]}
                                onPress={() => setSelectedSize(s)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.guideSizePillText,
                                        isSizeActive && styles.guideSizePillTextActive,
                                        isSuggested && !isSizeActive && styles.guideSizePillTextSuggested,
                                    ]}
                                >
                                    {isSuggested ? `★ ${s}` : s}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* 4. Contenido Scrolleable de la Tabla Visual Editorial */}
            <ScrollView style={styles.guideBodyScroll} contentContainerStyle={styles.guideBodyContainer}>
                {/* Banner de Aviso Obligatorio de Alta Costura */}
                <View style={styles.guideNoticeCard}>
                    <Text style={styles.guideNoticeTitle}>
                        ⚖️ {STANDARD_REFERENCE_NOTICE}
                    </Text>
                    <Text style={styles.guideNoticeDesc}>
                        Esta guía provee proporciones normalizadas para inicializar el trazado CAD. La diseñadora puede y debe verificar y ajustar libremente cualquier valor según la fisionomía real de la clienta.
                    </Text>
                </View>

                {/* Sub-bloque Inteligente: Talla Sugerida si el Sujeto tiene medidas */}
                {evaluationResult.hasData && evaluationResult.suggestedSize && (
                    <View style={styles.advisorSuggestionBox}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.advisorSuggestionTitle}>
                                🎯 TALLA RECOMENDADA POR PROPORCIONES: <Text style={{ color: colors.champagneGold, fontWeight: '700' }}>Talla {evaluationResult.suggestedSize}</Text>
                            </Text>
                            <Text style={styles.advisorSuggestionSubtitle}>
                                Calculada a partir de las medidas anatómicas ingresadas para este sujeto.
                            </Text>
                        </View>
                        {selectedSize !== evaluationResult.suggestedSize && (
                            <TouchableOpacity
                                style={styles.advisorSelectSuggestedBtn}
                                onPress={() => setSelectedSize(evaluationResult.suggestedSize!)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.advisorSelectSuggestedText}>Seleccionar ★ {evaluationResult.suggestedSize}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Ficha Editorial de la Talla Seleccionada */}
                {activeSizeEntry && (
                    <View style={styles.guideVisualTable}>
                        {/* Cabecera de la ficha */}
                        <View style={styles.guideSheetHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <View style={styles.guideCategoryBadge}>
                                    <Image
                                        source={STANDARD_CATEGORY_IMAGES[selectedCategory]}
                                        style={styles.guideMiniAvatar}
                                        resizeMode="cover"
                                    />
                                    <Text style={styles.guideCategoryBadgeText}>
                                        {activeCategoryDef.label}
                                    </Text>
                                </View>
                                <Text style={styles.guideSheetSize}>
                                    Talla {activeSizeEntry.size}
                                </Text>
                                {activeSizeEntry.equivalency ? (
                                    <Text style={styles.guideSheetEquiv}>
                                        · {activeSizeEntry.equivalency}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={styles.guideUnitBadge}>
                                <Text style={styles.guideUnitBadgeText}>Unidad: CM</Text>
                            </View>
                        </View>

                        {/* 1. Estatura de Referencia */}
                        {estaturaVal !== undefined && (
                            <View style={styles.guideHeightCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.guideCardSuper}>DIMENSIÓN VERTICAL</Text>
                                    <Text style={styles.guideCardTitle}>Estatura de Referencia</Text>
                                    <Text style={styles.guideCardDesc}>
                                        Altura descalzo. Eje del canon anatómico y balance de holguras.
                                    </Text>
                                </View>
                                <View style={styles.guideHeightValueBlock}>
                                    <Text style={styles.guideHeightValue}>{estaturaVal}</Text>
                                    <Text style={styles.guideHeightUnit}>cm</Text>
                                </View>
                            </View>
                        )}

                        {/* 2. Contornos Corporales Principales */}
                        <View style={styles.guideBlockSection}>
                            <View style={styles.guideBlockTitleRow}>
                                <Text style={styles.guideBlockTitle}>Contornos Corporales Principales</Text>
                                <Text style={styles.guideBlockSubtitle}>Perímetros de ajuste</Text>
                            </View>
                            <View style={styles.guideMetricsGrid}>
                                {girthFields.map((f) => {
                                    const val = activeSizeEntry.measurementsCm[f.code];
                                    if (val === undefined) return null;
                                    const subjectVal = subjectValuesCm[f.code];
                                    return (
                                        <View key={f.code} style={styles.guideMetricCard}>
                                            <Text style={styles.guideMetricLabel}>{f.label}</Text>
                                            <View style={styles.guideMetricValRow}>
                                                <Text style={styles.guideMetricValNumber}>{val}</Text>
                                                <Text style={styles.guideMetricValUnit}>cm</Text>
                                                {subjectVal !== undefined && (
                                                    <Text style={styles.guideSubjectValCompare}>
                                                        (Sujeto: {subjectVal} cm)
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* 3. Medidas Longitudinales y de Estructura */}
                        <View style={styles.guideBlockSection}>
                            <View style={styles.guideBlockTitleRow}>
                                <Text style={styles.guideBlockTitle}>Medidas Longitudinales y de Estructura</Text>
                                <Text style={styles.guideBlockSubtitle}>Talles, hombros y extremidades</Text>
                            </View>
                            <View style={styles.guideMetricsGrid}>
                                {lengthFields.map((f) => {
                                    const val = activeSizeEntry.measurementsCm[f.code];
                                    if (val === undefined) return null;
                                    const subjectVal = subjectValuesCm[f.code];
                                    return (
                                        <View key={f.code} style={styles.guideMetricCard}>
                                            <Text style={styles.guideMetricLabel}>{f.label}</Text>
                                            <View style={styles.guideMetricValRow}>
                                                <Text style={styles.guideMetricValNumber}>{val}</Text>
                                                <Text style={styles.guideMetricValUnit}>cm</Text>
                                                {subjectVal !== undefined && (
                                                    <Text style={styles.guideSubjectValCompare}>
                                                        (Sujeto: {subjectVal} cm)
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* 4. Fuentes y Aviso Comercial */}
                        <View style={styles.guideSourceBox}>
                            <Text style={styles.guideSourceDisclaimer}>
                                “{STANDARD_SOURCE_DISCLAIMER}”
                            </Text>
                            <Text style={styles.guideSourceRef}>
                                Base antropométrica: {STANDARD_SOURCE_REFERENCE}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* 5. Footer de Acciones de Alta Costura */}
            <View style={styles.guideFooter}>
                {onClose && (
                    <TouchableOpacity style={styles.guideCancelBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.guideCancelBtnText}>Volver sin aplicar</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.guideApplyBtn}
                    onPress={handleApply}
                    activeOpacity={0.85}
                >
                    <Text style={styles.guideApplyBtnText}>✓ USAR COMO MEDIDAS BASE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    guideHeader: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: colors.surfaceSubtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    guideSuperTitle: {
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 2,
    },
    guideTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: typography.serif,
    },
    guideSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    guideCloseBtn: {
        padding: 8,
    },
    guideCloseBtnText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    guideCategoryTabs: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EADCC9',
        paddingHorizontal: 8,
    },
    guideCategoryTab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    guideCategoryTabActive: {
        borderBottomColor: colors.champagneGold,
        backgroundColor: '#FAF6F0',
    },
    guideAvatarWrapper: {
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#E2D7C8',
        backgroundColor: '#171411',
        marginBottom: 4,
    },
    guideAvatarWrapperActive: {
        borderColor: colors.champagneGold,
        borderWidth: 2,
    },
    guideCategoryAvatar: {
        width: '100%',
        height: '100%',
    },
    guideCategoryText: {
        fontFamily: typography.serif,
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideCategoryTextActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    guideCategorySubText: {
        fontFamily: typography.sans,
        fontSize: 8.5,
        color: colors.textMuted,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: 1,
    },
    guideCategorySubTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    guideMiniAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginRight: 6,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    guideSizesBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.surfaceSubtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    guideSizesLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        marginRight: 8,
    },
    guideSizesScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    guideSizePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
    },
    guideSizePillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    guideSizePillSuggested: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF5EE',
    },
    guideSizePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideSizePillTextActive: {
        color: '#FFFFFF',
    },
    guideSizePillTextSuggested: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    guideBodyScroll: {
        flex: 1,
        maxHeight: 460,
    },
    guideBodyContainer: {
        padding: 16,
    },
    guideNoticeCard: {
        backgroundColor: '#FAF5EE',
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    guideNoticeTitle: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    guideNoticeDesc: {
        fontSize: 10.5,
        color: colors.textSecondary,
        lineHeight: 15,
    },
    advisorSuggestionBox: {
        backgroundColor: '#FFFDF9',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    advisorSuggestionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    advisorSuggestionSubtitle: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
    },
    advisorSelectSuggestedBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: colors.champagneGold,
        borderRadius: 4,
    },
    advisorSelectSuggestedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    guideVisualTable: {
        gap: 12,
    },
    guideSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    guideSheetSize: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: typography.serif,
    },
    guideSheetEquiv: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    guideCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideCategoryBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideUnitBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideUnitBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideHeightCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    guideCardSuper: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 1,
        marginBottom: 2,
    },
    guideCardTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    guideCardDesc: {
        fontSize: 10.5,
        color: colors.textMuted,
        lineHeight: 14,
    },
    guideHeightValueBlock: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideHeightValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    guideHeightUnit: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideBlockSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
    },
    guideBlockTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    guideBlockTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    guideBlockSubtitle: {
        fontSize: 10,
        color: colors.textMuted,
    },
    guideMetricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    guideMetricCard: {
        width: '48%',
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 8,
        justifyContent: 'space-between',
    },
    guideMetricLabel: {
        fontSize: 10.5,
        color: colors.textSecondary,
        marginBottom: 3,
    },
    guideMetricValRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        flexWrap: 'wrap',
    },
    guideMetricValNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    guideMetricValUnit: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideSubjectValCompare: {
        fontSize: 9.5,
        color: colors.champagneGold,
        fontWeight: '600',
        marginLeft: 4,
    },
    guideSourceBox: {
        padding: 8,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideSourceDisclaimer: {
        fontSize: 10,
        fontStyle: 'italic',
        color: colors.textSecondary,
        marginBottom: 3,
    },
    guideSourceRef: {
        fontSize: 9,
        color: colors.textMuted,
    },
    guideFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.surfaceSubtle,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    guideCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideCancelBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideApplyBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    guideApplyBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
