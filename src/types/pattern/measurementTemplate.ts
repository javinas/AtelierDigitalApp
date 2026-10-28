// ==============================================================================
// ATELIER DIGITAL — TIPOS: PLANTILLAS REUTILIZABLES DE MEDIDAS (FASE 2)
// Archivo: src/types/pattern/measurementTemplate.ts
// ==============================================================================
// Permite a la diseñadora seleccionar un conjunto curado y pertinente de medidas
// según la prenda o servicio (Alta Costura, Sastrería, Camisería, Pantalón, etc.),
// sin alterar la inmutabilidad ni los códigos canónicos de masterCatalog.ts.
// ==============================================================================

import { DemographicCategory } from '../personGroup';
import { MeasurementCategory } from './measurement';

export type MeasurementTemplateCategory =
    | 'alta_costura'
    | 'tailoring'
    | 'daily_wear'
    | 'lower_body'
    | 'specialty';

/**
 * Modalidad de uso de la sesión de medidas:
 * A. standard_only: Solo Talla Estándar (source: estimated).
 * B. standard_with_adjustments: Talla Estándar + Ajustes Físicos (modificados prevalecen).
 * C. manual_direct: Medición Manual Directa con Cinta Métrica (source: direct).
 */
export type MeasurementUsageMode =
    | 'standard_only'
    | 'standard_with_adjustments'
    | 'manual_direct';

export interface MeasurementTemplate {
    /** Identificador único alfanumérico estable */
    id: string;
    /** Nombre formal de alta costura */
    name: string;
    /** Descripción corta del alcance y tipo de prenda */
    shortDescription: string;
    /** Emblema o glifo representativo */
    icon: string;
    /** Ruta de imagen o key de asset de referencia */
    imageKey: string;
    /** Categoría temática de la plantilla */
    category: MeasurementTemplateCategory;
    /** Categorías demográficas compatibles (mujer, hombre, niña, niño, bebé) */
    demographic_categories: DemographicCategory[];
    /** Lista ordenada y estricta de códigos de medidas existentes en masterCatalog.ts */
    measurement_codes: string[];
    /** Subconjunto de medidas indispensables para el trazado de la prenda */
    required_codes: string[];
    /** Subconjunto de medidas complementarias u opcionales */
    optional_codes: string[];
    /** Categorías anatómicas abarcadas (Torso, Mangas, Piernas, Diseño) */
    anatomical_categories: MeasurementCategory[];
    /** Estado activo para ser seleccionable */
    is_active: boolean;
}

export interface MeasurementTemplateValidationResult {
    valid: boolean;
    missingCodes: string[];
    duplicateCodes: string[];
    totalCount: number;
}
