-- ==============================================================================
-- ATELIER DIGITAL · BY KATHERINE CARROLL
-- ENTREGA E1 (PROPUESTA NO EJECUTADA): MIGRACIÓN SQL CANÓNICA MÓDULO 09-A v2.11
-- Archivo: supabase/migrations/20261118000000_client_portal_m09.sql
-- ==============================================================================
-- ESTADO ACTUAL:
--   - E1 NO EJECUTADA · 0/5 entregas implementadas · 0/13 hallazgos remediados.
--   - VEREDICTO VIGENTE DE DESPLIEGUE: NO APTO PARA DESPLIEGUE.
--   - Controles de verificabilidad (security_barrier anti side-channel, guarda
--     SET LOCAL bajo PostgREST/PgBouncer, e identificación IP en gateway):
--     ESTADO = NO VERIFICADOS (requieren sonda empírica real en Staging PG 17.11).
--
-- INMUTABILIDAD Y SEGURIDAD:
--   - Cero modificaciones a tablas, índices o políticas existentes M00–M08 y C15.
--   - Cero BYPASSRLS, cero políticas USING (true) y cero uso de deleteUser.
--   - Cero GRANT INSERT directo a authenticated/anon en client_portal_activity_log.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PROTECCIÓN DE CONCURRENCIA EN PRODUCCIÓN (FAIL-CLOSED):
-- Si alguna tabla existente no puede adquirir bloqueo en 5s, aborta de inmediato.
-- ==============================================================================
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- ==============================================================================
-- FASE 0: PREFLIGHT DE SOLO LECTURA (M00–M08, INDICE PARCIAL M08, C15, LEY 1581)
-- ==============================================================================
DO $$
DECLARE
    v_missing TEXT := '';
    v_func_secdef BOOLEAN;
    v_func_returns_bool BOOLEAN;
    v_func_nargs INT;
    v_func_safe_path BOOLEAN;
    v_func_owner TEXT;
