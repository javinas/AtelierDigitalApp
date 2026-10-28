// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: VESTIDO DE GALA (M02.15)
// Archivo: src/engine/pattern/blocks/eveningGownBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Vestido de Gala de Alta Ocasión:
// 1. Corpiño Centro Delantero Escote Corazón Estructurado
// 2. Corpiño Costadillo Delantero Anatómico
// 3. Corpiño Centro Espalda
// 4. Corpiño Costadillo Espalda
// 5. Falda Delantera Sirena de Gala
// 6. Falda Espalda de Gala con Cola Paramétrica (Train)
// 7. Godet de Amplitud Inferior Acampanado
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

export interface EveningGownBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateEveningGownBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): EveningGownBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Medidas anatómicas (mm)
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const hipCirc = measurements.contorno_cadera || 980;
    const frontLength = measurements.largo_talle_delantero || 440;
    const backLength = measurements.largo_talle_espalda || 410;
    const bustHeight = measurements.altura_busto || 260;
    const bustDistance = measurements.separacion_busto || 190;
    const gownLength = designParams.skirt_length_mm || measurements.largo_falda || 1150;
    const trainLengthMm = (designParams as any).train_length_mm || 450;

    // 2. Holguras muy reducidas para alta ocasión / corpiño estructurado
    const bustEase = Math.min(ease.bust || 10, 15);
    const waistEase = Math.min(ease.waist || 10, 10);
    const hipEase = Math.min(ease.hip || 25, 30);
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const qWaist = (waistCirc + waistEase) / 4.0;
    const qHip = (hipCirc + hipEase) / 4.0;
    const halfApex = bustDistance / 2.0;

    // --------------------------------------------------------------------------
    // 1. CORPIÑO CENTRO DELANTERO ESCOTE CORAZÓN
    // --------------------------------------------------------------------------
    const fCenterCommands: PathCommand[] = [
        { type: 'M', params: [0, 60] },
        {
            type: 'C',
            params: [
                halfApex * 0.4, 30,
                halfApex * 0.8, 15,
                halfApex, 20,
            ],
        },
        {
            type: 'C',
            params: [
                halfApex, 80,
                halfApex * 0.9, bustHeight - 30,
                halfApex * 0.85, bustHeight,
            ],
        },
        { type: 'L', params: [halfApex * 0.7, frontLength] },
        { type: 'L', params: [0, frontLength] },
        { type: 'L', params: [0, 60] },
        { type: 'Z', params: [] },
    ];
    const fCenterPath = createPath(fCenterCommands, true);
    const bodiceFrontCenterPiece = createPiece(
        'piece_evening_gown_bodice_front_center',
        'Vestido de Gala — Corpiño Centro Delantero Escote Corazón',
        'GALA_CORPINO_DEL_CENTRO',
        fCenterPath,
        seamMm,
        { start: pt(0, 80), end: pt(0, frontLength - 30), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: pt(halfApex * 0.85, bustHeight), angleRad: 0, lengthMm: 6, label: 'Apex Busto', type: 'single' }],
            quantityToCut: 1,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 2. CORPIÑO COSTADILLO DELANTERO
    // --------------------------------------------------------------------------
    const fSideWidth = qBust - halfApex * 0.85 + 15;
    const fSideCommands: PathCommand[] = [
        { type: 'M', params: [0, 20] },
        {
            type: 'C',
            params: [
                fSideWidth * 0.3, 35,
                fSideWidth * 0.7, 50,
                fSideWidth, 65,
            ],
        },
        { type: 'L', params: [fSideWidth - 10, frontLength] },
        { type: 'L', params: [0, frontLength] },
        {
            type: 'C',
            params: [
                -5, bustHeight,
                0, 60,
                0, 20,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const fSidePath = createPath(fSideCommands, true);
    const bodiceFrontSidePiece = createPiece(
        'piece_evening_gown_bodice_front_side',
        'Vestido de Gala — Corpiño Costadillo Delantero',
        'GALA_CORPINO_DEL_COSTADILLO',
        fSidePath,
        seamMm,
        { start: pt(fSideWidth / 2, 40), end: pt(fSideWidth / 2, frontLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(0, bustHeight), angleRad: Math.PI, lengthMm: 6, label: 'Apex Busto', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 3. CORPIÑO CENTRO ESPALDA
    // --------------------------------------------------------------------------
    const bCenterWidth = qWaist * 0.45;
    const bCenterCommands: PathCommand[] = [
        { type: 'M', params: [0, 80] },
        { type: 'L', params: [bCenterWidth, 80] },
        { type: 'L', params: [bCenterWidth, backLength] },
        { type: 'L', params: [0, backLength] },
        { type: 'L', params: [0, 80] },
        { type: 'Z', params: [] },
    ];
    const bCenterPath = createPath(bCenterCommands, true);
    const bodiceBackCenterPiece = createPiece(
        'piece_evening_gown_bodice_back_center',
        'Vestido de Gala — Corpiño Centro Espalda con Ojalillos',
        'GALA_CORPINO_ESP_CENTRO',
        bCenterPath,
        seamMm,
        { start: pt(20, 100), end: pt(20, backLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 4. CORPIÑO COSTADILLO ESPALDA
    // --------------------------------------------------------------------------
    const bSideWidth = qBust - bCenterWidth;
    const bSideCommands: PathCommand[] = [
        { type: 'M', params: [0, 80] },
        { type: 'L', params: [bSideWidth, 65] },
        { type: 'L', params: [bSideWidth - 10, backLength] },
        { type: 'L', params: [0, backLength] },
        { type: 'Z', params: [] },
    ];
    const bSidePath = createPath(bSideCommands, true);
    const bodiceBackSidePiece = createPiece(
        'piece_evening_gown_bodice_back_side',
        'Vestido de Gala — Corpiño Costadillo Espalda',
        'GALA_CORPINO_ESP_COSTADILLO',
        bSidePath,
        seamMm,
        { start: pt(bSideWidth / 2, 90), end: pt(bSideWidth / 2, backLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(bSideWidth - 10, backLength), angleRad: 0, lengthMm: 6, label: 'Cintura Costado', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 5. FALDA DELANTERA SIRENA DE GALA
    // --------------------------------------------------------------------------
    const kneeLevel = 520;
    const fKneeWidth = qHip * 0.85;
    const fHemGownWidth = qHip * 1.6;
    const fSkirtCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [qWaist, 0] },
        {
            type: 'C',
            params: [
                qHip + 15, 80,
                qHip + 10, 200,
                fKneeWidth, kneeLevel,
            ],
        },
        {
            type: 'C',
            params: [
                fKneeWidth - 10, kneeLevel + 180,
                fHemGownWidth * 0.8, gownLength - 100,
                fHemGownWidth, gownLength,
            ],
        },
        { type: 'L', params: [0, gownLength] },
        { type: 'Z', params: [] },
    ];
    const fSkirtPath = createPath(fSkirtCommands, true);
    const skirtFrontPiece = createPiece(
        'piece_evening_gown_skirt_front',
        'Vestido de Gala — Falda Delantera Silueta Sirena',
        'GALA_FALDA_DELANTERA',
        fSkirtPath,
        seamMm,
        { start: pt(0, 50), end: pt(0, gownLength - 50), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: pt(fKneeWidth, kneeLevel), angleRad: 0, lengthMm: 6, label: 'Nivel Rodilla', type: 'single' }],
            quantityToCut: 1,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 6. FALDA ESPALDA DE GALA CON COLA PARAMÉTRICA (TRAIN)
    // --------------------------------------------------------------------------
    const totalBackLength = gownLength + trainLengthMm;
    const bHemGownWidth = qHip * 1.9;
    const bSkirtCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [qWaist + 10, 0] },
        {
            type: 'C',
            params: [
                qHip + 20, 80,
                qHip + 15, 200,
                fKneeWidth + 10, kneeLevel,
            ],
        },
        {
            type: 'C',
            params: [
                fKneeWidth, kneeLevel + 180,
                bHemGownWidth * 0.8, gownLength,
                bHemGownWidth, gownLength + 50,
            ],
        },
        {
            type: 'C',
            params: [
                bHemGownWidth * 0.6, totalBackLength,
                bHemGownWidth * 0.2, totalBackLength,
                0, totalBackLength,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const bSkirtPath = createPath(bSkirtCommands, true);
    const skirtBackPiece = createPiece(
        'piece_evening_gown_skirt_back_train',
        'Vestido de Gala — Falda Espalda con Cola de Alta Ocasión',
        'GALA_FALDA_ESPALDA_COLA',
        bSkirtPath,
        seamMm,
        { start: pt(30, 60), end: pt(30, gownLength - 60), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(fKneeWidth + 10, kneeLevel), angleRad: 0, lengthMm: 6, label: 'Nivel Rodilla', type: 'double' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 7. GODET DE AMPLITUD INFERIOR ACAMPANADO
    // --------------------------------------------------------------------------
    const godetHeight = gownLength - kneeLevel;
    const godetBase = 380;
    const godetCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [godetBase / 2, godetHeight] },
        {
            type: 'C',
            params: [
                godetBase * 0.25, godetHeight + 15,
                -godetBase * 0.25, godetHeight + 15,
                -godetBase / 2, godetHeight,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const godetPath = createPath(godetCommands, true);
    const godetPiece = createPiece(
        'piece_evening_gown_godet',
        'Vestido de Gala — Godet Triangular Acampanado',
        'GALA_GODET_AMPLITUD',
        godetPath,
        seamMm,
        { start: pt(0, 30), end: pt(0, godetHeight - 20), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(0, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Vértice Godet', type: 'single' }],
            quantityToCut: 4,
        }
    );

    const pieces: PatternPiece[] = [
        bodiceFrontCenterPiece,
        bodiceFrontSidePiece,
        bodiceBackCenterPiece,
        bodiceBackSidePiece,
        skirtFrontPiece,
        skirtBackPiece,
        godetPiece,
    ];

    calculatedValues.eveningGownTotalLengthMm = frontLength + gownLength;
    calculatedValues.trainLengthMm = trainLengthMm;
    calculatedValues.godetHeightMm = godetHeight;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
