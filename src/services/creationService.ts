// ==============================================================================
// ATELIER DIGITAL — SERVICIO: MÓDULO DE CREACIONES (FASE 2)
// Archivo: src/services/creationService.ts
// ==============================================================================
// Gestiona el ciclo de vida de los encargos y proyectos de alta costura de
// las clientas, garantizando su total independencia del patronaje CAD paramétrico.
// ==============================================================================

import { supabase } from '../supabase';
import {
    Creation,
    CreationFilter,
    CreationStatus,
    CreationValidationResult,
    CreateCreationDTO,
    UpdateCreationDTO,
} from '../types/creation';
import { Client } from '../types/client';
import { MeasuredPerson } from '../types/personGroup';
import { MeasurementSession } from '../types/pattern/measurement';
import { PatternExecution } from '../types/pattern/pattern';

/**
 * Valida los datos esenciales de una Creación de Atelier.
 */
export function validateCreationData(data: Partial<CreateCreationDTO>): CreationValidationResult {
    const errors: Record<string, string> = {};

    if (!data.client_id || data.client_id.trim().length === 0) {
        errors.client_id = 'Debe seleccionar una clienta obligatoriamente.';
    }

    if (!data.name || data.name.trim().length === 0) {
        errors.name = 'El nombre o título de la creación es obligatorio.';
    } else if (data.name.trim().length < 3) {
        errors.name = 'El nombre de la creación debe tener al menos 3 caracteres.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Consulta la lista de creaciones del atelier con soporte para filtros de estado,
 * clienta y búsqueda en texto.
 */
export async function fetchCreations(
    filter?: CreationFilter
): Promise<{ data: Creation[]; error: string | null }> {
    try {
        let query = supabase
            .from('creations')
            .select(`
                *,
                client:clients (
                    id,
                    full_name,
                    email,
                    phone,
                    city,
                    style_preferences
                ),
                session:measurement_sessions!creations_session_id_fkey (
                    id,
                    session_date,
                    status,
                    unit_system,
                    version_number
                )
            `)
            .order('created_at', { ascending: false });

        if (filter?.status && filter.status !== 'all') {
            query = query.eq('status', filter.status);
        }

        if (filter?.clientId) {
            query = query.eq('client_id', filter.clientId);
        }

        if (filter?.personId) {
            query = query.eq('person_id', filter.personId);
        }

        if (filter?.creationType && filter.creationType !== 'all') {
            query = query.eq('creation_type', filter.creationType);
        }

        const { data, error } = await query;

        let creations: Creation[] = [];

        if (error) {
            // Si la relación anidada de sesión falla, intentar select con join directo a clients
            console.warn('[CreationService] Fallback a query select con enriquecimiento en memoria:', error.message);
            const fallbackQuery = await supabase
                .from('creations')
                .select(`
                    *,
                    client:clients (
                        id,
                        full_name,
                        email,
                        phone,
                        city,
                        style_preferences
                    )
                `)
                .order('created_at', { ascending: false });

            if (fallbackQuery.error || !fallbackQuery.data) {
                // Último recurso: select plano
                const simpleQuery = await supabase
                    .from('creations')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (simpleQuery.error) {
                    return { data: [], error: simpleQuery.error.message };
                }
                creations = (simpleQuery.data || []) as Creation[];
            } else {
                creations = (fallbackQuery.data || []) as Creation[];
            }
        } else {
            creations = (data || []) as Creation[];
        }

        // Enriquecer en lote patrones activos y ejecuciones para cada creación
        if (creations.length > 0) {
            try {
                const activePatternIds = creations
                    .map((c) => c.active_pattern_execution_id)
                    .filter(Boolean) as string[];
                const creationIds = creations.map((c) => c.id);

                const [activePatternsRes, allExecsRes] = await Promise.all([
                    activePatternIds.length > 0
                        ? supabase
                              .from('pattern_executions')
                              .select('id, version_label, status, garment_type, created_at, notes')
                              .in('id', activePatternIds)
                        : { data: [] },
                    creationIds.length > 0
                        ? supabase
                              .from('pattern_executions')
                              .select('id, creation_id, version_label, status, garment_type, parent_execution_id, created_at')
                              .in('creation_id', creationIds)
                              .order('created_at', { ascending: false })
                        : { data: [] },
                ]);

                const activeMap = new Map(
                    (activePatternsRes.data || []).map((p: any) => [p.id, p as PatternExecution])
                );
                const execsByCreation = new Map<string, PatternExecution[]>();
                (allExecsRes.data || []).forEach((e: any) => {
                    if (!execsByCreation.has(e.creation_id)) {
                        execsByCreation.set(e.creation_id, []);
                    }
                    execsByCreation.get(e.creation_id)!.push(e as PatternExecution);
                });

                creations = creations.map((c) => {
                    const execs = execsByCreation.get(c.id) || [];
                    const active = c.active_pattern_execution_id
                        ? activeMap.get(c.active_pattern_execution_id) || (execs.find((e) => e.status === 'approved_by_designer') || execs[0])
                        : (execs.find((e) => e.status === 'approved_by_designer') || execs[0]);

                    return {
                        ...c,
                        active_pattern: active || undefined,
                        pattern_executions: execs,
                        patterns_count: execs.length > 0 ? 1 : 0, // 1 patrón lógico
                        total_executions_count: execs.length,
                    };
                });
            } catch (enrichErr) {
                console.warn('[CreationService] Error no bloqueante al enriquecer patrones:', enrichErr);
            }
        }

        // Enriquecer personas medidas asociadas en lote
        if (creations.length > 0) {
            const personIds = Array.from(new Set(creations.map((c) => c.person_id).filter(Boolean))) as string[];
            if (personIds.length > 0) {
                try {
                    const { data: personsData } = await supabase
                        .from('persons')
                        .select('*')
                        .in('id', personIds);
                    if (personsData) {
                        const pMap = new Map((personsData as any[]).map((p) => [p.id, p as MeasuredPerson]));
                        creations = creations.map((c) => ({
                            ...c,
                            person: c.person_id ? pMap.get(c.person_id) : undefined,
                        }));
                    }
                } catch (pErr) {
                    console.warn('[CreationService] Error no bloqueante al enriquecer personas:', pErr);
                }
            }
        }

        // Filtrado en memoria de búsqueda rápida
        if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
            const term = filter.searchQuery.toLowerCase().trim();
            creations = creations.filter((c) => {
                const nameMatch = c.name?.toLowerCase().includes(term);
                const descMatch = c.description?.toLowerCase().includes(term);
                const occasionMatch = c.occasion?.toLowerCase().includes(term);
                const clientMatch = c.client?.full_name?.toLowerCase().includes(term);
                return nameMatch || descMatch || occasionMatch || clientMatch;
            });
        }

        return { data: creations, error: null };
    } catch (err: any) {
        console.error('[CreationService] Error inesperado en fetchCreations:', err);
        return { data: [], error: err.message || 'Error inesperado al consultar creaciones.' };
    }
}

/**
 * Consulta el detalle completo de una Creación por ID, incluyendo
 * su clienta, sesión de medidas y todas las ejecuciones de patrones vinculadas.
 */
export async function fetchCreationById(
    id: string
): Promise<{ data: Creation | null; error: string | null }> {
    try {
        const { data: creationData, error } = await supabase
            .from('creations')
            .select('*')
            .eq('id', id)
            .single();

        const creation = Array.isArray(creationData) ? creationData[0] : creationData;

        if (error || !creation) {
            return { data: null, error: error?.message || 'Creación no encontrada.' };
        }

        // 1. Cargar Clienta
        let clientData: Client | undefined;
        if (creation.client_id) {
            const { data: c } = await supabase
                .from('clients')
                .select('*')
                .eq('id', creation.client_id)
                .single();
            if (c) clientData = c as Client;
        }

        // 1.1 Cargar Persona si está asignada
        let personData: MeasuredPerson | undefined;
        if (creation.person_id) {
            const { data: p } = await supabase
                .from('persons')
                .select('*')
                .eq('id', creation.person_id)
                .single();
            if (p) personData = p as MeasuredPerson;
        }

        // 2. Cargar Sesión de Medidas si está asignada
        let sessionData: MeasurementSession | undefined;
        if (creation.session_id) {
            const { data: s } = await supabase
                .from('measurement_sessions')
                .select('*')
                .eq('id', creation.session_id)
                .single();
            if (s) sessionData = s as MeasurementSession;
        }

        // 3. Cargar Patrones asociados a esta Creación (historial)
        let patternExecutions: PatternExecution[] = [];
        const { data: patterns } = await supabase
            .from('pattern_executions')
            .select('*')
            .eq('creation_id', id)
            .order('created_at', { ascending: false });

        if (patterns) {
            patternExecutions = patterns as PatternExecution[];
        }

        // 4. Identificar Patrón Activo
        let activePattern: PatternExecution | undefined;
        if (creation.active_pattern_execution_id) {
            activePattern = patternExecutions.find((p) => p.id === creation.active_pattern_execution_id);
            if (!activePattern) {
                const { data: p } = await supabase
                    .from('pattern_executions')
                    .select('*')
                    .eq('id', creation.active_pattern_execution_id)
                    .single();
                if (p) activePattern = p as PatternExecution;
            }
        }

        const fullCreation: Creation = {
            ...creation,
            client: clientData,
            person: personData,
            session: sessionData,
            active_pattern: activePattern,
            pattern_executions: patternExecutions,
            patterns_count: patternExecutions.length > 0 ? 1 : 0,
            total_executions_count: patternExecutions.length,
        };

        return { data: fullCreation, error: null };
    } catch (err: any) {
        console.error('[CreationService] Error al consultar detalle de creación:', err);
        return { data: null, error: err.message || 'Error al obtener la creación.' };
    }
}

/**
 * Registra una nueva Creación de alta costura para una clienta.
 * Puede crearse perfectamente sin sesión de medidas y sin patrón CAD.
 */
export async function createCreation(
    dto: CreateCreationDTO
): Promise<{ data: Creation | null; error: string | null }> {
    const val = validateCreationData(dto);
    if (!val.isValid) {
        const firstErr = Object.values(val.errors)[0];
        return { data: null, error: firstErr };
    }

    try {
        const { data: userData } = await supabase.auth.getUser();
        const cleanDate = (dto.target_date && typeof dto.target_date === 'string' && dto.target_date.trim().match(/^\d{4}-\d{2}-\d{2}$/))
            ? dto.target_date.trim()
            : null;

        const insertPayload: any = {
            client_id: dto.client_id,
            person_id: dto.person_id || null,
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
            creation_type: dto.creation_type || 'bespoke',
            status: dto.status || 'draft',
            occasion: dto.occasion?.trim() || null,
            garment_type: dto.garment_type || null,
            target_date: cleanDate,
            session_id: dto.session_id || null,
            active_pattern_execution_id: null,
            notes: dto.notes?.trim() || null,
        };

        if (userData?.user?.id) {
            insertPayload.created_by = userData.user.id;
        }

        const { data, error } = await supabase
            .from('creations')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            console.error('[CreationService] Error al crear creación:', error.message);
            return { data: null, error: error.message };
        }

        return { data: data as Creation, error: null };
    } catch (err: any) {
        console.error('[CreationService] Error inesperado en createCreation:', err);
        return { data: null, error: err.message || 'Error al guardar la creación.' };
    }
}

