// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EXPERIMENTO COMPARATIVO T2 (ESCENA 0)
// Archivo: poc-simulador-3d/tests/t2ExperimentRunner.ts
// ==============================================================================
// Ejecuta 4 simulaciones completas de 10 s (600 frames a 60 Hz):
//   - XPBD (16x16 y 32x32 nodos)
//   - PBD clásico (16x16 y 32x32 nodos)
// Bajo idénticas condiciones iniciales, gravedad SI y presupuesto de subpasos.
// NO modifica criterios PASS/FAIL ni oculta fallos si alguno ocurre.
// ==============================================================================

import { gsmToKgPerSqM } from '../harness/siConversionAndParams';
import {
    GATE1_MEAN_STRETCH_PCT_LIMIT,
    GATE1_PEAK_STRETCH_PCT_LIMIT,
    measureEdgeStretchStats,
    measurePenetrationStats,
    TelemetryHarness,
} from '../harness/telemetryHarness';
import { SolverModel, TelemetryExportBatch } from '../harness/types';
import { GeneratedClothMesh, generateScene0ClothMesh } from '../scene0/clothMeshGenerator';
import {
    ClothSimulationConfig,
    computeSignedDihedralGradients,
    Scene0ClothSolver,
} from '../solvers/clothSolvers';

