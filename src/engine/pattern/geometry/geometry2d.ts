// ==============================================================================
// ATELIER DIGITAL — MOTOR GEOMÉTRICO 2D NUCLEAR (M02.10)
// Archivo: src/engine/pattern/geometry/geometry2d.ts
// ==============================================================================
// Funciones matemáticas puras determinísticas para el patronaje computacional.
// No utiliza eval, ni librerías externas. Todas las dimensiones en milímetros (mm).
// ==============================================================================

import {
    BezierCubic2D,
    BoundingBox2D,
    Path2D,
    PathCommand,
    Point2D,
    Segment2D,
} from './types';

// ==============================================================================
// 1. CONVERSIONES DE UNIDADES
// ==============================================================================

export const mmToCm = (mm: number): number => mm / 10.0;
export const cmToMm = (cm: number): number => cm * 10.0;
export const inchToMm = (inches: number): number => inches * 25.4;
export const mmToInch = (mm: number): number => mm / 25.4;

export function roundTo(val: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}

// ==============================================================================
// 2. VALIDACIONES NUMÉRICAS Y DE INTEGRIDAD
// ==============================================================================

export function assertFiniteNumber(value: number, contextName: string): void {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
        throw new Error(`[Geometría] Valor no finito detectado en "${contextName}": ${value}`);
    }
}

export function assertValidPoint(p: Point2D, contextName: string = 'Punto'): void {
    assertFiniteNumber(p.x, `${contextName}.x`);
    assertFiniteNumber(p.y, `${contextName}.y`);
}

// ==============================================================================
// 3. ÁLGEBRA VECTORIAL 2D
// ==============================================================================

export function pt(x: number, y: number): Point2D {
    assertFiniteNumber(x, 'pt.x');
    assertFiniteNumber(y, 'pt.y');
    return { x, y };
}

export function dist(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function add(p1: Point2D, p2: Point2D): Point2D {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function sub(p1: Point2D, p2: Point2D): Point2D {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function scale(p: Point2D, factor: number): Point2D {
    return { x: p.x * factor, y: p.y * factor };
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
    return { x: (p1.x + p2.x) / 2.0, y: (p1.y + p2.y) / 2.0 };
}

export function interpolate(p1: Point2D, p2: Point2D, t: number): Point2D {
    return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
}

export function length(v: Point2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Point2D): Point2D {
    const len = length(v);
    if (len < 1e-7) {
        return { x: 0, y: 0 };
    }
    return { x: v.x / len, y: v.y / len };
}

export function perpendicular(v: Point2D): Point2D {
    // Rotación 90 grados en sentido antihorario
    return { x: -v.y, y: v.x };
}

export function rotate(p: Point2D, center: Point2D, angleRad: number): Point2D {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
    };
}

// ==============================================================================
// 4. CURVAS BÉZIER CÚBICAS
// ==============================================================================

export function bezierPoint(b: BezierCubic2D, t: number): Point2D {
    const mt = 1.0 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
        x: mt3 * b.start.x + 3 * mt2 * t * b.cp1.x + 3 * mt * t2 * b.cp2.x + t3 * b.end.x,
        y: mt3 * b.start.y + 3 * mt2 * t * b.cp1.y + 3 * mt * t2 * b.cp2.y + t3 * b.end.y,
    };
}

export function bezierDerivative(b: BezierCubic2D, t: number): Point2D {
    const mt = 1.0 - t;
    const mt2 = mt * mt;
    const t2 = t * t;

    return {
        x: 3 * mt2 * (b.cp1.x - b.start.x) + 6 * mt * t * (b.cp2.x - b.cp1.x) + 3 * t2 * (b.end.x - b.cp2.x),
        y: 3 * mt2 * (b.cp1.y - b.start.y) + 6 * mt * t * (b.cp2.y - b.cp1.y) + 3 * t2 * (b.end.y - b.cp2.y),
    };
}

export function bezierLength(b: BezierCubic2D, samples: number = 24): number {
    let total = 0;
    let prev = b.start;
    for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const current = bezierPoint(b, t);
        total += dist(prev, current);
        prev = current;
    }
    return total;
}

// ==============================================================================
// 5. CONSTRUCCIÓN Y LONGITUD DE TRAYECTORIAS (PATH2D)
// ==============================================================================

export function createPath(commands: PathCommand[], isClosed: boolean = true): Path2D {
    let approxLengthMm = 0;
    let currentPoint: Point2D = { x: 0, y: 0 };
    let startPoint: Point2D = { x: 0, y: 0 };

    for (const cmd of commands) {
        if (cmd.type === 'M') {
            currentPoint = { x: cmd.params[0], y: cmd.params[1] };
            startPoint = { ...currentPoint };
        } else if (cmd.type === 'L') {
            const nextPoint = { x: cmd.params[0], y: cmd.params[1] };
            approxLengthMm += dist(currentPoint, nextPoint);
            currentPoint = nextPoint;
        } else if (cmd.type === 'C') {
            const bezier: BezierCubic2D = {
                start: currentPoint,
                cp1: { x: cmd.params[0], y: cmd.params[1] },
                cp2: { x: cmd.params[2], y: cmd.params[3] },
                end: { x: cmd.params[4], y: cmd.params[5] },
            };
            approxLengthMm += bezierLength(bezier);
            currentPoint = bezier.end;
        } else if (cmd.type === 'Z') {
            approxLengthMm += dist(currentPoint, startPoint);
            currentPoint = startPoint;
        }
    }

    return {
        commands,
        isClosed,
        approxLengthMm: roundTo(approxLengthMm, 2),
    };
}

