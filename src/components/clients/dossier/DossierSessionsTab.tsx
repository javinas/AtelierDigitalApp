// ==============================================================================
// COMPONENTE: PESTAÑA DE HISTORIAL DE SESIONES DE MEDIDAS (ALTA COSTURA)
// Archivo: src/components/clients/dossier/DossierSessionsTab.tsx
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Client } from '../../../types/client';
import { Creation } from '../../../types/creation';
import { MeasuredPerson, DEMOGRAPHIC_LABELS } from '../../../types/personGroup';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { PatternExecution } from '../../../types/pattern/pattern';
import { styles } from './clientDossierStyles';

const DEMOGRAPHIC_AVATARS: Record<string, any> = {
    woman: require('../../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../../assets/mannequin_man_real.jpg'),
    child: require('../../../../assets/mannequin_woman_real.jpg'),
    teen: require('../../../../assets/mannequin_woman_real.jpg'),
};

interface DossierSessionsTabProps {
    client: Client;
    sessions: MeasurementSession[];
    persons: MeasuredPerson[];
    patterns: PatternExecution[];
    creationMap: Map<string, Creation>;
    personMap: Map<string, MeasuredPerson>;
    isInstitutional: boolean;
    selectedSubjectFilter: string;
    onSubjectFilterChange: (id: string) => void;
    formatDate: (dateStr?: string | null) => string;
    onOpenFastCapture: (targetPerson: MeasuredPerson | null, draftSession: MeasurementSession | null) => void;
    onViewSessionDetails: (s: MeasurementSession) => void;
    onStartComparison: (s: MeasurementSession) => void;
    onOpenCadWizard: (s: MeasurementSession) => void;
    onViewDerivedPatterns: (sessionId: string) => void;
    onGoToPersonsGroups: () => void;
    onOpenCad?: (params: { clientId: string; sessionId?: string | null }) => void;
}

export const DossierSessionsTab: React.FC<DossierSessionsTabProps> = ({
    client,
    sessions,
    persons,
    patterns,
    creationMap,
    personMap,
    isInstitutional,
    selectedSubjectFilter,
    onSubjectFilterChange,
    formatDate,
    onOpenFastCapture,
    onViewSessionDetails,
    onStartComparison,
    onOpenCadWizard,
    onViewDerivedPatterns,
    onGoToPersonsGroups,
    onOpenCad,
}) => {
    // Filtros de sesiones
    const [selectedSessionStatusFilter, setSelectedSessionStatusFilter] = useState<string>('all'); // 'all' | 'draft' | 'verified' | 'completed'
    const [sessionsSearchQuery, setSessionsSearchQuery] = useState<string>('');
    const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');
    const [sessionSortOrder, setSessionSortOrder] = useState<'desc' | 'asc'>('desc');

    // Sesiones propias de la titular (person_id IS NULL)
    const titularSessions = useMemo(() => {
        return sessions.filter((s) => !s.person_id);
    }, [sessions]);

    // Sujetos filtrados en el buscador de la pestaña de sesiones
    const filteredSubjectPersons = useMemo(() => {
        if (!subjectSearchQuery.trim()) return persons;
        const q = subjectSearchQuery.toLowerCase().trim();
        return persons.filter(
            (p) =>
                p.full_name.toLowerCase().includes(q) ||
                (p.reference_id && p.reference_id.toLowerCase().includes(q))
        );
    }, [persons, subjectSearchQuery]);

    // 1. Filtrado de sesiones por sujeto
    const subjectFilteredSessions = useMemo(() => {
        if (selectedSubjectFilter === 'titular') {
            return titularSessions;
        }
        if (selectedSubjectFilter !== 'all') {
            return sessions.filter((s) => s.person_id === selectedSubjectFilter);
        }
        return sessions;
    }, [sessions, selectedSubjectFilter, titularSessions]);

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
        onSubjectFilterChange('all');
        setSelectedSessionStatusFilter('all');
        setSessionsSearchQuery('');
        setSessionSortOrder('desc');
    };

    return (
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
                                onOpenFastCapture(targetPerson, null);
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
                            onPress={onGoToPersonsGroups}
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
                            onOpenFastCapture(targetPerson, null);
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
                        onPress={() => onSubjectFilterChange('all')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.subjectPillText, selectedSubjectFilter === 'all' && styles.subjectPillTextActive]}>
                            Todos ({sessions.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.subjectPill, selectedSubjectFilter === 'titular' && styles.subjectPillActive]}
                        onPress={() => onSubjectFilterChange('titular')}
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
                                onPress={() => onSubjectFilterChange(p.id)}
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
                            : require('../../../../assets/mannequin_woman_real.jpg');

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
                                                onOpenFastCapture(targetPerson, s);
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
                                        onPress={() => onViewSessionDetails(s)}
                                        style={styles.cardActionSecondary}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.cardActionSecondaryText}>👁️ [Ver medidas]</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => onStartComparison(s)}
                                        style={styles.cardActionCompare}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.cardActionCompareText}>⚖️ Comparar</Text>
                                    </TouchableOpacity>

                                    {/* PUENTE CAD: Iniciar creación y patronaje desde esta sesión (Componente 4) */}
                                    <TouchableOpacity
                                        onPress={() => onOpenCadWizard(s)}
                                        style={[styles.cardActionSecondary, { borderColor: colors.accent, backgroundColor: '#FFFDF9' }]}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.cardActionSecondaryText, { color: colors.accent, fontWeight: '700' }]}>
                                            ✂️ Patronaje CAD
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => onViewDerivedPatterns(s.id)}
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
    );
};

