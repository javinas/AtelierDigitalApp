// ==============================================================================
// ATELIER DIGITAL — SERVICIO: MÓDULO CLIENTES & FOTOGRAFÍAS DE ALTA COSTURA
// Archivo: src/services/clientService.ts
// ==============================================================================

import { Platform } from 'react-native';
import { supabase } from '../supabase';
import {
    Client,
    ClientStatus,
    ClientValidationResult,
    CreateClientDTO,
    UpdateClientDTO,
} from '../types/client';

export type {
    Client,
    ClientStatus,
    ClientValidationResult,
    CreateClientDTO,
    UpdateClientDTO,
};

const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Decodificador base64 a Uint8Array puro en TypeScript / JavaScript.
 * Seguro y cross-platform para Node, React Native y Web sin dependencias externas.
 */
function decodeBase64ToUint8Array(base64: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

    const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
    let bufferLength = Math.floor(clean.length * 0.75);
    if (clean[clean.length - 1] === '=') bufferLength--;
    if (clean[clean.length - 2] === '=') bufferLength--;

    const bytes = new Uint8Array(bufferLength);
    let p = 0;
    for (let i = 0; i < clean.length; i += 4) {
        const encoded1 = lookup[clean.charCodeAt(i)];
        const encoded2 = lookup[clean.charCodeAt(i + 1)];
        const encoded3 = lookup[clean.charCodeAt(i + 2)];
        const encoded4 = lookup[clean.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        if (clean[i + 2] !== '=' && p < bufferLength) {
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        }
        if (clean[i + 3] !== '=' && p < bufferLength) {
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
    }
    return bytes;
}

/**
 * Valida los datos del cliente según las reglas de negocio del atelier.
 */
export function validateClientData(data: Partial<CreateClientDTO>): ClientValidationResult {
    const errors: Record<string, string> = {};

    // Nombre completo (obligatorio)
    if (!data.full_name || data.full_name.trim().length === 0) {
        errors.full_name = 'El nombre completo es obligatorio.';
    } else if (data.full_name.trim().length < 2) {
        errors.full_name = 'El nombre debe tener al menos 2 caracteres.';
    }

    // Correo electrónico (opcional, pero si se provee, debe ser válido)
    if (data.email && data.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
            errors.email = 'Ingrese un formato de correo electrónico válido.';
        }
    }

    // Teléfono (opcional, pero si se provee, validar longitud mínima)
    if (data.phone && data.phone.trim().length > 0) {
        const cleanedPhone = data.phone.replace(/[\s\-\(\)\+]/g, '');
        if (cleanedPhone.length < 7) {
            errors.phone = 'El teléfono debe contener al menos 7 dígitos.';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Consulta la lista de clientes con soporte para filtrado de estado y búsqueda,
 * resolviendo URLs firmadas en lote para fotografías privadas de Supabase Storage.
 */
export async function fetchClients(
    statusFilter: ClientStatus | 'all' = 'all',
    searchQuery: string = '',
): Promise<{ data: Client[]; error: string | null }> {
    try {
        let query = supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.warn('[ClientService] Error al consultar clientes:', error.message);
            return { data: [], error: error.message };
        }

        let clients = (data || []) as Client[];

        // Resolver URLs firmadas en lote para fotos almacenadas en el bucket privado
        const pathsToSign = clients
            .map((c) => c.photo_url)
            .filter((p): p is string => !!p && !p.startsWith('http') && !p.startsWith('data:'));

        if (pathsToSign.length > 0) {
            try {
                const { data: signedList } = await supabase.storage
                    .from('client-photos')
                    .createSignedUrls(pathsToSign, 60 * 60 * 24);

                if (signedList && signedList.length > 0) {
                    const map = new Map(signedList.map((item) => [item.path, item.signedUrl]));
                    clients = clients.map((c) => {
                        if (c.photo_url && map.has(c.photo_url)) {
                            const resolvedUrl = map.get(c.photo_url);
                            if (resolvedUrl) {
                                return { ...c, photo_url: resolvedUrl };
                            }
                        }
                        return c;
                    });
                }
            } catch (storageErr) {
                console.warn('[ClientService] Error resolviendo URLs firmadas de fotografías:', storageErr);
            }
        }

        // Filtrado en memoria para búsqueda flexible (nombre, correo, teléfono o ciudad)
        if (searchQuery.trim().length > 0) {
            const term = searchQuery.toLowerCase().trim();
            clients = clients.filter((c) => {
                const nameMatch = c.full_name?.toLowerCase().includes(term);
                const emailMatch = c.email?.toLowerCase().includes(term);
                const phoneMatch = c.phone?.toLowerCase().includes(term);
                const cityMatch = c.city?.toLowerCase().includes(term);
                return nameMatch || emailMatch || phoneMatch || cityMatch;
            });
        }

        return { data: clients, error: null };
    } catch (err: any) {
        console.error('[ClientService] Error inesperado en fetchClients:', err);
        return {
            data: [],
            error: err?.message || 'Error de conexión consultando clientes.',
        };
    }
}

/**
 * Consulta la ficha detallada de un cliente por su identificador único.
 */
export async function fetchClientById(
    id: string,
): Promise<{ data: Client | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            return { data: null, error: error.message };
        }

        if (!data) return { data: null, error: null };

        const client = data as Client;

        // Resolver URL firmada si es ruta relativa
        if (client.photo_url && !client.photo_url.startsWith('http') && !client.photo_url.startsWith('data:')) {
            try {
                const { data: signed } = await supabase.storage
                    .from('client-photos')
                    .createSignedUrl(client.photo_url, 60 * 60 * 24);
                if (signed?.signedUrl) {
                    client.photo_url = signed.signedUrl;
                }
            } catch (signErr) {
                console.warn('[ClientService] Error firmando URL de cliente individual:', signErr);
            }
        }

        return { data: client, error: null };
    } catch (err: any) {
        return {
            data: null,
            error: err?.message || 'Error consultando la ficha del cliente.',
        };
    }
}

/**
 * Crea una nueva ficha de cliente en el atelier.
 */
export async function createClient(
    clientData: CreateClientDTO,
): Promise<{ data: Client | null; error: string | null }> {
    const validation = validateClientData(clientData);
    if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        return { data: null, error: firstError };
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
            return {
                data: null,
                error: 'Sesión no válida o expirada. Por favor vuelva a iniciar sesión.',
            };
        }

        const userId = authData.user.id;

        const payload: Record<string, any> = {
            full_name: clientData.full_name.trim(),
            email: clientData.email?.trim() ? clientData.email.trim().toLowerCase() : null,
            phone: clientData.phone?.trim() ? clientData.phone.trim() : null,
            city: clientData.city?.trim() ? clientData.city.trim() : null,
            style_preferences: clientData.style_preferences?.trim()
                ? clientData.style_preferences.trim()
                : null,
            internal_notes: clientData.internal_notes?.trim()
                ? clientData.internal_notes.trim()
                : null,
            photo_url: clientData.photo_url || null,
            status: clientData.status || 'active',
            created_by: userId,
        };

        const { data, error } = await supabase
            .from('clients')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[ClientService] Error al crear cliente:', error.message);
            return { data: null, error: `No se pudo registrar el cliente: ${error.message}` };
        }

        return { data: data as Client, error: null };
    } catch (err: any) {
        console.error('[ClientService] Error inesperado en createClient:', err);
        return {
            data: null,
            error: err?.message || 'Error inesperado al registrar el cliente.',
        };
    }
}

