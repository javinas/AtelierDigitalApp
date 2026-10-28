// ==============================================================================
// ATELIER DIGITAL — TIPOS: MÓDULO DE CREACIONES (FASE 2)
// Archivo: src/types/creation.ts
// ==============================================================================
// Representa el encargo, proyecto o pieza de alta costura para una clienta,
// completamente desacoplado del motor paramétrico de patronaje CAD.
// ==============================================================================

import { Client } from './client';
import { MeasuredPerson } from './personGroup';
import { MeasurementSession } from './pattern/measurement';
import { GarmentType, PatternExecution } from './pattern/pattern';

export type CreationStatus =
    | 'draft'          // Borrador inicial del encargo / ideación
    | 'active'         // Proyecto activo en desarrollo de diseño
    | 'fitting'        // En proceso de pruebas de vestuario sobre clienta
    | 'approved'       // Aprobada por Katherine Carroll y la clienta
    | 'production'     // En corte y confección final de taller
    | 'completed'      // Prenda entregada con satisfacción
    | 'cancelled';     // Encargo cancelado o archivado

export type CreationType =
    | 'bespoke'             // Alta costura a medida (custom couture)
    | 'pret_a_couture'      // Prêt-à-Couture
    | 'couture_collection'  // Pieza de colección atelier
    | 'bridal'              // Vestidos de novia y nupcial
    | 'gala'                // Trajes de fiesta y alfombra roja
    | 'corporate'           // Sastrería e imagen corporativa de autor
    | 'fantasy'             // Vestuario teatral, comparsas y carnaval
    | 'alteration';         // Transformación y alta costura restaurativa

export interface Creation {
    id: string;
    client_id: string;
    person_id?: string | null;
    name: string;
    description?: string | null;
    creation_type: CreationType;
    status: CreationStatus;
    occasion?: string | null;
    garment_type?: GarmentType | string | null;
    target_date?: string | null;
    session_id?: string | null;
    active_pattern_execution_id?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;

    // Relaciones enriquecidas en memoria
    client?: Client;
    person?: MeasuredPerson;
    session?: MeasurementSession;
    active_pattern?: PatternExecution;
    pattern_executions?: PatternExecution[];
    patterns_count?: number;
    total_executions_count?: number;
}

export interface CreateCreationDTO {
    client_id: string;
    person_id?: string | null;
    name: string;
    description?: string | null;
    creation_type?: CreationType;
    status?: CreationStatus;
    occasion?: string | null;
    garment_type?: GarmentType | string | null;
    target_date?: string | null;
    session_id?: string | null;
    notes?: string | null;
}

export interface UpdateCreationDTO {
    name?: string;
    person_id?: string | null;
    description?: string | null;
    creation_type?: CreationType;
    status?: CreationStatus;
    occasion?: string | null;
    garment_type?: GarmentType | string | null;
    target_date?: string | null;
    session_id?: string | null;
    active_pattern_execution_id?: string | null;
    notes?: string | null;
}

export interface CreationFilter {
    status?: CreationStatus | 'all';
    clientId?: string;
    personId?: string;
    creationType?: CreationType | 'all';
    searchQuery?: string;
}

export interface CreationValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}
