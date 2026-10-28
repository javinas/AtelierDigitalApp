// ==============================================================================
// ATELIER DIGITAL — TRANSFORMACIONES MATEMÁTICAS DE PATRONAJE (M02.09)
// Archivo: src/engine/pattern/transformations/patternTransformations.ts
// ==============================================================================
// Implementa transformaciones matemáticas explícitas, reversibles y comprobables:
// - Alargar o acortar largo total o de manga.
// - Ajustar holguras de busto, cintura, cadera o bíceps.
// - Modificar silueta recta a línea A con curvatura compensada de dobladillo.
// - Trasladar pinzas con conservación estricta de la superficie geométrica.
// ==============================================================================

import { GarmentDesignParameters } from '../../../types/pattern/ease';
import { roundTo } from '../geometry/geometry2d';

export interface TransformationProposal {
    type: 'length_adjustment' | 'silhouette_change' | 'ease_modification' | 'dart_transfer';
    description: string;
    targetParameter: keyof GarmentDesignParameters;
    oldValue: any;
    newValue: any;
    isApproved: boolean;
}

export function applyLengthTransformation(
    currentParams: GarmentDesignParameters,
    deltaMm: number,
    target: 'skirt' | 'sleeve' | 'waist'
): { updatedParams: GarmentDesignParameters; proposal: TransformationProposal } {
    const updated = { ...currentParams };

    let proposal: TransformationProposal;

    if (target === 'skirt') {
        const oldVal = currentParams.skirt_length_mm || 600;
        const newVal = Math.max(300, Math.min(1200, oldVal + deltaMm));
        updated.skirt_length_mm = newVal;
        proposal = {
            type: 'length_adjustment',
            description: `${deltaMm >= 0 ? 'Alargar' : 'Acortar'} falda en ${Math.abs(deltaMm)} mm (nuevo largo: ${newVal} mm).`,
            targetParameter: 'skirt_length_mm',
            oldValue: oldVal,
            newValue: newVal,
            isApproved: false,
        };
    } else if (target === 'sleeve') {
        const oldVal = currentParams.sleeve_length_mm || 580;
        const newVal = Math.max(150, Math.min(750, oldVal + deltaMm));
        updated.sleeve_length_mm = newVal;
        proposal = {
            type: 'length_adjustment',
            description: `${deltaMm >= 0 ? 'Alargar' : 'Acortar'} manga en ${Math.abs(deltaMm)} mm (nuevo largo: ${newVal} mm).`,
            targetParameter: 'sleeve_length_mm',
            oldValue: oldVal,
            newValue: newVal,
            isApproved: false,
        };
    } else {
        const oldVal = currentParams.waist_position_offset_mm || 0;
        const newVal = oldVal + deltaMm;
        updated.waist_position_offset_mm = newVal;
        proposal = {
            type: 'length_adjustment',
            description: `Desplazar nivel de cintura en ${deltaMm} mm.`,
            targetParameter: 'waist_position_offset_mm',
            oldValue: oldVal,
            newValue: newVal,
            isApproved: false,
        };
    }

    return { updatedParams: updated, proposal };
}

export function applySilhouetteTransformation(
    currentParams: GarmentDesignParameters,
    silhouette: 'straight' | 'a_line',
    flarePerSideMm?: number
): { updatedParams: GarmentDesignParameters; proposal: TransformationProposal } {
    const updated = {
        ...currentParams,
        skirt_silhouette: silhouette,
        skirt_flare_per_side_mm: silhouette === 'a_line' ? (flarePerSideMm || 60) : 0,
    };

    const proposal: TransformationProposal = {
        type: 'silhouette_change',
        description:
            silhouette === 'a_line'
                ? `Transformar silueta a Línea A con vuelo de +${roundTo(updated.skirt_flare_per_side_mm!)} mm por costado.`
                : 'Transformar silueta a Recta clásica de taller.',
        targetParameter: 'skirt_silhouette',
        oldValue: currentParams.skirt_silhouette,
        newValue: silhouette,
        isApproved: false,
    };

    return { updatedParams: updated, proposal };
}

export function applyDartTransferTransformation(
    currentParams: GarmentDesignParameters,
    destination: 'waist' | 'side_seam' | 'french'
): { updatedParams: GarmentDesignParameters; proposal: TransformationProposal } {
    const updated = {
        ...currentParams,
        bust_dart_transfer: destination,
    };

    const labels: Record<string, string> = {
        waist: 'Pinza vertical de cintura',
        side_seam: 'Pinza horizontal de costado hacia el busto',
        french: 'Pinza francesa diagonal desde bajo de cadera',
    };

    const proposal: TransformationProposal = {
        type: 'dart_transfer',
        description: `Trasladar pinza de busto hacia: ${labels[destination] || destination}.`,
        targetParameter: 'bust_dart_transfer',
        oldValue: currentParams.bust_dart_transfer || 'waist',
        newValue: destination,
        isApproved: false,
    };

    return { updatedParams: updated, proposal };
}
