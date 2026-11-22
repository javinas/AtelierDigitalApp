// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK CORRECTIVO T5.2
// Archivo: poc-simulador-3d/tests/t52CorrectiveBenchmark.ts
// ==============================================================================
// Evalúa dos correcciones experimentales opt-in y reversibles sobre T5.1:
//   - Cambio 1 (geométrico): regularización geométrica local y alivio de
//     predistorsión 2D↔3D (`conformalRegularized: true`) SIN modificar restLengthM
//     (el cual sigue viniendo estrictamente de `flatPattern2dM`).
//   - Cambio 2 (numérico): actualización dinámica de aristas activas en cada
//     subiteración de `solveOverstrainGuard` (`refreshActivePerGuardIteration: true`),
//     evaluando explícitamente variantes SIN y CON rampa gravitacional de 10 frames.
//
// Matriz: 5 configuraciones x 5 arquetipos TIER_3_ESTIMATED = 25 corridas @ 5.0 s
// NO modifica H1B_ORIGINAL, resultados históricos T2-T5.1, producción, M00-M07 ni BD.
// NO relaja umbrales de Gate 1 ni inicia T6.
// ==============================================================================

import {
    generateCanonicalTorsoMesh,
    ReferenceTorsoGroundTruth,
} from '../collision/torsoBodyModel';
import {
    CompactTriangleBvh,
    createTorsoCollider,
    DEFAULT_TORSO_COLLISION_PARAMS,
    TorsoCollider,
    TorsoCollisionParams,
} from '../collision/torsoCollisionSolvers';
import {
    DEFAULT_TWO_PANEL_BODICE_SPEC,
    GarmentMeshQualityStats,
    generateTwoPanelBodiceGarment,
    inspectGarmentMeshQuality,
    measureTwoPanelGarmentMetrics,
    SeamGroupStats,
    TwoPanelGarmentMesh,
} from '../garment/twoPanelBodiceGenerator';
import {
    computeXpbdBendingCompliance,
    computeXpbdEdgeCompliance,
    selectDirectionalBendingRigidityNm,
} from '../harness/siConversionAndParams';
import {
    DEFAULT_SEVERE_PENETRATION_THRESHOLD_M,
    GATE1_DESKTOP_COMPUTE_BUDGET_MS,
    GATE1_MEAN_STRETCH_PCT_LIMIT,
    GATE1_PEAK_STRETCH_PCT_LIMIT,
    measureEdgeStretchStats,
    measurePenetrationStats,
    TelemetryHarness,
} from '../harness/telemetryHarness';
import { TelemetryExportBatch } from '../harness/types';
import { computeSignedDihedralGradientsInto } from '../solvers/clothSolvers';
import { T41ExperimentalConfig, T41ExperimentalXpbdSolver } from '../solvers/t41ExperimentalSolvers';
import {
    T5ArchetypeId,
    T5_COLLISION_BUDGET_MS,
    T5_EQUILIBRIUM_START_FRAME,
    T5_FABRICS,
    T5_FRAME_P95_BUDGET_MS,
    T5_KEYFRAME_INDICES,
    T5_TOTAL_FRAMES,
    T5FabricSpec,
    T5KeyframeSnapshot,
} from './t5FirstGarmentBenchmark';

export type T52ConfigId =
    | 'BASE_T51_RESEAL'
    | 'GEOM_ONLY'
    | 'GEOM_ONLY_RAMP10'
    | 'GEOM_PLUS_GUARD'
    | 'GEOM_PLUS_GUARD_RAMP10';

export interface T52ConfigSpec {
    readonly configId: T52ConfigId;
    readonly label: string;
    readonly topologyKey: 'conformal_base' | 'conformal_regularized';
    readonly conformalRegularized: boolean;
    readonly refreshActivePerGuardIteration: boolean;
    readonly gravityRampFrames: number;
    readonly substeps: number;
    readonly fineStretchIterationsPerSubstep: number;
    readonly bendingIterationsPerSubstep: number;
    readonly rayleighStretchTauS: number;
    readonly rayleighBendTauS: number;
    readonly strainGuardMaxRatio: number;
    readonly strainGuardIterations: number;
    readonly postGuardSeamResealIterations: number;
}

export const T52_CONFIG_SPECS: readonly T52ConfigSpec[] = [
    {
        configId: 'BASE_T51_RESEAL',
        label: 'Base T5.1 (F1+F2+Re-sellado · Sin Cambio 1 ni 2 · Sin Rampa)',
        topologyKey: 'conformal_base',
        conformalRegularized: false,
        refreshActivePerGuardIteration: false,
        gravityRampFrames: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
        postGuardSeamResealIterations: 2,
    },
    {
        configId: 'GEOM_ONLY',
        label: 'Cambio 1 Aislado (Conformal Regularizado · Sin Rampa)',
        topologyKey: 'conformal_regularized',
        conformalRegularized: true,
        refreshActivePerGuardIteration: false,
        gravityRampFrames: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
        postGuardSeamResealIterations: 2,
    },
    {
        configId: 'GEOM_ONLY_RAMP10',
        label: 'Cambio 1 + Rampa Gravitacional 10 Frames',
        topologyKey: 'conformal_regularized',
        conformalRegularized: true,
        refreshActivePerGuardIteration: false,
        gravityRampFrames: 10,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
        postGuardSeamResealIterations: 2,
    },
    {
        configId: 'GEOM_PLUS_GUARD',
        label: 'Cambio 1 + Cambio 2 (Dynamic Active Guard 4 iters · Sin Rampa)',
        topologyKey: 'conformal_regularized',
        conformalRegularized: true,
        refreshActivePerGuardIteration: true,
        gravityRampFrames: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 4,
        postGuardSeamResealIterations: 2,
    },
    {
        configId: 'GEOM_PLUS_GUARD_RAMP10',
        label: 'Cambio 1 + Cambio 2 + Rampa Gravitacional 10 Frames',
        topologyKey: 'conformal_regularized',
        conformalRegularized: true,
        refreshActivePerGuardIteration: true,
        gravityRampFrames: 10,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 4,
        postGuardSeamResealIterations: 2,
    },
];

export interface EdgePeakLocation {
    readonly edgeIndex: number;
    readonly vertices: readonly [number, number];
    readonly panelLabel: string;
    readonly restLenMm: number;
    readonly stretchPct: number;
    readonly frame: number;
}

export interface T52GeometryAudit {
    readonly topologyKey: 'conformal_base' | 'conformal_regularized';
    readonly contourMode: 'conformal';
    readonly conformalRegularized: boolean;
    readonly garmentStats: TwoPanelGarmentMesh['garmentStats'];
    readonly qualityStats: GarmentMeshQualityStats;
    readonly trianglesBelow12DegCount: number;
    readonly trianglesBelow14DegCount: number;
    readonly maxAbsPattern2dVsXpbdRestLenMm: number;
    readonly initial3dPreStrain: {
        readonly minPreStrainPct: number;
        readonly maxPreStrainPct: number;
        readonly meanAbsPreStrainPct: number;
        readonly edgesGe3PctCount: number;
        readonly edgesGe5PctCount: number;
        readonly frontWorstEdgeIndex: number;
        readonly frontWorstPreStrainPct: number;
        readonly backWorstEdgeIndex: number;
        readonly backWorstPreStrainPct: number;
    };
    readonly nodalMassStats: {
        readonly referenceArealMassKgPerSqM: number;
        readonly minMassG: number;
        readonly maxMassG: number;
        readonly maxToMinRatio: number;
        readonly minMassVertexIndex: number;
        readonly minMassPanel: string;
    };
    readonly initialGtClearance: {
        readonly minSignedDistanceMm: number;
        readonly initialPenetratingCountGt0: number;
        readonly initialSevereCountGt3mm: number;
    };
}

