// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: CONTROL FINANCIERO Y RESUMEN ECONÓMICO
// Archivo: src/components/commercial/FinancialControlTab.tsx
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
import {
    FinancialSummary,
    FinancialTransaction,
    PaymentMethod,
    TransactionType,
} from '../../types/commercial';
import {
    calculateFinancialSummary,
    createTransaction,
    fetchQuotesByCreation,
    fetchTransactionsByCreation,
} from '../../services/commercialService';
import { commercialStyles as styles } from './commercialStyles';

export interface FinancialControlTabProps {
    creation: Creation;
}

const TX_TYPES: { id: TransactionType; label: string; isIncome: boolean; category: string }[] = [
    { id: 'advance', label: 'Anticipo Inicial (50%)', isIncome: true, category: 'Ingreso Clienta' },
    { id: 'installment', label: 'Abono Parcial a Saldo', isIncome: true, category: 'Ingreso Clienta' },
    { id: 'final_payment', label: 'Cancelación / Pago Final', isIncome: true, category: 'Ingreso Clienta' },
    { id: 'material_purchase', label: 'Compra de Telas e Insumos', isIncome: false, category: 'Egreso Taller' },
    { id: 'workshop_expense', label: 'Servicios de Confección / Bordado', isIncome: false, category: 'Egreso Taller' },
    { id: 'refund', label: 'Reembolso a Clienta', isIncome: false, category: 'Egreso Taller' },
];

const METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'transfer', label: 'Transferencia Bancaria', icon: '🏦' },
    { id: 'wompi', label: 'Pasarela Wompi', icon: '⚡' },
    { id: 'bold', label: 'Datáfono Bold', icon: '📱' },
    { id: 'cash', label: 'Efectivo en Atelier', icon: '💵' },
    { id: 'card', label: 'Tarjeta de Crédito / Débito', icon: '💳' },
    { id: 'other', label: 'Otro Medio / Consignación', icon: '🏷️' },
];

const PAYMENT_STATUS_MAP = {
    unpaid: { label: 'Sin Recaudos', bg: '#FAF2F2', color: '#9E3B3B' },
    partially_paid: { label: 'Anticipo / Abono Parcial', bg: '#FFF8E7', color: '#B37D14' },
    paid_in_full: { label: 'Pagado en su Totalidad', bg: '#F1F7F2', color: '#3D6346' },
};

