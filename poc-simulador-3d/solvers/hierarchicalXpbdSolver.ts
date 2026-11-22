// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): SOLVER XPBD JERÁRQUICO MULTINIVEL (T2.2)
// Archivo: poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts
// ==============================================================================
// Arquitectura XPBD acelerada mediante:
//   1. Disposición plana Struct-of-Arrays (SoA) en TypedArrays sin asignaciones
//      en el bucle crítico ni indirección por objeto.
//   2. Propagación jerárquica multinivel (V-cycle grueso -> fino con conservación
//      de masa nodal, restricciones unilaterales de tracción y prolongación
//      bilineal de desplazamientos).
//   3. Flexión diédrica exacta con signo (atan2) preservando selectivamente caras
//      FACE_UP / FACE_DOWN (sin utilizar V4).
// ==============================================================================

import {
    computeXpbdBendingCompliance,
    computeXpbdEdgeCompliance,
    selectDirectionalBendingRigidityNm,
    STANDARD_GRAVITY_M_S2,
} from '../harness/siConversionAndParams';
import { BendingRigiditySpec } from '../harness/types';
import { ClothEdgeDescriptor, GeneratedClothMesh } from '../scene0/clothMeshGenerator';

export interface HierarchicalXpbdConfig {
    variantId: string;
    dtFrameS: number;
    substeps: number;
    coarseStrides: readonly number[];          // Ej. [16, 8, 4, 2] (de grueso a fino; [] = sin jerarquía)
    coarseIterationsPerLevel: number;        // Iteraciones Gauss-Seidel XPBD por nivel grueso
    fineStretchIterationsPerSubstep: number;   // Iteraciones finas (en pares ida+vuelta si bidirectional)
    bidirectionalFineSweep: boolean;
    bendingIterationsPerSubstep: number;       // Típicamente 1 por subpaso (flexión diédrica exacta con signo)
    prolongationRelaxation: number;            // Factor omega in (0, 1] al prolongar deltas gruesos
    coarseUnilateralOnly: boolean;             // true = solo tracción C > 0 en niveles gruesos (evita locking)
    coarseComplianceScale: number;             // 1.0 = compliance SI física exacta a escala gruesa
    airDampingPerS: number;
    warpWeftStiffnessNPerM: number;
    shearStiffnessNPerM: number;
    bending: BendingRigiditySpec;
}

export type HierarchicalSubstepCollisionHook = (
    predictedM: Float64Array,
    positionsM: Float64Array,
    invMass: Float64Array,
    substepDtS: number,
    substepIndex: number
) => void;

export interface HierarchicalPhaseProfile {
    predictMs: number;
    hierarchyMs: number;
    stretchMs: number;
    bendingMs: number;
    collisionMs: number;
    commitMs: number;
    totalMs: number;
}

interface CoarseLevelData {
    stride: number;
    cRows: number;
    cCols: number;
    vertexCount: number;
    coarseToFineVertex: Uint32Array;
    coarseInvMass: Float64Array;
    posInit: Float64Array;
    posSolved: Float64Array;
    edgeCount: number;
    edgeI: Uint32Array;
    edgeJ: Uint32Array;
    edgeRestLen: Float64Array;
    edgeAlphaTilde: Float64Array;
    edgeLambda: Float64Array;
    // Prolongación bilineal precomputada hacia todos los vértices de la malla fina
    fineParent0: Uint32Array;
    fineParent1: Uint32Array;
    fineParent2: Uint32Array;
    fineParent3: Uint32Array;
    fineWeight0: Float64Array;
    fineWeight1: Float64Array;
    fineWeight2: Float64Array;
    fineWeight3: Float64Array;
}

function buildAxisCoords(gridSize: number, stride: number): number[] {
    const coords: number[] = [];
    for (let idx = 0; idx < gridSize - 1; idx += stride) {
        coords.push(idx);
    }
    if (coords[coords.length - 1] !== gridSize - 1) {
        coords.push(gridSize - 1);
    }
    return coords;
}

function findBracket(sortedCoords: readonly number[], value: number): { lo: number; hi: number; t: number } {
    for (let k = 0; k < sortedCoords.length - 1; k++) {
        const a = sortedCoords[k];
        const b = sortedCoords[k + 1];
        if (value >= a && value <= b) {
            const span = b - a;
            return { lo: k, hi: k + 1, t: span > 0 ? (value - a) / span : 0 };
        }
    }
    const last = sortedCoords.length - 1;
    return { lo: last, hi: last, t: 0 };
}

