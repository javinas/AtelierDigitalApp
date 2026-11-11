// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: PESTAÑA DE CONFECCIÓN Y PROYECTO OPERATIVO
// Archivo: src/components/commercial/ProjectExecutionTab.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Creation } from '../../types/creation';
import {
    CommercialProject,
    ProjectOperationalStatus,
} from '../../types/commercial';
import {
    createDirectProject,
    fetchProjectByCreation,
    updateProject,
} from '../../services/commercialService';
import { commercialStyles as styles } from './commercialStyles';

export interface ProjectExecutionTabProps {
    creation: Creation;
}

const STAGES: { id: ProjectOperationalStatus; label: string; desc: string; icon: string }[] = [
    { id: 'planning', label: '1. Planificación', desc: 'Acopio de telas y preparación', icon: '📋' },
    { id: 'cutting', label: '2. Trazado & Corte', desc: 'Mesa de corte según patrón CAD', icon: '✂️' },
    { id: 'assembly', label: '3. Armado & Hilván', desc: 'Estructura hilvanada a mano', icon: '🪡' },
    { id: 'first_fitting', label: '4. Primera Prueba', desc: 'Prueba de glasilla sobre clienta', icon: '👗' },
    { id: 'adjustments', label: '5. Ajustes de Calce', desc: 'Rectificación milimétrica', icon: '📐' },
    { id: 'second_fitting', label: '6. Segunda Prueba', desc: 'Caída y equilibrio final', icon: '✨' },
    { id: 'finishing', label: '7. Acabados a Mano', desc: 'Bordados, ojales sastre y forros', icon: '🪡' },
    { id: 'delivered', label: '8. Entrega Final', desc: 'Entrega a entera satisfacción', icon: '👑' },
];

const PRIORITY_LABELS: Record<'normal' | 'high' | 'urgent', { label: string; bg: string; color: string }> = {
    normal: { label: 'Normal', bg: '#F5F3EF', color: '#766B62' },
    high: { label: 'Alta Prioridad', bg: '#FFF8E7', color: '#B37D14' },
    urgent: { label: 'Urgente', bg: '#FAF2F2', color: '#9E3B3B' },
};

