-- ==============================================================================
-- ATELIER DIGITAL — M09 P1.2: VISTA ADITIVA DE PROGRESO DE CONFECCIÓN M03
-- Archivo: supabase/migrations/20261126040000_m09_p1_v_portal_creation_progress.sql
-- ==============================================================================
-- Alcance estrictamente aditivo (M09 Bloque P1.2):
--   1. Conceder SELECT mínimo a nivel de columna (7 columnas whitelisted) sobre
--      public.atelier_projects al rol atelier_portal_reader.
--      Columnas EXCLUIDAS: quote_id, assigned_tailor, priority, notes, created_at.
--   2. Crear la política RLS aditiva apr_atelier_projects_select
--      (FOR SELECT TO atelier_portal_reader) siguiendo el patrón P3.2:
--      EXISTS sobre public.creations + public.get_portal_client_id()
--      + public.has_portal_permission('creations', 'view', creation_id)
--      + current_stage <> 'cancelled'.
--      CERO llamadas a public.portal_owns_creation(uuid).
--   3. Crear la vista aditiva public.v_portal_creation_progress con
--      security_barrier = true, security_invoker = false, OWNER atelier_portal_reader.
--   4. Conceder SELECT exclusivo a authenticated bajo SET LOCAL ROLE
--      atelier_portal_reader (requisito de grantor PostgreSQL 17, ref. 20261124120000)
--      y revocar todo privilegio a PUBLIC y anon.
--   5. No altera ninguna de las 6 vistas canónicas existentes, ni las 7 políticas
--      apr_* existentes, ni funciones/RPCs, ni tablas/datos históricos.
--
-- Nota operativa PG 17 (H-02 — Migración versionada de aplicación única):
--   Esta migración está diseñada para aplicarse una sola vez vía historial de
--   migraciones (supabase db push). Tras transferir la vista a OWNER
--   atelier_portal_reader (con postgres teniendo INHERIT FALSE, SET TRUE), una
--   re-ejecución manual directa de CREATE OR REPLACE VIEW como postgres fallará
--   por propiedad ("must be owner of view"). No emplea DROP VIEW destructivo;
--   cualquier evolución futura deberá publicarse como nueva migración versionada
--   ejecutando las alteraciones de vista bajo SET LOCAL ROLE atelier_portal_reader.
-- ==============================================================================

BEGIN;

-- Protección defensiva de concurrencia (patrón histórico 20261118000000)
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- ------------------------------------------------------------------------------
-- 1. PRE-CHECKS FAIL-CLOSED (PostgreSQL 17)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_rls_count INT;
    v_col_count INT;
    v_apr_policy_count INT;
    v_fn_oid OID;
