// ==============================================================================
// ATELIER DIGITAL — SERVICIO: VALIDADOR DEMOGRÁFICO Y PREPARACIÓN CAD (M02 · FASE 4)
// Archivo: src/services/demographicCadValidator.ts
// ==============================================================================
// Conecta personas, mediciones, prendas y motor paramétrico CAD:
// PERSONA -> MEDICIÓN -> CREACIÓN -> PRENDA -> PATRÓN CAD -> EJECUCIÓN
//
// Reglas de Oro:
// 1. Bebé estrictamente excluido del patronaje CAD paramétrico.
// 2. Validación anatómica estricta: si una prenda no está preparada para cierta
//    morfología, rechazar con mensaje claro sin escalar silenciosamente.
// 3. Prioridad de sesiones: explícita > más reciente de la persona > nunca de otra persona.
// 4. Verificación de medidas obligatorias en mm antes de enviar al motor.
// ==============================================================================

import { DemographicCategory, DEMOGRAPHIC_LABELS, MeasuredPerson } from '../types/personGroup';
import { GarmentType } from '../types/pattern/pattern';
import { MeasurementSession } from '../types/pattern/measurement';
import { GARMENT_PACKAGES, GarmentPackageDefinition } from '../engine/pattern/catalog/garmentPackages';
import {
    CANONICAL_BASE_GARMENTS,
    GARMENT_VARIANTS_REGISTRY,
    resolveGarmentLineage,
} from '../engine/pattern/catalog/garmentVariantsCatalog';
import { MEASUREMENT_MAP } from '../engine/pattern/catalog/masterCatalog';

/**
 * Metadata editorial de cada prenda disponible para patronaje CAD en Módulo 02
 */
export interface CadGarmentEditorialItem {
    key: string;
    name: string;
    baseGarmentType: GarmentType;
    category: string;
    description: string;
    piecesCount: number;
    isVariant: boolean;
    isBase: boolean;
    cadAvailabilityStatus: 'ready' | 'beta' | 'blocked_for_morphology';
    compatibleDemographics: DemographicCategory[];
    imageKey: string;
}

/**
 * Catálogo completo de prendas CAD oficiales del Módulo 02
 * (10 prendas base canónicas + 12 variantes y prendas especiales de alta costura)
 */
