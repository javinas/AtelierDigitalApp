// ==============================================================================
// ATELIER DIGITAL — CONFIGURACIÓN CENTRALIZADA: MAPEO ANATÓMICO (BY KATHERINE CARROLL)
// Archivo: src/engine/pattern/catalog/anatomicalMapping.ts
// ==============================================================================
// Mapeo unificado entre códigos de medición antropométrica, zonas anatómicas,
// puntos de anclaje vectorial, posiciones de etiquetas, grupos visuales y
// arquetipos corporales (Mujer, Hombre, Niña, Niño).
// ==============================================================================

export type AnatomicalZone =
    | 'head_neck'
    | 'shoulders'
    | 'chest'
    | 'bust'
    | 'waist'
    | 'hip'
    | 'back'
    | 'arms'
    | 'legs_lower';

export type AnatomicalDisplayGroup =
    | 'all'
    | 'bust_torso'
    | 'waist_hip'
    | 'back_neck'
    | 'arms'
    | 'lower';

export type BodyDemographicType = 'woman' | 'man' | 'girl' | 'boy';

export interface AnatomicalCotaConfig {
    code: string;
    label: string;
    zone: AnatomicalZone;
    group: AnatomicalDisplayGroup;
    side: 'left' | 'right';
    anchor: {
        xPercent: number; // 0-100% relativo al ancho de la silueta
        yPercent: number; // 0-100% relativo a la altura de la silueta
    };
    labelPosition: {
        top: number;      // Offset vertical en píxeles
        offset: number;   // Distancia lateral al centro
    };
    isPrimary?: boolean;
    isSmallMeasureMm?: boolean; // Márgenes / holguras que van en mm
    landmarkShort: string;
    instructions: string;
}

export interface BodyArchetypeConfig {
    type: BodyDemographicType;
    label: string;
    shoulderRatio: number; // Relación ancho hombros vs torso estándar
    bustRatio: number;     // Relación busto vs cintura
    waistRatio: number;    // Relación cintura vs cadera
    hipRatio: number;      // Curvatura de cadera
    torsoHeightRatio: number;
    armLengthRatio: number;
    legLengthRatio: number;
}

export const BODY_ARCHETYPES: Record<BodyDemographicType, BodyArchetypeConfig> = {
    woman: {
        type: 'woman',
        label: 'Mujer (Atelier Alta Costura)',
        shoulderRatio: 1.0,
        bustRatio: 1.28,
        waistRatio: 0.73,
        hipRatio: 1.36,
        torsoHeightRatio: 1.0,
        armLengthRatio: 1.0,
        legLengthRatio: 1.0,
    },
    man: {
        type: 'man',
        label: 'Hombre (Sartorial Masculino)',
        shoulderRatio: 1.18,
        bustRatio: 1.15,
        waistRatio: 0.88,
        hipRatio: 1.05,
        torsoHeightRatio: 1.06,
        armLengthRatio: 1.05,
        legLengthRatio: 1.08,
    },
    girl: {
        type: 'girl',
        label: 'Niña (Atelier Infantil)',
        shoulderRatio: 0.85,
        bustRatio: 1.05,
        waistRatio: 0.95,
        hipRatio: 1.08,
        torsoHeightRatio: 0.82,
        armLengthRatio: 0.82,
        legLengthRatio: 0.82,
    },
    boy: {
        type: 'boy',
        label: 'Niño (Atelier Infantil)',
        shoulderRatio: 0.88,
        bustRatio: 1.02,
        waistRatio: 0.96,
        hipRatio: 1.04,
        torsoHeightRatio: 0.82,
        armLengthRatio: 0.82,
        legLengthRatio: 0.82,
    },
};

