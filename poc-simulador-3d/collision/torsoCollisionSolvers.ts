// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): TRES ALTERNATIVAS DE COLISIÓN (T3)
// Archivo: poc-simulador-3d/collision/torsoCollisionSolvers.ts
// ==============================================================================
// Implementa bajo el mismo modelo de respuesta de contacto (espesor de contacto
// uniforme + proyección normal + fricción de Coulomb por subpaso XPBD) las tres
// alternativas exigidas en T3 del PLAN_POC_SIMULADOR_3D.md:
//   - Alternativa A: Malla de torso refinada + Spatial Hash 3D (con fallback BVH)
//   - Alternativa B: Jerarquía analítica de 10 cápsulas y elipsoides
//   - Alternativa C: Grid SDF 3D uniforme con interpolación trilineal y gradiente
// ==============================================================================

import {
    closestPointOnTriangle3D,
    generateCanonicalTorsoMesh,
    ReferenceTorsoGroundTruth,
    SignedDistanceSample,
    TorsoMeshData,
} from './torsoBodyModel';

export type CollisionAlternativeId =
    | 'ALT_A_MESH_SPATIAL_HASH'
    | 'ALT_B_CAPSULES_ELLIPSOIDS'
    | 'ALT_C_SDF_GRID_3D';

export interface TorsoCollisionParams {
    readonly contactThicknessM: number; // Margen de contacto sobre superficie corporal (p.ej. 0.002 m = 2 mm)
    readonly frictionCoeff: number;     // Coeficiente de fricción de Coulomb tela-maniquí (p.ej. 0.35)
}

export const DEFAULT_TORSO_COLLISION_PARAMS: TorsoCollisionParams = {
    contactThicknessM: 0.002,
    frictionCoeff: 0.35,
};

export interface TorsoColliderInitStats {
    alternativeId: CollisionAlternativeId;
    label: string;
    initMs: number;
    memoryFootprintBytes: number;
    primitiveOrCellSummary: string;
}

export interface TorsoCollider {
    readonly id: CollisionAlternativeId;
    readonly initStats: TorsoColliderInitStats;
    /**
     * Proyecta los vértices en predictedM fuera del cuerpo e incluye fricción
     * tangencial de Coulomb usando positionsM como posición previa del subpaso.
     */
    resolveSubstepCollision(
        predictedM: Float64Array,
        positionsM: Float64Array,
        invMass: Float64Array,
        params: TorsoCollisionParams
    ): void;
    /**
     * Evalúa la distancia con signo reportada por el propio proxy para todos los
     * vértices (sin modificar posiciones), para comparar contra el ground truth.
     */
    evaluateProxySignedDistances(
        positionsM: Float64Array,
        outSignedDistancesM: Float64Array
    ): void;
}

function applyContactProjectionWithCoulombFriction(
    predictedM: Float64Array,
    positionsM: Float64Array,
    baseIdx: number,
    signedDistanceM: number,
    nx: number,
    ny: number,
    nz: number,
    contactThicknessM: number,
    frictionCoeff: number
): void {
    const penetration = contactThicknessM - signedDistanceM;
    if (penetration <= 0) return;

    const pxBefore = predictedM[baseIdx];
    const pyBefore = predictedM[baseIdx + 1];
    const pzBefore = predictedM[baseIdx + 2];

    // Proyección normal hacia fuera de la superficie + margen de espesor
    let px = pxBefore + nx * penetration;
    let py = pyBefore + ny * penetration;
    let pz = pzBefore + nz * penetration;

    // Fricción tangencial de Coulomb basada en desplazamiento del subpaso
    if (frictionCoeff > 0) {
        const dx = px - positionsM[baseIdx];
        const dy = py - positionsM[baseIdx + 1];
        const dz = pz - positionsM[baseIdx + 2];

        const dNormal = dx * nx + dy * ny + dz * nz;
        const tx = dx - dNormal * nx;
        const ty = dy - dNormal * ny;
        const tz = dz - dNormal * nz;
        const tangLen = Math.hypot(tx, ty, tz);

        if (tangLen > 1e-11) {
            const maxFrictionDisp = frictionCoeff * penetration;
            const scale = tangLen <= maxFrictionDisp ? 1.0 : maxFrictionDisp / tangLen;
            px -= tx * scale;
            py -= ty * scale;
            pz -= tz * scale;
        }
    }

    predictedM[baseIdx] = px;
    predictedM[baseIdx + 1] = py;
    predictedM[baseIdx + 2] = pz;
}

// ==============================================================================
// BVH COMPACTO DE SOPORTE (usado como fallback de Alternativa A y builder de C)
// ==============================================================================

interface BvhNode {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
    left: number;      // >= 0 si nodo interno
    right: number;
    triStart: number;  // >= 0 si hoja
    triCount: number;
}

function pointToAabbDistSq(
    px: number, py: number, pz: number,
    minX: number, minY: number, minZ: number,
    maxX: number, maxY: number, maxZ: number
): number {
    const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
    const dy = py < minY ? minY - py : py > maxY ? py - maxY : 0;
    const dz = pz < minZ ? minZ - pz : pz > maxZ ? pz - maxZ : 0;
    return dx * dx + dy * dy + dz * dz;
}

export class CompactTriangleBvh {
    readonly mesh: TorsoMeshData;
    private readonly triOrder: Uint32Array;
    private readonly triMinX: Float64Array;
    private readonly triMinY: Float64Array;
    private readonly triMinZ: Float64Array;
    private readonly triMaxX: Float64Array;
    private readonly triMaxY: Float64Array;
    private readonly triMaxZ: Float64Array;
    private readonly nodes: BvhNode[] = [];
    // Pila reutilizable sin asignaciones en runtime
    private readonly stack = new Int32Array(128);

