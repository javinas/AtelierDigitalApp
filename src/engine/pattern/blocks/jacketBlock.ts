// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE CHAQUETA SASTRE DE ALTA COSTURA (C15)
// Archivo: src/engine/pattern/blocks/jacketBlock.ts
// ==============================================================================
// Genera una chaqueta sastre estructurada femenina completa By Katherine Carroll:
// - 16 piezas anatómicas sastre distribuidas simétricamente:
//   1. Delantero Izquierdo (JACKET_DEL_IZQ) con solapa de muesca y cruce
//   2. Delantero Derecho (JACKET_DEL_DER) con solapa de muesca y cruce
//   3. Costadillo Delantero Izquierdo (JACKET_COSTADILLO_DEL_IZQ)
//   4. Costadillo Delantero Derecho (JACKET_COSTADILLO_DEL_DER)
//   5. Espalda Central Izquierda (JACKET_ESP_CENTRAL_IZQ) con lordosis y abertura
//   6. Espalda Central Derecha (JACKET_ESP_CENTRAL_DER) con lordosis y abertura
//   7. Costadillo Espalda Izquierdo (JACKET_COSTADILLO_ESP_IZQ)
//   8. Costadillo Espalda Derecho (JACKET_COSTADILLO_ESP_DER)
//   9. Pie de Cuello Sastre (JACKET_CUELLO_PIE)
//   10. Pala de Cuello Sastre (JACKET_CUELLO_PALA)
//   11. Manga Sastre Hoja Superior Izquierda (JACKET_MANGA_SUPERIOR_IZQ)
//   12. Manga Sastre Hoja Superior Derecha (JACKET_MANGA_SUPERIOR_DER)
//   13. Manga Sastre Hoja Inferior Izquierda (JACKET_MANGA_INFERIOR_IZQ)
//   14. Manga Sastre Hoja Inferior Derecha (JACKET_MANGA_INFERIOR_DER)
//   15. Cartera de Bolsillo Sastre Izquierda (JACKET_BOLSILLO_CARTERA_IZQ)
//   16. Cartera de Bolsillo Sastre Derecha (JACKET_BOLSILLO_CARTERA_DER)
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