export const CAD_GARMENTS_CATALOG: CadGarmentEditorialItem[] = [
    // --- 10 PRENDAS BASE CANÓNICAS ---
    {
        key: 'skirt',
        name: 'Falda Base & Evasé',
        baseGarmentType: 'skirt',
        category: 'Inferior / Silueta',
        description: 'Trazado paramétrico delantero y espalda con pinzas anatómicas y evasé regulable.',
        piecesCount: 2,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'girl'],
        imageKey: 'skirt',
    },
    {
        key: 'bodice',
        name: 'Corpiño / Cuerpo Base',
        baseGarmentType: 'bodice',
        category: 'Superior / Estructurado',
        description: 'Patrón maestro de busto con desarrollo de pinzas de talle, hombro y costadillo.',
        piecesCount: 2,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman'],
        imageKey: 'bodice',
    },
    {
        key: 'pants',
        name: 'Pantalón Sastre',
        baseGarmentType: 'pants',
        category: 'Inferior / Sastrería',
        description: 'Construcción con tiro anatómico, curva de entrepierna y aplomo de corte recto.',
        piecesCount: 2,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man', 'girl', 'boy'],
        imageKey: 'pants',
    },
    {
        key: 'dress',
        name: 'Vestido Princesa',
        baseGarmentType: 'dress',
        category: 'Completa / Alta Costura',
        description: 'Unión anatómica corpiño y falda con corte francés, entalle estilizado y manga sastre.',
        piecesCount: 5,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'girl'],
        imageKey: 'dress',
    },
    {
        key: 'sleeve',
        name: 'Manga Anatómica',
        baseGarmentType: 'sleeve',
        category: 'Complemento / Sastrería',
        description: 'Copa proporcional al perímetro de sisa con embebido técnico y sangría de codo.',
        piecesCount: 1,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man', 'girl', 'boy'],
        imageKey: 'sleeve',
    },
    {
        key: 'blouse',
        name: 'Blusa Clásica Fluida',
        baseGarmentType: 'blouse',
        category: 'Superior / Fluida',
        description: 'Desahogo generoso para sedas y gasas, cruce de botonadura y escote adaptable.',
        piecesCount: 3,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'girl'],
        imageKey: 'blouse',
    },
    {
        key: 'shirt',
        name: 'Camisa de Alta Costura',
        baseGarmentType: 'shirt',
        category: 'Superior / Sastrería',
        description: 'Construcción sastre con canesú, cuello camisero de 2 piezas, cruce, mangas y puños.',
        piecesCount: 11,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man', 'girl', 'boy'],
        imageKey: 'shirt',
    },
    {
        key: 'corset',
        name: 'Corpiño / Corsé Estructurado',
        baseGarmentType: 'corset',
        category: 'Estructurada / Corsetería',
        description: 'Estructura anatómica de 5 paneles con reducción activa de cintura y soporte óseo.',
        piecesCount: 10,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman'],
        imageKey: 'corset',
    },
    {
        key: 'jacket',
        name: 'Chaqueta Sastre de Alta Costura',
        baseGarmentType: 'jacket',
        category: 'Exterior / Sastrería',
        description: 'Sastrería estructurada con solapa de muesca, costadillos, cuello y manga de 2 hojas.',
        piecesCount: 16,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'jacket',
    },
    {
        key: 'coat',
        name: 'Abrigo Sastre de Alta Costura',
        baseGarmentType: 'coat',
        category: 'Exterior / Sastrería',
        description: 'Abrigo envolvente con solapa amplia, costadillos, abertura dorsal y carteras.',
        piecesCount: 17,
        isBase: true,
        isVariant: false,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'coat',
    },

    // --- VARIANTES Y PRENDAS ESPECIALES DE ALTA OCASIÓN ---
    {
        key: 'shirt_dress',
        name: 'Vestido Camisero',
        baseGarmentType: 'dress',
        category: 'Completa / Prêt-à-Couture',
        description: 'Cuerpo camisero estructurado con falda fluida, cuello camisero y manga con puño.',
        piecesCount: 13,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'girl'],
        imageKey: 'dress',
    },
    {
        key: 'tailored_vest',
        name: 'Chaleco Sastre',
        baseGarmentType: 'jacket',
        category: 'Sastrería / Chalecos',
        description: 'Chaqueta entallada sin mangas, escote en V con solapa y ceñidor lumbar.',
        piecesCount: 7,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'jacket',
    },
    {
        key: 'short',
        name: 'Short Sastre / Bermuda',
        baseGarmentType: 'pants',
        category: 'Inferior / Cortos',
        description: 'Derivación sastre sobre rodilla con tiro anatómico y pretina estructurada.',
        piecesCount: 5,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man', 'girl', 'boy'],
        imageKey: 'pants',
    },
    {
        key: 'cargo_pants',
        name: 'Pantalón Cargo / Safari',
        baseGarmentType: 'pants',
        category: 'Inferior / Utilitario',
        description: 'Pantalón sastre con bolsillos de parche fuelle y pretina safari reforzada.',
        piecesCount: 7,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man', 'boy'],
        imageKey: 'pants',
    },
    {
        key: 'trench_coat',
        name: 'Gabardina / Trench Coat',
        baseGarmentType: 'coat',
        category: 'Exterior / Abrigos',
        description: 'Abrigo cruzado con canesú de lluvia, charreteras y cinturón de alta costura.',
        piecesCount: 13,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'coat',
    },
    {
        key: 'atelier_robe',
        name: 'Bata de Taller de Alta Costura',
        baseGarmentType: 'coat',
        category: 'Exterior / Envolvente',
        description: 'Prenda envolvente funcional con cuello esmoquin, mangas fluidas y lazada.',
        piecesCount: 8,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'coat',
    },
    {
        key: 'evening_gown',
        name: 'Vestido de Gala',
        baseGarmentType: 'dress',
        category: 'Alta Ocasión / Gala',
        description: 'Vestido de fiesta con corsé emballenado integrado y falda larga con caída fluida.',
        piecesCount: 7,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman'],
        imageKey: 'dress',
    },
    {
        key: 'bridal_gown',
        name: 'Vestido de Novia',
        baseGarmentType: 'dress',
        category: 'Nupcial / Bridal',
        description: 'Traje de novia con cuerpo estructurado y falda con cola paramétrica de capilla.',
        piecesCount: 8,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman'],
        imageKey: 'dress',
    },
    {
        key: 'draped_asymmetric_dress',
        name: 'Vestido Drapeado / Asimétrico',
        baseGarmentType: 'dress',
        category: 'Alta Ocasión / Fiesta',
        description: 'Vestido asimétrico con hombro descubierto y pliegues drapeados sobre base anatómica.',
        piecesCount: 6,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman'],
        imageKey: 'dress',
    },
    {
        key: 'structured_formal_blouse',
        name: 'Blusa Formal Estructurada',
        baseGarmentType: 'blouse',
        category: 'Superior / Formal',
        description: 'Blusa entallada con cuello mao, tapeta oculta y puños franceses para gemelos.',
        piecesCount: 5,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman'],
        imageKey: 'blouse',
    },
    {
        key: 'bomber_jacket',
        name: 'Cazadora de Alta Costura',
        baseGarmentType: 'jacket',
        category: 'Exterior / Sport-Couture',
        description: 'Chaqueta corta con cremallera frontal, puños ajustados y pretina sastre.',
        piecesCount: 7,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'jacket',
    },
    {
        key: 'denim_couture_jacket',
        name: 'Chaqueta Vaquera de Alta Costura',
        baseGarmentType: 'jacket',
        category: 'Exterior / Denim-Couture',
        description: 'Chaqueta estructurada con canesús articulados, costadillos rectos y carteras.',
        piecesCount: 14,
        isBase: false,
        isVariant: true,
        cadAvailabilityStatus: 'ready',
        compatibleDemographics: ['woman', 'man'],
        imageKey: 'jacket',
    },
];

