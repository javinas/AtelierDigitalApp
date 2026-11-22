// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): SOLVERS XPBD VS. PBD (T2 ESCENA 0)
// Archivo: poc-simulador-3d/solvers/clothSolvers.ts
// ==============================================================================
// Implementa ambos solvers bajo idénticas condiciones de integración, amortiguación
// y presupuesto de subpasos/iteraciones, siguiendo T1_MATH_SPEC_XPBD_VS_PBD.md.
// ==============================================================================

import {
    computePbdEffectiveStiffness,
    computeXpbdBendingCompliance,
    computeXpbdEdgeCompliance,
    selectDirectionalBendingRigidityNm,
    STANDARD_GRAVITY_M_S2,
} from '../harness/siConversionAndParams';
import { BendingRigiditySpec, SolverModel } from '../harness/types';
import { GeneratedClothMesh } from '../scene0/clothMeshGenerator';

export interface ClothSimulationConfig {
    solverModel: SolverModel;
    dtFrameS: number;                // 1/60 s
    substeps: number;                // N_sub
    iterationsPerSubstep: number;    // N_iter
    airDampingPerS: number;          // Amortiguamiento exponencial de arrastre [1/s]
    // Parámetros físicos SI (usados directamente por XPBD)
    warpWeftStiffnessNPerM: number;  // K_stretch urdimbre/trama [N/m]
    shearStiffnessNPerM: number;     // K_shear diagonal [N/m]
    bending: BendingRigiditySpec;    // B [N*m]
    // Parámetros adimensionales comparables (usados por PBD clásico)
    pbdWarpWeftStiffness01: number;  // k_stretch in [0, 1]
    pbdShearStiffness01: number;     // k_shear in [0, 1]
    pbdBendingStiffness01: number;   // k_bend in [0, 1]
}

export interface DihedralAngleAndGradients {
    phiSignedRad: number;
    valid: boolean;
    g1x: number; g1y: number; g1z: number;
    g2x: number; g2y: number; g2z: number;
    g3x: number; g3y: number; g3z: number;
    g4x: number; g4y: number; g4z: number;
}

/**
 * Escribe ángulo diédrico y gradientes en `out` (13 floats: [phi, g1x..g1z, g2x..g2z, g3x..g3z, g4x..g4z])
 * sin reservar objetos en heap dentro del bucle físico. Retorna true si la bisagra es no degenerada.
 */
export function computeSignedDihedralGradientsInto(
    pos: Float64Array,
    v1: number,
    v2: number,
    v3: number,
    v4: number,
    out: Float64Array
): boolean {
    const b1 = v1 * 3;
    const b2 = v2 * 3;
    const b3 = v3 * 3;
    const b4 = v4 * 3;

    const x1 = pos[b1]; const y1 = pos[b1 + 1]; const z1 = pos[b1 + 2];
    const ex = pos[b2] - x1; const ey = pos[b2 + 1] - y1; const ez = pos[b2 + 2] - z1;
    const p3x = pos[b3] - x1; const p3y = pos[b3 + 1] - y1; const p3z = pos[b3 + 2] - z1;
    const p4x = pos[b4] - x1; const p4y = pos[b4 + 1] - y1; const p4z = pos[b4 + 2] - z1;

    const eLen = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (eLen < 1e-10) {
        return false;
    }
    const invE = 1 / eLen;
    const ehx = ex * invE; const ehy = ey * invE; const ehz = ez * invE;

    // n1 = e x p3, n2 = p4 x e
    const n1x = ey * p3z - ez * p3y;
    const n1y = ez * p3x - ex * p3z;
    const n1z = ex * p3y - ey * p3x;
    const a1 = Math.sqrt(n1x * n1x + n1y * n1y + n1z * n1z);

    const n2x = p4y * ez - p4z * ey;
    const n2y = p4z * ex - p4x * ez;
    const n2z = p4x * ey - p4y * ex;
    const a2 = Math.sqrt(n2x * n2x + n2y * n2y + n2z * n2z);

    if (a1 < 1e-12 || a2 < 1e-12) {
        return false;
    }

    const invA1 = 1 / a1;
    const invA2 = 1 / a2;
    const u1x = n1x * invA1; const u1y = n1y * invA1; const u1z = n1z * invA1;
    const u2x = n2x * invA2; const u2y = n2y * invA2; const u2z = n2z * invA2;

    const dotN = u1x * u2x + u1y * u2y + u1z * u2z;
    const cx = u1y * u2z - u1z * u2y;
    const cy = u1z * u2x - u1x * u2z;
    const cz = u1x * u2y - u1y * u2x;
    const sinSign = cx * ehx + cy * ehy + cz * ehz;

    out[0] = Math.atan2(sinSign, dotN);

    const f3 = -eLen * invA1;
    const f4 = -eLen * invA2;
    out[7] = f3 * u1x; out[8] = f3 * u1y; out[9] = f3 * u1z;
    out[10] = f4 * u2x; out[11] = f4 * u2y; out[12] = f4 * u2z;

    const c13 = p3x * ehx + p3y * ehy + p3z * ehz;
    const c23 = eLen - c13;
    const c14 = p4x * ehx + p4y * ehy + p4z * ehz;
    const c24 = eLen - c14;

    out[1] = c23 * invA1 * u1x + c24 * invA2 * u2x;
    out[2] = c23 * invA1 * u1y + c24 * invA2 * u2y;
    out[3] = c23 * invA1 * u1z + c24 * invA2 * u2z;

    out[4] = c13 * invA1 * u1x + c14 * invA2 * u2x;
    out[5] = c13 * invA1 * u1y + c14 * invA2 * u2y;
    out[6] = c13 * invA1 * u1z + c14 * invA2 * u2z;

    return true;
}

