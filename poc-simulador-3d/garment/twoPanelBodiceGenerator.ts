// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): GENERADOR DE TOP/CORPIÑO T5
// Archivo: poc-simulador-3d/garment/twoPanelBodiceGenerator.ts
// ==============================================================================
// Genera la primera prenda integrada de dos paneles (delantero + posterior)
// ajustada al torso canónico femenino de T3/T4/T4.1:
//   - Abertura de cuello curva (delantero escote U profundo, posterior barco)
//   - Sisas anatómicas desde acromion hasta línea axilar
//   - Unión explícita mediante costuras XPBD en hombros (2) y costados (2)
//   - Sujeciones distribuidas en banda interior de hombros (sin pin puntual)
//   - Longitudes de reposo L_0 medidas sobre patrón 2D plano (Phi_0 = 0 rad)
//   - Posición inicial 3D envuelta sin interpenetración inicial (clearance >= 7 mm)
// ==============================================================================

import {
    evaluateTorsoSurfacePoint,
    sampleTorsoCrossSection,
} from '../collision/torsoBodyModel';
import { createTorsoCollider, TorsoCollider } from '../collision/torsoCollisionSolvers';
import {
    BendingHingeDescriptor,
    ClothEdgeDescriptor,
    GeneratedClothMesh,
} from '../scene0/clothMeshGenerator';

export type BodicePanelId = 'FRONT' | 'BACK';

export type GarmentSeamGroup =
    | 'LEFT_SHOULDER'
    | 'RIGHT_SHOULDER'
    | 'LEFT_SIDE'
    | 'RIGHT_SIDE';

export interface TwoPanelBodicePatternSpec {
    readonly rowsPerPanel: number;
    readonly colsPerPanel: number;
    readonly strapColCount: number;
    readonly underarmRow: number;
    readonly frontNeckCenterRow: number;
    readonly backNeckCenterRow: number;
    readonly shoulderInnerXM: number;
    readonly shoulderOuterXM: number;
    readonly underarmYM: number;
    readonly hemYM: number;
    readonly shoulderClearanceM: number;
    readonly bustEaseM: number;
    readonly waistEaseM: number;
    readonly seamRestGapM: number;
    readonly seamTributaryWidthM: number;
    /** T5.1 (F2): 'stepped' (T5 predeterminado) vs 'conformal' (recorte suave adaptado a escote y sisas) */
    readonly contourMode?: 'stepped' | 'conformal';
    /** Profundidad máxima anatómica de sisa en columnas [cols] para modo 'conformal' */
    readonly armholeScoopMaxCols?: number;
    /** T5.2 (Cambio 1 opcional): regularización geométrica local y alivio de predistorsión 2D↔3D */
    readonly conformalRegularized?: boolean;
}

export const DEFAULT_TWO_PANEL_BODICE_SPEC: TwoPanelBodicePatternSpec = {
    rowsPerPanel: 25,
    colsPerPanel: 25,
    strapColCount: 6, // c = 0..5 (izq) y c = 19..24 (der), densidad uniforme ~13-15 mm
    underarmRow: 11,
    frontNeckCenterRow: 6,
    backNeckCenterRow: 3,
    shoulderInnerXM: 0.092,
    shoulderOuterXM: 0.168,
    underarmYM: 0.560,
    hemYM: 0.240,
    shoulderClearanceM: 0.0065, // Margen sobre sagita del trapecio/clavícula para evitar afloramientos de malla del torso
    bustEaseM: 0.015,
    waistEaseM: 0.044, // Holgura de top sin pinzas sobre cintura (permite caída recta bajo busto y <3% deformación 2D->3D)
    seamRestGapM: 0.003, // 3.0 mm espesor físico de unión entre caras
    seamTributaryWidthM: 0.024, // rigidez de hilo/pespunte superior al panel
    contourMode: 'stepped',
    armholeScoopMaxCols: 1.15,
    conformalRegularized: false,
};

export interface GarmentMeshQualityStats {
    readonly minPanelEdgeLenMm: number;
    readonly maxPanelEdgeLenMm: number;
    readonly minTriangleAreaMm2: number;
    readonly minAngleDeg: number;
    readonly degenerateTriangleCount: number;
    readonly warpEdgeCount: number;
    readonly weftEdgeCount: number;
    readonly shearEdgeCount: number;
}

export interface GarmentSeamPairDescriptor {
    readonly group: GarmentSeamGroup;
    readonly edgeIndex: number;
    readonly frontVertexIndex: number;
    readonly backVertexIndex: number;
    readonly restGapM: number;
}

export interface TwoPanelGarmentMesh extends GeneratedClothMesh {
    readonly patternSpec: TwoPanelBodicePatternSpec;
    readonly flatPattern2dM: Float64Array; // [u2d, v2d] por vértice
    readonly initialWrappedPositionsM: Float64Array; // Copia inmutable t=0
    readonly vertexPanel: readonly BodicePanelId[];
    readonly panelVertexIndices: {
        readonly FRONT: readonly number[];
        readonly BACK: readonly number[];
    };
    readonly panelEdgeCount: number;
    readonly seamEdgeStartIndex: number;
    readonly seams: readonly GarmentSeamPairDescriptor[];
    readonly seamEdgeIndexSet: ReadonlySet<number>;
    readonly panelTriangleSplitIndex: number;
    readonly shoulderSupportIndices: readonly number[];
    readonly hemVertexIndices: {
        readonly FRONT: readonly number[];
        readonly BACK: readonly number[];
    };
    readonly necklineVertexIndices: {
        readonly FRONT: readonly number[];
        readonly BACK: readonly number[];
    };
    readonly armholeVertexIndices: {
        readonly LEFT: readonly number[];
        readonly RIGHT: readonly number[];
    };
    readonly garmentStats: {
        readonly frontVertexCount: number;
        readonly backVertexCount: number;
        readonly frontTriangleCount: number;
        readonly backTriangleCount: number;
        readonly panelEdgeCount: number;
        readonly seamEdgeCount: number;
        readonly hingeCount: number;
        readonly pinnedSupportCount: number;
        readonly initialMaxStretchPct: number;
        readonly initialMeanStretchPct: number;
        readonly bustEaseGirthRatio: number;
    };
}

export interface SeamGroupStats {
    readonly pairCount: number;
    readonly meanGapMm: number;
    readonly maxGapMm: number;
    readonly meanStretchPct: number;
    readonly maxStretchPct: number;
}

