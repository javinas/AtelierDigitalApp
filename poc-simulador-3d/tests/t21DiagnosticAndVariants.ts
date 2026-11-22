// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): DIAGNÓSTICO Y OPTIMIZACIONES T2.1
// Archivo: poc-simulador-3d/tests/t21DiagnosticAndVariants.ts
// ==============================================================================
// 1. Diagnostica aristas críticas (top-10), concentración en los 2 anclajes
//    y desglose CPU por fase (predict, stretch, bending, commit).
// 2. Mide convergencia con aumento de subpasos y prueba de ancho de anclaje.
// 3. Evalúa variantes optimizadas XPBD (16x16 y 32x32, 10 s = 600 frames)
//    sin alterar resultados originales T2 ni los umbrales PASS/FAIL.
// ==============================================================================

import {
    computeXpbdBendingCompliance,
    computeXpbdEdgeCompliance,
    gsmToKgPerSqM,
    selectDirectionalBendingRigidityNm,
    STANDARD_GRAVITY_M_S2,
} from '../harness/siConversionAndParams';
import {
    GATE1_MEAN_STRETCH_PCT_LIMIT,
    GATE1_PEAK_STRETCH_PCT_LIMIT,
    measureEdgeStretchStats,
    measurePenetrationStats,
    TelemetryHarness,
} from '../harness/telemetryHarness';
import { BendingRigiditySpec, TelemetryExportBatch } from '../harness/types';
import {
    ClothEdgeDescriptor,
    GeneratedClothMesh,
    generateScene0ClothMesh,
} from '../scene0/clothMeshGenerator';
import { computeSignedDihedralGradientsInto } from '../solvers/clothSolvers';

export interface CriticalEdgeDiagnostic {
    rank: number;
    edgeIndex: number;
    kind: ClothEdgeDescriptor['kind'];
    vertexI: number;
    vertexJ: number;
    coordI: [number, number]; // [row, col]
    coordJ: [number, number]; // [row, col]
    touchesPinnedCorner: boolean;
    restLengthM: number;
    actualLengthM: number;
    stretchPct: number;
}

export interface PhaseCpuProfile {
    runId: string;
    totalFrames: number;
    predictMsMean: number;
    stretchMsMean: number;
    bendingMsMean: number;
    commitMsMean: number;
    physicsStepMsMean: number;
    physicsStepMsP95: number;
    sharesPct: {
        predict: number;
        stretch: number;
        bending: number;
        commit: number;
    };
}

export type BendingModeVariant = 'dihedral_full' | 'opposite_distance_surrogate';

export interface XpbdVariantConfig {
    variantId: string;
    description: string;
    dtFrameS: number;
    substeps: number;
    stretchIterationsPerSubstep: number;
    bendingIterationsPerSubstep: number;
    bidirectionalStretchSweep: boolean;
    bendingMode: BendingModeVariant;
    airDampingPerS: number;
    warpWeftStiffnessNPerM: number;
    shearStiffnessNPerM: number;
    bending: BendingRigiditySpec;
    extraCornerPinTabNodes?: number; // 1 = esquina puntual T2; >1 = diagnóstico ancho anclaje
}

export interface T21VariantRunSummary {
    variantId: string;
    runId: string;
    gridSize: number;
    vertexCount: number;
    triangleCount: number;
    edgeCount: number;
    hingeCount: number;
    substeps: number;
    stretchIterationsPerSubstep: number;
    bendingIterationsPerSubstep: number;
    bidirectionalStretchSweep: boolean;
    bendingMode: BendingModeVariant;
    pinnedVerticesCount: number;
    nanVertexCountTotal: number;
    phaseProfile: PhaseCpuProfile;
    transientPeakStretchPct: number;
    transientMeanStretchPctMax: number;
    equilibriumMaxStretchPct: number;
    equilibriumMeanStretchPct: number;
    interiorNonAnchorEquilibriumMaxStretchPct: number;
    centerBottomDropM: number;
    meanDropM: number;
    didNotLockOrFreeze: boolean;
    checks: {
        zeroNan: boolean;
        equilibriumMeanStretchLe2Pct: boolean;
        equilibriumPeakStretchLe5Pct: boolean;
        transientMeanStretchLe2Pct: boolean;
        transientPeakStretchLe5Pct: boolean;
        withinDesktopPhysicsBudgetMean16ms: boolean;
        lockingNonFreezingPass: boolean;
    };
}

export interface T21VariantInvariance {
    variantId: string;
    centerBottomDropDiffPct: number;
    meanDropDiffPct: number;
    shapeRmsDiffPctOfClothLength: number;
    invariancePassLe10Pct: boolean;
}

export interface T21DiagnosticReport {
    generatedAtIso: string;
    referenceConditionsPreserved: string;
    criticalEdgeDiagnosis: {
        xpbd16TransientPeakFrame: number;
        xpbd16TransientTopEdges: CriticalEdgeDiagnostic[];
        xpbd16EquilibriumTopEdges: CriticalEdgeDiagnostic[];
        xpbd32TransientPeakFrame: number;
        xpbd32TransientTopEdges: CriticalEdgeDiagnostic[];
        xpbd32EquilibriumTopEdges: CriticalEdgeDiagnostic[];
    };
    anchorAndConvergenceSensitivity32x32: {
        note: string;
        trials: {
            trialId: string;
            substeps: number;
            stretchIterations: number;
            pinnedVerticesPerCorner: number;
            transientPeakStretchPct: number;
            equilibriumMaxStretchPct: number;
            interiorNonAnchorEqMaxStretchPct: number;
            equilibriumMeanStretchPct: number;
            physicsStepMsMean: number;
        }[];
    };
    optimizationVariants: {
        runs: T21VariantRunSummary[];
        invariance: T21VariantInvariance[];
    };
}