BEGIN
    RAISE NOTICE '>>> [M09-A v2.11 PREFLIGHT] Iniciando verificación de catálogo M00–M08 (solo lectura)...';

    -- 0.1 public.clients (M01)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.clients no existe.' USING ERRCODE = '42P01';
    END IF;

    SELECT pg_catalog.string_agg(col, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['id', 'full_name', 'email', 'phone', 'city', 'style_preferences', 'photo_url', 'status']) AS col
        EXCEPT
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients'
    ) m;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas faltantes en public.clients: %', v_missing USING ERRCODE = '42703';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'id' AND udt_name = 'uuid') THEN
        RAISE EXCEPTION 'Preflight fallido: public.clients.id debe ser UUID.' USING ERRCODE = '42804';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM unnest(ARRAY['full_name', 'email', 'phone', 'city', 'style_preferences', 'photo_url', 'status']) AS req_col
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = req_col AND udt_name = 'text'
        )
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas textuales proyectadas de public.clients deben ser TEXT.' USING ERRCODE = '42804';
    END IF;

    -- 0.2 public.creations (M01) + FK + Índice total
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creations') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.creations no existe.' USING ERRCODE = '42P01';
    END IF;

    SELECT pg_catalog.string_agg(col, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['id', 'client_id', 'name', 'description', 'creation_type', 'status', 'occasion', 'garment_type', 'target_date', 'created_at']) AS col
        EXCEPT
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creations'
    ) m;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas faltantes en public.creations: %', v_missing USING ERRCODE = '42703';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creations' AND column_name = 'id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creations' AND column_name = 'client_id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creations' AND column_name = 'target_date' AND udt_name = 'date')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creations' AND column_name = 'created_at' AND udt_name = 'timestamptz')
       OR EXISTS (
           SELECT 1 FROM unnest(ARRAY['name', 'description', 'creation_type', 'status', 'occasion', 'garment_type']) AS req_col
           WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'creations' AND column_name = req_col AND udt_name = 'text'
           )
       ) THEN
        RAISE EXCEPTION 'Preflight fallido: Tipos incompatibles en public.creations.' USING ERRCODE = '42804';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class cl_src ON c.conrelid = cl_src.oid
        JOIN pg_namespace ns_src ON cl_src.relnamespace = ns_src.oid
        JOIN pg_attribute att_src ON att_src.attrelid = cl_src.oid AND att_src.attnum = c.conkey[1]
        JOIN pg_class cl_dst ON c.confrelid = cl_dst.oid
        JOIN pg_namespace ns_dst ON cl_dst.relnamespace = ns_dst.oid
        JOIN pg_attribute att_dst ON att_dst.attrelid = cl_dst.oid AND att_dst.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.convalidated = true
          AND pg_catalog.array_length(c.conkey, 1) = 1 AND pg_catalog.array_length(c.confkey, 1) = 1
          AND ns_src.nspname = 'public' AND cl_src.relname = 'creations' AND att_src.attname = 'client_id'
          AND ns_dst.nspname = 'public' AND cl_dst.relname = 'clients' AND att_dst.attname = 'id'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: FK public.creations(client_id) -> public.clients(id) ausente o no validada.' USING ERRCODE = '42704';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_index ix
        JOIN pg_class c ON ix.indrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ix.indkey[0]
        WHERE n.nspname = 'public' AND c.relname = 'creations' AND a.attname = 'client_id'
          AND ix.indnkeyatts >= 1 AND ix.indisvalid AND ix.indisready AND ix.indislive
          AND ix.indpred IS NULL AND ix.indexprs IS NULL
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: Índice total requerido sobre public.creations(client_id) no encontrado.' USING ERRCODE = '42704';
    END IF;

    -- 0.3 public.atelier_appointments (M08) + Regla C-02 para índice parcial idx_atelier_appointments_client
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'atelier_appointments') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.atelier_appointments (M08) no existe.' USING ERRCODE = '42P01';
    END IF;

    SELECT pg_catalog.string_agg(col, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['id', 'client_id', 'appointment_type', 'status', 'starts_at', 'ends_at', 'location_space', 'preparation_notes', 'client_visibility']) AS col
        EXCEPT
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_appointments'
    ) m;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas faltantes en public.atelier_appointments: %', v_missing USING ERRCODE = '42703';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_appointments' AND column_name = 'id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_appointments' AND column_name = 'client_id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_appointments' AND column_name = 'starts_at' AND udt_name = 'timestamptz')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_appointments' AND column_name = 'ends_at' AND udt_name = 'timestamptz')
       OR EXISTS (
           SELECT 1 FROM unnest(ARRAY['appointment_type', 'status', 'location_space', 'preparation_notes', 'client_visibility']) AS req_col
           WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'atelier_appointments' AND column_name = req_col AND udt_name = 'text'
           )
       ) THEN
        RAISE EXCEPTION 'Preflight fallido: Tipos incompatibles en public.atelier_appointments.' USING ERRCODE = '42804';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class cl_src ON c.conrelid = cl_src.oid
        JOIN pg_namespace ns_src ON cl_src.relnamespace = ns_src.oid
        JOIN pg_attribute att_src ON att_src.attrelid = cl_src.oid AND att_src.attnum = c.conkey[1]
        JOIN pg_class cl_dst ON c.confrelid = cl_dst.oid
        JOIN pg_namespace ns_dst ON cl_dst.relnamespace = ns_dst.oid
        JOIN pg_attribute att_dst ON att_dst.attrelid = cl_dst.oid AND att_dst.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.convalidated = true
          AND pg_catalog.array_length(c.conkey, 1) = 1 AND pg_catalog.array_length(c.confkey, 1) = 1
          AND ns_src.nspname = 'public' AND cl_src.relname = 'atelier_appointments' AND att_src.attname = 'client_id'
          AND ns_dst.nspname = 'public' AND cl_dst.relname = 'clients' AND att_dst.attname = 'id'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: FK public.atelier_appointments(client_id) -> public.clients(id) ausente o no validada.' USING ERRCODE = '42704';
    END IF;

    -- Corrección C-02: acepta índice total (indpred IS NULL) o índice parcial exacto M08 (WHERE client_id IS NOT NULL)
    IF NOT EXISTS (
        SELECT 1 FROM pg_index ix
        JOIN pg_class c ON ix.indrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ix.indkey[0]
        WHERE n.nspname = 'public' AND c.relname = 'atelier_appointments' AND a.attname = 'client_id'
          AND ix.indnkeyatts >= 1 AND ix.indisvalid AND ix.indisready AND ix.indislive
          AND ix.indexprs IS NULL
          AND (
              ix.indpred IS NULL
              OR pg_catalog.btrim(
                  pg_catalog.lower(
                      pg_catalog.regexp_replace(
                          pg_catalog.pg_get_expr(ix.indpred, ix.indrelid),
                          '[\s()]+', ' ', 'g'
                      )
                  )
              ) = 'client_id is not null'
          )
    ) THEN
        RAISE EXCEPTION 'Preflight fallido (C-02): No existe índice compatible sobre public.atelier_appointments(client_id) ni predicado parcial equivalente WHERE client_id IS NOT NULL.' USING ERRCODE = '42704';
    END IF;

    -- 0.4 public.atelier_fitting_sessions (M06) + client_visibility (A-02)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.atelier_fitting_sessions (M06) no existe.' USING ERRCODE = '42P01';
    END IF;

    SELECT pg_catalog.string_agg(col, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['id', 'creation_id', 'session_number', 'round_type', 'title', 'status', 'scheduled_at', 'conducted_at', 'location_note', 'client_visibility']) AS col
        EXCEPT
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions'
    ) m;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas faltantes en public.atelier_fitting_sessions: %', v_missing USING ERRCODE = '42703';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions' AND column_name = 'id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions' AND column_name = 'creation_id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions' AND column_name = 'session_number' AND udt_name = 'int4')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions' AND column_name = 'scheduled_at' AND udt_name = 'timestamptz')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions' AND column_name = 'conducted_at' AND udt_name = 'timestamptz')
       OR EXISTS (
           SELECT 1 FROM unnest(ARRAY['round_type', 'title', 'status', 'location_note', 'client_visibility']) AS req_col
           WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'atelier_fitting_sessions' AND column_name = req_col AND udt_name = 'text'
           )
       ) THEN
        RAISE EXCEPTION 'Preflight fallido: Tipos incompatibles en public.atelier_fitting_sessions.' USING ERRCODE = '42804';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class cl_src ON c.conrelid = cl_src.oid
        JOIN pg_namespace ns_src ON cl_src.relnamespace = ns_src.oid
        JOIN pg_attribute att_src ON att_src.attrelid = cl_src.oid AND att_src.attnum = c.conkey[1]
        JOIN pg_class cl_dst ON c.confrelid = cl_dst.oid
        JOIN pg_namespace ns_dst ON cl_dst.relnamespace = ns_dst.oid
        JOIN pg_attribute att_dst ON att_dst.attrelid = cl_dst.oid AND att_dst.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.convalidated = true
          AND pg_catalog.array_length(c.conkey, 1) = 1 AND pg_catalog.array_length(c.confkey, 1) = 1
          AND ns_src.nspname = 'public' AND cl_src.relname = 'atelier_fitting_sessions' AND att_src.attname = 'creation_id'
          AND ns_dst.nspname = 'public' AND cl_dst.relname = 'creations' AND att_dst.attname = 'id'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: FK public.atelier_fitting_sessions(creation_id) -> public.creations(id) ausente o no validada.' USING ERRCODE = '42704';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_index ix
        JOIN pg_class c ON ix.indrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ix.indkey[0]
        WHERE n.nspname = 'public' AND c.relname = 'atelier_fitting_sessions' AND a.attname = 'creation_id'
          AND ix.indnkeyatts >= 1 AND ix.indisvalid AND ix.indisready AND ix.indislive
          AND ix.indpred IS NULL AND ix.indexprs IS NULL
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: Índice total requerido sobre public.atelier_fitting_sessions(creation_id) no encontrado.' USING ERRCODE = '42704';
    END IF;

    -- 0.5 public.commercial_quotes (M03)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'commercial_quotes') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.commercial_quotes (M03) no existe.' USING ERRCODE = '42P01';
    END IF;

    SELECT pg_catalog.string_agg(col, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['id', 'creation_id', 'quote_number', 'currency', 'total_price', 'payment_instructions', 'valid_until', 'status', 'accepted_at']) AS col
        EXCEPT
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commercial_quotes'
    ) m;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas faltantes en public.commercial_quotes: %', v_missing USING ERRCODE = '42703';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commercial_quotes' AND column_name = 'id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commercial_quotes' AND column_name = 'creation_id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commercial_quotes' AND column_name = 'total_price' AND udt_name = 'numeric')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commercial_quotes' AND column_name = 'valid_until' AND udt_name = 'date')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'commercial_quotes' AND column_name = 'accepted_at' AND udt_name = 'timestamptz')
       OR EXISTS (
           SELECT 1 FROM unnest(ARRAY['quote_number', 'currency', 'payment_instructions', 'status']) AS req_col
           WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'commercial_quotes' AND column_name = req_col AND udt_name = 'text'
           )
       ) THEN
        RAISE EXCEPTION 'Preflight fallido: Tipos incompatibles en public.commercial_quotes.' USING ERRCODE = '42804';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class cl_src ON c.conrelid = cl_src.oid
        JOIN pg_namespace ns_src ON cl_src.relnamespace = ns_src.oid
        JOIN pg_attribute att_src ON att_src.attrelid = cl_src.oid AND att_src.attnum = c.conkey[1]
        JOIN pg_class cl_dst ON c.confrelid = cl_dst.oid
        JOIN pg_namespace ns_dst ON cl_dst.relnamespace = ns_dst.oid
        JOIN pg_attribute att_dst ON att_dst.attrelid = cl_dst.oid AND att_dst.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.convalidated = true
          AND pg_catalog.array_length(c.conkey, 1) = 1 AND pg_catalog.array_length(c.confkey, 1) = 1
          AND ns_src.nspname = 'public' AND cl_src.relname = 'commercial_quotes' AND att_src.attname = 'creation_id'
          AND ns_dst.nspname = 'public' AND cl_dst.relname = 'creations' AND att_dst.attname = 'id'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: FK public.commercial_quotes(creation_id) -> public.creations(id) ausente o no validada.' USING ERRCODE = '42704';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_index ix
        JOIN pg_class c ON ix.indrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ix.indkey[0]
        WHERE n.nspname = 'public' AND c.relname = 'commercial_quotes' AND a.attname = 'creation_id'
          AND ix.indnkeyatts >= 1 AND ix.indisvalid AND ix.indisready AND ix.indislive
          AND ix.indpred IS NULL AND ix.indexprs IS NULL
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: Índice total requerido sobre public.commercial_quotes(creation_id) no encontrado.' USING ERRCODE = '42704';
    END IF;

    -- 0.6 public.measurement_sessions (M02)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'measurement_sessions') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.measurement_sessions (M02) no existe.' USING ERRCODE = '42P01';
    END IF;

    SELECT pg_catalog.string_agg(col, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['id', 'client_id', 'session_date', 'status', 'unit_system', 'version_number']) AS col
        EXCEPT
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'measurement_sessions'
    ) m;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Columnas faltantes en public.measurement_sessions: %', v_missing USING ERRCODE = '42703';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'measurement_sessions' AND column_name = 'id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'measurement_sessions' AND column_name = 'client_id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'measurement_sessions' AND column_name = 'session_date' AND udt_name = 'date')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'measurement_sessions' AND column_name = 'version_number' AND udt_name = 'int4')
       OR EXISTS (
           SELECT 1 FROM unnest(ARRAY['status', 'unit_system']) AS req_col
           WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'measurement_sessions' AND column_name = req_col AND udt_name = 'text'
           )
       ) THEN
        RAISE EXCEPTION 'Preflight fallido: Tipos incompatibles en public.measurement_sessions.' USING ERRCODE = '42804';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class cl_src ON c.conrelid = cl_src.oid
        JOIN pg_namespace ns_src ON cl_src.relnamespace = ns_src.oid
        JOIN pg_attribute att_src ON att_src.attrelid = cl_src.oid AND att_src.attnum = c.conkey[1]
        JOIN pg_class cl_dst ON c.confrelid = cl_dst.oid
        JOIN pg_namespace ns_dst ON cl_dst.relnamespace = ns_dst.oid
        JOIN pg_attribute att_dst ON att_dst.attrelid = cl_dst.oid AND att_dst.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.convalidated = true
          AND pg_catalog.array_length(c.conkey, 1) = 1 AND pg_catalog.array_length(c.confkey, 1) = 1
          AND ns_src.nspname = 'public' AND cl_src.relname = 'measurement_sessions' AND att_src.attname = 'client_id'
          AND ns_dst.nspname = 'public' AND cl_dst.relname = 'clients' AND att_dst.attname = 'id'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: FK public.measurement_sessions(client_id) -> public.clients(id) ausente o no validada.' USING ERRCODE = '42704';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_index ix
        JOIN pg_class c ON ix.indrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ix.indkey[0]
        WHERE n.nspname = 'public' AND c.relname = 'measurement_sessions' AND a.attname = 'client_id'
          AND ix.indnkeyatts >= 1 AND ix.indisvalid AND ix.indisready AND ix.indislive
          AND ix.indpred IS NULL AND ix.indexprs IS NULL
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: Índice total requerido sobre public.measurement_sessions(client_id) no encontrado.' USING ERRCODE = '42704';
    END IF;

    -- 0.7 public.profiles (M00) y public.user_legal_consents (Ley 1581 · C-04)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'Preflight fallido: Tabla public.profiles no existe.' USING ERRCODE = '42P01';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name' AND udt_name = 'text')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role' AND udt_name = 'text')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email' AND udt_name = 'text') THEN
        RAISE EXCEPTION 'Preflight fallido (C-04): Columnas requeridas en public.profiles (id, full_name, role, email) ausentes o incompatibles.' USING ERRCODE = '42804';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_legal_consents') THEN
        RAISE EXCEPTION 'Preflight fallido (C-04): Tabla public.user_legal_consents (Ley 1581) no existe.' USING ERRCODE = '42P01';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_legal_consents' AND column_name = 'user_id' AND udt_name = 'uuid')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_legal_consents' AND column_name = 'accepted_at' AND udt_name = 'timestamptz')
       OR EXISTS (
           SELECT 1 FROM unnest(ARRAY['consent_type', 'document_version', 'status', 'ip_address', 'user_agent']) AS req_col
           WHERE NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'user_legal_consents' AND column_name = req_col AND udt_name = 'text'
           )
       ) THEN
        RAISE EXCEPTION 'Preflight fallido (C-04): Esquema incompatible en public.user_legal_consents.' USING ERRCODE = '42804';
    END IF;

    -- 0.8 Helper fundamental public.is_admin_or_designer() (sin sobrecargas ambiguas)
    IF (
        SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'is_admin_or_designer'
    ) > 1 THEN
        RAISE EXCEPTION 'Preflight fallido: Sobrecarga inesperada en public.is_admin_or_designer().' USING ERRCODE = '42725';
    END IF;

    SELECT p.prosecdef, (p.prorettype = 'bool'::regtype::oid), p.pronargs,
           (
               p.proconfig IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM unnest(p.proconfig) cfg
                   WHERE pg_catalog.split_part(cfg, '=', 1) = 'search_path'
               )
               AND NOT EXISTS (
                   SELECT 1 FROM unnest(p.proconfig) cfg
                   WHERE pg_catalog.split_part(cfg, '=', 1) = 'search_path'
                     AND pg_catalog.substr(cfg, 13) NOT IN ('', '""', 'pg_catalog')
               )
           ),
           pg_catalog.pg_get_userbyid(p.proowner)
    INTO v_func_secdef, v_func_returns_bool, v_func_nargs, v_func_safe_path, v_func_owner
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin_or_designer'
      AND p.pronargs = 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Preflight fallido: Helper public.is_admin_or_designer() no existe.' USING ERRCODE = '42883';
    END IF;
    IF v_func_owner NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Preflight fallido: Propietario inválido en is_admin_or_designer(): %', v_func_owner USING ERRCODE = '42501';
    END IF;
    IF v_func_nargs <> 0 OR NOT v_func_returns_bool OR NOT v_func_secdef OR NOT v_func_safe_path THEN
        RAISE EXCEPTION 'Preflight fallido: Firma, SECURITY DEFINER o search_path inválido en is_admin_or_designer().' USING ERRCODE = '42P17';
    END IF;
    IF NOT pg_catalog.has_function_privilege('authenticated', 'public.is_admin_or_designer()', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('service_role', 'public.is_admin_or_designer()', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('postgres', 'public.is_admin_or_designer()', 'EXECUTE') THEN
        RAISE EXCEPTION 'Preflight fallido: ACL incompleta en is_admin_or_designer().' USING ERRCODE = '42501';
    END IF;

    -- 0.9 Roles del sistema y gen_random_uuid()
    SELECT pg_catalog.string_agg(r, ', ') INTO v_missing
    FROM (
        SELECT unnest(ARRAY['postgres', 'authenticated', 'anon', 'service_role']) AS r
        EXCEPT
        SELECT rolname FROM pg_roles
    ) rm;
    IF v_missing IS NOT NULL AND v_missing <> '' THEN
        RAISE EXCEPTION 'Preflight fallido: Roles de sistema faltantes: %', v_missing USING ERRCODE = '42704';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('pg_catalog', 'public', 'extensions')
          AND p.proname = 'gen_random_uuid'
          AND p.pronargs = 0
          AND p.prorettype = 'uuid'::regtype::oid
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: gen_random_uuid() no disponible en esquemas confiables.' USING ERRCODE = '42883';
    END IF;

    -- 0.10 Colisión de nombres reservados de vistas y preservación obligatoria C15
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          AND table_name IN (
              'v_portal_client_profile', 'v_portal_creations', 'v_portal_appointments',
              'v_portal_fitting_sessions', 'v_portal_commercial_quotes', 'v_portal_measurement_sessions'
          )
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: Existe una BASE TABLE con nombre reservado v_portal_*.' USING ERRCODE = '42P07';
    END IF;

    PERFORM 1
    FROM public.creations cr
    JOIN public.clients cl ON cr.client_id = cl.id
    WHERE cr.id = '141693a0-01e8-498a-bbb3-1c4f98036543'
      AND cr.status = 'approved';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Preflight fallido: Creación protegida C15 (141693a0-01e8-498a-bbb3-1c4f98036543) no aprobada o huérfana.' USING ERRCODE = 'P0002';
    END IF;

    RAISE NOTICE '>>> [M09-A v2.11 PREFLIGHT] Completado exitosamente sin modificaciones.';
END;
$$;

-- ==============================================================================
-- FASE 1: ROL TÉCNICO NO PRIVILEGIADO atelier_portal_reader (NOBYPASSRLS)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'atelier_portal_reader') THEN
        CREATE ROLE atelier_portal_reader WITH
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOBYPASSRLS
            NOREPLICATION;
    ELSE
        ALTER ROLE atelier_portal_reader WITH
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOBYPASSRLS
            NOREPLICATION;
    END IF;

    -- PG 17: membresía exclusivamente para permitir ALTER VIEW OWNER TO sin herencia pasiva
    GRANT atelier_portal_reader TO postgres WITH INHERIT FALSE, SET TRUE;
END;
$$;

-- ==============================================================================
-- FASE 2: TABLAS M09 Y RESTRICCIONES DE INTEGRIDAD (A-03, A-04)
-- ==============================================================================

-- 2.1 public.client_portal_access (8 columnas canónicas exactas)
CREATE TABLE IF NOT EXISTS public.client_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE RESTRICT,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_cpa_active_requires_auth_user
        CHECK (status <> 'active' OR auth_user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cpa_client_id ON public.client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_cpa_auth_user_id ON public.client_portal_access(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_cpa_status ON public.client_portal_access(status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.client_portal_access'::regclass
          AND conname = 'chk_cpa_active_requires_auth_user'
    ) THEN
        ALTER TABLE public.client_portal_access
            ADD CONSTRAINT chk_cpa_active_requires_auth_user
            CHECK (status <> 'active' OR auth_user_id IS NOT NULL) NOT VALID;
        ALTER TABLE public.client_portal_access
            VALIDATE CONSTRAINT chk_cpa_active_requires_auth_user;
    END IF;
END;
$$;

-- 2.2 public.client_portal_invitations
CREATE TABLE IF NOT EXISTS public.client_portal_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    token_hash TEXT NOT NULL UNIQUE,
    operation_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    lease_until TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'accepted', 'failed', 'expired', 'revoked')),
    failure_reason TEXT,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_cpi_lease_state_consistency
        CHECK (
            (status = 'pending' AND lease_until IS NULL)
            OR (status = 'processing' AND lease_until IS NOT NULL)
            OR (status IN ('accepted', 'failed', 'expired', 'revoked') AND lease_until IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_cpi_token_hash ON public.client_portal_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_cpi_lookup ON public.client_portal_invitations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_cpi_operation ON public.client_portal_invitations(operation_id);

DO $$
DECLARE
    v_c_oid OID;
    v_c_validated BOOLEAN;
    v_c_def_norm TEXT;
    v_needs_recreate BOOLEAN := false;
BEGIN
    UPDATE public.client_portal_invitations
    SET lease_until = NULL
    WHERE (status = 'pending' AND lease_until IS NOT NULL)
       OR (status IN ('accepted', 'failed', 'expired', 'revoked') AND lease_until IS NOT NULL);

    UPDATE public.client_portal_invitations
    SET lease_until = pg_catalog.now() + INTERVAL '15 minutes'
    WHERE status = 'processing' AND lease_until IS NULL;

    SELECT c.oid, c.convalidated,
           pg_catalog.lower(pg_catalog.regexp_replace(
               pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid), '::(text|character varying)', '', 'g'),
               '\s+', ' ', 'g'
           ))
    INTO v_c_oid, v_c_validated, v_c_def_norm
    FROM pg_constraint c
    WHERE c.conrelid = 'public.client_portal_invitations'::regclass
      AND c.conname = 'chk_cpi_lease_state_consistency';

    IF v_c_oid IS NOT NULL THEN
        IF v_c_def_norm = 'check (((status = ''pending'') and (lease_until is null)) or ((status = ''processing'') and (lease_until is not null)) or ((status = any (array[''accepted'', ''failed'', ''expired'', ''revoked''])) and (lease_until is null)))'
           OR v_c_def_norm = 'check (((status = ''pending'') and (lease_until is null)) or ((status = ''processing'') and (lease_until is not null)) or ((status in (''accepted'', ''failed'', ''expired'', ''revoked'')) and (lease_until is null)))' THEN
            IF NOT v_c_validated THEN
                ALTER TABLE public.client_portal_invitations VALIDATE CONSTRAINT chk_cpi_lease_state_consistency;
            END IF;
        ELSE
            ALTER TABLE public.client_portal_invitations DROP CONSTRAINT chk_cpi_lease_state_consistency;
            v_needs_recreate := true;
        END IF;
    ELSE
        v_needs_recreate := true;
    END IF;

    IF v_needs_recreate THEN
        ALTER TABLE public.client_portal_invitations
            ADD CONSTRAINT chk_cpi_lease_state_consistency
            CHECK (
                (status = 'pending' AND lease_until IS NULL)
                OR (status = 'processing' AND lease_until IS NOT NULL)
                OR (status IN ('accepted', 'failed', 'expired', 'revoked') AND lease_until IS NULL)
            ) NOT VALID;
        ALTER TABLE public.client_portal_invitations
            VALIDATE CONSTRAINT chk_cpi_lease_state_consistency;
    END IF;
END;
$$;

-- 2.3 public.client_portal_permissions (Única Fuente de Verdad + A-03 CHECK de alcance)
CREATE TABLE IF NOT EXISTS public.client_portal_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_access_id UUID NOT NULL REFERENCES public.client_portal_access(id) ON DELETE CASCADE,
    creation_id UUID NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    resource TEXT NOT NULL CHECK (resource IN (
        'creations', 'sketches', 'fabrics', 'fittings',
        'quotations', 'measurements', 'appointments', 'messaging', '3d_viewer'
    )),
    action TEXT NOT NULL CHECK (action IN ('view', 'approve', 'observe', 'download')),
    is_granted BOOLEAN NOT NULL DEFAULT false,
    granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT chk_cpp_creation_scope_required
        CHECK (
            creation_id IS NOT NULL
            OR NOT (action = 'view' AND resource IN ('creations', 'sketches', 'fabrics', 'fittings'))
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_permissions_canonical_idx
    ON public.client_portal_permissions (
        portal_access_id,
        COALESCE(creation_id, '00000000-0000-0000-0000-000000000000'::uuid),
        resource,
        action
    );

CREATE INDEX IF NOT EXISTS idx_portal_perm_eval
    ON public.client_portal_permissions(portal_access_id, resource, action, is_granted);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.client_portal_permissions'::regclass
          AND conname = 'chk_cpp_creation_scope_required'
    ) THEN
        ALTER TABLE public.client_portal_permissions
            ADD CONSTRAINT chk_cpp_creation_scope_required
            CHECK (
                creation_id IS NOT NULL
                OR NOT (action = 'view' AND resource IN ('creations', 'sketches', 'fabrics', 'fittings'))
            ) NOT VALID;
        ALTER TABLE public.client_portal_permissions
            VALIDATE CONSTRAINT chk_cpp_creation_scope_required;
    END IF;
END;
$$;

-- 2.4 public.client_portal_activity_log
CREATE TABLE IF NOT EXISTS public.client_portal_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_access_id UUID NULL REFERENCES public.client_portal_access(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('business', 'telemetry')),
    origin TEXT NOT NULL CHECK (origin IN ('system', 'client')),
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_cpal_client_time ON public.client_portal_activity_log(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpal_category ON public.client_portal_activity_log(category, event_type);

-- ==============================================================================
-- FASE 3: TRIGGERS DE INTEGRIDAD, INMUTABILIDAD Y AUDITORÍA BUSINESS (A-03, A-04, C-07)
-- ==============================================================================

-- 3.1 Integridad cruzada Creación <-> Clienta (ambos sentidos)
CREATE OR REPLACE FUNCTION public.validate_portal_permission_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_access_client_id UUID;
    v_creation_client_id UUID;
BEGIN
    IF NEW.creation_id IS NOT NULL THEN
        SELECT client_id INTO v_access_client_id
        FROM public.client_portal_access
        WHERE id = NEW.portal_access_id
        FOR SHARE;

        IF v_access_client_id IS NULL THEN
            RAISE EXCEPTION 'portal_access_id % no existe o no tiene cliente asignado.', NEW.portal_access_id
                USING ERRCODE = '23503';
        END IF;

        SELECT client_id INTO v_creation_client_id
        FROM public.creations
        WHERE id = NEW.creation_id
        FOR SHARE;

        IF v_creation_client_id IS NULL THEN
            RAISE EXCEPTION 'creation_id % no existe.', NEW.creation_id
                USING ERRCODE = '23503';
        END IF;

        IF v_access_client_id IS DISTINCT FROM v_creation_client_id THEN
            RAISE EXCEPTION 'Violación de integridad: la creación % (cliente %) no coincide con el cliente % de portal_access_id %.',
                NEW.creation_id, v_creation_client_id, v_access_client_id, NEW.portal_access_id
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_portal_permission_creation ON public.client_portal_permissions;
CREATE TRIGGER trg_validate_portal_permission_creation
    BEFORE INSERT OR UPDATE ON public.client_portal_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_portal_permission_creation();

CREATE OR REPLACE FUNCTION public.protect_creation_client_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
        IF EXISTS (
            SELECT 1 FROM public.client_portal_permissions
            WHERE creation_id = OLD.id
            FOR UPDATE
        ) THEN
            RAISE EXCEPTION 'Operación denegada: la creación % posee permisos de portal activos. Revoque los permisos antes de reasignar cliente.',
                OLD.id
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_creation_client_reassignment ON public.creations;
CREATE TRIGGER trg_protect_creation_client_reassignment
    BEFORE UPDATE OF client_id ON public.creations
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_creation_client_reassignment();

-- 3.2 Inmutabilidad de bitácora (append-only estricto)
CREATE OR REPLACE FUNCTION public.prevent_activity_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Operación denegada: la bitácora de actividad del portal es inmutable y permanente.'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_activity_log ON public.client_portal_activity_log;
CREATE TRIGGER trg_protect_activity_log
    BEFORE UPDATE OR DELETE ON public.client_portal_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_activity_log_tampering();

-- 3.3 Inmutabilidad y autoría de client_portal_access (A-04)
CREATE OR REPLACE FUNCTION public.enforce_portal_access_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF v_uid IS NOT NULL THEN
            IF NEW.created_by IS NULL THEN
                NEW.created_by := v_uid;
            ELSIF NEW.created_by IS DISTINCT FROM v_uid THEN
                RAISE EXCEPTION 'Operación denegada (A-04): created_by debe coincidir con el usuario autenticado.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
        NEW.updated_at := COALESCE(NEW.updated_at, pg_catalog.now());
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Operación denegada (A-04): client_portal_access.id es inmutable.' USING ERRCODE = '42501';
        END IF;
        IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
            RAISE EXCEPTION 'Operación denegada (A-04): client_portal_access.client_id es inmutable.' USING ERRCODE = '42501';
        END IF;
        IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
            RAISE EXCEPTION 'Operación denegada (A-04): client_portal_access.created_by es inmutable.' USING ERRCODE = '42501';
        END IF;

        IF v_uid IS NOT NULL THEN
            NEW.updated_by := v_uid;
        END IF;
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cpa_enforce_immutability ON public.client_portal_access;
CREATE TRIGGER trg_cpa_enforce_immutability
    BEFORE INSERT OR UPDATE ON public.client_portal_access
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_portal_access_immutability();

-- 3.4 Auditoría business atómica (Patrón 2 capas: Trigger SECURITY INVOKER + Writer SECURITY DEFINER con pg_trigger_depth())
CREATE OR REPLACE FUNCTION public._portal_write_business_audit_row(
    p_portal_access_id UUID,
    p_client_id UUID,
    p_actor_user_id UUID,
    p_actor_resolution TEXT,
    p_event_type TEXT,
    p_metadata JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_portal_access_id UUID := p_portal_access_id;
    v_client_id UUID := p_client_id;
    v_actor_id UUID := p_actor_user_id;
    v_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
    IF pg_catalog.pg_trigger_depth() < 1 THEN
        RAISE EXCEPTION 'Operación denegada: _portal_write_business_audit_row solo puede ejecutarse desde triggers internos.'
            USING ERRCODE = '42501';
    END IF;

    IF v_client_id IS NULL AND v_portal_access_id IS NOT NULL THEN
        SELECT client_id INTO v_client_id
        FROM public.client_portal_access
        WHERE id = v_portal_access_id;
    END IF;

    -- En ON DELETE CASCADE desde client_portal_access el padre ya fue eliminado y access_deleted ya registró el evento
    IF v_client_id IS NULL AND p_event_type = 'permission_deleted' AND v_portal_access_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.client_portal_access WHERE id = v_portal_access_id) THEN
            RETURN;
        END IF;
    END IF;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Auditoría inválida: no pudo resolverse client_id para el evento %.', p_event_type
            USING ERRCODE = '23502';
    END IF;

    -- Resolver portal_access_id dentro de SECURITY DEFINER cuando aplica (evita lecturas RLS desde trigger INVOKER)
    IF v_portal_access_id IS NULL AND v_client_id IS NOT NULL AND p_event_type <> 'access_deleted' THEN
        SELECT id INTO v_portal_access_id
        FROM public.client_portal_access
        WHERE client_id = v_client_id
        LIMIT 1;
    END IF;

    -- Evitar SQLSTATE 23503 si portal_access_id referenciado acaba de ser eliminado en AFTER DELETE
    IF v_portal_access_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.client_portal_access WHERE id = v_portal_access_id
    ) THEN
        v_portal_access_id := NULL;
    END IF;

    IF p_actor_resolution = 'service_role_context' AND v_actor_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_actor_id) THEN
            RAISE EXCEPTION 'Auditoría inválida: app.portal_audit_actor_id no existe en auth.users.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    v_metadata := v_metadata || pg_catalog.jsonb_build_object('actor_resolution', p_actor_resolution);

    INSERT INTO public.client_portal_activity_log (
        portal_access_id, client_id, auth_user_id,
        category, origin, event_type, metadata, created_at
    ) VALUES (
        v_portal_access_id, v_client_id, v_actor_id,
        'business', 'system', p_event_type, v_metadata, pg_catalog.now()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public._portal_audit_business_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_current_user TEXT := current_user;
    v_session_user TEXT := session_user;
    v_uid UUID := auth.uid();
    v_raw_claims TEXT := pg_catalog.nullif(pg_catalog.current_setting('request.jwt.claims', true), '');
    v_jwt_role TEXT := '';
    v_allow_guc BOOLEAN := false;
    v_guc_skip TEXT;
    v_guc_actor TEXT;
    v_guc_op TEXT;
    v_operation_id UUID := NULL;
    v_actor_user_id UUID := NULL;
    v_actor_resolution TEXT := 'service_role_system';
    v_portal_access_id UUID := NULL;
    v_client_id UUID := NULL;
    v_event_type TEXT;
    v_metadata JSONB := '{}'::jsonb;
BEGIN
    IF v_raw_claims IS NOT NULL THEN
        BEGIN
            v_jwt_role := COALESCE((v_raw_claims::jsonb ->> 'role'), '');
        EXCEPTION WHEN OTHERS THEN
            v_jwt_role := '__malformed__';
        END;
    END IF;

    -- Lista blanca positiva estricta (fail-closed): cero NOT IN ni tolerancia a contextos ambiguos
    IF v_uid IS NOT NULL OR v_current_user = 'authenticated' OR v_jwt_role = 'authenticated' THEN
        v_allow_guc := false;
        v_actor_user_id := v_uid;
        v_actor_resolution := 'jwt_authenticated';
    ELSIF v_uid IS NULL
      AND v_current_user IN ('service_role', 'postgres', 'supabase_admin')
      AND (
          (v_session_user = 'authenticator' AND v_jwt_role = 'service_role')
          OR (v_session_user IN ('postgres', 'supabase_admin') AND v_raw_claims IS NULL)
      ) THEN
        v_allow_guc := true;
    ELSE
        v_allow_guc := false;
        v_actor_user_id := NULL;
        v_actor_resolution := 'untrusted_context_blocked';
    END IF;

    IF v_allow_guc THEN
        v_guc_op := pg_catalog.nullif(pg_catalog.current_setting('app.portal_audit_operation_id', true), '');
        IF v_guc_op IS NOT NULL THEN
            BEGIN
                v_operation_id := v_guc_op::uuid;
            EXCEPTION WHEN OTHERS THEN
                v_operation_id := NULL;
            END;
        END IF;

        v_guc_skip := pg_catalog.current_setting('app.portal_audit_skip_trigger', true);
        -- skip_trigger = 'true' exige simultáneamente app.portal_audit_operation_id UUID válido
        IF v_guc_skip = 'true' AND v_operation_id IS NOT NULL THEN
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END IF;

        v_guc_actor := pg_catalog.nullif(pg_catalog.current_setting('app.portal_audit_actor_id', true), '');
        IF v_guc_actor IS NOT NULL THEN
            BEGIN
                v_actor_user_id := v_guc_actor::uuid;
                v_actor_resolution := 'service_role_context';
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'Auditoría inválida: app.portal_audit_actor_id debe ser un UUID válido.'
                    USING ERRCODE = '22023';
            END;
        ELSE
            v_actor_user_id := NULL;
            v_actor_resolution := 'service_role_system';
        END IF;
    END IF;

    IF TG_TABLE_NAME = 'client_portal_invitations' THEN
        v_portal_access_id := NULL;
        IF TG_OP = 'INSERT' THEN
            v_client_id := NEW.client_id;
            v_event_type := 'invitation_issued';
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_invitations',
                'invitation_id', NEW.id,
                'previous_status', NULL,
                'new_status', NEW.status,
                'operation_id', COALESCE(v_operation_id, NEW.operation_id)
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status IN ('pending', 'processing') AND NEW.status IN ('pending', 'processing') THEN
                -- Omitir ruido técnico de lease Saga (pending <-> processing)
                RETURN NEW;
            END IF;
            IF NEW.status = OLD.status THEN
                RETURN NEW;
            END IF;

            v_client_id := NEW.client_id;
            v_event_type := CASE NEW.status
                WHEN 'revoked' THEN 'invitation_revoked'
                WHEN 'expired' THEN 'invitation_expired'
                WHEN 'failed' THEN 'invitation_failed'
                WHEN 'accepted' THEN 'invitation_accepted'
                ELSE 'invitation_updated'
            END;
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_invitations',
                'invitation_id', NEW.id,
                'previous_status', OLD.status,
                'new_status', NEW.status,
                'operation_id', COALESCE(v_operation_id, NEW.operation_id)
            );
        ELSE
            v_client_id := OLD.client_id;
            v_event_type := 'invitation_deleted';
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_invitations',
                'invitation_id', OLD.id,
                'previous_status', OLD.status,
                'new_status', OLD.status,
                'operation_id', COALESCE(v_operation_id, OLD.operation_id)
            );
        END IF;
    ELSIF TG_TABLE_NAME = 'client_portal_access' THEN
        IF TG_OP = 'INSERT' THEN
            v_portal_access_id := NEW.id;
            v_client_id := NEW.client_id;
            v_event_type := 'access_created';
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_access',
                'previous_status', NULL,
                'new_status', NEW.status,
                'has_auth_user_id', (NEW.auth_user_id IS NOT NULL),
                'operation_id', v_operation_id
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                v_event_type := 'access_status_changed';
            ELSIF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
                v_event_type := 'access_identity_linked';
            ELSE
                RETURN NEW;
            END IF;

            v_portal_access_id := NEW.id;
            v_client_id := NEW.client_id;
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_access',
                'previous_status', OLD.status,
                'new_status', NEW.status,
                'has_auth_user_id', (NEW.auth_user_id IS NOT NULL),
                'operation_id', v_operation_id
            );
        ELSE
            -- AFTER DELETE: fila padre ya no existe; conservar deleted_portal_access_id en metadata sin violar FK 23503
            v_portal_access_id := NULL;
            v_client_id := OLD.client_id;
            v_event_type := 'access_deleted';
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_access',
                'deleted_portal_access_id', OLD.id,
                'previous_status', OLD.status,
                'new_status', OLD.status,
                'has_auth_user_id', (OLD.auth_user_id IS NOT NULL),
                'operation_id', v_operation_id
            );
        END IF;
    ELSIF TG_TABLE_NAME = 'client_portal_permissions' THEN
        IF TG_OP = 'INSERT' THEN
            v_portal_access_id := NEW.portal_access_id;
            v_event_type := CASE WHEN COALESCE(NEW.is_granted, false) THEN 'permission_granted' ELSE 'permission_revoked' END;
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_permissions',
                'permission_id', NEW.id,
                'creation_id', NEW.creation_id,
                'resource', NEW.resource,
                'action', NEW.action,
                'is_granted', NEW.is_granted,
                'operation_id', v_operation_id
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.is_granted IS NOT DISTINCT FROM OLD.is_granted
               AND NEW.creation_id IS NOT DISTINCT FROM OLD.creation_id
               AND NEW.resource IS NOT DISTINCT FROM OLD.resource
               AND NEW.action IS NOT DISTINCT FROM OLD.action THEN
                RETURN NEW;
            END IF;

            v_portal_access_id := NEW.portal_access_id;
            v_event_type := CASE WHEN COALESCE(NEW.is_granted, false) THEN 'permission_granted' ELSE 'permission_revoked' END;
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_permissions',
                'permission_id', NEW.id,
                'creation_id', NEW.creation_id,
                'resource', NEW.resource,
                'action', NEW.action,
                'is_granted', NEW.is_granted,
                'operation_id', v_operation_id
            );
        ELSE
            v_portal_access_id := OLD.portal_access_id;
            v_event_type := 'permission_deleted';
            v_metadata := pg_catalog.jsonb_build_object(
                'table', 'client_portal_permissions',
                'permission_id', OLD.id,
                'deleted_portal_access_id', OLD.portal_access_id,
                'creation_id', OLD.creation_id,
                'resource', OLD.resource,
                'action', OLD.action,
                'is_granted', false,
                'operation_id', v_operation_id
            );
        END IF;
    ELSE
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    PERFORM public._portal_write_business_audit_row(
        v_portal_access_id,
        v_client_id,
        v_actor_user_id,
        v_actor_resolution,
        v_event_type,
        v_metadata
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cpa_audit_business ON public.client_portal_access;
CREATE TRIGGER trg_cpa_audit_business
    AFTER INSERT OR UPDATE OR DELETE ON public.client_portal_access
    FOR EACH ROW
    EXECUTE FUNCTION public._portal_audit_business_change();

DROP TRIGGER IF EXISTS trg_cpp_audit_business ON public.client_portal_permissions;
CREATE TRIGGER trg_cpp_audit_business
    AFTER INSERT OR UPDATE OR DELETE ON public.client_portal_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public._portal_audit_business_change();

DROP TRIGGER IF EXISTS trg_cpi_audit_business ON public.client_portal_invitations;
CREATE TRIGGER trg_cpi_audit_business
    AFTER INSERT OR UPDATE OR DELETE ON public.client_portal_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public._portal_audit_business_change();

-- ==============================================================================
-- FASE 4: HELPERS DE SEGURIDAD, TELEMETRÍA Y RPCs SAGA (C-04, C-05, C-07)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_portal_access_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT id
    FROM public.client_portal_access
    WHERE auth_user_id = auth.uid() AND status = 'active'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_portal_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT client_id
    FROM public.client_portal_access
    WHERE auth_user_id = auth.uid() AND status = 'active'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.portal_owns_creation(p_creation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.creations cr
        JOIN public.client_portal_access a ON cr.client_id = a.client_id
        WHERE cr.id = p_creation_id
          AND a.auth_user_id = auth.uid()
          AND a.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_portal_permission(
    p_resource TEXT,
    p_action TEXT,
    p_creation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_access_id UUID;
    v_specific_granted BOOLEAN;
    v_global_granted BOOLEAN;
BEGIN
    SELECT id INTO v_access_id
    FROM public.client_portal_access
    WHERE auth_user_id = auth.uid() AND status = 'active';

    IF v_access_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Regla de alcance canónica (M09-B.6 / A-03): la lectura de creaciones/bocetos/telas/pruebas jamás se evalúa global
    IF p_creation_id IS NULL AND p_action = 'view' AND p_resource IN ('creations', 'sketches', 'fabrics', 'fittings') THEN
        RETURN FALSE;
    END IF;

    IF p_creation_id IS NOT NULL THEN
        SELECT is_granted INTO v_specific_granted
        FROM public.client_portal_permissions
        WHERE portal_access_id = v_access_id
          AND creation_id = p_creation_id
          AND resource = p_resource
          AND action = p_action;

        IF v_specific_granted IS NOT NULL THEN
            RETURN v_specific_granted;
        END IF;

        IF p_action = 'view' AND p_resource IN ('creations', 'sketches', 'fabrics', 'fittings') THEN
            RETURN FALSE;
        END IF;
    END IF;

    SELECT is_granted INTO v_global_granted
    FROM public.client_portal_permissions
    WHERE portal_access_id = v_access_id
      AND creation_id IS NULL
      AND resource = p_resource
      AND action = p_action;

    RETURN COALESCE(v_global_granted, FALSE);
END;
$$;

-- Reemplazo canónico de admin.getUserByEmail (inexistente en @supabase/supabase-js@2.39.0)
CREATE OR REPLACE FUNCTION public._portal_lookup_auth_user_by_email(p_email TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    email_confirmed_at TIMESTAMPTZ,
    raw_app_meta_data JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT u.id, u.email::text, u.email_confirmed_at, u.raw_app_meta_data
    FROM auth.users u
    WHERE pg_catalog.lower(pg_catalog.btrim(u.email)) = pg_catalog.lower(pg_catalog.btrim(p_email))
    LIMIT 1;
$$;

-- Puerta única de telemetría cliente (C-07)
CREATE OR REPLACE FUNCTION public.log_portal_event(
    p_event_type TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_access_id UUID;
    v_client_id UUID;
    v_uid UUID := auth.uid();
    v_ua TEXT;
    v_safe_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: sesión autenticada requerida.'
            USING ERRCODE = '42501';
    END IF;

    IF p_event_type NOT IN (
        'view_portal_home', 'view_creation', 'view_sketches',
        'view_quotation', 'view_appointment', 'view_measurements',
        'view_fittings', 'auth_logout'
    ) THEN
        RAISE EXCEPTION 'Operación denegada: evento de telemetría no autorizado.'
            USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.pg_column_size(v_safe_metadata) > 2048 THEN
        RAISE EXCEPTION 'Operación denegada: metadata excede el límite permitido de 2 KB.'
            USING ERRCODE = '22023';
    END IF;

    SELECT id, client_id INTO v_access_id, v_client_id
    FROM public.client_portal_access
    WHERE auth_user_id = v_uid AND status = 'active';

    IF v_access_id IS NULL THEN
        RAISE EXCEPTION 'Operación denegada: no existe acceso activo de portal.'
            USING ERRCODE = '42501';
    END IF;

    BEGIN
        v_ua := pg_catalog.left(
            pg_catalog.regexp_replace(
                COALESCE(pg_catalog.current_setting('request.headers', true)::json->>'user-agent', ''),
                '[[:cntrl:]]', '', 'g'
            ),
            512
        );
    EXCEPTION WHEN OTHERS THEN
        v_ua := NULL;
    END;

    INSERT INTO public.client_portal_activity_log (
        portal_access_id, client_id, auth_user_id,
        category, origin, event_type, metadata, ip_address, user_agent, created_at
    ) VALUES (
        v_access_id, v_client_id, v_uid,
        'telemetry', 'client', p_event_type, v_safe_metadata, NULL, pg_catalog.nullif(v_ua, ''), pg_catalog.now()
    );
END;
$$;

-- RPC Saga 1: claim_portal_invitation
CREATE OR REPLACE FUNCTION public.claim_portal_invitation(
    p_token_hash TEXT,
    p_operation_id UUID
)
RETURNS TABLE (
    client_id UUID,
    email TEXT,
    invited_by UUID,
    claim_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    IF p_operation_id IS NULL THEN
        RAISE EXCEPTION 'p_operation_id es obligatorio para registrar la reserva de invitación.'
            USING ERRCODE = '23514';
    END IF;

    SELECT i.id, i.client_id, i.email, i.status, i.expires_at, i.lease_until, i.invited_by
    INTO v_rec
    FROM public.client_portal_invitations i
    WHERE i.token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::UUID, 'not_found'::TEXT;
        RETURN;
    END IF;

    IF v_rec.status IN ('accepted', 'revoked', 'failed', 'expired') THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::UUID, v_rec.status;
        RETURN;
    END IF;

    IF v_rec.expires_at <= pg_catalog.now() THEN
        UPDATE public.client_portal_invitations
        SET status = 'expired', lease_until = NULL
        WHERE token_hash = p_token_hash;

        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::UUID, 'expired'::TEXT;
        RETURN;
    END IF;

    IF v_rec.status = 'processing' AND v_rec.lease_until > pg_catalog.now() THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::UUID, 'locked'::TEXT;
        RETURN;
    END IF;

    UPDATE public.client_portal_invitations
    SET status = 'processing',
        operation_id = p_operation_id,
        lease_until = pg_catalog.now() + INTERVAL '15 minutes'
    WHERE token_hash = p_token_hash;

    RETURN QUERY SELECT v_rec.client_id, v_rec.email, v_rec.invited_by, 'claimed'::TEXT;
END;
$$;

-- RPC Saga 2: release_portal_invitation
CREATE OR REPLACE FUNCTION public.release_portal_invitation(
    p_token_hash TEXT,
    p_operation_id UUID,
    p_reason TEXT,
    p_mark_failed BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated_rows INT;
BEGIN
    IF p_operation_id IS NULL THEN
        RAISE EXCEPTION 'p_operation_id es obligatorio para liberar una invitación en proceso.'
            USING ERRCODE = '23514';
    END IF;

    UPDATE public.client_portal_invitations
    SET status = CASE WHEN p_mark_failed THEN 'failed' ELSE 'pending' END,
        lease_until = NULL,
        failure_reason = p_reason
    WHERE token_hash = p_token_hash
      AND status = 'processing'
      AND operation_id = p_operation_id;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    IF v_updated_rows = 0 THEN
        RAISE WARNING 'release_portal_invitation no encontró registros en processing con operation_id %.', p_operation_id;
    END IF;
END;
$$;

-- RPC Saga 3: finalize_portal_invitation (C-04, C-05, Trazabilidad Legal Ley 1581 + Actor SET LOCAL)
DROP FUNCTION IF EXISTS public.finalize_portal_invitation(TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.finalize_portal_invitation(
    p_token_hash TEXT,
    p_operation_id UUID,
    p_auth_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_legal_consents JSONB DEFAULT NULL,
    p_client_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_source TEXT DEFAULT 'unavailable'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_invitation_id UUID;
    v_client_id UUID;
    v_invited_by UUID;
    v_invitation_email TEXT;
    v_client_full_name TEXT;
    v_resolved_full_name TEXT;
    v_access_id UUID;
    v_existing_role TEXT;
    v_existing_access_user_id UUID := NULL;
    v_profile_exists BOOLEAN := false;
    v_has_age BOOLEAN := false;
    v_has_terms BOOLEAN := false;
    v_has_privacy BOOLEAN := false;
    v_req_age BOOLEAN := false;
    v_req_terms BOOLEAN := false;
    v_req_privacy BOOLEAN := false;
    v_req_marketing BOOLEAN := false;
    v_terms_version TEXT := '1.0';
    v_privacy_version TEXT := '1.0';
    v_clean_ip TEXT := NULL;
    v_parsed_inet pg_catalog.inet := NULL;
    v_clean_ua TEXT := NULL;
    v_clean_ip_source TEXT := COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_ip_source), ''), 'unavailable');
BEGIN
    IF p_operation_id IS NULL OR p_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'p_operation_id y p_auth_user_id son parámetros obligatorios.'
            USING ERRCODE = '23514';
    END IF;

    -- 1. Idempotencia exacta sobre la terna (token_hash, operation_id, auth_user_id)
    IF EXISTS (
        SELECT 1
        FROM public.client_portal_invitations i
        JOIN public.client_portal_access a ON a.client_id = i.client_id
        WHERE i.token_hash = p_token_hash
          AND i.status = 'accepted'
          AND i.operation_id = p_operation_id
          AND a.auth_user_id = p_auth_user_id
          AND a.status = 'active'
    ) THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.client_portal_invitations
        WHERE token_hash = p_token_hash AND status = 'accepted'
    ) THEN
        RAISE EXCEPTION 'Conflicto de idempotencia: invitación ya aceptada por otra operación o cuenta.'
            USING ERRCODE = '23505';
    END IF;

    -- 2. Validar reserva Saga activa
    SELECT id, client_id, invited_by, email
    INTO v_invitation_id, v_client_id, v_invited_by, v_invitation_email
    FROM public.client_portal_invitations
    WHERE token_hash = p_token_hash
      AND status = 'processing'
      AND operation_id = p_operation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transacción inválida: invitación no reservada por la operación indicada.'
            USING ERRCODE = '23514';
    END IF;

    -- 3. Blindaje nuclear contra cuentas privilegiadas (profiles + app_metadata)
    SELECT true, role INTO v_profile_exists, v_existing_role
    FROM public.profiles
    WHERE id = p_auth_user_id
    FOR UPDATE;

    v_profile_exists := COALESCE(v_profile_exists, false);

    IF v_profile_exists AND v_existing_role IN ('admin', 'designer', 'superadmin') THEN
        RAISE EXCEPTION 'Violación de seguridad nuclear: cuenta privilegiada no vinculable al portal.'
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = p_auth_user_id
          AND (raw_app_meta_data->>'role' IN ('admin', 'designer', 'superadmin'))
    ) THEN
        RAISE EXCEPTION 'Violación de seguridad nuclear: rol privilegiado en app_metadata.'
            USING ERRCODE = '42501';
    END IF;

    -- 4. Verificación estricta de identidad y correo
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = p_auth_user_id
          AND pg_catalog.lower(pg_catalog.btrim(email)) = pg_catalog.lower(pg_catalog.btrim(v_invitation_email))
    ) THEN
        RAISE EXCEPTION 'Conflicto de identidad: el correo de la cuenta no coincide con la invitación.'
            USING ERRCODE = '23514';
    END IF;

    -- 5. Garantía de profiles.full_name NOT NULL (C-04) sin alterar roles existentes
    SELECT full_name INTO v_client_full_name
    FROM public.clients
    WHERE id = v_client_id;

    v_resolved_full_name := COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_full_name), ''),
        pg_catalog.nullif(pg_catalog.btrim(v_client_full_name), ''),
        pg_catalog.split_part(v_invitation_email, '@', 1)
    );

    IF v_profile_exists THEN
        UPDATE public.profiles
        SET updated_at = pg_catalog.now()
        WHERE id = p_auth_user_id;
    ELSE
        INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
        VALUES (p_auth_user_id, v_resolved_full_name, v_invitation_email, 'client', pg_catalog.now(), pg_catalog.now())
        ON CONFLICT (id) DO UPDATE SET
            full_name = CASE
                WHEN pg_catalog.btrim(public.profiles.full_name) = '' THEN EXCLUDED.full_name
                ELSE public.profiles.full_name
            END,
            updated_at = pg_catalog.now();
    END IF;

    -- 6. Validación e inserción idempotente Ley 1581 en public.user_legal_consents (C-04)
    v_terms_version := COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'termsVersion'), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'terms_version'), ''),
        '1.0'
    );
    v_privacy_version := COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'privacyVersion'), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'privacy_version'), ''),
        '1.0'
    );

    SELECT
        EXISTS (SELECT 1 FROM public.user_legal_consents WHERE user_id = p_auth_user_id AND consent_type = 'AGE_CONFIRMATION' AND document_version = '1.0' AND status = 'granted'),
        EXISTS (SELECT 1 FROM public.user_legal_consents WHERE user_id = p_auth_user_id AND consent_type = 'TERMS_OF_SERVICE' AND document_version = v_terms_version AND status = 'granted'),
        EXISTS (SELECT 1 FROM public.user_legal_consents WHERE user_id = p_auth_user_id AND consent_type = 'PRIVACY_POLICY' AND document_version = v_privacy_version AND status = 'granted')
    INTO v_has_age, v_has_terms, v_has_privacy;

    -- Parseo seguro de booleanos JSONB sin casteo directo ::boolean (evita SQLSTATE 22P02 ante texto malformado)
    v_req_age := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'ageConfirmed'), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'age_confirmed'), ''),
        'false'
    ))) = 'true');
    v_req_terms := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'termsAccepted'), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'terms_accepted'), ''),
        'false'
    ))) = 'true');
    v_req_privacy := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'privacyAccepted'), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'privacy_accepted'), ''),
        'false'
    ))) = 'true');
    v_req_marketing := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'marketingOptIn'), ''),
        pg_catalog.nullif(pg_catalog.btrim(p_legal_consents->>'marketing_opt_in'), ''),
        'false'
    ))) = 'true');

    IF (NOT v_has_age AND NOT v_req_age) OR (NOT v_has_terms AND NOT v_req_terms) OR (NOT v_has_privacy AND NOT v_req_privacy) THEN
        RAISE EXCEPTION 'Aceptación legal Ley 1581 obligatoria (mayoría de edad, términos y privacidad) requerida.'
            USING ERRCODE = '22023';
    END IF;

    -- Validación fail-closed mediante tipo inet nativo (rechaza octetos >255, CIDR '/' y rangos loopback/privados/link-local/CGNAT)
    IF p_client_ip IS NOT NULL THEN
        v_clean_ip := pg_catalog.nullif(pg_catalog.btrim(p_client_ip), '');
        IF v_clean_ip IS NOT NULL THEN
            IF pg_catalog.char_length(v_clean_ip) > 45
               OR pg_catalog.strpos(v_clean_ip, '/') > 0
               OR v_clean_ip ~ '[\s,%]' THEN
                v_clean_ip := NULL;
                v_clean_ip_source := 'invalid_rejected';
            ELSE
                BEGIN
                    v_parsed_inet := v_clean_ip::pg_catalog.inet;
                    IF v_parsed_inet OPERATOR(pg_catalog.<<=) '127.0.0.0/8'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '10.0.0.0/8'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '172.16.0.0/12'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '192.168.0.0/16'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '169.254.0.0/16'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '100.64.0.0/10'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '0.0.0.0/8'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::1/128'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) 'fc00::/7'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) 'fe80::/10'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::/128'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:127.0.0.0/104'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:10.0.0.0/104'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:172.16.0.0/108'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:192.168.0.0/112'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:169.254.0.0/112'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:100.64.0.0/106'::pg_catalog.inet
                       OR v_parsed_inet OPERATOR(pg_catalog.<<=) '::ffff:0.0.0.0/104'::pg_catalog.inet THEN
                        v_clean_ip := NULL;
                        v_clean_ip_source := 'non_public_rejected';
                    ELSE
                        v_clean_ip := pg_catalog.host(v_parsed_inet);
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    v_clean_ip := NULL;
                    v_clean_ip_source := 'invalid_rejected';
                END;
            END IF;
        END IF;
    END IF;

    v_clean_ua := pg_catalog.nullif(
        pg_catalog.left(pg_catalog.regexp_replace(COALESCE(p_user_agent, ''), '[[:cntrl:]]', '', 'g'), 512),
        ''
    );

    IF NOT v_has_age THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, ip_address, user_agent, accepted_at
        ) VALUES (
            p_auth_user_id, 'AGE_CONFIRMATION', '1.0', 'granted', v_clean_ip, v_clean_ua, pg_catalog.now()
        );
    END IF;

    IF NOT v_has_terms THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, ip_address, user_agent, accepted_at
        ) VALUES (
            p_auth_user_id, 'TERMS_OF_SERVICE', v_terms_version, 'granted', v_clean_ip, v_clean_ua, pg_catalog.now()
        );
    END IF;

    IF NOT v_has_privacy THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, ip_address, user_agent, accepted_at
        ) VALUES (
            p_auth_user_id, 'PRIVACY_POLICY', v_privacy_version, 'granted', v_clean_ip, v_clean_ua, pg_catalog.now()
        );
    END IF;

    IF v_req_marketing AND NOT EXISTS (
        SELECT 1 FROM public.user_legal_consents
        WHERE user_id = p_auth_user_id AND consent_type = 'MARKETING_OPT_IN' AND document_version = '1.0' AND status = 'granted'
    ) THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, ip_address, user_agent, accepted_at
        ) VALUES (
            p_auth_user_id, 'MARKETING_OPT_IN', '1.0', 'granted', v_clean_ip, v_clean_ua, pg_catalog.now()
        );
    END IF;

    -- 7. Bloqueo FOR UPDATE anti-revinculación silenciosa + contexto transaccional SET LOCAL
    SELECT auth_user_id INTO v_existing_access_user_id
    FROM public.client_portal_access
    WHERE client_id = v_client_id
    FOR UPDATE;

    IF v_existing_access_user_id IS NOT NULL AND v_existing_access_user_id IS DISTINCT FROM p_auth_user_id THEN
        RAISE EXCEPTION 'Conflicto de identidad: el acceso al portal de esta clienta ya pertenece a otra cuenta autenticada.'
            USING ERRCODE = '23505';
    END IF;

    PERFORM pg_catalog.set_config('app.portal_audit_operation_id', p_operation_id::text, true);
    PERFORM pg_catalog.set_config('app.portal_audit_actor_id', p_auth_user_id::text, true);
    PERFORM pg_catalog.set_config('app.portal_audit_skip_trigger', 'true', true);

    INSERT INTO public.client_portal_access (
        client_id, auth_user_id, status, created_by, updated_by
    ) VALUES (
        v_client_id, p_auth_user_id, 'active', v_invited_by, v_invited_by
    )
    ON CONFLICT (client_id) DO UPDATE SET
        auth_user_id = COALESCE(public.client_portal_access.auth_user_id, EXCLUDED.auth_user_id),
        status = 'active',
        updated_by = v_invited_by,
        updated_at = pg_catalog.now()
    RETURNING id INTO v_access_id;

    UPDATE public.client_portal_invitations
    SET status = 'accepted',
        used_at = pg_catalog.now(),
        lease_until = NULL
    WHERE token_hash = p_token_hash;

    -- Restablecer skip_trigger inmediatamente antes de salir
    PERFORM pg_catalog.set_config('app.portal_audit_skip_trigger', 'false', true);

    -- 8. Registro forense único y consolidado de aceptación (incluyendo trazabilidad legal + ip_source)
    INSERT INTO public.client_portal_activity_log (
        portal_access_id, client_id, auth_user_id,
        category, origin, event_type, metadata, ip_address, user_agent, created_at
    ) VALUES (
        v_access_id, v_client_id, p_auth_user_id,
        'business', 'system', 'invitation_accepted',
        pg_catalog.jsonb_build_object(
            'invitation_id', v_invitation_id,
            'operation_id', p_operation_id,
            'actor_resolution', 'service_role_context',
            'legal_consents_status', CASE WHEN (v_has_age AND v_has_terms AND v_has_privacy) THEN 'already_granted' ELSE 'recorded_on_accept' END,
            'terms_version', v_terms_version,
            'privacy_version', v_privacy_version,
            'ip_source', v_clean_ip_source
        ),
        v_clean_ip,
        v_clean_ua,
        pg_catalog.now()
    );