/**
 * Calcula ángulo diédrico con signo y gradientes exactos respecto a (x1, x2, x3, x4)
 * para bisagra orientada: tri1 = (v1, v2, v3), tri2 = (v1, v4, v2).
 */
export function computeSignedDihedralGradients(
    pos: Float64Array,
    v1: number,
    v2: number,
    v3: number,
    v4: number
): DihedralAngleAndGradients {
    const out = new Float64Array(13);
    const valid = computeSignedDihedralGradientsInto(pos, v1, v2, v3, v4, out);
    if (!valid) {
        return {
            phiSignedRad: 0, valid: false,
            g1x: 0, g1y: 0, g1z: 0, g2x: 0, g2y: 0, g2z: 0,
            g3x: 0, g3y: 0, g3z: 0, g4x: 0, g4y: 0, g4z: 0,
        };
    }
    return {
        phiSignedRad: out[0],
        valid: true,
        g1x: out[1], g1y: out[2], g1z: out[3],
        g2x: out[4], g2y: out[5], g2z: out[6],
        g3x: out[7], g3y: out[8], g3z: out[9],
        g4x: out[10], g4y: out[11], g4z: out[12],
    };
}

export class Scene0ClothSolver {
    readonly mesh: GeneratedClothMesh;
    readonly config: ClothSimulationConfig;
    readonly positionsM: Float64Array;
    readonly predictedM: Float64Array;
    readonly velocitiesMS: Float64Array;

    private readonly edgeAlphaTilde: Float64Array;
    private readonly edgeLambdas: Float64Array;
    private readonly hingeAlphaTildeUp: Float64Array;
    private readonly hingeAlphaTildeDown: Float64Array;
    private readonly hingeLambdas: Float64Array;
    private readonly pbdStretchEff: Float64Array;
    private readonly pbdBendEff: number;
    private readonly substepDtS: number;
    private readonly gradScratch = new Float64Array(13);

    constructor(mesh: GeneratedClothMesh, config: ClothSimulationConfig) {
        this.mesh = mesh;
        this.config = config;
        this.substepDtS = config.dtFrameS / config.substeps;

        this.positionsM = new Float64Array(mesh.restPositionsM);
        this.predictedM = new Float64Array(mesh.restPositionsM);
        this.velocitiesMS = new Float64Array(mesh.vertexCount * 3);

        this.edgeAlphaTilde = new Float64Array(mesh.edges.length);
        this.edgeLambdas = new Float64Array(mesh.edges.length);
        this.hingeAlphaTildeUp = new Float64Array(mesh.hinges.length);
        this.hingeAlphaTildeDown = new Float64Array(mesh.hinges.length);
        this.hingeLambdas = new Float64Array(mesh.hinges.length);
        this.pbdStretchEff = new Float64Array(mesh.edges.length);

        const kWarpEff = computePbdEffectiveStiffness(config.pbdWarpWeftStiffness01, config.iterationsPerSubstep);
        const kShearEff = computePbdEffectiveStiffness(config.pbdShearStiffness01, config.iterationsPerSubstep);
        this.pbdBendEff = computePbdEffectiveStiffness(config.pbdBendingStiffness01, config.iterationsPerSubstep);

        for (let e = 0; e < mesh.edges.length; e++) {
            const edge = mesh.edges[e];
            const stiffnessNPerM = edge.kind === 'shear'
                ? config.shearStiffnessNPerM
                : config.warpWeftStiffnessNPerM;
            this.edgeAlphaTilde[e] = computeXpbdEdgeCompliance(
                stiffnessNPerM,
                edge.restLengthM,
                edge.tributaryWidthM,
                this.substepDtS
            ).alphaTildePerKg;
            this.pbdStretchEff[e] = edge.kind === 'shear' ? kShearEff : kWarpEff;
        }

        const bUpNm = selectDirectionalBendingRigidityNm(config.bending, 1);
        const bDownNm = selectDirectionalBendingRigidityNm(config.bending, -1);
        for (let h = 0; h < mesh.hinges.length; h++) {
            const hinge = mesh.hinges[h];
            this.hingeAlphaTildeUp[h] = computeXpbdBendingCompliance(
                bUpNm,
                hinge.hingeLengthM,
                hinge.combinedTriangleAreaM2,
                this.substepDtS
            ).alphaTildePerKgM2;
            this.hingeAlphaTildeDown[h] = computeXpbdBendingCompliance(
                bDownNm,
                hinge.hingeLengthM,
                hinge.combinedTriangleAreaM2,
                this.substepDtS
            ).alphaTildePerKgM2;
        }
    }

