// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BATA DE TALLER DE ALTA COSTURA (M02.14)
// Archivo: src/engine/pattern/blocks/atelierRobeBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Bata de Taller / Kimono Robe de Alta Costura:
// 1. Delantero Cruzado con escote en V / Solapa Esmoquin
// 2. Espalda de Taller Amplia con pliegue dorsal de movimiento
// 3. Vista Delantera Corrida de Cuello y Cruce
// 4. Manga Cómoda de Taller con Hombro Caído
// 5. Bolsillo de Parche Inferior de Gran Capacidad
// 6. Bolsillo de Parche Superior de Pecho
// 7. Cinturón de Lazada de Taller
// 8. Trabillas de Cinturón
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

export interface AtelierRobeBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateAtelierRobeBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): AtelierRobeBlockOutput {
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
    const robeLength = designParams.skirt_length_mm || measurements.largo_abrigo || measurements.largo_bata || 1100;

    // 2. Holguras muy confortables de trabajo de taller
    const bustEase = (ease.bust || 80) + 60;
    const waistEase = (ease.waist || 60) + 80;
    const hipEase = (ease.hip || 70) + 80;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const qWaist = (waistCirc + waistEase) / 4.0;
    const qHip = (hipCirc + hipEase) / 4.0;
    const armholeDepth = backLength / 2.0 + 55;
    const wrapExtension = 90;

    // --------------------------------------------------------------------------
    // 1. DELANTERO CRUZADO DE BATA DE TALLER
    // --------------------------------------------------------------------------
    const fPoints = {
        neckCenter: pt(-wrapExtension, backLength * 0.45),
        neckShoulder: pt(neckCirc / 6.0 + 10, -10),
        shoulderTip: pt(qBust * 0.65, 30),
        armholeBase: pt(qBust + 15, armholeDepth),
        waistSide: pt(qWaist + 25, backLength),
        waistCenter: pt(-wrapExtension, backLength),
        hemSide: pt(qHip + 40, robeLength),
        hemCenter: pt(-wrapExtension, robeLength),
    };

