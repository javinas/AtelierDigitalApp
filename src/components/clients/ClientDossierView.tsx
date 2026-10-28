// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: EXPEDIENTE INTEGRAL DE CLIENTA (ALTA COSTURA)
// Archivo: src/components/clients/ClientDossierView.tsx
// ==============================================================================
// MÓDULO 02 · MEJORA DE TRAZABILIDAD DE CLIENTA, MEDIDAS Y PATRONES
// Trazabilidad Funcional Visible y Navegable:
// CLIENTA → SESIONES DE MEDIDAS → EJECUCIONES DE PATRÓN → CREACIÓN → LINAJE
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
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

    // Filtro interactivo por sesión para la pestaña de patrones
    const [filterSessionId, setFilterSessionId] = useState<string | null>(null);

    // Modal para inspeccionar medidas detalladas de una sesión
    const [selectedSessionForView, setSelectedSessionForView] = useState<MeasurementSession | null>(null);

    // Modal para inspeccionar detalle técnico completo del patrón + linaje + fitting
    const [inspectedPattern, setInspectedPattern] = useState<PatternExecution | null>(null);
    const [patternAdjustments, setPatternAdjustments] = useState<PatternAdjustment[]>([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState<boolean>(false);
    const [expandedHistoryGroupIds, setExpandedHistoryGroupIds] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadClientDossierData();
    }, [client.id]);

    const loadClientDossierData = async () => {
        setLoading(true);
        try {
            const [sessData, creatRes, pattsData] = await Promise.all([
                fetchClientMeasurementSessions(client.id),
                fetchCreations({ clientId: client.id }),
                fetchClientPatternExecutions(client.id),
            ]);
            setSessions(sessData);
            setCreations(creatRes.data || []);
            setPatterns(pattsData);
        } catch (err) {
            console.warn('[ClientDossierView] Error cargando expediente:', err);
        } finally {
            setLoading(false);
        }
    };

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

    // Agrupación ontológica y estadísticas canónicas de patrones CAD
    const patternStats = useMemo(() => {
        return calculateClientPatternStats(patterns, creations);
    }, [patterns, creations]);

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

                    {/* RESUMEN DE LA CLIENTA (Ontología Canónica) */}
                    <View style={styles.summarySectionBox}>
                        <Text style={styles.summarySectionBoxTitle}>RESUMEN DE LA CLIENTA</Text>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>CLIENTA:</Text>
                                <Text style={styles.summaryGridValBold}>{client.full_name}</Text>
                            </View>
                            <View style={styles.summaryGridItem}>
                                <Text style={styles.summaryGridKey}>Sesiones de medidas:</Text>
                                <Text style={styles.summaryGridVal}>{sessions.length}</Text>
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

                                {/* Última Sesión de Medidas */}
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryCardHeader}>
                                        <Text style={styles.summaryCardSuper}>ANATOMÍA CORPORAL</Text>
                                        <Text style={styles.summaryCardTitle}>Última Sesión de Medidas</Text>
                                    </View>
                                    {sessions.length > 0 ? (
                                        <View>
                                            <View style={styles.summaryDetailRow}>
                                                <Text style={styles.summaryDetailLabel}>Versión Activa:</Text>
                                                <Text style={styles.summaryDetailValue}>
                                                    Sesión v{sessions[0].version_number} ({formatDate(sessions[0].session_date)})
                                                </Text>
                                            </View>
                                            <View style={styles.summaryDetailRow}>
                                                <Text style={styles.summaryDetailLabel}>Estado de Sesión:</Text>
                                                <Text style={styles.summaryDetailValue}>
                                                    {sessions[0].status === 'completed'
                                                        ? '🛡️ Finalizada & Inmutable'
                                                        : sessions[0].status === 'verified'
                                                        ? '✅ Verificada'
                                                        : '📝 Borrador'}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryDetailRow}>
                                                <Text style={styles.summaryDetailLabel}>Medidas Registradas:</Text>
                                                <Text style={styles.summaryDetailValue}>
                                                    {Object.keys(sessions[0].values || {}).length} cotas métricas
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.summaryActionBtn}
                                                onPress={() => setSelectedSessionForView(sessions[0])}
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

                                {/* Creaciones */}
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryCardHeader}>
                                        <Text style={styles.summaryCardSuper}>PROYECTOS & ENCARGOS</Text>
                                        <Text style={styles.summaryCardTitle}>Creaciones de Alta Costura ({creations.length})</Text>
                                    </View>
                                    {creations.length > 0 ? (
                                        <View style={{ gap: 8 }}>
                                            {creations.slice(0, 3).map((c) => (
                                                <View key={c.id} style={styles.miniListItem}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.miniItemTitle}>{c.name}</Text>
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
                                            ))}
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

                        {/* PESTAÑA 2: SESIONES DE MEDIDAS (Section 4 & 10) */}
                        {activeTab === 'sessions' && (
                            <View style={styles.tabContentSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionHeaderTitle}>SESIONES DE MEDIDAS ({sessions.length})</Text>
                                    <Text style={styles.sectionHeaderSubtitle}>
                                        Cada sesión anatómica preserva inmutablemente las medidas corporales en la fecha de toma.
                                    </Text>
                                </View>

                                {sessions.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>Esta clienta no tiene sesiones de medidas registradas.</Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {sessions.map((s) => {
                                            const valuesCount = Object.keys(s.values || {}).length;
                                            const usedByPatterns = patterns.filter((p) => p.session_id === s.id);
                                            const hasPatterns = usedByPatterns.length > 0;
                                            const linkedCreation = s.creation_id ? creationMap.get(s.creation_id) : null;

                                            return (
                                                <View key={s.id} style={styles.cardItem}>
                                                    <View style={styles.cardItemHeader}>
                                                        <View style={styles.versionBadge}>
                                                            <Text style={styles.versionBadgeText}>v{s.version_number}</Text>
                                                        </View>
                                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                                            <Text style={styles.cardItemTitle}>
                                                                Sesión de Medidas · {formatDate(s.session_date)}
                                                            </Text>
                                                            <Text style={styles.cardItemSubtitle}>
                                                                Sistema: {s.unit_system?.toUpperCase() || 'MÉTRICO'} · {valuesCount} medidas registradas
                                                            </Text>
                                                            <Text style={styles.cardItemSubDate}>
                                                                Última actualización: {formatDate(s.updated_at || s.session_date)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.statusTag}>
                                                            <Text style={styles.statusTagText}>
                                                                {s.status === 'completed'
                                                                    ? 'FINALIZADA'
                                                                    : s.status === 'verified'
                                                                    ? 'VERIFICADA'
                                                                    : s.status.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {s.notes ? (
                                                        <Text style={styles.cardItemNotes}>“{s.notes}”</Text>
                                                    ) : null}

                                                    {/* Vínculos de Trazabilidad */}
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

                                                        {/* Caso Crítico 10: Medidas sin patrón */}
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

                                                    {/* Acciones de Sesión (Section 4) */}
                                                    <View style={styles.cardItemFooter}>
                                                        <TouchableOpacity
                                                            onPress={() => setSelectedSessionForView(s)}
                                                            style={styles.cardActionSecondary}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.cardActionSecondaryText}>👁️ [Ver medidas]</Text>
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
                                    <Text style={styles.sectionHeaderTitle}>CREACIONES & ENCARGOS ({creations.length})</Text>
                                    <Text style={styles.sectionHeaderSubtitle}>
                                        Proyectos a medida desacoplados de patronaje con trazabilidad hacia patrones activos.
                                    </Text>
                                </View>

                                {creations.length === 0 ? (
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyBoxText}>Esta clienta no tiene creaciones asignadas.</Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 12 }}>
                                        {creations.map((c) => {
                                            const linkedSession = c.session_id ? sessionMap.get(c.session_id) : null;
                                            const activePattern = patterns.find((p) => p.id === c.active_pattern_execution_id);

                                            return (
                                                <View key={c.id} style={styles.cardItem}>
                                                    <View style={styles.cardItemHeader}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.cardItemTitle}>{c.name}</Text>
                                                            <Text style={styles.cardItemSubtitle}>
                                                                {c.creation_type?.toUpperCase()} · Prenda: {c.garment_type ? getGarmentLabel(c.garment_type) : 'Por definir'}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.statusTag}>
                                                            <Text style={styles.statusTagText}>{c.status?.toUpperCase()}</Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.metaGrid}>
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

                                            return (
                                                <View
                                                    key={grp.id}
                                                    style={[
                                                        styles.groupMasterCard,
                                                        grp.isApproved && styles.cardItemApproved,
                                                    ]}
                                                >
                                                    {/* Encabezado del Grupo de Patrón */}
                                                    <View style={styles.groupMasterHeader}>
                                                        <View style={{ flex: 1, marginRight: 12 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                                />
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* MODAL 1: VISOR DETALLADO DE MEDIDAS DE UNA SESIÓN (Section 4 & 9) */}
            <Modal visible={Boolean(selectedSessionForView)} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalSuper}>TOMA DE MEDIDAS · ALTA COSTURA</Text>
                                <Text style={styles.modalTitle}>
                                    Sesión v{selectedSessionForView?.version_number} ({formatDate(selectedSessionForView?.session_date)})
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setSelectedSessionForView(null)}
                                style={styles.modalCloseBtn}
                            >
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 450, padding: 16 }}>
                            <Text style={styles.measSectionTitle}>Valores Anatómicos Corporales en Centímetros (cm):</Text>
                            <View style={styles.measGrid}>
                                {MASTER_MEASUREMENT_CATALOG.map((item) => {
                                    const valItem = selectedSessionForView?.values?.[item.code];
                                    const valMm = valItem?.value_mm;
                                    const valCm = typeof valMm === 'number' && valMm > 0 ? (valMm / 10).toFixed(1) : '—';
                                    const isFilled = typeof valMm === 'number' && valMm > 0;

                                    return (
                                        <View key={item.code} style={[styles.measItem, isFilled && styles.measItemFilled]}>
                                            <Text style={styles.measItemName}>{item.name}</Text>
                                            <Text style={[styles.measItemValue, isFilled && styles.measItemValueFilled]}>
                                                {valCm} {isFilled ? 'cm' : ''}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                onPress={() => setSelectedSessionForView(null)}
                                style={styles.modalDoneBtn}
                            >
                                <Text style={styles.modalDoneBtnText}>Cerrar Visor</Text>
                            </TouchableOpacity>
                        </View>
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
                                    <View style={{ flex: 1 }}>
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
                                                <Text style={styles.measColHeader}>
                                                    MEDIDAS ACTUALES DE LA CLIENTA (Última Sesión)
                                                </Text>
                                                {sessions[0]?.values ? (
                                                    Object.entries(sessions[0].values).slice(0, 8).map(([code, item]) => {
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
                                                    <Text style={styles.emptyStateNotice}>Sin medidas actuales</Text>
                                                )}
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
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        backgroundColor: '#FCFAF7',
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#F0ECE1',
    },
    summarySectionBoxTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    summaryGridItem: {
        minWidth: 120,
    },
    summaryGridKey: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    summaryGridVal: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.atelierBlack,
        marginTop: 1,
    },
    summaryGridValBold: {
        fontSize: 14,
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
    miniItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
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
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
        paddingBottom: 12,
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
});
