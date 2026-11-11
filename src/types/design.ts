// ==============================================================================
// ATELIER DIGITAL — TIPOS: MÓDULO 04 — DISEÑO, MOODBOARD Y BIBLIOTECA DE AUTOR
// Archivo: src/types/design.ts
// ==============================================================================
// Contratos tipados para la dirección estética de alta costura, tableros visuales
// (moodboards), paletas cromáticas textiles y la biblioteca permanente de autor.
// ==============================================================================

export type MoodboardStatus =
    | 'draft'       // En composición creativa de taller
    | 'in_review'   // Presentado a la clienta en cita de diseño
    | 'approved'    // Concepto estético congelado y aprobado para patronaje
    | 'archived';   // Histórico archivado

export type ColorFinishType =
    | 'matte'       // Crepé mate / Lana fría
    | 'satin'       // Satén / Duchesse brillante
    | 'silk_sheen'  // Brillo perlado de seda natural / Mikado
    | 'metallic'    // Hilo de oro / Brocado metálico
    | 'translucent' // Tul ilusión / Organza / Chiffon
    | 'velvet';     // Terciopelo de seda profundo

export type ColorRoleType =
    | 'primary'     // Tela principal exterior
    | 'secondary'   // Contraste / Segunda tela
    | 'accent'      // Detalle / Vivos / Fajín
    | 'lining'      // Forrería interior en seda
    | 'embroidery'; // Pedrería / Bordado artesanal

export interface MoodboardColorSwatch {
    id: string;
    name: string;           // Ej: "Marfil Imperial", "Oro Florentino", "Negro Azabache"
    hex: string;            // Ej: "#F7F2E7"
    finish: ColorFinishType;
    role: ColorRoleType;
}

export interface CreationMoodboard {
    id: string;
    creation_id: string;
    title: string;
    theme_concept?: string | null;
    silhouette_code?: string | null;
    neckline_code?: string | null;
    sleeve_code?: string | null;
    color_palette: MoodboardColorSwatch[];
    artistic_notes?: string | null;
    status: MoodboardStatus;
    approved_at?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export type MoodboardItemType =
    | 'sketch'            // Boceto o figurín de autor
    | 'fabric_swatch'     // Muestra visual de caída textil
    | 'silhouette_ref'    // Referencia estructural de silueta
    | 'detail_finish'     // Detalle de costura, escote, manga o bordado
    | 'color_inspiration' // Atmósfera cromática o referencia luminosa
    | 'editorial_note';   // Anotación conceptual o poética de taller

export interface MoodboardItem {
    id: string;
    moodboard_id?: string | null;
    creation_id: string;
    item_type: MoodboardItemType;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    image_key?: string | null;  // Clave de imagen local del atelier (jacket, dress, bodice, etc.)
    image_url?: string | null;  // URI externa o firmada desde Supabase Storage
    storage_path?: string | null;
    color_hex?: string | null;
    tags: string[];
    is_pinned: boolean;
    sort_order: number;
    library_item_id?: string | null;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export type DesignLibraryCategory =
    | 'silhouette'         // Siluetas maestras (Sirena, Reloj de Arena, Evasé, Sastre)
    | 'neckline'           // Escotes y cuellos (Corazón, Bateau, Solapa en Lanza, Halter)
    | 'sleeve'             // Mangas y puños (Sastre 2 hojas, Obispo, Julieta, Cap)
    | 'fabric_drape'       // Comportamiento y caída de tejidos nobles
    | 'embroidery_finish'  // Bordados Luneville, pedrería y acabados a mano
    | 'color_palette'      // Paletas cromáticas de colección y temporada
    | 'historical_archive';// Archivo histórico de piezas insignia de Katherine Carroll

export interface DesignLibraryItem {
    id: string;
    category: DesignLibraryCategory;
    code: string;                 // Ej: "SIL-KC-001", "ESC-KC-002"
    title: string;
    subtitle?: string | null;
    description: string;
    technical_notes?: string | null; // Directrices de aguja, entretela, bies o patronaje CAD
    compatible_garments: string[];   // ['dress', 'bodice', 'jacket', 'corset', 'skirt', 'pants']
    image_key?: string | null;
    image_url?: string | null;
    storage_path?: string | null;
    accent_hex?: string | null;
    palette_swatches?: MoodboardColorSwatch[];
    tags: string[];
    is_signature: boolean;        // Sello de Autor By Katherine Carroll
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ==============================================================================
// DTOs Y FILTROS DE CONSULTA
// ==============================================================================

export interface UpsertMoodboardDTO {
    title?: string;
    theme_concept?: string | null;
    silhouette_code?: string | null;
    neckline_code?: string | null;
    sleeve_code?: string | null;
    color_palette?: MoodboardColorSwatch[];
    artistic_notes?: string | null;
    status?: MoodboardStatus;
    approved_at?: string | null;
}

export interface CreateMoodboardItemDTO {
    creation_id: string;
    moodboard_id?: string | null;
    item_type: MoodboardItemType;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    image_key?: string | null;
    image_url?: string | null;
    storage_path?: string | null;
    color_hex?: string | null;
    tags?: string[];
    is_pinned?: boolean;
    library_item_id?: string | null;
    metadata?: Record<string, unknown>;
}

export interface UpdateMoodboardItemDTO {
    item_type?: MoodboardItemType;
    title?: string;
    subtitle?: string | null;
    description?: string | null;
    image_key?: string | null;
    image_url?: string | null;
    storage_path?: string | null;
    color_hex?: string | null;
    tags?: string[];
    is_pinned?: boolean;
    sort_order?: number;
    metadata?: Record<string, unknown>;
}

export interface CreateLibraryItemDTO {
    category: DesignLibraryCategory;
    code?: string;
    title: string;
    subtitle?: string | null;
    description: string;
    technical_notes?: string | null;
    compatible_garments?: string[];
    image_key?: string | null;
    image_url?: string | null;
    storage_path?: string | null;
    accent_hex?: string | null;
    palette_swatches?: MoodboardColorSwatch[];
    tags?: string[];
    is_signature?: boolean;
}

export interface UpdateLibraryItemDTO {
    category?: DesignLibraryCategory;
    title?: string;
    subtitle?: string | null;
    description?: string;
    technical_notes?: string | null;
    compatible_garments?: string[];
    image_key?: string | null;
    image_url?: string | null;
    storage_path?: string | null;
    accent_hex?: string | null;
    tags?: string[];
    is_signature?: boolean;
    is_active?: boolean;
}

export interface DesignLibraryFilter {
    category?: DesignLibraryCategory | 'all';
    garmentType?: string | 'all';
    onlySignature?: boolean;
    searchQuery?: string;
}

