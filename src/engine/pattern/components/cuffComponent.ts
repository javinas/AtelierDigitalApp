// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: PUÑO CAMISERO DE ALTA COSTURA (C14)
// Archivo: src/engine/pattern/components/cuffComponent.ts
// ==============================================================================
// Genera el puño camisero sastre estructurado con solape de cruce de botón
// y esquinas en chaflán a 45 grados.
// ==============================================================================

import {
    calculateBoundingBox,
    createPath,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';

export interface CuffComponentInput {
    wristCircumferenceMm: number;    // Contorno neto de muñeca (mm)
    wristEaseMm?: number;            // Holgura de puño (default 60 mm)
    cuffHeightMm?: number;           // Altura terminada del puño (default 65 mm)
    overlapMm?: number;              // Cruce de botón (default 20 mm)
    cornerChamferMm?: number;        // Tamaño del chaflán a 45° (default 12 mm)
    seamAllowanceMm?: number;        // Margen de costura (default 10 mm)
    isRightHand?: boolean;           // Mano izquierda o derecha
}

export interface CuffComponentOutput {
    cuffPiece: PatternPiece;
    totalWidthMm: number;
    heightMm: number;
    warnings: string[];
}

export function generateCuffComponent(input: CuffComponentInput): CuffComponentOutput {
    const warnings: string[] = [];
    const seamAllowanceMm = input.seamAllowanceMm ?? 10;
    const wristCirc = Math.max(120, input.wristCircumferenceMm);
    const ease = input.wristEaseMm ?? 60;
    const height = input.cuffHeightMm ?? 65;
    const overlap = input.overlapMm ?? 20;
    const chamfer = Math.min(18, input.cornerChamferMm ?? 12);

    const totalWidth = roundTo(wristCirc + ease + overlap, 2);
    const sideSuffix = input.isRightHand ? 'DER' : 'IZQ';
    const sideName = input.isRightHand ? 'Derecho' : 'Izquierdo';

    // Geometría rectangular con chaflán superior en ambas esquinas
    // p0: (0, height) - esquina inferior izquierda (unión a manga)
    // p1: (totalWidth, height) - esquina inferior derecha (unión a manga)
    // p2: (totalWidth, chamfer) - inicio chaflán derecho
    // p3: (totalWidth - chamfer, 0) - fin chaflán derecho
    // p4: (chamfer, 0) - fin chaflán izquierdo
    // p5: (0, chamfer) - inicio chaflán izquierdo
    const commands: PathCommand[] = [
        { type: 'M', params: [0, height] },
        { type: 'L', params: [totalWidth, height] },
        { type: 'L', params: [totalWidth, chamfer] },
        { type: 'L', params: [totalWidth - chamfer, 0] },
        { type: 'L', params: [chamfer, 0] },
        { type: 'L', params: [0, chamfer] },
        { type: 'L', params: [0, height] },
        { type: 'Z', params: [] },
    ];

    const seamPath = createPath(commands, true);
    const cutPath = generateSeamAllowanceOffset(seamPath, seamAllowanceMm, true);

    const grainline: Grainline = {
        start: pt(25, height / 2),
        end: pt(totalWidth - 25, height / 2),
        isFold: false,
        label: 'HILO DE LA TELA — PARALELO A LA MUÑECA',
    };

    const notches: Notch[] = [
        {
            position: pt(totalWidth / 2, height),
            angleRad: Math.PI / 2,
            lengthMm: 5,
            label: 'Centro puño unión con manga',
            type: 'single',
        },
        {
            position: pt(overlap, height),
            angleRad: Math.PI / 2,
            lengthMm: 5,
            label: 'Línea de solape de cruce de botón',
            type: 'single',
        },
    ];

    const cuffPiece: PatternPiece = {
        id: `piece_shirt_cuff_${sideSuffix.toLowerCase()}`,
        name: `Puño Camisero ${sideName}`,
        code: `PUNO_${sideSuffix}`,
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela principal / Entretela',
        outlineSeam: seamPath,
        outlineCut: cutPath,
        seamAllowanceMm,
        grainline,
        notches,
        darts: [],
        labels: [
            {
                text: `PUÑO CAMISERO ${sideSuffix} — CORTAR 2 TELA + 1 ENTRETELA`,
                position: pt(totalWidth * 0.25, height * 0.55),
                fontSizeMm: 9,
            },
        ],
        boundingBox: calculateBoundingBox([cutPath]),
    };

    return {
        cuffPiece,
        totalWidthMm: totalWidth,
        heightMm: height,
        warnings,
    };
}