    constructor(mesh: TorsoMeshData) {
        this.mesh = mesh;
        const tCount = mesh.triangleCount;
        this.triOrder = new Uint32Array(tCount);
        this.triMinX = new Float64Array(tCount);
        this.triMinY = new Float64Array(tCount);
        this.triMinZ = new Float64Array(tCount);
        this.triMaxX = new Float64Array(tCount);
        this.triMaxY = new Float64Array(tCount);
        this.triMaxZ = new Float64Array(tCount);

        const pos = mesh.positionsM;
        const idx = mesh.indices;
        const centX = new Float64Array(tCount);
        const centY = new Float64Array(tCount);
        const centZ = new Float64Array(tCount);

        for (let t = 0; t < tCount; t++) {
            this.triOrder[t] = t;
            const a = idx[t * 3] * 3;
            const b = idx[t * 3 + 1] * 3;
            const c = idx[t * 3 + 2] * 3;

            this.triMinX[t] = Math.min(pos[a], pos[b], pos[c]);
            this.triMinY[t] = Math.min(pos[a + 1], pos[b + 1], pos[c + 1]);
            this.triMinZ[t] = Math.min(pos[a + 2], pos[b + 2], pos[c + 2]);
            this.triMaxX[t] = Math.max(pos[a], pos[b], pos[c]);
            this.triMaxY[t] = Math.max(pos[a + 1], pos[b + 1], pos[c + 1]);
            this.triMaxZ[t] = Math.max(pos[a + 2], pos[b + 2], pos[c + 2]);

            centX[t] = (pos[a] + pos[b] + pos[c]) / 3;
            centY[t] = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3;
            centZ[t] = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
        }

        const build = (start: number, count: number): number => {
            let minX = Infinity; let minY = Infinity; let minZ = Infinity;
            let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
            for (let k = 0; k < count; k++) {
                const t = this.triOrder[start + k];
                if (this.triMinX[t] < minX) minX = this.triMinX[t];
                if (this.triMinY[t] < minY) minY = this.triMinY[t];
                if (this.triMinZ[t] < minZ) minZ = this.triMinZ[t];
                if (this.triMaxX[t] > maxX) maxX = this.triMaxX[t];
                if (this.triMaxY[t] > maxY) maxY = this.triMaxY[t];
                if (this.triMaxZ[t] > maxZ) maxZ = this.triMaxZ[t];
            }

            const nodeIdx = this.nodes.length;
            if (count <= 8) {
                this.nodes.push({
                    minX, minY, minZ, maxX, maxY, maxZ,
                    left: -1, right: -1, triStart: start, triCount: count,
                });
                return nodeIdx;
            }

            const sx = maxX - minX;
            const sy = maxY - minY;
            const sz = maxZ - minZ;
            const centArr = sx >= sy && sx >= sz ? centX : sy >= sz ? centY : centZ;

            let cMin = Infinity;
            let cMax = -Infinity;
            for (let k = 0; k < count; k++) {
                const cv = centArr[this.triOrder[start + k]];
                if (cv < cMin) cMin = cv;
                if (cv > cMax) cMax = cv;
            }
            const midVal = 0.5 * (cMin + cMax);

            let i = start;
            let j = start + count - 1;
            while (i <= j) {
                while (i <= j && centArr[this.triOrder[i]] <= midVal) i++;
                while (i <= j && centArr[this.triOrder[j]] > midVal) j--;
                if (i < j) {
                    const tmp = this.triOrder[i];
                    this.triOrder[i] = this.triOrder[j];
                    this.triOrder[j] = tmp;
                    i++;
                    j--;
                }
            }

            let leftCount = i - start;
            if (leftCount === 0 || leftCount === count) {
                leftCount = Math.floor(count / 2);
            }

            this.nodes.push({
                minX, minY, minZ, maxX, maxY, maxZ,
                left: -1, right: -1, triStart: -1, triCount: 0,
            });
            const leftIdx = build(start, leftCount);
            const rightIdx = build(start + leftCount, count - leftCount);
            this.nodes[nodeIdx].left = leftIdx;
            this.nodes[nodeIdx].right = rightIdx;
            return nodeIdx;
        };

        build(0, tCount);
    }

    queryClosestSigned(px: number, py: number, pz: number): SignedDistanceSample {
        const pos = this.mesh.positionsM;
        const idx = this.mesh.indices;
        const vNorm = this.mesh.vertexNormals;
        const nodes = this.nodes;
        const stack = this.stack;

        let bestDistSq = Infinity;
        let bestTri = 0;
        let bestX = 0; let bestY = 0; let bestZ = 0;
        let bestU = 1; let bestV = 0; let bestW = 0;

        let sp = 0;
        stack[sp++] = 0;

        while (sp > 0) {
            const node = nodes[stack[--sp]];
            const boxDistSq = pointToAabbDistSq(
                px, py, pz,
                node.minX, node.minY, node.minZ,
                node.maxX, node.maxY, node.maxZ
            );
            if (boxDistSq >= bestDistSq) continue;

            if (node.triCount > 0) {
                const end = node.triStart + node.triCount;
                for (let k = node.triStart; k < end; k++) {
                    const t = this.triOrder[k];
                    const tbDist = pointToAabbDistSq(
                        px, py, pz,
                        this.triMinX[t], this.triMinY[t], this.triMinZ[t],
                        this.triMaxX[t], this.triMaxY[t], this.triMaxZ[t]
                    );
                    if (tbDist >= bestDistSq) continue;

                    const i0 = idx[t * 3] * 3;
                    const i1 = idx[t * 3 + 1] * 3;
                    const i2 = idx[t * 3 + 2] * 3;
                    const cp = closestPointOnTriangle3D(
                        px, py, pz,
                        pos[i0], pos[i0 + 1], pos[i0 + 2],
                        pos[i1], pos[i1 + 1], pos[i1 + 2],
                        pos[i2], pos[i2 + 1], pos[i2 + 2]
                    );
                    if (cp.distSq < bestDistSq) {
                        bestDistSq = cp.distSq;
                        bestTri = t;
                        bestX = cp.x; bestY = cp.y; bestZ = cp.z;
                        bestU = cp.u; bestV = cp.v; bestW = cp.w;
                    }
                }
            } else {
                const lNode = nodes[node.left];
                const rNode = nodes[node.right];
                const dL = pointToAabbDistSq(px, py, pz, lNode.minX, lNode.minY, lNode.minZ, lNode.maxX, lNode.maxY, lNode.maxZ);
                const dR = pointToAabbDistSq(px, py, pz, rNode.minX, rNode.minY, rNode.minZ, rNode.maxX, rNode.maxY, rNode.maxZ);
                if (dL < dR) {
                    if (dR < bestDistSq) stack[sp++] = node.right;
                    if (dL < bestDistSq) stack[sp++] = node.left;
                } else {
                    if (dL < bestDistSq) stack[sp++] = node.left;
                    if (dR < bestDistSq) stack[sp++] = node.right;
                }
            }
        }

        const ti0 = idx[bestTri * 3] * 3;
        const ti1 = idx[bestTri * 3 + 1] * 3;
        const ti2 = idx[bestTri * 3 + 2] * 3;
        let nx = vNorm[ti0] * bestU + vNorm[ti1] * bestV + vNorm[ti2] * bestW;
        let ny = vNorm[ti0 + 1] * bestU + vNorm[ti1 + 1] * bestV + vNorm[ti2 + 1] * bestW;
        let nz = vNorm[ti0 + 2] * bestU + vNorm[ti1 + 2] * bestV + vNorm[ti2 + 2] * bestW;
        const nLen = Math.hypot(nx, ny, nz);
        if (nLen > 1e-12) {
            nx /= nLen; ny /= nLen; nz /= nLen;
        } else {
            nx = this.mesh.triangleNormals[bestTri * 3];
            ny = this.mesh.triangleNormals[bestTri * 3 + 1];
            nz = this.mesh.triangleNormals[bestTri * 3 + 2];
        }

        const vx = px - bestX;
        const vy = py - bestY;
        const vz = pz - bestZ;
        const dot = vx * nx + vy * ny + vz * nz;
        const sign = dot >= 0 ? 1 : -1;

        return {
            signedDistanceM: sign * Math.sqrt(bestDistSq),
            normalX: nx,
            normalY: ny,
            normalZ: nz,
            closestX: bestX,
            closestY: bestY,
            closestZ: bestZ,
        };
    }

