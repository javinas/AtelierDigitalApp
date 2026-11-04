// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MANIQUÍ ANATÓMICO TÁCTIL E INTERACTIVO (M02 · FASE C)
// Archivo: src/components/pattern/AtelierInteractiveMannequin.tsx
// ==============================================================================
// Representación anatómica táctil del cuerpo humano para el atelier de alta costura.
// Soporta vistas Frontal y Posterior, selección por regiones anatómicas, cotas
// interactivas con estado (capturada / pendiente), resaltado de medida activa
// y sincronización bidireccional en tiempo real con el formulario y teclado.
// ==============================================================================

import React, { useMemo } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import {
    AnatomicalPerspective,
    BodyDemographicType,
    DORSAL_EXCLUSIVE_COTA_CODES,
    FRONTAL_EXCLUSIVE_COTA_CODES,
    isCotaCompatibleWithPerspective,
} from '../../engine/pattern/catalog/anatomicalMapping';
import { MASTER_MEASUREMENT_CATALOG } from '../../engine/pattern/catalog/masterCatalog';

export interface InteractiveCotaItem {
    code: string;
    label: string;
    zone: string;
    xPercent: number; // 0..100% horizontal
    yPercent: number; // 0..100% vertical
    isDorsal?: boolean;
    isFrontal?: boolean;
}

// Catálogo de cotas anatómicas interactivas proyectadas sobre la silueta
export const INTERACTIVE_MANNEQUIN_COTAS: InteractiveCotaItem[] = [
    // CABEZA Y CUELLO
    { code: 'estatura', label: 'Estatura', zone: 'head_neck', xPercent: 50, yPercent: 4 },
    { code: 'contorno_cuello', label: 'Cuello', zone: 'head_neck', xPercent: 50, yPercent: 12 },

    // HOMBROS Y ESPALDA
    { code: 'ancho_hombros', label: 'Hombros', zone: 'shoulders', xPercent: 28, yPercent: 17 },
    { code: 'largo_hombro', label: 'L. Hombro', zone: 'shoulders', xPercent: 37, yPercent: 15 },
    { code: 'ancho_pecho', label: 'Ancho Pecho', zone: 'chest', xPercent: 50, yPercent: 21, isFrontal: true },
    { code: 'ancho_espalda', label: 'Ancho Espalda', zone: 'back', xPercent: 50, yPercent: 21, isDorsal: true },
    { code: 'largo_talle_delantero', label: 'Talle Del.', zone: 'bust', xPercent: 42, yPercent: 30, isFrontal: true },
    { code: 'largo_talle_espalda', label: 'Talle Esp.', zone: 'back', xPercent: 50, yPercent: 30, isDorsal: true },

    // PECHO Y BUSTO
    { code: 'contorno_alto_busto', label: 'Alto Busto', zone: 'bust', xPercent: 50, yPercent: 24, isFrontal: true },
    { code: 'contorno_busto', label: 'Busto / Pecho', zone: 'bust', xPercent: 50, yPercent: 28 },
    { code: 'contorno_bajo_busto', label: 'Bajo Busto', zone: 'bust', xPercent: 50, yPercent: 33, isFrontal: true },
    { code: 'separacion_busto', label: 'Sep. Busto', zone: 'bust', xPercent: 58, yPercent: 28, isFrontal: true },
    { code: 'altura_busto', label: 'Alt. Busto', zone: 'bust', xPercent: 44, yPercent: 26, isFrontal: true },

    // CINTURA Y CADERA
    { code: 'contorno_cintura', label: 'Cintura', zone: 'waist', xPercent: 50, yPercent: 40 },
    { code: 'contorno_cadera_alta', label: 'Cadera Alta', zone: 'hip', xPercent: 50, yPercent: 46 },
    { code: 'contorno_cadera', label: 'Cadera', zone: 'hip', xPercent: 50, yPercent: 52 },

    // BRAZOS Y MANGA
    { code: 'largo_brazo', label: 'Largo Brazo', zone: 'arms', xPercent: 18, yPercent: 35 },
    { code: 'contorno_biceps', label: 'Bíceps', zone: 'arms', xPercent: 20, yPercent: 27 },
    { code: 'contorno_muneca', label: 'Muñeca', zone: 'arms', xPercent: 14, yPercent: 48 },

    // PIERNAS E INFERIOR
    { code: 'largo_exterior_pierna', label: 'L. Pierna', zone: 'legs_lower', xPercent: 26, yPercent: 68 },
    { code: 'contorno_muslo', label: 'Muslo', zone: 'legs_lower', xPercent: 38, yPercent: 60 },
    { code: 'contorno_rodilla', label: 'Rodilla', zone: 'legs_lower', xPercent: 38, yPercent: 72 },
    { code: 'contorno_tobillo', label: 'Tobillo', zone: 'legs_lower', xPercent: 40, yPercent: 88 },
    { code: 'largo_entrepierna', label: 'Entrepierna', zone: 'legs_lower', xPercent: 50, yPercent: 64 },
];

