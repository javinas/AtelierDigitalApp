// ==============================================================================
// ATELIER DIGITAL — EXPORTADOR CAD DXF (AUTOCAD R12 ASCII) (M02.12)
// Archivo: src/engine/pattern/export/dxfExporter.ts
// ==============================================================================
// ADVERTENCIA METODOLÓGICA OBLIGATORIA:
// La compatibilidad de este exportador DXF es PROVISIONAL hasta que sea validada
// formalmente con un software CAD textil de destino (ej. Gerber, Optitex, Lectra).
// No se declara conformidad con ningún estándar industrial cerrado sin ensayo físico.
// Todas las magnitudes numéricas se exportan en milímetros (mm).
// ==============================================================================

import { bezierPoint, roundTo } from '../geometry/geometry2d';
import { BezierCubic2D, PatternGeometryResult, Point2D } from '../geometry/types';

export interface GeometryCadValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validador de integridad geométrica previa a la exportación CAD DXF (Paso 9 - M02.12).
 * Comprueba:
 * 1. Existencia de piezas geométricas.
 * 2. Cajas delimitadoras válidas y dimensiones estrictamente positivas (> 0).
 * 3. Ausencia categórica de valores NaN.
 * 4. Ausencia categórica de valores Infinity / -Infinity.
 * 5. Coordenadas numéricas válidas en trazos de corte, costura, aplomo y piquetes.
 * 6. Consistencia métrica (unidades estrictamente en mm).
 */
