// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE ABRIGO DE ALTA COSTURA (C16)
// Archivo: src/engine/pattern/blocks/coatBlock.ts
// ==============================================================================
// Genera un abrigo sastre de alta costura envolvente By Katherine Carroll:
// - 17 piezas anatómicas sastre distribuidas simétricamente:
//   1. Delantero Izquierdo (COAT_DEL_IZQ) con solapa amplia envolvente y cruce
//   2. Delantero Derecho (COAT_DEL_DER) con solapa amplia envolvente y cruce
//   3. Costadillo Delantero Izquierdo (COAT_COSTADILLO_DEL_IZQ) con sisa de abrigo
//   4. Costadillo Delantero Derecho (COAT_COSTADILLO_DEL_DER) con sisa de abrigo
//   5. Espalda Central Izquierda (COAT_ESP_CENTRAL_IZQ) con abertura de marcha
//   6. Espalda Central Derecha (COAT_ESP_CENTRAL_DER) con abertura de marcha
//   7. Costadillo Espalda Izquierdo (COAT_COSTADILLO_ESP_IZQ)
//   8. Costadillo Espalda Derecho (COAT_COSTADILLO_ESP_DER)
//   9. Pie de Cuello de Abrigo (COAT_CUELLO_PIE)
//   10. Pala de Cuello de Abrigo (COAT_CUELLO_PALA)
//   11. Manga Superior de Abrigo Izquierda (COAT_MANGA_SUPERIOR_IZQ)
//   12. Manga Superior de Abrigo Derecha (COAT_MANGA_SUPERIOR_DER)
//   13. Manga Inferior de Abrigo Izquierda (COAT_MANGA_INFERIOR_IZQ)
//   14. Manga Inferior de Abrigo Derecha (COAT_MANGA_INFERIOR_DER)
//   15. Cartera de Bolsillo de Abrigo Izquierda (COAT_BOLSILLO_CARTERA_IZQ)
//   16. Cartera de Bolsillo de Abrigo Derecha (COAT_BOLSILLO_CARTERA_DER)
//   17. Cinturón Sastre Envolvente (COAT_CINTURON)
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