export interface TwoPanelGarmentMetrics {
    readonly panelMeanStretchPct: number;
    readonly panelMaxStretchPct: number;
    readonly frontPanelMeanStretchPct: number;
    readonly frontPanelMaxStretchPct: number;
    readonly backPanelMeanStretchPct: number;
    readonly backPanelMaxStretchPct: number;
    readonly seamMeanStretchPct: number;
    readonly seamMaxStretchPct: number;
    readonly seamMeanGapMm: number;
    readonly seamMaxGapMm: number;
    readonly seamByGroup: Record<GarmentSeamGroup, SeamGroupStats>;
    readonly combinedMeanStretchPct: number;
    readonly combinedMaxStretchPct: number;
    readonly subBustMeanAirGapMm: number;
    readonly hemDropMeanM: number;
    readonly frontHemBottomYM: number;
    readonly backHemBottomYM: number;
    readonly leftArmholeDropMm: number;
    readonly rightArmholeDropMm: number;
    readonly frontNeckDropMm: number;
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

function smoothstep01(t: number): number {
    const u = clamp(t, 0, 1);
    return u * u * (3 - 2 * u);
}

/**
 * Calcula la altura Y de la cresta anatómica de hombro en el torso canónico
 * para una coordenada lateral |x| en [0.065, 0.190] m (interpolando smoothstep).
 */
export function evaluateTorsoShoulderCrestYM(absXM: number): number {
    const neckRx = 0.065;
    const shoulderRx = 0.190;
    const yLo = 0.780;
    const yHi = 0.860;

    if (absXM <= neckRx) return yHi;
    if (absXM >= shoulderRx) return yLo;

    // rx(t) = 0.190 + (0.065 - 0.190) * smoothstep(t)
    const targetS = (shoulderRx - absXM) / (shoulderRx - neckRx);
    let lo = 0;
    let hi = 1;
    for (let iter = 0; iter < 24; iter++) {
        const mid = 0.5 * (lo + hi);
        if (smoothstep01(mid) < targetS) lo = mid;
        else hi = mid;
    }
    return yLo + (yHi - yLo) * 0.5 * (lo + hi);
}

/**
 * Curva analítica continua del escote en coordenadas de fila [0..neckCenterRow].
 */
function evaluateNecklineRowFloat(
    cFloat: number,
    cols: number,
    strapCols: number,
    neckCenterRow: number
): number {
    const leftInner = strapCols - 1;
    const rightInner = cols - strapCols;
    if (cFloat <= leftInner || cFloat >= rightInner) return 0;
    const center = 0.5 * (leftInner + rightInner);
    const halfSpan = Math.max(1, rightInner - center);
    const uNorm = Math.abs(cFloat - center) / halfSpan;
    const scoop = Math.pow(Math.max(0, 1 - Math.pow(uNorm, 1.85)), 0.85);
    return neckCenterRow * scoop;
}

/**
 * Profundidad continua de sisa (en columnas hacia el interior) para r in (0, underarmRow).
 */
function evaluateArmholeColInsetFloat(
    rFloat: number,
    underarmRow: number,
    maxInsetCols: number
): number {
    if (rFloat <= 0 || rFloat >= underarmRow || maxInsetCols <= 0) return 0;
    const tArm = rFloat / underarmRow;
    return maxInsetCols * Math.pow(Math.sin(Math.PI * tArm), 1.15);
}

/**
 * Fila mínima activa entera por columna (usada en modo 'stepped' T5 y referencia 2D).
 */
function buildNecklineMinRowByCol(
    cols: number,
    strapCols: number,
    neckCenterRow: number
): Int32Array {
    const minRow = new Int32Array(cols);
    const leftInner = strapCols - 1;
    const rightInner = cols - strapCols;

    for (let c = 0; c < cols; c++) {
        if (c <= leftInner || c >= rightInner) {
            minRow[c] = 0;
        } else {
            const rf = evaluateNecklineRowFloat(c, cols, strapCols, neckCenterRow);
            minRow[c] = Math.max(1, Math.min(neckCenterRow, Math.round(rf)));
        }
    }
    return minRow;
}

/**
 * Coordenada lateral monotónica X en cresta de hombro (r = 0) para todas las
 * columnas c = 0..cols-1 (incluyendo puente cervical virtual para parámetro 2D suave).
 */
function evaluateTopColXM(col: number, spec: TwoPanelBodicePatternSpec): number {
    const C = spec.colsPerPanel;
    const leftInnerCol = spec.strapColCount - 1;
    const rightInnerCol = C - spec.strapColCount;
    if (col <= leftInnerCol) {
        const t = col / leftInnerCol;
        return -spec.shoulderOuterXM + t * (spec.shoulderOuterXM - spec.shoulderInnerXM);
    }
    if (col >= rightInnerCol) {
        const t = (col - rightInnerCol) / (C - 1 - rightInnerCol);
        return spec.shoulderInnerXM + t * (spec.shoulderOuterXM - spec.shoulderInnerXM);
    }
    const tCenter = (col - leftInnerCol) / (rightInnerCol - leftInnerCol);
    return -spec.shoulderInnerXM + tCenter * (2 * spec.shoulderInnerXM);
}

/**
 * Evalúa punto común de costura lateral en el meridiano derecho/izquierdo del cuerpo
 * para asegurar brecha inicial exacta igual a seamRestGapM (0% pre-tensión de costura).
 */
function evaluateSideSeamAnchorPoint(
    yM: number,
    isRightSide: boolean,
    easeM: number
): [number, number, number] {
    const theta = isRightSide ? 0 : Math.PI;
    const [sx, , sz] = evaluateTorsoSurfacePoint(yM, theta);
    const signX = isRightSide ? 1 : -1;
    return [sx + signX * easeM, yM, sz];
}

/**
 * Evalúa la malla envolvente completa (sin recortar escote aún) para garantizar
 * monotonicidad estricta en X, cero inversiones de triángulos, cero penetración inicial
 * y patrón 2D continuo sin saltos de curvatura.
 */
function evaluateContinuousWrappedPoint(
    panel: BodicePanelId,
    rFloat: number,
    cFloat: number,
    spec: TwoPanelBodicePatternSpec,
    bustApexFrontEnvZ: number,
    out: Float64Array,
    outBase: number
): void {
    const R = spec.rowsPerPanel;
    const C = spec.colsPerPanel;
    const isFront = panel === 'FRONT';
    const halfSeamGapZ = 0.5 * spec.seamRestGapM;
    const s01 = clamp(cFloat / (C - 1), 0, 1); // 0 (-X izq) .. 1 (+X der)
    const xFraction = s01 * 2 - 1;

    if (rFloat <= spec.underarmRow) {
        const tArm = clamp(rFloat / spec.underarmRow, 0, 1); // 0 hombro .. 1 axila
        const xTop = evaluateTopColXM(cFloat, spec);
        const yTop = evaluateTorsoShoulderCrestYM(Math.abs(xTop)) + spec.shoulderClearanceM;

        if (rFloat <= 1e-6) {
            out[outBase] = xTop;
            out[outBase + 1] = yTop;
            out[outBase + 2] = isFront ? halfSeamGapZ : -halfSeamGapZ;
            return;
        }

        const yUnder = spec.underarmYM + 0.008 * (1 - Math.abs(xFraction));
        if (Math.abs(rFloat - spec.underarmRow) <= 1e-6 && (cFloat <= 1e-6 || cFloat >= C - 1 - 1e-6)) {
            const isRight = cFloat >= C - 1 - 1e-6;
            const [ax, , az] = evaluateSideSeamAnchorPoint(yUnder, isRight, spec.bustEaseM);
            out[outBase] = ax;
            out[outBase + 1] = yUnder;
            out[outBase + 2] = az + (isFront ? halfSeamGapZ : -halfSeamGapZ);
            return;
        }

        const thetaUnderarmFront = Math.PI * (1 - s01);
        const cosTop = clamp(xTop / spec.shoulderOuterXM, -1, 1);
        const thetaTopFront = Math.acos(cosTop);
        const blendTheta = smoothstep01(clamp(tArm * 1.15, 0, 1));
        const thetaFront = thetaTopFront * (1 - blendTheta) + thetaUnderarmFront * blendTheta;
        const theta = isFront ? thetaFront : 2 * Math.PI - thetaFront;

        const yM = yTop + (yUnder - yTop) * Math.pow(tArm, 0.96);
        const cs = sampleTorsoCrossSection(yM);
        const clavicleExtra = 0.008 * Math.sin(Math.PI * clamp(tArm * 1.4, 0, 1));
        const easeUpper =
            spec.shoulderClearanceM +
            (spec.bustEaseM - spec.shoulderClearanceM) * smoothstep01(tArm) +
            clavicleExtra;

        const [sx, , sz] = evaluateTorsoSurfacePoint(yM, theta);
        const rad = Math.hypot(sx, sz - cs.ozM) || 1;
        out[outBase] = sx + (sx / rad) * easeUpper;
        out[outBase + 1] = yM;
        out[outBase + 2] = sz + ((sz - cs.ozM) / rad) * easeUpper;
        return;
    }

    const tLower = clamp((rFloat - spec.underarmRow) / (R - 1 - spec.underarmRow), 0, 1);
    const yUnder = spec.underarmYM + 0.008 * (1 - Math.abs(xFraction));
    const yM = yUnder + (spec.hemYM - yUnder) * tLower;
    const cs = sampleTorsoCrossSection(yM);
    const easeM = spec.bustEaseM + (spec.waistEaseM - spec.bustEaseM) * smoothstep01(tLower);

    if (cFloat <= 1e-6 || cFloat >= C - 1 - 1e-6) {
        const isRight = cFloat >= C - 1 - 1e-6;
        const [ax, , az] = evaluateSideSeamAnchorPoint(yM, isRight, easeM);
        out[outBase] = ax;
        out[outBase + 1] = yM;
        out[outBase + 2] = az + (isFront ? halfSeamGapZ : -halfSeamGapZ);
        return;
    }

    const theta = isFront ? Math.PI * (1 - s01) : Math.PI * (1 + s01);
    const [sx, , sz] = evaluateTorsoSurfacePoint(yM, theta);
    const dx = sx;
    const dz = sz - cs.ozM;
    const radialNorm = Math.hypot(dx, dz) || 1;

    const surfX = sx + (dx / radialNorm) * easeM;
    let surfZ = sz + (dz / radialNorm) * easeM;

    const centerBell = Math.sin(Math.PI * s01);
    if (isFront && yM < 0.52) {
        const fallFrac = clamp((0.52 - yM) / (0.52 - spec.hemYM), 0, 1);
        const drapeFrontZ = bustApexFrontEnvZ * (1 - 0.14 * fallFrac);
        const bridgedZ =
            surfZ +
            (drapeFrontZ - surfZ) *
                smoothstep01(clamp((0.52 - yM) / 0.12, 0, 1)) *
                Math.pow(centerBell, 0.85);
        surfZ = Math.max(surfZ, bridgedZ);
    } else if (!isFront) {
        const lumbarEase = 0.018 * Math.exp(-Math.pow((yM - 0.24) / 0.14, 2)) * centerBell;
        surfZ -= lumbarEase;
    }

    out[outBase] = surfX;
    out[outBase + 1] = yM;
    out[outBase + 2] = surfZ;
}

function evaluateFullPanelWrappedGrid(
    panel: BodicePanelId,
    spec: TwoPanelBodicePatternSpec
): Float64Array {
    const R = spec.rowsPerPanel;
    const C = spec.colsPerPanel;
    const out = new Float64Array(R * C * 3);
    const [, , frontBustApexZ] = evaluateTorsoSurfacePoint(0.525, Math.PI * 0.5);
    const bustApexFrontEnvZ = frontBustApexZ + spec.bustEaseM;

    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            evaluateContinuousWrappedPoint(panel, r, c, spec, bustApexFrontEnvZ, out, (r * C + c) * 3);
        }
    }

    return out;
}

function buildFullFlatPattern2dCoords(
    rows: number,
    cols: number,
    fullWrappedGrid: Float64Array,
    minRowByCol: Int32Array
): Float64Array {
    const coords2d = new Float64Array(rows * cols * 2);

    // 1. Inicialización geométrica limpia: v2d por columna desde bajo (v=0) y u2d por arco de fila
    for (let c = 0; c < cols; c++) {
        coords2d[((rows - 1) * cols + c) * 2 + 1] = 0;
        for (let r = rows - 2; r >= 0; r--) {
            const tb = (r * cols + c) * 3;
            const bb = ((r + 1) * cols + c) * 3;
            const dVert = Math.hypot(
                fullWrappedGrid[tb] - fullWrappedGrid[bb],
                fullWrappedGrid[tb + 1] - fullWrappedGrid[bb + 1],
                fullWrappedGrid[tb + 2] - fullWrappedGrid[bb + 2]
            );
            coords2d[(r * cols + c) * 2 + 1] =
                coords2d[((r + 1) * cols + c) * 2 + 1] + dVert;
        }
    }

    const centerCol = Math.floor(cols / 2);
    for (let r = 0; r < rows; r++) {
        coords2d[(r * cols + centerCol) * 2] = 0;
        let accRight = 0;
        for (let c = centerCol + 1; c < cols; c++) {
            const b0 = (r * cols + (c - 1)) * 3;
            const b1 = (r * cols + c) * 3;
            accRight += Math.hypot(
                fullWrappedGrid[b1] - fullWrappedGrid[b0],
                fullWrappedGrid[b1 + 1] - fullWrappedGrid[b0 + 1],
                fullWrappedGrid[b1 + 2] - fullWrappedGrid[b0 + 2]
            );
            coords2d[(r * cols + c) * 2] = accRight;
        }
        let accLeft = 0;
        for (let c = centerCol - 1; c >= 0; c--) {
            const b0 = (r * cols + (c + 1)) * 3;
            const b1 = (r * cols + c) * 3;
            accLeft += Math.hypot(
                fullWrappedGrid[b1] - fullWrappedGrid[b0],
                fullWrappedGrid[b1 + 1] - fullWrappedGrid[b0 + 1],
                fullWrappedGrid[b1 + 2] - fullWrappedGrid[b0 + 2]
            );
            coords2d[(r * cols + c) * 2] = -accLeft;
        }
    }

    // 2. Relajación plana cuasi-isométrica ÚNICAMENTE sobre los vértices activos del patrón recortado
    // (sin puente virtual sobre el hueco del escote; las costuras de hombro r=0 conservan longitud afinada)
    const isActive = (r: number, c: number) => r >= minRowByCol[c];
    interface EdgeLen2d { a: number; b: number; len: number; stiffness: number }
    const distEdges: EdgeLen2d[] = [];
    const addEdge = (r0: number, c0: number, r1: number, c1: number) => {
        if (!isActive(r0, c0) || !isActive(r1, c1)) return;
        const i0 = r0 * cols + c0;
        const i1 = r1 * cols + c1;
        const b0 = i0 * 3;
        const b1 = i1 * 3;
        const len = Math.hypot(
            fullWrappedGrid[b1] - fullWrappedGrid[b0],
            fullWrappedGrid[b1 + 1] - fullWrappedGrid[b0 + 1],
            fullWrappedGrid[b1 + 2] - fullWrappedGrid[b0 + 2]
        );
        const isShoulderSeam = r0 === 0 && r1 === 0;
        if (len > 1e-8) distEdges.push({ a: i0, b: i1, len, stiffness: isShoulderSeam ? 0.95 : 0.55 });
    };

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!isActive(r, c)) continue;
            if (c + 1 < cols) addEdge(r, c, r, c + 1);
            if (r + 1 < rows) addEdge(r, c, r + 1, c);
            if (r + 1 < rows && c + 1 < cols) {
                addEdge(r, c, r + 1, c + 1);
                addEdge(r, c + 1, r + 1, c);
            }
        }
    }

    const anchorIdx = (rows - 1) * cols + centerCol;
    // Fijar longitudes exactas de los tramos superiores de tirantes (r=0) a la costura física 3D
    const strapFixedDistByCol = new Float64Array(cols);
    for (let c = 0; c < cols - 1; c++) {
        const b0 = c * 3;
        const b1 = (c + 1) * 3;
        strapFixedDistByCol[c] = Math.hypot(
            fullWrappedGrid[b1] - fullWrappedGrid[b0],
            fullWrappedGrid[b1 + 1] - fullWrappedGrid[b0 + 1],
            fullWrappedGrid[b1 + 2] - fullWrappedGrid[b0 + 2]
        );
    }
    for (let iter = 0; iter < 400; iter++) {
        for (const e of distEdges) {
            const ba = e.a * 2;
            const bb = e.b * 2;
            const dx = coords2d[bb] - coords2d[ba];
            const dy = coords2d[bb + 1] - coords2d[ba + 1];
            const cur = Math.hypot(dx, dy);
            if (cur < 1e-9) continue;
            const corr = e.stiffness * ((cur - e.len) / cur);
            const wA = e.a === anchorIdx ? 0 : 1;
            const wB = e.b === anchorIdx ? 0 : 1;
            const wSum = wA + wB;
            if (wSum === 0) continue;
            if (wA > 0) {
                coords2d[ba] += (wA / wSum) * corr * dx;
                coords2d[ba + 1] += (wA / wSum) * corr * dy;
            }
            if (wB > 0) {
                coords2d[bb] -= (wB / wSum) * corr * dx;
                coords2d[bb + 1] -= (wB / wSum) * corr * dy;
            }
        }
        // Afinado exacto de costura de hombro (r=0) para conservar L_0 === L_3d entre soportes fijos
        for (let pass = 0; pass < 3; pass++) {
            for (let c = 0; c < cols - 1; c++) {
                if (!isActive(0, c) || !isActive(0, c + 1)) continue;
                const b0 = c * 2;
                const b1 = (c + 1) * 2;
                const dx = coords2d[b1] - coords2d[b0];
                const dy = coords2d[b1 + 1] - coords2d[b0 + 1];
                const cur = Math.hypot(dx, dy);
                if (cur < 1e-9) continue;
                const corr = 0.5 * ((cur - strapFixedDistByCol[c]) / cur);
                coords2d[b0] += corr * dx;
                coords2d[b0 + 1] += corr * dy;
                coords2d[b1] -= corr * dx;
                coords2d[b1 + 1] -= corr * dy;
            }
        }
        for (let r = 0; r < rows; r++) {
            if (isActive(r, centerCol)) {
                coords2d[(r * cols + centerCol) * 2] = 0;
            }
            for (let off = 1; off <= centerCol; off++) {
                if (!isActive(r, centerCol - off) || !isActive(r, centerCol + off)) continue;
                const lBase = (r * cols + (centerCol - off)) * 2;
                const rBase = (r * cols + (centerCol + off)) * 2;
                const symU = 0.5 * (coords2d[rBase] - coords2d[lBase]);
                const symV = 0.5 * (coords2d[rBase + 1] + coords2d[lBase + 1]);
                coords2d[rBase] = symU;
                coords2d[lBase] = -symU;
                coords2d[rBase + 1] = symV;
                coords2d[lBase + 1] = symV;
            }
        }
        coords2d[anchorIdx * 2] = 0;
        coords2d[anchorIdx * 2 + 1] = 0;
    }

    return coords2d;
}

