// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: DOCUMENTO FORMAL A4 DE COTIZACIÓN
// Archivo: src/components/commercial/PrintableQuoteModal.tsx
// ==============================================================================

import React from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CommercialQuote } from '../../types/commercial';

export interface PrintableQuoteModalProps {
    visible: boolean;
    quote: CommercialQuote | null;
    onClose: () => void;
}

export const PrintableQuoteModal: React.FC<PrintableQuoteModalProps> = ({
    visible,
    quote,
    onClose,
}) => {
    if (!quote) return null;

    const calc = quote.calculation;
    const currency = quote.currency || 'COP';

    const formatMoney = (amount: number) => {
        if (currency === 'USD') {
            return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
        }
        return `$${Math.round(amount).toLocaleString('es-CO')} COP`;
    };

    const formatAmountOnly = (amount: number) => {
        if (currency === 'USD') {
            return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${Math.round(amount).toLocaleString('es-CO')}`;
    };

    const handlePrint = () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={printStyles.overlay}>
                <View style={printStyles.windowContainer}>
                    {/* Barra de herramientas superior */}
                    <View style={printStyles.toolbar}>
                        <View>
                            <Text style={printStyles.toolbarTitle}>Documento Oficial de Cotización</Text>
                            <Text style={printStyles.toolbarSub}>
                                Formato editorial A4 · {quote.quote_number} · Inmutable
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={printStyles.printBtn} onPress={handlePrint}>
                                <Text style={printStyles.printBtnText}>🖨 Imprimir / Guardar PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={printStyles.closeBtn} onPress={onClose}>
                                <Text style={printStyles.closeBtnText}>✕ Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hoja A4 Editorial */}
                    <ScrollView contentContainerStyle={printStyles.sheetScroll}>
                        <View style={printStyles.a4Sheet}>
                            {/* Cabecera de la Marca */}
                            <View style={printStyles.header}>
                                <View style={{ flex: 1 }}>
                                    <Text style={printStyles.brandTitle}>ATELIER DE AUTOR</Text>
                                    <Text style={printStyles.brandSubTitle}>BY KATHERINE CARROLL</Text>
                                    <Text style={printStyles.brandMeta}>
                                        Alta Costura · Sastrería Bespoke · Bogotá D.C., Colombia
                                    </Text>
                                </View>
                                <View style={printStyles.quoteCodeBox}>
                                    <Text style={printStyles.quoteCodeLabel}>COTIZACIÓN FORMAL</Text>
                                    <Text style={printStyles.quoteCodeValue}>{quote.quote_number}</Text>
                                    <Text style={printStyles.quoteDateText}>
                                        Fecha: {new Date(quote.created_at).toLocaleDateString('es-CO')}
                                    </Text>
                                    <Text style={printStyles.quoteDateText}>
                                        Válida hasta: {new Date(quote.valid_until).toLocaleDateString('es-CO')}
                                    </Text>
                                </View>
                            </View>

                            <View style={printStyles.goldDivider} />

                            {/* Datos de la Clienta y Encargo */}
                            <View style={printStyles.infoGrid}>
                                <View style={printStyles.infoCol}>
                                    <Text style={printStyles.infoColTitle}>DESTINATARIA / CLIENTA</Text>
                                    <Text style={printStyles.infoClientName}>{quote.client_name_snapshot}</Text>
                                    <Text style={printStyles.infoDetailText}>Encargo Privado de Atelier</Text>
                                </View>
                                <View style={printStyles.infoCol}>
                                    <Text style={printStyles.infoColTitle}>PIEZA DE ALTA COSTURA</Text>
                                    <Text style={printStyles.infoCreationName}>{quote.creation_name_snapshot}</Text>
                                    <Text style={printStyles.infoDetailText}>Trazado CAD 1:1 · Medidas Exclusivas</Text>
                                </View>
                            </View>

                            {/* Tabla de Conceptos Económicos */}
                            <View style={printStyles.tableContainer}>
                                <View style={printStyles.tableHeader}>
                                    <Text style={[printStyles.thText, { flex: 3 }]}>DESCRIPCIÓN DEL CONCEPTO</Text>
                                    <Text style={[printStyles.thText, { flex: 1, textAlign: 'right' }]}>VALOR ({currency})</Text>
                                </View>

                                <View style={printStyles.tableRow}>
                                    <View style={{ flex: 3 }}>
                                        <Text style={printStyles.conceptTitle}>1. Telas Principales, Forros & Avíos de Costura</Text>
                                        <Text style={printStyles.conceptSub}>
                                            Materiales según catálogo textil y metraje técnico facturable
                                        </Text>
                                        {quote.proposal_snapshot?.materials &&
                                            quote.proposal_snapshot.materials.length > 0 &&
                                            Math.abs(
                                                (quote.proposal_snapshot.materials_cost || 0) -
                                                    (calc.materials_subtotal || 0)
                                            ) < 0.01 && (
                                                <View style={{ marginTop: 4, gap: 2 }}>
                                                    {quote.proposal_snapshot.materials.map((m, idx) => (
                                                        <Text
                                                            key={`${m.material_id || m.name || idx}`}
                                                            style={{ fontSize: 10, color: '#5C5248' }}
                                                        >
                                                            • {m.material_name || m.name} ({m.billable_quantity ?? m.billable_qty ?? 1} {m.unit}):{' '}
                                                            {formatMoney(m.subtotal || 0)}
                                                        </Text>
                                                    ))}
                                                </View>
                                            )}
                                    </View>
                                    <Text style={[printStyles.conceptPrice, { flex: 1, textAlign: 'right' }]}>
                                        {formatAmountOnly(calc.materials_subtotal || 0)}
                                    </Text>
                                </View>

                                <View style={printStyles.tableRow}>
                                    <View style={{ flex: 3 }}>
                                        <Text style={printStyles.conceptTitle}>2. Modelado Anatómico, Patronaje CAD & Confección</Text>
                                        <Text style={printStyles.conceptSub}>
                                            Trazado paramétrico, corte sastre y sesiones de fitting de prueba
                                        </Text>
                                    </View>
                                    <Text style={[printStyles.conceptPrice, { flex: 1, textAlign: 'right' }]}>
                                        {formatAmountOnly(calc.labor_subtotal || 0)}
                                    </Text>
                                </View>

                                {/* Descuentos o Impuestos */}
                                {calc.discount_amount > 0 && (
                                    <View style={printStyles.tableRow}>
                                        <Text style={[printStyles.conceptSub, { flex: 3, color: '#3D6346' }]}>
                                            Cortesía Comercial / Descuento Especial ({calc.discount_percentage}%)
                                        </Text>
                                        <Text style={[printStyles.conceptPrice, { flex: 1, textAlign: 'right', color: '#3D6346' }]}>
                                            -{formatAmountOnly(calc.discount_amount)}
                                        </Text>
                                    </View>
                                )}

                                {calc.tax_amount > 0 && (
                                    <View style={printStyles.tableRow}>
                                        <Text style={[printStyles.conceptSub, { flex: 3 }]}>
                                            Impuesto sobre las Ventas (IVA {calc.tax_percentage}%)
                                        </Text>
                                        <Text style={[printStyles.conceptPrice, { flex: 1, textAlign: 'right' }]}>
                                            +{formatAmountOnly(calc.tax_amount)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Resumen Total y Cuadro de Pagos */}
                            <View style={printStyles.totalSection}>
                                <View style={printStyles.paymentBox}>
                                    <Text style={printStyles.paymentBoxTitle}>PROGRAMA DE PAGOS DE ALTA COSTURA</Text>
                                    <View style={printStyles.paymentRow}>
                                        <Text style={printStyles.paymentLabel}>
                                            • Anticipo Inicial ({calc.suggested_advance_percentage}%):
                                        </Text>
                                        <Text style={printStyles.paymentVal}>
                                            {formatMoney(calc.suggested_advance_amount)}
                                        </Text>
                                    </View>
                                    <Text style={printStyles.paymentSub}>
                                        Requerido para aprovisionamiento de telas y trazado de patronaje CAD.
                                    </Text>

                                    <View style={[printStyles.paymentRow, { marginTop: 6 }]}>
                                        <Text style={printStyles.paymentLabel}>
                                            • Saldo Contra Entrega ({100 - calc.suggested_advance_percentage}%):
                                        </Text>
                                        <Text style={printStyles.paymentVal}>
                                            {formatMoney(calc.total - calc.suggested_advance_amount)}
                                        </Text>
                                    </View>
                                    <Text style={printStyles.paymentSub}>
                                        Pagadero tras la prueba final y entrega conforme de la prenda.
                                    </Text>
                                </View>

                                <View style={printStyles.totalBox}>
                                    <Text style={printStyles.totalLabel}>TOTAL PROPUESTA</Text>
                                    <Text style={printStyles.totalValue}>
                                        {formatAmountOnly(calc.total)}
                                    </Text>
                                    <Text style={printStyles.currencyLabel}>
                                        {currency === 'USD' ? 'DÓLARES AMERICANOS (USD)' : 'PESOS COLOMBIANOS (COP)'}
                                    </Text>
                                </View>
                            </View>

                            {/* Términos y Condiciones */}
                            {quote.terms_and_conditions && (
                                <View style={printStyles.termsBox}>
                                    <Text style={printStyles.termsTitle}>TÉRMINOS Y CONDICIONES DEL ATELIER</Text>
                                    <Text style={printStyles.termsContent}>{quote.terms_and_conditions}</Text>
                                </View>
                            )}

                            {/* Firmas de Autor y Aceptación */}
                            <View style={printStyles.signaturesRow}>
                                <View style={printStyles.signatureCol}>
                                    <View style={printStyles.signatureLine} />
                                    <Text style={printStyles.signatureName}>Katherine Carroll</Text>
                                    <Text style={printStyles.signatureRole}>Directora Creativa · Diseñadora</Text>
                                </View>

                                <View style={printStyles.signatureCol}>
                                    <View style={printStyles.signatureLine} />
                                    <Text style={printStyles.signatureName}>{quote.client_name_snapshot}</Text>
                                    <Text style={printStyles.signatureRole}>Aceptación de Términos y Oferta</Text>
                                </View>
                            </View>

                            {/* Pie de Página A4 */}
                            <View style={printStyles.footer}>
                                <Text style={printStyles.footerText}>
                                    Atelier By Katherine Carroll · Documento confidencial generado mediante Atelier Digital App
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const printStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    windowContainer: {
        backgroundColor: '#EFECE6',
        borderRadius: 16,
        width: '100%',
        maxWidth: 820,
        maxHeight: '94%',
        overflow: 'hidden',
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#171411',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    toolbarTitle: {
        fontFamily: 'serif',
        fontSize: 15,
        fontWeight: '700',
        color: '#FAF8F5',
    },
    toolbarSub: {
        fontSize: 11,
        color: '#C5A880',
    },
    printBtn: {
        backgroundColor: '#C5A880',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 6,
    },
    printBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#171411',
    },
    closeBtn: {
        backgroundColor: '#2A241F',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
    },
    closeBtnText: {
        fontSize: 12,
        color: '#FAF8F5',
    },
    sheetScroll: {
        padding: 20,
        alignItems: 'center',
    },
    a4Sheet: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        maxWidth: 750,
        padding: 40,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    brandTitle: {
        fontFamily: 'serif',
        fontSize: 22,
        fontWeight: '800',
        color: '#171411',
        letterSpacing: 1.5,
    },
    brandSubTitle: {
        fontFamily: 'serif',
        fontSize: 13,
        fontWeight: '600',
        color: '#A78350',
        letterSpacing: 2,
        marginTop: 2,
    },
    brandMeta: {
        fontSize: 10,
        color: '#8A7E72',
        marginTop: 4,
    },
    quoteCodeBox: {
        alignItems: 'flex-end',
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 8,
        padding: 10,
    },
    quoteCodeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#A78350',
        letterSpacing: 1,
    },
    quoteCodeValue: {
        fontFamily: 'serif',
        fontSize: 16,
        fontWeight: '700',
        color: '#171411',
        marginTop: 2,
    },
    quoteDateText: {
        fontSize: 10,
        color: '#766B62',
        marginTop: 1,
    },
    goldDivider: {
        height: 2,
        backgroundColor: '#C5A880',
        marginVertical: 20,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 24,
    },
    infoCol: {
        flex: 1,
        backgroundColor: '#FAF8F5',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F0ECE4',
    },
    infoColTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A6A4A',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    infoClientName: {
        fontFamily: 'serif',
        fontSize: 14,
        fontWeight: '700',
        color: '#171411',
    },
    infoCreationName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
    },
    infoDetailText: {
        fontSize: 11,
        color: '#766B62',
        marginTop: 2,
    },
    tableContainer: {
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F5F3EF',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E6D9C8',
    },
    thText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#766B62',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    conceptTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#171411',
    },
    conceptSub: {
        fontSize: 11,
        color: '#8A7E72',
        marginTop: 2,
    },
    conceptPrice: {
        fontFamily: 'serif',
        fontSize: 14,
        fontWeight: '700',
        color: '#171411',
    },
    totalSection: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    paymentBox: {
        flex: 1.3,
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 8,
        padding: 14,
    },
    paymentBoxTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A6A4A',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#171411',
    },
    paymentVal: {
        fontFamily: 'serif',
        fontSize: 13,
        fontWeight: '700',
        color: '#8A6A4A',
    },
    paymentSub: {
        fontSize: 10,
        color: '#8A7E72',
        marginTop: 1,
    },
    totalBox: {
        flex: 1,
        backgroundColor: '#171411',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C5A880',
        letterSpacing: 1,
    },
    totalValue: {
        fontFamily: 'serif',
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginVertical: 4,
    },
    currencyLabel: {
        fontSize: 9,
        color: '#A89E94',
        letterSpacing: 0.5,
    },
    termsBox: {
        backgroundColor: '#FAFAF8',
        borderWidth: 1,
        borderColor: '#F0ECE4',
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
    },
    termsTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#766B62',
        marginBottom: 6,
    },
    termsContent: {
        fontSize: 11,
        color: '#766B62',
        lineHeight: 16,
    },
    signaturesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 40,
        marginTop: 20,
        marginBottom: 20,
    },
    signatureCol: {
        flex: 1,
        alignItems: 'center',
    },
    signatureLine: {
        width: '80%',
        height: 1,
        backgroundColor: '#171411',
        marginBottom: 8,
    },
    signatureName: {
        fontFamily: 'serif',
        fontSize: 12,
        fontWeight: '700',
        color: '#171411',
    },
    signatureRole: {
        fontSize: 10,
        color: '#8A7E72',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#EFECE6',
        paddingTop: 12,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 9,
        color: '#A89E94',
    },
});

