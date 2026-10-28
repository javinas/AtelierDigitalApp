// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: GABARDINA / TRENCH COAT (M02.13)
// Archivo: src/engine/pattern/blocks/trenchCoatBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Gabardina / Trench Coat de Alta Costura:
// 1. Delantero Trench con doble botonadura (cruce 75 mm)
// 2. Espalda Trench con costura central y abertura de marcha
// 3. Canesú Posterior Storm Flap (protector de lluvia dorsal)
// 4. Solapa de Pecho Gun Flap (protección frontal derecha)
// 5. Pie de Cuello Trench con lengüeta de cierre
// 6. Cuello Superior / Pala Trench convertible
// 7. Hoja Alta de Manga Trench con copa envolvente
// 8. Hoja Baja de Manga Trench
// 9. Charreteras de Hombro con ojal y terminación en pico
// 10. Trabillas de Ajuste de Puño
// 11. Cinturón Trench Sastre Ancho
// 12. Trabillas de Cintura
// 13. Cartera de Bolsillo Ojal Inclinado
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

export interface TrenchCoatBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateTrenchCoatBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): TrenchCoatBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Medidas anatómicas (mm)
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const backLength = measurements.largo_talle_espalda || 410;
    const armLength = measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const neckCirc = measurements.contorno_cuello || 370;
    const trenchLength = measurements.largo_abrigo || designParams.skirt_length_mm || 1050;

    // 2. Holguras de prenda exterior técnica
    const bustEase = (ease.bust || 80) + 30;
    const waistEase = (ease.waist || 60) + 40;
    const hipEase = (ease.hip || 70) + 40;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const qWaist = (waistCirc + waistEase) / 4.0;
    const qHip = (hipCirc + hipEase) / 4.0;
    const armholeDepth = backLength / 2.0 + 45;
    const doubleBreastWrap = 75;

    // --------------------------------------------------------------------------
    // 1. DELANTERO TRENCH CON CRUCE DE DOBLE BOTONADURA
    // --------------------------------------------------------------------------
    const fPoints = {
        neckCenter: pt(-doubleBreastWrap, 0),
        lapelBreak: pt(-doubleBreastWrap, armholeDepth * 0.45),
        neckShoulder: pt(neckCirc / 6.0, -15),
        shoulderTip: pt(qBust * 0.55, 25),
        armholeBase: pt(qBust, armholeDepth),
        waistSide: pt(qWaist + 15, backLength),
        waistCenter: pt(-doubleBreastWrap, backLength),
        hemSide: pt(qHip + 35, trenchLength),
        hemCenter: pt(-doubleBreastWrap, trenchLength),
    };

    const frontCommands: PathCommand[] = [
        { type: 'M', params: [fPoints.neckCenter.x, fPoints.neckCenter.y] },
        { type: 'L', params: [fPoints.neckShoulder.x, fPoints.neckShoulder.y] },
        { type: 'L', params: [fPoints.shoulderTip.x, fPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                fPoints.shoulderTip.x - 5, fPoints.shoulderTip.y + 50,
                fPoints.armholeBase.x - 25, fPoints.armholeBase.y - 35,
                fPoints.armholeBase.x, fPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [fPoints.waistSide.x, fPoints.waistSide.y] },
        { type: 'L', params: [fPoints.hemSide.x, fPoints.hemSide.y] },
        { type: 'L', params: [fPoints.hemCenter.x, fPoints.hemCenter.y] },
        { type: 'L', params: [fPoints.neckCenter.x, fPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const frontPath = createPath(frontCommands, true);
    const frontPiece = createPiece(
        'piece_trench_front',
        'Gabardina Trench — Delantero Doble Botonadura',
        'TRENCH_DELANTERO',
        frontPath,
        seamMm,
        { start: pt(0, 50), end: pt(0, trenchLength - 50), isFold: false, label: 'CENTRO DELANTERO' },
        {
            notches: [
                { position: fPoints.lapelBreak, angleRad: Math.PI, lengthMm: 6, label: 'Quiebre Solapa', type: 'single' },
                { position: fPoints.waistSide, angleRad: 0, lengthMm: 6, label: 'Línea de Cintura', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 2. ESPALDA TRENCH CON ABERTURA DE MARCHA
    // --------------------------------------------------------------------------
    const ventHeight = 350;
    const bPoints = {
        neckCenter: pt(0, 0),
        neckShoulder: pt(neckCirc / 6.0, -18),
        shoulderTip: pt(qBust * 0.58, 22),
        armholeBase: pt(qBust - 10, armholeDepth - 5),
        waistSide: pt(qWaist, backLength),
        waistCenter: pt(0, backLength),
        hemSide: pt(qHip + 25, trenchLength),
        hemCenter: pt(0, trenchLength),
        ventTop: pt(0, trenchLength - ventHeight),
    };

    const backCommands: PathCommand[] = [
        { type: 'M', params: [bPoints.neckCenter.x, bPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                neckCirc / 12.0, -5,
                neckCirc / 8.0, -15,
                bPoints.neckShoulder.x, bPoints.neckShoulder.y,
            ],
        },
        { type: 'L', params: [bPoints.shoulderTip.x, bPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                bPoints.shoulderTip.x - 5, bPoints.shoulderTip.y + 55,
                bPoints.armholeBase.x - 20, bPoints.armholeBase.y - 30,
                bPoints.armholeBase.x, bPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [bPoints.waistSide.x, bPoints.waistSide.y] },
        { type: 'L', params: [bPoints.hemSide.x, bPoints.hemSide.y] },
        { type: 'L', params: [bPoints.hemCenter.x, bPoints.hemCenter.y] },
        { type: 'L', params: [45, bPoints.hemCenter.y] },
        { type: 'L', params: [45, bPoints.ventTop.y] },
        { type: 'L', params: [bPoints.ventTop.x, bPoints.ventTop.y] },
        { type: 'L', params: [bPoints.neckCenter.x, bPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const backPath = createPath(backCommands, true);
    const backPiece = createPiece(
        'piece_trench_back',
        'Gabardina Trench — Espalda con Abertura de Marcha',
        'TRENCH_ESPALDA',
        backPath,
        seamMm,
        { start: pt(25, 40), end: pt(25, trenchLength - 40), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [
                { position: bPoints.ventTop, angleRad: Math.PI, lengthMm: 6, label: 'Tope Abertura', type: 'double' },
                { position: bPoints.waistSide, angleRad: 0, lengthMm: 6, label: 'Línea Cintura', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 3. CANESÚ POSTERIOR STORM FLAP
    // --------------------------------------------------------------------------
    const stormFlapHeight = armholeDepth + 60;
    const stormFlapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [bPoints.neckShoulder.x, bPoints.neckShoulder.y] },
        { type: 'L', params: [bPoints.shoulderTip.x, bPoints.shoulderTip.y] },
        { type: 'L', params: [bPoints.armholeBase.x - 15, armholeDepth * 0.75] },
        {
            type: 'C',
            params: [
                qBust * 0.6, stormFlapHeight - 15,
                qBust * 0.3, stormFlapHeight + 10,
                0, stormFlapHeight + 15,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const stormFlapPath = createPath(stormFlapCommands, true);
    const stormFlapPiece = createPiece(
        'piece_trench_storm_flap_back',
        'Gabardina Trench — Canesú Posterior Storm Flap',
        'TRENCH_STORM_FLAP',
        stormFlapPath,
        seamMm,
        { start: pt(0, 20), end: pt(0, stormFlapHeight - 10), isFold: true, label: 'AL DOBLEZ' },
        { quantityToCut: 1, cutOnFold: true }
    );

    // --------------------------------------------------------------------------
    // 4. SOLAPA DE PECHO GUN FLAP
    // --------------------------------------------------------------------------
    const gunFlapWidth = 145;
    const gunFlapHeight = 180;
    const gunFlapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [gunFlapWidth, 0] },
        { type: 'L', params: [gunFlapWidth, gunFlapHeight - 40] },
        {
            type: 'C',
            params: [
                gunFlapWidth, gunFlapHeight - 10,
                gunFlapWidth * 0.7, gunFlapHeight,
                gunFlapWidth / 2, gunFlapHeight,
            ],
        },
        {
            type: 'C',
            params: [
                gunFlapWidth * 0.3, gunFlapHeight,
                0, gunFlapHeight - 10,
                0, gunFlapHeight - 40,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const gunFlapPath = createPath(gunFlapCommands, true);
    const gunFlapPiece = createPiece(
        'piece_trench_gun_flap_front',
        'Gabardina Trench — Solapa de Pecho Gun Flap',
        'TRENCH_GUN_FLAP',
        gunFlapPath,
        seamMm,
        { start: pt(gunFlapWidth / 2, 20), end: pt(gunFlapWidth / 2, gunFlapHeight - 20), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 5. PIE DE CUELLO TRENCH CON LENGÜETA
    // --------------------------------------------------------------------------
    const collarLength = (neckCirc + 50) / 2.0;
    const standHeight = 35;
    const standCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [collarLength + 30, 0] },
        { type: 'L', params: [collarLength + 30, standHeight] },
        { type: 'L', params: [0, standHeight] },
        { type: 'Z', params: [] },
    ];
    const standPath = createPath(standCommands, true);
    const collarStandPiece = createPiece(
        'piece_trench_collar_stand',
        'Gabardina Trench — Pie de Cuello con Lengüeta',
        'TRENCH_PIE_CUELLO',
        standPath,
        seamMm,
        { start: pt(0, standHeight / 2), end: pt(collarLength, standHeight / 2), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: pt(collarLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Hombro', type: 'single' }],
            quantityToCut: 2,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 6. CUELLO SUPERIOR / PALA TRENCH
    // --------------------------------------------------------------------------
    const fallHeight = 65;
    const fallLength = collarLength + 15;
    const fallCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [fallLength + 25, -15] },
        { type: 'L', params: [fallLength, fallHeight] },
        { type: 'L', params: [0, fallHeight] },
        { type: 'Z', params: [] },
    ];
    const fallPath = createPath(fallCommands, true);
    const collarFallPiece = createPiece(
        'piece_trench_collar_fall',
        'Gabardina Trench — Pala de Cuello Convertible',
        'TRENCH_PALA_CUELLO',
        fallPath,
        seamMm,
        { start: pt(0, fallHeight / 2), end: pt(fallLength, fallHeight / 2), isFold: true, label: 'AL DOBLEZ' },
        { quantityToCut: 2, cutOnFold: true }
    );

    // --------------------------------------------------------------------------
    // 7. HOJA ALTA DE MANGA TRENCH
    // --------------------------------------------------------------------------
    const sleeveWidth = (bicepsCirc + 90) * 0.65;
    const wristUpper = 165;
    const capHeight = 145;
    const upperCommands: PathCommand[] = [
        { type: 'M', params: [0, capHeight] },
        {
            type: 'C',
            params: [
                sleeveWidth * 0.25, 0,
                sleeveWidth * 0.75, 10,
                sleeveWidth, capHeight * 0.7,
            ],
        },
        { type: 'L', params: [wristUpper, armLength] },
        { type: 'L', params: [0, armLength] },
        { type: 'Z', params: [] },
    ];
    const upperPath = createPath(upperCommands, true);
    const sleeveUpperPiece = createPiece(
        'piece_trench_sleeve_upper',
        'Gabardina Trench — Hoja Alta de Manga',
        'TRENCH_MANGA_HOJA_ALTA',
        upperPath,
        seamMm,
        { start: pt(sleeveWidth / 2, 40), end: pt(sleeveWidth / 2, armLength - 40), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(sleeveWidth * 0.5, 5), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Centro Copa', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 8. HOJA BAJA DE MANGA TRENCH
    // --------------------------------------------------------------------------
    const underWidth = (bicepsCirc + 90) * 0.38;
    const wristUnder = 125;
    const underCommands: PathCommand[] = [
        { type: 'M', params: [0, 30] },
        {
            type: 'C',
            params: [
                underWidth * 0.4, 45,
                underWidth * 0.7, 35,
                underWidth, 10,
            ],
        },
        { type: 'L', params: [wristUnder, armLength] },
        { type: 'L', params: [0, armLength] },
        { type: 'Z', params: [] },
    ];
    const underPath = createPath(underCommands, true);
    const sleeveUnderPiece = createPiece(
        'piece_trench_sleeve_under',
        'Gabardina Trench — Hoja Baja de Manga',
        'TRENCH_MANGA_HOJA_BAJA',
        underPath,
        seamMm,
        { start: pt(underWidth / 2, 40), end: pt(underWidth / 2, armLength - 40), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 9. CHARRETERAS DE HOMBRO MILITARES
    // --------------------------------------------------------------------------
    const epauletteLength = 145;
    const epauletteWidth = 42;
    const epauletteCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [epauletteLength - 20, 0] },
        { type: 'L', params: [epauletteLength, epauletteWidth / 2] },
        { type: 'L', params: [epauletteLength - 20, epauletteWidth] },
        { type: 'L', params: [0, epauletteWidth] },
        { type: 'Z', params: [] },
    ];
    const epaulettePath = createPath(epauletteCommands, true);
    const epaulettePiece = createPiece(
        'piece_trench_epaulette',
        'Gabardina Trench — Charretera de Hombro con Pico',
        'TRENCH_CHARRETERA',
        epaulettePath,
        seamMm,
        { start: pt(20, epauletteWidth / 2), end: pt(epauletteLength - 20, epauletteWidth / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 4 }
    );

    // --------------------------------------------------------------------------
    // 10. TRABILLAS DE AJUSTE DE PUÑO
    // --------------------------------------------------------------------------
    const strapLength = 280;
    const strapWidth = 35;
    const strapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [strapLength - 15, 0] },
        { type: 'L', params: [strapLength, strapWidth / 2] },
        { type: 'L', params: [strapLength - 15, strapWidth] },
        { type: 'L', params: [0, strapWidth] },
        { type: 'Z', params: [] },
    ];
    const strapPath = createPath(strapCommands, true);
    const sleeveStrapPiece = createPiece(
        'piece_trench_sleeve_strap',
        'Gabardina Trench — Trabilla de Ajuste de Puño',
        'TRENCH_TRABILLA_PUNO',
        strapPath,
        seamMm,
        { start: pt(20, strapWidth / 2), end: pt(strapLength - 20, strapWidth / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 4 }
    );

    // --------------------------------------------------------------------------
    // 11. CINTURÓN TRENCH SASTRE ANCHO
    // --------------------------------------------------------------------------
    const beltLength = waistCirc + waistEase + 550;
    const beltWidth = 50;
    const beltCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [beltLength - 25, 0] },
        { type: 'L', params: [beltLength, beltWidth / 2] },
        { type: 'L', params: [beltLength - 25, beltWidth] },
        { type: 'L', params: [0, beltWidth] },
        { type: 'Z', params: [] },
    ];
    const beltPath = createPath(beltCommands, true);
    const beltPiece = createPiece(
        'piece_trench_belt',
        'Gabardina Trench — Cinturón Sastre con Punta de Lanza',
        'TRENCH_CINTURON',
        beltPath,
        seamMm,
        { start: pt(50, beltWidth / 2), end: pt(beltLength - 50, beltWidth / 2), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(beltLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Centro Espalda', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 12. TRABILLAS DE CINTURA
    // --------------------------------------------------------------------------
    const loopLength = 95;
    const loopWidth = 24;
    const loopCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [loopLength, 0] },
        { type: 'L', params: [loopLength, loopWidth] },
        { type: 'L', params: [0, loopWidth] },
        { type: 'Z', params: [] },
    ];
    const loopPath = createPath(loopCommands, true);
    const beltLoopPiece = createPiece(
        'piece_trench_belt_loops',
        'Gabardina Trench — Trabillas de Cintura',
        'TRENCH_TRABILLAS_CINTURA',
        loopPath,
        seamMm,
        { start: pt(10, loopWidth / 2), end: pt(loopLength - 10, loopWidth / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 4 }
    );

    // --------------------------------------------------------------------------
    // 13. CARTERA DE BOLSILLO OJAL INCLINADO
    // --------------------------------------------------------------------------
    const pocketFlapWidth = 185;
    const pocketFlapHeight = 45;
    const pFlapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [pocketFlapWidth, 0] },
        { type: 'L', params: [pocketFlapWidth, pocketFlapHeight] },
        { type: 'L', params: [0, pocketFlapHeight] },
        { type: 'Z', params: [] },
    ];
    const pFlapPath = createPath(pFlapCommands, true);
    const pocketFlapPiece = createPiece(
        'piece_trench_pocket_flap',
        'Gabardina Trench — Cartera de Bolsillo Inclinado',
        'TRENCH_CARTERA_BOLSILLO',
        pFlapPath,
        seamMm,
        { start: pt(20, pocketFlapHeight / 2), end: pt(pocketFlapWidth - 20, pocketFlapHeight / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 4 }
    );

    const pieces: PatternPiece[] = [
        frontPiece,
        backPiece,
        stormFlapPiece,
        gunFlapPiece,
        collarStandPiece,
        collarFallPiece,
        sleeveUpperPiece,
        sleeveUnderPiece,
        epaulettePiece,
        sleeveStrapPiece,
        beltPiece,
        beltLoopPiece,
        pocketFlapPiece,
    ];

    calculatedValues.trenchLengthMm = trenchLength;
    calculatedValues.doubleBreastWrapMm = doubleBreastWrap;
    calculatedValues.beltLengthMm = beltLength;
    calculatedValues.ventHeightMm = ventHeight;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
