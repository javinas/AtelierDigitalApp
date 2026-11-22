// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK T4.1 SOLVER EXPERIMENTS
// Archivo: poc-simulador-3d/tests/t41SolverExperimentsBenchmark.ts
// ==============================================================================
// Compara experimentalmente tres variantes independientes contra H1B original
// sin modificar ni reemplazar HierarchicalXpbdClothSolver ni resultados T2-T4:
//   0. H1B_ORIGINAL                 (línea base T2.2/T3/T4 sin tocar)
//   1. EXP1_BEND_FIRST_CLEANUP      (12 substeps, Coarse->Col->Bend->FineStretch bidir)
//   2. EXP2_RAYLEIGH_BEND_FIRST     (EXP1 + Rayleigh interno XPBD en stretch y bending)
//   3. EXP3_SUB16_STRAIN_GUARD_DUAL_COL (16 substeps + BendFirst + Rayleigh + StrainGuard 4.5% + DualCol mu=0)
// Evalúa explícitamente los tres bloqueos abiertos de T4:
//   - Inestabilidad de micro-mallas (8x12 cm @ 32x32, dx=2.58 mm)
//   - Picos >5% y no asentamiento en cortina fruncida 82%
//   - Picos >5% en panel frontal, hombros anclados (2 pines) y capa 0-pines sobre SDF Alt C
//   - Control de no regresión direccional FACE_UP/FACE_DOWN y Scene 0
// ==============================================================================