export interface T52SimulationSummary {
    readonly runId: string;
    readonly configId: T52ConfigId;
    readonly configLabel: string;
    readonly topologyKey: 'conformal_base' | 'conformal_regularized';
    readonly gravityRampFrames: number;
    readonly archetypeId: T5ArchetypeId;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly nanCount: number;
    readonly initialPenetrationCount: number;
    readonly seamMetrics: {
        readonly equilibriumMeanGapMm: number;
        readonly equilibriumMaxGapMm: number;
        readonly transientPeakGapMm: number;
        readonly transientPeakGapFrame: number;
        readonly finalMaxGapMm: number;
        readonly equilibriumMaxStretchPct: number;
        readonly transientPeakStretchPct: number;
        readonly byGroupAtFinalFrame: Record<string, SeamGroupStats>;
    };
    readonly panelStrain: {
        readonly transientPeakStretchPct: number;
        readonly equilibriumMeanStretchPct: number;
        readonly equilibriumMaxStretchPct: number;
        readonly finalFrameMaxStretchPct: number;
        readonly transientPeakEdge: EdgePeakLocation;
        readonly equilibriumMaxEdge: EdgePeakLocation;
    };
    readonly combinedStrain: {
        readonly transientPeakStretchPct: number;
        readonly equilibriumMeanStretchPct: number;
        readonly equilibriumMaxStretchPct: number;
        readonly framesOver5PctCount: number;
    };
    readonly penetrationGt: {
        readonly maxPenetrationDepthMm: number;
        readonly equilibriumMaxPenetrationDepthMm: number;
        readonly severeFramesCount: number;
        readonly equilibriumSevereFramesCount: number;
        readonly finalPenetratedVertexCountGt0: number;
        readonly finalSevereVertexCountGt3mm: number;
    };
    readonly stability: {
        readonly finalRmsVelocityMS: number;
        readonly equilibriumMeanRmsVelocityMS: number;
        readonly finalTotalEnergyJ: number;
        readonly finalBendingEnergyJ: number;
        readonly finalMeanAbsDihedralDeg: number;
    };
    readonly drape: {
        readonly subBustMeanAirGapMm: number;
        readonly hemDropMeanM: number;
        readonly frontNeckDropMm: number;
        readonly leftArmholeDropMm: number;
        readonly rightArmholeDropMm: number;
    };
    readonly timingMs: {
        readonly physicsStepMean: number;
        readonly collisionMean: number;
        readonly bendingMean: number;
        readonly stretchMean: number;
        readonly strainGuardMean: number;
        readonly totalStepMean: number;
        readonly totalStepP95: number;
        readonly collisionP95: number;
    };
    readonly gate1Checks: {
        readonly zeroNan: boolean;
        readonly zeroInitialPenetration: boolean;
        readonly meshQualityMinAngleGe12MinEdgeGe5: boolean;
        readonly panelMeanStretchLe2Pct: boolean;
        readonly panelPeakStretchLe5Pct: boolean;
        readonly combinedMeanStretchLe2Pct: boolean;
        readonly combinedPeakStretchLe5Pct: boolean;
        readonly zeroSustainedSeverePenetrationGt3mm: boolean;
        readonly totalStepBudgetMeanLe16ms: boolean;
        readonly totalStepBudgetP95Le25ms: boolean;
        readonly collisionBudgetLe6ms: boolean;
        readonly seamEqLe305MmAndPeakLe320Mm: boolean;
        readonly finalRmsVelLe00020MS: boolean;
    };
    readonly gate1StrictPass: boolean;
}

export interface T52ConfigScorecard {
    readonly configId: T52ConfigId;
    readonly label: string;
    readonly topologyKey: 'conformal_base' | 'conformal_regularized';
    readonly usesGravityRamp: boolean;
    readonly gravityRampFrames: number;
    readonly runsCount: number;
    readonly gate1StrictPassCount: number;
    readonly worstPanelMeanEqPct: number;
    readonly worstPanelPeakStretchPct: number;
    readonly worstPanelEqMaxStretchPct: number;
    readonly worstCombinedPeakStretchPct: number;
    readonly worstSeamEqMaxGapMm: number;
    readonly worstSeamTransientPeakGapMm: number;
    readonly worstFinalRmsVelMS: number;
    readonly meanTotalStepMs: number;
    readonly worstTotalStepMeanMs: number;
    readonly worstTotalStepP95Ms: number;
    readonly meanCollisionMs: number;
    readonly worstGtEqSevereFrames: number;
    readonly worstGtEqMaxDepthMm: number;
    readonly minPanelEdgeLenMm: number;
    readonly minAngleDeg: number;
    readonly textileDifferentiationPass: boolean;
    readonly asymmetryContrastPass: boolean;
}

export interface T52BenchmarkReport {
    readonly benchmarkId: 'T5_2_CORRECTIVE_BENCHMARK';
    readonly generatedAtIso: string;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly disclaimer: string;
    readonly gateStatusNote: string;
    readonly geometries: {
        readonly conformal_base: T52GeometryAudit;
        readonly conformal_regularized: T52GeometryAudit;
    };
    readonly collisionProxy: {
        readonly id: 'ALT_C_SDF_GRID_3D';
        readonly initMs: number;
        readonly memoryBytes: number;
        readonly summary: string;
        readonly params: TorsoCollisionParams;
    };
    readonly runs: readonly T52SimulationSummary[];
    readonly scorecardsWithoutRamp: readonly T52ConfigScorecard[];
    readonly scorecardsWithRamp10: readonly T52ConfigScorecard[];
    readonly allScorecards: readonly T52ConfigScorecard[];
    readonly asymmetryComparisons: {
        readonly configId: T52ConfigId;
        readonly usesGravityRamp: boolean;
        readonly faceUpSubBustGapMm: number;
        readonly faceDownSubBustGapMm: number;
        readonly faceUpFrontNeckDropMm: number;
        readonly faceDownFrontNeckDropMm: number;
        readonly faceUpBendingEnergyJ: number;
        readonly faceDownBendingEnergyJ: number;
        readonly distinctResponse: boolean;
    }[];
    readonly recommendation: {
        readonly bestWithoutRampId: T52ConfigId;
        readonly bestWithRamp10Id: T52ConfigId;
        readonly gate1Approved: boolean;
        readonly summaryBullets: readonly string[];
    };
}

