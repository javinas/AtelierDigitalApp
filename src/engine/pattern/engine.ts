// ==============================================================================
// ATELIER DIGITAL — MOTOR PARAMÉTRICO DE PATRONAJE NUCLEAR (M02.10)
// Archivo: src/engine/pattern/engine.ts
// ==============================================================================
// Motor determinístico, desacoplado y estrictamente tipado.
// No utiliza eval, ni dependencias de IA, ni frameworks de UI.
// Genera geometría reproducible en milímetros (mm) para alta costura.
// ==============================================================================

import { EaseProfile, EaseValues, GarmentDesignParameters } from '../../types/pattern/ease';
import { GarmentType, PatternValidationResult } from '../../types/pattern/pattern';
import { generateBodiceBlock } from './blocks/bodiceBlock';
import { generateBlouseBlock } from './blocks/blouseBlock';
import { generateDressBlock } from './blocks/dressBlock';
import { generatePantsBlock } from './blocks/pantsBlock';
import { generateSkirtBlock } from './blocks/skirtBlock';
import { generateSleeveBlock } from './blocks/sleeveBlock';
import { generateShirtBlock } from './blocks/shirtBlock';
import { generateCorsetBlock } from './blocks/corsetBlock';
import { generateJacketBlock } from './blocks/jacketBlock';
import { generateCoatBlock } from './blocks/coatBlock';
import { generateShirtDressBlock } from './blocks/shirtDressBlock';
import { generateTailoredVestBlock } from './blocks/tailoredVestBlock';
import { generateShortBlock } from './blocks/shortBlock';
import { generateCargoPantsBlock } from './blocks/cargoPantsBlock';
import { generateTrenchCoatBlock } from './blocks/trenchCoatBlock';
import { generateAtelierRobeBlock } from './blocks/atelierRobeBlock';
import { generateEveningGownBlock } from './blocks/eveningGownBlock';
import { generateBridalGownBlock } from './blocks/bridalGownBlock';
import { generateDrapedAsymmetricDressBlock } from './blocks/drapedAsymmetricDressBlock';
import { generateBomberJacketBlock } from './blocks/bomberJacketBlock';
import { generateDenimCoutureJacketBlock } from './blocks/denimCoutureJacketBlock';
import { validateGarmentRequirements } from './catalog/garmentPackages';
import { calculateBoundingBox, pt } from './geometry/geometry2d';
import { BoundingBox2D, PatternGeometryResult, PatternPiece } from './geometry/types';

export const PATTERN_ENGINE_VERSION = '1.0.0-couture';

export interface PatternEngineInput {
    garmentType: GarmentType;
    measurementsMm: Record<string, number>;
    ease: EaseProfile | EaseValues;
    designParameters?: Partial<GarmentDesignParameters>;
}

export interface PatternEngineExecutionResult {
    success: boolean;
    geometryResult: PatternGeometryResult;
    validationResult: PatternValidationResult;
    engineVersion: string;
    resolvedMeasurementsMm: Record<string, number>;
}

