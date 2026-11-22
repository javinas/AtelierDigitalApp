// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: CONTROL FINANCIERO Y RESUMEN ECONÓMICO (M07)
// Archivo: src/components/commercial/FinancialControlTab.tsx
// ==============================================================================
// Experiencia simplificada de Alta Costura:
//   - Únicamente dos acciones principales: [+ Registrar Pago] y [− Registrar Gasto]
//   - Sugerencias a 1 toque (50% anticipo y liquidación de saldo)
//   - Anulación auditada con motivo obligatorio y control optimista PT409
//   - Manejo de avisos inline (cero Alert.alert)
//   - Coexistencia con M05: selección de proveedores y materiales 100% opcional
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
} from 'react-native';
import { Creation } from '../../types/creation';
import {
    CommercialCurrency,
    CommercialQuote,
    FinancialMovement,
    FinancialMovementType,
    FinancialPaymentMethod,
    FinancialStateSummary,
    MaterialItem,
    AtelierSupplier,
} from '../../types/commercial';
import {
    fetchCreationFinancialSummaryM07,
    fetchMaterials,
    fetchMovementsByCreationM07,
    fetchQuotesByCreation,
    fetchSuppliers,
    getLocalIsoDate,
    recordFinancialMovementM07,
    voidFinancialMovementM07,
} from '../../services/commercialService';
import { commercialStyles as styles } from './commercialStyles';

export interface FinancialControlTabProps {
    creation: Creation;
}

const PAYMENT_METHODS: { id: FinancialPaymentMethod; label: string; icon: string }[] = [
    { id: 'transfer', label: 'Transferencia Bancaria', icon: '🏦' },
    { id: 'wompi', label: 'Pasarela Wompi', icon: '⚡' },
    { id: 'bold', label: 'Datáfono Bold', icon: '📱' },
    { id: 'cash', label: 'Efectivo Atelier', icon: '💵' },
    { id: 'card', label: 'Tarjeta Crédito/Débito', icon: '💳' },
    { id: 'other', label: 'Otro Medio', icon: '🏷️' },
];

const INCOME_TYPES: { id: FinancialMovementType; label: string; desc: string }[] = [
    { id: 'advance', label: 'Anticipo Inicial (50%)', desc: 'Recaudo inicial formal para iniciar taller' },
    { id: 'installment', label: 'Abono Parcial a Saldo', desc: 'Pago parcial intermedio durante confección' },
    { id: 'final_payment', label: 'Liquidación / Pago Final', desc: 'Cancelación total contra entrega de la prenda' },
];

const EXPENSE_TYPES: { id: FinancialMovementType; label: string; desc: string }[] = [
    { id: 'material_purchase', label: 'Compra de Telas e Insumos', desc: 'Telas, forrería, cremalleras, hilos y avíos' },
    { id: 'workshop_expense', label: 'Gasto de Taller / Confección', desc: 'Servicios de bordado, confección o patronaje externo' },
    { id: 'refund', label: 'Reembolso a Clienta', desc: 'Devolución extraordinaria de dinero' },
];

const PAYMENT_STATUS_MAP = {
    unpaid: { label: 'Sin Recaudos', bg: '#FAF2F2', color: '#9E3B3B' },
    partially_paid: { label: 'Anticipo Recibido', bg: '#FFF8E7', color: '#B37D14' },
    paid_in_full: { label: 'Paz y Salvo (100%)', bg: '#F1F7F2', color: '#3D6346' },
};

