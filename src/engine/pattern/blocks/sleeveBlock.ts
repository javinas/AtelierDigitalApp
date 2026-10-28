// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE MANGA ENLAZADA (M02.06)
// Archivo: src/engine/pattern/blocks/sleeveBlock.ts
// ==============================================================================
// Genera una manga paramétrica de alta costura vinculada a la sisa del corpiño.
// Controla rigurosamente la embebición (ease) entre la curva de copa y la sisa real.
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
import { Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';

export interface SleeveBlockOutput {
    sleevePiece: PatternPiece;
    capLengthMm: number;
    armholePerimeterMm: number;
    capEaseMm: number;
    warnings: string[];
}

export const SLEEVE_EASE_LIMITS = {
    PREFERRED_MIN_MM: 20.0,
    PREFERRED_MAX_MM: 30.0,
    TOLERANCE_MIN_MM: 15.0,
    TOLERANCE_MAX_MM: 35.0,
};

export function generateSleeveBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters,
    frontArmholeLengthMm: number,
    backArmholeLengthMm: number
): SleeveBlockOutput {
    const warnings: string[] = [];

    // 1. Extraer dimensiones corporales
    const armLength = designParams.sleeve_length_mm || measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const wristCirc = designParams.sleeve_wrist_opening_mm || measurements.contorno_muneca || 160;

    // 2. Holguras
    const bicepsEase = ease.biceps || 40;
    const wristEase = ease.wrist || 30;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;

    // 3. Cálculo de la copa de manga vinculada a la sisa real
    const armholePerimeterMm = roundTo(frontArmholeLengthMm + backArmholeLengthMm, 2);
    // Altura clásica de copa de manga sastre: aproximadamente Perímetro / 3.1
    const capHeightMm = roundTo(armholePerimeterMm / 3.1, 2);

    // Regla de patronaje sastre para manga enlazada (Aldrich & Gilewska calibrada):
    // La diagonal geométrica entre la coronilla y la sisa determina el ancho mínimo de bíceps.
    // Dado que el trazado anatómico Bézier añade aproximadamente 9.5-10 mm de elongación
    // curvilínea respecto a las cuerdas rectas de referencia, un suplemento diagonal de
    // +7.5 mm por lado garantiza que el embebido total resultante se ubique exactamente
    // en el centro del rango de diseño de alta costura (20-30 mm; óptimo ~25 mm).
    const targetDiagonal = armholePerimeterMm / 2.0 + 7.5;
    const minHalfBicepsForEase = Math.sqrt(
        Math.max(0, targetDiagonal * targetDiagonal - capHeightMm * capHeightMm)
    );

    const halfBiceps = Math.max((bicepsCirc + bicepsEase) / 2.0, minHalfBicepsForEase);
    const bicepsWidth = halfBiceps * 2.0;
    const wristWidth = wristCirc + wristEase;
    const halfWrist = wristWidth / 2.0;

    const capTop = pt(0, 0);
    const frontUnderarm = pt(-halfBiceps, capHeightMm);
    const backUnderarm = pt(halfBiceps, capHeightMm);

    const frontWrist = pt(-halfWrist, armLength);
    const backWrist = pt(halfWrist, armLength);
    const wristCenter = pt(0, armLength + 5); // Curvatura anatómica de dobladillo

    // Curvas Bézier de la copa de la manga
    // Curva delantera (S-curve con inflexión hacia adentro para liberar el pectoral)
    const frontCapCommands: PathCommand[] = [
        { type: 'M', params: [capTop.x, capTop.y] },
        {
            type: 'C',
            params: [
                -halfBiceps * 0.45, capHeightMm * 0.15,
                -halfBiceps * 0.85, capHeightMm * 0.70,
                frontUnderarm.x, frontUnderarm.y,
            ],
        },
    ];

    // Curva espalda (curva más llena y convexa para cobertura del omóplato)
    const backCapCommands: PathCommand[] = [
        { type: 'M', params: [backUnderarm.x, backUnderarm.y] },
        {
            type: 'C',
            params: [
                halfBiceps * 0.85, capHeightMm * 0.65,
                halfBiceps * 0.45, capHeightMm * 0.12,
                capTop.x, capTop.y,
            ],
        },
    ];

    const frontCapPath = createPath(frontCapCommands, false);
    const backCapPath = createPath(backCapCommands, false);
    const totalCapLengthMm = roundTo(frontCapPath.approxLengthMm + backCapPath.approxLengthMm, 2);

    // Control de embebido (Ease de copa vs sisa)
    const capEaseMm = roundTo(totalCapLengthMm - armholePerimeterMm, 2);

    if (capEaseMm < SLEEVE_EASE_LIMITS.TOLERANCE_MIN_MM) {
        warnings.push(
            `Embebido de copa insuficiente (${capEaseMm} mm respecto a sisa de ${armholePerimeterMm} mm; rango preferido: ${SLEEVE_EASE_LIMITS.PREFERRED_MIN_MM}-${SLEEVE_EASE_LIMITS.PREFERRED_MAX_MM} mm, mínimo admisible: ${SLEEVE_EASE_LIMITS.TOLERANCE_MIN_MM} mm). La manga quedará tirante en la cabeza del hombro.`
        );
    } else if (capEaseMm > SLEEVE_EASE_LIMITS.TOLERANCE_MAX_MM) {
        warnings.push(
            `Embebido de copa elevado (${capEaseMm} mm respecto a sisa de ${armholePerimeterMm} mm; rango preferido: ${SLEEVE_EASE_LIMITS.PREFERRED_MIN_MM}-${SLEEVE_EASE_LIMITS.PREFERRED_MAX_MM} mm, máximo admisible: ${SLEEVE_EASE_LIMITS.TOLERANCE_MAX_MM} mm). En tejidos no elásticos requerirá embebido con plancha o pasadas de hilván para moldear sin pliegues.`
        );
    }

    // Contorno completo de costura de la manga
    const sleeveSeamCommands: PathCommand[] = [
        { type: 'M', params: [capTop.x, capTop.y] },
        // Copa delantera
        {
            type: 'C',
            params: [
                -halfBiceps * 0.45, capHeightMm * 0.15,
                -halfBiceps * 0.85, capHeightMm * 0.70,
                frontUnderarm.x, frontUnderarm.y,
            ],
        },
        // Costura interior delantera
        { type: 'L', params: [frontWrist.x, frontWrist.y] },
        // Curva suave de bajo de manga / puño
        {
            type: 'C',
            params: [
                -halfWrist * 0.4, armLength + 4,
                halfWrist * 0.4, armLength + 4,
                backWrist.x, backWrist.y,
            ],
        },
        // Costura interior espalda
        { type: 'L', params: [backUnderarm.x, backUnderarm.y] },
        // Copa espalda
        {
            type: 'C',
            params: [
                halfBiceps * 0.85, capHeightMm * 0.65,
                halfBiceps * 0.45, capHeightMm * 0.12,
                capTop.x, capTop.y,
            ],
        },
        { type: 'Z', params: [] },
    ];

    const seamPath = createPath(sleeveSeamCommands, true);
    const cutPath = generateSeamAllowanceOffset(seamPath, seamAllowanceMm, true);

    // Piquetes de montaje:
    // Piquete de hombro en la coronilla
    const topNotch: Notch = {
        position: capTop,
        angleRad: -Math.PI / 2.0,
        lengthMm: 6,
        label: 'Piquete unión costura hombro',
        type: 'single',
    };

    // Piquete delantero (simple)
    const frontNotch: Notch = {
        position: pt(-halfBiceps * 0.75, capHeightMm * 0.55),
        angleRad: Math.PI,
        lengthMm: 6,
        label: 'Piquete sisa delantera (simple)',
        type: 'single',
    };

    // Piquete espalda (doble)
    const backNotch: Notch = {
        position: pt(halfBiceps * 0.75, capHeightMm * 0.50),
        angleRad: 0,
        lengthMm: 6,
        label: 'Piquete sisa espalda (doble)',
        type: 'double',
    };

    // Línea de aplomo / hilo central
    const grainline: Grainline = {
        start: pt(0, capHeightMm + 20),
        end: pt(0, armLength - 40),
        isFold: false,
        label: 'HILO DE LA TELA (EJE CENTRAL DE MANGA)',
    };

    const sleevePiece: PatternPiece = {
        id: 'piece_sleeve',
        name: 'Manga Sastre',
        code: 'MANGA_CLASICA',
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela Principal',
        outlineSeam: seamPath,
        outlineCut: cutPath,
        seamAllowanceMm,
        grainline,
        notches: [topNotch, frontNotch, backNotch],
        darts: [],
        labels: [
            {
                text: 'MANGA SASTRE — CORTAR 2 (PAR SIMÉTRICO)',
                position: pt(-halfBiceps * 0.6, capHeightMm + 100),
                fontSizeMm: 12,
            },
            {
                text: `Largo: ${armLength} mm · Copa: ${capHeightMm} mm · Embebido: ${capEaseMm} mm`,
                position: pt(-halfBiceps * 0.6, capHeightMm + 120),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([cutPath]),
    };

    return {
        sleevePiece,
        capLengthMm: totalCapLengthMm,
        armholePerimeterMm,
        capEaseMm,
        warnings,
    };
}
