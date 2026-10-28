// ==============================================================================
// ATELIER DIGITAL — SERVICIO: JORNADAS DE MEDICIÓN Y CAPTURA MASIVA (FASE 3)
// Archivo: src/services/measurementCampaignService.ts
// ==============================================================================
// Gestiona el ciclo de vida de jornadas grupales, participantes y digitalización
// con soporte para Supabase y almacén en memoria resiliente.
// ==============================================================================

import { supabase } from '../supabase';
import {
    CreateCampaignDTO,
    MeasurementCampaign,
    MeasurementCampaignParticipant,
    ParticipantCaptureStatus,
    SaveParticipantCaptureDTO,
    UpdateCampaignDTO,
} from '../types/pattern/measurementCampaign';
import { MeasurementSession, MeasurementUnit } from '../types/pattern/measurement';
import { createMeasurementSession, MeasurementInputRecord } from './measurementService';
import { fetchGroupMembers, fetchClientGroups } from './personGroupService';
import { getMeasurementTemplateById } from '../engine/pattern/catalog/measurementTemplates';

// Almacén en memoria resiliente para pruebas y offline
const localCampaignsStore = new Map<string, MeasurementCampaign>();
const localParticipantsStore = new Map<string, MeasurementCampaignParticipant[]>(); // campaignId -> participants

/**
 * Consulta las jornadas de medición asociadas a un cliente responsable.
 */
export async function fetchClientCampaigns(clientId: string): Promise<MeasurementCampaign[]> {
    try {
        const { data, error } = await supabase
            .from('measurement_campaigns')
            .select('*')
            .eq('client_id', clientId)
            .order('campaign_date', { ascending: false });

        if (error || !data) {
            return Array.from(localCampaignsStore.values()).filter((c) => c.client_id === clientId);
        }

        const campaigns: MeasurementCampaign[] = [...data];
        for (const camp of campaigns) {
            const parts = await fetchCampaignParticipants(camp.id);
            camp.total_participants = parts.length;
            camp.completed_count = parts.filter((p) => p.status === 'completed').length;
            camp.in_progress_count = parts.filter((p) => p.status === 'in_progress').length;
            camp.pending_count = parts.filter((p) => p.status === 'pending').length;
            camp.progress_percentage =
                parts.length > 0 ? Math.round((camp.completed_count / parts.length) * 100) : 0;

            const tmpl = getMeasurementTemplateById(camp.template_id);
            camp.template_name = tmpl ? tmpl.name : camp.template_id;
        }

        return campaigns;
    } catch {
        return Array.from(localCampaignsStore.values()).filter((c) => c.client_id === clientId);
    }
}

/**
 * Obtiene el detalle de una jornada por su ID con sus estadísticas actualizadas.
 */
export async function fetchCampaignById(campaignId: string): Promise<MeasurementCampaign | null> {
    try {
        const { data, error } = await supabase
            .from('measurement_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        let camp: MeasurementCampaign | null = data;
        if (error || !camp) {
            camp = localCampaignsStore.get(campaignId) || null;
        }

        if (!camp) return null;

        const parts = await fetchCampaignParticipants(camp.id);
        camp.total_participants = parts.length;
        camp.completed_count = parts.filter((p) => p.status === 'completed').length;
        camp.in_progress_count = parts.filter((p) => p.status === 'in_progress').length;
        camp.pending_count = parts.filter((p) => p.status === 'pending').length;
        camp.progress_percentage =
            parts.length > 0 ? Math.round((camp.completed_count / parts.length) * 100) : 0;

        const tmpl = getMeasurementTemplateById(camp.template_id);
        camp.template_name = tmpl ? tmpl.name : camp.template_id;

        return camp;
    } catch {
        return localCampaignsStore.get(campaignId) || null;
    }
}

/**
 * Crea una nueva jornada de medición e inicializa automáticamente los participantes
 * a partir de los miembros activos del grupo seleccionado.
 */
export async function createCampaign(
    dto: CreateCampaignDTO
): Promise<{ data: MeasurementCampaign | null; error: string | null }> {
    try {
        const now = new Date().toISOString();
        const campaignDate = dto.campaign_date || now.split('T')[0];
        const tmpl = getMeasurementTemplateById(dto.template_id);

        const { data: dbData, error: dbError } = await supabase
            .from('measurement_campaigns')
            .insert({
                client_id: dto.client_id,
                group_id: dto.group_id,
                title: dto.title.trim(),
                campaign_date: campaignDate,
                template_id: dto.template_id,
                mode: dto.mode || 'standard_with_adjustments',
                status: 'draft',
                unit_system: dto.unit_system || 'cm',
                notes: dto.notes?.trim() || null,
            })
            .select()
            .single();

        let campaign: MeasurementCampaign;
        if (dbError || !dbData) {
            // Guardar en almacén local
            campaign = {
                id: `campaign-local-${Date.now()}`,
                client_id: dto.client_id,
                group_id: dto.group_id,
                title: dto.title.trim(),
                campaign_date: campaignDate,
                template_id: dto.template_id,
                template_name: tmpl?.name || dto.template_id,
                mode: dto.mode || 'standard_with_adjustments',
                status: 'draft',
                unit_system: dto.unit_system || 'cm',
                notes: dto.notes?.trim() || null,
                created_at: now,
                updated_at: now,
                total_participants: 0,
                completed_count: 0,
                pending_count: 0,
                in_progress_count: 0,
                progress_percentage: 0,
            };
            localCampaignsStore.set(campaign.id, campaign);
        } else {
            campaign = dbData;
        }

        // Obtener miembros del grupo para inicializar participantes
        const members = await fetchGroupMembers(dto.group_id);
        const participantEntries: MeasurementCampaignParticipant[] = [];

        for (const person of members) {
            const partId = `part-${campaign.id}-${person.id}`;
            const part: MeasurementCampaignParticipant = {
                id: partId,
                campaign_id: campaign.id,
                person_id: person.id,
                person: person,
                session_id: null,
                status: 'pending',
                standard_size: null,
                captured_values: {},
                notes: null,
                completed_at: null,
                created_at: now,
                updated_at: now,
            };

            // Intentar inserción en DB si no fue fallback
            if (!campaign.id.startsWith('campaign-local-')) {
                await supabase.from('measurement_campaign_participants').insert({
                    campaign_id: campaign.id,
                    person_id: person.id,
                    status: 'pending',
                    captured_values: {},
                });
            }

            participantEntries.push(part);
        }

        localParticipantsStore.set(campaign.id, participantEntries);
        campaign.total_participants = participantEntries.length;
        campaign.pending_count = participantEntries.length;
        campaign.completed_count = 0;
        campaign.in_progress_count = 0;
        campaign.progress_percentage = 0;

        return { data: campaign, error: null };
    } catch (err: any) {
        return { data: null, error: err?.message || 'Error creando jornada de medición.' };
    }
}

export const createMeasurementCampaign = createCampaign;

/**
 * Consulta los participantes de una jornada con sus datos anatómicos y estado de captura.
 */
export async function fetchCampaignParticipants(
    campaignId: string
): Promise<MeasurementCampaignParticipant[]> {
    try {
        const { data, error } = await supabase
            .from('measurement_campaign_participants')
            .select('*, persons(*)')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: true });

        if (error || !data) {
            return localParticipantsStore.get(campaignId) || [];
        }

        const participants: MeasurementCampaignParticipant[] = data.map((d: any) => ({
            id: d.id,
            campaign_id: d.campaign_id,
            person_id: d.person_id,
            person: d.persons || undefined,
            session_id: d.session_id,
            status: d.status,
            standard_size: d.standard_size,
            captured_values: d.captured_values || {},
            notes: d.notes,
            completed_at: d.completed_at,
            created_at: d.created_at,
            updated_at: d.updated_at,
        }));

        localParticipantsStore.set(campaignId, participants);
        return participants;
    } catch {
        return localParticipantsStore.get(campaignId) || [];
    }
}

