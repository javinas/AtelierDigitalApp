// ==============================================================================
// ATELIER DIGITAL — MODAL: INTEGRACIÓN PERSONA -> MEDIDA -> CREACIÓN -> CAD
// Archivo: src/components/pattern/PersonCreationCadWizardModal.tsx
// ==============================================================================
// Módulo 02 · Fase 4
// Permite a la diseñadora orquestar el flujo completo:
// PERSONA -> MEDICIÓN -> CREACIÓN -> PRENDA -> PATRÓN CAD -> EJECUCIÓN
//
// Identidad Visual Atelier:
// Marfil #F8F2E9 · Negro #171411 · Champagne #A78350 · Arena #E6D9C8
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
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
import { MeasuredPerson, DEMOGRAPHIC_LABELS } from '../../types/personGroup';
import { MeasurementSession } from '../../types/pattern/measurement';
import { Creation } from '../../types/creation';
import { PatternExecution } from '../../types/pattern/pattern';
import { fetchClientMeasurementSessions } from '../../services/measurementService';
import { createCreation } from '../../services/creationService';
import { savePatternExecution, STANDARD_EASE_PROFILES } from '../../services/patternService';
import { executePatternEngine, PATTERN_ENGINE_VERSION } from '../../engine/pattern/engine';
import { GARMENT_IMAGES } from './GarmentSelectionGrid';
import {
    BABY_EXCLUSION_MESSAGE,
    CAD_GARMENTS_CATALOG,
    CadGarmentEditorialItem,
    CadPreparationDiagnostic,
    INCOMPATIBLE_MORPHOLOGY_MESSAGE,
    prepareCadGenerationDiagnostic,
    resolvePersonMeasurementSession,
    validateDemographicGarmentCompatibility,
} from '../../services/demographicCadValidator';

interface PersonCreationCadWizardModalProps {
    visible: boolean;
    onClose: () => void;
    client: Client;
    person: MeasuredPerson | null;
    initialGarmentKey?: string;
    onCadExecutionGenerated?: (creation: Creation, execution: PatternExecution) => void;
}

