// ==============================================================================
// ATELIER DIGITAL — CATÁLOGO CENTRALIZADO DE GUÍAS DE MEDICIÓN (M02.02)
// Archivo: src/engine/pattern/catalog/measurementGuideCatalog.ts
// ==============================================================================
// Vincula cada código canónico con su definición editorial de alta costura,
// instrucciones prácticas de colocación de la cinta métrica, unidad de trabajo,
// clasificación conceptual y recurso fotográfico real de referencia.
// ==============================================================================

export type GuideCategoryType = 'body' | 'design' | 'workshop';

export interface MeasurementGuideEntry {
    code: string;
    visibleName: string;
    categoryType: GuideCategoryType;
    categoryLabel: string;
    definition: string;
    instructions: string;
    defaultUnit: 'cm' | 'mm';
    photoAsset: any;
    altText: string;
    anatomicalLandmarks: string;
    referenceCode?: string;
}

// Activos fotográficos locales optimizados de alta costura
export const GUIDE_PHOTOS = {
    bust: require('../../../../assets/guides/guide_bust.jpg'),
    underbust: require('../../../../assets/guides/guide_underbust.jpg'),
    waist: require('../../../../assets/guides/guide_waist.jpg'),
    hip: require('../../../../assets/guides/guide_hip.jpg'),
    waist_hip: require('../../../../assets/guides/guide_waist_hip.jpg'),
    back_neck: require('../../../../assets/guides/guide_back_neck.jpg'),
    shoulder_length: require('../../../../assets/guides/guide_shoulder_length.jpg'),
    arm_sleeve: require('../../../../assets/guides/guide_arm_sleeve.jpg'),
    lower_length: require('../../../../assets/guides/guide_lower_length.jpg'),
    height: require('../../../../assets/guides/guide_height.jpg'),
    garment_design: require('../../../../assets/guides/guide_garment_design.jpg'),
    workshop_params: require('../../../../assets/guides/guide_workshop_params.jpg'),
};