export const ANATOMICAL_COTAS_MAPPING: AnatomicalCotaConfig[] = [
    // --------------------------------------------------------------------------
    // LADO IZQUIERDO: Silueta frontal, contornos clave y verticales
    // --------------------------------------------------------------------------
    {
        code: 'estatura_total',
        label: 'ESTATURA TOTAL',
        zone: 'head_neck',
        group: 'lower',
        side: 'left',
        anchor: { xPercent: 50, yPercent: 4 },
        labelPosition: { top: 24, offset: 190 },
        landmarkShort: 'Vértice craneal',
        instructions: 'Desde coronilla hasta plano de apoyo descalza.',
    },
    {
        code: 'largo_hombro',
        label: 'LARGO DE HOMBRO',
        zone: 'shoulders',
        group: 'back_neck',
        side: 'left',
        anchor: { xPercent: 36, yPercent: 14 },
        labelPosition: { top: 96, offset: 180 },
        landmarkShort: 'Cuello a acromion',
        instructions: 'Desde nacimiento del cuello lateral hasta saliente acromial.',
    },
    {
        code: 'ancho_pecho',
        label: 'ANCHO PECHO',
        zone: 'chest',
        group: 'bust_torso',
        side: 'left',
        anchor: { xPercent: 40, yPercent: 20 },
        labelPosition: { top: 160, offset: 180 },
        landmarkShort: 'Pliegues axilares anteriores',
        instructions: 'Entre puntos de inserción de mangas anteriores.',
    },
    {
        code: 'contorno_alto_busto',
        label: 'ALTO BUSTO',
        zone: 'bust',
        group: 'bust_torso',
        side: 'left',
        anchor: { xPercent: 34, yPercent: 25 },
        labelPosition: { top: 224, offset: 180 },
        landmarkShort: 'Bajo axilas horizontal',
        instructions: 'Contorno tórax superior bajo axilas.',
    },
    {
        code: 'contorno_busto',
        label: 'BUSTO PRINCIPAL',
        zone: 'bust',
        group: 'bust_torso',
        side: 'left',
        anchor: { xPercent: 32, yPercent: 30 },
        labelPosition: { top: 288, offset: 190 },
        isPrimary: true,
        landmarkShort: 'Ápex mamario / prominencia',
        instructions: 'Paso horizontal sobre la cúspide de ambos senos.',
    },
    {
        code: 'contorno_bajo_busto',
        label: 'BAJO BUSTO',
        zone: 'bust',
        group: 'bust_torso',
        side: 'left',
        anchor: { xPercent: 36, yPercent: 35 },
        labelPosition: { top: 352, offset: 180 },
        landmarkShort: 'Surco inframamario',
        instructions: 'Contorno de base del tórax directamente bajo el seno.',
    },
    {
        code: 'contorno_cintura',
        label: 'CINTURA NATURAL',
        zone: 'waist',
        group: 'waist_hip',
        side: 'left',
        anchor: { xPercent: 38, yPercent: 42 },
        labelPosition: { top: 418, offset: 190 },
        isPrimary: true,
        landmarkShort: 'Línea de quiebre de talle',
        instructions: 'Depresión natural más estrecha del torso.',
    },
    {
        code: 'contorno_cadera_alta',
        label: 'CADERA ALTA',
        zone: 'hip',
        group: 'waist_hip',
        side: 'left',
        anchor: { xPercent: 35, yPercent: 48 },
        labelPosition: { top: 480, offset: 180 },
        landmarkShort: 'Crestas ilíacas (+10 cm)',
        instructions: 'Nivel óseo de crestas ilíacas bajo cintura.',
    },
    {
        code: 'contorno_cadera',
        label: 'CADERA TOTAL',
        zone: 'hip',
        group: 'waist_hip',
        side: 'left',
        anchor: { xPercent: 31, yPercent: 55 },
        labelPosition: { top: 544, offset: 190 },
        isPrimary: true,
        landmarkShort: 'Proyección glútea máxima',
        instructions: 'Puntos de mayor relieve de glúteos y trocánteres.',
    },
    {
        code: 'altura_cadera',
        label: 'ALTURA CADERA',
        zone: 'hip',
        group: 'waist_hip',
        side: 'left',
        anchor: { xPercent: 34, yPercent: 50 },
        labelPosition: { top: 608, offset: 180 },
        landmarkShort: 'Cintura a cadera vertical',
        instructions: 'Distancia vertical de cintura a plano máximo de cadera.',
    },
    {
        code: 'contorno_muslo',
        label: 'CONT. MUSLO',
        zone: 'legs_lower',
        group: 'lower',
        side: 'left',
        anchor: { xPercent: 41, yPercent: 62 },
        labelPosition: { top: 670, offset: 180 },
        landmarkShort: 'Raíz del muslo superior',
        instructions: 'Perímetro máximo en la base inferior del glúteo.',
    },
    {
        code: 'largo_falda',
        label: 'LARGO FALDA',
        zone: 'legs_lower',
        group: 'lower',
        side: 'left',
        anchor: { xPercent: 42, yPercent: 74 },
        labelPosition: { top: 730, offset: 180 },
        landmarkShort: 'Cintura hacia caída',
        instructions: 'Desde cintura hasta rodilla o cota de diseño.',
    },

    // --------------------------------------------------------------------------
    // LADO DERECHO: Dorsal, cuello, extremidades y mangas
    // --------------------------------------------------------------------------
    {
        code: 'contorno_cuello',
        label: 'CONT. CUELLO',
        zone: 'head_neck',
        group: 'back_neck',
        side: 'right',
        anchor: { xPercent: 55, yPercent: 10 },
        labelPosition: { top: 62, offset: 180 },
        landmarkShort: 'Base cervical 7ma',
        instructions: 'Alrededor de base del cuello y horquilla esternal.',
    },
    {
        code: 'ancho_espalda',
        label: 'ANCHO ESPALDA',
        zone: 'back',
        group: 'back_neck',
        side: 'right',
        anchor: { xPercent: 62, yPercent: 18 },
        labelPosition: { top: 128, offset: 180 },
        landmarkShort: 'Pliegues axilares posteriores',
        instructions: 'Distancia horizontal entre pliegues axilares traseros.',
    },
    {
        code: 'profundidad_sisa',
        label: 'PROF. SISA',
        zone: 'back',
        group: 'bust_torso',
        side: 'right',
        anchor: { xPercent: 66, yPercent: 23 },
        labelPosition: { top: 192, offset: 180 },
        landmarkShort: 'Base de axila a cervical',
        instructions: 'Vertical desde 7ma cervical a nivel horizontal sub-axilar.',
    },
    {
        code: 'largo_talle_delantero',
        label: 'LARGO TALLE DELANTERO',
        zone: 'bust',
        group: 'bust_torso',
        side: 'right',
        anchor: { xPercent: 58, yPercent: 28 },
        labelPosition: { top: 256, offset: 180 },
        landmarkShort: 'Hombro pasando por ápex',
        instructions: 'Desde unión cuello-hombro sobre pezón hasta cintura.',
    },
    {
        code: 'separacion_busto',
        label: 'SEPARACIÓN BUSTO',
        zone: 'bust',
        group: 'bust_torso',
        side: 'right',
        anchor: { xPercent: 54, yPercent: 31 },
        labelPosition: { top: 320, offset: 180 },
        landmarkShort: 'Distancia entre pezones',
        instructions: 'Distancia horizontal entre ambos vértices mamarios.',
    },
    {
        code: 'largo_talle_espalda',
        label: 'LARGO TALLE ESPALDA',
        zone: 'back',
        group: 'back_neck',
        side: 'right',
        anchor: { xPercent: 52, yPercent: 38 },
        labelPosition: { top: 384, offset: 180 },
        isPrimary: true,
        landmarkShort: '7ma cervical a cintura',
        instructions: 'Línea de columna vertebral hasta cinta de cintura.',
    },
    {
        code: 'contorno_biceps',
        label: 'CONT. BÍCEPS',
        zone: 'arms',
        group: 'arms',
        side: 'right',
        anchor: { xPercent: 74, yPercent: 32 },
        labelPosition: { top: 448, offset: 180 },
        landmarkShort: 'Vientre muscular braquial',
        instructions: 'Brazo relajado, perímetro máximo braquial.',
    },
    {
        code: 'largo_brazo',
        label: 'LARGO BRAZO',
        zone: 'arms',
        group: 'arms',
        side: 'right',
        anchor: { xPercent: 76, yPercent: 44 },
        labelPosition: { top: 512, offset: 180 },
        landmarkShort: 'Acromion a muñeca con codo',
        instructions: 'Desde acromion por codo flexionado a apófisis estiloides.',
    },
    {
        code: 'altura_tiro',
        label: 'ALTURA TIRO',
        zone: 'hip',
        group: 'waist_hip',
        side: 'right',
        anchor: { xPercent: 54, yPercent: 53 },
        labelPosition: { top: 576, offset: 180 },
        landmarkShort: 'Cintura a plano de asiento',
        instructions: 'Sentada sobre superficie plana, de cintura a asiento.',
    },
    {
        code: 'contorno_muneca',
        label: 'CONT. MUÑECA',
        zone: 'arms',
        group: 'arms',
        side: 'right',
        anchor: { xPercent: 78, yPercent: 56 },
        labelPosition: { top: 638, offset: 180 },
        landmarkShort: 'Apófisis estiloides',
        instructions: 'Alrededor de los huesos salientes de la muñeca.',
    },
    {
        code: 'contorno_rodilla',
        label: 'CONT. RODILLA',
        zone: 'legs_lower',
        group: 'lower',
        side: 'right',
        anchor: { xPercent: 59, yPercent: 71 },
        labelPosition: { top: 698, offset: 180 },
        landmarkShort: 'Rótula e interlínea',
        instructions: 'Sobre el centro de la rótula con pierna extendida.',
    },
    {
        code: 'largo_pantalon',
        label: 'LARGO PANTALÓN',
        zone: 'legs_lower',
        group: 'lower',
        side: 'right',
        anchor: { xPercent: 58, yPercent: 86 },
        labelPosition: { top: 754, offset: 180 },
        landmarkShort: 'Cintura exterior al suelo',
        instructions: 'Lateral desde cintura por cadera hasta suelo.',
    },
];