    getNodeCount(): number {
        return this.nodes.length;
    }
}

// ==============================================================================
// ALTERNATIVA A: MALLA REFINADA DE TORSO + SPATIAL HASH 3D (CON FALLBACK BVH)
// ==============================================================================

export class MeshSpatialHashCollider implements TorsoCollider {
    readonly id: CollisionAlternativeId = 'ALT_A_MESH_SPATIAL_HASH';
    readonly initStats: TorsoColliderInitStats;
    readonly mesh: TorsoMeshData;

    private readonly bvh: CompactTriangleBvh;
    private readonly cellSizeM: number;
    private readonly invCellSize: number;
    private readonly searchMarginM: number;
    private readonly originX: number;
    private readonly originY: number;
    private readonly originZ: number;
    private readonly nxCells: number;
    private readonly nyCells: number;
    private readonly nzCells: number;
    private readonly cellOffsets: Int32Array;
    private readonly cellTriIndices: Uint32Array;
    private readonly cellInsideMask: Uint8Array;
    private readonly triMinX: Float64Array;
    private readonly triMinY: Float64Array;
    private readonly triMinZ: Float64Array;
    private readonly triMaxX: Float64Array;
    private readonly triMaxY: Float64Array;
    private readonly triMaxZ: Float64Array;

    constructor(
        radialSegments: number = 64,
        verticalRings: number = 72,
        cellSizeM: number = 0.022,
        searchMarginM: number = 0.005
    ) {
        const t0 = performance.now();
        this.mesh = generateCanonicalTorsoMesh(radialSegments, verticalRings);
        this.bvh = new CompactTriangleBvh(this.mesh);
        this.cellSizeM = cellSizeM;
        this.invCellSize = 1 / cellSizeM;
        this.searchMarginM = searchMarginM;

        const pad = searchMarginM + cellSizeM;
        const [bMinX, bMinY, bMinZ] = this.mesh.boundingBoxMinM;
        const [bMaxX, bMaxY, bMaxZ] = this.mesh.boundingBoxMaxM;

        this.originX = bMinX - pad;
        this.originY = bMinY - pad;
        this.originZ = bMinZ - pad;
        this.nxCells = Math.ceil((bMaxX - bMinX + 2 * pad) / cellSizeM);
        this.nyCells = Math.ceil((bMaxY - bMinY + 2 * pad) / cellSizeM);
        this.nzCells = Math.ceil((bMaxZ - bMinZ + 2 * pad) / cellSizeM);

        const totalCells = this.nxCells * this.nyCells * this.nzCells;
        const counts = new Int32Array(totalCells);
        const pos = this.mesh.positionsM;
        const idx = this.mesh.indices;
        const tCount = this.mesh.triangleCount;

        this.triMinX = new Float64Array(tCount);
        this.triMinY = new Float64Array(tCount);
        this.triMinZ = new Float64Array(tCount);
        this.triMaxX = new Float64Array(tCount);
        this.triMaxY = new Float64Array(tCount);
        this.triMaxZ = new Float64Array(tCount);

        // Paso 1: contar entradas por celda del Spatial Hash con margen de consulta
        for (let t = 0; t < tCount; t++) {
            const a = idx[t * 3] * 3;
            const b = idx[t * 3 + 1] * 3;
            const c = idx[t * 3 + 2] * 3;
            const minX = Math.min(pos[a], pos[b], pos[c]) - searchMarginM;
            const minY = Math.min(pos[a + 1], pos[b + 1], pos[c + 1]) - searchMarginM;
            const minZ = Math.min(pos[a + 2], pos[b + 2], pos[c + 2]) - searchMarginM;
            const maxX = Math.max(pos[a], pos[b], pos[c]) + searchMarginM;
            const maxY = Math.max(pos[a + 1], pos[b + 1], pos[c + 1]) + searchMarginM;
            const maxZ = Math.max(pos[a + 2], pos[b + 2], pos[c + 2]) + searchMarginM;

            this.triMinX[t] = minX;
            this.triMinY[t] = minY;
            this.triMinZ[t] = minZ;
            this.triMaxX[t] = maxX;
            this.triMaxY[t] = maxY;
            this.triMaxZ[t] = maxZ;

            const ix0 = Math.max(0, Math.floor((minX - this.originX) * this.invCellSize));
            const iy0 = Math.max(0, Math.floor((minY - this.originY) * this.invCellSize));
            const iz0 = Math.max(0, Math.floor((minZ - this.originZ) * this.invCellSize));
            const ix1 = Math.min(this.nxCells - 1, Math.floor((maxX - this.originX) * this.invCellSize));
            const iy1 = Math.min(this.nyCells - 1, Math.floor((maxY - this.originY) * this.invCellSize));
            const iz1 = Math.min(this.nzCells - 1, Math.floor((maxZ - this.originZ) * this.invCellSize));

            for (let iz = iz0; iz <= iz1; iz++) {
                for (let iy = iy0; iy <= iy1; iy++) {
                    const rowBase = (iz * this.nyCells + iy) * this.nxCells;
                    for (let ix = ix0; ix <= ix1; ix++) {
                        counts[rowBase + ix]++;
                    }
                }
            }
        }

        // Prefix sum plano en CSR (Compressed Sparse Row)
        this.cellOffsets = new Int32Array(totalCells + 1);
        for (let c = 0; c < totalCells; c++) {
            this.cellOffsets[c + 1] = this.cellOffsets[c] + counts[c];
        }

        const totalEntries = this.cellOffsets[totalCells];
        this.cellTriIndices = new Uint32Array(totalEntries);
        const writeCursor = new Int32Array(this.cellOffsets.subarray(0, totalCells));

        // Paso 2: rellenar índices de triángulos por celda
        for (let t = 0; t < tCount; t++) {
            const minX = this.triMinX[t];
            const minY = this.triMinY[t];
            const minZ = this.triMinZ[t];
            const maxX = this.triMaxX[t];
            const maxY = this.triMaxY[t];
            const maxZ = this.triMaxZ[t];

            const ix0 = Math.max(0, Math.floor((minX - this.originX) * this.invCellSize));
            const iy0 = Math.max(0, Math.floor((minY - this.originY) * this.invCellSize));
            const iz0 = Math.max(0, Math.floor((minZ - this.originZ) * this.invCellSize));
            const ix1 = Math.min(this.nxCells - 1, Math.floor((maxX - this.originX) * this.invCellSize));
            const iy1 = Math.min(this.nyCells - 1, Math.floor((maxY - this.originY) * this.invCellSize));
            const iz1 = Math.min(this.nzCells - 1, Math.floor((maxZ - this.originZ) * this.invCellSize));

            for (let iz = iz0; iz <= iz1; iz++) {
                for (let iy = iy0; iy <= iy1; iy++) {
                    const rowBase = (iz * this.nyCells + iy) * this.nxCells;
                    for (let ix = ix0; ix <= ix1; ix++) {
                        const cell = rowBase + ix;
                        this.cellTriIndices[writeCursor[cell]++] = t;
                    }
                }
            }
        }

        // Paso 3: máscara de celdas interiores (< +1 mm para evitar fallback BVH en espacio libre exterior)
        this.cellInsideMask = new Uint8Array(totalCells);
        const insideProbeThreshM = 0.001;
        for (let iz = 0; iz < this.nzCells; iz++) {
            const cz = this.originZ + (iz + 0.5) * cellSizeM;
            for (let iy = 0; iy < this.nyCells; iy++) {
                const cy = this.originY + (iy + 0.5) * cellSizeM;
                const rowBase = (iz * this.nyCells + iy) * this.nxCells;
                for (let ix = 0; ix < this.nxCells; ix++) {
                    const cell = rowBase + ix;
                    const cx = this.originX + (ix + 0.5) * cellSizeM;
                    if (this.bvh.queryClosestSigned(cx, cy, cz).signedDistanceM < insideProbeThreshM) {
                        this.cellInsideMask[cell] = 1;
                    }
                }
            }
        }

        const initMs = performance.now() - t0;
        const memBytes =
            this.mesh.positionsM.byteLength
            + this.mesh.vertexNormals.byteLength
            + this.mesh.indices.byteLength
            + this.mesh.triangleNormals.byteLength
            + this.cellOffsets.byteLength
            + this.cellTriIndices.byteLength
            + this.cellInsideMask.byteLength
            + this.triMinX.byteLength * 6
            + this.bvh.getNodeCount() * 64;

        this.initStats = {
            alternativeId: this.id,
            label: 'Malla Torso Refinada + Spatial Hash 3D (con fallback BVH)',
            initMs,
            memoryFootprintBytes: memBytes,
            primitiveOrCellSummary: `${this.mesh.triangleCount} triángulos, Spatial Hash ${this.nxCells}x${this.nyCells}x${this.nzCells} (${Math.round(cellSizeM * 1000)} mm), ${this.cellTriIndices.length} refs`,
        };
    }

