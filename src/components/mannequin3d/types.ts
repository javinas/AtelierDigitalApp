// ==============================================================================
// ATELIER DIGITAL — VISUALIZADOR CORPORAL 3D: TIPOS Y CONTRATOS (PROTOTIPO)
// Archivo: src/components/mannequin3d/types.ts
// ==============================================================================
// Prototipo aislado de maniquí de alta costura con estética de firma By Katherine Carroll.
// ==============================================================================

import { DimensionValue } from 'react-native';

export interface Mannequin3DMeasurements {
    /** Estatura total en milímetros (ej: 1680 = 168.0 cm) */
    estatura: number;
    /** Talle delantero / longitud de tronco en milímetros (ej: 430 = 43.0 cm) */
    talle: number;
    /** Contorno de busto en milímetros (ej: 920 = 92.0 cm) */
    busto: number;
    /** Contorno de cintura en milímetros (ej: 700 = 70.0 cm) */
    cintura: number;
    /** Contorno de cadera mayor en milímetros (ej: 980 = 98.0 cm) */
    cadera: number;
    /** Ancho de espalda / biacromial en milímetros (ej: 380 = 38.0 cm) */
    espalda: number;
}

export type CameraViewAngle = 'front' | 'back' | 'left' | 'right' | 'perspective';

export interface CameraPreset {
    id: CameraViewAngle;
    label: string;
    description: string;
    azimuthAngle: number; // Radianes de rotación horizontal
    polarAngle: number;   // Radianes de elevación vertical
    distance: number;     // Distancia de cámara
}

export interface Mannequin3DViewerProps {
    measurements?: Partial<Mannequin3DMeasurements>;
    showPedestal?: boolean;
    showTapeLines?: boolean;
    selectedMeasure?: keyof Mannequin3DMeasurements | null;
    onSelectMeasure?: (code: keyof Mannequin3DMeasurements) => void;
    width?: DimensionValue;
    height?: DimensionValue;
    initialAngle?: CameraViewAngle;
    onRenderStats?: (stats: RenderPerformanceStats) => void;
}

export interface RenderPerformanceStats {
    fps: number;
    trianglesCount: number;
    geometriesCount: number;
    deformationTimeMs: number;
    lastRenderDurationMs: number;
}

export interface MannequinPresetSilhouette {
    id: string;
    name: string;
    description: string;
    measurements: Mannequin3DMeasurements;
}

export const DEFAULT_FEMALE_MEASUREMENTS: Mannequin3DMeasurements = {
    estatura: 1680, // 168 cm
    talle: 430,    // 43 cm
    busto: 920,    // 92 cm
    cintura: 700,  // 70 cm
    cadera: 980,   // 98 cm
    espalda: 380,  // 38 cm
};

export const MANNEQUIN_PARAM_BOUNDS = {
    estatura: { min: 1400, max: 1950, step: 10, label: 'Estatura Total', unit: 'cm' },
    talle: { min: 360, max: 540, step: 5, label: 'Largo de Talle', unit: 'cm' },
    busto: { min: 750, max: 1350, step: 5, label: 'Contorno de Busto', unit: 'cm' },
    cintura: { min: 550, max: 1150, step: 5, label: 'Contorno de Cintura', unit: 'cm' },
    cadera: { min: 800, max: 1400, step: 5, label: 'Contorno de Cadera', unit: 'cm' },
    espalda: { min: 320, max: 480, step: 5, label: 'Ancho de Espalda', unit: 'cm' },
} as const;

export const CAMERA_PRESETS: CameraPreset[] = [
    { id: 'front', label: 'Frontal', description: 'Vista anterior (0°)', azimuthAngle: 0, polarAngle: Math.PI / 2, distance: 3.2 },
    { id: 'left', label: 'Perfil Izq.', description: 'Vista lateral izquierda (90°)', azimuthAngle: Math.PI / 2, polarAngle: Math.PI / 2, distance: 3.2 },
    { id: 'back', label: 'Posterior', description: 'Vista dorsal de espalda (180°)', azimuthAngle: Math.PI, polarAngle: Math.PI / 2, distance: 3.2 },
    { id: 'right', label: 'Perfil Der.', description: 'Vista lateral derecha (270°)', azimuthAngle: -Math.PI / 2, polarAngle: Math.PI / 2, distance: 3.2 },
    { id: 'perspective', label: '3/4 Atelier', description: 'Perspectiva diagonal de pasarela', azimuthAngle: Math.PI / 5, polarAngle: Math.PI / 2.3, distance: 3.4 },
];

export const FEMALE_SILHOUETTE_PRESETS: MannequinPresetSilhouette[] = [
    {
        id: 'standard_atelier',
        name: 'Talla 38 Clásica Atelier',
        description: 'Proporción armoniosa estándar de alta costura europea (92-70-98)',
        measurements: { estatura: 1680, talle: 430, busto: 920, cintura: 700, cadera: 980, espalda: 380 },
    },
    {
        id: 'hourglass_curvy',
        name: 'Silueta Reloj de Arena',
        description: 'Busto y caderas voluptuosas con quiebre acentuado de cintura (102-74-108)',
        measurements: { estatura: 1650, talle: 420, busto: 1020, cintura: 740, cadera: 1080, espalda: 390 },
    },
    {
        id: 'slender_tall',
        name: 'Pasarela Esbelta (Longilínea)',
        description: 'Estatura alargada, talle largo y silueta estilizada (88-64-92)',
        measurements: { estatura: 1780, talle: 450, busto: 880, cintura: 640, cadera: 920, espalda: 390 },
    },
    {
        id: 'petite_compact',
        name: 'Silueta Petite',
        description: 'Estatura compacta y proporción anatómica reducida (86-66-92)',
        measurements: { estatura: 1540, talle: 390, busto: 860, cintura: 660, cadera: 920, espalda: 350 },
    },
];