export interface T52KeyframeBundle {
    readonly benchmarkId: 'T5_2_CORRECTIVE_BENCHMARK';
    readonly generatedAtIso: string;
    readonly keyframeIndices: readonly number[];
    readonly torsoMesh: {
        readonly positionsM: readonly number[];
        readonly indices: readonly number[];
        readonly vertexNormals: readonly number[];
    };
    readonly garmentTopologies: Record<
        'conformal_base' | 'conformal_regularized',
        {
            readonly triangleIndices: readonly number[];
            readonly panelTriangleSplitIndex: number;
            readonly seamPairs: {
                readonly frontVertexIndex: number;
                readonly backVertexIndex: number;
                readonly group: string;
            }[];
            readonly pinnedIndices: readonly number[];
        }
    >;
    readonly runs: Record<
        string,
        {
            readonly runId: string;
            readonly configId: T52ConfigId;
            readonly topologyKey: 'conformal_base' | 'conformal_regularized';
            readonly gravityRampFrames: number;
            readonly archetypeId: T5ArchetypeId;
            readonly keyframes: readonly T5KeyframeSnapshot[];
        }
    >;
}

function round4(v: number): number {
    return Math.round(v * 10000) / 10000;
}

function round6(v: number): number {
    return Math.round(v * 1000000) / 1000000;
}

function mean(arr: readonly number[]): number {
    if (arr.length === 0) return 0;
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
}

function percentile(arr: readonly number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[rank];
}

function countNanCoords(arr: Float64Array): number {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) count++;
    }
    return count;
}

function triMinAngle3d(pos: Float64Array, a: number, b: number, c: number): number {
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
    const clampCos = (v: number) => Math.max(-1, Math.min(1, v));
    const cosA = clampCos((abx * acx + aby * acy + abz * acz) / (la * lc));
    const cosB = clampCos((-abx * bcx - aby * bcy - abz * bcz) / (la * lb));
    const cosC = clampCos((bcx * acx + bcy * acy + bcz * acz) / (lb * lc));
    return (Math.min(Math.acos(cosA), Math.acos(cosB), Math.acos(cosC)) * 180) / Math.PI;
}

function findWorstPanelEdgeAtPositions(
    garment: TwoPanelGarmentMesh,
    positionsM: Float64Array,
    frame: number
): EdgePeakLocation {
    let worstEdge = 0;
    let worstAbsPct = -1;
    let worstSignedPct = 0;
    for (let e = 0; e < garment.panelEdgeCount; e++) {
        const edge = garment.edges[e];
        const bi = edge.i * 3;
        const bj = edge.j * 3;
        const curLen = Math.hypot(
            positionsM[bj] - positionsM[bi],
            positionsM[bj + 1] - positionsM[bi + 1],
            positionsM[bj + 2] - positionsM[bi + 2]
        );
        const signedPct = ((curLen - edge.restLengthM) / edge.restLengthM) * 100;
        const absPct = Math.abs(signedPct);
        if (absPct > worstAbsPct) {
            worstAbsPct = absPct;
            worstSignedPct = signedPct;
            worstEdge = e;
        }
    }
    const best = garment.edges[worstEdge];
    const pI = garment.vertexPanel[best.i];
    const pJ = garment.vertexPanel[best.j];
    return {
        edgeIndex: worstEdge,
        vertices: [best.i, best.j],
        panelLabel: pI === pJ ? pI : `${pI}-${pJ}`,
        restLenMm: round4(best.restLengthM * 1000),
        stretchPct: round4(worstSignedPct),
        frame,
    };
}

function auditGeometry(
    topologyKey: 'conformal_base' | 'conformal_regularized',
    conformalRegularized: boolean,
    gtBvh: CompactTriangleBvh
): {
    garment: TwoPanelGarmentMesh;
    audit: T52GeometryAudit;
} {
    const refArealMass = T5_FABRICS.ARCH2_MEDIUM_BALANCED.arealMassKgPerSqM;
    const garment = generateTwoPanelBodiceGarment(refArealMass, {
        ...DEFAULT_TWO_PANEL_BODICE_SPEC,
        contourMode: 'conformal',
        conformalRegularized,
    });
    const qualityStats = inspectGarmentMeshQuality(garment);
    const pos = garment.restPositionsM;
    const f2d = garment.flatPattern2dM;
    const tris = garment.triangleIndices;

    let trianglesBelow12DegCount = 0;
    let trianglesBelow14DegCount = 0;
    for (let t = 0; t < tris.length; t += 3) {
        const a = triMinAngle3d(pos, tris[t], tris[t + 1], tris[t + 2]);
        if (a < 12) trianglesBelow12DegCount++;
        if (a < 14) trianglesBelow14DegCount++;
    }

    let maxAbsPattern2dVsXpbdRestLenMm = 0;
    let minPre = Infinity;
    let maxPre = -Infinity;
    let sumAbsPre = 0;
    let edgesGe3 = 0;
    let edgesGe5 = 0;
    let frontWorstEdge = -1;
    let frontWorstAbs = -1;
    let frontWorstSigned = 0;
    let backWorstEdge = -1;
    let backWorstAbs = -1;
    let backWorstSigned = 0;

    for (let e = 0; e < garment.panelEdgeCount; e++) {
        const edge = garment.edges[e];
        const l2dM = Math.hypot(
            f2d[edge.j * 2] - f2d[edge.i * 2],
            f2d[edge.j * 2 + 1] - f2d[edge.i * 2 + 1]
        );
        const diffMm = Math.abs(l2dM - edge.restLengthM) * 1000;
        if (diffMm > maxAbsPattern2dVsXpbdRestLenMm) maxAbsPattern2dVsXpbdRestLenMm = diffMm;

        const l3dM = Math.hypot(
            pos[edge.j * 3] - pos[edge.i * 3],
            pos[edge.j * 3 + 1] - pos[edge.i * 3 + 1],
            pos[edge.j * 3 + 2] - pos[edge.i * 3 + 2]
        );
        const prePct = ((l3dM - l2dM) / l2dM) * 100;
        const absPre = Math.abs(prePct);
        if (prePct < minPre) minPre = prePct;
        if (prePct > maxPre) maxPre = prePct;
        sumAbsPre += absPre;
        if (absPre >= 3) edgesGe3++;
        if (absPre >= 5) edgesGe5++;

        if (garment.vertexPanel[edge.i] === 'FRONT' && absPre > frontWorstAbs) {
            frontWorstAbs = absPre;
            frontWorstEdge = e;
            frontWorstSigned = prePct;
        } else if (garment.vertexPanel[edge.i] === 'BACK' && absPre > backWorstAbs) {
            backWorstAbs = absPre;
            backWorstEdge = e;
            backWorstSigned = prePct;
        }
    }

    const nodalMassesKg = new Float64Array(garment.vertexCount);
    for (let t = 0; t < tris.length; t += 3) {
        const i0 = tris[t];
        const i1 = tris[t + 1];
        const i2 = tris[t + 2];
        const area2d =
            0.5 *
            Math.abs(
                (f2d[i1 * 2] - f2d[i0 * 2]) * (f2d[i2 * 2 + 1] - f2d[i0 * 2 + 1]) -
                    (f2d[i2 * 2] - f2d[i0 * 2]) * (f2d[i1 * 2 + 1] - f2d[i0 * 2 + 1])
            );
        const triMass = area2d * refArealMass;
        nodalMassesKg[i0] += triMass / 3;
        nodalMassesKg[i1] += triMass / 3;
        nodalMassesKg[i2] += triMass / 3;
    }
    let minMassKg = Infinity;
    let maxMassKg = 0;
    let minMassVertexIndex = 0;
    for (let v = 0; v < garment.vertexCount; v++) {
        if (nodalMassesKg[v] < minMassKg) {
            minMassKg = nodalMassesKg[v];
            minMassVertexIndex = v;
        }
        if (nodalMassesKg[v] > maxMassKg) {
            maxMassKg = nodalMassesKg[v];
        }
    }

    let minSdMm = Infinity;
    let pen0 = 0;
    let pen3 = 0;
    for (let v = 0; v < garment.vertexCount; v++) {
        const b = v * 3;
        const sdMm = gtBvh.queryClosestSigned(pos[b], pos[b + 1], pos[b + 2]).signedDistanceM * 1000;
        if (sdMm < minSdMm) minSdMm = sdMm;
        if (sdMm < 0) pen0++;
        if (sdMm < -DEFAULT_SEVERE_PENETRATION_THRESHOLD_M * 1000) pen3++;
    }

    return {
        garment,
        audit: {
            topologyKey,
            contourMode: 'conformal',
            conformalRegularized,
            garmentStats: garment.garmentStats,
            qualityStats,
            trianglesBelow12DegCount,
            trianglesBelow14DegCount,
            maxAbsPattern2dVsXpbdRestLenMm: round6(maxAbsPattern2dVsXpbdRestLenMm),
            initial3dPreStrain: {
                minPreStrainPct: round4(minPre),
                maxPreStrainPct: round4(maxPre),
                meanAbsPreStrainPct: round4(sumAbsPre / garment.panelEdgeCount),
                edgesGe3PctCount: edgesGe3,
                edgesGe5PctCount: edgesGe5,
                frontWorstEdgeIndex: frontWorstEdge,
                frontWorstPreStrainPct: round4(frontWorstSigned),
                backWorstEdgeIndex: backWorstEdge,
                backWorstPreStrainPct: round4(backWorstSigned),
            },
            nodalMassStats: {
                referenceArealMassKgPerSqM: refArealMass,
                minMassG: round4(minMassKg * 1000),
                maxMassG: round4(maxMassKg * 1000),
                maxToMinRatio: round4(maxMassKg / Math.max(1e-9, minMassKg)),
                minMassVertexIndex,
                minMassPanel: garment.vertexPanel[minMassVertexIndex],
            },
            initialGtClearance: {
                minSignedDistanceMm: round4(minSdMm),
                initialPenetratingCountGt0: pen0,
                initialSevereCountGt3mm: pen3,
            },
        },
    };
}

