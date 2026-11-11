-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO 05 — MATERIALES Y PROVEEDORES (ETAPA 1)
-- Archivo: supabase/migrations/20261110000000_materials_suppliers_m05.sql
-- ==============================================================================
-- Implementa la arquitectura SQL aditiva de M05 sobre el catálogo existente M03
-- sin duplicar public.atelier_materials ni alterar M00–M04 (preservando
-- public.creations y M02 Flow B al 100%).
--
-- DECISIONES ARQUITECTÓNICAS INCORPORADAS:
-- 1. Cantidad facturable = MAX(required_qty, min_purchase_unit), sin múltiplos automáticos.
-- 2. Existencias: control informativo y ajustes manuales (sin reservas ni descuentos automáticos).
-- 3. Storage: reutiliza el bucket privado existente 'commercial-assets' (M03).
-- 4. TRM configurable manualmente sin integración externa (tabla atelier_currency_rates, sin tocar M00 atelier_settings).
-- 5. Sin creación de tablas duplicadas: extiende aditivamente public.atelier_materials.
-- 6. Ocho (8) categorías canónicas incorporando 'embroidery' junto a 'beading'.
-- 7. Siete (7) unidades canónicas incorporando 'roll' y 'pkg'.
--
-- ORDEN DE DESPLIEGUE:
--   Ejecutar DESPUÉS de 20261108000000_commercial_cycle_module_03.sql
--   y 20261109000000_design_moodboard_library_m04.sql.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. FUNCIONES DE AUDITORÍA TEMPORAL E INMUTABILIDAD PARA M05
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_m05_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_m05_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_m05_updated_at_column() TO authenticated, service_role, postgres;

CREATE OR REPLACE FUNCTION public.prevent_m05_stock_adjustment_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(auth.role(), '');
    v_is_client_role BOOLEAN := (v_jwt_role IN ('authenticated', 'anon'))
        OR (current_user IN ('authenticated', 'anon'));
    v_is_fk_set_null_only BOOLEAN := FALSE;
BEGIN
    -- Operaciones administrativas explícitas (postgres / service_role) para mantenimiento o limpieza controlada
    IF NOT v_is_client_role THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- Permitir únicamente acciones internas RI (ON DELETE SET NULL) sobre FKs contextuales opcionales
    -- sin alterar columnas históricas, cantidades, notas ni referencias del ajuste.
    IF TG_OP = 'UPDATE' AND pg_catalog.pg_trigger_depth() > 0 THEN
        v_is_fk_set_null_only :=
            NEW.id IS NOT DISTINCT FROM OLD.id
            AND NEW.material_id IS NOT DISTINCT FROM OLD.material_id
            AND NEW.material_name_snapshot IS NOT DISTINCT FROM OLD.material_name_snapshot
            AND NEW.unit_snapshot IS NOT DISTINCT FROM OLD.unit_snapshot
            AND NEW.adjustment_type IS NOT DISTINCT FROM OLD.adjustment_type
            AND NEW.quantity_delta IS NOT DISTINCT FROM OLD.quantity_delta
            AND NEW.previous_stock IS NOT DISTINCT FROM OLD.previous_stock
            AND NEW.new_stock IS NOT DISTINCT FROM OLD.new_stock
            AND NEW.reference_code IS NOT DISTINCT FROM OLD.reference_code
            AND NEW.notes IS NOT DISTINCT FROM OLD.notes
            AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
            AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
            AND (NEW.creation_id IS NULL OR NEW.creation_id IS NOT DISTINCT FROM OLD.creation_id)
            AND (NEW.supplier_id IS NULL OR NEW.supplier_id IS NOT DISTINCT FROM OLD.supplier_id)
            AND (NEW.financial_movement_id IS NULL OR NEW.financial_movement_id IS NOT DISTINCT FROM OLD.financial_movement_id)
            AND (
                NEW.creation_id IS DISTINCT FROM OLD.creation_id
                OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
                OR NEW.financial_movement_id IS DISTINCT FROM OLD.financial_movement_id
            );

        IF v_is_fk_set_null_only THEN
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION 'atelier_material_stock_adjustments is append-only; ordinary % operations are prohibited', TG_OP
        USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_m05_stock_adjustment_mutation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_m05_stock_adjustment_mutation() TO authenticated, service_role, postgres;

