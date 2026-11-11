// ==============================================================================
// ATELIER DIGITAL — SECCIÓN EDITORIAL: PERSONAS Y GRUPOS (ORQUESTADOR MODULAR)
// Archivo: src/components/clients/PersonGroupSection.tsx
// ==============================================================================
// Permite a la diseñadora administrar los sujetos anatómicos y agrupaciones
// pertenecientes a un cliente responsable (familia, escuela, empresa).
// Identidad visual de Alta Costura: Marfil, Negro Atelier, Champagne y Arena.
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Client } from '../../types/client';
import {
    DemographicCategory,
    MeasuredPerson,
} from '../../types/personGroup';
import { MeasurementSession } from '../../types/pattern/measurement';

// Subcomponentes Modulares y Hook de Negocio (Fase 1B)
import { styles } from './personGroup/personGroupStyles';
import { usePersonGroupSection } from './personGroup/usePersonGroupSection';
import { PersonGroupHeader } from './personGroup/PersonGroupHeader';
import { PersonFiltersBar } from './personGroup/PersonFiltersBar';
import { PersonCardsView } from './personGroup/PersonCardsView';
import { PersonTableView } from './personGroup/PersonTableView';
import { PersonPaginationBar } from './personGroup/PersonPaginationBar';
import { GroupsTabContent } from './personGroup/GroupsTabContent';
import { CampaignsTabContent } from './personGroup/CampaignsTabContent';
import { PersonGroupModals } from './personGroup/PersonGroupModals';

const DEMOGRAPHIC_AVATARS: Record<DemographicCategory, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
    baby: require('../../../assets/mannequin_baby_real.jpg'),
};

interface PersonGroupSectionProps {
    client: Client;
    onSessionCreated?: (session: MeasurementSession) => void;
    onViewPersonHistory?: (person: MeasuredPerson) => void;
}