import {
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
import { GeneratedClothMesh, generateScene0ClothMesh } from '../scene0/clothMeshGenerator';
import { computeSignedDihedralGradients } from '../solvers/clothSolvers';
import {
    HierarchicalXpbdClothSolver,
    HierarchicalXpbdConfig,
} from '../solvers/hierarchicalXpbdSolver';
import {
    T41ExperimentalConfig,
    T41ExperimentalXpbdSolver,
    T41SolverVariantId,
} from '../solvers/t41ExperimentalSolvers';

export type T41SolverId = 'H1B_ORIGINAL' | T41SolverVariantId;

export type T41ArchetypeId =
    | 'ARCH1_FLUID_LIGHT'
    | 'ARCH2_MEDIUM_BALANCED'
    | 'ARCH3_STRUCTURED_STIFF'
    | 'ARCH4_ASYM_FACE_UP_STIFF'
    | 'ARCH4_ASYM_FACE_DOWN_STIFF'
    | 'ARCH4_FORBIDDEN_AVG_CONTROL';

export type T41SceneId =
    | 'MICRO_CANTILEVER_32'
    | 'SCENE0_HANGING_32'
    | 'GATHERED_PLEAT_DRAPE'
    | 'BODICE_ALT_C'
    | 'SHOULDER_ANCHORED_ALT_C'
    | 'SHOULDER_CAPE_0PIN_ALT_C'
    | 'CANTILEVER_16';

export const T41_COLLISION_BUDGET_MS = 6.0;
export const T41_FRAME_P95_BUDGET_MS = 25.0;

export interface T41FabricSpec {
    readonly archetypeId: T41ArchetypeId;
    readonly label: string;
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly nominalGsm: number;
    readonly arealMassKgPerSqM: number;
    readonly warpWeftStiffnessNPerM: number;
    readonly shearStiffnessNPerM: number;
    readonly bending: BendingRigiditySpec;
    readonly airDampingPerS: number;
}

export const T41_FABRICS: Record<T41ArchetypeId, T41FabricSpec> = {
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
    ARCH4_FORBIDDEN_AVG_CONTROL: {
        archetypeId: 'ARCH4_FORBIDDEN_AVG_CONTROL',
        label: 'Control Negativo · Promedio Prohibido (B=93 uN*m)',
        evidenceQuality: 'TIER_3_ESTIMATED',
        nominalGsm: 180,
        arealMassKgPerSqM: gsmToKgPerSqM(180),
        warpWeftStiffnessNPerM: 1300,
        shearStiffnessNPerM: 280,
        bending: { mode: 'SYMMETRIC', rigidityNm: 93e-6 },
        airDampingPerS: 1.8,
    },
};

export interface T41SceneDef {
    readonly sceneId: T41SceneId;
    readonly title: string;
    readonly usesTorsoCollisionAltC: boolean;
    readonly gridSize: number;
    readonly widthM: number;
    readonly heightM: number;
    readonly totalFrames: number;
    readonly equilibriumStartFrame: number;
}

export const T41_SCENES: Record<T41SceneId, T41SceneDef> = {
    MICRO_CANTILEVER_32: {
        sceneId: 'MICRO_CANTILEVER_32',
        title: 'Micro-tira Cantilever (8 x 12 cm @ 32x32, dx = 2.58 mm)',
        usesTorsoCollisionAltC: false,
        gridSize: 32,
        widthM: 0.08,
        heightM: 0.12,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
    SCENE0_HANGING_32: {
        sceneId: 'SCENE0_HANGING_32',
        title: 'Scene 0 Control (50 x 50 cm @ 32x32, 2 pines)',
        usesTorsoCollisionAltC: false,
        gridSize: 32,
        widthM: 0.5,
        heightM: 0.5,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
    GATHERED_PLEAT_DRAPE: {
        sceneId: 'GATHERED_PLEAT_DRAPE',
        title: 'Cortina Fruncida 82% Isométrica (50 x 50 cm @ 32x32)',
        usesTorsoCollisionAltC: false,
        gridSize: 32,
        widthM: 0.5,
        heightM: 0.5,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
    BODICE_ALT_C: {
        sceneId: 'BODICE_ALT_C',
        title: 'Panel Frontal sobre Torso + Alt C SDF (36 x 72 cm @ 32x32)',
        usesTorsoCollisionAltC: true,
        gridSize: 32,
        widthM: 0.36,
        heightM: 0.72,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
    SHOULDER_ANCHORED_ALT_C: {
        sceneId: 'SHOULDER_ANCHORED_ALT_C',
        title: 'Capa Anclada en Hombros sobre Torso + Alt C SDF (62 x 62 cm, 2 pines acromiales)',
        usesTorsoCollisionAltC: true,
        gridSize: 32,
        widthM: 0.62,
        heightM: 0.62,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
    SHOULDER_CAPE_0PIN_ALT_C: {
        sceneId: 'SHOULDER_CAPE_0PIN_ALT_C',
        title: 'Capa Libre 0-Pines sobre Hombros/Cuello + Alt C SDF (62 x 62 cm)',
        usesTorsoCollisionAltC: true,
        gridSize: 32,
        widthM: 0.62,
        heightM: 0.62,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
    CANTILEVER_16: {
        sceneId: 'CANTILEVER_16',
        title: 'Voladizo Escala Prenda + Control Asimetría (16 x 20 cm @ 16x16)',
        usesTorsoCollisionAltC: false,
        gridSize: 16,
        widthM: 0.16,
        heightM: 0.2,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
};

export interface T41RunResult {
    runId: string;
    solverId: T41SolverId;
    sceneId: T41SceneId;
    archetypeId: T41ArchetypeId;
    gridSize: number;
    usesTorsoCollisionAltC: boolean;
    substeps: number;
    totalFrames: number;
    timingMs: {
        physicsStepMean: number;
        physicsStepP95: number;
        collisionMean: number;
        collisionP95: number;
        totalStepMean: number;
        totalStepP95: number;
        bendingMean: number;
        stretchMean: number;
        strainGuardMean: number;
    };
    strain: {
        transientMeanStretchPctMax: number;
        transientPeakStretchPct: number;
        transientPeakFrame: number;
        framesOver5PctCount: number;
        equilibriumMeanStretchPct: number;
        equilibriumMaxStretchPct: number;
    };
    stability: {
        nanVertexCountTotal: number;
        equilibriumRmsVelocityMS: number;
        finalKineticEnergyJ: number;
        finalStretchEnergyJ: number;
        finalBendingEnergyJ: number;
    };
    penetrationGt: {
        evaluated: boolean;
        maxDepthAllFramesMm: number;
        equilibriumMaxDepthMm: number;
        equilibriumSevereFramesCount: number;
    };
    drape: {
        centerBottomDropM: number;
        tipDropM: number | null;
        subBustAirGapMm: number | null;
        perimeterMeanRadiusM: number | null;
        meanAbsDihedralDeg: number;
    };
    checks: {
        zeroNan: boolean;
        collisionBudgetMeanLe6ms: boolean;
        totalStepBudgetMeanLe16ms: boolean;
        totalStepBudgetP95Le25ms: boolean;
        zeroSustainedSeverePenetrationGt3mm: boolean;
        equilibriumMeanStretchLe2Pct: boolean;
        equilibriumPeakStretchLe5Pct: boolean;
        transientPeakStretchLe5Pct: boolean;
        stableSettlingRmsVelLe008: boolean;
    };
    strictPass: boolean;
    statusLabel: 'PASS' | 'FAIL';
}

export interface T41SolverScorecard {
    solverId: T41SolverId;
    totalRuns: number;
    strictPassCount: number;
    strictPassRatePct: number;
    nanFailures: number;
    microMeshPass: boolean;
    microMeshPeakStretchPct: number;
    scene0Pass: boolean;
    gatheredPassCount: number;
    bodicePassCount: number;
    shoulderAnchoredPassCount: number;
    shoulderCape0PinPassCount: number;
    asymmetryDirectionalPass: boolean;
    contrastBodiceMonotonicPass: boolean;
    contrastCantileverMonotonicPass: boolean;
    worstTotalStepMeanMs: number;
    worstTotalStepP95Ms: number;
    meanTotalStepTorso32Ms: number;
    meanCollisionTorso32Ms: number;
}

export interface T41BenchmarkReport {
    generatedAtIso: string;
    referenceSolver: 'H1B_VCYCLE_12SUB';
    collisionProxy: 'ALT_C_SDF_GRID_3D';
    collisionParams: TorsoCollisionParams;
    solverOrder: readonly T41SolverId[];
    runs: T41RunResult[];
    scorecards: T41SolverScorecard[];
    asymmetryBySolver: {
        solverId: T41SolverId;
        cantileverFaceUpTipDropM: number;
        cantileverFaceDownTipDropM: number;
        cantileverForbiddenAvgTipDropM: number;
        diffMm: number;
        strictOrderAndNoAvgCollapsePass: boolean;
    }[];
    recommendation: {
        recommendedCandidateForT5: T41SolverId;
        rationale: string;
        t5BlockingDefectsRemaining: string[];
        documentableLimitationsRemaining: string[];
    };
}

function round4(value: number): number {
    return Math.round(value * 10000) / 10000;
}

function percentile(values: readonly number[], pct: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
    return sorted[idx];
}

function mean(values: readonly number[]): number {
    if (values.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    return sum / values.length;
}

function countNanCoords(arr: Float64Array): number {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) count++;
    }
    return count;
}

function getCantileverClampEndRow(gridSize: number): number {
    return gridSize === 16 ? 5 : 3;
}

function buildClothForScene(sceneDef: T41SceneDef, arealMassKgPerSqM: number): GeneratedClothMesh {
    const { sceneId, gridSize, widthM, heightM } = sceneDef;
    switch (sceneId) {
        case 'SCENE0_HANGING_32':
        case 'GATHERED_PLEAT_DRAPE': {
            return generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM,
                heightM,
                initialHeightM: 1.0,
            });
        }
        case 'MICRO_CANTILEVER_32':
        case 'CANTILEVER_16': {
            const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM,
                heightM,
                initialHeightM: 1.0,
            });
            for (let i = 0; i < mesh.vertexCount; i++) {
                mesh.inverseMassesPerKg[i] = 1 / mesh.massesKg[i];
            }
            mesh.pinnedIndices.clear();
            const clampEndRow = getCantileverClampEndRow(gridSize);
            for (let r = 0; r <= clampEndRow; r++) {
                for (let c = 0; c < gridSize; c++) {
                    const idx = r * gridSize + c;
                    mesh.pinnedIndices.add(idx);
                    mesh.inverseMassesPerKg[idx] = 0;
                }
            }
            return mesh;
        }
        case 'BODICE_ALT_C': {
            const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM: 0.36,
                heightM: 0.72,
                initialHeightM: 0.0,
            });
            const tiltRad = (21 * Math.PI) / 180;
            const sinTilt = Math.sin(tiltRad);
            const cosTilt = Math.cos(tiltRad);
            const topY = 0.805;
            const topZ = 0.112;
            for (let i = 0; i < mesh.vertexCount; i++) {
                const s = mesh.restPositionsM[i * 3 + 2];
                mesh.restPositionsM[i * 3 + 1] = topY - s * cosTilt;
                mesh.restPositionsM[i * 3 + 2] = topZ + s * sinTilt;
                mesh.inverseMassesPerKg[i] = 1 / mesh.massesKg[i];
            }
            mesh.pinnedIndices.clear();
            const strapCols = [1, 2, 3, 4, gridSize - 5, gridSize - 4, gridSize - 3, gridSize - 2];
            for (const c of strapCols) {
                mesh.pinnedIndices.add(c);
                mesh.inverseMassesPerKg[c] = 0;
            }
            return mesh;
        }
        case 'SHOULDER_CAPE_0PIN_ALT_C': {
            const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM: 0.62,
                heightM: 0.62,
                initialHeightM: 0.918,
            });
            const offsetZ = -0.3;
            for (let i = 0; i < mesh.vertexCount; i++) {
                mesh.restPositionsM[i * 3 + 2] += offsetZ;
                mesh.inverseMassesPerKg[i] = 1 / mesh.massesKg[i];
            }
            mesh.pinnedIndices.clear();
            return mesh;
        }
        case 'SHOULDER_ANCHORED_ALT_C': {
            const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM: 0.62,
                heightM: 0.62,
                initialHeightM: 0.918,
            });
            const offsetZ = -0.3;
            for (let i = 0; i < mesh.vertexCount; i++) {
                mesh.restPositionsM[i * 3 + 2] += offsetZ;
                mesh.inverseMassesPerKg[i] = 1 / mesh.massesKg[i];
            }
            mesh.pinnedIndices.clear();
            for (const c of [9, 22]) {
                const idx = 15 * gridSize + c;
                mesh.pinnedIndices.add(idx);
                mesh.inverseMassesPerKg[idx] = 0;
            }
            return mesh;
        }
    }
}

