// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): HARNESS DE TELEMETRÍA Y MÉTRICAS T1
// Archivo: poc-simulador-3d/harness/telemetryHarness.ts
// ==============================================================================
// Mide physicsStepMs, collisionMs, renderMs, maxStretchPct y penetrationCount,
// evalúa los invariantes Gate 1 por frame y exporta JSON determinista por frame.
// ==============================================================================

import {
    FrameTelemetryRecord,
    HarnessClock,
    MetricPercentileSummary,
    PenetrationMetrics,
    RenderMode,
    RestEdgeDescriptor,
    SolverModel,
    StretchMetrics,
    TelemetryExportBatch,
    TelemetryPhase,
} from './types';

export const DEFAULT_SEVERE_PENETRATION_THRESHOLD_M = 0.003; // 3.0 mm (PLAN_POC_SIMULADOR_3D.md §5)
export const GATE1_DESKTOP_COMPUTE_BUDGET_MS = 16.0;
export const GATE1_MEAN_STRETCH_PCT_LIMIT = 2.0;
export const GATE1_PEAK_STRETCH_PCT_LIMIT = 5.0;

const defaultPerformanceClock: HarnessClock = {
    nowMs: () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()),
};

function round4(value: number): number {
    return Math.round(value * 10000) / 10000;
}

function assertNonNegativeFinite(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`${label} debe ser finito y >= 0 (recibido: ${value})`);
    }
}

/**
 * Inspecciona elongación porcentual de aristas respecto a L_0 y detecta vértices NaN/Inf.
 */
export function measureEdgeStretchStats(
    positionsM: Float64Array | Float32Array | readonly number[],
    restEdges: readonly RestEdgeDescriptor[]
): StretchMetrics {
    if (positionsM.length % 3 !== 0) {
        throw new RangeError('positionsM debe tener longitud múltiplo de 3');
    }

    const vertexCount = positionsM.length / 3;
    let nanVertexCount = 0;
    for (let v = 0; v < vertexCount; v++) {
        const x = positionsM[v * 3];
        const y = positionsM[v * 3 + 1];
        const z = positionsM[v * 3 + 2];
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            nanVertexCount += 1;
        }
    }

    if (restEdges.length === 0) {
        return {
            maxStretchPct: 0,
            meanStretchPct: 0,
            edgeCount: 0,
            nanVertexCount,
        };
    }

    let maxStretchPct = 0;
    let sumStretchPct = 0;
    let finiteEdgeCount = 0;

    for (const edge of restEdges) {
        if (edge.restLengthM <= 0 || !Number.isFinite(edge.restLengthM)) {
            throw new RangeError(`Arista (${edge.i}, ${edge.j}) tiene restLengthM inválido: ${edge.restLengthM}`);
        }
        if (edge.i < 0 || edge.i >= vertexCount || edge.j < 0 || edge.j >= vertexCount) {
            throw new RangeError(`Índice de arista fuera de rango (${edge.i}, ${edge.j}) para ${vertexCount} vértices`);
        }

        const dx = positionsM[edge.i * 3] - positionsM[edge.j * 3];
        const dy = positionsM[edge.i * 3 + 1] - positionsM[edge.j * 3 + 1];
        const dz = positionsM[edge.i * 3 + 2] - positionsM[edge.j * 3 + 2];
        const len = Math.hypot(dx, dy, dz);

        if (!Number.isFinite(len)) {
            continue;
        }

        const stretchPct = (Math.abs(len - edge.restLengthM) / edge.restLengthM) * 100;
        if (stretchPct > maxStretchPct) {
            maxStretchPct = stretchPct;
        }
        sumStretchPct += stretchPct;
        finiteEdgeCount += 1;
    }

    const meanStretchPct = finiteEdgeCount > 0 ? sumStretchPct / finiteEdgeCount : Number.NaN;

    return {
        maxStretchPct: Number.isFinite(maxStretchPct) ? round4(maxStretchPct) : Number.NaN,
        meanStretchPct: Number.isFinite(meanStretchPct) ? round4(meanStretchPct) : Number.NaN,
        edgeCount: restEdges.length,
        nanVertexCount,
    };
}

/**
 * Inspecciona distancias con signo prenda -> cuerpo (negativo = penetración).
 */
export function measurePenetrationStats(
    signedDistancesM: Float64Array | Float32Array | readonly number[],
    severeThresholdM: number = DEFAULT_SEVERE_PENETRATION_THRESHOLD_M
): PenetrationMetrics {
    if (!Number.isFinite(severeThresholdM) || severeThresholdM <= 0) {
        throw new RangeError(`severeThresholdM debe ser > 0 (recibido: ${severeThresholdM})`);
    }

    let penetrationCount = 0;
    let rawContactViolationCount = 0;
    let maxDepthM = 0;

    for (let i = 0; i < signedDistancesM.length; i++) {
        const d = signedDistancesM[i];
        if (!Number.isFinite(d)) {
            throw new RangeError(`signedDistancesM[${i}] no es finito (${d})`);
        }
        if (d < 0) {
            rawContactViolationCount += 1;
            const depthM = -d;
            if (depthM > maxDepthM) {
                maxDepthM = depthM;
            }
            if (depthM > severeThresholdM) {
                penetrationCount += 1;
            }
        }
    }

    return {
        penetrationCount,
        thresholdMm: round4(severeThresholdM * 1000),
        rawContactViolationCount,
        maxPenetrationDepthMm: round4(maxDepthM * 1000),
    };
}