    const frontCommands: PathCommand[] = [
        { type: 'M', params: [fPoints.neckShoulder.x, fPoints.neckShoulder.y] },
        { type: 'L', params: [fPoints.shoulderTip.x, fPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                fPoints.shoulderTip.x - 5, fPoints.shoulderTip.y + 60,
                fPoints.armholeBase.x - 20, fPoints.armholeBase.y - 40,
                fPoints.armholeBase.x, fPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [fPoints.waistSide.x, fPoints.waistSide.y] },
        { type: 'L', params: [fPoints.hemSide.x, fPoints.hemSide.y] },
        { type: 'L', params: [fPoints.hemCenter.x, fPoints.hemCenter.y] },
        { type: 'L', params: [fPoints.neckCenter.x, fPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                fPoints.neckCenter.x + 20, fPoints.neckCenter.y - 60,
                fPoints.neckShoulder.x - 15, fPoints.neckShoulder.y + 40,
                fPoints.neckShoulder.x, fPoints.neckShoulder.y,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const frontPath = createPath(frontCommands, true);
    const frontPiece = createPiece(
        'piece_atelier_robe_front',
        'Bata de Taller — Delantero Cruzado Envolvente',
        'BATA_DELANTERO',
        frontPath,
        seamMm,
        { start: pt(0, 50), end: pt(0, robeLength - 50), isFold: false, label: 'LÍNEA DE APLOMO' },
        {
            notches: [
                { position: fPoints.waistSide, angleRad: 0, lengthMm: 6, label: 'Cintura Costado', type: 'single' },
                { position: fPoints.waistCenter, angleRad: Math.PI, lengthMm: 6, label: 'Cintura Cruce', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 2. ESPALDA DE BATA DE TALLER CON PLIEGUE
    // --------------------------------------------------------------------------
    const bPoints = {
        neckCenter: pt(0, 0),
        neckShoulder: pt(neckCirc / 6.0 + 10, -15),
        shoulderTip: pt(qBust * 0.65, 30),
        armholeBase: pt(qBust + 10, armholeDepth - 5),
        waistSide: pt(qWaist + 20, backLength),
        waistCenter: pt(0, backLength),
        hemSide: pt(qHip + 35, robeLength),
        hemCenter: pt(0, robeLength),
    };

    const backCommands: PathCommand[] = [
        { type: 'M', params: [bPoints.neckCenter.x, bPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                neckCirc / 10.0, -4,
                neckCirc / 7.0, -12,
                bPoints.neckShoulder.x, bPoints.neckShoulder.y,
            ],
        },
        { type: 'L', params: [bPoints.shoulderTip.x, bPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                bPoints.shoulderTip.x - 5, bPoints.shoulderTip.y + 60,
                bPoints.armholeBase.x - 20, bPoints.armholeBase.y - 40,
                bPoints.armholeBase.x, bPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [bPoints.waistSide.x, bPoints.waistSide.y] },
        { type: 'L', params: [bPoints.hemSide.x, bPoints.hemSide.y] },
        { type: 'L', params: [bPoints.hemCenter.x, bPoints.hemCenter.y] },
        { type: 'L', params: [bPoints.neckCenter.x, bPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const backPath = createPath(backCommands, true);
    const backPiece = createPiece(
        'piece_atelier_robe_back',
        'Bata de Taller — Espalda Amplia al Doblez',
        'BATA_ESPALDA',
        backPath,
        seamMm,
        { start: pt(0, 40), end: pt(0, robeLength - 40), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: bPoints.waistSide, angleRad: 0, lengthMm: 6, label: 'Cintura', type: 'single' }],
            quantityToCut: 1,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 3. VISTA DELANTERA CORRIDA DE CUELLO Y CRUCE
    // --------------------------------------------------------------------------
    const facingWidth = 70;
    const facingCommands: PathCommand[] = [
        { type: 'M', params: [fPoints.neckShoulder.x, fPoints.neckShoulder.y] },
        { type: 'L', params: [fPoints.neckShoulder.x + facingWidth, fPoints.neckShoulder.y + 10] },
        { type: 'L', params: [-wrapExtension + facingWidth, fPoints.neckCenter.y] },
        { type: 'L', params: [-wrapExtension + facingWidth, robeLength] },
        { type: 'L', params: [-wrapExtension, robeLength] },
        { type: 'L', params: [-wrapExtension, fPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                fPoints.neckCenter.x + 20, fPoints.neckCenter.y - 60,
                fPoints.neckShoulder.x - 15, fPoints.neckShoulder.y + 40,
                fPoints.neckShoulder.x, fPoints.neckShoulder.y,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const facingPath = createPath(facingCommands, true);
    const facingPiece = createPiece(
        'piece_atelier_robe_facing',
        'Bata de Taller — Vista Delantera Corrida',
        'BATA_VISTA_DELANTERA',
        facingPath,
        seamMm,
        { start: pt(-wrapExtension + facingWidth / 2, 50), end: pt(-wrapExtension + facingWidth / 2, robeLength - 50), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2, fabricType: 'Vista / Tela Principal' }
    );

    // --------------------------------------------------------------------------
    // 4. MANGA CÓMODA DE TALLER CON HOMBRO CAÍDO
    // --------------------------------------------------------------------------
    const sleeveWidth = (bicepsCirc + 110);
    const sleeveLength = armLength - 40;
    const wristWidth = 320;
    const capHeight = 85;

    const sleeveCommands: PathCommand[] = [
        { type: 'M', params: [-sleeveWidth / 2, capHeight] },
        {
            type: 'C',
            params: [
                -sleeveWidth * 0.25, 0,
                sleeveWidth * 0.25, 0,
                sleeveWidth / 2, capHeight,
            ],
        },
        { type: 'L', params: [wristWidth / 2, sleeveLength] },
        { type: 'L', params: [-wristWidth / 2, sleeveLength] },
        { type: 'Z', params: [] },
    ];
    const sleevePath = createPath(sleeveCommands, true);
    const sleevePiece = createPiece(
        'piece_atelier_robe_sleeve',
        'Bata de Taller — Manga Cómoda con Hombro Caído',
        'BATA_MANGA',
        sleevePath,
        seamMm,
        { start: pt(0, 30), end: pt(0, sleeveLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(0, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Centro Hombro', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 5. BOLSILLO DE PARCHE INFERIOR DE GRAN CAPACIDAD
    // --------------------------------------------------------------------------
    const pWidth = 200;
    const pHeight = 230;
    const pocketCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [pWidth, 0] },
        { type: 'L', params: [pWidth, pHeight - 25] },
        {
            type: 'C',
            params: [
                pWidth, pHeight,
                pWidth - 25, pHeight,
                pWidth - 35, pHeight,
            ],
        },
        { type: 'L', params: [35, pHeight] },
        {
            type: 'C',
            params: [
                15, pHeight,
                0, pHeight - 15,
                0, pHeight - 25,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const pocketPath = createPath(pocketCommands, true);
    const patchPocketPiece = createPiece(
        'piece_atelier_robe_patch_pocket',
        'Bata de Taller — Bolsillo de Parche Inferior para Tijeras',
        'BATA_BOLSILLO_HERRAMIENTAS',
        pocketPath,
        seamMm,
        { start: pt(pWidth / 2, 20), end: pt(pWidth / 2, pHeight - 20), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 6. BOLSILLO DE PARCHE SUPERIOR DE PECHO
    // --------------------------------------------------------------------------
    const cWidth = 110;
    const cHeight = 135;
    const chestCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [cWidth, 0] },
        { type: 'L', params: [cWidth, cHeight - 15] },
        { type: 'L', params: [cWidth / 2, cHeight] },
        { type: 'L', params: [0, cHeight - 15] },
        { type: 'Z', params: [] },
    ];
    const chestPath = createPath(chestCommands, true);
    const chestPocketPiece = createPiece(
        'piece_atelier_robe_chest_pocket',
        'Bata de Taller — Bolsillo Superior de Pecho',
        'BATA_BOLSILLO_PECHO',
        chestPath,
        seamMm,
        { start: pt(cWidth / 2, 15), end: pt(cWidth / 2, cHeight - 15), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 1 }
    );

    // --------------------------------------------------------------------------
    // 7. CINTURÓN DE LAZADA DE TALLER
    // --------------------------------------------------------------------------
    const beltLength = waistCirc + 950;
    const beltWidth = 45;
    const beltCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [beltLength, 0] },
        { type: 'L', params: [beltLength, beltWidth] },
        { type: 'L', params: [0, beltWidth] },
        { type: 'Z', params: [] },
    ];
    const beltPath = createPath(beltCommands, true);
    const beltPiece = createPiece(
        'piece_atelier_robe_belt',
        'Bata de Taller — Cinturón de Lazada',
        'BATA_CINTURON_LAZADA',
        beltPath,
        seamMm,
        { start: pt(50, beltWidth / 2), end: pt(beltLength - 50, beltWidth / 2), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(beltLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Centro Espalda', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 8. TRABILLAS DE CINTURÓN
    // --------------------------------------------------------------------------
    const loopLength = 90;
    const loopWidth = 22;
    const loopCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [loopLength, 0] },
        { type: 'L', params: [loopLength, loopWidth] },
        { type: 'L', params: [0, loopWidth] },
        { type: 'Z', params: [] },
    ];
    const loopPath = createPath(loopCommands, true);
    const beltLoopPiece = createPiece(
        'piece_atelier_robe_belt_loop',
        'Bata de Taller — Trabillas Laterales',
        'BATA_TRABILLAS',
        loopPath,
        seamMm,
        { start: pt(10, loopWidth / 2), end: pt(loopLength - 10, loopWidth / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    const pieces: PatternPiece[] = [
        frontPiece,
        backPiece,
        facingPiece,
        sleevePiece,
        patchPocketPiece,
        chestPocketPiece,
        beltPiece,
        beltLoopPiece,
    ];

    calculatedValues.robeLengthMm = robeLength;
    calculatedValues.wrapExtensionMm = wrapExtension;
    calculatedValues.beltLengthMm = beltLength;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