-- ==============================================================================
-- 2. NUEVA TABLA 1/3: Directorio de Proveedores y Casas Textiles (atelier_suppliers)
--    (Declarada antes que atelier_materials.supplier_id para FK directa)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT NOT NULL,
    trade_name TEXT,
    supplier_type TEXT NOT NULL DEFAULT 'fabric_house'
        CHECK (supplier_type IN (
            'fabric_house',
            'haberdashery',
            'embroidery_atelier',
            'interlining_specialist',
            'trim_artisan',
            'importer',
            'other'
        )),
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    website TEXT,
    city TEXT,
    country TEXT DEFAULT 'Colombia',
    address TEXT,
    default_currency TEXT NOT NULL DEFAULT 'COP'
        CHECK (default_currency IN ('COP', 'USD', 'EUR')),
    lead_time_days INT
        CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
    min_order_policy TEXT,
    payment_terms TEXT,
    tax_id TEXT,
    specialty_tags TEXT[] NOT NULL DEFAULT '{}',
    storage_path TEXT,
    notes TEXT,
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.atelier_suppliers IS 'Directorio maestro de casas textiles, mercerías, talleres de bordado y proveedores del atelier (M05).';
COMMENT ON COLUMN public.atelier_suppliers.storage_path IS 'Ruta privada en bucket commercial-assets (ej. suppliers/<supplier_id>/catalogo.pdf).';

-- ==============================================================================
-- 3. EVOLUCIÓN ADITIVA DE TABLA EXISTENTE: public.atelier_materials (M03 -> M05)
--    Sin duplicación de tabla y preservando columnas/FKs de M03 y M04.
-- ==============================================================================

-- 3.1. Normalización defensiva de aliases históricos antes de reforzar CHECKs
UPDATE public.atelier_materials
SET category = 'notions'
WHERE btrim(lower(category)) = 'notion';

UPDATE public.atelier_materials
SET category = 'trims'
WHERE btrim(lower(category)) = 'trim';

-- 3.2. Reemplazo idempotente de restricciones CHECK de columna única para category y unit
--      Se consulta pg_constraint + pg_attribute exactamente por nombre de columna
--      para no afectar restricciones de otras columnas (como min_purchase_unit).
DO $$
DECLARE
    v_con_name TEXT;
BEGIN
    FOR v_con_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.atelier_materials'::regclass
          AND c.contype = 'c'
          AND array_length(c.conkey, 1) = 1
          AND a.attname = 'category'
    LOOP
        EXECUTE format('ALTER TABLE public.atelier_materials DROP CONSTRAINT %I', v_con_name);
    END LOOP;

    FOR v_con_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.atelier_materials'::regclass
          AND c.contype = 'c'
          AND array_length(c.conkey, 1) = 1
          AND a.attname = 'unit'
    LOOP
        EXECUTE format('ALTER TABLE public.atelier_materials DROP CONSTRAINT %I', v_con_name);
    END LOOP;
END $$;

ALTER TABLE public.atelier_materials
    ADD CONSTRAINT chk_atelier_materials_category
    CHECK (category IN (
        'fabric',
        'lining',
        'interfacing',
        'notions',
        'trims',
        'hardware',
        'beading',
        'embroidery'
    ));

ALTER TABLE public.atelier_materials
    ADD CONSTRAINT chk_atelier_materials_unit
    CHECK (unit IN (
        'm',
        'cm',
        'unit',
        'pair',
        'dozen',
        'roll',
        'pkg'
    ));

-- 3.3. Restricciones numéricas no negativas (idempotentes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.atelier_materials'::regclass
          AND conname = 'chk_atelier_materials_prices_non_neg'
    ) THEN
        ALTER TABLE public.atelier_materials
            ADD CONSTRAINT chk_atelier_materials_prices_non_neg
            CHECK (unit_price_cop >= 0 AND unit_price_usd >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.atelier_materials'::regclass
          AND conname = 'chk_atelier_materials_min_purchase_non_neg'
    ) THEN
        ALTER TABLE public.atelier_materials
            ADD CONSTRAINT chk_atelier_materials_min_purchase_non_neg
            CHECK (min_purchase_unit >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.atelier_materials'::regclass
          AND conname = 'chk_atelier_materials_stock_non_neg'
    ) THEN
        ALTER TABLE public.atelier_materials
            ADD CONSTRAINT chk_atelier_materials_stock_non_neg
            CHECK (current_stock >= 0);
    END IF;
