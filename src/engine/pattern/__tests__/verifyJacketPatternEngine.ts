// ==============================================================================
// ATELIER DIGITAL — SUITE DE PRUEBAS DEL MOTOR: CHAQUETA SASTRE DE ALTA COSTURA (C15)
// Archivo: src/engine/pattern/__tests__/verifyJacketPatternEngine.ts
// ==============================================================================

import { executePatternEngine } from '../engine';
import { exportPatternToDxf, validateGeometryForCadExport } from '../export/dxfExporter';
import { GARMENT_PACKAGES, validateGarmentRequirements } from '../catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../catalog/masterCatalog';
import { STANDARD_EASE_PROFILES } from '../../../services/patternService';

export interface JacketTestResult {
    id: string;
    name: string;
    passed: boolean;
    details: string;
}

export function runJacketEngineTests(): JacketTestResult[] {
    const results: JacketTestResult[] = [];
    const regularEase = STANDARD_EASE_PROFILES.find((p) => p.code === 'regular') || STANDARD_EASE_PROFILES[0];

    const standardJacketMeasurements: Record<string, number> = {
        contorno_busto: 920,
        contorno_cintura: 720,
        contorno_cadera: 980,
        largo_talle_delantero: 440,
        largo_talle_espalda: 410,
        ancho_espalda: 350,
        largo_brazo: 580,
        contorno_biceps: 280,
        contorno_cuello: 360,
        ancho_hombros: 400,
        largo_hombro: 125,
        ancho_pecho: 330,
        altura_busto: 260,
        separacion_busto: 190,
        contorno_muneca: 165,
        profundidad_sisa: 235,
        largo_chaqueta: 700,
    };

    function assert(id: string, name: string, fn: () => string) {
        try {
            const details = fn();
            results.push({ id, name, passed: true, details });
        } catch (err: any) {
            results.push({ id, name, passed: false, details: err.message });
        }
    }

    // 1. Catálogo y Garment Package
    assert('C15.1', 'Reconocimiento de jacket en catálogo de paquetes', () => {
        const pkg = GARMENT_PACKAGES['jacket'];
        if (!pkg || pkg.garmentType !== 'jacket') throw new Error('Paquete de jacket no encontrado');
        return `Paquete ${pkg.name} reconocido correctamente.`;
    });

    // 2. Medidas de catálogo
    assert('C15.2', 'Presencia de largo_chaqueta en catálogo maestro', () => {
        const item = MEASUREMENT_MAP['largo_chaqueta'];
        if (!item || item.code !== 'largo_chaqueta') throw new Error('Medida largo_chaqueta ausente en MEASUREMENT_MAP');
        return `Medida ${item.name} (${item.code}) presente en catálogo maestro.`;
    });

    // 3. Validación de medidas completas
    assert('C15.3', 'Validación exitosa de medidas completas de chaqueta sastre', () => {
        const val = validateGarmentRequirements('jacket', standardJacketMeasurements);
        if (!val.valid) throw new Error('Validación falló para medidas completas: ' + val.validationResult.errors.join(', '));
        return 'Requisitos validados correctamente.';
    });

    // 4. Bloqueo por falta de medida obligatoria
    assert('C15.4', 'Bloqueo ante falta de contorno_busto', () => {
        const incomplete = { ...standardJacketMeasurements };
        delete (incomplete as any).contorno_busto;
        const val = validateGarmentRequirements('jacket', incomplete);
        if (val.valid) throw new Error('Se permitió generar chaqueta sin contorno_busto');
        if (!val.validationResult.missingRequiredMeasurements.includes('contorno_busto')) {
            throw new Error('contorno_busto no figura en missingRequiredMeasurements');
        }
        return 'Bloqueo estricto verificado.';
    });

    // 5. Fallback calculable
    assert('C15.5', 'Fallback calculable de largo_chaqueta cuando no se ingresa', () => {
        const withoutJacketLength = { ...standardJacketMeasurements };
        delete (withoutJacketLength as any).largo_chaqueta;
        const val = validateGarmentRequirements('jacket', withoutJacketLength);
        if (!val.valid) throw new Error('Fallo al resolver fallback');
        if (!val.resolvedMeasurements.largo_chaqueta || val.resolvedMeasurements.largo_chaqueta <= 0) {
            throw new Error('Fallback de largo_chaqueta no resolvió un número válido');
        }
        return `Largo calculado por fallback: ${val.resolvedMeasurements.largo_chaqueta} mm.`;
    });

    // 6. Generación geométrica
    assert('C15.6', 'Generación geométrica completa de chaqueta sastre (16 piezas)', () => {
        const engineResult = executePatternEngine({
            garmentType: 'jacket',
            measurementsMm: standardJacketMeasurements,
            ease: regularEase,
            designParameters: {
                seam_allowance_default_mm: 10,
                jacket_length_mm: 700,
                jacket_pocket_presence: true,
            },
        });
        if (!engineResult.success) {
            throw new Error('executePatternEngine falló: ' + engineResult.validationResult.errors.join(', '));
        }
        if (engineResult.geometryResult.pieces.length !== 16) {
            throw new Error(`Se esperaban 16 piezas sastre, pero se generaron ${engineResult.geometryResult.pieces.length}`);
        }
        return `Generadas exitosamente ${engineResult.geometryResult.pieces.length} piezas geométricas sastre.`;
    });

    // 7. Piezas específicas generadas
    assert('C15.7', 'Verificación de códigos de piezas sastre generadas', () => {
        const engineResult = executePatternEngine({
            garmentType: 'jacket',
            measurementsMm: standardJacketMeasurements,
            ease: regularEase,
        });
        const expectedCodes = [
            'JACKET_DEL_IZQ',
            'JACKET_DEL_DER',
            'JACKET_COSTADILLO_DEL_IZQ',
            'JACKET_COSTADILLO_DEL_DER',
            'JACKET_ESP_CENTRAL_IZQ',
            'JACKET_ESP_CENTRAL_DER',
            'JACKET_COSTADILLO_ESP_IZQ',
            'JACKET_COSTADILLO_ESP_DER',
            'JACKET_CUELLO_PIE',
            'JACKET_CUELLO_PALA',
            'JACKET_MANGA_SUPERIOR_IZQ',
            'JACKET_MANGA_SUPERIOR_DER',
            'JACKET_MANGA_INFERIOR_IZQ',
            'JACKET_MANGA_INFERIOR_DER',
            'JACKET_BOLSILLO_CARTERA_IZQ',
            'JACKET_BOLSILLO_CARTERA_DER',
        ];
        const generatedCodes = engineResult.geometryResult.pieces.map((p) => p.code);
        for (const code of expectedCodes) {
            if (!generatedCodes.includes(code)) {
                throw new Error(`Pieza sastre requerida "${code}" no fue encontrada en la salida del motor.`);
            }
        }
        return 'Todos los 16 códigos sastre fueron generados y verificados.';
    });

    // 8. Integridad numérica (sin NaN ni Infinity)
    assert('C15.8', 'Ausencia total de NaN e Infinity en geometrías de chaqueta', () => {
        const engineResult = executePatternEngine({
            garmentType: 'jacket',
            measurementsMm: standardJacketMeasurements,
            ease: regularEase,
        });
        for (const piece of engineResult.geometryResult.pieces) {
            for (const cmd of piece.outlineSeam.commands) {
                for (const param of cmd.params) {
                    if (Number.isNaN(param) || !Number.isFinite(param)) {
                        throw new Error(`Parámetro inválido (${param}) en outlineSeam de ${piece.code}`);
                    }
                }
            }
            for (const cmd of piece.outlineCut.commands) {
                for (const param of cmd.params) {
                    if (Number.isNaN(param) || !Number.isFinite(param)) {
                        throw new Error(`Parámetro inválido (${param}) en outlineCut de ${piece.code}`);
                    }
                }
            }
        }
        return 'Todas las coordenadas y parámetros numéricos son estrictamente finitos y válidos.';
    });

    // 9. Contornos cerrados
    assert('C15.9', 'Contornos de costura y corte completamente cerrados', () => {
        const engineResult = executePatternEngine({
            garmentType: 'jacket',
            measurementsMm: standardJacketMeasurements,
            ease: regularEase,
        });
        for (const piece of engineResult.geometryResult.pieces) {
            if (!piece.outlineSeam.isClosed) {
                throw new Error(`outlineSeam no está cerrado en ${piece.code}`);
            }
            if (!piece.outlineCut.isClosed) {
                throw new Error(`outlineCut no está cerrado en ${piece.code}`);
            }
        }
        return 'Todas las piezas tienen trayectorias de costura y corte herméticamente cerradas.';
    });

    // 10. Compatibilidad CAD DXF R12
    assert('C15.10', 'Compatibilidad y validación CAD DXF R12', () => {
        const engineResult = executePatternEngine({
            garmentType: 'jacket',
            measurementsMm: standardJacketMeasurements,
            ease: regularEase,
        });
        const cadVal = validateGeometryForCadExport(engineResult.geometryResult);
        if (!cadVal.valid) {
            throw new Error('Validación previa a exportación DXF falló: ' + cadVal.errors.join(', '));
        }
        const dxf = exportPatternToDxf(engineResult.geometryResult, 'Atelier Digital — Chaqueta Sastre');
        if (!dxf || !dxf.includes('AC1009') || !dxf.includes('EOF')) {
            throw new Error('El archivo DXF generado no cumple con el estándar AutoCAD R12 ASCII');
        }
        return `Archivo DXF R12 generado exitosamente (${dxf.length} caracteres).`;
    });

    return results;
}