export function PersonGroupSection({ client, onSessionCreated, onViewPersonHistory }: PersonGroupSectionProps) {
    const s = usePersonGroupSection({ client, onSessionCreated });

    return (
        <View style={styles.container}>
            {/* Cabecera Editorial y Acciones Principales */}
            <PersonGroupHeader
                filteredPersonsCount={s.filteredPersons.length}
                onOpenImport={() => s.setShowImportModal(true)}
                onOpenExport={() => s.setShowExportModal(true)}
                onOpenCreatePerson={s.handleOpenCreatePerson}
                onOpenCreateGroup={() => s.setShowGroupModal(true)}
                onOpenCreateCampaign={s.handleOpenCreateCampaign}
            />

            {/* Pestañas de Navegación Interna */}
            <View style={styles.subTabsRow}>
                <TouchableOpacity
                    style={[styles.subTabBtn, s.activeSubTab === 'persons' && styles.subTabBtnActive]}
                    onPress={() => s.setActiveSubTab('persons')}
                >
                    <Text style={[styles.subTabBtnText, s.activeSubTab === 'persons' && styles.subTabBtnTextActive]}>
                        👤 Personas Medidas ({s.persons.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.subTabBtn, s.activeSubTab === 'groups' && styles.subTabBtnActive]}
                    onPress={() => s.setActiveSubTab('groups')}
                >
                    <Text style={[styles.subTabBtnText, s.activeSubTab === 'groups' && styles.subTabBtnTextActive]}>
                        👥 Grupos y Núcleos ({s.groups.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.subTabBtn, s.activeSubTab === 'campaigns' && styles.subTabBtnActive]}
                    onPress={() => s.setActiveSubTab('campaigns')}
                >
                    <Text style={[styles.subTabBtnText, s.activeSubTab === 'campaigns' && styles.subTabBtnTextActive]}>
                        📅 Jornadas de Medición ({s.campaigns.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Contenido de la Subpestaña Activa */}
            {s.loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={styles.loadingText}>Cargando personas y núcleos del atelier...</Text>
                </View>
            ) : s.activeSubTab === 'persons' ? (
                s.loadingPersons ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.champagneGold} />
                        <Text style={styles.loadingText}>Cargando personas del atelier...</Text>
                    </View>
                ) : s.personsError ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateTitle}>Error al cargar personas</Text>
                        <Text style={styles.emptyStateDesc}>{s.personsError}</Text>
                        <TouchableOpacity style={styles.emptyStateBtn} onPress={s.retryPersons}>
                            <Text style={styles.emptyStateBtnText}>🔄 Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.editorialTableContainer}>
                        <PersonFiltersBar
                            searchQuery={s.searchQuery}
                            onSearchChange={s.handleSearchChange}
                            selectedStatusFilter={s.selectedStatusFilter}
                            onStatusFilterChange={s.handleStatusFilterChange}
                            selectedGroupFilter={s.selectedGroupFilter}
                            onGroupFilterChange={s.handleGroupFilterChange}
                            selectedCategoryFilter={s.selectedCategoryFilter}
                            onCategoryFilterChange={handleCategoryFilterChange => s.handleCategoryFilterChange(handleCategoryFilterChange)}
                            hasActiveFilters={s.hasActiveFilters}
                            onClearFilters={s.handleClearFilters}
                            groups={s.groups}
                            totalPersonsCount={s.persons.length}
                            totalFilteredCount={s.filteredPersons.length}
                            safeCurrentPage={s.safeCurrentPage}
                            pageSize={s.pageSize}
                            onPageSizeChange={s.handlePageSizeChange}
                            isMobileCards={s.isMobileCards}
                            onViewModeChange={s.setViewModeOverride}
                        />

                        {s.persons.length === 0 ? (
                            <View style={styles.emptyStateCard}>
                                <Text style={styles.emptyStateTitle}>Sin personas registradas aún</Text>
                                <Text style={styles.emptyStateDesc}>
                                    Este cliente aún no tiene personas o integrantes asociados. Registre integrantes individuales para tomarles medidas sin convertirlos en clientes comerciales.
                                </Text>
                                <TouchableOpacity style={styles.emptyStateBtn} onPress={s.handleOpenCreatePerson}>
                                    <Text style={styles.emptyStateBtnText}>+ Registrar Primera Persona</Text>
                                </TouchableOpacity>
                            </View>
                        ) : s.filteredPersons.length === 0 ? (
                            <View style={styles.emptyStateCard}>
                                <Text style={styles.emptyStateTitle}>No se encontraron personas</Text>
                                <Text style={styles.emptyStateDesc}>
                                    Ninguna persona coincide con los criterios de búsqueda o filtros seleccionados.
                                </Text>
                                <TouchableOpacity style={styles.emptyStateBtn} onPress={s.handleClearFilters}>
                                    <Text style={styles.emptyStateBtnText}>Restablecer Filtros</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {s.isMobileCards ? (
                                    <PersonCardsView
                                        persons={s.paginatedPersons}
                                        personToGroupMap={s.personToGroupMap}
                                        demographicAvatars={DEMOGRAPHIC_AVATARS}
                                        onMeasurePerson={(p) => s.setMeasuringPerson(p)}
                                        onViewPersonHistory={onViewPersonHistory}
                                        onCadPerson={(p) => s.setCadPerson(p)}
                                        onEditPerson={s.handleOpenEditPerson}
                                        onToggleActivePerson={s.handleToggleActivePerson}
                                    />
                                ) : (
                                    <PersonTableView
                                        persons={s.paginatedPersons}
                                        personToGroupMap={s.personToGroupMap}
                                        demographicAvatars={DEMOGRAPHIC_AVATARS}
                                        sortColumn={s.sortColumn}
                                        sortDirection={s.sortDirection}
                                        onSort={s.handleSort}
                                        onMeasurePerson={(p) => s.setMeasuringPerson(p)}
                                        onViewPersonHistory={onViewPersonHistory}
                                        onCadPerson={(p) => s.setCadPerson(p)}
                                        onEditPerson={s.handleOpenEditPerson}
                                        onToggleActivePerson={s.handleToggleActivePerson}
                                    />
                                )}

                                <PersonPaginationBar
                                    safeCurrentPage={s.safeCurrentPage}
                                    totalPages={s.totalPages}
                                    onPrevPage={() => s.setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    onNextPage={() => s.setCurrentPage((prev) => Math.min(s.totalPages, prev + 1))}
                                />
                            </>
                        )}
                    </View>
                )
            ) : s.activeSubTab === 'groups' ? (
                <GroupsTabContent
                    loading={s.loadingGroups}
                    error={s.groupsError}
                    groups={s.groups}
                    onRetry={s.retryGroups}
                    onCreateGroup={() => s.setShowGroupModal(true)}
                    onManageGroup={s.handleOpenManageGroup}
                />
            ) : (
                <CampaignsTabContent
                    loading={s.loadingCampaigns}
                    error={s.campaignsError}
                    campaigns={s.campaigns}
                    onRetry={s.retryCampaigns}
                    onCreateCampaign={s.handleOpenCreateCampaign}
                    onFastCapture={(camp) => s.setActiveFastCaptureCampaign(camp)}
                    onPrintSheet={s.handleOpenPrintCampaign}
                />
            )}

            {/* Contenedor de Todos los Modales Especializados */}
            <PersonGroupModals
                client={client}
                s={s}
                onSessionCreated={onSessionCreated}
            />
        </View>
    );
}
