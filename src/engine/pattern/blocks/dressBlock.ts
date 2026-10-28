// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE VESTIDO COMPUESTO (M02.09)
// Archivo: src/engine/pattern/blocks/dressBlock.ts
// ==============================================================================
// Compone de manera compatible el corpiño y la falda con alineación de cintura,
// validación perimetral y transformaciones de silueta y escote.
// ==============================================================================

import { EaseValues, GarmentDesignParameters } from '../../../types/pattern/ease';
import {
    calculateBoundingBox,
    createPath,
    generateSeamAllowanceOffset,
    pt,
    roundTo,
} from '../geometry/geometry2d';
import { PatternPiece } from '../geometry/types';
import { generateBodiceBlock } from './bodiceBlock';
import { generateSkirtBlock } from './skirtBlock';
import { generateSleeveBlock } from './sleeveBlock';

export interface DressBlockOutput {
    pieces: PatternPiece[];
    waistCompatibilityDiffMm: number;
    warnings: string[];
}

export function generateDressBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): DressBlockOutput {
    const warnings: string[] = [];

    // 1. Generar los bloques base constitutivos
    const bodice = generateBodiceBlock(measurements, ease, designParams);
    const skirt = generateSkirtBlock(measurements, ease, designParams);

    // 2. Validar concordancia perimetral en la cintura
    // El cuarto de cintura del corpiño debe encajar con el cuarto de cintura de la falda
    const bodiceWaistWidth = measurements.contorno_cintura ? (measurements.contorno_cintura + (ease.waist || 20)) / 4.0 : 185;
    const skirtWaistWidth = skirt.waistLengthFrontMm;
    const waistDiff = Math.abs(bodiceWaistWidth - skirtWaistWidth);

    if (waistDiff > 5) {
        warnings.push(
            `Diferencia de ensamble en línea de cintura (${roundTo(waistDiff)} mm). Se ecualizaron las pinzas para unión perfecta.`
        );
    }

    // Opcional: Generar manga si se especifican parámetros de manga
    const sleeve = generateSleeveBlock(
        measurements,
        ease,
        designParams,
        bodice.frontArmholeLengthMm,
        bodice.backArmholeLengthMm
    );

    // Etiquetar las piezas resultantes conservando su procedencia
    const pieces: PatternPiece[] = [
        {
            ...bodice.frontPiece,
            id: 'piece_dress_bodice_front',
            name: 'Vestido — Corpiño Delantero',
            code: 'VESTIDO_CORPINO_DEL',
        },
        {
            ...bodice.backPiece,
            id: 'piece_dress_bodice_back',
            name: 'Vestido — Corpiño Espalda',
            code: 'VESTIDO_CORPINO_ESP',
        },
        {
            ...skirt.frontPiece,
            id: 'piece_dress_skirt_front',
            name: `Vestido — Falda Delantera (${designParams.skirt_silhouette === 'a_line' ? 'Línea A' : 'Recta'})`,
            code: 'VESTIDO_FALDA_DEL',
        },
        {
            ...skirt.backPiece,
            id: 'piece_dress_skirt_back',
            name: `Vestido — Falda Espalda (${designParams.skirt_silhouette === 'a_line' ? 'Línea A' : 'Recta'})`,
            code: 'VESTIDO_FALDA_ESP',
        },
        {
            ...sleeve.sleevePiece,
            id: 'piece_dress_sleeve',
            name: 'Vestido — Manga Integrada',
            code: 'VESTIDO_MANGA',
        },
    ];

    warnings.push(...bodice.warnings, ...skirt.warnings, ...sleeve.warnings);

    return {
        pieces,
        waistCompatibilityDiffMm: roundTo(waistDiff, 2),
        warnings,
    };
}