export const FinancialControlTab: React.FC<FinancialControlTabProps> = ({ creation }) => {
    const [movements, setMovements] = useState<FinancialMovement[]>([]);
    const [summary, setSummary] = useState<FinancialStateSummary | null>(null);
    const [activeQuote, setActiveQuote] = useState<CommercialQuote | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    // Modales de acciones principales
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
    const [isVoidModalOpen, setIsVoidModalOpen] = useState<boolean>(false);
    const [voidTarget, setVoidTarget] = useState<FinancialMovement | null>(null);
    const [voidReason, setVoidReason] = useState<string>('');

    // Estado del formulario de Pago
    const [payType, setPayType] = useState<FinancialMovementType>('advance');
    const [payAmount, setPayAmount] = useState<string>('');
    const [payMethod, setPayMethod] = useState<FinancialPaymentMethod>('transfer');
    const [payReference, setPayReference] = useState<string>('');
    const [payNotes, setPayNotes] = useState<string>('');
    const [payFormError, setPayFormError] = useState<string | null>(null);

    // Estado del formulario de Gasto
    const [expType, setExpType] = useState<FinancialMovementType>('material_purchase');
    const [expAmount, setExpAmount] = useState<string>('');
    const [expCurrency, setExpCurrency] = useState<CommercialCurrency>('COP');
    const [expMethod, setExpMethod] = useState<FinancialPaymentMethod>('transfer');
    const [expNotes, setExpNotes] = useState<string>('');
    const [expReference, setExpReference] = useState<string>('');
    const [expFormError, setExpFormError] = useState<string | null>(null);

    // M05 Opciones opcionales de taller
    const [showM05Options, setShowM05Options] = useState<boolean>(false);
    const [suppliers, setSuppliers] = useState<AtelierSupplier[]>([]);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

    // Banners inline (cero Alert.alert)
    const [feedbackNotice, setFeedbackNotice] = useState<{
        tone: 'error' | 'warning' | 'success';
        title: string;
        text: string;
        isPt409?: boolean;
    } | null>(null);

    const loadFinancialData = async () => {
        setLoading(true);
        try {
            // 1. Cotización activa
            const { data: quotes } = await fetchQuotesByCreation(creation.id);
            const foundQuote = quotes?.find((q) => q.status === 'accepted') || quotes?.[0] || null;
            setActiveQuote(foundQuote);

            // 2. Resumen financiero puro (STABLE RPC M07)
            const { data: sumData } = await fetchCreationFinancialSummaryM07(creation.id);
            setSummary(sumData);

            // 3. Listado de movimientos (financial_movements M07)
            const { data: movs } = await fetchMovementsByCreationM07(creation.id);
            setMovements(movs);
        } catch {
            setFeedbackNotice({
                tone: 'error',
                title: 'Error de carga',
                text: 'No fue posible cargar el estado financiero del encargo.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (creation.id) {
            loadFinancialData();
        }
    }, [creation.id]);

    // Carga diferida opcional de proveedores y materiales M05 solo si se despliega la sección
    useEffect(() => {
        if (showM05Options && suppliers.length === 0 && materials.length === 0) {
            fetchSuppliers().then((res) => {
                if (res.data) setSuppliers(res.data);
            });
            fetchMaterials().then((res) => {
                if (res.data) setMaterials(res.data);
            });
        }
    }, [showM05Options]);

    // =========================================================================
    // ACCIÓN 1: REGISTRAR PAGO
    // =========================================================================
    const handleRegisterPayment = async () => {
        setPayFormError(null);
        setFeedbackNotice(null);

        const parsedAmount = parseFloat(payAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setPayFormError('Ingrese un monto válido superior a cero.');
            return;
        }

        setSaving(true);
        const currency = summary?.contract_currency || activeQuote?.currency || 'COP';

        const { data, error, errorDetails } = await recordFinancialMovementM07({
            creationId: creation.id,
            movementType: payType,
            amount: parsedAmount,
            currency: currency,
            paymentMethod: payMethod,
            movementDate: getLocalIsoDate(),
            referenceNumber: payReference.trim() || null,
            notes: payNotes.trim() || null,
            quoteId: activeQuote?.id || null,
        });

        setSaving(false);

        if (error) {
            setPayFormError(error);
            if (errorDetails?.code === 'M07_CONCURRENCY_CONFLICT') {
                setFeedbackNotice({
                    tone: 'warning',
                    title: 'Conflicto de Concurrencia (PT409)',
                    text: error,
                    isPt409: true,
                });
            }
        } else if (data) {
            setIsPaymentModalOpen(false);
            resetPaymentForm();
            await loadFinancialData();
            setFeedbackNotice({
                tone: 'success',
                title: 'Pago Registrado',
                text: `Recaudo de $${parsedAmount.toLocaleString('es-CO')} ${currency} registrado exitosamente.`,
            });
        }
    };

    const resetPaymentForm = () => {
        setPayType('advance');
        setPayAmount('');
        setPayMethod('transfer');
        setPayReference('');
        setPayNotes('');
        setPayFormError(null);
    };

    // =========================================================================
    // ACCIÓN 2: REGISTRAR GASTO
    // =========================================================================
    const handleRegisterExpense = async () => {
        setExpFormError(null);
        setFeedbackNotice(null);

        const parsedAmount = parseFloat(expAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setExpFormError('Ingrese un monto válido superior a cero.');
            return;
        }

        if (!expNotes.trim()) {
            setExpFormError('Indique el concepto o descripción del gasto de taller.');
            return;
        }

        setSaving(true);
        const { data, error, errorDetails } = await recordFinancialMovementM07({
            creationId: creation.id,
            movementType: expType,
            amount: parsedAmount,
            currency: expCurrency,
            paymentMethod: expMethod,
            movementDate: getLocalIsoDate(),
            referenceNumber: expReference.trim() || null,
            notes: expNotes.trim(),
            quoteId: activeQuote?.id || null,
            supplierId: selectedSupplierId || null,
            materialId: selectedMaterialId || null,
        });

        setSaving(false);

        if (error) {
            setExpFormError(error);
            if (errorDetails?.code === 'M07_CONCURRENCY_CONFLICT') {
                setFeedbackNotice({
                    tone: 'warning',
                    title: 'Conflicto de Concurrencia (PT409)',
                    text: error,
                    isPt409: true,
                });
            }
        } else if (data) {
            setIsExpenseModalOpen(false);
            resetExpenseForm();
            await loadFinancialData();
            setFeedbackNotice({
                tone: 'success',
                title: 'Gasto Registrado',
                text: `Gasto de $${parsedAmount.toLocaleString('es-CO')} ${expCurrency} registrado en taller.`,
            });
        }
    };

    const resetExpenseForm = () => {
        setExpType('material_purchase');
        setExpAmount('');
        setExpCurrency('COP');
        setExpMethod('transfer');
        setExpNotes('');
        setExpReference('');
        setSelectedSupplierId(null);
        setSelectedMaterialId(null);
        setShowM05Options(false);
        setExpFormError(null);
    };

    // =========================================================================
    // ANULACIÓN AUDITADA
    // =========================================================================
    const handleOpenVoidModal = (movement: FinancialMovement) => {
        setVoidTarget(movement);
        setVoidReason('');
        setIsVoidModalOpen(true);
    };

    const handleConfirmVoid = async () => {
        if (!voidTarget) return;

        if (!voidReason.trim()) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Motivo Requerido',
                text: 'Debe ingresar un motivo formal y detallado para anular el movimiento.',
            });
            return;
        }

        setSaving(true);
        const { data, error, errorDetails } = await voidFinancialMovementM07({
            movementId: voidTarget.id,
            expectedRowVersion: voidTarget.row_version,
            voidReason: voidReason.trim(),
        });
        setSaving(false);

        if (error) {
            setIsVoidModalOpen(false);
            if (errorDetails?.code === 'M07_CONCURRENCY_CONFLICT') {
                setFeedbackNotice({
                    tone: 'warning',
                    title: 'Conflicto de Concurrencia (PT409)',
                    text: error,
                    isPt409: true,
                });
            } else {
                setFeedbackNotice({
                    tone: 'error',
                    title: 'Error al anular movimiento',
                    text: error,
                });
            }
        } else if (data) {
            setIsVoidModalOpen(false);
            setVoidTarget(null);
            setVoidReason('');
            await loadFinancialData();
            setFeedbackNotice({
                tone: 'success',
                title: 'Movimiento Anulado',
                text: 'El movimiento ha sido anulado y los saldos fueron revertidos atómicamente.',
            });
        }
    };

    // =========================================================================
    // SUGERENCIAS A 1 TOQUE (PAGOS)
    // =========================================================================
    const applyFiftyPercentSuggestion = () => {
        if (!summary) return;
        const total = summary.quoted_total || 0;
        const half = Math.round(total * 0.5);
        if (half > 0) {
            setPayAmount(String(half));
            setPayType('advance');
            setPayNotes('Anticipo sugerido del 50%');
        }
    };

    const applyLiquidationSuggestion = () => {
        if (!summary) return;
        const balance = summary.balance_pending || 0;
        if (balance > 0) {
            setPayAmount(String(balance));
            setPayType(summary.total_income > 0 ? 'final_payment' : 'advance');
            setPayNotes('Liquidación total de saldo pendiente');
        }
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

    const currentStatus = summary?.payment_status || 'unpaid';
    const statusBadge = PAYMENT_STATUS_MAP[currentStatus] || PAYMENT_STATUS_MAP.unpaid;
    const currency = summary?.contract_currency || 'COP';

    return (
        <View style={styles.sectionCard}>
            {/* Banner inline descartable */}
            {feedbackNotice && (
                <View
                    style={{
                        backgroundColor:
                            feedbackNotice.tone === 'error'
                                ? '#FAF2F2'
                                : feedbackNotice.tone === 'warning'
                                  ? '#FFF8E7'
                                  : '#F1F7F2',
                        borderWidth: 1,
                        borderColor:
                            feedbackNotice.tone === 'error'
                                ? '#E8C5C5'
                                : feedbackNotice.tone === 'warning'
                                  ? '#F2D48E'
                                  : '#C2DFCA',
                        borderRadius: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        marginBottom: 16,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color:
                                    feedbackNotice.tone === 'error'
                                        ? '#9E3B3B'
                                        : feedbackNotice.tone === 'warning'
                                          ? '#8A5C12'
                                          : '#3D6346',
                            }}
                        >
                            {feedbackNotice.title}
                        </Text>
                        <Text
                            style={{
                                fontSize: 12,
                                marginTop: 3,
                                color:
                                    feedbackNotice.tone === 'error'
                                        ? '#9E3B3B'
                                        : feedbackNotice.tone === 'warning'
                                          ? '#8A5C12'
                                          : '#3D6346',
                            }}
                        >
                            {feedbackNotice.text}
                        </Text>
                        {feedbackNotice.isPt409 && (
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#C5A880',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    marginTop: 8,
                                    alignSelf: 'flex-start',
                                }}
                                onPress={() => {
                                    setFeedbackNotice(null);
                                    loadFinancialData();
                                }}
                            >
                                <Text style={{ color: '#171411', fontSize: 11, fontWeight: '700' }}>
                                    ↻ Recargar Expediente
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setFeedbackNotice(null)} style={{ padding: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#766B62' }}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Cabecera con 2 Acciones Principales */}
            <View style={styles.sectionCardHeader}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.sectionCardTitleGold}>COSTOS & PAGOS DEL ENCARGO</Text>
                        <View
                            style={[
                                styles.flowPill,
                                { backgroundColor: statusBadge.bg, borderColor: '#E6D9C8', borderWidth: 1 },
                            ]}
                        >
                            <Text style={[styles.flowPillText, { color: statusBadge.color }]}>
                                {statusBadge.label.toUpperCase()}
                            </Text>
                        </View>
                        {summary?.is_financially_cleared && (
                            <View
                                style={[
                                    styles.flowPill,
                                    { backgroundColor: '#F1F7F2', borderColor: '#3D6346', borderWidth: 1 },
                                ]}
                            >
                                <Text style={[styles.flowPillText, { color: '#3D6346' }]}>
                                    ✦ PAZ Y SALVO (M06)
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.sectionCardSubtitle}>
                        Control ágil de anticipos de clienta y compras reales de taller
                    </Text>
                </View>

                {/* ÚNICAMENTE DOS ACCIONES PRINCIPALES */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={() => {
                            resetPaymentForm();
                            setIsPaymentModalOpen(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryGoldBtnText}>+ Registrar Pago</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryOutlineBtn}
                        onPress={() => {
                            resetExpenseForm();
                            setIsExpenseModalOpen(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.secondaryOutlineBtnText}>− Registrar Gasto</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tarjetas KPI de Resumen Económico */}
            {summary && (
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Total Cotizado</Text>
                        <Text style={styles.kpiValue}>
                            ${Number(summary.quoted_total).toLocaleString('es-CO')} {currency}
                        </Text>
                    </View>

                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Total Recaudado</Text>
                        <Text style={styles.kpiValueGreen}>
                            ${Number(summary.total_income).toLocaleString('es-CO')} {currency}
                        </Text>
                    </View>

                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Saldo Pendiente</Text>
                        <Text
                            style={[
                                styles.kpiValue,
                                { color: summary.balance_pending > 0 ? '#B37D14' : '#3D6346' },
                            ]}
                        >
                            ${Number(summary.balance_pending).toLocaleString('es-CO')} {currency}
                        </Text>
                    </View>

                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Egresos Incurridos</Text>
                        <Text style={[styles.kpiValue, { color: '#9E3B3B' }]}>
                            ${Number(summary.total_expenses_cop).toLocaleString('es-CO')} COP
                            {Number(summary.total_expenses_usd) > 0 && ` + $${Number(summary.total_expenses_usd).toLocaleString('en-US')} USD`}
                        </Text>
                    </View>

                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Margen Proyectado</Text>
                        <Text style={styles.kpiValueGold}>
                            ${Number(summary.projected_gross_margin).toLocaleString('es-CO')} {currency}
                        </Text>
                    </View>
                </View>
            )}

            {/* Listado de Movimientos Financieros */}
            {movements.length === 0 ? (
                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateTitle}>Sin movimientos financieros registrados</Text>
                    <Text style={styles.emptyStateText}>
                        No hay abonos de clienta ni gastos de taller para este encargo.
                        Utilice los botones superiores para registrar el anticipo del 50% o compras de materiales.
                    </Text>
                </View>
            ) : (
                <View>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Fecha & Concepto</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Medio / Referencia</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Monto</Text>
                        <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'center' }]}>Acción</Text>
                    </View>

                    {movements.map((m) => {
                        const isIncome = ['advance', 'installment', 'final_payment'].includes(m.movement_type);
                        const isRefund = m.movement_type === 'refund';
                        const methodInfo = PAYMENT_METHODS.find((pm) => pm.id === m.payment_method) || PAYMENT_METHODS[0];

                        return (
                            <View
                                key={m.id}
                                style={[
                                    styles.tableDataRow,
                                    m.is_void && { opacity: 0.5, backgroundColor: '#FAF8F5' },
                                ]}
                            >
                                <View style={{ flex: 1.2 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text
                                            style={[
                                                styles.tableDataText,
                                                { fontWeight: '700' },
                                                m.is_void && { textDecorationLine: 'line-through' },
                                            ]}
                                        >
                                            {m.movement_type === 'advance'
                                                ? 'Anticipo (50%)'
                                                : m.movement_type === 'installment'
                                                  ? 'Abono Parcial'
                                                  : m.movement_type === 'final_payment'
                                                    ? 'Pago Final'
                                                    : m.movement_type === 'material_purchase'
                                                      ? 'Compra Insumos'
                                                      : m.movement_type === 'workshop_expense'
                                                        ? 'Gasto Taller'
                                                        : 'Reembolso'}
                                        </Text>
                                        {m.is_void && (
                                            <View style={[styles.flowPill, { backgroundColor: '#FAF2F2' }]}>
                                                <Text style={[styles.flowPillText, { color: '#9E3B3B', fontSize: 9 }]}>
                                                    ANULADO
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.tableDataSubText}>
                                        {m.movement_date} · v{m.row_version}
                                    </Text>
                                    {m.is_void && m.void_reason && (
                                        <Text style={[styles.tableDataSubText, { color: '#9E3B3B', fontStyle: 'italic' }]}>
                                            Motivo: {m.void_reason}
                                        </Text>
                                    )}
                                </View>

                                <View style={{ flex: 1.5 }}>
                                    <Text style={styles.tableDataText}>
                                        {methodInfo.icon} {methodInfo.label}
                                    </Text>
                                    <Text style={styles.tableDataSubText}>
                                        {m.reference_number ? `Ref: ${m.reference_number}` : 'Sin ref.'}
                                        {m.notes ? ` · ${m.notes}` : ''}
                                    </Text>
                                </View>

                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text
                                        style={[
                                            styles.tableDataText,
                                            {
                                                fontFamily: 'serif',
                                                fontWeight: '700',
                                                color: isIncome ? '#3D6346' : isRefund ? '#B37D14' : '#9E3B3B',
                                            },
                                            m.is_void && { textDecorationLine: 'line-through' },
                                        ]}
                                    >
                                        {isIncome ? '+' : '−'}${Number(m.amount).toLocaleString('es-CO')} {m.currency}
                                    </Text>
                                </View>

                                <View style={{ width: 70, alignItems: 'center' }}>
                                    {!m.is_void && (
                                        <TouchableOpacity
                                            style={{
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                borderWidth: 1,
                                                borderColor: '#E8C5C5',
                                                backgroundColor: '#FAF2F2',
                                            }}
                                            onPress={() => handleOpenVoidModal(m)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontSize: 10, color: '#9E3B3B', fontWeight: '600' }}>
                                                Anular
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* ================================================================= */}
            {/* MODAL 1: REGISTRAR PAGO (RECAUDO DE CLIENTA)                     */}
            {/* ================================================================= */}
            <Modal
                visible={isPaymentModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsPaymentModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxWidth: 580 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Registrar Pago de Clienta</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Encargo: {creation.name} · Moneda: {currency}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
                            {payFormError && (
                                <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                    <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{payFormError}</Text>
                                </View>
                            )}

                            {/* Botones de sugerencia a 1 toque */}
                            {summary && summary.quoted_total > 0 && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#A78350', marginBottom: 6 }}>
                                        ✦ SUGERENCIAS A 1 TOQUE:
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                        {summary.total_income === 0 && (
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: '#FFF8E7',
                                                    borderWidth: 1,
                                                    borderColor: '#E6D9C8',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 7,
                                                    borderRadius: 8,
                                                }}
                                                onPress={applyFiftyPercentSuggestion}
                                            >
                                                <Text style={{ color: '#8A5C12', fontSize: 12, fontWeight: '600' }}>
                                                    50% Anticipo (${Math.round(summary.quoted_total * 0.5).toLocaleString('es-CO')})
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {summary.balance_pending > 0 && (
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: '#F1F7F2',
                                                    borderWidth: 1,
                                                    borderColor: '#C2DFCA',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 7,
                                                    borderRadius: 8,
                                                }}
                                                onPress={applyLiquidationSuggestion}
                                            >
                                                <Text style={{ color: '#3D6346', fontSize: 12, fontWeight: '600' }}>
                                                    Liquidar Saldo (${Number(summary.balance_pending).toLocaleString('es-CO')})
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Monto */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Monto del Pago ({currency}) *</Text>
                                <TextInput
                                    style={[styles.formInput, { fontSize: 16, fontWeight: '700', color: '#171411' }]}
                                    placeholder="Ej: 2500000"
                                    keyboardType="numeric"
                                    value={payAmount}
                                    onChangeText={setPayAmount}
                                />
                            </View>

                            {/* Tipo de Pago */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Tipo de Pago *</Text>
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    {INCOME_TYPES.map((t) => {
                                        const isSel = payType === t.id;
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                style={[
                                                    styles.gridOptionCard,
                                                    isSel && styles.gridOptionCardActive,
                                                    { flexGrow: 1, flexBasis: '30%' },
                                                ]}
                                                onPress={() => setPayType(t.id)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={[styles.gridOptionTitle, isSel && styles.gridOptionTitleActive]}>
                                                    {t.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Medio de Pago */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Medio de Pago *</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {PAYMENT_METHODS.map((m) => {
                                        const isSel = payMethod === m.id;
                                        return (
                                            <TouchableOpacity
                                                key={m.id}
                                                style={[
                                                    styles.gridOptionCard,
                                                    isSel && styles.gridOptionCardActive,
                                                    { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
                                                ]}
                                                onPress={() => setPayMethod(m.id)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={{ fontSize: 14 }}>{m.icon}</Text>
                                                <Text style={[styles.gridOptionTitle, isSel && styles.gridOptionTitleActive, { flex: 1 }]}>
                                                    {m.label}
                                                </Text>
                                                {isSel && <Text style={{ color: '#C5A880', fontWeight: '700' }}>✓</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Referencia opcional */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Número de Comprobante / Aprobación (Opcional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Transf #982341 / Aprobación Wompi"
                                    value={payReference}
                                    onChangeText={setPayReference}
                                />
                            </View>

                            {/* Notas opcionales */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Concepto u Observaciones (Opcional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Anticipo 50% acordado"
                                    value={payNotes}
                                    onChangeText={setPayNotes}
                                />
                            </View>

                            {/* Botones de acción del modal */}
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                                <TouchableOpacity
                                    style={styles.secondaryOutlineBtn}
                                    onPress={() => setIsPaymentModalOpen(false)}
                                >
                                    <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.primaryGoldBtn}
                                    onPress={handleRegisterPayment}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#171411" />
                                    ) : (
                                        <Text style={styles.primaryGoldBtnText}>Registrar Pago</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ================================================================= */}
            {/* MODAL 2: REGISTRAR GASTO (EGRESO DE TALLER)                      */}
            {/* ================================================================= */}
            <Modal
                visible={isExpenseModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsExpenseModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxWidth: 600 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Registrar Gasto de Taller</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Compras de insumos y costos operativos · {creation.name}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsExpenseModalOpen(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
                            {expFormError && (
                                <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                    <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{expFormError}</Text>
                                </View>
                            )}

                            {/* Monto y Divisa */}
                            <View style={styles.formRow}>
                                <View style={[styles.formCol, { flex: 2 }]}>
                                    <Text style={styles.formLabel}>Monto del Gasto *</Text>
                                    <TextInput
                                        style={[styles.formInput, { fontSize: 16, fontWeight: '700', color: '#171411' }]}
                                        placeholder="Ej: 350000"
                                        keyboardType="numeric"
                                        value={expAmount}
                                        onChangeText={setExpAmount}
                                    />
                                </View>
                                <View style={[styles.formCol, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Divisa *</Text>
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                        <TouchableOpacity
                                            style={[
                                                styles.chipBtn,
                                                expCurrency === 'COP' && styles.chipBtnActive,
                                                { flex: 1, alignItems: 'center' },
                                            ]}
                                            onPress={() => setExpCurrency('COP')}
                                        >
                                            <Text style={[styles.chipBtnText, expCurrency === 'COP' && styles.chipBtnTextActive]}>
                                                COP
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.chipBtn,
                                                expCurrency === 'USD' && styles.chipBtnActive,
                                                { flex: 1, alignItems: 'center' },
                                            ]}
                                            onPress={() => setExpCurrency('USD')}
                                        >
                                            <Text style={[styles.chipBtnText, expCurrency === 'USD' && styles.chipBtnTextActive]}>
                                                USD
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Concepto / Descripción */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Concepto / Descripción del Gasto *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Tela de forro, cremallera invisible y entretela"
                                    value={expNotes}
                                    onChangeText={setExpNotes}
                                />
                            </View>

                            {/* Tipo de Gasto */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Tipo de Gasto *</Text>
                                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                    {EXPENSE_TYPES.map((t) => {
                                        const isSel = expType === t.id;
                                        return (
                                            <TouchableOpacity
                                                key={t.id}
                                                style={[
                                                    styles.gridOptionCard,
                                                    isSel && styles.gridOptionCardActive,
                                                    { flexGrow: 1, flexBasis: '45%' },
                                                ]}
                                                onPress={() => setExpType(t.id)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={[styles.gridOptionTitle, isSel && styles.gridOptionTitleActive]}>
                                                    {t.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Medio de Pago */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Medio de Pago *</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {PAYMENT_METHODS.slice(0, 4).map((m) => {
                                        const isSel = expMethod === m.id;
                                        return (
                                            <TouchableOpacity
                                                key={m.id}
                                                style={[
                                                    styles.gridOptionCard,
                                                    isSel && styles.gridOptionCardActive,
                                                    { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
                                                ]}
                                                onPress={() => setExpMethod(m.id)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={{ fontSize: 14 }}>{m.icon}</Text>
                                                <Text style={[styles.gridOptionTitle, isSel && styles.gridOptionTitleActive, { flex: 1 }]}>
                                                    {m.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Referencia / Factura */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Factura / Recibo / N° Remisión (Opcional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Ej: Factura #4582 / Ticket de almacén"
                                    value={expReference}
                                    onChangeText={setExpReference}
                                />
                            </View>

                            {/* Sección Colapsable Opcional M05 */}
                            <View style={{ marginTop: 8, marginBottom: 16 }}>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: '#FAF8F5',
                                        padding: 10,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#E6D9C8',
                                    }}
                                    onPress={() => setShowM05Options(!showM05Options)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#A78350' }}>
                                        ✦ Opciones de Taller (M05 — Opcional)
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#A78350' }}>
                                        {showM05Options ? '▲ Ocultar' : '▼ Expandir'}
                                    </Text>
                                </TouchableOpacity>

                                {showM05Options && (
                                    <View
                                        style={{
                                            padding: 12,
                                            borderWidth: 1,
                                            borderColor: '#E6D9C8',
                                            borderTopWidth: 0,
                                            borderBottomLeftRadius: 8,
                                            borderBottomRightRadius: 8,
                                            backgroundColor: '#FAFAF8',
                                            gap: 12,
                                        }}
                                    >
                                        <Text style={{ fontSize: 11, color: '#766B62' }}>
                                            Asocie voluntariamente un proveedor o tela del catálogo M05. Esto no altera existencias ni inventario.
                                        </Text>

                                        {/* Selector de Proveedor opcional */}
                                        <View>
                                            <Text style={styles.formLabel}>Proveedor (Opcional)</Text>
                                            {suppliers.length > 0 ? (
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6 }}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.chipBtn,
                                                            selectedSupplierId === null && styles.chipBtnActive,
                                                        ]}
                                                        onPress={() => setSelectedSupplierId(null)}
                                                    >
                                                        <Text style={[styles.chipBtnText, selectedSupplierId === null && styles.chipBtnTextActive]}>
                                                            Ninguno
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {suppliers.map((s) => (
                                                        <TouchableOpacity
                                                            key={s.id}
                                                            style={[
                                                                styles.chipBtn,
                                                                selectedSupplierId === s.id && styles.chipBtnActive,
                                                            ]}
                                                            onPress={() => setSelectedSupplierId(s.id)}
                                                        >
                                                            <Text style={[styles.chipBtnText, selectedSupplierId === s.id && styles.chipBtnTextActive]}>
                                                                {s.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            ) : (
                                                <Text style={{ fontSize: 11, color: '#8A7E72', fontStyle: 'italic' }}>
                                                    Cargando directorio de proveedores...
                                                </Text>
                                            )}
                                        </View>

                                        {/* Selector de Material opcional */}
                                        <View>
                                            <Text style={styles.formLabel}>Material / Tela (Opcional)</Text>
                                            {materials.length > 0 ? (
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6 }}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.chipBtn,
                                                            selectedMaterialId === null && styles.chipBtnActive,
                                                        ]}
                                                        onPress={() => setSelectedMaterialId(null)}
                                                    >
                                                        <Text style={[styles.chipBtnText, selectedMaterialId === null && styles.chipBtnTextActive]}>
                                                            Ninguno
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {materials.slice(0, 15).map((mat) => (
                                                        <TouchableOpacity
                                                            key={mat.id}
                                                            style={[
                                                                styles.chipBtn,
                                                                selectedMaterialId === mat.id && styles.chipBtnActive,
                                                            ]}
                                                            onPress={() => setSelectedMaterialId(mat.id)}
                                                        >
                                                            <Text style={[styles.chipBtnText, selectedMaterialId === mat.id && styles.chipBtnTextActive]}>
                                                                {mat.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            ) : (
                                                <Text style={{ fontSize: 11, color: '#8A7E72', fontStyle: 'italic' }}>
                                                    Cargando catálogo de materiales...
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Botones de acción del modal */}
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                                <TouchableOpacity
                                    style={styles.secondaryOutlineBtn}
                                    onPress={() => setIsExpenseModalOpen(false)}
                                >
                                    <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.primaryGoldBtn}
                                    onPress={handleRegisterExpense}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#171411" />
                                    ) : (
                                        <Text style={styles.primaryGoldBtnText}>Registrar Gasto</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ================================================================= */}
            {/* MODAL 3: ANULACIÓN AUDITADA DE MOVIMIENTO                        */}
            {/* ================================================================= */}
            <Modal
                visible={isVoidModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsVoidModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { maxWidth: 500 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Anular Movimiento Financiero</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Auditoría de taller · Acción reversible en saldos
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsVoidModalOpen(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {voidTarget && (
                            <View style={{ marginBottom: 16, backgroundColor: '#FAF8F5', padding: 12, borderRadius: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#171411' }}>
                                    {voidTarget.movement_type === 'advance' ? 'Anticipo' : voidTarget.movement_type} · ${Number(voidTarget.amount).toLocaleString('es-CO')} {voidTarget.currency}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#766B62', marginTop: 2 }}>
                                    Fecha: {voidTarget.movement_date} · Versión: v{voidTarget.row_version}
                                </Text>
                            </View>
                        )}

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Motivo de la Anulación *</Text>
                            <TextInput
                                style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
                                placeholder="Indique detalladamente el motivo de la anulación..."
                                multiline
                                numberOfLines={3}
                                value={voidReason}
                                onChangeText={setVoidReason}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                            <TouchableOpacity
                                style={styles.secondaryOutlineBtn}
                                onPress={() => setIsVoidModalOpen(false)}
                            >
                                <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.primaryGoldBtn,
                                    { backgroundColor: '#9E3B3B' },
                                ]}
                                onPress={handleConfirmVoid}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={[styles.primaryGoldBtnText, { color: '#FFFFFF' }]}>
                                        Confirmar Anulación
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
