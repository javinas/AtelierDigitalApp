// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE PANTALÓN (M02.08)
// Archivo: src/engine/pattern/blocks/pantsBlock.ts
// ==============================================================================
// Genera pantalón femenino delantero y espalda paramétricos de alta costura.
// Método documentado de tiro con compensación glútea, línea de aplomo y entrepierna.
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

export interface PantsBlockOutput {
    frontPiece: PatternPiece;
    backPiece: PatternPiece;
    crotchCurveFrontMm: number;
    crotchCurveBackMm: number;
    inseamLengthMm: number;
    outseamLengthMm: number;
    warnings: string[];
}

export function generatePantsBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): PantsBlockOutput {
    const warnings: string[] = [];

    // 1. Extraer medidas requeridas (mm)
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const bodyRise = measurements.profundidad_tiro || 260;
    const outseam = measurements.largo_exterior_pierna || 1020;
    const inseam = measurements.largo_entrepierna || 760;
    const thighCirc = measurements.contorno_muslo || 560;
    const kneeCirc = measurements.contorno_rodilla || 380;
    const hemCirc = designParams.pants_hem_width_mm || measurements.contorno_tobillo || 340;

    // 2. Holguras
    const waistEase = ease.waist || 20;
    const hipEase = ease.hip || 40;
    const crotchEase = ease.crotch || 25;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;

    // Cuartos con desahogo
    const targetWaistQuarter = (waistCirc + waistEase) / 4.0;
    const targetHipQuarter = (hipCirc + hipEase) / 4.0;

    // Altura del tiro terminada (cintura al tiro)
    const totalRise = bodyRise + crotchEase + (designParams.pants_rise_adjustment_mm || 0);
    // Nivel de rodilla: desde el tiro a la mitad de la entrepierna menos 50 mm
    const kneeY = totalRise + (outseam - totalRise) * 0.45;
    const hemY = outseam;

    // Anchos por cuadrante en rodilla y bajo
    const frontKneeQuarter = (kneeCirc + 40) / 4.0;
    const backKneeQuarter = (kneeCirc + 60) / 4.0;
    const frontHemQuarter = (hemCirc + 20) / 4.0;
    const backHemQuarter = (hemCirc + 40) / 4.0;

    // Extensiones del tiro (crotch extensions)
    // Delantero: ~Cadera / 16 (aprox 45-55 mm)
    const frontCrotchExt = (hipCirc + hipEase) / 16.0;
    // Espalda: ~Cadera / 8 (aprox 90-110 mm)
    const backCrotchExt = (hipCirc + hipEase) / 8.0;

    // ==========================================================================
    // A. PANTALÓN DELANTERO (FRONT PANTS)
    // La línea de aplomo (crease line) es el eje X = 0.
    // ==========================================================================

    const fWaistCenter = pt(0, 0);
    const fHemCenter = pt(0, hemY);

    // Cintura delantera: distribuida respecto al aplomo
    const fWaistLeft = pt(-targetWaistQuarter * 0.5 - 15, 0); // Hacia el tiro
    const fWaistRight = pt(targetWaistQuarter * 0.5 + 5, 0);  // Hacia el costado

    // Tiro delantero
    const fCrotchTip = pt(-targetHipQuarter * 0.5 - frontCrotchExt, totalRise);
    const fHipInseam = pt(-targetHipQuarter * 0.5, totalRise - 60);

    // Rodilla y bajo delantero
    const fKneeLeft = pt(-frontKneeQuarter, kneeY);
    const fKneeRight = pt(frontKneeQuarter, kneeY);
    const fHemLeft = pt(-frontHemQuarter, hemY);
    const fHemRight = pt(frontHemQuarter, hemY);

    // Costado de cadera
    const fSideHip = pt(targetHipQuarter * 0.5 + 20, totalRise * 0.65);

    const frontSeamCommands: PathCommand[] = [
        // 1. Centro del tiro delantero: cintura a punta de tiro
        { type: 'M', params: [fWaistLeft.x, fWaistLeft.y] },
        { type: 'L', params: [fHipInseam.x, fHipInseam.y] },
        // Curva de tiro delantero (Bézier suave)
        {
            type: 'C',
            params: [
                fHipInseam.x, totalRise - 20,
                fCrotchTip.x + 10, totalRise,
                fCrotchTip.x, fCrotchTip.y,
            ],
        },
        // 2. Entrepierna delantera: tiro a rodilla y bajo
        {
            type: 'C',
            params: [
                fCrotchTip.x * 0.7, totalRise + 80,
                fKneeLeft.x - 5, kneeY - 40,
                fKneeLeft.x, fKneeLeft.y,
            ],
        },
        { type: 'L', params: [fHemLeft.x, fHemLeft.y] },
        // 3. Bajo delantero
        { type: 'L', params: [fHemRight.x, fHemRight.y] },
        // 4. Costado delantero: bajo a rodilla, cadera y cintura
        { type: 'L', params: [fKneeRight.x, fKneeRight.y] },
        {
            type: 'C',
            params: [
                fKneeRight.x + 5, kneeY - 50,
                fSideHip.x, totalRise * 0.75,
                fSideHip.x, fSideHip.y,
            ],
        },
        {
            type: 'C',
            params: [
                fSideHip.x, totalRise * 0.35,
                fWaistRight.x + 5, 20,
                fWaistRight.x, fWaistRight.y,
            ],
        },
        // 5. Cintura delantera
        { type: 'L', params: [fWaistLeft.x, fWaistLeft.y] },
        { type: 'Z', params: [] },
    ];

    const frontSeamPath = createPath(frontSeamCommands, true);
    const frontCutPath = generateSeamAllowanceOffset(frontSeamPath, seamAllowanceMm, true);

    const frontGrainline: Grainline = {
        start: pt(0, 40),
        end: pt(0, hemY - 40),
        isFold: false,
        label: 'LÍNEA DE APLOMO / HILO DE LA TELA (DELANTERO)',
    };

    const frontKneeNotch: Notch = {
        position: fKneeRight,
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete de rodilla costado',
        type: 'single',
    };

    const frontPiece: PatternPiece = {
        id: 'piece_pants_front',
        name: 'Pantalón Delantero',
        code: 'PANTALON_DEL',
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela Principal',
        outlineSeam: frontSeamPath,
        outlineCut: frontCutPath,
        seamAllowanceMm,
        grainline: frontGrainline,
        notches: [frontKneeNotch],
        darts: [],
        labels: [
            {
                text: 'PANTALÓN DELANTERO — CORTAR 2 (PAR)',
                position: pt(-50, totalRise + 120),
                fontSizeMm: 12,
            },
            {
                text: `Tiro: ${totalRise} mm · Cadera: ${hipCirc} mm · Entrepierna: ${inseam} mm`,
                position: pt(-50, totalRise + 140),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([frontCutPath]),
    };

    // ==========================================================================
    // B. PANTALÓN ESPALDA (BACK PANTS)
    // Con elevación posterior para la masa glútea (~35 mm sobre la cintura).
    // ==========================================================================

    const backRiseElevation = 35;
    const bWaistLeft = pt(-targetWaistQuarter * 0.5 - 20, -backRiseElevation); // Hacia tiro inclinado
    const bWaistRight = pt(targetWaistQuarter * 0.5 + 20, 0);                  // Costado

    const bCrotchTip = pt(-targetHipQuarter * 0.5 - backCrotchExt, totalRise + 15);
    const bHipInseam = pt(-targetHipQuarter * 0.5 - 10, totalRise - 60);

    const bKneeLeft = pt(-backKneeQuarter, kneeY);
    const bKneeRight = pt(backKneeQuarter, kneeY);
    const bHemLeft = pt(-backHemQuarter, hemY);
    const bHemRight = pt(backHemQuarter, hemY);

    const bSideHip = pt(targetHipQuarter * 0.5 + 25, totalRise * 0.65);

    // Pinza trasera de pantalón
    const bDartWidth = 20;
    const bDartLength = 100;
    const bDartApex = pt(0, bDartLength);
    const bDartLeft = pt(-bDartWidth / 2.0, -backRiseElevation * 0.5);
    const bDartRight = pt(bDartWidth / 2.0, -backRiseElevation * 0.5);

    const backSeamCommands: PathCommand[] = [
        // 1. Centro del tiro espalda con inclinación glútea
        { type: 'M', params: [bWaistLeft.x, bWaistLeft.y] },
        { type: 'L', params: [bHipInseam.x, bHipInseam.y] },
        {
            type: 'C',
            params: [
                bHipInseam.x, totalRise - 10,
                bCrotchTip.x + 25, totalRise + 15,
                bCrotchTip.x, bCrotchTip.y,
            ],
        },
        // 2. Entrepierna espalda
        {
            type: 'C',
            params: [
                bCrotchTip.x * 0.7, totalRise + 90,
                bKneeLeft.x - 5, kneeY - 40,
                bKneeLeft.x, bKneeLeft.y,
            ],
        },
        { type: 'L', params: [bHemLeft.x, bHemLeft.y] },
        // 3. Bajo espalda
        { type: 'L', params: [bHemRight.x, bHemRight.y] },
        // 4. Costado espalda
        { type: 'L', params: [bKneeRight.x, bKneeRight.y] },
        {
            type: 'C',
            params: [
                bKneeRight.x + 5, kneeY - 50,
                bSideHip.x, totalRise * 0.75,
                bSideHip.x, bSideHip.y,
            ],
        },
        {
            type: 'C',
            params: [
                bSideHip.x, totalRise * 0.35,
                bWaistRight.x + 5, 20,
                bWaistRight.x, bWaistRight.y,
            ],
        },
        // 5. Cintura espalda con pinza
        { type: 'L', params: [bDartRight.x, bDartRight.y] },
        { type: 'L', params: [bDartApex.x, bDartApex.y] },
        { type: 'L', params: [bDartLeft.x, bDartLeft.y] },
        { type: 'L', params: [bWaistLeft.x, bWaistLeft.y] },
        { type: 'Z', params: [] },
    ];

    const backSeamPath = createPath(backSeamCommands, true);
    const backCutPath = generateSeamAllowanceOffset(backSeamPath, seamAllowanceMm, true);

    const backDart: Dart = {
        apex: bDartApex,
        leftBase: bDartLeft,
        rightBase: bDartRight,
        depthMm: bDartLength,
        widthMm: bDartWidth,
        label: 'Pinza de cintura espalda de pantalón',
    };

    const backGrainline: Grainline = {
        start: pt(0, 40),
        end: pt(0, hemY - 40),
        isFold: false,
        label: 'LÍNEA DE APLOMO / HILO DE LA TELA (ESPALDA)',
    };

    const backKneeNotch: Notch = {
        position: bKneeRight,
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete de rodilla costado',
        type: 'double',
    };

    const backPiece: PatternPiece = {
        id: 'piece_pants_back',
        name: 'Pantalón Espalda',
        code: 'PANTALON_ESP',
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela Principal',
        outlineSeam: backSeamPath,
        outlineCut: backCutPath,
        seamAllowanceMm,
        grainline: backGrainline,
        notches: [backKneeNotch],
        darts: [backDart],
        labels: [
            {
                text: 'PANTALÓN ESPALDA — CORTAR 2 (PAR)',
                position: pt(-50, totalRise + 120),
                fontSizeMm: 12,
            },
            {
                text: `Compensación glútea: +${backRiseElevation} mm · Extensión tiro: ${roundTo(backCrotchExt)} mm`,
                position: pt(-50, totalRise + 140),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([backCutPath]),
    };

    const frontInseam = roundTo(dist(fCrotchTip, fKneeLeft) + dist(fKneeLeft, fHemLeft), 2);
    const backInseam = roundTo(dist(bCrotchTip, bKneeLeft) + dist(bKneeLeft, bHemLeft), 2);

    return {
        frontPiece,
        backPiece,
        crotchCurveFrontMm: roundTo(dist(fWaistLeft, fCrotchTip), 2),
        crotchCurveBackMm: roundTo(dist(bWaistLeft, bCrotchTip), 2),
        inseamLengthMm: frontInseam,
        outseamLengthMm: outseam,
        warnings,
    };
}
