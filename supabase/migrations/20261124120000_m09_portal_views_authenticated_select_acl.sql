-- ==============================================================================
-- ATELIER DIGITAL — M09 ACL REMEDIATION FOR PORTAL VIEWS (v_portal_*)
-- Archivo: supabase/migrations/20261124120000_m09_portal_views_authenticated_select_acl.sql
-- ==============================================================================
-- Motivo:
--   En 20261118000000_client_portal_m09.sql las 6 vistas public.v_portal_*
--   fueron transferidas a OWNER atelier_portal_reader (con postgres teniendo
--   INHERIT FALSE, SET TRUE). Al ejecutar GRANT SELECT ... TO authenticated sin
--   SET LOCAL ROLE atelier_portal_reader, PostgreSQL no concedió el privilegio.
--
-- Alcance estricto (aditivo):
--   Conceder únicamente SELECT al rol authenticated sobre las 6 vistas canónicas
--   public.v_portal_* dentro de transacción, mediante SET LOCAL ROLE
--   atelier_portal_reader y RESET ROLE.
--   No altera RLS, definiciones de vistas, propietarios, roles ni membresías.
-- ==============================================================================

BEGIN;

-- 1. Pre-check estricto (fallo rápido si cambia alguna precondición estructural)
DO $$
DECLARE
    v_views CONSTANT TEXT[] := ARRAY[
        'v_portal_client_profile',
        'v_portal_creations',
        'v_portal_appointments',
        'v_portal_fitting_sessions',
        'v_portal_commercial_quotes',
        'v_portal_measurement_sessions'
    ];
    v_name TEXT;
    v_view_count INT;
    v_bypass BOOLEAN;
    v_canlogin BOOLEAN;
BEGIN
    SELECT rolbypassrls, rolcanlogin
      INTO v_bypass, v_canlogin
      FROM pg_catalog.pg_roles
     WHERE rolname = 'atelier_portal_reader';

    IF NOT FOUND OR v_bypass IS DISTINCT FROM false OR v_canlogin IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'Pre-check ACL fallido: rol atelier_portal_reader ausente o con atributos inesperados.'
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*)
      INTO v_view_count
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_catalog.pg_roles r ON c.relowner = r.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'v'
       AND c.relname = ANY(v_views)
       AND r.rolname = 'atelier_portal_reader'
       AND 'security_barrier=true' = ANY(c.reloptions)
       AND 'security_invoker=false' = ANY(c.reloptions);

    IF v_view_count <> 6 THEN
        RAISE EXCEPTION 'Pre-check ACL fallido: se esperaban 6 vistas v_portal_* con owner atelier_portal_reader, security_barrier=true y security_invoker=false (encontradas: %).', v_view_count
            USING ERRCODE = '42501';
    END IF;

    FOREACH v_name IN ARRAY v_views LOOP
        IF pg_catalog.has_table_privilege('anon', 'public.' || v_name, 'SELECT') THEN
            RAISE EXCEPTION 'Pre-check ACL fallido: anon tiene SELECT inesperado en public.%.', v_name
                USING ERRCODE = '42501';
        END IF;
    END LOOP;
END;
$$;

-- 2. Concesión exclusiva de SELECT a authenticated bajo el propietario de las vistas
SET LOCAL ROLE atelier_portal_reader;

GRANT SELECT ON
    public.v_portal_client_profile,
    public.v_portal_creations,
    public.v_portal_appointments,
    public.v_portal_fitting_sessions,
    public.v_portal_commercial_quotes,
    public.v_portal_measurement_sessions
TO authenticated;

RESET ROLE;

-- 3. Post-check intra-transaccional (garantiza atomicidad y cero regresiones)
DO $$
DECLARE
    v_views CONSTANT TEXT[] := ARRAY[
        'v_portal_client_profile',
        'v_portal_creations',
        'v_portal_appointments',
        'v_portal_fitting_sessions',
        'v_portal_commercial_quotes',
        'v_portal_measurement_sessions'
    ];
    v_name TEXT;
    v_view_count INT;
    v_apr_policy_count INT;
BEGIN
    FOREACH v_name IN ARRAY v_views LOOP
        IF NOT pg_catalog.has_table_privilege('authenticated', 'public.' || v_name, 'SELECT') THEN
            RAISE EXCEPTION 'Post-check ACL fallido: authenticated no obtuvo SELECT en public.%.', v_name
                USING ERRCODE = '42501';
        END IF;

        IF pg_catalog.has_table_privilege('authenticated', 'public.' || v_name, 'INSERT')
           OR pg_catalog.has_table_privilege('authenticated', 'public.' || v_name, 'UPDATE')
           OR pg_catalog.has_table_privilege('authenticated', 'public.' || v_name, 'DELETE') THEN
            RAISE EXCEPTION 'Post-check ACL fallido: authenticated tiene privilegios de escritura inesperados en public.%.', v_name
                USING ERRCODE = '42501';
        END IF;

        IF pg_catalog.has_table_privilege('anon', 'public.' || v_name, 'SELECT') THEN
            RAISE EXCEPTION 'Post-check ACL fallido: anon obtuvo SELECT inesperado en public.%.', v_name
                USING ERRCODE = '42501';
        END IF;
    END LOOP;

    SELECT pg_catalog.count(*)
      INTO v_view_count
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_catalog.pg_roles r ON c.relowner = r.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'v'
       AND c.relname = ANY(v_views)
       AND r.rolname = 'atelier_portal_reader'
       AND 'security_barrier=true' = ANY(c.reloptions)
       AND 'security_invoker=false' = ANY(c.reloptions);

    IF v_view_count <> 6 THEN
        RAISE EXCEPTION 'Post-check ACL fallido: alteración inesperada en propietario/reloptions de vistas v_portal_*.'
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*)
      INTO v_apr_policy_count
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND 'atelier_portal_reader' = ANY(roles);

    IF v_apr_policy_count <> 7 THEN
        RAISE EXCEPTION 'Post-check ACL fallido: conteo de políticas atelier_portal_reader alterado (%).', v_apr_policy_count
            USING ERRCODE = '42501';
    END IF;
END;
$$;

COMMIT;