export function validateGeometryForCadExport(
    geometry: PatternGeometryResult | null | undefined
): GeometryCadValidationResult {
    const errors: string[] = [];

    if (!geometry) {
        return { valid: false, errors: ['Resultado geométrico nulo o no definido'] };
    }

    if (!Array.isArray(geometry.pieces) || geometry.pieces.length === 0) {
        errors.push('El patrón no contiene piezas geométricas calculadas');
    }

    // Comprobación de BoundingBox global
    if (!geometry.boundingBox) {
        errors.push('El patrón carece de caja delimitadora global (boundingBox)');
    } else {
        const { minX, minY, maxX, maxY, width, height } = geometry.boundingBox;
        if (!Number.isFinite(width) || Number.isNaN(width) || width <= 0) {
            errors.push(`Ancho global de caja delimitadora inválido o no positivo: ${width}`);
        }
        if (!Number.isFinite(height) || Number.isNaN(height) || height <= 0) {
            errors.push(`Alto global de caja delimitadora inválido o no positivo: ${height}`);
        }
        for (const [key, val] of Object.entries({ minX, minY, maxX, maxY })) {
            if (!Number.isFinite(val) || Number.isNaN(val)) {
                errors.push(`Coordenada global ${key} no es un número finito: ${val}`);
            }
        }
    }

    // Comprobación detallada de cada pieza geométrica
    if (Array.isArray(geometry.pieces)) {
        geometry.pieces.forEach((piece, idx) => {
            const pieceLabel = piece.name || piece.id || `Pieza #${idx + 1}`;

            if (!piece.id || !piece.name) {
                errors.push(`${pieceLabel}: Identificación o nombre de pieza faltante`);
            }

            // Bounding box de la pieza
            if (!piece.boundingBox) {
                errors.push(`${pieceLabel}: Carece de caja delimitadora`);
            } else {
                if (!Number.isFinite(piece.boundingBox.width) || Number.isNaN(piece.boundingBox.width) || piece.boundingBox.width <= 0) {
                    errors.push(`${pieceLabel}: Ancho de pieza inválido o no positivo (${piece.boundingBox.width})`);
                }
                if (!Number.isFinite(piece.boundingBox.height) || Number.isNaN(piece.boundingBox.height) || piece.boundingBox.height <= 0) {
                    errors.push(`${pieceLabel}: Alto de pieza inválido o no positivo (${piece.boundingBox.height})`);
                }
            }

            // Trazo de corte (outlineCut)
            if (!piece.outlineCut || !Array.isArray(piece.outlineCut.commands) || piece.outlineCut.commands.length === 0) {
                errors.push(`${pieceLabel}: Carece de comandos geométricos en línea de corte (outlineCut)`);
            } else {
                for (const cmd of piece.outlineCut.commands) {
                    for (const param of cmd.params) {
                        if (!Number.isFinite(param) || Number.isNaN(param)) {
                            errors.push(`${pieceLabel}: Parámetro no numérico o NaN/Infinity en outlineCut (${cmd.type})`);
                            break;
                        }
                    }
                }
            }

            // Trazo de costura neta (outlineSeam)
            if (!piece.outlineSeam || !Array.isArray(piece.outlineSeam.commands) || piece.outlineSeam.commands.length === 0) {
                errors.push(`${pieceLabel}: Carece de comandos geométricos en línea de costura (outlineSeam)`);
            } else {
                for (const cmd of piece.outlineSeam.commands) {
                    for (const param of cmd.params) {
                        if (!Number.isFinite(param) || Number.isNaN(param)) {
                            errors.push(`${pieceLabel}: Parámetro no numérico o NaN/Infinity en outlineSeam (${cmd.type})`);
                            break;
                        }
                    }
                }
            }

            // Hilo de la tela (grainline)
            if (piece.grainline) {
                const { start, end } = piece.grainline;
                if (!start || !end ||
                    !Number.isFinite(start.x) || Number.isNaN(start.x) ||
                    !Number.isFinite(start.y) || Number.isNaN(start.y) ||
                    !Number.isFinite(end.x) || Number.isNaN(end.x) ||
                    !Number.isFinite(end.y) || Number.isNaN(end.y)
                ) {
                    errors.push(`${pieceLabel}: Coordenadas de hilo de tela inválidas o NaN/Infinity`);
                }
            }

            // Piquetes
            if (Array.isArray(piece.notches)) {
                for (const notch of piece.notches) {
                    if (!notch.position ||
                        !Number.isFinite(notch.position.x) || Number.isNaN(notch.position.x) ||
                        !Number.isFinite(notch.position.y) || Number.isNaN(notch.position.y) ||
                        !Number.isFinite(notch.angleRad) || Number.isNaN(notch.angleRad) ||
                        !Number.isFinite(notch.lengthMm) || Number.isNaN(notch.lengthMm) || notch.lengthMm <= 0
                    ) {
                        errors.push(`${pieceLabel}: Piquete con parámetros inválidos o NaN/Infinity`);
                        break;
                    }
                }
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export function exportPatternToDxf(
    geometry: PatternGeometryResult,
    title: string = 'Atelier Digital Pattern'
): string {
    // PASO 9: Validación geométrica estricta antes de emitir CAD DXF
    const validation = validateGeometryForCadExport(geometry);
    if (!validation.valid) {
        throw new Error(`Geometría inválida para exportación CAD DXF: ${validation.errors.join('; ')}`);
    }

    const lines: string[] = [];

    const addCode = (groupCode: number, value: string | number) => {
        lines.push(groupCode.toString());
        lines.push(value.toString());
    };

    // 1. SECCIÓN HEADER
    addCode(0, 'SECTION');
    addCode(2, 'HEADER');
    addCode(9, '$ACADVER');
    addCode(1, 'AC1009'); // Formato AutoCAD R12 ASCII ampliamente compatible
    addCode(9, '$INSUNITS');
    addCode(70, 4); // 4 = Milímetros
    addCode(0, 'ENDSEC');

    // 2. SECCIÓN TABLES (Definición de capas textiles)
    addCode(0, 'SECTION');
    addCode(2, 'TABLES');
    addCode(0, 'TABLE');
    addCode(2, 'LAYER');
    addCode(70, 5); // Número de capas

    const layers = [
        { name: 'CORTE_EXTERIOR', color: 7 }, // Blanco/Negro
        { name: 'COSTURA_NETA', color: 2 },    // Amarillo
        { name: 'HILO_TELA', color: 4 },       // Cian
        { name: 'PIQUETES', color: 1 },        // Rojo
        { name: 'ANOTACIONES', color: 3 },     // Verde
    ];

    for (const l of layers) {
        addCode(0, 'LAYER');
        addCode(2, l.name);
        addCode(70, 0);
        addCode(62, l.color);
        addCode(6, 'CONTINUOUS');
    }

    addCode(0, 'ENDTAB');
    addCode(0, 'ENDSEC');

    // 3. SECCIÓN ENTITIES (Líneas, polilíneas y textos)
    addCode(0, 'SECTION');
    addCode(2, 'ENTITIES');

    for (const piece of geometry.pieces) {
        // A. Exportar línea de corte (Capa CORTE_EXTERIOR)
        exportPathToDxfPolyline(piece.outlineCut, 'CORTE_EXTERIOR', addCode);

        // B. Exportar línea de costura (Capa COSTURA_NETA)
        exportPathToDxfPolyline(piece.outlineSeam, 'COSTURA_NETA', addCode);

        // C. Exportar hilo de la tela
        addCode(0, 'LINE');
        addCode(8, 'HILO_TELA');
        addCode(10, roundTo(piece.grainline.start.x));
        addCode(20, roundTo(piece.grainline.start.y));
        addCode(30, 0.0);
        addCode(11, roundTo(piece.grainline.end.x));
        addCode(21, roundTo(piece.grainline.end.y));
        addCode(31, 0.0);

        // D. Exportar piquetes
        for (const notch of piece.notches) {
            const nx2 = notch.position.x + Math.cos(notch.angleRad) * notch.lengthMm;
            const ny2 = notch.position.y + Math.sin(notch.angleRad) * notch.lengthMm;
            addCode(0, 'LINE');
            addCode(8, 'PIQUETES');
            addCode(10, roundTo(notch.position.x));
            addCode(20, roundTo(notch.position.y));
            addCode(30, 0.0);
            addCode(11, roundTo(nx2));
            addCode(21, roundTo(ny2));
            addCode(31, 0.0);
        }

        // E. Exportar etiquetas
        for (const label of piece.labels) {
            addCode(0, 'TEXT');
            addCode(8, 'ANOTACIONES');
            addCode(10, roundTo(label.position.x));
            addCode(20, roundTo(label.position.y));
            addCode(30, 0.0);
            addCode(40, roundTo(label.fontSizeMm || 8)); // Altura del texto en mm
            addCode(1, label.text);
        }
    }

    addCode(0, 'ENDSEC');
    addCode(0, 'EOF');

    return lines.join('\n');
}

function exportPathToDxfPolyline(
    path: any,
    layerName: string,
    addCode: (code: number, val: string | number) => void
): void {
    const points: Point2D[] = [];
    let currentPoint: Point2D = { x: 0, y: 0 };

    for (const cmd of path.commands) {
        if (cmd.type === 'M' || cmd.type === 'L') {
            currentPoint = { x: cmd.params[0], y: cmd.params[1] };
            points.push(currentPoint);
        } else if (cmd.type === 'C') {
            const b: BezierCubic2D = {
                start: currentPoint,
                cp1: { x: cmd.params[0], y: cmd.params[1] },
                cp2: { x: cmd.params[2], y: cmd.params[3] },
                end: { x: cmd.params[4], y: cmd.params[5] },
            };
            const samples = 12; // Discretización de curva Bézier en segmentos lineales
            for (let i = 1; i <= samples; i++) {
                points.push(bezierPoint(b, i / samples));
            }
            currentPoint = b.end;
        }
    }

    if (points.length < 2) return;

    // Emisión de POLYLINE en AutoCAD R12
    addCode(0, 'POLYLINE');
    addCode(8, layerName);
    addCode(66, 1); // Flags de vértices
    addCode(70, path.isClosed ? 1 : 0); // 1 = cerrada, 0 = abierta

    for (const pt of points) {
        addCode(0, 'VERTEX');
        addCode(8, layerName);
        addCode(10, roundTo(pt.x));
        addCode(20, roundTo(pt.y));
        addCode(30, 0.0);
    }

    addCode(0, 'SEQEND');
}

/**
 * Alias explícito para exportación en estándar AutoCAD R12 ASCII
 */
export const exportPatternToDxfR12 = exportPatternToDxf;