function buildCoarseLevel(
    mesh: GeneratedClothMesh,
    stride: number,
    config: HierarchicalXpbdConfig,
    substepDtS: number
): CoarseLevelData | null {
    const n = mesh.gridSize;
    if (stride <= 1 || stride >= n) {
        return null;
    }

    const rowCoords = buildAxisCoords(n, stride);
    const colCoords = buildAxisCoords(n, stride);
    const cRows = rowCoords.length;
    const cCols = colCoords.length;
    const coarseVertexCount = cRows * cCols;

    if (coarseVertexCount < 4) {
        return null;
    }

    const coarseToFineVertex = new Uint32Array(coarseVertexCount);
    const coarseRestPos = new Float64Array(coarseVertexCount * 3);
    for (let cr = 0; cr < cRows; cr++) {
        for (let cc = 0; cc < cCols; cc++) {
            const cIdx = cr * cCols + cc;
            const fIdx = rowCoords[cr] * n + colCoords[cc];
            coarseToFineVertex[cIdx] = fIdx;
            coarseRestPos[cIdx * 3] = mesh.restPositionsM[fIdx * 3];
            coarseRestPos[cIdx * 3 + 1] = mesh.restPositionsM[fIdx * 3 + 1];
            coarseRestPos[cIdx * 3 + 2] = mesh.restPositionsM[fIdx * 3 + 2];
        }
    }

    const fCount = mesh.vertexCount;
    const fineParent0 = new Uint32Array(fCount);
    const fineParent1 = new Uint32Array(fCount);
    const fineParent2 = new Uint32Array(fCount);
    const fineParent3 = new Uint32Array(fCount);
    const fineWeight0 = new Float64Array(fCount);
    const fineWeight1 = new Float64Array(fCount);
    const fineWeight2 = new Float64Array(fCount);
    const fineWeight3 = new Float64Array(fCount);

    const coarseMass = new Float64Array(coarseVertexCount);

    // Restricción bilineal de masa desde la malla fina (conservación exacta de masa total)
    for (let r = 0; r < n; r++) {
        const rb = findBracket(rowCoords, r);
        for (let c = 0; c < n; c++) {
            const cb = findBracket(colCoords, c);
            const fIdx = r * n + c;

            const i00 = rb.lo * cCols + cb.lo;
            const i01 = rb.lo * cCols + cb.hi;
            const i10 = rb.hi * cCols + cb.lo;
            const i11 = rb.hi * cCols + cb.hi;

            const wr0 = 1 - rb.t;
            const wr1 = rb.t;
            const wc0 = 1 - cb.t;
            const wc1 = cb.t;

            const w00 = wr0 * wc0;
            const w01 = wr0 * wc1;
            const w10 = wr1 * wc0;
            const w11 = wr1 * wc1;

            fineParent0[fIdx] = i00;
            fineParent1[fIdx] = i01;
            fineParent2[fIdx] = i10;
            fineParent3[fIdx] = i11;
            fineWeight0[fIdx] = w00;
            fineWeight1[fIdx] = w01;
            fineWeight2[fIdx] = w10;
            fineWeight3[fIdx] = w11;

            const mf = mesh.massesKg[fIdx];
            coarseMass[i00] += w00 * mf;
            coarseMass[i01] += w01 * mf;
            coarseMass[i10] += w10 * mf;
            coarseMass[i11] += w11 * mf;
        }
    }

    const coarseInvMass = new Float64Array(coarseVertexCount);
    for (let cIdx = 0; cIdx < coarseVertexCount; cIdx++) {
        const fIdx = coarseToFineVertex[cIdx];
        if (mesh.inverseMassesPerKg[fIdx] === 0 || coarseMass[cIdx] <= 0) {
            coarseInvMass[cIdx] = 0;
        } else {
            coarseInvMass[cIdx] = 1 / coarseMass[cIdx];
        }
    }

    const coarseEdges: ClothEdgeDescriptor[] = [];
    const pushCoarseEdge = (i: number, j: number, kind: ClothEdgeDescriptor['kind'], tribWidthM: number) => {
        const dx = coarseRestPos[j * 3] - coarseRestPos[i * 3];
        const dy = coarseRestPos[j * 3 + 1] - coarseRestPos[i * 3 + 1];
        const dz = coarseRestPos[j * 3 + 2] - coarseRestPos[i * 3 + 2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 1e-9 && tribWidthM > 0) {
            coarseEdges.push({ i, j, restLengthM: len, tributaryWidthM: tribWidthM, kind });
        }
    };

    const rowSpanAt = (cr: number): number => {
        const prev = cr > 0 ? Math.abs(coarseRestPos[(cr * cCols) * 3 + 2] - coarseRestPos[((cr - 1) * cCols) * 3 + 2]) : 0;
        const next = cr < cRows - 1 ? Math.abs(coarseRestPos[((cr + 1) * cCols) * 3 + 2] - coarseRestPos[(cr * cCols) * 3 + 2]) : 0;
        return 0.5 * (prev + next);
    };
    const colSpanAt = (cc: number): number => {
        const prev = cc > 0 ? Math.abs(coarseRestPos[cc * 3] - coarseRestPos[(cc - 1) * 3]) : 0;
        const next = cc < cCols - 1 ? Math.abs(coarseRestPos[(cc + 1) * 3] - coarseRestPos[cc * 3]) : 0;
        return 0.5 * (prev + next);
    };

    // Trama gruesa (horizontal)
    for (let cr = 0; cr < cRows; cr++) {
        const trib = rowSpanAt(cr);
        for (let cc = 0; cc < cCols - 1; cc++) {
            pushCoarseEdge(cr * cCols + cc, cr * cCols + (cc + 1), 'weft', trib);
        }
    }
    // Urdimbre gruesa (vertical)
    for (let cc = 0; cc < cCols; cc++) {
        const trib = colSpanAt(cc);
        for (let cr = 0; cr < cRows - 1; cr++) {
            pushCoarseEdge(cr * cCols + cc, (cr + 1) * cCols + cc, 'warp', trib);
        }
    }
    // Diagonales cruzadas en cada celda gruesa (simetría de cizallamiento)
    for (let cr = 0; cr < cRows - 1; cr++) {
        const cellH = Math.abs(coarseRestPos[((cr + 1) * cCols) * 3 + 2] - coarseRestPos[(cr * cCols) * 3 + 2]);
        for (let cc = 0; cc < cCols - 1; cc++) {
            const cellW = Math.abs(coarseRestPos[(cc + 1) * 3] - coarseRestPos[cc * 3]);
            const diagLen = Math.hypot(cellW, cellH);
            const diagTrib = diagLen > 1e-9 ? (cellW * cellH) / diagLen : 0;
            const v00 = cr * cCols + cc;
            const v01 = cr * cCols + (cc + 1);
            const v10 = (cr + 1) * cCols + cc;
            const v11 = (cr + 1) * cCols + (cc + 1);
            pushCoarseEdge(v00, v11, 'shear', diagTrib);
            pushCoarseEdge(v01, v10, 'shear', diagTrib);
        }
    }

    const edgeCount = coarseEdges.length;
    const edgeI = new Uint32Array(edgeCount);
    const edgeJ = new Uint32Array(edgeCount);
    const edgeRestLen = new Float64Array(edgeCount);
    const edgeAlphaTilde = new Float64Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
        const ed = coarseEdges[e];
        edgeI[e] = ed.i;
        edgeJ[e] = ed.j;
        edgeRestLen[e] = ed.restLengthM;
        const kStretch = ed.kind === 'shear' ? config.shearStiffnessNPerM : config.warpWeftStiffnessNPerM;
        edgeAlphaTilde[e] = computeXpbdEdgeCompliance(
            kStretch,
            ed.restLengthM,
            ed.tributaryWidthM,
            substepDtS
        ).alphaTildePerKg * config.coarseComplianceScale;
    }

    return {
        stride,
        cRows,
        cCols,
        vertexCount: coarseVertexCount,
        coarseToFineVertex,
        coarseInvMass,
        posInit: new Float64Array(coarseVertexCount * 3),
        posSolved: new Float64Array(coarseVertexCount * 3),
        edgeCount,
        edgeI,
        edgeJ,
        edgeRestLen,
        edgeAlphaTilde,
        edgeLambda: new Float64Array(edgeCount),
        fineParent0,
        fineParent1,
        fineParent2,
        fineParent3,
        fineWeight0,
        fineWeight1,
        fineWeight2,
        fineWeight3,
    };
}

