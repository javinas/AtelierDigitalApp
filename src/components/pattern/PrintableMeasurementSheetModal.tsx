// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MODAL DE FICHAS IMPRIMIBLES A4 (FASE 3)
// Archivo: src/components/pattern/PrintableMeasurementSheetModal.tsx
// ==============================================================================
// Previsualiza y envía a imprimir las fichas de medidas físicas en formato A4
// con diseño de alta costura Atelier, individualmente o en lote completo.
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
    const [searchQuery, setSearchQuery] = useState('');

    const filteredParticipants = useMemo(() => {
        if (!searchQuery.trim()) return participants;
        const q = searchQuery.toLowerCase().trim();
        return participants.filter((p) => {
            const name = p.person?.full_name?.toLowerCase() || '';
            const ref = p.person?.reference_id?.toLowerCase() || '';
            const size = p.standard_size?.toLowerCase() || '';
            return name.includes(q) || ref.includes(q) || size.includes(q);
        });
    }, [participants, searchQuery]);

    const currentParticipantIndex = useMemo(() => {
        return participants.findIndex((p) => (p.person?.id || p.person_id) === selectedPersonId);
    }, [participants, selectedPersonId]);

    const handlePrevPerson = () => {
        if (participants.length === 0) return;
        const newIdx = currentParticipantIndex <= 0 ? participants.length - 1 : currentParticipantIndex - 1;
        const nextP = participants[newIdx];
        if (nextP) {
            setSelectedPersonId(nextP.person?.id || nextP.person_id);
        }
    };

    const handleNextPerson = () => {
        if (participants.length === 0) return;
        const newIdx = currentParticipantIndex >= participants.length - 1 ? 0 : currentParticipantIndex + 1;
        const nextP = participants[newIdx];
        if (nextP) {
            setSelectedPersonId(nextP.person?.id || nextP.person_id);
        }
    };

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
                    <View style={styles.controlBarTopRow}>
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

                        <TouchableOpacity style={styles.printActionBtn} onPress={handlePrint} activeOpacity={0.85}>
                            <Text style={styles.printActionBtnText}>
                                🖨️ {printMode === 'batch' ? `Imprimir Paquete (${participants.length} Páginas)` : 'Imprimir Ficha Individual'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {printMode === 'single' && (
                        <View style={styles.singlePersonSelectorRow}>
                            {/* Barra de Búsqueda y Navegación Secuencial */}
                            <View style={styles.searchAndNavRow}>
                                <View style={styles.searchInputWrap}>
                                    <Text style={styles.searchIcon}>🔍</Text>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Buscar persona por nombre o código..."
                                        placeholderTextColor="#9A8E82"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                            <Text style={styles.clearSearchText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Controles Secuenciales Anterior / Siguiente */}
                                <View style={styles.navControlsGroup}>
                                    <TouchableOpacity
                                        style={styles.navArrowBtn}
                                        onPress={handlePrevPerson}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.navArrowBtnText}>← Anterior</Text>
                                    </TouchableOpacity>

                                    <View style={styles.personCounterBadge}>
                                        <Text style={styles.personCounterText}>
                                            {currentParticipantIndex >= 0 ? `${currentParticipantIndex + 1}` : '1'} / {participants.length}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.navArrowBtn}
                                        onPress={handleNextPerson}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.navArrowBtnText}>Siguiente →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Tira Deslizable de Personas con chips enriquecidos */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={true}
                                contentContainerStyle={styles.personSelectorStrip}
                            >
                                {filteredParticipants.map((p, idx) => {
                                    const pid = p.person?.id || p.person_id;
                                    const isSelected = pid === selectedPersonId;
                                    const origIndex = participants.findIndex((orig) => (orig.person?.id || orig.person_id) === pid);
                                    return (
                                        <TouchableOpacity
                                            key={pid}
                                            style={[styles.personChip, isSelected && styles.personChipSelected]}
                                            onPress={() => setSelectedPersonId(pid)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.personIndexTag, isSelected && styles.personIndexTagSelected]}>
                                                #{origIndex >= 0 ? origIndex + 1 : idx + 1}
                                            </Text>
                                            <Text
                                                style={[styles.personChipText, isSelected && styles.personChipTextSelected]}
                                                numberOfLines={1}
                                            >
                                                {p.person?.full_name || 'Sin nombre'}
                                            </Text>
                                            {p.person?.reference_id ? (
                                                <Text style={[styles.personRefTag, isSelected && styles.personRefTagSelected]}>
                                                    {p.person.reference_id}
                                                </Text>
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })}
                                {filteredParticipants.length === 0 && (
                                    <Text style={styles.emptySearchText}>
                                        Ninguna persona coincide con «{searchQuery}»
                                    </Text>
                                )}
                            </ScrollView>
                        </View>
                    )}
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
                                <Text style={[styles.thText, { width: 145 }]}>CÓDIGO</Text>
                                <Text style={[styles.thText, { flex: 1 }]}>PUNTO ANATÓMICO</Text>
                                <Text style={[styles.thText, { width: 85, textAlign: 'center' }]}>REF. ESTÁNDAR</Text>
                                <Text style={[styles.thText, { width: 110, textAlign: 'center' }]}>VALOR TOMADO</Text>
                                <Text style={[styles.thText, { width: 36, textAlign: 'center' }]}>OK</Text>
                            </View>

                            {measurementItems.map((item, idx) => {
                                const stdVal = standardValues[item.code];
                                return (
                                    <View key={item.code} style={styles.tableRow}>
                                        <Text style={[styles.tdText, { width: 36, textAlign: 'center', color: '#999' }]}>
                                            {idx + 1}
                                        </Text>
                                        <Text style={[styles.tdText, { width: 145, fontFamily: 'monospace', fontWeight: '700', fontSize: 10.5, color: colors.champagneGold }]} numberOfLines={1}>
                                            {item.code}
                                        </Text>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={[styles.tdText, { fontWeight: '600' }]}>{item.name}</Text>
                                            <Text style={styles.tdHintText} numberOfLines={2}>{item.instructions || ''}</Text>
                                        </View>
                                        <Text style={[styles.tdText, { width: 85, textAlign: 'center', color: stdVal ? '#333' : '#bbb' }]}>
                                            {stdVal ? `${stdVal} ${campaign.unit_system}` : '—'}
                                        </Text>
                                        <View style={[styles.handwritingBox, { width: 110 }]}>
                                            <Text style={styles.dottedLine}>................................</Text>
                                        </View>
                                        <View style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        gap: 10,
    },
    controlBarTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    singlePersonSelectorRow: {
        width: '100%',
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F5EFE6',
    },
    searchAndNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    searchInputWrap: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 20,
        paddingHorizontal: 12,
        height: 36,
    },
    searchIcon: {
        fontSize: 13,
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        color: colors.atelierBlack,
        paddingVertical: 0,
    },
    clearSearchText: {
        fontSize: 12,
        color: '#9A8E82',
        fontWeight: '700',
        paddingHorizontal: 4,
    },
    navControlsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    navArrowBtn: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    navArrowBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    personCounterBadge: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    personCounterText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    selectorLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
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
        paddingVertical: 2,
    },
    personChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
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
    personIndexTag: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#8A7E75',
        marginRight: 5,
    },
    personIndexTagSelected: {
        color: '#FFFFFF',
    },
    personChipText: {
        fontSize: 11,
        color: colors.atelierBlack,
    },
    personChipTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    personRefTag: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8C6826',
        backgroundColor: '#EAE1D2',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 2,
        marginLeft: 6,
    },
    personRefTagSelected: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        color: '#FFFFFF',
    },
    emptySearchText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: colors.textMuted,
        paddingVertical: 6,
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
