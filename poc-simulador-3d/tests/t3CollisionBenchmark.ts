// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): BENCHMARK T3 COLISIÓN CORPORAL
// Archivo: poc-simulador-3d/tests/t3CollisionBenchmark.ts
// ==============================================================================
// Evalúa experimentalmente las tres alternativas de colisión corporal sobre
// idéntica geometría de torso (medidas DEFAULT_FEMALE_MEASUREMENTS), idénticas
// condiciones iniciales, idéntico solver de referencia H1B_VCYCLE_12SUB e
// idénticos parámetros físicos y de contacto/fricción.
//   - A: Malla refinada de torso + Spatial Hash 3D (con fallback BVH)
//   - B: Jerarquía analítica de 10 primitivas (2 cápsulas + 8 elipsoides)
//   - C: Grid SDF 3D uniforme con interpolación trilineal y gradiente analítico
// ==============================================================================

import {
    CANONICAL_FEMALE_MEASUREMENTS_MM,
    ReferenceTorsoGroundTruth,
} from '../collision/torsoBodyModel';
import {
    CANONICAL_TORSO_ANALYTIC_PRIMITIVES,
    CollisionAlternativeId,
    CompactTriangleBvh,
    createTorsoCollider,
    DEFAULT_TORSO_COLLISION_PARAMS,
    measureProxyAccuracyVsGroundTruth,
    TorsoColliderInitStats,
    TorsoCollisionParams,
} from '../collision/torsoCollisionSolvers';
import { gsmToKgPerSqM } from '../harness/siConversionAndParams';
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
import { GeneratedClothMesh, generateScene0ClothMesh } from '../scene0/clothMeshGenerator';
import {
    HierarchicalXpbdClothSolver,
    HierarchicalXpbdConfig,
} from '../solvers/hierarchicalXpbdSolver';

export type T3SceneId = 'T3_SHOULDER_DROP' | 'T3_FRONT_BODICE_PANEL';

export const GATE1_COLLISION_BUDGET_MS = 6.0;
export const GATE1_FRAME_P95_BUDGET_MS = 25.0;

export interface T3SceneDefinition {
    readonly sceneId: T3SceneId;
    readonly title: string;
    readonly description: string;
    readonly gridSize: number;
    readonly widthM: number;
    readonly heightM: number;
    readonly totalFrames: number;
    readonly equilibriumStartFrame: number;
}

export interface T3RunSummary {
    runId: string;
    sceneId: T3SceneId;
    alternativeId: CollisionAlternativeId;
    label: string;
    initStats: TorsoColliderInitStats;
    proxyVsGroundTruthStaticMm: {
        meanAbsErrorMm: number;
        maxAbsErrorMm: number;
        rmseMm: number;
    };
    gridSize: number;
    vertexCount: number;
    triangleCount: number;
    totalFrames: number;
    simDurationS: number;
    nanVertexCountTotal: number;
    timingMs: {
        collisionMean: number;
        collisionP95: number;
        collisionMax: number;
        physicsStepMean: number;
        physicsStepP95: number;
        totalStepMean: number;
        totalStepP95: number;
        collisionShareOfTotalPct: number;
    };
    clothPhysics: {
        transientMeanStretchPctMax: number;
        transientPeakStretchPct: number;
        transientPeakFrame: number;
        equilibriumMeanStretchPct: number;
        equilibriumMaxStretchPct: number;
        equilibriumRmsVelocityMS: number;
        minSignedDistanceInitialM: number;
    };
    penetrationGroundTruth: {
        maxDepthAllFramesMm: number;
        maxDepthAllFramesFrame: number;
        severeVertexFramesTotal: number;
        rawContactViolationFrames: number;
        equilibriumMaxDepthMm: number;
        equilibriumMeanSevereCount: number;
        equilibriumSevereFramesCount: number;
        equilibriumRawViolationVerticesMean: number;
    };
    penetrationProxySelfReported: {
        maxDepthAllFramesMm: number;
        equilibriumMaxDepthMm: number;
        equilibriumSevereFramesCount: number;
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
    };
    allGate1ChecksPass: boolean;
}

export interface T3KeyframeSnapshot {
    frameIndex: number;
    simTimeS: number;
    positionsM: number[];
    groundTruthSignedDistancesMm: number[];
    proxySignedDistancesMm: number[];
    maxStretchPct: number;
    gtMaxPenetrationMm: number;
    gtSevereCount: number;
    collisionMs: number;
    physicsStepMs: number;
}

