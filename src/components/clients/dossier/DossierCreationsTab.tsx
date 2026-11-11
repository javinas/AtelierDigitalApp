// ==============================================================================
// COMPONENTE: PESTAÑA DE CREACIONES DE ALTA COSTURA
// Archivo: src/components/clients/dossier/DossierCreationsTab.tsx
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Client } from '../../../types/client';
import { Creation } from '../../../types/creation';
import { MeasuredPerson } from '../../../types/personGroup';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { GarmentType, PatternExecution } from '../../../types/pattern/pattern';
import { styles } from './clientDossierStyles';

interface DossierCreationsTabProps {
    client: Client;
    creations: Creation[];
    persons: MeasuredPerson[];
    patterns: PatternExecution[];
    sessionMap: Map<string, MeasurementSession>;
    personMap: Map<string, MeasuredPerson>;
    getCreationPhoto: (c: Creation) => any;
    getGarmentLabel: (gt: string) => string;
    formatDate: (dateStr?: string | null) => string;
    onOpenCreation?: (creationId: string) => void;
    onOpenCad?: (params: {
        clientId: string;
        sessionId?: string | null;
        creationId?: string | null;
        garmentType?: GarmentType | null;
        executionId?: string | null;
    }) => void;
}

export const DossierCreationsTab: React.FC<DossierCreationsTabProps> = ({
    client,
    creations,
    persons,
    patterns,
    sessionMap,
    personMap,
    getCreationPhoto,
    getGarmentLabel,
    formatDate,
    onOpenCreation,
    onOpenCad,
}) => {
    // Filtros de creaciones
    const [creationSubjectFilter, setCreationSubjectFilter] = useState<string>('all'); // 'all' | 'titular' | personId
    const [creationStatusFilter, setCreationStatusFilter] = useState<string>('all');
    const [creationSearchQuery, setCreationSearchQuery] = useState<string>('');
    const [creationSubjectSearchQuery, setCreationSubjectSearchQuery] = useState<string>('');
    const [creationSortOrder, setCreationSortOrder] = useState<'desc' | 'asc'>('desc');

    // Creaciones directas de la clienta titular (sin person_id asignado)
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
    }, [subjectFilteredCreations, creationStatusFilter, creationSearchQuery, creationSortOrder, personMap, getGarmentLabel]);

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

    return (
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
    );
};

