-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 00: FUNDACIÓN TÉCNICA, PERFILES Y AUTENTICACIÓN
-- Archivo: supabase/modulo00_auth_profiles.sql
-- ==============================================================================
-- Este script crea la tabla de perfiles, los roles autorizados, las restricciones
-- de seguridad, la sincronización automática con Supabase Auth y las políticas RLS.
--
-- CÓMO EJECUTAR ESTE ARCHIVO:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard).
-- 2. En el menú lateral izquierdo, haz clic en "SQL Editor".
-- 3. Haz clic en "New query".
-- 4. Copia y pega el contenido completo de este archivo.
-- 5. Haz clic en el botón verde "Run" (o presiona Ctrl + Enter).
-- ==============================================================================

-- 1. Creación de la tabla profiles (si no existe)
-- Las columnas TIMESTAMPTZ utilizan DEFAULT pg_catalog.now() para registrar
-- el instante UTC exacto sin conversiones de zona horaria que puedan desfasarlo.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('designer', 'client')),
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario de Atelier Digital vinculados a Supabase Auth.';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario en el sistema: designer (diseñadora) o client (clienta).';

-- 2. Índices para optimizar búsquedas por rol y correo
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Habilitación obligatoria de Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Permisos explícitos en tabla (Mínimo privilegio - Principio de defensa en profundidad)
-- RLS opera después de los permisos de tabla; por ello definimos GRANT y REVOKE explícitos.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon;

-- El rol authenticated solo puede consultar, insertar y actualizar sus datos según RLS.
-- NO se concede DELETE a authenticated (las cuentas solo se eliminan en cascada desde auth.users).
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Roles de sistema y administración con control total
GRANT ALL ON TABLE public.profiles TO service_role, postgres;

-- 5. Función y Trigger para actualizar automáticamente 'updated_at'
-- Nota de seguridad:
-- - Es SECURITY INVOKER con search_path vacío ('').
-- - Asigna directamente pg_catalog.now() para registrar el instante exacto en TIMESTAMPTZ.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role, postgres;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Función de ayuda SECURITY DEFINER para verificar rol sin recursión en RLS
-- Nota de seguridad:
-- - Requiere SECURITY DEFINER para inspeccionar public.profiles sin causar recursión infinita en RLS.
-- - Utiliza search_path vacío ('') y referencias completamente calificadas para mitigar ataques de búsqueda de ruta.
CREATE OR REPLACE FUNCTION public.is_designer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'designer'
    );
$$;

REVOKE ALL ON FUNCTION public.is_designer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_designer() TO authenticated, service_role, postgres;

-- 7. Función y Trigger para impedir que usuarios modifiquen el campo role (escalada de privilegios)
-- Nota de seguridad:
-- - Es SECURITY INVOKER (NO SECURITY DEFINER) para que current_user y session_user reflejen fielmente el rol de conexión.
-- - COALESCE es una construcción sintáctica estándar de PostgreSQL (no lleva prefijo de esquema).
-- - Si la petición proviene de la API de Supabase (auth.role() IN ('authenticated', 'anon') o roles de conexión cliente),
--   la modificación del campo role es terminantemente bloqueada tanto para clientas como para diseñadoras.
-- - Solo se admite modificación administrativa directa desde Supabase SQL Editor (ejecutado por rol 'postgres' sin JWT).
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Se detecta intento de cambio en el valor de role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Si la petición se origina a través de la API cliente o un rol cliente de conexión
        IF (COALESCE(auth.role(), '') IN ('authenticated', 'anon'))
           OR (current_user IN ('authenticated', 'anon'))
           OR (session_user IN ('authenticated', 'anon')) THEN
            RAISE EXCEPTION 'Operación denegada: no tienes permiso para modificar el rol de usuario.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_role_escalation() TO authenticated, service_role, postgres;

DROP TRIGGER IF EXISTS enforce_no_role_escalation ON public.profiles;
CREATE TRIGGER enforce_no_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 8. Trigger para creación automática del perfil al registrar un nuevo usuario en auth.users
-- Seguridad estricta:
-- - Requiere SECURITY DEFINER para insertar en public.profiles al activarse desde auth.users.
-- - Utiliza search_path vacío (''), COALESCE estándar y funciones calificadas (pg_catalog.split_part).
-- - Todo registro público recibe forzosamente el rol 'client'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_name TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        pg_catalog.split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, full_name, role, email)
    VALUES (
        NEW.id,
        user_name,
        'client', -- Rol client por defecto obligatorio
        NEW.email
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- En Supabase gestionado, el servicio de autenticación (GoTrue) opera bajo el rol supabase_auth_admin.
-- Garantizamos que supabase_auth_admin pueda ejecutar el trigger si el rol está presente.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin';
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 9. Políticas de Seguridad RLS para public.profiles

-- Eliminar políticas previas para garantizar idempotencia
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "La diseñadora puede ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;

-- Política 1: Lectura propia (una clienta solo puede consultar su propio registro)
CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Política 2: Lectura para diseñadora (la diseñadora puede consultar todos los perfiles)
CREATE POLICY "La diseñadora puede ver todos los perfiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_designer());

-- Política 3: Inserción controlada desde cliente (fallback de seguridad si el trigger no se ejecutó)
-- Obliga a que cualquier inserción directa vía API cliente tenga exclusivamente role = 'client'
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        AND role = 'client'
    );

-- Política 4: Actualización de datos propios (el trigger prevent_role_escalation protege el campo role)
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 10. Sincronizar usuarios existentes en auth.users que aún no tengan perfil
INSERT INTO public.profiles (id, full_name, role, email)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', pg_catalog.split_part(email, '@', 1)),
    'client',
    email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- ASIGNACIÓN DE LA CUENTA PRINCIPAL DE DISEÑADORA
-- ==============================================================================
-- Para otorgar el rol de diseñadora a la cuenta principal de forma segura:
-- 1. Regístrate en la app o crea el usuario en Authentication > Users en Supabase.
-- 2. Ejecuta la siguiente consulta en Supabase SQL Editor sustituyendo el correo por el real:
--
--    UPDATE public.profiles
--    SET role = 'designer'
--    WHERE email = 'tu_correo@ejemplo.com';
--
-- Explicación técnica de seguridad:
-- Esta consulta se ejecuta en SQL Editor bajo el rol de base de datos 'postgres'
-- (sin contexto JWT de usuario cliente). Por ende:
-- - auth.role() es NULL.
-- - current_user y session_user son 'postgres'.
-- El trigger prevent_role_escalation() reconoce la operación como una acción administrativa
-- de consola y autoriza la actualización.
-- En contraste, cualquier intento de actualización del campo 'role' vía API de Supabase
-- (auth.role() = 'authenticated') será bloqueado inmediatamente con una excepción.
-- ==============================================================================
