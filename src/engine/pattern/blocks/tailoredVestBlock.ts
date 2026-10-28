// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE CHALECO SASTRE (M02 · GRUPO 1)
// Archivo: src/engine/pattern/blocks/tailoredVestBlock.ts
// ==============================================================================
// Derivación sastre de torso estructurado sin mangas By Katherine Carroll:
// - Delantero Sastre entallado con bajo en pico (vest points)
// - Costadillo Delantero anatómico
// - Espalda Sastre con línea de centro
// - Costadillo de Espalda lumbar
// - Vista Delantera sastre interior
// - Cartera de Bolsillo Ojal de alta costura
// - Ceñidor Dorsal de ajuste (Cinch Strap)
// ==============================================================================

import { EaseValues, GarmentDesignParameters } from '../../../types/pattern/ease';
import {
    calculateBoundingBox,
    createPath,
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

export interface TailoredVestBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateTailoredVestBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): TailoredVestBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const frontLength = measurements.largo_talle_delantero || 440;
    const backLength = measurements.largo_talle_espalda || 410;
    const bustHeight = measurements.altura_busto || 260;
    const bustDistance = measurements.separacion_busto || 190;

    const bustEase = ease.bust || 40;
    const waistEase = ease.waist || 30;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    // Dimensionamiento de cuartos con holgura sastre
    const qBust = roundTo((bustCirc + bustEase) / 4.0, 2);
    const qWaist = roundTo((waistCirc + waistEase) / 4.0, 2);
    const frontWaist = qWaist + 10;
    const backWaist = qWaist - 10;

    const armholeDepth = roundTo((measurements.profundidad_sisa || (backLength / 2.0 + 15)), 2);
    const neckBase = 70;
    const vestPointDrop = 70;

    // --------------------------------------------------------------------------
    // 1. DELANTERO SASTRE CON PICO
    // --------------------------------------------------------------------------
    const frontPoints = {
        neckCenter: pt(0, 180),
        neckShoulder: pt(neckBase + 20, 0),
        shoulderTip: pt(neckBase + 85, 25),
        armholeBase: pt(qBust - 30, armholeDepth - 10),
        waistSide: pt(frontWaist - 20, frontLength),
        waistCenter: pt(0, frontLength),
        vestPoint: pt(frontWaist * 0.45, frontLength + vestPointDrop),
    };

    const frontCommands: PathCommand[] = [
        { type: 'M', params: [frontPoints.neckCenter.x, frontPoints.neckCenter.y] },
        { type: 'L', params: [frontPoints.neckShoulder.x, frontPoints.neckShoulder.y] },
        { type: 'L', params: [frontPoints.shoulderTip.x, frontPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                frontPoints.shoulderTip.x - 2, frontPoints.shoulderTip.y + 40,
                frontPoints.armholeBase.x - 20, frontPoints.armholeBase.y - 30,
                frontPoints.armholeBase.x, frontPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [frontPoints.waistSide.x, frontPoints.waistSide.y] },
        { type: 'L', params: [frontPoints.vestPoint.x, frontPoints.vestPoint.y] },
        { type: 'L', params: [frontPoints.neckCenter.x, frontPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const frontPath = createPath(frontCommands, true);
    const frontPiece = createPiece(
        'piece_vest_front',
        'Chaleco Sastre — Centro Delantero con Pico',
        'CHALECO_DEL_CENTRO',
        frontPath,
        seamMm,
        { start: pt(30, 40), end: pt(30, frontLength + 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: frontPoints.armholeBase, angleRad: Math.PI / 4, lengthMm: 6, label: 'Sisa Delantera', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 2. COSTADILLO DELANTERO
    // --------------------------------------------------------------------------
    const sideFrontCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [45, 0] },
        { type: 'L', params: [40, frontLength - armholeDepth] },
        { type: 'L', params: [0, frontLength - armholeDepth + 15] },
        { type: 'Z', params: [] },
    ];
    const sideFrontPath = createPath(sideFrontCommands, true);
    const sideFrontPiece = createPiece(
        'piece_vest_side_front',
        'Chaleco Sastre — Costadillo Delantero',
        'CHALECO_DEL_COSTADILLO',
        sideFrontPath,
        seamMm,
        { start: pt(20, 20), end: pt(20, 180), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 3. ESPALDA SASTRE
    // --------------------------------------------------------------------------
    const backPoints = {
        neckCenter: pt(0, 0),
        neckShoulder: pt(neckBase, -15),
        shoulderTip: pt(neckBase + 85, 12),
        armholeBase: pt(qBust - 35, armholeDepth - 10),
        waistSide: pt(backWaist - 25, backLength),
        waistCenter: pt(0, backLength - 10),
    };

    const backCommands: PathCommand[] = [
        { type: 'M', params: [backPoints.neckCenter.x, backPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                neckBase * 0.4, -4,
                neckBase * 0.8, -12,
                backPoints.neckShoulder.x, backPoints.neckShoulder.y,
            ],
        },
        { type: 'L', params: [backPoints.shoulderTip.x, backPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                backPoints.shoulderTip.x - 2, backPoints.shoulderTip.y + 35,
                backPoints.armholeBase.x - 15, backPoints.armholeBase.y - 25,
                backPoints.armholeBase.x, backPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [backPoints.waistSide.x, backPoints.waistSide.y] },
        { type: 'L', params: [backPoints.waistCenter.x, backPoints.waistCenter.y] },
        { type: 'L', params: [backPoints.neckCenter.x, backPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const backPath = createPath(backCommands, true);
    const backPiece = createPiece(
        'piece_vest_back',
        'Chaleco Sastre — Centro Espalda',
        'CHALECO_ESP_CENTRO',
        backPath,
        seamMm,
        { start: pt(25, 20), end: pt(25, backLength - 20), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: backPoints.armholeBase, angleRad: Math.PI / 4, lengthMm: 6, label: 'Sisa Espalda', type: 'double' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 4. COSTADILLO DE ESPALDA
    // --------------------------------------------------------------------------
    const sideBackCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [40, 0] },
        { type: 'L', params: [35, backLength - armholeDepth] },
        { type: 'L', params: [0, backLength - armholeDepth] },
        { type: 'Z', params: [] },
    ];
    const sideBackPath = createPath(sideBackCommands, true);
    const sideBackPiece = createPiece(
        'piece_vest_side_back',
        'Chaleco Sastre — Costadillo Espalda',
        'CHALECO_ESP_COSTADILLO',
        sideBackPath,
        seamMm,
        { start: pt(18, 15), end: pt(18, 170), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 5. VISTA DELANTERA INTERIOR
    // --------------------------------------------------------------------------
    const frontFacingCommands: PathCommand[] = [
        { type: 'M', params: [0, frontPoints.neckCenter.y] },
        { type: 'L', params: [frontPoints.neckShoulder.x, frontPoints.neckShoulder.y] },
        { type: 'L', params: [frontPoints.neckShoulder.x - 20, frontPoints.neckShoulder.y + 45] },
        { type: 'L', params: [35, frontLength + vestPointDrop - 20] },
        { type: 'L', params: [frontPoints.vestPoint.x, frontPoints.vestPoint.y] },
        { type: 'Z', params: [] },
    ];
    const frontFacingPath = createPath(frontFacingCommands, true);
    const frontFacingPiece = createPiece(
        'piece_vest_front_facing',
        'Chaleco Sastre — Vista Delantera',
        'CHALECO_VISTA_DEL',
        frontFacingPath,
        seamMm,
        { start: pt(15, 60), end: pt(15, 250), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2, fabricType: 'Vista / Entretela' }
    );

    // --------------------------------------------------------------------------
    // 6. CARTERA DE BOLSILLO OJAL
    // --------------------------------------------------------------------------
    const weltWidth = 110;
    const weltHeight = 25;
    const weltCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [weltWidth, 0] },
        { type: 'L', params: [weltWidth, weltHeight] },
        { type: 'L', params: [0, weltHeight] },
        { type: 'Z', params: [] },
    ];
    const weltPath = createPath(weltCommands, true);
    const weltPiece = createPiece(
        'piece_vest_welt_pocket',
        'Chaleco Sastre — Cartera de Bolsillo Ojal',
        'CHALECO_CARTERA_BOLSILLO',
        weltPath,
        seamMm,
        { start: pt(20, 12), end: pt(90, 12), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 7. CEÑIDOR DORSAL (CINCH STRAP)
    // --------------------------------------------------------------------------
    const strapLength = 160;
    const strapHeight = 25;
    const strapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [strapLength - 15, 0] },
        { type: 'L', params: [strapLength, strapHeight / 2] },
        { type: 'L', params: [strapLength - 15, strapHeight] },
        { type: 'L', params: [0, strapHeight] },
        { type: 'Z', params: [] },
    ];
    const strapPath = createPath(strapCommands, true);
    const strapPiece = createPiece(
        'piece_vest_back_strap',
        'Chaleco Sastre — Ceñidor Dorsal de Ajuste',
        'CHALECO_CENIDOR_DORSAL',
        strapPath,
        seamMm,
        { start: pt(20, 12), end: pt(140, 12), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    const pieces: PatternPiece[] = [
        frontPiece,
        sideFrontPiece,
        backPiece,
        sideBackPiece,
        frontFacingPiece,
        weltPiece,
        strapPiece,
    ];

    calculatedValues.vestFrontLengthMm = frontLength + vestPointDrop;
    calculatedValues.vestBackLengthMm = backLength;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
