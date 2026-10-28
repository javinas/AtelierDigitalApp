// ==============================================================================
// ATELIER DIGITAL — TIPOS: HOLGURAS Y PARÁMETROS DE DISEÑO (MÓDULO 02)
// Archivo: src/types/pattern/ease.ts
// ==============================================================================

export type EaseProfileCode = 'fitted' | 'regular' | 'relaxed' | 'couture_custom';

export interface EaseValues {
    bust: number;     // Holgura en contorno de busto (mm)
    waist: number;    // Holgura en contorno de cintura (mm)
    hip: number;      // Holgura en contorno de cadera (mm)
    biceps: number;   // Holgura en bíceps (mm)
    crotch: number;   // Desahogo en tiro de pantalón (mm)
    shoulder?: number;// Extensión de hombro (mm)
    wrist?: number;   // Holgura en puño/muñeca (mm)
    thigh?: number;   // Holgura en muslo (mm)
    armhole?: number; // Holgura / profundidad de sisa (mm)
}

export interface EaseProfile {
    id: string;
    code: EaseProfileCode;
    name: string;
    description: string;
    ease_values: EaseValues;
    is_default: boolean;
}

export interface FabricProperties {
    fabric_type: string;             // Seda, crepe, lana fría, lino, etc.
    warp_stretch_percent: number;   // Elasticidad urdimbre (0 - 100%)
    weft_stretch_percent: number;   // Elasticidad trama (0 - 100%)
    weight_gsm?: number;            // Gramaje g/m2
    shrinkage_percent?: number;     // Encogimiento estimado (%)
}

export interface GarmentDesignParameters {
    skirt_length_mm?: number;           // Largo de falda desde la cintura
    skirt_silhouette?: 'straight' | 'a_line' | 'pencil';
    skirt_flare_per_side_mm?: number;   // Ensanchamiento en bajo para línea A (mm)
    
    sleeve_length_mm?: number;          // Largo deseado de manga
    sleeve_type?: 'classic' | 'short' | 'three_quarter' | 'cap';
    sleeve_wrist_opening_mm?: number;   // Abertura de puño terminada
    
    neckline_drop_mm?: number;          // Descenso de escote delantero (mm)
    neckline_width_mm?: number;         // Ensanchamiento lateral de escote (mm)
    neckline_style?: 'crew' | 'v_neck' | 'boat' | 'square';
    
    waist_position_offset_mm?: number;  // Desplazamiento de cintura (imperio o talle bajo)
    bust_dart_transfer?: 'waist' | 'side_seam' | 'armhole' | 'french';
    bust_dart_width_adjustment_mm?: number; // Ajuste milimétrico de ancho de pinza de busto
    bust_dart_offset_mm?: number;           // Ajuste de altura/vértice de pinza de busto
    
    pants_rise_adjustment_mm?: number;  // Ajuste de altura de tiro
    pants_hem_width_mm?: number;        // Ancho de dobladillo / botamanga
    
    // Parámetros específicos de Camisa de Alta Costura (C14)
    shirt_length_mm?: number;           // Largo total deseado de la camisa
    collar_stand_height_mm?: number;    // Altura del pie de cuello (típico 30 mm)
    collar_fall_height_mm?: number;     // Altura de la pala de cuello (típico 42 mm)
    cuff_height_mm?: number;            // Altura terminada del puño (típico 65 mm)
    placket_width_mm?: number;          // Ancho de la tapeta frontal (típico 30 mm)
    yoke_depth_back_mm?: number;        // Profundidad del canesú en centro espalda (típico 75 mm)
    pocket_presence?: boolean;          // Indica si se genera el bolsillo de parche
    pocket_width_mm?: number;           // Ancho del bolsillo de parche
    pocket_height_mm?: number;          // Altura del bolsillo de parche
    
    // Parámetros específicos de Corsé de Alta Costura (C14-C)
    corset_length_mm?: number;          // Largo total del corsé desde la cintura o escote
    corset_front_drop_mm?: number;      // Descenso en pico del bajo delantero (típico 25-40 mm)
    boning_channel_width_mm?: number;   // Ancho del canal de ballena (típico 8 o 10 mm)
    waist_reduction_mm?: number;        // Reducción activa de cintura sastre (típico 20-40 mm)
    corset_top_sweetheart_depth_mm?: number; // Profundidad de escote corazón en centro delantero
    
    // Parámetros específicos de Chaqueta Sastre de Alta Costura (C15)
    jacket_length_mm?: number;          // Largo total de la chaqueta sastre (típico 680-740 mm)
    jacket_lapel_width_mm?: number;     // Ancho de solapa en la muesca (típico 70-85 mm)
    jacket_button_count?: number;       // Cantidad de botones en delantero (1, 2 o 3)
    jacket_closure_type?: 'single_breasted' | 'double_breasted'; // Abotonadura simple o cruzada
    jacket_vent_type?: 'center' | 'side' | 'none'; // Tipo de abertura inferior en espalda
    jacket_pocket_presence?: boolean;   // Presencia de bolsillos de cartera / ojal
    jacket_pocket_width_mm?: number;    // Ancho de cartera de bolsillo (típico 120-140 mm)
    jacket_pocket_height_mm?: number;   // Altura de cartera de bolsillo (típico 45-55 mm)
    
    // Parámetros específicos de Abrigo de Alta Costura (C16)
    coat_length_mm?: number;            // Largo total de abrigo (típico 1000-1150 mm)
    coat_lapel_width_mm?: number;       // Ancho de solapa amplia (típico 85-110 mm)
    coat_overlap_mm?: number;           // Cruce envolvente (típico 40-70 mm)
    coat_closure_type?: 'single_breasted' | 'double_breasted' | 'wrap_belt'; // Tipo de cierre
    coat_vent_length_mm?: number;       // Largo de abertura dorsal de marcha (típico 280-350 mm)
    coat_belt_presence?: boolean;       // Presencia de cinturón/fajín sastre envolvente
    coat_belt_width_mm?: number;        // Ancho de cinturón (típico 45-60 mm)
    
    seam_allowance_default_mm: number;  // Margen de costura general (ej. 10mm o 15mm)
    hem_allowance_mm: number;           // Margen para dobladillos (ej. 30mm o 40mm)
    fitting_snapshot?: any;             // Snapshot estructurado de ajustes congelados de fitting (Componente 13)
}