/**
 * Mapeo indexado por código para consulta O(1)
 */
export const ANATOMICAL_COTAS_BY_CODE: Record<string, AnatomicalCotaConfig> =
    ANATOMICAL_COTAS_MAPPING.reduce((acc, cota) => {
        acc[cota.code] = cota;
        return acc;
    }, {} as Record<string, AnatomicalCotaConfig>);

export const COTA_CANONICAL_MEASURE_KEYS: Record<string, string[]> = {
    estatura_total: ['estatura_total', 'estatura'],
    altura_cadera: ['altura_cadera', 'profundidad_cintura_cadera'],
    altura_tiro: ['altura_tiro', 'profundidad_tiro'],
    largo_pantalon: ['largo_pantalon', 'largo_exterior_pierna'],
};

/**
 * Resuelve el valor numérico en milímetros de una cota anatómica,
 * consultando primero la clave directa y si no existe, resolviendo el alias canónico.
 */
export function resolveMeasurementValueMm(
    measurementsMm: Record<string, number> | undefined | null,
    cotaCode: string
): number | undefined {
    if (!measurementsMm) return undefined;
    const directVal = measurementsMm[cotaCode];
    if (typeof directVal === 'number' && Number.isFinite(directVal) && directVal > 0) {
        return directVal;
    }
    const aliases = COTA_CANONICAL_MEASURE_KEYS[cotaCode];
    if (aliases) {
        for (const alias of aliases) {
            const v = measurementsMm[alias];
            if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
                return v;
            }
        }
    }
    return undefined;
}

/**
 * Zonas anatómicas efectivamente contenidas en el maniquí de torso (Stockman).
 * Los miembros superiores (brazos/manga) y miembros inferiores (muslo, rodilla, largos)
 * NO pertenecen a la fotografía de torso.
 */
export const TORSO_SPECIALIZED_ZONES: AnatomicalZone[] = [
    'head_neck',
    'shoulders',
    'back',
    'chest',
    'bust',
    'waist',
    'hip',
];

/**
 * Cotas excluidas expresamente de la vista de torso (Stockman):
 * - Estatura total (requiere coronilla a suelo).
 * - Altura de tiro (requiere plano de asiento/entrepierna).
 * - Miembros superiores (bíceps, largo de brazo, muñeca).
 * - Miembros inferiores (muslo, rodilla, largo de falda, largo de pantalón).
 */
export const TORSO_EXCLUDED_COTA_CODES = new Set<string>([
    'estatura_total',
    'altura_tiro',
    'contorno_muslo',
    'contorno_rodilla',
    'largo_falda',
    'largo_pantalon',
    'contorno_biceps',
    'largo_brazo',
    'contorno_muneca',
]);

/**
 * Determina si una cota es visible en la vista especializada de torso (Stockman).
 * Acepta tanto la zona anatómica como el código específico de la cota.
 */
export function isCotaVisibleInTorsoView(zone: AnatomicalZone, code?: string): boolean {
    if (code && TORSO_EXCLUDED_COTA_CODES.has(code)) return false;
    if (zone === 'arms' || zone === 'legs_lower') return false;
    return true;
}

/**
 * Códigos de medidas longitudinales del catálogo y maniquí.
 * A diferencia de los contornos (perímetros de una región), las medidas longitudinales
 * describen la distancia física entre dos extremos anatómicos claramente identificables.
 */
export const LONGITUDINAL_MEASURE_CODES = new Set<string>([
    'estatura_total',
    'largo_hombro',
    'largo_talle_delantero',
    'largo_talle_espalda',
    'largo_brazo',
    'altura_cadera',
    'largo_falda',
    'largo_pantalon',
    'profundidad_sisa',
    'altura_tiro',
    'largo_exterior_pierna',
    'largo_entrepierna',
]);

export function isLongitudinalMeasure(code: string): boolean {
    return LONGITUDINAL_MEASURE_CODES.has(code);
}

/**
 * Códigos esenciales para el modo "VISTA RESUMEN" (Sastrería fundamental).
 * Destaca: Contorno de cuello, Ancho/Largo de hombro, Busto principal, Cintura natural y Cadera total.
 */
export const SUMMARY_PRIMARY_COTA_CODES = new Set<string>([
    'contorno_cuello',
    'largo_hombro',
    'contorno_busto',
    'contorno_cintura',
    'contorno_cadera',
]);

export function isSummaryPrimaryCota(code: string): boolean {
    return SUMMARY_PRIMARY_COTA_CODES.has(code);
}

/**
 * Perspectiva anatómica: frontal (cara anterior) o posterior (cara dorsal / espalda).
 */
export type AnatomicalPerspective = 'front' | 'back';

/**
 * Medidas exclusivas de la cara dorsal / posterior.
 * No deben proyectarse sobre la silueta frontal ni sobre la fotografía frontal de Stockman.
 */
export const DORSAL_EXCLUSIVE_COTA_CODES = new Set<string>([
    'ancho_espalda',
    'profundidad_sisa',
    'largo_talle_espalda',
]);

/**
 * Medidas exclusivas de la cara frontal / anterior.
 * No deben proyectarse sobre la silueta de espalda.
 */
export const FRONTAL_EXCLUSIVE_COTA_CODES = new Set<string>([
    'ancho_pecho',
    'contorno_alto_busto',
    'contorno_busto',
    'contorno_bajo_busto',
    'separacion_busto',
    'largo_talle_delantero',
    'altura_tiro',
]);

/**
 * Determina si una cota es compatible con la perspectiva visual activa (frontal o posterior).
 */
export function isCotaCompatibleWithPerspective(
    code: string,
    perspective: AnatomicalPerspective
): boolean {
    if (perspective === 'front') {
        return !DORSAL_EXCLUSIVE_COTA_CODES.has(code);
    } else {
        return !FRONTAL_EXCLUSIVE_COTA_CODES.has(code);
    }
}

/**
 * Formateador de presentación humana para alta costura:
 * - Medidas corporales principales (contornos, anchos, largos): CENTÍMETROS (cm).
 * - Holguras, costuras y márgenes de precisión: MILÍMETROS (mm).
 */
