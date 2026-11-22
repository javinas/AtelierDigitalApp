// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): TIPOS SI Y DE TELEMETRÍA
// Archivo: poc-simulador-3d/harness/types.ts
// ==============================================================================
// Define contratos estrictos en unidades SI y el formato JSON por frame.
// NO depende de M00-M07, M02, M05 ni src/components/mannequin3d/.
// ==============================================================================

export type SolverModel = 'XPBD' | 'PBD';
export type FaceSymmetryMode = 'SYMMETRIC' | 'ASYMMETRIC';
export type RenderMode = 'webgl' | 'headless-dry-run';
export type TelemetryPhase = 'physicsStepMs' | 'collisionMs' | 'renderMs';

export interface AsymmetricBendingSpec {
    mode: 'ASYMMETRIC';
    faceUpRigidityNm: number;   // B^(+) [N*m] cuando C_bend >= 0
    faceDownRigidityNm: number; // B^(-) [N*m] cuando C_bend < 0
}

export interface SymmetricBendingSpec {
    mode: 'SYMMETRIC';
    rigidityNm: number;         // B [N*m]
}

export type BendingRigiditySpec = SymmetricBendingSpec | AsymmetricBendingSpec;

export interface SiFabricSpec {
    fabricId: string;
    label: string;
    evidenceNote: 'TIER_3_ESTIMATED_CALIBRATION_PLACEHOLDER';
    arealMassKgPerSqM: number;       // rho_A [kg/m^2] = gsm * 1e-3
    stretchStiffnessNPerM: number;   // K_stretch [N/m]
    bending: BendingRigiditySpec;    // B [N*m] o par asimetrico (N*m)
}

export interface XpbdStepParams {
    solver: 'XPBD';
    dtFrameS: number;                // Delta t de frame [s], ej. 1/60
    substeps: number;                // N_sub >= 1
    iterationsPerSubstep: number;    // N_iter >= 1
}

export interface PbdBaselineParams {
    solver: 'PBD';
    dtFrameS: number;                // Delta t de frame [s]
    substeps: number;
    iterationsPerSubstep: number;
    stretchStiffness01: number;      // k_PBD in [0, 1] (adimensional)
    bendingStiffness01: number;      // k_bend_PBD in [0, 1] (adimensional)
}

export interface RestEdgeDescriptor {
    i: number;
    j: number;
    restLengthM: number;             // L_0 [m]
    tributaryWidthM: number;         // b_e [m]
}

export interface StretchMetrics {
    maxStretchPct: number;           // %
    meanStretchPct: number;          // %
    edgeCount: number;
    nanVertexCount: number;
}

export interface PenetrationMetrics {
    penetrationCount: number;        // vertices con signedDist < -thresholdM
    thresholdMm: number;             // umbral severo Gate 1 = 3.0 mm
    rawContactViolationCount: number;// vertices con signedDist < 0
    maxPenetrationDepthMm: number;   // >= 0 mm
}

export interface Gate1FrameChecks {
    zeroNan: boolean;
    withinDesktopPhysicsBudget: boolean; // physicsStepMs + collisionMs <= 16 ms
    stretchMeanWithin2Pct: boolean;
    stretchPeakWithin5Pct: boolean;
    zeroSeverePenetration: boolean;      // penetrationCount === 0
}

export interface FrameTelemetryRecord {
    schemaVersion: 'poc-telemetry-frame/1.0.0';
    frameIndex: number;
    simTimeS: number;
    dtFrameS: number;
    substepDtS: number;
    substeps: number;
    solverModel: SolverModel;
    fabricId: string;
    renderMode: RenderMode;
    vertexCount: number;
    triangleCount: number;
    physicsStepMs: number;
    collisionMs: number;
    renderMs: number;
    totalFrameComputeMs: number;
    estimatedFps: number;
    maxStretchPct: number;
    meanStretchPct: number;
    nanVertexCount: number;
    penetrationCount: number;
    penetrationThresholdMm: number;
    rawContactViolationCount: number;
    maxPenetrationDepthMm: number;
    checks: Gate1FrameChecks;
}

export interface MetricPercentileSummary {
    min: number;
    p50: number;
    p95: number;
    max: number;
    mean: number;
}

export interface TelemetryExportBatch {
    schemaVersion: 'poc-telemetry-batch/1.0.0';
    exportedAtIso: string;
    frameCount: number;
    solverModel: SolverModel;
    fabricId: string;
    summary: {
        physicsStepMs: MetricPercentileSummary;
        collisionMs: MetricPercentileSummary;
        renderMs: MetricPercentileSummary;
        maxStretchPct: MetricPercentileSummary;
        penetrationCount: MetricPercentileSummary;
        totalNanVertices: number;
    };
    frames: FrameTelemetryRecord[];
}

export interface HarnessClock {
    nowMs: () => number;
}

