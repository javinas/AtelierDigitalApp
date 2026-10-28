// ==============================================================================
// ATELIER DIGITAL — CATÁLOGO MAESTRO DE MEDIDAS (M02.02)
// Archivo: src/engine/pattern/catalog/masterCatalog.ts
// ==============================================================================
// Códigos estables, instrucciones comprensibles en español y validaciones anatómicas.
// ==============================================================================

import { MeasurementCatalogItem } from '../../../types/pattern/measurement';

export const MASTER_MEASUREMENT_CATALOG: MeasurementCatalogItem[] = [
    // --------------------------------------------------------------------------
    // FAMILIA A: IDENTIFICACIÓN CORPORAL Y TORSO
    // --------------------------------------------------------------------------
    {
        code: 'estatura',
        name: 'Estatura Total',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 1200,
        max_value_mm: 2200,
        instructions: 'Medir descalza desde la coronilla hasta el suelo en posición erguida.',
        anatomical_landmarks: 'Vértice de la cabeza a superficie del suelo.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'pants', 'dress'],
        is_active: true,
    },
    {
        code: 'contorno_cuello',
        name: 'Contorno de Cuello',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 280,
        max_value_mm: 500,
        instructions: 'Medir alrededor de la base del cuello pasando sobre la séptima vértebra cervical.',
        anatomical_landmarks: 'Base del cuello y horquilla esternal.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'blouse'],
        is_active: true,
    },
    {
        code: 'contorno_alto_busto',
        name: 'Contorno Alto de Busto',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 650,
        max_value_mm: 1500,
        instructions: 'Medir por encima del busto pasando justo por debajo de las axilas y recto en la espalda.',
        anatomical_landmarks: 'Pliegues axilares anteriores y posteriores.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress'],
        is_active: true,
    },
    {
        code: 'contorno_busto',
        name: 'Contorno de Busto',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 700,
        max_value_mm: 1600,
        instructions: 'Medir horizontalmente sobre la parte más prominente del busto con cinta nivelada.',
        anatomical_landmarks: 'Crestas de ambos pezones y omóplatos.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress', 'blouse'],
        is_active: true,
    },
    {
        code: 'contorno_bajo_busto',
        name: 'Contorno Bajo Busto',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 600,
        max_value_mm: 1400,
        instructions: 'Medir directamente debajo del pliegue inframamario, ajustado pero confortable.',
        anatomical_landmarks: 'Surco inframamario.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress'],
        is_active: true,
    },
    {
        code: 'contorno_cintura',
        name: 'Contorno de Cintura',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 500,
        max_value_mm: 1400,
        instructions: 'Medir sobre la cintura natural más estrecha, generalmente sobre el ombligo.',
        anatomical_landmarks: 'Depresión natural lateral entre costillas y cresta ilíaca.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'skirt', 'pants', 'dress', 'blouse'],
        is_active: true,
    },
    {
        code: 'contorno_cadera_alta',
        name: 'Contorno de Cadera Alta',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 650,
        max_value_mm: 1600,
        instructions: 'Medir alrededor de los huesos de las caderas, aproximadamente a 10 cm bajo la cintura.',
        anatomical_landmarks: 'Espinas ilíacas anterosuperiores.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['skirt', 'pants', 'dress'],
        is_active: true,
    },
    {
        code: 'contorno_cadera',
        name: 'Contorno de Cadera',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 750,
        max_value_mm: 1800,
        instructions: 'Medir en la parte más prominente de los glúteos manteniendo la cinta horizontal.',
        anatomical_landmarks: 'Máxima prominencia trocantérica y glútea.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['skirt', 'pants', 'dress'],
        is_active: true,
    },
    {
        code: 'profundidad_cintura_cadera',
        name: 'Profundidad Cintura-Cadera',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 140,
        max_value_mm: 280,
        instructions: 'Distancia vertical por el costado desde la cintura natural hasta la línea de cadera máxima.',
        anatomical_landmarks: 'Costado: cinta de cintura a nivel trocantérico.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['skirt', 'dress'],
        is_active: true,
    },
    {
        code: 'ancho_hombros',
        name: 'Ancho de Hombros',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 300,
        max_value_mm: 550,
        instructions: 'Distancia de acromion a acromion a través de la espalda.',
        anatomical_landmarks: 'Puntos acromiales derecho e izquierdo.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'blouse', 'dress'],
        is_active: true,
    },
    {
        code: 'largo_hombro',
        name: 'Largo de Hombro',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 80,
        max_value_mm: 200,
        instructions: 'Desde la base lateral del cuello hasta el punto extremo del hueso acromion.',
        anatomical_landmarks: 'Base del cuello hasta acromion.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['bodice', 'blouse'],
        is_active: true,
    },
    {
        code: 'ancho_pecho',
        name: 'Ancho de Pecho',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 260,
        max_value_mm: 500,
        instructions: 'Distancia horizontal entre los pliegues axilares anteriores a través del pecho.',
        anatomical_landmarks: 'Pliegues axilares anteriores sobre el busto.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'blouse'],
        is_active: true,
    },
    {
        code: 'ancho_espalda',
        name: 'Ancho de Espalda',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 280,
        max_value_mm: 550,
        instructions: 'Distancia horizontal entre los pliegues axilares posteriores sobre los omóplatos.',
        anatomical_landmarks: 'Pliegues axilares posteriores.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'blouse', 'dress'],
        is_active: true,
    },
    {
        code: 'largo_talle_delantero',
        name: 'Largo de Talle Delantero',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 350,
        max_value_mm: 600,
        instructions: 'Desde el punto de unión cuello-hombro pasando sobre el pezón hasta la cintura.',
        anatomical_landmarks: 'Unión cuello-hombro a cinta en cintura delantera.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress', 'blouse'],
        is_active: true,
    },
    {
        code: 'largo_talle_espalda',
        name: 'Largo de Talle Espalda',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 330,
        max_value_mm: 550,
        instructions: 'Desde la séptima vértebra cervical por el centro de la espalda hasta la cintura.',
        anatomical_landmarks: 'C7 a centro de cinta en cintura trasera.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress', 'blouse'],
        is_active: true,
    },
    {
        code: 'altura_busto',
        name: 'Altura de Busto',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 200,
        max_value_mm: 400,
        instructions: 'Desde el punto de unión cuello-hombro hasta la punta o cresta del pezón.',
        anatomical_landmarks: 'Unión cuello-hombro hasta vértice mamario.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['bodice', 'dress'],
        is_active: true,
    },
    {
        code: 'separacion_busto',
        name: 'Separación de Puntos de Busto',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 140,
        max_value_mm: 280,
        instructions: 'Distancia horizontal directa entre los vértices de ambos pezones.',
        anatomical_landmarks: 'Ápex mamario izquierdo a ápex mamario derecho.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress'],
        is_active: true,
    },
    {
        code: 'profundidad_sisa',
        name: 'Profundidad de Sisa',
        category: 'torso_body',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 160,
        max_value_mm: 300,
        instructions: 'Distancia vertical desde la base del cuello posterior (C7) hasta el nivel axilar.',
        anatomical_landmarks: 'C7 vertical hasta regla bajo la axila.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'blouse', 'dress'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // FAMILIA B: BRAZOS Y MANGAS
    // --------------------------------------------------------------------------
    {
        code: 'largo_brazo',
        name: 'Largo de Brazo',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 450,
        max_value_mm: 750,
        instructions: 'Con brazo ligeramente flexionado, desde acromion pasando por codo hasta la muñeca.',
        anatomical_landmarks: 'Acromion a apófisis estiloides cubital.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve', 'dress'],
        is_active: true,
    },
    {
        code: 'largo_brazo_flexionado',
        name: 'Largo Brazo Flexionado',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 480,
        max_value_mm: 800,
        instructions: 'Con brazo en ángulo de 90 grados, acromion pasando por vértice de codo a muñeca.',
        anatomical_landmarks: 'Acromion pasando sobre olecranon hasta muñeca.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve'],
        is_active: true,
    },
    {
        code: 'distancia_hombro_codo',
        name: 'Distancia Hombro-Codo',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 250,
        max_value_mm: 450,
        instructions: 'Desde acromion hasta el hueso del codo (olecranon).',
        anatomical_landmarks: 'Acromion hasta olecranon.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve'],
        is_active: true,
    },
    {
        code: 'contorno_biceps',
        name: 'Contorno de Bíceps',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 200,
        max_value_mm: 550,
        instructions: 'Alrededor de la parte más ancha del brazo con el músculo relajado.',
        anatomical_landmarks: 'Vientre muscular del bíceps braquial.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve', 'dress'],
        is_active: true,
    },
    {
        code: 'contorno_codo_flexionado',
        name: 'Contorno de Codo Flexionado',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 180,
        max_value_mm: 420,
        instructions: 'Alrededor del codo flexionado en 90 grados.',
        anatomical_landmarks: 'Sobre el olécranon y flexura del codo.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve'],
        is_active: true,
    },
    {
        code: 'contorno_antebrazo',
        name: 'Contorno de Antebrazo',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 160,
        max_value_mm: 400,
        instructions: 'Alrededor de la parte más gruesa del antebrazo bajo el codo.',
        anatomical_landmarks: 'Músculos extensores y flexores del antebrazo.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve'],
        is_active: true,
    },
    {
        code: 'contorno_muneca',
        name: 'Contorno de Muñeca',
        category: 'arms_sleeves',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 120,
        max_value_mm: 260,
        instructions: 'Alrededor de la articulación de la muñeca sobre los huesos prominentes.',
        anatomical_landmarks: 'Sobre apófisis estiloides del radio y cúbito.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['sleeve'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // FAMILIA C: PIERNAS Y PANTALÓN
    // --------------------------------------------------------------------------
    {
        code: 'profundidad_tiro',
        name: 'Profundidad Corporal de Tiro',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 200,
        max_value_mm: 380,
        instructions: 'Sentada en silla rígida plana, distancia vertical desde la cintura hasta la superficie del asiento.',
        anatomical_landmarks: 'Cintura lateral hasta superficie de asiento firme.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'largo_entrepierna',
        name: 'Largo de Entrepierna',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 600,
        max_value_mm: 950,
        instructions: 'Por el interior de la pierna desde la ingle hasta el suelo descalza.',
        anatomical_landmarks: 'Sínfisis púbica/periné hasta suelo.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'largo_exterior_pierna',
        name: 'Largo Exterior de Pierna',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 850,
        max_value_mm: 1300,
        instructions: 'Por el costado desde la cintura natural hasta el suelo.',
        anatomical_landmarks: 'Cintura lateral sobre cadera hasta suelo.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'contorno_muslo',
        name: 'Contorno de Muslo',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 380,
        max_value_mm: 900,
        instructions: 'Alrededor de la parte más gruesa del muslo justo debajo del pliegue glúteo.',
        anatomical_landmarks: 'Subtrocantérico inmediatamente bajo glúteo.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'contorno_rodilla',
        name: 'Contorno de Rodilla',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 260,
        max_value_mm: 550,
        instructions: 'Alrededor de la rótula con pierna recta y relajada.',
        anatomical_landmarks: 'Centro de la rótula y fosa poplítea.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'contorno_pantorrilla',
        name: 'Contorno de Pantorrilla',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 240,
        max_value_mm: 520,
        instructions: 'Alrededor de la máxima protuberancia de los gemelos.',
        anatomical_landmarks: 'Vientre muscular de los gemelos.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'contorno_tobillo',
        name: 'Contorno de Tobillo',
        category: 'legs_pants',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 160,
        max_value_mm: 360,
        instructions: 'Alrededor de la articulación del tobillo sobre los maléolos.',
        anatomical_landmarks: 'Sobre maléolos tibial y peroneo.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // FAMILIA D: MEDIDAS ADICIONALES PARA AJUSTE
    // --------------------------------------------------------------------------
    {
        code: 'inclinacion_hombros',
        name: 'Inclinación de Hombros',
        category: 'fit_adjustment',
        scope: 'body',
        default_unit: 'cm',
        precision_step: 0.2,
        min_value_mm: 10,
        max_value_mm: 60,
        instructions: 'Caída vertical del hombro desde la base del cuello hasta el acromion.',
        anatomical_landmarks: 'Proyección vertical base cuello a acromion.',
        laterality: 'bilateral',
        is_calculated: false,
        block_usage: ['bodice'],
        is_active: true,
    },

    // --------------------------------------------------------------------------
    // FAMILIA E: MEDIDAS DE DISEÑO Y PRENDA
    // --------------------------------------------------------------------------
    {
        code: 'largo_falda',
        name: 'Largo de Falda de Diseño',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 1.0,
        min_value_mm: 300,
        max_value_mm: 1200,
        instructions: 'Largo deseado desde la cintura hasta el bajo de la falda.',
        anatomical_landmarks: 'Cintura al borde inferior deseado.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['skirt', 'dress'],
        is_active: true,
    },
    {
        code: 'largo_blusa',
        name: 'Largo de Blusa',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 1.0,
        min_value_mm: 400,
        max_value_mm: 800,
        instructions: 'Largo deseado desde el hombro hasta el bajo de la blusa.',
        anatomical_landmarks: 'Hombro a borde de blusa.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['blouse'],
        is_active: true,
    },
    {
        code: 'profundidad_escote_diseno',
        name: 'Profundidad de Escote',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 0,
        max_value_mm: 300,
        instructions: 'Profundidad adicional deseada respecto a la base del cuello.',
        anatomical_landmarks: 'Horquilla esternal hacia abajo.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['bodice', 'dress', 'blouse'],
        is_active: true,
    },
    {
        code: 'ancho_bajo_pantalon',
        name: 'Ancho de Bajo de Pantalón',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 0.5,
        min_value_mm: 200,
        max_value_mm: 600,
        instructions: 'Contorno deseado para el dobladillo final del pantalón.',
        anatomical_landmarks: 'Bajo terminado de botamanga.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['pants'],
        is_active: true,
    },
    {
        code: 'largo_camisa',
        name: 'Largo de Camisa',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 1.0,
        min_value_mm: 500,
        max_value_mm: 950,
        instructions: 'Largo deseado desde la base del cuello (C7) hasta el bajo o ruedo de la camisa.',
        anatomical_landmarks: 'C7 o base del cuello hasta bajo terminado.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['shirt'],
        is_active: true,
    },
    {
        code: 'largo_chaqueta',
        name: 'Largo de Chaqueta',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 1.0,
        min_value_mm: 500,
        max_value_mm: 1000,
        instructions: 'Largo deseado desde la séptima vértebra cervical (C7) hasta el bajo de la chaqueta sastre.',
        anatomical_landmarks: 'C7 en base del cuello hasta bajo terminado.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['jacket'],
        is_active: true,
    },
    {
        code: 'largo_abrigo',
        name: 'Largo de Abrigo',
        category: 'garment_design',
        scope: 'design_parameter',
        default_unit: 'cm',
        precision_step: 1.0,
        min_value_mm: 800,
        max_value_mm: 1400,
        instructions: 'Largo deseado desde la séptima vértebra cervical (C7) hasta el bajo terminado del abrigo (rodilla o media pierna).',
        anatomical_landmarks: 'C7 en base del cuello hasta bajo terminado.',
        laterality: 'none',
        is_calculated: false,
        block_usage: ['coat'],
        is_active: true,
    },
];

export const MEASUREMENT_MAP: Record<string, MeasurementCatalogItem> =
    MASTER_MEASUREMENT_CATALOG.reduce((acc, item) => {
        acc[item.code] = item;
        return acc;
    }, {} as Record<string, MeasurementCatalogItem>);

// ==============================================================================
// CLASIFICACIÓN ONTOLÓGICA Y AUDITORÍA DE MEDIDAS (MÓDULO 02)
// ==============================================================================

/**
 * Categorías estrictas para la segregación métrica del Atelier:
 * A. Medida anatómica corporal (body) -> 33 cotas antropométricas de la clienta.
 * B. Medida de diseño de prenda (garment_design) -> 7 largos y aberturas estilísticas.
 * C. Parámetro de holgura (ease_parameter) -> Desahogo técnico según perfil.
 * D. Parámetro de fabricación (seam_allowance) -> Márgenes de costura y dobladillo.
 * E. Cota anatómica de maniquí / alias técnico (technical_cota_alias) -> Puntos visuales 2D.
 */
export type CatalogItemClassification =
    | 'anatomical_body'
    | 'garment_design'
    | 'ease_parameter'
    | 'seam_allowance'
    | 'technical_cota_alias';

export interface CatalogClassificationResult {
    code: string;
    classification: CatalogItemClassification;
    classificationLabel: string;
    isBodyMeasure: boolean;
    isDesignMeasure: boolean;
    isWorkshopParameter: boolean;
    isMannequinCota: boolean;
}

// 33 Medidas anatómicas corporales únicas en el catálogo maestro
export const BODY_MEASUREMENT_CODES: string[] = MASTER_MEASUREMENT_CATALOG
    .filter((m) => m.scope === 'body')
    .map((m) => m.code);

// 7 Medidas de diseño de prenda en el catálogo maestro
export const DESIGN_PARAMETER_CODES: string[] = MASTER_MEASUREMENT_CATALOG
    .filter((m) => m.scope === 'design_parameter')
    .map((m) => m.code);

// Denominador exacto de medidas corporales aplicables del Atelier (33)
export const TOTAL_APPLICABLE_BODY_MEASUREMENTS: number = BODY_MEASUREMENT_CODES.length;

// Parámetros técnicos de taller (holguras y márgenes)
export const WORKSHOP_PARAMETER_CODES: string[] = [
    'holgura_busto',
    'holgura_cintura',
    'holgura_cadera',
    'holgura_biceps',
    'holgura_tiro',
    'margen_costura_default',
    'margen_dobladillo',
];

export interface WorkshopParameterDefinition {
    code: string;
    name: string;
    description: string;
    defaultValMm: number;
    unit: 'mm';
    type: 'ease' | 'seam_allowance';
}

export const WORKSHOP_PARAMETER_DEFINITIONS: Record<string, WorkshopParameterDefinition> = {
    holgura_busto: {
        code: 'holgura_busto',
        name: 'Holgura de Busto',
        description: 'Desahogo torácico perimetral para respiración y confort anatómico.',
        defaultValMm: 40,
        unit: 'mm',
        type: 'ease',
    },
    holgura_cintura: {
        code: 'holgura_cintura',
        name: 'Holgura de Cintura',
        description: 'Desahogo en talle para movilidad y flexión corporal.',
        defaultValMm: 20,
        unit: 'mm',
        type: 'ease',
    },
    holgura_cadera: {
        code: 'holgura_cadera',
        name: 'Holgura de Cadera',
        description: 'Desahogo trocantéreo y pélvico para asiento ergonómico.',
        defaultValMm: 40,
        unit: 'mm',
        type: 'ease',
    },
    holgura_biceps: {
        code: 'holgura_biceps',
        name: 'Holgura de Bíceps',
        description: 'Desahogo de manga en brazo superior para flexión del codo.',
        defaultValMm: 45,
        unit: 'mm',
        type: 'ease',
    },
    holgura_tiro: {
        code: 'holgura_tiro',
        name: 'Holgura de Tiro',
        description: 'Desahogo vertical en la entrepierna para comodidad al caminar.',
        defaultValMm: 10,
        unit: 'mm',
        type: 'ease',
    },
    margen_costura_default: {
        code: 'margen_costura_default',
        name: 'Margen de Costura Estándar',
        description: 'Margen perimetral de confección de alta costura para ensamble.',
        defaultValMm: 10,
        unit: 'mm',
        type: 'seam_allowance',
    },
    margen_dobladillo: {
        code: 'margen_dobladillo',
        name: 'Margen de Dobladillo / Ruedo',
        description: 'Margen de bajo sastre para bastillas a mano e invisibles.',
        defaultValMm: 35,
        unit: 'mm',
        type: 'seam_allowance',
    },
};

// Alias y cotas representadas exclusivamente en el sistema visual del maniquí (24 cotas)
export const TECHNICAL_COTA_ALIASES: string[] = [
    'estatura_total',
    'altura_cadera',
    'altura_tiro',
    'largo_pantalon',
];

export const TOTAL_MANNEQUIN_COTAS = 24;

/**
 * Clasifica cualquier código de medida o parámetro del sistema según las 5 clases requeridas.
 */
export function classifyMeasurementCode(code: string): CatalogClassificationResult {
    const cleanCode = code.replace(/_right$|_left$/, '');
    const item = MEASUREMENT_MAP[cleanCode];

    if (item) {
        if (item.scope === 'body') {
            return {
                code: cleanCode,
                classification: 'anatomical_body',
                classificationLabel: 'Medida anatómica corporal',
                isBodyMeasure: true,
                isDesignMeasure: false,
                isWorkshopParameter: false,
                isMannequinCota: false,
            };
        }
        if (item.scope === 'design_parameter') {
            return {
                code: cleanCode,
                classification: 'garment_design',
                classificationLabel: 'Medida de diseño de prenda',
                isBodyMeasure: false,
                isDesignMeasure: true,
                isWorkshopParameter: false,
                isMannequinCota: false,
            };
        }
    }

    if (
        cleanCode.startsWith('holgura_') ||
        cleanCode === 'ease' ||
        cleanCode === 'bust' ||
        cleanCode === 'waist' ||
        cleanCode === 'hip' ||
        cleanCode === 'biceps' ||
        cleanCode === 'crotch'
    ) {
        return {
            code: cleanCode,
            classification: 'ease_parameter',
            classificationLabel: 'Parámetro de holgura',
            isBodyMeasure: false,
            isDesignMeasure: false,
            isWorkshopParameter: true,
            isMannequinCota: false,
        };
    }

    if (
        cleanCode.startsWith('margen_') ||
        cleanCode === 'seam_allowance_default_mm' ||
        cleanCode === 'hem_allowance_mm'
    ) {
        return {
            code: cleanCode,
            classification: 'seam_allowance',
            classificationLabel: 'Parámetro de fabricación / margen de costura',
            isBodyMeasure: false,
            isDesignMeasure: false,
            isWorkshopParameter: true,
            isMannequinCota: false,
        };
    }

    if (TECHNICAL_COTA_ALIASES.includes(cleanCode)) {
        return {
            code: cleanCode,
            classification: 'technical_cota_alias',
            classificationLabel: 'Cota visual de maniquí / alias técnico',
            isBodyMeasure: false,
            isDesignMeasure: false,
            isWorkshopParameter: false,
            isMannequinCota: true,
        };
    }

    return {
        code: cleanCode,
        classification: 'anatomical_body',
        classificationLabel: 'Medida anatómica corporal',
        isBodyMeasure: true,
        isDesignMeasure: false,
        isWorkshopParameter: false,
        isMannequinCota: false,
    };
}

/**
 * Realiza una auditoría métrica exhaustiva de una sesión de medidas,
 * distinguiendo rigurosamente los 4 conceptos:
 * 1. Cantidad total de valores registrados en la sesión.
 * 2. Cantidad de medidas corporales registradas vs total aplicable (33).
 * 3. Cantidad de medidas de diseño registradas.
 * 4. Cantidad de parámetros de taller.
 */
export function analyzeSessionMeasurements(values: Record<string, any> | undefined | null) {
    if (!values) {
        return {
            totalRegistered: 0,
            bodyCount: 0,
            designCount: 0,
            workshopCount: 0,
            totalApplicableBody: TOTAL_APPLICABLE_BODY_MEASUREMENTS, // 33
            bodyCompletionPct: 0,
            registeredBodyCodes: [] as string[],
            registeredDesignCodes: [] as string[],
            registeredWorkshopCodes: [] as string[],
            mannequinCotasCount: TOTAL_MANNEQUIN_COTAS, // 24
        };
    }

    const registeredBodyCodes: string[] = [];
    const registeredDesignCodes: string[] = [];
    const registeredWorkshopCodes: string[] = [];

    for (const [code, item] of Object.entries(values)) {
        const numVal = typeof item === 'number' ? item : (item as any)?.value_mm;
        if (typeof numVal === 'number' && Number.isFinite(numVal) && numVal > 0) {
            const cleanCode = code.replace(/_right$|_left$/, '');
            const info = classifyMeasurementCode(cleanCode);

            if (info.isBodyMeasure) {
                if (!registeredBodyCodes.includes(cleanCode)) {
                    registeredBodyCodes.push(cleanCode);
                }
            } else if (info.isDesignMeasure) {
                if (!registeredDesignCodes.includes(cleanCode)) {
                    registeredDesignCodes.push(cleanCode);
                }
            } else if (info.isWorkshopParameter) {
                if (!registeredWorkshopCodes.includes(cleanCode)) {
                    registeredWorkshopCodes.push(cleanCode);
                }
            }
        }
    }

    const bodyCount = registeredBodyCodes.length;
    const designCount = registeredDesignCodes.length;
    const workshopCount = registeredWorkshopCodes.length;
    const totalRegistered = Object.keys(values).length;
    const bodyCompletionPct = Math.min(100, Math.round((bodyCount / TOTAL_APPLICABLE_BODY_MEASUREMENTS) * 100));

    return {
        totalRegistered,
        bodyCount,
        designCount,
        workshopCount,
        totalApplicableBody: TOTAL_APPLICABLE_BODY_MEASUREMENTS,
        bodyCompletionPct,
        registeredBodyCodes,
        registeredDesignCodes,
        registeredWorkshopCodes,
        mannequinCotasCount: TOTAL_MANNEQUIN_COTAS,
    };
}

