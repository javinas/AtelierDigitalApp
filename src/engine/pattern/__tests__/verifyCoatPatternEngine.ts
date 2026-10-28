// ==============================================================================
// ATELIER DIGITAL — SUITE DE PRUEBAS DEL MOTOR: ABRIGO SASTRE DE ALTA COSTURA (C16)
// Archivo: src/engine/pattern/__tests__/verifyCoatPatternEngine.ts
// ==============================================================================

import { executePatternEngine } from '../engine';
import { exportPatternToDxf, validateGeometryForCadExport } from '../export/dxfExporter';
import { GARMENT_PACKAGES, validateGarmentRequirements } from '../catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../catalog/masterCatalog';
import { STANDARD_EASE_PROFILES } from '../../../services/patternService';

export interface CoatTestResult {
    id: string;
    name: string;
    passed: boolean;
    details: string;
}

export function runCoatEngineTests(): CoatTestResult[] {
    const results: CoatTestResult[] = [];
    const relaxedEase = STANDARD_EASE_PROFILES.find((p) => p.code === 'relaxed') || STANDARD_EASE_PROFILES[0];

    const standardCoatMeasurements: Record<string, number> = {
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
        profundidad_sisa: 240,
        largo_abrigo: 1100,
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
    assert('C16.1', 'Reconocimiento de coat en catálogo de paquetes', () => {
        const pkg = GARMENT_PACKAGES['coat'];
        if (!pkg || pkg.garmentType !== 'coat') throw new Error('Paquete de coat no encontrado');
        return `Paquete ${pkg.name} reconocido correctamente.`;
    });

    // 2. Medidas de catálogo
    assert('C16.2', 'Presencia de largo_abrigo en catálogo maestro', () => {
        const item = MEASUREMENT_MAP['largo_abrigo'];
        if (!item || item.code !== 'largo_abrigo') throw new Error('Medida largo_abrigo ausente en MEASUREMENT_MAP');
        return `Medida ${item.name} (${item.code}) presente en catálogo maestro.`;
    });

    // 3. Validación de medidas completas
    assert('C16.3', 'Validación exitosa de medidas completas de abrigo sastre', () => {
        const val = validateGarmentRequirements('coat', standardCoatMeasurements);
        if (!val.valid) throw new Error('Validación falló para medidas completas: ' + val.validationResult.errors.join(', '));
        return 'Requisitos validados correctamente.';
    });

    // 4. Bloqueo por falta de medida obligatoria
    assert('C16.4', 'Bloqueo ante falta de contorno_busto', () => {
        const incomplete = { ...standardCoatMeasurements };
        delete (incomplete as any).contorno_busto;
        const val = validateGarmentRequirements('coat', incomplete);
        if (val.valid) throw new Error('Se permitió generar abrigo sin contorno_busto');
        if (!val.validationResult.missingRequiredMeasurements.includes('contorno_busto')) {
            throw new Error('contorno_busto no figura en missingRequiredMeasurements');
        }
        return 'Bloqueo estricto verificado.';
    });

    // 5. Fallback calculable
    assert('C16.5', 'Fallback calculable de largo_abrigo cuando no se ingresa', () => {
        const withoutCoatLength = { ...standardCoatMeasurements };
        delete (withoutCoatLength as any).largo_abrigo;
        const val = validateGarmentRequirements('coat', withoutCoatLength);
        if (!val.valid) throw new Error('Fallo al resolver fallback');
        if (!val.resolvedMeasurements.largo_abrigo || val.resolvedMeasurements.largo_abrigo <= 0) {
            throw new Error('Fallback de largo_abrigo no resolvió un número válido');
        }
        return `Largo calculado por fallback: ${val.resolvedMeasurements.largo_abrigo} mm.`;
    });

    // 6. Generación geométrica
    assert('C16.6', 'Generación geométrica completa de abrigo sastre (17 piezas)', () => {
        const engineResult = executePatternEngine({
            garmentType: 'coat',
            measurementsMm: standardCoatMeasurements,
            ease: relaxedEase,
            designParameters: {
                seam_allowance_default_mm: 12,
                coat_length_mm: 1100,
                coat_belt_presence: true,
            },
        });
        if (!engineResult.success) {
            throw new Error('executePatternEngine falló: ' + engineResult.validationResult.errors.join(', '));
        }
        if (engineResult.geometryResult.pieces.length !== 17) {
            throw new Error(`Se esperaban 17 piezas sastre de abrigo, pero se generaron ${engineResult.geometryResult.pieces.length}`);
        }
        return `Generadas exitosamente ${engineResult.geometryResult.pieces.length} piezas geométricas de abrigo sastre.`;
    });

    // 7. Piezas específicas generadas
    assert('C16.7', 'Verificación de códigos de piezas de abrigo generadas', () => {
        const engineResult = executePatternEngine({
            garmentType: 'coat',
            measurementsMm: standardCoatMeasurements,
            ease: relaxedEase,
        });
        const expectedCodes = [
            'COAT_DEL_IZQ',
            'COAT_DEL_DER',
            'COAT_COSTADILLO_DEL_IZQ',
            'COAT_COSTADILLO_DEL_DER',
            'COAT_ESP_CENTRAL_IZQ',
            'COAT_ESP_CENTRAL_DER',
            'COAT_COSTADILLO_ESP_IZQ',
            'COAT_COSTADILLO_ESP_DER',
            'COAT_CUELLO_PIE',
            'COAT_CUELLO_PALA',
            'COAT_MANGA_SUPERIOR_IZQ',
            'COAT_MANGA_SUPERIOR_DER',
            'COAT_MANGA_INFERIOR_IZQ',
            'COAT_MANGA_INFERIOR_DER',
            'COAT_BOLSILLO_CARTERA_IZQ',
            'COAT_BOLSILLO_CARTERA_DER',
            'COAT_CINTURON',
        ];
        const generatedCodes = engineResult.geometryResult.pieces.map((p) => p.code);
        for (const code of expectedCodes) {
            if (!generatedCodes.includes(code)) {
                throw new Error(`Pieza requerida de abrigo "${code}" no fue encontrada en la salida del motor.`);
            }
        }
        return 'Todos los 17 códigos de abrigo sastre fueron generados y verificados.';
    });

    // 8. Integridad numérica (sin NaN ni Infinity)
    assert('C16.8', 'Ausencia total de NaN e Infinity en geometrías de abrigo', () => {
        const engineResult = executePatternEngine({
            garmentType: 'coat',
            measurementsMm: standardCoatMeasurements,
            ease: relaxedEase,
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
    assert('C16.9', 'Contornos de costura y corte completamente cerrados', () => {
        const engineResult = executePatternEngine({
            garmentType: 'coat',
            measurementsMm: standardCoatMeasurements,
            ease: relaxedEase,
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
    assert('C16.10', 'Compatibilidad y validación CAD DXF R12', () => {
        const engineResult = executePatternEngine({
            garmentType: 'coat',
            measurementsMm: standardCoatMeasurements,
            ease: relaxedEase,
        });
        const cadVal = validateGeometryForCadExport(engineResult.geometryResult);
        if (!cadVal.valid) {
            throw new Error('Validación previa a exportación DXF falló: ' + cadVal.errors.join(', '));
        }
        const dxf = exportPatternToDxf(engineResult.geometryResult, 'Atelier Digital — Abrigo Sastre');
        if (!dxf || !dxf.includes('AC1009') || !dxf.includes('EOF')) {
            throw new Error('El archivo DXF generado no cumple con el estándar AutoCAD R12 ASCII');
        }
        return `Archivo DXF R12 generado exitosamente (${dxf.length} caracteres).`;
    });

    return results;
}
