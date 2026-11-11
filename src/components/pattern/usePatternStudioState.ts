import { useState, useEffect, useRef, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Client } from '../../types/client';
import { MeasurementSession } from '../../types/pattern/measurement';
import { Creation } from '../../types/creation';
import {
    GarmentType,
    PatternTemplate,
    PatternExecution,
    PatternStatus,
    PatternAdjustment,
    StructuredPatternAdjustment,
    AdjustmentType,
    AdjustmentUnit,
    AdjustmentDirection,
    FittingStatus,
    PatternValidationResult,
} from '../../types/pattern/pattern';
import { EaseProfile, GarmentDesignParameters } from '../../types/pattern/ease';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';
import { AnatomicalPerspective, BodyDemographicType } from '../../engine/pattern/catalog/anatomicalMapping';
import {
    ReferenceDemographic,
    findReferenceProfile,
    DEFAULT_REFERENCE_PROFILE,
    getProfilesByCategory,
    ReferenceProfile,
} from '../../engine/pattern/catalog/referenceProfiles';
import {
    GARMENT_PACKAGES,
    validateGarmentRequirements,
    classifyTemplateMeasurements,
    TemplateMeasurementDiagnostic,
} from '../../engine/pattern/catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';
import { fetchClients } from '../../services/clientService';
import {
    fetchClientMeasurementSessions,
    finalizeMeasurementSession,
} from '../../services/measurementService';
import {
    comparePatternExecutions,
    createMultiAdjustedChildExecution,
    fetchClientPatternExecutions,
    fetchPatternAdjustments,
    fetchPatternTemplates,
    PatternComparisonResult,
    STANDARD_EASE_PROFILES,
    HAUTE_COUTURE_REFERENCE_PROFILES,
    updatePatternStatus,
    validatePatternAdjustmentInput,
} from '../../services/patternService';
import { fetchCreations, updateCreation } from '../../services/creationService';
import {
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
    mergeExecutionHistory,
    CREATION_STATUS_LABELS,
    CREATION_TYPE_LABELS,
    describeSession,
    formatShortDateEs,
    CreationFlowSummary,
} from './creationFlow/creationFlowModel';
import { InfoRow, ZoomTarget, ContextInfoKind } from './creationFlow/CreationFlowViews';

