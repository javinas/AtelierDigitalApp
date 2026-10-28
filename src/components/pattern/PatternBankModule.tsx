// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: BANCO GLOBAL DE PATRONES (ALTA COSTURA)
// Archivo: src/components/pattern/PatternBankModule.tsx
// ==============================================================================
// MÓDULO 02 · REDISEÑO INTEGRAL DEL BANCO GLOBAL DE PATRONES CAD
// Catálogo centralizado y biblioteca visual / editorial de alta costura.
// Jerarquía canónica obligatoria:
// CREACIÓN → PATRÓN CAD LÓGICO → VERSIÓN / REVISIÓN → EJECUCIÓN TÉCNICA
// Diferenciación rigurosa: Patrones CAD Lógicos vs Ejecuciones Técnicas Históricas
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ImageBackground,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { GarmentType, PatternAdjustment, PatternExecution, PatternStatus } from '../../types/pattern/pattern';
import { fetchAllPatternExecutions, fetchPatternAdjustments } from '../../services/patternService';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { MASTER_MEASUREMENT_CATALOG } from '../../engine/pattern/catalog/masterCatalog';
import { CREATION_EDITORIAL_IMAGES, DEFAULT_CREATION_IMAGE } from '../creations/CreationsModule';
import {
    GlobalPatternCadGroup,
    groupGlobalPatternsByLineage,
    calculateGlobalPatternStats,
} from '../../utils/clientPatternLineageHelper';

interface PatternBankModuleProps {
    onBack: () => void;
    titleBack?: string;
    onOpenCad?: (params: {
        clientId?: string | null;
        sessionId?: string | null;
        creationId?: string | null;
        garmentType?: GarmentType | null;
        executionId?: string | null;
    }) => void;
    onOpenClientDossier?: (clientId: string) => void;
    onOpenCreation?: (creationId: string) => void;
}

type OriginFilter = 'all' | 'creation' | 'direct' | 'derived' | 'free';
type StatusFilter = 'all' | 'approved' | 'fitting' | 'draft';
type DateOrder = 'desc' | 'asc';

export function getPatternPhoto(garmentType: GarmentType, creationPhotoUrl?: string | null): any {
    if (creationPhotoUrl && typeof creationPhotoUrl === 'string') {
        return { uri: creationPhotoUrl };
    }
    const key = (garmentType || 'jacket').toLowerCase();
    return CREATION_EDITORIAL_IMAGES[key] || CREATION_EDITORIAL_IMAGES.jacket || DEFAULT_CREATION_IMAGE;
}

