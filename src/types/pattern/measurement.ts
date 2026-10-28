// ==============================================================================
// ATELIER DIGITAL — TIPOS: CATÁLOGO Y SESIONES DE MEDIDAS (MÓDULO 02)
// Archivo: src/types/pattern/measurement.ts
// ==============================================================================

export type MeasurementCategory =
    | 'torso_body'       // A. Identificación corporal y torso
    | 'arms_sleeves'      // B. Brazos y mangas
    | 'legs_pants'        // C. Piernas y pantalón
    | 'fit_adjustment'    // D. Medidas adicionales para ajuste
    | 'garment_design';   // E. Medidas de diseño y prenda

export type MeasurementScope =
    | 'body'              // Medición anatómica directa de la clienta
    | 'finished_garment'  // Dimensión objetivo de la prenda terminada
    | 'design_parameter'  // Parámetro estilístico (largo, escote, etc.)
    | 'calculated';       // Valor deducido mediante regla geométrica o antropométrica

export type MeasurementUnit = 'cm' | 'mm' | 'in';

export type MeasurementSource =
    | 'direct'            // Toma presencial con cinta métrica
    | 'calculated'        // Derivada por fórmula matemática validada
    | 'estimated';        // Estimación provisional que requiere confirmación

export type MeasurementConfidence =
    | 'confirmed'         // Medición física confirmada
    | 'preliminary'       // Estimada o pendiente de rectificación
    | 'designer_approved';// Validada expresamente por Katherine Carroll

export type SessionStatus = 'draft' | 'completed' | 'verified' | 'archived';

export interface MeasurementCatalogItem {
    code: string;
    name: string;
    category: MeasurementCategory;
    scope: MeasurementScope;
    default_unit: MeasurementUnit;
    precision_step: number;
    min_value_mm: number;
    max_value_mm: number;
    instructions: string;
    anatomical_landmarks: string;
    laterality: 'none' | 'bilateral' | 'left_only' | 'right_only';
    is_calculated: boolean;
    formula_expression?: string | null;
    dependencies?: string[];
    block_usage: string[];
    is_active: boolean;
}

export interface MeasurementSession {
    id: string;
    client_id: string;
    person_id?: string | null;
    creation_id?: string | null;
    session_date: string;
    taken_by?: string | null;
    status: SessionStatus;
    unit_system: MeasurementUnit;
    notes?: string | null;
    version_number: number;
    created_at: string;
    updated_at: string;
    values?: Record<string, MeasurementValueItem>;
}

export type MeasurementSide = 'none' | 'left' | 'right';

export interface MeasurementValueItem {
    id?: string;
    session_id?: string;
    measurement_code: string;
    side?: MeasurementSide;
    value_mm: number;
    source: MeasurementSource;
    confidence: MeasurementConfidence;
    notes?: string | null;
    created_at?: string;
}

export interface MeasurementValidationRule {
    code: string;
    min_mm: number;
    max_mm: number;
    required: boolean;
    name: string;
}
