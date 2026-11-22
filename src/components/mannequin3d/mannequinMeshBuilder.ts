// ==============================================================================
// ATELIER DIGITAL — CONSTRUCTOR DE MALLA ANATÓMICA 3D (BY KATHERINE CARROLL)
// Archivo: src/components/mannequin3d/mannequinMeshBuilder.ts
// ==============================================================================
// Genera de forma matemática un maniquí de costura femenino estilizado,
// con proporciones de alta costura, pedestal de taller y deformación paramétrica continua.
// ==============================================================================

import * as THREE from 'three';
import { Mannequin3DMeasurements, DEFAULT_FEMALE_MEASUREMENTS } from './types';

export interface BuiltMannequinStructure {
    group: THREE.Group;
    torsoMesh: THREE.Mesh;
    pedestalMesh: THREE.Group;
    seamLines: THREE.LineSegments[];
    tapeRings: Record<string, THREE.Line>;
    updateMeasurements: (m: Mannequin3DMeasurements) => void;
    dispose: () => void;
}

/**
 * Paleta de materiales de alta costura de la firma By Katherine Carroll
 */
export const MANNEQUIN_MATERIALS = {
    // Tela marfil lino/algodón sastre
    fabricIvory: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FAF5EE'),
        roughness: 0.82,
        metalness: 0.05,
        flatShading: false,
    }),
    // Latón pulido champán para pedestal y remates
    brassChampagne: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C5A880'),
        roughness: 0.28,
        metalness: 0.85,
    }),
    // Madera noble oscura para base de pedestal
    woodDark: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#2A1F18'),
        roughness: 0.75,
        metalness: 0.1,
    }),
    // Líneas de corte y costura estilizadas (hilo oscuro)
    seamThread: new THREE.LineBasicMaterial({
        color: new THREE.Color('#5A4E44'),
        linewidth: 1,
        transparent: true,
        opacity: 0.45,
    }),
    // Cintas métricas doradas activas
    tapeActive: new THREE.LineBasicMaterial({
        color: new THREE.Color('#A78350'),
        linewidth: 2,
    }),
    // Cinta destacada (selección esmeralda)
    tapeHighlight: new THREE.LineBasicMaterial({
        color: new THREE.Color('#2E5A39'),
        linewidth: 3,
    }),
};

/**
 * Construye el maniquí paramétrico 3D
 */
