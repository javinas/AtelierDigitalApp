// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: PESTAÑA DE MATERIALES Y PROPUESTAS VERSIONADAS
// Archivo: src/components/commercial/CreationMaterialsTab.tsx
// ==============================================================================
// Gestiona el desglose textil y de mano de obra de la Creación (Fase 3):
// Propuestas versionadas (v1..vn) → Telas requeridas vs facturables → Taller → Aprobación
// ==============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Creation } from '../../types/creation';
import {
    AtelierCurrencyRate,
    CommercialCurrency,
    DesignProposal,
    MaterialItem,
    ProposalLaborItem,
    ProposalMaterialItem,
    calculateBillableMaterialQuantity,
    normalizeMaterialCategory,
} from '../../types/commercial';
import {
    createProposal,
    fetchProposalsByCreation,
    getActiveCurrencyRate,
    recordCommercialEvent,
    updateProposal,
    upsertCommercialProfile,
} from '../../services/commercialService';
import { MaterialsCatalogModal } from './MaterialsCatalogModal';
import { commercialStyles as styles } from './commercialStyles';
import { formatCurrencyRateValue, formatShortDateEs } from './materialLabels';

export interface CreationMaterialsTabProps {
    creation: Creation;
    onProposalChange?: (proposal: DesignProposal | null) => void;
}

const DEFAULT_LABOR_COP: ProposalLaborItem[] = [
    { id: 'labor-1', description: 'Patronaje CAD y Modelado Anatómico 1:1', subtotal: 350000 },
    { id: 'labor-2', description: 'Corte, Hilván y Armado Estructural de Atelier', subtotal: 650000 },
];

function createDefaultLabor(curr: CommercialCurrency): ProposalLaborItem[] {
    if (curr === 'USD') {
        return [];
    }
    return DEFAULT_LABOR_COP.map((item) => ({ ...item }));
}

function resolvePreferredProposal(list: DesignProposal[]): DesignProposal | null {
    return list.find((p) => p.status === 'approved') || list[0] || null;
}

