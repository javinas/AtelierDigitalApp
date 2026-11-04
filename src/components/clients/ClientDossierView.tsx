// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: EXPEDIENTE INTEGRAL DE CLIENTA (ALTA COSTURA)
// Archivo: src/components/clients/ClientDossierView.tsx
// ==============================================================================
// MÓDULO 02 · MEJORA DE TRAZABILIDAD DE CLIENTA, MEDIDAS Y PATRONES
// Trazabilidad Funcional Visible y Navegable:
// CLIENTA → SESIONES DE MEDIDAS → EJECUCIONES DE PATRÓN → CREACIÓN → LINAJE
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import { getEditorialAvatarSource } from '../../utils/clientAvatarHelper';
import { Creation } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { GarmentType, PatternAdjustment, PatternExecution, PatternStatus } from '../../types/pattern/pattern';
import { fetchClientMeasurementSessions } from '../../services/measurementService';
import { fetchCreations } from '../../services/creationService';
import { fetchClientPatternExecutions, fetchPatternAdjustments } from '../../services/patternService';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { MASTER_MEASUREMENT_CATALOG } from '../../engine/pattern/catalog/masterCatalog';
import {
    calculateClientPatternStats,
    groupClientPatternsByLineage,
    ConceptualPatternGroup,
} from '../../utils/clientPatternLineageHelper';
import { PersonGroupSection } from './PersonGroupSection';
import { DemographicCategory, DEMOGRAPHIC_LABELS, MeasuredPerson, MeasurementGroup } from '../../types/personGroup';
import { MeasurementCampaign } from '../../types/pattern/measurementCampaign';
import { fetchClientPersons, fetchClientGroups } from '../../services/personGroupService';
import { fetchClientCampaigns } from '../../services/measurementCampaignService';
import { AtelierFastMeasurementCaptureModal } from '../pattern/AtelierFastMeasurementCaptureModal';
import { PersonCreationCadWizardModal } from '../pattern/PersonCreationCadWizardModal';
import {
    CREATION_EDITORIAL_IMAGES,
    DEFAULT_CREATION_IMAGE,
    getCreationPhoto,
} from '../creations/CreationsModule';
import { AtelierGrandAnatomicalMannequin } from '../pattern/AtelierGrandAnatomicalMannequin';
import { printA4MeasurementSheet } from '../../utils/printMeasurementSheetHelper';
import { AnatomicalPerspective, BodyDemographicType } from '../../engine/pattern/catalog/anatomicalMapping';

const DEMOGRAPHIC_AVATARS: Record<string, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

const getPatternGarmentPhoto = (garmentType: string, creation?: Creation | null): any => {
    if (creation) {
        return getCreationPhoto(creation);
    }
    const key = (garmentType || 'jacket').toLowerCase();
    return CREATION_EDITORIAL_IMAGES[key] || CREATION_EDITORIAL_IMAGES.jacket || DEFAULT_CREATION_IMAGE;
};

interface ClientDossierViewProps {
    client: Client;
    onBack: () => void;
    onEditClient?: (client: Client) => void;
    onOpenCad?: (params: {
        clientId: string;
        sessionId?: string | null;
        creationId?: string | null;
        garmentType?: GarmentType | null;
        executionId?: string | null;
    }) => void;
    onOpenCreation?: (creationId: string) => void;
}

type DossierTab = 'overview' | 'sessions' | 'creations' | 'patterns' | 'persons_groups';

