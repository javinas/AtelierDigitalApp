// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE SHORT SASTRE (M02.11)
// Archivo: src/engine/pattern/blocks/shortBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Short Sastre de Alta Costura:
// 1. Delantero de Short con desvío de cadera y línea de aplomo
// 2. Espalda de Short con inclinación de tiro glúteo y pinza dorsal
// 3. Pretina Anatómica Sastre con cruce de abotonadura
// 4. Vista de Bolsillo Francés/Sesgado
// 5. Fondo de Bolsillo Sastre Interior
// Todas las magnitudes estrictamente en milímetros (mm).
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
import { Dart, Grainline, Notch, Path2D, PathCommand, PatternPiece, PieceLabel } from '../geometry/types';

function createPiece(
    id: string,
    name: string,
    code: string,
    path: Path2D,
    seamMm: number,
    grainline: Grainline,
    options: {
        notches?: Notch[];
        darts?: Dart[];
        quantityToCut?: number;
        cutOnFold?: boolean;
        fabricType?: string;
        labels?: PieceLabel[];
    } = {}
): PatternPiece {
    const outlineCut = generateSeamAllowanceOffset(path, seamMm);
    return {
        id,
        name,
        code,
        quantityToCut: options.quantityToCut ?? 2,
        cutOnFold: options.cutOnFold ?? false,
        fabricType: options.fabricType ?? 'Tela Principal',
        outlineSeam: path,
        outlineCut,
        seamAllowanceMm: seamMm,
        grainline,
        notches: options.notches ?? [],
        darts: options.darts ?? [],
        labels: options.labels ?? [{ text: name, position: pt(20, 20), fontSizeMm: 10 }],
        boundingBox: calculateBoundingBox([outlineCut]),
    };
}

