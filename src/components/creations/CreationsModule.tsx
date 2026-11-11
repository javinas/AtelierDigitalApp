// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MÓDULO DE CREACIONES (FASE 4 MODULARIZADO)
// Archivo: src/components/creations/CreationsModule.tsx
// ==============================================================================
// Gestiona el concepto nuclear de "Creación" de alta costura:
// Clienta → Creación → Medidas / Diseño → Patronaje CAD (Opcional) → Fitting → Aprobación
// ==============================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GarmentType } from '../../types/pattern/pattern';
import { PatternModule } from '../pattern/PatternModule';
import { styles } from './creationsModuleStyles';
import { CreationsModals } from './CreationsModals';
import { CreationDetailView } from './CreationDetailView';
import { CreationsListView } from './CreationsListView';
import { useCreationsState } from './useCreationsState';

export {
    CreationDetailTab,
    GARMENT_TYPE_LABELS,
    CREATION_EDITORIAL_IMAGES,
    DEFAULT_CREATION_IMAGE,
    getCreationPhoto,
    CreationStage,
    getCreationStages,
    STATUS_LABELS,
    TYPE_LABELS,
} from './creationsModel';

export interface CreationsModuleProps {
    onBack: () => void;
    titleBack?: string;
    initialCreationId?: string | null;
    onOpenClient?: (clientId: string) => void;
}

export function CreationsModule({
    onBack,
    titleBack = '← Volver al Atelier',
    initialCreationId,
    onOpenClient,
}: CreationsModuleProps) {
    const state = useCreationsState({ initialCreationId });
    const {
        isCadOpen,
        setIsCadOpen,
        selectedCreation,
        setSelectedCreation,
        openCreationDetail,
        statusMessage,
        setStatusMessage,
        handleOpenCreateModal,
        handleOpenEditModal,
        handleChangeStatus,
        detailActiveTab,
        setDetailActiveTab,
        setIsLinkSessionModalOpen,
        handleSelectSessionToLink,
        searchQuery,
        setSearchQuery,
        handleSearch,
        statusFilter,
        setStatusFilter,
        creations,
        loading,
        isCreateModalOpen,
        setIsCreateModalOpen,
        clients,
        formClientId,
        setFormClientId,
        loadingPersons,
        personsError,
        clientPersons,
        formPersonId,
        setFormPersonId,
        formName,
        setFormName,
        formCreationType,
        setFormCreationType,
        formOccasion,
        setFormOccasion,
        formTargetDate,
        setFormTargetDate,
        formGarmentType,
        setFormGarmentType,
        formDescription,
        setFormDescription,
        formNotes,
        setFormNotes,
        createModalError,
        formSubmitting,
        handleCreateCreation,
        isEditModalOpen,
        setIsEditModalOpen,
        handleSaveEdit,
        isLinkSessionModalOpen,
        loadingSessions,
        clientSessions,
    } = state;

    // Si el usuario abrió el Taller CAD para esta creación:
    if (isCadOpen && selectedCreation) {
        return (
            <PatternModule
                onBack={() => {
                    setIsCadOpen(false);
                    openCreationDetail(selectedCreation.id);
                }}
                titleBack={`← Volver a ${selectedCreation.name}`}
                initialClientId={selectedCreation.client_id}
                initialSessionId={selectedCreation.session_id || null}
                initialCreationId={selectedCreation.id}
                initialGarmentType={(selectedCreation.garment_type as GarmentType) || null}
            />
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Barra superior del Atelier (Nivel 1 — Cabecera Editorial) */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{titleBack}</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.superHeader}>ALTA COSTURA · GESTIÓN DE ENCARGOS</Text>
                    <Text style={styles.mainHeader}>Creaciones del Atelier</Text>
                </View>

                <TouchableOpacity
                    style={styles.newCreationBtn}
                    onPress={handleOpenCreateModal}
                    activeOpacity={0.85}
                >
                    <Text style={styles.newCreationBtnText}>+ Nueva Creación</Text>
                </TouchableOpacity>
            </View>

            {/* Notificación flotante */}
            {statusMessage && (
                <View
                    style={[
                        styles.toast,
                        statusMessage.type === 'success' && styles.toastSuccess,
                        statusMessage.type === 'error' && styles.toastError,
                        statusMessage.type === 'info' && styles.toastInfo,
                    ]}
                >
                    <Text style={styles.toastText}>{statusMessage.text}</Text>
                    <TouchableOpacity onPress={() => setStatusMessage(null)}>
                        <Text style={styles.toastClose}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* CUERPO PRINCIPAL: VISTA DE LISTA O VISTA DE DETALLE */}
            {selectedCreation ? (
                <CreationDetailView
                    selectedCreation={selectedCreation}
                    setSelectedCreation={setSelectedCreation}
                    handleOpenEditModal={handleOpenEditModal}
                    handleChangeStatus={handleChangeStatus}
                    onOpenClient={onOpenClient}
                    detailActiveTab={detailActiveTab}
                    setDetailActiveTab={setDetailActiveTab}
                    setIsLinkSessionModalOpen={setIsLinkSessionModalOpen}
                    handleSelectSessionToLink={handleSelectSessionToLink}
                    setIsCadOpen={setIsCadOpen}
                />
            ) : (
                <CreationsListView
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    handleSearch={handleSearch}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    creations={creations}
                    loading={loading}
                    handleOpenCreateModal={handleOpenCreateModal}
                    openCreationDetail={openCreationDetail}
                />
            )}

            {/* MODALES DE CREACIONES (MODULARIZADO Paso 4.2) */}
            <CreationsModals
                isCreateModalOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
                clients={clients}
                formClientId={formClientId}
                setFormClientId={setFormClientId}
                loadingPersons={loadingPersons}
                personsError={personsError}
                clientPersons={clientPersons}
                formPersonId={formPersonId}
                setFormPersonId={setFormPersonId}
                formName={formName}
                setFormName={setFormName}
                formCreationType={formCreationType}
                setFormCreationType={setFormCreationType}
                formOccasion={formOccasion}
                setFormOccasion={setFormOccasion}
                formTargetDate={formTargetDate}
                setFormTargetDate={setFormTargetDate}
                formGarmentType={formGarmentType}
                setFormGarmentType={setFormGarmentType}
                formDescription={formDescription}
                setFormDescription={setFormDescription}
                formNotes={formNotes}
                setFormNotes={setFormNotes}
                createModalError={createModalError}
                formSubmitting={formSubmitting}
                handleCreateCreation={handleCreateCreation}
                isEditModalOpen={isEditModalOpen}
                setIsEditModalOpen={setIsEditModalOpen}
                handleSaveEdit={handleSaveEdit}
                isLinkSessionModalOpen={isLinkSessionModalOpen}
                setIsLinkSessionModalOpen={setIsLinkSessionModalOpen}
                selectedCreation={selectedCreation}
                loadingSessions={loadingSessions}
                clientSessions={clientSessions}
                handleSelectSessionToLink={handleSelectSessionToLink}
            />
        </View>
    );
}
