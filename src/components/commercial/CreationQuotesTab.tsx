// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: PESTAÑA DE COTIZACIONES DE LA CREACIÓN
// Archivo: src/components/commercial/CreationQuotesTab.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Creation } from '../../types/creation';
import {
    AtelierCurrencyRate,
    CommercialProject,
    CommercialQuote,
    DesignProposal,
    QuoteStatus,
} from '../../types/commercial';
import {
    createProjectFromQuote,
    fetchQuotesByCreation,
    getActiveCurrencyRate,
    updateQuote,
} from '../../services/commercialService';
import { QuoteEditorModal } from './QuoteEditorModal';
import { PrintableQuoteModal } from './PrintableQuoteModal';
import { commercialStyles as styles } from './commercialStyles';
import { formatCurrencyRateValue, formatShortDateEs } from './materialLabels';

export interface CreationQuotesTabProps {
    creation: Creation;
    activeProposal?: DesignProposal | null;
    onProjectCreated?: (project: CommercialProject) => void;
}

const STATUS_MAP: Record<QuoteStatus, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: 'Borrador', bg: '#F5F3EF', color: '#766B62', border: '#E6D9C8' },
    sent: { label: 'Enviada', bg: '#FFF8E7', color: '#B37D14', border: '#F2D48E' },
    accepted: { label: 'Aceptada', bg: '#F1F7F2', color: '#3D6346', border: '#C2DFCA' },
    rejected: { label: 'Rechazada', bg: '#FAF2F2', color: '#9E3B3B', border: '#E8C5C5' },
    expired: { label: 'Vencida', bg: '#EFEFEF', color: '#888888', border: '#CCCCCC' },
};

