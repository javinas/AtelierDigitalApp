// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): MODELO CANÓNICO DE TORSO PARA T3
// Archivo: poc-simulador-3d/collision/torsoBodyModel.ts
// ==============================================================================
// Genera una geometría corporal mínima de referencia (torso paramétrico cerrado
// desde cuello hasta base pélvica) calibrada con las medidas estándar femeninas
// de DEFAULT_FEMALE_MEASUREMENTS (en metros SI) del prototipo existente, junto
// con un evaluador de distancia con signo exacta de referencia (ground-truth)
// independiente de los tres proxies (A: malla+SpatialHash, B: cápsulas/elipsoides,
// C: SDF 3D uniforme).
// ==============================================================================

export interface CanonicalTorsoMeasurementsMm {
    readonly estatura: number;
    readonly talle: number;
    readonly busto: number;
    readonly cintura: number;
    readonly cadera: number;
    readonly espalda: number;
}

// Copia inmutable de solo lectura de DEFAULT_FEMALE_MEASUREMENTS (mm)
export const CANONICAL_FEMALE_MEASUREMENTS_MM: CanonicalTorsoMeasurementsMm = {
    estatura: 1680,
    talle: 430,
    busto: 920,
    cintura: 700,
    cadera: 980,
    espalda: 380,
};

export interface TorsoProfileLayer {
    readonly name: string;
    readonly yM: number;
    readonly rxM: number;
    readonly rzM: number;
    readonly ozM: number;
}

// Capas paramétricas del torso (extraídas del constructor mannequinMeshBuilder, en metros)
// más cierre suave superior en cuello (y = 0.895 m) y base inferior (y = -0.46 m).
export const CANONICAL_TORSO_LAYERS: readonly TorsoProfileLayer[] = [
    { name: 'base_torso', yM: -0.46, rxM: 0.140, rzM: 0.105, ozM: 0.000 },
    { name: 'inicio_muslos', yM: -0.38, rxM: 0.160, rzM: 0.120, ozM: 0.000 },
    { name: 'bajo_cadera', yM: -0.25, rxM: 0.190, rzM: 0.150, ozM: 0.015 },
    { name: 'cadera_max', yM: -0.10, rxM: 0.205, rzM: 0.165, ozM: 0.025 },
    { name: 'cadera_alta', yM: 0.06, rxM: 0.165, rzM: 0.125, ozM: 0.015 },
    { name: 'cintura', yM: 0.20, rxM: 0.130, rzM: 0.095, ozM: 0.000 },
    { name: 'bajo_busto', yM: 0.38, rxM: 0.155, rzM: 0.110, ozM: 0.015 },
    { name: 'busto_apex', yM: 0.52, rxM: 0.185, rzM: 0.155, ozM: 0.038 },
    { name: 'alto_busto', yM: 0.65, rxM: 0.170, rzM: 0.115, ozM: 0.020 },
    { name: 'hombros', yM: 0.78, rxM: 0.190, rzM: 0.085, ozM: 0.000 },
    { name: 'cuello', yM: 0.86, rxM: 0.065, rzM: 0.065, ozM: 0.000 },
];

export const TORSO_Y_MIN_M = -0.46;
export const TORSO_Y_NECK_TOP_M = 0.86;
export const TORSO_Y_CAP_TOP_M = 0.888;

export interface TorsoMeshData {
    positionsM: Float64Array;
    vertexNormals: Float64Array;
    indices: Uint32Array;
    triangleNormals: Float64Array;
    vertexCount: number;
    triangleCount: number;
    boundingBoxMinM: [number, number, number];
    boundingBoxMaxM: [number, number, number];
}