END;
$$;

-- ==============================================================================
-- FASE 5: ROW LEVEL SECURITY SOBRE LAS 4 TABLAS M09 (C-07)
-- ==============================================================================
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpa_admin_all" ON public.client_portal_access;
CREATE POLICY "cpa_admin_all" ON public.client_portal_access
    FOR ALL TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "cpa_client_select" ON public.client_portal_access;
CREATE POLICY "cpa_client_select" ON public.client_portal_access
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "cpi_admin_all" ON public.client_portal_invitations;
CREATE POLICY "cpi_admin_all" ON public.client_portal_invitations
    FOR ALL TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "cpp_admin_all" ON public.client_portal_permissions;
CREATE POLICY "cpp_admin_all" ON public.client_portal_permissions
    FOR ALL TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "cpp_client_select" ON public.client_portal_permissions;
CREATE POLICY "cpp_client_select" ON public.client_portal_permissions
    FOR SELECT TO authenticated
    USING (portal_access_id = public.get_portal_access_id());

DROP POLICY IF EXISTS "cpal_admin_select" ON public.client_portal_activity_log;
CREATE POLICY "cpal_admin_select" ON public.client_portal_activity_log
    FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "cpal_client_select" ON public.client_portal_activity_log;
CREATE POLICY "cpal_client_select" ON public.client_portal_activity_log
    FOR SELECT TO authenticated
    USING (
        portal_access_id = public.get_portal_access_id()
        AND category = 'telemetry'
    );