/**
 * Actualiza la información de una ficha de cliente existente.
 */
export async function updateClient(
    id: string,
    clientData: UpdateClientDTO,
): Promise<{ data: Client | null; error: string | null }> {
    const validation = validateClientData(clientData);
    if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        return { data: null, error: firstError };
    }

    try {
        const payload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (clientData.full_name !== undefined) {
            payload.full_name = clientData.full_name.trim();
        }
        if (clientData.email !== undefined) {
            payload.email = clientData.email?.trim()
                ? clientData.email.trim().toLowerCase()
                : null;
        }
        if (clientData.phone !== undefined) {
            payload.phone = clientData.phone?.trim() ? clientData.phone.trim() : null;
        }
        if (clientData.city !== undefined) {
            payload.city = clientData.city?.trim() ? clientData.city.trim() : null;
        }
        if (clientData.style_preferences !== undefined) {
            payload.style_preferences = clientData.style_preferences?.trim()
                ? clientData.style_preferences.trim()
                : null;
        }
        if (clientData.internal_notes !== undefined) {
            payload.internal_notes = clientData.internal_notes?.trim()
                ? clientData.internal_notes.trim()
                : null;
        }
        if (clientData.photo_url !== undefined) {
            payload.photo_url = clientData.photo_url;
        }
        if (clientData.status !== undefined) {
            payload.status = clientData.status;
        }

        const { data, error } = await supabase
            .from('clients')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[ClientService] Error al actualizar cliente:', error.message);
            return {
                data: null,
                error: `No se pudo actualizar el cliente: ${error.message}`,
            };
        }

        return { data: data as Client, error: null };
    } catch (err: any) {
        console.error('[ClientService] Error inesperado en updateClient:', err);
        return {
            data: null,
            error: err?.message || 'Error inesperado al actualizar el cliente.',
        };
    }
}