export interface SignedDistanceSample {
    signedDistanceM: number; // < 0 = dentro del torso (penetración), > 0 = fuera
    normalX: number;
    normalY: number;
    normalZ: number;
    closestX: number;
    closestY: number;
    closestZ: number;
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * Evalúa por interpolación cúbica suave (Catmull-Rom acotada) los semiejes y
 * desplazamiento anteroposterior del torso canónico a altura yM in [TORSO_Y_MIN_M, TORSO_Y_CAP_TOP_M].
 */
export function sampleTorsoCrossSection(yM: number): {
    yClampedM: number;
    rxM: number;
    rzM: number;
    ozM: number;
} {
    const y = clamp(yM, TORSO_Y_MIN_M, TORSO_Y_CAP_TOP_M);
    if (y > TORSO_Y_NECK_TOP_M) {
        // Cúpula esférica suave que cierra la parte superior del cuello sin bordes agudos
        const h = TORSO_Y_CAP_TOP_M - TORSO_Y_NECK_TOP_M;
        const u = clamp((y - TORSO_Y_NECK_TOP_M) / h, 0, 1);
        const factor = Math.sqrt(Math.max(0, 1 - u * u));
        return {
            yClampedM: y,
            rxM: Math.max(1e-4, 0.065 * factor),
            rzM: Math.max(1e-4, 0.065 * factor),
            ozM: 0,
        };
    }

    const layers = CANONICAL_TORSO_LAYERS;
    let idx = 0;
    for (let k = 0; k < layers.length - 1; k++) {
        if (y >= layers[k].yM && y <= layers[k + 1].yM) {
            idx = k;
            break;
        }
    }

    const p0 = layers[Math.max(0, idx - 1)];
    const p1 = layers[idx];
    const p2 = layers[idx + 1];
    const p3 = layers[Math.min(layers.length - 1, idx + 2)];

    const span = p2.yM - p1.yM;
    const t = span > 1e-9 ? clamp((y - p1.yM) / span, 0, 1) : 0;
    const t2 = t * t;
    const t3 = t2 * t;

    const catmull = (a: number, b: number, c: number, d: number): number => {
        const val = 0.5 * (
            2 * b
            + (-a + c) * t
            + (2 * a - 5 * b + 4 * c - d) * t2
            + (-a + 3 * b - 3 * c + d) * t3
        );
        const lo = Math.min(b, c) * 0.92;
        const hi = Math.max(b, c) * 1.08;
        return clamp(val, lo, hi);
    };

    // En la transición hombro -> cuello (idx === 9), usar interpolación coseno/Hermite suave
    // para evitar subimpulsos en clavícula y preservar pendiente anatómica limpia.
    if (idx === layers.length - 2) {
        const s = smoothstep(0, 1, t);
        return {
            yClampedM: y,
            rxM: p1.rxM + (p2.rxM - p1.rxM) * s,
            rzM: p1.rzM + (p2.rzM - p1.rzM) * s,
            ozM: p1.ozM + (p2.ozM - p1.ozM) * s,
        };
    }

    return {
        yClampedM: y,
        rxM: catmull(p0.rxM, p1.rxM, p2.rxM, p3.rxM),
        rzM: catmull(p0.rzM, p1.rzM, p2.rzM, p3.rzM),
        ozM: catmull(p0.ozM, p1.ozM, p2.ozM, p3.ozM),
    };
}

/**
 * Evalúa punto 3D exacto de la superficie paramétrica del torso en (yM, thetaRad).
 * Incluye el relieve anatómico anterior bilateral de busto y ligera curva lumbar posterior.
 */
export function evaluateTorsoSurfacePoint(yM: number, thetaRad: number): [number, number, number] {
    const cs = sampleTorsoCrossSection(yM);
    const cosT = Math.cos(thetaRad);
    const sinT = Math.sin(thetaRad);

    let x = cs.rxM * cosT;
    let z = cs.ozM + cs.rzM * sinT;

    // Relieve anatómico de copas anteriores alrededor de busto_apex (y ~ 0.52 m, sinT > 0 -> +Z)
    if (yM > 0.36 && yM < 0.68 && sinT > 0) {
        const verticalBell = Math.exp(-Math.pow((yM - 0.525) / 0.085, 2));
        const bilateralPeak = Math.pow(Math.sin(thetaRad), 1.4) * (0.68 + 0.32 * Math.cos(2 * thetaRad + Math.PI));
        const cupPushM = 0.018 * verticalBell * Math.max(0, bilateralPeak);
        z += cupPushM * sinT;
        x += cupPushM * 0.25 * cosT;
    }

    // Sutil cavidad lumbar posterior alrededor de cintura (y ~ 0.20 m, sinT < 0 -> -Z)
    if (yM > 0.06 && yM < 0.36 && sinT < 0) {
        const lumbarBell = Math.exp(-Math.pow((yM - 0.21) / 0.09, 2));
        const backCenter = Math.pow(-sinT, 2);
        z += 0.012 * lumbarBell * backCenter;
    }

    return [x, cs.yClampedM, z];
}

/**
 * Construye una malla triangular cerrada de torso con resolución configurable.
 */
export function generateCanonicalTorsoMesh(
    radialSegments: number = 64,
    verticalRings: number = 72
): TorsoMeshData {
    const ringCount = verticalRings;
    const stride = radialSegments;
    const ringVertexCount = ringCount * stride;
    // +2 polos: centro tapa inferior (base_torso) y centro cúpula superior (cuello)
    const bottomPoleIdx = ringVertexCount;
    const topPoleIdx = ringVertexCount + 1;
    const vertexCount = ringVertexCount + 2;

    const positionsM = new Float64Array(vertexCount * 3);
    const ySpan = TORSO_Y_CAP_TOP_M - TORSO_Y_MIN_M;

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (let r = 0; r < ringCount; r++) {
        // Deixar pequeño margen bajo TORSO_Y_CAP_TOP_M para conectar limpiamente al polo superior
        const vFrac = r / (ringCount - 1);
        const y = TORSO_Y_MIN_M + vFrac * (ySpan - 0.002);
        for (let s = 0; s < stride; s++) {
            const theta = (s / stride) * Math.PI * 2;
            const [px, py, pz] = evaluateTorsoSurfacePoint(y, theta);
            const idx = (r * stride + s) * 3;
            positionsM[idx] = px;
            positionsM[idx + 1] = py;
            positionsM[idx + 2] = pz;

            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (pz < minZ) minZ = pz;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
            if (pz > maxZ) maxZ = pz;
        }
    }

    // Polos de cierre
    positionsM[bottomPoleIdx * 3] = 0;
    positionsM[bottomPoleIdx * 3 + 1] = TORSO_Y_MIN_M;
    positionsM[bottomPoleIdx * 3 + 2] = 0;

    positionsM[topPoleIdx * 3] = 0;
    positionsM[topPoleIdx * 3 + 1] = TORSO_Y_CAP_TOP_M;
    positionsM[topPoleIdx * 3 + 2] = 0;
    if (TORSO_Y_CAP_TOP_M > maxY) maxY = TORSO_Y_CAP_TOP_M;

    const sideTriCount = (ringCount - 1) * stride * 2;
    const capTriCount = stride * 2;
    const triangleCount = sideTriCount + capTriCount;
    const indices = new Uint32Array(triangleCount * 3);
    let ptr = 0;

    // Caras laterales con orientación saliente (CCW vista desde fuera en mano derecha)
    for (let r = 0; r < ringCount - 1; r++) {
        for (let s = 0; s < stride; s++) {
            const sNext = (s + 1) % stride;
            const a = r * stride + s;
            const b = r * stride + sNext;
            const c = (r + 1) * stride + s;
            const d = (r + 1) * stride + sNext;

            // En nuestro sistema (x = rx*cosT, z = rz*sinT, y arriba), aumentar theta gira horario
            // visto desde +Y, así que (a, c, b) y (b, c, d) apuntan hacia fuera.
            indices[ptr++] = a;
            indices[ptr++] = c;
            indices[ptr++] = b;

            indices[ptr++] = b;
            indices[ptr++] = c;
            indices[ptr++] = d;
        }
    }

    // Tapa inferior (normal hacia -Y)
    for (let s = 0; s < stride; s++) {
        const sNext = (s + 1) % stride;
        indices[ptr++] = bottomPoleIdx;
        indices[ptr++] = s;
        indices[ptr++] = sNext;
    }

    // Cúpula superior (normal hacia +Y)
    const topRingStart = (ringCount - 1) * stride;
    for (let s = 0; s < stride; s++) {
        const sNext = (s + 1) % stride;
        indices[ptr++] = topPoleIdx;
        indices[ptr++] = topRingStart + sNext;
        indices[ptr++] = topRingStart + s;
    }

    const triangleNormals = new Float64Array(triangleCount * 3);
    const vertexNormals = new Float64Array(vertexCount * 3);

    for (let t = 0; t < triangleCount; t++) {
        const i0 = indices[t * 3];
        const i1 = indices[t * 3 + 1];
        const i2 = indices[t * 3 + 2];

        const ax = positionsM[i0 * 3];
        const ay = positionsM[i0 * 3 + 1];
        const az = positionsM[i0 * 3 + 2];
        const ux = positionsM[i1 * 3] - ax;
        const uy = positionsM[i1 * 3 + 1] - ay;
        const uz = positionsM[i1 * 3 + 2] - az;
        const vx = positionsM[i2 * 3] - ax;
        const vy = positionsM[i2 * 3 + 1] - ay;
        const vz = positionsM[i2 * 3 + 2] - az;

        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        const inv = len > 1e-12 ? 1 / len : 0;

        const unx = nx * inv;
        const uny = ny * inv;
        const unz = nz * inv;

        triangleNormals[t * 3] = unx;
        triangleNormals[t * 3 + 1] = uny;
        triangleNormals[t * 3 + 2] = unz;

        // Ponderación por área (nx, ny, nz sin normalizar) para normales suaves en vértices
        vertexNormals[i0 * 3] += nx; vertexNormals[i0 * 3 + 1] += ny; vertexNormals[i0 * 3 + 2] += nz;
        vertexNormals[i1 * 3] += nx; vertexNormals[i1 * 3 + 1] += ny; vertexNormals[i1 * 3 + 2] += nz;
        vertexNormals[i2 * 3] += nx; vertexNormals[i2 * 3 + 1] += ny; vertexNormals[i2 * 3 + 2] += nz;
    }

    for (let v = 0; v < vertexCount; v++) {
        const base = v * 3;
        const nx = vertexNormals[base];
        const ny = vertexNormals[base + 1];
        const nz = vertexNormals[base + 2];
        const len = Math.hypot(nx, ny, nz);
        if (len > 1e-12) {
            const inv = 1 / len;
            vertexNormals[base] = nx * inv;
            vertexNormals[base + 1] = ny * inv;
            vertexNormals[base + 2] = nz * inv;
        } else {
            vertexNormals[base + 1] = 1;
        }
    }

    return {
        positionsM,
        vertexNormals,
        indices,
        triangleNormals,
        vertexCount,
        triangleCount,
        boundingBoxMinM: [minX, minY, minZ],
        boundingBoxMaxM: [maxX, maxY, maxZ],
    };
}

/**
 * Calcula el punto más cercano en un triángulo 3D ABC a un punto P junto con coordenadas baricéntricas.
 */
export function closestPointOnTriangle3D(
    px: number, py: number, pz: number,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number
): { x: number; y: number; z: number; distSq: number; u: number; v: number; w: number } {
    const abx = bx - ax; const aby = by - ay; const abz = bz - az;
    const acx = cx - ax; const acy = cy - ay; const acz = cz - az;
    const apx = px - ax; const apy = py - ay; const apz = pz - az;

    const d1 = abx * apx + aby * apy + abz * apz;
    const d2 = acx * apx + acy * apy + acz * apz;
    if (d1 <= 0 && d2 <= 0) {
        return { x: ax, y: ay, z: az, distSq: apx * apx + apy * apy + apz * apz, u: 1, v: 0, w: 0 };
    }

    const bpx = px - bx; const bpy = py - by; const bpz = pz - bz;
    const d3 = abx * bpx + aby * bpy + abz * bpz;
    const d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) {
        return { x: bx, y: by, z: bz, distSq: bpx * bpx + bpy * bpy + bpz * bpz, u: 0, v: 1, w: 0 };
    }

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        const qx = ax + v * abx;
        const qy = ay + v * aby;
        const qz = az + v * abz;
        const dx = px - qx; const dy = py - qy; const dz = pz - qz;
        return { x: qx, y: qy, z: qz, distSq: dx * dx + dy * dy + dz * dz, u: 1 - v, v, w: 0 };
    }

    const cpx = px - cx; const cpy = py - cy; const cpz = pz - cz;
    const d5 = abx * cpx + aby * cpy + abz * cpz;
    const d6 = acx * cpx + acy * cpy + acz * cpz;
    if (d6 >= 0 && d5 <= d6) {
        return { x: cx, y: cy, z: cz, distSq: cpx * cpx + cpy * cpy + cpz * cpz, u: 0, v: 0, w: 1 };
    }

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6);
        const qx = ax + w * acx;
        const qy = ay + w * acy;
        const qz = az + w * acz;
        const dx = px - qx; const dy = py - qy; const dz = pz - qz;
        return { x: qx, y: qy, z: qz, distSq: dx * dx + dy * dy + dz * dz, u: 1 - w, v: 0, w };
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        const qx = bx + w * (cx - bx);
        const qy = by + w * (cy - by);
        const qz = bz + w * (cz - bz);
        const dx = px - qx; const dy = py - qy; const dz = pz - qz;
        return { x: qx, y: qy, z: qz, distSq: dx * dx + dy * dy + dz * dz, u: 0, v: 1 - w, w };
    }

    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;
    const u = 1 - v - w;
    const qx = ax + abx * v + acx * w;
    const qy = ay + aby * v + acy * w;
    const qz = az + abz * v + acz * w;
    const dx = px - qx; const dy = py - qy; const dz = pz - qz;
    return { x: qx, y: qy, z: qz, distSq: dx * dx + dy * dy + dz * dz, u, v, w };
}

