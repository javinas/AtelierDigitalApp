// ==============================================================================
// ATELIER DIGITAL — SERVICIO: MÓDULO 03 — CICLO COMERCIAL Y SATÉLITE
// Archivo: src/services/commercialService.ts
// ==============================================================================
// Gestiona el ciclo comercial integral del atelier bajo la arquitectura satélite de 10 tablas:
// Perfiles → Telas → Propuestas v1..vn → Cotizaciones A4 → Taller → Finanzas Auditadas → Storage
// ==============================================================================

import { supabase } from '../supabase';
import {
    AtelierCurrencyRate,
    AtelierSupplier,
    AtelierSupplierSummary,
    COMMERCIAL_ASSETS_BUCKET,
    COMMERCIAL_ASSET_ALLOWED_MIME_TYPES,
    COMMERCIAL_ASSET_MAX_BYTES,
    CURRENCY_RATE_BASE_CURRENCIES,
    CURRENCY_RATE_TARGET_CURRENCIES,
    CommercialAssetAllowedMimeType,
    CommercialCurrency,
    CommercialEvent,
    CommercialMediaAsset,
    CommercialProject,
    CommercialQuote,
    CommercialStorageScope,
    CommercialStorageUploadInput,
    CommercialStorageUploadResult,
    CreateCommercialEventDTO,
    CreateCurrencyRateDTO,
    CreateMaterialDTO,
    CreateMediaAssetDTO,
    CreateProjectDTO,
    CreateProposalDTO,
    CreateQuoteDTO,
    CreateStockAdjustmentDTO,
    CreateSupplierDTO,
    CreateTransactionDTO,
    CreationCommercialProfile,
    CurrencyRateBase,
    CurrencyRateTarget,
    DesignProposal,
    FinancialMovement,
    FinancialMovementType,
    FinancialPaymentMethod,
    FinancialStateSummary,
    FinancialSummary,
    FinancialTransaction,
    AtelierFinancialOverview,
    AtelierFinancialCreationItem,
    M07_ERROR_NAMES,
    M07_SQLSTATE_CODES,
    M07ServiceErrorDetails,
    RecordFinancialMovementDTO,
    VoidFinancialMovementDTO,
    MaterialFilter,
    MaterialItem,
    MaterialStockAdjustment,
    ProposalLaborItem,
    ProposalMaterialItem,
    ProposalSnapshot,
    QuoteCalculation,
    STOCK_ADJUSTMENT_TYPES,
    SUPPLIER_CURRENCIES,
    SUPPLIER_TYPES,
    SupplierCurrency,
    SupplierFilter,
    SupplierType,
    UpdateCommercialProfileDTO,
    UpdateMaterialDTO,
    UpdateProjectDTO,
    UpdateProposalDTO,
    UpdateQuoteDTO,
    UpdateSupplierDTO,
    VoidTransactionDTO,
    calculateBillableMaterialQuantity,
    normalizeMaterialCategory,
    normalizeMaterialDrapeProfile,
    normalizeMaterialUnit,
    validateMaterialRemotePersistence,
} from '../types/commercial';
import {
    SAMPLE_COMMERCIAL_EVENTS,
    SAMPLE_PROJECTS,
    SAMPLE_PROPOSALS,
    SAMPLE_QUOTES,
    SAMPLE_TRANSACTIONS,
} from './commercialMockData';

// ==============================================================================
// 0. VALIDACIÓN UUID Y NORMALIZADORES BIDIRECCIONALES SQL ↔ UI (DEF-M03-05 / AUD-PRE-02)
// ==============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): boolean {
    return Boolean(value && UUID_REGEX.test(value));
}

export const MOCK_UUID_PERSISTENCE_ERROR =
    'Identificador de demostración (no UUID): operación no persistida en Supabase.';

function sanitizeOptionalText(value?: string | null): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string') continue;
        const cleaned = item.trim();
        if (!cleaned || seen.has(cleaned)) continue;
        seen.add(cleaned);
        result.push(cleaned);
    }
    return result;
}

function roundToDecimals(value: number, decimals = 2): number {
    return Number(value.toFixed(decimals));
}

function validateNonNegativeNumber(
    value: unknown,
    fieldLabel: string
): { value: number | null; error: string | null } {
    if (value === null || value === undefined || value === '') {
        return { value: null, error: null };
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return {
            value: null,
            error: `${fieldLabel} debe ser un valor numérico mayor o igual a 0.`,
        };
    }
    return { value: parsed, error: null };
}

function mapConstraintErrorMessage(
    error: { code?: string; message?: string; details?: string } | null | undefined,
    mappings: [string, string][],
    fallbackMessage: string
): string {
    if (!error) return fallbackMessage;
    const haystack = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    for (const [token, friendly] of mappings) {
        if (haystack.includes(token.toLowerCase())) {
            return friendly;
        }
    }
    return error.message || fallbackMessage;
}

function normalizeSupplierSummary(row: Record<string, unknown>): AtelierSupplierSummary {
    const rawType = String(row.supplier_type || 'fabric_house') as SupplierType;
    const resolvedType = (SUPPLIER_TYPES as readonly string[]).includes(rawType)
        ? rawType
        : 'fabric_house';
    const rawCurrency = String(row.default_currency || 'COP').toUpperCase() as SupplierCurrency;
    const resolvedCurrency = (SUPPLIER_CURRENCIES as readonly string[]).includes(rawCurrency)
        ? rawCurrency
        : 'COP';

    return {
        id: String(row.id),
        code: sanitizeOptionalText(row.code as string | null | undefined),
        name: String(row.name || ''),
        trade_name: sanitizeOptionalText(row.trade_name as string | null | undefined),
        supplier_type: resolvedType,
        city: sanitizeOptionalText(row.city as string | null | undefined),
        country: sanitizeOptionalText(row.country as string | null | undefined),
        default_currency: resolvedCurrency,
        lead_time_days:
            row.lead_time_days !== null && row.lead_time_days !== undefined
                ? Number(row.lead_time_days)
                : null,
        is_preferred: Boolean(row.is_preferred),
        is_active: row.is_active !== false,
    };
}

function normalizeSupplierRow(row: Record<string, unknown>): AtelierSupplier {
    const summary = normalizeSupplierSummary(row);
    return {
        ...(row as unknown as AtelierSupplier),
        ...summary,
        contact_name: sanitizeOptionalText(row.contact_name as string | null | undefined),
        email: sanitizeOptionalText(row.email as string | null | undefined),
        phone: sanitizeOptionalText(row.phone as string | null | undefined),
        whatsapp: sanitizeOptionalText(row.whatsapp as string | null | undefined),
        website: sanitizeOptionalText(row.website as string | null | undefined),
        address: sanitizeOptionalText(row.address as string | null | undefined),
        min_order_policy: sanitizeOptionalText(row.min_order_policy as string | null | undefined),
        payment_terms: sanitizeOptionalText(row.payment_terms as string | null | undefined),
        tax_id: sanitizeOptionalText(row.tax_id as string | null | undefined),
        specialty_tags: normalizeStringArray(row.specialty_tags),
        storage_path: sanitizeOptionalText(row.storage_path as string | null | undefined),
        notes: sanitizeOptionalText(row.notes as string | null | undefined),
        created_by: sanitizeOptionalText(row.created_by as string | null | undefined),
    };
}

function normalizeMaterialRow(row: Record<string, unknown>): MaterialItem {
    const normalizedCategory = normalizeMaterialCategory(row.category as string) ?? 'fabric';
    const normalizedUnit = normalizeMaterialUnit(row.unit as string) ?? 'unit';
    const resolvedCop = Number(row.unit_price ?? row.unit_price_cop ?? 0);
    const rawSupplier =
        row.supplier && typeof row.supplier === 'object'
            ? (row.supplier as Record<string, unknown>)
            : null;

    return {
        ...(row as unknown as MaterialItem),
        category: normalizedCategory,
        unit: normalizedUnit,
        unit_price: resolvedCop,
        unit_price_cop: resolvedCop,
        unit_price_usd: Number(row.unit_price_usd ?? 0),
        min_purchase_unit: Number(row.min_purchase_unit ?? 1),
        current_stock:
            row.current_stock !== null && row.current_stock !== undefined
                ? Number(row.current_stock)
                : 0,
        weight_gsm:
            row.weight_gsm !== null && row.weight_gsm !== undefined
                ? Number(row.weight_gsm)
                : null,
        drape_profile: normalizeMaterialDrapeProfile(row.drape_profile as string | null | undefined),
        tags: normalizeStringArray(row.tags),
        supplier: rawSupplier ? normalizeSupplierSummary(rawSupplier) : null,
    };
}

function normalizeStockAdjustmentRow(row: Record<string, unknown>): MaterialStockAdjustment {
    return {
        ...(row as unknown as MaterialStockAdjustment),
        unit_snapshot: normalizeMaterialUnit(row.unit_snapshot as string | null | undefined),
        quantity_delta: Number(row.quantity_delta ?? 0),
        previous_stock:
            row.previous_stock !== null && row.previous_stock !== undefined
                ? Number(row.previous_stock)
                : null,
        new_stock:
            row.new_stock !== null && row.new_stock !== undefined
                ? Number(row.new_stock)
                : null,
    };
}

function normalizeCurrencyRateRow(row: Record<string, unknown>): AtelierCurrencyRate {
    return {
        ...(row as unknown as AtelierCurrencyRate),
        base_currency: String(row.base_currency || 'USD').toUpperCase() as CurrencyRateBase,
        target_currency: String(row.target_currency || 'COP').toUpperCase() as CurrencyRateTarget,
        rate_value: Number(row.rate_value ?? 0),
        is_active: Boolean(row.is_active),
    };
}

function normalizeProposalRow(row: Record<string, unknown>): DesignProposal {
    const rawSnap = (row.snapshot || row.snapshot_data) as ProposalSnapshot | undefined;
    const resolvedCurrency = (row.currency || rawSnap?.currency || 'COP') as CommercialCurrency;
    const resolvedVersion = Number(row.version ?? row.version_number ?? 1);
    const resolvedApprovedAt = (row.approved_at ?? row.decided_at ?? null) as string | null;

    const normalizedMaterials: ProposalMaterialItem[] = (rawSnap?.materials || []).map((m) => {
        const reqQty = Number(m.required_quantity ?? m.required_qty ?? 1);
        const minUnit = m.min_purchase_unit !== undefined ? Number(m.min_purchase_unit) : undefined;
        const rawBillable = Number(m.billable_quantity ?? m.billable_qty ?? reqQty);
        const billQty =
            minUnit !== undefined
                ? calculateBillableMaterialQuantity(reqQty, minUnit)
                : Math.max(reqQty, rawBillable);
        const cat =
            normalizeMaterialCategory(String(m.category || m.material_category || 'fabric')) ||
            'fabric';
        const unit = normalizeMaterialUnit(String(m.unit || 'm')) || 'm';
        const name = m.name || m.material_name || 'Material';

        return {
            ...m,
            name,
            material_name: m.material_name || name,
            category: cat,
            material_category: cat,
            unit,
            required_qty: reqQty,
            required_quantity: reqQty,
            billable_qty: billQty,
            billable_quantity: billQty,
            unit_price: Number(m.unit_price ?? 0),
            subtotal: Number(m.subtotal ?? 0),
        };
    });

    return {
        ...(row as unknown as DesignProposal),
        version: resolvedVersion,
        version_number: resolvedVersion,
        currency: resolvedCurrency,
        approved_at: resolvedApprovedAt,
        decided_at: resolvedApprovedAt,
        snapshot: rawSnap
            ? {
                  ...rawSnap,
                  materials: normalizedMaterials,
                  labor: rawSnap.labor || [],
                  materials_cost: Number(rawSnap.materials_cost ?? row.materials_subtotal ?? 0),
                  labor_cost: Number(rawSnap.labor_cost ?? row.labor_subtotal ?? 0),
                  estimated_total: Number(rawSnap.estimated_total ?? row.total_price ?? 0),
                  currency: resolvedCurrency,
              }
            : {
                  materials: [],
                  labor: [],
                  materials_cost: Number(row.materials_subtotal ?? 0),
                  labor_cost: Number(row.labor_subtotal ?? 0),
                  estimated_total: Number(row.total_price ?? 0),
                  currency: resolvedCurrency,
                  snapshot_date: String(row.created_at || new Date().toISOString()),
              },
        notes: (row.notes ?? row.description ?? null) as string | null,
    };
}

