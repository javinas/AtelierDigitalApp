// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK T4 ARQUETIPOS TEXTILES
// Archivo: poc-simulador-3d/tests/t4TextileArchetypesBenchmark.ts
// ==============================================================================
// Evalúa tres arquetipos textiles sintéticos (TIER_3_ESTIMATED: fluido ligero,
// medio balanceado y estructurado rígido) más comportamiento asimétrico
// FACE_UP / FACE_DOWN (sin colapsar a un promedio) utilizando:
//   - Solver de referencia: H1B_VCYCLE_12SUB (HierarchicalXpbdClothSolver)
//   - Proxy de colisión candidato: Alt C (ALT_C_SDF_GRID_3D, Grid SDF 3D)
//   - Auditoría independiente de penetración: Ground Truth 96x108 BVH
// NO modifica producción, M00-M07, BD ni históricos T2/T2.1/T2.2/T3.
// ==============================================================================

import {
    CANONICAL_FEMALE_MEASUREMENTS_MM,
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
    SiFabricSpec,
    TelemetryExportBatch,
} from '../harness/types';
import { GeneratedClothMesh, generateScene0ClothMesh } from '../scene0/clothMeshGenerator';
import { computeSignedDihedralGradients } from '../solvers/clothSolvers';
import {
    HierarchicalXpbdClothSolver,
    HierarchicalXpbdConfig,
} from '../solvers/hierarchicalXpbdSolver';

export type T4ArchetypeId =
    | 'T4_ARCH1_FLUID_LIGHT'
    | 'T4_ARCH2_MEDIUM_BALANCED'
    | 'T4_ARCH3_STRUCTURED_STIFF'
    | 'T4_ARCH4_ASYM_FACE_UP_STIFF'
    | 'T4_ARCH4_ASYM_FACE_DOWN_STIFF'
    | 'T4_ARCH4_FORBIDDEN_AVG_CONTROL';

export type T4SceneId =
    | 'T4_SCENE0_HANGING_DRAPE'
    | 'T4_GATHERED_PLEAT_DRAPE'
    | 'T4_CANTILEVER_OVERHANG'
    | 'T4_CONCAVE_HAMMOCK'
    | 'T4_TORSO_FRONT_BODICE_ALT_C'
    | 'T4_TORSO_SHOULDER_CAPE_ALT_C'
    | 'T4_TORSO_SHOULDER_ANCHORED_ALT_C';

export const GATE1_COLLISION_BUDGET_MS = 6.0;
export const GATE1_FRAME_P95_BUDGET_MS = 25.0;

export interface T4TextileProfileSpec extends SiFabricSpec {
    readonly archetypeId: T4ArchetypeId;
    readonly archetypeGroup: 'FLUID_LIGHT' | 'MEDIUM_BALANCED' | 'STRUCTURED_STIFF' | 'ASYMMETRIC' | 'CONTROL_AVG';
    readonly evidenceQuality: 'TIER_3_ESTIMATED';
    readonly sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA';
    readonly nominalGsm: number;
    readonly warpWeftStiffnessNPerM: number;
    readonly shearStiffnessNPerM: number;
    readonly airDampingPerS: number;
    readonly conceptualReferenceNote: string;
}

export const T4_TEXTILE_PROFILES: readonly T4TextileProfileSpec[] = [
    {
        archetypeId: 'T4_ARCH1_FLUID_LIGHT',
        fabricId: 'T4_ARCH1_FLUID_LIGHT',
        archetypeGroup: 'FLUID_LIGHT',
        label: 'Arquetipo 1 · Fluido Ligero (TIER_3_ESTIMATED)',
        evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER',
        evidenceQuality: 'TIER_3_ESTIMATED',
        sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA',
        nominalGsm: 55,
        arealMassKgPerSqM: gsmToKgPerSqM(55),
        stretchStiffnessNPerM: 650,
        warpWeftStiffnessNPerM: 650,
        shearStiffnessNPerM: 90,
        bending: { mode: 'SYMMETRIC', rigidityNm: 2.5e-6 },
        airDampingPerS: 1.8,
        conceptualReferenceNote: 'Perfil sintético ligero de baja rigidez flexural (B=2.5 uN*m) y bajo cizallamiento (K_shear=90 N/m). No representa ensayo real.',
    },
    {
        archetypeId: 'T4_ARCH2_MEDIUM_BALANCED',
        fabricId: 'T4_ARCH2_MEDIUM_BALANCED',
        archetypeGroup: 'MEDIUM_BALANCED',
        label: 'Arquetipo 2 · Medio Balanceado (TIER_3_ESTIMATED)',
        evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER',
        evidenceQuality: 'TIER_3_ESTIMATED',
        sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA',
        nominalGsm: 160,
        arealMassKgPerSqM: gsmToKgPerSqM(160),
        stretchStiffnessNPerM: 1200,
        warpWeftStiffnessNPerM: 1200,
        shearStiffnessNPerM: 250,
        bending: { mode: 'SYMMETRIC', rigidityNm: 20e-6 },
        airDampingPerS: 1.8,
        conceptualReferenceNote: 'Perfil sintético medio de referencia T2/T3 (160 g/m^2, B=20 uN*m, K_shear=250 N/m). No representa ensayo real.',
    },
    {
        archetypeId: 'T4_ARCH3_STRUCTURED_STIFF',
        fabricId: 'T4_ARCH3_STRUCTURED_STIFF',
        archetypeGroup: 'STRUCTURED_STIFF',
        label: 'Arquetipo 3 · Estructurado Rígido (TIER_3_ESTIMATED)',
        evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER',
        evidenceQuality: 'TIER_3_ESTIMATED',
        sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA',
        nominalGsm: 310,
        arealMassKgPerSqM: gsmToKgPerSqM(310),
        stretchStiffnessNPerM: 2400,
        warpWeftStiffnessNPerM: 2400,
        shearStiffnessNPerM: 650,
        bending: { mode: 'SYMMETRIC', rigidityNm: 180e-6 },
        airDampingPerS: 1.8,
        conceptualReferenceNote: 'Perfil sintético estructurado de alta rigidez flexural (B=180 uN*m = 9x Medio, 72x Ligero). No representa ensayo real.',
    },
    {
        archetypeId: 'T4_ARCH4_ASYM_FACE_UP_STIFF',
        fabricId: 'T4_ARCH4_ASYM_FACE_UP_STIFF',
        archetypeGroup: 'ASYMMETRIC',
        label: 'Arquetipo 4A · Asimétrico FACE_UP Rígido (B+=180, B-=6 uN*m)',
        evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER',
        evidenceQuality: 'TIER_3_ESTIMATED',
        sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA',
        nominalGsm: 180,
        arealMassKgPerSqM: gsmToKgPerSqM(180),
        stretchStiffnessNPerM: 1300,
        warpWeftStiffnessNPerM: 1300,
        shearStiffnessNPerM: 280,
        bending: { mode: 'ASYMMETRIC', faceUpRigidityNm: 180e-6, faceDownRigidityNm: 6e-6 },
        airDampingPerS: 1.8,
        conceptualReferenceNote: 'Perfil sintético asimétrico cara superior rígida (FACE_UP C>=0: 180 uN*m) y envés flexible (FACE_DOWN C<0: 6 uN*m).',
    },
    {
        archetypeId: 'T4_ARCH4_ASYM_FACE_DOWN_STIFF',
        fabricId: 'T4_ARCH4_ASYM_FACE_DOWN_STIFF',
        archetypeGroup: 'ASYMMETRIC',
        label: 'Arquetipo 4B · Asimétrico FACE_DOWN Rígido (B+=6, B-=180 uN*m)',
        evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER',
        evidenceQuality: 'TIER_3_ESTIMATED',
        sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA',
        nominalGsm: 180,
        arealMassKgPerSqM: gsmToKgPerSqM(180),
        stretchStiffnessNPerM: 1300,
        warpWeftStiffnessNPerM: 1300,
        shearStiffnessNPerM: 280,
        bending: { mode: 'ASYMMETRIC', faceUpRigidityNm: 6e-6, faceDownRigidityNm: 180e-6 },
        airDampingPerS: 1.8,
        conceptualReferenceNote: 'Mismo tejido asimétrico volteado (FACE_UP C>=0: 6 uN*m, FACE_DOWN C<0: 180 uN*m) para validar inversión sin promedio.',
    },
    {
        archetypeId: 'T4_ARCH4_FORBIDDEN_AVG_CONTROL',
        fabricId: 'T4_ARCH4_FORBIDDEN_AVG_CONTROL',
        archetypeGroup: 'CONTROL_AVG',
        label: 'Control Negativo · Promedio Prohibido (B=93 uN*m)',
        evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER',
        evidenceQuality: 'TIER_3_ESTIMATED',
        sourceClassification: 'SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA',
        nominalGsm: 180,
        arealMassKgPerSqM: gsmToKgPerSqM(180),
        stretchStiffnessNPerM: 1300,
        warpWeftStiffnessNPerM: 1300,
        shearStiffnessNPerM: 280,
        bending: { mode: 'SYMMETRIC', rigidityNm: 93e-6 },
        airDampingPerS: 1.8,
        conceptualReferenceNote: 'Control matemático de promedio simétrico prohibido por V2.6 ((180+6)/2 = 93 uN*m) para contrastar respuesta real asimétrica.',
    },
];

export interface T4SceneDefinition {
    readonly sceneId: T4SceneId;
    readonly title: string;
    readonly description: string;
    readonly usesTorsoCollisionAltC: boolean;
    readonly gridSize: number;
    readonly widthM: number;
    readonly heightM: number;
    readonly totalFrames: number;
    readonly equilibriumStartFrame: number;
}