/**
 * Evaluador de distancia con signo exacta de referencia (ground-truth) usando una malla
 * densa del torso canónico + normales interpoladas con ángulo/baricéntricas y signo
 * consistente respecto al interior paramétrico del cuerpo.
 */
export class ReferenceTorsoGroundTruth {
    readonly mesh: TorsoMeshData;
    private readonly triBboxMinX: Float64Array;
    private readonly triBboxMinY: Float64Array;
    private readonly triBboxMinZ: Float64Array;
    private readonly triBboxMaxX: Float64Array;
    private readonly triBboxMaxY: Float64Array;
    private readonly triBboxMaxZ: Float64Array;

    constructor(radialSegments: number = 96, verticalRings: number = 108) {
        this.mesh = generateCanonicalTorsoMesh(radialSegments, verticalRings);
        const tCount = this.mesh.triangleCount;
        this.triBboxMinX = new Float64Array(tCount);
        this.triBboxMinY = new Float64Array(tCount);
        this.triBboxMinZ = new Float64Array(tCount);
        this.triBboxMaxX = new Float64Array(tCount);
        this.triBboxMaxY = new Float64Array(tCount);
        this.triBboxMaxZ = new Float64Array(tCount);

        const pos = this.mesh.positionsM;
        const idx = this.mesh.indices;
        for (let t = 0; t < tCount; t++) {
            const i0 = idx[t * 3] * 3;
            const i1 = idx[t * 3 + 1] * 3;
            const i2 = idx[t * 3 + 2] * 3;
            this.triBboxMinX[t] = Math.min(pos[i0], pos[i1], pos[i2]);
            this.triBboxMinY[t] = Math.min(pos[i0 + 1], pos[i1 + 1], pos[i2 + 1]);
            this.triBboxMinZ[t] = Math.min(pos[i0 + 2], pos[i1 + 2], pos[i2 + 2]);
            this.triBboxMaxX[t] = Math.max(pos[i0], pos[i1], pos[i2]);
            this.triBboxMaxY[t] = Math.max(pos[i0 + 1], pos[i1 + 1], pos[i2 + 1]);
            this.triBboxMaxZ[t] = Math.max(pos[i0 + 2], pos[i1 + 2], pos[i2 + 2]);
        }
    }

