// ==============================================================================
// ATELIER DIGITAL — PAQUETES DE MEDIDAS POR PRENDA (M02.03)
// Archivo: src/engine/pattern/catalog/garmentPackages.ts
// ==============================================================================
// Define dinámicamente los requisitos para Corpiño, Manga, Falda, Pantalón,
// Vestido y Blusa, diferenciando obligatorias, opcionales y reglas calculables.
// ==============================================================================

import type { GarmentType, PatternValidationResult } from '../../../types/pattern/pattern';
import { MEASUREMENT_MAP } from './masterCatalog';

export interface GarmentPackageDefinition {
    garmentType: GarmentType;
    name: string;
    description: string;
    methodReference: string;
    required: string[];
    optional: string[];
    calculableFallbacks: Record<string, { formulaDescription: string; calculate: (m: Record<string, number>) => number | null }>;
}

export const GARMENT_PACKAGES: Record<GarmentType, GarmentPackageDefinition> = {
    bodice: {
        garmentType: 'bodice',
        name: 'Corpiño Base de Alta Costura',
        description: 'Bloque anatómico delantero y espalda con pinzas de busto y cintura.',
        methodReference: 'Método clásico de patronaje a medida (Aldrich & Gilewska adaptado)',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
        ],
        optional: [
            'contorno_cuello',
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'profundidad_sisa',
            'contorno_alto_busto',
            'inclinacion_hombros',
        ],
        calculableFallbacks: {
            profundidad_sisa: {
                formulaDescription: 'Regla de proporción clásica: Largo talle espalda / 2 + 10 mm (sujeta a confirmación)',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 10 : null),
            },
            ancho_pecho: {
                formulaDescription: 'Regla antropométrica proporcional: Ancho de espalda - 20 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda - 20 : null),
            },
            largo_hombro: {
                formulaDescription: 'Regla proporcional: (Ancho hombros - 120 mm) / 2',
                calculate: (m) => (m.ancho_hombros ? (m.ancho_hombros - 120) / 2.0 : 125),
            },
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto / 2.5 aprox.',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.38) : 360),
            },
        },
    },

    sleeve: {
        garmentType: 'sleeve',
        name: 'Manga Sastre Enlazada',
        description: 'Manga con curva de copa anatómica vinculada a la sisa del corpiño.',
        methodReference: 'Cálculo geométrico de copa con embebido proporcional de 20-30 mm',
        required: [
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
        ],
        optional: [
            'distancia_hombro_codo',
            'contorno_codo_flexionado',
            'contorno_antebrazo',
        ],
        calculableFallbacks: {
            distancia_hombro_codo: {
                formulaDescription: 'Proporción estándar: Largo brazo * 0.58',
                calculate: (m) => (m.largo_brazo ? m.largo_brazo * 0.58 : null),
            },
        },
    },

    skirt: {
        garmentType: 'skirt',
        name: 'Falda Base y Línea A',
        description: 'Falda delantera y espalda con pinzas lumbares y distribución de cadera.',
        methodReference: 'Patronaje analítico de faldas de alta costura',
        required: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_cintura_cadera',
            'largo_falda',
        ],
        optional: [
            'contorno_cadera_alta',
        ],
        calculableFallbacks: {
            profundidad_cintura_cadera: {
                formulaDescription: 'Estándar de taller si no se registra: 200 mm',
                calculate: () => 200,
            },
            largo_falda: {
                formulaDescription: 'Largo clásico a la rodilla por defecto: 600 mm',
                calculate: () => 600,
            },
        },
    },

    pants: {
        garmentType: 'pants',
        name: 'Pantalón Sastre Femenino',
        description: 'Pantalón con línea de aplomo, compensación glútea y tiro anatómico.',
        methodReference: 'Trazado clásico de tiro con compensación glútea y holgura de movimiento',
        required: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_exterior_pierna',
            'largo_entrepierna',
            'contorno_muslo',
            'contorno_rodilla',
            'contorno_tobillo',
        ],
        optional: [
            'contorno_pantorrilla',
        ],
        calculableFallbacks: {
            profundidad_tiro: {
                formulaDescription: 'Regla de estimación: Largo exterior - Largo entrepierna (requiere validación en prueba)',
                calculate: (m) => {
                    if (m.largo_exterior_pierna && m.largo_entrepierna) {
                        return m.largo_exterior_pierna - m.largo_entrepierna;
                    }
                    return null;
                },
            },
        },
    },

    dress: {
        garmentType: 'dress',
        name: 'Vestido Atelier Compuesto',
        description: 'Unión armónica de corpiño y falda con alineación de cintura.',
        methodReference: 'Composición de bloques con verificación de continuidad perimetral',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'ancho_espalda',
            'largo_falda',
        ],
        optional: [
            'profundidad_cintura_cadera',
            'ancho_hombros',
            'largo_brazo',
            'contorno_biceps',
        ],
        calculableFallbacks: {
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional: Largo talle espalda / 2 + 10 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 10 : null),
            },
            profundidad_cintura_cadera: {
                formulaDescription: 'Valor estándar de atelier: 200 mm',
                calculate: () => 200,
            },
            largo_falda: {
                formulaDescription: 'Largo predeterminado: 650 mm',
                calculate: () => 650,
            },
        },
    },

    blouse: {
        garmentType: 'blouse',
        name: 'Blusa Fluida Derivada',
        description: 'Derivación del corpiño base con holgura ampliada y sisa confortable.',
        methodReference: 'Derivación de corpiño con holgura relajada de caída suave',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_blusa',
        ],
        optional: [
            'contorno_cadera',
            'ancho_pecho',
            'ancho_hombros',
        ],
        calculableFallbacks: {
            largo_blusa: {
                formulaDescription: 'Largo de cadera estándar: Largo talle espalda + 180 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda + 180 : 600),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional con desahogo: Largo talle espalda / 2 + 25 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 25 : null),
            },
        },
    },

    shirt: {
        garmentType: 'shirt',
        name: 'Camisa de Alta Costura',
        description: 'Construcción con canesú, cuello camisero de 2 piezas, cruce frontal, manga sastre y puños.',
        methodReference: 'Sastrería clásica y patronaje a medida By Katherine Carroll (Aldrich adaptado)',
        required: [
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_muneca',
        ],
        optional: [
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'contorno_biceps',
            'contorno_cadera',
            'profundidad_sisa',
            'largo_camisa',
            'inclinacion_hombros',
        ],
        calculableFallbacks: {
            largo_camisa: {
                formulaDescription: 'Largo de cadera estándar: Largo talle espalda + 250 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda + 250 : 660),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional con desahogo camisero: Largo talle espalda / 2 + 20 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 20 : null),
            },
            ancho_pecho: {
                formulaDescription: 'Regla antropométrica proporcional: Ancho de espalda - 20 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda - 20 : null),
            },
            largo_hombro: {
                formulaDescription: 'Regla proporcional: (Ancho hombros - 120 mm) / 2',
                calculate: (m) => (m.ancho_hombros ? (m.ancho_hombros - 120) / 2.0 : 125),
            },
            ancho_hombros: {
                formulaDescription: 'Regla proporcional: Ancho de espalda + 40 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda + 40 : 400),
            },
            contorno_biceps: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.32',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.32) : 290),
            },
            contorno_cadera: {
                formulaDescription: 'Proporción anatómica: Contorno de busto * 1.08',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 1.08) : 980),
            },
        },
    },
    corset: {
        garmentType: 'corset',
        name: 'Corpiño / Corsé Estructurado de Alta Costura',
        description: 'Estructura multicorte anatómica de 5 paneles con reducción activa de cintura, soporte óseo y contorno bajo busto.',
        methodReference: 'Técnica de corsetería de alta costura By Katherine Carroll (Couture Victorian & Modern Corsetry)',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
        ],
        optional: [
            'contorno_bajo_busto',
            'contorno_cadera_alta',
            'contorno_cadera',
            'ancho_espalda',
            'ancho_pecho',
            'profundidad_sisa',
        ],
        calculableFallbacks: {
            contorno_bajo_busto: {
                formulaDescription: 'Regla anatómica inframamaria: Contorno de busto * 0.85',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.85) : 780),
            },
            contorno_cadera_alta: {
                formulaDescription: 'Proporción sobre cresta ilíaca: Contorno de cintura * 1.18',
                calculate: (m) => (m.contorno_cintura ? Math.round(m.contorno_cintura * 1.18) : 850),
            },
            contorno_cadera: {
                formulaDescription: 'Proporción pélvica: Contorno de cintura * 1.35',
                calculate: (m) => (m.contorno_cintura ? Math.round(m.contorno_cintura * 1.35) : 980),
            },
            ancho_espalda: {
                formulaDescription: 'Regla antropométrica dorsal: Contorno de busto * 0.38',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.38) : 350),
            },
            ancho_pecho: {
                formulaDescription: 'Regla proporcional anterior: Ancho de espalda - 20 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda - 20 : (m.contorno_busto ? Math.round(m.contorno_busto * 0.36) : 330)),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla de proporción torácica: Largo talle espalda / 2 + 10 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 10 : 210),
            },
        },
    },
    jacket: {
        garmentType: 'jacket',
        name: 'Chaqueta Sastre de Alta Costura',
        description: 'Sastrería estructurada con solapa de muesca, costadillos anatómicos, manga sastre de 2 hojas y bolsillos de cartera.',
        methodReference: 'Técnica de sastrería femenina de alta costura By Katherine Carroll (Savile Row & French Couture adaptado)',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'contorno_muneca',
            'profundidad_sisa',
            'largo_chaqueta',
            'inclinacion_hombros',
        ],
        calculableFallbacks: {
            largo_chaqueta: {
                formulaDescription: 'Largo de cadera sastre estándar: Largo talle espalda + 280 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda + 280 : 700),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional con desahogo de prenda exterior: Largo talle espalda / 2 + 30 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 30 : 235),
            },
            ancho_pecho: {
                formulaDescription: 'Regla antropométrica proporcional: Ancho de espalda - 20 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda - 20 : (m.contorno_busto ? Math.round(m.contorno_busto * 0.36) : 340)),
            },
            largo_hombro: {
                formulaDescription: 'Regla proporcional sastre: (Ancho hombros - 120 mm) / 2',
                calculate: (m) => (m.ancho_hombros ? (m.ancho_hombros - 120) / 2.0 : 130),
            },
            ancho_hombros: {
                formulaDescription: 'Regla proporcional sastre: Ancho de espalda + 50 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda + 50 : 410),
            },
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.38',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.38) : 370),
            },
            contorno_muneca: {
                formulaDescription: 'Regla proporcional: Contorno de bíceps * 0.60',
                calculate: (m) => (m.contorno_biceps ? Math.round(m.contorno_biceps * 0.60) : 170),
            },
            altura_busto: {
                formulaDescription: 'Regla proporcional de talle: Largo talle delantero * 0.58',
                calculate: (m) => (m.largo_talle_delantero ? Math.round(m.largo_talle_delantero * 0.58) : 260),
            },
            separacion_busto: {
                formulaDescription: 'Regla antropométrica torácica: Contorno de busto * 0.20',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.20) : 190),
            },
        },
    },
    coat: {
        garmentType: 'coat',
        name: 'Abrigo de Alta Costura',
        description: 'Sastrería de abrigo exterior envolvente con solapa amplia, costadillos, manga sastre de dos hojas y abertura de marcha.',
        methodReference: 'Técnica de sastrería pesada y abrigo de alta costura By Katherine Carroll (Couture Tailored Overcoat)',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'contorno_muneca',
            'profundidad_sisa',
            'largo_abrigo',
            'inclinacion_hombros',
        ],
        calculableFallbacks: {
            largo_abrigo: {
                formulaDescription: 'Largo de abrigo clásico sastre: Largo talle espalda + 640 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda + 640 : 1050),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional con desahogo de abrigo pesado: Largo talle espalda / 2 + 45 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 45 : 250),
            },
            ancho_pecho: {
                formulaDescription: 'Regla antropométrica proporcional: Ancho de espalda - 15 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda - 15 : (m.contorno_busto ? Math.round(m.contorno_busto * 0.37) : 350)),
            },
            largo_hombro: {
                formulaDescription: 'Regla proporcional sastre para abrigo: (Ancho hombros - 110 mm) / 2',
                calculate: (m) => (m.ancho_hombros ? (m.ancho_hombros - 110) / 2.0 : 135),
            },
            ancho_hombros: {
                formulaDescription: 'Regla proporcional sastre para abrigo: Ancho de espalda + 60 mm',
                calculate: (m) => (m.ancho_espalda ? m.ancho_espalda + 60 : 420),
            },
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.39',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.39) : 380),
            },
            contorno_muneca: {
                formulaDescription: 'Regla proporcional para abrigo: Contorno de bíceps * 0.65',
                calculate: (m) => (m.contorno_biceps ? Math.round(m.contorno_biceps * 0.65) : 180),
            },
            altura_busto: {
                formulaDescription: 'Regla proporcional de talle: Largo talle delantero * 0.58',
                calculate: (m) => (m.largo_talle_delantero ? Math.round(m.largo_talle_delantero * 0.58) : 260),
            },
            separacion_busto: {
                formulaDescription: 'Regla antropométrica torácica: Contorno de busto * 0.20',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.20) : 190),
            },
        },
    },

    shirt_dress: {
        garmentType: 'shirt_dress',
        name: 'Vestido Camisero de Alta Costura',
        description: 'Fusión de cuerpo camisero estructurado con falda, cuello camisero, tapeta abotonada, manga y cinturón de lazada.',
        methodReference: 'Composición de bloque vestido con componentes camiseros By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
            'largo_falda',
        ],
        optional: [
            'contorno_cuello',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'contorno_muneca',
            'profundidad_sisa',
        ],
        calculableFallbacks: {
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.38',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.38) : 360),
            },
            contorno_muneca: {
                formulaDescription: 'Regla proporcional: Contorno de bíceps * 0.58',
                calculate: (m) => (m.contorno_biceps ? Math.round(m.contorno_biceps * 0.58) : 165),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional clásica: Largo talle espalda / 2 + 15 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 15 : 220),
            },
            largo_falda: {
                formulaDescription: 'Largo camisero midi: 650 mm por defecto',
                calculate: () => 650,
            },
        },
    },

    tailored_vest: {
        garmentType: 'tailored_vest',
        name: 'Chaleco Sastre de Alta Costura',
        description: 'Torso sastre estructurado sin mangas, con sisa limpia, costadillos, vistas interiores, bolsillos ojal y ceñidor dorsal.',
        methodReference: 'Sastrería clásica de chaleco By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
        ],
        optional: [
            'altura_busto',
            'separacion_busto',
            'contorno_cuello',
            'ancho_hombros',
            'largo_hombro',
            'profundidad_sisa',
        ],
        calculableFallbacks: {
            altura_busto: {
                formulaDescription: 'Regla proporcional: Largo talle delantero * 0.58',
                calculate: (m) => (m.largo_talle_delantero ? Math.round(m.largo_talle_delantero * 0.58) : 260),
            },
            separacion_busto: {
                formulaDescription: 'Regla antropométrica: Contorno de busto * 0.20',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.20) : 190),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla de sisa limpia sastre: Largo talle espalda / 2 + 10 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 10 : 215),
            },
        },
    },

    short: {
        garmentType: 'short',
        name: 'Short Sastre de Alta Costura',
        description: 'Construcción derivada de pantalón con cintura, tiro y entrepierna adaptadas, pretina anatómica y bolsillos sastre.',
        methodReference: 'Patronaje de short sastre By Katherine Carroll',
        required: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_exterior_pierna',
        ],
        optional: [
            'contorno_muslo',
            'profundidad_cintura_cadera',
        ],
        calculableFallbacks: {
            largo_exterior_pierna: {
                formulaDescription: 'Largo exterior estándar de pierna para short sastre sobre rodilla: 450 mm',
                calculate: () => 450,
            },
            contorno_muslo: {
                formulaDescription: 'Regla proporcional de muslo: Contorno cadera * 0.58',
                calculate: (m) => (m.contorno_cadera ? Math.round(m.contorno_cadera * 0.58) : 580),
            },
            profundidad_tiro: {
                formulaDescription: 'Regla antropométrica de tiro: Contorno cadera * 0.26',
                calculate: (m) => (m.contorno_cadera ? Math.round(m.contorno_cadera * 0.26) : 260),
            },
        },
    },

    cargo_pants: {
        garmentType: 'cargo_pants',
        name: 'Pantalón Cargo / Safari',
        description: 'Pantalón utilitario sastre con bolsillos laterales de fuelle 3D, carteras en pico, bolsillos traseros safari y pretina reforzada.',
        methodReference: 'Sastrería utilitaria y safari By Katherine Carroll',
        required: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_exterior_pierna',
            'largo_entrepierna',
        ],
        optional: [
            'contorno_muslo',
            'contorno_rodilla',
            'contorno_tobillo',
        ],
        calculableFallbacks: {
            profundidad_tiro: {
                formulaDescription: 'Regla de tiro: Largo exterior - Largo entrepierna',
                calculate: (m) => (m.largo_exterior_pierna && m.largo_entrepierna ? m.largo_exterior_pierna - m.largo_entrepierna : 260),
            },
            largo_entrepierna: {
                formulaDescription: 'Regla proporcional: Largo exterior pierna * 0.74',
                calculate: (m) => (m.largo_exterior_pierna ? Math.round(m.largo_exterior_pierna * 0.74) : 760),
            },
        },
    },

    trench_coat: {
        garmentType: 'trench_coat',
        name: 'Gabardina / Trench Coat de Alta Costura',
        description: 'Abrigo técnico de doble botonadura con storm flap dorsal, gun flap frontal, cuello convertible, charreteras y cinturón con trabillas.',
        methodReference: 'Técnica militar y sastre de gabardina clásica By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'contorno_muneca',
            'profundidad_sisa',
            'largo_abrigo',
        ],
        calculableFallbacks: {
            largo_abrigo: {
                formulaDescription: 'Largo clásico trench coat: 1050 mm',
                calculate: () => 1050,
            },
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.39',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.39) : 370),
            },
            profundidad_sisa: {
                formulaDescription: 'Regla proporcional trench: Largo talle espalda / 2 + 45 mm',
                calculate: (m) => (m.largo_talle_espalda ? m.largo_talle_espalda / 2.0 + 45 : 250),
            },
            contorno_muneca: {
                formulaDescription: 'Regla proporcional de muñeca: Contorno bíceps * 0.60',
                calculate: (m) => (m.contorno_biceps ? Math.round(m.contorno_biceps * 0.60) : 170),
            },
        },
    },

    atelier_robe: {
        garmentType: 'atelier_robe',
        name: 'Bata de Taller de Alta Costura',
        description: 'Prenda envolvente de taller con cruce amplio, hombro caído, vista corrida, bolsillos de parche para herramientas y cinturón de lazada.',
        methodReference: 'Patronaje de kimono y bata sastre de taller By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional: [
            'contorno_cuello',
            'ancho_espalda',
            'largo_abrigo',
            'contorno_muneca',
        ],
        calculableFallbacks: {
            largo_abrigo: {
                formulaDescription: 'Largo de bata de taller por debajo de la rodilla: 1100 mm',
                calculate: () => 1100,
            },
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.38',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.38) : 370),
            },
        },
    },

    evening_gown: {
        garmentType: 'evening_gown',
        name: 'Vestido de Gala de Alta Ocasión',
        description: 'Bloque especializado con corpiño corazón estructurado de 4 paneles, falda sirena entallada a la rodilla, cola posterior y godet de vuelo.',
        methodReference: 'Alta Costura para ceremonias de noche By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'largo_falda',
        ],
        optional: [
            'ancho_espalda',
            'contorno_alto_busto',
            'contorno_bajo_busto',
            'profundidad_cintura_cadera',
        ],
        calculableFallbacks: {
            largo_falda: {
                formulaDescription: 'Largo maxi de gala al suelo: 1150 mm',
                calculate: () => 1150,
            },
            altura_busto: {
                formulaDescription: 'Regla proporcional: Largo talle delantero * 0.58',
                calculate: (m) => (m.largo_talle_delantero ? Math.round(m.largo_talle_delantero * 0.58) : 260),
            },
            separacion_busto: {
                formulaDescription: 'Regla torácica: Contorno de busto * 0.20',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.20) : 190),
            },
        },
    },

    bridal_gown: {
        garmentType: 'bridal_gown',
        name: 'Vestido de Novia de Alta Costura',
        description: 'Bloque nupcial de gala con copas estructuradas, costadillos de soporte submamario, falda majestuosa de vuelo con cola de capilla y peplum interior.',
        methodReference: 'Arquitectura nupcial de novia Haute Couture By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'largo_falda',
        ],
        optional: [
            'contorno_bajo_busto',
            'ancho_espalda',
            'profundidad_cintura_cadera',
        ],
        calculableFallbacks: {
            largo_falda: {
                formulaDescription: 'Largo nupcial majestuoso al suelo: 1180 mm',
                calculate: () => 1180,
            },
            altura_busto: {
                formulaDescription: 'Regla proporcional: Largo talle delantero * 0.58',
                calculate: (m) => (m.largo_talle_delantero ? Math.round(m.largo_talle_delantero * 0.58) : 260),
            },
            separacion_busto: {
                formulaDescription: 'Regla torácica: Contorno de busto * 0.20',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.20) : 190),
            },
        },
    },

    draped_asymmetric_dress: {
        garmentType: 'draped_asymmetric_dress',
        name: 'Vestido Drapeado / Asimétrico',
        description: 'Vestido de un solo hombro con geometría asimétrica real, drapeado en cascada diagonal y ruedo desigual high-low.',
        methodReference: 'Técnica de drapeado sobre maniquí y patronaje asimétrico By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'largo_falda',
        ],
        optional: [
            'separacion_busto',
            'contorno_cuello',
            'ancho_espalda',
        ],
        calculableFallbacks: {
            largo_falda: {
                formulaDescription: 'Largo base de vestido asimétrico: 1020 mm',
                calculate: () => 1020,
            },
            altura_busto: {
                formulaDescription: 'Regla proporcional: Largo talle delantero * 0.58',
                calculate: (m) => (m.largo_talle_delantero ? Math.round(m.largo_talle_delantero * 0.58) : 260),
            },
        },
    },

    bomber_jacket: {
        garmentType: 'bomber_jacket',
        name: 'Cazadora / Bomber Jacket',
        description: 'Chaqueta corta blusada con cuello, pretina y puños de canalé elástico, cremallera delantera y bolsillos de ojal inclinados.',
        methodReference: 'Sastrería contemporánea y blusón By Katherine Carroll',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
        ],
        optional: [
            'contorno_cuello',
            'ancho_espalda',
            'largo_hombro',
        ],
        calculableFallbacks: {
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.39',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.39) : 370),
            },
        },
    },

    denim_couture_jacket: {
        garmentType: 'denim_couture_jacket',
        name: 'Chaqueta Vaquera / Denim Couture',
        description: 'Chaqueta vaquera estructurada con canesús delantero y trasero, centro abotonado con tapeta, costadillos, cuello camisero, puños y carteras western.',
        methodReference: 'Patronaje vaquero artesanal By Katherine Carroll (Western Couture Jacket)',
        required: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_espalda',
            'largo_brazo',
            'contorno_biceps',
            'contorno_muneca',
        ],
        optional: [
            'contorno_cuello',
            'ancho_espalda',
            'largo_hombro',
            'largo_talle_delantero',
        ],
        calculableFallbacks: {
            contorno_cuello: {
                formulaDescription: 'Regla proporcional: Contorno de busto * 0.39',
                calculate: (m) => (m.contorno_busto ? Math.round(m.contorno_busto * 0.39) : 370),
            },
        },
    },
};