export const formatDate = (dateStr?: string | null): string => {
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

export const formatSessionDate = (d?: string | null): string => {
    if (!d) return 'Sin fecha';
    const clean = d.includes('T') ? d.split('T')[0] : d;
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
};

export interface UsePatternStudioStateParams {
    initialClientId?: string | null;
    initialSessionId?: string | null;
    initialCreationId?: string | null;
    initialGarmentType?: GarmentType | null;
    initialWorkflow?: 'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern' | null;
}

export function usePatternStudioState({
    initialClientId,
    initialSessionId,
    initialCreationId,
    initialGarmentType,
    initialWorkflow,
}: UsePatternStudioStateParams) {
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
        const legacy = (HAUTE_COUTURE_REFERENCE_PROFILES as any[]).find((p: any) => p.code === selectedReferenceProfileCode);
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
        return (prof as ReferenceProfile).label.toUpperCase();
    }, [selectedReferenceProfileCode]);

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
        STANDARD_EASE_PROFILES.find((p: any) => p.is_default) || STANDARD_EASE_PROFILES[1]
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

    const isTabletPortrait = windowWidth < 1024;
    const [isFreeMannequinCollapsed, setIsFreeMannequinCollapsed] = useState<boolean>(false);
    const isFreeWorkflowTwoCol = activeWorkflow === 'free_pattern' && windowWidth >= 1320 && !isFreeMannequinCollapsed;
    const [isClientDrawerOpen, setIsClientDrawerOpen] = useState<boolean>(false);
    const [activeStudioTab, setActiveStudioTabRaw] = useState<'garment' | 'cad' | 'fitting' | 'specifications' | 'history'>('garment');

    const setActiveStudioTab = (tab: 'garment' | 'cad' | 'fitting' | 'specifications' | 'history') => {
        setActiveStudioTabRaw(tab);
        if (activeWorkflow === 'creation_pattern') {
            setActiveCreationStage(studioTabToStage(tab));
        }
    };
    const [showChecklistDetails, setShowChecklistDetails] = useState<boolean>(false);
    const [showMeasurementsBreakdown, setShowMeasurementsBreakdown] = useState<boolean>(false);
    const [isMannequinCollapsed, setIsMannequinCollapsed] = useState<boolean>(false);
    const [mannequinViewMode, setMannequinViewMode] = useState<'full_body' | 'torso'>('torso');
    const [mannequinPerspective, setMannequinPerspective] = useState<AnatomicalPerspective>('front');
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

    const handleOpenAddAdjustmentModal = () => {
        setAdjError(null);
        if (currentExecution?.geometry_result?.pieces && currentExecution.geometry_result.pieces.length > 0) {
            if (!selectedPieceIdForAdj) {
                setSelectedPieceIdForAdj(currentExecution.geometry_result.pieces[0].id);
            }
        }
        setIsAddAdjustmentModalOpen(true);
    };

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

    const handleRemoveStagedAdjustment = (id?: string) => {
        setStagedAdjustments((prev) => prev.filter((a) => a.id !== id));
    };

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
            setCurrentExecution(child);
            setGeometryResult(child.geometry_result);
            setValidationResult(child.validation_results);
            setPatternStatus(child.status);
            setSelectedEaseProfile(child.ease_profile_snapshot);
            setDesignParams(child.design_parameters);
            setExecutionHistory((prev) => [child, ...prev.filter((e) => e.id !== child.id)]);

            if (res.recordedAdjustments && res.recordedAdjustments.length > 0) {
                setAdjustmentsHistory((prev) => [...res.recordedAdjustments!, ...prev]);
            }

            const templateName = selectedTemplate ? selectedTemplate.name : 'Plantilla Base';
            setLastRegenerationResult({
                executionId: child.id,
                garmentName: (GARMENT_PACKAGES as any)[child.garment_type]?.name || child.garment_type,
                templateName,
                versionLabel: child.version_label,
                parentVersion: currentExecution.version_label,
                adjustmentsCount: stagedAdjustments.length,
                date: new Date(child.created_at).toLocaleString(),
                designer: 'Katherine Carroll (Alta Costura)',
            });

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

    useEffect(() => {
        if (currentExecution?.id && !currentExecution.id.startsWith('local_')) {
            fetchPatternAdjustments(currentExecution.id).then((adjs: any) => {
                setAdjustmentsHistory(adjs || []);
            });
        } else {
            setAdjustmentsHistory([]);
        }
    }, [currentExecution?.id]);

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

    useEffect(() => {
        loadTemplatesForGarment(garmentType);
    }, [garmentType]);

    const loadTemplatesForGarment = async (type: GarmentType) => {
        setLoadingTemplates(true);
        try {
            const list = await fetchPatternTemplates(type);
            setTemplates(list);
            if (list.length > 0) {
                const defaultTpl = list.find((t: any) => t.version === '1.0.0') || list[0];
                setSelectedTemplate(defaultTpl);
                if (!isEaseManuallySetByUser && defaultTpl.default_ease_profile_code) {
                    const matchingEase = (STANDARD_EASE_PROFILES as any[]).find(
                        (p: any) => p.code === defaultTpl.default_ease_profile_code
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
        if (!isEaseManuallySetByUser && tpl.default_ease_profile_code) {
            const matchingEase = (STANDARD_EASE_PROFILES as any[]).find(
                (p: any) => p.code === tpl.default_ease_profile_code
            );
            if (matchingEase) {
                setSelectedEaseProfile(matchingEase);
            }
        }
    };

    const handleApplySuggestedEase = () => {
        if (!selectedTemplate?.default_ease_profile_code) return;
        const matchingEase = (STANDARD_EASE_PROFILES as any[]).find(
            (p: any) => p.code === selectedTemplate.default_ease_profile_code
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
                const found = list.find((c: any) => c.id === initialClientId);
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

    const clientSwitchRequestIdRef = useRef<number>(0);

    useEffect(() => {
        const requestId = ++clientSwitchRequestIdRef.current;

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

        fetchClientPatternExecutions(clientId).then((execs: any) => {
            if (clientSwitchRequestIdRef.current !== requestId) return;
            const validExecs = execs || [];
            setExecutionHistory((prev) => mergeExecutionHistory(prev, validExecs, clientId));
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

    useEffect(() => {
        if (activeWorkflow === 'free_pattern') {
            setSelectedClient(null);
            setSelectedCreation(null);
            setSelectedSession(null);
            setClientCreations([]);
            setSessions([]);
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

        if (selectedCreation.garment_type && isKnownGarmentType(selectedCreation.garment_type)) {
            setGarmentType(selectedCreation.garment_type);
        } else {
            setGarmentType(null as any);
        }

        const resolved = resolveActiveExecution(selectedCreation, executionHistory);
        if (resolved) {
            setCurrentExecution(resolved);
            setGeometryResult(resolved.geometry_result);
            setValidationResult(resolved.validation_results);
            setPatternStatus(resolved.status);
            setSelectedEaseProfile(resolved.ease_profile_snapshot);
            setDesignParams(resolved.design_parameters);
        } else if (currentExecution && currentExecution.creation_id === selectedCreation.id && currentExecution.geometry_result) {
            // Preservar ejecución ya confirmada
        } else {
            setCurrentExecution(null);
            setGeometryResult(null);
            setValidationResult(null);
            setAdjustmentsHistory([]);
        }
    }, [selectedCreation, executionHistory, activeWorkflow]);

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

    const loadClientCreations = async (clientId: string, expectedRequestId?: number) => {
        setLoadingCreations(true);
        try {
            const res = await fetchCreations({ clientId });
            if (expectedRequestId !== undefined && clientSwitchRequestIdRef.current !== expectedRequestId) return;
            const list = res.data || [];
            setClientCreations(list);
            if (initialCreationId) {
                const matched = list.find((cr: any) => cr.id === initialCreationId);
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
                setSelectedCreation((prev) => (prev ? list.find((c: any) => c.id === prev.id) || null : null));
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
                const found = clientSessions.find((s: any) => s.id === targetId);
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
        const refProfileMm = (HAUTE_COUTURE_REFERENCE_PROFILES as any[]).find((p: any) => p.code === 'size_40')?.measurementsMm || (HAUTE_COUTURE_REFERENCE_PROFILES as any[])[1]?.measurementsMm;
        return classifyTemplateMeasurements(
            garmentType,
            selectedTemplate.required_measurements,
            activeMeasurementsMm,
            refProfileMm
        );
    }, [selectedTemplate, garmentType, activeMeasurementsMm]);

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

    const creationGateActive = activeWorkflow === 'creation_pattern' && (!selectedClient || !selectedCreation);

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
            const linkedSession = sessions.find((ses: any) => ses.id === cr.session_id);
            if (linkedSession) setSelectedSession(linkedSession);
        }
        setActiveCreationStage('creation');
    };

    const handleChangeCreationContext = () => {
        creationContextConfirmedRef.current = false;
        setSelectedCreation(null);
        setActiveCreationStage('creation');
    };

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

    const handleFinalizeSelectedSession = async () => {
        if (!selectedSession) return;
        const res = await finalizeMeasurementSession(selectedSession.id);
        if (res.success) {
            const updated: MeasurementSession = { ...selectedSession, status: 'completed' };
            setSelectedSession(updated);
            setSessions(sessions.map((s: any) => (s.id === updated.id ? updated : s)));
            setStatusMessage({
                text: `Sesión de medidas v${selectedSession.version_number} finalizada y blindada contra modificaciones.`,
                type: 'success',
            });
        } else {
            setStatusMessage({ text: res.error || 'Error al finalizar sesión.', type: 'error' });
        }
    };

    return {
        role,
        user,
        profile,
        activeWorkflow,
        setActiveWorkflow,
        activeWorkflowRef,
        creationContextConfirmedRef,
        clientCreations,
        setClientCreations,
        selectedCreation,
        setSelectedCreation,
        loadingCreations,
        setLoadingCreations,
        activeCreationStage,
        setActiveCreationStage,
        creationZoomTarget,
        setCreationZoomTarget,
        activeInfoKind,
        setActiveInfoKind,
        selectedReferenceDemographic,
        setSelectedReferenceDemographic,
        selectedReferenceProfileCode,
        setSelectedReferenceProfileCode,
        freeMeasurements,
        setFreeMeasurements,
        freePatternProfileLabel,
        currentReferenceProfile,
        freePatternShortSubtitle,
        handleSelectReferenceDemographic,
        associatedClientId,
        setAssociatedClientId,
        associatedClientName,
        setAssociatedClientName,
        associatedCreationId,
        setAssociatedCreationId,
        associatedCreationName,
        setAssociatedCreationName,
        isLinkClientModalOpen,
        setIsLinkClientModalOpen,
        isLinkCreationModalOpen,
        setIsLinkCreationModalOpen,
        linkSearchQuery,
        setLinkSearchQuery,
        customMeasurementsDraft,
        setCustomMeasurementsDraft,
        viewingDerivedSessionId,
        setViewingDerivedSessionId,
        flujoAView,
        setFlujoAView,
        isCustomMeasurementsOpen,
        setIsCustomMeasurementsOpen,
        clients,
        setClients,
        selectedClient,
        setSelectedClient,
        loadingClients,
        sessions,
        setSessions,
        selectedSession,
        setSelectedSession,
        modalPreviousSession,
        setModalPreviousSession,
        isMeasurementModalOpen,
        setIsMeasurementModalOpen,
        garmentType,
        setGarmentType,
        selectedEaseProfile,
        setSelectedEaseProfile,
        designParams,
        setDesignParams,
        templates,
        setTemplates,
        selectedTemplate,
        setSelectedTemplate,
        loadingTemplates,
        isEaseManuallySetByUser,
        setIsEaseManuallySetByUser,
        isMobile,
        isTablet,
        isDesktop,
        isTabletPortrait,
        isFreeMannequinCollapsed,
        setIsFreeMannequinCollapsed,
        isFreeWorkflowTwoCol,
        isClientDrawerOpen,
        setIsClientDrawerOpen,
        activeStudioTab,
        setActiveStudioTab,
        showChecklistDetails,
        setShowChecklistDetails,
        showMeasurementsBreakdown,
        setShowMeasurementsBreakdown,
        isMannequinCollapsed,
        setIsMannequinCollapsed,
        mannequinViewMode,
        setMannequinViewMode,
        mannequinPerspective,
        setMannequinPerspective,
        selectedMeasureCode,
        setSelectedMeasureCode,
        previousSelectedMeasureCode,
        activeGuideModalCode,
        handleOpenMeasureGuide,
        handleCloseMeasureGuide,
        handleHighlightInMannequin,
        expandedMeasureCategories,
        toggleMeasureCategory,
        isExportMenuOpen,
        setIsExportMenuOpen,
        isMeasuresTableCollapsed,
        setIsMeasuresTableCollapsed,
        showMmEquivalencies,
        setShowMmEquivalencies,
        isDirectAnatomyCollapsed,
        setIsDirectAnatomyCollapsed,
        lastGeneratedSessionId,
        setLastGeneratedSessionId,
        showEstimatedModal,
        setShowEstimatedModal,
        allowEstimatedGeneration,
        setAllowEstimatedGeneration,
        showEstimatedDetailsReview,
        setShowEstimatedDetailsReview,
        statusMessage,
        setStatusMessage,
        activeResultsTab,
        setActiveResultsTab,
        isGenerating,
        setIsGenerating,
        geometryResult,
        setGeometryResult,
        validationResult,
        setValidationResult,
        currentExecution,
        setCurrentExecution,
        patternStatus,
        setPatternStatus,
        executionHistory,
        setExecutionHistory,
        adjustmentsHistory,
        setAdjustmentsHistory,
        lastExportInfo,
        setLastExportInfo,
        isAdjustmentsModalOpen,
        setIsAdjustmentsModalOpen,
        isCopilotModalOpen,
        setIsCopilotModalOpen,
        isProductionModalOpen,
        setIsProductionModalOpen,
        isApprovalConfirmOpen,
        setIsApprovalConfirmOpen,
        isComparisonModalOpen,
        setIsComparisonModalOpen,
        comparisonResult,
        setComparisonResult,
        isReturnModalOpen,
        setIsReturnModalOpen,
        returnReason,
        setReturnReason,
        returnObservation,
        setReturnObservation,
        stagedAdjustments,
        setStagedAdjustments,
        isAddAdjustmentModalOpen,
        setIsAddAdjustmentModalOpen,
        selectedPieceIdForAdj,
        setSelectedPieceIdForAdj,
        adjType,
        setAdjType,
        adjZone,
        setAdjZone,
        adjLocation,
        setAdjLocation,
        adjValue,
        setAdjValue,
        adjUnit,
        setAdjUnit,
        adjDirection,
        setAdjDirection,
        adjMotive,
        setAdjMotive,
        adjObservation,
        setAdjObservation,
        adjError,
        setAdjError,
        fittingNotes,
        setFittingNotes,
        isRegenerateConfirmOpen,
        setIsRegenerateConfirmOpen,
        isRegenerating,
        setIsRegenerating,
        lastRegenerationResult,
        setLastRegenerationResult,
        fittingStatus,
        freePatternLifecycleState,
        handleSelectGarmentInGrid,
        handleSelectAdjType,
        handleOpenAddAdjustmentModal,
        handleAddAdjustment,
        handleRemoveStagedAdjustment,
        handleOpenRegenerateConfirm,
        handleExecuteRegenerateWithAdjustments,
        handleOpenComparison,
        handleConfirmReturnToReview,
        handleSelectExecution,
        loadTemplatesForGarment,
        handleSelectTemplate,
        handleApplySuggestedEase,
        loadClients,
        loadClientCreations,
        loadClientSessions,
        handleAssignGarmentToCreation,
        activeMeasurementsMm,
        currentRequirementsCheck,
        templateRequirementsCheck,
        templateMeasurementDiagnostic,
        garmentDiagnosis,
        creationFlowSummary,
        creationTimelineNodes,
        handleSelectCreationStage,
        creationGateActive,
        isStudioTabShown,
        handleOpenCreation,
        handleChangeCreationContext,
        handleChangeCreationClient,
        activeInfoSheetData,
        validationChecklist,
        handleFinalizeSelectedSession,
        formatDate,
        formatSessionDate,
    };
}

export type PatternStudioState = ReturnType<typeof usePatternStudioState>;
