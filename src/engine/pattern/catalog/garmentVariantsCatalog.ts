// ==============================================================================
// ATELIER DIGITAL — CATÁLOGO DE PRENDAS BASE Y VARIANTES REUTILIZABLES (M02.04)
// Archivo: src/engine/pattern/catalog/garmentVariantsCatalog.ts
// ==============================================================================
// Implementa la regla arquitectónica canónica:
// PRENDA BASE → COMPONENTES → VARIANTE → PATRÓN PARAMÉTRICO
// (Evita estrictamente la proliferación de motores CAD redundantes).
// ==============================================================================

import { BaseGarmentType, GarmentType } from '../../../types/pattern/pattern';

export type GarmentArchitecturalClassification =
    | 'canonical_base'       // Bloque base geométrico primario (10 prendas canónicas)
    | 'composed_variant'     // Variante construida por composición de bloques base
    | 'parametric_derivative'// Variante obtenida por parametrización dimensional directa
    | 'component_derivative';// Variante generada por inyección de componentes modulares

export interface ReusableComponentsSpecification {
    collars?: ('shirt' | 'stand' | 'mandarin' | 'peter_pan' | 'sailor' | 'notch_lapel' | 'shawl')[];
    sleeves?: ('tailored_two_piece' | 'shirt_one_piece' | 'puff' | 'raglan' | 'pagoda' | 'leg_of_mutton')[];
    structure?: ('yoke' | 'placket' | 'cuff' | 'lapel' | 'facings' | 'linings')[];
    elements?: ('patch_pocket' | 'flap_pocket' | 'welt_pocket' | 'cargo_bellows' | 'waistband' | 'belt' | 'godet' | 'peplum')[];
}

export interface GarmentVariantDefinition {
    key: string;
    name: string;
    baseGarmentType: GarmentType;
    classification: GarmentArchitecturalClassification;
    phase: 1 | 2 | 3 | 4;
    description: string;
    methodReference: string;
    requiresNewCadEngine: false; // Regla de oro: No crear nuevo motor
    reusableComponents: ReusableComponentsSpecification;
    traceabilityLineage: {
        parentBlock: GarmentType;
        derivationFormula: string;
    };
}

/**
 * 1. LAS 10 PRENDAS BASE CANÓNICAS CONSOLIDADAS (FASE 1)
 */
export const CANONICAL_BASE_GARMENTS: Record<BaseGarmentType, {
    garmentType: GarmentType;
    name: string;
    blockFile: string;
    description: string;
    isCanonicalBase: true;
}> = {
    bodice: {
        garmentType: 'bodice',
        name: 'Corpiño / Bodice',
        blockFile: 'src/engine/pattern/blocks/bodiceBlock.ts',
        description: 'Bloque anatómico fundamental delantero y espalda con control de pinzas.',
        isCanonicalBase: true,
    },
    sleeve: {
        garmentType: 'sleeve',
        name: 'Manga / Sleeve',
        blockFile: 'src/engine/pattern/blocks/sleeveBlock.ts',
        description: 'Manga anatómica con curva de copa vinculada perimetralmente a la sisa.',
        isCanonicalBase: true,
    },
    skirt: {
        garmentType: 'skirt',
        name: 'Falda / Skirt',
        blockFile: 'src/engine/pattern/blocks/skirtBlock.ts',
        description: 'Bloque inferior con pinzas lumbares y distribución de cadera a la rodilla.',
        isCanonicalBase: true,
    },
    pants: {
        garmentType: 'pants',
        name: 'Pantalón / Pants',
        blockFile: 'src/engine/pattern/blocks/pantsBlock.ts',
        description: 'Pantalón sastre con línea de aplomo, tiro anatómico y entrepierna.',
        isCanonicalBase: true,
    },
    dress: {
        garmentType: 'dress',
        name: 'Vestido / Dress',
        blockFile: 'src/engine/pattern/blocks/dressBlock.ts',
        description: 'Composición armónica de corpiño y falda con alineación perimetral de cintura.',
        isCanonicalBase: true,
    },
    blouse: {
        garmentType: 'blouse',
        name: 'Blusa / Blouse',
        blockFile: 'src/engine/pattern/blocks/blouseBlock.ts',
        description: 'Derivación relajada de corpiño con holgura confortable y sisa descendida.',
        isCanonicalBase: true,
    },
    shirt: {
        garmentType: 'shirt',
        name: 'Camisa / Shirt',
        blockFile: 'src/engine/pattern/blocks/shirtBlock.ts',
        description: 'Construcción sastre con canesú, cuello camisero 2 piezas, manga y puño.',
        isCanonicalBase: true,
    },
    jacket: {
        garmentType: 'jacket',
        name: 'Chaqueta Sastre / Jacket',
        blockFile: 'src/engine/pattern/blocks/jacketBlock.ts',
        description: 'Sastrería estructurada con solapa de muesca, costadillos y manga 2 hojas.',
        isCanonicalBase: true,
    },
    coat: {
        garmentType: 'coat',
        name: 'Abrigo / Coat',
        blockFile: 'src/engine/pattern/blocks/coatBlock.ts',
        description: 'Sastrería exterior envolvente con solapa amplia, costadillos y abertura.',
        isCanonicalBase: true,
    },
    corset: {
        garmentType: 'corset',
        name: 'Corsé / Corset',
        blockFile: 'src/engine/pattern/blocks/corsetBlock.ts',
        description: 'Estructura anatómica de 5 paneles con reducción de cintura y soporte óseo.',
        isCanonicalBase: true,
    },
};

