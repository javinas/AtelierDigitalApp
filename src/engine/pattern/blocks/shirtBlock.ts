// ==============================================================================
// ATELIER DIGITAL — MOTOR DE PATRONAJE: BLOQUE DE CAMISA DE ALTA COSTURA (C14)
// Archivo: src/engine/pattern/blocks/shirtBlock.ts
// ==============================================================================
// Genera una camisa sastre completa paramétrica By Katherine Carroll:
// - Delantero Izquierdo y Delantero Derecho (asimétricos con apertura y cruce)
// - Espalda Inferior con pliegue de holgura y bajo sastre curvo
// - Canesú Superior de Hombros (yoke) con avance clavicular de 10 mm
// - Cuello Camisero de 2 piezas (Pie anatómico + Pala) empalmado al escote real
// - Mangas Camiseras (Izquierda y Derecha) con tajo de sardineta
// - Puños Camiseros (Izquierdo y Derecho) con chaflán sastre a 45 grados
// - Tapeta Frontal de Botonadura
// - Bolsillo de Parche Delantero (opcional)
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
import { generateCollarComponent } from '../components/collarComponent';
import { generateCuffComponent } from '../components/cuffComponent';
import { draftShirtSleeve } from '../components/sleeveGeometry';

export interface ShirtBlockOutput {
    pieces: PatternPiece[];
    calculatedValues: Record<string, number>;
    warnings: string[];
}

