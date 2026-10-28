// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: VESTIDO DE NOVIA (M02.16)
// Archivo: src/engine/pattern/blocks/bridalGownBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Vestido de Novia de Alta Costura:
// 1. Corpiño Novia Centro Delantero con Copas Anatómicas Integradas
// 2. Corpiño Novia Costadillo Delantero con Soporte Submamario
// 3. Corpiño Novia Costadillo Espalda
// 4. Corpiño Novia Centro Espalda con Botonadura Nupcial
// 5. Falda Novia Delantera Majestuosa con Tablones de Volumen
// 6. Falda Novia Lateral de Distribución de Vuelo
// 7. Falda Novia Espalda con Cola de Capilla / Catedral (Chapel Train)
// 8. Estructura de Soporte Interior / Peplum de Cintura para Sostén de Peso
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

export interface BridalGownBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateBridalGownBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): BridalGownBlockOutput {
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
    const gownLength = designParams.skirt_length_mm || measurements.largo_falda || 1180;
    const chapelTrainMm = (designParams as any).train_length_mm || 750;

    // 2. Holguras de alta costura nupcial
    const bustEase = 0;
    const waistEase = 0;
    const hipEase = 50;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const qWaist = (waistCirc + waistEase) / 4.0;
    const qHip = (hipCirc + hipEase) / 4.0;
    const halfApex = bustDistance / 2.0;