function summarizeValues(values: readonly number[]): MetricPercentileSummary {
    if (values.length === 0) {
        return { min: 0, p50: 0, p95: 0, max: 0, mean: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const quantile = (q: number): number => {
        const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
        return round4(sorted[idx]);
    };

    return {
        min: round4(sorted[0]),
        p50: quantile(0.5),
        p95: quantile(0.95),
        max: round4(sorted[sorted.length - 1]),
        mean: round4(sum / sorted.length),
    };
}

interface PendingFrameContext {
    frameIndex: number;
    simTimeS: number;
    dtFrameS: number;
    substeps: number;
    solverModel: SolverModel;
    fabricId: string;
    phasesMs: Record<TelemetryPhase, number | null>;
}

/**
 * Harness determinista aislado de medición por frame para PoC Etapa 1.
 */
export class TelemetryHarness {
    private readonly clock: HarnessClock;
    private readonly frames: FrameTelemetryRecord[] = [];
    private pendingFrame: PendingFrameContext | null = null;

    constructor(clock: HarnessClock = defaultPerformanceClock) {
        this.clock = clock;
    }

    beginFrame(params: {
        frameIndex: number;
        simTimeS: number;
        dtFrameS: number;
        substeps: number;
        solverModel: SolverModel;
        fabricId: string;
    }): void {
        if (this.pendingFrame !== null) {
            throw new Error(`El frame ${this.pendingFrame.frameIndex} no fue finalizado antes de iniciar ${params.frameIndex}`);
        }
        if (!Number.isInteger(params.frameIndex) || params.frameIndex < 0) {
            throw new RangeError(`frameIndex inválido: ${params.frameIndex}`);
        }
        const expectedMinIdx = this.frames.length === 0 ? 0 : this.frames[this.frames.length - 1].frameIndex + 1;
        if (params.frameIndex !== expectedMinIdx) {
            throw new RangeError(`frameIndex fuera de secuencia: esperado ${expectedMinIdx}, recibido ${params.frameIndex}`);
        }
        assertNonNegativeFinite(params.simTimeS, 'simTimeS');
        if (!Number.isFinite(params.dtFrameS) || params.dtFrameS <= 0) {
            throw new RangeError(`dtFrameS debe ser > 0 (recibido: ${params.dtFrameS})`);
        }
        if (!Number.isInteger(params.substeps) || params.substeps < 1) {
            throw new RangeError(`substeps debe ser entero >= 1 (recibido: ${params.substeps})`);
        }
        if (!params.fabricId.trim()) {
            throw new RangeError('fabricId no puede ser vacío');
        }

        this.pendingFrame = {
            frameIndex: params.frameIndex,
            simTimeS: params.simTimeS,
            dtFrameS: params.dtFrameS,
            substeps: params.substeps,
            solverModel: params.solverModel,
            fabricId: params.fabricId,
            phasesMs: {
                physicsStepMs: null,
                collisionMs: null,
                renderMs: null,
            },
        };
    }

    recordPhaseMs(phase: TelemetryPhase, durationMs: number): void {
        if (!this.pendingFrame) {
            throw new Error(`No hay frame activo para registrar ${phase}`);
        }
        assertNonNegativeFinite(durationMs, phase);
        this.pendingFrame.phasesMs[phase] = durationMs;
    }

    measurePhase<T>(phase: TelemetryPhase, fn: () => T): T {
        if (!this.pendingFrame) {
            throw new Error(`No hay frame activo para cronometrar ${phase}`);
        }
        const t0 = this.clock.nowMs();
        const result = fn();
        const t1 = this.clock.nowMs();
        const elapsedMs = t1 - t0;
        if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
            throw new RangeError(`Reloj del harness devolvió duración inválida en ${phase}: ${elapsedMs}`);
        }
        this.pendingFrame.phasesMs[phase] = elapsedMs;
        return result;
    }

    finalizeFrame(params: {
        stretch: StretchMetrics;
        penetration: PenetrationMetrics;
        vertexCount: number;
        triangleCount: number;
        renderMode: RenderMode;
    }): FrameTelemetryRecord {
        if (!this.pendingFrame) {
            throw new Error('No hay frame activo para finalizar');
        }
        if (!Number.isInteger(params.vertexCount) || params.vertexCount <= 0) {
            throw new RangeError(`vertexCount inválido: ${params.vertexCount}`);
        }
        if (!Number.isInteger(params.triangleCount) || params.triangleCount <= 0) {
            throw new RangeError(`triangleCount inválido: ${params.triangleCount}`);
        }

        const { phasesMs } = this.pendingFrame;
        if (phasesMs.physicsStepMs === null || phasesMs.collisionMs === null || phasesMs.renderMs === null) {
            throw new Error(
                `Faltan fases obligatorias antes de finalizeFrame: ${JSON.stringify(phasesMs)}`
            );
        }

        const totalFrameComputeMs = phasesMs.physicsStepMs + phasesMs.collisionMs + phasesMs.renderMs;
        const frameWallBaselineMs = Math.max(totalFrameComputeMs, this.pendingFrame.dtFrameS * 1000);
        const estimatedFps = frameWallBaselineMs > 0 ? 1000 / frameWallBaselineMs : 0;
        const physicsAndCollisionMs = phasesMs.physicsStepMs + phasesMs.collisionMs;

        const record: FrameTelemetryRecord = {
            schemaVersion: 'poc-telemetry-frame/1.0.0',
            frameIndex: this.pendingFrame.frameIndex,
            simTimeS: round4(this.pendingFrame.simTimeS),
            dtFrameS: round4(this.pendingFrame.dtFrameS),
            substepDtS: round4(this.pendingFrame.dtFrameS / this.pendingFrame.substeps),
            substeps: this.pendingFrame.substeps,
            solverModel: this.pendingFrame.solverModel,
            fabricId: this.pendingFrame.fabricId,
            renderMode: params.renderMode,
            vertexCount: params.vertexCount,
            triangleCount: params.triangleCount,
            physicsStepMs: round4(phasesMs.physicsStepMs),
            collisionMs: round4(phasesMs.collisionMs),
            renderMs: round4(phasesMs.renderMs),
            totalFrameComputeMs: round4(totalFrameComputeMs),
            estimatedFps: round4(estimatedFps),
            maxStretchPct: params.stretch.maxStretchPct,
            meanStretchPct: params.stretch.meanStretchPct,
            nanVertexCount: params.stretch.nanVertexCount,
            penetrationCount: params.penetration.penetrationCount,
            penetrationThresholdMm: params.penetration.thresholdMm,
            rawContactViolationCount: params.penetration.rawContactViolationCount,
            maxPenetrationDepthMm: params.penetration.maxPenetrationDepthMm,
            checks: {
                zeroNan: params.stretch.nanVertexCount === 0,
                withinDesktopPhysicsBudget: physicsAndCollisionMs <= GATE1_DESKTOP_COMPUTE_BUDGET_MS,
                stretchMeanWithin2Pct: Number.isFinite(params.stretch.meanStretchPct)
                    && params.stretch.meanStretchPct <= GATE1_MEAN_STRETCH_PCT_LIMIT,
                stretchPeakWithin5Pct: Number.isFinite(params.stretch.maxStretchPct)
                    && params.stretch.maxStretchPct <= GATE1_PEAK_STRETCH_PCT_LIMIT,
                zeroSeverePenetration: params.penetration.penetrationCount === 0,
            },
        };

        this.frames.push(record);
        this.pendingFrame = null;
        return record;
    }

    getFrames(): readonly FrameTelemetryRecord[] {
        return this.frames;
    }

    exportFrameJson(frameIndex: number): string {
        const frame = this.frames.find((item) => item.frameIndex === frameIndex);
        if (!frame) {
            throw new RangeError(`No existe el frame ${frameIndex} en el harness`);
        }
        return JSON.stringify(frame, null, 2);
    }

    buildBatchExport(exportedAtIso: string = new Date().toISOString()): TelemetryExportBatch {
        if (this.frames.length === 0) {
            throw new Error('No hay frames registrados para exportar lote');
        }
        const first = this.frames[0];
        return {
            schemaVersion: 'poc-telemetry-batch/1.0.0',
            exportedAtIso,
            frameCount: this.frames.length,
            solverModel: first.solverModel,
            fabricId: first.fabricId,
            summary: {
                physicsStepMs: summarizeValues(this.frames.map((f) => f.physicsStepMs)),
                collisionMs: summarizeValues(this.frames.map((f) => f.collisionMs)),
                renderMs: summarizeValues(this.frames.map((f) => f.renderMs)),
                maxStretchPct: summarizeValues(this.frames.map((f) => f.maxStretchPct)),
                penetrationCount: summarizeValues(this.frames.map((f) => f.penetrationCount)),
                totalNanVertices: this.frames.reduce((acc, f) => acc + f.nanVertexCount, 0),
            },
            frames: [...this.frames],
        };
    }

    exportBatchJson(exportedAtIso: string = new Date().toISOString()): string {
        return JSON.stringify(this.buildBatchExport(exportedAtIso), null, 2);
    }
}

