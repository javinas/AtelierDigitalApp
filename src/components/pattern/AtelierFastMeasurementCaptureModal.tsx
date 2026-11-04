// ==============================================================================
// ATELIER DIGITAL — MODAL: CAPTURA RÁPIDA DE MEDIDAS, MANIQUÍ Y PUENTE CAD (M02 · FASE C)
// Archivo: src/components/pattern/AtelierFastMeasurementCaptureModal.tsx
// ==============================================================================
// Provee la experiencia unificada, ágil y táctil de captura de medidas para el
// atelier de alta costura:
// Sujeto Anatómico → Maniquí Interactivo → Teclado Numérico → Sugerencias de Talla → CAD
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import { MeasuredPerson } from '../../types/personGroup';
import {
    MeasurementCategory,
    MeasurementCatalogItem,
    MeasurementSession,
    MeasurementUnit,
    SessionStatus,
} from '../../types/pattern/measurement';
import {
    createMeasurementSession,
    updateDraftMeasurementSession,
} from '../../services/measurementService';
import {
    MASTER_MEASUREMENT_CATALOG,
    MEASUREMENT_MAP,
} from '../../engine/pattern/catalog/masterCatalog';
import {
    MEASURE_CATEGORIES_DEFINITION,
    MeasureCategoryDefinition,
} from '../../engine/pattern/catalog/measurementCategories';
import {
    AnatomicalPerspective,
    BodyDemographicType,
    DORSAL_EXCLUSIVE_COTA_CODES,
    FRONTAL_EXCLUSIVE_COTA_CODES,
} from '../../engine/pattern/catalog/anatomicalMapping';
import { AtelierNumericKeypad } from './AtelierNumericKeypad';
import { AtelierMannequinDisplay } from './AtelierMannequinDisplay';
import { AtelierSizeAdvisor } from './AtelierSizeAdvisor';

export interface AtelierFastMeasurementCaptureModalProps {
    visible: boolean;
    client: Client;
    person: MeasuredPerson | null; // null si es la titular
    existingDraftSession?: MeasurementSession | null; // Sesión previa en borrador a reanudar
    onClose: () => void;
    onSessionSaved: (session: MeasurementSession) => void;
    onProceedToCad?: (session: MeasurementSession) => void;
}

