// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK CORRECTIVO T5.1
// Archivo: poc-simulador-3d/tests/t51CorrectiveBenchmark.ts
// ==============================================================================
// Evalúa de forma aislada y reversible las dos correcciones T5.1 sobre T5:
//   - F1: Excluir las 40 aristas de costura (L0 = 3 mm) del Strain Guard 4.5%
//         (con evaluación de re-sellado XPBD post-guardia en la combinación).
//   - F2: Sustituir contorno escalonado de escote/sisa por triangulación conformal
//         adaptada al patrón (conservando 'stepped' como predeterminado en spec).
// Matriz: 5 configuraciones x 5 arquetipos TIER_3_ESTIMATED = 25 corridas @ 5.0 s
// NO modifica H1B_ORIGINAL, resultados históricos T2-T5, producción, M00-M07 ni BD.
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

export type T51ConfigId =
    | 'T51_CONTROL'
    | 'T51_F1_EX_SEAMS'
    | 'T51_F2_CONFORMAL'
    | 'T51_F1_F2_COMBINED'
    | 'T51_F1_F2_RESEAL';

export interface T51ConfigSpec {
    readonly configId: T51ConfigId;
    readonly label: string;
    readonly contourMode: 'stepped' | 'conformal';
    readonly excludeSeamsFromStrainGuard: boolean;
    readonly postGuardSeamResealIterations: number;
    readonly substeps: number;
    readonly fineStretchIterationsPerSubstep: number;
    readonly bendingIterationsPerSubstep: number;
    readonly rayleighStretchTauS: number;
    readonly rayleighBendTauS: number;
    readonly strainGuardMaxRatio: number;
    readonly strainGuardIterations: number;
}

