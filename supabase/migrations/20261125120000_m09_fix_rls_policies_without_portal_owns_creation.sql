-- ==============================================================================
-- ATELIER DIGITAL — REMEDIACIÓN DEFINITIVA D1.5 / P3.2 (2 POLÍTICAS RLS M09)
-- Archivo: supabase/migrations/20261125120000_m09_fix_rls_policies_without_portal_owns_creation.sql
-- ==============================================================================
-- Aplicada en Supabase Production (trgoqqvsprknswobvniu) durante el cierre de
-- D1.5 / P3.2 (2026-11-25) y preservada en el repositorio para paridad SQL.
-- Alcance exclusivo:
--   1. Reemplazar public.portal_owns_creation(creation_id) en
--      apr_atelier_fitting_sessions_select (public.atelier_fitting_sessions)
--      y apr_commercial_quotes_select (public.commercial_quotes) por un
--      predicado inline EXISTS sobre public.creations + public.get_portal_client_id().
--   2. Preservar todos los filtros de negocio (status, client_visibility,
--      has_portal_permission) y mantener public.portal_owns_creation(uuid)
--      cerrada para authenticated, anon y PUBLIC.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PRE-CHECKS FAIL-CLOSED (PostgreSQL 17)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_target_count INT;
    v_rls_count INT;
    v_apr_policy_count INT;
    v_fn_oid OID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_roles
        WHERE rolname = 'atelier_portal_reader'
          AND rolsuper = false
          AND rolbypassrls = false
          AND rolcanlogin = false
    ) THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: rol atelier_portal_reader ausente o con atributos inesperados.'
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*) INTO v_rls_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('atelier_fitting_sessions', 'commercial_quotes', 'creations')
      AND c.relrowsecurity = true;

    IF v_rls_count <> 3 THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: RLS debe estar activo en atelier_fitting_sessions, commercial_quotes y creations (activos: %).', v_rls_count
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*) INTO v_apr_policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND 'atelier_portal_reader' = ANY(roles);

    IF v_apr_policy_count <> 7 THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: se esperaban exactamente 7 políticas TO atelier_portal_reader (encontradas: %).', v_apr_policy_count
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*) INTO v_target_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND (
          (tablename = 'atelier_fitting_sessions' AND policyname = 'apr_atelier_fitting_sessions_select')
          OR (tablename = 'commercial_quotes' AND policyname = 'apr_commercial_quotes_select')
      )
      AND permissive = 'PERMISSIVE'
      AND cmd = 'SELECT'
      AND roles = ARRAY['atelier_portal_reader']::name[]
      AND with_check IS NULL;

    IF v_target_count <> 2 THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: las 2 políticas objetivo no coinciden con la firma esperada (encontradas: %).', v_target_count
            USING ERRCODE = '42704';
    END IF;

    v_fn_oid := pg_catalog.to_regprocedure('public.portal_owns_creation(uuid)');
    IF v_fn_oid IS NULL THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: función public.portal_owns_creation(uuid) no encontrada.'
            USING ERRCODE = '42883';
    END IF;

    IF pg_catalog.has_function_privilege('authenticated', v_fn_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('anon', v_fn_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: authenticated o anon poseen EXECUTE sobre public.portal_owns_creation(uuid).'
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc p
        WHERE p.oid = v_fn_oid
          AND (
              p.proacl IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM pg_catalog.aclexplode(p.proacl) a
                  WHERE a.grantee = 0::oid
                    AND a.privilege_type = 'EXECUTE'
              )
          )
    ) THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: PUBLIC posee EXECUTE (explícito o por ACL por defecto) sobre public.portal_owns_creation(uuid).'
            USING ERRCODE = '42501';
    END IF;

    IF NOT pg_catalog.has_function_privilege('authenticated', 'public.get_portal_client_id()', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('atelier_portal_reader', 'public.get_portal_client_id()', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('authenticated', 'public.has_portal_permission(text, text, uuid)', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('atelier_portal_reader', 'public.has_portal_permission(text, text, uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: faltan privilegios EXECUTE sobre get_portal_client_id o has_portal_permission.'
            USING ERRCODE = '42501';
    END IF;

    IF NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.creations', 'id', 'SELECT')
       OR NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.creations', 'client_id', 'SELECT') THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: atelier_portal_reader carece de SELECT(id, client_id) sobre public.creations.'
            USING ERRCODE = '42501';
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. REMEDIACIÓN ATÓMICA MEDIANTE ALTER POLICY (solo USING; filtros preservados)
-- ------------------------------------------------------------------------------
ALTER POLICY "apr_atelier_fitting_sessions_select"
    ON public.atelier_fitting_sessions
    USING (
        EXISTS (
            SELECT 1
            FROM public.creations cr
            WHERE cr.id = atelier_fitting_sessions.creation_id
              AND cr.client_id = public.get_portal_client_id()
        )
        AND status NOT IN ('cancelled')
        AND client_visibility = 'summary_ready'
        AND public.has_portal_permission('creations', 'view', creation_id)
        AND public.has_portal_permission('fittings', 'view', creation_id)
    );

ALTER POLICY "apr_commercial_quotes_select"
    ON public.commercial_quotes
    USING (
        EXISTS (
            SELECT 1
            FROM public.creations cr
            WHERE cr.id = commercial_quotes.creation_id
              AND cr.client_id = public.get_portal_client_id()
        )
        AND status IN ('sent', 'accepted', 'expired')
        AND public.has_portal_permission('creations', 'view', creation_id)
        AND public.has_portal_permission('quotations', 'view', creation_id)
    );

-- ------------------------------------------------------------------------------
-- 3. POST-CHECKS ESTRICTOS (PostgreSQL 17; revierten todo ante cualquier fallo)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_apr_policy_count INT;
    v_view_count INT;
    v_fit_qual TEXT;
    v_quote_qual TEXT;
    v_fn_oid OID;
BEGIN
    SELECT pg_catalog.count(*) INTO v_apr_policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND 'atelier_portal_reader' = ANY(roles);

    IF v_apr_policy_count <> 7 THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: se esperaban exactamente 7 políticas TO atelier_portal_reader (encontradas: %).', v_apr_policy_count
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND 'atelier_portal_reader' = ANY(roles)
          AND pg_catalog.lower(pg_catalog.btrim(qual)) = 'true'
    ) THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: detectada política insegura USING (true) para atelier_portal_reader.'
            USING ERRCODE = '42501';
    END IF;

    SELECT qual INTO v_fit_qual
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'atelier_fitting_sessions'
      AND policyname = 'apr_atelier_fitting_sessions_select'
      AND permissive = 'PERMISSIVE'
      AND cmd = 'SELECT'
      AND roles = ARRAY['atelier_portal_reader']::name[]
      AND with_check IS NULL;

    IF v_fit_qual IS NULL
       OR v_fit_qual ILIKE '%portal_owns_creation%'
       OR v_fit_qual NOT ILIKE '%exists%'
       OR v_fit_qual NOT ILIKE '%get_portal_client_id%'
       OR v_fit_qual NOT ILIKE '%has_portal_permission%'
       OR v_fit_qual NOT ILIKE '%summary_ready%'
       OR v_fit_qual NOT ILIKE '%cancelled%'
       OR v_fit_qual NOT ILIKE '%fittings%'
       OR v_fit_qual NOT ILIKE '%creations%' THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: apr_atelier_fitting_sessions_select no cumple la definición esperada.'
            USING ERRCODE = '42501';
    END IF;

    SELECT qual INTO v_quote_qual
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'commercial_quotes'
      AND policyname = 'apr_commercial_quotes_select'
      AND permissive = 'PERMISSIVE'
      AND cmd = 'SELECT'
      AND roles = ARRAY['atelier_portal_reader']::name[]
      AND with_check IS NULL;

    IF v_quote_qual IS NULL
       OR v_quote_qual ILIKE '%portal_owns_creation%'
       OR v_quote_qual NOT ILIKE '%exists%'
       OR v_quote_qual NOT ILIKE '%get_portal_client_id%'
       OR v_quote_qual NOT ILIKE '%has_portal_permission%'
       OR v_quote_qual NOT ILIKE '%sent%'
       OR v_quote_qual NOT ILIKE '%accepted%'
       OR v_quote_qual NOT ILIKE '%expired%'
       OR v_quote_qual NOT ILIKE '%quotations%'
       OR v_quote_qual NOT ILIKE '%creations%' THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: apr_commercial_quotes_select no cumple la definición esperada.'
            USING ERRCODE = '42501';
    END IF;

    v_fn_oid := pg_catalog.to_regprocedure('public.portal_owns_creation(uuid)');
    IF v_fn_oid IS NULL
       OR pg_catalog.has_function_privilege('authenticated', v_fn_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('anon', v_fn_oid, 'EXECUTE')
       OR EXISTS (
           SELECT 1
           FROM pg_catalog.pg_proc p
           WHERE p.oid = v_fn_oid
             AND (
                 p.proacl IS NULL
                 OR EXISTS (
                     SELECT 1
                     FROM pg_catalog.aclexplode(p.proacl) a
                     WHERE a.grantee = 0::oid
                       AND a.privilege_type = 'EXECUTE'
                 )
             )
       ) THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: public.portal_owns_creation(uuid) fue expuesta indebidamente.'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_roles
        WHERE rolname = 'atelier_portal_reader'
          AND rolsuper = false
          AND rolbypassrls = false
          AND rolcanlogin = false
    ) THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: atributos de atelier_portal_reader alterados.'
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*) INTO v_view_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_catalog.pg_roles r ON c.relowner = r.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND c.relname LIKE 'v_portal_%'
      AND r.rolname = 'atelier_portal_reader'
      AND 'security_barrier=true' = ANY(c.reloptions)
      AND 'security_invoker=false' = ANY(c.reloptions);

    IF v_view_count <> 6 THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: las 6 vistas v_portal_* fueron alteradas (encontradas: %).', v_view_count
            USING ERRCODE = '42501';
    END IF;

    RAISE NOTICE 'REMEDIACION P3.2 OK: 2 políticas actualizadas, 7 apr_* válidas, portal_owns_creation cerrada (authenticated/anon/PUBLIC) y 6 vistas intactas.';
END;
$$;

COMMIT;