END $$;

-- 3.4. Columnas aditivas en public.atelier_materials (preservando supplier_name y supplier_ref)
ALTER TABLE public.atelier_materials
    ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.atelier_suppliers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sku_code TEXT,
    ADD COLUMN IF NOT EXISTS weight_gsm NUMERIC(7,2) CHECK (weight_gsm IS NULL OR weight_gsm >= 0),
    ADD COLUMN IF NOT EXISTS drape_profile TEXT
        CHECK (drape_profile IS NULL OR drape_profile IN ('fluid', 'structured', 'crisp', 'sheer', 'heavy', 'stretch', 'delicate')),
    ADD COLUMN IF NOT EXISTS care_instructions TEXT,
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS last_stock_check_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.atelier_materials.supplier_id IS 'FK opcional hacia atelier_suppliers (M05); convive con supplier_name y supplier_ref históricos de M03.';
COMMENT ON COLUMN public.atelier_materials.storage_path IS 'Ruta privada en bucket commercial-assets (ej. materials/<material_id>/swatch.jpg).';
COMMENT ON COLUMN public.atelier_materials.drape_profile IS 'Comportamiento estructural textil para diseño (M04) y asistencia IA (M10).';

-- ==============================================================================
-- 4. NUEVA TABLA 2/3: Historial Append-Only de Ajustes Manuales de Existencias
--    (Decisión 2: control informativo y ajustes manuales; cero reservas ni descuentos automáticos;
--     ON DELETE RESTRICT en material_id e inmutabilidad ante UPDATE/DELETE ordinarios)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_material_stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.atelier_materials(id) ON DELETE RESTRICT,
    material_name_snapshot TEXT,
    unit_snapshot TEXT
        CHECK (unit_snapshot IS NULL OR unit_snapshot IN ('m', 'cm', 'unit', 'pair', 'dozen', 'roll', 'pkg')),
    adjustment_type TEXT NOT NULL
        CHECK (adjustment_type IN ('manual_count', 'manual_in', 'manual_out', 'purchase_entry', 'initial_load')),
    quantity_delta NUMERIC(10,2) NOT NULL,
    previous_stock NUMERIC(10,2) NOT NULL CHECK (previous_stock >= 0),
    new_stock NUMERIC(10,2) NOT NULL CHECK (new_stock >= 0),
    creation_id UUID REFERENCES public.creations(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.atelier_suppliers(id) ON DELETE SET NULL,
    financial_movement_id UUID REFERENCES public.financial_movements(id) ON DELETE SET NULL,
    reference_code TEXT,
    notes TEXT,
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_atelier_stock_adj_math CHECK (new_stock = previous_stock + quantity_delta)
);

COMMENT ON TABLE public.atelier_material_stock_adjustments IS 'Bitácora informativa append-only de ajustes manuales de existencias en atelier (sin reservas ni descuentos automáticos; UPDATE/DELETE ordinarios bloqueados y material_id con ON DELETE RESTRICT).';

