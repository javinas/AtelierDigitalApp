// ==============================================================================
// ATELIER DIGITAL — MÓDULO 05: PANEL DE GESTIÓN DE TRM MANUAL DE REFERENCIA
// Archivo: src/components/commercial/ManualTrmPanel.tsx
// ==============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    AtelierCurrencyRate,
    CurrencyRateBase,
    CurrencyRateTarget,
} from '../../types/commercial';
import {
    deactivateCurrencyRate,
    fetchActiveCurrencyRates,
    fetchCurrencyRateHistory,
    saveManualCurrencyRate,
} from '../../services/commercialService';
import { colors } from '../../theme/colors';
import { commercialStyles as styles } from './commercialStyles';
import {
    CURRENCY_PAIR_PRESETS,
    formatCurrencyRateValue,
    formatShortDateEs,
} from './materialLabels';

export interface ManualTrmPanelProps {
    onRatesChanged?: (activeRates: AtelierCurrencyRate[]) => void;
}

function getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const ManualTrmPanel: React.FC<ManualTrmPanelProps> = ({ onRatesChanged }) => {
    const { width } = useWindowDimensions();
    const isCompact = width < 720;

    const [activeRates, setActiveRates] = useState<AtelierCurrencyRate[]>([]);
    const [historyRates, setHistoryRates] = useState<AtelierCurrencyRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [baseCurrency, setBaseCurrency] = useState<CurrencyRateBase>('USD');
    const [targetCurrency, setTargetCurrency] = useState<CurrencyRateTarget>('COP');
    const [rateValueInput, setRateValueInput] = useState('');
    const [effectiveDateInput, setEffectiveDateInput] = useState(getTodayIsoDate());
    const [sourceNoteInput, setSourceNoteInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

    const loadAllRates = useCallback(async () => {
        const [activeRes, historyRes] = await Promise.all([
            fetchActiveCurrencyRates(),
            fetchCurrencyRateHistory(undefined, 30),
        ]);
        setActiveRates(activeRes.data);
        setHistoryRates(historyRes.data);
        setLoadError(activeRes.error || historyRes.error);
        setLoading(false);
        onRatesChanged?.(activeRes.data);
    }, [onRatesChanged]);

    useEffect(() => {
        let active = true;
        Promise.all([
            fetchActiveCurrencyRates(),
            fetchCurrencyRateHistory(undefined, 30),
        ]).then(([activeRes, historyRes]) => {
            if (!active) return;
            setActiveRates(activeRes.data);
            setHistoryRates(historyRes.data);
            setLoadError(activeRes.error || historyRes.error);
            setLoading(false);
            onRatesChanged?.(activeRes.data);
        });
        return () => {
            active = false;
        };
    }, [onRatesChanged]);

    const handleSaveRate = async () => {
        setActionError(null);
        const parsed = Number(rateValueInput.trim().replace(/,/g, '.'));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setActionError('Ingrese un valor numérico positivo mayor a 0 para la TRM manual.');
            return;
        }

        setSaving(true);
        const res = await saveManualCurrencyRate({
            base_currency: baseCurrency,
            target_currency: targetCurrency,
            rate_value: parsed,
            effective_date: effectiveDateInput.trim() || getTodayIsoDate(),
            source_note: sourceNoteInput.trim() || null,
            is_active: true,
        });
        setSaving(false);

        if (res.error || !res.data) {
            setActionError(res.error || 'No fue posible guardar la TRM manual.');
            return;
        }

        setRateValueInput('');
        setSourceNoteInput('');
        await loadAllRates();
    };

    const handleDeactivate = async (id: string) => {
        setActionError(null);
        setDeactivatingId(id);
        const res = await deactivateCurrencyRate(id);
        setDeactivatingId(null);
        if (res.error) {
            setActionError(res.error);
            return;
        }
        await loadAllRates();
    };

    return (
        <View style={{ gap: 16 }}>
            {/* Banner de política estricta sin conversiones automáticas */}
            <View
                style={{
                    backgroundColor: '#FFF8E7',
                    borderWidth: 1,
                    borderColor: '#E6D9C8',
                    borderRadius: 12,
                    padding: 14,
                }}
            >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.bronze, marginBottom: 4 }}>
                    POLÍTICA DE TRM MANUAL DE REFERENCIA (MÓDULO 05)
                </Text>
                <Text style={{ fontSize: 12, color: '#4A3E31', lineHeight: 18 }}>
                    Las tasas registradas aquí se ingresan manualmente por la diseñadora para consulta informativa. No se consultan APIs externas, no existen tasas quemadas (como 4.100) y nunca se reconvierten automáticamente propuestas ni cotizaciones emitidas.
                </Text>
            </View>

            {/* Tasas Activas */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                    <View>
                        <Text style={styles.sectionCardTitleGold}>TASAS ACTIVAS DE REFERENCIA</Text>
                        <Text style={styles.sectionCardSubtitle}>
                            Máximo una tasa activa por par de monedas (atelier_currency_rates)
                        </Text>
                    </View>
                </View>

                {loadError ? (
                    <View
                        style={{
                            backgroundColor: colors.errorBg,
                            padding: 10,
                            borderRadius: 8,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ color: colors.error, fontSize: 12 }}>{loadError}</Text>
                    </View>
                ) : null}

                {loading ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.champagneGold} />
                    </View>
                ) : activeRates.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateTitle}>Sin TRM manual configurada</Text>
                        <Text style={styles.emptyStateText}>
                            Registra debajo la tasa de cambio manual vigente cuando necesites referencia visual en el taller.
                        </Text>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {activeRates.map((rate) => (
                            <View
                                key={rate.id}
                                style={{
                                    flex: 1,
                                    minWidth: isCompact ? '100%' : 240,
                                    backgroundColor: '#FAF8F5',
                                    borderWidth: 1,
                                    borderColor: colors.sand,
                                    borderRadius: 12,
                                    padding: 14,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.bronze }}>
                                        {rate.base_currency} → {rate.target_currency}
                                    </Text>
                                    <View
                                        style={{
                                            backgroundColor: colors.successBg,
                                            borderColor: colors.successBorder,
                                            borderWidth: 1,
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>
                                            ACTIVA
                                        </Text>
                                    </View>
                                </View>

                                <Text
                                    style={{
                                        fontFamily: 'serif',
                                        fontSize: 20,
                                        fontWeight: '700',
                                        color: colors.atelierBlack,
                                        marginBottom: 4,
                                    }}
                                >
                                    1 {rate.base_currency} ={' '}
                                    {formatCurrencyRateValue(rate.rate_value, rate.target_currency)}
                                </Text>

                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                    Vigencia: {formatShortDateEs(rate.effective_date)}
                                    {rate.source_note ? ` · ${rate.source_note}` : ''}
                                </Text>

                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.secondaryOutlineBtn, { paddingVertical: 5, paddingHorizontal: 10 }]}
                                        onPress={() => handleDeactivate(rate.id)}
                                        disabled={deactivatingId === rate.id}
                                    >
                                        <Text style={[styles.secondaryOutlineBtnText, { fontSize: 11 }]}>
                                            {deactivatingId === rate.id ? 'Desactivando...' : 'Desactivar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Formulario para registrar nueva TRM manual */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                    <View>
                        <Text style={styles.sectionCardTitle}>Registrar Nueva TRM Manual</Text>
                        <Text style={styles.sectionCardSubtitle}>
                            Al guardar como activa, desactiva automáticamente la tasa anterior del mismo par.
                        </Text>
                    </View>
                </View>

                {actionError ? (
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
                        <Text style={{ color: colors.error, fontSize: 12 }}>{actionError}</Text>
                    </View>
                ) : null}

                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Par de Divisas *</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {CURRENCY_PAIR_PRESETS.map((preset) => {
                            const selected =
                                baseCurrency === preset.base && targetCurrency === preset.target;
                            return (
                                <TouchableOpacity
                                    key={preset.shortLabel}
                                    style={[styles.chipBtn, selected && styles.chipBtnActive]}
                                    onPress={() => {
                                        setBaseCurrency(preset.base);
                                        setTargetCurrency(preset.target);
                                    }}
                                >
                                    <Text style={[styles.chipBtnText, selected && styles.chipBtnTextActive]}>
                                        {preset.shortLabel}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={[styles.formRow, isCompact && { flexDirection: 'column', gap: 0 }]}>
                    <View style={[styles.formGroup, styles.formCol]}>
                        <Text style={styles.formLabel}>
                            Valor Tasa ({baseCurrency} → {targetCurrency}) *
                        </Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder={targetCurrency === 'COP' ? 'Ej: 4240.50' : 'Ej: 1.0850'}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            value={rateValueInput}
                            onChangeText={setRateValueInput}
                        />
                    </View>
                    <View style={[styles.formGroup, styles.formCol]}>
                        <Text style={styles.formLabel}>Fecha Efectiva (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="2026-11-11"
                            placeholderTextColor={colors.textMuted}
                            value={effectiveDateInput}
                            onChangeText={setEffectiveDateInput}
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1.5 }]}>
                        <Text style={styles.formLabel}>Nota / Fuente</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="Ej: TRM BanRep del día / Mesa cambio"
                            placeholderTextColor={colors.textMuted}
                            value={sourceNoteInput}
                            onChangeText={setSourceNoteInput}
                        />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={handleSaveRate}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={colors.atelierBlack} />
                        ) : (
                            <Text style={styles.primaryGoldBtnText}>Guardar TRM Manual Activa</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Historial de TRMs registradas */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                    <View>
                        <Text style={styles.sectionCardTitle}>Historial de Tasas Registradas</Text>
                        <Text style={styles.sectionCardSubtitle}>
                            Trazabilidad de referencia cambiaria definida por el atelier ({historyRates.length})
                        </Text>
                    </View>
                </View>

                {historyRates.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        Aún no hay registros históricos de tasas cambiarias.
                    </Text>
                ) : (
                    historyRates.map((item) => (
                        <View
                            key={item.id}
                            style={{
                                flexDirection: isCompact ? 'column' : 'row',
                                justifyContent: 'space-between',
                                alignItems: isCompact ? 'flex-start' : 'center',
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F5F3EF',
                                gap: 6,
                            }}
                        >
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.atelierBlack }}>
                                    {item.base_currency} → {item.target_currency}:{' '}
                                    {formatCurrencyRateValue(item.rate_value, item.target_currency)}
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                    Vigencia: {formatShortDateEs(item.effective_date)}
                                    {item.source_note ? ` · ${item.source_note}` : ''}
                                </Text>
                            </View>
                            <View
                                style={{
                                    backgroundColor: item.is_active ? colors.successBg : '#EFECE6',
                                    borderColor: item.is_active ? colors.successBorder : colors.sand,
                                    borderWidth: 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: item.is_active ? colors.success : colors.textSecondary,
                                    }}
                                >
                                    {item.is_active ? 'ACTIVA' : 'HISTÓRICA'}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </View>
    );
};