export interface T3KeyframeBundle {
    generatedAtIso: string;
    torsoMesh: {
        positionsM: number[];
        vertexNormals: number[];
        indices: number[];
    };
    analyticPrimitives: typeof CANONICAL_TORSO_ANALYTIC_PRIMITIVES;
    scenes: Record<T3SceneId, {
        sceneId: T3SceneId;
        title: string;
        description: string;
        gridSize: number;
        triangleIndices: number[];
        pinnedIndices: number[];
        runs: Record<CollisionAlternativeId, {
            runId: string;
            label: string;
            keyframes: T3KeyframeSnapshot[];
        }>;
    }>;
}

export interface T3BenchmarkReport {
    generatedAtIso: string;
    referenceSolverId: string;
    referenceMeasurementsMm: typeof CANONICAL_FEMALE_MEASUREMENTS_MM;
    collisionParams: TorsoCollisionParams;
    thresholdsPreserved: {
        collisionMeanMsLimit: number;
        totalStepMeanMsLimit: number;
        totalStepP95MsLimit: number;
        severePenetrationDepthMm: number;
        sustainedSevereCountLimit: number;
        meanStretchPctLimit: number;
        peakStretchPctLimit: number;
        nanVertexCountLimit: number;
    };
    proxyAccuracyComparison: {
        alternativeId: CollisionAlternativeId;
        initMs: number;
        memoryFootprintBytes: number;
        meanAbsErrorMm: number;
        maxAbsErrorMm: number;
        rmseMm: number;
    }[];
    runs: T3RunSummary[];
    alternativeRollup: {
        alternativeId: CollisionAlternativeId;
        label: string;
        scenesPassedCount: number;
        scenesTotalCount: number;
        overallPass: boolean;
        worstCollisionMeanMs: number;
        worstTotalStepMeanMs: number;
        worstTotalStepP95Ms: number;
        worstGtEquilibriumPenetrationMm: number;
        worstGtGlobalPenetrationMm: number;
        worstPeakStretchPct: number;
    }[];
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

function createH1bReferenceConfig(dtFrameS: number = 1 / 60): HierarchicalXpbdConfig {
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
        airDampingPerS: 1.8,
        warpWeftStiffnessNPerM: 1200,
        shearStiffnessNPerM: 250,
        bending: { mode: 'SYMMETRIC', rigidityNm: 20e-6 },
    };
}

/**
 * Escena T3-A: Paño 62x62 cm (32x32) centrado sobre cuello/hombros sin pines,
 * cayendo libremente desde y = 0.918 m sobre cúpula cervical y hombros.
 */
function buildShoulderDropCloth(gridSize: number, arealMassKgPerSqM: number): GeneratedClothMesh {
    const mesh = generateScene0ClothMesh(gridSize, arealMassKgPerSqM, {
        widthM: 0.62,
        heightM: 0.62,
        initialHeightM: 0.918,
    });
    const offsetZ = -0.30; // Centra z in [-0.30, +0.32] sobre eje hombros/pecho
    for (let i = 0; i < mesh.vertexCount; i++) {
        mesh.restPositionsM[i * 3 + 2] += offsetZ;
        // Liberar pines de Escena 0: caída libre simétrica con fricción
        mesh.inverseMassesPerKg[i] = 1 / mesh.massesKg[i];
    }
    mesh.pinnedIndices.clear();
    return mesh;
}

/**
 * Escena T3-B: Panel frontal 36x72 cm (32x32) sujeto por dos puntos en línea de
 * hombro/clavícula e inclinado +28° hacia delante al inicio para garantizar
 * separación limpia en t = 0 antes de oscilar y apoyarse sobre busto, cintura y cadera.
 */
function buildFrontBodicePanelCloth(gridSize: number, arealMassKgPerSqM: number): GeneratedClothMesh {
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

    // En generateScene0ClothMesh, x = width, z = distancia desde r=0 (0..heightM), y = 0
    for (let i = 0; i < mesh.vertexCount; i++) {
        const s = mesh.restPositionsM[i * 3 + 2];
        mesh.restPositionsM[i * 3 + 1] = topY - s * cosTilt;
        mesh.restPositionsM[i * 3 + 2] = topZ + s * sinTilt;
        mesh.inverseMassesPerKg[i] = 1 / mesh.massesKg[i];
    }

    mesh.pinnedIndices.clear();
    // Tirantes anatómicos de hombro (~3.5 cm por lado: nodos c = 1..4 y gridSize-5..gridSize-2)
    const strapCols = [1, 2, 3, 4, gridSize - 5, gridSize - 4, gridSize - 3, gridSize - 2];
    for (const c of strapCols) {
        mesh.pinnedIndices.add(c);
        mesh.inverseMassesPerKg[c] = 0;
    }

    return mesh;
}