interface BuiltPanelGeometry {
    readonly vertexCount: number;
    readonly gridToVertex: Int32Array;
    readonly wrappedPositionsM: Float64Array;
    readonly flat2dPositionsM: Float64Array;
    readonly triangleIndices: number[];
    readonly minRowByCol: Int32Array;
    readonly vertexGridRC: readonly [number, number][];
    readonly necklineVertices: readonly number[];
    readonly leftArmholeVertices: readonly number[];
    readonly rightArmholeVertices: readonly number[];
}

function bilinearSample2d(
    grid2d: Float64Array,
    rows: number,
    cols: number,
    rF: number,
    cF: number
): [number, number] {
    const r0 = Math.max(0, Math.min(rows - 2, Math.floor(rF)));
    const c0 = Math.max(0, Math.min(cols - 2, Math.floor(cF)));
    const fr = clamp(rF - r0, 0, 1);
    const fc = clamp(cF - c0, 0, 1);
    const i00 = (r0 * cols + c0) * 2;
    const i01 = (r0 * cols + (c0 + 1)) * 2;
    const i10 = ((r0 + 1) * cols + c0) * 2;
    const i11 = ((r0 + 1) * cols + (c0 + 1)) * 2;
    const u =
        (1 - fr) * ((1 - fc) * grid2d[i00] + fc * grid2d[i01]) +
        fr * ((1 - fc) * grid2d[i10] + fc * grid2d[i11]);
    const v =
        (1 - fr) * ((1 - fc) * grid2d[i00 + 1] + fc * grid2d[i01 + 1]) +
        fr * ((1 - fc) * grid2d[i10 + 1] + fc * grid2d[i11 + 1]);
    return [u, v];
}

function flattenConformalPattern2d(
    vertexCount: number,
    vertexOffset: number,
    wrappedPositionsM: Float64Array,
    triangleIndices: readonly number[],
    vertexGridRC: readonly [number, number][],
    anchorLocalIdx: number,
    flat2dPositionsM: Float64Array,
    iterations: number = 320,
    preserveSideSeamCols?: { cols: number; underarmRow: number }
): void {
    interface FlatEdge { a: number; b: number; len: number; stiffness: number; isShoulder: boolean }
    const edgeMap = new Map<string, FlatEdge>();
    for (let t = 0; t < triangleIndices.length; t += 3) {
        const tri = [
            triangleIndices[t] - vertexOffset,
            triangleIndices[t + 1] - vertexOffset,
            triangleIndices[t + 2] - vertexOffset,
        ];
        for (let k = 0; k < 3; k++) {
            const u = tri[k];
            const v = tri[(k + 1) % 3];
            const a = Math.min(u, v);
            const b = Math.max(u, v);
            const key = `${a}_${b}`;
            if (edgeMap.has(key)) continue;
            const ba = a * 3;
            const bb = b * 3;
            const len = Math.hypot(
                wrappedPositionsM[bb] - wrappedPositionsM[ba],
                wrappedPositionsM[bb + 1] - wrappedPositionsM[ba + 1],
                wrappedPositionsM[bb + 2] - wrappedPositionsM[ba + 2]
            );
            if (len < 1e-8) continue;
            const isShoulder = vertexGridRC[a][0] <= 1e-5 && vertexGridRC[b][0] <= 1e-5;
            const isSideSeam =
                preserveSideSeamCols !== undefined &&
                vertexGridRC[a][0] >= preserveSideSeamCols.underarmRow - 1e-5 &&
                vertexGridRC[b][0] >= preserveSideSeamCols.underarmRow - 1e-5 &&
                ((vertexGridRC[a][1] <= 1e-5 && vertexGridRC[b][1] <= 1e-5) ||
                    (vertexGridRC[a][1] >= preserveSideSeamCols.cols - 1 - 1e-5 &&
                        vertexGridRC[b][1] >= preserveSideSeamCols.cols - 1 - 1e-5));
            const isFixedEdge = isShoulder || isSideSeam;
            edgeMap.set(key, { a, b, len, stiffness: isFixedEdge ? 0.95 : 0.65, isShoulder: isFixedEdge });
        }
    }
    const allEdges = Array.from(edgeMap.values());
    const shoulderEdges = allEdges.filter((e) => e.isShoulder);

    for (let iter = 0; iter < iterations; iter++) {
        for (const e of allEdges) {
            const ba = e.a * 2;
            const bb = e.b * 2;
            const dx = flat2dPositionsM[bb] - flat2dPositionsM[ba];
            const dy = flat2dPositionsM[bb + 1] - flat2dPositionsM[ba + 1];
            const cur = Math.hypot(dx, dy);
            if (cur < 1e-9) continue;
            const corr = e.stiffness * ((cur - e.len) / cur);
            const wA = e.a === anchorLocalIdx ? 0 : 1;
            const wB = e.b === anchorLocalIdx ? 0 : 1;
            const wSum = wA + wB;
            if (wSum === 0) continue;
            if (wA > 0) {
                flat2dPositionsM[ba] += (wA / wSum) * corr * dx;
                flat2dPositionsM[ba + 1] += (wA / wSum) * corr * dy;
            }
            if (wB > 0) {
                flat2dPositionsM[bb] -= (wB / wSum) * corr * dx;
                flat2dPositionsM[bb + 1] -= (wB / wSum) * corr * dy;
            }
        }
        for (let pass = 0; pass < 3; pass++) {
            for (const se of shoulderEdges) {
                const ba = se.a * 2;
                const bb = se.b * 2;
                const dx = flat2dPositionsM[bb] - flat2dPositionsM[ba];
                const dy = flat2dPositionsM[bb + 1] - flat2dPositionsM[ba + 1];
                const cur = Math.hypot(dx, dy);
                if (cur < 1e-9) continue;
                const corr = 0.5 * ((cur - se.len) / cur);
                flat2dPositionsM[ba] += corr * dx;
                flat2dPositionsM[ba + 1] += corr * dy;
                flat2dPositionsM[bb] -= corr * dx;
                flat2dPositionsM[bb + 1] -= corr * dy;
            }
        }
        if (anchorLocalIdx >= 0 && anchorLocalIdx < vertexCount) {
            flat2dPositionsM[anchorLocalIdx * 2] = 0;
            flat2dPositionsM[anchorLocalIdx * 2 + 1] = 0;
        }
    }
}

let cachedGeneratorTorsoSdfCollider: TorsoCollider | null = null;

function getCachedGeneratorTorsoCollider(): TorsoCollider {
    if (!cachedGeneratorTorsoSdfCollider) {
        cachedGeneratorTorsoSdfCollider = createTorsoCollider('ALT_C_SDF_GRID_3D');
    }
    return cachedGeneratorTorsoSdfCollider;
}

function triMinAngleDeg2d(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number
): number {
    const abx = bx - ax;
    const aby = by - ay;
    const acx = cx - ax;
    const acy = cy - ay;
    const bcx = cx - bx;
    const bcy = cy - by;
    const la = Math.hypot(abx, aby);
    const lb = Math.hypot(bcx, bcy);
    const lc = Math.hypot(acx, acy);
    if (la < 1e-8 || lb < 1e-8 || lc < 1e-8) return 0;
    const cosA = clamp((abx * acx + aby * acy) / (la * lc), -1, 1);
    const cosB = clamp((-abx * bcx - aby * bcy) / (la * lb), -1, 1);
    const cosC = clamp((bcx * acx + bcy * acy) / (lb * lc), -1, 1);
    return (Math.min(Math.acos(cosA), Math.acos(cosB), Math.acos(cosC)) * 180) / Math.PI;
}

function triMinAngleDeg3d(pos: Float64Array, a: number, b: number, c: number): number {
    const abx = pos[b * 3] - pos[a * 3];
    const aby = pos[b * 3 + 1] - pos[a * 3 + 1];
    const abz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const acx = pos[c * 3] - pos[a * 3];
    const acy = pos[c * 3 + 1] - pos[a * 3 + 1];
    const acz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const bcx = pos[c * 3] - pos[b * 3];
    const bcy = pos[c * 3 + 1] - pos[b * 3 + 1];
    const bcz = pos[c * 3 + 2] - pos[b * 3 + 2];
    const la = Math.hypot(abx, aby, abz);
    const lb = Math.hypot(bcx, bcy, bcz);
    const lc = Math.hypot(acx, acy, acz);
    if (la < 1e-8 || lb < 1e-8 || lc < 1e-8) return 0;
    const cosA = clamp((abx * acx + aby * acy + abz * acz) / (la * lc), -1, 1);
    const cosB = clamp((-abx * bcx - aby * bcy - abz * bcz) / (la * lb), -1, 1);
    const cosC = clamp((bcx * acx + bcy * acy + bcz * acz) / (lb * lc), -1, 1);
    return (Math.min(Math.acos(cosA), Math.acos(cosB), Math.acos(cosC)) * 180) / Math.PI;
}