export class HierarchicalXpbdClothSolver {
    readonly mesh: GeneratedClothMesh;
    readonly config: HierarchicalXpbdConfig;
    readonly positionsM: Float64Array;
    readonly predictedM: Float64Array;
    readonly velocitiesMS: Float64Array;

    private readonly substepDtS: number;
    private readonly invMass: Float64Array;

    // Aristas finas en formato plano SoA
    private readonly fineEdgeCount: number;
    private readonly fineEdgeI: Uint32Array;
    private readonly fineEdgeJ: Uint32Array;
    private readonly fineEdgeRestLen: Float64Array;
    private readonly fineEdgeAlphaTilde: Float64Array;
    private readonly fineEdgeLambda: Float64Array;

    // Bisagras diédricas finas en formato plano SoA (con signo FACE_UP / FACE_DOWN)
    private readonly hingeCount: number;
    private readonly hingeV1: Uint32Array;
    private readonly hingeV2: Uint32Array;
    private readonly hingeV3: Uint32Array;
    private readonly hingeV4: Uint32Array;
    private readonly hingeRestAngle: Float64Array;
    private readonly hingeAlphaUp: Float64Array;
    private readonly hingeAlphaDown: Float64Array;
    private readonly hingeLambda: Float64Array;

    // Pirámide multinivel grueso -> fino
    private readonly coarseLevels: CoarseLevelData[];

