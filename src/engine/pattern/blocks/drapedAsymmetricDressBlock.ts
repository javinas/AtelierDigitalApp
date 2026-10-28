// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: VESTIDO DRAPEADO / ASIMÉTRICO (M02.17)
// Archivo: src/engine/pattern/blocks/drapedAsymmetricDressBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas con asimetría geométrica real de Alta Costura:
// 1. Delantero Derecho Asimétrico con Un Solo Hombro y Pliegues de Drapeado
// 2. Delantero Izquierdo Escote Descendido / Strapless
// 3. Espalda Derecha Asimétrica con Tirante Diagonal
// 4. Espalda Izquierda Asimétrica Descendida
// 5. Falda Delantera Drapeada con Cascada Diagonal y Vuelo Asimétrico
// 6. Falda Espalda con Ruedo Diagonal High-Low
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

export interface DrapedAsymmetricDressBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateDrapedAsymmetricDressBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): DrapedAsymmetricDressBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Medidas anatómicas (mm)
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const frontLength = measurements.largo_talle_delantero || 440;
    const backLength = measurements.largo_talle_espalda || 410;
    const bustHeight = measurements.altura_busto || 260;
    const neckCirc = measurements.contorno_cuello || 370;
    const dressLength = designParams.skirt_length_mm || measurements.largo_falda || 1020;

    // 2. Holguras fluidas de alta costura
    const bustEase = ease.bust || 25;
    const waistEase = ease.waist || 20;
    const hipEase = ease.hip || 35;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const qWaist = (waistCirc + waistEase) / 4.0;
    const qHip = (hipCirc + hipEase) / 4.0;

    // --------------------------------------------------------------------------
    // 1. DELANTERO DERECHO ASIMÉTRICO (UN SOLO HOMBRO CON PLIEGUES)
    // --------------------------------------------------------------------------
    const fRightCommands: PathCommand[] = [
        { type: 'M', params: [neckCirc / 6.0, 0] },
        { type: 'L', params: [qBust * 0.6, 35] },
        {
            type: 'C',
            params: [
                qBust * 0.55, 80,
                qBust - 10, 160,
                qBust + 10, bustHeight,
            ],
        },
        { type: 'L', params: [qWaist + 25, frontLength] },
        { type: 'L', params: [0, frontLength] },
        {
            type: 'C',
            params: [
                -20, frontLength * 0.5,
                0, 60,
                neckCirc / 6.0, 0,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const fRightPath = createPath(fRightCommands, true);

    const frontRightPiece = createPiece(
        'piece_draped_dress_front_right_one_shoulder',
        'Vestido Drapeado — Delantero Derecho Asimétrico Un Hombro',
        'DRAPEADO_DEL_DER_UN_HOMBRO',
        fRightPath,
        seamMm,
        { start: pt(20, 50), end: pt(20, frontLength - 30), isFold: false, label: 'LÍNEA DE APLOMO ASIMÉTRICA' },
        {
            notches: [
                { position: pt(qWaist + 25, frontLength - 40), angleRad: 0, lengthMm: 6, label: 'Pliegue Drapeado 1', type: 'single' },
                { position: pt(qWaist + 25, frontLength - 80), angleRad: 0, lengthMm: 6, label: 'Pliegue Drapeado 2', type: 'double' },
            ],
            quantityToCut: 1,
        }
    );

    // --------------------------------------------------------------------------
    // 2. DELANTERO IZQUIERDO BASE STRAPLESS
    // --------------------------------------------------------------------------
    const fLeftCommands: PathCommand[] = [
        { type: 'M', params: [0, frontLength * 0.38] },
        {
            type: 'C',
            params: [
                qBust * 0.3, frontLength * 0.40,
                qBust * 0.7, frontLength * 0.42,
                qBust, frontLength * 0.45,
            ],
        },
        { type: 'L', params: [qWaist, frontLength] },
        { type: 'L', params: [0, frontLength] },
        { type: 'L', params: [0, frontLength * 0.38] },
        { type: 'Z', params: [] },
    ];
    const fLeftPath = createPath(fLeftCommands, true);
    const frontLeftPiece = createPiece(
        'piece_draped_dress_front_left_base',
        'Vestido Drapeado — Delantero Izquierdo Escote Descendido',
        'DRAPEADO_DEL_IZQ_STRAPLESS',
        fLeftPath,
        seamMm,
        { start: pt(30, frontLength * 0.5), end: pt(30, frontLength - 20), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(qWaist, frontLength), angleRad: 0, lengthMm: 6, label: 'Cintura Costado', type: 'single' }],
            quantityToCut: 1,
        }
    );

    // --------------------------------------------------------------------------
    // 3. ESPALDA DERECHA ASIMÉTRICA CON TIRANTE
    // --------------------------------------------------------------------------
    const bRightCommands: PathCommand[] = [
        { type: 'M', params: [neckCirc / 6.0, 0] },
        { type: 'L', params: [qBust * 0.6, 35] },
        {
            type: 'C',
            params: [
                qBust * 0.55, 90,
                qBust - 5, 170,
                qBust, bustHeight,
            ],
        },
        { type: 'L', params: [qWaist + 5, backLength] },
        { type: 'L', params: [0, backLength] },
        {
            type: 'C',
            params: [
                0, backLength * 0.6,
                15, 60,
                neckCirc / 6.0, 0,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const bRightPath = createPath(bRightCommands, true);
    const backRightPiece = createPiece(
        'piece_draped_dress_back_right',
        'Vestido Drapeado — Espalda Derecha con Tirante Diagonal',
        'DRAPEADO_ESP_DER',
        bRightPath,
        seamMm,
        { start: pt(25, 60), end: pt(25, backLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 1 }
    );

    // --------------------------------------------------------------------------
    // 4. ESPALDA IZQUIERDA ASIMÉTRICA DESCENDIDA
    // --------------------------------------------------------------------------
    const bLeftCommands: PathCommand[] = [
        { type: 'M', params: [0, backLength * 0.45] },
        { type: 'L', params: [qBust, backLength * 0.48] },
        { type: 'L', params: [qWaist, backLength] },
        { type: 'L', params: [0, backLength] },
        { type: 'L', params: [0, backLength * 0.45] },
        { type: 'Z', params: [] },
    ];
    const bLeftPath = createPath(bLeftCommands, true);
    const backLeftPiece = createPiece(
        'piece_draped_dress_back_left',
        'Vestido Drapeado — Espalda Izquierda Descendida',
        'DRAPEADO_ESP_IZQ',
        bLeftPath,
        seamMm,
        { start: pt(30, backLength * 0.55), end: pt(30, backLength - 20), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 1 }
    );

    // --------------------------------------------------------------------------
    // 5. FALDA DELANTERA DRAPEADA CON CASCADA DIAGONAL
    // --------------------------------------------------------------------------
    const fSkirtDrapedCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [qWaist * 2 + 50, 0] },
        {
            type: 'C',
            params: [
                qHip * 2.2, 100,
                qHip * 2.1, 300,
                qHip * 2.0, dressLength * 0.5,
            ],
        },
        { type: 'L', params: [qHip * 1.3, dressLength - 150] },
        {
            type: 'C',
            params: [
                qHip * 0.8, dressLength,
                qHip * 0.3, dressLength,
                0, dressLength,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const fSkirtDrapedPath = createPath(fSkirtDrapedCommands, true);
    const skirtFrontDrapedPiece = createPiece(
        'piece_draped_dress_skirt_front_draped',
        'Vestido Drapeado — Falda Delantera con Drapeado en Cascada',
        'DRAPEADO_FALDA_DEL_CASCADA',
        fSkirtDrapedPath,
        seamMm,
        { start: pt(40, 50), end: pt(40, dressLength - 50), isFold: false, label: 'AL BIES / 45°' },
        {
            notches: [{ position: pt(qWaist * 2, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Pliegue Fruncido', type: 'triple' }],
            quantityToCut: 1,
        }
    );

    // --------------------------------------------------------------------------
    // 6. FALDA ESPALDA CON ASIMETRÍA DE RUEDO HIGH-LOW
    // --------------------------------------------------------------------------
    const bSkirtAsymCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [qWaist + 15, 0] },
        {
            type: 'C',
            params: [
                qHip + 25, 100,
                qHip + 20, 250,
                qHip * 1.2, dressLength - 120,
            ],
        },
        {
            type: 'C',
            params: [
                qHip * 0.8, dressLength,
                qHip * 0.4, dressLength,
                0, dressLength,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const bSkirtAsymPath = createPath(bSkirtAsymCommands, true);
    const skirtBackAsymPiece = createPiece(
        'piece_draped_dress_skirt_back_asymmetric',
        'Vestido Drapeado — Falda Espalda con Ruedo Diagonal',
        'DRAPEADO_FALDA_ESP_DIAGONAL',
        bSkirtAsymPath,
        seamMm,
        { start: pt(30, 40), end: pt(30, dressLength - 40), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    const pieces: PatternPiece[] = [
        frontRightPiece,
        frontLeftPiece,
        backRightPiece,
        backLeftPiece,
        skirtFrontDrapedPiece,
        skirtBackAsymPiece,
    ];

    calculatedValues.asymmetricHemDiffMm = 150;
    calculatedValues.drapeFullnessRatio = 2.0;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