function flipConformalInteriorDiagonals(
    vertexOffset: number,
    triangleIndices: number[],
    vertexGridRC: readonly [number, number][],
    wrappedPositionsM: Float64Array,
    flat2dPositionsM: Float64Array,
    cols: number,
    underarmRow: number
): void {
    const triCount = triangleIndices.length / 3;
    const rcAreaSign = (locA: number, locB: number, locC: number): number => {
        const [ra, ca] = vertexGridRC[locA];
        const [rb, cb] = vertexGridRC[locB];
        const [rc, cc] = vertexGridRC[locC];
        return (rb - ra) * (cc - ca) - (cb - ca) * (rc - ra);
    };
    const isShoulderOrSideEdge = (locA: number, locB: number): boolean => {
        const [rA, cA] = vertexGridRC[locA];
        const [rB, cB] = vertexGridRC[locB];
        if (rA <= 1e-5 && rB <= 1e-5) return true;
        if (rA >= underarmRow - 1e-5 && rB >= underarmRow - 1e-5) {
            if ((cA <= 1e-5 && cB <= 1e-5) || (cA >= cols - 1 - 1e-5 && cB >= cols - 1 - 1e-5)) {
                return true;
            }
        }
        return false;
    };

    for (let pass = 0; pass < 6; pass++) {
        let flippedInPass = 0;
        const dirMap = new Map<string, { tIdx: number; slot: number; opp: number }>();
        for (let t = 0; t < triCount; t++) {
            const v0 = triangleIndices[t * 3] - vertexOffset;
            const v1 = triangleIndices[t * 3 + 1] - vertexOffset;
            const v2 = triangleIndices[t * 3 + 2] - vertexOffset;
            dirMap.set(`${v0}_${v1}`, { tIdx: t, slot: 2, opp: v2 });
            dirMap.set(`${v1}_${v2}`, { tIdx: t, slot: 0, opp: v0 });
            dirMap.set(`${v2}_${v0}`, { tIdx: t, slot: 1, opp: v1 });
        }

        const touchedTris = new Set<number>();
        for (let t = 0; t < triCount; t++) {
            if (touchedTris.has(t)) continue;
            const base = t * 3;
            const verts = [
                triangleIndices[base] - vertexOffset,
                triangleIndices[base + 1] - vertexOffset,
                triangleIndices[base + 2] - vertexOffset,
            ];
            for (let k = 0; k < 3; k++) {
                const u = verts[k];
                const v = verts[(k + 1) % 3];
                const p = verts[(k + 2) % 3];
                if (u >= v || isShoulderOrSideEdge(u, v)) continue;
                const twin = dirMap.get(`${v}_${u}`);
                if (!twin || touchedTris.has(twin.tIdx)) continue;
                const q = twin.opp;
                if (p === q) continue;

                const areaT1 = rcAreaSign(u, v, p);
                const areaT2 = rcAreaSign(v, u, q);
                const areaN1 = rcAreaSign(p, u, q);
                const areaN2 = rcAreaSign(q, v, p);
                if (areaT1 * areaN1 <= 1e-8 || areaT2 * areaN2 <= 1e-8) continue;

                const curMin3d = Math.min(
                    triMinAngleDeg3d(wrappedPositionsM, u, v, p),
                    triMinAngleDeg3d(wrappedPositionsM, v, u, q)
                );
                const newMin3d = Math.min(
                    triMinAngleDeg3d(wrappedPositionsM, p, u, q),
                    triMinAngleDeg3d(wrappedPositionsM, q, v, p)
                );
                const curMin2d = Math.min(
                    triMinAngleDeg2d(
                        flat2dPositionsM[u * 2], flat2dPositionsM[u * 2 + 1],
                        flat2dPositionsM[v * 2], flat2dPositionsM[v * 2 + 1],
                        flat2dPositionsM[p * 2], flat2dPositionsM[p * 2 + 1]
                    ),
                    triMinAngleDeg2d(
                        flat2dPositionsM[v * 2], flat2dPositionsM[v * 2 + 1],
                        flat2dPositionsM[u * 2], flat2dPositionsM[u * 2 + 1],
                        flat2dPositionsM[q * 2], flat2dPositionsM[q * 2 + 1]
                    )
                );
                const newMin2d = Math.min(
                    triMinAngleDeg2d(
                        flat2dPositionsM[p * 2], flat2dPositionsM[p * 2 + 1],
                        flat2dPositionsM[u * 2], flat2dPositionsM[u * 2 + 1],
                        flat2dPositionsM[q * 2], flat2dPositionsM[q * 2 + 1]
                    ),
                    triMinAngleDeg2d(
                        flat2dPositionsM[q * 2], flat2dPositionsM[q * 2 + 1],
                        flat2dPositionsM[v * 2], flat2dPositionsM[v * 2 + 1],
                        flat2dPositionsM[p * 2], flat2dPositionsM[p * 2 + 1]
                    )
                );

                const newDiag3d = Math.hypot(
                    wrappedPositionsM[p * 3] - wrappedPositionsM[q * 3],
                    wrappedPositionsM[p * 3 + 1] - wrappedPositionsM[q * 3 + 1],
                    wrappedPositionsM[p * 3 + 2] - wrappedPositionsM[q * 3 + 2]
                );
                const newDiag2d = Math.hypot(
                    flat2dPositionsM[p * 2] - flat2dPositionsM[q * 2],
                    flat2dPositionsM[p * 2 + 1] - flat2dPositionsM[q * 2 + 1]
                );
                if (newDiag3d < 0.0085 || newDiag2d < 0.0085) continue;

                const minBefore = Math.min(curMin3d, curMin2d);
                const minAfter = Math.min(newMin3d, newMin2d);
                if (newMin3d > curMin3d + 1.0 && minAfter > minBefore + 0.5 && newMin2d >= 13.5) {
                    triangleIndices[t * 3] = vertexOffset + p;
                    triangleIndices[t * 3 + 1] = vertexOffset + u;
                    triangleIndices[t * 3 + 2] = vertexOffset + q;
                    triangleIndices[twin.tIdx * 3] = vertexOffset + q;
                    triangleIndices[twin.tIdx * 3 + 1] = vertexOffset + v;
                    triangleIndices[twin.tIdx * 3 + 2] = vertexOffset + p;
                    touchedTris.add(t);
                    touchedTris.add(twin.tIdx);
                    flippedInPass++;
                    break;
                }
            }
        }
        if (flippedInPass === 0) break;
    }
}

function relaxWrappedPositionsIsometric3d(
    vertexCount: number,
    vertexOffset: number,
    triangleIndices: readonly number[],
    vertexGridRC: readonly [number, number][],
    flat2dPositionsM: Float64Array,
    wrappedPositionsM: Float64Array,
    rows: number,
    cols: number,
    underarmRow: number
): void {
    const edgeSet = new Set<string>();
    const edges: { a: number; b: number; targetLen: number }[] = [];
    for (let t = 0; t < triangleIndices.length; t += 3) {
        const tri = [
            triangleIndices[t] - vertexOffset,
            triangleIndices[t + 1] - vertexOffset,
            triangleIndices[t + 2] - vertexOffset,
        ];
        for (let k = 0; k < 3; k++) {
            const u = tri[k];
            const v = tri[(k + 1) % 3];
            const a = Math.min(u, v);
            const b = Math.max(u, v);
            const key = `${a}_${b}`;
            if (edgeSet.has(key)) continue;
            edgeSet.add(key);
            const targetLen = Math.hypot(
                flat2dPositionsM[b * 2] - flat2dPositionsM[a * 2],
                flat2dPositionsM[b * 2 + 1] - flat2dPositionsM[a * 2 + 1]
            );
            if (targetLen > 1e-8) edges.push({ a, b, targetLen });
        }
    }

    const fixed = new Uint8Array(vertexCount);
    for (let loc = 0; loc < vertexCount; loc++) {
        const [rF, cF] = vertexGridRC[loc];
        if (rF <= 1e-5) {
            fixed[loc] = 1;
        } else if (
            rF >= underarmRow - 1e-5 &&
            (cF <= 1e-5 || cF >= cols - 1 - 1e-5)
        ) {
            fixed[loc] = 1;
        }
    }
    void rows;

    const freeInvMass = new Float64Array(vertexCount);
    for (let loc = 0; loc < vertexCount; loc++) {
        freeInvMass[loc] = fixed[loc] ? 0 : 1;
    }
    const sdfCollider = getCachedGeneratorTorsoCollider();
    const clearanceParams = { contactThicknessM: 0.0065, frictionCoeff: 0 };
    const targetInitialPos = new Float64Array(wrappedPositionsM);

    for (let iter = 0; iter < 150; iter++) {
        const rev = iter % 2 === 1;
        for (let k = 0; k < edges.length; k++) {
            const e = edges[rev ? edges.length - 1 - k : k];
            const wA = freeInvMass[e.a];
            const wB = freeInvMass[e.b];
            const wSum = wA + wB;
            if (wSum === 0) continue;
            const ba = e.a * 3;
            const bb = e.b * 3;
            const dx = wrappedPositionsM[bb] - wrappedPositionsM[ba];
            const dy = wrappedPositionsM[bb + 1] - wrappedPositionsM[ba + 1];
            const dz = wrappedPositionsM[bb + 2] - wrappedPositionsM[ba + 2];
            const cur = Math.hypot(dx, dy, dz);
            if (cur < 1e-9) continue;
            const corr = 0.60 * ((cur - e.targetLen) / cur);
            if (wA > 0) {
                const f = (wA / wSum) * corr;
                wrappedPositionsM[ba] += f * dx;
                wrappedPositionsM[ba + 1] += f * dy;
                wrappedPositionsM[ba + 2] += f * dz;
            }
            if (wB > 0) {
                const f = (wB / wSum) * corr;
                wrappedPositionsM[bb] -= f * dx;
                wrappedPositionsM[bb + 1] -= f * dy;
                wrappedPositionsM[bb + 2] -= f * dz;
            }
        }
        // Sujeción muy suave en fila inferior para evitar pandeo/acortamiento local sin endurecer paneles
        for (let loc = 0; loc < vertexCount; loc++) {
            if (fixed[loc]) continue;
            if (vertexGridRC[loc][0] >= rows - 2.1) {
                const b = loc * 3;
                wrappedPositionsM[b] = wrappedPositionsM[b] * 0.985 + targetInitialPos[b] * 0.015;
                wrappedPositionsM[b + 1] = wrappedPositionsM[b + 1] * 0.985 + targetInitialPos[b + 1] * 0.015;
                wrappedPositionsM[b + 2] = wrappedPositionsM[b + 2] * 0.985 + targetInitialPos[b + 2] * 0.015;
            }
        }
        // Clearance estricto sobre torso (Alt C SDF trilineal)
        sdfCollider.resolveSubstepCollision(
            wrappedPositionsM,
            wrappedPositionsM,
            freeInvMass,
            clearanceParams
        );
    }
}

