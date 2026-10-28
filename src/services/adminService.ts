// ==============================================================================
// ATELIER DIGITAL — SERVICIO DE ADMINISTRACIÓN DE USUARIOS
// Archivo: src/services/adminService.ts
// ==============================================================================
// Provee la capa de comunicación cliente con la Supabase Edge Function 'admin-users'
// y garantiza la defensa en profundidad en el frontend.
// ==============================================================================

import {
    FunctionsHttpError,
    FunctionsRelayError,
    FunctionsFetchError,
} from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { UserRole } from '../types/auth';

export const MAIN_ADMIN_EMAIL = 'jairo.vinas@gmail.com';
export const MAIN_ADMIN_ID = '0b57041f-3a3e-40c5-8dc9-74300484a974';

export interface AdminUserItem {
    id: string;
    full_name: string;
    email: string | null;
    role: UserRole;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at?: string;
}

/**
 * Extrae y clasifica de forma precisa el mensaje de error retornado por Supabase Functions:
 * - FunctionsHttpError: La función se ejecutó pero retornó status non-2xx (400, 401, 403, 500).
 *   El payload JSON con el mensaje del servidor reside en error.context.
 * - FunctionsRelayError: El relay de Supabase no pudo enrutar la petición (404 función no desplegada / worker ausente).
 * - FunctionsFetchError: Error de transporte/red (sin conexión, DNS, URL errónea o caída de red).
 */
async function extractFunctionErrorMessage(
    error: any,
    fallbackMessage: string,
): Promise<string> {
    if (!error) return fallbackMessage;

    if (error instanceof FunctionsHttpError) {
        try {
            const response = error.context as Response;
            const errorBody =
                typeof response?.clone === 'function'
                    ? await response.clone().json()
                    : typeof response?.json === 'function'
                      ? await response.json()
                      : null;

            if (errorBody && typeof errorBody === 'object' && errorBody.error) {
                return String(errorBody.error);
            }
        } catch {
            // Si la respuesta HTTP no contiene un body JSON válido, evaluamos el código de estado
        }

        const status = (error.context as Response)?.status;
        if (status === 401) {
            return 'Sesión no válida o expirada. Por favor, inicia sesión de nuevo.';
        }
        if (status === 403) {
            return 'Acceso denegado: se requieren privilegios de Administrador Principal en el servidor.';
        }
        if (status === 404) {
            return 'El recurso solicitado no fue encontrado en el servidor.';
        }
        if (status && status >= 500) {
            return 'El servidor de Supabase encontró un error interno al procesar la solicitud.';
        }
        return error.message || fallbackMessage;
    }

    if (error instanceof FunctionsRelayError) {
        return 'La Edge Function "admin-users" no está desplegada en tu proyecto Supabase. Despliégala con "supabase functions deploy admin-users" para autorizar cambios de rol en el servidor.';
    }

    if (error instanceof FunctionsFetchError) {
        return 'No se pudo conectar con el servidor de Supabase. Revisa tu conexión a internet o la configuración del proyecto.';
    }

    return error.message || fallbackMessage;
}

/**
 * Consulta la lista de perfiles de usuario.
 * Intenta primero a través de la Edge Function 'admin-users'.
 * Si la función aún no ha sido desplegada en Supabase, utiliza el fallback directo
 * a la tabla public.profiles mediante RLS (autorizado para el rol 'admin').
 */
export async function fetchAdminUsers(): Promise<{
    users: AdminUserItem[];
    error: string | null;
    source: 'edge_function' | 'database_direct';
}> {
    try {
        // 1. Intento principal: Edge Function server-side
        const { data: edgeData, error: edgeError } =
            await supabase.functions.invoke('admin-users', {
                body: { action: 'list' },
            });

        if (!edgeError && edgeData?.success && Array.isArray(edgeData.users)) {
            return {
                users: edgeData.users as AdminUserItem[],
                error: null,
                source: 'edge_function',
            };
        }

        if (edgeError) {
            const detail = await extractFunctionErrorMessage(
                edgeError,
                'Error consultando usuarios vía Edge Function.',
            );
            console.warn('[AdminService] Edge Function no disponible o devolvió error:', detail);
        }

        // Si la Edge Function falló (p. ej. 404 no desplegada aún), recurrimos al fallback directo con RLS
        const { data: dbData, error: dbError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, phone, avatar_url, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (dbError) {
            console.error('[AdminService] Error en fallback de base de datos:', dbError.message);
            return {
                users: [],
                error: 'No se pudieron consultar los usuarios. Verifica que el Administrador tenga la sesión activa.',
                source: 'database_direct',
            };
        }

        return {
            users: (dbData ?? []) as AdminUserItem[],
            error: null,
            source: 'database_direct',
        };
    } catch (err: any) {
        console.error('[AdminService] Error inesperado consultando usuarios:', err);
        return {
            users: [],
            error: 'Ocurrió un error inesperado al conectar con el servidor de administración.',
            source: 'database_direct',
        };
    }
}

/**
 * Actualiza el rol de un usuario en el sistema.
 * Por arquitectura de seguridad de Supabase (trigger prevent_role_escalation),
 * el cambio de roles debe procesarse exclusivamente a través de la Edge Function
 * con privilegios de servidor (service_role).
 */
export async function updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    targetEmail?: string | null,
    currentAdminId?: string | null,
): Promise<{ success: boolean; message?: string; error: string | null }> {
    // 1. Validación en frontend contra degradación del Administrador Principal
    if (
        (targetUserId === MAIN_ADMIN_ID ||
            targetEmail?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()) &&
        newRole !== 'admin'
    ) {
        return {
            success: false,
            error: 'Operación denegada: el Administrador Principal (jairo.vinas@gmail.com) está protegido contra degradaciones de rol.',
        };
    }

    // 2. Validación para impedir que el administrador se retire a sí mismo el acceso
    if (currentAdminId && targetUserId === currentAdminId && newRole !== 'admin') {
        return {
            success: false,
            error: 'Operación denegada: no puedes retirar tus propios privilegios de administrador desde la interfaz.',
        };
    }

    try {
        const { data, error } = await supabase.functions.invoke('admin-users', {
            body: {
                action: 'update_role',
                targetUserId,
                newRole,
                targetEmail,
            },
        });

        if (error) {
            const userMessage = await extractFunctionErrorMessage(
                error,
                'Error al actualizar el rol del usuario en el servidor.',
            );

            return {
                success: false,
                error: userMessage,
            };
        }

        if (data?.error) {
            return {
                success: false,
                error: data.error,
            };
        }

        return {
            success: true,
            message: data?.message || `Rol actualizado exitosamente a ${newRole}.`,
            error: null,
        };
    } catch (err: any) {
        console.error('[AdminService] Error invocando Edge Function update_role:', err);
        return {
            success: false,
            error: 'Ocurrió un problema de comunicación con el servicio de administración.',
        };
    }
}