export function executePatternEngine(input: PatternEngineInput): PatternEngineExecutionResult {
    const { garmentType, measurementsMm, ease, designParameters = {} } = input;
    const easeValues: EaseValues = 'ease_values' in ease ? ease.ease_values : ease;

    // Normalizar parámetros de diseño con valores seguros
    const fullDesignParams: GarmentDesignParameters = {
        seam_allowance_default_mm: 10,
        hem_allowance_mm: 35,
        skirt_silhouette: 'straight',
        ...designParameters,
    };

    // 1. Validación determinística de requisitos de medidas
    const reqValidation = validateGarmentRequirements(garmentType, measurementsMm);
    const resolvedMeasurements = reqValidation.resolvedMeasurements;
    const validationResult = reqValidation.validationResult;

    if (!reqValidation.valid) {
        return {
            success: false,
            geometryResult: {
                pieces: [],
                boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
                warnings: validationResult.warnings,
                errors: validationResult.errors,
                engineVersion: PATTERN_ENGINE_VERSION,
                calculatedValues: {},
            },
            validationResult,
            engineVersion: PATTERN_ENGINE_VERSION,
            resolvedMeasurementsMm: resolvedMeasurements,
        };
    }

    const warnings: string[] = [...validationResult.warnings];
    const errors: string[] = [];
    let pieces: PatternPiece[] = [];
    const calculatedValues: Record<string, number> = {};

    // 2. Ejecutar generador de bloque según el tipo de prenda
    try {
        switch (garmentType) {
            case 'bodice': {
                const bodice = generateBodiceBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = [bodice.frontPiece, bodice.backPiece];
                warnings.push(...bodice.warnings);
                calculatedValues.frontArmholeLengthMm = bodice.frontArmholeLengthMm;
                calculatedValues.backArmholeLengthMm = bodice.backArmholeLengthMm;
                calculatedValues.sideSeamLengthMm = bodice.sideSeamLengthMm;
                break;
            }

            case 'sleeve': {
                // Calcular longitudes de sisa desde el corpiño base o estimadas si se llama aislada
                const fArmhole = resolvedMeasurements.profundidad_sisa
                    ? resolvedMeasurements.profundidad_sisa * 1.15
                    : 230;
                const bArmhole = fArmhole + 10;
                const sleeve = generateSleeveBlock(resolvedMeasurements, easeValues, fullDesignParams, fArmhole, bArmhole);
                pieces = [sleeve.sleevePiece];
                warnings.push(...sleeve.warnings);
                calculatedValues.capLengthMm = sleeve.capLengthMm;
                calculatedValues.armholePerimeterMm = sleeve.armholePerimeterMm;
                calculatedValues.capEaseMm = sleeve.capEaseMm;
                break;
            }

            case 'skirt': {
                const skirt = generateSkirtBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = [skirt.frontPiece, skirt.backPiece];
                warnings.push(...skirt.warnings);
                calculatedValues.waistLengthFrontMm = skirt.waistLengthFrontMm;
                calculatedValues.waistLengthBackMm = skirt.waistLengthBackMm;
                calculatedValues.hipLengthFrontMm = skirt.hipLengthFrontMm;
                calculatedValues.sideSeamLengthMm = skirt.sideSeamLengthMm;
                break;
            }

            case 'pants': {
                const pants = generatePantsBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = [pants.frontPiece, pants.backPiece];
                warnings.push(...pants.warnings);
                calculatedValues.crotchCurveFrontMm = pants.crotchCurveFrontMm;
                calculatedValues.crotchCurveBackMm = pants.crotchCurveBackMm;
                calculatedValues.inseamLengthMm = pants.inseamLengthMm;
                calculatedValues.outseamLengthMm = pants.outseamLengthMm;
                break;
            }

            case 'dress': {
                const dress = generateDressBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = dress.pieces;
                warnings.push(...dress.warnings);
                calculatedValues.waistCompatibilityDiffMm = dress.waistCompatibilityDiffMm;
                break;
            }

            case 'blouse': {
                const blouse = generateBlouseBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = blouse.pieces;
                warnings.push(...blouse.warnings);
                break;
            }

            case 'shirt': {
                const shirt = generateShirtBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = shirt.pieces;
                warnings.push(...shirt.warnings);
                Object.assign(calculatedValues, shirt.calculatedValues);
                break;
            }

            case 'corset': {
                const corset = generateCorsetBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = corset.pieces;
                warnings.push(...corset.warnings);
                Object.assign(calculatedValues, corset.calculatedValues);
                break;
            }

            case 'jacket': {
                const jacket = generateJacketBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = jacket.pieces;
                warnings.push(...jacket.warnings);
                Object.assign(calculatedValues, jacket.calculatedValues);
                break;
            }

            case 'coat': {
                const coat = generateCoatBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = coat.pieces;
                warnings.push(...coat.warnings);
                Object.assign(calculatedValues, coat.calculatedValues);
                break;
            }

            case 'shirt_dress': {
                const shirtDress = generateShirtDressBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = shirtDress.pieces;
                warnings.push(...shirtDress.warnings);
                Object.assign(calculatedValues, shirtDress.calculatedValues);
                break;
            }

            case 'tailored_vest': {
                const vest = generateTailoredVestBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = vest.pieces;
                warnings.push(...vest.warnings);
                Object.assign(calculatedValues, vest.calculatedValues);
                break;
            }

            case 'short': {
                const shortBlock = generateShortBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = shortBlock.pieces;
                warnings.push(...shortBlock.warnings);
                Object.assign(calculatedValues, shortBlock.calculatedValues);
                break;
            }

            case 'cargo_pants': {
                const cargo = generateCargoPantsBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = cargo.pieces;
                warnings.push(...cargo.warnings);
                Object.assign(calculatedValues, cargo.calculatedValues);
                break;
            }

            case 'trench_coat': {
                const trench = generateTrenchCoatBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = trench.pieces;
                warnings.push(...trench.warnings);
                Object.assign(calculatedValues, trench.calculatedValues);
                break;
            }

            case 'atelier_robe': {
                const robe = generateAtelierRobeBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = robe.pieces;
                warnings.push(...robe.warnings);
                Object.assign(calculatedValues, robe.calculatedValues);
                break;
            }

            case 'evening_gown': {
                const evening = generateEveningGownBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = evening.pieces;
                warnings.push(...evening.warnings);
                Object.assign(calculatedValues, evening.calculatedValues);
                break;
            }

            case 'bridal_gown': {
                const bridal = generateBridalGownBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = bridal.pieces;
                warnings.push(...bridal.warnings);
                Object.assign(calculatedValues, bridal.calculatedValues);
                break;
            }

            case 'draped_asymmetric_dress': {
                const draped = generateDrapedAsymmetricDressBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = draped.pieces;
                warnings.push(...draped.warnings);
                Object.assign(calculatedValues, draped.calculatedValues);
                break;
            }

            case 'bomber_jacket': {
                const bomber = generateBomberJacketBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = bomber.pieces;
                warnings.push(...bomber.warnings);
                Object.assign(calculatedValues, bomber.calculatedValues);
                break;
            }

            case 'denim_couture_jacket': {
                const denim = generateDenimCoutureJacketBlock(resolvedMeasurements, easeValues, fullDesignParams);
                pieces = denim.pieces;
                warnings.push(...denim.warnings);
                Object.assign(calculatedValues, denim.calculatedValues);
                break;
            }

            default:
                throw new Error(`Tipo de prenda no soportado: ${garmentType}`);
        }

        // 3. Verificaciones de integridad geométrica
        for (const piece of pieces) {
            // Verificar contornos cerrados
            if (!piece.outlineSeam.isClosed) {
                errors.push(`La pieza "${piece.name}" posee una línea de costura no cerrada.`);
            }
            // Verificar límites dimensionales
            if (piece.boundingBox.width <= 0 || piece.boundingBox.height <= 0) {
                errors.push(`Geometría degenerada detectada en la pieza "${piece.name}".`);
            }
        }

        // 4. Disponer las piezas en el plano de visualización con margen entre sí
        // Desplazamiento horizontal para que no se superpongan en el lienzo
        let offsetX = 0;
        const arrangedPieces: PatternPiece[] = pieces.map((piece) => {
            const shiftX = offsetX - piece.boundingBox.minX;
            const shiftY = -piece.boundingBox.minY;

            // Trasladar comandos de trayectoria
            const translatePath = (path: typeof piece.outlineSeam) => ({
                ...path,
                commands: path.commands.map((cmd) => {
                    if (cmd.type === 'M' || cmd.type === 'L') {
                        return { type: cmd.type, params: [cmd.params[0] + shiftX, cmd.params[1] + shiftY] };
                    }
                    if (cmd.type === 'C') {
                        return {
                            type: cmd.type,
                            params: [
                                cmd.params[0] + shiftX, cmd.params[1] + shiftY,
                                cmd.params[2] + shiftX, cmd.params[3] + shiftY,
                                cmd.params[4] + shiftX, cmd.params[5] + shiftY,
                            ],
                        };
                    }
                    return cmd;
                }),
            });

            const newSeam = translatePath(piece.outlineSeam);
            const newCut = translatePath(piece.outlineCut);

            const newGrainline = {
                ...piece.grainline,
                start: pt(piece.grainline.start.x + shiftX, piece.grainline.start.y + shiftY),
                end: pt(piece.grainline.end.x + shiftX, piece.grainline.end.y + shiftY),
            };

            const newNotches = piece.notches.map((n) => ({
                ...n,
                position: pt(n.position.x + shiftX, n.position.y + shiftY),
            }));

            const newDarts = piece.darts.map((d) => ({
                ...d,
                apex: pt(d.apex.x + shiftX, d.apex.y + shiftY),
                leftBase: pt(d.leftBase.x + shiftX, d.leftBase.y + shiftY),
                rightBase: pt(d.rightBase.x + shiftX, d.rightBase.y + shiftY),
            }));

            const newLabels = piece.labels.map((l) => ({
                ...l,
                position: pt(l.position.x + shiftX, l.position.y + shiftY),
            }));

            const newBBox = calculateBoundingBox([newCut]);

            // Espaciado de 80 mm entre piezas adyacentes
            offsetX += newBBox.width + 80;

            return {
                ...piece,
                outlineSeam: newSeam,
                outlineCut: newCut,
                grainline: newGrainline,
                notches: newNotches,
                darts: newDarts,
                labels: newLabels,
                boundingBox: newBBox,
            };
        });

        const allCutPaths = arrangedPieces.map((p) => p.outlineCut);
        const globalBoundingBox = calculateBoundingBox(allCutPaths);

        return {
            success: errors.length === 0,
            geometryResult: {
                pieces: arrangedPieces,
                boundingBox: globalBoundingBox,
                warnings,
                errors,
                engineVersion: PATTERN_ENGINE_VERSION,
                calculatedValues,
            },
            validationResult: {
                ...validationResult,
                valid: errors.length === 0,
                errors: [...validationResult.errors, ...errors],
                warnings,
            },
            engineVersion: PATTERN_ENGINE_VERSION,
            resolvedMeasurementsMm: resolvedMeasurements,
        };
    } catch (err: any) {
        errors.push(`Error en ejecución del motor paramétrico: ${err?.message || err}`);
        return {
            success: false,
            geometryResult: {
                pieces: [],
                boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
                warnings,
                errors,
                engineVersion: PATTERN_ENGINE_VERSION,
                calculatedValues: {},
            },
            validationResult: {
                ...validationResult,
                valid: false,
                errors,
                warnings,
            },
            engineVersion: PATTERN_ENGINE_VERSION,
            resolvedMeasurementsMm: resolvedMeasurements,
        };
    }
}