-- Cierre explícito C-07: jamás habilitar INSERT directo en client_portal_activity_log a clientas
DROP POLICY IF EXISTS "cpal_client_insert_telemetry" ON public.client_portal_activity_log;

-- ==============================================================================
-- FASE 6: LAS 7 POLÍTICAS ADITIVAS FOR SELECT TO atelier_portal_reader (C-03)
--         (Cero USING (true); cero impacto en M00–M08 para authenticated)
-- ==============================================================================

DROP POLICY IF EXISTS "apr_client_portal_access_select" ON public.client_portal_access;
CREATE POLICY "apr_client_portal_access_select" ON public.client_portal_access
    FOR SELECT TO atelier_portal_reader
    USING (auth_user_id = auth.uid() AND status = 'active');

DROP POLICY IF EXISTS "apr_clients_select" ON public.clients;
CREATE POLICY "apr_clients_select" ON public.clients
    FOR SELECT TO atelier_portal_reader
    USING (id = public.get_portal_client_id());

DROP POLICY IF EXISTS "apr_creations_select" ON public.creations;
CREATE POLICY "apr_creations_select" ON public.creations
    FOR SELECT TO atelier_portal_reader
    USING (
        client_id = public.get_portal_client_id()
        AND public.has_portal_permission('creations', 'view', id)
    );

