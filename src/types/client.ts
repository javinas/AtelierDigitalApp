// ==============================================================================
// ATELIER DIGITAL — TIPOS: MÓDULO CLIENTES
// Archivo: src/types/client.ts
// ==============================================================================

export type ClientStatus = 'active' | 'archived';

export interface Client {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    style_preferences: string | null;
    internal_notes: string | null;
    photo_url?: string | null;
    status: ClientStatus;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateClientDTO {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    style_preferences?: string | null;
    internal_notes?: string | null;
    photo_url?: string | null;
    status?: ClientStatus;
}

export interface UpdateClientDTO {
    full_name?: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    style_preferences?: string | null;
    internal_notes?: string | null;
    photo_url?: string | null;
    status?: ClientStatus;
}

export interface ClientValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}