    stepFrame(): void {
        const dtS = this.substepDtS;
        const nSub = this.config.substeps;
        const nIter = this.config.iterationsPerSubstep;
        const dampingFactor = Math.exp(-this.config.airDampingPerS * dtS);
        const vCount = this.mesh.vertexCount;
        const invMass = this.mesh.inverseMassesPerKg;
        const pos = this.positionsM;
        const pred = this.predictedM;
        const vel = this.velocitiesMS;

        for (let sub = 0; sub < nSub; sub++) {
            // 1. Predicción con gravedad SI (-9.80665 m/s^2) y amortiguamiento aéreo idéntico
            for (let i = 0; i < vCount; i++) {
                const base = i * 3;
                if (invMass[i] === 0) {
                    pred[base] = pos[base];
                    pred[base + 1] = pos[base + 1];
                    pred[base + 2] = pos[base + 2];
                    vel[base] = 0;
                    vel[base + 1] = 0;
                    vel[base + 2] = 0;
                    continue;
                }
                const vx = vel[base] * dampingFactor;
                const vy = (vel[base + 1] - STANDARD_GRAVITY_M_S2 * dtS) * dampingFactor;
                const vz = vel[base + 2] * dampingFactor;
                vel[base] = vx;
                vel[base + 1] = vy;
                vel[base + 2] = vz;

                pred[base] = pos[base] + vx * dtS;
                pred[base + 1] = pos[base + 1] + vy * dtS;
                pred[base + 2] = pos[base + 2] + vz * dtS;
            }

            if (this.config.solverModel === 'XPBD') {
                this.edgeLambdas.fill(0);
                this.hingeLambdas.fill(0);
            }

            // 2. Proyección de restricciones (Gauss-Seidel)
            for (let iter = 0; iter < nIter; iter++) {
                this.solveStretchConstraints();
                this.solveBendingConstraints();
            }

            // 3. Integración de velocidad y commit de posición
            const invDt = 1 / dtS;
            for (let i = 0; i < vCount; i++) {
                const base = i * 3;
                if (invMass[i] === 0) {
                    vel[base] = 0;
                    vel[base + 1] = 0;
                    vel[base + 2] = 0;
                    continue;
                }
                vel[base] = (pred[base] - pos[base]) * invDt;
                vel[base + 1] = (pred[base + 1] - pos[base + 1]) * invDt;
                vel[base + 2] = (pred[base + 2] - pos[base + 2]) * invDt;

                pos[base] = pred[base];
                pos[base + 1] = pred[base + 1];
                pos[base + 2] = pred[base + 2];
            }
        }
    }

