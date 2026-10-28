// ==============================================================================
// ATELIER DIGITAL — SERVICIO: PERSONAS MEDIDAS Y GRUPOS / NÚCLEOS (FASE 1)
// Archivo: src/services/personGroupService.ts
// ==============================================================================
// Gestiona el ciclo de vida de sujetos medidos y agrupaciones bajo un cliente
// responsable, con soporte para Supabase y fallback local resiliente.
// ==============================================================================

import { supabase } from '../supabase';
import {
    CreateGroupDTO,
    CreatePersonDTO,
    GroupMember,
    MeasurementGroup,
    MeasuredPerson,
    UpdateGroupDTO,
    UpdatePersonDTO,
} from '../types/personGroup';
import { MeasurementSession } from '../types/pattern/measurement';

// Almacén en memoria para entornos offline y pruebas automáticas
const localPersonsStore = new Map<string, MeasuredPerson>();
const localGroupsStore = new Map<string, MeasurementGroup>();
const localMembersStore = new Map<string, GroupMember[]>(); // groupId -> members

export async function fetchClientPersons(clientId: string): Promise<MeasuredPerson[]> {
    try {
        const { data, error } = await supabase
            .from('persons')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (error || !data) {
            // Retornar del almacén local
            return Array.from(localPersonsStore.values()).filter((p) => p.client_id === clientId);
        }

        // Consultar sesiones para asociar última sesión y conteo
        const personsList: MeasuredPerson[] = [...data];
        for (const person of personsList) {
            const { data: sessData } = await supabase
                .from('measurement_sessions')
                .select('id, session_date, version_number, status')
                .eq('person_id', person.id)
                .order('version_number', { ascending: false })
                .limit(1);

            if (sessData && sessData.length > 0) {
                person.last_session_id = sessData[0].id;
                person.last_session_date = sessData[0].session_date;
                person.last_session_version = sessData[0].version_number;
                person.last_session_status = sessData[0].status;
            }
        }

        return personsList;
    } catch {
        return Array.from(localPersonsStore.values()).filter((p) => p.client_id === clientId);
    }
}

export async function createPerson(
    dto: CreatePersonDTO
): Promise<{ data: MeasuredPerson | null; error: string | null }> {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('persons')
            .insert({
                client_id: dto.client_id,
                full_name: dto.full_name.trim(),
                demographic_category: dto.demographic_category,
                reference_id: dto.reference_id?.trim() || null,
                birth_date: dto.birth_date || null,
                notes: dto.notes?.trim() || null,
                is_active: dto.is_active !== undefined ? dto.is_active : true,
            })
            .select()
            .single();

        if (error || !data) {
            // Fallback local
            const id = 'person-' + Math.random().toString(36).substring(2, 9);
            const newPerson: MeasuredPerson = {
                id,
                client_id: dto.client_id,
                full_name: dto.full_name.trim(),
                demographic_category: dto.demographic_category,
                reference_id: dto.reference_id?.trim() || null,
                birth_date: dto.birth_date || null,
                notes: dto.notes?.trim() || null,
                is_active: dto.is_active !== undefined ? dto.is_active : true,
                created_at: now,
                updated_at: now,
                sessions_count: 0,
            };
            localPersonsStore.set(id, newPerson);
            return { data: newPerson, error: null };
        }

        localPersonsStore.set(data.id, data);
        return { data: data as MeasuredPerson, error: null };
    } catch (err: any) {
        const now = new Date().toISOString();
        const id = 'person-' + Math.random().toString(36).substring(2, 9);
        const newPerson: MeasuredPerson = {
            id,
            client_id: dto.client_id,
            full_name: dto.full_name.trim(),
            demographic_category: dto.demographic_category,
            reference_id: dto.reference_id?.trim() || null,
            birth_date: dto.birth_date || null,
            notes: dto.notes?.trim() || null,
            is_active: dto.is_active !== undefined ? dto.is_active : true,
            created_at: now,
            updated_at: now,
            sessions_count: 0,
        };
        localPersonsStore.set(id, newPerson);
        return { data: newPerson, error: null };
    }
}

export async function updatePerson(
    id: string,
    dto: UpdatePersonDTO
): Promise<{ data: MeasuredPerson | null; error: string | null }> {
    try {
        const now = new Date().toISOString();
        const updatePayload: any = { updated_at: now };
        if (dto.full_name !== undefined) updatePayload.full_name = dto.full_name.trim();
        if (dto.demographic_category !== undefined) updatePayload.demographic_category = dto.demographic_category;
        if (dto.reference_id !== undefined) updatePayload.reference_id = dto.reference_id ? dto.reference_id.trim() : null;
        if (dto.birth_date !== undefined) updatePayload.birth_date = dto.birth_date;
        if (dto.notes !== undefined) updatePayload.notes = dto.notes ? dto.notes.trim() : null;
        if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;

        const { data, error } = await supabase
            .from('persons')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            const existing = localPersonsStore.get(id);
            if (existing) {
                const updated: MeasuredPerson = { ...existing, ...updatePayload };
                localPersonsStore.set(id, updated);
                return { data: updated, error: null };
            }
            return { data: null, error: error?.message || 'Persona no encontrada' };
        }

        localPersonsStore.set(data.id, data);
        return { data: data as MeasuredPerson, error: null };
    } catch (err: any) {
        const existing = localPersonsStore.get(id);
        if (existing) {
            const updated: MeasuredPerson = { ...existing, ...dto, updated_at: new Date().toISOString() };
            localPersonsStore.set(id, updated);
            return { data: updated, error: null };
        }
        return { data: null, error: err?.message || 'Error actualizando persona' };
    }
}

