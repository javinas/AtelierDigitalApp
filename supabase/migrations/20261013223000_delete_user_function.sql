-- ==============================================================================
-- ATELIER DIGITAL — FUNCIÓN: ELIMINACIÓN DE USUARIOS POR EL ADMINISTRADOR
-- Archivo: supabase/migrations/20261013223000_delete_user_function.sql
-- Proyecto: trgoqqvsprknswobvniu
-- ==============================================================================
-- Permite al Administrador Principal eliminar usuarios de autenticación (auth.users)
-- directamente desde la aplicación mediante RPC con control de acceso y seguridad estricta.
--
-- CÓMO EJECUTAR ESTA MIGRACIÓN:
-- 1. Ve al SQL Editor de Supabase en el proyecto trgoqqvsprknswobvniu:
--    https://supabase.com/dashboard/project/trgoqqvsprknswobvniu/sql
-- 2. Copia y pega el contenido de este archivo.
-- 3. Haz clic en "Run" (o presiona Ctrl + Enter).
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    calling_user_role TEXT;
    target_email TEXT;
BEGIN
    -- 1. Validar que el usuario que ejecuta sea Administrador Principal
    SELECT role INTO calling_user_role 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF calling_user_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado: se requieren privilegios de Administrador Principal.';
    END IF;

    -- 2. Obtener correo del usuario a eliminar
    SELECT email INTO target_email 
    FROM auth.users 
    WHERE id = target_user_id;

    IF target_email IS NULL THEN
        -- Si el usuario ya no existe en auth.users, limpiar posibles huérfanos en profiles
        DELETE FROM public.profiles WHERE id = target_user_id;
        RETURN TRUE;
    END IF;

    -- 3. Protección infranqueable para el Administrador Principal
    IF target_user_id = '0b57041f-3a3e-40c5-8dc9-74300484a974' 
       OR LOWER(target_email) = 'jairo.vinas@gmail.com' THEN
        RAISE EXCEPTION 'Operación denegada: la cuenta de jairo.vinas@gmail.com está protegida contra eliminación.';
    END IF;

    -- 4. Impedir que el administrador en sesión se elimine a sí mismo
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Operación denegada: no puedes eliminar tu propia cuenta administrativa activa.';
    END IF;

    -- 5. Eliminar de auth.users (cascada automática a public.profiles)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- Permisos estrictos
REVOKE ALL ON FUNCTION public.delete_user_by_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_by_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated, service_role, postgres;

COMMENT ON FUNCTION public.delete_user_by_admin(UUID) IS 'Permite a administradores autenticados eliminar usuarios de auth.users protegiendo al Administrador Principal.';

COMMIT;