export const MEASUREMENT_GUIDE_CATALOG: Record<string, MeasurementGuideEntry> = {
    // --------------------------------------------------------------------------
    // 1. BUSTO Y TÓRAX (MEDIDAS CORPORALES)
    // --------------------------------------------------------------------------
    contorno_busto: {
        code: 'contorno_busto',
        visibleName: 'CONTORNO DE BUSTO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia horizontal máxima del torso a la altura de los ápices mamarios. Es el parámetro volumétrico principal para calibrar el talle delantero y la holgura del corpiño de alta costura.',
        instructions: 'Colocar la cinta métrica horizontalmente alrededor de la espalda por debajo de los omóplatos, pasando hacia el frente sobre la parte más prominente del busto sin apretar. Mantener la cinta paralela al suelo y los brazos relajados.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.bust,
        altText: 'Demostración de colocación horizontal de la cinta métrica en el contorno de busto sobre maniquí Stockman de lino',
        anatomicalLandmarks: 'Ápices mamarios y línea subescapular horizontal.',
    },
    contorno_bajo_busto: {
        code: 'contorno_bajo_busto',
        visibleName: 'CONTORNO BAJO BUSTO (INFRAMAMARIO)',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Perímetro del tórax medido justo en el pliegue inframamario, inmediatamente debajo de la base de los senos. Fundamental para corsetería de autor, copas estructuradas y corpiños ajustados.',
        instructions: 'Pasar la cinta métrica horizontalmente y con tensión firme inmediatamente por debajo de la base mamaria, asegurando apoyo plano y nivelado en la espalda.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.underbust,
        altText: 'Medición de la caja torácica en la línea inframamaria con cinta métrica pasando justo bajo la base de los senos',
        anatomicalLandmarks: 'Surco inframamario y parrilla costal media.',
    },
    contorno_alto_busto: {
        code: 'contorno_alto_busto',
        visibleName: 'CONTORNO ALTO DE BUSTO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Contorno superior del tórax por encima de los senos. Permite verificar el volumen de copa y balancear el escote superior del corpiño.',
        instructions: 'Pasar la cinta métrica directamente por debajo de las axilas y por encima del relieve del busto, manteniendo la espalda recta.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.bust,
        altText: 'Medición del contorno alto del tórax por debajo de las fosas axilares',
        anatomicalLandmarks: 'Pliegues axilares anteriores y línea superior de busto.',
    },
    altura_busto: {
        code: 'altura_busto',
        visibleName: 'ALTURA DE BUSTO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical desde la base del cuello hasta el ápice mamario. Posiciona el vértice de las pinzas de entalle.',
        instructions: 'Medir en línea recta desde el punto de nacimiento del cuello en el hombro (punto lateral del cuello) hasta la cúspide del pezón.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.bust,
        altText: 'Trayectoria vertical desde el cuello hasta el ápice mamario en maniquí de atelier',
        anatomicalLandmarks: 'Punto lateral del cuello y vértice mamario.',
    },
    separacion_busto: {
        code: 'separacion_busto',
        visibleName: 'SEPARACIÓN DE BUSTO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia horizontal entre los dos vértices mamarios. Define la separación anatómica de las pinzas delanteras.',
        instructions: 'Medir en línea recta horizontal entre ambos ápices mamarios con la cinta tensa.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.bust,
        altText: 'Medición de distancia horizontal entre vértices mamarios en alta costura',
        anatomicalLandmarks: 'Ápices mamarios izquierdo y derecho.',
    },
    ancho_pecho: {
        code: 'ancho_pecho',
        visibleName: 'ANCHO DE PECHO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Anchura horizontal del pecho tomada entre los pliegues axilares frontales. Establece el aplomo del torso anterior.',
        instructions: 'Colocar la cinta métrica horizontalmente sobre el pecho entre los puntos de inserción de ambos brazos en el torso.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.bust,
        altText: 'Medición del ancho de pecho entre pliegues axilares en atelier',
        anatomicalLandmarks: 'Pliegues axilares anteriores.',
    },
    contorno_cuello: {
        code: 'contorno_cuello',
        visibleName: 'CONTORNO DE CUELLO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia de la base anatómica del cuello. Modela el escote base, solapas, cuellos camiseros y tirillas de alta costura.',
        instructions: 'Rodear la base del cuello con la cinta métrica, pasando por la séptima vértebra cervical en la espalda y cerrando en el hueco supraesternal delantero.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.back_neck,
        altText: 'Medición de la circunferencia en la base del cuello sobre maniquí de sastre',
        anatomicalLandmarks: 'Séptima vértebra cervical (C7) y fosa supraesternal.',
    },
    estatura: {
        code: 'estatura',
        visibleName: 'ESTATURA TOTAL',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Altura antropométrica longitudinal total en bipedestación erguida, desde la coronilla (vértex) hasta el plano del suelo. Establece las proporciones del canon anatómico y la escala vertical del patrón.',
        instructions: 'Persona descalza con talones juntos, espalda y cabeza erguidas con plano de Frankfurt horizontal. Medir en vertical desde el punto culminante del cráneo hasta el suelo usando tallímetro o escuadra sastre.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.height,
        altText: 'Medición vertical total de estatura erguida desde la coronilla al suelo con escala de taller',
        anatomicalLandmarks: 'Vértex craneal y superficie del suelo.',
    },
    estatura_total: {
        code: 'estatura_total',
        visibleName: 'ESTATURA TOTAL',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Altura antropométrica longitudinal total en bipedestación erguida, desde la coronilla (vértex) hasta el plano del suelo. Establece las proporciones del canon anatómico y la escala vertical del patrón.',
        instructions: 'Persona descalza con talones juntos, espalda y cabeza erguidas con plano de Frankfurt horizontal. Medir en vertical desde el punto culminante del cráneo hasta el suelo usando tallímetro o escuadra sastre.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.height,
        altText: 'Medición vertical total de estatura erguida desde la coronilla al suelo con escala de taller',
        anatomicalLandmarks: 'Vértex craneal y superficie del suelo.',
    },

    // --------------------------------------------------------------------------
    // 2. ESPALDA Y HOMBROS (MEDIDAS CORPORALES)
    // --------------------------------------------------------------------------
    ancho_hombros: {
        code: 'ancho_hombros',
        visibleName: 'ANCHO DE HOMBROS',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia transversal dorsal entre las dos articulaciones acromioclaviculares. Determina la estructura superior del patrón.',
        instructions: 'Medir en la espalda siguiendo la leve curva natural entre el acromion izquierdo y el acromion derecho.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.back_neck,
        altText: 'Medición horizontal de hombro a hombro en la espalda de un maniquí de atelier',
        anatomicalLandmarks: 'Acromion izquierdo y acromion derecho.',
    },
    ancho_espalda: {
        code: 'ancho_espalda',
        visibleName: 'ANCHO DE ESPALDA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Anchura horizontal de la espalda entre los pliegues axilares posteriores. Calibra la holgura de movimiento en mangas y chaquetas.',
        instructions: 'Colocar la cinta métrica a media altura entre el cuello y la sisa, extendiéndola horizontalmente entre las dos sisas posteriores.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.back_neck,
        altText: 'Medición de la amplitud dorsal entre pliegues axilares posteriores',
        anatomicalLandmarks: 'Pliegues axilares dorsales y centros escapulares.',
    },
    largo_hombro: {
        code: 'largo_hombro',
        visibleName: 'LARGO DE HOMBRO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Longitud lineal del hombro tomada a lo largo de la costura superior, desde la base lateral del cuello hasta el vértice óseo del acromion. Se diferencia rigurosamente del ancho total de hombros.',
        instructions: 'Apoyar el origen de la cinta en el nacimiento del cuello y extender en línea recta sobre la cresta del hombro hasta la punta exterior del acromion.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.shoulder_length,
        altText: 'Medición longitudinal del hombro desde el nacimiento del cuello hasta el hueso del acromion',
        anatomicalLandmarks: 'Punto lateral del cuello y punto acromial exterior.',
    },
    largo_talle_delantero: {
        code: 'largo_talle_delantero',
        visibleName: 'LARGO DE TALLE DELANTERO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical frontal desde el punto lateral del cuello, pasando sobre el ápice del busto, hasta la cinta de la cintura natural.',
        instructions: 'Apoyar la cinta en la unión cuello-hombro, descender en vertical sobre el centro del busto y fijar la medida en la línea de cintura marcada.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.waist_hip,
        altText: 'Trayectoria vertical del talle delantero sobre el busto hasta la cintura',
        anatomicalLandmarks: 'Punto lateral del cuello, ápice mamario y concavidad de la cintura.',
    },
    largo_talle_espalda: {
        code: 'largo_talle_espalda',
        visibleName: 'LARGO DE TALLE ESPALDA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical dorsal desde la séptima vértebra cervical (C7) a lo largo de la columna vertebral hasta la cintura natural.',
        instructions: 'Descender con la cinta métrica por la columna desde el hueso prominente de la nuca hasta el cordón de cintura en la espalda.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.back_neck,
        altText: 'Medición vertical de la espalda desde vértebra cervical hasta cintura',
        anatomicalLandmarks: 'Séptima vértebra cervical y centro de cintura dorsal.',
    },
    profundidad_sisa: {
        code: 'profundidad_sisa',
        visibleName: 'PROFUNDIDAD DE SISA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical desde la base del cuello en la espalda hasta la línea horizontal de las axilas. Determina la holgura y caída de la manga.',
        instructions: 'Medir en la espalda desde la vértebra C7 hasta una cinta auxiliar colocada horizontalmente debajo de las axilas.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.back_neck,
        altText: 'Medición de la profundidad vertical de sisa dorsal',
        anatomicalLandmarks: 'Vértebra C7 y plano axilar horizontal.',
    },
    inclinacion_hombros: {
        code: 'inclinacion_hombros',
        visibleName: 'INCLINACIÓN DE HOMBROS',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Ángulo o descenso milimétrico del hombro respecto a la horizontal. Calibra hombreras y aplomo de sisa en sastrería.',
        instructions: 'Verificar la caída angular o desnivel en milímetros entre la horizontal del cuello y la cúspide acromial.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.back_neck,
        altText: 'Calibración de la caída y ángulo de hombros en mesa de corte',
        anatomicalLandmarks: 'Plano horizontal cervical y punto acromial exterior.',
    },

    // --------------------------------------------------------------------------
    // 3. CINTURA Y CADERA (MEDIDAS CORPORALES)
    // --------------------------------------------------------------------------
    contorno_cintura: {
        code: 'contorno_cintura',
        visibleName: 'CONTORNO DE CINTURA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Perímetro horizontal de la concavidad más estrecha del torso natural, ubicada entre la última costilla flotante y la cresta ilíaca. Eje pivotante de unión entre el corpiño y la falda o pantalón.',
        instructions: 'Ubicar la cintura natural (zona de máxima hendidura del talle). Rodear horizontalmente con la cinta ajustada y nivelada pero sin oprimir.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.waist,
        altText: 'Colocación precisa de la cinta métrica en la concavidad de la cintura natural sobre maniquí Stockman',
        anatomicalLandmarks: 'Concavidad natural del talle sobre crestas ilíacas.',
    },
    contorno_cadera_alta: {
        code: 'contorno_cadera_alta',
        visibleName: 'CONTORNO DE CADERA ALTA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia intermedia tomada sobre las crestas ilíacas, aproximadamente a 8-10 cm bajo la cintura. Clave para el entalle en faldas tubo.',
        instructions: 'Pasar la cinta horizontalmente a medio camino entre la cintura y la cadera máxima, sobre los huesos superiores de la cadera.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.waist_hip,
        altText: 'Medición del perímetro de cadera alta sobre las crestas ilíacas',
        anatomicalLandmarks: 'Espinas ilíacas anterosuperiores.',
    },
    contorno_cadera: {
        code: 'contorno_cadera',
        visibleName: 'CONTORNO DE CADERA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia horizontal en el plano de mayor relieve de los glúteos y trocánteres femorales. Eje principal para bases de faldas y pantalones.',
        instructions: 'Colocar la cinta alrededor de la zona más ancha de la pelvis, pasando por el punto de máxima prominencia de los glúteos en riguroso plano paralelo al suelo.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.hip,
        altText: 'Medición del contorno de cadera máxima alrededor de los trocánteres y prominencia glútea',
        anatomicalLandmarks: 'Trocánteres mayores y cúspides glúteas.',
    },
    profundidad_cintura_cadera: {
        code: 'profundidad_cintura_cadera',
        visibleName: 'ALTURA DE CADERA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical lateral desde la línea de cintura natural hasta el plano horizontal de máxima cadera (usualmente 18 a 22 cm).',
        instructions: 'Medir sobre el costado exterior desde la cinta de la cintura hasta la altura donde se midió el contorno de cadera máxima.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.waist_hip,
        altText: 'Medición vertical lateral del talle de cadera en costado',
        anatomicalLandmarks: 'Línea de cintura lateral y plano trocantéreo.',
    },

    // --------------------------------------------------------------------------
    // 4. BRAZOS Y MANGA (MEDIDAS CORPORALES)
    // --------------------------------------------------------------------------
    largo_brazo: {
        code: 'largo_brazo',
        visibleName: 'LARGO DE BRAZO (MANGA)',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia lineal completa desde el acromion del hombro, pasando por la curvatura del codo levemente flexionado, hasta el hueso de la muñeca.',
        instructions: 'Con el brazo relajado y levemente flexionado, apoyar el inicio de la cinta en el acromion, pasar por la punta del codo y descender hasta el estiloides de la muñeca.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Demostración de los puntos de inicio (acromion) y fin (muñeca) para medir el largo de brazo',
        anatomicalLandmarks: 'Punto acromial, olécranon del codo y apófisis estiloides del cúbito.',
    },
    largo_brazo_flexionado: {
        code: 'largo_brazo_flexionado',
        visibleName: 'LARGO DE BRAZO FLEXIONADO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Medida de control dinámico del brazo en ángulo de 90° para garantizar comodidad al doblar el codo en chaquetas estructuradas.',
        instructions: 'Flexionar el codo a 90° con la mano sobre la cadera; medir el recorrido completo de la cinta desde el hombro hasta el puño.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Medición del brazo en flexión para verificar holgura en mangas sastres',
        anatomicalLandmarks: 'Punto acromial, prominencia del codo flexionado y carpo.',
    },
    distancia_hombro_codo: {
        code: 'distancia_hombro_codo',
        visibleName: 'DISTANCIA HOMBRO A CODO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Longitud desde el vértice del hombro hasta la punta del codo. Fija la pinza de codo en la manga sastre de dos piezas.',
        instructions: 'Medir en línea recta desde el acromion del hombro hasta el saliente óseo del codo (olécranon).',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Medición vertical del brazo desde el acromion hasta el codo',
        anatomicalLandmarks: 'Acromion y olécranon.',
    },
    contorno_biceps: {
        code: 'contorno_biceps',
        visibleName: 'CONTORNO DE BÍCEPS (BRAZO)',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia muscular del brazo en su mayor volumen. Determina el ancho de la copa de la manga y su holgura.',
        instructions: 'Con el brazo relajado colgando, rodear el bíceps en su zona más gruesa horizontalmente con la cinta.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Medición del contorno de bíceps con brazo relajado',
        anatomicalLandmarks: 'Vientre del músculo bíceps braquial.',
    },
    contorno_codo_flexionado: {
        code: 'contorno_codo_flexionado',
        visibleName: 'CONTORNO DE CODO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia tomada sobre la articulación del codo flexionado para asegurar paso y ergonomía en mangas ceñidas.',
        instructions: 'Doblar el codo en ángulo recto y pasar la cinta alrededor de la articulación pasando por el olécranon.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Medición de la circunferencia articular del codo flexionado',
        anatomicalLandmarks: 'Articulación del codo y olécranon.',
    },
    contorno_antebrazo: {
        code: 'contorno_antebrazo',
        visibleName: 'CONTORNO DE ANTEBRAZO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia de la sección superior del antebrazo debajo del codo. Ajusta mangas entalladas y guantes de alta costura.',
        instructions: 'Medir horizontalmente el antebrazo en su punto de mayor masa muscular, a unos 5 cm del codo.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Medición del contorno del antebrazo en su tercio proximal',
        anatomicalLandmarks: 'Masa muscular de los flexores y extensores radiales.',
    },
    contorno_muneca: {
        code: 'contorno_muneca',
        visibleName: 'CONTORNO DE MUÑECA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Perímetro anatómico en los huesos de la muñeca. Base para calcular el ancho de puños y bocamangas.',
        instructions: 'Rodear la muñeca con la cinta métrica pasando justo sobre las apófisis estiloides radial y cubital.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.arm_sleeve,
        altText: 'Colocación de la cinta métrica en el perímetro del carpo y muñeca',
        anatomicalLandmarks: 'Apófisis estiloides del radio y del cúbito.',
    },

    // --------------------------------------------------------------------------
    // 5. INFERIOR Y LARGOS (MEDIDAS CORPORALES)
    // --------------------------------------------------------------------------
    largo_pantalon: {
        code: 'largo_pantalon',
        visibleName: 'LARGO TOTAL DE PANTALÓN',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Longitud vertical exterior desde la cintura natural hasta el suelo o el tacón del calzado elegido para la prenda.',
        instructions: 'Medir por el lateral del cuerpo desde la cinta de cintura, pasando sobre la cadera recta hasta el borde del calzado.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición vertical lateral completa del pantalón hasta el dobladillo',
        anatomicalLandmarks: 'Cintura lateral, trocánter y suelo.',
    },
    largo_exterior_pierna: {
        code: 'largo_exterior_pierna',
        visibleName: 'LARGO EXTERIOR DE PIERNA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Longitud desde la cintura lateral hasta el maléolo lateral (tobillo exterior). Define la longitud estándar sin calzado.',
        instructions: 'Medir en vertical por el costado desde la línea de cintura hasta el hueso exterior del tobillo.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición de la longitud exterior de la pierna hasta el maléolo',
        anatomicalLandmarks: 'Cresta ilíaca y maléolo lateral externo.',
    },
    largo_entrepierna: {
        code: 'largo_entrepierna',
        visibleName: 'LARGO DE ENTREPIERNA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical interior desde el nacimiento de la horquilla inguinal hasta la base del suelo o empeine.',
        instructions: 'Clienta descalza con pies ligeramente separados. Medir desde el inicio de la ingle en la cara interna del muslo hasta el suelo.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición sastre de entrepierna desde la bifurcación femoral hasta el suelo',
        anatomicalLandmarks: 'Horquilla perineal y plano del suelo.',
    },
    profundidad_tiro: {
        code: 'profundidad_tiro',
        visibleName: 'TIRO / ALTURA DE ASIENTO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Distancia vertical desde la cintura hasta la superficie de asiento. Determina la profundidad de la curva del tiro de pantalón.',
        instructions: 'Clienta sentada en posición recta sobre una silla rígida plana. Medir lateralmente desde la cintura hasta la tabla del asiento.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición de la altura de tiro con la clienta sentada en plano rígido',
        anatomicalLandmarks: 'Cintura lateral y plano isquiático del asiento.',
    },
    contorno_muslo: {
        code: 'contorno_muslo',
        visibleName: 'CONTORNO DE MUSLO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia de la pierna en su parte superior más prominente debajo de la entrepierna.',
        instructions: 'Rodear el muslo horizontalmente con la cinta métrica justo por debajo de la línea del glúteo.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición del contorno proximal del muslo sobre la raíz de la pierna',
        anatomicalLandmarks: 'Pliegue subglúteo y raíz del muslo.',
    },
    contorno_rodilla: {
        code: 'contorno_rodilla',
        visibleName: 'CONTORNO DE RODILLA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Circunferencia sobre la articulación de la rodilla con la pierna estirada o en leve flexión ergonómica.',
        instructions: 'Pasar la cinta métrica alrededor del centro de la rótula asegurando holgura de movimiento.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición de circunferencia sobre la articulación rotuliana de la rodilla',
        anatomicalLandmarks: 'Rótula e interlínea articular femorotibial.',
    },
    contorno_pantorrilla: {
        code: 'contorno_pantorrilla',
        visibleName: 'CONTORNO DE PANTORRILLA',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Perímetro máximo del vientre de los músculos gemelos en la pierna.',
        instructions: 'Rodear la pantorrilla en su punto de mayor relieve con la cinta paralela al suelo.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición del perímetro máximo de los gemelos en pantorrilla',
        anatomicalLandmarks: 'Masa muscular del gastrocnemio.',
    },
    contorno_tobillo: {
        code: 'contorno_tobillo',
        visibleName: 'CONTORNO DE TOBILLO',
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: 'Perímetro anatómico mínimo del tobillo justo por encima de los maléolos.',
        instructions: 'Pasar la cinta alrededor del tobillo en su zona más fina por encima de los huesos laterales.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.lower_length,
        altText: 'Medición del contorno supra-maleolar en el tobillo',
        anatomicalLandmarks: 'Región supramaleolar tibial y fibular.',
    },

    // --------------------------------------------------------------------------
    // 6. MEDIDAS DE DISEÑO (PROPORCIONES DE PRENDA)
    // --------------------------------------------------------------------------
    largo_chaqueta: {
        code: 'largo_chaqueta',
        visibleName: 'LARGO DE CHAQUETA',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Dimensión estilística de la chaqueta seleccionada para la creación. Define el punto exacto de terminación del bajo respecto al torso o cadera.',
        instructions: 'Medir en el frente de la prenda desde el punto de unión entre cuello y hombro, descendiendo verticalmente hasta la línea de dobladillo deseada.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Medición de la longitud total de una chaqueta sastre estructurada desde el cuello hasta el bajo',
        anatomicalLandmarks: 'Costura lateral de cuello y bajo terminado de la prenda.',
    },
    largo_falda: {
        code: 'largo_falda',
        visibleName: 'LARGO DE FALDA',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Longitud proyectada de la falda desde la pretina de cintura hasta el dobladillo inferior (midi, maxi, corta o de gala).',
        instructions: 'Fijar el origen en la cintura natural y medir verticalmente por el centro delantero o lateral hasta la altura del dobladillo propuesto en el diseño.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Verificación del largo de diseño de falda desde pretina hasta el bajo',
        anatomicalLandmarks: 'Línea de pretina y canto inferior de dobladillo.',
    },
    largo_vestido: {
        code: 'largo_vestido',
        visibleName: 'LARGO DE VESTIDO',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Longitud total de una prenda entera desde el punto más alto del hombro hasta el bajo terminado.',
        instructions: 'Medir verticalmente desde la unión cuello-hombro pasando sobre el busto hasta el largo final de la silueta.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Medición de longitud completa de vestido de alta costura sobre maniquí',
        anatomicalLandmarks: 'Hombro superior y ruedo del vestido.',
    },
    largo_blusa: {
        code: 'largo_blusa',
        visibleName: 'LARGO DE BLUSA',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Longitud estilística de la blusa desde el hombro hasta el bajo, cubriendo la cadera o a la cintura.',
        instructions: 'Medir en vertical desde el hombro delantero hasta la línea de cadera deseada para la blusa.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Largo de blusa de autor tomado desde hombro hasta dobladillo',
        anatomicalLandmarks: 'Hombro y bajo de blusa.',
    },
    largo_camisa: {
        code: 'largo_camisa',
        visibleName: 'LARGO DE CAMISA',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Longitud de la camisa sastre tradicional con faldón delantero y trasero redondeado.',
        instructions: 'Medir por la espalda desde la costura del cuello hasta el bajo redondeado del faldón.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Medición del largo de camisa sastre en maniquí',
        anatomicalLandmarks: 'Unión canesú-cuello y bajo de camisa.',
    },
    largo_abrigo: {
        code: 'largo_abrigo',
        visibleName: 'LARGO DE ABRIGO',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Longitud de una prenda de abrigo exterior sobrepuesta (a la rodilla, pantorrilla o tobillo).',
        instructions: 'Medir desde el hombro o vértebra C7 hasta el bajo del abrigo considerando el espacio para prendas interiores.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Medición del largo de abrigo de alta costura',
        anatomicalLandmarks: 'Vértebra C7 y bajo del abrigo.',
    },
    profundidad_escote_diseno: {
        code: 'profundidad_escote_diseno',
        visibleName: 'PROFUNDIDAD DE ESCOTE',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Abertura vertical elegida para el escote frontal (en V, corazón o redondo) desde la fosa supraesternal.',
        instructions: 'Medir en vertical desde el hueco del cuello hasta el punto inferior donde abre el escote en la prenda.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Medición estilística de profundidad de escote sobre el pecho',
        anatomicalLandmarks: 'Fosa supraesternal y vértice del escote.',
    },
    ancho_bajo_pantalon: {
        code: 'ancho_bajo_pantalon',
        visibleName: 'ANCHO DE BOCA DE PANTALÓN',
        categoryType: 'design',
        categoryLabel: 'Medida de diseño',
        definition: 'Anchura en plano del dobladillo inferior del pantalón según la silueta (recto, pitillo, palazzo o acampanado).',
        instructions: 'Medir en horizontal sobre el plano del patrón la mitad o contorno total de la boca inferior del pantalón.',
        defaultUnit: 'cm',
        photoAsset: GUIDE_PHOTOS.garment_design,
        altText: 'Medición del ancho de dobladillo de pantalón en mesa de taller',
        anatomicalLandmarks: 'Canto inferior de botamanga.',
    },

    // --------------------------------------------------------------------------
    // 7. PARÁMETROS DE TALLER (HOLGURAS Y MÁRGENES DE COSTURA)
    // --------------------------------------------------------------------------
    margen_costura: {
        code: 'margen_costura',
        visibleName: 'MARGEN DE COSTURA TÉCNICO',
        categoryType: 'workshop',
        categoryLabel: 'Parámetro de taller',
        definition: 'Excedente de tejido añadido en todo el contorno exterior de las piezas de patronaje para el ensamblaje y pespunte. No es una medida de la clienta, sino una especificación de confección.',
        instructions: 'Calibrar con calibre metálico de costura y tiza sastre sobre la mesa de corte, trazando una línea equidistante de 10 a 15 mm respecto a la línea neta de costura.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.workshop_params,
        altText: 'Marcado con calibre metálico y tiza sastre de 15 mm de margen de costura sobre tejido noble',
        anatomicalLandmarks: 'Línea neta de costura y borde de corte del tejido.',
    },
    holgura_pecho: {
        code: 'holgura_pecho',
        visibleName: 'HOLGURA DE PECHO / BUSTO',
        categoryType: 'workshop',
        categoryLabel: 'Parámetro de taller',
        definition: 'Amplitud milimétrica adicional añadida a la medida anatómica del busto para permitir respiración, movimiento y confort. No es una circunferencia corporal.',
        instructions: 'Definir según el grado de ceñido: 0 a 15 mm para prendas corseteras entalladas, 20 a 40 mm para vestidos y blusas fluidas, 40 a 80 mm para sastrería y abrigos.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.workshop_params,
        altText: 'Calibración de la holgura técnica de movimiento entre el cuerpo y el patrón',
        anatomicalLandmarks: 'Perímetro corporal neto vs dimensión final del patrón.',
    },
    holgura_cintura: {
        code: 'holgura_cintura',
        visibleName: 'HOLGURA DE CINTURA',
        categoryType: 'workshop',
        categoryLabel: 'Parámetro de taller',
        definition: 'Holgura técnica en milímetros sobre la cintura anatómica para evitar constricción al sentarse o moverse.',
        instructions: 'Aplicar entre 0 mm (corsés y fajas) y 20 mm (pretinas confortables de alta costura) sobre la medida neta corporal.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.workshop_params,
        altText: 'Determinación de la holgura en pretina de cintura en mesa de patronaje',
        anatomicalLandmarks: 'Cintura neta vs pretina acabada.',
    },
    holgura_cadera: {
        code: 'holgura_cadera',
        visibleName: 'HOLGURA DE CADERA',
        categoryType: 'workshop',
        categoryLabel: 'Parámetro de taller',
        definition: 'Desahogo dimensional en el contorno de cadera para permitir la marcha, la sentada y la fluidez de la prenda.',
        instructions: 'Calibrar entre 15 mm y 40 mm dependiendo de la elasticidad de la tela y el volumen del patrón.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.workshop_params,
        altText: 'Ajuste de holgura en cadera en mesa de corte de sastre',
        anatomicalLandmarks: 'Línea trocantérea neta vs contorno de prenda.',
    },
    tolerancia_confeccion: {
        code: 'tolerancia_confeccion',
        visibleName: 'TOLERANCIA DE CONFECCIÓN',
        categoryType: 'workshop',
        categoryLabel: 'Parámetro de taller',
        definition: 'Margen de precisión admisible en milímetros en el corte y planchado antes de incurrir en desviación de talla.',
        instructions: 'Establecer en taller de alta costura en un rango estricto de ±1 mm a ±2 mm en costuras rectas.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.workshop_params,
        altText: 'Control milimétrico de tolerancias de confección con cinta metálica',
        anatomicalLandmarks: 'Tolerancia geométrica CAD y corte textil.',
    },
    margen_dobladillo: {
        code: 'margen_dobladillo',
        visibleName: 'MARGEN DE DOBLADILLO',
        categoryType: 'workshop',
        categoryLabel: 'Parámetro de taller',
        definition: 'Anchura de tejido reservada en el bajo de la falda, chaqueta o pantalón para el remate a mano invisible de alta costura.',
        instructions: 'Marcar entre 30 mm y 50 mm en bajos rectos para dar peso y caída a la prenda con puntada sastre invisible.',
        defaultUnit: 'mm',
        photoAsset: GUIDE_PHOTOS.workshop_params,
        altText: 'Medición del margen de dobladillo sastre invisible con regla metálica',
        anatomicalLandmarks: 'Línea de quiebre y dobladillo interior.',
    },
};