function buildConfig(
    spec: T52ConfigSpec,
    fabric: T5FabricSpec,
    dtFrameS: number,
    seamEdgeIndexSet: ReadonlySet<number>
): T41ExperimentalConfig {
    return {
        variantId: 'EXP2_RAYLEIGH_BEND_FIRST',
        dtFrameS,
        substeps: spec.substeps,
        coarseStrides: [],
        coarseIterationsPerLevel: 0,
        fineStretchIterationsPerSubstep: spec.fineStretchIterationsPerSubstep,
        bidirectionalFineSweep: true,
        bendingIterationsPerSubstep: spec.bendingIterationsPerSubstep,
        prolongationRelaxation: 1.0,
        coarseUnilateralOnly: true,
        coarseComplianceScale: 1.0,
        airDampingPerS: fabric.airDampingPerS,
        warpWeftStiffnessNPerM: fabric.warpWeftStiffnessNPerM,
        shearStiffnessNPerM: fabric.shearStiffnessNPerM,
        bending: fabric.bending,
        rayleighStretchTauS: spec.rayleighStretchTauS,
        rayleighBendTauS: spec.rayleighBendTauS,
        strainGuardMaxRatio: spec.strainGuardMaxRatio,
        strainGuardIterations: spec.strainGuardIterations,
        useDualCollisionCleanup: false,
        strainGuardExcludedEdgeIndices: seamEdgeIndexSet,
        postGuardExcludedEdgeResealIterations: spec.postGuardSeamResealIterations,
        refreshActivePerGuardIteration: spec.refreshActivePerGuardIteration,
    };
}

function computeVelKinAndElasticEnergies(
    garment: TwoPanelGarmentMesh,
    posM: Float64Array,
    velMS: Float64Array,
    fabric: T5FabricSpec
): {
    rmsVelMS: number;
    kineticEnergyJ: number;
    stretchEnergyJ: number;
    bendingEnergyJ: number;
    meanAbsDihedralDeg: number;
} {
    let sumSqV = 0;
    let kineticJ = 0;
    let freeCount = 0;
    for (let i = 0; i < garment.vertexCount; i++) {
        if (garment.pinnedIndices.has(i)) continue;
        const b = i * 3;
        const v2 = velMS[b] * velMS[b] + velMS[b + 1] * velMS[b + 1] + velMS[b + 2] * velMS[b + 2];
        sumSqV += v2;
        kineticJ += 0.5 * garment.massesKg[i] * v2;
        freeCount++;
    }

    let stretchEnergyJ = 0;
    for (let e = 0; e < garment.edges.length; e++) {
        const edge = garment.edges[e];
        const ib = edge.i * 3;
        const jb = edge.j * 3;
        const len = Math.hypot(
            posM[ib] - posM[jb],
            posM[ib + 1] - posM[jb + 1],
            posM[ib + 2] - posM[jb + 2]
        );
        const c = len - edge.restLengthM;
        const k = edge.kind === 'shear' ? fabric.shearStiffnessNPerM : fabric.warpWeftStiffnessNPerM;
        const alpha = computeXpbdEdgeCompliance(k, edge.restLengthM, edge.tributaryWidthM, 1).alphaTildePerKg;
        if (alpha > 0) stretchEnergyJ += (0.5 * c * c) / alpha;
    }

    let bendingEnergyJ = 0;
    let sumAbsPhi = 0;
    let validHinges = 0;
    const gradBuf = new Float64Array(13);
    for (let h = 0; h < garment.hinges.length; h++) {
        const hg = garment.hinges[h];
        computeSignedDihedralGradientsInto(posM, hg.v1, hg.v2, hg.v3, hg.v4, gradBuf);
        const phi = gradBuf[0];
        if (!Number.isFinite(phi)) continue;
        const dPhi = phi - hg.restAngleRad;
        const dirSign = dPhi >= 0 ? 1 : -1;
        const bRig = selectDirectionalBendingRigidityNm(fabric.bending, dirSign);
        const alpha = computeXpbdBendingCompliance(bRig, hg.hingeLengthM, hg.combinedTriangleAreaM2, 1).alphaTildePerKgM2;
        if (alpha > 0) bendingEnergyJ += (0.5 * dPhi * dPhi) / alpha;
        sumAbsPhi += Math.abs(phi);
        validHinges++;
    }

    return {
        rmsVelMS: freeCount > 0 ? Math.sqrt(sumSqV / freeCount) : 0,
        kineticEnergyJ: kineticJ,
        stretchEnergyJ,
        bendingEnergyJ,
        meanAbsDihedralDeg: validHinges > 0 ? ((sumAbsPhi / validHinges) * 180) / Math.PI : 0,
    };
}

