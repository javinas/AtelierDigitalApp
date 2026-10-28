// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: MANIQUÍ ANATÓMICO DE TALLER (BY KATHERINE CARROLL)
// Archivo: src/components/pattern/AtelierMannequinDisplay.tsx
// ==============================================================================
// Réplica idéntica fotorrealista de alta costura: Busto de sastre francés con
// relación de aspecto 100% proporcional, cotas métricas milimétricas con líneas
// directas al torso, modo dinámico por tipo de prenda de alta costura (Falda,
// Corpiño, Vestido, Pantalón, Manga), gema esmeralda luminosa y controles de taller.
// ==============================================================================

import React, { useState } from 'react';
import {
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { MeasurementSession } from '../../types/pattern/measurement';
import { GarmentType } from '../../types/pattern/pattern';

interface AtelierMannequinDisplayProps {
    measurementsMm: Record<string, number>;
    session: MeasurementSession | null;
    clientName?: string;
    garmentType?: GarmentType;
    selectedTemplateName?: string;
    referenceProfileLabel?: string;
    associatedCreationName?: string;
    isMeasurementOnly?: boolean;
    onNewSession?: () => void;
    onCorrectSession?: () => void;
    onSelectGarmentType?: (type: GarmentType) => void;
}

const realisticMannequinAsset = require('../../../assets/mannequin_realistic.jpg');

const formatSessionDate = (d?: string | null): string => {
    if (!d) return 'Fecha pendiente';
    const clean = d.includes('T') ? d.split('T')[0] : d;
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
};

export function AtelierMannequinDisplay({
    measurementsMm,
    session,
    clientName,
    garmentType,
    selectedTemplateName,
    referenceProfileLabel,
    associatedCreationName,
    isMeasurementOnly = false,
    onNewSession,
    onCorrectSession,
    onSelectGarmentType,
}: AtelierMannequinDisplayProps) {
    // Si no hay prenda o es modo solo medidas, usar vista anatómica completa sin forzar prenda
    const [viewMode, setViewMode] = useState<'garment' | 'full'>(
        garmentType && !isMeasurementOnly ? 'garment' : 'full'
    );

    // Conversión a centímetros para visualización humana de alta costura
    const getValCm = (code: string): string => {
        const valMm = measurementsMm[code] ?? measurementsMm[`${code}_right`] ?? measurementsMm[`${code}_left`];
        if (typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0) {
            const cm = valMm / 10.0;
            return (Number.isInteger(cm) ? cm.toFixed(0) : cm.toFixed(1)) + ' cm';
        }
        return 'No registrada';
    };

    const registeredCount = Object.values(measurementsMm).filter(
        (v) => typeof v === 'number' && Number.isFinite(v) && v > 0
    ).length;

    // Fórmulas derivadas de respaldo en vivo (C10)
    const hasTalleEsp = typeof measurementsMm['largo_talle_espalda'] === 'number' && measurementsMm['largo_talle_espalda'] > 0;
    const derivedSisaMm = hasTalleEsp ? (measurementsMm['largo_talle_espalda'] / 2.0) + 10 : null;

    // Valores medidos formateados en cm reales (sin valores de prueba engañosos)
    const bustVal = getValCm('contorno_busto');
    const waistVal = getValCm('contorno_cintura');
    const hipVal = getValCm('contorno_cadera');
    const neckVal = getValCm('contorno_cuello');
    const shoulderVal = getValCm('largo_hombro');
    const backLengthVal = getValCm('largo_talle_espalda');
    const armholeVal = typeof measurementsMm['profundidad_sisa'] === 'number' && measurementsMm['profundidad_sisa'] > 0
        ? getValCm('profundidad_sisa')
        : derivedSisaMm !== null
        ? ((Number.isInteger(derivedSisaMm / 10.0) ? (derivedSisaMm / 10.0).toFixed(0) : (derivedSisaMm / 10.0).toFixed(1)) + ' cm')
        : 'NO REGISTRADA';
    const hipHeightVal = getValCm('altura_cadera');
    const skirtLengthVal = getValCm('largo_falda');
    const crotchHeightVal = getValCm('altura_tiro');
    const pantsLengthVal = getValCm('largo_pantalon');
    const sleeveLengthVal = getValCm('largo_brazo');
    const bicepVal = getValCm('contorno_biceps');
    const wristVal = getValCm('contorno_muneca');

    const versionNum = session?.version_number ?? null;
    const nextVersionNum = versionNum ? versionNum + 1 : 2;

    // Helper seguro para verificar inclusión de prenda
    const isGarmentIn = (...types: GarmentType[]): boolean =>
        garmentType ? types.includes(garmentType) : false;

    // Nombre legible de la prenda
    const getGarmentLabel = (type?: GarmentType): string => {
        if (!type) return 'Alta Costura';
        switch (type) {
            case 'skirt': return 'Falda';
            case 'bodice': return 'Corpiño Base';
            case 'dress': return 'Vestido Princesa';
            case 'pants': return 'Pantalón';
            case 'sleeve': return 'Manga';
            case 'blouse': return 'Blusa Fluida';
            case 'shirt': return 'Camisa de Alta Costura';
            case 'corset': return 'Corpiño / Corsé de Alta Costura';
            case 'jacket': return 'Chaqueta Sastre';
            case 'coat': return 'Abrigo Sastre';
            default: return 'Alta Costura';
        }
    };

    return (
        <View style={styles.container}>
            {/* Cabecera del Maniquí con Estado de Sesión en Gema Esmeralda */}
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>ANATOMÍA & MEDIDAS</Text>
                    <Text style={styles.subtitleMain}>
                        {clientName || (referenceProfileLabel ? referenceProfileLabel.toUpperCase() : 'Busto de Sastre')}
                    </Text>
                    <Text style={styles.subtitleSecondary}>
                        {session ? `Sesión v${versionNum} · ${formatSessionDate(session?.session_date)}` : (referenceProfileLabel || 'Alta Costura')}
                    </Text>
                    {associatedCreationName && (
                        <Text style={styles.associatedCreationSub}>
                            CREACIÓN ASOCIADA: {associatedCreationName}
                        </Text>
                    )}
                </View>

                {/* Placa Gema Esmeralda Luminosa */}
                <View style={styles.emeraldGemBadge}>
                    <Text style={styles.emeraldGemVersion}>
                        {versionNum ? `v${versionNum}` : (referenceProfileLabel || 'Libre')}
                    </Text>
                    <Text style={styles.emeraldGemStatus}>
                        {session?.status === 'completed'
                            ? 'FINALIZADA'
                            : session?.status === 'verified'
                            ? 'VERIFICADA'
                            : session?.status === 'draft'
                            ? 'BORRADOR'
                            : (registeredCount > 0 ? 'ACTIVO' : 'SIN MEDIDAS')}
                    </Text>
                </View>
            </View>

            {/* Selector de Modo de Medidas: Solo visible si hay prenda activa y no es modo solo medidas */}
            {garmentType && !isMeasurementOnly && (
                <View style={styles.modeSelectorRow}>
                    <TouchableOpacity
                        style={[
                            styles.modeSelectorTab,
                            viewMode === 'garment' && styles.modeSelectorTabActive,
                        ]}
                        onPress={() => setViewMode('garment')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.modeSelectorText,
                                viewMode === 'garment' && styles.modeSelectorTextActive,
                            ]}
                        >
                            ✨ {getGarmentLabel(garmentType)}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.modeSelectorTab,
                            viewMode === 'full' && styles.modeSelectorTabActive,
                        ]}
                        onPress={() => setViewMode('full')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.modeSelectorText,
                                viewMode === 'full' && styles.modeSelectorTextActive,
                            ]}
                        >
                            Completa (7 Cotas)
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Cabecera explicativa explícita de Sesión Utilizada / Perfil Anatómico */}
            <View style={styles.sessionActiveBanner}>
                <View style={styles.sessionActiveBannerLeft}>
                    <Text style={styles.sessionActiveLabel}>
                        {session ? 'SESIÓN UTILIZADA' : (referenceProfileLabel ? 'PERFIL ANATÓMICO' : 'SESIÓN UTILIZADA')}
                    </Text>
                    <Text style={styles.sessionActiveTitle}>
                        {session
                            ? `v${versionNum} · ${formatSessionDate(session?.session_date)}${clientName ? ` · ${clientName}` : ''}`
                            : (referenceProfileLabel ? referenceProfileLabel.toUpperCase() : (registeredCount === 0 ? 'Sin datos anatómicos suficientes' : 'Sin sesión'))}
                    </Text>
                    <Text style={styles.sessionActiveClientText}>
                        {session
                            ? `CLIENTA: ${clientName || 'Sin clienta'}`
                            : (referenceProfileLabel ? 'PATRÓN LIBRE · BANCO GLOBAL' : (clientName ? `CLIENTA: ${clientName}` : 'Sin clienta'))}
                    </Text>
                </View>
                <View style={styles.sessionActiveBannerRight}>
                    <View style={styles.registeredCountBadge}>
                        <Text style={styles.registeredCountBadgeText}>
                            {registeredCount > 0
                                ? `✓ ${registeredCount} medidas anatómicas activas`
                                : 'Sin datos anatómicos suficientes'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Escenario del Maniquí con Relación de Aspecto Proporcional y Cotas Alineadas */}
            <View style={styles.stage}>
                {/* Maniquí Central de Alta Definición */}
                <View style={styles.mannequinBackgroundWrap} pointerEvents="none">
                    <Image
                        source={realisticMannequinAsset}
                        style={styles.mannequinImage}
                        resizeMode="contain"
                    />
                </View>

                {/* COTAS DEL LADO IZQUIERDO */}
                <View style={styles.leftCotasLayer} pointerEvents="box-none">
                    {/* HOMBRO (Bodice, Dress, Sleeve, Blouse, Shirt, Corset, Jacket, Coat, o Full) */}
                    {(viewMode === 'full' || isGarmentIn('bodice', 'dress', 'sleeve', 'blouse', 'shirt', 'corset', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemLeft, { top: 78 }]}>
                            <View style={styles.calloutBadge}>
                                <Text style={styles.calloutLabel}>HOMBRO</Text>
                                <Text style={styles.calloutValue}>{shoulderVal}</Text>
                            </View>
                            <View style={styles.pointerGroupLeft}>
                                <View style={styles.pointerLineLeft} />
                                <View style={styles.pointerDot} />
                            </View>
                        </View>
                    )}

                    {/* BUSTO (Bodice, Dress, Blouse, Shirt, Corset, Jacket, Coat, o Full) — DESTACADO EN ORO CÁLIDO */}
                    {(viewMode === 'full' || isGarmentIn('bodice', 'dress', 'blouse', 'shirt', 'corset', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemLeft, { top: 154 }]}>
                            <View style={[styles.calloutBadge, styles.calloutHighlightGold]}>
                                <Text style={[styles.calloutLabel, styles.calloutLabelHighlight]}>BUSTO</Text>
                                <Text style={[styles.calloutValue, styles.calloutValueHighlight]}>{bustVal}</Text>
                            </View>
                            <View style={styles.pointerGroupLeft}>
                                <View style={[styles.pointerLineLeft, styles.pointerLineHighlight]} />
                                <View style={[styles.pointerDot, styles.pointerDotHighlight]} />
                            </View>
                        </View>
                    )}

                    {/* CINTURA EN LADO IZQUIERDO PARA FALDA Y PANTALÓN */}
                    {viewMode === 'garment' && isGarmentIn('skirt', 'pants') && (
                        <View style={[styles.cotaItemLeft, { top: 228 }]}>
                            <View style={[styles.calloutBadge, styles.calloutHighlightGold]}>
                                <Text style={[styles.calloutLabel, styles.calloutLabelHighlight]}>CINTURA</Text>
                                <Text style={[styles.calloutValue, styles.calloutValueHighlight]}>{waistVal}</Text>
                            </View>
                            <View style={styles.pointerGroupLeft}>
                                <View style={[styles.pointerLineLeft, styles.pointerLineHighlight]} />
                                <View style={[styles.pointerDot, styles.pointerDotHighlight]} />
                            </View>
                        </View>
                    )}

                    {/* CADERA (Skirts, Pants, Dress, Jacket, Coat, o Full) */}
                    {(viewMode === 'full' || isGarmentIn('skirt', 'pants', 'dress', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemLeft, { top: 308 }]}>
                            <View style={[styles.calloutBadge, isGarmentIn('skirt', 'pants', 'jacket', 'coat') && styles.calloutHighlightGold]}>
                                <Text style={[styles.calloutLabel, isGarmentIn('skirt', 'pants', 'jacket', 'coat') && styles.calloutLabelHighlight]}>CADERA</Text>
                                <Text style={[styles.calloutValue, isGarmentIn('skirt', 'pants', 'jacket', 'coat') && styles.calloutValueHighlight]}>{hipVal}</Text>
                            </View>
                            <View style={styles.pointerGroupLeft}>
                                <View style={[styles.pointerLineLeft, isGarmentIn('skirt', 'pants', 'jacket', 'coat') && styles.pointerLineHighlight]} />
                                <View style={[styles.pointerDot, isGarmentIn('skirt', 'pants', 'jacket', 'coat') && styles.pointerDotHighlight]} />
                            </View>
                        </View>
                    )}
                </View>

                {/* COTAS DEL LADO DERECHO */}
                <View style={styles.rightCotasLayer} pointerEvents="box-none">
                    {/* CUELLO (Bodice, Dress, Blouse, Shirt, Jacket, Coat, o Full) */}
                    {(viewMode === 'full' || isGarmentIn('bodice', 'dress', 'blouse', 'shirt', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemRight, { top: 58 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={styles.pointerDot} />
                                <View style={styles.pointerLineRight} />
                            </View>
                            <View style={styles.calloutBadge}>
                                <Text style={styles.calloutLabel}>CUELLO</Text>
                                <Text style={styles.calloutValue}>{neckVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* SISA (C10) CON INSIGNIA TÉCNICA TC */}
                    {(viewMode === 'full' || isGarmentIn('bodice', 'dress', 'sleeve', 'blouse', 'shirt', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemRight, { top: 132 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={styles.pointerDot} />
                                <View style={styles.pointerLineRight} />
                            </View>
                            <View style={styles.calloutBadge}>
                                <View style={styles.labelRowWithBadge}>
                                    <Text style={styles.calloutLabel}>SISA (C10)</Text>
                                    <View style={styles.starBadgeTC}>
                                        <Text style={styles.starBadgeTCText}>TC</Text>
                                    </View>
                                </View>
                                <Text style={styles.calloutValue}>{armholeVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* CINTURA EN LADO DERECHO (Bodice, Dress, Blouse, Shirt, Corset, Jacket, Coat, o Full) — DESTACADA EN ORO */}
                    {(viewMode === 'full' || isGarmentIn('bodice', 'dress', 'blouse', 'shirt', 'corset', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemRight, { top: 228 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={[styles.pointerDot, styles.pointerDotHighlight]} />
                                <View style={[styles.pointerLineRight, styles.pointerLineHighlight]} />
                            </View>
                            <View style={[styles.calloutBadge, styles.calloutHighlightGold]}>
                                <Text style={[styles.calloutLabel, styles.calloutLabelHighlight]}>CINTURA</Text>
                                <Text style={[styles.calloutValue, styles.calloutValueHighlight]}>{waistVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* ALTURA DE CADERA (Específico para Falda) */}
                    {viewMode === 'garment' && garmentType === 'skirt' && (
                        <View style={[styles.cotaItemRight, { top: 268 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={styles.pointerDot} />
                                <View style={styles.pointerLineRight} />
                            </View>
                            <View style={styles.calloutBadge}>
                                <Text style={styles.calloutLabel}>ALT. CADERA</Text>
                                <Text style={styles.calloutValue}>{hipHeightVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* LARGO DE FALDA (Específico para Falda) */}
                    {viewMode === 'garment' && garmentType === 'skirt' && (
                        <View style={[styles.cotaItemRight, { top: 340 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={[styles.pointerDot, styles.pointerDotHighlight]} />
                                <View style={[styles.pointerLineRight, styles.pointerLineHighlight]} />
                            </View>
                            <View style={[styles.calloutBadge, styles.calloutHighlightGold]}>
                                <Text style={[styles.calloutLabel, styles.calloutLabelHighlight]}>LARGO FALDA</Text>
                                <Text style={[styles.calloutValue, styles.calloutValueHighlight]}>{skirtLengthVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* ALTURA DE TIRO (Específico para Pantalón) */}
                    {viewMode === 'garment' && garmentType === 'pants' && (
                        <View style={[styles.cotaItemRight, { top: 268 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={styles.pointerDot} />
                                <View style={styles.pointerLineRight} />
                            </View>
                            <View style={styles.calloutBadge}>
                                <Text style={styles.calloutLabel}>ALTURA TIRO</Text>
                                <Text style={styles.calloutValue}>{crotchHeightVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* LARGO DE PANTALÓN (Específico para Pantalón) */}
                    {viewMode === 'garment' && garmentType === 'pants' && (
                        <View style={[styles.cotaItemRight, { top: 340 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={[styles.pointerDot, styles.pointerDotHighlight]} />
                                <View style={[styles.pointerLineRight, styles.pointerLineHighlight]} />
                            </View>
                            <View style={[styles.calloutBadge, styles.calloutHighlightGold]}>
                                <Text style={[styles.calloutLabel, styles.calloutLabelHighlight]}>LARGO PANTALÓN</Text>
                                <Text style={[styles.calloutValue, styles.calloutValueHighlight]}>{pantsLengthVal}</Text>
                            </View>
                        </View>
                    )}

                    {/* LARGO DE MANGA Y CONTORNO BRAZO (Específico para Manga) */}
                    {viewMode === 'garment' && garmentType === 'sleeve' && (
                        <>
                            <View style={[styles.cotaItemRight, { top: 210 }]}>
                                <View style={styles.pointerGroupRight}>
                                    <View style={styles.pointerDot} />
                                    <View style={styles.pointerLineRight} />
                                </View>
                                <View style={styles.calloutBadge}>
                                    <Text style={styles.calloutLabel}>CONT. BRAZO</Text>
                                    <Text style={styles.calloutValue}>{bicepVal}</Text>
                                </View>
                            </View>
                            <View style={[styles.cotaItemRight, { top: 290 }]}>
                                <View style={styles.pointerGroupRight}>
                                    <View style={[styles.pointerDot, styles.pointerDotHighlight]} />
                                    <View style={[styles.pointerLineRight, styles.pointerLineHighlight]} />
                                </View>
                                <View style={[styles.calloutBadge, styles.calloutHighlightGold]}>
                                    <Text style={[styles.calloutLabel, styles.calloutLabelHighlight]}>LARGO MANGA</Text>
                                    <Text style={[styles.calloutValue, styles.calloutValueHighlight]}>{sleeveLengthVal}</Text>
                                </View>
                            </View>
                        </>
                    )}

                    {/* TALLE ESPALDA (Bodice, Dress, Blouse, Shirt, Jacket, Coat, o Full) */}
                    {(viewMode === 'full' || isGarmentIn('bodice', 'dress', 'blouse', 'shirt', 'jacket', 'coat')) && (
                        <View style={[styles.cotaItemRight, { top: 308 }]}>
                            <View style={styles.pointerGroupRight}>
                                <View style={styles.pointerDot} />
                                <View style={styles.pointerLineRight} />
                            </View>
                            <View style={styles.calloutBadge}>
                                <Text style={styles.calloutLabel}>TALLE ESP.</Text>
                                <Text style={styles.calloutValue}>{backLengthVal}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Resumen de Taller bajo el Maniquí (Sección 5) */}
            <View style={styles.mannequinFooterInfo}>
                <Text style={styles.mannequinFooterText}>
                    {registeredCount > 0
                        ? `✓ ${registeredCount} medidas anatómicas disponibles en esta sesión`
                        : 'Sin medidas anatómicas registradas en esta sesión'}
                </Text>
            </View>

            {/* Barra Inferior con Botonera de Taller */}
            <View style={styles.actionsFooter}>
                <TouchableOpacity
                    style={styles.actionBtnSecondaryGlass}
                    onPress={onCorrectSession}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionBtnSecondaryText}>
                        <Text style={styles.lightningIcon}>⚡</Text> Rectificar (v{nextVersionNum})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtnPrimaryGold}
                    onPress={onNewSession}
                    activeOpacity={0.85}
                >
                    <Text style={styles.actionBtnPrimaryText}>+ Nueva Medición</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0B0F15', // Carbón mate obsidiana de alta costura
        borderRadius: 20,
        padding: 18,
        borderWidth: 1.2,
        borderColor: '#222A36',
        marginBottom: 16,
        ...Platform.select({
            web: {
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
            },
            default: {
                elevation: 10,
            },
        }),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        paddingBottom: 12,
        marginBottom: 10,
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 2,
        color: '#C5A059', // Oro cálido alta costura
        marginBottom: 2,
    },
    subtitleMain: {
        fontSize: 21,
        fontWeight: '600',
        color: '#F4ECE1',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        lineHeight: 25,
    },
    subtitleSecondary: {
        fontSize: 21,
        fontWeight: '600',
        color: '#F4ECE1',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        lineHeight: 25,
    },
    associatedCreationSub: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C5A059',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    // Placa Gema Esmeralda Luminosa (v2 FINALIZADA)
    emeraldGemBadge: {
        backgroundColor: 'rgba(6, 78, 59, 0.85)',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 0 18px rgba(16, 185, 129, 0.4)',
            },
        }),
    },
    emeraldGemVersion: {
        fontSize: 22,
        fontWeight: '700',
        color: '#A7F3D0',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    emeraldGemStatus: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#6EE7B7',
        letterSpacing: 1.4,
        marginTop: 2,
    },
    // Selector de Modo (Prenda Activa vs Anatomía Completa)
    modeSelectorRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(26, 32, 44, 0.65)',
        borderRadius: 10,
        padding: 3,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    modeSelectorTab: {
        flex: 1,
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    modeSelectorTabActive: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#C5A059',
    },
    modeSelectorText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#94A3B8',
    },
    modeSelectorTextActive: {
        color: '#FDE68A',
        fontWeight: '700',
    },
    // Escenario Central
    stage: {
        height: 440,
        position: 'relative',
        marginVertical: 4,
        overflow: 'hidden',
    },
    // Maniquí Fotorrealista Centrado
    mannequinBackgroundWrap: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    mannequinImage: {
        width: 320,
        height: 440,
    },
    // Capas de Cotas con posicionamiento absoluto preciso
    leftCotasLayer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 2,
        width: 150,
        zIndex: 3,
    },
    rightCotasLayer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 2,
        width: 150,
        zIndex: 3,
    },
    cotaItemLeft: {
        position: 'absolute',
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cotaItemRight: {
        position: 'absolute',
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointerGroupLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointerGroupRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointerLineLeft: {
        width: 24,
        height: 1.2,
        backgroundColor: '#64748B',
    },
    pointerLineRight: {
        width: 24,
        height: 1.2,
        backgroundColor: '#64748B',
    },
    pointerLineHighlight: {
        backgroundColor: '#C5A059',
        height: 1.8,
    },
    pointerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#94A3B8',
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    pointerDotHighlight: {
        backgroundColor: '#E5C788',
        borderColor: '#C5A059',
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    // Cajas de Cota en Cristal Ahumado (Glassmorphism)
    calloutBadge: {
        backgroundColor: 'rgba(18, 24, 34, 0.94)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        alignItems: 'flex-start',
        minWidth: 84,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
            },
            default: {
                elevation: 4,
            },
        }),
    },
    // BUSTO y CINTURA Destacados en Oro Cálido
    calloutHighlightGold: {
        backgroundColor: 'rgba(44, 34, 18, 0.96)',
        borderColor: '#C5A059',
        borderWidth: 1.4,
        ...Platform.select({
            web: {
                boxShadow: '0 0 16px rgba(197, 160, 89, 0.42)',
            },
        }),
    },
    calloutLabel: {
        fontSize: 8.2,
        fontWeight: '800',
        letterSpacing: 0.9,
        color: '#94A3B8',
        marginBottom: 2,
    },
    calloutLabelHighlight: {
        color: '#E5C788',
    },
    calloutValue: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    calloutValueHighlight: {
        color: '#FDE68A',
    },
    labelRowWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    // Insignia Técnica TC en Sisa C10
    starBadgeTC: {
        backgroundColor: '#0284C7',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: '#38BDF8',
    },
    starBadgeTCText: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    // Botonera Inferior
    actionsFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        paddingTop: 14,
    },
    actionBtnSecondaryGlass: {
        flex: 1,
        minHeight: 46,
        backgroundColor: 'rgba(28, 36, 48, 0.9)',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    actionBtnSecondaryText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E2E8F0',
        letterSpacing: 0.3,
    },
    lightningIcon: {
        color: '#F59E0B',
        fontSize: 13,
    },
    actionBtnPrimaryGold: {
        flex: 1,
        minHeight: 46,
        backgroundColor: '#C5A059',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 16px rgba(197, 160, 89, 0.35)',
            },
        }),
    },
    actionBtnPrimaryText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0B0F15',
        letterSpacing: 0.4,
    },
    sessionActiveBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#111823',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#263345',
    },
    sessionActiveBannerLeft: {
        flex: 1,
    },
    sessionActiveLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#C5A059',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    sessionActiveTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F4ECE1',
    },
    sessionActiveClientText: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    sessionActiveBannerRight: {
        marginLeft: 8,
    },
    registeredCountBadge: {
        backgroundColor: 'rgba(46, 125, 50, 0.2)',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#2E7D32',
    },
    registeredCountBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4ADE80',
    },
    mannequinFooterInfo: {
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        marginTop: 6,
        marginBottom: 8,
    },
    mannequinFooterText: {
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: 0.2,
    },
});