    private queryPoint(px: number, py: number, pz: number, contactMarginM: number): SignedDistanceSample | null {
        const bMin = this.mesh.boundingBoxMinM;
        const bMax = this.mesh.boundingBoxMaxM;
        if (
            px < bMin[0] - contactMarginM || px > bMax[0] + contactMarginM
            || py < bMin[1] - contactMarginM || py > bMax[1] + contactMarginM
            || pz < bMin[2] - contactMarginM || pz > bMax[2] + contactMarginM
        ) {
            return null;
        }

        const ix = Math.floor((px - this.originX) * this.invCellSize);
        const iy = Math.floor((py - this.originY) * this.invCellSize);
        const iz = Math.floor((pz - this.originZ) * this.invCellSize);

        if (
            ix >= 0 && ix < this.nxCells
            && iy >= 0 && iy < this.nyCells
            && iz >= 0 && iz < this.nzCells
        ) {
            const cell = (iz * this.nyCells + iy) * this.nxCells + ix;
            const start = this.cellOffsets[cell];
            const end = this.cellOffsets[cell + 1];

            if (end === start) {
                return this.cellInsideMask[cell] === 1
                    ? this.bvh.queryClosestSigned(px, py, pz)
                    : null;
            }

            const pos = this.mesh.positionsM;
            const idx = this.mesh.indices;
            const vNorm = this.mesh.vertexNormals;
            let bestDistSq = this.searchMarginM * this.searchMarginM;
            let bestTri = -1;
            let bestX = 0; let bestY = 0; let bestZ = 0;
            let bestU = 1; let bestV = 0; let bestW = 0;

            for (let k = start; k < end; k++) {
                const t = this.cellTriIndices[k];
                if (
                    px < this.triMinX[t] || px > this.triMaxX[t]
                    || py < this.triMinY[t] || py > this.triMaxY[t]
                    || pz < this.triMinZ[t] || pz > this.triMaxZ[t]
                ) {
                    continue;
                }
                const i0 = idx[t * 3] * 3;
                const i1 = idx[t * 3 + 1] * 3;
                const i2 = idx[t * 3 + 2] * 3;

                const cp = closestPointOnTriangle3D(
                    px, py, pz,
                    pos[i0], pos[i0 + 1], pos[i0 + 2],
                    pos[i1], pos[i1 + 1], pos[i1 + 2],
                    pos[i2], pos[i2 + 1], pos[i2 + 2]
                );
                if (cp.distSq < bestDistSq) {
                    bestDistSq = cp.distSq;
                    bestTri = t;
                    bestX = cp.x; bestY = cp.y; bestZ = cp.z;
                    bestU = cp.u; bestV = cp.v; bestW = cp.w;
                }
            }

            if (bestTri >= 0) {
                const ti0 = idx[bestTri * 3] * 3;
                const ti1 = idx[bestTri * 3 + 1] * 3;
                const ti2 = idx[bestTri * 3 + 2] * 3;
                let nx = vNorm[ti0] * bestU + vNorm[ti1] * bestV + vNorm[ti2] * bestW;
                let ny = vNorm[ti0 + 1] * bestU + vNorm[ti1 + 1] * bestV + vNorm[ti2 + 1] * bestW;
                let nz = vNorm[ti0 + 2] * bestU + vNorm[ti1 + 2] * bestV + vNorm[ti2 + 2] * bestW;
                const nLen = Math.hypot(nx, ny, nz);
                if (nLen > 1e-12) {
                    nx /= nLen; ny /= nLen; nz /= nLen;
                } else {
                    nx = this.mesh.triangleNormals[bestTri * 3];
                    ny = this.mesh.triangleNormals[bestTri * 3 + 1];
                    nz = this.mesh.triangleNormals[bestTri * 3 + 2];
                }

                const vx = px - bestX;
                const vy = py - bestY;
                const vz = pz - bestZ;
                const dot = vx * nx + vy * ny + vz * nz;
                const sign = dot >= 0 ? 1 : -1;

                return {
                    signedDistanceM: sign * Math.sqrt(bestDistSq),
                    normalX: nx,
                    normalY: ny,
                    normalZ: nz,
                    closestX: bestX,
                    closestY: bestY,
                    closestZ: bestZ,
                };
            }

            return this.cellInsideMask[cell] === 1
                ? this.bvh.queryClosestSigned(px, py, pz)
                : null;
        }

        return null;
    }