export function generateShirtBlock(
    measurements: Record<string, number>,
    ease: EaseValues,
    designParams: GarmentDesignParameters
): ShirtBlockOutput {
    const warnings: string[] = [];
    const calculatedValues: Record<string, number> = {};

    // 1. Normalización de medidas corporales y holguras sastre
    const bustCirc = measurements.contorno_busto || 920;
    const waistCirc = measurements.contorno_cintura || 720;
    const neckCirc = measurements.contorno_cuello || 360;
    const backLength = measurements.largo_talle_espalda || 410;
    const frontLength = measurements.largo_talle_delantero || 440;
    const shoulderLength = measurements.largo_hombro || 125;
    const shoulderWidth = measurements.ancho_hombros || 400;
    const backWidth = measurements.ancho_espalda || 350;
    const armLength = measurements.largo_brazo || 580;
    const bicepsCirc = measurements.contorno_biceps || 280;
    const wristCirc = measurements.contorno_muneca || 160;

    // Holguras camiseras
    const bustEase = ease.bust || 80;
    const waistEase = ease.waist || 80;
    const bicepsEase = ease.biceps || 65;
    const wristEase = ease.wrist || 60;
    const seamAllowanceMm = designParams.seam_allowance_default_mm || 10;

    // Parámetros de diseño
    const shirtLength = designParams.shirt_length_mm || measurements.largo_camisa || (backLength + 250);
    const placketWidth = designParams.placket_width_mm || 30;
    const halfPlacket = placketWidth / 2.0; // Cruce de 15 mm respecto al centro
    const cuffHeight = designParams.cuff_height_mm || 65;
    const collarStandHeight = designParams.collar_stand_height_mm || 30;
    const collarFallHeight = designParams.collar_fall_height_mm || 42;
    const yokeDepth = designParams.yoke_depth_back_mm || 75;
    const hasPocket = designParams.pocket_presence === true;

    // Caja de busto por cuarto
    const quarterBust = roundTo((bustCirc + bustEase) / 4.0, 2);
    // Sisa con desahogo camisero
    const armholeDepth = roundTo((measurements.profundidad_sisa || (backLength / 2.0 + 20)), 2);

    // ==========================================================================
    // A. CANESÚ DE ESPALDA (SHIRT_YOKE)
    // Se dibuja en semi-patrón (centro espalda en x = 0 al doblez)
    // ==========================================================================
    const neckWidth = neckCirc / 6.0;
    const halfBack = backWidth / 2.0;
    const yokeHeightAtCenter = yokeDepth;
    const yokeHeightAtArmhole = yokeDepth - 10;
    const shoulderSlope = 38;

    const yokeCenterNeck = pt(0, 0);
    const yokeSideNeck = pt(neckWidth, -18);
    const yokeShoulderTip = pt(neckWidth + shoulderLength * 0.96, -18 + shoulderSlope);
    const yokeArmholeBottom = pt(halfBack + 10, yokeHeightAtArmhole);
    const yokeCenterBottom = pt(0, yokeHeightAtCenter);

    const yokeCommands: PathCommand[] = [
        { type: 'M', params: [yokeCenterBottom.x, yokeCenterBottom.y] },
        { type: 'L', params: [yokeCenterNeck.x, yokeCenterNeck.y] },
        // Curva escote posterior
        {
            type: 'C',
            params: [
                neckWidth * 0.35, -5,
                neckWidth * 0.70, -14,
                yokeSideNeck.x, yokeSideNeck.y,
            ],
        },
        // Línea de hombro (con avance de 10 mm hacia el delantero)
        { type: 'L', params: [yokeShoulderTip.x, yokeShoulderTip.y] },
        // Curva superior de sisa de espalda
        {
            type: 'C',
            params: [
                yokeShoulderTip.x + 2, yokeShoulderTip.y + 15,
                yokeArmholeBottom.x + 4, yokeHeightAtArmhole - 12,
                yokeArmholeBottom.x, yokeArmholeBottom.y,
            ],
        },
        // Corte horizontal inferior de unión con la espalda
        { type: 'L', params: [yokeCenterBottom.x, yokeCenterBottom.y] },
        { type: 'Z', params: [] },
    ];

    const yokeSeamPath = createPath(yokeCommands, true);
    const yokeCutPath = generateSeamAllowanceOffset(yokeSeamPath, seamAllowanceMm, true);

    const yokePiece: PatternPiece = {
        id: 'piece_shirt_yoke',
        name: 'Canesú Superior de Hombros',
        code: 'CAMISA_CANESU',
        quantityToCut: 2, // Exterior + Forro embolsado
        cutOnFold: true,
        fabricType: 'Tela principal',
        outlineSeam: yokeSeamPath,
        outlineCut: yokeCutPath,
        seamAllowanceMm,
        grainline: {
            start: pt(20, yokeHeightAtCenter * 0.5),
            end: pt(halfBack - 20, yokeHeightAtCenter * 0.5),
            isFold: false,
            label: 'HILO DE LA TELA HORIZONTAL (O AL BIES)',
        },
        notches: [
            {
                position: yokeCenterNeck,
                angleRad: -Math.PI / 2,
                lengthMm: 5,
                label: 'Centro espalda escote',
                type: 'single',
            },
            {
                position: yokeCenterBottom,
                angleRad: Math.PI / 2,
                lengthMm: 5,
                label: 'Centro unión con pliegue de espalda',
                type: 'single',
            },
        ],
        darts: [],
        labels: [
            {
                text: 'CANESÚ ESPALDA — CORTAR 2 AL DOBLEZ (EXTERIOR E INTERIOR)',
                position: pt(halfBack * 0.25, yokeHeightAtCenter * 0.45),
                fontSizeMm: 10,
            },
        ],
        boundingBox: calculateBoundingBox([yokeCutPath]),
    };

    // ==========================================================================
    // B. ESPALDA INFERIOR (SHIRT_BACK)
    // ==========================================================================
    const backPleatWidth = 20; // 20 mm de pliegue de fuelle / tabla
    const backTopWidth = yokeArmholeBottom.x + backPleatWidth;
    const bSideUnderarm = pt(quarterBust + 10, armholeDepth);
    const bSideHem = pt(quarterBust + 15, shirtLength - 35); // Curva cola de camisa
    const bCenterHem = pt(0, shirtLength);

    const backCommands: PathCommand[] = [
        { type: 'M', params: [0, yokeHeightAtCenter] },
        { type: 'L', params: [backTopWidth, yokeHeightAtCenter] },
        // Curva inferior de sisa de espalda
        {
            type: 'C',
            params: [
                backTopWidth - 4, yokeHeightAtCenter + 25,
                bSideUnderarm.x * 0.85, armholeDepth - 15,
                bSideUnderarm.x, bSideUnderarm.y,
            ],
        },
        // Costado
        { type: 'L', params: [bSideHem.x, bSideHem.y] },
        // Curva de cola de camisa en el bajo
        {
            type: 'C',
            params: [
                bSideHem.x * 0.75, shirtLength - 10,
                bSideHem.x * 0.35, shirtLength,
                bCenterHem.x, bCenterHem.y,
            ],
        },
        // Centro espalda al doblez
        { type: 'L', params: [0, yokeHeightAtCenter] },
        { type: 'Z', params: [] },
    ];

    const backSeamPath = createPath(backCommands, true);
    const backCutPath = generateSeamAllowanceOffset(backSeamPath, seamAllowanceMm, true);

    const backPiece: PatternPiece = {
        id: 'piece_shirt_back',
        name: 'Espalda Camisera',
        code: 'CAMISA_ESP',
        quantityToCut: 1,
        cutOnFold: true,
        fabricType: 'Tela principal',
        outlineSeam: backSeamPath,
        outlineCut: backCutPath,
        seamAllowanceMm,
        grainline: {
            start: pt(30, yokeHeightAtCenter + 50),
            end: pt(30, shirtLength - 60),
            isFold: true,
            label: 'CENTRO ESPALDA — AL DOBLEZ',
        },
        notches: [
            {
                position: pt(0, yokeHeightAtCenter),
                angleRad: -Math.PI / 2,
                lengthMm: 5,
                label: 'Centro espalda unión canesú',
                type: 'single',
            },
            {
                position: pt(backPleatWidth, yokeHeightAtCenter),
                angleRad: -Math.PI / 2,
                lengthMm: 5,
                label: 'Piquete de pliegue de fuelle',
                type: 'single',
            },
        ],
        darts: [],
        labels: [
            {
                text: 'ESPALDA CAMISERA — CORTAR 1 AL DOBLEZ (CON TABLA)',
                position: pt(quarterBust * 0.3, shirtLength * 0.45),
                fontSizeMm: 12,
            },
        ],
        boundingBox: calculateBoundingBox([backCutPath]),
    };

    // ==========================================================================
    // C. DELANTEROS (SHIRT_FRONT_LEFT & SHIRT_FRONT_RIGHT)
    // ==========================================================================
    // Origen del delantero: intersección centro del escote base (0, 0)
    // La tapeta añade halfPlacket (+15 mm) hacia la izquierda para el cruce.
    const fCenterNeck = pt(-halfPlacket, 0);
    const fSideNeck = pt(neckWidth, -25);
    const fShoulderTip = pt(neckWidth + shoulderLength * 0.94, -25 + shoulderSlope - 10);
    const fSideUnderarm = pt(quarterBust, armholeDepth);
    const fSideHem = pt(quarterBust + 10, shirtLength - 35);
    const fCenterHem = pt(-halfPlacket, shirtLength);

    const frontCommands: PathCommand[] = [
        { type: 'M', params: [fCenterHem.x, fCenterHem.y] },
        { type: 'L', params: [fCenterNeck.x, 20] },
        // Curva de escote delantero rebajado para pie de cuello
        {
            type: 'C',
            params: [
                neckWidth * 0.2, 8,
                neckWidth * 0.65, -12,
                fSideNeck.x, fSideNeck.y,
            ],
        },
        // Línea de hombro delantero (reducida 10 mm por avance de canesú)
        { type: 'L', params: [fShoulderTip.x, fShoulderTip.y] },
        // Curva de sisa delantera
        {
            type: 'C',
            params: [
                fShoulderTip.x - 5, fShoulderTip.y + 35,
                fSideUnderarm.x * 0.82, armholeDepth - 20,
                fSideUnderarm.x, fSideUnderarm.y,
            ],
        },
        // Costado delantero
        { type: 'L', params: [fSideHem.x, fSideHem.y] },
        // Bajo curvo cola de camisa delantero
        {
            type: 'C',
            params: [
                fSideHem.x * 0.70, shirtLength - 10,
                fSideHem.x * 0.25, shirtLength,
                fCenterHem.x, fCenterHem.y,
            ],
        },
        { type: 'Z', params: [] },
    ];

    const frontSeamPath = createPath(frontCommands, true);
    const frontCutPath = generateSeamAllowanceOffset(frontSeamPath, seamAllowanceMm, true);

    const frontLeftPiece: PatternPiece = {
        id: 'piece_shirt_front_left',
        name: 'Delantero Izquierdo Camisero',
        code: 'CAMISA_DEL_IZQ',
        quantityToCut: 1,
        cutOnFold: false,
        fabricType: 'Tela principal',
        outlineSeam: frontSeamPath,
        outlineCut: frontCutPath,
        seamAllowanceMm,
        grainline: {
            start: pt(25, 40),
            end: pt(25, shirtLength - 50),
            isFold: false,
            label: 'HILO DE LA TELA — PARALELO AL CRUCE',
        },
        notches: [
            {
                position: pt(0, 10),
                angleRad: Math.PI,
                lengthMm: 5,
                label: 'Línea de centro delantero / quiebre de tapeta',
                type: 'single',
            },
            {
                position: pt(0, frontLength),
                angleRad: Math.PI,
                lengthMm: 5,
                label: 'Línea de cintura',
                type: 'single',
            },
        ],
        darts: [],
        labels: [
            {
                text: 'DELANTERO IZQUIERDO — CORTAR 1 (OJALES)',
                position: pt(quarterBust * 0.25, shirtLength * 0.45),
                fontSizeMm: 11,
            },
        ],
        boundingBox: calculateBoundingBox([frontCutPath]),
    };

    const frontRightPiece: PatternPiece = {
        id: 'piece_shirt_front_right',
        name: 'Delantero Derecho Camisero',
        code: 'CAMISA_DEL_DER',
        quantityToCut: 1,
        cutOnFold: false,
        fabricType: 'Tela principal',
        outlineSeam: frontSeamPath,
        outlineCut: frontCutPath,
        seamAllowanceMm,
        grainline: {
            start: pt(25, 40),
            end: pt(25, shirtLength - 50),
            isFold: false,
            label: 'HILO DE LA TELA — PARALELO AL CRUCE',
        },
        notches: [
            {
                position: pt(0, 10),
                angleRad: Math.PI,
                lengthMm: 5,
                label: 'Línea de centro delantero (botones)',
                type: 'single',
            },
        ],
        darts: [],
        labels: [
            {
                text: 'DELANTERO DERECHO — CORTAR 1 (BOTONES)',
                position: pt(quarterBust * 0.25, shirtLength * 0.45),
                fontSizeMm: 11,
            },
        ],
        boundingBox: calculateBoundingBox([frontCutPath]),
    };

    // ==========================================================================
    // D. TAPETA FRONTAL (SHIRT_PLACKET)
    // Pieza de vista/refuerzo frontal (ancho 30 mm, largo = frontLength + bajo)
    // ==========================================================================
    const placketLength = shirtLength;
    const placketCommands: PathCommand[] = [
        { type: 'M', params: [0, 0] },
        { type: 'L', params: [placketWidth, 0] },
        { type: 'L', params: [placketWidth, placketLength] },
        { type: 'L', params: [0, placketLength] },
        { type: 'L', params: [0, 0] },
        { type: 'Z', params: [] },
    ];
    const placketSeam = createPath(placketCommands, true);
    const placketCut = generateSeamAllowanceOffset(placketSeam, seamAllowanceMm, true);

    const placketPiece: PatternPiece = {
        id: 'piece_shirt_placket',
        name: 'Tapeta Frontal de Botonadura',
        code: 'CAMISA_TAPETA',
        quantityToCut: 2,
        cutOnFold: false,
        fabricType: 'Tela principal / Entretela',
        outlineSeam: placketSeam,
        outlineCut: placketCut,
        seamAllowanceMm,
        grainline: {
            start: pt(halfPlacket, 30),
            end: pt(halfPlacket, placketLength - 30),
            isFold: false,
            label: 'HILO DE LA TELA',
        },
        notches: [
            {
                position: pt(halfPlacket, 35),
                angleRad: Math.PI / 2,
                lengthMm: 4,
                label: 'Botón superior 1',
                type: 'single',
            },
            {
                position: pt(halfPlacket, 120),
                angleRad: Math.PI / 2,
                lengthMm: 4,
                label: 'Botón 2',
                type: 'single',
            },
            {
                position: pt(halfPlacket, 205),
                angleRad: Math.PI / 2,
                lengthMm: 4,
                label: 'Botón 3',
                type: 'single',
            },
        ],
        darts: [],
        labels: [
            {
                text: 'TAPETA FRONTAL — CORTAR 2 TELA + 2 ENTRETELA',
                position: pt(3, placketLength * 0.4),
                fontSizeMm: 8,
                rotationDeg: 90,
            },
        ],
        boundingBox: calculateBoundingBox([placketCut]),
    };

    // ==========================================================================
    // E. CUELLO CAMISERO (COLLAR COMPONENT)
    // ==========================================================================
    // Semiperímetro de escote real = escote delantero + escote canesú
    const frontNeckCurveMm = roundTo(neckWidth * 1.15 + 20, 2);
    const backNeckCurveMm = roundTo(neckWidth * 1.05 + 5, 2);
    const totalHalfNecklineMm = frontNeckCurveMm + backNeckCurveMm;

    const collar = generateCollarComponent({
        necklinePerimeterHalfMm: totalHalfNecklineMm,
        standHeightMm: collarStandHeight,
        fallHeightMm: collarFallHeight,
        overlapMm: 15,
        seamAllowanceMm,
    });
    warnings.push(...collar.warnings);

    // ==========================================================================
    // F. MANGAS CAMISERAS (SLEEVE GEOMETRY COMPONENT)
    // ==========================================================================
    // Perímetro total de sisa ensamblada (delantero + espalda inferior + canesú)
    const frontArmholeLen = roundTo(armholeDepth * 1.12, 2);
    const backArmholeLen = roundTo(armholeDepth * 1.16, 2);
    const totalArmholePerimeter = frontArmholeLen + backArmholeLen;

    const leftSleeve = draftShirtSleeve({
        armholePerimeterMm: totalArmholePerimeter,
        armLengthMm: armLength,
        bicepsCircumferenceMm: bicepsCirc,
        wristCircumferenceMm: wristCirc,
        bicepsEaseMm: bicepsEase,
        cuffHeightMm: cuffHeight,
        seamAllowanceMm,
        isRightHand: false,
    });
    warnings.push(...leftSleeve.warnings);

    const rightSleeve = draftShirtSleeve({
        armholePerimeterMm: totalArmholePerimeter,
        armLengthMm: armLength,
        bicepsCircumferenceMm: bicepsCirc,
        wristCircumferenceMm: wristCirc,
        bicepsEaseMm: bicepsEase,
        cuffHeightMm: cuffHeight,
        seamAllowanceMm,
        isRightHand: true,
    });

    // ==========================================================================
    // G. PUÑOS CAMISEROS (CUFF COMPONENT)
    // ==========================================================================
    const leftCuff = generateCuffComponent({
        wristCircumferenceMm: wristCirc,
        wristEaseMm: wristEase,
        cuffHeightMm: cuffHeight,
        overlapMm: 20,
        seamAllowanceMm,
        isRightHand: false,
    });
    warnings.push(...leftCuff.warnings);

    const rightCuff = generateCuffComponent({
        wristCircumferenceMm: wristCirc,
        wristEaseMm: wristEase,
        cuffHeightMm: cuffHeight,
        overlapMm: 20,
        seamAllowanceMm,
        isRightHand: true,
    });

    // Piezas acumuladas obligatorias
    const pieces: PatternPiece[] = [
        frontLeftPiece,
        frontRightPiece,
        backPiece,
        yokePiece,
        collar.standPiece,
        collar.fallPiece,
        leftSleeve.sleevePiece,
        rightSleeve.sleevePiece,
        leftCuff.cuffPiece,
        rightCuff.cuffPiece,
        placketPiece,
    ];

    // ==========================================================================
    // H. BOLSILLO DE PARCHE CAMISERO (OPCIONAL)
    // ==========================================================================
    if (hasPocket) {
        const pWidth = designParams.pocket_width_mm || 120;
        const pHeight = designParams.pocket_height_mm || 135;
        const pPointDrop = 18;

        const pocketCommands: PathCommand[] = [
            { type: 'M', params: [0, 0] },
            { type: 'L', params: [pWidth, 0] },
            { type: 'L', params: [pWidth, pHeight - pPointDrop] },
            { type: 'L', params: [pWidth / 2, pHeight] }, // Vértice inferior en punta
            { type: 'L', params: [0, pHeight - pPointDrop] },
            { type: 'L', params: [0, 0] },
            { type: 'Z', params: [] },
        ];
        const pocketSeam = createPath(pocketCommands, true);
        const pocketCut = generateSeamAllowanceOffset(pocketSeam, seamAllowanceMm, true);

        const pocketPiece: PatternPiece = {
            id: 'piece_shirt_pocket',
            name: 'Bolsillo de Parche Camisero',
            code: 'CAMISA_BOLSILLO',
            quantityToCut: 1,
            cutOnFold: false,
            fabricType: 'Tela principal',
            outlineSeam: pocketSeam,
            outlineCut: pocketCut,
            seamAllowanceMm,
            grainline: {
                start: pt(pWidth / 2, 20),
                end: pt(pWidth / 2, pHeight - 20),
                isFold: false,
                label: 'HILO DE LA TELA VERTICAL',
            },
            notches: [
                {
                    position: pt(0, 25),
                    angleRad: Math.PI,
                    lengthMm: 4,
                    label: 'Piquete de quiebre de dobladillo superior',
                    type: 'single',
                },
                {
                    position: pt(pWidth, 25),
                    angleRad: 0,
                    lengthMm: 4,
                    label: 'Piquete de quiebre de dobladillo superior',
                    type: 'single',
                },
            ],
            darts: [],
            labels: [
                {
                    text: 'BOLSILLO DE PARCHE — CORTAR 1',
                    position: pt(pWidth * 0.15, pHeight * 0.45),
                    fontSizeMm: 9,
                },
            ],
            boundingBox: calculateBoundingBox([pocketCut]),
        };

        pieces.push(pocketPiece);
    }

    // Métricas calculadas para ficha técnica y fitting
    calculatedValues.frontNeckLengthMm = frontNeckCurveMm;
    calculatedValues.backNeckLengthMm = backNeckCurveMm;
    calculatedValues.totalNecklinePerimeterMm = roundTo(totalHalfNecklineMm * 2, 2);
    calculatedValues.collarStandLengthMm = collar.standLengthMm;
    calculatedValues.frontArmholeLengthMm = frontArmholeLen;
    calculatedValues.backArmholeLengthMm = backArmholeLen;
    calculatedValues.totalArmholePerimeterMm = totalArmholePerimeter;
    calculatedValues.sleeveCapLengthMm = leftSleeve.capLengthMm;
    calculatedValues.sleeveCapEaseMm = leftSleeve.capEaseMm;
    calculatedValues.cuffTotalWidthMm = leftCuff.totalWidthMm;
    calculatedValues.shirtLengthMm = shirtLength;

    return {
        pieces,
        calculatedValues,
        warnings,
    };
}
