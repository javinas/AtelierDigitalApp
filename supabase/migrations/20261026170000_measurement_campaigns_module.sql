-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 02 · FASE 3
-- MIGRACIÓN: JORNADAS DE MEDICIÓN Y CAPTURA MASIVA
-- Archivo: supabase/migrations/20261026170000_measurement_campaigns_module.sql
-- ==============================================================================
-- Permite agrupar tomas de medidas de múltiples personas pertenecientes a un grupo
-- bajo un cliente responsable, utilizando las plantillas de MeasurementTemplate.
-- ==============================================================================

-- 1. TABLA: JORNADAS DE MEDICIÓN (measurement_campaigns)
CREATE TABLE IF NOT EXISTS public.measurement_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    campaign_date DATE NOT NULL DEFAULT CURRENT_DATE,
    template_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'standard_with_adjustments' CHECK (mode IN ('standard_only', 'standard_with_adjustments', 'manual_direct')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    unit_system TEXT NOT NULL DEFAULT 'cm' CHECK (unit_system IN ('cm', 'mm', 'in')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.measurement_campaigns IS 'Jornadas de medición grupal para colegios, familias, dotaciones y comparsas.';

-- 2. TABLA: PARTICIPANTES EN JORNADA (measurement_campaign_participants)
CREATE TABLE IF NOT EXISTS public.measurement_campaign_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.measurement_campaigns(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.measurement_sessions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    standard_size TEXT,
    captured_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_campaign_person UNIQUE(campaign_id, person_id)
);

COMMENT ON TABLE public.measurement_campaign_participants IS 'Registro individual de avance y valores capturados por persona en una jornada.';

-- 3. VINCULACIÓN OPCIONAL EN measurement_sessions (SIN ALTERAR ESQUEMA NI RLS PREVIAS)
ALTER TABLE public.measurement_sessions
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.measurement_campaigns(id) ON DELETE SET NULL;

-- 4. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_meas_campaigns_client ON public.measurement_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_meas_campaigns_group ON public.measurement_campaigns(group_id);
CREATE INDEX IF NOT EXISTS idx_meas_campaigns_status ON public.measurement_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_meas_camp_part_camp ON public.measurement_campaign_participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meas_camp_part_pers ON public.measurement_campaign_participants(person_id);
CREATE INDEX IF NOT EXISTS idx_meas_sess_campaign ON public.measurement_sessions(campaign_id);

-- 5. TRIGGERS DE UPDATED_AT
DROP TRIGGER IF EXISTS set_measurement_campaigns_updated_at ON public.measurement_campaigns;
CREATE TRIGGER set_measurement_campaigns_updated_at
    BEFORE UPDATE ON public.measurement_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_measurement_campaign_participants_updated_at ON public.measurement_campaign_participants;
CREATE TRIGGER set_measurement_campaign_participants_updated_at
    BEFORE UPDATE ON public.measurement_campaign_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. POLÍTICAS RLS (Row Level Security)
ALTER TABLE public.measurement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_campaign_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_admin_designer_all" ON public.measurement_campaigns;
CREATE POLICY "campaigns_admin_designer_all"
    ON public.measurement_campaigns
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "camp_participants_admin_designer_all" ON public.measurement_campaign_participants;
CREATE POLICY "camp_participants_admin_designer_all"
    ON public.measurement_campaign_participants
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());