function buildConformalPanelGeometry(
    panel: BodicePanelId,
    vertexOffset: number,
    spec: TwoPanelBodicePatternSpec
): BuiltPanelGeometry {
    const R = spec.rowsPerPanel;
    const C = spec.colsPerPanel;
    const neckCenterRow = panel === 'FRONT' ? spec.frontNeckCenterRow : spec.backNeckCenterRow;
    const maxArmInset = spec.armholeScoopMaxCols ?? 1.15;
    const minRowByCol = buildNecklineMinRowByCol(C, spec.strapColCount, neckCenterRow);

    const rawWrapped = evaluateFullPanelWrappedGrid(panel, spec);
    const flat2dGrid = buildFullFlatPattern2dCoords(R, C, rawWrapped, minRowByCol);
    const [, , frontBustApexZ] = evaluateTorsoSurfacePoint(0.525, Math.PI * 0.5);
    const bustApexFrontEnvZ = frontBustApexZ + spec.bustEaseM;

    const evalPhi = (rF: number, cF: number): number => {
        const phiNeck = rF - evaluateNecklineRowFloat(cF, C, spec.strapColCount, neckCenterRow);
        const armIn = evaluateArmholeColInsetFloat(rF, spec.underarmRow, maxArmInset);
        const phiArmL = cF - armIn;
        const phiArmR = (C - 1 - armIn) - cF;
        return Math.min(phiNeck, phiArmL, phiArmR);
    };

    const regularized = spec.conformalRegularized === true;
    const gridR = new Float64Array(R * C);
    const gridC = new Float64Array(R * C);
    const phi = new Float64Array(R * C);
    const leftInner = spec.strapColCount - 1;
    const rightInner = C - spec.strapColCount;
    const snapEps = regularized ? 0.45 : 0.28;

    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const g = r * C + c;
            gridR[g] = r;
            gridC[g] = c;
            phi[g] = evalPhi(r, c);

            const isFixedSeamOrHem =
                (r === 0 && (c < spec.strapColCount || c >= C - spec.strapColCount)) ||
                (r >= spec.underarmRow && (c === 0 || c === C - 1)) ||
                r === R - 1;
            if (isFixedSeamOrHem) continue;

            if (c > leftInner && c < rightInner) {
                const rn = evaluateNecklineRowFloat(c, C, spec.strapColCount, neckCenterRow);
                if (Math.abs(r - rn) < snapEps) {
                    gridR[g] = rn;
                    phi[g] = 0;
                    continue;
                }
            }
            if (r > 0 && r < spec.underarmRow && maxArmInset > 0) {
                const caL = evaluateArmholeColInsetFloat(r, spec.underarmRow, maxArmInset);
                const caR = C - 1 - caL;
                if (Math.abs(c - caL) < snapEps) {
                    gridC[g] = caL;
                    phi[g] = 0;
                } else if (Math.abs(c - caR) < snapEps) {
                    gridC[g] = caR;
                    phi[g] = 0;
                }
            }
        }
    }

    if (regularized && evaluateNecklineRowFloat(leftInner + 1, C, spec.strapColCount, neckCenterRow) > 1.35) {
        // Suavizar vértice interior adyacente a esquina de escote profundo para abrir ángulo mínimo >= 12°
        const gL = 1 * C + leftInner;
        const gR = 1 * C + rightInner;
        gridR[gL] = 1.04;
        gridC[gL] = leftInner - 0.24;
        phi[gL] = evalPhi(gridR[gL], gridC[gL]);
        gridR[gR] = 1.04;
        gridC[gR] = rightInner + 0.24;
        phi[gR] = evalPhi(gridR[gR], gridC[gR]);
    }

    const gridToVertex = new Int32Array(R * C).fill(-1);
    const vertexGridRC: [number, number][] = [];
    const cutEdgeVertexMap = new Map<string, number>();

    const allocVertex = (rF: number, cF: number): number => {
        const vId = vertexOffset + vertexGridRC.length;
        vertexGridRC.push([rF, cF]);
        return vId;
    };

    const getOrCreateGridVertex = (g: number): number => {
        if (gridToVertex[g] >= 0) return gridToVertex[g];
        const vId = allocVertex(gridR[g], gridC[g]);
        gridToVertex[g] = vId;
        return vId;
    };

    const getOrCreateCutVertex = (gA: number, gB: number): number => {
        const lo = Math.min(gA, gB);
        const hi = Math.max(gA, gB);
        const key = `${lo}_${hi}`;
        const cached = cutEdgeVertexMap.get(key);
        if (cached !== undefined) return cached;

        if (regularized) {
            const gNeckLIn = 1 * C + leftInner;
            const gNeckLOut = 1 * C + leftInner + 1;
            const gNeckRIn = 1 * C + rightInner;
            const gNeckROut = 1 * C + rightInner - 1;
            const gSnapL = 2 * C + leftInner + 1;
            const gSnapR = 2 * C + rightInner - 1;
            if (lo === gNeckLIn && hi === gNeckLOut && phi[gSnapL] >= 0 && gridR[gSnapL] > 1.2 && gridR[gSnapL] < 2.2) {
                const vSnap = getOrCreateGridVertex(gSnapL);
                cutEdgeVertexMap.set(key, vSnap);
                return vSnap;
            }
            if (lo === gNeckROut && hi === gNeckRIn && phi[gSnapR] >= 0 && gridR[gSnapR] > 1.2 && gridR[gSnapR] < 2.2) {
                const vSnap = getOrCreateGridVertex(gSnapR);
                cutEdgeVertexMap.set(key, vSnap);
                return vSnap;
            }
        }

        const rA = gridR[gA];
        const cA = gridC[gA];
        const rB = gridR[gB];
        const cB = gridC[gB];
        const aIsInside = phi[gA] > 0;
        let tLo = 0;
        let tHi = 1;
        for (let iter = 0; iter < 20; iter++) {
            const tMid = 0.5 * (tLo + tHi);
            const pMid = evalPhi(rA + (rB - rA) * tMid, cA + (cB - cA) * tMid);
            if ((pMid >= 0) === aIsInside) tLo = tMid;
            else tHi = tMid;
        }
        const tSafe = regularized
            ? clamp(0.5 * (tLo + tHi), 0.34, 0.66)
            : clamp(0.5 * (tLo + tHi), 0.24, 0.76);
        const vId = allocVertex(rA + (rB - rA) * tSafe, cA + (cB - cA) * tSafe);
        cutEdgeVertexMap.set(key, vId);
        return vId;
    };

    const triangleIndices: number[] = [];
    const pushTri = (a: number, b: number, c: number) => {
        if (panel === 'FRONT') {
            triangleIndices.push(a, b, c);
        } else {
            triangleIndices.push(a, c, b);
        }
    };

    const rcSignedArea2 = (va: number, vb: number, vc: number): number => {
        const [ra, ca] = vertexGridRC[va - vertexOffset];
        const [rb, cb] = vertexGridRC[vb - vertexOffset];
        const [rc, cc] = vertexGridRC[vc - vertexOffset];
        // Orden esperado CCW (p00->p10->p11): (rb - ra)*(cc - ca) - (cb - ca)*(rc - ra) > 0
        return (rb - ra) * (cc - ca) - (cb - ca) * (rc - ra);
    };

    const rcDist2 = (va: number, vb: number): number => {
        const [ra, ca] = vertexGridRC[va - vertexOffset];
        const [rb, cb] = vertexGridRC[vb - vertexOffset];
        return (ra - rb) * (ra - rb) + (ca - cb) * (ca - cb);
    };

    // Asegurar asignación determinista de vértices de costuras/soportes aunque estén en bordes
    for (let c = 0; c < C; c++) {
        if (c < spec.strapColCount || c >= C - spec.strapColCount) {
            getOrCreateGridVertex(c);
        }
    }
    for (let r = spec.underarmRow; r < R; r++) {
        getOrCreateGridVertex(r * C);
        getOrCreateGridVertex(r * C + (C - 1));
    }

    for (let r = 0; r < R - 1; r++) {
        for (let c = 0; c < C - 1; c++) {
            const quad = [
                r * C + c,
                (r + 1) * C + c,
                (r + 1) * C + (c + 1),
                r * C + (c + 1),
            ];
            const poly: number[] = [];
            for (let k = 0; k < 4; k++) {
                const gA = quad[k];
                const gB = quad[(k + 1) % 4];
                const pA = phi[gA];
                const pB = phi[gB];
                if (pA >= 0) {
                    const vA = getOrCreateGridVertex(gA);
                    if (poly.length === 0 || poly[poly.length - 1] !== vA) poly.push(vA);
                }
                if ((pA > 0 && pB < 0) || (pA < 0 && pB > 0)) {
                    const vCut = getOrCreateCutVertex(gA, gB);
                    if (poly.length === 0 || poly[poly.length - 1] !== vCut) poly.push(vCut);
                }
            }
            if (poly.length > 1 && poly[0] === poly[poly.length - 1]) poly.pop();
            if (poly.length < 3) continue;

            if (poly.length === 3) {
                if (rcSignedArea2(poly[0], poly[1], poly[2]) > 1e-6) {
                    pushTri(poly[0], poly[1], poly[2]);
                }
            } else if (poly.length === 4) {
                const allGrid = phi[quad[0]] >= 0 && phi[quad[1]] >= 0 && phi[quad[2]] >= 0 && phi[quad[3]] >= 0;
                let split02 = allGrid
                    ? (r + c) % 2 === 1
                    : rcDist2(poly[0], poly[2]) <= rcDist2(poly[1], poly[3]);
                if (regularized) {
                    const p2d = poly.map((v) => {
                        const [rf, cf] = vertexGridRC[v - vertexOffset];
                        return bilinearSample2d(flat2dGrid, R, C, rf, cf);
                    });
                    const min02 = Math.min(
                        triMinAngleDeg2d(p2d[0][0], p2d[0][1], p2d[1][0], p2d[1][1], p2d[2][0], p2d[2][1]),
                        triMinAngleDeg2d(p2d[0][0], p2d[0][1], p2d[2][0], p2d[2][1], p2d[3][0], p2d[3][1])
                    );
                    const min13 = Math.min(
                        triMinAngleDeg2d(p2d[0][0], p2d[0][1], p2d[1][0], p2d[1][1], p2d[3][0], p2d[3][1]),
                        triMinAngleDeg2d(p2d[1][0], p2d[1][1], p2d[2][0], p2d[2][1], p2d[3][0], p2d[3][1])
                    );
                    if (!allGrid || (split02 ? min02 : min13) < 22) {
                        split02 = min02 >= min13;
                    }
                }
                if (split02) {
                    pushTri(poly[0], poly[1], poly[2]);
                    pushTri(poly[0], poly[2], poly[3]);
                } else {
                    pushTri(poly[0], poly[1], poly[3]);
                    pushTri(poly[1], poly[2], poly[3]);
                }
            } else if (poly.length === 5) {
                let bestHub = 0;
                let bestScore = -1;
                const p2d = regularized
                    ? poly.map((v) => {
                        const [rf, cf] = vertexGridRC[v - vertexOffset];
                        return bilinearSample2d(flat2dGrid, R, C, rf, cf);
                    })
                    : null;
                for (let h = 0; h < 5; h++) {
                    const i1 = (h + 1) % 5;
                    const i2 = (h + 2) % 5;
                    const i3 = (h + 3) % 5;
                    const i4 = (h + 4) % 5;
                    const a1 = rcSignedArea2(poly[h], poly[i1], poly[i2]);
                    const a2 = rcSignedArea2(poly[h], poly[i2], poly[i3]);
                    const a3 = rcSignedArea2(poly[h], poly[i3], poly[i4]);
                    const minA = Math.min(a1, a2, a3);
                    let score = minA;
                    if (regularized && p2d) {
                        score = minA <= 1e-6
                            ? -1
                            : Math.min(
                                triMinAngleDeg2d(p2d[h][0], p2d[h][1], p2d[i1][0], p2d[i1][1], p2d[i2][0], p2d[i2][1]),
                                triMinAngleDeg2d(p2d[h][0], p2d[h][1], p2d[i2][0], p2d[i2][1], p2d[i3][0], p2d[i3][1]),
                                triMinAngleDeg2d(p2d[h][0], p2d[h][1], p2d[i3][0], p2d[i3][1], p2d[i4][0], p2d[i4][1])
                            );
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        bestHub = h;
                    }
                }
                pushTri(poly[bestHub], poly[(bestHub + 1) % 5], poly[(bestHub + 2) % 5]);
                pushTri(poly[bestHub], poly[(bestHub + 2) % 5], poly[(bestHub + 3) % 5]);
                pushTri(poly[bestHub], poly[(bestHub + 3) % 5], poly[(bestHub + 4) % 5]);
            }
        }
    }

    const localCount = vertexGridRC.length;
    const wrappedPositionsM = new Float64Array(localCount * 3);
    const flat2dPositionsM = new Float64Array(localCount * 2);
    for (let loc = 0; loc < localCount; loc++) {
        const [rF, cF] = vertexGridRC[loc];
        evaluateContinuousWrappedPoint(
            panel,
            rF,
            cF,
            spec,
            bustApexFrontEnvZ,
            wrappedPositionsM,
            loc * 3
        );
        const [u0, v0] = bilinearSample2d(flat2dGrid, R, C, rF, cF);
        flat2dPositionsM[loc * 2] = u0;
        flat2dPositionsM[loc * 2 + 1] = v0;
    }

    const centerCol = Math.floor(C / 2);
    const anchorV = gridToVertex[(R - 1) * C + centerCol];
    const anchorLocalIdx = anchorV >= 0 ? anchorV - vertexOffset : 0;
    if (regularized) {
        flipConformalInteriorDiagonals(
            vertexOffset,
            triangleIndices,
            vertexGridRC,
            wrappedPositionsM,
            flat2dPositionsM,
            C,
            spec.underarmRow
        );
    }
    flattenConformalPattern2d(
        localCount,
        vertexOffset,
        wrappedPositionsM,
        triangleIndices,
        vertexGridRC,
        anchorLocalIdx,
        flat2dPositionsM,
        regularized ? 520 : 320,
        regularized ? { cols: C, underarmRow: spec.underarmRow } : undefined
    );
    if (regularized) {
        // Cambio 1 (T5.2): Alivio geométrico 3D cuasi-isométrico hacia el patrón 2D plano (sin alterar restLengthM)
        // ejecutado sobre vértices libres con clearance garantizado contra el torso canónico Ground Truth.
        relaxWrappedPositionsIsometric3d(
            localCount,
            vertexOffset,
            triangleIndices,
            vertexGridRC,
            flat2dPositionsM,
            wrappedPositionsM,
            R,
            C,
            spec.underarmRow
        );
        // Reevaluar posibles rotaciones locales tras el relajado 3D y mantener flat2d fijo -> 0 desvío L0
        flipConformalInteriorDiagonals(
            vertexOffset,
            triangleIndices,
            vertexGridRC,
            wrappedPositionsM,
            flat2dPositionsM,
            C,
            spec.underarmRow
        );
    }

    const necklineVertices: number[] = [];
    const leftArmholeVertices: number[] = [];
    const rightArmholeVertices: number[] = [];
    for (let loc = 0; loc < localCount; loc++) {
        const [rF, cF] = vertexGridRC[loc];
        const vId = vertexOffset + loc;
        if (Math.abs(evalPhi(rF, cF)) <= 0.08) {
            if (cF >= leftInner - 0.05 && cF <= rightInner + 0.05 && rF <= neckCenterRow + 0.35) {
                necklineVertices.push(vId);
            } else if (rF <= spec.underarmRow + 0.05 && cF <= 2.5) {
                leftArmholeVertices.push(vId);
            } else if (rF <= spec.underarmRow + 0.05 && cF >= C - 3.5) {
                rightArmholeVertices.push(vId);
            }
        }
    }

    return {
        vertexCount: localCount,
        gridToVertex,
        wrappedPositionsM,
        flat2dPositionsM,
        triangleIndices,
        minRowByCol,
        vertexGridRC,
        necklineVertices,
        leftArmholeVertices,
        rightArmholeVertices,
    };
}