    // --------------------------------------------------------------------------
    // 1. CORPIÑO NOVIA CENTRO DELANTERO CON COPAS INTEGRADAS
    // --------------------------------------------------------------------------
    const fCenterCommands: PathCommand[] = [
        { type: 'M', params: [0, 45] },
        {
            type: 'C',
            params: [
                halfApex * 0.3, 20,
                halfApex * 0.7, 5,
                halfApex, 10,
            ],
        },
        {
            type: 'C',
            params: [
                halfApex + 10, 60,
                halfApex * 0.95, bustHeight - 15,
                halfApex * 0.9, bustHeight,
            ],
        },
        {
            type: 'C',
            params: [
                halfApex * 0.85, bustHeight + 40,
                halfApex * 0.75, frontLength - 30,
                halfApex * 0.7, frontLength,
            ],
        },
        { type: 'L', params: [0, frontLength] },
        { type: 'L', params: [0, 45] },
        { type: 'Z', params: [] },
    ];
    const fCenterPath = createPath(fCenterCommands, true);
    const bodiceFrontCenterPiece = createPiece(
        'piece_bridal_gown_bodice_front_center',
        'Vestido de Novia — Corpiño Centro Delantero con Copas',
        'NOVIA_CORPINO_DEL_CENTRO',
        fCenterPath,
        seamMm,
        { start: pt(0, 60), end: pt(0, frontLength - 20), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [
                { position: pt(halfApex * 0.9, bustHeight), angleRad: 0, lengthMm: 6, label: 'Apex Busto', type: 'single' },
                { position: pt(halfApex * 0.8, bustHeight + 60), angleRad: 0, lengthMm: 6, label: 'Línea Submamaria', type: 'single' },
            ],
            quantityToCut: 1,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 2. CORPIÑO NOVIA COSTADILLO DELANTERO CON SOPORTE SUBMAMARIO
    // --------------------------------------------------------------------------
    const fSideWidth = qBust - halfApex * 0.9 + 20;
    const fSideCommands: PathCommand[] = [
        { type: 'M', params: [0, 10] },
        {
            type: 'C',
            params: [
                fSideWidth * 0.35, 25,
                fSideWidth * 0.75, 45,
                fSideWidth, 55,
            ],
        },
        { type: 'L', params: [fSideWidth - 12, frontLength] },
        { type: 'L', params: [0, frontLength] },
        {
            type: 'C',
            params: [
                -8, bustHeight + 40,
                0, bustHeight,
                0, 10,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const fSidePath = createPath(fSideCommands, true);
    const bodiceFrontSidePiece = createPiece(
        'piece_bridal_gown_bodice_front_side',
        'Vestido de Novia — Corpiño Costadillo Delantero',
        'NOVIA_CORPINO_DEL_COSTADILLO',
        fSidePath,
        seamMm,
        { start: pt(fSideWidth / 2, 40), end: pt(fSideWidth / 2, frontLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(0, bustHeight), angleRad: Math.PI, lengthMm: 6, label: 'Apex Busto', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 3. CORPIÑO NOVIA COSTADILLO ESPALDA
    // --------------------------------------------------------------------------
    const bSideWidth = qBust * 0.52;
    const bSideCommands: PathCommand[] = [
        { type: 'M', params: [0, 70] },
        { type: 'L', params: [bSideWidth, 55] },
        { type: 'L', params: [bSideWidth - 12, backLength] },
        { type: 'L', params: [0, backLength] },
        { type: 'Z', params: [] },
    ];
    const bSidePath = createPath(bSideCommands, true);
    const bodiceBackSidePiece = createPiece(
        'piece_bridal_gown_bodice_back_side',
        'Vestido de Novia — Corpiño Costadillo Espalda',
        'NOVIA_CORPINO_ESP_COSTADILLO',
        bSidePath,
        seamMm,
        { start: pt(bSideWidth / 2, 80), end: pt(bSideWidth / 2, backLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(bSideWidth - 12, backLength), angleRad: 0, lengthMm: 6, label: 'Cintura', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 4. CORPIÑO NOVIA CENTRO ESPALDA CON BOTONADURA NUPCIAL
    // --------------------------------------------------------------------------
    const bCenterWidth = qWaist * 0.48;
    const bCenterCommands: PathCommand[] = [
        { type: 'M', params: [0, 70] },
        { type: 'L', params: [bCenterWidth, 70] },
        { type: 'L', params: [bCenterWidth, backLength] },
        { type: 'L', params: [0, backLength] },
        { type: 'L', params: [0, 70] },
        { type: 'Z', params: [] },
    ];
    const bCenterPath = createPath(bCenterCommands, true);
    const bodiceBackCenterPiece = createPiece(
        'piece_bridal_gown_bodice_back_center',
        'Vestido de Novia — Corpiño Centro Espalda con Botonadura',
        'NOVIA_CORPINO_ESP_CENTRO',
        bCenterPath,
        seamMm,
        { start: pt(20, 85), end: pt(20, backLength - 25), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    // --------------------------------------------------------------------------
    // 5. FALDA NOVIA DELANTERA MAJESTUOSA
    // --------------------------------------------------------------------------
    const fHemBridalWidth = qHip * 1.85;
    const fSkirtCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [qWaist * 1.4, 0] },
        {
            type: 'C',
            params: [
                qHip * 1.3, 120,
                fHemBridalWidth * 0.7, gownLength - 120,
                fHemBridalWidth, gownLength,
            ],
        },
        { type: 'L', params: [0, gownLength] },
        { type: 'Z', params: [] },
    ];
    const fSkirtPath = createPath(fSkirtCommands, true);
    const skirtFrontPiece = createPiece(
        'piece_bridal_gown_skirt_front',
        'Vestido de Novia — Falda Delantera Majestuosa con Tablones',
        'NOVIA_FALDA_DELANTERA',
        fSkirtPath,
        seamMm,
        { start: pt(0, 60), end: pt(0, gownLength - 60), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: pt(qWaist * 0.7, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Pliegue Tablón', type: 'double' }],
            quantityToCut: 1,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 6. FALDA NOVIA LATERAL DE DISTRIBUCIÓN DE VUELO
    // --------------------------------------------------------------------------
    const sideWaist = qWaist * 0.8;
    const sideHem = qHip * 1.5;
    const sideCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [sideWaist, 0] },
        { type: 'L', params: [sideHem, gownLength] },
        { type: 'L', params: [0, gownLength] },
        { type: 'Z', params: [] },
    ];
    const sidePath = createPath(sideCommands, true);
    const skirtSidePiece = createPiece(
        'piece_bridal_gown_skirt_side',
        'Vestido de Novia — Falda Lateral de Distribución de Vuelo',
        'NOVIA_FALDA_LATERAL',
        sidePath,
        seamMm,
        { start: pt(sideWaist / 2, 50), end: pt(sideHem / 2, gownLength - 50), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(sideWaist, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Costura Costado', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 7. FALDA NOVIA ESPALDA CON COLA DE CAPILLA / CATEDRAL
    // --------------------------------------------------------------------------
    const totalBridalBackLength = gownLength + chapelTrainMm;
    const bHemBridalWidth = qHip * 2.1;
    const bSkirtCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [qWaist * 1.3, 0] },
        {
            type: 'C',
            params: [
                qHip * 1.4, 120,
                bHemBridalWidth * 0.7, gownLength,
                bHemBridalWidth, gownLength + 80,
            ],
        },
        {
            type: 'C',
            params: [
                bHemBridalWidth * 0.7, totalBridalBackLength,
                bHemBridalWidth * 0.3, totalBridalBackLength,
                0, totalBridalBackLength,
            ],
        },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const bSkirtPath = createPath(bSkirtCommands, true);
    const skirtBackPiece = createPiece(
        'piece_bridal_gown_skirt_back_train',
        'Vestido de Novia — Falda Espalda con Cola de Capilla',
        'NOVIA_FALDA_ESPALDA_COLA',
        bSkirtPath,
        seamMm,
        { start: pt(40, 60), end: pt(40, gownLength - 60), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(0, gownLength), angleRad: Math.PI, lengthMm: 6, label: 'Comienzo de Cola', type: 'double' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 8. ESTRUCTURA DE SOPORTE INTERIOR / PEPLUM DE CINTURA
    // --------------------------------------------------------------------------
    const peplumLength = waistCirc + 40;
    const peplumHeight = 160;
    const peplumCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [peplumLength / 2, 0] },
        {
            type: 'C',
            params: [
                peplumLength * 0.6, peplumHeight * 0.4,
                peplumLength * 0.55, peplumHeight,
                peplumLength * 0.45, peplumHeight,
            ],
        },
        { type: 'L', params: [0, peplumHeight] },
        { type: 'Z', params: [] },
    ];
    const peplumPath = createPath(peplumCommands, true);
    const supportPeplumPiece = createPiece(
        'piece_bridal_gown_support_peplum',
        'Vestido de Novia — Estructura Interior de Soporte y Reparto de Peso',
        'NOVIA_SOPORTE_PEPLUM',
        peplumPath,
        seamMm,
        { start: pt(0, 30), end: pt(0, peplumHeight - 30), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: pt(peplumLength / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado', type: 'single' }],
            quantityToCut: 2,
            cutOnFold: true,
            fabricType: 'Crinolina / Forro Reforzado',
        }
    );

    const pieces: PatternPiece[] = [
        bodiceFrontCenterPiece,
        bodiceFrontSidePiece,
        bodiceBackSidePiece,
        bodiceBackCenterPiece,
        skirtFrontPiece,
        skirtSidePiece,
        skirtBackPiece,
        supportPeplumPiece,
    ];

    calculatedValues.bridalTotalLengthWithTrainMm = frontLength + totalBridalBackLength;
    calculatedValues.chapelTrainLengthMm = chapelTrainMm;
    calculatedValues.skirtHemCircumferenceMm = (fHemBridalWidth + sideHem + bHemBridalWidth) * 2;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