    constructor(mesh: GeneratedClothMesh, config: HierarchicalXpbdConfig) {
        this.mesh = mesh;
        this.config = config;
        this.substepDtS = config.dtFrameS / config.substeps;

        this.positionsM = new Float64Array(mesh.restPositionsM);
        this.predictedM = new Float64Array(mesh.restPositionsM);
        this.velocitiesMS = new Float64Array(mesh.vertexCount * 3);
        this.invMass = mesh.inverseMassesPerKg;

        // Copiar aristas finas a SoA
        this.fineEdgeCount = mesh.edges.length;
        this.fineEdgeI = new Uint32Array(this.fineEdgeCount);
        this.fineEdgeJ = new Uint32Array(this.fineEdgeCount);
        this.fineEdgeRestLen = new Float64Array(this.fineEdgeCount);
        this.fineEdgeAlphaTilde = new Float64Array(this.fineEdgeCount);
        this.fineEdgeLambda = new Float64Array(this.fineEdgeCount);

        for (let e = 0; e < this.fineEdgeCount; e++) {
            const edge = mesh.edges[e];
            this.fineEdgeI[e] = edge.i;
            this.fineEdgeJ[e] = edge.j;
            this.fineEdgeRestLen[e] = edge.restLengthM;
            const kStretch = edge.kind === 'shear'
                ? config.shearStiffnessNPerM
                : config.warpWeftStiffnessNPerM;
            this.fineEdgeAlphaTilde[e] = computeXpbdEdgeCompliance(
                kStretch,
                edge.restLengthM,
                edge.tributaryWidthM,
                this.substepDtS
            ).alphaTildePerKg;
        }

        // Copiar bisagras diédricas exactas a SoA
        this.hingeCount = mesh.hinges.length;
        this.hingeV1 = new Uint32Array(this.hingeCount);
        this.hingeV2 = new Uint32Array(this.hingeCount);
        this.hingeV3 = new Uint32Array(this.hingeCount);
        this.hingeV4 = new Uint32Array(this.hingeCount);
        this.hingeRestAngle = new Float64Array(this.hingeCount);
        this.hingeAlphaUp = new Float64Array(this.hingeCount);
        this.hingeAlphaDown = new Float64Array(this.hingeCount);
        this.hingeLambda = new Float64Array(this.hingeCount);

        const bUpNm = selectDirectionalBendingRigidityNm(config.bending, 1);
        const bDownNm = selectDirectionalBendingRigidityNm(config.bending, -1);

        for (let h = 0; h < this.hingeCount; h++) {
            const hinge = mesh.hinges[h];
            this.hingeV1[h] = hinge.v1;
            this.hingeV2[h] = hinge.v2;
            this.hingeV3[h] = hinge.v3;
            this.hingeV4[h] = hinge.v4;
            this.hingeRestAngle[h] = hinge.restAngleRad;
            this.hingeAlphaUp[h] = computeXpbdBendingCompliance(
                bUpNm,
                hinge.hingeLengthM,
                hinge.combinedTriangleAreaM2,
                this.substepDtS
            ).alphaTildePerKgM2;
            this.hingeAlphaDown[h] = computeXpbdBendingCompliance(
                bDownNm,
                hinge.hingeLengthM,
                hinge.combinedTriangleAreaM2,
                this.substepDtS
            ).alphaTildePerKgM2;
        }

        // Construir jerarquía multinivel gruesa -> fina
        this.coarseLevels = [];
        for (const stride of config.coarseStrides) {
            const lvl = buildCoarseLevel(mesh, stride, config, this.substepDtS);
            if (lvl !== null) {
                this.coarseLevels.push(lvl);
            }
        }
    }