export const FinancialControlTab: React.FC<FinancialControlTabProps> = ({ creation }) => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // Formulario de nueva transacción
    const [txType, setTxType] = useState<TransactionType>('advance');
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
    const [referenceNumber, setReferenceNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);

    const loadFinancialData = async () => {
        setLoading(true);
        // 1. Obtener cotizaciones vigentes para determinar el total cotizado
        const { data: quotes } = await fetchQuotesByCreation(creation.id);
        const activeQuote = quotes.find((q) => q.status === 'accepted') || quotes[0] || null;
        const quotedTotal = activeQuote?.calculation.total || 0;

        // 2. Obtener movimientos financieros
        const { data: txs } = await fetchTransactionsByCreation(creation.id);
        setTransactions(txs);

        // 3. Calcular resumen económico
        const calculated = calculateFinancialSummary(txs, quotedTotal);
        setSummary(calculated);

        setLoading(false);
    };

    useEffect(() => {
        if (creation.id) {
            loadFinancialData();
        }
    }, [creation.id]);

    const handleCreateTransaction = async () => {
        setFormError(null);
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setFormError('Ingrese un monto válido superior a cero.');
            return;
        }

        setSaving(true);
        const { data, error } = await createTransaction({
            creation_id: creation.id,
            transaction_type: txType,
            amount: parsedAmount,
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim() || null,
            notes: notes.trim() || null,
        });
        setSaving(false);

        if (error) {
            setFormError(error);
        } else if (data) {
            setIsAddModalOpen(false);
            resetForm();
            loadFinancialData();
            Alert.alert('Éxito', 'Movimiento financiero registrado correctamente.');
        }
    };

    const resetForm = () => {
        setTxType('advance');
        setAmount('');
        setPaymentMethod('transfer');
        setReferenceNumber('');
        setNotes('');
        setFormError(null);
    };

    if (loading) {
        return (
            <View style={[styles.sectionCard, { alignItems: 'center', padding: 30 }]}>
                <ActivityIndicator size="small" color="#C5A880" />
                <Text style={{ marginTop: 10, color: '#8A7E72', fontSize: 13 }}>
                    Calculando balance financiero del atelier...
                </Text>
            </View>
        );
    }

    const statusBadge = summary ? PAYMENT_STATUS_MAP[summary.payment_status] : PAYMENT_STATUS_MAP.unpaid;

    return (
        <View style={styles.sectionCard}>
            {/* Cabecera de la sección */}
            <View style={styles.sectionCardHeader}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.sectionCardTitleGold}>CONTROL FINANCIERO & EGRESOS</Text>
                        <View
                            style={[
                                styles.materialCategoryBadge,
                                { backgroundColor: statusBadge.bg, borderColor: '#E6D9C8' },
                            ]}
                        >
                            <Text style={[styles.materialCategoryBadgeText, { color: statusBadge.color }]}>
                                {statusBadge.label.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.sectionCardSubtitle}>
                        Control de anticipos, abonos de clienta y gastos reales de taller
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.primaryGoldBtn}
                    onPress={() => setIsAddModalOpen(true)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryGoldBtnText}>+ Registrar Movimiento</Text>
                </TouchableOpacity>
            </View>

            {/* Tarjetas KPI de Resumen Económico */}
            {summary && (
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Total Cotizado</Text>
                        <Text style={styles.kpiValue}>
                            ${summary.quoted_total.toLocaleString('es-CO')}
                        </Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Recaudado (Anticipos)</Text>
                        <Text style={styles.kpiValueGreen}>
                            ${summary.total_income.toLocaleString('es-CO')}
                        </Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Saldo por Cobrar</Text>
                        <Text style={[styles.kpiValue, { color: summary.balance_pending > 0 ? '#B37D14' : '#3D6346' }]}>
                            ${summary.balance_pending.toLocaleString('es-CO')}
                        </Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Egresos de Taller</Text>
                        <Text style={[styles.kpiValue, { color: '#9E3B3B' }]}>
                            ${summary.total_expenses.toLocaleString('es-CO')}
                        </Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Margen Bruto Real</Text>
                        <Text style={styles.kpiValueGold}>
                            ${summary.project_gross_margin.toLocaleString('es-CO')}
                        </Text>
                    </View>
                </View>
            )}

            {/* Historial de Movimientos */}
            {transactions.length === 0 ? (
                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateTitle}>Sin transacciones financieras registradas</Text>
                    <Text style={styles.emptyStateText}>
                        No se han registrado abonos ni compras de materiales para este encargo. Registre el anticipo del 50% de la clienta para dar inicio al aprovisionamiento y confección.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={() => setIsAddModalOpen(true)}
                    >
                        <Text style={styles.primaryGoldBtnText}>Registrar Primer Anticipo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Fecha & Tipo</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Medio / Referencia</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Monto</Text>
                    </View>

                    {transactions.map((tx) => {
                        const typeInfo = TX_TYPES.find((t) => t.id === tx.transaction_type) || TX_TYPES[0];
                        const methodInfo = METHODS.find((m) => m.id === tx.payment_method) || METHODS[0];

                        return (
                            <View key={tx.id} style={styles.tableDataRow}>
                                <View style={{ flex: 1.2 }}>
                                    <Text style={[styles.tableDataText, { fontWeight: '700' }]}>
                                        {typeInfo.label}
                                    </Text>
                                    <Text style={styles.tableDataSubText}>
                                        {new Date(tx.transaction_date).toLocaleDateString('es-CO')}
                                    </Text>
                                </View>

                                <View style={{ flex: 1.5 }}>
                                    <Text style={styles.tableDataText}>
                                        {methodInfo.label}
                                    </Text>
                                    <Text style={styles.tableDataSubText}>
                                        {tx.reference_number ? `Ref: ${tx.reference_number}` : 'Sin comprobante'}
                                        {tx.notes ? ` · ${tx.notes}` : ''}
                                    </Text>
                                </View>

                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text
                                        style={[
                                            styles.tableDataText,
                                            {
                                                fontFamily: 'serif',
                                                fontWeight: '700',
                                                color: typeInfo.isIncome ? '#3D6346' : '#9E3B3B',
                                            },
                                        ]}
                                    >
                                        {typeInfo.isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString('es-CO')} COP
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Modal para Registrar Movimiento */}
            <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxWidth: 640 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Registrar Movimiento Financiero</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Ingresos de clienta o egresos de taller · Creación: {creation.name}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
                            {formError && (
                                <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                    <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{formError}</Text>
                                </View>
                            )}

                            {/* Tipo de Transacción con cuadrícula estructurada y legible */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Concepto del Movimiento *</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {TX_TYPES.map((t) => {
                                        const isSelected = txType === t.id;
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                style={[
                                                    styles.gridOptionCard,
                                                    isSelected && styles.gridOptionCardActive,
                                                    { flexBasis: '48%', flexGrow: 1 },
                                                ]}
                                                onPress={() => setTxType(t.id)}
                                                activeOpacity={0.85}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <View
                                                        style={[
                                                            styles.flowPill,
                                                            { backgroundColor: t.isIncome ? (isSelected ? '#2A4430' : '#F1F7F2') : (isSelected ? '#4F1D1D' : '#FAF2F2') },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.flowPillText,
                                                                { color: t.isIncome ? (isSelected ? '#A3D9B0' : '#3D6346') : (isSelected ? '#F2A7A7' : '#9E3B3B') },
                                                            ]}
                                                        >
                                                            {t.isIncome ? '+ INGRESO CLIENTA' : '- EGRESO TALLER'}
                                                        </Text>
                                                    </View>
                                                    {isSelected && <Text style={{ color: '#C5A880', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.gridOptionTitle,
                                                        isSelected && styles.gridOptionTitleActive,
                                                    ]}
                                                >
                                                    {t.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Monto */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Monto en Pesos Colombianos (COP) *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: 750000"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>

                            {/* Medio de Pago con cuadrícula accesible */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Medio de Pago / Canal *</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {METHODS.map((m) => {
                                        const isSelected = paymentMethod === m.id;
                                        return (
                                            <TouchableOpacity
                                                key={m.id}
                                                style={[
                                                    styles.gridOptionCard,
                                                    isSelected && styles.gridOptionCardActive,
                                                    { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
                                                ]}
                                                onPress={() => setPaymentMethod(m.id)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                                                <Text
                                                    style={[
                                                        styles.gridOptionTitle,
                                                        isSelected && styles.gridOptionTitleActive,
                                                        { flex: 1 },
                                                    ]}
                                                >
                                                    {m.label}
                                                </Text>
                                                {isSelected && <Text style={{ color: '#C5A880', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Número de Referencia */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Comprobante / Número de Aprobación</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Transf #982341 / Aprobación Wompi"
                                    value={referenceNumber}
                                    onChangeText={setReferenceNumber}
                                />
                            </View>

                            {/* Notas */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Observaciones</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Anticipo correspondiente al 50% acordado"
                                    value={notes}
                                    onChangeText={setNotes}
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
                                    onPress={handleCreateTransaction}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#171411" />
                                    ) : (
                                        <Text style={styles.primaryGoldBtnText}>Registrar Transacción</Text>
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

