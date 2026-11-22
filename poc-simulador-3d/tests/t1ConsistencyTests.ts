// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): PRUEBAS DE CONSISTENCIA T1
// Archivo: poc-simulador-3d/tests/t1ConsistencyTests.ts
// ==============================================================================
// Verifica conversiones SI, escalado de compliance XPBD vs. PBD, regla asimétrica
// sin promediado, detección de NaN/elongación/penetración y exportación JSON.
// NO ejecuta simulaciones físicas de T2-T6.
// ==============================================================================

import {
    astmD1388BendingFromCantileverCm,
    computePbdEffectiveStiffness,
    computeTriangleLumpedMasses,
    computeXpbdBendingCompliance,
    computeXpbdEdgeCompliance,
    gsmToKgPerSqM,
    kesBendingToSiNm,
    selectDirectionalBendingRigidityNm,
} from '../harness/siConversionAndParams';
import {
    measureEdgeStretchStats,
    measurePenetrationStats,
    TelemetryHarness,
} from '../harness/telemetryHarness';
import { BendingRigiditySpec, RestEdgeDescriptor } from '../harness/types';

export interface TestCaseResult {
    name: string;
    passed: boolean;
    details: string;
}

function assertNear(actual: number, expected: number, relTol: number, label: string): void {
    const scale = Math.max(1, Math.abs(expected));
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > relTol * scale) {
        throw new Error(`${label}: esperado ${expected}, obtenido ${actual}`);
    }
}

function assertThrows(fn: () => unknown, label: string): void {
    let threw = false;
    try {
        fn();
    } catch {
        threw = true;
    }
    if (!threw) {
        throw new Error(`${label}: debía lanzar excepción pero completó sin error`);
    }
}