export interface AtelierInteractiveMannequinProps {
    measurementsMm: Record<string, number>;
    selectedMeasureCode: string | null;
    onSelectMeasureCode: (code: string) => void;
    activeZone?: string | null;
    onSelectZone?: (zone: string) => void;
    perspective: AnatomicalPerspective;
    onPerspectiveChange: (p: AnatomicalPerspective) => void;
    demographic?: BodyDemographicType;
    interactiveHeight?: number;
}

export const AtelierInteractiveMannequin: React.FC<AtelierInteractiveMannequinProps> = ({
    measurementsMm,
    selectedMeasureCode,
    onSelectMeasureCode,
    activeZone,
    onSelectZone,
    perspective,
    onPerspectiveChange,
    demographic = 'woman',
    interactiveHeight = 560,
}) => {
    // Filtrar cotas según la perspectiva activa
    const visibleCotas = useMemo(() => {
        return INTERACTIVE_MANNEQUIN_COTAS.filter((cota) => {
            if (perspective === 'front') {
                if (cota.isDorsal) return false;
                if (DORSAL_EXCLUSIVE_COTA_CODES.has(cota.code)) return false;
            } else {
                if (cota.isFrontal) return false;
                if (FRONTAL_EXCLUSIVE_COTA_CODES.has(cota.code)) return false;
            }
            return true;
        });
    }, [perspective]);

    // Estadísticas rápidas del maniquí
    const stats = useMemo(() => {
        const total = visibleCotas.length;
        const captured = visibleCotas.filter((c) => {
            const val = measurementsMm[c.code];
            return typeof val === 'number' && Number.isFinite(val) && val > 0;
        }).length;
        return { total, captured, percent: total > 0 ? Math.round((captured / total) * 100) : 0 };
    }, [visibleCotas, measurementsMm]);

    // Zonas interactivas principales
    const ANATOMICAL_ZONES = [
        { id: 'head_neck', label: 'Cuello' },
        { id: 'shoulders', label: 'Hombros' },
        { id: 'chest', label: 'Tórax' },
        { id: 'bust', label: 'Busto' },
        { id: 'waist', label: 'Cintura' },
        { id: 'hip', label: 'Cadera' },
        { id: 'arms', label: 'Brazos' },
        { id: 'legs_lower', label: 'Piernas' },
    ];

    return (
        <View style={styles.container}>
            {/* BARRA SUPERIOR: PERSPECTIVA Y PROGRESO */}
            <View style={styles.topControlRow}>
                <View style={styles.perspectiveToggle}>
                    <TouchableOpacity
                        style={[
                            styles.perspectiveBtn,
                            perspective === 'front' && styles.perspectiveBtnActive,
                        ]}
                        onPress={() => onPerspectiveChange('front')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.perspectiveBtnText,
                                perspective === 'front' && styles.perspectiveBtnTextActive,
                            ]}
                        >
                            Vista Frontal
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.perspectiveBtn,
                            perspective === 'back' && styles.perspectiveBtnActive,
                        ]}
                        onPress={() => onPerspectiveChange('back')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.perspectiveBtnText,
                                perspective === 'back' && styles.perspectiveBtnTextActive,
                            ]}
                        >
                            Vista Posterior
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.progressPill}>
                    <Text style={styles.progressPillText}>
                        {stats.captured}/{stats.total} ({stats.percent}%)
                    </Text>
                </View>
            </View>

            {/* SELECTOR DE ZONAS ANATÓMICAS */}
            <View style={styles.zonesRow}>
                {ANATOMICAL_ZONES.map((z) => {
                    const isSelected = activeZone === z.id;
                    return (
                        <TouchableOpacity
                            key={z.id}
                            style={[styles.zoneChip, isSelected && styles.zoneChipActive]}
                            onPress={() => onSelectZone?.(z.id)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[styles.zoneChipText, isSelected && styles.zoneChipTextActive]}
                            >
                                {z.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* LIENZO VECTORIAL DEL MANIQUÍ ANATÓMICO */}
            <View style={[styles.canvasArea, { height: interactiveHeight }]}>
                {/* SILUETA VECTORIAL ANATÓMICA SVG (Renderizado web de alta precisión) */}
                {Platform.OS === 'web' ? (
                    <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 340 540"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            pointerEvents: 'none',
                        }}
                    >
                        <defs>
                            <linearGradient id="mannequinBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2A241F" />
                                <stop offset="50%" stopColor="#1E1A16" />
                                <stop offset="100%" stopColor="#12100E" />
                            </linearGradient>
                            <filter id="cotaGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#A78350" floodOpacity="0.8" />
                            </filter>
                        </defs>

                        {/* Cabeza y cuello */}
                        <ellipse cx="170" cy="45" rx="20" ry="26" fill="url(#mannequinBodyGrad)" stroke="#A78350" strokeWidth="1.2" opacity="0.8" />
                        <path d="M162 70 Q170 76 178 70 L180 88 Q170 92 160 88 Z" fill="url(#mannequinBodyGrad)" stroke="#8A6A4A" strokeWidth="1" />

                        {/* Silueta Torso y Tronco Paramétrico */}
                        {demographic === 'woman' ? (
                            <path
                                d={
                                    perspective === 'front'
                                        ? 'M142 90 Q170 95 198 90 L228 106 Q205 130 196 150 Q208 175 190 216 Q184 235 186 280 L154 280 Q156 235 150 216 Q132 175 144 150 Q135 130 112 106 Z'
                                        : 'M142 90 Q170 94 198 90 L228 106 Q206 130 198 155 Q205 178 188 216 Q182 236 186 280 L154 280 Q158 236 152 216 Q135 178 142 155 Q134 130 112 106 Z'
                                }
                                fill="url(#mannequinBodyGrad)"
                                stroke="#A78350"
                                strokeWidth="1.5"
                            />
                        ) : (
                            <path
                                d="M138 90 Q170 94 202 90 L234 104 Q216 135 204 165 Q202 185 194 220 Q190 240 190 280 L150 280 Q150 240 146 220 Q138 185 136 165 Q124 135 106 104 Z"
                                fill="url(#mannequinBodyGrad)"
                                stroke="#A78350"
                                strokeWidth="1.5"
                            />
                        )}

                        {/* Extremidades Superiores (Brazos sutiles) */}
                        <path d="M112 106 Q98 150 92 200 Q88 240 82 270" stroke="#766B62" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />
                        <path d="M228 106 Q242 150 248 200 Q252 240 258 270" stroke="#766B62" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />

                        {/* Extremidades Inferiores (Piernas estilizadas de alta costura) */}
                        <path d="M156 280 L150 380 Q148 420 146 480" stroke="#2A241F" strokeWidth="16" strokeLinecap="round" fill="none" />
                        <path d="M184 280 L190 380 Q192 420 194 480" stroke="#2A241F" strokeWidth="16" strokeLinecap="round" fill="none" />
                        <path d="M156 280 L150 380 Q148 420 146 480" stroke="#8A6A4A" strokeWidth="1" fill="none" opacity="0.7" />
                        <path d="M184 280 L190 380 Q192 420 194 480" stroke="#8A6A4A" strokeWidth="1" fill="none" opacity="0.7" />

                        {/* Líneas guía anatómicas sutiles (Busto, Cintura, Cadera) */}
                        <line x1="140" y1="150" x2="200" y2="150" stroke="#A78350" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
                        <line x1="145" y1="216" x2="195" y2="216" stroke="#A78350" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
                        <line x1="140" y1="270" x2="200" y2="270" stroke="#A78350" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
                    </svg>
                ) : (
                    <View style={styles.fallbackMannequinContainer}>
                        <View style={styles.fallbackHead} />
                        <View style={styles.fallbackTorso} />
                        <View style={styles.fallbackLegs} />
                    </View>
                )}

                {/* COTAS INTERACTIVAS Y PUNTOS DE CAPTURA ANATÓMICA */}
                {visibleCotas.map((cota) => {
                    const rawVal = measurementsMm[cota.code];
                    const isMeasured = typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0;
                    const isSelected = selectedMeasureCode === cota.code;
                    const valCm = isMeasured ? (rawVal / 10.0).toFixed(1) : null;

                    return (
                        <TouchableOpacity
                            key={cota.code}
                            style={[
                                styles.cotaPinContainer,
                                {
                                    left: `${cota.xPercent}%`,
                                    top: `${cota.yPercent}%`,
                                },
                                isSelected && styles.cotaPinContainerSelected,
                            ]}
                            onPress={() => onSelectMeasureCode(cota.code)}
                            activeOpacity={0.8}
                        >
                            {/* Punto / Anillo de referencia */}
                            <View
                                style={[
                                    styles.cotaDot,
                                    isMeasured && styles.cotaDotMeasured,
                                    isSelected && styles.cotaDotSelected,
                                ]}
                            >
                                {isMeasured && <Text style={styles.cotaDotCheck}>✓</Text>}
                            </View>

                            {/* Etiqueta métrica legible */}
                            <View
                                style={[
                                    styles.cotaBadge,
                                    isMeasured && styles.cotaBadgeMeasured,
                                    isSelected && styles.cotaBadgeSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.cotaLabelText,
                                        isSelected && styles.cotaLabelTextSelected,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {cota.label}
                                </Text>
                                {isMeasured && (
                                    <Text style={styles.cotaValueText}>{valCm} cm</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* PIE DE MANIQUÍ: LEYENDA EDITORIAL */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.cotaDot, styles.cotaDotMeasured, { width: 12, height: 12 }]}>
                        <Text style={[styles.cotaDotCheck, { fontSize: 8 }]}>✓</Text>
                    </View>
                    <Text style={styles.legendText}>Registrada</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.cotaDot, { width: 12, height: 12 }]} />
                    <Text style={styles.legendText}>Pendiente</Text>
                </View>

                <View style={styles.legendItem}>
                    <View style={[styles.cotaDot, styles.cotaDotSelected, { width: 12, height: 12 }]} />
                    <Text style={styles.legendText}>Medida Activa</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1A16',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#3D342C',
        width: '100%',
        alignSelf: 'center',
    },
    topControlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    perspectiveToggle: {
        flexDirection: 'row',
        backgroundColor: '#2A241F',
        borderRadius: 8,
        padding: 3,
        borderWidth: 1,
        borderColor: '#4A3E33',
    },
    perspectiveBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    perspectiveBtnActive: {
        backgroundColor: colors.accent,
    },
    perspectiveBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#C7B9A9',
    },
    perspectiveBtnTextActive: {
        color: '#FFFFFF',
    },
    progressPill: {
        backgroundColor: '#2A241F',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    progressPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.accent,
    },
    zonesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 8,
        justifyContent: 'center',
    },
    zoneChip: {
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 4,
        backgroundColor: '#26201B',
        borderWidth: 1,
        borderColor: '#3E342B',
    },
    zoneChipActive: {
        borderColor: colors.accent,
        backgroundColor: '#3E3225',
    },
    zoneChipText: {
        fontSize: 10,
        color: '#A99B8B',
    },
    zoneChipTextActive: {
        color: colors.accent,
        fontWeight: '700',
    },
    canvasArea: {
        position: 'relative',
        width: '100%',
        backgroundColor: '#171411',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2D2620',
    },
    fallbackMannequinContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackHead: {
        width: 36,
        height: 48,
        borderRadius: 18,
        backgroundColor: '#2A241F',
        borderColor: colors.accent,
        borderWidth: 1,
        marginBottom: 8,
    },
    fallbackTorso: {
        width: 90,
        height: 180,
        borderRadius: 12,
        backgroundColor: '#2A241F',
        borderColor: colors.accent,
        borderWidth: 1,
        marginBottom: 8,
    },
    fallbackLegs: {
        width: 70,
        height: 180,
        backgroundColor: '#2A241F',
        borderColor: '#8A6A4A',
        borderWidth: 1,
    },
    cotaPinContainer: {
        position: 'absolute',
        transform: [{ translateX: -30 }, { translateY: -14 }],
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 5,
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    cotaPinContainerSelected: {
        zIndex: 10,
        transform: [{ translateX: -30 }, { translateY: -14 }, { scale: 1.1 }],
    },
    cotaDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#A99B8B',
        backgroundColor: '#1E1A16',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cotaDotMeasured: {
        borderColor: '#10B981',
        backgroundColor: '#064E3B',
    },
    cotaDotSelected: {
        borderColor: colors.accent,
        backgroundColor: colors.accent,
        borderWidth: 2,
    },
    cotaDotCheck: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 11,
    },
    cotaBadge: {
        marginLeft: 4,
        backgroundColor: 'rgba(30, 26, 22, 0.88)',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#4A3E33',
        maxWidth: 110,
    },
    cotaBadgeMeasured: {
        borderColor: '#059669',
        backgroundColor: 'rgba(6, 78, 59, 0.85)',
    },
    cotaBadgeSelected: {
        borderColor: colors.accent,
        backgroundColor: 'rgba(167, 131, 80, 0.95)',
    },
    cotaLabelText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#E6D9C8',
    },
    cotaLabelTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    cotaValueText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'monospace',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#2D2620',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendText: {
        fontSize: 10,
        color: '#A99B8B',
    },
});