    private solveStretchConstraints(): void {
        const pred = this.predictedM;
        const invMass = this.mesh.inverseMassesPerKg;
        const edges = this.mesh.edges;
        const isXpbd = this.config.solverModel === 'XPBD';

        for (let e = 0; e < edges.length; e++) {
            const edge = edges[e];
            const wi = invMass[edge.i];
            const wj = invMass[edge.j];
            const wSum = wi + wj;
            if (wSum <= 0) continue;

            const bi = edge.i * 3;
            const bj = edge.j * 3;
            const dx = pred[bi] - pred[bj];
            const dy = pred[bi + 1] - pred[bj + 1];
            const dz = pred[bi + 2] - pred[bj + 2];
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (len < 1e-10) continue;

            const invLen = 1 / len;
            const nx = dx * invLen;
            const ny = dy * invLen;
            const nz = dz * invLen;
            const c = len - edge.restLengthM;

            if (isXpbd) {
                const alphaTilde = this.edgeAlphaTilde[e];
                const dLambda = (-c - alphaTilde * this.edgeLambdas[e]) / (wSum + alphaTilde);
                this.edgeLambdas[e] += dLambda;
                if (wi > 0) {
                    const s = wi * dLambda;
                    pred[bi] += nx * s;
                    pred[bi + 1] += ny * s;
                    pred[bi + 2] += nz * s;
                }
                if (wj > 0) {
                    const s = wj * dLambda;
                    pred[bj] -= nx * s;
                    pred[bj + 1] -= ny * s;
                    pred[bj + 2] -= nz * s;
                }
            } else {
                const kEff = this.pbdStretchEff[e];
                const factor = -kEff * (c / wSum);
                if (wi > 0) {
                    const s = wi * factor;
                    pred[bi] += nx * s;
                    pred[bi + 1] += ny * s;
                    pred[bi + 2] += nz * s;
                }
                if (wj > 0) {
                    const s = wj * factor;
                    pred[bj] -= nx * s;
                    pred[bj + 1] -= ny * s;
                    pred[bj + 2] -= nz * s;
                }
            }
        }
    }

    private solveBendingConstraints(): void {
        const pred = this.predictedM;
        const invMass = this.mesh.inverseMassesPerKg;
        const hinges = this.mesh.hinges;
        const isXpbd = this.config.solverModel === 'XPBD';
        const gs = this.gradScratch;

        for (let h = 0; h < hinges.length; h++) {
            const hinge = hinges[h];
            const w1 = invMass[hinge.v1];
            const w2 = invMass[hinge.v2];
            const w3 = invMass[hinge.v3];
            const w4 = invMass[hinge.v4];
            if (w1 + w2 + w3 + w4 <= 0) continue;

            if (!computeSignedDihedralGradientsInto(pred, hinge.v1, hinge.v2, hinge.v3, hinge.v4, gs)) {
                continue;
            }

            const c = gs[0] - hinge.restAngleRad;
            const g1x = gs[1]; const g1y = gs[2]; const g1z = gs[3];
            const g2x = gs[4]; const g2y = gs[5]; const g2z = gs[6];
            const g3x = gs[7]; const g3y = gs[8]; const g3z = gs[9];
            const g4x = gs[10]; const g4y = gs[11]; const g4z = gs[12];

            const denomGrad =
                w1 * (g1x * g1x + g1y * g1y + g1z * g1z)
                + w2 * (g2x * g2x + g2y * g2y + g2z * g2z)
                + w3 * (g3x * g3x + g3y * g3y + g3z * g3z)
                + w4 * (g4x * g4x + g4y * g4y + g4z * g4z);

            if (denomGrad < 1e-12) continue;

            let factor = 0;
            if (isXpbd) {
                const alphaTilde = c >= 0 ? this.hingeAlphaTildeUp[h] : this.hingeAlphaTildeDown[h];
                const dLambda = (-c - alphaTilde * this.hingeLambdas[h]) / (denomGrad + alphaTilde);
                this.hingeLambdas[h] += dLambda;
                factor = dLambda;
            } else {
                factor = -this.pbdBendEff * (c / denomGrad);
            }

            if (w1 > 0) {
                const s = w1 * factor;
                const b1 = hinge.v1 * 3;
                pred[b1] += g1x * s;
                pred[b1 + 1] += g1y * s;
                pred[b1 + 2] += g1z * s;
            }
            if (w2 > 0) {
                const s = w2 * factor;
                const b2 = hinge.v2 * 3;
                pred[b2] += g2x * s;
                pred[b2 + 1] += g2y * s;
                pred[b2 + 2] += g2z * s;
            }
            if (w3 > 0) {
                const s = w3 * factor;
                const b3 = hinge.v3 * 3;
                pred[b3] += g3x * s;
                pred[b3 + 1] += g3y * s;
                pred[b3 + 2] += g3z * s;
            }
            if (w4 > 0) {
                const s = w4 * factor;
                const b4 = hinge.v4 * 3;
                pred[b4] += g4x * s;
                pred[b4 + 1] += g4y * s;
                pred[b4 + 2] += g4z * s;
            }
        }
    }
}
