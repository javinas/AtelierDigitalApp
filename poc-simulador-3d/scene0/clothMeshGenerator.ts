// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): GENERADOR ESCENA 0 (PAÑO 50x50 CM)
// Archivo: poc-simulador-3d/scene0/clothMeshGenerator.ts
// ==============================================================================
// Genera una malla rectangular plana de 0.50 m x 0.50 m en unidades SI,
// con dos esquinas fijas (0 y gridSize-1), aristas estructurales/cizallamiento
// y bisagras diédricas orientadas para XPBD y PBD clásico.
// ==============================================================================

import { computeTriangleLumpedMasses } from '../harness/siConversionAndParams';
import { RestEdgeDescriptor } from '../harness/types';

export type EdgeKind = 'warp' | 'weft' | 'shear';

export interface ClothEdgeDescriptor extends RestEdgeDescriptor {
    kind: EdgeKind;
}

export interface BendingHingeDescriptor {
    v1: number; // Inicio de arista compartida
    v2: number; // Fin de arista compartida
    v3: number; // Opuesto triángulo 1
    v4: number; // Opuesto triángulo 2
    hingeLengthM: number;          // l_e [m]
    combinedTriangleAreaM2: number;// A_12^0 [m^2]
    restAngleRad: number;          // phi_0 [rad] (0 en plano)
}

export interface GeneratedClothMesh {
    gridSize: number;              // 16 o 32 nodos por lado
    widthM: number;                // 0.50 m
    heightM: number;               // 0.50 m
    vertexCount: number;           // gridSize * gridSize
    triangleCount: number;         // 2 * (gridSize - 1)^2
    restPositionsM: Float64Array;  // 3 * vertexCount
    triangleIndices: Uint32Array;  // 3 * triangleCount
    pinnedIndices: Set<number>;    // 2 esquinas superiores
    edges: ClothEdgeDescriptor[];
    hinges: BendingHingeDescriptor[];
    massesKg: Float64Array;
    inverseMassesPerKg: Float64Array;
    totalSurfaceMassKg: number;
}

function triangleArea3D(
    pos: Float64Array,
    ia: number,
    ib: number,
    ic: number
): number {
    const ax = pos[ia * 3];
    const ay = pos[ia * 3 + 1];
    const az = pos[ia * 3 + 2];

    const abx = pos[ib * 3] - ax;
    const aby = pos[ib * 3 + 1] - ay;
    const abz = pos[ib * 3 + 2] - az;

    const acx = pos[ic * 3] - ax;
    const acy = pos[ic * 3 + 1] - ay;
    const acz = pos[ic * 3 + 2] - az;

    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    return 0.5 * Math.hypot(cx, cy, cz);
}

/**
 * Construye malla plana 50x50 cm horizontal a altura initialHeightM (y = 1.0 m),
 * extendida de z = 0 a z = 0.50 m, con esquinas (r=0, c=0) y (r=0, c=gridSize-1) fijas.
 */
