// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK T2.2 (XPBD JERÁRQUICO)
// Archivo: poc-simulador-3d/tests/t22HierarchicalBenchmark.ts
// ==============================================================================
// Evalúa la arquitectura XPBD acelerada por propagación jerárquica multinivel
// y disposición SoA frente a la arquitectura actual XPBD en Escena 0 (16x16 y 32x32,
// 10 s = 600 frames a 60 Hz), verificando flexión direccional FACE_UP/FACE_DOWN
// y aplicando estrictamente los umbrales originales sin modificaciones.
// ==============================================================================

import {
    gsmToKgPerSqM,
    selectDirectionalBendingRigidityNm,
} from '../harness/siConversionAndParams';
import {
    GATE1_DESKTOP_COMPUTE_BUDGET_MS,
    GATE1_MEAN_STRETCH_PCT_LIMIT,
    GATE1_PEAK_STRETCH_PCT_LIMIT,
    measureEdgeStretchStats,
    measurePenetrationStats,
    TelemetryHarness,
} from '../harness/telemetryHarness';
import { BendingRigiditySpec, TelemetryExportBatch } from '../harness/types';
import { GeneratedClothMesh, generateScene0ClothMesh } from '../scene0/clothMeshGenerator';
import {
    HierarchicalXpbdClothSolver,
    HierarchicalXpbdConfig,
} from '../solvers/hierarchicalXpbdSolver';

export interface T22VariantRunSummary {
    variantId: string;
    description: string;
    runId: string;
    gridSize: number;
    vertexCount: number;
    triangleCount: number;
    edgeCount: number;
    hingeCount: number;
    substeps: number;
    coarseStrides: readonly number[];
    coarseLevelsCount: number;
    coarseIterationsPerLevel: number;
    fineStretchIterationsPerSubstep: number;
    bendingIterationsPerSubstep: number;
    nanVertexCountTotal: number;
    cpuMs: {
        predictMean: number;
        hierarchyMean: number;
        stretchMean: number;
        bendingMean: number;
        commitMean: number;
        physicsStepMean: number;
        physicsStepP95: number;
        sharesPct: {
            predict: number;
            hierarchy: number;
            stretch: number;
            bending: number;
            commit: number;
        };
    };
    transientPeakStretchPct: number;
    transientPeakFrame: number;
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
    allSingleMeshChecksPass: boolean;
}

export interface T22VariantInvariance {
    variantId: string;
    centerBottomDropDiffPct: number;
    meanDropDiffPct: number;
    shapeRmsDiffPctOfClothLength: number;
    invariancePassLe10Pct: boolean;
    overallVariantPassAllGates32x32AndInvariance: boolean;
}

export interface DirectionalAsymmetricBendingCheck {
    passed: boolean;
    highRigidityMicroNm: number;
    lowRigidityMicroNm: number;
    faceUpRecoveryHighM: number;
    faceUpRecoveryLowM: number;
    faceDownRecoveryHighM: number;
    faceDownRecoveryLowM: number;
    ratioFaceUpHighOverLow: number;
    ratioFaceDownHighOverLow: number;
    note: string;
}

export interface T22BenchmarkReport {
    generatedAtIso: string;
    referenceConditionsPreserved: string;
    thresholdsPreserved: {
        meanStretchPctLimit: number;
        peakStretchPctLimit: number;
        invariancePctLimit: number;
        desktopPhysicsMeanMsLimit: number;
        nanVertexCountLimit: number;
    };
    directionalBendingValidation: DirectionalAsymmetricBendingCheck;
    runs: T22VariantRunSummary[];
    invariance: T22VariantInvariance[];
}