function buildClothForScene(sceneId: T3SceneId, gridSize: number, arealMass: number): GeneratedClothMesh {
    switch (sceneId) {
        case 'T3_SHOULDER_DROP':
            return buildShoulderDropCloth(gridSize, arealMass);
        case 'T3_FRONT_BODICE_PANEL':
            return buildFrontBodicePanelCloth(gridSize, arealMass);
    }
}

export const T3_SCENES: readonly T3SceneDefinition[] = [
    {
        sceneId: 'T3_SHOULDER_DROP',
        title: 'Escena T3-A · Caída Libre sobre Cuello y Hombros (0 pines)',
        description: 'Paño 62 × 62 cm (32 × 32) soltado a 3 cm sobre la cúpula cervical/clavículas, drapeando con fricción sin sujeción durante 5.0 s.',
        gridSize: 32,
        widthM: 0.62,
        heightM: 0.62,
        totalFrames: 300, // 5.0 s
        equilibriumStartFrame: 210, // [3.5 s, 5.0 s]
    },
    {
        sceneId: 'T3_FRONT_BODICE_PANEL',
        title: 'Escena T3-B · Panel Frontal sobre Busto, Cintura y Cadera (2 tirantes)',
        description: 'Panel 36 × 72 cm (32 × 32) sujeto por dos tirantes de hombro (~3.5 cm c/u) apoyándose sobre busto, cintura y cadera durante 5.0 s.',
        gridSize: 32,
        widthM: 0.36,
        heightM: 0.72,
        totalFrames: 300, // 5.0 s
        equilibriumStartFrame: 210, // [3.5 s, 5.0 s]
    },
];

const ALTERNATIVE_ORDER: readonly CollisionAlternativeId[] = [
    'ALT_A_MESH_SPATIAL_HASH',
    'ALT_B_CAPSULES_ELLIPSOIDS',
    'ALT_C_SDF_GRID_3D',
];

function countNanCoords(arr: Float64Array): number {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) count++;
    }
    return count;
}

function computeRmsVelocity(vel: Float64Array, invMass: Float64Array): number {
    let sqSum = 0;
    let activeCount = 0;
    for (let i = 0; i < invMass.length; i++) {
        if (invMass[i] === 0) continue;
        const b = i * 3;
        sqSum += vel[b] * vel[b] + vel[b + 1] * vel[b + 1] + vel[b + 2] * vel[b + 2];
        activeCount++;
    }
    return activeCount > 0 ? Math.sqrt(sqSum / activeCount) : 0;
}

