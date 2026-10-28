// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: CHAQUETA VAQUERA DE ALTA COSTURA (M02.19)
// Archivo: src/engine/pattern/blocks/denimCoutureJacketBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Chaqueta Vaquera / Denim Couture:
// 1. Canesú Delantero Vaquero con corte oblicuo
// 2. Centro Delantero con Tapeta Integrada y Ojalillos
// 3. Costadillo Delantero Anatómico
// 4. Canesú Trasero Vaquero al Doblez
// 5. Centro Espalda Vaquero
// 6. Costadillo Espalda Vaquero
// 7. Pala de Cuello Vaquero con Pespuntes
// 8. Pie de Cuello Vaquero
// 9. Hoja Superior de Manga Vaquera de Dos Piezas
// 10. Hoja Inferior de Manga Vaquera
// 11. Puño Vaquero con Botón Metálico
// 12. Pretina Inferior Vaquera con Trabillas de Ajuste
// 13. Bolsillo de Pecho Vaquero con Pespunte Decorativo
// 14. Cartera de Bolsillo Vaquero con Terminación en Pico Western
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

export interface DenimCoutureJacketBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateDenimCoutureJacketBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): DenimCoutureJacketBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Medidas anatómicas (mm)
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const backLength = measurements.largo_talle_espalda || 410;
    const armLength = measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const wristCirc = measurements.contorno_muneca || 160;
    const neckCirc = measurements.contorno_cuello || 370;
    const denimLength = backLength + 80;

    // 2. Holguras y tolerancias para tejido denim estructurado
    const bustEase = (ease.bust || 70) + 15;
    const waistEase = (ease.waist || 50) + 20;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const qWaist = (waistCirc + waistEase) / 4.0;
    const armholeDepth = backLength / 2.0 + 25;
    const yokeDrop = 110;
    const placketWidth = 35;

    // --------------------------------------------------------------------------
    // 1. CANESÚ DELANTERO VAQUERO
    // --------------------------------------------------------------------------
    const fYokeCommands: PathCommand[] = [
        { type: 'M', params: [-placketWidth, 30] },
        { type: 'L', params: [neckCirc / 6.0, -8] },
        { type: 'L', params: [qBust * 0.6, 22] },
        { type: 'L', params: [qBust * 0.58, yokeDrop] },
        { type: 'L', params: [-placketWidth, yokeDrop + 15] },
        { type: 'Z', params: [] },
    ];
    const fYokePath = createPath(fYokeCommands, true);
    const yokeFrontPiece = createPiece(
        'piece_denim_yoke_front',
        'Chaqueta Vaquera — Canesú Delantero',
        'DENIM_CANESU_DELANTERO',
        fYokePath,
        seamMm,
        { start: pt(20, 20), end: pt(20, yokeDrop), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(-placketWidth, yokeDrop + 15), angleRad: 0, lengthMm: 5, label: 'Unión Tapeta', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 2. CENTRO DELANTERO CON TAPETA INTEGRADA
    // --------------------------------------------------------------------------
    const fCenterWidth = qBust * 0.52;
    const fCenterHeight = denimLength - yokeDrop;
    const fCenterCommands: PathCommand[] = [
        { type: 'M', params: [-placketWidth, 0] },
        { type: 'L', params: [fCenterWidth, 0] },
        { type: 'L', params: [fCenterWidth - 10, fCenterHeight] },
        { type: 'L', params: [-placketWidth, fCenterHeight] },
        { type: 'Z', params: [] },
    ];
    const fCenterPath = createPath(fCenterCommands, true);
    const centerFrontPiece = createPiece(
        'piece_denim_center_front',
        'Chaqueta Vaquera — Centro Delantero con Tapeta',
        'DENIM_CENTRO_DELANTERO',
        fCenterPath,
        seamMm,
        { start: pt(0, 30), end: pt(0, fCenterHeight - 30), isFold: false, label: 'LÍNEA DE BOTONES' },
        {
            notches: [{ position: pt(fCenterWidth / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Cima Bolsillo', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 3. COSTADILLO DELANTERO
    // --------------------------------------------------------------------------
    const fSideWidth = qBust - fCenterWidth + 15;
    const fSideCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [fSideWidth - 5, armholeDepth - yokeDrop] },
        { type: 'L', params: [fSideWidth - 10, fCenterHeight] },
        { type: 'L', params: [0, fCenterHeight] },
        { type: 'Z', params: [] },
    ];
    const fSidePath = createPath(fSideCommands, true);
    const sideFrontPiece = createPiece(
        'piece_denim_side_front',
        'Chaqueta Vaquera — Costadillo Delantero',
        'DENIM_COSTADILLO_DELANTERO',
        fSidePath,
        seamMm,
        { start: pt(fSideWidth / 2, 40), end: pt(fSideWidth / 2, fCenterHeight - 30), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 4. CANESÚ TRASERO VAQUERO AL DOBLEZ
    // --------------------------------------------------------------------------
    const bYokeCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        {
            type: 'C',
            params: [
                neckCirc / 12.0, -3,
                neckCirc / 8.0, -8,
                neckCirc / 6.0, -10,
            ],
        },
        { type: 'L', params: [qBust * 0.6, 22] },
        { type: 'L', params: [qBust * 0.58, yokeDrop] },
        { type: 'L', params: [0, yokeDrop] },
        { type: 'Z', params: [] },
    ];
    const bYokePath = createPath(bYokeCommands, true);
    const yokeBackPiece = createPiece(
        'piece_denim_yoke_back',
        'Chaqueta Vaquera — Canesú Espalda al Doblez',
        'DENIM_CANESU_ESPALDA',
        bYokePath,
        seamMm,
        { start: pt(0, 20), end: pt(0, yokeDrop - 15), isFold: true, label: 'AL DOBLEZ' },
        { quantityToCut: 1, cutOnFold: true }
    );

    // --------------------------------------------------------------------------
    // 5. CENTRO ESPALDA VAQUERO
    // --------------------------------------------------------------------------
    const bCenterWidth = qWaist * 0.45;
    const bCenterHeight = denimLength - yokeDrop;
    const bCenterCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [bCenterWidth, 0] },
        { type: 'L', params: [bCenterWidth - 5, bCenterHeight] },
        { type: 'L', params: [0, bCenterHeight] },
        { type: 'Z', params: [] },
    ];
    const bCenterPath = createPath(bCenterCommands, true);
    const centerBackPiece = createPiece(
        'piece_denim_center_back',
        'Chaqueta Vaquera — Centro Espalda',
        'DENIM_CENTRO_ESPALDA',
        bCenterPath,
        seamMm,
        { start: pt(20, 30), end: pt(20, bCenterHeight - 30), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 6. COSTADILLO ESPALDA VAQUERO
    // --------------------------------------------------------------------------
    const bSideWidth = qBust - bCenterWidth;
    const bSideCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [bSideWidth, armholeDepth - yokeDrop] },
        { type: 'L', params: [bSideWidth - 8, bCenterHeight] },
        { type: 'L', params: [0, bCenterHeight] },
        { type: 'Z', params: [] },
    ];
    const bSidePath = createPath(bSideCommands, true);
    const sideBackPiece = createPiece(
        'piece_denim_side_back',
        'Chaqueta Vaquera — Costadillo Espalda',
        'DENIM_COSTADILLO_ESPALDA',
        bSidePath,
        seamMm,
        { start: pt(bSideWidth / 2, 40), end: pt(bSideWidth / 2, bCenterHeight - 30), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 7. PALA DE CUELLO VAQUERO
    // --------------------------------------------------------------------------
    const collarLength = neckCirc / 2.0 + 15;
    const fallHeight = 55;
    const fallCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [collarLength + 15, -8] },
        { type: 'L', params: [collarLength, fallHeight] },
        { type: 'L', params: [0, fallHeight] },
        { type: 'Z', params: [] },
    ];
    const fallPath = createPath(fallCommands, true);
    const collarFallPiece = createPiece(
        'piece_denim_collar_fall',
        'Chaqueta Vaquera — Pala de Cuello',
        'DENIM_PALA_CUELLO',
        fallPath,
        seamMm,
        { start: pt(0, fallHeight / 2), end: pt(collarLength, fallHeight / 2), isFold: true, label: 'AL DOBLEZ' },
        { quantityToCut: 2, cutOnFold: true }
    );

    // --------------------------------------------------------------------------
    // 8. PIE DE CUELLO VAQUERO
    // --------------------------------------------------------------------------
    const standHeight = 30;
    const standCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [collarLength + 20, 0] },
        { type: 'L', params: [collarLength + 20, standHeight] },
        { type: 'L', params: [0, standHeight] },
        { type: 'Z', params: [] },
    ];
    const standPath = createPath(standCommands, true);
    const collarStandPiece = createPiece(
        'piece_denim_collar_stand',
        'Chaqueta Vaquera — Pie de Cuello',
        'DENIM_PIE_CUELLO',
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
    // 9. HOJA SUPERIOR DE MANGA VAQUERA
    // --------------------------------------------------------------------------
    const sleeveWidth = (bicepsCirc + 70) * 0.65;
    const sleeveLength = armLength - 50;
    const wristUpper = 145;
    const capHeight = 135;
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
        { type: 'L', params: [wristUpper, sleeveLength] },
        { type: 'L', params: [0, sleeveLength] },
        { type: 'Z', params: [] },
    ];
    const upperPath = createPath(upperCommands, true);
    const sleeveUpperPiece = createPiece(
        'piece_denim_sleeve_upper',
        'Chaqueta Vaquera — Hoja Superior de Manga',
        'DENIM_MANGA_SUPERIOR',
        upperPath,
        seamMm,
        { start: pt(sleeveWidth / 2, 40), end: pt(sleeveWidth / 2, sleeveLength - 40), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(sleeveWidth * 0.5, 5), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Centro Copa', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 10. HOJA INFERIOR DE MANGA VAQUERA
    // --------------------------------------------------------------------------
    const underWidth = (bicepsCirc + 70) * 0.38;
    const wristUnder = 115;
    const underCommands: PathCommand[] = [
        { type: 'M', params: [0, 25] },
        {
            type: 'C',
            params: [
                underWidth * 0.4, 35,
                underWidth * 0.7, 30,
                underWidth, 10,
            ],
        },
        { type: 'L', params: [wristUnder, sleeveLength] },
        { type: 'L', params: [0, sleeveLength] },
        { type: 'Z', params: [] },
    ];
    const underPath = createPath(underCommands, true);
    const sleeveUnderPiece = createPiece(
        'piece_denim_sleeve_under',
        'Chaqueta Vaquera — Hoja Inferior de Manga',
        'DENIM_MANGA_INFERIOR',
        underPath,
        seamMm,
        { start: pt(underWidth / 2, 35), end: pt(underWidth / 2, sleeveLength - 35), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 11. PUÑO VAQUERO
    // --------------------------------------------------------------------------
    const cuffLength = wristCirc + 60;
    const cuffHeight = 50;
    const cuffCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [cuffLength, 0] },
        { type: 'L', params: [cuffLength, cuffHeight] },
        { type: 'L', params: [0, cuffHeight] },
        { type: 'Z', params: [] },
    ];
    const cuffPath = createPath(cuffCommands, true);
    const cuffPiece = createPiece(
        'piece_denim_cuff',
        'Chaqueta Vaquera — Puño con Botón Metálico',
        'DENIM_PUNO',
        cuffPath,
        seamMm,
        { start: pt(20, cuffHeight / 2), end: pt(cuffLength - 20, cuffHeight / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 4 }
    );

    // --------------------------------------------------------------------------
    // 12. PRETINA INFERIOR VAQUERA
    // --------------------------------------------------------------------------
    const wbLength = waistCirc + waistEase + placketWidth * 2;
    const wbHeight = 45;
    const wbCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [wbLength, 0] },
        { type: 'L', params: [wbLength, wbHeight] },
        { type: 'L', params: [0, wbHeight] },
        { type: 'Z', params: [] },
    ];
    const wbPath = createPath(wbCommands, true);
    const waistbandPiece = createPiece(
        'piece_denim_waistband',
        'Chaqueta Vaquera — Pretina Inferior con Lengüetas',
        'DENIM_PRETINA',
        wbPath,
        seamMm,
        { start: pt(40, wbHeight / 2), end: pt(wbLength - 40, wbHeight / 2), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [
                { position: pt(wbLength / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Izq', type: 'single' },
                { position: pt(wbLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Espalda', type: 'single' },
                { position: pt((3 * wbLength) / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Der', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 13. BOLSILLO DE PECHO VAQUERO DE PARCHE
    // --------------------------------------------------------------------------
    const pWidth = 135;
    const pHeight = 145;
    const pocketCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [pWidth, 0] },
        { type: 'L', params: [pWidth, pHeight - 20] },
        { type: 'L', params: [pWidth / 2, pHeight] },
        { type: 'L', params: [0, pHeight - 20] },
        { type: 'Z', params: [] },
    ];
    const pocketPath = createPath(pocketCommands, true);
    const chestPocketPiece = createPiece(
        'piece_denim_chest_pocket',
        'Chaqueta Vaquera — Bolsillo de Pecho con Punta',
        'DENIM_BOLSILLO_PECHO',
        pocketPath,
        seamMm,
        { start: pt(pWidth / 2, 15), end: pt(pWidth / 2, pHeight - 20), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 14. CARTERA DE BOLSILLO VAQUERO CON PUNTA WESTERN
    // --------------------------------------------------------------------------
    const flapWidth = pWidth + 8;
    const flapHeight = 55;
    const flapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [flapWidth, 0] },
        { type: 'L', params: [flapWidth, flapHeight - 18] },
        { type: 'L', params: [flapWidth / 2, flapHeight] },
        { type: 'L', params: [0, flapHeight - 18] },
        { type: 'Z', params: [] },
    ];
    const flapPath = createPath(flapCommands, true);
    const pocketFlapPiece = createPiece(
        'piece_denim_pocket_flap',
        'Chaqueta Vaquera — Cartera con Punta Western',
        'DENIM_CARTERA_BOLSILLO',
        flapPath,
        seamMm,
        { start: pt(20, flapHeight / 2), end: pt(flapWidth - 20, flapHeight / 2), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(flapWidth / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Cartera', type: 'single' }],
            quantityToCut: 4,
        }
    );

    const pieces: PatternPiece[] = [
        yokeFrontPiece,
        centerFrontPiece,
        sideFrontPiece,
        yokeBackPiece,
        centerBackPiece,
        sideBackPiece,
        collarFallPiece,
        collarStandPiece,
        sleeveUpperPiece,
        sleeveUnderPiece,
        cuffPiece,
        waistbandPiece,
        chestPocketPiece,
        pocketFlapPiece,
    ];

    calculatedValues.denimJacketLengthMm = denimLength;
    calculatedValues.waistbandLengthMm = wbLength;
    calculatedValues.placketWidthMm = placketWidth;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
