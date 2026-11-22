// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK T5 PRIMERA PRENDA (TOP/CORPIÑO)
// Archivo: poc-simulador-3d/tests/t5FirstGarmentBenchmark.ts
// ==============================================================================
// Evalúa la primera prenda integrada de dos paneles (delantero + posterior) con:
//   - Abertura de cuello curvo (U delantero / barco posterior) y sisas anatómicas
//   - Costuras explícitas XPBD en hombros y costados + sujeciones distribuidas
//   - Colisión corporal ALT_C_SDF_GRID_3D auditada con Ground Truth 96x108 BVH
//   - Candidato EXP2_RAYLEIGH_BEND_FIRST en matriz 2x2:
//       * fineStretchIterationsPerSubstep = 2 vs 3
//       * Strain Guard 4.5% (2 iters) vs OFF
//   - 5 perfiles textiles sintéticos (TIER_3_ESTIMATED): Fluido Ligero, Medio,
//     Estructurado Rígido, Asimétrico FACE_UP y control invertido FACE_DOWN.
// NO modifica producción, M00-M07, BD, H1B original ni históricos T2-T4.1.
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
    GarmentSeamGroup,
    GarmentSeamPairDescriptor,
    generateTwoPanelBodiceGarment,
    measureTwoPanelGarmentMetrics,
    SeamGroupStats,
    TwoPanelGarmentMesh,
} from '../garment/twoPanelBodiceGenerator';
import {
    computeXpbdBendingCompliance,
    computeXpbdEdgeCompliance,
    gsmToKgPerSqM,
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
import {
    BendingRigiditySpec,
    TelemetryExportBatch,
} from '../harness/types';
import { computeSignedDihedralGradients } from '../solvers/clothSolvers';
import {
    T41ExperimentalConfig,
    T41ExperimentalXpbdSolver,
} from '../solvers/t41ExperimentalSolvers';

export type T5SolverVariantId =
    | 'EXP2_NFINE2_NOGUARD'
    | 'EXP2_NFINE3_NOGUARD'
    | 'EXP2_NFINE2_SG45'
    | 'EXP2_NFINE3_SG45';

export type T5ArchetypeId =
    | 'ARCH1_FLUID_LIGHT'
    | 'ARCH2_MEDIUM_BALANCED'
    | 'ARCH3_STRUCTURED_STIFF'
    | 'ARCH4_ASYM_FACE_UP_STIFF'
    | 'ARCH4_ASYM_FACE_DOWN_STIFF';

export interface T5SolverVariantSpec {
    readonly solverId: T5SolverVariantId;
    readonly label: string;
    readonly substeps: number;
    readonly fineStretchIterationsPerSubstep: number;
    readonly bendingIterationsPerSubstep: number;
    readonly rayleighStretchTauS: number;
    readonly rayleighBendTauS: number;
    readonly strainGuardMaxRatio: number | null;
    readonly strainGuardIterations: number;
}

export const T5_SOLVER_VARIANTS: readonly T5SolverVariantSpec[] = [
    {
        solverId: 'EXP2_NFINE2_NOGUARD',
        label: 'EXP2 · Nfine=2 · Sin Strain Guard',
        substeps: 12,
        fineStretchIterationsPerSubstep: 2,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: null,
        strainGuardIterations: 0,
    },
    {
        solverId: 'EXP2_NFINE3_NOGUARD',
        label: 'EXP2 · Nfine=3 · Sin Strain Guard',
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: null,
        strainGuardIterations: 0,
    },
    {
        solverId: 'EXP2_NFINE2_SG45',
        label: 'EXP2 · Nfine=2 · Strain Guard 4.5% (2 iters)',
        substeps: 12,
        fineStretchIterationsPerSubstep: 2,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
    {
        solverId: 'EXP2_NFINE3_SG45',
        label: 'EXP2 · Nfine=3 · Strain Guard 4.5% (2 iters)',
        substeps: 12,
        fineStretchIterationsPerSubstep: 3,
        bendingIterationsPerSubstep: 1,
        rayleighStretchTauS: 0.0006,
        rayleighBendTauS: 0.0015,
        strainGuardMaxRatio: 0.045,
        strainGuardIterations: 2,
    },
];

export interface T5FabricSpec {
    readonly archetypeId: T5ArchetypeId;
    readonly label: string;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly nominalGsm: number;
    readonly arealMassKgPerSqM: number;
    readonly warpWeftStiffnessNPerM: number;
    readonly shearStiffnessNPerM: number;
    readonly bending: BendingRigiditySpec;
    readonly airDampingPerS: number;
}

export const T5_FABRICS: Record<T5ArchetypeId, T5FabricSpec> = {
    ARCH1_FLUID_LIGHT: {
        archetypeId: 'ARCH1_FLUID_LIGHT',
        label: 'Arquetipo 1 · Fluido Ligero (55 gsm, B=2.5 uN*m)',
        evidenceQuality: 'TIER_3_ESTIMATED',
        nominalGsm: 55,
        arealMassKgPerSqM: gsmToKgPerSqM(55),
        warpWeftStiffnessNPerM: 650,
        shearStiffnessNPerM: 90,
        bending: { mode: 'SYMMETRIC', rigidityNm: 2.5e-6 },
        airDampingPerS: 1.8,
    },
    ARCH2_MEDIUM_BALANCED: {
        archetypeId: 'ARCH2_MEDIUM_BALANCED',
        label: 'Arquetipo 2 · Medio Balanceado (160 gsm, B=20 uN*m)',
        evidenceQuality: 'TIER_3_ESTIMATED',
        nominalGsm: 160,
        arealMassKgPerSqM: gsmToKgPerSqM(160),
        warpWeftStiffnessNPerM: 1200,
        shearStiffnessNPerM: 250,
        bending: { mode: 'SYMMETRIC', rigidityNm: 20e-6 },
        airDampingPerS: 1.8,
    },
    ARCH3_STRUCTURED_STIFF: {
        archetypeId: 'ARCH3_STRUCTURED_STIFF',
        label: 'Arquetipo 3 · Estructurado Rígido (310 gsm, B=180 uN*m)',
        evidenceQuality: 'TIER_3_ESTIMATED',
        nominalGsm: 310,
        arealMassKgPerSqM: gsmToKgPerSqM(310),
        warpWeftStiffnessNPerM: 2400,
        shearStiffnessNPerM: 650,
        bending: { mode: 'SYMMETRIC', rigidityNm: 180e-6 },
        airDampingPerS: 1.8,
    },
    ARCH4_ASYM_FACE_UP_STIFF: {
        archetypeId: 'ARCH4_ASYM_FACE_UP_STIFF',
        label: 'Arquetipo 4A · Asimétrico FACE_UP Rígido (B+=180, B-=6 uN*m)',
        evidenceQuality: 'TIER_3_ESTIMATED',
        nominalGsm: 180,
        arealMassKgPerSqM: gsmToKgPerSqM(180),
        warpWeftStiffnessNPerM: 1300,
        shearStiffnessNPerM: 280,
        bending: { mode: 'ASYMMETRIC', faceUpRigidityNm: 180e-6, faceDownRigidityNm: 6e-6 },
        airDampingPerS: 1.8,
    },
    ARCH4_ASYM_FACE_DOWN_STIFF: {
        archetypeId: 'ARCH4_ASYM_FACE_DOWN_STIFF',
        label: 'Arquetipo 4B · Asimétrico FACE_DOWN Rígido (B+=6, B-=180 uN*m)',
        evidenceQuality: 'TIER_3_ESTIMATED',
        nominalGsm: 180,
        arealMassKgPerSqM: gsmToKgPerSqM(180),
        warpWeftStiffnessNPerM: 1300,
        shearStiffnessNPerM: 280,
        bending: { mode: 'ASYMMETRIC', faceUpRigidityNm: 6e-6, faceDownRigidityNm: 180e-6 },
        airDampingPerS: 1.8,
    },
};

export const T5_TOTAL_FRAMES = 300; // 5.0 s @ 60 Hz
export const T5_EQUILIBRIUM_START_FRAME = 210; // Últimos 1.5 s
export const T5_COLLISION_BUDGET_MS = 6.0;
export const T5_FRAME_P95_BUDGET_MS = 25.0;
export const T5_KEYFRAME_INDICES = [0, 45, 120, 299] as const;

export interface T5RunResult {
    readonly runId: string;
    readonly solverId: T5SolverVariantId;
    readonly archetypeId: T5ArchetypeId;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly frameCount: number;
    readonly simDurationS: number;
    readonly panelStrain: {
        readonly equilibriumMeanStretchPct: number;
        readonly equilibriumMaxStretchPct: number;
        readonly transientPeakStretchPct: number;
        readonly transientPeakFrame: number;
        readonly frontEquilibriumMaxStretchPct: number;
        readonly backEquilibriumMaxStretchPct: number;
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
        readonly equilibriumMeanStretchPct: number;
        readonly equilibriumMaxStretchPct: number;
        readonly transientPeakStretchPct: number;
        readonly byGroupAtFinalFrame: Record<GarmentSeamGroup, SeamGroupStats>;
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
        readonly frontHemBottomYM: number;
        readonly backHemBottomYM: number;
        readonly leftArmholeDropMm: number;
        readonly rightArmholeDropMm: number;
        readonly frontNeckDropMm: number;
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
    readonly checks: {
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
    readonly strictPass: boolean;
    readonly seamLimitedOnlyPass: boolean;
}

export interface T5SolverScorecard {
    readonly solverId: T5SolverVariantId;
    readonly label: string;
    readonly runsCount: number;
    readonly strictPassCount: number;
    readonly seamOrPanelPassCount: number;
    readonly worstPanelPeakStretchPct: number;
    readonly worstCombinedPeakStretchPct: number;
    readonly worstSeamMaxGapMm: number;
    readonly worstTotalStepMeanMs: number;
    readonly worstTotalStepP95Ms: number;
    readonly meanTotalStepMs: number;
    readonly meanCollisionMs: number;
    readonly meanPhysicsMs: number;
    readonly worstGtEqSevereFrames: number;
    readonly textileDifferentiationPass: boolean;
    readonly asymmetryContrastPass: boolean;
}

export interface T5KeyframeSnapshot {
    readonly frameIndex: number;
    readonly simTimeS: number;
    readonly positionsM: number[];
}

export interface T5KeyframeBundle {
    readonly benchmarkId: 'T5_FIRST_GARMENT_PROTOTYPE';
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly torsoMesh: {
        readonly positionsM: number[];
        readonly vertexNormals: number[];
        readonly indices: number[];
    };
    readonly garmentTopology: {
        readonly vertexCount: number;
        readonly triangleCount: number;
        readonly panelTriangleSplitIndex: number;
        readonly triangleIndices: number[];
        readonly pinnedIndices: number[];
        readonly seams: readonly GarmentSeamPairDescriptor[];
        readonly necklineFrontIndices: readonly number[];
        readonly necklineBackIndices: readonly number[];
        readonly armholeLeftIndices: readonly number[];
        readonly armholeRightIndices: readonly number[];
        readonly garmentStats: TwoPanelGarmentMesh['garmentStats'];
    };
    readonly runs: Record<string, {
        readonly solverId: T5SolverVariantId;
        readonly archetypeId: T5ArchetypeId;
        readonly keyframes: T5KeyframeSnapshot[];
    }>;
}

export interface T5BenchmarkReport {
    readonly benchmarkId: 'T5_FIRST_GARMENT_PROTOTYPE';
    readonly generatedAtIso: string;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly disclaimer: string;
    readonly gateStatusNote: string;
    readonly patternGeometry: TwoPanelGarmentMesh['garmentStats'] & {
        readonly patternSpec: typeof DEFAULT_TWO_PANEL_BODICE_SPEC;
        readonly initialGtAudit: {
            readonly vertexCountChecked: number;
            readonly initialPenetratedCountGt0: number;
            readonly initialSevereCountGt3mm: number;
            readonly initialMinSignedDistanceMm: number;
        };
    };
    readonly collisionProxy: {
        readonly id: string;
        readonly initMs: number;
        readonly memoryBytes: number;
        readonly summary: string;
        readonly params: TorsoCollisionParams;
    };
    readonly runs: T5RunResult[];
    readonly scorecards: T5SolverScorecard[];
    readonly asymmetryComparisons: {
        readonly solverId: T5SolverVariantId;
        readonly faceUpSubBustGapMm: number;
        readonly faceDownSubBustGapMm: number;
        readonly faceUpHemDropM: number;
        readonly faceDownHemDropM: number;
        readonly faceUpBendingEnergyJ: number;
        readonly faceDownBendingEnergyJ: number;
        readonly distinctResponse: boolean;
    }[];
    readonly recommendation: {
        readonly recommendedSolverId: T5SolverVariantId;
        readonly rationale: string[];
        readonly limitationsIdentified: string[];
        readonly readyForT6WithExplicitCaveats: boolean;
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
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(((p / 100) * sorted.length) - 1e-9)));
    return sorted[idx];
}

function countNanCoords(arr: Float64Array): number {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) count++;
    }
    return count;
}

function buildExp2Config(
    variant: T5SolverVariantSpec,
    fabric: T5FabricSpec,
    dtFrameS: number
): T41ExperimentalConfig {
    return {
        variantId: 'EXP2_RAYLEIGH_BEND_FIRST',
        dtFrameS,
        substeps: variant.substeps,
        coarseStrides: [], // Topología de 2 paneles con escote/sisas: sin pirámide rectangular
        coarseIterationsPerLevel: 0,
        fineStretchIterationsPerSubstep: variant.fineStretchIterationsPerSubstep,
        bidirectionalFineSweep: true,
        bendingIterationsPerSubstep: variant.bendingIterationsPerSubstep,
        prolongationRelaxation: 1.0,
        coarseUnilateralOnly: true,
        coarseComplianceScale: 1.0,
        airDampingPerS: fabric.airDampingPerS,
        warpWeftStiffnessNPerM: fabric.warpWeftStiffnessNPerM,
        shearStiffnessNPerM: fabric.shearStiffnessNPerM,
        bending: fabric.bending,
        rayleighStretchTauS: variant.rayleighStretchTauS,
        rayleighBendTauS: variant.rayleighBendTauS,
        strainGuardMaxRatio: variant.strainGuardMaxRatio,
        strainGuardIterations: variant.strainGuardIterations,
        useDualCollisionCleanup: false,
    };
}

function computeRmsVelocityAndKineticEnergy(
    vel: Float64Array,
    massesKg: Float64Array,
    invMass: Float64Array
): { rmsVelMS: number; kineticEnergyJ: number } {
    let velSqSum = 0;
    let active = 0;
    let kineticJ = 0;
    for (let i = 0; i < invMass.length; i++) {
        if (invMass[i] === 0) continue;
        const b = i * 3;
        const v2 = vel[b] * vel[b] + vel[b + 1] * vel[b + 1] + vel[b + 2] * vel[b + 2];
        velSqSum += v2;
        kineticJ += 0.5 * massesKg[i] * v2;
        active++;
    }
    return {
        rmsVelMS: active > 0 ? Math.sqrt(velSqSum / active) : 0,
        kineticEnergyJ: kineticJ,
    };
}

function computeGarmentElasticEnergies(
    garment: TwoPanelGarmentMesh,
    positionsM: Float64Array,
    fabric: T5FabricSpec
): { stretchEnergyJ: number; bendingEnergyJ: number; meanAbsDihedralDeg: number } {
    let stretchEnergyJ = 0;
    for (const edge of garment.edges) {
        const k = edge.kind === 'shear' ? fabric.shearStiffnessNPerM : fabric.warpWeftStiffnessNPerM;
        const kEdge = computeXpbdEdgeCompliance(k, edge.restLengthM, edge.tributaryWidthM, 1).edgeStiffnessNPerM;
        const ib = edge.i * 3;
        const jb = edge.j * 3;
        const len = Math.hypot(
            positionsM[ib] - positionsM[jb],
            positionsM[ib + 1] - positionsM[jb + 1],
            positionsM[ib + 2] - positionsM[jb + 2]
        );
        const dl = len - edge.restLengthM;
        stretchEnergyJ += 0.5 * kEdge * dl * dl;
    }

    let bendingEnergyJ = 0;
    let absDegSum = 0;
    let validHinges = 0;
    for (const hinge of garment.hinges) {
        const g = computeSignedDihedralGradients(positionsM, hinge.v1, hinge.v2, hinge.v3, hinge.v4);
        if (!g.valid) continue;
        const cRad = g.phiSignedRad - hinge.restAngleRad;
        absDegSum += (Math.abs(cRad) * 180) / Math.PI;
        validHinges++;
        const bDir = selectDirectionalBendingRigidityNm(fabric.bending, cRad);
        const kBend = computeXpbdBendingCompliance(
            bDir,
            hinge.hingeLengthM,
            hinge.combinedTriangleAreaM2,
            1
        ).discreteStiffnessNm;
        bendingEnergyJ += 0.5 * kBend * cRad * cRad;
    }

    return {
        stretchEnergyJ,
        bendingEnergyJ,
        meanAbsDihedralDeg: validHinges > 0 ? absDegSum / validHinges : 0,
    };
}

function runSingleT5Simulation(
    variant: T5SolverVariantSpec,
    fabric: T5FabricSpec,
    collider: TorsoCollider,
    collisionParams: TorsoCollisionParams,
    gtBvh: CompactTriangleBvh
): {
    result: T5RunResult;
    batch: TelemetryExportBatch;
    keyframes: T5KeyframeSnapshot[];
} {
    const dtFrameS = 1 / 60;
    const runId = `${variant.solverId}__${fabric.archetypeId}`;
    const garment = generateTwoPanelBodiceGarment(fabric.arealMassKgPerSqM);
    const config = buildExp2Config(variant, fabric, dtFrameS);
    const solver = new T41ExperimentalXpbdSolver(garment, config);

    const activePositions = solver.positionsM;
    const activeVelocities = solver.velocitiesMS;

    // Auditoría inicial t=0 contra Ground Truth 96x108 BVH
    const gtSignedDistancesM = new Float64Array(garment.vertexCount);
    let initPenGt0 = 0;
    let initMinSdMm = Infinity;
    for (let i = 0; i < garment.vertexCount; i++) {
        const b = i * 3;
        const sd = gtBvh.queryClosestSigned(
            activePositions[b],
            activePositions[b + 1],
            activePositions[b + 2]
        ).signedDistanceM;
        gtSignedDistancesM[i] = sd;
        if (sd < 0) initPenGt0++;
        const sdMm = sd * 1000;
        if (sdMm < initMinSdMm) initMinSdMm = sdMm;
    }

    const keyframes: T5KeyframeSnapshot[] = [];
    const keyframeSet = new Set<number>(T5_KEYFRAME_INDICES);
    if (keyframeSet.has(0)) {
        keyframes.push({
            frameIndex: 0,
            simTimeS: 0,
            positionsM: Array.from(activePositions, (v: number) => Math.round(v * 1e5) / 1e5),
        });
    }

    const harness = new TelemetryHarness();
    const physicsMsList: number[] = [];
    const collisionMsList: number[] = [];
    const totalMsList: number[] = [];
    let bendingSum = 0;
    let stretchSum = 0;
    let strainGuardSum = 0;

    let nanVertexCountTotal = 0;
    let panelEqMeanSum = 0;
    let panelEqMax = 0;
    let panelFrontEqMax = 0;
    let panelBackEqMax = 0;
    let panelTransientPeak = 0;
    let panelTransientPeakFrame = 0;

    let combinedEqMeanSum = 0;
    let combinedEqMax = 0;
    let combinedTransientPeak = 0;
    let combinedFramesOver5 = 0;

    let seamEqMeanGapSum = 0;
    let seamEqMaxGap = 0;
    let seamTransientPeakGap = 0;
    let seamEqMeanStretchSum = 0;
    let seamEqMaxStretch = 0;
    let seamTransientPeakStretch = 0;

    let eqVelRmsSum = 0;
    let eqFramesCount = 0;
    let gtMaxDepthAllFramesMm = 0;
    let gtEqMaxDepthMm = 0;
    let gtEqSevereFramesCount = 0;

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
            substeps: variant.substeps,
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

        const combinedStats = measureEdgeStretchStats(activePositions, garment.edges);
        const rawNanCount = countNanCoords(activePositions) + countNanCoords(activeVelocities);
        nanVertexCountTotal += Math.max(combinedStats.nanVertexCount, rawNanCount);

        for (let i = 0; i < garment.vertexCount; i++) {
            const b = i * 3;
            gtSignedDistancesM[i] = gtBvh.queryClosestSigned(
                activePositions[b],
                activePositions[b + 1],
                activePositions[b + 2]
            ).signedDistanceM;
        }
        const penStats = measurePenetrationStats(gtSignedDistancesM, DEFAULT_SEVERE_PENETRATION_THRESHOLD_M);
        const gm = measureTwoPanelGarmentMetrics(garment, activePositions, gtSignedDistancesM);

        if (gm.panelMaxStretchPct > panelTransientPeak) {
            panelTransientPeak = gm.panelMaxStretchPct;
            panelTransientPeakFrame = frameIdx;
        }
        if (combinedStats.maxStretchPct > combinedTransientPeak) {
            combinedTransientPeak = combinedStats.maxStretchPct;
        }
        if (combinedStats.maxStretchPct > GATE1_PEAK_STRETCH_PCT_LIMIT) {
            combinedFramesOver5++;
        }
        if (gm.seamMaxGapMm > seamTransientPeakGap) {
            seamTransientPeakGap = gm.seamMaxGapMm;
        }
        if (gm.seamMaxStretchPct > seamTransientPeakStretch) {
            seamTransientPeakStretch = gm.seamMaxStretchPct;
        }
        if (penStats.maxPenetrationDepthMm > gtMaxDepthAllFramesMm) {
            gtMaxDepthAllFramesMm = penStats.maxPenetrationDepthMm;
        }

        if (frameIdx >= T5_EQUILIBRIUM_START_FRAME) {
            eqFramesCount++;
            panelEqMeanSum += gm.panelMeanStretchPct;
            if (gm.panelMaxStretchPct > panelEqMax) panelEqMax = gm.panelMaxStretchPct;
            if (gm.frontPanelMaxStretchPct > panelFrontEqMax) panelFrontEqMax = gm.frontPanelMaxStretchPct;
            if (gm.backPanelMaxStretchPct > panelBackEqMax) panelBackEqMax = gm.backPanelMaxStretchPct;

            combinedEqMeanSum += combinedStats.meanStretchPct;
            if (combinedStats.maxStretchPct > combinedEqMax) combinedEqMax = combinedStats.maxStretchPct;

            seamEqMeanGapSum += gm.seamMeanGapMm;
            if (gm.seamMaxGapMm > seamEqMaxGap) seamEqMaxGap = gm.seamMaxGapMm;
            seamEqMeanStretchSum += gm.seamMeanStretchPct;
            if (gm.seamMaxStretchPct > seamEqMaxStretch) seamEqMaxStretch = gm.seamMaxStretchPct;

            const velKin = computeRmsVelocityAndKineticEnergy(
                activeVelocities,
                garment.massesKg,
                garment.inverseMassesPerKg
            );
            eqVelRmsSum += velKin.rmsVelMS;

            if (penStats.maxPenetrationDepthMm > gtEqMaxDepthMm) {
                gtEqMaxDepthMm = penStats.maxPenetrationDepthMm;
            }
            if (penStats.penetrationCount > 0) {
                gtEqSevereFramesCount++;
            }
        }

        if (frameIdx > 0 && keyframeSet.has(frameIdx)) {
            keyframes.push({
                frameIndex: frameIdx,
                simTimeS: round4(simTimeS),
                positionsM: Array.from(activePositions, (v: number) => Math.round(v * 1e5) / 1e5),
            });
        }

        harness.finalizeFrame({
            stretch: combinedStats,
            penetration: penStats,
            renderMode: 'headless-dry-run',
            vertexCount: garment.vertexCount,
            triangleCount: garment.triangleCount,
        });
    }

    // Estado final exacto
    for (let i = 0; i < garment.vertexCount; i++) {
        const b = i * 3;
        gtSignedDistancesM[i] = gtBvh.queryClosestSigned(
            activePositions[b],
            activePositions[b + 1],
            activePositions[b + 2]
        ).signedDistanceM;
    }
    const finalPen = measurePenetrationStats(gtSignedDistancesM, DEFAULT_SEVERE_PENETRATION_THRESHOLD_M);
    let finalPenGt0 = 0;
    for (let i = 0; i < gtSignedDistancesM.length; i++) {
        if (gtSignedDistancesM[i] < 0) finalPenGt0++;
    }

    const finalGm = measureTwoPanelGarmentMetrics(garment, activePositions, gtSignedDistancesM);
    const finalVelKin = computeRmsVelocityAndKineticEnergy(
        activeVelocities,
        garment.massesKg,
        garment.inverseMassesPerKg
    );
    const finalEnergies = computeGarmentElasticEnergies(garment, activePositions, fabric);

    const panelEqMean = panelEqMeanSum / eqFramesCount;
    const combinedEqMean = combinedEqMeanSum / eqFramesCount;
    const totalMeanMs = mean(totalMsList);
    const totalP95Ms = percentile(totalMsList, 95);
    const collisionMeanMs = mean(collisionMsList);
    const collisionP95Ms = percentile(collisionMsList, 95);

    const checks = {
        zeroNan: nanVertexCountTotal === 0,
        zeroInitialPenetration: initPenGt0 === 0,
        panelMeanStretchLe2Pct: panelEqMean <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        panelPeakStretchLe5Pct: panelTransientPeak <= GATE1_PEAK_STRETCH_PCT_LIMIT && panelEqMax <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        combinedMeanStretchLe2Pct: combinedEqMean <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        combinedPeakStretchLe5Pct: combinedTransientPeak <= GATE1_PEAK_STRETCH_PCT_LIMIT && combinedEqMax <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        zeroSustainedSeverePenetrationGt3mm: gtEqSevereFramesCount === 0,
        totalStepBudgetMeanLe16ms: totalMeanMs <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
        totalStepBudgetP95Le25ms: totalP95Ms <= T5_FRAME_P95_BUDGET_MS,
        collisionBudgetLe6ms: collisionMeanMs <= T5_COLLISION_BUDGET_MS,
        seamGapTightLe5mm: seamEqMaxGap <= 5.0,
    };

    const strictPass =
        checks.zeroNan &&
        checks.zeroInitialPenetration &&
        checks.combinedMeanStretchLe2Pct &&
        checks.combinedPeakStretchLe5Pct &&
        checks.zeroSustainedSeverePenetrationGt3mm &&
        checks.totalStepBudgetMeanLe16ms &&
        checks.totalStepBudgetP95Le25ms &&
        checks.collisionBudgetLe6ms &&
        checks.seamGapTightLe5mm;

    const seamLimitedOnlyPass =
        checks.zeroNan &&
        checks.zeroInitialPenetration &&
        checks.panelMeanStretchLe2Pct &&
        checks.panelPeakStretchLe5Pct &&
        checks.zeroSustainedSeverePenetrationGt3mm &&
        checks.totalStepBudgetMeanLe16ms &&
        checks.totalStepBudgetP95Le25ms &&
        checks.collisionBudgetLe6ms &&
        checks.seamGapTightLe5mm;

    const batch = harness.buildBatchExport();

    const result: T5RunResult = {
        runId,
        solverId: variant.solverId,
        archetypeId: fabric.archetypeId,
        evidenceQuality: fabric.evidenceQuality,
        frameCount: T5_TOTAL_FRAMES,
        simDurationS: round4(T5_TOTAL_FRAMES * dtFrameS),
        panelStrain: {
            equilibriumMeanStretchPct: round4(panelEqMean),
            equilibriumMaxStretchPct: round4(panelEqMax),
            transientPeakStretchPct: round4(panelTransientPeak),
            transientPeakFrame: panelTransientPeakFrame,
            frontEquilibriumMaxStretchPct: round4(panelFrontEqMax),
            backEquilibriumMaxStretchPct: round4(panelBackEqMax),
        },
        combinedStrain: {
            equilibriumMeanStretchPct: round4(combinedEqMean),
            equilibriumMaxStretchPct: round4(combinedEqMax),
            transientPeakStretchPct: round4(combinedTransientPeak),
            framesOver5PctCount: combinedFramesOver5,
        },
        seamMetrics: {
            equilibriumMeanGapMm: round4(seamEqMeanGapSum / eqFramesCount),
            equilibriumMaxGapMm: round4(seamEqMaxGap),
            transientPeakGapMm: round4(seamTransientPeakGap),
            equilibriumMeanStretchPct: round4(seamEqMeanStretchSum / eqFramesCount),
            equilibriumMaxStretchPct: round4(seamEqMaxStretch),
            transientPeakStretchPct: round4(seamTransientPeakStretch),
            byGroupAtFinalFrame: finalGm.seamByGroup,
        },
        penetrationGt: {
            initialFrameCountGt0: initPenGt0,
            initialMinSignedDistanceMm: round4(initMinSdMm),
            maxPenetrationDepthAllFramesMm: round4(gtMaxDepthAllFramesMm),
            equilibriumMaxPenetrationDepthMm: round4(gtEqMaxDepthMm),
            equilibriumSevereFramesCount: gtEqSevereFramesCount,
            finalPenetratedVertexCountGt0: finalPenGt0,
            finalSevereVertexCountGt3mm: finalPen.penetrationCount,
        },
        stability: {
            nanVertexCountTotal,
            equilibriumRmsVelocityMS: round4(eqVelRmsSum / eqFramesCount),
            finalRmsVelocityMS: round4(finalVelKin.rmsVelMS),
            finalKineticEnergyJ: round4(finalVelKin.kineticEnergyJ),
            finalStretchEnergyJ: round4(finalEnergies.stretchEnergyJ),
            finalBendingEnergyJ: round4(finalEnergies.bendingEnergyJ),
            finalMeanAbsDihedralDeg: round4(finalEnergies.meanAbsDihedralDeg),
        },
        drape: {
            subBustMeanAirGapMm: finalGm.subBustMeanAirGapMm,
            hemDropMeanM: finalGm.hemDropMeanM,
            frontHemBottomYM: finalGm.frontHemBottomYM,
            backHemBottomYM: finalGm.backHemBottomYM,
            leftArmholeDropMm: finalGm.leftArmholeDropMm,
            rightArmholeDropMm: finalGm.rightArmholeDropMm,
            frontNeckDropMm: finalGm.frontNeckDropMm,
        },
        timingMs: {
            physicsStepMean: round4(mean(physicsMsList)),
            collisionMean: round4(collisionMeanMs),
            bendingMean: round4(bendingSum / T5_TOTAL_FRAMES),
            stretchMean: round4(stretchSum / T5_TOTAL_FRAMES),
            strainGuardMean: round4(strainGuardSum / T5_TOTAL_FRAMES),
            totalStepMean: round4(totalMeanMs),
            totalStepP95: round4(totalP95Ms),
            collisionP95: round4(collisionP95Ms),
        },
        checks,
        strictPass,
        seamLimitedOnlyPass,
    };

    return { result, batch, keyframes };
}