interface SurrogateHingeConstraint {
    v3: number;
    v4: number;
    restDistanceM: number;
    alphaTilde: number;
}

class InstrumentedXpbdClothSolver {
    readonly mesh: GeneratedClothMesh;
    readonly config: XpbdVariantConfig;
    readonly positionsM: Float64Array;
    readonly predictedM: Float64Array;
    readonly velocitiesMS: Float64Array;
    readonly inverseMassesPerKg: Float64Array;

    private readonly edgeAlphaTilde: Float64Array;
    private readonly edgeLambdas: Float64Array;
    private readonly hingeAlphaTildeUp: Float64Array;
    private readonly hingeAlphaTildeDown: Float64Array;
    private readonly hingeLambdas: Float64Array;
    private readonly surrogateHinges: SurrogateHingeConstraint[];
    private readonly surrogateLambdas: Float64Array;
    private readonly substepDtS: number;
    private readonly gradScratch = new Float64Array(13);

    constructor(mesh: GeneratedClothMesh, config: XpbdVariantConfig) {
        this.mesh = mesh;
        this.config = config;
        this.substepDtS = config.dtFrameS / config.substeps;

        this.positionsM = new Float64Array(mesh.restPositionsM);
        this.predictedM = new Float64Array(mesh.restPositionsM);
        this.velocitiesMS = new Float64Array(mesh.vertexCount * 3);
        this.inverseMassesPerKg = new Float64Array(mesh.inverseMassesPerKg);

        // Solo para el diagnóstico controlado de ancho de anclaje en §diagnóstico
        const extraTab = config.extraCornerPinTabNodes ?? 1;
        if (extraTab > 1) {
            for (let k = 0; k < extraTab; k++) {
                this.inverseMassesPerKg[k] = 0;
                this.inverseMassesPerKg[mesh.gridSize - 1 - k] = 0;
            }
        }

        this.edgeAlphaTilde = new Float64Array(mesh.edges.length);
        this.edgeLambdas = new Float64Array(mesh.edges.length);
        this.hingeAlphaTildeUp = new Float64Array(mesh.hinges.length);
        this.hingeAlphaTildeDown = new Float64Array(mesh.hinges.length);
        this.hingeLambdas = new Float64Array(mesh.hinges.length);

        for (let e = 0; e < mesh.edges.length; e++) {
            const edge = mesh.edges[e];
            const stiffnessNPerM = edge.kind === 'shear'
                ? config.shearStiffnessNPerM
                : config.warpWeftStiffnessNPerM;
            this.edgeAlphaTilde[e] = computeXpbdEdgeCompliance(
                stiffnessNPerM,
                edge.restLengthM,
                edge.tributaryWidthM,
                this.substepDtS
            ).alphaTildePerKg;
        }

        const bUpNm = selectDirectionalBendingRigidityNm(config.bending, 1);
        const bDownNm = selectDirectionalBendingRigidityNm(config.bending, -1);
        this.surrogateHinges = [];

        for (let h = 0; h < mesh.hinges.length; h++) {
            const hinge = mesh.hinges[h];
            this.hingeAlphaTildeUp[h] = computeXpbdBendingCompliance(
                bUpNm,
                hinge.hingeLengthM,
                hinge.combinedTriangleAreaM2,
                this.substepDtS
            ).alphaTildePerKgM2;
            this.hingeAlphaTildeDown[h] = computeXpbdBendingCompliance(
                bDownNm,
                hinge.hingeLengthM,
                hinge.combinedTriangleAreaM2,
                this.substepDtS
            ).alphaTildePerKgM2;

            if (config.bendingMode === 'opposite_distance_surrogate') {
                const dx = mesh.restPositionsM[hinge.v3 * 3] - mesh.restPositionsM[hinge.v4 * 3];
                const dy = mesh.restPositionsM[hinge.v3 * 3 + 1] - mesh.restPositionsM[hinge.v4 * 3 + 1];
                const dz = mesh.restPositionsM[hinge.v3 * 3 + 2] - mesh.restPositionsM[hinge.v4 * 3 + 2];
                const d0 = Math.sqrt(dx * dx + dy * dy + dz * dz);
                // Escala aproximada distancia-opuesta para B sin atan2 (limitación: pierde asimetría)
                const hEff = hinge.combinedTriangleAreaM2 / Math.max(1e-6, hinge.hingeLengthM);
                const approxEdgeStiffness = (3 * bUpNm * hinge.hingeLengthM * hinge.hingeLengthM)
                    / (hinge.combinedTriangleAreaM2 * hEff * hEff);
                const alphaTilde = (1 / Math.max(1e-9, approxEdgeStiffness)) / (this.substepDtS * this.substepDtS);
                this.surrogateHinges.push({
                    v3: hinge.v3,
                    v4: hinge.v4,
                    restDistanceM: d0,
                    alphaTilde,
                });
            }
        }
        this.surrogateLambdas = new Float64Array(this.surrogateHinges.length);
    }

