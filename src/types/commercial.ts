// ==============================================================================
// ATELIER DIGITAL — TIPOS: MÓDULO 03 — CREACIONES Y CICLO COMERCIAL
// Archivo: src/types/commercial.ts
// ==============================================================================
// Especificación de tipos para el ciclo comercial integral de Alta Costura:
// Perfil Satélite → Catálogo de Telas → Propuesta v1..vn → Cotización A4 → Proyecto → Finanzas
// ==============================================================================

export type CommercialCurrency = 'COP' | 'USD';

// ==============================================================================
// 1. PERFIL COMERCIAL SATÉLITE DE LA CREACIÓN (creation_commercial_profiles)
// ==============================================================================

export type CommercialStatus =
    | 'draft'
    | 'proposal_pending'
    | 'quote_sent'
    | 'quote_accepted'
    | 'in_production'
    | 'ready_for_delivery'
    | 'delivered'
    | 'cancelled';

export interface CreationCommercialProfile {
    id: string;
    creation_id: string;
    creation_code?: string | null;
    currency: CommercialCurrency;
    commercial_status: CommercialStatus;
    active_proposal_id?: string | null;
    accepted_quote_id?: string | null;
    active_project_id?: string | null;
    estimated_budget_cop: number;
    estimated_budget_usd: number;
    payment_status: 'unpaid' | 'partially_paid' | 'paid_in_full';
    balance_pending_amount?: number | null;
    delivery_status: 'pending' | 'in_fitting' | 'ready' | 'delivered';
    delivery_date_actual?: string | null;
    design_guidelines?: string | null;
    pattern_approach?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface UpdateCommercialProfileDTO {
    commercial_status?: CommercialStatus;
    active_proposal_id?: string | null;
    accepted_quote_id?: string | null;
    active_project_id?: string | null;
    currency?: CommercialCurrency;
    estimated_budget_cop?: number;
    estimated_budget_usd?: number;
    payment_status?: 'unpaid' | 'partially_paid' | 'paid_in_full';
    delivery_status?: 'pending' | 'in_fitting' | 'ready' | 'delivered';
    delivery_date_actual?: string | null;
    design_guidelines?: string | null;
    pattern_approach?: string | null;
    notes?: string | null;
}

// ==============================================================================
// 2. MATERIALES, TELAS E INSUMOS DE ALTA COSTURA (atelier_materials)
// ==============================================================================

export const CANONICAL_MATERIAL_CATEGORIES = [
    'fabric',      // Tela principal (Seda, terciopelo, lana virgen, encaje)
    'lining',      // Forrería y tafetán
    'interfacing', // Entretelas termofusibles o de sastre
    'notions',     // Botones, cremalleras, broches, corchetes (normaliza 'notion')
    'trims',       // Cintas, pasamanería, bieses (normaliza 'trim')
    'hardware',    // Ballenas de corsé, copas, aros, herrajes
    'beading',     // Pedrería y cristales
    'embroidery',  // Bordados e hilos metálicos (Etapa 1 en CHECK remoto)
] as const;

export type MaterialCategory = (typeof CANONICAL_MATERIAL_CATEGORIES)[number];
export type LegacyMaterialCategoryAlias = 'notion' | 'trim';
export type MaterialCategoryInput = MaterialCategory | LegacyMaterialCategoryAlias;

export const REMOTE_SQL_SUPPORTED_MATERIAL_CATEGORIES: readonly MaterialCategory[] =
    CANONICAL_MATERIAL_CATEGORIES;

export const CANONICAL_MATERIAL_UNITS = [
    'm',     // Metros lineales
    'cm',    // Centímetros
    'unit',  // Unidad / Pieza
    'pair',  // Par (hombreras, copas)
    'dozen', // Docena
    'roll',  // Rollo / Carrete
    'pkg',   // Paquete (habilitado en M05 Etapa 1)
] as const;

export type MaterialUnit = (typeof CANONICAL_MATERIAL_UNITS)[number];

export const REMOTE_SQL_SUPPORTED_MATERIAL_UNITS: readonly MaterialUnit[] =
    CANONICAL_MATERIAL_UNITS;

export const MATERIAL_DRAPE_PROFILES = [
    'fluid',      // Caída fluida (charmeuse, gasa, crepe ligero)
    'structured', // Cuerpo estructurado (mikado, duquesa, lana)
    'crisp',      // Textura firme / crujiente (organza, tafetán)
    'sheer',      // Traslúcido (tul, encaje chantilly)
    'heavy',      // Alto gramaje (terciopelo, brocado, paño)
    'stretch',    // Elástico / bi-stretch
    'delicate',   // Manipulación delicada (pedrería, bordado fino)
] as const;

export type MaterialDrapeProfile = (typeof MATERIAL_DRAPE_PROFILES)[number];

/**
 * Normaliza aliases históricos (`notion` -> `notions`, `trim` -> `trims`) hacia
 * las 8 categorías canónicas, incluyendo `embroidery`.
 */
export function normalizeMaterialCategory(value?: string | null): MaterialCategory | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'notion') return 'notions';
    if (normalized === 'trim') return 'trims';
    if ((CANONICAL_MATERIAL_CATEGORIES as readonly string[]).includes(normalized)) {
        return normalized as MaterialCategory;
    }
    return null;
}

