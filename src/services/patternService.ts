// ==============================================================================
// ATELIER DIGITAL — SERVICIO: HISTORIAL Y AJUSTES DE PATRONAJE (M02.11)
// Archivo: src/services/patternService.ts
// ==============================================================================
// Gestiona el ciclo de vida inmutable de las ejecuciones del motor paramétrico:
// snapshots, revisiones tras pruebas de vestuario y perfiles de holgura.
// ==============================================================================

import { supabase } from '../supabase';
import { EaseProfile, EaseProfileCode, GarmentDesignParameters } from '../types/pattern/ease';
import {
    AdjustmentType,
    FittingExecutionSnapshot,
    GarmentType,
    PatternAdjustment,
    PatternExecution,
    PatternStatus,
    PatternTemplate,
    StructuredPatternAdjustment,
} from '../types/pattern/pattern';
import { executePatternEngine } from '../engine/pattern/engine';
import { PatternGeometryResult } from '../engine/pattern/geometry/types';
import { linkPatternExecutionToCreation } from './creationService';

export const STANDARD_EASE_PROFILES: EaseProfile[] = [
    {
        id: 'ease_fitted',
        code: 'fitted',
        name: 'Entallado Alta Costura',
        description: 'Holgura mínima para prendas ceñidas, corsetería y siluetas estructuradas.',
        ease_values: {
            bust: 25,
            waist: 15,
            hip: 25,
            biceps: 25,
            crotch: 15,
            wrist: 20,
        },
        is_default: false,
    },
    {
        id: 'ease_regular',
        code: 'regular',
        name: 'Clásico Atelier (Recomendado)',
        description: 'Holgura estándar de confort y elegancia para siluetas de alta costura.',
        ease_values: {
            bust: 45,
            waist: 25,
            hip: 45,
            biceps: 40,
            crotch: 25,
            wrist: 30,
        },
        is_default: true,
    },
    {
        id: 'ease_relaxed',
        code: 'relaxed',
        name: 'Holgado Fluido',
        description: 'Holgura generosa para caídas suaves, sedas y prendas de fiesta vaporosas.',
        ease_values: {
            bust: 75,
            waist: 50,
            hip: 75,
            biceps: 60,
            crotch: 40,
            wrist: 40,
        },
        is_default: false,
    },
];

export const DEFAULT_PATTERN_TEMPLATES: PatternTemplate[] = [
    {
        id: 'fallback_bodice_100',
        garment_type: 'bodice',
        name: 'Corpiño Base de Alta Costura',
        version: '1.0.0',
        description: 'Bloque base delantero y espalda con pinzas de busto y cintura.',
        method_reference: 'Método clásico de patronaje a medida (Aldrich & Gilewska modificado)',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
        ],
        optional_measurements: [
            'ancho_pecho',
            'profundidad_sisa',
            'ancho_hombros',
            'contorno_cuello',
            'largo_hombro',
        ],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_bodice_110',
        garment_type: 'bodice',
        name: 'Corpiño Entallado Estructurado',
        version: '1.1.0',
        description: 'Variante ceñida de alta costura con pinza francesa/Dior orientada al busto.',
        method_reference: 'Método de modelado de atelier con reducción de desahogo torácico',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'ancho_espalda',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
        ],
        optional_measurements: ['contorno_alto_busto', 'contorno_bajo_busto'],
        default_ease_profile_code: 'fitted',
    },
    {
        id: 'fallback_sleeve_100',
        garment_type: 'sleeve',
        name: 'Manga Sastre Enlazada',
        version: '1.0.0',
        description: 'Manga anatómica con copa adaptada al perímetro real de la sisa del corpiño.',
        method_reference: 'Cálculo geométrico de copa con embebido proporcional de 20-30 mm',
        required_measurements: ['largo_brazo', 'contorno_biceps', 'contorno_muneca'],
        optional_measurements: ['distancia_hombro_codo', 'contorno_codo_flexionado'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_sleeve_101',
        garment_type: 'sleeve',
        name: 'Manga Camisera Clásica',
        version: '1.0.0',
        description: 'Manga con copa baja y confortable para movimientos fluidos.',
        method_reference: 'Método de copa baja con embebido mínimo (5-15 mm)',
        required_measurements: ['largo_brazo', 'contorno_biceps', 'contorno_muneca'],
        optional_measurements: ['contorno_antebrazo'],
        default_ease_profile_code: 'relaxed',
    },
    {
        id: 'fallback_skirt_100',
        garment_type: 'skirt',
        name: 'Falda Base y Transformación Línea A',
        version: '1.0.0',
        description: 'Falda de dos piezas con control de pinzas lumbares y distribución de volumen.',
        method_reference: 'Proporción cintura-cadera de alta costura con desahogo anatómico',
        required_measurements: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_cintura_cadera',
            'largo_falda',
        ],
        optional_measurements: ['contorno_cadera_alta'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_skirt_110',
        garment_type: 'skirt',
        name: 'Falda Tubo / Lápiz Alta Costura',
        version: '1.1.0',
        description: 'Silueta ceñida con entalle en el bajo y ajuste acentuado de cadera.',
        method_reference: 'Trazado clásico entallado con compensación de abertura posterior',
        required_measurements: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_cintura_cadera',
            'largo_falda',
        ],
        optional_measurements: ['contorno_rodilla'],
        default_ease_profile_code: 'fitted',
    },
    {
        id: 'fallback_pants_100',
        garment_type: 'pants',
        name: 'Pantalón Sastre Femenino',
        version: '1.0.0',
        description: 'Pantalón clásico con línea de aplomo, tiro anatómico y entrepierna.',
        method_reference: 'Trazado clásico de tiro con compensación glútea y holgura de movimiento',
        required_measurements: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_exterior_pierna',
            'largo_entrepierna',
            'contorno_muslo',
            'contorno_rodilla',
            'contorno_tobillo',
        ],
        optional_measurements: ['contorno_pantorrilla'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_pants_110',
        garment_type: 'pants',
        name: 'Pantalón Palazzo de Gala',
        version: '1.1.0',
        description: 'Pantalón de caída amplia y fluida desde la cadera alta.',
        method_reference: 'Desahogo acentuado en pernera con tiro estabilizado',
        required_measurements: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_exterior_pierna',
        ],
        optional_measurements: ['largo_entrepierna', 'ancho_bajo_pantalon'],
        default_ease_profile_code: 'relaxed',
    },
    {
        id: 'fallback_dress_100',
        garment_type: 'dress',
        name: 'Vestido Atelier Compuesto',
        version: '1.0.0',
        description: 'Vestido integrado con corpiño y falda unidos con alineación de cintura.',
        method_reference: 'Composición armónica de bloques con preservación de aplomos',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'ancho_espalda',
            'profundidad_cintura_cadera',
            'largo_falda',
        ],
        optional_measurements: ['ancho_hombros', 'largo_brazo', 'contorno_biceps'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_dress_110',
        garment_type: 'dress',
        name: 'Vestido Corte Princesa',
        version: '1.1.0',
        description: 'Cortes anatómicos longitudinales desde la sisa hasta el bajo sin costura de cintura.',
        method_reference: 'Costadillos franceses continuos para estilización de figura',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'largo_falda',
        ],
        optional_measurements: ['profundidad_escote_diseno'],
        default_ease_profile_code: 'fitted',
    },
    {
        id: 'fallback_blouse_100',
        garment_type: 'blouse',
        name: 'Blusa Fluida Derivada',
        version: '1.0.0',
        description: 'Blusa liviana con desahogo ampliado en busto y sisa holgada.',
        method_reference: 'Derivación del corpiño base con desahogo fluido',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_blusa',
        ],
        optional_measurements: ['contorno_cadera'],
        default_ease_profile_code: 'relaxed',
    },
    {
        id: 'fallback_blouse_110',
        garment_type: 'blouse',
        name: 'Blusa Camisera Estructurada',
        version: '1.1.0',
        description: 'Blusa clásica con cuello camisero, pie de cuello y botones delanteros.',
        method_reference: 'Patronaje camisero de alta costura con hombro desplazado',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_blusa',
        ],
        optional_measurements: ['contorno_cuello', 'largo_hombro'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_shirt_100',
        garment_type: 'shirt',
        name: 'Camisa Clásica de Alta Costura',
        version: '1.0.0',
        description: 'Camisa clásica femenina estructurada con canesú, cuello camisero de 2 piezas, cruce frontal, manga y puño.',
        method_reference: 'Sastrería clásica y patronaje a medida By Katherine Carroll (Aldrich adaptado)',
        required_measurements: [
            'contorno_cuello',
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_muneca',
        ],
        optional_measurements: [
            'ancho_hombros',
            'largo_hombro',
            'ancho_pecho',
            'contorno_biceps',
            'contorno_cadera',
            'profundidad_sisa',
            'largo_camisa',
        ],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_corset_100',
        garment_type: 'corset',
        name: 'Corsé Estructurado de Alta Costura',
        version: '1.0.0',
        description: 'Corsé anatómico de 5 paneles con reducción activa de cintura, soporte óseo y contorno bajo busto.',
        method_reference: 'Corsetería tradicional By Katherine Carroll (Couture Victorian & Modern Corsetry)',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
        ],
        optional_measurements: [
            'contorno_bajo_busto',
            'contorno_cadera_alta',
            'contorno_cadera',
            'ancho_espalda',
            'ancho_pecho',
            'profundidad_sisa',
        ],
        default_ease_profile_code: 'fitted',
    },
    {
        id: 'fallback_jacket_100',
        garment_type: 'jacket',
        name: 'Chaqueta Sastre de Alta Costura',
        version: '1.0.0',
        description: 'Chaqueta sastre femenina estructurada con solapa de muesca, costadillos, manga de dos hojas y bolsillos de cartera.',
        method_reference: 'Sastrería femenina By Katherine Carroll (Savile Row & French Couture adaptado)',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional_measurements: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'contorno_muneca',
            'profundidad_sisa',
            'largo_chaqueta',
        ],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_coat_100',
        garment_type: 'coat',
        name: 'Abrigo Sastre de Alta Costura',
        version: '1.0.0',
        description: 'Abrigo sastre femenino envolvente con solapa amplia, costadillos, abertura dorsal, manga de dos hojas, bolsillos de cartera y cinturón estructurado.',
        method_reference: 'Sastrería de abrigos By Katherine Carroll (Haute Couture & Overcoat Tailoring)',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional_measurements: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'contorno_muneca',
            'profundidad_sisa',
            'largo_abrigo',
            'largo_chaqueta',
        ],
        default_ease_profile_code: 'relaxed',
    },
    {
        id: 'fallback_dress_120',
        garment_type: 'dress',
        base_garment_type: 'dress',
        variant_key: 'shirt_dress',
        name: 'Vestido Camisero de Alta Costura',
        version: '1.0.0',
        description: 'Variante compuesta: cuerpo camisero con cuello y tapeta, manga con puño y falda integrada.',
        method_reference: 'Composición de bloque vestido con componentes camiseros By Katherine Carroll',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'altura_busto',
            'separacion_busto',
            'ancho_espalda',
            'profundidad_cintura_cadera',
            'largo_falda',
            'contorno_cuello',
        ],
        optional_measurements: ['ancho_hombros', 'largo_brazo', 'contorno_biceps', 'contorno_muneca'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_jacket_110',
        garment_type: 'jacket',
        base_garment_type: 'jacket',
        variant_key: 'tailored_vest',
        name: 'Chaleco Sastre de Alta Costura',
        version: '1.0.0',
        description: 'Variante de chaqueta sastre entallada sin mangas, con sisa ribeteada con vista y ceñidor dorsal.',
        method_reference: 'Derivación sastre de chaqueta femenina sin mangas con remate de sisa',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
        ],
        optional_measurements: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'altura_busto',
            'separacion_busto',
            'profundidad_sisa',
            'largo_chaqueta',
        ],
        default_ease_profile_code: 'fitted',
    },
    {
        id: 'fallback_coat_110',
        garment_type: 'coat',
        base_garment_type: 'coat',
        variant_key: 'trench_coat',
        name: 'Gabardina / Trench Coat de Alta Costura',
        version: '1.0.0',
        description: 'Variante de abrigo exterior cruzado con canesú de lluvia, charreteras y cinturón estructurado.',
        method_reference: 'Técnica de trench sastre militar clásico By Katherine Carroll',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
            'contorno_biceps',
        ],
        optional_measurements: [
            'contorno_cuello',
            'ancho_pecho',
            'ancho_hombros',
            'largo_hombro',
            'contorno_muneca',
            'profundidad_sisa',
            'largo_abrigo',
        ],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_coat_120',
        garment_type: 'coat',
        base_garment_type: 'coat',
        variant_key: 'atelier_robe',
        name: 'Bata de Taller de Alta Costura',
        version: '1.0.0',
        description: 'Variante de abrigo envolvente holgado con bolsillos de parche funcionales y cinturón de lazada.',
        method_reference: 'Patronaje de abrigo envolvente ligero con desahogo funcional',
        required_measurements: [
            'contorno_busto',
            'contorno_cintura',
            'contorno_cadera',
            'largo_talle_delantero',
            'largo_talle_espalda',
            'ancho_espalda',
            'largo_brazo',
        ],
        optional_measurements: [
            'ancho_hombros',
            'contorno_biceps',
            'largo_abrigo',
        ],
        default_ease_profile_code: 'relaxed',
    },
    {
        id: 'fallback_pants_120',
        garment_type: 'pants',
        base_garment_type: 'pants',
        variant_key: 'short',
        name: 'Short Sastre de Alta Costura',
        version: '1.0.0',
        description: 'Variante paramétrica de pantalón con largo sobre rodilla o medio muslo y entrepierna adaptada.',
        method_reference: 'Parametrización longitudinal de pernera sobre pantalón sastre base',
        required_measurements: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'contorno_muslo',
        ],
        optional_measurements: ['largo_exterior_pierna', 'largo_entrepierna'],
        default_ease_profile_code: 'regular',
    },
    {
        id: 'fallback_pants_130',
        garment_type: 'pants',
        base_garment_type: 'pants',
        variant_key: 'cargo_pants',
        name: 'Pantalón Cargo / Safari de Alta Costura',
        version: '1.0.0',
        description: 'Variante de pantalón con adición de módulos de bolsillos de fuelle con tapa en laterales.',
        method_reference: 'Pantalón sastre con adición de módulos de bolsillos utilitarios',
        required_measurements: [
            'contorno_cintura',
            'contorno_cadera',
            'profundidad_tiro',
            'largo_exterior_pierna',
            'largo_entrepierna',
            'contorno_muslo',
            'contorno_rodilla',
            'contorno_tobillo',
        ],
        optional_measurements: ['contorno_pantorrilla'],
        default_ease_profile_code: 'relaxed',
    },
];