    stepFrameTimed(): { predictMs: number; stretchMs: number; bendingMs: number; commitMs: number } {
        const dtS = this.substepDtS;
        const nSub = this.config.substeps;
        const nStretch = this.config.stretchIterationsPerSubstep;
        const nBend = this.config.bendingIterationsPerSubstep;
        const dampingFactor = Math.exp(-this.config.airDampingPerS * dtS);
        const vCount = this.mesh.vertexCount;
        const invMass = this.inverseMassesPerKg;
        const pos = this.positionsM;
        const pred = this.predictedM;
        const vel = this.velocitiesMS;

        let predictMs = 0;
        let stretchMs = 0;
        let bendingMs = 0;
        let commitMs = 0;

        for (let sub = 0; sub < nSub; sub++) {
            const t0 = performance.now();
            for (let i = 0; i < vCount; i++) {
                const base = i * 3;
                if (invMass[i] === 0) {
                    pred[base] = pos[base];
                    pred[base + 1] = pos[base + 1];
                    pred[base + 2] = pos[base + 2];
                    vel[base] = 0;
                    vel[base + 1] = 0;
                    vel[base + 2] = 0;
                    continue;
                }
                const vx = vel[base] * dampingFactor;
                const vy = (vel[base + 1] - STANDARD_GRAVITY_M_S2 * dtS) * dampingFactor;
                const vz = vel[base + 2] * dampingFactor;
                vel[base] = vx;
                vel[base + 1] = vy;
                vel[base + 2] = vz;

                pred[base] = pos[base] + vx * dtS;
                pred[base + 1] = pos[base + 1] + vy * dtS;
                pred[base + 2] = pos[base + 2] + vz * dtS;
            }
            this.edgeLambdas.fill(0);
            this.hingeLambdas.fill(0);
            if (this.surrogateLambdas.length > 0) {
                this.surrogateLambdas.fill(0);
            }
            const t1 = performance.now();
            predictMs += t1 - t0;

            const maxRounds = Math.max(nStretch, nBend);
            for (let r = 0; r < maxRounds; r++) {
                if (r < nStretch) {
                    const ts0 = performance.now();
                    const reverse = this.config.bidirectionalStretchSweep && (r % 2 === 1);
                    this.solveStretchPass(reverse);
                    stretchMs += performance.now() - ts0;
                }
                if (r < nBend) {
                    const tb0 = performance.now();
                    if (this.config.bendingMode === 'dihedral_full') {
                        this.solveDihedralBendingPass();
                    } else {
                        this.solveSurrogateBendingPass();
                    }
                    bendingMs += performance.now() - tb0;
                }
            }

            const tc0 = performance.now();
            const invDt = 1 / dtS;
            for (let i = 0; i < vCount; i++) {
                const base = i * 3;
                if (invMass[i] === 0) {
                    vel[base] = 0;
                    vel[base + 1] = 0;
                    vel[base + 2] = 0;
                    continue;
                }
                vel[base] = (pred[base] - pos[base]) * invDt;
                vel[base + 1] = (pred[base + 1] - pos[base + 1]) * invDt;
                vel[base + 2] = (pred[base + 2] - pos[base + 2]) * invDt;

                pos[base] = pred[base];
                pos[base + 1] = pred[base + 1];
                pos[base + 2] = pred[base + 2];
            }
            commitMs += performance.now() - tc0;
        }

        return { predictMs, stretchMs, bendingMs, commitMs };
    }

    private solveStretchPass(reverse: boolean): void {
        const pred = this.predictedM;
        const invMass = this.inverseMassesPerKg;
        const edges = this.mesh.edges;
        const count = edges.length;

        const start = reverse ? count - 1 : 0;
        const end = reverse ? -1 : count;
        const step = reverse ? -1 : 1;

        for (let e = start; e !== end; e += step) {
            const edge = edges[e];
            const wi = invMass[edge.i];
            const wj = invMass[edge.j];
            const wSum = wi + wj;
            if (wSum <= 0) continue;

            const bi = edge.i * 3;
            const bj = edge.j * 3;
            const dx = pred[bi] - pred[bj];
            const dy = pred[bi + 1] - pred[bj + 1];
            const dz = pred[bi + 2] - pred[bj + 2];
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (len < 1e-10) continue;

            const invLen = 1 / len;
            const c = len - edge.restLengthM;
            const alphaTilde = this.edgeAlphaTilde[e];
            const dLambda = (-c - alphaTilde * this.edgeLambdas[e]) / (wSum + alphaTilde);
            this.edgeLambdas[e] += dLambda;

            if (wi > 0) {
                const s = wi * dLambda * invLen;
                pred[bi] += dx * s;
                pred[bi + 1] += dy * s;
                pred[bi + 2] += dz * s;
            }
            if (wj > 0) {
                const s = wj * dLambda * invLen;
                pred[bj] -= dx * s;
                pred[bj + 1] -= dy * s;
                pred[bj + 2] -= dz * s;
            }
        }
    }

