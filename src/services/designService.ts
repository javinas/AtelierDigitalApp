// ==============================================================================
// ATELIER DIGITAL — SERVICIO: MÓDULO 04 — DISEÑO, MOODBOARD Y BIBLIOTECA
// Archivo: src/services/designService.ts
// ==============================================================================
// Gestiona el ciclo creativo visual de la diseñadora:
// Moodboard por Creación → Tarjetas Pinboard → Paletas Cromáticas → Biblioteca de Autor
// ==============================================================================

import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import {
    CreateLibraryItemDTO,
    CreateMoodboardItemDTO,
    CreationMoodboard,
    DesignLibraryFilter,
    DesignLibraryItem,
    MoodboardItem,
    MoodboardItemType,
    UpdateLibraryItemDTO,
    UpsertMoodboardDTO,
    UpdateMoodboardItemDTO,
} from '../types/design';
import {
    SAMPLE_DESIGN_LIBRARY,
    SAMPLE_MOODBOARD_ITEMS,
    SAMPLE_MOODBOARDS,
    SIGNATURE_COLOR_PALETTES,
} from './designMockData';
import { recordCommercialEvent } from './commercialService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): boolean {
    return Boolean(value && UUID_REGEX.test(value));
}

export const MOCK_UUID_PERSISTENCE_ERROR =
    'Identificador de demostración (no UUID): operación no persistida en Supabase.';

// ==============================================================================
// 1. CABECERA DE MOODBOARD DE LA CREACIÓN (creation_moodboards)
// ==============================================================================