    resolveSubstepCollision(
        predictedM: Float64Array,
        positionsM: Float64Array,
        invMass: Float64Array,
        params: TorsoCollisionParams
    ): void {
        const vCount = invMass.length;
        const margin = params.contactThicknessM;
        const mu = params.frictionCoeff;

        for (let i = 0; i < vCount; i++) {
            if (invMass[i] === 0) continue;
            const base = i * 3;
            const px = predictedM[base];
            const py = predictedM[base + 1];
            const pz = predictedM[base + 2];

            const sample = this.queryPoint(px, py, pz, margin);
            if (sample === null || sample.signedDistanceM >= margin) continue;

            applyContactProjectionWithCoulombFriction(
                predictedM,
                positionsM,
                base,
                sample.signedDistanceM,
                sample.normalX,
                sample.normalY,
                sample.normalZ,
                margin,
                mu
            );
        }
    }

    evaluateProxySignedDistances(positionsM: Float64Array, outSignedDistancesM: Float64Array): void {
        const vCount = outSignedDistancesM.length;
        for (let i = 0; i < vCount; i++) {
            const base = i * 3;
            outSignedDistancesM[i] = this.bvh.queryClosestSigned(
                positionsM[base],
                positionsM[base + 1],
                positionsM[base + 2]
            ).signedDistanceM;
        }
    }
}

// ==============================================================================
// ALTERNATIVA B: 10 PRIMITIVAS ANALÍTICAS (CÁPSULAS Y ELIPSOIDES)
// ==============================================================================

type AnalyticPrimitive =
    | {
        kind: 'capsule';
        name: string;
        ax: number; ay: number; az: number;
        bx: number; by: number; bz: number;
        radiusM: number;
    }
    | {
        kind: 'ellipsoid';
        name: string;
        cx: number; cy: number; cz: number;
        rx: number; ry: number; rz: number;
    };

// 10 primitivas ajustadas a las 11 capas paramétricas de CANONICAL_TORSO_LAYERS
// (rango exigido en T3: 8 a 12 cápsulas o elipsoides).
export const CANONICAL_TORSO_ANALYTIC_PRIMITIVES: readonly AnalyticPrimitive[] = [
    // 1. Cuello vertical + cúpula superior
    { kind: 'capsule', name: 'neck_core', ax: 0, ay: 0.785, az: 0, bx: 0, by: 0.824, bz: 0, radiusM: 0.064 },
    // 2. Barra escapular/clavicular (hombros izquierda-derecha)
    { kind: 'capsule', name: 'shoulder_yoke', ax: -0.112, ay: 0.720, az: 0.000, bx: 0.112, by: 0.720, bz: 0.000, radiusM: 0.068 },
    // 3. Deltoide / hombro izquierdo
    { kind: 'ellipsoid', name: 'shoulder_left', cx: -0.128, cy: 0.755, cz: 0.002, rx: 0.062, ry: 0.045, rz: 0.072 },
    // 4. Deltoide / hombro derecho
    { kind: 'ellipsoid', name: 'shoulder_right', cx: 0.128, cy: 0.755, cz: 0.002, rx: 0.062, ry: 0.045, rz: 0.072 },
    // 5. Tórax superior (alto_busto)
    { kind: 'ellipsoid', name: 'upper_chest', cx: 0, cy: 0.630, cz: 0.018, rx: 0.168, ry: 0.115, rz: 0.110 },
    // 6. Bloque torso central busto_apex -> bajo_busto
    { kind: 'ellipsoid', name: 'mid_bust_torso', cx: 0, cy: 0.495, cz: 0.042, rx: 0.174, ry: 0.145, rz: 0.155 },
    // 7. Copa busto izquierda
    { kind: 'ellipsoid', name: 'bust_left', cx: -0.068, cy: 0.520, cz: 0.112, rx: 0.078, ry: 0.080, rz: 0.090 },
    // 8. Copa busto derecha
    { kind: 'ellipsoid', name: 'bust_right', cx: 0.068, cy: 0.520, cz: 0.112, rx: 0.078, ry: 0.080, rz: 0.090 },
    // 9. Cintura y torso medio
    { kind: 'ellipsoid', name: 'waist_core', cx: 0, cy: 0.230, cz: 0.006, rx: 0.138, ry: 0.155, rz: 0.098 },
    // 10. Pelvis y cadera completa (cadera_alta -> base_torso)
    { kind: 'ellipsoid', name: 'pelvis_hip', cx: 0, cy: -0.140, cz: 0.018, rx: 0.198, ry: 0.305, rz: 0.158 },
];

function evaluateAnalyticPrimitive(
    p: AnalyticPrimitive,
    px: number,
    py: number,
    pz: number
): { sd: number; nx: number; ny: number; nz: number } {
    if (p.kind === 'capsule') {
        const abx = p.bx - p.ax;
        const aby = p.by - p.ay;
        const abz = p.bz - p.az;
        const abLenSq = abx * abx + aby * aby + abz * abz;
        let t = 0;
        if (abLenSq > 1e-12) {
            t = ((px - p.ax) * abx + (py - p.ay) * aby + (pz - p.az) * abz) / abLenSq;
            if (t < 0) t = 0;
            else if (t > 1) t = 1;
        }
        const cx = p.ax + t * abx;
        const cy = p.ay + t * aby;
        const cz = p.az + t * abz;
        const dx = px - cx;
        const dy = py - cy;
        const dz = pz - cz;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 1e-12) {
            const inv = 1 / dist;
            return { sd: dist - p.radiusM, nx: dx * inv, ny: dy * inv, nz: dz * inv };
        }
        return { sd: -p.radiusM, nx: 0, ny: 1, nz: 0 };
    }

    // Elipsoide: aproximación euclídea suave de Quílez + gradiente normal analítico exacto
    const dx = px - p.cx;
    const dy = py - p.cy;
    const dz = pz - p.cz;
    const qx = dx / p.rx;
    const qy = dy / p.ry;
    const qz = dz / p.rz;
    const k0 = Math.hypot(qx, qy, qz);
    if (k0 < 1e-10) {
        const minR = Math.min(p.rx, p.ry, p.rz);
        return { sd: -minR, nx: 0, ny: 1, nz: 0 };
    }

    const gx = dx / (p.rx * p.rx);
    const gy = dy / (p.ry * p.ry);
    const gz = dz / (p.rz * p.rz);
    const k1 = Math.hypot(gx, gy, gz);
    const invK1 = k1 > 1e-12 ? 1 / k1 : 0;

    return {
        sd: k0 * (k0 - 1.0) * invK1,
        nx: gx * invK1,
        ny: gy * invK1,
        nz: gz * invK1,
    };
}

