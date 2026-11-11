// ==============================================================================
// VISTA: TABLA EDITORIAL DE PERSONAS (ESCRITORIO / TABLET CON SCROLL SINCRONIZADO)
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React, { useCallback, useRef } from 'react';
import {
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import {
    DemographicCategory,
    DEMOGRAPHIC_LABELS,
    MeasurementGroup,
    MeasuredPerson,
} from '../../../types/personGroup';
import { styles } from './personGroupStyles';

export type PersonSortColumn = 'name' | 'reference' | 'group' | 'last_session_date' | 'status';
export type SortDirection = 'asc' | 'desc';

interface PersonTableViewProps {
    persons: MeasuredPerson[];
    personToGroupMap: Map<string, { id: string; name: string } | MeasurementGroup>;
    demographicAvatars: Record<DemographicCategory, any>;
    sortColumn: PersonSortColumn;
    sortDirection: SortDirection;
    onSort: (column: PersonSortColumn) => void;
    onMeasurePerson: (person: MeasuredPerson) => void;
    onViewPersonHistory?: (person: MeasuredPerson) => void;
    onCadPerson: (person: MeasuredPerson) => void;
    onEditPerson: (person: MeasuredPerson) => void;
    onToggleActivePerson: (person: MeasuredPerson) => void;
}

export const PersonTableView: React.FC<PersonTableViewProps> = ({
    persons,
    personToGroupMap,
    demographicAvatars,
    sortColumn,
    sortDirection,
    onSort,
    onMeasurePerson,
    onViewPersonHistory,
    onCadPerson,
    onEditPerson,
    onToggleActivePerson,
}) => {
    // Sincronización de scroll horizontal superior e inferior
    const topScrollRef = useRef<ScrollView>(null);
    const tableScrollRef = useRef<ScrollView>(null);
    const bottomScrollRef = useRef<ScrollView>(null);
    const isSyncingScrollRef = useRef<'top' | 'table' | 'bottom' | null>(null);

    const handleTopScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isSyncingScrollRef.current && isSyncingScrollRef.current !== 'top') return;
        isSyncingScrollRef.current = 'top';
        const x = e.nativeEvent.contentOffset.x;
        tableScrollRef.current?.scrollTo({ x, animated: false });
        bottomScrollRef.current?.scrollTo({ x, animated: false });
        setTimeout(() => {
            if (isSyncingScrollRef.current === 'top') isSyncingScrollRef.current = null;
        }, 60);
    }, []);

    const handleTableScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isSyncingScrollRef.current && isSyncingScrollRef.current !== 'table') return;
        isSyncingScrollRef.current = 'table';
        const x = e.nativeEvent.contentOffset.x;
        topScrollRef.current?.scrollTo({ x, animated: false });
        bottomScrollRef.current?.scrollTo({ x, animated: false });
        setTimeout(() => {
            if (isSyncingScrollRef.current === 'table') isSyncingScrollRef.current = null;
        }, 60);
    }, []);

    const handleBottomScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isSyncingScrollRef.current && isSyncingScrollRef.current !== 'bottom') return;
        isSyncingScrollRef.current = 'bottom';
        const x = e.nativeEvent.contentOffset.x;
        topScrollRef.current?.scrollTo({ x, animated: false });
        tableScrollRef.current?.scrollTo({ x, animated: false });
        setTimeout(() => {
            if (isSyncingScrollRef.current === 'bottom') isSyncingScrollRef.current = null;
        }, 60);
    }, []);

    const scrollTableLeft = useCallback(() => {
        topScrollRef.current?.scrollTo({ x: 0, animated: true });
        tableScrollRef.current?.scrollTo({ x: 0, animated: true });
        bottomScrollRef.current?.scrollTo({ x: 0, animated: true });
    }, []);

    const scrollTableRight = useCallback(() => {
        topScrollRef.current?.scrollTo({ x: 380, animated: true });
        tableScrollRef.current?.scrollTo({ x: 380, animated: true });
        bottomScrollRef.current?.scrollTo({ x: 380, animated: true });
    }, []);

    return (
        <>
            {/* BARRA DE DESPLAZAMIENTO HORIZONTAL SUPERIOR */}
            <View style={styles.topScrollHeaderBar}>
                <View style={styles.tableScrollNavGroup}>
                    <Text style={styles.tableScrollNavHint}>↔ Desplazar tabla:</Text>
                    <TouchableOpacity
                        style={styles.tableScrollNavBtn}
                        onPress={scrollTableLeft}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.tableScrollNavBtnText}>◀ Inicio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.tableScrollNavBtn}
                        onPress={scrollTableRight}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.tableScrollNavBtnText}>Acciones ▶</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    ref={topScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    onScroll={handleTopScroll}
                    scrollEventThrottle={16}
                    style={styles.topScrollBar}
                    contentContainerStyle={{ width: 830, height: 14 }}
                >
                    <View style={{ width: 830, height: 14 }} />
                </ScrollView>
            </View>

            {/* TABLA EDITORIAL DE PERSONAS (CON HORIZONTAL SCROLLVIEW SINCRONIZADO) */}
            <ScrollView
                ref={tableScrollRef}
                horizontal
                showsHorizontalScrollIndicator={true}
                onScroll={handleTableScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.tableScrollContainer}
            >
                <View style={styles.tableWrapper}>
                    {/* CABECERA DE COLUMNAS ORDENABLES */}
                    <View style={styles.tableHeaderRow}>
                        {/* Columna 1: Persona */}
                        <TouchableOpacity
                            style={[styles.tableColHeaderBtn, { flex: 2.2, minWidth: 160 }]}
                            onPress={() => onSort('name')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tableColHeader, sortColumn === 'name' && styles.tableColHeaderActive]}>
                                PERSONA / SUJETO MEDIDO
                            </Text>
                            <Text style={[styles.sortIndicatorIcon, sortColumn === 'name' && styles.sortIndicatorIconActive]}>
                                {sortColumn === 'name' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                            </Text>
                        </TouchableOpacity>

                        {/* Columna 2: Referencia */}
                        <TouchableOpacity
                            style={[styles.tableColHeaderBtn, { width: 90, minWidth: 90 }]}
                            onPress={() => onSort('reference')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tableColHeader, sortColumn === 'reference' && styles.tableColHeaderActive]}>
                                REFERENCIA
                            </Text>
                            <Text style={[styles.sortIndicatorIcon, sortColumn === 'reference' && styles.sortIndicatorIconActive]}>
                                {sortColumn === 'reference' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                            </Text>
                        </TouchableOpacity>

                        {/* Columna 3: Grupo / Núcleo */}
                        <TouchableOpacity
                            style={[styles.tableColHeaderBtn, { flex: 1.5, minWidth: 135 }]}
                            onPress={() => onSort('group')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tableColHeader, sortColumn === 'group' && styles.tableColHeaderActive]}>
                                GRUPO / NÚCLEO
                            </Text>
                            <Text style={[styles.sortIndicatorIcon, sortColumn === 'group' && styles.sortIndicatorIconActive]}>
                                {sortColumn === 'group' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                            </Text>
                        </TouchableOpacity>

                        {/* Columna 4: Última Medición */}
                        <TouchableOpacity
                            style={[styles.tableColHeaderBtn, { width: 115, minWidth: 115 }]}
                            onPress={() => onSort('last_session_date')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tableColHeader, sortColumn === 'last_session_date' && styles.tableColHeaderActive]}>
                                ÚLTIMA MEDICIÓN
                            </Text>
                            <Text style={[styles.sortIndicatorIcon, sortColumn === 'last_session_date' && styles.sortIndicatorIconActive]}>
                                {sortColumn === 'last_session_date' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                            </Text>
                        </TouchableOpacity>

                        {/* Columna 5: Estado */}
                        <TouchableOpacity
                            style={[styles.tableColHeaderBtn, { width: 115, minWidth: 115 }]}
                            onPress={() => onSort('status')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tableColHeader, sortColumn === 'status' && styles.tableColHeaderActive]}>
                                ESTADO
                            </Text>
                            <Text style={[styles.sortIndicatorIcon, sortColumn === 'status' && styles.sortIndicatorIconActive]}>
                                {sortColumn === 'status' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                            </Text>
                        </TouchableOpacity>

                        {/* Columna 6: Acciones Rápidas (fija) */}
                        <View style={{ width: 225, minWidth: 225, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={[styles.tableColHeader, { textAlign: 'right' }]}>
                                ACCIONES RÁPIDAS
                            </Text>
                        </View>
                    </View>

                    {/* FILAS DE LA TABLA EDITORIAL */}
                    <View style={styles.tableBody}>
                        {persons.map((p) => {
                            const avatar = demographicAvatars[p.demographic_category];
                            const groupInfo = personToGroupMap.get(p.id);
                            const isDraft = p.last_session_status === 'draft';
                            const isVerified = p.last_session_status === 'verified';
                            const isCompleted = p.last_session_status === 'completed';

                            return (
                                <View
                                    key={p.id}
                                    style={[styles.tableRow, !p.is_active && styles.tableRowInactive]}
                                >
                                    {/* Columna 1: Persona */}
                                    <View style={[styles.tableColCell, { flex: 2.2, minWidth: 160, flexDirection: 'row', alignItems: 'center' }]}>
                                        <View style={styles.avatarMiniWrap}>
                                            <Image source={avatar} style={styles.avatarMiniImg} resizeMode="cover" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.rowPersonName} numberOfLines={1}>
                                                {p.full_name}
                                            </Text>
                                            <View style={styles.demographicMiniTag}>
                                                <Text style={styles.demographicMiniTagText}>
                                                    {DEMOGRAPHIC_LABELS[p.demographic_category].toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Columna 2: Referencia */}
                                    <View style={[styles.tableColCell, { width: 90, minWidth: 90 }]}>
                                        <Text style={styles.rowRefText} numberOfLines={1}>
                                            {p.reference_id || '—'}
                                        </Text>
                                    </View>

                                    {/* Columna 3: Grupo */}
                                    <View style={[styles.tableColCell, { flex: 1.5, minWidth: 135 }]}>
                                        <Text style={styles.rowGroupText} numberOfLines={1}>
                                            {groupInfo ? `👥 ${groupInfo.name}` : <Text style={{ color: colors.textMuted }}>Sin grupo</Text>}
                                        </Text>
                                    </View>

                                    {/* Columna 4: Última Medición */}
                                    <View style={[styles.tableColCell, { width: 115, minWidth: 115 }]}>
                                        {p.last_session_date ? (
                                            <View>
                                                <Text style={styles.rowSessionDate}>
                                                    📅 {p.last_session_date}
                                                </Text>
                                                <Text style={styles.rowSessionVer}>
                                                    v{p.last_session_version || 1}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.rowSessionEmpty}>Sin sesión</Text>
                                        )}
                                    </View>

                                    {/* Columna 5: Estado */}
                                    <View style={[styles.tableColCell, { width: 115, minWidth: 115, alignItems: 'flex-start' }]}>
                                        {p.last_session_id ? (
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    isCompleted
                                                        ? styles.statusBadgeCompleted
                                                        : isVerified
                                                            ? styles.statusBadgeVerified
                                                            : styles.statusBadgeDraft,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusBadgeText,
                                                        isCompleted
                                                            ? styles.statusBadgeTextCompleted
                                                            : isVerified
                                                                ? styles.statusBadgeTextVerified
                                                                : styles.statusBadgeTextDraft,
                                                    ]}
                                                >
                                                    {isCompleted ? '🛡️ FINALIZADA' : isVerified ? '✅ VERIFICADA' : '⏳ BORRADOR'}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.statusBadgeNone}>
                                                <Text style={styles.statusBadgeTextNone}>○ PENDIENTE</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Columna 6: Acciones Rápidas Compactas */}
                                    <View style={[styles.tableColCell, { width: 225, minWidth: 225, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }]}>
                                        <TouchableOpacity
                                            style={styles.actionBtnMeasureCompact}
                                            onPress={() => onMeasurePerson(p)}
                                            activeOpacity={0.8}
                                            accessibilityLabel="Capturar y editar medidas anatómicas"
                                            {...Platform.select({ web: { title: '📐 Tomar medidas anatómicas' } as any })}
                                        >
                                            <Text style={styles.actionBtnMeasureCompactText}>📐 Medir</Text>
                                        </TouchableOpacity>

                                        {onViewPersonHistory && (
                                            <TouchableOpacity
                                                style={styles.actionIconBtn}
                                                onPress={() => onViewPersonHistory(p)}
                                                activeOpacity={0.8}
                                                accessibilityLabel="Ver historial de medidas anatómicas"
                                                {...Platform.select({ web: { title: '📜 Ver historial de medidas' } as any })}
                                            >
                                                <Text style={styles.actionIconBtnText}>📜</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={styles.actionIconBtnCad}
                                            onPress={() => onCadPerson(p)}
                                            activeOpacity={0.8}
                                            accessibilityLabel="Taller CAD de Alta Costura y patronaje"
                                            {...Platform.select({ web: { title: '✨ Taller CAD y patronaje digital' } as any })}
                                        >
                                            <Text style={styles.actionIconBtnCadText}>✨</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.actionIconBtn}
                                            onPress={() => onEditPerson(p)}
                                            activeOpacity={0.8}
                                            accessibilityLabel="Editar ficha de la persona"
                                            {...Platform.select({ web: { title: '✎ Editar datos y perfil' } as any })}
                                        >
                                            <Text style={styles.actionIconBtnText}>✎</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionIconBtn, !p.is_active && styles.actionIconBtnInactive]}
                                            onPress={() => onToggleActivePerson(p)}
                                            activeOpacity={0.8}
                                            accessibilityLabel={p.is_active ? 'Desactivar persona' : 'Reactivar persona'}
                                            {...Platform.select({ web: { title: p.is_active ? '⊘ Desactivar persona' : '↺ Reactivar persona' } as any })}
                                        >
                                            <Text style={[styles.actionIconBtnText, !p.is_active && { color: colors.champagneGold }]}>
                                                {p.is_active ? '⊘' : '↺'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* BARRA DE DESPLAZAMIENTO HORIZONTAL INFERIOR */}
            <View style={styles.bottomScrollHeaderBar}>
                <View style={styles.tableScrollNavGroup}>
                    <Text style={styles.tableScrollNavHint}>↔ Desplazar tabla:</Text>
                    <TouchableOpacity
                        style={styles.tableScrollNavBtn}
                        onPress={scrollTableLeft}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.tableScrollNavBtnText}>◀ Inicio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.tableScrollNavBtn}
                        onPress={scrollTableRight}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.tableScrollNavBtnText}>Acciones ▶</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    ref={bottomScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    onScroll={handleBottomScroll}
                    scrollEventThrottle={16}
                    style={styles.bottomScrollBar}
                    contentContainerStyle={{ width: 830, height: 14 }}
                >
                    <View style={{ width: 830, height: 14 }} />
                </ScrollView>
            </View>
        </>
    );
};
