// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: BITÁCORA EDITORIAL Y TRAZABILIDAD COMERCIAL
// Archivo: src/components/commercial/CreationLogbookTab.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Creation } from '../../types/creation';
import { CommercialEvent } from '../../types/commercial';
import {
    fetchCommercialEventsByCreation,
    recordCommercialEvent,
} from '../../services/commercialService';
import { commercialStyles as styles } from './commercialStyles';

export interface CreationLogbookTabProps {
    creation: Creation;
}

interface TimelineItem {
    id: string;
    date: string;
    title: string;
    description?: string | null;
    badge: string;
    icon: string;
    isMilestone?: boolean;
}

export const CreationLogbookTab: React.FC<CreationLogbookTabProps> = ({ creation }) => {
    const [events, setEvents] = useState<CommercialEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // Formulario de nuevo evento
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [eventType, setEventType] = useState<string>('decision');
    const [formError, setFormError] = useState<string | null>(null);

    const loadEvents = async () => {
        setLoading(true);
        const { data } = await fetchCommercialEventsByCreation(creation.id);
        setEvents(data);
        setLoading(false);
    };

    useEffect(() => {
        if (creation.id) {
            loadEvents();
        }
    }, [creation.id]);

    const handleCreateEvent = async () => {
        setFormError(null);
        if (!title.trim()) {
            setFormError('El título del evento o nota es obligatorio.');
            return;
        }

        setSaving(true);
        const { data, error } = await recordCommercialEvent({
            creation_id: creation.id,
            event_type: eventType,
            title: title.trim(),
            description: description.trim() || null,
        });
        setSaving(false);

        if (error) {
            setFormError(error);
        } else if (data) {
            setIsAddModalOpen(false);
            setTitle('');
            setDescription('');
            setEventType('decision');
            loadEvents();
            Alert.alert('Guardado', 'La nota ha sido agregada a la bitácora inmutable.');
        }
    };

    // Construcción de la línea de tiempo unificada (Eventos nativos de creación + manuales)
    const timelineItems: TimelineItem[] = [];

    // 1. Creación del encargo
    timelineItems.push({
        id: `native-creation-${creation.id}`,
        date: creation.created_at,
        title: `Inicio de Encargo: ${creation.name}`,
        description: `Creado para la clienta ${creation.client?.full_name || 'Titular de Alta Costura'}. Tipo: ${creation.creation_type}.`,
        badge: 'ENCARGO',
        icon: '✨',
        isMilestone: true,
    });

    // 2. Sesión de medidas vinculada
    if (creation.session) {
        timelineItems.push({
            id: `native-session-${creation.session.id}`,
            date: creation.session.session_date || creation.session.created_at,
            title: `Sesión de Medidas Vinculada (v${creation.session.version_number})`,
            description: `Perfil antropométrico asignado con sistema de unidades ${creation.session.unit_system === 'in' ? 'Imperial' : 'Métrico'}.`,
            badge: 'BIOMETRÍA',
            icon: '📏',
        });
    }

    // 3. Patrón CAD activo o histórico
    if (creation.pattern_executions && creation.pattern_executions.length > 0) {
        creation.pattern_executions.forEach((exec) => {
            timelineItems.push({
                id: `native-pattern-${exec.id}`,
                date: exec.created_at,
                title: `Patrón CAD: ${exec.version_label} (${exec.garment_type.toUpperCase()})`,
                description: exec.notes || `Patrón geométrico paramétrico en estado ${exec.status}.`,
                badge: 'PATRÓN CAD',
                icon: '📐',
            });
        });
    }

    // 4. Eventos registrados en base de datos
    events.forEach((ev) => {
        timelineItems.push({
            id: ev.id,
            date: ev.created_at,
            title: ev.title,
            description: ev.description,
            badge: ev.event_type.toUpperCase(),
            icon: ev.event_type === 'fitting' ? '👗' : ev.event_type === 'quote' ? '📄' : '📝',
        });
    });

    // Ordenar de más reciente a más antiguo
    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <View style={styles.sectionCard}>
            {/* Cabecera */}
            <View style={styles.sectionCardHeader}>
                <View>
                    <Text style={styles.sectionCardTitleGold}>BITÁCORA EDITORIAL & TRAZABILIDAD</Text>
                    <Text style={styles.sectionCardSubtitle}>
                        Registro cronológico inmutable de decisiones, fitting, linaje técnico y acuerdos
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.primaryGoldBtn}
                    onPress={() => setIsAddModalOpen(true)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryGoldBtnText}>+ Agregar a Bitácora</Text>
                </TouchableOpacity>
            </View>

            {/* Línea de Tiempo */}
            {loading ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#C5A880" />
                    <Text style={{ marginTop: 10, color: '#8A7E72', fontSize: 13 }}>
                        Cargando línea de tiempo de la creación...
                    </Text>
                </View>
            ) : (
                <View style={{ marginTop: 8 }}>
                    {timelineItems.map((item, index) => (
                        <View key={item.id} style={{ flexDirection: 'row', marginBottom: 16 }}>
                            {/* Columna de nodo y línea conectora */}
                            <View style={{ alignItems: 'center', width: 36, marginRight: 10 }}>
                                <View
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: item.isMilestone ? '#171411' : '#F5EFE6',
                                        borderWidth: 1,
                                        borderColor: item.isMilestone ? '#171411' : '#C5A880',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                                </View>
                                {index < timelineItems.length - 1 && (
                                    <View
                                        style={{
                                            width: 1,
                                            flex: 1,
                                            backgroundColor: '#EFECE6',
                                            marginVertical: 4,
                                        }}
                                    />
                                )}
                            </View>

                            {/* Contenido del evento */}
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: '#FAF8F5',
                                    borderWidth: 1,
                                    borderColor: '#EFECE6',
                                    borderRadius: 10,
                                    padding: 12,
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <View style={[styles.materialCategoryBadge, { backgroundColor: '#F0ECE4' }]}>
                                        <Text style={styles.materialCategoryBadgeText}>{item.badge}</Text>
                                    </View>
                                    <Text style={{ fontSize: 11, color: '#8A7E72' }}>
                                        {new Date(item.date).toLocaleString('es-CO')}
                                    </Text>
                                </View>

                                <Text style={{ fontFamily: 'serif', fontSize: 14, fontWeight: '700', color: '#171411' }}>
                                    {item.title}
                                </Text>

                                {item.description && (
                                    <Text style={{ fontSize: 12, color: '#766B62', marginTop: 4, lineHeight: 18 }}>
                                        {item.description}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Modal para registrar nota en bitácora */}
            <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxWidth: 540 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Agregar Entrada a Bitácora</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Anotación histórica inmutable · Creación: {creation.name}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            {formError && (
                                <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                    <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{formError}</Text>
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Tipo de Evento</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6 }}>
                                    {[
                                        { id: 'decision', label: 'Decisión de Diseño' },
                                        { id: 'fitting', label: 'Prueba / Fitting' },
                                        { id: 'agreement', label: 'Acuerdo con Clienta' },
                                        { id: 'workshop', label: 'Nota de Taller' },
                                    ].map((t) => (
                                        <TouchableOpacity
                                            key={t.id}
                                            style={[styles.chipBtn, eventType === t.id && styles.chipBtnActive]}
                                            onPress={() => setEventType(t.id)}
                                        >
                                            <Text style={[styles.chipBtnText, eventType === t.id && styles.chipBtnTextActive]}>
                                                {t.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Título del Evento *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Cambio de forro acordado en segunda prueba"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Descripción y Detalles</Text>
                                <TextInput
                                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                                    multiline
                                    numberOfLines={3}
                                    placeholder="Detalles sobre caídas, observaciones de la diseñadora o peticiones de la clienta..."
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                                <TouchableOpacity
                                    style={styles.secondaryOutlineBtn}
                                    onPress={() => setIsAddModalOpen(false)}
                                >
                                    <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.primaryGoldBtn}
                                    onPress={handleCreateEvent}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#171411" />
                                    ) : (
                                        <Text style={styles.primaryGoldBtnText}>Guardar Entrada</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