/**
 * 2. REGISTRO OFICIAL DE VARIANTES REUTILIZABLES (FASES 1, 2, 3 Y 4)
 * Conservan trazabilidad absoluta hacia su prenda base y reutilizan componentes sin duplicar CAD.
 */
export const GARMENT_VARIANTS_REGISTRY: Record<string, GarmentVariantDefinition> = {
    // --- FASE 1 / FASE 3: PRIMERAS 4 VARIANTES CANÓNICAS ---
    shirt_dress: {
        key: 'shirt_dress',
        name: 'Vestido Camisero',
        baseGarmentType: 'dress',
        classification: 'composed_variant',
        phase: 3,
        description: 'Fusión de cuerpo camisero estructurado con falda, cuello camisero, tapeta abotonada y manga con puño.',
        methodReference: 'Composición de bloque vestido con componentes camiseros By Katherine Carroll',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['shirt'],
            sleeves: ['shirt_one_piece'],
            structure: ['yoke', 'placket', 'cuff'],
            elements: ['belt'],
        },
        traceabilityLineage: {
            parentBlock: 'dress',
            derivationFormula: 'dressBlock + shirtBlock.yoke + collarComponent + cuffComponent',
        },
    },

    tailored_vest: {
        key: 'tailored_vest',
        name: 'Chaleco Sastre',
        baseGarmentType: 'jacket',
        classification: 'component_derivative',
        phase: 3,
        description: 'Cuerpo de chaqueta sastre entallado sin mangas, con sisa ribeteada con vista, escote V y ceñidor dorsal.',
        methodReference: 'Derivación sastre de chaqueta femenina sin mangas con remate de sisa',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['notch_lapel'],
            sleeves: [],
            structure: ['facings', 'linings'],
            elements: ['welt_pocket', 'belt'],
        },
        traceabilityLineage: {
            parentBlock: 'jacket',
            derivationFormula: 'jacketBlock(pieces: front, back, side_panels; exclude: sleeves)',
        },
    },

    short: {
        key: 'short',
        name: 'Short Sastre / Bermuda',
        baseGarmentType: 'pants',
        classification: 'parametric_derivative',
        phase: 3,
        description: 'Derivación de pantalón con parametrización de largo sobre rodilla o medio muslo, tiro ajustado y bastilla sastre.',
        methodReference: 'Parametrización longitudinal de pernera sobre pantalón sastre base',
        requiresNewCadEngine: false,
        reusableComponents: {
            structure: ['facings'],
            elements: ['waistband', 'slant_pocket' as any],
        },
        traceabilityLineage: {
            parentBlock: 'pants',
            derivationFormula: 'pantsBlock(largo_exterior_pierna: 400-500 mm, entrepierna: 150-250 mm)',
        },
    },

    cargo_pants: {
        key: 'cargo_pants',
        name: 'Pantalón Cargo / Safari',
        baseGarmentType: 'pants',
        classification: 'component_derivative',
        phase: 3,
        description: 'Pantalón base estructurado con incorporación de bolsillos de parche fuelle con tapa en laterales y pretina safari.',
        methodReference: 'Pantalón sastre con adición de módulos de bolsillos utilitarios',
        requiresNewCadEngine: false,
        reusableComponents: {
            structure: ['facings'],
            elements: ['cargo_bellows', 'flap_pocket', 'waistband', 'belt'],
        },
        traceabilityLineage: {
            parentBlock: 'pants',
            derivationFormula: 'pantsBlock + cargoPocketComponent(placement: lateral_thigh)',
        },
    },

    // --- FASE 4: PRENDAS AVANZADAS Y VARIANTES ---
    trench_coat: {
        key: 'trench_coat',
        name: 'Gabardina / Trench Coat',
        baseGarmentType: 'coat',
        classification: 'composed_variant',
        phase: 4,
        description: 'Abrigo exterior cruzado con canesú de lluvia (storm flap), charreteras, solapa amplia convertible y cinturón.',
        methodReference: 'Técnica de trench sastre militar clásico By Katherine Carroll',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['notch_lapel', 'shawl'],
            sleeves: ['raglan', 'tailored_two_piece'],
            structure: ['yoke', 'facings', 'linings'],
            elements: ['flap_pocket', 'belt'],
        },
        traceabilityLineage: {
            parentBlock: 'coat',
            derivationFormula: 'coatBlock + stormFlapYoke + epaulettes + trenchBelt',
        },
    },

    atelier_robe: {
        key: 'atelier_robe',
        name: 'Bata de Taller de Alta Costura',
        baseGarmentType: 'coat',
        classification: 'composed_variant',
        phase: 4,
        description: 'Prenda envolvente funcional de atelier con cruce amplio, mangas fluidas, grandes bolsillos de parche y cinturón de lazada.',
        methodReference: 'Patronaje de abrigo envolvente ligero con desahogo funcional',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['shawl', 'mandarin'],
            sleeves: ['shirt_one_piece'],
            structure: ['facings'],
            elements: ['patch_pocket', 'belt'],
        },
        traceabilityLineage: {
            parentBlock: 'coat',
            derivationFormula: 'coatBlock(ease: relaxed, silhouette: wrap) + patchPockets',
        },
    },

    evening_gown: {
        key: 'evening_gown',
        name: 'Vestido de Gala',
        baseGarmentType: 'dress',
        classification: 'composed_variant',
        phase: 4,
        description: 'Vestido de gran ocasión con cuerpo estructurado tipo corsé y falda larga con godets o caída fluida.',
        methodReference: 'Alta costura de gala con estructuración interna de corsé y falda envolvente',
        requiresNewCadEngine: false,
        reusableComponents: {
            elements: ['godet'],
        },
        traceabilityLineage: {
            parentBlock: 'dress',
            derivationFormula: 'corsetBlock + skirtBlock(largo_falda: maxi, silhouette: a_line/godet)',
        },
    },

    bridal_gown: {
        key: 'bridal_gown',
        name: 'Vestido de Novia',
        baseGarmentType: 'dress',
        classification: 'composed_variant',
        phase: 4,
        description: 'Traje nupcial de alta costura con corsetería emballenada integrada y falda con cola paramétrica.',
        methodReference: 'Técnica nupcial de atelier con cola de capilla/catedral',
        requiresNewCadEngine: false,
        reusableComponents: {
            elements: ['godet', 'peplum'],
        },
        traceabilityLineage: {
            parentBlock: 'dress',
            derivationFormula: 'corsetBlock + skirtBlock(train_length: 500-1500 mm)',
        },
    },

    draped_asymmetric_dress: {
        key: 'draped_asymmetric_dress',
        name: 'Vestido Drapeado / Asimétrico',
        baseGarmentType: 'dress',
        classification: 'composed_variant',
        phase: 4,
        description: 'Vestido con desarrollo asimétrico en hombro/escote y distribución de pliegues drapeados sobre base anatómica.',
        methodReference: 'Modelado y rotación de pinzas a pliegues drapeados sobre bloque de vestido',
        requiresNewCadEngine: false,
        reusableComponents: {},
        traceabilityLineage: {
            parentBlock: 'dress',
            derivationFormula: 'dressBlock + asymmetricDartRotation',
        },
    },

    structured_formal_blouse: {
        key: 'structured_formal_blouse',
        name: 'Blusa Formal Estructurada',
        baseGarmentType: 'blouse',
        classification: 'component_derivative',
        phase: 4,
        description: 'Blusa femenina con cuello mao o camisero, tapeta oculta, costadillo estilizador y puños dobles franceses.',
        methodReference: 'Derivación de blusa entallada con componentes sastre formales',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['mandarin', 'shirt'],
            sleeves: ['shirt_one_piece'],
            structure: ['placket', 'cuff', 'facings'],
        },
        traceabilityLineage: {
            parentBlock: 'blouse',
            derivationFormula: 'blouseBlock + collarComponent(mandarin) + cuffComponent(french)',
        },
    },

    bomber_jacket: {
        key: 'bomber_jacket',
        name: 'Cazadora de Alta Costura',
        baseGarmentType: 'jacket',
        classification: 'component_derivative',
        phase: 4,
        description: 'Chaqueta corta con cuello camisero o mao, cremallera frontal, puños y pretina con elástico o tabla.',
        methodReference: 'Sastrería sport-couture con pretina y puños acanalados o ajustados',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['shirt', 'mandarin'],
            sleeves: ['shirt_one_piece', 'raglan'],
            structure: ['facings', 'linings'],
            elements: ['waistband', 'flap_pocket'],
        },
        traceabilityLineage: {
            parentBlock: 'jacket',
            derivationFormula: 'jacketBlock(largo_chaqueta: crop, silhouette: bomber) + waistbandComponent',
        },
    },

    denim_couture_jacket: {
        key: 'denim_couture_jacket',
        name: 'Chaqueta Vaquera de Alta Costura',
        baseGarmentType: 'jacket',
        classification: 'component_derivative',
        phase: 4,
        description: 'Chaqueta estructurada con canesús frontales y traseros, costadillos rectos, bolsillos con cartera y pretina con trabillas.',
        methodReference: 'Patronaje de sastrería denim de precisión con pespunte y canesús articulados',
        requiresNewCadEngine: false,
        reusableComponents: {
            collars: ['shirt'],
            sleeves: ['shirt_one_piece', 'tailored_two_piece'],
            structure: ['yoke', 'placket', 'cuff'],
            elements: ['flap_pocket', 'waistband'],
        },
        traceabilityLineage: {
            parentBlock: 'jacket',
            derivationFormula: 'jacketBlock + frontBackYokes + chestFlapPockets',
        },
    },
};

/**
 * Resuelve la prenda base canónica y los componentes para cualquier variante o prenda del catálogo.
 */
export function resolveGarmentLineage(garmentKey: string): {
    baseGarmentType: GarmentType;
    isVariant: boolean;
    variantDef?: GarmentVariantDefinition;
    requiresNewEngine: false;
} {
    if (garmentKey in CANONICAL_BASE_GARMENTS) {
        return {
            baseGarmentType: garmentKey as GarmentType,
            isVariant: false,
            requiresNewEngine: false,
        };
    }

    const variantDef = GARMENT_VARIANTS_REGISTRY[garmentKey];
    if (variantDef) {
        return {
            baseGarmentType: variantDef.baseGarmentType,
            isVariant: true,
            variantDef,
            requiresNewEngine: false,
        };
    }

    // Default seguro
    return {
        baseGarmentType: 'bodice',
        isVariant: false,
        requiresNewEngine: false,
    };
}
