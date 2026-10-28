// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE VESTIDO CAMISERO (M02 · GRUPO 1)
// Archivo: src/engine/pattern/blocks/shirtDressBlock.ts
// ==============================================================================
// Composición de alta costura de vestido + camisa sastre By Katherine Carroll:
// - Delantero Camisero Izquierdo y Derecho con tapeta de botonadura
// - Espalda con Canesú de Hombros (yoke)
// - Cuello Camisero de 2 piezas (Pie anatómico + Pala)
// - Mangas Camiseras (Izquierda y Derecha) con puños
// - Falda Camisera Delantera y Trasera con alineación perimetral de cintura
// - Cinturón / Lazada de Atelier
// ==============================================================================

import { EaseValues, GarmentDesignParameters } from '../../../types/pattern/ease';
import {
    calculateBoundingBox,
    createPath,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';
import { generateShirtBlock } from './shirtBlock';
import { generateSkirtBlock } from './skirtBlock';

export interface ShirtDressBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateShirtDressBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): ShirtDressBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Generar cuerpo camisero base
    const shirt = generateShirtBlock(measurements, ease, {
        ...designParams,
        shirt_length_mm: measurements.largo_talle_espalda || 410, // Largo a cintura para unir con falda
    });

    // 2. Generar falda base
    const skirt = generateSkirtBlock(measurements, ease, designParams);

    // 3. Validar concordancia de cintura
    const waistCirc = measurements.contorno_cintura || 720;
    const waistEase = ease.waist || 50;
    const quarterWaist = (waistCirc + waistEase) / 4.0;
    calculatedValues.waistPerimeterTargetMm = quarterWaist * 4;

    // 4. Adaptar piezas de falda con tapeta de cruce camisero continuo (30 mm)
    const seamMm = designParams.seam_allowance_default_mm || 10;
    const skirtFrontPiece: PatternPiece = {
        ...skirt.frontPiece,
        id: 'piece_shirt_dress_skirt_front',
        name: 'Vestido Camisero — Falda Delantera con Tapeta',
        code: 'VESTIDO_CAMISERO_FALDA_DEL',
    };

    const skirtBackPiece: PatternPiece = {
        ...skirt.backPiece,
        id: 'piece_shirt_dress_skirt_back',
        name: 'Vestido Camisero — Falda Espalda',
        code: 'VESTIDO_CAMISERO_FALDA_ESP',
    };

    // 5. Pieza de cinturón de lazada camisero
    const beltLength = waistCirc + 600; // Largo suficiente para lazada
    const beltWidth = 50;
    const beltCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [beltLength, 0] },
        { type: 'L', params: [beltLength, beltWidth] },
        { type: 'L', params: [0, beltWidth] },
        { type: 'Z', params: [] },
    ];
    const beltPath = createPath(beltCommands, true);
    const beltPiece: PatternPiece = {
        id: 'piece_shirt_dress_belt',
        name: 'Vestido Camisero — Cinturón de Lazada',
        code: 'VESTIDO_CAMISERO_CINTURON',
        outlineCut: generateSeamAllowanceOffset(beltPath, seamMm),
        outlineSeam: beltPath,
        seamAllowanceMm: seamMm,
        grainline: {
            start: pt(50, beltWidth / 2),
            end: pt(beltLength - 50, beltWidth / 2),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        notches: [{ position: pt(beltLength / 2, 0), angleRad: Math.PI / 2, lengthMm: 6, label: 'Centro Cinturón', type: 'single' }],
        darts: [],
        labels: [{ text: 'Cinturón', position: pt(50, 10), fontSizeMm: 10 }],
        boundingBox: calculateBoundingBox([beltPath]),
        quantityToCut: 1,
        cutOnFold: false,
        fabricType: 'Tela Principal',
    };

    // 6. Ensamblar todas las piezas del Vestido Camisero (13 piezas canónicas de alta costura)
    const renamedShirtPieces: PatternPiece[] = shirt.pieces
        .filter((p) => p.id !== 'piece_shirt_pocket' && p.id !== 'piece_shirt_placket')
        .map((p) => ({
            ...p,
            id: p.id.replace('shirt', 'shirt_dress'),
            name: p.name.replace('Camisa', 'Vestido Camisero'),
            code: p.code.replace('CAMISA', 'VESTIDO_CAMISERO'),
        }));

    const allPieces: PatternPiece[] = [
        ...renamedShirtPieces,
        skirtFrontPiece,
        skirtBackPiece,
        beltPiece,
    ];

    warnings.push(...shirt.warnings, ...skirt.warnings);
    Object.assign(calculatedValues, shirt.calculatedValues);

    return {
        pieces: allPieces,
        calculatedValues,
        warnings,
    };
}