-- ==============================================================================
-- 5. NUEVA TABLA 3/3: TRM Manual Configurable de Atelier (atelier_currency_rates)
--    (Decisión 4: configurable manualmente, sin API externa y sin alterar M00 atelier_settings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency TEXT NOT NULL DEFAULT 'USD'
        CHECK (base_currency IN ('USD', 'EUR', 'COP')),
    target_currency TEXT NOT NULL DEFAULT 'COP'
        CHECK (target_currency IN ('COP', 'USD')),
    rate_value NUMERIC(14,4) NOT NULL CHECK (rate_value > 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_atelier_currency_rates_distinct CHECK (base_currency <> target_currency)
);

COMMENT ON TABLE public.atelier_currency_rates IS 'Tasas de cambio manuales de referencia para materiales y proveedores (sin sincronización externa ni tasas quemadas).';

-- ==============================================================================
-- 6. TRIGGERS updated_at, INMUTABILIDAD E ÍNDICES DE RENDIMIENTO E INTEGRIDAD
--    (Se preserva trg_atelier_materials_updated_at creado en M03)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_atelier_suppliers_updated_at ON public.atelier_suppliers;
CREATE TRIGGER trg_atelier_suppliers_updated_at
    BEFORE UPDATE ON public.atelier_suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_m05_updated_at_column();

DROP TRIGGER IF EXISTS trg_atelier_currency_rates_updated_at ON public.atelier_currency_rates;
CREATE TRIGGER trg_atelier_currency_rates_updated_at
    BEFORE UPDATE ON public.atelier_currency_rates
    FOR EACH ROW EXECUTE FUNCTION public.update_m05_updated_at_column();

DROP TRIGGER IF EXISTS trg_atelier_stock_adj_immutable ON public.atelier_material_stock_adjustments;
CREATE TRIGGER trg_atelier_stock_adj_immutable
    BEFORE UPDATE OR DELETE ON public.atelier_material_stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_m05_stock_adjustment_mutation();

-- Índices únicos parciales (evitan colisión por strings vacíos y permiten NULL múltiples)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_suppliers_code
    ON public.atelier_suppliers(code)
    WHERE code IS NOT NULL AND btrim(code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_materials_sku_code
    ON public.atelier_materials(sku_code)
    WHERE sku_code IS NOT NULL AND btrim(sku_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_currency_rates_active_pair
    ON public.atelier_currency_rates(base_currency, target_currency)
    WHERE is_active = TRUE;

-- Índices relacionales y de consulta para catálogo autónomo M05
CREATE INDEX IF NOT EXISTS idx_atelier_suppliers_type_active
    ON public.atelier_suppliers(supplier_type, is_active);

CREATE INDEX IF NOT EXISTS idx_atelier_suppliers_preferred
    ON public.atelier_suppliers(is_preferred)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_atelier_materials_supplier_id
    ON public.atelier_materials(supplier_id);

CREATE INDEX IF NOT EXISTS idx_atelier_materials_tags
    ON public.atelier_materials USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_atelier_stock_adj_material_id
    ON public.atelier_material_stock_adjustments(material_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atelier_stock_adj_creation_id
    ON public.atelier_material_stock_adjustments(creation_id);

CREATE INDEX IF NOT EXISTS idx_atelier_stock_adj_supplier_id
    ON public.atelier_material_stock_adjustments(supplier_id);

CREATE INDEX IF NOT EXISTS idx_atelier_stock_adj_fin_mov_id
    ON public.atelier_material_stock_adjustments(financial_movement_id);

-- ==============================================================================
-- 7. SEGURIDAD ROW LEVEL SECURITY (RLS) Y PRIVILEGIOS EN NUEVAS TABLAS M05
--    (atelier_materials conserva su política RLS designer_admin_manage_materials;
--     Storage reutiliza íntegramente commercial-assets y sus 4 políticas M03)
-- ==============================================================================

ALTER TABLE public.atelier_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_material_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_currency_rates ENABLE ROW LEVEL SECURITY;

-- Limpiar privilegios heredados por defecto en Supabase (ALTER DEFAULT PRIVILEGES)
REVOKE ALL ON TABLE
    public.atelier_suppliers,
    public.atelier_currency_rates
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.atelier_material_stock_adjustments FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.atelier_suppliers,
    public.atelier_currency_rates
TO authenticated;

GRANT ALL ON TABLE
    public.atelier_suppliers,
    public.atelier_currency_rates
TO service_role, postgres;

-- Bitácora histórica append-only: authenticated solo conserva SELECT e INSERT
GRANT SELECT, INSERT ON TABLE
    public.atelier_material_stock_adjustments
TO authenticated;

GRANT ALL ON TABLE
    public.atelier_material_stock_adjustments
TO service_role, postgres;

DROP POLICY IF EXISTS "designer_admin_manage_atelier_suppliers" ON public.atelier_suppliers;
CREATE POLICY "designer_admin_manage_atelier_suppliers"
    ON public.atelier_suppliers
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_material_stock_adjustments" ON public.atelier_material_stock_adjustments;
DROP POLICY IF EXISTS "designer_admin_select_material_stock_adjustments" ON public.atelier_material_stock_adjustments;
CREATE POLICY "designer_admin_select_material_stock_adjustments"
    ON public.atelier_material_stock_adjustments
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_insert_material_stock_adjustments" ON public.atelier_material_stock_adjustments;
CREATE POLICY "designer_admin_insert_material_stock_adjustments"
    ON public.atelier_material_stock_adjustments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin_or_designer()
        AND created_by IS NOT NULL
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "designer_admin_manage_atelier_currency_rates" ON public.atelier_currency_rates;
CREATE POLICY "designer_admin_manage_atelier_currency_rates"
    ON public.atelier_currency_rates
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

COMMIT;