DROP POLICY IF EXISTS "apr_measurement_sessions_select" ON public.measurement_sessions;
CREATE POLICY "apr_measurement_sessions_select" ON public.measurement_sessions
    FOR SELECT TO atelier_portal_reader
    USING (
        client_id = public.get_portal_client_id()
        AND status IN ('completed', 'verified')
        AND public.has_portal_permission('measurements', 'view', NULL)
    );

DROP POLICY IF EXISTS "apr_atelier_appointments_select" ON public.atelier_appointments;
CREATE POLICY "apr_atelier_appointments_select" ON public.atelier_appointments
    FOR SELECT TO atelier_portal_reader
    USING (
        client_id IS NOT NULL
        AND client_id = public.get_portal_client_id()
        AND client_visibility = 'client_visible'
        AND status NOT IN ('cancelled')
        AND public.has_portal_permission('appointments', 'view', NULL)
    );

DROP POLICY IF EXISTS "apr_atelier_fitting_sessions_select" ON public.atelier_fitting_sessions;
CREATE POLICY "apr_atelier_fitting_sessions_select" ON public.atelier_fitting_sessions
    FOR SELECT TO atelier_portal_reader
    USING (
        public.portal_owns_creation(creation_id)
        AND status NOT IN ('cancelled')
        AND client_visibility = 'summary_ready'
        AND public.has_portal_permission('creations', 'view', creation_id)
        AND public.has_portal_permission('fittings', 'view', creation_id)
    );