export function runT3CollisionBenchmarkSuite(): {
    report: T3BenchmarkReport;
    batches: Record<string, TelemetryExportBatch>;
    keyframes: T3KeyframeBundle;
} {
    const arealMass = gsmToKgPerSqM(160);
    const dtFrameS = 1 / 60;
    const config = createH1bReferenceConfig(dtFrameS);
    const collisionParams = DEFAULT_TORSO_COLLISION_PARAMS;

    // Ground truth denso (96x108 = 20,736 triángulos) + BVH rápido solo para auditoría (fuera de medición)
    const groundTruth = new ReferenceTorsoGroundTruth(96, 108);
    const gtBvh = new CompactTriangleBvh(groundTruth.mesh);

    // Construir los 3 colisionadores una vez y medir precisión geométrica estática
    const colliders = {
        ALT_A_MESH_SPATIAL_HASH: createTorsoCollider('ALT_A_MESH_SPATIAL_HASH'),
        ALT_B_CAPSULES_ELLIPSOIDS: createTorsoCollider('ALT_B_CAPSULES_ELLIPSOIDS'),
        ALT_C_SDF_GRID_3D: createTorsoCollider('ALT_C_SDF_GRID_3D'),
    } as const;

    const proxyAccuracyMap = new Map<CollisionAlternativeId, {
        meanAbsErrorMm: number;
        maxAbsErrorMm: number;
        rmseMm: number;
    }>();

    for (const altId of ALTERNATIVE_ORDER) {
        const acc = measureProxyAccuracyVsGroundTruth(colliders[altId], groundTruth);
        proxyAccuracyMap.set(altId, {
            meanAbsErrorMm: round4(acc.meanAbsErrorMm),
            maxAbsErrorMm: round4(acc.maxAbsErrorMm),
            rmseMm: round4(acc.rmseMm),
        });
    }

    // Calentamiento breve JIT de los 3 colisionadores (15 frames descartados) para evitar sesgo frío en V8
    for (const altId of ALTERNATIVE_ORDER) {
        const warmMesh = buildClothForScene('T3_SHOULDER_DROP', 32, arealMass);
        const warmSolver = new HierarchicalXpbdClothSolver(warmMesh, config);
        const col = colliders[altId];
        for (let w = 0; w < 15; w++) {
            warmSolver.stepFrameTimed((pred, pos, invM) => {
                col.resolveSubstepCollision(pred, pos, invM, collisionParams);
            }, 'before-fine-solve');
        }
    }

    const runs: T3RunSummary[] = [];
    const batches: Record<string, TelemetryExportBatch> = {};
    const keyframeFrameIndices = new Set<number>([0, 29, 89, 179, 299]); // t=0.02, 0.5, 1.5, 3.0, 5.0 s

    const kfScenes: T3KeyframeBundle['scenes'] = {
        T3_SHOULDER_DROP: {
            sceneId: 'T3_SHOULDER_DROP',
            title: T3_SCENES[0].title,
            description: T3_SCENES[0].description,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {} as T3KeyframeBundle['scenes']['T3_SHOULDER_DROP']['runs'],
        },
        T3_FRONT_BODICE_PANEL: {
            sceneId: 'T3_FRONT_BODICE_PANEL',
            title: T3_SCENES[1].title,
            description: T3_SCENES[1].description,
            gridSize: 32,
            triangleIndices: [],
            pinnedIndices: [],
            runs: {} as T3KeyframeBundle['scenes']['T3_FRONT_BODICE_PANEL']['runs'],
        },
    };

    for (const sceneDef of T3_SCENES) {
        for (const altId of ALTERNATIVE_ORDER) {
            const collider = colliders[altId];
            const mesh = buildClothForScene(sceneDef.sceneId, sceneDef.gridSize, arealMass);
            const solver = new HierarchicalXpbdClothSolver(mesh, config);
            const harness = new TelemetryHarness();

            if (kfScenes[sceneDef.sceneId].triangleIndices.length === 0) {
                kfScenes[sceneDef.sceneId].triangleIndices = Array.from(mesh.triangleIndices);
                kfScenes[sceneDef.sceneId].pinnedIndices = Array.from(mesh.pinnedIndices);
            }

            const runId = `${sceneDef.sceneId}_${altId}`;
            const gtSignedDistancesM = new Float64Array(mesh.vertexCount);
            const proxySignedDistancesM = new Float64Array(mesh.vertexCount);

            // Verificar separación limpia inicial en t = 0
            for (let i = 0; i < mesh.vertexCount; i++) {
                const b = i * 3;
                gtSignedDistancesM[i] = gtBvh.queryClosestSigned(
                    mesh.restPositionsM[b],
                    mesh.restPositionsM[b + 1],
                    mesh.restPositionsM[b + 2]
                ).signedDistanceM;
            }
            const minSignedDistanceInitialM = Math.min(...Array.from(gtSignedDistancesM));

            const collisionMsList: number[] = [];
            const physicsStepMsList: number[] = [];
            const totalStepMsList: number[] = [];

            let nanVertexCountTotal = 0;
            let transientMeanStretchPctMax = 0;
            let transientPeakStretchPct = 0;
            let transientPeakFrame = 0;
            let eqMeanStretchSum = 0;
            let eqMaxStretch = 0;
            let eqVelRmsSum = 0;
            let eqFramesCount = 0;

            let gtMaxDepthAllFramesMm = 0;
            let gtMaxDepthAllFramesFrame = 0;
            let gtSevereVertexFramesTotal = 0;
            let gtRawContactViolationFrames = 0;
            let gtEqMaxDepthMm = 0;
            let gtEqSevereCountSum = 0;
            let gtEqSevereFramesCount = 0;
            let gtEqRawViolationSum = 0;

            let proxyMaxDepthAllFramesMm = 0;
            let proxyEqMaxDepthMm = 0;
            let proxyEqSevereFramesCount = 0;

            const capturedKeyframes: T3KeyframeSnapshot[] = [];

            for (let frameIdx = 0; frameIdx < sceneDef.totalFrames; frameIdx++) {
                const simTimeS = (frameIdx + 1) * dtFrameS;
                harness.beginFrame({
                    frameIndex: frameIdx,
                    simTimeS,
                    dtFrameS,
                    substeps: config.substeps,
                    solverModel: 'XPBD',
                    fabricId: runId,
                });

                const prof = solver.stepFrameTimed((pred, pos, invM) => {
                    collider.resolveSubstepCollision(pred, pos, invM, collisionParams);
                }, 'before-fine-solve');

                harness.recordPhaseMs('physicsStepMs', prof.totalMs);
                harness.recordPhaseMs('collisionMs', prof.collisionMs);
                harness.recordPhaseMs('renderMs', 0);

                collisionMsList.push(prof.collisionMs);
                physicsStepMsList.push(prof.totalMs);
                totalStepMsList.push(prof.totalMs + prof.collisionMs);

                const nanCount = Math.ceil(countNanCoords(solver.positionsM) / 3);
                nanVertexCountTotal += nanCount;

                // Auditoría geométrica independiente contra ground-truth 96x108 + proxy propio
                for (let i = 0; i < mesh.vertexCount; i++) {
                    const b = i * 3;
                    gtSignedDistancesM[i] = gtBvh.queryClosestSigned(
                        solver.positionsM[b],
                        solver.positionsM[b + 1],
                        solver.positionsM[b + 2]
                    ).signedDistanceM;
                }
                collider.evaluateProxySignedDistances(solver.positionsM, proxySignedDistancesM);

                const stretchStats = measureEdgeStretchStats(solver.positionsM, mesh.edges);
                const gtPen = measurePenetrationStats(gtSignedDistancesM, DEFAULT_SEVERE_PENETRATION_THRESHOLD_M);
                const proxyPen = measurePenetrationStats(proxySignedDistancesM, DEFAULT_SEVERE_PENETRATION_THRESHOLD_M);

                harness.finalizeFrame({
                    stretch: stretchStats,
                    penetration: gtPen,
                    vertexCount: mesh.vertexCount,
                    triangleCount: mesh.triangleCount,
                    renderMode: 'headless-dry-run',
                });

                if (stretchStats.meanStretchPct > transientMeanStretchPctMax) {
                    transientMeanStretchPctMax = stretchStats.meanStretchPct;
                }
                if (stretchStats.maxStretchPct > transientPeakStretchPct) {
                    transientPeakStretchPct = stretchStats.maxStretchPct;
                    transientPeakFrame = frameIdx;
                }

                if (gtPen.maxPenetrationDepthMm > gtMaxDepthAllFramesMm) {
                    gtMaxDepthAllFramesMm = gtPen.maxPenetrationDepthMm;
                    gtMaxDepthAllFramesFrame = frameIdx;
                }
                if (gtPen.rawContactViolationCount > 0) gtRawContactViolationFrames++;
                gtSevereVertexFramesTotal += gtPen.penetrationCount;

                if (proxyPen.maxPenetrationDepthMm > proxyMaxDepthAllFramesMm) {
                    proxyMaxDepthAllFramesMm = proxyPen.maxPenetrationDepthMm;
                }

                if (frameIdx >= sceneDef.equilibriumStartFrame) {
                    eqFramesCount++;
                    eqMeanStretchSum += stretchStats.meanStretchPct;
                    if (stretchStats.maxStretchPct > eqMaxStretch) eqMaxStretch = stretchStats.maxStretchPct;
                    eqVelRmsSum += computeRmsVelocity(solver.velocitiesMS, mesh.inverseMassesPerKg);

                    if (gtPen.maxPenetrationDepthMm > gtEqMaxDepthMm) gtEqMaxDepthMm = gtPen.maxPenetrationDepthMm;
                    gtEqSevereCountSum += gtPen.penetrationCount;
                    if (gtPen.penetrationCount > 0) gtEqSevereFramesCount++;
                    gtEqRawViolationSum += gtPen.rawContactViolationCount;

                    if (proxyPen.maxPenetrationDepthMm > proxyEqMaxDepthMm) proxyEqMaxDepthMm = proxyPen.maxPenetrationDepthMm;
                    if (proxyPen.penetrationCount > 0) proxyEqSevereFramesCount++;
                }

                if (keyframeFrameIndices.has(frameIdx)) {
                    capturedKeyframes.push({
                        frameIndex: frameIdx,
                        simTimeS: round4(simTimeS),
                        positionsM: Array.from(solver.positionsM, round4),
                        groundTruthSignedDistancesMm: Array.from(gtSignedDistancesM, (d) => round4(d * 1000)),
                        proxySignedDistancesMm: Array.from(proxySignedDistancesM, (d) => round4(d * 1000)),
                        maxStretchPct: round4(stretchStats.maxStretchPct),
                        gtMaxPenetrationMm: round4(gtPen.maxPenetrationDepthMm),
                        gtSevereCount: gtPen.penetrationCount,
                        collisionMs: round4(prof.collisionMs),
                        physicsStepMs: round4(prof.totalMs),
                    });
                }
            }

            batches[runId] = harness.buildBatchExport();
            kfScenes[sceneDef.sceneId].runs[altId] = {
                runId,
                label: collider.initStats.label,
                keyframes: capturedKeyframes,
            };

            const colMean = collisionMsList.reduce((a, b) => a + b, 0) / collisionMsList.length;
            const colP95 = percentile(collisionMsList, 95);
            const colMax = Math.max(...collisionMsList);
            const physMean = physicsStepMsList.reduce((a, b) => a + b, 0) / physicsStepMsList.length;
            const physP95 = percentile(physicsStepMsList, 95);
            const totMean = totalStepMsList.reduce((a, b) => a + b, 0) / totalStepMsList.length;
            const totP95 = percentile(totalStepMsList, 95);
            const eqMeanStretch = eqMeanStretchSum / Math.max(1, eqFramesCount);

            const checks = {
                zeroNan: nanVertexCountTotal === 0,
                collisionBudgetMeanLe6ms: colMean <= GATE1_COLLISION_BUDGET_MS,
                totalStepBudgetMeanLe16ms: totMean <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
                totalStepBudgetP95Le25ms: totP95 <= GATE1_FRAME_P95_BUDGET_MS,
                zeroSustainedSeverePenetrationGt3mm: gtEqSevereFramesCount === 0 && gtEqMaxDepthMm <= 3.0,
                equilibriumMeanStretchLe2Pct: eqMeanStretch <= GATE1_MEAN_STRETCH_PCT_LIMIT,
                equilibriumPeakStretchLe5Pct: eqMaxStretch <= GATE1_PEAK_STRETCH_PCT_LIMIT,
                transientPeakStretchLe5Pct: transientPeakStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
            };

            runs.push({
                runId,
                sceneId: sceneDef.sceneId,
                alternativeId: altId,
                label: collider.initStats.label,
                initStats: {
                    ...collider.initStats,
                    initMs: round4(collider.initStats.initMs),
                },
                proxyVsGroundTruthStaticMm: proxyAccuracyMap.get(altId)!,
                gridSize: sceneDef.gridSize,
                vertexCount: mesh.vertexCount,
                triangleCount: mesh.triangleCount,
                totalFrames: sceneDef.totalFrames,
                simDurationS: round4(sceneDef.totalFrames * dtFrameS),
                nanVertexCountTotal,
                timingMs: {
                    collisionMean: round4(colMean),
                    collisionP95: round4(colP95),
                    collisionMax: round4(colMax),
                    physicsStepMean: round4(physMean),
                    physicsStepP95: round4(physP95),
                    totalStepMean: round4(totMean),
                    totalStepP95: round4(totP95),
                    collisionShareOfTotalPct: round4((colMean / Math.max(1e-9, totMean)) * 100),
                },
                clothPhysics: {
                    transientMeanStretchPctMax: round4(transientMeanStretchPctMax),
                    transientPeakStretchPct: round4(transientPeakStretchPct),
                    transientPeakFrame,
                    equilibriumMeanStretchPct: round4(eqMeanStretch),
                    equilibriumMaxStretchPct: round4(eqMaxStretch),
                    equilibriumRmsVelocityMS: round4(eqVelRmsSum / Math.max(1, eqFramesCount)),
                    minSignedDistanceInitialM: round4(minSignedDistanceInitialM),
                },
                penetrationGroundTruth: {
                    maxDepthAllFramesMm: round4(gtMaxDepthAllFramesMm),
                    maxDepthAllFramesFrame: gtMaxDepthAllFramesFrame,
                    severeVertexFramesTotal: gtSevereVertexFramesTotal,
                    rawContactViolationFrames: gtRawContactViolationFrames,
                    equilibriumMaxDepthMm: round4(gtEqMaxDepthMm),
                    equilibriumMeanSevereCount: round4(gtEqSevereCountSum / Math.max(1, eqFramesCount)),
                    equilibriumSevereFramesCount: gtEqSevereFramesCount,
                    equilibriumRawViolationVerticesMean: round4(gtEqRawViolationSum / Math.max(1, eqFramesCount)),
                },
                penetrationProxySelfReported: {
                    maxDepthAllFramesMm: round4(proxyMaxDepthAllFramesMm),
                    equilibriumMaxDepthMm: round4(proxyEqMaxDepthMm),
                    equilibriumSevereFramesCount: proxyEqSevereFramesCount,
                },
                checks,
                allGate1ChecksPass: Object.values(checks).every(Boolean),
            });
        }
    }

    const proxyAccuracyComparison = ALTERNATIVE_ORDER.map((altId) => {
        const stats = colliders[altId].initStats;
        const acc = proxyAccuracyMap.get(altId)!;
        return {
            alternativeId: altId,
            initMs: round4(stats.initMs),
            memoryFootprintBytes: stats.memoryFootprintBytes,
            meanAbsErrorMm: acc.meanAbsErrorMm,
            maxAbsErrorMm: acc.maxAbsErrorMm,
            rmseMm: acc.rmseMm,
        };
    });

    const alternativeRollup = ALTERNATIVE_ORDER.map((altId) => {
        const altRuns = runs.filter((r) => r.alternativeId === altId);
        const passed = altRuns.filter((r) => r.allGate1ChecksPass).length;
        return {
            alternativeId: altId,
            label: colliders[altId].initStats.label,
            scenesPassedCount: passed,
            scenesTotalCount: altRuns.length,
            overallPass: passed === altRuns.length,
            worstCollisionMeanMs: round4(Math.max(...altRuns.map((r) => r.timingMs.collisionMean))),
            worstTotalStepMeanMs: round4(Math.max(...altRuns.map((r) => r.timingMs.totalStepMean))),
            worstTotalStepP95Ms: round4(Math.max(...altRuns.map((r) => r.timingMs.totalStepP95))),
            worstGtEquilibriumPenetrationMm: round4(Math.max(...altRuns.map((r) => r.penetrationGroundTruth.equilibriumMaxDepthMm))),
            worstGtGlobalPenetrationMm: round4(Math.max(...altRuns.map((r) => r.penetrationGroundTruth.maxDepthAllFramesMm))),
            worstPeakStretchPct: round4(Math.max(...altRuns.map((r) => r.clothPhysics.transientPeakStretchPct))),
        };
    });

    const report: T3BenchmarkReport = {
        generatedAtIso: new Date().toISOString(),
        referenceSolverId: 'H1B_VCYCLE_12SUB',
        referenceMeasurementsMm: CANONICAL_FEMALE_MEASUREMENTS_MM,
        collisionParams,
        thresholdsPreserved: {
            collisionMeanMsLimit: GATE1_COLLISION_BUDGET_MS,
            totalStepMeanMsLimit: GATE1_DESKTOP_COMPUTE_BUDGET_MS,
            totalStepP95MsLimit: GATE1_FRAME_P95_BUDGET_MS,
            severePenetrationDepthMm: DEFAULT_SEVERE_PENETRATION_THRESHOLD_M * 1000,
            sustainedSevereCountLimit: 0,
            meanStretchPctLimit: GATE1_MEAN_STRETCH_PCT_LIMIT,
            peakStretchPctLimit: GATE1_PEAK_STRETCH_PCT_LIMIT,
            nanVertexCountLimit: 0,
        },
        proxyAccuracyComparison,
        runs,
        alternativeRollup,
    };

    const keyframes: T3KeyframeBundle = {
        generatedAtIso: report.generatedAtIso,
        torsoMesh: {
            positionsM: Array.from(groundTruth.mesh.positionsM, round4),
            vertexNormals: Array.from(groundTruth.mesh.vertexNormals, round4),
            indices: Array.from(groundTruth.mesh.indices),
        },
        analyticPrimitives: CANONICAL_TORSO_ANALYTIC_PRIMITIVES,
        scenes: kfScenes,
    };

    return { report, batches, keyframes };
}
