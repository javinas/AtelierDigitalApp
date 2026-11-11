// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: PRENDA, SILUETA Y MEDIDAS DE REFERENCIA (M02.04/M02.05)
// Archivo: src/components/pattern/PatternStudioGarmentTab.tsx
// ==============================================================================

import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    REFERENCE_CATEGORIES,
    getProfilesByCategory,
    findReferenceProfile,
    DEFAULT_REFERENCE_PROFILE,
} from '../../engine/pattern/catalog/referenceProfiles';
import { styles } from './patternModuleStyles';
import { GarmentSelectionGrid } from './GarmentSelectionGrid';
import {
    GarmentType,
    PatternExecution,
} from '../../types/pattern/pattern';
import { Client } from '../../types/client';
import { Creation } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import {
    CreationGarmentCard,
    ZoomTarget,
} from './creationFlow/CreationFlowViews';

export interface PatternStudioGarmentTabProps {
    activeWorkflow: string;
    selectedReferenceDemographic: any;
    handleSelectReferenceDemographic: (catId: any) => void;
    setSelectedReferenceDemographic: (catId: any) => void;
    setSelectedReferenceProfileCode: (code: string) => void;
    setIsCustomMeasurementsOpen: (open: boolean) => void;
    selectedReferenceProfileCode: string;
    currentExecution: PatternExecution | null;
    setCurrentExecution: (exec: PatternExecution | null) => void;
    setPatternStatus: (status: any) => void;
    setStatusMessage: (msg: any) => void;
    freeMeasurements: Record<string, number>;
    setFreeMeasurements: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    selectedCreation: Creation | null;
    garmentType: GarmentType;
    geometryResult: PatternGeometryResult | null;
    creationFlowSummary: any;
    setActiveInfoKind: (kind: any) => void;
    handleSelectCreationStage: (stage: any) => void;
    setCreationZoomTarget: (z: ZoomTarget | null) => void;
    handleSelectGarmentInGrid: (garment: any) => void;
    setActiveStudioTab: (tab: any) => void;
    activeMeasurementsMm: Record<string, number>;
    selectedClient: Client | null;
    freePatternProfileLabel: string;
    selectedSession: MeasurementSession | null;
}