export const CreationQuotesTab: React.FC<CreationQuotesTabProps> = ({
    creation,
    activeProposal,
    onProjectCreated,
}) => {
    const [quotes, setQuotes] = useState<CommercialQuote[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedQuoteForPrint, setSelectedQuoteForPrint] = useState<CommercialQuote | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [manualTrmUsdCop, setManualTrmUsdCop] = useState<AtelierCurrencyRate | null>(null);
    const [feedbackNotice, setFeedbackNotice] = useState<{
        tone: 'error' | 'warning' | 'success';
        text: string;
    } | null>(null);

    const loadQuotes = async () => {
        setLoading(true);
        const [quotesRes, trmRes] = await Promise.all([
            fetchQuotesByCreation(creation.id),
            getActiveCurrencyRate('USD', 'COP'),
        ]);
        setQuotes(quotesRes.data);
        setManualTrmUsdCop(trmRes.data);
        setLoading(false);
    };

    useEffect(() => {
        if (!creation.id) return;
        let active = true;
        Promise.all([
            fetchQuotesByCreation(creation.id),
            getActiveCurrencyRate('USD', 'COP'),
        ]).then(([quotesRes, trmRes]) => {
            if (!active) return;
            setQuotes(quotesRes.data);
            setManualTrmUsdCop(trmRes.data);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [creation.id]);

    const handleChangeStatus = async (quoteId: string, newStatus: QuoteStatus) => {
        setFeedbackNotice(null);
        setActionLoadingId(quoteId);
        const { data, error } = await updateQuote(quoteId, { status: newStatus });
        setActionLoadingId(null);

        if (error) {
            setFeedbackNotice({ tone: 'error', text: error });
        } else if (data) {
            setQuotes((prev) => prev.map((q) => (q.id === quoteId ? data : q)));
            setFeedbackNotice({
                tone: 'success',
                text: `Estado de cotización actualizado a ${STATUS_MAP[newStatus].label}.`,
            });
        }
    };

    const handleConvertToProject = async (quote: CommercialQuote) => {
        setFeedbackNotice(null);
        setActionLoadingId(quote.id);
        const { data, error } = await createProjectFromQuote(creation.id, quote.id, {
            priority: 'normal',
        });
        setActionLoadingId(null);

        if (error) {
            setFeedbackNotice({ tone: 'warning', text: error });
        } else if (data) {
            setFeedbackNotice({
                tone: 'success',
                text: `Proyecto ${data.project_code || data.project_number} creado e iniciado en taller.`,
            });
            loadQuotes();
            if (onProjectCreated) {
                onProjectCreated(data);
            }
        }
    };

    const formatQuotePrice = (amount: number, curr?: string) => {
        if (curr === 'USD') {
            return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
        }
        return `$${Math.round(amount).toLocaleString('es-CO')} COP`;
    };

    return (
        <View style={styles.sectionCard}>
            {/* Cabecera de la sección */}
            <View style={styles.sectionCardHeader}>
                <View>
                    <Text style={styles.sectionCardTitleGold}>COTIZACIONES COMERCIALES FORMALES</Text>
                    <Text style={styles.sectionCardSubtitle}>
                        Ofertas económicas vinculantes · Documento A4 · Anticipo sugerido del 50%
                    </Text>
                    {activeProposal && (
                        <Text style={{ fontSize: 11, color: '#8A6A4A', fontWeight: '600', marginTop: 3 }}>
                            Propuesta conectada: {activeProposal.proposal_number} (v{activeProposal.version} · {activeProposal.status === 'approved' ? 'Aprobada' : 'En borrador'} · {activeProposal.currency || activeProposal.snapshot?.currency || 'COP'})
                        </Text>
                    )}
                    <Text style={{ fontSize: 11, color: '#766B62', marginTop: 3 }}>
                        {manualTrmUsdCop
                            ? `TRM manual ref. USD→COP: ${formatCurrencyRateValue(manualTrmUsdCop.rate_value, 'COP')} (${formatShortDateEs(manualTrmUsdCop.effective_date)}) · Moneda fija sin conversión automática ni descuento de inventario`
                            : 'TRM manual USD→COP: sin configurar · Moneda fija sin conversión automática ni descuento de inventario'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.primaryGoldBtn}
                    onPress={() => {
                        setFeedbackNotice(null);
                        setIsEditorOpen(true);
                    }}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryGoldBtnText}>+ Nueva Cotización A4</Text>
                </TouchableOpacity>
            </View>

            {feedbackNotice ? (
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
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            fontWeight: '600',
                            flex: 1,
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
                    <TouchableOpacity
                        onPress={() => setFeedbackNotice(null)}
                        accessibilityLabel="Cerrar mensaje de cotización"
                    >
                        <Text
                            style={{
                                fontWeight: '700',
                                fontSize: 13,
                                color:
                                    feedbackNotice.tone === 'error'
                                        ? '#9E3B3B'
                                        : feedbackNotice.tone === 'warning'
                                          ? '#8A5C12'
                                          : '#3D6346',
                            }}
                        >
                            ✕
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Contenido de la sección */}
            {loading ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#C5A880" />
                    <Text style={{ marginTop: 10, color: '#8A7E72', fontSize: 13 }}>
                        Cargando historial de cotizaciones...
                    </Text>
                </View>
            ) : quotes.length === 0 ? (
                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateTitle}>Sin cotizaciones comerciales emitidas</Text>
                    <Text style={styles.emptyStateText}>
                        Aún no se ha estructurado una oferta formal para esta Creación. Puede emitir un presupuesto vinculante con desglose de materiales, mano de obra y términos de entrega.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={() => setIsEditorOpen(true)}
                    >
                        <Text style={styles.primaryGoldBtnText}>Emitir Primera Cotización Formal</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {quotes.map((quote) => {
                        const statusConfig = STATUS_MAP[quote.status] || STATUS_MAP.draft;
                        const isProcessing = actionLoadingId === quote.id;

                        return (
                            <View key={quote.id} style={styles.materialCard}>
                                <View style={styles.materialCardHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '700', color: '#171411' }}>
                                            {quote.quote_number}
                                        </Text>
                                        <View style={{ backgroundColor: '#EFECE6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#4A4036' }}>
                                                {quote.currency || 'COP'}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.materialCategoryBadge,
                                                {
                                                    backgroundColor: statusConfig.bg,
                                                    borderColor: statusConfig.border,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.materialCategoryBadgeText,
                                                    { color: statusConfig.color },
                                                ]}
                                            >
                                                {statusConfig.label.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.materialPriceText}>
                                        {formatQuotePrice(quote.calculation.total || 0, quote.currency)}
                                    </Text>
                                </View>

                                <Text style={styles.materialMetaText}>
                                    Emitida: {new Date(quote.created_at).toLocaleDateString('es-CO')} · Vence:{' '}
                                    {new Date(quote.valid_until).toLocaleDateString('es-CO')} · Destinataria:{' '}
                                    {quote.client_name_snapshot}
                                </Text>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6, backgroundColor: '#FAF8F5', padding: 8, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 12, color: '#766B62' }}>
                                        Telas: {formatQuotePrice(quote.calculation.materials_subtotal || 0, quote.currency)} · Confección: {formatQuotePrice(quote.calculation.labor_subtotal || 0, quote.currency)}
                                    </Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A6A4A' }}>
                                        Anticipo 50%: {formatQuotePrice(quote.calculation.suggested_advance_amount || 0, quote.currency)}
                                    </Text>
                                </View>

                                {/* Barra de acciones de la cotización */}
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <TouchableOpacity
                                        style={styles.secondaryOutlineBtn}
                                        onPress={() => setSelectedQuoteForPrint(quote)}
                                    >
                                        <Text style={styles.secondaryOutlineBtnText}>📄 Ver / Imprimir A4</Text>
                                    </TouchableOpacity>

                                    {quote.status === 'draft' && (
                                        <TouchableOpacity
                                            style={styles.secondaryOutlineBtn}
                                            onPress={() => handleChangeStatus(quote.id, 'sent')}
                                            disabled={isProcessing}
                                        >
                                            <Text style={styles.secondaryOutlineBtnText}>Marcar Enviada</Text>
                                        </TouchableOpacity>
                                    )}

                                    {quote.status === 'sent' && (
                                        <TouchableOpacity
                                            style={styles.primaryGoldBtn}
                                            onPress={() => handleChangeStatus(quote.id, 'accepted')}
                                            disabled={isProcessing}
                                        >
                                            <Text style={styles.primaryGoldBtnText}>✓ Marcar Aceptada</Text>
                                        </TouchableOpacity>
                                    )}

                                    {quote.status === 'accepted' && (
                                        <TouchableOpacity
                                            style={styles.primaryGoldBtn}
                                            onPress={() => handleConvertToProject(quote)}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <ActivityIndicator size="small" color="#171411" />
                                            ) : (
                                                <Text style={styles.primaryGoldBtnText}>✂ Iniciar Proyecto de Taller</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Modal Editor */}
            <QuoteEditorModal
                visible={isEditorOpen}
                creation={creation}
                activeProposal={activeProposal}
                onClose={() => setIsEditorOpen(false)}
                onQuoteCreated={(newQ) => {
                    setQuotes((prev) => [newQ, ...prev]);
                    setSelectedQuoteForPrint(newQ);
                }}
            />

            {/* Modal Imprimible A4 */}
            <PrintableQuoteModal
                visible={Boolean(selectedQuoteForPrint)}
                quote={selectedQuoteForPrint}
                onClose={() => setSelectedQuoteForPrint(null)}
            />
        </View>
    );
};