export class CapsulesEllipsoidsCollider implements TorsoCollider {
    readonly id: CollisionAlternativeId = 'ALT_B_CAPSULES_ELLIPSOIDS';
    readonly initStats: TorsoColliderInitStats;
    readonly primitives: readonly AnalyticPrimitive[];

    constructor(primitives: readonly AnalyticPrimitive[] = CANONICAL_TORSO_ANALYTIC_PRIMITIVES) {
        const t0 = performance.now();
        this.primitives = primitives;
        const initMs = performance.now() - t0;

        this.initStats = {
            alternativeId: this.id,
            label: 'Jerarquía Analítica de 10 Primitivas (2 Cápsulas + 8 Elipsoides)',
            initMs,
            memoryFootprintBytes: primitives.length * 64,
            primitiveOrCellSummary: `${primitives.length} primitivas analíticas exactas (O(N_verts * ${primitives.length}))`,
        };
    }

    evaluateUnionSignedDistance(px: number, py: number, pz: number): { sd: number; nx: number; ny: number; nz: number } {
        let bestSd = Infinity;
        let bestNx = 0;
        let bestNy = 1;
        let bestNz = 0;

        const prims = this.primitives;
        for (let k = 0; k < prims.length; k++) {
            const res = evaluateAnalyticPrimitive(prims[k], px, py, pz);
            if (res.sd < bestSd) {
                bestSd = res.sd;
                bestNx = res.nx;
                bestNy = res.ny;
                bestNz = res.nz;
            }
        }
        return { sd: bestSd, nx: bestNx, ny: bestNy, nz: bestNz };
    }

    resolveSubstepCollision(
        predictedM: Float64Array,
        positionsM: Float64Array,
        invMass: Float64Array,
        params: TorsoCollisionParams
    ): void {
        const vCount = invMass.length;
        const margin = params.contactThicknessM;
        const mu = params.frictionCoeff;
        const prims = this.primitives;
        const pLen = prims.length;

        for (let i = 0; i < vCount; i++) {
            if (invMass[i] === 0) continue;
            const base = i * 3;
            const px = predictedM[base];
            const py = predictedM[base + 1];
            const pz = predictedM[base + 2];

            // Poda rápida de caja global del torso
            if (py < -0.49 || py > 0.92 || Math.abs(px) > 0.25 || pz < -0.22 || pz > 0.25) {
                continue;
            }

            let bestSd = Infinity;
            let bestNx = 0;
            let bestNy = 1;
            let bestNz = 0;

            for (let k = 0; k < pLen; k++) {
                const p = prims[k];
                let sd: number;
                let nx: number;
                let ny: number;
                let nz: number;

                if (p.kind === 'capsule') {
                    const abx = p.bx - p.ax;
                    const aby = p.by - p.ay;
                    const abz = p.bz - p.az;
                    const abLenSq = abx * abx + aby * aby + abz * abz;
                    let t = 0;
                    if (abLenSq > 1e-12) {
                        t = ((px - p.ax) * abx + (py - p.ay) * aby + (pz - p.az) * abz) / abLenSq;
                        if (t < 0) t = 0;
                        else if (t > 1) t = 1;
                    }
                    const dx = px - (p.ax + t * abx);
                    const dy = py - (p.ay + t * aby);
                    const dz = pz - (p.az + t * abz);
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist > 1e-12) {
                        const inv = 1 / dist;
                        sd = dist - p.radiusM;
                        nx = dx * inv;
                        ny = dy * inv;
                        nz = dz * inv;
                    } else {
                        sd = -p.radiusM;
                        nx = 0;
                        ny = 1;
                        nz = 0;
                    }
                } else {
                    const dx = px - p.cx;
                    const dy = py - p.cy;
                    const dz = pz - p.cz;
                    const qx = dx / p.rx;
                    const qy = dy / p.ry;
                    const qz = dz / p.rz;
                    const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz);
                    if (k0 < 1e-10) {
                        sd = -Math.min(p.rx, p.ry, p.rz);
                        nx = 0;
                        ny = 1;
                        nz = 0;
                    } else {
                        const gx = dx / (p.rx * p.rx);
                        const gy = dy / (p.ry * p.ry);
                        const gz = dz / (p.rz * p.rz);
                        const k1 = Math.sqrt(gx * gx + gy * gy + gz * gz);
                        const invK1 = k1 > 1e-12 ? 1 / k1 : 0;
                        sd = k0 * (k0 - 1.0) * invK1;
                        nx = gx * invK1;
                        ny = gy * invK1;
                        nz = gz * invK1;
                    }
                }

                if (sd < bestSd) {
                    bestSd = sd;
                    bestNx = nx;
                    bestNy = ny;
                    bestNz = nz;
                }
            }

            if (bestSd >= margin) continue;

            applyContactProjectionWithCoulombFriction(
                predictedM,
                positionsM,
                base,
                bestSd,
                bestNx,
                bestNy,
                bestNz,
                margin,
                mu
            );
        }
    }

    evaluateProxySignedDistances(positionsM: Float64Array, outSignedDistancesM: Float64Array): void {
        const vCount = outSignedDistancesM.length;
        for (let i = 0; i < vCount; i++) {
            const base = i * 3;
            outSignedDistancesM[i] = this.evaluateUnionSignedDistance(
                positionsM[base],
                positionsM[base + 1],
                positionsM[base + 2]
            ).sd;
        }
    }
}

// ==============================================================================
// ALTERNATIVA C: GRID SDF 3D UNIFORME CON INTERPOLACIÓN TRILINEAL
// ==============================================================================

export class SdfGrid3DCollider implements TorsoCollider {
    readonly id: CollisionAlternativeId = 'ALT_C_SDF_GRID_3D';
    readonly initStats: TorsoColliderInitStats;

    readonly voxelSizeM: number;
    readonly invVoxelSize: number;
    readonly originX: number;
    readonly originY: number;
    readonly originZ: number;
    readonly nx: number;
    readonly ny: number;
    readonly nz: number;
    readonly phiGrid: Float32Array;