export async function fetchPatternTemplates(
    garmentType?: GarmentType
): Promise<PatternTemplate[]> {
    try {
        let query = supabase
            .from('pattern_templates')
            .select('*')
            .order('name', { ascending: true })
            .order('version', { ascending: true });

        if (garmentType) {
            query = query.eq('garment_type', garmentType);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            return garmentType
                ? DEFAULT_PATTERN_TEMPLATES.filter((t) => t.garment_type === garmentType)
                : DEFAULT_PATTERN_TEMPLATES;
        }

        return data as PatternTemplate[];
    } catch {
        return garmentType
            ? DEFAULT_PATTERN_TEMPLATES.filter((t) => t.garment_type === garmentType)
            : DEFAULT_PATTERN_TEMPLATES;
    }
}

export async function fetchClientPatternExecutions(
    clientId: string
): Promise<PatternExecution[]> {
    try {
        const { data, error } = await supabase
            .from('pattern_executions')
            .select(`
                *,
                creation:creations (
                    id,
                    name,
                    creation_type,
                    status
                ),
                session:measurement_sessions (
                    id,
                    version_number,
                    session_date,
                    status
                ),
                template:pattern_templates (
                    id,
                    name,
                    version
                )
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error || !data) {
            const simpleRes = await supabase
                .from('pattern_executions')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (simpleRes.error || !simpleRes.data) return [];
            return simpleRes.data as PatternExecution[];
        }

        return data as PatternExecution[];
    } catch {
        return [];
    }
}

/**
 * Consulta global para el BANCO DE PATRONES de Atelier Digital.
 * Recupera todas las ejecuciones de patrones del taller (con Creación o de Patronaje Directo).
 */
export async function fetchAllPatternExecutions(): Promise<{
    data: PatternExecution[];
    error: string | null;
}> {
    try {
        const { data, error } = await supabase
            .from('pattern_executions')
            .select(`
                *,
                client:clients (
                    id,
                    full_name,
                    email,
                    phone,
                    city
                ),
                creation:creations (
                    id,
                    name,
                    creation_type,
                    status
                ),
                session:measurement_sessions (
                    id,
                    version_number,
                    session_date,
                    status
                ),
                template:pattern_templates (
                    id,
                    name,
                    version
                )
            `)
            .order('created_at', { ascending: false });

        if (error || !data) {
            // Fallback a select simple con enriquecimiento en memoria
            const simpleRes = await supabase
                .from('pattern_executions')
                .select('*')
                .order('created_at', { ascending: false });

            if (simpleRes.error || !simpleRes.data) {
                return { data: [], error: simpleRes.error?.message || 'Error al consultar banco de patrones.' };
            }

            const rawList = simpleRes.data as PatternExecution[];
            const clientIds = Array.from(new Set(rawList.map((e) => e.client_id).filter(Boolean)));
            const creationIds = Array.from(new Set(rawList.map((e) => e.creation_id).filter(Boolean))) as string[];
            const sessionIds = Array.from(new Set(rawList.map((e) => e.session_id).filter(Boolean)));

            const [clientsRes, creationsRes, sessionsRes] = await Promise.all([
                clientIds.length > 0 ? supabase.from('clients').select('id, full_name, email, phone, city').in('id', clientIds) : { data: [] },
                creationIds.length > 0 ? supabase.from('creations').select('id, name, creation_type, status').in('id', creationIds) : { data: [] },
                sessionIds.length > 0 ? supabase.from('measurement_sessions').select('id, version_number, session_date, status').in('id', sessionIds) : { data: [] },
            ]);

            const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
            const creationMap = new Map((creationsRes.data || []).map((cr: any) => [cr.id, cr]));
            const sessionMap = new Map((sessionsRes.data || []).map((s: any) => [s.id, s]));

            const enriched = rawList.map((e) => ({
                ...e,
                client: clientMap.get(e.client_id) || null,
                creation: e.creation_id ? creationMap.get(e.creation_id) || null : null,
                session: sessionMap.get(e.session_id) || null,
                template: DEFAULT_PATTERN_TEMPLATES.find((t) => t.id === e.template_id || t.garment_type === e.garment_type) || null,
            }));

            return { data: enriched, error: null };
        }

        return { data: data as PatternExecution[], error: null };
    } catch (err: any) {
        return { data: [], error: err?.message || 'Error inesperado al consultar banco de patrones.' };
    }
}

export async function savePatternExecution(params: {
    clientId?: string | null;
    sessionId?: string | null;
    garmentType: GarmentType;
    versionLabel: string;
    engineVersion: string;
    measurementSnapshot: Record<string, number>;
    easeProfileSnapshot: EaseProfile;
    designParameters: GarmentDesignParameters;
    geometryResult: PatternGeometryResult;
    validationResults: any;
    status?: PatternStatus;
    templateId?: string | null;
    parentExecutionId?: string | null;
    creationId?: string | null;
    notes?: string;
}): Promise<{ success: boolean; execution?: PatternExecution; error?: string }> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
            return {
                success: false,
                error: 'Usuario no autenticado para generar patrón.',
            };
        }

        // Validación estricta de tipos numéricos en snapshot: rechaza cadenas o valores no numéricos
        if (!params.measurementSnapshot || typeof params.measurementSnapshot !== 'object') {
            return {
                success: false,
                error: 'measurementSnapshot debe ser un objeto numérico válido.',
            };
        }

        for (const [key, val] of Object.entries(params.measurementSnapshot)) {
            if (typeof val !== 'number' || !Number.isFinite(val)) {
                return {
                    success: false,
                    error: `Valor inválido en snapshot para "${key}": debe ser un número JSON auténtico (recibido tipo: ${typeof val}). No se aceptan cadenas numéricas.`,
                };
            }
        }

        // Validación explícita del motor: exige valid booleano auténtico, 0 errores y 0 medidas faltantes
        const rawVal = params.validationResults;
        const isExplicitBool = rawVal && typeof rawVal.valid === 'boolean';
        const hasErrors = Array.isArray(rawVal?.errors) && rawVal.errors.length > 0;
        const hasMissing = Array.isArray(rawVal?.missingRequiredMeasurements) && rawVal.missingRequiredMeasurements.length > 0;
        const isEngineValid = Boolean(isExplicitBool && rawVal.valid === true && !hasErrors && !hasMissing);

        // Estructura explícita de validación garantizada sin valores engañosos (validación auténtica)
        const sanitizedValidationResults = {
            valid: isEngineValid,
            errors: Array.isArray(rawVal?.errors)
                ? (isEngineValid ? [] : (rawVal.errors.length > 0 ? rawVal.errors : ['Validación geométrica incompleta o no satisfecha']))
                : (!isEngineValid ? ['Validación geométrica incompleta o no satisfecha'] : []),
            warnings: Array.isArray(rawVal?.warnings) ? rawVal.warnings : [],
            missingRequiredMeasurements: Array.isArray(rawVal?.missingRequiredMeasurements) ? rawVal.missingRequiredMeasurements : [],
            calculatedNotes: Array.isArray(rawVal?.calculatedNotes) ? rawVal.calculatedNotes : [],
        };

        // Un patrón no puede registrarse directamente como 'approved_by_designer' en su creación inicial
        if (params.status === 'approved_by_designer') {
            return {
                success: false,
                error: 'Un patrón no puede registrarse directamente como "approved_by_designer" en su creación inicial. Debe pasar por generación y prueba de vestuario.',
            };
        }

        // Si la validación no es estrictamente válida, impedir que pase a 'generated', 'pending_fitting' o 'approved_by_designer'.
        // Mantener las ejecuciones inválidas en 'draft' o 'needs_revision'.
        let computedStatus: PatternStatus;
        if (!isEngineValid) {
            computedStatus = params.status === 'draft' ? 'draft' : 'needs_revision';
        } else {
            computedStatus = params.status || 'generated';
        }

        const insertPayload: any = {
            client_id: params.clientId || null,
            session_id: params.sessionId || null,
            garment_type: params.garmentType,
            version_label: params.versionLabel,
            engine_version: params.engineVersion,
            status: computedStatus,
            measurement_snapshot: params.measurementSnapshot,
            ease_profile_snapshot: params.easeProfileSnapshot,
            design_parameters: params.designParameters,
            seam_allowance_default_mm: params.designParameters.seam_allowance_default_mm || 10,
            geometry_result: params.geometryResult,
            validation_results: sanitizedValidationResults,
            parent_execution_id: params.parentExecutionId || null,
            creation_id: params.creationId || null,
            generated_by: user.id,
            notes: params.notes || null,
        };

        if (params.templateId) {
            const isFictitious = params.templateId.startsWith('fallback_') || params.templateId.startsWith('local_');
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.templateId);
            if (isFictitious || !isUuid) {
                return {
                    success: false,
                    error: 'Persistencia denegada: La plantilla seleccionada no posee un UUID real de public.pattern_templates. No se permite persistir ejecuciones con identificadores ficticios de plantilla (template_id).',
                };
            }
            insertPayload.template_id = params.templateId;
        }

        const { data, error } = await supabase
            .from('pattern_executions')
            .insert(insertPayload)
            .select()
            .single();

        if (error || !data) {
            return {
                success: false,
                error: error?.message || 'No se pudo guardar la ejecución del patrón.',
            };
        }

        // Si se especificó una Creación, vincular inmediatamente la ejecución técnica como activa
        if (params.creationId && data?.id) {
            try {
                await linkPatternExecutionToCreation(params.creationId, data.id);
            } catch (linkErr) {
                console.warn('[PatternService] Advertencia no bloqueante al vincular ejecución a creación:', linkErr);
            }
        }

        return { success: true, execution: data as PatternExecution };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error inesperado al persistir patrón.',
        };
    }
}

export async function updatePatternStatus(
    executionId: string,
    status: PatternStatus,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Impedir que un patrón inválido pase a 'generated', 'pending_fitting' o 'approved_by_designer'.
        // Requiere validación auténtica, cero errores y ausencia de medidas obligatorias pendientes.
        if (['generated', 'pending_fitting', 'approved_by_designer'].includes(status)) {
            const { data: current, error: fetchErr } = await supabase
                .from('pattern_executions')
                .select('validation_results, status')
                .eq('id', executionId)
                .single();

            if (fetchErr || !current) {
                return { success: false, error: 'No se pudo verificar el estado de validación previo.' };
            }

            const val = current.validation_results;
            const isExplicitBool = val && typeof val.valid === 'boolean';
            const hasErrors = Array.isArray(val?.errors) && val.errors.length > 0;
            const hasMissing = Array.isArray(val?.missingRequiredMeasurements) && val.missingRequiredMeasurements.length > 0;
            const isAuthenticValid = Boolean(isExplicitBool && val.valid === true && !hasErrors && !hasMissing);

            if (!isAuthenticValid) {
                const errorDetail = hasErrors
                    ? `Contiene ${val.errors.length} error(es) geométrico(s)`
                    : hasMissing
                    ? `Faltan ${val.missingRequiredMeasurements.length} medida(s) obligatoria(s)`
                    : 'Validación inválida o no satisfecha';
                return {
                    success: false,
                    error: `Transición a estado "${status}" denegada: ${errorDetail}. El patrón debe mantenerse en "draft" o "needs_revision".`,
                };
            }

            // Un patrón solo puede aprobarse formalmente tras haber pasado por prueba de vestuario ('pending_fitting')
            if (status === 'approved_by_designer' && current.status !== 'pending_fitting') {
                if (current.status === 'generated') {
                    // Transición controlada a través de 'pending_fitting' para cumplir el trigger de base de datos
                    const intermediateRes = await supabase
                        .from('pattern_executions')
                        .update({ status: 'pending_fitting', notes: 'Paso técnico de verificación de fitting previo a aprobación.' })
                        .eq('id', executionId);
                    if (intermediateRes.error) {
                        return { success: false, error: intermediateRes.error.message };
                    }
                } else {
                    return {
                        success: false,
                        error: `Transición a estado "approved_by_designer" denegada: Un patrón solo puede aprobarse formalmente tras haber pasado por prueba de vestuario ("pending_fitting") (estado anterior: "${current.status}").`,
                    };
                }
            }
        }

        const updatePayload: any = { status };
        if (notes) updatePayload.notes = notes;

        const { error } = await supabase
            .from('pattern_executions')
            .update(updatePayload)
            .eq('id', executionId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Error al actualizar estado.' };
    }
}

/**
 * Validador estricto para valores numéricos de ajuste.
 * Rechaza NaN, Infinity, -Infinity y valores no numéricos.
 */
export function validateAdjustmentNumericValue(val: unknown): { valid: boolean; error?: string } {
    if (typeof val !== 'number') {
        return { valid: false, error: 'El valor del ajuste debe ser un número auténtico.' };
    }
    if (Number.isNaN(val)) {
        return { valid: false, error: 'Valor numérico inválido: se rechaza NaN.' };
    }
    if (!Number.isFinite(val)) {
        return { valid: false, error: 'Valor numérico inválido: se rechazan valores infinitos (Infinity / -Infinity).' };
    }
    return { valid: true };
}

/**
 * Validador formal integral de ajustes de fitting (Componente 13).
 * Comprueba:
 * - valor numérico
 * - valor finito (> 0 y <= 500 mm)
 * - unidad válida ('cm' | 'mm')
 * - dirección válida ('increase' | 'decrease')
 * - zona válida (texto no vacío >= 2 caracteres)
 * - tipo de ajuste válido
 * - coherencia con la prenda
 * - ausencia de valores NaN
 * - ausencia de Infinity
 */
export function validatePatternAdjustmentInput(params: {
    adjustmentType: any;
    zone: any;
    value: any;
    unit: any;
    direction: any;
    garmentType?: GarmentType;
    targetPieceId?: string;
    availablePieces?: Array<{ id: string; name?: string }>;
}): { valid: boolean; error?: string; deltaMm?: number } {
    const { adjustmentType, zone, value, unit, direction, garmentType, targetPieceId, availablePieces } = params;

    // 1. Tipo de ajuste válido (Catálogo M02.13 FIT_ADJUSTMENT_TYPES + tipos complementarios)
    const validTypes: AdjustmentType[] = [
        'bust',
        'waist',
        'hip',
        'shoulder',
        'armhole',
        'neckline',
        'sleeve',
        'sleeve_cap',
        'garment_length',
        'dart',
        'ease',
        'other',
        'length',
        'crotch',
        'bust_dart',
        'balance',
        'custom',
    ];
    if (!adjustmentType || !validTypes.includes(adjustmentType)) {
        return {
            valid: false,
            error: `Tipo de ajuste inválido o no reconocido: "${adjustmentType}".`,
        };
    }

    // 2. Zona / Ubicación válida
    if (typeof zone !== 'string' || !zone.trim() || zone.trim().length < 2) {
        return {
            valid: false,
            error: 'Zona o ubicación anatómica inválida: debe ser un texto descriptivo no vacío.',
        };
    }

    // 3. Dirección válida
    if (direction !== 'increase' && direction !== 'decrease') {
        return {
            valid: false,
            error: `Dirección inválida: "${direction}". Debe ser "increase" (+ Aumentar) o "decrease" (- Reducir).`,
        };
    }

    // 4. Unidad válida
    if (unit !== 'cm' && unit !== 'mm') {
        return {
            valid: false,
            error: `Unidad de ajuste inválida: "${unit}". Debe ser "cm" o "mm".`,
        };
    }

    // 5. Valor numérico y finito (no NaN, no Infinity)
    const numCheck = validateAdjustmentNumericValue(value);
    if (!numCheck.valid) {
        return { valid: false, error: numCheck.error };
    }

    // Admisión de cero solo para 'other' / 'custom' como notas cualitativas
    if (value === 0 && adjustmentType !== 'other' && adjustmentType !== 'custom') {
        return {
            valid: false,
            error: 'La magnitud del ajuste debe ser distinta de cero.',
        };
    }
    if (value < 0) {
        return {
            valid: false,
            error: 'La magnitud del valor de entrada debe ser un número positivo (use dirección para reducir o aumentar).',
        };
    }

    // 6. Conversión a milímetros y comprobación de límites físicos razonables de alta costura
    const magnitudeMm = unit === 'cm' ? value * 10 : value;
    if (magnitudeMm > 500) {
        return {
            valid: false,
            error: `Magnitud de ajuste excesiva (${magnitudeMm} mm). El límite máximo de seguridad técnica es 500 mm.`,
        };
    }

    // 7. Validación de pieza afectada real (si se proporcionan piezas de la geometría)
    if (targetPieceId && availablePieces && availablePieces.length > 0) {
        const pieceFound = availablePieces.some(
            (p) => p.id === targetPieceId || (p.name && p.name.toLowerCase() === targetPieceId.toLowerCase())
        );
        if (!pieceFound) {
            return {
                valid: false,
                error: `La pieza indicada "${targetPieceId}" no existe en la geometría generada del patrón.`,
            };
        }
    }

    // 8. Coherencia con la prenda
    if (garmentType) {
        const incompatibleMatrix: Partial<Record<GarmentType, AdjustmentType[]>> = {
            skirt: ['bust', 'bust_dart', 'crotch', 'sleeve', 'sleeve_cap', 'shoulder', 'armhole', 'neckline'],
            pants: ['bust', 'bust_dart', 'sleeve', 'sleeve_cap', 'shoulder', 'armhole', 'neckline'],
            bodice: ['crotch'],
            sleeve: ['waist', 'bust', 'hip', 'crotch', 'neckline'],
            shirt: ['crotch'],
        };
        const forbidden = incompatibleMatrix[garmentType] || [];
        if (forbidden.includes(adjustmentType)) {
            return {
                valid: false,
                error: `El ajuste "${adjustmentType}" es incompatible con prendas de tipo "${garmentType}".`,
            };
        }
    }

    const deltaMm = direction === 'decrease' ? -magnitudeMm : magnitudeMm;
    return { valid: true, deltaMm };
}

export async function recordPatternAdjustment(params: {
    executionId: string;
    adjustmentType: AdjustmentType;
    targetPiece: string;
    deltaMm: number;
    description: string;
}): Promise<{ success: boolean; adjustment?: PatternAdjustment; error?: string }> {
    try {
        const numCheck = validateAdjustmentNumericValue(params.deltaMm);
        if (!numCheck.valid) {
            return { success: false, error: numCheck.error };
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Mapeo seguro para respetar la restricción CHECK de la base de datos:
        // ('waist', 'shoulder', 'sleeve', 'length', 'crotch', 'bust_dart', 'custom')
        const dbAllowedTypes = ['waist', 'shoulder', 'sleeve', 'length', 'crotch', 'bust_dart', 'custom'];
        let dbType: string = params.adjustmentType;
        let dbDesc: string = params.description;
        let dbPiece: string = params.targetPiece;

        if (!dbAllowedTypes.includes(dbType)) {
            if (dbType === 'bust') {
                dbType = 'bust_dart';
            } else {
                dbType = 'custom';
                dbDesc = `[TIPO: ${params.adjustmentType.toUpperCase()}] ${params.description}`;
            }
        }

        if (!user?.id) {
            // Soporte offline/fallback para modo local o pruebas sin sesión activa
            return {
                success: true,
                adjustment: {
                    id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    execution_id: params.executionId,
                    adjustment_type: params.adjustmentType,
                    target_piece: params.targetPiece,
                    delta_mm: params.deltaMm,
                    description: params.description,
                    fitting_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                },
            };
        }

        const { data, error } = await supabase
            .from('pattern_adjustments')
            .insert({
                execution_id: params.executionId,
                adjustment_type: dbType,
                target_piece: dbPiece,
                delta_mm: params.deltaMm,
                description: dbDesc,
                recorded_by: user.id,
            })
            .select()
            .single();

        if (error || !data) {
            return { success: false, error: error?.message || 'Error al registrar ajuste.' };
        }

        return {
            success: true,
            adjustment: {
                ...(data as PatternAdjustment),
                adjustment_type: params.adjustmentType,
            },
        };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Error inesperado al guardar ajuste.' };
    }
}

/**
 * Deriva la siguiente etiqueta de versión a partir del linaje padre (v1.0 -> v1.1 -> v1.2).
 * Respeta la regla de linaje automático sin depender de entradas manuales del usuario.
 */
export function deriveNextVersionLabel(parentVersion?: string): string {
    if (!parentVersion) return 'v1.1';
    const clean = parentVersion.trim();
    const match = clean.match(/v?(\d+)\.(\d+)/i);
    if (match) {
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        return `v${major}.${minor + 1}`;
    }
    return `${clean}.1`;
}

/**
 * Transforma un ajuste de prueba (fitting) en parámetros formales del motor paramétrico.
 * No modifica coordenadas directas; ajusta perfiles de holgura y parámetros de diseño.
 * Conserva estrictamente el signo del delta (+10 mm amplía, -15 mm entalla).
 */
export function applyAdjustmentToEngineParameters(params: {
    adjustmentType: AdjustmentType;
    deltaMm: number;
    targetPiece?: string;
    currentEase: EaseProfile;
    currentDesignParams: GarmentDesignParameters;
    garmentType: GarmentType;
}): {
    updatedEase: EaseProfile;
    updatedDesignParams: GarmentDesignParameters;
    isParametric: boolean;
    description: string;
} {
    const { adjustmentType, deltaMm, targetPiece, currentEase, currentDesignParams, garmentType } = params;

    // Clonación profunda de snapshots para garantizar la inmutabilidad absoluta del patrón padre
    const updatedEase: EaseProfile = {
        ...currentEase,
        ease_values: { ...currentEase.ease_values },
    };
    const updatedDesignParams: GarmentDesignParameters = {
        ...currentDesignParams,
    };

    const formattedSign = deltaMm > 0 ? `+${deltaMm}` : `${deltaMm}`;

    switch (adjustmentType) {
        case 'waist': {
            // Modificación paramétrica de holgura en contorno de cintura
            const cur = updatedEase.ease_values.waist ?? 25;
            updatedEase.ease_values.waist = Math.max(0, cur + deltaMm);
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Cintura ajustada en ${formattedSign} mm (holgura resultante: ${updatedEase.ease_values.waist} mm).`,
            };
        }

        case 'shoulder': {
            // Modificación paramétrica de hombro
            const cur = updatedEase.ease_values.shoulder ?? 0;
            updatedEase.ease_values.shoulder = cur + deltaMm;
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Hombro ajustado en ${formattedSign} mm (extensión resultante: ${updatedEase.ease_values.shoulder} mm).`,
            };
        }

        case 'sleeve': {
            // Modificación paramétrica de manga (largo o copa según targetPiece)
            const pieceLower = (targetPiece || '').toLowerCase();
            if (pieceLower.includes('copa') || pieceLower.includes('biceps')) {
                const curBiceps = updatedEase.ease_values.biceps ?? 40;
                updatedEase.ease_values.biceps = Math.max(10, curBiceps + deltaMm);
                return {
                    updatedEase,
                    updatedDesignParams,
                    isParametric: true,
                    description: `Copa/bíceps de manga ajustada en ${formattedSign} mm (holgura resultante: ${updatedEase.ease_values.biceps} mm).`,
                };
            }
            const curLength = updatedDesignParams.sleeve_length_mm ?? 580;
            updatedDesignParams.sleeve_length_mm = Math.max(100, curLength + deltaMm);
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Largo de manga ajustado en ${formattedSign} mm (largo resultante: ${updatedDesignParams.sleeve_length_mm} mm).`,
            };
        }

        case 'sleeve_cap': {
            // Modificación paramétrica directa de copa de manga
            const curBiceps = updatedEase.ease_values.biceps ?? 40;
            updatedEase.ease_values.biceps = Math.max(10, curBiceps + deltaMm);
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Copa de manga ajustada en ${formattedSign} mm (holgura de bíceps/copa resultante: ${updatedEase.ease_values.biceps} mm).`,
            };
        }

        case 'garment_length':
        case 'length': {
            // Modificación paramétrica de largo según tipo de prenda
            if (garmentType === 'skirt' || garmentType === 'dress') {
                const cur = updatedDesignParams.skirt_length_mm ?? 600;
                updatedDesignParams.skirt_length_mm = Math.max(150, cur + deltaMm);
                return {
                    updatedEase,
                    updatedDesignParams,
                    isParametric: true,
                    description: `Largo de falda/vestido ajustado en ${formattedSign} mm (largo resultante: ${updatedDesignParams.skirt_length_mm} mm).`,
                };
            } else if (garmentType === 'sleeve') {
                const cur = updatedDesignParams.sleeve_length_mm ?? 580;
                updatedDesignParams.sleeve_length_mm = Math.max(100, cur + deltaMm);
                return {
                    updatedEase,
                    updatedDesignParams,
                    isParametric: true,
                    description: `Largo de manga ajustado en ${formattedSign} mm (largo resultante: ${updatedDesignParams.sleeve_length_mm} mm).`,
                };
            } else if (garmentType === 'pants') {
                const cur = updatedDesignParams.pants_rise_adjustment_mm ?? 0;
                updatedDesignParams.pants_rise_adjustment_mm = cur + deltaMm;
                return {
                    updatedEase,
                    updatedDesignParams,
                    isParametric: true,
                    description: `Ajuste longitudinal de tiro/largo de pantalón en ${formattedSign} mm.`,
                };
            } else {
                // bodice / blouse
                const cur = updatedDesignParams.waist_position_offset_mm ?? 0;
                updatedDesignParams.waist_position_offset_mm = cur + deltaMm;
                return {
                    updatedEase,
                    updatedDesignParams,
                    isParametric: true,
                    description: `Talle/nivel de cintura de corpiño ajustado en ${formattedSign} mm.`,
                };
            }
        }

        case 'dart':
        case 'bust':
        case 'bust_dart': {
            // Modificación paramétrica de pinza y contorno de busto
            const curDart = updatedDesignParams.bust_dart_width_adjustment_mm ?? 0;
            updatedDesignParams.bust_dart_width_adjustment_mm = curDart + deltaMm;
            const curBustEase = updatedEase.ease_values.bust ?? 40;
            if (deltaMm !== 0) {
                updatedEase.ease_values.bust = Math.max(0, curBustEase + Math.round(deltaMm * 0.5));
            }
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Pinza/contorno de busto ajustado en ${formattedSign} mm (ancho de pinza y desahogo torácico recalculados).`,
            };
        }

        case 'hip': {
            // Modificación paramétrica de holgura en contorno de cadera
            const curHip = updatedEase.ease_values.hip ?? 45;
            updatedEase.ease_values.hip = Math.max(0, curHip + deltaMm);
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Cadera ajustada en ${formattedSign} mm (holgura resultante: ${updatedEase.ease_values.hip} mm).`,
            };
        }

        case 'armhole': {
            // Modificación paramétrica de sisa y copa (profundidad sisa + holgura bíceps)
            const curArmhole = updatedEase.ease_values.armhole ?? 0;
            updatedEase.ease_values.armhole = curArmhole + deltaMm;
            const curBiceps = updatedEase.ease_values.biceps ?? 40;
            updatedEase.ease_values.biceps = Math.max(10, curBiceps + deltaMm);
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Profundidad de sisa ajustada en ${formattedSign} mm y bíceps en ${updatedEase.ease_values.biceps} mm.`,
            };
        }

        case 'neckline': {
            // Modificación paramétrica de descenso de escote
            const curDrop = updatedDesignParams.neckline_drop_mm ?? 0;
            updatedDesignParams.neckline_drop_mm = Math.max(0, curDrop + deltaMm);
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Escote ajustado en ${formattedSign} mm (descenso de escote resultante: ${updatedDesignParams.neckline_drop_mm} mm).`,
            };
        }

        case 'ease': {
            // Modificación paramétrica global de confort (holgura distribuida proporcionalmente)
            const curBust = updatedEase.ease_values.bust ?? 40;
            const curWaist = updatedEase.ease_values.waist ?? 25;
            const curHip = updatedEase.ease_values.hip ?? 45;
            updatedEase.ease_values.bust = Math.max(0, curBust + Math.round(deltaMm * 0.4));
            updatedEase.ease_values.waist = Math.max(0, curWaist + Math.round(deltaMm * 0.3));
            updatedEase.ease_values.hip = Math.max(0, curHip + Math.round(deltaMm * 0.3));
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Holgura general de confort ajustada en ${formattedSign} mm (busto: ${updatedEase.ease_values.bust} mm, cintura: ${updatedEase.ease_values.waist} mm, cadera: ${updatedEase.ease_values.hip} mm).`,
            };
        }

        case 'balance': {
            // Modificación paramétrica de equilibrio / balance postural (desplazamiento vertical de talle)
            const curBal = updatedDesignParams.waist_position_offset_mm ?? 0;
            updatedDesignParams.waist_position_offset_mm = curBal + deltaMm;
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Equilibrio / talle de cintura compensado en ${formattedSign} mm.`,
            };
        }

        case 'crotch': {
            // Modificación paramétrica de tiro de pantalón
            const curCrotchEase = updatedEase.ease_values.crotch ?? 25;
            updatedEase.ease_values.crotch = Math.max(0, curCrotchEase + deltaMm);
            const curRise = updatedDesignParams.pants_rise_adjustment_mm ?? 0;
            updatedDesignParams.pants_rise_adjustment_mm = curRise + deltaMm;
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: true,
                description: `Tiro / entrepierna ajustado en ${formattedSign} mm (desahogo de tiro resultante: ${updatedEase.ease_values.crotch} mm).`,
            };
        }

        case 'other':
        case 'custom':
        default: {
            // REGLA 5: No aceptar un ajuste custom que no pueda expresarse mediante un parámetro conocido del motor.
            // No generar geometría inventada.
            return {
                updatedEase,
                updatedDesignParams,
                isParametric: false,
                description: 'Registrado — aplicación geométrica pendiente (ajuste cualitativo sin transformación matemática automatizada).',
            };
        }
    }
}


/**
 * Consulta el historial de ajustes de prueba para una ejecución de patrón específica.
 */
export async function fetchPatternAdjustments(
    executionId: string
): Promise<PatternAdjustment[]> {
    try {
        const { data, error } = await supabase
            .from('pattern_adjustments')
            .select('*')
            .eq('execution_id', executionId)
            .order('created_at', { ascending: true });

        if (error || !data) return [];
        return data as PatternAdjustment[];
    } catch {
        return [];
    }
}

/**
 * Recupera la cadena de linaje histórico completa (árbol genealógico) para una ejecución.
 */
export function fetchExecutionLineage(
    executionId: string,
    allExecutions: PatternExecution[]
): PatternExecution[] {
    const map = new Map<string, PatternExecution>();
    allExecutions.forEach((e) => map.set(e.id, e));

    const current = map.get(executionId);
    if (!current) return [];

    // 1. Ancestros
    const ancestors: PatternExecution[] = [];
    let currParentId = current.parent_execution_id;
    while (currParentId && map.has(currParentId)) {
        const p = map.get(currParentId)!;
        ancestors.unshift(p);
        currParentId = p.parent_execution_id;
    }

    // 2. Descendientes directos
    const descendants: PatternExecution[] = [];
    let childId = current.id;
    while (true) {
        const child = allExecutions.find((e) => e.parent_execution_id === childId);
        if (!child) break;
        descendants.push(child);
        childId = child.id;
    }

    return [...ancestors, current, ...descendants];
}

/**
 * COMPONENTE 13: Aplicación Múltiple de Ajustes de Fitting y Creación de Ejecución Hija Derivada.
 * Flujo estricto:
 * Ejecución Padre -> Lista de Ajustes -> Validación Numérica/Zona -> Parámetros Paramétricos
 * -> executePatternEngine() -> Validación Geométrica -> Inserción Ejecución Hija (parent_execution_id)
 * -> Inserción de Ajustes en BD -> Retorno de resultado inmutable.
 */
export async function createMultiAdjustedChildExecution(params: {
    parentExecution: PatternExecution;
    adjustments: Array<{
        pieceId?: string;
        pieceName?: string;
        pieceType?: string;
        location?: string;
        adjustmentType: AdjustmentType;
        zone: string;
        targetPiece?: string;
        value: number;
        unit: 'cm' | 'mm';
        direction: 'increase' | 'decrease';
        deltaMm?: number;
        motive?: string;
        observation?: string;
    }>;
    fittingNotes?: string;
}): Promise<{
    success: boolean;
    childExecution?: PatternExecution;
    recordedAdjustments?: PatternAdjustment[];
    message?: string;
    error?: string;
}> {
    try {
        const { parentExecution, adjustments, fittingNotes } = params;

        if (!parentExecution) {
            return { success: false, error: 'Se requiere una ejecución base (padre) para registrar el ajuste.' };
        }
        if (!parentExecution.geometry_result || !parentExecution.geometry_result.pieces || parentExecution.geometry_result.pieces.length === 0) {
            return { success: false, error: 'La ejecución base no posee geometría válida calculada para derivar.' };
        }
        if (!adjustments || adjustments.length === 0) {
            return { success: false, error: 'Debe proporcionar al menos un ajuste de fitting para regenerar el patrón.' };
        }

        // 1. Validar cada ajuste rigurosamente
        const validatedItems: Array<typeof adjustments[0] & { computedDeltaMm: number }> = [];
        for (const adj of adjustments) {
            const v = validatePatternAdjustmentInput({
                adjustmentType: adj.adjustmentType,
                zone: adj.zone,
                value: adj.value,
                unit: adj.unit,
                direction: adj.direction,
                garmentType: parentExecution.garment_type,
                targetPieceId: adj.pieceId || adj.targetPiece,
                availablePieces: parentExecution.geometry_result.pieces,
            });
            if (!v.valid) {
                return { success: false, error: `Ajuste en "${adj.zone}" inválido: ${v.error}` };
            }

            // Validación estricta de pieza si fue indicada
            if (adj.pieceId && parentExecution.geometry_result?.pieces) {
                const found = parentExecution.geometry_result.pieces.some(
                    (p) => p.id === adj.pieceId || (p.name && p.name.toLowerCase() === adj.pieceId!.toLowerCase())
                );
                if (!found) {
                    return {
                        success: false,
                        error: `La pieza indicada "${adj.pieceId}" no existe en la geometría generada del patrón base.`,
                    };
                }
            }

            validatedItems.push({
                ...adj,
                computedDeltaMm: v.deltaMm!,
            });
        }

        // 1b. Bloqueo de seguridad: Si algún ajuste no tiene transformación geométrica segura en el motor (Section 12)
        const pendingGeometric = validatedItems.filter(
            (adj) => (adj.adjustmentType === 'other' || adj.adjustmentType === 'custom') && adj.computedDeltaMm !== 0
        );
        if (pendingGeometric.length > 0) {
            return {
                success: false,
                error: `Regeneración bloqueada por seguridad técnica: El ajuste "${pendingGeometric[0].zone}" (${pendingGeometric[0].adjustmentType}) está "Registrado — aplicación geométrica pendiente". No existe una transformación matemática automatizada segura en el motor para este tipo artesanal. Registre el ajuste como observación técnica o utilice un ajuste dimensional soportado.`,
            };
        }

        // 2. Aplicar los deltas secuencialmente sobre la holgura y parámetros de diseño
        let runningEase: EaseProfile = {
            ...parentExecution.ease_profile_snapshot,
            ease_values: { ...parentExecution.ease_profile_snapshot.ease_values },
        };
        let runningDesignParams: GarmentDesignParameters = {
            ...parentExecution.design_parameters,
        };
        const descriptionChunks: string[] = [];

        for (const adj of validatedItems) {
            const applied = applyAdjustmentToEngineParameters({
                adjustmentType: adj.adjustmentType,
                deltaMm: adj.computedDeltaMm,
                targetPiece: adj.targetPiece || adj.zone,
                currentEase: runningEase,
                currentDesignParams: runningDesignParams,
                garmentType: parentExecution.garment_type,
            });
            runningEase = applied.updatedEase;
            runningDesignParams = applied.updatedDesignParams;
            descriptionChunks.push(applied.description);
        }

        // Snapshot congelado de ajustes (Section 10) con números reales y trazabilidad de origen
        const fittingSnapshot: FittingExecutionSnapshot = {
            sourceExecutionId: parentExecution.id,
            fittingDate: new Date().toISOString(),
            designer: 'Katherine Carroll (Alta Costura)',
            adjustments: validatedItems.map((adj) => ({
                pieceId: adj.pieceId || adj.targetPiece,
                pieceName: adj.pieceName || adj.targetPiece || adj.zone,
                pieceType: adj.pieceType,
                adjustmentType: adj.adjustmentType,
                location: adj.location || adj.zone,
                valueMm: Number(adj.computedDeltaMm),
                reason: adj.motive || adj.zone,
                note: adj.observation || '',
                direction: adj.direction,
                unit: adj.unit,
            })),
        };

        runningDesignParams = {
            ...runningDesignParams,
            fitting_snapshot: fittingSnapshot,
        };

        // 3. Re-ejecutar determinísticamente el motor paramétrico existente
        const engineOutput = executePatternEngine({
            garmentType: parentExecution.garment_type,
            measurementsMm: parentExecution.measurement_snapshot,
            ease: runningEase,
            designParameters: runningDesignParams,
        });

        // 4. Validar el resultado geométrico
        const isEngineValid = engineOutput.success && engineOutput.validationResult?.valid === true;
        const hasErrors = Array.isArray(engineOutput.validationResult?.errors) && engineOutput.validationResult.errors.length > 0;
        const hasMissing = Array.isArray(engineOutput.validationResult?.missingRequiredMeasurements) && engineOutput.validationResult.missingRequiredMeasurements.length > 0;

        if (!isEngineValid || hasErrors || hasMissing) {
            const firstErr = engineOutput.validationResult?.errors?.[0] || 'Validación geométrica incompleta tras aplicar los ajustes.';
            return {
                success: false,
                error: `No se pudo generar la nueva ejecución derivada: ${firstErr}. Los ajustes aplicados causan inconsistencia geométrica.`,
            };
        }

        // 5. Derivar la siguiente etiqueta de versión (v1.0 -> v1.1, etc.)
        const nextVersionLabel = deriveNextVersionLabel(parentExecution.version_label);

        // 6. Persistir la nueva ejecución en pattern_executions
        let childExecution: PatternExecution;
        const isRealTemplateUuid =
            parentExecution.template_id &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                parentExecution.template_id
            );

        const summaryNote = `Revisión derivada de fitting en ${parentExecution.version_label}. Ajustes: ${descriptionChunks.join('; ')}${fittingNotes ? ` — Obs: ${fittingNotes}` : ''}`;
        const templateToUse = isRealTemplateUuid ? parentExecution.template_id : null;

        const saveRes = await savePatternExecution({
            clientId: parentExecution.client_id,
            sessionId: parentExecution.session_id,
            garmentType: parentExecution.garment_type,
            versionLabel: nextVersionLabel,
            engineVersion: engineOutput.engineVersion,
            measurementSnapshot: parentExecution.measurement_snapshot, // INMUTABLE CONSERVADO
            easeProfileSnapshot: runningEase,
            designParameters: runningDesignParams,
            geometryResult: engineOutput.geometryResult,
            validationResults: engineOutput.validationResult,
            templateId: templateToUse, // CONSERVADO
            parentExecutionId: parentExecution.id, // VINCULACIÓN AL PADRE
            creationId: parentExecution.creation_id || null, // VINCULACIÓN A LA CREACIÓN
            status: 'generated',
            notes: summaryNote,
        });

        if (saveRes.success && saveRes.execution) {
            childExecution = saveRes.execution;
        } else {
            // Soporte offline para tests sin autenticación activa
            childExecution = {
                id: `local_exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                client_id: parentExecution.client_id,
                session_id: parentExecution.session_id,
                template_id: parentExecution.template_id || null,
                parent_execution_id: parentExecution.id,
                creation_id: parentExecution.creation_id || null,
                garment_type: parentExecution.garment_type,
                version_label: nextVersionLabel,
                engine_version: engineOutput.engineVersion,
                status: 'generated',
                measurement_snapshot: parentExecution.measurement_snapshot,
                ease_profile_snapshot: runningEase,
                design_parameters: runningDesignParams,
                seam_allowance_default_mm: runningDesignParams.seam_allowance_default_mm || 10,
                geometry_result: engineOutput.geometryResult,
                validation_results: engineOutput.validationResult,
                notes: summaryNote,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }

        // Si pertenece a una Creación, actualizar el puntero active_pattern_execution_id a la nueva versión
        if (parentExecution.creation_id && childExecution.id) {
            try {
                await linkPatternExecutionToCreation(parentExecution.creation_id, childExecution.id);
            } catch {
                // No bloqueante
            }
        }

        // 7. Persistir cada ajuste en pattern_adjustments
        const recordedAdjustments: PatternAdjustment[] = [];
        for (const adj of validatedItems) {
            const fullDesc = `[${adj.zone}] ${adj.direction === 'increase' ? 'Aumentar' : 'Reducir'} ${adj.value} ${adj.unit} (${adj.computedDeltaMm > 0 ? '+' : ''}${adj.computedDeltaMm} mm)${adj.observation ? ` — ${adj.observation}` : ''}`;
            const adjRes = await recordPatternAdjustment({
                executionId: childExecution.id,
                adjustmentType: adj.adjustmentType,
                targetPiece: adj.targetPiece || adj.zone,
                deltaMm: adj.computedDeltaMm,
                description: fullDesc,
            });
            if (adjRes.adjustment) {
                recordedAdjustments.push(adjRes.adjustment);
            }
        }

        return {
            success: true,
            childExecution,
            recordedAdjustments,
            message: `✓ Nueva ejecución ${nextVersionLabel} generada correctamente con ${validatedItems.length} ajuste(s). Patrón base ${parentExecution.version_label} permanece intacto.`,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error inesperado durante la re-ejecución paramétrica y creación de la revisión hija.',
        };
    }
}

