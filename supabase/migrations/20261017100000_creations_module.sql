-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO DE CREACIONES (FASE 2)
-- Archivo: supabase/migrations/20261017100000_creations_module.sql
-- ==============================================================================
-- Introduce la entidad nuclear 'public.creations' para desacoplar el encargo,
-- diseño y proyecto de alta costura de la ejecución paramétrica de patronaje.
--
-- REGLAS ARQUITECTÓNICAS DE ESTA MIGRACIÓN:
-- 1. CREACIÓN NO DEPENDE OBLIGATORIAMENTE DE PATRONAJE (active_pattern_execution_id es NULLABLE).
-- 2. pattern_executions.creation_id es NULLABLE: las ejecuciones históricas C12/C13
--    permanecen 100% intactas e inmutables con creation_id = NULL.
-- 3. measurement_sessions.creation_id es NULLABLE: permite vincular sesiones a creaciones
--    sin romper el histórico de la clienta (C03, C07, C08, C09, C10).
-- 4. RLS estricto mediante public.is_admin_or_designer() y public.is_admin().
-- 5. Claves foráneas con ON DELETE RESTRICT en client_id para evitar borrados accidentales,
--    y ON DELETE SET NULL en punteros de patrón/sesión.
-- ==============================================================================

BEGIN;

-- 1. TABLA: Creaciones de Alta Costura
CREATE TABLE IF NOT EXISTS public.creations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    creation_type TEXT NOT NULL DEFAULT 'bespoke' 
        CHECK (creation_type IN ('bespoke', 'pret_a_couture', 'couture_collection', 'bridal', 'gala', 'corporate', 'fantasy', 'alteration')),
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'active', 'fitting', 'approved', 'production', 'completed', 'cancelled')),
    occasion TEXT,
    garment_type TEXT,
    target_date DATE,
    session_id UUID REFERENCES public.measurement_sessions(id) ON DELETE SET NULL,
    active_pattern_execution_id UUID, -- FK agregada tras verificar tablas
    notes TEXT,
    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.creations IS 'Proyectos y encargos de alta costura para clientas, desacoplados del patronaje CAD.';
COMMENT ON COLUMN public.creations.client_id IS 'Clienta dueña del encargo de alta costura (obligatoria).';
COMMENT ON COLUMN public.creations.name IS 'Nombre representativo del encargo (ej. Vestido de Gala en Terciopelo y Seda).';
COMMENT ON COLUMN public.creations.creation_type IS 'Tipología del encargo (bespoke, bridal, gala, corporate, etc.).';
COMMENT ON COLUMN public.creations.status IS 'Estado del ciclo de vida del encargo en el atelier.';
COMMENT ON COLUMN public.creations.session_id IS 'Puntero opcional a la sesión de medidas corporales vinculada al encargo.';
COMMENT ON COLUMN public.creations.active_pattern_execution_id IS 'Puntero opcional a la ejecución de patrón CAD actualmente activa.';

-- 2. FK recíproca controlada hacia pattern_executions (opcional)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_creations_active_pattern' 
          AND conrelid = 'public.creations'::regclass
    ) THEN
        ALTER TABLE public.creations
            ADD CONSTRAINT fk_creations_active_pattern
            FOREIGN KEY (active_pattern_execution_id)
            REFERENCES public.pattern_executions(id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

-- 3. Adición segura y no destructiva de creation_id en pattern_executions
ALTER TABLE public.pattern_executions 
    ADD COLUMN IF NOT EXISTS creation_id UUID NULL REFERENCES public.creations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pattern_executions.creation_id IS 'Vínculo opcional hacia la Creación que originó este patrón. Es NULL para ejecuciones históricas y patronaje directo.';

-- 4. Adición segura y no destructiva de creation_id en measurement_sessions
ALTER TABLE public.measurement_sessions 
    ADD COLUMN IF NOT EXISTS creation_id UUID NULL REFERENCES public.creations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.measurement_sessions.creation_id IS 'Vínculo opcional hacia la Creación para la cual se capturaron estas medidas.';

-- 5. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_creations_client_id ON public.creations(client_id);
CREATE INDEX IF NOT EXISTS idx_creations_status ON public.creations(status);
CREATE INDEX IF NOT EXISTS idx_creations_created_at ON public.creations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_exec_creation ON public.pattern_executions(creation_id);
CREATE INDEX IF NOT EXISTS idx_meas_sessions_creation ON public.measurement_sessions(creation_id);

-- 6. Trigger para actualización automática de updated_at
DROP TRIGGER IF EXISTS set_creations_updated_at ON public.creations;
CREATE TRIGGER set_creations_updated_at
    BEFORE UPDATE ON public.creations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Habilitación de Row Level Security (RLS) en public.creations
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

-- 8. Permisos de roles PostgreSQL
REVOKE ALL ON TABLE public.creations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.creations TO authenticated;
GRANT ALL ON TABLE public.creations TO service_role, postgres;

-- 9. Políticas RLS
-- SELECT: Administradores y diseñadores pueden consultar todas las creaciones del atelier
DROP POLICY IF EXISTS "Creaciones visibles para admin y disenadoras" ON public.creations;
CREATE POLICY "Creaciones visibles para admin y disenadoras"
    ON public.creations
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_designer());

-- INSERT: Administradores y diseñadores pueden registrar creaciones asignando su autoría
DROP POLICY IF EXISTS "Disenadoras y admin pueden registrar creaciones" ON public.creations;
CREATE POLICY "Disenadoras y admin pueden registrar creaciones"
    ON public.creations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin_or_designer()
        AND created_by = auth.uid()
    );

-- UPDATE: Administradores y diseñadores pueden modificar creaciones
DROP POLICY IF EXISTS "Disenadoras y admin pueden actualizar creaciones" ON public.creations;
CREATE POLICY "Disenadoras y admin pueden actualizar creaciones"
    ON public.creations
    FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

-- DELETE: La eliminación definitiva está restringida al administrador principal
DROP POLICY IF EXISTS "Solo admin puede eliminar creaciones" ON public.creations;
CREATE POLICY "Solo admin puede eliminar creaciones"
    ON public.creations
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

COMMIT;