export interface CoatBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateCoatBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): CoatBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Normalización de medidas corporales y holguras de abrigo exterior pesado
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const backLength = measurements.largo_talle_espalda || 410;
    const frontLength = measurements.largo_talle_delantero || 440;
    const backWidth = measurements.ancho_espalda || 350;
    const armLength = measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const neckCirc = measurements.contorno_cuello || Math.round(bustCirc * 0.39);

    // Holguras de prenda exterior pesada (abrigo para vestir sobre traje o chaqueta)
    const bustEase = ease.bust ?? 110;
    const waistEase = ease.waist ?? 90;
    const hipEase = ease.hip ?? 90;
    const bicepsEase = ease.biceps ?? 80;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 12;

    // Parámetros de diseño de abrigo
    const coatLength = designParams.coat_length_mm || measurements.largo_abrigo || (backLength + 640);
    const lapelWidth = designParams.coat_lapel_width_mm || 95;
    const overlapMm = designParams.coat_overlap_mm || 50;
    const hasBelt = designParams.coat_belt_presence !== false;
    const ventLength = designParams.coat_vent_length_mm || 320; // Abertura dorsal de marcha de 320 mm
    const ventOverlap = 45; // Solape de abertura de marcha
    const pocketWidth = 150;
    const pocketHeight = 60;

    // Métricas calculadas para control de calidad sastre
    calculatedValues.coatLengthMm = coatLength;
    calculatedValues.bustEaseMm = bustEase;
    calculatedValues.waistEaseMm = waistEase;
    calculatedValues.hipEaseMm = hipEase;
    calculatedValues.lapelWidthMm = lapelWidth;
    calculatedValues.overlapMm = overlapMm;

    // Perímetros de cuartos con holgura exterior de abrigo
    const quarterBust = roundTo((bustCirc + bustEase) / 4.0, 2);
    const quarterWaist = roundTo((waistCirc + waistEase) / 4.0, 2);
    const quarterHip = roundTo((hipCirc + hipEase) / 4.0, 2);

    // Niveles verticales (Y = 0 en séptima cervical C7)
    const yBust = roundTo(frontLength * 0.58, 2);
    const yWaist = frontLength;
    const yHip = yWaist + 200;
    const yHem = coatLength;

    // Desarrollo de sisa de abrigo (profundidad adaptada con holgura axilar de 45 mm)
    const armholeDepth = measurements.profundidad_sisa || (backLength / 2.0 + 45);
    calculatedValues.armholeDepthMm = armholeDepth;

    // Perímetro de sisa para abrigo (típico 500-540 mm)
    const totalArmholePerimeter = roundTo((armholeDepth * 2.1) + 40, 2);
    calculatedValues.totalArmholePerimeterMm = totalArmholePerimeter;

    const pieces: PatternPiece[] = [];

    // ==========================================================================
    // 1 & 2. DELANTEROS (IZQUIERDO Y DERECHO CON SOLAPA AMPLIA Y CRUCE ENVOLVENTE)
    // ==========================================================================
    const frontBustWidth = roundTo(quarterBust * 0.58, 2);
    const frontWaistWidth = roundTo(quarterWaist * 0.56, 2);
    const frontHipWidth = roundTo(quarterHip * 0.58, 2);

    // Punto de quiebre de solapa de abrigo (a nivel de cintura alta)
    const yRollPoint = yWaist - 50;
    const xRollPoint = frontBustWidth + overlapMm;

    // Puntas y muesca de la solapa de abrigo
    const lapelTipX = xRollPoint + lapelWidth;
    const lapelTipY = yRollPoint - 105;
    const gorgeNotchX = xRollPoint + 45;
    const gorgeNotchY = yRollPoint - 135;
    const neckPointX = frontBustWidth * 0.46;
    const neckPointY = 18;

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const frontCommands: PathCommand[] = [
            { type: 'M', params: [neckPointX, neckPointY] },
            // Hombro delantero con amplitud de abrigo
            { type: 'L', params: [0, 42] },
            // Sisa de abrigo profunda y confortable
            {
                type: 'C',
                params: [
                    20, armholeDepth * 0.5,
                    frontBustWidth * 0.35, armholeDepth - 10,
                    frontBustWidth, armholeDepth,
                ],
            },
            // Costura de unión al costadillo delantero hacia cintura
            {
                type: 'C',
                params: [
                    frontBustWidth - 5, yBust,
                    frontWaistWidth, yWaist - 20,
                    frontWaistWidth, yWaist,
                ],
            },
            // Costura hacia cadera y bajo largo
            {
                type: 'C',
                params: [
                    frontWaistWidth, yWaist + 60,
                    frontHipWidth - 5, yHip,
                    frontHipWidth, yHem,
                ],
            },
            // Bajo largo de abrigo con cruce amplio
            { type: 'L', params: [xRollPoint, yHem] },
            // Centro delantero vertical con cruce envolvente
            { type: 'L', params: [xRollPoint, yRollPoint] },
            // Solapa envolvente de abrigo
            { type: 'L', params: [lapelTipX, lapelTipY] },
            // Muesca sastre de abrigo (gorge seam)
            { type: 'L', params: [gorgeNotchX, gorgeNotchY] },
            // Escote hacia el punto de cuello/hombro
            {
                type: 'C',
                params: [
                    gorgeNotchX - 18, gorgeNotchY - 25,
                    neckPointX + 18, neckPointY + 12,
                    neckPointX, neckPointY,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const frontSeamPath = createPath(frontCommands, true);
        const frontCutPath = generateSeamAllowanceOffset(frontSeamPath, seamAllowanceMm, true);

        const frontNotches: Notch[] = [
            {
                position: pt(xRollPoint, yRollPoint),
                angleRad: Math.PI / 2,
                lengthMm: 6,
                type: 'single',
            },
            {
                position: pt(xRollPoint, yRollPoint + 120),
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
            {
                position: pt(gorgeNotchX, gorgeNotchY),
                angleRad: -Math.PI / 4,
                lengthMm: 5,
                type: 'single',
            },
        ];

        // Piquetes de posición para cartera de bolsillo amplia
        const pocketY = yWaist + 80;
        const pocketX = frontWaistWidth * 0.45;
        frontNotches.push({
            position: pt(pocketX, pocketY),
            angleRad: 0,
            lengthMm: 8,
            type: 'double',
        });

        const frontGrainline: Grainline = {
            start: pt(frontBustWidth * 0.45, 120),
            end: pt(frontBustWidth * 0.45, yHem - 80),
            isFold: false,
            label: 'HILO DE LA TELA DE ABRIGO',
        };

        const pieceName = `Abrigo Sastre Delantero ${isRight ? 'Derecho' : 'Izquierdo'}`;
        const pieceCode = `COAT_DEL_${side}`;
        const bBox = calculateBoundingBox([frontCutPath]);

        pieces.push({
            id: `p_coat_del_${side.toLowerCase()}`,
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
                    text: `${pieceName} (Cortar 1 tela + 1 entretela + 1 forro)`,
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
    // 3 & 4. COSTADILLOS DELANTEROS (IZQUIERDO Y DERECHO CON SISA DE ABRIGO)
    // ==========================================================================
    const sideBustWidth = roundTo(quarterBust * 0.42, 2);
    const sideWaistWidth = roundTo(quarterWaist * 0.44, 2);
    const sideHipWidth = roundTo(quarterHip * 0.42, 2);

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const sideCommands: PathCommand[] = [
            { type: 'M', params: [0, armholeDepth] },
            // Sisa lateral amplia
            {
                type: 'C',
                params: [
                    sideBustWidth * 0.25, armholeDepth - 18,
                    sideBustWidth * 0.65, armholeDepth - 22,
                    sideBustWidth, armholeDepth - 12,
                ],
            },
            // Costura de costado de abrigo hacia el bajo
            {
                type: 'C',
                params: [
                    sideBustWidth - 5, yBust,
                    sideWaistWidth, yWaist - 12,
                    sideWaistWidth, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    sideWaistWidth, yWaist + 50,
                    sideHipWidth - 5, yHip,
                    sideHipWidth, yHem,
                ],
            },
            { type: 'L', params: [0, yHem] },
            // Costura interior hacia el delantero central
            {
                type: 'C',
                params: [
                    6, yHip,
                    6, yWaist + 50,
                    0, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    -6, yBust,
                    -6, armholeDepth + 30,
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
            start: pt(sideBustWidth * 0.5, armholeDepth + 40),
            end: pt(sideBustWidth * 0.5, yHem - 80),
            isFold: false,
            label: 'HILO DE LA TELA',
        };

        const pieceName = `Abrigo Sastre Costadillo Delantero ${isRight ? 'Derecho' : 'Izquierdo'}`;
        const pieceCode = `COAT_COSTADILLO_DEL_${side}`;
        const bBox = calculateBoundingBox([sideCutPath]);

        pieces.push({
            id: `p_coat_costadillo_del_${side.toLowerCase()}`,
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
    // 5 & 6. ESPALDA CENTRAL (IZQUIERDA Y DERECHA CON ABERTURA LARGA DE MARCHA)
    // ==========================================================================
    const backCenterBustWidth = roundTo(quarterBust * 0.50, 2);
    const backCenterWaistWidth = roundTo(quarterWaist * 0.48, 2);
    const backCenterHipWidth = roundTo(quarterHip * 0.50, 2);

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const backCenterCommands: PathCommand[] = [
            // C7
            { type: 'M', params: [0, 22] },
            // Escote de espalda amplio
            {
                type: 'C',
                params: [
                    25, 20,
                    50, 16,
                    80, 12,
                ],
            },
            // Hombro de espalda de abrigo
            { type: 'L', params: [backWidth * 0.50, 38] },
            // Sisa de espalda superior
            {
                type: 'C',
                params: [
                    backWidth * 0.46, armholeDepth * 0.4,
                    backCenterBustWidth - 12, armholeDepth * 0.8,
                    backCenterBustWidth, armholeDepth,
                ],
            },
            // Costura dorsal hacia cintura
            {
                type: 'C',
                params: [
                    backCenterBustWidth - 5, yBust,
                    backCenterWaistWidth, yWaist - 18,
                    backCenterWaistWidth, yWaist,
                ],
            },
            // Costura hacia cadera y bajo largo
            {
                type: 'C',
                params: [
                    backCenterWaistWidth, yWaist + 50,
                    backCenterHipWidth - 5, yHip,
                    backCenterHipWidth, yHem,
                ],
            },
            // Bajo hacia el solape de la abertura de marcha
            { type: 'L', params: [-ventOverlap, yHem] },
            // Abertura de marcha (vent)
            { type: 'L', params: [-ventOverlap, yHem - ventLength] },
            { type: 'L', params: [0, yHem - ventLength] },
            // Centro espalda con quiebre anatómico en cintura
            {
                type: 'C',
                params: [
                    6, yWaist + 90,
                    14, yWaist + 25,
                    16, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    12, yBust,
                    3, 90,
                    0, 22,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const backCenterSeamPath = createPath(backCenterCommands, true);
        const backCenterCutPath = generateSeamAllowanceOffset(backCenterSeamPath, seamAllowanceMm, true);

        const backCenterNotches: Notch[] = [
            {
                position: pt(16, yWaist),
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
            start: pt(backCenterBustWidth * 0.4, 70),
            end: pt(backCenterBustWidth * 0.4, yHem - 80),
            isFold: false,
            label: 'HILO DE LA TELA DE ABRIGO',
        };

        const pieceName = `Abrigo Sastre Espalda Central ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `COAT_ESP_CENTRAL_${side}`;
        const bBox = calculateBoundingBox([backCenterCutPath]);

        pieces.push({
            id: `p_coat_esp_central_${side.toLowerCase()}`,
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
            { type: 'M', params: [0, armholeDepth - 12] },
            {
                type: 'C',
                params: [
                    backSideBustWidth * 0.35, armholeDepth - 18,
                    backSideBustWidth * 0.75, armholeDepth - 15,
                    backSideBustWidth, armholeDepth,
                ],
            },
            {
                type: 'C',
                params: [
                    backSideBustWidth - 5, yBust,
                    backSideWaistWidth, yWaist - 18,
                    backSideWaistWidth, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    backSideWaistWidth, yWaist + 50,
                    backSideHipWidth - 5, yHip,
                    backSideHipWidth, yHem,
                ],
            },
            { type: 'L', params: [0, yHem] },
            {
                type: 'C',
                params: [
                    6, yHip,
                    6, yWaist + 50,
                    0, yWaist,
                ],
            },
            {
                type: 'C',
                params: [
                    -6, yBust,
                    -6, armholeDepth + 30,
                    0, armholeDepth - 12,
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
            start: pt(backSideBustWidth * 0.5, armholeDepth + 30),
            end: pt(backSideBustWidth * 0.5, yHem - 80),
            isFold: false,
            label: 'HILO DE LA TELA',
        };

        const pieceName = `Abrigo Sastre Costadillo Espalda ${isRight ? 'Derecho' : 'Izquierdo'}`;
        const pieceCode = `COAT_COSTADILLO_ESP_${side}`;
        const bBox = calculateBoundingBox([backSideCutPath]);

        pieces.push({
            id: `p_coat_costadillo_esp_${side.toLowerCase()}`,
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
    // 9. PIE DE CUELLO DE ABRIGO (COAT_CUELLO_PIE)
    // ==========================================================================
    const halfNeckStandLength = roundTo((neckCirc / 2.0) * 1.08 + 20, 2);
    const collarStandHeight = 32; // Tirilla robusta de abrigo

    const standCommands: PathCommand[] = [
        { type: 'M', params: [0, collarStandHeight] },
        {
            type: 'C',
            params: [
                halfNeckStandLength * 0.45, collarStandHeight,
                halfNeckStandLength * 0.85, collarStandHeight - 8,
                halfNeckStandLength, collarStandHeight - 15,
            ],
        },
        {
            type: 'C',
            params: [
                halfNeckStandLength + 5, collarStandHeight - 20,
                halfNeckStandLength + 3, -6,
                halfNeckStandLength - 8, -8,
            ],
        },
        {
            type: 'C',
            params: [
                halfNeckStandLength * 0.85, -3,
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
        start: pt(25, 10),
        end: pt(halfNeckStandLength - 25, 10),
        isFold: true,
        label: 'AL DOBLEZ / HILO',
    };

    const standNotches: Notch[] = [
        {
            position: pt(0, collarStandHeight / 2.0),
            angleRad: Math.PI,
            lengthMm: 5,
            type: 'single',
        },
        {
            position: pt(halfNeckStandLength * 0.55, collarStandHeight - 3),
            angleRad: Math.PI / 2,
            lengthMm: 5,
            type: 'single',
        },
    ];

    const standBBox = calculateBoundingBox([standCutPath]);
    pieces.push({
        id: 'p_coat_cuello_pie',
        name: 'Abrigo Sastre Pie de Cuello',
        code: 'COAT_CUELLO_PIE',
        outlineSeam: standSeamPath,
        outlineCut: standCutPath,
        grainline: standGrainline,
        notches: standNotches,
        darts: [],
        labels: [
            {
                position: pt(halfNeckStandLength * 0.35, 14),
                text: 'Pie de Cuello de Abrigo (Cortar 1 al doblez en tela + 1 entretela)',
                fontSizeMm: 8,
            },
        ],
        boundingBox: standBBox,
        quantityToCut: 1,
        cutOnFold: true,
        seamAllowanceMm,
    });

    // ==========================================================================
    // 10. PALA DE CUELLO DE ABRIGO (COAT_CUELLO_PALA)
    // ==========================================================================
    const collarFallHeight = 52; // Pala ancha envolvente de abrigo
    const collarFallLength = halfNeckStandLength + 32;

    const fallCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        {
            type: 'C',
            params: [
                collarFallLength * 0.45, 0,
                collarFallLength * 0.85, -3,
                collarFallLength, -10,
            ],
        },
        { type: 'L', params: [collarFallLength + 20, collarFallHeight + 8] },
        {
            type: 'C',
            params: [
                collarFallLength * 0.85, collarFallHeight,
                collarFallLength * 0.45, collarFallHeight - 3,
                0, collarFallHeight,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];

    const fallSeamPath = createPath(fallCommands, true);
    const fallCutPath = generateSeamAllowanceOffset(fallSeamPath, seamAllowanceMm, true);

    const fallGrainline: Grainline = {
        start: pt(25, collarFallHeight / 2.0),
        end: pt(collarFallLength - 25, collarFallHeight / 2.0),
        isFold: true,
        label: 'AL DOBLEZ',
    };

    const fallNotches: Notch[] = [
        {
            position: pt(0, collarFallHeight / 2.0),
            angleRad: Math.PI,
            lengthMm: 5,
            type: 'single',
        },
    ];

    const fallBBox = calculateBoundingBox([fallCutPath]);
    pieces.push({
        id: 'p_coat_cuello_pala',
        name: 'Abrigo Sastre Pala de Cuello',
        code: 'COAT_CUELLO_PALA',
        outlineSeam: fallSeamPath,
        outlineCut: fallCutPath,
        grainline: fallGrainline,
        notches: fallNotches,
        darts: [],
        labels: [
            {
                position: pt(collarFallLength * 0.35, collarFallHeight / 2.0),
                text: 'Pala de Cuello de Abrigo (Cortar 1 al doblez en tela + 1 entretela)',
                fontSizeMm: 8,
            },
        ],
        boundingBox: fallBBox,
        quantityToCut: 1,
        cutOnFold: true,
        seamAllowanceMm,
    });

    // ==========================================================================
    // 11 & 12. MANGA SUPERIOR DE ABRIGO (IZQUIERDA Y DERECHA)
    // ==========================================================================
    const upperSleeveCapHeight = roundTo(totalArmholePerimeter / 3.4, 2);
    const upperSleeveWidth = roundTo((bicepsCirc + bicepsEase) * 0.68, 2);
    const wristHalfWidth = 160;

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const topSleeveCommands: PathCommand[] = [
            { type: 'M', params: [0, upperSleeveCapHeight] },
            {
                type: 'C',
                params: [
                    upperSleeveWidth * 0.25, upperSleeveCapHeight * 0.65,
                    upperSleeveWidth * 0.40, 12,
                    upperSleeveWidth * 0.55, 0,
                ],
            },
            {
                type: 'C',
                params: [
                    upperSleeveWidth * 0.75, 12,
                    upperSleeveWidth * 0.90, upperSleeveCapHeight * 0.55,
                    upperSleeveWidth, upperSleeveCapHeight,
                ],
            },
            {
                type: 'C',
                params: [
                    upperSleeveWidth + 18, armLength * 0.55,
                    wristHalfWidth + 12, armLength - 40,
                    wristHalfWidth, armLength,
                ],
            },
            { type: 'L', params: [25, armLength] },
            {
                type: 'C',
                params: [
                    12, armLength * 0.55,
                    6, upperSleeveCapHeight + 70,
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
                type: 'single',
            },
            {
                position: pt(upperSleeveWidth * 0.25, upperSleeveCapHeight * 0.65),
                angleRad: Math.PI / 4,
                lengthMm: 5,
                type: 'single',
            },
            {
                position: pt(upperSleeveWidth + 18, armLength * 0.55),
                angleRad: 0,
                lengthMm: 5,
                type: 'double',
            },
        ];

        const topGrainline: Grainline = {
            start: pt(upperSleeveWidth * 0.55, 35),
            end: pt(upperSleeveWidth * 0.55, armLength - 50),
            isFold: false,
            label: 'HILO DE LA TELA DE ABRIGO',
        };

        const pieceName = `Abrigo Sastre Manga Hoja Superior ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `COAT_MANGA_SUPERIOR_${side}`;
        const bBox = calculateBoundingBox([topCutPath]);

        pieces.push({
            id: `p_coat_manga_superior_${side.toLowerCase()}`,
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
    // 13 & 14. MANGA INFERIOR DE ABRIGO (IZQUIERDA Y DERECHA)
    // ==========================================================================
    const underSleeveWidth = roundTo((bicepsCirc + bicepsEase) * 0.38, 2);
    const underWristWidth = 105;

    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';

        const underSleeveCommands: PathCommand[] = [
            { type: 'M', params: [0, upperSleeveCapHeight * 0.85] },
            {
                type: 'C',
                params: [
                    underSleeveWidth * 0.3, upperSleeveCapHeight * 0.65,
                    underSleeveWidth * 0.7, upperSleeveCapHeight * 0.65,
                    underSleeveWidth, upperSleeveCapHeight * 0.85,
                ],
            },
            {
                type: 'C',
                params: [
                    underSleeveWidth + 12, armLength * 0.55,
                    underWristWidth + 6, armLength - 40,
                    underWristWidth, armLength,
                ],
            },
            { type: 'L', params: [12, armLength] },
            {
                type: 'C',
                params: [
                    6, armLength * 0.55,
                    0, upperSleeveCapHeight + 50,
                    0, upperSleeveCapHeight * 0.85,
                ],
            },
            { type: 'Z', params: [] },
        ];

        const underSeamPath = createPath(underSleeveCommands, true);
        const underCutPath = generateSeamAllowanceOffset(underSeamPath, seamAllowanceMm, true);

        const underNotches: Notch[] = [
            {
                position: pt(underSleeveWidth + 12, armLength * 0.55),
                angleRad: 0,
                lengthMm: 5,
                type: 'double',
            },
        ];

        const underGrainline: Grainline = {
            start: pt(underSleeveWidth * 0.5, upperSleeveCapHeight + 25),
            end: pt(underSleeveWidth * 0.5, armLength - 45),
            isFold: false,
            label: 'HILO DE LA TELA',
        };

        const pieceName = `Abrigo Sastre Manga Hoja Inferior ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `COAT_MANGA_INFERIOR_${side}`;
        const bBox = calculateBoundingBox([underCutPath]);

        pieces.push({
            id: `p_coat_manga_inferior_${side.toLowerCase()}`,
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
    // 15 & 16. CARTERAS DE BOLSILLO DE ABRIGO (IZQUIERDA Y DERECHA)
    // ==========================================================================
    for (const side of ['IZQ', 'DER'] as const) {
        const isRight = side === 'DER';
        const chamfer = 15;

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
            start: pt(pocketWidth / 2.0, 6),
            end: pt(pocketWidth / 2.0, pocketHeight - 6),
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

        const pieceName = `Abrigo Sastre Cartera de Bolsillo ${isRight ? 'Derecha' : 'Izquierda'}`;
        const pieceCode = `COAT_BOLSILLO_CARTERA_${side}`;
        const bBox = calculateBoundingBox([pocketCutPath]);

        pieces.push({
            id: `p_coat_bolsillo_cartera_${side.toLowerCase()}`,
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

    // ==========================================================================
    // 17. CINTURÓN SASTRE ENVOLVENTE (COAT_CINTURON)
    // ==========================================================================
    if (hasBelt) {
        const beltLength = 1550; // Largo envolvente con lazo sastre
        const beltWidth = designParams.coat_belt_width_mm || 50;

        const beltCommands: PathCommand[] = [
            { type: 'M', params: [0, 0] },
            { type: 'L', params: [beltLength - 30, 0] },
            { type: 'L', params: [beltLength, beltWidth / 2.0] }, // Punta en flecha
            { type: 'L', params: [beltLength - 30, beltWidth] },
            { type: 'L', params: [0, beltWidth] },
            { type: 'L', params: [0, 0] },
            { type: 'Z', params: [] },
        ];

        const beltSeamPath = createPath(beltCommands, true);
        const beltCutPath = generateSeamAllowanceOffset(beltSeamPath, seamAllowanceMm, true);

        const beltGrainline: Grainline = {
            start: pt(40, beltWidth / 2.0),
            end: pt(beltLength - 40, beltWidth / 2.0),
            isFold: false,
            label: 'HILO DE LA TELA LONGITUDINAL',
        };

        const beltNotches: Notch[] = [
            {
                position: pt(beltLength / 2.0, 0),
                angleRad: Math.PI / 2,
                lengthMm: 4,
                type: 'single',
            },
        ];

        const beltBBox = calculateBoundingBox([beltCutPath]);
        pieces.push({
            id: 'p_coat_cinturon',
            name: 'Abrigo Sastre Cinturón Envolvente',
            code: 'COAT_CINTURON',
            outlineSeam: beltSeamPath,
            outlineCut: beltCutPath,
            grainline: beltGrainline,
            notches: beltNotches,
            darts: [],
            labels: [
                {
                    position: pt(beltLength * 0.45, beltWidth / 2.0),
                    text: 'Cinturón Sastre Envolvente (Cortar 2 tela + 1 entretela)',
                    fontSizeMm: 8,
                },
            ],
            boundingBox: beltBBox,
            quantityToCut: 1,
            cutOnFold: false,
            seamAllowanceMm,
        });
    }

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
