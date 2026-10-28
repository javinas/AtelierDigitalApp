// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: GEOMETRÍA DE MANGA REUTILIZABLE (C14)
// Archivo: src/engine/pattern/components/sleeveGeometry.ts
// ==============================================================================
// Provee funciones matemáticas puras para el trazado de copas de manga sastre
// y camiseras con control riguroso de embebido perimetral.
// ==============================================================================

import {
    calculateBoundingBox,
    createPath,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { Grainline, Notch, PathCommand, PatternPiece } from '../geometry/types';

export interface ShirtSleeveDraftInput {
    armholePerimeterMm: number;      // Perímetro de sisa ensamblada (delantero + espalda/canesú)
    armLengthMm: number;             // Largo de brazo total
    bicepsCircumferenceMm: number;   // Contorno de bíceps
    wristCircumferenceMm: number;    // Contorno de muñeca
    bicepsEaseMm?: number;           // Holgura de bíceps (default 65 mm)
    cuffHeightMm?: number;           // Altura del puño (default 65 mm)
    seamAllowanceMm?: number;        // Margen de costura (default 10 mm)
    isRightHand?: boolean;           // Lado
}

export interface ShirtSleeveDraftOutput {
    sleevePiece: PatternPiece;
    capLengthMm: number;
    armholePerimeterMm: number;
    capEaseMm: number;
    netSleeveLengthMm: number;
    warnings: string[];
}

export function draftShirtSleeve(input: ShirtSleeveDraftInput): ShirtSleeveDraftOutput {
    const warnings: string[] = [];
    const seamAllowanceMm = input.seamAllowanceMm ?? 10;
    const armholePerimeter = roundTo(Math.max(320, input.armholePerimeterMm), 2);
    const cuffHeight = input.cuffHeightMm ?? 65;
    // Longitud neta de la manga de camisa: largo de brazo menos puño + 15 mm de fuelle para movimiento
    const netLength = Math.max(400, (input.armLengthMm || 580) - cuffHeight + 15);
    const bicepsCirc = Math.max(220, input.bicepsCircumferenceMm || 280);
    const bicepsEase = input.bicepsEaseMm ?? 65;

    // Altura de copa camisera más confortable y plana (Perímetro / 4.0 a 4.2)
    // Esto proporciona mayor rango de elevación del brazo que la copa sastre rígida
    const capHeightMm = roundTo(armholePerimeter / 4.0, 2);

    // Diagonales de copa para calcular el ancho de bíceps mínimo con embebido suave (12-16 mm)
    const targetDiagonal = armholePerimeter / 2.0 + 3.0;
    const minHalfBiceps = Math.sqrt(
        Math.max(0, targetDiagonal * targetDiagonal - capHeightMm * capHeightMm)
    );
    const halfBiceps = Math.max((bicepsCirc + bicepsEase) / 2.0, minHalfBiceps);
    const halfWrist = ((input.wristCircumferenceMm || 160) + 70) / 2.0; // Ancho con holgura para pliegues

    const sideSuffix = input.isRightHand ? 'DER' : 'IZQ';
    const sideName = input.isRightHand ? 'Derecha' : 'Izquierda';

    const capTop = pt(0, 0);
    const frontUnderarm = pt(-halfBiceps, capHeightMm);
    const backUnderarm = pt(halfBiceps, capHeightMm);
    const frontWrist = pt(-halfWrist, netLength);
    const backWrist = pt(halfWrist, netLength);

    // Curvas Bézier de la copa
    const frontCapCommands: PathCommand[] = [
        { type: 'M', params: [capTop.x, capTop.y] },
        {
            type: 'C',
            params: [
                -halfBiceps * 0.40, capHeightMm * 0.18,
                -halfBiceps * 0.85, capHeightMm * 0.75,
                frontUnderarm.x, frontUnderarm.y,
            ],
        },
    ];

    const backCapCommands: PathCommand[] = [
        { type: 'M', params: [backUnderarm.x, backUnderarm.y] },
        {
            type: 'C',
            params: [
                halfBiceps * 0.85, capHeightMm * 0.70,
                halfBiceps * 0.42, capHeightMm * 0.15,
                capTop.x, capTop.y,
            ],
        },
    ];

    const frontCapPath = createPath(frontCapCommands, false);
    const backCapPath = createPath(backCapCommands, false);
    const totalCapLengthMm = roundTo(frontCapPath.approxLengthMm + backCapPath.approxLengthMm, 2);
    const capEaseMm = roundTo(totalCapLengthMm - armholePerimeter, 2);

    if (capEaseMm < 8.0) {
        warnings.push(`Embebido de copa camisera ajustado (${capEaseMm} mm respecto a sisa de ${armholePerimeter} mm).`);
    } else if (capEaseMm > 22.0) {
        warnings.push(`Embebido de copa camisera holgado (${capEaseMm} mm respecto a sisa de ${armholePerimeter} mm).`);
    }

    // Contorno completo de costura de la manga camisera
    const sleeveSeamCommands: PathCommand[] = [
        { type: 'M', params: [capTop.x, capTop.y] },
        // Copa delantera
        {
            type: 'C',
            params: [
                -halfBiceps * 0.40, capHeightMm * 0.18,
                -halfBiceps * 0.85, capHeightMm * 0.75,
                frontUnderarm.x, frontUnderarm.y,
            ],
        },
        // Costura interior delantera
        { type: 'L', params: [frontWrist.x, frontWrist.y] },
        // Bajo de manga plano/ligeramente cóncavo para recibir el puño cerrado
        {
            type: 'C',
            params: [
                -halfWrist * 0.35, netLength + 2,
                halfWrist * 0.35, netLength + 2,
                backWrist.x, backWrist.y,
            ],
        },
        // Costura interior espalda
        { type: 'L', params: [backUnderarm.x, backUnderarm.y] },
        // Copa espalda
        {
            type: 'C',
            params: [
                halfBiceps * 0.85, capHeightMm * 0.70,
                halfBiceps * 0.42, capHeightMm * 0.15,
                capTop.x, capTop.y,
            ],
        },
        { type: 'Z', params: [] },
    ];

    const seamPath = createPath(sleeveSeamCommands, true);
    const cutPath = generateSeamAllowanceOffset(seamPath, seamAllowanceMm, true);

    // Piquete de tajo de sardineta a 1/4 del ancho de espalda en el bajo
    const slitX = halfWrist * 0.5;
    const slitNotch: Notch = {
        position: pt(slitX, netLength),
        angleRad: -Math.PI / 2,
        lengthMm: 120, // Longitud del corte de sardineta
        label: 'Abertura vertical para sardineta de manga (120 mm)',
        type: 'single',
    };

    const grainline: Grainline = {
        start: pt(0, capHeightMm + 20),
        end: pt(0, netLength - 40),
        isFold: false,
        label: 'HILO DE LA TELA — APLOMO DE MANGA',
    };

    const sleevePiece: PatternPiece = {
        id: `piece_shirt_sleeve_${sideSuffix.toLowerCase()}`,
        name: `Manga Camisera ${sideName}`,
        code: `MANGA_${sideSuffix}`,
        quantityToCut: 1,
        cutOnFold: false,
        fabricType: 'Tela principal',
        outlineSeam: seamPath,
        outlineCut: cutPath,
        seamAllowanceMm,
        grainline,
        notches: [
            {
                position: capTop,
                angleRad: -Math.PI / 2,
                lengthMm: 6,
                label: 'Piquete coronilla con costura de hombro/canesú',
                type: 'single',
            },
            slitNotch,
        ],
        darts: [],
        labels: [
            {
                text: `MANGA CAMISERA ${sideSuffix} — CORTAR 1`,
                position: pt(-halfBiceps * 0.25, netLength * 0.45),
                fontSizeMm: 11,
            },
        ],
        boundingBox: calculateBoundingBox([cutPath]),
    };

    return {
        sleevePiece,
        capLengthMm: totalCapLengthMm,
        armholePerimeterMm: armholePerimeter,
        capEaseMm,
        netSleeveLengthMm: netLength,
        warnings,
    };
}