function formatProposalAmount(amount: number, curr: CommercialCurrency): string {
    if (curr === 'USD') {
        return `$${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
    return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

export const CreationMaterialsTab: React.FC<CreationMaterialsTabProps> = ({
    creation,
    onProposalChange,
}) => {
    const [proposals, setProposals] = useState<DesignProposal[]>([]);
    const [activeProposal, setActiveProposal] = useState<DesignProposal | null>(null);
    const [materialsList, setMaterialsList] = useState<ProposalMaterialItem[]>([]);
    const [laborList, setLaborList] = useState<ProposalLaborItem[]>([]);
    const [currency, setCurrency] = useState<CommercialCurrency>('COP');
    const [qtyDrafts, setQtyDrafts] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [approving, setApproving] = useState<boolean>(false);
    const [manualTrmUsdCop, setManualTrmUsdCop] = useState<AtelierCurrencyRate | null>(null);
    const [feedbackNotice, setFeedbackNotice] = useState<{
        tone: 'error' | 'warning' | 'success';
        title: string;
        text: string;
    } | null>(null);

    const qtySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearPendingQtyTimer = () => {
        if (qtySaveTimerRef.current) {
            clearTimeout(qtySaveTimerRef.current);
            qtySaveTimerRef.current = null;
        }
    };

    const applyProposalResults = (
        proposalsRes: Awaited<ReturnType<typeof fetchProposalsByCreation>>,
        trmRes: Awaited<ReturnType<typeof getActiveCurrencyRate>>
    ) => {
        const data = proposalsRes.data;
        setManualTrmUsdCop(trmRes.data);
        setProposals(data);
        setQtyDrafts({});

        if (data.length > 0) {
            const current = data.find((p) => p.status === 'approved') || data[0];
            setActiveProposal(current);
            setMaterialsList(current.snapshot.materials || []);
            setLaborList(current.snapshot.labor || []);
            setCurrency(current.currency || current.snapshot.currency || 'COP');
            onProposalChange?.(current);
        } else {
            setActiveProposal(null);
            setMaterialsList([]);
            setLaborList(createDefaultLabor('COP'));
            setCurrency('COP');
            onProposalChange?.(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!creation.id) return;
        let active = true;
        Promise.all([
            fetchProposalsByCreation(creation.id),
            getActiveCurrencyRate('USD', 'COP'),
        ]).then(([proposalsRes, trmRes]) => {
            if (!active) return;
            applyProposalResults(proposalsRes, trmRes);
        });
        return () => {
            active = false;
            clearPendingQtyTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [creation.id]);

    const isApprovedLocked = activeProposal?.status === 'approved';

    const persistProposalData = async (
        materials: ProposalMaterialItem[],
        labor: ProposalLaborItem[],
        curr: CommercialCurrency
    ): Promise<DesignProposal | null> => {
        setSaving(true);
        let saved: DesignProposal | null = null;

        if (activeProposal) {
            const { data, error } = await updateProposal(activeProposal.id, {
                materials,
                labor,
                currency: curr,
            });
            if (error || !data) {
                setFeedbackNotice({
                    tone: 'error',
                    title: 'No fue posible actualizar la propuesta',
                    text: error || 'No fue posible actualizar la propuesta.',
                });
            } else {
                saved = data;
                setActiveProposal(data);
                setProposals((prev) => {
                    const nextList = prev.map((p) => (p.id === data.id ? data : p));
                    onProposalChange?.(resolvePreferredProposal(nextList));
                    return nextList;
                });
            }
        } else {
            const { data, error } = await createProposal({
                creation_id: creation.id,
                title: `Propuesta Base · ${creation.name}`,
                materials,
                labor,
                currency: curr,
            });
            if (error || !data) {
                setFeedbackNotice({
                    tone: 'error',
                    title: 'No fue posible registrar la propuesta',
                    text: error || 'No fue posible registrar la propuesta.',
                });
            } else {
                saved = data;
                setActiveProposal(data);
                setProposals([data]);
                onProposalChange?.(data);
            }
        }

        setSaving(false);
        return saved;
    };

    const handleSelectMaterialFromCatalog = async (mat: MaterialItem) => {
        setFeedbackNotice(null);
        if (isApprovedLocked) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Propuesta Aprobada',
                text: 'Esta propuesta tiene un snapshot inmutable. Cree una nueva versión para agregar o modificar materiales.',
            });
            return;
        }

        if (currency === 'USD' && !(mat.unit_price_usd && mat.unit_price_usd > 0)) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Tarifa USD no definida',
                text: `El material "${mat.name}" no tiene precio unitario en USD en el catálogo. No se realiza conversión automática desde COP; defina su valor en USD o utilice una propuesta en COP.`,
            });
            return;
        }

        const requiredQty = 2.0;
        const minPurchase = mat.min_purchase_unit || 1.0;
        const billableQty = calculateBillableMaterialQuantity(requiredQty, minPurchase);
        const unitPrice = currency === 'USD' ? Number(mat.unit_price_usd || 0) : Number(mat.unit_price || 0);
        const subtotal = Number((billableQty * unitPrice).toFixed(2));
        const normalizedCategory = normalizeMaterialCategory(mat.category) || 'fabric';

        const newItem: ProposalMaterialItem = {
            material_id: mat.id,
            material_name: mat.name,
            name: mat.name,
            material_category: normalizedCategory,
            category: normalizedCategory,
            unit_price: unitPrice,
            unit: mat.unit,
            required_qty: requiredQty,
            required_quantity: requiredQty,
            min_purchase_unit: minPurchase,
            billable_qty: billableQty,
            billable_quantity: billableQty,
            subtotal,
            color_name: mat.color_name,
            notes: mat.color_name ? `Color: ${mat.color_name}` : null,
        };

        const updatedList = [...materialsList, newItem];
        setMaterialsList(updatedList);
        await persistProposalData(updatedList, laborList, currency);
    };

    const handleUpdateQuantity = (index: number, rawInput: string) => {
        if (isApprovedLocked) return;

        setQtyDrafts((prev) => ({ ...prev, [index]: rawInput }));
        const parsed = parseFloat(rawInput);
        const val = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

        const updatedList = materialsList.map((entry, idx) => {
            if (idx !== index) return entry;
            const minUnit = entry.min_purchase_unit || 1.0;
            const billableQty = calculateBillableMaterialQuantity(val, minUnit);
            return {
                ...entry,
                required_qty: val,
                required_quantity: val,
                billable_qty: billableQty,
                billable_quantity: billableQty,
                subtotal: Number((billableQty * entry.unit_price).toFixed(2)),
            };
        });

        setMaterialsList(updatedList);
        clearPendingQtyTimer();
        qtySaveTimerRef.current = setTimeout(() => {
            persistProposalData(updatedList, laborList, currency);
        }, 450);
    };

    const handleRemoveMaterial = async (index: number) => {
        if (isApprovedLocked) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Propuesta Aprobada',
                text: 'No es posible eliminar ítems de una propuesta aprobada. Cree una nueva versión.',
            });
            return;
        }
        setFeedbackNotice(null);
        clearPendingQtyTimer();
        setQtyDrafts({});
        const updatedList = materialsList.filter((_, i) => i !== index);
        setMaterialsList(updatedList);
        await persistProposalData(updatedList, laborList, currency);
    };

    const handleSwitchCurrency = async (nextCurrency: CommercialCurrency) => {
        if (nextCurrency === currency) return;
        if (isApprovedLocked) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Propuesta Aprobada',
                text: 'La moneda de una propuesta aprobada es inmutable. Cree una nueva versión si desea otra divisa.',
            });
            return;
        }
        if (materialsList.length > 0) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Conversión automática deshabilitada',
                text: `Para conservar los valores y la moneda originales (${currency}) sin conversión automática COP/USD, retire los materiales actuales o cree una nueva versión en ${nextCurrency}.`,
            });
            return;
        }

        setFeedbackNotice(null);
        clearPendingQtyTimer();
        setCurrency(nextCurrency);
        const nextLabor = activeProposal ? laborList : createDefaultLabor(nextCurrency);
        if (!activeProposal) {
            setLaborList(nextLabor);
        } else {
            await persistProposalData(materialsList, nextLabor, nextCurrency);
        }
    };

    const handleCreateNewVersion = async () => {
        setFeedbackNotice(null);
        clearPendingQtyTimer();
        setSaving(true);
        const maxVersion = proposals.reduce((max, p) => Math.max(max, p.version || 1), 0);
        const nextVersionLabel = maxVersion + 1;

        const { data, error } = await createProposal({
            creation_id: creation.id,
            title: `Propuesta v${nextVersionLabel} · Variante de Diseño`,
            materials: materialsList,
            labor: laborList,
            currency,
        });

        if (error || !data) {
            setFeedbackNotice({
                tone: 'error',
                title: 'No fue posible crear la nueva versión',
                text: error || 'No fue posible crear la nueva versión.',
            });
            setSaving(false);
            return;
        }

        setQtyDrafts({});
        setActiveProposal(data);
        setMaterialsList(data.snapshot.materials || []);
        setLaborList(data.snapshot.labor || []);
        setCurrency(data.currency || currency);
        setProposals((prev) => {
            const nextList = [data, ...prev];
            onProposalChange?.(resolvePreferredProposal(nextList));
            return nextList;
        });

        await recordCommercialEvent({
            creation_id: creation.id,
            proposal_id: data.id,
            event_type: 'proposal_created',
            title: `Propuesta v${data.version} estructurada`,
            description: `Nueva iteración de telas y presupuesto (${data.currency || currency}) para la creación ${creation.name}.`,
        });
        setSaving(false);
    };

    const handleApproveProposal = async () => {
        if (!activeProposal) return;
        setFeedbackNotice(null);
        clearPendingQtyTimer();
        setApproving(true);

        const { data, error } = await updateProposal(activeProposal.id, {
            status: 'approved',
            materials: materialsList,
            labor: laborList,
            currency,
        });

        if (error || !data) {
            setFeedbackNotice({
                tone: 'error',
                title: 'No fue posible aprobar la propuesta',
                text: error || 'No fue posible aprobar la propuesta.',
            });
            setApproving(false);
            return;
        }

        const refreshedRes = await fetchProposalsByCreation(creation.id);
        const updatedList =
            refreshedRes.data.length > 0
                ? refreshedRes.data
                : proposals.map((p) =>
                    p.id === data.id
                        ? data
                        : p.status === 'approved'
                            ? { ...p, status: 'superseded' as const }
                            : p
                );
        setProposals(updatedList);
        const approvedTarget = updatedList.find((p) => p.id === data.id) || data;
        setActiveProposal(approvedTarget);
        setMaterialsList(approvedTarget.snapshot.materials || []);
        setLaborList(approvedTarget.snapshot.labor || []);
        onProposalChange?.(approvedTarget);

        const finalCurrency = approvedTarget.currency || currency;
        const finalTotal = approvedTarget.snapshot.estimated_total ?? totalProposalCost;

        // Sincronizar satélite comercial conservando exactamente moneda y valor originales (sin conversión TRM)
        const profileRes = await upsertCommercialProfile(creation.id, {
            commercial_status: 'proposal_pending',
            active_proposal_id: approvedTarget.id,
            currency: finalCurrency,
            estimated_budget_cop: finalCurrency === 'COP' ? finalTotal : 0,
            estimated_budget_usd: finalCurrency === 'USD' ? finalTotal : 0,
        });
        if (profileRes.error) {
            setFeedbackNotice({
                tone: 'warning',
                title: 'Propuesta aprobada con observación',
                text: profileRes.error,
            });
        } else {
            setFeedbackNotice({
                tone: 'success',
                title: 'Propuesta aprobada',
                text: `Propuesta ${approvedTarget.proposal_number} (v${approvedTarget.version}) congelada en ${finalCurrency} sin conversión automática.`,
            });
        }

        // Registrar en bitácora inmutable
        await recordCommercialEvent({
            creation_id: creation.id,
            proposal_id: approvedTarget.id,
            event_type: 'proposal_approved',
            title: `Propuesta ${approvedTarget.proposal_number} (v${approvedTarget.version}) Aprobada`,
            description: `Aprobación formal con snapshot congelado de ${materialsList.length} materiales por ${finalCurrency} ${formatProposalAmount(finalTotal, finalCurrency)}.`,
        });
        setApproving(false);
    };

    const totalMaterialsCost = materialsList.reduce((acc, it) => acc + (it.subtotal || 0), 0);
    const totalLaborCost = laborList.reduce((acc, it) => acc + (it.subtotal || 0), 0);
    const totalProposalCost = totalMaterialsCost + totalLaborCost;

    if (loading) {
        return (
            <View style={[styles.sectionCard, { alignItems: 'center', padding: 30 }]}>
                <ActivityIndicator size="small" color="#C5A880" />
                <Text style={{ marginTop: 10, color: '#8A7E72', fontSize: 13 }}>
                    Cargando especificaciones y versiones de propuestas...
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.sectionCard}>
            {/* Cabecera de la sección */}
            <View style={styles.sectionCardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.sectionCardTitleGold}>5. MATERIALES, TELAS & PROPUESTAS VERSIONADAS</Text>
                    <Text style={styles.sectionCardSubtitle}>
                        Modelado de insumos requeridos vs mínimos facturables · Desglose de confección · Soporte COP / USD
                    </Text>
                    <Text style={{ fontSize: 11, color: '#8A6A4A', marginTop: 3 }}>
                        {manualTrmUsdCop
                            ? `TRM ref. USD→COP: ${formatCurrencyRateValue(manualTrmUsdCop.rate_value, 'COP')} (${formatShortDateEs(manualTrmUsdCop.effective_date)}) · Solo presupuestal (sin conversión automática ni descuento de stock)`
                            : 'TRM manual USD→COP: sin configurar · Solo presupuestal (sin conversión automática ni descuento de stock)'}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {/* Selector de Moneda */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#EFECE6', borderRadius: 6, padding: 2 }}>
                        <TouchableOpacity
                            style={[
                                { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
                                currency === 'COP' && { backgroundColor: '#171411' },
                            ]}
                            disabled={isApprovedLocked || saving}
                            onPress={() => handleSwitchCurrency('COP')}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: currency === 'COP' ? '#FAF8F5' : '#766B62' }}>
                                COP
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
                                currency === 'USD' && { backgroundColor: '#171411' },
                            ]}
                            disabled={isApprovedLocked || saving}
                            onPress={() => handleSwitchCurrency('USD')}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: currency === 'USD' ? '#FAF8F5' : '#766B62' }}>
                                USD
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryGoldBtn, isApprovedLocked && { opacity: 0.5 }]}
                        onPress={() => {
                            setFeedbackNotice(null);
                            setIsCatalogModalOpen(true);
                        }}
                        disabled={isApprovedLocked || saving}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryGoldBtnText}>+ Agregar del Catálogo</Text>
                    </TouchableOpacity>
                </View>
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
                        paddingVertical: 10,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 12,
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
                                marginTop: 2,
                                color:
                                    feedbackNotice.tone === 'error'
                                        ? '#9E3B3B'
                                        : feedbackNotice.tone === 'warning'
                                          ? '#6E5023'
                                          : '#3D6346',
                            }}
                        >
                            {feedbackNotice.text}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setFeedbackNotice(null)}
                        accessibilityLabel="Cerrar mensaje de materiales"
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

            {/* Barra de Versiones de Propuesta */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EFECE6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#766B62', marginRight: 4 }}>
                        VERSIONES:
                    </Text>
                    {proposals.map((p, idx) => {
                        const isCurrent = activeProposal?.id === p.id;
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.chipBtn,
                                    isCurrent && styles.chipBtnActive,
                                    { flexDirection: 'row', alignItems: 'center', gap: 6 },
                                ]}
                                onPress={() => {
                                    clearPendingQtyTimer();
                                    setQtyDrafts({});
                                    setActiveProposal(p);
                                    setMaterialsList(p.snapshot.materials || []);
                                    setLaborList(p.snapshot.labor || []);
                                    setCurrency(p.currency || p.snapshot.currency || 'COP');
                                    onProposalChange?.(
                                        p.status === 'approved' ? p : resolvePreferredProposal(proposals)
                                    );
                                }}
                            >
                                <Text style={[styles.chipBtnText, isCurrent && styles.chipBtnTextActive]}>
                                    v{p.version || idx + 1} · {p.proposal_number}
                                </Text>
                                {p.status === 'approved' && (
                                    <Text style={{ fontSize: 10, color: isCurrent ? '#C5A880' : '#3D6346', fontWeight: '700' }}>
                                        ✓ APROBADA
                                    </Text>
                                )}
                                {p.status === 'superseded' && (
                                    <Text style={{ fontSize: 10, color: isCurrent ? '#D9CFC1' : '#8A7E72', fontWeight: '600' }}>
                                        HISTÓRICA
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={styles.secondaryOutlineBtn}
                    onPress={handleCreateNewVersion}
                    disabled={saving}
                >
                    <Text style={styles.secondaryOutlineBtnText}>
                        + Nueva Versión (v{proposals.reduce((max, p) => Math.max(max, p.version || 1), 0) + 1})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Resumen de 4 KPIs */}
            <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Insumos Textiles</Text>
                    <Text style={styles.kpiValue}>{materialsList.length} ítems</Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Subtotal Telas ({currency})</Text>
                    <Text style={styles.kpiValueGold}>
                        {formatProposalAmount(totalMaterialsCost, currency)}
                    </Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Mano de Obra ({currency})</Text>
                    <Text style={styles.kpiValue}>
                        {formatProposalAmount(totalLaborCost, currency)}
                    </Text>
                </View>
                <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Total Propuesta ({currency})</Text>
                    <Text style={[styles.kpiValueGold, { fontSize: 16 }]}>
                        {formatProposalAmount(totalProposalCost, currency)}
                    </Text>
                </View>
            </View>

            {/* Lista / Tabla de Materiales */}
            {materialsList.length === 0 ? (
                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateTitle}>Sin materiales especificados</Text>
                    <Text style={styles.emptyStateText}>
                        Seleccione telas y avíos del catálogo para calcular los metrajes de patronaje y costos facturables a la clienta.
                    </Text>
                    <TouchableOpacity
                        style={[styles.primaryGoldBtn, isApprovedLocked && { opacity: 0.5 }]}
                        disabled={isApprovedLocked || saving}
                        onPress={() => setIsCatalogModalOpen(true)}
                    >
                        <Text style={styles.primaryGoldBtnText}>Explorar Catálogo Textil</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Material / Tela</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Requerido (CAD)</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'center' }]}>Facturable (Mínimo)</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Subtotal ({currency})</Text>
                        <Text style={[styles.tableHeaderText, { width: 40 }]}></Text>
                    </View>

                    {materialsList.map((item, index) => {
                        const requiredVal = item.required_quantity ?? item.required_qty ?? 1;
                        const billableVal = item.billable_quantity ?? item.billable_qty ?? 1;
                        const isRoundedByMin = billableVal > requiredVal;

                        return (
                            <View key={`${item.material_id}-${index}`} style={styles.tableDataRow}>
                                <View style={{ flex: 2 }}>
                                    <Text style={styles.tableDataText} numberOfLines={1}>
                                        {item.material_name || item.name}
                                    </Text>
                                    <Text style={styles.tableDataSubText}>
                                        {formatProposalAmount(item.unit_price, currency)} / {item.unit}
                                        {item.color_name ? ` · Color: ${item.color_name}` : ''}
                                    </Text>
                                </View>

                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <TextInput
                                        style={[
                                            styles.formInput,
                                            { width: 60, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 6 },
                                            isApprovedLocked && { opacity: 0.6, backgroundColor: '#EFECE6' },
                                        ]}
                                        keyboardType="numeric"
                                        editable={!isApprovedLocked}
                                        value={qtyDrafts[index] ?? requiredVal.toString()}
                                        onChangeText={(val) => handleUpdateQuantity(index, val)}
                                    />
                                </View>

                                <View style={{ flex: 1.2, alignItems: 'center' }}>
                                    <Text style={[styles.tableDataText, { fontWeight: '700', color: '#8A6A4A' }]}>
                                        {billableVal} {item.unit}
                                    </Text>
                                    {isRoundedByMin && (
                                        <Text style={{ fontSize: 10, color: '#8A7E72' }}>
                                            (Mín. prov: {item.min_purchase_unit || 1} {item.unit})
                                        </Text>
                                    )}
                                </View>

                                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                    <Text style={[styles.tableDataText, { fontWeight: '700' }]}>
                                        {formatProposalAmount(item.subtotal, currency)}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={{ width: 40, alignItems: 'center', opacity: isApprovedLocked ? 0.3 : 1 }}
                                    disabled={isApprovedLocked || saving}
                                    onPress={() => handleRemoveMaterial(index)}
                                >
                                    <Text style={{ color: '#9E3B3B', fontSize: 16 }}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}

                    {/* Desglose de Mano de Obra */}
                    <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: '#EFECE6', paddingTop: 14 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A6A4A', marginBottom: 8, letterSpacing: 0.5 }}>
                            FASE DE TALLER & MANO DE OBRA ARTESANAL
                        </Text>
                        {laborList.length === 0 ? (
                            <Text style={{ fontSize: 12, color: '#8A7E72', fontStyle: 'italic' }}>
                                Sin partidas de mano de obra registradas en {currency}.
                            </Text>
                        ) : (
                            laborList.map((l) => (
                                <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                                    <Text style={{ fontSize: 13, color: '#171411' }}>• {l.description}</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#171411' }}>
                                        {formatProposalAmount(l.subtotal, currency)} {currency}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Botón de Aprobación Formal */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 18, gap: 12 }}>
                        {isApprovedLocked ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F7F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}>
                                <Text style={{ color: '#3D6346', fontWeight: '700', fontSize: 13 }}>
                                    ✓ PROPUESTA APROBADA (Snapshot Inmutable Congelado)
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.primaryGoldBtn, { paddingHorizontal: 16 }]}
                                onPress={handleApproveProposal}
                                disabled={approving || saving || materialsList.length === 0}
                            >
                                <Text style={styles.primaryGoldBtnText}>
                                    {approving ? 'Aprobando...' : '✓ Aprobar Propuesta (Congelar Precios)'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Modal de Catálogo Textil */}
            <MaterialsCatalogModal
                visible={isCatalogModalOpen}
                onClose={() => setIsCatalogModalOpen(false)}
                onSelectMaterial={handleSelectMaterialFromCatalog}
                targetCurrency={currency}
            />
        </View>
    );
};