    evaluateSignedDistance(px: number, py: number, pz: number): SignedDistanceSample {
        const pos = this.mesh.positionsM;
        const idx = this.mesh.indices;
        const vNorm = this.mesh.vertexNormals;
        const tCount = this.mesh.triangleCount;

        // Cota rápida inicial usando distancia aproximada a la línea media del torso
        let bestDistSq = Infinity;
        let bestTri = 0;
        let bestCp = { x: 0, y: 0, z: 0, distSq: Infinity, u: 1, v: 0, w: 0 };

        for (let t = 0; t < tCount; t++) {
            // Podado exacto por distancia a AABB del triángulo
            const dxBox = px < this.triBboxMinX[t] ? this.triBboxMinX[t] - px : px > this.triBboxMaxX[t] ? px - this.triBboxMaxX[t] : 0;
            if (dxBox * dxBox >= bestDistSq) continue;
            const dyBox = py < this.triBboxMinY[t] ? this.triBboxMinY[t] - py : py > this.triBboxMaxY[t] ? py - this.triBboxMaxY[t] : 0;
            if (dxBox * dxBox + dyBox * dyBox >= bestDistSq) continue;
            const dzBox = pz < this.triBboxMinZ[t] ? this.triBboxMinZ[t] - pz : pz > this.triBboxMaxZ[t] ? pz - this.triBboxMaxZ[t] : 0;
            if (dxBox * dxBox + dyBox * dyBox + dzBox * dzBox >= bestDistSq) continue;

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
                bestCp = cp;
            }
        }

