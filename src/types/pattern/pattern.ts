// ==============================================================================
// ATELIER DIGITAL — TIPOS: EJECUCIONES Y VERSIONES DE PATRONAJE (MÓDULO 02)
// Archivo: src/types/pattern/pattern.ts
// ==============================================================================

import { EaseProfile, GarmentDesignParameters } from './ease';
import { PatternGeometryResult } from '../../engine/pattern/geometry/types';

export type BaseGarmentType = 'bodice' | 'sleeve' | 'skirt' | 'pants' | 'dress' | 'blouse' | 'shirt' | 'corset' | 'jacket' | 'coat';

export type ExtendedGarmentType =
    | 'shirt_dress'
    | 'tailored_vest'
    | 'short'
    | 'cargo_pants'
    | 'trench_coat'
    | 'atelier_robe'
    | 'evening_gown'
    | 'bridal_gown'
    | 'draped_asymmetric_dress'
    | 'bomber_jacket'
    | 'denim_couture_jacket';

export type GarmentType = BaseGarmentType | ExtendedGarmentType;

export type PatternStatus =
    | 'draft'                  // Borrador en configuración
    | 'generated'              // Geometría calculada determinísticamente
    | 'needs_revision'         // Advertencias o medidas fuera de rango
    | 'pending_fitting'        // Generado y pendiente de prueba en tela / glasilla
    | 'approved_by_designer';  // Validado y aprobado formalmente por Katherine Carroll

export type FitAdjustmentCode =
    | 'bust'
    | 'waist'
    | 'hip'
    | 'shoulder'
    | 'armhole'
    | 'neckline'
    | 'sleeve'
    | 'sleeve_cap'
    | 'garment_length'
    | 'dart'
    | 'ease'
    | 'other';

export type AdjustmentType =
    | FitAdjustmentCode
    | 'length'
    | 'crotch'
    | 'bust_dart'
    | 'balance'
    | 'custom';

export type FitAdjustmentCategory = 'dimensional' | 'geometric' | 'ease' | 'manual';

export interface FitAdjustmentTypeDefinition {
    code: FitAdjustmentCode;
    label: string;
    description: string;
    expectedUnit: 'mm' | 'cm';
    allowedSign: 'positive' | 'negative' | 'both';
    allowsZero: boolean;
    category: FitAdjustmentCategory;
    geometricApplicationStatus: 'fully_supported' | 'pending_geometric_implementation';
}

export const FIT_ADJUSTMENT_TYPES: Record<FitAdjustmentCode, FitAdjustmentTypeDefinition> = {
    bust: {
        code: 'bust',
        label: 'Contorno de Busto',
        description: 'Ajuste dimensional en contorno de busto y desahogo torácico.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'dimensional',
        geometricApplicationStatus: 'fully_supported',
    },
    waist: {
        code: 'waist',
        label: 'Contorno de Cintura',
        description: 'Ajuste dimensional en contorno de cintura y entalle anatómico.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'dimensional',
        geometricApplicationStatus: 'fully_supported',
    },
    hip: {
        code: 'hip',
        label: 'Contorno de Cadera',
        description: 'Ajuste dimensional en contorno de cadera y línea lumbar.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'dimensional',
        geometricApplicationStatus: 'fully_supported',
    },
    shoulder: {
        code: 'shoulder',
        label: 'Hombro (Caída / Largo)',
        description: 'Ajuste geométrico de inclinación, caída o longitud de hombro.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'geometric',
        geometricApplicationStatus: 'fully_supported',
    },
    armhole: {
        code: 'armhole',
        label: 'Profundidad de Sisa',
        description: 'Ajuste geométrico de holgura, profundidad o desarrollo de sisa.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'geometric',
        geometricApplicationStatus: 'fully_supported',
    },
    neckline: {
        code: 'neckline',
        label: 'Abertura de Escote',
        description: 'Ajuste geométrico de profundidad o amplitud del escote delantero/espalda.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'geometric',
        geometricApplicationStatus: 'fully_supported',
    },
    sleeve: {
        code: 'sleeve',
        label: 'Largo / Ancho de Manga',
        description: 'Ajuste dimensional de longitud de manga o contorno de bíceps.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'dimensional',
        geometricApplicationStatus: 'fully_supported',
    },
    sleeve_cap: {
        code: 'sleeve_cap',
        label: 'Copa de Manga / Embebido',
        description: 'Ajuste geométrico de altura de copa y embebido de ensamble.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'geometric',
        geometricApplicationStatus: 'fully_supported',
    },
    garment_length: {
        code: 'garment_length',
        label: 'Largo Total de Prenda',
        description: 'Ajuste dimensional vertical del largo total de falda, vestido, talle o pantalón.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'dimensional',
        geometricApplicationStatus: 'fully_supported',
    },
    dart: {
        code: 'dart',
        label: 'Pinza Anatómica',
        description: 'Ajuste geométrico de profundidad, vértice o entalle de pinza.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'geometric',
        geometricApplicationStatus: 'fully_supported',
    },
    ease: {
        code: 'ease',
        label: 'Holgura General de Prenda',
        description: 'Ajuste directo de desahogo y holgura en los perfiles técnicos.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: false,
        category: 'ease',
        geometricApplicationStatus: 'fully_supported',
    },
    other: {
        code: 'other',
        label: 'Ajuste Técnico Especial / Custom',
        description: 'Observación o ajuste artesanal registrado en prueba de vestuario sin transformación geométrica automatizada.',
        expectedUnit: 'mm',
        allowedSign: 'both',
        allowsZero: true,
        category: 'manual',
        geometricApplicationStatus: 'pending_geometric_implementation',
    },
};