export const PersonCreationCadWizardModal: React.FC<PersonCreationCadWizardModalProps> = ({
    visible,
    onClose,
    client,
    person,
    initialGarmentKey = 'shirt',
    onCadExecutionGenerated,
}) => {
    // Estados del Asistente
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
    const [availableSessions, setAvailableSessions] = useState<MeasurementSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedGarmentKey, setSelectedGarmentKey] = useState<string>(initialGarmentKey);

    // Formulario de Creación
    const [creationName, setCreationName] = useState<string>('');
    const [creationOccasion, setCreationOccasion] = useState<string>('');
    const [creationNotes, setCreationNotes] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Resultado de éxito
    const [createdCreation, setCreatedCreation] = useState<Creation | null>(null);
    const [createdExecution, setCreatedExecution] = useState<PatternExecution | null>(null);

    // Cargar sesiones al abrir modal
    useEffect(() => {
        if (visible && person) {
            loadSessions();
            setStep(1);
            setGenerationError(null);
            setCreatedCreation(null);
            setCreatedExecution(null);
        }
    }, [visible, person?.id]);

    const loadSessions = async () => {
        if (!person) return;
        setLoadingSessions(true);
        try {
            const allSessions = await fetchClientMeasurementSessions(client.id, true);
            // Filtrar estrictamente sesiones de esta persona
            const personSessions = allSessions.filter((s) => s.person_id === person.id);
            setAvailableSessions(personSessions);

            // Resolver sesión por prioridad (más reciente válida)
            const resolved = resolvePersonMeasurementSession(person, personSessions, null);
            if (resolved.selectedSession) {
                setSelectedSessionId(resolved.selectedSession.id);
            } else {
                setSelectedSessionId(null);
            }

            // Inicializar nombre sugerido de creación
            const defaultGarment = CAD_GARMENTS_CATALOG.find((g) => g.key === selectedGarmentKey);
            setCreationName(`${defaultGarment?.name || 'Prenda'} — ${person.full_name}`);
        } catch (err) {
            console.warn('[PersonCadWizard] Error cargando sesiones:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    if (!person) return null;

    const isBaby = person.demographic_category === 'baby';

    // Sesión activa seleccionada
    const currentSession = availableSessions.find((s) => s.id === selectedSessionId) || null;

    // Diagnóstico en tiempo real
    const diagnostic: CadPreparationDiagnostic = prepareCadGenerationDiagnostic({
        person,
        garmentKey: selectedGarmentKey,
        session: currentSession,
    });

    const handleSelectGarment = (garment: CadGarmentEditorialItem) => {
        const check = validateDemographicGarmentCompatibility(garment.key, person.demographic_category);
        if (!check.isCompatible) {
            alert(check.errorMessage || INCOMPATIBLE_MORPHOLOGY_MESSAGE);
            return;
        }
        setSelectedGarmentKey(garment.key);
        setCreationName(`${garment.name} — ${person.full_name}`);
    };

    const handleGeneratePattern = async () => {
        if (!currentSession) {
            setGenerationError('Debe seleccionar una sesión de medidas válida para la persona.');
            return;
        }

        if (!diagnostic.isCadReady) {
            setGenerationError(diagnostic.blockReason || 'Las medidas no cumplen los requisitos técnicos.');
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            // 1. Crear la Creación vinculada a client_id, person_id y session_id
            const creationTitle = creationName.trim() || `${diagnostic.prenda.name} — ${person.full_name}`;
            const { data: newCreation, error: creationErr } = await createCreation({
                client_id: client.id,
                person_id: person.id,
                session_id: currentSession.id,
                name: creationTitle,
                occasion: creationOccasion.trim() || 'Encargo de Alta Costura',
                garment_type: diagnostic.prenda.baseGarmentType,
                creation_type: 'bespoke',
                status: 'active',
                notes: `[CAD M02.F4] Generado desde sesión v${currentSession.version_number} (${currentSession.session_date}). ${creationNotes.trim()}`,
            });

            if (creationErr || !newCreation) {
                throw new Error(creationErr || 'No se pudo crear la ficha de Creación en el atelier.');
            }

            // 2. Ejecutar el Motor CAD Paramétrico determinístico
            const easeProfile = STANDARD_EASE_PROFILES.find((e) => e.code === 'regular') || STANDARD_EASE_PROFILES[0];
            const engineResult = executePatternEngine({
                garmentType: diagnostic.prenda.baseGarmentType,
                measurementsMm: diagnostic.resolvedMeasurementsMm,
                ease: easeProfile,
                designParameters: {
                    seam_allowance_default_mm: 10,
                    hem_allowance_mm: 35,
                },
            });

            if (!engineResult.success) {
                const firstErr = engineResult.validationResult.errors[0] || 'Error en el cálculo geométrico del motor CAD.';
                throw new Error(firstErr);
            }

            // 3. Persistir la Ejecución Técnica del Patrón (Linaje: 1 patrón lógico con su primera ejecución)
            const saveRes = await savePatternExecution({
                clientId: client.id,
                sessionId: currentSession.id,
                creationId: newCreation.id,
                garmentType: diagnostic.prenda.baseGarmentType,
                versionLabel: 'v1.0.0',
                engineVersion: PATTERN_ENGINE_VERSION,
                measurementSnapshot: diagnostic.resolvedMeasurementsMm,
                easeProfileSnapshot: easeProfile,
                designParameters: { seam_allowance_default_mm: 10, hem_allowance_mm: 35 },
                geometryResult: engineResult.geometryResult,
                validationResults: engineResult.validationResult,
                notes: `Patrón CAD inicial generado para ${person.full_name} (${DEMOGRAPHIC_LABELS[person.demographic_category]}).`,
            });

            if (!saveRes.success || !saveRes.execution) {
                throw new Error(saveRes.error || 'No se pudo registrar la ejecución del patrón CAD.');
            }

            setCreatedCreation(newCreation);
            setCreatedExecution(saveRes.execution);
            setStep(4);

            if (onCadExecutionGenerated) {
                onCadExecutionGenerated(newCreation, saveRes.execution);
            }
        } catch (err: any) {
            console.error('[PersonCadWizard] Error generando patrón:', err);
            setGenerationError(err.message || 'Error inesperado durante la generación.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    {/* ENCABEZADO EDITORIAL */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.brandTag}>ATELIER DIGITAL · MÓDULO 02 · FASE 4</Text>
                            <Text style={styles.modalTitle}>Integración de Medidas, Creación y CAD</Text>
                            <Text style={styles.modalSubtitle}>
                                Sujeto: <Text style={styles.boldText}>{person.full_name}</Text> ({DEMOGRAPHIC_LABELS[person.demographic_category]}) · Responsable: <Text style={styles.boldText}>{client.full_name}</Text>
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* BLOQUEO ESTRICTO SI ES BEBÉ */}
                    {isBaby ? (
                        <View style={styles.babyAlertContainer}>
                            <Text style={styles.babyAlertIcon}>⚠️</Text>
                            <Text style={styles.babyAlertTitle}>PATRONAJE CAD NO DISPONIBLE PARA BEBÉS</Text>
                            <Text style={styles.babyAlertText}>{BABY_EXCLUSION_MESSAGE}</Text>
                            <TouchableOpacity style={styles.babyCloseBtn} onPress={onClose}>
                                <Text style={styles.babyCloseBtnText}>Regresar a Ficha de Cliente</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* PASOS DE NAVEGACIÓN */}
                            {step < 4 && (
                                <View style={styles.stepsBar}>
                                    <TouchableOpacity
                                        style={[styles.stepItem, step === 1 && styles.stepItemActive]}
                                        onPress={() => setStep(1)}
                                    >
                                        <Text style={[styles.stepNumber, step === 1 && styles.stepNumberActive]}>1</Text>
                                        <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Medición</Text>
                                    </TouchableOpacity>

                                    <View style={styles.stepDivider} />

                                    <TouchableOpacity
                                        style={[styles.stepItem, step === 2 && styles.stepItemActive]}
                                        onPress={() => setStep(2)}
                                    >
                                        <Text style={[styles.stepNumber, step === 2 && styles.stepNumberActive]}>2</Text>
                                        <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Selección Prenda</Text>
                                    </TouchableOpacity>

                                    <View style={styles.stepDivider} />

                                    <TouchableOpacity
                                        style={[styles.stepItem, step === 3 && styles.stepItemActive]}
                                        onPress={() => setStep(3)}
                                    >
                                        <Text style={[styles.stepNumber, step === 3 && styles.stepNumberActive]}>3</Text>
                                        <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Validación CAD</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* CONTENIDO DEL ASISTENTE */}
                            <ScrollView contentContainerStyle={styles.scrollContent}>
                                {step === 1 && (
                                    /* PASO 1: SELECCIÓN DE SESIÓN DE MEDIDAS (PRIORIDAD ESTRICTA) */
                                    <View>
                                        <View style={styles.stepSectionHeader}>
                                            <Text style={styles.stepSectionTitle}>1. Selección de Medición Corporal</Text>
                                            <Text style={styles.stepSectionDesc}>
                                                Se muestran exclusivamente las sesiones pertenecientes a {person.full_name}.
                                                Por regla de alta costura, se prioriza la sesión más reciente válida.
                                            </Text>
                                        </View>

                                        {loadingSessions ? (
                                            <View style={styles.loadingBox}>
                                                <ActivityIndicator size="small" color={colors.champagneGold} />
                                                <Text style={styles.loadingText}>Cargando tomas de medidas...</Text>
                                            </View>
                                        ) : availableSessions.length === 0 ? (
                                            <View style={styles.noSessionsBox}>
                                                <Text style={styles.noSessionsTitle}>Sin mediciones para esta persona</Text>
                                                <Text style={styles.noSessionsDesc}>
                                                    Registre una toma de medidas presencial o aplique una plantilla estándar antes de generar el patrón paramétrico.
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.sessionsList}>
                                                {availableSessions.map((s, idx) => {
                                                    const isSelected = s.id === selectedSessionId;
                                                    const measuresCount = s.values ? Object.keys(s.values).length : 0;
                                                    const directCount = s.values
                                                        ? Object.values(s.values).filter((v) => (v as any).source === 'direct').length
                                                        : 0;
                                                    const estimatedCount = s.values
                                                        ? Object.values(s.values).filter((v) => (v as any).source === 'estimated').length
                                                        : 0;

                                                    return (
                                                        <TouchableOpacity
                                                            key={s.id}
                                                            style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
                                                            onPress={() => setSelectedSessionId(s.id)}
                                                            activeOpacity={0.85}
                                                        >
                                                            <View style={styles.sessionCardTop}>
                                                                <View style={styles.sessionRadio}>
                                                                    <View style={[styles.sessionRadioInner, isSelected && styles.sessionRadioInnerActive]} />
                                                                </View>
                                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                                    <View style={styles.sessionBadgeRow}>
                                                                        <Text style={styles.sessionVersionBadge}>Versión v{s.version_number || 1}</Text>
                                                                        {idx === 0 && (
                                                                            <Text style={styles.sessionLatestBadge}>★ MÁS RECIENTE</Text>
                                                                        )}
                                                                        <Text style={styles.sessionStatusBadge}>{s.status.toUpperCase()}</Text>
                                                                    </View>
                                                                    <Text style={styles.sessionDateText}>📅 Fecha: {s.session_date}</Text>
                                                                </View>
                                                            </View>

                                                            <View style={styles.sessionDetailsGrid}>
                                                                <View style={styles.sessionDetailItem}>
                                                                    <Text style={styles.sessionDetailLabel}>Medidas Registradas:</Text>
                                                                    <Text style={styles.sessionDetailValue}>{measuresCount} cotas (Unidad: {s.unit_system})</Text>
                                                                </View>
                                                                <View style={styles.sessionDetailItem}>
                                                                    <Text style={styles.sessionDetailLabel}>Procedencia:</Text>
                                                                    <Text style={styles.sessionDetailValue}>
                                                                        {directCount} directas · {estimatedCount} estimadas
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            {s.notes ? (
                                                                <Text style={styles.sessionNotesText} numberOfLines={2}>
                                                                    {s.notes}
                                                                </Text>
                                                            ) : null}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}

                                        <View style={styles.stepFooterRow}>
                                            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                                                <Text style={styles.secondaryBtnText}>Cancelar</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.primaryBtn, (!selectedSessionId || availableSessions.length === 0) && styles.btnDisabled]}
                                                disabled={!selectedSessionId || availableSessions.length === 0}
                                                onPress={() => setStep(2)}
                                            >
                                                <Text style={styles.primaryBtnText}>Continuar a Selección de Prenda →</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {step === 2 && (
                                    /* PASO 2: SELECCIÓN DE PRENDA DEL CATÁLOGO REAL */
                                    <View>
                                        <View style={styles.stepSectionHeader}>
                                            <Text style={styles.stepSectionTitle}>2. Catálogo Oficial de Prendas CAD</Text>
                                            <Text style={styles.stepSectionDesc}>
                                                Seleccione la prenda o variante de alta costura a patronar.
                                                El sistema valida en tiempo real la compatibilidad con la morfología {DEMOGRAPHIC_LABELS[person.demographic_category]}.
                                            </Text>
                                        </View>

                                        <View style={styles.garmentsGrid}>
                                            {CAD_GARMENTS_CATALOG.map((g) => {
                                                const isSelected = g.key === selectedGarmentKey;
                                                const check = validateDemographicGarmentCompatibility(g.key, person.demographic_category);
                                                const isCompatible = check.isCompatible;
                                                const imageSource = GARMENT_IMAGES[g.imageKey] || GARMENT_IMAGES.jacket;

                                                return (
                                                    <TouchableOpacity
                                                        key={g.key}
                                                        style={[
                                                            styles.garmentCard,
                                                            isSelected && styles.garmentCardSelected,
                                                            !isCompatible && styles.garmentCardIncompatible,
                                                        ]}
                                                        onPress={() => handleSelectGarment(g)}
                                                        activeOpacity={0.85}
                                                    >
                                                        <Image source={imageSource} style={styles.garmentImage} resizeMode="cover" />
                                                        
                                                        <View style={styles.garmentCardBody}>
                                                            <View style={styles.garmentCategoryRow}>
                                                                <Text style={styles.garmentCategoryText}>{g.category.toUpperCase()}</Text>
                                                                <View
                                                                    style={[
                                                                        styles.compatBadge,
                                                                        isCompatible ? styles.compatBadgeOk : styles.compatBadgeNo,
                                                                    ]}
                                                                >
                                                                    <Text style={styles.compatBadgeText}>
                                                                        {isCompatible ? 'COMPATIBLE' : 'NO DISPONIBLE'}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <Text style={styles.garmentName}>{g.name}</Text>
                                                            <Text style={styles.garmentDesc} numberOfLines={2}>{g.description}</Text>

                                                            <View style={styles.garmentFooter}>
                                                                <Text style={styles.garmentPiecesCount}>🧩 {g.piecesCount} piezas CAD</Text>
                                                                {g.isVariant && <Text style={styles.variantBadge}>VARIANTE</Text>}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <View style={styles.stepFooterRow}>
                                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                                                <Text style={styles.secondaryBtnText}>← Volver a Medición</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(3)}>
                                                <Text style={styles.primaryBtnText}>Revisar y Validar CAD →</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {step === 3 && (
                                    /* PASO 3: RESUMEN VISUAL DE PREPARACIÓN CAD */
                                    <View>
                                        <View style={styles.stepSectionHeader}>
                                            <Text style={styles.stepSectionTitle}>3. Validación Técnica y Preparación CAD</Text>
                                            <Text style={styles.stepSectionDesc}>
                                                Comprobación automática de cotas anatómicas, límites geométricos y compatibilidad morfológica antes de la ejecución.
                                            </Text>
                                        </View>

                                        {/* RESUMEN VISUAL EXIGIDO */}
                                        <View style={styles.summaryBox}>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>PERSONA:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {diagnostic.persona.name} ({diagnostic.persona.demographicLabel})
                                                </Text>
                                            </View>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>PRENDA:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {diagnostic.prenda.name} ({diagnostic.prenda.piecesCount} piezas CAD)
                                                </Text>
                                            </View>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>MEDICIÓN:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {diagnostic.medicion
                                                        ? `v${diagnostic.medicion.version} · Fecha: ${diagnostic.medicion.date} (${diagnostic.medicion.totalMeasuresCount} cotas registradas en mm)`
                                                        : 'Sin sesión'}
                                                </Text>
                                            </View>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>MODO DE ORIGEN:</Text>
                                                <View style={styles.originBadge}>
                                                    <Text style={styles.originBadgeText}>
                                                        {diagnostic.modoOrigen.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Cotas Válidas */}
                                            <View style={styles.measuresBox}>
                                                <Text style={styles.measuresSectionTitle}>
                                                    ✓ MEDIDAS VÁLIDAS ({diagnostic.medidasValidas.length}):
                                                </Text>
                                                <View style={styles.measuresTagsWrap}>
                                                    {diagnostic.medidasValidas.map((m) => (
                                                        <View key={m.code} style={styles.measureTagOk}>
                                                            <Text style={styles.measureTagOkText}>
                                                                {m.name}: <Text style={{ fontWeight: '700' }}>{m.valueMm} mm</Text>
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>

                                            {/* Cotas Faltantes (Bloqueantes) */}
                                            {diagnostic.medidasFaltantes.length > 0 && (
                                                <View style={styles.missingBox}>
                                                    <Text style={styles.missingTitle}>
                                                        ⚠️ MEDIDAS FALTANTES OBLIGATORIAS ({diagnostic.medidasFaltantes.length}):
                                                    </Text>
                                                    <Text style={styles.missingDesc}>
                                                        El motor CAD requiere estas cotas anatómicas exactas para trazar las pinzas y costadillos sin generar deformaciones geométricas:
                                                    </Text>
                                                    <View style={styles.measuresTagsWrap}>
                                                        {diagnostic.medidasFaltantes.map((m) => (
                                                            <View key={m.code} style={styles.measureTagMissing}>
                                                                <Text style={styles.measureTagMissingText}>✕ {m.name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        {/* FORMULARIO DE CREACIÓN */}
                                        <View style={styles.formBox}>
                                            <Text style={styles.formSectionTitle}>Datos de la Creación de Atelier</Text>
                                            
                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Título de la Creación:</Text>
                                                <TextInput
                                                    style={styles.textInput}
                                                    value={creationName}
                                                    onChangeText={setCreationName}
                                                    placeholder="Ej: Camisa de Seda con Solapa de Lanza"
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Ocasión / Evento:</Text>
                                                <TextInput
                                                    style={styles.textInput}
                                                    value={creationOccasion}
                                                    onChangeText={setCreationOccasion}
                                                    placeholder="Ej: Gala Benéfica, Graduación, Nupcial, Sastrería Diaria"
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Notas de Taller:</Text>
                                                <TextInput
                                                    style={[styles.textInput, { height: 60 }]}
                                                    value={creationNotes}
                                                    onChangeText={setCreationNotes}
                                                    multiline
                                                    placeholder="Instrucciones específicas de corte, preferencias de holgura o caída..."
                                                />
                                            </View>
                                        </View>

                                        {generationError ? (
                                            <View style={styles.errorBanner}>
                                                <Text style={styles.errorBannerText}>{generationError}</Text>
                                            </View>
                                        ) : null}

                                        <View style={styles.stepFooterRow}>
                                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                                                <Text style={styles.secondaryBtnText}>← Cambiar Prenda</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.generateBtn, (!diagnostic.isCadReady || isGenerating) && styles.btnDisabled]}
                                                disabled={!diagnostic.isCadReady || isGenerating}
                                                onPress={handleGeneratePattern}
                                            >
                                                {isGenerating ? (
                                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                                ) : (
                                                    <Text style={styles.generateBtnText}>
                                                        ✨ Generar Patrón CAD e Iniciar Taller
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {step === 4 && (
                                    /* PASO 4: CONFIRMACIÓN Y ACCESO AL TALLER CAD */
                                    <View style={styles.successContainer}>
                                        <Text style={styles.successIcon}>✓</Text>
                                        <Text style={styles.successTitle}>¡Patrón CAD Generado con Éxito!</Text>
                                        <Text style={styles.successSubtitle}>
                                            Se ha conectado el flujo completo con linaje técnico estricto:
                                        </Text>

                                        <View style={styles.lineageFlowBox}>
                                            <Text style={styles.lineageNode}>👤 PERSONA: <Text style={styles.boldText}>{person.full_name}</Text></Text>
                                            <Text style={styles.lineageArrow}>↓</Text>
                                            <Text style={styles.lineageNode}>📐 MEDICIÓN: <Text style={styles.boldText}>Sesión v{currentSession?.version_number} ({currentSession?.session_date})</Text></Text>
                                            <Text style={styles.lineageArrow}>↓</Text>
                                            <Text style={styles.lineageNode}>👗 CREACIÓN: <Text style={styles.boldText}>{createdCreation?.name}</Text></Text>
                                            <Text style={styles.lineageArrow}>↓</Text>
                                            <Text style={styles.lineageNode}>🧩 PATRÓN CAD LÓGICO: <Text style={styles.boldText}>1 patrón activo ({diagnostic.prenda.name})</Text></Text>
                                            <Text style={styles.lineageArrow}>↓</Text>
                                            <Text style={styles.lineageNode}>⚙️ EJECUCIÓN TÉCNICA: <Text style={styles.boldText}>v1.0.0 (ID: {createdExecution?.id?.slice(0, 8)}...)</Text></Text>
                                        </View>

                                        <View style={styles.stepFooterRow}>
                                            <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                                                <Text style={styles.primaryBtnText}>Cerrar y Ver Ficha</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 900,
        maxHeight: '90%',
        backgroundColor: colors.ivoryWarm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    brandTag: {
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.champagneGold,
        fontWeight: '700',
        marginBottom: 4,
    },
    modalTitle: {
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    boldText: {
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    closeBtn: {
        padding: 6,
    },
    closeBtnText: {
        fontSize: 18,
        color: '#888',
        fontWeight: '600',
    },
    stepsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#FAF7F2',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.5,
    },
    stepItemActive: {
        opacity: 1,
    },
    stepNumber: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#DDD',
        color: '#555',
        textAlign: 'center',
        lineHeight: 22,
        fontSize: 11,
        fontWeight: '700',
        marginRight: 6,
    },
    stepNumberActive: {
        backgroundColor: colors.champagneGold,
        color: '#FFFFFF',
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    stepLabelActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    stepDivider: {
        flex: 1,
        height: 1,
        backgroundColor: colors.sand,
        marginHorizontal: 12,
    },
    scrollContent: {
        padding: 24,
    },
    stepSectionHeader: {
        marginBottom: 18,
    },
    stepSectionTitle: {
        fontFamily: typography.serif,
        fontSize: 17,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    stepSectionDesc: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        lineHeight: 18,
    },
    loadingBox: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 13,
        color: '#666',
        marginTop: 10,
    },
    noSessionsBox: {
        padding: 30,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 6,
        alignItems: 'center',
    },
    noSessionsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    noSessionsDesc: {
        fontSize: 13,
        color: '#666',
        marginTop: 6,
        textAlign: 'center',
    },
    sessionsList: {
        gap: 12,
    },
    sessionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
    },
    sessionCardSelected: {
        borderColor: colors.champagneGold,
        borderWidth: 2,
        backgroundColor: '#FCFAF6',
    },
    sessionCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionRadio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: colors.champagneGold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionRadioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'transparent',
    },
    sessionRadioInnerActive: {
        backgroundColor: colors.champagneGold,
    },
    sessionBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sessionVersionBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        backgroundColor: colors.ivoryWarm,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sessionLatestBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#15803d',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sessionStatusBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666',
    },
    sessionDateText: {
        fontSize: 12,
        color: '#555',
        marginTop: 4,
    },
    sessionDetailsGrid: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0EBE1',
        gap: 20,
    },
    sessionDetailItem: {
        flex: 1,
    },
    sessionDetailLabel: {
        fontSize: 11,
        color: '#888',
        textTransform: 'uppercase',
    },
    sessionDetailValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    sessionNotesText: {
        fontSize: 12,
        color: '#777',
        fontStyle: 'italic',
        marginTop: 8,
    },
    garmentsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    garmentCard: {
        width: '31%',
        minWidth: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
    },
    garmentCardSelected: {
        borderColor: colors.champagneGold,
        borderWidth: 2,
        backgroundColor: '#FCFAF6',
    },
    garmentCardIncompatible: {
        opacity: 0.55,
        backgroundColor: '#F9F9F9',
    },
    garmentImage: {
        width: '100%',
        height: 120,
    },
    garmentCardBody: {
        padding: 12,
    },
    garmentCategoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    garmentCategoryText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    compatBadge: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
    },
    compatBadgeOk: {
        backgroundColor: '#DCFCE7',
    },
    compatBadgeNo: {
        backgroundColor: '#FEE2E2',
    },
    compatBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#1E293B',
    },
    garmentName: {
        fontFamily: typography.serif,
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    garmentDesc: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        lineHeight: 15,
    },
    garmentFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#F3EFE8',
    },
    garmentPiecesCount: {
        fontSize: 10,
        fontWeight: '600',
        color: '#555',
    },
    variantBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        backgroundColor: colors.ivoryWarm,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
    },
    summaryBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 18,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        width: 140,
        fontSize: 12,
        fontWeight: '700',
        color: '#555',
        letterSpacing: 0.5,
    },
    summaryValue: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    originBadge: {
        backgroundColor: colors.ivoryWarm,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    originBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    measuresBox: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
    },
    measuresSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803d',
        marginBottom: 8,
    },
    measuresTagsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    measureTagOk: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    measureTagOkText: {
        fontSize: 11,
        color: '#166534',
    },
    missingBox: {
        marginTop: 14,
        padding: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 6,
    },
    missingTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B91C1C',
    },
    missingDesc: {
        fontSize: 11,
        color: '#7F1D1D',
        marginTop: 4,
        marginBottom: 8,
    },
    measureTagMissing: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F87171',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    measureTagMissingText: {
        fontSize: 11,
        color: '#B91C1C',
        fontWeight: '600',
    },
    formBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 18,
    },
    formSectionTitle: {
        fontFamily: typography.serif,
        fontSize: 15,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#444',
        marginBottom: 4,
    },
    textInput: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 13,
        color: colors.atelierBlack,
    },
    errorBanner: {
        padding: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 6,
        marginBottom: 14,
    },
    errorBannerText: {
        fontSize: 12,
        color: '#B91C1C',
        fontWeight: '600',
    },
    stepFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
    },
    primaryBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 6,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    secondaryBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
    },
    secondaryBtnText: {
        color: colors.atelierBlack,
        fontSize: 13,
        fontWeight: '600',
    },
    generateBtn: {
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 6,
    },
    generateBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.5,
    },
    babyAlertContainer: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    babyAlertIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    babyAlertTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#B91C1C',
        letterSpacing: 1,
        marginBottom: 10,
    },
    babyAlertText: {
        fontSize: 13,
        color: '#4B5563',
        textAlign: 'center',
        maxWidth: 500,
        lineHeight: 20,
        marginBottom: 24,
    },
    babyCloseBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
    },
    babyCloseBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    successContainer: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    successIcon: {
        fontSize: 40,
        color: '#15803d',
        marginBottom: 10,
    },
    successTitle: {
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    successSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        marginBottom: 18,
    },
    lineageFlowBox: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 6,
        padding: 18,
        width: '100%',
        maxWidth: 550,
        marginBottom: 20,
    },
    lineageNode: {
        fontSize: 12,
        color: '#444',
        marginVertical: 2,
    },
    lineageArrow: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.champagneGold,
        textAlign: 'center',
        marginVertical: 2,
    },
});