/**
 * Registra o actualiza la captura de medidas de una persona en la jornada,
 * generando opcionalmente la sesión de medidas individual inmutable en la base de datos.
 */
export async function saveParticipantCapture(
    dto: SaveParticipantCaptureDTO
): Promise<{ success: boolean; session?: MeasurementSession; error?: string }> {
    try {
        const now = new Date().toISOString();
        const campaign = await fetchCampaignById(dto.campaign_id);
        if (!campaign) {
            return { success: false, error: 'Jornada no encontrada.' };
        }

        const tmpl = getMeasurementTemplateById(campaign.template_id);
        const unit = dto.unit_system || campaign.unit_system || 'cm';

        // 1. Si se completan las medidas o hay valores numéricos, sincronizar/crear la sesión individual
        let createdSession: MeasurementSession | undefined;
        const hasValues = Object.keys(dto.captured_values).length > 0;

        if (hasValues) {
            const sessionNotes = [
                `[JORNADA: ${campaign.title}]`,
                `[PLANTILLA: ${tmpl?.name || campaign.template_id}]`,
                dto.standard_size ? `[TALLA REF: ${dto.standard_size}]` : null,
                dto.notes?.trim() ? `Observaciones: ${dto.notes.trim()}` : null,
            ]
                .filter(Boolean)
                .join(' · ');

            const sessRes = await createMeasurementSession(
                campaign.client_id,
                unit,
                sessionNotes,
                dto.captured_values as Record<string, number | MeasurementInputRecord>,
                dto.status === 'completed' ? 'completed' : 'draft',
                undefined,
                dto.person_id
            );

            if (sessRes.success && sessRes.session) {
                createdSession = sessRes.session;
            }
        }

        // 2. Persistir en la tabla de participantes
        const updatePayload: any = {
            status: dto.status,
            standard_size: dto.standard_size || null,
            captured_values: dto.captured_values,
            notes: dto.notes?.trim() || null,
            session_id: createdSession?.id || null,
            completed_at: dto.status === 'completed' ? now : null,
            updated_at: now,
        };

        const { error: dbError } = await supabase
            .from('measurement_campaign_participants')
            .update(updatePayload)
            .match({ campaign_id: dto.campaign_id, person_id: dto.person_id });

        // 3. Actualizar almacén local
        const parts = localParticipantsStore.get(dto.campaign_id) || [];
        const partIndex = parts.findIndex((p) => p.person_id === dto.person_id);
        if (partIndex >= 0) {
            parts[partIndex] = {
                ...parts[partIndex],
                ...updatePayload,
            };
            localParticipantsStore.set(dto.campaign_id, [...parts]);
        }

        // 4. Actualizar estado de la jornada si está en 'draft' y se inicia captura
        if (campaign.status === 'draft') {
            await supabase
                .from('measurement_campaigns')
                .update({ status: 'in_progress', updated_at: now })
                .eq('id', campaign.id);
            campaign.status = 'in_progress';
            localCampaignsStore.set(campaign.id, campaign);
        }

        return { success: true, session: createdSession };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Error guardando captura de participante.' };
    }
}