function runSingleT52Simulation(
    cfgSpec: T52ConfigSpec,
    fabric: T5FabricSpec,
    collider: TorsoCollider,
    collisionParams: TorsoCollisionParams,
    gtBvh: CompactTriangleBvh,
    geometryAudit: T52GeometryAudit
): {
    summary: T52SimulationSummary;
    telemetry: TelemetryExportBatch;
    keyframes: T5KeyframeSnapshot[];
} {
    const dtFrameS = 1 / 60;
    const runId = `${cfgSpec.configId}__${fabric.archetypeId}`;
    const garment = generateTwoPanelBodiceGarment(fabric.arealMassKgPerSqM, {
        ...DEFAULT_TWO_PANEL_BODICE_SPEC,
        contourMode: 'conformal',
        conformalRegularized: cfgSpec.conformalRegularized,
    });
    const solverConfig = buildConfig(cfgSpec, fabric, dtFrameS, garment.seamEdgeIndexSet);
    const solver = new T41ExperimentalXpbdSolver(garment, solverConfig);

    const activePos = solver.positionsM;
    const activeVel = solver.velocitiesMS;

    const gtSignedDistancesM = new Float64Array(garment.vertexCount);
    let initPenGt0 = 0;
    for (let i = 0; i < garment.vertexCount; i++) {
        const b = i * 3;
        const sd = gtBvh.queryClosestSigned(activePos[b], activePos[b + 1], activePos[b + 2]).signedDistanceM;
        gtSignedDistancesM[i] = sd;
        if (sd < 0) initPenGt0++;
    }

    const keyframes: T5KeyframeSnapshot[] = [];
    const kfSet = new Set<number>(T5_KEYFRAME_INDICES);
    if (kfSet.has(0)) {
        keyframes.push({
            frameIndex: 0,
            simTimeS: 0,
            positionsM: Array.from(activePos, (v: number) => Math.round(v * 1e5) / 1e5),
        });
    }

    const harness = new TelemetryHarness();
    const physicsMsList: number[] = [];
    const collisionMsList: number[] = [];
    const totalMsList: number[] = [];
    let bendingSum = 0;
    let stretchSum = 0;
    let strainGuardSum = 0;

    let nanTotal = 0;
    let panelEqMeanSum = 0;
    let panelEqMax = 0;
    let panelPeak = 0;
    let transientPeakPanelEdge = findWorstPanelEdgeAtPositions(garment, activePos, 0);
    let eqMaxPanelEdge = transientPeakPanelEdge;

    let combEqMeanSum = 0;
    let combEqMax = 0;
    let combPeak = 0;
    let combFramesOver5 = 0;

    let seamEqMeanGapSum = 0;
    let seamEqMaxGap = 0;
    let seamPeakGap = 0;
    let seamPeakGapFrame = 0;
    let seamEqMaxStretch = 0;
    let seamPeakStretch = 0;

    let eqVelRmsSum = 0;
    let eqFramesCount = 0;
    let gtMaxDepthAllMm = 0;
    let gtEqMaxDepthMm = 0;
    let gtSevereFrames = 0;
    let gtEqSevereFrames = 0;

    const cleanupCollisionParams: TorsoCollisionParams = {
        ...collisionParams,
        frictionCoeff: 0,
    };

    for (let frameIdx = 0; frameIdx < T5_TOTAL_FRAMES; frameIdx++) {
        const simTimeS = (frameIdx + 1) * dtFrameS;
        const gravityScale =
            cfgSpec.gravityRampFrames > 0
                ? Math.min(1, (frameIdx + 1) / cfgSpec.gravityRampFrames)
                : 1.0;

        harness.beginFrame({
            frameIndex: frameIdx,
            simTimeS,
            dtFrameS,
            substeps: cfgSpec.substeps,
            solverModel: 'XPBD',
            fabricId: runId,
        });

        const prof = solver.stepFrameTimed(
            (pred, pos, invM) => collider.resolveSubstepCollision(pred, pos, invM, collisionParams),
            (pred, pos, invM) => collider.resolveSubstepCollision(pred, pos, invM, cleanupCollisionParams),
            gravityScale
        );
        const totalMs = prof.totalMs;
        const collisionMs = prof.collisionMs;
        const physicsMs = Math.max(0, totalMs - collisionMs);

        physicsMsList.push(physicsMs);
        collisionMsList.push(collisionMs);
        totalMsList.push(totalMs);
        bendingSum += prof.bendingMs;
        stretchSum += prof.stretchMs;
        strainGuardSum += prof.strainGuardMs;

        harness.recordPhaseMs('physicsStepMs', physicsMs);
        harness.recordPhaseMs('collisionMs', collisionMs);
        harness.recordPhaseMs('renderMs', 0);

        const combinedStats = measureEdgeStretchStats(activePos, garment.edges);
        nanTotal += Math.max(combinedStats.nanVertexCount, countNanCoords(activePos) + countNanCoords(activeVel));

        let frameMaxDepthMm = 0;
        for (let i = 0; i < garment.vertexCount; i++) {
            const b = i * 3;
            const sd = gtBvh.queryClosestSigned(activePos[b], activePos[b + 1], activePos[b + 2]).signedDistanceM;
            gtSignedDistancesM[i] = sd;
            if (sd < 0) {
                const depthMm = -sd * 1000;
                if (depthMm > frameMaxDepthMm) frameMaxDepthMm = depthMm;
            }
        }
        if (frameMaxDepthMm > gtMaxDepthAllMm) gtMaxDepthAllMm = frameMaxDepthMm;

        const gm = measureTwoPanelGarmentMetrics(garment, activePos, gtSignedDistancesM);
        const penGt = measurePenetrationStats(
            gtSignedDistancesM,
            DEFAULT_SEVERE_PENETRATION_THRESHOLD_M
        );
        harness.finalizeFrame({
            stretch: combinedStats,
            penetration: penGt,
            renderMode: 'headless-dry-run',
            vertexCount: garment.vertexCount,
            triangleCount: garment.triangleCount,
        });

        if (gm.panelMaxStretchPct > panelPeak) {
            panelPeak = gm.panelMaxStretchPct;
            transientPeakPanelEdge = findWorstPanelEdgeAtPositions(garment, activePos, frameIdx);
        }
        if (gm.combinedMaxStretchPct > combPeak) combPeak = gm.combinedMaxStretchPct;
        if (gm.combinedMaxStretchPct > GATE1_PEAK_STRETCH_PCT_LIMIT) combFramesOver5++;
        if (penGt.penetrationCount > 0) gtSevereFrames++;
        if (gm.seamMaxGapMm > seamPeakGap) {
            seamPeakGap = gm.seamMaxGapMm;
            seamPeakGapFrame = frameIdx;
        }
        if (gm.seamMaxStretchPct > seamPeakStretch) seamPeakStretch = gm.seamMaxStretchPct;

        if (frameIdx >= T5_EQUILIBRIUM_START_FRAME) {
            eqFramesCount++;
            panelEqMeanSum += gm.panelMeanStretchPct;
            if (gm.panelMaxStretchPct > panelEqMax) {
                panelEqMax = gm.panelMaxStretchPct;
                eqMaxPanelEdge = findWorstPanelEdgeAtPositions(garment, activePos, frameIdx);
            }
            combEqMeanSum += gm.combinedMeanStretchPct;
            if (gm.combinedMaxStretchPct > combEqMax) combEqMax = gm.combinedMaxStretchPct;
            seamEqMeanGapSum += gm.seamMeanGapMm;
            if (gm.seamMaxGapMm > seamEqMaxGap) seamEqMaxGap = gm.seamMaxGapMm;
            if (gm.seamMaxStretchPct > seamEqMaxStretch) seamEqMaxStretch = gm.seamMaxStretchPct;

            let sumSqV = 0;
            let nFree = 0;
            for (let i = 0; i < garment.vertexCount; i++) {
                if (garment.pinnedIndices.has(i)) continue;
                const b = i * 3;
                sumSqV +=
                    activeVel[b] * activeVel[b] +
                    activeVel[b + 1] * activeVel[b + 1] +
                    activeVel[b + 2] * activeVel[b + 2];
                nFree++;
            }
            eqVelRmsSum += nFree > 0 ? Math.sqrt(sumSqV / nFree) : 0;

            if (frameMaxDepthMm > gtEqMaxDepthMm) gtEqMaxDepthMm = frameMaxDepthMm;
            if (penGt.penetrationCount > 0) gtEqSevereFrames++;
        }

        if (kfSet.has(frameIdx) && frameIdx !== 0) {
            keyframes.push({
                frameIndex: frameIdx,
                simTimeS: round4(simTimeS),
                positionsM: Array.from(activePos, (v: number) => Math.round(v * 1e5) / 1e5),
            });
        }
    }

    let finalPenGt0 = 0;
    for (let i = 0; i < garment.vertexCount; i++) {
        const b = i * 3;
        const sd = gtBvh.queryClosestSigned(activePos[b], activePos[b + 1], activePos[b + 2]).signedDistanceM;
        gtSignedDistancesM[i] = sd;
        if (sd < 0) finalPenGt0++;
    }
    const finalPen = measurePenetrationStats(
        gtSignedDistancesM,
        DEFAULT_SEVERE_PENETRATION_THRESHOLD_M
    );
    const finalGm = measureTwoPanelGarmentMetrics(garment, activePos, gtSignedDistancesM);
    const finalPhys = computeVelKinAndElasticEnergies(garment, activePos, activeVel, fabric);

    const panelEqMean = panelEqMeanSum / eqFramesCount;
    const combEqMean = combEqMeanSum / eqFramesCount;
    const totalMeanMs = mean(totalMsList);
    const totalP95Ms = percentile(totalMsList, 95);
    const collisionMeanMs = mean(collisionMsList);

    const gate1Checks = {
        zeroNan: nanTotal === 0,
        zeroInitialPenetration: initPenGt0 === 0,
        meshQualityMinAngleGe12MinEdgeGe5:
            geometryAudit.qualityStats.minPanelEdgeLenMm >= 5.0 &&
            geometryAudit.qualityStats.minAngleDeg >= 12.0 &&
            geometryAudit.qualityStats.degenerateTriangleCount === 0,
        panelMeanStretchLe2Pct: panelEqMean <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        panelPeakStretchLe5Pct:
            panelPeak <= GATE1_PEAK_STRETCH_PCT_LIMIT && panelEqMax <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        combinedMeanStretchLe2Pct: combEqMean <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        combinedPeakStretchLe5Pct:
            combPeak <= GATE1_PEAK_STRETCH_PCT_LIMIT && combEqMax <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        zeroSustainedSeverePenetrationGt3mm: gtEqSevereFrames === 0,
        totalStepBudgetMeanLe16ms: totalMeanMs <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
        totalStepBudgetP95Le25ms: totalP95Ms <= T5_FRAME_P95_BUDGET_MS,
        collisionBudgetLe6ms: collisionMeanMs <= T5_COLLISION_BUDGET_MS,
        seamEqLe305MmAndPeakLe320Mm: round4(seamEqMaxGap) <= 3.05 && round4(seamPeakGap) <= 3.2,
        finalRmsVelLe00020MS: round4(finalPhys.rmsVelMS) <= 0.002,
    };

    const gate1StrictPass = Object.values(gate1Checks).every(Boolean);

    return {
        summary: {
            runId,
            configId: cfgSpec.configId,
            configLabel: cfgSpec.label,
            topologyKey: cfgSpec.topologyKey,
            gravityRampFrames: cfgSpec.gravityRampFrames,
            archetypeId: fabric.archetypeId,
            evidenceQuality: 'TIER_3_ESTIMATED',
            nanCount: nanTotal,
            initialPenetrationCount: initPenGt0,
            seamMetrics: {
                equilibriumMeanGapMm: round4(seamEqMeanGapSum / eqFramesCount),
                equilibriumMaxGapMm: round4(seamEqMaxGap),
                transientPeakGapMm: round4(seamPeakGap),
                transientPeakGapFrame: seamPeakGapFrame,
                finalMaxGapMm: round4(finalGm.seamMaxGapMm),
                equilibriumMaxStretchPct: round4(seamEqMaxStretch),
                transientPeakStretchPct: round4(seamPeakStretch),
                byGroupAtFinalFrame: finalGm.seamByGroup,
            },
            panelStrain: {
                transientPeakStretchPct: round4(panelPeak),
                equilibriumMeanStretchPct: round4(panelEqMean),
                equilibriumMaxStretchPct: round4(panelEqMax),
                finalFrameMaxStretchPct: round4(finalGm.panelMaxStretchPct),
                transientPeakEdge: transientPeakPanelEdge,
                equilibriumMaxEdge: eqMaxPanelEdge,
            },
            combinedStrain: {
                transientPeakStretchPct: round4(combPeak),
                equilibriumMeanStretchPct: round4(combEqMean),
                equilibriumMaxStretchPct: round4(combEqMax),
                framesOver5PctCount: combFramesOver5,
            },
            penetrationGt: {
                maxPenetrationDepthMm: round4(gtMaxDepthAllMm),
                equilibriumMaxPenetrationDepthMm: round4(gtEqMaxDepthMm),
                severeFramesCount: gtSevereFrames,
                equilibriumSevereFramesCount: gtEqSevereFrames,
                finalPenetratedVertexCountGt0: finalPenGt0,
                finalSevereVertexCountGt3mm: finalPen.penetrationCount,
            },
            stability: {
                finalRmsVelocityMS: round4(finalPhys.rmsVelMS),
                equilibriumMeanRmsVelocityMS: round4(eqVelRmsSum / eqFramesCount),
                finalTotalEnergyJ: round4(
                    finalPhys.kineticEnergyJ +
                        finalPhys.stretchEnergyJ +
                        finalPhys.bendingEnergyJ
                ),
                finalBendingEnergyJ: round4(finalPhys.bendingEnergyJ),
                finalMeanAbsDihedralDeg: round4(finalPhys.meanAbsDihedralDeg),
            },
            drape: {
                subBustMeanAirGapMm: finalGm.subBustMeanAirGapMm,
                hemDropMeanM: finalGm.hemDropMeanM,
                frontNeckDropMm: finalGm.frontNeckDropMm,
                leftArmholeDropMm: finalGm.leftArmholeDropMm,
                rightArmholeDropMm: finalGm.rightArmholeDropMm,
            },
            timingMs: {
                physicsStepMean: round4(mean(physicsMsList)),
                collisionMean: round4(collisionMeanMs),
                bendingMean: round4(bendingSum / T5_TOTAL_FRAMES),
                stretchMean: round4(stretchSum / T5_TOTAL_FRAMES),
                strainGuardMean: round4(strainGuardSum / T5_TOTAL_FRAMES),
                totalStepMean: round4(totalMeanMs),
                totalStepP95: round4(totalP95Ms),
                collisionP95: round4(percentile(collisionMsList, 95)),
            },
            gate1Checks,
            gate1StrictPass,
        },
        telemetry: harness.buildBatchExport(),
        keyframes,
    };
}

