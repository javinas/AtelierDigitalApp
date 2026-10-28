// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MODAL DE CAPTURA RÁPIDA DE JORNADA (FASE 3)
// Archivo: src/components/clients/MeasurementCampaignFastCaptureModal.tsx
// ==============================================================================
// Interfaz editorial de alta costura para registrar rápidamente medidas corporales
// de múltiples integrantes de un grupo/núcleo sobre una MeasurementTemplate.
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

    const activeTemplate = useMemo(() => {
        return getMeasurementTemplateById(campaign.template_id) || MEASUREMENT_TEMPLATES[0];
    }, [campaign.template_id]);

    useEffect(() => {
        if (visible) {
            loadCampaignData();
        }
    }, [visible, campaign.id]);

    const loadCampaignData = async () => {
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
    };

    const initPersonState = (part: MeasurementCampaignParticipant) => {
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
    };

    const activeParticipant = participants[currentIndex] || null;
    const activePerson = activeParticipant?.person || null;
    const demoCategory = activePerson?.demographic_category || 'woman';

    // Lista de tallas estándar disponibles para la categoría demográfica activa
    const availableSizes = useMemo(() => {
        return STANDARD_CATEGORIES.find((c) => c.key === demoCategory)?.sizes || [];
    }, [demoCategory]);

    // Medidas activas de la plantilla
    const templateMeasurements: MeasurementCatalogItem[] = useMemo(() => {
        return activeTemplate.measurement_codes
            .map((code) => MEASUREMENT_MAP[code])
            .filter((item): item is MeasurementCatalogItem => Boolean(item));
    }, [activeTemplate]);

    // Seleccionar otra persona de la tira superior
    const handleSelectParticipant = (index: number) => {
        if (index >= 0 && index < participants.length) {
            setCurrentIndex(index);
            initPersonState(participants[index]);
        }
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

                {/* Tira Horizontal de Integrantes (Selector rápido) */}
                <View style={styles.participantsStripContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.participantsStrip}
                    >
                        {participants.map((p, idx) => {
                            const isSelected = idx === currentIndex;
                            const isDone = p.status === 'completed';
                            const isInProgress = p.status === 'in_progress';

                            return (
                                <TouchableOpacity
                                    key={p.person_id || p.id}
                                    style={[
                                        styles.participantChip,
                                        isSelected && styles.participantChipSelected,
                                        isDone && styles.participantChipDone,
                                    ]}
                                    onPress={() => handleSelectParticipant(idx)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.chipTopRow}>
                                        <Text
                                            style={[
                                                styles.chipIndex,
                                                isSelected && { color: colors.champagneGold, fontWeight: '700' },
                                            ]}
                                        >
                                            #{idx + 1}
                                        </Text>
                                        <View
                                            style={[
                                                styles.statusDot,
                                                isDone
                                                    ? styles.statusDotDone
                                                    : isInProgress
                                                    ? styles.statusDotProgress
                                                    : styles.statusDotPending,
                                            ]}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.chipName,
                                            isSelected && styles.chipNameSelected,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {p.person?.full_name || 'Sin nombre'}
                                    </Text>
                                    <Text style={styles.chipCategory}>
                                        {DEMOGRAPHIC_LABELS[p.person?.demographic_category || 'woman']}
                                        {p.standard_size ? ` · Talla ${p.standard_size}` : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando plantilla e integrantes de la jornada...</Text>
                    </View>
                ) : activeParticipant && activePerson ? (
                    /* FORMULARIO EDITORIAL DE CAPTURA */
                    <ScrollView contentContainerStyle={styles.contentScroll}>
                        {/* Tarjeta de la Persona Activa */}
                        <View style={styles.personHeaderCard}>
                            <View style={styles.personCardMain}>
                                <Image
                                    source={DEMOGRAPHIC_AVATARS[activePerson.demographic_category]}
                                    style={styles.personAvatar}
                                    resizeMode="cover"
                                />
                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <View style={styles.badgeRow}>
                                        <View style={styles.demographicBadge}>
                                            <Text style={styles.demographicBadgeText}>
                                                {DEMOGRAPHIC_LABELS[activePerson.demographic_category].toUpperCase()}
                                            </Text>
                                        </View>
                                        {activePerson.reference_id ? (
                                            <View style={styles.refBadge}>
                                                <Text style={styles.refBadgeText}>CÓDIGO: {activePerson.reference_id}</Text>
                                            </View>
                                        ) : null}
                                        <View
                                            style={[
                                                styles.captureStatusBadge,
                                                activeParticipant.status === 'completed'
                                                    ? styles.statusBadgeDone
                                                    : activeParticipant.status === 'in_progress'
                                                    ? styles.statusBadgeProgress
                                                    : styles.statusBadgePending,
                                            ]}
                                        >
                                            <Text style={styles.captureStatusBadgeText}>
                                                {activeParticipant.status === 'completed'
                                                    ? '✓ MEDIDAS COMPLETAS'
                                                    : activeParticipant.status === 'in_progress'
                                                    ? '⏳ BORRADOR EN CURSO'
                                                    : '○ PENDIENTE DE MEDICIÓN'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.personFullName}>{activePerson.full_name}</Text>
                                    {activePerson.notes ? (
                                        <Text style={styles.personSubnotes}>Notas anatómicas: {activePerson.notes}</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Barra Rápida de Talla Estándar */}
                            <View style={styles.quickSizeSection}>
                                <View style={styles.quickSizeHeader}>
                                    <Text style={styles.quickSizeLabel}>AUTOCOMPLETAR CON TALLA ESTÁNDAR DE REFERENCIA:</Text>
                                    {standardSize ? (
                                        <TouchableOpacity onPress={() => setStandardSize(null)}>
                                            <Text style={styles.clearSizeText}>✕ Quitar talla ({standardSize})</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                <View style={styles.sizesRow}>
                                    {availableSizes.map((sz: string) => {
                                        const isSelected = standardSize === sz;
                                        return (
                                            <TouchableOpacity
                                                key={sz}
                                                style={[styles.sizePill, isSelected && styles.sizePillSelected]}
                                                onPress={() => handleApplyStandardSize(sz)}
                                                activeOpacity={0.8}
                                            >
                                                <Text
                                                    style={[
                                                        styles.sizePillText,
                                                        isSelected && styles.sizePillTextSelected,
                                                    ]}
                                                >
                                                    {sz}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        {/* Banner de Mensaje de Éxito */}
                        {successMessage && (
                            <View style={styles.successBanner}>
                                <Text style={styles.successBannerText}>{successMessage}</Text>
                            </View>
                        )}

                        {/* Cuadrícula de Medidas de la Plantilla */}
                        <View style={styles.measurementsSection}>
                            <View style={styles.measurementsHeaderRow}>
                                <Text style={styles.measurementsSectionTitle}>
                                    MEDIDAS REQUERIDAS POR LA PLANTILLA ({templateMeasurements.length})
                                </Text>
                                <Text style={styles.measurementsSectionSubtitle}>
                                    Los campos editados se registran como medidas directas individuales.
                                </Text>
                            </View>

                            <View style={styles.measurementsGrid}>
                                {templateMeasurements.map((m) => {
                                    const entry = capturedValues[m.code];
                                    const valStr = entry !== undefined ? String(entry.value) : '';
                                    const isEstimated = entry?.source === 'estimated';
                                    const isDirect = entry?.source === 'direct';

                                    return (
                                        <View key={m.code} style={styles.measurementCard}>
                                            <View style={styles.measurementCardTop}>
                                                <Text style={styles.measurementCode}>{m.code}</Text>
                                                {entry ? (
                                                    <View
                                                        style={[
                                                            styles.sourceBadge,
                                                            isEstimated ? styles.sourceBadgeEst : styles.sourceBadgeDir,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.sourceBadgeText,
                                                                isEstimated
                                                                    ? styles.sourceBadgeTextEst
                                                                    : styles.sourceBadgeTextDir,
                                                            ]}
                                                        >
                                                            {isEstimated ? 'Talla' : 'Directa'}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            <Text style={styles.measurementLabel} numberOfLines={1}>
                                                {m.name}
                                            </Text>
                                            <Text style={styles.measurementDesc} numberOfLines={1}>
                                                {m.instructions || ''}
                                            </Text>

                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    style={styles.textInput}
                                                    keyboardType="numeric"
                                                    value={valStr}
                                                    placeholder="0.0"
                                                    placeholderTextColor="#B0A398"
                                                    onChangeText={(text) => handleMeasurementChange(m.code, text)}
                                                />
                                                <Text style={styles.unitSuffix}>{campaign.unit_system}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Observaciones y Notas Específicas */}
                        <View style={styles.notesBox}>
                            <Text style={styles.notesLabel}>OBSERVACIONES DE CONFECCIÓN / AJUSTES POSTURALES:</Text>
                            <TextInput
                                style={styles.notesInput}
                                multiline
                                numberOfLines={2}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Anotaciones sobre hombro caído, lordosis, holgura deseada..."
                                placeholderTextColor="#B0A398"
                            />
                        </View>
                    </ScrollView>
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
                    >
                        <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
                            ← Anterior
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.bottomActionGroup}>
                        <TouchableOpacity
                            style={styles.draftBtn}
                            onPress={() => handleSave('in_progress')}
                            disabled={saving}
                            activeOpacity={0.8}
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
                        >
                            <Text style={styles.completeBtnText}>
                                {saving ? 'Digitalizando...' : '✓ Finalizar Medidas'}
                            </Text>
                        </TouchableOpacity>

                        {activePerson && (
                            <TouchableOpacity
                                style={styles.cadBtn}
                                onPress={() => setShowCadModal(true)}
                                disabled={saving}
                                activeOpacity={0.85}
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
                    >
                        <Text
                            style={[
                                styles.navBtnText,
                                currentIndex >= participants.length - 1 && styles.navBtnTextDisabled,
                            ]}
                        >
                            Siguiente →
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Modal de Fichas Imprimibles */}
                {showPrintModal && (
                    <PrintableMeasurementSheetModal
                        visible={showPrintModal}
                        campaign={campaign}
                        template={activeTemplate}
                        participants={participants}
                        clientName={client.full_name}
                        onClose={() => setShowPrintModal(false)}
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
    participantsStripContainer: {
        backgroundColor: colors.ivoryWarm,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        paddingVertical: 10,
    },
    participantsStrip: {
        paddingHorizontal: 24,
        gap: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    participantChip: {
        width: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 8,
    },
    participantChipSelected: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FBF8F2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    participantChipDone: {
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
    },
    chipTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    chipIndex: {
        fontSize: 9,
        color: '#888',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusDotPending: {
        backgroundColor: '#DDD',
    },
    statusDotProgress: {
        backgroundColor: '#D97706',
    },
    statusDotDone: {
        backgroundColor: colors.champagneGold,
    },
    chipName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    chipNameSelected: {
        color: colors.champagneGold,
    },
    chipCategory: {
        fontSize: 9,
        color: '#766B62',
        marginTop: 2,
    },
    contentScroll: {
        padding: 24,
    },
    personHeaderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 16,
    },
    personCardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    personAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.ivoryWarm,
        borderWidth: 2,
        borderColor: colors.champagneGold,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        marginBottom: 4,
    },
    demographicBadge: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
    },
    demographicBadgeText: {
        color: colors.ivoryWarm,
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    refBadge: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
    },
    refBadgeText: {
        fontSize: 8,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    captureStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
    },
    statusBadgePending: {
        backgroundColor: '#F3EFE9',
    },
    statusBadgeProgress: {
        backgroundColor: '#FEF3C7',
    },
    statusBadgeDone: {
        backgroundColor: '#F5EBDD',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    captureStatusBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    personFullName: {
        fontSize: 18,
        fontFamily: typography.serif,
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    personSubnotes: {
        fontSize: 11,
        color: '#766B62',
        marginTop: 2,
    },
    quickSizeSection: {
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingTop: 12,
    },
    quickSizeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickSizeLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
    },
    clearSizeText: {
        fontSize: 10,
        color: '#C25E5E',
        fontWeight: '600',
    },
    sizesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    sizePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    sizePillSelected: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    sizePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    sizePillTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    successBanner: {
        backgroundColor: '#F5EBDD',
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 4,
        marginBottom: 16,
    },
    successBannerText: {
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    measurementsSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 16,
    },
    measurementsHeaderRow: {
        marginBottom: 14,
    },
    measurementsSectionTitle: {
        fontSize: 12,
        fontFamily: typography.serif,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    measurementsSectionSubtitle: {
        fontSize: 10,
        color: '#766B62',
        marginTop: 2,
    },
    measurementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    measurementCard: {
        width: '31%',
        minWidth: 180,
        backgroundColor: colors.ivoryWarm,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 10,
    },
    measurementCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    measurementCode: {
        fontSize: 10,
        fontFamily: 'monospace',
        fontWeight: '700',
        color: colors.champagneGold,
    },
    sourceBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
    },
    sourceBadgeEst: {
        backgroundColor: '#EBE3D7',
    },
    sourceBadgeDir: {
        backgroundColor: '#D9C8B5',
    },
    sourceBadgeText: {
        fontSize: 8,
        fontWeight: '600',
    },
    sourceBadgeTextEst: {
        color: '#766B62',
    },
    sourceBadgeTextDir: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    measurementLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    measurementDesc: {
        fontSize: 9,
        color: '#888',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        padding: 0,
    },
    unitSuffix: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
        marginLeft: 4,
    },
    notesBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
        marginBottom: 20,
    },
    notesLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    notesInput: {
        backgroundColor: colors.ivoryWarm,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 10,
        fontSize: 12,
        color: colors.atelierBlack,
        minHeight: 50,
        textAlignVertical: 'top',
    },
    bottomBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingHorizontal: 24,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.ivoryWarm,
    },
    navBtnDisabled: {
        opacity: 0.4,
    },
    navBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    navBtnTextDisabled: {
        color: '#AAA',
    },
    bottomActionGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    draftBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.atelierBlack,
        backgroundColor: 'transparent',
    },
    draftBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    completeBtn: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 4,
        backgroundColor: colors.champagneGold,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    completeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    cadBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    cadBtnText: {
        fontSize: 12,
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