function round4(v: number): number {
    return Math.round(v * 10000) / 10000;
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

function computeInvariance(
    variantId: string,
    s16: T22VariantRunSummary,
    pos16: Float64Array,
    s32: T22VariantRunSummary,
    pos32: Float64Array,
    clothLenM: number = 0.5
): T22VariantInvariance {
    const centerDiffPct = (Math.abs(s16.centerBottomDropM - s32.centerBottomDropM)
        / Math.max(1e-6, Math.max(s16.centerBottomDropM, s32.centerBottomDropM))) * 100;
    const meanDiffPct = (Math.abs(s16.meanDropM - s32.meanDropM)
        / Math.max(1e-6, Math.max(s16.meanDropM, s32.meanDropM))) * 100;

    let sqSum = 0;
    const samples = 16;
    for (let sr = 0; sr < samples; sr++) {
        const v = sr / (samples - 1);
        for (let sc = 0; sc < samples; sc++) {
            const u = sc / (samples - 1);
            const p16 = sampleMeshPointNormalized(pos16, 16, u, v);
            const p32 = sampleMeshPointNormalized(pos32, 32, u, v);
            const dx = p16[0] - p32[0];
            const dy = p16[1] - p32[1];
            const dz = p16[2] - p32[2];
            sqSum += dx * dx + dy * dy + dz * dz;
        }
    }
    const rmsM = Math.sqrt(sqSum / (samples * samples));
    const shapeRmsPct = (rmsM / clothLenM) * 100;
    const invariancePassLe10Pct = centerDiffPct <= 10 && meanDiffPct <= 10 && shapeRmsPct <= 10;

    return {
        variantId,
        centerBottomDropDiffPct: round4(centerDiffPct),
        meanDropDiffPct: round4(meanDiffPct),
        shapeRmsDiffPctOfClothLength: round4(shapeRmsPct),
        invariancePassLe10Pct,
        overallVariantPassAllGates32x32AndInvariance: s32.allSingleMeshChecksPass && invariancePassLe10Pct,
    };
}

/**
 * Valida que el solver XPBD SoA jerárquico preserva rigidez direccional asimétrica
 * FACE_UP (phi >= 0) frente a FACE_DOWN (phi < 0) bajo idéntica magnitud de fuerza opuesta.
 */
function runDirectionalAsymmetricBendingCheck(): DirectionalAsymmetricBendingCheck {
    const asymmetricSpec: BendingRigiditySpec = {
        mode: 'ASYMMETRIC',
        faceUpRigidityNm: 200e-6,
        faceDownRigidityNm: 20e-6,
    };
    const bUp = selectDirectionalBendingRigidityNm(asymmetricSpec, 0.1);
    const bDown = selectDirectionalBendingRigidityNm(asymmetricSpec, -0.1);

    const evalWingHeightAfterOneFrame = (foldSign: 1 | -1, bendSpec: BendingRigiditySpec): number => {
        const mesh = generateScene0ClothMesh(3, gsmToKgPerSqM(160), {
            widthM: 0.2,
            heightM: 0.2,
            initialHeightM: 1.0,
        });
        mesh.inverseMassesPerKg[0] = 1 / mesh.massesKg[0];
        mesh.inverseMassesPerKg[2] = 1 / mesh.massesKg[2];
        mesh.inverseMassesPerKg[1] = 0;
        mesh.inverseMassesPerKg[4] = 0;
        mesh.inverseMassesPerKg[7] = 0;

        const solver = new HierarchicalXpbdClothSolver(mesh, {
            variantId: 'PURE_BEND_CHECK',
            dtFrameS: 1 / 60,
            substeps: 4,
            coarseStrides: [],
            coarseIterationsPerLevel: 0,
            fineStretchIterationsPerSubstep: 4,
            bidirectionalFineSweep: true,
            bendingIterationsPerSubstep: 1,
            prolongationRelaxation: 1.0,
            coarseUnilateralOnly: true,
            coarseComplianceScale: 1.0,
            airDampingPerS: 0,
            warpWeftStiffnessNPerM: 1200,
            shearStiffnessNPerM: 250,
            bending: bendSpec,
        });

        // Doblez simétrico alrededor de la columna central fija (c=1):
        // foldSign = -1 => alas hacia -Y (curvatura convexa en cara +Y => phi > 0 => FACE_UP)
        // foldSign = +1 => alas hacia +Y (curvatura cóncava en cara +Y => phi < 0 => FACE_DOWN)
        const dzLift = 0.04 * foldSign;
        for (let r = 0; r < 3; r++) {
            const vL = r * 3;
            const vR = r * 3 + 2;
            solver.positionsM[vL * 3 + 1] = 1.0 + dzLift;
            solver.positionsM[vR * 3 + 1] = 1.0 + dzLift;
            solver.predictedM[vL * 3 + 1] = 1.0 + dzLift;
            solver.predictedM[vR * 3 + 1] = 1.0 + dzLift;
        }
        solver.stepFrameTimed();
        return solver.positionsM[1] - 1.0;
    };

    // Restar línea base casi sin rigidez (1e-12 N*m) para cancelar exactamente gravedad y estiramiento
    const zeroBend: BendingRigiditySpec = { mode: 'SYMMETRIC', rigidityNm: 1e-12 };
    const specAsymUpStiff: BendingRigiditySpec = { mode: 'ASYMMETRIC', faceUpRigidityNm: 200e-6, faceDownRigidityNm: 20e-6 };
    const specAsymDownStiff: BendingRigiditySpec = { mode: 'ASYMMETRIC', faceUpRigidityNm: 20e-6, faceDownRigidityNm: 200e-6 };

    const yZeroConvex = evalWingHeightAfterOneFrame(-1, zeroBend);
    const yConvex200 = evalWingHeightAfterOneFrame(-1, specAsymUpStiff);
    const yConvex20 = evalWingHeightAfterOneFrame(-1, specAsymDownStiff);
    const elasticRecoveryUp200 = yConvex200 - yZeroConvex;
    const elasticRecoveryUp20 = yConvex20 - yZeroConvex;

    const yZeroConcave = evalWingHeightAfterOneFrame(1, zeroBend);
    const yConcave200 = evalWingHeightAfterOneFrame(1, specAsymDownStiff);
    const yConcave20 = evalWingHeightAfterOneFrame(1, specAsymUpStiff);
    const elasticRecoveryDown200 = yZeroConcave - yConcave200;
    const elasticRecoveryDown20 = yZeroConcave - yConcave20;

    const ratioFaceUp = elasticRecoveryUp200 / Math.max(1e-12, elasticRecoveryUp20);
    const ratioFaceDown = elasticRecoveryDown200 / Math.max(1e-12, elasticRecoveryDown20);
    const passed = bUp === 200e-6
        && bDown === 20e-6
        && elasticRecoveryUp200 > 0
        && elasticRecoveryDown200 > 0
        && ratioFaceUp > 3.0
        && ratioFaceDown > 3.0;

    return {
        passed,
        highRigidityMicroNm: 200,
        lowRigidityMicroNm: 20,
        faceUpRecoveryHighM: round4(elasticRecoveryUp200),
        faceUpRecoveryLowM: round4(elasticRecoveryUp20),
        faceDownRecoveryHighM: round4(elasticRecoveryDown200),
        faceDownRecoveryLowM: round4(elasticRecoveryDown20),
        ratioFaceUpHighOverLow: round4(ratioFaceUp),
        ratioFaceDownHighOverLow: round4(ratioFaceDown),
        note: passed
            ? `Flexión diédrica exacta con signo preserva asimetría FACE_UP/FACE_DOWN sin promediar (razón recuperación elástica B=200 vs B=20 µN·m: ${round4(ratioFaceUp)}x en FACE_UP y ${round4(ratioFaceDown)}x en FACE_DOWN).`
            : 'Fallo al validar asimetría direccional FACE_UP/FACE_DOWN.',
    };
}

function runVariantOnGrid(
    config: HierarchicalXpbdConfig,
    description: string,
    gridSize: number,
    arealMassKgPerSqM: number,
    totalFrames: number
): {
    summary: T22VariantRunSummary;
    batch: TelemetryExportBatch;
    finalPositionsM: Float64Array;
    mesh: GeneratedClothMesh;
} {
    const runId = `${config.variantId}_${gridSize}x${gridSize}`;
    const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
        widthM: 0.5,
        heightM: 0.5,
        initialHeightM: 1.0,
    });
    const solver = new HierarchicalXpbdClothSolver(mesh, config);
    const harness = new TelemetryHarness();
    const zeroSignedDistances = new Float64Array(mesh.vertexCount).fill(0.1);
    const nonAnchorEdges = mesh.edges.filter(
        (e) => mesh.inverseMassesPerKg[e.i] > 0 && mesh.inverseMassesPerKg[e.j] > 0
    );

    let sumPredictMs = 0;
    let sumHierarchyMs = 0;
    let sumStretchMs = 0;
    let sumBendingMs = 0;
    let sumCommitMs = 0;

    let transientPeakStretchPct = -1;
    let transientMeanStretchPctMax = 0;
    let transientPeakFrame = 0;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        harness.beginFrame({
            frameIndex: frameIdx,
            simTimeS: (frameIdx + 1) * config.dtFrameS,
            dtFrameS: config.dtFrameS,
            substeps: config.substeps,
            solverModel: 'XPBD',
            fabricId: config.variantId,
        });

        const prof = solver.stepFrameTimed();
        harness.recordPhaseMs('physicsStepMs', prof.totalMs);
        harness.recordPhaseMs('collisionMs', 0);
        harness.recordPhaseMs('renderMs', 0);

        sumPredictMs += prof.predictMs;
        sumHierarchyMs += prof.hierarchyMs;
        sumStretchMs += prof.stretchMs;
        sumBendingMs += prof.bendingMs;
        sumCommitMs += prof.commitMs;

        const stretch = measureEdgeStretchStats(solver.positionsM, mesh.edges);
        const penetration = measurePenetrationStats(zeroSignedDistances);

        if (stretch.maxStretchPct > transientPeakStretchPct) {
            transientPeakStretchPct = stretch.maxStretchPct;
            transientPeakFrame = frameIdx + 1;
        }
        if (stretch.meanStretchPct > transientMeanStretchPctMax) {
            transientMeanStretchPctMax = stretch.meanStretchPct;
        }

        harness.finalizeFrame({
            stretch,
            penetration,
            vertexCount: mesh.vertexCount,
            triangleCount: mesh.triangleCount,
            renderMode: 'headless-dry-run',
        });
    }

    const batch = harness.buildBatchExport();
    const lastFrame = batch.frames[batch.frames.length - 1];
    const interiorEq = measureEdgeStretchStats(solver.positionsM, nonAnchorEdges);

    let sumDrop = 0;
    for (let v = 0; v < mesh.vertexCount; v++) {
        sumDrop += mesh.restPositionsM[v * 3 + 1] - solver.positionsM[v * 3 + 1];
    }
    const meanDropM = sumDrop / mesh.vertexCount;
    const centerBottomIdx = (mesh.gridSize - 1) * mesh.gridSize + Math.floor(mesh.gridSize / 2);
    const centerBottomDropM = mesh.restPositionsM[centerBottomIdx * 3 + 1] - solver.positionsM[centerBottomIdx * 3 + 1];
    const didNotLockOrFreeze = centerBottomDropM >= 0.35;

    const physicsMean = batch.summary.physicsStepMs.mean;
    const totalPhaseSum = sumPredictMs + sumHierarchyMs + sumStretchMs + sumBendingMs + sumCommitMs;
    const phaseDenom = totalPhaseSum > 0 ? totalPhaseSum : 1;

    const checks = {
        zeroNan: batch.summary.totalNanVertices === 0,
        equilibriumMeanStretchLe2Pct: lastFrame.meanStretchPct <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        equilibriumPeakStretchLe5Pct: lastFrame.maxStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        transientMeanStretchLe2Pct: transientMeanStretchPctMax <= GATE1_MEAN_STRETCH_PCT_LIMIT,
        transientPeakStretchLe5Pct: transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
        withinDesktopPhysicsBudgetMean16ms: physicsMean <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
        lockingNonFreezingPass:
            didNotLockOrFreeze
            && lastFrame.maxStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT
            && transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
    };

    const allSingleMeshChecksPass =
        checks.zeroNan
        && checks.equilibriumMeanStretchLe2Pct
        && checks.equilibriumPeakStretchLe5Pct
        && checks.transientMeanStretchLe2Pct
        && checks.transientPeakStretchLe5Pct
        && checks.withinDesktopPhysicsBudgetMean16ms
        && checks.lockingNonFreezingPass;

    return {
        summary: {
            variantId: config.variantId,
            description,
            runId,
            gridSize,
            vertexCount: mesh.vertexCount,
            triangleCount: mesh.triangleCount,
            edgeCount: mesh.edges.length,
            hingeCount: mesh.hinges.length,
            substeps: config.substeps,
            coarseStrides: config.coarseStrides,
            coarseLevelsCount: solver.getCoarseLevelSummary().length,
            coarseIterationsPerLevel: config.coarseIterationsPerLevel,
            fineStretchIterationsPerSubstep: config.fineStretchIterationsPerSubstep,
            bendingIterationsPerSubstep: config.bendingIterationsPerSubstep,
            nanVertexCountTotal: batch.summary.totalNanVertices,
            cpuMs: {
                predictMean: round4(sumPredictMs / totalFrames),
                hierarchyMean: round4(sumHierarchyMs / totalFrames),
                stretchMean: round4(sumStretchMs / totalFrames),
                bendingMean: round4(sumBendingMs / totalFrames),
                commitMean: round4(sumCommitMs / totalFrames),
                physicsStepMean: round4(physicsMean),
                physicsStepP95: round4(batch.summary.physicsStepMs.p95),
                sharesPct: {
                    predict: round4((sumPredictMs / phaseDenom) * 100),
                    hierarchy: round4((sumHierarchyMs / phaseDenom) * 100),
                    stretch: round4((sumStretchMs / phaseDenom) * 100),
                    bending: round4((sumBendingMs / phaseDenom) * 100),
                    commit: round4((sumCommitMs / phaseDenom) * 100),
                },
            },
            transientPeakStretchPct: round4(transientPeakStretchPct),
            transientPeakFrame,
            transientMeanStretchPctMax: round4(transientMeanStretchPctMax),
            equilibriumMaxStretchPct: round4(lastFrame.maxStretchPct),
            equilibriumMeanStretchPct: round4(lastFrame.meanStretchPct),
            interiorNonAnchorEquilibriumMaxStretchPct: round4(interiorEq.maxStretchPct),
            centerBottomDropM: round4(centerBottomDropM),
            meanDropM: round4(meanDropM),
            didNotLockOrFreeze,
            checks,
            allSingleMeshChecksPass,
        },
        batch,
        finalPositionsM: new Float64Array(solver.positionsM),
        mesh,
    };
}

