// ==============================================================================
// ATELIER DIGITAL — CATÁLOGO DE PLANTILLAS REUTILIZABLES DE MEDIDAS (FASE 2)
// Archivo: src/engine/pattern/catalog/measurementTemplates.ts
// ==============================================================================
// 10 Plantillas Reutilizables de Medidas para Atelier Digital (Módulo 02).
// Permite a la diseñadora focalizarse exclusivamente en las medidas pertinentes
// a la prenda o servicio, sin duplicar ni inventar códigos fuera de masterCatalog.ts.
// ==============================================================================

import {
    MeasurementTemplate,
    MeasurementTemplateCategory,
    MeasurementTemplateValidationResult,
} from '../../../types/pattern/measurementTemplate';
import { DemographicCategory } from '../../../types/personGroup';
import { MASTER_MEASUREMENT_CATALOG } from './masterCatalog';

// Mapa de imágenes estáticas para visualización editorial
export const TEMPLATE_IMAGES: Record<string, any> = {
    alta_costura_completa: require('../../../../assets/service_couture.jpg'),
    sastreria: require('../../../../assets/garments/jacket.jpg'),
    camisa_blusa: require('../../../../assets/garments/shirt.jpg'),
    pantalon: require('../../../../assets/garments/pants.jpg'),
    falda: require('../../../../assets/garments/skirt.jpg'),
    vestidos: require('../../../../assets/garments/dress.jpg'),
    sastreria_masculina: require('../../../../assets/mannequin_man_real.jpg'),
    infantil: require('../../../../assets/mannequin_girl_real.jpg'),
    uniforme_escolar: require('../../../../assets/service_uniformes.jpg'),
    disfraz_escenico: require('../../../../assets/service_disfraces.jpg'),
};

export const TEMPLATE_CATEGORY_LABELS: Record<MeasurementTemplateCategory, string> = {
    alta_costura: 'Alta Costura & Gala',
    tailoring: 'Sastrería Estructurada',
    daily_wear: 'Prendas Superiores / Camisería',
    lower_body: 'Línea Inferior / Pantalón & Falda',
    specialty: 'Especiales / Infantil & Dotación',
};

