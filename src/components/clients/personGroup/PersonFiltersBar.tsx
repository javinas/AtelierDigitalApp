// ==============================================================================
// BARRA DE FILTROS, BÚSQUEDA Y PAGINACIÓN DE PERSONAS
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import {
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    DemographicCategory,
    DEMOGRAPHIC_LABELS,
    MeasurementGroup,
} from '../../../types/personGroup';
import { styles } from './personGroupStyles';

interface PersonFiltersBarProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    selectedStatusFilter: string;
    onStatusFilterChange: (status: string) => void;
    selectedGroupFilter: string;
    onGroupFilterChange: (groupId: string) => void;
    selectedCategoryFilter: string;
    onCategoryFilterChange: (category: string) => void;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    groups: MeasurementGroup[];
    totalPersonsCount: number;
    totalFilteredCount: number;
    safeCurrentPage: number;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    isMobileCards: boolean;
    onViewModeChange: (mode: 'table' | 'cards') => void;
}

export const PersonFiltersBar: React.FC<PersonFiltersBarProps> = ({
    searchQuery,
    onSearchChange,
    selectedStatusFilter,
    onStatusFilterChange,
    selectedGroupFilter,
    onGroupFilterChange,
    selectedCategoryFilter,
    onCategoryFilterChange,
    hasActiveFilters,
    onClearFilters,
    groups,
    totalPersonsCount,
    totalFilteredCount,
    safeCurrentPage,
    pageSize,
    onPageSizeChange,
    isMobileCards,
    onViewModeChange,
}) => {
    return (
        <View style={styles.toolbarCard}>
            {/* Fila 1: Buscador y Filtro Rápido de Estado */}
            <View style={styles.searchBarRow}>
                <View style={styles.searchInputWrap}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nombre o referencia..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={onSearchChange}
                    />
                    {Boolean(searchQuery) && (
                        <TouchableOpacity
                            style={styles.searchClearBtn}
                            onPress={() => onSearchChange('')}
                        >
                            <Text style={styles.searchClearBtnText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filtro rápido de Estado en la misma fila */}
                <View style={styles.quickStatusWrap}>
                    <TouchableOpacity
                        style={[styles.filterPill, selectedStatusFilter === 'all' && styles.filterPillActive]}
                        onPress={() => onStatusFilterChange('all')}
                    >
                        <Text style={[styles.filterPillText, selectedStatusFilter === 'all' && styles.filterPillTextActive]}>
                            Todos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, selectedStatusFilter === 'draft' && styles.filterPillActive]}
                        onPress={() => onStatusFilterChange('draft')}
                    >
                        <Text style={[styles.filterPillText, selectedStatusFilter === 'draft' && styles.filterPillTextActive]}>
                            ⏳ Borrador
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, selectedStatusFilter === 'verified' && styles.filterPillActive]}
                        onPress={() => onStatusFilterChange('verified')}
                    >
                        <Text style={[styles.filterPillText, selectedStatusFilter === 'verified' && styles.filterPillTextActive]}>
                            ✅ Verificada
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, selectedStatusFilter === 'completed' && styles.filterPillActive]}
                        onPress={() => onStatusFilterChange('completed')}
                    >
                        <Text style={[styles.filterPillText, selectedStatusFilter === 'completed' && styles.filterPillTextActive]}>
                            🛡️ Finalizada
                        </Text>
                    </TouchableOpacity>
                </View>

                {hasActiveFilters && (
                    <TouchableOpacity
                        style={styles.clearAllFiltersBtn}
                        onPress={onClearFilters}
                    >
                        <Text style={styles.clearAllFiltersText}>Limpiar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Fila 2: Filtros Compactos Facetados (Grupo y Categoría) */}
            <View style={styles.compactFiltersRow}>
                {/* Filtro de Grupo */}
                <View style={styles.filterInlineGroup}>
                    <Text style={styles.filterInlineLabel}>GRUPO:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlinePillsScroll}>
                        <TouchableOpacity
                            style={[styles.filterPillCompact, selectedGroupFilter === 'all' && styles.filterPillActive]}
                            onPress={() => onGroupFilterChange('all')}
                        >
                            <Text style={[styles.filterPillText, selectedGroupFilter === 'all' && styles.filterPillTextActive]}>
                                Todos ({totalPersonsCount})
                            </Text>
                        </TouchableOpacity>
                        {groups.map((g) => (
                            <TouchableOpacity
                                key={g.id}
                                style={[styles.filterPillCompact, selectedGroupFilter === g.id && styles.filterPillActive]}
                                onPress={() => onGroupFilterChange(g.id)}
                            >
                                <Text style={[styles.filterPillText, selectedGroupFilter === g.id && styles.filterPillTextActive]}>
                                    {g.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.filterPillCompact, selectedGroupFilter === 'none' && styles.filterPillActive]}
                            onPress={() => onGroupFilterChange('none')}
                        >
                            <Text style={[styles.filterPillText, selectedGroupFilter === 'none' && styles.filterPillTextActive]}>
                                Sin grupo
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Filtro Demográfico */}
                <View style={styles.filterInlineGroup}>
                    <Text style={styles.filterInlineLabel}>CATEGORÍA:</Text>
                    <View style={styles.inlinePillsWrap}>
                        <TouchableOpacity
                            style={[styles.filterPillCompact, selectedCategoryFilter === 'all' && styles.filterPillActive]}
                            onPress={() => onCategoryFilterChange('all')}
                        >
                            <Text style={[styles.filterPillText, selectedCategoryFilter === 'all' && styles.filterPillTextActive]}>
                                Todas
                            </Text>
                        </TouchableOpacity>
                        {(['woman', 'man', 'girl', 'boy', 'baby'] as DemographicCategory[]).map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.filterPillCompact, selectedCategoryFilter === cat && styles.filterPillActive]}
                                onPress={() => onCategoryFilterChange(cat)}
                            >
                                <Text style={[styles.filterPillText, selectedCategoryFilter === cat && styles.filterPillTextActive]}>
                                    {DEMOGRAPHIC_LABELS[cat].split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* BARRA DE ESTADÍSTICAS Y RESUMEN */}
            <View style={styles.tableMetaHeader}>
                <Text style={styles.tableMetaCount}>
                    Mostrando {Math.min((safeCurrentPage - 1) * pageSize + 1, totalFilteredCount)}–{Math.min(safeCurrentPage * pageSize, totalFilteredCount)} de {totalFilteredCount} personas
                    {totalFilteredCount !== totalPersonsCount && ` (filtradas de ${totalPersonsCount})`}
                </Text>

                <View style={styles.pageSizeRow}>
                    {/* Selector de modo de visualización: Tabla vs Fichas */}
                    <View style={styles.viewModeToggleGroup}>
                        <TouchableOpacity
                            style={[styles.viewModeBtn, !isMobileCards && styles.viewModeBtnActive]}
                            onPress={() => onViewModeChange('table')}
                            activeOpacity={0.8}
                            accessibilityLabel="Vista en Tabla con columnas"
                            {...Platform.select({ web: { title: 'Ver como tabla con ordenamiento por columnas' } as any })}
                        >
                            <Text style={[styles.viewModeBtnText, !isMobileCards && styles.viewModeBtnTextActive]}>📋 Tabla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.viewModeBtn, isMobileCards && styles.viewModeBtnActive]}
                            onPress={() => onViewModeChange('cards')}
                            activeOpacity={0.8}
                            accessibilityLabel="Vista en Fichas completas"
                            {...Platform.select({ web: { title: 'Ver como fichas completas para tablet/móvil' } as any })}
                        >
                            <Text style={[styles.viewModeBtnText, isMobileCards && styles.viewModeBtnTextActive]}>🗂️ Fichas</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.pageSizeLabel}>Por página:</Text>
                    {[25, 50, 100].map((size) => (
                        <TouchableOpacity
                            key={size}
                            style={[styles.pageSizePill, pageSize === size && styles.pageSizePillActive]}
                            onPress={() => onPageSizeChange(size)}
                        >
                            <Text style={[styles.pageSizePillText, pageSize === size && styles.pageSizePillTextActive]}>
                                {size}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};