    getCoarseLevelSummary(): { stride: number; vertexCount: number; edgeCount: number }[] {
        return this.coarseLevels.map((lvl) => ({
            stride: lvl.stride,
            vertexCount: lvl.vertexCount,
            edgeCount: lvl.edgeCount,
        }));
    }

    stepFrameTimed(
        onPostSubstepCollision?: HierarchicalSubstepCollisionHook,
        collisionStage: 'before-fine-solve' | 'after-fine-solve' = 'after-fine-solve'
    ): HierarchicalPhaseProfile {
        const dtS = this.substepDtS;
        const nSub = this.config.substeps;
        const dampingFactor = Math.exp(-this.config.airDampingPerS * dtS);
        const vCount = this.mesh.vertexCount;
        const invMass = this.invMass;
        const pos = this.positionsM;
        const pred = this.predictedM;
        const vel = this.velocitiesMS;

        let predictMs = 0;
        let hierarchyMs = 0;
        let stretchMs = 0;
        let bendingMs = 0;
        let collisionMs = 0;
        let commitMs = 0;

        for (let sub = 0; sub < nSub; sub++) {
            const t0 = performance.now();
            const gDt = STANDARD_GRAVITY_M_S2 * dtS;
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
                const vy = (vel[base + 1] - gDt) * dampingFactor;
                const vz = vel[base + 2] * dampingFactor;
                vel[base] = vx;
                vel[base + 1] = vy;
                vel[base + 2] = vz;

                pred[base] = pos[base] + vx * dtS;
                pred[base + 1] = pos[base + 1] + vy * dtS;
                pred[base + 2] = pos[base + 2] + vz * dtS;
            }
            const t1 = performance.now();
            predictMs += t1 - t0;

            // Fase multinivel jerárquica (grueso -> fino) antes del suavizado fino XPBD
            if (this.coarseLevels.length > 0 && this.config.coarseIterationsPerLevel > 0) {
                this.solveCoarseHierarchyAndProlongate();
            }
            const t2 = performance.now();
            hierarchyMs += t2 - t1;

            if (onPostSubstepCollision !== undefined && collisionStage === 'before-fine-solve') {
                const tc0 = performance.now();
                onPostSubstepCollision(pred, pos, invMass, dtS, sub);
                collisionMs += performance.now() - tc0;
            }

            // Suavizado fino XPBD SoA con multiplicadores reiniciados por subpaso (T1)
            const ts0 = performance.now();
            this.fineEdgeLambda.fill(0);
            const nStretch = this.config.fineStretchIterationsPerSubstep;
            for (let iter = 0; iter < nStretch; iter++) {
                const reverse = this.config.bidirectionalFineSweep && (iter % 2 === 1);
                this.solveFineStretchSoA(reverse);
            }
            const t3 = performance.now();
            stretchMs += t3 - ts0;

            // Flexión diédrica exacta con signo (FACE_UP / FACE_DOWN) en formato SoA
            this.hingeLambda.fill(0);
            const nBend = this.config.bendingIterationsPerSubstep;
            for (let b = 0; b < nBend; b++) {
                this.solveBendingSoA();
            }
            const t4 = performance.now();
            bendingMs += t4 - t3;

            // Hook opcional de colisión corporal tras flexión (cuando collisionStage === 'after-fine-solve')
            if (onPostSubstepCollision !== undefined && collisionStage === 'after-fine-solve') {
                onPostSubstepCollision(pred, pos, invMass, dtS, sub);
            }
            const t5 = performance.now();
            if (collisionStage === 'after-fine-solve') {
                collisionMs += t5 - t4;
            }

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
            const t6 = performance.now();
            commitMs += t6 - t5;
        }