export async function fetchMoodboardByCreation(
    creationId: string,
    creationName?: string
): Promise<{ data: CreationMoodboard; error: string | null }> {
    const now = new Date().toISOString();

    if (!isValidUuid(creationId)) {
        const baseSample = SAMPLE_MOODBOARDS[creationId] || SAMPLE_MOODBOARDS['cr-sample-001'];
        return {
            data: {
                ...baseSample,
                creation_id: creationId,
                title: creationName ? `Moodboard · ${creationName}` : baseSample.title,
                color_palette: [...(baseSample.color_palette || SIGNATURE_COLOR_PALETTES[0].swatches)],
            },
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    const emptyMoodboard: CreationMoodboard = {
        id: '',
        creation_id: creationId,
        title: creationName ? `Moodboard · ${creationName}` : 'Moodboard de Alta Costura',
        theme_concept: null,
        silhouette_code: null,
        neckline_code: null,
        sleeve_code: null,
        color_palette: [],
        artistic_notes: null,
        status: 'draft',
        approved_at: null,
        created_at: now,
        updated_at: now,
    };

    try {
        const { data, error } = await supabase
            .from('creation_moodboards')
            .select('*')
            .eq('creation_id', creationId)
            .maybeSingle();

        if (error) {
            return { data: emptyMoodboard, error: error.message };
        }

        if (data) {
            return { data: data as CreationMoodboard, error: null };
        }

        return { data: emptyMoodboard, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error de red en fetchMoodboardByCreation.';
        return { data: emptyMoodboard, error: message };
    }
}

export async function upsertCreationMoodboard(
    creationId: string,
    dto: UpsertMoodboardDTO
): Promise<{ data: CreationMoodboard | null; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data: existingRow, error: fetchErr } = await supabase
            .from('creation_moodboards')
            .select('*')
            .eq('creation_id', creationId)
            .maybeSingle();

        if (fetchErr) {
            return { data: null, error: fetchErr.message };
        }

        const existing = existingRow as CreationMoodboard | null;
        const resolvedStatus = dto.status ?? existing?.status ?? 'draft';
        const resolvedApprovedAt =
            dto.approved_at !== undefined
                ? dto.approved_at
                : resolvedStatus === 'approved'
                  ? existing?.approved_at || new Date().toISOString()
                  : existing?.approved_at || null;

        const payload = {
            creation_id: creationId,
            title: dto.title ?? existing?.title ?? 'Moodboard de Alta Costura',
            theme_concept: dto.theme_concept !== undefined ? dto.theme_concept : existing?.theme_concept ?? null,
            silhouette_code: dto.silhouette_code !== undefined ? dto.silhouette_code : existing?.silhouette_code ?? null,
            neckline_code: dto.neckline_code !== undefined ? dto.neckline_code : existing?.neckline_code ?? null,
            sleeve_code: dto.sleeve_code !== undefined ? dto.sleeve_code : existing?.sleeve_code ?? null,
            color_palette: dto.color_palette !== undefined ? dto.color_palette : existing?.color_palette || [],
            artistic_notes: dto.artistic_notes !== undefined ? dto.artistic_notes : existing?.artistic_notes ?? null,
            status: resolvedStatus,
            approved_at: resolvedApprovedAt,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('creation_moodboards')
            .upsert(payload, { onConflict: 'creation_id' })
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as CreationMoodboard, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error en upsertCreationMoodboard.';
        return { data: null, error: message };
    }
}

export async function approveCreationMoodboard(
    creationId: string
): Promise<{ data: CreationMoodboard | null; error: string | null }> {
    const approvedAt = new Date().toISOString();
    const res = await upsertCreationMoodboard(creationId, {
        status: 'approved',
        approved_at: approvedAt,
    });
    if (res.error || !res.data) {
        return { data: null, error: res.error || 'No fue posible aprobar el moodboard.' };
    }

    const eventRes = await recordCommercialEvent({
        creation_id: creationId,
        event_type: 'moodboard_approved',
        title: 'Dirección Estética y Moodboard Aprobados',
        description: `Concepto visual "${res.data.title}" consolidado con paleta de ${res.data.color_palette.length} tonos de alta costura.`,
    });
    if (eventRes.error) {
        return { data: res.data, error: eventRes.error };
    }
    return res;
}

export async function reopenCreationMoodboard(
    creationId: string
): Promise<{ data: CreationMoodboard | null; error: string | null }> {
    const res = await upsertCreationMoodboard(creationId, {
        status: 'in_review',
        approved_at: null,
    });
    if (res.error || !res.data) {
        return { data: null, error: res.error || 'No fue posible reabrir el moodboard.' };
    }

    const eventRes = await recordCommercialEvent({
        creation_id: creationId,
        event_type: 'moodboard_reopened',
        title: 'Moodboard Reabierto para Ajuste Estético',
        description: `El tablero conceptual "${res.data.title}" fue reabierto en fase de revisión para incorporar ajustes antes del corte.`,
    });
    if (eventRes.error) {
        return { data: res.data, error: eventRes.error };
    }
    return res;
}

// ==============================================================================
// 2. ELEMENTOS DEL MOODBOARD (moodboard_items)
// ==============================================================================

export async function fetchMoodboardItems(
    creationId: string
): Promise<{ data: MoodboardItem[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        const filtered = SAMPLE_MOODBOARD_ITEMS.filter((item) => item.creation_id === creationId);
        return {
            data: filtered.length > 0 ? filtered : SAMPLE_MOODBOARD_ITEMS,
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    try {
        const { data, error } = await supabase
            .from('moodboard_items')
            .select('*')
            .eq('creation_id', creationId)
            .order('is_pinned', { ascending: false })
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return { data: (data as MoodboardItem[]) || [], error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar elementos del moodboard.';
        return { data: [], error: message };
    }
}

export async function addMoodboardItem(
    dto: CreateMoodboardItemDTO
): Promise<{ data: MoodboardItem | null; error: string | null }> {
    if (!isValidUuid(dto.creation_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }
    if (dto.moodboard_id && !isValidUuid(dto.moodboard_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }
    if (dto.library_item_id && !isValidUuid(dto.library_item_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const enrichedMetadata: Record<string, unknown> = {
        ...(dto.metadata || {}),
        ...(dto.library_item_id ? { source_library_id: dto.library_item_id } : {}),
    };

    const sqlPayload = {
        creation_id: dto.creation_id,
        moodboard_id: dto.moodboard_id || null,
        item_type: dto.item_type,
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() || null,
        description: dto.description?.trim() || null,
        image_key: dto.image_key || 'dress',
        image_url: dto.image_url?.trim() || null,
        storage_path: dto.storage_path || null,
        color_hex: dto.color_hex || '#C5A880',
        tags: dto.tags || [],
        is_pinned: dto.is_pinned !== false,
        sort_order: 0,
        library_item_id: dto.library_item_id || null,
        metadata: enrichedMetadata,
    };

    try {
        const { data, error } = await supabase
            .from('moodboard_items')
            .insert(sqlPayload)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as MoodboardItem, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al agregar elemento al moodboard.';
        return { data: null, error: message };
    }
}

export async function updateMoodboardItem(
    id: string,
    dto: UpdateMoodboardItemDTO
): Promise<{ data: MoodboardItem | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('moodboard_items')
            .update({
                ...dto,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as MoodboardItem, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar elemento del moodboard.';
        return { data: null, error: message };
    }
}

export async function deleteMoodboardItem(
    id: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isValidUuid(id)) {
        return { success: false, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { error } = await supabase.from('moodboard_items').delete().eq('id', id);
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al eliminar elemento del moodboard.';
        return { success: false, error: message };
    }
}

export async function reorderMoodboardItem(
    creationId: string,
    itemId: string,
    direction: 'up' | 'down'
): Promise<{ data: MoodboardItem[]; error: string | null }> {
    if (!isValidUuid(creationId) || !isValidUuid(itemId)) {
        return { data: [], error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const currentRes = await fetchMoodboardItems(creationId);
    if (currentRes.error) {
        return { data: [], error: currentRes.error };
    }

    const list = [...currentRes.data].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return a.sort_order - b.sort_order;
    });

    const idx = list.findIndex((i) => i.id === itemId);
    if (idx === -1) return { data: list, error: null };

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) {
        return { data: list, error: null };
    }

    // Solo reordenar dentro del mismo grupo de fijado (pinned vs unpinned)
    if (list[idx].is_pinned !== list[targetIdx].is_pinned) {
        return { data: list, error: null };
    }

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    list.forEach((item, index) => {
        item.sort_order = index;
    });

    if (list.some((item) => !isValidUuid(item.id))) {
        return { data: [], error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const results = await Promise.all(
            list.map((item) =>
                supabase
                    .from('moodboard_items')
                    .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
                    .eq('id', item.id)
            )
        );

        const failed = results.find((r) => r.error);
        if (failed?.error) {
            return { data: [], error: failed.error.message };
        }

        return { data: list, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al reordenar elementos del moodboard.';
        return { data: [], error: message };
    }
}

export async function pickAndUploadDesignImage(
    scopeFolder: string = 'moodboards'
): Promise<{
    uri: string | null;
    storagePath: string | null;
    fileName: string | null;
    error: string | null;
}> {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.9,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return { uri: null, storagePath: null, fileName: null, error: null };
        }

        const asset = result.assets[0];
        const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        const safeName = `${scopeFolder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const { error: uploadErr } = await supabase.storage
            .from('design-assets')
            .upload(safeName, blob, {
                contentType: asset.mimeType || 'image/jpeg',
                upsert: false,
            });

        if (uploadErr) {
            return {
                uri: null,
                storagePath: null,
                fileName: null,
                error: uploadErr.message || 'Error al subir archivo al bucket design-assets.',
            };
        }

        const { data: signedData, error: signedErr } = await supabase.storage
            .from('design-assets')
            .createSignedUrl(safeName, 60 * 60 * 24 * 365);

        if (signedErr || !signedData?.signedUrl) {
            return {
                uri: null,
                storagePath: null,
                fileName: null,
                error: signedErr?.message || 'No fue posible generar URL firmada para el archivo subido.',
            };
        }

        return {
            uri: signedData.signedUrl,
            storagePath: safeName,
            fileName: asset.fileName || safeName,
            error: null,
        };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No fue posible seleccionar o subir la imagen.';
        return { uri: null, storagePath: null, fileName: null, error: msg };
    }
}

// ==============================================================================
// 3. BIBLIOTECA PERMANENTE DE AUTOR (design_library_items)
// ==============================================================================

export async function fetchDesignLibrary(
    filter?: DesignLibraryFilter
): Promise<{ data: DesignLibraryItem[]; error: string | null }> {
    let items: DesignLibraryItem[] = SAMPLE_DESIGN_LIBRARY.filter((i) => i.is_active !== false);

    try {
        const { data, error } = await supabase
            .from('design_library_items')
            .select('*')
            .eq('is_active', true)
            .order('is_signature', { ascending: false })
            .order('title', { ascending: true });

        if (!error && data && data.length > 0) {
            items = data as DesignLibraryItem[];
        }
    } catch {
        // Usar catálogo editorial base si la tabla aún no está disponible
    }

    if (filter?.category && filter.category !== 'all') {
        items = items.filter((i) => i.category === filter.category);
    }

    if (filter?.garmentType && filter.garmentType !== 'all') {
        items = items.filter((i) => i.compatible_garments.includes(filter.garmentType!));
    }

    if (filter?.onlySignature) {
        items = items.filter((i) => i.is_signature);
    }

    if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
        const q = filter.searchQuery.trim().toLowerCase();
        items = items.filter(
            (i) =>
                i.title.toLowerCase().includes(q) ||
                i.code.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q) ||
                (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
                i.tags.some((t) => t.toLowerCase().includes(q))
        );
    }

    return { data: items, error: null };
}

export async function createDesignLibraryItem(
    dto: CreateLibraryItemDTO
): Promise<{ data: DesignLibraryItem | null; error: string | null }> {
    const codePrefix = dto.category.substring(0, 3).toUpperCase();
    const randNum = Math.floor(100 + Math.random() * 900);
    const code = dto.code?.trim() || `${codePrefix}-KC-${randNum}`;

    const payload = {
        category: dto.category,
        code,
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() || 'Recurso Técnico de Alta Costura',
        description: dto.description.trim(),
        technical_notes: dto.technical_notes?.trim() || null,
        compatible_garments: dto.compatible_garments || ['dress', 'bodice', 'jacket'],
        image_key: dto.image_key || 'dress',
        image_url: dto.image_url?.trim() || null,
        storage_path: dto.storage_path || null,
        accent_hex: dto.accent_hex || '#C5A880',
        palette_swatches: dto.palette_swatches || [],
        tags: dto.tags || ['Alta Costura', 'Autor'],
        is_signature: dto.is_signature !== false,
        is_active: true,
    };

    try {
        const { data, error } = await supabase
            .from('design_library_items')
            .insert(payload)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as DesignLibraryItem, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al catalogar recurso en la biblioteca.';
        return { data: null, error: message };
    }
}

export async function toggleDesignLibrarySignature(
    itemId: string,
    isSignature: boolean
): Promise<{ data: DesignLibraryItem | null; error: string | null }> {
    if (!isValidUuid(itemId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('design_library_items')
            .update({ is_signature: isSignature, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as DesignLibraryItem, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar Sello de Autor.';
        return { data: null, error: message };
    }
}

export async function updateDesignLibraryItem(
    itemId: string,
    dto: UpdateLibraryItemDTO
): Promise<{ data: DesignLibraryItem | null; error: string | null }> {
    if (!isValidUuid(itemId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const now = new Date().toISOString();
    try {
        const { data, error } = await supabase
            .from('design_library_items')
            .update({ ...dto, updated_at: now })
            .eq('id', itemId)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as DesignLibraryItem, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar recurso de la biblioteca.';
        return { data: null, error: message };
    }
}

export async function archiveDesignLibraryItem(
    itemId: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isValidUuid(itemId)) {
        return { success: false, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { error } = await supabase
            .from('design_library_items')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', itemId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al archivar recurso de la biblioteca.';
        return { success: false, error: message };
    }
}

export async function importLibraryItemToCreation(
    libItem: DesignLibraryItem,
    creationId: string
): Promise<{ data: MoodboardItem | null; error: string | null }> {
    const categoryToItemType: Record<string, MoodboardItemType> = {
        silhouette: 'silhouette_ref',
        neckline: 'detail_finish',
        sleeve: 'detail_finish',
        fabric_drape: 'fabric_swatch',
        embroidery_finish: 'detail_finish',
        color_palette: 'color_inspiration',
        historical_archive: 'sketch',
    };

    const itemType: MoodboardItemType = categoryToItemType[libItem.category] || 'detail_finish';

    return addMoodboardItem({
        creation_id: creationId,
        item_type: itemType,
        title: `${libItem.title} (${libItem.code})`,
        subtitle: libItem.subtitle || 'Importado de Biblioteca de Autor',
        description: libItem.technical_notes
            ? `${libItem.description}\n\n• Nota Técnica: ${libItem.technical_notes}`
            : libItem.description,
        image_key: libItem.image_key || 'dress',
        image_url: libItem.image_url || null,
        storage_path: libItem.storage_path || null,
        color_hex: libItem.accent_hex || '#C5A880',
        tags: [...libItem.tags, libItem.code],
        is_pinned: true,
        library_item_id: libItem.id,
        metadata: {
            source_library_id: libItem.id,
            source_library_code: libItem.code,
        },
    });
}
