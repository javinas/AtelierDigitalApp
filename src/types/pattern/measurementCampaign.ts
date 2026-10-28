// ==============================================================================
// ATELIER DIGITAL — TIPOS: JORNADAS DE MEDICIÓN Y CAPTURA MASIVA (FASE 3)
// Archivo: src/types/pattern/measurementCampaign.ts
// ==============================================================================
// Permite a la diseñadora organizar tomas de medidas para múltiples personas
// de un mismo responsable/grupo (colegio, familia, dotación, comparsa)
// utilizando las plantillas estables de MeasurementTemplate.
// ==============================================================================

import { MeasurementUnit } from './measurement';
import { MeasurementUsageMode } from './measurementTemplate';
import { MeasuredPerson } from '../personGroup';

export type MeasurementCampaignStatus =
    | 'draft'        // En preparación / fichas impresas
    | 'in_progress'  // En proceso de toma y digitalización
    | 'completed'    // Finalizada y verificada
    | 'archived';    // Archivada para consulta histórica

export type ParticipantCaptureStatus =
    | 'pending'      // Pendiente de toma
    | 'in_progress'  // Borrador iniciado con datos parciales
    | 'completed';   // Medidas completadas y digitalizadas

export interface MeasurementCampaign {
    id: string;
    client_id: string;      // Cliente responsable comercial
    group_id: string;       // Grupo / Núcleo objetivo
    group_name?: string;    // Nombre del grupo cargado en memoria
    title: string;          // Nombre/referencia (ej. "Toma de Medidas Prom 2027")
    campaign_date: string;  // Fecha YYYY-MM-DD
    template_id: string;    // ID de la MeasurementTemplate activa
    template_name?: string; // Nombre de la plantilla
    mode: MeasurementUsageMode; // Modalidad por defecto
    status: MeasurementCampaignStatus;
    unit_system: MeasurementUnit;
    notes?: string | null;
    created_at: string;
    updated_at: string;

    // Métricas calculadas
    total_participants?: number;
    pending_count?: number;
    in_progress_count?: number;
    completed_count?: number;
    progress_percentage?: number;
}

export interface MeasurementCampaignParticipant {
    id: string;
    campaign_id: string;
    person_id: string;
    person?: MeasuredPerson;
    session_id?: string | null; // Sesión de medidas individual creada
    status: ParticipantCaptureStatus;
    standard_size?: string | null; // Talla estándar cargada (ej: 'M', '8', '12M')
    captured_values: Record<string, number | { value: number; source: string; confidence: string }>; // Almacenado
    notes?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateCampaignDTO {
    client_id: string;
    group_id: string;
    title: string;
    campaign_date?: string;
    template_id: string;
    mode?: MeasurementUsageMode;
    unit_system?: MeasurementUnit;
    notes?: string | null;
}

export interface UpdateCampaignDTO {
    title?: string;
    campaign_date?: string;
    template_id?: string;
    mode?: MeasurementUsageMode;
    status?: MeasurementCampaignStatus;
    unit_system?: MeasurementUnit;
    notes?: string | null;
}

export interface SaveParticipantCaptureDTO {
    campaign_id: string;
    person_id: string;
    status: ParticipantCaptureStatus;
    standard_size?: string | null;
    captured_values: Record<string, number | { value: number; source: string; confidence: string }>;
    notes?: string | null;
    unit_system?: MeasurementUnit;
}