export function validateGarmentRequirements(
    garmentType: GarmentType,
    measurementsMm: Record<string, number>
): {
    valid: boolean;
    resolvedMeasurements: Record<string, number>;
    validationResult: PatternValidationResult;
} {
    const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequired: string[] = [];
    const calculatedNotes: string[] = [];
    const resolvedMeasurements: Record<string, number> = { ...measurementsMm };

    if (!pkg) {
        return {
            valid: false,
            resolvedMeasurements,
            validationResult: {
                valid: false,
                errors: ['No se ha especificado una categoría técnica de prenda válida.'],
                warnings: [],
                missingRequiredMeasurements: [],
                calculatedNotes: [],
            },
        };
    }

    // 1. Revisar medidas obligatorias
    for (const code of pkg.required) {
        const val = resolvedMeasurements[code];
        if (val === undefined || val === null || val <= 0) {
            // Intentar resolver por regla de fallback si está definida
            const fallback = pkg.calculableFallbacks[code];
            if (fallback) {
                const calculatedVal = fallback.calculate(resolvedMeasurements);
                if (calculatedVal && calculatedVal > 0) {
                    resolvedMeasurements[code] = calculatedVal;
                    calculatedNotes.push(
                        `Medida "${MEASUREMENT_MAP[code]?.name || code}" calculada provisionalmente: ${calculatedVal} mm (${fallback.formulaDescription}).`
                    );
                    warnings.push(
                        `La medida "${MEASUREMENT_MAP[code]?.name || code}" no fue tomada físicamente. Se utilizó cálculo proporcional.`
                    );
                    continue;
                }
            }
            missingRequired.push(code);
            errors.push(
                `Falta la medida obligatoria: ${MEASUREMENT_MAP[code]?.name || code}. No es posible generar el patrón sin este dato.`
            );
        } else {
            // Validar límites biológicos
            const catItem = MEASUREMENT_MAP[code];
            if (catItem) {
                if (val < catItem.min_value_mm || val > catItem.max_value_mm) {
                    warnings.push(
                        `Medida "${catItem.name}" (${val} mm) está fuera del rango anatómico típico [${catItem.min_value_mm} - ${catItem.max_value_mm} mm]. Verifique la toma.`
                    );
                }
            }
        }
    }

    // 2. Resolver medidas opcionales con reglas de cálculo si faltan
    for (const code of pkg.optional) {
        if (!resolvedMeasurements[code] || resolvedMeasurements[code] <= 0) {
            const fallback = pkg.calculableFallbacks[code];
            if (fallback) {
                const calculatedVal = fallback.calculate(resolvedMeasurements);
                if (calculatedVal && calculatedVal > 0) {
                    resolvedMeasurements[code] = calculatedVal;
                    calculatedNotes.push(
                        `Medida opcional "${MEASUREMENT_MAP[code]?.name || code}" calculada: ${calculatedVal} mm.`
                    );
                }
            }
        }
    }

    // También resolver cualquier fallback restante (como profundidad_sisa)
    for (const [code, fallback] of Object.entries(pkg.calculableFallbacks)) {
        if (!resolvedMeasurements[code] || resolvedMeasurements[code] <= 0) {
            const val = fallback.calculate(resolvedMeasurements);
            if (val && val > 0) {
                resolvedMeasurements[code] = val;
                calculatedNotes.push(
                    `Parámetro interno "${MEASUREMENT_MAP[code]?.name || code}" estimado: ${val} mm (${fallback.formulaDescription}).`
                );
            }
        }
    }

    const isValid = missingRequired.length === 0;

    return {
        valid: isValid,
        resolvedMeasurements,
        validationResult: {
            valid: isValid,
            errors,
            warnings,
            missingRequiredMeasurements: missingRequired,
            calculatedNotes,
        },
    };
}