export function PatternBankModule({
    onBack,
    titleBack = '← Volver al Atelier Diseñadora',
    onOpenCad,
    onOpenClientDossier,
    onOpenCreation,
}: PatternBankModuleProps) {
    const [executions, setExecutions] = useState<PatternExecution[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Expansión interactiva del linaje en cada tarjeta
    const [expandedPatternIds, setExpandedPatternIds] = useState<Set<string>>(new Set());

    // Filtros & Orden
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedGarment, setSelectedGarment] = useState<GarmentType | 'all'>('all');
    const [selectedClientId, setSelectedClientId] = useState<string | 'all'>('all');
    const [dateOrder, setDateOrder] = useState<DateOrder>('desc');

    // Modal de Ficha Técnica / Linaje Detallado
    const [inspectExecution, setInspectExecution] = useState<PatternExecution | null>(null);
    const [inspectAdjustments, setInspectAdjustments] = useState<PatternAdjustment[]>([]);
    const [loadingAdjustments, setLoadingAdjustments] = useState<boolean>(false);

    useEffect(() => {
        loadPatternBank();
    }, []);

    const loadPatternBank = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetchAllPatternExecutions();
            if (res.error) {
                setErrorMessage(res.error);
            } else {
                setExecutions(res.data);
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Error inesperado al cargar banco de patrones.');
        } finally {
            setLoading(false);
        }
    };

    const toggleLineageExpand = (patternId: string) => {
        setExpandedPatternIds((prev) => {
            const next = new Set(prev);
            if (next.has(patternId)) {
                next.delete(patternId);
            } else {
                next.add(patternId);
            }
            return next;
        });
    };

    const handleInspect = async (exec: PatternExecution) => {
        setInspectExecution(exec);
        setLoadingAdjustments(true);
        try {
            const adj = await fetchPatternAdjustments(exec.id);
            setInspectAdjustments(adj);
        } catch {
            setInspectAdjustments([]);
        } finally {
            setLoadingAdjustments(false);
        }
    };

    // =========================================================================
    // AGRUPACIÓN CANÓNICA: PATRONES CAD LÓGICOS (JERARQUÍA MÓDULO 02)
    // =========================================================================
    const logicalPatterns = useMemo(() => {
        return groupGlobalPatternsByLineage(executions);
    }, [executions]);

    // Métricas Semánticamente Rigurosas (Secciones 1, 11, 21, 22)
    const stats = useMemo(() => {
        return calculateGlobalPatternStats(logicalPatterns, executions.length);
    }, [logicalPatterns, executions.length]);

    // Patrones Destacados para la sección Hero Editorial (Sección 10)
    const featuredPatterns = useMemo(() => {
        return logicalPatterns.slice(0, 4);
    }, [logicalPatterns]);

    // Clientas disponibles para filtro
    const availableClients = useMemo(() => {
        const map = new Map<string, string>();
        logicalPatterns.forEach((p) => {
            if (p.clientId && p.clientName) {
                map.set(p.clientId, p.clientName);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [logicalPatterns]);

    // Filtrado y ordenamiento reactivo (Sección 7 y 8)
    const filteredPatterns = useMemo(() => {
        const list = logicalPatterns.filter((p) => {
            // Filtro origen
            if (originFilter === 'creation' && !p.isCreation) return false;
            if (originFilter === 'direct' && !p.isDirect) return false;
            if (originFilter === 'free' && !p.isFree) return false;
            if (originFilter === 'derived' && !p.isDerived) return false;

            // Filtro estado
            if (statusFilter === 'approved' && !p.isApproved) return false;
            if (statusFilter === 'fitting' && p.status !== 'pending_fitting') return false;
            if (statusFilter === 'draft' && p.status !== 'draft' && p.status !== 'generated') return false;

            // Filtro prenda
            if (selectedGarment !== 'all' && p.garmentType !== selectedGarment) return false;

            // Filtro clienta
            if (selectedClientId !== 'all' && p.clientId !== selectedClientId) return false;

            // Búsqueda textual reactiva (Sección 9)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const title = p.patternTitle.toLowerCase();
                const garment = (GARMENT_PACKAGES[p.garmentType]?.name || p.garmentType).toLowerCase();
                const client = (p.clientName || '').toLowerCase();
                const creation = (p.creationName || '').toLowerCase();
                const version = (p.activeExecution.version_label || '').toLowerCase();
                const ref = (p.activeExecution.id || '').toLowerCase();
                const matches =
                    title.includes(q) ||
                    garment.includes(q) ||
                    client.includes(q) ||
                    creation.includes(q) ||
                    version.includes(q) ||
                    ref.includes(q);
                if (!matches) return false;
            }

            return true;
        });

        // Ordenamiento por fecha de actualización
        return list.sort((a, b) => {
            const timeA = new Date(a.updatedAt).getTime();
            const timeB = new Date(b.updatedAt).getTime();
            return dateOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
    }, [logicalPatterns, originFilter, statusFilter, selectedGarment, selectedClientId, searchQuery, dateOrder]);

    const formatDate = (dateStr?: string | null): string => {
        if (!dateStr) return '—';
        try {
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

    const getStatusBadge = (status: PatternStatus) => {
        switch (status) {
            case 'approved_by_designer':
                return { label: 'APROBADO · VIGENTE', bg: '#EDF5EE', color: '#2B5E35', border: '#C2DFCA' };
            case 'pending_fitting':
                return { label: 'EN FITTING', bg: '#FFF8E7', color: '#996B1F', border: '#FCE7B2' };
            case 'generated':
                return { label: 'GENERADO', bg: '#EFF4F9', color: '#2F5270', border: '#C8D9E8' };
            case 'needs_revision':
                return { label: 'EN REVISIÓN', bg: '#FFF1F0', color: '#CF1322', border: '#FFA39E' };
            case 'draft':
            default:
                return { label: 'BORRADOR', bg: '#F2EBE0', color: colors.textSecondary, border: colors.sand };
        }
    };

    // Cadena de linaje para la ejecución en inspección
    const inspectedLineageChain = useMemo(() => {
        if (!inspectExecution) return [];
        let root = inspectExecution;
        const visited = new Set<string>([root.id]);
        while (root.parent_execution_id) {
            const parent = executions.find((e) => e.id === root.parent_execution_id);
            if (parent && !visited.has(parent.id)) {
                visited.add(parent.id);
                root = parent;
            } else {
                break;
            }
        }
        const chain: PatternExecution[] = [root];
        const queue = [root.id];
        while (queue.length > 0) {
            const currId = queue.shift()!;
            const children = executions.filter((e) => e.parent_execution_id === currId);
            for (const child of children) {
                if (!chain.some((x) => x.id === child.id)) {
                    chain.push(child);
                    queue.push(child.id);
                }
            }
        }
        return chain;
    }, [inspectExecution, executions]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="dark" />

            {/* Fila superior de navegación */}
            <View style={styles.topNavRow}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
                    <Text style={styles.backButtonText}>{titleBack}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        if (onOpenCad) {
                            onOpenCad({ clientId: '' });
                        } else {
                            router.push('/(designer)/patterns');
                        }
                    }}
                    style={styles.newPatternButton}
                    activeOpacity={0.85}
                >
                    <Text style={styles.newPatternButtonText}>+ Nuevo Patronaje en Mesa CAD</Text>
                </TouchableOpacity>
            </View>

            {/* Encabezado Editorial de Alta Costura (Sección 10) */}
            <View style={styles.header}>
                <Text style={styles.brand}>ATELIER DIGITAL</Text>
                <View style={styles.divider} />
                <Text style={styles.eyebrow}>BY KATHERINE CARROLL · MÓDULO 02</Text>
                <Text style={styles.title}>Banco Global de Patrones CAD</Text>
                <Text style={styles.editorialQuote}>
                    "El archivo técnico y creativo del Atelier."
                </Text>
                <Text style={styles.subtitle}>
                    Explora patrones, versiones y linajes de patronaje en un solo lugar.
                    Biblioteca centralizada de piezas de alta costura, encargos vinculados a Creaciones y exploración libre de taller.
                </Text>
            </View>

            {/* SECCIÓN HERO: PATRONES DESTACADOS DEL ARCHIVO (Sección 10) */}
            {featuredPatterns.length > 0 && (
                <View style={styles.featuredSection}>
                    <View style={styles.featuredSectionHeader}>
                        <Text style={styles.featuredSectionTitle}>✦ PATRONES DESTACADOS DEL ARCHIVO</Text>
                        <Text style={styles.featuredSectionCount}>
                            {stats.logicalPatternsCount} {stats.logicalPatternsCount === 1 ? 'diseño de alta costura' : 'diseños de alta costura'}
                        </Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredCardsRow}
                    >
                        {featuredPatterns.map((feat) => {
                            const featPhoto = getPatternPhoto(feat.garmentType, feat.creationPhotoUrl);
                            const featBadge = getStatusBadge(feat.status);
                            return (
                                <TouchableOpacity
                                    key={feat.id}
                                    style={styles.featuredCard}
                                    activeOpacity={0.88}
                                    onPress={() => handleInspect(feat.activeExecution)}
                                >
                                    <ImageBackground
                                        source={featPhoto}
                                        style={styles.featuredCardBg}
                                        imageStyle={styles.featuredCardImg}
                                        resizeMode="cover"
                                    >
                                        <View style={styles.featuredCardOverlay}>
                                            <View style={styles.featuredCardTopPill}>
                                                <Text style={styles.featuredCardTopPillText}>
                                                    {feat.activeExecution.version_label || 'v1.0'} · {featBadge.label}
                                                </Text>
                                            </View>
                                            <View style={styles.featuredCardBottomContent}>
                                                <Text style={styles.featuredCardPrenda} numberOfLines={1}>
                                                    {feat.patternTitle}
                                                </Text>
                                                <Text style={styles.featuredCardClient} numberOfLines={1}>
                                                    {feat.clientName || 'Banco Experimental'}
                                                </Text>
                                                <Text style={styles.featuredCardPieces}>
                                                    📐 {feat.piecesCount} piezas CAD · {feat.totalExecutions} ejecuciones
                                                </Text>
                                            </View>
                                        </View>
                                    </ImageBackground>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* DISTINCIÓN CONCEPTUAL: PLANTILLAS VS PATRÓN LÓGICO VS EJECUCIONES */}
            <View style={styles.conceptCard}>
                <View style={styles.conceptHeaderRow}>
                    <View style={styles.conceptBadge}>
                        <Text style={styles.conceptBadgeText}>JERARQUÍA CANÓNICA CERTIFICADA</Text>
                    </View>
                    <Text style={styles.conceptHeaderTitle}>Arquitectura Ontológica de Patronaje CAD</Text>
                </View>
                <View style={styles.conceptCols}>
                    <View style={styles.conceptCol}>
                        <Text style={styles.conceptColTag}>1. CREACIÓN & PATRÓN LÓGICO</Text>
                        <Text style={styles.conceptColTitle}>Unidad Conceptual de Diseño</Text>
                        <Text style={styles.conceptColDesc}>
                            La prenda formal de alta costura encomendada para la clienta. Cada diseño posee exactamente una versión vigente activa para producción.
                        </Text>
                    </View>

                    <View style={styles.conceptDivider} />

                    <View style={styles.conceptCol}>
                        <Text style={[styles.conceptColTag, { color: colors.champagneGold }]}>
                            2. VERSIÓN / REVISIÓN
                        </Text>
                        <Text style={styles.conceptColTitle}>Evolución del Fitting</Text>
                        <Text style={styles.conceptColDesc}>
                            v1.0 (trazado base), v1.1 (revisión derivada del fitting). Cada ajuste engendra una nueva revisión sin mutar snapshots históricos.
                        </Text>
                    </View>

                    <View style={styles.conceptDivider} />

                    <View style={styles.conceptCol}>
                        <Text style={[styles.conceptColTag, { color: '#5A6B5C' }]}>
                            3. EJECUCIONES TÉCNICAS
                        </Text>
                        <Text style={styles.conceptColTitle}>Corridas Inmutables CAD</Text>
                        <Text style={styles.conceptColDesc}>
                            Historial completo de trazados matemáticos en BD (e.g. 16 corridas históricas). Garantizan trazabilidad absoluta sin ser patrones independientes.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Error banner */}
            {errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)}>
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Tarjetas de Métricas Globales Rediseñadas (Secciones 1, 11, 21, 22) */}
            <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                    <Text style={styles.metricNumber}>{stats.logicalPatternsCount}</Text>
                    <Text style={styles.metricLabel}>PATRONES CAD</Text>
                    <Text style={styles.metricSub}>{stats.logicalPatternsCount} Patrones CAD · Diseños lógicos únicos</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: colors.textSecondary }]}>
                        {stats.totalExecutionsCount}
                    </Text>
                    <Text style={styles.metricLabel}>EJECUCIONES TÉCNICAS</Text>
                    <Text style={styles.metricSub}>{stats.totalExecutionsCount} Ejecuciones técnicas · Corridas históricas motor CAD</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: '#2B5E35' }]}>{stats.approvedCount}</Text>
                    <Text style={styles.metricLabel}>APROBADO / VIGENTE</Text>
                    <Text style={styles.metricSub}>{stats.approvedCount} Aprobado / Vigente</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: '#996B1F' }]}>{stats.fittingCount}</Text>
                    <Text style={styles.metricLabel}>EN FITTING</Text>
                    <Text style={styles.metricSub}>{stats.fittingCount} En Fitting</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: colors.champagneGold }]}>
                        {stats.withCreationCount}
                    </Text>
                    <Text style={styles.metricLabel}>CON CREACIÓN</Text>
                    <Text style={styles.metricSub}>{stats.withCreationCount} Con Creación</Text>
                </View>
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: '#6A1B9A' }]}>{stats.freeCount}</Text>
                    <Text style={styles.metricLabel}>PATRÓN LIBRE</Text>
                    <Text style={styles.metricSub}>{stats.freeCount} Patrón Libre</Text>
                </View>
            </View>

            {/* Barra de Filtros, Orden & Búsqueda (Secciones 8 y 9) */}
            <View style={styles.controlsCard}>
                {/* Fila Superior: Búsqueda y Ordenamiento */}
                <View style={styles.controlsTopBar}>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar patrón, prenda, clienta o creación..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={styles.clearSearchText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Ordenamiento por Fecha */}
                    <View style={styles.orderInlineGroup}>
                        <Text style={styles.filterSectionTitle}>ORDENAR POR ÚLTIMA REVISIÓN:</Text>
                        <View style={styles.orderPillsRow}>
                            <TouchableOpacity
                                onPress={() => setDateOrder('desc')}
                                style={[styles.orderPill, dateOrder === 'desc' && styles.orderPillActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.orderPillText, dateOrder === 'desc' && styles.orderPillTextActive]}>
                                    ⬇ Más recientes primero
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setDateOrder('asc')}
                                style={[styles.orderPill, dateOrder === 'asc' && styles.orderPillActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.orderPillText, dateOrder === 'asc' && styles.orderPillTextActive]}>
                                    ⬆ Más antiguos primero
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {(searchQuery || originFilter !== 'all' || statusFilter !== 'all' || selectedGarment !== 'all' || selectedClientId !== 'all') && (
                        <TouchableOpacity
                            onPress={() => {
                                setSearchQuery('');
                                setOriginFilter('all');
                                setStatusFilter('all');
                                setSelectedGarment('all');
                                setSelectedClientId('all');
                                setDateOrder('desc');
                            }}
                            style={styles.resetFiltersButton}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.resetFiltersButtonText}>↺ Restablecer</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filtros por Origen */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>ORIGEN DEL PATRÓN:</Text>
                    <View style={styles.filterPillsRow}>
                        {(
                            [
                                { id: 'all', label: 'Todos los Patrones', count: stats.logicalPatternsCount },
                                { id: 'creation', label: '💎 Con Creación', count: stats.withCreationCount },
                                { id: 'direct', label: '✂️ Patronaje Directo', count: stats.directCount },
                                { id: 'free', label: '🧪 Patrón Libre', count: stats.freeCount },
                                { id: 'derived', label: '🧬 Derivado de Fitting', count: stats.derivedCount },
                            ] as const
                        ).map((f) => {
                            const isSelected = originFilter === f.id;
                            return (
                                <TouchableOpacity
                                    key={f.id}
                                    onPress={() => setOriginFilter(f.id)}
                                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            isSelected && styles.filterPillTextActive,
                                        ]}
                                    >
                                        {f.label} ({f.count})
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Filtro por Estado */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>ESTADO VIGENTE:</Text>
                    <View style={styles.filterPillsRow}>
                        {(
                            [
                                { id: 'all', label: 'Todos los Estados' },
                                { id: 'approved', label: '✓ Aprobados / Vigentes' },
                                { id: 'fitting', label: '⏳ En Fitting' },
                                { id: 'draft', label: '✎ Borrador / Preparación' },
                            ] as const
                        ).map((s) => {
                            const isSelected = statusFilter === s.id;
                            return (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setStatusFilter(s.id)}
                                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            isSelected && styles.filterPillTextActive,
                                        ]}
                                    >
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Segmentación Secundaria: Clienta y Prenda en Shelf Compacto */}
                <View style={styles.compactAttributesShelf}>
                    {/* Filtro por Clienta */}
                    {availableClients.length > 0 && (
                        <View style={styles.filterSectionFlex}>
                            <Text style={styles.filterSectionTitle}>CLIENTA:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.garmentScrollRow}>
                                <TouchableOpacity
                                    onPress={() => setSelectedClientId('all')}
                                    style={[styles.garmentPill, selectedClientId === 'all' && styles.garmentPillActive]}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.garmentPillText, selectedClientId === 'all' && styles.garmentPillTextActive]}>
                                        Todas las Clientas
                                    </Text>
                                </TouchableOpacity>
                                {availableClients.map((cl) => {
                                    const isSelected = selectedClientId === cl.id;
                                    return (
                                        <TouchableOpacity
                                            key={cl.id}
                                            onPress={() => setSelectedClientId(cl.id)}
                                            style={[styles.garmentPill, isSelected && styles.garmentPillActive]}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.garmentPillText, isSelected && styles.garmentPillTextActive]}>
                                                👤 {cl.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Filtro por Prenda */}
                    <View style={styles.filterSectionFlex}>
                        <Text style={styles.filterSectionTitle}>TIPO DE PRENDA:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.garmentScrollRow}>
                            <TouchableOpacity
                                onPress={() => setSelectedGarment('all')}
                                style={[styles.garmentPill, selectedGarment === 'all' && styles.garmentPillActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.garmentPillText, selectedGarment === 'all' && styles.garmentPillTextActive]}>
                                    Todas las Prendas
                                </Text>
                            </TouchableOpacity>
                            {Object.entries(GARMENT_PACKAGES).map(([key, pkg]) => {
                                const isSelected = selectedGarment === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => setSelectedGarment(key as GarmentType)}
                                        style={[styles.garmentPill, isSelected && styles.garmentPillActive]}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.garmentPillText, isSelected && styles.garmentPillTextActive]}>
                                            {pkg.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </View>

            {/* Listado de Patrones CAD Lógicos (Secciones 4, 5, 6, 7, 20, 27) */}
            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={styles.loadingText}>Consultando banco global de patrones...</Text>
                </View>
            ) : filteredPatterns.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>✦</Text>
                    <Text style={styles.emptyTitle}>
                        {searchQuery || originFilter !== 'all' || statusFilter !== 'all' || selectedGarment !== 'all'
                            ? 'No se encontraron patrones con los filtros seleccionados'
                            : 'Aún no hay patrones registrados en el archivo'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {searchQuery || originFilter !== 'all' || statusFilter !== 'all' || selectedGarment !== 'all'
                            ? 'Intenta restablecer los filtros para visualizar todo el banco de patrones.'
                            : 'Genera tu primer patrón en la Mesa CAD paramétrica para registrar su linaje y medidas.'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setSearchQuery('');
                            setOriginFilter('all');
                            setStatusFilter('all');
                            setSelectedGarment('all');
                            setSelectedClientId('all');
                            setDateOrder('desc');
                        }}
                        style={styles.emptyActionButton}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.emptyActionButtonText}>Restablecer Filtros</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.patternsGrid}>
                    {filteredPatterns.map((pattern) => {
                        const statusBadge = getStatusBadge(pattern.status);
                        const photoSource = getPatternPhoto(pattern.garmentType, pattern.creationPhotoUrl);
                        const isExpanded = expandedPatternIds.has(pattern.id);
                        const activeExec = pattern.activeExecution;

                        return (
                            <View key={pattern.id} style={styles.patternCard}>
                                {/* Cabecera Visual: Fotografía Editorial Real de Alta Costura */}
                                <View style={styles.cardVisualHeader}>
                                    <ImageBackground
                                        source={photoSource}
                                        style={styles.cardImageBackground}
                                        imageStyle={styles.cardImage}
                                        resizeMode="cover"
                                    >
                                        <View style={styles.cardImageOverlay}>
                                            {/* Badges superiores sobre la fotografía */}
                                            <View style={styles.cardImageTopRow}>
                                                <View
                                                    style={[
                                                        styles.originCombinedBadge,
                                                        {
                                                            backgroundColor: pattern.badgeBg,
                                                            borderColor: pattern.badgeColor,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.originCombinedText,
                                                            { color: pattern.badgeColor },
                                                        ]}
                                                    >
                                                        {pattern.badgeText}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={[
                                                        styles.statusPillOnImage,
                                                        {
                                                            backgroundColor: statusBadge.bg,
                                                            borderColor: statusBadge.border,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.statusPillOnImageText,
                                                            { color: statusBadge.color },
                                                        ]}
                                                    >
                                                        {statusBadge.label}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Badge inferior con conteo de piezas CAD sobre la imagen */}
                                            <View style={styles.cardImageBottomRow}>
                                                <View style={styles.piecesBadgeOnImage}>
                                                    <Text style={styles.piecesBadgeOnImageText}>
                                                        📐 {pattern.piecesCount} {pattern.piecesCount === 1 ? 'PIEZA CAD' : 'PIEZAS CAD'}
                                                    </Text>
                                                </View>
                                                <View style={styles.cadScaleBadge}>
                                                    <Text style={styles.cadScaleBadgeText}>ESCALA 1:1 · ALTA COSTURA</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </ImageBackground>
                                </View>

                                {/* Cuerpo de la Tarjeta Editorial (Sección 5 & 20) */}
                                <View style={styles.cardBody}>
                                    {/* Título de la prenda en tipografía serif editorial */}
                                    <Text style={styles.cardPatternTitle}>{pattern.patternTitle}</Text>

                                    {/* Contexto: Clienta y Creación */}
                                    <View style={styles.contextMetaBox}>
                                        {/* Clienta */}
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaLabel}>CLIENTA:</Text>
                                            {pattern.clientId ? (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (pattern.clientId) {
                                                            if (onOpenClientDossier) {
                                                                onOpenClientDossier(pattern.clientId);
                                                            } else {
                                                                router.push({
                                                                    pathname: '/(designer)/clients',
                                                                    params: { client_id: pattern.clientId },
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    style={styles.clientLinkRow}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.clientAvatarMini}>
                                                        <Text style={styles.clientAvatarMiniText}>
                                                            {pattern.clientName?.charAt(0) || 'C'}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.clientNameLink}>
                                                        {pattern.clientName} →
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <Text style={styles.metaValueMuted}>
                                                    Sin clienta (Banco Experimental del Atelier)
                                                </Text>
                                            )}
                                        </View>

                                        {/* Creación */}
                                        <View style={styles.metaRow}>
                                            <Text style={styles.metaLabel}>CREACIÓN:</Text>
                                            {pattern.creationId ? (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (pattern.creationId) {
                                                            if (onOpenCreation) {
                                                                onOpenCreation(pattern.creationId);
                                                            } else {
                                                                router.push('/(designer)/creations');
                                                            }
                                                        }
                                                    }}
                                                    style={styles.creationLinkRow}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.creationNameLink} numberOfLines={1}>
                                                        💎 {pattern.creationName} →
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <Text style={styles.metaValueMuted}>
                                                    {pattern.isFree ? 'Sin creación (Patrón Libre Flujo D)' : 'Patronaje Directo (Sin Creación)'}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Versión Vigente Destacada */}
                                    <View style={styles.versionHighlightBox}>
                                        <View style={styles.versionHighlightLeft}>
                                            <Text style={styles.versionHighlightTag}>VERSIÓN VIGENTE</Text>
                                            <Text style={styles.versionHighlightLabel}>
                                                {activeExec.version_label || 'v1.0'} · {statusBadge.label}
                                            </Text>
                                        </View>
                                        <View style={styles.versionHighlightRight}>
                                            <Text style={styles.versionDateLabel}>Última revisión</Text>
                                            <Text style={styles.versionDateValue}>{formatDate(pattern.updatedAt)}</Text>
                                        </View>
                                    </View>

                                    {/* Trazabilidad Técnica: Segunda Capa (Sección 6 & 21) */}
                                    <View style={styles.technicalTraceabilityBox}>
                                        <View style={styles.traceItem}>
                                            <Text style={styles.traceNumber}>{pattern.totalExecutions}</Text>
                                            <Text style={styles.traceLabel}>ejecuciones técnicas</Text>
                                            <Text style={styles.traceHint}>historial completo</Text>
                                        </View>
                                        <View style={styles.traceDivider} />
                                        <View style={styles.traceItem}>
                                            <Text style={styles.traceNumber}>{pattern.totalVersions}</Text>
                                            <Text style={styles.traceLabel}>
                                                {pattern.totalVersions === 1 ? 'versión' : 'versiones'}
                                            </Text>
                                            <Text style={styles.traceHint}>revisiones registradas</Text>
                                        </View>
                                        <View style={styles.traceDivider} />
                                        <View style={styles.traceItem}>
                                            <Text style={styles.traceNumber}>{pattern.piecesCount}</Text>
                                            <Text style={styles.traceLabel}>piezas CAD</Text>
                                            <Text style={styles.traceHint}>geometría 1:1</Text>
                                        </View>
                                    </View>

                                    {/* Acordeón de Historial de Versiones (Sección 7) */}
                                    <View style={styles.historySection}>
                                        <TouchableOpacity
                                            onPress={() => toggleLineageExpand(pattern.id)}
                                            style={styles.historyToggleHeader}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.historyToggleText}>
                                                {isExpanded
                                                    ? '▼ Ocultar Historial del Patrón'
                                                    : `▶ Ver Linaje e Historial (${pattern.totalVersions} versiones · ${pattern.totalExecutions} ejecuciones)`}
                                            </Text>
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View style={styles.historyTimelineBody}>
                                                <Text style={styles.historyTimelineTitle}>HISTORIAL DEL PATRÓN</Text>
                                                
                                                {/* Flujo visual del linaje: v1.0 → v1.1 */}
                                                <View style={styles.lineageFlowHeader}>
                                                    <Text style={styles.lineageFlowLabel}>CADENA DE LINAJE TÉCNICO:</Text>
                                                    <View style={styles.lineageFlowRow}>
                                                        {pattern.versionNodes.slice().reverse().map((vNode, vIdx, arr) => (
                                                            <React.Fragment key={vIdx}>
                                                                <View style={[styles.lineageFlowPill, vNode.isCurrent && styles.lineageFlowPillCurrent]}>
                                                                    <Text style={[styles.lineageFlowPillText, vNode.isCurrent && styles.lineageFlowPillTextCurrent]}>
                                                                        {vNode.versionLabel} {vNode.isCurrent ? '● Vigente' : ''}
                                                                    </Text>
                                                                </View>
                                                                {vIdx < arr.length - 1 && (
                                                                    <Text style={styles.lineageFlowArrow}>→</Text>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </View>
                                                </View>

                                                {pattern.versionNodes.map((node, nIdx) => (
                                                    <View key={nIdx} style={styles.timelineNodeRow}>
                                                        <View style={styles.timelineIconCol}>
                                                            <Text style={[styles.timelineDot, node.isCurrent && styles.timelineDotCurrent]}>
                                                                {node.isCurrent ? '●' : '○'}
                                                            </Text>
                                                            {nIdx < pattern.versionNodes.length - 1 && (
                                                                <View style={styles.timelineLine} />
                                                            )}
                                                        </View>
                                                        <View style={styles.timelineContentCol}>
                                                            <View style={styles.timelineNodeHeader}>
                                                                <Text style={styles.timelineNodeVersion}>{node.versionLabel}</Text>
                                                                <View
                                                                    style={[
                                                                        styles.timelineNodeBadge,
                                                                        { backgroundColor: node.isApproved ? '#EDF5EE' : '#FFF8E7' },
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.timelineNodeBadgeText,
                                                                            { color: node.isApproved ? '#2B5E35' : '#996B1F' },
                                                                        ]}
                                                                    >
                                                                        {node.isApproved ? 'APROBADA · VIGENTE' : node.status.toUpperCase()}
                                                                    </Text>
                                                                </View>
                                                                {node.isCurrent && (
                                                                    <View style={styles.currentIndicatorBadge}>
                                                                        <Text style={styles.currentIndicatorText}>● VIGENTE</Text>
                                                                    </View>
                                                                )}
                                                                <Text style={styles.timelineNodeDate}>{formatDate(node.date)}</Text>
                                                            </View>
                                                            <Text style={styles.timelineNodeDesc}>{node.description}</Text>
                                                            
                                                            {/* Datos detallados de fitting y ejecución asociada */}
                                                            <View style={styles.timelineMetaDetails}>
                                                                <Text style={styles.timelineFittingText}>
                                                                    ✂️ Fitting: {node.isApproved
                                                                        ? 'Revisión derivada de fitting aprobada y vigente'
                                                                        : node.versionLabel.startsWith('v1.0')
                                                                        ? 'Trazado base inicial (pre-fitting)'
                                                                        : 'Ajuste anatómico en proceso'}
                                                                </Text>
                                                                <Text style={styles.timelineExecIdText}>
                                                                    ⚙️ Ejecución asociada: {node.execution.id.slice(0, 18)}... {node.preliminaryCount > 1 ? `(${node.preliminaryCount} corridas previas)` : ''}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}

                                                {pattern.totalExecutions > pattern.totalVersions && (
                                                    <View style={styles.timelineSummaryFooter}>
                                                        <Text style={styles.timelineSummaryFooterText}>
                                                            🛡️ {pattern.totalExecutions} ejecuciones técnicas históricas inmutables registradas en la base de datos de patronaje.
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {/* Snapshot de Medidas Anatómicas Principales */}
                                    {activeExec.measurement_snapshot && (
                                        <View style={styles.snapshotSnippet}>
                                            <Text style={styles.snapshotSnippetTitle}>MEDIDAS BASE DEL PATRÓN VIGENTE:</Text>
                                            <View style={styles.snapshotPillsRow}>
                                                {Object.entries(activeExec.measurement_snapshot)
                                                    .slice(0, 4)
                                                    .map(([mKey, mVal]) => (
                                                        <View key={mKey} style={styles.snapshotPill}>
                                                            <Text style={styles.snapshotPillKey}>
                                                                {(MASTER_MEASUREMENT_CATALOG as Record<string, any>)[mKey]?.name || mKey}:
                                                            </Text>
                                                            <Text style={styles.snapshotPillVal}>{mVal} cm</Text>
                                                        </View>
                                                    ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Barra de Acciones Principales (Sección 14) */}
                                    <View style={styles.cardActionsRow}>
                                        <TouchableOpacity
                                            onPress={() => handleInspect(activeExec)}
                                            style={styles.inspectBtn}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.inspectBtnText}>🔍 Ficha Técnica & Linaje</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                if (onOpenCad) {
                                                    onOpenCad({
                                                        clientId: pattern.clientId || null,
                                                        sessionId: activeExec.session_id || null,
                                                        creationId: pattern.creationId || null,
                                                        garmentType: pattern.garmentType,
                                                        executionId: activeExec.id,
                                                    });
                                                } else {
                                                    router.push({
                                                        pathname: '/(designer)/patterns',
                                                        params: {
                                                            client_id: pattern.clientId || undefined,
                                                            session_id: activeExec.session_id || undefined,
                                                            creation_id: pattern.creationId || undefined,
                                                            garment_type: pattern.garmentType,
                                                        },
                                                    });
                                                }
                                            }}
                                            style={styles.openCadBtn}
                                            activeOpacity={0.85}
                                            accessibilityLabel="Abrir patrón"
                                        >
                                            <Text style={styles.openCadBtnText}>Abrir patrón →</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* MODAL: FICHA TÉCNICA, MEDIDAS Y LINAJE DE PATRÓN */}
            <Modal
                visible={Boolean(inspectExecution)}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setInspectExecution(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {inspectExecution && (
                            <>
                                {/* Header Modal */}
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalPreHeader}>
                                            FICHA TÉCNICA DE PATRONAJE CAD · {inspectExecution.version_label || 'v1.0'}
                                        </Text>
                                        <Text style={styles.modalTitle}>
                                            {GARMENT_PACKAGES[inspectExecution.garment_type]?.name || inspectExecution.garment_type}
                                        </Text>
                                        <Text style={styles.modalClientSubtitle}>
                                            Clienta: {inspectExecution.client?.full_name || 'Sin clienta (Banco Experimental)'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setInspectExecution(null)}
                                        style={styles.modalCloseButton}
                                    >
                                        <Text style={styles.modalCloseText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                                    {/* AVISO DE INMUTABILIDAD ESTRICTA */}
                                    <View style={styles.inmutabilityBox}>
                                        <Text style={styles.inmutabilityTitle}>🛡️ EJECUCIÓN HISTÓRICA INMUTABLE</Text>
                                        <Text style={styles.inmutabilityDesc}>
                                            Esta versión CAD está blindada contra edición directa para garantizar la trazabilidad de confección. Toda modificación ulterior requiere una nueva prueba de fitting que creará una versión derivada.
                                        </Text>
                                    </View>

                                    {/* Origen y Relaciones Clave */}
                                    <View style={styles.modalSectionCard}>
                                        <Text style={styles.modalSectionTitle}>CONTEXTO Y RELACIONES DEL PATRÓN</Text>
                                        <View style={styles.relationRow}>
                                            <Text style={styles.relationLabel}>Clienta:</Text>
                                            <Text style={styles.relationValue}>
                                                {inspectExecution.client?.full_name || 'Sin clienta (Patrón Libre / Referencia)'}
                                            </Text>
                                        </View>
                                        <View style={styles.relationRow}>
                                            <Text style={styles.relationLabel}>Sesión de Medidas:</Text>
                                            <Text style={styles.relationValue}>
                                                {inspectExecution.session?.session_date
                                                    ? `v${inspectExecution.session.version_number || 1} · ${formatDate(inspectExecution.session.session_date)}`
                                                    : inspectExecution.session_id
                                                    ? `ID ${inspectExecution.session_id}`
                                                    : 'Sin sesión (Medidas de Referencia)'}
                                            </Text>
                                        </View>
                                        <View style={styles.relationRow}>
                                            <Text style={styles.relationLabel}>Creación Asociada:</Text>
                                            <Text style={styles.relationValue}>
                                                {inspectExecution.creation
                                                    ? `${inspectExecution.creation.name} (${inspectExecution.creation.status})`
                                                    : 'Sin Creación (Patronaje Directo o Libre)'}
                                            </Text>
                                        </View>
                                        <View style={styles.relationRow}>
                                            <Text style={styles.relationLabel}>Patrón Padre (Inmutable):</Text>
                                            <Text style={styles.relationValue}>
                                                {inspectExecution.parent_execution_id
                                                    ? `ID ${inspectExecution.parent_execution_id.slice(0, 8)}... (Linaje derivado)`
                                                    : 'Ninguno (Versión Raíz Original)'}
                                            </Text>
                                        </View>
                                        <View style={styles.relationRow}>
                                            <Text style={styles.relationLabel}>Fecha de Generación:</Text>
                                            <Text style={styles.relationValue}>
                                                {formatDate(inspectExecution.created_at)}
                                            </Text>
                                        </View>
                                        <View style={styles.relationRow}>
                                            <Text style={styles.relationLabel}>Estado Actual:</Text>
                                            <Text style={styles.relationValue}>
                                                {inspectExecution.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Linaje de Versiones */}
                                    <View style={styles.modalSectionCard}>
                                        <Text style={styles.modalSectionTitle}>LINAJE DE VERSIONES</Text>
                                        <View style={styles.lineageRow}>
                                            {inspectedLineageChain.map((node, nIdx) => {
                                                const isCurrent = node.id === inspectExecution.id;
                                                return (
                                                    <View key={node.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <TouchableOpacity
                                                            onPress={() => handleInspect(node)}
                                                            style={[
                                                                styles.lineageBadgeBtn,
                                                                isCurrent && styles.lineageBadgeBtnCurrent,
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.lineageBadgeBtnText,
                                                                    isCurrent && styles.lineageBadgeBtnTextCurrent,
                                                                ]}
                                                            >
                                                                {node.version_label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                        {nIdx < inspectedLineageChain.length - 1 && (
                                                            <Text style={styles.lineageArrowSeparator}>→</Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Ajustes y Fitting Históricos */}
                                    <View style={styles.modalSectionCard}>
                                        <Text style={styles.modalSectionTitle}>HISTORIAL DE FITTING Y AJUSTES TÉCNICOS</Text>
                                        {loadingAdjustments ? (
                                            <ActivityIndicator size="small" color={colors.champagneGold} />
                                        ) : inspectAdjustments.length === 0 ? (
                                            <Text style={styles.noDataText}>
                                                No se han registrado modificaciones de fitting en esta ejecución.
                                            </Text>
                                        ) : (
                                            inspectAdjustments.map((adj) => (
                                                <View key={adj.id} style={styles.adjustmentItem}>
                                                    <View style={styles.adjHeaderRow}>
                                                        <Text style={styles.adjTypeBadge}>
                                                            {adj.adjustment_type.toUpperCase()} · {adj.target_piece}
                                                        </Text>
                                                        <Text style={styles.adjValueBadge}>
                                                            {adj.delta_mm > 0 ? `+${adj.delta_mm}` : adj.delta_mm} mm
                                                        </Text>
                                                    </View>
                                                    {adj.description ? <Text style={styles.adjNotes}>{adj.description}</Text> : null}
                                                </View>
                                            ))
                                        )}
                                    </View>

                                    {/* Piezas Geométricas CAD */}
                                    <View style={styles.modalSectionCard}>
                                        <Text style={styles.modalSectionTitle}>
                                            PIEZAS GEOMÉTRICAS GENERADAS ({inspectExecution.geometry_result?.pieces?.length || 0})
                                        </Text>
                                        {inspectExecution.geometry_result?.pieces && inspectExecution.geometry_result.pieces.length > 0 ? (
                                            <View style={styles.piecesGrid}>
                                                {inspectExecution.geometry_result.pieces.map((piece, pIdx) => (
                                                    <View key={pIdx} style={styles.pieceCard}>
                                                        <Text style={styles.pieceName}>{piece.name}</Text>
                                                        <Text style={styles.pieceDetail}>
                                                            {Math.round(piece.boundingBox?.width || 0)} × {Math.round(piece.boundingBox?.height || 0)} mm · Piquetes: {piece.notches?.length || 0}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <Text style={styles.noDataText}>Sin geometría almacenada en snapshot.</Text>
                                        )}
                                    </View>

                                    {/* Snapshot de Medidas */}
                                    <View style={styles.modalSectionCard}>
                                        <Text style={styles.modalSectionTitle}>MEDIDAS ANATÓMICAS DE ESTA VERSIÓN</Text>
                                        {inspectExecution.measurement_snapshot ? (
                                            <View style={styles.modalMeasurementsGrid}>
                                                {Object.entries(inspectExecution.measurement_snapshot).map(([key, val]) => (
                                                    <View key={key} style={styles.modalMeasurementItem}>
                                                        <Text style={styles.modalMeasurementKey}>
                                                            {(MASTER_MEASUREMENT_CATALOG as Record<string, any>)[key]?.name || key}
                                                        </Text>
                                                        <Text style={styles.modalMeasurementVal}>{val} cm</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <Text style={styles.noDataText}>Sin snapshot de medidas disponible.</Text>
                                        )}
                                    </View>
                                </ScrollView>

                                {/* Footer Modal */}
                                <View style={styles.modalFooter}>
                                    <TouchableOpacity
                                        onPress={() => setInspectExecution(null)}
                                        style={styles.modalCloseFooterBtn}
                                    >
                                        <Text style={styles.modalCloseFooterBtnText}>Cerrar Ficha</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            const exec = inspectExecution;
                                            setInspectExecution(null);
                                            if (onOpenCad) {
                                                onOpenCad({
                                                    clientId: exec.client_id || null,
                                                    sessionId: exec.session_id || null,
                                                    creationId: exec.creation_id || null,
                                                    garmentType: exec.garment_type,
                                                    executionId: exec.id,
                                                });
                                            } else {
                                                router.push({
                                                    pathname: '/(designer)/patterns',
                                                    params: {
                                                        client_id: exec.client_id || undefined,
                                                        session_id: exec.session_id || undefined,
                                                        creation_id: exec.creation_id || undefined,
                                                        garment_type: exec.garment_type,
                                                    },
                                                });
                                            }
                                        }}
                                        style={styles.modalOpenCadBtn}
                                    >
                                        <Text style={styles.modalOpenCadBtnText}>Abrir en Mesa CAD →</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 24,
        paddingBottom: 60,
    },
    topNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    backButtonText: {
        color: colors.atelierBlack,
        fontFamily: typography.sans,
        fontSize: 13,
        fontWeight: '600',
    },
    newPatternButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        backgroundColor: colors.atelierBlack,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    newPatternButtonText: {
        color: colors.ivoryWarm,
        fontFamily: typography.sans,
        fontSize: 13,
        fontWeight: '600',
    },
    header: {
        marginBottom: 20,
    },
    brand: {
        fontFamily: typography.serif,
        fontSize: 14,
        letterSpacing: 2,
        color: colors.champagneGold,
    },
    divider: {
        height: 1,
        backgroundColor: colors.sand,
        marginVertical: 8,
        width: 60,
    },
    eyebrow: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: {
        fontFamily: typography.serif,
        fontSize: 28,
        color: colors.atelierBlack,
        marginBottom: 4,
    },
    editorialQuote: {
        fontFamily: typography.serif,
        fontStyle: 'italic',
        fontSize: 15,
        color: colors.champagneGold,
        marginBottom: 6,
    },
    subtitle: {
        fontFamily: typography.sans,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        maxWidth: 820,
    },
    // SECCIÓN HERO: PATRONES DESTACADOS (Sección 10)
    featuredSection: {
        marginBottom: 24,
    },
    featuredSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    featuredSectionTitle: {
        fontFamily: typography.sans,
        fontSize: 11,
        letterSpacing: 1.5,
        color: colors.champagneGold,
        fontWeight: '700',
    },
    featuredSectionCount: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.textSecondary,
    },
    featuredCardsRow: {
        gap: 16,
        paddingVertical: 4,
    },
    featuredCard: {
        width: 260,
        height: 190,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: 'transparent',
    },
    featuredCardBg: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    featuredCardImg: {
        borderRadius: 3,
    },
    featuredCardOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.45)',
        padding: 12,
        justifyContent: 'space-between',
    },
    featuredCardTopPill: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    featuredCardTopPillText: {
        color: colors.ivoryWarm,
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
    },
    featuredCardBottomContent: {
        gap: 2,
    },
    featuredCardPrenda: {
        fontFamily: typography.serif,
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    featuredCardClient: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.ivoryWarm,
    },
    featuredCardPieces: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.champagneGold,
        marginTop: 2,
    },
    conceptCard: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E8E2D5',
        borderRadius: 4,
        padding: 16,
        marginBottom: 24,
    },
    conceptHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    conceptBadge: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
    },
    conceptBadgeText: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    conceptHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.sans,
    },
    conceptCols: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
    },
    conceptCol: {
        flex: 1,
        minWidth: 200,
    },
    conceptColTag: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    conceptColTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginTop: 2,
        marginBottom: 4,
    },
    conceptColDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    conceptDivider: {
        width: 1,
        backgroundColor: colors.sand,
    },
    errorBanner: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        padding: 12,
        borderRadius: 2,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        color: colors.error,
        fontFamily: typography.sans,
        fontSize: 13,
    },
    dismissText: {
        color: colors.error,
        fontWeight: '700',
        paddingHorizontal: 6,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 16,
    },
    metricNumber: {
        fontFamily: typography.serif,
        fontSize: 26,
        color: colors.atelierBlack,
        fontWeight: '700',
        marginBottom: 2,
    },
    metricLabel: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.textMuted,
        letterSpacing: 1,
        fontWeight: '700',
    },
    metricSub: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
    },
    controlsCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        padding: 14,
        marginBottom: 20,
        gap: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    controlsTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 2,
    },
    searchBox: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: '#FCFAF7',
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: typography.sans,
        fontSize: 12.5,
        color: colors.atelierBlack,
    },
    clearSearchText: {
        fontSize: 14,
        color: colors.textMuted,
        paddingHorizontal: 6,
    },
    orderInlineGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    orderPillsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    orderPill: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    orderPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    orderPillText: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    orderPillTextActive: {
        color: '#FFFFFF',
    },
    resetFiltersButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#F7F2EC',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    resetFiltersButtonText: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    filterSection: {
        gap: 4,
    },
    filterSectionFlex: {
        gap: 4,
        flex: 1,
        minWidth: 240,
    },
    compactAttributesShelf: {
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#F2ECE4',
        paddingTop: 8,
    },
    filterSectionTitle: {
        fontFamily: typography.sans,
        fontSize: 9.5,
        letterSpacing: 0.8,
        color: colors.textMuted,
        fontWeight: '700',
    },
    filterPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    filterPill: {
        paddingVertical: 4.5,
        paddingHorizontal: 10,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    filterPillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    filterPillText: {
        fontFamily: typography.sans,
        fontSize: 11.5,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    filterPillTextActive: {
        color: '#FFFFFF',
    },
    garmentScrollRow: {
        gap: 6,
        paddingVertical: 1,
    },
    garmentPill: {
        paddingVertical: 4.5,
        paddingHorizontal: 10,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    garmentPillActive: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    garmentPillText: {
        fontFamily: typography.sans,
        fontSize: 11.5,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    garmentPillTextActive: {
        color: '#FFFFFF',
    },
    loadingBox: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: typography.sans,
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 12,
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 40,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 32,
        color: colors.champagneGold,
        marginBottom: 10,
    },
    emptyTitle: {
        fontFamily: typography.serif,
        fontSize: 18,
        color: colors.atelierBlack,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontFamily: typography.sans,
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 480,
        lineHeight: 18,
        marginBottom: 16,
    },
    emptyActionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: colors.atelierBlack,
        borderRadius: 2,
    },
    emptyActionButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    // GRID DE TARJETAS DE PATRÓN LÓGICO (Secciones 4, 5, 6, 7)
    patternsGrid: {
        gap: 20,
    },
    patternCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        overflow: 'hidden',
    },
    cardVisualHeader: {
        width: '100%',
        height: 200,
        backgroundColor: 'transparent',
    },
    cardImageBackground: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.40)',
        padding: 14,
        justifyContent: 'space-between',
    },
    cardImageTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    originCombinedBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
        borderWidth: 1,
    },
    originCombinedText: {
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statusPillOnImage: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
        borderWidth: 1,
    },
    statusPillOnImageText: {
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cardImageBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    piecesBadgeOnImage: {
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    piecesBadgeOnImageText: {
        color: colors.ivoryWarm,
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
    },
    cadScaleBadge: {
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 2,
    },
    cadScaleBadgeText: {
        color: colors.champagneGold,
        fontFamily: typography.sans,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cardBody: {
        padding: 18,
    },
    cardPatternTitle: {
        fontFamily: typography.serif,
        fontSize: 20,
        color: colors.atelierBlack,
        fontWeight: '700',
        marginBottom: 12,
    },
    contextMetaBox: {
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.surfaceSubtle,
        marginBottom: 14,
        gap: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    metaLabel: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.textMuted,
        letterSpacing: 1,
        fontWeight: '700',
        width: 80,
    },
    clientLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clientAvatarMini: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.atelierBlack,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clientAvatarMiniText: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
    },
    clientNameLink: {
        fontFamily: typography.serif,
        fontSize: 14,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    creationLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    creationNameLink: {
        fontFamily: typography.sans,
        fontSize: 13,
        color: colors.champagneGold,
        fontWeight: '600',
    },
    metaValueMuted: {
        fontFamily: typography.sans,
        fontSize: 13,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    versionHighlightBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: '#EFE7DA',
        borderRadius: 3,
        padding: 12,
        marginBottom: 14,
    },
    versionHighlightLeft: {
        gap: 2,
    },
    versionHighlightTag: {
        fontFamily: typography.sans,
        fontSize: 9,
        letterSpacing: 1,
        color: colors.champagneGold,
        fontWeight: '700',
    },
    versionHighlightLabel: {
        fontFamily: typography.sans,
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    versionHighlightRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    versionDateLabel: {
        fontFamily: typography.sans,
        fontSize: 9,
        color: colors.textMuted,
        fontWeight: '600',
    },
    versionDateValue: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    // SEGUNDA CAPA: TRAZABILIDAD TÉCNICA (Sección 6 & 21)
    technicalTraceabilityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        padding: 10,
        marginBottom: 14,
    },
    traceItem: {
        flex: 1,
        alignItems: 'center',
    },
    traceNumber: {
        fontFamily: typography.serif,
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    traceLabel: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 1,
    },
    traceHint: {
        fontFamily: typography.sans,
        fontSize: 9,
        color: colors.textMuted,
        marginTop: 1,
    },
    traceDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.sand,
    },
    // ACORDEÓN DE HISTORIAL (Sección 7)
    historySection: {
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        overflow: 'hidden',
    },
    historyToggleHeader: {
        backgroundColor: '#FAF7F2',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    historyToggleText: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    historyTimelineBody: {
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        gap: 12,
    },
    historyTimelineTitle: {
        fontFamily: typography.sans,
        fontSize: 10,
        letterSpacing: 1,
        color: colors.textMuted,
        fontWeight: '700',
        marginBottom: 4,
    },
    // ATELIER PATTERN BOARD
    patternBoardHeader: {
        width: '100%',
        height: '100%',
        backgroundColor: '#171411',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    patternBoardBlueprintGrid: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#171411',
    },
    patternBoardSilhouette: {
        fontSize: 48,
        marginBottom: 4,
        opacity: 0.9,
    },
    patternBoardTitle: {
        fontFamily: typography.serif,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#A78350',
    },
    patternBoardSub: {
        fontFamily: typography.sans,
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: 'rgba(230, 217, 200, 0.7)',
        marginTop: 2,
    },
    // LINAJE FLOW
    lineageFlowHeader: {
        backgroundColor: '#FAF7F2',
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        marginBottom: 8,
    },
    lineageFlowLabel: {
        fontFamily: typography.sans,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.textMuted,
        marginBottom: 6,
    },
    lineageFlowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    lineageFlowPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    lineageFlowPillCurrent: {
        borderColor: '#2B5E35',
        backgroundColor: '#EDF5EE',
    },
    lineageFlowPillText: {
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    lineageFlowPillTextCurrent: {
        color: '#2B5E35',
    },
    lineageFlowArrow: {
        fontSize: 12,
        color: '#A78350',
        fontWeight: '700',
    },
    currentIndicatorBadge: {
        backgroundColor: '#171411',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    currentIndicatorText: {
        fontFamily: typography.sans,
        fontSize: 8,
        fontWeight: '700',
        color: '#A78350',
        letterSpacing: 0.5,
    },
    timelineMetaDetails: {
        marginTop: 4,
        gap: 2,
        backgroundColor: '#FAF7F2',
        padding: 6,
        borderRadius: 2,
    },
    timelineFittingText: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: '#5C5248',
        fontWeight: '500',
    },
    timelineExecIdText: {
        fontFamily: typography.sans,
        fontSize: 9,
        color: colors.textMuted,
    },
    timelineNodeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    timelineIconCol: {
        alignItems: 'center',
        width: 16,
    },
    timelineDot: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 16,
    },
    timelineDotCurrent: {
        color: '#2B5E35',
    },
    timelineLine: {
        flex: 1,
        width: 1,
        backgroundColor: colors.sand,
        marginTop: 4,
    },
    timelineContentCol: {
        flex: 1,
        gap: 2,
    },
    timelineNodeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    timelineNodeVersion: {
        fontFamily: typography.sans,
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    timelineNodeBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 2,
    },
    timelineNodeBadgeText: {
        fontFamily: typography.sans,
        fontSize: 9,
        fontWeight: '700',
    },
    timelineNodeDate: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textMuted,
        marginLeft: 'auto',
    },
    timelineNodeDesc: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
    },
    timelinePrelimText: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.champagneGold,
        fontWeight: '600',
        marginTop: 2,
    },
    timelineSummaryFooter: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceSubtle,
    },
    timelineSummaryFooterText: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    snapshotSnippet: {
        backgroundColor: '#FAF7F2',
        padding: 10,
        borderRadius: 2,
        marginBottom: 14,
    },
    snapshotSnippetTitle: {
        fontFamily: typography.sans,
        fontSize: 9,
        color: colors.textMuted,
        letterSpacing: 0.8,
        fontWeight: '700',
        marginBottom: 6,
    },
    snapshotPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    snapshotPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8E2D5',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 2,
    },
    snapshotPillKey: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.textSecondary,
    },
    snapshotPillVal: {
        fontFamily: typography.sans,
        fontSize: 10,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    cardActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceSubtle,
    },
    inspectBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    inspectBtnText: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    openCadBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 2,
        backgroundColor: colors.atelierBlack,
    },
    openCadBtnText: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        width: '100%',
        maxWidth: 720,
        maxHeight: '90%',
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        backgroundColor: '#FAF7F2',
    },
    modalPreHeader: {
        fontFamily: typography.sans,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.champagneGold,
        fontWeight: '700',
        marginBottom: 2,
    },
    modalTitle: {
        fontFamily: typography.serif,
        fontSize: 22,
        color: colors.atelierBlack,
    },
    modalClientSubtitle: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalCloseButton: {
        padding: 6,
    },
    modalCloseText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    modalScrollBody: {
        padding: 20,
    },
    inmutabilityBox: {
        padding: 12,
        backgroundColor: '#FEF9F0',
        borderRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
        marginBottom: 16,
    },
    inmutabilityTitle: {
        fontFamily: typography.sans,
        fontSize: 11,
        fontWeight: '700',
        color: '#8A5D10',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    inmutabilityDesc: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.atelierBlack,
        lineHeight: 17,
    },
    modalSectionCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 14,
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontFamily: typography.sans,
        fontSize: 10,
        letterSpacing: 1,
        color: colors.textMuted,
        fontWeight: '700',
        marginBottom: 10,
    },
    relationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceSubtle,
    },
    relationLabel: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.textSecondary,
    },
    relationValue: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    lineageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    lineageBadgeBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    lineageBadgeBtnCurrent: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    lineageBadgeBtnText: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    lineageBadgeBtnTextCurrent: {
        color: '#FFFFFF',
    },
    lineageArrowSeparator: {
        fontSize: 14,
        color: colors.textMuted,
    },
    adjustmentItem: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E8E2D5',
        borderRadius: 2,
        padding: 10,
        marginBottom: 8,
    },
    adjHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    adjTypeBadge: {
        fontFamily: typography.sans,
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    adjValueBadge: {
        fontFamily: typography.sans,
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    adjNotes: {
        fontFamily: typography.sans,
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    piecesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pieceCard: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E8E2D5',
        borderRadius: 2,
        padding: 8,
        minWidth: 140,
    },
    pieceName: {
        fontFamily: typography.sans,
        fontSize: 11,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    pieceDetail: {
        fontFamily: typography.sans,
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalMeasurementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    modalMeasurementItem: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E8E2D5',
        borderRadius: 2,
        paddingVertical: 4,
        paddingHorizontal: 8,
        minWidth: 120,
    },
    modalMeasurementKey: {
        fontFamily: typography.sans,
        fontSize: 9,
        color: colors.textMuted,
        fontWeight: '700',
    },
    modalMeasurementVal: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '700',
        marginTop: 1,
    },
    noDataText: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        backgroundColor: '#FAF7F2',
    },
    modalCloseFooterBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    modalCloseFooterBtnText: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modalOpenCadBtn: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 2,
        backgroundColor: colors.atelierBlack,
    },
    modalOpenCadBtnText: {
        fontFamily: typography.sans,
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