export function ClientDossierView({
    client,
    onBack,
    onEditClient,
    onOpenCad,
    onOpenCreation,
}: ClientDossierViewProps) {
    const [activeTab, setActiveTab] = useState<DossierTab>('overview');
    const [loading, setLoading] = useState<boolean>(true);

    // Datos relacionales
    const [sessions, setSessions] = useState<MeasurementSession[]>([]);
    const [creations, setCreations] = useState<Creation[]>([]);
    const [patterns, setPatterns] = useState<PatternExecution[]>([]);
    const [persons, setPersons] = useState<MeasuredPerson[]>([]);
    const [groups, setGroups] = useState<MeasurementGroup[]>([]);
    const [campaigns, setCampaigns] = useState<MeasurementCampaign[]>([]);

    // Filtro interactivo por sesión para la pestaña de patrones
    const [filterSessionId, setFilterSessionId] = useState<string | null>(null);

    // Modal para inspeccionar medidas detalladas de una sesión
    const [selectedSessionForView, setSelectedSessionForView] = useState<MeasurementSession | null>(null);

    // Estados Fase B2 — Rediseño de Consulta e Historial de Sesiones de Medidas
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all'); // 'all' | 'titular' | personId
    const [selectedSessionStatusFilter, setSelectedSessionStatusFilter] = useState<string>('all'); // 'all' | 'draft' | 'verified' | 'completed'
    const [sessionsSearchQuery, setSessionsSearchQuery] = useState<string>('');
    const [sessionSortOrder, setSessionSortOrder] = useState<'desc' | 'asc'>('desc');
    const [compareBaseSession, setCompareBaseSession] = useState<MeasurementSession | null>(null);
    const [compareTargetSession, setCompareTargetSession] = useState<MeasurementSession | null>(null);
    const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
    const [inspectorCategoryFilter, setInspectorCategoryFilter] = useState<string>('all');
    const [inspectorViewMode, setInspectorViewMode] = useState<'grid' | 'mannequin'>('grid');
    const [inspectorPerspective, setInspectorPerspective] = useState<AnatomicalPerspective>('front');
    const [inspectorSelectedCode, setInspectorSelectedCode] = useState<string | null>(null);
    const [inspectorMannequinMode, setInspectorMannequinMode] = useState<'full_body' | 'torso'>('full_body');
    const [inspectorDensityMode, setInspectorDensityMode] = useState<'summary' | 'all'>('all');
    const [inspectorDemographic, setInspectorDemographic] = useState<BodyDemographicType>('woman');
    const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');

    // Diccionario de personas medidas por ID (declarado antes de los effects que lo usan)
    const personMap = useMemo(() => {
        const map = new Map<string, MeasuredPerson>();
        persons.forEach((p) => map.set(p.id, p));
        return map;
    }, [persons]);

    // Diferenciación de cliente institucional vs individual
    const isInstitutional = useMemo(() => {
        if ((client as any).client_type === 'institutional') return true;
        return groups.some((g) => g.type === 'school' || g.type === 'corporate');
    }, [client, groups]);

    // Sincronización reactiva del inspector anatómico al abrir una sesión
    // Derivamos la demografía sin setState dentro del effect para evitar ciclos
    const derivedInspectorDemographic = useMemo<BodyDemographicType>(() => {
        if (selectedSessionForView) {
            const p = selectedSessionForView.person_id ? personMap.get(selectedSessionForView.person_id) : null;
            const cat = p?.demographic_category;
            if (cat === 'boy' || cat === 'girl' || cat === 'man' || cat === 'woman') {
                return cat;
            }
        }
        return 'woman';
    }, [selectedSessionForView, personMap]);

    useEffect(() => {
        if (selectedSessionForView) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setInspectorDemographic(derivedInspectorDemographic);
            setInspectorMannequinMode('full_body');
            setInspectorDensityMode('all');
            setInspectorPerspective('front');
            setInspectorSelectedCode(null);
        }
    }, [selectedSessionForView?.id, derivedInspectorDemographic]);

    // Estados Filtro y Búsqueda — Creaciones & Encargos
    const [creationSubjectFilter, setCreationSubjectFilter] = useState<string>('all'); // 'all' | 'titular' | personId
    const [creationStatusFilter, setCreationStatusFilter] = useState<string>('all');
    const [creationSearchQuery, setCreationSearchQuery] = useState<string>('');
    const [creationSubjectSearchQuery, setCreationSubjectSearchQuery] = useState<string>('');
    const [creationSortOrder, setCreationSortOrder] = useState<'desc' | 'asc'>('desc');

    // Estados Fase C — Captura Rápida de Medidas y Puente CAD
    const [showFastCaptureModal, setShowFastCaptureModal] = useState<boolean>(false);
    const [captureSubjectPerson, setCaptureSubjectPerson] = useState<MeasuredPerson | null>(null);
    const [captureDraftSession, setCaptureDraftSession] = useState<MeasurementSession | null>(null);

    const [showCadWizardModal, setShowCadWizardModal] = useState<boolean>(false);
    const [cadWizardPerson, setCadWizardPerson] = useState<MeasuredPerson | null>(null);
    const [cadWizardSessionId, setCadWizardSessionId] = useState<string | null>(null);

    const handleOpenFastCapture = (person?: MeasuredPerson | null, draftSession?: MeasurementSession | null) => {
        if (!person && isInstitutional && persons.length > 0) {
            // En clientes institucionales, el titular es una entidad jurídica. Asignar por defecto el primer sujeto o redirigir
            setCaptureSubjectPerson(persons[0]);
        } else {
            setCaptureSubjectPerson(person || null);
        }
        setCaptureDraftSession(draftSession || null);
        setShowFastCaptureModal(true);
    };

    const handleOpenCadWizard = (session?: MeasurementSession | null, person?: MeasuredPerson | null) => {
        if (session) {
            const matchedPerson = session.person_id ? personMap.get(session.person_id) || null : null;
            setCadWizardPerson(matchedPerson);
            setCadWizardSessionId(session.id);
        } else {
            setCadWizardPerson(person || null);
            setCadWizardSessionId(null);
        }
        setShowCadWizardModal(true);
    };

    // Modal para inspeccionar detalle técnico completo del patrón + linaje + fitting
    const [inspectedPattern, setInspectedPattern] = useState<PatternExecution | null>(null);
    const [patternAdjustments, setPatternAdjustments] = useState<PatternAdjustment[]>([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState<boolean>(false);
    const [expandedHistoryGroupIds, setExpandedHistoryGroupIds] = useState<Record<string, boolean>>({});

    const loadClientDossierData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessData, creatRes, pattsData, personsData, groupsData, campaignsData] = await Promise.all([
                fetchClientMeasurementSessions(client.id, true),
                fetchCreations({ clientId: client.id }),
                fetchClientPatternExecutions(client.id),
                fetchClientPersons(client.id),
                fetchClientGroups(client.id),
                fetchClientCampaigns(client.id),
            ]);
            setSessions(sessData);
            setCreations(creatRes.data || []);
            setPatterns(pattsData);
            setPersons(personsData || []);
            setGroups(groupsData || []);
            setCampaigns(campaignsData || []);
        } catch (err) {
            console.warn('[ClientDossierView] Error cargando expediente:', err);
        } finally {
            setLoading(false);
        }
    }, [client.id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadClientDossierData();
    }, [loadClientDossierData]);

    const handleInspectPattern = async (pattern: PatternExecution) => {
        setInspectedPattern(pattern);
        setLoadingAdjustments(true);
        try {
            const adjs = await fetchPatternAdjustments(pattern.id);
            setPatternAdjustments(adjs);
        } catch {
            setPatternAdjustments([]);
        } finally {
            setLoadingAdjustments(false);
        }
    };

    // Diccionario de creaciones por ID
    const creationMap = useMemo(() => {
        const map = new Map<string, Creation>();
        creations.forEach((c) => map.set(c.id, c));
        return map;
    }, [creations]);

    // Diccionario de sesiones por ID
    const sessionMap = useMemo(() => {
        const map = new Map<string, MeasurementSession>();
        sessions.forEach((s) => map.set(s.id, s));
        return map;
    }, [sessions]);

    // Sesiones propias de la titular (person_id IS NULL) — excluye familiares/beneficiarios
    const titularSessions = useMemo(() => {
        return sessions.filter((s) => !s.person_id);
    }, [sessions]);
    const latestTitularSession = titularSessions[0] || null;

    // Métricas canónicas de sesiones diferenciadas por estado real
    const sessionMetrics = useMemo(() => {
        const total = sessions.length;
        const completed = sessions.filter((s) => s.status === 'completed').length;
        const verified = sessions.filter((s) => s.status === 'verified').length;
        const draft = sessions.filter((s) => s.status === 'draft').length;
        return { total, completed, verified, draft };
    }, [sessions]);

    // Agrupación ontológica y estadísticas canónicas de patrones CAD
    const patternStats = useMemo(() => {
        return calculateClientPatternStats(patterns, creations);
    }, [patterns, creations]);

    // =========================================================================
    // FASE B2 — MEMOS Y SELECTORES PARA HISTORIAL Y CONSULTA DE SESIONES
    // =========================================================================

    // 1. Filtrado por sujeto anatómico seleccionado (Titular vs Beneficiarios vs Todos)
    const filteredSubjectPersons = useMemo(() => {
        if (!subjectSearchQuery.trim()) return persons;
        const q = subjectSearchQuery.toLowerCase().trim();
        return persons.filter(
            (p) =>
                p.full_name.toLowerCase().includes(q) ||
                (p.reference_id && p.reference_id.toLowerCase().includes(q))
        );
    }, [persons, subjectSearchQuery]);

    const inspectorMeasurementsMm = useMemo(() => {
        const res: Record<string, number> = {};
        if (selectedSessionForView?.values) {
            Object.entries(selectedSessionForView.values).forEach(([code, item]) => {
                if (item && typeof item.value_mm === 'number') {
                    res[code] = item.value_mm;
                }
            });
        }
        return res;
    }, [selectedSessionForView]);

    const subjectFilteredSessions = useMemo(() => {
        if (selectedSubjectFilter === 'titular') {
            return sessions.filter((s) => !s.person_id);
        }
        if (selectedSubjectFilter !== 'all') {
            return sessions.filter((s) => s.person_id === selectedSubjectFilter);
        }
        return sessions;
    }, [sessions, selectedSubjectFilter]);

    // 2. Métricas KPI del sujeto actualmente seleccionado (o del conjunto global)
    const currentSubjectMetrics = useMemo(() => {
        const total = subjectFilteredSessions.length;
        const completed = subjectFilteredSessions.filter((s) => s.status === 'completed').length;
        const verified = subjectFilteredSessions.filter((s) => s.status === 'verified').length;
        const draft = subjectFilteredSessions.filter((s) => s.status === 'draft').length;
        return { total, completed, verified, draft };
    }, [subjectFilteredSessions]);

    // 3. Filtrado completo de sesiones (sujeto + estado + búsqueda + orden cronológico)
    const displayedSessions = useMemo(() => {
        let list = subjectFilteredSessions;

        // Filtro por estado
        if (selectedSessionStatusFilter !== 'all') {
            list = list.filter((s) => s.status === selectedSessionStatusFilter);
        }

        // Búsqueda por texto (nombre de persona, referencia, notas, fecha, versión)
        if (sessionsSearchQuery.trim()) {
            const q = sessionsSearchQuery.trim().toLowerCase();
            list = list.filter((s) => {
                const p = s.person_id ? personMap.get(s.person_id) : null;
                const matchPerson = p?.full_name?.toLowerCase().includes(q) || false;
                const matchRef = p?.reference_id?.toLowerCase().includes(q) || false;
                const matchNotes = s.notes?.toLowerCase().includes(q) || false;
                const matchDate = s.session_date?.includes(q) || false;
                const matchVersion = `v${s.version_number}`.toLowerCase().includes(q);
                const matchTitular = !s.person_id && client.full_name?.toLowerCase().includes(q);
                return matchPerson || matchRef || matchNotes || matchDate || matchVersion || matchTitular;
            });
        }

        // Orden cronológico
        const sorted = [...list].sort((a, b) => {
            const dateA = new Date(a.session_date || a.created_at).getTime();
            const dateB = new Date(b.session_date || b.created_at).getTime();
            if (dateA !== dateB) {
                return sessionSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            }
            return sessionSortOrder === 'desc'
                ? (b.version_number || 1) - (a.version_number || 1)
                : (a.version_number || 1) - (b.version_number || 1);
        });

        return sorted;
    }, [subjectFilteredSessions, selectedSessionStatusFilter, sessionsSearchQuery, sessionSortOrder, personMap, client.full_name]);

    const hasActiveSessionFilters =
        selectedSubjectFilter !== 'all' ||
        selectedSessionStatusFilter !== 'all' ||
        Boolean(sessionsSearchQuery.trim());

    const handleClearSessionFilters = () => {
        setSelectedSubjectFilter('all');
        setSelectedSessionStatusFilter('all');
        setSessionsSearchQuery('');
        setSessionSortOrder('desc');
    };

    // Candidatos válidos para comparación: estrictamente de la MISMA persona
    const availableComparisonCandidates = useMemo(() => {
        if (!compareBaseSession) return [];
        return compareBaseSession.person_id
            ? sessions.filter((s) => s.person_id === compareBaseSession.person_id && s.id !== compareBaseSession.id)
            : sessions.filter((s) => !s.person_id && s.id !== compareBaseSession.id);
    }, [sessions, compareBaseSession]);

    // Iniciar comparación histórica entre sesiones de la MISMA persona (B2-06, B2-11, B2-12)
    const handleStartComparison = (baseSession: MeasurementSession) => {
        const candidateSessions = baseSession.person_id
            ? sessions.filter((s) => s.person_id === baseSession.person_id && s.id !== baseSession.id)
            : sessions.filter((s) => !s.person_id && s.id !== baseSession.id);

        if (candidateSessions.length === 0) {
            Alert.alert(
                'Sesión Única',
                `Este sujeto solo tiene 1 sesión registrada (v${baseSession.version_number}). Se requieren al menos dos sesiones de la misma persona para realizar una comparación histórica.`
            );
            return;
        }

        setCompareBaseSession(baseSession);
        setCompareTargetSession(candidateSessions[0]);
        setShowComparisonModal(true);
    };

    const patternGroups = useMemo(() => {
        return groupClientPatternsByLineage(patterns, creations);
    }, [patterns, creations]);

    const activePatternsCount = patternStats.activePatternsCount;

    const activeCreationsCount = useMemo(() => {
        return creations.filter((c) => !['completed', 'cancelled'].includes(c.status)).length;
    }, [creations]);

    // Creaciones propias de la titular (person_id IS NULL)
    const titularCreations = useMemo(() => {
        return creations.filter((c) => !c.person_id);
    }, [creations]);

    // Sujetos filtrados en el buscador de la pestaña de creaciones
    const filteredCreationPersons = useMemo(() => {
        if (!creationSubjectSearchQuery.trim()) return persons;
        const q = creationSubjectSearchQuery.toLowerCase().trim();
        return persons.filter(
            (p) =>
                p.full_name.toLowerCase().includes(q) ||
                (p.reference_id && p.reference_id.toLowerCase().includes(q))
        );
    }, [persons, creationSubjectSearchQuery]);

    // 1. Filtrado de creaciones por sujeto
    const subjectFilteredCreations = useMemo(() => {
        if (creationSubjectFilter === 'titular') {
            return titularCreations;
        }
        if (creationSubjectFilter !== 'all') {
            return creations.filter((c) => c.person_id === creationSubjectFilter);
        }
        return creations;
    }, [creations, creationSubjectFilter, titularCreations]);

    // 2. Métricas KPI de creaciones para el sujeto seleccionado (o conjunto global)
    const currentCreationMetrics = useMemo(() => {
        const total = subjectFilteredCreations.length;
        const active = subjectFilteredCreations.filter((c) => c.status === 'active' || c.status === 'draft').length;
        const fitting = subjectFilteredCreations.filter((c) => c.status === 'fitting').length;
        const approved = subjectFilteredCreations.filter((c) => c.status === 'approved').length;
        const production = subjectFilteredCreations.filter((c) => c.status === 'production').length;
        const completed = subjectFilteredCreations.filter((c) => c.status === 'completed').length;
        return { total, active, fitting, approved, production, completed };
    }, [subjectFilteredCreations]);

    // 3. Filtrado completo y orden cronológico de creaciones
    const displayedCreations = useMemo(() => {
        let list = subjectFilteredCreations;

        // Filtro por estado
        if (creationStatusFilter !== 'all') {
            if (creationStatusFilter === 'active') {
                list = list.filter((c) => c.status === 'active' || c.status === 'draft');
            } else {
                list = list.filter((c) => c.status === creationStatusFilter);
            }
        }

        // Búsqueda por texto (nombre, beneficiario, ref, ocasión, tipo de prenda, notas)
        if (creationSearchQuery.trim()) {
            const q = creationSearchQuery.trim().toLowerCase();
            list = list.filter((c) => {
                const beneficiary = c.person || (c.person_id ? personMap.get(c.person_id) : null);
                const matchName = c.name?.toLowerCase().includes(q) || false;
                const matchPerson = beneficiary?.full_name?.toLowerCase().includes(q) || false;
                const matchRef = beneficiary?.reference_id?.toLowerCase().includes(q) || false;
                const matchOccasion = c.occasion?.toLowerCase().includes(q) || false;
                const matchNotes = c.notes?.toLowerCase().includes(q) || false;
                const matchGarment = c.garment_type ? getGarmentLabel(c.garment_type).toLowerCase().includes(q) : false;
                const matchStatus = c.status?.toLowerCase().includes(q) || false;
                return matchName || matchPerson || matchRef || matchOccasion || matchNotes || matchGarment || matchStatus;
            });
        }

        // Orden cronológico
        const sorted = [...list].sort((a, b) => {
            const dateA = new Date(a.created_at || a.target_date || '').getTime() || 0;
            const dateB = new Date(b.created_at || b.target_date || '').getTime() || 0;
            return creationSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return sorted;
    }, [subjectFilteredCreations, creationStatusFilter, creationSearchQuery, creationSortOrder, personMap]);

    const hasActiveCreationFilters =
        creationSubjectFilter !== 'all' ||
        creationStatusFilter !== 'all' ||
        Boolean(creationSearchQuery.trim());

    const handleClearCreationFilters = () => {
        setCreationSubjectFilter('all');
        setCreationStatusFilter('all');
        setCreationSearchQuery('');
        setCreationSubjectSearchQuery('');
        setCreationSortOrder('desc');
    };

    const getGarmentLabel = (gt: string): string => {
        const map: Record<string, string> = {
            jacket: 'Chaqueta Sastre de Alta Costura',
            shirt: 'Camisa de Alta Costura',
            corset: 'Corpiño / Corsé Estructurado',
            coat: 'Abrigo Sastre de Alta Costura',
            dress: 'Vestido Princesa',
            bodice: 'Corpiño Base',
            skirt: 'Falda Clásica',
            pants: 'Pantalón Sastre',
            blouse: 'Blusa Fluida',
            sleeve: 'Manga Anatómica',
        };
        return map[gt] || GARMENT_PACKAGES[gt as GarmentType]?.name || gt;
    };

    const getTemplateLabel = (gt: string): string => {
        const map: Record<string, string> = {
            shirt: 'SHIRT — CLASSIC',
            jacket: 'JACKET — CLASSIC',
            corset: 'CORSET — HAUTE COUTURE',
            coat: 'COAT — BESPOKE',
            dress: 'DRESS — PRINCESS',
            bodice: 'BODICE — BASIC',
            skirt: 'SKIRT — CLASSIC',
            pants: 'PANTS — BESPOKE',
            blouse: 'BLOUSE — FLUID',
            sleeve: 'SLEEVE — ANATOMIC',
        };
        return map[gt] || `${gt.toUpperCase()} — CLASSIC`;
    };

    // Helper de diferenciación del origen del patrón (Section 5)
    const getPatternOrigin = (p: PatternExecution) => {
        const isDirect = !p.creation_id;
        const isCreation = Boolean(p.creation_id);
        const isDerived = Boolean(p.parent_execution_id);

        let badgeText = '';
        let badgeColor = '#333333';
        let badgeBg = '#F5F3EF';

        if (isCreation && isDerived) {
            badgeText = 'CREACIÓN · DERIVADO';
            badgeColor = '#B37D14';
            badgeBg = '#FFF8E7';
        } else if (isDirect && isDerived) {
            badgeText = 'PATRONAJE DIRECTO · DERIVADO';
            badgeColor = '#2E7D32';
            badgeBg = '#E8F5E9';
        } else if (isCreation) {
            badgeText = 'CREACIÓN';
            badgeColor = '#8A5D10';
            badgeBg = '#FDF6E2';
        } else {
            badgeText = 'PATRONAJE DIRECTO';
            badgeColor = '#4A5568';
            badgeBg = '#EDF2F7';
        }

        return {
            badgeText,
            badgeColor,
            badgeBg,
            isDirect,
            isCreation,
            isDerived,
        };
    };

    const getStatusStyle = (status: PatternStatus) => {
        switch (status) {
            case 'approved_by_designer':
                return { label: 'APROBADO', bg: '#E8F5E9', color: '#2E7D32', border: '#81C784' };
            case 'pending_fitting':
                return { label: 'EN FITTING', bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' };
            case 'generated':
                return { label: 'GENERADO', bg: '#F3E5F5', color: '#6A1B9A', border: '#BA68C8' };
            case 'needs_revision':
                return { label: 'REVISIÓN', bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' };
            case 'draft':
            default:
                return { label: 'BORRADOR', bg: '#F5F3EF', color: colors.textSecondary, border: colors.sand };
        }
    };

    const formatDate = (dateStr?: string | null): string => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return String(dateStr);
        }
    };

    // Patrones filtrados por sesión si hay filtro activo
    const displayedPatterns = useMemo(() => {
        if (!filterSessionId) return patterns;
        return patterns.filter((p) => p.session_id === filterSessionId);
    }, [patterns, filterSessionId]);

    // Cadena de linaje para el patrón inspeccionado (Section 6)
    const lineageChain = useMemo(() => {
        if (!inspectedPattern) return [];
        // Buscar la raíz del árbol
        let root = inspectedPattern;
        const visited = new Set<string>([root.id]);
        while (root.parent_execution_id) {
            const parent = patterns.find((p) => p.id === root.parent_execution_id);
            if (parent && !visited.has(parent.id)) {
                visited.add(parent.id);
                root = parent;
            } else {
                break;
            }
        }
        // Recorrer hacia adelante desde la raíz
        const chain: PatternExecution[] = [root];
        const queue = [root.id];
        while (queue.length > 0) {
            const currId = queue.shift()!;
            const children = patterns.filter((p) => p.parent_execution_id === currId);
            for (const child of children) {
                if (!chain.some((x) => x.id === child.id)) {
                    chain.push(child);
                    queue.push(child.id);
                }
            }
        }
        return chain;
    }, [inspectedPattern, patterns]);

    return (
        <View style={styles.container}>
            {/* Barra superior de navegación */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>← Directorio de Clientas</Text>
                </TouchableOpacity>

                <View style={styles.topRightActions}>
                    {onEditClient && (
                        <TouchableOpacity
                            onPress={() => onEditClient(client)}
                            style={styles.editButton}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.editButtonText}>Editar Ficha</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 1. Cabecera Editorial y Título de Trazabilidad */}
                <View style={styles.dossierHeaderCard}>
                    <View style={styles.dossierSuperRow}>
                        <View style={styles.dossierBadge}>
                            <Text style={styles.dossierBadgeText}>MÓDULO 02 · PATRONAJE Y MEDIDAS</Text>
                        </View>
                        <View
                            style={[
                                styles.clientStatusTag,
                                client.status === 'archived' ? styles.statusArchived : styles.statusActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.clientStatusText,
                                    client.status === 'archived' ? styles.statusTextArchived : styles.statusTextActive,
                                ]}
                            >
                                {client.status === 'archived' ? 'ARCHIVADA' : 'CLIENTA ACTIVA'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.clientIdentityRow}>
                        <View style={styles.avatarMonogram}>
                            <Image
                                source={
                                    client.photo_url
                                        ? { uri: client.photo_url }
                                        : getEditorialAvatarSource(client.id || client.full_name)
                                }
                                style={styles.avatarImage}
                                resizeMode="cover"
                            />
                        </View>
                        <View style={styles.identityTextWrap}>
                            <Text style={styles.clientFullName}>{client.full_name}</Text>
                            <View style={styles.contactDetailsRow}>
                                {client.city ? <Text style={styles.contactItem}>📍 {client.city}</Text> : null}
                                {client.phone ? <Text style={styles.contactItem}>📞 {client.phone}</Text> : null}
                                {client.email ? <Text style={styles.contactItem}>✉️ {client.email}</Text> : null}
                            </View>
                            <Text style={styles.registrationDate}>
                                Registrada en Atelier: {formatDate(client.created_at)}
                            </Text>
                        </View>
                    </View>

                    {/* Preferencias de Estilo y Notas Confidenciales */}
                    {(client.style_preferences || client.internal_notes) && (
                        <View style={styles.notesContainer}>
                            {client.style_preferences ? (
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteLabel}>PREFERENCIAS DE ESTILO & SILUETA:</Text>
                                    <Text style={styles.noteValue}>{client.style_preferences}</Text>
                                </View>
                            ) : null}
                            {client.internal_notes ? (
                                <View style={styles.noteItem}>
                                    <Text style={styles.noteLabel}>NOTAS PRIVADAS CONFIDENCIALES:</Text>
                                    <Text style={styles.noteValue}>{client.internal_notes}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {/* RESUMEN DE LA CLIENTA / INSTITUCIÓN (Ontología Canónica) */}
                    <View style={styles.summarySectionBox}>
                        <Text style={styles.summarySectionBoxTitle}>
                            {isInstitutional ? 'RESUMEN DEL CLIENTE INSTITUCIONAL' : 'RESUMEN DE LA CLIENTA'}
                        </Text>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>
                                    {isInstitutional ? 'INSTITUCIÓN:' : 'CLIENTA:'}
                                </Text>
                                <Text style={styles.summaryGridValBold}>{client.full_name}</Text>
                            </View>
                            {isInstitutional && (
                                <>
                                    <View style={styles.summaryGridItem}>
                                        <Text style={styles.summaryGridKey}>Personas registradas:</Text>
                                        <Text style={styles.summaryGridValBold}>{persons.length}</Text>
                                        <Text style={styles.summaryGridSubText}>Sujetos medidos</Text>
                                    </View>
                                    <View style={styles.summaryGridItem}>
                                        <Text style={styles.summaryGridKey}>Jornadas grupales:</Text>
                                        <Text style={styles.summaryGridValBold}>{campaigns.length}</Text>
                                        <Text style={styles.summaryGridSubText}>Campañas</Text>
                                    </View>
                                </>
                            )}
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>
                                    {isInstitutional ? 'Sesiones totales:' : 'Sesiones de medidas:'}
                                </Text>
                                <Text style={styles.summaryGridValBold}>{sessionMetrics.total}</Text>
                                {isInstitutional ? (
                                    <Text style={styles.summaryGridSubText}>
                                        {sessionMetrics.completed} fin · {sessionMetrics.draft} borrador
                                    </Text>
                                ) : (
                                    <Text style={styles.summaryGridSubText}>
                                        {sessionMetrics.completed} finalizadas
                                    </Text>
                                )}
                            </View>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>Creaciones:</Text>
                                <Text style={styles.summaryGridVal}>{creations.length}</Text>
                            </View>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>Patrones CAD:</Text>
                                <Text style={styles.summaryGridValBold}>{patternStats.patternsCount}</Text>
                                <Text style={styles.summaryGridSubText}>Patrón lógico</Text>
                            </View>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>Ejecuciones:</Text>
                                <Text style={styles.summaryGridVal}>{patternStats.totalExecutionsCount}</Text>
                                <Text style={styles.summaryGridSubText}>Registros técnicos</Text>
                            </View>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>Patrones vigentes:</Text>
                                <Text style={[styles.summaryGridValBold, { color: colors.champagneGold }]}>
                                    {patternStats.activePatternsCount}
                                </Text>
                                <Text style={styles.summaryGridSubText}>Versión aprobada</Text>
                            </View>
                        </View>
                        <View style={styles.summaryMicroLegend}>
                            <Text style={styles.summaryMicroLegendText}>
                                ℹ️ Las ejecuciones corresponden a cálculos y revisiones técnicas del patrón. No representan patrones independientes.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 2. Selector de Pestañas del Expediente */}
                <View style={styles.tabsRow}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('overview')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
                            Resumen General
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'sessions' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('sessions')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'sessions' && styles.tabButtonTextActive]}>
                            Sesiones de Medidas ({sessions.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'creations' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('creations')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'creations' && styles.tabButtonTextActive]}>
                            Creaciones ({creations.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'patterns' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('patterns')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'patterns' && styles.tabButtonTextActive]}>
                            Patrones ({patternGroups.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'persons_groups' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('persons_groups')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'persons_groups' && styles.tabButtonTextActive]}>
                            Personas y Grupos
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando trazabilidad técnica de clienta...</Text>
                    </View>
                ) : (
                    <>
                        {/* PESTAÑA 1: RESUMEN GENERAL */}
                        {activeTab === 'overview' && (
                            <View style={styles.tabContentSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionHeaderTitle}>ARQUITECTURA RELACIONAL DE LA CLIENTA</Text>
                                    <Text style={styles.sectionHeaderSubtitle}>
                                        Clienta → Sesiones de Medidas → Patrones CAD → Creaciones → Linaje Inmutable
                                    </Text>
                                </View>

                                {/* Resumen de Medidas / Resumen Institucional (H-01) */}
                                {isInstitutional ? (
                                    <View style={styles.summaryCard}>
                                        <View style={styles.summaryCardHeader}>
                                            <Text style={styles.summaryCardSuper}>EXPEDIENTE INSTITUCIONAL · NÚCLEO COLECTIVO</Text>
                                            <Text style={styles.summaryCardTitle}>Gestión de Sujetos Medidos y Jornadas</Text>
                                        </View>
                                        <View>
                                            <View style={styles.summaryDetailRow}>
                                                <Text style={styles.summaryDetailLabel}>Alumnos / Personas Registradas:</Text>
                                                <Text style={styles.summaryDetailValue}>
                                                    {persons.length} integrantes vinculados
                                                </Text>
                                            </View>
                                            <View style={styles.summaryDetailRow}>
                                                <Text style={styles.summaryDetailLabel}>Jornadas de Medición:</Text>
                                                <Text style={styles.summaryDetailValue}>
                                                    {campaigns.length} {campaigns.length === 1 ? 'jornada registrada' : 'jornadas registradas'}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryDetailRow}>
                                                <Text style={styles.summaryDetailLabel}>Sesiones Técnicas de Taller:</Text>
                                                <Text style={styles.summaryDetailValue}>
                                                    {sessionMetrics.total} sesiones ({sessionMetrics.completed} finalizadas · {sessionMetrics.draft} borradores)
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.summaryActionBtn}
                                                onPress={() => setActiveTab('persons_groups')}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.summaryActionBtnText}>Gestionar Alumnos y Jornadas →</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.summaryCard}>
                                        <View style={styles.summaryCardHeader}>
                                            <Text style={styles.summaryCardSuper}>ANATOMÍA CORPORAL</Text>
                                            <Text style={styles.summaryCardTitle}>Última Sesión de Medidas</Text>
                                        </View>
                                        {latestTitularSession ? (
                                            <View>
                                                <View style={styles.summaryDetailRow}>
                                                    <Text style={styles.summaryDetailLabel}>Versión Activa:</Text>
                                                    <Text style={styles.summaryDetailValue}>
                                                        Sesión v{latestTitularSession.version_number} ({formatDate(latestTitularSession.session_date)})
                                                    </Text>
                                                </View>
                                                <View style={styles.summaryDetailRow}>
                                                    <Text style={styles.summaryDetailLabel}>Estado de Sesión:</Text>
                                                    <Text style={styles.summaryDetailValue}>
                                                        {latestTitularSession.status === 'completed'
                                                            ? '🛡️ Finalizada & Inmutable'
                                                            : latestTitularSession.status === 'verified'
                                                            ? '✅ Verificada'
                                                            : '📝 Borrador'}
                                                    </Text>
                                                </View>
                                                <View style={styles.summaryDetailRow}>
                                                    <Text style={styles.summaryDetailLabel}>Medidas Registradas:</Text>
                                                    <Text style={styles.summaryDetailValue}>
                                                        {Object.keys(latestTitularSession.values || {}).length} cotas métricas
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.summaryActionBtn}
                                                    onPress={() => setSelectedSessionForView(latestTitularSession)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.summaryActionBtnText}>Consultar Medidas en Detalle →</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <Text style={styles.emptyStateNotice}>
                                                La clienta aún no tiene sesiones de medidas registradas.
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Creaciones */}
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryCardHeader}>
                                        <Text style={styles.summaryCardSuper}>PROYECTOS & ENCARGOS</Text>
                                        <Text style={styles.summaryCardTitle}>Creaciones de Alta Costura ({creations.length})</Text>
                                    </View>
                                    {creations.length > 0 ? (
                                        <View style={{ gap: 8 }}>
                                            {creations.slice(0, 3).map((c) => {
                                                const beneficiary = c.person || (c.person_id ? personMap.get(c.person_id) : null);
                                                return (
                                                    <View key={c.id} style={styles.miniListItem}>
                                                        <Image
                                                            source={getCreationPhoto(c)}
                                                            style={styles.miniGarmentPhoto}
                                                            resizeMode="cover"
                                                        />
                                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                                            <Text style={styles.miniItemTitle}>{c.name}</Text>
                                                            {beneficiary && (
                                                                <Text style={styles.miniItemBeneficiary}>
                                                                    👤 {beneficiary.full_name} {beneficiary.reference_id ? `(${beneficiary.reference_id})` : ''}
                                                                </Text>
                                                            )}
                                                            <Text style={styles.miniItemSub}>
                                                                {c.garment_type ? getGarmentLabel(c.garment_type) : 'Prenda no definida'} · {c.status}
                                                            </Text>
                                                        </View>
                                                        {onOpenCreation && (
                                                            <TouchableOpacity
                                                                onPress={() => onOpenCreation(c.id)}
                                                                style={styles.miniItemBtn}
                                                            >
                                                                <Text style={styles.miniItemBtnText}>Ver →</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                );
                                            })}

                                            {creations.length > 3 && (
                                                <TouchableOpacity
                                                    onPress={() => setActiveTab('creations')}
                                                    style={styles.viewAllCreationsBtn}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.viewAllCreationsBtnText}>
                                                        Ver todas las Creaciones ({creations.length}) →
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : (
                                        <Text style={styles.emptyStateNotice}>
                                            Sin creaciones registradas para esta clienta.
                                        </Text>
                                    )}
                                </View>

                                {/* Patrones CAD — Agrupados por Linaje y Versión Vigente */}
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryCardHeader}>
                                        <Text style={styles.summaryCardSuper}>PATRONAJE CAD · LINAJE EDITORIAL</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                            <Text style={styles.summaryCardTitle}>
                                                Patrones de la Clienta ({patternGroups.length})
                                            </Text>
                                            <Text style={styles.summaryCardSubCounter}>
                                                {patternStats.totalExecutionsCount} ejecuciones registradas · {patternStats.activePatternsCount} vigentes
                                            </Text>
                                        </View>
                                    </View>
                                    {patternGroups.length > 0 ? (
                                        <View style={{ gap: 14 }}>
                                            {patternGroups.slice(0, 3).map((grp) => {
                                                const activeExec = grp.activeExecution;
                                                const activeStatus = getStatusStyle(activeExec.status);
                                                return (
                                                    <View key={grp.id} style={styles.lineageOverviewCard}>
                                                        {/* Cabecera del Patrón */}
                                                        <View style={styles.lineageOverviewHeader}>
                                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                                <Text style={styles.lineageOverviewGarmentTitle}>
                                                                    {getGarmentLabel(grp.garmentType).toUpperCase()}
                                                                </Text>
                                                                <Text style={styles.lineageOverviewCreationSubtitle}>
                                                                    {grp.creationName ? `👗 Creación: ${grp.creationName}` : '📐 Patrón independiente (Patronaje directo)'}
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={[
                                                                    styles.statusTag,
                                                                    {
                                                                        backgroundColor: activeStatus.bg,
                                                                        borderColor: activeStatus.border,
                                                                    },
                                                                ]}
                                                            >
                                                                <Text style={[styles.statusTagText, { color: activeStatus.color }]}>
                                                                    {grp.isApproved ? '✓ VIGENTE · APROBADO' : `✓ VIGENTE · ${activeStatus.label}`}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        {/* Historial Técnico */}
                                                        <View style={styles.lineageOverviewVersionsBox}>
                                                            <Text style={styles.lineageOverviewVersionsTitle}>
                                                                HISTORIAL TÉCNICO · {grp.totalVersions} EJECUCIONES
                                                            </Text>
                                                            <View style={styles.lineageOverviewVersionsList}>
                                                                {grp.executions.slice(0, 3).map((item, idx) => {
                                                                    const isCurrent = item.id === activeExec.id;
                                                                    const itemStatus = getStatusStyle(item.status);
                                                                    return (
                                                                        <View key={item.id} style={styles.lineageVersionRow}>
                                                                            <View style={styles.lineageVersionBulletCol}>
                                                                                <Text style={[styles.lineageVersionBullet, isCurrent && styles.lineageVersionBulletActive]}>
                                                                                    {isCurrent ? '●' : '○'}
                                                                                </Text>
                                                                                {idx < Math.min(grp.executions.length, 3) - 1 && (
                                                                                    <View style={styles.lineageVersionConnectLine} />
                                                                                )}
                                                                            </View>
                                                                            <View style={styles.lineageVersionContent}>
                                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                                    <Text style={[styles.lineageVersionLabelText, isCurrent && styles.lineageVersionLabelTextActive]}>
                                                                                        {item.version_label}
                                                                                    </Text>
                                                                                    <View style={[styles.statusTagSmall, { backgroundColor: itemStatus.bg, borderColor: itemStatus.border }]}>
                                                                                        <Text style={[styles.statusTagSmallText, { color: itemStatus.color }]}>
                                                                                            {itemStatus.label}
                                                                                        </Text>
                                                                                    </View>
                                                                                    {isCurrent && (
                                                                                        <View style={styles.currentIndicatorBadge}>
                                                                                            <Text style={styles.currentIndicatorBadgeText}>VIGENTE</Text>
                                                                                        </View>
                                                                                    )}
                                                                                </View>
                                                                                <Text style={styles.lineageVersionDateText}>
                                                                                    └─ {formatDate(item.created_at)} · {item.parent_execution_id ? 'Revisión derivada' : 'Trazado base original'}
                                                                                </Text>
                                                                            </View>
                                                                            <TouchableOpacity
                                                                                onPress={() => handleInspectPattern(item)}
                                                                                style={styles.lineageVersionMiniBtn}
                                                                                activeOpacity={0.8}
                                                                            >
                                                                                <Text style={styles.lineageVersionMiniBtnText}>Detalle →</Text>
                                                                            </TouchableOpacity>
                                                                        </View>
                                                                    );
                                                                })}
                                                                {grp.executions.length > 3 && (
                                                                    <TouchableOpacity
                                                                        onPress={() => setActiveTab('patterns')}
                                                                        style={{ paddingVertical: 4 }}
                                                                    >
                                                                        <Text style={styles.lineageMoreVersionsText}>
                                                                            + {grp.executions.length - 3} ejecuciones técnicas en el linaje histórico...
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </View>

                                                        {/* Acciones */}
                                                        <View style={styles.lineageOverviewActionsRow}>
                                                            <TouchableOpacity
                                                                onPress={() => handleInspectPattern(activeExec)}
                                                                style={styles.lineageCardBtnSecondary}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.lineageCardBtnSecondaryText}>🔍 Detalle & Trazabilidad</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                onPress={() => setActiveTab('patterns')}
                                                                style={styles.lineageCardBtnOutline}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.lineageCardBtnOutlineText}>🌳 Ver Linaje Completo →</Text>
                                                            </TouchableOpacity>
                                                            {onOpenCad && (
                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        onOpenCad({
                                                                            clientId: client.id,
                                                                            sessionId: activeExec.session_id,
                                                                            creationId: activeExec.creation_id,
                                                                            garmentType: activeExec.garment_type,
                                                                            executionId: activeExec.id,
                                                                        })
                                                                    }
                                                                    style={styles.lineageCardBtnPrimary}
                                                                    activeOpacity={0.85}
                                                                >
                                                                    <Text style={styles.lineageCardBtnPrimaryText}>📐 Abrir en Mesa CAD →</Text>
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <Text style={styles.emptyStateNotice}>
                                            Sin patrones generados para esta clienta.
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* PESTAÑA 2: SESIONES DE MEDIDAS (REDISEÑO FASE B2 — M02) */}
                        {activeTab === 'sessions' && (
                            <View style={styles.tabContentSection}>
                                {/* Encabezado Editorial de Sesiones */}
                                <View style={styles.sectionHeaderRow}>
                                    <View>
                                        <Text style={styles.sectionHeaderTitle}>HISTORIAL DE SESIONES DE MEDIDAS ({sessions.length})</Text>
                                        <Text style={styles.sectionHeaderSubtitle}>
                                            Historial anatómico inmutable, comparación de versiones y trazabilidad por sujeto.
                                        </Text>
                                    </View>
                                    {isInstitutional ? (
                                        selectedSubjectFilter !== 'all' && selectedSubjectFilter !== 'titular' ? (
                                            <TouchableOpacity
                                                style={styles.newMeasureSessionBtn}
                                                onPress={() => {
                                                    const targetPerson = personMap.get(selectedSubjectFilter) || null;
                                                    handleOpenFastCapture(targetPerson, null);
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.newMeasureSessionBtnText}>
                                                    📐 + Medir a {personMap.get(selectedSubjectFilter)?.full_name?.split(' ')[0] || 'Alumno'}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.newMeasureSessionBtn, { backgroundColor: colors.atelierBlack }]}
                                                onPress={() => setActiveTab('persons_groups')}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.newMeasureSessionBtnText}>
                                                    👥 Ir a Personas y Grupos para Medir
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.newMeasureSessionBtn}
                                            onPress={() => {
                                                let targetPerson: MeasuredPerson | null = null;
                                                if (selectedSubjectFilter !== 'all' && selectedSubjectFilter !== 'titular') {
                                                    targetPerson = personMap.get(selectedSubjectFilter) || null;
                                                }
                                                handleOpenFastCapture(targetPerson, null);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.newMeasureSessionBtnText}>📐 + Captura Rápida de Medidas</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* SELECTOR DE SUJETO ANATÓMICO (B2-01 & B2-02) */}
                                <View style={styles.subjectFilterCard}>
                                    <View style={styles.subjectFilterHeaderRow}>
                                        <Text style={styles.subjectFilterLabel}>
                                            FILTRAR POR SUJETO ANATÓMICO MEDIDO ({persons.length > 0 ? persons.length + 1 : 1}):
                                        </Text>
                                        {persons.length > 3 && (
                                            <View style={styles.subjectSearchBox}>
                                                <Text style={{ fontSize: 11, color: colors.champagneGold, marginRight: 4 }}>🔍</Text>
                                                <TextInput
                                                    style={styles.subjectSearchInput}
                                                    placeholder="Buscar alumno o ref..."
                                                    placeholderTextColor={colors.textSecondary}
                                                    value={subjectSearchQuery}
                                                    onChangeText={setSubjectSearchQuery}
                                                />
                                                {subjectSearchQuery ? (
                                                    <TouchableOpacity onPress={() => setSubjectSearchQuery('')}>
                                                        <Text style={{ fontSize: 11, color: colors.textSecondary, paddingHorizontal: 4 }}>✕</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        )}
                                    </View>

                                    <ScrollView
                                        style={styles.subjectPillsWrapScroll}
                                        contentContainerStyle={styles.subjectPillsWrapContainer}
                                        nestedScrollEnabled={true}
                                    >
                                        <TouchableOpacity
                                            style={[styles.subjectPill, selectedSubjectFilter === 'all' && styles.subjectPillActive]}
                                            onPress={() => setSelectedSubjectFilter('all')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.subjectPillText, selectedSubjectFilter === 'all' && styles.subjectPillTextActive]}>
                                                Todos ({sessions.length})
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.subjectPill, selectedSubjectFilter === 'titular' && styles.subjectPillActive]}
                                            onPress={() => setSelectedSubjectFilter('titular')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.subjectPillText, selectedSubjectFilter === 'titular' && styles.subjectPillTextActive]}>
                                                👤 Titular: {client.full_name} ({titularSessions.length})
                                            </Text>
                                        </TouchableOpacity>

                                        {filteredSubjectPersons.map((p) => {
                                            const pSessionsCount = sessions.filter((s) => s.person_id === p.id).length;
                                            const isSelected = selectedSubjectFilter === p.id;
                                            return (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={[styles.subjectPill, isSelected && styles.subjectPillActive]}
                                                    onPress={() => setSelectedSubjectFilter(p.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.subjectPillText, isSelected && styles.subjectPillTextActive]}>
                                                        👤 {p.full_name} {p.reference_id ? `[${p.reference_id}]` : ''} ({pSessionsCount})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}

                                        {filteredSubjectPersons.length === 0 && subjectSearchQuery ? (
                                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 4 }}>
                                                No se encontraron alumnos con «{subjectSearchQuery}».
                                            </Text>
                                        ) : null}
                                    </ScrollView>
                                </View>

                                {/* RESUMEN DE ESTADOS KPI (B2-03) */}
                                <View style={styles.kpiRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            selectedSessionStatusFilter === 'all' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() => setSelectedSessionStatusFilter('all')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.kpiLabel}>TOTAL SESIONES</Text>
                                        <Text style={styles.kpiValue}>{currentSubjectMetrics.total}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            selectedSessionStatusFilter === 'draft' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setSelectedSessionStatusFilter((prev) => (prev === 'draft' ? 'all' : 'draft'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#E65100' }]}>⏳ BORRADORES</Text>
                                        <Text style={[styles.kpiValue, { color: '#E65100' }]}>{currentSubjectMetrics.draft}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            selectedSessionStatusFilter === 'verified' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setSelectedSessionStatusFilter((prev) => (prev === 'verified' ? 'all' : 'verified'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#1565C0' }]}>✅ VERIFICADAS</Text>
                                        <Text style={[styles.kpiValue, { color: '#1565C0' }]}>{currentSubjectMetrics.verified}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            selectedSessionStatusFilter === 'completed' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setSelectedSessionStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#2E7D32' }]}>🛡️ FINALIZADAS</Text>
                                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]}>{currentSubjectMetrics.completed}</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* BARRA DE BÚSQUEDA Y FILTROS COMBINADOS (B2-04) */}
                                <View style={styles.sessionsToolbarCard}>
                                    <View style={styles.sessionsSearchRow}>
                                        <View style={styles.sessionsSearchInputWrap}>
                                            <Text style={styles.sessionsSearchIcon}>🔍</Text>
                                            <TextInput
                                                style={styles.sessionsSearchInput}
                                                placeholder="Buscar por notas, referencia, fecha o versión..."
                                                placeholderTextColor={colors.textMuted}
                                                value={sessionsSearchQuery}
                                                onChangeText={setSessionsSearchQuery}
                                            />
                                            {Boolean(sessionsSearchQuery) && (
                                                <TouchableOpacity
                                                    style={styles.sessionsSearchClearBtn}
                                                    onPress={() => setSessionsSearchQuery('')}
                                                >
                                                    <Text style={styles.sessionsSearchClearBtnText}>✕</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {hasActiveSessionFilters && (
                                            <TouchableOpacity
                                                style={styles.sessionsClearAllFiltersBtn}
                                                onPress={handleClearSessionFilters}
                                            >
                                                <Text style={styles.sessionsClearAllFiltersText}>Limpiar Filtros</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.sessionsFiltersSubRow}>
                                        <View style={styles.statusPillsWrap}>
                                            <Text style={styles.statusPillsLabel}>ESTADO:</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsScroll}>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, selectedSessionStatusFilter === 'all' && styles.statusFilterPillActive]}
                                                    onPress={() => setSelectedSessionStatusFilter('all')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, selectedSessionStatusFilter === 'all' && styles.statusFilterPillTextActive]}>
                                                        Todos
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, selectedSessionStatusFilter === 'draft' && styles.statusFilterPillActive]}
                                                    onPress={() => setSelectedSessionStatusFilter('draft')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, selectedSessionStatusFilter === 'draft' && styles.statusFilterPillTextActive]}>
                                                        ⏳ Borrador
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, selectedSessionStatusFilter === 'verified' && styles.statusFilterPillActive]}
                                                    onPress={() => setSelectedSessionStatusFilter('verified')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, selectedSessionStatusFilter === 'verified' && styles.statusFilterPillTextActive]}>
                                                        ✅ Verificada
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, selectedSessionStatusFilter === 'completed' && styles.statusFilterPillActive]}
                                                    onPress={() => setSelectedSessionStatusFilter('completed')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, selectedSessionStatusFilter === 'completed' && styles.statusFilterPillTextActive]}>
                                                        🛡️ Finalizada
                                                    </Text>
                                                </TouchableOpacity>
                                            </ScrollView>
                                        </View>

                                        {/* Selector de orden cronológico */}
                                        <TouchableOpacity
                                            style={styles.sortToggleBtn}
                                            onPress={() => setSessionSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.sortToggleBtnText}>
                                                {sessionSortOrder === 'desc' ? '📅 Más recientes primero ↓' : '📅 Más antiguas primero ↑'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* LISTA EDITORIAL DE SESIONES DE MEDIDAS (B2-01, B2-02, B2-07) */}
                                {sessions.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>Esta clienta no tiene sesiones de medidas registradas.</Text>
                                    </View>
                                ) : displayedSessions.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>
                                            No se encontraron sesiones que coincidan con los filtros o búsqueda seleccionada.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.resetFiltersBtn}
                                            onPress={handleClearSessionFilters}
                                        >
                                            <Text style={styles.resetFiltersBtnText}>Restablecer Filtros</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        {displayedSessions.map((s) => {
                                            const valuesCount = Object.keys(s.values || {}).length;
                                            const usedByPatterns = patterns.filter((p) => p.session_id === s.id);
                                            const hasPatterns = usedByPatterns.length > 0;
                                            const linkedCreation = s.creation_id ? creationMap.get(s.creation_id) : null;
                                            const sessionPerson = s.person_id ? personMap.get(s.person_id) : null;
                                            const isRectification = s.version_number > 1 || Boolean(s.notes && s.notes.includes('Rectificación'));
                                            const avatar = sessionPerson
                                                ? DEMOGRAPHIC_AVATARS[sessionPerson.demographic_category]
                                                : require('../../../assets/mannequin_woman_real.jpg');

                                            return (
                                                <View key={s.id} style={styles.sessionCardEditorial}>
                                                    <View style={styles.sessionCardTopRow}>
                                                        {/* Avatar miniatura */}
                                                        <View style={styles.sessionAvatarWrap}>
                                                            <Image source={avatar} style={styles.sessionAvatarImg} resizeMode="cover" />
                                                        </View>

                                                        {/* Datos del Sujeto */}
                                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                                            <View style={styles.sessionSubjectTitleRow}>
                                                                <Text style={styles.sessionSubjectName}>
                                                                    {sessionPerson ? sessionPerson.full_name : `${client.full_name} (Titular)`}
                                                                </Text>
                                                                {sessionPerson ? (
                                                                    <View style={styles.sessionCategoryTag}>
                                                                        <Text style={styles.sessionCategoryTagText}>
                                                                            {DEMOGRAPHIC_LABELS[sessionPerson.demographic_category].split(' ')[0].toUpperCase()}
                                                                        </Text>
                                                                    </View>
                                                                ) : (
                                                                    <View style={styles.sessionTitularTag}>
                                                                        <Text style={styles.sessionTitularTagText}>TITULAR</Text>
                                                                    </View>
                                                                )}

                                                                {/* Badge de Rectificación / Versión */}
                                                                {isRectification ? (
                                                                    <View style={styles.rectificationBadge}>
                                                                        <Text style={styles.rectificationBadgeText}>
                                                                            🔄 Rectificación v{s.version_number}
                                                                        </Text>
                                                                    </View>
                                                                ) : (
                                                                    <View style={styles.versionBadgeClean}>
                                                                        <Text style={styles.versionBadgeCleanText}>v{s.version_number}</Text>
                                                                    </View>
                                                                )}
                                                            </View>

                                                            {/* Metadatos de la sesión */}
                                                            <Text style={styles.sessionSubMeta}>
                                                                {sessionPerson?.reference_id ? `Ref: ${sessionPerson.reference_id} · ` : ''}
                                                                📅 Fecha: {formatDate(s.session_date)} · Sistema: {s.unit_system?.toUpperCase() || 'CM'} · {valuesCount} medidas corporales
                                                            </Text>
                                                        </View>

                                                        {/* Badge de Estado */}
                                                        <View
                                                            style={[
                                                                styles.statusTag,
                                                                s.status === 'completed'
                                                                    ? { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }
                                                                    : s.status === 'verified'
                                                                    ? { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }
                                                                    : { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.statusTagText,
                                                                    s.status === 'completed'
                                                                        ? { color: '#2E7D32' }
                                                                        : s.status === 'verified'
                                                                        ? { color: '#1565C0' }
                                                                        : { color: '#E65100' },
                                                                ]}
                                                            >
                                                                {s.status === 'completed'
                                                                    ? '🛡️ FINALIZADA'
                                                                    : s.status === 'verified'
                                                                    ? '✅ VERIFICADA'
                                                                    : '⏳ BORRADOR'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Notas y Trazabilidad */}
                                                    {s.notes ? (
                                                        <Text style={styles.sessionCardNotes}>“{s.notes}”</Text>
                                                    ) : null}

                                                    {/* Vínculos */}
                                                    <View style={styles.linksRow}>
                                                        {linkedCreation ? (
                                                            <View style={styles.linkBadge}>
                                                                <Text style={styles.linkBadgeText}>👗 Creación: {linkedCreation.name}</Text>
                                                            </View>
                                                        ) : (
                                                            <View style={[styles.linkBadge, { backgroundColor: '#F5F3EF' }]}>
                                                                <Text style={[styles.linkBadgeText, { color: colors.textSecondary }]}>
                                                                    Sin creación vinculada
                                                                </Text>
                                                            </View>
                                                        )}

                                                        {hasPatterns ? (
                                                            <View style={[styles.linkBadge, { backgroundColor: '#EBF3FB' }]}>
                                                                <Text style={[styles.linkBadgeText, { color: '#1565C0' }]}>
                                                                    ✂️ Tiene patrones derivados: {usedByPatterns.length}
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <View style={[styles.linkBadge, { backgroundColor: '#F9F9F9' }]}>
                                                                <Text style={[styles.linkBadgeText, { color: colors.textMuted }]}>
                                                                    Sin patrones derivados
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Acciones de Sesión (B2-01, B2-05, B2-06, C-01, C-04) */}
                                                    <View style={styles.cardItemFooter}>
                                                        {s.status === 'draft' && (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    const targetPerson = s.person_id ? personMap.get(s.person_id) || null : null;
                                                                    handleOpenFastCapture(targetPerson, s);
                                                                }}
                                                                style={[styles.cardActionSecondary, { borderColor: '#E65100', backgroundColor: '#FFF8F2' }]}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={[styles.cardActionSecondaryText, { color: '#E65100', fontWeight: '700' }]}>
                                                                    ✏️ Reanudar Borrador
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}

                                                        <TouchableOpacity
                                                            onPress={() => setSelectedSessionForView(s)}
                                                            style={styles.cardActionSecondary}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.cardActionSecondaryText}>👁️ [Ver medidas]</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            onPress={() => handleStartComparison(s)}
                                                            style={styles.cardActionCompare}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.cardActionCompareText}>⚖️ Comparar</Text>
                                                        </TouchableOpacity>

                                                        {/* PUENTE CAD: Iniciar creación y patronaje desde esta sesión (Componente 4) */}
                                                        <TouchableOpacity
                                                            onPress={() => handleOpenCadWizard(s)}
                                                            style={[styles.cardActionSecondary, { borderColor: colors.accent, backgroundColor: '#FFFDF9' }]}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={[styles.cardActionSecondaryText, { color: colors.accent, fontWeight: '700' }]}>
                                                                ✂️ Patronaje CAD
                                                            </Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                setFilterSessionId(s.id);
                                                                setActiveTab('patterns');
                                                            }}
                                                            style={[
                                                                styles.cardActionSecondary,
                                                                hasPatterns && { borderColor: colors.champagneGold, backgroundColor: '#FAF6ED' },
                                                            ]}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.cardActionSecondaryText,
                                                                    hasPatterns && { color: colors.champagneGold, fontWeight: '700' },
                                                                ]}
                                                            >
                                                                ✂️ [Ver patrones derivados] ({usedByPatterns.length})
                                                            </Text>
                                                        </TouchableOpacity>

                                                        {onOpenCad && (
                                                            <TouchableOpacity
                                                                onPress={() =>
                                                                    onOpenCad({
                                                                        clientId: client.id,
                                                                        sessionId: s.id,
                                                                    })
                                                                }
                                                                style={styles.cardActionPrimary}
                                                                activeOpacity={0.85}
                                                            >
                                                                <Text style={styles.cardActionPrimaryText}>⚡ Usar en Taller CAD</Text>
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

                        {/* PESTAÑA 3: CREACIONES DE ALTA COSTURA (Section 4 & 12) */}
                        {activeTab === 'creations' && (
                            <View style={styles.tabContentSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <View>
                                        <Text style={styles.sectionHeaderTitle}>CREACIONES & ENCARGOS ({creations.length})</Text>
                                        <Text style={styles.sectionHeaderSubtitle}>
                                            Proyectos a medida desacoplados de patronaje con trazabilidad hacia patrones activos.
                                        </Text>
                                    </View>
                                </View>

                                {/* SELECTOR DE SUJETO / ALUMNO EN CREACIONES */}
                                <View style={styles.subjectFilterCard}>
                                    <View style={styles.subjectFilterHeaderRow}>
                                        <Text style={styles.subjectFilterLabel}>
                                            FILTRAR POR BENEFICIARIO / ALUMNO ({persons.length > 0 ? persons.length + 1 : 1}):
                                        </Text>
                                        {persons.length > 3 && (
                                            <View style={styles.subjectSearchBox}>
                                                <Text style={{ fontSize: 11, color: colors.champagneGold, marginRight: 4 }}>🔍</Text>
                                                <TextInput
                                                    style={styles.subjectSearchInput}
                                                    placeholder="Buscar alumno o ref..."
                                                    placeholderTextColor={colors.textSecondary}
                                                    value={creationSubjectSearchQuery}
                                                    onChangeText={setCreationSubjectSearchQuery}
                                                />
                                                {creationSubjectSearchQuery ? (
                                                    <TouchableOpacity onPress={() => setCreationSubjectSearchQuery('')}>
                                                        <Text style={{ fontSize: 11, color: colors.textSecondary, paddingHorizontal: 4 }}>✕</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        )}
                                    </View>

                                    <ScrollView
                                        style={styles.subjectPillsWrapScroll}
                                        contentContainerStyle={styles.subjectPillsWrapContainer}
                                        nestedScrollEnabled={true}
                                    >
                                        <TouchableOpacity
                                            style={[styles.subjectPill, creationSubjectFilter === 'all' && styles.subjectPillActive]}
                                            onPress={() => setCreationSubjectFilter('all')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.subjectPillText, creationSubjectFilter === 'all' && styles.subjectPillTextActive]}>
                                                Todos ({creations.length})
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.subjectPill, creationSubjectFilter === 'titular' && styles.subjectPillActive]}
                                            onPress={() => setCreationSubjectFilter('titular')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.subjectPillText, creationSubjectFilter === 'titular' && styles.subjectPillTextActive]}>
                                                👤 Titular: {client.full_name} ({titularCreations.length})
                                            </Text>
                                        </TouchableOpacity>

                                        {filteredCreationPersons.map((p) => {
                                            const pCreationsCount = creations.filter((c) => c.person_id === p.id).length;
                                            const isSelected = creationSubjectFilter === p.id;
                                            return (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={[styles.subjectPill, isSelected && styles.subjectPillActive]}
                                                    onPress={() => setCreationSubjectFilter(p.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.subjectPillText, isSelected && styles.subjectPillTextActive]}>
                                                        👤 {p.full_name} {p.reference_id ? `[${p.reference_id}]` : ''} ({pCreationsCount})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}

                                        {filteredCreationPersons.length === 0 && creationSubjectSearchQuery ? (
                                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 4 }}>
                                                No se encontraron alumnos con «{creationSubjectSearchQuery}».
                                            </Text>
                                        ) : null}
                                    </ScrollView>
                                </View>

                                {/* RESUMEN DE ESTADOS KPI PARA CREACIONES */}
                                <View style={styles.kpiRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            creationStatusFilter === 'all' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() => setCreationStatusFilter('all')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.kpiLabel}>TOTAL CREACIONES</Text>
                                        <Text style={styles.kpiValue}>{currentCreationMetrics.total}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            creationStatusFilter === 'active' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setCreationStatusFilter((prev) => (prev === 'active' ? 'all' : 'active'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: colors.champagneGold }]}>🎨 EN DISEÑO</Text>
                                        <Text style={[styles.kpiValue, { color: colors.champagneGold }]}>{currentCreationMetrics.active}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            creationStatusFilter === 'fitting' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setCreationStatusFilter((prev) => (prev === 'fitting' ? 'all' : 'fitting'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#E65100' }]}>👗 EN PRUEBAS</Text>
                                        <Text style={[styles.kpiValue, { color: '#E65100' }]}>{currentCreationMetrics.fitting}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            creationStatusFilter === 'approved' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setCreationStatusFilter((prev) => (prev === 'approved' ? 'all' : 'approved'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#1565C0' }]}>⭐ APROBADAS</Text>
                                        <Text style={[styles.kpiValue, { color: '#1565C0' }]}>{currentCreationMetrics.approved}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            creationStatusFilter === 'production' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setCreationStatusFilter((prev) => (prev === 'production' ? 'all' : 'production'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#6A1B9A' }]}>🧵 PRODUCCIÓN</Text>
                                        <Text style={[styles.kpiValue, { color: '#6A1B9A' }]}>{currentCreationMetrics.production}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.kpiCard,
                                            creationStatusFilter === 'completed' && styles.kpiCardSelected,
                                        ]}
                                        onPress={() =>
                                            setCreationStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.kpiLabel, { color: '#2E7D32' }]}>🛡️ FINALIZADAS</Text>
                                        <Text style={[styles.kpiValue, { color: '#2E7D32' }]}>{currentCreationMetrics.completed}</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* BARRA DE BÚSQUEDA Y FILTROS COMBINADOS DE CREACIONES */}
                                <View style={styles.sessionsToolbarCard}>
                                    <View style={styles.sessionsSearchRow}>
                                        <View style={styles.sessionsSearchInputWrap}>
                                            <Text style={styles.sessionsSearchIcon}>🔍</Text>
                                            <TextInput
                                                style={styles.sessionsSearchInput}
                                                placeholder="Buscar por encargo, alumno, ref, ocasión o prenda..."
                                                placeholderTextColor={colors.textMuted}
                                                value={creationSearchQuery}
                                                onChangeText={setCreationSearchQuery}
                                            />
                                            {Boolean(creationSearchQuery) && (
                                                <TouchableOpacity
                                                    style={styles.sessionsSearchClearBtn}
                                                    onPress={() => setCreationSearchQuery('')}
                                                >
                                                    <Text style={styles.sessionsSearchClearBtnText}>✕</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {hasActiveCreationFilters && (
                                            <TouchableOpacity
                                                style={styles.sessionsClearAllFiltersBtn}
                                                onPress={handleClearCreationFilters}
                                            >
                                                <Text style={styles.sessionsClearAllFiltersText}>Limpiar Filtros</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.sessionsFiltersSubRow}>
                                        <View style={styles.statusPillsWrap}>
                                            <Text style={styles.statusPillsLabel}>ESTADO:</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsScroll}>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, creationStatusFilter === 'all' && styles.statusFilterPillActive]}
                                                    onPress={() => setCreationStatusFilter('all')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, creationStatusFilter === 'all' && styles.statusFilterPillTextActive]}>
                                                        Todos
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, creationStatusFilter === 'active' && styles.statusFilterPillActive]}
                                                    onPress={() => setCreationStatusFilter('active')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, creationStatusFilter === 'active' && styles.statusFilterPillTextActive]}>
                                                        🎨 En Diseño
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, creationStatusFilter === 'fitting' && styles.statusFilterPillActive]}
                                                    onPress={() => setCreationStatusFilter('fitting')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, creationStatusFilter === 'fitting' && styles.statusFilterPillTextActive]}>
                                                        👗 En Pruebas
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, creationStatusFilter === 'approved' && styles.statusFilterPillActive]}
                                                    onPress={() => setCreationStatusFilter('approved')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, creationStatusFilter === 'approved' && styles.statusFilterPillTextActive]}>
                                                        ⭐ Aprobada
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, creationStatusFilter === 'production' && styles.statusFilterPillActive]}
                                                    onPress={() => setCreationStatusFilter('production')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, creationStatusFilter === 'production' && styles.statusFilterPillTextActive]}>
                                                        🧵 Confección
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.statusFilterPill, creationStatusFilter === 'completed' && styles.statusFilterPillActive]}
                                                    onPress={() => setCreationStatusFilter('completed')}
                                                >
                                                    <Text style={[styles.statusFilterPillText, creationStatusFilter === 'completed' && styles.statusFilterPillTextActive]}>
                                                        🛡️ Finalizada
                                                    </Text>
                                                </TouchableOpacity>
                                            </ScrollView>
                                        </View>

                                        {/* Selector de orden cronológico */}
                                        <TouchableOpacity
                                            style={styles.sortToggleBtn}
                                            onPress={() => setCreationSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.sortToggleBtnText}>
                                                {creationSortOrder === 'desc' ? '📅 Más recientes primero ↓' : '📅 Más antiguas primero ↑'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {creations.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>Esta clienta no tiene creaciones asignadas.</Text>
                                    </View>
                                ) : displayedCreations.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>
                                            No se encontraron creaciones que coincidan con los filtros o búsqueda seleccionada.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.resetFiltersBtn}
                                            onPress={handleClearCreationFilters}
                                        >
                                            <Text style={styles.resetFiltersBtnText}>Restablecer Filtros</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {displayedCreations.map((c) => {
                                            const linkedSession = c.session_id ? sessionMap.get(c.session_id) : null;
                                            const activePattern = patterns.find((p) => p.id === c.active_pattern_execution_id);
                                            const beneficiary = c.person || (c.person_id ? personMap.get(c.person_id) : null);

                                            return (
                                                <View key={c.id} style={styles.cardItem}>
                                                    <View style={styles.cardItemHeader}>
                                                        <Image
                                                            source={getCreationPhoto(c)}
                                                            style={styles.cardGarmentPhoto}
                                                            resizeMode="cover"
                                                        />
                                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                                            <Text style={styles.cardItemTitle}>{c.name}</Text>
                                                            <Text style={styles.cardItemSubtitle}>
                                                                {c.creation_type?.toUpperCase()} · Prenda: {c.garment_type ? getGarmentLabel(c.garment_type) : 'Por definir'}
                                                            </Text>
                                                            {beneficiary && (
                                                                <View style={styles.beneficiaryBadge}>
                                                                    <Text style={styles.beneficiaryBadgeText}>
                                                                        👤 Alumno Beneficiario: <Text style={{ fontWeight: '700' }}>{beneficiary.full_name}</Text>
                                                                        {beneficiary.reference_id ? ` · Ref: ${beneficiary.reference_id}` : ''}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <View style={styles.statusTag}>
                                                            <Text style={styles.statusTagText}>{c.status?.toUpperCase()}</Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.metaGrid}>
                                                        {beneficiary && (
                                                            <View style={styles.metaItem}>
                                                                <Text style={styles.metaLabel}>BENEFICIARIO:</Text>
                                                                <Text style={styles.metaValue} numberOfLines={1}>
                                                                    {beneficiary.full_name} {beneficiary.reference_id ? `(${beneficiary.reference_id})` : ''}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        <View style={styles.metaItem}>
                                                            <Text style={styles.metaLabel}>FECHA OBJETIVO:</Text>
                                                            <Text style={styles.metaValue}>{c.target_date || 'No definida'}</Text>
                                                        </View>
                                                        <View style={styles.metaItem}>
                                                            <Text style={styles.metaLabel}>OCASIÓN:</Text>
                                                            <Text style={styles.metaValue}>{c.occasion || 'General'}</Text>
                                                        </View>
                                                        <View style={styles.metaItem}>
                                                            <Text style={styles.metaLabel}>SESIÓN MEDIDAS:</Text>
                                                            <Text style={styles.metaValue}>
                                                                {linkedSession ? `v${linkedSession.version_number} (${formatDate(linkedSession.session_date)})` : 'Sin medidas'}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.metaItem}>
                                                            <Text style={styles.metaLabel}>PATRÓN CAD:</Text>
                                                            {/* Caso Crítico 12: Creación sin patrón */}
                                                            <Text
                                                                style={[
                                                                    styles.metaValue,
                                                                    activePattern
                                                                        ? { color: colors.champagneGold, fontWeight: '700' }
                                                                        : { color: colors.textMuted, fontStyle: 'italic' },
                                                                ]}
                                                            >
                                                                {activePattern
                                                                    ? `${activePattern.version_label} (${activePattern.status})`
                                                                    : 'Patronaje no iniciado'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {c.notes ? <Text style={styles.cardItemNotes}>“{c.notes}”</Text> : null}

                                                    <View style={styles.cardItemFooter}>
                                                        {onOpenCreation && (
                                                            <TouchableOpacity
                                                                onPress={() => onOpenCreation(c.id)}
                                                                style={styles.cardActionSecondary}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.cardActionSecondaryText}>Ver Ficha de Creación →</Text>
                                                            </TouchableOpacity>
                                                        )}

                                                        {onOpenCad && (
                                                            <TouchableOpacity
                                                                onPress={() =>
                                                                    onOpenCad({
                                                                        clientId: client.id,
                                                                        sessionId: c.session_id,
                                                                        creationId: c.id,
                                                                        garmentType: (c.garment_type as GarmentType) || null,
                                                                        executionId: c.active_pattern_execution_id || null,
                                                                    })
                                                                }
                                                                style={styles.cardActionPrimary}
                                                                activeOpacity={0.85}
                                                            >
                                                                <Text style={styles.cardActionPrimaryText}>
                                                                    {activePattern ? '📐 Abrir Patrón CAD' : '⚡ Iniciar Patronaje CAD'}
                                                                </Text>
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

                        {/* PESTAÑA 4: PATRONES & LINAJE (Section 4, 5, 6, 11) */}
                        {activeTab === 'patterns' && (
                            <View style={styles.tabContentSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionHeaderTitle}>
                                        DIRECTORIO DE PATRONES & LINAJE ({patternGroups.length} Patrón CAD · {displayedPatterns.length} Ejecuciones Técnicas)
                                    </Text>
                                    <Text style={styles.sectionHeaderSubtitle}>
                                        Estructura Genealógica Inmutable: Patrón Conceptual → Creación → Versiones Derivadas → Patrón Vigente.
                                    </Text>
                                </View>

                                {/* Chip informativo de filtro si se activó desde una sesión */}
                                {filterSessionId && (
                                    <View style={styles.filterAlertBar}>
                                        <Text style={styles.filterAlertText}>
                                            Filtrando patrones derivados de Sesión #{filterSessionId.slice(0, 8)}... ({displayedPatterns.length} ejecuciones)
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setFilterSessionId(null)}
                                            style={styles.filterAlertClearBtn}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.filterAlertClearText}>✕ Ver todos los patrones</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {patternGroups.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>
                                            {filterSessionId
                                                ? 'Esta sesión de medidas no tiene patrones derivados asociados.'
                                                : 'Esta clienta aún no tiene ejecuciones de patronaje generadas.'}
                                        </Text>
                                        {filterSessionId && (
                                            <TouchableOpacity
                                                onPress={() => setFilterSessionId(null)}
                                                style={[styles.cardActionSecondary, { marginTop: 12 }]}
                                            >
                                                <Text style={styles.cardActionSecondaryText}>Ver todos los patrones</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View style={{ gap: 18 }}>
                                        {patternGroups.map((grp) => {
                                            const activeExec = grp.activeExecution;
                                            const activeStatusStyle = getStatusStyle(activeExec.status);
                                            const linkedCreation = grp.creationId ? creationMap.get(grp.creationId) : null;
                                            const garmentPhoto = getPatternGarmentPhoto(grp.garmentType, linkedCreation);

                                            return (
                                                <View
                                                    key={grp.id}
                                                    style={[
                                                        styles.groupMasterCard,
                                                        grp.isApproved && styles.cardItemApproved,
                                                    ]}
                                                >
                                                    {/* Encabezado del Grupo de Patrón con Fotografía Visual */}
                                                    <View style={styles.groupMasterHeader}>
                                                        <View style={styles.groupMasterHeaderLeft}>
                                                            <Image
                                                                source={garmentPhoto}
                                                                style={styles.patternGarmentPhoto}
                                                                resizeMode="cover"
                                                            />
                                                            <View style={{ flex: 1, minWidth: 200 }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                                    <Text style={styles.groupMasterTitle}>
                                                                        {getGarmentLabel(grp.garmentType)}
                                                                    </Text>
                                                                    <View style={styles.versionCountBadge}>
                                                                        <Text style={styles.versionCountBadgeText}>
                                                                            {grp.totalVersions} {grp.totalVersions === 1 ? 'ejecución' : 'ejecuciones'}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                    {linkedCreation ? (
                                                                        <View style={styles.creationBadge}>
                                                                            <Text style={styles.creationBadgeText}>
                                                                                👗 Creación: {linkedCreation.name}
                                                                            </Text>
                                                                        </View>
                                                                    ) : (
                                                                        <View style={[styles.creationBadge, { backgroundColor: '#F5F3EF', borderColor: colors.sand }]}>
                                                                            <Text style={[styles.creationBadgeText, { color: colors.textSecondary }]}>
                                                                                📐 Patrón independiente (Sin creación)
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                    <Text style={styles.cardItemSubtitle}>
                                                                        Última actualización: {formatDate(activeExec.created_at)}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>

                                                        <View
                                                            style={[
                                                                styles.statusTag,
                                                                {
                                                                    backgroundColor: activeStatusStyle.bg,
                                                                    borderColor: activeStatusStyle.border,
                                                                },
                                                            ]}
                                                        >
                                                            <Text style={[styles.statusTagText, { color: activeStatusStyle.color }]}>
                                                                {grp.isApproved ? '✓ VIGENTE · APROBADO' : `✓ VIGENTE · ${activeStatusStyle.label}`}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* ÁRBOL DE LINAJE TÉCNICO */}
                                                    <View style={styles.groupTreeBox}>
                                                        <Text style={styles.groupTreeBoxTitle}>
                                                            HISTORIAL TÉCNICO · {grp.totalVersions} EJECUCIONES & REVISIONES
                                                        </Text>
                                                        <View style={{ gap: 10, marginTop: 8 }}>
                                                            {grp.executions.slice(0, Math.min(grp.executions.length, 2)).map((p) => {
                                                                const isCurrent = p.id === activeExec.id;
                                                                const pStatus = getStatusStyle(p.status);
                                                                const pSession = p.session_id ? sessionMap.get(p.session_id) : null;

                                                                return (
                                                                    <View
                                                                        key={p.id}
                                                                        style={[
                                                                            styles.versionNodeCard,
                                                                            isCurrent && styles.versionNodeCardCurrent,
                                                                        ]}
                                                                    >
                                                                        <View style={styles.versionNodeHeaderRow}>
                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                                                                <View style={[styles.versionBadge, isCurrent && styles.versionBadgeCurrent]}>
                                                                                    <Text style={[styles.versionBadgeText, isCurrent && styles.versionBadgeTextCurrent]}>
                                                                                        {p.version_label}
                                                                                    </Text>
                                                                                </View>
                                                                                <View
                                                                                    style={[
                                                                                        styles.statusTagSmall,
                                                                                        {
                                                                                            backgroundColor: pStatus.bg,
                                                                                            borderColor: pStatus.border,
                                                                                        },
                                                                                    ]}
                                                                                >
                                                                                    <Text style={[styles.statusTagSmallText, { color: pStatus.color }]}>
                                                                                        {pStatus.label}
                                                                                    </Text>
                                                                                </View>
                                                                                {isCurrent ? (
                                                                                    <View style={styles.currentIndicatorBadge}>
                                                                                        <Text style={styles.currentIndicatorBadgeText}>● PATRÓN VIGENTE</Text>
                                                                                    </View>
                                                                                ) : (
                                                                                    <View style={styles.historicalIndicatorBadge}>
                                                                                        <Text style={styles.historicalIndicatorBadgeText}>○ HISTÓRICO</Text>
                                                                                    </View>
                                                                                )}
                                                                            </View>

                                                                            <Text style={styles.versionNodeDate}>
                                                                                {formatDate(p.created_at)}
                                                                            </Text>
                                                                        </View>

                                                                        {/* Fila de metadatos técnicos */}
                                                                        <View style={styles.versionNodeMetaRow}>
                                                                            <Text style={styles.versionNodeMetaText}>
                                                                                {p.parent_execution_id
                                                                                    ? `↳ Derivado de Padre #${p.parent_execution_id.slice(0, 8)}`
                                                                                    : '↳ Raíz original (Trazado base)'}
                                                                                {' · '}
                                                                                📐 Sesión: {pSession ? `v${pSession.version_number}` : 'N/A'}
                                                                                {' · '}
                                                                                Piezas CAD: {p.geometry_result?.pieces?.length || 0}
                                                                                {' · '}
                                                                                Holgura: {p.ease_profile_snapshot?.name || 'Estándar'}
                                                                            </Text>
                                                                        </View>

                                                                        {/* Acciones de la versión */}
                                                                        <View style={styles.versionNodeFooter}>
                                                                            <TouchableOpacity
                                                                                onPress={() => handleInspectPattern(p)}
                                                                                style={styles.cardActionSecondary}
                                                                                activeOpacity={0.8}
                                                                            >
                                                                                <Text style={styles.cardActionSecondaryText}>
                                                                                    🔍 Detalle & Linaje
                                                                                </Text>
                                                                            </TouchableOpacity>

                                                                            {onOpenCad && (
                                                                                <TouchableOpacity
                                                                                    onPress={() =>
                                                                                        onOpenCad({
                                                                                            clientId: client.id,
                                                                                            sessionId: p.session_id,
                                                                                            creationId: p.creation_id,
                                                                                            garmentType: p.garment_type,
                                                                                            executionId: p.id,
                                                                                        })
                                                                                    }
                                                                                    style={styles.cardActionPrimary}
                                                                                    activeOpacity={0.85}
                                                                                >
                                                                                    <Text style={styles.cardActionPrimaryText}>📐 Abrir CAD →</Text>
                                                                                </TouchableOpacity>
                                                                            )}
                                                                        </View>
                                                                    </View>
                                                                );
                                                            })}

                                                            {/* Grupo jerárquico desplegable para ejecuciones preliminares */}
                                                            {grp.executions.length > 2 && (
                                                                <View style={styles.preliminaryExecContainer}>
                                                                    <TouchableOpacity
                                                                        style={styles.preliminaryToggleBtn}
                                                                        onPress={() =>
                                                                            setExpandedHistoryGroupIds((prev) => ({
                                                                                ...prev,
                                                                                [grp.id]: !prev[grp.id],
                                                                            }))
                                                                        }
                                                                        activeOpacity={0.8}
                                                                    >
                                                                        <Text style={styles.preliminaryToggleBtnText}>
                                                                            {expandedHistoryGroupIds[grp.id]
                                                                                ? `▲ Ocultar ${grp.executions.length - 2} ejecuciones técnicas preliminares`
                                                                                : `▼ ${grp.executions.length - 2} ejecuciones preliminares (cálculos CAD de taller) [Ver historial completo]`}
                                                                        </Text>
                                                                    </TouchableOpacity>

                                                                    {expandedHistoryGroupIds[grp.id] && (
                                                                        <View style={{ gap: 10, marginTop: 10 }}>
                                                                            {grp.executions.slice(2).map((p) => {
                                                                                const isCurrent = p.id === activeExec.id;
                                                                                const pStatus = getStatusStyle(p.status);
                                                                                const pSession = p.session_id ? sessionMap.get(p.session_id) : null;

                                                                                return (
                                                                                    <View
                                                                                        key={p.id}
                                                                                        style={[
                                                                                            styles.versionNodeCard,
                                                                                            isCurrent && styles.versionNodeCardCurrent,
                                                                                        ]}
                                                                                    >
                                                                                        <View style={styles.versionNodeHeaderRow}>
                                                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                                                                                <View style={[styles.versionBadge, isCurrent && styles.versionBadgeCurrent]}>
                                                                                                    <Text style={[styles.versionBadgeText, isCurrent && styles.versionBadgeTextCurrent]}>
                                                                                                        {p.version_label}
                                                                                                    </Text>
                                                                                                </View>
                                                                                                <View
                                                                                                    style={[
                                                                                                        styles.statusTagSmall,
                                                                                                        {
                                                                                                            backgroundColor: pStatus.bg,
                                                                                                            borderColor: pStatus.border,
                                                                                                        },
                                                                                                    ]}
                                                                                                >
                                                                                                    <Text style={[styles.statusTagSmallText, { color: pStatus.color }]}>
                                                                                                        {pStatus.label}
                                                                                                    </Text>
                                                                                                </View>
                                                                                                <View style={styles.historicalIndicatorBadge}>
                                                                                                    <Text style={styles.historicalIndicatorBadgeText}>○ HISTÓRICO</Text>
                                                                                                </View>
                                                                                            </View>
                                                                                            <Text style={styles.versionNodeDate}>
                                                                                                {formatDate(p.created_at)}
                                                                                            </Text>
                                                                                        </View>
                                                                                        <View style={styles.versionNodeMetaRow}>
                                                                                            <Text style={styles.versionNodeMetaText}>
                                                                                                {p.parent_execution_id
                                                                                                    ? `↳ Derivado de Padre #${p.parent_execution_id.slice(0, 8)}`
                                                                                                    : '↳ Raíz original (Trazado base)'}
                                                                                                {' · '}📐 Sesión: {pSession ? `v${pSession.version_number}` : 'N/A'}
                                                                                                {' · '}Piezas: {p.geometry_result?.pieces?.length || 0}
                                                                                                {' · '}Holgura: {p.ease_profile_snapshot?.name || 'Estándar'}
                                                                                            </Text>
                                                                                        </View>
                                                                                        <View style={styles.versionNodeFooter}>
                                                                                            <TouchableOpacity
                                                                                                onPress={() => handleInspectPattern(p)}
                                                                                                style={styles.cardActionSecondary}
                                                                                                activeOpacity={0.8}
                                                                                            >
                                                                                                <Text style={styles.cardActionSecondaryText}>
                                                                                                    🔍 Detalle & Linaje
                                                                                                </Text>
                                                                                            </TouchableOpacity>
                                                                                            {onOpenCad && (
                                                                                                <TouchableOpacity
                                                                                                    onPress={() =>
                                                                                                        onOpenCad({
                                                                                                            clientId: client.id,
                                                                                                            sessionId: p.session_id,
                                                                                                            creationId: p.creation_id,
                                                                                                            garmentType: p.garment_type,
                                                                                                            executionId: p.id,
                                                                                                        })
                                                                                                    }
                                                                                                    style={styles.cardActionPrimary}
                                                                                                    activeOpacity={0.85}
                                                                                                >
                                                                                                    <Text style={styles.cardActionPrimaryText}>📐 Abrir CAD →</Text>
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
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* PESTAÑA 5: PERSONAS Y GRUPOS (Fase 1 Módulo 02) */}
                        {activeTab === 'persons_groups' && (
                            <View style={styles.tabContentSection}>
                                <PersonGroupSection
                                    client={client}
                                    onSessionCreated={() => {
                                        loadClientDossierData();
                                    }}
                                    onViewPersonHistory={(p) => {
                                        setSelectedSubjectFilter(p.id);
                                        setActiveTab('sessions');
                                    }}
                                />
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* MODAL 1: VISOR DETALLADO DE MEDIDAS DE UNA SESIÓN (REDISEÑO FASE B2 — B2-05) */}
            <Modal visible={Boolean(selectedSessionForView)} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxWidth: 780 }]}>
                        {selectedSessionForView && (() => {
                            const sessionPerson = selectedSessionForView.person_id
                                ? personMap.get(selectedSessionForView.person_id)
                                : null;
                            const isRectification =
                                selectedSessionForView.version_number > 1 ||
                                Boolean(selectedSessionForView.notes && selectedSessionForView.notes.includes('Rectificación'));
                            const avatar = sessionPerson
                                ? DEMOGRAPHIC_AVATARS[sessionPerson.demographic_category]
                                : require('../../../assets/mannequin_woman_real.jpg');
                            const hasOtherSessions = selectedSessionForView.person_id
                                ? sessions.filter((s) => s.person_id === selectedSessionForView.person_id && s.id !== selectedSessionForView.id).length > 0
                                : sessions.filter((s) => !s.person_id && s.id !== selectedSessionForView.id).length > 0;

                            const filteredCatalog = MASTER_MEASUREMENT_CATALOG.filter((item) => {
                                if (inspectorCategoryFilter === 'all') return true;
                                return item.category === inspectorCategoryFilter;
                            });

                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={styles.sessionAvatarWrap}>
                                                <Image source={avatar} style={styles.sessionAvatarImg} resizeMode="cover" />
                                            </View>
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={styles.modalSuper}>DETALLE ANATÓMICO DE LA SESIÓN · ALTA COSTURA</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text style={styles.modalTitle}>
                                                        {sessionPerson ? sessionPerson.full_name : `${client.full_name} (Titular)`}
                                                    </Text>
                                                    {isRectification ? (
                                                        <View style={styles.rectificationBadge}>
                                                            <Text style={styles.rectificationBadgeText}>
                                                                🔄 Rectificación v{selectedSessionForView.version_number}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View style={styles.versionBadgeClean}>
                                                            <Text style={styles.versionBadgeCleanText}>
                                                                v{selectedSessionForView.version_number}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View
                                                        style={[
                                                            styles.statusTag,
                                                            selectedSessionForView.status === 'completed'
                                                                ? { backgroundColor: '#E8F5E9' }
                                                                : selectedSessionForView.status === 'verified'
                                                                ? { backgroundColor: '#E3F2FD' }
                                                                : { backgroundColor: '#FFF3E0' },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.statusTagText,
                                                                selectedSessionForView.status === 'completed'
                                                                    ? { color: '#2E7D32' }
                                                                    : selectedSessionForView.status === 'verified'
                                                                    ? { color: '#1565C0' }
                                                                    : { color: '#E65100' },
                                                            ]}
                                                        >
                                                            {selectedSessionForView.status === 'completed'
                                                                ? '🛡️ FINALIZADA'
                                                                : selectedSessionForView.status === 'verified'
                                                                ? '✅ VERIFICADA'
                                                                : '⏳ BORRADOR'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.sessionSubMeta}>
                                                    📅 Fecha de toma: {formatDate(selectedSessionForView.session_date)} · Sistema: {selectedSessionForView.unit_system?.toUpperCase() || 'CM'}
                                                    {sessionPerson?.reference_id ? ` · Ref: ${sessionPerson.reference_id}` : ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => printA4MeasurementSheet(client, sessionPerson || null, selectedSessionForView)}
                                                style={styles.printA4Btn}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.printA4BtnText}>🖨️ Ficha A4</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setSelectedSessionForView(null)}
                                                style={styles.modalCloseBtn}
                                            >
                                                <Text style={styles.modalCloseBtnText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Notas de la Sesión si existen */}
                                    {selectedSessionForView.notes ? (
                                        <View style={styles.inspectorNotesBox}>
                                            <Text style={styles.inspectorNotesLabel}>OBSERVACIONES DE LA TOMA:</Text>
                                            <Text style={styles.inspectorNotesText}>“{selectedSessionForView.notes}”</Text>
                                        </View>
                                    ) : null}

                                    {/* Selector de Modo de Visualización: Tabla vs Maniquí */}
                                    <View style={styles.inspectorModeToggleRow}>
                                        <TouchableOpacity
                                            style={[styles.inspectorModeBtn, inspectorViewMode === 'grid' && styles.inspectorModeBtnActive]}
                                            onPress={() => setInspectorViewMode('grid')}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.inspectorModeBtnText, inspectorViewMode === 'grid' && styles.inspectorModeBtnTextActive]}>
                                                📋 Tabla de Cotas ({Object.keys(selectedSessionForView.values || {}).length})
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.inspectorModeBtn, inspectorViewMode === 'mannequin' && styles.inspectorModeBtnActive]}
                                            onPress={() => setInspectorViewMode('mannequin')}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.inspectorModeBtnText, inspectorViewMode === 'mannequin' && styles.inspectorModeBtnTextActive]}>
                                                👤 Ver en Maniquí Anatómico
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {inspectorViewMode === 'grid' ? (
                                        <>
                                            {/* Selector de Categorías Anatómicas */}
                                            <View style={styles.inspectorCategoryBar}>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inspectorPillsScroll}>
                                                    {[
                                                        { id: 'all', label: 'Todas las medidas' },
                                                        { id: 'torso_body', label: 'Torso y Busto' },
                                                        { id: 'arms_sleeves', label: 'Brazos y Mangas' },
                                                        { id: 'legs_pants', label: 'Piernas y Falda' },
                                                        { id: 'fit_adjustment', label: 'Ajuste y Holguras' },
                                                        { id: 'garment_design', label: 'Diseño de Prenda' },
                                                    ].map((cat) => (
                                                        <TouchableOpacity
                                                            key={cat.id}
                                                            style={[
                                                                styles.inspectorPill,
                                                                inspectorCategoryFilter === cat.id && styles.inspectorPillActive,
                                                            ]}
                                                            onPress={() => setInspectorCategoryFilter(cat.id)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.inspectorPillText,
                                                                    inspectorCategoryFilter === cat.id && styles.inspectorPillTextActive,
                                                                ]}
                                                            >
                                                                {cat.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>

                                            <ScrollView style={{ maxHeight: 420, padding: 14 }}>
                                                <View style={styles.measGrid}>
                                                    {filteredCatalog.map((item) => {
                                                        const valItem = selectedSessionForView.values?.[item.code];
                                                        const valMm = valItem?.value_mm;
                                                        const isFilled = typeof valMm === 'number' && valMm > 0;
                                                        const valDisplay = isFilled
                                                            ? selectedSessionForView.unit_system === 'in'
                                                                ? `${(valMm / 25.4).toFixed(2)} in`
                                                                : `${(valMm / 10).toFixed(1)} cm`
                                                            : '—';

                                                        return (
                                                            <View key={item.code} style={[styles.measItem, isFilled && styles.measItemFilled]}>
                                                                <Text style={styles.measItemName}>{item.name}</Text>
                                                                <Text style={[styles.measItemValue, isFilled && styles.measItemValueFilled]}>
                                                                    {valDisplay}
                                                                </Text>
                                                                {isFilled && valItem && (
                                                                    <View style={styles.measItemMetaRow}>
                                                                        {valItem.side && valItem.side !== 'none' && (
                                                                            <View style={styles.measItemBadge}>
                                                                                <Text style={styles.measItemBadgeText}>
                                                                                    {valItem.side === 'left' ? 'Izq' : 'Der'}
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                        <View style={styles.measItemBadge}>
                                                                            <Text style={styles.measItemBadgeText}>
                                                                                {valItem.source === 'calculated' ? 'Calculada' : 'Directa'}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        </>
                                    ) : (
                                        <View style={styles.inspectorMannequinContainer}>
                                            <AtelierGrandAnatomicalMannequin
                                                measurementsMm={inspectorMeasurementsMm}
                                                session={selectedSessionForView}
                                                clientName={sessionPerson?.full_name || client.full_name}
                                                referenceProfileLabel={sessionPerson ? `Alumno / Beneficiario: ${sessionPerson.full_name}` : 'Titular'}
                                                demographic={inspectorDemographic}
                                                onDemographicChange={setInspectorDemographic}
                                                perspective={inspectorPerspective}
                                                onPerspectiveChange={setInspectorPerspective}
                                                selectedMeasureCode={inspectorSelectedCode}
                                                onSelectMeasureCode={(code) => setInspectorSelectedCode(code)}
                                                viewMode={inspectorMannequinMode}
                                                onViewModeChange={setInspectorMannequinMode}
                                                densityMode={inspectorDensityMode}
                                                onDensityModeChange={setInspectorDensityMode}
                                            />
                                        </View>
                                    )}

                                    <View style={styles.modalFooter}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                const targetSession = selectedSessionForView;
                                                setSelectedSessionForView(null);
                                                handleOpenCadWizard(targetSession);
                                            }}
                                            style={styles.modalCadBtn}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.modalCadBtnText}>✂️ Iniciar Creación CAD con esta Sesión</Text>
                                        </TouchableOpacity>

                                        {selectedSessionForView.status === 'draft' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const draftSess = selectedSessionForView;
                                                    setSelectedSessionForView(null);
                                                    const targetPerson = draftSess.person_id ? personMap.get(draftSess.person_id) || null : null;
                                                    handleOpenFastCapture(targetPerson, draftSess);
                                                }}
                                                style={styles.modalDraftResumeBtn}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.modalDraftResumeBtnText}>✏️ Reanudar Captura</Text>
                                            </TouchableOpacity>
                                        )}

                                        {hasOtherSessions && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const s = selectedSessionForView;
                                                    setSelectedSessionForView(null);
                                                    handleStartComparison(s);
                                                }}
                                                style={styles.modalCompareBtn}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.modalCompareBtnText}>⚖️ Comparar con otra sesión</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={() => setSelectedSessionForView(null)}
                                            style={styles.modalDoneBtn}
                                        >
                                            <Text style={styles.modalDoneBtnText}>Cerrar Visor</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* MODAL 1B: COMPARADOR HISTÓRICO DE MEDIDAS (FASE B2 — B2-06, B2-11, B2-12, B2-13) */}
            <Modal visible={showComparisonModal && Boolean(compareBaseSession) && Boolean(compareTargetSession)} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxWidth: 840 }]}>
                        {compareBaseSession && compareTargetSession && (() => {
                            const person = compareBaseSession.person_id
                                ? personMap.get(compareBaseSession.person_id)
                                : null;
                            const subjectName = person ? person.full_name : `${client.full_name} (Titular)`;

                            // Calcular medidas comparables
                            let comparableCount = 0;
                            const comparisonRows = MASTER_MEASUREMENT_CATALOG.map((item) => {
                                const baseValItem = compareBaseSession.values?.[item.code];
                                const targetValItem = compareTargetSession.values?.[item.code];
                                const baseMm = baseValItem?.value_mm;
                                const targetMm = targetValItem?.value_mm;
                                const hasBase = typeof baseMm === 'number' && baseMm > 0;
                                const hasTarget = typeof targetMm === 'number' && targetMm > 0;

                                if (!hasBase && !hasTarget) return null;

                                if (hasBase && hasTarget) {
                                    comparableCount++;
                                    const deltaMm = targetMm - baseMm;
                                    const deltaCm = (deltaMm / 10).toFixed(1);
                                    const sign = deltaMm > 0 ? `+${deltaCm}` : deltaMm < 0 ? `${deltaCm}` : '0.0';
                                    return {
                                        code: item.code,
                                        name: item.name,
                                        category: item.category,
                                        baseDisplay: `${(baseMm / 10).toFixed(1)} cm`,
                                        targetDisplay: `${(targetMm / 10).toFixed(1)} cm`,
                                        deltaDisplay: `${sign} cm`,
                                        deltaType: deltaMm > 0 ? 'pos' : deltaMm < 0 ? 'neg' : 'zero',
                                        isComparable: true,
                                    };
                                }

                                return {
                                    code: item.code,
                                    name: item.name,
                                    category: item.category,
                                    baseDisplay: hasBase ? `${(baseMm / 10).toFixed(1)} cm` : '—',
                                    targetDisplay: hasTarget ? `${(targetMm / 10).toFixed(1)} cm` : '—',
                                    deltaDisplay: hasBase ? '○ Ausente en comparada' : '○ Ausente en base',
                                    deltaType: 'missing',
                                    isComparable: false,
                                };
                            }).filter(Boolean);

                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalSuper}>ANÁLISIS COMPARATIVO ANATÓMICO · ALTA COSTURA</Text>
                                            <Text style={styles.modalTitle}>Comparador Histórico: {subjectName}</Text>
                                            <Text style={styles.compModalNotice}>
                                                Comparación estricta entre sesiones inmutables de la misma persona.
                                                Diferencia: Δ = Comparada (v{compareTargetSession.version_number}) − Base (v{compareBaseSession.version_number}).
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setShowComparisonModal(false)}
                                            style={styles.modalCloseBtn}
                                        >
                                            <Text style={styles.modalCloseBtnText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Selector de Sesión Objetivo a Comparar */}
                                    <View style={styles.compSelectorBar}>
                                        <Text style={styles.compSelectorLabel}>COMPARAR CONTRA SESIÓN:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compCandidateScroll}>
                                            {availableComparisonCandidates.map((cand) => {
                                                const isSelected = compareTargetSession.id === cand.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={cand.id}
                                                        style={[styles.compCandidatePill, isSelected && styles.compCandidatePillActive]}
                                                        onPress={() => setCompareTargetSession(cand)}
                                                    >
                                                        <Text style={[styles.compCandidateText, isSelected && styles.compCandidateTextActive]}>
                                                            v{cand.version_number} ({formatDate(cand.session_date)}) · {cand.status.toUpperCase()}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    {/* Tabla Comparativa de Medidas */}
                                    <ScrollView style={{ maxHeight: 420, paddingHorizontal: 14, paddingTop: 10 }}>
                                        <View style={styles.compTableHeaderRow}>
                                            <Text style={[styles.compColHeader, { flex: 2.6 }]}>MEDIDA / PUNTO ANATÓMICO</Text>
                                            <Text style={[styles.compColHeader, { flex: 1.4, textAlign: 'center' }]}>
                                                BASE (v{compareBaseSession.version_number})
                                            </Text>
                                            <Text style={[styles.compColHeader, { flex: 1.4, textAlign: 'center' }]}>
                                                COMPARADA (v{compareTargetSession.version_number})
                                            </Text>
                                            <Text style={[styles.compColHeader, { flex: 1.8, textAlign: 'right' }]}>
                                                DIFERENCIA (Δ)
                                            </Text>
                                        </View>

                                        <View style={styles.compTableBody}>
                                            {comparisonRows.map((row: any) => (
                                                <View key={row.code} style={styles.compTableRow}>
                                                    <View style={[styles.compTableCell, { flex: 2.6 }]}>
                                                        <Text style={styles.compRowName}>{row.name}</Text>
                                                        <Text style={styles.compRowCode}>{row.code}</Text>
                                                    </View>

                                                    <View style={[styles.compTableCell, { flex: 1.4, alignItems: 'center' }]}>
                                                        <Text style={styles.compRowBaseVal}>{row.baseDisplay}</Text>
                                                    </View>

                                                    <View style={[styles.compTableCell, { flex: 1.4, alignItems: 'center' }]}>
                                                        <Text style={styles.compRowTargetVal}>{row.targetDisplay}</Text>
                                                    </View>

                                                    <View style={[styles.compTableCell, { flex: 1.8, alignItems: 'flex-end' }]}>
                                                        <View
                                                            style={[
                                                                styles.compDeltaBadge,
                                                                row.deltaType === 'pos'
                                                                    ? styles.compDeltaBadgePos
                                                                    : row.deltaType === 'neg'
                                                                    ? styles.compDeltaBadgeNeg
                                                                    : row.deltaType === 'zero'
                                                                    ? styles.compDeltaBadgeZero
                                                                    : styles.compDeltaBadgeMissing,
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.compDeltaText,
                                                                    row.deltaType === 'pos'
                                                                        ? styles.compDeltaTextPos
                                                                        : row.deltaType === 'neg'
                                                                        ? styles.compDeltaTextNeg
                                                                        : row.deltaType === 'zero'
                                                                        ? styles.compDeltaTextZero
                                                                        : styles.compDeltaTextMissing,
                                                                ]}
                                                            >
                                                                {row.deltaDisplay}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>

                                    <View style={styles.modalFooter}>
                                        <Text style={styles.compFooterSummary}>
                                            Total: <Text style={{ fontWeight: '700' }}>{comparableCount}</Text> medidas cotejadas entre versiones
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() => setShowComparisonModal(false)}
                                            style={styles.modalDoneBtn}
                                        >
                                            <Text style={styles.modalDoneBtnText}>Cerrar Comparador</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* MODAL 2: DETALLE DEL PATRÓN, INMUTABILIDAD Y LINAJE (Section 6 & 9) */}
            <Modal visible={Boolean(inspectedPattern)} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {inspectedPattern && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Image
                                        source={getPatternGarmentPhoto(
                                            inspectedPattern.garment_type,
                                            inspectedPattern.creation_id ? creationMap.get(inspectedPattern.creation_id) : null
                                        )}
                                        style={styles.modalGarmentPhoto}
                                        resizeMode="cover"
                                    />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.modalSuper}>DETALLE TÉCNICO DEL PATRÓN · ALTA COSTURA</Text>
                                        <Text style={styles.modalTitle}>
                                            {getGarmentLabel(inspectedPattern.garment_type)} · {inspectedPattern.version_label}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setInspectedPattern(null)}
                                        style={styles.modalCloseBtn}
                                    >
                                        <Text style={styles.modalCloseBtnText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={{ maxHeight: 520, padding: 16 }} showsVerticalScrollIndicator={false}>
                                    {/* AVISO DE INMUTABILIDAD ESTRICTA (Section 6 & 14) */}
                                    <View style={styles.inmutabilityNoticeBox}>
                                        <Text style={styles.inmutabilityNoticeTitle}>
                                            🛡️ EJECUCIÓN HISTÓRICA INMUTABLE
                                        </Text>
                                        <Text style={styles.inmutabilityNoticeBody}>
                                            Esta ejecución es estrictamente inmutable para garantizar la reproducibilidad y trazabilidad técnica en taller. No se permite edición directa. Las modificaciones de fitting engendran una nueva versión derivada.
                                        </Text>
                                    </View>

                                    {/* DETALLE TÉCNICO ESPECIFICADO EN SECCIÓN 6 */}
                                    <View style={styles.modalDetailCard}>
                                        <Text style={styles.modalDetailCardTitle}>FICHA DE TRAZABILIDAD</Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Prenda:</Text>
                                            <Text style={styles.detailValue}>{getGarmentLabel(inspectedPattern.garment_type)}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Plantilla:</Text>
                                            <Text style={styles.detailValue}>
                                                {inspectedPattern.template?.name || getTemplateLabel(inspectedPattern.garment_type)}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Versión:</Text>
                                            <Text style={styles.detailValueBold}>{inspectedPattern.version_label}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Estado:</Text>
                                            <Text style={styles.detailValueBold}>{inspectedPattern.status}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Clienta:</Text>
                                            <Text style={styles.detailValue}>{client.full_name}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Sesión de medidas:</Text>
                                            <Text style={styles.detailValue}>
                                                {inspectedPattern.session_id
                                                    ? sessionMap.get(inspectedPattern.session_id)
                                                        ? `Sesión v${sessionMap.get(inspectedPattern.session_id)!.version_number} (${formatDate(sessionMap.get(inspectedPattern.session_id)!.session_date)})`
                                                        : `ID #${inspectedPattern.session_id.slice(0, 8)}`
                                                    : 'Sin sesión asignada'}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Creación:</Text>
                                            <Text style={styles.detailValue}>
                                                {inspectedPattern.creation_id
                                                    ? creationMap.get(inspectedPattern.creation_id)?.name || 'Creación vinculada'
                                                    : 'Sin Creación (Patronaje Directo)'}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Origen:</Text>
                                            <Text style={[styles.detailValueBold, { color: getPatternOrigin(inspectedPattern).badgeColor }]}>
                                                {getPatternOrigin(inspectedPattern).badgeText}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Fecha:</Text>
                                            <Text style={styles.detailValue}>{formatDate(inspectedPattern.created_at)}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Patrón Padre (Linaje):</Text>
                                            {inspectedPattern.parent_execution_id ? (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const parentP = patterns.find((p) => p.id === inspectedPattern.parent_execution_id);
                                                        if (parentP) handleInspectPattern(parentP);
                                                    }}
                                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                                >
                                                    <Text style={[styles.detailValueBold, { color: colors.champagneGold, textDecorationLine: 'underline' }]}>
                                                        {patterns.find((p) => p.id === inspectedPattern.parent_execution_id)?.version_label || 'Versión anterior'} (#{inspectedPattern.parent_execution_id.slice(0, 8)}) →
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <Text style={styles.detailValue}>Raíz original (Trazado base)</Text>
                                            )}
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Aprobación Técnica:</Text>
                                            <Text style={[styles.detailValueBold, { color: inspectedPattern.status === 'approved_by_designer' ? '#2E7D32' : colors.textSecondary }]}>
                                                {inspectedPattern.status === 'approved_by_designer'
                                                    ? '✓ Aprobado para corte final · Katherine Carroll'
                                                    : inspectedPattern.status === 'pending_fitting'
                                                    ? '⏳ En prueba de vestuario (Fitting pendiente)'
                                                    : 'Pendiente de fitting y aprobación'}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Diseñadora:</Text>
                                            <Text style={styles.detailValue}>Katherine Carroll · Atelier Digital</Text>
                                        </View>
                                    </View>

                                    {/* LINAJE DE VERSIONES HISTÓRICAS (Section 6) */}
                                    <View style={styles.modalDetailCard}>
                                        <Text style={styles.modalDetailCardTitle}>LINAJE & HISTORIAL DE VERSIONES</Text>
                                        <Text style={styles.modalDetailCardSub}>
                                            Selecciona cualquier versión para inspeccionar su histórico inmutable:
                                        </Text>

                                        <View style={styles.lineageTreeContainer}>
                                            {lineageChain.map((item, idx) => {
                                                const isCurrent = item.id === inspectedPattern.id;
                                                return (
                                                    <View key={item.id} style={styles.lineageNodeWrapper}>
                                                        <TouchableOpacity
                                                            onPress={() => handleInspectPattern(item)}
                                                            style={[
                                                                styles.lineageNodeCard,
                                                                isCurrent && styles.lineageNodeCardCurrent,
                                                            ]}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={styles.lineageNodeTop}>
                                                                <Text
                                                                    style={[
                                                                        styles.lineageVersionText,
                                                                        isCurrent && styles.lineageVersionTextCurrent,
                                                                    ]}
                                                                >
                                                                    {item.version_label}
                                                                </Text>
                                                                <Text style={styles.lineageStatusTag}>
                                                                    {item.status === 'approved_by_designer'
                                                                        ? '✓ APROBADO'
                                                                        : item.status.toUpperCase()}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.lineageNodeDate}>
                                                                {formatDate(item.created_at)} · {item.parent_execution_id ? 'Derivada' : 'Raíz original'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                        {idx < lineageChain.length - 1 && (
                                                            <View style={styles.lineageArrowWrap}>
                                                                <Text style={styles.lineageArrowText}>↓</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* COMPARACIÓN DE MEDIDAS: SNAPSHOT VS MEDIDAS ACTUALES (Section 9) */}
                                    <View style={styles.modalDetailCard}>
                                        <Text style={styles.modalDetailCardTitle}>TRAZABILIDAD DE MEDIDAS ANATÓMICAS</Text>
                                        <Text style={styles.modalDetailCardSub}>
                                            Diferencia entre el snapshot utilizado al generar este patrón y las medidas actuales de la clienta.
                                        </Text>

                                        <View style={styles.measComparisonBox}>
                                            <View style={styles.measCol}>
                                                <Text style={styles.measColHeader}>
                                                    MEDIDAS UTILIZADAS EN ESTE PATRÓN (Snapshot Inmutable)
                                                </Text>
                                                {inspectedPattern.measurement_snapshot ? (
                                                    Object.entries(inspectedPattern.measurement_snapshot).slice(0, 8).map(([code, val]) => (
                                                        <View key={code} style={styles.measItemSmall}>
                                                            <Text style={styles.measItemSmallKey}>
                                                                {(MASTER_MEASUREMENT_CATALOG as Record<string, any>)[code]?.name || code}:
                                                            </Text>
                                                            <Text style={styles.measItemSmallVal}>{val} cm</Text>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <Text style={styles.emptyStateNotice}>Sin snapshot registrado</Text>
                                                )}
                                            </View>

                                            <View style={styles.measColDivider} />

                                            <View style={styles.measCol}>
                                                {(() => {
                                                    const patSession = inspectedPattern.session_id ? sessionMap.get(inspectedPattern.session_id) : null;
                                                    const comparisonSession = patSession || (!isInstitutional ? latestTitularSession : null);
                                                    const comparisonPerson = comparisonSession?.person_id ? personMap.get(comparisonSession.person_id) : null;

                                                    return (
                                                        <>
                                                            <Text style={styles.measColHeader}>
                                                                {comparisonPerson
                                                                    ? `MEDIDAS: ${comparisonPerson.full_name.toUpperCase()}`
                                                                    : isInstitutional
                                                                    ? 'MEDIDAS DE SESIÓN VINCULADA'
                                                                    : 'MEDIDAS ACTUALES DE LA CLIENTA (Última Sesión)'}
                                                            </Text>
                                                            {comparisonSession?.values ? (
                                                                Object.entries(comparisonSession.values).slice(0, 8).map(([code, item]) => {
                                                                    const cm = item.value_mm ? (item.value_mm / 10).toFixed(1) : '—';
                                                                    return (
                                                                        <View key={code} style={styles.measItemSmall}>
                                                                            <Text style={styles.measItemSmallKey}>
                                                                                {(MASTER_MEASUREMENT_CATALOG as Record<string, any>)[code]?.name || code}:
                                                                            </Text>
                                                                            <Text style={styles.measItemSmallVal}>{cm} cm</Text>
                                                                        </View>
                                                                    );
                                                                })
                                                            ) : (
                                                                <Text style={styles.emptyStateNotice}>
                                                                    {isInstitutional
                                                                        ? 'Sin sesión de medidas vinculada a este patrón'
                                                                        : 'Sin medidas actuales'}
                                                                </Text>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </View>
                                        </View>
                                    </View>

                                    {/* AJUSTES DE FITTING HISTÓRICOS */}
                                    <View style={styles.modalDetailCard}>
                                        <Text style={styles.modalDetailCardTitle}>AJUSTES DE FITTING REGISTRADOS ({patternAdjustments.length})</Text>
                                        {loadingAdjustments ? (
                                            <ActivityIndicator size="small" color={colors.champagneGold} />
                                        ) : patternAdjustments.length === 0 ? (
                                            <Text style={styles.emptyStateNotice}>
                                                Esta versión no tiene ajustes manuales registrados.
                                            </Text>
                                        ) : (
                                            <View style={{ gap: 8, marginTop: 6 }}>
                                                {patternAdjustments.map((adj) => (
                                                    <View key={adj.id} style={styles.adjItemCard}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <Text style={styles.adjItemType}>{adj.adjustment_type?.toUpperCase()}</Text>
                                                            <Text style={styles.adjItemDate}>{formatDate(adj.fitting_date)}</Text>
                                                        </View>
                                                        <Text style={styles.adjItemDesc}>{adj.description}</Text>
                                                        <Text style={styles.adjItemPiece}>
                                                            Pieza: {adj.target_piece} · Delta: {adj.delta_mm > 0 ? `+${adj.delta_mm}` : adj.delta_mm} mm
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </ScrollView>

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        onPress={() => setInspectedPattern(null)}
                                        style={styles.modalDoneBtn}
                                    >
                                        <Text style={styles.modalDoneBtnText}>Cerrar Detalle</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* MODAL FASE C: CAPTURA RÁPIDA DE MEDIDAS ANATÓMICAS */}
            {showFastCaptureModal && (
                <AtelierFastMeasurementCaptureModal
                    visible={showFastCaptureModal}
                    client={client}
                    person={captureSubjectPerson}
                    existingDraftSession={captureDraftSession}
                    onClose={() => {
                        setShowFastCaptureModal(false);
                        setCaptureDraftSession(null);
                        setCaptureSubjectPerson(null);
                    }}
                    onSessionSaved={() => {
                        loadClientDossierData();
                    }}
                    onProceedToCad={(savedSession) => {
                        setShowFastCaptureModal(false);
                        setCaptureDraftSession(null);
                        setCaptureSubjectPerson(null);
                        loadClientDossierData();
                        handleOpenCadWizard(savedSession);
                    }}
                />
            )}

            {/* MODAL FASE C: PUENTE ENTRE MEDIDAS, CREACIÓN Y PATRONAJE CAD */}
            {showCadWizardModal && (
                <PersonCreationCadWizardModal
                    visible={showCadWizardModal}
                    client={client}
                    person={cadWizardPerson}
                    initialSessionId={cadWizardSessionId}
                    onClose={() => {
                        setShowCadWizardModal(false);
                        setCadWizardPerson(null);
                        setCadWizardSessionId(null);
                    }}
                    onCadExecutionGenerated={() => {
                        loadClientDossierData();
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: colors.surfaceSubtle,
    },
    backButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    topRightActions: {
        flexDirection: 'row',
        gap: 8,
    },
    editButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFFFF',
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    dossierHeaderCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0 4px 14px rgba(0,0,0,0.04)' },
            default: { elevation: 2 },
        }),
    },
    dossierSuperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dossierBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        backgroundColor: colors.atelierBlack,
        borderRadius: 3,
    },
    dossierBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    clientStatusTag: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
        borderWidth: 1,
    },
    statusActive: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    statusArchived: {
        backgroundColor: '#F5F5F5',
        borderColor: '#CCCCCC',
    },
    clientStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextArchived: {
        color: colors.textSecondary,
    },
    clientIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 14,
    },
    avatarMonogram: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.champagneGold,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    identityTextWrap: {
        flex: 1,
    },
    clientFullName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    contactDetailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 4,
    },
    contactItem: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    registrationDate: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
    },
    notesContainer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        gap: 8,
    },
    noteItem: {},
    noteLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    noteValue: {
        fontSize: 12,
        color: colors.textPrimary,
        lineHeight: 16,
    },
    summarySectionBox: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        backgroundColor: '#FCFAF7',
        padding: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#F0ECE1',
    },
    summarySectionBoxTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'space-between',
    },
    summaryGridItem: {
        minWidth: 110,
    },
    summaryGridKey: {
        fontSize: 9,
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    summaryGridVal: {
        fontSize: 12.5,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginTop: 1,
    },
    summaryGridValBold: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 1,
    },
    summaryGridSubText: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 1,
    },
    summaryMicroLegend: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ECE7DD',
    },
    summaryMicroLegendText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.textSecondary,
        lineHeight: 15,
    },
    preliminaryExecContainer: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#FBF9F5',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E8E1D5',
        borderStyle: 'dashed',
    },
    preliminaryToggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    preliminaryToggleBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.champagneGold,
        letterSpacing: 0.3,
    },
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
        marginBottom: 16,
        gap: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        borderRadius: 4,
    },
    tabButtonActive: {
        backgroundColor: colors.atelierBlack,
    },
    tabButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tabButtonTextActive: {
        color: '#FFFFFF',
    },
    tabContentSection: {
        gap: 12,
    },
    sectionHeaderRow: {
        marginBottom: 6,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.6,
    },
    sectionHeaderSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    summaryCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
    },
    summaryCardHeader: {
        marginBottom: 10,
    },
    summaryCardSuper: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.6,
    },
    summaryCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    summaryDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    summaryDetailLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    summaryDetailValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    summaryActionBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    summaryActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    miniListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    miniGarmentPhoto: {
        width: 44,
        height: 44,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    viewAllCreationsBtn: {
        marginTop: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewAllCreationsBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.champagneGold,
        fontFamily: typography.sans,
    },
    cardGarmentPhoto: {
        width: 54,
        height: 54,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    miniItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    miniItemBeneficiary: {
        fontSize: 11,
        color: colors.champagneGold,
        fontWeight: '700',
        marginTop: 1,
    },
    miniItemSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    miniItemBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 3,
        backgroundColor: colors.surfaceSubtle,
    },
    miniItemBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    emptyStateNotice: {
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
        paddingVertical: 6,
    },
    emptyBox: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyBoxText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    cardItem: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardItemApproved: {
        borderColor: '#81C784',
        borderLeftWidth: 4,
        borderLeftColor: '#2E7D32',
    },
    cardItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    versionBadge: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
    },
    versionBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cardItemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    cardItemSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    beneficiaryBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        marginTop: 4,
    },
    beneficiaryBadgeText: {
        fontSize: 11,
        color: colors.atelierBlack,
        fontWeight: '500',
    },
    cardItemSubDate: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 1,
    },
    statusTag: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
        borderWidth: 1,
        backgroundColor: '#F5F3EF',
        borderColor: colors.sand,
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    cardItemNotes: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginVertical: 6,
    },
    linksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    linkBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
        backgroundColor: '#F8F2E9',
    },
    linkBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    cardItemFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5F3EF',
    },
    cardActionSecondary: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    cardActionSecondaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    cardActionPrimary: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    cardActionPrimaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginVertical: 8,
        backgroundColor: colors.surfaceSubtle,
        padding: 10,
        borderRadius: 4,
    },
    metaItem: {
        width: '46%',
    },
    metaLabel: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '700',
    },
    metaValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 1,
    },
    originRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginVertical: 6,
    },
    originBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
        borderWidth: 1,
    },
    originBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    creationBadge: {
        backgroundColor: '#FFF8E7',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#F2D48E',
    },
    creationBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#B37D14',
    },
    sessionBadge: {
        backgroundColor: '#F0F4F8',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
    },
    sessionBadgeText: {
        fontSize: 11,
        color: '#334E68',
    },
    patternSpecsRow: {
        marginVertical: 4,
    },
    patternSpecsText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    filterAlertBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#EBF3FB',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#BED8F6',
        marginBottom: 10,
    },
    filterAlertText: {
        fontSize: 12,
        color: '#1565C0',
        fontWeight: '600',
    },
    filterAlertClearBtn: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    filterAlertClearText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1565C0',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 12,
        color: colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        width: '100%',
        maxWidth: 620,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surfaceSubtle,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalSuper: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    modalCloseBtnText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    measSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 10,
    },
    measGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    measItem: {
        width: '48%',
        padding: 8,
        backgroundColor: '#FAF9F6',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    measItemFilled: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.sand,
    },
    measItemName: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    measItemValue: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        marginTop: 2,
    },
    measItemValueFilled: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    modalFooter: {
        padding: 14,
        backgroundColor: colors.surfaceSubtle,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'flex-end',
    },
    modalDoneBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    modalDoneBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    inmutabilityNoticeBox: {
        padding: 12,
        backgroundColor: '#FEF9F0',
        borderRadius: 6,
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
        marginBottom: 14,
    },
    inmutabilityNoticeTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A5D10',
        letterSpacing: 0.6,
        marginBottom: 3,
    },
    inmutabilityNoticeBody: {
        fontSize: 11,
        color: '#5A4621',
        lineHeight: 16,
    },
    modalDetailCard: {
        backgroundColor: '#FCFAF7',
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EFECE6',
        marginBottom: 12,
    },
    modalDetailCardTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    modalDetailCardSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    detailLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    detailValue: {
        fontSize: 12,
        color: colors.atelierBlack,
    },
    detailValueBold: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    lineageTreeContainer: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    lineageNodeWrapper: {
        alignItems: 'center',
        width: '100%',
    },
    lineageNodeCard: {
        width: '100%',
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    lineageNodeCardCurrent: {
        borderColor: colors.champagneGold,
        borderWidth: 2,
        backgroundColor: '#FFFDF9',
    },
    lineageNodeTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lineageVersionText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    lineageVersionTextCurrent: {
        color: colors.champagneGold,
    },
    lineageStatusTag: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    lineageNodeDate: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    lineageArrowWrap: {
        paddingVertical: 4,
    },
    lineageArrowText: {
        fontSize: 16,
        color: colors.champagneGold,
        fontWeight: '700',
    },
    measComparisonBox: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    measCol: {
        flex: 1,
    },
    measColHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    measColDivider: {
        width: 1,
        backgroundColor: colors.sand,
    },
    measItemSmall: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    measItemSmallKey: {
        fontSize: 11,
        color: colors.textSecondary,
        flex: 1,
    },
    measItemSmallVal: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    adjItemCard: {
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    adjItemType: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    adjItemDate: {
        fontSize: 10,
        color: colors.textMuted,
    },
    adjItemDesc: {
        fontSize: 12,
        color: colors.textPrimary,
        marginVertical: 2,
    },
    adjItemPiece: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    // Estilos de Alta Costura para Linaje y Agrupación Conceptual
    summaryCardSubCounter: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    lineageOverviewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 16,
        gap: 12,
    },
    lineageOverviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
        paddingBottom: 10,
    },
    lineageOverviewGarmentTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.atelierBlack,
        letterSpacing: 0.8,
    },
    lineageOverviewCreationSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 3,
        fontWeight: '500',
    },
    lineageOverviewVersionsBox: {
        backgroundColor: '#FCFAF7',
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F0ECE4',
    },
    lineageOverviewVersionsTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    lineageOverviewVersionsList: {
        gap: 6,
    },
    lineageVersionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 2,
    },
    lineageVersionBulletCol: {
        alignItems: 'center',
        width: 14,
        marginTop: 2,
    },
    lineageVersionBullet: {
        fontSize: 12,
        color: colors.sand,
        fontWeight: 'bold',
    },
    lineageVersionBulletActive: {
        color: colors.champagneGold,
    },
    lineageVersionConnectLine: {
        width: 1,
        height: 18,
        backgroundColor: '#E8E2D9',
        marginVertical: 1,
    },
    lineageVersionContent: {
        flex: 1,
    },
    lineageVersionLabelText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    lineageVersionLabelTextActive: {
        color: colors.atelierBlack,
    },
    lineageVersionDateText: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    lineageVersionMiniBtn: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: '#FAF7F2',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    lineageVersionMiniBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    lineageMoreVersionsText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.champagneGold,
        marginTop: 4,
    },
    lineageOverviewActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        paddingTop: 6,
    },
    lineageCardBtnSecondary: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 4,
        backgroundColor: '#F5F3EF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    lineageCardBtnSecondaryText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    lineageCardBtnOutline: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    lineageCardBtnOutlineText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    lineageCardBtnPrimary: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    lineageCardBtnPrimaryText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.ivoryWarm,
    },
    statusTagSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
    },
    statusTagSmallText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    currentIndicatorBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#81C784',
    },
    currentIndicatorBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#2E7D32',
        letterSpacing: 0.5,
    },
    historicalIndicatorBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
        backgroundColor: '#F5F3EF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    historicalIndicatorBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    groupMasterCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 16,
        gap: 14,
    },
    groupMasterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
        paddingBottom: 12,
        flexWrap: 'wrap',
        gap: 12,
    },
    groupMasterHeaderLeft: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    patternGarmentPhoto: {
        width: 64,
        height: 64,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    modalGarmentPhoto: {
        width: 48,
        height: 48,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    groupMasterTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    versionCountBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    versionCountBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    groupTreeBox: {
        backgroundColor: '#FCFAF7',
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0ECE4',
    },
    groupTreeBoxTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    versionNodeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 12,
        gap: 8,
    },
    versionNodeCardCurrent: {
        borderColor: colors.champagneGold,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
    },
    versionBadgeCurrent: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    versionBadgeTextCurrent: {
        color: colors.ivoryWarm,
    },
    versionNodeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    versionNodeDate: {
        fontSize: 11,
        color: colors.textMuted,
    },
    versionNodeMetaRow: {
        paddingVertical: 2,
    },
    versionNodeMetaText: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    versionNodeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#F5F3EF',
    },
    // =========================================================================
    // ESTILOS FASE B2 — REDISEÑO DE HISTORIAL Y SESIONES DE MEDIDAS
    // =========================================================================
    subjectFilterCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        gap: 8,
    },
    subjectFilterHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    subjectSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        borderRadius: 4,
        paddingHorizontal: 8,
        height: 28,
    },
    subjectSearchInput: {
        fontSize: 11,
        color: colors.atelierBlack,
        minWidth: 150,
    },
    subjectPillsWrapScroll: {
        maxHeight: 140,
    },
    subjectPillsWrapContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingVertical: 2,
    },
    printA4Btn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    printA4BtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    inspectorModeToggleRow: {
        flexDirection: 'row',
        backgroundColor: '#FAF6F0',
        borderRadius: 6,
        padding: 3,
        marginHorizontal: 14,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#EFE7DC',
    },
    inspectorModeBtn: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    inspectorModeBtnActive: {
        backgroundColor: colors.atelierBlack,
    },
    inspectorModeBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    inspectorModeBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    inspectorMannequinContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#FAF8F5',
        borderRadius: 8,
        marginHorizontal: 14,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    subjectFilterLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    subjectPillsScroll: {
        flexDirection: 'row',
    },
    subjectPill: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        marginRight: 8,
    },
    subjectPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    subjectPillText: {
        fontSize: 11.5,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    subjectPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    kpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    kpiCard: {
        flex: 1,
        minWidth: 130,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    kpiCardSelected: {
        borderColor: colors.champagneGold,
        borderWidth: 1.5,
        backgroundColor: '#FCFAF7',
    },
    kpiLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.textMuted,
        letterSpacing: 0.8,
    },
    kpiValue: {
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionsToolbarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        gap: 10,
    },
    sessionsSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sessionsSearchInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 5,
        paddingHorizontal: 12,
        height: 38,
    },
    sessionsSearchIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    sessionsSearchInput: {
        flex: 1,
        fontFamily: typography.sans,
        fontSize: 13,
        color: colors.atelierBlack,
        paddingVertical: 0,
    },
    sessionsSearchClearBtn: {
        padding: 4,
    },
    sessionsSearchClearBtnText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '600',
    },
    sessionsClearAllFiltersBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: '#F3EFE9',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    sessionsClearAllFiltersText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    sessionsFiltersSubRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5EFE6',
        paddingTop: 8,
    },
    statusPillsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    statusPillsLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    statusPillsScroll: {
        flexDirection: 'row',
    },
    statusFilterPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        marginRight: 6,
    },
    statusFilterPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    statusFilterPillText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    statusFilterPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    sortToggleBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
    },
    sortToggleBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    sessionCardEditorial: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    sessionCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionAvatarWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        backgroundColor: '#FAF6F0',
    },
    sessionAvatarImg: {
        width: '100%',
        height: '100%',
    },
    sessionSubjectTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    sessionSubjectName: {
        fontFamily: typography.serif,
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionCategoryTag: {
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 2,
    },
    sessionCategoryTagText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#8C6826',
        letterSpacing: 0.5,
    },
    sessionTitularTag: {
        backgroundColor: '#EBE6DC',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 2,
    },
    sessionTitularTagText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    rectificationBadge: {
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FFE082',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 3,
    },
    rectificationBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#F57F17',
    },
    versionBadgeClean: {
        backgroundColor: '#F3EFE9',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 3,
    },
    versionBadgeCleanText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    sessionSubMeta: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 3,
    },
    sessionCardNotes: {
        fontSize: 12,
        fontStyle: 'italic',
        color: colors.textSecondary,
        paddingHorizontal: 4,
    },
    cardActionCompare: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: '#FCFAF7',
    },
    cardActionCompareText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    resetFiltersBtn: {
        alignSelf: 'center',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 4,
        backgroundColor: colors.atelierBlack,
    },
    resetFiltersBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    inspectorNotesBox: {
        backgroundColor: '#FAF8F5',
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        padding: 10,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 3,
    },
    inspectorNotesLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.6,
    },
    inspectorNotesText: {
        fontSize: 11.5,
        fontStyle: 'italic',
        color: colors.atelierBlack,
        marginTop: 2,
    },
    inspectorCategoryBar: {
        paddingHorizontal: 14,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
        paddingBottom: 8,
    },
    inspectorPillsScroll: {
        flexDirection: 'row',
    },
    inspectorPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 3,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        marginRight: 6,
    },
    inspectorPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    inspectorPillText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    inspectorPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    measItemMetaRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 3,
    },
    measItemBadge: {
        backgroundColor: '#EFECE6',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
    },
    measItemBadgeText: {
        fontSize: 8.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    modalCompareBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: '#FCFAF7',
    },
    modalCompareBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    compModalNotice: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    compSelectorBar: {
        backgroundColor: '#FAF8F5',
        borderBottomWidth: 1,
        borderBottomColor: '#F0ECE4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 6,
    },
    compSelectorLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    compCandidateScroll: {
        flexDirection: 'row',
    },
    compCandidatePill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 6,
    },
    compCandidatePillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    compCandidateText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    compCandidateTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    compTableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    compColHeader: {
        fontSize: 9.5,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    compTableBody: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginTop: 6,
    },
    compTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    compTableCell: {
        justifyContent: 'center',
    },
    compRowName: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    compRowCode: {
        fontSize: 9.5,
        color: colors.textMuted,
        marginTop: 1,
    },
    compRowBaseVal: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    compRowTargetVal: {
        fontFamily: typography.serif,
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    compDeltaBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    compDeltaBadgePos: {
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    compDeltaBadgeNeg: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    compDeltaBadgeZero: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    compDeltaBadgeMissing: {
        backgroundColor: '#FAFAFA',
    },
    compDeltaText: {
        fontSize: 11,
        fontWeight: '700',
    },
    compDeltaTextPos: {
        color: '#E65100',
    },
    compDeltaTextNeg: {
        color: '#0D47A1',
    },
    compDeltaTextZero: {
        color: colors.textMuted,
    },
    compDeltaTextMissing: {
        fontSize: 10,
        fontStyle: 'italic',
        color: colors.textMuted,
    },
    compFooterSummary: {
        fontSize: 11.5,
        color: colors.textSecondary,
    },
    // ESTILOS FASE C — CAPTURA RÁPIDA Y PUENTE CAD
    newMeasureSessionBtn: {
        backgroundColor: colors.accent,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 6,
        alignItems: 'center',
    },
    newMeasureSessionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalCadBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.atelierBlack,
        backgroundColor: colors.atelierBlack,
    },
    modalCadBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E6D9C8',
    },
    modalDraftResumeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E65100',
        backgroundColor: '#FFF8F2',
    },
    modalDraftResumeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E65100',
    },
});
