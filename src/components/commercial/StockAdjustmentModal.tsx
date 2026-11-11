// ==============================================================================
// ATELIER DIGITAL — MÓDULO 05: MODAL DE AJUSTES MANUALES Y BITÁCORA APPEND-ONLY
// Archivo: src/components/commercial/StockAdjustmentModal.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    AtelierSupplier,
    MaterialItem,
    MaterialStockAdjustment,
    StockAdjustmentType,
} from '../../types/commercial';
import {
    fetchStockAdjustmentsByMaterial,
    recordStockAdjustment,
} from '../../services/commercialService';
import { colors } from '../../theme/colors';
import { commercialStyles as styles } from './commercialStyles';
import {
    STOCK_ADJUSTMENT_TYPE_LABELS,
    STOCK_ADJUSTMENT_TYPE_OPTIONS,
} from './materialLabels';

export interface StockAdjustmentModalProps {
    visible: boolean;
    material: MaterialItem | null;
    suppliers: AtelierSupplier[];
    onClose: () => void;
    onAdjusted: (adjustment: MaterialStockAdjustment) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = (props) => {
    if (!props.visible || !props.material) return null;
    return (
        <Modal
            visible={props.visible}
            transparent
            animationType="fade"
            onRequestClose={props.onClose}
        >
            <StockAdjustmentModalInner
                key={props.material.id}
                material={props.material}
                suppliers={props.suppliers}
                onClose={props.onClose}
                onAdjusted={props.onAdjusted}
            />
        </Modal>
    );
};

interface StockAdjustmentModalInnerProps {
    material: MaterialItem;
    suppliers: AtelierSupplier[];
    onClose: () => void;
    onAdjusted: (adjustment: MaterialStockAdjustment) => void;
}

const StockAdjustmentModalInner: React.FC<StockAdjustmentModalInnerProps> = ({
    material,
    suppliers,
    onClose,
    onAdjusted,
}) => {
    const { width } = useWindowDimensions();
    const isCompact = width < 640;

    const [history, setHistory] = useState<MaterialStockAdjustment[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const [liveStock, setLiveStock] = useState<number>(Number(material.current_stock ?? 0));
    const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('purchase_entry');
    const [quantityInput, setQuantityInput] = useState('');
    const [supplierId, setSupplierId] = useState<string | null>(material.supplier_id || null);
    const [referenceCode, setReferenceCode] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        fetchStockAdjustmentsByMaterial(material.id, 40).then((res) => {
            if (!active) return;
            setHistory(res.data);
            setHistoryError(res.error);
            setLoadingHistory(false);
        });

        return () => {
            active = false;
        };
    }, [material.id]);

    const parsedInput = quantityInput.trim()
        ? Number(quantityInput.trim().replace(/,/g, '.'))
        : Number.NaN;

    const previewDelta =
        Number.isFinite(parsedInput) && parsedInput >= 0
            ? adjustmentType === 'manual_count'
                ? Number((parsedInput - liveStock).toFixed(2))
                : adjustmentType === 'manual_out'
                  ? Number((-parsedInput).toFixed(2))
                  : Number(parsedInput.toFixed(2))
            : null;

    const previewNewStock =
        previewDelta !== null ? Number((liveStock + previewDelta).toFixed(2)) : null;

    const selectedTypeConfig = STOCK_ADJUSTMENT_TYPE_OPTIONS.find(
        (opt) => opt.id === adjustmentType
    );

    const handleRecordAdjustment = async () => {
        setFormError(null);

        if (!Number.isFinite(parsedInput) || parsedInput < 0) {
            setFormError(
                adjustmentType === 'manual_count'
                    ? 'Ingrese un conteo físico válido mayor o igual a 0.'
                    : 'Ingrese una cantidad numérica válida mayor a 0.'
            );
            return;
        }

        if (adjustmentType !== 'manual_count' && parsedInput <= 0) {
            setFormError('La cantidad del movimiento debe ser mayor a 0.');
            return;
        }

        if (previewNewStock !== null && previewNewStock < 0) {
            setFormError('El stock resultante no puede ser menor a 0.');
            return;
        }

        setSaving(true);
        const res = await recordStockAdjustment({
            material_id: material.id,
            adjustment_type: adjustmentType,
            ...(adjustmentType === 'manual_count'
                ? { target_new_stock: Number(parsedInput.toFixed(2)) }
                : { quantity_delta: previewDelta ?? 0 }),
            supplier_id: supplierId,
            reference_code: referenceCode.trim() || null,
            notes: notes.trim() || null,
            update_material_stock: true,
        });
        setSaving(false);

        if (res.error || !res.data) {
            setFormError(res.error || 'No fue posible registrar el ajuste en bitácora.');
            return;
        }

        const nextStock = Number(res.data.new_stock ?? liveStock);
        setLiveStock(nextStock);
        setHistory((prev) => [res.data!, ...prev]);
        setQuantityInput('');
        setReferenceCode('');
        setNotes('');
        onAdjusted(res.data);
    };