export function pathToSvgD(path: Path2D): string {
    const parts: string[] = [];
    for (const cmd of path.commands) {
        if (cmd.type === 'M' || cmd.type === 'L') {
            parts.push(`${cmd.type} ${roundTo(cmd.params[0])} ${roundTo(cmd.params[1])}`);
        } else if (cmd.type === 'C') {
            parts.push(
                `C ${roundTo(cmd.params[0])} ${roundTo(cmd.params[1])}, ${roundTo(cmd.params[2])} ${roundTo(cmd.params[3])}, ${roundTo(cmd.params[4])} ${roundTo(cmd.params[5])}`
            );
        } else if (cmd.type === 'Z') {
            parts.push('Z');
        }
    }
    return parts.join(' ');
}

// ==============================================================================
// 6. CAJAS DELIMITADORAS (BOUNDING BOX)
// ==============================================================================

export function calculateBoundingBox(paths: Path2D[]): BoundingBox2D {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const includePoint = (x: number, y: number) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    };

    for (const path of paths) {
        let current: Point2D = { x: 0, y: 0 };
        for (const cmd of path.commands) {
            if (cmd.type === 'M' || cmd.type === 'L') {
                includePoint(cmd.params[0], cmd.params[1]);
                current = { x: cmd.params[0], y: cmd.params[1] };
            } else if (cmd.type === 'C') {
                const b: BezierCubic2D = {
                    start: current,
                    cp1: { x: cmd.params[0], y: cmd.params[1] },
                    cp2: { x: cmd.params[2], y: cmd.params[3] },
                    end: { x: cmd.params[4], y: cmd.params[5] },
                };
                // Muestrear la curva para bounding box preciso
                for (let i = 0; i <= 10; i++) {
                    const p = bezierPoint(b, i / 10);
                    includePoint(p.x, p.y);
                }
                current = b.end;
            }
        }
    }

    if (minX === Infinity) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    return {
        minX: roundTo(minX, 2),
        minY: roundTo(minY, 2),
        maxX: roundTo(maxX, 2),
        maxY: roundTo(maxY, 2),
        width: roundTo(maxX - minX, 2),
        height: roundTo(maxY - minY, 2),
    };
}

// ==============================================================================
// 7. GENERADOR DE MARGEN DE COSTURA (PARALLEL OFFSET ALGORITHM)
// ==============================================================================
// Desplaza la trayectoria hacia afuera respetando las curvaturas y vértices.
// Para el MVP de patronaje de alta costura, aplicamos offset normal uniforme.
// ==============================================================================

export function generateSeamAllowanceOffset(
    seamPath: Path2D,
    allowanceMm: number,
    isClockwise: boolean = true
): Path2D {
    if (allowanceMm <= 0) {
        return seamPath;
    }

    // Extraer puntos discretos densos a lo largo de la trayectoria
    const points: Point2D[] = [];
    let currentPoint: Point2D = { x: 0, y: 0 };

    for (const cmd of seamPath.commands) {
        if (cmd.type === 'M') {
            currentPoint = { x: cmd.params[0], y: cmd.params[1] };
            points.push(currentPoint);
        } else if (cmd.type === 'L') {
            currentPoint = { x: cmd.params[0], y: cmd.params[1] };
            points.push(currentPoint);
        } else if (cmd.type === 'C') {
            const b: BezierCubic2D = {
                start: currentPoint,
                cp1: { x: cmd.params[0], y: cmd.params[1] },
                cp2: { x: cmd.params[2], y: cmd.params[3] },
                end: { x: cmd.params[4], y: cmd.params[5] },
            };
            const samples = 8;
            for (let i = 1; i <= samples; i++) {
                points.push(bezierPoint(b, i / samples));
            }
            currentPoint = b.end;
        }
    }

    if (points.length < 3) {
        return seamPath;
    }

    // Calcular normales en cada punto y proyectar hacia el exterior
    const n = points.length;
    const offsetPoints: Point2D[] = [];
    const orientation = isClockwise ? 1 : -1;

    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n];
        const curr = points[i];
        const next = points[(i + 1) % n];

        const v1 = normalize(sub(curr, prev));
        const v2 = normalize(sub(next, curr));

        // Normal promedio
        const norm1 = perpendicular(v1);
        const norm2 = perpendicular(v2);
        const avgNorm = normalize(add(norm1, norm2));

        // Proyección con factor de escala
        const projected = add(curr, scale(avgNorm, allowanceMm * orientation));
        offsetPoints.push(projected);
    }

    // Construir comandos para la trayectoria de corte
    const cutCommands: PathCommand[] = [
        { type: 'M', params: [roundTo(offsetPoints[0].x), roundTo(offsetPoints[0].y)] },
    ];

    for (let i = 1; i < offsetPoints.length; i++) {
        cutCommands.push({
            type: 'L',
            params: [roundTo(offsetPoints[i].x), roundTo(offsetPoints[i].y)],
        });
    }

    if (seamPath.isClosed) {
        cutCommands.push({ type: 'Z', params: [] });
    }

    return createPath(cutCommands, seamPath.isClosed);
}