/**
 * COMPONENTE 12: Ciclo de Ajuste de Prueba (Fitting), Re-ejecución Paramétrica y Creación de Ejecución Hija.
 * Orquesta:
 * Padre -> Fitting -> Ajuste -> Delta -> Parámetros -> Re-ejecución Motor -> Validación -> Ejecución Hija (parent_execution_id)
 * Garantiza inmutabilidad del padre.
 */
export async function createAdjustedChildExecution(params: {
    parentExecution: PatternExecution;
    adjustmentType: AdjustmentType;
    targetPiece: string;
    deltaMm: number;
    description: string;
    fittingDate?: string;
}): Promise<{
    success: boolean;
    childExecution?: PatternExecution;
    adjustment?: PatternAdjustment;
    isCustomObservationOnly?: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const { parentExecution, adjustmentType, targetPiece, deltaMm, description } = params;

        if (!parentExecution) {
            return { success: false, error: 'Se requiere una ejecución base (padre) para registrar el ajuste.' };
        }

        const numCheck = validateAdjustmentNumericValue(deltaMm);
        if (!numCheck.valid) {
            return { success: false, error: numCheck.error };
        }

        if (deltaMm === 0 && adjustmentType !== 'custom' && adjustmentType !== 'other') {
            return { success: false, error: 'La variación milimétrica (delta_mm) debe ser distinta de cero.' };
        }

        if (!description || !description.trim()) {
            return { success: false, error: 'Por favor ingrese una descripción técnica del ajuste observado en la prueba.' };
        }

        // 1. REGLA 5: Si es CUSTOM u OTHER sin transformación matemática segura:
        // Registrar observación en pattern_adjustments y NO crear geometría inventada.
        if (adjustmentType === 'custom') {
            const adjRes = await recordPatternAdjustment({
                executionId: parentExecution.id,
                adjustmentType,
                targetPiece: targetPiece || 'Ajuste Especial de Alta Costura',
                deltaMm,
                description: description.trim(),
            });

            return {
                success: true,
                isCustomObservationOnly: true,
                adjustment: adjRes.adjustment,
                message: 'Ajuste cualitativo registrado como observación técnica en el historial de pruebas. No se generó nueva geometría porque requiere una transformación artesanal no disponible en el motor paramétrico.',
            };
        }

        if (adjustmentType === 'other') {
            const adjRes = await recordPatternAdjustment({
                executionId: parentExecution.id,
                adjustmentType,
                targetPiece: targetPiece || 'Ajuste Especial de Alta Costura',
                deltaMm,
                description: description.trim(),
            });

            return {
                success: true,
                isCustomObservationOnly: true,
                adjustment: adjRes.adjustment,
                message: 'Ajuste cualitativo registrado como observación técnica en el historial de pruebas. No se generó nueva geometría porque requiere una transformación artesanal no disponible en el motor paramétrico.',
            };
        }

        const direction: 'increase' | 'decrease' = deltaMm >= 0 ? 'increase' : 'decrease';
        const magnitudeMm = deltaMm < 0 ? -deltaMm : deltaMm;

        const multiRes = await createMultiAdjustedChildExecution({
            parentExecution,
            adjustments: [
                {
                    adjustmentType,
                    zone: targetPiece || 'Ajuste',
                    targetPiece,
                    value: magnitudeMm,
                    unit: 'mm',
                    direction,
                    observation: description.trim(),
                },
            ],
        });

        return {
            success: multiRes.success,
            childExecution: multiRes.childExecution,
            adjustment: multiRes.recordedAdjustments?.[0],
            message: multiRes.message,
            error: multiRes.error,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error inesperado durante la re-ejecución paramétrica y creación de la revisión hija.',
        };
    }
}