/**
 * Normaliza una unidad hacia las 7 unidades canónicas, incluyendo `pkg`.
 * Nunca convierte `pkg` en `unit` ni `roll`.
 */
export function normalizeMaterialUnit(value?: string | null): MaterialUnit | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if ((CANONICAL_MATERIAL_UNITS as readonly string[]).includes(normalized)) {
        return normalized as MaterialUnit;
    }
    return null;
}

/**
 * Normaliza el perfil de caída M05.
 */
export function normalizeMaterialDrapeProfile(value?: string | null): MaterialDrapeProfile | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if ((MATERIAL_DRAPE_PROFILES as readonly string[]).includes(normalized)) {
        return normalized as MaterialDrapeProfile;
    }
    return null;
}

/**
 * Valida y normaliza categoría y unidad antes de persistir en Supabase remoto (M05 Etapa 1),
 * soportando las 8 categorías canónicas (incl. `embroidery`) y las 7 unidades (incl. `pkg`).
 */
export function validateMaterialRemotePersistence(input: {
    category?: string | null;
    unit?: string | null;
    requireCategory?: boolean;
    requireUnit?: boolean;
}): {
    category?: MaterialCategory;
    unit?: MaterialUnit;
    error: string | null;
} {
    let resolvedCategory: MaterialCategory | undefined;
    let resolvedUnit: MaterialUnit | undefined;

    if (input.category !== undefined) {
        const normalizedCat = normalizeMaterialCategory(input.category);
        if (!normalizedCat) {
            return {
                error: `Categoría de material no reconocida: "${String(input.category)}".`,
            };
        }
        if (!REMOTE_SQL_SUPPORTED_MATERIAL_CATEGORIES.includes(normalizedCat)) {
            return {
                error: `La categoría '${normalizedCat}' aún no está habilitada en el esquema remoto actual.`,
            };
        }
        resolvedCategory = normalizedCat;
    } else if (input.requireCategory) {
        return { error: 'La categoría del material es obligatoria.' };
    }

    if (input.unit !== undefined) {
        const normalizedUnit = normalizeMaterialUnit(input.unit);
        if (!normalizedUnit) {
            return {
                error: `Unidad de medida no reconocida: "${String(input.unit)}".`,
            };
        }
        if (!REMOTE_SQL_SUPPORTED_MATERIAL_UNITS.includes(normalizedUnit)) {
            return {
                error: `La unidad '${normalizedUnit}' aún no está habilitada en el esquema remoto actual.`,
            };
        }
        resolvedUnit = normalizedUnit;
    } else if (input.requireUnit) {
        return { error: 'La unidad del material es obligatoria.' };
    }

    return {
        category: resolvedCategory,
        unit: resolvedUnit,
        error: null,
    };
}

/**
 * Regla aprobada (Decisión 1): Cantidad facturable = MAX(requiredQty, minPurchaseUnit), sin múltiplos automáticos.
 */