/**
 * Mensaje canónico de morfología no disponible (exigido por la especificación)
 */
export const INCOMPATIBLE_MORPHOLOGY_MESSAGE =
    'Esta prenda requiere un bloque anatómico todavía no disponible para esta morfología.';

/**
 * Mensaje canónico de exclusión de bebé
 */
export const BABY_EXCLUSION_MESSAGE =
    'El patronaje CAD paramétrico no está habilitado para bebés (0-36M) en el Módulo 02. Los bloques anatómicos infantiles tempranos requieren escalado volumétrico de pañal no soportado actualmente.';

/**
 * Valida la compatibilidad demográfica de una prenda con una categoría anatómica
 */
export function validateDemographicGarmentCompatibility(
    garmentKey: string,
    demographicCategory: DemographicCategory
): {
    isCompatible: boolean;
    isBabyBlocked: boolean;
    errorMessage: string | null;
    garmentItem?: CadGarmentEditorialItem;
} {
    // 1. Regla de oro: Bebé estrictamente excluido
    if (demographicCategory === 'baby') {
        return {
            isCompatible: false,
            isBabyBlocked: true,
            errorMessage: BABY_EXCLUSION_MESSAGE,
        };
    }

    const garment = CAD_GARMENTS_CATALOG.find((g) => g.key === garmentKey);
    if (!garment) {
        return {
            isCompatible: false,
            isBabyBlocked: false,
            errorMessage: `Prenda no reconocida en el catálogo CAD: "${garmentKey}".`,
        };
    }

    const isCompatible = garment.compatibleDemographics.includes(demographicCategory);
    if (!isCompatible) {
        return {
            isCompatible: false,
            isBabyBlocked: false,
            errorMessage: INCOMPATIBLE_MORPHOLOGY_MESSAGE,
            garmentItem: garment,
        };
    }

    return {
        isCompatible: true,
        isBabyBlocked: false,
        errorMessage: null,
        garmentItem: garment,
    };
}

/**
 * Resuelve la sesión de medidas de una persona aplicando las prioridades estrictas:
 * 1. Sesión seleccionada explícitamente por la diseñadora.
 * 2. Sesión más reciente válida perteneciente a la persona.
 * 3. NUNCA elegir una sesión que pertenezca a otra persona.
 */