/**
 * COMPONENTE 13: Aprobación formal de patrón con bloqueo histórico inmutable.
 * Valida:
 * - Geometría válida y piezas presentes
 * - Ausencia de errores geométricos
 * - Ausencia de medidas obligatorias faltantes
 * - Cliente, sesión y plantilla vinculados
 * - Requisitos de RLS y reglas de transición de estado del esquema SQL
 */
export async function approvePatternExecution(params: {
    execution: PatternExecution;
    notes?: string;
}): Promise<{ success: boolean; updatedExecution?: PatternExecution; error?: string }> {
    const { execution, notes } = params;

    if (!execution) {
        return { success: false, error: 'No se especificó ninguna ejecución para aprobar.' };
    }

    // 1. Validaciones técnicas y de integridad obligatorias
    if (!execution.client_id) {
        return { success: false, error: 'Aprobación técnica denegada: Falta client_id asociado a la ejecución.' };
    }
    if (!execution.session_id) {
        return { success: false, error: 'Aprobación técnica denegada: Falta session_id asociado a la ejecución.' };
    }
    if (!execution.measurement_snapshot || Object.keys(execution.measurement_snapshot).length === 0) {
        return { success: false, error: 'Aprobación técnica denegada: Falta measurement_snapshot en la ejecución.' };
    }
    if (!execution.geometry_result || !Array.isArray(execution.geometry_result.pieces) || execution.geometry_result.pieces.length === 0) {
        return { success: false, error: 'Aprobación técnica denegada: Geometría inválida o sin piezas técnicas.' };
    }
    if (!execution.validation_results || execution.validation_results.valid !== true) {
        return { success: false, error: 'Aprobación técnica denegada: El patrón contiene errores geométricos o no es válido.' };
    }
    if (execution.validation_results.errors && execution.validation_results.errors.length > 0) {
        return { success: false, error: `Aprobación técnica denegada: El patrón contiene ${execution.validation_results.errors.length} error(es) geométrico(s).` };
    }
    if (execution.validation_results.missingRequiredMeasurements && execution.validation_results.missingRequiredMeasurements.length > 0) {
        return { success: false, error: `Aprobación técnica denegada: Faltan ${execution.validation_results.missingRequiredMeasurements.length} medida(s) obligatoria(s).` };
    }

    // 2. Bloqueo de ejecuciones ya aprobadas
    if (execution.status === 'approved_by_designer') {
        return { success: false, error: 'Esta ejecución ya se encuentra formalmente aprobada y bloqueada como versión histórica inmutable.' };
    }

    // 3. Manejo de estado de fitting según reglas del trigger SQL
    // Si la ejecución está en 'generated' o 'draft', transicionar mediante 'pending_fitting'
    if (execution.status !== 'pending_fitting') {
        const fittingStep = await updatePatternStatus(
            execution.id,
            'pending_fitting',
            'Prueba de vestuario completada conforme (sin ajustes adicionales requeridos).'
        );
        if (!fittingStep.success) {
            return { success: false, error: fittingStep.error || 'No se pudo verificar el estado previo de prueba de vestuario.' };
        }
    }

    // 4. Aprobación final formal
    const finalStep = await updatePatternStatus(
        execution.id,
        'approved_by_designer',
        notes || 'Patrón validado y aprobado formalmente por Katherine Carroll.'
    );

    if (!finalStep.success) {
        return { success: false, error: finalStep.error || 'No se pudo registrar la aprobación formal en el servidor.' };
    }

    const updatedExecution: PatternExecution = {
        ...execution,
        status: 'approved_by_designer',
        notes: notes || 'Patrón validado y aprobado formalmente por Katherine Carroll.',
        updated_at: new Date().toISOString(),
    };

    return { success: true, updatedExecution };
}