function buildSinglePanelGeometry(
    panel: BodicePanelId,
    vertexOffset: number,
    spec: TwoPanelBodicePatternSpec
): BuiltPanelGeometry {
    if (spec.contourMode === 'conformal') {
        return buildConformalPanelGeometry(panel, vertexOffset, spec);
    }
    const R = spec.rowsPerPanel;
    const C = spec.colsPerPanel;
    const neckCenterRow = panel === 'FRONT' ? spec.frontNeckCenterRow : spec.backNeckCenterRow;
    const minRowByCol = buildNecklineMinRowByCol(C, spec.strapColCount, neckCenterRow);

    const rawWrapped = evaluateFullPanelWrappedGrid(panel, spec);
    const flat2dGrid = buildFullFlatPattern2dCoords(R, C, rawWrapped, minRowByCol);

    const gridToVertex = new Int32Array(R * C).fill(-1);
    let localCount = 0;

    const vertexGridRC: [number, number][] = [];
    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            if (r < minRowByCol[c]) continue;
            const gIdx = r * C + c;
            gridToVertex[gIdx] = vertexOffset + localCount;
            vertexGridRC.push([r, c]);
            localCount++;
        }
    }

    const wrappedPositionsM = new Float64Array(localCount * 3);
    const flat2dPositionsM = new Float64Array(localCount * 2);
    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const gIdx = r * C + c;
            const vId = gridToVertex[gIdx];
            if (vId < 0) continue;
            const loc = vId - vertexOffset;
            wrappedPositionsM[loc * 3] = rawWrapped[gIdx * 3];
            wrappedPositionsM[loc * 3 + 1] = rawWrapped[gIdx * 3 + 1];
            wrappedPositionsM[loc * 3 + 2] = rawWrapped[gIdx * 3 + 2];
            flat2dPositionsM[loc * 2] = flat2dGrid[gIdx * 2];
            flat2dPositionsM[loc * 2 + 1] = flat2dGrid[gIdx * 2 + 1];
        }
    }

    // Construir triángulos con orientación de normal hacia el exterior del torso:
    //   FRONT (+Z): v00=(r,c), v10=(r+1,c), v01=(r,c+1), v11=(r+1,c+1)
    //     T1 = (v00, v10, v01): (v10-v00)=(0,-dy,0) x (v01-v00)=(+dx,0,0) = (0, 0, +dx*dy) => +Z!
    //   BACK  (-Z): invertir orden (a, c, b) para que la normal apunte hacia -Z exterior!
    const triangleIndices: number[] = [];
    const pushTri = (a: number, b: number, c: number) => {
        if (panel === 'FRONT') {
            triangleIndices.push(a, b, c);
        } else {
            triangleIndices.push(a, c, b);
        }
    };

    for (let r = 0; r < R - 1; r++) {
        for (let c = 0; c < C - 1; c++) {
            const v00 = gridToVertex[r * C + c];
            const v01 = gridToVertex[r * C + (c + 1)];
            const v10 = gridToVertex[(r + 1) * C + c];
            const v11 = gridToVertex[(r + 1) * C + (c + 1)];

            const countValid =
                (v00 >= 0 ? 1 : 0) +
                (v01 >= 0 ? 1 : 0) +
                (v10 >= 0 ? 1 : 0) +
                (v11 >= 0 ? 1 : 0);

            if (countValid === 4) {
                // Alternar diagonal en tablero para reducir sesgo de triangulación
                if ((r + c) % 2 === 0) {
                    pushTri(v00, v10, v01);
                    pushTri(v01, v10, v11);
                } else {
                    pushTri(v00, v10, v11);
                    pushTri(v00, v11, v01);
                }
            } else if (countValid === 3) {
                // Celda triangular en borde curvo del escote
                if (v00 < 0) pushTri(v01, v10, v11);
                else if (v01 < 0) pushTri(v00, v10, v11);
                else if (v10 < 0) pushTri(v00, v11, v01);
                else if (v11 < 0) pushTri(v00, v10, v01);
            }
        }
    }

    const necklineVertices: number[] = [];
    for (let c = spec.strapColCount - 1; c <= C - spec.strapColCount; c++) {
        const v = gridToVertex[minRowByCol[c] * C + c];
        if (v >= 0) necklineVertices.push(v);
    }
    const leftArmholeVertices: number[] = [];
    const rightArmholeVertices: number[] = [];
    for (let r = 0; r <= spec.underarmRow; r++) {
        const vl = gridToVertex[r * C];
        const vr = gridToVertex[r * C + (C - 1)];
        if (vl >= 0) leftArmholeVertices.push(vl);
        if (vr >= 0) rightArmholeVertices.push(vr);
    }

    return {
        vertexCount: localCount,
        gridToVertex,
        wrappedPositionsM,
        flat2dPositionsM,
        triangleIndices,
        minRowByCol,
        vertexGridRC,
        necklineVertices,
        leftArmholeVertices,
        rightArmholeVertices,
    };
}

function addHalfEdgeAndHinges(
    triangleIndices: Uint32Array,
    flatPattern2dM: Float64Array,
    vertexGridRC: readonly [number, number][],
    massesKg: Float64Array,
    arealMassKgPerSqM: number,
    outEdges: ClothEdgeDescriptor[],
    outHinges: BendingHingeDescriptor[]
): { structuralMaxPctCheck: number } {
    const triCount = triangleIndices.length / 3;

    // 1. Masas lumped por área del patrón 2D plano (conservación exacta de masa textil)
    for (let t = 0; t < triCount; t++) {
        const a = triangleIndices[t * 3];
        const b = triangleIndices[t * 3 + 1];
        const c = triangleIndices[t * 3 + 2];
        const ux1 = flatPattern2dM[b * 2] - flatPattern2dM[a * 2];
        const vy1 = flatPattern2dM[b * 2 + 1] - flatPattern2dM[a * 2 + 1];
        const ux2 = flatPattern2dM[c * 2] - flatPattern2dM[a * 2];
        const vy2 = flatPattern2dM[c * 2 + 1] - flatPattern2dM[a * 2 + 1];
        const area = 0.5 * Math.abs(ux1 * vy2 - vy1 * ux2);
        const triMass = area * arealMassKgPerSqM;
        const mEach = triMass / 3;
        massesKg[a] += mEach;
        massesKg[b] += mEach;
        massesKg[c] += mEach;
    }

    // 2. Mapa de semiaristas dirigidas (u -> v) => { opp, triArea }
    const halfEdges = new Map<string, { v1: number; v2: number; opp: number; area: number }>();
    const undirectedEdges = new Map<string, { i: number; j: number; areaSum: number }>();

    const triArea2d = (a: number, b: number, c: number): number => {
        const ux1 = flatPattern2dM[b * 2] - flatPattern2dM[a * 2];
        const vy1 = flatPattern2dM[b * 2 + 1] - flatPattern2dM[a * 2 + 1];
        const ux2 = flatPattern2dM[c * 2] - flatPattern2dM[a * 2];
        const vy2 = flatPattern2dM[c * 2 + 1] - flatPattern2dM[a * 2 + 1];
        return 0.5 * Math.abs(ux1 * vy2 - vy1 * ux2);
    };

    for (let t = 0; t < triCount; t++) {
        const i0 = triangleIndices[t * 3];
        const i1 = triangleIndices[t * 3 + 1];
        const i2 = triangleIndices[t * 3 + 2];
        const area = triArea2d(i0, i1, i2);

        const pairs: readonly [number, number, number][] = [
            [i0, i1, i2],
            [i1, i2, i0],
            [i2, i0, i1],
        ];
        for (const [u, v, opp] of pairs) {
            halfEdges.set(`${u}->${v}`, { v1: u, v2: v, opp, area });
            const a = Math.min(u, v);
            const b = Math.max(u, v);
            const key = `${a}_${b}`;
            const existing = undirectedEdges.get(key);
            if (existing) {
                existing.areaSum += area;
            } else {
                undirectedEdges.set(key, { i: a, j: b, areaSum: area });
            }
        }
    }

    // 3. Clasificar aristas estructurales por topología de urdimbre/trama del patrón
    for (const entry of undirectedEdges.values()) {
        const du = Math.abs(flatPattern2dM[entry.i * 2] - flatPattern2dM[entry.j * 2]);
        const dv = Math.abs(flatPattern2dM[entry.i * 2 + 1] - flatPattern2dM[entry.j * 2 + 1]);
        const restLen = Math.hypot(du, dv);
        if (restLen < 1e-8) continue;

        const [ri, ci] = vertexGridRC[entry.i];
        const [rj, cj] = vertexGridRC[entry.j];
        const dr = Math.abs(ri - rj);
        const dc = Math.abs(ci - cj);
        const drc = Math.hypot(dr, dc);
        let kind: 'warp' | 'weft' | 'shear' = 'shear';
        if (dr <= 1e-6 || (drc > 1e-6 && dr < 0.20 * drc)) {
            kind = 'weft';
        } else if (dc <= 1e-6 || (drc > 1e-6 && dc < 0.20 * drc)) {
            kind = 'warp';
        }

        // Ancho tributario equivalente = (A1 + A2) / L_edge (en bordes ~ 2*A/L_edge o área acumulada)
        const tributaryWidthM = entry.areaSum / restLen;
        outEdges.push({
            i: entry.i,
            j: entry.j,
            kind,
            restLengthM: restLen,
            tributaryWidthM,
        });
    }

    // 4. Bisagras diédricas orientadas en todas las aristas interiores del panel
    // Para v1 < v2: usar (v1 -> v2) como T1=(v1, v2, v3) y (v2 -> v1) como T2=(v1, v4, v2)
    for (const he of halfEdges.values()) {
        if (he.v1 >= he.v2) continue;
        const twin = halfEdges.get(`${he.v2}->${he.v1}`);
        if (!twin) continue;

        const du = flatPattern2dM[he.v2 * 2] - flatPattern2dM[he.v1 * 2];
        const dv = flatPattern2dM[he.v2 * 2 + 1] - flatPattern2dM[he.v1 * 2 + 1];
        const hingeLengthM = Math.hypot(du, dv);
        if (hingeLengthM < 1e-8) continue;

        outHinges.push({
            v1: he.v1,
            v2: he.v2,
            v3: he.opp,
            v4: twin.opp,
            hingeLengthM,
            combinedTriangleAreaM2: he.area + twin.area,
            restAngleRad: 0, // Patrón plano de corte
        });
    }

    return { structuralMaxPctCheck: 0 };
}