export const PatternStudioGarmentTab: React.FC<PatternStudioGarmentTabProps> = ({
    activeWorkflow,
    selectedReferenceDemographic,
    handleSelectReferenceDemographic,
    setSelectedReferenceDemographic,
    setSelectedReferenceProfileCode,
    setIsCustomMeasurementsOpen,
    selectedReferenceProfileCode,
    currentExecution,
    setCurrentExecution,
    setPatternStatus,
    setStatusMessage,
    freeMeasurements,
    setFreeMeasurements,
    selectedCreation,
    garmentType,
    geometryResult,
    creationFlowSummary,
    setActiveInfoKind,
    handleSelectCreationStage,
    setCreationZoomTarget,
    handleSelectGarmentInGrid,
    setActiveStudioTab,
    activeMeasurementsMm,
    selectedClient,
    freePatternProfileLabel,
    selectedSession,
}) => {
    return (
        <View style={styles.tabContentArea}>
            {/* FLUJO D: NUEVA ZONA EDITORIAL MEDIDAS DE REFERENCIA & PERFIL ANATÓMICO */}
            {activeWorkflow === 'free_pattern' && (
                <View style={styles.freePatternReferenceSection}>
                    {/* Cabecera Editorial */}
                    <View style={styles.referenceSectionHeader}>
                        <View style={styles.referenceSectionBadgeRow}>
                            <Text style={styles.referenceSectionBadge}>
                                PASO 01 · MEDIDAS DE REFERENCIA & PERFIL ANATÓMICO
                            </Text>
                            <View style={styles.referenceSectionStartBadge}>
                                <Text style={styles.referenceSectionStartBadgeText}>
                                    ✦ PUNTO DE PARTIDA — AÚN SIN PATRÓN GENERADO
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.referenceSectionTitle}>
                            Medidas de Referencia & Perfil Anatómico
                        </Text>
                        <Text style={styles.referenceSectionSubtitle}>
                            Seleccione un perfil anatómico normalizado como punto de partida antropométrico. Esta configuración previa no genera ni aprueba automáticamente ningún patrón.
                        </Text>
                        <View style={styles.referenceSectionNoteBox}>
                            <Text style={styles.referenceSectionNoteIcon}>ℹ</Text>
                            <Text style={styles.referenceSectionNoteText}>
                                <Text style={{ fontWeight: '700', color: '#171411' }}>Medidas sugeridas de referencia: </Text>
                                Las medidas de referencia son orientativas y pueden variar según sistema de tallaje, país, fabricante y morfología. La diseñadora puede modificarlas antes de generar el patrón.
                            </Text>
                        </View>
                    </View>

                    {/* Selector de Categorías Demográficas (Mujer, Hombre, Niña, Niño, Cotas Libres) */}
                    <View style={styles.referenceDemographicTabs}>
                        {REFERENCE_CATEGORIES.map((cat) => {
                            const isActive = selectedReferenceDemographic === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.referenceDemographicTab,
                                        isActive && styles.referenceDemographicTabActive,
                                    ]}
                                    onPress={() => handleSelectReferenceDemographic(cat.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.referenceDemographicTabIcon}>{cat.icon}</Text>
                                    <View style={{ flexShrink: 1 }}>
                                        <Text
                                            style={[
                                                styles.referenceDemographicTabText,
                                                isActive && styles.referenceDemographicTabTextActive,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                        <Text style={styles.referenceDemographicTabSub}>
                                            {cat.subtitle.split('·')[0].trim()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Si la categoría es Cotas Libres */}
                    {selectedReferenceDemographic === 'custom' ? (
                        <View style={styles.customMeasurementsPromptCard}>
                            <View style={styles.customMeasurementsPromptHeader}>
                                <View style={styles.customPromptIconWrap}>
                                    <Text style={styles.customPromptIcon}>✏️</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.customPromptTitle}>
                                        PERFIL PERSONALIZADO · COTAS LIBRES
                                    </Text>
                                    <Text style={styles.customPromptSubtitle}>
                                        Ingreso libre de cotas milimétricas para prototipos experimentales y geometrías de sastre exclusivas.
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.customPromptDesc}>
                                Puede reemplazar completamente las medidas de referencia y definir parámetros únicos de contorno, aplomo y longitud. Estas cotas se reflejarán de inmediato en el maniquí anatómico y en la mesa CAD.
                            </Text>
                            <View style={styles.customPromptActionsRow}>
                                <TouchableOpacity
                                    style={styles.customPromptPrimaryBtn}
                                    onPress={() => {
                                        setSelectedReferenceProfileCode('custom');
                                        setIsCustomMeasurementsOpen(true);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.customPromptPrimaryBtnText}>
                                        ✏️ Cotas personalizadas → Introducir medidas
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* Selector de Tallas de la Categoría Activa */
                        <View style={styles.referenceSizesCard}>
                            <View style={styles.referenceSizesTopRow}>
                                <Text style={styles.referenceSizesHeaderLabel}>
                                    TALLAS SUGERIDAS ({selectedReferenceDemographic === 'woman' ? 'MUJER' : selectedReferenceDemographic === 'man' ? 'HOMBRE' : selectedReferenceDemographic === 'girl' ? 'NIÑA' : 'NIÑO'}):
                                </Text>
                                <Text style={styles.referenceSizesHint}>
                                    Punto de partida orientativo · Modificable
                                </Text>
                            </View>

                            <View style={styles.referenceSizeChipsRow}>
                                {getProfilesByCategory(selectedReferenceDemographic).map((prof) => {
                                    const isSelected = selectedReferenceProfileCode === prof.code;
                                    return (
                                        <TouchableOpacity
                                            key={prof.code}
                                            style={[
                                                styles.referenceSizeChip,
                                                isSelected && styles.referenceSizeChipActive,
                                            ]}
                                            onPress={() => {
                                                if (activeWorkflow === 'free_pattern' && currentExecution && currentExecution.status === 'approved_by_designer') {
                                                    setCurrentExecution({ ...currentExecution, status: 'needs_revision' });
                                                    setPatternStatus('needs_revision');
                                                    setStatusMessage({
                                                        text: 'Talla de referencia modificada: La aprobación previa ha quedado revocada. El patrón vuelve a estado EN REVISIÓN.',
                                                        type: 'info',
                                                    });
                                                }
                                                setSelectedReferenceProfileCode(prof.code);
                                                setFreeMeasurements({ ...prof.measurementsMm });
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.referenceSizeChipText,
                                                    isSelected && styles.referenceSizeChipTextActive,
                                                ]}
                                            >
                                                {prof.sizeLabel}
                                            </Text>
                                            {prof.equivalency ? (
                                                <Text
                                                    style={[
                                                        styles.referenceSizeChipEquiv,
                                                        isSelected && styles.referenceSizeChipEquivActive,
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {prof.equivalency.replace('Equivalente ', '')}
                                                </Text>
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Ficha Anatómica de la Talla Seleccionada */}
                            {(() => {
                                const currentProfile = findReferenceProfile(selectedReferenceProfileCode) || DEFAULT_REFERENCE_PROFILE;
                                const m = freeMeasurements;
                                return (
                                    <View style={styles.selectedProfileDossier}>
                                        <View style={styles.selectedProfileDossierHeader}>
                                            <View style={{ flex: 1 }}>
                                                <View style={styles.selectedProfileBadgeRow}>
                                                    <Text style={styles.selectedProfileBadge}>
                                                        PERFIL DE REFERENCIA · {currentProfile.label.toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={styles.selectedProfileTitle}>
                                                    {currentProfile.subtitle}
                                                </Text>
                                                <Text style={styles.selectedProfileDesc}>
                                                    {currentProfile.description}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Cuadrícula de Medidas Sugeridas Principales en CM */}
                                        <View style={styles.selectedProfileMeasuresGrid}>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>BUSTO / PECHO</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.contorno_busto ? `${(m.contorno_busto / 10).toFixed(1)} cm` : (m.contorno_pecho ? `${(m.contorno_pecho / 10).toFixed(1)} cm` : '—')}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>CINTURA</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.contorno_cintura ? `${(m.contorno_cintura / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>CADERA</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.contorno_cadera ? `${(m.contorno_cadera / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>CUELLO</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.contorno_cuello ? `${(m.contorno_cuello / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>TALLE ESPALDA</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.largo_talle_espalda ? `${(m.largo_talle_espalda / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>HOMBRO</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.largo_hombro ? `${(m.largo_hombro / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>BRAZO</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.largo_brazo ? `${(m.largo_brazo / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProfileMeasureCol}>
                                                <Text style={styles.spmLabel}>ALTURA TIRO</Text>
                                                <Text style={styles.spmVal}>
                                                    {m.altura_tiro ? `${(m.altura_tiro / 10).toFixed(1)} cm` : '—'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Acciones de la Ficha: Usar como referencia / Editar medidas */}
                                        <View style={styles.selectedProfileActionsRow}>
                                            <TouchableOpacity
                                                style={styles.useProfileReferenceBtn}
                                                onPress={() => {
                                                    setStatusMessage({
                                                        text: `✓ Perfil ${currentProfile.label} activado como referencia técnica. Proceda a seleccionar la prenda o silueta.`,
                                                        type: 'success',
                                                    });
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.useProfileReferenceBtnText}>
                                                    Usar como referencia →
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.editProfileReferenceBtn}
                                                onPress={() => {
                                                    setIsCustomMeasurementsOpen(true);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.editProfileReferenceBtnText}>
                                                    ✏️ Editar medidas
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.customSwitchBtn}
                                                onPress={() => {
                                                    setSelectedReferenceDemographic('custom');
                                                    setSelectedReferenceProfileCode('custom');
                                                    setIsCustomMeasurementsOpen(true);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.customSwitchBtnText}>
                                                    Cotas personalizadas → Introducir medidas
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>
                    )}
                </View>
            )}

            {/* Resumen Visual de Alta Costura de la Prenda (Flujo C) */}
            {activeWorkflow === 'creation_pattern' && (
                <View style={{ marginBottom: 16 }}>
                    <CreationGarmentCard
                        garmentType={garmentType}
                        registeredInCreation={!!selectedCreation?.garment_type}
                        generatedPieces={geometryResult ? geometryResult.pieces.length : null}
                        summary={creationFlowSummary}
                        onOpenInfo={() => setActiveInfoKind('garment')}
                        onContinue={() => handleSelectCreationStage('pattern')}
                        onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                    />
                </View>
            )}

            {/* Cuadrícula Visual de Prendas (GarmentSelectionGrid) */}
            <GarmentSelectionGrid
                selectedGarment={garmentType}
                onSelectGarment={handleSelectGarmentInGrid}
                onProceedToCad={() => setActiveStudioTab('cad')}
                generatedPiecesCount={
                    currentExecution?.garment_type === garmentType && geometryResult
                        ? geometryResult.pieces.length
                        : undefined
                }
                activeMeasurementsMm={activeMeasurementsMm}
                clientName={activeWorkflow === 'free_pattern' ? undefined : selectedClient?.full_name}
                sessionLabel={
                    activeWorkflow === 'free_pattern'
                        ? `Perfil: ${freePatternProfileLabel}`
                        : (selectedSession ? `v${selectedSession.version_number}` : undefined)
                }
            />
        </View>
    );
};

