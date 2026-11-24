-- ==============================================================================
-- ATELIER DIGITAL — M09 SQL FIX: REPLACE pg_catalog.nullif( WITH NULLIF(
-- Archivo: supabase/migrations/20261124150000_m09_fix_nullif_syntax_in_portal_functions.sql
-- ==============================================================================
-- Motivo:
--   En PostgreSQL, NULLIF(a, b) es una palabra clave de gramática SQL (no una
--   función invocable en pg_catalog). En 20261118000000_client_portal_m09.sql
--   se calificaron 21 referencias como pg_catalog.nullif(...) en 3 funciones,
--   provocando SQLSTATE 42883 al ejecutarse en tiempo real.
--
-- Alcance estricto:
--   Reemplazar exclusivamente las 21 referencias pg_catalog.nullif( -> NULLIF(
--   en:
--     1. public._portal_audit_business_change() (3 ocurrencias)
--     2. public.log_portal_event(TEXT, JSONB)   (1 ocurrencia)
--     3. public.finalize_portal_invitation(...) (17 ocurrencias)
--   Preserva íntegramente firmas, tipos, lógica, SECURITY DEFINER,
--   SET search_path = '', propietarios, ACLs, triggers, RLS y vistas.
-- ==============================================================================

BEGIN;

-- 1. Pre-check estricto: confirmar que existen las 3 funciones y exactamente 21 ocurrencias
DO $$
DECLARE
    v_hits_audit INT;
    v_hits_log INT;
    v_hits_finalize INT;
    v_hits_other INT;
BEGIN
    SELECT (SELECT count(*) FROM regexp_matches(p.prosrc, 'pg_catalog\.nullif\s*\(', 'gi'))
      INTO v_hits_audit
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = '_portal_audit_business_change'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
       AND p.prosecdef = false;

    SELECT (SELECT count(*) FROM regexp_matches(p.prosrc, 'pg_catalog\.nullif\s*\(', 'gi'))
      INTO v_hits_log
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'log_portal_event'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_event_type text, p_metadata jsonb'
       AND p.prosecdef = true;

    SELECT (SELECT count(*) FROM regexp_matches(p.prosrc, 'pg_catalog\.nullif\s*\(', 'gi'))
      INTO v_hits_finalize
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'finalize_portal_invitation'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_token_hash text, p_operation_id uuid, p_auth_user_id uuid, p_full_name text, p_legal_consents jsonb, p_client_ip text, p_user_agent text, p_ip_source text'
       AND p.prosecdef = true;

    SELECT count(*)
      INTO v_hits_other
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosrc ~* 'pg_catalog\.nullif\s*\('
       AND p.proname NOT IN ('_portal_audit_business_change', 'log_portal_event', 'finalize_portal_invitation');

    IF COALESCE(v_hits_audit, -1) <> 3
       OR COALESCE(v_hits_log, -1) <> 1
       OR COALESCE(v_hits_finalize, -1) <> 17
       OR COALESCE(v_hits_other, -1) <> 0 THEN
        RAISE EXCEPTION 'Pre-check SQL FIX fallido: ocurrencias inesperadas (audit=%, log=%, finalize=%, other=%).',
            v_hits_audit, v_hits_log, v_hits_finalize, v_hits_other
            USING ERRCODE = '42501';
    END IF;
END;
$$;

-- 2. Reemplazo sintáctico exclusivo en las 3 funciones (CREATE OR REPLACE preserva OID, owner, triggers y ACLs)
CREATE OR REPLACE FUNCTION public._portal_audit_business_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_current_user TEXT := current_user;
    v_session_user TEXT := session_user;
    v_uid UUID := auth.uid();
    v_raw_claims TEXT := NULLIF(pg_catalog.current_setting('request.jwt.claims', true), '');
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
        v_guc_op := NULLIF(pg_catalog.current_setting('app.portal_audit_operation_id', true), '');
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

        v_guc_actor := NULLIF(pg_catalog.current_setting('app.portal_audit_actor_id', true), '');
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
$function$;

CREATE OR REPLACE FUNCTION public.log_portal_event(p_event_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        'telemetry', 'client', p_event_type, v_safe_metadata, NULL, NULLIF(v_ua, ''), pg_catalog.now()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_portal_invitation(p_token_hash text, p_operation_id uuid, p_auth_user_id uuid, p_full_name text DEFAULT NULL::text, p_legal_consents jsonb DEFAULT NULL::jsonb, p_client_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_ip_source text DEFAULT 'unavailable'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    v_clean_ip_source TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_ip_source), ''), 'unavailable');
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
        NULLIF(pg_catalog.btrim(p_full_name), ''),
        NULLIF(pg_catalog.btrim(v_client_full_name), ''),
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
        NULLIF(pg_catalog.btrim(p_legal_consents->>'termsVersion'), ''),
        NULLIF(pg_catalog.btrim(p_legal_consents->>'terms_version'), ''),
        '1.0'
    );
    v_privacy_version := COALESCE(
        NULLIF(pg_catalog.btrim(p_legal_consents->>'privacyVersion'), ''),
        NULLIF(pg_catalog.btrim(p_legal_consents->>'privacy_version'), ''),
        '1.0'
    );

    SELECT
        EXISTS (SELECT 1 FROM public.user_legal_consents WHERE user_id = p_auth_user_id AND consent_type = 'AGE_CONFIRMATION' AND document_version = '1.0' AND status = 'granted'),
        EXISTS (SELECT 1 FROM public.user_legal_consents WHERE user_id = p_auth_user_id AND consent_type = 'TERMS_OF_SERVICE' AND document_version = v_terms_version AND status = 'granted'),
        EXISTS (SELECT 1 FROM public.user_legal_consents WHERE user_id = p_auth_user_id AND consent_type = 'PRIVACY_POLICY' AND document_version = v_privacy_version AND status = 'granted')
    INTO v_has_age, v_has_terms, v_has_privacy;

    -- Parseo seguro de booleanos JSONB sin casteo directo ::boolean (evita SQLSTATE 22P02 ante texto malformado)
    v_req_age := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(p_legal_consents->>'ageConfirmed'), ''),
        NULLIF(pg_catalog.btrim(p_legal_consents->>'age_confirmed'), ''),
        'false'
    ))) = 'true');
    v_req_terms := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(p_legal_consents->>'termsAccepted'), ''),
        NULLIF(pg_catalog.btrim(p_legal_consents->>'terms_accepted'), ''),
        'false'
    ))) = 'true');
    v_req_privacy := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(p_legal_consents->>'privacyAccepted'), ''),
        NULLIF(pg_catalog.btrim(p_legal_consents->>'privacy_accepted'), ''),
        'false'
    ))) = 'true');
    v_req_marketing := (pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(p_legal_consents->>'marketingOptIn'), ''),
        NULLIF(pg_catalog.btrim(p_legal_consents->>'marketing_opt_in'), ''),
        'false'
    ))) = 'true');

    IF (NOT v_has_age AND NOT v_req_age) OR (NOT v_has_terms AND NOT v_req_terms) OR (NOT v_has_privacy AND NOT v_req_privacy) THEN
        RAISE EXCEPTION 'Aceptación legal Ley 1581 obligatoria (mayoría de edad, términos y privacidad) requerida.'
            USING ERRCODE = '22023';
    END IF;

    -- Validación fail-closed mediante tipo inet nativo (rechaza octetos >255, CIDR '/' y rangos loopback/privados/link-local/CGNAT)
    IF p_client_ip IS NOT NULL THEN
        v_clean_ip := NULLIF(pg_catalog.btrim(p_client_ip), '');
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

    v_clean_ua := NULLIF(
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
$function$;

-- 3. Post-check intra-transaccional: 0 ocurrencias restantes + invariancia de seguridad y triggers
DO $$
DECLARE
    v_remaining INT;
    v_trigger_count INT;
BEGIN
    SELECT count(*)
      INTO v_remaining
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosrc ~* 'pg_catalog\.nullif\s*\(';

    IF v_remaining <> 0 THEN
        RAISE EXCEPTION 'Post-check SQL FIX fallido: aún existen % funciones con pg_catalog.nullif.', v_remaining
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = '_portal_audit_business_change'
           AND p.prosecdef = false AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
           AND 'search_path=""' = ANY(p.proconfig)
           AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
           AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
    ) THEN
        RAISE EXCEPTION 'Post-check SQL FIX fallido en atributos/ACL de _portal_audit_business_change.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'log_portal_event'
           AND p.prosecdef = true AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
           AND 'search_path=""' = ANY(p.proconfig)
           AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
           AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
    ) THEN
        RAISE EXCEPTION 'Post-check SQL FIX fallido en atributos/ACL de log_portal_event.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'finalize_portal_invitation'
           AND p.prosecdef = true AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
           AND 'search_path=""' = ANY(p.proconfig)
           AND NOT pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
           AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
           AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) THEN
        RAISE EXCEPTION 'Post-check SQL FIX fallido en atributos/ACL de finalize_portal_invitation.' USING ERRCODE = '42501';
    END IF;

    SELECT count(*)
      INTO v_trigger_count
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = '_portal_audit_business_change'
       AND NOT t.tgisinternal;

    IF v_trigger_count <> 3 THEN
        RAISE EXCEPTION 'Post-check SQL FIX fallido: se esperaban 3 triggers sobre _portal_audit_business_change (encontrados: %).', v_trigger_count
            USING ERRCODE = '42501';
    END IF;
END;
$$;

COMMIT;