/**
 * Construye la primera prenda integrada de dos paneles (delantero + posterior)
 * con escote, sisas, costuras de hombros/costados y sujeciones distribuidas.
 */
export function generateTwoPanelBodiceGarment(
    arealMassKgPerSqM: number,
    spec: TwoPanelBodicePatternSpec = DEFAULT_TWO_PANEL_BODICE_SPEC
): TwoPanelGarmentMesh {
    const front = buildSinglePanelGeometry('FRONT', 0, spec);
    const back = buildSinglePanelGeometry('BACK', front.vertexCount, spec);
    const totalVertices = front.vertexCount + back.vertexCount;

    const restPositionsM = new Float64Array(totalVertices * 3);
    restPositionsM.set(front.wrappedPositionsM, 0);
    restPositionsM.set(back.wrappedPositionsM, front.vertexCount * 3);

    const initialWrappedPositionsM = new Float64Array(restPositionsM);

    const flatPattern2dM = new Float64Array(totalVertices * 2);
    flatPattern2dM.set(front.flat2dPositionsM, 0);
    flatPattern2dM.set(back.flat2dPositionsM, front.vertexCount * 2);

    const allTris = [...front.triangleIndices, ...back.triangleIndices];
    const triangleIndices = new Uint32Array(allTris);
    const panelTriangleSplitIndex = front.triangleIndices.length;

    const vertexPanel: BodicePanelId[] = new Array(totalVertices);
    const frontVertices: number[] = [];
    const backVertices: number[] = [];
    for (let i = 0; i < front.vertexCount; i++) {
        vertexPanel[i] = 'FRONT';
        frontVertices.push(i);
    }
    for (let i = front.vertexCount; i < totalVertices; i++) {
        vertexPanel[i] = 'BACK';
        backVertices.push(i);
    }

    const massesKg = new Float64Array(totalVertices);
    const edges: ClothEdgeDescriptor[] = [];
    const hinges: BendingHingeDescriptor[] = [];

    const allVertexGridRC: [number, number][] = [...front.vertexGridRC, ...back.vertexGridRC];
    addHalfEdgeAndHinges(
        triangleIndices,
        flatPattern2dM,
        allVertexGridRC,
        massesKg,
        arealMassKgPerSqM,
        edges,
        hinges
    );

    const panelEdgeCount = edges.length;
    const seamEdgeStartIndex = edges.length;
    const seams: GarmentSeamPairDescriptor[] = [];
    const seamEdgeIndexSet = new Set<number>();

    const pushSeamEdge = (
        group: GarmentSeamGroup,
        vFront: number,
        vBack: number
    ) => {
        if (vFront < 0 || vBack < 0) return;
        const edgeIndex = edges.length;
        edges.push({
            i: vFront,
            j: vBack,
            kind: 'warp',
            restLengthM: spec.seamRestGapM,
            tributaryWidthM: spec.seamTributaryWidthM,
        });
        seamEdgeIndexSet.add(edgeIndex);
        seams.push({
            group,
            edgeIndex,
            frontVertexIndex: vFront,
            backVertexIndex: vBack,
            restGapM: spec.seamRestGapM,
        });
    };

    const R = spec.rowsPerPanel;
    const C = spec.colsPerPanel;

    // 1. Costuras de hombros (r = 0, tirante izquierdo c = 0..4 y tirante derecho c = 20..24)
    for (let c = 0; c < spec.strapColCount; c++) {
        pushSeamEdge('LEFT_SHOULDER', front.gridToVertex[c], back.gridToVertex[c]);
    }
    for (let c = C - spec.strapColCount; c < C; c++) {
        pushSeamEdge('RIGHT_SHOULDER', front.gridToVertex[c], back.gridToVertex[c]);
    }

    // 2. Costuras de costados desde axila (r = underarmRow) hasta bajo (r = R - 1)
    for (let r = spec.underarmRow; r < R; r++) {
        pushSeamEdge(
            'LEFT_SIDE',
            front.gridToVertex[r * C],
            back.gridToVertex[r * C]
        );
        pushSeamEdge(
            'RIGHT_SIDE',
            front.gridToVertex[r * C + (C - 1)],
            back.gridToVertex[r * C + (C - 1)]
        );
    }

    // 3. Sujeciones distribuidas en banda interior del hombro (sin pin puntual en esquinas de sisa/escote)
    const pinnedIndices = new Set<number>();
    const shoulderSupportIndices: number[] = [];
    const pinCols = [
        ...Array.from({ length: Math.max(1, spec.strapColCount - 2) }, (_, k) => 1 + k),
        ...Array.from({ length: Math.max(1, spec.strapColCount - 2) }, (_, k) => C - spec.strapColCount + 1 + k),
    ];
    for (const c of pinCols) {
        const vf = front.gridToVertex[c];
        const vb = back.gridToVertex[c];
        if (vf >= 0) {
            pinnedIndices.add(vf);
            shoulderSupportIndices.push(vf);
        }
        if (vb >= 0) {
            pinnedIndices.add(vb);
            shoulderSupportIndices.push(vb);
        }
    }

    const inverseMassesPerKg = new Float64Array(totalVertices);
    let totalSurfaceMassKg = 0;
    for (let i = 0; i < totalVertices; i++) {
        totalSurfaceMassKg += massesKg[i];
        inverseMassesPerKg[i] = pinnedIndices.has(i) ? 0 : 1 / Math.max(1e-7, massesKg[i]);
    }

    // Límites anatómicos de referencia para inspección visual y métricas
    const hemFront: number[] = [];
    const hemBack: number[] = [];
    for (let c = 0; c < C; c++) {
        const vf = front.gridToVertex[(R - 1) * C + c];
        const vb = back.gridToVertex[(R - 1) * C + c];
        if (vf >= 0) hemFront.push(vf);
        if (vb >= 0) hemBack.push(vb);
    }

    const neckFront = [...front.necklineVertices];
    const neckBack = [...back.necklineVertices];
    const leftArmhole = [...front.leftArmholeVertices, ...back.leftArmholeVertices];
    const rightArmhole = [...front.rightArmholeVertices, ...back.rightArmholeVertices];

    // Medir elongación inicial t=0 vs patrón plano y relación de contorno de busto
    let initSumStretch = 0;
    let initMaxStretch = 0;
    for (const edge of edges) {
        const ib = edge.i * 3;
        const jb = edge.j * 3;
        const len = Math.hypot(
            restPositionsM[ib] - restPositionsM[jb],
            restPositionsM[ib + 1] - restPositionsM[jb + 1],
            restPositionsM[ib + 2] - restPositionsM[jb + 2]
        );
        const pct = (Math.abs(len - edge.restLengthM) / edge.restLengthM) * 100;
        initSumStretch += pct;
        if (pct > initMaxStretch) initMaxStretch = pct;
    }

    // Ancho 2D aproximado de busto (fila axila + 2 -> nivel ápice busto)
    const bustRow = Math.min(R - 1, spec.underarmRow + 2);
    const fL = front.gridToVertex[bustRow * C];
    const fR = front.gridToVertex[bustRow * C + (C - 1)];
    const bL = back.gridToVertex[bustRow * C];
    const bR = back.gridToVertex[bustRow * C + (C - 1)];
    const frontBustWidth = Math.abs(flatPattern2dM[fR * 2] - flatPattern2dM[fL * 2]);
    const backBustWidth = Math.abs(flatPattern2dM[bR * 2] - flatPattern2dM[bL * 2]);
    const garmentBustGirthM = frontBustWidth + backBustWidth;
    const bustEaseGirthRatio = garmentBustGirthM / 0.92;

    return {
        gridSize: R,
        widthM: 0.5 * garmentBustGirthM,
        heightM: 0.85 - spec.hemYM,
        vertexCount: totalVertices,
        triangleCount: triangleIndices.length / 3,
        restPositionsM,
        triangleIndices,
        pinnedIndices,
        edges,
        hinges,
        massesKg,
        inverseMassesPerKg,
        totalSurfaceMassKg,
        patternSpec: spec,
        flatPattern2dM,
        initialWrappedPositionsM,
        vertexPanel,
        panelVertexIndices: {
            FRONT: frontVertices,
            BACK: backVertices,
        },
        panelEdgeCount,
        seamEdgeStartIndex,
        seams,
        seamEdgeIndexSet,
        panelTriangleSplitIndex,
        shoulderSupportIndices,
        hemVertexIndices: { FRONT: hemFront, BACK: hemBack },
        necklineVertexIndices: { FRONT: neckFront, BACK: neckBack },
        armholeVertexIndices: { LEFT: leftArmhole, RIGHT: rightArmhole },
        garmentStats: {
            frontVertexCount: front.vertexCount,
            backVertexCount: back.vertexCount,
            frontTriangleCount: front.triangleIndices.length / 3,
            backTriangleCount: back.triangleIndices.length / 3,
            panelEdgeCount,
            seamEdgeCount: seams.length,
            hingeCount: hinges.length,
            pinnedSupportCount: pinnedIndices.size,
            initialMaxStretchPct: Math.round(initMaxStretch * 1000) / 1000,
            initialMeanStretchPct: Math.round((initSumStretch / edges.length) * 1000) / 1000,
            bustEaseGirthRatio: Math.round(bustEaseGirthRatio * 1000) / 1000,
        },
    };
}

/**
 * Mide métricas desagregadas de paneles, costuras por grupo y anatomía de caída.
 */
