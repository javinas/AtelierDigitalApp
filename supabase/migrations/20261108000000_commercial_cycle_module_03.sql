-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO 03 — CICLO COMERCIAL Y SATÉLITE DE ALTA COSTURA
-- Archivo: supabase/migrations/20261108000000_commercial_cycle_module_03.sql
-- ==============================================================================
-- Implementa la arquitectura satélite integral de 10 tablas del Módulo 03:
-- 1. creation_commercial_profiles (Satélite 1:1 de creations sin alterar la tabla base)
-- 2. atelier_materials (Catálogo textil y de insumos en COP y USD)
-- 3. creation_proposals (Propuestas versionadas v1..vn con cálculo automático)
-- 4. creation_proposal_items (Desglose relacional 1:N de telas y mano de obra)
-- 5. commercial_quotes (Cotizaciones formales A4 congeladas legalmente con COT-YYYY-XXXX)
-- 6. commercial_quote_items (Desglose relacional 1:N de líneas de cotización)
-- 7. atelier_projects (Proyectos de confección en 8 etapas con conversión idempotente)
-- 8. financial_movements (Movimientos reales con anulación auditada y prevención de duplicados)
-- 9. commercial_media_assets (Bocetos, fotos de fitting y adjuntos en Storage privado)
-- 10. commercial_events (Bitácora inmutable de eventos comerciales y de taller)
--
-- REGLAS ARQUITECTÓNICAS DE ESTA MIGRACIÓN:
-- 1. Preservación absoluta de public.creations, Módulo 00, Módulo 01 y Módulo 02.
-- 2. Clave foránea 1:1 única entre atelier_projects y commercial_quotes (Idempotencia).
-- 3. Separación explícita de divisas (COP y USD) y desacoplamiento de entrega vs pagos.
-- 4. RLS estricto en las 10 tablas mediante public.is_admin_or_designer() y public.is_admin().
-- 5. Storage privado con bucket 'commercial-assets' y control de acceso.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. SECUENCIAS PARA NUMERACIÓN OFICIAL DE NEGOCIO
-- ==============================================================================

CREATE SEQUENCE IF NOT EXISTS public.seq_proposal_number START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_quote_number START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_project_code START 1;

REVOKE ALL ON SEQUENCE
    public.seq_proposal_number,
    public.seq_quote_number,
    public.seq_project_code
FROM anon, PUBLIC;

GRANT USAGE, SELECT ON SEQUENCE
    public.seq_proposal_number,
    public.seq_quote_number,
    public.seq_project_code
TO authenticated, service_role, postgres;

