// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: CAZADORA / BOMBER JACKET (M02.18)
// Archivo: src/engine/pattern/blocks/bomberJacketBlock.ts
// ==============================================================================
// Genera piezas CAD especializadas para Cazadora / Bomber Jacket de Alta Costura:
// 1. Delantero Cazadora con margen de cremallera frontal y holgura blusada
// 2. Espalda Cazadora con volumen blusado en cintura
// 3. Manga Cazadora con amplitud y curva de copa envolvente
// 4. Cuello Canalé Bomber Elástico / Rib Knit
// 5. Pretina Canalé Elástica de Cintura
// 6. Puño Canalé Elástico de Manga
// 7. Bolsillo de Ojal Inclinado con Ribete Sastre
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

export interface BomberJacketBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateBomberJacketBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): BomberJacketBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Medidas anatómicas (mm)
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const backLength = measurements.largo_talle_espalda || 410;
    const armLength = measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const wristCirc = measurements.contorno_muneca || 160;
    const neckCirc = measurements.contorno_cuello || 370;
    const bomberLength = backLength + 60;

    // 2. Holguras deportivas / blusadas
    const bustEase = (ease.bust || 80) + 40;
    const seamMm = designParams.seam_allowance_default_mm || 10;

    const qBust = (bustCirc + bustEase) / 4.0;
    const armholeDepth = backLength / 2.0 + 35;
    const zipAllowance = 15;

    // --------------------------------------------------------------------------
    // 1. DELANTERO CAZADORA
    // --------------------------------------------------------------------------
    const fPoints = {
        neckCenter: pt(-zipAllowance, 45),
        neckShoulder: pt(neckCirc / 6.0, -10),
        shoulderTip: pt(qBust * 0.65, 25),
        armholeBase: pt(qBust + 10, armholeDepth),
        waistSide: pt(qBust + 15, bomberLength),
        waistCenter: pt(-zipAllowance, bomberLength + 10),
    };

    const frontCommands: PathCommand[] = [
        { type: 'M', params: [fPoints.neckCenter.x, fPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                fPoints.neckCenter.x + 25, fPoints.neckCenter.y - 30,
                fPoints.neckShoulder.x - 20, fPoints.neckShoulder.y + 15,
                fPoints.neckShoulder.x, fPoints.neckShoulder.y,
            ],
        },
        { type: 'L', params: [fPoints.shoulderTip.x, fPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                fPoints.shoulderTip.x - 5, fPoints.shoulderTip.y + 50,
                fPoints.armholeBase.x - 20, fPoints.armholeBase.y - 35,
                fPoints.armholeBase.x, fPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [fPoints.waistSide.x, fPoints.waistSide.y] },
        { type: 'L', params: [fPoints.waistCenter.x, fPoints.waistCenter.y] },
        { type: 'L', params: [fPoints.neckCenter.x, fPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const frontPath = createPath(frontCommands, true);
    const frontPiece = createPiece(
        'piece_bomber_front',
        'Cazadora — Delantero con Margen de Cremallera',
        'CAZADORA_DELANTERO',
        frontPath,
        seamMm,
        { start: pt(0, 50), end: pt(0, bomberLength - 30), isFold: false, label: 'CENTRO CREMALLERA' },
        {
            notches: [{ position: fPoints.armholeBase, angleRad: 0, lengthMm: 6, label: 'Sisa Delantera', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 2. ESPALDA CAZADORA
    // --------------------------------------------------------------------------
    const bPoints = {
        neckCenter: pt(0, 0),
        neckShoulder: pt(neckCirc / 6.0, -12),
        shoulderTip: pt(qBust * 0.65, 25),
        armholeBase: pt(qBust + 5, armholeDepth - 5),
        waistSide: pt(qBust + 15, bomberLength),
        waistCenter: pt(0, bomberLength),
    };

    const backCommands: PathCommand[] = [
        { type: 'M', params: [bPoints.neckCenter.x, bPoints.neckCenter.y] },
        {
            type: 'C',
            params: [
                neckCirc / 12.0, -4,
                neckCirc / 8.0, -10,
                bPoints.neckShoulder.x, bPoints.neckShoulder.y,
            ],
        },
        { type: 'L', params: [bPoints.shoulderTip.x, bPoints.shoulderTip.y] },
        {
            type: 'C',
            params: [
                bPoints.shoulderTip.x - 5, bPoints.shoulderTip.y + 50,
                bPoints.armholeBase.x - 20, bPoints.armholeBase.y - 35,
                bPoints.armholeBase.x, bPoints.armholeBase.y,
            ],
        },
        { type: 'L', params: [bPoints.waistSide.x, bPoints.waistSide.y] },
        { type: 'L', params: [bPoints.waistCenter.x, bPoints.waistCenter.y] },
        { type: 'L', params: [bPoints.neckCenter.x, bPoints.neckCenter.y] },
        { type: 'Z', params: [] },
    ];
    const backPath = createPath(backCommands, true);
    const backPiece = createPiece(
        'piece_bomber_back',
        'Cazadora — Espalda con Volumen Blusado',
        'CAZADORA_ESPALDA',
        backPath,
        seamMm,
        { start: pt(0, 30), end: pt(0, bomberLength - 30), isFold: true, label: 'AL DOBLEZ' },
        {
            notches: [{ position: bPoints.armholeBase, angleRad: 0, lengthMm: 6, label: 'Sisa Espalda', type: 'double' }],
            quantityToCut: 1,
            cutOnFold: true,
        }
    );

    // --------------------------------------------------------------------------
    // 3. MANGA CAZADORA CON AMPLITUD
    // --------------------------------------------------------------------------
    const sleeveWidth = bicepsCirc + 100;
    const sleeveLength = armLength - 55;
    const wristBomber = 260;
    const capHeight = 125;

    const sleeveCommands: PathCommand[] = [
        { type: 'M', params: [-sleeveWidth / 2, capHeight] },
        {
            type: 'C',
            params: [
                -sleeveWidth * 0.25, 0,
                sleeveWidth * 0.25, 0,
                sleeveWidth / 2, capHeight,
            ],
        },
        { type: 'L', params: [wristBomber / 2, sleeveLength] },
        { type: 'L', params: [-wristBomber / 2, sleeveLength] },
        { type: 'Z', params: [] },
    ];
    const sleevePath = createPath(sleeveCommands, true);
    const sleevePiece = createPiece(
        'piece_bomber_sleeve',
        'Cazadora — Manga con Amplitud de Codo',
        'CAZADORA_MANGA',
        sleevePath,
        seamMm,
        { start: pt(0, 30), end: pt(0, sleeveLength - 30), isFold: false, label: 'HILO DE LA TELA' },
        {
            notches: [{ position: pt(0, 0), angleRad: -Math.PI / 2, lengthMm: 6, label: 'Centro Hombro', type: 'single' }],
            quantityToCut: 2,
        }
    );

    // --------------------------------------------------------------------------
    // 4. CUELLO CANALÉ BOMBER
    // --------------------------------------------------------------------------
    const collarCirc = Math.round(neckCirc * 0.85);
    const collarHeight = 50;
    const collarCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        {
            type: 'C',
            params: [
                collarCirc * 0.3, 10,
                collarCirc * 0.7, 10,
                collarCirc, 0,
            ],
        },
        { type: 'L', params: [collarCirc - 15, collarHeight] },
        {
            type: 'C',
            params: [
                collarCirc * 0.7, collarHeight + 10,
                collarCirc * 0.3, collarHeight + 10,
                15, collarHeight,
            ],
        },
        { type: 'Z', params: [] },
    ];
    const collarPath = createPath(collarCommands, true);
    const ribCollarPiece = createPiece(
        'piece_bomber_rib_collar',
        'Cazadora — Cuello Canalé Elástico Bomber',
        'CAZADORA_CUELLO_CANALE',
        collarPath,
        seamMm,
        { start: pt(collarCirc / 2, 10), end: pt(collarCirc / 2, collarHeight - 5), isFold: false, label: 'CANALÉ VERTICAL' },
        {
            notches: [{ position: pt(collarCirc / 2, 10), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Espalda', type: 'single' }],
            quantityToCut: 1,
            fabricType: 'Canalé / Rib Knit',
        }
    );

    // --------------------------------------------------------------------------
    // 5. PRETINA CANALÉ ELÁSTICA DE CINTURA
    // --------------------------------------------------------------------------
    const ribWaistLength = Math.round(waistCirc * 0.80);
    const ribWaistHeight = 70;
    const waistCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [ribWaistLength, 0] },
        { type: 'L', params: [ribWaistLength, ribWaistHeight] },
        { type: 'L', params: [0, ribWaistHeight] },
        { type: 'Z', params: [] },
    ];
    const waistPath = createPath(waistCommands, true);
    const ribWaistbandPiece = createPiece(
        'piece_bomber_rib_waistband',
        'Cazadora — Pretina Canalé Elástica de Cintura',
        'CAZADORA_PRETINA_CANALE',
        waistPath,
        seamMm,
        { start: pt(30, ribWaistHeight / 2), end: pt(ribWaistLength - 30, ribWaistHeight / 2), isFold: false, label: 'CANALÉ VERTICAL' },
        {
            notches: [
                { position: pt(ribWaistLength / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Izq', type: 'single' },
                { position: pt(ribWaistLength / 2, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Centro Espalda', type: 'single' },
                { position: pt((3 * ribWaistLength) / 4, 0), angleRad: -Math.PI / 2, lengthMm: 5, label: 'Costado Der', type: 'single' },
            ],
            quantityToCut: 1,
            fabricType: 'Canalé / Rib Knit',
        }
    );

    // --------------------------------------------------------------------------
    // 6. PUÑOS CANALÉ ELÁSTICOS DE MANGA
    // --------------------------------------------------------------------------
    const ribCuffLength = Math.round(wristCirc * 0.82);
    const ribCuffHeight = 60;
    const cuffCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [ribCuffLength, 0] },
        { type: 'L', params: [ribCuffLength, ribCuffHeight] },
        { type: 'L', params: [0, ribCuffHeight] },
        { type: 'Z', params: [] },
    ];
    const cuffPath = createPath(cuffCommands, true);
    const ribCuffPiece = createPiece(
        'piece_bomber_rib_cuff',
        'Cazadora — Puño Canalé Elástico',
        'CAZADORA_PUNO_CANALE',
        cuffPath,
        seamMm,
        { start: pt(15, ribCuffHeight / 2), end: pt(ribCuffLength - 15, ribCuffHeight / 2), isFold: false, label: 'CANALÉ VERTICAL' },
        { quantityToCut: 2, fabricType: 'Canalé / Rib Knit' }
    );

    // --------------------------------------------------------------------------
    // 7. BOLSILLO DE OJAL INCLINADO CON TAPETA / RIBETE
    // --------------------------------------------------------------------------
    const weltWidth = 150;
    const weltHeight = 32;
    const weltCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [weltWidth, 0] },
        { type: 'L', params: [weltWidth, weltHeight] },
        { type: 'L', params: [0, weltHeight] },
        { type: 'Z', params: [] },
    ];
    const weltPath = createPath(weltCommands, true);
    const weltPiece = createPiece(
        'piece_bomber_welt_pocket',
        'Cazadora — Ribete de Bolsillo Inclinado',
        'CAZADORA_RIBETE_BOLSILLO',
        weltPath,
        seamMm,
        { start: pt(20, weltHeight / 2), end: pt(weltWidth - 20, weltHeight / 2), isFold: false, label: 'HILO DE LA TELA' },
        { quantityToCut: 2 }
    );

    const pieces: PatternPiece[] = [
        frontPiece,
        backPiece,
        sleevePiece,
        ribCollarPiece,
        ribWaistbandPiece,
        ribCuffPiece,
        weltPiece,
    ];

    calculatedValues.bomberLengthMm = bomberLength;
    calculatedValues.ribWaistElasticReductionMm = Math.round(waistCirc * 0.20);

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