export function runT52CorrectiveBenchmark(): {
    report: T52BenchmarkReport;
    telemetryBatches: Record<string, TelemetryExportBatch>;
    keyframeBundle: T52KeyframeBundle;
} {
    const collider = createTorsoCollider('ALT_C_SDF_GRID_3D');
    const gtModel = new ReferenceTorsoGroundTruth(96, 108);
    const gtBvh = new CompactTriangleBvh(gtModel.mesh);
    const torsoDisplayMesh = generateCanonicalTorsoMesh(64, 72);
    const collisionParams: TorsoCollisionParams = {
        ...DEFAULT_TORSO_COLLISION_PARAMS,
        frictionCoeff: 0.35,
    };

    const baseAudited = auditGeometry('conformal_base', false, gtBvh);
    const regAudited = auditGeometry('conformal_regularized', true, gtBvh);

    // Warmup JIT
    {
        const warmGarment = regAudited.garment;
        const warmSolver = new T41ExperimentalXpbdSolver(
            warmGarment,
            buildConfig(T52_CONFIG_SPECS[3], T5_FABRICS.ARCH2_MEDIUM_BALANCED, 1 / 60, warmGarment.seamEdgeIndexSet)
        );
        for (let f = 0; f < 10; f++) {
            warmSolver.stepFrameTimed((pred, pos, invM) =>
                collider.resolveSubstepCollision(pred, pos, invM, collisionParams)
            );
        }
    }

    const runs: T52SimulationSummary[] = [];
    const telemetryBatches: Record<string, TelemetryExportBatch> = {};
    const keyframeRuns: T52KeyframeBundle['runs'] = {};
    const archetypes = Object.values(T5_FABRICS);

    for (const cfgSpec of T52_CONFIG_SPECS) {
        const gAudit =
            cfgSpec.topologyKey === 'conformal_regularized' ? regAudited.audit : baseAudited.audit;
        for (const fabric of archetypes) {
            const { summary, telemetry, keyframes } = runSingleT52Simulation(
                cfgSpec,
                fabric,
                collider,
                collisionParams,
                gtBvh,
                gAudit
            );
            runs.push(summary);
            telemetryBatches[summary.runId] = telemetry;
            keyframeRuns[summary.runId] = {
                runId: summary.runId,
                configId: cfgSpec.configId,
                topologyKey: cfgSpec.topologyKey,
                gravityRampFrames: cfgSpec.gravityRampFrames,
                archetypeId: fabric.archetypeId,
                keyframes,
            };
        }
    }

    const asymmetryComparisons = T52_CONFIG_SPECS.map((cfg) => {
        const up = runs.find(
            (r) => r.configId === cfg.configId && r.archetypeId === 'ARCH4_ASYM_FACE_UP_STIFF'
        )!;
        const dn = runs.find(
            (r) => r.configId === cfg.configId && r.archetypeId === 'ARCH4_ASYM_FACE_DOWN_STIFF'
        )!;
        const energyRatio =
            Math.max(up.stability.finalBendingEnergyJ, dn.stability.finalBendingEnergyJ) /
            Math.max(1e-7, Math.min(up.stability.finalBendingEnergyJ, dn.stability.finalBendingEnergyJ));
        const distinctResponse =
            Math.abs(up.drape.subBustMeanAirGapMm - dn.drape.subBustMeanAirGapMm) >= 0.4 ||
            energyRatio >= 1.5;

        return {
            configId: cfg.configId,
            usesGravityRamp: cfg.gravityRampFrames > 0,
            faceUpSubBustGapMm: up.drape.subBustMeanAirGapMm,
            faceDownSubBustGapMm: dn.drape.subBustMeanAirGapMm,
            faceUpFrontNeckDropMm: up.drape.frontNeckDropMm,
            faceDownFrontNeckDropMm: dn.drape.frontNeckDropMm,
            faceUpBendingEnergyJ: up.stability.finalBendingEnergyJ,
            faceDownBendingEnergyJ: dn.stability.finalBendingEnergyJ,
            distinctResponse,
        };
    });

    const allScorecards: T52ConfigScorecard[] = T52_CONFIG_SPECS.map((cfg) => {
        const group = runs.filter((r) => r.configId === cfg.configId);
        const f1 = group.find((r) => r.archetypeId === 'ARCH1_FLUID_LIGHT')!;
        const f2 = group.find((r) => r.archetypeId === 'ARCH2_MEDIUM_BALANCED')!;
        const f3 = group.find((r) => r.archetypeId === 'ARCH3_STRUCTURED_STIFF')!;
        const asym = asymmetryComparisons.find((a) => a.configId === cfg.configId)!;
        const gAudit =
            cfg.topologyKey === 'conformal_regularized' ? regAudited.audit : baseAudited.audit;

        const textileDifferentiationPass =
            f1.drape.subBustMeanAirGapMm + 0.3 < f2.drape.subBustMeanAirGapMm &&
            f2.drape.subBustMeanAirGapMm + 0.1 < f3.drape.subBustMeanAirGapMm &&
            f1.stability.finalMeanAbsDihedralDeg > f2.stability.finalMeanAbsDihedralDeg &&
            f2.stability.finalMeanAbsDihedralDeg > f3.stability.finalMeanAbsDihedralDeg;

        return {
            configId: cfg.configId,
            label: cfg.label,
            topologyKey: cfg.topologyKey,
            usesGravityRamp: cfg.gravityRampFrames > 0,
            gravityRampFrames: cfg.gravityRampFrames,
            runsCount: group.length,
            gate1StrictPassCount: group.filter((r) => r.gate1StrictPass).length,
            worstPanelMeanEqPct: round4(Math.max(...group.map((r) => r.panelStrain.equilibriumMeanStretchPct))),
            worstPanelPeakStretchPct: round4(Math.max(...group.map((r) => r.panelStrain.transientPeakStretchPct))),
            worstPanelEqMaxStretchPct: round4(Math.max(...group.map((r) => r.panelStrain.equilibriumMaxStretchPct))),
            worstCombinedPeakStretchPct: round4(Math.max(...group.map((r) => r.combinedStrain.transientPeakStretchPct))),
            worstSeamEqMaxGapMm: round4(Math.max(...group.map((r) => r.seamMetrics.equilibriumMaxGapMm))),
            worstSeamTransientPeakGapMm: round4(Math.max(...group.map((r) => r.seamMetrics.transientPeakGapMm))),
            worstFinalRmsVelMS: round4(Math.max(...group.map((r) => r.stability.finalRmsVelocityMS))),
            meanTotalStepMs: round4(mean(group.map((r) => r.timingMs.totalStepMean))),
            worstTotalStepMeanMs: round4(Math.max(...group.map((r) => r.timingMs.totalStepMean))),
            worstTotalStepP95Ms: round4(Math.max(...group.map((r) => r.timingMs.totalStepP95))),
            meanCollisionMs: round4(mean(group.map((r) => r.timingMs.collisionMean))),
            worstGtEqSevereFrames: Math.max(...group.map((r) => r.penetrationGt.equilibriumSevereFramesCount)),
            worstGtEqMaxDepthMm: round4(Math.max(...group.map((r) => r.penetrationGt.equilibriumMaxPenetrationDepthMm))),
            minPanelEdgeLenMm: gAudit.qualityStats.minPanelEdgeLenMm,
            minAngleDeg: gAudit.qualityStats.minAngleDeg,
            textileDifferentiationPass,
            asymmetryContrastPass: asym.distinctResponse,
        };
    });

    const scorecardsWithoutRamp = allScorecards.filter((c) => !c.usesGravityRamp);
    const scorecardsWithRamp10 = allScorecards.filter((c) => c.usesGravityRamp);

    const rankCards = (cards: T52ConfigScorecard[]) =>
        [...cards].sort((a, b) => {
            if (b.gate1StrictPassCount !== a.gate1StrictPassCount) {
                return b.gate1StrictPassCount - a.gate1StrictPassCount;
            }
            if (a.worstPanelPeakStretchPct !== b.worstPanelPeakStretchPct) {
                return a.worstPanelPeakStretchPct - b.worstPanelPeakStretchPct;
            }
            return a.worstPanelEqMaxStretchPct - b.worstPanelEqMaxStretchPct;
        })[0];

    const bestNoRamp = rankCards(scorecardsWithoutRamp);
    const bestRamp = rankCards(scorecardsWithRamp10);
    const gate1Approved = bestRamp.gate1StrictPassCount === 5 || bestNoRamp.gate1StrictPassCount === 5;

    const report: T52BenchmarkReport = {
        benchmarkId: 'T5_2_CORRECTIVE_BENCHMARK',
        generatedAtIso: new Date().toISOString(),
        evidenceQuality: 'TIER_3_ESTIMATED',
        disclaimer:
            'Todos los parámetros textiles corresponden a arquetipos sintéticos TIER_3_ESTIMATED. restLengthM proviene estrictamente de flatPattern2dM sin sobrescritura. Los umbrales de Gate 1 se mantienen intactos sin relajar.',
        gateStatusNote: gate1Approved
            ? 'Todos los criterios estrictos de Gate 1 cumplieron en todas las corridas evaluadas; validar evidencia visual e informe antes de T6.'
            : 'Al menos un criterio estricto de Gate 1 sigue pendiente; Gate 1 NO se declara aprobado y no se inicia T6.',
        geometries: {
            conformal_base: baseAudited.audit,
            conformal_regularized: regAudited.audit,
        },
        collisionProxy: {
            id: 'ALT_C_SDF_GRID_3D',
            initMs: round4(collider.initStats.initMs),
            memoryBytes: collider.initStats.memoryFootprintBytes,
            summary: collider.initStats.primitiveOrCellSummary,
            params: collisionParams,
        },
        runs,
        scorecardsWithoutRamp,
        scorecardsWithRamp10,
        allScorecards,
        asymmetryComparisons,
        recommendation: {
            bestWithoutRampId: bestNoRamp.configId,
            bestWithRamp10Id: bestRamp.configId,
            gate1Approved,
            summaryBullets: [
                `Sin rampa -> mejor ${bestNoRamp.configId}: Gate1 estricto=${bestNoRamp.gate1StrictPassCount}/5, panelPk=${bestNoRamp.worstPanelPeakStretchPct}%, panelEqMax=${bestNoRamp.worstPanelEqMaxStretchPct}%, costura=${bestNoRamp.worstSeamEqMaxGapMm}/${bestNoRamp.worstSeamTransientPeakGapMm} mm.`,
                `Con rampa 10f -> mejor ${bestRamp.configId}: Gate1 estricto=${bestRamp.gate1StrictPassCount}/5, panelPk=${bestRamp.worstPanelPeakStretchPct}%, panelEqMax=${bestRamp.worstPanelEqMaxStretchPct}%, costura=${bestRamp.worstSeamEqMaxGapMm}/${bestRamp.worstSeamTransientPeakGapMm} mm.`,
                `Malla regularizada: minEdge=${regAudited.audit.qualityStats.minPanelEdgeLenMm} mm, minAngle=${regAudited.audit.qualityStats.minAngleDeg} deg, pre>=5%: ${baseAudited.audit.initial3dPreStrain.edgesGe5PctCount}->${regAudited.audit.initial3dPreStrain.edgesGe5PctCount}, max(|L2d-L0|)=${regAudited.audit.maxAbsPattern2dVsXpbdRestLenMm} mm.`,
                `CPU sin rampa=${bestNoRamp.worstTotalStepMeanMs} ms (P95=${bestNoRamp.worstTotalStepP95Ms} ms); con rampa=${bestRamp.worstTotalStepMeanMs} ms (P95=${bestRamp.worstTotalStepP95Ms} ms).`,
            ],
        },
    };

    const serializeSeams = (m: TwoPanelGarmentMesh) =>
        m.seams.map((s) => ({
            frontVertexIndex: s.frontVertexIndex,
            backVertexIndex: s.backVertexIndex,
            group: s.group,
        }));

    const keyframeBundle: T52KeyframeBundle = {
        benchmarkId: 'T5_2_CORRECTIVE_BENCHMARK',
        generatedAtIso: report.generatedAtIso,
        keyframeIndices: [...T5_KEYFRAME_INDICES],
        torsoMesh: {
            positionsM: Array.from(torsoDisplayMesh.positionsM, (v: number) => Math.round(v * 1e5) / 1e5),
            indices: Array.from(torsoDisplayMesh.indices),
            vertexNormals: Array.from(torsoDisplayMesh.vertexNormals, (v: number) => Math.round(v * 1e4) / 1e4),
        },
        garmentTopologies: {
            conformal_base: {
                triangleIndices: Array.from(baseAudited.garment.triangleIndices),
                panelTriangleSplitIndex: baseAudited.garment.panelTriangleSplitIndex,
                seamPairs: serializeSeams(baseAudited.garment),
                pinnedIndices: [...baseAudited.garment.shoulderSupportIndices],
            },
            conformal_regularized: {
                triangleIndices: Array.from(regAudited.garment.triangleIndices),
                panelTriangleSplitIndex: regAudited.garment.panelTriangleSplitIndex,
                seamPairs: serializeSeams(regAudited.garment),
                pinnedIndices: [...regAudited.garment.shoulderSupportIndices],
            },
        },
        runs: keyframeRuns,
    };

    return { report, telemetryBatches, keyframeBundle };
}
