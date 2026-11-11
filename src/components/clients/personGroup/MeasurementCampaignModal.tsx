// ==============================================================================
// MODAL: PLANIFICAR JORNADA DE MEDICIÓN
// Atelier Digital · By Katherine Carroll
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
import { colors } from '../../../theme/colors';
import { MeasurementGroup } from '../../../types/personGroup';
import { MeasurementUnit } from '../../../types/pattern/measurement';
import { MeasurementUsageMode } from '../../../types/pattern/measurementTemplate';
import { MEASUREMENT_TEMPLATES } from '../../../engine/pattern/catalog/measurementTemplates';
import { styles } from './personGroupStyles';

interface MeasurementCampaignModalProps {
    visible: boolean;
    campaignTitle: string;
    setCampaignTitle: (val: string) => void;
    campaignGroupId: string;
    setCampaignGroupId: (val: string) => void;
    groups: MeasurementGroup[];
    campaignTemplateId: string;
    setCampaignTemplateId: (val: string) => void;
    campaignMode: MeasurementUsageMode;
    setCampaignMode: (m: MeasurementUsageMode) => void;
    campaignUnit: MeasurementUnit;
    setCampaignUnit: (u: MeasurementUnit) => void;
    campaignNotes: string;
    setCampaignNotes: (val: string) => void;
    savingCampaign: boolean;
    onSave: () => void;
    onClose: () => void;
}

export function MeasurementCampaignModal({
    visible,
    campaignTitle,
    setCampaignTitle,
    campaignGroupId,
    setCampaignGroupId,
    groups,
    campaignTemplateId,
    setCampaignTemplateId,
    campaignMode,
    setCampaignMode,
    campaignUnit,
    setCampaignUnit,
    campaignNotes,
    setCampaignNotes,
    savingCampaign,
    onSave,
    onClose,
}: MeasurementCampaignModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalDialog, { maxWidth: 540 }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Planificar Jornada de Medición</Text>
                            <Text style={styles.modalSub}>
                                Organice la captura masiva para un grupo con una plantilla especializada
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 460 }}>
                        <Text style={styles.formLabel}>Título / Referencia de la Jornada *</Text>
                        <TextInput
                            style={styles.formInput}
                            value={campaignTitle}
                            onChangeText={setCampaignTitle}
                            placeholder="Ej: Toma de Medidas Promoción 2027"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.formLabel}>Grupo / Núcleo Destino *</Text>
                        <View style={styles.categoryPillsRow}>
                            {groups.map((g) => (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[
                                        styles.categoryPill,
                                        campaignGroupId === g.id && styles.categoryPillActive,
                                    ]}
                                    onPress={() => setCampaignGroupId(g.id)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            campaignGroupId === g.id && styles.categoryPillTextActive,
                                        ]}
                                    >
                                        {g.name} ({g.members_count || 0})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>Plantilla de Medidas Reutilizable *</Text>
                        <View style={styles.categoryPillsRow}>
                            {MEASUREMENT_TEMPLATES.map((tmpl) => (
                                <TouchableOpacity
                                    key={tmpl.id}
                                    style={[
                                        styles.categoryPill,
                                        campaignTemplateId === tmpl.id && styles.categoryPillActive,
                                    ]}
                                    onPress={() => setCampaignTemplateId(tmpl.id)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            campaignTemplateId === tmpl.id && styles.categoryPillTextActive,
                                        ]}
                                    >
                                        {tmpl.name} ({tmpl.measurement_codes.length})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>Modalidad de Captura</Text>
                        <View style={styles.categoryPillsRow}>
                            {[
                                { key: 'standard_with_adjustments', label: 'Talla + Ajustes' },
                                { key: 'standard_only', label: 'Solo Talla' },
                                { key: 'manual_direct', label: 'Medidas Manuales' },
                            ].map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        styles.categoryPill,
                                        campaignMode === m.key && styles.categoryPillActive,
                                    ]}
                                    onPress={() => setCampaignMode(m.key as MeasurementUsageMode)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            campaignMode === m.key && styles.categoryPillTextActive,
                                        ]}
                                    >
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>Sistema de Unidades</Text>
                        <View style={styles.categoryPillsRow}>
                            {(['cm', 'mm', 'in'] as MeasurementUnit[]).map((u) => (
                                <TouchableOpacity
                                    key={u}
                                    style={[
                                        styles.categoryPill,
                                        campaignUnit === u && styles.categoryPillActive,
                                    ]}
                                    onPress={() => setCampaignUnit(u)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryPillText,
                                            campaignUnit === u && styles.categoryPillTextActive,
                                        ]}
                                    >
                                        {u.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>Notas de la Jornada (Opcional)</Text>
                        <TextInput
                            style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                            value={campaignNotes}
                            onChangeText={setCampaignNotes}
                            placeholder="Observaciones logísticas o de confección..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                        />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                            <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalSaveBtn}
                            onPress={onSave}
                            disabled={savingCampaign}
                        >
                            {savingCampaign ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.modalSaveBtnText}>Planificar e Iniciar Captura</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