function normalizeQuoteRow(row: Record<string, unknown>): CommercialQuote {
    const rawSnap = (row.snapshot_data || row.calculation) as Record<string, unknown> | undefined;
    const resolvedCurrency = (row.currency || rawSnap?.currency || 'COP') as CommercialCurrency;
    const fallbackSubtotalGross = Number(row.subtotal_gross ?? 0);
    const fallbackDiscountAmount = Number(row.discount_amount ?? 0);
    const fallbackDiscountPct =
        fallbackSubtotalGross > 0 && fallbackDiscountAmount > 0
            ? Number(((fallbackDiscountAmount / fallbackSubtotalGross) * 100).toFixed(2))
            : 0;

    const calc: QuoteCalculation =
        rawSnap && 'total' in rawSnap
            ? {
                  materials_subtotal: Number(rawSnap.materials_subtotal ?? 0),
                  labor_subtotal: Number(rawSnap.labor_subtotal ?? 0),
                  subtotal: Number(rawSnap.subtotal ?? fallbackSubtotalGross),
                  discount_percentage: Number(rawSnap.discount_percentage ?? fallbackDiscountPct),
                  discount_amount: Number(rawSnap.discount_amount ?? fallbackDiscountAmount),
                  tax_percentage: Number(rawSnap.tax_percentage ?? row.tax_rate_pct ?? 0),
                  tax_amount: Number(rawSnap.tax_amount ?? row.tax_amount ?? 0),
                  total: Number(rawSnap.total ?? row.total_price ?? 0),
                  suggested_advance_percentage: Number(rawSnap.suggested_advance_percentage ?? 50),
                  suggested_advance_amount: Number(
                      rawSnap.suggested_advance_amount ?? row.advance_suggested_amount ?? 0
                  ),
              }
            : {
                  materials_subtotal: fallbackSubtotalGross,
                  labor_subtotal: 0,
                  subtotal: fallbackSubtotalGross,
                  discount_percentage: fallbackDiscountPct,
                  discount_amount: fallbackDiscountAmount,
                  tax_percentage: Number(row.tax_rate_pct ?? 0),
                  tax_amount: Number(row.tax_amount ?? 0),
                  total: Number(row.total_price ?? 0),
                  suggested_advance_percentage: 50,
                  suggested_advance_amount: Number(row.advance_suggested_amount ?? 0),
              };

    return {
        ...(row as unknown as CommercialQuote),
        currency: resolvedCurrency,
        calculation: calc,
        proposal_snapshot: (row.proposal_snapshot ||
            rawSnap?.proposal_snapshot ||
            null) as ProposalSnapshot | null,
        creation_name_snapshot: String(row.creation_name_snapshot || 'Creación de Alta Costura'),
    };
}

function normalizeProjectRow(row: Record<string, unknown>): CommercialProject {
    return {
        ...(row as unknown as CommercialProject),
        project_code: String(row.project_code || row.project_number || 'PRJ-ATELIER'),
        operational_status: (row.operational_status || row.current_stage || 'planning') as CommercialProject['operational_status'],
    };
}

function normalizeTransactionRow(row: Record<string, unknown>): FinancialTransaction {
    return {
        ...(row as unknown as FinancialTransaction),
        transaction_type: (row.transaction_type || row.movement_type || 'advance') as FinancialTransaction['transaction_type'],
        transaction_date: String(row.transaction_date || row.movement_date || new Date().toISOString().split('T')[0]),
    };
}

// ==============================================================================
// 1. PERFIL COMERCIAL SATÉLITE (creation_commercial_profiles)
// ==============================================================================

export async function fetchCommercialProfile(
    creationId: string
): Promise<{ data: CreationCommercialProfile | null; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('creation_commercial_profiles')
            .select('*')
            .eq('creation_id', creationId)
            .maybeSingle();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as CreationCommercialProfile, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar perfil comercial satélite.';
        return { data: null, error: message };
    }
}

export async function upsertCommercialProfile(
    creationId: string,
    dto: UpdateCommercialProfileDTO
): Promise<{ data: CreationCommercialProfile | null; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('creation_commercial_profiles')
            .upsert(
                {
                    creation_id: creationId,
                    ...dto,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'creation_id' }
            )
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as CreationCommercialProfile, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar perfil comercial satélite.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 2. MATERIALES, TELAS E INSUMOS (atelier_materials con compatibilidad M03/M05)
// ==============================================================================

const MATERIAL_SELECT_WITH_SUPPLIER =
    '*, supplier:atelier_suppliers(id, code, name, trade_name, supplier_type, city, country, default_currency, lead_time_days, is_preferred, is_active)';

const MATERIAL_UNIQUE_ERROR_MAP: [string, string][] = [
    ['uidx_atelier_materials_sku_code', 'Ya existe un material registrado con ese código SKU.'],
    ['sku_code', 'Ya existe un material registrado con ese código SKU.'],
];

const M05_ONLY_MATERIAL_KEYS = [
    'supplier_id',
    'sku_code',
    'weight_gsm',
    'drape_profile',
    'care_instructions',
    'storage_path',
    'photo_url',
    'tags',
    'last_stock_check_at',
    'unit_price_usd',
];

function toLegacyMaterialsPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const legacy = { ...payload };
    if ('unit_price_cop' in legacy) {
        legacy.unit_price = legacy.unit_price_cop;
        delete legacy.unit_price_cop;
    }
    for (const key of M05_ONLY_MATERIAL_KEYS) {
        delete legacy[key];
    }
    return legacy;
}

function buildMaterialWritePayload(
    dto: CreateMaterialDTO | UpdateMaterialDTO,
    isCreate: boolean
): { payload: Record<string, unknown> | null; error: string | null } {
    if (isCreate && (!dto.name || !dto.name.trim())) {
        return { payload: null, error: 'El nombre del material o tela es obligatorio.' };
    }
    if (!isCreate && dto.name !== undefined && !dto.name.trim()) {
        return { payload: null, error: 'El nombre del material no puede quedar vacío.' };
    }

    const contractValidation = validateMaterialRemotePersistence({
        category: dto.category,
        unit: isCreate ? dto.unit ?? 'm' : dto.unit,
        requireCategory: isCreate,
        requireUnit: isCreate,
    });
    if (contractValidation.error) {
        return { payload: null, error: contractValidation.error };
    }

    const copCheck = validateNonNegativeNumber(
        isCreate ? dto.unit_price ?? 0 : dto.unit_price,
        'El precio unitario COP'
    );
    if (copCheck.error) return { payload: null, error: copCheck.error };

    const usdCheck = validateNonNegativeNumber(
        isCreate ? dto.unit_price_usd ?? 0 : dto.unit_price_usd,
        'El precio unitario USD'
    );
    if (usdCheck.error) return { payload: null, error: usdCheck.error };

    const widthCheck = validateNonNegativeNumber(dto.width_cm, 'El ancho (cm)');
    if (widthCheck.error) return { payload: null, error: widthCheck.error };

    const gsmCheck = validateNonNegativeNumber(dto.weight_gsm, 'El gramaje (gr/m²)');
    if (gsmCheck.error) return { payload: null, error: gsmCheck.error };

    const minPurchaseCheck = validateNonNegativeNumber(
        isCreate ? dto.min_purchase_unit ?? 1.0 : dto.min_purchase_unit,
        'La compra mínima'
    );
    if (minPurchaseCheck.error) return { payload: null, error: minPurchaseCheck.error };

    const stockCheck = validateNonNegativeNumber(
        isCreate ? dto.current_stock ?? 0 : dto.current_stock,
        'El stock actual'
    );
    if (stockCheck.error) return { payload: null, error: stockCheck.error };

    let resolvedSupplierId: string | null | undefined;
    if (dto.supplier_id !== undefined) {
        const cleanedSupplierId = sanitizeOptionalText(dto.supplier_id);
        if (cleanedSupplierId && !isValidUuid(cleanedSupplierId)) {
            return {
                payload: null,
                error: 'El identificador del proveedor (supplier_id) debe ser un UUID válido.',
            };
        }
        resolvedSupplierId = cleanedSupplierId;
    }

    let resolvedDrapeProfile: string | null | undefined;
    if (dto.drape_profile !== undefined) {
        const cleanedDrape = sanitizeOptionalText(dto.drape_profile);
        if (cleanedDrape) {
            const normalizedDrape = normalizeMaterialDrapeProfile(cleanedDrape);
            if (!normalizedDrape) {
                return {
                    payload: null,
                    error: `Perfil de caída no reconocido: "${String(dto.drape_profile)}".`,
                };
            }
            resolvedDrapeProfile = normalizedDrape;
        } else {
            resolvedDrapeProfile = null;
        }
    }

    const payload: Record<string, unknown> = {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(contractValidation.category !== undefined
            ? { category: contractValidation.category }
            : {}),
        ...(dto.composition !== undefined
            ? { composition: sanitizeOptionalText(dto.composition) }
            : {}),
        ...(dto.width_cm !== undefined ? { width_cm: widthCheck.value } : {}),
        ...(resolvedSupplierId !== undefined ? { supplier_id: resolvedSupplierId } : {}),
        ...(dto.supplier_name !== undefined
            ? { supplier_name: sanitizeOptionalText(dto.supplier_name) }
            : {}),
        ...(dto.supplier_ref !== undefined
            ? { supplier_ref: sanitizeOptionalText(dto.supplier_ref) }
            : {}),
        ...(dto.sku_code !== undefined ? { sku_code: sanitizeOptionalText(dto.sku_code) } : {}),
        ...(dto.weight_gsm !== undefined ? { weight_gsm: gsmCheck.value } : {}),
        ...(resolvedDrapeProfile !== undefined ? { drape_profile: resolvedDrapeProfile } : {}),
        ...(dto.care_instructions !== undefined
            ? { care_instructions: sanitizeOptionalText(dto.care_instructions) }
            : {}),
        ...(copCheck.value !== null && (isCreate || dto.unit_price !== undefined)
            ? { unit_price_cop: copCheck.value }
            : {}),
        ...(usdCheck.value !== null && (isCreate || dto.unit_price_usd !== undefined)
            ? { unit_price_usd: usdCheck.value }
            : {}),
        ...(contractValidation.unit !== undefined ? { unit: contractValidation.unit } : {}),
        ...(minPurchaseCheck.value !== null && (isCreate || dto.min_purchase_unit !== undefined)
            ? { min_purchase_unit: minPurchaseCheck.value }
            : {}),
        ...(stockCheck.value !== null && (isCreate || dto.current_stock !== undefined)
            ? { current_stock: stockCheck.value }
            : {}),
        ...(dto.color_code !== undefined ? { color_code: sanitizeOptionalText(dto.color_code) } : {}),
        ...(dto.color_name !== undefined ? { color_name: sanitizeOptionalText(dto.color_name) } : {}),
        ...(dto.storage_path !== undefined
            ? { storage_path: sanitizeOptionalText(dto.storage_path) }
            : {}),
        ...(dto.photo_url !== undefined ? { photo_url: sanitizeOptionalText(dto.photo_url) } : {}),
        ...(dto.tags !== undefined ? { tags: normalizeStringArray(dto.tags) } : {}),
        ...(dto.notes !== undefined ? { notes: sanitizeOptionalText(dto.notes) } : {}),
        ...(dto.last_stock_check_at !== undefined
            ? { last_stock_check_at: sanitizeOptionalText(dto.last_stock_check_at) }
            : {}),
        ...(!isCreate && 'is_active' in dto && dto.is_active !== undefined
            ? { is_active: dto.is_active }
            : {}),
    };

    if (isCreate) {
        payload.is_active = true;
        if (payload.tags === undefined) payload.tags = [];
    }

    return { payload, error: null };
}

export async function fetchMaterials(
    filter?: MaterialFilter
): Promise<{ data: MaterialItem[]; error: string | null }> {
    try {
        const normalizedCategoryFilter =
            filter?.category && filter.category !== 'all'
                ? normalizeMaterialCategory(filter.category) ?? filter.category
                : null;

        if (filter?.supplierId && !isValidUuid(filter.supplierId)) {
            return { data: [], error: null };
        }

        let query = supabase
            .from('atelier_materials')
            .select(MATERIAL_SELECT_WITH_SUPPLIER)
            .order('name', { ascending: true });

        if (normalizedCategoryFilter) {
            query = query.eq('category', normalizedCategoryFilter);
        }

        if (filter?.onlyActive !== false) {
            query = query.eq('is_active', true);
        }

        if (filter?.supplierId) {
            query = query.eq('supplier_id', filter.supplierId);
        }

        if (filter?.supplier && filter.supplier.trim().length > 0) {
            query = query.ilike('supplier_name', `%${filter.supplier.trim()}%`);
        }

        if (filter?.drapeProfile && filter.drapeProfile !== 'all') {
            const normalizedDrape = normalizeMaterialDrapeProfile(filter.drapeProfile);
            if (normalizedDrape) {
                query = query.eq('drape_profile', normalizedDrape);
            }
        }

        if (filter?.tag && filter.tag.trim().length > 0) {
            query = query.contains('tags', [filter.tag.trim()]);
        }

        if (filter?.withStockOnly) {
            query = query.gt('current_stock', 0);
        }

        if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
            const safeTerm = filter.searchQuery.replace(/[,()]/g, ' ').trim();
            if (safeTerm.length > 0) {
                query = query.or(
                    `name.ilike.%${safeTerm}%,sku_code.ilike.%${safeTerm}%,supplier_ref.ilike.%${safeTerm}%,color_name.ilike.%${safeTerm}%,supplier_name.ilike.%${safeTerm}%,composition.ilike.%${safeTerm}%`
                );
            }
        }

        let { data, error } = await query;

        // Fallback legado exclusivamente si la tabla principal aún no existe en PostgREST (PGRST205)
        if (error && error.code === 'PGRST205') {
            let fallbackQuery = supabase
                .from('materials')
                .select('*')
                .order('name', { ascending: true });

            if (normalizedCategoryFilter) {
                fallbackQuery = fallbackQuery.eq('category', normalizedCategoryFilter);
            }
            if (filter?.onlyActive !== false) {
                fallbackQuery = fallbackQuery.eq('is_active', true);
            }
            if (filter?.supplier && filter.supplier.trim().length > 0) {
                fallbackQuery = fallbackQuery.ilike('supplier_name', `%${filter.supplier.trim()}%`);
            }

            const fallbackRes = await fallbackQuery;
            if (!fallbackRes.error) {
                data = fallbackRes.data;
                error = null;
            } else {
                return { data: [], error: fallbackRes.error.message };
            }
        }

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeMaterialRow),
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar catálogo de materiales.';
        return { data: [], error: message };
    }
}