/**
 * Sube una fotografía de clienta a Supabase Storage (bucket: 'client-photos')
 * aplicando validación de formato (JPG, PNG, WebP) y tamaño (<= 5MB).
 */
export async function uploadClientPhoto(
    clientId: string,
    fileUri: string,
    options?: {
        mimeType?: string;
        fileSize?: number;
        base64Data?: string;
    },
): Promise<{ photoUrl: string | null; storagePath: string | null; error: string | null }> {
    try {
        const mimeType = (options?.mimeType || 'image/jpeg').toLowerCase();
        const isMimeValid = ALLOWED_PHOTO_MIME_TYPES.some((m) => mimeType.includes(m.replace('image/', '')));
        if (!isMimeValid) {
            return {
                photoUrl: null,
                storagePath: null,
                error: 'Formato no compatible. Por favor utiliza una imagen JPG, PNG o WebP.',
            };
        }

        if (options?.fileSize && options.fileSize > MAX_PHOTO_SIZE_BYTES) {
            return {
                photoUrl: null,
                storagePath: null,
                error: 'La imagen excede el límite de 5 MB de tamaño.',
            };
        }

        let extension = 'jpg';
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';

        const storagePath = `${clientId}/profile_${Date.now()}.${extension}`;

        let fileBody: any;
        if (Platform.OS === 'web') {
            const res = await fetch(fileUri);
            fileBody = await res.blob();
        } else if (options?.base64Data) {
            fileBody = decodeBase64ToUint8Array(options.base64Data);
        } else {
            const res = await fetch(fileUri);
            fileBody = await res.blob();
        }

        // Subir al bucket client-photos
        const { error: uploadError } = await supabase.storage
            .from('client-photos')
            .upload(storagePath, fileBody, {
                contentType: mimeType,
                upsert: true,
            });

        if (uploadError) {
            console.error('[ClientService] Error subiendo a Storage:', uploadError.message);
            return {
                photoUrl: null,
                storagePath: null,
                error: 'No fue posible actualizar la fotografía. Intenta nuevamente.',
            };
        }

        // Obtener URL firmada
        const { data: signedData } = await supabase.storage
            .from('client-photos')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

        const photoUrl = signedData?.signedUrl || storagePath;

        // Actualizar la fila en clients si clientId es un UUID existente
        if (clientId && clientId !== 'temp') {
            await supabase
                .from('clients')
                .update({
                    photo_url: storagePath,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', clientId);
        }

        return {
            photoUrl,
            storagePath,
            error: null,
        };
    } catch (err: any) {
        console.error('[ClientService] Error en uploadClientPhoto:', err);
        return {
            photoUrl: null,
            storagePath: null,
            error: 'No fue posible actualizar la fotografía. Intenta nuevamente.',
        };
    }
}

/**
 * Elimina la fotografía de una clienta de Supabase Storage y remueve la referencia en DB.
 */
export async function deleteClientPhoto(
    clientId: string,
    photoPathOrUrl?: string | null,
): Promise<{ success: boolean; error: string | null }> {
    try {
        if (photoPathOrUrl && !photoPathOrUrl.startsWith('http')) {
            await supabase.storage.from('client-photos').remove([photoPathOrUrl]);
        }

        if (clientId && clientId !== 'temp') {
            const { error: dbError } = await supabase
                .from('clients')
                .update({
                    photo_url: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', clientId);

            if (dbError) {
                return { success: false, error: dbError.message };
            }
        }

        return { success: true, error: null };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'No fue posible eliminar la fotografía.',
        };
    }
}

/**
 * Cambia el estado de un cliente entre 'active' y 'archived'.
 */
export async function setClientStatus(
    id: string,
    newStatus: ClientStatus,
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('clients')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error cambiando el estado del cliente.',
        };
    }
}

/**
 * Elimina definitivamente un cliente (restringido por RLS al Administrador Principal).
 */
export async function deleteClient(
    id: string,
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) {
            return {
                success: false,
                error: `No se pudo eliminar el cliente: ${error.message}`,
            };
        }

        return { success: true, error: null };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error inesperado al eliminar el cliente.',
        };
    }
}
