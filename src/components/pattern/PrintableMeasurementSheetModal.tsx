// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MODAL DE FICHAS IMPRIMIBLES A4 (FASE 3)
// Archivo: src/components/pattern/PrintableMeasurementSheetModal.tsx
// ==============================================================================
// Previsualiza y envía a imprimir las fichas de medidas físicas en formato A4
// con diseño de alta costura Atelier, individualmente o en lote completo.
// ==============================================================================

import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { MeasurementCampaign, MeasurementCampaignParticipant } from '../../types/pattern/measurementCampaign';
import { MeasurementTemplate } from '../../types/pattern/measurementTemplate';
import { DEMOGRAPHIC_LABELS } from '../../types/personGroup';
import { MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';
import { getStandardSizeEntry } from '../../engine/pattern/catalog/standardReferenceSizes';
import { printSheetsDocument } from '../../services/printableSheetService';

interface PrintableMeasurementSheetModalProps {
    visible: boolean;
    campaign: MeasurementCampaign;
    template: MeasurementTemplate;
    participants: MeasurementCampaignParticipant[];
    clientName: string;
    onClose: () => void;
}

export function PrintableMeasurementSheetModal({
    visible,
    campaign,
    template,
    participants,
    clientName,
    onClose,
}: PrintableMeasurementSheetModalProps) {
    const [printMode, setPrintMode] = useState<'batch' | 'single'>('batch');
    const [selectedPersonId, setSelectedPersonId] = useState<string>(
        participants.length > 0 ? (participants[0].person?.id || participants[0].person_id) : ''
    );

    if (!visible) return null;

    const handlePrint = () => {
        printSheetsDocument({
            campaign,
            template,
            participants,
            clientName,
            singlePersonId: printMode === 'single' ? selectedPersonId : null,
        });
    };

    const activeParticipant = printMode === 'single'
        ? participants.find((p) => (p.person?.id || p.person_id) === selectedPersonId) || participants[0]
        : participants[0];

    const activePerson = activeParticipant?.person;
    const demoLabel = activePerson ? (DEMOGRAPHIC_LABELS[activePerson.demographic_category] || activePerson.demographic_category) : 'Dama';
    const standardSize = activeParticipant?.standard_size || (campaign.mode === 'standard_only' ? 'M' : null);

    let standardValues: Record<string, number> = {};
    if (activePerson && standardSize) {
        const entry = getStandardSizeEntry(activePerson.demographic_category, standardSize);
        if (entry) {
            standardValues = entry.measurementsCm;
        }
    }

    const measurementItems = template.measurement_codes
        .map((code) => MEASUREMENT_MAP[code])
        .filter(Boolean);

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Cabecera Editorial */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.superTitle}>ATELIER DIGITAL · MÓDULO 02 · FASE 3</Text>
                        <Text style={styles.title}>Fichas Físicas Imprimibles A4</Text>
                        <Text style={styles.subtitle}>
                            Jornada: <Text style={styles.highlight}>{campaign.title}</Text> · Plantilla:{' '}
                            <Text style={styles.highlight}>{template.name}</Text> ({template.measurement_codes.length} medidas)
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.closeBtnText}>✕ Cerrar</Text>
                    </TouchableOpacity>
                </View>

                {/* Barra de Control de Impresión */}
                <View style={styles.controlBar}>
                    <View style={styles.modeToggleGroup}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, printMode === 'batch' && styles.toggleBtnActive]}
                            onPress={() => setPrintMode('batch')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.toggleBtnText, printMode === 'batch' && styles.toggleBtnTextActive]}>
                                📚 Paquete Completo ({participants.length} Fichas)
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toggleBtn, printMode === 'single' && styles.toggleBtnActive]}
                            onPress={() => setPrintMode('single')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.toggleBtnText, printMode === 'single' && styles.toggleBtnTextActive]}>
                                👤 Ficha Individual
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {printMode === 'single' && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.personSelectorStrip}
                        >
                            {participants.map((p) => {
                                const pid = p.person?.id || p.person_id;
                                const isSelected = pid === selectedPersonId;
                                return (
                                    <TouchableOpacity
                                        key={pid}
                                        style={[styles.personChip, isSelected && styles.personChipSelected]}
                                        onPress={() => setSelectedPersonId(pid)}
                                    >
                                        <Text style={[styles.personChipText, isSelected && styles.personChipTextSelected]}>
                                            {p.person?.full_name || 'Sin nombre'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    <TouchableOpacity style={styles.printActionBtn} onPress={handlePrint} activeOpacity={0.85}>
                        <Text style={styles.printActionBtnText}>
                            🖨️ {printMode === 'batch' ? `Imprimir Paquete (${participants.length} Páginas)` : 'Imprimir Ficha Individual'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Vista Previa Editorial en Pantalla */}
                <ScrollView contentContainerStyle={styles.previewContainer}>
                    <View style={styles.sheetPreviewCard}>
                        {/* Cabecera de la Ficha */}
                        <View style={styles.sheetPreviewHeader}>
                            <View>
                                <Text style={styles.sheetBrand}>ATELIER DIGITAL · KATHERINE CARROLL</Text>
                                <Text style={styles.sheetDocTitle}>FICHA FÍSICA DE MEDICIÓN ANATÓMICA</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.sheetMeta}>A4 · 210 × 297 mm</Text>
                                <Text style={styles.sheetMeta}>Fecha: {campaign.campaign_date}</Text>
                            </View>
                        </View>

                        {/* Metadatos de la Persona */}
                        <View style={styles.metaGrid}>
                            <View style={styles.metaCell}>
                                <Text style={styles.metaLabel}>CLIENTE / RESPONSABLE</Text>
                                <Text style={styles.metaValue}>{clientName}</Text>
                            </View>
                            <View style={styles.metaCell}>
                                <Text style={styles.metaLabel}>GRUPO / NÚCLEO</Text>
                                <Text style={styles.metaValue}>{campaign.group_name || 'Grupo'}</Text>
                            </View>
                            <View style={styles.metaCell}>
                                <Text style={styles.metaLabel}>PERSONA A MEDIR</Text>
                                <Text style={styles.metaValueHighlight}>{activePerson?.full_name || 'Nombre de la persona'}</Text>
                            </View>
                            <View style={styles.metaCell}>
                                <Text style={styles.metaLabel}>CATEGORÍA DEMOGRÁFICA</Text>
                                <Text style={styles.metaValue}>{demoLabel}</Text>
                            </View>
                            <View style={styles.metaCell}>
                                <Text style={styles.metaLabel}>CÓDIGO / REF.</Text>
                                <Text style={styles.metaValue}>{activePerson?.reference_id || '—'}</Text>
                            </View>
                            <View style={styles.metaCell}>
                                <Text style={styles.metaLabel}>TALLA ESTÁNDAR REF.</Text>
                                <Text style={styles.metaValue}>{standardSize || 'A medida directa'}</Text>
                            </View>
                        </View>

                        {/* Indicación de unidad */}
                        <View style={styles.unitNoticeBar}>
                            <Text style={styles.unitNoticeText}>
                                Sistema de Unidades: <Text style={{ fontWeight: '700' }}>{campaign.unit_system.toUpperCase()}</Text> · Plantilla:{' '}
                                <Text style={{ fontWeight: '700' }}>{template.name}</Text>
                            </Text>
                        </View>

                        {/* Tabla de Medidas */}
                        <View style={styles.tableBox}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.thText, { width: 36, textAlign: 'center' }]}>#</Text>
                                <Text style={[styles.thText, { width: 90 }]}>CÓDIGO</Text>
                                <Text style={[styles.thText, { flex: 1 }]}>PUNTO ANATÓMICO</Text>
                                <Text style={[styles.thText, { width: 85, textAlign: 'center' }]}>REF. ESTÁNDAR</Text>
                                <Text style={[styles.thText, { width: 140, textAlign: 'center' }]}>VALOR TOMADO</Text>
                                <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>OK</Text>
                            </View>

                            {measurementItems.map((item, idx) => {
                                const stdVal = standardValues[item.code];
                                return (
                                    <View key={item.code} style={styles.tableRow}>
                                        <Text style={[styles.tdText, { width: 36, textAlign: 'center', color: '#999' }]}>
                                            {idx + 1}
                                        </Text>
                                        <Text style={[styles.tdText, { width: 90, fontFamily: 'monospace', fontWeight: '700', color: colors.champagneGold }]}>
                                            {item.code}
                                        </Text>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={[styles.tdText, { fontWeight: '600' }]}>{item.name}</Text>
                                            <Text style={styles.tdHintText} numberOfLines={1}>{item.instructions || ''}</Text>
                                        </View>
                                        <Text style={[styles.tdText, { width: 85, textAlign: 'center', color: stdVal ? '#333' : '#bbb' }]}>
                                            {stdVal ? `${stdVal} ${campaign.unit_system}` : '—'}
                                        </Text>
                                        <View style={[styles.handwritingBox, { width: 140 }]}>
                                            <Text style={styles.dottedLine}>......................................</Text>
                                        </View>
                                        <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
                                            <View style={styles.checkboxBox} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Observaciones y Firmas */}
                        <View style={styles.notesSection}>
                            <Text style={styles.notesTitle}>OBSERVACIONES DE POSTURA, APLOMO Y ASIMETRÍAS</Text>
                            <View style={styles.notesLine} />
                            <View style={styles.notesLine} />
                        </View>

                        <View style={styles.signaturesRow}>
                            <View style={styles.signCell}>
                                <View style={styles.signLine} />
                                <Text style={styles.signLabel}>FIRMA DE LA DISEÑADORA / SASTRE</Text>
                            </View>
                            <View style={styles.signCell}>
                                <View style={styles.signLine} />
                                <Text style={styles.signLabel}>CONFORMIDAD DEL CLIENTE / RESPONSABLE</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    header: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#2C2723',
    },
    superTitle: {
        fontSize: 10,
        fontFamily: typography.serif,
        color: colors.champagneGold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 22,
        fontFamily: typography.serif,
        color: colors.ivoryWarm,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#B0A398',
    },
    highlight: {
        color: colors.champagneGold,
        fontWeight: '600',
    },
    closeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#443D36',
    },
    closeBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '600',
    },
    controlBar: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    modeToggleGroup: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        overflow: 'hidden',
    },
    toggleBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: colors.ivoryWarm,
    },
    toggleBtnActive: {
        backgroundColor: colors.atelierBlack,
    },
    toggleBtnText: {
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '500',
    },
    toggleBtnTextActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    personSelectorStrip: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    personChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    personChipSelected: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    personChipText: {
        fontSize: 11,
        color: colors.atelierBlack,
    },
    personChipTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    printActionBtn: {
        marginLeft: 'auto',
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    printActionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    previewContainer: {
        padding: 24,
        alignItems: 'center',
    },
    sheetPreviewCard: {
        width: 740,
        maxWidth: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: colors.sand,
    },
    sheetPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: colors.champagneGold,
        paddingBottom: 12,
        marginBottom: 16,
    },
    sheetBrand: {
        fontSize: 10,
        fontFamily: typography.serif,
        color: colors.champagneGold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    sheetDocTitle: {
        fontSize: 16,
        fontFamily: typography.serif,
        color: colors.atelierBlack,
        fontWeight: '700',
        marginTop: 2,
    },
    sheetMeta: {
        fontSize: 10,
        color: '#766B62',
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: colors.ivoryWarm,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        marginBottom: 14,
    },
    metaCell: {
        width: '33.33%',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    metaLabel: {
        fontSize: 8,
        color: '#766B62',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '500',
    },
    metaValueHighlight: {
        fontSize: 13,
        color: colors.atelierBlack,
        fontWeight: '700',
    },
    unitNoticeBar: {
        backgroundColor: '#F2ECE4',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
        marginBottom: 14,
    },
    unitNoticeText: {
        fontSize: 10,
        color: colors.atelierBlack,
    },
    tableBox: {
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 18,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    thText: {
        color: colors.ivoryWarm,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0E8DD',
    },
    tdText: {
        fontSize: 11,
        color: colors.atelierBlack,
    },
    tdHintText: {
        fontSize: 9,
        color: '#8A7E75',
        marginTop: 1,
    },
    handwritingBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    dottedLine: {
        color: '#BBB',
        letterSpacing: 1.5,
    },
    checkboxBox: {
        width: 14,
        height: 14,
        borderWidth: 1,
        borderColor: '#999',
        borderRadius: 2,
    },
    notesSection: {
        backgroundColor: colors.ivoryWarm,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        marginBottom: 20,
    },
    notesTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    notesLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#E6D9C8',
        height: 20,
    },
    signaturesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
    },
    signCell: {
        width: '45%',
    },
    signLine: {
        borderBottomWidth: 1,
        borderBottomColor: colors.atelierBlack,
        height: 35,
        marginBottom: 6,
    },
    signLabel: {
        fontSize: 8,
        color: '#766B62',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