    private solveDihedralBendingPass(): void {
        const pred = this.predictedM;
        const invMass = this.inverseMassesPerKg;
        const hinges = this.mesh.hinges;
        const gs = this.gradScratch;

        for (let h = 0; h < hinges.length; h++) {
            const hinge = hinges[h];
            const w1 = invMass[hinge.v1];
            const w2 = invMass[hinge.v2];
            const w3 = invMass[hinge.v3];
            const w4 = invMass[hinge.v4];
            if (w1 + w2 + w3 + w4 <= 0) continue;

            if (!computeSignedDihedralGradientsInto(pred, hinge.v1, hinge.v2, hinge.v3, hinge.v4, gs)) {
                continue;
            }

            const c = gs[0] - hinge.restAngleRad;
            const g1x = gs[1]; const g1y = gs[2]; const g1z = gs[3];
            const g2x = gs[4]; const g2y = gs[5]; const g2z = gs[6];
            const g3x = gs[7]; const g3y = gs[8]; const g3z = gs[9];
            const g4x = gs[10]; const g4y = gs[11]; const g4z = gs[12];

            const denomGrad =
                w1 * (g1x * g1x + g1y * g1y + g1z * g1z)
                + w2 * (g2x * g2x + g2y * g2y + g2z * g2z)
                + w3 * (g3x * g3x + g3y * g3y + g3z * g3z)
                + w4 * (g4x * g4x + g4y * g4y + g4z * g4z);

            if (denomGrad < 1e-12) continue;

            const alphaTilde = c >= 0 ? this.hingeAlphaTildeUp[h] : this.hingeAlphaTildeDown[h];
            const dLambda = (-c - alphaTilde * this.hingeLambdas[h]) / (denomGrad + alphaTilde);
            this.hingeLambdas[h] += dLambda;

            if (w1 > 0) {
                const s = w1 * dLambda;
                const b1 = hinge.v1 * 3;
                pred[b1] += g1x * s;
                pred[b1 + 1] += g1y * s;
                pred[b1 + 2] += g1z * s;
            }
            if (w2 > 0) {
                const s = w2 * dLambda;
                const b2 = hinge.v2 * 3;
                pred[b2] += g2x * s;
                pred[b2 + 1] += g2y * s;
                pred[b2 + 2] += g2z * s;
            }
            if (w3 > 0) {
                const s = w3 * dLambda;
                const b3 = hinge.v3 * 3;
                pred[b3] += g3x * s;
                pred[b3 + 1] += g3y * s;
                pred[b3 + 2] += g3z * s;
            }
            if (w4 > 0) {
                const s = w4 * dLambda;
                const b4 = hinge.v4 * 3;
                pred[b4] += g4x * s;
                pred[b4 + 1] += g4y * s;
                pred[b4 + 2] += g4z * s;
            }
        }
    }

    private solveSurrogateBendingPass(): void {
        const pred = this.predictedM;
        const invMass = this.inverseMassesPerKg;
        const items = this.surrogateHinges;

        for (let h = 0; h < items.length; h++) {
            const item = items[h];
            const w3 = invMass[item.v3];
            const w4 = invMass[item.v4];
            const wSum = w3 + w4;
            if (wSum <= 0) continue;

            const b3 = item.v3 * 3;
            const b4 = item.v4 * 3;
            const dx = pred[b3] - pred[b4];
            const dy = pred[b3 + 1] - pred[b4 + 1];
            const dz = pred[b3 + 2] - pred[b4 + 2];
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (len < 1e-10) continue;

            const c = len - item.restDistanceM;
            const alphaTilde = item.alphaTilde;
            const dLambda = (-c - alphaTilde * this.surrogateLambdas[h]) / (wSum + alphaTilde);
            this.surrogateLambdas[h] += dLambda;

            const invLen = 1 / len;
            if (w3 > 0) {
                const s = w3 * dLambda * invLen;
                pred[b3] += dx * s;
                pred[b3 + 1] += dy * s;
                pred[b3 + 2] += dz * s;
            }
            if (w4 > 0) {
                const s = w4 * dLambda * invLen;
                pred[b4] -= dx * s;
                pred[b4 + 1] -= dy * s;
                pred[b4 + 2] -= dz * s;
            }
        }
    }
}

function getTopCriticalEdges(
    mesh: GeneratedClothMesh,
    positionsM: Float64Array,
    inverseMassesPerKg: Float64Array,
    topN: number = 10
): CriticalEdgeDiagnostic[] {
    const entries: CriticalEdgeDiagnostic[] = [];
    const g = mesh.gridSize;

    for (let e = 0; e < mesh.edges.length; e++) {
        const edge = mesh.edges[e];
        const dx = positionsM[edge.i * 3] - positionsM[edge.j * 3];
        const dy = positionsM[edge.i * 3 + 1] - positionsM[edge.j * 3 + 1];
        const dz = positionsM[edge.i * 3 + 2] - positionsM[edge.j * 3 + 2];
        const actualLengthM = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const stretchPct = (Math.abs(actualLengthM - edge.restLengthM) / edge.restLengthM) * 100;

        entries.push({
            rank: 0,
            edgeIndex: e,
            kind: edge.kind,
            vertexI: edge.i,
            vertexJ: edge.j,
            coordI: [Math.floor(edge.i / g), edge.i % g],
            coordJ: [Math.floor(edge.j / g), edge.j % g],
            touchesPinnedCorner: inverseMassesPerKg[edge.i] === 0 || inverseMassesPerKg[edge.j] === 0,
            restLengthM: Math.round(edge.restLengthM * 1e6) / 1e6,
            actualLengthM: Math.round(actualLengthM * 1e6) / 1e6,
            stretchPct: Math.round(stretchPct * 10000) / 10000,
        });
    }

    entries.sort((a, b) => b.stretchPct - a.stretchPct);
    return entries.slice(0, topN).map((item, idx) => ({ ...item, rank: idx + 1 }));
}