    constructor(
        voxelSizeM: number = 0.012,
        radialSegments: number = 64,
        verticalRings: number = 72
    ) {
        const t0 = performance.now();
        this.voxelSizeM = voxelSizeM;
        this.invVoxelSize = 1 / voxelSizeM;

        const mesh = generateCanonicalTorsoMesh(radialSegments, verticalRings);
        const bvh = new CompactTriangleBvh(mesh);
        const padM = 0.045; // 4.5 cm de banda exterior para capturar consultas cercanas

        this.originX = mesh.boundingBoxMinM[0] - padM;
        this.originY = mesh.boundingBoxMinM[1] - padM;
        this.originZ = mesh.boundingBoxMinM[2] - padM;

        const spanX = mesh.boundingBoxMaxM[0] - mesh.boundingBoxMinM[0] + 2 * padM;
        const spanY = mesh.boundingBoxMaxM[1] - mesh.boundingBoxMinM[1] + 2 * padM;
        const spanZ = mesh.boundingBoxMaxM[2] - mesh.boundingBoxMinM[2] + 2 * padM;

        this.nx = Math.ceil(spanX / voxelSizeM) + 1;
        this.ny = Math.ceil(spanY / voxelSizeM) + 1;
        this.nz = Math.ceil(spanZ / voxelSizeM) + 1;

        const totalVoxels = this.nx * this.ny * this.nz;
        this.phiGrid = new Float32Array(totalVoxels);

        for (let k = 0; k < this.nz; k++) {
            const z = this.originZ + k * voxelSizeM;
            for (let j = 0; j < this.ny; j++) {
                const y = this.originY + j * voxelSizeM;
                const rowBase = (k * this.ny + j) * this.nx;
                for (let i = 0; i < this.nx; i++) {
                    const x = this.originX + i * voxelSizeM;
                    this.phiGrid[rowBase + i] = bvh.queryClosestSigned(x, y, z).signedDistanceM;
                }
            }
        }

        const initMs = performance.now() - t0;
        this.initStats = {
            alternativeId: this.id,
            label: `Grid SDF 3D Uniforme (voxel = ${Math.round(voxelSizeM * 1000)} mm, trilineal)`,
            initMs,
            memoryFootprintBytes: this.phiGrid.byteLength,
            primitiveOrCellSummary: `${this.nx}x${this.ny}x${this.nz} = ${totalVoxels.toLocaleString('en-US')} voxeles (${Math.round(voxelSizeM * 1000)} mm)`,
        };
    }

    private sampleGridValue(ix: number, iy: number, iz: number): number {
        return this.phiGrid[(iz * this.ny + iy) * this.nx + ix];
    }

    sampleTrilinear(px: number, py: number, pz: number): { sd: number; nx: number; ny: number; nz: number } {
        const fx = (px - this.originX) * this.invVoxelSize;
        const fy = (py - this.originY) * this.invVoxelSize;
        const fz = (pz - this.originZ) * this.invVoxelSize;

        // Fuera del volumen SDF: distancia positiva segura al AABB del grid
        if (fx <= 0 || fx >= this.nx - 1 || fy <= 0 || fy >= this.ny - 1 || fz <= 0 || fz >= this.nz - 1) {
            const maxX = this.originX + (this.nx - 1) * this.voxelSizeM;
            const maxY = this.originY + (this.ny - 1) * this.voxelSizeM;
            const maxZ = this.originZ + (this.nz - 1) * this.voxelSizeM;
            const dx = px < this.originX ? this.originX - px : px > maxX ? px - maxX : 0;
            const dy = py < this.originY ? this.originY - py : py > maxY ? py - maxY : 0;
            const dz = pz < this.originZ ? this.originZ - pz : pz > maxZ ? pz - maxZ : 0;
            return { sd: Math.hypot(dx, dy, dz) + 0.04, nx: 0, ny: 1, nz: 0 };
        }

        const i0 = Math.floor(fx);
        const j0 = Math.floor(fy);
        const k0 = Math.floor(fz);
        const tx = fx - i0;
        const ty = fy - j0;
        const tz = fz - k0;

        const strideZ = this.ny * this.nx;
        const base000 = (k0 * this.ny + j0) * this.nx + i0;
        const c000 = this.phiGrid[base000];
        const c100 = this.phiGrid[base000 + 1];
        const c010 = this.phiGrid[base000 + this.nx];
        const c110 = this.phiGrid[base000 + this.nx + 1];
        const c001 = this.phiGrid[base000 + strideZ];
        const c101 = this.phiGrid[base000 + strideZ + 1];
        const c011 = this.phiGrid[base000 + strideZ + this.nx];
        const c111 = this.phiGrid[base000 + strideZ + this.nx + 1];

        const omx = 1 - tx;
        const omy = 1 - ty;
        const omz = 1 - tz;

        const c00 = c000 * omx + c100 * tx;
        const c10 = c010 * omx + c110 * tx;
        const c01 = c001 * omx + c101 * tx;
        const c11 = c011 * omx + c111 * tx;

        const c0 = c00 * omy + c10 * ty;
        const c1 = c01 * omy + c11 * ty;
        const sd = c0 * omz + c1 * tz;

        // Gradiente analítico de la interpolación trilineal (continuo dentro de la celda)
        const gx = ((c100 - c000) * omy + (c110 - c010) * ty) * omz
            + ((c101 - c001) * omy + (c111 - c011) * ty) * tz;
        const gy = ((c010 - c000) * omx + (c110 - c100) * tx) * omz
            + ((c011 - c001) * omx + (c111 - c101) * tx) * tz;
        const gz = (c01 - c00) * omy + (c11 - c10) * ty;

        const gLen = Math.hypot(gx, gy, gz);
        if (gLen > 1e-10) {
            const inv = 1 / gLen;
            return { sd, nx: gx * inv, ny: gy * inv, nz: gz * inv };
        }
        // Respaldo con diferencias finitas centradas en el nodo más cercano
        const ic = Math.min(this.nx - 2, Math.max(1, i0));
        const jc = Math.min(this.ny - 2, Math.max(1, j0));
        const kc = Math.min(this.nz - 2, Math.max(1, k0));
        const ddx = this.sampleGridValue(ic + 1, jc, kc) - this.sampleGridValue(ic - 1, jc, kc);
        const ddy = this.sampleGridValue(ic, jc + 1, kc) - this.sampleGridValue(ic, jc - 1, kc);
        const ddz = this.sampleGridValue(ic, jc, kc + 1) - this.sampleGridValue(ic, jc, kc - 1);
        const dl = Math.hypot(ddx, ddy, ddz);
        if (dl > 1e-10) {
            return { sd, nx: ddx / dl, ny: ddy / dl, nz: ddz / dl };
        }
        return { sd, nx: 0, ny: 1, nz: 0 };
    }