export function buildParametricMannequin(
    initialMeasurements: Mannequin3DMeasurements = DEFAULT_FEMALE_MEASUREMENTS,
    options: { showPedestal?: boolean; showTapeLines?: boolean } = {}
): BuiltMannequinStructure {
    const { showPedestal = true, showTapeLines = true } = options;
    const rootGroup = new THREE.Group();
    rootGroup.name = 'CoutureMannequinRoot';

    // -------------------------------------------------------------------------
    // 1. GENERACIÓN DEL TORSO PARAMÉTRICO DE ALTA COSTURA
    // -------------------------------------------------------------------------
    // Construimos una malla suave con perfil de sastre:
    // Corte longitudinal en capas (cuello, hombros, alto busto, busto, bajo busto, cintura, cadera alta, cadera, entrepierna).
    const radialSegments = 36;
    const heightSegments = 32;

    // Guardamos la geometría base para deformación continua en memoria
    let currentTorsoGeo = createTorsoGeometry(initialMeasurements, radialSegments, heightSegments);
    const torsoMesh = new THREE.Mesh(currentTorsoGeo, MANNEQUIN_MATERIALS.fabricIvory);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.name = 'MannequinTorso';
    rootGroup.add(torsoMesh);

    // -------------------------------------------------------------------------
    // 2. LÍNEAS DE COSTURA DE SASTRE (PRINCESA, CENTRO DELANTERO, CINTURA)
    // -------------------------------------------------------------------------
    const seamGroup = new THREE.Group();
    seamGroup.name = 'SeamLinesGroup';
    rootGroup.add(seamGroup);

    // -------------------------------------------------------------------------
    // 3. CINTAS MÉTRICAS VIRTUALES DORADAS (HITOS ANATÓMICOS)
    // -------------------------------------------------------------------------
    const tapeRings: Record<string, THREE.Line> = {};
    const tapeGroup = new THREE.Group();
    tapeGroup.name = 'TapeLinesGroup';
    tapeGroup.visible = showTapeLines;
    rootGroup.add(tapeGroup);

    const tapeDefs = [
        { key: 'busto', label: 'Busto' },
        { key: 'cintura', label: 'Cintura' },
        { key: 'cadera', label: 'Cadera' },
    ];

    for (const def of tapeDefs) {
        const ringGeo = new THREE.BufferGeometry();
        const line = new THREE.Line(ringGeo, MANNEQUIN_MATERIALS.tapeActive);
        line.name = `Tape_${def.key}`;
        tapeRings[def.key] = line;
        tapeGroup.add(line);
    }

    // -------------------------------------------------------------------------
    // 4. PEDESTAL Y SOPORTE DE LATÓN Y MADERA DE ATELIER
    // -------------------------------------------------------------------------
    const pedestalGroup = new THREE.Group();
    pedestalGroup.name = 'PedestalGroup';
    pedestalGroup.visible = showPedestal;

    // A. Base circular de madera pesada de taller
    const baseGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.04, 32);
    const baseMesh = new THREE.Mesh(baseGeo, MANNEQUIN_MATERIALS.woodDark);
    baseMesh.position.y = -1.2;
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    // B. Aro embellecedor de latón en la base
    const ringGeo = new THREE.TorusGeometry(0.37, 0.012, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, MANNEQUIN_MATERIALS.brassChampagne);
    ringMesh.position.y = -1.18;
    pedestalGroup.add(ringMesh);

    // C. Mástil telescópico central de latón
    const poleGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.3, 16);
    const poleMesh = new THREE.Mesh(poleGeo, MANNEQUIN_MATERIALS.brassChampagne);
    poleMesh.position.y = -0.6;
    poleMesh.castShadow = true;
    pedestalGroup.add(poleMesh);

    // D. Pomo superior decorativo de latón (corona francesa de sastre)
    const finialGroup = new THREE.Group();
    finialGroup.name = 'NeckFinial';
    const finialStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.06, 16), MANNEQUIN_MATERIALS.brassChampagne);
    const finialCap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), MANNEQUIN_MATERIALS.brassChampagne);
    finialCap.position.y = 0.05;
    finialGroup.add(finialStem);
    finialGroup.add(finialCap);
    finialGroup.position.y = 0.88; // Altura de cuello
    pedestalGroup.add(finialGroup);

    rootGroup.add(pedestalGroup);

    // -------------------------------------------------------------------------
    // 5. FUNCIÓN ATÓMICA DE DEFORMACIÓN PARAMÉTRICA EN TIEMPO REAL
    // -------------------------------------------------------------------------
    function updateMeasurements(m: Mannequin3DMeasurements) {
        // 1. Reconstruir geometría del torso con las nuevas proporciones milimétricas
        const newGeo = createTorsoGeometry(m, radialSegments, heightSegments);
        torsoMesh.geometry.dispose();
        torsoMesh.geometry = newGeo;
        currentTorsoGeo = newGeo;

        // 2. Actualizar posición del pomo de cuello según el talle
        const talleFactor = m.talle / DEFAULT_FEMALE_MEASUREMENTS.talle;
        finialGroup.position.y = 0.58 + (0.30 * talleFactor);

        // 3. Actualizar cintas métricas virtuales
        updateTapeRings(tapeRings, m);
    }

    // Inicializar cintas con valores de arranque
    updateTapeRings(tapeRings, initialMeasurements);

    return {
        group: rootGroup,
        torsoMesh,
        pedestalMesh: pedestalGroup,
        seamLines: [],
        tapeRings,
        updateMeasurements,
        dispose: () => {
            currentTorsoGeo.dispose();
            baseGeo.dispose();
            ringGeo.dispose();
            poleGeo.dispose();
            for (const r of Object.values(tapeRings)) {
                r.geometry.dispose();
            }
        },
    };
}

/**
 * Calcula la geometría cilíndrica deformada que compone el maniquí
 */