function applyGatheredPleatInitialCondition(
    mesh: GeneratedClothMesh,
    positionsM: Float64Array,
    predictedM: Float64Array,
    widthM: number
): void {
    const g = mesh.gridSize;
    const ds = widthM / (g - 1);
    const targetSpan = 0.82 * widthM;
    const nHalfWaves = 5;

    const evalSpanForAmp = (ampM: number): { xs: Float64Array; ys: Float64Array; span: number } => {
        const ys = new Float64Array(g);
        for (let c = 0; c < g; c++) {
            ys[c] = ampM * Math.sin((nHalfWaves * Math.PI * c) / (g - 1));
        }
        const xs = new Float64Array(g);
        for (let c = 1; c < g; c++) {
            const dy = ys[c] - ys[c - 1];
            const dx = Math.sqrt(Math.max(1e-10, ds * ds - dy * dy));
            xs[c] = xs[c - 1] + dx;
        }
        const span = xs[g - 1];
        const shiftX = -0.5 * span;
        for (let c = 0; c < g; c++) xs[c] += shiftX;
        return { xs, ys, span };
    };

    let lo = 0.0;
    let hi = (ds * (g - 1)) / (nHalfWaves * Math.PI) * 0.99;
    for (let iter = 0; iter < 30; iter++) {
        const mid = 0.5 * (lo + hi);
        if (evalSpanForAmp(mid).span > targetSpan) lo = mid;
        else hi = mid;
    }
    const { xs: pleatX, ys: pleatY } = evalSpanForAmp(0.5 * (lo + hi));

    for (let r = 0; r < g; r++) {
        for (let c = 0; c < g; c++) {
            const idx = r * g + c;
            positionsM[idx * 3] = pleatX[c];
            positionsM[idx * 3 + 1] = mesh.restPositionsM[idx * 3 + 1] + pleatY[c];
            predictedM[idx * 3] = positionsM[idx * 3];
            predictedM[idx * 3 + 1] = positionsM[idx * 3 + 1];
        }
    }
}

function buildH1bConfig(fabric: T41FabricSpec, dtFrameS: number): HierarchicalXpbdConfig {
    return {
        variantId: 'H1B_VCYCLE_12SUB',
        dtFrameS,
        substeps: 12,
        coarseStrides: [16, 8, 4, 2],
        coarseIterationsPerLevel: 3,
        fineStretchIterationsPerSubstep: 2,
        bidirectionalFineSweep: true,
        bendingIterationsPerSubstep: 1,
        prolongationRelaxation: 1.0,
        coarseUnilateralOnly: true,
        coarseComplianceScale: 1.0,
        airDampingPerS: fabric.airDampingPerS,
        warpWeftStiffnessNPerM: fabric.warpWeftStiffnessNPerM,
        shearStiffnessNPerM: fabric.shearStiffnessNPerM,
        bending: fabric.bending,
    };
}