export interface RunConditionSummary {
    runId: string;
    solverModel: SolverModel;
    gridSize: number;
    vertexCount: number;
    triangleCount: number;
    edgeCount: number;
    hingeCount: number;
    totalFrames: number;
    simDurationS: number;
    dtFrameS: number;
    substeps: number;
    iterationsPerSubstep: number;
    nanVertexCountTotal: number;
    physicsStepMsMean: number;
    physicsStepMsP95: number;
    transientPeakStretchPct: number;
    transientMeanStretchPctMax: number;
    equilibriumMaxStretchPct: number;
    equilibriumMeanStretchPct: number;
    structuralOnlyEquilibriumMaxStretchPct: number;
    centerBottomDropM: number;
    meanDropM: number;
    lowestYM: number;
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

export interface MeshInvarianceComparison {
    solverModel: SolverModel;
    centerBottomDrop16M: number;
    centerBottomDrop32M: number;
    centerBottomDropDiffPct: number;
    meanDrop16M: number;
    meanDrop32M: number;
    meanDropDiffPct: number;
    shapeRms3dM: number;
    shapeRmsDiffPctOfClothLength: number;
    invariancePassLe10Pct: boolean;
}

export interface KeyframeMeshSnapshot {
    frameIndex: number;
    simTimeS: number;
    positionsM: number[];
    maxStretchPct: number;
    meanStretchPct: number;
}

export interface T2RunArtifactBundle {
    summary: RunConditionSummary;
    telemetryBatch: TelemetryExportBatch;
    gridSize: number;
    triangleIndices: number[];
    restPositionsM: number[];
    finalPositionsM: Float64Array;
    keyframes: KeyframeMeshSnapshot[];
}

export interface T2CompleteExperimentResult {
    gradientVerificationMaxError: number;
    parametersNote: string;
    runs: T2RunArtifactBundle[];
    invariance: MeshInvarianceComparison[];
}

/**
 * Verifica numéricamente los gradientes analíticos diédricos frente a diferencias finitas centrales.
 */
export function verifyDihedralGradientsNumerically(): number {
    const pos = new Float64Array([
        -0.12, 0.98, 0.01,
        0.15, 1.02, -0.02,
        0.02, 1.07, -0.14,
        0.01, 0.91, 0.16,
    ]);
    const grad = computeSignedDihedralGradients(pos, 0, 1, 2, 3);
    if (!grad.valid) {
        throw new Error('La configuración de prueba diédrica debe ser válida');
    }

    const eps = 1e-6;
    const analytical = [
        grad.g1x, grad.g1y, grad.g1z,
        grad.g2x, grad.g2y, grad.g2z,
        grad.g3x, grad.g3y, grad.g3z,
        grad.g4x, grad.g4y, grad.g4z,
    ];

    let maxErr = 0;
    for (let k = 0; k < 12; k++) {
        const pPlus = new Float64Array(pos);
        const pMinus = new Float64Array(pos);
        pPlus[k] += eps;
        pMinus[k] -= eps;
        const fPlus = computeSignedDihedralGradients(pPlus, 0, 1, 2, 3).phiSignedRad;
        const fMinus = computeSignedDihedralGradients(pMinus, 0, 1, 2, 3).phiSignedRad;
        const numDeriv = (fPlus - fMinus) / (2 * eps);
        const err = Math.abs(analytical[k] - numDeriv);
        if (err > maxErr) {
            maxErr = err;
        }
    }
    if (maxErr > 1e-6) {
        throw new Error(`Error de gradiente diédrico excesivo: ${maxErr}`);
    }
    return maxErr;
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

function computeDropStats(mesh: GeneratedClothMesh, pos: Float64Array): {
    centerBottomDropM: number;
    meanDropM: number;
    lowestYM: number;
} {
    const restY = 1.0;
    const centerBottom = sampleMeshPointNormalized(pos, mesh.gridSize, 0.5, 1.0);
    const centerBottomDropM = restY - centerBottom[1];

    let sumY = 0;
    let lowestY = Infinity;
    for (let i = 0; i < mesh.vertexCount; i++) {
        const y = pos[i * 3 + 1];
        sumY += y;
        if (y < lowestY) lowestY = y;
    }
    const meanDropM = restY - (sumY / mesh.vertexCount);
    return {
        centerBottomDropM,
        meanDropM,
        lowestYM: lowestY,
    };
}

function compareMeshResolutionInvariance(
    solverModel: SolverModel,
    run16: T2RunArtifactBundle,
    run32: T2RunArtifactBundle
): MeshInvarianceComparison {
    const sampleGrid = 16;
    let sqSum = 0;
    let count = 0;
    for (let r = 0; r < sampleGrid; r++) {
        const v = r / (sampleGrid - 1);
        for (let c = 0; c < sampleGrid; c++) {
            const u = c / (sampleGrid - 1);
            const p16 = sampleMeshPointNormalized(run16.finalPositionsM, 16, u, v);
            const p32 = sampleMeshPointNormalized(run32.finalPositionsM, 32, u, v);
            const dx = p32[0] - p16[0];
            const dy = p32[1] - p16[1];
            const dz = p32[2] - p16[2];
            sqSum += dx * dx + dy * dy + dz * dz;
            count += 1;
        }
    }

    const shapeRms3dM = Math.sqrt(sqSum / count);
    const shapeRmsDiffPctOfClothLength = (shapeRms3dM / 0.5) * 100;

    const d16 = run16.summary.centerBottomDropM;
    const d32 = run32.summary.centerBottomDropM;
    const centerBottomDropDiffPct = (Math.abs(d32 - d16) / Math.max(1e-6, Math.max(d16, d32))) * 100;

    const m16 = run16.summary.meanDropM;
    const m32 = run32.summary.meanDropM;
    const meanDropDiffPct = (Math.abs(m32 - m16) / Math.max(1e-6, Math.max(m16, m32))) * 100;

    // Criterio exigente: las tres métricas de variación al duplicar resolución <= 10%
    const invariancePassLe10Pct =
        centerBottomDropDiffPct <= 10
        && meanDropDiffPct <= 10
        && shapeRmsDiffPctOfClothLength <= 10;

    return {
        solverModel,
        centerBottomDrop16M: Math.round(d16 * 10000) / 10000,
        centerBottomDrop32M: Math.round(d32 * 10000) / 10000,
        centerBottomDropDiffPct: Math.round(centerBottomDropDiffPct * 1000) / 1000,
        meanDrop16M: Math.round(m16 * 10000) / 10000,
        meanDrop32M: Math.round(m32 * 10000) / 10000,
        meanDropDiffPct: Math.round(meanDropDiffPct * 1000) / 1000,
        shapeRms3dM: Math.round(shapeRms3dM * 10000) / 10000,
        shapeRmsDiffPctOfClothLength: Math.round(shapeRmsDiffPctOfClothLength * 1000) / 1000,
        invariancePassLe10Pct,
    };
}

function executeSingleRun(
    solverModel: SolverModel,
    gridSize: number,
    config: ClothSimulationConfig,
    arealMassKgPerSqM: number,
    totalFrames: number
): T2RunArtifactBundle {
    const runId = `${solverModel.toLowerCase()}_${gridSize}x${gridSize}`;
    const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
        widthM: 0.5,
        heightM: 0.5,
        initialHeightM: 1.0,
    });
    const solver = new Scene0ClothSolver(mesh, config);
    const harness = new TelemetryHarness();
    const zeroSignedDistances = new Float64Array(mesh.vertexCount).fill(0.1);
    const structuralEdges = mesh.edges.filter((e) => e.kind !== 'shear');
    const keyframeTargets = new Set([0, 29, 119, 299, totalFrames - 1]);
    const keyframes: KeyframeMeshSnapshot[] = [];

    let transientPeakStretchPct = 0;
    let transientMeanStretchPctMax = 0;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        harness.beginFrame({
            frameIndex: frameIdx,
            simTimeS: (frameIdx + 1) * config.dtFrameS,
            dtFrameS: config.dtFrameS,
            substeps: config.substeps,
            solverModel,
            fabricId: 't2-scene0-woven-calibration-placeholder',
        });