DROP POLICY IF EXISTS "apr_commercial_quotes_select" ON public.commercial_quotes;
CREATE POLICY "apr_commercial_quotes_select" ON public.commercial_quotes
    FOR SELECT TO atelier_portal_reader
    USING (
        public.portal_owns_creation(creation_id)
        AND status IN ('sent', 'accepted', 'expired')
        AND public.has_portal_permission('creations', 'view', creation_id)
        AND public.has_portal_permission('quotations', 'view', creation_id)
    );

-- ==============================================================================
-- FASE 7: LAS 6 VISTAS PROTEGIDAS v_portal_* (security_barrier = true, C-02..A-05)
-- ==============================================================================

-- 7.1 Perfil de Clienta
CREATE OR REPLACE VIEW public.v_portal_client_profile
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    c.id, c.full_name, c.email, c.phone, c.city,
    c.style_preferences, c.photo_url, c.status
FROM public.clients c
JOIN public.client_portal_access a ON c.id = a.client_id
WHERE a.auth_user_id = auth.uid()
  AND a.status = 'active';

-- 7.2 Creaciones Autorizadas
CREATE OR REPLACE VIEW public.v_portal_creations
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    cr.id, cr.name, cr.description, cr.creation_type,
    cr.status, cr.occasion, cr.garment_type, cr.target_date, cr.created_at,
    public.has_portal_permission('sketches', 'view', cr.id) AS can_view_sketches,
    public.has_portal_permission('sketches', 'approve', cr.id) AS can_approve_sketches,
    public.has_portal_permission('fabrics', 'view', cr.id) AS can_view_fabrics,
    public.has_portal_permission('fittings', 'view', cr.id) AS can_view_fittings,
    public.has_portal_permission('quotations', 'view', cr.id) AS can_view_budget,
    public.has_portal_permission('messaging', 'observe', cr.id) AS can_send_observations