/**
 * Actualiza la información de una Creación (datos estéticos, notas, ocasión, etc.).
 */
export async function updateCreation(
    id: string,
    dto: UpdateCreationDTO
): Promise<{ data: Creation | null; error: string | null }> {
    try {
        const updatePayload: any = {
            updated_at: new Date().toISOString(),
        };

        if (dto.name !== undefined) updatePayload.name = dto.name.trim();
        if (dto.person_id !== undefined) updatePayload.person_id = dto.person_id || null;
        if (dto.description !== undefined) updatePayload.description = dto.description?.trim() || null;
        if (dto.creation_type !== undefined) updatePayload.creation_type = dto.creation_type;
        if (dto.status !== undefined) updatePayload.status = dto.status;
        if (dto.occasion !== undefined) updatePayload.occasion = dto.occasion?.trim() || null;
        if (dto.garment_type !== undefined) updatePayload.garment_type = dto.garment_type || null;
        if (dto.target_date !== undefined) updatePayload.target_date = dto.target_date || null;
        if (dto.session_id !== undefined) updatePayload.session_id = dto.session_id || null;
        if (dto.active_pattern_execution_id !== undefined) updatePayload.active_pattern_execution_id = dto.active_pattern_execution_id || null;
        if (dto.notes !== undefined) updatePayload.notes = dto.notes?.trim() || null;

        const { data, error } = await supabase
            .from('creations')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as Creation, error: null };
    } catch (err: any) {
        return { data: null, error: err.message || 'Error al actualizar la creación.' };
    }
}

