// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: PANTALÓN CARGO / SAFARI (M02.12)
// Archivo: src/engine/pattern/blocks/cargoPantsBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Pantalón Cargo / Safari de Alta Costura:
// 1. Delantero Cargo con holgura safari y marcas de aplomo
// 2. Espalda Cargo con tiro anatómico reforzado
// 3. Bolsillo Lateral Fuelle Cargo 3D con pliegue de expansión
// 4. Cartera / Tapa de Bolsillo Cargo con terminación en pico
// 5. Bolsillo Safari Trasero de Parche
// 6. Cartera de Bolsillo Safari Trasero
// 7. Pretina Cargo Reforzada con Cruce
// Todas las magnitudes estrictamente en milímetros (mm).
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
import { generatePantsBlock } from './pantsBlock';

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

export interface CargoPantsBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateCargoPantsBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): CargoPantsBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // Holguras safari/cargo generosas
    const cargoEase: EaseValues = {
        ...ease,
        waist: (ease.waist || 20) + 10,
        hip: (ease.hip || 40) + 20,
        crotch: (ease.crotch || 25) + 10,
    };

    const seamMm = designParams.seam_allowance_default_mm || 10;
    const waistCirc = measurements.contorno_cintura || 720;
    const outseam = measurements.largo_exterior_pierna || 1020;

    // 1. Generar base de pantalón con desahogo safari
    const basePants = generatePantsBlock(measurements, cargoEase, {
        ...designParams,
        pants_hem_width_mm: (designParams.pants_hem_width_mm || 360) + 40,
    });
    warnings.push(...basePants.warnings);

    // Renombrar y enriquecer piezas base
    const frontPiece: PatternPiece = {
        ...basePants.frontPiece,
        id: 'piece_cargo_pants_front',
        name: 'Pantalón Cargo — Delantero con Ubicación de Fuelle',
        code: 'CARGO_DELANTERO',
    };

    const backPiece: PatternPiece = {
        ...basePants.backPiece,
        id: 'piece_cargo_pants_back',
        name: 'Pantalón Cargo — Espalda con Ubicación Safari',
        code: 'CARGO_ESPALDA',
    };

    // --------------------------------------------------------------------------
    // 3. BOLSILLO LATERAL FUELLE CARGO 3D (BELLOWS CARGO POCKET)
    // --------------------------------------------------------------------------
    const pWidth = 190;
    const pHeight = 220;
    const bellowsDepth = 35;

    const totalBellowsWidth = pWidth + bellowsDepth * 2;
    const totalBellowsHeight = pHeight + bellowsDepth;

    const bellowsCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [totalBellowsWidth, 0] },
        { type: 'L', params: [totalBellowsWidth, totalBellowsHeight] },
        { type: 'L', params: [0, totalBellowsHeight] },
        { type: 'Z', params: [] },
    ];
    const bellowsPath = createPath(bellowsCommands, true);
    const cargoPocketPiece = createPiece(
        'piece_cargo_pocket_bellows',
        'Pantalón Cargo — Bolsillo Lateral Fuelle Tridimensional 3D',
        'CARGO_BOLSILLO_FUELLE',
        bellowsPath,
        seamMm,
        {
            start: pt(totalBellowsWidth / 2, 20),
            end: pt(totalBellowsWidth / 2, totalBellowsHeight - 20),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        {
            notches: [
                { position: pt(bellowsDepth, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Línea Fuelle Izq', type: 'single' },
                { position: pt(totalBellowsWidth - bellowsDepth, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Línea Fuelle Der', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 4. CARTERA / TAPA DE BOLSILLO CARGO CON PICO
    // --------------------------------------------------------------------------
    const flapWidth = pWidth + 10;
    const flapHeight = 65;
    const flapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [flapWidth, 0] },
        { type: 'L', params: [flapWidth, flapHeight - 20] },
        { type: 'L', params: [flapWidth / 2, flapHeight] },
        { type: 'L', params: [0, flapHeight - 20] },
        { type: 'Z', params: [] },
    ];
    const flapPath = createPath(flapCommands, true);
    const cargoFlapPiece = createPiece(
        'piece_cargo_pocket_flap',
        'Pantalón Cargo — Cartera con Terminación en Pico',
        'CARGO_TAPA_BOLSILLO',
        flapPath,
        seamMm,
        {
            start: pt(20, flapHeight / 2),
            end: pt(flapWidth - 20, flapHeight / 2),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        {
            notches: [{ position: pt(flapWidth / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Tapa', type: 'single' }],
            quantityToCut: 4,
        }
    );

    // --------------------------------------------------------------------------
    // 5. BOLSILLO SAFARI TRASERO DE PARCHE
    // --------------------------------------------------------------------------
    const safariWidth = 150;
    const safariHeight = 165;
    const safariCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [safariWidth, 0] },
        { type: 'L', params: [safariWidth, safariHeight - 15] },
        { type: 'L', params: [safariWidth - 15, safariHeight] },
        { type: 'L', params: [15, safariHeight] },
        { type: 'L', params: [0, safariHeight - 15] },
        { type: 'Z', params: [] },
    ];
    const safariPath = createPath(safariCommands, true);
    const safariPocketPiece = createPiece(
        'piece_safari_back_pocket',
        'Pantalón Cargo — Bolsillo Safari Trasero de Parche',
        'CARGO_BOLSILLO_TRASERO',
        safariPath,
        seamMm,
        {
            start: pt(safariWidth / 2, 20),
            end: pt(safariWidth / 2, safariHeight - 20),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 6. CARTERA DE BOLSILLO SAFARI TRASERO
    // --------------------------------------------------------------------------
    const safariFlapWidth = safariWidth + 8;
    const safariFlapHeight = 55;
    const safariFlapCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [safariFlapWidth, 0] },
        { type: 'L', params: [safariFlapWidth, safariFlapHeight - 15] },
        { type: 'L', params: [safariFlapWidth / 2, safariFlapHeight] },
        { type: 'L', params: [0, safariFlapHeight - 15] },
        { type: 'Z', params: [] },
    ];
    const safariFlapPath = createPath(safariFlapCommands, true);
    const safariFlapPiece = createPiece(
        'piece_safari_pocket_flap',
        'Pantalón Cargo — Cartera de Bolsillo Trasero',
        'CARGO_TAPA_TRASERA',
        safariFlapPath,
        seamMm,
        {
            start: pt(20, safariFlapHeight / 2),
            end: pt(safariFlapWidth - 20, safariFlapHeight / 2),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        { quantityToCut: 4 }
    );

    // --------------------------------------------------------------------------
    // 7. PRETINA CARGO REFORZADA CON CRUCE
    // --------------------------------------------------------------------------
    const wbLength = waistCirc + cargoEase.waist + 70;
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
        'piece_cargo_waistband',
        'Pantalón Cargo — Pretina Reforzada con Trabillas',
        'CARGO_PRETINA',
        wbPath,
        seamMm,
        {
            start: pt(40, wbHeight / 2),
            end: pt(wbLength - 40, wbHeight / 2),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        {
            notches: [
                { position: pt(wbLength / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Izq', type: 'single' },
                { position: pt(wbLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Espalda', type: 'single' },
                { position: pt((3 * wbLength) / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Der', type: 'single' },
            ],
            quantityToCut: 2,
        }
    );

    const pieces: PatternPiece[] = [
        frontPiece,
        backPiece,
        cargoPocketPiece,
        cargoFlapPiece,
        safariPocketPiece,
        safariFlapPiece,
        waistbandPiece,
    ];

    calculatedValues.cargoPocketVolumeMm3 = pWidth * pHeight * bellowsDepth;
    calculatedValues.waistbandLengthMm = wbLength;
    calculatedValues.cargoOutseamLengthMm = outseam;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