function sampleMeshPointNormalized(
    pos: Float64Array,
    gridSize: number,
    u: number,
    v: number
): [number, number, number] {
    const fx = u * (gridSize - 1);
    const fz = v * (gridSize - 1);
    const c0 = Math.min(gridSize - 2, Math.max(0, Math.floor(fx)));
    const r0 = Math.min(gridSize - 2, Math.max(0, Math.floor(fz)));
    const tx = fx - c0;
    const tz = fz - r0;

    const i00 = (r0 * gridSize + c0) * 3;
    const i10 = (r0 * gridSize + (c0 + 1)) * 3;
    const i01 = ((r0 + 1) * gridSize + c0) * 3;
    const i11 = ((r0 + 1) * gridSize + (c0 + 1)) * 3;

    const w00 = (1 - tx) * (1 - tz);
    const w10 = tx * (1 - tz);
    const w01 = (1 - tx) * tz;
    const w11 = tx * tz;

    return [
        pos[i00] * w00 + pos[i10] * w10 + pos[i01] * w01 + pos[i11] * w11,
        pos[i00 + 1] * w00 + pos[i10 + 1] * w10 + pos[i01 + 1] * w01 + pos[i11 + 1] * w11,
        pos[i00 + 2] * w00 + pos[i10 + 2] * w10 + pos[i01 + 2] * w01 + pos[i11 + 2] * w11,
    ];
}

