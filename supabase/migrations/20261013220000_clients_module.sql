-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO CLIENTES (MVP)
-- Archivo: supabase/migrations/20261013220000_clients_module.sql
-- Proyecto: trgoqqvsprknswobvniu
-- ==============================================================================
-- Crea la tabla public.clients para la gestión del directorio de clientes
-- del atelier, con soporte para contacto, preferencias de estilo y notas privadas.
-- La tabla está protegida por Row Level Security (RLS) para roles autorizados
-- ('admin' y 'designer') mediante la función public.is_admin_or_designer().
--
-- CÓMO EJECUTAR ESTA MIGRACIÓN:
-- 1. Ve al SQL Editor de Supabase en el proyecto trgoqqvsprknswobvniu:
--    https://supabase.com/dashboard/project/trgoqqvsprknswobvniu/sql
-- 2. Copia y pega el contenido completo de este archivo.
-- 3. Haz clic en "Run" (o presiona Ctrl + Enter).
-- ==============================================================================

BEGIN;

-- 1. Creación de la tabla de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    style_preferences TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CONSTRAINT clients_status_check CHECK (status IN ('active', 'archived')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.clients IS 'Directorio de clientes de Atelier Digital gestionado por el equipo de diseño y administración.';
COMMENT ON COLUMN public.clients.full_name IS 'Nombre completo oficial del cliente (obligatorio).';
COMMENT ON COLUMN public.clients.email IS 'Correo electrónico opcional de contacto.';
COMMENT ON COLUMN public.clients.phone IS 'Teléfono de contacto opcional.';
COMMENT ON COLUMN public.clients.city IS 'Ciudad o municipio de residencia del cliente.';
COMMENT ON COLUMN public.clients.style_preferences IS 'Preferencias de estilo, gustos estéticos y siluetas predilectas.';
COMMENT ON COLUMN public.clients.internal_notes IS 'Notas confidenciales internas del atelier sobre el cliente.';
COMMENT ON COLUMN public.clients.status IS 'Estado del cliente en el atelier (active = activo, archived = archivado/desactivado).';
COMMENT ON COLUMN public.clients.created_by IS 'Identificador del usuario administrativo/diseñador que registró la ficha.';

-- 2. Índices para acelerar búsquedas y filtros habituales
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients(full_name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- 3. Trigger para actualización automática de updated_at
DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Habilitación de Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Revocación de permisos públicos y anon
REVOKE ALL ON TABLE public.clients FROM PUBLIC;
REVOKE ALL ON TABLE public.clients FROM anon;

-- Concesión de permisos a roles autenticados y de servicio
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role, postgres;

-- 6. Políticas RLS con autorización mediante public.is_admin_or_designer() y public.is_admin()

-- SELECT: Solo administradores y diseñadores pueden consultar clientes
DROP POLICY IF EXISTS "Administradores y diseñadores pueden consultar clientes" ON public.clients;
CREATE POLICY "Administradores y diseñadores pueden consultar clientes"
    ON public.clients
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_designer());

-- INSERT: Administradores y diseñadores pueden crear clientes vinculando su autoría
DROP POLICY IF EXISTS "Administradores y diseñadores pueden registrar clientes" ON public.clients;
CREATE POLICY "Administradores y diseñadores pueden registrar clientes"
    ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin_or_designer()
        AND created_by = auth.uid()
    );

-- UPDATE: Administradores y diseñadores pueden actualizar fichas y archivar/reactivar
DROP POLICY IF EXISTS "Administradores y diseñadores pueden modificar clientes" ON public.clients;
CREATE POLICY "Administradores y diseñadores pueden modificar clientes"
    ON public.clients
    FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

-- DELETE: La eliminación definitiva está reservada a administradores (los diseñadores pueden archivar)
DROP POLICY IF EXISTS "Solo administradores pueden eliminar clientes" ON public.clients;
CREATE POLICY "Solo administradores pueden eliminar clientes"
    ON public.clients
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

COMMIT;