    const activeSuppliers = suppliers.filter((s) => s.is_active || s.id === supplierId);

    return (
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { maxWidth: 740 }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={styles.modalTitle}>Inventario & Bitácora Inmutable</Text>
                            <Text style={styles.sectionCardSubtitle}>
                                {material.name}
                                {material.sku_code ? ` · SKU ${material.sku_code}` : ''} · Unidad:{' '}
                                {material.unit}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
                            <Text style={styles.modalCloseBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                        {/* Resumen actual y regla de inmutabilidad */}
                        <View
                            style={{
                                backgroundColor: '#FAF8F5',
                                borderWidth: 1,
                                borderColor: colors.sand,
                                borderRadius: 12,
                                padding: 14,
                                marginBottom: 14,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: isCompact ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isCompact ? 'flex-start' : 'center',
                                    gap: 8,
                                }}
                            >
                                <View>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>
                                        STOCK ACTUAL VERIFICADO
                                    </Text>
                                    <Text
                                        style={{
                                            fontFamily: 'serif',
                                            fontSize: 22,
                                            fontWeight: '700',
                                            color: colors.atelierBlack,
                                        }}
                                    >
                                        {liveStock} {material.unit}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        backgroundColor: '#FFF8E7',
                                        borderWidth: 1,
                                        borderColor: '#E6D9C8',
                                        borderRadius: 8,
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        maxWidth: isCompact ? '100%' : 340,
                                    }}
                                >
                                    <Text style={{ fontSize: 11, color: colors.bronze, fontWeight: '600' }}>
                                        Bitácora append-only (sin edición/borrado). Las propuestas y cotizaciones no descuentan stock automáticamente.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Formulario de ajuste manual */}
                        <View
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderWidth: 1,
                                borderColor: '#EFECE6',
                                borderRadius: 12,
                                padding: 14,
                                marginBottom: 16,
                            }}
                        >
                            <Text style={[styles.formLabel, { fontSize: 13, marginBottom: 8 }]}>
                                Registrar Movimiento Manual de Stock
                            </Text>

                            {formError ? (
                                <View
                                    style={{
                                        backgroundColor: colors.errorBg,
                                        borderWidth: 1,
                                        borderColor: colors.errorBorder,
                                        padding: 10,
                                        borderRadius: 8,
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text style={{ color: colors.error, fontSize: 12 }}>{formError}</Text>
                                </View>
                            ) : null}

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {STOCK_ADJUSTMENT_TYPE_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.chipBtn,
                                            adjustmentType === opt.id && styles.chipBtnActive,
                                        ]}
                                        onPress={() => {
                                            setAdjustmentType(opt.id);
                                            setFormError(null);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.chipBtnText,
                                                adjustmentType === opt.id && styles.chipBtnTextActive,
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {selectedTypeConfig ? (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }}>
                                    {selectedTypeConfig.helper}
                                </Text>
                            ) : null}

                            <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                                <View style={[styles.formGroup, styles.formCol]}>
                                    <Text style={styles.formLabel}>
                                        {adjustmentType === 'manual_count'
                                            ? `Nuevo Conteo Total (${material.unit}) *`
                                            : `Cantidad (${material.unit}) *`}
                                    </Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder={
                                            adjustmentType === 'manual_count'
                                                ? String(liveStock)
                                                : 'Ej: 5.0'
                                        }
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                        value={quantityInput}
                                        onChangeText={setQuantityInput}
                                    />
                                </View>
                                <View style={[styles.formGroup, styles.formCol]}>
                                    <Text style={styles.formLabel}>Referencia / Orden Compra</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Ej: OC-2026-041 o Arqueo Nov"
                                        placeholderTextColor={colors.textMuted}
                                        value={referenceCode}
                                        onChangeText={setReferenceCode}
                                    />
                                </View>
                            </View>

                            {previewDelta !== null && previewNewStock !== null ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        backgroundColor: previewNewStock < 0 ? colors.errorBg : '#F1F7F2',
                                        borderWidth: 1,
                                        borderColor: previewNewStock < 0 ? colors.errorBorder : '#C2DFCA',
                                        borderRadius: 8,
                                        padding: 10,
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: previewNewStock < 0 ? colors.error : colors.success,
                                        }}
                                    >
                                        Delta: {previewDelta >= 0 ? `+${previewDelta}` : previewDelta} {material.unit}
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: previewNewStock < 0 ? colors.error : colors.success,
                                        }}
                                    >
                                        Stock resultante: {previewNewStock} {material.unit}
                                    </Text>
                                </View>
                            ) : null}

                            {activeSuppliers.length > 0 ? (
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Proveedor Asociado (Opcional)</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                                    >
                                        <TouchableOpacity
                                            style={[styles.chipBtn, !supplierId && styles.chipBtnActive]}
                                            onPress={() => setSupplierId(null)}
                                        >
                                            <Text style={[styles.chipBtnText, !supplierId && styles.chipBtnTextActive]}>
                                                Ninguno
                                            </Text>
                                        </TouchableOpacity>
                                        {activeSuppliers.map((sup) => (
                                            <TouchableOpacity
                                                key={sup.id}
                                                style={[styles.chipBtn, supplierId === sup.id && styles.chipBtnActive]}
                                                onPress={() => setSupplierId(sup.id)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.chipBtnText,
                                                        supplierId === sup.id && styles.chipBtnTextActive,
                                                    ]}
                                                >
                                                    {sup.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : null}

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Observaciones de Bitácora</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Motivo del ingreso, salida o verificación física..."
                                    placeholderTextColor={colors.textMuted}
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <TouchableOpacity
                                    style={styles.primaryGoldBtn}
                                    onPress={handleRecordAdjustment}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color={colors.atelierBlack} />
                                    ) : (
                                        <Text style={styles.primaryGoldBtnText}>
                                            Registrar en Bitácora Inmutable
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Historial Inmutable */}
                        <Text style={[styles.formLabel, { fontSize: 13, marginBottom: 8 }]}>
                            Historial Cronológico Append-Only ({history.length})
                        </Text>

                        {historyError ? (
                            <View
                                style={{
                                    backgroundColor: colors.errorBg,
                                    padding: 10,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ color: colors.error, fontSize: 12 }}>{historyError}</Text>
                            </View>
                        ) : null}

                        {loadingHistory ? (
                            <View style={{ padding: 24, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.champagneGold} />
                            </View>
                        ) : history.length === 0 ? (
                            <View style={styles.emptyStateBox}>
                                <Text style={styles.emptyStateTitle}>Sin movimientos registrados</Text>
                                <Text style={styles.emptyStateText}>
                                    Cada ingreso, salida o arqueo manual quedará registrado de forma permanente aquí.
                                </Text>
                            </View>
                        ) : (
                            history.map((item) => {
                                const isPositive = item.quantity_delta >= 0;
                                return (
                                    <View
                                        key={item.id}
                                        style={{
                                            backgroundColor: '#FAF8F5',
                                            borderWidth: 1,
                                            borderColor: '#EFECE6',
                                            borderRadius: 10,
                                            padding: 12,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 4,
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.atelierBlack }}>
                                                {STOCK_ADJUSTMENT_TYPE_LABELS[item.adjustment_type]}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: '700',
                                                    color: isPositive ? colors.success : colors.error,
                                                }}
                                            >
                                                {isPositive ? `+${item.quantity_delta}` : item.quantity_delta}{' '}
                                                {item.unit_snapshot || material.unit}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                            Stock: {item.previous_stock ?? '—'} → {item.new_stock ?? '—'}{' '}
                                            {item.unit_snapshot || material.unit}
                                            {item.reference_code ? ` · Ref: ${item.reference_code}` : ''}
                                        </Text>
                                        {item.notes ? (
                                            <Text style={{ fontSize: 11, color: '#4A3E31', marginTop: 4 }}>
                                                {item.notes}
                                            </Text>
                                        ) : null}
                                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                                            {new Date(item.created_at).toLocaleString('es-CO')}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            </View>
    );
};
