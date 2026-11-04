// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MODAL DE CAPTURA RÁPIDA DE JORNADA (FASE 3)
// Archivo: src/components/clients/MeasurementCampaignFastCaptureModal.tsx
// ==============================================================================
// Interfaz editorial de alta costura para registrar rápidamente medidas corporales
// de múltiples integrantes de un grupo/núcleo sobre una MeasurementTemplate.
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import {
    MeasurementCampaign,
    MeasurementCampaignParticipant,
    ParticipantCaptureStatus,
} from '../../types/pattern/measurementCampaign';
import {
    MeasurementCategory,
    MeasurementCatalogItem,
    MeasurementUnit,
} from '../../types/pattern/measurement';
import { DemographicCategory, DEMOGRAPHIC_LABELS, MeasuredPerson } from '../../types/personGroup';
import {
    fetchCampaignById,
    fetchCampaignParticipants,
    saveParticipantCapture,
} from '../../services/measurementCampaignService';
import {
    getMeasurementTemplateById,
    MEASUREMENT_TEMPLATES,
} from '../../engine/pattern/catalog/measurementTemplates';
import { MASTER_MEASUREMENT_CATALOG, MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';
import {
    getStandardSizeEntry,
    STANDARD_CATEGORIES,
    StandardSizeEntry,
} from '../../engine/pattern/catalog/standardReferenceSizes';
import { PrintableMeasurementSheetModal } from '../pattern/PrintableMeasurementSheetModal';
import { PersonCreationCadWizardModal } from '../pattern/PersonCreationCadWizardModal';
import { MeasurementTemplateConfigModal } from '../pattern/MeasurementTemplateConfigModal';
import { AtelierMannequinDisplay } from '../pattern/AtelierMannequinDisplay';
import { AtelierNumericKeypad } from '../pattern/AtelierNumericKeypad';

const DEMOGRAPHIC_AVATARS: Record<DemographicCategory, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

interface MeasurementCampaignFastCaptureModalProps {
    visible: boolean;
    campaign: MeasurementCampaign;
    client: Client;
    onClose: () => void;
    onCampaignUpdated?: () => void;
}

export function MeasurementCampaignFastCaptureModal({
    visible,
    campaign: initialCampaign,
    client,
    onClose,
    onCampaignUpdated,
}: MeasurementCampaignFastCaptureModalProps) {
    const [campaign, setCampaign] = useState<MeasurementCampaign>(initialCampaign);
    const [participants, setParticipants] = useState<MeasurementCampaignParticipant[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentIndex, setCurrentIndex] = useState<number>(0);

    // Búsqueda y filtrado por estado de los integrantes de la jornada
    const [participantSearchQuery, setParticipantSearchQuery] = useState<string>('');
    const [participantStatusFilter, setParticipantStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

    // Cota anatómica activa para edición táctil en Numpad y Maniquí
    const [selectedMeasureCode, setSelectedMeasureCode] = useState<string>('');

    // Estado local para la persona activa
    const [capturedValues, setCapturedValues] = useState<
        Record<string, { value: number; source: 'direct' | 'estimated'; confidence: string }>
    >({});
    const [standardSize, setStandardSize] = useState<string | null>(null);
    const [notes, setNotes] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal de impresión de fichas A4
    const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

    // Modal de Creación y Patronaje CAD individual (Fase 4 - Flujo Grupal)
    const [showCadModal, setShowCadModal] = useState<boolean>(false);

    // Modal de Configuración personalizada de Medidas
    const [showMeasureConfigModal, setShowMeasureConfigModal] = useState<boolean>(false);

    // Visibilidad del Maniquí (Oculto por defecto para priorizar captura rápida de cotas)
    const [showMannequin, setShowMannequin] = useState<boolean>(false);

    // Ref para desplazamiento táctil suave de la tira de alumnos
    const chipsScrollRef = useRef<ScrollView>(null);

    const activeTemplate = useMemo(() => {
        return getMeasurementTemplateById(campaign.template_id) || MEASUREMENT_TEMPLATES[0];
    }, [campaign.template_id]);

    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

    useEffect(() => {
        if (activeTemplate) {
            setSelectedCodes(activeTemplate.measurement_codes); // eslint-disable-line react-hooks/set-state-in-effect
        }
    }, [activeTemplate]);

    const initPersonState = useCallback((part: MeasurementCampaignParticipant) => {
        const rawValues = part.captured_values || {};
        const normalized: Record<string, { value: number; source: 'direct' | 'estimated'; confidence: string }> = {};

        Object.keys(rawValues).forEach((code) => {
            const item = rawValues[code];
            if (typeof item === 'number') {
                normalized[code] = { value: item, source: 'direct', confidence: 'high' };
            } else if (item && typeof item === 'object') {
                normalized[code] = {
                    value: item.value,
                    source: (item.source as any) || 'direct',
                    confidence: item.confidence || 'high',
                };
            }
        });

        setCapturedValues(normalized);
        setStandardSize(part.standard_size || null);
        setNotes(part.notes || '');
        setSuccessMessage(null);
    }, []);

    const loadCampaignData = useCallback(async () => {
        setLoading(true);
        try {
            const [campData, partList] = await Promise.all([
                fetchCampaignById(campaign.id),
                fetchCampaignParticipants(campaign.id),
            ]);
            if (campData) setCampaign(campData);
            setParticipants(partList);

            if (partList.length > 0) {
                initPersonState(partList[0]);
            }
        } catch (err) {
            console.warn('[FastCaptureModal] Error cargando datos:', err);
        } finally {
            setLoading(false);
        }
    }, [campaign.id, initPersonState]);

    useEffect(() => {
        if (visible) {
            loadCampaignData(); // eslint-disable-line react-hooks/set-state-in-effect
        }
    }, [visible, loadCampaignData]);

    const activeParticipant = participants[currentIndex] || null;
    const activePerson = activeParticipant?.person || null;
    const demoCategory = activePerson?.demographic_category || 'woman';

    // Lista de tallas estándar disponibles para la categoría demográfica activa
    const availableSizes = useMemo(() => {
        return STANDARD_CATEGORIES.find((c) => c.key === demoCategory)?.sizes || [];
    }, [demoCategory]);

    // Medidas activas de la plantilla (personalizables por jornada)
    const templateMeasurements: MeasurementCatalogItem[] = useMemo(() => {
        const codesToUse = selectedCodes.length > 0 ? selectedCodes : activeTemplate.measurement_codes;
        return codesToUse
            .map((code) => MEASUREMENT_MAP[code])
            .filter((item): item is MeasurementCatalogItem => Boolean(item));
    }, [selectedCodes, activeTemplate]);

    useEffect(() => {
        if (templateMeasurements.length > 0) {
            if (!selectedMeasureCode || !templateMeasurements.some((m) => m.code === selectedMeasureCode)) {
                setSelectedMeasureCode(templateMeasurements[0].code); // eslint-disable-line react-hooks/set-state-in-effect
            }
        }
    }, [templateMeasurements, selectedMeasureCode]);

    // Participantes filtrados por búsqueda y estado
    const filteredParticipants = useMemo(() => {
        let list = participants;
        if (participantStatusFilter === 'pending') {
            list = list.filter((p) => p.status !== 'completed');
        } else if (participantStatusFilter === 'completed') {
            list = list.filter((p) => p.status === 'completed');
        }

        if (participantSearchQuery.trim()) {
            const q = participantSearchQuery.trim().toLowerCase();
            list = list.filter((p) => {
                const name = p.person?.full_name?.toLowerCase() || '';
                const ref = p.person?.reference_id?.toLowerCase() || '';
                return name.includes(q) || ref.includes(q);
            });
        }
        return list;
    }, [participants, participantStatusFilter, participantSearchQuery]);

    // Medidas normalizadas a milímetros para alimentar el maniquí de taller
    const measurementsMm = useMemo(() => {
        const map: Record<string, number> = {};
        Object.entries(capturedValues).forEach(([code, item]) => {
            if (item && item.value > 0) {
                map[code] = campaign.unit_system === 'cm' ? Math.round(item.value * 10) : Math.round(item.value);
            }
        });
        return map;
    }, [capturedValues, campaign.unit_system]);

    const activeMeasureIndex = templateMeasurements.findIndex((m) => m.code === selectedMeasureCode);
    const activeMeasureItem = templateMeasurements[activeMeasureIndex] || templateMeasurements[0] || MASTER_MEASUREMENT_CATALOG[0];
    const activeValueCm = capturedValues[selectedMeasureCode]?.value ?? null;

    const handleNextMeasure = () => {
        if (activeMeasureIndex >= 0 && activeMeasureIndex < templateMeasurements.length - 1) {
            setSelectedMeasureCode(templateMeasurements[activeMeasureIndex + 1].code);
        }
    };

    const handlePrevMeasure = () => {
        if (activeMeasureIndex > 0) {
            setSelectedMeasureCode(templateMeasurements[activeMeasureIndex - 1].code);
        }
    };

    const handleConfirmNumpadValue = (valCm: number) => {
        const newValues = { ...capturedValues };
        newValues[selectedMeasureCode] = {
            value: valCm,
            source: 'direct',
            confidence: 'high',
        };
        setCapturedValues(newValues);
        handleNextMeasure();
    };

    // Seleccionar otra persona de la tira superior con auto-scroll centrado
    const handleSelectParticipant = (index: number) => {
        if (index >= 0 && index < participants.length) {
            setCurrentIndex(index);
            initPersonState(participants[index]);
            // Centrado automático del chip del alumno activo en la tira horizontal
            chipsScrollRef.current?.scrollTo({ x: Math.max(0, index * 125 - 150), animated: true });
        }
    };

    const scrollChipsLeft = () => {
        chipsScrollRef.current?.scrollTo({ x: Math.max(0, (currentIndex - 3) * 125), animated: true });
    };

    const scrollChipsRight = () => {
        chipsScrollRef.current?.scrollTo({ x: (currentIndex + 3) * 125, animated: true });
    };

    // Aplicar una talla estándar rápidamente
    const handleApplyStandardSize = (sizeKey: string) => {
        if (!activePerson) return;
        const entry = getStandardSizeEntry(activePerson.demographic_category, sizeKey);
        if (!entry) return;

        setStandardSize(sizeKey);
        const newValues = { ...capturedValues };

        activeTemplate.measurement_codes.forEach((code) => {
            const stdVal = entry.measurementsCm[code];
            if (stdVal !== undefined) {
                // Si la jornada usa mm, convertimos
                const val = campaign.unit_system === 'mm' ? stdVal * 10 : stdVal;
                newValues[code] = {
                    value: val,
                    source: 'estimated',
                    confidence: 'medium',
                };
            }
        });

        setCapturedValues(newValues);
        setSuccessMessage(`Talla ${sizeKey} aplicada. Las medidas pueden ajustarse individualmente.`);
    };

    // Modificar un campo individual
    const handleMeasurementChange = (code: string, text: string) => {
        const num = parseFloat(text.replace(',', '.'));
        const newValues = { ...capturedValues };
        if (isNaN(num)) {
            delete newValues[code];
        } else {
            newValues[code] = {
                value: num,
                source: 'direct', // Marcado como ajuste/medición directa
                confidence: 'high',
            };
        }
        setCapturedValues(newValues);
    };

    // Guardar cambios (borrador o completado)
    const handleSave = async (statusToSet: ParticipantCaptureStatus) => {
        if (!activeParticipant) return;

        setSaving(true);
        setSuccessMessage(null);
        try {
            const res = await saveParticipantCapture({
                campaign_id: campaign.id,
                person_id: activeParticipant.person_id,
                status: statusToSet,
                standard_size: standardSize,
                captured_values: capturedValues,
                notes,
                unit_system: campaign.unit_system,
            });

            if (!res.success) {
                Alert.alert('Error', res.error || 'No se pudo guardar la captura.');
                return;
            }

            // Actualizar lista local de participantes
            const updatedList = [...participants];
            updatedList[currentIndex] = {
                ...updatedList[currentIndex],
                status: statusToSet,
                standard_size: standardSize,
                captured_values: capturedValues,
                notes,
            };
            setParticipants(updatedList);

            setSuccessMessage(
                statusToSet === 'completed'
                    ? '✓ Medidas digitalizadas y sesión individual finalizada.'
                    : '💾 Borrador guardado correctamente.'
            );

            if (onCampaignUpdated) onCampaignUpdated();

            // Si se completó con éxito, avanzar automáticamente a la siguiente pendiente si existe
            if (statusToSet === 'completed') {
                const nextPendingIdx = updatedList.findIndex(
                    (p, idx) => idx > currentIndex && p.status !== 'completed'
                );
                if (nextPendingIdx >= 0) {
                    setTimeout(() => {
                        handleSelectParticipant(nextPendingIdx);
                    }, 500);
                }
            }
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Error inesperado guardando medidas.');
        } finally {
            setSaving(false);
        }
    };

    // Progreso
    const completedCount = participants.filter((p) => p.status === 'completed').length;
    const progressPct = participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0;

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Cabecera Editorial Principal */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.superTitle}>MÓDULO 02 · CAPTURA MASIVA DE MEDIDAS</Text>
                        <Text style={styles.title}>{campaign.title}</Text>
                        <Text style={styles.subtitle}>
                            Responsable: <Text style={styles.goldText}>{client.full_name}</Text> · Grupo:{' '}
                            <Text style={styles.goldText}>{campaign.group_name || 'Grupo'}</Text> · Plantilla:{' '}
                            <Text style={styles.goldText}>{activeTemplate.name}</Text>
                        </Text>
                    </View>

                    <View style={styles.headerRightActions}>
                        <TouchableOpacity
                            style={styles.sheetBtn}
                            onPress={() => setShowPrintModal(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.sheetBtnText}>📄 Fichas A4</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={styles.closeBtnText}>✕ Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Barra de Progreso Global de la Jornada */}
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressLabelsRow}>
                        <Text style={styles.progressLabel}>
                            PROGRESO DE LA JORNADA: {completedCount} de {participants.length} integrantes digitalizados ({progressPct}%)
                        </Text>
                        <Text style={styles.progressUnitLabel}>
                            UNIDAD DE CAPTURA: <Text style={{ fontWeight: '700' }}>{campaign.unit_system.toUpperCase()}</Text>
                        </Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                    </View>
                </View>

                {/* BARRA DE NAVEGACIÓN, BÚSQUEDA Y FILTRO DE ALUMNOS */}
                <View style={styles.participantNavToolbar}>
                    {/* Fila 1: Buscador Reactivo y Filtros Rápidos por Estado */}
                    <View style={styles.navToolbarRow}>
                        <View style={styles.participantSearchWrap}>
                            <Text style={{ fontSize: 12, marginRight: 6 }}>🔍</Text>
                            <TextInput
                                style={styles.participantSearchInput}
                                placeholder="Buscar alumno por nombre o referencia (ALUM-M01)..."
                                placeholderTextColor="#888"
                                value={participantSearchQuery}
                                onChangeText={setParticipantSearchQuery}
                            />
                            {participantSearchQuery ? (
                                <TouchableOpacity onPress={() => setParticipantSearchQuery('')}>
                                    <Text style={{ fontSize: 12, color: colors.textMuted, paddingHorizontal: 4 }}>✕</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <View style={styles.statusFilterPills}>
                            <TouchableOpacity
                                style={[styles.statusFilterPill, participantStatusFilter === 'all' && styles.statusFilterPillActive]}
                                onPress={() => setParticipantStatusFilter('all')}
                            >
                                <Text style={[styles.statusFilterPillText, participantStatusFilter === 'all' && styles.statusFilterPillTextActive]}>
                                    Todos ({participants.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.statusFilterPill, participantStatusFilter === 'pending' && styles.statusFilterPillActive]}
                                onPress={() => setParticipantStatusFilter('pending')}
                            >
                                <Text style={[styles.statusFilterPillText, participantStatusFilter === 'pending' && styles.statusFilterPillTextActive]}>
                                    ⏳ Pendientes ({participants.length - completedCount})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.statusFilterPill, participantStatusFilter === 'completed' && styles.statusFilterPillActive]}
                                onPress={() => setParticipantStatusFilter('completed')}
                            >
                                <Text style={[styles.statusFilterPillText, participantStatusFilter === 'completed' && styles.statusFilterPillTextActive]}>
                                    ✓ Listos ({completedCount})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Fila 2: Navegación Secuencial del Sujeto Activo */}
                    <View style={styles.sequentialNavRow}>
                        <TouchableOpacity
                            style={[styles.seqNavBtn, currentIndex === 0 && styles.seqNavBtnDisabled]}
                            disabled={currentIndex === 0}
                            onPress={() => handleSelectParticipant(currentIndex - 1)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.seqNavBtnText, currentIndex === 0 && styles.seqNavBtnTextDisabled]}>
                                ← Alumno Anterior
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.activeStudentBadge}>
                            <Text style={styles.activeStudentBadgeText} numberOfLines={1}>
                                #{currentIndex + 1} {activePerson?.full_name || 'Sin nombre'} · {activePerson?.reference_id || 'ALUM'}
                                {activeParticipant?.standard_size ? ` · Talla ${activeParticipant.standard_size}` : ''}
                                <Text style={styles.activeStudentCounter}> ({currentIndex + 1}/{participants.length})</Text>
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.seqNavBtn, currentIndex >= participants.length - 1 && styles.seqNavBtnDisabled]}
                            disabled={currentIndex >= participants.length - 1}
                            onPress={() => handleSelectParticipant(currentIndex + 1)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.seqNavBtnText, currentIndex >= participants.length - 1 && styles.seqNavBtnTextDisabled]}>
                                Siguiente Alumno →
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tira Horizontal de Chips Compactos con Navegación Asistida */}
                    <View style={styles.chipsScrollNavWrapper}>
                        <TouchableOpacity
                            style={styles.chipsArrowBtn}
                            onPress={scrollChipsLeft}
                            activeOpacity={0.7}
                            accessibilityLabel="Ver alumnos anteriores"
                            {...Platform.select({ web: { title: 'Desplazar alumnos hacia la izquierda' } as any })}
                        >
                            <Text style={styles.chipsArrowBtnText}>◀</Text>
                        </TouchableOpacity>

                        <ScrollView
                            ref={chipsScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.compactChipsScroll}
                            style={{ flex: 1 }}
                        >
                            {filteredParticipants.map((p) => {
                                const origIdx = participants.findIndex((item) => item.person_id === p.person_id);
                                const isSelected = origIdx === currentIndex;
                                const isDone = p.status === 'completed';
                                const isInProgress = p.status === 'in_progress';

                                return (
                                    <TouchableOpacity
                                        key={p.person_id || p.id}
                                        style={[
                                            styles.chipCompact,
                                            isSelected && styles.chipCompactSelected,
                                            isDone && styles.chipCompactDone,
                                        ]}
                                        onPress={() => handleSelectParticipant(origIdx)}
                                        activeOpacity={0.8}
                                        accessibilityLabel={`Alumno ${p.person?.full_name || ''}`}
                                        {...Platform.select({ web: { title: `#${origIdx + 1} ${p.person?.full_name || 'Alumno'} (${p.status || 'pendiente'})` } as any })}
                                    >
                                        <Text style={[styles.chipCompactText, isSelected && styles.chipCompactTextSelected]}>
                                            #{origIdx + 1} {p.person?.full_name?.split(' ').slice(0, 2).join(' ') || 'Alumno'}
                                        </Text>
                                        <View
                                            style={[
                                                styles.chipDot,
                                                isDone ? styles.chipDotDone : isInProgress ? styles.chipDotProgress : styles.chipDotPending,
                                            ]}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.chipsArrowBtn}
                            onPress={scrollChipsRight}
                            activeOpacity={0.7}
                            accessibilityLabel="Ver siguientes alumnos"
                            {...Platform.select({ web: { title: 'Desplazar alumnos hacia la derecha' } as any })}
                        >
                            <Text style={styles.chipsArrowBtnText}>▶</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando plantilla e integrantes de la jornada...</Text>
                    </View>
                ) : activeParticipant && activePerson ? (
                    <View style={styles.mainCaptureArea}>
                        {/* BARRA RÁPIDA DE TALLA ESTÁNDAR Y DATOS DEL ALUMNO */}
                        <View style={styles.quickSizeToolbar}>
                            <View style={styles.activePersonSummary}>
                                <View style={styles.demographicMiniPill}>
                                    <Text style={styles.demographicMiniPillText}>
                                        {DEMOGRAPHIC_LABELS[demoCategory].toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.activePersonNameBold}>
                                    {activePerson.full_name}
                                </Text>
                                {activeParticipant.status === 'completed' ? (
                                    <View style={styles.doneBadge}>
                                        <Text style={styles.doneBadgeText}>✓ MEDIDAS COMPLETAS</Text>
                                    </View>
                                ) : (
                                    <View style={styles.pendingBadge}>
                                        <Text style={styles.pendingBadgeText}>⏳ BORRADOR EN CURSO</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.quickSizesRow}>
                                <Text style={styles.quickSizesLabel}>TALLA BASE DE REFERENCIA:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                                    {availableSizes.map((sz: string) => {
                                        const isSelected = standardSize === sz;
                                        return (
                                            <TouchableOpacity
                                                key={sz}
                                                style={[styles.sizePill, isSelected && styles.sizePillSelected]}
                                                onPress={() => handleApplyStandardSize(sz)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[styles.sizePillText, isSelected && styles.sizePillTextSelected]}>
                                                    {sz}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                {standardSize ? (
                                    <TouchableOpacity onPress={() => setStandardSize(null)} style={{ marginLeft: 6 }}>
                                        <Text style={styles.clearSizeText}>✕ Quitar ({standardSize})</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>

                        {/* CUERPO PRINCIPAL ERGONÓMICO EN 3 PANELES (MANIQUÍ + MEDIDAS + TECLADO) */}
                        <View style={styles.threePanelsContainer}>
                            {/* PANEL 1: MANIQUÍ ANATÓMICO INTERACTIVO (COLAPSABLE) */}
                            {showMannequin && (
                                <View style={styles.mannequinPanel}>
                                    <AtelierMannequinDisplay
                                        measurementsMm={measurementsMm}
                                        session={null}
                                        clientName={activePerson.full_name}
                                        referenceProfileLabel="Captura Anatómica"
                                        isMeasurementOnly={true}
                                        compact={true}
                                        selectedMeasureCode={selectedMeasureCode}
                                        onSelectMeasureCode={(code) => setSelectedMeasureCode(code)}
                                    />
                                </View>
                            )}

                            {/* PANEL 2: LISTA DE MEDIDAS DE LA PLANTILLA */}
                            <View style={[styles.measuresListPanel, !showMannequin && { flex: 2 }]}>
                                <View style={styles.measuresListHeader}>
                                    <Text style={styles.measuresListTitle} numberOfLines={1}>
                                        MEDIDAS REQUERIDAS ({templateMeasurements.length})
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={styles.toggleMannequinBtn}
                                            onPress={() => setShowMannequin((v) => !v)}
                                            activeOpacity={0.8}
                                            accessibilityLabel={showMannequin ? 'Ocultar maniquí interactivo' : 'Mostrar maniquí interactivo'}
                                            {...Platform.select({ web: { title: showMannequin ? 'Ocultar maniquí para dar más espacio a las cotas' : 'Mostrar maniquí con cotas anatómicas' } as any })}
                                        >
                                            <Text style={styles.toggleMannequinBtnText}>
                                                {showMannequin ? '👁️ Ocultar Maniquí' : '👗 Ver Maniquí'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.configMeasuresBtn}
                                            onPress={() => setShowMeasureConfigModal(true)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.configMeasuresBtnText}>⚙️ Configurar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <ScrollView
                                    style={styles.measuresScroll}
                                    contentContainerStyle={styles.measuresScrollContent}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    {templateMeasurements.map((m, idx) => {
                                        const isSelected = selectedMeasureCode === m.code;
                                        const entry = capturedValues[m.code];
                                        const isCaptured = entry !== undefined && entry.value > 0;
                                        const valStr = isCaptured ? `${entry.value} ${campaign.unit_system}` : '0.0';
                                        const isDirect = entry?.source === 'direct';

                                        return (
                                            <TouchableOpacity
                                                key={m.code}
                                                style={[
                                                    styles.templateMeasureRow,
                                                    isSelected && styles.templateMeasureRowSelected,
                                                    isCaptured && styles.templateMeasureRowCaptured,
                                                ]}
                                                onPress={() => setSelectedMeasureCode(m.code)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.measureRowLeft}>
                                                    <View style={[styles.measureIndexBadge, isSelected && styles.measureIndexBadgeSelected]}>
                                                        <Text style={[styles.measureIndexBadgeText, isSelected && styles.measureIndexBadgeTextSelected]}>
                                                            #{idx + 1}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                                        <Text style={[styles.measureRowTitle, isSelected && styles.measureRowTitleSelected]} numberOfLines={1}>
                                                            {m.name}
                                                        </Text>
                                                        <Text style={styles.measureRowCode} numberOfLines={1}>
                                                            {m.code} · {m.instructions || ''}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.measureRowRight}>
                                                    {entry ? (
                                                        <View style={[styles.sourceTag, isDirect ? styles.sourceTagDirect : styles.sourceTagSize]}>
                                                            <Text style={styles.sourceTagText}>
                                                                {isDirect ? 'Directa' : 'Talla'}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    <Text style={[styles.measureRowVal, isCaptured && styles.measureRowValCaptured]}>
                                                        {valStr}
                                                    </Text>
                                                    <Text style={{ fontSize: 13, marginLeft: 6 }}>
                                                        {isCaptured ? '✓' : '⏳'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* CAMPO DE OBSERVACIONES */}
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesLabel}>OBSERVACIONES DE CONFECCIÓN / AJUSTES POSTURALES:</Text>
                                    <TextInput
                                        style={styles.notesInput}
                                        placeholder="Anotaciones sobre hombro caído, lordosis, holgura deseada..."
                                        placeholderTextColor="#999"
                                        value={notes}
                                        onChangeText={setNotes}
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>
                            </View>

                            {/* PANEL 3: TECLADO NUMÉRICO TÁCTIL */}
                            <View style={styles.keypadPanel}>
                                <AtelierNumericKeypad
                                    measureCode={activeMeasureItem.code}
                                    measureLabel={activeMeasureItem.name}
                                    currentValueCm={activeValueCm}
                                    unit={campaign.unit_system === 'in' ? 'in' : 'cm'}
                                    minMm={activeMeasureItem.min_value_mm}
                                    maxMm={activeMeasureItem.max_value_mm}
                                    onConfirmValue={handleConfirmNumpadValue}
                                    onPrevMeasure={handlePrevMeasure}
                                    onNextMeasure={handleNextMeasure}
                                    hasPrev={activeMeasureIndex > 0}
                                    hasNext={activeMeasureIndex < templateMeasurements.length - 1}
                                />
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No hay integrantes en esta jornada.</Text>
                    </View>
                )}

                {/* Barra Inferior de Navegación y Guardado */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
                        disabled={currentIndex === 0}
                        onPress={() => handleSelectParticipant(currentIndex - 1)}
                        activeOpacity={0.8}
                        accessibilityLabel="Alumno anterior"
                        {...Platform.select({ web: { title: 'Ir al alumno anterior' } as any })}
                    >
                        <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
                            ← Alumno Ant.
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.bottomActionGroup}>
                        <TouchableOpacity
                            style={styles.draftBtn}
                            onPress={() => handleSave('in_progress')}
                            disabled={saving}
                            activeOpacity={0.8}
                            accessibilityLabel="Guardar como borrador"
                            {...Platform.select({ web: { title: 'Guardar las medidas actuales como borrador' } as any })}
                        >
                            <Text style={styles.draftBtnText}>
                                {saving ? 'Guardando...' : '💾 Guardar Borrador'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.completeBtn}
                            onPress={() => handleSave('completed')}
                            disabled={saving}
                            activeOpacity={0.85}
                            accessibilityLabel="Finalizar medidas y pasar al siguiente alumno"
                            {...Platform.select({ web: { title: 'Guardar medidas finalizadas y avanzar al siguiente alumno' } as any })}
                        >
                            <Text style={styles.completeBtnText}>
                                {saving ? 'Digitalizando...' : '✓ Finalizar y Siguiente'}
                            </Text>
                        </TouchableOpacity>

                        {activePerson && (
                            <TouchableOpacity
                                style={styles.cadBtn}
                                onPress={() => setShowCadModal(true)}
                                disabled={saving}
                                activeOpacity={0.85}
                                accessibilityLabel="Abrir Taller CAD para este alumno"
                                {...Platform.select({ web: { title: 'Taller CAD y generación de patrones' } as any })}
                            >
                                <Text style={styles.cadBtnText}>✨ Prenda CAD</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.navBtn, currentIndex >= participants.length - 1 && styles.navBtnDisabled]}
                        disabled={currentIndex >= participants.length - 1}
                        onPress={() => handleSelectParticipant(currentIndex + 1)}
                        activeOpacity={0.8}
                        accessibilityLabel="Siguiente alumno"
                        {...Platform.select({ web: { title: 'Pasar al siguiente alumno de la lista' } as any })}
                    >
                        <Text
                            style={[
                                styles.navBtnText,
                                currentIndex >= participants.length - 1 && styles.navBtnTextDisabled,
                            ]}
                        >
                            Alumno Sig. →
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Modal de Fichas Imprimibles */}
                {showPrintModal && (
                    <PrintableMeasurementSheetModal
                        visible={showPrintModal}
                        campaign={campaign}
                        template={{
                            ...activeTemplate,
                            measurement_codes: selectedCodes.length > 0 ? selectedCodes : activeTemplate.measurement_codes,
                        }}
                        participants={participants}
                        clientName={client.full_name}
                        onClose={() => setShowPrintModal(false)}
                    />
                )}

                {/* Modal de Configuración de Medidas de la Plantilla */}
                {showMeasureConfigModal && (
                    <MeasurementTemplateConfigModal
                        visible={showMeasureConfigModal}
                        templateName={activeTemplate.name}
                        initialCodes={selectedCodes.length > 0 ? selectedCodes : activeTemplate.measurement_codes}
                        onSave={(newCodes) => setSelectedCodes(newCodes)}
                        onClose={() => setShowMeasureConfigModal(false)}
                    />
                )}

                {/* Modal de Patronaje CAD Individual desde Campaña (Fase 4) */}
                {showCadModal && activePerson && (
                    <PersonCreationCadWizardModal
                        visible={showCadModal}
                        client={client}
                        person={activePerson}
                        onClose={() => {
                            setShowCadModal(false);
                            loadCampaignData();
                        }}
                        onCadExecutionGenerated={() => {
                            loadCampaignData();
                            if (onCampaignUpdated) onCampaignUpdated();
                        }}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    header: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#2C2723',
    },
    superTitle: {
        fontSize: 10,
        fontFamily: typography.serif,
        color: colors.champagneGold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    title: {
        fontSize: 20,
        fontFamily: typography.serif,
        color: colors.ivoryWarm,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 11,
        color: '#B0A398',
        marginTop: 2,
    },
    goldText: {
        color: colors.champagneGold,
        fontWeight: '600',
    },
    headerRightActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    sheetBtn: {
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    sheetBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#443D36',
    },
    closeBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
    },
    progressBarContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    progressLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    progressUnitLabel: {
        fontSize: 10,
        color: '#766B62',
    },
    progressTrack: {
        height: 6,
        backgroundColor: '#EAE1D5',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.champagneGold,
    },
    // BARRA DE NAVEGACIÓN Y FILTROS DE ALUMNOS (FASE 3 REDISEÑADA)
    participantNavToolbar: {
        backgroundColor: colors.ivoryWarm,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 8,
    },
    navToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    participantSearchWrap: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 10,
        height: 32,
    },
    participantSearchInput: {
        flex: 1,
        fontSize: 12,
        color: colors.atelierBlack,
        paddingVertical: 0,
    },
    statusFilterPills: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    statusFilterPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    statusFilterPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    statusFilterPillText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    statusFilterPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    sequentialNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 8,
    },
    seqNavBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    seqNavBtnDisabled: {
        opacity: 0.35,
    },
    seqNavBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    seqNavBtnTextDisabled: {
        color: '#999',
    },
    activeStudentBadge: {
        flex: 1,
        backgroundColor: '#FAF6F0',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EFE7DC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeStudentBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    activeStudentCounter: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.champagneGold,
    },
    chipsScrollNavWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chipsArrowBtn: {
        width: 30,
        height: 30,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipsArrowBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    compactChipsScroll: {
        gap: 6,
        paddingVertical: 2,
        alignItems: 'center',
    },
    chipCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.sand,
        gap: 6,
    },
    chipCompactSelected: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    chipCompactDone: {
        borderColor: '#81C784',
    },
    chipCompactText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    chipCompactTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    chipDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    chipDotPending: {
        backgroundColor: '#CCC',
    },
    chipDotProgress: {
        backgroundColor: '#F59E0B',
    },
    chipDotDone: {
        backgroundColor: '#2E7D32',
    },
    mainCaptureArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    quickSizeToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        gap: 12,
        flexWrap: 'wrap',
    },
    activePersonSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    demographicMiniPill: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
    },
    demographicMiniPillText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.ivoryWarm,
        letterSpacing: 0.5,
    },
    activePersonNameBold: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    doneBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    doneBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#2E7D32',
    },
    pendingBadge: {
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    pendingBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#D97706',
    },
    quickSizesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    quickSizesLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
    },
    sizePill: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        marginRight: 4,
    },
    sizePillSelected: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    sizePillText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    sizePillTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    clearSizeText: {
        fontSize: 10,
        color: '#C25E5E',
        fontWeight: '600',
    },
    // CUERPO EN 3 PANELES ERGONÓMICOS
    threePanelsContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#F5EFE6',
        padding: 10,
        gap: 10,
    },
    mannequinPanel: {
        flex: 1,
        minWidth: 220,
        maxWidth: 360,
        backgroundColor: '#0B1120',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2A3447',
        overflow: 'hidden',
    },
    measuresListPanel: {
        flex: 1.2,
        minWidth: 260,
        height: 485,
        maxHeight: 500,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'flex-start',
    },
    keypadPanel: {
        width: 290,
        minWidth: 260,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        alignSelf: 'flex-start',
    },
    measuresListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F5EFE6',
        marginBottom: 4,
    },
    measuresListTitle: {
        fontSize: 11,
        fontFamily: typography.serif,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    measuresListSubtitle: {
        fontSize: 9,
        color: colors.textSecondary,
        marginTop: 1,
    },
    configMeasuresBtn: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 4,
    },
    configMeasuresBtnText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    toggleMannequinBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 4,
    },
    toggleMannequinBtnText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    measuresScroll: {
        flex: 1,
        maxHeight: 430,
    },
    measuresScrollContent: {
        paddingBottom: 20,
    },
    templateMeasureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 3.5,
        paddingHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#F0E8DC',
        marginBottom: 3,
        backgroundColor: '#FAF8F5',
    },
    templateMeasureRowSelected: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FDFBF7',
        borderWidth: 1.5,
        shadowColor: colors.champagneGold,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    templateMeasureRowCaptured: {
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
    },
    measureRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    measureIndexBadge: {
        width: 19,
        height: 19,
        borderRadius: 9.5,
        backgroundColor: '#EFE7DC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    measureIndexBadgeSelected: {
        backgroundColor: colors.atelierBlack,
    },
    measureIndexBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureIndexBadgeTextSelected: {
        color: '#FFFFFF',
    },
    measureRowTitle: {
        fontSize: 11,
        lineHeight: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    measureRowTitleSelected: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    measureRowCode: {
        fontSize: 8.5,
        lineHeight: 11,
        color: colors.textMuted,
    },
    measureRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sourceTag: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        marginRight: 6,
    },
    sourceTagDirect: {
        backgroundColor: '#E8F5E9',
    },
    sourceTagSize: {
        backgroundColor: '#FFF8E1',
    },
    sourceTagText: {
        fontSize: 8.5,
        fontWeight: '600',
        color: '#333',
    },
    measureRowVal: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureRowValCaptured: {
        color: '#2E7D32',
    },
    notesContainer: {
        marginTop: 4,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#F0E8DC',
    },
    notesLabel: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    notesInput: {
        backgroundColor: '#FAF8F5',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 5,
        fontSize: 10.5,
        color: colors.atelierBlack,
        minHeight: 32,
        maxHeight: 46,
        textAlignVertical: 'top',
    },
    bottomBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 52,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        zIndex: 10,
    },
    navBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.ivoryWarm,
    },
    navBtnDisabled: {
        opacity: 0.4,
    },
    navBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    navBtnTextDisabled: {
        color: '#AAA',
    },
    bottomActionGroup: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    draftBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.atelierBlack,
        backgroundColor: 'transparent',
    },
    draftBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    completeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: colors.champagneGold,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    completeBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    cadBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    cadBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13,
        color: '#766B62',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#766B62',
    },
});