export const T51_CONFIG_SPECS: readonly T51ConfigSpec[] = [
    {
        configId: 'T51_CONTROL',
        label: 'Control T5 · Stepped + SG45 (sin F1 ni F2)',
        contourMode: 'stepped',
        excludeSeamsFromStrainGuard: false,
        postGuardSeamResealIterations: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
    {
        configId: 'T51_F1_EX_SEAMS',
        label: 'F1 Aislada · Stepped + SG45 (excluye 40 costuras L0=3mm)',
        contourMode: 'stepped',
        excludeSeamsFromStrainGuard: true,
        postGuardSeamResealIterations: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
    {
        configId: 'T51_F2_CONFORMAL',
        label: 'F2 Aislada · Triangulación Conformal + SG45',
        contourMode: 'conformal',
        excludeSeamsFromStrainGuard: false,
        postGuardSeamResealIterations: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
    {
        configId: 'T51_F1_F2_COMBINED',
        label: 'F1 + F2 Combinadas · Conformal + Excluir Costuras (sin re-sellado)',
        contourMode: 'conformal',
        excludeSeamsFromStrainGuard: true,
        postGuardSeamResealIterations: 0,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
    {
        configId: 'T51_F1_F2_RESEAL',
        label: 'F1 + F2 + Re-sellado Final · Conformal + Excluir Costuras + 2 iters XPBD costura',
        contourMode: 'conformal',
        excludeSeamsFromStrainGuard: true,
        postGuardSeamResealIterations: 2,
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
];

export interface T51GeometryAudit {
    readonly contourMode: 'stepped' | 'conformal';
    readonly garmentStats: TwoPanelGarmentMesh['garmentStats'];
    readonly meshQuality: GarmentMeshQualityStats;
    readonly initialGtAudit: {
        readonly vertexCountChecked: number;
        readonly initialPenetratedCountGt0: number;
        readonly initialSevereCountGt3mm: number;
        readonly initialMinSignedDistanceMm: number;
    };
}

export interface T51RunResult {
    readonly runId: string;
    readonly configId: T51ConfigId;
    readonly archetypeId: T5ArchetypeId;
    readonly contourMode: 'stepped' | 'conformal';
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly frameCount: number;
    readonly simDurationS: number;
    readonly panelStrain: {
        readonly equilibriumMeanStretchPct: number;
        readonly equilibriumMaxStretchPct: number;
        readonly transientPeakStretchPct: number;
        readonly transientPeakFrame: number;
    };
    readonly combinedStrain: {
        readonly equilibriumMeanStretchPct: number;
        readonly equilibriumMaxStretchPct: number;
        readonly transientPeakStretchPct: number;
        readonly framesOver5PctCount: number;
    };
    readonly seamMetrics: {
        readonly equilibriumMeanGapMm: number;
        readonly equilibriumMaxGapMm: number;
        readonly transientPeakGapMm: number;
        readonly equilibriumMaxStretchPct: number;
        readonly transientPeakStretchPct: number;
        readonly byGroupAtFinalFrame: Record<'LEFT_SHOULDER' | 'RIGHT_SHOULDER' | 'LEFT_SIDE' | 'RIGHT_SIDE', SeamGroupStats>;
    };
    readonly penetrationGt: {
        readonly initialFrameCountGt0: number;
        readonly initialMinSignedDistanceMm: number;
        readonly maxPenetrationDepthAllFramesMm: number;
        readonly equilibriumMaxPenetrationDepthMm: number;
        readonly equilibriumSevereFramesCount: number;
        readonly finalPenetratedVertexCountGt0: number;
        readonly finalSevereVertexCountGt3mm: number;
    };
    readonly stability: {
        readonly nanVertexCountTotal: number;
        readonly equilibriumRmsVelocityMS: number;
        readonly finalRmsVelocityMS: number;
        readonly finalKineticEnergyJ: number;
        readonly finalStretchEnergyJ: number;
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
        readonly panelMeanStretchLe2Pct: boolean;
        readonly panelPeakStretchLe5Pct: boolean;
        readonly combinedMeanStretchLe2Pct: boolean;
        readonly combinedPeakStretchLe5Pct: boolean;
        readonly zeroSustainedSeverePenetrationGt3mm: boolean;
        readonly totalStepBudgetMeanLe16ms: boolean;
        readonly totalStepBudgetP95Le25ms: boolean;
        readonly collisionBudgetLe6ms: boolean;
        readonly seamGapTightLe5mm: boolean;
    };
    readonly correctiveChecksT51: {
        readonly seamEqMaxLe305Mm: boolean;
        readonly seamPeakLe320Mm: boolean;
        readonly combinedPeakLe10Pct: boolean;
        readonly finalRmsVelLe00020MS: boolean;
        readonly panelPeakImprovedOrParityVs911Pct: boolean;
        readonly zeroSustainedGtOver3mm: boolean;
        readonly cpuMeanLe16msAndP95Le25ms: boolean;
    };
    readonly gate1StrictPass: boolean;
    readonly t51AllCorrectivePass: boolean;
}

export interface T51ConfigScorecard {
    readonly configId: T51ConfigId;
    readonly label: string;
    readonly contourMode: 'stepped' | 'conformal';
    readonly runsCount: number;
    readonly gate1StrictPassCount: number;
    readonly t51CorrectivePassCount: number;
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
    readonly textileDifferentiationPass: boolean;
    readonly asymmetryContrastPass: boolean;
}

export interface T51KeyframeBundle {
    readonly benchmarkId: 'T5_1_CORRECTIVE_BENCHMARK';
    readonly generatedAtIso: string;
    readonly keyframeIndices: readonly number[];
    readonly torsoMesh: {
        readonly positionsM: number[];
        readonly indices: number[];
        readonly vertexNormals: number[];
    };
    readonly garmentTopologies: {
        readonly stepped: {
            readonly triangleIndices: number[];
            readonly panelTriangleSplitIndex: number;
            readonly seamPairs: readonly { frontVertexIndex: number; backVertexIndex: number; group: string }[];
            readonly pinnedIndices: readonly number[];
        };
        readonly conformal: {
            readonly triangleIndices: number[];
            readonly panelTriangleSplitIndex: number;
            readonly seamPairs: readonly { frontVertexIndex: number; backVertexIndex: number; group: string }[];
            readonly pinnedIndices: readonly number[];
        };
    };
    readonly runs: Record<
        string,
        {
            readonly runId: string;
            readonly configId: T51ConfigId;
            readonly contourMode: 'stepped' | 'conformal';
            readonly archetypeId: T5ArchetypeId;
            readonly keyframes: readonly T5KeyframeSnapshot[];
        }
    >;
}

export interface T51BenchmarkReport {
    readonly benchmarkId: 'T5_1_CORRECTIVE_BENCHMARK';
    readonly generatedAtIso: string;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly disclaimer: string;
    readonly gateStatusNote: string;
    readonly geometries: {
        readonly stepped: T51GeometryAudit;
        readonly conformal: T51GeometryAudit;
    };
    readonly collisionProxy: {
        readonly id: 'ALT_C_SDF_GRID_3D';
        readonly initMs: number;
        readonly memoryBytes: number;
        readonly summary: string;
        readonly params: TorsoCollisionParams;
    };
    readonly runs: readonly T51RunResult[];
    readonly scorecards: readonly T51ConfigScorecard[];
    readonly asymmetryComparisons: readonly {
        readonly configId: T51ConfigId;
        readonly faceUpSubBustGapMm: number;
        readonly faceDownSubBustGapMm: number;
        readonly faceUpFrontNeckDropMm: number;
        readonly faceDownFrontNeckDropMm: number;
        readonly faceUpBendingEnergyJ: number;
        readonly faceDownBendingEnergyJ: number;
        readonly distinctResponse: boolean;
    }[];
    readonly recommendation: {
        readonly recommendedConfigId: T51ConfigId;
        readonly needsPostGuardSeamReseal: boolean;
        readonly gate1Approved: false;
        readonly summaryBullets: readonly string[];
    };
}

function round4(v: number): number {
    return Math.round(v * 10000) / 10000;
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

function buildConfig(
    spec: T51ConfigSpec,
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
        strainGuardExcludedEdgeIndices: spec.excludeSeamsFromStrainGuard ? seamEdgeIndexSet : undefined,
        postGuardExcludedEdgeResealIterations: spec.postGuardSeamResealIterations,
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

function auditInitialGeometry(
    contourMode: 'stepped' | 'conformal',
    gtBvh: CompactTriangleBvh
): { garment: TwoPanelGarmentMesh; audit: T51GeometryAudit } {
    const garment = generateTwoPanelBodiceGarment(T5_FABRICS.ARCH2_MEDIUM_BALANCED.arealMassKgPerSqM, {
        ...DEFAULT_TWO_PANEL_BODICE_SPEC,
        contourMode,
    });
    const meshQuality = inspectGarmentMeshQuality(garment);
    let pen0 = 0;
    let pen3 = 0;
    let minSdMm = Infinity;
    for (let i = 0; i < garment.vertexCount; i++) {
        const b = i * 3;
        const sdMm =
            gtBvh.queryClosestSigned(
                garment.restPositionsM[b],
                garment.restPositionsM[b + 1],
                garment.restPositionsM[b + 2]
            ).signedDistanceM * 1000;
        if (sdMm < minSdMm) minSdMm = sdMm;
        if (sdMm < 0) pen0++;
        if (sdMm < -DEFAULT_SEVERE_PENETRATION_THRESHOLD_M * 1000) pen3++;
    }

    return {
        garment,
        audit: {
            contourMode,
            garmentStats: garment.garmentStats,
            meshQuality,
            initialGtAudit: {
                vertexCountChecked: garment.vertexCount,
                initialPenetratedCountGt0: pen0,
                initialSevereCountGt3mm: pen3,
                initialMinSignedDistanceMm: round4(minSdMm),
            },
        },
    };
}

function runSingleT51Simulation(
    cfgSpec: T51ConfigSpec,
    fabric: T5FabricSpec,
    collider: TorsoCollider,
    collisionParams: TorsoCollisionParams,
    gtBvh: CompactTriangleBvh
): {
    result: T51RunResult;
    batch: TelemetryExportBatch;
    keyframes: T5KeyframeSnapshot[];
} {
    const dtFrameS = 1 / 60;
    const runId = `${cfgSpec.configId}__${fabric.archetypeId}`;
    const garment = generateTwoPanelBodiceGarment(fabric.arealMassKgPerSqM, {
        ...DEFAULT_TWO_PANEL_BODICE_SPEC,
        contourMode: cfgSpec.contourMode,
    });
    const solverConfig = buildConfig(cfgSpec, fabric, dtFrameS, garment.seamEdgeIndexSet);
    const solver = new T41ExperimentalXpbdSolver(garment, solverConfig);

    const activePos = solver.positionsM;
    const activeVel = solver.velocitiesMS;

    const gtSignedDistancesM = new Float64Array(garment.vertexCount);
    let initPenGt0 = 0;
    let initMinSdMm = Infinity;
    for (let i = 0; i < garment.vertexCount; i++) {
        const b = i * 3;
        const sd = gtBvh.queryClosestSigned(activePos[b], activePos[b + 1], activePos[b + 2]).signedDistanceM;
        gtSignedDistancesM[i] = sd;
        if (sd < 0) initPenGt0++;
        if (sd * 1000 < initMinSdMm) initMinSdMm = sd * 1000;
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
    let panelPeakFrame = 0;

    let combEqMeanSum = 0;
    let combEqMax = 0;
    let combPeak = 0;
    let combFramesOver5 = 0;

    let seamEqMeanGapSum = 0;
    let seamEqMaxGap = 0;
    let seamPeakGap = 0;
    let seamEqMaxStretch = 0;
    let seamPeakStretch = 0;

    let eqVelRmsSum = 0;
    let eqFramesCount = 0;
    let gtMaxDepthAllMm = 0;
    let gtEqMaxDepthMm = 0;
    let gtEqSevereFrames = 0;

    const cleanupCollisionParams: TorsoCollisionParams = {
        ...collisionParams,
        frictionCoeff: 0,
    };

    for (let frameIdx = 0; frameIdx < T5_TOTAL_FRAMES; frameIdx++) {
        const simTimeS = (frameIdx + 1) * dtFrameS;
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
            (pred, pos, invM) => collider.resolveSubstepCollision(pred, pos, invM, cleanupCollisionParams)
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
            panelPeakFrame = frameIdx;
        }
        if (gm.combinedMaxStretchPct > combPeak) combPeak = gm.combinedMaxStretchPct;
        if (gm.combinedMaxStretchPct > GATE1_PEAK_STRETCH_PCT_LIMIT) combFramesOver5++;
        if (gm.seamMaxGapMm > seamPeakGap) seamPeakGap = gm.seamMaxGapMm;
        if (gm.seamMaxStretchPct > seamPeakStretch) seamPeakStretch = gm.seamMaxStretchPct;

        if (frameIdx >= T5_EQUILIBRIUM_START_FRAME) {
            eqFramesCount++;
            panelEqMeanSum += gm.panelMeanStretchPct;
            if (gm.panelMaxStretchPct > panelEqMax) panelEqMax = gm.panelMaxStretchPct;
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
        seamGapTightLe5mm: seamEqMaxGap <= 5.0,
    };

    const correctiveChecksT51 = {
        seamEqMaxLe305Mm: round4(seamEqMaxGap) <= 3.05,
        seamPeakLe320Mm: round4(seamPeakGap) <= 3.20,
        combinedPeakLe10Pct: round4(combPeak) <= 10.0,
        finalRmsVelLe00020MS: round4(finalPhys.rmsVelMS) <= 0.0020,
        panelPeakImprovedOrParityVs911Pct: round4(panelPeak) <= 9.11,
        zeroSustainedGtOver3mm: gtEqSevereFrames === 0,
        cpuMeanLe16msAndP95Le25ms: totalMeanMs <= 16.0 && totalP95Ms <= 25.0,
    };

    const gate1StrictPass =
        gate1Checks.zeroNan &&
        gate1Checks.zeroInitialPenetration &&
        gate1Checks.combinedMeanStretchLe2Pct &&
        gate1Checks.combinedPeakStretchLe5Pct &&
        gate1Checks.zeroSustainedSeverePenetrationGt3mm &&
        gate1Checks.totalStepBudgetMeanLe16ms &&
        gate1Checks.totalStepBudgetP95Le25ms &&
        gate1Checks.collisionBudgetLe6ms &&
        gate1Checks.seamGapTightLe5mm;

    const t51AllCorrectivePass =
        nanTotal === 0 &&
        initPenGt0 === 0 &&
        correctiveChecksT51.seamEqMaxLe305Mm &&
        correctiveChecksT51.seamPeakLe320Mm &&
        correctiveChecksT51.combinedPeakLe10Pct &&
        correctiveChecksT51.finalRmsVelLe00020MS &&
        correctiveChecksT51.panelPeakImprovedOrParityVs911Pct &&
        correctiveChecksT51.zeroSustainedGtOver3mm &&
        correctiveChecksT51.cpuMeanLe16msAndP95Le25ms;

    return {
        result: {
            runId,
            configId: cfgSpec.configId,
            archetypeId: fabric.archetypeId,
            contourMode: cfgSpec.contourMode,
            evidenceQuality: fabric.evidenceQuality,
            frameCount: T5_TOTAL_FRAMES,
            simDurationS: round4(T5_TOTAL_FRAMES * dtFrameS),
            panelStrain: {
                equilibriumMeanStretchPct: round4(panelEqMean),
                equilibriumMaxStretchPct: round4(panelEqMax),
                transientPeakStretchPct: round4(panelPeak),
                transientPeakFrame: panelPeakFrame,
            },
            combinedStrain: {
                equilibriumMeanStretchPct: round4(combEqMean),
                equilibriumMaxStretchPct: round4(combEqMax),
                transientPeakStretchPct: round4(combPeak),
                framesOver5PctCount: combFramesOver5,
            },
            seamMetrics: {
                equilibriumMeanGapMm: round4(seamEqMeanGapSum / eqFramesCount),
                equilibriumMaxGapMm: round4(seamEqMaxGap),
                transientPeakGapMm: round4(seamPeakGap),
                equilibriumMaxStretchPct: round4(seamEqMaxStretch),
                transientPeakStretchPct: round4(seamPeakStretch),
                byGroupAtFinalFrame: finalGm.seamByGroup,
            },
            penetrationGt: {
                initialFrameCountGt0: initPenGt0,
                initialMinSignedDistanceMm: round4(initMinSdMm),
                maxPenetrationDepthAllFramesMm: round4(gtMaxDepthAllMm),
                equilibriumMaxPenetrationDepthMm: round4(gtEqMaxDepthMm),
                equilibriumSevereFramesCount: gtEqSevereFrames,
                finalPenetratedVertexCountGt0: finalPenGt0,
                finalSevereVertexCountGt3mm: finalPen.penetrationCount,
            },
            stability: {
                nanVertexCountTotal: nanTotal,
                equilibriumRmsVelocityMS: round4(eqVelRmsSum / eqFramesCount),
                finalRmsVelocityMS: round4(finalPhys.rmsVelMS),
                finalKineticEnergyJ: round4(finalPhys.kineticEnergyJ),
                finalStretchEnergyJ: round4(finalPhys.stretchEnergyJ),
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
            correctiveChecksT51,
            gate1StrictPass,
            t51AllCorrectivePass,
        },
        batch: harness.buildBatchExport(),
        keyframes,
    };
}

export function runT51CorrectiveBenchmark(): {
    report: T51BenchmarkReport;
    telemetryBatches: Record<string, TelemetryExportBatch>;
    keyframeBundle: T51KeyframeBundle;
} {
    const collider = createTorsoCollider('ALT_C_SDF_GRID_3D');
    const gtModel = new ReferenceTorsoGroundTruth(96, 108);
    const gtBvh = new CompactTriangleBvh(gtModel.mesh);
    const torsoDisplayMesh = generateCanonicalTorsoMesh(64, 72);
    const collisionParams: TorsoCollisionParams = {
        ...DEFAULT_TORSO_COLLISION_PARAMS,
        frictionCoeff: 0.35,
    };

    const steppedAudited = auditInitialGeometry('stepped', gtBvh);
    const conformalAudited = auditInitialGeometry('conformal', gtBvh);

    // Warmup JIT
    {
        const warmGarment = steppedAudited.garment;
        const warmSolver = new T41ExperimentalXpbdSolver(
            warmGarment,
            buildConfig(T51_CONFIG_SPECS[4], T5_FABRICS.ARCH2_MEDIUM_BALANCED, 1 / 60, warmGarment.seamEdgeIndexSet)
        );
        for (let f = 0; f < 10; f++) {
            warmSolver.stepFrameTimed((pred, pos, invM) =>
                collider.resolveSubstepCollision(pred, pos, invM, collisionParams)
            );
        }
    }

    const runs: T51RunResult[] = [];
    const telemetryBatches: Record<string, TelemetryExportBatch> = {};
    const keyframeRuns: T51KeyframeBundle['runs'] = {};
    const archetypes = Object.values(T5_FABRICS);

    for (const cfg of T51_CONFIG_SPECS) {
        for (const fabric of archetypes) {
            const { result, batch, keyframes } = runSingleT51Simulation(
                cfg,
                fabric,
                collider,
                collisionParams,
                gtBvh
            );
            runs.push(result);
            telemetryBatches[result.runId] = batch;
            keyframeRuns[result.runId] = {
                runId: result.runId,
                configId: cfg.configId,
                contourMode: cfg.contourMode,
                archetypeId: fabric.archetypeId,
                keyframes,
            };
        }
    }

    const asymmetryComparisons = T51_CONFIG_SPECS.map((cfg) => {
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
            faceUpSubBustGapMm: up.drape.subBustMeanAirGapMm,
            faceDownSubBustGapMm: dn.drape.subBustMeanAirGapMm,
            faceUpFrontNeckDropMm: up.drape.frontNeckDropMm,
            faceDownFrontNeckDropMm: dn.drape.frontNeckDropMm,
            faceUpBendingEnergyJ: up.stability.finalBendingEnergyJ,
            faceDownBendingEnergyJ: dn.stability.finalBendingEnergyJ,
            distinctResponse,
        };
    });

    const scorecards: T51ConfigScorecard[] = T51_CONFIG_SPECS.map((cfg) => {
        const group = runs.filter((r) => r.configId === cfg.configId);
        const f1 = group.find((r) => r.archetypeId === 'ARCH1_FLUID_LIGHT')!;
        const f2 = group.find((r) => r.archetypeId === 'ARCH2_MEDIUM_BALANCED')!;
        const f3 = group.find((r) => r.archetypeId === 'ARCH3_STRUCTURED_STIFF')!;
        const asym = asymmetryComparisons.find((a) => a.configId === cfg.configId)!;

        const textileDifferentiationPass =
            f1.drape.subBustMeanAirGapMm + 0.3 < f2.drape.subBustMeanAirGapMm &&
            f2.drape.subBustMeanAirGapMm + 0.1 < f3.drape.subBustMeanAirGapMm &&
            f1.stability.finalMeanAbsDihedralDeg > f2.stability.finalMeanAbsDihedralDeg &&
            f2.stability.finalMeanAbsDihedralDeg > f3.stability.finalMeanAbsDihedralDeg;

        return {
            configId: cfg.configId,
            label: cfg.label,
            contourMode: cfg.contourMode,
            runsCount: group.length,
            gate1StrictPassCount: group.filter((r) => r.gate1StrictPass).length,
            t51CorrectivePassCount: group.filter((r) => r.t51AllCorrectivePass).length,
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
            textileDifferentiationPass,
            asymmetryContrastPass: asym.distinctResponse,
        };
    });

    const combinedNoReseal = scorecards.find((s) => s.configId === 'T51_F1_F2_COMBINED')!;
    const combinedReseal = scorecards.find((s) => s.configId === 'T51_F1_F2_RESEAL')!;
    const needsPostGuardSeamReseal =
        combinedNoReseal.worstSeamTransientPeakGapMm > 3.2 ||
        combinedNoReseal.worstSeamEqMaxGapMm > 3.05 ||
        combinedReseal.t51CorrectivePassCount > combinedNoReseal.t51CorrectivePassCount;

    const bestCard = [...scorecards].sort((a, b) => {
        if (b.t51CorrectivePassCount !== a.t51CorrectivePassCount) {
            return b.t51CorrectivePassCount - a.t51CorrectivePassCount;
        }
        if (a.worstSeamTransientPeakGapMm !== b.worstSeamTransientPeakGapMm) {
            return a.worstSeamTransientPeakGapMm - b.worstSeamTransientPeakGapMm;
        }
        return a.worstPanelPeakStretchPct - b.worstPanelPeakStretchPct;
    })[0];

    const report: T51BenchmarkReport = {
        benchmarkId: 'T5_1_CORRECTIVE_BENCHMARK',
        generatedAtIso: new Date().toISOString(),
        evidenceQuality: 'TIER_3_ESTIMATED',
        disclaimer:
            'Todos los parámetros textiles corresponden a arquetipos sintéticos TIER_3_ESTIMATED. Los umbrales de Gate 1 se mantienen intactos sin relajar y Gate 1 NO se declara aprobado en T5.1.',
        gateStatusNote: 'Etapa correctiva T5.1 únicamente. No se inicia T6 ni se aprueba Gate 1.',
        geometries: {
            stepped: steppedAudited.audit,
            conformal: conformalAudited.audit,
        },
        collisionProxy: {
            id: 'ALT_C_SDF_GRID_3D',
            initMs: round4(collider.initStats.initMs),
            memoryBytes: collider.initStats.memoryFootprintBytes,
            summary: collider.initStats.primitiveOrCellSummary,
            params: collisionParams,
        },
        runs,
        scorecards,
        asymmetryComparisons,
        recommendation: {
            recommendedConfigId: bestCard.configId,
            needsPostGuardSeamReseal,
            gate1Approved: false,
            summaryBullets: [
                `${bestCard.configId}: ${bestCard.t51CorrectivePassCount}/5 criterios correctivos T5.1 PASS; Gate 1 estricto = ${bestCard.gate1StrictPassCount}/5 PASS.`,
                `Costura max eq = ${bestCard.worstSeamEqMaxGapMm} mm, pico transitorio costura = ${bestCard.worstSeamTransientPeakGapMm} mm (combPeak = ${bestCard.worstCombinedPeakStretchPct}%).`,
                `Panel max eq = ${bestCard.worstPanelEqMaxStretchPct}%, pico = ${bestCard.worstPanelPeakStretchPct}%, final rmsVel = ${bestCard.worstFinalRmsVelMS} m/s.`,
                `CPU global mean = ${bestCard.meanTotalStepMs} ms (peor = ${bestCard.worstTotalStepMeanMs} ms, P95 = ${bestCard.worstTotalStepP95Ms} ms), colisión SDF = ${bestCard.meanCollisionMs} ms, GT eq frames >3mm = ${bestCard.worstGtEqSevereFrames}.`,
            ],
        },
    };

    const serializeSeams = (m: TwoPanelGarmentMesh) =>
        m.seams.map((s) => ({
            frontVertexIndex: s.frontVertexIndex,
            backVertexIndex: s.backVertexIndex,
            group: s.group,
        }));

    const keyframeBundle: T51KeyframeBundle = {
        benchmarkId: 'T5_1_CORRECTIVE_BENCHMARK',
        generatedAtIso: report.generatedAtIso,
        keyframeIndices: [...T5_KEYFRAME_INDICES],
        torsoMesh: {
            positionsM: Array.from(torsoDisplayMesh.positionsM, (v: number) => Math.round(v * 1e5) / 1e5),
            indices: Array.from(torsoDisplayMesh.indices),
            vertexNormals: Array.from(torsoDisplayMesh.vertexNormals, (v: number) => Math.round(v * 1e4) / 1e4),
        },
        garmentTopologies: {
            stepped: {
                triangleIndices: Array.from(steppedAudited.garment.triangleIndices),
                panelTriangleSplitIndex: steppedAudited.garment.panelTriangleSplitIndex,
                seamPairs: serializeSeams(steppedAudited.garment),
                pinnedIndices: [...steppedAudited.garment.shoulderSupportIndices],
            },
            conformal: {
                triangleIndices: Array.from(conformalAudited.garment.triangleIndices),
                panelTriangleSplitIndex: conformalAudited.garment.panelTriangleSplitIndex,
                seamPairs: serializeSeams(conformalAudited.garment),
                pinnedIndices: [...conformalAudited.garment.shoulderSupportIndices],
            },
        },
        runs: keyframeRuns,
    };

    return { report, telemetryBatches, keyframeBundle };
}