export function runT5FirstGarmentBenchmark(): {
    report: T5BenchmarkReport;
    batches: Record<string, TelemetryExportBatch>;
    keyframeBundle: T5KeyframeBundle;
} {
    const gtModel = new ReferenceTorsoGroundTruth(96, 108);
    const gtBvh = new CompactTriangleBvh(gtModel.mesh);
    const collider = createTorsoCollider('ALT_C_SDF_GRID_3D');
    const collisionParams: TorsoCollisionParams = {
        ...DEFAULT_TORSO_COLLISION_PARAMS,
    };

    // Inspección de línea base geométrica t=0
    const sampleGarment = generateTwoPanelBodiceGarment(T5_FABRICS.ARCH2_MEDIUM_BALANCED.arealMassKgPerSqM);
    // Calentamiento breve JIT V8 antes de medir tiempos por frame
    const warmSolver = new T41ExperimentalXpbdSolver(
        sampleGarment,
        buildExp2Config(T5_SOLVER_VARIANTS[0], T5_FABRICS.ARCH2_MEDIUM_BALANCED, 1 / 60)
    );
    for (let w = 0; w < 6; w++) {
        warmSolver.stepFrameTimed(
            (pred, pos, invM) => collider.resolveSubstepCollision(pred, pos, invM, collisionParams)
        );
    }
    let initialPenGt0 = 0;
    let initialSevereGt3mm = 0;
    let initialMinSdMm = Infinity;
    for (let i = 0; i < sampleGarment.vertexCount; i++) {
        const b = i * 3;
        const sd = gtBvh.queryClosestSigned(
            sampleGarment.restPositionsM[b],
            sampleGarment.restPositionsM[b + 1],
            sampleGarment.restPositionsM[b + 2]
        ).signedDistanceM;
        if (sd < 0) initialPenGt0++;
        if (sd < -DEFAULT_SEVERE_PENETRATION_THRESHOLD_M) initialSevereGt3mm++;
        const sdMm = sd * 1000;
        if (sdMm < initialMinSdMm) initialMinSdMm = sdMm;
    }

    const torsoDisplayMesh = generateCanonicalTorsoMesh(64, 72);

    const runs: T5RunResult[] = [];
    const batches: Record<string, TelemetryExportBatch> = {};
    const keyframeRuns: T5KeyframeBundle['runs'] = {};

    const fabricList = Object.values(T5_FABRICS);
    for (const variant of T5_SOLVER_VARIANTS) {
        for (const fabric of fabricList) {
            const sim = runSingleT5Simulation(variant, fabric, collider, collisionParams, gtBvh);
            runs.push(sim.result);
            batches[sim.result.runId] = sim.batch;
            keyframeRuns[sim.result.runId] = {
                solverId: variant.solverId,
                archetypeId: fabric.archetypeId,
                keyframes: sim.keyframes,
            };
        }
    }

    const scorecards: T5SolverScorecard[] = [];
    const asymmetryComparisons: T5BenchmarkReport['asymmetryComparisons'] = [];

    for (const variant of T5_SOLVER_VARIANTS) {
        const sRuns = runs.filter((r) => r.solverId === variant.solverId);
        const byArch = (id: T5ArchetypeId) => sRuns.find((r) => r.archetypeId === id)!;
        const r1 = byArch('ARCH1_FLUID_LIGHT');
        const r2 = byArch('ARCH2_MEDIUM_BALANCED');
        const r3 = byArch('ARCH3_STRUCTURED_STIFF');
        const rUp = byArch('ARCH4_ASYM_FACE_UP_STIFF');
        const rDown = byArch('ARCH4_ASYM_FACE_DOWN_STIFF');

        // Diferenciación textil física esperada: menor rigidez flexural se ciñe más (menor subBustAirGapMm y mayor curvatura media)
        const textileDiffPass =
            r1.drape.subBustMeanAirGapMm < r2.drape.subBustMeanAirGapMm &&
            r2.drape.subBustMeanAirGapMm < r3.drape.subBustMeanAirGapMm &&
            r1.stability.finalMeanAbsDihedralDeg > r2.stability.finalMeanAbsDihedralDeg &&
            r2.stability.finalMeanAbsDihedralDeg > r3.stability.finalMeanAbsDihedralDeg;

        const asymDistinct =
            Math.abs(rUp.drape.subBustMeanAirGapMm - rDown.drape.subBustMeanAirGapMm) > 0.25 ||
            Math.abs(rUp.stability.finalBendingEnergyJ - rDown.stability.finalBendingEnergyJ) > 1e-4 ||
            Math.abs(rUp.drape.hemDropMeanM - rDown.drape.hemDropMeanM) > 0.0005;

        asymmetryComparisons.push({
            solverId: variant.solverId,
            faceUpSubBustGapMm: rUp.drape.subBustMeanAirGapMm,
            faceDownSubBustGapMm: rDown.drape.subBustMeanAirGapMm,
            faceUpHemDropM: rUp.drape.hemDropMeanM,
            faceDownHemDropM: rDown.drape.hemDropMeanM,
            faceUpBendingEnergyJ: rUp.stability.finalBendingEnergyJ,
            faceDownBendingEnergyJ: rDown.stability.finalBendingEnergyJ,
            distinctResponse: asymDistinct,
        });

        scorecards.push({
            solverId: variant.solverId,
            label: variant.label,
            runsCount: sRuns.length,
            strictPassCount: sRuns.filter((r) => r.strictPass).length,
            seamOrPanelPassCount: sRuns.filter((r) => r.seamLimitedOnlyPass).length,
            worstPanelPeakStretchPct: round4(Math.max(...sRuns.map((r) => r.panelStrain.transientPeakStretchPct))),
            worstCombinedPeakStretchPct: round4(Math.max(...sRuns.map((r) => r.combinedStrain.transientPeakStretchPct))),
            worstSeamMaxGapMm: round4(Math.max(...sRuns.map((r) => r.seamMetrics.transientPeakGapMm))),
            worstTotalStepMeanMs: round4(Math.max(...sRuns.map((r) => r.timingMs.totalStepMean))),
            worstTotalStepP95Ms: round4(Math.max(...sRuns.map((r) => r.timingMs.totalStepP95))),
            meanTotalStepMs: round4(mean(sRuns.map((r) => r.timingMs.totalStepMean))),
            meanCollisionMs: round4(mean(sRuns.map((r) => r.timingMs.collisionMean))),
            meanPhysicsMs: round4(mean(sRuns.map((r) => r.timingMs.physicsStepMean))),
            worstGtEqSevereFrames: Math.max(...sRuns.map((r) => r.penetrationGt.equilibriumSevereFramesCount)),
            textileDifferentiationPass: textileDiffPass,
            asymmetryContrastPass: asymDistinct,
        });
    }

    // Selección determinista: priorizar strictPassCount -> seamOrPanelPassCount -> mejor compromiso peak/coste
    const best = [...scorecards].sort((a, b) => {
        if (b.strictPassCount !== a.strictPassCount) return b.strictPassCount - a.strictPassCount;
        if (b.seamOrPanelPassCount !== a.seamOrPanelPassCount) return b.seamOrPanelPassCount - a.seamOrPanelPassCount;
        if (a.worstGtEqSevereFrames !== b.worstGtEqSevereFrames) return a.worstGtEqSevereFrames - b.worstGtEqSevereFrames;
        const aUnder16 = a.worstTotalStepMeanMs <= 16 ? 1 : 0;
        const bUnder16 = b.worstTotalStepMeanMs <= 16 ? 1 : 0;
        if (bUnder16 !== aUnder16) return bUnder16 - aUnder16;
        return a.worstPanelPeakStretchPct - b.worstPanelPeakStretchPct;
    })[0];

    const bestRuns = runs.filter((r) => r.solverId === best.solverId);
    const anyFailing = bestRuns.filter((r) => !r.strictPass);

    const limitations: string[] = [
        'Propiedades textiles sintéticas clasificadas TIER_3_ESTIMATED (sin calibración KES/FAST de laboratorio en T5).',
        'Prenda única de dos paneles (corpiño sin mangas con escote y sisas); mangas completas, pinzas de busto cosidas y tejidos multi-capa quedan fuera de T5.',
        `Sujeciones distribuidas en cresta de hombro (${sampleGarment.pinnedIndices.size} vértices interiores) compensan la ausencia de fricción estática hombro-tirante de alta resolución sub-milimétrica sin perder caída libre en escote ni sisas.`,
    ];
    for (const fr of anyFailing) {
        limitations.push(
            `${fr.runId}: panelMax=${fr.panelStrain.transientPeakStretchPct}%, combinedMax=${fr.combinedStrain.transientPeakStretchPct}%, seamGap=${fr.seamMetrics.equilibriumMaxGapMm}mm, gtEqFrames=${fr.penetrationGt.equilibriumSevereFramesCount}, meanMs=${fr.timingMs.totalStepMean}ms`
        );
    }

    const report: T5BenchmarkReport = {
        benchmarkId: 'T5_FIRST_GARMENT_PROTOTYPE',
        generatedAtIso: new Date().toISOString(),
        evidenceQuality: 'TIER_3_ESTIMATED',
        disclaimer: 'Todos los parámetros textiles de T5 corresponden a arquetipos sintéticos TIER_3_ESTIMATED heredados de T4/T4.1; no constituyen mediciones reales de laboratorio ni aprobación final de Gate 1.',
        gateStatusNote: 'PoC Etapa 1 T5 únicamente. No declarar Gate 1 aprobado; requiere revisión y autorización antes de T6.',
        patternGeometry: {
            ...sampleGarment.garmentStats,
            patternSpec: sampleGarment.patternSpec,
            initialGtAudit: {
                vertexCountChecked: sampleGarment.vertexCount,
                initialPenetratedCountGt0: initialPenGt0,
                initialSevereCountGt3mm: initialSevereGt3mm,
                initialMinSignedDistanceMm: round4(initialMinSdMm),
            },
        },
        collisionProxy: {
            id: collider.id,
            initMs: collider.initStats.initMs,
            memoryBytes: collider.initStats.memoryFootprintBytes,
            summary: collider.initStats.primitiveOrCellSummary,
            params: collisionParams,
        },
        runs,
        scorecards,
        asymmetryComparisons,
        recommendation: {
            recommendedSolverId: best.solverId,
            rationale: [
                `${best.solverId} logra ${best.strictPassCount}/${best.runsCount} PASS estricto y ${best.seamOrPanelPassCount}/${best.runsCount} PASS en paneles + colisión.`,
                `Peor pico en paneles = ${best.worstPanelPeakStretchPct}% (combinado con costuras = ${best.worstCombinedPeakStretchPct}%), brecha máxima de costura = ${best.worstSeamMaxGapMm} mm.`,
                `Tiempo medio = ${best.meanTotalStepMs} ms (peor mean = ${best.worstTotalStepMeanMs} ms, peor P95 = ${best.worstTotalStepP95Ms} ms) con colisión SDF Alt C media = ${best.meanCollisionMs} ms.`,
            ],
            limitationsIdentified: limitations,
            readyForT6WithExplicitCaveats: best.worstGtEqSevereFrames === 0 && best.worstTotalStepMeanMs <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
        },
    };

    const keyframeBundle: T5KeyframeBundle = {
        benchmarkId: 'T5_FIRST_GARMENT_PROTOTYPE',
        evidenceQuality: 'TIER_3_ESTIMATED',
        torsoMesh: {
            positionsM: Array.from(torsoDisplayMesh.positionsM, (v) => Math.round(v * 1e5) / 1e5),
            vertexNormals: Array.from(torsoDisplayMesh.vertexNormals, (v) => Math.round(v * 1e5) / 1e5),
            indices: Array.from(torsoDisplayMesh.indices),
        },
        garmentTopology: {
            vertexCount: sampleGarment.vertexCount,
            triangleCount: sampleGarment.triangleCount,
            panelTriangleSplitIndex: sampleGarment.panelTriangleSplitIndex,
            triangleIndices: Array.from(sampleGarment.triangleIndices),
            pinnedIndices: Array.from(sampleGarment.pinnedIndices),
            seams: sampleGarment.seams,
            necklineFrontIndices: sampleGarment.necklineVertexIndices.FRONT,
            necklineBackIndices: sampleGarment.necklineVertexIndices.BACK,
            armholeLeftIndices: sampleGarment.armholeVertexIndices.LEFT,
            armholeRightIndices: sampleGarment.armholeVertexIndices.RIGHT,
            garmentStats: sampleGarment.garmentStats,
        },
        runs: keyframeRuns,
    };

    return { report, batches, keyframeBundle };
}