/**
 * Función centralizada y segura para obtener la guía de una medida por su código canónico
 */
export function getMeasurementGuide(code: string): MeasurementGuideEntry {
    if (MEASUREMENT_GUIDE_CATALOG[code]) {
        return MEASUREMENT_GUIDE_CATALOG[code];
    }

    // Heurística de fallback si el código no tiene entrada estricta
    const isWorkshop = code.includes('holgura') || code.includes('margen') || code.includes('tolerancia');
    const isDesign = code.includes('diseno') || code.startsWith('largo_falda') || code.startsWith('largo_chaqueta');

    const cleanName = code.replace(/_/g, ' ').toUpperCase();

    if (isWorkshop) {
        return {
            code,
            visibleName: cleanName,
            categoryType: 'workshop',
            categoryLabel: 'Parámetro de taller',
            definition: 'Parámetro técnico de sastrería aplicado en el proceso de corte y confección para garantizar el aplomo y la tolerancia de la prenda.',
            instructions: 'Calibrar sobre la mesa de corte en milímetros con escuadra y calibre sastre antes del corte del tejido.',
            defaultUnit: 'mm',
            photoAsset: GUIDE_PHOTOS.workshop_params,
            altText: 'Parámetros y herramientas de taller de alta costura en mesa de corte',
            anatomicalLandmarks: 'Parámetro de confección en mesa de taller.',
        };
    }

    if (isDesign) {
        return {
            code,
            visibleName: cleanName,
            categoryType: 'design',
            categoryLabel: 'Medida de diseño',
            definition: 'Proporción estilística de la prenda definida por la diseñadora de autor para la creación actual.',
            instructions: 'Verificar la caída del diseño sobre el maniquí o en la mesa de modelado de la prenda.',
            defaultUnit: 'cm',
            photoAsset: GUIDE_PHOTOS.garment_design,
            altText: 'Medición de proporciones de prenda de diseño en atelier',
            anatomicalLandmarks: 'Línea de diseño de la prenda.',
        };
    }

    // Medida corporal genérica con asignación fotográfica precisa
    let photo = GUIDE_PHOTOS.bust;
    let defText = 'Dimensión antropométrica anatómica registrada de la clienta para la construcción del bloque de patronaje.';
    let instText = 'Colocar la cinta métrica en contacto suave con la piel o sobre prenda interior fina, respetando los planos anatómicos.';
    let landmarksText = 'Referencia anatómica corporal.';

    if (code.includes('estatura') || code.includes('altura_total')) {
        photo = GUIDE_PHOTOS.height;
        defText = 'Altura antropométrica longitudinal total en bipedestación erguida desde la coronilla hasta el suelo.';
        instText = 'Medir descalza con talones juntos y postura erguida mediante escala vertical de taller o tallímetro.';
        landmarksText = 'Vértex craneal y superficie del suelo.';
    } else if (code.includes('bajo_busto') || code.includes('inframamario')) {
        photo = GUIDE_PHOTOS.underbust;
        defText = 'Perímetro del tórax medido justo en el pliegue inframamario debajo del relieve de los senos.';
        instText = 'Pasar la cinta métrica horizontalmente por debajo de la base mamaria con apoyo nivelado en la espalda.';
        landmarksText = 'Surco inframamario y parrilla costal media.';
    } else if (code === 'largo_hombro') {
        photo = GUIDE_PHOTOS.shoulder_length;
        defText = 'Longitud lineal del hombro desde la base lateral del cuello hasta el vértice exterior del acromion.';
        instText = 'Medir en línea recta desde el punto de nacimiento del cuello hasta la punta del acromion.';
        landmarksText = 'Punto lateral del cuello y acromion exterior.';
    } else if (code.includes('cintura')) {
        photo = GUIDE_PHOTOS.waist;
        defText = 'Perímetro horizontal de la concavidad más estrecha del torso natural.';
        instText = 'Rodear la cintura natural en la concavidad más estrecha del talle sin comprimir.';
        landmarksText = 'Concavidad natural del talle sobre crestas ilíacas.';
    } else if (code.includes('cadera')) {
        photo = GUIDE_PHOTOS.hip;
        defText = 'Circunferencia horizontal en el plano de mayor relieve glúteo y trocantéreo.';
        instText = 'Colocar la cinta métrica horizontalmente sobre la máxima prominencia de los glúteos.';
        landmarksText = 'Trocánteres mayores y cúspides glúteas.';
    } else if (code.includes('espalda') || code.includes('hombro') || code.includes('cuello')) {
        photo = GUIDE_PHOTOS.back_neck;
        landmarksText = 'Plano dorsal y articulaciones superiores.';
    } else if (code.includes('brazo') || code.includes('manga') || code.includes('codo') || code.includes('muneca') || code.includes('biceps')) {
        photo = GUIDE_PHOTOS.arm_sleeve;
        landmarksText = 'Extremidad superior.';
    } else if (code.includes('pierna') || code.includes('pantalon') || code.includes('tiro') || code.includes('muslo') || code.includes('rodilla') || code.includes('tobillo')) {
        photo = GUIDE_PHOTOS.lower_length;
        landmarksText = 'Extremidad inferior y plano de apoyo.';
    }

    return {
        code,
        visibleName: cleanName,
        categoryType: 'body',
        categoryLabel: 'Medida corporal',
        definition: defText,
        instructions: instText,
        defaultUnit: 'cm',
        photoAsset: photo,
        altText: `Demostración de toma de ${cleanName.toLowerCase()} en atelier de alta costura`,
        anatomicalLandmarks: landmarksText,
    };
}
