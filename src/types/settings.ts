// ==============================================================================
// ATELIER DIGITAL — TIPOS: CONFIGURACIÓN GLOBAL
// Archivo: src/types/settings.ts
// ==============================================================================

export type SettingLanguage = 'es' | 'en';
export type SettingCurrency = 'COP' | 'USD';
export type SettingDateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';

export interface AtelierSettings {
    id: number;
    commercial_name: string;
    contact_email: string;
    contact_phone: string;
    language: SettingLanguage;
    currency: SettingCurrency;
    date_format: SettingDateFormat;
    updated_at?: string;
    updated_by?: string | null;
}