export function runAllT1ConsistencyTests(): { status: 'ALL_PASSED'; total: number; results: TestCaseResult[] } {
    const results: TestCaseResult[] = [];

    const runCase = (name: string, fn: () => string) => {
        const details = fn();
        results.push({ name, passed: true, details });
    };

    runCase('1. Conversiones exactas SI (GSM, KES-FB2, ASTM D1388)', () => {
        assertNear(gsmToKgPerSqM(150), 0.15, 1e-12, 'gsmToKgPerSqM');
        const kes = kesBendingToSiNm(0.1);
        assertNear(kes.rigidityNm, 9.80665e-6, 1e-12, 'kes.rigidityNm');
        assertNear(kes.rigidityMicroNm, 9.80665, 1e-12, 'kes.rigidityMicroNm');
        const d1388 = astmD1388BendingFromCantileverCm(120, 2.0);
        assertNear(d1388.gMgCm, 96.0, 1e-12, 'd1388.gMgCm');
        assertNear(d1388.rigidityMicroNm, 9.414384, 1e-12, 'd1388.rigidityMicroNm');
        assertNear(d1388.rigidityNm, 9.414384e-6, 1e-12, 'd1388.rigidityNm');
        return 'Factores exactos SI (10^-3, 9.80665e-5, 0.0980665 uN*m) verificados';
    });

    runCase('2. Conservación exacta de masa nodal lumped y bloqueo pinned w=0', () => {
        // Cuadrado 1.0 m x 1.0 m dividido en 2 triángulos, rho_A = 0.2 kg/m^2 -> masa total = 0.2 kg
        const pos = new Float64Array([
            0, 0, 0,
            1, 0, 0,
            1, 0, 1,
            0, 0, 1,
        ]);
        const tris = new Uint32Array([0, 1, 2, 0, 2, 3]);
        const { massesKg, inverseMassesPerKg, totalSurfaceMassKg } = computeTriangleLumpedMasses(
            pos,
            tris,
            0.2,
            new Set([0, 3])
        );
        assertNear(totalSurfaceMassKg, 0.2, 1e-12, 'totalSurfaceMassKg');
        const sumNodal = massesKg[0] + massesKg[1] + massesKg[2] + massesKg[3];
        assertNear(sumNodal, 0.2, 1e-12, 'sumNodalMasses');
        if (inverseMassesPerKg[0] !== 0 || inverseMassesPerKg[3] !== 0) {
            throw new Error('Los nodos pinned debían tener w_i = 0');
        }
        assertNear(inverseMassesPerKg[1], 1 / massesKg[1], 1e-12, 'w_1');
        return 'Masa conservada (0.2 kg) y w_i = 0 aplicado exclusivamente a nodos pinned';
    });

    runCase('3. Escalado dimensional XPBD (dt_s, refinamiento de malla y simetría/asimetría)', () => {
        const dt1 = computeXpbdEdgeCompliance(100, 0.05, 0.05, 1 / 60);
        const dt2 = computeXpbdEdgeCompliance(100, 0.05, 0.05, 1 / 120);
        // alphaTilde escala cuadráticamente con 1/dt_s^2 -> al duplicar frecuencia, alphaTilde * 4
        assertNear(dt2.alphaTildePerKg / dt1.alphaTildePerKg, 4.0, 1e-12, 'alphaTilde_dt_scaling');

        // Refinamiento uniforme 2x de una franja cuadrada: L_0 -> L_0/2, b_e -> b_e/2 => k_edge constante para aspect ratio 1:1
        const coarseEdge = computeXpbdEdgeCompliance(200, 0.1, 0.1, 1 / 240);
        const fineEdge = computeXpbdEdgeCompliance(200, 0.05, 0.05, 1 / 240);
        assertNear(coarseEdge.alphaMPerN, fineEdge.alphaMPerN, 1e-12, 'edge_refinement_1x1');

        // Flexión XPBD escalada por 3 * B * l_e^2 / A_12^0:
        // Si dividimos cuadrículas por 2 (l_e -> l_e/2, A -> A/4), k_bend_e se mantiene invariante
        const coarseBend = computeXpbdBendingCompliance(1e-5, 0.1, 0.01, 1 / 240);
        const fineBend = computeXpbdBendingCompliance(1e-5, 0.05, 0.0025, 1 / 240);
        assertNear(coarseBend.alphaPerNm, fineBend.alphaPerNm, 1e-12, 'bend_refinement_invariant');

        const asymSpec: BendingRigiditySpec = {
            mode: 'ASYMMETRIC',
            faceUpRigidityNm: 1.8e-5,
            faceDownRigidityNm: 0.6e-5,
        };
        assertNear(selectDirectionalBendingRigidityNm(asymSpec, 0.15), 1.8e-5, 1e-12, 'faceUp');
        assertNear(selectDirectionalBendingRigidityNm(asymSpec, -0.15), 0.6e-5, 1e-12, 'faceDown');
        return 'Escalado dt^-2, invariante geométrica bajo refinamiento 2x y selección cara/envés sin promedio verificados';
    });

    runCase('4. Línea base PBD clásico: k prima monótona en [0,1]', () => {
        const k1 = computePbdEffectiveStiffness(0.8, 1);
        const k4 = computePbdEffectiveStiffness(0.8, 4);
        assertNear(k1, 0.8, 1e-12, 'k1');
        if (!(k4 > 0 && k4 < k1)) {
            throw new Error(`Se esperaba 0 < k4 < k1 (k4=${k4}, k1=${k1})`);
        }
        assertNear(computePbdEffectiveStiffness(0, 4), 0, 1e-12, 'k_zero');
        assertNear(computePbdEffectiveStiffness(1, 4), 1, 1e-12, 'k_one');
        return 'Monotonía k\'(k, N_iter) verificada en extremos y subiteraciones';
    });

    runCase('5. Inspector de elongación, NaN y severidad de penetración (> 3 mm)', () => {
        const edges: RestEdgeDescriptor[] = [
            { i: 0, j: 1, restLengthM: 0.1, tributaryWidthM: 0.1 },
            { i: 1, j: 2, restLengthM: 0.2, tributaryWidthM: 0.1 },
        ];
        // Arista 0-1 estirada +2.5% (0.1025), arista 1-2 comprimida -5.0% (0.19)
        const pos = [
            0, 0, 0,
            0.1025, 0, 0,
            0.2925, 0, 0,
        ];
        const stretchOk = measureEdgeStretchStats(pos, edges);
        assertNear(stretchOk.maxStretchPct, 5.0, 1e-6, 'maxStretchPct');
        assertNear(stretchOk.meanStretchPct, 3.75, 1e-6, 'meanStretchPct');
        if (stretchOk.nanVertexCount !== 0) {
            throw new Error('No debía detectar NaN en vértices finitos');
        }

        const posNan = [0, 0, 0, Number.NaN, 0, 0, 0.2, 0, 0];
        const stretchNan = measureEdgeStretchStats(posNan, edges);
        if (stretchNan.nanVertexCount !== 1) {
            throw new Error(`Se esperaba nanVertexCount=1, obtenido ${stretchNan.nanVertexCount}`);
        }

        // Distancias: +0.01 (fuera), -0.002 (contacto leve <3mm), -0.0045 (severo >3mm), -0.003 (exacto en frontera)
        const pen = measurePenetrationStats([0.01, -0.002, -0.0045, -0.003]);
        if (pen.penetrationCount !== 1 || pen.rawContactViolationCount !== 3) {
            throw new Error(`Conteo de penetración inesperado: ${JSON.stringify(pen)}`);
        }
        assertNear(pen.maxPenetrationDepthMm, 4.5, 1e-6, 'maxPenetrationDepthMm');
        return 'Elongación exacta (pico 5.0%, media 3.75%), detección de NaN y umbral severo > 3.0 mm validados';
    });

    runCase('6. Harness de telemetría: fases cronometradas, guards y exportación JSON por frame', () => {
        let syntheticClockMs = 100;
        const harness = new TelemetryHarness({
            nowMs: () => syntheticClockMs,
        });

        const edges: RestEdgeDescriptor[] = [{ i: 0, j: 1, restLengthM: 0.1, tributaryWidthM: 0.1 }];
        const posFrame0 = [0, 0, 0, 0.101, 0, 0]; // 1% stretch
        const posFrame1 = [0, 0, 0, 0.1015, 0, 0]; // 1.5% stretch

        const durations = [
            { phy: 6.2, col: 2.1, ren: 1.4, pos: posFrame0, dist: [0.005, 0.002] },
            { phy: 8.4, col: 3.0, ren: 1.8, pos: posFrame1, dist: [0.004, -0.004] },
        ];

        durations.forEach((d, idx) => {
            harness.beginFrame({
                frameIndex: idx,
                simTimeS: (idx + 1) * (1 / 60),
                dtFrameS: 1 / 60,
                substeps: 4,
                solverModel: 'XPBD',
                fabricId: 'archetype-light-placeholder',
            });
            harness.measurePhase('physicsStepMs', () => {
                syntheticClockMs += d.phy;
            });
            harness.measurePhase('collisionMs', () => {
                syntheticClockMs += d.col;
            });
            harness.measurePhase('renderMs', () => {
                syntheticClockMs += d.ren;
            });
            harness.finalizeFrame({
                stretch: measureEdgeStretchStats(d.pos, edges),
                penetration: measurePenetrationStats(d.dist),
                vertexCount: 2,
                triangleCount: 1,
                renderMode: 'headless-dry-run',
            });
        });

        const frame0Obj = JSON.parse(harness.exportFrameJson(0));
        if (frame0Obj.physicsStepMs !== 6.2 || frame0Obj.collisionMs !== 2.1 || frame0Obj.renderMs !== 1.4) {
            throw new Error(`Tiempos exportados incorrectos en frame 0: ${JSON.stringify(frame0Obj)}`);
        }
        if (
            frame0Obj.maxStretchPct !== 1
            || frame0Obj.penetrationCount !== 0
            || !frame0Obj.checks.withinDesktopPhysicsBudget
            || !frame0Obj.checks.zeroSeverePenetration
        ) {
            throw new Error(`Checks inesperados en frame 0: ${JSON.stringify(frame0Obj)}`);
        }

        const frame1Obj = JSON.parse(harness.exportFrameJson(1));
        if (frame1Obj.penetrationCount !== 1 || frame1Obj.checks.zeroSeverePenetration !== false) {
            throw new Error(`El frame 1 debía marcar fallo de penetración > 3 mm: ${JSON.stringify(frame1Obj)}`);
        }

        const batchObj = JSON.parse(harness.exportBatchJson('2026-11-14T22:00:00.000Z'));
        if (batchObj.frameCount !== 2 || batchObj.summary.physicsStepMs.p95 !== 8.4) {
            throw new Error(`Resumen p95 de lote inesperado: ${JSON.stringify(batchObj.summary)}`);
        }

        // Guardas negativas: frame fuera de secuencia o fases faltantes
        assertThrows(() => {
            harness.beginFrame({
                frameIndex: 5,
                simTimeS: 0.1,
                dtFrameS: 1 / 60,
                substeps: 4,
                solverModel: 'XPBD',
                fabricId: 'bad-seq',
            });
        }, 'out-of-sequence frameIndex');

        assertThrows(() => {
            harness.beginFrame({
                frameIndex: 2,
                simTimeS: 0.05,
                dtFrameS: 1 / 60,
                substeps: 4,
                solverModel: 'PBD',
                fabricId: 'missing-phase',
            });
            harness.recordPhaseMs('physicsStepMs', 1);
            harness.finalizeFrame({
                stretch: measureEdgeStretchStats(posFrame0, edges),
                penetration: measurePenetrationStats([0.01, 0.01]),
                vertexCount: 2,
                triangleCount: 1,
                renderMode: 'headless-dry-run',
            });
        }, 'missing collisionMs/renderMs');

        return 'Fases cronometradas, resumen p50/p95, JSON por frame/lote y guardas de integridad verificadas';
    });

    return {
        status: 'ALL_PASSED',
        total: results.length,
        results,
    };
}