export function calculateBillableMaterialQuantity(
    requiredQty: number,
    minPurchaseUnit: number
): number {
    const safeRequired = Number.isFinite(requiredQty) ? Math.max(0, requiredQty) : 0;
    const safeMin = Number.isFinite(minPurchaseUnit) ? Math.max(0, minPurchaseUnit) : 0;
    return Number(Math.max(safeRequired, safeMin).toFixed(4));
}

export interface MaterialItem {
    id: string;
    name: string;
    category: MaterialCategory;
    composition?: string | null;       // Ej: "100% Seda Natural", "95% Lana / 5% Elastano"
    width_cm?: number | null;          // Ancho de pieza en cm (ej. 140, 150)
    supplier_id?: string | null;       // FK M05 a public.atelier_suppliers(id)
    supplier?: AtelierSupplierSummary | null; // Resumen del proveedor cuando se consulta con join
    supplier_name?: string | null;     // Casa textil / Proveedor (compatibilidad M03)
    supplier_ref?: string | null;      // Código o referencia de proveedor
    sku_code?: string | null;          // SKU único M05 en atelier_materials
    weight_gsm?: number | null;        // Gramaje en gr/m2 (M05)
    drape_profile?: MaterialDrapeProfile | null; // Perfil de caída (M05)
    care_instructions?: string | null; // Cuidados recomendados de limpieza (M05)
    unit_price: number;                // Precio unitario base en COP
    unit_price_cop?: number;           // Alias informativo equivalente a unit_price
    unit_price_usd?: number;           // Precio unitario en USD
    unit: MaterialUnit;                // Unidad de medida
    min_purchase_unit: number;         // Compra mínima exigida por proveedor (ej. 3.0 m)
    current_stock?: number | null;     // Stock actual en atelier
    color_code?: string | null;        // Hexadecimal representativo (#RRGGBB)
    color_name?: string | null;        // Nombre comercial del tono (ej. "Azul Petróleo")
    storage_path?: string | null;      // Ruta privada en bucket commercial-assets (M05)
    photo_url?: string | null;         // URL firmada temporal o legado de muestra fotográfica
    tags?: string[];                   // Etiquetas textiles M05
    notes?: string | null;             // Caída, observaciones técnicas y detalles de uso
    is_active: boolean;
    last_stock_check_at?: string | null; // Fecha de último arqueo manual (M05)
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateMaterialDTO {
    name: string;
    category: MaterialCategoryInput;
    composition?: string | null;
    width_cm?: number | null;
    supplier_id?: string | null;
    supplier_name?: string | null;
    supplier_ref?: string | null;
    sku_code?: string | null;
    weight_gsm?: number | null;
    drape_profile?: MaterialDrapeProfile | null;
    care_instructions?: string | null;
    unit_price: number;
    unit_price_usd?: number;
    unit?: MaterialUnit;
    min_purchase_unit?: number;
    current_stock?: number;
    color_code?: string | null;
    color_name?: string | null;
    storage_path?: string | null;
    photo_url?: string | null;
    tags?: string[] | null;
    notes?: string | null;
    last_stock_check_at?: string | null;
}

export interface UpdateMaterialDTO extends Partial<CreateMaterialDTO> {
    is_active?: boolean;
}

export interface MaterialFilter {
    category?: MaterialCategoryInput | 'all';
    searchQuery?: string;
    onlyActive?: boolean;
    supplier?: string;
    supplierId?: string;
    drapeProfile?: MaterialDrapeProfile | 'all';
    tag?: string;
    withStockOnly?: boolean;
}

// ==============================================================================
// 3. PROPUESTAS DE DISEÑO VERSIONADAS (creation_proposals & items)
// ==============================================================================

export type ProposalStatus =
    | 'draft'          // Borrador en elaboración
    | 'submitted'      // Presentada formalmente a la clienta
    | 'approved'       // Aprobada (genera cotización / proyecto)
    | 'superseded'     // Reemplazada por una nueva versión (v2, v3)
    | 'rejected';      // Descartada

export interface ProposalMaterialItem {
    id?: string;
    material_id?: string | null;
    name?: string;
    material_name?: string;
    category?: MaterialCategoryInput | string;
    material_category?: MaterialCategoryInput | string;
    unit: MaterialUnit;
    required_qty?: number;
    required_quantity?: number;
    min_purchase_unit?: number;
    billable_qty?: number;
    billable_quantity?: number;
    unit_price: number;
    subtotal: number;
    color_name?: string | null;
    notes?: string | null;
}

export interface ProposalLaborItem {
    id: string;
    description: string;              // Ej: "Modelado sobre maniquí y patronaje CAD 1:1"
    hours_estimated?: number | null;
    rate_per_hour?: number | null;
    subtotal: number;
}

export interface ProposalSnapshot {
    materials: ProposalMaterialItem[];
    labor: ProposalLaborItem[];
    materials_cost: number;           // Sumatoria de materiales
    labor_cost: number;               // Sumatoria de mano de obra
    estimated_total: number;          // Total de la propuesta
    currency: CommercialCurrency;     // 'COP' | 'USD'
    snapshot_date: string;            // Timestamp ISO de congelación de precios
}

export interface DesignProposal {
    id: string;
    creation_id: string;
    proposal_number: string;          // Ej: "PROP-2026-001"
    version: number;                  // 1, 2, 3...
    version_number?: number;          // Alias exacto de columna SQL
    title: string;                    // Título de la opción estética
    status: ProposalStatus;
    currency?: CommercialCurrency;
    snapshot: ProposalSnapshot;
    notes?: string | null;
    approved_at?: string | null;
    presented_at?: string | null;
    decided_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateProposalDTO {
    creation_id: string;
    title: string;
    materials: ProposalMaterialItem[];
    labor: ProposalLaborItem[];
    currency?: CommercialCurrency;
    notes?: string | null;
}

export interface UpdateProposalDTO {
    title?: string;
    status?: ProposalStatus;
    materials?: ProposalMaterialItem[];
    labor?: ProposalLaborItem[];
    currency?: CommercialCurrency;
    notes?: string | null;
    approved_at?: string | null;
}

// ==============================================================================
// 4. COTIZACIONES COMERCIALES FORMALES (commercial_quotes & items)
// ==============================================================================

export type QuoteStatus =
    | 'draft'          // Borrador de cotización
    | 'sent'           // Enviada formalmente en PDF a la clienta
    | 'accepted'       // Aceptada formalmente (convierte a Proyecto)
    | 'rejected'       // Rechazada
    | 'expired';       // Vencida sin respuesta

export interface QuoteCalculation {
    materials_subtotal: number;
    labor_subtotal: number;
    subtotal: number;
    discount_percentage: number;      // 0 a 100
    discount_amount: number;
    tax_percentage: number;           // Configurable: 19% IVA o 0% si aplica exclusión
    tax_amount: number;
    total: number;
    suggested_advance_percentage: number;  // 50% canónico de alta costura
    suggested_advance_amount: number;
}

export interface CommercialQuote {
    id: string;
    creation_id: string;
    proposal_id?: string | null;      // Opcional: vinculada a una propuesta previa
    quote_number: string;             // Ej: "COT-2026-0042"
    status: QuoteStatus;
    currency?: CommercialCurrency;
    calculation: QuoteCalculation;
    proposal_snapshot?: ProposalSnapshot | null; // Snapshot congelado de propuesta origen
    client_name_snapshot: string;     // Congelado para preservar el A4 inmutable
    client_id_snapshot?: string | null;
    creation_name_snapshot: string;
    valid_until: string;              // Fecha límite de vigencia
    terms_and_conditions?: string | null; // Términos de entrega, pruebas y pago
    notes?: string | null;
    accepted_at?: string | null;
    rejected_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateQuoteDTO {
    creation_id: string;
    proposal_id?: string | null;
    currency?: CommercialCurrency;
    calculation: QuoteCalculation;
    proposal_snapshot?: ProposalSnapshot | null;
    client_name_snapshot: string;
    client_id_snapshot?: string | null;
    creation_name_snapshot: string;
    valid_until: string;
    terms_and_conditions?: string | null;
    notes?: string | null;
}

export interface UpdateQuoteDTO {
    status?: QuoteStatus;
    valid_until?: string;
    terms_and_conditions?: string | null;
    notes?: string | null;
}

// ==============================================================================
// 5. PROYECTOS OPERATIVOS DE TALLER (atelier_projects)
// ==============================================================================

export type ProjectOperationalStatus =
    | 'planning'       // Planificación de taller y compra de insumos
    | 'cutting'        // Trazado y corte de piezas definitivas
    | 'assembly'       // Hilván y armado estructural
    | 'first_fitting'  // Primera prueba (glasilla o estructura)
    | 'adjustments'    // Aplicación de ajustes anatómicos post-fitting
    | 'second_fitting' // Segunda prueba (caída y precisión milimétrica)
    | 'finishing'      // Bordados, ojales sastre, terminaciones a mano
    | 'delivered'      // Prenda entregada con satisfacción
    | 'cancelled';     // Cancelado

export interface CommercialProject {
    id: string;
    creation_id: string;
    quote_id?: string | null;         // Vinculación única e idempotente
    project_code: string;             // Ej: "PRJ-2026-0012"
    project_number?: string;          // Alias para compatibilidad con esquema SQL satélite
    operational_status: ProjectOperationalStatus;
    current_stage?: ProjectOperationalStatus; // Alias para compatibilidad con esquema SQL satélite
    estimated_delivery_date?: string | null;
    actual_delivery_date?: string | null;
    priority: 'normal' | 'high' | 'urgent';
    assigned_tailor?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateProjectDTO {
    creation_id: string;
    quote_id?: string | null;
    estimated_delivery_date?: string | null;
    priority?: 'normal' | 'high' | 'urgent';
    assigned_tailor?: string | null;
    notes?: string | null;
}

export interface UpdateProjectDTO {
    operational_status?: ProjectOperationalStatus;
    estimated_delivery_date?: string | null;
    actual_delivery_date?: string | null;
    priority?: 'normal' | 'high' | 'urgent';
    assigned_tailor?: string | null;
    notes?: string | null;
}

// ==============================================================================
// 6. CONTROL FINANCIERO Y MOVIMIENTOS DE CAJA (financial_movements)
// ==============================================================================

export type TransactionType =
    | 'advance'          // Anticipo del 50%
    | 'installment'      // Abono intermedio
    | 'final_payment'    // Cancelación final contra entrega
    | 'refund'           // Devolución / Reembolso
    | 'material_purchase'// Egreso real: compra de telas e insumos
    | 'workshop_expense';// Egreso real: confección, bordados o servicios externos

export type PaymentMethod =
    | 'cash'             // Efectivo
    | 'transfer'         // Transferencia bancaria directa
    | 'card'             // Tarjeta débito / crédito
    | 'wompi'            // Pasarela Wompi
    | 'bold'             // Datafono Bold
    | 'other';           // Otro medio acordado

export interface FinancialTransaction {
    id: string;
    creation_id: string;
    project_id?: string | null;
    transaction_type: TransactionType;
    amount: number;
    currency?: CommercialCurrency;
    payment_method: PaymentMethod;
    reference_number?: string | null; // Número de comprobante o aprobación
    receipt_url?: string | null;      // Fotografía o PDF del recibo
    transaction_date: string;         // Fecha efectiva del movimiento
    idempotency_key?: string | null;  // Llave única para evitar duplicados
    is_void?: boolean;                // Anulación auditada
    voided_at?: string | null;
    voided_by?: string | null;
    void_reason?: string | null;
    notes?: string | null;
    created_at: string;
}

export interface CreateTransactionDTO {
    creation_id: string;
    project_id?: string | null;
    transaction_type: TransactionType;
    amount: number;
    currency?: CommercialCurrency;
    payment_method: PaymentMethod;
    reference_number?: string | null;
    receipt_url?: string | null;
    transaction_date?: string;
    idempotency_key?: string | null;
    notes?: string | null;
}

export interface VoidTransactionDTO {
    transaction_id: string;
    void_reason: string;
}

export interface FinancialSummary {
    quoted_total: number;             // Total cotizado formalmente
    total_income: number;             // Total recaudado en anticipos y abonos
    balance_pending: number;          // Saldo pendiente por cobrar (quoted_total - total_income)
    total_expenses: number;           // Egresos reales registrados en compras y taller
    project_gross_margin: number;     // Margen bruto (total_income - total_expenses)
    payment_status: 'unpaid' | 'partially_paid' | 'paid_in_full';
    currency?: CommercialCurrency;
}

// ==============================================================================
// 7. ARCHIVOS Y MEDIOS COMERCIALES (commercial_media_assets)
// ==============================================================================

export type CommercialAssetType =
    | 'sketch'
    | 'fabric_swatch'
    | 'fitting_photo'
    | 'payment_receipt'
    | 'delivery_note'
    | 'other';

export interface CommercialMediaAsset {
    id: string;
    creation_id: string;
    proposal_id?: string | null;
    quote_id?: string | null;
    project_id?: string | null;
    fitting_session_id?: string | null;
    asset_type: CommercialAssetType;
    file_path: string;
    file_name: string;
    mime_type?: string | null;
    file_size_bytes?: number | null;
    description?: string | null;
    idempotency_key?: string | null;
    created_by?: string | null;
    created_at: string;
}

export interface CreateMediaAssetDTO {
    creation_id: string;
    proposal_id?: string | null;
    quote_id?: string | null;
    project_id?: string | null;
    fitting_session_id?: string | null;
    asset_type: CommercialAssetType;
    file_path: string;
    file_name: string;
    mime_type?: string | null;
    file_size_bytes?: number | null;
    description?: string | null;
    idempotency_key?: string | null;
    created_by?: string | null;
}

// ==============================================================================
// 8. BITÁCORA Y EVENTOS COMERCIALES TRAZABLES (commercial_events)
// ==============================================================================

export interface CommercialEvent {
    id: string;
    creation_id: string;
    proposal_id?: string | null;
    quote_id?: string | null;
    project_id?: string | null;
    event_type: string;
    title: string;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
    created_by?: string | null;
}

export interface CreateCommercialEventDTO {
    creation_id: string;
    proposal_id?: string | null;
    quote_id?: string | null;
    project_id?: string | null;
    event_type: string;
    title: string;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
}

// ==============================================================================
// 9. MÓDULO M05: PROVEEDORES, STOCK APPEND-ONLY, TRM MANUAL Y STORAGE PRIVADO
// ==============================================================================

export const COMMERCIAL_ASSETS_BUCKET = 'commercial-assets' as const;
export const COMMERCIAL_ASSET_MAX_BYTES = 10485760; // 10 MB (límite remoto bucket commercial-assets)
export const COMMERCIAL_ASSET_ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
] as const;

export type CommercialAssetAllowedMimeType = (typeof COMMERCIAL_ASSET_ALLOWED_MIME_TYPES)[number];
export type CommercialStorageScope =
    | 'materials'
    | 'suppliers'
    | 'swatches'
    | 'documents'
    | 'fittings'
    | 'deliveries';

export interface CommercialStorageUploadInput {
    uri: string;
    scope: CommercialStorageScope;
    entityId?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    upsert?: boolean;
}

export interface CommercialStorageUploadResult {
    bucket: typeof COMMERCIAL_ASSETS_BUCKET;
    storagePath: string;
    signedUrl: string | null;
    mimeType: CommercialAssetAllowedMimeType;
    fileSizeBytes: number;
    fileName: string;
}

export const SUPPLIER_TYPES = [
    'fabric_house',
    'haberdashery',
    'embroidery_atelier',
    'interlining_specialist',
    'trim_artisan',
    'importer',
    'other',
] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const SUPPLIER_CURRENCIES = ['COP', 'USD', 'EUR'] as const;
export type SupplierCurrency = (typeof SUPPLIER_CURRENCIES)[number];

export interface AtelierSupplierSummary {
    id: string;
    code?: string | null;
    name: string;
    trade_name?: string | null;
    supplier_type: SupplierType;
    city?: string | null;
    country?: string | null;
    default_currency: SupplierCurrency;
    lead_time_days?: number | null;
    is_preferred: boolean;
    is_active: boolean;
}

export interface AtelierSupplier extends AtelierSupplierSummary {
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    address?: string | null;
    min_order_policy?: string | null;
    payment_terms?: string | null;
    tax_id?: string | null;
    specialty_tags: string[];
    storage_path?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateSupplierDTO {
    code?: string | null;
    name: string;
    trade_name?: string | null;
    supplier_type?: SupplierType;
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
    address?: string | null;
    default_currency?: SupplierCurrency;
    lead_time_days?: number | null;
    min_order_policy?: string | null;
    payment_terms?: string | null;
    tax_id?: string | null;
    specialty_tags?: string[] | null;
    storage_path?: string | null;
    notes?: string | null;
    is_preferred?: boolean;
    is_active?: boolean;
}

export type UpdateSupplierDTO = Partial<CreateSupplierDTO>;

export interface SupplierFilter {
    searchQuery?: string;
    supplierType?: SupplierType | 'all';
    onlyActive?: boolean;
    onlyPreferred?: boolean;
    currency?: SupplierCurrency | 'all';
}

export const STOCK_ADJUSTMENT_TYPES = [
    'manual_count',
    'manual_in',
    'manual_out',
    'purchase_entry',
    'initial_load',
] as const;

export type StockAdjustmentType = (typeof STOCK_ADJUSTMENT_TYPES)[number];

/**
 * Registro inmutable (append-only) de `public.atelier_material_stock_adjustments`.
 * Nunca se edita ni se elimina.
 */
export interface MaterialStockAdjustment {
    id: string;
    material_id: string;
    material_name_snapshot?: string | null;
    unit_snapshot?: MaterialUnit | null;
    adjustment_type: StockAdjustmentType;
    quantity_delta: number;
    previous_stock?: number | null;
    new_stock?: number | null;
    creation_id?: string | null;
    supplier_id?: string | null;
    financial_movement_id?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at: string;
}

export interface CreateStockAdjustmentDTO {
    material_id: string;
    adjustment_type: StockAdjustmentType;
    /** Delta firmado (+/-). Obligatorio salvo que se envíe `target_new_stock`. */
    quantity_delta?: number;
    /** Conteo objetivo explícito (especialmente útil para `manual_count`); calcula el delta automáticamente. */
    target_new_stock?: number;
    /** Stock previo explícito cuando no se toma el stock actual del material. */
    previous_stock?: number;
    material_name_snapshot?: string | null;
    unit_snapshot?: MaterialUnit | null;
    creation_id?: string | null;
    supplier_id?: string | null;
    financial_movement_id?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    /** Actualiza `atelier_materials.current_stock` y `last_stock_check_at` tras registrar el evento (default: true). */
    update_material_stock?: boolean;
}

export const CURRENCY_RATE_BASE_CURRENCIES = ['USD', 'EUR', 'COP'] as const;
export type CurrencyRateBase = (typeof CURRENCY_RATE_BASE_CURRENCIES)[number];

export const CURRENCY_RATE_TARGET_CURRENCIES = ['COP', 'USD'] as const;
export type CurrencyRateTarget = (typeof CURRENCY_RATE_TARGET_CURRENCIES)[number];

export interface AtelierCurrencyRate {
    id: string;
    base_currency: CurrencyRateBase;
    target_currency: CurrencyRateTarget;
    rate_value: number;
    effective_date: string;
    source_note?: string | null;
    is_active: boolean;
    updated_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateCurrencyRateDTO {
    base_currency?: CurrencyRateBase;
    target_currency?: CurrencyRateTarget;
    rate_value: number;
    effective_date?: string;
    source_note?: string | null;
    is_active?: boolean;
}

export interface UpdateCurrencyRateDTO {
    rate_value?: number;
    effective_date?: string;
    source_note?: string | null;
    is_active?: boolean;
}
