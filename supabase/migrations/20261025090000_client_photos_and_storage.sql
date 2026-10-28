-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: FOTOGRAFÍAS DE CLIENTAS Y STORAGE SEGURO
-- Archivo: supabase/migrations/20261025090000_client_photos_and_storage.sql
-- Proyecto: trgoqqvsprknswobvniu
-- ==============================================================================
-- 1. Añade la columna 'photo_url' a la tabla public.clients para almacenar la
--    referencia o ruta relativa a Supabase Storage (client-photos).
-- 2. Inicializa el bucket privado 'client-photos' en storage.buckets con límite de
--    5MB y restricción a formatos JPG, JPEG, PNG y WebP.
-- 3. Establece políticas RLS específicas en storage.objects para SELECT, INSERT,
--    UPDATE y DELETE vinculadas a public.is_admin_or_designer().
--
-- CÓMO EJECUTAR ESTA MIGRACIÓN:
-- 1. Ve al SQL Editor de Supabase en el proyecto trgoqqvsprknswobvniu:
--    https://supabase.com/dashboard/project/trgoqqvsprknswobvniu/sql
-- 2. Copia y pega el contenido completo de este archivo.
-- 3. Haz clic en "Run" (o presiona Ctrl + Enter).
-- ==============================================================================

BEGIN;

-- 1. Columna photo_url en public.clients
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN public.clients.photo_url IS 'Ruta relativa de almacenamiento en el bucket client-photos o URL externa de la fotografía de perfil de la clienta.';

-- 2. Creación / Configuración del bucket privado client-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-photos',
    'client-photos',
    false, -- Privado: protegido por RLS y URLs firmadas
    5242880, -- 5 MB límite por fotografía
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 3. Políticas RLS granulares en storage.objects para el bucket 'client-photos'

-- SELECT: Administradores y diseñadoras pueden visualizar las fotografías
DROP POLICY IF EXISTS "Diseñadores y administradores pueden ver fotos de clientas" ON storage.objects;
CREATE POLICY "Diseñadores y administradores pueden ver fotos de clientas"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'client-photos'
        AND public.is_admin_or_designer()
    );

-- INSERT: Administradores y diseñadoras pueden subir fotografías de clientas
DROP POLICY IF EXISTS "Diseñadores y administradores pueden subir fotos de clientas" ON storage.objects;
CREATE POLICY "Diseñadores y administradores pueden subir fotos de clientas"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'client-photos'
        AND public.is_admin_or_designer()
    );

-- UPDATE: Administradores y diseñadoras pueden actualizar / reemplazar fotografías
DROP POLICY IF EXISTS "Diseñadores y administradores pueden actualizar fotos de clientas" ON storage.objects;
CREATE POLICY "Diseñadores y administradores pueden actualizar fotos de clientas"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'client-photos'
        AND public.is_admin_or_designer()
    )
    WITH CHECK (
        bucket_id = 'client-photos'
        AND public.is_admin_or_designer()
    );

-- DELETE: Administradores y diseñadoras pueden eliminar fotografías
DROP POLICY IF EXISTS "Diseñadores y administradores pueden eliminar fotos de clientas" ON storage.objects;
CREATE POLICY "Diseñadores y administradores pueden eliminar fotos de clientas"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'client-photos'
        AND public.is_admin_or_designer()
    );

COMMIT;
