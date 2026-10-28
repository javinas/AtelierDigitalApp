// ==============================================================================
// ATELIER DIGITAL — SERVICIO DE CONFIGURACIÓN GLOBAL
// Archivo: src/services/settingsService.ts
// ==============================================================================
// Gestiona la lectura, validación y persistencia de la configuración del Atelier
// en la tabla public.atelier_settings mediante RLS para el rol 'admin'.
// ==============================================================================

import { supabase } from '../supabase';
import {
    AtelierSettings,
    SettingCurrency,
    SettingDateFormat,
    SettingLanguage,
} from '../types/settings';

export type {
    AtelierSettings,
    SettingCurrency,
    SettingDateFormat,
    SettingLanguage,
};

export const DEFAULT_ATELIER_SETTINGS: AtelierSettings = {
    id: 1,
    commercial_name: 'Atelier de Autor · By Katherine Carroll',
    contact_email: '',
    contact_phone: '',
    language: 'es',
    currency: 'COP',
    date_format: 'DD/MM/YYYY',
};

/**
 * Consulta la configuración global de la plataforma desde Supabase.
 * Si la tabla aún no contiene datos o no ha sido creada, devuelve los valores por defecto.
 */
export async function fetchAtelierSettings(): Promise<{
    data: AtelierSettings;
    error: string | null;
    isDefault: boolean;
}> {
    try {
        const { data, error } = await supabase
            .from('atelier_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            console.warn('[SettingsService] No se pudo leer atelier_settings:', error.message);
            return {
                data: DEFAULT_ATELIER_SETTINGS,
                error: error.message,
                isDefault: true,
            };
        }

        if (!data) {
            return {
                data: DEFAULT_ATELIER_SETTINGS,
                error: null,
                isDefault: true,
            };
        }

        return {
            data: data as AtelierSettings,
            error: null,
            isDefault: false,
        };
    } catch (err: any) {
        console.error('[SettingsService] Error inesperado en fetchAtelierSettings:', err);
        return {
            data: DEFAULT_ATELIER_SETTINGS,
            error: err?.message || 'Error de conexión consultando la configuración.',
            isDefault: true,
        };
    }
}

export interface SettingsValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Valida de forma estricta los campos del formulario antes de enviar a Supabase.
 */
export function validateSettings(settings: Partial<AtelierSettings>): SettingsValidationResult {
    const errors: Record<string, string> = {};

    // Nombre comercial
    if (!settings.commercial_name || settings.commercial_name.trim().length === 0) {
        errors.commercial_name = 'El nombre comercial es obligatorio.';
    } else if (settings.commercial_name.trim().length < 3) {
        errors.commercial_name = 'El nombre comercial debe tener al menos 3 caracteres.';
    }

    // Correo de contacto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!settings.contact_email || settings.contact_email.trim().length === 0) {
        errors.contact_email = 'El correo de contacto es obligatorio.';
    } else if (!emailRegex.test(settings.contact_email.trim())) {
        errors.contact_email = 'Ingrese un correo electrónico válido.';
    }

    // Teléfono de contacto
    if (!settings.contact_phone || settings.contact_phone.trim().length === 0) {
        errors.contact_phone = 'El teléfono de contacto es obligatorio.';
    } else if (settings.contact_phone.trim().length < 7) {
        errors.contact_phone = 'Ingrese un número de teléfono válido (mínimo 7 caracteres).';
    }

    // Idioma
    const allowedLanguages: SettingLanguage[] = ['es', 'en'];
    if (settings.language && !allowedLanguages.includes(settings.language)) {
        errors.language = 'Idioma no válido. Debe ser español o inglés.';
    }

    // Moneda
    const allowedCurrencies: SettingCurrency[] = ['COP', 'USD'];
    if (settings.currency && !allowedCurrencies.includes(settings.currency)) {
        errors.currency = 'Moneda no válida. Debe ser COP o USD.';
    }

    // Formato de fecha
    const allowedDateFormats: SettingDateFormat[] = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'];
    if (settings.date_format && !allowedDateFormats.includes(settings.date_format)) {
        errors.date_format = 'Formato de fecha no válido.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Guarda los cambios de configuración en la tabla public.atelier_settings.
 * La autorización está protegida por Row Level Security (public.is_admin()).
 */
export async function saveAtelierSettings(
    newSettings: AtelierSettings,
    adminUserId?: string,
): Promise<{ success: boolean; data?: AtelierSettings; error: string | null }> {
    const validation = validateSettings(newSettings);
    if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        return { success: false, error: firstError };
    }

    try {
        // Obtener el ID del administrador autenticado desde la sesión activa de Supabase
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
            return {
                success: false,
                error: 'Sesión no válida o expirada. Por favor vuelva a iniciar sesión.',
            };
        }

        const authenticatedUserId = authData.user.id;

        const payload = {
            id: 1,
            commercial_name: newSettings.commercial_name.trim(),
            contact_email: newSettings.contact_email.trim().toLowerCase(),
            contact_phone: newSettings.contact_phone.trim(),
            language: newSettings.language,
            currency: newSettings.currency,
            date_format: newSettings.date_format,
            updated_at: new Date().toISOString(),
            updated_by: authenticatedUserId,
        };

        const { data, error } = await supabase
            .from('atelier_settings')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error('[SettingsService] Error guardando atelier_settings:', error.message);
            return {
                success: false,
                error: `No se pudo guardar la configuración: ${error.message}`,
            };
        }

        return {
            success: true,
            data: data as AtelierSettings,
            error: null,
        };
    } catch (err: any) {
        console.error('[SettingsService] Error inesperado guardando configuración:', err);
        return {
            success: false,
            error: err?.message || 'Error inesperado al conectar con el servidor.',
        };
    }
}