    resolveSubstepCollision(
        predictedM: Float64Array,
        positionsM: Float64Array,
        invMass: Float64Array,
        params: TorsoCollisionParams
    ): void {
        const vCount = invMass.length;
        const margin = params.contactThicknessM;
        const mu = params.frictionCoeff;
        const ox = this.originX;
        const oy = this.originY;
        const oz = this.originZ;
        const invV = this.invVoxelSize;
        const nxMax = this.nx - 1;
        const nyMax = this.ny - 1;
        const nzMax = this.nz - 1;
        const nx = this.nx;
        const strideZ = this.ny * nx;
        const phi = this.phiGrid;

        for (let i = 0; i < vCount; i++) {
            if (invMass[i] === 0) continue;
            const base = i * 3;
            const px = predictedM[base];
            const py = predictedM[base + 1];
            const pz = predictedM[base + 2];

            const fx = (px - ox) * invV;
            if (fx <= 0 || fx >= nxMax) continue;
            const fy = (py - oy) * invV;
            if (fy <= 0 || fy >= nyMax) continue;
            const fz = (pz - oz) * invV;
            if (fz <= 0 || fz >= nzMax) continue;

            const i0 = Math.floor(fx);
            const j0 = Math.floor(fy);
            const k0 = Math.floor(fz);
            const tx = fx - i0;
            const ty = fy - j0;
            const tz = fz - k0;

            const base000 = (k0 * this.ny + j0) * nx + i0;
            const c000 = phi[base000];
            const c100 = phi[base000 + 1];
            const c010 = phi[base000 + nx];
            const c110 = phi[base000 + nx + 1];
            const c001 = phi[base000 + strideZ];
            const c101 = phi[base000 + strideZ + 1];
            const c011 = phi[base000 + strideZ + nx];
            const c111 = phi[base000 + strideZ + nx + 1];

            // Descarte rápido por cota de esquina de celda antes de calcular gradiente
            if (
                c000 >= margin && c100 >= margin && c010 >= margin && c110 >= margin
                && c001 >= margin && c101 >= margin && c011 >= margin && c111 >= margin
            ) {
                continue;
            }

            const omx = 1 - tx;
            const omy = 1 - ty;
            const omz = 1 - tz;

            const c00 = c000 * omx + c100 * tx;
            const c10 = c010 * omx + c110 * tx;
            const c01 = c001 * omx + c101 * tx;
            const c11 = c011 * omx + c111 * tx;

            const c0 = c00 * omy + c10 * ty;
            const c1 = c01 * omy + c11 * ty;
            const sd = c0 * omz + c1 * tz;
            if (sd >= margin) continue;

            let gx = ((c100 - c000) * omy + (c110 - c010) * ty) * omz
                + ((c101 - c001) * omy + (c111 - c011) * ty) * tz;
            let gy = ((c010 - c000) * omx + (c110 - c100) * tx) * omz
                + ((c011 - c001) * omx + (c111 - c101) * tx) * tz;
            let gz = (c01 - c00) * omy + (c11 - c10) * ty;

            let gLen = Math.sqrt(gx * gx + gy * gy + gz * gz);
            if (gLen <= 1e-10) {
                const ic = Math.min(nx - 2, Math.max(1, i0));
                const jc = Math.min(this.ny - 2, Math.max(1, j0));
                const kc = Math.min(this.nz - 2, Math.max(1, k0));
                gx = this.sampleGridValue(ic + 1, jc, kc) - this.sampleGridValue(ic - 1, jc, kc);
                gy = this.sampleGridValue(ic, jc + 1, kc) - this.sampleGridValue(ic, jc - 1, kc);
                gz = this.sampleGridValue(ic, jc, kc + 1) - this.sampleGridValue(ic, jc, kc - 1);
                gLen = Math.sqrt(gx * gx + gy * gy + gz * gz);
            }
            const invG = gLen > 1e-10 ? 1 / gLen : 0;

            applyContactProjectionWithCoulombFriction(
                predictedM,
                positionsM,
                base,
                sd,
                gLen > 1e-10 ? gx * invG : 0,
                gLen > 1e-10 ? gy * invG : 1,
                gLen > 1e-10 ? gz * invG : 0,
                margin,
                mu
            );
        }
    }

    evaluateProxySignedDistances(positionsM: Float64Array, outSignedDistancesM: Float64Array): void {
        const vCount = outSignedDistancesM.length;
        for (let i = 0; i < vCount; i++) {
            const base = i * 3;
            outSignedDistancesM[i] = this.sampleTrilinear(
                positionsM[base],
                positionsM[base + 1],
                positionsM[base + 2]
            ).sd;
        }
    }
}

export function createTorsoCollider(id: CollisionAlternativeId): TorsoCollider {
    switch (id) {
        case 'ALT_A_MESH_SPATIAL_HASH':
            return new MeshSpatialHashCollider(64, 72, 0.024, 0.007);
        case 'ALT_B_CAPSULES_ELLIPSOIDS':
            return new CapsulesEllipsoidsCollider();
        case 'ALT_C_SDF_GRID_3D':
            return new SdfGrid3DCollider(0.012, 64, 72);
    }
}

export function measureProxyAccuracyVsGroundTruth(
    collider: TorsoCollider,
    groundTruth: ReferenceTorsoGroundTruth
): {
    meanAbsErrorMm: number;
    maxAbsErrorMm: number;
    rmseMm: number;
    sampleCount: number;
} {
    // Muestrear puntos sobre la superficie canónica real y a +5 mm hacia fuera
    const mesh = groundTruth.mesh;
    const pos = mesh.positionsM;
    const norm = mesh.vertexNormals;
    const step = 4;
    const pts: number[] = [];
    for (let v = 0; v < mesh.vertexCount; v += step) {
        const b = v * 3;
        pts.push(pos[b], pos[b + 1], pos[b + 2]);
        pts.push(
            pos[b] + 0.005 * norm[b],
            pos[b + 1] + 0.005 * norm[b + 1],
            pos[b + 2] + 0.005 * norm[b + 2]
        );
    }
    const coords = new Float64Array(pts);
    const n = coords.length / 3;
    const gtSd = new Float64Array(n);
    const proxySd = new Float64Array(n);
    groundTruth.evaluateVertexArraySignedDistances(coords, gtSd);
    collider.evaluateProxySignedDistances(coords, proxySd);

    let absSum = 0;
    let sqSum = 0;
    let maxErr = 0;
    for (let i = 0; i < n; i++) {
        const err = Math.abs(proxySd[i] - gtSd[i]);
        absSum += err;
        sqSum += err * err;
        if (err > maxErr) maxErr = err;
    }

    return {
        meanAbsErrorMm: (absSum / n) * 1000,
        maxAbsErrorMm: maxErr * 1000,
        rmseMm: Math.sqrt(sqSum / n) * 1000,
        sampleCount: n,
    };
}