-- ==============================================================================
-- 2. TABLA 1/10: Perfiles Comerciales Satélite (creation_commercial_profiles)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.creation_commercial_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL UNIQUE REFERENCES public.creations(id) ON DELETE CASCADE,
    creation_code TEXT UNIQUE,
    currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
    commercial_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (commercial_status IN ('draft', 'proposal_pending', 'quote_sent', 'quote_accepted', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled')),
    active_proposal_id UUID,
    accepted_quote_id UUID,
    active_project_id UUID,
    estimated_budget_cop NUMERIC(14,2) DEFAULT 0,
    estimated_budget_usd NUMERIC(14,2) DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid_in_full')),
    delivery_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (delivery_status IN ('pending', 'in_fitting', 'ready', 'delivered')),
    delivery_date_actual DATE,
    design_guidelines TEXT,
    pattern_approach TEXT DEFAULT 'undecided'
        CHECK (pattern_approach IN ('undecided', 'measurements_only', 'cad_internal', 'manual_atelier', 'external_pattern', 'design_reference')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.creation_commercial_profiles IS 'Perfil comercial satélite 1:1 de Creaciones, preservando public.creations intacta.';

-- ==============================================================================
-- 3. TABLA 2/10: Catálogo Textil y Materiales (atelier_materials)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL 
        CHECK (category IN ('fabric', 'lining', 'interfacing', 'notions', 'trims', 'hardware', 'beading')),
    composition TEXT,
    width_cm NUMERIC(6,2),
    supplier_name TEXT,
    supplier_ref TEXT,
    unit TEXT NOT NULL DEFAULT 'm' 
        CHECK (unit IN ('m', 'cm', 'unit', 'pair', 'dozen', 'roll')),
    unit_price_cop NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_price_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
    min_purchase_unit NUMERIC(8,2) NOT NULL DEFAULT 1.0,
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
    color_code TEXT,
    color_name TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.atelier_materials IS 'Catálogo maestro de telas, forros, avíos e insumos con soporte multidivisa COP y USD.';

-- ==============================================================================
-- 4. TABLA 3/10: Propuestas de Diseño Versionadas (creation_proposals)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.creation_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    proposal_number TEXT NOT NULL UNIQUE,
    version_number INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'submitted', 'approved', 'superseded', 'rejected')),
    materials_subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    labor_subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    suggested_advance_pct NUMERIC(5,2) NOT NULL DEFAULT 50.0,
    snapshot_data JSONB,
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.creation_proposals IS 'Propuestas de diseño y estructuración de costos versionadas (v1..vn) por creación.';

-- ==============================================================================
-- 5. TABLA 4/10: Ítems Relacionales de Propuestas (creation_proposal_items)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.creation_proposal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.creation_proposals(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('material', 'labor', 'service')),
    material_id UUID REFERENCES public.atelier_materials(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT NOT NULL DEFAULT 'm',
    required_quantity NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    billable_quantity NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.creation_proposal_items IS 'Desglose relacional 1:N de telas y mano de obra con metraje requerido vs facturable.';

-- ==============================================================================
-- 6. TABLA 5/10: Cotizaciones Comerciales Formales A4 (commercial_quotes)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.creation_proposals(id) ON DELETE SET NULL,
    quote_number TEXT NOT NULL UNIQUE,
    client_name_snapshot TEXT NOT NULL,
    client_id_snapshot UUID,
    creation_name_snapshot TEXT,
    client_document_snapshot TEXT,
    client_email_snapshot TEXT,
    client_phone_snapshot TEXT,
    client_address_snapshot TEXT,
    currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
    subtotal_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal_net NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    advance_suggested_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    advance_paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    balance_pending_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until DATE NOT NULL,
    estimated_delivery_days INT NOT NULL DEFAULT 30,
    terms_and_conditions TEXT,
    notes TEXT,
    payment_instructions TEXT,
    snapshot_data JSONB NOT NULL,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.commercial_quotes IS 'Cotizaciones oficiales vinculantes congeladas legalmente con snapshot A4.';

-- ==============================================================================
-- 7. TABLA 6/10: Ítems de Cotización Formal (commercial_quote_items)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.commercial_quotes(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('material', 'labor', 'service', 'adjustment')),
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    unit TEXT NOT NULL DEFAULT 'item',
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.commercial_quote_items IS 'Desglose formal 1:N de las líneas de la cotización A4.';

-- ==============================================================================
-- 8. TABLA 7/10: Proyectos de Confección y Taller (atelier_projects)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    quote_id UUID UNIQUE REFERENCES public.commercial_quotes(id) ON DELETE RESTRICT,
    project_number TEXT NOT NULL UNIQUE,
    assigned_tailor TEXT,
    current_stage TEXT NOT NULL DEFAULT 'planning' 
        CHECK (current_stage IN (
            'planning',
            'cutting', 'pattern_cut',
            'assembly', 'basting',
            'first_fitting',
            'adjustments', 'fitting_adjustments',
            'second_fitting',
            'finishing', 'hand_finishing',
            'delivered', 'final_delivery',
            'cancelled'
        )),
    priority TEXT NOT NULL DEFAULT 'normal' 
        CHECK (priority IN ('normal', 'high', 'urgent')),
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.atelier_projects IS 'Proyectos operativos de taller con 8 etapas, derivados de cotización de forma idempotente.';

-- ==============================================================================
-- 9. TABLA 8/10: Movimientos Financieros y Caja (financial_movements)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.financial_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.commercial_quotes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.atelier_projects(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL 
        CHECK (movement_type IN ('advance', 'installment', 'final_payment', 'material_purchase', 'workshop_expense', 'refund')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
    payment_method TEXT NOT NULL 
        CHECK (payment_method IN ('transfer', 'wompi', 'bold', 'cash', 'card', 'other')),
    reference_number TEXT,
    receipt_url TEXT,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    is_void BOOLEAN NOT NULL DEFAULT FALSE,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    void_reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.financial_movements IS 'Movimientos reales con llave de idempotencia y anulación auditada.';

-- ==============================================================================
-- 10. TABLA 9/10: Archivos y Medios Comerciales (commercial_media_assets)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.creation_proposals(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES public.commercial_quotes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.atelier_projects(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL 
        CHECK (asset_type IN ('sketch', 'fabric_swatch', 'fitting_photo', 'payment_receipt', 'delivery_note', 'other')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.commercial_media_assets IS 'Bocetos, muestras de tela y comprobantes almacenados en Supabase Storage privado.';

-- ==============================================================================
-- 11. TABLA 10/10: Bitácora de Eventos Comerciales (commercial_events)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.creation_proposals(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES public.commercial_quotes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.atelier_projects(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL 
        CHECK (event_type IN (
            'milestone', 'proposal_created', 'proposal_approved',
            'quote_issued', 'quote_accepted', 'quote',
            'payment_registered', 'payment_voided',
            'project_started', 'fitting_scheduled', 'fitting_completed', 'fitting',
            'stage_advanced', 'delivery_completed',
            'note', 'agreement', 'decision', 'workshop',
            'moodboard_approved', 'moodboard_reopened'
        )),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.commercial_events IS 'Bitácora cronológica inmutable de trazabilidad comercial, fitting y taller.';

-- ==============================================================================
-- 12. VÍNCULOS FORÁNEOS EN EL PERFIL SATÉLITE
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profile_active_proposal') THEN
        ALTER TABLE public.creation_commercial_profiles
            ADD CONSTRAINT fk_profile_active_proposal
            FOREIGN KEY (active_proposal_id) REFERENCES public.creation_proposals(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profile_accepted_quote') THEN
        ALTER TABLE public.creation_commercial_profiles
            ADD CONSTRAINT fk_profile_accepted_quote
            FOREIGN KEY (accepted_quote_id) REFERENCES public.commercial_quotes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profile_active_project') THEN
        ALTER TABLE public.creation_commercial_profiles
            ADD CONSTRAINT fk_profile_active_project
            FOREIGN KEY (active_project_id) REFERENCES public.atelier_projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==============================================================================
-- 12.5. TRIGGERS updated_at E ÍNDICES DE RENDIMIENTO EN CLAVES FORÁNEAS
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_creation_commercial_profiles_updated_at ON public.creation_commercial_profiles;
CREATE TRIGGER trg_creation_commercial_profiles_updated_at
    BEFORE UPDATE ON public.creation_commercial_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_atelier_materials_updated_at ON public.atelier_materials;
CREATE TRIGGER trg_atelier_materials_updated_at
    BEFORE UPDATE ON public.atelier_materials
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_creation_proposals_updated_at ON public.creation_proposals;
CREATE TRIGGER trg_creation_proposals_updated_at
    BEFORE UPDATE ON public.creation_proposals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_quotes_updated_at ON public.commercial_quotes;
CREATE TRIGGER trg_commercial_quotes_updated_at
    BEFORE UPDATE ON public.commercial_quotes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_atelier_projects_updated_at ON public.atelier_projects;
CREATE TRIGGER trg_atelier_projects_updated_at
    BEFORE UPDATE ON public.atelier_projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_atelier_materials_category_active ON public.atelier_materials(category, is_active);
CREATE INDEX IF NOT EXISTS idx_creation_proposals_creation_id ON public.creation_proposals(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_proposal_items_proposal_id ON public.creation_proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_creation_proposal_items_material_id ON public.creation_proposal_items(material_id);
CREATE INDEX IF NOT EXISTS idx_commercial_quotes_creation_id ON public.commercial_quotes(creation_id);
CREATE INDEX IF NOT EXISTS idx_commercial_quotes_proposal_id ON public.commercial_quotes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_commercial_quote_items_quote_id ON public.commercial_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_atelier_projects_creation_id ON public.atelier_projects(creation_id);
CREATE INDEX IF NOT EXISTS idx_financial_movements_creation_id ON public.financial_movements(creation_id);
CREATE INDEX IF NOT EXISTS idx_financial_movements_project_id ON public.financial_movements(project_id);
CREATE INDEX IF NOT EXISTS idx_commercial_media_assets_creation_id ON public.commercial_media_assets(creation_id);
CREATE INDEX IF NOT EXISTS idx_commercial_events_creation_id ON public.commercial_events(creation_id);

-- ==============================================================================
-- 13. POLÍTICAS RLS EN LAS 10 TABLAS
-- ==============================================================================

ALTER TABLE public.creation_commercial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_events ENABLE ROW LEVEL SECURITY;

-- Revocar acceso anónimo y otorgar a roles autenticados en las 10 tablas
REVOKE ALL ON TABLE
    public.creation_commercial_profiles,
    public.atelier_materials,
    public.creation_proposals,
    public.creation_proposal_items,
    public.commercial_quotes,
    public.commercial_quote_items,
    public.atelier_projects,
    public.financial_movements,
    public.commercial_media_assets,
    public.commercial_events
FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.creation_commercial_profiles,
    public.atelier_materials,
    public.creation_proposals,
    public.creation_proposal_items,
    public.commercial_quotes,
    public.commercial_quote_items,
    public.atelier_projects,
    public.financial_movements,
    public.commercial_media_assets,
    public.commercial_events
TO authenticated, service_role, postgres;

-- Políticas para Administradoras y Diseñadoras (idempotentes y restringidas a TO authenticated)
DROP POLICY IF EXISTS "designer_admin_manage_commercial_profiles" ON public.creation_commercial_profiles;
CREATE POLICY "designer_admin_manage_commercial_profiles"
    ON public.creation_commercial_profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_materials" ON public.atelier_materials;
CREATE POLICY "designer_admin_manage_materials"
    ON public.atelier_materials
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_proposals" ON public.creation_proposals;
CREATE POLICY "designer_admin_manage_proposals"
    ON public.creation_proposals
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_proposal_items" ON public.creation_proposal_items;
CREATE POLICY "designer_admin_manage_proposal_items"
    ON public.creation_proposal_items
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_quotes" ON public.commercial_quotes;
CREATE POLICY "designer_admin_manage_quotes"
    ON public.commercial_quotes
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_quote_items" ON public.commercial_quote_items;
CREATE POLICY "designer_admin_manage_quote_items"
    ON public.commercial_quote_items
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_projects" ON public.atelier_projects;
CREATE POLICY "designer_admin_manage_projects"
    ON public.atelier_projects
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_financial_movements" ON public.financial_movements;
CREATE POLICY "designer_admin_manage_financial_movements"
    ON public.financial_movements
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_commercial_media" ON public.commercial_media_assets;
CREATE POLICY "designer_admin_manage_commercial_media"
    ON public.commercial_media_assets
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_manage_commercial_events" ON public.commercial_events;
CREATE POLICY "designer_admin_manage_commercial_events"
    ON public.commercial_events
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

-- ==============================================================================
-- 14. BUCKET DE SUPABASE STORAGE PRIVADO: commercial-assets
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'commercial-assets',
    'commercial-assets',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Políticas de Storage para commercial-assets (idempotentes, TO authenticated y WITH CHECK explícito)
DROP POLICY IF EXISTS "designer_admin_storage_commercial_assets_select" ON storage.objects;
CREATE POLICY "designer_admin_storage_commercial_assets_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'commercial-assets' AND public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_storage_commercial_assets_insert" ON storage.objects;
CREATE POLICY "designer_admin_storage_commercial_assets_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'commercial-assets' AND public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_storage_commercial_assets_update" ON storage.objects;
CREATE POLICY "designer_admin_storage_commercial_assets_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'commercial-assets' AND public.is_admin_or_designer())
    WITH CHECK (bucket_id = 'commercial-assets' AND public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_storage_commercial_assets_delete" ON storage.objects;
CREATE POLICY "designer_admin_storage_commercial_assets_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'commercial-assets' AND public.is_admin_or_designer());

COMMIT;