export async function fetchMaterialById(
    id: string
): Promise<{ data: MaterialItem | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('atelier_materials')
            .select(MATERIAL_SELECT_WITH_SUPPLIER)
            .eq('id', id)
            .maybeSingle();

        if (error) {
            return { data: null, error: error.message };
        }

        if (!data) {
            return { data: null, error: null };
        }

        return { data: normalizeMaterialRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar el material.';
        return { data: null, error: message };
    }
}

export async function createMaterial(
    dto: CreateMaterialDTO
): Promise<{ data: MaterialItem | null; error: string | null }> {
    const { payload, error: validationError } = buildMaterialWritePayload(dto, true);
    if (validationError || !payload) {
        return { data: null, error: validationError || 'Datos inválidos para registrar material.' };
    }

    try {
        let { data, error } = await supabase
            .from('atelier_materials')
            .insert(payload)
            .select(MATERIAL_SELECT_WITH_SUPPLIER)
            .single();

        if (error) {
            if (error.code === 'PGRST205') {
                const fallbackRes = await supabase
                    .from('materials')
                    .insert(toLegacyMaterialsPayload(payload))
                    .select()
                    .single();

                if (!fallbackRes.error && fallbackRes.data) {
                    data = fallbackRes.data;
                } else {
                    return { data: null, error: fallbackRes.error?.message || error.message };
                }
            } else {
                return {
                    data: null,
                    error: mapConstraintErrorMessage(
                        error,
                        MATERIAL_UNIQUE_ERROR_MAP,
                        error.message || 'Error al registrar material.'
                    ),
                };
            }
        }

        return { data: normalizeMaterialRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar material.';
        return { data: null, error: message };
    }
}

export async function updateMaterial(
    id: string,
    dto: UpdateMaterialDTO
): Promise<{ data: MaterialItem | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const { payload, error: validationError } = buildMaterialWritePayload(dto, false);
    if (validationError || !payload) {
        return { data: null, error: validationError || 'Datos inválidos para actualizar material.' };
    }

    try {
        let { data, error } = await supabase
            .from('atelier_materials')
            .update(payload)
            .eq('id', id)
            .select(MATERIAL_SELECT_WITH_SUPPLIER)
            .single();

        if (error) {
            if (error.code === 'PGRST205') {
                const fallback = await supabase
                    .from('materials')
                    .update(toLegacyMaterialsPayload(payload))
                    .eq('id', id)
                    .select()
                    .single();
                if (!fallback.error && fallback.data) {
                    data = fallback.data;
                } else {
                    return { data: null, error: fallback.error?.message || error.message };
                }
            } else {
                return {
                    data: null,
                    error: mapConstraintErrorMessage(
                        error,
                        MATERIAL_UNIQUE_ERROR_MAP,
                        error.message || 'Error al actualizar material.'
                    ),
                };
            }
        }

        return { data: normalizeMaterialRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar material.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 3. PROPUESTAS DE DISEÑO VERSIONADAS (creation_proposals & creation_proposal_items)
// ==============================================================================

function prepareProposalState(
    materials: ProposalMaterialItem[],
    labor: ProposalLaborItem[],
    currency: CommercialCurrency,
    snapshotDate?: string
): {
    normalizedMaterials: ProposalMaterialItem[];
    normalizedLabor: ProposalLaborItem[];
    materialsCost: number;
    laborCost: number;
    estimatedTotal: number;
    snapshot: ProposalSnapshot;
} {
    const normalizedMaterials: ProposalMaterialItem[] = (materials || []).map((m) => {
        const requiredQty = Number(m.required_quantity ?? m.required_qty ?? 1);
        const safeReq = Number.isFinite(requiredQty) ? Math.max(0, requiredQty) : 0;
        const minPurchase =
            m.min_purchase_unit !== undefined && m.min_purchase_unit !== null
                ? Number(m.min_purchase_unit)
                : Number(m.billable_quantity ?? m.billable_qty ?? safeReq);
        const billableQty = calculateBillableMaterialQuantity(safeReq, minPurchase);
        const unitPrice = Number(m.unit_price ?? 0);
        const safePrice = Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0;
        const subtotal = Number((billableQty * safePrice).toFixed(2));
        const normalizedCategory =
            normalizeMaterialCategory(String(m.category || m.material_category || 'fabric')) ||
            'fabric';
        const normalizedUnit = normalizeMaterialUnit(String(m.unit || 'm')) || 'm';
        const name = (m.name || m.material_name || 'Material').trim();

        return {
            ...m,
            material_id: isValidUuid(m.material_id) ? m.material_id : null,
            name,
            material_name: name,
            category: normalizedCategory,
            material_category: normalizedCategory,
            unit: normalizedUnit,
            required_qty: safeReq,
            required_quantity: safeReq,
            min_purchase_unit: m.min_purchase_unit ?? minPurchase,
            billable_qty: billableQty,
            billable_quantity: billableQty,
            unit_price: safePrice,
            subtotal,
        };
    });

    const normalizedLabor: ProposalLaborItem[] = (labor || []).map((l) => ({
        ...l,
        subtotal: Number((Number(l.subtotal) || 0).toFixed(2)),
    }));

    const materialsCost = Number(
        normalizedMaterials.reduce((acc, m) => acc + (m.subtotal || 0), 0).toFixed(2)
    );
    const laborCost = Number(
        normalizedLabor.reduce((acc, l) => acc + (l.subtotal || 0), 0).toFixed(2)
    );
    const estimatedTotal = Number((materialsCost + laborCost).toFixed(2));

    const snapshot: ProposalSnapshot = {
        materials: normalizedMaterials,
        labor: normalizedLabor,
        materials_cost: materialsCost,
        labor_cost: laborCost,
        estimated_total: estimatedTotal,
        currency,
        snapshot_date: snapshotDate || new Date().toISOString(),
    };

    return {
        normalizedMaterials,
        normalizedLabor,
        materialsCost,
        laborCost,
        estimatedTotal,
        snapshot,
    };
}

function buildProposalRelationalRows(
    proposalId: string,
    materials: ProposalMaterialItem[],
    labor: ProposalLaborItem[]
) {
    const materialRows = materials.map((m, idx) => ({
        proposal_id: proposalId,
        item_type: 'material' as const,
        material_id: isValidUuid(m.material_id) ? m.material_id : null,
        name: m.name || m.material_name || 'Material',
        category: String(m.category || m.material_category || 'fabric'),
        unit: String(m.unit || 'm'),
        required_quantity: Number(m.required_quantity ?? m.required_qty ?? 1.0),
        billable_quantity: Number(m.billable_quantity ?? m.billable_qty ?? 1.0),
        unit_price: Number(m.unit_price ?? 0),
        subtotal: Number(m.subtotal ?? 0),
        sort_order: idx,
        notes: m.notes || null,
    }));

    const laborRows = labor.map((l, idx) => ({
        proposal_id: proposalId,
        item_type: 'labor' as const,
        material_id: null,
        name: l.description.trim() || 'Mano de Obra Atelier',
        category: 'labor',
        unit: 'unit',
        required_quantity: Number(l.hours_estimated ?? 1),
        billable_quantity: Number(l.hours_estimated ?? 1),
        unit_price: Number(l.rate_per_hour ?? l.subtotal ?? 0),
        subtotal: Number(l.subtotal ?? 0),
        sort_order: materials.length + idx,
        notes: null,
    }));

    return [...materialRows, ...laborRows];
}

async function replaceProposalItems(
    proposalId: string,
    materials: ProposalMaterialItem[],
    labor: ProposalLaborItem[]
): Promise<string | null> {
    const { error: deleteErr } = await supabase
        .from('creation_proposal_items')
        .delete()
        .eq('proposal_id', proposalId);

    if (deleteErr) {
        return deleteErr.message;
    }

    const rows = buildProposalRelationalRows(proposalId, materials, labor);
    if (rows.length === 0) {
        return null;
    }

    const { error: insertErr } = await supabase
        .from('creation_proposal_items')
        .insert(rows);

    return insertErr ? insertErr.message : null;
}

export async function fetchProposalsByCreation(
    creationId: string
): Promise<{ data: DesignProposal[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        const fallback = SAMPLE_PROPOSALS.filter((p) => p.creation_id === creationId);
        return {
            data: fallback.length > 0 ? fallback : SAMPLE_PROPOSALS,
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    try {
        const { data, error } = await supabase
            .from('creation_proposals')
            .select('*')
            .eq('creation_id', creationId)
            .order('version_number', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeProposalRow),
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar propuestas de la creación.';
        return { data: [], error: message };
    }
}

export async function createProposal(
    dto: CreateProposalDTO
): Promise<{ data: DesignProposal | null; error: string | null }> {
    if (!isValidUuid(dto.creation_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data: latestVersionRows, error: versionErr } = await supabase
            .from('creation_proposals')
            .select('version_number')
            .eq('creation_id', dto.creation_id)
            .order('version_number', { ascending: false })
            .limit(1);

        if (versionErr) {
            return { data: null, error: versionErr.message };
        }

        const currentMaxVersion =
            latestVersionRows && latestVersionRows.length > 0
                ? Number((latestVersionRows[0] as Record<string, unknown>).version_number || 0)
                : 0;
        const nextVersion = currentMaxVersion + 1;

        const targetCurrency: CommercialCurrency = dto.currency || 'COP';
        const prepared = prepareProposalState(dto.materials, dto.labor, targetCurrency);

        const year = new Date().getFullYear();
        const randCode = Math.floor(1000 + Math.random() * 9000);
        const proposalNumber = `PROP-${year}-${randCode}`;

        const { data, error } = await supabase
            .from('creation_proposals')
            .insert({
                creation_id: dto.creation_id,
                proposal_number: proposalNumber,
                version_number: nextVersion,
                title: dto.title.trim(),
                currency: targetCurrency,
                status: 'draft',
                materials_subtotal: prepared.materialsCost,
                labor_subtotal: prepared.laborCost,
                total_price: prepared.estimatedTotal,
                snapshot_data: prepared.snapshot,
                notes: dto.notes?.trim() || null,
            })
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        const itemsRows = buildProposalRelationalRows(
            data.id,
            prepared.normalizedMaterials,
            prepared.normalizedLabor
        );
        if (itemsRows.length > 0) {
            const { error: itemsError } = await supabase
                .from('creation_proposal_items')
                .insert(itemsRows);
            if (itemsError) {
                await supabase.from('creation_proposals').delete().eq('id', data.id);
                return { data: null, error: itemsError.message };
            }
        }

        return { data: normalizeProposalRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar propuesta.';
        return { data: null, error: message };
    }
}

export async function updateProposal(
    id: string,
    dto: UpdateProposalDTO
): Promise<{ data: DesignProposal | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data: existingRow, error: fetchErr } = await supabase
            .from('creation_proposals')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existingRow) {
            return {
                data: null,
                error: fetchErr?.message || 'Propuesta no encontrada para actualizar.',
            };
        }

        const existing = normalizeProposalRow(existingRow as Record<string, unknown>);
        const isModifyingContent =
            dto.title !== undefined ||
            dto.materials !== undefined ||
            dto.labor !== undefined ||
            dto.currency !== undefined ||
            dto.notes !== undefined;

        if (existing.status === 'approved' && isModifyingContent) {
            return {
                data: null,
                error: 'Esta propuesta ya fue aprobada y su snapshot es inmutable. Crea una nueva versión para modificarla.',
            };
        }

        const effectiveCurrency: CommercialCurrency =
            dto.currency ?? existing.currency ?? existing.snapshot.currency ?? 'COP';
        const effectiveMaterials = dto.materials ?? existing.snapshot.materials ?? [];
        const effectiveLabor = dto.labor ?? existing.snapshot.labor ?? [];
        const isApproving = dto.status === 'approved';
        const nowIso = new Date().toISOString();

        const prepared = prepareProposalState(
            effectiveMaterials,
            effectiveLabor,
            effectiveCurrency,
            isApproving ? nowIso : existing.snapshot.snapshot_date
        );

        const updatePayload: Record<string, unknown> = {};
        if (dto.title !== undefined) updatePayload.title = dto.title.trim();
        if (dto.status !== undefined) updatePayload.status = dto.status;
        if (dto.notes !== undefined) updatePayload.notes = dto.notes?.trim() || null;
        if (dto.currency !== undefined || dto.materials !== undefined || dto.labor !== undefined || isApproving) {
            updatePayload.currency = effectiveCurrency;
            updatePayload.materials_subtotal = prepared.materialsCost;
            updatePayload.labor_subtotal = prepared.laborCost;
            updatePayload.total_price = prepared.estimatedTotal;
            updatePayload.snapshot_data = prepared.snapshot;
        }
        if (isApproving) {
            updatePayload.approved_at = dto.approved_at || existing.approved_at || nowIso;
        }

        if (isApproving && existing.creation_id) {
            const { error: supersedeErr } = await supabase
                .from('creation_proposals')
                .update({ status: 'superseded' })
                .eq('creation_id', existing.creation_id)
                .eq('status', 'approved')
                .neq('id', id);
            if (supersedeErr) {
                return { data: null, error: supersedeErr.message };
            }
        }

        const { data, error } = await supabase
            .from('creation_proposals')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        if (dto.materials !== undefined || dto.labor !== undefined || isApproving) {
            const syncErr = await replaceProposalItems(
                id,
                prepared.normalizedMaterials,
                prepared.normalizedLabor
            );
            if (syncErr) {
                return { data: null, error: syncErr };
            }
        }

        if (isApproving && isValidUuid(existing.creation_id)) {
            const { data: existingProfile } = await supabase
                .from('creation_commercial_profiles')
                .select('commercial_status')
                .eq('creation_id', existing.creation_id)
                .maybeSingle();

            const currentCommercialStatus = (existingProfile as { commercial_status?: string } | null)
                ?.commercial_status;
            const preserveAdvancedStatus =
                currentCommercialStatus &&
                ['quote_accepted', 'in_production', 'ready_for_delivery', 'delivered'].includes(
                    currentCommercialStatus
                );

            const { error: profileErr } = await upsertCommercialProfile(existing.creation_id, {
                commercial_status: preserveAdvancedStatus
                    ? (currentCommercialStatus as CreationCommercialProfile['commercial_status'])
                    : 'proposal_pending',
                active_proposal_id: id,
                currency: effectiveCurrency,
                estimated_budget_cop: effectiveCurrency === 'COP' ? prepared.estimatedTotal : 0,
                estimated_budget_usd: effectiveCurrency === 'USD' ? prepared.estimatedTotal : 0,
            });
            if (profileErr) {
                return { data: null, error: profileErr };
            }
        }

        return { data: normalizeProposalRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar propuesta.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 4. COTIZACIONES COMERCIALES FORMALES (commercial_quotes & items)
// ==============================================================================

export async function fetchQuotesByCreation(
    creationId: string
): Promise<{ data: CommercialQuote[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        const fallback = SAMPLE_QUOTES.filter((q) => q.creation_id === creationId);
        return {
            data: fallback.length > 0 ? fallback : SAMPLE_QUOTES,
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    try {
        const { data, error } = await supabase
            .from('commercial_quotes')
            .select('*')
            .eq('creation_id', creationId)
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeQuoteRow),
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar cotizaciones de la creación.';
        return { data: [], error: message };
    }
}

export function calculateQuote(
    materialsSubtotal: number,
    laborSubtotal: number,
    discountPercentage: number = 0,
    taxPercentage: number = 0
): QuoteCalculation {
    const rawSubtotal = materialsSubtotal + laborSubtotal;
    const discountAmount = Math.round(rawSubtotal * (Math.max(0, Math.min(100, discountPercentage)) / 100));
    const netSubtotal = rawSubtotal - discountAmount;
    const taxAmount = Math.round(netSubtotal * (Math.max(0, Math.min(100, taxPercentage)) / 100));
    const total = netSubtotal + taxAmount;
    const suggestedAdvance = Math.round(total * 0.5);

    return {
        materials_subtotal: materialsSubtotal,
        labor_subtotal: laborSubtotal,
        subtotal: rawSubtotal,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        tax_percentage: taxPercentage,
        tax_amount: taxAmount,
        total: total,
        suggested_advance_percentage: 50,
        suggested_advance_amount: suggestedAdvance,
    };
}

export async function createQuote(
    dto: CreateQuoteDTO
): Promise<{ data: CommercialQuote | null; error: string | null }> {
    if (!isValidUuid(dto.creation_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const year = new Date().getFullYear();
        const randCode = Math.floor(1000 + Math.random() * 9000);
        const quoteNumber = `COT-${year}-${randCode}`;

        const validProposalId = isValidUuid(dto.proposal_id) ? dto.proposal_id! : null;
        const validClientIdSnapshot = isValidUuid(dto.client_id_snapshot) ? dto.client_id_snapshot! : null;
        const targetCurrency: CommercialCurrency = dto.currency || 'COP';

        let frozenProposalSnapshot: ProposalSnapshot | null = dto.proposal_snapshot ?? null;
        if (!frozenProposalSnapshot && validProposalId) {
            const { data: sourceProp } = await supabase
                .from('creation_proposals')
                .select('*')
                .eq('id', validProposalId)
                .maybeSingle();
            if (sourceProp) {
                frozenProposalSnapshot = normalizeProposalRow(
                    sourceProp as Record<string, unknown>
                ).snapshot;
            }
        }

        const snapshotMatchesProposal =
            Boolean(frozenProposalSnapshot) &&
            frozenProposalSnapshot!.currency === targetCurrency &&
            Math.abs(frozenProposalSnapshot!.materials_cost - dto.calculation.materials_subtotal) < 0.01 &&
            Math.abs(frozenProposalSnapshot!.labor_cost - dto.calculation.labor_subtotal) < 0.01;

        const snapshotPayload = {
            ...dto.calculation,
            currency: targetCurrency,
            frozen_at: new Date().toISOString(),
            ...(frozenProposalSnapshot
                ? {
                      proposal_snapshot: frozenProposalSnapshot,
                      proposal_overridden: !snapshotMatchesProposal,
                  }
                : {}),
        };

        const { data, error } = await supabase
            .from('commercial_quotes')
            .insert({
                creation_id: dto.creation_id,
                proposal_id: validProposalId,
                quote_number: quoteNumber,
                currency: targetCurrency,
                subtotal_gross: dto.calculation.subtotal,
                discount_amount: dto.calculation.discount_amount,
                subtotal_net: dto.calculation.subtotal - dto.calculation.discount_amount,
                tax_rate_pct: dto.calculation.tax_percentage,
                tax_amount: dto.calculation.tax_amount,
                total_price: dto.calculation.total,
                advance_suggested_amount: dto.calculation.suggested_advance_amount,
                advance_paid_amount: 0,
                balance_pending_amount: dto.calculation.total,
                status: 'draft',
                client_name_snapshot: dto.client_name_snapshot,
                client_id_snapshot: validClientIdSnapshot,
                creation_name_snapshot: dto.creation_name_snapshot,
                valid_until: dto.valid_until,
                terms_and_conditions: dto.terms_and_conditions?.trim() || null,
                notes: dto.notes?.trim() || null,
                snapshot_data: snapshotPayload,
            })
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        const quoteItemRows: {
            quote_id: string;
            item_type: 'material' | 'labor' | 'service' | 'adjustment';
            description: string;
            quantity: number;
            unit: string;
            unit_price: number;
            subtotal: number;
            sort_order: number;
        }[] = [];

        if (
            snapshotMatchesProposal &&
            frozenProposalSnapshot &&
            (frozenProposalSnapshot.materials.length > 0 || frozenProposalSnapshot.labor.length > 0)
        ) {
            frozenProposalSnapshot.materials.forEach((m, idx) => {
                const qty = Number(m.billable_quantity ?? m.billable_qty ?? 1);
                quoteItemRows.push({
                    quote_id: data.id,
                    item_type: 'material',
                    description: `${m.name || m.material_name || 'Material'}${m.color_name ? ` (${m.color_name})` : ''}`,
                    quantity: qty,
                    unit: String(m.unit || 'm'),
                    unit_price: Number(m.unit_price ?? 0),
                    subtotal: Number(m.subtotal ?? 0),
                    sort_order: idx,
                });
            });
            frozenProposalSnapshot.labor.forEach((l, idx) => {
                quoteItemRows.push({
                    quote_id: data.id,
                    item_type: 'labor',
                    description: l.description,
                    quantity: Number(l.hours_estimated ?? 1),
                    unit: 'item',
                    unit_price: Number(l.rate_per_hour ?? l.subtotal ?? 0),
                    subtotal: Number(l.subtotal ?? 0),
                    sort_order: frozenProposalSnapshot!.materials.length + idx,
                });
            });
        } else {
            if (dto.calculation.materials_subtotal > 0) {
                quoteItemRows.push({
                    quote_id: data.id,
                    item_type: 'material',
                    description: 'Telas principales, forros y avíos de costura',
                    quantity: 1,
                    unit: 'item',
                    unit_price: dto.calculation.materials_subtotal,
                    subtotal: dto.calculation.materials_subtotal,
                    sort_order: 0,
                });
            }
            if (dto.calculation.labor_subtotal > 0) {
                quoteItemRows.push({
                    quote_id: data.id,
                    item_type: 'labor',
                    description: 'Modelado anatómico, patronaje CAD y confección artesanal',
                    quantity: 1,
                    unit: 'item',
                    unit_price: dto.calculation.labor_subtotal,
                    subtotal: dto.calculation.labor_subtotal,
                    sort_order: 1,
                });
            }
        }

        if (dto.calculation.discount_amount > 0) {
            quoteItemRows.push({
                quote_id: data.id,
                item_type: 'adjustment',
                description: `Descuento comercial (${dto.calculation.discount_percentage}%)`,
                quantity: 1,
                unit: 'item',
                unit_price: -dto.calculation.discount_amount,
                subtotal: -dto.calculation.discount_amount,
                sort_order: quoteItemRows.length,
            });
        }

        if (dto.calculation.tax_amount > 0) {
            quoteItemRows.push({
                quote_id: data.id,
                item_type: 'adjustment',
                description: `Impuesto IVA (${dto.calculation.tax_percentage}%)`,
                quantity: 1,
                unit: 'item',
                unit_price: dto.calculation.tax_amount,
                subtotal: dto.calculation.tax_amount,
                sort_order: quoteItemRows.length,
            });
        }

        if (quoteItemRows.length > 0) {
            const { error: quoteItemsErr } = await supabase
                .from('commercial_quote_items')
                .insert(quoteItemRows);
            if (quoteItemsErr) {
                await supabase.from('commercial_quotes').delete().eq('id', data.id);
                return { data: null, error: quoteItemsErr.message };
            }
        }

        return { data: normalizeQuoteRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar cotización formal.';
        return { data: null, error: message };
    }
}

export async function updateQuote(
    id: string,
    dto: UpdateQuoteDTO
): Promise<{ data: CommercialQuote | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const nowIso = new Date().toISOString();
        const updatePayload: Record<string, unknown> = {
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.valid_until !== undefined ? { valid_until: dto.valid_until } : {}),
            ...(dto.terms_and_conditions !== undefined ? { terms_and_conditions: dto.terms_and_conditions } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
            ...(dto.status === 'accepted' ? { accepted_at: nowIso } : {}),
            ...(dto.status === 'rejected' ? { rejected_at: nowIso } : {}),
        };

        const { data, error } = await supabase
            .from('commercial_quotes')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        const normalized = normalizeQuoteRow(data as Record<string, unknown>);
        if (dto.status === 'accepted' && isValidUuid(normalized.creation_id)) {
            await upsertCommercialProfile(normalized.creation_id, {
                commercial_status: 'quote_accepted',
                accepted_quote_id: normalized.id,
                currency: normalized.currency || 'COP',
            });
        }

        return { data: normalized, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar cotización.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 5. PROYECTOS DE CONFECCIÓN Y TALLER (atelier_projects con fallback)
// ==============================================================================

export async function fetchProjectByCreation(
    creationId: string
): Promise<{ data: CommercialProject | null; error: string | null }> {
    if (!isValidUuid(creationId)) {
        const match = SAMPLE_PROJECTS[creationId] || SAMPLE_PROJECTS['cr-sample-001'];
        return { data: match || null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        let { data, error } = await supabase
            .from('atelier_projects')
            .select('*')
            .eq('creation_id', creationId)
            .maybeSingle();

        if (error && error.code === 'PGRST205') {
            const fallback = await supabase
                .from('commercial_projects')
                .select('*')
                .eq('creation_id', creationId)
                .maybeSingle();
            if (!fallback.error) {
                data = fallback.data;
                error = null;
            }
        }

        if (error) {
            return { data: null, error: error.message };
        }

        if (!data) {
            return { data: null, error: null };
        }

        return { data: normalizeProjectRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar proyecto de la creación.';
        return { data: null, error: message };
    }
}

export async function createDirectProject(
    creationId: string,
    dto?: Partial<CreateProjectDTO>
): Promise<{ data: CommercialProject | null; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }
    if (dto?.quote_id && !isValidUuid(dto.quote_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data: existing } = await supabase
            .from('atelier_projects')
            .select('id')
            .eq('creation_id', creationId)
            .maybeSingle();

        if (existing) {
            return { data: null, error: 'Esta Creación ya tiene un Proyecto de Confección en curso.' };
        }

        const year = new Date().getFullYear();
        const randCode = Math.floor(1000 + Math.random() * 9000);
        const projectCode = `PRJ-${year}-${randCode}`;

        let { data, error } = await supabase
            .from('atelier_projects')
            .insert({
                creation_id: creationId,
                quote_id: dto?.quote_id || null,
                project_number: projectCode,
                current_stage: 'planning',
                estimated_delivery_date: dto?.estimated_delivery_date || null,
                priority: dto?.priority || 'normal',
                assigned_tailor: dto?.assigned_tailor?.trim() || null,
                notes: dto?.notes?.trim() || null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST205') {
                const fallback = await supabase
                    .from('commercial_projects')
                    .insert({
                        creation_id: creationId,
                        quote_id: dto?.quote_id || null,
                        project_code: projectCode,
                        operational_status: 'planning',
                        estimated_delivery_date: dto?.estimated_delivery_date || null,
                        priority: dto?.priority || 'normal',
                        assigned_tailor: dto?.assigned_tailor?.trim() || null,
                        notes: dto?.notes?.trim() || null,
                    })
                    .select()
                    .single();
                if (!fallback.error && fallback.data) {
                    data = fallback.data;
                } else {
                    return { data: null, error: error.message };
                }
            } else {
                return { data: null, error: error.message };
            }
        }

        return { data: normalizeProjectRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar proyecto.';
        return { data: null, error: message };
    }
}

export async function createProjectFromQuote(
    creationId: string,
    quoteId: string,
    dto?: Partial<CreateProjectDTO>
): Promise<{ data: CommercialProject | null; error: string | null }> {
    if (!isValidUuid(creationId) || !isValidUuid(quoteId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data: existing } = await supabase
            .from('atelier_projects')
            .select('id')
            .eq('quote_id', quoteId)
            .maybeSingle();

        if (existing) {
            return { data: null, error: 'Esta cotización ya fue convertida previamente en Proyecto de Confección.' };
        }

        const year = new Date().getFullYear();
        const randCode = Math.floor(1000 + Math.random() * 9000);
        const projectCode = `PRJ-${year}-${randCode}`;

        let { data, error } = await supabase
            .from('atelier_projects')
            .insert({
                creation_id: creationId,
                quote_id: quoteId,
                project_number: projectCode,
                current_stage: 'planning',
                estimated_delivery_date: dto?.estimated_delivery_date || null,
                priority: dto?.priority || 'normal',
                assigned_tailor: dto?.assigned_tailor?.trim() || null,
                notes: dto?.notes?.trim() || null,
            })
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST205') {
                const fallbackRes = await supabase
                    .from('commercial_projects')
                    .insert({
                        creation_id: creationId,
                        quote_id: quoteId,
                        project_code: projectCode,
                        operational_status: 'planning',
                        estimated_delivery_date: dto?.estimated_delivery_date || null,
                        priority: dto?.priority || 'normal',
                        assigned_tailor: dto?.assigned_tailor?.trim() || null,
                        notes: dto?.notes?.trim() || null,
                    })
                    .select()
                    .single();

                if (!fallbackRes.error && fallbackRes.data) {
                    data = fallbackRes.data;
                } else {
                    return { data: null, error: error.message };
                }
            } else {
                return { data: null, error: error.message };
            }
        }

        // Actualizar cotización a 'accepted'
        await supabase
            .from('commercial_quotes')
            .update({ status: 'accepted' })
            .eq('id', quoteId);

        const quoteIdx = SAMPLE_QUOTES.findIndex((q) => q.id === quoteId);
        if (quoteIdx >= 0) {
            SAMPLE_QUOTES[quoteIdx].status = 'accepted';
        }

        return { data: normalizeProjectRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al convertir cotización en proyecto.';
        return { data: null, error: message };
    }
}

export async function updateProject(
    id: string,
    dto: UpdateProjectDTO
): Promise<{ data: CommercialProject | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        let { data, error } = await supabase
            .from('atelier_projects')
            .update({
                ...(dto.operational_status !== undefined ? { current_stage: dto.operational_status } : {}),
                ...(dto.estimated_delivery_date !== undefined ? { estimated_delivery_date: dto.estimated_delivery_date } : {}),
                ...(dto.actual_delivery_date !== undefined ? { actual_delivery_date: dto.actual_delivery_date } : {}),
                ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
                ...(dto.assigned_tailor !== undefined ? { assigned_tailor: dto.assigned_tailor?.trim() || null } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST205') {
                const fallback = await supabase
                    .from('commercial_projects')
                    .update({
                        ...(dto.operational_status !== undefined ? { operational_status: dto.operational_status } : {}),
                        ...(dto.estimated_delivery_date !== undefined ? { estimated_delivery_date: dto.estimated_delivery_date } : {}),
                        ...(dto.actual_delivery_date !== undefined ? { actual_delivery_date: dto.actual_delivery_date } : {}),
                        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
                        ...(dto.assigned_tailor !== undefined ? { assigned_tailor: dto.assigned_tailor?.trim() || null } : {}),
                        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
                    })
                    .eq('id', id)
                    .select()
                    .single();
                if (!fallback.error && fallback.data) {
                    data = fallback.data;
                } else {
                    return { data: null, error: error.message };
                }
            } else {
                return { data: null, error: error.message };
            }
        }

        return { data: normalizeProjectRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar proyecto.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// ==============================================================================
// 6. CONTROL FINANCIERO Y MOVIMIENTOS DE CAJA (financial_movements / M07)
// ==============================================================================

/**
 * Obtiene la fecha local en formato ISO YYYY-MM-DD sin desviaciones por huso UTC.
 */
export function getLocalIsoDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Normaliza y formatea los errores provenientes de PostgREST, PostgreSQL y RPCs M07.
 * Maneja específicamente PT409, 23505, 23514 y 42501.
 */
export function formatCommercialError(err: unknown): M07ServiceErrorDetails {
    if (!err || typeof err !== 'object') {
        return {
            code: M07_ERROR_NAMES.UNKNOWN_ERROR,
            message: 'Ocurrió un error inesperado en el servicio financiero.',
        };
    }

    const candidate = err as {
        code?: string;
        message?: string;
        status?: number;
        hint?: string | null;
        details?: unknown;
    };

    const rawCode = candidate.code || '';
    const rawMessage = candidate.message || '';
    const httpStatus = candidate.status;

    // Conflicto optimista PT409 (HTTP 409 sin reintentos de PostgREST)
    if (
        rawCode === M07_SQLSTATE_CODES.CONCURRENCY_CONFLICT ||
        httpStatus === 409 ||
        rawMessage.includes('PT409') ||
        rawMessage.toLowerCase().includes('conflicto de concurrencia')
    ) {
        return {
            code: M07_ERROR_NAMES.CONCURRENCY_CONFLICT,
            message:
                rawMessage ||
                'Conflicto de concurrencia: el registro financiero fue modificado por otra sesión. Por favor recarga el expediente para ver la versión más reciente.',
            httpStatus: 409,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Idempotencia / Clave duplicada 23505
    if (
        rawCode === M07_SQLSTATE_CODES.IDEMPOTENCY_CONFLICT ||
        rawMessage.includes('23505') ||
        rawMessage.toLowerCase().includes('conflicto de idempotencia') ||
        rawMessage.toLowerCase().includes('conflicto de anulación')
    ) {
        return {
            code: M07_ERROR_NAMES.IDEMPOTENCY_CONFLICT,
            message:
                rawMessage ||
                'Conflicto de idempotencia: los datos enviados difieren de una operación ya registrada con la misma clave.',
            httpStatus: 409,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Violación de reglas CHECK 23514
    if (rawCode === M07_SQLSTATE_CODES.CHECK_VIOLATION || rawMessage.includes('23514')) {
        return {
            code: M07_ERROR_NAMES.RULE_VIOLATION,
            message:
                rawMessage ||
                'Regla de integridad financiera no cumplida: verifique montos, divisas y motivos ingresados.',
            httpStatus: 400,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Permiso denegado 42501
    if (
        rawCode === M07_SQLSTATE_CODES.PERMISSION_DENIED ||
        rawMessage.includes('42501') ||
        rawMessage.toLowerCase().includes('acceso denegado')
    ) {
        return {
            code: M07_ERROR_NAMES.ACCESS_DENIED,
            message:
                rawMessage ||
                'Acceso denegado: requiere rol de taller o administración autenticado.',
            httpStatus: 403,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    // Referencia inexistente 23503
    if (rawCode === M07_SQLSTATE_CODES.FOREIGN_KEY_VIOLATION || rawMessage.includes('23503')) {
        return {
            code: M07_ERROR_NAMES.FOREIGN_KEY_VIOLATION,
            message: rawMessage || 'Registro referenciado no encontrado o inválido.',
            httpStatus: 404,
            hint: candidate.hint,
            details: candidate.details,
        };
    }

    return {
        code: M07_ERROR_NAMES.UNKNOWN_ERROR,
        message: rawMessage || 'Error en el servicio financiero del atelier.',
        httpStatus: typeof httpStatus === 'number' ? httpStatus : 500,
        hint: candidate.hint,
        details: candidate.details,
    };
}

/**
 * Registra un movimiento financiero transaccional atómico (M07).
 * Locks 1->5, recálculo atómico de saldos, idempotencia y auditoría.
 */
export async function recordFinancialMovementM07(
    dto: RecordFinancialMovementDTO
): Promise<{
    data: { movement: FinancialMovement; summary: FinancialStateSummary } | null;
    error: string | null;
    errorDetails?: M07ServiceErrorDetails;
}> {
    if (!isValidUuid(dto.creationId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const idemKey = dto.idempotencyKey?.trim() || `fin-mov-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveDate = dto.movementDate || getLocalIsoDate();

    let uploadedReceiptPath: string | null = null;
    let receiptAssetPayload = null;

    // Subida opcional de comprobante si se proporciona URI local
    if (dto.receiptAssetUri) {
        const uploadRes = await uploadCommercialAsset({
            uri: dto.receiptAssetUri,
            scope: 'documents',
            entityId: dto.creationId,
            fileName: `receipt_${idemKey}.jpg`,
        });
        if (uploadRes.data) {
            uploadedReceiptPath = uploadRes.data.storagePath;
            receiptAssetPayload = {
                file_path: uploadRes.data.storagePath,
                file_name: uploadRes.data.fileName,
                mime_type: uploadRes.data.mimeType,
                file_size_bytes: uploadRes.data.fileSizeBytes,
                description: `Comprobante ${dto.movementType} · Ref: ${dto.referenceNumber || 'S/N'}`,
            };
        }
    }

    try {
        const { data, error } = await supabase.rpc('record_financial_movement_m07', {
            p_creation_id: dto.creationId,
            p_movement_type: dto.movementType,
            p_amount: dto.amount,
            p_currency: dto.currency,
            p_payment_method: dto.paymentMethod,
            p_idempotency_key: idemKey,
            p_movement_date: effectiveDate,
            p_reference_number: dto.referenceNumber || null,
            p_notes: dto.notes || null,
            p_quote_id: dto.quoteId || null,
            p_project_id: dto.projectId || null,
            p_supplier_id: dto.supplierId || null,
            p_material_id: dto.materialId || null,
            p_receipt_asset: receiptAssetPayload,
        });

        if (error) {
            if (uploadedReceiptPath) {
                await removeCommercialAsset(uploadedReceiptPath);
            }
            const errDetails = formatCommercialError(error);
            return { data: null, error: errDetails.message, errorDetails: errDetails };
        }

        return { data: data as { movement: FinancialMovement; summary: FinancialStateSummary }, error: null };
    } catch (err: unknown) {
        if (uploadedReceiptPath) {
            await removeCommercialAsset(uploadedReceiptPath);
        }
        const errDetails = formatCommercialError(err);
        return { data: null, error: errDetails.message, errorDetails: errDetails };
    }
}

/**
 * Anula un movimiento financiero de forma auditada con control optimista PT409 e idempotencia.
 */
export async function voidFinancialMovementM07(
    dto: VoidFinancialMovementDTO
): Promise<{
    data: { movement: FinancialMovement; summary: FinancialStateSummary } | null;
    error: string | null;
    errorDetails?: M07ServiceErrorDetails;
}> {
    if (!isValidUuid(dto.movementId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const voidIdemKey = dto.idempotencyKey?.trim() || `void-fin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
        const { data, error } = await supabase.rpc('void_financial_movement_m07', {
            p_movement_id: dto.movementId,
            p_expected_row_version: dto.expectedRowVersion,
            p_idempotency_key: voidIdemKey,
            p_void_reason: dto.voidReason.trim(),
        });

        if (error) {
            const errDetails = formatCommercialError(error);
            return { data: null, error: errDetails.message, errorDetails: errDetails };
        }

        return { data: data as { movement: FinancialMovement; summary: FinancialStateSummary }, error: null };
    } catch (err: unknown) {
        const errDetails = formatCommercialError(err);
        return { data: null, error: errDetails.message, errorDetails: errDetails };
    }
}

/**
 * Consulta SQL pura del estado financiero de una creación (STABLE, cero mutaciones).
 */
export async function fetchCreationFinancialSummaryM07(
    creationId: string
): Promise<{ data: FinancialStateSummary | null; error: string | null; errorDetails?: M07ServiceErrorDetails }> {
    if (!isValidUuid(creationId)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase.rpc('get_creation_financial_summary_m07', {
            p_creation_id: creationId,
        });

        if (error) {
            const errDetails = formatCommercialError(error);
            return { data: null, error: errDetails.message, errorDetails: errDetails };
        }

        return { data: data as FinancialStateSummary, error: null };
    } catch (err: unknown) {
        const errDetails = formatCommercialError(err);
        return { data: null, error: errDetails.message, errorDetails: errDetails };
    }
}

/**
 * Consulta de analítica agregada para la bandeja transversal de finanzas del atelier (STABLE).
 */
export async function fetchAtelierFinancialOverviewM07(): Promise<{
    data: AtelierFinancialOverview | null;
    error: string | null;
    errorDetails?: M07ServiceErrorDetails;
}> {
    try {
        const { data, error } = await supabase.rpc('get_atelier_financial_overview_m07');

        if (error) {
            const errDetails = formatCommercialError(error);
            return { data: null, error: errDetails.message, errorDetails: errDetails };
        }

        return { data: data as AtelierFinancialOverview, error: null };
    } catch (err: unknown) {
        const errDetails = formatCommercialError(err);
        return { data: null, error: errDetails.message, errorDetails: errDetails };
    }
}

/**
 * Consulta las creaciones con sus perfiles comerciales y cotizaciones para la bandeja transversal M07.
 */
export async function fetchAtelierFinancialCreationsM07(): Promise<{
    data: AtelierFinancialCreationItem[];
    error: string | null;
}> {
    try {
        const { data: creationsData, error: creationsError } = await supabase
            .from('creations')
            .select(`
                id,
                name,
                creation_code,
                status,
                created_at,
                client:clients(id, full_name, phone),
                profile:creation_commercial_profiles(
                    payment_status,
                    currency
                ),
                quotes:commercial_quotes(
                    id,
                    quote_number,
                    status,
                    currency,
                    total_price,
                    advance_paid_amount,
                    balance_pending_amount,
                    created_at
                )
            `)
            .order('created_at', { ascending: false });

        if (creationsError) {
            return { data: [], error: creationsError.message };
        }

        const items: AtelierFinancialCreationItem[] = (creationsData || []).map((c: any) => {
            const rawQuotes = Array.isArray(c.quotes) ? c.quotes : [];
            const acceptedQuote = rawQuotes.find((q: any) => q.status === 'accepted') || rawQuotes[0] || null;
            const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
            const client = Array.isArray(c.client) ? c.client[0] : c.client;

            const contractCurrency: CommercialCurrency =
                acceptedQuote?.currency || profile?.currency || 'COP';
            const quotedTotal = Number(acceptedQuote?.total_price || 0);
            const advancePaid = Number(acceptedQuote?.advance_paid_amount || 0);
            const balancePending = Number(
                acceptedQuote?.balance_pending_amount !== undefined && acceptedQuote?.balance_pending_amount !== null
                    ? acceptedQuote.balance_pending_amount
                    : quotedTotal - advancePaid
            );

            let paymentStatus: 'unpaid' | 'partially_paid' | 'paid_in_full' = 'unpaid';
            if (profile?.payment_status) {
                paymentStatus = profile.payment_status;
            } else if (advancePaid > 0 && balancePending <= 0) {
                paymentStatus = 'paid_in_full';
            } else if (advancePaid > 0) {
                paymentStatus = 'partially_paid';
            }

            return {
                id: c.id,
                name: c.name || 'Creación sin nombre',
                creation_code: c.creation_code || null,
                status: c.status,
                client_name: client?.full_name || 'Sin clienta asociada',
                client_phone: client?.phone || null,
                payment_status: paymentStatus,
                contract_currency: contractCurrency,
                quoted_total: quotedTotal,
                advance_paid: advancePaid,
                balance_pending: balancePending,
                quote_number: acceptedQuote?.quote_number || null,
                quote_status: acceptedQuote?.status || null,
                created_at: c.created_at,
            };
        });

        return { data: items, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar creaciones financieras.';
        return { data: [], error: message };
    }
}

/**
 * Consulta el listado completo de movimientos financieros de una creación ordenados cronológicamente.
 */
export async function fetchMovementsByCreationM07(
    creationId: string
): Promise<{ data: FinancialMovement[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: [], error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('financial_movements')
            .select('*')
            .eq('creation_id', creationId)
            .order('movement_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return { data: (data || []) as FinancialMovement[], error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar movimientos financieros.';
        return { data: [], error: message };
    }
}

export async function fetchTransactionsByCreation(
    creationId: string
): Promise<{ data: FinancialTransaction[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        const fallback = SAMPLE_TRANSACTIONS.filter((t) => t.creation_id === creationId);
        return {
            data: fallback.length > 0 ? fallback : SAMPLE_TRANSACTIONS,
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    try {
        const { data, error } = await supabase
            .from('financial_movements')
            .select('*')
            .eq('creation_id', creationId)
            .order('movement_date', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeTransactionRow),
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar movimientos financieros.';
        return { data: [], error: message };
    }
}

export async function createTransaction(
    dto: CreateTransactionDTO
): Promise<{ data: FinancialTransaction | null; error: string | null }> {
    if (!isValidUuid(dto.creation_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }
    if (dto.project_id && !isValidUuid(dto.project_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('financial_movements')
            .insert({
                creation_id: dto.creation_id,
                project_id: dto.project_id || null,
                movement_type: dto.transaction_type,
                amount: dto.amount,
                currency: dto.currency || 'COP',
                payment_method: dto.payment_method,
                reference_number: dto.reference_number?.trim() || null,
                receipt_url: dto.receipt_url || null,
                movement_date: dto.transaction_date || getLocalIsoDate(),
                idempotency_key: dto.idempotency_key || null,
                notes: dto.notes?.trim() || null,
            })
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: normalizeTransactionRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar transacción financiera.';
        return { data: null, error: message };
    }
}

export async function voidTransaction(
    dto: VoidTransactionDTO
): Promise<{ data: FinancialTransaction | null; error: string | null }> {
    if (!isValidUuid(dto.transaction_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('financial_movements')
            .update({
                is_void: true,
                voided_at: new Date().toISOString(),
                void_reason: dto.void_reason.trim(),
            })
            .eq('id', dto.transaction_id)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: normalizeTransactionRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al anular movimiento.';
        return { data: null, error: message };
    }
}

export function calculateFinancialSummary(
    transactions: FinancialTransaction[],
    quotedTotal: number
): FinancialSummary {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
        // Ignorar movimientos anulados en auditoría
        if (tx.is_void) continue;

        if (
            tx.transaction_type === 'advance' ||
            tx.transaction_type === 'installment' ||
            tx.transaction_type === 'final_payment'
        ) {
            totalIncome += Number(tx.amount) || 0;
        } else if (tx.transaction_type === 'refund') {
            totalIncome -= Number(tx.amount) || 0;
        } else if (
            tx.transaction_type === 'material_purchase' ||
            tx.transaction_type === 'workshop_expense'
        ) {
            totalExpenses += Number(tx.amount) || 0;
        }
    }

    const balancePending = Math.max(0, quotedTotal - totalIncome);
    const grossMargin = totalIncome - totalExpenses;

    let paymentStatus: 'unpaid' | 'partially_paid' | 'paid_in_full' = 'unpaid';
    if (totalIncome >= quotedTotal && quotedTotal > 0) {
        paymentStatus = 'paid_in_full';
    } else if (totalIncome > 0) {
        paymentStatus = 'partially_paid';
    }

    return {
        quoted_total: quotedTotal,
        total_income: totalIncome,
        balance_pending: balancePending,
        total_expenses: totalExpenses,
        project_gross_margin: grossMargin,
        payment_status: paymentStatus,
    };
}

// ==============================================================================
// 7. ARCHIVOS Y MEDIOS COMERCIALES (commercial_media_assets)
// ==============================================================================

export async function fetchMediaAssetsByCreation(
    creationId: string
): Promise<{ data: CommercialMediaAsset[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        return { data: [], error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('commercial_media_assets')
            .select('*')
            .eq('creation_id', creationId)
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return { data: (data as CommercialMediaAsset[]) || [], error: null };
    } catch {
        return { data: [], error: null };
    }
}

export async function createMediaAsset(
    dto: CreateMediaAssetDTO
): Promise<{ data: CommercialMediaAsset | null; error: string | null }> {
    if (!isValidUuid(dto.creation_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('commercial_media_assets')
            .insert({
                creation_id: dto.creation_id,
                proposal_id: isValidUuid(dto.proposal_id) ? dto.proposal_id! : null,
                quote_id: isValidUuid(dto.quote_id) ? dto.quote_id! : null,
                project_id: isValidUuid(dto.project_id) ? dto.project_id! : null,
                asset_type: dto.asset_type,
                file_path: dto.file_path,
                file_name: dto.file_name,
                mime_type: dto.mime_type || null,
                file_size_bytes: dto.file_size_bytes || null,
                description: dto.description?.trim() || null,
            })
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as CommercialMediaAsset, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar archivo comercial.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 8. BITÁCORA Y EVENTOS COMERCIALES (commercial_events)
// ==============================================================================

export async function fetchCommercialEventsByCreation(
    creationId: string
): Promise<{ data: CommercialEvent[]; error: string | null }> {
    if (!isValidUuid(creationId)) {
        const fallback = SAMPLE_COMMERCIAL_EVENTS.filter((e) => e.creation_id === creationId);
        return {
            data: fallback.length > 0 ? fallback : SAMPLE_COMMERCIAL_EVENTS,
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    try {
        const { data, error } = await supabase
            .from('commercial_events')
            .select('*')
            .eq('creation_id', creationId)
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error: error.message };
        }

        return { data: (data as CommercialEvent[]) || [], error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar bitácora comercial.';
        return { data: [], error: message };
    }
}

export async function recordCommercialEvent(
    dto: CreateCommercialEventDTO
): Promise<{ data: CommercialEvent | null; error: string | null }> {
    if (!isValidUuid(dto.creation_id)) {
        return {
            data: null,
            error: MOCK_UUID_PERSISTENCE_ERROR,
        };
    }

    try {
        const { data, error } = await supabase
            .from('commercial_events')
            .insert({
                creation_id: dto.creation_id,
                proposal_id: isValidUuid(dto.proposal_id) ? dto.proposal_id! : null,
                quote_id: isValidUuid(dto.quote_id) ? dto.quote_id! : null,
                project_id: isValidUuid(dto.project_id) ? dto.project_id! : null,
                event_type: dto.event_type,
                title: dto.title.trim(),
                description: dto.description?.trim() || null,
                metadata: dto.metadata || {},
            })
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as CommercialEvent, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar evento comercial.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 9. MÓDULO M05: STORAGE PRIVADO PARA MATERIALES Y PROVEEDORES (commercial-assets)
// ==============================================================================

const COMMERCIAL_MIME_TO_EXT: Record<CommercialAssetAllowedMimeType, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};

const COMMERCIAL_EXT_TO_MIME: Record<string, CommercialAssetAllowedMimeType> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
};

function resolveCommercialAssetMimeType(
    declaredMimeType?: string | null,
    fileNameOrUri?: string | null
): CommercialAssetAllowedMimeType | null {
    const rawMime = sanitizeOptionalText(declaredMimeType)?.toLowerCase();
    if (rawMime) {
        const normalizedMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
        if ((COMMERCIAL_ASSET_ALLOWED_MIME_TYPES as readonly string[]).includes(normalizedMime)) {
            return normalizedMime as CommercialAssetAllowedMimeType;
        }
        return null;
    }

    const rawRef = sanitizeOptionalText(fileNameOrUri);
    if (!rawRef) return null;
    const withoutQuery = rawRef.split('?')[0].split('#')[0];
    const ext = withoutQuery.includes('.') ? withoutQuery.split('.').pop()?.toLowerCase() : '';
    if (ext && ext in COMMERCIAL_EXT_TO_MIME) {
        return COMMERCIAL_EXT_TO_MIME[ext];
    }
    return null;
}

export function validateCommercialAssetFile(input: {
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    fileName?: string | null;
    uri?: string | null;
}): { mimeType?: CommercialAssetAllowedMimeType; error: string | null } {
    const resolvedMime = resolveCommercialAssetMimeType(
        input.mimeType,
        input.fileName || input.uri
    );
    if (!resolvedMime) {
        return {
            error: 'Tipo de archivo no permitido en commercial-assets. Formatos válidos: JPG, PNG, WEBP o PDF.',
        };
    }

    if (input.fileSizeBytes !== null && input.fileSizeBytes !== undefined) {
        const size = Number(input.fileSizeBytes);
        if (!Number.isFinite(size) || size <= 0) {
            return { error: 'El archivo seleccionado está vacío o no es válido.' };
        }
        if (size > COMMERCIAL_ASSET_MAX_BYTES) {
            return {
                error: 'El archivo supera el límite máximo de 10 MB del bucket commercial-assets.',
            };
        }
    }

    return { mimeType: resolvedMime, error: null };
}

function buildCommercialAssetStoragePath(
    scope: CommercialStorageScope,
    entityId: string | null | undefined,
    mimeType: CommercialAssetAllowedMimeType,
    rawFileName?: string | null
): string {
    const safeScope: CommercialStorageScope =
        scope === 'suppliers' || scope === 'swatches' || scope === 'documents'
            ? scope
            : 'materials';
    const safeEntity =
        entityId && isValidUuid(entityId) ? entityId.toLowerCase() : 'unassigned';
    const ext = COMMERCIAL_MIME_TO_EXT[mimeType] || 'jpg';
    const cleanBase = sanitizeOptionalText(rawFileName)
        ?.replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 8);
    const fileSlug = cleanBase && cleanBase.length > 0 ? cleanBase : 'asset';
    return `${safeScope}/${safeEntity}/${Date.now()}_${suffix}_${fileSlug}.${ext}`;
}

export async function createCommercialAssetSignedUrl(
    storagePath?: string | null,
    expiresInSeconds = 3600
): Promise<{ data: string | null; error: string | null }> {
    const cleanPath = sanitizeOptionalText(storagePath);
    if (!cleanPath) {
        return { data: null, error: null };
    }

    const safeExpiry =
        Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
            ? Math.floor(expiresInSeconds)
            : 3600;

    try {
        const { data, error } = await supabase.storage
            .from(COMMERCIAL_ASSETS_BUCKET)
            .createSignedUrl(cleanPath, safeExpiry);

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data?.signedUrl || null, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al generar URL firmada del archivo.';
        return { data: null, error: message };
    }
}

export async function createCommercialAssetSignedUrls(
    storagePaths: (string | null | undefined)[],
    expiresInSeconds = 3600
): Promise<{ data: Record<string, string | null>; error: string | null }> {
    const cleanPaths = normalizeStringArray(storagePaths);
    if (cleanPaths.length === 0) {
        return { data: {}, error: null };
    }

    const safeExpiry =
        Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
            ? Math.floor(expiresInSeconds)
            : 3600;

    try {
        const { data, error } = await supabase.storage
            .from(COMMERCIAL_ASSETS_BUCKET)
            .createSignedUrls(cleanPaths, safeExpiry);

        if (error) {
            return { data: {}, error: error.message };
        }

        const urlMap: Record<string, string | null> = {};
        for (const path of cleanPaths) {
            urlMap[path] = null;
        }
        for (const item of data || []) {
            if (item && typeof item.path === 'string') {
                urlMap[item.path] = item.signedUrl || null;
            }
        }
        return { data: urlMap, error: null };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al generar URLs firmadas en lote.';
        return { data: {}, error: message };
    }
}

export async function uploadCommercialAsset(
    input: CommercialStorageUploadInput,
    signedUrlExpiresIn = 3600
): Promise<{ data: CommercialStorageUploadResult | null; error: string | null }> {
    const cleanUri = sanitizeOptionalText(input.uri);
    if (!cleanUri) {
        return { data: null, error: 'La URI del archivo a subir es obligatoria.' };
    }

    const preCheck = validateCommercialAssetFile({
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        fileName: input.fileName,
        uri: cleanUri,
    });
    if (preCheck.error || !preCheck.mimeType) {
        return {
            data: null,
            error: preCheck.error || 'Archivo inválido para subir a commercial-assets.',
        };
    }

    try {
        const response = await fetch(cleanUri);
        const blob = await response.blob();
        const actualSize = Number(blob?.size ?? input.fileSizeBytes ?? 0);
        const finalMime =
            resolveCommercialAssetMimeType(
                input.mimeType || (blob as { type?: string }).type,
                input.fileName || cleanUri
            ) || preCheck.mimeType;

        const blobCheck = validateCommercialAssetFile({
            mimeType: finalMime,
            fileSizeBytes: actualSize,
            fileName: input.fileName,
            uri: cleanUri,
        });
        if (blobCheck.error || !blobCheck.mimeType) {
            return { data: null, error: blobCheck.error || 'Tamaño o tipo de archivo inválido.' };
        }

        const storagePath = buildCommercialAssetStoragePath(
            input.scope,
            input.entityId,
            blobCheck.mimeType,
            input.fileName
        );
        const fileName = storagePath.split('/').pop() || 'asset';

        const { error: uploadError } = await supabase.storage
            .from(COMMERCIAL_ASSETS_BUCKET)
            .upload(storagePath, blob, {
                contentType: blobCheck.mimeType,
                upsert: Boolean(input.upsert),
            });

        if (uploadError) {
            return { data: null, error: uploadError.message };
        }

        const { data: signedUrl } = await createCommercialAssetSignedUrl(
            storagePath,
            signedUrlExpiresIn
        );

        return {
            data: {
                bucket: COMMERCIAL_ASSETS_BUCKET,
                storagePath,
                signedUrl: signedUrl || null,
                mimeType: blobCheck.mimeType,
                fileSizeBytes: actualSize,
                fileName,
            },
            error: null,
        };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al subir archivo a commercial-assets.';
        return { data: null, error: message };
    }
}

export async function pickAndUploadCommercialAssetImage(options: {
    scope: CommercialStorageScope;
    entityId?: string | null;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    signedUrlExpiresIn?: number;
}): Promise<{ data: CommercialStorageUploadResult | null; cancelled?: boolean; error: string | null }> {
    try {
        const ImagePicker = await import('expo-image-picker');
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            return {
                data: null,
                error: 'Se requiere permiso de galería para seleccionar una fotografía.',
            };
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: options.allowsEditing ?? true,
            aspect: options.aspect ?? [1, 1],
            quality: options.quality ?? 0.85,
        });

        if (result.canceled || !result.assets?.[0]) {
            return { data: null, cancelled: true, error: null };
        }

        const asset = result.assets[0];
        return uploadCommercialAsset(
            {
                uri: asset.uri,
                scope: options.scope,
                entityId: options.entityId,
                fileName: asset.fileName ?? null,
                mimeType: asset.mimeType ?? null,
                fileSizeBytes: asset.fileSize ?? null,
            },
            options.signedUrlExpiresIn ?? 3600
        );
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al seleccionar o subir fotografía.';
        return { data: null, error: message };
    }
}

export async function removeCommercialAsset(
    storagePath: string
): Promise<{ error: string | null }> {
    const cleanPath = sanitizeOptionalText(storagePath);
    if (!cleanPath) {
        return { error: 'La ruta del archivo a eliminar es obligatoria.' };
    }

    try {
        const { error } = await supabase.storage
            .from(COMMERCIAL_ASSETS_BUCKET)
            .remove([cleanPath]);

        if (error) {
            return { error: error.message };
        }

        return { error: null };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al eliminar archivo de commercial-assets.';
        return { error: message };
    }
}

export async function cleanupUnusedCommercialAsset(
    storagePath?: string | null,
    exclude?: { materialId?: string; supplierId?: string }
): Promise<{ removed: boolean; error: string | null }> {
    const cleanPath = sanitizeOptionalText(storagePath);
    if (!cleanPath) {
        return { removed: false, error: null };
    }

    try {
        let matQuery = supabase
            .from('atelier_materials')
            .select('id')
            .eq('storage_path', cleanPath)
            .limit(1);
        if (isValidUuid(exclude?.materialId)) {
            matQuery = matQuery.neq('id', exclude!.materialId!);
        }

        let supQuery = supabase
            .from('atelier_suppliers')
            .select('id')
            .eq('storage_path', cleanPath)
            .limit(1);
        if (isValidUuid(exclude?.supplierId)) {
            supQuery = supQuery.neq('id', exclude!.supplierId!);
        }

        const [matRefRes, supRefRes] = await Promise.all([matQuery, supQuery]);
        if (matRefRes.error || supRefRes.error) {
            return {
                removed: false,
                error:
                    matRefRes.error?.message ||
                    supRefRes.error?.message ||
                    'No se pudo verificar referencias de almacenamiento.',
            };
        }

        const isStillReferenced =
            (matRefRes.data && matRefRes.data.length > 0) ||
            (supRefRes.data && supRefRes.data.length > 0);
        if (isStillReferenced) {
            return { removed: false, error: null };
        }

        const { error: removeError } = await removeCommercialAsset(cleanPath);
        if (removeError) {
            return { removed: false, error: removeError };
        }
        return { removed: true, error: null };
    } catch (err: unknown) {
        const message =
            err instanceof Error
                ? err.message
                : 'Error al limpiar archivo anterior en commercial-assets.';
        return { removed: false, error: message };
    }
}

// ==============================================================================
// 10. MÓDULO M05: DIRECTORIO DE PROVEEDORES (public.atelier_suppliers)
// ==============================================================================

const SUPPLIER_UNIQUE_ERROR_MAP: [string, string][] = [
    ['uidx_atelier_suppliers_code', 'Ya existe un proveedor registrado con ese código interno.'],
    ['atelier_suppliers_code', 'Ya existe un proveedor registrado con ese código interno.'],
];

function buildSupplierWritePayload(
    dto: CreateSupplierDTO | UpdateSupplierDTO,
    isCreate: boolean
): { payload: Record<string, unknown> | null; error: string | null } {
    if (isCreate && (!dto.name || !dto.name.trim())) {
        return { payload: null, error: 'El nombre del proveedor es obligatorio.' };
    }
    if (!isCreate && dto.name !== undefined && !dto.name.trim()) {
        return { payload: null, error: 'El nombre del proveedor no puede quedar vacío.' };
    }

    let resolvedSupplierType: SupplierType | undefined;
    if (dto.supplier_type !== undefined || isCreate) {
        const candidateType = String(dto.supplier_type ?? 'fabric_house').trim() as SupplierType;
        if (!(SUPPLIER_TYPES as readonly string[]).includes(candidateType)) {
            return {
                payload: null,
                error: `Tipo de proveedor no reconocido: "${String(dto.supplier_type)}".`,
            };
        }
        resolvedSupplierType = candidateType;
    }

    let resolvedCurrency: SupplierCurrency | undefined;
    if (dto.default_currency !== undefined || isCreate) {
        const candidateCurrency = String(dto.default_currency ?? 'COP')
            .trim()
            .toUpperCase() as SupplierCurrency;
        if (!(SUPPLIER_CURRENCIES as readonly string[]).includes(candidateCurrency)) {
            return {
                payload: null,
                error: `Moneda predeterminada no soportada para proveedor: "${String(dto.default_currency)}".`,
            };
        }
        resolvedCurrency = candidateCurrency;
    }

    const leadTimeCheck = validateNonNegativeNumber(dto.lead_time_days, 'El tiempo de entrega (días)');
    if (leadTimeCheck.error) {
        return { payload: null, error: leadTimeCheck.error };
    }
    const resolvedLeadTime =
        leadTimeCheck.value !== null ? Math.round(leadTimeCheck.value) : null;

    // Importante: atelier_suppliers solo persiste `storage_path` en SQL (no existe `photo_url`).
    const payload: Record<string, unknown> = {
        ...(dto.code !== undefined ? { code: sanitizeOptionalText(dto.code) } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.trade_name !== undefined ? { trade_name: sanitizeOptionalText(dto.trade_name) } : {}),
        ...(resolvedSupplierType !== undefined ? { supplier_type: resolvedSupplierType } : {}),
        ...(dto.contact_name !== undefined
            ? { contact_name: sanitizeOptionalText(dto.contact_name) }
            : {}),
        ...(dto.email !== undefined ? { email: sanitizeOptionalText(dto.email) } : {}),
        ...(dto.phone !== undefined ? { phone: sanitizeOptionalText(dto.phone) } : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: sanitizeOptionalText(dto.whatsapp) } : {}),
        ...(dto.website !== undefined ? { website: sanitizeOptionalText(dto.website) } : {}),
        ...(dto.city !== undefined ? { city: sanitizeOptionalText(dto.city) } : {}),
        ...(dto.country !== undefined
            ? { country: sanitizeOptionalText(dto.country) ?? (isCreate ? 'Colombia' : null) }
            : {}),
        ...(dto.address !== undefined ? { address: sanitizeOptionalText(dto.address) } : {}),
        ...(resolvedCurrency !== undefined ? { default_currency: resolvedCurrency } : {}),
        ...(dto.lead_time_days !== undefined ? { lead_time_days: resolvedLeadTime } : {}),
        ...(dto.min_order_policy !== undefined
            ? { min_order_policy: sanitizeOptionalText(dto.min_order_policy) }
            : {}),
        ...(dto.payment_terms !== undefined
            ? { payment_terms: sanitizeOptionalText(dto.payment_terms) }
            : {}),
        ...(dto.tax_id !== undefined ? { tax_id: sanitizeOptionalText(dto.tax_id) } : {}),
        ...(dto.specialty_tags !== undefined
            ? { specialty_tags: normalizeStringArray(dto.specialty_tags) }
            : {}),
        ...(dto.storage_path !== undefined
            ? { storage_path: sanitizeOptionalText(dto.storage_path) }
            : {}),
        ...(dto.notes !== undefined ? { notes: sanitizeOptionalText(dto.notes) } : {}),
        ...(dto.is_preferred !== undefined ? { is_preferred: Boolean(dto.is_preferred) } : {}),
        ...(dto.is_active !== undefined ? { is_active: Boolean(dto.is_active) } : {}),
    };

    if (isCreate) {
        if (payload.country === undefined) payload.country = 'Colombia';
        if (payload.specialty_tags === undefined) payload.specialty_tags = [];
        if (payload.is_preferred === undefined) payload.is_preferred = false;
        if (payload.is_active === undefined) payload.is_active = true;
    }

    return { payload, error: null };
}

export async function fetchSuppliers(
    filter?: SupplierFilter
): Promise<{ data: AtelierSupplier[]; error: string | null }> {
    try {
        let query = supabase
            .from('atelier_suppliers')
            .select('*')
            .order('is_preferred', { ascending: false })
            .order('name', { ascending: true });

        if (filter?.onlyActive !== false) {
            query = query.eq('is_active', true);
        }

        if (filter?.onlyPreferred) {
            query = query.eq('is_preferred', true);
        }

        if (filter?.supplierType && filter.supplierType !== 'all') {
            query = query.eq('supplier_type', filter.supplierType);
        }

        if (filter?.currency && filter.currency !== 'all') {
            query = query.eq('default_currency', filter.currency);
        }

        if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
            const safeTerm = filter.searchQuery.replace(/[,()]/g, ' ').trim();
            if (safeTerm.length > 0) {
                query = query.or(
                    `name.ilike.%${safeTerm}%,trade_name.ilike.%${safeTerm}%,code.ilike.%${safeTerm}%,city.ilike.%${safeTerm}%,contact_name.ilike.%${safeTerm}%`
                );
            }
        }

        const { data, error } = await query;
        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeSupplierRow),
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar proveedores.';
        return { data: [], error: message };
    }
}

export async function getSupplierById(
    id: string
): Promise<{ data: AtelierSupplier | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('atelier_suppliers')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            return { data: null, error: error.message };
        }
        if (!data) {
            return { data: null, error: null };
        }

        return { data: normalizeSupplierRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar el proveedor.';
        return { data: null, error: message };
    }
}

export async function createSupplier(
    dto: CreateSupplierDTO
): Promise<{ data: AtelierSupplier | null; error: string | null }> {
    const { payload, error: validationError } = buildSupplierWritePayload(dto, true);
    if (validationError || !payload) {
        return { data: null, error: validationError || 'Datos inválidos para crear proveedor.' };
    }

    try {
        const { data, error } = await supabase
            .from('atelier_suppliers')
            .insert(payload)
            .select()
            .single();

        if (error) {
            return {
                data: null,
                error: mapConstraintErrorMessage(
                    error,
                    SUPPLIER_UNIQUE_ERROR_MAP,
                    error.message || 'Error al registrar proveedor.'
                ),
            };
        }

        return { data: normalizeSupplierRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al registrar proveedor.';
        return { data: null, error: message };
    }
}

export async function updateSupplier(
    id: string,
    dto: UpdateSupplierDTO
): Promise<{ data: AtelierSupplier | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const { payload, error: validationError } = buildSupplierWritePayload(dto, false);
    if (validationError || !payload) {
        return { data: null, error: validationError || 'Datos inválidos para actualizar proveedor.' };
    }

    try {
        const { data, error } = await supabase
            .from('atelier_suppliers')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return {
                data: null,
                error: mapConstraintErrorMessage(
                    error,
                    SUPPLIER_UNIQUE_ERROR_MAP,
                    error.message || 'Error al actualizar proveedor.'
                ),
            };
        }

        return { data: normalizeSupplierRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar proveedor.';
        return { data: null, error: message };
    }
}

export async function archiveSupplier(
    id: string
): Promise<{ data: AtelierSupplier | null; error: string | null }> {
    return updateSupplier(id, { is_active: false });
}

// ==============================================================================
// 11. MÓDULO M05: BITÁCORA APPEND-ONLY DE STOCK (atelier_material_stock_adjustments)
// ==============================================================================
// Contrato inmutable (append-only): sin operaciones update/delete sobre los registros,
// y sin descuentos automáticos desde propuestas, cotizaciones o proyectos.

export async function fetchStockAdjustmentsByMaterial(
    materialId: string,
    limit = 50
): Promise<{ data: MaterialStockAdjustment[]; error: string | null }> {
    if (!isValidUuid(materialId)) {
        return { data: [], error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 50;

    try {
        const { data, error } = await supabase
            .from('atelier_material_stock_adjustments')
            .select('*')
            .eq('material_id', materialId)
            .order('created_at', { ascending: false })
            .limit(safeLimit);

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeStockAdjustmentRow),
            error: null,
        };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al consultar historial de ajustes de stock.';
        return { data: [], error: message };
    }
}

export async function fetchRecentStockAdjustments(
    limit = 50
): Promise<{ data: MaterialStockAdjustment[]; error: string | null }> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 50;

    try {
        const { data, error } = await supabase
            .from('atelier_material_stock_adjustments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(safeLimit);

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeStockAdjustmentRow),
            error: null,
        };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al consultar bitácora reciente de stock.';
        return { data: [], error: message };
    }
}

export async function recordStockAdjustment(
    dto: CreateStockAdjustmentDTO
): Promise<{ data: MaterialStockAdjustment | null; error: string | null }> {
    if (!isValidUuid(dto.material_id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    if (!(STOCK_ADJUSTMENT_TYPES as readonly string[]).includes(dto.adjustment_type)) {
        return {
            data: null,
            error: `Tipo de ajuste de stock no reconocido: "${String(dto.adjustment_type)}".`,
        };
    }

    const optionalUuidFields: [string, string | null | undefined][] = [
        ['creation_id', dto.creation_id],
        ['supplier_id', dto.supplier_id],
        ['financial_movement_id', dto.financial_movement_id],
    ];
    for (const [fieldName, fieldValue] of optionalUuidFields) {
        const cleaned = sanitizeOptionalText(fieldValue);
        if (cleaned && !isValidUuid(cleaned)) {
            return { data: null, error: `El campo ${fieldName} debe ser un UUID válido.` };
        }
    }

    let resolvedUnitSnapshot =
        dto.unit_snapshot !== undefined && dto.unit_snapshot !== null
            ? normalizeMaterialUnit(dto.unit_snapshot)
            : null;
    if (dto.unit_snapshot !== undefined && dto.unit_snapshot !== null && !resolvedUnitSnapshot) {
        return {
            data: null,
            error: `Unidad snapshot no reconocida: "${String(dto.unit_snapshot)}".`,
        };
    }

    try {
        const { data: materialRow, error: materialError } = await supabase
            .from('atelier_materials')
            .select('id, name, unit, current_stock')
            .eq('id', dto.material_id)
            .maybeSingle();

        if (materialError) {
            return { data: null, error: materialError.message };
        }
        if (!materialRow) {
            return { data: null, error: 'El material indicado no existe en atelier_materials.' };
        }

        const rawPrevious =
            dto.previous_stock !== undefined && dto.previous_stock !== null
                ? Number(dto.previous_stock)
                : Number((materialRow as Record<string, unknown>).current_stock ?? 0);

        if (!Number.isFinite(rawPrevious) || rawPrevious < 0) {
            return { data: null, error: 'El stock previo debe ser un valor numérico mayor o igual a 0.' };
        }
        const previousStock = roundToDecimals(rawPrevious, 2);

        let quantityDelta: number;
        let newStock: number;

        if (dto.target_new_stock !== undefined && dto.target_new_stock !== null) {
            const target = Number(dto.target_new_stock);
            if (!Number.isFinite(target) || target < 0) {
                return {
                    data: null,
                    error: 'El nuevo stock objetivo debe ser un valor numérico mayor o igual a 0.',
                };
            }
            newStock = roundToDecimals(target, 2);
            quantityDelta = roundToDecimals(newStock - previousStock, 2);
            if (
                dto.quantity_delta !== undefined &&
                dto.quantity_delta !== null &&
                roundToDecimals(previousStock + Number(dto.quantity_delta), 2) !== newStock
            ) {
                return {
                    data: null,
                    error: 'El quantity_delta indicado no coincide con previous_stock y target_new_stock.',
                };
            }
        } else if (
            dto.quantity_delta !== undefined &&
            dto.quantity_delta !== null &&
            Number.isFinite(Number(dto.quantity_delta))
        ) {
            quantityDelta = roundToDecimals(Number(dto.quantity_delta), 2);
            newStock = roundToDecimals(previousStock + quantityDelta, 2);
        } else {
            return {
                data: null,
                error: 'Debes indicar quantity_delta o target_new_stock para registrar el ajuste de stock.',
            };
        }

        if (newStock < 0) {
            return {
                data: null,
                error: 'El stock resultante no puede ser negativo.',
            };
        }

        const matRecord = materialRow as Record<string, unknown>;
        if (!resolvedUnitSnapshot) {
            resolvedUnitSnapshot = normalizeMaterialUnit(matRecord.unit as string | null | undefined);
        }

        // Omitimos `created_by` para que PostgreSQL aplique `DEFAULT auth.uid()` conforme a la política RLS estricta.
        const { data: insertedAdjustment, error: insertError } = await supabase
            .from('atelier_material_stock_adjustments')
            .insert({
                material_id: dto.material_id,
                material_name_snapshot:
                    sanitizeOptionalText(dto.material_name_snapshot) ||
                    sanitizeOptionalText(matRecord.name as string | null | undefined),
                unit_snapshot: resolvedUnitSnapshot,
                adjustment_type: dto.adjustment_type,
                quantity_delta: quantityDelta,
                previous_stock: previousStock,
                new_stock: newStock,
                creation_id: sanitizeOptionalText(dto.creation_id),
                supplier_id: sanitizeOptionalText(dto.supplier_id),
                financial_movement_id: sanitizeOptionalText(dto.financial_movement_id),
                reference_code: sanitizeOptionalText(dto.reference_code),
                notes: sanitizeOptionalText(dto.notes),
            })
            .select()
            .single();

        if (insertError) {
            return { data: null, error: insertError.message };
        }

        const normalizedAdjustment = normalizeStockAdjustmentRow(
            insertedAdjustment as Record<string, unknown>
        );

        if (dto.update_material_stock !== false) {
            const { error: stockSyncError } = await supabase
                .from('atelier_materials')
                .update({
                    current_stock: newStock,
                    last_stock_check_at: new Date().toISOString(),
                })
                .eq('id', dto.material_id);

            if (stockSyncError) {
                return {
                    data: normalizedAdjustment,
                    error: `Ajuste registrado en bitácora, pero falló la actualización de stock en atelier_materials: ${stockSyncError.message}`,
                };
            }
        }

        return { data: normalizedAdjustment, error: null };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al registrar ajuste manual de stock.';
        return { data: null, error: message };
    }
}

// ==============================================================================
// 12. MÓDULO M05: TRM MANUAL DE REFERENCIA (public.atelier_currency_rates)
// ==============================================================================
// Política estricta: sin tasas quemadas de respaldo ni conversiones automáticas.

export async function fetchActiveCurrencyRates(): Promise<{
    data: AtelierCurrencyRate[];
    error: string | null;
}> {
    try {
        const { data, error } = await supabase
            .from('atelier_currency_rates')
            .select('*')
            .eq('is_active', true)
            .order('base_currency', { ascending: true });

        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeCurrencyRateRow),
            error: null,
        };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Error al consultar tasas TRM activas.';
        return { data: [], error: message };
    }
}

export async function fetchCurrencyRateHistory(
    pair?: { base_currency?: CurrencyRateBase; target_currency?: CurrencyRateTarget },
    limit = 30
): Promise<{ data: AtelierCurrencyRate[]; error: string | null }> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 30;

    try {
        let query = supabase
            .from('atelier_currency_rates')
            .select('*')
            .order('effective_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(safeLimit);

        if (pair?.base_currency) {
            query = query.eq('base_currency', pair.base_currency);
        }
        if (pair?.target_currency) {
            query = query.eq('target_currency', pair.target_currency);
        }

        const { data, error } = await query;
        if (error) {
            return { data: [], error: error.message };
        }

        return {
            data: ((data as Record<string, unknown>[]) || []).map(normalizeCurrencyRateRow),
            error: null,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar historial TRM.';
        return { data: [], error: message };
    }
}

export async function getActiveCurrencyRate(
    baseCurrency: CurrencyRateBase = 'USD',
    targetCurrency: CurrencyRateTarget = 'COP'
): Promise<{ data: AtelierCurrencyRate | null; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('atelier_currency_rates')
            .select('*')
            .eq('base_currency', baseCurrency)
            .eq('target_currency', targetCurrency)
            .eq('is_active', true)
            .order('effective_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return { data: null, error: error.message };
        }

        if (!data) {
            return { data: null, error: null };
        }

        return { data: normalizeCurrencyRateRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al consultar tasa TRM activa.';
        return { data: null, error: message };
    }
}

export async function saveManualCurrencyRate(
    dto: CreateCurrencyRateDTO
): Promise<{ data: AtelierCurrencyRate | null; error: string | null }> {
    const baseCurrency = String(dto.base_currency ?? 'USD')
        .trim()
        .toUpperCase() as CurrencyRateBase;
    const targetCurrency = String(dto.target_currency ?? 'COP')
        .trim()
        .toUpperCase() as CurrencyRateTarget;

    if (!(CURRENCY_RATE_BASE_CURRENCIES as readonly string[]).includes(baseCurrency)) {
        return {
            data: null,
            error: `Moneda origen no soportada para TRM manual: "${String(dto.base_currency)}".`,
        };
    }
    if (!(CURRENCY_RATE_TARGET_CURRENCIES as readonly string[]).includes(targetCurrency)) {
        return {
            data: null,
            error: `Moneda destino no soportada para TRM manual: "${String(dto.target_currency)}".`,
        };
    }
    if (baseCurrency === (targetCurrency as string)) {
        return {
            data: null,
            error: 'La moneda origen y la moneda destino de la TRM manual deben ser distintas.',
        };
    }

    const parsedRate = Number(dto.rate_value);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
        return {
            data: null,
            error: 'El valor de la TRM manual debe ser estrictamente mayor a 0.',
        };
    }

    const effectiveDate = sanitizeOptionalText(dto.effective_date);
    if (effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
        return {
            data: null,
            error: 'La fecha efectiva debe tener formato YYYY-MM-DD.',
        };
    }

    const shouldActivate = dto.is_active !== false;

    try {
        if (shouldActivate) {
            const { error: deactivateError } = await supabase
                .from('atelier_currency_rates')
                .update({ is_active: false })
                .eq('base_currency', baseCurrency)
                .eq('target_currency', targetCurrency)
                .eq('is_active', true);

            if (deactivateError) {
                return { data: null, error: deactivateError.message };
            }
        }

        const insertPayload: Record<string, unknown> = {
            base_currency: baseCurrency,
            target_currency: targetCurrency,
            rate_value: roundToDecimals(parsedRate, 4),
            source_note: sanitizeOptionalText(dto.source_note),
            is_active: shouldActivate,
            ...(effectiveDate ? { effective_date: effectiveDate } : {}),
        };

        const { data, error } = await supabase
            .from('atelier_currency_rates')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: normalizeCurrencyRateRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al guardar TRM manual.';
        return { data: null, error: message };
    }
}

export async function deactivateCurrencyRate(
    id: string
): Promise<{ data: AtelierCurrencyRate | null; error: string | null }> {
    if (!isValidUuid(id)) {
        return { data: null, error: MOCK_UUID_PERSISTENCE_ERROR };
    }

    try {
        const { data, error } = await supabase
            .from('atelier_currency_rates')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: normalizeCurrencyRateRow(data as Record<string, unknown>), error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al desactivar TRM manual.';
        return { data: null, error: message };
    }
}