export interface TemplateMeasurementDiagnosticItem {
    code: string;
    name: string;
    status: 'real' | 'calculated' | 'estimated' | 'unresolved';
    valueMm: number | null;
    sourceDescription: string;
}

export interface TemplateMeasurementDiagnostic {
    valid: boolean;
    hasEstimated: boolean;
    hasUnresolved: boolean;
    real: TemplateMeasurementDiagnosticItem[];
    calculated: TemplateMeasurementDiagnosticItem[];
    estimated: TemplateMeasurementDiagnosticItem[];
    unresolved: TemplateMeasurementDiagnosticItem[];
    allItems: TemplateMeasurementDiagnosticItem[];
    resolvedMeasurementsMm: Record<string, number>;
}

export function classifyTemplateMeasurements(
    garmentType: GarmentType,
    requiredMeasurements: string[],
    measurementsMm: Record<string, number>,
    referenceProfileMm?: Record<string, number>
): TemplateMeasurementDiagnostic {
    const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
    const real: TemplateMeasurementDiagnosticItem[] = [];
    const calculated: TemplateMeasurementDiagnosticItem[] = [];
    const estimated: TemplateMeasurementDiagnosticItem[] = [];
    const unresolved: TemplateMeasurementDiagnosticItem[] = [];
    const allItems: TemplateMeasurementDiagnosticItem[] = [];
    const resolvedMeasurementsMm: Record<string, number> = { ...measurementsMm };

    for (const code of requiredMeasurements) {
        const name = MEASUREMENT_MAP[code]?.name || code;
        const rawVal = measurementsMm[code];
        const catItem = MEASUREMENT_MAP[code];
        const allowZero = catItem?.scope === 'design_parameter' && catItem?.min_value_mm <= 0;

        // 1. Medida real registrada físicamente
        if (typeof rawVal === 'number' && Number.isFinite(rawVal) && (rawVal > 0 || (allowZero && rawVal === 0))) {
            const item: TemplateMeasurementDiagnosticItem = {
                code,
                name,
                status: 'real',
                valueMm: rawVal,
                sourceDescription: 'Medida corporal real registrada en la sesión de la clienta',
            };
            real.push(item);
            allItems.push(item);
            continue;
        }

        // 2. Medida calculada por fórmula derivada C10
        const fallback = pkg?.calculableFallbacks?.[code];
        const calculatedVal = fallback ? fallback.calculate(measurementsMm) : null;
        if (typeof calculatedVal === 'number' && Number.isFinite(calculatedVal) && calculatedVal > 0) {
            resolvedMeasurementsMm[code] = calculatedVal;
            const item: TemplateMeasurementDiagnosticItem = {
                code,
                name,
                status: 'calculated',
                valueMm: calculatedVal,
                sourceDescription: `Fórmula C10: ${fallback?.formulaDescription || 'Cálculo proporcional derivado'}`,
            };
            calculated.push(item);
            allItems.push(item);
            continue;
        }

        // 3. Medida estimada mediante proporciones del arquetipo anatómico de referencia
        const estVal = referenceProfileMm?.[code];
        if (typeof estVal === 'number' && Number.isFinite(estVal) && estVal > 0) {
            resolvedMeasurementsMm[code] = estVal;
            const item: TemplateMeasurementDiagnosticItem = {
                code,
                name,
                status: 'estimated',
                valueMm: estVal,
                sourceDescription: 'Proporción anatómica normalizada (Perfil T40 Haute Couture)',
            };
            estimated.push(item);
            allItems.push(item);
            continue;
        }

        // 4. Medida obligatoria no resuelta
        const item: TemplateMeasurementDiagnosticItem = {
            code,
            name,
            status: 'unresolved',
            valueMm: null,
            sourceDescription: 'Medida obligatoria no registrada y sin cálculo derivado posible',
        };
        unresolved.push(item);
        allItems.push(item);
    }

    return {
        valid: unresolved.length === 0,
        hasEstimated: estimated.length > 0,
        hasUnresolved: unresolved.length > 0,
        real,
        calculated,
        estimated,
        unresolved,
        allItems,
        resolvedMeasurementsMm,
    };
}

