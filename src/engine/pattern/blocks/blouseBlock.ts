// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE BLUSA FLUIDA (M02.03 / M02.09)
// Archivo: src/engine/pattern/blocks/blouseBlock.ts
// ==============================================================================
// Derivación fluida del corpiño base con desahogo amplio, caída sobre cadera
// y sisa confortable.
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
import { generateSleeveBlock } from './sleeveBlock';

export interface BlouseBlockOutput {
    pieces: PatternPiece[];
    warnings: string[];
}

export function generateBlouseBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): BlouseBlockOutput {
    const warnings: string[] = [];

    // Desahogo más holgado para blusas fluidas
    const blouseEase: EaseValues = {
        bust: Math.max(ease.bust || 45, 60),
        waist: Math.max(ease.waist || 25, 55),
        hip: Math.max(ease.hip || 45, 60),
        biceps: Math.max(ease.biceps || 40, 50),
        crotch: 0,
    };

    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const backLength = measurements.largo_talle_espalda || 410;
    const frontLength = measurements.largo_talle_delantero || 440;
    const blouseLength = measurements.largo_blusa || backLength + 180;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;

    const targetBustQuarter = (bustCirc + blouseEase.bust) / 4.0;
    const targetHemQuarter = targetBustQuarter + 25; // Ligera caída evasé en bajo

    // Delantero de Blusa
    const fCenterNeck = pt(0, 0);
    const fCenterHem = pt(0, blouseLength);
    const fSideUnderarm = pt(targetBustQuarter, backLength / 2.0 + 20);
    const fSideHem = pt(targetHemQuarter, blouseLength);
    const fShoulderTip = pt(180, 40);

    const fCommands: PathCommand[] = [
        { type: 'M', params: [fCenterHem.x, fCenterHem.y] },
        { type: 'L', params: [fCenterNeck.x, fCenterNeck.y] },
        {
            type: 'C',
            params: [
                30, 10,
                55, 30,
                70, 0,
            ],
        },
        { type: 'L', params: [fShoulderTip.x, fShoulderTip.y] },
        {
            type: 'C',
            params: [
                targetBustQuarter * 0.7, 90,
                targetBustQuarter * 0.85, fSideUnderarm.y - 20,
                fSideUnderarm.x, fSideUnderarm.y,
            ],
        },
        { type: 'L', params: [fSideHem.x, fSideHem.y] },
        { type: 'L', params: [fCenterHem.x, fCenterHem.y] },
        { type: 'Z', params: [] },
    ];

    const fSeamPath = createPath(fCommands, true);
    const fCutPath = generateSeamAllowanceOffset(fSeamPath, seamAllowanceMm, true);

    const fGrainline: Grainline = {
        start: pt(25, 50),
        end: pt(25, blouseLength - 40),
        isFold: true,
        label: 'CENTRO DELANTERO — AL DOBLEZ',
    };

    const frontPiece: PatternPiece = {
        id: 'piece_blouse_front',
        name: 'Blusa Delantera',
        code: 'BLUSA_DEL',
        quantityToCut: 1,
        cutOnFold: true,
        fabricType: 'Seda / Gasa',
        outlineSeam: fSeamPath,
        outlineCut: fCutPath,
        seamAllowanceMm,
        grainline: fGrainline,
        notches: [],
        darts: [],
        labels: [
            {
                text: 'BLUSA FLUIDA DELANTERA — CORTAR 1 AL DOBLEZ',
                position: pt(targetBustQuarter * 0.35, blouseLength * 0.45),
                fontSizeMm: 12,
            },
        ],
        boundingBox: calculateBoundingBox([fCutPath]),
    };

    // Espalda de Blusa
    const bCommands: PathCommand[] = [
        { type: 'M', params: [fCenterHem.x, fCenterHem.y] },
        { type: 'L', params: [0, 0] },
        {
            type: 'C',
            params: [
                25, -5,
                50, -15,
                70, -20,
            ],
        },
        { type: 'L', params: [fShoulderTip.x, 20] },
        {
            type: 'C',
            params: [
                targetBustQuarter * 0.7, 70,
                targetBustQuarter * 0.85, fSideUnderarm.y - 20,
                fSideUnderarm.x, fSideUnderarm.y,
            ],
        },
        { type: 'L', params: [fSideHem.x, fSideHem.y] },
        { type: 'L', params: [fCenterHem.x, fCenterHem.y] },
        { type: 'Z', params: [] },
    ];

    const bSeamPath = createPath(bCommands, true);
    const bCutPath = generateSeamAllowanceOffset(bSeamPath, seamAllowanceMm, true);

    const bGrainline: Grainline = {
        start: pt(30, 50),
        end: pt(30, blouseLength - 40),
        isFold: true,
        label: 'CENTRO ESPALDA — AL DOBLEZ',
    };

    const backPiece: PatternPiece = {
        id: 'piece_blouse_back',
        name: 'Blusa Espalda',
        code: 'BLUSA_ESP',
        quantityToCut: 1,
        cutOnFold: true,
        fabricType: 'Seda / Gasa',
        outlineSeam: bSeamPath,
        outlineCut: bCutPath,
        seamAllowanceMm,
        grainline: bGrainline,
        notches: [],
        darts: [],
        labels: [
            {
                text: 'BLUSA FLUIDA ESPALDA — CORTAR 1 AL DOBLEZ',
                position: pt(targetBustQuarter * 0.35, blouseLength * 0.45),
                fontSizeMm: 12,
            },
        ],
        boundingBox: calculateBoundingBox([bCutPath]),
    };

    // Manga para la blusa
    const armholeLen = 220;
    const sleeve = generateSleeveBlock(
        measurements,
        blouseEase,
        designParams,
        armholeLen,
        armholeLen
    );

    return {
        pieces: [frontPiece, backPiece, sleeve.sleevePiece],
        warnings: [...warnings, ...sleeve.warnings],
    };
}
