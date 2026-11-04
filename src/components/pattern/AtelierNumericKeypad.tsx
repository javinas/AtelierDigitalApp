// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: TECLADO NUMÉRICO OPTIMIZADO PARA CAPTURA (M02 · FASE C)
// Archivo: src/components/pattern/AtelierNumericKeypad.tsx
// ==============================================================================
// Diseñado para una entrada rápida, ergonómica y táctil a una mano en tablets/móviles.
// Admite decimales con paso de 0.5 cm, borrado, limpieza, límites anatómicos y
// avance fluido a la siguiente medida.
// ==============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export interface AtelierNumericKeypadProps {
    measureCode: string;
    measureLabel: string;
    currentValueCm: number | null;
    unit?: 'cm' | 'in';
    minMm?: number;
    maxMm?: number;
    onConfirmValue: (valCm: number) => void;
    onPrevMeasure?: () => void;
    onNextMeasure?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
}

export const AtelierNumericKeypad: React.FC<AtelierNumericKeypadProps> = ({
    measureCode,
    measureLabel,
    currentValueCm,
    unit = 'cm',
    minMm,
    maxMm,
    onConfirmValue,
    onPrevMeasure,
    onNextMeasure,
    hasPrev = false,
    hasNext = false,
}) => {
    // String del valor en edición
    const [inputStr, setInputStr] = useState<string>(
        currentValueCm !== null && currentValueCm > 0
            ? String(Number.isInteger(currentValueCm) ? currentValueCm : currentValueCm.toFixed(1))
            : ''
    );

    // Límites en cm
    const minCm = minMm ? minMm / 10.0 : undefined;
    const maxCm = maxMm ? maxMm / 10.0 : undefined;

    const parsedNum = parseFloat(inputStr);
    const isValidNumber = !isNaN(parsedNum) && parsedNum > 0;

    // Validación de límites anatómicos
    const isOutOfRange =
        isValidNumber &&
        ((minCm !== undefined && parsedNum < minCm) || (maxCm !== undefined && parsedNum > maxCm));

    // Sincronizar cuando cambia la medida activa
    useEffect(() => {
        setInputStr( // eslint-disable-line react-hooks/set-state-in-effect
            currentValueCm !== null && currentValueCm > 0
                ? String(Number.isInteger(currentValueCm) ? currentValueCm : currentValueCm.toFixed(1))
                : ''
        );
    }, [measureCode, currentValueCm]);

    const handlePressDigit = useCallback((digit: string) => {
        if (inputStr.length >= 6) return;
        // Evitar múltiples ceros al inicio
        if (inputStr === '0' && digit === '0') return;
        if (inputStr === '0' && digit !== '0') {
            setInputStr(digit);
            return;
        }
        setInputStr((prev) => prev + digit);
    }, [inputStr]);

    const handlePressDot = useCallback(() => {
        if (inputStr.includes('.')) return;
        if (inputStr === '') {
            setInputStr('0.');
        } else {
            setInputStr((prev) => prev + '.');
        }
    }, [inputStr]);

    const handleBackspace = useCallback(() => {
        setInputStr((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
    }, []);

    const handleClear = useCallback(() => {
        setInputStr('');
    }, []);

    const handleAdjustment = useCallback((delta: number) => {
        const base = isValidNumber ? parsedNum : 0;
        const result = Math.max(0, Math.round((base + delta) * 10) / 10);
        setInputStr(result > 0 ? String(result) : '');
    }, [isValidNumber, parsedNum]);

    const handleConfirm = useCallback(() => {
        if (isValidNumber) {
            onConfirmValue(parsedNum);
        }
    }, [isValidNumber, onConfirmValue, parsedNum]);

    // Soporte para teclado físico en web
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // No interceptar si el usuario está enfocado en un campo de texto / textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                return;
            }

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handlePressDigit(e.key);
            } else if (e.key === '.' || e.key === ',') {
                e.preventDefault();
                handlePressDot();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'ArrowRight' && onNextMeasure) {
                e.preventDefault();
                onNextMeasure();
            } else if (e.key === 'ArrowLeft' && onPrevMeasure) {
                e.preventDefault();
                onPrevMeasure();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePressDigit, handlePressDot, handleBackspace, handleConfirm, onNextMeasure, onPrevMeasure]);

    return (
        <View style={styles.container}>
            {/* ENCABEZADO DE MEDIDA ACTIVA */}
            <View style={styles.measureHeader}>
                <View style={styles.measureMeta}>
                    <Text style={styles.measureLabel}>{measureLabel}</Text>
                    <Text style={styles.measureCode}>[{measureCode}]</Text>
                </View>

                {minCm !== undefined && maxCm !== undefined && (
                    <Text style={styles.rangeText}>
                        Rango anatómico: {minCm.toFixed(0)} – {maxCm.toFixed(0)} {unit}
                    </Text>
                )}
            </View>

            {/* VISUALIZADOR DEL VALOR DIGITADO */}
            <View style={[styles.displayBox, isOutOfRange && styles.displayBoxWarning]}>
                <Text style={styles.displayValue}>
                    {inputStr ? inputStr : '0.0'}
                </Text>
                <Text style={styles.displayUnit}>{unit}</Text>
            </View>

            {/* ALERTA DE RANGO ANATÓMICO */}
            {isOutOfRange && (
                <View style={styles.warningBanner}>
                    <Text style={styles.warningText}>
                        ⚠️ Valor fuera del rango estándar de taller ({minCm} – {maxCm} {unit}).
                    </Text>
                </View>
            )}

            {/* BOTONES DE MICRO-AJUSTE RÁPIDO */}
            <View style={styles.adjustmentRow}>
                <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => handleAdjustment(-1.0)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.adjustBtnText}>-1.0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => handleAdjustment(-0.5)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.adjustBtnText}>-0.5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => handleAdjustment(+0.5)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.adjustBtnText}>+0.5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.adjustBtn}
                    onPress={() => handleAdjustment(+1.0)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.adjustBtnText}>+1.0</Text>
                </TouchableOpacity>
            </View>

            {/* TECLADO NUMÉRICO TÁCTIL 4x3 */}
            <View style={styles.keypadGrid}>
                {/* FILA 1: 7, 8, 9 */}
                <View style={styles.keypadRow}>
                    {['7', '8', '9'].map((digit) => (
                        <TouchableOpacity
                            key={digit}
                            style={styles.keyBtn}
                            onPress={() => handlePressDigit(digit)}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.keyBtnText}>{digit}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FILA 2: 4, 5, 6 */}
                <View style={styles.keypadRow}>
                    {['4', '5', '6'].map((digit) => (
                        <TouchableOpacity
                            key={digit}
                            style={styles.keyBtn}
                            onPress={() => handlePressDigit(digit)}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.keyBtnText}>{digit}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FILA 3: 1, 2, 3 */}
                <View style={styles.keypadRow}>
                    {['1', '2', '3'].map((digit) => (
                        <TouchableOpacity
                            key={digit}
                            style={styles.keyBtn}
                            onPress={() => handlePressDigit(digit)}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.keyBtnText}>{digit}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FILA 4: C, 0, . */}
                <View style={styles.keypadRow}>
                    <TouchableOpacity
                        style={[styles.keyBtn, styles.actionKeyBtn]}
                        onPress={handleClear}
                        activeOpacity={0.6}
                    >
                        <Text style={[styles.keyBtnText, styles.actionKeyText]}>C</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.keyBtn}
                        onPress={() => handlePressDigit('0')}
                        activeOpacity={0.6}
                    >
                        <Text style={styles.keyBtnText}>0</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.keyBtn, styles.actionKeyBtn]}
                        onPress={handlePressDot}
                        activeOpacity={0.6}
                    >
                        <Text style={[styles.keyBtnText, { fontWeight: '700' }]}>.</Text>
                    </TouchableOpacity>
                </View>

                {/* FILA 5: BORRAR (⌫) Y CONFIRMAR (✓) */}
                <View style={styles.keypadRow}>
                    <TouchableOpacity
                        style={[styles.keyBtn, styles.backspaceKeyBtn]}
                        onPress={handleBackspace}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backspaceKeyText}>⌫ Borrar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.keyBtn,
                            styles.confirmKeyBtn,
                            !isValidNumber && styles.confirmKeyBtnDisabled,
                        ]}
                        onPress={handleConfirm}
                        disabled={!isValidNumber}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmKeyText}>✓ Confirmar</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* BOTONES DE NAVEGACIÓN ANTERIOR / SIGUIENTE DE COTA */}
            <View style={styles.navRow}>
                <TouchableOpacity
                    style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
                    onPress={onPrevMeasure}
                    disabled={!hasPrev}
                    activeOpacity={0.7}
                    accessibilityLabel="Cota anatómica anterior"
                    {...Platform.select({ web: { title: 'Ir a la cota anterior de la plantilla' } as any })}
                >
                    <Text style={[styles.navBtnText, !hasPrev && styles.navBtnTextDisabled]}>
                        ↑ Cota Ant.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
                    onPress={onNextMeasure}
                    disabled={!hasNext}
                    activeOpacity={0.7}
                    accessibilityLabel="Siguiente cota anatómica"
                    {...Platform.select({ web: { title: 'Pasar a la siguiente cota de la plantilla' } as any })}
                >
                    <Text style={[styles.navBtnText, !hasNext && styles.navBtnTextDisabled]}>
                        Cota Sig. ↓
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
        maxWidth: 380,
        width: '100%',
        alignSelf: 'center',
    },
    measureHeader: {
        marginBottom: 10,
    },
    measureMeta: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    measureLabel: {
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    measureCode: {
        fontSize: 11,
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    rangeText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    displayBox: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        backgroundColor: '#FFFDF9',
        borderWidth: 2,
        borderColor: colors.accent,
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 14,
        marginBottom: 6,
    },
    displayBoxWarning: {
        borderColor: '#E65100',
        backgroundColor: '#FFF8F2',
    },
    displayValue: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    displayUnit: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.accent,
        marginLeft: 6,
    },
    warningBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    warningText: {
        fontSize: 10.5,
        color: '#BF360C',
        textAlign: 'center',
    },
    adjustmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: 6,
    },
    adjustBtn: {
        flex: 1,
        backgroundColor: colors.background,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    adjustBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    keypadGrid: {
        gap: 6,
    },
    keypadRow: {
        flexDirection: 'row',
        gap: 6,
    },
    keyBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 9,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                userSelect: 'none',
            },
            default: {
                elevation: 1,
            },
        }),
    },
    keyBtnText: {
        fontSize: 19,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    actionKeyBtn: {
        backgroundColor: '#F3EDE2',
        borderColor: '#DFD5C6',
    },
    actionKeyText: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    backspaceKeyBtn: {
        flex: 1,
        backgroundColor: '#EFEBE6',
        borderColor: '#D7CEC5',
    },
    backspaceKeyText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6E5D4F',
    },
    confirmKeyBtn: {
        flex: 1.5,
        backgroundColor: colors.accent,
        borderColor: colors.accentDark || '#8A6A4A',
    },
    confirmKeyBtnDisabled: {
        opacity: 0.5,
        backgroundColor: '#D1C4B5',
        borderColor: '#C3B4A3',
    },
    confirmKeyText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    navBtn: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: '#FFFDF9',
        alignItems: 'center',
    },
    navBtnDisabled: {
        borderColor: colors.border,
        backgroundColor: '#F5F5F5',
        opacity: 0.4,
    },
    navBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.accent,
    },
    navBtnTextDisabled: {
        color: colors.textSecondary,
    },
});