export function runT22BenchmarkSuite(): {
    report: T22BenchmarkReport;
    batches: Record<string, TelemetryExportBatch>;
} {
    const arealMass = gsmToKgPerSqM(160);
    const dtFrameS = 1 / 60;
    const totalFrames = 600; // 10.0 s exactos (T2 Escena 0 obligatoria)
    const commonPhysics = {
        dtFrameS,
        airDampingPerS: 1.8,
        warpWeftStiffnessNPerM: 1200,
        shearStiffnessNPerM: 250,
        bending: { mode: 'SYMMETRIC' as const, rigidityNm: 20e-6 },
    };

    const directionalBendingValidation = runDirectionalAsymmetricBendingCheck();

    const candidates: { config: HierarchicalXpbdConfig; description: string }[] = [
        {
            description: 'Arquitectura actual XPBD (8 sub x 6 stretch, 6 diédricos, sin jerarquía) en SoA',
            config: {
                ...commonPhysics,
                variantId: 'C0_CURRENT_SOA_8X6',
                substeps: 8,
                coarseStrides: [],
                coarseIterationsPerLevel: 0,
                fineStretchIterationsPerSubstep: 6,
                bidirectionalFineSweep: false,
                bendingIterationsPerSubstep: 6,
                prolongationRelaxation: 1.0,
                coarseUnilateralOnly: true,
                coarseComplianceScale: 1.0,
            },
        },
        {
            description: 'SoA sin jerarquía con 16 sub x 2 stretch bidireccional y 1 flexión diédrica exacta',
            config: {
                ...commonPhysics,
                variantId: 'C1_SOA_NOHIER_16X2',
                substeps: 16,
                coarseStrides: [],
                coarseIterationsPerLevel: 0,
                fineStretchIterationsPerSubstep: 2,
                bidirectionalFineSweep: true,
                bendingIterationsPerSubstep: 1,
                prolongationRelaxation: 1.0,
                coarseUnilateralOnly: true,
                coarseComplianceScale: 1.0,
            },
        },
        {
            description: 'XPBD Jerárquico V-cycle [16,8,4,2] (8 subpasos, 4 grueso, 4 fino bidir, 1 diédrico)',
            config: {
                ...commonPhysics,
                variantId: 'H1_VCYCLE_8SUB',
                substeps: 8,
                coarseStrides: [16, 8, 4, 2],
                coarseIterationsPerLevel: 4,
                fineStretchIterationsPerSubstep: 4,
                bidirectionalFineSweep: true,
                bendingIterationsPerSubstep: 1,
                prolongationRelaxation: 1.0,
                coarseUnilateralOnly: true,
                coarseComplianceScale: 1.0,
            },
        },
        {
            description: 'XPBD Jerárquico V-cycle [16,8,4,2] (12 subpasos, 3 grueso, 2 fino bidir, 1 diédrico)',
            config: {
                ...commonPhysics,
                variantId: 'H1B_VCYCLE_12SUB',
                substeps: 12,
                coarseStrides: [16, 8, 4, 2],
                coarseIterationsPerLevel: 3,
                fineStretchIterationsPerSubstep: 2,
                bidirectionalFineSweep: true,
                bendingIterationsPerSubstep: 1,
                prolongationRelaxation: 1.0,
                coarseUnilateralOnly: true,
                coarseComplianceScale: 1.0,
            },
        },
        {
            description: 'XPBD Jerárquico V-cycle [16,8,4,2] (16 subpasos, 4 grueso, 2 fino bidir, 1 diédrico)',
            config: {
                ...commonPhysics,
                variantId: 'H2_VCYCLE_16SUB',
                substeps: 16,
                coarseStrides: [16, 8, 4, 2],
                coarseIterationsPerLevel: 4,
                fineStretchIterationsPerSubstep: 2,
                bidirectionalFineSweep: true,
                bendingIterationsPerSubstep: 1,
                prolongationRelaxation: 1.0,
                coarseUnilateralOnly: true,
                coarseComplianceScale: 1.0,
            },
        },
        {
            description: 'XPBD Jerárquico V-cycle [16,8,4,2] (24 subpasos, 4 grueso, 2 fino bidir, 1 diédrico)',
            config: {
                ...commonPhysics,
                variantId: 'H3_VCYCLE_24SUB',
                substeps: 24,
                coarseStrides: [16, 8, 4, 2],
                coarseIterationsPerLevel: 4,
                fineStretchIterationsPerSubstep: 2,
                bidirectionalFineSweep: true,
                bendingIterationsPerSubstep: 1,
                prolongationRelaxation: 1.0,
                coarseUnilateralOnly: true,
                coarseComplianceScale: 1.0,
            },
        },
    ];

    const runs: T22VariantRunSummary[] = [];
    const invariance: T22VariantInvariance[] = [];
    const batches: Record<string, TelemetryExportBatch> = {};

    for (const candidate of candidates) {
        const res16 = runVariantOnGrid(candidate.config, candidate.description, 16, arealMass, totalFrames);
        const res32 = runVariantOnGrid(candidate.config, candidate.description, 32, arealMass, totalFrames);
        runs.push(res16.summary, res32.summary);
        invariance.push(
            computeInvariance(
                candidate.config.variantId,
                res16.summary,
                res16.finalPositionsM,
                res32.summary,
                res32.finalPositionsM
            )
        );
        batches[res16.summary.runId] = res16.batch;
        batches[res32.summary.runId] = res32.batch;
    }

    return {
        report: {
            generatedAtIso: new Date().toISOString(),
            referenceConditionsPreserved:
                'Escena 0 obligatoria: paño 0.50x0.50 m, 160 g/m^2, K_warp/weft=1200 N/m, K_shear=250 N/m, B=20 uN*m, g=-9.80665 m/s^2, damping=1.8 s^-1, 2 esquinas fijas, 600 frames a 60 Hz.',
            thresholdsPreserved: {
                meanStretchPctLimit: GATE1_MEAN_STRETCH_PCT_LIMIT,
                peakStretchPctLimit: GATE1_PEAK_STRETCH_PCT_LIMIT,
                invariancePctLimit: 10,
                desktopPhysicsMeanMsLimit: GATE1_DESKTOP_COMPUTE_BUDGET_MS,
                nanVertexCountLimit: 0,
            },
            directionalBendingValidation,
            runs,
            invariance,
        },
        batches,
    };
}