function runVariantSimulation(
    config: XpbdVariantConfig,
    gridSize: number,
    arealMassKgPerSqM: number,
    totalFrames: number
): {
    summary: T21VariantRunSummary;
    batch: TelemetryExportBatch;
    finalPositionsM: Float64Array;
    transientPeakFrame: number;
    transientPeakSnapshot: Float64Array;
    mesh: GeneratedClothMesh;
    inverseMassesUsed: Float64Array;
} {
    const runId = `${config.variantId}_${gridSize}x${gridSize}`;
    const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
        widthM: 0.5,
        heightM: 0.5,
        initialHeightM: 1.0,
    });
    const solver = new InstrumentedXpbdClothSolver(mesh, config);
    const harness = new TelemetryHarness();
    const zeroSignedDistances = new Float64Array(mesh.vertexCount).fill(0.1);
    const nonAnchorEdges = mesh.edges.filter(
        (e) => solver.inverseMassesPerKg[e.i] > 0 && solver.inverseMassesPerKg[e.j] > 0
    );

    let sumPredictMs = 0;
    let sumStretchMs = 0;
    let sumBendingMs = 0;
    let sumCommitMs = 0;

    let transientPeakStretchPct = -1;
    let transientMeanStretchPctMax = 0;
    let transientPeakFrame = 0;
    let transientPeakSnapshot = new Float64Array(solver.positionsM);

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        harness.beginFrame({
            frameIndex: frameIdx,
            simTimeS: (frameIdx + 1) * config.dtFrameS,
            dtFrameS: config.dtFrameS,
            substeps: config.substeps,
            solverModel: 'XPBD',
            fabricId: config.variantId,
        });

        let phaseTimings = { predictMs: 0, stretchMs: 0, bendingMs: 0, commitMs: 0 };
        harness.measurePhase('physicsStepMs', () => {
            phaseTimings = solver.stepFrameTimed();
        });
        sumPredictMs += phaseTimings.predictMs;
        sumStretchMs += phaseTimings.stretchMs;
        sumBendingMs += phaseTimings.bendingMs;
        sumCommitMs += phaseTimings.commitMs;

        harness.recordPhaseMs('collisionMs', 0);
        harness.recordPhaseMs('renderMs', 0);

        const stretch = measureEdgeStretchStats(solver.positionsM, mesh.edges);
        const penetration = measurePenetrationStats(zeroSignedDistances);
        const rec = harness.finalizeFrame({
            stretch,
            penetration,
            vertexCount: mesh.vertexCount,
            triangleCount: mesh.triangleCount,
            renderMode: 'headless-dry-run',
        });

        if (rec.maxStretchPct > transientPeakStretchPct) {
            transientPeakStretchPct = rec.maxStretchPct;
            transientPeakFrame = frameIdx;
            transientPeakSnapshot = new Float64Array(solver.positionsM);
        }
        if (rec.meanStretchPct > transientMeanStretchPctMax) {
            transientMeanStretchPctMax = rec.meanStretchPct;
        }
    }

    const batch = harness.buildBatchExport();
    const lastFrame = batch.frames[batch.frames.length - 1];
    const interiorEqStats = measureEdgeStretchStats(solver.positionsM, nonAnchorEdges);

    const centerBottom = sampleMeshPointNormalized(solver.positionsM, gridSize, 0.5, 1.0);
    const centerBottomDropM = 1.0 - centerBottom[1];
    let sumY = 0;
    for (let i = 0; i < mesh.vertexCount; i++) {
        sumY += solver.positionsM[i * 3 + 1];
    }
    const meanDropM = 1.0 - sumY / mesh.vertexCount;
    const didNotLockOrFreeze = centerBottomDropM >= 0.3;

    const totalSum = Math.max(1e-9, sumPredictMs + sumStretchMs + sumBendingMs + sumCommitMs);
    const phaseProfile: PhaseCpuProfile = {
        runId,
        totalFrames,
        predictMsMean: Math.round((sumPredictMs / totalFrames) * 10000) / 10000,
        stretchMsMean: Math.round((sumStretchMs / totalFrames) * 10000) / 10000,
        bendingMsMean: Math.round((sumBendingMs / totalFrames) * 10000) / 10000,
        commitMsMean: Math.round((sumCommitMs / totalFrames) * 10000) / 10000,
        physicsStepMsMean: batch.summary.physicsStepMs.mean,
        physicsStepMsP95: batch.summary.physicsStepMs.p95,
        sharesPct: {
            predict: Math.round((sumPredictMs / totalSum) * 1000) / 10,
            stretch: Math.round((sumStretchMs / totalSum) * 1000) / 10,
            bending: Math.round((sumBendingMs / totalSum) * 1000) / 10,
            commit: Math.round((sumCommitMs / totalSum) * 1000) / 10,
        },
    };

    let pinnedVerticesCount = 0;
    for (let i = 0; i < mesh.vertexCount; i++) {
        if (solver.inverseMassesPerKg[i] === 0) pinnedVerticesCount += 1;
    }

    const summary: T21VariantRunSummary = {
        variantId: config.variantId,
        runId,
        gridSize,
        vertexCount: mesh.vertexCount,
        triangleCount: mesh.triangleCount,
        edgeCount: mesh.edges.length,
        hingeCount: mesh.hinges.length,
        substeps: config.substeps,
        stretchIterationsPerSubstep: config.stretchIterationsPerSubstep,
        bendingIterationsPerSubstep: config.bendingIterationsPerSubstep,
        bidirectionalStretchSweep: config.bidirectionalStretchSweep,
        bendingMode: config.bendingMode,
        pinnedVerticesCount,
        nanVertexCountTotal: batch.summary.totalNanVertices,
        phaseProfile,
        transientPeakStretchPct: Math.round(transientPeakStretchPct * 10000) / 10000,
        transientMeanStretchPctMax: Math.round(transientMeanStretchPctMax * 10000) / 10000,
        equilibriumMaxStretchPct: lastFrame.maxStretchPct,
        equilibriumMeanStretchPct: lastFrame.meanStretchPct,
        interiorNonAnchorEquilibriumMaxStretchPct: interiorEqStats.maxStretchPct,
        centerBottomDropM: Math.round(centerBottomDropM * 10000) / 10000,
        meanDropM: Math.round(meanDropM * 10000) / 10000,
        didNotLockOrFreeze,
        checks: {
            zeroNan: batch.summary.totalNanVertices === 0,
            equilibriumMeanStretchLe2Pct: lastFrame.meanStretchPct <= GATE1_MEAN_STRETCH_PCT_LIMIT,
            equilibriumPeakStretchLe5Pct: lastFrame.maxStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
            transientMeanStretchLe2Pct: transientMeanStretchPctMax <= GATE1_MEAN_STRETCH_PCT_LIMIT,
            transientPeakStretchLe5Pct: transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
            withinDesktopPhysicsBudgetMean16ms: batch.summary.physicsStepMs.mean <= 16.0,
            lockingNonFreezingPass:
                didNotLockOrFreeze
                && lastFrame.meanStretchPct <= GATE1_MEAN_STRETCH_PCT_LIMIT
                && lastFrame.maxStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT
                && transientMeanStretchPctMax <= GATE1_MEAN_STRETCH_PCT_LIMIT
                && transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        },
    };

    return {
        summary,
        batch,
        finalPositionsM: new Float64Array(solver.positionsM),
        transientPeakFrame,
        transientPeakSnapshot,
        mesh,
        inverseMassesUsed: new Float64Array(solver.inverseMassesPerKg),
    };
}