        harness.measurePhase('physicsStepMs', () => {
            solver.stepFrame();
        });
        // Escena 0 no tiene colisionador corporal (T3); fase registrada explícitamente en 0 ms
        harness.recordPhaseMs('collisionMs', 0);
        // Render real WebGL medido por separado en navegador Chromium (run_t2_benchmark)
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
        }
        if (rec.meanStretchPct > transientMeanStretchPctMax) {
            transientMeanStretchPctMax = rec.meanStretchPct;
        }

        if (keyframeTargets.has(frameIdx)) {
            keyframes.push({
                frameIndex: frameIdx,
                simTimeS: rec.simTimeS,
                positionsM: Array.from(solver.positionsM),
                maxStretchPct: rec.maxStretchPct,
                meanStretchPct: rec.meanStretchPct,
            });
        }
    }

    const batch = harness.buildBatchExport();
    const lastFrame = batch.frames[batch.frames.length - 1];
    const structuralOnlyEq = measureEdgeStretchStats(solver.positionsM, structuralEdges);
    const dropStats = computeDropStats(mesh, solver.positionsM);
    const didNotLockOrFreeze = dropStats.centerBottomDropM >= 0.3;

    const summary: RunConditionSummary = {
        runId,
        solverModel,
        gridSize,
        vertexCount: mesh.vertexCount,
        triangleCount: mesh.triangleCount,
        edgeCount: mesh.edges.length,
        hingeCount: mesh.hinges.length,
        totalFrames,
        simDurationS: totalFrames * config.dtFrameS,
        dtFrameS: config.dtFrameS,
        substeps: config.substeps,
        iterationsPerSubstep: config.iterationsPerSubstep,
        nanVertexCountTotal: batch.summary.totalNanVertices,
        physicsStepMsMean: batch.summary.physicsStepMs.mean,
        physicsStepMsP95: batch.summary.physicsStepMs.p95,
        transientPeakStretchPct: Math.round(transientPeakStretchPct * 10000) / 10000,
        transientMeanStretchPctMax: Math.round(transientMeanStretchPctMax * 10000) / 10000,
        equilibriumMaxStretchPct: lastFrame.maxStretchPct,
        equilibriumMeanStretchPct: lastFrame.meanStretchPct,
        structuralOnlyEquilibriumMaxStretchPct: structuralOnlyEq.maxStretchPct,
        centerBottomDropM: Math.round(dropStats.centerBottomDropM * 10000) / 10000,
        meanDropM: Math.round(dropStats.meanDropM * 10000) / 10000,
        lowestYM: Math.round(dropStats.lowestYM * 10000) / 10000,
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
        telemetryBatch: batch,
        gridSize,
        triangleIndices: Array.from(mesh.triangleIndices),
        restPositionsM: Array.from(mesh.restPositionsM),
        finalPositionsM: new Float64Array(solver.positionsM),
        keyframes,
    };
}

export function runT2ComparativeBenchmark(): T2CompleteExperimentResult {
    const gradientVerificationMaxError = verifyDihedralGradientsNumerically();

    // Condiciones idénticas y presupuesto idéntico de integración para XPBD y PBD clásico:
    // 10 s simulados = 600 frames a dt = 1/60 s, 8 subpasos x 6 iteraciones = 48 pasos/frame
    const totalFrames = 600;
    const arealMassKgPerSqM = gsmToKgPerSqM(160); // 160 g/m^2 = 0.16 kg/m^2

    const baseShared = {
        dtFrameS: 1 / 60,
        substeps: 8,
        iterationsPerSubstep: 6,
        airDampingPerS: 1.8,
        // Parámetros SI de calibración Escena 0 (no corresponden a ficha comercial real):
        warpWeftStiffnessNPerM: 1200,
        shearStiffnessNPerM: 250,
        bending: {
            mode: 'SYMMETRIC' as const,
            rigidityNm: 2.0e-5, // 20 uN*m
        },
        // Parámetros adimensionales comparables para PBD clásico:
        pbdWarpWeftStiffness01: 0.99,
        pbdShearStiffness01: 0.85,
        pbdBendingStiffness01: 0.12,
    };

    const xpbdConfig: ClothSimulationConfig = { solverModel: 'XPBD', ...baseShared };
    const pbdConfig: ClothSimulationConfig = { solverModel: 'PBD', ...baseShared };

    const xpbd16 = executeSingleRun('XPBD', 16, xpbdConfig, arealMassKgPerSqM, totalFrames);
    const xpbd32 = executeSingleRun('XPBD', 32, xpbdConfig, arealMassKgPerSqM, totalFrames);
    const pbd16 = executeSingleRun('PBD', 16, pbdConfig, arealMassKgPerSqM, totalFrames);
    const pbd32 = executeSingleRun('PBD', 32, pbdConfig, arealMassKgPerSqM, totalFrames);

    const invariance = [
        compareMeshResolutionInvariance('XPBD', xpbd16, xpbd32),
        compareMeshResolutionInvariance('PBD', pbd16, pbd32),
    ];

    return {
        gradientVerificationMaxError,
        parametersNote:
            'Condiciones idénticas: 0.50x0.50 m, 160 g/m^2 (calibration-placeholder), g=-9.80665 m/s^2, '
            + '10 s (600 frames a 1/60 s), 8 subpasos x 6 iteraciones, damping 1.8/s. '
            + 'XPBD usa K_warp/weft=1200 N/m, K_shear=250 N/m, B=20 uN*m. '
            + 'PBD usa k_stretch=0.99, k_shear=0.85, k_bend=0.12 adimensionales.',
        runs: [xpbd16, xpbd32, pbd16, pbd32],
        invariance,
    };
}