export function formatAnatomicalMeasure(
    valMm: number | undefined | null,
    code?: string
): {
    formatted: string;
    valueNum: number;
    unit: 'cm' | 'mm';
    isRegistered: boolean;
    displayCm: string;
    displayMm: string;
} {
    if (typeof valMm !== 'number' || !Number.isFinite(valMm) || valMm <= 0) {
        return {
            formatted: 'No registrada',
            valueNum: 0,
            unit: 'cm',
            isRegistered: false,
            displayCm: '—',
            displayMm: '—',
        };
    }

    const cotaDef = code ? ANATOMICAL_COTAS_BY_CODE[code] : undefined;
    const isWorkshopParam = code ? (code.includes('holgura') || code.includes('margen') || code.includes('tolerancia')) : false;
    const isSmallMm = cotaDef?.isSmallMeasureMm || (valMm < 10 && isWorkshopParam);

    const cmVal = valMm / 10.0;
    const cmFormatted =
        (Number.isInteger(cmVal) ? cmVal.toFixed(0) : cmVal.toFixed(1)) + ' cm';
    const mmFormatted = `${Math.round(valMm)} mm`;

    if (isSmallMm) {
        return {
            formatted: mmFormatted,
            valueNum: Math.round(valMm),
            unit: 'mm',
            isRegistered: true,
            displayCm: cmFormatted,
            displayMm: mmFormatted,
        };
    }

    return {
        formatted: cmFormatted,
        valueNum: Number.isInteger(cmVal) ? cmVal : Number(cmVal.toFixed(1)),
        unit: 'cm',
        isRegistered: true,
        displayCm: cmFormatted,
        displayMm: mmFormatted,
    };
}

/**
 * Calcula los factores de escala paramétricos para la silueta del maniquí
 * a partir de las medidas de la clienta (o valores por defecto si no existen).
 */
export interface ParametricMannequinProportions {
    bustScale: number;     // 0.85 a 1.25 respecto al estándar
    waistScale: number;    // 0.80 a 1.30 respecto al estándar
    hipScale: number;      // 0.85 a 1.30 respecto al estándar
    shoulderScale: number; // 0.90 a 1.15
    torsoStretch: number;  // 0.90 a 1.15
    bustCm: number;
    waistCm: number;
    hipCm: number;
    archetype: BodyDemographicType;
}

export function computeParametricProportions(
    measurementsMm: Record<string, number>,
    archetype: BodyDemographicType = 'woman'
): ParametricMannequinProportions {
    // Referencias base de alta costura Talla 38/40 (en mm)
    const BASE_BUST_MM = 920;
    const BASE_WAIST_MM = 720;
    const BASE_HIP_MM = 980;
    const BASE_SHOULDER_MM = 125;
    const BASE_BACK_LENGTH_MM = 415;

    const rawBust = resolveMeasurementValueMm(measurementsMm, 'contorno_busto') || BASE_BUST_MM;
    const rawWaist = resolveMeasurementValueMm(measurementsMm, 'contorno_cintura') || BASE_WAIST_MM;
    const rawHip = resolveMeasurementValueMm(measurementsMm, 'contorno_cadera') || BASE_HIP_MM;
    const rawShoulder = resolveMeasurementValueMm(measurementsMm, 'largo_hombro') || BASE_SHOULDER_MM;
    const rawBack = resolveMeasurementValueMm(measurementsMm, 'largo_talle_espalda') || BASE_BACK_LENGTH_MM;

    const clamp = (val: number, min: number, max: number) =>
        Math.min(max, Math.max(min, val));

    // Factor paramétrico respecto a la base del atelier
    const bustScale = clamp(rawBust / BASE_BUST_MM, 0.82, 1.35);
    const waistScale = clamp(rawWaist / BASE_WAIST_MM, 0.78, 1.40);
    const hipScale = clamp(rawHip / BASE_HIP_MM, 0.80, 1.35);
    const shoulderScale = clamp(rawShoulder / BASE_SHOULDER_MM, 0.88, 1.20);
    const torsoStretch = clamp(rawBack / BASE_BACK_LENGTH_MM, 0.90, 1.18);

    return {
        bustScale,
        waistScale,
        hipScale,
        shoulderScale,
        torsoStretch,
        bustCm: Math.round(rawBust / 10),
        waistCm: Math.round(rawWaist / 10),
        hipCm: Math.round(rawHip / 10),
        archetype,
    };
}

// ==============================================================================
// MODELO ANATÓMICO NORMALIZADO Y RESOLUCIÓN ANTI-COLISIÓN (SECCIONES 2 A 7)
// ==============================================================================

export interface NormalizedAnatomicalAnchor {
    xNorm: number; // 0.0 a 1.0 (0.50 = eje central sagital)
    yNorm: number; // 0.0 a 1.0 (0.0 = coronilla/remate, 1.0 = plano suelo)
    contourRadiusNorm: number; // Radio normalizado del contorno corporal a esa altura
    side: 'left' | 'right';
    zone: AnatomicalZone;
    landmarkLabel: string;
}

export const ARCHETYPE_NORMALIZED_ANCHORS: Record<
    BodyDemographicType,
    Record<string, NormalizedAnatomicalAnchor>
