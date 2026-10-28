// ==============================================================================
// ATELIER DIGITAL — SUITE DE PRUEBAS DEL MOTOR: CORSÉ DE ALTA COSTURA (C14-C)
// Archivo: src/engine/pattern/__tests__/verifyCorsetPatternEngine.ts
// ==============================================================================

import { executePatternEngine } from '../engine';
import { exportPatternToDxf, validateGeometryForCadExport } from '../export/dxfExporter';
import { GARMENT_PACKAGES, validateGarmentRequirements } from '../catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../catalog/masterCatalog';
import { STANDARD_EASE_PROFILES } from '../../../services/patternService';

export interface CorsetTestResult {
    id: string;
    name: string;
    passed: boolean;
    details: string;
}

export function runCorsetEngineTests(): CorsetTestResult[] {
    const results: CorsetTestResult[] = [];
    const fittedEase = STANDARD_EASE_PROFILES.find((p) => p.code === 'fitted') || STANDARD_EASE_PROFILES[0];

    const standardCorsetMeasurements: Record<string, number> = {
        contorno_busto: 920,
        contorno_cintura: 720,
        largo_talle_delantero: 440,
        largo_talle_espalda: 410,
        altura_busto: 260,
        separacion_busto: 190,
        contorno_bajo_busto: 780,
        contorno_cadera_alta: 860,
        ancho_espalda: 350,
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
    assert('C14-C.1', 'Reconocimiento de corset en catálogo de paquetes', () => {
        const pkg = GARMENT_PACKAGES['corset'];
        if (!pkg || pkg.garmentType !== 'corset') throw new Error('Paquete de corset no encontrado');
        return `Paquete ${pkg.name} reconocido correctamente.`;
    });

    // 2. Medidas obligatorias en master catalog
    assert('C14-C.2', 'Presencia de contorno_bajo_busto en catálogo maestro', () => {
        const item = MEASUREMENT_MAP['contorno_bajo_busto'];
        if (!item || item.code !== 'contorno_bajo_busto') throw new Error('Medida contorno_bajo_busto ausente en MEASUREMENT_MAP');
        return `Medida ${item.name} (${item.code}) presente en catálogo maestro.`;
    });

    // 3. Validación de medidas completas
    assert('C14-C.3', 'Validación exitosa de medidas completas de corsé', () => {
        const val = validateGarmentRequirements('corset', standardCorsetMeasurements);
        if (!val.valid) throw new Error(`Fallo en validación: ${val.validationResult.errors.join('; ')}`);
        return 'Requisitos de corsé superados exitosamente.';
    });

    // 4. Bloqueo por falta de contorno_cintura
    assert('C14-C.4', 'Bloqueo categórico ante ausencia de contorno_cintura', () => {
        const incomplete = { ...standardCorsetMeasurements };
        delete incomplete.contorno_cintura;
        const val = validateGarmentRequirements('corset', incomplete);
        if (val.valid) throw new Error('El motor no bloqueó la falta de cintura en corsé');
        if (!val.validationResult.missingRequiredMeasurements.includes('contorno_cintura')) {
            throw new Error('contorno_cintura no está registrado como faltante');
        }
        return 'Bloqueo determinístico verificado ante medida obligatoria faltante.';
    });

    // 5. Fallback automático de bajo busto
    assert('C14-C.5', 'Cálculo determinístico proporcional de contorno_bajo_busto si no fue tomada', () => {
        const withoutUnderbust = { ...standardCorsetMeasurements };
        delete withoutUnderbust.contorno_bajo_busto;
        const val = validateGarmentRequirements('corset', withoutUnderbust);
        if (!val.valid) throw new Error('Falló la validación con fallback calculable');
        if (!val.resolvedMeasurements.contorno_bajo_busto || val.resolvedMeasurements.contorno_bajo_busto <= 0) {
            throw new Error('No se calculó contorno_bajo_busto mediante fallback');
        }
        return `Bajo busto calculado proporcionalmente: ${val.resolvedMeasurements.contorno_bajo_busto} mm.`;
    });

    // 6. Generación geométrica completa
    assert('C14-C.6', 'Generación de las 10 piezas cerradas del corsé sastre', () => {
        const res = executePatternEngine({
            garmentType: 'corset',
            measurementsMm: standardCorsetMeasurements,
            ease: fittedEase,
        });
        if (!res.success) throw new Error(`Fallo en motor: ${res.validationResult.errors.join('; ')}`);
        const pieces = res.geometryResult.pieces;
        if (pieces.length !== 10) throw new Error(`Se esperaban exactamente 10 piezas de corsé, se generaron ${pieces.length}`);
        return `Generadas ${pieces.length} piezas cerradas de corsé estructurado.`;
    });

    // 7. Piezas esperadas identificadas
    assert('C14-C.7', 'Verificación de nombres y códigos de las 10 piezas de corsé', () => {
        const res = executePatternEngine({
            garmentType: 'corset',
            measurementsMm: standardCorsetMeasurements,
            ease: fittedEase,
        });
        const pieceCodes = res.geometryResult.pieces.map((p) => p.code);
        const expected = [
            'CORSET_DEL_CENTRAL_IZQ',
            'CORSET_DEL_CENTRAL_DER',
            'CORSET_DEL_LAT_IZQ',
            'CORSET_DEL_LAT_DER',
            'CORSET_COSTADILLO_IZQ',
            'CORSET_COSTADILLO_DER',
            'CORSET_ESP_LAT_IZQ',
            'CORSET_ESP_LAT_DER',
            'CORSET_ESP_CENTRAL_IZQ',
            'CORSET_ESP_CENTRAL_DER',
        ];
        for (const exp of expected) {
            if (!pieceCodes.includes(exp)) throw new Error(`Falta la pieza con código ${exp}`);
        }
        return 'Los 10 paneles anatómicos (5 por lado) están presentes y correctamente identificados.';
    });

    // 8. Validación de NaN e Infinity en coordenadas
    assert('C14-C.8', 'Ausencia total de valores NaN e Infinity en geometría de corsé', () => {
        const res = executePatternEngine({
            garmentType: 'corset',
            measurementsMm: standardCorsetMeasurements,
            ease: fittedEase,
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
    assert('C14-C.9', 'Validación previa de integridad para CAD DXF de corsé', () => {
        const res = executePatternEngine({
            garmentType: 'corset',
            measurementsMm: standardCorsetMeasurements,
            ease: fittedEase,
        });
        const cadCheck = validateGeometryForCadExport(res.geometryResult);
        if (!cadCheck.valid) throw new Error(`Fallo pre-CAD: ${cadCheck.errors.join('; ')}`);
        return 'Geometría 100% válida para emisión industrial DXF.';
    });

    // 10. Emisión de archivo DXF AutoCAD R12
    assert('C14-C.10', 'Emisión exitosa de archivo DXF AutoCAD R12 en mm para corsé', () => {
        const res = executePatternEngine({
            garmentType: 'corset',
            measurementsMm: standardCorsetMeasurements,
            ease: fittedEase,
        });
        const dxf = exportPatternToDxf(res.geometryResult, 'Corsé Sastre C14-C');
        if (!dxf.includes('AC1009')) throw new Error('Encabezado R12 AC1009 no encontrado');
        if (!dxf.includes('CORTE_EXTERIOR') || !dxf.includes('COSTURA_NETA') || !dxf.includes('HILO_TELA')) {
            throw new Error('Capas textiles incompletas en archivo DXF');
        }
        return `Archivo DXF generado exitosamente (${Math.round(dxf.length / 1024)} KB).`;
    });

    return results;
}