// ZONAS TÉCNICAS Y DE DIAGNÓSTICO PARA PRUEBA DE VESTUARIO (FITTING — SECCIÓN 3)
export const FITTING_DIAGNOSTIC_ZONES = [
    { code: 'escote', label: 'Escote' },
    { code: 'hombro', label: 'Hombro' },
    { code: 'sisa', label: 'Sisa' },
    { code: 'busto', label: 'Busto' },
    { code: 'cintura', label: 'Cintura' },
    { code: 'cadera', label: 'Cadera' },
    { code: 'centro_delantero', label: 'Centro Delantero' },
    { code: 'centro_espalda', label: 'Centro Espalda' },
    { code: 'costado', label: 'Costado' },
    { code: 'manga', label: 'Manga' },
    { code: 'copa_manga', label: 'Copa de Manga' },
    { code: 'largo', label: 'Largo' },
    { code: 'ruedo', label: 'Ruedo' },
] as const;

export type FittingDiagnosticZoneCode = typeof FITTING_DIAGNOSTIC_ZONES[number]['code'];

// ACCIONES / DIRECCIONES EXTENSIBLES DE AJUSTE (SECCIÓN 5)
export type AdjustmentAction =
    | 'increase'          // Aumentar (+)
    | 'decrease'          // Reducir (-)
    | 'shift'             // Desplazar
    | 'raise'             // Elevar
    | 'lower'             // Bajar
    | 'lengthen'          // Alargar
    | 'shorten'           // Acortar
    | 'open'              // Abrir
    | 'close'             // Cerrar
    | 'correct'           // Corregir
    | 'modify_ease';      // Modificar holgura

export type AdjustmentNature =
    | 'quantitative'      // Ajuste cuantitativo (dimensional)
    | 'geometric'         // Ajuste geométrico (curvas, pinzas, sisa, copa)
    | 'descriptive';      // Ajuste descriptivo (cualitativo / artesanal)

export type TechnicalLocationCode =
    | 'center_front'
    | 'center_back'
    | 'side'
    | 'shoulder'
    | 'armhole'
    | 'neckline'
    | 'waist'
    | 'hip'
    | 'hem'
    | 'sleeve'
    | 'sleeve_cap'
    | 'dart'
    | 'length';

export interface TechnicalLocationDefinition {
    code: TechnicalLocationCode;
    label: string;
}

export const TECHNICAL_LOCATIONS: TechnicalLocationDefinition[] = [
    { code: 'center_front', label: 'Centro Delantero' },
    { code: 'center_back', label: 'Centro Espalda' },
    { code: 'side', label: 'Costado' },
    { code: 'shoulder', label: 'Hombro' },
    { code: 'armhole', label: 'Sisa' },
    { code: 'neckline', label: 'Escote' },
    { code: 'waist', label: 'Cintura' },
    { code: 'hip', label: 'Cadera' },
    { code: 'hem', label: 'Ruedo' },
    { code: 'sleeve', label: 'Manga' },
    { code: 'sleeve_cap', label: 'Copa de Manga' },
    { code: 'length', label: 'Largo' },
    { code: 'dart', label: 'Pinza' },
];