export function resolvePersonMeasurementSession(
    targetPerson: MeasuredPerson,
    availableSessions: MeasurementSession[],
    explicitSessionId?: string | null
): {
    selectedSession: MeasurementSession | null;
    sourcePriority: 'explicit_designer_selection' | 'most_recent_valid_person_session' | 'none';
    warning: string | null;
    error: string | null;
} {
    // Filtrar sesiones estrictamente pertenecientes a esta persona
    const personSessions = availableSessions.filter((s) => s.person_id === targetPerson.id);

    // 1. Selección explícita por la diseñadora
    if (explicitSessionId) {
        const foundExplicit = availableSessions.find((s) => s.id === explicitSessionId);
        if (!foundExplicit) {
            return {
                selectedSession: null,
                sourcePriority: 'none',
                warning: null,
                error: `La sesión de medidas solicitada (ID: ${explicitSessionId}) no existe.`,
            };
        }

        // Rechazo tajante si pertenece a otra persona
        if (foundExplicit.person_id && foundExplicit.person_id !== targetPerson.id) {
            return {
                selectedSession: null,
                sourcePriority: 'none',
                warning: null,
                error: `Seguridad violada: La sesión de medidas seleccionada pertenece a otra persona (ID: ${foundExplicit.person_id}) y no puede ser utilizada para ${targetPerson.full_name}.`,
            };
        }

        return {
            selectedSession: foundExplicit,
            sourcePriority: 'explicit_designer_selection',
            warning: null,
            error: null,
        };
    }

    // 2. Sesión más reciente válida de la persona
    if (personSessions.length > 0) {
        // Ordenar por versión descendente y luego por fecha descendente
        const sorted = [...personSessions].sort((a, b) => {
            if (b.version_number !== a.version_number) {
                return (b.version_number || 0) - (a.version_number || 0);
            }
            return new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
        });

        const latest = sorted[0];
        return {
            selectedSession: latest,
            sourcePriority: 'most_recent_valid_person_session',
            warning: null,
            error: null,
        };
    }

    // Si la persona no tiene sesiones registradas
    return {
        selectedSession: null,
        sourcePriority: 'none',
        warning: `La persona ${targetPerson.full_name} no tiene sesiones de medidas registradas.`,
        error: null,
    };
}

export interface CadPreparationDiagnostic {
    isCadReady: boolean;
    blockReason: string | null;
    persona: {
        id: string;
        name: string;
        demographicCategory: DemographicCategory;
        demographicLabel: string;
        referenceId?: string | null;
    };
    prenda: {
        key: string;
        name: string;
        baseGarmentType: GarmentType;
        category: string;
        piecesCount: number;
    };
    medicion: {
        id: string;
        date: string;
        version: number;
        status: string;
        unitSystem: string;
        totalMeasuresCount: number;
    } | null;
    medidasValidas: {
        code: string;
        name: string;
        valueMm: number;
        source: string;
    }[];
    medidasFaltantes: {
        code: string;
        name: string;
    }[];
    modoOrigen: 'directo' | 'estimado' | 'hibrido' | 'sin_medidas';
    demographicCheck: {
        compatible: boolean;
        message: string | null;
    };
    resolvedMeasurementsMm: Record<string, number>;
}

/**
 * Realiza el diagnóstico integral de preparación CAD previo a la generación
 */