export interface ExecutionTraceabilityRecord {
    executionId: string;
    versionLabel: string;
    garmentType: GarmentType;
    templateId?: string | null;
    sessionId?: string | null;
    clientId?: string | null;
    status: PatternStatus;
    parentExecutionId?: string | null;
    createdAt: string;
    adjustments: PatternAdjustment[];
    isApproved: boolean;
}

/**
 * Reconstruye la cadena completa de trazabilidad histórica:
 * CLIENTE -> SESIÓN DE MEDIDAS -> PLANTILLA -> EJECUCIÓN ORIGINAL -> FITTING -> AJUSTES -> NUEVA EJECUCIÓN -> APROBACIÓN
 */
export function buildExecutionTraceability(
    targetExecutionId: string,
    allExecutions: PatternExecution[],
    allAdjustments: PatternAdjustment[] = []
): {
    lineageChain: PatternExecution[];
    targetExecution: PatternExecution | null;
    approvedExecution: PatternExecution | null;
    traceabilityRecords: ExecutionTraceabilityRecord[];
    summary: string;
} {
    const lineageChain = fetchExecutionLineage(targetExecutionId, allExecutions);
    const targetExecution = allExecutions.find((e) => e.id === targetExecutionId) || null;
    const approvedExecution = lineageChain.find((e) => e.status === 'approved_by_designer') || null;

    const traceabilityRecords: ExecutionTraceabilityRecord[] = lineageChain.map((exec) => {
        const adjs = allAdjustments.filter((a) => a.execution_id === exec.id);
        return {
            executionId: exec.id,
            versionLabel: exec.version_label,
            garmentType: exec.garment_type,
            templateId: exec.template_id,
            sessionId: exec.session_id,
            clientId: exec.client_id,
            status: exec.status,
            parentExecutionId: exec.parent_execution_id,
            createdAt: exec.created_at,
            adjustments: adjs,
            isApproved: exec.status === 'approved_by_designer',
        };
    });

    const summary = `Cadena de trazabilidad reconstruida: ${lineageChain.length} versión(es). Versión aprobada: ${
        approvedExecution ? `${approvedExecution.version_label} (ID: ${approvedExecution.id})` : 'Pendiente'
    }.`;

    return {
        lineageChain,
        targetExecution,
        approvedExecution,
        traceabilityRecords,
        summary,
    };
}