export type FittingStatus =
    | 'pending'
    | 'in_fitting'
    | 'adjustments_staged'
    | 'ready_to_regenerate'
    | 'regenerated'
    | 'requires_adjustments'
    | 'approved';

export type PhysicalFittingResult =
    | 'pending'
    | 'in_fitting'
    | 'requires_adjustments'
    | 'approved';

export interface PhysicalFittingSession {
    id: string;
    executionId: string;
    fittingDate: string;
    designer: string;
    status: PhysicalFittingResult;
    generalObservations?: string;
    technicalComment?: string;
    problematicZones: string[];
    recordedAt: string;
}

export type FittingResultType = 'correct' | 'needs_adjustments';
export type AdjustmentDirection = 'increase' | 'decrease';
export type AdjustmentUnit = 'mm' | 'cm';

export interface StructuredAdjustmentItem {
    pieceId?: string;
    pieceName?: string;
    pieceType?: string;
    adjustmentType: AdjustmentType | FitAdjustmentCode;
    location?: string;
    diagnosticZone?: string;
    nature?: AdjustmentNature;
    action?: AdjustmentAction;
    valueMm: number; // Siempre número real finito
    reason?: string;
    note?: string;
    direction?: AdjustmentDirection;
    unit?: AdjustmentUnit;
    recordedBy?: string;
    recordedAt?: string;
}

export interface FittingExecutionSnapshot {
    sourceExecutionId: string;
    fittingDate: string;
    designer: string;
    fittingSession?: PhysicalFittingSession;
    adjustments: StructuredAdjustmentItem[];
}

export interface StructuredPatternAdjustment {
    id?: string;
    piece?: string;
    pieceId?: string;
    pieceName?: string;
    pieceType?: string;
    targetPiece?: string;
    location?: string;
    zone: string;
    diagnosticZone?: string;
    nature?: AdjustmentNature;
    action?: AdjustmentAction;
    adjustmentType: AdjustmentType;
    value: number; // Siempre numérico finito (positivo en valor absoluto)
    unit: AdjustmentUnit;
    direction: AdjustmentDirection;
    motive?: string;
    observation?: string;
    deltaMm?: number;
    recordedBy?: string;
    recordedAt?: string;
}

export interface PatternValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    missingRequiredMeasurements: string[];
    calculatedNotes: string[];
}

export interface PatternExecution {
    id: string;
    client_id?: string | null;
    session_id?: string | null;
    creation_id?: string | null;
    template_id?: string | null;
    parent_execution_id?: string | null;
    garment_type: GarmentType;
    version_label: string;
    engine_version: string;
    status: PatternStatus;
    measurement_snapshot: Record<string, number>; // Códigos de medida normalizados en mm
    ease_profile_snapshot: EaseProfile;
    design_parameters: GarmentDesignParameters;
    seam_allowance_default_mm: number;
    geometry_result: PatternGeometryResult;
    validation_results: PatternValidationResult;
    measurement_provenance?: Record<string, 'real' | 'calculated' | 'estimated'>;
    has_estimated_measurements?: boolean;
    generated_by?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;

    // Relaciones enriquecidas en memoria para expediente y banco de patrones
    client?: {
        id: string;
        full_name: string;
        email?: string | null;
        phone?: string | null;
        city?: string | null;
    } | null;
    creation?: {
        id: string;
        name: string;
        creation_type: string;
        status: string;
    } | null;
    session?: {
        id: string;
        version_number: number;
        session_date: string;
        status: string;
    } | null;
    template?: {
        id: string;
        name: string;
        version: string;
        method_reference?: string;
    } | null;
    adjustments?: PatternAdjustment[];
}

export interface PatternAdjustment {
    id: string;
    execution_id: string;
    adjustment_type: AdjustmentType;
    target_piece: string;
    delta_mm: number;
    description: string;
    fitting_date: string;
    recorded_by?: string | null;
    created_at: string;
}

export interface PatternTemplate {
    id: string;
    garment_type: GarmentType;
    name: string;
    version: string;
    description: string;
    method_reference: string;
    required_measurements: string[];
    optional_measurements: string[];
    default_ease_profile_code?: string;
    variant_key?: string;
    base_garment_type?: GarmentType;
}
