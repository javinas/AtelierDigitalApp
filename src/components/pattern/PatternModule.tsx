// ==============================================================================
// ATELIER DIGITAL — COMPONENTE MAESTRO: MÓDULO 02 — PATRONAJE PARAMÉTRICO
// Archivo: src/components/pattern/PatternModule.tsx
// ==============================================================================
// Orquesta el flujo completo de alta costura:
// Clienta → Sesión de Medidas → Prenda → Validación → Holguras → Motor → Geometría → Exportación
// ==============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import {
    GARMENT_PACKAGES,
    validateGarmentRequirements,
    classifyTemplateMeasurements,
    TemplateMeasurementDiagnostic,
} from '../../engine/pattern/catalog/garmentPackages';
import {
    MEASUREMENT_MAP,
    analyzeSessionMeasurements,
    classifyMeasurementCode,
    TOTAL_APPLICABLE_BODY_MEASUREMENTS,
    WORKSHOP_PARAMETER_DEFINITIONS,
    WORKSHOP_PARAMETER_CODES,
    TOTAL_MANNEQUIN_COTAS,
} from '../../engine/pattern/catalog/masterCatalog';
import { BodyDemographicType } from '../../engine/pattern/catalog/anatomicalMapping';
import {
    ReferenceDemographic,
    REFERENCE_CATEGORIES,
    getProfilesByCategory,
    findReferenceProfile,
    DEFAULT_REFERENCE_PROFILE,
    ReferenceProfile,
} from '../../engine/pattern/catalog/referenceProfiles';
import { executePatternEngine } from '../../engine/pattern/engine';
import { exportPatternToDxf, validateGeometryForCadExport } from '../../engine/pattern/export/dxfExporter';
import { generateTiledPrintHtml } from '../../engine/pattern/export/pdfTiledExporter';
import { exportPatternToSvg } from '../../engine/pattern/export/svgExporter';
import { roundTo } from '../../engine/pattern/geometry/geometry2d';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { fetchClients } from '../../services/clientService';
import {
    fetchClientMeasurementSessions,
    finalizeMeasurementSession,
} from '../../services/measurementService';
import {
    approvePatternExecution,
    comparePatternExecutions,
    createMultiAdjustedChildExecution,
    fetchClientPatternExecutions,
    fetchExecutionLineage,
    fetchPatternAdjustments,
    fetchPatternTemplates,
    PatternComparisonResult,
    savePatternExecution,
    STANDARD_EASE_PROFILES,
    HAUTE_COUTURE_REFERENCE_PROFILES,
    updatePatternStatus,
    validatePatternAdjustmentInput,
} from '../../services/patternService';
import { fetchCreations, linkPatternExecutionToCreation, updateCreation } from '../../services/creationService';
import { Creation } from '../../types/creation';
import { supabase } from '../../supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import { EaseProfile, GarmentDesignParameters } from '../../types/pattern/ease';
import { MeasurementSession } from '../../types/pattern/measurement';
import {
    AdjustmentAction,
    AdjustmentDirection,
    AdjustmentNature,
    AdjustmentType,
    AdjustmentUnit,
    FIT_ADJUSTMENT_TYPES,
    FitAdjustmentCode,
    FITTING_DIAGNOSTIC_ZONES,
    FittingDiagnosticZoneCode,
    FittingStatus,
    GarmentType,
    PatternAdjustment,
    PatternExecution,
    PatternStatus,
    PatternTemplate,
    PatternValidationResult,
    PhysicalFittingResult,
    PhysicalFittingSession,
    StructuredPatternAdjustment,
    TECHNICAL_LOCATIONS,
} from '../../types/pattern/pattern';
import { AICopilotModal } from './AICopilotModal';
import { AtelierClientSelector } from './AtelierClientSelector';
import { AtelierClientAnatomyWorkspace } from './AtelierClientAnatomyWorkspace';
import { AtelierMannequinDisplay } from './AtelierMannequinDisplay';
import { AtelierGrandAnatomicalMannequin } from './AtelierGrandAnatomicalMannequin';
import { AtelierMeasurementGuideModal } from './AtelierMeasurementGuideModal';
import { getCategoryCoutureIcon, IconBodyRuler, IconInfoGuide } from './AtelierCoutureIcons';
import {
    getMeasurementCoverageDetail,
    exportCoverageMatrixCsv,
} from '../../engine/pattern/catalog/anatomicalCoverageMatrix';
import {
    printAnatomicalDossier,
    generateStandaloneMannequinSvg,
    generateMeasurementsCsv,
    downloadFileInBrowser,
} from '../../engine/pattern/export/measurementSessionExporter';
import { AnatomicalPerspective } from '../../engine/pattern/catalog/anatomicalMapping';
import { GarmentSelectionGrid } from './GarmentSelectionGrid';
import { MeasurementSessionModal } from './MeasurementSessionModal';
import { PatternAdjustmentsModal } from './PatternAdjustmentsModal';
import { PatternPreviewCanvas } from './PatternPreviewCanvas';
import { ProductionDossierModal } from './ProductionDossierModal';
import {
    CREATION_STAGES,
    CreationFlowSummary,
    CreationStageId,
    CreationTimelineNode,
    GarmentMeasureDiagnosis,
    STAGE_TO_STUDIO_TAB,
    studioTabToStage,
    buildCreationTimeline,
    deriveCreationFlowSummary,
    deriveGarmentMeasureDiagnosis,
    isKnownGarmentType,
    resolveActiveExecution,
    evaluateFittingTransition,
    evaluateApprovalTransition,
    mergeExecutionHistory,
    CREATION_STATUS_LABELS,
    CREATION_TYPE_LABELS,
    describeSession,
    formatShortDateEs,
} from './creationFlow/creationFlowModel';
import {
    CreationContextBar,
    CreationStepper,
    CreationHero,
    ReadinessCard,
    AnatomyDiagnosisCard,
    CreationGarmentCard,
    CreationFittingNotebook,
    CreationDossierOverview,
    CreationTimeline,
    ZoomableImageModal,
    InfoSheet,
    InfoRow,
    ZoomTarget,
    ContextInfoKind,
    CreationEntrySelector,
    GARMENT_PIECE_COUNTS,
} from './creationFlow/CreationFlowViews';

const GARMENT_EDITORIAL_IMAGES: Record<string, any> = {
    skirt: require('../../../assets/garments/skirt.jpg'),
    bodice: require('../../../assets/garments/bodice.jpg'),
    pants: require('../../../assets/garments/pants.jpg'),
    dress: require('../../../assets/garments/dress.jpg'),
    sleeve: require('../../../assets/garments/sleeve.jpg'),
    blouse: require('../../../assets/garments/blouse.jpg'),
    shirt: require('../../../assets/garments/shirt.jpg'),
    corset: require('../../../assets/garments/corset.jpg'),
    jacket: require('../../../assets/garments/jacket.jpg'),
    coat: require('../../../assets/garments/coat.jpg'),
    shirt_dress: require('../../../assets/garments/shirt_dress.jpg'),
    tailored_vest: require('../../../assets/garments/tailored_vest.jpg'),
    short: require('../../../assets/garments/short.jpg'),
    cargo_pants: require('../../../assets/garments/cargo_pants.jpg'),
    trench_coat: require('../../../assets/garments/trench_coat.jpg'),
    atelier_robe: require('../../../assets/garments/atelier_robe.jpg'),
    evening_gown: require('../../../assets/garments/evening_gown.jpg'),
    bridal_gown: require('../../../assets/garments/bridal_gown.jpg'),
    draped_asymmetric_dress: require('../../../assets/garments/draped_asymmetric_dress.jpg'),
    bomber_jacket: require('../../../assets/garments/bomber_jacket.jpg'),
    denim_couture_jacket: require('../../../assets/garments/denim_couture_jacket.jpg'),
};

// Fotografías editoriales de la Casa de Alta Costura — Portada Módulo 02
const PATTERN_HERO_IMAGE = require('../../../assets/service_couture.jpg');
// Fotografías técnicas exclusivas del Módulo 02 · Motor de Patronaje
const PATTERN_CLIENTS_IMAGE = require('../../../assets/patterns/pattern_clients.jpg');
const PATTERN_DIRECT_IMAGE = require('../../../assets/patterns/pattern_direct.jpg');
const PATTERN_CREATIONS_IMAGE = require('../../../assets/patterns/pattern_creations.jpg');
const PATTERN_ARCHIVE_IMAGE = require('../../../assets/patterns/pattern_archive.jpg');
const PATTERN_FREE_IMAGE = require('../../../assets/patterns/pattern_free.jpg');
const PATTERN_FREE_HERO_IMAGE = require('../../../assets/patterns/pattern_free_hero.jpg');

const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
        const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = clean.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const localDate = new Date(y, m, d);
            return localDate.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        }
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return String(dateStr);
    }
};

const formatSessionDate = (d?: string | null): string => {
    if (!d) return 'Sin fecha';
    const clean = d.includes('T') ? d.split('T')[0] : d;
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
};

import {
    MEASURE_CATEGORIES_DEFINITION,
    MeasureCategoryDefinition,
} from '../../engine/pattern/catalog/measurementCategories';

// Segregación canónica de cotas: 'Medidas corporales' vs 'Medidas de diseño' vs 'Parámetros de taller' (PARÁMETROS DE TALLER)

interface PatternModuleProps {
    onBack: () => void;
    titleBack?: string;
    initialClientId?: string | null;
    initialSessionId?: string | null;
    initialCreationId?: string | null;
    initialGarmentType?: GarmentType | null;
    initialWorkflow?: 'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern' | null;
}

export function PatternModule({
    onBack,
    titleBack = '← Volver al Atelier',
    initialClientId,
    initialSessionId,
    initialCreationId,
    initialGarmentType,
    initialWorkflow,
}: PatternModuleProps) {
    const { role, user, profile } = useAuth();

    // 0. Modo de Flujo Funcional del Módulo 02 (Flujos A, B, C, D)
    const [activeWorkflow, setActiveWorkflow] = useState<'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern'>(
        initialWorkflow || (initialCreationId ? 'creation_pattern' : 'hub')
    );

    // Referencias para callbacks asíncronos (siempre leen el valor vigente)
    const activeWorkflowRef = useRef(activeWorkflow);
    activeWorkflowRef.current = activeWorkflow;

    useEffect(() => {
        if (initialWorkflow && initialWorkflow !== activeWorkflow) {
            setActiveWorkflow(initialWorkflow);
        }
    }, [initialWorkflow]);

    // true cuando la diseñadora eligió clienta+creación de forma explícita (o llegó por enlace directo)
    const creationContextConfirmedRef = useRef<boolean>(!!initialCreationId);

    // Flujo C: Creaciones de clienta
    const [clientCreations, setClientCreations] = useState<Creation[]>([]);
    const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null);
    const [loadingCreations, setLoadingCreations] = useState<boolean>(false);
    const [activeCreationStage, setActiveCreationStage] = useState<CreationStageId>('creation');
    const [creationZoomTarget, setCreationZoomTarget] = useState<ZoomTarget | null>(null);
    const [activeInfoKind, setActiveInfoKind] = useState<ContextInfoKind | null>(null);

    // Flujo D: Perfiles de Referencia y Medidas Libres (Alta Costura)
    const [selectedReferenceDemographic, setSelectedReferenceDemographic] = useState<ReferenceDemographic>('woman');
    const [selectedReferenceProfileCode, setSelectedReferenceProfileCode] = useState<string>('woman_m');
    const [freeMeasurements, setFreeMeasurements] = useState<Record<string, number>>(
        DEFAULT_REFERENCE_PROFILE.measurementsMm
    );
    const freePatternProfileLabel = useMemo(() => {
        if (selectedReferenceProfileCode === 'custom') return 'Cotas Personalizadas';
        const ref = findReferenceProfile(selectedReferenceProfileCode);
        if (ref) return ref.label;
        const legacy = HAUTE_COUTURE_REFERENCE_PROFILES.find((p) => p.code === selectedReferenceProfileCode);
        return legacy ? legacy.label : selectedReferenceProfileCode.toUpperCase();
    }, [selectedReferenceProfileCode]);

    const currentReferenceProfile = useMemo(() => {
        return findReferenceProfile(selectedReferenceProfileCode) || DEFAULT_REFERENCE_PROFILE;
    }, [selectedReferenceProfileCode]);

    const freePatternShortSubtitle = useMemo(() => {
        if (selectedReferenceProfileCode === 'custom') {
            return 'COTAS LIBRES';
        }
        const prof = findReferenceProfile(selectedReferenceProfileCode);
        if (!prof) return 'MUJER · M · TALLA 40';
        if (prof.category === 'woman') {
            const equiv = prof.equivalency ? prof.equivalency.split('/')[0].replace('Equivalente', '').trim() : '';
            return `MUJER · ${prof.sizeLabel}${equiv ? ` · ${equiv}` : ''}`.toUpperCase();
        }
        if (prof.category === 'man') {
            const equiv = prof.equivalency ? prof.equivalency.split('/')[0].replace('Equivalente', '').trim() : '';
            return `HOMBRE · ${prof.sizeLabel}${equiv ? ` · ${equiv}` : ''}`.toUpperCase();
        }
        if (prof.category === 'girl') {
            return `NIÑA · TALLA ${prof.sizeLabel}`.toUpperCase();
        }
        if (prof.category === 'boy') {
            return `NIÑO · TALLA ${prof.sizeLabel}`.toUpperCase();
        }
        return prof.label.toUpperCase();
    }, [selectedReferenceProfileCode]);

    const handleSelectReferenceDemographic = (demoId: BodyDemographicType | 'custom') => {
        setSelectedReferenceDemographic(demoId);
        if (activeWorkflow === 'free_pattern' && currentExecution && currentExecution.status === 'approved_by_designer') {
            setCurrentExecution({ ...currentExecution, status: 'needs_revision' });
            setPatternStatus('needs_revision');
            setStatusMessage({
                text: 'Perfil anatómico modificado: La aprobación previa ha quedado revocada. El patrón vuelve a estado EN REVISIÓN.',
                type: 'info',
            });
        }
        if (demoId === 'custom') {
            setSelectedReferenceProfileCode('custom');
        } else {
            const profiles = getProfilesByCategory(demoId);
            if (profiles.length > 0) {
                const defaultForCat = profiles.find((p) => p.sizeLabel === 'M' || p.sizeLabel === '8' || p.sizeLabel === '10') || profiles[0];
                setSelectedReferenceProfileCode(defaultForCat.code);
                setFreeMeasurements({ ...defaultForCat.measurementsMm });
            }
        }
    };

    // Flujo D: Asociaciones posteriores opcionales (no bloqueantes)
    const [associatedClientId, setAssociatedClientId] = useState<string | null>(null);
    const [associatedClientName, setAssociatedClientName] = useState<string | null>(null);
    const [associatedCreationId, setAssociatedCreationId] = useState<string | null>(null);
    const [associatedCreationName, setAssociatedCreationName] = useState<string | null>(null);
    const [isLinkClientModalOpen, setIsLinkClientModalOpen] = useState<boolean>(false);
    const [isLinkCreationModalOpen, setIsLinkCreationModalOpen] = useState<boolean>(false);
    const [linkSearchQuery, setLinkSearchQuery] = useState<string>('');
    const [customMeasurementsDraft, setCustomMeasurementsDraft] = useState<Record<string, string>>({});

    // Flujo A: Visualización de patrones derivados de una sesión
    const [viewingDerivedSessionId, setViewingDerivedSessionId] = useState<string | null>(null);
    const [flujoAView, setFlujoAView] = useState<'sessions' | 'patterns' | 'creations'>('sessions');
    const [isCustomMeasurementsOpen, setIsCustomMeasurementsOpen] = useState<boolean>(false);

    // 1. Estados de selección de Clienta
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [loadingClients, setLoadingClients] = useState<boolean>(true);

    // 2. Estados de sesiones de medidas
    const [sessions, setSessions] = useState<MeasurementSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<MeasurementSession | null>(null);
    const [modalPreviousSession, setModalPreviousSession] = useState<MeasurementSession | null>(null);
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState<boolean>(false);

    // 3. Estados de prenda y diseño
    const [garmentType, setGarmentType] = useState<GarmentType>(initialGarmentType || 'bodice');
    const [selectedEaseProfile, setSelectedEaseProfile] = useState<EaseProfile>(
        STANDARD_EASE_PROFILES.find((p) => p.is_default) || STANDARD_EASE_PROFILES[1]
    );
    const [designParams, setDesignParams] = useState<GarmentDesignParameters>({
        seam_allowance_default_mm: 10,
        hem_allowance_mm: 35,
        skirt_silhouette: 'straight',
        skirt_length_mm: 600,
        skirt_flare_per_side_mm: 60,
        sleeve_length_mm: 580,
    });

    // 3b. Estados de plantillas de patronaje (Componente 11 - M02.11)
    const [templates, setTemplates] = useState<PatternTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PatternTemplate | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
    const [isEaseManuallySetByUser, setIsEaseManuallySetByUser] = useState<boolean>(false);
    const { width: windowWidth } = useWindowDimensions();
    const isMobile = windowWidth < 720;
    const isTablet = windowWidth >= 720 && windowWidth < 1120;
    const isDesktop = windowWidth >= 1120;

    // Grids responsivos de alta costura para el Hub de Patronaje (M02)
    // 1. Tres vías principales ordenadas: 01 Mis Clientas, 02 Patronaje Directo, 03 Patrones de Creaciones
    const protagonistCardsGridStyle = [
        styles.hubCardsGridProtagonists,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isDesktop
                ? 'repeat(3, minmax(0, 1fr))'
                : isTablet
                ? 'repeat(2, minmax(0, 1fr))'
                : '1fr',
            gap: 20,
            alignItems: 'stretch',
        } as any,
    ];

    // 2. Dos alternativas de archivo y experimentación: 04 Banco de Patrones y 05 Patrón Libre
    const secondaryCardsGridStyle = [
        styles.hubCardsGridSecondary,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isDesktop || isTablet
                ? 'repeat(2, minmax(0, 1fr))'
                : '1fr',
            gap: 20,
            alignItems: 'stretch',
        } as any,
    ];

    // 3. Archivo Técnico del Atelier (Directorio de Clientas y Banco Global)
    const archiveCatalogGridStyle = [
        styles.hubSecondaryButtonsRow,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 16,
        } as any,
    ];

    const isTabletPortrait = windowWidth < 1024;
    const [isFreeMannequinCollapsed, setIsFreeMannequinCollapsed] = useState<boolean>(false);
    const isFreeWorkflowTwoCol = activeWorkflow === 'free_pattern' && windowWidth >= 1320 && !isFreeMannequinCollapsed;
    const [isClientDrawerOpen, setIsClientDrawerOpen] = useState<boolean>(false);
    const [activeStudioTab, setActiveStudioTabRaw] = useState<'garment' | 'cad' | 'fitting' | 'specifications' | 'history'>('garment');
    // Única vía para cambiar de pestaña de estudio. En el Flujo C la etapa activa del stepper es la
    // fuente de verdad: cualquier salto a Mesa CAD, Fitting, Ficha o Bitácora la mantiene sincronizada.
    const setActiveStudioTab = (tab: 'garment' | 'cad' | 'fitting' | 'specifications' | 'history') => {
        setActiveStudioTabRaw(tab);
        if (activeWorkflow === 'creation_pattern') {
            setActiveCreationStage(studioTabToStage(tab));
        }
    };
    const [showChecklistDetails, setShowChecklistDetails] = useState<boolean>(false);
    const [showMeasurementsBreakdown, setShowMeasurementsBreakdown] = useState<boolean>(false);
    const [isMannequinCollapsed, setIsMannequinCollapsed] = useState<boolean>(false);
    const [mannequinViewMode, setMannequinViewMode] = useState<'full_body' | 'torso'>('torso'); // VISTA INICIAL: Torso (Stockman)
    const [mannequinPerspective, setMannequinPerspective] = useState<AnatomicalPerspective>('front'); // VISTA INICIAL: Frontal
    const [selectedMeasureCode, setSelectedMeasureCode] = useState<string | null>(null);
    const [previousSelectedMeasureCode, setPreviousSelectedMeasureCode] = useState<string | null>(null);
    const [activeGuideModalCode, setActiveGuideModalCode] = useState<string | null>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
    const [isMeasuresTableCollapsed, setIsMeasuresTableCollapsed] = useState<boolean>(false);
    const [showMmEquivalencies, setShowMmEquivalencies] = useState<boolean>(false);

    const handleOpenMeasureGuide = (code: string) => {
        setPreviousSelectedMeasureCode(selectedMeasureCode);
        setActiveGuideModalCode(code);
    };

    const handleCloseMeasureGuide = () => {
        setActiveGuideModalCode(null);
        setSelectedMeasureCode(previousSelectedMeasureCode);
    };

    const handleHighlightInMannequin = (code: string) => {
        setSelectedMeasureCode(code);
        setPreviousSelectedMeasureCode(code);
        setActiveGuideModalCode(null);
    };
    const [expandedMeasureCategories, setExpandedMeasureCategories] = useState<Record<string, boolean>>({
        bust_torso: true,
        back_shoulders: true,
        waist_hip: true,
        arms_sleeves: true,
        lower_lengths: false,
        garment_design: false,
        workshop_params: false,
    });

    const toggleMeasureCategory = (catId: string) => {
        setExpandedMeasureCategories((prev) => ({
            ...prev,
            [catId]: !prev[catId],
        }));
    };

    // Flujo B: Control de visualización anatómica, cambio de sesión y estimaciones
    const [isDirectAnatomyCollapsed, setIsDirectAnatomyCollapsed] = useState<boolean>(false);
    const [lastGeneratedSessionId, setLastGeneratedSessionId] = useState<string | null>(null);
    const [showEstimatedModal, setShowEstimatedModal] = useState<boolean>(false);
    const [allowEstimatedGeneration, setAllowEstimatedGeneration] = useState<boolean>(false);
    const [showEstimatedDetailsReview, setShowEstimatedDetailsReview] = useState<boolean>(false);

    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Auto-cierre de toasts de notificación para no empujar la interfaz
    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => {
                setStatusMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const [activeResultsTab, setActiveResultsTab] = useState<'fitting' | 'specifications' | 'history'>('fitting');

    // 4. Estados de ejecución del motor y resultados
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [geometryResult, setGeometryResult] = useState<PatternGeometryResult | null>(null);
    const [validationResult, setValidationResult] = useState<PatternValidationResult | null>(null);
    const [currentExecution, setCurrentExecution] = useState<PatternExecution | null>(null);
    const [patternStatus, setPatternStatus] = useState<PatternStatus>('draft');

    // 4b. Estados de linaje e historial de ajustes (Componente 12 - M02.12)
    const [executionHistory, setExecutionHistory] = useState<PatternExecution[]>([]);
    const [adjustmentsHistory, setAdjustmentsHistory] = useState<PatternAdjustment[]>([]);

    // 4c. Estado de información de exportación técnica (Paso 11 - M02.12)
    const [lastExportInfo, setLastExportInfo] = useState<{
        fileName: string;
        garmentName: string;
        templateName: string;
        version: string;
        date: string;
        units: string;
        piecesCount: number;
    } | null>(null);

    // 5. Estados de modales auxiliares
    const [isAdjustmentsModalOpen, setIsAdjustmentsModalOpen] = useState<boolean>(false);
    const [isCopilotModalOpen, setIsCopilotModalOpen] = useState<boolean>(false);
    const [isProductionModalOpen, setIsProductionModalOpen] = useState<boolean>(false);
    const [isApprovalConfirmOpen, setIsApprovalConfirmOpen] = useState<boolean>(false);
    const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
    const [comparisonResult, setComparisonResult] = useState<PatternComparisonResult | null>(null);

    // 5b. Estados para devolución a revisión / rechazo técnico (C13.10)
    const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
    const [returnReason, setReturnReason] = useState<string>('Corrección morfológica observada en prueba de vestuario');
    const [returnObservation, setReturnObservation] = useState<string>('');

    // 5c. Componente 13: Estados de Fitting, Registro de Ajustes y Regeneración Controlada (M02.13)
    const [stagedAdjustments, setStagedAdjustments] = useState<StructuredPatternAdjustment[]>([]);
    const [isAddAdjustmentModalOpen, setIsAddAdjustmentModalOpen] = useState<boolean>(false);
    const [selectedPieceIdForAdj, setSelectedPieceIdForAdj] = useState<string>('');
    const [adjType, setAdjType] = useState<AdjustmentType>('waist');
    const [adjZone, setAdjZone] = useState<string>('cintura');
    const [adjLocation, setAdjLocation] = useState<string>('costado');
    const [adjValue, setAdjValue] = useState<string>('1.5');
    const [adjUnit, setAdjUnit] = useState<AdjustmentUnit>('cm');
    const [adjDirection, setAdjDirection] = useState<AdjustmentDirection>('decrease');
    const [adjMotive, setAdjMotive] = useState<string>('Reducir cintura');
    const [adjObservation, setAdjObservation] = useState<string>('');
    const [adjError, setAdjError] = useState<string | null>(null);

    const [fittingNotes, setFittingNotes] = useState<string>('');
    const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState<boolean>(false);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [lastRegenerationResult, setLastRegenerationResult] = useState<{
        executionId: string;
        garmentName: string;
        templateName: string;
        versionLabel: string;
        parentVersion: string;
        adjustmentsCount: number;
        date: string;
        designer: string;
    } | null>(null);

    // Estado dinámico del ciclo de fitting (Sección 7)
    const fittingStatus = useMemo(() => {
        if (lastRegenerationResult || currentExecution?.parent_execution_id) {
            return { code: 'regenerated' as FittingStatus, label: 'Regenerado', color: '#2E7D32' };
        }
        if (stagedAdjustments.length > 0) {
            return { code: 'ready_to_regenerate' as FittingStatus, label: 'Listo para regenerar', color: '#E65100' };
        }
        if (currentExecution?.status === 'pending_fitting') {
            return { code: 'in_fitting' as FittingStatus, label: 'En prueba', color: '#1565C0' };
        }
        return { code: 'pending' as FittingStatus, label: 'Pendiente', color: '#766B62' };
    }, [lastRegenerationResult, currentExecution, stagedAdjustments.length]);

    // Ciclo de vida y estado estricto de Flujo D: Patrón Libre / Banco Global
    const freePatternLifecycleState = useMemo(() => {
        // ¿Existe un patrón libre real generado para la prenda y medidas actuales?
        if (
            !currentExecution ||
            !geometryResult ||
            !geometryResult.pieces ||
            geometryResult.pieces.length === 0 ||
            currentExecution.garment_type !== garmentType ||
            currentExecution.client_id ||
            currentExecution.creation_id
        ) {
            return {
                hasRealPattern: false,
                code: 'preparation',
                label: 'EN PREPARACIÓN',
                versionLabel: 'Borrador',
                clientLabel: 'No asociada',
                creationLabel: 'No asociada',
                tracingLabel: 'Pendiente',
                approvalLabel: 'No realizada',
                piecesCount: 0,
                badgeBg: '#F3EFEA',
                badgeBorder: '#DCD5C9',
                badgeText: '#6E6259',
                dotColor: '#9C9286',
            };
        }

        const isApproved = currentExecution.status === 'approved_by_designer' || patternStatus === 'approved_by_designer';
        const isReview =
            currentExecution.status === 'needs_revision' ||
            currentExecution.status === 'pending_fitting' ||
            patternStatus === 'pending_fitting' ||
            patternStatus === 'needs_revision' ||
            stagedAdjustments.length > 0;
        const piecesCount = geometryResult.pieces.length;

        if (isApproved) {
            const approvalDate = (currentExecution as any).approved_at || currentExecution.updated_at;
            return {
                hasRealPattern: true,
                code: 'approved',
                label: 'APROBADO',
                versionLabel: currentExecution.version_label || 'v1.0',
                clientLabel: associatedClientName ? `${associatedClientName} (Asociada)` : 'No asociada',
                creationLabel: associatedCreationName ? `${associatedCreationName} (Asociada)` : 'No asociada',
                tracingLabel: `Completado (${piecesCount} piezas en mm)`,
                approvalLabel: `Aprobado · Katherine Carroll (${formatDate(approvalDate)})`,
                piecesCount,
                badgeBg: '#FBF7EE',
                badgeBorder: '#D4AF37',
                badgeText: '#8C6D15',
                dotColor: '#D4AF37',
            };
        }

        if (isReview) {
            return {
                hasRealPattern: true,
                code: 'review',
                label: 'EN REVISIÓN',
                versionLabel: currentExecution.version_label || 'v1.0',
                clientLabel: associatedClientName ? `${associatedClientName} (Asociada)` : 'No asociada',
                creationLabel: associatedCreationName ? `${associatedCreationName} (Asociada)` : 'No asociada',
                tracingLabel: `Completado (${piecesCount} piezas en mm)`,
                approvalLabel: 'No realizada',
                piecesCount,
                badgeBg: '#FFF9E6',
                badgeBorder: '#E5B842',
                badgeText: '#9C6F00',
                dotColor: '#E5B842',
            };
        }

        if (isGenerating) {
            return {
                hasRealPattern: true,
                code: 'in_progress',
                label: 'EN DESARROLLO',
                versionLabel: currentExecution.version_label || 'v1.0',
                clientLabel: associatedClientName ? `${associatedClientName} (Asociada)` : 'No asociada',
                creationLabel: associatedCreationName ? `${associatedCreationName} (Asociada)` : 'No asociada',
                tracingLabel: 'Trazando piezas en mm...',
                approvalLabel: 'No realizada',
                piecesCount,
                badgeBg: '#F8F4EC',
                badgeBorder: '#C5A880',
                badgeText: '#7D5A2B',
                dotColor: '#A78350',
            };
        }

        return {
            hasRealPattern: true,
            code: 'tracing_completed',
            label: 'TRAZADO COMPLETADO',
            versionLabel: currentExecution.version_label || 'v1.0',
            clientLabel: associatedClientName ? `${associatedClientName} (Asociada)` : 'No asociada',
            creationLabel: associatedCreationName ? `${associatedCreationName} (Asociada)` : 'No asociada',
            tracingLabel: `Completado (${piecesCount} piezas en mm)`,
            approvalLabel: 'No realizada',
            piecesCount,
            badgeBg: '#F8F4EC',
            badgeBorder: '#C5A880',
            badgeText: '#7D5A2B',
            dotColor: '#A78350',
        };
    }, [
        currentExecution,
        geometryResult,
        garmentType,
        patternStatus,
        stagedAdjustments.length,
        isGenerating,
        associatedClientName,
        associatedCreationName,
    ]);

    // Selección de prenda en cuadrícula con aislamiento funcional para Flujo D
    const handleSelectGarmentInGrid = (g: GarmentType) => {
        if (activeWorkflow === 'creation_pattern' && selectedCreation) {
            handleAssignGarmentToCreation(g);
        } else {
            if (activeWorkflow === 'free_pattern') {
                if (currentExecution && currentExecution.garment_type !== g) {
                    setCurrentExecution(null);
                    setGeometryResult(null);
                    setValidationResult(null);
                    setPatternStatus('draft');
                    setExecutionHistory([]);
                    setAdjustmentsHistory([]);
                    setStagedAdjustments([]);
                }
            }
            setGarmentType(g);
        }
    };

    // Selección de tipo preconfigurado de ajuste con sugerencias
    const handleSelectAdjType = (type: AdjustmentType) => {
        setAdjType(type);
        setAdjError(null);
        switch (type) {
            case 'waist':
                setAdjZone('cintura');
                setAdjLocation('cintura');
                setAdjValue('1.5');
                setAdjDirection('decrease');
                setAdjMotive('Reducir cintura');
                break;
            case 'hip':
                setAdjZone('cadera');
                setAdjLocation('cadera');
                setAdjValue('2');
                setAdjDirection('increase');
                setAdjMotive('Aumentar contorno de cadera');
                break;
            case 'shoulder':
                setAdjZone('hombro');
                setAdjLocation('hombro');
                setAdjValue('0.8');
                setAdjDirection('decrease');
                setAdjMotive('Subir hombro');
                break;
            case 'armhole':
                setAdjZone('sisa');
                setAdjLocation('sisa');
                setAdjValue('1.0');
                setAdjDirection('increase');
                setAdjMotive('Desahogar sisa');
                break;
            case 'neckline':
                setAdjZone('escote');
                setAdjLocation('escote');
                setAdjValue('1.0');
                setAdjDirection('increase');
                setAdjMotive('Ampliar escote');
                break;
            case 'sleeve':
                setAdjZone('manga');
                setAdjLocation('manga');
                setAdjValue('1.5');
                setAdjDirection('decrease');
                setAdjMotive('Ajustar largo de manga');
                break;
            case 'sleeve_cap':
                setAdjZone('copa');
                setAdjLocation('copa');
                setAdjValue('1.0');
                setAdjDirection('increase');
                setAdjMotive('Modificar copa de manga');
                break;
            case 'garment_length':
            case 'length':
                setAdjZone('largo');
                setAdjLocation('ruedo');
                setAdjValue('2');
                setAdjDirection('decrease');
                setAdjMotive('Ajustar largo total');
                break;
            case 'bust':
            case 'bust_dart':
            case 'dart':
                setAdjZone('busto');
                setAdjLocation('pinza');
                setAdjValue('1');
                setAdjDirection('increase');
                setAdjMotive('Ajustar pinza/contorno de busto');
                break;
            case 'ease':
                setAdjZone('holgura');
                setAdjLocation('costado');
                setAdjValue('1');
                setAdjDirection('increase');
                setAdjMotive('Aumentar holgura general');
                break;
            case 'other':
            case 'custom':
                setAdjZone('otro');
                setAdjLocation('otro');
                setAdjValue('0');
                setAdjDirection('increase');
                setAdjMotive('Ajuste técnico artesanal');
                break;
            case 'crotch':
                setAdjZone('tiro');
                setAdjLocation('tiro');
                setAdjValue('1');
                setAdjDirection('increase');
                setAdjMotive('Ajustar tiro de pantalón');
                break;
            default:
                setAdjZone(type);
                setAdjLocation('costado');
                setAdjValue('1');
                setAdjDirection('decrease');
                setAdjMotive(`Ajuste en ${type}`);
                break;
        }
    };

    // Apertura modal nuevo ajuste
    const handleOpenAddAdjustmentModal = () => {
        setAdjError(null);
        if (currentExecution?.geometry_result?.pieces && currentExecution.geometry_result.pieces.length > 0) {
            if (!selectedPieceIdForAdj) {
                setSelectedPieceIdForAdj(currentExecution.geometry_result.pieces[0].id);
            }
        }
        setIsAddAdjustmentModalOpen(true);
    };

    // Agregar ajuste validado a la lista de staged adjustments (Sección 6 y 17)
    const handleAddAdjustment = () => {
        if (role === 'client') {
            setAdjError('Acción restringida: El perfil clienta no dispone de permisos para registrar ajustes de fitting.');
            return;
        }

        const parsedVal = parseFloat(adjValue.trim());
        if (!Number.isFinite(parsedVal)) {
            setAdjError('El valor del ajuste debe ser un número finito válido.');
            return;
        }

        const pieces = currentExecution?.geometry_result?.pieces || [];
        if (pieces.length > 0 && !selectedPieceIdForAdj) {
            setAdjError('Debe seleccionar la pieza del patrón afectada.');
            return;
        }

        const pieceObj = pieces.find((p) => p.id === selectedPieceIdForAdj);
        if (pieces.length > 0 && !pieceObj) {
            setAdjError(`La pieza seleccionada "${selectedPieceIdForAdj}" no existe en la geometría generada.`);
            return;
        }

        const chosenLocation = adjLocation || adjZone;
        const validation = validatePatternAdjustmentInput({
            adjustmentType: adjType,
            zone: chosenLocation,
            value: parsedVal,
            unit: adjUnit,
            direction: adjDirection,
            garmentType,
            targetPieceId: selectedPieceIdForAdj || undefined,
            availablePieces: pieces,
        });

        if (!validation.valid) {
            setAdjError(validation.error || 'Ajuste técnicamente inválido.');
            return;
        }

        const designerName = profile?.full_name || user?.email || 'Katherine Carroll (Alta Costura)';

        const newAdj: StructuredPatternAdjustment = {
            id: `staged_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            piece: pieceObj?.name || adjZone,
            pieceId: pieceObj?.id,
            pieceName: pieceObj?.name,
            pieceType: pieceObj?.code || pieceObj?.name,
            targetPiece: pieceObj?.name || adjZone,
            location: chosenLocation,
            zone: chosenLocation,
            adjustmentType: adjType,
            value: parsedVal,
            unit: adjUnit,
            direction: adjDirection,
            deltaMm: validation.deltaMm,
            motive: adjMotive.trim() || undefined,
            observation: adjObservation.trim() || undefined,
            recordedBy: designerName,
            recordedAt: new Date().toISOString(),
        };

        setStagedAdjustments((prev) => [...prev, newAdj]);
        setIsAddAdjustmentModalOpen(false);
        setAdjError(null);
        setAdjObservation('');
    };

    // Eliminar ajuste de la lista de staged adjustments
    const handleRemoveStagedAdjustment = (id?: string) => {
        setStagedAdjustments((prev) => prev.filter((a) => a.id !== id));
    };

    // Abrir modal de confirmación antes de regenerar
    const handleOpenRegenerateConfirm = () => {
        if (!currentExecution) {
            setStatusMessage({ text: 'No hay ninguna ejecución base seleccionada.', type: 'error' });
            return;
        }
        if (role === 'client') {
            setStatusMessage({ text: 'Acción no autorizada para el perfil clienta.', type: 'error' });
            return;
        }
        if (stagedAdjustments.length === 0) {
            setStatusMessage({ text: 'Debe agregar al menos un ajuste de fitting para regenerar el patrón.', type: 'error' });
            return;
        }
        setIsRegenerateConfirmOpen(true);
    };

    // Regenerar patrón con ajustes
    const handleExecuteRegenerateWithAdjustments = async () => {
        if (!currentExecution || stagedAdjustments.length === 0) return;
        setIsRegenerating(true);
        setIsRegenerateConfirmOpen(false);

        try {
            const res = await createMultiAdjustedChildExecution({
                parentExecution: currentExecution,
                adjustments: stagedAdjustments,
                fittingNotes: fittingNotes.trim() || undefined,
            });

            if (!res.success || !res.childExecution) {
                setStatusMessage({
                    text: res.error || 'Error al regenerar el patrón con los ajustes indicados.',
                    type: 'error',
                });
                return;
            }

            const child = res.childExecution;
            // Preservar ejecución padre intacta y seleccionar la nueva ejecución hija
            setCurrentExecution(child);
            setGeometryResult(child.geometry_result);
            setValidationResult(child.validation_results);
            setPatternStatus(child.status);
            setSelectedEaseProfile(child.ease_profile_snapshot);
            setDesignParams(child.design_parameters);
            setExecutionHistory((prev) => [child, ...prev.filter((e) => e.id !== child.id)]);

            // Cargar ajustes aplicados
            if (res.recordedAdjustments && res.recordedAdjustments.length > 0) {
                setAdjustmentsHistory((prev) => [...res.recordedAdjustments!, ...prev]);
            }

            // Datos para la presentación de resultado (Sección 11)
            const templateName = selectedTemplate ? selectedTemplate.name : 'Plantilla Base';
            setLastRegenerationResult({
                executionId: child.id,
                garmentName: GARMENT_PACKAGES[child.garment_type].name,
                templateName,
                versionLabel: child.version_label,
                parentVersion: currentExecution.version_label,
                adjustmentsCount: stagedAdjustments.length,
                date: new Date(child.created_at).toLocaleString(),
                designer: 'Katherine Carroll (Alta Costura)',
            });

            // Limpiar ajustes en borrador
            setStagedAdjustments([]);
            setFittingNotes('');

            setStatusMessage({
                text: res.message || `✓ Nueva ejecución ${child.version_label} generada correctamente. La ejecución base permanece intacta.`,
                type: 'success',
            });
        } catch (err: any) {
            setStatusMessage({
                text: `Error al regenerar patrón: ${err?.message || err}`,
                type: 'error',
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    // Cargar historial de ajustes cuando cambia la ejecución activa (limpiar si no hay ejecución)
    useEffect(() => {
        if (currentExecution?.id && !currentExecution.id.startsWith('local_')) {
            fetchPatternAdjustments(currentExecution.id).then((adjs) => {
                setAdjustmentsHistory(adjs || []);
            });
        } else {
            setAdjustmentsHistory([]);
        }
    }, [currentExecution?.id]);

    // Apertura de la comparación técnica antes / después (C13: Comparación de Revisiones)
    const handleOpenComparison = (targetExec?: PatternExecution) => {
        const child = targetExec || currentExecution;
        if (!child) return;
        if (!child.parent_execution_id) {
            setStatusMessage({
                text: 'Esta ejecución es la versión base inicial (v1.0); no posee una ejecución padre para comparar.',
                type: 'info',
            });
            return;
        }
        const parent = executionHistory.find((e) => e.id === child.parent_execution_id);
        if (!parent) {
            setStatusMessage({
                text: 'No se encontró la versión padre en el historial local para realizar la comparación técnica.',
                type: 'error',
            });
            return;
        }
        const res = comparePatternExecutions(parent, child, adjustmentsHistory);
        setComparisonResult(res);
        setIsComparisonModalOpen(true);
    };

    // C13.10: Confirmar devolución de patrón a revisión / ajuste
    const handleConfirmReturnToReview = async () => {
        if (!returnObservation.trim()) {
            setStatusMessage({
                text: 'Debe ingresar una observación técnica explicando el motivo de la devolución.',
                type: 'error',
            });
            return;
        }
        if (!currentExecution) {
            setPatternStatus('needs_revision');
            setIsReturnModalOpen(false);
            setStatusMessage({ text: 'Patrón devuelto a revisión y ajuste.', type: 'info' });
            return;
        }
        const fullNote = `[DEVUELTO A REVISIÓN/AJUSTE] Motivo: ${returnReason}. Detalle: ${returnObservation.trim()} — Katherine Carroll (${new Date().toLocaleString()})`;
        const res = await updatePatternStatus(currentExecution.id, 'needs_revision', fullNote);
        setIsReturnModalOpen(false);
        if (res.success) {
            setPatternStatus('needs_revision');
            const updated = { ...currentExecution, status: 'needs_revision' as PatternStatus, notes: fullNote };
            setCurrentExecution(updated);
            setExecutionHistory((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setStatusMessage({
                text: '✓ Patrón registrado en estado de revisión y devuelto a ajuste de taller.',
                type: 'info',
            });
        } else {
            setStatusMessage({ text: res.error || 'No se pudo actualizar el estado a revisión.', type: 'error' });
        }
    };

    // Seleccionar y conmutar revisión histórica sin mutar el padre
    const handleSelectExecution = (exec: PatternExecution) => {
        setCurrentExecution(exec);
        setGeometryResult(exec.geometry_result);
        setValidationResult(exec.validation_results);
        setPatternStatus(exec.status);
        setSelectedEaseProfile(exec.ease_profile_snapshot);
        setDesignParams(exec.design_parameters);
        setStatusMessage({
            text: `Visualizando revisión histórica ${exec.version_label} (${exec.status}). Geometría y snapshots inmutables preservados.`,
            type: 'info',
        });
    };

    // Cargar plantillas de patronaje según prenda seleccionada (Componente 11)
    useEffect(() => {
        loadTemplatesForGarment(garmentType);
    }, [garmentType]);

    const loadTemplatesForGarment = async (type: GarmentType) => {
        setLoadingTemplates(true);
        try {
            const list = await fetchPatternTemplates(type);
            setTemplates(list);
            if (list.length > 0) {
                // Seleccionar prioritariamente versión 1.0.0 o la primera disponible
                const defaultTpl = list.find((t) => t.version === '1.0.0') || list[0];
                setSelectedTemplate(defaultTpl);
                // Si la diseñadora aún no ha elegido holgura manualmente, sugerir la de la plantilla
                if (!isEaseManuallySetByUser && defaultTpl.default_ease_profile_code) {
                    const matchingEase = STANDARD_EASE_PROFILES.find(
                        (p) => p.code === defaultTpl.default_ease_profile_code
                    );
                    if (matchingEase) {
                        setSelectedEaseProfile(matchingEase);
                    }
                }
            } else {
                setSelectedTemplate(null);
            }
        } catch (err) {
            console.warn('[PatternModule] Error cargando plantillas de patronaje:', err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleSelectTemplate = (tpl: PatternTemplate) => {
        setSelectedTemplate(tpl);
        // REGLA 7: La selección de plantilla NO debe sobrescribir silenciosamente una configuración explícita elegida por la diseñadora
        if (!isEaseManuallySetByUser && tpl.default_ease_profile_code) {
            const matchingEase = STANDARD_EASE_PROFILES.find(
                (p) => p.code === tpl.default_ease_profile_code
            );
            if (matchingEase) {
                setSelectedEaseProfile(matchingEase);
            }
        }
    };

    const handleApplySuggestedEase = () => {
        if (!selectedTemplate?.default_ease_profile_code) return;
        const matchingEase = STANDARD_EASE_PROFILES.find(
            (p) => p.code === selectedTemplate.default_ease_profile_code
        );
        if (matchingEase) {
            setSelectedEaseProfile(matchingEase);
            setIsEaseManuallySetByUser(true);
            setStatusMessage({
                text: `Holgura actualizada a la recomendación de la plantilla: ${matchingEase.name}.`,
                type: 'info',
            });
        }
    };

    // Cargar directorio de clientes al inicio
    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoadingClients(true);
        try {
            const res = await fetchClients('active');
            const list = res.data || [];
            setClients(list);
            if (initialClientId) {
                const found = list.find((c) => c.id === initialClientId);
                if (found) {
                    setSelectedClient(found);
                } else if (list.length > 0 && activeWorkflowRef.current !== 'free_pattern') {
                    setSelectedClient(list[0]);
                }
            } else if (list.length > 0 && activeWorkflowRef.current !== 'free_pattern') {
                setSelectedClient(list[0]);
            }
        } catch (err) {
            console.warn('[PatternModule] Error cargando clientas:', err);
        } finally {
            setLoadingClients(false);
        }
    };

    // Identificador incremental para cancelar respuestas asíncronas atrasadas (prevención de condiciones de carrera)
    const clientSwitchRequestIdRef = useRef<number>(0);

    // Al cambiar la clienta, aislar inmediatamente el contexto y cargar sus sesiones, creaciones y ejecuciones
    useEffect(() => {
        const requestId = ++clientSwitchRequestIdRef.current;

        // Limpiar inmediatamente TODO el contexto para evitar fugas de datos entre clientas (Fitting, ejecuciones, creación)
        setSessions([]);
        setSelectedSession(null);
        setExecutionHistory([]);
        setAdjustmentsHistory([]);
        setCurrentExecution(null);
        setGeometryResult(null);
        setValidationResult(null);
        setClientCreations([]);
        setSelectedCreation(null);
        setStagedAdjustments([]);
        if (activeWorkflow === 'creation_pattern') {
            setGarmentType(null as any);
        }

        if (!selectedClient) {
            return;
        }

        const clientId = selectedClient.id;

        loadClientCreations(clientId, requestId);
        loadClientSessions(clientId, undefined, requestId);

        fetchClientPatternExecutions(clientId).then((execs) => {
            if (clientSwitchRequestIdRef.current !== requestId) return;
            const validExecs = execs || [];
            // Fusionar (no reemplazar): una lectura atrasada no debe borrar ejecuciones ya confirmadas
            setExecutionHistory((prev) => mergeExecutionHistory(prev, validExecs, clientId));
            // En patronaje directo restaurar la última ejecución de la clienta si existe;
            // en Flujo C, la ejecución activa se resuelve estrictamente a partir de la creación seleccionada;
            // en Flujo D (free_pattern), NUNCA heredar ejecuciones de clientas.
            if (activeWorkflow === 'direct_pattern') {
                if (validExecs.length > 0) {
                    const latest = validExecs[0];
                    setCurrentExecution(latest);
                    setGeometryResult(latest.geometry_result);
                    setValidationResult(latest.validation_results);
                    setPatternStatus(latest.status);
                    setSelectedEaseProfile(latest.ease_profile_snapshot);
                    setDesignParams(latest.design_parameters);
                } else {
                    setCurrentExecution(null);
                    setGeometryResult(null);
                    setValidationResult(null);
                }
            }
        });
    }, [selectedClient]);

    // En Flujo D (Patrón Libre / Banco Global): Aislamiento estricto de clientas, creaciones y sesiones
    useEffect(() => {
        if (activeWorkflow === 'free_pattern') {
            setSelectedClient(null);
            setSelectedCreation(null);
            setSelectedSession(null);
            setClientCreations([]);
            setSessions([]);
            // Si la ejecución activa actual pertenece a una clienta o creación, desvincularla por completo
            if (currentExecution && (currentExecution.client_id || currentExecution.creation_id)) {
                setCurrentExecution(null);
                setGeometryResult(null);
                setValidationResult(null);
                setPatternStatus('draft');
                setExecutionHistory([]);
                setAdjustmentsHistory([]);
                setStagedAdjustments([]);
            }
        }
    }, [activeWorkflow]);

    // En Flujo C: Sincronización canónica y estricta de ejecución activa, linaje y prenda con selectedCreation
    useEffect(() => {
        if (activeWorkflow !== 'creation_pattern') return;

        if (!selectedCreation) {
            setCurrentExecution(null);
            setGeometryResult(null);
            setValidationResult(null);
            setAdjustmentsHistory([]);
            setGarmentType(null as any);
            return;
        }

        // Sincronizar prenda técnica estructurada de la creación
        if (selectedCreation.garment_type && isKnownGarmentType(selectedCreation.garment_type)) {
            setGarmentType(selectedCreation.garment_type);
        } else {
            setGarmentType(null as any);
        }

        // Resolver ejecución activa legítima de la creación (anti-contaminación)
        const resolved = resolveActiveExecution(selectedCreation, executionHistory);
        if (resolved) {
            setCurrentExecution(resolved);
            setGeometryResult(resolved.geometry_result);
            setValidationResult(resolved.validation_results);
            setPatternStatus(resolved.status);
            setSelectedEaseProfile(resolved.ease_profile_snapshot);
            setDesignParams(resolved.design_parameters);
        } else if (currentExecution && currentExecution.creation_id === selectedCreation.id && currentExecution.geometry_result) {
            // Ejecución ya confirmada de ESTA creación: no se borra por una referencia momentáneamente desfasada.
        } else {
            setCurrentExecution(null);
            setGeometryResult(null);
            setValidationResult(null);
            setAdjustmentsHistory([]);
        }
    }, [selectedCreation, executionHistory, activeWorkflow]);

    // Asignar prenda técnica a una creación y persistirla en Supabase
    const handleAssignGarmentToCreation = async (newGarment: GarmentType) => {
        setGarmentType(newGarment);
        if (activeWorkflow === 'creation_pattern' && selectedCreation) {
            try {
                const res = await updateCreation(selectedCreation.id, { garment_type: newGarment });
                if (res.data) {
                    setSelectedCreation(res.data);
                    setClientCreations((prev) =>
                        prev.map((c) => (c.id === selectedCreation.id ? res.data! : c))
                    );
                    setStatusMessage({
                        text: `✓ Prenda técnica ${GARMENT_PACKAGES[newGarment].name} vinculada exitosamente a la creación.`,
                        type: 'success',
                    });
                }
            } catch (err: any) {
                console.warn('[PatternModule] Error vinculando prenda a creación:', err);
            }
        }
    };

    const loadClientCreations = async (clientId: string, expectedRequestId?: number) => {
        setLoadingCreations(true);
        try {
            const res = await fetchCreations({ clientId });
            if (expectedRequestId !== undefined && clientSwitchRequestIdRef.current !== expectedRequestId) return;
            const list = res.data || [];
            setClientCreations(list);
            if (initialCreationId) {
                const matched = list.find((cr) => cr.id === initialCreationId);
                if (matched) {
                    setSelectedCreation(matched);
                    if (matched.garment_type && isKnownGarmentType(matched.garment_type)) {
                        setGarmentType(matched.garment_type);
                    } else if (activeWorkflow === 'creation_pattern') {
                        setGarmentType(null as any);
                    }
                    if (matched.session_id) {
                        loadClientSessions(clientId, matched.session_id, expectedRequestId);
                    }
                    return;
                }
            }
            if (activeWorkflowRef.current === 'free_pattern') {
                setClientCreations([]);
                setSelectedCreation(null);
                return;
            }
            if (activeWorkflowRef.current === 'creation_pattern') {
                // Flujo C: no se asume la primera creación; la diseñadora la elige explícitamente.
                // Solo se conserva la ya elegida si sigue perteneciendo a la clienta.
                setSelectedCreation((prev) => (prev ? list.find((c) => c.id === prev.id) || null : null));
                return;
            }
            if (list.length > 0) {
                const first = list[0];
                setSelectedCreation(first);
                if (first.garment_type && isKnownGarmentType(first.garment_type)) {
                    setGarmentType(first.garment_type);
                } else if (activeWorkflow === 'creation_pattern') {
                    setGarmentType(null as any);
                }
                if (first.session_id) {
                    loadClientSessions(clientId, first.session_id, expectedRequestId);
                }
            } else {
                setSelectedCreation(null);
                if (activeWorkflow === 'creation_pattern') {
                    setGarmentType(null as any);
                }
            }
        } catch {
            if (expectedRequestId !== undefined && clientSwitchRequestIdRef.current !== expectedRequestId) return;
            setClientCreations([]);
            setSelectedCreation(null);
            if (activeWorkflow === 'creation_pattern') {
                setGarmentType(null as any);
            }
        } finally {
            if (expectedRequestId === undefined || clientSwitchRequestIdRef.current === expectedRequestId) {
                setLoadingCreations(false);
            }
        }
    };

    const loadClientSessions = async (clientId: string, preferredSessionId?: string, expectedRequestId?: number) => {
        try {
            const clientSessions = await fetchClientMeasurementSessions(clientId);
            if (expectedRequestId !== undefined && clientSwitchRequestIdRef.current !== expectedRequestId) return;
            setSessions(clientSessions);
            const targetId = preferredSessionId || selectedSession?.id || initialSessionId;
            if (targetId) {
                const found = clientSessions.find((s) => s.id === targetId);
                if (found) {
                    setSelectedSession(found);
                    return;
                }
            }
            if (clientSessions.length > 0) {
                setSelectedSession(clientSessions[0]);
            } else {
                setSelectedSession(null);
            }
        } catch {
            if (expectedRequestId !== undefined && clientSwitchRequestIdRef.current !== expectedRequestId) return;
            setSessions([]);
            setSelectedSession(null);
        }
    };

    // Extraer medidas normalizadas en mm de la sesión activa o perfil de referencia libre
    const activeMeasurementsMm = useMemo(() => {
        if (activeWorkflow === 'free_pattern') {
            return freeMeasurements;
        }
        if (!selectedSession?.values) return {};
        const res: Record<string, number> = {};
        for (const [code, item] of Object.entries(selectedSession.values)) {
            const numVal = typeof item === 'number' ? item : (item as any)?.value_mm;
            if (typeof numVal === 'number' && Number.isFinite(numVal)) {
                res[code] = numVal;
                if (code.endsWith('_right') || code.endsWith('_left')) {
                    const base = code.replace(/_right$|_left$/, '');
                    if (res[base] === undefined) {
                        res[base] = numVal;
                    }
                }
            }
        }
        return res;
    }, [activeWorkflow, freeMeasurements, selectedSession]);

    // Validación preliminar en tiempo real según la prenda seleccionada
    const currentRequirementsCheck = useMemo(() => {
        if (!garmentType || !GARMENT_PACKAGES[garmentType]) {
            return {
                valid: false,
                resolvedMeasurements: activeMeasurementsMm,
                validationResult: {
                    valid: false,
                    errors: ['No hay una categoría técnica de prenda seleccionada para esta creación.'],
                    warnings: [],
                    missingRequiredMeasurements: [],
                    calculatedNotes: [],
                },
            };
        }
        return validateGarmentRequirements(garmentType, activeMeasurementsMm);
    }, [garmentType, activeMeasurementsMm]);

    // Validación estricta de medidas requeridas por la plantilla de patronaje (Componente 11)
    // Soporta medidas calculables por fórmula derivada (C10) para no bloquear el flujo de taller (HAL-C11-04)
    const templateRequirementsCheck = useMemo(() => {
        if (!selectedTemplate) {
            return { valid: true, missing: [], present: [] };
        }
        const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
        const missing: string[] = [];
        const present: string[] = [];
        for (const code of selectedTemplate.required_measurements) {
            const val = activeMeasurementsMm[code];
            const cat = MEASUREMENT_MAP[code];
            const allowZero = cat?.scope === 'design_parameter' && cat?.min_value_mm <= 0;
            if (typeof val === 'number' && Number.isFinite(val) && (val > 0 || (allowZero && val === 0))) {
                present.push(code);
            } else {
                // HAL-C11-04: Verificar si el motor paramétrico puede calcularla de forma derivada (C10)
                const fallback = pkg?.calculableFallbacks?.[code];
                const calculatedVal = fallback ? fallback.calculate(activeMeasurementsMm) : null;
                if (typeof calculatedVal === 'number' && Number.isFinite(calculatedVal) && calculatedVal > 0) {
                    present.push(code);
                } else {
                    missing.push(code);
                }
            }
        }
        return {
            valid: missing.length === 0,
            missing,
            present,
        };
    }, [selectedTemplate, activeMeasurementsMm, garmentType]);

    // Diagnóstico estructurado cuatripartito de medidas (Reales, Calculadas C10, Estimadas Ref, No Resueltas)
    const templateMeasurementDiagnostic: TemplateMeasurementDiagnostic = useMemo(() => {
        if (!selectedTemplate || !garmentType || !GARMENT_PACKAGES[garmentType]) {
            return {
                valid: true,
                hasEstimated: false,
                hasUnresolved: false,
                real: [],
                calculated: [],
                estimated: [],
                unresolved: [],
                allItems: [],
                resolvedMeasurementsMm: { ...activeMeasurementsMm },
            };
        }
        const refProfileMm = HAUTE_COUTURE_REFERENCE_PROFILES.find((p) => p.code === 'size_40')?.measurementsMm || HAUTE_COUTURE_REFERENCE_PROFILES[1]?.measurementsMm;
        return classifyTemplateMeasurements(
            garmentType,
            selectedTemplate.required_measurements,
            activeMeasurementsMm,
            refProfileMm
        );
    }, [selectedTemplate, garmentType, activeMeasurementsMm]);

    // Flujo C: Derivados del Modelo Puro de Creación
    const garmentDiagnosis: GarmentMeasureDiagnosis | null = useMemo(() => {
        if (!garmentType) return null;
        return deriveGarmentMeasureDiagnosis({
            garmentType,
            measurementsMm: activeMeasurementsMm,
            template: selectedTemplate,
        });
    }, [garmentType, activeMeasurementsMm, selectedTemplate]);

    const creationFlowSummary: CreationFlowSummary = useMemo(() => {
        const creationExecutions = selectedCreation
            ? executionHistory.filter((e) => e.creation_id === selectedCreation.id)
            : [];
        const activeExec = resolveActiveExecution(selectedCreation, executionHistory);
        return deriveCreationFlowSummary({
            client: selectedClient,
            creation: selectedCreation,
            garmentType,
            session: selectedSession,
            diagnosis: garmentDiagnosis,
            executions: creationExecutions,
            activeExecution: activeExec,
            adjustmentsCount: adjustmentsHistory.length,
        });
    }, [
        selectedClient,
        selectedCreation,
        garmentType,
        selectedSession,
        garmentDiagnosis,
        executionHistory,
        currentExecution,
        adjustmentsHistory.length,
    ]);

    const creationTimelineNodes: CreationTimelineNode[] = useMemo(() => {
        return buildCreationTimeline(selectedCreation, executionHistory);
    }, [selectedCreation, executionHistory]);

    const handleSelectCreationStage = (stage: CreationStageId) => {
        setActiveCreationStage(stage);
        const mappedTab = STAGE_TO_STUDIO_TAB[stage];
        if (mappedTab && mappedTab !== 'creation' && mappedTab !== 'anatomy') {
            setActiveStudioTab(mappedTab as any);
        }
    };

    // Flujo C: hasta que existan clienta Y creación elegidas se muestra la pantalla de entrada.
    const creationGateActive = activeWorkflow === 'creation_pattern' && (!selectedClient || !selectedCreation);

    // Visibilidad de cada vista de estudio. En el Flujo C depende EXCLUSIVAMENTE de la etapa del stepper.
    const isStudioTabShown = (tab: 'garment' | 'cad' | 'fitting' | 'specifications' | 'history'): boolean => {
        if (activeWorkflow === 'creation_pattern') {
            return !creationGateActive && STAGE_TO_STUDIO_TAB[activeCreationStage] === tab;
        }
        return activeStudioTab === tab;
    };

    const handleOpenCreation = (cr: Creation) => {
        creationContextConfirmedRef.current = true;
        setSelectedCreation(cr);
        if (cr.garment_type && isKnownGarmentType(cr.garment_type)) {
            setGarmentType(cr.garment_type);
        } else {
            setGarmentType(null as any);
        }
        if (cr.session_id) {
            const linkedSession = sessions.find((ses) => ses.id === cr.session_id);
            if (linkedSession) setSelectedSession(linkedSession);
        }
        setActiveCreationStage('creation');
    };

    // «Cambiar creación»: vuelve al selector conservando la clienta elegida.
    const handleChangeCreationContext = () => {
        creationContextConfirmedRef.current = false;
        setSelectedCreation(null);
        setActiveCreationStage('creation');
    };

    // «Elegir otra clienta»: limpia clienta y creación (el efecto de cambio de clienta aísla el resto).
    const handleChangeCreationClient = () => {
        creationContextConfirmedRef.current = false;
        setSelectedCreation(null);
        setSelectedClient(null);
        setActiveCreationStage('creation');
    };

    const activeInfoSheetData = useMemo<{
        eyebrow: string;
        title: string;
        rows: InfoRow[];
        footerNote?: string;
    }>(() => {
        if (!activeInfoKind) {
            return { eyebrow: '', title: '', rows: [], footerNote: undefined };
        }
        const row = (label: string, val: unknown, fallback = '—', forceMuted?: boolean): InfoRow => {
            const hasVal = val !== null && val !== undefined && String(val).trim().length > 0;
            return {
                label,
                value: hasVal ? String(val) : fallback,
                muted: forceMuted !== undefined ? forceMuted : !hasVal,
            };
        };

        if (activeInfoKind === 'client') {
            return {
                eyebrow: 'ATELIER DE ALTA COSTURA · EXPEDIENTE DE CLIENTA',
                title: selectedClient?.full_name || 'Clienta no seleccionada',
                rows: [
                    row('Identificador', selectedClient?.id),
                    row('Nombre completo', selectedClient?.full_name),
                    row('Correo electrónico', selectedClient?.email, 'No registrado'),
                    row('Teléfono de contacto', selectedClient?.phone, 'No registrado'),
                    row('Ciudad', selectedClient?.city, 'No registrada'),
                    row('Preferencias de estilo', selectedClient?.style_preferences, 'Sin preferencias registradas'),
                    row('Notas internas', selectedClient?.internal_notes, 'Sin notas internas'),
                    row('Sesiones de medidas', `${sessions.length} sesión(es) en el historial`, undefined, false),
                ],
                footerNote: 'Expediente anatómico y preferencias de confección de autor.',
            };
        }
        if (activeInfoKind === 'creation') {
            const hasPhoto = Boolean((selectedCreation as any)?.cover_image_url || (selectedCreation as any)?.sketch_url);
            return {
                eyebrow: 'EXPEDIENTE DE CREACIÓN · ALTA COSTURA',
                title: selectedCreation?.name || 'Creación sin título',
                rows: [
                    row('Identificador', selectedCreation?.id?.slice(0, 8)),
                    row('Nombre del proyecto', selectedCreation?.name),
                    row('Familia patronal', selectedCreation?.garment_type ? (GARMENT_PACKAGES[selectedCreation.garment_type as GarmentType]?.name || String(selectedCreation.garment_type)) : 'No asignada'),
                    row('Tipo de encargo', selectedCreation?.creation_type ? (CREATION_TYPE_LABELS[selectedCreation.creation_type] || selectedCreation.creation_type) : null),
                    row('Estado editorial', selectedCreation?.status ? (CREATION_STATUS_LABELS[selectedCreation.status] || selectedCreation.status) : null),
                    row('Ocasión', selectedCreation?.occasion, 'No especificada'),
                    row('Fecha objetivo', formatShortDateEs(selectedCreation?.target_date)),
                    row('Memoria de diseño', selectedCreation?.description, 'Sin descripción conceptual'),
                    row('Fotografía de atelier', hasPhoto ? 'Fotografía cargada en el expediente' : 'Pendiente · Mostrando referencia editorial de toile', undefined, !hasPhoto),
                ],
                footerNote: 'Proyecto de creación registrado con trazabilidad completa en Atelier Digital.',
            };
        }
        if (activeInfoKind === 'garment') {
            const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
            const reqTotal = garmentDiagnosis ? garmentDiagnosis.requiredTotal : (pkg?.required?.length || 0);
            const regCount = garmentDiagnosis ? garmentDiagnosis.registeredCount : 0;
            const missingCount = garmentDiagnosis ? garmentDiagnosis.missing.length : 0;
            const pct = reqTotal > 0 ? Math.round((regCount / reqTotal) * 100) : 0;
            return {
                eyebrow: 'FAMILIA PATRONAL · MÓDULO DE CORTE',
                title: pkg?.name || (garmentType ? garmentType.toUpperCase() : 'Prenda no seleccionada'),
                rows: [
                    row('Clave técnica', garmentType ? garmentType.toUpperCase() : null),
                    row('Descripción de corte', pkg?.description),
                    row('Método de patronaje', pkg?.methodReference, 'Método Katherine Carroll Haute Couture'),
                    row('Cotas requeridas', `${reqTotal} medidas anatómicas obligatorias`, undefined, false),
                    row('Cotas completadas', `${regCount} registradas (${pct}%)`, undefined, false),
                    row('Cotas faltantes', missingCount > 0 ? `${missingCount} pendientes` : 'Ninguna · Apta para patronaje', undefined, missingCount > 0),
                ],
                footerNote: 'Especificación de trazado paramétrico según métodos de alta costura.',
            };
        }
        const completeness = creationFlowSummary.anatomy.completenessPct;
        const sessionValuesCount = selectedSession?.values ? Object.keys(selectedSession.values).length : 0;
        return {
            eyebrow: 'SESIÓN ANATÓMICA · MEDIDAS CORPORALES',
            title: describeSession(selectedSession) || 'Sin sesión seleccionada',
            rows: [
                row('Identificador', selectedSession?.id?.slice(0, 8)),
                row('Fecha de sesión', formatShortDateEs(selectedSession?.session_date || selectedSession?.created_at)),
                row('Estado anatómico', selectedSession?.status === 'completed' ? 'Finalizada y certificada' : 'Borrador en curso'),
                row('Total cotas registradas', `${sessionValuesCount} medidas corporales`, undefined, false),
                row('Cobertura corporal', `${completeness}% del maniquí Stockman`, undefined, false),
                row('Observaciones posturales', selectedSession?.notes, 'Sin desviaciones posturales registradas'),
            ],
            footerNote: 'Medidas corporales con exactitud milimétrica para trazado paramétrico.',
        };
    }, [
        activeInfoKind,
        selectedClient,
        selectedCreation,
        garmentType,
        selectedSession,
        garmentDiagnosis,
        creationFlowSummary.anatomy.completenessPct,
        sessions.length,
    ]);

    // C13.7: Lista de validación técnica estructurada (11 criterios clave con PASS / WARNING / BLOCKED)
    const validationChecklist = useMemo(() => {
        const isFree = activeWorkflow === 'free_pattern';
        const clientPass = isFree || (!!selectedClient?.id && !!selectedClient?.full_name);
        const clientStatus: 'PASS' | 'WARNING' | 'BLOCKED' = clientPass ? 'PASS' : 'BLOCKED';

        const sessionStatus: 'PASS' | 'WARNING' | 'BLOCKED' = isFree
            ? 'PASS'
            : !selectedSession
            ? 'BLOCKED'
            : selectedSession.status === 'completed'
            ? 'PASS'
            : 'WARNING';

        const templatePass = !!selectedTemplate?.id;
        const templateStatus: 'PASS' | 'WARNING' | 'BLOCKED' = templatePass ? 'PASS' : 'BLOCKED';

        const missingMeasures = templateRequirementsCheck?.missing || [];
        const measurementsStatus: 'PASS' | 'WARNING' | 'BLOCKED' = missingMeasures.length > 0 ? 'BLOCKED' : 'PASS';

        const easeStatus: 'PASS' | 'WARNING' | 'BLOCKED' = selectedEaseProfile ? 'PASS' : 'WARNING';

        const hasPieces = !!geometryResult && geometryResult.pieces.length > 0;
        const hasValidBounds = !!geometryResult && geometryResult.pieces.every(
            (p) => p.boundingBox && p.boundingBox.width > 0 && p.boundingBox.height > 0 && Number.isFinite(p.boundingBox.width)
        );
        const geometryStatus: 'PASS' | 'WARNING' | 'BLOCKED' = (hasPieces && hasValidBounds) ? 'PASS' : 'BLOCKED';

        const hasValidOutlines = !!geometryResult && geometryResult.pieces.every(
            (p) => p.outlineCut && p.outlineCut.commands && p.outlineCut.commands.length > 0
        );
        const piecesStatus: 'PASS' | 'WARNING' | 'BLOCKED' = hasValidOutlines ? 'PASS' : 'BLOCKED';

        const unitsStatus: 'PASS' | 'WARNING' | 'BLOCKED' = 'PASS';
        const scaleStatus: 'PASS' | 'WARNING' | 'BLOCKED' = 'PASS';
        const dxfStatus: 'PASS' | 'WARNING' | 'BLOCKED' = (hasPieces && hasValidBounds) ? 'PASS' : 'BLOCKED';
        const adjustmentsStatus: 'PASS' | 'WARNING' | 'BLOCKED' = adjustmentsHistory.length > 0
            ? 'PASS'
            : (currentExecution?.parent_execution_id ? 'WARNING' : 'PASS');

        const items = [
            { id: 'client', label: 'Cliente', status: clientStatus, desc: isFree ? 'Patrón Libre (Sin clienta)' : clientPass ? `${selectedClient?.full_name}` : 'Cliente no seleccionado' },
            { id: 'session', label: 'Sesión de Medidas', status: sessionStatus, desc: isFree ? `Medidas de Referencia (${selectedReferenceProfileCode.toUpperCase()})` : selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'Sesión ausente' },
            { id: 'template', label: 'Plantilla de Patronaje', status: templateStatus, desc: selectedTemplate ? `${selectedTemplate.name} (v${selectedTemplate.version})` : 'Sin plantilla' },
            { id: 'measurements', label: 'Medidas Requeridas', status: measurementsStatus, desc: missingMeasures.length === 0 ? '100% medidas presentes y finitas' : `Faltan: ${missingMeasures.join(', ')}` },
            { id: 'ease', label: 'Holgura Técnica', status: easeStatus, desc: `${selectedEaseProfile.name} (${selectedEaseProfile.code})` },
            { id: 'geometry', label: 'Geometría Paramétrica', status: geometryStatus, desc: hasPieces && hasValidBounds ? 'Coordenadas finitas, sin NaN/Infinity' : 'Geometría no calculada o corrupta' },
            { id: 'pieces', label: 'Piezas Técnicas', status: piecesStatus, desc: `${geometryResult?.pieces.length || 0} piezas con contorno cerrado` },
            { id: 'units', label: 'Unidades Métricas', status: unitsStatus, desc: 'Milímetros (mm) — Estándar ISO CAD ($INSUNITS = 4)' },
            { id: 'scale', label: 'Escala de Trazado', status: scaleStatus, desc: 'Escala 1:1 con calibración 100 × 100 mm' },
            { id: 'dxf', label: 'Validación CAD DXF', status: dxfStatus, desc: 'AutoCAD R12 compatible' },
            { id: 'adjustments', label: 'Ajustes Registrados', status: adjustmentsStatus, desc: `${adjustmentsHistory.length} ajuste(s) de fitting aplicados` },
        ];

        const hasBlocked = items.some((i) => i.status === 'BLOCKED');
        const warningCount = items.filter((i) => i.status === 'WARNING').length;

        return { items, hasBlocked, warningCount };
    }, [selectedClient, selectedSession, selectedTemplate, templateRequirementsCheck, selectedEaseProfile, geometryResult, adjustmentsHistory, currentExecution]);

    // Finalizar manualmente una sesión que esté en borrador
    const handleFinalizeSelectedSession = async () => {
        if (!selectedSession) return;
        const res = await finalizeMeasurementSession(selectedSession.id);
        if (res.success) {
            const updated: MeasurementSession = { ...selectedSession, status: 'completed' };
            setSelectedSession(updated);
            setSessions(sessions.map((s) => (s.id === updated.id ? updated : s)));
            setStatusMessage({
                text: `Sesión de medidas v${selectedSession.version_number} finalizada y blindada contra modificaciones.`,
                type: 'success',
            });
        } else {
            setStatusMessage({ text: res.error || 'Error al finalizar sesión.', type: 'error' });
        }
    };

    // Ejecutar Motor de Patronaje
    const generatingRef = useRef(false);

    // Vincula la ejecución a la creación en BD y, SOLO tras confirmarlo, actualiza en memoria
    // la creación (active_pattern_execution_id) y el historial en el mismo lote de render.
    // Así el efecto de sincronización siempre resuelve la ejecución activa y nunca devuelve null.
    const commitActiveExecution = async (creationId: string | null, exec: PatternExecution): Promise<string | null> => {
        if (creationId) {
            const linkRes = await linkPatternExecutionToCreation(creationId, exec.id);
            if (!linkRes.success) {
                return linkRes.error || 'No se pudo vincular el patrón a la creación.';
            }
            const linked: PatternExecution = { ...exec, creation_id: creationId };
            setSelectedCreation((prev) =>
                prev && prev.id === creationId ? { ...prev, active_pattern_execution_id: exec.id } : prev
            );
            setClientCreations((prev) =>
                prev.map((c) => (c.id === creationId ? { ...c, active_pattern_execution_id: exec.id } : c))
            );
            setCurrentExecution(linked);
            setExecutionHistory((prev) => [linked, ...prev.filter((e) => e.id !== linked.id)]);
        } else {
            setCurrentExecution(exec);
            setExecutionHistory((prev) => [exec, ...prev.filter((e) => e.id !== exec.id)]);
        }
        return null;
    };

    const handleGeneratePattern = async (bypassEstimatedConfirmation = false) => {
        if (generatingRef.current) return;
        if (!garmentType) {
            setStatusMessage({
                text: 'Debe vincular una categoría técnica de prenda a la creación antes de trazar el patrón.',
                type: 'error',
            });
            return;
        }

        if (activeWorkflow === 'creation_pattern' && selectedCreation) {
            if (selectedClient && selectedCreation.client_id !== selectedClient.id) {
                setStatusMessage({
                    text: 'Inconsistencia de contexto: La creación no pertenece a la clienta activa.',
                    type: 'error',
                });
                return;
            }
        }

        if (activeWorkflow !== 'free_pattern') {
            if (!selectedClient) {
                setStatusMessage({ text: 'Seleccione una clienta antes de continuar.', type: 'error' });
                return;
            }
            if (!selectedSession) {
                setStatusMessage({
                    text: 'La clienta no posee una sesión de medidas registrada. Por favor tome las medidas primero.',
                    type: 'error',
                });
                return;
            }

            // Regla 2: Consistencia cliente-sesión
            if (selectedSession.client_id !== selectedClient.id) {
                setStatusMessage({
                    text: 'Inconsistencia de titularidad: La sesión de medidas no pertenece a la clienta seleccionada.',
                    type: 'error',
                });
                return;
            }

            // Regla 2: No generar patrón definitivo desde borrador o sesión archivada
            if (selectedSession.status === 'draft') {
                setStatusMessage({
                    text: 'La sesión seleccionada está en estado "Borrador". Debe finalizar o verificar la sesión de medidas antes de generar un patrón definitivo de alta costura.',
                    type: 'error',
                });
                return;
            }
            if (selectedSession.status === 'archived') {
                setStatusMessage({
                    text: 'La sesión seleccionada está archivada y no permite generar nuevos patrones definitivos.',
                    type: 'error',
                });
                return;
            }

            // Bloqueo estricto si existen medidas obligatorias no resueltas (sin registro y sin cálculo C10)
            if (templateMeasurementDiagnostic.hasUnresolved) {
                const missingNames = templateMeasurementDiagnostic.unresolved
                    .map((item) => `${item.name} (${item.code})`)
                    .join(', ');
                setStatusMessage({
                    text: `Generación bloqueada: La plantilla seleccionada ("${selectedTemplate?.name}" v${selectedTemplate?.version}) exige medidas no registradas y sin cálculo derivado posible: ${missingNames}. Ingrese las medidas antes de ejecutar el motor.`,
                    type: 'error',
                });
                return;
            }

            // Control de medidas estimadas: si hay estimaciones y no han sido confirmadas explícitamente por la diseñadora
            if (templateMeasurementDiagnostic.hasEstimated && !allowEstimatedGeneration && !bypassEstimatedConfirmation) {
                setShowEstimatedModal(true);
                return;
            }
        }

        // REGLA 6: Bloquear generación si faltan medidas exigidas por la plantilla seleccionada
        if (!templateRequirementsCheck.valid) {
            if (!allowEstimatedGeneration && !bypassEstimatedConfirmation) {
                const missingNames = templateRequirementsCheck.missing
                    .map((c) => MEASUREMENT_MAP[c]?.name || c)
                    .join(', ');
                setStatusMessage({
                    text: `Generación bloqueada: La plantilla seleccionada ("${selectedTemplate?.name}" v${selectedTemplate?.version}) exige ${templateRequirementsCheck.missing.length} medida(s) obligatoria(s) faltante(s) en la clienta: ${missingNames}. Ingrese las medidas antes de ejecutar el motor.`,
                    type: 'error',
                });
                return;
            }
        }

        generatingRef.current = true;
        setIsGenerating(true);
        setStatusMessage(null);

        try {
            const measurementsToUse = (activeWorkflow !== 'free_pattern' && templateMeasurementDiagnostic.hasEstimated)
                ? templateMeasurementDiagnostic.resolvedMeasurementsMm
                : activeMeasurementsMm;

            const engineOutput = executePatternEngine({
                garmentType,
                measurementsMm: measurementsToUse,
                ease: selectedEaseProfile,
                designParameters: designParams,
            });

            setGeometryResult(engineOutput.geometryResult);
            setValidationResult(engineOutput.validationResult);

            if (engineOutput.success) {
                setPatternStatus('generated');
                setLastGeneratedSessionId(selectedSession?.id || null);
                setAllowEstimatedGeneration(false);

                // REGLAS 8 y 11: Persistencia inmutable con UUID real de Supabase
                // Nunca guardar un identificador ficticio/local en pattern_executions.template_id
                const isRealUuid =
                    Boolean(selectedTemplate?.id) &&
                    !selectedTemplate?.id.startsWith('fallback_') &&
                    !selectedTemplate?.id.startsWith('local_') &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        selectedTemplate!.id
                    );

                // Trazabilidad de client_id: selectedClient.id y clientId: selectedClient.id en flujos no libres
                const resolvedClientId = activeWorkflow === 'free_pattern' ? null : (selectedClient ? selectedClient.id : null);
                const resolvedSessionId = activeWorkflow === 'free_pattern' ? null : (selectedSession?.id || null);
                const resolvedCreationId = (activeWorkflow === 'creation_pattern' && selectedCreation?.id)
                    ? selectedCreation.id
                    : (activeWorkflow === 'free_pattern' ? null : (initialCreationId || null));

                if (!isRealUuid && activeWorkflow !== 'creation_pattern') {
                    const localBaseExec: PatternExecution = {
                        id: `local_base_${Date.now()}`,
                        client_id: resolvedClientId,
                        session_id: resolvedSessionId,
                        creation_id: resolvedCreationId,
                        garment_type: garmentType,
                        version_label: selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0',
                        engine_version: engineOutput.engineVersion,
                        status: 'generated',
                        measurement_snapshot: engineOutput.resolvedMeasurementsMm,
                        ease_profile_snapshot: selectedEaseProfile,
                        design_parameters: designParams,
                        seam_allowance_default_mm: designParams.seam_allowance_default_mm || 10,
                        geometry_result: engineOutput.geometryResult,
                        validation_results: engineOutput.validationResult,
                        measurement_provenance: templateMeasurementDiagnostic.allItems.reduce((acc, item) => {
                            if (item.status !== 'unresolved') {
                                acc[item.code] = item.status;
                            }
                            return acc;
                        }, {} as Record<string, 'real' | 'calculated' | 'estimated'>),
                        has_estimated_measurements: templateMeasurementDiagnostic.hasEstimated,
                        template_id: selectedTemplate?.id || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    const localErr = await commitActiveExecution(resolvedCreationId, localBaseExec);
                    if (localErr) {
                        setStatusMessage({ text: `El patrón se calculó pero no se pudo vincular: ${localErr}. Pulse de nuevo para reintentar.`, type: 'error' });
                        return;
                    }
                    const originLabel = activeWorkflow === 'free_pattern'
                        ? 'Patrón Libre trazado en el Banco Global.'
                        : activeWorkflow === 'direct_pattern'
                        ? 'Patronaje Directo trazado a medida.'
                        : 'Patrón asociado a Creación trazado con éxito.';
                    setStatusMessage({
                        text: `✓ ${originLabel} (${engineOutput.geometryResult.pieces.length} piezas geométricas calculadas en mm).`,
                        type: 'success',
                    });
                } else {
                    const saveRes = await savePatternExecution({
                        clientId: resolvedClientId,
                        sessionId: resolvedSessionId,
                        garmentType,
                        versionLabel: selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0',
                        engineVersion: engineOutput.engineVersion,
                        measurementSnapshot: engineOutput.resolvedMeasurementsMm,
                        easeProfileSnapshot: selectedEaseProfile,
                        designParameters: designParams,
                        geometryResult: engineOutput.geometryResult,
                        validationResults: engineOutput.validationResult,
                        // Plantilla sin UUID real (fallback/local): se persiste con template_id nulo, nunca con un id ficticio
                        templateId: isRealUuid ? selectedTemplate!.id : null,
                        creationId: resolvedCreationId,
                    });
                    if (saveRes.success && saveRes.execution) {
                        const commitErr = await commitActiveExecution(resolvedCreationId, saveRes.execution);
                        if (commitErr) {
                            setStatusMessage({
                                text: `El patrón se guardó pero no se pudo vincular a la creación: ${commitErr}. Pulse de nuevo para reintentar.`,
                                type: 'error',
                            });
                            return;
                        }
                        const originLabel = activeWorkflow === 'free_pattern'
                            ? 'Patrón Libre guardado en el Banco Global.'
                            : activeWorkflow === 'direct_pattern'
                            ? 'Patronaje Directo guardado con éxito.'
                            : 'Patrón asociado a Creación guardado con éxito.';
                        setStatusMessage({
                            text: `✓ ${originLabel} (${engineOutput.geometryResult.pieces.length} piezas geométricas).`,
                            type: 'success',
                        });
                    } else {
                        setStatusMessage({
                            text: `No se pudo guardar el patrón: ${saveRes.error || 'error desconocido'}. Pulse de nuevo para reintentar.`,
                            type: 'error',
                        });
                    }
                }
            } else {
                setPatternStatus('needs_revision');
                setStatusMessage({
                    text: `El motor no pudo completar el trazo. Faltan ${engineOutput.validationResult.missingRequiredMeasurements.length} medidas obligatorias.`,
                    type: 'error',
                });
            }
        } catch (err: any) {
            setStatusMessage({ text: `Error inesperado: ${err?.message || err}`, type: 'error' });
        } finally {
            generatingRef.current = false;
            setIsGenerating(false);
        }
    };

    // Envío a prueba de vestuario (pending_fitting)
    const handleSendToFitting = async () => {
        if (role === 'client') {
            setStatusMessage({ text: 'Acción restringida: El perfil clienta no dispone de permisos de taller.', type: 'error' });
            return;
        }
        const fittingGate = evaluateFittingTransition({
            role,
            currentExecution,
            creation: selectedCreation,
            executions: executionHistory,
            isCreationFlow: activeWorkflow === 'creation_pattern',
        });
        if (!fittingGate.allowed || !currentExecution) {
            setStatusMessage({
                text: fittingGate.reason === 'not_active_execution'
                    ? 'El patrón mostrado no es el patrón activo vinculado a esta creación. Regenere o seleccione la ejecución activa antes de enviar a Fitting.'
                    : 'No hay un patrón guardado para enviar a Fitting. Genere el patrón y confirme su guardado primero.',
                type: 'error',
            });
            return;
        }

        if (currentExecution.id.startsWith('local_')) {
            setPatternStatus('pending_fitting');
            const updated = { ...currentExecution, status: 'pending_fitting' as PatternStatus };
            setCurrentExecution(updated);
            setExecutionHistory((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setStatusMessage({
                text: 'Patrón en prueba de vestuario ("pending_fitting"). Puede registrar ajustes de confección.',
                type: 'info',
            });
            return;
        }

        const res = await updatePatternStatus(currentExecution.id, 'pending_fitting');
        if (res.success) {
            setPatternStatus('pending_fitting');
            const updated = { ...currentExecution, status: 'pending_fitting' as PatternStatus };
            setCurrentExecution(updated);
            setExecutionHistory((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            if (activeWorkflow === 'creation_pattern' && selectedCreation) {
                setSelectedCreation((prev) =>
                    prev ? { ...prev, status: 'fitting', active_pattern_execution_id: updated.id } : null
                );
                setClientCreations((prev) =>
                    prev.map((c) =>
                        c.id === selectedCreation.id
                            ? { ...c, status: 'fitting', active_pattern_execution_id: updated.id }
                            : c
                    )
                );
                try {
                    await updateCreation(selectedCreation.id, {
                        status: 'fitting',
                        active_pattern_execution_id: updated.id,
                    });
                } catch (cErr) {
                    console.warn('[PatternModule] Error updating creation status to fitting:', cErr);
                }
            }
            setStatusMessage({
                text: 'Patrón en prueba de vestuario ("pending_fitting"). Puede registrar ajustes de confección.',
                type: 'info',
            });
        } else {
            setStatusMessage({
                text: res.error || 'No se pudo actualizar el estado a prueba de vestuario.',
                type: 'error',
            });
        }
    };

    const approvingRef = useRef(false);

    // Acción para aprobar patrón exigiendo que esté en prueba de vestuario (FITTING) con validación completa
    const handleApprovePattern = () => {
        handleRequestApproval();
    };

    // Apertura de confirmación obligatoria previa a la aprobación
    const handleRequestApproval = () => {
        if (!geometryResult || !currentExecution) {
            setStatusMessage({
                text: 'Aprobación técnica denegada: Debe generar el patrón en la Mesa CAD antes de poder aprobarlo.',
                type: 'error',
            });
            return;
        }

        const approvalGate = evaluateApprovalTransition({
            role,
            currentExecution,
            creation: selectedCreation,
            executions: executionHistory,
            isCreationFlow: activeWorkflow === 'creation_pattern',
            patternStatus,
            hasBlockedCriteria: validationChecklist.hasBlocked,
        });
        if (!approvalGate.allowed) {
            setStatusMessage({
                text: approvalGate.message || 'No se puede aprobar el patrón.',
                type: 'error',
            });
            return;
        }

        if (role === 'client') {
            setStatusMessage({
                text: 'Acción no autorizada: El perfil clienta no dispone de permisos para aprobar patrones.',
                type: 'error',
            });
            return;
        }
        if (patternStatus !== 'pending_fitting') {
            setStatusMessage({
                text: 'Envíe el patrón a prueba primero (FITTING) antes de aprobar formalmente.',
                type: 'error',
            });
            return;
        }
        if (validationChecklist.hasBlocked) {
            const blockedItems = validationChecklist.items
                .filter((i) => i.status === 'BLOCKED')
                .map((i) => i.label)
                .join(', ');
            setStatusMessage({
                text: `Aprobación técnica denegada: Existen criterios críticos en estado BLOCKED (${blockedItems}).`,
                type: 'error',
            });
            return;
        }
        if (!validationResult || validationResult.valid !== true || (validationResult.errors && validationResult.errors.length > 0)) {
            setStatusMessage({
                text: 'Aprobación técnica denegada: Un patrón solo puede aprobarse para corte si su validación geométrica es auténticamente válida y carece de errores.',
                type: 'error',
            });
            return;
        }
        if (validationResult.missingRequiredMeasurements && validationResult.missingRequiredMeasurements.length > 0) {
            setStatusMessage({
                text: `Aprobación técnica denegada: Faltan ${validationResult.missingRequiredMeasurements.length} medida(s) obligatoria(s).`,
                type: 'error',
            });
            return;
        }
        setIsApprovalConfirmOpen(true);
    };

    // Aprobación formal por Katherine Carroll con bloqueo histórico inmutable
    const handleApprovePatternConfirm = async () => {
        if (approvingRef.current) return;
        approvingRef.current = true;

        try {
            const approvalGate = evaluateApprovalTransition({
                role,
                currentExecution,
                creation: selectedCreation,
                executions: executionHistory,
                isCreationFlow: activeWorkflow === 'creation_pattern',
                patternStatus,
                hasBlockedCriteria: validationChecklist.hasBlocked,
            });
            if (!approvalGate.allowed && currentExecution) {
                setStatusMessage({
                    text: approvalGate.message || 'No se puede aprobar el patrón.',
                    type: 'error',
                });
                setIsApprovalConfirmOpen(false);
                return;
            }

            if (!geometryResult || !validationResult || validationResult.valid !== true || (validationResult.errors && validationResult.errors.length > 0)) {
                setStatusMessage({
                    text: 'Aprobación técnica denegada: Un patrón solo puede aprobarse para corte si su validación geométrica es válida y carece de errores.',
                    type: 'error',
                });
                setIsApprovalConfirmOpen(false);
                return;
            }

            if (!currentExecution || !geometryResult) {
                setIsApprovalConfirmOpen(false);
                setStatusMessage({
                    text: 'Aprobación cancelada: No existe un patrón generado para aprobar.',
                    type: 'error',
                });
                return;
            }

            if (activeWorkflow === 'free_pattern') {
                const updatedExec: PatternExecution = {
                    ...currentExecution,
                    status: 'approved_by_designer',
                    updated_at: new Date().toISOString(),
                };
                if (!currentExecution.id.startsWith('local_')) {
                    await updatePatternStatus(
                        currentExecution.id,
                        'approved_by_designer',
                        'Patrón libre validado y formalmente aprobado para Banco Global por Katherine Carroll.'
                    );
                }
                setPatternStatus('approved_by_designer');
                setCurrentExecution(updatedExec);
                setExecutionHistory((prev) =>
                    prev.map((e) => (e.id === updatedExec.id ? updatedExec : e))
                );
                setIsApprovalConfirmOpen(false);
                setStatusMessage({
                    text: '✓ PATRÓN LIBRE APROBADO: Patrón validado y formalmente archivado en el Banco Global de Patrones.',
                    type: 'success',
                });
                return;
            }

            const res = await approvePatternExecution({
                execution: currentExecution,
                notes: 'Patrón validado y aprobado formalmente para corte por Katherine Carroll tras prueba de vestuario.',
            });

            setIsApprovalConfirmOpen(false);

            if (res.success && res.updatedExecution) {
                setPatternStatus('approved_by_designer');
                setCurrentExecution(res.updatedExecution);
                setExecutionHistory((prev) =>
                    prev.map((e) => (e.id === res.updatedExecution!.id ? res.updatedExecution! : e))
                );

                if (activeWorkflow === 'creation_pattern' && selectedCreation) {
                    setSelectedCreation((prev) =>
                        prev ? { ...prev, status: 'approved', active_pattern_execution_id: res.updatedExecution!.id } : null
                    );
                    setClientCreations((prev) =>
                        prev.map((c) =>
                            c.id === selectedCreation.id
                                ? { ...c, status: 'approved', active_pattern_execution_id: res.updatedExecution!.id }
                                : c
                        )
                    );
                    try {
                        await updateCreation(selectedCreation.id, {
                            status: 'approved',
                            active_pattern_execution_id: res.updatedExecution.id,
                        });
                    } catch (cErr) {
                        console.warn('[PatternModule] Error updating creation status to approved:', cErr);
                    }
                }

                setStatusMessage({
                    text: `✓ PATRÓN APROBADO: Versión ${res.updatedExecution.version_label} bloqueada como versión histórica inmutable. Listo para producción.`,
                    type: 'success',
                });
            } else {
                setStatusMessage({
                    text: res.error || 'No se pudo registrar la aprobación en el servidor.',
                    type: 'error',
                });
            }
        } finally {
            approvingRef.current = false;
        }
    };

    // Exportar SVG real-scale (Descarga web o visor)
    const handleExportSvg = () => {
        if (!geometryResult) return;
        const clientSuffix = activeWorkflow === 'free_pattern'
            ? `BancoGlobal_${selectedReferenceProfileCode}`
            : (selectedClient?.full_name?.replace(/\s+/g, '_') || 'SinClienta');
        const titleSuffix = activeWorkflow === 'free_pattern'
            ? `Patrón Libre (Banco Global - ${freePatternProfileLabel})`
            : (selectedClient?.full_name || 'Atelier');
        const svgContent = exportPatternToSvg(geometryResult, {
            title: `Patrón ${GARMENT_PACKAGES[garmentType].name} — ${titleSuffix}`,
        });

        if (Platform.OS === 'web') {
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Patron_${garmentType}_${clientSuffix}_1a1.svg`;
            a.click();
            URL.revokeObjectURL(url);
            setStatusMessage({ text: 'Archivo SVG a escala física 1:1 descargado.', type: 'info' });
        } else {
            Alert.alert('SVG Generado', 'La exportación física a escala 1:1 está lista.');
        }
    };

    // Exportar Impresión en Mosaico 1:1 (A4/Carta)
    const handlePrintTiled = () => {
        if (!geometryResult) return;
        const clientDisplayName = activeWorkflow === 'free_pattern'
            ? `Patrón Libre / Banco Global (${freePatternProfileLabel})`
            : (selectedClient?.full_name || 'Clienta');
        const html = generateTiledPrintHtml(geometryResult, {
            title: `Patrón ${GARMENT_PACKAGES[garmentType].name}`,
            clientName: clientDisplayName,
            paperSize: 'a4',
        });

        if (Platform.OS === 'web') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } else {
            Alert.alert('Mosaico 1:1', 'Ventana de impresión en mosaico generada.');
        }
    };

    // Exportar DXF CAD (AutoCAD R12) (Pasos 9, 10 y 11 - M02.12)
    const handleExportDxf = () => {
        if (!geometryResult) {
            setStatusMessage({
                text: 'No hay ningún patrón generado para exportar. Por favor genere el patrón primero.',
                type: 'error',
            });
            return;
        }

        // PASO 9: Validación geométrica obligatoria antes de exportar
        const geomValidation = validateGeometryForCadExport(geometryResult);
        if (!geomValidation.valid) {
            setStatusMessage({
                text: `Exportación CAD/DXF bloqueada por fallo geométrico: ${geomValidation.errors.join('; ')}.`,
                type: 'error',
            });
            return;
        }

        try {
            // PASO 10: Exportación CAD DXF R12
            const dxfContent = exportPatternToDxf(
                geometryResult,
                `Atelier Digital - ${GARMENT_PACKAGES[garmentType].name}`
            );

            const tplName = selectedTemplate ? selectedTemplate.name.replace(/\s+/g, '_') : 'Base';
            const versionStr = selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0';
            const fileName = `Patron_${garmentType}_${tplName}_${versionStr}_R12.dxf`;
            const formattedDate = new Date().toLocaleString();

            // PASO 11: Información técnica estructurada de exportación
            setLastExportInfo({
                fileName,
                garmentName: GARMENT_PACKAGES[garmentType].name,
                templateName: selectedTemplate?.name || 'Plantilla Base',
                version: versionStr,
                date: formattedDate,
                units: 'Milímetros (mm) — Escala 1:1',
                piecesCount: geometryResult.pieces.length,
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([dxfContent], { type: 'application/dxf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                setStatusMessage({
                    text: `Patrón exportado correctamente en formato CAD DXF (AutoCAD R12). Archivo: ${fileName} (${geometryResult.pieces.length} piezas, unidades en mm).`,
                    type: 'success',
                });
            } else {
                Alert.alert(
                    'Patrón exportado correctamente',
                    `Archivo: ${fileName}\nPrenda: ${GARMENT_PACKAGES[garmentType].name}\nPlantilla: ${selectedTemplate?.name || 'Base'}\nVersión: ${versionStr}\nFecha: ${formattedDate}\nUnidades: Milímetros (mm)\nPiezas: ${geometryResult.pieces.length}`
                );
            }
        } catch (err: any) {
            setStatusMessage({
                text: `Error al generar archivo DXF: ${err?.message || err}`,
                type: 'error',
            });
        }
    };

    // CIERRE EDITORIAL FLUJO D: GUARDAR EN EL BANCO DEL ATELIER
    const renderBankClosureSection = () => {
        if (activeWorkflow !== 'free_pattern') return null;
        return (
            <View style={styles.bankClosureContainer}>
                <View style={styles.bankClosureHeader}>
                    <View style={styles.bankClosureBadge}>
                        <Text style={styles.bankClosureBadgeText}>CIERRE TÉCNICO · BANCO GLOBAL</Text>
                    </View>
                    <Text style={styles.bankClosureTitle}>
                        Guardar en el Banco del Atelier
                    </Text>
                    <Text style={styles.bankClosureSubtitle}>
                        Este patrón libre puede ser archivado de forma inmutable en el Banco Global de Alta Costura para prototipado, catálogo de moldería arquetípica o futura vinculación a clientas y creaciones.
                    </Text>
                </View>

                <View style={styles.bankClosureActionsRow}>
                    <TouchableOpacity
                        style={styles.bankClosureSaveBtn}
                        onPress={() => {
                            if (!currentExecution) {
                                handleGeneratePattern();
                            } else {
                                setStatusMessage({
                                    text: `✓ Patrón libre ${currentExecution.version_label} guardado y confirmado en el Banco Global del Atelier.`,
                                    type: 'success',
                                });
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.bankClosureSaveBtnText}>
                            GUARDAR PATRÓN →
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bankClosureExperimentBtn}
                        onPress={() => {
                            setActiveStudioTab('garment');
                            setStatusMessage({
                                text: 'Modo experimentación: puede seleccionar otras tallas, siluetas o editar cotas.',
                                type: 'info',
                            });
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.bankClosureExperimentBtnText}>
                            CONTINUAR EXPERIMENTANDO →
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bankClosureBankBtn}
                        onPress={() => router.push('/(designer)/pattern-bank')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.bankClosureBankBtnText}>
                            VER BANCO GLOBAL →
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Barra superior con identidad editorial Atelier Digital */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>{titleBack}</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <View style={styles.headerBrandBadge}>
                        <Text style={styles.headerStar}>✦</Text>
                        <Text style={styles.superHeader}>BY KATHERINE CARROLL · ATELIER DIGITAL</Text>
                    </View>
                    <Text style={styles.mainHeader}>
                        {activeWorkflow === 'free_pattern'
                            ? 'Patrón Libre'
                            : initialCreationId
                            ? 'MÓDULO 02 · CREACIÓN VINCULADA'
                            : 'MÓDULO 02 · ALTA COSTURA'}
                    </Text>
                    <Text style={styles.headerSubLead}>
                        {activeWorkflow === 'free_pattern'
                            ? 'Experimentación, geometría y oficio sin límites.'
                            : initialCreationId
                            ? 'Patronaje CAD para Creación'
                            : 'Banco de Patrones & Copiloto Consultivo'}
                    </Text>
                </View>

                <View style={styles.headerActionsGroup}>
                    {/* Botón de Banco Global de Patrones */}
                    <TouchableOpacity
                        style={styles.bankHeaderBtn}
                        onPress={() => router.push('/(designer)/pattern-bank')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.bankHeaderBtnText}>📚 Banco de Patrones</Text>
                    </TouchableOpacity>

                    {/* Botón de Copiloto Consultivo */}
                    <TouchableOpacity
                        style={styles.copilotHeaderBtn}
                        onPress={() => setIsCopilotModalOpen(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.copilotHeaderBtnText}>✨ Copiloto Consultivo</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Barra de Sub-Navegación de Flujo cuando no estamos en Hub */}
            {activeWorkflow !== 'hub' && (
                <View style={styles.workflowSubHeader}>
                    <TouchableOpacity
                        style={styles.workflowBackToHubBtn}
                        onPress={() => setActiveWorkflow('hub')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.workflowBackToHubBtnText}>← Menú Módulo 02</Text>
                    </TouchableOpacity>

                    <View style={styles.workflowBadgeContainer}>
                        <View
                            style={[
                                styles.workflowPillBadge,
                                activeWorkflow === 'measurements' && styles.workflowPillA,
                                activeWorkflow === 'direct_pattern' && styles.workflowPillB,
                                activeWorkflow === 'creation_pattern' && styles.workflowPillC,
                                activeWorkflow === 'free_pattern' && styles.workflowPillD,
                            ]}
                        >
                            <Text style={styles.workflowPillBadgeText}>
                                {activeWorkflow === 'measurements' && '📏 FLUJO A · GESTIÓN DE MEDIDAS'}
                                {activeWorkflow === 'direct_pattern' && '✂️ FLUJO B · PATRONAJE DIRECTO'}
                                {activeWorkflow === 'creation_pattern' && '👗 FLUJO C · PATRÓN PARA CREACIÓN'}
                                {activeWorkflow === 'free_pattern' && '🧪 FLUJO D · PATRÓN LIBRE / BANCO'}
                            </Text>
                        </View>

                        <Text style={styles.workflowContextSummary} numberOfLines={1}>
                            {activeWorkflow === 'measurements' && (selectedClient ? `${selectedClient.full_name} (${sessions.length} sesiones)` : 'Seleccionar clienta')}
                            {activeWorkflow === 'direct_pattern' && (selectedClient ? `${selectedClient.full_name} · ${selectedSession ? `v${selectedSession.version_number}` : 'Sin sesión'}` : 'Seleccionar clienta')}
                            {activeWorkflow === 'creation_pattern' && (selectedClient ? `${selectedClient.full_name} · ${selectedCreation ? selectedCreation.name : 'Seleccionar creación'}` : 'Seleccionar clienta')}
                            {activeWorkflow === 'free_pattern' && `Perfil: ${freePatternProfileLabel} · Banco Global`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.switchFlowHeaderBtn}
                        onPress={() => setActiveWorkflow('hub')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.switchFlowHeaderBtnText}>Cambiar Flujo ▾</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={[styles.scrollContent, activeWorkflow === 'free_pattern' && styles.scrollContentFree]}>
                {/* Notificación Flotante Toast para Tableta (no empuja el contenido) */}
                {statusMessage && (
                    <View
                        style={[
                            styles.floatingToast,
                            statusMessage.type === 'success' && styles.floatingToastSuccess,
                            statusMessage.type === 'error' && styles.floatingToastError,
                            statusMessage.type === 'info' && styles.floatingToastInfo,
                        ]}
                    >
                        <Text style={styles.floatingToastIcon}>
                            {statusMessage.type === 'success' ? '✓' : statusMessage.type === 'error' ? '⚠️' : 'ℹ️'}
                        </Text>
                        <Text style={styles.floatingToastText}>{statusMessage.text}</Text>
                        <TouchableOpacity
                            onPress={() => setStatusMessage(null)}
                            style={styles.floatingToastClose}
                        >
                            <Text style={styles.floatingToastCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ============================================================================== */}
                {/* 1. VISTA EDITORIAL: HUB PRINCIPAL (MÓDULO 02 · ALTA COSTURA)                   */}
                {/* ============================================================================== */}
                {activeWorkflow === 'hub' && (
                    <View style={styles.hubContainer}>
                        {/* HERO EDITORIAL ASIMÉTRICO DE ALTA COSTURA */}
                        <View style={[styles.hubHeroCard, isMobile && styles.hubHeroCardMobile]}>
                            <View style={styles.hubHeroContent}>
                                <View style={styles.hubHeroEyebrowRow}>
                                    <Text style={styles.hubHeroStar}>✦</Text>
                                    <Text style={styles.hubHeroEyebrow}>ATELIER DIGITAL · BY KATHERINE CARROLL</Text>
                                    <View style={styles.hubHeroTag}>
                                        <Text style={styles.hubHeroTagText}>MÓDULO 02 · ALTA COSTURA</Text>
                                    </View>
                                </View>
                                <Text style={styles.hubHeroTitle}>Del cuerpo al patrón.</Text>
                                <Text style={styles.hubHeroSubtitle}>
                                    Precisión anatómica, geometría paramétrica y trazabilidad técnica.
                                </Text>
                                <Text style={styles.hubHeroDescription}>
                                    Estudio técnico de patronaje digital y corte a medida. Formulación matemática de aplomos, holguras y curvas de contorno para transformar medidas corporales en patrones de alta costura con precisión milimétrica.
                                </Text>

                                <View style={styles.hubHeroBadgesRow}>
                                    <View style={styles.hubHeroPill}>
                                        <Text style={styles.hubHeroPillDot}>•</Text>
                                        <Text style={styles.hubHeroPillText}>Tolerancia milimétrica ±0.5 mm</Text>
                                    </View>
                                    <View style={styles.hubHeroPill}>
                                        <Text style={styles.hubHeroPillDot}>•</Text>
                                        <Text style={styles.hubHeroPillText}>Graduación y aplomos anatómicos</Text>
                                    </View>
                                    <View style={styles.hubHeroPill}>
                                        <Text style={styles.hubHeroPillDot}>•</Text>
                                        <Text style={styles.hubHeroPillText}>Exportación vectorial DXF / SVG / PDF</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.hubHeroImageWrapper, isMobile && styles.hubHeroImageWrapperMobile]}>
                                <Image
                                    source={PATTERN_HERO_IMAGE}
                                    style={styles.hubHeroImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.hubHeroImageOverlay} />
                                <View style={styles.hubHeroImageCaption}>
                                    <Text style={styles.hubHeroImageCaptionEyebrow}>MESA DE CORTE & MODELADO CAD</Text>
                                    <Text style={styles.hubHeroImageCaptionTitle}>Estudio de Patronaje de Alta Costura</Text>
                                </View>
                            </View>
                        </View>

                        {/* SECCIÓN "EXPERIENCIAS DE PATRONAJE" */}
                        <View style={styles.hubSectionHeader}>
                            <View style={styles.hubSectionHeaderLine} />
                            <View style={styles.hubSectionHeaderContent}>
                                <Text style={styles.hubSectionEyebrow}>ESTUDIO TÉCNICO DE PATRONAJE</Text>
                                <Text style={styles.hubSectionTitle}>Experiencias de Patronaje</Text>
                                <Text style={styles.hubSectionSubtitle}>
                                    Selecciona la vía de trabajo para modelar y certificar patrones de alta costura:
                                </Text>
                            </View>
                            <View style={styles.hubSectionHeaderLine} />
                        </View>

                        {/* ============================================================================== */}
                        {/* 1. VÍAS PRINCIPALES: 01 CLIENTAS, 02 DIRECTO, 03 CREACIONES                   */}
                        {/* ============================================================================== */}
                        <View style={protagonistCardsGridStyle}>
                            {/* 01 · MIS CLIENTAS */}
                            <TouchableOpacity
                                style={styles.hubCoProtagonistCard}
                                onPress={() => setActiveWorkflow('measurements')}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubCardImageWrapperProtagonist}>
                                    <Image
                                        source={PATTERN_CLIENTS_IMAGE}
                                        style={styles.hubCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>01 · MEDIDAS & ANATOMÍA</Text>
                                    </View>
                                </View>

                                <View style={styles.hubCoProtagonistCardBody}>
                                    <View style={styles.hubProtagonistEyebrowRow}>
                                        <Text style={styles.hubPrimaryCardEyebrow}>01 · MIS CLIENTAS</Text>
                                        <View style={styles.hubCoutureTag}>
                                            <Text style={styles.hubCoutureTagText}>MEDIDAS</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.hubCoProtagonistCardTitle}>Mis Clientas</Text>
                                    <Text style={styles.hubCoProtagonistCardSub}>
                                        Gestiona medidas y sesiones corporales.
                                    </Text>
                                    <Text style={styles.hubCoProtagonistCardDesc}>
                                        Consulta, registra y rectifica las cotas anatómicas corporales de tus clientas para alimentar el motor paramétrico.
                                    </Text>

                                    {/* Flujo conceptual de taller: CLIENTAS → ANATOMÍA → SESIONES → COTAS */}
                                    <View style={styles.hubConceptFlow}>
                                        <Text style={styles.hubConceptFlowLabel}>FLUJO DE REGISTRO:</Text>
                                        <View style={styles.hubConceptPipeline}>
                                            <View style={styles.hubConceptPillActive}><Text style={styles.hubConceptPillTextActive}>CLIENTAS</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>ANATOMÍA</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>SESIONES</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>COTAS</Text></View>
                                        </View>
                                    </View>

                                    <View style={styles.hubCoProtagonistCardFooter}>
                                        <View style={styles.hubStepSummary}>
                                            <Text style={styles.hubStepSummaryText}>Directorio · Medición · Rectificación</Text>
                                        </View>
                                        <View style={styles.hubCoProtagonistActionBtn}>
                                            <Text style={styles.hubCoProtagonistActionBtnText}>ENTRAR AL REGISTRO →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* 02 · PATRONAJE DIRECTO (PROTAGONISTA SUPREMO) */}
                            <TouchableOpacity
                                style={styles.hubProtagonistCard}
                                onPress={() => {
                                    setSelectedCreation(null);
                                    setActiveWorkflow('direct_pattern');
                                }}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubCardImageWrapperProtagonist}>
                                    <Image
                                        source={PATTERN_DIRECT_IMAGE}
                                        style={styles.hubCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubProtagonistImageOverlay} />
                                    <View style={styles.hubProtagonistBadgeFloating}>
                                        <Text style={styles.hubProtagonistBadgeFloatingText}>★ EXPERIENCIA PROTAGONISTA · ALTA COSTURA</Text>
                                    </View>
                                </View>

                                <View style={styles.hubProtagonistCardBody}>
                                    <View style={styles.hubProtagonistEyebrowRow}>
                                        <Text style={styles.hubProtagonistEyebrow}>02 · PATRONAJE DIRECTO</Text>
                                        <View style={styles.hubCoutureTag}>
                                            <Text style={styles.hubCoutureTagText}>DIRECTO A CAD</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.hubProtagonistCardTitle}>Patronaje Directo</Text>
                                    <Text style={styles.hubProtagonistCardSub}>
                                        Crea un patrón desde una clienta, sus medidas y una prenda.
                                    </Text>
                                    <Text style={styles.hubProtagonistCardDesc}>
                                        Transforma de inmediato las medidas tomadas en el maniquí o clienta en un patrón técnico calibrado, sin requerir una ficha previa de Creación.
                                    </Text>

                                    {/* Flujo conceptual de taller: MEDIDAS → PRENDA → PATRONAJE → CAD → PRODUCCIÓN */}
                                    <View style={styles.hubConceptFlow}>
                                        <Text style={styles.hubConceptFlowLabel}>FLUJO DE EJECUCIÓN:</Text>
                                        <View style={styles.hubConceptPipeline}>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>MEDIDAS</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>PRENDA</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPillActive}><Text style={styles.hubConceptPillTextActive}>PATRONAJE</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CAD</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>PRODUCCIÓN</Text></View>
                                        </View>
                                    </View>

                                    <View style={styles.hubProtagonistCardFooter}>
                                        <View style={styles.hubStepSummary}>
                                            <Text style={styles.hubStepSummaryHighlight}>Clienta → Sesión → Prenda → CAD</Text>
                                        </View>
                                        <View style={styles.hubProtagonistActionBtn}>
                                            <Text style={styles.hubProtagonistActionBtnText}>ABRIR MOTOR DE PATRONAJE →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* 03 · PATRONES DE CREACIONES (CO-PROTAGONISTA) */}
                            <TouchableOpacity
                                style={styles.hubCoProtagonistCard}
                                onPress={() => {
                                    // Flujo C: clienta y creación se eligen siempre de forma explícita.
                                    if (!(creationContextConfirmedRef.current && selectedClient && selectedCreation)) {
                                        creationContextConfirmedRef.current = false;
                                        setSelectedCreation(null);
                                        setSelectedClient(null);
                                    }
                                    setActiveCreationStage('creation');
                                    setActiveWorkflow('creation_pattern');
                                }}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubCardImageWrapperProtagonist}>
                                    <Image
                                        source={PATTERN_CREATIONS_IMAGE}
                                        style={styles.hubCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>03 · COLECCIÓN & FITTINGS</Text>
                                    </View>
                                </View>

                                <View style={styles.hubCoProtagonistCardBody}>
                                    <View style={styles.hubProtagonistEyebrowRow}>
                                        <Text style={styles.hubPrimaryCardEyebrow}>03 · PATRONES DE CREACIONES</Text>
                                        <View style={styles.hubCoutureTag}>
                                            <Text style={styles.hubCoutureTagText}>VINCULADO</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.hubCoProtagonistCardTitle}>Patrones de Creaciones</Text>
                                    <Text style={styles.hubCoProtagonistCardSub}>
                                        Construye y administra patrones vinculados a Creaciones.
                                    </Text>
                                    <Text style={styles.hubCoProtagonistCardDesc}>
                                        Desarrolla patrones vinculados a fichas de Creación de Alta Costura con trazabilidad de versiones, bitácora de fittings y dossier técnico de taller.
                                    </Text>

                                    {/* Flujo conceptual de Creación */}
                                    <View style={styles.hubConceptFlow}>
                                        <Text style={styles.hubConceptFlowLabel}>FLUJO DE CREACIÓN:</Text>
                                        <View style={styles.hubConceptPipeline}>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CLIENTA</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CREACIÓN</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPillActive}><Text style={styles.hubConceptPillTextActive}>FITTINGS</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CAD</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>DOSSIER</Text></View>
                                        </View>
                                    </View>

                                    <View style={styles.hubCoProtagonistCardFooter}>
                                        <View style={styles.hubStepSummary}>
                                            <Text style={styles.hubStepSummaryText}>Clienta → Creación → Sesión → CAD</Text>
                                        </View>
                                        <View style={styles.hubCoProtagonistActionBtn}>
                                            <Text style={styles.hubCoProtagonistActionBtnText}>CONSTRUIR PATRÓN DE CREACIÓN →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ============================================================================== */}
                        {/* 2. ARCHIVO CENTRAL & EXPERIMENTACIÓN (04 · BANCO, 05 · PATRÓN LIBRE)           */}
                        {/* ============================================================================== */}
                        <View style={styles.hubSecondaryHeaderRow}>
                            <View style={styles.hubSecondaryDivider} />
                            <Text style={styles.hubSecondarySectionTitle}>ARCHIVO CENTRAL & EXPERIMENTACIÓN CAD</Text>
                            <View style={styles.hubSecondaryDivider} />
                        </View>

                        <View style={secondaryCardsGridStyle}>

                            {/* 04 · BANCO DE PATRONES */}
                            <TouchableOpacity
                                style={styles.hubSecondaryCard}
                                onPress={() => router.push('/(designer)/pattern-bank')}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubSecondaryCardImageWrapper}>
                                    <Image
                                        source={PATTERN_ARCHIVE_IMAGE}
                                        style={styles.hubSecondaryCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>04 · ARCHIVO CENTRAL CAD</Text>
                                    </View>
                                </View>

                                <View style={styles.hubSecondaryCardBody}>
                                    <Text style={styles.hubSecondaryCardEyebrow}>04 · BANCO DE PATRONES</Text>
                                    <Text style={styles.hubSecondaryCardTitle}>Banco de Patrones</Text>
                                    <Text style={styles.hubSecondaryCardSub}>
                                        Tu biblioteca técnica de patrones, versiones y trazabilidad.
                                    </Text>
                                    <Text style={styles.hubSecondaryCardDesc}>
                                        Historial centralizado y linaje técnico de todas las ejecuciones (Creaciones, Directos y Libres) con trazabilidad inmutable.
                                    </Text>
                                    <View style={styles.hubSecondaryCardFooter}>
                                        <Text style={styles.hubStepSummaryText}>Creaciones · Directos · Libres</Text>
                                        <View style={styles.hubCardSecondaryActionBtn}>
                                            <Text style={styles.hubCardSecondaryActionBtnText}>Abrir Banco →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* 05 · PATRÓN LIBRE */}
                            <TouchableOpacity
                                style={styles.hubSecondaryCard}
                                onPress={() => {
                                    setSelectedClient(null);
                                    setSelectedCreation(null);
                                    setSelectedSession(null);
                                    setClientCreations([]);
                                    setSessions([]);
                                    setCurrentExecution(null);
                                    setGeometryResult(null);
                                    setValidationResult(null);
                                    setPatternStatus('draft');
                                    setExecutionHistory([]);
                                    setAdjustmentsHistory([]);
                                    setStagedAdjustments([]);
                                    setActiveWorkflow('free_pattern');
                                    setActiveStudioTab('garment');
                                }}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubSecondaryCardImageWrapper}>
                                    <Image
                                        source={PATTERN_FREE_IMAGE}
                                        style={styles.hubSecondaryCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>05 · EXPERIMENTACIÓN LIBRE</Text>
                                    </View>
                                </View>

                                <View style={styles.hubSecondaryCardBody}>
                                    <Text style={styles.hubSecondaryCardEyebrow}>05 · 🧪 PATRÓN LIBRE</Text>
                                    <Text style={styles.hubSecondaryCardTitle}>Patrón Libre</Text>
                                    <Text style={styles.hubSecondaryCardSub}>
                                        Crea patrones sin cliente ni Creación.
                                    </Text>
                                    <Text style={styles.hubSecondaryCardDesc}>
                                        Genera moldes base, realiza pruebas técnicas y experimenta con tallas de referencia sin vincular datos de clientas.
                                    </Text>
                                    <View style={styles.hubSecondaryCardFooter}>
                                        <Text style={styles.hubStepSummaryText}>Tallas Referencia → CAD → Banco</Text>
                                        <View style={styles.hubCardSecondaryActionBtn}>
                                            <Text style={styles.hubCardSecondaryActionBtnText}>Iniciar Patrón Libre →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ============================================================================== */}
                        {/* 3. ARCHIVO TÉCNICO DEL ATELIER (BIBLIOTECA & ARCHIVO CENTRAL)                  */}
                        {/* ============================================================================== */}
                        <View style={styles.hubSupportSection}>
                            <View style={styles.hubSupportHeader}>
                                <View style={styles.hubSupportEyebrowRow}>
                                    <Text style={styles.hubSupportStar}>✦</Text>
                                    <Text style={styles.hubSupportLabel}>ARCHIVO TÉCNICO DEL ATELIER</Text>
                                </View>
                                <Text style={styles.hubSupportMainTitle}>Biblioteca & Documentación Técnica</Text>
                                <Text style={styles.hubSupportSub}>
                                    Repositorio centralizado de expedientes corporales y linaje inmutable de patrones certificados de la Casa de Alta Costura.
                                </Text>
                            </View>

                            <View style={archiveCatalogGridStyle}>
                                <TouchableOpacity
                                    style={styles.hubSupportBtn}
                                    onPress={() => router.push('/(designer)/clients')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.hubSupportIconBox}>
                                        <Text style={styles.hubSupportIcon}>👥</Text>
                                    </View>
                                    <View style={styles.hubSupportTextBox}>
                                        <View style={styles.hubArchivePill}>
                                            <Text style={styles.hubArchivePillText}>EXPEDIENTES CORPORALES</Text>
                                        </View>
                                        <Text style={styles.hubSupportBtnTitle}>Directorio de Clientas</Text>
                                        <Text style={styles.hubSupportBtnSub}>Fichas anatómicas, sesiones de medición e historial de pedidos</Text>
                                    </View>
                                    <Text style={styles.hubSupportBtnArrow}>→</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.hubSupportBtn}
                                    onPress={() => router.push('/(designer)/pattern-bank')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.hubSupportIconBox}>
                                        <Text style={styles.hubSupportIcon}>📚</Text>
                                    </View>
                                    <View style={styles.hubSupportTextBox}>
                                        <View style={styles.hubArchivePill}>
                                            <Text style={styles.hubArchivePillText}>BIBLIOTECA CAD</Text>
                                        </View>
                                        <Text style={styles.hubSupportBtnTitle}>Banco Global de Patrones</Text>
                                        <Text style={styles.hubSupportBtnSub}>Linaje CAD, trazabilidad técnica y patrones aprobados para corte</Text>
                                    </View>
                                    <Text style={styles.hubSupportBtnArrow}>→</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* ============================================================================== */}
                {/* 2. FLUJO A: GESTIÓN DE MEDIDAS (SECCIÓN 4 Y 5) */}
                {/* ============================================================================== */}
                {activeWorkflow === 'measurements' && (
                    <View style={styles.measurementsWorkflowContainer}>
                        {/* 1. ÁREA SUPERIOR: CLIENTA/SESIONES (IZQ) Y MANIQUÍ ANATÓMICO (DER) */}
                        <View style={styles.measurementsTopLayout}>
                            {/* COLUMNA IZQUIERDA: CLIENTA Y SESIONES */}
                            <View style={styles.measurementsLeftCol}>
                            {/* SECCIÓN A: Selector de Clientas */}
                            <AtelierClientSelector
                                clients={clients}
                                selectedClient={selectedClient}
                                onSelectClient={(c) => setSelectedClient(c)}
                                loading={loadingClients}
                                showSelectedSummary={false}
                            />

                            {/* SECCIÓN B: Resumen de la Clienta Seleccionada (UNA SOLA VEZ) */}
                            {selectedClient && (
                                <View style={styles.clientSingleSummaryCard}>
                                    <View style={styles.clientSingleSummaryHeader}>
                                        <View style={styles.clientSummaryAvatar}>
                                            <Text style={styles.clientSummaryAvatarText}>
                                                {selectedClient.full_name.slice(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.clientSingleSummaryEyebrow}>ANATOMÍA DE LA SESIÓN</Text>
                                            <Text style={styles.clientSingleSummaryName}>{selectedClient.full_name.toUpperCase()}</Text>
                                            <View style={styles.clientSingleStatusBadge}>
                                                <Text style={styles.clientSingleStatusText}>
                                                    {selectedClient.status ? selectedClient.status.toUpperCase() : 'ACTIVA'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {(() => {
                                        const latestSessionStats = analyzeSessionMeasurements(sessions[0]?.values);
                                        return (
                                            <View style={styles.clientSingleDataGrid}>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Sesiones de medidas:</Text>
                                                    <Text style={styles.clientSingleDataValue}>{sessions.length}</Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Última sesión:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {sessions[0]?.session_date ? formatDate(sessions[0].session_date) : 'Sin registro'}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Medidas corporales registradas:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {latestSessionStats.bodyCount} de {latestSessionStats.totalApplicableBody}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Medidas de diseño registradas:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {latestSessionStats.designCount}
                                                    </Text>
                                                </View>
                                                <View style={styles.clientSingleDataRow}>
                                                    <Text style={styles.clientSingleDataLabel}>Completitud de la sesión:</Text>
                                                    <Text style={styles.clientSingleDataValue}>
                                                        {latestSessionStats.bodyCompletionPct}%
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    <View style={styles.clientSingleActionsRow}>
                                        <TouchableOpacity
                                            style={styles.clientSingleActionBtn}
                                            onPress={() => {
                                                if (sessions[0]) setSelectedSession(sessions[0]);
                                                setIsMeasuresTableCollapsed(false);
                                                setIsMannequinCollapsed(false);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.clientSingleActionBtnText}>👁️ Ver medidas</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.clientSingleActionBtnExport}
                                            onPress={() => {
                                                if (sessions[0]) setSelectedSession(sessions[0]);
                                                setIsMeasuresTableCollapsed(false);
                                                setIsExportMenuOpen(true);
                                            }}
                                            activeOpacity={0.8}
                                            accessibilityRole="button"
                                            accessibilityLabel="Exportar expediente de medidas"
                                        >
                                            <Text style={styles.clientSingleActionBtnExportText}>✦ Exportar</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.clientSingleActionBtn, styles.clientSingleActionBtnPrimary]}
                                            onPress={() => {
                                                setModalPreviousSession(null);
                                                setIsMeasurementModalOpen(true);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.clientSingleActionBtnText, styles.clientSingleActionBtnPrimaryText]}>
                                                + Nueva sesión
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* SECCIÓN C: Historial de Sesiones (TARJETAS COMPACTAS) */}
                            {selectedClient && (
                                <View style={styles.sessionsHistorySection}>
                                    <View style={styles.sessionsHistoryHeaderRow}>
                                        <Text style={styles.sessionsHistoryTitle}>
                                            SESIONES DE MEDIDAS · {sessions.length}
                                        </Text>
                                    </View>

                                    {sessions.length === 0 ? (
                                        <View style={styles.emptySessionsCard}>
                                            <Text style={styles.emptySessionsText}>
                                                Esta clienta aún no tiene sesiones anatómicas registradas.
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.createFirstSessionBtn}
                                                onPress={() => {
                                                    setModalPreviousSession(null);
                                                    setIsMeasurementModalOpen(true);
                                                }}
                                            >
                                                <Text style={styles.createFirstSessionBtnText}>+ Tomar Primera Sesión</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        sessions.map((s) => {
                                            const isSelected = selectedSession?.id === s.id;
                                            const derivedCount = executionHistory.filter((e) => e.session_id === s.id).length;
                                            const sStats = analyzeSessionMeasurements(s.values);

                                            return (
                                                <View
                                                    key={s.id}
                                                    style={[
                                                        styles.workflowSessionCardCompact,
                                                        isSelected && styles.sessionCardActive,
                                                    ]}
                                                >
                                                    <View style={styles.sessionCardTop}>
                                                        <Text style={styles.sessionCompactTitle}>
                                                            Sesión v{s.version_number} · {formatDate(s.session_date)}
                                                        </Text>
                                                        <View
                                                            style={[
                                                                styles.sessionStatusPill,
                                                                s.status === 'completed'
                                                                    ? styles.sessionStatusCompleted
                                                                    : s.status === 'verified'
                                                                    ? styles.sessionStatusCompleted
                                                                    : styles.sessionStatusDraft,
                                                            ]}
                                                        >
                                                            <Text style={styles.sessionStatusPillText}>
                                                                {s.status === 'completed'
                                                                    ? 'FINALIZADA'
                                                                    : s.status === 'verified'
                                                                    ? 'VERIFICADA'
                                                                    : s.status === 'archived'
                                                                    ? 'ARCHIVADA'
                                                                    : 'BORRADOR'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text style={styles.sessionCompactSubtitle}>
                                                        {sStats.totalRegistered} medidas registradas ({sStats.bodyCount}/{sStats.totalApplicableBody} corporales · {sStats.bodyCompletionPct}% completitud)
                                                    </Text>

                                                    <View style={styles.sessionCompactActionsRow}>
                                                        <TouchableOpacity
                                                            style={[styles.sessionActionBtnCompact, isSelected && styles.sessionActionBtnActive]}
                                                            onPress={() => {
                                                                setSelectedSession(s);
                                                                setIsMeasuresTableCollapsed(false);
                                                            }}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={[styles.sessionActionBtnText, isSelected && styles.sessionActionBtnTextActive]}>
                                                                Ver medidas
                                                            </Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.sessionActionBtnCompact}
                                                            onPress={() => {
                                                                setModalPreviousSession(s);
                                                                setIsMeasurementModalOpen(true);
                                                            }}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.sessionActionBtnText}>
                                                                Rectificar
                                                            </Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.sessionActionBtnCompact}
                                                            onPress={() => setViewingDerivedSessionId(s.id)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.sessionActionBtnText}>
                                                                Ver patrones derivados ({derivedCount})
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            )}
                        </View>

                        {/* COLUMNA DERECHA: MANIQUÍ ANATÓMICO MAESTRO */}
                        <View style={styles.measurementsRightCol}>
                            {/* 2. MANIQUÍ ANATÓMICO MAESTRO DE ALTA COSTURA */}
                            <AtelierGrandAnatomicalMannequin
                                clientName={selectedClient?.full_name}
                                measurementsMm={activeMeasurementsMm}
                                session={selectedSession}
                                associatedCreationName={
                                    selectedSession?.creation_id
                                        ? clientCreations.find((c) => c.id === selectedSession.creation_id)?.name
                                        : undefined
                                }
                                isCollapsed={isMannequinCollapsed}
                                onToggleCollapse={() => setIsMannequinCollapsed(!isMannequinCollapsed)}
                                onRectify={() => {
                                    if (selectedSession) {
                                        setModalPreviousSession(selectedSession);
                                        setIsMeasurementModalOpen(true);
                                    }
                                }}
                                onNewSession={() => {
                                    setModalPreviousSession(null);
                                    setIsMeasurementModalOpen(true);
                                }}
                                selectedMeasureCode={selectedMeasureCode}
                                onSelectMeasureCode={setSelectedMeasureCode}
                                viewMode={mannequinViewMode}
                                onViewModeChange={setMannequinViewMode}
                                perspective={mannequinPerspective}
                                onPerspectiveChange={setMannequinPerspective}
                                onOpenExport={() => setIsExportMenuOpen((prev) => !prev)}
                            />
                        </View>
                    </View>

                    {/* 2. ÁREA INFERIOR: SECCIÓN CENTRADA Y DE ANCHO COMPLETO DE MEDIDAS DE LA SESIÓN (RESPONSIVE) */}
                    <View style={styles.measurementsFullWidthSection}>
                        {(() => {
                            const activeSessionStats = analyzeSessionMeasurements(activeMeasurementsMm);
                            return (
                                <View style={styles.detailedMeasuresTableCard}>
                                    {/* 4.A Encabezado compacto */}
                                    <View style={styles.detailedMeasuresHeaderRow}>
                                        <View style={{ flex: 1, minWidth: 260 }}>
                                            <Text style={styles.detailedMeasuresTitle}>
                                                MEDIDAS DE LA SESIÓN
                                            </Text>
                                            <Text style={styles.detailedMeasuresSub}>
                                                {selectedClient ? selectedClient.full_name : 'Clienta'} · Sesión v{selectedSession?.version_number || 1} · {selectedSession?.session_date ? formatDate(selectedSession.session_date) : 'Sin fecha'}
                                            </Text>
                                            <Text style={styles.detailedMeasuresCount}>
                                                {activeSessionStats.totalRegistered} medidas registradas en total
                                            </Text>
                                        </View>

                                        <View style={styles.detailedMeasuresControlsRow}>
                                            {/* MENÚ DESPLEGABLE DE EXPORTACIÓN EDITORIAL */}
                                            <View style={{ position: 'relative', zIndex: 1002 }}>
                                                <TouchableOpacity
                                                    style={[styles.detailedMeasuresBtn, styles.exportMenuBtn]}
                                                    onPress={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                                    activeOpacity={0.8}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Exportar medidas, maniquíes y cobertura"
                                                >
                                                    <Text style={styles.exportMenuBtnText}>✦ Exportar ⌄</Text>
                                                </TouchableOpacity>

                                                {isExportMenuOpen && (
                                                    <>
                                                        <TouchableOpacity
                                                            style={styles.exportMenuBackdrop}
                                                            onPress={() => setIsExportMenuOpen(false)}
                                                            activeOpacity={1}
                                                            accessibilityLabel="Cerrar menú de exportación"
                                                        />
                                                        <View style={styles.exportDropdownMenu}>
                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                printAnatomicalDossier({
                                                                    clientName: selectedClient?.full_name,
                                                                    session: selectedSession,
                                                                    measurementsMm: activeMeasurementsMm,
                                                                    viewMode: mannequinViewMode,
                                                                    perspective: mannequinPerspective,
                                                                    demographic: 'woman',
                                                                });
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>📄</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Ficha Anatómica (PDF)</Text>
                                                                <Text style={styles.exportItemSub}>Dossier A4 completo con cotas y tablas</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                const svg = generateStandaloneMannequinSvg({
                                                                    clientName: selectedClient?.full_name,
                                                                    session: selectedSession,
                                                                    measurementsMm: activeMeasurementsMm,
                                                                    viewMode: mannequinViewMode,
                                                                    perspective: mannequinPerspective,
                                                                    demographic: 'woman',
                                                                });
                                                                const filename = `Maniqui_${selectedClient?.full_name || 'Clienta'}_v${selectedSession?.version_number || 1}_${mannequinViewMode}_${mannequinPerspective}.svg`.replace(/\s+/g, '_');
                                                                downloadFileInBrowser(svg, filename, 'image/svg+xml');
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>📐</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Maniquí Anotado (SVG)</Text>
                                                                <Text style={styles.exportItemSub}>Gráfico vectorial 1:1 de la vista activa</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                const csv = generateMeasurementsCsv({
                                                                    clientName: selectedClient?.full_name,
                                                                    session: selectedSession,
                                                                    measurementsMm: activeMeasurementsMm,
                                                                    viewMode: mannequinViewMode,
                                                                    perspective: mannequinPerspective,
                                                                });
                                                                const filename = `Medidas_${selectedClient?.full_name || 'Clienta'}_v${selectedSession?.version_number || 1}.csv`.replace(/\s+/g, '_');
                                                                downloadFileInBrowser(csv, filename, 'text/csv');
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>📊</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Listado de Medidas (CSV)</Text>
                                                                <Text style={styles.exportItemSub}>Valores y estado sin ceros ficticios</Text>
                                                            </View>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.exportDropdownItem}
                                                            onPress={() => {
                                                                setIsExportMenuOpen(false);
                                                                const csv = exportCoverageMatrixCsv();
                                                                downloadFileInBrowser(csv, 'Matriz_Cobertura_Catalogo_Antropometrico.csv', 'text/csv');
                                                            }}
                                                        >
                                                            <Text style={styles.exportItemIcon}>🗺️</Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.exportItemTitle}>Matriz de Cobertura (CSV)</Text>
                                                                <Text style={styles.exportItemSub}>Diagnóstico exhaustivo de todas las medidas</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    </View>
                                                </>
                                            )}
                                            </View>

                                            <TouchableOpacity
                                                style={styles.detailedMeasuresBtn}
                                                onPress={() => setShowMmEquivalencies(!showMmEquivalencies)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.detailedMeasuresBtnText}>
                                                    {showMmEquivalencies ? 'Ocultar equivalencias en mm' : 'Mostrar equivalencias en mm'}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.detailedMeasuresBtn}
                                                onPress={() => setIsMeasuresTableCollapsed(!isMeasuresTableCollapsed)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.detailedMeasuresBtnText}>
                                                    {isMeasuresTableCollapsed ? 'Mostrar medidas' : 'Ocultar medidas'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* 4.A.2 Métricas de clasificación del catálogo (6 Indicadores Diferenciados) */}
                                    <View style={styles.catalogMetricsStrip}>
                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Medidas corporales registradas</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.bodyCount} de {activeSessionStats.totalApplicableBody}
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Medidas de diseño registradas</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.designCount}
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Parámetros de taller</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.workshopCount > 0 ? `${activeSessionStats.workshopCount} registrados` : `${WORKSHOP_PARAMETER_CODES.length} predeterminados`}
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Cotas representadas en el maniquí</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {TOTAL_MANNEQUIN_COTAS} cotas
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Completitud de la sesión</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {activeSessionStats.bodyCompletionPct}%
                                            </Text>
                                        </View>

                                        <View style={styles.catalogMetricDivider} />

                                        <View style={styles.catalogMetricCell}>
                                            <Text style={styles.catalogMetricLabel}>Medidas requeridas para esta plantilla</Text>
                                            <Text style={styles.catalogMetricValue}>
                                                {selectedTemplate
                                                    ? `${templateRequirementsCheck.present.length}/${selectedTemplate.required_measurements.length} cubiertas`
                                                    : 'Sin plantilla asignada'}
                                            </Text>
                                        </View>
                                    </View>

                            {!isMeasuresTableCollapsed && (
                                <>
                                    {/* 4.B Resumen visual de medidas principales (Hero Metrics) */}
                                    <View style={styles.measuresHeroContainer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <IconBodyRuler size={13} color="#996B1F" />
                                            <Text style={styles.measuresHeroEyebrow}>MEDIDAS PRINCIPALES DEL CUERPO (CLIC PARA ABRIR GUÍA)</Text>
                                        </View>
                                        <View style={styles.measuresHeroRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.measuresHeroCard,
                                                    selectedMeasureCode === 'contorno_busto' && styles.measuresHeroCardSelected,
                                                ]}
                                                onPress={() => handleOpenMeasureGuide('contorno_busto')}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ver guía de Contorno de Busto"
                                            >
                                                <Text style={styles.measuresHeroLabel}>BUSTO</Text>
                                                <Text style={styles.measuresHeroVal}>
                                                    {activeMeasurementsMm.contorno_busto ? `${roundTo(activeMeasurementsMm.contorno_busto / 10, 1)} cm` : '—'}
                                                </Text>
                                                {showMmEquivalencies && activeMeasurementsMm.contorno_busto ? (
                                                    <Text style={styles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_busto)} mm</Text>
                                                ) : null}
                                                <View style={styles.measuresHeroActionRow}>
                                                    <IconInfoGuide size={11} color="#A78350" />
                                                    <Text style={styles.measuresHeroActionText}>Ver guía ↗</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.measuresHeroCard,
                                                    selectedMeasureCode === 'contorno_cintura' && styles.measuresHeroCardSelected,
                                                ]}
                                                onPress={() => handleOpenMeasureGuide('contorno_cintura')}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ver guía de Contorno de Cintura"
                                            >
                                                <Text style={styles.measuresHeroLabel}>CINTURA</Text>
                                                <Text style={styles.measuresHeroVal}>
                                                    {activeMeasurementsMm.contorno_cintura ? `${roundTo(activeMeasurementsMm.contorno_cintura / 10, 1)} cm` : '—'}
                                                </Text>
                                                {showMmEquivalencies && activeMeasurementsMm.contorno_cintura ? (
                                                    <Text style={styles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_cintura)} mm</Text>
                                                ) : null}
                                                <View style={styles.measuresHeroActionRow}>
                                                    <IconInfoGuide size={11} color="#A78350" />
                                                    <Text style={styles.measuresHeroActionText}>Ver guía ↗</Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.measuresHeroCard,
                                                    selectedMeasureCode === 'contorno_cadera' && styles.measuresHeroCardSelected,
                                                ]}
                                                onPress={() => handleOpenMeasureGuide('contorno_cadera')}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Ver guía de Contorno de Cadera"
                                            >
                                                <Text style={styles.measuresHeroLabel}>CADERA</Text>
                                                <Text style={styles.measuresHeroVal}>
                                                    {activeMeasurementsMm.contorno_cadera ? `${roundTo(activeMeasurementsMm.contorno_cadera / 10, 1)} cm` : '—'}
                                                </Text>
                                                {showMmEquivalencies && activeMeasurementsMm.contorno_cadera ? (
                                                    <Text style={styles.measuresHeroSubVal}>{Math.round(activeMeasurementsMm.contorno_cadera)} mm</Text>
                                                ) : null}
                                                <View style={styles.measuresHeroActionRow}>
                                                    <IconInfoGuide size={11} color="#A78350" />
                                                    <Text style={styles.measuresHeroActionText}>Ver guía ↗</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Medidas secundarias de referencia anatómica */}
                                        <View style={styles.measuresSecondaryGrid}>
                                            {[
                                                { label: 'Alto de busto', code: 'contorno_alto_busto' },
                                                { label: 'Bajo busto', code: 'contorno_bajo_busto' },
                                                { label: 'Ancho de hombros', code: 'ancho_hombros' },
                                                { label: 'Ancho de espalda', code: 'ancho_espalda' },
                                                { label: 'Largo talle delantero', code: 'largo_talle_delantero' },
                                                { label: 'Largo talle espalda', code: 'largo_talle_espalda' },
                                            ].map((item) => {
                                                const val = activeMeasurementsMm[item.code];
                                                const hasVal = typeof val === 'number' && Number.isFinite(val) && val > 0;
                                                const isSelected = selectedMeasureCode === item.code;
                                                return (
                                                    <TouchableOpacity
                                                        key={item.code}
                                                        style={[
                                                            styles.measuresSecondaryItem,
                                                            isSelected && styles.measuresSecondaryItemSelected,
                                                        ]}
                                                        onPress={() => {
                                                            const cov = getMeasurementCoverageDetail(item.code, mannequinViewMode, mannequinPerspective);
                                                            if (cov.status === 'other_view' && cov.switchAction) {
                                                                if (cov.switchAction.targetView) setMannequinViewMode(cov.switchAction.targetView);
                                                                if (cov.switchAction.targetPerspective) setMannequinPerspective(cov.switchAction.targetPerspective);
                                                                setSelectedMeasureCode(item.code);
                                                            } else {
                                                                handleOpenMeasureGuide(item.code);
                                                            }
                                                        }}
                                                        activeOpacity={0.8}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Ver guía de ${item.label}`}
                                                    >
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text style={styles.measuresSecondaryLabel}>{item.label}</Text>
                                                            <Text style={{ fontSize: 9, color: '#A78350' }}>↗</Text>
                                                        </View>
                                                        {(() => {
                                                            const cov = getMeasurementCoverageDetail(item.code, mannequinViewMode, mannequinPerspective);
                                                            return (
                                                                <View style={[styles.coveragePill, { backgroundColor: cov.badgeBg, borderColor: cov.badgeColor + '55', marginTop: 3, marginBottom: 3 }]}>
                                                                    <Text style={[styles.coveragePillText, { color: cov.badgeColor }]}>{cov.badgeLabel}</Text>
                                                                </View>
                                                            );
                                                        })()}
                                                        <Text style={[styles.measuresSecondaryVal, !hasVal && styles.measuresSecondaryValMissing]}>
                                                            {hasVal ? `${roundTo(val / 10, 1)} cm${showMmEquivalencies ? ` (${Math.round(val)} mm)` : ''}` : 'No registrada'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* 4.C Secciones Desplegables con Jerarquía Editorial y Separación por Grupos */}
                                    <View style={styles.measureAccordionsContainer}>
                                        {MEASURE_CATEGORIES_DEFINITION.map((cat, idx) => {
                                            const prevCat = idx > 0 ? MEASURE_CATEGORIES_DEFINITION[idx - 1] : null;
                                            const isNewSection = !prevCat || prevCat.groupSection !== cat.groupSection;
                                            const isExpanded = expandedMeasureCategories[cat.id] ?? false;
                                            const isWorkshop = cat.groupSection === 'Parámetros de taller';
                                            const registeredCount = cat.codes.filter(c => {
                                                const val = activeMeasurementsMm[c];
                                                return (typeof val === 'number' && Number.isFinite(val) && val > 0) || (isWorkshop && WORKSHOP_PARAMETER_DEFINITIONS[c] !== undefined);
                                            }).length;

                                            return (
                                                <View key={cat.id}>
                                                    {isNewSection && (
                                                        <View style={styles.measureCategorySectionBanner}>
                                                            <Text style={styles.measureCategorySectionBadge}>
                                                                {cat.groupSection.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.measureAccordionCard}>
                                                        <TouchableOpacity
                                                            style={styles.measureAccordionHeader}
                                                            onPress={() => toggleMeasureCategory(cat.id)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                {getCategoryCoutureIcon(cat.id, { size: 16, color: colors.champagneGold })}
                                                                <Text style={styles.measureAccordionTitle}>{cat.title}</Text>
                                                                <View style={styles.measureAccordionCountBadge}>
                                                                    <Text style={styles.measureAccordionCountText}>
                                                                        {registeredCount} / {cat.codes.length}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.measureAccordionChevron}>
                                                                {isExpanded ? '⌃' : '⌄'}
                                                            </Text>
                                                        </TouchableOpacity>

                                                        {isExpanded && (
                                                            <View style={styles.measureAccordionBody}>
                                                                {cat.codes.map((code) => {
                                                                    const workshopDef = WORKSHOP_PARAMETER_DEFINITIONS[code];
                                                                    const def = MEASUREMENT_MAP[code] || workshopDef;
                                                                    const rawVal = activeMeasurementsMm[code];
                                                                    const valMm = rawVal ?? (workshopDef ? workshopDef.defaultValMm : undefined);
                                                                    const hasVal = typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0;
                                                                    const isSmallMm = code.includes('holgura') || code.includes('margen') || code.includes('inclinacion');
                                                                    const cmVal = roundTo((valMm || 0) / 10, 1);
                                                                    const name = def?.name || code;

                                                                    const isSelected = selectedMeasureCode === code;
                                                                    return (
                                                                        <TouchableOpacity
                                                                            key={code}
                                                                            style={[
                                                                                styles.measureCardCell,
                                                                                !hasVal && styles.measureCardCellEmpty,
                                                                                isSelected && styles.measureCardCellSelected,
                                                                            ]}
                                                                            onPress={() => {
                                                                                const cov = getMeasurementCoverageDetail(code, mannequinViewMode, mannequinPerspective);
                                                                                if (cov.status === 'other_view' && cov.switchAction) {
                                                                                    if (cov.switchAction.targetView) setMannequinViewMode(cov.switchAction.targetView);
                                                                                    if (cov.switchAction.targetPerspective) setMannequinPerspective(cov.switchAction.targetPerspective);
                                                                                    setSelectedMeasureCode(code);
                                                                                } else {
                                                                                    handleOpenMeasureGuide(code);
                                                                                }
                                                                            }}
                                                                            activeOpacity={0.8}
                                                                            accessibilityRole="button"
                                                                            accessibilityLabel={`Ver guía de ${name}`}
                                                                        >
                                                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                                                <Text style={styles.measureCardName}>{name}</Text>
                                                                                <Text style={styles.measureCardCode}>
                                                                                    {code}{workshopDef && rawVal === undefined ? ' · taller base' : ''}
                                                                                </Text>
                                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                                                    <View style={styles.measureCardCellAction}>
                                                                                        <IconInfoGuide size={10} color="#A78350" />
                                                                                        <Text style={styles.measureCardActionText}>Ver guía ↗</Text>
                                                                                    </View>
                                                                                    {(() => {
                                                                                        const cov = getMeasurementCoverageDetail(code, mannequinViewMode, mannequinPerspective);
                                                                                        return (
                                                                                            <View style={[styles.coveragePill, { backgroundColor: cov.badgeBg, borderColor: cov.badgeColor + '55' }]}>
                                                                                                <Text style={[styles.coveragePillText, { color: cov.badgeColor }]}>{cov.badgeLabel}</Text>
                                                                                            </View>
                                                                                        );
                                                                                    })()}
                                                                                </View>
                                                                            </View>
                                                                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                                                {hasVal ? (
                                                                                    <>
                                                                                        <Text style={styles.measureCardValCm}>
                                                                                            {isSmallMm ? `${Math.round(valMm)} mm` : `${cmVal} cm`}
                                                                                        </Text>
                                                                                        {showMmEquivalencies && (
                                                                                            <Text style={styles.measureCardValMm}>
                                                                                                {isSmallMm ? `(${cmVal} cm)` : `(${Math.round(valMm)} mm)`}
                                                                                            </Text>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <Text style={styles.measureCardValMissing}>No registrada</Text>
                                                                                )}
                                                                            </View>
                                                                        </TouchableOpacity>
                                                                    );
                                                                })}
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </>
                            )}
                        </View>
                    );
                })()}
            </View>
        </View>
    )}

    {/* MODAL COMPARTIDO DE GUÍA VISUAL Y FOTOGRÁFICA DE MEDIDAS (COMPARTIDO CON MANIQUÍ) */}
    <AtelierMeasurementGuideModal
        visible={Boolean(activeGuideModalCode)}
        measureCode={activeGuideModalCode}
        sessionValueMm={activeGuideModalCode ? activeMeasurementsMm[activeGuideModalCode] : null}
        showMmEquivalencies={showMmEquivalencies}
        onClose={handleCloseMeasureGuide}
        onHighlightInMannequin={handleHighlightInMannequin}
    />

                {/* ============================================================================== */}
                {/* 3. FLUJO B, C Y D: ESTUDIO CAD Y MESA DE CORTE */}
                {/* ============================================================================== */}
                {activeWorkflow !== 'hub' && activeWorkflow !== 'measurements' && (
                    <View
                        style={[
                            styles.studioWorkflowLayout,
                            activeWorkflow === 'free_pattern'
                                ? (isFreeWorkflowTwoCol ? styles.studioWorkflowLayoutFreeRow : styles.studioWorkflowLayoutFreeCol)
                                : (isTabletPortrait && { flexDirection: 'column' }),
                        ]}
                    >
                    {/* PANEL IZQUIERDO: CLIENTA Y ANATOMÍA (Lo mejor de la Opción A) */}
                    {/* EN TABLETA VERTICAL: BOTÓN RÁPIDO PARA ABRIR MANIQUÍ Y CLIENTAS */}
                {isTabletPortrait && activeWorkflow !== 'direct_pattern' && activeWorkflow !== 'creation_pattern' && activeWorkflow !== 'free_pattern' && (
                    <TouchableOpacity
                        style={styles.tabletClientTriggerBar}
                        onPress={() => setIsClientDrawerOpen(true)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.tabletClientTriggerLeft}>
                            <View style={styles.tabletAvatarCircle}>
                                <Text style={styles.tabletAvatarText}>
                                    {activeWorkflow === 'free_pattern'
                                        ? (selectedReferenceDemographic === 'woman' ? '👗' : selectedReferenceDemographic === 'man' ? '👔' : selectedReferenceDemographic === 'girl' ? '🎀' : selectedReferenceDemographic === 'boy' ? '🧢' : '✏️')
                                        : (selectedClient ? selectedClient.full_name.slice(0, 2).toUpperCase() : 'KC')}
                                </Text>
                            </View>
                            <View style={{ flex: 1, paddingHorizontal: 8 }}>
                                <Text style={styles.tabletClientNameText} numberOfLines={1}>
                                    {activeWorkflow === 'free_pattern'
                                        ? `PERFIL: ${freePatternShortSubtitle}`
                                        : (selectedClient ? selectedClient.full_name : 'Seleccionar Clienta')}
                                </Text>
                                <Text style={styles.tabletClientMeasureText} numberOfLines={1}>
                                    {activeWorkflow === 'free_pattern'
                                        ? `B: ${roundTo((freeMeasurements.contorno_busto || 0)/10, 1)}cm · C: ${roundTo((freeMeasurements.contorno_cintura || 0)/10, 1)}cm · Cad: ${roundTo((freeMeasurements.contorno_cadera || 0)/10, 1)}cm`
                                        : (selectedSession
                                            ? `v${selectedSession.version_number} · B: ${roundTo((activeMeasurementsMm.contorno_busto || 0)/10, 1)}cm · C: ${roundTo((activeMeasurementsMm.contorno_cintura || 0)/10, 1)}cm · Cad: ${roundTo((activeMeasurementsMm.contorno_cadera || 0)/10, 1)}cm`
                                            : 'Sin sesión de medidas activa')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.tabletMannequinBadge}>
                            <Text style={styles.tabletMannequinBadgeText}>
                                {activeWorkflow === 'free_pattern' ? '👗 Maniquí de Referencia ▾' : '👗 Maniquí & Clientas ▾'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* MODAL DRAWER LATERAL PARA TABLETA VERTICAL */}
                <Modal
                    visible={isTabletPortrait && isClientDrawerOpen && activeWorkflow !== 'free_pattern'}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsClientDrawerOpen(false)}
                >
                    <View style={styles.drawerOverlay}>
                        <View style={styles.drawerContentCard}>
                            <View style={styles.drawerHeaderRow}>
                                <Text style={styles.drawerHeaderTitle}>
                                    {activeWorkflow === 'free_pattern' ? 'PERFIL ANATÓMICO DE REFERENCIA' : 'DIRECTORIO & ANATOMÍA DE TALLER'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.drawerCloseBtn}
                                    onPress={() => setIsClientDrawerOpen(false)}
                                >
                                    <Text style={styles.drawerCloseText}>✕ Cerrar</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                                {activeWorkflow === 'free_pattern' ? (
                                    <AtelierGrandAnatomicalMannequin
                                        headerEyebrow="✦ PERFIL ANATÓMICO DE REFERENCIA"
                                        headerTitle={freePatternShortSubtitle}
                                        headerSubtitle="BANCO GLOBAL · BASE DE TALLER"
                                        referenceProfileLabel={freePatternShortSubtitle}
                                        badgeVersionText={selectedReferenceProfileCode === 'custom' ? 'LIBRE' : `TALLA ${currentReferenceProfile?.sizeLabel || 'BASE'}`}
                                        measurementsMm={freeMeasurements}
                                        session={null}
                                        clientName={undefined}
                                        demographic={selectedReferenceDemographic === 'custom' ? 'woman' : selectedReferenceDemographic}
                                        onDemographicChange={(d) => handleSelectReferenceDemographic(d)}
                                        onRectify={() => {
                                            setIsClientDrawerOpen(false);
                                            setIsCustomMeasurementsOpen(true);
                                        }}
                                        onNewSession={() => {
                                            setIsClientDrawerOpen(false);
                                            setIsCustomMeasurementsOpen(true);
                                        }}
                                        selectedMeasureCode={selectedMeasureCode}
                                        onSelectMeasureCode={setSelectedMeasureCode}
                                        viewMode={mannequinViewMode}
                                        onViewModeChange={setMannequinViewMode}
                                        perspective={mannequinPerspective}
                                        onPerspectiveChange={setMannequinPerspective}
                                        onOpenExport={() => setIsExportMenuOpen((prev) => !prev)}
                                    />
                                ) : (
                                    <>
                                        <AtelierClientSelector
                                            clients={clients}
                                            selectedClient={selectedClient}
                                            onSelectClient={(c) => {
                                                setSelectedClient(c);
                                                setIsClientDrawerOpen(false);
                                            }}
                                            loading={loadingClients}
                                        />
                                        <AtelierMannequinDisplay
                                            clientName={selectedClient?.full_name}
                                            measurementsMm={activeMeasurementsMm}
                                            session={selectedSession}
                                            garmentType={garmentType}
                                            selectedTemplateName={selectedTemplate?.name}
                                            onSelectGarmentType={(gt) => setGarmentType(gt)}
                                            onNewSession={() => {
                                                setModalPreviousSession(null);
                                                setIsMeasurementModalOpen(true);
                                            }}
                                            onCorrectSession={() => {
                                                if (selectedSession) {
                                                    setModalPreviousSession(selectedSession);
                                                    setIsMeasurementModalOpen(true);
                                                }
                                            }}
                                        />
                                    </>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* EN TABLETA HORIZONTAL Y ESCRITORIO: PANEL LATERAL FIJO O SUPERIOR EN VERTICAL */}
                {((!isTabletPortrait && activeWorkflow !== 'direct_pattern' && activeWorkflow !== 'creation_pattern') || (activeWorkflow === 'free_pattern')) && (
                    <View
                        style={[
                            styles.leftStudioColumn,
                            activeWorkflow === 'free_pattern' && (
                                isFreeMannequinCollapsed
                                    ? styles.leftStudioColumnFreeCollapsed
                                    : (isFreeWorkflowTwoCol ? styles.leftStudioColumnFree : styles.leftStudioColumnFreeStacked)
                            ),
                        ]}
                    >
                        {activeWorkflow === 'free_pattern' ? (
                            <AtelierGrandAnatomicalMannequin
                                headerEyebrow="✦ PERFIL ANATÓMICO DE REFERENCIA"
                                headerTitle={freePatternShortSubtitle}
                                headerSubtitle="BANCO GLOBAL · BASE DE TALLER"
                                referenceProfileLabel={freePatternShortSubtitle}
                                badgeVersionText={selectedReferenceProfileCode === 'custom' ? 'LIBRE' : `TALLA ${currentReferenceProfile?.sizeLabel || 'BASE'}`}
                                measurementsMm={freeMeasurements}
                                session={null}
                                clientName={undefined}
                                demographic={selectedReferenceDemographic === 'custom' ? 'woman' : selectedReferenceDemographic}
                                onDemographicChange={(d) => handleSelectReferenceDemographic(d)}
                                onRectify={() => setIsCustomMeasurementsOpen(true)}
                                onNewSession={() => setIsCustomMeasurementsOpen(true)}
                                selectedMeasureCode={selectedMeasureCode}
                                onSelectMeasureCode={setSelectedMeasureCode}
                                viewMode={mannequinViewMode}
                                onViewModeChange={setMannequinViewMode}
                                perspective={mannequinPerspective}
                                onPerspectiveChange={setMannequinPerspective}
                                onOpenExport={() => setIsExportMenuOpen((prev) => !prev)}
                                isCollapsed={isFreeMannequinCollapsed}
                                onToggleCollapse={() => setIsFreeMannequinCollapsed((prev) => !prev)}
                            />
                        ) : (
                            <>
                                {/* 1. Selector y Buscador de Clientas con Avatares Monograma y Soporte para Cientos de Registros */}
                                <AtelierClientSelector
                                    clients={clients}
                                    selectedClient={selectedClient}
                                    onSelectClient={(c) => setSelectedClient(c)}
                                    loading={loadingClients}
                                />

                                {/* 2. Maniquí Anatómico de Alta Costura sobre Fondo Oscuro de Lujo con Cotas Métricas */}
                                <AtelierMannequinDisplay
                                    clientName={selectedClient?.full_name}
                                    measurementsMm={activeMeasurementsMm}
                                    session={selectedSession}
                                    garmentType={garmentType}
                                    selectedTemplateName={selectedTemplate?.name}
                                    onSelectGarmentType={(gt) => setGarmentType(gt)}
                                    onNewSession={() => {
                                        setModalPreviousSession(null);
                                        setIsMeasurementModalOpen(true);
                                    }}
                                    onCorrectSession={() => {
                                        if (selectedSession) {
                                            setModalPreviousSession(selectedSession);
                                            setIsMeasurementModalOpen(true);
                                        }
                                    }}
                                />

                                {/* Selector de Otras Sesiones Históricas de la Misma Clienta */}
                                {sessions.length > 1 && (
                                    <View style={styles.sessionHistoryCard}>
                                        <Text style={styles.sessionHistoryCardTitle}>
                                            OTRAS SESIONES HISTÓRICAS ({sessions.length}):
                                        </Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                                        >
                                            {sessions.map((s) => {
                                                const isAct = selectedSession?.id === s.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={s.id}
                                                        style={[
                                                            styles.sessionHistoryChip,
                                                            isAct && styles.sessionHistoryChipActive,
                                                        ]}
                                                        onPress={() => setSelectedSession(s)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.sessionHistoryChipText,
                                                                isAct && styles.sessionHistoryChipTextActive,
                                                            ]}
                                                        >
                                                            v{s.version_number} · {s.session_date || 'Sin fecha'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* PANEL DERECHO: MESA DE CORTE Y ESTUDIO CAD (Opción B) */}
                <View style={[styles.rightStudioColumn, activeWorkflow === 'free_pattern' && styles.rightStudioColumnFree]}>
                    {/* BANNER IDENTIFICADOR PERSISTENTE FLUJO B */}
                    {activeWorkflow === 'direct_pattern' && (
                        <View style={styles.persistentWorkflowCard}>
                            <View style={styles.persistentWorkflowTopRow}>
                                <View style={[styles.persistentWorkflowPill, { backgroundColor: '#EDF5EE', borderColor: '#C2DFCA' }]}>
                                    <Text style={[styles.persistentWorkflowPillText, { color: '#2B5E35' }]}>
                                        ✂️ PATRONAJE DIRECTO
                                    </Text>
                                </View>
                                <Text style={styles.persistentWorkflowTagline}>
                                    PATRONAJE DIRECTO: Este patrón pertenece a la clienta, pero no está asociado a una Creación.
                                </Text>
                                <TouchableOpacity
                                    style={styles.directAnatomyToggleBtn}
                                    onPress={() => setIsDirectAnatomyCollapsed((prev) => !prev)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.directAnatomyToggleBtnText}>
                                        {isDirectAnatomyCollapsed
                                            ? '👁️ [CONSULTAR CLIENTA & ANATOMÍA COMPLETA ▾]'
                                            : '▲ [COLAPSAR ZONA DE CLIENTA & ANATOMÍA]'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.persistentWorkflowDetailsGrid}>
                                <View style={styles.persistentWorkflowDetailCol}>
                                    <Text style={styles.persistentWorkflowLabel}>CLIENTA</Text>
                                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                                        {selectedClient?.full_name || 'No seleccionada'}
                                    </Text>
                                </View>
                                <View style={styles.persistentWorkflowDetailCol}>
                                    <Text style={styles.persistentWorkflowLabel}>SESIÓN</Text>
                                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                                        {selectedSession ? `v${selectedSession.version_number} · ${formatSessionDate(selectedSession.session_date)}` : 'Sin sesión'}
                                    </Text>
                                </View>
                                <View style={styles.persistentWorkflowDetailCol}>
                                    <Text style={styles.persistentWorkflowLabel}>PRENDA</Text>
                                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                                        {GARMENT_PACKAGES[garmentType]?.name || garmentType}
                                    </Text>
                                </View>
                                <View style={styles.persistentWorkflowDetailCol}>
                                    <Text style={styles.persistentWorkflowLabel}>PLANTILLA</Text>
                                    <Text style={styles.persistentWorkflowVal} numberOfLines={1}>
                                        {selectedTemplate ? `${selectedTemplate.name} (v${selectedTemplate.version})` : 'Sin plantilla'}
                                    </Text>
                                </View>
                                <View style={styles.persistentWorkflowDetailCol}>
                                    <Text style={styles.persistentWorkflowLabel}>ESTADO GENERACIÓN</Text>
                                    <Text style={[
                                        styles.persistentWorkflowVal,
                                        { color: geometryResult ? '#2B5E35' : '#8A6A4A', fontWeight: '700' }
                                    ]} numberOfLines={1}>
                                        {geometryResult ? `✓ GENERADO (${geometryResult.pieces.length} piezas)` : 'PENDIENTE DE TRAZADO'}
                                    </Text>
                                </View>
                                <View style={styles.persistentWorkflowDetailCol}>
                                    <Text style={styles.persistentWorkflowLabel}>ESTADO VALIDACIÓN</Text>
                                    <Text style={[
                                        styles.persistentWorkflowVal,
                                        {
                                            color: templateMeasurementDiagnostic.hasUnresolved
                                                ? '#CF1322'
                                                : templateMeasurementDiagnostic.hasEstimated
                                                ? '#D48806'
                                                : '#2B5E35',
                                            fontWeight: '700',
                                        }
                                    ]} numberOfLines={1}>
                                        {templateMeasurementDiagnostic.hasUnresolved
                                            ? '⚠ MEDIDAS INCOMPLETAS'
                                            : templateMeasurementDiagnostic.hasEstimated
                                            ? 'ℹ INCLUYE ESTIMACIONES'
                                            : '✓ 100% REALES / C10'}
                                    </Text>
                                </View>
                            </View>

                            {/* Alerta si cambia la sesión después de haber generado un patrón */}
                            {lastGeneratedSessionId && selectedSession && lastGeneratedSessionId !== selectedSession.id && (
                                <View style={styles.sessionChangedAlertBox}>
                                    <Text style={styles.sessionChangedAlertText}>
                                        ⚠️ Ha seleccionado una sesión de medidas diferente a la utilizada para generar el patrón actual. El patrón existente y su snapshot permanecen inalterados. Para reflejar las medidas de la nueva sesión, genere una nueva versión en la Mesa CAD.
                                    </Text>
                                </View>
                            )}

                            {/* ZONA DE CLIENTA Y ANATOMÍA COMPLETA CANÓNICA */}
                            {!isDirectAnatomyCollapsed && (
                                <View style={styles.directAnatomyWorkspaceWrapper}>
                                    <AtelierClientAnatomyWorkspace
                                        clients={clients}
                                        selectedClient={selectedClient}
                                        onSelectClient={(c) => setSelectedClient(c)}
                                        loadingClients={loadingClients}
                                        sessions={sessions}
                                        selectedSession={selectedSession}
                                        onSelectSession={(s) => setSelectedSession(s)}
                                        activeMeasurementsMm={activeMeasurementsMm}
                                        executionHistory={executionHistory}
                                        clientCreations={clientCreations}
                                        isMannequinCollapsed={isMannequinCollapsed}
                                        onToggleMannequinCollapse={() => setIsMannequinCollapsed((prev) => !prev)}
                                        onRectifySession={(prevSession) => {
                                            setModalPreviousSession(prevSession);
                                            setIsMeasurementModalOpen(true);
                                        }}
                                        onNewSession={() => {
                                            setModalPreviousSession(null);
                                            setIsMeasurementModalOpen(true);
                                        }}
                                        selectedMeasureCode={selectedMeasureCode}
                                        onSelectMeasureCode={(code) => setSelectedMeasureCode(code)}
                                        mannequinViewMode={mannequinViewMode}
                                        onViewModeChange={(mode) => setMannequinViewMode(mode)}
                                        mannequinPerspective={mannequinPerspective}
                                        onPerspectiveChange={(persp) => setMannequinPerspective(persp)}
                                        selectedTemplate={selectedTemplate}
                                        templateRequirementsCheck={templateRequirementsCheck}
                                        showMmEquivalencies={showMmEquivalencies}
                                        onToggleShowMm={() => setShowMmEquivalencies((prev) => !prev)}
                                        isMeasuresTableCollapsed={isMeasuresTableCollapsed}
                                        onToggleCollapseMeasuresTable={() => setIsMeasuresTableCollapsed((prev) => !prev)}
                                        expandedMeasureCategories={expandedMeasureCategories}
                                        onToggleMeasureCategory={toggleMeasureCategory}
                                        onOpenMeasureGuide={handleOpenMeasureGuide}
                                        onViewDerivedPatterns={(sessionId) => setViewingDerivedSessionId(sessionId)}
                                        isExportMenuOpen={isExportMenuOpen}
                                        onToggleExportMenu={() => setIsExportMenuOpen((prev) => !prev)}
                                        onCloseExportMenu={() => setIsExportMenuOpen(false)}
                                        formatDateFn={formatDate}
                                    />
                                </View>
                            )}
                        </View>
                    )}

                    {/* FLUJO C · ENTRADA EXPLÍCITA: CLIENTA → CREACIÓN → ABRIR EXPEDIENTE */}
                    {activeWorkflow === 'creation_pattern' && creationGateActive && (
                        <CreationEntrySelector
                            clients={clients}
                            loadingClients={loadingClients}
                            selectedClient={selectedClient}
                            onSelectClient={(c) => {
                                if (selectedClient?.id !== c.id) {
                                    creationContextConfirmedRef.current = false;
                                    setSelectedClient(c);
                                }
                            }}
                            clientCreations={clientCreations}
                            loadingCreations={loadingCreations}
                            onOpenCreation={handleOpenCreation}
                            onOpenCreationsModule={() => {
                                router.push({
                                    pathname: '/(designer)/creations',
                                    params: { client_id: selectedClient?.id },
                                });
                            }}
                            onChangeClient={handleChangeCreationClient}
                        />
                    )}

                    {/* CABECERA CONTEXTUAL Y STEPPER ÚNICO DE 7 ETAPAS DEL FLUJO C */}
                    {activeWorkflow === 'creation_pattern' && !creationGateActive && (
                        <View style={{ marginBottom: 16 }}>
                            <CreationContextBar
                                client={selectedClient}
                                creation={selectedCreation}
                                garmentType={garmentType}
                                session={selectedSession}
                                activePatternLabel={
                                    currentExecution
                                        ? currentExecution.version_label
                                        : (selectedCreation && !selectedCreation.active_pattern_execution_id ? 'Sin patrón activo (Patronaje pendiente)' : null)
                                }
                                patternLink={creationFlowSummary.patternLink}
                                onOpenInfo={(kind: ContextInfoKind) => setActiveInfoKind(kind)}
                                onChangeContext={handleChangeCreationContext}
                            />
                            <CreationStepper
                                summary={creationFlowSummary}
                                activeStage={activeCreationStage}
                                onSelect={handleSelectCreationStage}
                            />
                        </View>
                    )}

                    {/* BANNER IDENTIFICADOR PERSISTENTE FLUJO D */}
                    {activeWorkflow === 'free_pattern' && (
                        <>
                            {/* HERO EDITORIAL EXCLUSIVO DEL FLUJO D: DEL GESTO A LA GEOMETRÍA */}
                            <View style={[styles.freePatternHeroCard, isMobile && styles.freePatternHeroCardMobile]}>
                                <View style={styles.freePatternHeroContent}>
                                    <View style={styles.freePatternHeroEyebrowRow}>
                                        <Text style={styles.freePatternHeroStar}>✦</Text>
                                        <Text style={styles.freePatternHeroEyebrow}>FLUJO D · PATRÓN LIBRE / BANCO GLOBAL</Text>
                                        <View style={styles.freePatternHeroTag}>
                                            <Text style={styles.freePatternHeroTagText}>ALTA COSTURA</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.freePatternHeroTitle}>Del gesto a la geometría.</Text>
                                    <Text style={styles.freePatternHeroSubtitle}>
                                        Estudio de patronaje libre y archivo técnico para el Banco Global del Atelier.
                                    </Text>
                                    <Text style={styles.freePatternHeroDescription}>
                                        Un espacio de experimentación y patronaje técnico independiente de clientas y creaciones. Formulación de volúmenes, exploración de siluetas y desarrollo de moldería arquetípica de alta costura con precisión milimétrica.
                                    </Text>
                                    <View style={styles.freePatternHeroBadgesRow}>
                                        <View style={styles.freePatternHeroBadge}>
                                            <Text style={styles.freePatternHeroBadgeText}>✦ Origen: Patrón Libre</Text>
                                        </View>
                                        <View style={styles.freePatternHeroBadge}>
                                            <Text style={styles.freePatternHeroBadgeText}>📐 Perfil: {freePatternProfileLabel}</Text>
                                        </View>
                                        <View style={styles.freePatternHeroBadge}>
                                            <Text style={styles.freePatternHeroBadgeText}>🏛️ Destino: Banco Global</Text>
                                        </View>
                                        <View style={styles.freePatternHeroBadge}>
                                            <Text style={styles.freePatternHeroBadgeText}>✂️ Trazado Paramétrico Puro</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.freePatternHeroImageWrapper, isMobile && styles.freePatternHeroImageWrapperMobile]}>
                                    <Image
                                        source={PATTERN_FREE_HERO_IMAGE}
                                        style={styles.freePatternHeroImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.freePatternHeroImageOverlay} />
                                    <View style={styles.freePatternHeroImageCaption}>
                                        <Text style={styles.freePatternHeroImageCaptionText}>
                                            MESA DE TRAZADO & ALTA COSTURA · ATELIER DIGITAL
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* TARJETA PERSISTENTE DE IDENTIDAD Y METADATOS TÉCNICOS */}
                            <View style={styles.persistentWorkflowCard}>
                                <View style={styles.persistentWorkflowTopRow}>
                                    <View style={styles.persistentWorkflowPill}>
                                        <Text style={styles.persistentWorkflowPillText}>
                                            PATRÓN LIBRE · BANCO GLOBAL
                                        </Text>
                                    </View>
                                    <Text style={styles.persistentWorkflowTagline}>
                                        Perfil: {freePatternProfileLabel} · Alta Costura
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.directAnatomyToggleBtn}
                                        onPress={() => setIsFreeMannequinCollapsed((prev) => !prev)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.directAnatomyToggleBtnText}>
                                            {isFreeMannequinCollapsed
                                                ? '👁️ [MOSTRAR MANIQUÍ DE REFERENCIA ▾]'
                                                : '▲ [OCULTAR MANIQUÍ DE REFERENCIA]'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.persistentWorkflowGridWrap}>
                                    {/* EJE PRINCIPAL DE ATRIBUTOS TÉCNICOS: ORIGEN / PERFIL / PRENDA / PLANTILLA / DESTINO */}
                                    <View style={styles.persistentWorkflowPrimaryRow}>
                                        <View style={styles.persistentWorkflowPrimaryCol}>
                                            <Text style={styles.persistentWorkflowPrimaryLabel}>ORIGEN</Text>
                                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                                Patrón Libre
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowPrimaryCol}>
                                            <Text style={styles.persistentWorkflowPrimaryLabel}>PERFIL ANATÓMICO</Text>
                                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                                {freePatternProfileLabel}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowPrimaryCol}>
                                            <Text style={styles.persistentWorkflowPrimaryLabel}>PRENDA</Text>
                                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                                {GARMENT_PACKAGES[garmentType]?.name || garmentType}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowPrimaryCol}>
                                            <Text style={styles.persistentWorkflowPrimaryLabel}>PLANTILLA</Text>
                                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                                {selectedTemplate ? selectedTemplate.name : 'Plantilla Base'}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowPrimaryCol}>
                                            <Text style={styles.persistentWorkflowPrimaryLabel}>DESTINO</Text>
                                            <Text style={styles.persistentWorkflowPrimaryVal} numberOfLines={1}>
                                                Banco Global
                                            </Text>
                                        </View>
                                    </View>

                                    {/* METADATOS TÉCNICOS SECUNDARIOS DE TALLER: ESTADO / VERSIÓN / CLIENTE / CREACIÓN / TRAZADO / APROBACIÓN */}
                                    <View style={styles.persistentWorkflowSecondaryRow}>
                                        <View style={[styles.persistentWorkflowSecondaryCol, { minWidth: 140 }]}>
                                            <Text style={styles.persistentWorkflowSecondaryLabel}>ESTADO</Text>
                                            <View style={[
                                                styles.freePatternStatusBadge,
                                                {
                                                    backgroundColor: freePatternLifecycleState.badgeBg,
                                                    borderColor: freePatternLifecycleState.badgeBorder,
                                                }
                                            ]}>
                                                <View style={[styles.freePatternStatusDot, { backgroundColor: freePatternLifecycleState.dotColor }]} />
                                                <Text style={[styles.freePatternStatusText, { color: freePatternLifecycleState.badgeText }]}>
                                                    {freePatternLifecycleState.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.persistentWorkflowSecondaryCol}>
                                            <Text style={styles.persistentWorkflowSecondaryLabel}>VERSIÓN ACTUAL</Text>
                                            <Text style={[styles.persistentWorkflowSecondaryVal, { fontWeight: '700' }]} numberOfLines={1}>
                                                {freePatternLifecycleState.versionLabel}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowSecondaryCol}>
                                            <Text style={styles.persistentWorkflowSecondaryLabel}>CLIENTE</Text>
                                            <Text style={[styles.persistentWorkflowSecondaryVal, { fontStyle: 'italic', color: associatedClientName ? '#A78350' : '#8C8275' }]} numberOfLines={1}>
                                                {freePatternLifecycleState.clientLabel}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowSecondaryCol}>
                                            <Text style={styles.persistentWorkflowSecondaryLabel}>CREACIÓN</Text>
                                            <Text style={[styles.persistentWorkflowSecondaryVal, { fontStyle: 'italic', color: associatedCreationName ? '#A78350' : '#8C8275' }]} numberOfLines={1}>
                                                {freePatternLifecycleState.creationLabel}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowSecondaryCol}>
                                            <Text style={styles.persistentWorkflowSecondaryLabel}>TRAZADO</Text>
                                            <Text style={styles.persistentWorkflowSecondaryVal} numberOfLines={1}>
                                                {freePatternLifecycleState.tracingLabel}
                                            </Text>
                                        </View>
                                        <View style={styles.persistentWorkflowSecondaryCol}>
                                            <Text style={styles.persistentWorkflowSecondaryLabel}>APROBACIÓN</Text>
                                            <Text style={[
                                                styles.persistentWorkflowSecondaryVal,
                                                { color: freePatternLifecycleState.code === 'approved' ? '#2E7D32' : '#8C8275' }
                                            ]} numberOfLines={1}>
                                                {freePatternLifecycleState.approvalLabel}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* ACCIONES POSTERIORES OPCIONALES (NO BLOQUEANTES) */}
                                <View style={styles.persistentWorkflowOptionalActions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.optionalActionBtn,
                                            associatedClientName && styles.optionalActionBtnActive,
                                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnDisabled,
                                        ]}
                                        onPress={() => {
                                            if (!freePatternLifecycleState.hasRealPattern) {
                                                setStatusMessage({
                                                    text: 'Para asociar a una clienta, primero debe trazar/generar el patrón en la Mesa CAD.',
                                                    type: 'info',
                                                });
                                                return;
                                            }
                                            setLinkSearchQuery('');
                                            setIsLinkClientModalOpen(true);
                                        }}
                                        disabled={!freePatternLifecycleState.hasRealPattern}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.optionalActionBtnText,
                                            associatedClientName && styles.optionalActionBtnTextActive,
                                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnTextDisabled,
                                        ]}>
                                            {associatedClientName ? `✓ Clienta: ${associatedClientName}` : '+ Asociar a Clienta'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.optionalActionBtn,
                                            associatedCreationName && styles.optionalActionBtnActive,
                                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnDisabled,
                                        ]}
                                        onPress={() => {
                                            if (!freePatternLifecycleState.hasRealPattern) {
                                                setStatusMessage({
                                                    text: 'Para asociar a una creación, primero debe trazar/generar el patrón en la Mesa CAD.',
                                                    type: 'info',
                                                });
                                                return;
                                            }
                                            setLinkSearchQuery('');
                                            setIsLinkCreationModalOpen(true);
                                        }}
                                        disabled={!freePatternLifecycleState.hasRealPattern}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.optionalActionBtnText,
                                            associatedCreationName && styles.optionalActionBtnTextActive,
                                            !freePatternLifecycleState.hasRealPattern && styles.optionalActionBtnTextDisabled,
                                        ]}>
                                            {associatedCreationName ? `✓ Creación: ${associatedCreationName}` : '+ Asociar a Creación'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Barra de 5 pestañas de estudio: solo Flujos B y D. En el Flujo C el stepper de
                        7 etapas es la ÚNICA navegación principal (no coexiste una segunda barra global). */}
                    {activeWorkflow !== 'creation_pattern' && (
                    <View style={styles.studioTabBar}>
                        <TouchableOpacity
                            style={[
                                styles.studioTabBtn,
                                activeStudioTab === 'garment' && styles.studioTabBtnActive,
                            ]}
                            onPress={() => {
                                setActiveStudioTab('garment');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.studioTabBtnText,
                                    activeStudioTab === 'garment' && styles.studioTabBtnTextActive,
                                ]}
                            >
                                👗 Prenda & Silueta
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.studioTabBtn,
                                activeStudioTab === 'cad' && styles.studioTabBtnActive,
                            ]}
                            onPress={() => {
                                setActiveStudioTab('cad');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.studioTabBtnText,
                                    activeStudioTab === 'cad' && styles.studioTabBtnTextActive,
                                ]}
                            >
                                📐 Mesa CAD {geometryResult ? '✓' : ''}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.studioTabBtn,
                                activeStudioTab === 'fitting' && styles.studioTabBtnActive,
                            ]}
                            onPress={() => {
                                setActiveStudioTab('fitting');
                                setActiveResultsTab('fitting');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.studioTabBtnText,
                                    activeStudioTab === 'fitting' && styles.studioTabBtnTextActive,
                                ]}
                            >
                                ✂️ Fitting & Ajustes {adjustmentsHistory.length > 0 ? `(${adjustmentsHistory.length})` : ''}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.studioTabBtn,
                                activeStudioTab === 'specifications' && styles.studioTabBtnActive,
                            ]}
                            onPress={() => {
                                setActiveStudioTab('specifications');
                                setActiveResultsTab('specifications');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.studioTabBtnText,
                                    activeStudioTab === 'specifications' && styles.studioTabBtnTextActive,
                                ]}
                            >
                                📋 Ficha & Auditoría C13
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.studioTabBtn,
                                activeStudioTab === 'history' && styles.studioTabBtnActive,
                            ]}
                            onPress={() => {
                                setActiveStudioTab('history');
                                setActiveResultsTab('history');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.studioTabBtnText,
                                    activeStudioTab === 'history' && styles.studioTabBtnTextActive,
                                ]}
                            >
                                📜 Bitácora ({executionHistory.length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                    )}

                    {/* ETAPA 1 DEL FLUJO C: VISTA EDITORIAL DE LA CREACIÓN */}
                    {activeWorkflow === 'creation_pattern' && !creationGateActive && activeCreationStage === 'creation' && (
                        <View style={styles.tabContentArea}>
                            <CreationHero
                                client={selectedClient}
                                creation={selectedCreation}
                                garmentType={garmentType}
                                session={selectedSession}
                                summary={creationFlowSummary}
                                clientCreations={clientCreations}
                                loadingCreations={loadingCreations}
                                onSelectCreation={handleOpenCreation}
                                onContinue={() => {
                                    handleSelectCreationStage(creationFlowSummary.nextStep.stage);
                                }}
                                onSelectStage={(stage: CreationStageId) => handleSelectCreationStage(stage)}
                                onOpenInfo={(kind: ContextInfoKind) => setActiveInfoKind(kind)}
                                onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                                onOpenCreationsModule={() => {
                                    router.push({
                                        pathname: '/(designer)/creations',
                                        params: { client_id: selectedClient?.id },
                                    });
                                }}
                            />
                            <ReadinessCard
                                summary={creationFlowSummary}
                                onSelectStage={(st: CreationStageId) => handleSelectCreationStage(st)}
                            />
                        </View>
                    )}

                    {/* ETAPA 2 DEL FLUJO C: ANATOMÍA & DIAGNÓSTICO DE MEDIDAS */}
                    {activeWorkflow === 'creation_pattern' && !creationGateActive && activeCreationStage === 'anatomy' && (
                        <View style={styles.tabContentArea}>
                            <AnatomyDiagnosisCard
                                summary={creationFlowSummary}
                                diagnosis={garmentDiagnosis}
                                onOpenGuide={(code) => {
                                    setSelectedMeasureCode(code);
                                    handleOpenMeasureGuide(code);
                                }}
                                onGoGarment={() => handleSelectCreationStage('garment')}
                                onOpenSession={() => {
                                    setModalPreviousSession(selectedSession);
                                    setIsMeasurementModalOpen(true);
                                }}
                            />
                            <View style={{ marginTop: 16 }}>
                                <AtelierClientAnatomyWorkspace
                                    clients={clients}
                                    selectedClient={selectedClient}
                                    onSelectClient={(c) => setSelectedClient(c)}
                                    loadingClients={loadingClients}
                                    sessions={sessions}
                                    selectedSession={selectedSession}
                                    onSelectSession={(s) => setSelectedSession(s)}
                                    activeMeasurementsMm={activeMeasurementsMm}
                                    executionHistory={executionHistory}
                                    clientCreations={clientCreations}
                                    isMannequinCollapsed={isMannequinCollapsed}
                                    onToggleMannequinCollapse={() => setIsMannequinCollapsed((prev) => !prev)}
                                    onRectifySession={(prevSession) => {
                                        setModalPreviousSession(prevSession);
                                        setIsMeasurementModalOpen(true);
                                    }}
                                    onNewSession={() => {
                                        setModalPreviousSession(null);
                                        setIsMeasurementModalOpen(true);
                                    }}
                                    selectedMeasureCode={selectedMeasureCode}
                                    onSelectMeasureCode={(code) => setSelectedMeasureCode(code)}
                                    mannequinViewMode={mannequinViewMode}
                                    onViewModeChange={(mode) => setMannequinViewMode(mode)}
                                    mannequinPerspective={mannequinPerspective}
                                    onPerspectiveChange={(persp) => setMannequinPerspective(persp)}
                                    selectedTemplate={selectedTemplate}
                                    templateRequirementsCheck={templateRequirementsCheck}
                                    showMmEquivalencies={showMmEquivalencies}
                                    onToggleShowMm={() => setShowMmEquivalencies((prev) => !prev)}
                                    isMeasuresTableCollapsed={isMeasuresTableCollapsed}
                                    onToggleCollapseMeasuresTable={() => setIsMeasuresTableCollapsed((prev) => !prev)}
                                    expandedMeasureCategories={expandedMeasureCategories}
                                    onToggleMeasureCategory={toggleMeasureCategory}
                                    onOpenMeasureGuide={handleOpenMeasureGuide}
                                    onViewDerivedPatterns={(sessionId) => setViewingDerivedSessionId(sessionId)}
                                    isExportMenuOpen={isExportMenuOpen}
                                    onToggleExportMenu={() => setIsExportMenuOpen((prev) => !prev)}
                                    onCloseExportMenu={() => setIsExportMenuOpen(false)}
                                    formatDateFn={formatDate}
                                />
                            </View>
                        </View>
                    )}

                    {/* PESTAÑA 1: PRENDA Y CONFIGURACIÓN */}
                    {isStudioTabShown('garment') && (
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
                        )}

                        {/* PESTAÑA 2: MESA CAD (ESPECIFICACIÓN TÉCNICA, TRAZADO Y LIENZO VECTORIAL) */}
                        {isStudioTabShown('cad') && (
                            <View style={styles.tabContentArea}>
                                {/* ============================================================================== */}
                                {/* PASO 3 & 4: ESPECIFICACIÓN TÉCNICA & TRAZADO (COMPACTO DE TALLER) */}
                                {/* ============================================================================== */}
                                <View style={styles.technicalConfigCard}>
                                    {/* Cabecera Editorial Visual Haute Couture */}
                                    <View style={styles.cadGarmentHeroRow}>
                                        {garmentType && GARMENT_EDITORIAL_IMAGES[garmentType] && (
                                            <View style={styles.cadGarmentImgWrap}>
                                                <Image
                                                    source={GARMENT_EDITORIAL_IMAGES[garmentType]}
                                                    style={styles.cadGarmentImg}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        )}
                                        <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
                                            <View style={styles.badgeRow}>
                                                <Text style={styles.stepBadge}>PASO 3 & 4</Text>
                                                <Text style={styles.stepperSubtitle}>ESPECIFICACIÓN & TRAZADO</Text>
                                            </View>
                                            <Text style={styles.cadGarmentTitle}>
                                                {GARMENT_PACKAGES[garmentType]?.name || garmentType}
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                                {selectedTemplate && (
                                                    <View style={styles.templateActivePill}>
                                                        <Text style={styles.templateActivePillText}>
                                                            Plantilla: {selectedTemplate.name} (v{selectedTemplate.version})
                                                        </Text>
                                                    </View>
                                                )}
                                                {garmentType && GARMENT_PACKAGES[garmentType] && (
                                                    <View style={styles.cadPiecesBadge}>
                                                        <Text style={styles.cadPiecesBadgeText}>
                                                            ✦ {GARMENT_PIECE_COUNTS[garmentType] || 'Alta costura'} piezas técnicas
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                            {/* Selector de plantilla y desahogos en fila compacta */}
                            <View style={styles.compactConfigGrid}>
                                {/* Selección de Plantilla */}
                                {templates.length > 0 && (
                                    <View style={styles.compactConfigCol}>
                                        <Text style={styles.paramsSubLabel}>Plantilla Metodológica Base:</Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                                        >
                                            {templates.map((tpl) => {
                                                const isSelected = selectedTemplate?.id === tpl.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={tpl.id}
                                                        style={[
                                                            styles.templateChip,
                                                            isSelected && styles.templateChipActive,
                                                        ]}
                                                        onPress={() => handleSelectTemplate(tpl)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.templateChipName,
                                                                isSelected && styles.templateChipNameActive,
                                                            ]}
                                                        >
                                                            {isSelected ? '✓ ' : ''}{tpl.name} v{tpl.version}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Perfil de Holgura */}
                                <View style={styles.compactConfigCol}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.paramsSubLabel}>Holgura Sugerida:</Text>
                                        {selectedTemplate?.default_ease_profile_code && selectedEaseProfile.code !== selectedTemplate.default_ease_profile_code && (
                                            <TouchableOpacity
                                                style={styles.applyEaseSmallBtn}
                                                onPress={handleApplySuggestedEase}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.applyEaseSmallBtnText}>✦ Sugerida ({selectedTemplate.default_ease_profile_code})</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.easeSelectorCompact}>
                                        {STANDARD_EASE_PROFILES.map((p) => (
                                            <TouchableOpacity
                                                key={p.code}
                                                style={[
                                                    styles.easeChipCompact,
                                                    selectedEaseProfile.code === p.code && styles.easeChipActive,
                                                ]}
                                                onPress={() => {
                                                    setSelectedEaseProfile(p);
                                                    setIsEaseManuallySetByUser(true);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.easeChipText,
                                                        selectedEaseProfile.code === p.code && styles.easeChipTextActive,
                                                    ]}
                                                >
                                                    {p.name.replace(' Alta Costura', '').replace(' (Recomendado)', '')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Margen de Costura & Silueta */}
                                <View style={styles.compactConfigRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.paramsSubLabelInline}>Margen:</Text>
                                        {[10, 15].map((sa) => (
                                            <TouchableOpacity
                                                key={sa}
                                                style={[
                                                    styles.silChipCompact,
                                                    designParams.seam_allowance_default_mm === sa && styles.silChipActive,
                                                ]}
                                                onPress={() =>
                                                    setDesignParams({
                                                        ...designParams,
                                                        seam_allowance_default_mm: sa,
                                                    })
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.silChipText,
                                                        designParams.seam_allowance_default_mm === sa && styles.silChipTextActive,
                                                    ]}
                                                >
                                                    {sa} mm
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {(garmentType === 'skirt' || garmentType === 'dress') && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.paramsSubLabelInline}>Silueta:</Text>
                                            <TouchableOpacity
                                                style={[
                                                    styles.silChipCompact,
                                                    designParams.skirt_silhouette === 'straight' && styles.silChipActive,
                                                ]}
                                                onPress={() => setDesignParams({ ...designParams, skirt_silhouette: 'straight' })}
                                            >
                                                <Text
                                                    style={[
                                                        styles.silChipText,
                                                        designParams.skirt_silhouette === 'straight' && styles.silChipTextActive,
                                                    ]}
                                                >
                                                    Recta
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.silChipCompact,
                                                    designParams.skirt_silhouette === 'a_line' && styles.silChipActive,
                                                ]}
                                                onPress={() => setDesignParams({ ...designParams, skirt_silhouette: 'a_line' })}
                                            >
                                                <Text
                                                    style={[
                                                        styles.silChipText,
                                                        designParams.skirt_silhouette === 'a_line' && styles.silChipTextActive,
                                                    ]}
                                                >
                                                    Línea A (+60mm)
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* DIAGNÓSTICO ESTRUCTURADO PASO 3 & 4 (SECCIÓN 6) */}
                            <View style={styles.technicalDiagnosticBox}>
                                <View style={styles.diagnosticHeaderRow}>
                                    <Text style={styles.technicalDiagnosticHeader}>
                                        ✦ DIAGNÓSTICO PREVIO AL TRAZADO (PASO 3 & 4)
                                    </Text>
                                    <View style={[
                                        styles.diagnosticStatusBadge,
                                        templateRequirementsCheck.valid ? styles.diagStatusReady : styles.diagStatusIncomplete
                                    ]}>
                                        <Text style={[
                                            styles.diagnosticStatusBadgeText,
                                            templateRequirementsCheck.valid ? styles.diagStatusReadyText : styles.diagStatusIncompleteText
                                        ]}>
                                            {templateMeasurementDiagnostic.hasUnresolved
                                                ? '⚠ MEDIDAS INCOMPLETAS'
                                                : templateMeasurementDiagnostic.hasEstimated
                                                ? 'ℹ INCLUYE MEDIDAS ESTIMADAS'
                                                : '✓ LISTO PARA GENERAR'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.technicalDiagnosticGrid}>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>CLIENTA:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>CREACIÓN:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>
                                            {activeWorkflow === 'free_pattern' ? 'ORIGEN MEDIDAS:' : 'SESIÓN:'}
                                        </Text>
                                        <Text style={styles.diagItemValue}>
                                            {activeWorkflow === 'free_pattern'
                                                ? (selectedReferenceProfileCode === 'custom'
                                                    ? 'MEDIDAS PERSONALIZADAS'
                                                    : `REFERENCIA: ${freePatternProfileLabel.toUpperCase()}`)
                                                : selectedSession
                                                ? `v${selectedSession.version_number} · ${formatSessionDate(selectedSession.session_date)}`
                                                : 'Sin sesión activa'}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>PRENDA:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {GARMENT_PACKAGES[garmentType]?.name || garmentType}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>PLANTILLA:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {selectedTemplate ? `${selectedTemplate.name} (v${selectedTemplate.version})` : 'Sin plantilla seleccionada'}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>MEDIDAS REQUERIDAS:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {selectedTemplate?.required_measurements.length || 0}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>MEDIDAS DISPONIBLES:</Text>
                                        <Text style={styles.diagItemValue}>
                                            {templateRequirementsCheck.present.length}
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>REALES REGISTRADAS:</Text>
                                        <Text style={[styles.diagItemValue, { color: '#2B5E35', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic.real.length} cotas
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>CÁLCULOS C10 AUTORIZADOS:</Text>
                                        <Text style={[styles.diagItemValue, { color: '#8A6A4A', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic.calculated.length} fórmulas
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>ESTIMADAS NORMALIZADAS:</Text>
                                        <Text style={[styles.diagItemValue, { color: templateMeasurementDiagnostic.hasEstimated ? '#D48806' : '#766B62', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic.estimated.length} proporciones
                                        </Text>
                                    </View>
                                    <View style={styles.technicalDiagnosticCol}>
                                        <Text style={styles.diagItemLabel}>NO RESUELTAS:</Text>
                                        <Text style={[styles.diagItemValue, { color: templateMeasurementDiagnostic.hasUnresolved ? '#CF1322' : '#2B5E35', fontWeight: '700' }]}>
                                            {templateMeasurementDiagnostic.unresolved.length} medidas
                                        </Text>
                                    </View>
                                </View>

                                {/* AVISO DE ESTIMACIÓN ANATÓMICA */}
                                {templateMeasurementDiagnostic.hasEstimated && (
                                    <View style={styles.estimatedMeasuresNoticeBox}>
                                        <Text style={styles.estimatedMeasuresNoticeTitle}>
                                            ℹ AVISO DE ESTIMACIÓN ANATÓMICA NORMALIZADA
                                        </Text>
                                        <Text style={styles.estimatedMeasuresNoticeText}>
                                            El patrón requiere {templateMeasurementDiagnostic.estimated.length} medida(s) no registradas físicamente. Se propone estimarlas mediante proporciones normalizadas de referencia (T40 Haute Couture). Se solicitará confirmación explícita antes de trazar la geometría.
                                        </Text>
                                    </View>
                                )}

                                {templateRequirementsCheck.valid ? (
                                    <View style={styles.diagReadyDetailsRow}>
                                        <TouchableOpacity
                                            style={styles.inspectValuesSmallBtn}
                                            onPress={() => setShowMeasurementsBreakdown((prev) => !prev)}
                                        >
                                            <Text style={styles.inspectValuesSmallBtnText}>
                                                {showMeasurementsBreakdown ? '▲ Ocultar desglose anatómico' : '👁️ [INSPECCIONAR MEDIDAS]'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.missingMeasuresAlertBox}>
                                        <Text style={styles.missingMeasuresAlertTitle}>
                                            ⚠ FALTAN {templateRequirementsCheck.missing.length} MEDIDAS (Requeridas: {selectedTemplate?.required_measurements.length || 0} · Disponibles: {templateRequirementsCheck.present.length})
                                        </Text>
                                        <Text style={styles.missingMeasuresListTitle}>Faltan:</Text>
                                        {templateRequirementsCheck.missing.map((code) => (
                                            <Text key={code} style={styles.missingMeasureCodeItem}>
                                                • {code} — {MEASUREMENT_MAP[code]?.name || 'Medida requerida'}
                                            </Text>
                                        ))}
                                        {activeWorkflow !== 'free_pattern' && selectedSession && (
                                            <TouchableOpacity
                                                style={styles.missingMeasureRectifyBtn}
                                                onPress={() => {
                                                    setModalPreviousSession(selectedSession);
                                                    setIsMeasurementModalOpen(true);
                                                }}
                                            >
                                                <Text style={styles.missingMeasureRectifyBtnText}>
                                                    ✏️ [RECTIFICAR SESIÓN]
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Botón Maestro de Generación */}
                            <View style={styles.compactGenerationBar}>
                                <TouchableOpacity
                                    style={[
                                        styles.generateButtonCompact,
                                        (isGenerating ||
                                            !templateRequirementsCheck.valid ||
                                            (activeWorkflow !== 'free_pattern' && (!selectedClient || !selectedSession || selectedSession.status === 'draft' || selectedSession.status === 'archived'))
                                        ) && styles.generateButtonDisabled,
                                    ]}
                                    onPress={() => handleGeneratePattern()}
                                    disabled={
                                        isGenerating ||
                                        !templateRequirementsCheck.valid ||
                                        (activeWorkflow !== 'free_pattern' && (!selectedClient || !selectedSession || selectedSession.status === 'draft' || selectedSession.status === 'archived'))
                                    }
                                    activeOpacity={0.85}
                                >
                                    {isGenerating ? (
                                        <ActivityIndicator color="#FAF7F2" size="small" />
                                    ) : (
                                        <Text style={styles.generateButtonCompactText}>
                                            ⚡ GENERAR PATRÓN EN MESA DE CORTE →
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* DESGLOSE DESPLEGABLE DE LAS MEDIDAS ANATÓMICAS (C05, C06, C10) */}
                            {showMeasurementsBreakdown && (
                                <View style={styles.measurementsBreakdownCard}>
                                    <View style={styles.measurementsBreakdownHeader}>
                                        <View style={{ flex: 1, minWidth: 200 }}>
                                            <Text style={styles.measurementsBreakdownTitle}>
                                                {activeWorkflow === 'free_pattern'
                                                    ? `DETALLE DE MEDIDAS TÉCNICAS · PERFIL ${freePatternProfileLabel.toUpperCase()}`
                                                    : `DETALLE DE MEDIDAS CORPORALES · ${selectedClient?.full_name?.toUpperCase() || 'CLIENTA'}`}
                                            </Text>
                                            <Text style={styles.measurementsBreakdownSubtitle}>
                                                {activeWorkflow === 'free_pattern'
                                                    ? (selectedReferenceProfileCode === 'custom'
                                                        ? 'Medidas paramétricas personalizadas para prototipo experimental de taller · Destino: Banco Global'
                                                        : `Perfil anatómico de referencia estándar (${freePatternProfileLabel}) · Destino: Banco Global`)
                                                    : (selectedSession
                                                        ? `Sesión v${selectedSession.version_number} (${selectedSession.session_date || 'Sin fecha'}) · Medidas corporales verificadas para corte`
                                                        : 'Sin sesión activa seleccionada')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.measurementsEditBtn}
                                            onPress={() => {
                                                if (activeWorkflow === 'free_pattern') {
                                                    setIsCustomMeasurementsOpen(true);
                                                } else if (selectedSession) {
                                                    setModalPreviousSession(selectedSession);
                                                    setIsMeasurementModalOpen(true);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.measurementsEditBtnText}>
                                                {activeWorkflow === 'free_pattern' ? '✏️ Ajustar Cotas Libres' : '✏️ Rectificar o Editar Medidas'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.measurementsGrid}>
                                        {templateRequirementsCheck.present.map((code) => {
                                            const meta = MEASUREMENT_MAP[code];
                                            const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
                                            const fallback = pkg?.calculableFallbacks?.[code];
                                            const isDerived = !activeMeasurementsMm[code] && !!fallback;
                                            const valMm = activeMeasurementsMm[code] ?? (fallback ? fallback.calculate(activeMeasurementsMm) : null);
                                            const valCm = typeof valMm === 'number' ? roundTo(valMm / 10, 1) : '-';

                                            return (
                                                <View key={code} style={styles.measurementChip}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                                        <Text style={styles.measurementChipLabel} numberOfLines={1}>
                                                            {meta?.name || code}
                                                        </Text>
                                                        <Text style={styles.measurementChipBadge}>
                                                            {isDerived ? 'C10 DERIVADA' : 'DIRECTA'}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.measurementChipValue}>
                                                        {valCm} <Text style={styles.measurementChipUnit}>cm</Text>
                                                    </Text>
                                                    <Text style={styles.measurementChipCategory} numberOfLines={1}>
                                                        {isDerived
                                                            ? (fallback?.formulaDescription || 'Fórmula automática C10')
                                                            : (meta?.category || 'Cuerpo')}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Mensaje de espera si aún no se ha generado la geometría */}
                        {!geometryResult && (
                            <View style={styles.emptyMesaCard}>
                                <Text style={styles.emptyMesaIcon}>✂️</Text>
                                <Text style={styles.emptyMesaTitle}>Mesa CAD en Espera de Trazado</Text>
                                <Text style={styles.emptyMesaDesc}>
                                    Prenda seleccionada: <Text style={{ fontWeight: '700', color: '#8C6826' }}>{garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No seleccionada'}</Text>.
                                    {selectedClient ? ` Clienta: ${selectedClient.full_name}.` : ''} Revisa las holguras y márgenes en el panel superior y pulsa "Generar Patrón en Mesa de Corte" para calcular la geometría sastre en tiempo real.
                                </Text>
                            </View>
                        )}

                        {/* SECCIÓN DE RESULTADOS Y PREVISUALIZACIÓN */}
                        {geometryResult && (
                            <View style={styles.resultsContainer}>
                        {/* BARRA DE LINAJE Y REVISIONES HISTÓRICAS (C12) */}
                        <View style={styles.lineageBar}>
                            <View style={styles.lineageTitleRow}>
                                <Text style={styles.lineageBarLabel}>
                                    CADENA DE LINAJE Y REVISIONES (HISTORIAL INMUTABLE):
                                </Text>
                                <Text style={styles.lineageFlowHint}>
                                    PATRÓN ORIGINAL → PRUEBA → AJUSTE → PATRÓN CORREGIDO
                                </Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.lineagePillsContainer}
                            >
                                {(currentExecution
                                    ? fetchExecutionLineage(currentExecution.id, executionHistory)
                                    : (activeWorkflow === 'creation_pattern' && selectedCreation
                                        ? executionHistory.filter((e) => e.creation_id === selectedCreation.id)
                                        : executionHistory
                                    )
                                ).map((exec, idx) => {
                                    const isSelected = currentExecution?.id === exec.id;
                                    const isBase = !exec.parent_execution_id;
                                    return (
                                        <View key={exec.id} style={styles.lineageItemWrap}>
                                            {idx > 0 && <Text style={styles.lineageArrow}>→</Text>}
                                            <TouchableOpacity
                                                style={[
                                                    styles.lineagePill,
                                                    isSelected && styles.lineagePillActive,
                                                    exec.status === 'approved_by_designer' && styles.lineagePillApproved,
                                                ]}
                                                onPress={() => handleSelectExecution(exec)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.lineagePillText,
                                                        isSelected && styles.lineagePillTextActive,
                                                    ]}
                                                >
                                                    {exec.version_label} {isBase ? '(Base Original)' : `(Revisión)`}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.lineagePillStatus,
                                                        isSelected && styles.lineagePillStatusActive,
                                                    ]}
                                                >
                                                    {exec.status === 'approved_by_designer'
                                                        ? '✓ Aprobado'
                                                        : exec.status === 'pending_fitting'
                                                        ? 'Fitting'
                                                        : 'Generado'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                            {(currentExecution ? fetchExecutionLineage(currentExecution.id, executionHistory) : []).length <= 1 && (
                                <Text style={styles.lineageSingleNote}>
                                    ✦ Versión original activa ({currentExecution?.version_label || 'v1.0.0'}). Cada ajuste técnico en la etapa de Fitting generará una nueva revisión derivada conservando esta versión base intacta.
                                </Text>
                            )}
                        </View>

                        {/* ============================================================================== */}
                        
                        
                        {/* CABECERA RÁPIDA DE ESTADO Y ACCIONES DE TALLER */}
                        <View style={styles.fastActionHeaderRow}>
                            <View style={styles.fastActionLeft}>
                                <View style={styles.fastActionBadgeRow}>
                                    <Text style={styles.stepBadge}>PASO 5</Text>
                                    <Text style={styles.fastActionPrendaText}>
                                        {garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'Patrón'} — {currentExecution?.version_label || 'v1.0'}
                                    </Text>
                                </View>
                                <Text style={styles.fastActionClientText}>
                                    Mesa de Corte para: {activeWorkflow === 'free_pattern' ? 'Patrón Libre / Banco Global' : (selectedClient?.full_name || 'Sin clienta')}
                                </Text>
                            </View>

                            <View style={styles.fastActionRight}>
                                <View
                                    style={[
                                        styles.patternStatusBadge,
                                        patternStatus === 'approved_by_designer'
                                            ? styles.statusBadgeApproved
                                            : patternStatus === 'pending_fitting'
                                            ? styles.statusBadgeFitting
                                            : styles.statusBadgePending,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.patternStatusBadgeText,
                                            patternStatus === 'approved_by_designer'
                                                ? styles.statusTextApproved
                                                : patternStatus === 'pending_fitting'
                                                ? styles.statusTextFitting
                                                : styles.statusTextPending,
                                        ]}
                                    >
                                        {patternStatus === 'approved_by_designer'
                                            ? '✓ APROBADO POR KATHERINE CARROLL'
                                            : patternStatus === 'pending_fitting'
                                            ? 'EN PRUEBA DE VESTUARIO'
                                            : 'PATRÓN GENERADO — LISTO'}
                                    </Text>
                                </View>

                                {role !== 'client' && (
                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        {patternStatus === 'generated' && (
                                            <TouchableOpacity
                                                style={styles.fittingButtonCompact}
                                                onPress={handleSendToFitting}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.fittingButtonCompactText}>
                                                    👗 Enviar a Fitting
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {(patternStatus === 'pending_fitting' || patternStatus === 'needs_revision') && (
                                            <TouchableOpacity
                                                style={styles.adjustButtonCompact}
                                                onPress={() => setIsAdjustmentsModalOpen(true)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.adjustButtonCompactText}>
                                                    ✂ Registrar Ajuste
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {patternStatus !== 'approved_by_designer' && (
                                            <TouchableOpacity
                                                style={[
                                                    styles.approveButtonCompact,
                                                    validationChecklist.hasBlocked && styles.approveButtonDisabled,
                                                ]}
                                                onPress={handleApprovePattern}
                                                disabled={validationChecklist.hasBlocked}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.approveButtonCompactText}>
                                                    ✓ Aprobar Patrón
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {patternStatus === 'approved_by_designer' && (
                                            <TouchableOpacity
                                                style={styles.adjustButtonCompact}
                                                onPress={() => setIsAdjustmentsModalOpen(true)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.adjustButtonCompactText}>
                                                    ✂ Nuevo Ajuste
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Lienzo vectorial interactivo */}
                        {/* CHECKLIST C13 PLEGABLE PARA TABLETA (No empuja la mesa CAD) */}
                        <View style={styles.compactChecklistBar}>
                            <TouchableOpacity
                                style={styles.compactChecklistTouchable}
                                onPress={() => setShowChecklistDetails(!showChecklistDetails)}
                                activeOpacity={0.8}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={styles.checklistPillIcon}>
                                        <Text style={styles.checklistPillIconText}>✓ C13</Text>
                                    </View>
                                    <Text style={styles.checklistPillTitle}>
                                        11 Criterios de Corte Validados ({validationChecklist.hasBlocked ? 'Requiere Atención' : '100% Conforme'})
                                    </Text>
                                </View>
                                <Text style={styles.checklistPillAction}>
                                    {showChecklistDetails ? 'Ocultar Criterios ▲' : 'Ver 11 Criterios ▼'}
                                </Text>
                            </TouchableOpacity>

                            {showChecklistDetails && (
                                <View style={styles.checklistDropdownWrap}>
                                    {validationChecklist.items.map((item) => (
                                        <View key={item.id} style={styles.checklistItemRow}>
                                            <View
                                                style={[
                                                    styles.itemStatusPill,
                                                    item.status === 'PASS'
                                                        ? styles.pillPass
                                                        : item.status === 'WARNING'
                                                        ? styles.pillWarning
                                                        : styles.pillBlocked,
                                                ]}
                                            >
                                                <Text style={styles.itemStatusPillText}>{item.status}</Text>
                                            </View>
                                            <View style={styles.itemContentCol}>
                                                <Text style={styles.itemLabelText}>{item.label}</Text>
                                                <Text style={styles.itemDescText}>{item.desc}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <PatternPreviewCanvas
                            geometry={geometryResult}
                            compareGeometry={
                                currentExecution?.parent_execution_id
                                    ? executionHistory.find((e) => e.id === currentExecution.parent_execution_id)?.geometry_result
                                    : undefined
                            }
                            title={`${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'Patrón'} — ${selectedClient?.full_name || 'Clienta'}`}
                        />

                        
                        {/* Barra de exportaciones y ajustes */}
                        <View style={styles.exportBar}>
                            <TouchableOpacity
                                style={styles.exportActionBtn}
                                onPress={handleExportSvg}
                            >
                                <Text style={styles.exportActionText}>💾 Descargar SVG (1:1 mm)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.exportActionBtn}
                                onPress={handlePrintTiled}
                            >
                                <Text style={styles.exportActionText}>🖨 Imprimir Mosaico A4/Carta</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.exportActionBtn}
                                onPress={handleExportDxf}
                            >
                                <Text style={styles.exportActionText}>📐 Exportar CAD DXF (R12)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.exportActionBtn, styles.exportActionBtnProduction]}
                                onPress={() => setIsProductionModalOpen(true)}
                            >
                                <Text style={styles.exportActionTextProduction}>
                                    📋 Ficha Técnica & Paquete de Producción
                                </Text>
                            </TouchableOpacity>

                            {currentExecution?.parent_execution_id && (
                                <TouchableOpacity
                                    style={[styles.exportActionBtn, styles.exportActionBtnComparison]}
                                    onPress={() => handleOpenComparison()}
                                >
                                    <Text style={styles.exportActionTextComparison}>
                                        ⚖ Comparar con Versión Anterior
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.exportActionBtn, styles.exportActionBtnHighlight]}
                                onPress={() => setIsAdjustmentsModalOpen(true)}
                            >
                                <Text style={styles.exportActionTextHighlight}>
                                    ✂ Registrar Ajuste de Prueba
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* PASO 11 — INFORMACIÓN DE EXPORTACIÓN */}
                        {lastExportInfo && (
                            <View style={styles.exportSuccessCard}>
                                <View style={styles.exportSuccessHeader}>
                                    <Text style={styles.exportSuccessTitle}>✓ Patrón exportado correctamente</Text>
                                    <TouchableOpacity onPress={() => setLastExportInfo(null)}>
                                        <Text style={styles.exportSuccessClose}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.exportSuccessGrid}>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Archivo:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.fileName}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Prenda:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.garmentName}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Plantilla:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.templateName}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Versión:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.version}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Fecha:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.date}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Unidades:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.units}</Text>
                                    </View>
                                    <View style={styles.exportSuccessItem}>
                                        <Text style={styles.exportSuccessLabel}>Cantidad de piezas:</Text>
                                        <Text style={styles.exportSuccessValue}>{lastExportInfo.piecesCount} piezas técnicas</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        
                        
                        {/* Banner de Navegación de Taller: Etapas Siguientes */}
                        <View style={styles.cadNextStepsBanner}>
                            <TouchableOpacity
                                style={styles.cadNextStepBtn}
                                onPress={() => {
                                    setActiveStudioTab('fitting');
                                    setActiveResultsTab('fitting');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cadNextStepBtnText}>👗 Pasar a Fitting & Ajustes →</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cadNextStepBtn}
                                onPress={() => {
                                    setActiveStudioTab('specifications');
                                    setActiveResultsTab('specifications');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cadNextStepBtnText}>📋 Consultar Ficha & Auditoría C13 →</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cadNextStepBtn}
                                onPress={() => {
                                    setActiveStudioTab('history');
                                    setActiveResultsTab('history');
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.cadNextStepBtnText}>📜 Ver Bitácora & Linaje ({executionHistory.length}) →</Text>
                            </TouchableOpacity>
                        </View>
                        {renderBankClosureSection()}
                    </View>
                )}
            </View>
        )}

        {/* PESTAÑA 3: FITTING & AJUSTES */}
        {isStudioTabShown('fitting') && (
            <View style={styles.tabContentArea}>
                {/* Cuaderno de Fitting de Atelier (Flujo C) */}
                {activeWorkflow === 'creation_pattern' && (
                    <View style={{ marginBottom: 16 }}>
                        <CreationFittingNotebook
                            adjustments={adjustmentsHistory}
                            hasActivePattern={!!currentExecution}
                            patternLabel={currentExecution ? currentExecution.version_label : null}
                            onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                            onRegisterFirstTrial={handleOpenAddAdjustmentModal}
                        />
                    </View>
                )}
                {!geometryResult ? (
                    <View style={styles.emptyMesaCard}>
                        <Text style={styles.emptyMesaIcon}>👗</Text>
                        <Text style={styles.emptyMesaTitle}>
                            {activeWorkflow === 'free_pattern' ? 'Prueba Técnica del Patrón en Espera' : 'Fitting & Pruebas en Espera'}
                        </Text>
                        <Text style={styles.emptyMesaDesc}>
                            {activeWorkflow === 'free_pattern'
                                ? 'Para realizar pruebas técnicas de volumen, aplomos y registrar ajustes de entalle sobre el patrón libre, primero debes generarlo en la Mesa CAD.'
                                : 'Para registrar pruebas de vestuario en muselina (toile) y registrar ajustes de entalle (C12), primero debes generar el patrón en la Mesa CAD.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.goToCadBtn}
                            onPress={() => setActiveStudioTab('cad')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.goToCadBtnText}>📐 Ir a Mesa CAD para Generar Patrón</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        {/* HISTORIAL DE AJUSTES REGISTRADOS (C12) */}
                        {adjustmentsHistory.length > 0 && (
                            <View style={styles.adjustmentsHistoryCard}>
                                <View style={styles.adjustmentsHistoryHeader}>
                                    <Text style={styles.adjustmentsHistoryTitle}>
                                        HISTORIAL DE AJUSTES DE PRUEBA (FITTING)
                                    </Text>
                                    <Text style={styles.adjustmentsHistoryCount}>
                                        {adjustmentsHistory.length} ajuste(s) registrado(s)
                                    </Text>
                                </View>
                                {adjustmentsHistory.map((adj, index) => (
                                    <View key={adj.id || index} style={styles.adjustmentItemRow}>
                                        <View style={styles.adjustmentBadge}>
                                            <Text style={styles.adjustmentBadgeText}>
                                                FITTING #{adjustmentsHistory.length - index}
                                            </Text>
                                        </View>
                                        <View style={styles.adjustmentDetails}>
                                            <View style={styles.adjustmentMainLine}>
                                                <Text style={styles.adjustmentType}>
                                                    {adj.adjustment_type.toUpperCase()} ({adj.target_piece})
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.adjustmentDelta,
                                                        Number(adj.delta_mm) > 0 ? styles.deltaPositive : styles.deltaNegative,
                                                    ]}
                                                >
                                                    {Number(adj.delta_mm) > 0 ? `+${adj.delta_mm}` : adj.delta_mm} mm
                                                </Text>
                                            </View>
                                            <Text style={styles.adjustmentDescription}>
                                                {adj.description}
                                            </Text>
                                            <Text style={styles.adjustmentDate}>
                                                Fecha de prueba: {adj.fitting_date}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* SECCIÓN 9 — PRUEBA DE VESTUARIO Y AJUSTES (COMPONENTE 13) */}
                        {currentExecution && (
                            <View style={styles.fittingSectionCard}>
                                <View style={styles.fittingSectionHeader}>
                                    <View>
                                        <Text style={styles.fittingSectionTitle}>Prueba de Vestuario y Ajustes</Text>
                                        <Text style={styles.fittingSectionSubtitle}>Registrar observaciones y correcciones para nueva ejecución paramétrica</Text>
                                    </View>
                                    <View style={[styles.fittingSectionBadge, { backgroundColor: fittingStatus.color }]}>
                                        <Text style={styles.fittingSectionBadgeText}>ESTADO DE FITTING: {fittingStatus.label.toUpperCase()}</Text>
                                    </View>
                                </View>

                                {/* RESULTADO DE LA ÚLTIMA REGENERACIÓN (SECCIÓN 11) */}
                                {lastRegenerationResult && (
                                    <View style={styles.regenerationSuccessCard}>
                                        <View style={styles.regenerationSuccessHeader}>
                                            <Text style={styles.regenerationSuccessTitle}>✓ Nueva ejecución generada correctamente</Text>
                                        </View>
                                        <View style={styles.regenerationGrid}>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Número / ID:</Text>
                                                <Text style={styles.regenerationValue} numberOfLines={1}>{lastRegenerationResult.executionId}</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Prenda:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.garmentName}</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Plantilla:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.templateName}</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Versión generada:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.versionLabel}</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Ejecución de origen:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.parentVersion}</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Cantidad de ajustes:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.adjustmentsCount} ajuste(s)</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Fecha:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.date}</Text>
                                            </View>
                                            <View style={styles.regenerationItem}>
                                                <Text style={styles.regenerationLabel}>Diseñadora:</Text>
                                                <Text style={styles.regenerationValue}>{lastRegenerationResult.designer}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.regenerationHelpText}>
                                            El nuevo patrón derivado está cargado en el visor 2D y listo para inspección geométrica o exportación DXF.
                                        </Text>
                                    </View>
                                )}

                                {/* EJECUCIÓN BASE */}
                                <View style={styles.fittingSubCard}>
                                    <Text style={styles.fittingSubTitle}>
                                        {activeWorkflow === 'free_pattern' ? 'EJECUCIÓN BASE · PATRÓN LIBRE' : 'EJECUCIÓN BASE'}
                                    </Text>
                                    <View style={styles.fittingBaseGrid}>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Clienta:</Text>
                                            <Text style={styles.fittingBaseValue}>
                                                {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                            </Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Creación:</Text>
                                            <Text style={styles.fittingBaseValue}>
                                                {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                            </Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Prenda:</Text>
                                            <Text style={styles.fittingBaseValue}>{GARMENT_PACKAGES[currentExecution.garment_type].name}</Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Plantilla:</Text>
                                            <Text style={styles.fittingBaseValue}>{selectedTemplate?.name || 'Plantilla Base'}</Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Versión:</Text>
                                            <Text style={styles.fittingBaseValue}>{currentExecution.version_label}</Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Fecha:</Text>
                                            <Text style={styles.fittingBaseValue}>
                                                {currentExecution.created_at ? new Date(currentExecution.created_at).toLocaleString() : 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>
                                                {activeWorkflow === 'free_pattern' ? 'Perfil anatómico:' : 'Sesión de medidas:'}
                                            </Text>
                                            <Text style={styles.fittingBaseValue}>
                                                {activeWorkflow === 'free_pattern'
                                                    ? `Perfil ${freePatternProfileLabel} (Referencia de Talla)`
                                                    : (selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'N/A')}
                                            </Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Destino:</Text>
                                            <Text style={styles.fittingBaseValue}>
                                                {activeWorkflow === 'free_pattern' ? 'Banco Global de Patrones' : 'Bespoke / Clienta'}
                                            </Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Diseñadora:</Text>
                                            <Text style={styles.fittingBaseValue}>Katherine Carroll</Text>
                                        </View>
                                        <View style={styles.fittingBaseItem}>
                                            <Text style={styles.fittingBaseLabel}>Estado:</Text>
                                            <Text style={styles.fittingBaseValue}>{currentExecution.status.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* AJUSTES DE FITTING */}
                                <View style={styles.fittingSubCard}>
                                    <View style={styles.fittingSubHeader}>
                                        <Text style={styles.fittingSubTitle}>AJUSTES DE FITTING</Text>
                                        {role !== 'client' && (
                                            <TouchableOpacity
                                                style={styles.addAdjustmentBtn}
                                                onPress={handleOpenAddAdjustmentModal}
                                            >
                                                <Text style={styles.addAdjustmentBtnText}>+ Agregar ajuste</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {stagedAdjustments.length === 0 ? (
                                        <View style={styles.emptyAdjustmentsBox}>
                                            <Text style={styles.emptyAdjustmentsText}>
                                                No hay ajustes pendientes de aplicar. Presione "+ Agregar ajuste" para registrar correcciones observadas durante la prueba de vestuario.
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.stagedTableContainer}>
                                            <View style={styles.stagedTableHeader}>
                                                <Text style={[styles.stagedColHeader, { flex: 1.5 }]}>PIEZA</Text>
                                                <Text style={[styles.stagedColHeader, { flex: 1.2 }]}>AJUSTE</Text>
                                                <Text style={[styles.stagedColHeader, { flex: 1.2 }]}>UBICACIÓN</Text>
                                                <Text style={[styles.stagedColHeader, { flex: 1 }]}>VALOR</Text>
                                                <Text style={[styles.stagedColHeader, { flex: 1.8 }]}>MOTIVO</Text>
                                                <Text style={[styles.stagedColHeader, { flex: 1.4 }]}>RESPONSABLE</Text>
                                                <Text style={[styles.stagedColHeader, { flex: 0.8, textAlign: 'center' }]}>ACCIÓN</Text>
                                            </View>
                                            {stagedAdjustments.map((adj) => (
                                                <View key={adj.id} style={styles.stagedTableRow}>
                                                    <Text style={[styles.stagedCell, { flex: 1.5, fontWeight: '700' }]}>
                                                        {adj.pieceName || adj.targetPiece || 'General'}
                                                    </Text>
                                                    <Text style={[styles.stagedCell, { flex: 1.2 }]}>
                                                        {FIT_ADJUSTMENT_TYPES[adj.adjustmentType as FitAdjustmentCode]?.label || adj.adjustmentType}
                                                    </Text>
                                                    <Text style={[styles.stagedCell, { flex: 1.2 }]}>
                                                        {adj.location || adj.zone || '—'}
                                                    </Text>
                                                    <Text style={[styles.stagedCell, { flex: 1, fontWeight: '700' }]}>
                                                        {adj.direction === 'increase' ? `+${adj.value}` : `-${adj.value}`} {adj.unit}
                                                    </Text>
                                                    <Text style={[styles.stagedCell, { flex: 1.8 }]} numberOfLines={2}>
                                                        {adj.motive || adj.observation || '—'}
                                                    </Text>
                                                    <Text style={[styles.stagedCell, { flex: 1.4, fontSize: 10 }]} numberOfLines={1}>
                                                        {adj.recordedBy || 'Katherine Carroll'}
                                                    </Text>
                                                    <TouchableOpacity
                                                        style={[styles.stagedCellAction, { flex: 0.8 }]}
                                                        onPress={() => handleRemoveStagedAdjustment(adj.id)}
                                                    >
                                                        <Text style={styles.deleteStagedText}>Eliminar</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Observaciones de fitting */}
                                    <View style={styles.fittingNotesBlock}>
                                        <Text style={styles.fittingNotesLabel}>Observaciones de fitting (bitácora de confección):</Text>
                                        <TextInput
                                            style={styles.fittingNotesInput}
                                            placeholder="Detalles técnicos de caída, balance, drapeado o aplomo observados en la prueba..."
                                            placeholderTextColor="#8C7A6B"
                                            value={fittingNotes}
                                            onChangeText={setFittingNotes}
                                            multiline
                                        />
                                    </View>
                                </View>

                                {/* RESULTADO Y ACCIÓN DE REGENERACIÓN */}
                                <View style={styles.fittingSubCard}>
                                    <Text style={styles.fittingSubTitle}>RESULTADO</Text>
                                    <Text style={styles.regenerateDescription}>
                                        La regeneración paramétrica calculará un nuevo patrón derivado aplicando los ajustes sobre la holgura y diseño, dejando la ejecución actual {currentExecution.version_label} completamente intacta en la base de datos.
                                    </Text>
                                    {role !== 'client' && (
                                        <TouchableOpacity
                                            style={[
                                                styles.regeneratePatternBtn,
                                                (stagedAdjustments.length === 0 || isRegenerating) && styles.regeneratePatternBtnDisabled,
                                            ]}
                                            onPress={handleOpenRegenerateConfirm}
                                            disabled={stagedAdjustments.length === 0 || isRegenerating}
                                        >
                                            {isRegenerating ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.regeneratePatternBtnText}>
                                                    ⚡ Regenerar Patrón con Ajustes ({stagedAdjustments.length})
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        )}

            {/* PESTAÑA 4: FICHA TÉCNICA & AUDITORÍA C13 */}
            {isStudioTabShown('specifications') && (
                <View style={styles.tabContentArea}>
                    {/* Dossier Técnico Editorial de la Creación (Flujo C) */}
                    {activeWorkflow === 'creation_pattern' && (
                        <View style={{ marginBottom: 16 }}>
                            <CreationDossierOverview
                                client={selectedClient}
                                creation={selectedCreation}
                                garmentType={garmentType}
                                session={selectedSession}
                                summary={creationFlowSummary}
                                execution={currentExecution}
                                geometry={geometryResult}
                                adjustments={adjustmentsHistory}
                                onOpenInfo={(kind: ContextInfoKind) => setActiveInfoKind(kind)}
                                onZoom={(z: ZoomTarget) => setCreationZoomTarget(z)}
                                onOpenAdjustments={() => setIsAdjustmentsModalOpen(true)}
                                onApprovePattern={handleApprovePattern}
                            />
                        </View>
                    )}
                    {!geometryResult ? (
                        <View style={styles.emptyMesaCard}>
                            <Text style={styles.emptyMesaIcon}>📋</Text>
                            <Text style={styles.emptyMesaTitle}>Ficha Técnica y Auditoría C13</Text>
                            <Text style={styles.emptyMesaDesc}>
                                La ficha técnica y la auditoría de los 11 criterios de corte se computan a partir de la geometría del patrón trazado.
                            </Text>
                            <TouchableOpacity
                                style={styles.goToCadBtn}
                                onPress={() => setActiveStudioTab('cad')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.goToCadBtnText}>📐 Ir a Mesa CAD para Trazar Patrón</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {/* PASO 7 — RESULTADO: VISTA TÉCNICA Y ESPECIFICACIONES */}
                        <View style={styles.technicalSpecsCard}>
                            <View style={styles.technicalSpecsHeader}>
                                <Text style={styles.technicalSpecsTitle}>FICHA TÉCNICA DEL PATRÓN GENERADO</Text>
                                <View style={styles.technicalSpecsBadge}>
                                    <Text style={styles.technicalSpecsBadgeText}>Escala 1:1 · Unidades mm</Text>
                                </View>
                            </View>
                            <View style={styles.technicalSpecsGrid}>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>ID del Patrón:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {currentExecution?.id ? `${currentExecution.id.slice(0, 12)}...` : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Origen:</Text>
                                    <Text style={[styles.technicalSpecValue, { color: activeWorkflow === 'free_pattern' ? '#A78350' : '#171411', fontWeight: '700' }]}>
                                        {activeWorkflow === 'free_pattern'
                                            ? 'Patrón Libre'
                                            : activeWorkflow === 'direct_pattern'
                                            ? 'Patronaje Directo'
                                            : 'Creación Bespoke'}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Destino:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {activeWorkflow === 'free_pattern' ? 'Banco Global de Patrones' : 'Expediente Bespoke'}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Prenda:</Text>
                                    <Text style={styles.technicalSpecValue}>{garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No asignada'}</Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Plantilla:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {selectedTemplate ? selectedTemplate.name : 'Plantilla Base'}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Versión:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {currentExecution?.version_label || (selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0')}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Método:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {selectedTemplate ? selectedTemplate.method_reference : (garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].methodReference : 'No asignado')}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Clienta:</Text>
                                    <Text style={[styles.technicalSpecValue, activeWorkflow === 'free_pattern' && { fontStyle: 'italic', color: '#766B62' }]}>
                                        {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Creación:</Text>
                                    <Text style={[styles.technicalSpecValue, activeWorkflow === 'free_pattern' && { fontStyle: 'italic', color: '#766B62' }]}>
                                        {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>
                                        {activeWorkflow === 'free_pattern' ? 'Perfil Anatómico:' : 'Sesión de Medidas:'}
                                    </Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {activeWorkflow === 'free_pattern'
                                            ? `Perfil ${freePatternProfileLabel}`
                                            : (selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'N/A')}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Diseñadora:</Text>
                                    <Text style={styles.technicalSpecValue}>Katherine Carroll</Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Fecha/Hora:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleString() : new Date().toLocaleString()}
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Envergadura:</Text>
                                    <Text style={styles.technicalSpecValue}>
                                        {roundTo(geometryResult.boundingBox.width)} × {roundTo(geometryResult.boundingBox.height)} mm
                                    </Text>
                                </View>
                                <View style={styles.technicalSpecItem}>
                                    <Text style={styles.technicalSpecLabel}>Estado Auditoría:</Text>
                                    <Text style={[styles.technicalSpecValue, { color: validationChecklist.hasBlocked ? '#9E2A2B' : '#2B5E35', fontWeight: '700' }]}>
                                        {validationChecklist.hasBlocked ? 'BLOQUEADO' : 'CONFORME PARA CORTE'}
                                    </Text>
                                </View>
                            </View>

                            {/* Desglose de piezas geométricas (Paso 7: nombre, identificación, geometría, dimensiones) */}
                            <Text style={styles.piecesListSubtitle}>PIEZAS COMPONENTES ({geometryResult.pieces.length}):</Text>
                            <View style={styles.piecesListGrid}>
                                {geometryResult.pieces.map((piece) => (
                                    <View key={piece.id} style={styles.pieceDetailCard}>
                                        <View style={styles.pieceDetailHeader}>
                                            <Text style={styles.pieceDetailName}>{piece.name}</Text>
                                            <Text style={styles.pieceDetailCode}>ID: {piece.id}</Text>
                                        </View>
                                        <View style={styles.pieceDetailMeta}>
                                            <Text style={styles.pieceDetailDim}>
                                                Dimensiones: {roundTo(piece.boundingBox.width)} × {roundTo(piece.boundingBox.height)} mm
                                            </Text>
                                            <Text style={styles.pieceDetailSub}>
                                                Costura: {piece.seamAllowanceMm} mm · Cortar: {piece.quantityToCut} {piece.cutOnFold ? '(al doblez)' : ''}
                                            </Text>
                                            <Text style={styles.pieceDetailSub}>
                                                Aplomo: {piece.grainline.label || 'Definido'} · Piquetes: {piece.notches.length}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        
                                {/* SECCIÓN 2: REVISIÓN Y PRUEBA DEL PATRÓN (COMPONENTE 13) */}
                        {/* ============================================================================== */}
                        <View style={styles.reviewSectionCard}>
                            <View style={styles.reviewSectionHeader}>
                                <View>
                                    <Text style={styles.reviewSectionSuper}>MÓDULO 02 · ALTA COSTURA</Text>
                                    <Text style={styles.reviewSectionTitle}>REVISIÓN Y PRUEBA DEL PATRÓN</Text>
                                </View>
                                <View
                                    style={[
                                        styles.patternStatusBadge,
                                        patternStatus === 'approved_by_designer'
                                            ? styles.statusBadgeApproved
                                            : patternStatus === 'pending_fitting'
                                            ? styles.statusBadgeFitting
                                            : styles.statusBadgePending,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.patternStatusBadgeText,
                                            patternStatus === 'approved_by_designer'
                                                ? styles.statusTextApproved
                                                : patternStatus === 'pending_fitting'
                                                ? styles.statusTextFitting
                                                : styles.statusTextPending,
                                        ]}
                                    >
                                        {patternStatus === 'approved_by_designer'
                                            ? '✓ APROBADO POR KATHERINE CARROLL'
                                            : patternStatus === 'pending_fitting'
                                            ? 'EN PRUEBA DE VESTUARIO (FITTING)'
                                            : 'PATRÓN GENERADO — LISTO PARA PRUEBA'}
                                    </Text>
                                </View>
                            </View>

                            {/* FICHA TÉCNICA DE REVISIÓN (METADATOS EXIGIDOS POR EL COMPONENTE 13) */}
                            <View style={styles.reviewMetaGrid}>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>CLIENTE:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {activeWorkflow === 'free_pattern'
                                            ? (associatedClientName ? `${associatedClientName} (Asociada)` : 'No asociada')
                                            : (selectedClient?.full_name || 'No seleccionada')}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>CREACIÓN:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {activeWorkflow === 'free_pattern'
                                            ? (associatedCreationName ? `${associatedCreationName} (Asociada)` : 'No asociada')
                                            : (selectedCreation?.name || 'No asociada')}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>DESTINO:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {activeWorkflow === 'free_pattern' ? 'Banco Global' : 'Creación Bespoke'}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>SESIÓN DE MEDIDAS:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {activeWorkflow === 'free_pattern'
                                            ? `Perfil: ${freePatternProfileLabel}`
                                            : (selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'N/A')}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>PRENDA:</Text>
                                    <Text style={styles.reviewMetaValue}>{garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No asignada'}</Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>PLANTILLA:</Text>
                                    <Text style={styles.reviewMetaValue}>{selectedTemplate?.name || 'Plantilla Base'}</Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>VERSIÓN:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {currentExecution?.version_label || (selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0')}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>MÉTODO:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {selectedTemplate ? selectedTemplate.method_reference : (garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].methodReference : 'No asignado')}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>HOLGURA:</Text>
                                    <Text style={styles.reviewMetaValue}>{selectedEaseProfile.name}</Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>FECHA:</Text>
                                    <Text style={styles.reviewMetaValue}>
                                        {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleString() : new Date().toLocaleString()}
                                    </Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>DISEÑADORA:</Text>
                                    <Text style={styles.reviewMetaValue}>Katherine Carroll (Alta Costura)</Text>
                                </View>
                                <View style={styles.reviewMetaItem}>
                                    <Text style={styles.reviewMetaLabel}>ESTADO:</Text>
                                    <Text style={[styles.reviewMetaValue, { fontWeight: '700', color: patternStatus === 'approved_by_designer' ? '#2E7D32' : colors.accent }]}>
                                        {patternStatus === 'approved_by_designer'
                                            ? 'APPROVED (Inmutable)'
                                            : patternStatus === 'pending_fitting'
                                            ? 'FITTING (En Prueba)'
                                            : 'GENERATED (Generado)'}
                                    </Text>
                                </View>
                            </View>

                            {/* FLUJO VISUAL DEL CICLO C13 (C13.14) */}
                            <View style={styles.cycleFlowCard}>
                                <Text style={styles.cycleFlowTitle}>ESTADO DEL CICLO DE VIDA TÉCNICO (C13):</Text>
                                <View style={styles.cycleFlowStepsRow}>
                                    <View style={[styles.cycleStepBadge, styles.cycleStepActive]}>
                                        <Text style={styles.cycleStepText}>1. GENERADO</Text>
                                    </View>
                                    <Text style={styles.cycleArrow}>→</Text>
                                    <View style={[styles.cycleStepBadge, styles.cycleStepActive]}>
                                        <Text style={styles.cycleStepText}>2. REVISAR</Text>
                                    </View>
                                    <Text style={styles.cycleArrow}>→</Text>
                                    <View
                                        style={[
                                            styles.cycleStepBadge,
                                            (patternStatus === 'pending_fitting' || patternStatus === 'needs_revision') && styles.cycleStepActive,
                                            patternStatus === 'needs_revision' && styles.cycleStepAlert,
                                        ]}
                                    >
                                        <Text style={styles.cycleStepText}>
                                            {patternStatus === 'needs_revision' ? '3. DEVUELTO' : '3. AJUSTAR'}
                                        </Text>
                                    </View>
                                    <Text style={styles.cycleArrow}>→</Text>
                                    <View style={[styles.cycleStepBadge, !validationChecklist.hasBlocked && styles.cycleStepActive]}>
                                        <Text style={styles.cycleStepText}>4. VALIDAR</Text>
                                    </View>
                                    <Text style={styles.cycleArrow}>→</Text>
                                    <View style={[styles.cycleStepBadge, patternStatus === 'approved_by_designer' && styles.cycleStepApproved]}>
                                        <Text style={styles.cycleStepText}>5. APROBADO</Text>
                                    </View>
                                </View>
                            </View>

                            {/* CHECKLIST VISUAL DE VALIDACIÓN TÉCNICA (C13.7) */}
                            <View style={styles.checklistCard}>
                                <View style={styles.checklistHeaderRow}>
                                    <View>
                                        <Text style={styles.checklistTitle}>LISTA DE VALIDACIÓN TÉCNICA (CHECKLIST C13)</Text>
                                        <Text style={styles.checklistSubtitle}>
                                            Control riguroso de 11 criterios obligatorios antes del corte de alta costura
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.checklistOverallBadge,
                                            validationChecklist.hasBlocked
                                                ? styles.badgeBlocked
                                                : validationChecklist.warningCount > 0
                                                ? styles.badgeWarning
                                                : styles.badgePass,
                                        ]}
                                    >
                                        <Text style={styles.checklistOverallText}>
                                            {validationChecklist.hasBlocked
                                                ? '⛔ BLOQUEADO (NO APTO)'
                                                : validationChecklist.warningCount > 0
                                                ? '⚠️ APTO CON ADVERTENCIAS'
                                                : '✓ 100% APTO PARA CORTE'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.checklistGrid}>
                                    {validationChecklist.items.map((item) => (
                                        <View key={item.id} style={styles.checklistItemRow}>
                                            <View
                                                style={[
                                                    styles.itemStatusPill,
                                                    item.status === 'PASS'
                                                        ? styles.pillPass
                                                        : item.status === 'WARNING'
                                                        ? styles.pillWarning
                                                        : styles.pillBlocked,
                                                ]}
                                            >
                                                <Text style={styles.itemStatusPillText}>{item.status}</Text>
                                            </View>
                                            <View style={styles.itemContentCol}>
                                                <Text style={styles.itemLabelText}>{item.label}</Text>
                                                <Text style={styles.itemDescText}>{item.desc}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* SECCIÓN 10: PATRÓN APROBADO O ACCIONES DE CICLO DE VIDA */}
                            {patternStatus === 'approved_by_designer' ? (
                                <View style={styles.approvedBannerCard}>
                                    <View style={styles.approvedBannerTop}>
                                        <Text style={styles.approvedBannerCheck}>✓</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.approvedBannerTitle}>✓ PATRÓN APROBADO</Text>
                                            <Text style={styles.approvedBannerSub}>
                                                Patrón validado y formalmente bloqueado como versión histórica inmutable.
                                            </Text>
                                        </View>
                                        <View style={styles.readOnlyBadge}>
                                            <Text style={styles.readOnlyBadgeText}>SOLO LECTURA</Text>
                                        </View>
                                    </View>
                                    <View style={styles.approvedDetailsGrid}>
                                        <Text style={styles.approvedDetailText}>
                                            • Clienta: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No seleccionada')}
                                        </Text>
                                        <Text style={styles.approvedDetailText}>
                                            • Creación: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                        </Text>
                                        <Text style={styles.approvedDetailText}>
                                            • Destino: {activeWorkflow === 'free_pattern' ? 'Banco Global de Patrones' : 'Expediente Bespoke'}
                                        </Text>
                                        <Text style={styles.approvedDetailText}>• Prenda: {garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No asignada'}</Text>
                                        <Text style={styles.approvedDetailText}>• Plantilla: {selectedTemplate?.name || 'Base'}</Text>
                                        <Text style={styles.approvedDetailText}>• Versión de plantilla: {selectedTemplate?.version || '1.0.0'}</Text>
                                        <Text style={styles.approvedDetailText}>• Fecha: {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
                                        <Text style={styles.approvedDetailText}>• Diseñadora: Katherine Carroll</Text>
                                        <Text style={styles.approvedDetailText}>• Versión de ejecución: {currentExecution?.version_label || 'v1.0'}</Text>
                                        <Text style={styles.approvedDetailText}>• Cantidad de piezas: {geometryResult.pieces.length} piezas técnicas</Text>
                                    </View>
                                    {role !== 'client' && (
                                        <View style={{ marginTop: 14 }}>
                                            <TouchableOpacity
                                                style={[styles.exportActionBtn, styles.exportActionBtnHighlight]}
                                                onPress={() => setIsAdjustmentsModalOpen(true)}
                                            >
                                                <Text style={styles.exportActionTextHighlight}>
                                                    ✂ Registrar Nuevo Ajuste (Genera Nueva Versión Derivada)
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                /* ACCIONES FUNCIONALES DE PRUEBA Y APROBACIÓN */
                                role !== 'client' ? (
                                    <View style={styles.lifecycleActionRow}>
                                        {patternStatus === 'generated' && (
                                            <TouchableOpacity
                                                style={styles.fittingButton}
                                                onPress={handleSendToFitting}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.fittingButtonText}>
                                                    Enviar a Prueba de Vestuario (Fitting)
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {(patternStatus === 'pending_fitting' || patternStatus === 'needs_revision') && (
                                            <TouchableOpacity
                                                style={styles.adjustFromHeaderBtn}
                                                onPress={() => setIsAdjustmentsModalOpen(true)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.adjustFromHeaderBtnText}>
                                                    ✂ Registrar Ajuste de Fitting
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={styles.returnButton}
                                            onPress={() => setIsReturnModalOpen(true)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.returnButtonText}>
                                                ↩ Devolver a Ajuste
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.approveButton,
                                                validationChecklist.hasBlocked && styles.approveButtonDisabled,
                                            ]}
                                            onPress={handleApprovePattern}
                                            disabled={validationChecklist.hasBlocked}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.approveButtonText}>
                                                ✓ Aprobar Patrón
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.clientReadOnlyNotice}>
                                        <Text style={styles.clientReadOnlyNoticeText}>
                                            🔒 Vista exclusiva de clienta: los ajustes técnicos y la aprobación de corte son facultad reservada de Katherine Carroll.
                                        </Text>
                                    </View>
                                )
                            )}
                        </View>
                        </View>
                    )}
                    {renderBankClosureSection()}
                </View>
            )}

            {/* PESTAÑA 5: BITÁCORA Y LINAJE HISTÓRICO */}
            {isStudioTabShown('history') && (
                <View style={styles.tabContentArea}>
                    {/* Árbol Genealógico Inmutable de la Creación (Flujo C) */}
                    {activeWorkflow === 'creation_pattern' && (
                        <View style={{ marginBottom: 16 }}>
                            <CreationTimeline
                                nodes={creationTimelineNodes}
                                onSelectNode={(n: CreationTimelineNode) => {
                                    if (n.executionId) {
                                        const found = executionHistory.find((e) => e.id === n.executionId);
                                        if (found) handleSelectExecution(found);
                                    }
                                }}
                            />
                        </View>
                    )}
                    {executionHistory.length === 0 ? (
                        <View style={styles.emptyMesaCard}>
                            <Text style={styles.emptyMesaIcon}>📜</Text>
                            <Text style={styles.emptyMesaTitle}>Bitácora de Linaje Vacía</Text>
                            <Text style={styles.emptyMesaDesc}>
                                {activeWorkflow === 'free_pattern'
                                    ? 'Aún no se han generado versiones para este patrón libre. Cada vez que traces o ajustes una pieza en base a medidas de referencia, se registrará aquí su linaje inmutable hacia el Banco Global.'
                                    : 'Aún no se han generado versiones de patrón para esta clienta. Cada vez que traces o ajustes una pieza, se registrará aquí su linaje inmutable con fecha, medidas y estado.'}
                            </Text>
                            <TouchableOpacity
                                style={styles.goToCadBtn}
                                onPress={() => setActiveStudioTab('cad')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.goToCadBtnText}>📐 Ir a Mesa CAD para Trazar Primer Patrón</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {/* PASO 12 — HISTORIAL DE EJECUCIONES INMUTABLES */}
                        {executionHistory.length > 0 && (
                            <View style={styles.historySectionCard}>
                                <View style={styles.historySectionHeader}>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Text style={styles.stepBadge}>BITÁCORA</Text>
                                            <Text style={styles.historySectionSuper}>LINAJE DE ALTA COSTURA</Text>
                                        </View>
                                        <Text style={styles.historySectionTitle}>
                                            BITÁCORA Y LINAJE HISTÓRICO DE TALLER
                                        </Text>
                                        <Text style={styles.historySectionSubtitle}>
                                            Protección de corte y evolución de versiones. Cada molde, prueba y ajuste en tela queda registrado de forma permanente e inalterable.
                                        </Text>
                                    </View>
                                    <View style={styles.historyCountBadge}>
                                        <Text style={styles.historyCountBadgeText}>
                                            {executionHistory.length} ejecución(es)
                                        </Text>
                                    </View>
                                </View>

                                {/* ÁRBOL DE FAMILIA Y LINAJE HISTÓRICO (C13: Historial y Linaje) */}
                                <View style={styles.atelierGuideCard}>
                                    <View style={styles.atelierGuideItem}>
                                        <Text style={styles.atelierGuideIcon}>🛡️</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.atelierGuideTitle}>Seguridad de Corte Total</Text>
                                            <Text style={styles.atelierGuideDesc}>
                                                {activeWorkflow === 'free_pattern'
                                                    ? 'Ningún patrón se sobreescribe jamás. Si se requiere probar distintas holguras o regresar al prototipo original, la versión base siempre está protegida.'
                                                    : 'Ningún patrón se sobreescribe jamás. Si una clienta cambia de silueta o necesitas regresar al molde original, la versión base siempre está protegida.'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.atelierGuideItem}>
                                        <Text style={styles.atelierGuideIcon}>🌿</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.atelierGuideTitle}>Linaje de Versiones</Text>
                                            <Text style={styles.atelierGuideDesc}>
                                                Al registrar un ajuste de fitting en tela (ej. entalle en cintura o sisa), el motor genera una versión derivada hija conectada a su molde base.
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.atelierGuideItem}>
                                        <Text style={styles.atelierGuideIcon}>⚖️</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.atelierGuideTitle}>Comparación Milimétrica</Text>
                                            <Text style={styles.atelierGuideDesc}>
                                                Usa el botón "Comparar" en cualquier versión derivada para ver en pantalla las diferencias exactas de cada pieza en milímetros.
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.lineageTreeCard}>
                                    <Text style={styles.lineageTreeTitle}>
                                        {activeWorkflow === 'free_pattern'
                                            ? `ÁRBOL DE FAMILIA Y LINAJE TÉCNICO · BANCO GLOBAL (${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name.toUpperCase() : 'PRENDA'}):`
                                            : `ÁRBOL DE FAMILIA Y LINAJE TÉCNICO (${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name.toUpperCase() : 'PRENDA'}):`}
                                    </Text>
                                    <Text style={styles.lineageTreeRoot}>
                                        {activeWorkflow === 'free_pattern'
                                            ? `Patrón Técnico Libre — Perfil: ${freePatternProfileLabel} · Clienta: No asociada · Creación: No asociada · Destino: Banco Global`
                                            : `Patrón ${garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'Técnico'} — Clienta: ${selectedClient?.full_name || 'Sin clienta'}`}
                                    </Text>
                                    {executionHistory
                                        .slice()
                                        .reverse()
                                        .map((item, treeIdx) => {
                                            const branchPrefix = treeIdx === 0 ? '  └── ' : '       '.repeat(treeIdx) + '└── ';
                                            const statusTag = item.status === 'approved_by_designer'
                                                ? '✓ [APROBADO PARA CORTE]'
                                                : item.status === 'pending_fitting'
                                                ? '✂ [EN PRUEBA / FITTING]'
                                                : '⚡ [GENERADO]';
                                            return (
                                                <View key={item.id} style={styles.treeNodeRow}>
                                                    <Text style={styles.treeBranchText}>
                                                        {branchPrefix}Ejecución {item.version_label} ({statusTag}) — {item.notes || 'Revisión paramétrica'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                </View>

                                {/* CABECERA ESTRUCTURADA C13: FECHA | CLIENTE | PRENDA | PLANTILLA | VERSIÓN | ESTADO | DISEÑADORA */}
                                <View style={styles.historyTableHeaderRow}>
                                    <Text style={[styles.historyTableHeaderText, { flex: 1.5 }]}>FECHA</Text>
                                    <Text style={[styles.historyTableHeaderText, { flex: 1.4 }]}>
                                        {activeWorkflow === 'free_pattern' ? 'DESTINO / REF' : 'CLIENTE'}
                                    </Text>
                                    <Text style={[styles.historyTableHeaderText, { flex: 1.1 }]}>PRENDA</Text>
                                    <Text style={[styles.historyTableHeaderText, { flex: 1.5 }]}>PLANTILLA</Text>
                                    <Text style={[styles.historyTableHeaderText, { flex: 0.9 }]}>VERSIÓN</Text>
                                    <Text style={[styles.historyTableHeaderText, { flex: 1.1 }]}>ESTADO</Text>
                                    <Text style={[styles.historyTableHeaderText, { flex: 1.5 }]}>DISEÑADORA</Text>
                                </View>

                                {executionHistory.map((exec, idx) => {
                                    const isCurrent = currentExecution?.id === exec.id;
                                    const isApproved = exec.status === 'approved_by_designer';
                                    const versionIndex = executionHistory.length - idx;
                                    const motivo = exec.notes
                                        ? exec.notes
                                        : !exec.parent_execution_id
                                        ? 'Generación inicial paramétrica'
                                        : 'Ajuste de prueba de vestuario';
                                    const matchingTpl = templates.find((t) => t.id === exec.template_id);
                                    const tplName = matchingTpl?.name || (selectedTemplate && selectedTemplate.id === exec.template_id ? selectedTemplate.name : 'Plantilla Base');
                                    const tplVersion = matchingTpl?.version || (selectedTemplate && selectedTemplate.id === exec.template_id ? selectedTemplate.version : '1.0.0');

                                    return (
                                        <View
                                            key={exec.id || idx}
                                            style={[
                                                styles.historyRowCard,
                                                isCurrent && styles.historyRowCardActive,
                                                isApproved && styles.historyRowCardApproved,
                                            ]}
                                        >
                                            <View style={styles.historyRowMain}>
                                                <View style={styles.historyRowTop}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <Text style={styles.historyRowVersion}>
                                                            VERSIÓN {versionIndex}: {exec.version_label}
                                                        </Text>
                                                        <View style={!exec.parent_execution_id ? styles.historyOriginalBadge : styles.historyDerivedBadge}>
                                                            <Text style={!exec.parent_execution_id ? styles.historyOriginalBadgeText : styles.historyDerivedBadgeText}>
                                                                {!exec.parent_execution_id ? 'EJECUCIÓN ORIGINAL' : 'EJECUCIÓN DERIVADA'}
                                                            </Text>
                                                        </View>
                                                        {isApproved && (
                                                            <View style={styles.historyApprovedTag}>
                                                                <Text style={styles.historyApprovedTagText}>
                                                                    ✓ VERSIÓN ACTUALMENTE APROBADA
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View
                                                        style={[
                                                            styles.historyStatusPill,
                                                            isApproved
                                                                ? styles.statusBadgeApproved
                                                                : exec.status === 'pending_fitting'
                                                                ? styles.statusBadgeFitting
                                                                : styles.statusBadgePending,
                                                        ]}
                                                    >
                                                        <Text style={styles.historyStatusPillText}>
                                                            {isApproved
                                                                ? 'APROBADO'
                                                                : exec.status === 'pending_fitting'
                                                                ? 'FITTING'
                                                                : 'GENERADO'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Motivo descriptivo de la versión */}
                                                <View style={styles.historyMotivoRow}>
                                                    <Text style={styles.historyMotivoLabel}>Motivo:</Text>
                                                    <Text style={styles.historyMotivoText}>{motivo}</Text>
                                                </View>

                                                {/* Información de linaje y derivación (Sección 12) */}
                                                {exec.parent_execution_id && (
                                                    <View style={styles.historyDerivedBanner}>
                                                        <Text style={styles.historyDerivedBannerText}>
                                                            ↳ Derivada de ejecución: {exec.parent_execution_id.slice(0, 8)}... {exec.notes ? `· Ajustes: ${exec.notes}` : ''}
                                                        </Text>
                                                    </View>
                                                )}

                                                <View style={styles.historyRowMetaGrid}>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Fecha: {exec.created_at ? new Date(exec.created_at).toLocaleString() : 'N/A'}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Usuario: Katherine Carroll (Alta Costura)
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Clienta: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedClient?.full_name || 'No asociada')}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Creación: {activeWorkflow === 'free_pattern' ? 'No asociada' : (selectedCreation?.name || 'No asociada')}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Destino: {activeWorkflow === 'free_pattern' ? 'Banco Global' : 'Creación Bespoke'}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Plantilla: {tplName}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Versión plantilla: v{tplVersion}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Estado: {exec.status.toUpperCase()}
                                                    </Text>
                                                    <Text style={styles.historyRowMetaItem}>
                                                        Linaje: {exec.parent_execution_id ? `Hija de ${exec.parent_execution_id.slice(0, 8)}...` : 'Base inicial'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.historyRowActions}>
                                                {!isCurrent && (
                                                    <TouchableOpacity
                                                        style={styles.historyLoadBtn}
                                                        onPress={() => handleSelectExecution(exec)}
                                                    >
                                                        <Text style={styles.historyLoadBtnText}>Cargar Vista</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {exec.parent_execution_id && (
                                                    <TouchableOpacity
                                                        style={styles.historyCompareBtn}
                                                        onPress={() => handleOpenComparison(exec)}
                                                    >
                                                        <Text style={styles.historyCompareBtnText}>⚖ Comparar</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        </View>
                    )}
                    {renderBankClosureSection()}
                </View>
            )}
                </View>
            </View>
            )}
        </ScrollView>

        {/* MODAL AUXILIAR: Patrones derivados de una sesión (Flujo A) */}
        <Modal
            visible={Boolean(viewingDerivedSessionId)}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setViewingDerivedSessionId(null)}
        >
            <View style={styles.derivedPatternsOverlay}>
                <View style={styles.derivedPatternsCard}>
                    <View style={styles.derivedPatternsHeader}>
                        <View>
                            <Text style={styles.derivedPatternsSuper}>TRAZABILIDAD Y DERIVACIONES DE SESIÓN</Text>
                            <Text style={styles.derivedPatternsTitle}>
                                Patrones Derivados · {selectedSession ? `Sesión v${selectedSession.version_number}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setViewingDerivedSessionId(null)}
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 420, paddingVertical: 12 }}>
                        {executionHistory.filter((e) => e.session_id === viewingDerivedSessionId).length === 0 ? (
                            <View style={styles.emptyDerivedState}>
                                <Text style={styles.emptyDerivedIcon}>📐</Text>
                                <Text style={styles.emptyDerivedTitle}>
                                    Esta sesión de medidas aún no tiene patrones derivados.
                                </Text>
                                <Text style={styles.emptyDerivedDesc}>
                                    Puedes generar un patrón directo para la clienta o vincularlo a un proyecto de Creación utilizando estas medidas anatómicas.
                                </Text>

                                <View style={styles.emptyDerivedActions}>
                                    <TouchableOpacity
                                        style={styles.emptyDerivedPrimaryBtn}
                                        onPress={() => {
                                            setViewingDerivedSessionId(null);
                                            setSelectedCreation(null);
                                            setActiveWorkflow('direct_pattern');
                                        }}
                                    >
                                        <Text style={styles.emptyDerivedPrimaryBtnText}>
                                            ✂️ Crear Patrón Directo con esta Sesión
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.emptyDerivedSecondaryBtn}
                                        onPress={() => {
                                            setViewingDerivedSessionId(null);
                                            creationContextConfirmedRef.current = false;
                                            setSelectedCreation(null);
                                            setActiveCreationStage('creation');
                                            setActiveWorkflow('creation_pattern');
                                        }}
                                    >
                                        <Text style={styles.emptyDerivedSecondaryBtnText}>
                                            👗 Crear Patrón para una Creación
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            executionHistory
                                .filter((e) => e.session_id === viewingDerivedSessionId)
                                .map((exec) => {
                                    const isApproved = exec.status === 'approved_by_designer';
                                    return (
                                        <View key={exec.id} style={styles.derivedExecItem}>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.derivedExecGarment}>
                                                        {GARMENT_PACKAGES[exec.garment_type]?.name?.toUpperCase() || exec.garment_type.toUpperCase()}
                                                    </Text>
                                                    <Text style={styles.derivedExecVersion}>{exec.version_label}</Text>
                                                    <View
                                                        style={[
                                                            styles.statusPillSmall,
                                                            isApproved ? styles.statusApprovedSmall : styles.statusFittingSmall,
                                                        ]}
                                                    >
                                                        <Text style={styles.statusPillSmallText}>
                                                            {isApproved ? 'Aprobado' : exec.status.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.derivedExecMeta}>
                                                    Fecha: {new Date(exec.created_at).toLocaleDateString()} · Piezas: {exec.geometry_result?.pieces?.length || 0}
                                                    {exec.creation ? ` · Creación: ${exec.creation.name}` : ' · Patronaje directo'}
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.derivedOpenCadBtn}
                                                onPress={() => {
                                                    setViewingDerivedSessionId(null);
                                                    handleSelectExecution(exec);
                                                    creationContextConfirmedRef.current = !!exec.creation_id;
                                                    setActiveWorkflow(exec.creation_id ? 'creation_pattern' : 'direct_pattern');
                                                    setActiveStudioTab('cad');
                                                }}
                                            >
                                                <Text style={styles.derivedOpenCadBtnText}>Abrir en CAD →</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>

{/* MODAL 1: Toma de medidas y rectificaciones históricas */}
            <MeasurementSessionModal
                visible={isMeasurementModalOpen}
                client={selectedClient}
                initialValuesMm={activeMeasurementsMm}
                previousSession={modalPreviousSession}
                onClose={() => {
                    setIsMeasurementModalOpen(false);
                    setModalPreviousSession(null);
                }}
                onSessionCreated={async (newSession) => {
                    setSelectedSession({ ...newSession });
                    setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
                    setModalPreviousSession(null);

                    // Si estamos trabajando en una creación específica, vincular la sesión formalmente
                    if (initialCreationId) {
                        try {
                            await supabase
                                .from('creations')
                                .update({ session_id: newSession.id })
                                .eq('id', initialCreationId);
                        } catch (linkErr) {
                            console.warn('[PatternModule] Error asociando sesión a la creación:', linkErr);
                        }
                    }

                    if (selectedClient?.id) {
                        await loadClientSessions(selectedClient.id, newSession.id);
                    }
                    setStatusMessage({
                        text:
                            newSession.status === 'draft'
                                ? `Borrador de medidas guardado (v${newSession.version_number}). Puede seguir editándolo.`
                                : `Sesión de medidas v${newSession.version_number} protegida de forma inmutable.`,
                        type: 'success',
                    });
                }}
            />

            {/* MODAL 2: Ajustes de prueba de confección (Componente 12 - M02.12) */}
            <PatternAdjustmentsModal
                visible={isAdjustmentsModalOpen}
                execution={currentExecution}
                onClose={() => setIsAdjustmentsModalOpen(false)}
                onAdjustmentRecorded={(childExecution, adjustment, message) => {
                    if (adjustment) {
                        setAdjustmentsHistory((prev) => [adjustment, ...prev]);
                    }
                    if (childExecution) {
                        setExecutionHistory((prev) => [childExecution, ...prev.filter((e) => e.id !== childExecution.id)]);
                        handleSelectExecution(childExecution);
                        if (activeWorkflow === 'creation_pattern' && selectedCreation) {
                            setSelectedCreation((prev) =>
                                prev ? { ...prev, active_pattern_execution_id: childExecution.id } : null
                            );
                            setClientCreations((prev) =>
                                prev.map((c) =>
                                    c.id === selectedCreation.id
                                        ? { ...c, active_pattern_execution_id: childExecution.id }
                                        : c
                                )
                            );
                            updateCreation(selectedCreation.id, {
                                active_pattern_execution_id: childExecution.id,
                            }).catch((err) => console.warn('[PatternModule] Error updating creation active execution:', err));
                        }
                        setStatusMessage({
                            text: message || `Ajuste aplicado con éxito. Se generó la nueva revisión ${childExecution.version_label} (parent_execution_id vinculado).`,
                            type: 'success',
                        });
                    } else if (message) {
                        setStatusMessage({
                            text: message,
                            type: 'info',
                        });
                    }
                }}
            />

            {/* MODAL 3: Copiloto de IA opcional y seguro */}
            <AICopilotModal
                visible={isCopilotModalOpen}
                garmentType={garmentType}
                currentParams={designParams}
                engineWarnings={validationResult?.warnings || []}
                onClose={() => setIsCopilotModalOpen(false)}
                onApplyParameters={(suggested) => {
                    setDesignParams({ ...designParams, ...suggested });
                    setStatusMessage({
                        text: 'Parámetros del Copiloto aprobados y aplicados. Regenere el patrón.',
                        type: 'info',
                    });
                }}
            />

            {/* MODAL 4: Paquete de Producción y Ficha Técnica (Componente 13 - M02.13) */}
            <ProductionDossierModal
                visible={isProductionModalOpen}
                execution={currentExecution}
                client={selectedClient}
                session={selectedSession}
                template={selectedTemplate}
                executionHistory={executionHistory}
                adjustmentsHistory={adjustmentsHistory}
                onClose={() => setIsProductionModalOpen(false)}
                onStatusMessage={(msg) => setStatusMessage(msg)}
            />

            {/* MODAL 5: Confirmación de Aprobación Formal con Bloqueo Histórico Inmutable */}
            <Modal visible={isApprovalConfirmOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · APROBACIÓN TÉCNICA</Text>
                                <Text style={styles.confirmModalTitle}>Aprobación Oficial del Patrón</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsApprovalConfirmOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.confirmModalBody}>
                            <View style={styles.confirmWarningBox}>
                                <Text style={styles.confirmWarningTitle}>⚠️ AVISO DE INMUTABILIDAD HISTÓRICA:</Text>
                                <Text style={styles.confirmWarningText}>
                                    Una vez aprobado, este patrón quedará bloqueado como versión histórica.
                                </Text>
                            </View>

                            <Text style={styles.confirmDetailIntro}>
                                Está a punto de aprobar el patrón definitivo para corte con las siguientes especificaciones verificadas:
                            </Text>

                            <View style={styles.confirmDetailGrid}>
                                <Text style={styles.confirmDetailItem}>• 1. CLIENTA: {selectedClient?.full_name}</Text>
                                <Text style={styles.confirmDetailItem}>• 2. SESIÓN DE MEDIDAS: {selectedSession ? `v${selectedSession.version_number} (${selectedSession.session_date})` : 'Sesión activa'}</Text>
                                <Text style={styles.confirmDetailItem}>• 3. PRENDA: {garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].name : 'No seleccionada'}</Text>
                                <Text style={styles.confirmDetailItem}>• 4. PLANTILLA: {selectedTemplate?.name || 'Base'} (v{selectedTemplate?.version || '1.0.0'})</Text>
                                <Text style={styles.confirmDetailItem}>• 5. VERSIÓN DE EJECUCIÓN: {currentExecution?.version_label || 'v1.0'}</Text>
                                <Text style={styles.confirmDetailItem}>• 6. MÉTODO: {selectedTemplate?.method_reference || (garmentType && GARMENT_PACKAGES[garmentType] ? GARMENT_PACKAGES[garmentType].methodReference : 'Base')}</Text>
                                <Text style={styles.confirmDetailItem}>• 7. HOLGURA: {selectedEaseProfile.name} ({selectedEaseProfile.code})</Text>
                                <Text style={styles.confirmDetailItem}>• 8. AJUSTES: {adjustmentsHistory.length > 0 ? `${adjustmentsHistory.length} ajuste(s) registrado(s)` : 'Ninguno (conforme sin alteración)'}</Text>
                                <Text style={styles.confirmDetailItem}>• 9. PIEZAS GEOMÉTRICAS: {geometryResult?.pieces.length} piezas listas para corte</Text>
                                <Text style={styles.confirmDetailItem}>• 10. VALIDACIÓN: Conforme (0 errores, medidas completas)</Text>
                                <Text style={styles.confirmDetailItem}>• 11. FECHA: {currentExecution?.created_at ? new Date(currentExecution.created_at).toLocaleString() : new Date().toLocaleString()}</Text>
                                <Text style={styles.confirmDetailItem}>• 12. DISEÑADORA RESPONSABLE: Katherine Carroll</Text>
                            </View>
                        </View>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsApprovalConfirmOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmApproveBtn}
                                onPress={handleApprovePatternConfirm}
                            >
                                <Text style={styles.confirmApproveText}>✓ Confirmar y Bloquear Patrón Aprobado</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 6: Comparación Técnica Antes / Después (C13: Comparación de Revisiones) */}
            <Modal visible={isComparisonModalOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · COMPARACIÓN TÉCNICA (C13)</Text>
                                <Text style={styles.confirmModalTitle}>
                                    Revisión {comparisonResult?.parentVersionLabel} → {comparisonResult?.childVersionLabel}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsComparisonModalOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            <View style={styles.infoBanner}>
                                <Text style={styles.infoBannerText}>
                                    {comparisonResult?.summary}
                                </Text>
                            </View>

                            <View style={styles.confirmDetailGrid}>
                                <Text style={styles.confirmDetailItem}>• Diseñadora responsable: {comparisonResult?.designer}</Text>
                                <Text style={styles.confirmDetailItem}>• Prenda: {comparisonResult?.garmentType ? GARMENT_PACKAGES[comparisonResult.garmentType].name : ''}</Text>
                                <Text style={styles.confirmDetailItem}>• Fecha y hora: {comparisonResult?.date ? new Date(comparisonResult.date).toLocaleString() : ''}</Text>
                                <Text style={styles.confirmDetailItem}>• Ejecución Padre (Original): {comparisonResult?.parentExecutionId}</Text>
                                <Text style={styles.confirmDetailItem}>• Ejecución Derivada (Ajustada): {comparisonResult?.childExecutionId}</Text>
                            </View>

                            {/* Desglose de piezas geométricas antes / después */}
                            <Text style={styles.sectionLabel}>ANÁLISIS DE PIEZAS AFECTADAS Y DIMENSIONES (MM):</Text>
                            {comparisonResult?.piecesComparison.map((p) => (
                                <View key={p.pieceId} style={[styles.pieceComparisonRow, p.isAffected && styles.pieceComparisonRowAffected]}>
                                    <View style={styles.pieceComparisonHeader}>
                                        <Text style={styles.pieceComparisonName}>{p.pieceName}</Text>
                                        <View style={[styles.pieceStatusPill, p.isAffected ? styles.statusPillAffected : styles.statusPillUnchanged]}>
                                            <Text style={styles.pieceStatusPillText}>{p.isAffected ? 'ALTERADA' : 'SIN CAMBIO'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.pieceComparisonDimGrid}>
                                        <Text style={styles.pieceDimText}>Anterior: {p.widthBeforeMm} × {p.heightBeforeMm} mm</Text>
                                        <Text style={styles.pieceDimText}>Nueva: {p.widthAfterMm} × {p.heightAfterMm} mm</Text>
                                        <Text style={[styles.pieceDeltaText, p.isAffected ? styles.deltaPositive : styles.deltaMuted]}>
                                            Δ Ancho: {p.deltaWidthMm > 0 ? `+${p.deltaWidthMm}` : p.deltaWidthMm} mm | Δ Alto: {p.deltaHeightMm > 0 ? `+${p.deltaHeightMm}` : p.deltaHeightMm} mm
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            {/* Diferencias paramétricas de holgura */}
                            {comparisonResult && Object.keys(comparisonResult.easeDeltas).length > 0 && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={styles.sectionLabel}>VARIACIÓN DE HOLGURAS (DESAHOGOS ANATÓMICOS):</Text>
                                    {Object.entries(comparisonResult.easeDeltas).map(([k, d]) => (
                                        <Text key={k} style={styles.confirmDetailItem}>
                                            • Holgura {k}: {d.before} mm → {d.after} mm (Δ {d.delta > 0 ? `+${d.delta}` : d.delta} mm)
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsComparisonModalOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cerrar Comparación</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 7: Devolución a Revisión / Rechazo Técnico (C13.10) */}
            <Modal visible={isReturnModalOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · CONTROL DE CALIDAD</Text>
                                <Text style={styles.confirmModalTitle}>Devolver Patrón a Ajuste / Revisión</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsReturnModalOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            <View style={styles.infoBanner}>
                                <Text style={styles.infoBannerText}>
                                    Registre formalmente el motivo morfológico o técnico por el cual este patrón requiere ajustes antes de continuar su ciclo hacia la aprobación.
                                </Text>
                            </View>

                            <Text style={styles.sectionLabel}>MOTIVO DE LA DEVOLUCIÓN:</Text>
                            <View style={{ gap: 6, marginVertical: 6 }}>
                                {[
                                    'Corrección morfológica observada en prueba de vestuario',
                                    'Desahogo o holgura insuficiente para movimiento',
                                    'Ajuste en largo / proporciones visuales de silueta',
                                    'Corrección de caída o aplomo en hombro / sisa',
                                    'Modificación estética solicitada por Katherine Carroll',
                                ].map((reason) => (
                                    <TouchableOpacity
                                        key={reason}
                                        style={[
                                            styles.reasonOptionBtn,
                                            returnReason === reason && styles.reasonOptionBtnActive,
                                        ]}
                                        onPress={() => setReturnReason(reason)}
                                    >
                                        <Text
                                            style={[
                                                styles.reasonOptionText,
                                                returnReason === reason && styles.reasonOptionTextActive,
                                            ]}
                                        >
                                            {returnReason === reason ? '● ' : '○ '} {reason}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.sectionLabel}>OBSERVACIÓN TÉCNICA DETALLADA:</Text>
                            <TextInput
                                style={styles.returnTextInput}
                                multiline
                                numberOfLines={3}
                                placeholder="Describa el comportamiento observado: ej. La pinza de busto requiere 15 mm adicionales..."
                                placeholderTextColor={colors.textMuted}
                                value={returnObservation}
                                onChangeText={setReturnObservation}
                            />

                            <Text style={styles.returnSignText}>
                                Diseñadora Responsable: Katherine Carroll (Alta Costura) · Fecha: {new Date().toLocaleString()}
                            </Text>
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsReturnModalOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmApproveBtn, { backgroundColor: '#8B0000' }]}
                                onPress={handleConfirmReturnToReview}
                            >
                                <Text style={styles.confirmApproveText}>↩ Confirmar Devolución</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 8: Formulario de Registro de Ajuste Estructurado (Componente 13 — Sección 4, 5, 6) */}
            <Modal visible={isAddAdjustmentModalOpen} animationType="slide" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · PRUEBA DE VESTUARIO Y AJUSTES (C13)</Text>
                                <Text style={styles.confirmModalTitle}>Registrar ajuste de prueba</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsAddAdjustmentModalOpen(false);
                                    setAdjError(null);
                                }}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            {adjError && (
                                <View style={styles.adjErrorBox}>
                                    <Text style={styles.adjErrorText}>⚠️ {adjError}</Text>
                                </View>
                            )}

                            {/* 1. SELECCIÓN DE PIEZA AFECTADA (Sección 4) */}
                            <Text style={styles.sectionLabel}>PIEZA DEL PATRÓN AFECTADA:</Text>
                            <Text style={styles.adjFieldHelp}>
                                Seleccionada exclusivamente de las piezas generadas por el motor paramétrico:
                            </Text>
                            <View style={{ maxHeight: 200, borderWidth: 1, borderColor: '#D8CFC4', borderRadius: 8, padding: 6, marginVertical: 6, backgroundColor: '#FAF8F5' }}>
                                <ScrollView nestedScrollEnabled style={{ maxHeight: 186 }}>
                                    <View style={{ gap: 6 }}>
                                        {currentExecution?.geometry_result?.pieces && currentExecution.geometry_result.pieces.length > 0 ? (
                                            currentExecution.geometry_result.pieces.map((p) => {
                                                const isSelected = selectedPieceIdForAdj === p.id;
                                                const w = Math.round(p.boundingBox?.width || 0);
                                                const h = Math.round(p.boundingBox?.height || 0);
                                                return (
                                                    <TouchableOpacity
                                                        key={p.id}
                                                        style={[styles.adjPieceCard, isSelected && styles.adjPieceCardActive]}
                                                        onPress={() => setSelectedPieceIdForAdj(p.id)}
                                                    >
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text style={[styles.adjPieceCardName, isSelected && styles.adjPieceCardNameActive]}>
                                                                {p.name.toUpperCase()}
                                                            </Text>
                                                            <Text style={[styles.adjPieceCardType, isSelected && styles.adjPieceCardTypeActive]}>
                                                                {p.code.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                            <Text style={styles.adjPieceCardId}>ID: {p.id}</Text>
                                                            <Text style={styles.adjPieceCardDims}>{w} × {h} mm</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : (
                                            <Text style={styles.adjEmptyPieceText}>No hay piezas generadas disponibles.</Text>
                                        )}
                                    </View>
                                </ScrollView>
                            </View>


                            {/* 2. TIPO DE AJUSTE (Sección 2 y 12) */}
                            <Text style={[styles.sectionLabel, { marginTop: 10 }]}>TIPO DE AJUSTE:</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                                {Object.values(FIT_ADJUSTMENT_TYPES).map((opt) => {
                                    const active = adjType === opt.code;
                                    const isPending = opt.geometricApplicationStatus === 'pending_geometric_implementation';
                                    return (
                                        <TouchableOpacity
                                            key={opt.code}
                                            style={[
                                                styles.adjTypeChip,
                                                active && styles.adjTypeChipActive,
                                                isPending && styles.adjTypeChipPending,
                                            ]}
                                            onPress={() => handleSelectAdjType(opt.code)}
                                        >
                                            <Text style={[styles.adjTypeChipText, active && styles.adjTypeChipTextActive]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {FIT_ADJUSTMENT_TYPES[adjType as FitAdjustmentCode]?.geometricApplicationStatus === 'pending_geometric_implementation' && (
                                <View style={styles.adjWarningBox}>
                                    <Text style={styles.adjWarningText}>
                                        ⚠️ Registrado — aplicación geométrica pendiente: Este ajuste técnico se registra en la bitácora pero bloquea la regeneración automática para evitar deformaciones no seguras.
                                    </Text>
                                </View>
                            )}

                            {/* 3. UBICACIÓN TÉCNICA (Sección 5) */}
                            <Text style={[styles.sectionLabel, { marginTop: 10 }]}>UBICACIÓN DEL AJUSTE (OPCIONAL):</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                                {TECHNICAL_LOCATIONS.map((loc) => {
                                    const active = adjLocation === loc.code;
                                    return (
                                        <TouchableOpacity
                                            key={loc.code}
                                            style={[styles.adjLocationChip, active && styles.adjLocationChipActive]}
                                            onPress={() => {
                                                setAdjLocation(loc.code);
                                                setAdjZone(loc.label);
                                            }}
                                        >
                                            <Text style={[styles.adjLocationChipText, active && styles.adjLocationChipTextActive]}>
                                                {loc.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* 4. VALOR DEL AJUSTE Y UNIDAD (Sección 3) */}
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                                <View style={{ flex: 1.2 }}>
                                    <Text style={styles.sectionLabel}>VALOR DEL AJUSTE:</Text>
                                    <TextInput
                                        style={styles.adjFormInput}
                                        value={adjValue}
                                        onChangeText={setAdjValue}
                                        keyboardType="numeric"
                                        placeholder="Ej: 1.5 (o 15 en mm)"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.sectionLabel}>UNIDAD:</Text>
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                        {(['cm', 'mm'] as AdjustmentUnit[]).map((u) => {
                                            const active = adjUnit === u;
                                            return (
                                                <TouchableOpacity
                                                    key={u}
                                                    style={[styles.unitToggleBtn, active && styles.unitToggleBtnActive]}
                                                    onPress={() => setAdjUnit(u)}
                                                >
                                                    <Text style={[styles.unitToggleText, active && styles.unitToggleTextActive]}>
                                                        {u}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>

                            {/* 5. DIRECCIÓN / EFECTO */}
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>DIRECCIÓN / EFECTO:</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                <TouchableOpacity
                                    style={[styles.directionToggleBtn, adjDirection === 'decrease' && styles.directionToggleBtnActive]}
                                    onPress={() => setAdjDirection('decrease')}
                                >
                                    <Text style={[styles.directionToggleText, adjDirection === 'decrease' && styles.directionToggleTextActive]}>
                                        - Reducir / Entallar
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.directionToggleBtn, adjDirection === 'increase' && styles.directionToggleBtnActive]}
                                    onPress={() => setAdjDirection('increase')}
                                >
                                    <Text style={[styles.directionToggleText, adjDirection === 'increase' && styles.directionToggleTextActive]}>
                                        + Aumentar / Desahogar
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* 6. MOTIVO DEL AJUSTE */}
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>MOTIVO DEL AJUSTE:</Text>
                            <TextInput
                                style={styles.adjFormInput}
                                value={adjMotive}
                                onChangeText={setAdjMotive}
                                placeholder="Ej: Reducir cintura, Subir hombro, Aumentar contorno de cadera..."
                                placeholderTextColor={colors.textMuted}
                            />

                            {/* 7. OBSERVACIÓN TÉCNICA */}
                            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>OBSERVACIÓN TÉCNICA DETALLADA:</Text>
                            <TextInput
                                style={[styles.adjFormInput, { height: 60, textAlignVertical: 'top' }]}
                                value={adjObservation}
                                onChangeText={setAdjObservation}
                                placeholder="Observación observada durante la prueba de vestuario sobre la clienta..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => {
                                    setIsAddAdjustmentModalOpen(false);
                                    setAdjError(null);
                                }}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmApproveBtn}
                                onPress={handleAddAdjustment}
                            >
                                <Text style={styles.confirmApproveText}>Agregar ajuste</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 9: Confirmación Antes de Regenerar el Patrón (Sección 10) */}
            <Modal visible={isRegenerateConfirmOpen} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · REGENERACIÓN CONTROLADA (C13)</Text>
                                <Text style={styles.confirmModalTitle}>Confirmar Regeneración con Ajustes</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsRegenerateConfirmOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            {/* Declaración obligatoria de inmutabilidad (Sección 10) */}
                            <View style={styles.regenerationBannerBox}>
                                <Text style={styles.regenerationBannerTitle}>
                                    Se generará una nueva ejecución del patrón. La ejecución actual permanecerá intacta.
                                </Text>
                            </View>

                            <View style={styles.confirmDetailGrid}>
                                <Text style={styles.confirmDetailItem}>
                                    • Ejecución de origen: {currentExecution?.version_label} (ID: {currentExecution?.id})
                                </Text>
                                <Text style={styles.confirmDetailItem}>
                                    • Prenda: {currentExecution ? GARMENT_PACKAGES[currentExecution.garment_type].name : ''}
                                </Text>
                                <Text style={styles.confirmDetailItem}>
                                    • Cantidad de ajustes: {stagedAdjustments.length} ajuste(s) programado(s)
                                </Text>
                                <Text style={styles.confirmDetailItem}>
                                    • Diseñadora responsable: Katherine Carroll
                                </Text>
                            </View>

                            <Text style={styles.sectionLabel}>RESUMEN DE AJUSTES A APLICAR:</Text>
                            <View style={{ gap: 6, marginVertical: 8 }}>
                                {stagedAdjustments.map((adj, idx) => (
                                    <View key={adj.id || idx} style={styles.confirmAdjRow}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={styles.confirmAdjZone}>
                                                [{adj.zone.toUpperCase()}] {adj.direction === 'increase' ? 'Aumentar' : 'Reducir'} {adj.value} {adj.unit}
                                            </Text>
                                            <Text style={styles.confirmAdjType}>
                                                Tipo: {adj.adjustmentType}
                                            </Text>
                                        </View>
                                        <Text style={styles.confirmAdjDesc}>
                                            {adj.observation || adj.motive || 'Sin observación'}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {fittingNotes.trim() ? (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={styles.sectionLabel}>OBSERVACIONES DE FITTING:</Text>
                                    <Text style={styles.confirmDetailItem}>"{fittingNotes.trim()}"</Text>
                                </View>
                            ) : null}
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setIsRegenerateConfirmOpen(false)}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmApproveBtn}
                                onPress={handleExecuteRegenerateWithAdjustments}
                            >
                                <Text style={styles.confirmApproveText}>Crear nueva ejecución</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL 10: Patrones Derivados de una Sesión Anatómica Concreta (Flujo A) */}
            <Modal
                visible={Boolean(viewingDerivedSessionId)}
                animationType="fade"
                transparent
                onRequestClose={() => setViewingDerivedSessionId(null)}
            >
                <View style={styles.overlay}>
                    <View style={styles.confirmModalContainer}>
                        <View style={styles.confirmModalHeader}>
                            <View>
                                <Text style={styles.confirmModalSuper}>MÓDULO 02 · HISTORIAL Y TRAZABILIDAD ANATÓMICA</Text>
                                <Text style={styles.confirmModalTitle}>
                                    Patrones Derivados de esta Sesión
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setViewingDerivedSessionId(null)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.confirmModalBody}>
                            {(() => {
                                const targetSession = sessions.find((s) => s.id === viewingDerivedSessionId);
                                const derived = executionHistory.filter((e) => e.session_id === viewingDerivedSessionId);
                                return (
                                    <>
                                        <View style={styles.infoBanner}>
                                            <Text style={styles.infoBannerText}>
                                                {selectedClient ? `Clienta: ${selectedClient.full_name} · ` : ''}
                                                {targetSession ? `Sesión v${targetSession.version_number} (${formatSessionDate(targetSession.session_date)}) · ${targetSession.status === 'completed' ? 'Finalizada' : targetSession.status === 'verified' ? 'Verificada' : 'Borrador'}` : 'Sesión Anatómica'}
                                            </Text>
                                        </View>

                                        <Text style={styles.sectionLabel}>
                                            PATRONES GENERADOS A PARTIR DE ESTAS MEDIDAS ({derived.length}):
                                        </Text>

                                        {derived.length === 0 ? (
                                            <View style={styles.emptySessionsCard}>
                                                <Text style={styles.emptySessionsText}>
                                                    Aún no se ha generado ningún patrón a partir de esta sesión anatómica.
                                                </Text>
                                                <TouchableOpacity
                                                    style={[styles.createFirstSessionBtn, { marginTop: 10 }]}
                                                    onPress={() => {
                                                        if (targetSession) setSelectedSession(targetSession);
                                                        setViewingDerivedSessionId(null);
                                                        setSelectedCreation(null);
                                                        setActiveWorkflow('direct_pattern');
                                                    }}
                                                >
                                                    <Text style={styles.createFirstSessionBtnText}>
                                                        ✂️ Generar Patrón Directo con esta Sesión
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={{ gap: 8, marginVertical: 6 }}>
                                                {derived.map((exec) => (
                                                    <View key={exec.id} style={styles.workflowSessionCard}>
                                                        <View style={styles.sessionCardTop}>
                                                            <Text style={styles.sessionVersionTag}>
                                                                {GARMENT_PACKAGES[exec.garment_type]?.name?.toUpperCase() || exec.garment_type.toUpperCase()} · {exec.version_label}
                                                            </Text>
                                                            <View style={[styles.sessionStatusPill, exec.status === 'approved_by_designer' ? styles.sessionStatusCompleted : styles.sessionStatusDraft]}>
                                                                <Text style={styles.sessionStatusPillText}>
                                                                    {exec.status === 'approved_by_designer' ? 'APROBADO' : exec.status.toUpperCase()}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.sessionCardDetailsRow}>
                                                            <Text style={[styles.sessionDetailItem, { fontWeight: '700', color: exec.creation_id ? '#996B1F' : '#2B5E35' }]}>
                                                                {exec.creation ? `👗 Creación: ${exec.creation.name}` : '✂️ Patronaje Directo'}
                                                            </Text>
                                                            <Text style={styles.sessionDetailItem}>
                                                                📅 {formatDate(exec.created_at)}
                                                            </Text>
                                                            <Text style={styles.sessionDetailItem}>
                                                                🧩 {exec.geometry_result?.pieces?.length || 0} piezas
                                                            </Text>
                                                        </View>
                                                        <View style={styles.sessionCardActionsRow}>
                                                            <TouchableOpacity
                                                                style={[styles.sessionActionBtn, styles.sessionActionBtnActive]}
                                                                onPress={() => {
                                                                    handleSelectExecution(exec);
                                                                    setViewingDerivedSessionId(null);
                                                                    creationContextConfirmedRef.current = !!exec.creation_id;
                                                                    setActiveWorkflow(exec.creation_id ? 'creation_pattern' : 'direct_pattern');
                                                                    setActiveStudioTab('cad');
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={[styles.sessionActionBtnText, styles.sessionActionBtnTextActive]}>
                                                                    Abrir en Mesa CAD →
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                );
                            })()}
                        </ScrollView>

                        <View style={styles.confirmModalFooter}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => setViewingDerivedSessionId(null)}
                            >
                                <Text style={styles.confirmCancelText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL CANÓNICO: ADVERTENCIA Y CONTROL DE MEDIDAS ESTIMADAS */}
            <Modal
                visible={showEstimatedModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEstimatedModal(false)}
            >
                <View style={styles.estimatedModalOverlay}>
                    <View style={styles.estimatedModalCard}>
                        <View style={styles.estimatedModalHeaderRow}>
                            <Text style={styles.estimatedModalIcon}>⚖️</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.estimatedModalTitle}>
                                    EL PATRÓN INCLUIRÁ MEDIDAS ESTIMADAS
                                </Text>
                                <Text style={styles.estimatedModalSubtitle}>
                                    Medidas no registradas físicamente en la clienta
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.estimatedModalSectionHeader}>
                            Medidas no registradas ({templateMeasurementDiagnostic.estimated.length}):
                        </Text>
                        <ScrollView style={styles.estimatedModalList} nestedScrollEnabled={true}>
                            {templateMeasurementDiagnostic.estimated.map((item) => (
                                <View key={item.code} style={styles.estimatedModalListItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.estimatedItemName}>• {item.name}</Text>
                                        <Text style={styles.estimatedItemCode}>{item.code}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.estimatedItemVal}>
                                            {item.valueMm ? `${(item.valueMm / 10).toFixed(1)} cm` : '—'}
                                        </Text>
                                        <Text style={styles.estimatedItemValSub}>
                                            {item.valueMm ? `${item.valueMm} mm` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <Text style={styles.estimatedModalNotice}>
                            Se propone utilizar las proporciones del perfil anatómico normalizado seleccionado (T40 Haute Couture). La procedencia de estas estimaciones quedará registrada en el linaje y trazabilidad de la ejecución sin alterar las medidas reales de la clienta.
                        </Text>

                        {showEstimatedDetailsReview && (
                            <View style={styles.estimatedReviewDetailsBox}>
                                <Text style={styles.estimatedReviewDetailsTitle}>
                                    AUDITORÍA DE ESTIMACIONES Y TOLERANCIAS:
                                </Text>
                                <Text style={styles.estimatedReviewDetailsText}>
                                    • Perfil de referencia: Alta Costura T40 (Proporciones anatómicas canónicas).{'\n'}
                                    • Impacto: Las piezas calculadas ajustarán según las proporciones arquetípicas.{'\n'}
                                    • Recomendación del Atelier: Se sugiere una prueba intermedia (Toile de prueba) o completar las cotas físicas con la clienta antes de corte en paño definitivo.
                                </Text>
                            </View>
                        )}

                        <View style={styles.estimatedModalActionsRow}>
                            <TouchableOpacity
                                style={styles.estimatedBtnSecondary}
                                onPress={() => {
                                    setShowEstimatedModal(false);
                                    if (selectedSession) {
                                        setModalPreviousSession(selectedSession);
                                        setIsMeasurementModalOpen(true);
                                    }
                                }}
                            >
                                <Text style={styles.estimatedBtnSecondaryText}>
                                    [Completar medidas]
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.estimatedBtnReview}
                                onPress={() => setShowEstimatedDetailsReview((prev) => !prev)}
                            >
                                <Text style={styles.estimatedBtnReviewText}>
                                    {showEstimatedDetailsReview ? '[Ocultar revisión]' : '[Revisar estimaciones]'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.estimatedBtnPrimary}
                                onPress={() => {
                                    setShowEstimatedModal(false);
                                    setAllowEstimatedGeneration(true);
                                    handleGeneratePattern(true);
                                }}
                            >
                                <Text style={styles.estimatedBtnPrimaryText}>
                                    [Continuar con estimaciones]
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODALES EDITORIALES DEL FLUJO C */}
            <ZoomableImageModal target={creationZoomTarget} onClose={() => setCreationZoomTarget(null)} />
            <InfoSheet
                visible={activeInfoKind !== null}
                eyebrow={activeInfoSheetData.eyebrow}
                title={activeInfoSheetData.title}
                rows={activeInfoSheetData.rows}
                footerNote={activeInfoSheetData.footerNote}
                onClose={() => setActiveInfoKind(null)}
            />

            {/* MODAL FLUJO D: COTAS PERSONALIZADAS DE PATRÓN LIBRE */}
            <Modal
                visible={isCustomMeasurementsOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCustomMeasurementsOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.customModalContainer}>
                        <View style={styles.customModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.customModalSuper}>FLUJO D · PATRÓN LIBRE</Text>
                                <Text style={styles.customModalTitle}>Cotas Personalizadas</Text>
                                <Text style={styles.customModalSubtitle}>
                                    Ingrese o rectifique las medidas anatómicas milimétricas de taller.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsCustomMeasurementsOpen(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.customModalBody} showsVerticalScrollIndicator={true}>
                            <View style={styles.customNoticeBox}>
                                <Text style={styles.customNoticeText}>
                                    💡 Ingrese los valores en centímetros (cm). El motor paramétrico los convertirá a milímetros (mm) exactos para el trazado vectorial.
                                </Text>
                            </View>

                            <View style={styles.customInputsGrid}>
                                {[
                                    { code: 'contorno_busto', label: 'Contorno de Busto' },
                                    { code: 'contorno_pecho', label: 'Contorno de Pecho (Masculino)' },
                                    { code: 'contorno_cintura', label: 'Contorno de Cintura' },
                                    { code: 'contorno_cadera', label: 'Contorno de Cadera' },
                                    { code: 'contorno_cuello', label: 'Contorno de Cuello' },
                                    { code: 'ancho_espalda', label: 'Ancho de Espalda' },
                                    { code: 'ancho_pecho', label: 'Ancho de Pecho' },
                                    { code: 'largo_talle_delantero', label: 'Largo Talle Delantero' },
                                    { code: 'largo_talle_espalda', label: 'Largo Talle Espalda' },
                                    { code: 'altura_busto', label: 'Altura de Busto' },
                                    { code: 'separacion_busto', label: 'Separación de Busto' },
                                    { code: 'largo_hombro', label: 'Largo de Hombro' },
                                    { code: 'ancho_hombros', label: 'Ancho de Hombros' },
                                    { code: 'largo_brazo', label: 'Largo de Brazo' },
                                    { code: 'contorno_biceps', label: 'Contorno de Bíceps' },
                                    { code: 'contorno_muneca', label: 'Contorno de Muñeca' },
                                    { code: 'profundidad_sisa', label: 'Profundidad de Sisa' },
                                    { code: 'altura_cadera', label: 'Altura de Cadera' },
                                    { code: 'altura_tiro', label: 'Altura de Tiro' },
                                    { code: 'largo_falda', label: 'Largo de Falda' },
                                    { code: 'largo_pantalon', label: 'Largo de Pantalón' },
                                    { code: 'largo_chaqueta', label: 'Largo de Chaqueta' },
                                    { code: 'largo_abrigo', label: 'Largo de Abrigo' },
                                ].map((item) => {
                                    const currentVal = customMeasurementsDraft[item.code] !== undefined
                                        ? customMeasurementsDraft[item.code]
                                        : freeMeasurements[item.code]
                                        ? (freeMeasurements[item.code] / 10).toFixed(1)
                                        : '';
                                    return (
                                        <View key={item.code} style={styles.customInputCol}>
                                            <Text style={styles.customInputLabel}>{item.label}</Text>
                                            <View style={styles.customInputWrap}>
                                                <TextInput
                                                    style={styles.customInputField}
                                                    keyboardType="numeric"
                                                    value={currentVal}
                                                    onChangeText={(txt) => {
                                                        setCustomMeasurementsDraft((prev) => ({
                                                            ...prev,
                                                            [item.code]: txt,
                                                        }));
                                                    }}
                                                    placeholder="0.0"
                                                    placeholderTextColor="#999"
                                                />
                                                <Text style={styles.customInputSuffix}>cm</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={styles.customModalFooter}>
                            <TouchableOpacity
                                style={styles.customModalCancelBtn}
                                onPress={() => {
                                    setCustomMeasurementsDraft({});
                                    setIsCustomMeasurementsOpen(false);
                                }}
                            >
                                <Text style={styles.customModalCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.customModalApplyBtn}
                                onPress={() => {
                                    const updated: Record<string, number> = { ...freeMeasurements };
                                    for (const [k, v] of Object.entries(customMeasurementsDraft)) {
                                        const parsed = parseFloat(v.replace(',', '.'));
                                        if (!isNaN(parsed) && parsed > 0) {
                                            updated[k] = Math.round(parsed * 10);
                                        }
                                    }
                                    setFreeMeasurements(updated);
                                    setSelectedReferenceProfileCode('custom');
                                    setSelectedReferenceDemographic('custom');
                                    setCustomMeasurementsDraft({});
                                    setIsCustomMeasurementsOpen(false);
                                    if (activeWorkflow === 'free_pattern' && currentExecution && currentExecution.status === 'approved_by_designer') {
                                        setCurrentExecution({ ...currentExecution, status: 'needs_revision' });
                                        setPatternStatus('needs_revision');
                                        setStatusMessage({
                                            text: 'Cotas anatómicas personalizadas modificadas: La aprobación previa ha quedado revocada. El patrón vuelve a estado EN REVISIÓN.',
                                            type: 'info',
                                        });
                                    } else {
                                        setStatusMessage({
                                            text: '✓ Cotas personalizadas aplicadas al maniquí anatómico y mesa CAD.',
                                            type: 'success',
                                        });
                                    }
                                }}
                            >
                                <Text style={styles.customModalApplyBtnText}>
                                    Guardar y Aplicar al Maniquí →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL FLUJO D: ASOCIAR A CLIENTA (OPCIONAL, NO BLOQUEANTE) */}
            <Modal
                visible={isLinkClientModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsLinkClientModalOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.linkModalContainer}>
                        <View style={styles.linkModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.linkModalSuper}>ASOCIACIÓN POSTERIOR OPCIONAL</Text>
                                <Text style={styles.linkModalTitle}>Asociar Patrón a una Clienta</Text>
                                <Text style={styles.linkModalSubtitle}>
                                    Esta acción no altera el patrón original ni su destino en el Banco Global.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsLinkClientModalOpen(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.linkModalSearchInput}
                            placeholder="Buscar clienta por nombre..."
                            placeholderTextColor="#766B62"
                            value={linkSearchQuery}
                            onChangeText={setLinkSearchQuery}
                        />

                        <ScrollView style={{ maxHeight: 320, marginVertical: 8 }}>
                            {clients
                                .filter((c) => !linkSearchQuery.trim() || c.full_name.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                                .map((c) => {
                                    const isSelected = associatedClientId === c.id;
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[styles.linkModalItem, isSelected && styles.linkModalItemActive]}
                                            onPress={() => {
                                                setAssociatedClientId(c.id);
                                                setAssociatedClientName(c.full_name);
                                                setIsLinkClientModalOpen(false);
                                                setStatusMessage({
                                                    text: `✓ Patrón libre asociado a la clienta "${c.full_name}" sin alterar el patrón original.`,
                                                    type: 'success',
                                                });
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.linkAvatarCircle}>
                                                <Text style={styles.linkAvatarText}>
                                                    {c.full_name.slice(0, 2).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.linkItemTitle}>{c.full_name}</Text>
                                                <Text style={styles.linkItemSub}>{c.email || 'Clienta Bespoke'}</Text>
                                            </View>
                                            {isSelected && (
                                                <Text style={styles.linkItemCheck}>✓ Asociada</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>

                        <View style={styles.linkModalFooter}>
                            {associatedClientId && (
                                <TouchableOpacity
                                    style={styles.linkModalClearBtn}
                                    onPress={() => {
                                        setAssociatedClientId(null);
                                        setAssociatedClientName(null);
                                        setIsLinkClientModalOpen(false);
                                        setStatusMessage({
                                            text: 'Vínculo con clienta removido. Patrón conservado como libre.',
                                            type: 'info',
                                        });
                                    }}
                                >
                                    <Text style={styles.linkModalClearBtnText}>Desasociar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.linkModalCloseBtn}
                                onPress={() => setIsLinkClientModalOpen(false)}
                            >
                                <Text style={styles.linkModalCloseBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL FLUJO D: ASOCIAR A CREACIÓN (OPCIONAL, NO BLOQUEANTE) */}
            <Modal
                visible={isLinkCreationModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsLinkCreationModalOpen(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.linkModalContainer}>
                        <View style={styles.linkModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.linkModalSuper}>ASOCIACIÓN POSTERIOR OPCIONAL</Text>
                                <Text style={styles.linkModalTitle}>Asociar Patrón a una Creación</Text>
                                <Text style={styles.linkModalSubtitle}>
                                    Vincula este patrón a una pieza de alta costura conservando el linaje inmutable.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsLinkCreationModalOpen(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.linkModalSearchInput}
                            placeholder="Buscar creación por nombre..."
                            placeholderTextColor="#766B62"
                            value={linkSearchQuery}
                            onChangeText={setLinkSearchQuery}
                        />

                        <ScrollView style={{ maxHeight: 320, marginVertical: 8 }}>
                            {clientCreations
                                .filter((cr) => !linkSearchQuery.trim() || cr.name.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                                .map((cr) => {
                                    const isSelected = associatedCreationId === cr.id;
                                    return (
                                        <TouchableOpacity
                                            key={cr.id}
                                            style={[styles.linkModalItem, isSelected && styles.linkModalItemActive]}
                                            onPress={async () => {
                                                setAssociatedCreationId(cr.id);
                                                setAssociatedCreationName(cr.name);
                                                setIsLinkCreationModalOpen(false);
                                                if (currentExecution) {
                                                    try {
                                                        await linkPatternExecutionToCreation(cr.id, currentExecution.id);
                                                    } catch (err) {
                                                        console.warn('[PatternModule] link to creation error:', err);
                                                    }
                                                }
                                                setStatusMessage({
                                                    text: `✓ Patrón libre asociado a la creación "${cr.name}". Linaje y trazabilidad inmutables preservados.`,
                                                    type: 'success',
                                                });
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontSize: 20 }}>👗</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.linkItemTitle}>{cr.name}</Text>
                                                <Text style={styles.linkItemSub}>
                                                    Estado: {cr.status?.toUpperCase()} · Prenda: {(cr.garment_type && cr.garment_type in GARMENT_PACKAGES ? GARMENT_PACKAGES[cr.garment_type as keyof typeof GARMENT_PACKAGES]?.name : null) || cr.garment_type || 'Alta Costura'}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Text style={styles.linkItemCheck}>✓ Asociada</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            {clientCreations.length === 0 && (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: '#766B62', fontSize: 13, textAlign: 'center' }}>
                                        No se encontraron creaciones activas cargadas en este contexto.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.linkModalFooter}>
                            {associatedCreationId && (
                                <TouchableOpacity
                                    style={styles.linkModalClearBtn}
                                    onPress={() => {
                                        setAssociatedCreationId(null);
                                        setAssociatedCreationName(null);
                                        setIsLinkCreationModalOpen(false);
                                        setStatusMessage({
                                            text: 'Vínculo con creación removido. Patrón conservado como libre.',
                                            type: 'info',
                                        });
                                    }}
                                >
                                    <Text style={styles.linkModalClearBtnText}>Desasociar</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.linkModalCloseBtn}
                                onPress={() => setIsLinkCreationModalOpen(false)}
                            >
                                <Text style={styles.linkModalCloseBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingTop: 36,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EBE5DC',
        flexWrap: 'wrap',
        gap: 14,
    },
    headerBrandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    headerStar: {
        fontSize: 10,
        color: '#A78350',
    },
    backButton: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    backButtonText: {
        color: '#766B62',
        fontSize: 12,
        fontWeight: '600',
    },
    headerTitles: {
        flex: 1,
        minWidth: 260,
    },
    superHeader: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#A78350',
    },
    mainHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#171411',
        fontFamily: typography.serif,
        letterSpacing: 0.5,
    },
    headerSubLead: {
        fontSize: 11,
        color: '#766B62',
        marginTop: 2,
    },
    headerActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bankHeaderBtn: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    bankHeaderBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#171411',
    },
    copilotHeaderBtn: {
        backgroundColor: '#171411',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    copilotHeaderBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F8F2E9',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        maxWidth: 1180,
        width: '100%',
        alignSelf: 'center',
    },
    scrollContentFree: {
        paddingHorizontal: Platform.OS === 'web' ? 28 : 16,
        paddingVertical: 20,
        maxWidth: 1620,
        width: '100%',
        alignSelf: 'center',
    },
    statusBanner: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 16,
        borderWidth: 1,
    },
    statusBannerSuccess: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    statusBannerError: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
    },
    statusBannerInfo: {
        backgroundColor: '#FAF5EE',
        borderColor: colors.border,
    },
    statusBannerText: {
        fontSize: 13,
        color: colors.textPrimary,
        lineHeight: 18,
    },
    // Estilos de la nueva barra de acción rápida y pestañas
    fastActionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 10,
    },
    fastActionLeft: {
        flex: 1,
        minWidth: 220,
    },
    fastActionBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    fastActionPrendaText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2A2723',
    },
    fastActionClientText: {
        fontSize: 11,
        color: '#7D7569',
    },
    fastActionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    fittingButtonCompact: {
        backgroundColor: '#C5A059',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    fittingButtonCompactText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    adjustButtonCompact: {
        backgroundColor: '#2A2927',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    adjustButtonCompactText: {
        color: '#FAF7F2',
        fontSize: 11,
        fontWeight: '700',
    },
    approveButtonCompact: {
        backgroundColor: '#28733E',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    approveButtonCompactText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    // Barra de Pestañas de Taller
    resultsTabBar: {
        flexDirection: 'row',
        backgroundColor: '#F3EFE6',
        borderRadius: 10,
        padding: 4,
        gap: 6,
        marginVertical: 14,
        borderWidth: 1,
        borderColor: '#E6DFC8',
    },
    resultsTabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    resultsTabBtnActive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#C5A059',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(197, 160, 89, 0.16)',
            },
        }),
    },
    resultsTabBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6E6659',
    },
    resultsTabBtnTextActive: {
        fontWeight: '800',
        color: '#7D632F',
    },
    tabContentArea: {
        marginTop: 6,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
    },
    // Estilos compactos para Paso 3 y 4
    compactStepHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    templateActivePill: {
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E7D9B8',
    },
    templateActivePillText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#7D632F',
    },
    compactConfigGrid: {
        gap: 10,
        marginBottom: 12,
    },
    compactConfigCol: {
        gap: 4,
    },
    compactConfigRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        alignItems: 'center',
        marginTop: 2,
    },
    paramsSubLabelInline: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6E6659',
    },
    easeSelectorCompact: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    easeChipCompact: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: '#F7F5EE',
        borderWidth: 1,
        borderColor: '#E4DCBD',
    },
    silChipCompact: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#F5F2EA',
        borderWidth: 1,
        borderColor: '#DDD6C2',
    },
    compactGenerationBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FAF7F0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6DCC5',
        padding: 10,
        gap: 12,
        flexWrap: 'wrap',
    },
    validationStatusBlock: {
        flex: 1,
        minWidth: 240,
    },
    validStatusBadge: {
        backgroundColor: '#EBF6EE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#C3E2CC',
    },
    validStatusText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#28733E',
    },
    invalidStatusBadge: {
        backgroundColor: '#FDEEE9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#F5C7B8',
    },
    invalidStatusText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#C0392B',
    },
    generateButtonCompact: {
        backgroundColor: '#C5A059',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 240,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(197, 160, 89, 0.28)',
            },
        }),
    },
    generateButtonCompactText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    // Toast flotante no invasivo
    floatingToast: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 9999,
        backgroundColor: '#1E1C18',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C5A059',
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...Platform.select({
            web: {
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            },
        }),
    },
    floatingToastSuccess: {
        borderColor: '#4E9A68',
    },
    floatingToastError: {
        borderColor: '#D32F2F',
    },
    floatingToastInfo: {
        borderColor: '#C5A059',
    },
    floatingToastIcon: {
        fontSize: 14,
        color: '#FAF7F2',
    },
    floatingToastText: {
        color: '#FAF7F2',
        fontSize: 12,
        fontWeight: '600',
    },
    floatingToastClose: {
        marginLeft: 8,
        padding: 4,
    },
    floatingToastCloseText: {
        color: '#A8A090',
        fontSize: 12,
        fontWeight: '700',
    },
    // Barra superior de Clienta para Tableta Vertical
    tabletClientTriggerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        padding: 10,
        marginBottom: 12,
    },
    tabletClientTriggerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabletAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#C5A059',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabletAvatarText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    tabletClientNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#24211D',
    },
    tabletClientMeasureText: {
        fontSize: 11,
        color: '#7D7569',
        marginTop: 2,
    },
    tabletMannequinBadge: {
        backgroundColor: '#1E232A',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    tabletMannequinBadgeText: {
        color: '#F4ECE1',
        fontSize: 11,
        fontWeight: '700',
    },
    // Drawer Modal para Tableta Vertical
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
    },
    drawerContentCard: {
        width: Platform.OS === 'web' ? 440 : '92%',
        maxWidth: 460,
        height: '100%',
        backgroundColor: '#FDFBF7',
        padding: 16,
    },
    drawerHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E6DFC8',
    },
    drawerHeaderTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#8C7749',
    },
    drawerCloseBtn: {
        backgroundColor: '#2A2927',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    drawerCloseText: {
        color: '#FAF7F2',
        fontSize: 11,
        fontWeight: '700',
    },
    // Pestañas de Espacio de Trabajo Studio (Grandes y táctiles para tableta)
    studioTabBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 6,
        marginBottom: 16,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 10px rgba(23, 20, 17, 0.04)',
            },
            default: {
                elevation: 1,
            },
        }),
    },
    studioTabBtn: {
        minHeight: 42,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 7,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E8E0D2',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    studioTabBtnActive: {
        backgroundColor: '#171411',
        borderColor: '#A78350',
        borderWidth: 1.5,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(23, 20, 17, 0.22)',
            },
        }),
    },
    studioTabBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#635B50',
        letterSpacing: 0.3,
    },
    studioTabBtnTextActive: {
        color: '#DFC293',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Checklist C13 plegable
    compactChecklistBar: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D8CEB8',
        marginBottom: 14,
        overflow: 'hidden',
    },
    compactChecklistTouchable: {
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FDFBF7',
    },
    checklistPillIcon: {
        backgroundColor: '#EBF6EE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#C3E2CC',
    },
    checklistPillIconText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#28733E',
    },
    checklistPillTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2A2723',
    },
    checklistPillAction: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8C7749',
    },
    checklistDropdownWrap: {
        borderTopWidth: 1,
        borderTopColor: '#E6DFC8',
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    // Desglose de Medidas Corporales Anatómicas
    measurementsBreakdownCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        padding: 16,
        marginTop: 14,
        marginBottom: 8,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(44, 39, 32, 0.05)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    measurementsBreakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE1',
    },
    measurementsBreakdownTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#8C7749',
        letterSpacing: 0.8,
    },
    measurementsBreakdownSubtitle: {
        fontSize: 11,
        color: '#7D7569',
        marginTop: 2,
    },
    measurementsEditBtn: {
        backgroundColor: '#2A2927',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
    },
    measurementsEditBtnText: {
        color: '#FAF7F2',
        fontSize: 11,
        fontWeight: '700',
    },
    measurementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
    },
    measurementChip: {
        flex: 1,
        minWidth: 160,
        backgroundColor: '#FAF8F3',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EBE3D3',
        padding: 10,
    },
    measurementChipLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#342F28',
        flex: 1,
        marginRight: 6,
    },
    measurementChipBadge: {
        fontSize: 9,
        fontWeight: '800',
        color: '#8C7749',
        backgroundColor: '#F0E8D8',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    measurementChipValue: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1C1915',
        marginTop: 4,
    },
    measurementChipUnit: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8C8273',
    },
    measurementChipCategory: {
        fontSize: 10,
        color: '#7A7264',
        marginTop: 3,
    },
    studioWorkflowLayout: {
        display: 'flex',
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        alignItems: 'flex-start',
        gap: 20,
        marginBottom: 24,
    },
    studioWorkflowLayoutFreeRow: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 28,
        marginBottom: 24,
        width: '100%',
        alignSelf: 'center',
    },
    studioWorkflowLayoutFreeCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 24,
        marginBottom: 24,
        width: '100%',
        alignSelf: 'center',
    },
    leftStudioColumn: {
        width: Platform.OS === 'web' ? 420 : '100%',
        minWidth: 380,
        maxWidth: Platform.OS === 'web' ? 450 : '100%',
    },
    leftStudioColumnFree: {
        width: Platform.OS === 'web' ? 640 : '100%',
        minWidth: 600,
        maxWidth: 660,
        flexShrink: 0,
        alignSelf: 'flex-start',
    },
    leftStudioColumnFreeStacked: {
        width: '100%',
        maxWidth: 650,
        alignSelf: 'center',
        marginBottom: 20,
    },
    leftStudioColumnFreeCollapsed: {
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        marginBottom: 16,
    },
    rightStudioColumn: {
        flex: 1,
        width: '100%',
        minWidth: 320,
    },
    rightStudioColumnFree: {
        flex: 1,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        alignItems: 'center',
    },
    studioStepperBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        flexWrap: 'wrap',
        gap: 8,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 10px rgba(44, 39, 32, 0.04)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    stepperStep: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepperCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F3EFE6',
        borderWidth: 1,
        borderColor: '#D8CEBA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperCircleDone: {
        backgroundColor: '#C5A059',
        borderColor: '#A78350',
    },
    stepperCircleText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#7D6A42',
    },
    stepperCircleTextDone: {
        color: '#FFFFFF',
    },
    stepperTexts: {},
    stepperTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2A2723',
    },
    stepperSubtitle: {
        fontSize: 10,
        color: '#8A8275',
    },
    stepperDivider: {
        fontSize: 12,
        color: '#C7BFA8',
        fontWeight: '700',
    },
    sessionHistoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        padding: 12,
        marginTop: 12,
    },
    sessionHistoryCardTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#8C7749',
        marginBottom: 6,
    },
    sessionHistoryChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#F7F5EE',
        borderWidth: 1,
        borderColor: '#E6DCC5',
    },
    sessionHistoryChipActive: {
        backgroundColor: '#C5A059',
        borderColor: '#A78350',
    },
    sessionHistoryChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#5E5648',
    },
    sessionHistoryChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    technicalConfigCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(44, 39, 32, 0.05)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    cardDescription: {
        fontSize: 11.5,
        color: '#7D7568',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    emptyMesaCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#D8CEB8',
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 16,
    },
    emptyMesaIcon: {
        fontSize: 36,
    },
    emptyMesaTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2F2B24',
    },
    emptyMesaDesc: {
        fontSize: 12,
        color: '#7D7568',
        textAlign: 'center',
        maxWidth: 420,
        lineHeight: 18,
    },
    goToCadBtn: {
        marginTop: 10,
        backgroundColor: '#C5A059',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 3px 8px rgba(197, 160, 89, 0.28)',
                cursor: 'pointer',
            },
        }),
    },
    goToCadBtnText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.6,
        color: '#FFFFFF',
    },
    cadNextStepsBanner: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#FAF7F0',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cadNextStepBtn: {
        flex: 1,
        minWidth: 180,
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFD2B5',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 6px rgba(44, 39, 32, 0.04)',
                cursor: 'pointer',
            },
        }),
    },
    cadNextStepBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#7D5C22',
        letterSpacing: 0.5,
    },
    atelierGuideCard: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: '#FAF8F3',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E7DEC7',
        padding: 14,
        marginBottom: 14,
    },
    atelierGuideItem: {
        flex: 1,
        minWidth: 200,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    atelierGuideIcon: {
        fontSize: 18,
    },
    atelierGuideTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2A261F',
        marginBottom: 2,
    },
    atelierGuideDesc: {
        fontSize: 11,
        color: '#6E6659',
        lineHeight: 15,
    },
    historySectionSuper: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#A78350',
    },
    configGrid: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
    },
    configCard: {
        flex: 1,
        minWidth: 260,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
    },
    stepBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginBottom: 8,
    },
    stepBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    takeMeasurementsBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: colors.atelierBlack,
        borderRadius: 4,
    },
    takeMeasurementsBtnText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    correctMeasurementsBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    correctMeasurementsBtnText: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '600',
    },
    clientSelector: {},
    clientChipsScroll: {
        marginBottom: 8,
    },
    clientChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 6,
    },
    clientChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    clientChipText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    clientChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    selectedClientInfo: {
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: colors.line,
    },
    clientPrefText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    sessionCard: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 6,
        padding: 10,
    },
    sessionCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sessionDateText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    sessionStatusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
    },
    statusBadgeDraft: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
    statusBadgeCompleted: {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
    },
    statusBadgeVerified: {
        backgroundColor: '#DBEAFE',
        borderColor: '#3B82F6',
    },
    statusBadgeArchived: {
        backgroundColor: '#F3F4F6',
        borderColor: '#9CA3AF',
    },
    sessionStatusBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statusBadgeDraftText: {
        color: '#B45309',
    },
    statusBadgeCompletedText: {
        color: '#047857',
    },
    statusBadgeVerifiedText: {
        color: '#1D4ED8',
    },
    draftSessionNotice: {
        backgroundColor: '#FFFBEB',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FDE68A',
        padding: 8,
        marginBottom: 8,
    },
    draftSessionNoticeText: {
        fontSize: 10,
        color: '#92400E',
        lineHeight: 14,
        marginBottom: 6,
    },
    finalizeInlineBtn: {
        alignSelf: 'flex-start',
        backgroundColor: colors.atelierBlack,
        borderRadius: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    finalizeInlineBtnText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    measurementsQuickPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    quickPill: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickPillLabel: {
        fontSize: 9,
        color: colors.textMuted,
    },
    quickPillVal: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    emptySessionBox: {
        padding: 12,
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    emptySessionText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    emptySessionAction: {
        paddingVertical: 4,
    },
    emptySessionActionText: {
        fontSize: 11,
        color: colors.accent,
        fontWeight: '600',
    },
    garmentSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    garmentChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    garmentChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    garmentChipText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    garmentChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    reqStatusBox: {
        borderRadius: 4,
        padding: 8,
        borderWidth: 1,
    },
    reqStatusBoxValid: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    reqStatusBoxWarning: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
    },
    reqStatusTitle: {
        fontSize: 11,
        fontWeight: '600',
    },
    reqStatusTitleValid: {
        color: colors.success,
    },
    reqStatusTitleWarning: {
        color: colors.error,
    },
    reqStatusSub: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    easeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    easeChip: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    easeChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    easeChipText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    easeChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    paramsSubRow: {
        marginTop: 6,
    },
    paramsSubLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    silhouetteRow: {
        flexDirection: 'row',
        gap: 6,
    },
    silChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    silChipActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    silChipText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    silChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    generateButton: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 14,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    generateButtonDisabled: {
        opacity: 0.6,
    },
    generateButtonText: {
        color: '#FAF7F2',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1,
    },
    resultsContainer: {
        gap: 16,
    },
    patternStatusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        flexWrap: 'wrap',
        gap: 12,
    },
    patternStatusBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    patternStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
    },
    statusBadgeApproved: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    statusBadgeFitting: {
        backgroundColor: '#F3EFEA',
        borderColor: colors.accentDark,
    },
    statusBadgePending: {
        backgroundColor: '#FAF5EE',
        borderColor: colors.accent,
    },
    patternStatusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statusTextApproved: {
        color: colors.success,
    },
    statusTextFitting: {
        color: colors.accentDark,
    },
    statusTextPending: {
        color: colors.accent,
    },
    versionLabelTag: {
        fontSize: 11,
        color: colors.textMuted,
    },
    patternResultTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: typography.serif,
    },
    patternResultMethod: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    fittingButton: {
        backgroundColor: colors.accentDark,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    fittingButtonText: {
        color: '#FAF7F2',
        fontSize: 12,
        fontWeight: '600',
    },
    approveButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    approveButtonText: {
        color: '#FAF7F2',
        fontSize: 12,
        fontWeight: '600',
    },
    exportBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exportActionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exportActionBtnHighlight: {
        backgroundColor: '#FAF5EE',
        borderColor: colors.accent,
    },
    exportActionBtnProduction: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    exportActionText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    exportActionTextHighlight: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.accent,
    },
    exportActionTextProduction: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.ivoryWarm,
    },
    // Componente 11: Selector de Plantilla de Patronaje
    templateSectionContainer: {
        marginTop: 12,
        marginBottom: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    templateSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    templateSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    templateSectionSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    componentBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 3,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    componentBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 0.5,
    },
    templateChipsScroll: {
        marginBottom: 12,
    },
    templateChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 140,
    },
    templateChipActive: {
        backgroundColor: '#FAF5EE',
        borderColor: colors.accent,
    },
    templateChipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    templateChipName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
    },
    templateChipNameActive: {
        color: colors.accentDark,
    },
    templateVersionBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        backgroundColor: colors.border,
    },
    templateVersionBadgeActive: {
        backgroundColor: colors.accent,
    },
    templateVersionText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    templateVersionTextActive: {
        color: '#FFFFFF',
    },
    templateDetailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        marginBottom: 10,
    },
    templateDetailTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    templateDetailName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    templateDetailMethod: {
        fontSize: 11,
        color: colors.accentDark,
        fontStyle: 'italic',
        marginTop: 2,
    },
    templateDetailVersionPill: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    templateDetailVersionPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    templateDetailDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
        marginBottom: 10,
    },
    templateMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
    },
    templateMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    templateMetaLabel: {
        fontSize: 10,
        color: colors.textMuted,
    },
    templateMetaValue: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    templateMeasTagsContainer: {
        marginTop: 4,
    },
    templateMeasTagsTitle: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    templateMeasTagsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    templateMeasTag: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        borderWidth: 1,
    },
    templateMeasTagPresent: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    templateMeasTagMissing: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    templateMeasTagText: {
        fontSize: 9,
    },
    templateMeasTagTextPresent: {
        color: '#065F46',
        fontWeight: '500',
    },
    templateMeasTagTextMissing: {
        color: '#92400E',
        fontWeight: '500',
    },
    templateOptMeasTagsContainer: {
        marginTop: 8,
    },
    templateOptMeasTagsTitle: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    templateOptMeasTagPresent: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.border,
    },
    templateOptMeasTagMissing: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
    },
    templateOptMeasTagTextPresent: {
        color: colors.textSecondary,
        fontWeight: '500',
    },
    templateOptMeasTagTextMissing: {
        color: colors.textMuted,
        fontWeight: '400',
    },
    applyEaseSmallBtn: {
        backgroundColor: colors.accent,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    applyEaseSmallBtnText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Estilos C12: Linaje de versiones y Ajustes de prueba
    cadGarmentHeroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E2D8',
    },
    cadGarmentImgWrap: {
        width: 76,
        height: 76,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    cadGarmentImg: {
        width: '100%',
        height: '100%',
    },
    cadGarmentTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    cadPiecesBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    cadPiecesBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.bronze,
        letterSpacing: 0.6,
    },
    lineageSingleNote: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.bronze,
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#F0E8DC',
    },
    lineageBar: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        marginBottom: 16,
    },
    lineageTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    lineageBarLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.accent,
        textTransform: 'uppercase',
    },
    lineageFlowHint: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    lineagePillsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
    },
    lineageItemWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lineageArrow: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textMuted,
    },
    lineagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
    },
    lineagePillActive: {
        borderColor: colors.accent,
        backgroundColor: '#FAF5EE',
    },
    lineagePillApproved: {
        borderColor: '#059669',
    },
    lineagePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    lineagePillTextActive: {
        color: colors.accentDark,
        fontWeight: '700',
    },
    lineagePillStatus: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.textMuted,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    lineagePillStatusActive: {
        color: colors.accentDark,
        borderColor: colors.accent,
    },
    adjustmentsHistoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginTop: 16,
        marginBottom: 16,
    },
    adjustmentsHistoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 8,
    },
    adjustmentsHistoryTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.accent,
        textTransform: 'uppercase',
    },
    adjustmentsHistoryCount: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    adjustmentItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    adjustmentBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    adjustmentBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.accentDark,
    },
    adjustmentDetails: {
        flex: 1,
    },
    adjustmentMainLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    adjustmentType: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    adjustmentDelta: {
        fontSize: 12,
        fontWeight: '800',
    },
    deltaPositive: {
        color: '#059669',
    },
    deltaNegative: {
        color: '#DC2626',
    },
    adjustmentDescription: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
        marginBottom: 2,
    },
    adjustmentDate: {
        fontSize: 10,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    // Estilos Paso 5: Verificación Previa
    preVerificationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginVertical: 12,
        position: 'relative',
    },
    preVerifySummaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
        marginBottom: 12,
        backgroundColor: colors.surfaceSubtle,
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    preVerifySummaryItem: {
        minWidth: 140,
        flex: 1,
    },
    preVerifySummaryLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    preVerifySummaryValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 2,
    },
    preVerifyListsContainer: {
        gap: 10,
        marginBottom: 8,
    },
    preVerifyListBlock: {
        gap: 4,
    },
    preVerifyListTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    preVerifyTagsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    preVerifyTagPresent: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    preVerifyTagPresentText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#065F46',
    },
    preVerifyEmptyListText: {
        fontSize: 11,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    preVerifyTagMissing: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    preVerifyTagMissingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#991B1B',
    },
    preVerifyEmptyListSuccessText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '500',
    },
    preVerifyAlertBlock: {
        marginTop: 10,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#F87171',
        padding: 10,
        borderRadius: 6,
    },
    preVerifyAlertText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#B91C1C',
        lineHeight: 16,
    },
    // Estilos Paso 11: Información de Exportación
    exportSuccessCard: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
    },
    exportSuccessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
        paddingBottom: 6,
    },
    exportSuccessTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#166534',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    exportSuccessClose: {
        fontSize: 14,
        fontWeight: '700',
        color: '#166534',
        paddingHorizontal: 4,
    },
    exportSuccessGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    exportSuccessItem: {
        minWidth: 140,
        flex: 1,
    },
    exportSuccessLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#15803D',
        textTransform: 'uppercase',
    },
    exportSuccessValue: {
        fontSize: 11,
        fontWeight: '600',
        color: '#14532D',
        marginTop: 1,
    },
    // Estilos Paso 7: Ficha Técnica y Desglose de Piezas
    technicalSpecsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginTop: 16,
    },
    technicalSpecsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 8,
        flexWrap: 'wrap',
        gap: 8,
    },
    technicalSpecsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    technicalSpecsBadge: {
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    technicalSpecsBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    technicalSpecsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        backgroundColor: colors.surfaceSubtle,
        padding: 12,
        borderRadius: 6,
    },
    technicalSpecItem: {
        minWidth: 140,
        flex: 1,
    },
    technicalSpecLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    technicalSpecValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 2,
    },
    piecesListSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.accentDark,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    piecesListGrid: {
        gap: 8,
    },
    pieceDetailCard: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 10,
    },
    pieceDetailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    pieceDetailName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    pieceDetailCode: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '500',
    },
    pieceDetailMeta: {
        gap: 2,
    },
    pieceDetailDim: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.accentDark,
    },
    pieceDetailSub: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    // Estilos Paso 12: Historial de Ejecuciones
    historySectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginTop: 16,
        marginBottom: 24,
    },
    historySectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 8,
    },
    historySectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    historySectionSubtitle: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
        fontStyle: 'italic',
    },
    historyCountBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    historyCountBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    historyRowCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    historyRowCardActive: {
        borderColor: colors.accent,
        backgroundColor: '#FAF5EE',
    },
    historyRowMain: {
        flex: 1,
    },
    historyRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    historyRowVersion: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    historyStatusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    historyStatusPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    historyRowMetaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    historyRowMetaItem: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    historyLoadBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
    },
    historyLoadBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // COMPONENTE 13 — REVISIÓN, FITTING, APROBACIÓN Y TRAZABILIDAD
    reviewSectionCard: {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.accent,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    reviewSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    reviewSectionSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: colors.accent,
    },
    reviewSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: typography.serif,
        marginTop: 2,
    },
    reviewMetaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: '#FAF8F5',
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 14,
    },
    reviewMetaItem: {
        minWidth: 150,
        flex: 1,
    },
    reviewMetaLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    reviewMetaValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    approvedBannerCard: {
        backgroundColor: '#F0F9F1',
        borderWidth: 1.5,
        borderColor: '#A5D6A7',
        borderRadius: 8,
        padding: 16,
        marginTop: 8,
        marginBottom: 12,
    },
    approvedBannerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    approvedBannerCheck: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2E7D32',
    },
    approvedBannerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1B5E20',
        letterSpacing: 0.5,
    },
    approvedBannerSub: {
        fontSize: 11,
        color: '#2E7D32',
        marginTop: 2,
    },
    readOnlyBadge: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    readOnlyBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    approvedDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    approvedDetailText: {
        fontSize: 11,
        color: '#1B5E20',
        width: '48%',
        minWidth: 200,
    },
    lifecycleActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    adjustFromHeaderBtn: {
        backgroundColor: colors.accent,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    adjustFromHeaderBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    clientReadOnlyNotice: {
        backgroundColor: '#FAF5EE',
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 10,
    },
    clientReadOnlyNoticeText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: colors.textSecondary,
    },
    confirmModalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        width: '92%',
        maxWidth: 560,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: colors.border,
        display: 'flex',
        flexDirection: 'column',
    },
    confirmModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 12,
        marginBottom: 16,
    },
    confirmModalSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: colors.accent,
    },
    confirmModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
        marginTop: 2,
    },
    confirmModalBody: {
        flex: 1,
        minHeight: 0,
        marginBottom: 16,
    },
    confirmWarningBox: {
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FFE082',
        borderRadius: 6,
        padding: 12,
        marginBottom: 14,
    },
    confirmWarningTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B78103',
        marginBottom: 4,
    },
    confirmWarningText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5D4037',
        lineHeight: 18,
    },
    confirmDetailIntro: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    confirmDetailGrid: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 12,
        gap: 4,
    },
    confirmDetailItem: {
        fontSize: 11,
        color: colors.textPrimary,
        lineHeight: 16,
    },
    confirmModalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    confirmCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    confirmCancelText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    confirmApproveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 6,
        backgroundColor: '#2E7D32',
    },
    confirmApproveText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    historyRowCardApproved: {
        borderColor: '#A5D6A7',
        backgroundColor: '#F4FAF5',
    },
    historyApprovedTag: {
        backgroundColor: '#2E7D32',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    historyApprovedTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    historyMotivoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        marginBottom: 4,
    },
    historyMotivoLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    historyMotivoText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textPrimary,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(26, 26, 26, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    exportActionBtnComparison: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    exportActionTextComparison: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E2E8F0',
    },
    lineageTreeCard: {
        padding: 14,
        backgroundColor: '#F7F4EE',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    lineageTreeTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.accent,
        marginBottom: 6,
    },
    lineageTreeRoot: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    treeNodeRow: {
        paddingVertical: 2,
    },
    treeBranchText: {
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: colors.textPrimary,
    },
    historyRowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyCompareBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: '#FFFFFF',
    },
    historyCompareBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.accent,
    },
    pieceComparisonRow: {
        padding: 10,
        backgroundColor: colors.surface,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 8,
    },
    pieceComparisonRowAffected: {
        borderColor: colors.accent,
        backgroundColor: '#FDFBF7',
    },
    pieceComparisonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    pieceComparisonName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    pieceStatusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    statusPillAffected: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FFB74D',
    },
    statusPillUnchanged: {
        backgroundColor: '#ECEFF1',
    },
    pieceStatusPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    pieceComparisonDimGrid: {
        gap: 2,
    },
    pieceDimText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    pieceDeltaText: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    deltaMuted: {
        color: colors.textMuted,
    },
    infoBanner: {
        padding: 12,
        backgroundColor: '#F5EFE6',
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        marginBottom: 14,
    },
    infoBannerText: {
        fontSize: 12,
        color: colors.textPrimary,
        lineHeight: 18,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: colors.accent,
        marginTop: 10,
        marginBottom: 8,
    },
    // Estilos C13: Flujo de Ciclo de Vida Visual
    cycleFlowCard: {
        padding: 12,
        backgroundColor: '#F8F6F1',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    cycleFlowTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: colors.accent,
        marginBottom: 8,
    },
    cycleFlowStepsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    cycleStepBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#EBE7DF',
    },
    cycleStepActive: {
        backgroundColor: colors.textPrimary,
    },
    cycleStepAlert: {
        backgroundColor: '#C62828',
    },
    cycleStepApproved: {
        backgroundColor: '#2E7D32',
    },
    cycleStepText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cycleArrow: {
        fontSize: 12,
        color: colors.textMuted,
    },
    // Estilos C13: Checklist Visual de Validación
    checklistCard: {
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    checklistHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 12,
    },
    checklistTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.textPrimary,
    },
    checklistSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    checklistOverallBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
    },
    badgePass: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#81C784',
    },
    badgeWarning: {
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FFD54F',
    },
    badgeBlocked: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#E57373',
    },
    checklistOverallText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    checklistGrid: {
        gap: 8,
    },
    checklistItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 4,
    },
    itemStatusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        minWidth: 55,
        alignItems: 'center',
    },
    pillPass: {
        backgroundColor: '#E8F5E9',
    },
    pillWarning: {
        backgroundColor: '#FFF8E1',
    },
    pillBlocked: {
        backgroundColor: '#FFEBEE',
    },
    itemStatusPillText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    itemContentCol: {
        flex: 1,
    },
    itemLabelText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    itemDescText: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 1,
    },
    returnButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: '#5D4037',
        alignItems: 'center',
        justifyContent: 'center',
    },
    returnButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    approveButtonDisabled: {
        opacity: 0.45,
    },
    historyTableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#EAE5DB',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        marginBottom: 8,
    },
    historyTableHeaderText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.8,
    },
    reasonOptionBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reasonOptionBtnActive: {
        backgroundColor: '#F7EFE4',
        borderColor: colors.accent,
    },
    reasonOptionText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    reasonOptionTextActive: {
        color: colors.accent,
        fontWeight: '700',
    },
    returnTextInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        padding: 10,
        fontSize: 12,
        color: colors.textPrimary,
        marginTop: 6,
        height: 70,
        textAlignVertical: 'top',
    },
    returnSignText: {
        fontSize: 10,
        color: colors.textMuted,
        fontStyle: 'italic',
        marginTop: 8,
    },
    // =========================================================================
    // ESTILOS COMPONENTE 13: FITTING, REGISTRO DE AJUSTES Y REGENERACIÓN
    // =========================================================================
    fittingSectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: '#C5A059',
        shadowColor: '#1A1614',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    fittingSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EAE5DB',
        marginBottom: 16,
    },
    fittingSectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1614',
        letterSpacing: 1.2,
    },
    fittingSectionSubtitle: {
        fontSize: 12,
        color: '#6E6259',
        fontStyle: 'italic',
        marginTop: 2,
    },
    fittingSectionBadge: {
        backgroundColor: '#F5EBE1',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#C5A059',
    },
    fittingSectionBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8C6D37',
        letterSpacing: 0.8,
    },
    fittingSubCard: {
        backgroundColor: '#FAF8F5',
        borderRadius: 6,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E8E1D5',
    },
    fittingSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    fittingSubTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#2C2622',
        letterSpacing: 1,
        marginBottom: 8,
    },
    fittingBaseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 8,
        columnGap: 16,
    },
    fittingBaseItem: {
        width: '47%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fittingBaseLabel: {
        fontSize: 11,
        color: '#6E6259',
        fontWeight: '600',
    },
    fittingBaseValue: {
        fontSize: 11,
        color: '#1A1614',
        fontWeight: '700',
    },
    addAdjustmentBtn: {
        backgroundColor: '#1A1614',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    addAdjustmentBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    emptyAdjustmentsBox: {
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E8E1D5',
        alignItems: 'center',
        marginVertical: 4,
    },
    emptyAdjustmentsText: {
        fontSize: 11,
        color: '#8C7A6B',
        textAlign: 'center',
        lineHeight: 16,
    },
    stagedTableContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E8E1D5',
        overflow: 'hidden',
        marginVertical: 6,
    },
    stagedTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EAE5DB',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#D8CFC4',
    },
    stagedColHeader: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2C2622',
        letterSpacing: 0.5,
    },
    stagedTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0ECE4',
    },
    stagedCell: {
        fontSize: 11,
        color: '#1A1614',
    },
    stagedCellAction: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteStagedText: {
        fontSize: 10,
        color: '#C0392B',
        fontWeight: '700',
    },
    fittingNotesBlock: {
        marginTop: 12,
    },
    fittingNotesLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4A3E35',
        marginBottom: 4,
    },
    fittingNotesInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        borderRadius: 4,
        padding: 8,
        fontSize: 11,
        color: '#1A1614',
        height: 50,
        textAlignVertical: 'top',
    },
    regenerateDescription: {
        fontSize: 11,
        color: '#6E6259',
        lineHeight: 16,
        marginBottom: 12,
    },
    regeneratePatternBtn: {
        backgroundColor: '#C5A059',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#C5A059',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
    },
    regeneratePatternBtnDisabled: {
        opacity: 0.45,
    },
    regeneratePatternBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    regenerationSuccessCard: {
        backgroundColor: '#F3F9F4',
        borderRadius: 6,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#2E7D32',
    },
    regenerationSuccessHeader: {
        marginBottom: 8,
    },
    regenerationSuccessTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1B5E20',
        letterSpacing: 0.5,
    },
    regenerationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 6,
        columnGap: 16,
        marginVertical: 4,
    },
    regenerationItem: {
        width: '47%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    regenerationLabel: {
        fontSize: 10,
        color: '#3B6E45',
        fontWeight: '600',
    },
    regenerationValue: {
        fontSize: 10,
        color: '#1B5E20',
        fontWeight: '700',
    },
    regenerationHelpText: {
        fontSize: 10,
        color: '#2E7D32',
        fontStyle: 'italic',
        marginTop: 6,
    },
    historyOriginalBadge: {
        backgroundColor: '#EAE5DB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#D8CFC4',
    },
    historyOriginalBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#4A3E35',
        letterSpacing: 0.5,
    },
    historyDerivedBadge: {
        backgroundColor: '#E8F4FD',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#B3D4FC',
    },
    historyDerivedBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#1565C0',
        letterSpacing: 0.5,
    },
    historyDerivedBanner: {
        backgroundColor: '#F7FAFC',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginTop: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#1565C0',
    },
    historyDerivedBannerText: {
        fontSize: 10,
        color: '#2D3748',
        fontWeight: '600',
    },
    adjTypeChip: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: '#D8CFC4',
    },
    adjTypeChipActive: {
        backgroundColor: '#1A1614',
        borderColor: '#1A1614',
    },
    adjTypeChipText: {
        fontSize: 11,
        color: '#4A3E35',
        fontWeight: '600',
    },
    adjTypeChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    unitToggleBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        alignItems: 'center',
    },
    unitToggleBtnActive: {
        backgroundColor: '#C5A059',
        borderColor: '#C5A059',
    },
    unitToggleText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4A3E35',
    },
    unitToggleTextActive: {
        color: '#FFFFFF',
    },
    directionToggleBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        alignItems: 'center',
    },
    directionToggleBtnActive: {
        backgroundColor: '#1A1614',
        borderColor: '#1A1614',
    },
    directionToggleText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4A3E35',
    },
    directionToggleTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    adjFormInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontSize: 12,
        color: '#1A1614',
        marginTop: 4,
    },
    adjErrorBox: {
        backgroundColor: '#FDECEA',
        borderWidth: 1,
        borderColor: '#E57373',
        borderRadius: 4,
        padding: 8,
        marginBottom: 10,
    },
    adjErrorText: {
        fontSize: 11,
        color: '#C62828',
        fontWeight: '700',
    },
    regenerationBannerBox: {
        backgroundColor: '#FEF9E7',
        borderLeftWidth: 4,
        borderLeftColor: '#F1C40F',
        padding: 10,
        borderRadius: 4,
        marginBottom: 12,
    },
    regenerationBannerTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#7D6608',
        lineHeight: 16,
    },
    confirmAdjRow: {
        backgroundColor: '#F9F7F4',
        padding: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E8E1D5',
    },
    confirmAdjZone: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1A1614',
    },
    confirmAdjType: {
        fontSize: 10,
        color: '#8C7A6B',
        fontStyle: 'italic',
    },
    confirmAdjDesc: {
        fontSize: 10,
        color: '#4A3E35',
        marginTop: 2,
    },
    adjFieldHelp: {
        fontSize: 10,
        color: '#8C7A6B',
        marginBottom: 4,
    },
    adjPieceCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        borderRadius: 4,
        padding: 8,
    },
    adjPieceCardActive: {
        backgroundColor: '#FAF5EE',
        borderColor: '#C5A059',
        borderWidth: 1.5,
    },
    adjPieceCardName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1A1614',
    },
    adjPieceCardNameActive: {
        color: '#7D6608',
    },
    adjPieceCardType: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8C7A6B',
    },
    adjPieceCardTypeActive: {
        color: '#C5A059',
    },
    adjPieceCardId: {
        fontSize: 9,
        color: '#8C7A6B',
    },
    adjPieceCardDims: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1A1614',
    },
    adjEmptyPieceText: {
        fontSize: 11,
        color: '#8C7A6B',
        fontStyle: 'italic',
    },
    adjTypeChipPending: {
        borderStyle: 'dashed',
    },
    adjWarningBox: {
        backgroundColor: '#FFF9E6',
        borderLeftWidth: 3,
        borderLeftColor: '#F39C12',
        padding: 8,
        borderRadius: 4,
        marginVertical: 4,
    },
    adjWarningText: {
        fontSize: 10,
        color: '#8A6D3B',
        lineHeight: 14,
    },
    adjLocationChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: '#D8CFC4',
    },
    adjLocationChipActive: {
        backgroundColor: '#C5A059',
        borderColor: '#C5A059',
    },
    adjLocationChipText: {
        fontSize: 10,
        color: '#4A3E35',
        fontWeight: '600',
    },
    adjLocationChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // ==============================================================================
    // REDISEÑO FUNCIONAL Y UX: MÓDULO 02 — ALTA COSTURA
    // ==============================================================================
    workflowSubHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1A18',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#2D2824',
        flexWrap: 'wrap',
        gap: 10,
    },
    workflowBackToHubBtn: {
        backgroundColor: '#2A2622',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#423C36',
    },
    workflowBackToHubBtnText: {
        color: '#E8E2D8',
        fontSize: 12,
        fontWeight: '600',
    },
    workflowBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 200,
    },
    workflowPillBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
    },
    workflowPillA: {
        backgroundColor: '#EBF3FA',
        borderColor: '#B8D5ED',
    },
    workflowPillB: {
        backgroundColor: '#EDF5EE',
        borderColor: '#C2DFCA',
    },
    workflowPillC: {
        backgroundColor: '#FFF8E7',
        borderColor: '#FCE7B2',
    },
    workflowPillD: {
        backgroundColor: '#F3E5F5',
        borderColor: '#CE93D8',
    },
    workflowPillBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: '#1A1A1A',
    },
    workflowContextSummary: {
        fontSize: 12,
        color: '#D4CBBF',
        fontStyle: 'italic',
        flex: 1,
    },
    switchFlowHeaderBtn: {
        backgroundColor: 'transparent',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    switchFlowHeaderBtnText: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '600',
    },

    // ==============================================================================
    // 1. HUB EDITORIAL PRINCIPAL (MÓDULO 02 — ALTA COSTURA)
    // ==============================================================================
    hubContainer: {
        width: '100%',
        paddingVertical: 12,
    },

    // HERO EDITORIAL ASIMÉTRICO
    hubHeroCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        marginBottom: 36,
        overflow: 'hidden',
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    hubHeroCardMobile: {
        flexDirection: 'column',
    },
    hubHeroContent: {
        flex: 1.15,
        padding: 32,
        justifyContent: 'center',
    },
    hubHeroEyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    hubHeroStar: {
        fontSize: 12,
        color: '#A78350',
    },
    hubHeroEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#A78350',
    },
    hubHeroTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    hubHeroTagText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#8A6A4A',
    },
    hubHeroTitle: {
        fontSize: 32,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: '#171411',
        lineHeight: 38,
        marginBottom: 12,
        letterSpacing: -0.3,
    },
    hubHeroSubtitle: {
        fontSize: 15,
        color: '#766B62',
        lineHeight: 22,
        marginBottom: 10,
        maxWidth: 560,
    },
    hubHeroDescription: {
        fontSize: 12,
        color: '#8A6A4A',
        lineHeight: 18,
        marginBottom: 18,
        maxWidth: 560,
    },
    hubHeroBadgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
        paddingTop: 16,
    },
    hubHeroPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hubHeroPillDot: {
        fontSize: 12,
        color: '#A78350',
    },
    hubHeroPillText: {
        fontSize: 11,
        color: '#8A6A4A',
        fontWeight: '600',
    },
    hubHeroImageWrapper: {
        flex: 0.95,
        minHeight: 280,
        position: 'relative',
        backgroundColor: '#171411',
    },
    hubHeroImageWrapperMobile: {
        minHeight: 220,
    },
    hubHeroImage: {
        width: '100%',
        height: '100%',
    },
    hubHeroImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.25)',
    },
    hubHeroImageCaption: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(23, 20, 17, 0.82)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.4)',
    },
    hubHeroImageCaptionEyebrow: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#A78350',
        marginBottom: 2,
    },
    hubHeroImageCaptionTitle: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: typography.serif,
        color: '#F8F2E9',
    },

    // SECCIÓN "¿QUÉ QUIERES HACER HOY?"
    hubSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    hubSectionHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E6D9C8',
    },
    hubSectionHeaderContent: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    hubSectionEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#A78350',
        marginBottom: 4,
    },
    hubSectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: '#171411',
        marginBottom: 4,
        textAlign: 'center',
    },
    hubSectionSubtitle: {
        fontSize: 12,
        color: '#766B62',
        textAlign: 'center',
        maxWidth: 580,
    },

    // GRIDS
    hubCardsGridProtagonists: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
        marginBottom: 36,
    },
    hubCardsGridSecondary: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 36,
    },

    // TARJETA PROTAGONISTA (02 · PATRONAJE DIRECTO)
    hubProtagonistCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: '#FDFBF7',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#A78350',
        overflow: 'hidden',
        shadowColor: '#A78350',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 4,
        justifyContent: 'space-between',
    },
    hubProtagonistImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
    },
    hubProtagonistBadgeFloating: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#171411',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    hubProtagonistBadgeFloatingText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#A78350',
    },
    hubProtagonistCardBody: {
        padding: 22,
        flex: 1,
        justifyContent: 'space-between',
    },
    hubProtagonistEyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    hubProtagonistEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#A78350',
    },
    hubCoutureTag: {
        backgroundColor: '#FAF5EE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    hubCoutureTagText: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#8A6A4A',
    },
    hubProtagonistCardTitle: {
        fontSize: 21,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: '#171411',
        marginBottom: 6,
    },
    hubProtagonistCardSub: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8A6A4A',
        marginBottom: 8,
    },
    hubProtagonistCardDesc: {
        fontSize: 12,
        color: '#5C5248',
        lineHeight: 18,
        marginBottom: 16,
    },
    hubConceptFlow: {
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EFE7DC',
        marginBottom: 16,
    },
    hubConceptFlowLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#8A6A4A',
        marginBottom: 6,
    },
    hubConceptPipeline: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    hubConceptPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    hubConceptPillText: {
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: '#766B62',
    },
    hubConceptPillActive: {
        backgroundColor: '#171411',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    hubConceptPillTextActive: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: '#F8F2E9',
    },
    hubConceptArrow: {
        fontSize: 10,
        color: '#A78350',
        fontWeight: '700',
    },
    hubProtagonistCardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#EADFCF',
        paddingTop: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    hubProtagonistActionBtn: {
        backgroundColor: '#171411',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    hubProtagonistActionBtnText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: '#F8F2E9',
    },

    // TARJETA CO-PROTAGONISTA (03 · PATRONES DE CREACIONES)
    hubCoProtagonistCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#D8CFC4',
        overflow: 'hidden',
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        justifyContent: 'space-between',
    },
    hubCoProtagonistCardBody: {
        padding: 22,
        flex: 1,
        justifyContent: 'space-between',
    },
    hubCoProtagonistCardTitle: {
        fontSize: 21,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: '#171411',
        marginBottom: 6,
    },
    hubCoProtagonistCardSub: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A78350',
        marginBottom: 8,
    },
    hubCoProtagonistCardDesc: {
        fontSize: 12,
        color: '#5C5248',
        lineHeight: 18,
        marginBottom: 16,
    },
    hubCoProtagonistCardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
        paddingTop: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    hubCoProtagonistActionBtn: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    hubCoProtagonistActionBtnText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: '#171411',
    },

    // IMÁGENES DE TARJETAS
    hubCardImageWrapperProtagonist: {
        height: 180,
        width: '100%',
        position: 'relative',
        backgroundColor: '#171411',
    },
    hubCardImage: {
        width: '100%',
        height: '100%',
    },
    hubCardImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.15)',
    },
    hubCardBadgeFloating: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    hubCardBadgeFloatingText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#171411',
    },

    // ACCIONES GENERALES
    hubPrimaryCardEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#8A6A4A',
        marginBottom: 4,
    },
    hubStepSummary: {
        flex: 1,
    },
    hubStepSummaryText: {
        fontSize: 11,
        color: '#8A6A4A',
        fontStyle: 'italic',
    },
    hubStepSummaryHighlight: {
        fontSize: 11,
        color: '#A78350',
        fontWeight: '600',
    },

    // SECCIÓN SECUNDARIA (01, 04, 05)
    hubSecondaryHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    hubSecondaryDivider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E6D9C8',
    },
    hubSecondarySectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#8A6A4A',
    },
    hubSecondaryCard: {
        flex: 1,
        minWidth: 260,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        overflow: 'hidden',
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
        justifyContent: 'space-between',
    },
    hubSecondaryCardImageWrapper: {
        height: 130,
        width: '100%',
        position: 'relative',
        backgroundColor: '#171411',
    },
    hubSecondaryCardImage: {
        width: '100%',
        height: '100%',
    },
    hubSecondaryCardBody: {
        padding: 18,
        flex: 1,
        justifyContent: 'space-between',
    },
    hubSecondaryCardEyebrow: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#766B62',
        marginBottom: 4,
    },
    hubSecondaryCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: '#171411',
        marginBottom: 4,
    },
    hubSecondaryCardSub: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8A6A4A',
        marginBottom: 6,
    },
    hubSecondaryCardDesc: {
        fontSize: 12,
        color: '#766B62',
        lineHeight: 17,
        marginBottom: 14,
    },
    hubSecondaryCardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    hubCardSecondaryActionBtn: {
        backgroundColor: '#FAF7F2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    hubCardSecondaryActionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#171411',
    },

    // 3. ARCHIVO TÉCNICO DEL ATELIER
    hubSupportSection: {
        backgroundColor: '#FAF7F2',
        borderRadius: 8,
        padding: 22,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        marginBottom: 20,
    },
    hubSupportHeader: {
        marginBottom: 16,
    },
    hubSupportEyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    hubSupportStar: {
        fontSize: 10,
        color: '#A78350',
    },
    hubSupportLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#8A6A4A',
    },
    hubSupportMainTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: '#171411',
        marginBottom: 4,
    },
    hubSupportSub: {
        fontSize: 12,
        color: '#766B62',
        lineHeight: 18,
    },
    hubSecondaryButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    hubSupportBtn: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        gap: 12,
    },
    hubSupportIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hubSupportIcon: {
        fontSize: 18,
    },
    hubSupportTextBox: {
        flex: 1,
    },
    hubArchivePill: {
        alignSelf: 'flex-start',
        backgroundColor: '#FAF5EE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        marginBottom: 4,
    },
    hubArchivePillText: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#8A6A4A',
    },
    hubSupportBtnTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#171411',
        marginBottom: 2,
    },
    hubSupportBtnSub: {
        fontSize: 11,
        color: '#766B62',
    },
    hubSupportBtnArrow: {
        fontSize: 16,
        color: '#A78350',
        fontWeight: '700',
    },

    // 2. FLUJO A: GESTIÓN DE MEDIDAS
    measurementsWorkflowContainer: {
        width: '100%',
        maxWidth: 1600,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 24,
    },
    measurementsTopLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        width: '100%',
        alignItems: 'flex-start',
    },
    measurementsFullWidthSection: {
        width: '100%',
        maxWidth: 1600,
        alignSelf: 'center',
        marginTop: 24,
        position: 'relative',
        zIndex: 50,
    },
    measurementsFlowLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        width: '100%',
    },
    measurementsLeftCol: {
        flex: 1,
        minWidth: 320,
        maxWidth: 380,
        gap: 16,
    },
    measurementsRightCol: {
        flex: 2,
        minWidth: 500,
        gap: 16,
    },
    clientSummaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E2D8',
    },
    clientSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    clientSummaryAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.atelierBlack,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    clientSummaryAvatarText: {
        color: colors.champagneGold,
        fontWeight: '700',
        fontSize: 13,
    },
    clientSummaryName: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    clientSummaryStatus: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    clientSummaryStatsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    clientStatBox: {
        flex: 1,
        backgroundColor: '#FAF7F2',
        padding: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EADFCF',
    },
    clientStatLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    clientStatVal: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    newSessionPrimaryBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 10,
        borderRadius: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    newSessionPrimaryBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // 1.B Resumen Único de Clienta Seleccionada
    clientSingleSummaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        gap: 12,
    },
    clientSingleSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    clientSingleSummaryEyebrow: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#996B1F',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    clientSingleSummaryName: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    clientSingleStatusBadge: {
        backgroundColor: '#EDF5EE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#D3E8D6',
    },
    clientSingleStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2E6930',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    clientSingleDataGrid: {
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EADFCF',
        gap: 6,
    },
    clientSingleDataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clientSingleDataLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    clientSingleDataValue: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    clientSingleActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
    },
    clientSingleActionBtn: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientSingleActionBtnPrimary: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    clientSingleActionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    clientSingleActionBtnPrimaryText: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '700',
    },
    clientSingleActionBtnExport: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: 'rgba(212, 175, 55, 0.14)',
        borderWidth: 1.5,
        borderColor: '#D4AF37',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientSingleActionBtnExportText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#996B1F',
        letterSpacing: 0.3,
    },

    // 1.C Historial Compacto de Sesiones de Medidas
    sessionsHistorySection: {
        gap: 10,
    },
    sessionsHistoryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    sessionsHistoryTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.textSecondary,
    },
    emptySessionsCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8E2D8',
    },
    emptySessionsText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    createFirstSessionBtn: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    createFirstSessionBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    workflowSessionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        gap: 8,
    },
    workflowSessionCardCompact: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        gap: 8,
    },
    sessionCompactTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionCompactSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    sessionCompactActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 2,
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
        paddingTop: 8,
    },
    sessionActionBtnCompact: {
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        alignItems: 'center',
    },
    sessionCardActive: {
        borderColor: colors.champagneGold,
        borderWidth: 1.5,
        backgroundColor: '#FCFAF6',
    },
    sessionCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionVersionTag: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionDateTag: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    sessionStatusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    sessionStatusCompleted: {
        backgroundColor: '#EDF5EE',
    },
    sessionStatusDraft: {
        backgroundColor: '#FFF8E7',
    },
    sessionStatusPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionCardDetailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    sessionDetailItem: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    sessionCardActionsRow: {
        flexDirection: 'row',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
        paddingTop: 8,
    },
    sessionActionBtn: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 6,
        borderRadius: 4,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        alignItems: 'center',
    },
    sessionActionBtnActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    sessionActionBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    sessionActionBtnTextActive: {
        color: colors.champagneGold,
    },

    // 4. Medidas Anatómicas de la Sesión (Rediseño Visual Final)
    detailedMeasuresTableCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        position: 'relative',
        zIndex: 50,
    },
    detailedMeasuresHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0ECE4',
        paddingBottom: 8,
        gap: 12,
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1000,
        ...Platform.select({
            web: {
                zIndex: 1000,
            },
            default: {
                elevation: 20,
            },
        }),
    },
    detailedMeasuresTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.atelierBlack,
    },
    detailedMeasuresSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    detailedMeasuresCount: {
        fontSize: 10,
        fontWeight: '600',
        color: '#996B1F',
        marginTop: 2,
    },
    detailedMeasuresControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1001,
    },
    detailedMeasuresBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D8CFC4',
    },
    detailedMeasuresBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    noMeasuresText: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
        paddingVertical: 12,
    },

    // 4.B Hero Metrics & Medidas Secundarias
    measuresHeroContainer: {
        backgroundColor: '#FAF7F2',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#EADFCF',
        marginBottom: 12,
        gap: 8,
    },
    measuresHeroEyebrow: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#996B1F',
        textTransform: 'uppercase',
    },
    measuresHeroRow: {
        flexDirection: 'row',
        gap: 10,
    },
    measuresHeroCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    measuresHeroCardSelected: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF5',
        borderWidth: 1.5,
    },
    measuresHeroLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    measuresHeroVal: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    measuresHeroSubVal: {
        fontSize: 9,
        color: colors.textMuted,
        marginTop: 1,
    },
    measuresHeroActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: '#E6DCCF',
    },
    measuresHeroActionText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#996B1F',
        letterSpacing: 0.5,
    },
    measuresSecondaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#EADFCF',
        paddingTop: 8,
    },
    measuresSecondaryItem: {
        width: '31%',
        minWidth: 100,
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        padding: 6,
        borderWidth: 1,
        borderColor: '#EFE9DE',
    },
    measuresSecondaryItemSelected: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF5',
        borderWidth: 1.5,
    },
    measuresSecondaryLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    measuresSecondaryVal: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measuresSecondaryValMissing: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textMuted,
    },

    // 4.C 6 Acordeones de Medidas con Jerarquía Editorial
    measureAccordionsContainer: {
        gap: 8,
        marginTop: 4,
    },
    measureAccordionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        overflow: 'hidden',
    },
    measureAccordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FAF7F2',
    },
    measureAccordionIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    measureAccordionTitle: {
        flex: 1,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: colors.atelierBlack,
    },
    measureAccordionCountBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#EAE3D5',
        marginRight: 8,
    },
    measureAccordionCountText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureAccordionChevron: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    measureAccordionBody: {
        padding: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        backgroundColor: '#FFFFFF',
    },
    measureCardCell: {
        flexBasis: '23.5%',
        minWidth: 260,
        flexGrow: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#FAF7F2',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EADFCF',
    },
    measureCardCellSelected: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF5',
        borderWidth: 1.5,
    },
    measureCardCellEmpty: {
        backgroundColor: '#FBFBFB',
        borderColor: '#ECECEC',
        opacity: 0.75,
    },
    measureCardName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    measureCardCode: {
        fontSize: 8,
        color: colors.textMuted,
        marginBottom: 2,
    },
    measureCardCellAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    measureCardActionText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#996B1F',
    },
    measureCardValCm: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureCardValMm: {
        fontSize: 9,
        color: colors.textSecondary,
    },
    measureCardValMissing: {
        fontSize: 10,
        fontStyle: 'italic',
        color: colors.textMuted,
    },

    // Legacy table styles for backward compatibility
    measuresTableGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    measureTableCell: {
        flex: 1,
        minWidth: 160,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#FAF7F2',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EADFCF',
    },
    measureTableCellEmpty: {
        backgroundColor: '#FFF9E6',
        borderColor: '#FCE7B2',
    },
    measureTableName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    measureTableCode: {
        fontSize: 9,
        color: colors.textMuted,
    },
    measureTableValMm: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    measureTableValCm: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    measureTableValMissing: {
        fontSize: 10,
        fontWeight: '600',
        color: '#CF1322',
    },

    // 3. FLUJO C: CREACIONES
    creationSelectorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EADFCF',
        marginBottom: 14,
    },
    creationSelectorHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    creationSelectorSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#996B1F',
    },
    creationSelectorTitle: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    creationActiveBadge: {
        backgroundColor: '#FFF8E7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FCE7B2',
    },
    creationActiveBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#996B1F',
    },
    emptyCreationsBox: {
        padding: 12,
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        alignItems: 'center',
    },
    emptyCreationsText: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    createDraftCreationBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    createDraftCreationBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.ivoryWarm,
    },
    creationChipCard: {
        padding: 10,
        borderRadius: 6,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D8CFC4',
        minWidth: 160,
    },
    creationChipCardActive: {
        backgroundColor: '#FFF8E7',
        borderColor: '#996B1F',
        borderWidth: 1.5,
    },
    creationChipName: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    creationChipNameActive: {
        color: '#996B1F',
    },
    creationChipMeta: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    creationChipMetaActive: {
        color: '#704E15',
    },
    creationChipPatternState: {
        fontSize: 9,
        color: colors.textMuted,
        marginTop: 4,
    },
    creationChipPatternStateActive: {
        color: '#996B1F',
        fontWeight: '600',
    },

    // 4. FLUJO D: MEDIDAS DE REFERENCIA / PATRÓN LIBRE
    referenceProfileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#CE93D8',
        marginBottom: 14,
    },
    referenceProfileHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    referenceProfileSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#6A1B9A',
    },
    referenceProfileTitle: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    referenceProfileBadge: {
        backgroundColor: '#F3E5F5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#CE93D8',
    },
    referenceProfileBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#6A1B9A',
    },
    referenceProfileDesc: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
        marginBottom: 10,
    },
    referenceProfilesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    referenceProfileBtn: {
        flex: 1,
        minWidth: 140,
        padding: 10,
        borderRadius: 6,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D8CFC4',
    },
    referenceProfileBtnActive: {
        backgroundColor: '#F3E5F5',
        borderColor: '#6A1B9A',
        borderWidth: 1.5,
    },
    referenceProfileBtnTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    referenceProfileBtnTitleActive: {
        color: '#6A1B9A',
    },
    referenceProfileBtnDesc: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    referenceProfileBtnDescActive: {
        color: '#4A148C',
    },
    freePatternLeftSummary: {
        gap: 12,
    },
    freePatternLeftHeader: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E8E2D8',
    },
    freePatternLeftTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#6A1B9A',
    },
    freePatternLeftSub: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },

    // 5. MODAL DE PATRONES DERIVADOS
    derivedPatternsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    derivedPatternsCard: {
        width: '100%',
        maxWidth: 640,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    derivedPatternsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F0ECE4',
        paddingBottom: 12,
    },
    derivedPatternsSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.champagneGold,
    },
    derivedPatternsTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: typography.serif,
        color: colors.atelierBlack,
    },
    emptyDerivedState: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    emptyDerivedIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    emptyDerivedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        textAlign: 'center',
        marginBottom: 6,
    },
    emptyDerivedDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    emptyDerivedActions: {
        gap: 10,
        width: '100%',
        maxWidth: 360,
    },
    emptyDerivedPrimaryBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 10,
        borderRadius: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    emptyDerivedPrimaryBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '700',
    },
    emptyDerivedSecondaryBtn: {
        backgroundColor: '#FFF8E7',
        paddingVertical: 10,
        borderRadius: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FCE7B2',
    },
    emptyDerivedSecondaryBtnText: {
        color: '#996B1F',
        fontSize: 12,
        fontWeight: '700',
    },
    derivedExecItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 6,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E8E2D8',
        marginBottom: 8,
    },
    derivedExecGarment: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    derivedExecVersion: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    derivedExecMeta: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 4,
    },
    derivedOpenCadBtn: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    derivedOpenCadBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.ivoryWarm,
    },
    statusPillSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    statusApprovedSmall: {
        backgroundColor: '#EDF5EE',
    },
    statusFittingSmall: {
        backgroundColor: '#FFF8E7',
    },
    statusPillSmallText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.atelierBlack,
    },

    // Estilos del Cuadro Diagnóstico Previo al Trazado (Sección 6)
    technicalDiagnosticBox: {
        backgroundColor: '#FCFAF6',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8E2D8',
        marginVertical: 10,
    },
    technicalDiagnosticHeader: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.champagneGold,
        marginBottom: 8,
    },
    technicalDiagnosticGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    technicalDiagnosticCol: {
        flex: 1,
        minWidth: 120,
        backgroundColor: '#FFFFFF',
        padding: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EADFCF',
    },
    diagItemLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    diagItemValue: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    readyBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    readyBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2B5E35',
    },
    inspectValuesSmallBtn: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
        backgroundColor: '#EBF3FA',
    },
    inspectValuesSmallBtnText: {
        fontSize: 10,
        color: '#1B4D7E',
        fontWeight: '600',
    },
    missingMeasuresAlertBox: {
        backgroundColor: '#FFF1F0',
        borderRadius: 4,
        padding: 10,
        borderWidth: 1,
        borderColor: '#FFA39E',
        marginTop: 4,
    },
    missingMeasuresAlertTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#CF1322',
        marginBottom: 4,
    },
    missingMeasureCodeItem: {
        fontSize: 10,
        color: '#CF1322',
        lineHeight: 14,
    },
    missingMeasureRectifyBtn: {
        marginTop: 8,
        backgroundColor: '#CF1322',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    missingMeasureRectifyBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Flujo A Sub-navigation
    flujoANavTabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        marginBottom: 8,
    },
    flujoANavTab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    flujoANavTabActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    flujoANavTabText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#766B62',
        letterSpacing: 0.5,
    },
    flujoANavTabTextActive: {
        color: '#FFFFFF',
    },

    // Persistent Workflow Banner
    persistentWorkflowCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 16,
        marginBottom: 16,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(23, 20, 17, 0.05)',
            },
            default: {
                elevation: 1,
            },
        }),
    },
    persistentWorkflowTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 8,
    },
    persistentWorkflowPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        borderWidth: 1,
        borderColor: '#A78350',
    },
    persistentWorkflowPillText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 1.2,
    },
    persistentWorkflowTagline: {
        fontSize: 11,
        color: '#766B62',
        fontStyle: 'italic',
    },
    persistentWorkflowGridWrap: {
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0E8DD',
        gap: 10,
    },
    persistentWorkflowPrimaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: '#FCFAF6',
        padding: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EFE6D8',
    },
    persistentWorkflowPrimaryCol: {
        flex: 1,
        minWidth: 120,
    },
    persistentWorkflowPrimaryLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 1,
        marginBottom: 2,
    },
    persistentWorkflowPrimaryVal: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
        letterSpacing: 0.3,
    },
    persistentWorkflowSecondaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 4,
        paddingTop: 2,
    },
    persistentWorkflowSecondaryCol: {
        flex: 1,
        minWidth: 95,
    },
    persistentWorkflowSecondaryLabel: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#8C8275',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    persistentWorkflowSecondaryVal: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#423D35',
    },
    persistentWorkflowDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0E8DD',
    },
    persistentWorkflowDetailCol: {
        minWidth: 100,
    },
    persistentWorkflowLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    persistentWorkflowVal: {
        fontSize: 12,
        fontWeight: '600',
        color: '#171411',
    },

    // Creation Pattern Detail & History
    creationPatternDetailBox: {
        backgroundColor: '#FDFCFB',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 10,
        marginTop: 8,
    },
    creationPatternDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    creationPatternDetailLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.5,
    },
    creationPatternDetailVal: {
        fontSize: 11,
        fontWeight: '600',
        color: '#171411',
    },
    creationHistoryHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.5,
        marginTop: 10,
        marginBottom: 4,
    },
    creationNoPatternsText: {
        fontSize: 10,
        color: '#766B62',
        fontStyle: 'italic',
    },
    creationHistoryPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    creationHistoryPill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    creationHistoryPillActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    creationHistoryPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#171411',
    },
    creationHistoryPillTextActive: {
        color: '#FFFFFF',
    },
    creationHistoryPillSub: {
        fontSize: 8,
        color: '#766B62',
    },
    creationHistoryPillSubActive: {
        color: '#D4C5B3',
    },

    // Diagnostic styles
    diagnosticHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    diagnosticStatusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1,
    },
    diagStatusReady: {
        backgroundColor: '#F6FFED',
        borderColor: '#B7EB8F',
    },
    diagStatusIncomplete: {
        backgroundColor: '#FFF2E8',
        borderColor: '#FFBB96',
    },
    diagnosticStatusBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    diagStatusReadyText: {
        color: '#389E0D',
    },
    diagStatusIncompleteText: {
        color: '#D4380D',
    },
    diagReadyDetailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    missingMeasuresListTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#CF1322',
        marginBottom: 4,
    },
    hubCardActionSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A78350',
        marginBottom: 4,
        letterSpacing: 0.3,
    },

    // Estilos de la Primera Zona de Flujo A (Jerarquía Editorial de Medidas)
    clientSummaryHeaderEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: '#A78350',
        marginBottom: 2,
    },
    clientLatestSessionCard: {
        backgroundColor: '#FBF9F5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6DFC8',
        padding: 12,
        marginTop: 10,
    },
    clientLatestSessionTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clientLatestSessionLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#8C7749',
        letterSpacing: 0.8,
    },
    clientLatestSessionCount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
        marginTop: 1,
    },
    clientLatestStatusPill: {
        backgroundColor: '#EBF6EE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#C3E2CC',
    },
    clientLatestStatusText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#28733E',
        letterSpacing: 0.5,
    },
    clientLatestSessionMeta: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#EFE9DE',
    },
    clientLatestSessionMetaTitle: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#2A2723',
    },
    clientLatestSessionMetaSub: {
        fontSize: 10.5,
        color: '#766B62',
        marginTop: 2,
    },
    clientLatestActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        flexWrap: 'wrap',
    },
    clientQuickActionBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8CEB8',
    },
    clientQuickActionBtnPrimary: {
        backgroundColor: '#A78350',
        borderColor: '#8C6C38',
    },
    clientQuickActionText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#4A4237',
    },
    clientQuickActionTextPrimary: {
        color: '#FFFFFF',
    },
    anatomySummaryCard: {
        backgroundColor: '#F8F5EE',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2D8C3',
        padding: 12,
        marginTop: 10,
    },
    anatomySummaryHeader: {
        marginBottom: 8,
    },
    anatomySummaryEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#A78350',
    },
    anatomySummaryTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
        marginTop: 2,
    },
    anatomySummarySub: {
        fontSize: 10.5,
        color: '#6E6659',
        marginTop: 2,
    },
    anatomyToggleRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    anatomyToggleBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8CEB8',
    },
    anatomyToggleText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#5C5446',
    },
    collapseToggleBtnSmall: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#FAF7F0',
        borderWidth: 1,
        borderColor: '#D8CEB8',
    },
    collapseToggleBtnSmallText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8C7749',
    },
    catalogMetricsStrip: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        backgroundColor: '#FBF9F5',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E8DFD1',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginVertical: 10,
        gap: 12,
    },
    catalogMetricCell: {
        flex: 1,
        minWidth: 140,
    },
    catalogMetricLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    catalogMetricValue: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#171411',
    },
    catalogMetricDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E8DFD1',
    },
    measureCategorySectionBanner: {
        backgroundColor: '#F5EFEB',
        borderRadius: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginTop: 14,
        marginBottom: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#A78350',
    },
    measureCategorySectionBadge: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#8C6C38',
        letterSpacing: 1,
    },
    exportMenuBtn: {
        backgroundColor: 'rgba(212, 175, 55, 0.14)',
        borderColor: '#D4AF37',
        borderWidth: 1.5,
    },
    exportMenuBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#996B1F',
        letterSpacing: 0.3,
    },
    exportMenuBackdrop: {
        ...Platform.select({
            web: {
                position: 'fixed' as any,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9998,
            },
            default: {
                position: 'absolute' as any,
                top: -1000,
                left: -1000,
                right: -1000,
                bottom: -1000,
                zIndex: 9998,
            },
        }),
    },
    exportDropdownMenu: {
        position: 'absolute',
        top: 36,
        left: 0,
        width: 320,
        backgroundColor: '#FFFFFF',
        borderColor: '#D4AF37',
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 6,
        zIndex: 99999,
        ...Platform.select({
            web: {
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
            },
            default: {
                elevation: 30,
            },
        }),
    },
    exportDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F5EFEB',
    },
    exportItemIcon: {
        fontSize: 18,
    },
    exportItemTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1815',
    },
    exportItemSub: {
        fontSize: 10,
        color: '#766B62',
        marginTop: 1,
    },
    coveragePill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    coveragePillText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    directAnatomyToggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        marginLeft: 'auto',
    },
    directAnatomyToggleBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.accent,
        letterSpacing: 0.5,
    },
    directAnatomyWorkspaceWrapper: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
    },
    sessionChangedAlertBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FFF7E6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFE7BA',
    },
    sessionChangedAlertText: {
        fontSize: 12,
        color: '#D46B08',
        lineHeight: 18,
        fontWeight: '500',
    },
    estimatedMeasuresNoticeBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FFFBE6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFE58F',
    },
    estimatedMeasuresNoticeTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D48806',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    estimatedMeasuresNoticeText: {
        fontSize: 12,
        color: '#874D00',
        lineHeight: 18,
    },
    estimatedModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    estimatedModalCard: {
        width: '100%',
        maxWidth: 620,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    estimatedModalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 12,
    },
    estimatedModalIcon: {
        fontSize: 28,
    },
    estimatedModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    estimatedModalSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    estimatedModalSectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    estimatedModalList: {
        maxHeight: 180,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        marginBottom: 14,
    },
    estimatedModalListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    estimatedItemName: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    estimatedItemCode: {
        fontSize: 10,
        color: colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    estimatedItemVal: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D48806',
    },
    estimatedItemValSub: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    estimatedModalNotice: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 14,
    },
    estimatedReviewDetailsBox: {
        padding: 12,
        backgroundColor: '#FFFBE6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFE58F',
        marginBottom: 16,
    },
    estimatedReviewDetailsTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#874D00',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    estimatedReviewDetailsText: {
        fontSize: 11,
        color: '#874D00',
        lineHeight: 16,
    },
    estimatedModalActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
    },
    estimatedBtnSecondary: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
    },
    estimatedBtnSecondaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    estimatedBtnReview: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 4,
        backgroundColor: '#FFF8E7',
        borderWidth: 1,
        borderColor: '#FCE7B2',
    },
    estimatedBtnReviewText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#996B1F',
    },
    estimatedBtnPrimary: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: colors.accent,
    },
    estimatedBtnPrimaryText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // =========================================================================
    // ESTILOS EXCLUSIVOS FLUJO D · PATRÓN LIBRE / BANCO GLOBAL
    // =========================================================================
    freePatternLeftBadgeRow: {
        marginBottom: 8,
    },
    freePatternLeftBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(167, 131, 80, 0.15)',
        borderWidth: 1,
        borderColor: '#A78350',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    freePatternLeftNotice: {
        marginTop: 10,
        padding: 10,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        borderRadius: 4,
    },

    // Hero Card Exclusivo Flujo D
    freePatternHeroCard: {
        flexDirection: 'row',
        backgroundColor: '#1E1A16',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#A78350',
        overflow: 'hidden',
        marginBottom: 16,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
    },
    freePatternHeroCardMobile: {
        flexDirection: 'column',
    },
    freePatternHeroContent: {
        flex: 1.2,
        padding: 24,
        justifyContent: 'center',
    },
    freePatternHeroEyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    freePatternHeroStar: {
        color: '#D4AF37',
        fontSize: 14,
    },
    freePatternHeroEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: '#A78350',
    },
    freePatternHeroTag: {
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        borderWidth: 1,
        borderColor: '#D4AF37',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
    },
    freePatternHeroTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F8F2E9',
        letterSpacing: 0.5,
    },
    freePatternHeroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F8F2E9',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 6,
    },
    freePatternHeroSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#DFC293',
        marginBottom: 8,
    },
    freePatternHeroDescription: {
        fontSize: 12,
        color: '#B5A99B',
        lineHeight: 18,
        marginBottom: 14,
    },
    freePatternHeroBadgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    freePatternHeroBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(230, 217, 200, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    freePatternHeroBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#E6D9C8',
    },
    freePatternHeroImageWrapper: {
        flex: 1,
        minHeight: 220,
        position: 'relative',
    },
    freePatternHeroImageWrapperMobile: {
        width: '100%',
        height: 180,
    },
    freePatternHeroImage: {
        width: '100%',
        height: '100%',
    },
    freePatternHeroImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.25)',
    },
    freePatternHeroImageCaption: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.4)',
    },
    freePatternHeroImageCaptionText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#DFC293',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    // Acciones opcionales no bloqueantes
    persistentWorkflowOptionalActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
    },
    optionalActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.4)',
    },
    optionalActionBtnActive: {
        backgroundColor: 'rgba(167, 131, 80, 0.2)',
        borderColor: '#A78350',
    },
    optionalActionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#E6D9C8',
    },
    optionalActionBtnTextActive: {
        color: '#D4AF37',
        fontWeight: '700',
    },
    optionalActionBtnDisabled: {
        opacity: 0.45,
        borderColor: 'rgba(167, 131, 80, 0.2)',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    optionalActionBtnTextDisabled: {
        color: '#8C8275',
    },
    freePatternStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    freePatternStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    freePatternStatusText: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.8,
    },

    // Sección de Catálogo de Perfiles de Referencia
    freePatternReferenceSection: {
        marginTop: 16,
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 24,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(23, 20, 17, 0.05)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    referenceSectionHeader: {
        marginBottom: 16,
        alignItems: 'center',
    },
    referenceSectionBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 6,
    },
    referenceSectionBadge: {
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 3.5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    referenceSectionStartBadge: {
        backgroundColor: 'rgba(23, 20, 17, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#D8D1C7',
    },
    referenceSectionStartBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.8,
    },
    referenceSectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#171411',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        letterSpacing: 0.5,
        marginBottom: 4,
        textAlign: 'center',
    },
    referenceSectionSubtitle: {
        fontSize: 12.5,
        color: '#766B62',
        lineHeight: 18,
        textAlign: 'center',
        maxWidth: 680,
    },
    referenceSectionNoteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FCFAF6',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 12,
        borderRadius: 6,
        marginTop: 12,
        maxWidth: 760,
        alignSelf: 'center',
    },
    referenceSectionNoteIcon: {
        fontSize: 14,
    },
    referenceSectionNoteText: {
        flex: 1,
        fontSize: 11.5,
        color: '#8A6A4A',
        lineHeight: 17,
    },

    // Tabs Demográficos
    referenceDemographicTabs: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
        justifyContent: 'center',
    },
    referenceDemographicTab: {
        flex: 1,
        minWidth: 120,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#FAF7F2',
        borderWidth: 1.5,
        borderColor: '#E8E0D2',
        borderRadius: 8,
        alignItems: 'center',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    referenceDemographicTabActive: {
        backgroundColor: '#171411',
        borderColor: '#A78350',
        ...Platform.select({
            web: {
                boxShadow: '0 4px 12px rgba(23, 20, 17, 0.22)',
            },
        }),
    },
    referenceDemographicTabIcon: {
        fontSize: 18,
        marginBottom: 4,
    },
    referenceDemographicTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#423D35',
        letterSpacing: 0.3,
    },
    referenceDemographicTabTextActive: {
        color: '#DFC293',
        letterSpacing: 0.5,
    },
    referenceDemographicTabSub: {
        fontSize: 9.5,
        color: '#8C8275',
        marginTop: 2,
    },

    // Tarjeta de Cotas Personalizadas Prompt
    customMeasurementsPromptCard: {
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        borderRadius: 6,
        padding: 16,
    },
    customMeasurementsPromptHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    customPromptIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(167, 131, 80, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customPromptIcon: {
        fontSize: 18,
    },
    customPromptTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    customPromptSubtitle: {
        fontSize: 11,
        color: '#8A6A4A',
        fontWeight: '600',
        marginBottom: 6,
    },
    customPromptDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    customPromptActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E6D9C8',
    },
    customPromptPrimaryBtn: {
        backgroundColor: '#171411',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    customPromptPrimaryBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DFC293',
        letterSpacing: 0.5,
    },

    // Selector de Tallas de Referencia
    referenceSizesCard: {
        backgroundColor: '#FCFAF6',
        borderWidth: 1,
        borderColor: '#E8E0D2',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    referenceSizesTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    referenceSizesHeaderLabel: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#8A6A4A',
    },
    referenceSizesHint: {
        fontSize: 11,
        color: '#8C8275',
        fontStyle: 'italic',
    },
    referenceSizeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 6,
        justifyContent: 'center',
    },
    referenceSizeChip: {
        paddingVertical: 9,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E8E0D2',
        borderRadius: 6,
        alignItems: 'center',
        minWidth: 64,
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    referenceSizeChipActive: {
        backgroundColor: '#171411',
        borderColor: '#A78350',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(167, 131, 80, 0.28)',
            },
        }),
    },
    referenceSizeChipText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#171411',
    },
    referenceSizeChipTextActive: {
        color: '#DFC293',
    },
    referenceSizeChipEquiv: {
        fontSize: 9.5,
        color: '#8C8275',
        marginTop: 2,
    },
    referenceSizeChipEquivActive: {
        color: '#E6D9C8',
    },

    // Dossier de Perfil Seleccionado
    selectedProfileDossier: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E0D4C3',
        borderRadius: 8,
        padding: 18,
        marginTop: 14,
        ...Platform.select({
            web: {
                boxShadow: '0 3px 12px rgba(23, 20, 17, 0.05)',
            },
        }),
    },
    selectedProfileDossierHeader: {
        marginBottom: 12,
    },
    selectedProfileBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    selectedProfileBadge: {
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        borderWidth: 1,
        borderColor: '#A78350',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 4,
    },
    selectedProfileTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#171411',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        marginTop: 3,
        marginBottom: 2,
    },
    selectedProfileDesc: {
        fontSize: 12,
        color: '#766B62',
        lineHeight: 18,
    },
    selectedProfileMeasuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginVertical: 14,
        padding: 12,
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EAE1D2',
        justifyContent: 'space-between',
    },
    selectedProfileMeasureCol: {
        width: '23%',
        minWidth: 100,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#EFE7DA',
    },
    spmLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8C8275',
        letterSpacing: 0.8,
        marginBottom: 3,
        textAlign: 'center',
    },
    spmVal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#171411',
        letterSpacing: 0.3,
    },
    selectedProfileActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
    },
    useProfileReferenceBtn: {
        backgroundColor: '#171411',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#A78350',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(23, 20, 17, 0.2)',
            },
        }),
    },
    useProfileReferenceBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DFC293',
        letterSpacing: 0.6,
    },
    editProfileReferenceBtn: {
        backgroundColor: '#FAF7F2',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D4C5B3',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    editProfileReferenceBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#423D35',
    },
    customSwitchBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    customSwitchBtnText: {
        fontSize: 11,
        color: '#8A6A4A',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    // Sección de Cierre de Banco
    bankClosureContainer: {
        marginTop: 24,
        marginBottom: 16,
        padding: 18,
        backgroundColor: '#1E1A16',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#A78350',
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
    },
    bankClosureHeader: {
        marginBottom: 14,
    },
    bankClosureBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        borderWidth: 1,
        borderColor: '#D4AF37',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
        marginBottom: 6,
    },
    bankClosureBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#DFC293',
        letterSpacing: 0.5,
    },
    bankClosureTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8F2E9',
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
        marginBottom: 4,
    },
    bankClosureSubtitle: {
        fontSize: 12,
        color: '#B5A99B',
        lineHeight: 18,
    },
    bankClosureActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
    },
    bankClosureSaveBtn: {
        backgroundColor: '#D4AF37',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 4,
    },
    bankClosureSaveBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#171411',
        letterSpacing: 0.5,
    },
    bankClosureExperimentBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 4,
    },
    bankClosureExperimentBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F8F2E9',
    },
    bankClosureBankBtn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    bankClosureBankBtnText: {
        fontSize: 12,
        color: '#DFC293',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    // Modal de Cotas Personalizadas
    customModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    customModalHeader: {
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: '#FAF7F2',
    },
    customModalSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#A78350',
        marginBottom: 4,
    },
    customModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    customModalSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    customModalBody: {
        maxHeight: 460,
        padding: 18,
    },
    customNoticeBox: {
        backgroundColor: 'rgba(167, 131, 80, 0.1)',
        borderWidth: 1,
        borderColor: '#A78350',
        padding: 10,
        borderRadius: 4,
        marginBottom: 16,
    },
    customNoticeText: {
        fontSize: 11,
        color: '#8A6A4A',
        lineHeight: 16,
    },
    customInputsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    customInputCol: {
        flex: 1,
        minWidth: 160,
        marginBottom: 10,
    },
    customInputLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    customInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
    },
    customInputField: {
        flex: 1,
        height: 38,
        fontSize: 13,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    customInputSuffix: {
        fontSize: 11,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    customModalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: '#FAF7F2',
    },
    customModalCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    customModalCancelBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    customModalApplyBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
        backgroundColor: '#171411',
        borderWidth: 1,
        borderColor: '#A78350',
    },
    customModalApplyBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DFC293',
        letterSpacing: 0.5,
    },

    // Modal de Asociación (Clienta / Creación)
    linkModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    linkModalHeader: {
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: '#FAF7F2',
    },
    linkModalSuper: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#A78350',
        marginBottom: 4,
    },
    linkModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    },
    linkModalSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    linkModalSearchInput: {
        height: 38,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        fontSize: 12,
        color: colors.textPrimary,
        margin: 14,
    },
    linkModalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    linkModalItemActive: {
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
    },
    linkAvatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#171411',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    linkAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DFC293',
    },
    linkItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    linkItemSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    linkItemCheck: {
        fontSize: 14,
        fontWeight: '700',
        color: '#A78350',
    },
    linkModalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: '#FAF7F2',
    },
    linkModalClearBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    linkModalClearBtnText: {
        fontSize: 11,
        color: '#990000',
        fontWeight: '600',
    },
    linkModalCloseBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: '#171411',
    },
    linkModalCloseBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
