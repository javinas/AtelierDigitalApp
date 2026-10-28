-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: ROL ADMINISTRADOR PRINCIPAL Y SEGURIDAD NUCLEAR
-- Archivo: supabase/migrations/20261013093000_admin_role_and_security.sql
-- ==============================================================================
-- Esta migración complementa el Módulo 00 para soportar de forma segura el rol 'admin':
-- 1. Asegura que la restricción CHECK en public.profiles admita 'admin', 'designer' y 'client'.
-- 2. Define las funciones auxiliares de seguridad public.is_admin() y public.is_admin_or_designer().
-- 3. Refuerza el trigger prevent_role_escalation() para proteger el rol del
--    Administrador Principal (jairo.vinas@gmail.com) contra degradaciones accidentales
--    y bloquear cualquier intento de modificación de rol originado en la API cliente.
-- 4. Actualiza la política RLS de consulta de perfiles para administradores y diseñadoras.
-- 5. Ejecución atómica controlada mediante transacción explícita (BEGIN ... COMMIT).
--
-- CÓMO EJECUTAR ESTA MIGRACIÓN:
-- 1. Ve al SQL Editor de Supabase (https://supabase.com/dashboard/project/_/sql).
-- 2. Pega el contenido de este archivo y haz clic en "Run".
-- ==============================================================================

BEGIN;

-- 1. Restricción de roles permitidos en public.profiles
DO $$
BEGIN
    -- Eliminar la restricción previa si existe para actualizarla limpiamente
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_role_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;

    -- Agregar la restricción actualizada con los 3 roles del sistema
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('admin', 'designer', 'client'));
END;
$$;

-- 2. Función auxiliar SECURITY DEFINER: is_admin()
-- Permite verificar de forma segura y sin recursión RLS si el usuario actual es 'admin'.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

-- 3. Función auxiliar SECURITY DEFINER: is_admin_or_designer()
-- Permite acceso a perfiles de clientas tanto al administrador como a la diseñadora.
CREATE OR REPLACE FUNCTION public.is_admin_or_designer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'designer')
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_designer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_designer() TO authenticated, service_role, postgres;

-- 4. Refuerzo de prevent_role_escalation() para proteger el rol del Administrador Principal
-- Alcance y Notas de Seguridad:
-- - Es SECURITY INVOKER para preservar fielmente los roles de conexión (current_user, session_user).
-- - Bloquea cualquier intento de cambiar 'role' por usuarios de la API cliente (authenticated o anon).
-- - Protege el rol de la cuenta principal (jairo.vinas@gmail.com / 0b57041f-3a3e-40c5-8dc9-74300484a974)
--   contra degradaciones accidentales. Nota: no bloquea la actualización de otros campos del perfil
--   (como nombre, teléfono o avatar), limitando la protección estrictamente al campo 'role'.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Se detecta intento de cambio en el valor de role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Protección específica del rol del Administrador Principal:
        -- No puede ser degradado a otro rol bajo ninguna circunstancia rutinaria.
        IF (OLD.id = '0b57041f-3a3e-40c5-8dc9-74300484a974'::uuid OR LOWER(COALESCE(OLD.email, '')) = 'jairo.vinas@gmail.com') 
           AND NEW.role <> 'admin' THEN
            RAISE EXCEPTION 'Operación denegada: el rol del Administrador Principal (jairo.vinas@gmail.com) está protegido contra degradaciones.';
        END IF;

        -- Bloqueo absoluto de modificaciones de rol a través de la API cliente
        IF (COALESCE(auth.role(), '') IN ('authenticated', 'anon'))
           OR (current_user IN ('authenticated', 'anon'))
           OR (session_user IN ('authenticated', 'anon')) THEN
            RAISE EXCEPTION 'Operación denegada: no tienes permiso para modificar el rol de usuario desde la API cliente.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_role_escalation() TO authenticated, service_role, postgres;

-- Reasociar el trigger sobre public.profiles
DROP TRIGGER IF EXISTS enforce_no_role_escalation ON public.profiles;
CREATE TRIGGER enforce_no_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 5. Actualización de Políticas RLS para public.profiles
DROP POLICY IF EXISTS "La diseñadora puede ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "La diseñadora y administración pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Administración y diseñadora pueden ver todos los perfiles" ON public.profiles;

CREATE POLICY "Administración y diseñadora pueden ver todos los perfiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_designer());

-- Comentario explicativo de verificación
COMMENT ON FUNCTION public.is_admin() IS 'Verifica si el usuario autenticado tiene rol de administrador principal.';
COMMENT ON FUNCTION public.is_admin_or_designer() IS 'Verifica si el usuario autenticado tiene rol de administrador o diseñadora.';

COMMIT;
