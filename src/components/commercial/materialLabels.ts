// ==============================================================================
// ATELIER DIGITAL — MÓDULO 05: ETIQUETAS CANÓNICAS Y FORMATEADORES COMERCIALES
// Archivo: src/components/commercial/materialLabels.ts
// ==============================================================================

import {
    CurrencyRateBase,
    CurrencyRateTarget,
    MaterialCategory,
    MaterialDrapeProfile,
    MaterialUnit,
    StockAdjustmentType,
    SupplierCurrency,
    SupplierType,
} from '../../types/commercial';

export const MATERIAL_CATEGORY_OPTIONS: { id: MaterialCategory; label: string }[] = [
    { id: 'fabric', label: 'Telas Principales' },
    { id: 'lining', label: 'Forrería' },
    { id: 'interfacing', label: 'Entretelas' },
    { id: 'notions', label: 'Avíos & Botones' },
    { id: 'trims', label: 'Cintas & Bieses' },
    { id: 'hardware', label: 'Ballenas & Herrajes' },
    { id: 'beading', label: 'Pedrería' },
    { id: 'embroidery', label: 'Bordados' },
];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
    fabric: 'Telas Principales',
    lining: 'Forrería',
    interfacing: 'Entretelas',
    notions: 'Avíos & Botones',
    trims: 'Cintas & Bieses',
    hardware: 'Ballenas & Herrajes',
    beading: 'Pedrería',
    embroidery: 'Bordados',
};

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
    m: 'Metro (m)',
    cm: 'Centímetro (cm)',
    unit: 'Unidad (unit)',
    pair: 'Par (pair)',
    dozen: 'Docena (dozen)',
    roll: 'Rollo (roll)',
    pkg: 'Paquete (pkg)',
};

export const MATERIAL_DRAPE_OPTIONS: { id: MaterialDrapeProfile; label: string }[] = [
    { id: 'fluid', label: 'Fluida' },
    { id: 'structured', label: 'Estructurada' },
    { id: 'crisp', label: 'Firme / Crujiente' },
    { id: 'sheer', label: 'Traslúcida' },
    { id: 'heavy', label: 'Alto Gramaje' },
    { id: 'stretch', label: 'Elástica / Bi-stretch' },
    { id: 'delicate', label: 'Delicada' },
];

export const MATERIAL_DRAPE_LABELS: Record<MaterialDrapeProfile, string> = {
    fluid: 'Caída Fluida',
    structured: 'Estructurada',
    crisp: 'Firme / Crujiente',
    sheer: 'Traslúcida',
    heavy: 'Alto Gramaje',
    stretch: 'Elástica',
    delicate: 'Delicada',
};

export const SUPPLIER_TYPE_OPTIONS: { id: SupplierType; label: string }[] = [
    { id: 'fabric_house', label: 'Casa Textil' },
    { id: 'haberdashery', label: 'Mercería / Avíos' },
    { id: 'embroidery_atelier', label: 'Taller de Bordados' },
    { id: 'interlining_specialist', label: 'Especialista Entretelas' },
    { id: 'trim_artisan', label: 'Pasamanería Artesanal' },
    { id: 'importer', label: 'Importadora' },
    { id: 'other', label: 'Otro' },
];

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
    fabric_house: 'Casa Textil',
    haberdashery: 'Mercería / Avíos',
    embroidery_atelier: 'Taller de Bordados',
    interlining_specialist: 'Especialista Entretelas',
    trim_artisan: 'Pasamanería Artesanal',
    importer: 'Importadora',
    other: 'Otro',
};

export const STOCK_ADJUSTMENT_TYPE_OPTIONS: {
    id: StockAdjustmentType;
    label: string;
    helper: string;
}[] = [
    {
        id: 'purchase_entry',
        label: 'Compra / Ingreso Proveedor',
        helper: 'Suma al stock actual tras compra o reposición física.',
    },
    {
        id: 'manual_in',
        label: 'Ingreso Manual',
        helper: 'Incremento manual (devolución a bodega o sobrante medido).',
    },
    {
        id: 'manual_out',
        label: 'Salida Manual de Taller',
        helper: 'Descuento manual explícito tras entrega física verificada.',
    },
    {
        id: 'manual_count',
        label: 'Arqueo / Conteo Físico',
        helper: 'Ajusta el stock hacia un nuevo conteo real verificado en bodega.',
    },
    {
        id: 'initial_load',
        label: 'Carga Inicial',
        helper: 'Registro inicial de existencias de inventario.',
    },
];

export const STOCK_ADJUSTMENT_TYPE_LABELS: Record<StockAdjustmentType, string> = {
    purchase_entry: 'Compra Proveedor',
    manual_in: 'Ingreso Manual',
    manual_out: 'Salida Manual',
    manual_count: 'Arqueo Físico',
    initial_load: 'Carga Inicial',
};

export const CURRENCY_PAIR_PRESETS: {
    base: CurrencyRateBase;
    target: CurrencyRateTarget;
    label: string;
    shortLabel: string;
}[] = [
    {
        base: 'USD',
        target: 'COP',
        label: 'USD → COP (Dólar estadounidense / Peso colombiano)',
        shortLabel: 'USD → COP',
    },
    {
        base: 'EUR',
        target: 'COP',
        label: 'EUR → COP (Euro / Peso colombiano)',
        shortLabel: 'EUR → COP',
    },
    {
        base: 'EUR',
        target: 'USD',
        label: 'EUR → USD (Euro / Dólar estadounidense)',
        shortLabel: 'EUR → USD',
    },
    {
        base: 'COP',
        target: 'USD',
        label: 'COP → USD (Peso colombiano / Dólar estadounidense)',
        shortLabel: 'COP → USD',
    },
];

export function formatMaterialMoney(
    amount: number | null | undefined,
    currency: SupplierCurrency = 'COP'
): string {
    const safe = Number(amount ?? 0);
    if (currency === 'USD') {
        return `$${safe.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} USD`;
    }
    if (currency === 'EUR') {
        return `€${safe.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} EUR`;
    }
    return `$${Math.round(safe).toLocaleString('es-CO')} COP`;
}

export function formatCurrencyRateValue(
    rate: number,
    targetCurrency: CurrencyRateTarget
): string {
    if (!Number.isFinite(rate)) return '—';
    if (targetCurrency === 'COP') {
        return `$${rate.toLocaleString('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        })} COP`;
    }
    return `$${rate.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    })} USD`;
}

export function formatShortDateEs(isoDate?: string | null): string {
    if (!isoDate) return '—';
    const clean = isoDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, d] = clean.split('-');
        return `${d}/${m}/${y}`;
    }
    const parsed = new Date(clean);
    if (Number.isNaN(parsed.getTime())) return clean;
    return parsed.toLocaleDateString('es-CO');
}

export function isValidHexColor(hex?: string | null): boolean {
    if (!hex) return false;
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim());
}

export function getSwatchContrastTextColor(hex?: string | null): string {
    if (!isValidHexColor(hex)) {
        return '#A78350';
    }
    const clean = hex!.trim().slice(1);
    const expanded =
        clean.length === 3
            ? clean
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : clean;
    const r = parseInt(expanded.slice(0, 2), 16);
    const g = parseInt(expanded.slice(2, 4), 16);
    const b = parseInt(expanded.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance >= 120 ? '#171411' : '#FAF7F2';
}