export const ProjectExecutionTab: React.FC<ProjectExecutionTabProps> = ({ creation }) => {
    const [project, setProject] = useState<CommercialProject | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    // Campos editables
    const [assignedTailor, setAssignedTailor] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

    const loadProject = async () => {
        setLoading(true);
        const { data } = await fetchProjectByCreation(creation.id);
        setProject(data);
        if (data) {
            setAssignedTailor(data.assigned_tailor || '');
            setDeliveryDate(data.estimated_delivery_date || '');
            setNotes(data.notes || '');
            setPriority(data.priority || 'normal');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (creation.id) {
            loadProject();
        }
    }, [creation.id]);

    const handleStartProject = async () => {
        setSaving(true);
        const { data, error } = await createDirectProject(creation.id, {
            priority: 'normal',
        });
        setSaving(false);

        if (error) {
            Alert.alert('Aviso', error);
        } else if (data) {
            setProject(data);
            setAssignedTailor(data.assigned_tailor || '');
            setDeliveryDate(data.estimated_delivery_date || '');
            setNotes(data.notes || '');
            setPriority(data.priority || 'normal');
        }
    };

    const handleUpdateStatus = async (newStatus: ProjectOperationalStatus) => {
        if (!project) return;
        setSaving(true);
        const { data, error } = await updateProject(project.id, {
            operational_status: newStatus,
            actual_delivery_date: newStatus === 'delivered' ? new Date().toISOString().split('T')[0] : null,
        });
        setSaving(false);

        if (error) {
            Alert.alert('Error', error);
        } else if (data) {
            setProject(data);
        }
    };

    const handleSaveOperationalDetails = async () => {
        if (!project) return;
        setSaving(true);
        const { data, error } = await updateProject(project.id, {
            assigned_tailor: assignedTailor.trim() || null,
            estimated_delivery_date: deliveryDate.trim() || null,
            notes: notes.trim() || null,
            priority,
        });
        setSaving(false);

        if (error) {
            Alert.alert('Error', error);
        } else if (data) {
            setProject(data);
            Alert.alert('Guardado', 'Los datos operativos del taller han sido actualizados.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.sectionCard, { alignItems: 'center', padding: 30 }]}>
                <ActivityIndicator size="small" color="#C5A880" />
                <Text style={{ marginTop: 10, color: '#8A7E72', fontSize: 13 }}>
                    Cargando estado operativo de confección...
                </Text>
            </View>
        );
    }

    if (!project) {
        return (
            <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                    <View>
                        <Text style={styles.sectionCardTitleGold}>CONFECCIÓN & PROYECTO OPERATIVO</Text>
                        <Text style={styles.sectionCardSubtitle}>
                            Seguimiento de corte, hilván, pruebas de taller y entrega final
                        </Text>
                    </View>
                </View>

                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateTitle}>Sin proyecto de taller activo</Text>
                    <Text style={styles.emptyStateText}>
                        Esta Creación aún no ha entrado a la fase de confección. Puede iniciarse formalmente al aceptar una cotización comercial o activarse directamente para comenzar el corte y armado en taller.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={handleStartProject}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#171411" />
                        ) : (
                            <Text style={styles.primaryGoldBtnText}>✂️ Iniciar Confección en Taller</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const currentStageIndex = STAGES.findIndex((s) => s.id === project.operational_status);
    const priorityConfig = PRIORITY_LABELS[project.priority] || PRIORITY_LABELS.normal;

    return (
        <View style={styles.sectionCard}>
            {/* Cabecera del Proyecto */}
            <View style={styles.sectionCardHeader}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.sectionCardTitle}>{project.project_code}</Text>
                        <View
                            style={[
                                styles.materialCategoryBadge,
                                { backgroundColor: priorityConfig.bg, borderColor: '#E6D9C8' },
                            ]}
                        >
                            <Text style={[styles.materialCategoryBadgeText, { color: priorityConfig.color }]}>
                                {priorityConfig.label.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.sectionCardSubtitle}>
                        Proyecto Operativo de Atelier · Creación: {creation.name}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.primaryGoldBtn}
                    onPress={handleSaveOperationalDetails}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#171411" />
                    ) : (
                        <Text style={styles.primaryGoldBtnText}>💾 Guardar Cambios</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Stepper de Etapas de Confección */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A7E72', textTransform: 'uppercase', marginBottom: 10 }}>
                    Etapa Actual del Taller ({currentStageIndex >= 0 ? currentStageIndex + 1 : 1} de {STAGES.length})
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
                    {STAGES.map((stg, idx) => {
                        const isCurrent = project.operational_status === stg.id;
                        const isPast = currentStageIndex > idx;

                        return (
                            <TouchableOpacity
                                key={stg.id}
                                style={{
                                    backgroundColor: isCurrent ? '#171411' : isPast ? '#F5EFE6' : '#FAF8F5',
                                    borderWidth: 1,
                                    borderColor: isCurrent ? '#171411' : isPast ? '#C5A880' : '#EFECE6',
                                    borderRadius: 10,
                                    paddingVertical: 10,
                                    paddingHorizontal: 12,
                                    minWidth: 130,
                                }}
                                onPress={() => handleUpdateStatus(stg.id)}
                            >
                                <Text style={{ fontSize: 13, marginBottom: 2 }}>{stg.icon}</Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: isCurrent ? '#FAF8F5' : isPast ? '#8A6A4A' : '#766B62',
                                    }}
                                >
                                    {stg.label}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 10,
                                        color: isCurrent ? '#C5A880' : '#A89E94',
                                        marginTop: 2,
                                    }}
                                    numberOfLines={1}
                                >
                                    {stg.desc}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Formulario de Asignación y Fechas */}
            <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formCol]}>
                    <Text style={styles.formLabel}>Sastre / Confeccionista Responsable</Text>
                    <TextInput
                        style={styles.formInput}
                        placeholder="Ej: Maestro Sastre Carlos Gómez"
                        value={assignedTailor}
                        onChangeText={setAssignedTailor}
                    />
                </View>
                <View style={[styles.formGroup, styles.formCol]}>
                    <Text style={styles.formLabel}>Fecha Estimada de Entrega (AAAA-MM-DD)</Text>
                    <TextInput
                        style={styles.formInput}
                        placeholder="2026-12-15"
                        value={deliveryDate}
                        onChangeText={setDeliveryDate}
                    />
                </View>
                <View style={[styles.formGroup, styles.formCol]}>
                    <Text style={styles.formLabel}>Prioridad de Taller</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                        {(['normal', 'high', 'urgent'] as const).map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.chipBtn,
                                    priority === p && styles.chipBtnActive,
                                    { paddingHorizontal: 8, paddingVertical: 5 },
                                ]}
                                onPress={() => setPriority(p)}
                            >
                                <Text
                                    style={[
                                        styles.chipBtnText,
                                        priority === p && styles.chipBtnTextActive,
                                        { fontSize: 11 },
                                    ]}
                                >
                                    {p === 'normal' ? 'Normal' : p === 'high' ? 'Alta' : 'Urgente'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* Bitácora de Observaciones de Confección */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bitácora de Observaciones Técnicas y Fitting de Confección</Text>
                <TextInput
                    style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={3}
                    placeholder="Detalles sobre caídas de tela, holguras verificadas en maniquí, refuerzos estructurales..."
                    value={notes}
                    onChangeText={setNotes}
                />
            </View>
        </View>
    );
};