/**
 * Elimina definitivamente un usuario del sistema (solo permitido para el rol 'admin').
 * Protege contra la eliminación del Administrador Principal y de la propia cuenta en sesión.
 * Primero intenta invocar la Edge Function 'admin-users' con action: 'delete_user'.
 * Si la función no responde, utiliza el fallback RPC 'delete_user_by_admin'.
 */
export async function deleteUser(
    targetUserId: string,
    targetEmail?: string | null,
    currentAdminId?: string | null,
): Promise<{ success: boolean; message?: string; error: string | null }> {
    // 1. Protección contra eliminación del Administrador Principal
    if (
        targetUserId === MAIN_ADMIN_ID ||
        targetEmail?.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()
    ) {
        return {
            success: false,
            error: 'Operación denegada: la cuenta del Administrador Principal (jairo.vinas@gmail.com) está protegida y no puede ser eliminada.',
        };
    }

    // 2. Protección para impedir que el administrador elimine su propia cuenta activa
    if (currentAdminId && targetUserId === currentAdminId) {
        return {
            success: false,
            error: 'Operación denegada: no puedes eliminar tu propia cuenta administrativa activa.',
        };
    }

    try {
        // Intento 1: Edge Function 'admin-users'
        const { data, error } = await supabase.functions.invoke('admin-users', {
            body: {
                action: 'delete_user',
                targetUserId,
                targetEmail,
            },
        });

        if (!error && data?.success) {
            return {
                success: true,
                message: data.message || 'Usuario eliminado exitosamente.',
                error: null,
            };
        }

        // Intento 2: Fallback RPC de PostgreSQL 'delete_user_by_admin'
        const { error: rpcError } = await supabase.rpc('delete_user_by_admin', {
            target_user_id: targetUserId,
        });

        if (!rpcError) {
            return {
                success: true,
                message: 'Usuario eliminado exitosamente de la plataforma.',
                error: null,
            };
        }

        const userMessage = error
            ? await extractFunctionErrorMessage(error, rpcError.message)
            : rpcError.message;

        return {
            success: false,
            error: userMessage || 'No se pudo eliminar el usuario.',
        };
    } catch (err: any) {
        console.error('[AdminService] Error eliminando usuario:', err);
        return {
            success: false,
            error: 'Ocurrió un error inesperado al solicitar la eliminación del usuario.',
        };
    }
}

export interface CreateUserPayload {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
}

/**
 * Crea un nuevo usuario en Supabase Auth y asigna su perfil y rol directamente.
 * Requiere que el solicitante sea Administrador autenticado.
 * Invoca la Edge Function 'admin-users' con action: 'create_user'.
 */
export async function createAdminUser(
    payload: CreateUserPayload,
): Promise<{
    success: boolean;
    message?: string;
    user?: AdminUserItem;
    error: string | null;
}> {
    const cleanFullName = payload.fullName?.trim() || '';
    const cleanEmail = payload.email?.trim().toLowerCase() || '';
    const cleanPassword = payload.password?.trim() || '';

    if (!cleanFullName) {
        return { success: false, error: 'Por favor ingresa el nombre completo del usuario.' };
    }

    if (!cleanEmail) {
        return { success: false, error: 'Por favor ingresa el correo electrónico del usuario.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        return { success: false, error: 'El correo electrónico ingresado no tiene un formato válido.' };
    }

    if (!cleanPassword || cleanPassword.length < 6) {
        return { success: false, error: 'La contraseña inicial debe tener como mínimo 6 caracteres.' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('admin-users', {
            body: {
                action: 'create_user',
                fullName: cleanFullName,
                email: cleanEmail,
                password: cleanPassword,
                role: payload.role,
                phone: payload.phone?.trim() || null,
            },
        });

        if (error) {
            const userMessage = await extractFunctionErrorMessage(
                error,
                'Error al crear el usuario en el servidor.',
            );
            return {
                success: false,
                error: userMessage,
            };
        }

        if (data?.error) {
            return {
                success: false,
                error: data.error,
            };
        }

        return {
            success: true,
            message: data?.message || 'Usuario creado exitosamente.',
            user: data?.user,
            error: null,
        };
    } catch (err: any) {
        console.error('[AdminService] Error invocando Edge Function create_user:', err);
        return {
            success: false,
            error: 'Ocurrió un error inesperado al conectar con el servidor de administración.',
        };
    }
}