function computeInvariance(
    variantId: string,
    run16: { summary: T21VariantRunSummary; finalPositionsM: Float64Array },
    run32: { summary: T21VariantRunSummary; finalPositionsM: Float64Array }
): T21VariantInvariance {
    let sqSum = 0;
    let count = 0;
    for (let r = 0; r < 16; r++) {
        const v = r / 15;
        for (let c = 0; c < 16; c++) {
            const u = c / 15;
            const p16 = sampleMeshPointNormalized(run16.finalPositionsM, 16, u, v);
            const p32 = sampleMeshPointNormalized(run32.finalPositionsM, 32, u, v);
            const dx = p32[0] - p16[0];
            const dy = p32[1] - p16[1];
            const dz = p32[2] - p16[2];
            sqSum += dx * dx + dy * dy + dz * dz;
            count += 1;
        }
    }
    const shapeRmsDiffPctOfClothLength = (Math.sqrt(sqSum / count) / 0.5) * 100;
    const d16 = run16.summary.centerBottomDropM;
    const d32 = run32.summary.centerBottomDropM;
    const centerBottomDropDiffPct = (Math.abs(d32 - d16) / Math.max(1e-6, Math.max(d16, d32))) * 100;

    const m16 = run16.summary.meanDropM;
    const m32 = run32.summary.meanDropM;
    const meanDropDiffPct = (Math.abs(m32 - m16) / Math.max(1e-6, Math.max(m16, m32))) * 100;

    const invariancePassLe10Pct =
        centerBottomDropDiffPct <= 10
        && meanDropDiffPct <= 10
        && shapeRmsDiffPctOfClothLength <= 10;

    return {
        variantId,
        centerBottomDropDiffPct: Math.round(centerBottomDropDiffPct * 1000) / 1000,
        meanDropDiffPct: Math.round(meanDropDiffPct * 1000) / 1000,
        shapeRmsDiffPctOfClothLength: Math.round(shapeRmsDiffPctOfClothLength * 1000) / 1000,
        invariancePassLe10Pct,
    };
}