export const MEASUREMENT_TEMPLATES: MeasurementTemplate[] = [
    // --------------------------------------------------------------------------
    // 1. ALTA COSTURA COMPLETA
    // --------------------------------------------------------------------------
    {
        id: 'alta_costura_completa',
        name: 'Alta Costura Completa',
        shortDescription: 'Patronaje integral y anatomía completa para trazos a medida de gala, novias y piezas complejas.',
        icon: '👑',
        imageKey: 'alta_costura_completa',
        category: 'alta_costura',
        demographic_categories: ['woman', 'man'],
        measurement_codes: [
            // Torso principal
            'estatura',
            'contorno_cuello',
            'contorno_alto_busto',
            'contorno_busto',
            'contorno_bajo_busto',
            'contorno_cintura',
            'contorno_cadera_alta',
            'contorno_cadera',
            'profundidad_cintura_cadera',
            // Espalda y hombros
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'profundidad_sisa',
            // Extremidades
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'profundidad_sisa',
            'largo_brazo',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_exterior_pierna',
        ],
        optional_codes: [
            'contorno_alto_busto',
            'contorno_bajo_busto',
            'contorno_cadera_alta',
            'profundidad_cintura_cadera',
            'contorno_biceps',
            'largo_entrepierna',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'legs_pants'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 2. SASTRERÍA
    // --------------------------------------------------------------------------
    {
        id: 'sastreria',
        name: 'Sastrería y Chaquetas Estructuradas',
        shortDescription: 'Medidas anatómicas y de porte para chaquetas sastre, abrigos, chalecos y prendas estructuradas.',
        icon: '🧥',
        imageKey: 'sastreria',
        category: 'tailoring',
        demographic_categories: ['woman', 'man'],
        measurement_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'largo_brazo',
            'contorno_biceps',
            'contorno_codo_flexionado',
            'contorno_muneca',
            'largo_chaqueta',
            'largo_abrigo',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'largo_brazo',
            'contorno_muneca',
        ],
        optional_codes: [
            'contorno_biceps',
            'contorno_codo_flexionado',
            'largo_chaqueta',
            'largo_abrigo',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 3. CAMISA / BLUSA
    // --------------------------------------------------------------------------
    {
        id: 'camisa_blusa',
        name: 'Camisa Clásica y Blusa',
        shortDescription: 'Patronaje superior fluido y estructurado para camisería fina, blusas y variantes de manga corta/larga.',
        icon: '👔',
        imageKey: 'camisa_blusa',
        category: 'daily_wear',
        demographic_categories: ['woman', 'man'],
        measurement_codes: [
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'largo_brazo',
            'distancia_hombro_codo',
            'contorno_biceps',
            'contorno_muneca',
            'largo_camisa',
            'largo_blusa',
        ],
        required_codes: [
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'largo_brazo',
            'contorno_muneca',
        ],
        optional_codes: [
            'distancia_hombro_codo',
            'contorno_biceps',
            'largo_camisa',
            'largo_blusa',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 4. PANTALÓN
    // --------------------------------------------------------------------------
    {
        id: 'pantalon',
        name: 'Pantalón, Bermudas y Shorts',
        shortDescription: 'Geometría de tiro, aplomo y perímetros para pantalón sastre, palazzo, short y cortes safari/cargo.',
        icon: '👖',
        imageKey: 'pantalon',
        category: 'lower_body',
        demographic_categories: ['woman', 'man', 'girl', 'boy'],
        measurement_codes: [
            'estatura',
            'contorno_cintura',
            'contorno_cadera_alta',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
            'contorno_muslo',
            'contorno_rodilla',
            'contorno_pantorrilla',
            'contorno_tobillo',
            'ancho_bajo_pantalon',
        ],
        required_codes: [
            'estatura',
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
            'contorno_muslo',
            'ancho_bajo_pantalon',
        ],
        optional_codes: [
            'contorno_cadera_alta',
            'contorno_rodilla',
            'contorno_pantorrilla',
            'contorno_tobillo',
        ],
        anatomical_categories: ['legs_pants', 'torso_body', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 5. FALDA
    // --------------------------------------------------------------------------
    {
        id: 'falda',
        name: 'Falda Clásica y Alta Costura',
        shortDescription: 'Medidas focales de cintura a ruedo para faldas lápiz, evasé, campana y drapeadas.',
        icon: '👗',
        imageKey: 'falda',
        category: 'lower_body',
        demographic_categories: ['woman', 'girl'],
        measurement_codes: [
            'contorno_cintura',
            'contorno_cadera_alta',
            'contorno_cadera',
            'profundidad_cintura_cadera',
            'largo_exterior_pierna',
            'largo_falda',
        ],
        required_codes: [
            'contorno_cintura',
            'contorno_cadera',
            'largo_falda',
        ],
        optional_codes: [
            'contorno_cadera_alta',
            'profundidad_cintura_cadera',
            'largo_exterior_pierna',
        ],
        anatomical_categories: ['torso_body', 'legs_pants', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 6. VESTIDOS
    // --------------------------------------------------------------------------
    {
        id: 'vestidos',
        name: 'Vestidos de Ceremonia y Coctel',
        shortDescription: 'Unión equilibrada de torso y caída inferior para vestidos princesa, imperio, corte sirena y gala.',
        icon: '✨',
        imageKey: 'vestidos',
        category: 'alta_costura',
        demographic_categories: ['woman', 'girl'],
        measurement_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_alto_busto',
            'contorno_busto',
            'contorno_bajo_busto',
            'contorno_cintura',
            'contorno_cadera_alta',
            'contorno_cadera',
            'profundidad_cintura_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'profundidad_sisa',
            'largo_falda',
            'profundidad_escote_diseno',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'profundidad_sisa',
            'largo_falda',
        ],
        optional_codes: [
            'contorno_alto_busto',
            'contorno_bajo_busto',
            'contorno_cadera_alta',
            'profundidad_cintura_cadera',
            'profundidad_escote_diseno',
        ],
        anatomical_categories: ['torso_body', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 7. SASTRERÍA MASCULINA
    // --------------------------------------------------------------------------
    {
        id: 'sastreria_masculina',
        name: 'Sastrería Masculina Clásica',
        shortDescription: 'Patronaje sastre de caballero: caída de hombros, tórax, talle recto, mangas y pantalón de traje.',
        icon: '🤵',
        imageKey: 'sastreria_masculina',
        category: 'tailoring',
        demographic_categories: ['man'],
        measurement_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
            'largo_chaqueta',
            'ancho_bajo_pantalon',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'largo_brazo',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
            'largo_chaqueta',
        ],
        optional_codes: [
            'contorno_biceps',
            'ancho_bajo_pantalon',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'legs_pants', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 8. INFANTIL
    // --------------------------------------------------------------------------
    {
        id: 'infantil',
        name: 'Infantil (Niña y Niño)',
        shortDescription: 'Proporciones antropométricas para niñas y niños de 2 a 16 años, compatibles con tallaje ISO/ASTM.',
        icon: '👧',
        imageKey: 'infantil',
        category: 'specialty',
        demographic_categories: ['girl', 'boy'],
        measurement_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_entrepierna',
            'largo_exterior_pierna',
        ],
        optional_codes: [
            'contorno_biceps',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'legs_pants'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 9. UNIFORME ESCOLAR
    // --------------------------------------------------------------------------
    {
        id: 'uniforme_escolar',
        name: 'Uniforme Escolar y Dotación',
        shortDescription: 'Plantilla sintética de alta eficiencia para producción repetitiva de uniformes (camisa, falda y pantalón).',
        icon: '🎒',
        imageKey: 'uniforme_escolar',
        category: 'specialty',
        demographic_categories: ['girl', 'boy', 'woman', 'man'],
        measurement_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_talle_espalda',
            'largo_brazo',
            'profundidad_tiro',
            'largo_exterior_pierna',
            'largo_falda',
            'largo_camisa',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_talle_espalda',
            'largo_brazo',
            'profundidad_tiro',
            'largo_exterior_pierna',
        ],
        optional_codes: [
            'largo_falda',
            'largo_camisa',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'legs_pants', 'garment_design'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // 10. DISFRAZ / ESCÉNICO
    // --------------------------------------------------------------------------
    {
        id: 'disfraz_escenico',
        name: 'Vestuario Escénico y Carnaval',
        shortDescription: 'Plantilla versátil para comparsas, teatro, danza y trajes de fantasía con ajustes ergonómicos.',
        icon: '🎭',
        imageKey: 'disfraz_escenico',
        category: 'specialty',
        demographic_categories: ['woman', 'man', 'girl', 'boy'],
        measurement_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_exterior_pierna',
            'profundidad_escote_diseno',
        ],
        required_codes: [
            'estatura',
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_muneca',
            'profundidad_tiro',
            'largo_exterior_pierna',
        ],
        optional_codes: [
            'contorno_biceps',
            'profundidad_escote_diseno',
        ],
        anatomical_categories: ['torso_body', 'arms_sleeves', 'legs_pants', 'garment_design'],
        is_active: true,
    },
];

export const MEASUREMENT_TEMPLATE_MAP: Record<string, MeasurementTemplate> =
    MEASUREMENT_TEMPLATES.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, MeasurementTemplate>);

/**
 * Consulta filtrada de plantillas por perfil demográfico y categoría.
 */
export function getMeasurementTemplates(filter?: {
    demographic?: DemographicCategory;
    category?: MeasurementTemplateCategory;
    activeOnly?: boolean;
}): MeasurementTemplate[] {
    let list = MEASUREMENT_TEMPLATES;
    if (filter?.activeOnly !== false) {
        list = list.filter((t) => t.is_active);
    }
    if (filter?.demographic) {
        list = list.filter((t) => t.demographic_categories.includes(filter.demographic!));
    }
    if (filter?.category) {
        list = list.filter((t) => t.category === filter.category);
    }
    return list;
}

/**
 * Obtiene una plantilla por su ID único.
 */
export function getMeasurementTemplateById(id: string): MeasurementTemplate | undefined {
    return MEASUREMENT_TEMPLATE_MAP[id];
}

/**
 * Valida que todos los códigos de una plantilla existan en el catálogo maestro y que no haya duplicados.
 */
export function validateMeasurementTemplate(template: MeasurementTemplate): MeasurementTemplateValidationResult {
    const masterCodes = new Set(MASTER_MEASUREMENT_CATALOG.map((m) => m.code));
    const seen = new Set<string>();
    const duplicateCodes: string[] = [];
    const missingCodes: string[] = [];

    for (const code of template.measurement_codes) {
        if (!masterCodes.has(code)) {
            missingCodes.push(code);
        }
        if (seen.has(code)) {
            duplicateCodes.push(code);
        } else {
            seen.add(code);
        }
    }

    return {
        valid: missingCodes.length === 0 && duplicateCodes.length === 0,
        missingCodes,
        duplicateCodes,
        totalCount: template.measurement_codes.length,
    };
}