        // Normal suave pseudobaricéntrica del punto más cercano
        const ti0 = idx[bestTri * 3] * 3;
        const ti1 = idx[bestTri * 3 + 1] * 3;
        const ti2 = idx[bestTri * 3 + 2] * 3;

        let nx = vNorm[ti0] * bestCp.u + vNorm[ti1] * bestCp.v + vNorm[ti2] * bestCp.w;
        let ny = vNorm[ti0 + 1] * bestCp.u + vNorm[ti1 + 1] * bestCp.v + vNorm[ti2 + 1] * bestCp.w;
        let nz = vNorm[ti0 + 2] * bestCp.u + vNorm[ti1 + 2] * bestCp.v + vNorm[ti2 + 2] * bestCp.w;
        const nLen = Math.hypot(nx, ny, nz);
        if (nLen > 1e-12) {
            nx /= nLen; ny /= nLen; nz /= nLen;
        } else {
            nx = this.mesh.triangleNormals[bestTri * 3];
            ny = this.mesh.triangleNormals[bestTri * 3 + 1];
            nz = this.mesh.triangleNormals[bestTri * 3 + 2];
        }

        const vx = px - bestCp.x;
        const vy = py - bestCp.y;
        const vz = pz - bestCp.z;
        const dist = Math.sqrt(bestDistSq);
        const dot = vx * nx + vy * ny + vz * nz;
        const sign = dot >= 0 ? 1 : -1;

        return {
            signedDistanceM: sign * dist,
            normalX: nx,
            normalY: ny,
            normalZ: nz,
            closestX: bestCp.x,
            closestY: bestCp.y,
            closestZ: bestCp.z,
        };
    }

    evaluateVertexArraySignedDistances(positionsM: Float64Array, outSignedDistancesM: Float64Array): void {
        const vCount = outSignedDistancesM.length;
        for (let i = 0; i < vCount; i++) {
            const base = i * 3;
            outSignedDistancesM[i] = this.evaluateSignedDistance(
                positionsM[base],
                positionsM[base + 1],
                positionsM[base + 2]
            ).signedDistanceM;
        }
    }
}