> = {
    woman: {
        estatura_total: { xNorm: 0.500, yNorm: 0.045, contourRadiusNorm: 0.040, side: 'left', zone: 'head_neck', landmarkLabel: 'Vértice craneal' },
        contorno_cuello: { xNorm: 0.535, yNorm: 0.128, contourRadiusNorm: 0.045, side: 'right', zone: 'head_neck', landmarkLabel: 'Base cervical 7ma' },
        largo_hombro: { xNorm: 0.355, yNorm: 0.170, contourRadiusNorm: 0.145, side: 'left', zone: 'shoulders', landmarkLabel: 'Acromion clavicular' },
        ancho_espalda: { xNorm: 0.630, yNorm: 0.208, contourRadiusNorm: 0.130, side: 'right', zone: 'back', landmarkLabel: 'Pliegues axilares posteriores' },
        ancho_pecho: { xNorm: 0.375, yNorm: 0.222, contourRadiusNorm: 0.125, side: 'left', zone: 'chest', landmarkLabel: 'Tórax anterior' },
        profundidad_sisa: { xNorm: 0.665, yNorm: 0.245, contourRadiusNorm: 0.165, side: 'right', zone: 'back', landmarkLabel: 'Base axilar horizontal' },
        contorno_alto_busto: { xNorm: 0.335, yNorm: 0.258, contourRadiusNorm: 0.165, side: 'left', zone: 'bust', landmarkLabel: 'Tórax superior sub-axilar' },
        contorno_busto: { xNorm: 0.315, yNorm: 0.295, contourRadiusNorm: 0.185, side: 'left', zone: 'bust', landmarkLabel: 'Ápex mamario' },
        separacion_busto: { xNorm: 0.570, yNorm: 0.295, contourRadiusNorm: 0.070, side: 'right', zone: 'bust', landmarkLabel: 'Inter-mamario' },
        contorno_bajo_busto: { xNorm: 0.355, yNorm: 0.345, contourRadiusNorm: 0.145, side: 'left', zone: 'bust', landmarkLabel: 'Surco inframamario' },
        largo_talle_delantero: { xNorm: 0.575, yNorm: 0.360, contourRadiusNorm: 0.075, side: 'right', zone: 'bust', landmarkLabel: 'Hombro a cintura por ápex' },
        contorno_biceps: { xNorm: 0.725, yNorm: 0.310, contourRadiusNorm: 0.225, side: 'right', zone: 'arms', landmarkLabel: 'Vientre muscular braquial' },
        largo_talle_espalda: { xNorm: 0.525, yNorm: 0.400, contourRadiusNorm: 0.025, side: 'right', zone: 'back', landmarkLabel: 'Columna a cintura' },
        contorno_cintura: { xNorm: 0.380, yNorm: 0.430, contourRadiusNorm: 0.120, side: 'left', zone: 'waist', landmarkLabel: 'Entalle de cintura natural' },
        largo_brazo: { xNorm: 0.745, yNorm: 0.455, contourRadiusNorm: 0.245, side: 'right', zone: 'arms', landmarkLabel: 'Acromion por codo a muñeca' },
        contorno_cadera_alta: { xNorm: 0.345, yNorm: 0.495, contourRadiusNorm: 0.155, side: 'left', zone: 'hip', landmarkLabel: 'Crestas ilíacas' },
        altura_tiro: { xNorm: 0.535, yNorm: 0.530, contourRadiusNorm: 0.035, side: 'right', zone: 'hip', landmarkLabel: 'Cintura a entrepierna' },
        contorno_cadera: { xNorm: 0.305, yNorm: 0.565, contourRadiusNorm: 0.195, side: 'left', zone: 'hip', landmarkLabel: 'Trocánteres y volumen glúteo' },
        altura_cadera: { xNorm: 0.365, yNorm: 0.520, contourRadiusNorm: 0.135, side: 'left', zone: 'hip', landmarkLabel: 'Cintura a plano de cadera' },
        contorno_muneca: { xNorm: 0.765, yNorm: 0.585, contourRadiusNorm: 0.265, side: 'right', zone: 'arms', landmarkLabel: 'Apófisis estiloides' },
        contorno_muslo: { xNorm: 0.405, yNorm: 0.640, contourRadiusNorm: 0.095, side: 'left', zone: 'legs_lower', landmarkLabel: 'Raíz del muslo' },
        contorno_rodilla: { xNorm: 0.585, yNorm: 0.740, contourRadiusNorm: 0.085, side: 'right', zone: 'legs_lower', landmarkLabel: 'Centro rotuliano' },
        largo_falda: { xNorm: 0.415, yNorm: 0.785, contourRadiusNorm: 0.085, side: 'left', zone: 'legs_lower', landmarkLabel: 'Cintura a nivel de falda' },
        largo_pantalon: { xNorm: 0.580, yNorm: 0.900, contourRadiusNorm: 0.080, side: 'right', zone: 'legs_lower', landmarkLabel: 'Cintura a suelo' },
    },
    man: {
        estatura_total: { xNorm: 0.500, yNorm: 0.045, contourRadiusNorm: 0.045, side: 'left', zone: 'head_neck', landmarkLabel: 'Vértice craneal' },
        contorno_cuello: { xNorm: 0.540, yNorm: 0.125, contourRadiusNorm: 0.050, side: 'right', zone: 'head_neck', landmarkLabel: 'Base cervical 7ma' },
        largo_hombro: { xNorm: 0.315, yNorm: 0.160, contourRadiusNorm: 0.185, side: 'left', zone: 'shoulders', landmarkLabel: 'Acromion clavicular sastre' },
        ancho_espalda: { xNorm: 0.665, yNorm: 0.205, contourRadiusNorm: 0.165, side: 'right', zone: 'back', landmarkLabel: 'Dorsal masculino' },
        ancho_pecho: { xNorm: 0.345, yNorm: 0.218, contourRadiusNorm: 0.155, side: 'left', zone: 'chest', landmarkLabel: 'Pectoral superior' },
        profundidad_sisa: { xNorm: 0.680, yNorm: 0.240, contourRadiusNorm: 0.180, side: 'right', zone: 'back', landmarkLabel: 'Base axilar sastre' },
        contorno_alto_busto: { xNorm: 0.320, yNorm: 0.252, contourRadiusNorm: 0.180, side: 'left', zone: 'bust', landmarkLabel: 'Tórax alto' },
        contorno_busto: { xNorm: 0.310, yNorm: 0.285, contourRadiusNorm: 0.190, side: 'left', zone: 'bust', landmarkLabel: 'Tórax sastre principal' },
        separacion_busto: { xNorm: 0.585, yNorm: 0.285, contourRadiusNorm: 0.085, side: 'right', zone: 'bust', landmarkLabel: 'Pectoral intermedio' },
        contorno_bajo_busto: { xNorm: 0.345, yNorm: 0.340, contourRadiusNorm: 0.155, side: 'left', zone: 'bust', landmarkLabel: 'Base subpectoral' },
        largo_talle_delantero: { xNorm: 0.580, yNorm: 0.360, contourRadiusNorm: 0.080, side: 'right', zone: 'bust', landmarkLabel: 'Talle frontal sastre' },
        contorno_biceps: { xNorm: 0.745, yNorm: 0.310, contourRadiusNorm: 0.245, side: 'right', zone: 'arms', landmarkLabel: 'Bíceps sastre' },
        largo_talle_espalda: { xNorm: 0.525, yNorm: 0.400, contourRadiusNorm: 0.025, side: 'right', zone: 'back', landmarkLabel: 'Talle dorsal' },
        contorno_cintura: { xNorm: 0.385, yNorm: 0.430, contourRadiusNorm: 0.115, side: 'left', zone: 'waist', landmarkLabel: 'Cintura masculina' },
        largo_brazo: { xNorm: 0.760, yNorm: 0.455, contourRadiusNorm: 0.260, side: 'right', zone: 'arms', landmarkLabel: 'Largo de manga sastre' },
        contorno_cadera_alta: { xNorm: 0.355, yNorm: 0.495, contourRadiusNorm: 0.145, side: 'left', zone: 'hip', landmarkLabel: 'Línea de cinturón' },
        altura_tiro: { xNorm: 0.535, yNorm: 0.530, contourRadiusNorm: 0.035, side: 'right', zone: 'hip', landmarkLabel: 'Tiro de pantalón' },
        contorno_cadera: { xNorm: 0.345, yNorm: 0.555, contourRadiusNorm: 0.155, side: 'left', zone: 'hip', landmarkLabel: 'Cadera masculina' },
        altura_cadera: { xNorm: 0.370, yNorm: 0.520, contourRadiusNorm: 0.130, side: 'left', zone: 'hip', landmarkLabel: 'Cintura a cadera' },
        contorno_muneca: { xNorm: 0.775, yNorm: 0.590, contourRadiusNorm: 0.275, side: 'right', zone: 'arms', landmarkLabel: 'Muñeca sastre' },
        contorno_muslo: { xNorm: 0.410, yNorm: 0.640, contourRadiusNorm: 0.090, side: 'left', zone: 'legs_lower', landmarkLabel: 'Muslo masculino' },
        contorno_rodilla: { xNorm: 0.585, yNorm: 0.740, contourRadiusNorm: 0.085, side: 'right', zone: 'legs_lower', landmarkLabel: 'Rodilla sastre' },
        largo_falda: { xNorm: 0.420, yNorm: 0.785, contourRadiusNorm: 0.080, side: 'left', zone: 'legs_lower', landmarkLabel: 'Largo inferior' },
        largo_pantalon: { xNorm: 0.580, yNorm: 0.900, contourRadiusNorm: 0.080, side: 'right', zone: 'legs_lower', landmarkLabel: 'Largo de pernera' },
    },
    girl: {
        estatura_total: { xNorm: 0.500, yNorm: 0.050, contourRadiusNorm: 0.040, side: 'left', zone: 'head_neck', landmarkLabel: 'Vértice craneal' },
        contorno_cuello: { xNorm: 0.535, yNorm: 0.135, contourRadiusNorm: 0.040, side: 'right', zone: 'head_neck', landmarkLabel: 'Cuello infantil' },
        largo_hombro: { xNorm: 0.365, yNorm: 0.175, contourRadiusNorm: 0.135, side: 'left', zone: 'shoulders', landmarkLabel: 'Hombro niña' },
        ancho_espalda: { xNorm: 0.620, yNorm: 0.215, contourRadiusNorm: 0.120, side: 'right', zone: 'back', landmarkLabel: 'Espalda niña' },
        ancho_pecho: { xNorm: 0.385, yNorm: 0.228, contourRadiusNorm: 0.115, side: 'left', zone: 'chest', landmarkLabel: 'Pecho niña' },
        profundidad_sisa: { xNorm: 0.650, yNorm: 0.245, contourRadiusNorm: 0.150, side: 'right', zone: 'back', landmarkLabel: 'Sisa infantil' },
        contorno_alto_busto: { xNorm: 0.355, yNorm: 0.258, contourRadiusNorm: 0.145, side: 'left', zone: 'bust', landmarkLabel: 'Tórax superior' },
        contorno_busto: { xNorm: 0.345, yNorm: 0.295, contourRadiusNorm: 0.155, side: 'left', zone: 'bust', landmarkLabel: 'Contorno de tórax' },
        separacion_busto: { xNorm: 0.560, yNorm: 0.295, contourRadiusNorm: 0.060, side: 'right', zone: 'bust', landmarkLabel: 'Inter-pectoral' },
        contorno_bajo_busto: { xNorm: 0.365, yNorm: 0.345, contourRadiusNorm: 0.135, side: 'left', zone: 'bust', landmarkLabel: 'Base torácica' },
        largo_talle_delantero: { xNorm: 0.570, yNorm: 0.360, contourRadiusNorm: 0.070, side: 'right', zone: 'bust', landmarkLabel: 'Talle delantero' },
        contorno_biceps: { xNorm: 0.710, yNorm: 0.310, contourRadiusNorm: 0.210, side: 'right', zone: 'arms', landmarkLabel: 'Brazo infantil' },
        largo_talle_espalda: { xNorm: 0.525, yNorm: 0.400, contourRadiusNorm: 0.025, side: 'right', zone: 'back', landmarkLabel: 'Talle espalda' },
        contorno_cintura: { xNorm: 0.395, yNorm: 0.405, contourRadiusNorm: 0.105, side: 'left', zone: 'waist', landmarkLabel: 'Cintura niña' },
        largo_brazo: { xNorm: 0.730, yNorm: 0.450, contourRadiusNorm: 0.230, side: 'right', zone: 'arms', landmarkLabel: 'Manga niña' },
        contorno_cadera_alta: { xNorm: 0.365, yNorm: 0.495, contourRadiusNorm: 0.135, side: 'left', zone: 'hip', landmarkLabel: 'Cadera alta' },
        altura_tiro: { xNorm: 0.535, yNorm: 0.530, contourRadiusNorm: 0.035, side: 'right', zone: 'hip', landmarkLabel: 'Tiro infantil' },
        contorno_cadera: { xNorm: 0.355, yNorm: 0.555, contourRadiusNorm: 0.145, side: 'left', zone: 'hip', landmarkLabel: 'Cadera niña' },
        altura_cadera: { xNorm: 0.380, yNorm: 0.520, contourRadiusNorm: 0.120, side: 'left', zone: 'hip', landmarkLabel: 'Altura cadera' },
        contorno_muneca: { xNorm: 0.745, yNorm: 0.580, contourRadiusNorm: 0.245, side: 'right', zone: 'arms', landmarkLabel: 'Muñeca niña' },
        contorno_muslo: { xNorm: 0.420, yNorm: 0.635, contourRadiusNorm: 0.080, side: 'left', zone: 'legs_lower', landmarkLabel: 'Muslo niña' },
        contorno_rodilla: { xNorm: 0.580, yNorm: 0.735, contourRadiusNorm: 0.080, side: 'right', zone: 'legs_lower', landmarkLabel: 'Rodilla niña' },
        largo_falda: { xNorm: 0.425, yNorm: 0.780, contourRadiusNorm: 0.075, side: 'left', zone: 'legs_lower', landmarkLabel: 'Largo falda niña' },
        largo_pantalon: { xNorm: 0.575, yNorm: 0.890, contourRadiusNorm: 0.075, side: 'right', zone: 'legs_lower', landmarkLabel: 'Largo infantil' },
    },
    boy: {
        estatura_total: { xNorm: 0.500, yNorm: 0.050, contourRadiusNorm: 0.040, side: 'left', zone: 'head_neck', landmarkLabel: 'Vértice craneal' },
        contorno_cuello: { xNorm: 0.535, yNorm: 0.135, contourRadiusNorm: 0.040, side: 'right', zone: 'head_neck', landmarkLabel: 'Cuello niño' },
        largo_hombro: { xNorm: 0.350, yNorm: 0.172, contourRadiusNorm: 0.150, side: 'left', zone: 'shoulders', landmarkLabel: 'Hombro niño' },
        ancho_espalda: { xNorm: 0.630, yNorm: 0.215, contourRadiusNorm: 0.130, side: 'right', zone: 'back', landmarkLabel: 'Espalda niño' },
        ancho_pecho: { xNorm: 0.375, yNorm: 0.228, contourRadiusNorm: 0.125, side: 'left', zone: 'chest', landmarkLabel: 'Pecho niño' },
        profundidad_sisa: { xNorm: 0.660, yNorm: 0.245, contourRadiusNorm: 0.160, side: 'right', zone: 'back', landmarkLabel: 'Sisa niño' },
        contorno_alto_busto: { xNorm: 0.350, yNorm: 0.258, contourRadiusNorm: 0.150, side: 'left', zone: 'bust', landmarkLabel: 'Tórax alto' },
        contorno_busto: { xNorm: 0.340, yNorm: 0.290, contourRadiusNorm: 0.160, side: 'left', zone: 'bust', landmarkLabel: 'Tórax niño' },
        separacion_busto: { xNorm: 0.565, yNorm: 0.290, contourRadiusNorm: 0.065, side: 'right', zone: 'bust', landmarkLabel: 'Inter-pectoral' },
        contorno_bajo_busto: { xNorm: 0.360, yNorm: 0.345, contourRadiusNorm: 0.140, side: 'left', zone: 'bust', landmarkLabel: 'Base torácica' },
        largo_talle_delantero: { xNorm: 0.575, yNorm: 0.360, contourRadiusNorm: 0.075, side: 'right', zone: 'bust', landmarkLabel: 'Talle delantero' },
        contorno_biceps: { xNorm: 0.720, yNorm: 0.310, contourRadiusNorm: 0.220, side: 'right', zone: 'arms', landmarkLabel: 'Brazo niño' },
        largo_talle_espalda: { xNorm: 0.525, yNorm: 0.400, contourRadiusNorm: 0.025, side: 'right', zone: 'back', landmarkLabel: 'Talle espalda' },
        contorno_cintura: { xNorm: 0.395, yNorm: 0.405, contourRadiusNorm: 0.105, side: 'left', zone: 'waist', landmarkLabel: 'Cintura niño' },
        largo_brazo: { xNorm: 0.740, yNorm: 0.450, contourRadiusNorm: 0.240, side: 'right', zone: 'arms', landmarkLabel: 'Manga niño' },
        contorno_cadera_alta: { xNorm: 0.365, yNorm: 0.495, contourRadiusNorm: 0.135, side: 'left', zone: 'hip', landmarkLabel: 'Cinturón niño' },
        altura_tiro: { xNorm: 0.535, yNorm: 0.530, contourRadiusNorm: 0.035, side: 'right', zone: 'hip', landmarkLabel: 'Tiro niño' },
        contorno_cadera: { xNorm: 0.355, yNorm: 0.555, contourRadiusNorm: 0.145, side: 'left', zone: 'hip', landmarkLabel: 'Cadera niño' },
        altura_cadera: { xNorm: 0.380, yNorm: 0.520, contourRadiusNorm: 0.120, side: 'left', zone: 'hip', landmarkLabel: 'Altura cadera' },
        contorno_muneca: { xNorm: 0.750, yNorm: 0.580, contourRadiusNorm: 0.250, side: 'right', zone: 'arms', landmarkLabel: 'Muñeca niño' },
        contorno_muslo: { xNorm: 0.420, yNorm: 0.635, contourRadiusNorm: 0.080, side: 'left', zone: 'legs_lower', landmarkLabel: 'Muslo niño' },
        contorno_rodilla: { xNorm: 0.580, yNorm: 0.735, contourRadiusNorm: 0.080, side: 'right', zone: 'legs_lower', landmarkLabel: 'Rodilla niño' },
        largo_falda: { xNorm: 0.425, yNorm: 0.780, contourRadiusNorm: 0.075, side: 'left', zone: 'legs_lower', landmarkLabel: 'Largo bermuda' },
        largo_pantalon: { xNorm: 0.575, yNorm: 0.890, contourRadiusNorm: 0.075, side: 'right', zone: 'legs_lower', landmarkLabel: 'Largo pantalón' },
    },
};

