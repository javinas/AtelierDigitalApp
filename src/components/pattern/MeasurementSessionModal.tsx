// ==============================================================================
// ATELIER DIGITAL — MODAL: TOMA Y REGISTRO DE MEDIDAS (M02.02)
// Archivo: src/components/pattern/MeasurementSessionModal.tsx
// ==============================================================================
// Captura y conserva las medidas corporales de una clienta con instrucciones
// comprensibles en español, validación anatómica de rangos y cambio de unidad.
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MASTER_MEASUREMENT_CATALOG, MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';
import {
    ALL_STANDARD_SIZES,
    buildStandardTraceabilityNote,
    getStandardSizeEntry,
    getPertinentFieldsForCategory,
    STANDARD_CATEGORIES,
    STANDARD_MEASUREMENT_FIELDS,
    STANDARD_REFERENCE_NOTICE,
    STANDARD_SOURCE_DISCLAIMER,
    STANDARD_SOURCE_REFERENCE,
    StandardCategoryKey,
    StandardSizeEntry,
} from '../../engine/pattern/catalog/standardReferenceSizes';
import { cmToMm, inchToMm, mmToCm, mmToInch, roundTo } from '../../engine/pattern/geometry/geometry2d';
import {
    createMeasurementSession,
    createCorrectedMeasurementSession,
    MeasurementInputRecord,
} from '../../services/measurementService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import {
    MeasurementCategory,
    MeasurementCatalogItem,
    MeasurementSession,
    MeasurementSide,
    MeasurementUnit,
    MeasurementValueItem,
    SessionStatus,
} from '../../types/pattern/measurement';
import { MeasuredPerson } from '../../types/personGroup';
import {
    MeasurementTemplate,
    MeasurementUsageMode,
} from '../../types/pattern/measurementTemplate';
import {
    getMeasurementTemplateById,
    MEASUREMENT_TEMPLATES,
} from '../../engine/pattern/catalog/measurementTemplates';
import { MeasurementTemplateSelectorModal } from './MeasurementTemplateSelectorModal';

const STANDARD_CATEGORY_IMAGES: Record<StandardCategoryKey, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

interface MeasurementSessionModalProps {
    visible: boolean;
    client: Client | null;
    person?: MeasuredPerson | null;
    initialValuesMm?: Record<string, number>;
    previousSession?: MeasurementSession | null;
    onClose: () => void;
    onSessionCreated: (session: MeasurementSession) => void;
}

interface StandardTraceabilityState {
    categoryKey: StandardCategoryKey;
    categoryLabel: string;
    size: string;
    usedAtISO: string;
    baseMeasurementsCm: Record<string, number>;
}

