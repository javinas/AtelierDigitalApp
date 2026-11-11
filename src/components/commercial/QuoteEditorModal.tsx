// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MODAL DE EDICIÓN Y EMISIÓN DE COTIZACIÓN FORMAL
// Archivo: src/components/commercial/QuoteEditorModal.tsx
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
    DesignProposal,
    QuoteCalculation,
} from '../../types/commercial';
import { createQuote } from '../../services/commercialService';
import { commercialStyles as styles } from './commercialStyles';

export interface QuoteEditorModalProps {
    visible: boolean;
    creation: Creation;
    activeProposal?: DesignProposal | null;
    onClose: () => void;
    onQuoteCreated: (quote: CommercialQuote) => void;
}

export const QuoteEditorModal: React.FC<QuoteEditorModalProps> = ({
    visible,
    creation,
    activeProposal,
    onClose,
    onQuoteCreated,
}) => {
    const [currency, setCurrency] = useState<CommercialCurrency>('COP');
    const [materialsSubtotal, setMaterialsSubtotal] = useState<string>('0');
    const [laborSubtotal, setLaborSubtotal] = useState<string>('850000');
    const [discountPercentage, setDiscountPercentage] = useState<string>('0');
    const [taxPercentage, setTaxPercentage] = useState<string>('0'); // 0% o 19%
    const [suggestedAdvancePercentage, setSuggestedAdvancePercentage] = useState<string>('50');
    const [validDays, setValidDays] = useState<string>('15');
    const [terms, setTerms] = useState<string>(
        '1. El inicio de patronaje y corte requiere la cancelación del anticipo del 50%.\n2. Incluye dos (2) sesiones de fitting y prueba de glasilla sobre clienta.\n3. Saldo del 50% pagadero contra entrega final de la prenda terminada.\n4. Propiedad intelectual y autoría del diseño exclusivo de Katherine Carroll.'
    );
    const [notes, setNotes] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Inicializar montos desde la propuesta si existe (conservando moneda y valores originales)
    useEffect(() => {
        if (visible) {
            if (activeProposal) {
                const curr = activeProposal.currency || activeProposal.snapshot?.currency || 'COP';
                setCurrency(curr);
                if (activeProposal.snapshot) {
                    setMaterialsSubtotal(String(activeProposal.snapshot.materials_cost ?? 0));
                    setLaborSubtotal(String(activeProposal.snapshot.labor_cost ?? 0));
                } else {
                    setMaterialsSubtotal('0');
                    setLaborSubtotal('0');
                }
            } else {
                setCurrency('COP');
                setMaterialsSubtotal('0');
                setLaborSubtotal('850000');
            }
            setErrorMsg(null);
        }
    }, [visible, activeProposal]);

    const roundByCurrency = (value: number) =>
        currency === 'USD' ? Math.round(value * 100) / 100 : Math.round(value);

    // Cálculos dinámicos
    const matVal = parseFloat(materialsSubtotal) || 0;
    const labVal = parseFloat(laborSubtotal) || 0;
    const subtotal = roundByCurrency(matVal + labVal);

    const discPct = Math.min(100, Math.max(0, parseFloat(discountPercentage) || 0));
    const discountAmount = roundByCurrency((subtotal * discPct) / 100);
    const subtotalAfterDiscount = roundByCurrency(subtotal - discountAmount);

    const taxPct = Math.min(100, Math.max(0, parseFloat(taxPercentage) || 0));
    const taxAmount = roundByCurrency((subtotalAfterDiscount * taxPct) / 100);

    const total = roundByCurrency(subtotalAfterDiscount + taxAmount);

    const advPct = Math.min(100, Math.max(0, parseFloat(suggestedAdvancePercentage) || 50));
    const suggestedAdvanceAmount = roundByCurrency((total * advPct) / 100);

    const sourceProposalCurrency =
        activeProposal?.currency || activeProposal?.snapshot?.currency || null;
    const hasCurrencyMismatch = Boolean(
        activeProposal && sourceProposalCurrency && sourceProposalCurrency !== currency
    );

    const formatPrice = (val: number) => {
        if (currency === 'USD') {
            return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
        }
        return `$${Math.round(val).toLocaleString('es-CO')} COP`;
    };

    const handleSaveQuote = async () => {
        setErrorMsg(null);
        if (total <= 0) {
            setErrorMsg('El valor total de la cotización debe ser superior a cero.');
            return;
        }

        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + (parseInt(validDays, 10) || 15));

        const calculation: QuoteCalculation = {
            materials_subtotal: matVal,
            labor_subtotal: labVal,
            subtotal,
            discount_percentage: discPct,
            discount_amount: discountAmount,
            tax_percentage: taxPct,
            tax_amount: taxAmount,
            total,
            suggested_advance_percentage: advPct,
            suggested_advance_amount: suggestedAdvanceAmount,
        };

        setSaving(true);
        const clientName = creation.client?.full_name || 'Clienta de Alta Costura';
        const clientId = creation.client?.id || null;

        const { data, error } = await createQuote({
            creation_id: creation.id,
            proposal_id: activeProposal?.id || null,
            currency,
            calculation,
            proposal_snapshot: activeProposal?.snapshot || null,
            client_name_snapshot: clientName,
            client_id_snapshot: clientId,
            creation_name_snapshot: creation.name,
            valid_until: validUntilDate.toISOString().split('T')[0],
            terms_and_conditions: terms.trim() || null,
            notes: notes.trim() || null,
        });

        setSaving(false);

        if (error) {
            setErrorMsg(error);
        } else if (data) {
            onQuoteCreated(data);
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { maxWidth: 640 }]}>
                    {/* Cabecera */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Emitir Cotización Formal A4</Text>
                            <Text style={styles.sectionCardSubtitle}>
                                Snapshot económico inmutable · Atelier By Katherine Carroll
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                            <Text style={styles.modalCloseBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                        {errorMsg && (
                            <View style={{ backgroundColor: '#FAF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                <Text style={{ color: '#9E3B3B', fontSize: 12 }}>{errorMsg}</Text>
                            </View>
                        )}

                        {/* Metadatos de Encargo */}
                        <View style={{ backgroundColor: '#FAF8F5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
                            <Text style={{ fontSize: 11, color: '#8A7E72', textTransform: 'uppercase', fontWeight: '700' }}>
                                Creación & Destinataria
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#171411', marginTop: 2 }}>
                                {creation.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#766B62', marginTop: 1 }}>
                                Clienta: {creation.client?.full_name || 'Sin clienta asignada'}
                            </Text>
                            {activeProposal && (
                                <Text style={{ fontSize: 11, color: '#8A6A4A', fontWeight: '600', marginTop: 4 }}>
                                    Propuesta base: {activeProposal.proposal_number} · v{activeProposal.version} ({activeProposal.status === 'approved' ? 'Aprobada' : activeProposal.status}) · {sourceProposalCurrency || 'COP'}
                                </Text>
                            )}
                        </View>

                        {hasCurrencyMismatch && (
                            <View style={{ backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#F2D48E', padding: 10, borderRadius: 8, marginBottom: 14 }}>
                                <Text style={{ color: '#8A6A4A', fontSize: 11, fontWeight: '600' }}>
                                    Divisa cambiada manualmente respecto a la propuesta ({sourceProposalCurrency} → {currency}). No se realiza conversión automática COP/USD; verifique los montos ingresados en {currency}.
                                </Text>
                            </View>
                        )}

                        {/* Selector de Divisa Comercial */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAF8F5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
                            <View>
                                <Text style={{ fontSize: 11, color: '#8A7E72', textTransform: 'uppercase', fontWeight: '700' }}>
                                    Divisa de la Cotización
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#171411', marginTop: 2 }}>
                                    {currency === 'USD' ? 'Dólares Americanos (USD)' : 'Pesos Colombianos (COP)'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', backgroundColor: '#EFECE6', borderRadius: 6, padding: 2 }}>
                                <TouchableOpacity
                                    style={[
                                        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
                                        currency === 'COP' && { backgroundColor: '#171411' },
                                    ]}
                                    onPress={() => setCurrency('COP')}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: currency === 'COP' ? '#FAF8F5' : '#766B62' }}>
                                        COP ($)
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
                                        currency === 'USD' && { backgroundColor: '#171411' },
                                    ]}
                                    onPress={() => setCurrency('USD')}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: currency === 'USD' ? '#FAF8F5' : '#766B62' }}>
                                        USD ($)
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Desglose Económico */}
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Subtotal Telas e Insumos ({currency})</Text>
                                <TextInput
                                    style={styles.formInput}
                                    keyboardType="numeric"
                                    value={materialsSubtotal}
                                    onChangeText={setMaterialsSubtotal}
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Mano de Obra & Patronaje CAD ({currency})</Text>
                                <TextInput
                                    style={styles.formInput}
                                    keyboardType="numeric"
                                    value={laborSubtotal}
                                    onChangeText={setLaborSubtotal}
                                />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Descuento Comercial (%)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    keyboardType="numeric"
                                    value={discountPercentage}
                                    onChangeText={setDiscountPercentage}
                                    placeholder="0"
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Impuesto IVA (%)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    keyboardType="numeric"
                                    value={taxPercentage}
                                    onChangeText={setTaxPercentage}
                                    placeholder="0 ó 19"
                                />
                            </View>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Anticipo Sugerido (%)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    keyboardType="numeric"
                                    value={suggestedAdvancePercentage}
                                    onChangeText={setSuggestedAdvancePercentage}
                                    placeholder="50"
                                />
                            </View>
                        </View>

                        {/* Cuadro Resumen Calculado */}
                        <View style={{ backgroundColor: '#F8F6F2', borderWidth: 1, borderColor: '#E6D9C8', borderRadius: 12, padding: 14, marginVertical: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 12, color: '#766B62' }}>Subtotal Bruto:</Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#171411' }}>
                                    {formatPrice(subtotal)}
                                </Text>
                            </View>
                            {discPct > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, color: '#3D6346' }}>Descuento ({discPct}%):</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#3D6346' }}>
                                        -{formatPrice(discountAmount)}
                                    </Text>
                                </View>
                            )}
                            {taxPct > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, color: '#766B62' }}>IVA ({taxPct}%):</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#171411' }}>
                                        +{formatPrice(taxAmount)}
                                    </Text>
                                </View>
                            )}
                            <View style={{ borderTopWidth: 1, borderTopColor: '#E6D9C8', paddingTop: 8, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '700', color: '#171411' }}>
                                    TOTAL COTIZADO:
                                </Text>
                                <Text style={{ fontFamily: 'serif', fontSize: 18, fontWeight: '700', color: '#A78350' }}>
                                    {formatPrice(total)}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A6A4A' }}>
                                    Anticipo Requerido ({advPct}%):
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#8A6A4A' }}>
                                    {formatPrice(suggestedAdvanceAmount)}
                                </Text>
                            </View>
                        </View>

                        {/* Condiciones y Plazo */}
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, styles.formCol]}>
                                <Text style={styles.formLabel}>Validez de la Oferta (Días)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    keyboardType="numeric"
                                    value={validDays}
                                    onChangeText={setValidDays}
                                    placeholder="15"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Condiciones Comerciales y de Atelier</Text>
                            <TextInput
                                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                                multiline
                                numberOfLines={3}
                                value={terms}
                                onChangeText={setTerms}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Observaciones Privadas de Taller</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Notas internas sobre caídas de tela o acuerdos con la clienta"
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </ScrollView>

                    {/* Botones de acción */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: '#F5F3EF', paddingTop: 14 }}>
                        <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={onClose}>
                            <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.primaryGoldBtn}
                            onPress={handleSaveQuote}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#171411" />
                            ) : (
                                <Text style={styles.primaryGoldBtnText}>Emitir Cotización Inmutable</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