export interface ScreenAnatomicalCoordinate {
    code: string;
    label: string;
    anchorX: number;
    anchorY: number;
    contourX: number;
    side: 'left' | 'right';
    isPrimary: boolean;
    isRegistered: boolean;
    valueFormatted: string;
    unit: 'cm' | 'mm';
    group: AnatomicalDisplayGroup;
    zone: AnatomicalZone;
    landmarkLabel: string;
    instructions: string;
}

/**
 * Transforma las coordenadas anatómicas normalizadas al espacio de pantalla del escenario,
 * aplicando de forma rigurosa la deformación paramétrica según las medidas de la clienta.
 */
export function computeScreenAnatomicalCoordinates(
    measurementsMm: Record<string, number>,
    demographic: BodyDemographicType = 'woman',
    stageWidth: number = 600,
    stageHeight: number = 840
): Record<string, ScreenAnatomicalCoordinate> {
    const proportions = computeParametricProportions(measurementsMm, demographic);
    const archetypeAnchors = ARCHETYPE_NORMALIZED_ANCHORS[demographic] || ARCHETYPE_NORMALIZED_ANCHORS.woman;

    // Escala del escenario:
    // La imagen real del maniquí se posiciona con un alto estándar de 800 px y centro en CX = stageWidth / 2
    const CX = stageWidth / 2;
    const IMAGE_HEIGHT = 800;
    const IMAGE_WIDTH = IMAGE_HEIGHT * (896 / 1200); // 597.3 px
    const IMAGE_TOP = 20;

    const result: Record<string, ScreenAnatomicalCoordinate> = {};

    for (const cota of ANATOMICAL_COTAS_MAPPING) {
        const norm = archetypeAnchors[cota.code];
        if (!norm) continue;

        // Factor de escala horizontal paramétrico según la zona
        let hScale = 1.0;
        if (norm.zone === 'bust' || norm.zone === 'chest') {
            hScale = proportions.bustScale;
        } else if (norm.zone === 'waist') {
            hScale = proportions.waistScale;
        } else if (norm.zone === 'hip') {
            hScale = proportions.hipScale;
        } else if (norm.zone === 'shoulders') {
            hScale = proportions.shoulderScale;
        }

        // Desplazamiento horizontal respecto al eje central
        const deltaXNorm = (norm.xNorm - 0.500) * hScale;
        const anchorX = CX + deltaXNorm * IMAGE_WIDTH;

        // Contorno exterior correspondiente al radio de la silueta en ese nivel
        const contourRadiusPx = norm.contourRadiusNorm * hScale * IMAGE_WIDTH;
        const contourX = norm.side === 'left' ? CX - contourRadiusPx : CX + contourRadiusPx;

        // Factor de estiramiento vertical de torso
        let vFactor = 1.0;
        if (norm.yNorm > 0.20 && norm.yNorm < 0.60) {
            vFactor = proportions.torsoStretch;
        }
        const yAdjustedNorm = 0.20 + (norm.yNorm - 0.20) * vFactor;
        const anchorY = IMAGE_TOP + yAdjustedNorm * IMAGE_HEIGHT;

        const valMm = resolveMeasurementValueMm(measurementsMm, cota.code);
        const formatted = formatAnatomicalMeasure(valMm, cota.code);

        result[cota.code] = {
            code: cota.code,
            label: cota.label,
            anchorX: Math.round(anchorX),
            anchorY: Math.round(anchorY),
            contourX: Math.round(contourX),
            side: norm.side,
            isPrimary: cota.isPrimary || false,
            isRegistered: formatted.isRegistered,
            valueFormatted: formatted.formatted,
            unit: formatted.unit,
            group: cota.group,
            zone: norm.zone,
            landmarkLabel: norm.landmarkLabel,
            instructions: cota.instructions,
        };
    }

    return result;
}