export function MeasurementSessionModal({
    visible,
    client,
    person = null,
    initialValuesMm = {},
    previousSession = null,
    onClose,
    onSessionCreated,
}: MeasurementSessionModalProps) {
    const [unit, setUnit] = useState<MeasurementUnit>('cm');
    const [activeTab, setActiveTab] = useState<MeasurementCategory>('torso_body');
    const [values, setValues] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [expandedInfoCode, setExpandedInfoCode] = useState<string | null>(null);
    const [showAsymmetryMap, setShowAsymmetryMap] = useState<Record<string, boolean>>({});

    // Estados para la Guía de Medidas y Tallas Estándar de Referencia
    const [showStandardGuide, setShowStandardGuide] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<StandardCategoryKey>('woman');
    const [selectedSize, setSelectedSize] = useState<string>('M');
    const [standardRefMeta, setStandardRefMeta] = useState<StandardTraceabilityState | null>(null);

    // Estados para la Plantilla Reutilizable de Medidas (Fase 2)
    const [selectedTemplate, setSelectedTemplate] = useState<MeasurementTemplate | null>(() => {
        if (person?.demographic_category === 'girl' || person?.demographic_category === 'boy') {
            return getMeasurementTemplateById('infantil') || MEASUREMENT_TEMPLATES[0];
        }
        if (person?.demographic_category === 'man') {
            return getMeasurementTemplateById('sastreria_masculina') || MEASUREMENT_TEMPLATES[0];
        }
        return getMeasurementTemplateById('alta_costura_completa') || MEASUREMENT_TEMPLATES[0];
    });
    const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);
    const [filterOnlyTemplate, setFilterOnlyTemplate] = useState<boolean>(true);

    // Sincronizar y precargar automáticamente las medidas existentes al abrir el modal para rectificación
    useEffect(() => {
        if (!visible) return;

        const init: Record<string, string> = {};
        const sourceValues: Record<string, number> = {};

        if (previousSession) {
            // Prioridad 1: Valores de la sesión previa
            if (previousSession.values && Object.keys(previousSession.values).length > 0) {
                for (const [code, item] of Object.entries(previousSession.values)) {
                    const numVal = typeof item === 'number' ? item : (item as any)?.value_mm;
                    if (typeof numVal === 'number' && Number.isFinite(numVal) && numVal > 0) {
                        sourceValues[code] = numVal;
                    }
                }
            }
            // Prioridad 2: Medidas activas del estado de taller
            if (initialValuesMm) {
                for (const [code, val] of Object.entries(initialValuesMm)) {
                    if (!sourceValues[code] && typeof val === 'number' && Number.isFinite(val) && val > 0) {
                        sourceValues[code] = val;
                    }
                }
            }

            // Convertir a la unidad actual del modal
            for (const [code, valMm] of Object.entries(sourceValues)) {
                let targetVal = valMm;
                if (unit === 'cm') targetVal = mmToCm(valMm);
                else if (unit === 'in') targetVal = mmToInch(valMm);
                else if (unit === 'mm') targetVal = valMm;

                init[code] = roundTo(targetVal, 1).toString();
            }

            setValues(init);
            setNotes(previousSession.notes ? `Rectificación: ${previousSession.notes}` : '');
            if (Object.keys(sourceValues).length === 0) {
                setErrorMessage('La sesión previa seleccionada no contiene medidas registradas. Puede usar la "Guía de Medidas y Tallas" para autocompletarlas o ingresarlas manualmente.');
            }
        } else {
            // Nueva medición desde cero
            setValues({});
            setNotes('');
            setStandardRefMeta(null);
        }

        if (!previousSession || Object.keys(sourceValues).length > 0) {
            setErrorMessage(null);
        }
    }, [visible, previousSession, initialValuesMm, unit]);

    // Modalidad de uso activa: A (Solo Talla), B (Talla + Ajustes), C (Medidas Manuales)
    const usageMode = useMemo<MeasurementUsageMode>(() => {
        if (!standardRefMeta) {
            return 'manual_direct';
        }
        let hasCustomized = false;
        for (const [code, strVal] of Object.entries(values)) {
            const baseCode = code.replace(/_(left|right)$/, '');
            const baseCm = standardRefMeta.baseMeasurementsCm[baseCode];
            const numVal = parseFloat(strVal);
            if (baseCm !== undefined && !isNaN(numVal) && numVal > 0) {
                let expectedInUnit = baseCm;
                if (unit === 'in') expectedInUnit = roundTo(baseCm / 2.54, 2);
                else if (unit === 'mm') expectedInUnit = baseCm * 10;
                if (Math.abs(numVal - expectedInUnit) > 0.05) {
                    hasCustomized = true;
                    break;
                }
            }
        }
        return hasCustomized ? 'standard_with_adjustments' : 'standard_only';
    }, [standardRefMeta, values, unit]);

    // Filtrar catálogo por pestaña activa y plantilla seleccionada
    const currentMeasurements = useMemo(() => {
        let list = MASTER_MEASUREMENT_CATALOG.filter((m) => m.category === activeTab);
        if (filterOnlyTemplate && selectedTemplate) {
            list = list.filter((m) => selectedTemplate.measurement_codes.includes(m.code));
        }
        return list;
    }, [activeTab, filterOnlyTemplate, selectedTemplate]);

    const handleUnitChange = (newUnit: MeasurementUnit) => {
        if (newUnit === unit) return;
        // Convertir valores ingresados a la nueva unidad preservando claves base y sufijos de lateralidad
        const converted: Record<string, string> = {};
        for (const [code, strVal] of Object.entries(values)) {
            const num = parseFloat(strVal);
            const baseCode = code.replace(/_(left|right)$/, '');
            const cat = MEASUREMENT_MAP[baseCode];
            const allowZero = cat?.scope === 'design_parameter' && cat.min_value_mm <= 0;
            if (!isNaN(num) && (num > 0 || (allowZero && num === 0))) {
                let valMm = num;
                if (unit === 'cm') valMm = cmToMm(num);
                else if (unit === 'in') valMm = inchToMm(num);

                let targetVal = valMm;
                if (newUnit === 'cm') targetVal = mmToCm(valMm);
                else if (newUnit === 'in') targetVal = mmToInch(valMm);

                converted[code] = roundTo(targetVal, 1).toString();
            }
        }
        setValues(converted);
        setUnit(newUnit);
    };

    const handleSelectCategory = (cat: StandardCategoryKey) => {
        setSelectedCategory(cat);
        const catDef = STANDARD_CATEGORIES.find((c) => c.key === cat);
        const available = catDef ? catDef.sizes : [];
        if (!available.includes(selectedSize)) {
            if (cat === 'woman' || cat === 'man') {
                setSelectedSize(available.includes('M') ? 'M' : available[0]);
            } else if (cat === 'girl' || cat === 'boy') {
                setSelectedSize(available.includes('8') ? '8' : available[0]);
            } else if (cat === 'baby') {
                setSelectedSize(available.includes('12M') ? '12M' : available[0]);
            } else {
                setSelectedSize(available[0] || 'M');
            }
        }
    };

    /**
     * Aplica la talla estándar seleccionada a la sesión actual como punto de partida.
     */
    const handleApplyStandardMeasurements = (
        catKey: StandardCategoryKey = selectedCategory,
        sizeKey: string = selectedSize
    ) => {
        const entry = getStandardSizeEntry(catKey, sizeKey);
        if (!entry) return;

        const converted: Record<string, string> = { ...values };
        for (const [code, cmVal] of Object.entries(entry.measurementsCm)) {
            if (unit === 'cm') {
                converted[code] = cmVal.toString();
            } else if (unit === 'in') {
                converted[code] = roundTo(cmVal / 2.54, 2).toString();
            } else {
                converted[code] = (cmVal * 10).toString();
            }
        }

        setValues(converted);
        setStandardRefMeta({
            categoryKey: catKey,
            categoryLabel: entry.categoryLabel,
            size: sizeKey,
            usedAtISO: new Date().toISOString(),
            baseMeasurementsCm: { ...entry.measurementsCm },
        });
        setShowStandardGuide(false);
    };

    // Función de compatibilidad
    const handleLoadSampleMeasurements = () => {
        handleApplyStandardMeasurements('woman', 'M');
    };

    const handleSave = async (targetStatus: SessionStatus = 'completed') => {
        if (!client) {
            setErrorMessage('Debe seleccionar una clienta.');
            return;
        }

        // Convertir strings a números con trazabilidad de origen (direct vs estimated)
        const sessionValues: Record<string, MeasurementInputRecord | number> = {};
        for (const [key, strVal] of Object.entries(values)) {
            const num = parseFloat(strVal);
            const baseCode = key.replace(/_(left|right)$/, '');
            const cat = MEASUREMENT_MAP[baseCode];
            const allowZero = cat?.scope === 'design_parameter' && cat.min_value_mm <= 0;
            if (!isNaN(num) && (num > 0 || (allowZero && num === 0))) {
                if (standardRefMeta) {
                    const baseCm = standardRefMeta.baseMeasurementsCm[baseCode];
                    if (baseCm !== undefined) {
                        let expectedInUnit = baseCm;
                        if (unit === 'in') expectedInUnit = roundTo(baseCm / 2.54, 2);
                        else if (unit === 'mm') expectedInUnit = baseCm * 10;
                        const isModified = Math.abs(num - expectedInUnit) > 0.05;

                        sessionValues[key] = {
                            value: num,
                            source: isModified ? 'direct' : 'estimated',
                            confidence: isModified ? 'confirmed' : 'preliminary',
                            notes: isModified
                                ? 'Ajuste personalizado sobre talla estándar'
                                : `Talla estándar de referencia (${standardRefMeta.categoryKey} ${standardRefMeta.size})`,
                        };
                        continue;
                    }
                }
                sessionValues[key] = {
                    value: num,
                    source: 'direct',
                    confidence: 'confirmed',
                };
            }
        }

        if (Object.keys(sessionValues).length === 0) {
            setErrorMessage('Por favor ingrese al menos las medidas principales.');
            return;
        }

        setSaving(true);
        setErrorMessage(null);

        // Guardar trazabilidad de plantilla y de medidas estándar en las observaciones
        let finalNotes = notes.trim();
        if (selectedTemplate) {
            const usageModeDesc =
                usageMode === 'standard_only'
                    ? 'Solo Talla Estándar'
                    : usageMode === 'standard_with_adjustments'
                    ? 'Talla + Ajustes'
                    : 'Medidas Manuales Directas';
            const templateBlock = `[PLANTILLA DE MEDIDAS: ${selectedTemplate.name} (${selectedTemplate.id})] · Modalidad: ${usageModeDesc}`;
            if (!finalNotes.includes('[PLANTILLA DE MEDIDAS:')) {
                finalNotes = finalNotes ? `${templateBlock}\n${finalNotes}` : templateBlock;
            }
        }

        if (standardRefMeta) {
            const traceBlock = buildStandardTraceabilityNote(
                standardRefMeta.categoryKey,
                standardRefMeta.size,
                standardRefMeta.baseMeasurementsCm,
                standardRefMeta.usedAtISO
            );
            if (!finalNotes.includes('[TRAZABILIDAD DE MEDIDAS ESTÁNDAR]')) {
                finalNotes = finalNotes ? `${finalNotes}\n\n${traceBlock}` : traceBlock;
            }
        }

        try {
            const res = previousSession
                ? await createCorrectedMeasurementSession(previousSession, unit, finalNotes, sessionValues, targetStatus)
                : await createMeasurementSession(client.id, unit, finalNotes, sessionValues, targetStatus, undefined, person?.id || null);

            if (!res.success || !res.session) {
                setErrorMessage(res.error || 'No se pudo guardar la sesión de medidas en la base de datos.');
                setSaving(false);
                return;
            }

            onSessionCreated(res.session);
            onClose();
        } catch (err: any) {
            setErrorMessage(err?.message || 'Error guardando sesión de medidas.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalSuperTitle}>ATELIER DE ALTA COSTURA</Text>
                            <Text style={styles.modalTitle}>
                                {previousSession
                                    ? `Rectificación de Medidas (v${(previousSession.version_number || 1) + 1})`
                                    : 'Toma de Medidas Corporales'}
                            </Text>
                            <Text style={styles.clientSubtitle}>
                                {person ? (
                                    <>
                                        Persona: <Text style={styles.clientName}>{person.full_name}</Text>
                                        <Text style={{ color: colors.champagneGold, fontWeight: '700' }}> ({person.demographic_category.toUpperCase()})</Text>
                                        <Text> · Responsable: {client?.full_name || 'Sin seleccionar'}</Text>
                                    </>
                                ) : (
                                    <>
                                        Clienta: <Text style={styles.clientName}>{client?.full_name || 'Sin seleccionar'}</Text>
                                    </>
                                )}
                                {previousSession && (
                                    <Text style={styles.versionTag}> · Historial v{previousSession.version_number} protegido</Text>
                                )}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Barra de herramientas: Unidades y Guía de Tallas */}
                    <View style={styles.toolbar}>
                        <View style={styles.unitSelector}>
                            <Text style={styles.unitLabel}>Unidad:</Text>
                            {(['cm', 'in', 'mm'] as MeasurementUnit[]).map((u) => (
                                <TouchableOpacity
                                    key={u}
                                    style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                                    onPress={() => handleUnitChange(u)}
                                >
                                    <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                                        {u.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.toolbarRightActions}>
                            {standardRefMeta && (
                                <View style={styles.activeStandardBadge}>
                                    <Text style={styles.activeStandardBadgeText}>
                                        Base: {standardRefMeta.categoryLabel} · Talla {standardRefMeta.size}
                                    </Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.sampleDataBtn}
                                onPress={() => setShowStandardGuide(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.sampleDataText}>📐 Guía de Medidas y Tallas</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Barra Editorial de Plantilla Reutilizable de Medidas (Fase 2) */}
                    <View style={styles.templateBar}>
                        <View style={styles.templateInfoLeft}>
                            <Text style={styles.templateBarLabel}>PLANTILLA ACTIVA:</Text>
                            <View style={styles.templateActivePill}>
                                <Text style={styles.templateIconText}>{selectedTemplate?.icon || '🏷️'}</Text>
                                <Text style={styles.templateNameText}>
                                    {selectedTemplate?.name || 'Catálogo General'}
                                </Text>
                                <Text style={styles.templateCountText}>
                                    ({selectedTemplate ? `${selectedTemplate.measurement_codes.length} cotas` : '47 cotas'})
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.changeTemplateBtn}
                                onPress={() => setShowTemplateSelector(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.changeTemplateBtnText}>Cambiar Plantilla ▾</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.templateInfoRight}>
                            {/* Chip del Modo de Uso */}
                            <View style={[
                                styles.usageModeChip,
                                usageMode === 'standard_only' && styles.usageModeChipStandard,
                                usageMode === 'standard_with_adjustments' && styles.usageModeChipCustom,
                                usageMode === 'manual_direct' && styles.usageModeChipManual,
                            ]}>
                                <Text style={[
                                    styles.usageModeText,
                                    usageMode === 'standard_only' && styles.usageModeTextStandard,
                                    usageMode === 'standard_with_adjustments' && styles.usageModeTextCustom,
                                    usageMode === 'manual_direct' && styles.usageModeTextManual,
                                ]}>
                                    {usageMode === 'standard_only' && 'MODO A · SOLO TALLA ESTÁNDAR'}
                                    {usageMode === 'standard_with_adjustments' && 'MODO B · TALLA + AJUSTES'}
                                    {usageMode === 'manual_direct' && 'MODO C · MEDIDAS MANUALES'}
                                </Text>
                            </View>

                            {/* Toggle para ver solo plantilla o catálogo completo */}
                            <TouchableOpacity
                                style={[styles.filterToggleBtn, !filterOnlyTemplate && styles.filterToggleBtnActive]}
                                onPress={() => setFilterOnlyTemplate(!filterOnlyTemplate)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.filterToggleBtnText}>
                                    {filterOnlyTemplate ? '🔍 Ver Todo (47)' : '✓ Solo Plantilla'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Pestañas de categorías anatómicas */}
                    <View style={styles.tabsContainer}>
                        {[
                            { key: 'torso_body', label: 'Torso y Busto' },
                            { key: 'arms_sleeves', label: 'Brazos y Mangas' },
                            { key: 'legs_pants', label: 'Piernas y Pantalón' },
                            { key: 'garment_design', label: 'Diseño y Ajustes' },
                        ].map((t) => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                                onPress={() => setActiveTab(t.key as MeasurementCategory)}
                            >
                                <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Formulario de campos */}
                    <ScrollView style={styles.fieldsScroll} contentContainerStyle={styles.fieldsContainer}>
                        {errorMessage && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        )}

                        <View style={styles.measurementsGrid}>
                            {currentMeasurements.length === 0 ? (
                                <View style={styles.emptyCategoryInTemplate}>
                                    <Text style={styles.emptyCategoryInTemplateTitle}>
                                        Sin medidas requeridas en esta sección para "{selectedTemplate?.name}"
                                    </Text>
                                    <Text style={styles.emptyCategoryInTemplateDesc}>
                                        Esta plantilla curada contiene {selectedTemplate?.measurement_codes.length} medidas distribuidas en otras áreas anatómicas.
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.emptyCategoryToggleBtn}
                                        onPress={() => setFilterOnlyTemplate(false)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.emptyCategoryToggleBtnText}>
                                            Mostrar Catálogo Completo (47 Medidas)
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                currentMeasurements.map((m: MeasurementCatalogItem) => {
                                const currentVal = values[m.code] || '';
                                const isExpanded = expandedInfoCode === m.code;

                                // Convertir min y max a la unidad activa para guiar a la diseñadora
                                const minConverted =
                                    unit === 'cm'
                                        ? mmToCm(m.min_value_mm)
                                        : unit === 'in'
                                        ? mmToInch(m.min_value_mm)
                                        : m.min_value_mm;
                                const maxConverted =
                                    unit === 'cm'
                                        ? mmToCm(m.max_value_mm)
                                        : unit === 'in'
                                        ? mmToInch(m.max_value_mm)
                                        : m.max_value_mm;

                                const isBilateral = m.laterality === 'bilateral';
                                const hasBilateral = Boolean(values[`${m.code}_left`] || values[`${m.code}_right`]);
                                const isAsymmetricMode = hasBilateral || Boolean(showAsymmetryMap[m.code]);

                                // Detección de referencia estándar vs personalizada
                                const baseCm = standardRefMeta?.baseMeasurementsCm[m.code];
                                let isStandardRef = false;
                                let isCustomized = false;
                                let standardBaseFormatted = '';

                                if (baseCm !== undefined && standardRefMeta) {
                                    let expectedInUnit = baseCm;
                                    if (unit === 'in') expectedInUnit = roundTo(baseCm / 2.54, 2);
                                    else if (unit === 'mm') expectedInUnit = baseCm * 10;
                                    standardBaseFormatted = `${expectedInUnit} ${unit}`;

                                    const numCurrent = parseFloat(currentVal);
                                    if (!isNaN(numCurrent) && numCurrent > 0) {
                                        if (Math.abs(numCurrent - expectedInUnit) <= 0.05) {
                                            isStandardRef = true;
                                        } else {
                                            isCustomized = true;
                                        }
                                    }
                                }

                                return (
                                    <View key={m.code} style={styles.measurementCard}>
                                        <View style={styles.measurementHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                                <Text style={styles.measurementName}>{m.name}</Text>
                                                {isBilateral && (
                                                    <View style={styles.bilateralBadge}>
                                                        <Text style={styles.bilateralBadgeText}>Bilateral</Text>
                                                    </View>
                                                )}
                                                {isStandardRef && (
                                                    <View style={styles.refStandardBadge}>
                                                        <Text style={styles.refStandardBadgeText}>
                                                            🏷️ Referencia estándar ({standardRefMeta?.size})
                                                        </Text>
                                                    </View>
                                                )}
                                                {isCustomized && (
                                                    <View style={styles.refCustomizedBadge}>
                                                        <Text style={styles.refCustomizedBadgeText}>
                                                            ✏️ Personalizado (Base: {standardBaseFormatted})
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                {isBilateral && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            if (isAsymmetricMode) {
                                                                setShowAsymmetryMap((prev) => ({ ...prev, [m.code]: false }));
                                                                const next = { ...values };
                                                                if (next[`${m.code}_left`] && !next[m.code]) {
                                                                    next[m.code] = next[`${m.code}_left`];
                                                                }
                                                                delete next[`${m.code}_left`];
                                                                delete next[`${m.code}_right`];
                                                                setValues(next);
                                                            } else {
                                                                setShowAsymmetryMap((prev) => ({ ...prev, [m.code]: true }));
                                                                const next = { ...values };
                                                                if (next[m.code]) {
                                                                    next[`${m.code}_left`] = next[m.code];
                                                                    delete next[m.code];
                                                                }
                                                                setValues(next);
                                                            }
                                                        }}
                                                        style={styles.asymmetryToggleBtn}
                                                    >
                                                        <Text style={styles.asymmetryToggleText}>
                                                            {isAsymmetricMode ? '↩ Simétrica' : '⚖ Asimetría'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        setExpandedInfoCode(isExpanded ? null : m.code)
                                                    }
                                                    style={styles.infoIconBtn}
                                                >
                                                    <Text style={styles.infoIconText}>
                                                        {isExpanded ? '▲ Cerrar' : 'ℹ Instrucciones'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* Input simétrico o bilateral según modo */}
                                        {isAsymmetricMode ? (
                                            <View style={styles.bilateralRow}>
                                                <View style={styles.bilateralCol}>
                                                    <Text style={styles.sideLabel}>Lado Izquierdo (L):</Text>
                                                    <View style={styles.inputRow}>
                                                        <TextInput
                                                            style={styles.inputField}
                                                            keyboardType="decimal-pad"
                                                            placeholder={`Izq (${roundTo(minConverted)}-${roundTo(maxConverted)})`}
                                                            placeholderTextColor={colors.textMuted}
                                                            value={values[`${m.code}_left`] || ''}
                                                            onChangeText={(txt) =>
                                                                setValues({ ...values, [`${m.code}_left`]: txt })
                                                            }
                                                        />
                                                        <View style={styles.inputUnitTag}>
                                                            <Text style={styles.inputUnitText}>{unit}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={styles.bilateralCol}>
                                                    <Text style={styles.sideLabel}>Lado Derecho (R):</Text>
                                                    <View style={styles.inputRow}>
                                                        <TextInput
                                                            style={styles.inputField}
                                                            keyboardType="decimal-pad"
                                                            placeholder={`Der (${roundTo(minConverted)}-${roundTo(maxConverted)})`}
                                                            placeholderTextColor={colors.textMuted}
                                                            value={values[`${m.code}_right`] || ''}
                                                            onChangeText={(txt) =>
                                                                setValues({ ...values, [`${m.code}_right`]: txt })
                                                            }
                                                        />
                                                        <View style={styles.inputUnitTag}>
                                                            <Text style={styles.inputUnitText}>{unit}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={styles.inputRow}>
                                                <TextInput
                                                    style={styles.inputField}
                                                    keyboardType="decimal-pad"
                                                    placeholder={`Rango: ${roundTo(minConverted)} - ${roundTo(maxConverted)}`}
                                                    placeholderTextColor={colors.textMuted}
                                                    value={currentVal}
                                                    onChangeText={(txt) =>
                                                        setValues({ ...values, [m.code]: txt })
                                                    }
                                                />
                                                <View style={styles.inputUnitTag}>
                                                    <Text style={styles.inputUnitText}>{unit}</Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Instrucciones anatómicas expandibles */}
                                        {isExpanded && (
                                            <View style={styles.instructionsBox}>
                                                <Text style={styles.instructionsText}>
                                                    <Text style={styles.boldText}>Cómo medir: </Text>
                                                    {m.instructions}
                                                </Text>
                                                <Text style={styles.landmarksText}>
                                                    <Text style={styles.boldText}>Referencias: </Text>
                                                    {m.anatomical_landmarks}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            }))}
                        </View>

                        {/* Observaciones técnicas */}
                        <View style={styles.notesSection}>
                            <Text style={styles.notesLabel}>Observaciones de la Sesión / Postura:</Text>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="Notas confidenciales sobre asimetrías, postura natural, preferencias..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={2}
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </ScrollView>

                    {/* Footer con botones de acción */}
                    <View style={styles.modalFooterWrapper}>
                        <View style={styles.footerNoticeBox}>
                            <Text style={styles.footerNoticeText}>
                                🛡️ <Text style={styles.boldText}>Inmutabilidad de alta costura:</Text> Una sesión finalizada queda protegida contra alteraciones o borrado accidental. Rectificaciones futuras crearán una nueva versión de sesión.
                            </Text>
                        </View>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.draftBtn}
                                onPress={() => handleSave('draft')}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.draftBtnText}>Guardar Borrador</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={() => handleSave('completed')}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Finalizar y Proteger Sesión</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* MODAL / SUB-PANEL EDITORIAL: GUÍA DE MEDIDAS Y TALLAS DE REFERENCIA */}
                    {showStandardGuide && (
                        <View style={styles.guideOverlay}>
                            {/* Header de la Guía */}
                            <View style={styles.guideHeader}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.guideSuperTitle}>ATELIER DIGITAL · MÓDULO 02</Text>
                                    <Text style={styles.guideTitle}>Guía de Medidas y Tallas de Referencia</Text>
                                    <Text style={styles.guideSubtitle}>
                                        Punto de partida antropométrico para inicializar una nueva sesión de medidas
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowStandardGuide(false)}
                                    style={styles.guideCloseBtn}
                                >
                                    <Text style={styles.guideCloseBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Categorías Principales: Mujer, Hombre, Niña, Niño, Bebé con Maniquíes Reales de Alta Costura */}
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
                                                {cat.key === 'woman' ? 'Damas' : cat.key === 'man' ? 'Caballeros' : cat.key === 'girl' ? 'Niñas' : cat.key === 'boy' ? 'Niños' : 'Bebés'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Selector Horizontal de Tallas */}
                            <View style={styles.guideSizesBar}>
                                <Text style={styles.guideSizesLabel}>Tallas:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guideSizesScroll}>
                                    {(STANDARD_CATEGORIES.find((c) => c.key === selectedCategory)?.sizes || []).map((s) => {
                                        const isSizeActive = selectedSize === s;
                                        return (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.guideSizePill, isSizeActive && styles.guideSizePillActive]}
                                                onPress={() => setSelectedSize(s)}
                                            >
                                                <Text style={[styles.guideSizePillText, isSizeActive && styles.guideSizePillTextActive]}>
                                                    {s}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Contenido scrolleable de la Tabla Visual Editorial */}
                            <ScrollView style={styles.guideBodyScroll} contentContainerStyle={styles.guideBodyContainer}>
                                {/* Banner Obligatorio de Indicación */}
                                <View style={styles.guideNoticeCard}>
                                    <Text style={styles.guideNoticeTitle}>
                                        ⚖️ MEDIDA ESTÁNDAR DE REFERENCIA — NO SUSTITUYE LA MEDICIÓN REAL
                                    </Text>
                                    <Text style={styles.guideNoticeDesc}>
                                        Esta guía provee proporciones normalizadas para inicializar el trazado CAD. La diseñadora puede y debe verificar y ajustar libremente cualquier valor según la fisionomía real de la clienta.
                                    </Text>
                                </View>

                                {(() => {
                                    const activeCategoryDef = STANDARD_CATEGORIES.find((c) => c.key === selectedCategory);
                                    const activeSizeEntry = getStandardSizeEntry(selectedCategory, selectedSize);
                                    const pertinentFields = getPertinentFieldsForCategory(selectedCategory);
                                    const girthFields = pertinentFields.filter((f) => f.section === 'girth');
                                    const lengthFields = pertinentFields.filter((f) => f.section === 'length');
                                    const estaturaVal = activeSizeEntry?.measurementsCm['estatura'];

                                    const formatGuideVal = (cm: number) => {
                                        if (unit === 'cm') return cm.toString();
                                        if (unit === 'in') return roundTo(cm / 2.54, 2).toString();
                                        return (cm * 10).toString();
                                    };

                                    if (!activeSizeEntry) return null;

                                    return (
                                        <View style={styles.guideVisualTable}>
                                            {/* Cabecera de la ficha de talla */}
                                            <View style={styles.guideSheetHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <View style={styles.guideCategoryBadge}>
                                                        <Image
                                                            source={STANDARD_CATEGORY_IMAGES[selectedCategory]}
                                                            style={styles.guideMiniAvatar}
                                                            resizeMode="cover"
                                                        />
                                                        <Text style={styles.guideCategoryBadgeText}>
                                                            {activeCategoryDef?.label}
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
                                                    <Text style={styles.guideUnitBadgeText}>Unidad: {unit.toUpperCase()}</Text>
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
                                                        <Text style={styles.guideHeightValue}>
                                                            {formatGuideVal(estaturaVal)}
                                                        </Text>
                                                        <Text style={styles.guideHeightUnit}>{unit}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* 2. Contornos */}
                                            <View style={styles.guideBlockSection}>
                                                <View style={styles.guideBlockTitleRow}>
                                                    <Text style={styles.guideBlockTitle}>Contornos Corporales Principales</Text>
                                                    <Text style={styles.guideBlockSubtitle}>Perímetros de ajuste</Text>
                                                </View>
                                                <View style={styles.guideMetricsGrid}>
                                                    {girthFields.map((f) => {
                                                        const val = activeSizeEntry.measurementsCm[f.code];
                                                        if (val === undefined) return null;
                                                        return (
                                                            <View key={f.code} style={styles.guideMetricCard}>
                                                                <Text style={styles.guideMetricLabel}>{f.label}</Text>
                                                                <View style={styles.guideMetricValRow}>
                                                                    <Text style={styles.guideMetricValNumber}>
                                                                        {formatGuideVal(val)}
                                                                    </Text>
                                                                    <Text style={styles.guideMetricValUnit}>{unit}</Text>
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {/* 3. Medidas Longitudinales */}
                                            <View style={styles.guideBlockSection}>
                                                <View style={styles.guideBlockTitleRow}>
                                                    <Text style={styles.guideBlockTitle}>Medidas Longitudinales y de Estructura</Text>
                                                    <Text style={styles.guideBlockSubtitle}>Talles, hombros y extremidades</Text>
                                                </View>
                                                <View style={styles.guideMetricsGrid}>
                                                    {lengthFields.map((f) => {
                                                        const val = activeSizeEntry.measurementsCm[f.code];
                                                        if (val === undefined) return null;
                                                        return (
                                                            <View key={f.code} style={styles.guideMetricCard}>
                                                                <Text style={styles.guideMetricLabel}>{f.label}</Text>
                                                                <View style={styles.guideMetricValRow}>
                                                                    <Text style={styles.guideMetricValNumber}>
                                                                        {formatGuideVal(val)}
                                                                    </Text>
                                                                    <Text style={styles.guideMetricValUnit}>{unit}</Text>
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {/* Fuentes y Aviso Comercial */}
                                            <View style={styles.guideSourceBox}>
                                                <Text style={styles.guideSourceDisclaimer}>
                                                    “{STANDARD_SOURCE_DISCLAIMER}”
                                                </Text>
                                                <Text style={styles.guideSourceRef}>
                                                    Base antropométrica: {STANDARD_SOURCE_REFERENCE}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })()}
                            </ScrollView>

                            {/* Footer de la Guía con la Acción Principal */}
                            <View style={styles.guideFooter}>
                                <TouchableOpacity
                                    style={styles.guideCancelBtn}
                                    onPress={() => setShowStandardGuide(false)}
                                >
                                    <Text style={styles.guideCancelBtnText}>Volver sin aplicar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.guideApplyBtn}
                                    onPress={() => handleApplyStandardMeasurements(selectedCategory, selectedSize)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.guideApplyBtnText}>✓ USAR COMO MEDIDAS BASE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Modal Selector de Plantillas de Medidas (Fase 2) */}
                    {showTemplateSelector && (
                        <MeasurementTemplateSelectorModal
                            visible={showTemplateSelector}
                            activeTemplateId={selectedTemplate?.id}
                            personDemographic={person?.demographic_category}
                            onSelectTemplate={(tmpl) => {
                                setSelectedTemplate(tmpl);
                                setFilterOnlyTemplate(true);
                                setShowTemplateSelector(false);
                            }}
                            onClose={() => setShowTemplateSelector(false)}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContainer: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        width: '100%',
        maxWidth: 820,
        maxHeight: '92%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
    },
    modalHeader: {
        padding: 20,
        backgroundColor: colors.surfaceSubtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    modalSuperTitle: {
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 2,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: typography.serif,
    },
    clientSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },
    clientName: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    closeButton: {
        padding: 6,
    },
    closeButtonText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        backgroundColor: '#FFFFFF',
    },
    unitSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    unitLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    unitBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
    },
    unitBtnActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    unitBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    unitBtnTextActive: {
        color: '#FFFFFF',
    },
    sampleDataBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 4,
        backgroundColor: '#FAF5EE',
        borderWidth: 1,
        borderColor: colors.accent,
    },
    sampleDataText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.accent,
    },
    templateBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        backgroundColor: '#FAF5EE',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        flexWrap: 'wrap',
        gap: 8,
    },
    templateInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    templateBarLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
    },
    templateActivePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        gap: 5,
    },
    templateIconText: {
        fontSize: 14,
    },
    templateNameText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    templateCountText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    changeTemplateBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        backgroundColor: colors.atelierBlack,
    },
    changeTemplateBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    templateInfoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    usageModeChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        borderWidth: 1,
    },
    usageModeChipStandard: {
        backgroundColor: '#EFF6F0',
        borderColor: '#C6E3CD',
    },
    usageModeChipCustom: {
        backgroundColor: '#FAF3E7',
        borderColor: colors.champagneGold,
    },
    usageModeChipManual: {
        backgroundColor: '#F3EFE9',
        borderColor: colors.sand,
    },
    usageModeText: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    usageModeTextStandard: {
        color: '#2E693B',
    },
    usageModeTextCustom: {
        color: '#7D5A1E',
    },
    usageModeTextManual: {
        color: colors.atelierBlack,
    },
    filterToggleBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    filterToggleBtnActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    filterToggleBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptyCategoryInTemplate: {
        width: '100%',
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#FAF6F0',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        marginTop: 10,
    },
    emptyCategoryInTemplateTitle: {
        fontFamily: typography.serif,
        fontSize: 15,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyCategoryInTemplateDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 420,
        lineHeight: 18,
        marginBottom: 14,
    },
    emptyCategoryToggleBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    emptyCategoryToggleBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceSubtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnActive: {
        borderBottomColor: colors.accent,
        backgroundColor: '#FFFFFF',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    fieldsScroll: {
        flex: 1,
    },
    fieldsContainer: {
        padding: 20,
    },
    errorBox: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        marginBottom: 16,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
    },
    measurementsGrid: {
        gap: 12,
    },
    measurementCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
    },
    measurementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    measurementName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    infoIconBtn: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    infoIconText: {
        fontSize: 10,
        color: colors.accent,
        fontWeight: '600',
    },
    bilateralBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bilateralBadgeText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    asymmetryToggleBtn: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    asymmetryToggleText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.accent,
    },
    bilateralRow: {
        flexDirection: 'row',
        gap: 8,
    },
    bilateralCol: {
        flex: 1,
    },
    sideLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputField: {
        flex: 1,
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 10,
        fontSize: 14,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceSubtle,
    },
    inputUnitTag: {
        width: 44,
        height: 38,
        backgroundColor: colors.border,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputUnitText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    instructionsBox: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#FBF9F5',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
    },
    instructionsText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
        marginBottom: 4,
    },
    landmarksText: {
        fontSize: 11,
        color: colors.textMuted,
        lineHeight: 15,
    },
    boldText: {
        fontWeight: '600',
        color: colors.textPrimary,
    },
    notesSection: {
        marginTop: 18,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        padding: 10,
        fontSize: 12,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceSubtle,
        minHeight: 50,
    },
    versionTag: {
        fontSize: 12,
        color: colors.accent,
        fontWeight: '500',
    },
    modalFooterWrapper: {
        backgroundColor: colors.surfaceSubtle,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerNoticeBox: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
    },
    footerNoticeText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 8,
    },
    cancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelBtnText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    draftBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: '#FFFFFF',
    },
    draftBtnText: {
        fontSize: 13,
        color: colors.accent,
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 4,
    },
    saveBtnText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    toolbarRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    activeStandardBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#FAF5EE',
        borderWidth: 1,
        borderColor: colors.accent,
    },
    activeStandardBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.accent,
    },
    refStandardBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        backgroundColor: '#FAF5EE',
        borderWidth: 1,
        borderColor: colors.accent,
    },
    refStandardBadgeText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.accent,
    },
    refCustomizedBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        backgroundColor: '#EBF3FA',
        borderWidth: 1,
        borderColor: '#7BB0DB',
    },
    refCustomizedBadgeText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#2C5E8A',
    },

    // ESTILOS DE LA GUÍA DE MEDIDAS Y TALLAS DE REFERENCIA (ALTA COSTURA)
    guideOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.surface,
        zIndex: 99,
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
        paddingVertical: 12,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#E2D7C8',
        backgroundColor: '#171411',
        marginBottom: 5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 2,
    },
    guideAvatarWrapperActive: {
        borderColor: colors.champagneGold,
        borderWidth: 2,
        shadowOpacity: 0.25,
    },
    guideCategoryAvatar: {
        width: '100%',
        height: '100%',
    },
    guideCategoryText: {
        fontFamily: typography.serif,
        fontSize: 12.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideCategoryTextActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    guideCategorySubText: {
        fontFamily: typography.sans,
        fontSize: 9,
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
    guideSizePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideSizePillTextActive: {
        color: '#FFFFFF',
    },
    guideBodyScroll: {
        flex: 1,
    },
    guideBodyContainer: {
        padding: 16,
    },
    guideNoticeCard: {
        backgroundColor: '#FAF5EE',
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 6,
        padding: 12,
        marginBottom: 14,
    },
    guideNoticeTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    guideNoticeDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    guideVisualTable: {
        gap: 14,
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
        padding: 12,
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
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    guideCardDesc: {
        fontSize: 11,
        color: colors.textMuted,
        lineHeight: 14,
    },
    guideHeightValueBlock: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideHeightValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    guideHeightUnit: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideBlockSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
    },
    guideBlockTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    guideBlockTitle: {
        fontSize: 13,
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
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    guideMetricValRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    guideMetricValNumber: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    guideMetricValUnit: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    guideSourceBox: {
        padding: 10,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    guideSourceDisclaimer: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    guideSourceRef: {
        fontSize: 10,
        color: colors.textMuted,
    },
    guideFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surfaceSubtle,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    guideCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
    },
    guideCancelBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    guideApplyBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 4,
    },
    guideApplyBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D4AF37',
    },
});
