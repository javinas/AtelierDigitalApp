// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE FALDA (M02.07)
// Archivo: src/engine/pattern/blocks/skirtBlock.ts
// ==============================================================================
// Genera falda delantera y espalda con pinzas lumbares y transformaciones
// recta y línea A con compensación de curva de dobladillo.
// Todas las dimensiones en milímetros (mm).
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

export interface SkirtBlockOutput {
    frontPiece: PatternPiece;
    backPiece: PatternPiece;
    waistLengthFrontMm: number;
    waistLengthBackMm: number;
    hipLengthFrontMm: number;
    hipLengthBackMm: number;
    sideSeamLengthMm: number;
    warnings: string[];
}

export function generateSkirtBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): SkirtBlockOutput {
    const warnings: string[] = [];

    // 1. Extraer medidas requeridas (mm)
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const hipDepth = measurements.profundidad_cintura_cadera || 200;
    const skirtLength = designParams.skirt_length_mm || measurements.largo_falda || 600;

    // 2. Holguras y márgenes
    const waistEase = ease.waist || 20;
    const hipEase = ease.hip || 40;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;
    const hemAllowanceMm = designParams.hem_allowance_mm || 35;

    // Medidas con desahogo por cuarto
    const targetWaistQuarter = (waistCirc + waistEase) / 4.0;
    const targetHipQuarter = (hipCirc + hipEase) / 4.0;

    // Diferencia cadera - cintura a absorber en pinzas y costados
    const diffQuarter = targetHipQuarter - targetWaistQuarter;
    if (diffQuarter < 15) {
        warnings.push(
            `Diferencia entre cadera y cintura reducida (${roundTo(diffQuarter)} mm). Las pinzas requerirán ajuste mínimo.`
        );
    }

    // Distribución clásica de alta costura:
    // - 50% de la diferencia se elimina en el declive del costado (hip curve)
    // - 20% en la pinza delantera
    // - 30% en la pinza trasera
    const sideCurveIntake = diffQuarter * 0.5;
    const frontDartWidth = Math.min(25, Math.max(15, diffQuarter * 0.2));
    const backDartWidth = Math.min(35, Math.max(20, diffQuarter * 0.3));

    // Parámetros de silueta (Línea A vs Recta)
    const isALine = designParams.skirt_silhouette === 'a_line';
    const flarePerSide = isALine ? (designParams.skirt_flare_per_side_mm || 60) : 0;

    // ==========================================================================
    // A. FALDA DELANTERA (FRONT SKIRT)
    // Origen (0, 0): Centro Delantero en nivel de cintura.
    // Eje X: hacia el costado. Eje Y: hacia el bajo.
    // ==========================================================================

    const fCenterWaist = pt(0, 0);
    const fCenterHem = pt(0, skirtLength);

    // Posición de la pinza delantera: aproximadamente a 1/3 de la cintura
    const fDartX = targetWaistQuarter * 0.45;
    const fDartLength = 100; // Largo estándar de pinza delantera
    const fDartApex = pt(fDartX, fDartLength);
    const fDartLeft = pt(fDartX - frontDartWidth / 2.0, 0);
    const fDartRight = pt(fDartX + frontDartWidth / 2.0, 0);

    // Costado de cintura delantero (elevado 10 mm por anatomía de cadera)
    const fSideWaistX = targetWaistQuarter + frontDartWidth;
    const fSideWaist = pt(fSideWaistX, -10);

    // Costado en nivel de cadera
    const fSideHip = pt(targetHipQuarter, hipDepth);

    // Costado en nivel de bajo (con vuelo si es línea A)
    const fSideHemX = targetHipQuarter + flarePerSide;
    // Compensación de vuelo en bajo para que el costado mida exactamente skirtLength
    const fSideHemY = isALine ? skirtLength - 8 : skirtLength;
    const fSideHem = pt(fSideHemX, fSideHemY);

    const frontSeamCommands: PathCommand[] = [
        // 1. Centro delantero: cintura a bajo
        { type: 'M', params: [fCenterWaist.x, fCenterWaist.y] },
        { type: 'L', params: [fCenterHem.x, fCenterHem.y] },
        // 2. Dobladillo inferior (curvado si es línea A)
        ...(isALine
            ? [
                  {
                      type: 'C' as const,
                      params: [
                          fCenterHem.x + fSideHem.x * 0.3, fCenterHem.y,
                          fSideHem.x - 30, fSideHem.y + 2,
                          fSideHem.x, fSideHem.y,
                      ],
                  },
              ]
            : [{ type: 'L' as const, params: [fSideHem.x, fSideHem.y] }]),
        // 3. Costado inferior: bajo a cadera
        { type: 'L', params: [fSideHip.x, fSideHip.y] },
        // 4. Curva de cadera hacia cintura
        {
            type: 'C',
            params: [
                fSideHip.x, hipDepth * 0.4,
                fSideWaist.x + 4, fSideWaist.y + 30,
                fSideWaist.x, fSideWaist.y,
            ],
        },
        // 5. Línea de cintura con pinza delantera
        { type: 'L', params: [fDartRight.x, fDartRight.y] },
        { type: 'L', params: [fDartApex.x, fDartApex.y] },
        { type: 'L', params: [fDartLeft.x, fDartLeft.y] },
        { type: 'L', params: [fCenterWaist.x, fCenterWaist.y] },
        { type: 'Z', params: [] },
    ];

    const frontSeamPath = createPath(frontSeamCommands, true);
    const frontCutPath = generateSeamAllowanceOffset(frontSeamPath, seamAllowanceMm, true);

    const frontDart: Dart = {
        apex: fDartApex,
        leftBase: fDartLeft,
        rightBase: fDartRight,
        depthMm: fDartLength,
        widthMm: frontDartWidth,
        label: 'Pinza delantera de falda',
    };

    const frontHipNotch: Notch = {
        position: fSideHip,
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete de altura de cadera',
        type: 'single',
    };

    const frontGrainline: Grainline = {
        start: pt(25, 40),
        end: pt(25, skirtLength - 60),
        isFold: true,
        label: 'CENTRO DELANTERO — AL DOBLEZ',
    };

    const frontPiece: PatternPiece = {
        id: 'piece_skirt_front',
        name: 'Falda Delantera',
        code: 'FALDA_DEL',
        quantityToCut: 1,
        cutOnFold: true,
        fabricType: 'Tela Principal',
        outlineSeam: frontSeamPath,
        outlineCut: frontCutPath,
        seamAllowanceMm,
        grainline: frontGrainline,
        notches: [frontHipNotch],
        darts: [frontDart],
        labels: [
            {
                text: `FALDA DELANTERA (${isALine ? 'LÍNEA A' : 'RECTA'}) — CORTAR 1 AL DOBLEZ`,
                position: pt(targetHipQuarter * 0.35, skirtLength * 0.45),
                fontSizeMm: 12,
            },
            {
                text: `Cintura: ${waistCirc} mm · Cadera: ${hipCirc} mm · Largo: ${skirtLength} mm`,
                position: pt(targetHipQuarter * 0.35, skirtLength * 0.45 + 20),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([frontCutPath]),
    };

    // ==========================================================================
    // B. FALDA ESPALDA (BACK SKIRT)
    // Origen (0, 0): Centro Espalda en nivel de cintura.
    // ==========================================================================

    const bCenterWaist = pt(0, 0);
    const bCenterHem = pt(0, skirtLength);

    // Pinza de espalda: más profunda para la curvatura lumbar (130 mm)
    const bDartX = targetWaistQuarter * 0.50;
    const bDartLength = 135;
    const bDartApex = pt(bDartX, bDartLength);
    const bDartLeft = pt(bDartX - backDartWidth / 2.0, 0);
    const bDartRight = pt(bDartX + backDartWidth / 2.0, 0);

    // Costado de cintura espalda
    const bSideWaistX = targetWaistQuarter + backDartWidth;
    const bSideWaist = pt(bSideWaistX, -10);

    const bSideHip = pt(targetHipQuarter, hipDepth);
    const bSideHemX = targetHipQuarter + flarePerSide;
    const bSideHemY = isALine ? skirtLength - 8 : skirtLength;
    const bSideHem = pt(bSideHemX, bSideHemY);

    const backSeamCommands: PathCommand[] = [
        { type: 'M', params: [bCenterWaist.x, bCenterWaist.y] },
        { type: 'L', params: [bCenterHem.x, bCenterHem.y] },
        ...(isALine
            ? [
                  {
                      type: 'C' as const,
                      params: [
                          bCenterHem.x + bSideHem.x * 0.3, bCenterHem.y,
                          bSideHem.x - 30, bSideHem.y + 2,
                          bSideHem.x, bSideHem.y,
                      ],
                  },
              ]
            : [{ type: 'L' as const, params: [bSideHem.x, bSideHem.y] }]),
        { type: 'L', params: [bSideHip.x, bSideHip.y] },
        {
            type: 'C',
            params: [
                bSideHip.x, hipDepth * 0.4,
                bSideWaist.x + 4, bSideWaist.y + 30,
                bSideWaist.x, bSideWaist.y,
            ],
        },
        { type: 'L', params: [bDartRight.x, bDartRight.y] },
        { type: 'L', params: [bDartApex.x, bDartApex.y] },
        { type: 'L', params: [bDartLeft.x, bDartLeft.y] },
        { type: 'L', params: [bCenterWaist.x, bCenterWaist.y] },
        { type: 'Z', params: [] },
    ];

    const backSeamPath = createPath(backSeamCommands, true);
    const backCutPath = generateSeamAllowanceOffset(backSeamPath, seamAllowanceMm, true);

    const backDart: Dart = {
        apex: bDartApex,
        leftBase: bDartLeft,
        rightBase: bDartRight,
        depthMm: bDartLength,
        widthMm: backDartWidth,
        label: 'Pinza lumbar de falda',
    };

    const backHipNotch: Notch = {
        position: bSideHip,
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete de altura de cadera',
        type: 'double',
    };

    const backGrainline: Grainline = {
        start: pt(35, 40),
        end: pt(35, skirtLength - 60),
        isFold: false,
        label: 'HILO DE LA TELA (CENTRO ESPALDA / CIERRE)',
    };

    const backPiece: PatternPiece = {
        id: 'piece_skirt_back',
        name: 'Falda Espalda',
        code: 'FALDA_ESP',
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela Principal',
        outlineSeam: backSeamPath,
        outlineCut: backCutPath,
        seamAllowanceMm,
        grainline: backGrainline,
        notches: [backHipNotch],
        darts: [backDart],
        labels: [
            {
                text: `FALDA ESPALDA (${isALine ? 'LÍNEA A' : 'RECTA'}) — CORTAR 2 (PAR)`,
                position: pt(targetHipQuarter * 0.35, skirtLength * 0.45),
                fontSizeMm: 12,
            },
            {
                text: `Cintura: ${waistCirc} mm · Cadera: ${hipCirc} mm · Margen: ${seamAllowanceMm} mm`,
                position: pt(targetHipQuarter * 0.35, skirtLength * 0.45 + 20),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([backCutPath]),
    };

    const sideSeamLengthMm = roundTo(dist(fSideWaist, fSideHip) + dist(fSideHip, fSideHem), 2);

    return {
        frontPiece,
        backPiece,
        waistLengthFrontMm: roundTo(targetWaistQuarter, 2),
        waistLengthBackMm: roundTo(targetWaistQuarter, 2),
        hipLengthFrontMm: roundTo(targetHipQuarter, 2),
        hipLengthBackMm: roundTo(targetHipQuarter, 2),
        sideSeamLengthMm,
        warnings,
    };
}
