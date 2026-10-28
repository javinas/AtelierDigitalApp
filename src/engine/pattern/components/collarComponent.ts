// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: CUELLO CAMISERO DE ALTA COSTURA (C14)
// Archivo: src/engine/pattern/components/collarComponent.ts
// ==============================================================================
// Genera las 2 piezas del cuello camisero sastre:
// 1. Pie de Cuello Anatómico (SHIRT_COLLAR_STAND / Tirilla)
// 2. Pala de Cuello (SHIRT_COLLAR_FALL / Vuelo con puntas de diseño)
// ==============================================================================

import {
    calculateBoundingBox,
    createPath,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';

export interface CollarComponentInput {
    necklinePerimeterHalfMm: number; // Semiperímetro real del escote delantero + espalda/canesú
    standHeightMm?: number;          // Altura del pie de cuello (default 30 mm)
    fallHeightMm?: number;           // Altura de la pala (default 42 mm)
    pointSpreadMm?: number;          // Extensión de puntas (default 15 mm)
    overlapMm?: number;              // Cruce de botón en pie de cuello (default 15 mm)
    seamAllowanceMm?: number;        // Margen de costura (default 10 mm)
}

export interface CollarComponentOutput {
    standPiece: PatternPiece;
    fallPiece: PatternPiece;
    standLengthMm: number;
    fallLengthMm: number;
    warnings: string[];
}

export function generateCollarComponent(input: CollarComponentInput): CollarComponentOutput {
    const warnings: string[] = [];
    const seamAllowanceMm = input.seamAllowanceMm ?? 10;
    const standHeight = input.standHeightMm ?? 30;
    const fallHeight = input.fallHeightMm ?? 42;
    const overlap = input.overlapMm ?? 15;
    const pointSpread = input.pointSpreadMm ?? 15;

    // Longitud base del escote (medio cuello)
    const halfNeck = Math.max(140, input.necklinePerimeterHalfMm);
    const totalStandHalfLength = halfNeck + overlap;

    // --------------------------------------------------------------------------
    // 1. PIE DE CUELLO (SHIRT_COLLAR_STAND)
    // Se dibuja el semi-cuello (centro espalda en x = 0, punta delantera a la derecha)
    // --------------------------------------------------------------------------
    // Puntos de la base (unión al cuerpo):
    // p0: (0, standHeight) - Centro espalda base
    // p1: (halfNeck * 0.6, standHeight) - Comienzo de la curvatura
    // p2: (totalStandHalfLength - 10, standHeight - 8) - Elevación anatómica
    // p3: (totalStandHalfLength, standHeight - 12) - Extremo delantero del cruce
    // p4: (totalStandHalfLength, -12) - Extremo superior del cruce
    // p5: (halfNeck, 0) - Punto de caída superior
    // p6: (0, 0) - Centro espalda superior

    const standCommands: PathCommand[] = [
        { type: 'M', params: [0, standHeight] },
        {
            type: 'C',
            params: [
                halfNeck * 0.5, standHeight,
                halfNeck * 0.85, standHeight - 6,
                totalStandHalfLength, standHeight - 10,
            ],
        },
        // Extremo frontal redondeado / chaflán de cruce
        {
            type: 'C',
            params: [
                totalStandHalfLength + 6, standHeight - 14,
                totalStandHalfLength + 6, standHeight - standHeight - 2,
                totalStandHalfLength - 4, standHeight - standHeight - 6,
            ],
        },
        // Línea superior de unión a la pala
        {
            type: 'C',
            params: [
                halfNeck * 0.85, -2,
                halfNeck * 0.5, 0,
                0, 0,
            ],
        },
        // Cierre por centro espalda (al doblez)
        { type: 'L', params: [0, standHeight] },
        { type: 'Z', params: [] },
    ];

    const standSeamPath = createPath(standCommands, true);
    const standCutPath = generateSeamAllowanceOffset(standSeamPath, seamAllowanceMm, true);

    const standGrainline: Grainline = {
        start: pt(20, 5),
        end: pt(totalStandHalfLength - 20, 5),
        isFold: false,
        label: 'HILO DE LA TELA — AL HILO LONGITUDINAL',
    };

    const standNotches: Notch[] = [
        {
            position: pt(0, standHeight / 2),
            angleRad: Math.PI,
            lengthMm: 5,
            label: 'Centro espalda pie de cuello',
            type: 'single',
        },
        {
            position: pt(halfNeck, standHeight - 6),
            angleRad: Math.PI / 2,
            lengthMm: 5,
            label: 'Empalme costura hombro / centro delantero',
            type: 'single',
        },
    ];

    const standPiece: PatternPiece = {
        id: 'piece_shirt_collar_stand',
        name: 'Pie de Cuello Anatómico',
        code: 'CUELLO_PIE',
        quantityToCut: 2,
        cutOnFold: true,
        fabricType: 'Tela principal / Entretela',
        outlineSeam: standSeamPath,
        outlineCut: standCutPath,
        seamAllowanceMm,
        grainline: standGrainline,
        notches: standNotches,
        darts: [],
        labels: [
            {
                text: 'PIE DE CUELLO (TIRILLA) — CORTAR 2 AL DOBLEZ + 1 ENTRETELA',
                position: pt(halfNeck * 0.35, standHeight * 0.5),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([standCutPath]),
    };

    // --------------------------------------------------------------------------
    // 2. PALA DE CUELLO (SHIRT_COLLAR_FALL)
    // --------------------------------------------------------------------------
    // Se une al pie a lo largo de halfNeck (sin el cruce).
    // p0: (0, 0) - Centro espalda unión al pie
    // p1: (halfNeck, 0) - Unión lateral
    // p2: (halfNeck + pointSpread, -fallHeight - 8) - Punta del cuello
    // p3: (0, -fallHeight) - Centro espalda exterior
    const fallCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        {
            type: 'C',
            params: [
                halfNeck * 0.4, 2,
                halfNeck * 0.8, -2,
                halfNeck, -6,
            ],
        },
        // Línea de punta
        { type: 'L', params: [halfNeck + pointSpread, -fallHeight - 12] },
        // Canto exterior visible del cuello
        {
            type: 'C',
            params: [
                halfNeck * 0.7, -fallHeight - 4,
                halfNeck * 0.3, -fallHeight,
                0, -fallHeight,
            ],
        },
        // Cierre por centro espalda (al doblez)
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];

    const fallSeamPath = createPath(fallCommands, true);
    const fallCutPath = generateSeamAllowanceOffset(fallSeamPath, seamAllowanceMm, true);

    const fallGrainline: Grainline = {
        start: pt(20, -fallHeight * 0.5),
        end: pt(halfNeck - 10, -fallHeight * 0.5),
        isFold: false,
        label: 'HILO DE LA TELA',
    };

    const fallPiece: PatternPiece = {
        id: 'piece_shirt_collar_fall',
        name: 'Pala de Cuello Camisero',
        code: 'CUELLO_PALA',
        quantityToCut: 2,
        cutOnFold: true,
        fabricType: 'Tela principal / Entretela',
        outlineSeam: fallSeamPath,
        outlineCut: fallCutPath,
        seamAllowanceMm,
        grainline: fallGrainline,
        notches: [
            {
                position: pt(0, -fallHeight / 2),
                angleRad: Math.PI,
                lengthMm: 5,
                label: 'Centro espalda pala de cuello',
                type: 'single',
            },
        ],
        darts: [],
        labels: [
            {
                text: 'PALA DE CUELLO — CORTAR 2 AL DOBLEZ + 1 ENTRETELA',
                position: pt(halfNeck * 0.35, -fallHeight * 0.5),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([fallCutPath]),
    };

    return {
        standPiece,
        fallPiece,
        standLengthMm: roundTo(totalStandHalfLength * 2, 2),
        fallLengthMm: roundTo(halfNeck * 2, 2),
        warnings,
    };
}