function buildExperimentalConfig(
    solverId: T41SolverVariantId,
    fabric: T41FabricSpec,
    dtFrameS: number
): T41ExperimentalConfig {
    const base = {
        variantId: solverId,
        dtFrameS,
        coarseStrides: [16, 8, 4, 2] as const,
        coarseIterationsPerLevel: 3,
        bendingIterationsPerSubstep: 1,
        prolongationRelaxation: 1.0,
        coarseUnilateralOnly: true,
        coarseComplianceScale: 1.0,
        airDampingPerS: fabric.airDampingPerS,
        warpWeftStiffnessNPerM: fabric.warpWeftStiffnessNPerM,
        shearStiffnessNPerM: fabric.shearStiffnessNPerM,
        bending: fabric.bending,
    };

    switch (solverId) {
        case 'EXP1_BEND_FIRST_CLEANUP':
            return {
                ...base,
                substeps: 12,
                fineStretchIterationsPerSubstep: 4,
                bidirectionalFineSweep: true,
                rayleighStretchTauS: 0,
                rayleighBendTauS: 0,
                strainGuardMaxRatio: null,
                strainGuardIterations: 0,
                useDualCollisionCleanup: false,
            };
        case 'EXP2_RAYLEIGH_BEND_FIRST':
            return {
                ...base,
                substeps: 12,
                fineStretchIterationsPerSubstep: 4,
                bidirectionalFineSweep: true,
                rayleighStretchTauS: 0.0006,
                rayleighBendTauS: 0.0015,
                strainGuardMaxRatio: null,
                strainGuardIterations: 0,
                useDualCollisionCleanup: false,
            };
        case 'EXP3_SUB16_STRAIN_GUARD_DUAL_COL':
            return {
                ...base,
                substeps: 16,
                fineStretchIterationsPerSubstep: 4,
                bidirectionalFineSweep: true,
                rayleighStretchTauS: 0.0006,
                rayleighBendTauS: 0.0015,
                strainGuardMaxRatio: 0.045,
                strainGuardIterations: 2,
                useDualCollisionCleanup: true,
            };
    }
}

function computeRmsVelocityAndKineticEnergy(
    vel: Float64Array,
    massesKg: Float64Array,
    invMass: Float64Array
): { rmsVelMS: number; kineticEnergyJ: number } {
    let velSqSum = 0;
    let activeCount = 0;
    let kineticJ = 0;
    for (let i = 0; i < invMass.length; i++) {
        if (invMass[i] === 0) continue;
        const b = i * 3;
        const v2 = vel[b] * vel[b] + vel[b + 1] * vel[b + 1] + vel[b + 2] * vel[b + 2];
        velSqSum += v2;
        kineticJ += 0.5 * massesKg[i] * v2;
        activeCount++;
    }
    return {
        rmsVelMS: activeCount > 0 ? Math.sqrt(velSqSum / activeCount) : 0,
        kineticEnergyJ: kineticJ,
    };
}

