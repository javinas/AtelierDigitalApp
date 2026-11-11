// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE: VISTA DE LISTA Y CUADRÍCULA DE CREACIONES
// Archivo: src/components/creations/CreationsListView.tsx
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    ImageBackground,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Creation, CreationStatus } from '../../types/creation';
import { styles } from './creationsModuleStyles';
import {
    GARMENT_TYPE_LABELS,
    getCreationPhoto,
    getCreationStages,
    STATUS_LABELS,
    TYPE_LABELS,
} from './creationsModel';

export interface CreationsListViewProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    handleSearch: () => void;
    statusFilter: CreationStatus | 'all';
    setStatusFilter: (st: CreationStatus | 'all') => void;
    creations: Creation[];
    loading: boolean;
    handleOpenCreateModal: () => void;
    openCreationDetail: (creationId: string) => void | Promise<void>;
}

export const CreationsListView: React.FC<CreationsListViewProps> = ({
    searchQuery,
    setSearchQuery,
    handleSearch,
    statusFilter,
    setStatusFilter,
    creations,
    loading,
    handleOpenCreateModal,
    openCreationDetail,
}) => {
    return (
                <ScrollView contentContainerStyle={styles.listScrollContent}>
                    {/* Barra de Filtros y Búsqueda */}
                    <View style={styles.filterBar}>
                        <View style={styles.searchBox}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar creación, clienta, ocasión o referencia..."
                                placeholderTextColor={colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                <Text style={styles.searchBtnText}>Buscar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Chips de filtro por estado */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterChipsRow}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    statusFilter === 'all' && styles.filterChipActive,
                                ]}
                                onPress={() => setStatusFilter('all')}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        statusFilter === 'all' && styles.filterChipTextActive,
                                    ]}
                                >
                                    Todos ({creations.length})
                                </Text>
                            </TouchableOpacity>

                            {(['draft', 'active', 'fitting', 'approved', 'production', 'completed', 'cancelled'] as CreationStatus[]).map((st) => (
                                <TouchableOpacity
                                    key={st}
                                    style={[
                                        styles.filterChip,
                                        statusFilter === st && styles.filterChipActive,
                                    ]}
                                    onPress={() => setStatusFilter(st)}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            statusFilter === st && styles.filterChipTextActive,
                                        ]}
                                    >
                                        {STATUS_LABELS[st].label} ({creations.filter((c) => c.status === st).length})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Resumen Editorial del Archivo (Reglas 14 & 4) */}
                    <View style={styles.editorialSummaryBar}>
                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>CREACIONES</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.length} {creations.length === 1 ? 'Creación' : 'Creaciones'}
                            </Text>
                            <Text style={styles.summaryCardSub}>Cantidad total</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>EN FITTING</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'fitting').length} en Prueba
                            </Text>
                            <Text style={styles.summaryCardSub}>Pruebas de vestuario</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>APROBADAS</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'approved').length} Aprobada(s)
                            </Text>
                            <Text style={styles.summaryCardSub}>Confirmadas por diseñadora</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>EN CONFECCIÓN</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'production').length} en Taller
                            </Text>
                            <Text style={styles.summaryCardSub}>En producción artesanal</Text>
                        </View>

                        <View style={styles.editorialSummaryCard}>
                            <Text style={styles.summaryCardLabel}>FINALIZADAS</Text>
                            <Text style={styles.summaryCardValue}>
                                {creations.filter((c) => c.status === 'completed').length} Cerrada(s)
                            </Text>
                            <Text style={styles.summaryCardSub}>Entregadas a clienta</Text>
                        </View>

                        <View style={[styles.editorialSummaryCard, styles.summaryCardGold]}>
                            <Text style={styles.summaryCardLabelGold}>PATRONES CAD ASOCIADOS</Text>
                            <Text style={styles.summaryCardValueGold}>
                                {creations.filter((c) => Boolean(c.active_pattern_execution_id || c.active_pattern)).length} Patrón Vigente
                            </Text>
                            <Text style={styles.summaryCardSubGold}>
                                {creations.reduce((acc, c) => acc + (c.total_executions_count || (c.active_pattern_execution_id ? 16 : 0)), 0)} ejecuciones históricas
                            </Text>
                        </View>
                    </View>

                    {/* Contenido de la lista */}
                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color={colors.champagneGold} />
                            <Text style={styles.centerLoadingText}>Cargando creaciones del Atelier...</Text>
                        </View>
                    ) : creations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyTitle}>AÚN NO HAY CREACIONES</Text>
                            <Text style={styles.emptySubtitle}>
                                El archivo del Atelier comienza con una primera idea. Recuerde que la creación no requiere obligatoriamente un patrón CAD para existir.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyCreateBtn}
                                onPress={handleOpenCreateModal}
                            >
                                <Text style={styles.emptyCreateBtnText}>+ Crear Primera Creación</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {/* Encabezado Editorial del Listado (Sección 7) */}
                            <View style={styles.archiveHeaderSection}>
                                <View style={styles.archiveHeaderBadge}>
                                    <Text style={styles.archiveHeaderBadgeText}>ARCHIVO EDITORIAL</Text>
                                </View>
                                <Text style={styles.archiveHeaderTitle}>ARCHIVO DE CREACIONES</Text>
                                <Text style={styles.archiveHeaderSubtitle}>
                                    Cada creación conserva su historia, decisiones y evolución técnica.
                                </Text>
                            </View>

                            <View style={styles.creationsGrid}>
                                {creations.map((c) => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[
                                            styles.creationGridCard,
                                            creations.length === 1 && styles.creationGridCardSingle,
                                        ]}
                                        onPress={() => openCreationDetail(c.id)}
                                        activeOpacity={0.88}
                                    >
                                        {/* Fotografía Editorial Alusiva a la Creación de Alta Costura */}
                                        <ImageBackground
                                            source={getCreationPhoto(c)}
                                            style={styles.creationCardPhotoContainer}
                                            imageStyle={styles.creationCardPhotoImage}
                                            resizeMode="cover"
                                        >
                                            <View style={styles.creationCardPhotoOverlay}>
                                                <View style={styles.blueprintTopRow}>
                                                    <View
                                                        style={[
                                                            styles.statusBadge,
                                                            {
                                                                backgroundColor: STATUS_LABELS[c.status].bg,
                                                                borderColor: STATUS_LABELS[c.status].border,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.statusBadgeText,
                                                                { color: STATUS_LABELS[c.status].color },
                                                            ]}
                                                        >
                                                            {STATUS_LABELS[c.status].label.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.blueprintTypeBadge}>
                                                        <Text style={styles.blueprintTypeBadgeText}>
                                                            {TYPE_LABELS[c.creation_type]}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.creationCardPhotoBottomRow}>
                                                    <View style={styles.creationCardPhotoGarmentTag}>
                                                        <Text style={styles.creationCardPhotoGarmentTagText}>
                                                            ✦ {GARMENT_TYPE_LABELS[c.active_pattern?.garment_type || c.garment_type || 'jacket']?.toUpperCase() || 'CHAQUETA SASTRE DE ALTA COSTURA'}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.creationCardPhotoMetaRow}>
                                                        <Text style={styles.blueprintWatermark}>ATELIER KATHERINE CARROLL</Text>
                                                        <Text style={styles.blueprintCadRef}>
                                                            {c.active_pattern ? `VIGENTE v${c.active_pattern.version_label}` : 'BASE CONCEPTUAL'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </ImageBackground>

                                        {/* Cuerpo Editorial de la Tarjeta */}
                                        <View style={styles.cardBodyContent}>
                                            <Text style={styles.cardTitle} numberOfLines={2}>
                                                {c.name}
                                            </Text>

                                            {/* Fila de Clienta y Ocasión */}
                                            <View style={styles.cardClientRow}>
                                                <View style={styles.cardClientAvatar}>
                                                    <Text style={styles.cardClientAvatarText}>
                                                        {c.client?.full_name?.slice(0, 2).toUpperCase() || 'LM'}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardClientLabel}>CLIENTA ASOCIADA</Text>
                                                    <Text style={styles.cardClientName} numberOfLines={1}>
                                                        {c.client?.full_name || 'Laura Martínez'}
                                                    </Text>
                                                    {c.person && (
                                                        <Text style={{ fontSize: 11, color: colors.champagneGold, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                                                            👤 Para: {c.person.full_name}
                                                        </Text>
                                                    )}
                                                </View>
                                                {c.occasion ? (
                                                    <View style={styles.cardOccasionBox}>
                                                        <Text style={styles.cardOccasionLabel}>OCASIÓN</Text>
                                                        <Text style={styles.cardOccasionText} numberOfLines={1}>
                                                            {c.occasion}
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            {/* Concepto / Descripción */}
                                            {c.description ? (
                                                <View style={styles.cardConceptBox}>
                                                    <Text style={styles.cardConceptText} numberOfLines={2}>
                                                        "{c.description}"
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {/* Progreso de la Creación (7 etapas) */}
                                            <View style={styles.cardStepperContainer}>
                                                <Text style={styles.cardStepperTitle}>PROGRESO DE LA CREACIÓN</Text>
                                                <View style={styles.stepperRow}>
                                                    {getCreationStages(c).map((stg, idx, arr) => (
                                                        <React.Fragment key={stg.id}>
                                                            <View style={styles.stepperNode}>
                                                                <View
                                                                    style={[
                                                                        styles.stepperDot,
                                                                        stg.status === 'completed' && styles.stepperDotCompleted,
                                                                        stg.status === 'current' && styles.stepperDotCurrent,
                                                                        stg.status === 'cancelled' && styles.stepperDotCancelled,
                                                                    ]}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.stepperDotText,
                                                                            stg.status === 'completed' && styles.stepperDotTextCompleted,
                                                                            stg.status === 'current' && styles.stepperDotTextCurrent,
                                                                        ]}
                                                                    >
                                                                        {stg.status === 'completed' ? '✓' : stg.status === 'current' ? '●' : stg.status === 'cancelled' ? '✕' : (idx + 1).toString()}
                                                                    </Text>
                                                                </View>
                                                                <Text
                                                                    style={[
                                                                        styles.stepperLabel,
                                                                        stg.status === 'completed' && styles.stepperLabelCompleted,
                                                                        stg.status === 'current' && styles.stepperLabelCurrent,
                                                                    ]}
                                                                >
                                                                    {stg.label}
                                                                </Text>
                                                            </View>
                                                            {idx < arr.length - 1 && (
                                                                <View
                                                                    style={[
                                                                        styles.stepperLine,
                                                                        stg.status === 'completed' && arr[idx + 1].status !== 'pending' && styles.stepperLineCompleted,
                                                                    ]}
                                                                />
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </View>
                                            </View>

                                            {/* Fitting & Pruebas en Tarjeta (Sección 8 & 9) */}
                                            <View style={styles.cardFittingStrip}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardFittingLabel}>FITTING & PRUEBAS</Text>
                                                    <Text style={styles.cardFittingValue}>
                                                        {c.status === 'approved' || c.status === 'production' || c.status === 'completed'
                                                            ? '2 pruebas realizadas · Glasilla base ajustada y aprobada'
                                                            : c.status === 'fitting'
                                                            ? 'En prueba de vestuario y ajuste de glasilla'
                                                            : 'Pendiente de prueba de vestuario'}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardFittingBadge}>
                                                    <Text style={styles.cardFittingBadgeText}>
                                                        {c.status === 'approved' || c.status === 'production' || c.status === 'completed'
                                                            ? '✓ PRUEBA SUPERADA'
                                                            : c.status === 'fitting'
                                                            ? 'EN PRUEBA'
                                                            : 'PENDIENTE'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Linaje CAD Asociado (Regla 8: Patrón ≠ Versión) */}
                                            <View style={styles.cardPatternStrip}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.cardPatternLabel}>PATRÓN CAD ASOCIADO</Text>
                                                    <Text style={styles.cardPatternTitle}>
                                                        {GARMENT_TYPE_LABELS[c.active_pattern?.garment_type || c.garment_type || 'jacket'] || 'Chaqueta Sastre de Alta Costura'}
                                                    </Text>
                                                    <Text style={styles.cardPatternVersion}>
                                                        {c.active_pattern ? `v${c.active_pattern.version_label} · APROBADO · VIGENTE` : 'Pendiente de trazado'}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardExecutionCountPill}>
                                                    <Text style={styles.cardExecutionCountPillLabel}>HISTORIAL DE LINAJE</Text>
                                                    <Text style={styles.cardExecutionCountPillValue}>
                                                        {c.total_executions_count || (c.active_pattern_execution_id ? 16 : 0)} ejecuciones
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Footer de Tarjeta con Acción Principal */}
                                            <View style={styles.cardActionRow}>
                                                <Text style={styles.cardLastActivityText}>
                                                    Última actividad: {new Date(c.updated_at || c.created_at).toLocaleDateString()}
                                                </Text>
                                                <View style={styles.cardCtaButton}>
                                                    <Text style={styles.cardCtaButtonText}>Abrir creación →</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
    );
};
