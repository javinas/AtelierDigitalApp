// ==============================================================================
// ATELIER DIGITAL — CATÁLOGO: DEFINICIÓN DE CATEGORÍAS DE MEDIDAS
// Archivo: src/engine/pattern/catalog/measurementCategories.ts
// ==============================================================================

import { WORKSHOP_PARAMETER_CODES } from './masterCatalog';

export interface MeasureCategoryDefinition {
    id: string;
    title: string;
    icon: string;
    groupSection: 'Medidas corporales' | 'Medidas de diseño' | 'Parámetros de taller';
    codes: string[];
}

export const MEASURE_CATEGORIES_DEFINITION: MeasureCategoryDefinition[] = [
    {
        id: 'bust_torso',
        title: 'BUSTO Y TÓRAX',
        icon: '👗',
        groupSection: 'Medidas corporales',
        codes: [
            'contorno_busto',
            'contorno_bajo_busto',
            'contorno_alto_busto',
            'altura_busto',
            'separacion_busto',
            'ancho_pecho',
            'contorno_cuello',
            'estatura',
        ],
    },
    {
        id: 'back_shoulders',
        title: 'ESPALDA Y HOMBROS',
        icon: '🧵',
        groupSection: 'Medidas corporales',
        codes: [
            'ancho_hombros',
            'ancho_espalda',
            'largo_hombro',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'profundidad_sisa',
            'inclinacion_hombros',
        ],
    },
    {
        id: 'waist_hip',
        title: 'CINTURA Y CADERA',
        icon: '✂️',
        groupSection: 'Medidas corporales',
        codes: [
            'contorno_cintura',
            'contorno_cadera_alta',
            'contorno_cadera',
            'profundidad_cintura_cadera',
        ],
    },
    {
        id: 'arms_sleeves',
        title: 'BRAZOS Y MANGA',
        icon: '💪',
        groupSection: 'Medidas corporales',
        codes: [
            'largo_brazo',
            'largo_brazo_flexionado',
            'distancia_hombro_codo',
            'contorno_biceps',
            'contorno_codo_flexionado',
            'contorno_antebrazo',
            'contorno_muneca',
        ],
    },
    {
        id: 'lower_lengths',
        title: 'INFERIOR Y LARGOS',
        icon: '👖',
        groupSection: 'Medidas corporales',
        codes: [
            'contorno_muslo',
            'contorno_rodilla',
            'contorno_pantorrilla',
            'contorno_tobillo',
            'largo_exterior_pierna',
            'largo_entrepierna',
            'profundidad_tiro',
        ],
    },
    {
        id: 'garment_design',
        title: 'MEDIDAS DE DISEÑO',
        icon: '✨',
        groupSection: 'Medidas de diseño',
        codes: [
            'largo_falda',
            'largo_blusa',
            'largo_camisa',
            'largo_chaqueta',
            'largo_abrigo',
            'profundidad_escote_diseno',
            'ancho_bajo_pantalon',
        ],
    },
    {
        id: 'workshop_params',
        title: 'PARÁMETROS DE TALLER (HOLGURAS Y MÁRGENES)',
        icon: '📐',
        groupSection: 'Parámetros de taller',
        codes: WORKSHOP_PARAMETER_CODES,
    },
];