function createTorsoGeometry(
    m: Mannequin3DMeasurements,
    radialSegments: number,
    heightSegments: number
): THREE.BufferGeometry {
    // Proporciones normalizadas respecto al estándar de taller
    const scaleHeight = m.estatura / DEFAULT_FEMALE_MEASUREMENTS.estatura;
    const scaleTalle = m.talle / DEFAULT_FEMALE_MEASUREMENTS.talle;
    const scaleBusto = m.busto / DEFAULT_FEMALE_MEASUREMENTS.busto;
    const scaleCintura = m.cintura / DEFAULT_FEMALE_MEASUREMENTS.cintura;
    const scaleCadera = m.cadera / DEFAULT_FEMALE_MEASUREMENTS.cadera;
    const scaleEspalda = m.espalda / DEFAULT_FEMALE_MEASUREMENTS.espalda;

    // Perfil anatómico femenino de sastre (11 capas verticales de Y = 1 a 0)
    // Coordenadas relativas de silueta couture
    const profile = [
        // yRel, radiusX, radiusZ, offsetZ (proyección anterior de busto/glúteos)
        { y: 0.86, rx: 0.065, rz: 0.065, oz: 0.00, desc: 'cuello' },
        { y: 0.78, rx: 0.190 * scaleEspalda, rz: 0.085, oz: 0.00, desc: 'hombros' },
        { y: 0.65, rx: 0.170 * scaleEspalda, rz: 0.115, oz: 0.02, desc: 'alto_busto' },
        { y: 0.52, rx: 0.185 * scaleBusto, rz: 0.155 * scaleBusto, oz: 0.038 * scaleBusto, desc: 'busto_apex' },
        { y: 0.38, rx: 0.155 * scaleBusto, rz: 0.110, oz: 0.015, desc: 'bajo_busto' },
        { y: 0.20, rx: 0.130 * scaleCintura, rz: 0.095 * scaleCintura, oz: 0.00, desc: 'cintura' },
        { y: 0.06, rx: 0.165 * scaleCadera, rz: 0.125 * scaleCadera, oz: 0.015, desc: 'cadera_alta' },
        { y: -0.10, rx: 0.205 * scaleCadera, rz: 0.165 * scaleCadera, oz: 0.025 * scaleCadera, desc: 'cadera_max' },
        { y: -0.25, rx: 0.190 * scaleCadera, rz: 0.150 * scaleCadera, oz: 0.015, desc: 'bajo_cadera' },
        { y: -0.38, rx: 0.160, rz: 0.120, oz: 0.00, desc: 'inicio_muslos' },
        { y: -0.46, rx: 0.140, rz: 0.105, oz: 0.00, desc: 'base_torso' },
    ];

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const numLayers = profile.length;

    for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
        const p = profile[layerIdx];
        // Aplicar talle a la mitad superior (arriba de cintura y = 0.20)
        let actualY = p.y;
        if (p.y >= 0.20) {
            actualY = 0.20 + (p.y - 0.20) * scaleTalle;
        } else {
            actualY = 0.20 - (0.20 - p.y) * scaleHeight;
        }

        const v = layerIdx / (numLayers - 1);

        for (let segIdx = 0; segIdx <= radialSegments; segIdx++) {
            const u = segIdx / radialSegments;
            const theta = u * Math.PI * 2;

            // Silueta elíptica anatómica con proyección delantera
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            // X = lateral, Z = anteroposterior (Z > 0 es pecho/delantero, Z < 0 es espalda)
            const x = cosT * p.rx;
            let z = sinT * p.rz + p.oz;

            // Moldeado adicional de pechos independientes si estamos cerca del ápice de busto
            if (p.desc === 'busto_apex' && sinT > 0.3) {
                // Relieve en copas izquierda y derecha
                const cupOffset = Math.abs(cosT) > 0.25 ? 0.02 * scaleBusto : -0.01;
                z += cupOffset;
            }

            // Moldeado lumbar en espalda
            if (p.desc === 'cintura' && sinT < -0.3) {
                z += 0.015; // Curvatura lordótica de sastre
            }

            vertices.push(x, actualY, z);
            uvs.push(u, v);

            // Vector normal estimado aproximado hacia afuera
            const nx = cosT;
            const ny = 0;
            const nz = sinT;
            normals.push(nx, ny, nz);
        }
    }

    // Generar caras triangulares
    const ringVertexCount = radialSegments + 1;
    for (let layerIdx = 0; layerIdx < numLayers - 1; layerIdx++) {
        for (let segIdx = 0; segIdx < radialSegments; segIdx++) {
            const a = layerIdx * ringVertexCount + segIdx;
            const b = (layerIdx + 1) * ringVertexCount + segIdx;
            const c = (layerIdx + 1) * ringVertexCount + (segIdx + 1);
            const d = layerIdx * ringVertexCount + (segIdx + 1);

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    return geo;
}

/**
 * Actualiza las cintas métricas que abrazan el cuerpo en los niveles anatómicos
 */
function updateTapeRings(tapeRings: Record<string, THREE.Line>, m: Mannequin3DMeasurements) {
    const scaleTalle = m.talle / DEFAULT_FEMALE_MEASUREMENTS.talle;
    const scaleBusto = m.busto / DEFAULT_FEMALE_MEASUREMENTS.busto;
    const scaleCintura = m.cintura / DEFAULT_FEMALE_MEASUREMENTS.cintura;
    const scaleCadera = m.cadera / DEFAULT_FEMALE_MEASUREMENTS.cadera;

    const ringDefs = [
        { key: 'busto', y: 0.20 + (0.52 - 0.20) * scaleTalle, rx: 0.190 * scaleBusto, rz: 0.160 * scaleBusto, oz: 0.038 * scaleBusto },
        { key: 'cintura', y: 0.20, rx: 0.133 * scaleCintura, rz: 0.098 * scaleCintura, oz: 0.00 },
        { key: 'cadera', y: -0.10, rx: 0.208 * scaleCadera, rz: 0.168 * scaleCadera, oz: 0.025 * scaleCadera },
    ];

    const segments = 48;
    for (const r of ringDefs) {
        const line = tapeRings[r.key];
        if (!line) continue;

        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * (r.rx + 0.004);
            const z = Math.sin(theta) * (r.rz + 0.004) + r.oz;
            points.push(new THREE.Vector3(x, r.y, z));
        }

        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
}