export function prepareCadGenerationDiagnostic(params: {
    person: MeasuredPerson;
    garmentKey: string;
    session: MeasurementSession | null;
}): CadPreparationDiagnostic {
    const { person, garmentKey, session } = params;

    const demoCheck = validateDemographicGarmentCompatibility(garmentKey, person.demographic_category);
    const garment = demoCheck.garmentItem || CAD_GARMENTS_CATALOG.find((g) => g.key === garmentKey);
    const baseGarmentType = garment?.baseGarmentType || (garmentKey as GarmentType);
    const pkg = GARMENT_PACKAGES[baseGarmentType];

    const personaSummary = {
        id: person.id,
        name: person.full_name,
        demographicCategory: person.demographic_category,
        demographicLabel: DEMOGRAPHIC_LABELS[person.demographic_category] || person.demographic_category,
        referenceId: person.reference_id,
    };

    const prendaSummary = {
        key: garmentKey,
        name: garment?.name || garmentKey,
        baseGarmentType,
        category: garment?.category || 'Prenda CAD',
        piecesCount: garment?.piecesCount || 2,
    };

    // Si está bloqueado demográficamente
    if (!demoCheck.isCompatible) {
        return {
            isCadReady: false,
            blockReason: demoCheck.errorMessage,
            persona: personaSummary,
            prenda: prendaSummary,
            medicion: session
                ? {
                      id: session.id,
                      date: session.session_date,
                      version: session.version_number,
                      status: session.status,
                      unitSystem: session.unit_system,
                      totalMeasuresCount: session.values ? Object.keys(session.values).length : 0,
                  }
                : null,
            medidasValidas: [],
            medidasFaltantes: [],
            modoOrigen: 'sin_medidas',
            demographicCheck: {
                compatible: false,
                message: demoCheck.errorMessage,
            },
            resolvedMeasurementsMm: {},
        };
    }

    if (!session || !session.values) {
        return {
            isCadReady: false,
            blockReason: 'No se ha seleccionado una sesión de medidas válida para la persona.',
            persona: personaSummary,
            prenda: prendaSummary,
            medicion: null,
            medidasValidas: [],
            medidasFaltantes: (pkg?.required || []).map((code) => ({
                code,
                name: MEASUREMENT_MAP[code]?.name || code,
            })),
            modoOrigen: 'sin_medidas',
            demographicCheck: {
                compatible: true,
                message: null,
            },
            resolvedMeasurementsMm: {},
        };
    }

    // Extraer medidas numéricas en mm
    const measurementsMm: Record<string, number> = {};
    const sourcesRecorded: string[] = [];

    for (const [key, item] of Object.entries(session.values)) {
        if (typeof item === 'object' && item && typeof item.value_mm === 'number') {
            measurementsMm[item.measurement_code || key] = item.value_mm;
            sourcesRecorded.push(item.source || 'direct');
        } else if (typeof item === 'number') {
            measurementsMm[key] = item;
            sourcesRecorded.push('direct');
        }
    }

    const requiredCodes = pkg?.required || [];
    const validMeasures: { code: string; name: string; valueMm: number; source: string }[] = [];
    const missingMeasures: { code: string; name: string }[] = [];
    const resolvedMeasurementsMm: Record<string, number> = { ...measurementsMm };

    for (const code of requiredCodes) {
        const val = measurementsMm[code];
        const name = MEASUREMENT_MAP[code]?.name || code;

        if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
            validMeasures.push({
                code,
                name,
                valueMm: val,
                source: session.values[code]?.source || 'direct',
            });
            continue;
        }

        // Probar si tiene fallback calculable en el paquete de la prenda
        const fallback = pkg?.calculableFallbacks?.[code];
        const calcVal = fallback ? fallback.calculate(measurementsMm) : null;
        if (typeof calcVal === 'number' && Number.isFinite(calcVal) && calcVal > 0) {
            resolvedMeasurementsMm[code] = calcVal;
            validMeasures.push({
                code,
                name,
                valueMm: calcVal,
                source: 'calculated',
            });
            continue;
        }

        missingMeasures.push({ code, name });
    }

    // Determinar modo de origen
    const hasDirect = sourcesRecorded.some((s) => s === 'direct');
    const hasEstimated = sourcesRecorded.some((s) => s === 'estimated');
    let modoOrigen: 'directo' | 'estimado' | 'hibrido' | 'sin_medidas' = 'directo';
    if (hasDirect && hasEstimated) modoOrigen = 'hibrido';
    else if (hasEstimated && !hasDirect) modoOrigen = 'estimado';
    else if (!hasDirect && !hasEstimated) modoOrigen = 'sin_medidas';

    const hasMissing = missingMeasures.length > 0;
    const isCadReady = !hasMissing;
    let blockReason: string | null = null;
    if (hasMissing) {
        const missingNames = missingMeasures.map((m) => m.name).join(', ');
        blockReason = `Faltan medidas obligatorias para ${prendaSummary.name}: ${missingNames}.`;
    }

    return {
        isCadReady,
        blockReason,
        persona: personaSummary,
        prenda: prendaSummary,
        medicion: {
            id: session.id,
            date: session.session_date,
            version: session.version_number,
            status: session.status,
            unitSystem: session.unit_system,
            totalMeasuresCount: Object.keys(session.values).length,
        },
        medidasValidas: validMeasures,
        medidasFaltantes: missingMeasures,
        modoOrigen,
        demographicCheck: {
            compatible: true,
            message: null,
        },
        resolvedMeasurementsMm,
    };
}