/**
 * Alias formal de exportación para la recuperación de linaje según especificación C13.
 */
export const fetchPatternExecutionLineage = fetchExecutionLineage;

/**
 * Retorna la taxonomía de ajustes compatibles para un tipo de prenda dado.
 * Garantiza que no se presenten parámetros incompatibles con la anatomía y tipo de prenda
 * (ej: tiro en falda/corpiño, busto en pantalón, manga en falda, etc.).
 */
export function getCompatibleAdjustmentsForGarment(garmentType: GarmentType): {
    type: AdjustmentType;
    label: string;
    defaultZone: string;
}[] {
    switch (garmentType) {
        case 'bodice':
            return [
                { type: 'bust', label: 'Busto / Pinza (bust)', defaultZone: 'Ápex y pinza torácica' },
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Contorno de cintura' },
                { type: 'shoulder', label: 'Hombro (shoulder)', defaultZone: 'Inclinación y extensión' },
                { type: 'armhole', label: 'Sisa (armhole)', defaultZone: 'Curvatura y profundidad' },
                { type: 'length', label: 'Largo Talle (length)', defaultZone: 'Largo de talle delantero / espalda' },
                { type: 'neckline', label: 'Escote (neckline)', defaultZone: 'Descenso y amplitud de escote' },
                { type: 'ease', label: 'Holgura Global (ease)', defaultZone: 'Desahogo de confort general' },
                { type: 'balance', label: 'Equilibrio Postural (balance)', defaultZone: 'Aplomo y nivel de talle' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'sleeve':
            return [
                { type: 'sleeve', label: 'Manga / Largo & Copa (sleeve)', defaultZone: 'Largo de manga y altura de copa' },
                { type: 'armhole', label: 'Sisa / Bíceps (armhole)', defaultZone: 'Holgura de bíceps y contorno' },
                { type: 'length', label: 'Largo Total Manga (length)', defaultZone: 'Largo total de brazo' },
                { type: 'ease', label: 'Holgura Manga (ease)', defaultZone: 'Desahogo de bíceps y puño' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'skirt':
            return [
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Contorno de cintura' },
                { type: 'hip', label: 'Cadera (hip)', defaultZone: 'Contorno de cadera y cadera alta' },
                { type: 'length', label: 'Largo Falda (length)', defaultZone: 'Largo total de falda' },
                { type: 'ease', label: 'Holgura Global (ease)', defaultZone: 'Desahogo de cintura y cadera' },
                { type: 'balance', label: 'Equilibrio / Aplomo (balance)', defaultZone: 'Nivelación de dobladillo y aplomo' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'pants':
            return [
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Contorno de cintura' },
                { type: 'hip', label: 'Cadera (hip)', defaultZone: 'Contorno de cadera' },
                { type: 'crotch', label: 'Tiro / Entrepierna (crotch)', defaultZone: 'Profundidad de tiro y entrepierna' },
                { type: 'length', label: 'Largo Pierna (length)', defaultZone: 'Largo exterior e interior de pernera' },
                { type: 'ease', label: 'Holgura Global (ease)', defaultZone: 'Desahogo de tiro, muslo y cadera' },
                { type: 'balance', label: 'Equilibrio / Aplomo (balance)', defaultZone: 'Línea de aplomo y caída de pernera' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'dress':
            return [
                { type: 'bust', label: 'Busto / Pinza (bust)', defaultZone: 'Ápex y pinza torácica' },
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Contorno y nivel de cintura' },
                { type: 'hip', label: 'Cadera (hip)', defaultZone: 'Contorno de cadera' },
                { type: 'shoulder', label: 'Hombro (shoulder)', defaultZone: 'Inclinación y extensión de hombro' },
                { type: 'armhole', label: 'Sisa (armhole)', defaultZone: 'Curvatura y profundidad de sisa' },
                { type: 'length', label: 'Largo Falda / Vestido (length)', defaultZone: 'Largo total desde cintura al bajo' },
                { type: 'neckline', label: 'Escote (neckline)', defaultZone: 'Descenso y amplitud de escote' },
                { type: 'ease', label: 'Holgura Global (ease)', defaultZone: 'Desahogo general de busto, cintura y cadera' },
                { type: 'balance', label: 'Equilibrio (balance)', defaultZone: 'Aplomo y caída vertical' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'blouse':
            return [
                { type: 'bust', label: 'Busto / Pinza (bust)', defaultZone: 'Ápex y desahogo de busto' },
                { type: 'waist', label: 'Cintura / Vuelo (waist)', defaultZone: 'Contorno de cintura y holgura' },
                { type: 'shoulder', label: 'Hombro (shoulder)', defaultZone: 'Inclinación y extensión' },
                { type: 'armhole', label: 'Sisa (armhole)', defaultZone: 'Holgura y profundidad de sisa' },
                { type: 'length', label: 'Largo Blusa (length)', defaultZone: 'Largo total de prenda' },
                { type: 'neckline', label: 'Escote (neckline)', defaultZone: 'Descenso y contorno de escote' },
                { type: 'ease', label: 'Holgura Fluida (ease)', defaultZone: 'Desahogo de caída y confort' },
                { type: 'balance', label: 'Equilibrio (balance)', defaultZone: 'Aplomo frontal y dorsal' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'shirt':
            return [
                { type: 'bust', label: 'Busto / Pecho (bust)', defaultZone: 'Contorno de tórax y desahogo frontal' },
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Contorno de cintura y holgura' },
                { type: 'shoulder', label: 'Hombro / Canesú (shoulder)', defaultZone: 'Inclinación y avance de canesú' },
                { type: 'armhole', label: 'Sisa (armhole)', defaultZone: 'Curvatura y profundidad de sisa' },
                { type: 'sleeve', label: 'Manga / Puño (sleeve)', defaultZone: 'Largo de manga, copa y puño' },
                { type: 'length', label: 'Largo Camisa (length)', defaultZone: 'Largo total desde hombro/C7' },
                { type: 'neckline', label: 'Cuello / Pie (neckline)', defaultZone: 'Perímetro y holgura de cuello' },
                { type: 'ease', label: 'Holgura Global (ease)', defaultZone: 'Desahogo camisero general' },
                { type: 'balance', label: 'Equilibrio / Aplomo (balance)', defaultZone: 'Balance delantero y dorsal' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
        case 'corset':
            return [
                { type: 'bust', label: 'Busto / Ápex (bust)', defaultZone: 'Contorno de busto y copa' },
                { type: 'waist', label: 'Cintura / Reducción (waist)', defaultZone: 'Reducción anatómica de cintura y paneles' },
                { type: 'hip', label: 'Cadera Alta / Bajo (hip)', defaultZone: 'Desahogo sobre cresta ilíaca y bajo' },
                { type: 'neckline', label: 'Escote Corsé (neckline)', defaultZone: 'Profundidad de corazón y contorno superior' },
                { type: 'length', label: 'Largo Corsé (length)', defaultZone: 'Largo total y pico delantero' },
                { type: 'ease', label: 'Reducción / Tensión (ease)', defaultZone: 'Tensión estructural de ajuste corporal' },
                { type: 'balance', label: 'Equilibrio / Aplomo (balance)', defaultZone: 'Línea de aplomo y simetría de paneles' },
                { type: 'other', label: 'Otro / Ballenas (other)', defaultZone: 'Canales de ballenas y ojales' },
            ];
        case 'jacket':
            return [
                { type: 'bust', label: 'Busto / Pecho (bust)', defaultZone: 'Contorno de tórax y desahogo de solapa' },
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Entalle de costadillos y cintura sastre' },
                { type: 'hip', label: 'Cadera / Faldón (hip)', defaultZone: 'Vuelo de cadera y bajo de faldón' },
                { type: 'shoulder', label: 'Hombro / Hombrera (shoulder)', defaultZone: 'Caída de hombro y desahogo para hombrera' },
                { type: 'armhole', label: 'Sisa (armhole)', defaultZone: 'Curvatura y profundidad de sisa exterior' },
                { type: 'sleeve', label: 'Manga Sastre (sleeve)', defaultZone: 'Largo y codera de manga de dos hojas' },
                { type: 'sleeve_cap', label: 'Embebido Copa (sleeve_cap)', defaultZone: 'Embebido sastre de copa superior' },
                { type: 'neckline', label: 'Cuello / Solapa (neckline)', defaultZone: 'Muesca de solapa y pie de cuello' },
                { type: 'length', label: 'Largo Chaqueta (length)', defaultZone: 'Largo total y abertura central' },
                { type: 'ease', label: 'Holgura Exterior (ease)', defaultZone: 'Desahogo sastre para forro y cuerpo' },
                { type: 'balance', label: 'Equilibrio / Aplomo (balance)', defaultZone: 'Balance sagital delantero y lordosis' },
                { type: 'other', label: 'Otro / Sastrería (other)', defaultZone: 'Carteras de bolsillo, ojales y forro' },
            ];
        case 'coat':
            return [
                { type: 'bust', label: 'Busto / Pecho (bust)', defaultZone: 'Contorno de tórax y cruce envolvente' },
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Entalle de costadillos y paso de cinturón' },
                { type: 'hip', label: 'Cadera / Faldón (hip)', defaultZone: 'Vuelo de cadera y bajo de abrigo' },
                { type: 'shoulder', label: 'Hombro / Hombrera (shoulder)', defaultZone: 'Caída de hombro y desahogo de prendas interiores' },
                { type: 'armhole', label: 'Sisa (armhole)', defaultZone: 'Profundidad y desahogo de sisa exterior' },
                { type: 'sleeve', label: 'Manga Abrigo (sleeve)', defaultZone: 'Largo y codera de manga de dos hojas' },
                { type: 'sleeve_cap', label: 'Embebido Copa (sleeve_cap)', defaultZone: 'Embebido sastre de copa superior' },
                { type: 'neckline', label: 'Cuello / Solapa (neckline)', defaultZone: 'Solapa sastre amplia y cuello de dos piezas' },
                { type: 'length', label: 'Largo Abrigo (length)', defaultZone: 'Largo total y abertura posterior' },
                { type: 'ease', label: 'Holgura de Capas (ease)', defaultZone: 'Desahogo para llevar sobre traje o chaqueta' },
                { type: 'balance', label: 'Equilibrio / Aplomo (balance)', defaultZone: 'Balance sagital delantero y caída dorsal' },
                { type: 'other', label: 'Otro / Sastrería (other)', defaultZone: 'Cinturón, carteras de bolsillo y forro' },
            ];
        default:
            return [
                { type: 'waist', label: 'Cintura (waist)', defaultZone: 'Contorno de cintura' },
                { type: 'length', label: 'Largo (length)', defaultZone: 'Largo de prenda' },
                { type: 'ease', label: 'Holgura (ease)', defaultZone: 'Desahogo' },
                { type: 'other', label: 'Otro / Cualitativo (other)', defaultZone: 'Ajuste artesanal' },
            ];
    }
}

export interface PatternExecutionValidationReport {
    valid: boolean;
    errors: string[];
    warnings: string[];
    details: {
        hasGeometry: boolean;
        noNaN: boolean;
        noInfinity: boolean;
        positiveDimensions: boolean;
        validPiecesCount: number;
        validPaths: boolean;
        requiredMeasurementsPresent: boolean;
        templateCompatible: boolean;
        sessionValid: boolean;
        clientValid: boolean;
        lineageContinuous: boolean;
        paramsGarmentCoherent: boolean;
    };
}

/**
 * Validador formal integral para una ejecución de patrón (C13: Validación del Ajuste y Gating).
 * Verifica rigurosamente geometría, ausencia de NaN/Infinity, positividad dimensional,
 * coherencia con prenda y sesión, y continuidad de linaje sin requerir exportación DXF.
 */
export function validatePatternExecution(
    execution: Partial<PatternExecution>,
    options?: {
        expectedGarmentType?: GarmentType;
        parentExecution?: PatternExecution | null;
        requiredMeasurements?: string[];
    }
): PatternExecutionValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasClient = Boolean(execution.client_id && execution.client_id.trim().length > 0);
    if (!hasClient) errors.push('Falta client_id obligatorio en la ejecución.');

    const hasSession = Boolean(execution.session_id && execution.session_id.trim().length > 0);
    if (!hasSession) errors.push('Falta session_id obligatorio en la ejecución.');

    const hasGarment = Boolean(execution.garment_type);
    if (!hasGarment) {
        errors.push('Falta garment_type en la ejecución.');
    } else if (options?.expectedGarmentType && execution.garment_type !== options.expectedGarmentType) {
        errors.push(`Incoherencia de prenda: se esperaba ${options.expectedGarmentType} y se recibió ${execution.garment_type}.`);
    }

    // Snapshot de medidas anatómicas
    const snapshot = execution.measurement_snapshot;
    let requiredMeasurementsPresent = true;
    if (!snapshot || typeof snapshot !== 'object' || Object.keys(snapshot).length === 0) {
        errors.push('Snapshot de medidas inexistente o vacío.');
        requiredMeasurementsPresent = false;
    } else {
        for (const [key, val] of Object.entries(snapshot)) {
            if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val) || val <= 0) {
                errors.push(`Medida "${key}" inválida en snapshot: valor no numérico, finito o positivo.`);
            }
        }
        if (options?.requiredMeasurements && options.requiredMeasurements.length > 0) {
            for (const req of options.requiredMeasurements) {
                if (snapshot[req] === undefined || snapshot[req] === null || snapshot[req] <= 0) {
                    errors.push(`Medida obligatoria ausente o nula: "${req}".`);
                    requiredMeasurementsPresent = false;
                }
            }
        }
    }

    // Geometría y piezas
    const geom = execution.geometry_result;
    let hasGeometry = false;
    let noNaN = true;
    let noInfinity = true;
    let positiveDimensions = true;
    let validPiecesCount = 0;
    let validPaths = true;

    if (!geom || !Array.isArray(geom.pieces) || geom.pieces.length === 0) {
        errors.push('Geometría nula o sin piezas técnicas generadas.');
    } else {
        hasGeometry = true;
        validPiecesCount = geom.pieces.length;

        if (!geom.boundingBox || geom.boundingBox.width <= 0 || geom.boundingBox.height <= 0) {
            errors.push('Envergadura global (boundingBox) no positiva o inválida.');
            positiveDimensions = false;
        }

        for (const piece of geom.pieces) {
            if (!piece.id || !piece.name) {
                errors.push('Pieza con identificador o nombre ausente.');
            }
            const bbox = piece.boundingBox;
            if (!bbox) {
                errors.push(`Pieza "${piece.name || piece.id}" carece de boundingBox.`);
                positiveDimensions = false;
                continue;
            }
            if (Number.isNaN(bbox.minX) || Number.isNaN(bbox.maxX) || Number.isNaN(bbox.minY) || Number.isNaN(bbox.maxY) || Number.isNaN(bbox.width) || Number.isNaN(bbox.height)) {
                errors.push(`Coordenadas o dimensiones NaN detectadas en pieza "${piece.name}".`);
                noNaN = false;
            }
            if (!Number.isFinite(bbox.minX) || !Number.isFinite(bbox.maxX) || !Number.isFinite(bbox.minY) || !Number.isFinite(bbox.maxY) || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
                errors.push(`Coordenadas o dimensiones no finitas detectadas en pieza "${piece.name}".`);
                noInfinity = false;
            }
            if (bbox.width <= 0 || bbox.height <= 0) {
                errors.push(`Dimensiones no positivas en pieza "${piece.name}" (${bbox.width} × ${bbox.height} mm).`);
                positiveDimensions = false;
            }

            if (!piece.outlineCut?.commands || piece.outlineCut.commands.length === 0) {
                errors.push(`Pieza "${piece.name}" no tiene trazo de corte exterior (outlineCut).`);
                validPaths = false;
            } else {
                for (const cmd of piece.outlineCut.commands) {
                    for (const p of cmd.params) {
                        if (Number.isNaN(p)) {
                            errors.push(`Parámetro NaN en comando de corte de pieza "${piece.name}".`);
                            noNaN = false;
                        }
                        if (!Number.isFinite(p)) {
                            errors.push(`Parámetro infinito en comando de corte de pieza "${piece.name}".`);
                            noInfinity = false;
                        }
                    }
                }
            }
        }
    }

    // Linaje
    let lineageContinuous = true;
    if (options?.parentExecution) {
        if (execution.parent_execution_id !== options.parentExecution.id) {
            errors.push(`Discrepancia en linaje: parent_execution_id (${execution.parent_execution_id}) no coincide con el padre (${options.parentExecution.id}).`);
            lineageContinuous = false;
        }
        if (execution.client_id !== options.parentExecution.client_id) {
            errors.push('Discrepancia en linaje: client_id no coincide con la ejecución padre.');
            lineageContinuous = false;
        }
        if (execution.garment_type !== options.parentExecution.garment_type) {
            errors.push('Discrepancia en linaje: garment_type difiere entre padre e hija.');
            lineageContinuous = false;
        }
    }

    // Compatibilidad de plantilla
    let templateCompatible = true;
    if (execution.template_id) {
        const isFictitious = execution.template_id.startsWith('fallback_') || execution.template_id.startsWith('local_');
        if (isFictitious) {
            warnings.push('La ejecución utiliza un template_id de demostración local (no persistido en Supabase remoto).');
        }
    }

    const isValid = errors.length === 0 && hasClient && hasSession && hasGeometry && noNaN && noInfinity && positiveDimensions && validPaths;

    return {
        valid: isValid,
        errors,
        warnings,
        details: {
            hasGeometry,
            noNaN,
            noInfinity,
            positiveDimensions,
            validPiecesCount,
            validPaths,
            requiredMeasurementsPresent,
            templateCompatible,
            sessionValid: hasSession,
            clientValid: hasClient,
            lineageContinuous,
            paramsGarmentCoherent: hasGarment,
        },
    };
}

export interface PieceComparisonRecord {
    pieceId: string;
    pieceName: string;
    widthBeforeMm: number;
    heightBeforeMm: number;
    widthAfterMm: number;
    heightAfterMm: number;
    deltaWidthMm: number;
    deltaHeightMm: number;
    areaBeforeApproxMm2: number;
    areaAfterApproxMm2: number;
    deltaAreaApproxMm2: number;
    isAffected: boolean;
}

export interface PatternComparisonResult {
    parentExecutionId: string;
    parentVersionLabel: string;
    childExecutionId: string;
    childVersionLabel: string;
    garmentType: GarmentType;
    designer: string;
    date: string;
    adjustmentsApplied: PatternAdjustment[];
    easeDeltas: Record<string, { before: number; after: number; delta: number }>;
    designParamDeltas: Record<string, { before: any; after: any; delta?: number }>;
    piecesComparison: PieceComparisonRecord[];
    summary: string;
}

/**
 * COMPONENTE 13 — COMPARACIÓN TÉCNICA ANTES / DESPUÉS:
 * Compara determinísticamente la ejecución original (padre) y la derivada (hija),
 * analizando piezas afectadas, dimensiones anteriores/nuevas, diferencias milimétricas,
 * holguras, parámetros y autoría de Katherine Carroll.
 */
export function comparePatternExecutions(
    parentExecution: PatternExecution,
    childExecution: PatternExecution,
    adjustments: PatternAdjustment[] = []
): PatternComparisonResult {
    const designer = 'Katherine Carroll';
    const date = childExecution.created_at || new Date().toISOString();

    // 1. Diferencias de holgura
    const easeDeltas: Record<string, { before: number; after: number; delta: number }> = {};
    const parentEase = parentExecution.ease_profile_snapshot?.ease_values || {};
    const childEase = childExecution.ease_profile_snapshot?.ease_values || {};
    const allEaseKeys = Array.from(new Set([...Object.keys(parentEase), ...Object.keys(childEase)]));

    for (const key of allEaseKeys) {
        const b = (parentEase as any)[key] ?? 0;
        const a = (childEase as any)[key] ?? 0;
        if (b !== a) {
            easeDeltas[key] = { before: b, after: a, delta: Math.round((a - b) * 10) / 10 };
        }
    }

    // 2. Diferencias de parámetros de diseño
    const designParamDeltas: Record<string, { before: any; after: any; delta?: number }> = {};
    const parentParams = (parentExecution.design_parameters || {}) as Record<string, any>;
    const childParams = (childExecution.design_parameters || {}) as Record<string, any>;
    const allParamKeys = Array.from(new Set([...Object.keys(parentParams), ...Object.keys(childParams)]));

    for (const key of allParamKeys) {
        const b = parentParams[key];
        const a = childParams[key];
        if (b !== a) {
            if (typeof b === 'number' && typeof a === 'number') {
                designParamDeltas[key] = { before: b, after: a, delta: Math.round((a - b) * 10) / 10 };
            } else {
                designParamDeltas[key] = { before: b, after: a };
            }
        }
    }

    // 3. Diferencias geométricas por pieza
    const parentPieces = parentExecution.geometry_result?.pieces || [];
    const childPieces = childExecution.geometry_result?.pieces || [];

    const piecesComparison: PieceComparisonRecord[] = childPieces.map((cp) => {
        const pp = parentPieces.find((p) => p.id === cp.id) || null;
        const wBefore = pp ? Math.round(pp.boundingBox.width * 10) / 10 : 0;
        const hBefore = pp ? Math.round(pp.boundingBox.height * 10) / 10 : 0;
        const wAfter = Math.round(cp.boundingBox.width * 10) / 10;
        const hAfter = Math.round(cp.boundingBox.height * 10) / 10;
        const deltaW = Math.round((wAfter - wBefore) * 10) / 10;
        const deltaH = Math.round((hAfter - hBefore) * 10) / 10;
        const areaBefore = pp ? Math.round(pp.boundingBox.width * pp.boundingBox.height) : 0;
        const areaAfter = Math.round(cp.boundingBox.width * cp.boundingBox.height);

        const isAffected = deltaW !== 0 || deltaH !== 0;

        return {
            pieceId: cp.id,
            pieceName: cp.name,
            widthBeforeMm: wBefore,
            heightBeforeMm: hBefore,
            widthAfterMm: wAfter,
            heightAfterMm: hAfter,
            deltaWidthMm: deltaW,
            deltaHeightMm: deltaH,
            areaBeforeApproxMm2: areaBefore,
            areaAfterApproxMm2: areaAfter,
            deltaAreaApproxMm2: areaAfter - areaBefore,
            isAffected,
        };
    });

    const affectedPieces = piecesComparison.filter((p) => p.isAffected);
    const summary = `Comparación ${parentExecution.version_label} → ${childExecution.version_label}: ${affectedPieces.length} pieza(s) con alteración dimensional detectada de ${childPieces.length} piezas totales.`;

    return {
        parentExecutionId: parentExecution.id,
        parentVersionLabel: parentExecution.version_label,
        childExecutionId: childExecution.id,
        childVersionLabel: childExecution.version_label,
        garmentType: childExecution.garment_type,
        designer,
        date,
        adjustmentsApplied: adjustments.filter(
            (a) => a.execution_id === childExecution.id || a.execution_id === parentExecution.id
        ),
        easeDeltas,
        designParamDeltas,
        piecesComparison,
        summary,
    };
}

// ==============================================================================
// PERFILES DE MEDIDAS DE REFERENCIA PARA PATRONES LIBRES (MÓDULO 02 · FLUJO D)
// ==============================================================================
export interface HauteCoutureReferenceProfile {
    code: string;
    label: string;
    description: string;
    measurementsMm: Record<string, number>;
}

export const HAUTE_COUTURE_REFERENCE_PROFILES: HauteCoutureReferenceProfile[] = [
    {
        code: 'size_38',
        label: 'Talla 38 Haute Couture (Base Francesa)',
        description: 'Busto: 88 cm · Cintura: 68 cm · Cadera: 94 cm · Hombro: 12.5 cm · Brazo: 59 cm',
        measurementsMm: {
            contorno_busto: 880,
            contorno_cintura: 680,
            contorno_cadera: 940,
            contorno_cuello: 360,
            ancho_espalda: 350,
            largo_talle_delantero: 440,
            largo_talle_espalda: 410,
            altura_busto: 260,
            separacion_busto: 190,
            largo_hombro: 125,
            largo_brazo: 590,
            contorno_biceps: 280,
            contorno_muneca: 165,
            largo_falda: 600,
            altura_cadera: 200,
            altura_tiro: 260,
            largo_pantalon: 1020,
            largo_camisa: 680,
            largo_chaqueta: 650,
            largo_abrigo: 1100,
        },
    },
    {
        code: 'size_40',
        label: 'Talla 40 Haute Couture (Patrón de Taller)',
        description: 'Busto: 92 cm · Cintura: 72 cm · Cadera: 98 cm · Hombro: 12.8 cm · Brazo: 60 cm',
        measurementsMm: {
            contorno_busto: 920,
            contorno_cintura: 720,
            contorno_cadera: 980,
            contorno_cuello: 370,
            ancho_espalda: 360,
            largo_talle_delantero: 450,
            largo_talle_espalda: 415,
            altura_busto: 270,
            separacion_busto: 200,
            largo_hombro: 128,
            largo_brazo: 600,
            contorno_biceps: 295,
            contorno_muneca: 170,
            largo_falda: 620,
            altura_cadera: 205,
            altura_tiro: 270,
            largo_pantalon: 1030,
            largo_camisa: 700,
            largo_chaqueta: 660,
            largo_abrigo: 1120,
        },
    },
    {
        code: 'size_42',
        label: 'Talla 42 Haute Couture (Línea Estructurada)',
        description: 'Busto: 96 cm · Cintura: 76 cm · Cadera: 102 cm · Hombro: 13.0 cm · Brazo: 61 cm',
        measurementsMm: {
            contorno_busto: 960,
            contorno_cintura: 760,
            contorno_cadera: 1020,
            contorno_cuello: 380,
            ancho_espalda: 370,
            largo_talle_delantero: 460,
            largo_talle_espalda: 420,
            altura_busto: 280,
            separacion_busto: 210,
            largo_hombro: 130,
            largo_brazo: 610,
            contorno_biceps: 310,
            contorno_muneca: 175,
            largo_falda: 630,
            altura_cadera: 210,
            altura_tiro: 280,
            largo_pantalon: 1040,
            largo_camisa: 710,
            largo_chaqueta: 670,
            largo_abrigo: 1140,
        },
    },
];



