// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE: MODALES DE CREACIONES
// Archivo: src/components/creations/CreationsModals.tsx
// ==============================================================================

import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { colors } from '../../theme/colors';
import { Client } from '../../types/client';
import { Creation, CreationType } from '../../types/creation';
import { MeasurementSession } from '../../types/pattern/measurement';
import { GarmentType } from '../../types/pattern/pattern';
import { MeasuredPerson } from '../../types/personGroup';
import { styles } from './creationsModuleStyles';
import { TYPE_LABELS } from './creationsModel';
export { TYPE_LABELS };

export interface CreationsModalsProps {
    // Modal 1: Crear
    isCreateModalOpen: boolean;
    setIsCreateModalOpen: (open: boolean) => void;
    clients: Client[];
    formClientId: string;
    setFormClientId: (id: string) => void;
    loadingPersons: boolean;
    personsError: string | null;
    clientPersons: MeasuredPerson[];
    formPersonId: string | null;
    setFormPersonId: (id: string | null) => void;
    formName: string;
    setFormName: (val: string) => void;
    formCreationType: CreationType;
    setFormCreationType: (val: CreationType) => void;
    formOccasion: string;
    setFormOccasion: (val: string) => void;
    formTargetDate: string;
    setFormTargetDate: (val: string) => void;
    formGarmentType: GarmentType | '';
    setFormGarmentType: (val: GarmentType | '') => void;
    formDescription: string;
    setFormDescription: (val: string) => void;
    formNotes: string;
    setFormNotes: (val: string) => void;
    createModalError: string | null;
    formSubmitting: boolean;
    handleCreateCreation: () => void;

    // Modal 2: Editar
    isEditModalOpen: boolean;
    setIsEditModalOpen: (open: boolean) => void;
    handleSaveEdit: () => void;

    // Modal 3: Vincular Sesión
    isLinkSessionModalOpen: boolean;
    setIsLinkSessionModalOpen: (open: boolean) => void;
    selectedCreation: Creation | null;
    loadingSessions: boolean;
    clientSessions: MeasurementSession[];
    handleSelectSessionToLink: (sessionId: string) => void;
}