export function generateScene0ClothMesh(
    gridSize: number,
    arealMassKgPerSqM: number,
    options: { widthM?: number; heightM?: number; initialHeightM?: number } = {}
): GeneratedClothMesh {
    if (!Number.isInteger(gridSize) || gridSize < 2) {
        throw new RangeError(`gridSize debe ser entero >= 2 (recibido: ${gridSize})`);
    }
    const widthM = options.widthM ?? 0.5;
    const heightM = options.heightM ?? 0.5;
    const initialHeightM = options.initialHeightM ?? 1.0;

    const vertexCount = gridSize * gridSize;
    const cellCount = (gridSize - 1) * (gridSize - 1);
    const triangleCount = cellCount * 2;

    const dx = widthM / (gridSize - 1);
    const dz = heightM / (gridSize - 1);

    const restPositionsM = new Float64Array(vertexCount * 3);
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const idx = r * gridSize + c;
            restPositionsM[idx * 3] = -widthM * 0.5 + c * dx;
            restPositionsM[idx * 3 + 1] = initialHeightM;
            restPositionsM[idx * 3 + 2] = r * dz;
        }
    }

    const triangleIndices = new Uint32Array(triangleCount * 3);
    const hinges: BendingHingeDescriptor[] = [];
    const edges: ClothEdgeDescriptor[] = [];

    const addEdge = (i: number, j: number, kind: EdgeKind, tributaryWidthM: number) => {
        const len = Math.hypot(
            restPositionsM[j * 3] - restPositionsM[i * 3],
            restPositionsM[j * 3 + 1] - restPositionsM[i * 3 + 1],
            restPositionsM[j * 3 + 2] - restPositionsM[i * 3 + 2]
        );
        edges.push({ i, j, restLengthM: len, tributaryWidthM, kind });
    };

    // Aristas horizontales (trama / X) con ancho tributario dz (mitad en bordes superior/inferior)
    for (let r = 0; r < gridSize; r++) {
        const trib = (r === 0 || r === gridSize - 1) ? 0.5 * dz : dz;
        for (let c = 0; c < gridSize - 1; c++) {
            addEdge(r * gridSize + c, r * gridSize + (c + 1), 'weft', trib);
        }
    }

    // Aristas verticales (urdimbre / Z) con ancho tributario dx (mitad en bordes izq/der)
    for (let c = 0; c < gridSize; c++) {
        const trib = (c === 0 || c === gridSize - 1) ? 0.5 * dx : dx;
        for (let r = 0; r < gridSize - 1; r++) {
            addEdge(r * gridSize + c, (r + 1) * gridSize + c, 'warp', trib);
        }
    }

    // Triangulación alternada por celda (simétrica, evita sesgo direccional) + diagonales
    let triOffset = 0;
    const diagLen = Math.hypot(dx, dz);
    const diagTrib = (dx * dz) / diagLen;

    // Mapa auxiliar de aristas compartidas para generar todas las bisagras interiores
    interface HalfEdgeEntry {
        a: number;
        b: number;
        opp: number;
        areaM2: number;
    }
    const edgeToHalfEdges = new Map<string, HalfEdgeEntry[]>();
    const registerTriEdge = (a: number, b: number, opp: number, areaM2: number) => {
        const minIdx = Math.min(a, b);
        const maxIdx = Math.max(a, b);
        const key = `${minIdx}_${maxIdx}`;
        const list = edgeToHalfEdges.get(key) ?? [];
        list.push({ a, b, opp, areaM2 });
        edgeToHalfEdges.set(key, list);
    };

    for (let r = 0; r < gridSize - 1; r++) {
        for (let c = 0; c < gridSize - 1; c++) {
            const v00 = r * gridSize + c;
            const v10 = r * gridSize + (c + 1);
            const v01 = (r + 1) * gridSize + c;
            const v11 = (r + 1) * gridSize + (c + 1);

            const even = (r + c) % 2 === 0;
            if (even) {
                // Diagonal v00 -> v11 (también añadimos diagonal cruzada v10-v01 para simetría de cizallamiento)
                // T1: (v00, v01, v11), T2: (v00, v11, v10) -> ambas normales en +Y
                triangleIndices[triOffset++] = v00;
                triangleIndices[triOffset++] = v01;
                triangleIndices[triOffset++] = v11;
                const a1 = triangleArea3D(restPositionsM, v00, v01, v11);
                registerTriEdge(v00, v01, v11, a1);
                registerTriEdge(v01, v11, v00, a1);
                registerTriEdge(v11, v00, v01, a1);

                triangleIndices[triOffset++] = v00;
                triangleIndices[triOffset++] = v11;
                triangleIndices[triOffset++] = v10;
                const a2 = triangleArea3D(restPositionsM, v00, v11, v10);
                registerTriEdge(v00, v11, v10, a2);
                registerTriEdge(v11, v10, v00, a2);
                registerTriEdge(v10, v00, v11, a2);

                addEdge(v00, v11, 'shear', diagTrib);
                addEdge(v10, v01, 'shear', diagTrib);
            } else {
                // Diagonal v10 -> v01
                // T1: (v00, v01, v10), T2: (v10, v01, v11) -> ambas normales en +Y
                triangleIndices[triOffset++] = v00;
                triangleIndices[triOffset++] = v01;
                triangleIndices[triOffset++] = v10;
                const a1 = triangleArea3D(restPositionsM, v00, v01, v10);
                registerTriEdge(v00, v01, v10, a1);
                registerTriEdge(v01, v10, v00, a1);
                registerTriEdge(v10, v00, v01, a1);

                triangleIndices[triOffset++] = v10;
                triangleIndices[triOffset++] = v01;
                triangleIndices[triOffset++] = v11;
                const a2 = triangleArea3D(restPositionsM, v10, v01, v11);
                registerTriEdge(v10, v01, v11, a2);
                registerTriEdge(v01, v11, v10, a2);
                registerTriEdge(v11, v10, v01, a2);

                addEdge(v10, v01, 'shear', diagTrib);
                addEdge(v00, v11, 'shear', diagTrib);
            }
        }
    }

    // Construir bisagras diédricas orientadas consistentemente:
    // (v1, v2, v3) tiene normal (x2-x1) x (x3-x1) en +Y; (v1, v4, v2) tiene normal (x4-x1) x (x2-x1) en +Y.
    for (const list of edgeToHalfEdges.values()) {
        if (list.length !== 2) {
            continue;
        }
        const h1 = list[0];
        const h2 = list[1];
        if (h1.a !== h2.b || h1.b !== h2.a) {
            throw new Error(`Orientación inconsistente de bisagra entre vértices (${h1.a}, ${h1.b})`);
        }
        // En h1: triángulo CCW es (h1.a, h1.b, h1.opp), normal = (b-a) x (opp-a)
        const v1 = h1.a;
        const v2 = h1.b;
        const v3 = h1.opp;
        const v4 = h2.opp;
        const hingeLengthM = Math.hypot(
            restPositionsM[v2 * 3] - restPositionsM[v1 * 3],
            restPositionsM[v2 * 3 + 1] - restPositionsM[v1 * 3 + 1],
            restPositionsM[v2 * 3 + 2] - restPositionsM[v1 * 3 + 2]
        );
        hinges.push({
            v1,
            v2,
            v3,
            v4,
            hingeLengthM,
            combinedTriangleAreaM2: h1.areaM2 + h2.areaM2,
            restAngleRad: 0,
        });
    }

    const pinnedIndices = new Set<number>([0, gridSize - 1]);
    const { massesKg, inverseMassesPerKg, totalSurfaceMassKg } = computeTriangleLumpedMasses(
        restPositionsM,
        triangleIndices,
        arealMassKgPerSqM,
        pinnedIndices
    );

    return {
        gridSize,
        widthM,
        heightM,
        vertexCount,
        triangleCount,
        restPositionsM,
        triangleIndices,
        pinnedIndices,
        edges,
        hinges,
        massesKg,
        inverseMassesPerKg,
        totalSurfaceMassKg,
    };
}
