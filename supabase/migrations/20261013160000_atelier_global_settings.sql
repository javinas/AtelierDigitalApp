-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: CONFIGURACIÓN GLOBAL DE LA PLATAFORMA
-- Archivo: supabase/migrations/20261013160000_atelier_global_settings.sql
-- ==============================================================================
-- Crea la tabla singleton public.atelier_settings con RLS estricta para el rol 'admin'.
-- Solo el Administrador Principal autenticado (mediante public.is_admin())
-- tiene permisos para consultar y modificar esta tabla.
--
-- CÓMO EJECUTAR ESTA MIGRACIÓN:
-- 1. Ve al SQL Editor de Supabase en el proyecto trgoqqvsprknswobvniu:
--    https://supabase.com/dashboard/project/trgoqqvsprknswobvniu/sql
-- 2. Copia y pega el contenido completo de este archivo.
-- 3. Haz clic en "Run" (o presiona Ctrl + Enter).
-- ==============================================================================

BEGIN;

-- 1. Creación de la tabla singleton atelier_settings
CREATE TABLE IF NOT EXISTS public.atelier_settings (
    id INT PRIMARY KEY DEFAULT 1 CONSTRAINT atelier_settings_singleton CHECK (id = 1),
    commercial_name TEXT NOT NULL DEFAULT 'Atelier de Autor · By Katherine Carroll',
    contact_email TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
    currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
    date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.atelier_settings IS 'Configuración global única de Atelier Digital gestionada exclusivamente por administradores.';
COMMENT ON COLUMN public.atelier_settings.commercial_name IS 'Nombre comercial oficial del atelier.';
COMMENT ON COLUMN public.atelier_settings.contact_email IS 'Correo electrónico general de contacto.';
COMMENT ON COLUMN public.atelier_settings.contact_phone IS 'Teléfono oficial de atención y pedidos.';
COMMENT ON COLUMN public.atelier_settings.language IS 'Idioma preferente de la plataforma (es o en).';
COMMENT ON COLUMN public.atelier_settings.currency IS 'Moneda operativa principal (COP o USD).';
COMMENT ON COLUMN public.atelier_settings.date_format IS 'Formato visual de fechas en el sistema.';

-- 2. Inserción de la fila única por defecto (idempotente, sin datos de contacto ficticios)
INSERT INTO public.atelier_settings (
    id,
    commercial_name,
    contact_email,
    contact_phone,
    language,
    currency,
    date_format
)
VALUES (
    1,
    'Atelier de Autor · By Katherine Carroll',
    '',
    '',
    'es',
    'COP',
    'DD/MM/YYYY'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Trigger para actualización automática de updated_at
DROP TRIGGER IF EXISTS set_atelier_settings_updated_at ON public.atelier_settings;
CREATE TRIGGER set_atelier_settings_updated_at
    BEFORE UPDATE ON public.atelier_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Habilitación de Row Level Security (RLS)
ALTER TABLE public.atelier_settings ENABLE ROW LEVEL SECURITY;

-- 5. Revocación de permisos públicos y anon
REVOKE ALL ON TABLE public.atelier_settings FROM PUBLIC;
REVOKE ALL ON TABLE public.atelier_settings FROM anon;

-- Concesión de permisos estrictos a roles autenticados y de servicio
GRANT SELECT, INSERT, UPDATE ON TABLE public.atelier_settings TO authenticated;
GRANT ALL ON TABLE public.atelier_settings TO service_role, postgres;

-- 6. Políticas RLS con autorización mediante public.is_admin()
DROP POLICY IF EXISTS "Solo administradores pueden consultar la configuración" ON public.atelier_settings;
CREATE POLICY "Solo administradores pueden consultar la configuración"
    ON public.atelier_settings
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Solo administradores pueden modificar la configuración" ON public.atelier_settings;
CREATE POLICY "Solo administradores pueden modificar la configuración"
    ON public.atelier_settings
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin() AND updated_by = auth.uid());

DROP POLICY IF EXISTS "Solo administradores pueden insertar la configuración inicial" ON public.atelier_settings;
CREATE POLICY "Solo administradores pueden insertar la configuración inicial"
    ON public.atelier_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() AND id = 1 AND (updated_by = auth.uid() OR updated_by IS NULL));

COMMIT;