export async function fetchClientGroups(clientId: string): Promise<MeasurementGroup[]> {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (error || !data) {
            const list = Array.from(localGroupsStore.values()).filter((g) => g.client_id === clientId);
            return list.map((g) => ({
                ...g,
                members_count: (localMembersStore.get(g.id) || []).length,
            }));
        }

        const groupsList: MeasurementGroup[] = [...data];
        for (const group of groupsList) {
            const { count } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id);
            group.members_count = count || 0;
        }

        return groupsList;
    } catch {
        const list = Array.from(localGroupsStore.values()).filter((g) => g.client_id === clientId);
        return list.map((g) => ({
            ...g,
            members_count: (localMembersStore.get(g.id) || []).length,
        }));
    }
}

export async function createGroup(
    dto: CreateGroupDTO
): Promise<{ data: MeasurementGroup | null; error: string | null }> {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('groups')
            .insert({
                client_id: dto.client_id,
                name: dto.name.trim(),
                type: dto.type,
                notes: dto.notes?.trim() || null,
                is_active: dto.is_active !== undefined ? dto.is_active : true,
            })
            .select()
            .single();

        if (error || !data) {
            const id = 'group-' + Math.random().toString(36).substring(2, 9);
            const newGroup: MeasurementGroup = {
                id,
                client_id: dto.client_id,
                name: dto.name.trim(),
                type: dto.type,
                notes: dto.notes?.trim() || null,
                is_active: dto.is_active !== undefined ? dto.is_active : true,
                created_at: now,
                updated_at: now,
                members_count: 0,
            };
            localGroupsStore.set(id, newGroup);
            return { data: newGroup, error: null };
        }

        localGroupsStore.set(data.id, data);
        return { data: data as MeasurementGroup, error: null };
    } catch (err: any) {
        const now = new Date().toISOString();
        const id = 'group-' + Math.random().toString(36).substring(2, 9);
        const newGroup: MeasurementGroup = {
            id,
            client_id: dto.client_id,
            name: dto.name.trim(),
            type: dto.type,
            notes: dto.notes?.trim() || null,
            is_active: dto.is_active !== undefined ? dto.is_active : true,
            created_at: now,
            updated_at: now,
            members_count: 0,
        };
        localGroupsStore.set(id, newGroup);
        return { data: newGroup, error: null };
    }
}

export async function fetchGroupMembers(groupId: string): Promise<MeasuredPerson[]> {
    try {
        const { data, error } = await supabase
            .from('group_members')
            .select('person_id, order_index, persons(*)')
            .eq('group_id', groupId)
            .order('order_index', { ascending: true });

        if (error || !data) {
            const localMembers = localMembersStore.get(groupId) || [];
            return localMembers
                .map((m) => localPersonsStore.get(m.person_id))
                .filter((p): p is MeasuredPerson => Boolean(p));
        }

        return data.map((item: any) => item.persons).filter(Boolean);
    } catch {
        const localMembers = localMembersStore.get(groupId) || [];
        return localMembers
            .map((m) => localPersonsStore.get(m.person_id))
            .filter((p): p is MeasuredPerson => Boolean(p));
    }
}

export async function assignPersonToGroup(
    groupId: string,
    personId: string,
    orderIndex: number = 0
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('group_members')
            .upsert({
                group_id: groupId,
                person_id: personId,
                order_index: orderIndex,
                is_active: true,
            }, { onConflict: 'group_id,person_id' });

        if (error) {
            // Manejar en almacén local
            const list = localMembersStore.get(groupId) || [];
            if (!list.some((m) => m.person_id === personId)) {
                list.push({
                    id: 'gm-' + Math.random().toString(36).substring(2, 9),
                    group_id: groupId,
                    person_id: personId,
                    order_index: orderIndex,
                    is_active: true,
                    created_at: new Date().toISOString(),
                });
                localMembersStore.set(groupId, list);
            }
            return { success: true, error: null };
        }

        return { success: true, error: null };
    } catch (err: any) {
        const list = localMembersStore.get(groupId) || [];
        if (!list.some((m) => m.person_id === personId)) {
            list.push({
                id: 'gm-' + Math.random().toString(36).substring(2, 9),
                group_id: groupId,
                person_id: personId,
                order_index: orderIndex,
                is_active: true,
                created_at: new Date().toISOString(),
            });
            localMembersStore.set(groupId, list);
        }
        return { success: true, error: null };
    }
}

export async function removePersonFromGroup(
    groupId: string,
    personId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('person_id', personId);

        if (error) {
            const list = localMembersStore.get(groupId) || [];
            localMembersStore.set(
                groupId,
                list.filter((m) => m.person_id !== personId)
            );
            return { success: true, error: null };
        }

        const list = localMembersStore.get(groupId) || [];
        localMembersStore.set(
            groupId,
            list.filter((m) => m.person_id !== personId)
        );
        return { success: true, error: null };
    } catch (err: any) {
        const list = localMembersStore.get(groupId) || [];
        localMembersStore.set(
            groupId,
            list.filter((m) => m.person_id !== personId)
        );
        return { success: true, error: null };
    }
}

export async function fetchPersonMeasurementSessions(
    personId: string
): Promise<MeasurementSession[]> {
    try {
        const { data, error } = await supabase
            .from('measurement_sessions')
            .select('*')
            .eq('person_id', personId)
            .order('version_number', { ascending: false });

        if (error || !data) {
            return [];
        }

        return data as MeasurementSession[];
    } catch {
        return [];
    }
}
