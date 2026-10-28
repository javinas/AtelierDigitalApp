// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE CORPIÑO BASE (M02.05)
// Archivo: src/engine/pattern/blocks/bodiceBlock.ts
// ==============================================================================
// Genera delantero y espalda paramétricos independientes de alta costura.
// Método de referencia: Fórmulas de sastrería clásica (Aldrich & Gilewska)
// adaptadas al taller de autor de By Katherine Carroll.
// Todas las magnitudes en milímetros (mm).
// ==============================================================================

import { EaseValues, GarmentDesignParameters } from '../../../types/pattern/ease';
import {
    calculateBoundingBox,
    createPath,
    dist,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { Dart, Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';

export interface BodiceBlockOutput {
    frontPiece: PatternPiece;
    backPiece: PatternPiece;
    frontArmholeLengthMm: number;
    backArmholeLengthMm: number;
    sideSeamLengthMm: number;
    warnings: string[];
}

export function generateBodiceBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): BodiceBlockOutput {
    const warnings: string[] = [];

    // 1. Extraer y validar medidas corporales requeridas (en mm)
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const neckCirc = measurements.contorno_cuello || 360;
    const waistOffset = designParams.waist_position_offset_mm || 0;
    const backLength = (measurements.largo_talle_espalda || 410) + waistOffset;
    const frontLength = (measurements.largo_talle_delantero || 440) + waistOffset;
    const bustHeight = measurements.altura_busto || 260;
    const bustSeparation = measurements.separacion_busto || 190;
    const armholeDepth = (measurements.profundidad_sisa || ((backLength - waistOffset) / 2.0 + 10)) + (ease.armhole || 0);
    const shoulderLength = (measurements.largo_hombro || 125) + (ease.shoulder || 0);
    const backWidth = measurements.ancho_espalda || 350;
    const chestWidth = measurements.ancho_pecho || (backWidth - 20);

    // 2. Holguras aplicables (en mm)
    const bustEase = ease.bust || 40;
    const waistEase = ease.waist || 25;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;

    // Medidas terminadas con holgura
    const targetBustQuarter = (bustCirc + bustEase) / 4.0;
    const targetWaistQuarter = (waistCirc + waistEase) / 4.0;

    // Control de proporcionalidad
    const necklineDrop = designParams.neckline_drop_mm || 0;
    const neckRadius = neckCirc / (2.0 * Math.PI);
    const neckWidth = neckCirc / 6.0;
    const neckFrontDepth = neckWidth + 10 + necklineDrop;
    const neckBackDepth = 20;

    // ==========================================================================
    // A. DELANTERO DEL CORPIÑO (FRONT BODICE)
    // ==========================================================================
    // Origen (0, 0): Centro Delantero en nivel de escote base.
    // Eje X: hacia el costado. Eje Y: hacia abajo.
    // ==========================================================================

    const fNeckCenter = pt(0, necklineDrop);
    const fNeckSide = pt(neckWidth, 0);
    const fCenterWaist = pt(0, frontLength);

    // Caída de hombro delantero (~40 mm)
    const shoulderSlopeFront = 40;
    const fShoulderTip = pt(neckWidth + shoulderLength * 0.95, shoulderSlopeFront);

    // Altura de sisa delantera y tórax
    const fArmholeY = armholeDepth;
    const fChestX = chestWidth / 2.0 + bustEase / 8.0;
    const fSideUnderarm = pt(targetBustQuarter, fArmholeY);

    // Punto de Busto (Apex)
    const bustApex = pt(bustSeparation / 2.0, bustHeight);

    // Pinza de cintura delantera
    // Diferencia entre cuarto de busto y cuarto de cintura
    const frontWaistExcess = targetBustQuarter - targetWaistQuarter;
    const baseDartWidth = frontWaistExcess * 0.6 + (designParams.bust_dart_width_adjustment_mm || 0);
    const frontDartWidth = Math.max(15, Math.min(baseDartWidth, 45));
    const frontDartApex = pt(bustApex.x, bustApex.y + 25 + (designParams.bust_dart_offset_mm || 0)); // Termina 25 mm bajo el pezón
    const frontDartLeft = pt(bustApex.x - frontDartWidth / 2.0, frontLength);
    const frontDartRight = pt(bustApex.x + frontDartWidth / 2.0, frontLength);

    // Costado cintura delantero (con curvatura natural)
    const fSideWaist = pt(targetWaistQuarter + frontDartWidth, frontLength - 5);

    // Contorno de costura delantera
    const frontSeamCommands: PathCommand[] = [
        // 1. Centro delantero: desde cintura hasta escote
        { type: 'M', params: [fCenterWaist.x, fCenterWaist.y] },
        { type: 'L', params: [fNeckCenter.x, fNeckCenter.y] },
        // 2. Curva de escote delantero (Bézier suave)
        {
            type: 'C',
            params: [
                fNeckCenter.x + neckWidth * 0.4, fNeckCenter.y + neckFrontDepth * 0.1,
                fNeckSide.x - neckWidth * 0.2, fNeckSide.y - neckFrontDepth * 0.5,
                fNeckSide.x, fNeckSide.y,
            ],
        },
        // 3. Hombro delantero
        { type: 'L', params: [fShoulderTip.x, fShoulderTip.y] },
        // 4. Sisa delantera francesa (curva Bézier)
        {
            type: 'C',
            params: [
                fChestX, shoulderSlopeFront + 40,
                fChestX - 10, fArmholeY - 20,
                fSideUnderarm.x, fSideUnderarm.y,
            ],
        },
        // 5. Costado delantero
        { type: 'L', params: [fSideWaist.x, fSideWaist.y] },
        // 6. Cintura delantera con pinza incorporada
        { type: 'L', params: [frontDartRight.x, frontDartRight.y] },
        { type: 'L', params: [frontDartApex.x, frontDartApex.y] },
        { type: 'L', params: [frontDartLeft.x, frontDartLeft.y] },
        { type: 'L', params: [fCenterWaist.x, fCenterWaist.y] },
        { type: 'Z', params: [] },
    ];

    const frontSeamPath = createPath(frontSeamCommands, true);
    const frontCutPath = generateSeamAllowanceOffset(frontSeamPath, seamAllowanceMm, true);

    // Longitud de sisa delantera calculada
    const frontArmholeCurve: PathCommand[] = [
        { type: 'M', params: [fShoulderTip.x, fShoulderTip.y] },
        {
            type: 'C',
            params: [
                fChestX, shoulderSlopeFront + 40,
                fChestX - 10, fArmholeY - 20,
                fSideUnderarm.x, fSideUnderarm.y,
            ],
        },
    ];
    const frontArmholeLengthMm = createPath(frontArmholeCurve, false).approxLengthMm;

    // Longitud del costado delantero
    const sideSeamLengthMm = roundTo(dist(fSideUnderarm, fSideWaist), 2);

    const frontDart: Dart = {
        apex: frontDartApex,
        leftBase: frontDartLeft,
        rightBase: frontDartRight,
        depthMm: dist(frontDartApex, pt(bustApex.x, frontLength)),
        widthMm: frontDartWidth,
        label: 'Pinza de cintura delantera',
    };

    const frontNotch: Notch = {
        position: pt(fChestX, fArmholeY - 35),
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete sisa delantera (simple)',
        type: 'single',
    };

    const frontGrainline: Grainline = {
        start: pt(25, 60),
        end: pt(25, frontLength - 40),
        isFold: true,
        label: 'CENTRO DELANTERO — AL DOBLEZ',
    };

    const frontPiece: PatternPiece = {
        id: 'piece_bodice_front',
        name: 'Corpiño Delantero',
        code: 'CORPINO_DEL',
        quantityToCut: 1,
        cutOnFold: true,
        fabricType: 'Tela Principal',
        outlineSeam: frontSeamPath,
        outlineCut: frontCutPath,
        seamAllowanceMm,
        grainline: frontGrainline,
        notches: [frontNotch],
        darts: [frontDart],
        labels: [
            {
                text: 'CORPIÑO DELANTERO — CORTAR 1 AL DOBLEZ',
                position: pt(targetBustQuarter * 0.35, frontLength * 0.55),
                fontSizeMm: 12,
            },
            {
                text: `Talle: ${frontLength} mm · Busto: ${bustCirc} mm`,
                position: pt(targetBustQuarter * 0.35, frontLength * 0.55 + 20),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([frontCutPath]),
    };

    // ==========================================================================
    // B. ESPALDA DEL CORPIÑO (BACK BODICE)
    // ==========================================================================
    // Origen (0, 0): Centro Espalda en nivel C7 (séptima vértebra).
    // Eje X: hacia el costado. Eje Y: hacia abajo.
    // ==========================================================================

    const bNeckCenter = pt(0, 0);
    const bNeckSide = pt(neckWidth, -neckBackDepth);
    const bCenterWaist = pt(0, backLength);

    // Caída de hombro espalda (~30 mm respecto a C7)
    const shoulderSlopeBack = 15;
    // Hombro con pinza de 10 mm para omóplato
    const backShoulderTotal = shoulderLength + 10;
    const bShoulderTip = pt(neckWidth + backShoulderTotal * 0.96, shoulderSlopeBack);

    // Altura sisa espalda
    const bArmholeY = armholeDepth;
    const bBackX = backWidth / 2.0 + bustEase / 8.0;
    const bSideUnderarm = pt(targetBustQuarter, bArmholeY);

    // Costado cintura espalda: debe igualar estrictamente la longitud del costado delantero
    const bSideWaist = pt(targetWaistQuarter + 25, backLength - 5);

    // Pinza de cintura espalda
    const backDartWidth = 25;
    const backDartX = targetWaistQuarter * 0.5;
    const backDartApex = pt(backDartX, armholeDepth + 20);
    const backDartLeft = pt(backDartX - backDartWidth / 2.0, backLength);
    const backDartRight = pt(backDartX + backDartWidth / 2.0, backLength);

    const backSeamCommands: PathCommand[] = [
        // 1. Centro espalda: cintura a cuello C7
        { type: 'M', params: [bCenterWaist.x, bCenterWaist.y] },
        { type: 'L', params: [bNeckCenter.x, bNeckCenter.y] },
        // 2. Curva de escote espalda
        {
            type: 'C',
            params: [
                bNeckCenter.x + neckWidth * 0.3, bNeckCenter.y - neckBackDepth * 0.4,
                bNeckSide.x - neckWidth * 0.2, bNeckSide.y + neckBackDepth * 0.2,
                bNeckSide.x, bNeckSide.y,
            ],
        },
        // 3. Hombro espalda
        { type: 'L', params: [bShoulderTip.x, bShoulderTip.y] },
        // 4. Sisa espalda (curva suave anatómica)
        {
            type: 'C',
            params: [
                bBackX, shoulderSlopeBack + 45,
                bBackX + 5, bArmholeY - 25,
                bSideUnderarm.x, bSideUnderarm.y,
            ],
        },
        // 5. Costado espalda
        { type: 'L', params: [bSideWaist.x, bSideWaist.y] },
        // 6. Cintura espalda con pinza
        { type: 'L', params: [backDartRight.x, backDartRight.y] },
        { type: 'L', params: [backDartApex.x, backDartApex.y] },
        { type: 'L', params: [backDartLeft.x, backDartLeft.y] },
        { type: 'L', params: [bCenterWaist.x, bCenterWaist.y] },
        { type: 'Z', params: [] },
    ];

    const backSeamPath = createPath(backSeamCommands, true);
    const backCutPath = generateSeamAllowanceOffset(backSeamPath, seamAllowanceMm, true);

    // Longitud sisa espalda calculada
    const backArmholeCurve: PathCommand[] = [
        { type: 'M', params: [bShoulderTip.x, bShoulderTip.y] },
        {
            type: 'C',
            params: [
                bBackX, shoulderSlopeBack + 45,
                bBackX + 5, bArmholeY - 25,
                bSideUnderarm.x, bSideUnderarm.y,
            ],
        },
    ];
    const backArmholeLengthMm = createPath(backArmholeCurve, false).approxLengthMm;

    const backDart: Dart = {
        apex: backDartApex,
        leftBase: backDartLeft,
        rightBase: backDartRight,
        depthMm: dist(backDartApex, pt(backDartX, backLength)),
        widthMm: backDartWidth,
        label: 'Pinza lumbar de cintura',
    };

    const backNotch: Notch = {
        position: pt(bBackX + 5, bArmholeY - 45),
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete sisa espalda (doble)',
        type: 'double',
    };

    const backGrainline: Grainline = {
        start: pt(30, 40),
        end: pt(30, backLength - 40),
        isFold: false,
        label: 'HILO DE LA TELA (CENTRO ESPALDA)',
    };

    const backPiece: PatternPiece = {
        id: 'piece_bodice_back',
        name: 'Corpiño Espalda',
        code: 'CORPINO_ESP',
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela Principal',
        outlineSeam: backSeamPath,
        outlineCut: backCutPath,
        seamAllowanceMm,
        grainline: backGrainline,
        notches: [backNotch],
        darts: [backDart],
        labels: [
            {
                text: 'CORPIÑO ESPALDA — CORTAR 2 (PAR)',
                position: pt(targetBustQuarter * 0.35, backLength * 0.5),
                fontSizeMm: 12,
            },
            {
                text: `Talle: ${backLength} mm · Busto: ${bustCirc} mm`,
                position: pt(targetBustQuarter * 0.35, backLength * 0.5 + 20),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([backCutPath]),
    };

    // Validar concordancia de costados
    const backSideLength = roundTo(dist(bSideUnderarm, bSideWaist), 2);
    const sideDiff = Math.abs(sideSeamLengthMm - backSideLength);
    if (sideDiff > 8) {
        warnings.push(
            `Diferencia en costados delantero (${sideSeamLengthMm} mm) y espalda (${backSideLength} mm): ${roundTo(sideDiff)} mm. Se sugiere ecualizar en prueba.`
        );
    }

    return {
        frontPiece,
        backPiece,
        frontArmholeLengthMm: roundTo(frontArmholeLengthMm, 2),
        backArmholeLengthMm: roundTo(backArmholeLengthMm, 2),
        sideSeamLengthMm,
        warnings,
    };
}