export function measureTwoPanelGarmentMetrics(
    garment: TwoPanelGarmentMesh,
    positionsM: Float64Array,
    gtSignedDistancesM: Float64Array | null
): TwoPanelGarmentMetrics {
    let panelSum = 0;
    let panelMax = 0;
    let frontSum = 0;
    let frontMax = 0;
    let frontCount = 0;
    let backSum = 0;
    let backMax = 0;
    let backCount = 0;

    for (let eIdx = 0; eIdx < garment.panelEdgeCount; eIdx++) {
        const edge = garment.edges[eIdx];
        const ib = edge.i * 3;
        const jb = edge.j * 3;
        const len = Math.hypot(
            positionsM[ib] - positionsM[jb],
            positionsM[ib + 1] - positionsM[jb + 1],
            positionsM[ib + 2] - positionsM[jb + 2]
        );
        const pct = (Math.abs(len - edge.restLengthM) / edge.restLengthM) * 100;
        panelSum += pct;
        if (pct > panelMax) panelMax = pct;

        if (garment.vertexPanel[edge.i] === 'FRONT') {
            frontSum += pct;
            if (pct > frontMax) frontMax = pct;
            frontCount++;
        } else {
            backSum += pct;
            if (pct > backMax) backMax = pct;
            backCount++;
        }
    }

    const groupAccum: Record<GarmentSeamGroup, {
        pairCount: number;
        gapSumMm: number;
        gapMaxMm: number;
        stretchSum: number;
        stretchMax: number;
    }> = {
        LEFT_SHOULDER: { pairCount: 0, gapSumMm: 0, gapMaxMm: 0, stretchSum: 0, stretchMax: 0 },
        RIGHT_SHOULDER: { pairCount: 0, gapSumMm: 0, gapMaxMm: 0, stretchSum: 0, stretchMax: 0 },
        LEFT_SIDE: { pairCount: 0, gapSumMm: 0, gapMaxMm: 0, stretchSum: 0, stretchMax: 0 },
        RIGHT_SIDE: { pairCount: 0, gapSumMm: 0, gapMaxMm: 0, stretchSum: 0, stretchMax: 0 },
    };

    let seamSumPct = 0;
    let seamMaxPct = 0;
    let seamGapSumMm = 0;
    let seamGapMaxMm = 0;

    for (const seam of garment.seams) {
        const fb = seam.frontVertexIndex * 3;
        const bb = seam.backVertexIndex * 3;
        const len = Math.hypot(
            positionsM[fb] - positionsM[bb],
            positionsM[fb + 1] - positionsM[bb + 1],
            positionsM[fb + 2] - positionsM[bb + 2]
        );
        const gapMm = len * 1000;
        const pct = (Math.abs(len - seam.restGapM) / seam.restGapM) * 100;

        seamSumPct += pct;
        if (pct > seamMaxPct) seamMaxPct = pct;
        seamGapSumMm += gapMm;
        if (gapMm > seamGapMaxMm) seamGapMaxMm = gapMm;

        const g = groupAccum[seam.group];
        g.pairCount++;
        g.gapSumMm += gapMm;
        if (gapMm > g.gapMaxMm) g.gapMaxMm = gapMm;
        g.stretchSum += pct;
        if (pct > g.stretchMax) g.stretchMax = pct;
    }

    const seamByGroup = {} as Record<GarmentSeamGroup, SeamGroupStats>;
    for (const key of Object.keys(groupAccum) as GarmentSeamGroup[]) {
        const a = groupAccum[key];
        seamByGroup[key] = {
            pairCount: a.pairCount,
            meanGapMm: a.pairCount > 0 ? Math.round((a.gapSumMm / a.pairCount) * 1000) / 1000 : 0,
            maxGapMm: Math.round(a.gapMaxMm * 1000) / 1000,
            meanStretchPct: a.pairCount > 0 ? Math.round((a.stretchSum / a.pairCount) * 1000) / 1000 : 0,
            maxStretchPct: Math.round(a.stretchMax * 1000) / 1000,
        };
    }

    // Separación sub-busto anterior (y in [0.38, 0.50], |x| <= 0.14, panel FRONT)
    let subBustGapSum = 0;
    let subBustGapCount = 0;
    if (gtSignedDistancesM) {
        for (const v of garment.panelVertexIndices.FRONT) {
            const y = positionsM[v * 3 + 1];
            const x = positionsM[v * 3];
            if (y >= 0.36 && y <= 0.50 && Math.abs(x) <= 0.14) {
                subBustGapSum += Math.max(0, gtSignedDistancesM[v] * 1000);
                subBustGapCount++;
            }
        }
    }

    // Caída de dobladillo respecto a t=0
    let hemDropSum = 0;
    let hemCount = 0;
    let frontHemY = 0;
    for (const v of garment.hemVertexIndices.FRONT) {
        const y = positionsM[v * 3 + 1];
        frontHemY += y;
        hemDropSum += garment.initialWrappedPositionsM[v * 3 + 1] - y;
        hemCount++;
    }
    let backHemY = 0;
    for (const v of garment.hemVertexIndices.BACK) {
        const y = positionsM[v * 3 + 1];
        backHemY += y;
        hemDropSum += garment.initialWrappedPositionsM[v * 3 + 1] - y;
        hemCount++;
    }

    const avgDropMm = (indices: readonly number[]): number => {
        if (indices.length === 0) return 0;
        let s = 0;
        for (const v of indices) {
            s += (garment.initialWrappedPositionsM[v * 3 + 1] - positionsM[v * 3 + 1]) * 1000;
        }
        return Math.round((s / indices.length) * 1000) / 1000;
    };

    const totalEdges = garment.edges.length;
    return {
        panelMeanStretchPct: Math.round((panelSum / garment.panelEdgeCount) * 10000) / 10000,
        panelMaxStretchPct: Math.round(panelMax * 10000) / 10000,
        frontPanelMeanStretchPct: frontCount > 0 ? Math.round((frontSum / frontCount) * 10000) / 10000 : 0,
        frontPanelMaxStretchPct: Math.round(frontMax * 10000) / 10000,
        backPanelMeanStretchPct: backCount > 0 ? Math.round((backSum / backCount) * 10000) / 10000 : 0,
        backPanelMaxStretchPct: Math.round(backMax * 10000) / 10000,
        seamMeanStretchPct: garment.seams.length > 0 ? Math.round((seamSumPct / garment.seams.length) * 10000) / 10000 : 0,
        seamMaxStretchPct: Math.round(seamMaxPct * 10000) / 10000,
        seamMeanGapMm: garment.seams.length > 0 ? Math.round((seamGapSumMm / garment.seams.length) * 1000) / 1000 : 0,
        seamMaxGapMm: Math.round(seamGapMaxMm * 1000) / 1000,
        seamByGroup,
        combinedMeanStretchPct: Math.round(((panelSum + seamSumPct) / totalEdges) * 10000) / 10000,
        combinedMaxStretchPct: Math.round(Math.max(panelMax, seamMaxPct) * 10000) / 10000,
        subBustMeanAirGapMm: subBustGapCount > 0 ? Math.round((subBustGapSum / subBustGapCount) * 1000) / 1000 : 0,
        hemDropMeanM: hemCount > 0 ? Math.round((hemDropSum / hemCount) * 10000) / 10000 : 0,
        frontHemBottomYM: garment.hemVertexIndices.FRONT.length > 0
            ? Math.round((frontHemY / garment.hemVertexIndices.FRONT.length) * 10000) / 10000
            : 0,
        backHemBottomYM: garment.hemVertexIndices.BACK.length > 0
            ? Math.round((backHemY / garment.hemVertexIndices.BACK.length) * 10000) / 10000
            : 0,
        leftArmholeDropMm: avgDropMm(garment.armholeVertexIndices.LEFT),
        rightArmholeDropMm: avgDropMm(garment.armholeVertexIndices.RIGHT),
        frontNeckDropMm: avgDropMm(garment.necklineVertexIndices.FRONT),
    };
}

/**
 * Audita calidad geométrica de malla (arista mínima, área mínima, ángulo mínimo y clasificación de aristas).
 */
export function inspectGarmentMeshQuality(garment: TwoPanelGarmentMesh): GarmentMeshQualityStats {
    let minPanelEdgeLenMm = Infinity;
    let maxPanelEdgeLenMm = 0;
    let warpEdgeCount = 0;
    let weftEdgeCount = 0;
    let shearEdgeCount = 0;

    for (let e = 0; e < garment.panelEdgeCount; e++) {
        const edge = garment.edges[e];
        const lenMm = edge.restLengthM * 1000;
        if (lenMm < minPanelEdgeLenMm) minPanelEdgeLenMm = lenMm;
        if (lenMm > maxPanelEdgeLenMm) maxPanelEdgeLenMm = lenMm;
        if (edge.kind === 'warp') warpEdgeCount++;
        else if (edge.kind === 'weft') weftEdgeCount++;
        else shearEdgeCount++;
    }

    let minTriangleAreaMm2 = Infinity;
    let minAngleDeg = 180;
    let degenerateTriangleCount = 0;
    const pos = garment.restPositionsM;
    const tris = garment.triangleIndices;
    const triCount = tris.length / 3;

    for (let t = 0; t < triCount; t++) {
        const a = tris[t * 3];
        const b = tris[t * 3 + 1];
        const c = tris[t * 3 + 2];
        const abx = pos[b * 3] - pos[a * 3];
        const aby = pos[b * 3 + 1] - pos[a * 3 + 1];
        const abz = pos[b * 3 + 2] - pos[a * 3 + 2];
        const acx = pos[c * 3] - pos[a * 3];
        const acy = pos[c * 3 + 1] - pos[a * 3 + 1];
        const acz = pos[c * 3 + 2] - pos[a * 3 + 2];
        const bcx = pos[c * 3] - pos[b * 3];
        const bcy = pos[c * 3 + 1] - pos[b * 3 + 1];
        const bcz = pos[c * 3 + 2] - pos[b * 3 + 2];

        const cx = aby * acz - abz * acy;
        const cy = abz * acx - abx * acz;
        const cz = abx * acy - aby * acx;
        const areaMm2 = 0.5 * Math.hypot(cx, cy, cz) * 1e6;
        if (areaMm2 < minTriangleAreaMm2) minTriangleAreaMm2 = areaMm2;
        if (areaMm2 < 1.0) degenerateTriangleCount++;

        const la = Math.hypot(abx, aby, abz);
        const lb = Math.hypot(bcx, bcy, bcz);
        const lc = Math.hypot(acx, acy, acz);
        if (la < 1e-7 || lb < 1e-7 || lc < 1e-7) {
            degenerateTriangleCount++;
            minAngleDeg = 0;
            continue;
        }
        const cosA = clamp((la * la + lc * lc - lb * lb) / (2 * la * lc), -1, 1);
        const cosB = clamp((la * la + lb * lb - lc * lc) / (2 * la * lb), -1, 1);
        const cosC = clamp((lb * lb + lc * lc - la * la) / (2 * lb * lc), -1, 1);
        const minRad = Math.min(Math.acos(cosA), Math.acos(cosB), Math.acos(cosC));
        const deg = (minRad * 180) / Math.PI;
        if (deg < minAngleDeg) minAngleDeg = deg;
    }

    return {
        minPanelEdgeLenMm: Math.round(minPanelEdgeLenMm * 1000) / 1000,
        maxPanelEdgeLenMm: Math.round(maxPanelEdgeLenMm * 1000) / 1000,
        minTriangleAreaMm2: Math.round(minTriangleAreaMm2 * 1000) / 1000,
        minAngleDeg: Math.round(minAngleDeg * 100) / 100,
        degenerateTriangleCount,
        warpEdgeCount,
        weftEdgeCount,
        shearEdgeCount,
    };
}