export interface ShortBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateShortBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): ShortBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Medidas anatómicas requeridas (mm)
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const bodyRise = measurements.profundidad_tiro || 260;
    const shortOutseam = designParams.skirt_length_mm || measurements.largo_exterior_pierna || measurements.largo_short || 450;
    const thighCirc = measurements.contorno_muslo || 580;

    // 2. Holguras y tolerancias
    const waistEase = ease.waist || 20;
    const hipEase = ease.hip || 40;
    const crotchEase = ease.crotch || 20;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const targetWaistQuarter = (waistCirc + waistEase) / 4.0;
    const targetHipQuarter = (hipCirc + hipEase) / 4.0;

    // Altura de tiro y largo terminado
    const totalRise = bodyRise + crotchEase;
    const finishedLength = Math.max(shortOutseam, totalRise + 120);
    const hemY = finishedLength;

    // Extensiones de tiro anatómicas
    const frontCrotchExt = (hipCirc + hipEase) / 16.0;
    const backCrotchExt = (hipCirc + hipEase) / 8.0;

    // Ancho de pierna al ruedo del short
    const legHemHalf = (thighCirc + 60) / 4.0;

    // --------------------------------------------------------------------------
    // 1. DELANTERO DE SHORT SASTRE
    // --------------------------------------------------------------------------
    const fWaistLeft = pt(-targetWaistQuarter * 0.5 - 12, 0); // Tiro
    const fWaistRight = pt(targetWaistQuarter * 0.5 + 8, 0);  // Costado
    const fHipInseam = pt(-targetHipQuarter * 0.5, totalRise - 60);
    const fCrotchTip = pt(-targetHipQuarter * 0.5 - frontCrotchExt, totalRise);
    const fHemInseam = pt(-legHemHalf - 15, hemY);
    const fHemSide = pt(legHemHalf + 10, hemY);
    const fSideHip = pt(targetHipQuarter * 0.5 + 20, totalRise * 0.65);

    const frontCommands: PathCommand[] = [
        { type: 'M', params: [fWaistLeft.x, fWaistLeft.y] },
        { type: 'L', params: [fHipInseam.x, fHipInseam.y] },
        {
            type: 'C',
            params: [
                fHipInseam.x, totalRise - 20,
                fCrotchTip.x + 8, totalRise,
                fCrotchTip.x, fCrotchTip.y,
            ],
        },
        {
            type: 'C',
            params: [
                fCrotchTip.x + 10, totalRise + 40,
                fHemInseam.x - 5, hemY - 20,
                fHemInseam.x, fHemInseam.y,
            ],
        },
        { type: 'L', params: [fHemSide.x, fHemSide.y] },
        {
            type: 'C',
            params: [
                fHemSide.x + 5, hemY - 40,
                fSideHip.x, totalRise + 10,
                fSideHip.x, fSideHip.y,
            ],
        },
        {
            type: 'C',
            params: [
                fSideHip.x - 2, totalRise * 0.35,
                fWaistRight.x + 8, 20,
                fWaistRight.x, fWaistRight.y,
            ],
        },
        { type: 'L', params: [fWaistLeft.x, fWaistLeft.y] },
        { type: 'Z', params: [] },
    ];
    const frontPath = createPath(frontCommands, true);
    const frontPiece = createPiece(
        'piece_short_front',
        'Short Sastre — Delantero',
        'SHORT_DELANTERO',
        frontPath,
        seamMm,
        { start: pt(0, 30), end: pt(0, hemY - 30), isFold: false, label: 'LÍNEA DE APLOMO' },
        {
            notches: [
                { position: pt(fWaistRight.x - 45, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Abertura Bolsillo', type: 'single' },
                { position: fCrotchTip, angleRad: Math.PI, lengthMm: 6, label: 'Punta Tiro Delantero', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 2. ESPALDA DE SHORT SASTRE
    // --------------------------------------------------------------------------
    const bWaistShiftX = 25;
    const bWaistLiftY = -35;
    const bWaistLeft = pt(-targetWaistQuarter * 0.5 + bWaistShiftX, bWaistLiftY);
    const bWaistRight = pt(targetWaistQuarter * 0.5 + 20, 0);
    const bHipInseam = pt(-targetHipQuarter * 0.5 + 10, totalRise - 50);
    const bCrotchTip = pt(-targetHipQuarter * 0.5 - backCrotchExt, totalRise + 18);
    const bHemInseam = pt(-legHemHalf - 25, hemY);
    const bHemSide = pt(legHemHalf + 20, hemY);
    const bSideHip = pt(targetHipQuarter * 0.5 + 28, totalRise * 0.65);

    const backCommands: PathCommand[] = [
        { type: 'M', params: [bWaistLeft.x, bWaistLeft.y] },
        { type: 'L', params: [bHipInseam.x, bHipInseam.y] },
        {
            type: 'C',
            params: [
                bHipInseam.x - 5, totalRise - 15,
                bCrotchTip.x + 20, totalRise + 12,
                bCrotchTip.x, bCrotchTip.y,
            ],
        },
        {
            type: 'C',
            params: [
                bCrotchTip.x + 15, totalRise + 50,
                bHemInseam.x - 5, hemY - 25,
                bHemInseam.x, bHemInseam.y,
            ],
        },
        { type: 'L', params: [bHemSide.x, bHemSide.y] },
        {
            type: 'C',
            params: [
                bHemSide.x + 8, hemY - 45,
                bSideHip.x + 5, totalRise + 15,
                bSideHip.x, bSideHip.y,
            ],
        },
        {
            type: 'C',
            params: [
                bSideHip.x - 2, totalRise * 0.35,
                bWaistRight.x + 5, 20,
                bWaistRight.x, bWaistRight.y,
            ],
        },
        { type: 'L', params: [bWaistLeft.x, bWaistLeft.y] },
        { type: 'Z', params: [] },
    ];
    const backPath = createPath(backCommands, true);
    const backPiece = createPiece(
        'piece_short_back',
        'Short Sastre — Espalda',
        'SHORT_ESPALDA',
        backPath,
        seamMm,
        { start: pt(0, 30), end: pt(0, hemY - 30), isFold: false, label: 'LÍNEA DE APLOMO' },
        {
            notches: [{ position: bCrotchTip, angleRad: Math.PI, lengthMm: 6, label: 'Punta Tiro Espalda', type: 'double' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 3. PRETINA SASTRE ANATÓMICA
    // --------------------------------------------------------------------------
    const waistbandLength = waistCirc + waistEase + 60;
    const waistbandHeight = 40;
    const wbCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [waistbandLength, 0] },
        { type: 'L', params: [waistbandLength, waistbandHeight] },
        { type: 'L', params: [0, waistbandHeight] },
        { type: 'Z', params: [] },
    ];
    const wbPath = createPath(wbCommands, true);
    const waistbandPiece = createPiece(
        'piece_short_waistband',
        'Short Sastre — Pretina con Cruce de Botón',
        'SHORT_PRETINA',
        wbPath,
        seamMm,
        { start: pt(30, waistbandHeight / 2), end: pt(waistbandLength - 30, waistbandHeight / 2), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [
                { position: pt(30, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Derecho', type: 'single' },
                { position: pt(waistbandLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Espalda', type: 'single' },
                { position: pt(waistbandLength - 60, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Línea de Cruce', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 4. VISTA DE BOLSILLO FRANCÉS / SESGADO
    // --------------------------------------------------------------------------
    const facingWidth = 140;
    const facingHeight = 220;
    const facingCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [facingWidth, 0] },
        { type: 'L', params: [facingWidth, facingHeight - 60] },
        {
            type: 'C',
            params: [
                facingWidth, facingHeight - 20,
                facingWidth - 30, facingHeight,
                facingWidth - 60, facingHeight,
            ],
        },
        { type: 'L', params: [20, facingHeight] },
        { type: 'L', params: [0, facingHeight - 80] },
        { type: 'Z', params: [] },
    ];
    const facingPath = createPath(facingCommands, true);
    const pocketFacingPiece = createPiece(
        'piece_short_pocket_facing',
        'Short Sastre — Vista Lateral de Bolsillo Francés',
        'SHORT_VISTA_BOLSILLO',
        facingPath,
        seamMm,
        { start: pt(20, 20), end: pt(20, facingHeight - 20), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2, fabricType: 'Vista / Tela Principal' }
    );

    // --------------------------------------------------------------------------
    // 5. FONDO DE BOLSILLO SASTRE INTERIOR
    // --------------------------------------------------------------------------
    const bagWidth = 160;
    const bagHeight = 280;
    const bagCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [bagWidth, 0] },
        { type: 'L', params: [bagWidth, bagHeight - 70] },
        {
            type: 'C',
            params: [
                bagWidth, bagHeight - 20,
                bagWidth - 40, bagHeight,
                bagWidth - 70, bagHeight,
            ],
        },
        { type: 'L', params: [40, bagHeight] },
        {
            type: 'C',
            params: [
                15, bagHeight,
                0, bagHeight - 30,
                0, bagHeight - 60,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const bagPath = createPath(bagCommands, true);
    const pocketBagPiece = createPiece(
        'piece_short_pocket_bag',
        'Short Sastre — Fondo de Bolsillo Interior',
        'SHORT_FONDO_BOLSILLO',
        bagPath,
        seamMm,
        { start: pt(30, 30), end: pt(30, bagHeight - 30), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2, fabricType: 'Forro / Algodón' }
    );

    const pieces: PatternPiece[] = [
        frontPiece,
        backPiece,
        waistbandPiece,
        pocketFacingPiece,
        pocketBagPiece,
    ];

    calculatedValues.shortOutseamMm = finishedLength;
    calculatedValues.shortFrontInseamMm = dist(fCrotchTip, fHemInseam);
    calculatedValues.shortBackInseamMm = dist(bCrotchTip, bHemInseam);
    calculatedValues.waistbandLengthMm = waistbandLength;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
