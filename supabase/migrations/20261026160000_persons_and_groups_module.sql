-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO DE PERSONAS MEDIDAS Y GRUPOS / NÚCLEOS (FASE 1)
-- Archivo: supabase/migrations/20261026160000_persons_and_groups_module.sql
-- Proyecto: trgoqqvsprknswobvniu
-- ==============================================================================
-- Soporta la relación de alta costura:
-- Cliente/Responsable → Persona Medida → Grupo/Núcleo → Toma de Medidas
-- Garantiza compatibilidad absoluta con flujos A, B, C y D existentes.
-- ==============================================================================

BEGIN;

-- 1. Tabla de Personas Medidas (Sujetos anatómicos del atelier)
CREATE TABLE IF NOT EXISTS public.persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    demographic_category TEXT NOT NULL CONSTRAINT persons_demographic_check 
        CHECK (demographic_category IN ('woman', 'man', 'girl', 'boy', 'baby')),
    reference_id TEXT,
    birth_date DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.persons IS 'Personas físicas a quienes se les toman medidas, vinculadas a un cliente responsable.';
COMMENT ON COLUMN public.persons.client_id IS 'Cliente o responsable legal/financiero del encargo.';
COMMENT ON COLUMN public.persons.demographic_category IS 'Arquetipo demográfico: woman, man, girl, boy o baby.';
COMMENT ON COLUMN public.persons.reference_id IS 'Identificador contextual opcional (ej: Alumna 14, Hija menor, Elenco 02).';

-- 2. Tabla de Grupos / Núcleos
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CONSTRAINT groups_type_check 
        CHECK (type IN ('family', 'school', 'corporate', 'atelier', 'other')),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.groups IS 'Agrupación lógica de personas pertenecientes a un cliente (ej. familia, curso escolar, empresa).';

-- 3. Tabla intermedia de Miembros de Grupo
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_group_person UNIQUE(group_id, person_id)
);

COMMENT ON TABLE public.group_members IS 'Asociación de personas a grupos con orden opcional.';

-- 4. Extensión no destructiva de measurement_sessions
-- client_id se conserva exactamente con su significado actual de cliente/responsable
-- person_id identifica opcionalmente al individuo medido
ALTER TABLE public.measurement_sessions 
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.measurement_sessions.person_id IS 'Persona física medida (opcional; si es null, la sesión corresponde directamente al cliente).';

-- 5. Índices de aceleración
CREATE INDEX IF NOT EXISTS idx_persons_client_id ON public.persons(client_id);
CREATE INDEX IF NOT EXISTS idx_persons_active ON public.persons(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_client_id ON public.groups(client_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_person_id ON public.group_members(person_id);
CREATE INDEX IF NOT EXISTS idx_meas_sessions_person_id ON public.measurement_sessions(person_id);

-- 6. Triggers de actualización de updated_at
DROP TRIGGER IF EXISTS set_persons_updated_at ON public.persons;
CREATE TRIGGER set_persons_updated_at
    BEFORE UPDATE ON public.persons
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_groups_updated_at ON public.groups;
CREATE TRIGGER set_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Seguridad RLS
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.persons FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.groups FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.group_members FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.persons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_members TO authenticated;
GRANT ALL ON TABLE public.persons, public.groups, public.group_members TO service_role, postgres;

-- Políticas RLS para persons
DROP POLICY IF EXISTS "Personas visibles para diseñadora y admin" ON public.persons;
CREATE POLICY "Personas visibles para diseñadora y admin"
    ON public.persons FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden registrar personas" ON public.persons;
CREATE POLICY "Diseñadora y admin pueden registrar personas"
    ON public.persons FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden actualizar personas" ON public.persons;
CREATE POLICY "Diseñadora y admin pueden actualizar personas"
    ON public.persons FOR UPDATE TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Solo admin puede eliminar personas" ON public.persons;
CREATE POLICY "Solo admin puede eliminar personas"
    ON public.persons FOR DELETE TO authenticated
    USING (public.is_admin());

-- Políticas RLS para groups
DROP POLICY IF EXISTS "Grupos visibles para diseñadora y admin" ON public.groups;
CREATE POLICY "Grupos visibles para diseñadora y admin"
    ON public.groups FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden registrar grupos" ON public.groups;
CREATE POLICY "Diseñadora y admin pueden registrar grupos"
    ON public.groups FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden actualizar grupos" ON public.groups;
CREATE POLICY "Diseñadora y admin pueden actualizar grupos"
    ON public.groups FOR UPDATE TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Solo admin puede eliminar grupos" ON public.groups;
CREATE POLICY "Solo admin puede eliminar grupos"
    ON public.groups FOR DELETE TO authenticated
    USING (public.is_admin());

-- Políticas RLS para group_members
DROP POLICY IF EXISTS "Miembros de grupo visibles para diseñadora y admin" ON public.group_members;
CREATE POLICY "Miembros de grupo visibles para diseñadora y admin"
    ON public.group_members FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden gestionar miembros" ON public.group_members;
CREATE POLICY "Diseñadora y admin pueden gestionar miembros"
    ON public.group_members FOR ALL TO authenticated
    USING (public.is_admin_or_designer());

COMMIT;
