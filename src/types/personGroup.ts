// ==============================================================================
// ATELIER DIGITAL — TIPOS: PERSONAS MEDIDAS Y GRUPOS / NÚCLEOS (FASE 1)
// Archivo: src/types/personGroup.ts
// ==============================================================================
// Soporta la separación ontológica de alta costura:
// Cliente / Responsable → Persona Medida → Grupo / Núcleo
// ==============================================================================

export type DemographicCategory = 'woman' | 'man' | 'girl' | 'boy' | 'baby';

export type GroupType = 'family' | 'school' | 'corporate' | 'atelier' | 'other';

export interface MeasuredPerson {
    id: string;
    client_id: string; // Cliente o responsable
    full_name: string;
    demographic_category: DemographicCategory;
    reference_id?: string | null; // Ej: "Alumna 12", "Fila 3", "Hija Mayor", "Danza 4"
    birth_date?: string | null;
    notes?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Metadatos y relaciones cargados en memoria
    last_session_id?: string | null;
    last_session_date?: string | null;
    last_session_version?: number | null;
    last_session_status?: string | null;
    sessions_count?: number;
    groups_count?: number;
}

export interface CreatePersonDTO {
    client_id: string;
    full_name: string;
    demographic_category: DemographicCategory;
    reference_id?: string | null;
    birth_date?: string | null;
    notes?: string | null;
    is_active?: boolean;
}

export interface UpdatePersonDTO {
    full_name?: string;
    demographic_category?: DemographicCategory;
    reference_id?: string | null;
    birth_date?: string | null;
    notes?: string | null;
    is_active?: boolean;
}

export interface MeasurementGroup {
    id: string;
    client_id: string; // Responsable
    name: string;
    type: GroupType;
    notes?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Miembros en memoria
    members_count?: number;
    members?: MeasuredPerson[];
}

export interface CreateGroupDTO {
    client_id: string;
    name: string;
    type: GroupType;
    notes?: string | null;
    is_active?: boolean;
}

export interface UpdateGroupDTO {
    name?: string;
    type?: GroupType;
    notes?: string | null;
    is_active?: boolean;
}

export interface GroupMember {
    id: string;
    group_id: string;
    person_id: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
    person?: MeasuredPerson;
}

export const DEMOGRAPHIC_LABELS: Record<DemographicCategory, string> = {
    woman: 'Mujer (Damas)',
    man: 'Hombre (Caballeros)',
    girl: 'Niña (Infantil)',
    boy: 'Niño (Infantil)',
    baby: 'Bebé (0-36M)',
};

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
    family: 'Núcleo Familiar',
    school: 'Grupo Escolar / Académico',
    corporate: 'Empresa / Corporativo',
    atelier: 'Producción de Atelier',
    other: 'Encargo / Proyecto Especial',
};