export interface ResolvedLabelLayout {
    code: string;
    label: string;
    anchorX: number;
    anchorY: number;
    badgeX: number;
    badgeY: number;
    badgeWidth: number;
    badgeHeight: number;
    lineStartX: number;
    lineStartY: number;
    lineEndX: number;
    lineEndY: number;
    turnX: number; // Punto de quiebre para enrutamiento ortogonal / dog-leg
    side: 'left' | 'right';
    isPrimary: boolean;
    isRegistered: boolean;
    valueFormatted: string;
    unit: 'cm' | 'mm';
    group: AnatomicalDisplayGroup;
    zone: AnatomicalZone;
    instructions: string;
    landmarkLabel: string;
}

/**
 * Algoritmo de relajación 1D anti-colisión para etiquetas anatómicas.
 * Garantiza que ninguna etiqueta se solape con otra y que las directrices
 * permanezcan cortas y apunten con rigor milimétrico al anchor del maniquí.
 */
export function resolveAntiCollisionLabelPositions(
    coordinatesList: ScreenAnatomicalCoordinate[],
    side: 'left' | 'right',
    stageWidth: number = 600,
    stageHeight: number = 840
): ResolvedLabelLayout[] {
    const BADGE_WIDTH = 132;
    const BADGE_HEIGHT = 38;
    const MIN_GAP = 42; // Distancia mínima vertical entre centros de etiquetas
    const MIN_Y = 24;
    const MAX_Y = stageHeight - BADGE_HEIGHT - 24;

    const sideCoords = coordinatesList
        .filter((c) => c.side === side)
        .sort((a, b) => a.anchorY - b.anchorY);

    if (sideCoords.length === 0) return [];

    // Inicializar con la posición ideal alineada al anchor Y
    const positions = sideCoords.map((c) => ({
        coord: c,
        y: Math.max(MIN_Y, Math.min(MAX_Y, c.anchorY - BADGE_HEIGHT / 2)),
    }));

    // Pase 1: empujar hacia abajo si hay colisión
    for (let i = 1; i < positions.length; i++) {
        if (positions[i].y < positions[i - 1].y + MIN_GAP) {
            positions[i].y = positions[i - 1].y + MIN_GAP;
        }
    }

    // Pase 2: si el último excede MAX_Y, empujar hacia arriba
    if (positions[positions.length - 1].y > MAX_Y) {
        positions[positions.length - 1].y = MAX_Y;
        for (let i = positions.length - 2; i >= 0; i--) {
            if (positions[i].y > positions[i + 1].y - MIN_GAP) {
                positions[i].y = positions[i + 1].y - MIN_GAP;
            }
        }
    }

    // Pase 3: suavizado hacia la posición del anchor manteniendo la separación
    for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < positions.length; i++) {
            const targetY = positions[i].coord.anchorY - BADGE_HEIGHT / 2;
            const prevY = i > 0 ? positions[i - 1].y + MIN_GAP : MIN_Y;
            const nextY = i < positions.length - 1 ? positions[i + 1].y - MIN_GAP : MAX_Y;
            positions[i].y = Math.max(prevY, Math.min(nextY, targetY));
        }
    }

    // Construir la salida con coordenadas finales de caja y directriz
    return positions.map((p) => {
        const c = p.coord;
        const badgeY = Math.round(p.y);

        let badgeX: number;
        let lineEndX: number;
        let lineStartX: number;
        let lineStartY: number;
        let lineEndY: number;

        let turnX: number;
        if (side === 'left') {
            // Etiqueta a la izquierda: se sitúa próxima al contorno de la silueta
            const edgeGap = 16;
            const idealRightEdge = c.contourX - edgeGap;
            const boundedRightEdge = Math.max(BADGE_WIDTH + 14, Math.min(idealRightEdge, 185));
            badgeX = Math.round(boundedRightEdge - BADGE_WIDTH);
            lineStartX = c.anchorX;
            lineStartY = c.anchorY;
            lineEndX = boundedRightEdge;
            lineEndY = badgeY + BADGE_HEIGHT / 2;
            turnX = Math.round(boundedRightEdge + 14);
        } else {
            // Etiqueta a la derecha: se sitúa próxima al contorno derecho
            const edgeGap = 16;
            const idealLeftEdge = c.contourX + edgeGap;
            const boundedLeftEdge = Math.min(stageWidth - BADGE_WIDTH - 14, Math.max(idealLeftEdge, stageWidth - 185));
            badgeX = Math.round(boundedLeftEdge);
            lineStartX = c.anchorX;
            lineStartY = c.anchorY;
            lineEndX = boundedLeftEdge;
            lineEndY = badgeY + BADGE_HEIGHT / 2;
            turnX = Math.round(boundedLeftEdge - 14);
        }

        return {
            code: c.code,
            label: c.label,
            anchorX: c.anchorX,
            anchorY: c.anchorY,
            badgeX,
            badgeY,
            badgeWidth: BADGE_WIDTH,
            badgeHeight: BADGE_HEIGHT,
            lineStartX,
            lineStartY,
            lineEndX,
            lineEndY,
            turnX,
            side: c.side,
            isPrimary: c.isPrimary,
            isRegistered: c.isRegistered,
            valueFormatted: c.valueFormatted,
            unit: c.unit,
            group: c.group,
            zone: c.zone,
            instructions: c.instructions,
            landmarkLabel: c.landmarkLabel,
        };
    });
}