export const CreationsModals: React.FC<CreationsModalsProps> = ({
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
    setIsLinkSessionModalOpen,
    selectedCreation,
    loadingSessions,
    clientSessions,
    handleSelectSessionToLink,
}) => {
    return (
        <>
            {/* MODAL 1: CREAR NUEVA CREACIÓN */}
            <Modal
                visible={isCreateModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsCreateModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>+ Nueva Creación de Alta Costura</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalFormContent}>
                            {/* Selector de Clienta */}
                            <Text style={styles.formLabel}>Clienta * (Obligatoria)</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.clientSelectorScroll}
                            >
                                {clients.map((cli) => (
                                    <TouchableOpacity
                                        key={cli.id}
                                        style={[
                                            styles.clientSelectChip,
                                            formClientId === cli.id && styles.clientSelectChipActive,
                                        ]}
                                        onPress={() => setFormClientId(cli.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.clientSelectChipText,
                                                formClientId === cli.id && styles.clientSelectChipTextActive,
                                            ]}
                                        >
                                            {cli.full_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Selector opcional: ¿Para quién es la prenda? (Personas asociadas a la clienta) */}
                            <View style={styles.personSelectorSection}>
                                <Text style={styles.formLabel}>¿Para quién es la prenda? (Opcional)</Text>
                                {loadingPersons ? (
                                    <View style={styles.personLoadingRow}>
                                        <ActivityIndicator size="small" color={colors.champagneGold} />
                                        <Text style={styles.personLoadingText}>Cargando personas asociadas...</Text>
                                    </View>
                                ) : personsError ? (
                                    <Text style={styles.personErrorText}>{personsError}</Text>
                                ) : (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.clientSelectorScroll}
                                    >
                                        {/* Opción 1: Clienta Titular / Sin persona específica */}
                                        <TouchableOpacity
                                            style={[
                                                styles.personSelectChip,
                                                formPersonId === null && styles.personSelectChipActive,
                                            ]}
                                            onPress={() => setFormPersonId(null)}
                                        >
                                            <Text
                                                style={[
                                                    styles.personSelectChipText,
                                                    formPersonId === null && styles.personSelectChipTextActive,
                                                ]}
                                            >
                                                👤 Para la Clienta Titular
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Opción 2..N: Personas físicas registradas bajo esta clienta */}
                                        {clientPersons.map((p) => {
                                            const isSelected = formPersonId === p.id;
                                            return (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={[
                                                        styles.personSelectChip,
                                                        isSelected && styles.personSelectChipActive,
                                                    ]}
                                                    onPress={() => setFormPersonId(p.id)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.personSelectChipText,
                                                            isSelected && styles.personSelectChipTextActive,
                                                        ]}
                                                    >
                                                        {p.full_name} ({p.demographic_category})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                                {!loadingPersons && clientPersons.length === 0 && !personsError && (
                                    <Text style={styles.personEmptyHint}>
                                        Sin personas adicionales registradas para esta clienta. Se asignará directamente a su perfil titular.
                                    </Text>
                                )}
                            </View>

                            {/* Nombre / Título de la creación */}
                            <Text style={styles.formLabel}>Nombre del Encargo / Creación *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Ej: Vestido de Gala en Terciopelo y Seda"
                                placeholderTextColor={colors.textMuted}
                                value={formName}
                                onChangeText={setFormName}
                            />

                            {/* Tipo de Creación */}
                            <Text style={styles.formLabel}>Tipo de Creación</Text>
                            <View style={styles.formChipsRow}>
                                {(Object.keys(TYPE_LABELS) as CreationType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.typeChip,
                                            formCreationType === t && styles.typeChipActive,
                                        ]}
                                        onPress={() => setFormCreationType(t)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeChipText,
                                                formCreationType === t && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {TYPE_LABELS[t]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Ocasión y Fecha Objetivo */}
                            <View style={styles.formTwoCols}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.formLabel}>Ocasión / Evento</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Ej: Boda en Cartagena"
                                        placeholderTextColor={colors.textMuted}
                                        value={formOccasion}
                                        onChangeText={setFormOccasion}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.formLabel}>Fecha Objetivo</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="AAAA-MM-DD"
                                        placeholderTextColor={colors.textMuted}
                                        value={formTargetDate}
                                        onChangeText={setFormTargetDate}
                                    />
                                </View>
                            </View>

                            {/* Prenda base sugerida */}
                            <Text style={styles.formLabel}>Prenda Base Sugerida (Opcional)</Text>
                            <View style={styles.formChipsRow}>
                                {Object.entries(GARMENT_PACKAGES).map(([k, pkg]) => (
                                    <TouchableOpacity
                                        key={k}
                                        style={[
                                            styles.typeChip,
                                            formGarmentType === k && styles.typeChipActive,
                                        ]}
                                        onPress={() => setFormGarmentType(k as GarmentType)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeChipText,
                                                formGarmentType === k && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {pkg.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Descripción y concepto */}
                            <Text style={styles.formLabel}>Descripción y Concepto Artístico</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                placeholder="Silueta deseada, detalles del diseño, caídas, estilo..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={3}
                                value={formDescription}
                                onChangeText={setFormDescription}
                            />

                            {/* Notas de diseño */}
                            <Text style={styles.formLabel}>Notas Técnicas & Observaciones</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                placeholder="Anotaciones de atelier, especificaciones y orientaciones..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={3}
                                value={formNotes}
                                onChangeText={setFormNotes}
                            />

                            {/* Alerta de error en el modal */}
                            {createModalError && (
                                <View style={styles.modalErrorBanner}>
                                    <Text style={styles.modalErrorText}>⚠️ {createModalError}</Text>
                                </View>
                            )}

                            {/* Botones de acción */}
                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsCreateModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleCreateCreation}
                                    disabled={formSubmitting}
                                >
                                    {formSubmitting ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Guardar Creación</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL 2: EDITAR CREACIÓN */}
            <Modal
                visible={isEditModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsEditModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>✎ Editar Creación</Text>
                            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalFormContent}>
                            <Text style={styles.formLabel}>Nombre de la Creación *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formName}
                                onChangeText={setFormName}
                            />

                            <Text style={styles.formLabel}>Tipo de Creación</Text>
                            <View style={styles.formChipsRow}>
                                {(Object.keys(TYPE_LABELS) as CreationType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.typeChip,
                                            formCreationType === t && styles.typeChipActive,
                                        ]}
                                        onPress={() => setFormCreationType(t)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeChipText,
                                                formCreationType === t && styles.typeChipTextActive,
                                            ]}
                                        >
                                            {TYPE_LABELS[t]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.formTwoCols}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.formLabel}>Ocasión</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={formOccasion}
                                        onChangeText={setFormOccasion}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.formLabel}>Fecha Objetivo</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={formTargetDate}
                                        onChangeText={setFormTargetDate}
                                    />
                                </View>
                            </View>

                            <Text style={styles.formLabel}>Descripción y Concepto</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                multiline
                                numberOfLines={3}
                                value={formDescription}
                                onChangeText={setFormDescription}
                            />

                            <Text style={styles.formLabel}>Notas de Diseño & Taller</Text>
                            <TextInput
                                style={[styles.formInput, styles.formTextArea]}
                                multiline
                                numberOfLines={3}
                                value={formNotes}
                                onChangeText={setFormNotes}
                            />

                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsEditModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleSaveEdit}
                                    disabled={formSubmitting}
                                >
                                    {formSubmitting ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Actualizar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL 3: VINCULAR SESIÓN DE MEDIDAS */}
            <Modal
                visible={isLinkSessionModalOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsLinkSessionModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Vincular Sesión de Medidas</Text>
                            <TouchableOpacity onPress={() => setIsLinkSessionModalOpen(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 20 }}>
                            <Text style={styles.modalSubtitle}>
                                Seleccione la sesión de medidas de {selectedCreation?.client?.full_name} que servirá como base anatómica para este encargo.
                            </Text>

                            {loadingSessions ? (
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            ) : clientSessions.length === 0 ? (
                                <View style={styles.emptySessionInModal}>
                                    <Text style={styles.emptySessionInModalText}>
                                        Esta clienta no tiene sesiones de medidas guardadas en el historial.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView style={{ maxHeight: 300, marginTop: 12 }}>
                                    {clientSessions.map((s) => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={[
                                                styles.sessionChoiceCard,
                                                selectedCreation?.session_id === s.id && styles.sessionChoiceCardActive,
                                            ]}
                                            onPress={() => handleSelectSessionToLink(s.id)}
                                        >
                                            <View>
                                                <Text style={styles.sessionChoiceTitle}>
                                                    Sesión v{s.version_number} ({s.status.toUpperCase()})
                                                </Text>
                                                <Text style={styles.sessionChoiceDate}>
                                                    Fecha: {new Date(s.session_date).toLocaleDateString()} · {s.unit_system === 'in' ? 'Imperial (pulgadas)' : 'Métrico (cm)'}
                                                </Text>
                                            </View>
                                            {selectedCreation?.session_id === s.id && (
                                                <Text style={styles.sessionChoiceSelectedBadge}>✓ Activa</Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsLinkSessionModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cerrar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};