export interface JacketBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateJacketBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): JacketBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Normalización de medidas corporales y holguras sastre de prenda exterior
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const backLength = measurements.largo_talle_espalda || 410;
    const frontLength = measurements.largo_talle_delantero || 440;
    const backWidth = measurements.ancho_espalda || 350;
    const armLength = measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const neckCirc = measurements.contorno_cuello || Math.round(bustCirc * 0.38);

    // Holguras sastre de prenda exterior (chaqueta sobre camisa/blusa)
    const bustEase = ease.bust ?? 80;
    const waistEase = ease.waist ?? 60;
    const hipEase = ease.hip ?? 60;
    const bicepsEase = ease.biceps ?? 60;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;

    // Parámetros de diseño sastre
    const jacketLength = designParams.jacket_length_mm || measurements.largo_chaqueta || (backLength + 280);
    const lapelWidth = designParams.jacket_lapel_width_mm || 75;
    const buttonCount = designParams.jacket_button_count || 2;
    const hasPocket = designParams.jacket_pocket_presence !== false; // Activo por defecto en sastrería
    const pocketWidth = designParams.jacket_pocket_width_mm || 135;
    const pocketHeight = designParams.jacket_pocket_height_mm || 50;
    const overlapMm = designParams.jacket_closure_type === 'double_breasted' ? 50 : 25;

    // Métricas calculadas para control de calidad sastre
    calculatedValues.jacketLengthMm = jacketLength;
    calculatedValues.bustEaseMm = bustEase;
    calculatedValues.waistEaseMm = waistEase;
    calculatedValues.hipEaseMm = hipEase;
    calculatedValues.lapelWidthMm = lapelWidth;

    // Perímetros totales de cuartos con holgura
    const quarterBust = roundTo((bustCirc + bustEase) / 4.0, 2);
    const quarterWaist = roundTo((waistCirc + waistEase) / 4.0, 2);
    const quarterHip = roundTo((hipCirc + hipEase) / 4.0, 2);

    // Niveles verticales (Y = 0 en séptima cervical / hombro alto)
    const yBust = roundTo(frontLength * 0.58, 2);
    const yWaist = frontLength;
    const yHip = yWaist + 200;
    const yHem = jacketLength;

    // Desarrollo de sisa sastre
    const armholeDepth = measurements.profundidad_sisa || (backLength / 2.0 + 30);
    calculatedValues.armholeDepthMm = armholeDepth;

    // Perímetro estimado de sisa para la manga de dos hojas (típico 440-480 mm en chaqueta)
    const totalArmholePerimeter = roundTo((armholeDepth * 2.1) + 20, 2);
    calculatedValues.totalArmholePerimeterMm = totalArmholePerimeter;

    const pieces: PatternPiece[] = [];

    // ==========================================================================
    // 1 & 2. DELANTEROS (IZQUIERDO Y DERECHO CON SOLAPA DE MUESCA Y CRUCE)
    // ==========================================================================
    // Ancho del panel delantero: 58% del cuarto de busto (el 42% restante va al costadillo)
    const frontBustWidth = roundTo(quarterBust * 0.58, 2);
    const frontWaistWidth = roundTo(quarterWaist * 0.56, 2);
    const frontHipWidth = roundTo(quarterHip * 0.58, 2);

    // Posición del primer botón y quiebre de solapa
    const yRollPoint = yWaist - 40; // Quiebre de solapa 40 mm sobre la cintura
    const xRollPoint = frontBustWidth + overlapMm;

    // Puntos de la solapa sastre (Notch lapel)
    const lapelTipX = xRollPoint + lapelWidth;
    const lapelTipY = yRollPoint - 85;
    const gorgeNotchX = xRollPoint + 35;
    const gorgeNotchY = yRollPoint - 110;
    const neckPointX = frontBustWidth * 0.45;
    const neckPointY = 15;

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        // Contorno de costura del delantero
        const frontCommands: PathCommand[] = [
            // Inicio en el punto de cuello/hombro
            { type: 'M', params: [neckPointX, neckPointY] },
            // Hombro delantero hacia la sisa
            { type: 'L', params: [0, 40] },
            // Sisa delantera cóncava
            {
                type: 'C',
                params: [
                    15, armholeDepth * 0.5,
                    frontBustWidth * 0.3, armholeDepth - 10,
                    frontBustWidth, armholeDepth,
                ],
            },
            // Costura de unión al costadillo delantero (entalle suave hacia cintura)
            {
                type: 'C',
                params: [
                    frontBustWidth - 5, yBust,
                    frontWaistWidth, yWaist - 20,
                    frontWaistWidth, yWaist,
                ],
            },
            // Costura de cadera hacia el bajo
            {
                type: 'C',
                params: [
                    frontWaistWidth, yWaist + 50,
                    frontHipWidth - 5, yHip,
                    frontHipWidth, yHem,
                ],
            },
            // Bajo sastre delantero con leve redondeo en la esquina frontal
            { type: 'L', params: [xRollPoint, yHem] },
            // Centro delantero vertical con cruce hacia el punto de quiebre
            { type: 'L', params: [xRollPoint, yRollPoint] },
            // Vuelo exterior de la solapa sastre hacia la punta
            { type: 'L', params: [lapelTipX, lapelTipY] },
            // Muesca sastre de la solapa (gorge seam)
            { type: 'L', params: [gorgeNotchX, gorgeNotchY] },
            // Escote de solapa hacia el punto de cuello/hombro
            {
                type: 'C',
                params: [
                    gorgeNotchX - 15, gorgeNotchY - 20,
                    neckPointX + 15, neckPointY + 10,
                    neckPointX, neckPointY,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const frontSeamPath = createPath(frontCommands, true);
        const frontCutPath = generateSeamAllowanceOffset(frontSeamPath, seamAllowanceMm, true);

        // Piquetes sastre de botones/ojales y aplomo
        const frontNotches: Notch[] = [
            {
                position: pt(xRollPoint, yRollPoint),
                angleRad: Math.PI / 2,
                lengthMm: 6,
                type: 'single',
            },
            {
                position: pt(xRollPoint, yRollPoint + 90),
                angleRad: Math.PI / 2,
                lengthMm: 6,
                type: 'single',
            },
            {
                position: pt(frontWaistWidth, yWaist),
                angleRad: 0,
                lengthMm: 5,
                type: 'single',
            },
            // Piquete de unión de solapa con pie de cuello (gorge)
            {
                position: pt(gorgeNotchX, gorgeNotchY),
                angleRad: -Math.PI / 4,
                lengthMm: 5,
                type: 'single',
            },
        ];

        // Posición de la cartera de bolsillo
        const pocketY = yWaist + 65;
        const pocketX = frontWaistWidth * 0.45;
        frontNotches.push({
            position: pt(pocketX, pocketY),
            angleRad: 0,
            lengthMm: 7,
            type: 'double',
        });

        const frontGrainline: Grainline = {
            start: pt(frontBustWidth * 0.45, 100),
            end: pt(frontBustWidth * 0.45, yHem - 50),
            isFold: false,
            label: 'HILO DE LA TELA SASTRE',
        };

        const pieceName = `Chaqueta Sastre Delantero ${isRight ? 'Derecho' : 'Izquierdo'}`;
        const pieceCode = `JACKET_DEL_${side}`;
        const bBox = calculateBoundingBox([frontCutPath]);

        pieces.push({
            id: `p_jacket_del_${side.toLowerCase()}`,
            name: pieceName,
            code: pieceCode,
            outlineSeam: frontSeamPath,
            outlineCut: frontCutPath,
            grainline: frontGrainline,
            notches: frontNotches,
            darts: [],
            labels: [
                {
                    position: pt(frontBustWidth * 0.4, yBust),
                    text: `${pieceName} (Cortar 1 tela + 1 entretela)`,
                    fontSizeMm: 9,
                },
            ],
            boundingBox: bBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    // ==========================================================================
    // 3 & 4. COSTADILLOS DELANTEROS (IZQUIERDO Y DERECHO)
    // ==========================================================================
    const sideBustWidth = roundTo(quarterBust * 0.42, 2);
    const sideWaistWidth = roundTo(quarterWaist * 0.44, 2);
    const sideHipWidth = roundTo(quarterHip * 0.42, 2);

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const sideCommands: PathCommand[] = [
            // Inicio en la sisa axilar delantera
            { type: 'M', params: [0, armholeDepth] },
            // Sisa lateral cóncava
            {
                type: 'C',
                params: [
                    sideBustWidth * 0.25, armholeDepth - 15,
                    sideBustWidth * 0.65, armholeDepth - 20,
                    sideBustWidth, armholeDepth - 10,
                ],
            },
            // Costura de costado sastre (une con costadillo de espalda)
            {
                type: 'C',
                params: [
                    sideBustWidth - 5, yBust,
                    sideWaistWidth, yWaist - 10,
                    sideWaistWidth, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    sideWaistWidth, yWaist + 40,
                    sideHipWidth - 5, yHip,
                    sideHipWidth, yHem,
                ],
            },
            // Bajo sastre
            { type: 'L', params: [0, yHem] },
            // Costura interior de unión al delantero central
            {
                type: 'C',
                params: [
                    5, yHip,
                    5, yWaist + 40,
                    0, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    -5, yBust,
                    -5, armholeDepth + 20,
                    0, armholeDepth,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const sideSeamPath = createPath(sideCommands, true);
        const sideCutPath = generateSeamAllowanceOffset(sideSeamPath, seamAllowanceMm, true);

        const sideNotches: Notch[] = [
            {
                position: pt(0, yWaist),
                angleRad: Math.PI,
                lengthMm: 5,
                type: 'single',
            },
            {
                position: pt(sideWaistWidth, yWaist),
                angleRad: 0,
                lengthMm: 5,
                type: 'single',
            },
        ];

        const sideGrainline: Grainline = {
            start: pt(sideBustWidth * 0.5, armholeDepth + 30),
            end: pt(sideBustWidth * 0.5, yHem - 50),
            isFold: false,
            label: 'HILO DE LA TELA',
        };

        const pieceName = `Chaqueta Sastre Costadillo Delantero ${isRight ? 'Derecho' : 'Izquierdo'}`;
        const pieceCode = `JACKET_COSTADILLO_DEL_${side}`;
        const bBox = calculateBoundingBox([sideCutPath]);

        pieces.push({
            id: `p_jacket_costadillo_del_${side.toLowerCase()}`,
            name: pieceName,
            code: pieceCode,
            outlineSeam: sideSeamPath,
            outlineCut: sideCutPath,
            grainline: sideGrainline,
            notches: sideNotches,
            darts: [],
            labels: [
                {
                    position: pt(sideBustWidth * 0.45, yBust),
                    text: `${pieceName} (Cortar 1 par)`,
                    fontSizeMm: 8,
                },
            ],
            boundingBox: bBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    // ==========================================================================
    // 5 & 6. ESPALDA CENTRAL (IZQUIERDA Y DERECHA CON LORDOSIS Y ABERTURA SASTRE)
    // ==========================================================================
    const backCenterBustWidth = roundTo(quarterBust * 0.50, 2);
    const backCenterWaistWidth = roundTo(quarterWaist * 0.48, 2);
    const backCenterHipWidth = roundTo(quarterHip * 0.50, 2);
    const ventLength = 180; // Abertura sastre central inferior de 180 mm
    const ventOverlap = 35; // Cruce de abertura

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const backCenterCommands: PathCommand[] = [
            // Centro espalda alto (séptima cervical C7)
            { type: 'M', params: [0, 20] },
            // Escote de espalda anatómico hacia el hombro
            {
                type: 'C',
                params: [
                    20, 18,
                    45, 15,
                    70, 10,
                ],
            },
            // Hombro de espalda con avance
            { type: 'L', params: [backWidth * 0.48, 35] },
            // Sisa de espalda superior hacia el costadillo
            {
                type: 'C',
                params: [
                    backWidth * 0.45, armholeDepth * 0.4,
                    backCenterBustWidth - 10, armholeDepth * 0.8,
                    backCenterBustWidth, armholeDepth,
                ],
            },
            // Costura dorsal hacia la cintura
            {
                type: 'C',
                params: [
                    backCenterBustWidth - 5, yBust,
                    backCenterWaistWidth, yWaist - 15,
                    backCenterWaistWidth, yWaist,
                ],
            },
            // Costura dorsal hacia la cadera y bajo
            {
                type: 'C',
                params: [
                    backCenterWaistWidth, yWaist + 40,
                    backCenterHipWidth - 5, yHip,
                    backCenterHipWidth, yHem,
                ],
            },
            // Bajo sastre hacia el centro espalda
            { type: 'L', params: [-ventOverlap, yHem] },
            // Abertura central sastre inferior (vent)
            { type: 'L', params: [-ventOverlap, yHem - ventLength] },
            { type: 'L', params: [0, yHem - ventLength] },
            // Centro espalda con quiebre de lordosis lumbar en cintura (-15 mm)
            {
                type: 'C',
                params: [
                    5, yWaist + 80,
                    12, yWaist + 20,
                    15, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    10, yBust,
                    2, 80,
                    0, 20,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const backCenterSeamPath = createPath(backCenterCommands, true);
        const backCenterCutPath = generateSeamAllowanceOffset(backCenterSeamPath, seamAllowanceMm, true);

        const backCenterNotches: Notch[] = [
            {
                position: pt(15, yWaist),
                angleRad: Math.PI,
                lengthMm: 5,
                type: 'single',
            },
            {
                position: pt(backCenterWaistWidth, yWaist),
                angleRad: 0,
                lengthMm: 5,
                type: 'single',
            },
            {
                position: pt(0, yHem - ventLength),
                angleRad: Math.PI / 2,
                lengthMm: 6,
                type: 'single',
            },
        ];

        const backCenterGrainline: Grainline = {
            start: pt(backCenterBustWidth * 0.4, 60),
            end: pt(backCenterBustWidth * 0.4, yHem - 60),
            isFold: false,
            label: 'HILO DE LA TELA SASTRE',
        };

        const pieceName = `Chaqueta Sastre Espalda Central ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `JACKET_ESP_CENTRAL_${side}`;
        const bBox = calculateBoundingBox([backCenterCutPath]);

        pieces.push({
            id: `p_jacket_esp_central_${side.toLowerCase()}`,
            name: pieceName,
            code: pieceCode,
            outlineSeam: backCenterSeamPath,
            outlineCut: backCenterCutPath,
            grainline: backCenterGrainline,
            notches: backCenterNotches,
            darts: [],
            labels: [
                {
                    position: pt(backCenterBustWidth * 0.35, yBust),
                    text: `${pieceName} (Cortar 1 par)`,
                    fontSizeMm: 9,
                },
            ],
            boundingBox: bBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    // ==========================================================================
    // 7 & 8. COSTADILLOS DE ESPALDA (IZQUIERDO Y DERECHO)
    // ==========================================================================
    const backSideBustWidth = roundTo(quarterBust * 0.50, 2);
    const backSideWaistWidth = roundTo(quarterWaist * 0.52, 2);
    const backSideHipWidth = roundTo(quarterHip * 0.50, 2);

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const backSideCommands: PathCommand[] = [
            // Sisa axilar de espalda
            { type: 'M', params: [0, armholeDepth - 10] },
            {
                type: 'C',
                params: [
                    backSideBustWidth * 0.35, armholeDepth - 15,
                    backSideBustWidth * 0.75, armholeDepth - 12,
                    backSideBustWidth, armholeDepth,
                ],
            },
            // Costura dorsal hacia la cintura
            {
                type: 'C',
                params: [
                    backSideBustWidth - 5, yBust,
                    backSideWaistWidth, yWaist - 15,
                    backSideWaistWidth, yWaist,
                ],
            },
            // Costura dorsal hacia el bajo
            {
                type: 'C',
                params: [
                    backSideWaistWidth, yWaist + 40,
                    backSideHipWidth - 5, yHip,
                    backSideHipWidth, yHem,
                ],
            },
            // Bajo sastre
            { type: 'L', params: [0, yHem] },
            // Costura de costado (une con costadillo delantero)
            {
                type: 'C',
                params: [
                    5, yHip,
                    5, yWaist + 40,
                    0, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    -5, yBust,
                    -5, armholeDepth + 25,
                    0, armholeDepth - 10,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const backSideSeamPath = createPath(backSideCommands, true);
        const backSideCutPath = generateSeamAllowanceOffset(backSideSeamPath, seamAllowanceMm, true);

        const backSideNotches: Notch[] = [
            {
                position: pt(0, yWaist),
                angleRad: Math.PI,
                lengthMm: 5,
                type: 'single',
            },
            {
                position: pt(backSideWaistWidth, yWaist),
                angleRad: 0,
                lengthMm: 5,
                type: 'single',
            },
        ];

        const backSideGrainline: Grainline = {
            start: pt(backSideBustWidth * 0.5, armholeDepth + 20),
            end: pt(backSideBustWidth * 0.5, yHem - 50),
            isFold: false,
            label: 'HILO DE LA TELA',
        };

        const pieceName = `Chaqueta Sastre Costadillo Espalda ${isRight ? 'Derecho' : 'Izquierdo'}`;
        const pieceCode = `JACKET_COSTADILLO_ESP_${side}`;
        const bBox = calculateBoundingBox([backSideCutPath]);

        pieces.push({
            id: `p_jacket_costadillo_esp_${side.toLowerCase()}`,
            name: pieceName,
            code: pieceCode,
            outlineSeam: backSideSeamPath,
            outlineCut: backSideCutPath,
            grainline: backSideGrainline,
            notches: backSideNotches,
            darts: [],
            labels: [
                {
                    position: pt(backSideBustWidth * 0.45, yBust),
                    text: `${pieceName} (Cortar 1 par)`,
                    fontSizeMm: 8,
                },
            ],
            boundingBox: bBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    // ==========================================================================
    // 9. PIE DE CUELLO SASTRE (JACKET_CUELLO_PIE)
    // ==========================================================================
    // Tirilla interna anatómica curvada para el escote posterior
    const halfNeckStandLength = roundTo((neckCirc / 2.0) * 1.05 + 15, 2);
    const collarStandHeight = 28;

    const standCommands: PathCommand[] = [
        { type: 'M', params: [0, collarStandHeight] },
        {
            type: 'C',
            params: [
                halfNeckStandLength * 0.45, collarStandHeight,
                halfNeckStandLength * 0.85, collarStandHeight - 6,
                halfNeckStandLength, collarStandHeight - 12,
            ],
        },
        {
            type: 'C',
            params: [
                halfNeckStandLength + 4, collarStandHeight - 16,
                halfNeckStandLength + 2, -4,
                halfNeckStandLength - 6, -6,
            ],
        },
        {
            type: 'C',
            params: [
                halfNeckStandLength * 0.85, -2,
                halfNeckStandLength * 0.5, 0,
                0, 0,
            ],
        },
        { type: 'L', params: [0, collarStandHeight] },
        { type: 'Z', params: [] },
    ];

    const standSeamPath = createPath(standCommands, true);
    const standCutPath = generateSeamAllowanceOffset(standSeamPath, seamAllowanceMm, true);

    const standGrainline: Grainline = {
        start: pt(20, 8),
        end: pt(halfNeckStandLength - 20, 8),
        isFold: true,
        label: 'AL DOBLEZ / HILO',
    };

    const standNotches: Notch[] = [
        {
            position: pt(0, collarStandHeight / 2.0),
            angleRad: Math.PI,
            lengthMm: 4,
            type: 'single',
        },
        {
            position: pt(halfNeckStandLength * 0.55, collarStandHeight - 2),
            angleRad: Math.PI / 2,
            lengthMm: 4,
            type: 'single',
        },
    ];

    const standBBox = calculateBoundingBox([standCutPath]);
    pieces.push({
        id: 'p_jacket_cuello_pie',
        name: 'Chaqueta Sastre Pie de Cuello',
        code: 'JACKET_CUELLO_PIE',
        outlineSeam: standSeamPath,
        outlineCut: standCutPath,
        grainline: standGrainline,
        notches: standNotches,
        darts: [],
        labels: [
            {
                position: pt(halfNeckStandLength * 0.35, 12),
                text: 'Pie de Cuello Sastre (Cortar 1 al doblez en tela + 1 entretela sastre)',
                fontSizeMm: 8,
            },
        ],
        boundingBox: standBBox,
        quantityToCut: 1,
        cutOnFold: true,
        seamAllowanceMm,
    });

    // ==========================================================================
    // 10. PALA DE CUELLO SASTRE CON SOLAPA (JACKET_CUELLO_PALA)
    // ==========================================================================
    const collarFallHeight = 44;
    const collarFallLength = halfNeckStandLength + 25; // Punta extendida sastre

    const fallCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        {
            type: 'C',
            params: [
                collarFallLength * 0.45, 0,
                collarFallLength * 0.85, -2,
                collarFallLength, -8,
            ],
        },
        // Punta sastre de la pala empalmada a la muesca de solapa
        { type: 'L', params: [collarFallLength + 15, collarFallHeight + 6] },
        // Línea exterior del cuello doblado
        {
            type: 'C',
            params: [
                collarFallLength * 0.85, collarFallHeight,
                collarFallLength * 0.45, collarFallHeight - 2,
                0, collarFallHeight,
            ],
        },
        // Cierre por centro espalda
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];

    const fallSeamPath = createPath(fallCommands, true);
    const fallCutPath = generateSeamAllowanceOffset(fallSeamPath, seamAllowanceMm, true);

    const fallGrainline: Grainline = {
        start: pt(20, collarFallHeight / 2.0),
        end: pt(collarFallLength - 20, collarFallHeight / 2.0),
        isFold: true,
        label: 'AL DOBLEZ',
    };

    const fallNotches: Notch[] = [
        {
            position: pt(0, collarFallHeight / 2.0),
            angleRad: Math.PI,
            lengthMm: 4,
            type: 'single',
        },
    ];

    const fallBBox = calculateBoundingBox([fallCutPath]);
    pieces.push({
        id: 'p_jacket_cuello_pala',
        name: 'Chaqueta Sastre Pala de Cuello',
        code: 'JACKET_CUELLO_PALA',
        outlineSeam: fallSeamPath,
        outlineCut: fallCutPath,
        grainline: fallGrainline,
        notches: fallNotches,
        darts: [],
        labels: [
            {
                position: pt(collarFallLength * 0.35, collarFallHeight / 2.0),
                text: 'Pala de Cuello Sastre (Cortar 1 al doblez en tela + 1 entretela)',
                fontSizeMm: 8,
            },
        ],
        boundingBox: fallBBox,
        quantityToCut: 1,
        cutOnFold: true,
        seamAllowanceMm,
    });

    // ==========================================================================
    // 11 & 12. MANGA SASTRE HOJA SUPERIOR (IZQUIERDA Y DERECHA)
    // ==========================================================================
    // Manga sastre clásica de dos hojas con avance de codo y copa estructurada
    const upperSleeveCapHeight = roundTo(totalArmholePerimeter / 3.4, 2);
    const upperSleeveWidth = roundTo((bicepsCirc + bicepsEase) * 0.68, 2);
    const wristHalfWidth = 145; // Ancho superior en puño

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const topSleeveCommands: PathCommand[] = [
            // Inicio en la base anterior de la sisa de manga
            { type: 'M', params: [0, upperSleeveCapHeight] },
            // Curva anterior de copa (cóncava hacia la cresta)
            {
                type: 'C',
                params: [
                    upperSleeveWidth * 0.25, upperSleeveCapHeight * 0.65,
                    upperSleeveWidth * 0.40, 10,
                    upperSleeveWidth * 0.55, 0,
                ],
            },
            // Curva posterior de copa (volumen convexo para el omóplato con embebido sastre)
            {
                type: 'C',
                params: [
                    upperSleeveWidth * 0.75, 10,
                    upperSleeveWidth * 0.90, upperSleeveCapHeight * 0.55,
                    upperSleeveWidth, upperSleeveCapHeight,
                ],
            },
            // Costura de sangría posterior con codera anatómica hacia la muñeca
            {
                type: 'C',
                params: [
                    upperSleeveWidth + 15, armLength * 0.55, // Curvatura de flexión en el codo
                    wristHalfWidth + 10, armLength - 40,
                    wristHalfWidth, armLength,
                ],
            },
            // Bocamanga inferior
            { type: 'L', params: [20, armLength] },
            // Costura de sangría delantera
            {
                type: 'C',
                params: [
                    10, armLength * 0.55,
                    5, upperSleeveCapHeight + 60,
                    0, upperSleeveCapHeight,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const topSeamPath = createPath(topSleeveCommands, true);
        const topCutPath = generateSeamAllowanceOffset(topSeamPath, seamAllowanceMm, true);

        const topNotches: Notch[] = [
            {
                position: pt(upperSleeveWidth * 0.55, 0),
                angleRad: -Math.PI / 2,
                lengthMm: 6,
                type: 'single', // Piquete de vértice de hombro
            },
            {
                position: pt(upperSleeveWidth * 0.25, upperSleeveCapHeight * 0.65),
                angleRad: Math.PI / 4,
                lengthMm: 5,
                type: 'single', // Piquete delantero de sisa
            },
            {
                position: pt(upperSleeveWidth + 15, armLength * 0.55),
                angleRad: 0,
                lengthMm: 5,
                type: 'double', // Piquete de codo
            },
        ];

        const topGrainline: Grainline = {
            start: pt(upperSleeveWidth * 0.55, 30),
            end: pt(upperSleeveWidth * 0.55, armLength - 40),
            isFold: false,
            label: 'HILO DE LA TELA SASTRE',
        };

        const pieceName = `Chaqueta Sastre Manga Hoja Superior ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `JACKET_MANGA_SUPERIOR_${side}`;
        const bBox = calculateBoundingBox([topCutPath]);

        pieces.push({
            id: `p_jacket_manga_superior_${side.toLowerCase()}`,
            name: pieceName,
            code: pieceCode,
            outlineSeam: topSeamPath,
            outlineCut: topCutPath,
            grainline: topGrainline,
            notches: topNotches,
            darts: [],
            labels: [
                {
                    position: pt(upperSleeveWidth * 0.45, armLength * 0.4),
                    text: `${pieceName} (Cortar 1 par en tela + 1 entretela sastre)`,
                    fontSizeMm: 9,
                },
            ],
            boundingBox: bBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    // ==========================================================================
    // 13 & 14. MANGA SASTRE HOJA INFERIOR (IZQUIERDA Y DERECHA)
    // ==========================================================================
    // Hoja interior menor que asienta bajo la axila
    const underSleeveWidth = roundTo((bicepsCirc + bicepsEase) * 0.38, 2);
    const underWristWidth = 95;

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const underSleeveCommands: PathCommand[] = [
            // Inicio en la axila interior
            { type: 'M', params: [0, upperSleeveCapHeight * 0.85] },
            // Curva cóncava axilar que abraza la parte baja del brazo
            {
                type: 'C',
                params: [
                    underSleeveWidth * 0.3, upperSleeveCapHeight * 0.65,
                    underSleeveWidth * 0.7, upperSleeveCapHeight * 0.65,
                    underSleeveWidth, upperSleeveCapHeight * 0.85,
                ],
            },
            // Costura interior posterior hacia la muñeca
            {
                type: 'C',
                params: [
                    underSleeveWidth + 10, armLength * 0.55,
                    underWristWidth + 5, armLength - 40,
                    underWristWidth, armLength,
                ],
            },
            // Bocamanga inferior menor
            { type: 'L', params: [10, armLength] },
            // Costura interior delantera
            {
                type: 'C',
                params: [
                    5, armLength * 0.55,
                    0, upperSleeveCapHeight + 40,
                    0, upperSleeveCapHeight * 0.85,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const underSeamPath = createPath(underSleeveCommands, true);
        const underCutPath = generateSeamAllowanceOffset(underSeamPath, seamAllowanceMm, true);

        const underNotches: Notch[] = [
            {
                position: pt(underSleeveWidth + 10, armLength * 0.55),
                angleRad: 0,
                lengthMm: 5,
                type: 'double',
            },
        ];

        const underGrainline: Grainline = {
            start: pt(underSleeveWidth * 0.5, upperSleeveCapHeight + 20),
            end: pt(underSleeveWidth * 0.5, armLength - 40),
            isFold: false,
            label: 'HILO DE LA TELA',
        };

        const pieceName = `Chaqueta Sastre Manga Hoja Inferior ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `JACKET_MANGA_INFERIOR_${side}`;
        const bBox = calculateBoundingBox([underCutPath]);

        pieces.push({
            id: `p_jacket_manga_inferior_${side.toLowerCase()}`,
            name: pieceName,
            code: pieceCode,
            outlineSeam: underSeamPath,
            outlineCut: underCutPath,
            grainline: underGrainline,
            notches: underNotches,
            darts: [],
            labels: [
                {
                    position: pt(underSleeveWidth * 0.45, armLength * 0.4),
                    text: `${pieceName} (Cortar 1 par)`,
                    fontSizeMm: 8,
                },
            ],
            boundingBox: bBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    // ==========================================================================
    // 15 & 16. CARTERAS DE BOLSILLO SASTRE (IZQUIERDA Y DERECHA)
    // ==========================================================================
    if (hasPocket) {
        for (const side of ['IZQ', 'DER'] as const) {
            const isRight = side === 'DER';

            // Cartera con esquinas inferiores achaflanadas sastre a 45° (12 mm)
            const chamfer = 12;
            const pocketCommands: PathCommand[] = [
                { type: 'M', params: [0, 0] },
                { type: 'L', params: [pocketWidth, 0] },
                { type: 'L', params: [pocketWidth, pocketHeight - chamfer] },
                { type: 'L', params: [pocketWidth - chamfer, pocketHeight] },
                { type: 'L', params: [chamfer, pocketHeight] },
                { type: 'L', params: [0, pocketHeight - chamfer] },
                { type: 'L', params: [0, 0] },
                { type: 'Z', params: [] },
            ];

            const pocketSeamPath = createPath(pocketCommands, true);
            const pocketCutPath = generateSeamAllowanceOffset(pocketSeamPath, seamAllowanceMm, true);

            const pocketGrainline: Grainline = {
                start: pt(pocketWidth / 2.0, 5),
                end: pt(pocketWidth / 2.0, pocketHeight - 5),
                isFold: false,
                label: 'HILO DE LA TELA',
            };

            const pocketNotches: Notch[] = [
                {
                    position: pt(pocketWidth / 2.0, 0),
                    angleRad: Math.PI / 2,
                    lengthMm: 4,
                    type: 'single',
                },
            ];

            const pieceName = `Chaqueta Sastre Cartera de Bolsillo ${isRight ? 'Derecha' : 'Izquierda'}`;
            const pieceCode = `JACKET_BOLSILLO_CARTERA_${side}`;
            const bBox = calculateBoundingBox([pocketCutPath]);

            pieces.push({
                id: `p_jacket_bolsillo_cartera_${side.toLowerCase()}`,
                name: pieceName,
                code: pieceCode,
                outlineSeam: pocketSeamPath,
                outlineCut: pocketCutPath,
                grainline: pocketGrainline,
                notches: pocketNotches,
                darts: [],
                labels: [
                    {
                        position: pt(pocketWidth * 0.2, pocketHeight * 0.45),
                        text: `${pieceName} (Cortar 2 tela + 1 entretela)`,
                        fontSizeMm: 7,
                    },
                ],
                boundingBox: bBox,
                quantityToCut: 1,
                cutOnFold: false,
                seamAllowanceMm,
            });
        }
    }

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
