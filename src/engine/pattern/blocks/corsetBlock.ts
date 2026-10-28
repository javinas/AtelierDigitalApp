// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE CORSÉ ESTRUCTURADO (C14-C)
// Archivo: src/engine/pattern/blocks/corsetBlock.ts
// ==============================================================================
// Genera un corsé / corpiño estructurado de alta costura By Katherine Carroll:
// - 10 piezas anatómicas completas (5 paneles simétricos por semi-cuerpo: Izquierda y Derecha):
//   1. Delantero Central (CORSET_DEL_CENTRAL_IZQ / DER) con escote corazón y pico central
//   2. Delantero Lateral (CORSET_DEL_LAT_IZQ / DER) con costura princesa sobre ápex
//   3. Costadillo Lateral (CORSET_COSTADILLO_IZQ / DER) con entalle y arco ilíaco
//   4. Espalda Lateral (CORSET_ESP_LAT_IZQ / DER) con distribución dorsal
//   5. Centro Espalda (CORSET_ESP_CENTRAL_IZQ / DER) con refuerzo de ojalillos de cierre
// ==============================================================================

import { EaseValues, GarmentDesignParameters } from '../../../types/pattern/ease';
import {
    calculateBoundingBox,
    createPath,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';

export interface CorsetBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export interface BoningChannelMetadata {
    channelIndex: number;
    channelWidthMm: number;
    lengthMm: number;
    boneType: 'spiral_steel' | 'spring_steel' | 'flat_steel';
}

export function generateCorsetBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): CorsetBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Extracción y validación de medidas anatómicas
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const underbustCirc = measurements.contorno_bajo_busto || Math.round(bustCirc * 0.85);
    const highHipCirc = measurements.contorno_cadera_alta || Math.round(waistCirc * 1.18);
    const frontLength = measurements.largo_talle_delantero || 440;
    const backLength = measurements.largo_talle_espalda || 410;
    const bustHeight = measurements.altura_busto || Math.round(frontLength * 0.58);
    const bustSpan = measurements.separacion_busto || Math.round(bustCirc * 0.20);

    // 2. Parámetros de holgura y reducción sastre
    const bustEase = ease.bust ?? 0; // Corsé ceñido al tórax (0 mm típico)
    const waistReduction = designParams.waist_reduction_mm ?? 20; // Reducción activa de cintura sastre (20 mm)
    const effectiveWaistEase = (ease.waist ?? 0) - waistReduction; // Reducción aplicada
    const hipEase = ease.hip ?? 10;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;
    const boningWidth = designParams.boning_channel_width_mm || 8;
    const sweetheartDrop = designParams.corset_top_sweetheart_depth_mm || 25;
    const frontDip = designParams.corset_front_drop_mm || 35; // Descenso en pico central

    if (effectiveWaistEase < -60) {
        warnings.push(`Reducción de cintura muy pronunciada (${effectiveWaistEase} mm). Verificar tolerancia de la clienta.`);
    }

    // 3. Cuadrantes perimetrales con holgura/reducción
    const qBust = roundTo((bustCirc + bustEase) / 4.0, 2);
    const qUnderbust = roundTo((underbustCirc + bustEase * 0.5) / 4.0, 2);
    const qWaist = roundTo((waistCirc + effectiveWaistEase) / 4.0, 2);
    const qHip = roundTo((highHipCirc + hipEase) / 4.0, 2);

    // Distribución proporcional de anchos en los 5 paneles (suma exacta = 1.00 por cuadrante)
    const panelProportions = [
        { name: 'Delantero Central', code: 'DEL_CENTRAL', pB: 0.22, pUB: 0.20, pW: 0.18, pH: 0.19 },
        { name: 'Delantero Lateral', code: 'DEL_LAT', pB: 0.28, pUB: 0.24, pW: 0.20, pH: 0.21 },
        { name: 'Costadillo Lateral', code: 'COSTADILLO', pB: 0.20, pUB: 0.22, pW: 0.22, pH: 0.22 },
        { name: 'Espalda Lateral', code: 'ESP_LAT', pB: 0.16, pUB: 0.18, pW: 0.20, pH: 0.20 },
        { name: 'Centro Espalda', code: 'ESP_CENTRAL', pB: 0.14, pUB: 0.16, pW: 0.20, pH: 0.18 },
    ];

    // Niveles verticales de referencia (Waist en Y = 0)
    const yBust = -140;
    const yUnderbust = -65;
    const yWaist = 0;

    // Alturas de corte superior por panel
    const topLevels = [
        { leftY: -(175 - sweetheartDrop), rightY: -190 }, // Panel 1: escote corazón a cresta
        { leftY: -190, rightY: -160 },                   // Panel 2: cresta a sisa delantera
        { leftY: -160, rightY: -145 },                   // Panel 3: sisa axilar lateral
        { leftY: -145, rightY: -148 },                   // Panel 4: línea dorsal
        { leftY: -148, rightY: -150 },                   // Panel 5: centro espalda recto
    ];

    // Alturas de corte inferior (bajo / hem) por panel (Y positivo)
    const hemLevels = [
        { leftY: 110 + frontDip, rightY: 95 },          // Panel 1: pico central basque a costura
        { leftY: 95, rightY: 85 },                      // Panel 2: transición a costado
        { leftY: 85, rightY: 82 },                      // Panel 3: arco ilíaco sobre la cadera
        { leftY: 82, rightY: 90 },                      // Panel 4: transición posterior
        { leftY: 90, rightY: 95 },                      // Panel 5: centro espalda bajo
    ];

    const pieces: PatternPiece[] = [];

    // Generar los 5 paneles para ambos lados (Izquierdo y Derecho = 10 piezas)
    const sides: Array<{ suffix: 'IZQ' | 'DER'; name: 'Izquierdo' | 'Derecho' }> = [
        { suffix: 'IZQ', name: 'Izquierdo' },
        { suffix: 'DER', name: 'Derecho' },
    ];

    for (const side of sides) {
        for (let i = 0; i < 5; i++) {
            const p = panelProportions[i];
            const topL = topLevels[i];
            const hemL = hemLevels[i];

            const wTop = roundTo(p.pB * qBust, 2);
            const wUB = roundTo(p.pUB * qUnderbust, 2);
            const wW = roundTo(p.pW * qWaist, 2);
            const wH = roundTo(p.pH * qHip, 2);

            // Construir el contorno anatómico cerrado del panel:
            const commands: PathCommand[] = [
                { type: 'M', params: [0, topL.leftY] },
                // Línea superior (escote / borde superior)
                {
                    type: 'C',
                    params: [
                        wTop * 0.35, topL.leftY + (topL.rightY - topL.leftY) * 0.3,
                        wTop * 0.70, topL.leftY + (topL.rightY - topL.leftY) * 0.7,
                        wTop, topL.rightY,
                    ],
                },
                // Costura lateral derecha hacia bajo busto y cintura
                {
                    type: 'C',
                    params: [
                        wTop * 0.95, yBust * 0.7,
                        wUB * 1.02, yUnderbust,
                        wW, yWaist,
                    ],
                },
                // Costura lateral derecha hacia bajo
                {
                    type: 'C',
                    params: [
                        wW * 1.02, hemL.rightY * 0.5,
                        wH * 0.98, hemL.rightY * 0.85,
                        wH, hemL.rightY,
                    ],
                },
                // Línea inferior de bajo (hemline)
                {
                    type: 'C',
                    params: [
                        wH * 0.70, hemL.leftY + (hemL.rightY - hemL.leftY) * 0.7,
                        wH * 0.30, hemL.leftY + (hemL.rightY - hemL.leftY) * 0.3,
                        0, hemL.leftY,
                    ],
                },
                // Costura lateral izquierda hacia cintura y bajo busto
                {
                    type: 'C',
                    params: [
                        0, hemL.leftY * 0.5,
                        0, yWaist * 0.5,
                        0, yWaist,
                    ],
                },
                {
                    type: 'C',
                    params: [
                        0, yUnderbust * 0.6,
                        0, topL.leftY * 0.7,
                        0, topL.leftY,
                    ],
                },
                { type: 'Z', params: [] },
            ];

            const seamPath = createPath(commands, true);
            const cutPath = generateSeamAllowanceOffset(seamPath, seamAllowanceMm, true);

            // Aplomo vertical a través del centro del panel
            const midW = Math.max(15, wW / 2.0);
            const grainline: Grainline = {
                start: pt(midW, topL.leftY + 25),
                end: pt(midW, hemL.leftY - 25),
                isFold: false,
                label: `HILO DE LA TELA — CANAL BALLENA (${boningWidth} mm)`,
            };

            // Piquetes anatómicos de ensamble
            const notches: Notch[] = [
                {
                    position: pt(0, yWaist),
                    angleRad: Math.PI,
                    lengthMm: 5,
                    label: 'Línea de cintura (unión izquierda)',
                    type: 'single',
                },
                {
                    position: pt(wW, yWaist),
                    angleRad: 0,
                    lengthMm: 5,
                    label: 'Línea de cintura (unión derecha)',
                    type: 'single',
                },
                {
                    position: pt(0, yUnderbust),
                    angleRad: Math.PI,
                    lengthMm: 4,
                    label: 'Línea de bajo busto',
                    type: 'single',
                },
                {
                    position: pt(wUB, yUnderbust),
                    angleRad: 0,
                    lengthMm: 4,
                    label: 'Línea de bajo busto',
                    type: 'single',
                },
            ];

            // Si es centro espalda, agregar piquetes de ojalillos
            if (i === 4) {
                notches.push(
                    {
                        position: pt(wW - 12, topL.rightY + 30),
                        angleRad: 0,
                        lengthMm: 4,
                        label: 'Ojalillo superior de lacing',
                        type: 'single',
                    },
                    {
                        position: pt(wW - 12, yWaist),
                        angleRad: 0,
                        lengthMm: 4,
                        label: 'Ojalillo central de cintura (lazo de tiro)',
                        type: 'double',
                    },
                    {
                        position: pt(wW - 12, hemL.rightY - 25),
                        angleRad: 0,
                        lengthMm: 4,
                        label: 'Ojalillo inferior de lacing',
                        type: 'single',
                    }
                );
            }

            const pieceCode = `CORSET_${p.code}_${side.suffix}`;
            const pieceName = `Corsé ${p.name} ${side.name}`;

            const piece: PatternPiece = {
                id: `piece_corset_${p.code.toLowerCase()}_${side.suffix.toLowerCase()}`,
                name: pieceName,
                code: pieceCode,
                quantityToCut: 2, // Tela exterior + Forro / Coutil de soporte
                cutOnFold: false,
                fabricType: 'Seda / Coutil / Entretela armada',
                outlineSeam: seamPath,
                outlineCut: cutPath,
                seamAllowanceMm,
                grainline,
                notches,
                darts: [],
                labels: [
                    {
                        text: `${pieceName.toUpperCase()} — CORTAR 2 TELA + 2 COUTIL`,
                        position: pt(midW * 0.2, yWaist - 40),
                        fontSizeMm: 8.5,
                    },
                    {
                        text: `Ancho C: ${Math.round(wW)} mm · Ballena: ${boningWidth} mm`,
                        position: pt(midW * 0.2, yWaist - 25),
                        fontSizeMm: 7.5,
                    },
                ],
                boundingBox: calculateBoundingBox([cutPath]),
            };

            pieces.push(piece);
        }
    }

    // Métricas calculadas para la ficha técnica y fitting de corsé
    calculatedValues.bustCircumferenceMm = bustCirc;
    calculatedValues.waistCircumferenceMm = waistCirc;
    calculatedValues.waistReductionAppliedMm = waistReduction;
    calculatedValues.finishedWaistCircumferenceMm = roundTo(qWaist * 4.0, 2);
    calculatedValues.underbustCircumferenceMm = underbustCirc;
    calculatedValues.totalPiecesCount = pieces.length;
    calculatedValues.boningChannelWidthMm = boningWidth;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