FROM public.creations cr
JOIN public.client_portal_access a ON cr.client_id = a.client_id
WHERE a.auth_user_id = auth.uid()
  AND a.status = 'active'
  AND public.has_portal_permission('creations', 'view', cr.id);

-- 7.3 Citas de Agenda M08 (C-02: predicado ap.client_id IS NOT NULL para índice parcial)
CREATE OR REPLACE VIEW public.v_portal_appointments
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    ap.id, ap.appointment_type, ap.status, ap.starts_at, ap.ends_at,
    ap.location_space, ap.preparation_notes
FROM public.atelier_appointments ap
JOIN public.client_portal_access a ON ap.client_id = a.client_id
WHERE ap.client_id IS NOT NULL
  AND a.auth_user_id = auth.uid()
  AND a.status = 'active'
  AND public.has_portal_permission('appointments', 'view', NULL)
  AND ap.client_visibility = 'client_visible'
  AND ap.status NOT IN ('cancelled');

-- 7.4 Sesiones de Fitting M06 (A-02 + A-05 doble candado)
CREATE OR REPLACE VIEW public.v_portal_fitting_sessions
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    fs.id, fs.creation_id, fs.session_number, fs.round_type,
    fs.title, fs.status, fs.scheduled_at, fs.conducted_at, fs.location_note
FROM public.atelier_fitting_sessions fs
JOIN public.creations cr ON fs.creation_id = cr.id
JOIN public.client_portal_access a ON cr.client_id = a.client_id
WHERE a.auth_user_id = auth.uid()
  AND a.status = 'active'
  AND fs.status NOT IN ('cancelled')
  AND fs.client_visibility = 'summary_ready'
  AND public.has_portal_permission('creations', 'view', fs.creation_id)
  AND public.has_portal_permission('fittings', 'view', fs.creation_id);

-- 7.5 Cotizaciones Comerciales M03 (A-01 + A-05 doble candado)
CREATE OR REPLACE VIEW public.v_portal_commercial_quotes
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    cq.id, cq.creation_id, cq.quote_number, cq.currency,
    cq.total_price AS total_amount,
    cq.payment_instructions AS payment_schedule,
    cq.valid_until,
    cq.status,
    cq.accepted_at AS approved_at
FROM public.commercial_quotes cq
JOIN public.creations cr ON cq.creation_id = cr.id
JOIN public.client_portal_access a ON cr.client_id = a.client_id
WHERE a.auth_user_id = auth.uid()
  AND a.status = 'active'
  AND cq.status IN ('sent', 'accepted', 'expired')
  AND public.has_portal_permission('creations', 'view', cq.creation_id)
  AND public.has_portal_permission('quotations', 'view', cq.creation_id);

-- 7.6 Sesiones de Medidas M02
CREATE OR REPLACE VIEW public.v_portal_measurement_sessions
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    ms.id, ms.session_date, ms.status, ms.unit_system, ms.version_number
FROM public.measurement_sessions ms
JOIN public.client_portal_access a ON ms.client_id = a.client_id
WHERE a.auth_user_id = auth.uid()
  AND a.status = 'active'
  AND public.has_portal_permission('measurements', 'view', NULL)
  AND ms.status IN ('completed', 'verified');

-- Requisito PG 17: para ALTER VIEW OWNER TO, el nuevo rol propietario requiere CREATE transitorio en el esquema
GRANT CREATE ON SCHEMA public TO atelier_portal_reader;

ALTER VIEW public.v_portal_client_profile OWNER TO atelier_portal_reader;
ALTER VIEW public.v_portal_creations OWNER TO atelier_portal_reader;
ALTER VIEW public.v_portal_appointments OWNER TO atelier_portal_reader;
ALTER VIEW public.v_portal_fitting_sessions OWNER TO atelier_portal_reader;
ALTER VIEW public.v_portal_commercial_quotes OWNER TO atelier_portal_reader;
ALTER VIEW public.v_portal_measurement_sessions OWNER TO atelier_portal_reader;

-- ==============================================================================
-- FASE 8: ACLs GRANULARES FINALES (C-01, C-03, C-07)
-- ==============================================================================

-- 8.1 Superficie mínima cerrada de atelier_portal_reader (56 columnas en 7 tablas; 0 en client_portal_permissions)
REVOKE ALL ON SCHEMA public FROM atelier_portal_reader;
GRANT USAGE ON SCHEMA public TO atelier_portal_reader;

REVOKE ALL ON TABLE public.clients, public.creations, public.atelier_appointments,
                     public.atelier_fitting_sessions, public.commercial_quotes, public.measurement_sessions,
                     public.client_portal_access, public.client_portal_permissions,
                     public.client_portal_invitations, public.client_portal_activity_log
FROM atelier_portal_reader;

GRANT SELECT (id, full_name, email, phone, city, style_preferences, photo_url, status)
    ON public.clients TO atelier_portal_reader;

GRANT SELECT (id, client_id, name, description, creation_type, status, occasion, garment_type, target_date, created_at)
    ON public.creations TO atelier_portal_reader;