export const AtelierFastMeasurementCaptureModal: React.FC<AtelierFastMeasurementCaptureModalProps> = ({
    visible,
    client,
    person,
    existingDraftSession = null,
    onClose,
    onSessionSaved,
    onProceedToCad,
}) => {
    // Categoría anatómica activa en el formulario
    const [activeCategory, setActiveCategory] = useState<string>('bust_torso');
    // Código de medida activo en edición
    const [selectedMeasureCode, setSelectedMeasureCode] = useState<string>('contorno_busto');
    // Perspectiva activa del maniquí (frontal / posterior)
    const [perspective, setPerspective] = useState<AnatomicalPerspective>('front');
    // Zona anatómica resaltada
    const [activeZone, setActiveZone] = useState<string | null>(null);

    // Mapa de valores capturados en mm: { [codigo]: value_mm }
    const [measurementsMm, setMeasurementsMm] = useState<Record<string, number>>({});
    // Observaciones de la sesión
    const [notes, setNotes] = useState<string>('');
    // Modal de asesor de tallas
    const [showSizeAdvisor, setShowSizeAdvisor] = useState<boolean>(false);

    // Estados de guardado y feedback
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Arquetipo demográfico
    const demographic: BodyDemographicType = useMemo(() => {
        if (person?.demographic_category) {
            const cat = person.demographic_category;
            if (cat === 'man') return 'man';
            if (cat === 'girl') return 'girl';
            if (cat === 'boy') return 'boy';
            return 'woman';
        }
        return 'woman'; // Titular por defecto en atelier
    }, [person]);

    // Cargar valores iniciales si se está reanudando un borrador existente
    useEffect(() => {
        if (visible) {
            if (existingDraftSession && existingDraftSession.values) {
                const initialVals: Record<string, number> = {};
                Object.entries(existingDraftSession.values).forEach(([code, item]) => {
                    if (item && item.value_mm > 0) {
                        initialVals[code] = item.value_mm;
                    }
                });
                setMeasurementsMm(initialVals);
                setNotes(existingDraftSession.notes || '');
            } else {
                setMeasurementsMm({});
                setNotes('');
            }
            setActiveCategory('bust_torso');
            setSelectedMeasureCode('contorno_busto');
            setPerspective('front');
            setErrorMessage(null);
        }
    }, [visible, existingDraftSession]);

    // Medidas correspondientes a la categoría activa
    const currentCategoryDef = useMemo(() => {
        return (
            MEASURE_CATEGORIES_DEFINITION.find((c) => c.id === activeCategory) ||
            MEASURE_CATEGORIES_DEFINITION[0]
        );
    }, [activeCategory]);

    const categoryMeasures = useMemo(() => {
        return currentCategoryDef.codes
            .map((code) => MEASUREMENT_MAP[code])
            .filter((item): item is MeasurementCatalogItem => Boolean(item));
    }, [currentCategoryDef]);

    // Medida activa seleccionada
    const activeMeasureItem = useMemo(() => {
        return (
            MEASUREMENT_MAP[selectedMeasureCode] ||
            categoryMeasures[0] ||
            MASTER_MEASUREMENT_CATALOG[0]
        );
    }, [selectedMeasureCode, categoryMeasures]);

    // Auto-conmutar perspectiva según la medida activa
    useEffect(() => {
        if (!selectedMeasureCode) return;
        if (DORSAL_EXCLUSIVE_COTA_CODES.has(selectedMeasureCode) && perspective === 'front') {
            setPerspective('back');
        } else if (FRONTAL_EXCLUSIVE_COTA_CODES.has(selectedMeasureCode) && perspective === 'back') {
            setPerspective('front');
        }
    }, [selectedMeasureCode]);

    // Estadísticas globales de captura
    const progressStats = useMemo(() => {
        const totalCodes = MASTER_MEASUREMENT_CATALOG.length;
        const capturedCodes = Object.values(measurementsMm).filter((v) => v > 0).length;
        const percent = Math.round((capturedCodes / totalCodes) * 100);
        return { totalCodes, capturedCodes, percent };
    }, [measurementsMm]);

    // Manejador de confirmación desde el teclado numérico (en cm -> mm)
    const handleConfirmValue = (valCm: number) => {
        const valMm = Math.round(valCm * 10);
        setMeasurementsMm((prev) => ({
            ...prev,
            [selectedMeasureCode]: valMm,
        }));

        // Auto-avanzar a la siguiente medida pendiente
        handleNextMeasure();
    };

    // Navegación entre medidas
    const activeIndexInCategory = categoryMeasures.findIndex((m) => m.code === selectedMeasureCode);

    const handleNextMeasure = () => {
        if (activeIndexInCategory >= 0 && activeIndexInCategory < categoryMeasures.length - 1) {
            setSelectedMeasureCode(categoryMeasures[activeIndexInCategory + 1].code);
        } else {
            // Pasar a la siguiente categoría
            const catIdx = MEASURE_CATEGORIES_DEFINITION.findIndex((c) => c.id === activeCategory);
            if (catIdx >= 0 && catIdx < MEASURE_CATEGORIES_DEFINITION.length - 1) {
                const nextCat = MEASURE_CATEGORIES_DEFINITION[catIdx + 1];
                setActiveCategory(nextCat.id);
                if (nextCat.codes.length > 0) {
                    setSelectedMeasureCode(nextCat.codes[0]);
                }
            }
        }
    };

    const handlePrevMeasure = () => {
        if (activeIndexInCategory > 0) {
            setSelectedMeasureCode(categoryMeasures[activeIndexInCategory - 1].code);
        } else {
            // Pasar a la categoría anterior
            const catIdx = MEASURE_CATEGORIES_DEFINITION.findIndex((c) => c.id === activeCategory);
            if (catIdx > 0) {
                const prevCat = MEASURE_CATEGORIES_DEFINITION[catIdx - 1];
                setActiveCategory(prevCat.id);
                if (prevCat.codes.length > 0) {
                    setSelectedMeasureCode(prevCat.codes[prevCat.codes.length - 1]);
                }
            }
        }
    };

    // Aplicar valores estándar desde el Asesor de Tallas sin mutar los ya medidos
    const handleApplyBaseValues = (suggestedCm: Record<string, number>, sizeKey: string) => {
        setMeasurementsMm((prev) => {
            const next = { ...prev };
            Object.entries(suggestedCm).forEach(([code, cm]) => {
                // Solo asignar si la medida aún no ha sido capturada directamente
                if (!next[code] || next[code] <= 0) {
                    next[code] = Math.round(cm * 10);
                }
            });
            return next;
        });

        // Registrar trazabilidad en notas
        const sizeNotice = `[Base orientativa Talla ${sizeKey}]`;
        if (!notes.includes(sizeNotice)) {
            setNotes((prev) => (prev ? `${prev}\n${sizeNotice}` : sizeNotice));
        }

        setShowSizeAdvisor(false);
    };

    // Guardado unificado (Borrador, Finalizado, o con pase a CAD)
    const handleSaveSession = async (
        targetStatus: 'draft' | 'completed' | 'verified',
        passToCad: boolean = false
    ) => {
        setSaving(true);
        setErrorMessage(null);

        try {
            // Preparar mapa de valores numéricos en mm
            const rawValues: Record<string, number> = {};
            Object.entries(measurementsMm).forEach(([code, mm]) => {
                if (typeof mm === 'number' && mm > 0) {
                    rawValues[code] = mm;
                }
            });

            if (Object.keys(rawValues).length === 0 && targetStatus !== 'draft') {
                setErrorMessage('Debe ingresar al menos una medida corporal para finalizar la sesión.');
                setSaving(false);
                return;
            }

            let resultSession: MeasurementSession | undefined;

            if (existingDraftSession && existingDraftSession.status === 'draft') {
                // Reanudar y actualizar borrador existente
                const res = await updateDraftMeasurementSession(
                    existingDraftSession.id,
                    'cm',
                    notes,
                    rawValues,
                    targetStatus
                );
                if (!res.success || !res.session) {
                    setErrorMessage(res.error || 'Error al actualizar sesión en borrador.');
                    setSaving(false);
                    return;
                }
                resultSession = res.session;
            } else {
                // Crear nueva sesión (Borrador o Finalizada)
                // H-02: Aislar automáticamente por (client_id, person_id)
                const res = await createMeasurementSession(
                    client.id,
                    'cm',
                    notes,
                    rawValues,
                    targetStatus,
                    undefined, // Cálculo monótono automático
                    person?.id || null
                );
                if (!res.success || !res.session) {
                    setErrorMessage(res.error || 'Error al guardar sesión de medidas.');
                    setSaving(false);
                    return;
                }
                resultSession = res.session;
            }

            onSessionSaved(resultSession);

            if (passToCad && onProceedToCad) {
                onProceedToCad(resultSession);
            } else {
                onClose();
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Error inesperado al guardar la sesión.');
        } finally {
            setSaving(false);
        }
    };

    if (!visible) return null;

    const subjectName = person ? person.full_name : `${client.full_name} (Titular)`;
    const subjectBadge = person ? 'Beneficiario' : 'Titular del Expediente';
    const activeValueCm = measurementsMm[selectedMeasureCode]
        ? measurementsMm[selectedMeasureCode] / 10.0
        : null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalDialog}>
                    {/* ENCABEZADO EDITORIAL DE ALTA COSTURA */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.subjectRow}>
                                <Text style={styles.subjectName}>{subjectName}</Text>
                                <View style={styles.subjectBadge}>
                                    <Text style={styles.subjectBadgeText}>{subjectBadge}</Text>
                                </View>
                                {person?.reference_id && (
                                    <View style={styles.refBadge}>
                                        <Text style={styles.refBadgeText}>{person.reference_id}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.headerSubtitle}>
                                {existingDraftSession
                                    ? `Reanudando Borrador v${existingDraftSession.version_number} · Medidas en centímetros`
                                    : 'Nueva Sesión de Medidas · Captura anatómica en centímetros'}
                            </Text>
                        </View>

                        {/* ACCIONES SUPERIORES */}
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.sizeAdvisorBtn}
                                onPress={() => setShowSizeAdvisor(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.sizeAdvisorBtnText}>✨ Sugerencias de Talla</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* BARRA DE PROGRESO DE MEDIDAS */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${Math.min(100, Math.max(0, progressStats.percent))}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressLabel}>
                            {progressStats.capturedCodes} de {progressStats.totalCodes} medidas capturadas ({progressStats.percent}%)
                        </Text>
                    </View>

                    {/* PESTAÑAS DE CATEGORÍAS ANATÓMICAS */}
                    <View style={styles.categoriesBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {MEASURE_CATEGORIES_DEFINITION.map((cat) => {
                                const isSelected = activeCategory === cat.id;
                                const catMeasuresCount = cat.codes.filter(
                                    (c) => measurementsMm[c] && measurementsMm[c] > 0
                                ).length;

                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
                                        onPress={() => {
                                            setActiveCategory(cat.id);
                                            if (cat.codes.length > 0) {
                                                setSelectedMeasureCode(cat.codes[0]);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.categoryTabIcon}>{cat.icon}</Text>
                                        <Text style={[styles.categoryTabText, isSelected && styles.categoryTabTextActive]}>
                                            {cat.title}
                                        </Text>
                                        {catMeasuresCount > 0 && (
                                            <View style={styles.catCountBadge}>
                                                <Text style={styles.catCountBadgeText}>{catMeasuresCount}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* CUERPO PRINCIPAL DIVIDIDO EN 3 PANELES: MANIQUÍ + LISTA DE MEDIDAS + TECLADO */}
                    <View style={styles.modalBody}>
                        {/* PANEL 1: MANIQUÍ ANATÓMICO DE TALLER (MÓDULO 2 · FLUJO B · PATRONAJE DIRECTO) */}
                        <View style={styles.mannequinPanel}>
                            <AtelierMannequinDisplay
                                measurementsMm={measurementsMm}
                                session={existingDraftSession || null}
                                clientName={subjectName}
                                referenceProfileLabel={person ? `Alumno: ${person.full_name}` : 'Titular'}
                                isMeasurementOnly={true}
                                compact={true}
                                selectedMeasureCode={selectedMeasureCode}
                                onSelectMeasureCode={(code) => setSelectedMeasureCode(code)}
                            />
                        </View>

                        {/* PANEL 2: LISTA DE MEDIDAS DE LA CATEGORÍA */}
                        <View style={styles.measuresListPanel}>
                            <Text style={styles.panelSectionTitle}>
                                {currentCategoryDef.icon} {currentCategoryDef.title} ({categoryMeasures.length})
                            </Text>
                            <ScrollView style={styles.measuresScroll}>
                                {categoryMeasures.map((item) => {
                                    const isSelected = selectedMeasureCode === item.code;
                                    const valMm = measurementsMm[item.code];
                                    const isCaptured = typeof valMm === 'number' && valMm > 0;
                                    const valCmStr = isCaptured ? `${(valMm / 10.0).toFixed(1)} cm` : 'Pendiente';

                                    return (
                                        <TouchableOpacity
                                            key={item.code}
                                            style={[
                                                styles.measureItemRow,
                                                isSelected && styles.measureItemRowSelected,
                                            ]}
                                            onPress={() => setSelectedMeasureCode(item.code)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.measureItemLeft}>
                                                <View
                                                    style={[
                                                        styles.statusDot,
                                                        isCaptured && styles.statusDotCaptured,
                                                        isSelected && styles.statusDotSelected,
                                                    ]}
                                                >
                                                    {isCaptured && <Text style={styles.statusDotCheck}>✓</Text>}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={[
                                                            styles.measureItemName,
                                                            isSelected && styles.measureItemNameSelected,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.name}
                                                    </Text>
                                                    <Text style={styles.measureItemLandmark} numberOfLines={1}>
                                                        {item.anatomical_landmarks}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.measureItemRight}>
                                                <Text
                                                    style={[
                                                        styles.measureItemValue,
                                                        isCaptured && styles.measureItemValueCaptured,
                                                    ]}
                                                >
                                                    {valCmStr}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* CAMPO DE OBSERVACIONES */}
                            <View style={styles.notesContainer}>
                                <Text style={styles.notesLabel}>Observaciones y Notas de Taller:</Text>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder="Notas de ajuste, asimetrías o postura..."
                                    placeholderTextColor="#999"
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>
                        </View>

                        {/* PANEL 3: TECLADO NUMÉRICO OPTIMIZADO */}
                        <View style={styles.keypadPanel}>
                            <AtelierNumericKeypad
                                measureCode={activeMeasureItem.code}
                                measureLabel={activeMeasureItem.name}
                                currentValueCm={activeValueCm}
                                minMm={activeMeasureItem.min_value_mm}
                                maxMm={activeMeasureItem.max_value_mm}
                                onConfirmValue={handleConfirmValue}
                                onPrevMeasure={handlePrevMeasure}
                                onNextMeasure={handleNextMeasure}
                                hasPrev={activeIndexInCategory > 0}
                                hasNext={activeIndexInCategory < categoryMeasures.length - 1}
                            />
                        </View>
                    </View>

                    {/* MENSAJE DE ERROR SI EXISTE */}
                    {errorMessage && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                        </View>
                    )}

                    {/* PIE DE ACCIONES: BORRADOR, FINALIZAR, CAD */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            disabled={saving}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelBtnText}>Cerrar</Text>
                        </TouchableOpacity>

                        <View style={styles.footerMainActions}>
                            <TouchableOpacity
                                style={styles.draftBtn}
                                onPress={() => handleSaveSession('draft')}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.draftBtnText}>💾 Guardar Borrador</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.completeBtn}
                                onPress={() => handleSaveSession('completed')}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.completeBtnText}>✓ Finalizar Sesión</Text>
                                )}
                            </TouchableOpacity>

                            {onProceedToCad && (
                                <TouchableOpacity
                                    style={styles.cadBtn}
                                    onPress={() => handleSaveSession('completed', true)}
                                    disabled={saving}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.cadBtnText}>✂️ Guardar y Pasar a CAD →</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* MODAL SECUNDARIO: ASESOR Y SUGERENCIAS DE TALLA */}
            {showSizeAdvisor && (
                <Modal visible={showSizeAdvisor} animationType="fade" transparent>
                    <View style={styles.advisorModalBackdrop}>
                        <View style={styles.advisorModalDialog}>
                            <AtelierSizeAdvisor
                                demographicCategory={demographic}
                                measurementsMm={measurementsMm}
                                onApplyBaseValues={handleApplyBaseValues}
                                onClose={() => setShowSizeAdvisor(false)}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalDialog: {
        backgroundColor: colors.background,
        borderRadius: 14,
        width: '100%',
        maxWidth: 1240,
        maxHeight: '92%',
        display: 'flex',
        flexDirection: 'column',
        borderWidth: 1,
        borderColor: colors.border,
        ...Platform.select({
            web: {
                boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
            },
            default: {
                elevation: 8,
            },
        }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerLeft: {
        flex: 1,
    },
    subjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    subjectName: {
        fontFamily: typography.serif,
        fontWeight: '700',
        fontSize: 20,
        color: colors.textPrimary,
    },
    subjectBadge: {
        backgroundColor: '#F3EDE2',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DFD5C6',
    },
    subjectBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    refBadge: {
        backgroundColor: '#EAE6DF',
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 4,
    },
    refBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 3,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sizeAdvisorBtn: {
        backgroundColor: '#FFFDF9',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    sizeAdvisorBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent,
    },
    closeBtn: {
        padding: 6,
    },
    closeBtnText: {
        fontSize: 18,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    progressBarContainer: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#FFFDF9',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#EAE4D9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent,
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    categoriesBar: {
        backgroundColor: '#F5EFE6',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginRight: 8,
        backgroundColor: 'transparent',
    },
    categoryTabActive: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    categoryTabIcon: {
        fontSize: 13,
        marginRight: 5,
    },
    categoryTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    categoryTabTextActive: {
        color: colors.accent,
        fontWeight: '700',
    },
    catCountBadge: {
        backgroundColor: colors.accent,
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginLeft: 6,
    },
    catCountBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalBody: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
        gap: 16,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                maxHeight: 640,
            },
        }),
    },
    mannequinPanel: {
        flex: 1.15,
        minWidth: 290,
        justifyContent: 'center',
    },
    measuresListPanel: {
        flex: 1.2,
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        display: 'flex',
        flexDirection: 'column',
    },
    panelSectionTitle: {
        fontFamily: typography.serif,
        fontWeight: '700',
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    measuresScroll: {
        flex: 1,
    },
    measureItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginBottom: 4,
        backgroundColor: '#FFFDF9',
        borderWidth: 1,
        borderColor: colors.border,
    },
    measureItemRowSelected: {
        borderColor: colors.accent,
        backgroundColor: '#FBF7F0',
    },
    measureItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    statusDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#CCC',
        backgroundColor: '#FFF',
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDotCaptured: {
        borderColor: '#10B981',
        backgroundColor: '#059669',
    },
    statusDotSelected: {
        borderColor: colors.accent,
    },
    statusDotCheck: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFF',
        lineHeight: 11,
    },
    measureItemName: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    measureItemNameSelected: {
        color: colors.accent,
        fontWeight: '700',
    },
    measureItemLandmark: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    measureItemRight: {},
    measureItemValue: {
        fontSize: 12,
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    measureItemValueCaptured: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    notesContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    notesLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    notesInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 6,
        fontSize: 11,
        color: colors.textPrimary,
        maxHeight: 50,
    },
    keypadPanel: {
        flex: 1.1,
        minWidth: 280,
    },
    errorBanner: {
        backgroundColor: '#FEE2E2',
        paddingVertical: 6,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    errorText: {
        fontSize: 12,
        color: '#991B1B',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: '#FAF6F0',
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    footerMainActions: {
        flexDirection: 'row',
        gap: 10,
    },
    draftBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D4C6B4',
        backgroundColor: '#FFFFFF',
    },
    draftBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    completeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: colors.accent,
        minWidth: 130,
        alignItems: 'center',
    },
    completeBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cadBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: colors.atelierBlack,
        alignItems: 'center',
    },
    cadBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E6D9C8',
    },
    advisorModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    advisorModalDialog: {
        width: '100%',
        maxWidth: 880,
        maxHeight: '94%',
    },
});

