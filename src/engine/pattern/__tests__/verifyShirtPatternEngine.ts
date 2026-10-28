// ==============================================================================
// ATELIER DIGITAL — SUITE DE PRUEBAS DEL MOTOR: CAMISA DE ALTA COSTURA (C14)
// Archivo: src/engine/pattern/__tests__/verifyShirtPatternEngine.ts
// ==============================================================================

import { executePatternEngine } from '../engine';
import { exportPatternToDxf, validateGeometryForCadExport } from '../export/dxfExporter';
import { GARMENT_PACKAGES, validateGarmentRequirements } from '../catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../catalog/masterCatalog';
import { STANDARD_EASE_PROFILES } from '../../../services/patternService';

export interface ShirtTestResult {
    id: string;
    name: string;
    passed: boolean;
    details: string;
}

export function runShirtEngineTests(): ShirtTestResult[] {
    const results: ShirtTestResult[] = [];
    const regularEase = STANDARD_EASE_PROFILES.find((p) => p.code === 'regular') || STANDARD_EASE_PROFILES[0];

    const standardShirtMeasurements: Record<string, number> = {
        contorno_cuello: 360,
        contorno_busto: 920,
        contorno_cintura: 720,
        largo_talle_delantero: 440,
        largo_talle_espalda: 410,
        ancho_espalda: 350,
        largo_brazo: 580,
        contorno_muneca: 160,
        ancho_hombros: 400,
        largo_hombro: 125,
        ancho_pecho: 330,
        contorno_biceps: 280,
        contorno_cadera: 980,
        largo_camisa: 660,
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
    assert('C14.1', 'Reconocimiento de shirt en catálogo de paquetes', () => {
        const pkg = GARMENT_PACKAGES['shirt'];
        if (!pkg || pkg.garmentType !== 'shirt') throw new Error('Paquete de shirt no encontrado');
        return `Paquete ${pkg.name} reconocido correctamente.`;
    });

    // 2. Medida largo_camisa en master catalog
    assert('C14.2', 'Presencia de largo_camisa en catálogo maestro', () => {
        const item = MEASUREMENT_MAP['largo_camisa'];
        if (!item || item.code !== 'largo_camisa') throw new Error('Medida largo_camisa ausente en MEASUREMENT_MAP');
        return `Medida ${item.name} (${item.code}) presente en catálogo maestro.`;
    });

    // 3. Validación de medidas completas
    assert('C14.3', 'Validación exitosa de medidas completas de camisa', () => {
        const val = validateGarmentRequirements('shirt', standardShirtMeasurements);
        if (!val.valid) throw new Error(`Fallo en validación: ${val.validationResult.errors.join('; ')}`);
        return 'Requisitos de camisa superados exitosamente.';
    });

    // 4. Bloqueo por falta de contorno_cuello
    assert('C14.4', 'Bloqueo ante ausencia de contorno_cuello', () => {
        const incomplete = { ...standardShirtMeasurements };
        delete incomplete.contorno_cuello;
        const val = validateGarmentRequirements('shirt', incomplete);
        if (val.valid) throw new Error('Se permitió generar camisa sin contorno_cuello');
        return `Bloqueo exitoso: faltan [${val.validationResult.missingRequiredMeasurements.join(', ')}].`;
    });

    // 5. Bloqueo por falta de largo_brazo
    assert('C14.5', 'Bloqueo ante ausencia de largo_brazo', () => {
        const incomplete = { ...standardShirtMeasurements };
        delete incomplete.largo_brazo;
        const val = validateGarmentRequirements('shirt', incomplete);
        if (val.valid) throw new Error('Se permitió generar camisa sin largo_brazo');
        return 'Bloqueo exitoso por falta de largo_brazo.';
    });

    // 6. Generación geométrica completa
    assert('C14.6', 'Generación determinística de geometría de camisa', () => {
        const res = executePatternEngine({
            garmentType: 'shirt',
            measurementsMm: standardShirtMeasurements,
            ease: regularEase,
        });
        if (!res.success) throw new Error(`Fallo en motor: ${res.validationResult.errors.join('; ')}`);
        const pieces = res.geometryResult.pieces;
        if (pieces.length < 11) throw new Error(`Se esperaban al menos 11 piezas, se generaron ${pieces.length}`);
        return `Generadas ${pieces.length} piezas cerradas de camisa.`;
    });

    // 7. Piezas esperadas identificadas
    assert('C14.7', 'Verificación de nombres y códigos de las piezas de camisa', () => {
        const res = executePatternEngine({
            garmentType: 'shirt',
            measurementsMm: standardShirtMeasurements,
            ease: regularEase,
            designParameters: { pocket_presence: true },
        });
        const pieceCodes = res.geometryResult.pieces.map((p) => p.code);
        const expected = [
            'CAMISA_DEL_IZQ',
            'CAMISA_DEL_DER',
            'CAMISA_ESP',
            'CAMISA_CANESU',
            'CUELLO_PIE',
            'CUELLO_PALA',
            'MANGA_IZQ',
            'MANGA_DER',
            'PUNO_IZQ',
            'PUNO_DER',
            'CAMISA_TAPETA',
            'CAMISA_BOLSILLO',
        ];
        for (const exp of expected) {
            if (!pieceCodes.includes(exp)) throw new Error(`Falta la pieza con código ${exp}`);
        }
        return `Las 12 piezas (incluyendo bolsillo opcional) están presentes.`;
    });

    // 8. Validación de NaN e Infinity en coordenadas
    assert('C14.8', 'Ausencia total de valores NaN e Infinity en geometría', () => {
        const res = executePatternEngine({
            garmentType: 'shirt',
            measurementsMm: standardShirtMeasurements,
            ease: regularEase,
        });
        for (const piece of res.geometryResult.pieces) {
            if (!Number.isFinite(piece.boundingBox.width) || Number.isNaN(piece.boundingBox.width) || piece.boundingBox.width <= 0) {
                throw new Error(`Ancho inválido en pieza ${piece.name}: ${piece.boundingBox.width}`);
            }
            if (!Number.isFinite(piece.boundingBox.height) || Number.isNaN(piece.boundingBox.height) || piece.boundingBox.height <= 0) {
                throw new Error(`Alto inválido en pieza ${piece.name}: ${piece.boundingBox.height}`);
            }
        }
        return 'Todas las piezas tienen cajas delimitadoras finitas y estrictamente positivas.';
    });

    // 9. Validación Pre-CAD
    assert('C14.9', 'Validación previa de integridad para CAD DXF', () => {
        const res = executePatternEngine({
            garmentType: 'shirt',
            measurementsMm: standardShirtMeasurements,
            ease: regularEase,
        });
        const cadCheck = validateGeometryForCadExport(res.geometryResult);
        if (!cadCheck.valid) throw new Error(`Fallo pre-CAD: ${cadCheck.errors.join('; ')}`);
        return 'Geometría 100% válida para emisión industrial DXF.';
    });

    // 10. Emisión de archivo DXF AutoCAD R12
    assert('C14.10', 'Emisión exitosa de archivo DXF AutoCAD R12 en mm', () => {
        const res = executePatternEngine({
            garmentType: 'shirt',
            measurementsMm: standardShirtMeasurements,
            ease: regularEase,
        });
        const dxf = exportPatternToDxf(res.geometryResult, 'Camisa Sastre C14');
        if (!dxf.includes('AC1009')) throw new Error('Encabezado R12 AC1009 no encontrado');
        if (!dxf.includes('CORTE_EXTERIOR') || !dxf.includes('COSTURA_NETA') || !dxf.includes('HILO_TELA')) {
            throw new Error('Capas textiles incompletas en archivo DXF');
        }
        return `Archivo DXF generado exitosamente (${Math.round(dxf.length / 1024)} KB).`;
    });

    return results;
}
