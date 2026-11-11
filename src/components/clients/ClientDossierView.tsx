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
import { styles } from './dossier/clientDossierStyles';
import { PatternDetailModal } from './dossier/PatternDetailModal';
import { DossierClientHeader, DossierTab } from './dossier/DossierClientHeader';
import { DossierPatternsTab } from './dossier/DossierPatternsTab';
import { DossierCreationsTab } from './dossier/DossierCreationsTab';
import { DossierSessionsTab } from './dossier/DossierSessionsTab';
import { DossierOverviewTab } from './dossier/DossierOverviewTab';
import { DossierModals } from './dossier/DossierModals';
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
import {
    CREATION_EDITORIAL_IMAGES,
    DEFAULT_CREATION_IMAGE,
    getCreationPhoto,
} from '../creations/CreationsModule';

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
    const [compareBaseSession, setCompareBaseSession] = useState<MeasurementSession | null>(null);
    const [compareTargetSession, setCompareTargetSession] = useState<MeasurementSession | null>(null);
    const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
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
                {/* 1 y 2. Cabecera Editorial y Selector de Pestañas (MODULARIZADO - Paso 2.3) */}
                <DossierClientHeader
                    client={client}
                    isInstitutional={isInstitutional}
                    personsCount={persons.length}
                    campaignsCount={campaigns.length}
                    sessionMetrics={sessionMetrics}
                    creationsCount={creations.length}
                    patternStats={patternStats}
                    patternGroupsCount={patternGroups.length}
                    sessionsCount={sessions.length}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    formatDate={formatDate}
                />

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando trazabilidad técnica de clienta...</Text>
                    </View>
                ) : (
                    <>
                        {/* PESTAÑA 1: RESUMEN GENERAL (MODULARIZADO - Paso 2.7) */}
                        {activeTab === 'overview' && (
                            <DossierOverviewTab
                                client={client}
                                isInstitutional={isInstitutional}
                                persons={persons}
                                campaigns={campaigns}
                                sessionMetrics={sessionMetrics}
                                latestTitularSession={latestTitularSession}
                                creations={creations}
                                patternGroups={patternGroups}
                                patternStats={patternStats}
                                personMap={personMap}
                                getCreationPhoto={getCreationPhoto}
                                getGarmentLabel={getGarmentLabel}
                                getStatusStyle={getStatusStyle}
                                formatDate={formatDate}
                                onSelectTab={setActiveTab}
                                onViewSessionDetails={(s) => setSelectedSessionForView(s)}
                                onInspectPattern={handleInspectPattern}
                                onOpenCreation={onOpenCreation}
                                onOpenCad={onOpenCad}
                            />
                        )}
                        {/* PESTAÑA 2: SESIONES DE MEDIDAS (MODULARIZADO - Paso 2.6) */}
                        {activeTab === 'sessions' && (
                            <DossierSessionsTab
                                client={client}
                                sessions={sessions}
                                persons={persons}
                                patterns={patterns}
                                creationMap={creationMap}
                                personMap={personMap}
                                isInstitutional={isInstitutional}
                                selectedSubjectFilter={selectedSubjectFilter}
                                onSubjectFilterChange={setSelectedSubjectFilter}
                                formatDate={formatDate}
                                onOpenFastCapture={handleOpenFastCapture}
                                onViewSessionDetails={(s) => setSelectedSessionForView(s)}
                                onStartComparison={handleStartComparison}
                                onOpenCadWizard={handleOpenCadWizard}
                                onViewDerivedPatterns={(sessId) => {
                                    setFilterSessionId(sessId);
                                    setActiveTab('patterns');
                                }}
                                onGoToPersonsGroups={() => setActiveTab('persons_groups')}
                                onOpenCad={onOpenCad}
                            />
                        )}
                        {/* PESTAÑA 3: CREACIONES DE ALTA COSTURA (MODULARIZADO - Paso 2.5) */}
                        {activeTab === 'creations' && (
                            <DossierCreationsTab
                                client={client}
                                creations={creations}
                                persons={persons}
                                patterns={patterns}
                                sessionMap={sessionMap}
                                personMap={personMap}
                                getCreationPhoto={getCreationPhoto}
                                getGarmentLabel={getGarmentLabel}
                                formatDate={formatDate}
                                onOpenCreation={onOpenCreation}
                                onOpenCad={onOpenCad}
                            />
                        )}
                        {/* PESTAÑA 4: PATRONES & LINAJE (MODULARIZADO - Paso 2.4) */}
                        {activeTab === 'patterns' && (
                            <DossierPatternsTab
                                client={client}
                                patternGroups={patternGroups}
                                displayedPatterns={displayedPatterns}
                                filterSessionId={filterSessionId}
                                creationMap={creationMap}
                                sessionMap={sessionMap}
                                getStatusStyle={getStatusStyle}
                                getPatternGarmentPhoto={getPatternGarmentPhoto}
                                getGarmentLabel={getGarmentLabel}
                                formatDate={formatDate}
                                onClearFilterSession={() => setFilterSessionId(null)}
                                onInspectPattern={handleInspectPattern}
                                onOpenCad={onOpenCad}
                            />
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

            {/* MODALES DE MEDIDAS, INSPECTOR, COMPARADOR Y WIZARDS (MODULARIZADO - Paso 2.8) */}
            <DossierModals
                client={client}
                sessions={sessions}
                personMap={personMap}
                formatDate={formatDate}
                selectedSessionForView={selectedSessionForView}
                onCloseInspector={() => setSelectedSessionForView(null)}
                showComparisonModal={showComparisonModal}
                compareBaseSession={compareBaseSession}
                compareTargetSession={compareTargetSession}
                availableComparisonCandidates={availableComparisonCandidates}
                onCloseComparison={() => setShowComparisonModal(false)}
                onSelectCompareTarget={setCompareTargetSession}
                onStartComparison={handleStartComparison}
                showFastCaptureModal={showFastCaptureModal}
                captureSubjectPerson={captureSubjectPerson}
                captureDraftSession={captureDraftSession}
                onCloseFastCapture={() => {
                    setShowFastCaptureModal(false);
                    setCaptureDraftSession(null);
                    setCaptureSubjectPerson(null);
                }}
                onSessionSaved={() => loadClientDossierData()}
                onProceedToCadFromCapture={(savedSession) => {
                    setShowFastCaptureModal(false);
                    setCaptureDraftSession(null);
                    setCaptureSubjectPerson(null);
                    loadClientDossierData();
                    handleOpenCadWizard(savedSession);
                }}
                showCadWizardModal={showCadWizardModal}
                cadWizardPerson={cadWizardPerson}
                cadWizardSessionId={cadWizardSessionId}
                onCloseCadWizard={() => {
                    setShowCadWizardModal(false);
                    setCadWizardPerson(null);
                    setCadWizardSessionId(null);
                }}
                onCadExecutionGenerated={() => loadClientDossierData()}
                onOpenCadWizard={handleOpenCadWizard}
                onOpenFastCapture={handleOpenFastCapture}
            />
            {/* MODAL 2: DETALLE DEL PATRÓN, INMUTABILIDAD Y LINAJE (MODULARIZADO - Paso 2.2) */}
            <PatternDetailModal
                visible={Boolean(inspectedPattern)}
                pattern={inspectedPattern}
                client={client}
                patterns={patterns}
                creationMap={creationMap}
                sessionMap={sessionMap}
                personMap={personMap}
                lineageChain={lineageChain}
                patternAdjustments={patternAdjustments}
                loadingAdjustments={loadingAdjustments}
                isInstitutional={isInstitutional}
                latestTitularSession={latestTitularSession}
                getPatternGarmentPhoto={getPatternGarmentPhoto}
                getGarmentLabel={getGarmentLabel}
                getTemplateLabel={getTemplateLabel}
                onInspectPattern={handleInspectPattern}
                onClose={() => setInspectedPattern(null)}
            />

            </View>
    );
}