BEGIN
    -- 1.1 Rol atelier_portal_reader íntegro (sin superuser, sin bypassrls, sin login)
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

    -- 1.2 RLS habilitado en tablas base involucradas
    SELECT pg_catalog.count(*) INTO v_rls_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('atelier_projects', 'creations', 'client_portal_access')
      AND c.relrowsecurity = true;

    IF v_rls_count <> 3 THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: RLS debe estar activo en atelier_projects, creations y client_portal_access (activos: %).', v_rls_count
            USING ERRCODE = '42501';
    END IF;

    -- 1.3 Verificación exacta de existencia y tipo de las 7 columnas aprobadas en public.atelier_projects
    SELECT pg_catalog.count(*) INTO v_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'atelier_projects'
      AND (
          (column_name = 'id' AND data_type = 'uuid')
          OR (column_name = 'creation_id' AND data_type = 'uuid')
          OR (column_name = 'project_number' AND data_type = 'text')
          OR (column_name = 'current_stage' AND data_type = 'text')
          OR (column_name = 'estimated_delivery_date' AND data_type = 'date')
          OR (column_name = 'actual_delivery_date' AND data_type = 'date')
          OR (column_name = 'updated_at' AND data_type = 'timestamp with time zone')
      );

    IF v_col_count <> 7 THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: el esquema de public.atelier_projects no coincide con las 7 columnas esperadas (coincidencias: %).', v_col_count
            USING ERRCODE = '42703';
    END IF;

    -- 1.4 Funciones de autorización vigentes accesibles para atelier_portal_reader y authenticated
    IF NOT pg_catalog.has_function_privilege('authenticated', 'public.get_portal_client_id()', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('atelier_portal_reader', 'public.get_portal_client_id()', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('authenticated', 'public.has_portal_permission(text, text, uuid)', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('atelier_portal_reader', 'public.has_portal_permission(text, text, uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: faltan privilegios EXECUTE sobre get_portal_client_id o has_portal_permission.'
            USING ERRCODE = '42501';
    END IF;

    -- 1.5 Privilegios base ya existentes de atelier_portal_reader sobre creations y client_portal_access
    IF NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.creations', 'id', 'SELECT')
       OR NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.creations', 'client_id', 'SELECT')
       OR NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.client_portal_access', 'client_id', 'SELECT')
       OR NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.client_portal_access', 'auth_user_id', 'SELECT')
       OR NOT pg_catalog.has_column_privilege('atelier_portal_reader', 'public.client_portal_access', 'status', 'SELECT') THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: atelier_portal_reader carece de columnas SELECT mínimas sobre creations o client_portal_access.'
            USING ERRCODE = '42501';
    END IF;

    -- 1.6 Cierre previo de portal_owns_creation(uuid) intacto (P3.2: authenticated, anon y PUBLIC)
    v_fn_oid := pg_catalog.to_regprocedure('public.portal_owns_creation(uuid)');
    IF v_fn_oid IS NOT NULL THEN
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
            RAISE EXCEPTION 'PRE-CHECK FALLIDO: PUBLIC posee EXECUTE sobre public.portal_owns_creation(uuid).'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 1.7 Política previa de gestión en atelier_projects y conteo base de 7 políticas apr_* (ref. 20261124120000 / 20261125120000)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'atelier_projects'
          AND policyname = 'designer_admin_manage_projects'
          AND cmd = 'ALL'
          AND roles = ARRAY['authenticated']::name[]
    ) THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: política designer_admin_manage_projects ausente en public.atelier_projects.'
            USING ERRCODE = '42704';
    END IF;

    SELECT pg_catalog.count(*) INTO v_apr_policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND 'atelier_portal_reader' = ANY(roles);

    IF v_apr_policy_count <> 7 THEN
        RAISE EXCEPTION 'PRE-CHECK FALLIDO: se esperaban exactamente 7 políticas previas TO atelier_portal_reader (encontradas: %).', v_apr_policy_count
            USING ERRCODE = '42501';
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. ACL MÍNIMA POR COLUMNA EN public.atelier_projects PARA atelier_portal_reader
--    (Excluye quote_id, assigned_tailor, priority, notes y created_at)
-- ------------------------------------------------------------------------------
REVOKE ALL ON TABLE public.atelier_projects FROM atelier_portal_reader;

GRANT SELECT (
    id,
    creation_id,
    project_number,
    current_stage,
    estimated_delivery_date,
    actual_delivery_date,
    updated_at
) ON public.atelier_projects TO atelier_portal_reader;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICA RLS ADITIVA FOR SELECT TO atelier_portal_reader (PATRÓN P3.2)
--    Sin uso de portal_owns_creation(uuid); vinculada a clienta + creations:view
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "apr_atelier_projects_select" ON public.atelier_projects;

CREATE POLICY "apr_atelier_projects_select"
    ON public.atelier_projects
    FOR SELECT
    TO atelier_portal_reader
    USING (
        EXISTS (
            SELECT 1
            FROM public.creations cr
            WHERE cr.id = atelier_projects.creation_id
              AND cr.client_id = public.get_portal_client_id()
        )
        AND current_stage <> 'cancelled'
        AND public.has_portal_permission('creations', 'view', creation_id)
    );

-- ------------------------------------------------------------------------------
-- 4. VISTA ADITIVA SECURITY BARRIER: public.v_portal_creation_progress
-- ------------------------------------------------------------------------------
-- Nota de diseño sobre múltiples registros históricos:
--   public.atelier_projects permite múltiples filas por creation_id si existieran
--   varias órdenes históricas no canceladas. La vista no aplica supresión arbitraria
--   de filas; expone únicamente los proyectos no cancelados de creaciones autorizadas
--   y delega el ordenamiento/selección presentacional al lector (updated_at DESC).
CREATE OR REPLACE VIEW public.v_portal_creation_progress
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    ap.id,
    ap.creation_id,
    ap.project_number,
    ap.current_stage,
    ap.estimated_delivery_date,
    ap.actual_delivery_date,
    ap.updated_at
FROM public.atelier_projects ap
JOIN public.creations cr ON ap.creation_id = cr.id
JOIN public.client_portal_access a ON cr.client_id = a.client_id
WHERE a.auth_user_id = auth.uid()
  AND a.status = 'active'
  AND cr.client_id = public.get_portal_client_id()
  AND ap.current_stage <> 'cancelled'
  AND public.has_portal_permission('creations', 'view', ap.creation_id);

COMMENT ON VIEW public.v_portal_creation_progress IS
    'M09 P1.2: Proyección SECURITY BARRIER de progreso de confección M03 (7 columnas seguras; sin assigned_tailor, priority, notes ni quote_id).';

-- Transferencia de propiedad a atelier_portal_reader (PG 17 exige CREATE transitorio)
GRANT CREATE ON SCHEMA public TO atelier_portal_reader;
ALTER VIEW public.v_portal_creation_progress OWNER TO atelier_portal_reader;
REVOKE CREATE ON SCHEMA public FROM atelier_portal_reader;

-- ------------------------------------------------------------------------------
-- 5. ACLs FINALES DE LA VISTA BAJO EL PROPIETARIO (PG 17 GRANTOR FIX, REF. 20261124120000)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE atelier_portal_reader;

REVOKE ALL ON public.v_portal_creation_progress FROM PUBLIC, anon;
GRANT SELECT ON public.v_portal_creation_progress TO authenticated;

RESET ROLE;

-- ------------------------------------------------------------------------------
-- 6. POST-CHECKS INTRA-TRANSACCIONALES (GARANTÍA ATÓMICA DE SEGURIDAD)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_view_oid OID;
    v_exposed_cols TEXT[];
    v_expected_cols CONSTANT TEXT[] := ARRAY[
        'id',
        'creation_id',
        'project_number',
        'current_stage',
        'estimated_delivery_date',
        'actual_delivery_date',
        'updated_at'
    ];
    v_excluded_cols CONSTANT TEXT[] := ARRAY[
        'quote_id',
        'assigned_tailor',
        'priority',
        'notes',
        'created_at'
    ];
    v_col TEXT;
    v_granted_cols TEXT[];
    v_policy_qual TEXT;
    v_apr_policy_count INT;
    v_existing_views CONSTANT TEXT[] := ARRAY[
        'v_portal_client_profile',
        'v_portal_creations',
        'v_portal_appointments',
        'v_portal_fitting_sessions',
        'v_portal_commercial_quotes',
        'v_portal_measurement_sessions'
    ];
    v_existing_view TEXT;
    v_existing_views_ok INT;
BEGIN
    -- 6.1 Verificar existencia, propietario y reloptions exactos de la nueva vista
    SELECT c.oid
      INTO v_view_oid
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_catalog.pg_roles r ON c.relowner = r.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'v'
       AND c.relname = 'v_portal_creation_progress'
       AND r.rolname = 'atelier_portal_reader'
       AND 'security_barrier=true' = ANY(c.reloptions)
       AND 'security_invoker=false' = ANY(c.reloptions);

    IF v_view_oid IS NULL THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: v_portal_creation_progress no cumple owner=atelier_portal_reader, security_barrier=true y security_invoker=false.'
            USING ERRCODE = '42501';
    END IF;

    -- 6.2 Verificar las 7 columnas exactas proyectadas por la vista
    SELECT pg_catalog.array_agg(a.attname::text ORDER BY a.attnum)
      INTO v_exposed_cols
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = v_view_oid
       AND a.attnum > 0
       AND NOT a.attisdropped;

    IF v_exposed_cols IS DISTINCT FROM v_expected_cols THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: columnas expuestas en v_portal_creation_progress no coinciden (%).', v_exposed_cols
            USING ERRCODE = '42501';
    END IF;

    -- 6.3 Verificar privilegios de la vista (authenticated solo SELECT; anon y PUBLIC sin acceso)
    IF NOT pg_catalog.has_table_privilege('authenticated', 'public.v_portal_creation_progress', 'SELECT') THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: authenticated no obtuvo SELECT en public.v_portal_creation_progress.'
            USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.has_table_privilege('authenticated', 'public.v_portal_creation_progress', 'INSERT')
       OR pg_catalog.has_table_privilege('authenticated', 'public.v_portal_creation_progress', 'UPDATE')
       OR pg_catalog.has_table_privilege('authenticated', 'public.v_portal_creation_progress', 'DELETE') THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: authenticated posee privilegios de escritura inesperados en v_portal_creation_progress.'
            USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.has_table_privilege('anon', 'public.v_portal_creation_progress', 'SELECT')
       OR pg_catalog.has_table_privilege('anon', 'public.v_portal_creation_progress', 'INSERT')
       OR pg_catalog.has_table_privilege('anon', 'public.v_portal_creation_progress', 'UPDATE')
       OR pg_catalog.has_table_privilege('anon', 'public.v_portal_creation_progress', 'DELETE') THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: anon posee privilegios inesperados sobre v_portal_creation_progress.'
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class c
        WHERE c.oid = v_view_oid
          AND EXISTS (
              SELECT 1
              FROM pg_catalog.aclexplode(COALESCE(c.relacl, ARRAY[]::aclitem[])) a
              WHERE a.grantee = 0::oid
          )
    ) THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: PUBLIC conserva privilegios sobre v_portal_creation_progress.'
            USING ERRCODE = '42501';
    END IF;

    -- 6.4 Verificar ACL por columna en public.atelier_projects para atelier_portal_reader:
    --     conteo exacto = 7 columnas y coincidencia exacta con el conjunto whitelisted (sin depender solo de lista negra)
    SELECT pg_catalog.array_agg(a.attname::text ORDER BY a.attname::text)
      INTO v_granted_cols
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = 'public.atelier_projects'::regclass
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND pg_catalog.has_column_privilege('atelier_portal_reader', 'public.atelier_projects', a.attname, 'SELECT');

    IF COALESCE(pg_catalog.array_length(v_granted_cols, 1), 0) <> 7
       OR v_granted_cols IS DISTINCT FROM (
           SELECT pg_catalog.array_agg(col ORDER BY col)
           FROM pg_catalog.unnest(v_expected_cols) AS col
       ) THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: atelier_portal_reader no tiene SELECT exactamente sobre las 7 columnas aprobadas de atelier_projects (concedidas: %).', v_granted_cols
            USING ERRCODE = '42501';
    END IF;

    FOREACH v_col IN ARRAY v_excluded_cols LOOP
        IF pg_catalog.has_column_privilege('atelier_portal_reader', 'public.atelier_projects', v_col, 'SELECT') THEN
            RAISE EXCEPTION 'POST-CHECK FALLIDO: atelier_portal_reader tiene SELECT indebido en columna interna atelier_projects.%.', v_col
                USING ERRCODE = '42501';
        END IF;
    END LOOP;

    IF pg_catalog.has_table_privilege('atelier_portal_reader', 'public.atelier_projects', 'INSERT')
       OR pg_catalog.has_table_privilege('atelier_portal_reader', 'public.atelier_projects', 'UPDATE')
       OR pg_catalog.has_table_privilege('atelier_portal_reader', 'public.atelier_projects', 'DELETE') THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: atelier_portal_reader tiene privilegios de escritura sobre public.atelier_projects.'
            USING ERRCODE = '42501';
    END IF;

    -- 6.5 Verificar que atelier_portal_reader no retenga CREATE en schema public
    IF pg_catalog.has_schema_privilege('atelier_portal_reader', 'public', 'CREATE') THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: atelier_portal_reader retuvo CREATE sobre schema public.'
            USING ERRCODE = '42501';
    END IF;

    -- 6.6 Verificar firma completa de apr_atelier_projects_select, preservación de designer_admin_manage_projects y conteo exacto (8) de políticas apr_*
    SELECT qual
      INTO v_policy_qual
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'atelier_projects'
       AND policyname = 'apr_atelier_projects_select'
       AND permissive = 'PERMISSIVE'
       AND cmd = 'SELECT'
       AND roles = ARRAY['atelier_portal_reader']::name[]
       AND with_check IS NULL;

    IF v_policy_qual IS NULL THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: política apr_atelier_projects_select no coincide con la firma esperada (PERMISSIVE, SELECT, TO atelier_portal_reader, WITH CHECK NULL).'
            USING ERRCODE = '42704';
    END IF;

    IF v_policy_qual ILIKE '%portal_owns_creation%' THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: apr_atelier_projects_select referencia portal_owns_creation.'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'atelier_projects'
          AND policyname = 'designer_admin_manage_projects'
          AND cmd = 'ALL'
          AND roles = ARRAY['authenticated']::name[]
    ) THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: política designer_admin_manage_projects alterada o ausente en public.atelier_projects.'
            USING ERRCODE = '42704';
    END IF;

    SELECT pg_catalog.count(*) INTO v_apr_policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND 'atelier_portal_reader' = ANY(roles);

    IF v_apr_policy_count <> 8 THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: se esperaban exactamente 8 políticas TO atelier_portal_reader (7 previas + 1 nueva; encontradas: %).', v_apr_policy_count
            USING ERRCODE = '42501';
    END IF;

    -- 6.7 Verificar invariancia de las 6 vistas canónicas previas (owner, reloptions y privilegios SELECT authenticated / sin anon)
    SELECT pg_catalog.count(*)
      INTO v_existing_views_ok
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_catalog.pg_roles r ON c.relowner = r.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'v'
       AND c.relname = ANY(v_existing_views)
       AND r.rolname = 'atelier_portal_reader'
       AND 'security_barrier=true' = ANY(c.reloptions)
       AND 'security_invoker=false' = ANY(c.reloptions);

    IF v_existing_views_ok <> 6 THEN
        RAISE EXCEPTION 'POST-CHECK FALLIDO: alteración inesperada en las 6 vistas v_portal_* previas (intactas: %).', v_existing_views_ok
            USING ERRCODE = '42501';
    END IF;

    FOREACH v_existing_view IN ARRAY v_existing_views LOOP
        IF NOT pg_catalog.has_table_privilege('authenticated', 'public.' || v_existing_view, 'SELECT') THEN
            RAISE EXCEPTION 'POST-CHECK FALLIDO: authenticated perdió SELECT en vista previa public.%.', v_existing_view
                USING ERRCODE = '42501';
        END IF;

        IF pg_catalog.has_table_privilege('anon', 'public.' || v_existing_view, 'SELECT') THEN
            RAISE EXCEPTION 'POST-CHECK FALLIDO: anon obtuvo SELECT inesperado en vista previa public.%.', v_existing_view
                USING ERRCODE = '42501';
        END IF;
    END LOOP;
END;
$$;

COMMIT;