/**
 * Actualiza el estado de una creación (draft -> active -> fitting -> approved -> etc.).
 */
export async function updateCreationStatus(
    id: string,
    status: CreationStatus
): Promise<{ data: Creation | null; error: string | null }> {
    return updateCreation(id, { status });
}

/**
 * Vincula una sesión de medidas a una Creación.
 */
export async function linkSessionToCreation(
    creationId: string,
    sessionId: string | null
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error: creationErr } = await supabase
            .from('creations')
            .update({ session_id: sessionId, updated_at: new Date().toISOString() })
            .eq('id', creationId);

        if (creationErr) {
            return { success: false, error: creationErr.message };
        }

        // Opcional: etiquetar también la sesión con creation_id si la columna existe
        if (sessionId) {
            await supabase
                .from('measurement_sessions')
                .update({ creation_id: creationId })
                .eq('id', sessionId);
        }

        return { success: true, error: null };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al vincular sesión de medidas.' };
    }
}

/**
 * Alias explícito de vinculación de sesión de medidas para pruebas arquitectónicas y contratos.
 */
export const linkMeasurementSessionToCreation = linkSessionToCreation;

/**
 * Vincula una ejecución de patrón a la Creación y la establece como el patrón activo.
 */
export async function linkPatternExecutionToCreation(
    creationId: string,
    executionId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        // 1. Actualizar el active_pattern_execution_id en la creación
        const { error: creationErr } = await supabase
            .from('creations')
            .update({
                active_pattern_execution_id: executionId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', creationId);

        if (creationErr) {
            return { success: false, error: creationErr.message };
        }

        // 2. Asociar creation_id a la ejecución de patrón
        await supabase
            .from('pattern_executions')
            .update({ creation_id: creationId })
            .eq('id', executionId);

        return { success: true, error: null };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al vincular patrón a la creación.' };
    }
}

/**
 * Elimina una creación del atelier (disponible para el rol administrador).
 */
export async function deleteCreation(
    id: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('creations')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        return { success: false, error: err.message || 'Error al eliminar la creación.' };
    }
}