export function runT21DiagnosticsAndOptimizations(): {
    report: T21DiagnosticReport;
    batchesByRunId: Record<string, TelemetryExportBatch>;
} {
    const totalFrames = 600;
    const arealMassKgPerSqM = gsmToKgPerSqM(160);

    const commonPhysics = {
        dtFrameS: 1 / 60,
        airDampingPerS: 1.8,
        warpWeftStiffnessNPerM: 1200,
        shearStiffnessNPerM: 250,
        bending: {
            mode: 'SYMMETRIC' as const,
            rigidityNm: 2.0e-5,
        },
    };

    const variants: XpbdVariantConfig[] = [
        {
            variantId: 'V0_T2_BASELINE',
            description: 'Réplica exacta XPBD T2 (8 subpasos x 6 iter forward + 6 flexión diédrica)',
            substeps: 8,
            stretchIterationsPerSubstep: 6,
            bendingIterationsPerSubstep: 6,
            bidirectionalStretchSweep: false,
            bendingMode: 'dihedral_full',
            ...commonPhysics,
        },
        {
            variantId: 'V1_BIDIR_BEND1',
            description: '8 subpasos x 6 iter estiramiento bidireccional + 1 flexión diédrica/subpaso',
            substeps: 8,
            stretchIterationsPerSubstep: 6,
            bendingIterationsPerSubstep: 1,
            bidirectionalStretchSweep: true,
            bendingMode: 'dihedral_full',
            ...commonPhysics,
        },
        {
            variantId: 'V2_SUBSTEP16_BIDIR2_BEND1',
            description: 'Small-Steps XPBD: 16 subpasos x 2 iter estiramiento bidireccional + 1 flexión diédrica',
            substeps: 16,
            stretchIterationsPerSubstep: 2,
            bendingIterationsPerSubstep: 1,
            bidirectionalStretchSweep: true,
            bendingMode: 'dihedral_full',
            ...commonPhysics,
        },
        {
            variantId: 'V3_SUBSTEP24_BIDIR2_BEND1',
            description: 'Small-Steps XPBD: 24 subpasos x 2 iter estiramiento bidireccional + 1 flexión diédrica',
            substeps: 24,
            stretchIterationsPerSubstep: 2,
            bendingIterationsPerSubstep: 1,
            bidirectionalStretchSweep: true,
            bendingMode: 'dihedral_full',
            ...commonPhysics,
        },
        {
            variantId: 'V4_SUBSTEP16_SURROGATE_BEND',
            description: '16 subpasos x 2 iter bidir + 1 sustituto distancia-opuesta (límite CPU sin atan2; pierde asimetría)',
            substeps: 16,
            stretchIterationsPerSubstep: 2,
            bendingIterationsPerSubstep: 1,
            bidirectionalStretchSweep: true,
            bendingMode: 'opposite_distance_surrogate',
            ...commonPhysics,
        },
    ];

    const allRuns: T21VariantRunSummary[] = [];
    const allInvariance: T21VariantInvariance[] = [];
    const batchesByRunId: Record<string, TelemetryExportBatch> = {};

    let base16Diag: ReturnType<typeof runVariantSimulation> | null = null;
    let base32Diag: ReturnType<typeof runVariantSimulation> | null = null;

    for (const v of variants) {
        const res16 = runVariantSimulation(v, 16, arealMassKgPerSqM, totalFrames);
        const res32 = runVariantSimulation(v, 32, arealMassKgPerSqM, totalFrames);
        if (v.variantId === 'V0_T2_BASELINE') {
            base16Diag = res16;
            base32Diag = res32;
        }
        allRuns.push(res16.summary, res32.summary);
        batchesByRunId[res16.summary.runId] = res16.batch;
        batchesByRunId[res32.summary.runId] = res32.batch;
        allInvariance.push(computeInvariance(v.variantId, res16, res32));
    }

    if (!base16Diag || !base32Diag) {
        throw new Error('Faltan ejecuciones base V0_T2_BASELINE para diagnóstico');
    }

    // Diagnóstico de sensibilidad en 32x32: convergencia (subpasos 8->32->64) vs ancho de anclaje (2 nodos ~3.2 cm)
    const diagConfigs: { trialId: string; cfg: XpbdVariantConfig }[] = [
        {
            trialId: 'CONV_SUB8_IT6_POINT1',
            cfg: {
                variantId: 'CONV_SUB8_IT6_POINT1',
                description: 'Diagnóstico',
                substeps: 8,
                stretchIterationsPerSubstep: 6,
                bendingIterationsPerSubstep: 1,
                bidirectionalStretchSweep: true,
                bendingMode: 'dihedral_full',
                extraCornerPinTabNodes: 1,
                ...commonPhysics,
            },
        },
        {
            trialId: 'CONV_SUB32_IT6_POINT1',
            cfg: {
                variantId: 'CONV_SUB32_IT6_POINT1',
                description: 'Diagnóstico alta convergencia temporal',
                substeps: 32,
                stretchIterationsPerSubstep: 6,
                bendingIterationsPerSubstep: 1,
                bidirectionalStretchSweep: true,
                bendingMode: 'dihedral_full',
                extraCornerPinTabNodes: 1,
                ...commonPhysics,
            },
        },
        {
            trialId: 'CONV_SUB64_IT6_POINT1',
            cfg: {
                variantId: 'CONV_SUB64_IT6_POINT1',
                description: 'Diagnóstico límite continuo con pin puntual 1 nodo',
                substeps: 64,
                stretchIterationsPerSubstep: 6,
                bendingIterationsPerSubstep: 1,
                bidirectionalStretchSweep: true,
                bendingMode: 'dihedral_full',
                extraCornerPinTabNodes: 1,
                ...commonPhysics,
            },
        },
        {
            trialId: 'TAB2_SUB16_BIDIR2_WIDTH32MM',
            cfg: {
                variantId: 'TAB2_SUB16_BIDIR2_WIDTH32MM',
                description: 'Diagnóstico anclaje distribuido en 2 nodos por esquina (~3.2 cm, equivalente celda 16x16)',
                substeps: 16,
                stretchIterationsPerSubstep: 2,
                bendingIterationsPerSubstep: 1,
                bidirectionalStretchSweep: true,
                bendingMode: 'dihedral_full',
                extraCornerPinTabNodes: 2,
                ...commonPhysics,
            },
        },
    ];

    const diagTrials = diagConfigs.map(({ trialId, cfg }) => {
        const res = runVariantSimulation(cfg, 32, arealMassKgPerSqM, totalFrames);
        return {
            trialId,
            substeps: cfg.substeps,
            stretchIterations: cfg.stretchIterationsPerSubstep,
            pinnedVerticesPerCorner: cfg.extraCornerPinTabNodes ?? 1,
            transientPeakStretchPct: res.summary.transientPeakStretchPct,
            equilibriumMaxStretchPct: res.summary.equilibriumMaxStretchPct,
            interiorNonAnchorEqMaxStretchPct: res.summary.interiorNonAnchorEquilibriumMaxStretchPct,
            equilibriumMeanStretchPct: res.summary.equilibriumMeanStretchPct,
            physicsStepMsMean: res.summary.phaseProfile.physicsStepMsMean,
        };
    });

    const report: T21DiagnosticReport = {
        generatedAtIso: new Date().toISOString(),
        referenceConditionsPreserved:
            'Paño 0.50x0.50 m, 160 g/m^2, K_warp/weft=1200 N/m, K_shear=250 N/m, B=20 uN*m, '
            + 'g=-9.80665 m/s^2, damping=1.8/s, 10 s (600 frames a 60 Hz), umbrales Gate 1 intactos.',
        criticalEdgeDiagnosis: {
            xpbd16TransientPeakFrame: base16Diag.transientPeakFrame,
            xpbd16TransientTopEdges: getTopCriticalEdges(
                base16Diag.mesh,
                base16Diag.transientPeakSnapshot,
                base16Diag.inverseMassesUsed,
                10
            ),
            xpbd16EquilibriumTopEdges: getTopCriticalEdges(
                base16Diag.mesh,
                base16Diag.finalPositionsM,
                base16Diag.inverseMassesUsed,
                10
            ),
            xpbd32TransientPeakFrame: base32Diag.transientPeakFrame,
            xpbd32TransientTopEdges: getTopCriticalEdges(
                base32Diag.mesh,
                base32Diag.transientPeakSnapshot,
                base32Diag.inverseMassesUsed,
                10
            ),
            xpbd32EquilibriumTopEdges: getTopCriticalEdges(
                base32Diag.mesh,
                base32Diag.finalPositionsM,
                base32Diag.inverseMassesUsed,
                10
            ),
        },
        anchorAndConvergenceSensitivity32x32: {
            note: 'Separa residual por convergencia Gauss-Seidel vs singularidad de carga puntual en esquina.',
            trials: diagTrials,
        },
        optimizationVariants: {
            runs: allRuns,
            invariance: allInvariance,
        },
    };

    return { report, batchesByRunId };
}

