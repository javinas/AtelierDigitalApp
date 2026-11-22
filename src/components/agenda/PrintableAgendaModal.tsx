// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: VISTA PREVIA EDITORIAL A4 / IMPRESIÓN Y PDF (M08)
// Archivo: src/components/agenda/PrintableAgendaModal.tsx
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    formatAgendaItemWithPrivacy,
    openAgendaPrintWindow,
} from '../../services/agendaExportService';
import { formatBogotaDateHeading } from '../../services/agendaService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { AgendaExportPreparedDataset, UnifiedAgendaItem } from '../../types/agenda';
import {
    AGENDA_SOURCE_META,
    APPOINTMENT_STATUS_META,
    APPOINTMENT_TYPE_LABELS,
    LOCATION_SPACE_LABELS,
} from './agendaLabels';

export interface PrintableAgendaModalProps {
    visible: boolean;
    dataset: AgendaExportPreparedDataset | null;
    onClose: () => void;
}

export const PrintableAgendaModal: React.FC<PrintableAgendaModalProps> = ({
    visible,
    dataset,
    onClose,
}) => {
    const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

    const groupedByDate = useMemo(() => {
        if (!dataset) return [];
        const map = new Map<string, UnifiedAgendaItem[]>();
        for (const item of dataset.items) {
            const list = map.get(item.bogota_date) || [];
            list.push(item);
            map.set(item.bogota_date, list);
        }
        return Array.from(map.entries());
    }, [dataset]);

    if (!visible || !dataset) return null;

    const handleLaunchPrint = (autoPrint: boolean) => {
        const res = openAgendaPrintWindow(dataset, autoPrint);
        if (!res.ok) {
            setNoticeBanner(
                res.reason ||
                    'No fue posible abrir la ventana emergente de impresión. Verifica permisos de ventanas emergentes.'
            );
            return;
        }
        setNoticeBanner(
            autoPrint
                ? 'Documento editorial A4 enviado a impresión / diálogo Guardar como PDF.'
                : 'Vista editorial A4 abierta en una nueva pestaña lista para imprimir o guardar como PDF.'
        );
    };

    const fittingsCount = dataset.items.filter((i) =>
        ['toile_fitting', 'garment_fitting', 'final_fitting', 'alteration_review'].includes(i.appointment_type)
    ).length;
    const deliveriesCount = dataset.items.filter((i) =>
        ['delivery_ceremony', 'pickup_return'].includes(i.appointment_type)
    ).length;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={printModalStyles.overlay}>
                <View style={printModalStyles.container}>
                    <View style={printModalStyles.toolbar}>
                        <View style={printModalStyles.toolbarTitleWrap}>
                            <Text style={printModalStyles.toolbarEyebrow}>
                                ✦ DOCUMENTO EDITORIAL A4 · BY KATHERINE CARROLL
                            </Text>
                            <Text style={printModalStyles.toolbarTitle}>
                                Vista Previa Impresión / PDF
                            </Text>
                        </View>
                        <View style={printModalStyles.toolbarActions}>
                            <TouchableOpacity
                                onPress={() => handleLaunchPrint(true)}
                                style={printModalStyles.goldBtn}
                                activeOpacity={0.88}
                            >
                                <Text style={printModalStyles.goldBtnText}>🖨️ Imprimir / Guardar PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onClose}
                                style={printModalStyles.closeBtn}
                                activeOpacity={0.85}
                            >
                                <Text style={printModalStyles.closeBtnText}>✕ Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {noticeBanner ? (
                        <View style={printModalStyles.noticeBar}>
                            <Text style={printModalStyles.noticeText}>{noticeBanner}</Text>
                            <TouchableOpacity onPress={() => setNoticeBanner(null)}>
                                <Text style={printModalStyles.noticeDismiss}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <ScrollView contentContainerStyle={printModalStyles.sheetScroll}>
                        <View style={printModalStyles.a4Sheet}>
                            <View style={printModalStyles.sheetHeader}>
                                <View style={{ flex: 1, minWidth: 180, flexShrink: 1 }}>
                                    <Text style={printModalStyles.sheetBrand}>
                                        ✦ ATELIER DE AUTOR · BY KATHERINE CARROLL
                                    </Text>
                                    <Text style={printModalStyles.sheetHeading}>
                                        Agenda Consolidada del Atelier
                                    </Text>
                                    <Text style={printModalStyles.sheetSub}>
                                        Zona horaria oficial Colombia (America/Bogota UTC-5)
                                    </Text>
                                </View>
                                <View style={printModalStyles.periodBox}>
                                    <Text style={printModalStyles.periodBoxTitle}>{dataset.range.label}</Text>
                                    <Text style={printModalStyles.periodBoxSub}>
                                        Generado: {dataset.generatedAtBogota}
                                    </Text>
                                </View>
                            </View>

                            <View style={printModalStyles.kpiStrip}>
                                <View style={printModalStyles.kpiCell}>
                                    <Text style={printModalStyles.kpiLabel}>Compromisos</Text>
                                    <Text style={printModalStyles.kpiValue}>{dataset.items.length}</Text>
                                </View>
                                <View style={printModalStyles.kpiCell}>
                                    <Text style={printModalStyles.kpiLabel}>Pruebas Fitting</Text>
                                    <Text style={printModalStyles.kpiValue}>{fittingsCount}</Text>
                                </View>
                                <View style={printModalStyles.kpiCell}>
                                    <Text style={printModalStyles.kpiLabel}>Entregas</Text>
                                    <Text style={printModalStyles.kpiValue}>{deliveriesCount}</Text>
                                </View>
                                <View style={printModalStyles.kpiCell}>
                                    <Text style={printModalStyles.kpiLabel}>Duplicados omitidos</Text>
                                    <Text style={printModalStyles.kpiValue}>{dataset.duplicatesRemoved}</Text>
                                </View>
                            </View>

                            <View style={printModalStyles.privacyBox}>
                                <Text style={printModalStyles.privacyText}>
                                    {dataset.privacyLevel === 'protected_external'
                                        ? '🔒 Modo Privacidad Protegida: nombres de clientas abreviados; teléfonos y notas internas omitidos.'
                                        : '📋 Modo Completo Interno: incluye datos de contacto, encargos y notas del taller.'}
                                    {dataset.filterSummary.respectActiveFilters
                                        ? ' · Filtros de pantalla aplicados.'
                                        : ' · Agenda completa del período.'}
                                </Text>
                            </View>

                            {groupedByDate.length === 0 ? (
                                <View style={printModalStyles.emptyState}>
                                    <Text style={printModalStyles.emptyText}>
                                        No hay compromisos para imprimir en este período con los filtros elegidos.
                                    </Text>
                                </View>
                            ) : (
                                groupedByDate.map(([dateKey, list]) => (
                                    <View key={dateKey} style={printModalStyles.daySection}>
                                        <View style={printModalStyles.dayHeader}>
                                            <Text style={printModalStyles.dayTitle}>
                                                {formatBogotaDateHeading(dateKey)}
                                            </Text>
                                            <Text style={printModalStyles.dayCount}>
                                                {list.length} {list.length === 1 ? 'registro' : 'registros'}
                                            </Text>
                                        </View>
                                        {list.map((it) => {
                                            const fmt = formatAgendaItemWithPrivacy(it, dataset.privacyLevel);
                                            const sourceMeta = AGENDA_SOURCE_META[it.source_kind];
                                            const statusMeta = APPOINTMENT_STATUS_META[it.status];
                                            const spaceLabel =
                                                it.location_label_override ||
                                                LOCATION_SPACE_LABELS[it.location_space] ||
                                                it.location_space;
                                            const typeLabel =
                                                APPOINTMENT_TYPE_LABELS[it.appointment_type] || it.appointment_type;

                                            return (
                                                <View key={it.agenda_item_id} style={printModalStyles.itemRow}>
                                                    <View style={printModalStyles.itemTop}>
                                                        <View style={printModalStyles.itemTimePill}>
                                                            <Text style={printModalStyles.itemTimeText}>
                                                                {it.bogota_start_time} – {it.bogota_end_time}
                                                            </Text>
                                                        </View>
                                                        <Text style={printModalStyles.itemBadges}>
                                                            {sourceMeta.badge} · {statusMeta.label}
                                                        </Text>
                                                    </View>
                                                    <Text style={printModalStyles.itemTitle}>{fmt.title}</Text>
                                                    <Text style={printModalStyles.itemMeta}>
                                                        ✦ {typeLabel} · 📍 {spaceLabel} · 👤 {fmt.clientDisplay}
                                                        {fmt.phoneDisplay ? ` (${fmt.phoneDisplay})` : ''}
                                                    </Text>
                                                    {fmt.creationDisplay || it.supplier_name || it.assigned_staff ? (
                                                        <Text style={printModalStyles.itemMeta}>
                                                            {fmt.creationDisplay ? `✂️ ${fmt.creationDisplay}` : ''}
                                                            {it.supplier_name ? ` · 🧵 ${it.supplier_name}` : ''}
                                                            {it.assigned_staff ? ` · 👥 ${it.assigned_staff}` : ''}
                                                        </Text>
                                                    ) : null}
                                                    {fmt.notesDisplay ? (
                                                        <Text style={printModalStyles.itemNotes}>{fmt.notesDisplay}</Text>
                                                    ) : null}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const printModalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        padding: 14,
        justifyContent: 'center',
    },
    container: {
        backgroundColor: colors.background,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.sand,
        maxWidth: 880,
        width: '100%',
        maxHeight: '94%',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    toolbar: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    toolbarTitleWrap: {
        flex: 1,
        minWidth: 180,
        flexShrink: 1,
    },
    toolbarEyebrow: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.4,
        color: colors.champagneGold,
        fontFamily: typography.sans,
    },
    toolbarTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: typography.serif,
    },
    toolbarActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    goldBtn: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: 8,
    },
    goldBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.sans,
    },
    closeBtn: {
        borderWidth: 1,
        borderColor: colors.champagneGold,
        backgroundColor: '#2C2722',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    closeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: typography.sans,
    },
    noticeBar: {
        backgroundColor: colors.ivoryWarm,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        color: colors.atelierBlack,
        fontFamily: typography.sans,
    },
    noticeDismiss: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        paddingHorizontal: 4,
    },
    sheetScroll: {
        padding: 16,
    },
    a4Sheet: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 10,
        padding: 18,
        gap: 14,
    },
    sheetHeader: {
        borderBottomWidth: 2,
        borderBottomColor: colors.champagneGold,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
    },
    sheetBrand: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: colors.champagneGold,
        fontFamily: typography.sans,
    },
    sheetHeading: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        marginTop: 2,
    },
    sheetSub: {
        fontSize: 12,
        color: colors.textSecondary,
        fontFamily: typography.sans,
        marginTop: 2,
    },
    periodBox: {
        backgroundColor: colors.ivoryWarm,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 10,
        minWidth: 190,
        flexShrink: 1,
    },
    periodBoxTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.sans,
    },
    periodBoxSub: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 3,
        fontFamily: typography.sans,
    },
    kpiStrip: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    kpiCell: {
        flex: 1,
        minWidth: 120,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 10,
    },
    kpiLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: colors.textSecondary,
        fontFamily: typography.sans,
    },
    kpiValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    privacyBox: {
        backgroundColor: '#FAF7F2',
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
    },
    privacyText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontFamily: typography.sans,
    },
    emptyState: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.sand,
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    daySection: {
        gap: 8,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        paddingBottom: 4,
    },
    dayTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        flexShrink: 1,
    },
    dayCount: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
        fontFamily: typography.sans,
    },
    itemRow: {
        borderWidth: 1,
        borderColor: colors.sand,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        borderRadius: 8,
        padding: 10,
        gap: 4,
        backgroundColor: '#FFFFFF',
    },
    itemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    itemTimePill: {
        backgroundColor: colors.atelierBlack,
        borderRadius: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    itemTimeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: typography.sans,
    },
    itemBadges: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
        fontFamily: typography.sans,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
        fontFamily: typography.serif,
    },
    itemMeta: {
        fontSize: 11,
        color: colors.textSecondary,
        fontFamily: typography.sans,
    },
    itemNotes: {
        marginTop: 3,
        backgroundColor: colors.ivoryWarm,
        borderRadius: 6,
        padding: 7,
        fontSize: 11,
        color: colors.atelierBlack,
        fontFamily: typography.sans,
    },
});