export const T4_SCENES: readonly T4SceneDefinition[] = [
    {
        sceneId: 'T4_SCENE0_HANGING_DRAPE',
        title: 'Escena T4-A1 · Paño Escena 0 Clásica (50 × 50 cm, 2 esquinas fijas, sin colisión)',
        description: 'Paño horizontal 50 × 50 cm (32 × 32) sujeto por las 2 esquinas superiores a ancho nominal durante 5.0 s bajo gravedad SI.',
        usesTorsoCollisionAltC: false,
        gridSize: 32,
        widthM: 0.5,
        heightM: 0.5,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
    {
        sceneId: 'T4_GATHERED_PLEAT_DRAPE',
        title: 'Escena T4-A2 · Cortina Fruncida al 82% (50 × 50 cm, 2 esquinas al 82% ancho, sin colisión)',
        description: 'Paño 50 × 50 cm (32 × 32) con las dos esquinas superiores fruncidas a 41 cm (82% del ancho) para inducir pliegues gravitatorios durante 3.0 s.',
        usesTorsoCollisionAltC: false,
        gridSize: 32,
        widthM: 0.5,
        heightM: 0.5,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
    {
        sceneId: 'T4_CANTILEVER_OVERHANG',
        title: 'Escena T4-B1 · Voladizo Cantilever Normal FACE_UP (16 × 20 cm, voladizo 13.3 cm, sin colisión)',
        description: 'Tira horizontal 16 × 20 cm (16 × 16, Δx=10.67 mm escala prenda) empotrada en r=0..5 (6.67 cm) con 13.33 cm libres en voladizo (normal +Y => C_bend >= 0 / FACE_UP) durante 3.0 s.',
        usesTorsoCollisionAltC: false,
        gridSize: 16,
        widthM: 0.16,
        heightM: 0.2,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
    {
        sceneId: 'T4_CONCAVE_HAMMOCK',
        title: 'Escena T4-B2 · Voladizo Invertido FACE_DOWN (16 × 20 cm, x -> -x, C_bend < 0)',
        description: 'Misma tira 16 × 20 cm (16 × 16) girada cara abajo al inicio (x -> -x manteniendo L_0 isométrico, normal -Y => C_bend < 0 / FACE_DOWN) durante 3.0 s para verificar inversión direccional en un mismo perfil.',
        usesTorsoCollisionAltC: false,
        gridSize: 16,
        widthM: 0.16,
        heightM: 0.2,
        totalFrames: 180,
        equilibriumStartFrame: 120,
    },
    {
        sceneId: 'T4_TORSO_FRONT_BODICE_ALT_C',
        title: 'Escena T4-C1 · Panel Frontal sobre Torso Canónico + Alt C SDF (36 × 72 cm, 2 tirantes)',
        description: 'Geometría idéntica a T3_FRONT_BODICE_PANEL sobre SDF 3D uniforme (12 mm) durante 5.0 s; mide conformado busto/sub-busto, pliegues, energía residual y penetración GT.',
        usesTorsoCollisionAltC: true,
        gridSize: 32,
        widthM: 0.36,
        heightM: 0.72,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
    {
        sceneId: 'T4_TORSO_SHOULDER_CAPE_ALT_C',
        title: 'Escena T4-C2 · Caída Libre sin Pines sobre Hombros + Alt C SDF (62 × 62 cm, geometría T3)',
        description: 'Geometría idéntica a T3_SHOULDER_DROP (0 pines) sobre SDF 3D uniforme (12 mm) durante 5.0 s; expone deslizamiento de tela rígida pesada sin anclaje en hombros.',
        usesTorsoCollisionAltC: true,
        gridSize: 32,
        widthM: 0.62,
        heightM: 0.62,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
    {
        sceneId: 'T4_TORSO_SHOULDER_ANCHORED_ALT_C',
        title: 'Escena T4-C3 · Capa Anclada en Hombros sobre Torso + Alt C SDF (62 × 62 cm, 2 puntos hombro)',
        description: 'Misma geometría 62 × 62 cm sobre hombros con 2 puntos de sujeción en crestas acromiales (r=15, c=9 y c=22) para comparar campana abierta rígida vs caída fluida sin caída al suelo.',
        usesTorsoCollisionAltC: true,
        gridSize: 32,
        widthM: 0.62,
        heightM: 0.62,
        totalFrames: 300,
        equilibriumStartFrame: 210,
    },
];

export interface T4DrapeMetrics {
    meanYM: number;
    lowestYM: number;
    centerBottomDropM: number;
    meanDropM: number;
    hemSpanXM: number;
    hemWaveAmplitudeMm: number;
    foldExtremaCount: number;
    meanAbsDihedralDeg: number;
    p95AbsDihedralDeg: number;
    faceUpHingesPct: number;
    faceDownHingesPct: number;
    tipDropM: number | null;
    tipHorizontalSpanM: number | null;
    tipReachRatioPct: number | null;
    tipAngleBelowHorizontalDeg: number | null;
    midSagDropM: number | null;
    subBustAirGapMm: number | null;
    perimeterMeanYM: number | null;
    perimeterMeanRadiusM: number | null;
    perimeterMaxRadiusM: number | null;
    radialLobeAmplitudeMm: number | null;
}

export interface T4EnergyAndStabilityMetrics {
    nanVertexCountTotal: number;
    equilibriumRmsVelocityMS: number;
    equilibriumMeanKineticEnergyJ: number;
    finalKineticEnergyJ: number;
    finalStretchEnergyJ: number;
    finalBendingEnergyJ: number;
    finalTotalMechanicalEnergyJ: number;
}

export interface T4RunSummary {
    runId: string;
    sceneId: T4SceneId;
    archetypeId: T4ArchetypeId;
    evidenceQuality: 'TIER_3_ESTIMATED';
    nominalGsm: number;
    warpWeftStiffnessNPerM: number;
    shearStiffnessNPerM: number;
    bendingSpec: BendingRigiditySpec;
    bendingIterationsPerSubstep: number;
    usesTorsoCollisionAltC: boolean;
    totalFrames: number;
    simDurationS: number;
    timingMs: {
        predictMean: number;
        hierarchyMean: number;
        stretchMean: number;
        bendingMean: number;
        physicsStepMean: number;
        physicsStepP95: number;
        collisionMean: number;
        collisionP95: number;
        totalStepMean: number;
        totalStepP95: number;
        estimatedComputeFps: number;
    };
    clothStrain: {
        transientMeanStretchPctMax: number;
        transientPeakStretchPct: number;
        transientPeakFrame: number;
        equilibriumMeanStretchPct: number;
        equilibriumMaxStretchPct: number;
    };
    penetrationGroundTruth: {
        evaluated: boolean;
        maxDepthAllFramesMm: number;
        equilibriumMaxDepthMm: number;
        equilibriumSevereFramesCount: number;
    };
    drape: T4DrapeMetrics;
    stabilityAndEnergy: T4EnergyAndStabilityMetrics;
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
    t4FunctionalPass: boolean;
    strictGate1AllChecksPass: boolean;
    classificationNote: string;
}

export interface T4SensitivityEntry {
    sweepGroup:
        | 'STRUCTURED_BENDING_CONVERGENCE_CANTILEVER'
        | 'STRUCTURED_BENDING_CONVERGENCE_BODICE'
        | 'BENDING_STIFFNESS_SWEEP_CANTILEVER'
        | 'AREAL_MASS_SWEEP_CANTILEVER'
        | 'SHEAR_STIFFNESS_SWEEP_HANGING'
        | 'MICRO_MESH_INSTABILITY_LIMIT_CHECK';
    label: string;
    sceneId: T4SceneId;
    gsm: number;
    warpWeftStiffnessNPerM: number;
    shearStiffnessNPerM: number;
    bendingMicroNm: number;
    bendingIterationsPerSubstep: number;
    totalStepMeanMs: number;
    physicsStepMeanMs: number;
    collisionMeanMs: number;
    transientPeakStretchPct: number;
    equilibriumMaxStretchPct: number;
    tipDropM: number | null;
    centerBottomDropM: number;
    subBustAirGapMm: number | null;
    hemWaveAmplitudeMm: number;
    foldExtremaCount: number;
    finalBendingEnergyJ: number;
    equilibriumRmsVelocityMS: number;
    nanVertexCountTotal: number;
}

export interface T4KeyframeSnapshot {
    frameIndex: number;
    simTimeS: number;
    positionsM: number[];
    groundTruthSignedDistancesMm: number[];
    maxStretchPct: number;
    meanStretchPct: number;
    gtMaxPenetrationMm: number;
    physicsStepMs: number;
    collisionMs: number;
}

export interface T4KeyframeBundle {
    generatedAtIso: string;
    torsoMesh: {
        positionsM: number[];
        vertexNormals: number[];
        indices: number[];
    };
    scenes: Record<T4SceneId, {
        sceneId: T4SceneId;
        title: string;
        gridSize: number;
        triangleIndices: number[];
        pinnedIndices: number[];
        runs: Partial<Record<T4ArchetypeId, {
            runId: string;
            label: string;
            keyframes: T4KeyframeSnapshot[];
        }>>;
    }>;
}

export interface T4ContrastEvaluation {
    sceneId: T4SceneId;
    monotonicityMetricName: string;
    fluidValue: number;
    mediumValue: number;
    structuredValue: number;
    strictMonotonicSeparationPass: boolean;
    relativeSpreadPct: number;
    notes: string;
}

export interface T4AsymmetryEvaluation {
    cantileverFaceUpStiffTipDropM: number;
    cantileverFaceDownStiffTipDropM: number;
    cantileverForbiddenAvgTipDropM: number;
    cantileverTipDropDiffMm: number;
    invertedFaceUpStiffTipDropM: number;
    invertedFaceDownStiffTipDropM: number;
    invertedTipDropDiffMm: number;
    singleProfileFaceFlipReversalMm: number;
    bodiceFaceUpStiffSubBustGapMm: number;
    bodiceFaceDownStiffSubBustGapMm: number;
    bodiceSubBustGapDiffMm: number;
    directionalSeparationPass: boolean;
    noAverageCollapsePass: boolean;
    notes: string;
}

export interface T4BenchmarkReport {
    generatedAtIso: string;
    referenceSolverId: string;
    collisionProxyId: 'ALT_C_SDF_GRID_3D';
    collisionParams: TorsoCollisionParams;
    referenceMeasurementsMm: typeof CANONICAL_FEMALE_MEASUREMENTS_MM;
    evidencePolicyNote: string;
    t3OpenFailuresNotice: string;
    profiles: T4TextileProfileSpec[];
    runs: T4RunSummary[];
    contrastChecks: T4ContrastEvaluation[];
    asymmetryCheck: T4AsymmetryEvaluation;
    sensitivitySweeps: T4SensitivityEntry[];
    overallT4Verdict: {
        t4TextileDifferentiationPass: boolean;
        t4AsymmetryDirectionalPass: boolean;
        t4StructuredConvergencePass: boolean;
        strictGate1CanBeDeclaredApproved: false;
        reasonGate1RemainsOpen: string;
    };
}

function round4(v: number): number {
    return Math.round(v * 10000) / 10000;
}

function percentile(values: readonly number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
}

function countNanCoords(arr: Float64Array): number {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) count++;
    }
    return count;
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

function computeElasticPotentialEnergies(
    mesh: GeneratedClothMesh,
    positionsM: Float64Array,
    config: HierarchicalXpbdConfig
): {
    stretchEnergyJ: number;
    bendingEnergyJ: number;
    meanAbsDihedralDeg: number;
    p95AbsDihedralDeg: number;
    faceUpHingesPct: number;
    faceDownHingesPct: number;
} {
    let stretchEnergyJ = 0;
    const dtDummy = 1;
    for (const edge of mesh.edges) {
        const kStretch = edge.kind === 'shear'
            ? config.shearStiffnessNPerM
            : config.warpWeftStiffnessNPerM;
        const kEdge = computeXpbdEdgeCompliance(
            kStretch,
            edge.restLengthM,
            edge.tributaryWidthM,
            dtDummy
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
    const absDegs: number[] = [];
    let faceUpCount = 0;
    let faceDownCount = 0;

    for (const hinge of mesh.hinges) {
        const g = computeSignedDihedralGradients(positionsM, hinge.v1, hinge.v2, hinge.v3, hinge.v4);
        if (!g.valid) continue;
        const cRad = g.phiSignedRad - hinge.restAngleRad;
        if (cRad >= 0) {
            faceUpCount++;
        } else {
            faceDownCount++;
        }
        absDegs.push((Math.abs(cRad) * 180) / Math.PI);

        const bDir = selectDirectionalBendingRigidityNm(config.bending, cRad);
        const kBend = computeXpbdBendingCompliance(
            bDir,
            hinge.hingeLengthM,
            hinge.combinedTriangleAreaM2,
            dtDummy
        ).discreteStiffnessNm;
        bendingEnergyJ += 0.5 * kBend * cRad * cRad;
    }

    const totalHinges = Math.max(1, faceUpCount + faceDownCount);
    const meanAbsDihedralDeg = absDegs.length > 0
        ? absDegs.reduce((a, b) => a + b, 0) / absDegs.length
        : 0;
    const p95AbsDihedralDeg = percentile(absDegs, 95);

    return {
        stretchEnergyJ,
        bendingEnergyJ,
        meanAbsDihedralDeg,
        p95AbsDihedralDeg,
        faceUpHingesPct: (faceUpCount / totalHinges) * 100,
        faceDownHingesPct: (faceDownCount / totalHinges) * 100,
    };
}

/**
 * Cuenta extremos significativos (crestas y valles) en una señal 1D con histéresis
 * mínima para no contar ruido numérico sub-milimétrico como pliegue textil.
 */
function countSignificantExtremaWithHysteresis(values: readonly number[], hysteresis: number): number {
    if (values.length < 3) return 0;
    let count = 0;
    let direction: 0 | 1 | -1 = 0;
    let extremum = values[0];

    for (let i = 1; i < values.length; i++) {
        const v = values[i];
        if (direction === 0) {
            if (v - extremum >= hysteresis) {
                direction = 1;
                extremum = v;
            } else if (extremum - v >= hysteresis) {
                direction = -1;
                extremum = v;
            }
        } else if (direction === 1) {
            if (v > extremum) {
                extremum = v;
            } else if (extremum - v >= hysteresis) {
                count++;
                direction = -1;
                extremum = v;
            }
        } else {
            if (v < extremum) {
                extremum = v;
            } else if (v - extremum >= hysteresis) {
                count++;
                direction = 1;
                extremum = v;
            }
        }
    }
    return count;
}

function measureBottomHemWaves(
    positionsM: Float64Array,
    gridSize: number,
    hysteresisMm: number = 1.5
): { hemSpanXM: number; waveAmplitudeMm: number; foldExtremaCount: number; lowestBottomRowYM: number } {
    const r = gridSize - 1;
    const xs: number[] = [];
    const zs: number[] = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let lowestY = Infinity;

    for (let c = 0; c < gridSize; c++) {
        const b = (r * gridSize + c) * 3;
        const x = positionsM[b];
        const y = positionsM[b + 1];
        const z = positionsM[b + 2];
        xs.push(x);
        zs.push(z);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < lowestY) lowestY = y;
    }

    // Regresión lineal z(x) = a*x + b para aislar ondulaciones locales de la inclinación global
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanZ = zs.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        num += (xs[i] - meanX) * (zs[i] - meanZ);
        den += (xs[i] - meanX) * (xs[i] - meanX);
    }
    const slope = den > 1e-12 ? num / den : 0;
    const intercept = meanZ - slope * meanX;
    const detrendedMm = zs.map((z, i) => (z - (slope * xs[i] + intercept)) * 1000);

    const minRes = Math.min(...detrendedMm);
    const maxRes = Math.max(...detrendedMm);
    return {
        hemSpanXM: maxX - minX,
        waveAmplitudeMm: maxRes - minRes,
        foldExtremaCount: countSignificantExtremaWithHysteresis(detrendedMm, hysteresisMm),
        lowestBottomRowYM: lowestY,
    };
}

function getCantileverClampEndRow(gridSize: number): number {
    return gridSize === 16 ? 5 : 3;
}

function buildClothForT4Scene(
    sceneDef: T4SceneDefinition,
    arealMassKgPerSqM: number
): GeneratedClothMesh {
    const { sceneId, gridSize, widthM, heightM } = sceneDef;
    switch (sceneId) {
        case 'T4_SCENE0_HANGING_DRAPE': {
            return generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM,
                heightM,
                initialHeightM: 1.0,
            });
        }
        case 'T4_GATHERED_PLEAT_DRAPE': {
            return generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
                widthM,
                heightM,
                initialHeightM: 1.0,
            });
        }
        case 'T4_CANTILEVER_OVERHANG':
        case 'T4_CONCAVE_HAMMOCK': {
            // Tira horizontal en XZ empotrada en r=0..clampEndRow (ej. 16x20 cm con r=0..5 -> 13.33 cm voladizo)
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
        case 'T4_TORSO_FRONT_BODICE_ALT_C': {
            // Idéntico a T3_FRONT_BODICE_PANEL (36 x 72 cm, +21° inicial, 2 tirantes)
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
        case 'T4_TORSO_SHOULDER_CAPE_ALT_C': {
            // Idéntico a T3_SHOULDER_DROP (62 x 62 cm, 0 pines, caída libre sobre hombros)
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
        case 'T4_TORSO_SHOULDER_ANCHORED_ALT_C': {
            // Misma malla 62 x 62 cm sobre hombros con 2 puntos de anclaje acromiales (r=15, c=9 y c=22)
            // para evitar el deslizamiento fuera del torso observado en 0-pines y comparar campana vs caída fluida.
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

function measureSceneSpecificDrape(
    sceneDef: T4SceneDefinition,
    mesh: GeneratedClothMesh,
    positionsM: Float64Array,
    config: HierarchicalXpbdConfig,
    gtSignedDistancesM: Float64Array | null
): T4DrapeMetrics {
    const g = mesh.gridSize;
    let sumY = 0;
    let sumDrop = 0;
    let lowestYM = Infinity;
    for (let i = 0; i < mesh.vertexCount; i++) {
        const y = positionsM[i * 3 + 1];
        sumY += y;
        sumDrop += mesh.restPositionsM[i * 3 + 1] - y;
        if (y < lowestYM) lowestYM = y;
    }
    const meanYM = sumY / mesh.vertexCount;
    const meanDropM = sumDrop / mesh.vertexCount;
    const centerBottomIdx = (g - 1) * g + Math.floor(g / 2);
    const centerBottomDropM = mesh.restPositionsM[centerBottomIdx * 3 + 1] - positionsM[centerBottomIdx * 3 + 1];

    const hemStats = measureBottomHemWaves(positionsM, g, sceneDef.sceneId === 'T4_CANTILEVER_OVERHANG' ? 1.0 : 1.5);
    const energyAndCurvature = computeElasticPotentialEnergies(mesh, positionsM, config);

    let tipDropM: number | null = null;
    let tipHorizontalSpanM: number | null = null;
    let tipReachRatioPct: number | null = null;
    let tipAngleBelowHorizontalDeg: number | null = null;
    let midSagDropM: number | null = null;
    let subBustAirGapMm: number | null = null;
    let perimeterMeanYM: number | null = null;
    let perimeterMeanRadiusM: number | null = null;
    let perimeterMaxRadiusM: number | null = null;
    let radialLobeAmplitudeMm: number | null = null;
    let foldExtremaCount = hemStats.foldExtremaCount;
    let waveAmplitudeMm = hemStats.waveAmplitudeMm;

    if (sceneDef.sceneId === 'T4_CANTILEVER_OVERHANG' || sceneDef.sceneId === 'T4_CONCAVE_HAMMOCK') {
        const clampR = getCantileverClampEndRow(g);
        const clampZ = mesh.restPositionsM[(clampR * g + Math.floor(g / 2)) * 3 + 2];
        const clampY = mesh.restPositionsM[(clampR * g + Math.floor(g / 2)) * 3 + 1];
        const overhangLenM = sceneDef.heightM - clampZ;

        let tipY = 0;
        let tipZ = 0;
        for (let c = 0; c < g; c++) {
            const b = ((g - 1) * g + c) * 3;
            tipY += positionsM[b + 1];
            tipZ += positionsM[b + 2];
        }
        tipY /= g;
        tipZ /= g;

        tipDropM = clampY - tipY;
        tipHorizontalSpanM = tipZ - clampZ;
        tipReachRatioPct = (tipHorizontalSpanM / Math.max(1e-9, overhangLenM)) * 100;
        tipAngleBelowHorizontalDeg = (Math.atan2(tipDropM, Math.max(1e-9, tipHorizontalSpanM)) * 180) / Math.PI;
    } else if (sceneDef.sceneId === 'T4_TORSO_FRONT_BODICE_ALT_C' && gtSignedDistancesM !== null) {
        let gapSum = 0;
        let gapCount = 0;
        for (let r = 10; r <= 22; r++) {
            for (let c = 8; c <= 23; c++) {
                gapSum += gtSignedDistancesM[r * g + c] * 1000;
                gapCount++;
            }
        }
        subBustAirGapMm = gapCount > 0 ? gapSum / gapCount : 0;
    } else if (sceneDef.sceneId === 'T4_TORSO_SHOULDER_CAPE_ALT_C' || sceneDef.sceneId === 'T4_TORSO_SHOULDER_ANCHORED_ALT_C') {
        const boundaryVerts: { angle: number; radiusM: number; yM: number }[] = [];
        for (let r = 0; r < g; r++) {
            for (let c = 0; c < g; c++) {
                if (r !== 0 && r !== g - 1 && c !== 0 && c !== g - 1) continue;
                const b = (r * g + c) * 3;
                const x = positionsM[b];
                const y = positionsM[b + 1];
                const z = positionsM[b + 2];
                boundaryVerts.push({
                    angle: Math.atan2(z, x),
                    radiusM: Math.hypot(x, z),
                    yM: y,
                });
            }
        }
        boundaryVerts.sort((a, b) => a.angle - b.angle);
        const radiiMm = boundaryVerts.map((v) => v.radiusM * 1000);
        const meanR = boundaryVerts.reduce((acc, v) => acc + v.radiusM, 0) / boundaryVerts.length;
        perimeterMeanRadiusM = meanR;
        perimeterMaxRadiusM = Math.max(...boundaryVerts.map((v) => v.radiusM));
        perimeterMeanYM = boundaryVerts.reduce((acc, v) => acc + v.yM, 0) / boundaryVerts.length;
        radialLobeAmplitudeMm = Math.max(...radiiMm) - Math.min(...radiiMm);
        waveAmplitudeMm = radialLobeAmplitudeMm;
        foldExtremaCount = countSignificantExtremaWithHysteresis(radiiMm, 3.0);
    }

    return {
        meanYM: round4(meanYM),
        lowestYM: round4(lowestYM),
        centerBottomDropM: round4(centerBottomDropM),
        meanDropM: round4(meanDropM),
        hemSpanXM: round4(hemStats.hemSpanXM),
        hemWaveAmplitudeMm: round4(waveAmplitudeMm),
        foldExtremaCount,
        meanAbsDihedralDeg: round4(energyAndCurvature.meanAbsDihedralDeg),
        p95AbsDihedralDeg: round4(energyAndCurvature.p95AbsDihedralDeg),
        faceUpHingesPct: round4(energyAndCurvature.faceUpHingesPct),
        faceDownHingesPct: round4(energyAndCurvature.faceDownHingesPct),
        tipDropM: tipDropM !== null ? round4(tipDropM) : null,
        tipHorizontalSpanM: tipHorizontalSpanM !== null ? round4(tipHorizontalSpanM) : null,
        tipReachRatioPct: tipReachRatioPct !== null ? round4(tipReachRatioPct) : null,
        tipAngleBelowHorizontalDeg: tipAngleBelowHorizontalDeg !== null ? round4(tipAngleBelowHorizontalDeg) : null,
        midSagDropM: midSagDropM !== null ? round4(midSagDropM) : null,
        subBustAirGapMm: subBustAirGapMm !== null ? round4(subBustAirGapMm) : null,
        perimeterMeanYM: perimeterMeanYM !== null ? round4(perimeterMeanYM) : null,
        perimeterMeanRadiusM: perimeterMeanRadiusM !== null ? round4(perimeterMeanRadiusM) : null,
        perimeterMaxRadiusM: perimeterMaxRadiusM !== null ? round4(perimeterMaxRadiusM) : null,
        radialLobeAmplitudeMm: radialLobeAmplitudeMm !== null ? round4(radialLobeAmplitudeMm) : null,
    };
}

function buildH1bConfigForProfile(
    variantId: string,
    profile: T4TextileProfileSpec,
    bendingIterationsPerSubstep: number = 1,
    dtFrameS: number = 1 / 60
): HierarchicalXpbdConfig {
    return {
        variantId,
        dtFrameS,
        substeps: 12,
        coarseStrides: [16, 8, 4, 2],
        coarseIterationsPerLevel: 3,
        fineStretchIterationsPerSubstep: 2,
        bidirectionalFineSweep: true,
        bendingIterationsPerSubstep,
        prolongationRelaxation: 1.0,
        coarseUnilateralOnly: true,
        coarseComplianceScale: 1.0,
        airDampingPerS: profile.airDampingPerS,
        warpWeftStiffnessNPerM: profile.warpWeftStiffnessNPerM,
        shearStiffnessNPerM: profile.shearStiffnessNPerM,
        bending: profile.bending,
    };
}

function executeSingleSimulation(params: {
    runId: string;
    sceneDef: T4SceneDefinition;
    profile: T4TextileProfileSpec;
    bendingIterationsPerSubstep?: number;
    collider: TorsoCollider | null;
    gtBvh: CompactTriangleBvh | null;
    collisionParams: TorsoCollisionParams;
    keyframeIndices?: ReadonlySet<number>;
}): {
    summary: T4RunSummary;
    batch: TelemetryExportBatch;
    keyframes: T4KeyframeSnapshot[];
} {
    const dtFrameS = 1 / 60;
    const bendingIters = params.bendingIterationsPerSubstep ?? 1;
    const config = buildH1bConfigForProfile(params.runId, params.profile, bendingIters, dtFrameS);
    const mesh = buildClothForT4Scene(params.sceneDef, params.profile.arealMassKgPerSqM);
    const solver = new HierarchicalXpbdClothSolver(mesh, config);
    // Aplicar deformación inicial isométrica sin alterar L_0 en restPositionsM
    if (params.sceneDef.sceneId === 'T4_GATHERED_PLEAT_DRAPE') {
        const g = mesh.gridSize;
        const ds = params.sceneDef.widthM / (g - 1);
        const targetSpan = 0.82 * params.sceneDef.widthM;
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
            for (let c = 0; c < g; c++) {
                xs[c] += shiftX;
            }
            return { xs, ys, span };
        };

        // Bisección sobre amplitud fuera del plano (Y) para obtener cuerda exacta al 82% con longitud de arco 100% preservada
        let lo = 0.0;
        let hi = (ds * (g - 1)) / (nHalfWaves * Math.PI) * 0.99;
        for (let iter = 0; iter < 30; iter++) {
            const mid = 0.5 * (lo + hi);
            const { span } = evalSpanForAmp(mid);
            if (span > targetSpan) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        const { xs: pleatX, ys: pleatY } = evalSpanForAmp(0.5 * (lo + hi));

        for (let r = 0; r < g; r++) {
            for (let c = 0; c < g; c++) {
                const idx = r * g + c;
                solver.positionsM[idx * 3] = pleatX[c];
                solver.positionsM[idx * 3 + 1] = mesh.restPositionsM[idx * 3 + 1] + pleatY[c];
                solver.predictedM[idx * 3] = solver.positionsM[idx * 3];
                solver.predictedM[idx * 3 + 1] = solver.positionsM[idx * 3 + 1];
            }
        }
    } else if (params.sceneDef.sceneId === 'T4_CONCAVE_HAMMOCK') {
        // Giro cara abajo manteniendo L_0 intacto: (x, 1.0, z) -> (-x, 1.0, z) invierte normal +Y -> -Y (C_bend < 0)
        for (let idx = 0; idx < mesh.vertexCount; idx++) {
            solver.positionsM[idx * 3] = -solver.positionsM[idx * 3];
            solver.predictedM[idx * 3] = solver.positionsM[idx * 3];
        }
    }
    const harness = new TelemetryHarness();

    const dummySignedDistancesM = new Float64Array(mesh.vertexCount).fill(0.1);
    const gtSignedDistancesM = params.sceneDef.usesTorsoCollisionAltC
        ? new Float64Array(mesh.vertexCount)
        : null;

    let predictSum = 0;
    let hierarchySum = 0;
    let stretchSum = 0;
    let bendingSum = 0;
    const physicsMsList: number[] = [];
    const collisionMsList: number[] = [];
    const totalMsList: number[] = [];

    let nanVertexCountTotal = 0;
    let transientMeanStretchPctMax = 0;
    let transientPeakStretchPct = 0;
    let transientPeakFrame = 0;
    let eqMeanStretchSum = 0;
    let eqMaxStretch = 0;
    let eqVelRmsSum = 0;
    let eqKinEnergySum = 0;
    let eqFramesCount = 0;
    let gtMaxDepthAllFramesMm = 0;
    let gtEqMaxDepthMm = 0;
    let gtEqSevereFramesCount = 0;

    const capturedKeyframes: T4KeyframeSnapshot[] = [];

    for (let frameIdx = 0; frameIdx < params.sceneDef.totalFrames; frameIdx++) {
        const simTimeS = (frameIdx + 1) * dtFrameS;
        harness.beginFrame({
            frameIndex: frameIdx,
            simTimeS,
            dtFrameS,
            substeps: config.substeps,
            solverModel: 'XPBD',
            fabricId: params.runId,
        });

        const col = params.collider;
        const prof = col !== null
            ? solver.stepFrameTimed((pred, pos, invM) => {
                col.resolveSubstepCollision(pred, pos, invM, params.collisionParams);
            }, 'before-fine-solve')
            : solver.stepFrameTimed();

        harness.recordPhaseMs('physicsStepMs', prof.totalMs);
        harness.recordPhaseMs('collisionMs', prof.collisionMs);
        harness.recordPhaseMs('renderMs', 0);

        predictSum += prof.predictMs;
        hierarchySum += prof.hierarchyMs;
        stretchSum += prof.stretchMs;
        bendingSum += prof.bendingMs;

        physicsMsList.push(prof.totalMs);
        collisionMsList.push(prof.collisionMs);
        totalMsList.push(prof.totalMs + prof.collisionMs);

        nanVertexCountTotal += Math.ceil(countNanCoords(solver.positionsM) / 3);

        if (gtSignedDistancesM !== null && params.gtBvh !== null) {
            for (let i = 0; i < mesh.vertexCount; i++) {
                const b = i * 3;
                gtSignedDistancesM[i] = params.gtBvh.queryClosestSigned(
                    solver.positionsM[b],
                    solver.positionsM[b + 1],
                    solver.positionsM[b + 2]
                ).signedDistanceM;
            }
        }

        const stretch = measureEdgeStretchStats(solver.positionsM, mesh.edges);
        const pen = measurePenetrationStats(
            gtSignedDistancesM ?? dummySignedDistancesM,
            DEFAULT_SEVERE_PENETRATION_THRESHOLD_M
        );

        harness.finalizeFrame({
            stretch,
            penetration: pen,
            vertexCount: mesh.vertexCount,
            triangleCount: mesh.triangleCount,
            renderMode: 'headless-dry-run',
        });

        if (stretch.meanStretchPct > transientMeanStretchPctMax) {
            transientMeanStretchPctMax = stretch.meanStretchPct;
        }
        if (stretch.maxStretchPct > transientPeakStretchPct) {
            transientPeakStretchPct = stretch.maxStretchPct;
            transientPeakFrame = frameIdx;
        }
        if (gtSignedDistancesM !== null && pen.maxPenetrationDepthMm > gtMaxDepthAllFramesMm) {
            gtMaxDepthAllFramesMm = pen.maxPenetrationDepthMm;
        }

        if (frameIdx >= params.sceneDef.equilibriumStartFrame) {
            eqFramesCount++;
            eqMeanStretchSum += stretch.meanStretchPct;
            if (stretch.maxStretchPct > eqMaxStretch) eqMaxStretch = stretch.maxStretchPct;
            const dyn = computeRmsVelocityAndKineticEnergy(
                solver.velocitiesMS,
                mesh.massesKg,
                mesh.inverseMassesPerKg
            );
            eqVelRmsSum += dyn.rmsVelMS;
            eqKinEnergySum += dyn.kineticEnergyJ;

            if (gtSignedDistancesM !== null) {
                if (pen.maxPenetrationDepthMm > gtEqMaxDepthMm) {
                    gtEqMaxDepthMm = pen.maxPenetrationDepthMm;
                }
                if (pen.penetrationCount > 0) {
                    gtEqSevereFramesCount++;
                }
            }
        }

        if (params.keyframeIndices?.has(frameIdx)) {
            capturedKeyframes.push({
                frameIndex: frameIdx,
                simTimeS: round4(simTimeS),
                positionsM: Array.from(solver.positionsM, round4),
                groundTruthSignedDistancesMm: gtSignedDistancesM
                    ? Array.from(gtSignedDistancesM, (d) => round4(d * 1000))
                    : [],
                maxStretchPct: round4(stretch.maxStretchPct),
                meanStretchPct: round4(stretch.meanStretchPct),
                gtMaxPenetrationMm: round4(pen.maxPenetrationDepthMm),
                physicsStepMs: round4(prof.totalMs),
                collisionMs: round4(prof.collisionMs),
            });
        }
    }

    const batch = harness.buildBatchExport();
    const nFrames = params.sceneDef.totalFrames;
    const eqDenom = Math.max(1, eqFramesCount);
    const physMean = physicsMsList.reduce((a, b) => a + b, 0) / nFrames;
    const physP95 = percentile(physicsMsList, 95);
    const colMean = collisionMsList.reduce((a, b) => a + b, 0) / nFrames;
    const colP95 = percentile(collisionMsList, 95);
    const totMean = totalMsList.reduce((a, b) => a + b, 0) / nFrames;
    const totP95 = percentile(totalMsList, 95);
    const eqMeanStretch = eqMeanStretchSum / eqDenom;
    const eqRmsVel = eqVelRmsSum / eqDenom;

    // Medir estado final en equilibrio
    if (gtSignedDistancesM !== null && params.gtBvh !== null) {
        for (let i = 0; i < mesh.vertexCount; i++) {
            const b = i * 3;
            gtSignedDistancesM[i] = params.gtBvh.queryClosestSigned(
                solver.positionsM[b],
                solver.positionsM[b + 1],
                solver.positionsM[b + 2]
            ).signedDistanceM;
        }
    }

    const drape = measureSceneSpecificDrape(
        params.sceneDef,
        mesh,
        solver.positionsM,
        config,
        gtSignedDistancesM
    );
    const finalDyn = computeRmsVelocityAndKineticEnergy(
        solver.velocitiesMS,
        mesh.massesKg,
        mesh.inverseMassesPerKg
    );
    const finalPot = computeElasticPotentialEnergies(mesh, solver.positionsM, config);

    const checks = {
        zeroNan: nanVertexCountTotal === 0,
        collisionBudgetMeanLe6ms: colMean <= GATE1_COLLISION_BUDGET_MS,
        totalStepBudgetMeanLe16ms: totMean <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
        totalStepBudgetP95Le25ms: totP95 <= GATE1_FRAME_P95_BUDGET_MS,
        zeroSustainedSeverePenetrationGt3mm: !params.sceneDef.usesTorsoCollisionAltC || (gtEqSevereFramesCount === 0 && gtEqMaxDepthMm <= 3.0),
        equilibriumMeanStretchLe2Pct: eqMeanStretch <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        equilibriumPeakStretchLe5Pct: eqMaxStretch <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        transientPeakStretchLe5Pct: transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        stableSettlingRmsVelLe008: eqRmsVel <= 0.08,
    };

    const t4FunctionalPass =
        checks.zeroNan
        && checks.collisionBudgetMeanLe6ms
        && checks.zeroSustainedSeverePenetrationGt3mm
        && checks.stableSettlingRmsVelLe008;
    const strictGate1AllChecksPass = Object.values(checks).every(Boolean);

    const classificationNote = strictGate1AllChecksPass
        ? 'PASS integral (estabilidad, colisión, cómputo y deformación dentro de umbrales).'
        : t4FunctionalPass
            ? `T4 funcional OK, pero FAIL en Gate 1 estricto por deformación/cómputo (${
                !checks.transientPeakStretchLe5Pct ? `pico transitorio ${round4(transientPeakStretchPct)}% > 5%` : ''
            }${!checks.totalStepBudgetMeanLe16ms ? ` totalMean ${round4(totMean)} ms > 16 ms` : ''}).`
            : 'FAIL en estabilidad/colisión.';

    return {
        summary: {
            runId: params.runId,
            sceneId: params.sceneDef.sceneId,
            archetypeId: params.profile.archetypeId,
            evidenceQuality: 'TIER_3_ESTIMATED',
            nominalGsm: params.profile.nominalGsm,
            warpWeftStiffnessNPerM: params.profile.warpWeftStiffnessNPerM,
            shearStiffnessNPerM: params.profile.shearStiffnessNPerM,
            bendingSpec: params.profile.bending,
            bendingIterationsPerSubstep: bendingIters,
            usesTorsoCollisionAltC: params.sceneDef.usesTorsoCollisionAltC,
            totalFrames: nFrames,
            simDurationS: round4(nFrames * dtFrameS),
            timingMs: {
                predictMean: round4(predictSum / nFrames),
                hierarchyMean: round4(hierarchySum / nFrames),
                stretchMean: round4(stretchSum / nFrames),
                bendingMean: round4(bendingSum / nFrames),
                physicsStepMean: round4(physMean),
                physicsStepP95: round4(physP95),
                collisionMean: round4(colMean),
                collisionP95: round4(colP95),
                totalStepMean: round4(totMean),
                totalStepP95: round4(totP95),
                estimatedComputeFps: round4(1000 / Math.max(0.001, totMean)),
            },
            clothStrain: {
                transientMeanStretchPctMax: round4(transientMeanStretchPctMax),
                transientPeakStretchPct: round4(transientPeakStretchPct),
                transientPeakFrame,
                equilibriumMeanStretchPct: round4(eqMeanStretch),
                equilibriumMaxStretchPct: round4(eqMaxStretch),
            },
            penetrationGroundTruth: {
                evaluated: params.sceneDef.usesTorsoCollisionAltC,
                maxDepthAllFramesMm: round4(gtMaxDepthAllFramesMm),
                equilibriumMaxDepthMm: round4(gtEqMaxDepthMm),
                equilibriumSevereFramesCount: gtEqSevereFramesCount,
            },
            drape,
            stabilityAndEnergy: {
                nanVertexCountTotal,
                equilibriumRmsVelocityMS: round4(eqRmsVel),
                equilibriumMeanKineticEnergyJ: round4(eqKinEnergySum / eqDenom),
                finalKineticEnergyJ: round4(finalDyn.kineticEnergyJ),
                finalStretchEnergyJ: round4(finalPot.stretchEnergyJ),
                finalBendingEnergyJ: round4(finalPot.bendingEnergyJ),
                finalTotalMechanicalEnergyJ: round4(finalDyn.kineticEnergyJ + finalPot.stretchEnergyJ + finalPot.bendingEnergyJ),
            },
            checks,
            t4FunctionalPass,
            strictGate1AllChecksPass,
            classificationNote: classificationNote.trim(),
        },
        batch,
        keyframes: capturedKeyframes,
    };
}

export function runT4TextileArchetypesBenchmarkSuite(): {
    report: T4BenchmarkReport;
    batches: Record<string, TelemetryExportBatch>;
    keyframes: T4KeyframeBundle;
} {
    const profileMap = new Map<T4ArchetypeId, T4TextileProfileSpec>(
        T4_TEXTILE_PROFILES.map((p) => [p.archetypeId, p])
    );
    const sceneMap = new Map<T4SceneId, T4SceneDefinition>(
        T4_SCENES.map((s) => [s.sceneId, s])
    );

    const collisionParams = DEFAULT_TORSO_COLLISION_PARAMS;
    const altCSdfCollider = createTorsoCollider('ALT_C_SDF_GRID_3D');
    const groundTruth = new ReferenceTorsoGroundTruth(96, 108);
    const gtBvh = new CompactTriangleBvh(groundTruth.mesh);

    // Calentamiento breve JIT (12 frames descartados) para estabilizar tiempos en V8
    const warmMesh = buildClothForT4Scene(sceneMap.get('T4_TORSO_FRONT_BODICE_ALT_C')!, gsmToKgPerSqM(160));
    const warmSolver = new HierarchicalXpbdClothSolver(
        warmMesh,
        buildH1bConfigForProfile('WARMUP', profileMap.get('T4_ARCH2_MEDIUM_BALANCED')!)
    );
    for (let w = 0; w < 12; w++) {
        warmSolver.stepFrameTimed((pred, pos, invM) => {
            altCSdfCollider.resolveSubstepCollision(pred, pos, invM, collisionParams);
        }, 'before-fine-solve');
    }

    const runs: T4RunSummary[] = [];
    const batches: Record<string, TelemetryExportBatch> = {};

    const kfScenes: T4KeyframeBundle['scenes'] = {
        T4_SCENE0_HANGING_DRAPE: {
            sceneId: 'T4_SCENE0_HANGING_DRAPE',
            title: sceneMap.get('T4_SCENE0_HANGING_DRAPE')!.title,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
        T4_GATHERED_PLEAT_DRAPE: {
            sceneId: 'T4_GATHERED_PLEAT_DRAPE',
            title: sceneMap.get('T4_GATHERED_PLEAT_DRAPE')!.title,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
        T4_CANTILEVER_OVERHANG: {
            sceneId: 'T4_CANTILEVER_OVERHANG',
            title: sceneMap.get('T4_CANTILEVER_OVERHANG')!.title,
            gridSize: 16,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
        T4_CONCAVE_HAMMOCK: {
            sceneId: 'T4_CONCAVE_HAMMOCK',
            title: sceneMap.get('T4_CONCAVE_HAMMOCK')!.title,
            gridSize: 16,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
        T4_TORSO_FRONT_BODICE_ALT_C: {
            sceneId: 'T4_TORSO_FRONT_BODICE_ALT_C',
            title: sceneMap.get('T4_TORSO_FRONT_BODICE_ALT_C')!.title,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
        T4_TORSO_SHOULDER_CAPE_ALT_C: {
            sceneId: 'T4_TORSO_SHOULDER_CAPE_ALT_C',
            title: sceneMap.get('T4_TORSO_SHOULDER_CAPE_ALT_C')!.title,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
        T4_TORSO_SHOULDER_ANCHORED_ALT_C: {
            sceneId: 'T4_TORSO_SHOULDER_ANCHORED_ALT_C',
            title: sceneMap.get('T4_TORSO_SHOULDER_ANCHORED_ALT_C')!.title,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {},
        },
    };

    const sceneMatrices: { sceneId: T4SceneId; archetypes: T4ArchetypeId[]; kfIndices: number[] }[] = [
        {
            sceneId: 'T4_SCENE0_HANGING_DRAPE',
            archetypes: [
                'T4_ARCH1_FLUID_LIGHT',
                'T4_ARCH2_MEDIUM_BALANCED',
                'T4_ARCH3_STRUCTURED_STIFF',
                'T4_ARCH4_ASYM_FACE_UP_STIFF',
                'T4_ARCH4_ASYM_FACE_DOWN_STIFF',
                'T4_ARCH4_FORBIDDEN_AVG_CONTROL',
            ],
            kfIndices: [0, 59, 149, 299],
        },
        {
            sceneId: 'T4_GATHERED_PLEAT_DRAPE',
            archetypes: [
                'T4_ARCH1_FLUID_LIGHT',
                'T4_ARCH2_MEDIUM_BALANCED',
                'T4_ARCH3_STRUCTURED_STIFF',
            ],
            kfIndices: [0, 59, 119, 179],
        },
        {
            sceneId: 'T4_CANTILEVER_OVERHANG',
            archetypes: [
                'T4_ARCH1_FLUID_LIGHT',
                'T4_ARCH2_MEDIUM_BALANCED',
                'T4_ARCH3_STRUCTURED_STIFF',
                'T4_ARCH4_ASYM_FACE_UP_STIFF',
                'T4_ARCH4_ASYM_FACE_DOWN_STIFF',
                'T4_ARCH4_FORBIDDEN_AVG_CONTROL',
            ],
            kfIndices: [0, 59, 119, 179],
        },
        {
            sceneId: 'T4_CONCAVE_HAMMOCK',
            archetypes: [
                'T4_ARCH4_ASYM_FACE_UP_STIFF',
                'T4_ARCH4_ASYM_FACE_DOWN_STIFF',
                'T4_ARCH4_FORBIDDEN_AVG_CONTROL',
            ],
            kfIndices: [0, 89, 179],
        },
        {
            sceneId: 'T4_TORSO_FRONT_BODICE_ALT_C',
            archetypes: [
                'T4_ARCH1_FLUID_LIGHT',
                'T4_ARCH2_MEDIUM_BALANCED',
                'T4_ARCH3_STRUCTURED_STIFF',
                'T4_ARCH4_ASYM_FACE_UP_STIFF',
                'T4_ARCH4_ASYM_FACE_DOWN_STIFF',
            ],
            kfIndices: [0, 59, 149, 299],
        },
        {
            sceneId: 'T4_TORSO_SHOULDER_CAPE_ALT_C',
            archetypes: [
                'T4_ARCH1_FLUID_LIGHT',
                'T4_ARCH2_MEDIUM_BALANCED',
                'T4_ARCH3_STRUCTURED_STIFF',
            ],
            kfIndices: [0, 59, 149, 299],
        },
        {
            sceneId: 'T4_TORSO_SHOULDER_ANCHORED_ALT_C',
            archetypes: [
                'T4_ARCH1_FLUID_LIGHT',
                'T4_ARCH2_MEDIUM_BALANCED',
                'T4_ARCH3_STRUCTURED_STIFF',
            ],
            kfIndices: [0, 59, 149, 299],
        },
    ];

    for (const block of sceneMatrices) {
        const sceneDef = sceneMap.get(block.sceneId)!;
        const kfSet = new Set<number>(block.kfIndices);
        const refMesh = buildClothForT4Scene(sceneDef, gsmToKgPerSqM(160));
        kfScenes[sceneDef.sceneId].triangleIndices = Array.from(refMesh.triangleIndices);
        kfScenes[sceneDef.sceneId].pinnedIndices = Array.from(refMesh.pinnedIndices);

        for (const archId of block.archetypes) {
            const profile = profileMap.get(archId)!;
            const runId = `${sceneDef.sceneId}__${archId}`;
            const res = executeSingleSimulation({
                runId,
                sceneDef,
                profile,
                collider: sceneDef.usesTorsoCollisionAltC ? altCSdfCollider : null,
                gtBvh: sceneDef.usesTorsoCollisionAltC ? gtBvh : null,
                collisionParams,
                keyframeIndices: kfSet,
            });
            runs.push(res.summary);
            batches[runId] = res.batch;
            kfScenes[sceneDef.sceneId].runs[archId] = {
                runId,
                label: profile.label,
                keyframes: res.keyframes,
            };
        }
    }

    // --------------------------------------------------------------------------
    // BLOQUE D: ANÁLISIS DE SENSIBILIDAD Y CONVERGENCIA DE BENDING
    // --------------------------------------------------------------------------
    const sensitivitySweeps: T4SensitivityEntry[] = [];
    const baseMedium = profileMap.get('T4_ARCH2_MEDIUM_BALANCED')!;
    const baseStructured = profileMap.get('T4_ARCH3_STRUCTURED_STIFF')!;
    const cantileverScene = sceneMap.get('T4_CANTILEVER_OVERHANG')!;
    const bodiceScene = sceneMap.get('T4_TORSO_FRONT_BODICE_ALT_C')!;
    const scene0 = sceneMap.get('T4_SCENE0_HANGING_DRAPE')!;

    const runSensitivity = (
        sweepGroup: T4SensitivityEntry['sweepGroup'],
        label: string,
        sceneDef: T4SceneDefinition,
        override: {
            gsm?: number;
            warpWeft?: number;
            shear?: number;
            bendingMicroNm: number;
            bendingIters?: number;
        }
    ): T4SensitivityEntry => {
        const gsm = override.gsm ?? baseMedium.nominalGsm;
        const warpWeft = override.warpWeft ?? baseMedium.warpWeftStiffnessNPerM;
        const shear = override.shear ?? baseMedium.shearStiffnessNPerM;
        const bendingIters = override.bendingIters ?? 1;
        const syntheticProfile: T4TextileProfileSpec = {
            ...baseMedium,
            nominalGsm: gsm,
            arealMassKgPerSqM: gsmToKgPerSqM(gsm),
            stretchStiffnessNPerM: warpWeft,
            warpWeftStiffnessNPerM: warpWeft,
            shearStiffnessNPerM: shear,
            bending: { mode: 'SYMMETRIC', rigidityNm: override.bendingMicroNm * 1e-6 },
        };
        const res = executeSingleSimulation({
            runId: `SENS_${sweepGroup}_${label}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            sceneDef,
            profile: syntheticProfile,
            bendingIterationsPerSubstep: bendingIters,
            collider: sceneDef.usesTorsoCollisionAltC ? altCSdfCollider : null,
            gtBvh: sceneDef.usesTorsoCollisionAltC ? gtBvh : null,
            collisionParams,
        });
        const s = res.summary;
        return {
            sweepGroup,
            label,
            sceneId: sceneDef.sceneId,
            gsm,
            warpWeftStiffnessNPerM: warpWeft,
            shearStiffnessNPerM: shear,
            bendingMicroNm: override.bendingMicroNm,
            bendingIterationsPerSubstep: bendingIters,
            totalStepMeanMs: s.timingMs.totalStepMean,
            physicsStepMeanMs: s.timingMs.physicsStepMean,
            collisionMeanMs: s.timingMs.collisionMean,
            transientPeakStretchPct: s.clothStrain.transientPeakStretchPct,
            equilibriumMaxStretchPct: s.clothStrain.equilibriumMaxStretchPct,
            tipDropM: s.drape.tipDropM,
            centerBottomDropM: s.drape.centerBottomDropM,
            subBustAirGapMm: s.drape.subBustAirGapMm,
            hemWaveAmplitudeMm: s.drape.hemWaveAmplitudeMm,
            foldExtremaCount: s.drape.foldExtremaCount,
            finalBendingEnergyJ: s.stabilityAndEnergy.finalBendingEnergyJ,
            equilibriumRmsVelocityMS: s.stabilityAndEnergy.equilibriumRmsVelocityMS,
            nanVertexCountTotal: s.stabilityAndEnergy.nanVertexCountTotal,
        };
    };

    // D1. Convergencia H1B en Estructurado (B=180 y B=350 uN*m) con 1 vs 2 vs 4 iters bending
    for (const bMicro of [180, 350]) {
        for (const bIter of [1, 2, 4]) {
            sensitivitySweeps.push(
                runSensitivity(
                    'STRUCTURED_BENDING_CONVERGENCE_CANTILEVER',
                    `B=${bMicro}uNm_iter=${bIter}`,
                    cantileverScene,
                    {
                        gsm: baseStructured.nominalGsm,
                        warpWeft: baseStructured.warpWeftStiffnessNPerM,
                        shear: baseStructured.shearStiffnessNPerM,
                        bendingMicroNm: bMicro,
                        bendingIters: bIter,
                    }
                )
            );
        }
    }

    // D2. Convergencia Estructurado sobre Torso Bodice SDF Alt C (1 vs 3 iters bending)
    for (const bIter of [1, 3]) {
        sensitivitySweeps.push(
            runSensitivity(
                'STRUCTURED_BENDING_CONVERGENCE_BODICE',
                `B=180uNm_iter=${bIter}`,
                bodiceScene,
                {
                    gsm: baseStructured.nominalGsm,
                    warpWeft: baseStructured.warpWeftStiffnessNPerM,
                    shear: baseStructured.shearStiffnessNPerM,
                    bendingMicroNm: 180,
                    bendingIters: bIter,
                }
            )
        );
    }

    // D3. Barrido de rigidez flexural B alrededor del Arquetipo Medio en cantilever
    for (const bMicro of [5, 20, 80, 180, 350]) {
        sensitivitySweeps.push(
            runSensitivity(
                'BENDING_STIFFNESS_SWEEP_CANTILEVER',
                `B=${bMicro}uNm_gsm160`,
                cantileverScene,
                { bendingMicroNm: bMicro }
            )
        );
    }

    // D4. Barrido de densidad superficial (gsm) con B=20 uN*m fijo en cantilever
    for (const gsm of [80, 160, 320]) {
        sensitivitySweeps.push(
            runSensitivity(
                'AREAL_MASS_SWEEP_CANTILEVER',
                `gsm=${gsm}_B=20uNm`,
                cantileverScene,
                { gsm, bendingMicroNm: 20 }
            )
        );
    }

    // D5. Barrido de rigidez de cizallamiento K_shear en Escena 0
    for (const kShear of [90, 250, 650]) {
        sensitivitySweeps.push(
            runSensitivity(
                'SHEAR_STIFFNESS_SWEEP_HANGING',
                `Kshear=${kShear}Nm_gsm160_B=20`,
                scene0,
                { shear: kShear, bendingMicroNm: 20 }
            )
        );
    }

    // D6. Registro explícito de límite micro-malla (Δx = 2.58 mm en 8x12 cm @ 32x32 con B=180 uN*m)
    const microCantileverScene: T4SceneDefinition = {
        ...cantileverScene,
        title: 'Micro-tira diagnóstico 8 x 12 cm (32 x 32, Δx = 2.58 mm)',
        gridSize: 32,
        widthM: 0.08,
        heightM: 0.12,
    };
    sensitivitySweeps.push(
        runSensitivity(
            'MICRO_MESH_INSTABILITY_LIMIT_CHECK',
            'Micro_8x12cm_32x32_dx2.58mm_B=180uNm',
            microCantileverScene,
            {
                gsm: baseStructured.nominalGsm,
                warpWeft: baseStructured.warpWeftStiffnessNPerM,
                shear: baseStructured.shearStiffnessNPerM,
                bendingMicroNm: 180,
                bendingIters: 1,
            }
        )
    );

    // --------------------------------------------------------------------------
    // EVALUACIÓN OBJETIVA DE CONTRASTE, ASIMETRÍA Y VEREDICTO T4
    // --------------------------------------------------------------------------
    const findRun = (sceneId: T4SceneId, archetypeId: T4ArchetypeId): T4RunSummary => {
        const hit = runs.find((r) => r.sceneId === sceneId && r.archetypeId === archetypeId);
        if (!hit) {
            throw new Error(`Falta corrida requerida: ${sceneId} / ${archetypeId}`);
        }
        return hit;
    };

    const cantileverArch1 = findRun('T4_CANTILEVER_OVERHANG', 'T4_ARCH1_FLUID_LIGHT');
    const cantileverArch2 = findRun('T4_CANTILEVER_OVERHANG', 'T4_ARCH2_MEDIUM_BALANCED');
    const cantileverArch3 = findRun('T4_CANTILEVER_OVERHANG', 'T4_ARCH3_STRUCTURED_STIFF');

    const bodiceArch1 = findRun('T4_TORSO_FRONT_BODICE_ALT_C', 'T4_ARCH1_FLUID_LIGHT');
    const bodiceArch2 = findRun('T4_TORSO_FRONT_BODICE_ALT_C', 'T4_ARCH2_MEDIUM_BALANCED');
    const bodiceArch3 = findRun('T4_TORSO_FRONT_BODICE_ALT_C', 'T4_ARCH3_STRUCTURED_STIFF');

    const capeAnch1 = findRun('T4_TORSO_SHOULDER_ANCHORED_ALT_C', 'T4_ARCH1_FLUID_LIGHT');
    const capeAnch2 = findRun('T4_TORSO_SHOULDER_ANCHORED_ALT_C', 'T4_ARCH2_MEDIUM_BALANCED');
    const capeAnch3 = findRun('T4_TORSO_SHOULDER_ANCHORED_ALT_C', 'T4_ARCH3_STRUCTURED_STIFF');

    const gathered1 = findRun('T4_GATHERED_PLEAT_DRAPE', 'T4_ARCH1_FLUID_LIGHT');
    const gathered2 = findRun('T4_GATHERED_PLEAT_DRAPE', 'T4_ARCH2_MEDIUM_BALANCED');
    const gathered3 = findRun('T4_GATHERED_PLEAT_DRAPE', 'T4_ARCH3_STRUCTURED_STIFF');

    const scene0Arch1 = findRun('T4_SCENE0_HANGING_DRAPE', 'T4_ARCH1_FLUID_LIGHT');
    const scene0Arch2 = findRun('T4_SCENE0_HANGING_DRAPE', 'T4_ARCH2_MEDIUM_BALANCED');
    const scene0Arch3 = findRun('T4_SCENE0_HANGING_DRAPE', 'T4_ARCH3_STRUCTURED_STIFF');

    const contrastChecks: T4ContrastEvaluation[] = [
        {
            sceneId: 'T4_CANTILEVER_OVERHANG',
            monotonicityMetricName: 'tipDropM (caída vertical de punta: Fluido > Medio > Estructurado)',
            fluidValue: cantileverArch1.drape.tipDropM!,
            mediumValue: cantileverArch2.drape.tipDropM!,
            structuredValue: cantileverArch3.drape.tipDropM!,
            strictMonotonicSeparationPass:
                cantileverArch1.drape.tipDropM! > cantileverArch2.drape.tipDropM!
                && cantileverArch2.drape.tipDropM! > cantileverArch3.drape.tipDropM!,
            relativeSpreadPct: round4(
                ((cantileverArch1.drape.tipDropM! - cantileverArch3.drape.tipDropM!)
                    / Math.max(1e-6, cantileverArch1.drape.tipDropM!)) * 100
            ),
            notes: 'Separación flexural pura a escala prenda (16 x 20 cm @ 16x16, voladizo 13.33 cm).',
        },
        {
            sceneId: 'T4_GATHERED_PLEAT_DRAPE',
            monotonicityMetricName: 'meanAbsDihedralDeg (curvatura de pliegues bajo frunce 82%: Fluido > Medio > Estructurado)',
            fluidValue: gathered1.drape.meanAbsDihedralDeg,
            mediumValue: gathered2.drape.meanAbsDihedralDeg,
            structuredValue: gathered3.drape.meanAbsDihedralDeg,
            strictMonotonicSeparationPass:
                gathered1.drape.meanAbsDihedralDeg > gathered2.drape.meanAbsDihedralDeg
                && gathered2.drape.meanAbsDihedralDeg > gathered3.drape.meanAbsDihedralDeg,
            relativeSpreadPct: round4(
                ((gathered1.drape.meanAbsDihedralDeg - gathered3.drape.meanAbsDihedralDeg)
                    / Math.max(1e-6, gathered1.drape.meanAbsDihedralDeg)) * 100
            ),
            notes: 'Pliegues verticales inducidos por frunce al 82%.',
        },
        {
            sceneId: 'T4_TORSO_FRONT_BODICE_ALT_C',
            monotonicityMetricName: 'subBustAirGapMm (puente/holgura sub-busto vs torso: Fluido < Medio < Estructurado)',
            fluidValue: bodiceArch1.drape.subBustAirGapMm!,
            mediumValue: bodiceArch2.drape.subBustAirGapMm!,
            structuredValue: bodiceArch3.drape.subBustAirGapMm!,
            strictMonotonicSeparationPass:
                bodiceArch1.drape.subBustAirGapMm! < bodiceArch2.drape.subBustAirGapMm!
                && bodiceArch2.drape.subBustAirGapMm! < bodiceArch3.drape.subBustAirGapMm!,
            relativeSpreadPct: round4(
                ((bodiceArch3.drape.subBustAirGapMm! - bodiceArch1.drape.subBustAirGapMm!)
                    / Math.max(1e-6, bodiceArch3.drape.subBustAirGapMm!)) * 100
            ),
            notes: 'Fluido se ciñe al hueco sub-mamario; estructurado puentea en campana rígida sobre busto y cintura.',
        },
        {
            sceneId: 'T4_TORSO_SHOULDER_ANCHORED_ALT_C',
            monotonicityMetricName: 'perimeterMeanRadiusM (radio campana anclada sobre hombros: Fluido < Medio < Estructurado)',
            fluidValue: capeAnch1.drape.perimeterMeanRadiusM!,
            mediumValue: capeAnch2.drape.perimeterMeanRadiusM!,
            structuredValue: capeAnch3.drape.perimeterMeanRadiusM!,
            strictMonotonicSeparationPass:
                capeAnch1.drape.perimeterMeanRadiusM! < capeAnch2.drape.perimeterMeanRadiusM!
                && capeAnch2.drape.perimeterMeanRadiusM! < capeAnch3.drape.perimeterMeanRadiusM!,
            relativeSpreadPct: round4(
                ((capeAnch3.drape.perimeterMeanRadiusM! - capeAnch1.drape.perimeterMeanRadiusM!)
                    / Math.max(1e-6, capeAnch3.drape.perimeterMeanRadiusM!)) * 100
            ),
            notes: 'Radio medio de caída alrededor del torso con sujeción acromial (2 puntos). En la versión sin pines (T4_TORSO_SHOULDER_CAPE_ALT_C) el estructurado desliza fuera por fricción μ=0.35.',
        },
        {
            sceneId: 'T4_SCENE0_HANGING_DRAPE',
            monotonicityMetricName: 'meanAbsDihedralDeg (curvatura diédrica de pliegues Escena 0: Fluido > Medio > Estructurado)',
            fluidValue: scene0Arch1.drape.meanAbsDihedralDeg,
            mediumValue: scene0Arch2.drape.meanAbsDihedralDeg,
            structuredValue: scene0Arch3.drape.meanAbsDihedralDeg,
            strictMonotonicSeparationPass:
                scene0Arch1.drape.meanAbsDihedralDeg > scene0Arch2.drape.meanAbsDihedralDeg
                && scene0Arch2.drape.meanAbsDihedralDeg > scene0Arch3.drape.meanAbsDihedralDeg,
            relativeSpreadPct: round4(
                ((scene0Arch1.drape.meanAbsDihedralDeg - scene0Arch3.drape.meanAbsDihedralDeg)
                    / Math.max(1e-6, scene0Arch1.drape.meanAbsDihedralDeg)) * 100
            ),
            notes: 'En Escena 0 vertical de 2 esquinas, la rigidez B reduce la curvatura residual.',
        },
    ];

    const cantUp = findRun('T4_CANTILEVER_OVERHANG', 'T4_ARCH4_ASYM_FACE_UP_STIFF');
    const cantDown = findRun('T4_CANTILEVER_OVERHANG', 'T4_ARCH4_ASYM_FACE_DOWN_STIFF');
    const cantAvg = findRun('T4_CANTILEVER_OVERHANG', 'T4_ARCH4_FORBIDDEN_AVG_CONTROL');

    const invUp = findRun('T4_CONCAVE_HAMMOCK', 'T4_ARCH4_ASYM_FACE_UP_STIFF');
    const invDown = findRun('T4_CONCAVE_HAMMOCK', 'T4_ARCH4_ASYM_FACE_DOWN_STIFF');

    const bodUp = findRun('T4_TORSO_FRONT_BODICE_ALT_C', 'T4_ARCH4_ASYM_FACE_UP_STIFF');
    const bodDown = findRun('T4_TORSO_FRONT_BODICE_ALT_C', 'T4_ARCH4_ASYM_FACE_DOWN_STIFF');

    const cantDiffMm = (cantDown.drape.tipDropM! - cantUp.drape.tipDropM!) * 1000;
    const invDiffMm = (invUp.drape.tipDropM! - invDown.drape.tipDropM!) * 1000;
    const singleFlipDiffMm = (invUp.drape.tipDropM! - cantUp.drape.tipDropM!) * 1000;
    const bodGapDiffMm = bodUp.drape.subBustAirGapMm! - bodDown.drape.subBustAirGapMm!;

    const noAverageCollapsePass =
        cantAvg.drape.tipDropM! > cantUp.drape.tipDropM!
        && cantAvg.drape.tipDropM! < cantDown.drape.tipDropM!;

    const directionalSeparationPass =
        cantDiffMm > 5.0
        && invDiffMm > 5.0
        && singleFlipDiffMm > 5.0
        && Math.abs(bodGapDiffMm) > 0.5
        && noAverageCollapsePass;

    const asymmetryCheck: T4AsymmetryEvaluation = {
        cantileverFaceUpStiffTipDropM: cantUp.drape.tipDropM!,
        cantileverFaceDownStiffTipDropM: cantDown.drape.tipDropM!,
        cantileverForbiddenAvgTipDropM: cantAvg.drape.tipDropM!,
        cantileverTipDropDiffMm: round4(cantDiffMm),
        invertedFaceUpStiffTipDropM: invUp.drape.tipDropM!,
        invertedFaceDownStiffTipDropM: invDown.drape.tipDropM!,
        invertedTipDropDiffMm: round4(invDiffMm),
        singleProfileFaceFlipReversalMm: round4(singleFlipDiffMm),
        bodiceFaceUpStiffSubBustGapMm: bodUp.drape.subBustAirGapMm!,
        bodiceFaceDownStiffSubBustGapMm: bodDown.drape.subBustAirGapMm!,
        bodiceSubBustGapDiffMm: round4(bodGapDiffMm),
        directionalSeparationPass,
        noAverageCollapsePass,
        notes: 'En cantilever normal (normal +Y, C>=0), FACE_UP_STIFF aplica B+=180 uN*m y cae menos que FACE_DOWN_STIFF (B+=6 uN*m). Al girar el tejido cara abajo (x -> -x, normal -Y => C<0), el mismo perfil FACE_UP_STIFF conmuta limpiamente a B-=6 uN*m e invierte exactamente la caída respecto a FACE_DOWN_STIFF (B-=180 uN*m). El control promedio (93 uN*m) queda estrictamente entre ambos.',
    };

    const conv180Iter1 = sensitivitySweeps.find(
        (s) => s.sweepGroup === 'STRUCTURED_BENDING_CONVERGENCE_CANTILEVER' && s.bendingMicroNm === 180 && s.bendingIterationsPerSubstep === 1
    )!;
    const conv180Iter4 = sensitivitySweeps.find(
        (s) => s.sweepGroup === 'STRUCTURED_BENDING_CONVERGENCE_CANTILEVER' && s.bendingMicroNm === 180 && s.bendingIterationsPerSubstep === 4
    )!;
    const convDiffPct = Math.abs(conv180Iter1.tipDropM! - conv180Iter4.tipDropM!) / Math.max(1e-6, conv180Iter4.tipDropM!) * 100;

    const allDiffPass = contrastChecks.every((c) => c.strictMonotonicSeparationPass);
    const structuredStablePass =
        cantileverArch3.stabilityAndEnergy.nanVertexCountTotal === 0
        && bodiceArch3.stabilityAndEnergy.nanVertexCountTotal === 0
        && capeAnch3.stabilityAndEnergy.nanVertexCountTotal === 0
        && capeAnch3.drape.perimeterMeanRadiusM! > capeAnch1.drape.perimeterMeanRadiusM!
        && bodiceArch3.drape.subBustAirGapMm! > bodiceArch1.drape.subBustAirGapMm!
        && convDiffPct <= 25.0;

    const report: T4BenchmarkReport = {
        generatedAtIso: new Date().toISOString(),
        referenceSolverId: 'H1B_VCYCLE_12SUB',
        collisionProxyId: 'ALT_C_SDF_GRID_3D',
        collisionParams,
        referenceMeasurementsMm: CANONICAL_FEMALE_MEASUREMENTS_MM,
        evidencePolicyNote:
            'TODOS los perfiles textiles de T4 están etiquetados como TIER_3_ESTIMATED / SYNTHETIC_CALIBRATION_PLACEHOLDER. No constituyen mediciones físicas reales ni validación textil de Etapa 3 (3A/3B/3C).',
        t3OpenFailuresNotice:
            'Los fallos de elongación/compresión local > 5% detectados en T3 (caída sin escote sobre cuello y pico transitorio de impacto en panel frontal) siguen ABIERTOS y Gate 1 NO puede declararse aprobado.',
        profiles: [...T4_TEXTILE_PROFILES],
        runs,
        contrastChecks,
        asymmetryCheck,
        sensitivitySweeps,
        overallT4Verdict: {
            t4TextileDifferentiationPass: allDiffPass,
            t4AsymmetryDirectionalPass: directionalSeparationPass,
            t4StructuredConvergencePass: structuredStablePass,
            strictGate1CanBeDeclaredApproved: false,
            reasonGate1RemainsOpen:
                'Pendiente de resolver picos locales >5% en T3/T4 sobre colisión corporal (ej. compresión transitoria en impacto y cuello sin escote) y pendiente T5/T6.',
        },
    };

    const keyframes: T4KeyframeBundle = {
        generatedAtIso: report.generatedAtIso,
        torsoMesh: {
            positionsM: Array.from(groundTruth.mesh.positionsM, round4),
            vertexNormals: Array.from(groundTruth.mesh.vertexNormals, round4),
            indices: Array.from(groundTruth.mesh.indices),
        },
        scenes: kfScenes,
    };

    return { report, batches, keyframes };
}