GRANT SELECT (id, client_id, appointment_type, status, starts_at, ends_at, location_space, preparation_notes, client_visibility)
    ON public.atelier_appointments TO atelier_portal_reader;

GRANT SELECT (id, creation_id, session_number, round_type, title, status, scheduled_at, conducted_at, location_note, client_visibility)
    ON public.atelier_fitting_sessions TO atelier_portal_reader;

GRANT SELECT (id, creation_id, quote_number, currency, total_price, payment_instructions, valid_until, status, accepted_at)
    ON public.commercial_quotes TO atelier_portal_reader;

GRANT SELECT (id, client_id, session_date, status, unit_system, version_number)
    ON public.measurement_sessions TO atelier_portal_reader;

GRANT SELECT (id, client_id, auth_user_id, status)
    ON public.client_portal_access TO atelier_portal_reader;

-- 8.2 ACLs de Funciones (mínimo privilegio + cierre de oráculo RPC)
REVOKE ALL ON FUNCTION public.get_portal_access_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_access_id() TO atelier_portal_reader, authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.get_portal_client_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_client_id() TO atelier_portal_reader, authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.has_portal_permission(TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_portal_permission(TEXT, TEXT, UUID) TO atelier_portal_reader, authenticated, service_role, postgres;

-- Cerrado a PUBLIC, anon y authenticated para evitar oráculo /rest/v1/rpc/portal_owns_creation
REVOKE ALL ON FUNCTION public.portal_owns_creation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_owns_creation(UUID) TO atelier_portal_reader, service_role, postgres;

REVOKE ALL ON FUNCTION public.log_portal_event(TEXT, JSONB) FROM PUBLIC, anon, atelier_portal_reader;
GRANT EXECUTE ON FUNCTION public.log_portal_event(TEXT, JSONB) TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public._portal_lookup_auth_user_by_email(TEXT) FROM PUBLIC, anon, authenticated, atelier_portal_reader;
GRANT EXECUTE ON FUNCTION public._portal_lookup_auth_user_by_email(TEXT) TO service_role, postgres;

REVOKE ALL ON FUNCTION public.claim_portal_invitation(TEXT, UUID) FROM PUBLIC, anon, authenticated, atelier_portal_reader;
GRANT EXECUTE ON FUNCTION public.claim_portal_invitation(TEXT, UUID) TO service_role, postgres;

REVOKE ALL ON FUNCTION public.release_portal_invitation(TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated, atelier_portal_reader;
GRANT EXECUTE ON FUNCTION public.release_portal_invitation(TEXT, UUID, TEXT, BOOLEAN) TO service_role, postgres;

REVOKE ALL ON FUNCTION public.finalize_portal_invitation(TEXT, UUID, UUID, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated, atelier_portal_reader;
GRANT EXECUTE ON FUNCTION public.finalize_portal_invitation(TEXT, UUID, UUID, TEXT, JSONB, TEXT, TEXT, TEXT) TO service_role, postgres;

-- Helper de escritura de triggers business (bloqueado fuera de triggers mediante pg_trigger_depth() < 1)
REVOKE ALL ON FUNCTION public._portal_write_business_audit_row(UUID, UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, atelier_portal_reader;
GRANT EXECUTE ON FUNCTION public._portal_write_business_audit_row(UUID, UUID, UUID, TEXT, TEXT, JSONB) TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public._portal_audit_business_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._portal_audit_business_change() TO authenticated, service_role, postgres;

-- 8.3 ACLs de Tablas M09 y las 6 Vistas v_portal_* (cero privilegios a PUBLIC y anon)
REVOKE ALL ON TABLE public.client_portal_access, public.client_portal_invitations,
                     public.client_portal_permissions, public.client_portal_activity_log
FROM PUBLIC, anon;

REVOKE ALL ON public.v_portal_client_profile, public.v_portal_creations,
             public.v_portal_appointments, public.v_portal_fitting_sessions,
             public.v_portal_commercial_quotes, public.v_portal_measurement_sessions
FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_portal_access,
                                              public.client_portal_invitations,
                                              public.client_portal_permissions
TO authenticated;

-- C-07: solo SELECT para authenticated (controlado por RLS admin/telemetry propia); cero INSERT/UPDATE/DELETE directos
REVOKE ALL ON TABLE public.client_portal_activity_log FROM PUBLIC, anon, authenticated, atelier_portal_reader;
GRANT SELECT ON TABLE public.client_portal_activity_log TO authenticated;
GRANT SELECT, INSERT ON TABLE public.client_portal_activity_log TO service_role, postgres;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_portal_access,
                                              public.client_portal_invitations,
                                              public.client_portal_permissions
TO service_role, postgres;

GRANT SELECT ON public.v_portal_client_profile, public.v_portal_creations,
                public.v_portal_appointments, public.v_portal_fitting_sessions,
                public.v_portal_commercial_quotes, public.v_portal_measurement_sessions
TO authenticated, service_role, postgres;

-- ==============================================================================
-- FASE 9: VERIFICACIÓN INTRA-TRANSACCIONAL POST-MIGRACIÓN (DO $$)
-- ==============================================================================
DO $$
DECLARE
    v_bypass BOOLEAN;
    v_canlogin BOOLEAN;
    v_view_count INT;
    v_apr_policy_count INT;
    v_col_grant_count INT;
BEGIN
    -- 9.1 Rol atelier_portal_reader sin BYPASSRLS ni LOGIN
    SELECT rolbypassrls, rolcanlogin INTO v_bypass, v_canlogin
    FROM pg_catalog.pg_roles
    WHERE rolname = 'atelier_portal_reader';

    IF v_bypass IS DISTINCT FROM false OR v_canlogin IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'Post-check fallido: atelier_portal_reader debe tener rolbypassrls=false y rolcanlogin=false.' USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.has_table_privilege('atelier_portal_reader', 'public.client_portal_permissions', 'SELECT')
       OR pg_catalog.has_table_privilege('atelier_portal_reader', 'public.client_portal_invitations', 'SELECT')
       OR pg_catalog.has_table_privilege('atelier_portal_reader', 'public.client_portal_activity_log', 'SELECT') THEN
        RAISE EXCEPTION 'Post-check fallido: atelier_portal_reader no debe tener acceso a tablas internas M09.' USING ERRCODE = '42501';
    END IF;

    -- 9.2 Membresía mínima controlada en pg_auth_members (PG 16/17: inherit_option=false, set_option=true solo para postgres; 0 para authenticated/anon)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_auth_members m
        JOIN pg_catalog.pg_roles r ON m.roleid = r.oid
        JOIN pg_catalog.pg_roles mbr ON m.member = mbr.oid
        WHERE r.rolname = 'atelier_portal_reader'
          AND mbr.rolname = 'postgres'
          AND m.inherit_option = false
          AND m.set_option = true
    ) OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_auth_members m
        JOIN pg_catalog.pg_roles r ON m.roleid = r.oid
        JOIN pg_catalog.pg_roles mbr ON m.member = mbr.oid
        WHERE r.rolname = 'atelier_portal_reader'
          AND (
              mbr.rolname IN ('authenticated', 'anon', 'PUBLIC')
              OR (mbr.rolname = 'postgres' AND m.inherit_option = true)
          )
    ) THEN
        RAISE EXCEPTION 'Post-check fallido: membresía inválida en pg_auth_members para atelier_portal_reader.' USING ERRCODE = '42501';
    END IF;

    -- 9.3 Exactamente 56 privilegios de columna para atelier_portal_reader (incluyendo client_visibility en fittings)
    SELECT pg_catalog.count(*) INTO v_col_grant_count
    FROM information_schema.role_column_grants
    WHERE grantee = 'atelier_portal_reader'
      AND table_schema = 'public'
      AND privilege_type = 'SELECT';

    IF v_col_grant_count <> 56 THEN
        RAISE EXCEPTION 'Post-check fallido: se esperaban exactamente 56 column grants SELECT para atelier_portal_reader (encontrados: %).', v_col_grant_count USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.role_column_grants
        WHERE grantee = 'atelier_portal_reader'
          AND table_schema = 'public'
          AND table_name = 'atelier_fitting_sessions'
          AND column_name = 'client_visibility'
          AND privilege_type = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Post-check fallido: falta GRANT SELECT(client_visibility) sobre atelier_fitting_sessions.' USING ERRCODE = '42501';
    END IF;

    -- 9.4 Las 6 vistas pertenecen a atelier_portal_reader con security_barrier=true y security_invoker=false
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
        RAISE EXCEPTION 'Post-check fallido: las 6 vistas v_portal_* deben tener owner atelier_portal_reader, security_barrier=true y security_invoker=false (encontradas: %).', v_view_count USING ERRCODE = '42501';
    END IF;

    -- 9.5 Cero políticas USING (true) para atelier_portal_reader y exactamente 7 políticas acotadas
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND 'atelier_portal_reader' = ANY(roles)
          AND pg_catalog.lower(pg_catalog.btrim(qual)) = 'true'
    ) THEN
        RAISE EXCEPTION 'Post-check fallido: detectada política insegura USING (true) para atelier_portal_reader.' USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.count(*) INTO v_apr_policy_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND 'atelier_portal_reader' = ANY(roles);

    IF v_apr_policy_count <> 7 THEN
        RAISE EXCEPTION 'Post-check fallido: se esperaban exactamente 7 políticas TO atelier_portal_reader (encontradas: %).', v_apr_policy_count USING ERRCODE = '42501';
    END IF;

    -- 9.6 Cierre total de INSERT/UPDATE/DELETE directo en bitácora (C-07) y cierre de oráculo RPC
    IF pg_catalog.has_table_privilege('authenticated', 'public.client_portal_activity_log', 'INSERT')
       OR pg_catalog.has_table_privilege('authenticated', 'public.client_portal_activity_log', 'UPDATE')
       OR pg_catalog.has_table_privilege('authenticated', 'public.client_portal_activity_log', 'DELETE')
       OR pg_catalog.has_table_privilege('anon', 'public.client_portal_activity_log', 'INSERT') THEN
        RAISE EXCEPTION 'Post-check fallido (C-07): client_portal_activity_log aún permite escritura directa.' USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.has_function_privilege('authenticated', 'public.portal_owns_creation(uuid)', 'EXECUTE')
       OR pg_catalog.has_function_privilege('anon', 'public.portal_owns_creation(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Post-check fallido: portal_owns_creation(uuid) expuesta a authenticated/anon.' USING ERRCODE = '42501';
    END IF;

    -- 9.7 RLS activado en las 4 tablas M09
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname IN ('client_portal_access', 'client_portal_invitations', 'client_portal_permissions', 'client_portal_activity_log')
          AND c.relrowsecurity IS DISTINCT FROM true
    ) THEN
        RAISE EXCEPTION 'Post-check fallido: alguna tabla M09 no tiene RLS habilitado.' USING ERRCODE = '42501';
    END IF;

    RAISE NOTICE '>>> [M09-A v2.11 POST-CHECK] Verificación estructural completada (E1 SQL lista para pruebas empíricas en Staging).';
END;
$$;

COMMIT;