        return {
            predictMs,
            hierarchyMs,
            stretchMs,
            bendingMs,
            collisionMs,
            commitMs,
            totalMs: predictMs + hierarchyMs + stretchMs + bendingMs + commitMs,
        };
    }

    private solveCoarseHierarchyAndProlongate(): void {
        const pred = this.predictedM;
        const fineInvMass = this.invMass;
        const fCount = this.mesh.vertexCount;
        const omega = this.config.prolongationRelaxation;
        const cIterCount = this.config.coarseIterationsPerLevel;
        const unilateral = this.config.coarseUnilateralOnly;

        for (let l = 0; l < this.coarseLevels.length; l++) {
            const lvl = this.coarseLevels[l];
            const cCount = lvl.vertexCount;
            const cMap = lvl.coarseToFineVertex;
            const pInit = lvl.posInit;
            const pSolved = lvl.posSolved;
            const cInvMass = lvl.coarseInvMass;

            // 1. Inyección desde la malla fina actual (que ya acumula prolongaciones de niveles más gruesos)
            for (let c = 0; c < cCount; c++) {
                const fBase = cMap[c] * 3;
                const cBase = c * 3;
                const x = pred[fBase];
                const y = pred[fBase + 1];
                const z = pred[fBase + 2];
                pInit[cBase] = x;
                pInit[cBase + 1] = y;
                pInit[cBase + 2] = z;
                pSolved[cBase] = x;
                pSolved[cBase + 1] = y;
                pSolved[cBase + 2] = z;
            }

            // 2. Resolución XPBD de aristas gruesas (unilateral C > 0 para evitar locking en pliegues)
            lvl.edgeLambda.fill(0);
            const eCount = lvl.edgeCount;
            const eI = lvl.edgeI;
            const eJ = lvl.edgeJ;
            const eL0 = lvl.edgeRestLen;
            const eAlpha = lvl.edgeAlphaTilde;
            const eLambda = lvl.edgeLambda;

            for (let iter = 0; iter < cIterCount; iter++) {
                const rev = iter % 2 === 1;
                for (let step = 0; step < eCount; step++) {
                    const e = rev ? eCount - 1 - step : step;
                    const i = eI[e];
                    const j = eJ[e];
                    const wi = cInvMass[i];
                    const wj = cInvMass[j];
                    const wSum = wi + wj;
                    if (wSum <= 0) continue;

                    const bi = i * 3;
                    const bj = j * 3;
                    const dx = pSolved[bi] - pSolved[bj];
                    const dy = pSolved[bi + 1] - pSolved[bj + 1];
                    const dz = pSolved[bi + 2] - pSolved[bj + 2];
                    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (len < 1e-10) continue;

                    const c = len - eL0[e];
                    if (unilateral && c <= 0) {
                        continue;
                    }

                    const invLen = 1 / len;
                    const alphaTilde = eAlpha[e];
                    const dLambda = (-c - alphaTilde * eLambda[e]) / (wSum + alphaTilde);
                    eLambda[e] += dLambda;
                    const scale = invLen * dLambda;

                    if (wi > 0) {
                        const s = wi * scale;
                        pSolved[bi] += dx * s;
                        pSolved[bi + 1] += dy * s;
                        pSolved[bi + 2] += dz * s;
                    }
                    if (wj > 0) {
                        const s = wj * scale;
                        pSolved[bj] -= dx * s;
                        pSolved[bj + 1] -= dy * s;
                        pSolved[bj + 2] -= dz * s;
                    }
                }
            }

            // 3. Reutilizar pInit para guardar dP = pSolved - pInit y prolongar bilinealmente hacia pred
            for (let k = 0; k < cCount * 3; k++) {
                pInit[k] = pSolved[k] - pInit[k];
            }

            const p0Arr = lvl.fineParent0;
            const p1Arr = lvl.fineParent1;
            const p2Arr = lvl.fineParent2;
            const p3Arr = lvl.fineParent3;
            const w0Arr = lvl.fineWeight0;
            const w1Arr = lvl.fineWeight1;
            const w2Arr = lvl.fineWeight2;
            const w3Arr = lvl.fineWeight3;

            for (let v = 0; v < fCount; v++) {
                if (fineInvMass[v] === 0) continue;

                const b0 = p0Arr[v] * 3;
                const b1 = p1Arr[v] * 3;
                const b2 = p2Arr[v] * 3;
                const b3 = p3Arr[v] * 3;
                const w0 = w0Arr[v];
                const w1 = w1Arr[v];
                const w2 = w2Arr[v];
                const w3 = w3Arr[v];

                const dx = w0 * pInit[b0] + w1 * pInit[b1] + w2 * pInit[b2] + w3 * pInit[b3];
                const dy = w0 * pInit[b0 + 1] + w1 * pInit[b1 + 1] + w2 * pInit[b2 + 1] + w3 * pInit[b3 + 1];
                const dz = w0 * pInit[b0 + 2] + w1 * pInit[b1 + 2] + w2 * pInit[b2 + 2] + w3 * pInit[b3 + 2];

                const fvBase = v * 3;
                pred[fvBase] += omega * dx;
                pred[fvBase + 1] += omega * dy;
                pred[fvBase + 2] += omega * dz;
            }
        }
    }

    private solveFineStretchSoA(reverse: boolean): void {
        const pred = this.predictedM;
        const invMass = this.invMass;
        const eCount = this.fineEdgeCount;
        const eI = this.fineEdgeI;
        const eJ = this.fineEdgeJ;
        const eL0 = this.fineEdgeRestLen;
        const eAlpha = this.fineEdgeAlphaTilde;
        const eLambda = this.fineEdgeLambda;

        for (let step = 0; step < eCount; step++) {
            const e = reverse ? eCount - 1 - step : step;
            const i = eI[e];
            const j = eJ[e];
            const wi = invMass[i];
            const wj = invMass[j];
            const wSum = wi + wj;
            if (wSum <= 0) continue;

            const bi = i * 3;
            const bj = j * 3;
            const dx = pred[bi] - pred[bj];
            const dy = pred[bi + 1] - pred[bj + 1];
            const dz = pred[bi + 2] - pred[bj + 2];
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (len < 1e-10) continue;

            const c = len - eL0[e];
            const alphaTilde = eAlpha[e];
            const dLambda = (-c - alphaTilde * eLambda[e]) / (wSum + alphaTilde);
            eLambda[e] += dLambda;

            const scale = dLambda / len;
            if (wi > 0) {
                const s = wi * scale;
                pred[bi] += dx * s;
                pred[bi + 1] += dy * s;
                pred[bi + 2] += dz * s;
            }
            if (wj > 0) {
                const s = wj * scale;
                pred[bj] -= dx * s;
                pred[bj + 1] -= dy * s;
                pred[bj + 2] -= dz * s;
            }
        }
    }

    private solveBendingSoA(): void {
        const pred = this.predictedM;
        const invMass = this.invMass;
        const hCount = this.hingeCount;
        const hV1 = this.hingeV1;
        const hV2 = this.hingeV2;
        const hV3 = this.hingeV3;
        const hV4 = this.hingeV4;
        const hRest = this.hingeRestAngle;
        const hAlphaUp = this.hingeAlphaUp;
        const hAlphaDown = this.hingeAlphaDown;
        const hLambda = this.hingeLambda;

        for (let h = 0; h < hCount; h++) {
            const v1 = hV1[h];
            const v2 = hV2[h];
            const v3 = hV3[h];
            const v4 = hV4[h];

            const w1 = invMass[v1];
            const w2 = invMass[v2];
            const w3 = invMass[v3];
            const w4 = invMass[v4];
            if (w1 + w2 + w3 + w4 <= 0) continue;

            const b1 = v1 * 3;
            const b2 = v2 * 3;
            const b3 = v3 * 3;
            const b4 = v4 * 3;

            const x1 = pred[b1]; const y1 = pred[b1 + 1]; const z1 = pred[b1 + 2];
            const ex = pred[b2] - x1; const ey = pred[b2 + 1] - y1; const ez = pred[b2 + 2] - z1;
            const p3x = pred[b3] - x1; const p3y = pred[b3 + 1] - y1; const p3z = pred[b3 + 2] - z1;
            const p4x = pred[b4] - x1; const p4y = pred[b4 + 1] - y1; const p4z = pred[b4 + 2] - z1;

            const eLen = Math.sqrt(ex * ex + ey * ey + ez * ez);
            if (eLen < 1e-10) continue;
            const invE = 1 / eLen;
            const ehx = ex * invE; const ehy = ey * invE; const ehz = ez * invE;

            const n1x = ey * p3z - ez * p3y;
            const n1y = ez * p3x - ex * p3z;
            const n1z = ex * p3y - ey * p3x;
            const a1 = Math.sqrt(n1x * n1x + n1y * n1y + n1z * n1z);

            const n2x = p4y * ez - p4z * ey;
            const n2y = p4z * ex - p4x * ez;
            const n2z = p4x * ey - p4y * ex;
            const a2 = Math.sqrt(n2x * n2x + n2y * n2y + n2z * n2z);

            if (a1 < 1e-12 || a2 < 1e-12) continue;

            const invA1 = 1 / a1;
            const invA2 = 1 / a2;
            const u1x = n1x * invA1; const u1y = n1y * invA1; const u1z = n1z * invA1;
            const u2x = n2x * invA2; const u2y = n2y * invA2; const u2z = n2z * invA2;

            const dotN = u1x * u2x + u1y * u2y + u1z * u2z;
            const cx = u1y * u2z - u1z * u2y;
            const cy = u1z * u2x - u1x * u2z;
            const cz = u1x * u2y - u1y * u2x;
            const sinSign = cx * ehx + cy * ehy + cz * ehz;

            const phi = Math.atan2(sinSign, dotN);
            const c = phi - hRest[h];

            const f3 = -eLen * invA1;
            const f4 = -eLen * invA2;
            const g3x = f3 * u1x; const g3y = f3 * u1y; const g3z = f3 * u1z;
            const g4x = f4 * u2x; const g4y = f4 * u2y; const g4z = f4 * u2z;

            const c13 = p3x * ehx + p3y * ehy + p3z * ehz;
            const c23 = eLen - c13;
            const c14 = p4x * ehx + p4y * ehy + p4z * ehz;
            const c24 = eLen - c14;

            const c23A1 = c23 * invA1;
            const c24A2 = c24 * invA2;
            const g1x = c23A1 * u1x + c24A2 * u2x;
            const g1y = c23A1 * u1y + c24A2 * u2y;
            const g1z = c23A1 * u1z + c24A2 * u2z;

            const c13A1 = c13 * invA1;
            const c14A2 = c14 * invA2;
            const g2x = c13A1 * u1x + c14A2 * u2x;
            const g2y = c13A1 * u1y + c14A2 * u2y;
            const g2z = c13A1 * u1z + c14A2 * u2z;

            const denomGrad =
                w1 * (g1x * g1x + g1y * g1y + g1z * g1z)
                + w2 * (g2x * g2x + g2y * g2y + g2z * g2z)
                + w3 * (g3x * g3x + g3y * g3y + g3z * g3z)
                + w4 * (g4x * g4x + g4y * g4y + g4z * g4z);

            if (denomGrad < 1e-12) continue;

            // Selección direccional V2.6 intacta (FACE_UP si C >= 0, FACE_DOWN si C < 0)
            const alphaTilde = c >= 0 ? hAlphaUp[h] : hAlphaDown[h];
            const dLambda = (-c - alphaTilde * hLambda[h]) / (denomGrad + alphaTilde);
            hLambda[h] += dLambda;

            if (w1 > 0) {
                const s = w1 * dLambda;
                pred[b1] += g1x * s; pred[b1 + 1] += g1y * s; pred[b1 + 2] += g1z * s;
            }
            if (w2 > 0) {
                const s = w2 * dLambda;
                pred[b2] += g2x * s; pred[b2 + 1] += g2y * s; pred[b2 + 2] += g2z * s;
            }
            if (w3 > 0) {
                const s = w3 * dLambda;
                pred[b3] += g3x * s; pred[b3 + 1] += g3y * s; pred[b3 + 2] += g3z * s;
            }
            if (w4 > 0) {
                const s = w4 * dLambda;
                pred[b4] += g4x * s; pred[b4 + 1] += g4y * s; pred[b4 + 2] += g4z * s;
            }
        }
    }
}