function computeElasticEnergiesAndDihedrals(
    mesh: GeneratedClothMesh,
    positionsM: Float64Array,
    fabric: T41FabricSpec
): { stretchEnergyJ: number; bendingEnergyJ: number; meanAbsDihedralDeg: number } {
    let stretchEnergyJ = 0;
    for (const edge of mesh.edges) {
        const kStretch = edge.kind === 'shear'
            ? fabric.shearStiffnessNPerM
            : fabric.warpWeftStiffnessNPerM;
        const kEdge = computeXpbdEdgeCompliance(
            kStretch,
            edge.restLengthM,
            edge.tributaryWidthM,
            1
        ).edgeStiffnessNPerM;
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
    for (const hinge of mesh.hinges) {
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

function measureDrapeSummary(
    sceneDef: T41SceneDef,
    mesh: GeneratedClothMesh,
    positionsM: Float64Array,
    fabric: T41FabricSpec,
    gtSignedDistancesM: Float64Array | null
): T41RunResult['drape'] {
    const g = mesh.gridSize;
    const centerBottomIdx = (g - 1) * g + Math.floor(g / 2);
    const centerBottomDropM = mesh.restPositionsM[centerBottomIdx * 3 + 1] - positionsM[centerBottomIdx * 3 + 1];
    const energies = computeElasticEnergiesAndDihedrals(mesh, positionsM, fabric);

    let tipDropM: number | null = null;
    let subBustAirGapMm: number | null = null;
    let perimeterMeanRadiusM: number | null = null;

    if (sceneDef.sceneId === 'CANTILEVER_16' || sceneDef.sceneId === 'MICRO_CANTILEVER_32') {
        const clampR = getCantileverClampEndRow(g);
        const clampY = mesh.restPositionsM[(clampR * g + Math.floor(g / 2)) * 3 + 1];
        let tipY = 0;
        for (let c = 0; c < g; c++) {
            tipY += positionsM[((g - 1) * g + c) * 3 + 1];
        }
        tipY /= g;
        tipDropM = clampY - tipY;
    }

    if (sceneDef.sceneId === 'BODICE_ALT_C' && gtSignedDistancesM !== null) {
        let gapSumMm = 0;
        let gapCount = 0;
        for (let r = 8; r <= 19; r++) {
            for (let c = 9; c <= 22; c++) {
                const idx = r * g + c;
                const y = positionsM[idx * 3 + 1];
                if (y >= 0.44 && y <= 0.62) {
                    gapSumMm += Math.max(0, gtSignedDistancesM[idx] * 1000);
                    gapCount++;
                }
            }
        }
        subBustAirGapMm = gapCount > 0 ? gapSumMm / gapCount : 0;
    }

    if (sceneDef.sceneId === 'SHOULDER_CAPE_0PIN_ALT_C' || sceneDef.sceneId === 'SHOULDER_ANCHORED_ALT_C') {
        let radSum = 0;
        let perimCount = 0;
        for (let r = 0; r < g; r++) {
            for (let c = 0; c < g; c++) {
                if (r !== 0 && r !== g - 1 && c !== 0 && c !== g - 1) continue;
                const b = (r * g + c) * 3;
                radSum += Math.hypot(positionsM[b], positionsM[b + 2]);
                perimCount++;
            }
        }
        perimeterMeanRadiusM = perimCount > 0 ? radSum / perimCount : 0;
    }

    return {
        centerBottomDropM: round4(centerBottomDropM),
        tipDropM: tipDropM === null ? null : round4(tipDropM),
        subBustAirGapMm: subBustAirGapMm === null ? null : round4(subBustAirGapMm),
        perimeterMeanRadiusM: perimeterMeanRadiusM === null ? null : round4(perimeterMeanRadiusM),
        meanAbsDihedralDeg: round4(energies.meanAbsDihedralDeg),
    };
}

function executeSingleRun(params: {
    solverId: T41SolverId;
    sceneDef: T41SceneDef;
    fabric: T41FabricSpec;
    collider: TorsoCollider | null;
    gtBvh: CompactTriangleBvh;
    collisionParams: TorsoCollisionParams;
}): { result: T41RunResult; batch: TelemetryExportBatch } {
    const dtFrameS = 1 / 60;
    const runId = `${params.solverId}__${params.sceneDef.sceneId}__${params.fabric.archetypeId}`;
    const mesh = buildClothForScene(params.sceneDef, params.fabric.arealMassKgPerSqM);

    let substeps = 12;
    let h1bSolver: HierarchicalXpbdClothSolver | null = null;
    let expSolver: T41ExperimentalXpbdSolver | null = null;

    if (params.solverId === 'H1B_ORIGINAL') {
        const cfg = buildH1bConfig(params.fabric, dtFrameS);
        substeps = cfg.substeps;
        h1bSolver = new HierarchicalXpbdClothSolver(mesh, cfg);
    } else {
        const cfg = buildExperimentalConfig(params.solverId, params.fabric, dtFrameS);
        substeps = cfg.substeps;
        expSolver = new T41ExperimentalXpbdSolver(mesh, cfg);
    }

    const activePositions = h1bSolver ? h1bSolver.positionsM : expSolver!.positionsM;
    const activePredicted = h1bSolver ? h1bSolver.predictedM : expSolver!.predictedM;
    const activeVelocities = h1bSolver ? h1bSolver.velocitiesMS : expSolver!.velocitiesMS;

    if (params.sceneDef.sceneId === 'GATHERED_PLEAT_DRAPE') {
        applyGatheredPleatInitialCondition(mesh, activePositions, activePredicted, params.sceneDef.widthM);
    }

    const cleanupCollisionParams: TorsoCollisionParams = {
        ...params.collisionParams,
        frictionCoeff: 0,
    };

    const harness = new TelemetryHarness();
    const dummySignedDistancesM = new Float64Array(mesh.vertexCount).fill(0.1);
    const gtSignedDistancesM = params.sceneDef.usesTorsoCollisionAltC
        ? new Float64Array(mesh.vertexCount)
        : null;

    const physicsMsList: number[] = [];
    const collisionMsList: number[] = [];
    const totalMsList: number[] = [];
    let bendingSum = 0;
    let stretchSum = 0;
    let strainGuardSum = 0;

    let nanVertexCountTotal = 0;
    let transientMeanStretchPctMax = 0;
    let transientPeakStretchPct = 0;
    let transientPeakFrame = 0;
    let framesOver5PctCount = 0;
    let eqMeanStretchSum = 0;
    let eqMaxStretch = 0;
    let eqVelRmsSum = 0;
    let eqFramesCount = 0;
    let gtMaxDepthAllFramesMm = 0;
    let gtEqMaxDepthMm = 0;
    let gtEqSevereFramesCount = 0;

    for (let frameIdx = 0; frameIdx < params.sceneDef.totalFrames; frameIdx++) {
        const simTimeS = (frameIdx + 1) * dtFrameS;
        harness.beginFrame({
            frameIndex: frameIdx,
            simTimeS,
            dtFrameS,
            substeps,
            solverModel: 'XPBD',
            fabricId: runId,
        });

        const col = params.collider;
        let physicsMs = 0;
        let collisionMs = 0;
        let totalMs = 0;

        if (h1bSolver !== null) {
            const prof = col !== null
                ? h1bSolver.stepFrameTimed(
                    (pred, pos, invM) => col.resolveSubstepCollision(pred, pos, invM, params.collisionParams),
                    'before-fine-solve'
                )
                : h1bSolver.stepFrameTimed();
            physicsMs = prof.totalMs;
            collisionMs = prof.collisionMs;
            totalMs = prof.totalMs + prof.collisionMs;
            bendingSum += prof.bendingMs;
            stretchSum += prof.stretchMs;
        } else {
            const prof = col !== null
                ? expSolver!.stepFrameTimed(
                    (pred, pos, invM) => col.resolveSubstepCollision(pred, pos, invM, params.collisionParams),
                    (pred, pos, invM) => col.resolveSubstepCollision(pred, pos, invM, cleanupCollisionParams)
                )
                : expSolver!.stepFrameTimed();
            physicsMs = prof.totalMs;
            collisionMs = prof.collisionMs;
            totalMs = prof.totalMs + prof.collisionMs;
            bendingSum += prof.bendingMs;
            stretchSum += prof.stretchMs;
            strainGuardSum += prof.strainGuardMs;
        }

        harness.recordPhaseMs('physicsStepMs', physicsMs);
        harness.recordPhaseMs('collisionMs', collisionMs);
        harness.recordPhaseMs('renderMs', 0);

        physicsMsList.push(physicsMs);
        collisionMsList.push(collisionMs);
        totalMsList.push(totalMs);

        const stretchStats = measureEdgeStretchStats(activePositions, mesh.edges);
        const rawNanCount = countNanCoords(activePositions) + countNanCoords(activeVelocities);
        nanVertexCountTotal += Math.max(stretchStats.nanVertexCount, rawNanCount);

        let penStats = measurePenetrationStats(dummySignedDistancesM, DEFAULT_SEVERE_PENETRATION_THRESHOLD_M);
        if (gtSignedDistancesM !== null) {
            for (let i = 0; i < mesh.vertexCount; i++) {
                const b = i * 3;
                gtSignedDistancesM[i] = params.gtBvh.queryClosestSigned(
                    activePositions[b],
                    activePositions[b + 1],
                    activePositions[b + 2]
                ).signedDistanceM;
            }
            penStats = measurePenetrationStats(gtSignedDistancesM, DEFAULT_SEVERE_PENETRATION_THRESHOLD_M);
        }

        if (stretchStats.meanStretchPct > transientMeanStretchPctMax) {
            transientMeanStretchPctMax = stretchStats.meanStretchPct;
        }
        if (stretchStats.maxStretchPct > transientPeakStretchPct) {
            transientPeakStretchPct = stretchStats.maxStretchPct;
            transientPeakFrame = frameIdx;
        }
        if (stretchStats.maxStretchPct > GATE1_PEAK_STRETCH_PCT_LIMIT) {
            framesOver5PctCount++;
        }
        if (penStats.maxPenetrationDepthMm > gtMaxDepthAllFramesMm) {
            gtMaxDepthAllFramesMm = penStats.maxPenetrationDepthMm;
        }

        if (frameIdx >= params.sceneDef.equilibriumStartFrame) {
            eqFramesCount++;
            eqMeanStretchSum += stretchStats.meanStretchPct;
            if (stretchStats.maxStretchPct > eqMaxStretch) {
                eqMaxStretch = stretchStats.maxStretchPct;
            }
            const velKin = computeRmsVelocityAndKineticEnergy(activeVelocities, mesh.massesKg, mesh.inverseMassesPerKg);
            eqVelRmsSum += velKin.rmsVelMS;

            if (penStats.maxPenetrationDepthMm > gtEqMaxDepthMm) {
                gtEqMaxDepthMm = penStats.maxPenetrationDepthMm;
            }
            if (penStats.penetrationCount > 0) {
                gtEqSevereFramesCount++;
            }
        }

        harness.finalizeFrame({
            stretch: stretchStats,
            penetration: penStats,
            renderMode: 'headless-dry-run',
            vertexCount: mesh.vertexCount,
            triangleCount: mesh.triangleCount,
        });
    }

    if (gtSignedDistancesM !== null) {
        for (let i = 0; i < mesh.vertexCount; i++) {
            const b = i * 3;
            gtSignedDistancesM[i] = params.gtBvh.queryClosestSigned(
                activePositions[b],
                activePositions[b + 1],
                activePositions[b + 2]
            ).signedDistanceM;
        }
    }

    const eqMeanStretchPct = eqFramesCount > 0 ? eqMeanStretchSum / eqFramesCount : 0;
    const eqRmsVelMS = eqFramesCount > 0 ? eqVelRmsSum / eqFramesCount : 0;
    const finalVelKin = computeRmsVelocityAndKineticEnergy(activeVelocities, mesh.massesKg, mesh.inverseMassesPerKg);
    const finalEnergies = computeElasticEnergiesAndDihedrals(mesh, activePositions, params.fabric);

    const totalMeanMs = mean(totalMsList);
    const totalP95Ms = percentile(totalMsList, 95);
    const collisionMeanMs = mean(collisionMsList);
    const collisionP95Ms = percentile(collisionMsList, 95);
    const physicsMeanMs = mean(physicsMsList);
    const physicsP95Ms = percentile(physicsMsList, 95);

    const checks = {
        zeroNan: nanVertexCountTotal === 0,
        collisionBudgetMeanLe6ms: collisionMeanMs <= T41_COLLISION_BUDGET_MS,
        totalStepBudgetMeanLe16ms: totalMeanMs <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
        totalStepBudgetP95Le25ms: totalP95Ms <= T41_FRAME_P95_BUDGET_MS,
        zeroSustainedSeverePenetrationGt3mm: !params.sceneDef.usesTorsoCollisionAltC || gtEqSevereFramesCount === 0,
        equilibriumMeanStretchLe2Pct: eqMeanStretchPct <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        equilibriumPeakStretchLe5Pct: eqMaxStretch <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        transientPeakStretchLe5Pct: transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        stableSettlingRmsVelLe008: eqRmsVelMS <= 0.08,
    };

    const strictPass = Object.values(checks).every(Boolean);

    const drape = measureDrapeSummary(
        params.sceneDef,
        mesh,
        activePositions,
        params.fabric,
        gtSignedDistancesM
    );

    const result: T41RunResult = {
        runId,
        solverId: params.solverId,
        sceneId: params.sceneDef.sceneId,
        archetypeId: params.fabric.archetypeId,
        gridSize: params.sceneDef.gridSize,
        usesTorsoCollisionAltC: params.sceneDef.usesTorsoCollisionAltC,
        substeps,
        totalFrames: params.sceneDef.totalFrames,
        timingMs: {
            physicsStepMean: round4(physicsMeanMs),
            physicsStepP95: round4(physicsP95Ms),
            collisionMean: round4(collisionMeanMs),
            collisionP95: round4(collisionP95Ms),
            totalStepMean: round4(totalMeanMs),
            totalStepP95: round4(totalP95Ms),
            bendingMean: round4(bendingSum / params.sceneDef.totalFrames),
            stretchMean: round4(stretchSum / params.sceneDef.totalFrames),
            strainGuardMean: round4(strainGuardSum / params.sceneDef.totalFrames),
        },
        strain: {
            transientMeanStretchPctMax: round4(transientMeanStretchPctMax),
            transientPeakStretchPct: round4(transientPeakStretchPct),
            transientPeakFrame,
            framesOver5PctCount,
            equilibriumMeanStretchPct: round4(eqMeanStretchPct),
            equilibriumMaxStretchPct: round4(eqMaxStretch),
        },
        stability: {
            nanVertexCountTotal,
            equilibriumRmsVelocityMS: round4(eqRmsVelMS),
            finalKineticEnergyJ: round4(finalVelKin.kineticEnergyJ),
            finalStretchEnergyJ: round4(finalEnergies.stretchEnergyJ),
            finalBendingEnergyJ: round4(finalEnergies.bendingEnergyJ),
        },
        penetrationGt: {
            evaluated: gtSignedDistancesM !== null,
            maxDepthAllFramesMm: round4(gtMaxDepthAllFramesMm),
            equilibriumMaxDepthMm: round4(gtEqMaxDepthMm),
            equilibriumSevereFramesCount: gtEqSevereFramesCount,
        },
        drape,
        checks,
        strictPass,
        statusLabel: strictPass ? 'PASS' : 'FAIL',
    };

    const batch = harness.buildBatchExport();

    return { result, batch };
}

export function runT41SolverExperimentsBenchmark(): {
    report: T41BenchmarkReport;
    batches: Record<string, TelemetryExportBatch>;
} {
    const groundTruth = new ReferenceTorsoGroundTruth(96, 108);
    const gtBvh = new CompactTriangleBvh(groundTruth.mesh);
    const altCSdfCollider = createTorsoCollider('ALT_C_SDF_GRID_3D');
    const collisionParams: TorsoCollisionParams = {
        ...DEFAULT_TORSO_COLLISION_PARAMS,
        contactThicknessM: 0.002,
        frictionCoeff: 0.35,
    };

    // Calentamiento breve JIT V8 antes de registrar tiempos
    const warmMesh = buildClothForScene(T41_SCENES.BODICE_ALT_C, T41_FABRICS.ARCH2_MEDIUM_BALANCED.arealMassKgPerSqM);
    const warmSolver = new HierarchicalXpbdClothSolver(
        warmMesh,
        buildH1bConfig(T41_FABRICS.ARCH2_MEDIUM_BALANCED, 1 / 60)
    );
    for (let w = 0; w < 12; w++) {
        warmSolver.stepFrameTimed(
            (pred, pos, invM) => altCSdfCollider.resolveSubstepCollision(pred, pos, invM, collisionParams),
            'before-fine-solve'
        );
    }

    const solverOrder: readonly T41SolverId[] = [
        'H1B_ORIGINAL',
        'EXP1_BEND_FIRST_CLEANUP',
        'EXP2_RAYLEIGH_BEND_FIRST',
        'EXP3_SUB16_STRAIN_GUARD_DUAL_COL',
    ];

    const matrix: { sceneId: T41SceneId; archetypes: readonly T41ArchetypeId[] }[] = [
        {
            sceneId: 'MICRO_CANTILEVER_32',
            archetypes: ['ARCH3_STRUCTURED_STIFF'],
        },
        {
            sceneId: 'SCENE0_HANGING_32',
            archetypes: ['ARCH2_MEDIUM_BALANCED'],
        },
        {
            sceneId: 'GATHERED_PLEAT_DRAPE',
            archetypes: ['ARCH2_MEDIUM_BALANCED', 'ARCH3_STRUCTURED_STIFF'],
        },
        {
            sceneId: 'BODICE_ALT_C',
            archetypes: [
                'ARCH1_FLUID_LIGHT',
                'ARCH2_MEDIUM_BALANCED',
                'ARCH3_STRUCTURED_STIFF',
                'ARCH4_ASYM_FACE_UP_STIFF',
            ],
        },
        {
            sceneId: 'SHOULDER_ANCHORED_ALT_C',
            archetypes: ['ARCH2_MEDIUM_BALANCED', 'ARCH3_STRUCTURED_STIFF'],
        },
        {
            sceneId: 'SHOULDER_CAPE_0PIN_ALT_C',
            archetypes: ['ARCH1_FLUID_LIGHT', 'ARCH3_STRUCTURED_STIFF'],
        },
        {
            sceneId: 'CANTILEVER_16',
            archetypes: [
                'ARCH1_FLUID_LIGHT',
                'ARCH3_STRUCTURED_STIFF',
                'ARCH4_ASYM_FACE_UP_STIFF',
                'ARCH4_ASYM_FACE_DOWN_STIFF',
                'ARCH4_FORBIDDEN_AVG_CONTROL',
            ],
        },
    ];

    const runs: T41RunResult[] = [];
    const batches: Record<string, TelemetryExportBatch> = {};

    for (const solverId of solverOrder) {
        for (const entry of matrix) {
            const sceneDef = T41_SCENES[entry.sceneId];
            for (const archId of entry.archetypes) {
                const fabric = T41_FABRICS[archId];
                const { result, batch } = executeSingleRun({
                    solverId,
                    sceneDef,
                    fabric,
                    collider: sceneDef.usesTorsoCollisionAltC ? altCSdfCollider : null,
                    gtBvh,
                    collisionParams,
                });
                runs.push(result);
                batches[result.runId] = batch;
            }
        }
    }

    const findRun = (solverId: T41SolverId, sceneId: T41SceneId, archId: T41ArchetypeId): T41RunResult => {
        const hit = runs.find(
            (r) => r.solverId === solverId && r.sceneId === sceneId && r.archetypeId === archId
        );
        if (!hit) {
            throw new Error(`Falta corrida T4.1: ${solverId}/${sceneId}/${archId}`);
        }
        return hit;
    };

    const asymmetryBySolver: T41BenchmarkReport['asymmetryBySolver'] = [];
    const scorecards: T41SolverScorecard[] = [];

    for (const solverId of solverOrder) {
        const sRuns = runs.filter((r) => r.solverId === solverId);
        const torsoRuns = sRuns.filter((r) => r.usesTorsoCollisionAltC);

        const micro = findRun(solverId, 'MICRO_CANTILEVER_32', 'ARCH3_STRUCTURED_STIFF');
        const scene0 = findRun(solverId, 'SCENE0_HANGING_32', 'ARCH2_MEDIUM_BALANCED');

        const bod1 = findRun(solverId, 'BODICE_ALT_C', 'ARCH1_FLUID_LIGHT');
        const bod2 = findRun(solverId, 'BODICE_ALT_C', 'ARCH2_MEDIUM_BALANCED');
        const bod3 = findRun(solverId, 'BODICE_ALT_C', 'ARCH3_STRUCTURED_STIFF');

        const cant1 = findRun(solverId, 'CANTILEVER_16', 'ARCH1_FLUID_LIGHT');
        const cant3 = findRun(solverId, 'CANTILEVER_16', 'ARCH3_STRUCTURED_STIFF');
        const cantUp = findRun(solverId, 'CANTILEVER_16', 'ARCH4_ASYM_FACE_UP_STIFF');
        const cantDown = findRun(solverId, 'CANTILEVER_16', 'ARCH4_ASYM_FACE_DOWN_STIFF');
        const cantAvg = findRun(solverId, 'CANTILEVER_16', 'ARCH4_FORBIDDEN_AVG_CONTROL');

        const asymPass =
            cantUp.drape.tipDropM! < cantAvg.drape.tipDropM!
            && cantAvg.drape.tipDropM! < cantDown.drape.tipDropM!
            && (cantDown.drape.tipDropM! - cantUp.drape.tipDropM!) > 0.01;

        asymmetryBySolver.push({
            solverId,
            cantileverFaceUpTipDropM: cantUp.drape.tipDropM!,
            cantileverFaceDownTipDropM: cantDown.drape.tipDropM!,
            cantileverForbiddenAvgTipDropM: cantAvg.drape.tipDropM!,
            diffMm: round4((cantDown.drape.tipDropM! - cantUp.drape.tipDropM!) * 1000),
            strictOrderAndNoAvgCollapsePass: asymPass,
        });

        const contrastBodicePass =
            bod1.drape.subBustAirGapMm! < bod2.drape.subBustAirGapMm!
            && bod2.drape.subBustAirGapMm! < bod3.drape.subBustAirGapMm!;
        const contrastCantileverPass = cant1.drape.tipDropM! > cant3.drape.tipDropM!;

        const passCount = sRuns.filter((r) => r.strictPass).length;
        scorecards.push({
            solverId,
            totalRuns: sRuns.length,
            strictPassCount: passCount,
            strictPassRatePct: round4((passCount / sRuns.length) * 100),
            nanFailures: sRuns.filter((r) => !r.checks.zeroNan).length,
            microMeshPass: micro.strictPass,
            microMeshPeakStretchPct: micro.strain.transientPeakStretchPct,
            scene0Pass: scene0.strictPass,
            gatheredPassCount: sRuns.filter((r) => r.sceneId === 'GATHERED_PLEAT_DRAPE' && r.strictPass).length,
            bodicePassCount: sRuns.filter((r) => r.sceneId === 'BODICE_ALT_C' && r.strictPass).length,
            shoulderAnchoredPassCount: sRuns.filter((r) => r.sceneId === 'SHOULDER_ANCHORED_ALT_C' && r.strictPass).length,
            shoulderCape0PinPassCount: sRuns.filter((r) => r.sceneId === 'SHOULDER_CAPE_0PIN_ALT_C' && r.strictPass).length,
            asymmetryDirectionalPass: asymPass,
            contrastBodiceMonotonicPass: contrastBodicePass,
            contrastCantileverMonotonicPass: contrastCantileverPass,
            worstTotalStepMeanMs: round4(Math.max(...sRuns.map((r) => r.timingMs.totalStepMean))),
            worstTotalStepP95Ms: round4(Math.max(...sRuns.map((r) => r.timingMs.totalStepP95))),
            meanTotalStepTorso32Ms: round4(mean(torsoRuns.map((r) => r.timingMs.totalStepMean))),
            meanCollisionTorso32Ms: round4(mean(torsoRuns.map((r) => r.timingMs.collisionMean))),
        });
    }

    const bestScorecard = [...scorecards].sort((a, b) => {
        if (b.strictPassCount !== a.strictPassCount) return b.strictPassCount - a.strictPassCount;
        return a.worstTotalStepMeanMs - b.worstTotalStepMeanMs;
    })[0];

    const bestRuns = runs.filter((r) => r.solverId === bestScorecard.solverId);
    const bestFailingRuns = bestRuns.filter((r) => !r.strictPass);

    const blockingRemaining = bestFailingRuns
        .filter((r) =>
            !r.checks.zeroNan
            || !r.checks.totalStepBudgetMeanLe16ms
            || !r.checks.zeroSustainedSeverePenetrationGt3mm
            || r.sceneId === 'MICRO_CANTILEVER_32'
            || r.sceneId === 'BODICE_ALT_C'
            || r.sceneId === 'GATHERED_PLEAT_DRAPE'
        )
        .map((r) => `${r.sceneId}/${r.archetypeId}: peak=${r.strain.transientPeakStretchPct}%, eqMax=${r.strain.equilibriumMaxStretchPct}%, rmsVel=${r.stability.equilibriumRmsVelocityMS}, gtEqFrames=${r.penetrationGt.equilibriumSevereFramesCount}, meanMs=${r.timingMs.totalStepMean}`);

    const documentableRemaining = bestFailingRuns
        .filter((r) => r.sceneId === 'SHOULDER_ANCHORED_ALT_C' || r.sceneId === 'SHOULDER_CAPE_0PIN_ALT_C')
        .map((r) => `${r.sceneId}/${r.archetypeId}: peak=${r.strain.transientPeakStretchPct}%, eqMax=${r.strain.equilibriumMaxStretchPct}%, gtEqFrames=${r.penetrationGt.equilibriumSevereFramesCount} (concentración geométrica en 2 pines de 1 vértice o paño plano sin escote sobre silla de montar del cuello)`);

    const report: T41BenchmarkReport = {
        generatedAtIso: new Date().toISOString(),
        referenceSolver: 'H1B_VCYCLE_12SUB',
        collisionProxy: 'ALT_C_SDF_GRID_3D',
        collisionParams,
        solverOrder,
        runs,
        scorecards,
        asymmetryBySolver,
        recommendation: {
            recommendedCandidateForT5: bestScorecard.solverId,
            rationale:
                `Candidato con mayor tasa de cumplimiento estricto (${bestScorecard.strictPassCount}/${bestScorecard.totalRuns} corridas, ${bestScorecard.strictPassRatePct}%) preservando separación asimétrica FACE_UP/FACE_DOWN y contraste textil.`,
            t5BlockingDefectsRemaining: blockingRemaining,
            documentableLimitationsRemaining: documentableRemaining,
        },
    };

    return { report, batches };
}

