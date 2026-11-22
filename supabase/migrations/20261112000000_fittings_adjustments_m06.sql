-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 06: PRUEBAS DE VESTUARIO, AJUSTES Y ENTREGA (BLOQUE 1)
-- Archivo: supabase/migrations/20261112000000_fittings_adjustments_m06.sql
-- Revisión Final: Orden Global de Bloqueos 1->7, Cero Deadlocks, Idempotencia
--                 Multimedia, row_version Obligatorio y approval_scope Explícito.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. TABLA 1/2: SESIONES DE FITTING / PRUEBAS DE VESTUARIO (atelier_fitting_sessions)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_fitting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.atelier_projects(id) ON DELETE SET NULL,
    pattern_execution_id UUID REFERENCES public.pattern_executions(id) ON DELETE SET NULL,

    session_number INT NOT NULL CHECK (session_number >= 1),
    round_type TEXT NOT NULL DEFAULT 'toile_first'
        CHECK (round_type IN (
            'toile_first',      -- 1ª Prueba en glasilla / muselina
            'second_fitting',   -- 2ª Prueba en tela definitiva / hilván avanzado
            'final_fitting',    -- Prueba final / postura con calzado y acabados
            'alteration_check', -- Revisión de transformación o restauración
            'extra_fitting'     -- Prueba intermedia adicional
        )),
    title TEXT NOT NULL CHECK (pg_catalog.btrim(title) <> ''),
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN (
            'scheduled',            -- Programada / por realizar
            'completed',            -- Realizada sin ajustes abiertos (pendiente dictamen)
            'adjustments_required', -- Realizada con ajustes abiertos por atender
            'approved',             -- Calce físico aprobado y sellado (ver approval_scope)
            'cancelled'             -- Cita programada cancelada antes de realizarse (inmutable)
        )),

    scheduled_at TIMESTAMPTZ,
    conducted_at TIMESTAMPTZ,
    location_note TEXT,           -- Ej: "Atelier Principal · Probador 1"
    garment_state_note TEXT,      -- Ej: "Glasilla completa con hombrera base"
    footwear_heel_cm NUMERIC(4,1) -- Altura de tacón de referencia para bastilla/ruedo
        CHECK (footwear_heel_cm IS NULL OR (footwear_heel_cm >= 0 AND footwear_heel_cm <= 25)),

    balance_assessment TEXT NOT NULL DEFAULT 'pending'
        CHECK (balance_assessment IN ('pending', 'balanced', 'minor_tweaks', 'structural_revision')),
    summary_notes TEXT,           -- Notas de calce, caída, aplomo y postura sobre cuerpo real
    client_feedback_notes TEXT,   -- Percepción de comodidad y gusto expresado por la clienta
    requires_cad_revision BOOLEAN NOT NULL DEFAULT FALSE,

    -- Aprobación física de calce (distingue ronda intermedia vs. aprobación final para entrega)
    approval_scope TEXT
        CHECK (approval_scope IS NULL OR approval_scope IN ('intermediate_round', 'final_for_delivery')),
    fit_approved_at TIMESTAMPTZ,
    fit_approved_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    fit_approved_by_name TEXT,
    fit_approval_notes TEXT,
    approval_idempotency_key TEXT,

    -- Cancelación auditada (solo desde 'scheduled' sin hallazgos ni fotos)
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    cancellation_reason TEXT,

    -- Ceremonial de entrega (máximo 1 sesión por Creación y solo sobre final_for_delivery)
    delivery_confirmed_at TIMESTAMPTZ,
    delivery_confirmed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    delivery_confirmed_by_name TEXT,
    delivery_notes TEXT,
    delivery_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_idempotency_key TEXT,
    delivery_intent_fingerprint TEXT,

    -- Idempotencia de creación/actualización, recibos multimedia, versión y futuro M09/M10
    idempotency_key TEXT,
    last_update_idempotency_key TEXT,
    media_delete_receipts JSONB NOT NULL DEFAULT '{}'::jsonb,
    row_version INT NOT NULL DEFAULT 1 CHECK (row_version >= 1),
    client_visibility TEXT NOT NULL DEFAULT 'internal_only'
        CHECK (client_visibility IN ('internal_only', 'summary_ready')),
    structured_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

    CONSTRAINT uq_atelier_fitting_sessions_id_creation UNIQUE (id, creation_id),
    CONSTRAINT uq_atelier_fitting_sessions_creation_number UNIQUE (creation_id, session_number),
    CONSTRAINT chk_m06_session_completed_has_conducted CHECK (
        status NOT IN ('completed', 'adjustments_required', 'approved')
        OR conducted_at IS NOT NULL
    ),
    CONSTRAINT chk_m06_session_approved_fields CHECK (
        (status <> 'approved' AND approval_scope IS NULL)
        OR (
            status = 'approved'
            AND approval_scope IN ('intermediate_round', 'final_for_delivery')
            AND conducted_at IS NOT NULL
            AND fit_approved_at IS NOT NULL
            AND fit_approved_by IS NOT NULL
        )
    ),
    CONSTRAINT chk_m06_session_cancelled_fields CHECK (
        (status <> 'cancelled')
        OR (
            conducted_at IS NULL
            AND approval_scope IS NULL
            AND fit_approved_at IS NULL
            AND delivery_confirmed_at IS NULL
            AND delivery_intent_fingerprint IS NULL
            AND cancelled_at IS NOT NULL
            AND cancelled_by IS NOT NULL
        )
    ),
    CONSTRAINT chk_m06_session_delivery_requires_fit_approval CHECK (
        (delivery_confirmed_at IS NULL AND delivery_intent_fingerprint IS NULL)
        OR (
            delivery_confirmed_at IS NOT NULL
            AND status = 'approved'
            AND approval_scope = 'final_for_delivery'
            AND fit_approved_at IS NOT NULL
            AND fit_approved_by IS NOT NULL
            AND delivery_confirmed_by IS NOT NULL
            AND delivery_intent_fingerprint IS NOT NULL
            AND pg_catalog.btrim(delivery_intent_fingerprint) <> ''
        )
    ),
    CONSTRAINT chk_m06_session_checklist_object CHECK (
        pg_catalog.jsonb_typeof(delivery_checklist) = 'object'
    ),
    CONSTRAINT chk_m06_session_delete_receipts_object CHECK (
        pg_catalog.jsonb_typeof(media_delete_receipts) = 'object'
    ),
    CONSTRAINT chk_m06_session_metadata_object CHECK (
        pg_catalog.jsonb_typeof(structured_metadata) = 'object'
    )
);

COMMENT ON TABLE public.atelier_fitting_sessions IS 'M06: Sesiones físicas de prueba de vestuario (con alcance explícito intermedio vs. final_for_delivery) y ceremonial único de entrega.';

-- ==============================================================================
-- 2. TABLA 2/2: CORRECCIONES FÍSICAS EN PRENDA (atelier_fitting_adjustments)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_fitting_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    fitting_session_id UUID NOT NULL,
    related_pattern_adjustment_id UUID REFERENCES public.pattern_adjustments(id) ON DELETE SET NULL,

    zone_code TEXT NOT NULL
        CHECK (zone_code IN (
            'escote', 'hombro', 'sisa', 'busto', 'cintura', 'cadera',
            'centro_delantero', 'centro_espalda', 'costado',
            'manga', 'copa_manga', 'largo', 'ruedo', 'forro_acabado', 'otro'
        )),
    adjustment_kind TEXT NOT NULL
        CHECK (adjustment_kind IN (
            'hem',                  -- Bastilla / largo final con calzado
            'silhouette_pin',       -- Entalle o pinza marcada con alfileres en cuerpo real
            'shoulder_pad',         -- Hombrera, inclinación u aplomo de hombro
            'neckline_contour',     -- Asentado o escote en busto/espalda
            'armhole_sleeve',       -- Desahogo de sisa o caída de manga
            'closure_fastening',    -- Cremallera, corchetes, ojales, botonadura
            'lining_structure',     -- Forrería, ballenas, entretela interna
            'drape_embroidery',     -- Drapeado artesanal, encaje o pedrería
            'cad_repattern_needed', -- Requiere nueva ejecución paramétrica en M02
            'other'
        )),
    severity TEXT NOT NULL DEFAULT 'normal'
        CHECK (severity IN ('minor', 'normal', 'critical')),
    requires_cad_update BOOLEAN NOT NULL DEFAULT FALSE,

    description TEXT NOT NULL CHECK (pg_catalog.btrim(description) <> ''),
    delta_mm NUMERIC(7,1),
    workshop_notes TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',   -- Detectado en prueba; pendiente de intervención en taller
            'applied',   -- Ejecutado en prenda por taller; pendiente de validar en cuerpo real
            'verified',  -- Verificado conforme en prueba física (terminal inmutable)
            'waived',    -- Dispensado explícitamente con motivo (solo minor/normal; terminal inmutable)
            'cancelled'  -- Descartado con motivo auditable por diseño/clienta (terminal inmutable)
        )),

    -- Autoría progresiva de ciclo de vida (todas con ON DELETE RESTRICT)
    applied_at TIMESTAMPTZ,
    applied_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    applied_by_name TEXT,

    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    verified_by_name TEXT,
    verified_in_session_id UUID REFERENCES public.atelier_fitting_sessions(id) ON DELETE SET NULL,

    waived_at TIMESTAMPTZ,
    waived_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    waived_by_name TEXT,
    waived_in_session_id UUID REFERENCES public.atelier_fitting_sessions(id) ON DELETE SET NULL,
    waiver_reason TEXT,

    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    cancelled_by_name TEXT,
    cancellation_reason TEXT,

    idempotency_key TEXT,
    resolution_idempotency_key TEXT,
    row_version INT NOT NULL DEFAULT 1 CHECK (row_version >= 1),

    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

    -- Clave foránea compuesta: imposible vincular un ajuste a una sesión de otra Creación
    CONSTRAINT fk_m06_adj_session_creation
        FOREIGN KEY (fitting_session_id, creation_id)
        REFERENCES public.atelier_fitting_sessions(id, creation_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_m06_adj_applied_fields CHECK (
        status <> 'applied' OR (applied_at IS NOT NULL AND applied_by IS NOT NULL)
    ),
    CONSTRAINT chk_m06_adj_verified_timestamps CHECK (
        status <> 'verified' OR (verified_at IS NOT NULL AND verified_by IS NOT NULL)
    ),
    CONSTRAINT chk_m06_adj_no_waiver_on_critical CHECK (
        status <> 'waived' OR severity <> 'critical'
    ),
    CONSTRAINT chk_m06_adj_waived_fields CHECK (
        status <> 'waived'
        OR (
            waived_at IS NOT NULL
            AND waived_by IS NOT NULL
            AND pg_catalog.btrim(COALESCE(waiver_reason, '')) <> ''
        )
    ),
    CONSTRAINT chk_m06_adj_cancelled_fields CHECK (
        status <> 'cancelled'
        OR (
            cancelled_at IS NOT NULL
            AND cancelled_by IS NOT NULL
            AND pg_catalog.btrim(COALESCE(cancellation_reason, '')) <> ''
        )
    )
);

COMMENT ON TABLE public.atelier_fitting_adjustments IS 'M06: Checklist auditable sin borrado operativo de correcciones físicas en prenda, con dispensa auditada y protección de autoría.';

-- ==============================================================================
-- 3. EXTENSIÓN ADITIVA DE TABLA EXISTENTE: commercial_media_assets (M03 -> M06)
-- ==============================================================================

ALTER TABLE public.commercial_media_assets
    ADD COLUMN IF NOT EXISTS fitting_session_id UUID REFERENCES public.atelier_fitting_sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

COMMENT ON COLUMN public.commercial_media_assets.fitting_session_id IS 'M06: Vínculo opcional a sesión física de prueba para fotos (fitting_photo) o acta/soporte de entrega (delivery_note).';
COMMENT ON COLUMN public.commercial_media_assets.idempotency_key IS 'M06: Llave opcional de idempotencia para evitar duplicación de registros multimedia ante reintentos.';

-- ==============================================================================
-- 4. FUNCIONES DE AUDITORÍA, INTEGRIDAD, AUTORÍA Y SINCRONIZACIÓN M03
-- ==============================================================================

-- 4.1. Actualización automática determinista de updated_at y row_version
CREATE OR REPLACE FUNCTION public.update_m06_audit_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    NEW.row_version = OLD.row_version + 1;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_m06_audit_columns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_m06_audit_columns() TO authenticated, service_role, postgres;

-- 4.2. Helper interno para obtener nombre legible de actor autenticado
CREATE OR REPLACE FUNCTION public.m06_resolve_actor_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT NULLIF(pg_catalog.btrim(full_name), '')
    FROM public.profiles
    WHERE id = p_user_id
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.m06_resolve_actor_name(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m06_resolve_actor_name(UUID) TO service_role, postgres;

-- 4.2b. Helper interno para huella normalizada SHA-256 de intención de entrega M06 (sobre fecha efectiva aplicada)
CREATE OR REPLACE FUNCTION public.m06_compute_delivery_intent_fingerprint(
    p_session_id UUID,
    p_delivery_idempotency_key TEXT,
    p_delivery_notes TEXT,
    p_delivery_checklist JSONB,
    p_effective_local_date DATE,
    p_delivery_note_asset JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    v_clean_notes TEXT := NULLIF(pg_catalog.btrim(p_delivery_notes), '');
    v_clean_checklist JSONB := COALESCE(p_delivery_checklist, '{}'::jsonb);
    v_note_path TEXT;
    v_note_idem TEXT;
    v_note_name TEXT;
    v_note_mime TEXT;
    v_note_size BIGINT;
    v_note_desc TEXT;
    v_normalized_note JSONB := NULL;
    v_canonical_intent JSONB;
BEGIN
    IF p_effective_local_date IS NULL THEN
        RAISE EXCEPTION 'Integridad M06: p_effective_local_date es obligatorio para calcular la huella de entrega.'
            USING ERRCODE = '23514';
    END IF;

    IF pg_catalog.jsonb_typeof(v_clean_checklist) <> 'object' THEN
        RAISE EXCEPTION 'Integridad M06: p_delivery_checklist debe ser un objeto JSON válido.'
            USING ERRCODE = '23514';
    END IF;

    IF p_delivery_note_asset IS NOT NULL THEN
        IF pg_catalog.jsonb_typeof(p_delivery_note_asset) <> 'object' THEN
            RAISE EXCEPTION 'Integridad M06: p_delivery_note_asset debe ser un objeto JSON válido.'
                USING ERRCODE = '23514';
        END IF;

        v_note_path := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'file_path'), '');
        IF p_delivery_note_asset <> '{}'::jsonb AND v_note_path IS NULL THEN
            RAISE EXCEPTION 'Integridad M06: p_delivery_note_asset requiere file_path no vacío cuando se adjunta soporte.'
                USING ERRCODE = '23514';
        END IF;

        IF v_note_path IS NOT NULL THEN
            v_note_idem := COALESCE(NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'idempotency_key'), ''), 'delivery_note:' || p_delivery_idempotency_key);
            v_note_name := COALESCE(NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'file_name'), ''), 'acta_entrega');
            v_note_mime := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'mime_type'), '');
            v_note_size := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'file_size_bytes'), '')::bigint;
            v_note_desc := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'description'), '');

            v_normalized_note := pg_catalog.jsonb_build_object(
                'file_path', v_note_path,
                'idempotency_key', v_note_idem,
                'file_name', v_note_name,
                'mime_type', v_note_mime,
                'file_size_bytes', v_note_size,
                'description', v_note_desc
            );
        END IF;
    END IF;

    v_canonical_intent := pg_catalog.jsonb_build_object(
        'session_id', p_session_id,
        'delivery_notes', v_clean_notes,
        'delivery_checklist', v_clean_checklist,
        'effective_local_date', p_effective_local_date,
        'delivery_note_asset', v_normalized_note
    );

    RETURN pg_catalog.encode(
        pg_catalog.sha256(pg_catalog.convert_to(v_canonical_intent::text, 'UTF8')),
        'hex'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.m06_compute_delivery_intent_fingerprint(UUID, TEXT, TEXT, JSONB, DATE, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m06_compute_delivery_intent_fingerprint(UUID, TEXT, TEXT, JSONB, DATE, JSONB) TO service_role, postgres;

-- 4.3. Helper interno de progresión monótona M03 (Niveles 5 y 6; asume Nivel 1 creations ya bloqueado)
CREATE OR REPLACE FUNCTION public.m06_project_stage_rank(p_stage TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT CASE p_stage
        WHEN 'planning' THEN 1
        WHEN 'cutting' THEN 2
        WHEN 'pattern_cut' THEN 2
        WHEN 'assembly' THEN 3
        WHEN 'basting' THEN 3
        WHEN 'first_fitting' THEN 4
        WHEN 'adjustments' THEN 5
        WHEN 'fitting_adjustments' THEN 5
        WHEN 'second_fitting' THEN 6
        WHEN 'finishing' THEN 7
        WHEN 'hand_finishing' THEN 7
        WHEN 'delivered' THEN 8
        WHEN 'final_delivery' THEN 8
        ELSE -1
    END;
$$;

REVOKE ALL ON FUNCTION public.m06_project_stage_rank(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m06_project_stage_rank(TEXT) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.m06_sync_m03_state(
    p_creation_id UUID,
    p_project_id UUID,
    p_target_creation_status TEXT DEFAULT NULL,
    p_target_delivery_status TEXT DEFAULT NULL,
    p_target_commercial_status TEXT DEFAULT NULL,
    p_target_project_stage TEXT DEFAULT NULL,
    p_delivery_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_creation_status TEXT;
    v_resolved_project_id UUID;
    v_current_stage TEXT;
    v_cur_rank INT;
    v_tgt_rank INT;
BEGIN
    -- Nivel 1: si se invoca desde las RPCs M06, este lock sobre creations ya está adquirido (reentrante sin espera)
    SELECT status INTO v_creation_status
    FROM public.creations
    WHERE id = p_creation_id
    FOR UPDATE;

    IF NOT FOUND OR v_creation_status = 'cancelled' THEN
        RETURN;
    END IF;

    -- Actualización monótona sobre creations (Nivel 1)
    IF p_target_creation_status = 'fitting' AND v_creation_status IN ('draft', 'active') THEN
        UPDATE public.creations SET status = 'fitting' WHERE id = p_creation_id;
    ELSIF p_target_creation_status = 'approved' AND v_creation_status IN ('draft', 'active', 'fitting') THEN
        UPDATE public.creations SET status = 'approved' WHERE id = p_creation_id;
    ELSIF p_target_creation_status = 'completed' AND v_creation_status <> 'completed' THEN
        UPDATE public.creations SET status = 'completed' WHERE id = p_creation_id;
    END IF;

    -- Nivel 5: UPSERT seguro sobre creation_commercial_profiles
    IF p_target_delivery_status IS NOT NULL OR p_target_commercial_status IS NOT NULL OR p_delivery_date IS NOT NULL THEN
        INSERT INTO public.creation_commercial_profiles (
            creation_id,
            delivery_status,
            delivery_date_actual,
            commercial_status
        )
        VALUES (
            p_creation_id,
            COALESCE(p_target_delivery_status, 'pending'),
            p_delivery_date,
            COALESCE(p_target_commercial_status, 'draft')
        )
        ON CONFLICT (creation_id) DO UPDATE SET
            delivery_status = CASE
                WHEN creation_commercial_profiles.delivery_status = 'delivered' THEN 'delivered'
                WHEN p_target_delivery_status = 'delivered' THEN 'delivered'
                WHEN p_target_delivery_status = 'ready' THEN 'ready'
                WHEN p_target_delivery_status = 'in_fitting' AND creation_commercial_profiles.delivery_status IN ('pending', 'ready') THEN 'in_fitting'
                ELSE creation_commercial_profiles.delivery_status
            END,
            delivery_date_actual = CASE
                WHEN p_delivery_date IS NOT NULL AND creation_commercial_profiles.delivery_date_actual IS NULL THEN p_delivery_date
                ELSE creation_commercial_profiles.delivery_date_actual
            END,
            commercial_status = CASE
                WHEN creation_commercial_profiles.commercial_status IN ('cancelled', 'delivered') THEN creation_commercial_profiles.commercial_status
                WHEN p_target_commercial_status = 'delivered' THEN 'delivered'
                WHEN p_target_commercial_status = 'ready_for_delivery'
                     AND creation_commercial_profiles.commercial_status IN ('quote_accepted', 'in_production')
                     THEN 'ready_for_delivery'
                ELSE creation_commercial_profiles.commercial_status
            END,
            updated_at = pg_catalog.now();
    END IF;

    -- Nivel 6: progresión monótona sobre atelier_projects
    IF p_target_project_stage IS NOT NULL THEN
        v_resolved_project_id := p_project_id;
        IF v_resolved_project_id IS NULL THEN
            SELECT active_project_id INTO v_resolved_project_id
            FROM public.creation_commercial_profiles
            WHERE creation_id = p_creation_id;
        END IF;
        IF v_resolved_project_id IS NULL THEN
            SELECT id INTO v_resolved_project_id
            FROM public.atelier_projects
            WHERE creation_id = p_creation_id
              AND current_stage <> 'cancelled'
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;

        IF v_resolved_project_id IS NOT NULL THEN
            SELECT current_stage INTO v_current_stage
            FROM public.atelier_projects
            WHERE id = v_resolved_project_id
              AND creation_id = p_creation_id
            FOR UPDATE;

            IF FOUND AND v_current_stage NOT IN ('cancelled', 'delivered', 'final_delivery') THEN
                v_cur_rank := public.m06_project_stage_rank(v_current_stage);
                v_tgt_rank := public.m06_project_stage_rank(p_target_project_stage);

                IF v_tgt_rank > v_cur_rank THEN
                    UPDATE public.atelier_projects
                    SET
                        current_stage = p_target_project_stage,
                        actual_delivery_date = CASE
                            WHEN p_target_project_stage = 'delivered' AND actual_delivery_date IS NULL
                                THEN p_delivery_date
                            ELSE actual_delivery_date
                        END,
                        updated_at = pg_catalog.now()
                    WHERE id = v_resolved_project_id;
                END IF;
            END IF;
        END IF;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.m06_sync_m03_state(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m06_sync_m03_state(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE) TO service_role, postgres;

-- 4.4. Validar coherencia referencial estricta entre sesión, creación, proyecto y patrón M02
CREATE OR REPLACE FUNCTION public.validate_m06_fitting_session_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_creation_client_id UUID;
    v_creation_status TEXT;
    v_project_creation_id UUID;
    v_pattern_creation_id UUID;
    v_pattern_client_id UUID;
BEGIN
    SELECT client_id, status
    INTO v_creation_client_id, v_creation_status
    FROM public.creations
    WHERE id = NEW.creation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Integridad M06: la creación (%) no existe.', NEW.creation_id
            USING ERRCODE = '23503';
    END IF;

    IF TG_OP = 'INSERT' AND v_creation_status = 'cancelled' THEN
        RAISE EXCEPTION 'Integridad M06: no es posible abrir sesiones de prueba sobre una creación cancelada (%).', NEW.creation_id
            USING ERRCODE = '23514';
    END IF;

    IF NEW.project_id IS NOT NULL THEN
        SELECT creation_id INTO v_project_creation_id
        FROM public.atelier_projects
        WHERE id = NEW.project_id;

        IF NOT FOUND OR v_project_creation_id IS DISTINCT FROM NEW.creation_id THEN
            RAISE EXCEPTION 'Integridad M06: project_id (%) no pertenece a la creación (%).', NEW.project_id, NEW.creation_id
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.pattern_execution_id IS NOT NULL THEN
        SELECT creation_id, client_id
        INTO v_pattern_creation_id, v_pattern_client_id
        FROM public.pattern_executions
        WHERE id = NEW.pattern_execution_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Integridad M06: pattern_execution_id (%) inexistente.', NEW.pattern_execution_id
                USING ERRCODE = '23503';
        END IF;

        IF v_pattern_creation_id IS NOT NULL AND v_pattern_creation_id IS DISTINCT FROM NEW.creation_id THEN
            RAISE EXCEPTION 'Integridad M06: pattern_execution_id (%) pertenece a otra creación (%).', NEW.pattern_execution_id, v_pattern_creation_id
                USING ERRCODE = '23514';
        END IF;

        IF v_pattern_client_id IS DISTINCT FROM v_creation_client_id THEN
            RAISE EXCEPTION 'Integridad M06: pattern_execution_id (%) no corresponde a la clienta de la creación (%).', NEW.pattern_execution_id, NEW.creation_id
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_m06_fitting_session_links() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_m06_fitting_session_links() TO authenticated, service_role, postgres;

-- 4.5. Protección completa de historial, autoría y sellado en atelier_fitting_sessions
CREATE OR REPLACE FUNCTION public.protect_m06_fitting_session_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(auth.role(), '');
    v_is_client_role BOOLEAN := (v_jwt_role IN ('authenticated', 'anon'))
        OR (current_user IN ('authenticated', 'anon'));
    v_has_children BOOLEAN := FALSE;
    v_has_open_adjustments BOOLEAN := FALSE;
    v_has_open_creation_adj BOOLEAN := FALSE;
    v_has_adj_req_other_session BOOLEAN := FALSE;
    v_is_fk_set_null_only BOOLEAN := FALSE;
    v_only_delivery_ceremony BOOLEAN := FALSE;
BEGIN
    IF NOT v_is_client_role THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.created_by IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Autoría M06: created_by debe coincidir con el usuario autenticado.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.status IN ('approved', 'cancelled')
           OR NEW.approval_scope IS NOT NULL
           OR NEW.approval_idempotency_key IS NOT NULL
           OR NEW.fit_approved_at IS NOT NULL
           OR NEW.fit_approved_by IS NOT NULL
           OR NEW.delivery_confirmed_at IS NOT NULL
           OR NEW.delivery_confirmed_by IS NOT NULL
           OR NEW.delivery_idempotency_key IS NOT NULL
           OR NEW.delivery_intent_fingerprint IS NOT NULL
           OR NEW.cancelled_at IS NOT NULL
           OR NEW.cancelled_by IS NOT NULL
           OR NEW.media_delete_receipts IS DISTINCT FROM '{}'::jsonb
        THEN
            RAISE EXCEPTION 'Ciclo M06: una sesión nueva no puede registrarse directamente como aprobada, cancelada ni entregada.'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('completed', 'adjustments_required', 'approved', 'cancelled')
           OR OLD.conducted_at IS NOT NULL
           OR OLD.fit_approved_at IS NOT NULL
           OR OLD.delivery_confirmed_at IS NOT NULL
        THEN
            RAISE EXCEPTION 'Política histórica M06: no está permitido eliminar una sesión realizada, cancelada, aprobada o entregada (%).', OLD.id
                USING ERRCODE = '42501';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.atelier_fitting_adjustments
            WHERE fitting_session_id = OLD.id
               OR verified_in_session_id = OLD.id
               OR waived_in_session_id = OLD.id
            UNION ALL
            SELECT 1 FROM public.commercial_media_assets
            WHERE fitting_session_id = OLD.id
        ) INTO v_has_children;

        IF v_has_children THEN
            RAISE EXCEPTION 'Política histórica M06: la sesión (%) ya posee ajustes, referencias o fotografías asociadas y no puede eliminarse.', OLD.id
                USING ERRCODE = '42501';
        END IF;

        RETURN OLD;
    END IF;

    -- UPDATE: permitir únicamente cascada interna RI SET NULL sobre FKs nullable
    IF pg_catalog.pg_trigger_depth() > 0 THEN
        v_is_fk_set_null_only :=
            NEW.id IS NOT DISTINCT FROM OLD.id
            AND NEW.creation_id IS NOT DISTINCT FROM OLD.creation_id
            AND NEW.session_number IS NOT DISTINCT FROM OLD.session_number
            AND NEW.round_type IS NOT DISTINCT FROM OLD.round_type
            AND NEW.title IS NOT DISTINCT FROM OLD.title
            AND NEW.status IS NOT DISTINCT FROM OLD.status
            AND NEW.approval_scope IS NOT DISTINCT FROM OLD.approval_scope
            AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
            AND NEW.conducted_at IS NOT DISTINCT FROM OLD.conducted_at
            AND NEW.location_note IS NOT DISTINCT FROM OLD.location_note
            AND NEW.garment_state_note IS NOT DISTINCT FROM OLD.garment_state_note
            AND NEW.footwear_heel_cm IS NOT DISTINCT FROM OLD.footwear_heel_cm
            AND NEW.balance_assessment IS NOT DISTINCT FROM OLD.balance_assessment
            AND NEW.summary_notes IS NOT DISTINCT FROM OLD.summary_notes
            AND NEW.client_feedback_notes IS NOT DISTINCT FROM OLD.client_feedback_notes
            AND NEW.requires_cad_revision IS NOT DISTINCT FROM OLD.requires_cad_revision
            AND NEW.fit_approved_at IS NOT DISTINCT FROM OLD.fit_approved_at
            AND NEW.fit_approved_by IS NOT DISTINCT FROM OLD.fit_approved_by
            AND NEW.fit_approved_by_name IS NOT DISTINCT FROM OLD.fit_approved_by_name
            AND NEW.fit_approval_notes IS NOT DISTINCT FROM OLD.fit_approval_notes
            AND NEW.approval_idempotency_key IS NOT DISTINCT FROM OLD.approval_idempotency_key
            AND NEW.cancelled_at IS NOT DISTINCT FROM OLD.cancelled_at
            AND NEW.cancelled_by IS NOT DISTINCT FROM OLD.cancelled_by
            AND NEW.cancellation_reason IS NOT DISTINCT FROM OLD.cancellation_reason
            AND NEW.delivery_confirmed_at IS NOT DISTINCT FROM OLD.delivery_confirmed_at
            AND NEW.delivery_confirmed_by IS NOT DISTINCT FROM OLD.delivery_confirmed_by
            AND NEW.delivery_confirmed_by_name IS NOT DISTINCT FROM OLD.delivery_confirmed_by_name
            AND NEW.delivery_notes IS NOT DISTINCT FROM OLD.delivery_notes
            AND NEW.delivery_checklist IS NOT DISTINCT FROM OLD.delivery_checklist
            AND NEW.delivery_idempotency_key IS NOT DISTINCT FROM OLD.delivery_idempotency_key
            AND NEW.delivery_intent_fingerprint IS NOT DISTINCT FROM OLD.delivery_intent_fingerprint
            AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
            AND NEW.last_update_idempotency_key IS NOT DISTINCT FROM OLD.last_update_idempotency_key
            AND NEW.media_delete_receipts IS NOT DISTINCT FROM OLD.media_delete_receipts
            AND NEW.client_visibility IS NOT DISTINCT FROM OLD.client_visibility
            AND NEW.structured_metadata IS NOT DISTINCT FROM OLD.structured_metadata
            AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
            AND NEW.created_by_name IS NOT DISTINCT FROM OLD.created_by_name
            AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
            AND (
                (NEW.project_id IS NULL AND OLD.project_id IS NOT NULL)
                OR (NEW.pattern_execution_id IS NULL AND OLD.pattern_execution_id IS NOT NULL)
            );
        IF v_is_fk_set_null_only THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Inmutabilidad absoluta de creación, numeración, llave de creación y autoría original
    IF NEW.creation_id IS DISTINCT FROM OLD.creation_id
       OR NEW.session_number IS DISTINCT FROM OLD.session_number
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_by_name IS DISTINCT FROM OLD.created_by_name
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR (OLD.idempotency_key IS NOT NULL AND NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key)
    THEN
        RAISE EXCEPTION 'Autoría e integridad M06: no está permitido alterar creación, número de ronda, idempotency_key, created_by o created_at de una sesión.'
            USING ERRCODE = '42501';
    END IF;

    -- Impedir degradación o manipulación directa de row_version
    IF NEW.row_version IS DISTINCT FROM OLD.row_version THEN
        RAISE EXCEPTION 'Concurrencia M06: row_version es gestionada automáticamente por el servidor.'
            USING ERRCODE = '42501';
    END IF;

    -- Proteger bitácora append-only de recibos de eliminación multimedia
    IF NEW.media_delete_receipts IS DISTINCT FROM OLD.media_delete_receipts
       AND NOT (NEW.media_delete_receipts @> OLD.media_delete_receipts)
    THEN
        RAISE EXCEPTION 'Auditoría M06: los recibos existentes en media_delete_receipts son append-only y no pueden borrarse ni reescribirse.'
            USING ERRCODE = '42501';
    END IF;

    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Historial sellado M06: una sesión cancelada es inmutable; programe una nueva sesión.'
            USING ERRCODE = '42501';
    END IF;

    -- Sellado completo de sesión aprobada (lista blanca total de columnas)
    IF OLD.status = 'approved' THEN
        IF OLD.delivery_confirmed_at IS NOT NULL THEN
            RAISE EXCEPTION 'Historial sellado M06: la sesión aprobada con entrega confirmada es completamente inmutable.'
                USING ERRCODE = '42501';
        END IF;

        IF OLD.approval_scope IS DISTINCT FROM 'final_for_delivery' THEN
            RAISE EXCEPTION 'Regla M06: esta sesión tiene aprobación intermedia (%) y queda sellada; la entrega final requiere una sesión aprobada como final_for_delivery.', OLD.approval_scope
                USING ERRCODE = '23514';
        END IF;

        v_only_delivery_ceremony :=
            OLD.delivery_confirmed_at IS NULL
            AND NEW.delivery_confirmed_at IS NOT NULL
            AND NEW.delivery_confirmed_by IS NOT NULL
            AND NEW.delivery_confirmed_by = auth.uid()
            AND NEW.delivery_intent_fingerprint IS NOT NULL
            AND pg_catalog.btrim(NEW.delivery_intent_fingerprint) <> ''
            AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
            AND NEW.pattern_execution_id IS NOT DISTINCT FROM OLD.pattern_execution_id
            AND NEW.round_type IS NOT DISTINCT FROM OLD.round_type
            AND NEW.title IS NOT DISTINCT FROM OLD.title
            AND NEW.status IS NOT DISTINCT FROM OLD.status
            AND NEW.approval_scope IS NOT DISTINCT FROM OLD.approval_scope
            AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
            AND NEW.conducted_at IS NOT DISTINCT FROM OLD.conducted_at
            AND NEW.location_note IS NOT DISTINCT FROM OLD.location_note
            AND NEW.garment_state_note IS NOT DISTINCT FROM OLD.garment_state_note
            AND NEW.footwear_heel_cm IS NOT DISTINCT FROM OLD.footwear_heel_cm
            AND NEW.balance_assessment IS NOT DISTINCT FROM OLD.balance_assessment
            AND NEW.summary_notes IS NOT DISTINCT FROM OLD.summary_notes
            AND NEW.client_feedback_notes IS NOT DISTINCT FROM OLD.client_feedback_notes
            AND NEW.requires_cad_revision IS NOT DISTINCT FROM OLD.requires_cad_revision
            AND NEW.fit_approved_at IS NOT DISTINCT FROM OLD.fit_approved_at
            AND NEW.fit_approved_by IS NOT DISTINCT FROM OLD.fit_approved_by
            AND NEW.fit_approved_by_name IS NOT DISTINCT FROM OLD.fit_approved_by_name
            AND NEW.fit_approval_notes IS NOT DISTINCT FROM OLD.fit_approval_notes
            AND NEW.approval_idempotency_key IS NOT DISTINCT FROM OLD.approval_idempotency_key
            AND NEW.cancelled_at IS NOT DISTINCT FROM OLD.cancelled_at
            AND NEW.cancelled_by IS NOT DISTINCT FROM OLD.cancelled_by
            AND NEW.cancellation_reason IS NOT DISTINCT FROM OLD.cancellation_reason
            AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
            AND NEW.last_update_idempotency_key IS NOT DISTINCT FROM OLD.last_update_idempotency_key
            AND NEW.media_delete_receipts IS NOT DISTINCT FROM OLD.media_delete_receipts
            AND NEW.client_visibility IS NOT DISTINCT FROM OLD.client_visibility
            AND NEW.structured_metadata IS NOT DISTINCT FROM OLD.structured_metadata;

        IF NOT v_only_delivery_ceremony THEN
            RAISE EXCEPTION 'Historial sellado M06: una sesión aprobada es inmutable en todos sus campos técnicos, notas y alcance (solo admite entrega única sobre final_for_delivery).'
                USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
    END IF;

    IF OLD.status IN ('completed', 'adjustments_required') AND NEW.status = 'scheduled' THEN
        RAISE EXCEPTION 'Ciclo M06: una sesión ya ejecutada (%) no puede revertirse a programada (scheduled).', OLD.status
            USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'cancelled' THEN
        IF OLD.status <> 'scheduled' OR OLD.conducted_at IS NOT NULL OR NEW.conducted_at IS NOT NULL THEN
            RAISE EXCEPTION 'Ciclo M06: solo puede cancelarse una cita en estado scheduled que aún no ha sido realizada.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.cancelled_by IS DISTINCT FROM auth.uid() OR NEW.cancelled_at IS NULL THEN
            RAISE EXCEPTION 'Autoría M06: la cancelación debe registrar cancelled_at y cancelled_by del usuario actual.'
                USING ERRCODE = '42501';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.atelier_fitting_adjustments WHERE fitting_session_id = OLD.id
            UNION ALL
            SELECT 1 FROM public.commercial_media_assets WHERE fitting_session_id = OLD.id
        ) INTO v_has_children;

        IF v_has_children THEN
            RAISE EXCEPTION 'Ciclo M06: no puede cancelarse una cita que ya registró ajustes físicos o fotografías.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.status IN ('completed', 'approved') THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.atelier_fitting_adjustments
            WHERE fitting_session_id = NEW.id
              AND status IN ('pending', 'applied')
        ) INTO v_has_open_adjustments;

        IF v_has_open_adjustments THEN
            RAISE EXCEPTION 'Regla M06: la sesión (%) mantiene ajustes pending/applied abiertos y no puede pasar a %.', NEW.id, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.status = 'approved' THEN
        IF NEW.conducted_at IS NULL THEN
            RAISE EXCEPTION 'Regla M06: la aprobación de calce exige conducted_at confirmado.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.approval_scope NOT IN ('intermediate_round', 'final_for_delivery') THEN
            RAISE EXCEPTION 'Regla M06: debe especificar approval_scope (intermediate_round o final_for_delivery) al aprobar.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.approval_scope = 'final_for_delivery' THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.atelier_fitting_adjustments
                WHERE creation_id = NEW.creation_id
                  AND status IN ('pending', 'applied')
            ) INTO v_has_open_creation_adj;

            IF v_has_open_creation_adj THEN
                RAISE EXCEPTION 'Regla M06: existen ajustes heredados aún abiertos en esta Creación; resuélvalos antes de aprobar como final_for_delivery.'
                    USING ERRCODE = '23514';
            END IF;

            SELECT EXISTS (
                SELECT 1
                FROM public.atelier_fitting_sessions
                WHERE creation_id = NEW.creation_id
                  AND id <> NEW.id
                  AND status = 'adjustments_required'
            ) INTO v_has_adj_req_other_session;

            IF v_has_adj_req_other_session THEN
                RAISE EXCEPTION 'Regla M06: existen otras pruebas con ajustes pendientes en la Creación antes de marcar aprobación final_for_delivery.'
                    USING ERRCODE = '23514';
            END IF;
        END IF;

        IF NEW.fit_approved_by IS DISTINCT FROM auth.uid() OR NEW.fit_approved_at IS NULL THEN
            RAISE EXCEPTION 'Autoría M06: fit_approved_by debe coincidir con el usuario que sella la aprobación.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.delivery_confirmed_at IS NOT NULL THEN
            RAISE EXCEPTION 'Regla M06: el ceremonial de entrega debe ejecutarse después de aprobar el calce físico.'
                USING ERRCODE = '23514';
        END IF;
    ELSE
        IF NEW.approval_scope IS NOT NULL OR NEW.fit_approved_at IS NOT NULL OR NEW.fit_approved_by IS NOT NULL THEN
            RAISE EXCEPTION 'Integridad M06: approval_scope y sellos de aprobación solo aplican cuando status = approved.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_m06_fitting_session_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.protect_m06_fitting_session_history() TO authenticated, service_role, postgres;

-- 4.6. Integridad cruzada, autoría progresiva y protección histórica en atelier_fitting_adjustments
--      Regla de locks: FOR SHARE solo en INSERT (hijos nuevos); cero lock ascendente en UPDATE.
CREATE OR REPLACE FUNCTION public.validate_and_protect_m06_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(auth.role(), '');
    v_is_client_role BOOLEAN := (v_jwt_role IN ('authenticated', 'anon'))
        OR (current_user IN ('authenticated', 'anon'));
    v_session_status TEXT;
    v_session_delivery TIMESTAMPTZ;
    v_pat_adj_exec_id UUID;
    v_pat_exec_creation_id UUID;
    v_ref_session_creation_id UUID;
    v_ref_session_status TEXT;
BEGIN
    -- [A] VALIDACIONES ESTRUCTURALES SIEMPRE ACTIVAS (todos los roles)
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF TG_OP = 'INSERT' OR NEW.verified_in_session_id IS DISTINCT FROM OLD.verified_in_session_id THEN
            IF NEW.verified_in_session_id IS NOT NULL THEN
                SELECT creation_id, status
                INTO v_ref_session_creation_id, v_ref_session_status
                FROM public.atelier_fitting_sessions
                WHERE id = NEW.verified_in_session_id;

                IF NOT FOUND OR v_ref_session_creation_id IS DISTINCT FROM NEW.creation_id THEN
                    RAISE EXCEPTION 'Integridad M06: verified_in_session_id (%) no pertenece a la creación (%).', NEW.verified_in_session_id, NEW.creation_id
                        USING ERRCODE = '23514';
                END IF;

                IF v_ref_session_status = 'cancelled' THEN
                    RAISE EXCEPTION 'Integridad M06: no es válido verificar en una sesión cancelada.'
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;

        IF TG_OP = 'INSERT' OR NEW.waived_in_session_id IS DISTINCT FROM OLD.waived_in_session_id THEN
            IF NEW.waived_in_session_id IS NOT NULL THEN
                SELECT creation_id, status
                INTO v_ref_session_creation_id, v_ref_session_status
                FROM public.atelier_fitting_sessions
                WHERE id = NEW.waived_in_session_id;

                IF NOT FOUND OR v_ref_session_creation_id IS DISTINCT FROM NEW.creation_id THEN
                    RAISE EXCEPTION 'Integridad M06: waived_in_session_id (%) no pertenece a la creación (%).', NEW.waived_in_session_id, NEW.creation_id
                        USING ERRCODE = '23514';
                END IF;

                IF v_ref_session_status = 'cancelled' THEN
                    RAISE EXCEPTION 'Integridad M06: no es válido dispensar en una sesión cancelada.'
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;

        IF TG_OP = 'INSERT' OR NEW.related_pattern_adjustment_id IS DISTINCT FROM OLD.related_pattern_adjustment_id THEN
            IF NEW.related_pattern_adjustment_id IS NOT NULL THEN
                SELECT pa.execution_id, pe.creation_id
                INTO v_pat_adj_exec_id, v_pat_exec_creation_id
                FROM public.pattern_adjustments pa
                JOIN public.pattern_executions pe ON pe.id = pa.execution_id
                WHERE pa.id = NEW.related_pattern_adjustment_id;

                IF v_pat_adj_exec_id IS NULL THEN
                    RAISE EXCEPTION 'Integridad M06: related_pattern_adjustment_id (%) inexistente.', NEW.related_pattern_adjustment_id
                        USING ERRCODE = '23503';
                END IF;

                IF v_pat_exec_creation_id IS NOT NULL AND v_pat_exec_creation_id IS DISTINCT FROM NEW.creation_id THEN
                    RAISE EXCEPTION 'Integridad M06: el ajuste CAD vinculado pertenece a otra creación (%).', v_pat_exec_creation_id
                        USING ERRCODE = '23514';
                END IF;
            END IF;
        END IF;
    END IF;

    -- [B] REGLAS DE POLÍTICA HISTÓRICA, NO BORRADO Y AUTORÍA PARA CLIENTES AUTENTICADOS
    IF NOT v_is_client_role THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Política histórica M06: los ajustes de fitting no se eliminan físicamente. Use cancelación auditada (cancelled con motivo).'
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.created_by IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Autoría M06: created_by debe coincidir con el usuario autenticado.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.status <> 'pending'
           OR NEW.applied_at IS NOT NULL OR NEW.applied_by IS NOT NULL
           OR NEW.verified_at IS NOT NULL OR NEW.verified_by IS NOT NULL
           OR NEW.waived_at IS NOT NULL OR NEW.waived_by IS NOT NULL
           OR NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL
        THEN
            RAISE EXCEPTION 'Ciclo M06: todo ajuste nuevo debe iniciar en estado pending sin sellos de resolución prefabricados.'
                USING ERRCODE = '23514';
        END IF;

        -- FOR SHARE en INSERT (no existe lock previo en ajustes -> sin inversión ni deadlock)
        SELECT status, delivery_confirmed_at
        INTO v_session_status, v_session_delivery
        FROM public.atelier_fitting_sessions
        WHERE id = NEW.fitting_session_id
        FOR SHARE;

        IF NOT FOUND OR v_session_status IN ('approved', 'cancelled') OR v_session_delivery IS NOT NULL THEN
            RAISE EXCEPTION 'Historial sellado M06: no es posible añadir ajustes a una sesión aprobada, cancelada o entregada.'
                USING ERRCODE = '42501';
        END IF;

        RETURN NEW;
    END IF;

    -- UPDATE: RI SET NULL interno permitido solo en FKs nullable sin mutar estado/autoría
    IF pg_catalog.pg_trigger_depth() > 0
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.description IS NOT DISTINCT FROM OLD.description
       AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
       AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
       AND (
            (NEW.related_pattern_adjustment_id IS NULL AND OLD.related_pattern_adjustment_id IS NOT NULL)
            OR (NEW.verified_in_session_id IS NULL AND OLD.verified_in_session_id IS NOT NULL)
            OR (NEW.waived_in_session_id IS NULL AND OLD.waived_in_session_id IS NOT NULL)
       )
    THEN
        RETURN NEW;
    END IF;

    IF NEW.creation_id IS DISTINCT FROM OLD.creation_id
       OR NEW.fitting_session_id IS DISTINCT FROM OLD.fitting_session_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_by_name IS DISTINCT FROM OLD.created_by_name
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR (OLD.idempotency_key IS NOT NULL AND NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key)
    THEN
        RAISE EXCEPTION 'Autoría e integridad M06: no está permitido alterar sesión, creación, idempotency_key, created_by o created_at de un ajuste.'
            USING ERRCODE = '42501';
    END IF;

    IF NEW.row_version IS DISTINCT FROM OLD.row_version THEN
        RAISE EXCEPTION 'Concurrencia M06: row_version es gestionada automáticamente por el servidor.'
            USING ERRCODE = '42501';
    END IF;

    SELECT status, delivery_confirmed_at
    INTO v_session_status, v_session_delivery
    FROM public.atelier_fitting_sessions
    WHERE id = OLD.fitting_session_id;

    IF v_session_status IN ('approved', 'cancelled') OR v_session_delivery IS NOT NULL THEN
        RAISE EXCEPTION 'Historial sellado M06: no es posible modificar ajustes de una sesión aprobada, cancelada o entregada.'
            USING ERRCODE = '42501';
    END IF;

    IF OLD.status IN ('verified', 'waived', 'cancelled') THEN
        RAISE EXCEPTION 'Historial sellado M06: un ajuste en estado terminal (%) no puede reabrirse ni modificarse.', OLD.status
            USING ERRCODE = '42501';
    END IF;

    IF OLD.status <> 'pending' AND (
        NEW.zone_code IS DISTINCT FROM OLD.zone_code
        OR NEW.adjustment_kind IS DISTINCT FROM OLD.adjustment_kind
        OR NEW.severity IS DISTINCT FROM OLD.severity
        OR NEW.requires_cad_update IS DISTINCT FROM OLD.requires_cad_update
        OR NEW.description IS DISTINCT FROM OLD.description
        OR NEW.delta_mm IS DISTINCT FROM OLD.delta_mm
        OR NEW.related_pattern_adjustment_id IS DISTINCT FROM OLD.related_pattern_adjustment_id
    ) THEN
        RAISE EXCEPTION 'Integridad M06: la especificación original de un ajuste aplicado no puede reescribirse.'
            USING ERRCODE = '42501';
    END IF;

    IF OLD.status = 'applied' AND NEW.status = 'pending' THEN
        RAISE EXCEPTION 'Ciclo M06: un ajuste ya ejecutado en taller (applied) no puede revertirse a pending.'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.applied_at IS NOT NULL AND (
        NEW.applied_at IS DISTINCT FROM OLD.applied_at
        OR NEW.applied_by IS DISTINCT FROM OLD.applied_by
        OR NEW.applied_by_name IS DISTINCT FROM OLD.applied_by_name
    ) THEN
        RAISE EXCEPTION 'Autoría M06: el sello original de ejecución en taller (applied_by) es inmutable.'
            USING ERRCODE = '42501';
    END IF;

    IF NEW.status = 'applied' AND OLD.status = 'pending' THEN
        IF NEW.applied_by IS DISTINCT FROM auth.uid() OR NEW.applied_at IS NULL THEN
            RAISE EXCEPTION 'Autoría M06: applied_by debe coincidir con el usuario autenticado.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF NEW.status = 'verified' THEN
        IF NEW.verified_by IS DISTINCT FROM auth.uid() OR NEW.verified_at IS NULL THEN
            RAISE EXCEPTION 'Autoría M06: verified_by debe coincidir con el usuario autenticado.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF NEW.status = 'waived' THEN
        IF OLD.severity = 'critical' OR NEW.severity = 'critical' THEN
            RAISE EXCEPTION 'Regla M06: un ajuste con severidad critical no puede dispensarse; debe verificarse o cancelarse justificadamente.'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.waived_by IS DISTINCT FROM auth.uid() OR NEW.waived_at IS NULL THEN
            RAISE EXCEPTION 'Autoría M06: waived_by debe coincidir con el usuario autenticado.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    IF NEW.status = 'cancelled' THEN
        IF NEW.cancelled_by IS DISTINCT FROM auth.uid() OR NEW.cancelled_at IS NULL THEN
            RAISE EXCEPTION 'Autoría M06: cancelled_by debe coincidir con el usuario autenticado.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_and_protect_m06_adjustment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_and_protect_m06_adjustment() TO authenticated, service_role, postgres;

-- 4.7. Integridad cruzada y protección histórica en commercial_media_assets (M03 -> M06)
--      Regla de locks: FOR SHARE solo en INSERT; lectura MVCC sin lock ascendente en UPDATE/DELETE.
CREATE OR REPLACE FUNCTION public.validate_m06_media_session_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(auth.role(), '');
    v_is_client_role BOOLEAN := (v_jwt_role IN ('authenticated', 'anon'))
        OR (current_user IN ('authenticated', 'anon'));
    v_session_creation_id UUID;
    v_session_status TEXT;
    v_session_approval_scope TEXT;
    v_delivery_confirmed_at TIMESTAMPTZ;
BEGIN
    -- [A] Integridad sesión ↔ creación activa para TODOS los roles
    IF TG_OP = 'INSERT' AND NEW.fitting_session_id IS NOT NULL THEN
        SELECT creation_id, status, approval_scope, delivery_confirmed_at
        INTO v_session_creation_id, v_session_status, v_session_approval_scope, v_delivery_confirmed_at
        FROM public.atelier_fitting_sessions
        WHERE id = NEW.fitting_session_id
        FOR SHARE;

        IF NOT FOUND OR v_session_creation_id IS DISTINCT FROM NEW.creation_id THEN
            RAISE EXCEPTION 'Integridad M06: el activo de fitting_session_id (%) no corresponde a la creación (%).', NEW.fitting_session_id, NEW.creation_id
                USING ERRCODE = '23514';
        END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.fitting_session_id IS NOT NULL THEN
        SELECT creation_id, status, approval_scope, delivery_confirmed_at
        INTO v_session_creation_id, v_session_status, v_session_approval_scope, v_delivery_confirmed_at
        FROM public.atelier_fitting_sessions
        WHERE id = NEW.fitting_session_id;

        IF NOT FOUND OR v_session_creation_id IS DISTINCT FROM NEW.creation_id THEN
            RAISE EXCEPTION 'Integridad M06: el activo de fitting_session_id (%) no corresponde a la creación (%).', NEW.fitting_session_id, NEW.creation_id
                USING ERRCODE = '23514';
        END IF;
    END IF;

    -- [B] Protección histórica y de autoría (M03 intacto cuando fitting_session_id IS NULL)
    IF NOT v_is_client_role THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.fitting_session_id IS NOT NULL THEN
            SELECT status, delivery_confirmed_at
            INTO v_session_status, v_delivery_confirmed_at
            FROM public.atelier_fitting_sessions
            WHERE id = OLD.fitting_session_id;

            IF v_session_status IN ('approved', 'cancelled') OR v_delivery_confirmed_at IS NOT NULL THEN
                RAISE EXCEPTION 'Historial sellado M06: no es posible eliminar evidencia fotográfica o acta vinculada a una sesión aprobada, cancelada o entregada.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.fitting_session_id IS NOT NULL THEN
        IF NEW.created_by IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Autoría M06: created_by debe coincidir con el usuario autenticado al registrar evidencia de prueba.'
                USING ERRCODE = '42501';
        END IF;

        IF v_session_status = 'cancelled' OR v_delivery_confirmed_at IS NOT NULL THEN
            RAISE EXCEPTION 'Historial sellado M06: no pueden añadirse archivos a una sesión cancelada o ya entregada.'
                USING ERRCODE = '42501';
        END IF;

        IF v_session_status = 'approved' THEN
            IF NEW.asset_type <> 'delivery_note' OR v_session_approval_scope IS DISTINCT FROM 'final_for_delivery' THEN
                RAISE EXCEPTION 'Historial sellado M06: solo puede adjuntarse delivery_note durante el cierre de entrega sobre una sesión aprobada como final_for_delivery.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND (OLD.fitting_session_id IS NOT NULL OR NEW.fitting_session_id IS NOT NULL) THEN
        IF pg_catalog.pg_trigger_depth() > 0
           AND NEW.fitting_session_id IS NULL AND OLD.fitting_session_id IS NOT NULL
           AND NEW.file_path IS NOT DISTINCT FROM OLD.file_path
           AND NEW.creation_id IS NOT DISTINCT FROM OLD.creation_id
        THEN
            RETURN NEW;
        END IF;

        IF NEW.creation_id IS DISTINCT FROM OLD.creation_id
           OR NEW.fitting_session_id IS DISTINCT FROM OLD.fitting_session_id
           OR NEW.file_path IS DISTINCT FROM OLD.file_path
           OR NEW.asset_type IS DISTINCT FROM OLD.asset_type
           OR (OLD.idempotency_key IS NOT NULL AND NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key)
           OR NEW.created_by IS DISTINCT FROM OLD.created_by
           OR NEW.created_at IS DISTINCT FROM OLD.created_at
        THEN
            RAISE EXCEPTION 'Integridad M06: no está permitido reasignar creación, sesión, archivo, llave de idempotencia ni autoría de evidencia M06.'
                USING ERRCODE = '42501';
        END IF;

        IF OLD.fitting_session_id IS NOT NULL THEN
            SELECT status, delivery_confirmed_at
            INTO v_session_status, v_delivery_confirmed_at
            FROM public.atelier_fitting_sessions
            WHERE id = OLD.fitting_session_id;

            IF v_session_status IN ('approved', 'cancelled') OR v_delivery_confirmed_at IS NOT NULL THEN
                RAISE EXCEPTION 'Historial sellado M06: la evidencia de una sesión aprobada, cancelada o entregada es inmutable.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_m06_media_session_creation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_m06_media_session_creation() TO authenticated, service_role, postgres;

-- ==============================================================================
-- 5. 8 RPCS TRANSACCIONALES ATÓMICAS M06
--    TODAS respetan estrictamente el Orden Global de Bloqueos (1 -> 7):
--      1. creations -> 2. atelier_fitting_sessions (ORDER BY id) ->
--      3. atelier_fitting_adjustments -> 4. commercial_media_assets ->
--      5. creation_commercial_profiles -> 6. atelier_projects -> 7. commercial_events
--    TODAS exigen p_idempotency_key no vacío y p_expected*_row_version en mutaciones.
-- ==============================================================================

-- 5.1. Crear sesión de prueba (Locks: 1 -> insert 2 -> 5 -> 6 -> 7)
CREATE OR REPLACE FUNCTION public.create_fitting_session_m06(
    p_creation_id UUID,
    p_idempotency_key TEXT,
    p_round_type TEXT DEFAULT 'toile_first',
    p_title TEXT DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_pattern_execution_id UUID DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_conducted_at TIMESTAMPTZ DEFAULT NULL,
    p_location_note TEXT DEFAULT NULL,
    p_garment_state_note TEXT DEFAULT NULL,
    p_footwear_heel_cm NUMERIC DEFAULT NULL,
    p_balance_assessment TEXT DEFAULT 'pending',
    p_summary_notes TEXT DEFAULT NULL,
    p_client_feedback_notes TEXT DEFAULT NULL,
    p_requires_cad_revision BOOLEAN DEFAULT FALSE,
    p_initial_status TEXT DEFAULT 'scheduled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_creation_status TEXT;
    v_existing public.atelier_fitting_sessions%ROWTYPE;
    v_inserted public.atelier_fitting_sessions%ROWTYPE;
    v_next_num INT;
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_resolved_title TEXT;
    v_resolved_project_id UUID := p_project_id;
    v_resolved_status TEXT := COALESCE(p_initial_status, 'scheduled');
    v_target_stage TEXT;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al crear una sesión.'
            USING ERRCODE = '23514';
    END IF;

    IF v_resolved_status NOT IN ('scheduled', 'completed', 'adjustments_required') THEN
        RAISE EXCEPTION 'Ciclo M06: estado inicial inválido (%).', v_resolved_status
            USING ERRCODE = '23514';
    END IF;

    -- [Lock Nivel 1] Serializar operaciones por Creación
    SELECT status INTO v_creation_status
    FROM public.creations
    WHERE id = p_creation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Creación (%) no encontrada.', p_creation_id USING ERRCODE = '23503';
    END IF;

    IF v_creation_status = 'cancelled' THEN
        RAISE EXCEPTION 'Integridad M06: no es posible crear pruebas sobre una creación cancelada.'
            USING ERRCODE = '23514';
    END IF;

    -- Idempotencia evaluada bajo Lock Nivel 1
    SELECT * INTO v_existing
    FROM public.atelier_fitting_sessions
    WHERE creation_id = p_creation_id
      AND idempotency_key = v_clean_idem
    LIMIT 1;

    IF FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'session', pg_catalog.to_jsonb(v_existing)
        );
    END IF;

    SELECT COALESCE(MAX(session_number), 0) + 1
    INTO v_next_num
    FROM public.atelier_fitting_sessions
    WHERE creation_id = p_creation_id;

    v_resolved_title := NULLIF(pg_catalog.btrim(p_title), '');
    IF v_resolved_title IS NULL THEN
        v_resolved_title := 'Prueba ' || v_next_num || CASE p_round_type
            WHEN 'toile_first' THEN ' · Glasilla (Toile)'
            WHEN 'second_fitting' THEN ' · Tela Definitiva'
            WHEN 'final_fitting' THEN ' · Prueba Final'
            WHEN 'alteration_check' THEN ' · Transformación'
            ELSE ' · Prueba Adicional'
        END;
    END IF;

    IF v_resolved_project_id IS NULL THEN
        SELECT active_project_id INTO v_resolved_project_id
        FROM public.creation_commercial_profiles
        WHERE creation_id = p_creation_id;
    END IF;

    v_actor_name := public.m06_resolve_actor_name(v_actor_id);

    -- [Nivel 2] Insert de nueva sesión
    INSERT INTO public.atelier_fitting_sessions (
        creation_id, project_id, pattern_execution_id,
        session_number, round_type, title, status,
        scheduled_at, conducted_at, location_note, garment_state_note,
        footwear_heel_cm, balance_assessment, summary_notes, client_feedback_notes,
        requires_cad_revision, idempotency_key, created_by, created_by_name
    )
    VALUES (
        p_creation_id, v_resolved_project_id, p_pattern_execution_id,
        v_next_num, COALESCE(p_round_type, 'toile_first'), v_resolved_title, v_resolved_status,
        p_scheduled_at,
        CASE WHEN v_resolved_status IN ('completed', 'adjustments_required') THEN COALESCE(p_conducted_at, pg_catalog.now()) ELSE p_conducted_at END,
        NULLIF(pg_catalog.btrim(p_location_note), ''),
        NULLIF(pg_catalog.btrim(p_garment_state_note), ''),
        p_footwear_heel_cm,
        COALESCE(p_balance_assessment, 'pending'),
        NULLIF(pg_catalog.btrim(p_summary_notes), ''),
        NULLIF(pg_catalog.btrim(p_client_feedback_notes), ''),
        COALESCE(p_requires_cad_revision, FALSE),
        v_clean_idem,
        v_actor_id,
        v_actor_name
    )
    RETURNING * INTO v_inserted;

    v_target_stage := CASE v_inserted.round_type
        WHEN 'second_fitting' THEN 'second_fitting'
        WHEN 'final_fitting' THEN 'second_fitting'
        ELSE 'first_fitting'
    END;
    IF v_resolved_status = 'adjustments_required' THEN
        v_target_stage := 'adjustments';
    END IF;

    -- [Niveles 5 -> 6] Sincronización monótona M03
    PERFORM public.m06_sync_m03_state(
        p_creation_id,
        v_resolved_project_id,
        'fitting',
        'in_fitting',
        NULL,
        v_target_stage,
        NULL
    );

    -- [Nivel 7] Evento deduplicado en M03
    IF NOT EXISTS (
        SELECT 1 FROM public.commercial_events
        WHERE creation_id = p_creation_id
          AND metadata->>'idempotency_key' = ('session:' || v_clean_idem)
    ) THEN
        INSERT INTO public.commercial_events (
            creation_id, project_id, event_type, title, description, metadata, created_by
        )
        VALUES (
            p_creation_id,
            v_resolved_project_id,
            CASE WHEN v_resolved_status = 'scheduled' THEN 'fitting_scheduled' ELSE 'fitting_completed' END,
            v_inserted.title,
            CASE WHEN v_resolved_status = 'scheduled' THEN 'Sesión de fitting programada desde M06.' ELSE 'Sesión de fitting registrada como realizada.' END,
            pg_catalog.jsonb_build_object(
                'source', 'M06',
                'm06_action', CASE WHEN v_resolved_status = 'scheduled' THEN 'session_scheduled' ELSE 'session_conducted' END,
                'fitting_session_id', v_inserted.id,
                'session_number', v_inserted.session_number,
                'round_type', v_inserted.round_type,
                'idempotency_key', 'session:' || v_clean_idem
            ),
            v_actor_id
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'session', pg_catalog.to_jsonb(v_inserted)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_fitting_session_m06(UUID, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_fitting_session_m06(UUID, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role, postgres;

-- 5.2. Actualizar o cancelar sesión abierta (Locks: 1 -> 2 -> 5 -> 6 -> 7)
CREATE OR REPLACE FUNCTION public.update_fitting_session_m06(
    p_session_id UUID,
    p_expected_row_version INT,
    p_idempotency_key TEXT,
    p_title TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_conducted_at TIMESTAMPTZ DEFAULT NULL,
    p_location_note TEXT DEFAULT NULL,
    p_garment_state_note TEXT DEFAULT NULL,
    p_footwear_heel_cm NUMERIC DEFAULT NULL,
    p_balance_assessment TEXT DEFAULT NULL,
    p_summary_notes TEXT DEFAULT NULL,
    p_client_feedback_notes TEXT DEFAULT NULL,
    p_requires_cad_revision BOOLEAN DEFAULT NULL,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_creation_id UUID;
    v_current public.atelier_fitting_sessions%ROWTYPE;
    v_updated public.atelier_fitting_sessions%ROWTYPE;
    v_target_status TEXT;
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_clean_cancel_reason TEXT := NULLIF(pg_catalog.btrim(p_cancellation_reason), '');
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_row_version es obligatorio al actualizar una sesión.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al actualizar una sesión.'
            USING ERRCODE = '23514';
    END IF;

    -- Lectura previa sin lock únicamente para resolver Nivel 1 (creations)
    SELECT creation_id INTO v_creation_id
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de fitting (%) no encontrada.', p_session_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2]
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;
    SELECT * INTO v_current
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    -- 1º: Evaluar idempotencia bajo lock antes de comparar row_version
    IF v_current.last_update_idempotency_key = v_clean_idem THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'session', pg_catalog.to_jsonb(v_current)
        );
    END IF;

    -- 2º: Control estricto de versión optimista
    IF v_current.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: la sesión fue actualizada en otro dispositivo/pestaña (esperada v%, actual v%).', p_expected_row_version, v_current.row_version
            USING ERRCODE = '40001';
    END IF;

    v_target_status := COALESCE(p_status, v_current.status);
    IF v_target_status = 'approved' THEN
        RAISE EXCEPTION 'Flujo M06: use approve_fitting_session_m06 especificando approval_scope para aprobar calce.'
            USING ERRCODE = '23514';
    END IF;

    IF v_target_status = 'cancelled' AND v_clean_cancel_reason IS NULL THEN
        RAISE EXCEPTION 'Auditoría M06: especifique el motivo al cancelar una cita programada.'
            USING ERRCODE = '23514';
    END IF;

    UPDATE public.atelier_fitting_sessions
    SET
        title = COALESCE(NULLIF(pg_catalog.btrim(p_title), ''), title),
        status = v_target_status,
        scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
        conducted_at = CASE
            WHEN v_target_status IN ('completed', 'adjustments_required') THEN COALESCE(p_conducted_at, conducted_at, pg_catalog.now())
            ELSE COALESCE(p_conducted_at, conducted_at)
        END,
        location_note = COALESCE(p_location_note, location_note),
        garment_state_note = COALESCE(p_garment_state_note, garment_state_note),
        footwear_heel_cm = COALESCE(p_footwear_heel_cm, footwear_heel_cm),
        balance_assessment = COALESCE(p_balance_assessment, balance_assessment),
        summary_notes = COALESCE(p_summary_notes, summary_notes),
        client_feedback_notes = COALESCE(p_client_feedback_notes, client_feedback_notes),
        requires_cad_revision = COALESCE(p_requires_cad_revision, requires_cad_revision),
        cancelled_at = CASE WHEN v_target_status = 'cancelled' THEN pg_catalog.now() ELSE cancelled_at END,
        cancelled_by = CASE WHEN v_target_status = 'cancelled' THEN v_actor_id ELSE cancelled_by END,
        cancellation_reason = CASE WHEN v_target_status = 'cancelled' THEN v_clean_cancel_reason ELSE cancellation_reason END,
        last_update_idempotency_key = v_clean_idem
    WHERE id = p_session_id
    RETURNING * INTO v_updated;

    IF v_current.status IS DISTINCT FROM v_updated.status THEN
        IF v_updated.status IN ('completed', 'adjustments_required') THEN
            PERFORM public.m06_sync_m03_state(
                v_updated.creation_id,
                v_updated.project_id,
                'fitting',
                'in_fitting',
                NULL,
                CASE WHEN v_updated.status = 'adjustments_required' THEN 'adjustments' ELSE NULL END,
                NULL
            );
            INSERT INTO public.commercial_events (
                creation_id, project_id, event_type, title, description, metadata, created_by
            )
            VALUES (
                v_updated.creation_id,
                v_updated.project_id,
                'fitting_completed',
                v_updated.title,
                CASE WHEN v_updated.status = 'adjustments_required'
                     THEN 'Prueba realizada con ajustes físicos abiertos.'
                     ELSE 'Prueba realizada sin ajustes pendientes.' END,
                pg_catalog.jsonb_build_object(
                    'source', 'M06',
                    'm06_action', 'session_updated_' || v_updated.status,
                    'fitting_session_id', v_updated.id,
                    'session_number', v_updated.session_number,
                    'row_version', v_updated.row_version,
                    'idempotency_key', 'upd:' || v_clean_idem
                ),
                v_actor_id
            );
        ELSIF v_updated.status = 'cancelled' THEN
            INSERT INTO public.commercial_events (
                creation_id, project_id, event_type, title, description, metadata, created_by
            )
            VALUES (
                v_updated.creation_id,
                v_updated.project_id,
                'fitting',
                'Cita cancelada · ' || v_updated.title,
                v_clean_cancel_reason,
                pg_catalog.jsonb_build_object(
                    'source', 'M06',
                    'm06_action', 'session_cancelled',
                    'fitting_session_id', v_updated.id,
                    'session_number', v_updated.session_number,
                    'idempotency_key', 'cancel:' || v_clean_idem
                ),
                v_actor_id
            );
        END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'session', pg_catalog.to_jsonb(v_updated)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_fitting_session_m06(UUID, INT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_fitting_session_m06(UUID, INT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role, postgres;

-- 5.3. Añadir ajuste físico en prenda (Locks: 1 -> 2 -> insert 3 -> update 2 -> 5 -> 6)
CREATE OR REPLACE FUNCTION public.add_fitting_adjustment_m06(
    p_fitting_session_id UUID,
    p_expected_session_row_version INT,
    p_idempotency_key TEXT,
    p_zone_code TEXT,
    p_adjustment_kind TEXT,
    p_description TEXT,
    p_severity TEXT DEFAULT 'normal',
    p_requires_cad_update BOOLEAN DEFAULT FALSE,
    p_delta_mm NUMERIC DEFAULT NULL,
    p_workshop_notes TEXT DEFAULT NULL,
    p_related_pattern_adjustment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_creation_id UUID;
    v_session public.atelier_fitting_sessions%ROWTYPE;
    v_existing public.atelier_fitting_adjustments%ROWTYPE;
    v_inserted public.atelier_fitting_adjustments%ROWTYPE;
    v_updated_session public.atelier_fitting_sessions%ROWTYPE;
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_session_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_session_row_version es obligatorio al añadir un ajuste.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al añadir un ajuste.'
            USING ERRCODE = '23514';
    END IF;

    SELECT creation_id INTO v_creation_id
    FROM public.atelier_fitting_sessions
    WHERE id = p_fitting_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de fitting (%) no encontrada.', p_fitting_session_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2]
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;
    SELECT * INTO v_session
    FROM public.atelier_fitting_sessions
    WHERE id = p_fitting_session_id
    FOR UPDATE;

    -- 1º: Idempotencia antes de comparar versión de sesión (soporta reintentos tras promoción de estado)
    SELECT * INTO v_existing
    FROM public.atelier_fitting_adjustments
    WHERE fitting_session_id = p_fitting_session_id
      AND idempotency_key = v_clean_idem
    LIMIT 1;

    IF FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'adjustment', pg_catalog.to_jsonb(v_existing),
            'session', pg_catalog.to_jsonb(v_session)
        );
    END IF;

    -- 2º: Estado sellado y versión optimista obligatoria de la sesión padre
    IF v_session.status IN ('approved', 'cancelled') OR v_session.delivery_confirmed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Historial sellado M06: cree una nueva sesión para registrar ajustes posteriores a una prueba aprobada/entregada.'
            USING ERRCODE = '42501';
    END IF;

    IF v_session.row_version IS DISTINCT FROM p_expected_session_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: la sesión padre fue modificada concurrentemente (esperada v%, actual v%).', p_expected_session_row_version, v_session.row_version
            USING ERRCODE = '40001';
    END IF;

    v_actor_name := public.m06_resolve_actor_name(v_actor_id);

    -- [Nivel 3] Insert del ajuste
    INSERT INTO public.atelier_fitting_adjustments (
        creation_id, fitting_session_id, related_pattern_adjustment_id,
        zone_code, adjustment_kind, severity, requires_cad_update,
        description, delta_mm, workshop_notes,
        status, idempotency_key, created_by, created_by_name
    )
    VALUES (
        v_session.creation_id, v_session.id, p_related_pattern_adjustment_id,
        p_zone_code, p_adjustment_kind, COALESCE(p_severity, 'normal'), COALESCE(p_requires_cad_update, FALSE),
        pg_catalog.btrim(p_description), p_delta_mm, NULLIF(pg_catalog.btrim(p_workshop_notes), ''),
        'pending', v_clean_idem, v_actor_id, v_actor_name
    )
    RETURNING * INTO v_inserted;

    -- [Nivel 2 ya bloqueado] Promoción automática de la sesión si estaba en scheduled/completed
    IF v_session.status IN ('scheduled', 'completed') OR (COALESCE(p_requires_cad_update, FALSE) AND NOT v_session.requires_cad_revision) THEN
        UPDATE public.atelier_fitting_sessions
        SET
            status = 'adjustments_required',
            conducted_at = COALESCE(conducted_at, pg_catalog.now()),
            requires_cad_revision = requires_cad_revision OR COALESCE(p_requires_cad_update, FALSE)
        WHERE id = v_session.id
        RETURNING * INTO v_updated_session;
    ELSE
        v_updated_session := v_session;
    END IF;

    -- [Niveles 5 -> 6] Sincronización M03
    PERFORM public.m06_sync_m03_state(
        v_session.creation_id,
        v_session.project_id,
        'fitting',
        'in_fitting',
        NULL,
        'adjustments',
        NULL
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'adjustment', pg_catalog.to_jsonb(v_inserted),
        'session', pg_catalog.to_jsonb(v_updated_session)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.add_fitting_adjustment_m06(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_fitting_adjustment_m06(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, UUID) TO authenticated, service_role, postgres;

-- 5.4. Resolver o dispensar ajuste físico (Locks: 1 -> 2 ORDER BY id -> 3 -> update 2 -> 7)
CREATE OR REPLACE FUNCTION public.resolve_fitting_adjustment_m06(
    p_adjustment_id UUID,
    p_expected_row_version INT,
    p_idempotency_key TEXT,
    p_target_status TEXT,
    p_workshop_notes TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_resolution_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_creation_id UUID;
    v_origin_session_id UUID;
    v_current public.atelier_fitting_adjustments%ROWTYPE;
    v_session public.atelier_fitting_sessions%ROWTYPE;
    v_updated public.atelier_fitting_adjustments%ROWTYPE;
    v_updated_session public.atelier_fitting_sessions%ROWTYPE;
    v_open_remaining INT;
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_clean_reason TEXT := NULLIF(pg_catalog.btrim(p_reason), '');
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_row_version es obligatorio al resolver un ajuste.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al resolver un ajuste.'
            USING ERRCODE = '23514';
    END IF;

    IF p_target_status NOT IN ('applied', 'verified', 'waived', 'cancelled') THEN
        RAISE EXCEPTION 'Estado destino inválido (%) para resolución de ajuste.', p_target_status
            USING ERRCODE = '23514';
    END IF;

    -- Lectura previa sin lock únicamente para conocer creación y sesión origen
    SELECT creation_id, fitting_session_id
    INTO v_creation_id, v_origin_session_id
    FROM public.atelier_fitting_adjustments
    WHERE id = p_adjustment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ajuste físico (%) no encontrado.', p_adjustment_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2 (en ORDER BY id dentro de la misma Creación) -> Nivel 3]
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;
    PERFORM 1 FROM public.atelier_fitting_sessions
    WHERE id IN (v_origin_session_id, COALESCE(p_resolution_session_id, v_origin_session_id))
      AND creation_id = v_creation_id
    ORDER BY id
    FOR UPDATE;

    SELECT * INTO v_session
    FROM public.atelier_fitting_sessions
    WHERE id = v_origin_session_id;

    SELECT * INTO v_current
    FROM public.atelier_fitting_adjustments
    WHERE id = p_adjustment_id
    FOR UPDATE;

    -- 1º: Replay idempotente exacto bajo lock
    IF v_current.resolution_idempotency_key = v_clean_idem THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'adjustment', pg_catalog.to_jsonb(v_current),
            'session', pg_catalog.to_jsonb(v_session)
        );
    END IF;

    -- 2º: Control estricto de versión optimista
    IF v_current.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: el ajuste fue modificado por otro usuario/pestaña (esperada v%, actual v%).', p_expected_row_version, v_current.row_version
            USING ERRCODE = '40001';
    END IF;

    IF p_target_status IN ('waived', 'cancelled') AND v_clean_reason IS NULL THEN
        RAISE EXCEPTION 'Auditoría M06: es obligatorio registrar el motivo al % un ajuste.', p_target_status
            USING ERRCODE = '23514';
    END IF;

    v_actor_name := public.m06_resolve_actor_name(v_actor_id);

    UPDATE public.atelier_fitting_adjustments
    SET
        status = p_target_status,
        workshop_notes = COALESCE(NULLIF(pg_catalog.btrim(p_workshop_notes), ''), workshop_notes),
        applied_at = CASE WHEN p_target_status = 'applied' AND applied_at IS NULL THEN pg_catalog.now() ELSE applied_at END,
        applied_by = CASE WHEN p_target_status = 'applied' AND applied_by IS NULL THEN v_actor_id ELSE applied_by END,
        applied_by_name = CASE WHEN p_target_status = 'applied' AND applied_by_name IS NULL THEN v_actor_name ELSE applied_by_name END,
        verified_at = CASE WHEN p_target_status = 'verified' THEN pg_catalog.now() ELSE verified_at END,
        verified_by = CASE WHEN p_target_status = 'verified' THEN v_actor_id ELSE verified_by END,
        verified_by_name = CASE WHEN p_target_status = 'verified' THEN v_actor_name ELSE verified_by_name END,
        verified_in_session_id = CASE WHEN p_target_status = 'verified' THEN COALESCE(p_resolution_session_id, fitting_session_id) ELSE verified_in_session_id END,
        waived_at = CASE WHEN p_target_status = 'waived' THEN pg_catalog.now() ELSE waived_at END,
        waived_by = CASE WHEN p_target_status = 'waived' THEN v_actor_id ELSE waived_by END,
        waived_by_name = CASE WHEN p_target_status = 'waived' THEN v_actor_name ELSE waived_by_name END,
        waived_in_session_id = CASE WHEN p_target_status = 'waived' THEN COALESCE(p_resolution_session_id, fitting_session_id) ELSE waived_in_session_id END,
        waiver_reason = CASE WHEN p_target_status = 'waived' THEN v_clean_reason ELSE waiver_reason END,
        cancelled_at = CASE WHEN p_target_status = 'cancelled' THEN pg_catalog.now() ELSE cancelled_at END,
        cancelled_by = CASE WHEN p_target_status = 'cancelled' THEN v_actor_id ELSE cancelled_by END,
        cancelled_by_name = CASE WHEN p_target_status = 'cancelled' THEN v_actor_name ELSE cancelled_by_name END,
        cancellation_reason = CASE WHEN p_target_status = 'cancelled' THEN v_clean_reason ELSE cancellation_reason END,
        resolution_idempotency_key = v_clean_idem
    WHERE id = p_adjustment_id
    RETURNING * INTO v_updated;

    -- [Nivel 2 ya bloqueado] Si era el último ajuste abierto, promover sesión realizada a 'completed'
    SELECT COUNT(*) INTO v_open_remaining
    FROM public.atelier_fitting_adjustments
    WHERE fitting_session_id = v_session.id
      AND status IN ('pending', 'applied');

    IF v_open_remaining = 0 AND v_session.status = 'adjustments_required' AND v_session.conducted_at IS NOT NULL THEN
        UPDATE public.atelier_fitting_sessions
        SET status = 'completed'
        WHERE id = v_session.id
        RETURNING * INTO v_updated_session;
    ELSE
        v_updated_session := v_session;
    END IF;

    -- [Nivel 7] Auditoría de dispensa
    IF p_target_status = 'waived' THEN
        INSERT INTO public.commercial_events (
            creation_id, project_id, event_type, title, description, metadata, created_by
        )
        VALUES (
            v_updated.creation_id,
            v_session.project_id,
            'decision',
            'Dispensa de ajuste físico · ' || v_updated.zone_code,
            v_clean_reason,
            pg_catalog.jsonb_build_object(
                'source', 'M06',
                'm06_action', 'adjustment_waived',
                'adjustment_id', v_updated.id,
                'fitting_session_id', v_updated.fitting_session_id,
                'waived_in_session_id', v_updated.waived_in_session_id,
                'severity', v_updated.severity,
                'idempotency_key', 'waive:' || v_clean_idem
            ),
            v_actor_id
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'adjustment', pg_catalog.to_jsonb(v_updated),
        'session', pg_catalog.to_jsonb(v_updated_session)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_fitting_adjustment_m06(UUID, INT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_fitting_adjustment_m06(UUID, INT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role, postgres;

-- 5.5. Aprobar calce físico (Locks: 1 -> 2 -> 5 -> 6 -> 7; distingue intermediate_round vs final_for_delivery)
CREATE OR REPLACE FUNCTION public.approve_fitting_session_m06(
    p_session_id UUID,
    p_expected_row_version INT,
    p_idempotency_key TEXT,
    p_approval_scope TEXT,
    p_approval_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_creation_id UUID;
    v_session public.atelier_fitting_sessions%ROWTYPE;
    v_updated public.atelier_fitting_sessions%ROWTYPE;
    v_open_session_adj INT;
    v_open_creation_adj INT;
    v_other_adj_req_sessions INT;
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_row_version es obligatorio al aprobar una prueba.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al aprobar una prueba.'
            USING ERRCODE = '23514';
    END IF;

    IF p_approval_scope NOT IN ('intermediate_round', 'final_for_delivery') THEN
        RAISE EXCEPTION 'Regla M06: p_approval_scope inválido (%). Debe ser intermediate_round o final_for_delivery.', p_approval_scope
            USING ERRCODE = '23514';
    END IF;

    SELECT creation_id INTO v_creation_id
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de fitting (%) no encontrada.', p_session_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2]
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;
    SELECT * INTO v_session
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    -- 1º: Idempotencia exacta bajo lock antes de comparar row_version
    IF v_session.status = 'approved' AND v_session.approval_idempotency_key = v_clean_idem THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'session', pg_catalog.to_jsonb(v_session)
        );
    END IF;

    -- 2º: Control optimista obligatorio
    IF v_session.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: la sesión cambió antes de aprobar (esperada v%, actual v%).', p_expected_row_version, v_session.row_version
            USING ERRCODE = '40001';
    END IF;

    IF v_session.status = 'approved' THEN
        RAISE EXCEPTION 'Historial sellado M06: la sesión ya fue aprobada previamente con alcance %.', v_session.approval_scope
            USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*) INTO v_open_session_adj
    FROM public.atelier_fitting_adjustments
    WHERE fitting_session_id = v_session.id
      AND status IN ('pending', 'applied');

    IF v_open_session_adj > 0 THEN
        RAISE EXCEPTION 'Regla M06: existen % ajuste(s) abiertos (pending/applied) en esta sesión. Resuélvalos antes de aprobar.', v_open_session_adj
            USING ERRCODE = '23514';
    END IF;

    IF p_approval_scope = 'final_for_delivery' THEN
        SELECT COUNT(*) INTO v_open_creation_adj
        FROM public.atelier_fitting_adjustments
        WHERE creation_id = v_session.creation_id
          AND status IN ('pending', 'applied');

        IF v_open_creation_adj > 0 THEN
            RAISE EXCEPTION 'Regla M06: existen % ajuste(s) heredados de sesiones previas aún abiertos en esta Creación. Resuélvalos antes de aprobar como final_for_delivery.', v_open_creation_adj
                USING ERRCODE = '23514';
        END IF;

        SELECT COUNT(*) INTO v_other_adj_req_sessions
        FROM public.atelier_fitting_sessions
        WHERE creation_id = v_session.creation_id
          AND id <> v_session.id
          AND status = 'adjustments_required';

        IF v_other_adj_req_sessions > 0 THEN
            RAISE EXCEPTION 'Regla M06: existen % sesión(es) previa(s) en adjustments_required pendientes de cierre antes de la aprobación final_for_delivery.', v_other_adj_req_sessions
                USING ERRCODE = '23514';
        END IF;
    END IF;

    v_actor_name := public.m06_resolve_actor_name(v_actor_id);

    UPDATE public.atelier_fitting_sessions
    SET
        status = 'approved',
        approval_scope = p_approval_scope,
        conducted_at = COALESCE(conducted_at, pg_catalog.now()),
        fit_approved_at = pg_catalog.now(),
        fit_approved_by = v_actor_id,
        fit_approved_by_name = v_actor_name,
        fit_approval_notes = NULLIF(pg_catalog.btrim(p_approval_notes), ''),
        approval_idempotency_key = v_clean_idem
    WHERE id = v_session.id
    RETURNING * INTO v_updated;

    -- [Niveles 5 -> 6] Diferencia explícita entre ronda intermedia vs. lista para entrega
    IF p_approval_scope = 'final_for_delivery' THEN
        PERFORM public.m06_sync_m03_state(
            v_updated.creation_id,
            v_updated.project_id,
            'approved',
            'ready',
            'ready_for_delivery',
            'finishing',
            NULL
        );
    ELSE
        PERFORM public.m06_sync_m03_state(
            v_updated.creation_id,
            v_updated.project_id,
            'fitting',
            'in_fitting',
            NULL,
            NULL,
            NULL
        );
    END IF;

    -- [Nivel 7] Evento en M03
    INSERT INTO public.commercial_events (
        creation_id, project_id, event_type, title, description, metadata, created_by
    )
    VALUES (
        v_updated.creation_id,
        v_updated.project_id,
        'fitting_completed',
        CASE WHEN p_approval_scope = 'final_for_delivery'
             THEN 'Calce final aprobado (lista para entrega) · ' || v_updated.title
             ELSE 'Calce de ronda intermedia aprobado · ' || v_updated.title END,
        COALESCE(v_updated.fit_approval_notes, 'Aprobación de calce sellada sobre prenda real en M06.'),
        pg_catalog.jsonb_build_object(
            'source', 'M06',
            'm06_action', 'fit_approved',
            'fitting_session_id', v_updated.id,
            'session_number', v_updated.session_number,
            'round_type', v_updated.round_type,
            'approval_scope', p_approval_scope,
            'idempotency_key', 'approve:' || v_clean_idem
        ),
        v_actor_id
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'session', pg_catalog.to_jsonb(v_updated)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_fitting_session_m06(UUID, INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_fitting_session_m06(UUID, INT, TEXT, TEXT, TEXT) TO authenticated, service_role, postgres;

-- 5.6. Confirmar entrega final (Locks: 1 -> 2 -> insert/dedup 4 -> update 2 -> 5 -> 6 -> 7)
CREATE OR REPLACE FUNCTION public.confirm_creation_delivery_m06(
    p_session_id UUID,
    p_expected_row_version INT,
    p_idempotency_key TEXT,
    p_delivery_notes TEXT DEFAULT NULL,
    p_delivery_checklist JSONB DEFAULT '{}'::jsonb,
    p_local_date DATE DEFAULT NULL,
    p_delivery_note_asset JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_creation_id UUID;
    v_creation_status TEXT;
    v_session public.atelier_fitting_sessions%ROWTYPE;
    v_already_delivered public.atelier_fitting_sessions%ROWTYPE;
    v_updated public.atelier_fitting_sessions%ROWTYPE;
    v_open_adj_count INT;
    v_waived_ids UUID[];
    v_effective_date DATE := COALESCE(p_local_date, (pg_catalog.now() AT TIME ZONE 'America/Bogota')::date);
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_checklist JSONB := COALESCE(p_delivery_checklist, '{}'::jsonb);
    v_intent_fingerprint TEXT;
    v_existing_note public.commercial_media_assets%ROWTYPE;
    v_note_path TEXT;
    v_note_idem TEXT;
    v_note_name TEXT;
    v_note_mime TEXT;
    v_note_size BIGINT;
    v_note_desc TEXT;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_row_version es obligatorio al confirmar entrega.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al confirmar entrega.'
            USING ERRCODE = '23514';
    END IF;

    -- Calcular huella normalizada de intención sobre v_effective_date (fecha realmente aplicada: COALESCE(p_local_date, America/Bogota)) antes de tomar bloqueos
    v_intent_fingerprint := public.m06_compute_delivery_intent_fingerprint(
        p_session_id,
        v_clean_idem,
        p_delivery_notes,
        p_delivery_checklist,
        v_effective_date,
        p_delivery_note_asset
    );

    SELECT creation_id INTO v_creation_id
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de fitting (%) no encontrada.', p_session_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2]
    SELECT status INTO v_creation_status
    FROM public.creations
    WHERE id = v_creation_id
    FOR UPDATE;

    IF v_creation_status = 'cancelled' THEN
        RAISE EXCEPTION 'Integridad M06: no es posible entregar una creación cancelada.'
            USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_session
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    -- 1º: Replay idempotente exacto sobre Creación bajo Lock Nivel 1->2
    SELECT * INTO v_already_delivered
    FROM public.atelier_fitting_sessions
    WHERE creation_id = v_creation_id
      AND delivery_confirmed_at IS NOT NULL
      AND delivery_idempotency_key = v_clean_idem
    LIMIT 1;

    IF FOUND THEN
        IF v_already_delivered.id IS DISTINCT FROM p_session_id
           OR v_already_delivered.delivery_intent_fingerprint IS DISTINCT FROM v_intent_fingerprint
        THEN
            RAISE EXCEPTION 'Conflicto de idempotencia M06: p_idempotency_key (%) ya fue utilizada con otra sesión o payload de entrega distinto.', v_clean_idem
                USING ERRCODE = '23505';
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'session', pg_catalog.to_jsonb(v_already_delivered)
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.atelier_fitting_sessions
        WHERE creation_id = v_creation_id
          AND delivery_confirmed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Regla M06: esta Creación ya cuenta con entrega final confirmada y sellada.'
            USING ERRCODE = '23514';
    END IF;

    -- 2º: Control optimista obligatorio
    IF v_session.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: la sesión cambió antes de confirmar entrega (esperada v%, actual v%).', p_expected_row_version, v_session.row_version
            USING ERRCODE = '40001';
    END IF;

    -- 3º: Exigir explícitamente sesión aprobada con alcance final_for_delivery
    IF v_session.status <> 'approved' OR v_session.approval_scope IS DISTINCT FROM 'final_for_delivery' THEN
        RAISE EXCEPTION 'Regla M06: la entrega final requiere una sesión aprobada con alcance final_for_delivery (no basta una aprobación intermedia).'
            USING ERRCODE = '23514';
    END IF;

    SELECT COUNT(*) INTO v_open_adj_count
    FROM public.atelier_fitting_adjustments
    WHERE creation_id = v_creation_id
      AND status IN ('pending', 'applied');

    IF v_open_adj_count > 0 THEN
        RAISE EXCEPTION 'Regla M06: no puede entregarse una prenda con % ajuste(s) pending/applied abiertos.', v_open_adj_count
            USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(pg_catalog.array_agg(id), ARRAY[]::UUID[])
    INTO v_waived_ids
    FROM public.atelier_fitting_adjustments
    WHERE creation_id = v_creation_id
      AND status = 'waived';

    v_checklist := v_checklist || pg_catalog.jsonb_build_object(
        'waived_adjustment_ids', v_waived_ids,
        'waived_count', COALESCE(pg_catalog.array_length(v_waived_ids, 1), 0),
        'delivery_local_date', v_effective_date::text
    );

    -- [Nivel 4] Adjuntar/deduplicar delivery_note con validación de coincidencia de payload ANTES de estampar entrega
    IF p_delivery_note_asset IS NOT NULL AND pg_catalog.jsonb_typeof(p_delivery_note_asset) = 'object' THEN
        v_note_path := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'file_path'), '');
        v_note_idem := COALESCE(NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'idempotency_key'), ''), 'delivery_note:' || v_clean_idem);
        v_note_name := COALESCE(NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'file_name'), ''), 'acta_entrega');
        v_note_mime := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'mime_type'), '');
        v_note_size := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'file_size_bytes'), '')::bigint;
        v_note_desc := NULLIF(pg_catalog.btrim(p_delivery_note_asset->>'description'), '');

        IF v_note_path IS NOT NULL THEN
            SELECT * INTO v_existing_note
            FROM public.commercial_media_assets
            WHERE fitting_session_id = v_session.id
              AND idempotency_key = v_note_idem
            LIMIT 1;

            IF FOUND THEN
                IF v_existing_note.asset_type IS DISTINCT FROM 'delivery_note'
                   OR v_existing_note.file_path IS DISTINCT FROM v_note_path
                   OR v_existing_note.file_name IS DISTINCT FROM v_note_name
                   OR v_existing_note.mime_type IS DISTINCT FROM v_note_mime
                   OR v_existing_note.file_size_bytes IS DISTINCT FROM v_note_size
                   OR v_existing_note.description IS DISTINCT FROM v_note_desc
                THEN
                    RAISE EXCEPTION 'Conflicto de idempotencia M06: el acta delivery_note de llave (%) no coincide con el activo ya registrado.', v_note_idem
                        USING ERRCODE = '23505';
                END IF;
            ELSE
                SELECT * INTO v_existing_note
                FROM public.commercial_media_assets
                WHERE fitting_session_id = v_session.id
                  AND file_path = v_note_path
                LIMIT 1;

                IF FOUND THEN
                    RAISE EXCEPTION 'Conflicto de idempotencia M06: file_path (%) ya está registrado bajo otra llave de idempotencia en la sesión (%).', v_note_path, v_session.id
                        USING ERRCODE = '23505';
                END IF;

                INSERT INTO public.commercial_media_assets (
                    creation_id, project_id, fitting_session_id,
                    asset_type, file_path, file_name, mime_type, file_size_bytes, description, idempotency_key, created_by
                )
                VALUES (
                    v_session.creation_id,
                    v_session.project_id,
                    v_session.id,
                    'delivery_note',
                    v_note_path,
                    v_note_name,
                    v_note_mime,
                    v_note_size,
                    v_note_desc,
                    v_note_idem,
                    v_actor_id
                );
            END IF;
        END IF;
    END IF;

    v_actor_name := public.m06_resolve_actor_name(v_actor_id);

    UPDATE public.atelier_fitting_sessions
    SET
        delivery_confirmed_at = pg_catalog.now(),
        delivery_confirmed_by = v_actor_id,
        delivery_confirmed_by_name = v_actor_name,
        delivery_notes = NULLIF(pg_catalog.btrim(p_delivery_notes), ''),
        delivery_checklist = v_checklist,
        delivery_idempotency_key = v_clean_idem,
        delivery_intent_fingerprint = v_intent_fingerprint
    WHERE id = v_session.id
    RETURNING * INTO v_updated;

    -- [Niveles 5 -> 6]
    PERFORM public.m06_sync_m03_state(
        v_updated.creation_id,
        v_updated.project_id,
        'completed',
        'delivered',
        'delivered',
        'delivered',
        v_effective_date
    );

    -- [Nivel 7]
    INSERT INTO public.commercial_events (
        creation_id, project_id, event_type, title, description, metadata, created_by
    )
    VALUES (
        v_updated.creation_id,
        v_updated.project_id,
        'delivery_completed',
        'Entrega final confirmada · ' || v_updated.title,
        COALESCE(v_updated.delivery_notes, 'Ceremonial de entrega completado a entera satisfacción en M06.'),
        pg_catalog.jsonb_build_object(
            'source', 'M06',
            'm06_action', 'delivery_completed',
            'fitting_session_id', v_updated.id,
            'session_number', v_updated.session_number,
            'delivery_local_date', v_effective_date::text,
            'waived_count', COALESCE(pg_catalog.array_length(v_waived_ids, 1), 0),
            'idempotency_key', 'delivery:' || v_clean_idem
        ),
        v_actor_id
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'session', pg_catalog.to_jsonb(v_updated)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_creation_delivery_m06(UUID, INT, TEXT, TEXT, JSONB, DATE, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_creation_delivery_m06(UUID, INT, TEXT, TEXT, JSONB, DATE, JSONB) TO authenticated, service_role, postgres;

-- 5.7. Registro idempotente de evidencia multimedia M06 con validación estricta de payload (Locks: 1 -> 2 -> 4)
CREATE OR REPLACE FUNCTION public.register_fitting_media_asset_m06(
    p_session_id UUID,
    p_expected_session_row_version INT,
    p_idempotency_key TEXT,
    p_asset_type TEXT,
    p_file_path TEXT,
    p_file_name TEXT,
    p_mime_type TEXT DEFAULT NULL,
    p_file_size_bytes BIGINT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_creation_id UUID;
    v_session public.atelier_fitting_sessions%ROWTYPE;
    v_existing public.commercial_media_assets%ROWTYPE;
    v_path_conflict public.commercial_media_assets%ROWTYPE;
    v_inserted public.commercial_media_assets%ROWTYPE;
    v_clean_path TEXT := NULLIF(pg_catalog.btrim(p_file_path), '');
    v_clean_name TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_file_name), ''), 'evidencia_m06');
    v_clean_mime TEXT := NULLIF(pg_catalog.btrim(p_mime_type), '');
    v_clean_desc TEXT := NULLIF(pg_catalog.btrim(p_description), '');
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_session_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_session_row_version es obligatorio al registrar evidencia.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al registrar evidencia.'
            USING ERRCODE = '23514';
    END IF;

    IF p_asset_type NOT IN ('fitting_photo', 'delivery_note') THEN
        RAISE EXCEPTION 'Tipo de activo inválido (%) para M06.', p_asset_type USING ERRCODE = '23514';
    END IF;

    IF v_clean_path IS NULL THEN
        RAISE EXCEPTION 'Ruta de almacenamiento obligatoria.' USING ERRCODE = '23514';
    END IF;

    SELECT creation_id INTO v_creation_id
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de fitting (%) no encontrada.', p_session_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2]
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;
    SELECT * INTO v_session
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    -- 1º: Búsqueda por llave de idempotencia y validación estricta de coincidencia de payload
    SELECT * INTO v_existing
    FROM public.commercial_media_assets
    WHERE fitting_session_id = p_session_id
      AND idempotency_key = v_clean_idem
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.asset_type IS DISTINCT FROM p_asset_type
           OR v_existing.file_path IS DISTINCT FROM v_clean_path
           OR v_existing.file_name IS DISTINCT FROM v_clean_name
           OR v_existing.mime_type IS DISTINCT FROM v_clean_mime
           OR v_existing.file_size_bytes IS DISTINCT FROM p_file_size_bytes
           OR v_existing.description IS DISTINCT FROM v_clean_desc
        THEN
            RAISE EXCEPTION 'Conflicto de idempotencia M06: p_idempotency_key (%) ya fue registrada con otro payload multimedia en la sesión (%).', v_clean_idem, p_session_id
                USING ERRCODE = '23505';
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'asset', pg_catalog.to_jsonb(v_existing)
        );
    END IF;

    -- 2º: Detectar colisión de file_path reclamado por otra llave de idempotencia
    SELECT * INTO v_path_conflict
    FROM public.commercial_media_assets
    WHERE fitting_session_id = p_session_id
      AND file_path = v_clean_path
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Conflicto de idempotencia M06: file_path (%) ya está registrado bajo otra llave de idempotencia en la sesión (%).', v_clean_path, p_session_id
            USING ERRCODE = '23505';
    END IF;

    -- 3º: Control optimista obligatorio sobre la sesión padre
    IF v_session.row_version IS DISTINCT FROM p_expected_session_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: la sesión cambió antes de adjuntar evidencia (esperada v%, actual v%).', p_expected_session_row_version, v_session.row_version
            USING ERRCODE = '40001';
    END IF;

    -- Impedir resurrección de un file_path ya eliminado en esa sesión
    IF EXISTS (
        SELECT 1
        FROM pg_catalog.jsonb_each(v_session.media_delete_receipts) AS r(k, val)
        WHERE val->>'file_path' = v_clean_path
    ) THEN
        RAISE EXCEPTION 'Conflicto de idempotencia M06: la ruta (%) ya fue eliminada en esta sesión y no puede reregistrarse.', v_clean_path
            USING ERRCODE = '23505';
    END IF;

    -- [Nivel 4] Insert de evidencia con campos ya normalizados
    INSERT INTO public.commercial_media_assets (
        creation_id, project_id, fitting_session_id,
        asset_type, file_path, file_name, mime_type, file_size_bytes, description, idempotency_key, created_by
    )
    VALUES (
        v_session.creation_id,
        v_session.project_id,
        v_session.id,
        p_asset_type,
        v_clean_path,
        v_clean_name,
        v_clean_mime,
        p_file_size_bytes,
        v_clean_desc,
        v_clean_idem,
        v_actor_id
    )
    RETURNING * INTO v_inserted;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'asset', pg_catalog.to_jsonb(v_inserted)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_fitting_media_asset_m06(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_fitting_media_asset_m06(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT) TO authenticated, service_role, postgres;

-- 5.8. Eliminación idempotente de evidencia multimedia M06 (Locks: 1 -> 2 -> 4 -> update 2; recupera file_path tras perder respuesta)
CREATE OR REPLACE FUNCTION public.delete_fitting_media_asset_m06(
    p_asset_id UUID,
    p_session_id UUID,
    p_expected_session_row_version INT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_creation_id UUID;
    v_session public.atelier_fitting_sessions%ROWTYPE;
    v_updated_session public.atelier_fitting_sessions%ROWTYPE;
    v_asset public.commercial_media_assets%ROWTYPE;
    v_receipt JSONB;
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M06: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'Integridad M06: p_session_id es obligatorio al eliminar evidencia de sesión.'
            USING ERRCODE = '23514';
    END IF;

    IF p_expected_session_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M06: p_expected_session_row_version es obligatorio al eliminar evidencia de sesión.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M06: p_idempotency_key es obligatorio al eliminar evidencia.'
            USING ERRCODE = '23514';
    END IF;

    -- Lectura previa sin lock desde la sesión (sobrevive incluso si p_asset_id ya fue borrada en el intento previo)
    SELECT creation_id INTO v_creation_id
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de fitting (%) no encontrada.', p_session_id USING ERRCODE = '23503';
    END IF;

    -- [Lock Nivel 1 -> Nivel 2]
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;
    SELECT * INTO v_session
    FROM public.atelier_fitting_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    -- 1º: Evaluar idempotencia en media_delete_receipts ANTES de comparar row_version (recupera respuesta perdida y file_path)
    IF v_session.media_delete_receipts ? v_clean_idem THEN
        v_receipt := v_session.media_delete_receipts -> v_clean_idem;

        IF (v_receipt->>'asset_id') IS DISTINCT FROM p_asset_id::text THEN
            RAISE EXCEPTION 'Conflicto de idempotencia M06: p_idempotency_key (%) ya fue usada para eliminar otro activo (%) en la sesión (%).', v_clean_idem, v_receipt->>'asset_id', p_session_id
                USING ERRCODE = '23505';
        END IF;

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'deleted_asset_id', p_asset_id,
            'file_path', v_receipt->>'file_path',
            'session', pg_catalog.to_jsonb(v_session)
        );
    END IF;

    -- 2º: Estado sellado y versión optimista obligatoria de la sesión
    IF v_session.status IN ('approved', 'cancelled') OR v_session.delivery_confirmed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Historial sellado M06: no es posible retirar evidencia de una sesión aprobada, cancelada o entregada.'
            USING ERRCODE = '42501';
    END IF;

    IF v_session.row_version IS DISTINCT FROM p_expected_session_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M06: la sesión cambió antes de retirar evidencia (esperada v%, actual v%).', p_expected_session_row_version, v_session.row_version
            USING ERRCODE = '40001';
    END IF;

    -- [Lock Nivel 4] Verificar y bloquear activo perteneciente exactamente a esta sesión
    SELECT * INTO v_asset
    FROM public.commercial_media_assets
    WHERE id = p_asset_id
      AND fitting_session_id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        IF EXISTS (
            SELECT 1
            FROM pg_catalog.jsonb_each(v_session.media_delete_receipts) AS r(k, val)
            WHERE val->>'asset_id' = p_asset_id::text
        ) THEN
            RAISE EXCEPTION 'Conflicto de concurrencia M06: el archivo (%) ya fue eliminado por otra operación.', p_asset_id
                USING ERRCODE = '40001';
        END IF;

        RAISE EXCEPTION 'Archivo (%) no encontrado en la sesión (%).', p_asset_id, p_session_id
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM public.commercial_media_assets
    WHERE id = p_asset_id
      AND fitting_session_id = p_session_id;

    -- [Nivel 2 ya bloqueado] Registrar recibo inmutable de borrado para soportar reintentos y recuperación de file_path
    UPDATE public.atelier_fitting_sessions
    SET media_delete_receipts = media_delete_receipts || pg_catalog.jsonb_build_object(
        v_clean_idem,
        pg_catalog.jsonb_build_object(
            'asset_id', v_asset.id,
            'file_path', v_asset.file_path,
            'asset_type', v_asset.asset_type,
            'deleted_at', pg_catalog.now(),
            'deleted_by', v_actor_id
        )
    )
    WHERE id = p_session_id
    RETURNING * INTO v_updated_session;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'deleted_asset_id', v_asset.id,
        'file_path', v_asset.file_path,
        'session', pg_catalog.to_jsonb(v_updated_session)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_fitting_media_asset_m06(UUID, UUID, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_fitting_media_asset_m06(UUID, UUID, INT, TEXT) TO authenticated, service_role, postgres;

-- ==============================================================================
-- 6. TRIGGERS DETERMINISTAS (PREFIJADOS 01/02/03) E ÍNDICES DE INTEGRIDAD/RENDIMIENTO
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_m06_sessions_01_links ON public.atelier_fitting_sessions;
CREATE TRIGGER trg_m06_sessions_01_links
    BEFORE INSERT OR UPDATE OF creation_id, project_id, pattern_execution_id
    ON public.atelier_fitting_sessions
    FOR EACH ROW EXECUTE FUNCTION public.validate_m06_fitting_session_links();

DROP TRIGGER IF EXISTS trg_m06_sessions_02_history ON public.atelier_fitting_sessions;
CREATE TRIGGER trg_m06_sessions_02_history
    BEFORE INSERT OR UPDATE OR DELETE
    ON public.atelier_fitting_sessions
    FOR EACH ROW EXECUTE FUNCTION public.protect_m06_fitting_session_history();

DROP TRIGGER IF EXISTS trg_m06_sessions_03_audit_meta ON public.atelier_fitting_sessions;
CREATE TRIGGER trg_m06_sessions_03_audit_meta
    BEFORE UPDATE ON public.atelier_fitting_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_m06_audit_columns();

DROP TRIGGER IF EXISTS trg_m06_adjustments_01_validate_protect ON public.atelier_fitting_adjustments;
CREATE TRIGGER trg_m06_adjustments_01_validate_protect
    BEFORE INSERT OR UPDATE OR DELETE
    ON public.atelier_fitting_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.validate_and_protect_m06_adjustment();

DROP TRIGGER IF EXISTS trg_m06_adjustments_02_audit_meta ON public.atelier_fitting_adjustments;
CREATE TRIGGER trg_m06_adjustments_02_audit_meta
    BEFORE UPDATE ON public.atelier_fitting_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.update_m06_audit_columns();

DROP TRIGGER IF EXISTS trg_m06_media_validate_protect ON public.commercial_media_assets;
CREATE TRIGGER trg_m06_media_validate_protect
    BEFORE INSERT OR UPDATE OR DELETE
    ON public.commercial_media_assets
    FOR EACH ROW EXECUTE FUNCTION public.validate_m06_media_session_creation();

-- Índices únicos parciales de idempotencia (sesiones, ajustes, medios y entrega única)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_fitting_sessions_idempotency
    ON public.atelier_fitting_sessions(creation_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND pg_catalog.btrim(idempotency_key) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_fitting_sessions_approval_idem
    ON public.atelier_fitting_sessions(id, approval_idempotency_key)
    WHERE approval_idempotency_key IS NOT NULL AND pg_catalog.btrim(approval_idempotency_key) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_fitting_sessions_delivery_idem
    ON public.atelier_fitting_sessions(creation_id, delivery_idempotency_key)
    WHERE delivery_idempotency_key IS NOT NULL AND pg_catalog.btrim(delivery_idempotency_key) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_fitting_sessions_one_delivery_per_creation
    ON public.atelier_fitting_sessions(creation_id)
    WHERE delivery_confirmed_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_atelier_fitting_adjustments_idempotency
    ON public.atelier_fitting_adjustments(fitting_session_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND pg_catalog.btrim(idempotency_key) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_commercial_media_assets_m06_session_path
    ON public.commercial_media_assets(fitting_session_id, file_path)
    WHERE fitting_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_commercial_media_assets_m06_idempotency
    ON public.commercial_media_assets(fitting_session_id, idempotency_key)
    WHERE fitting_session_id IS NOT NULL AND idempotency_key IS NOT NULL AND pg_catalog.btrim(idempotency_key) <> '';

-- Índices de consulta operacional
CREATE INDEX IF NOT EXISTS idx_atelier_fitting_sessions_creation_num
    ON public.atelier_fitting_sessions(creation_id, session_number DESC);

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_sessions_status_sched
    ON public.atelier_fitting_sessions(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_sessions_project
    ON public.atelier_fitting_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_sessions_pattern_exec
    ON public.atelier_fitting_sessions(pattern_execution_id);

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_adjustments_session
    ON public.atelier_fitting_adjustments(fitting_session_id, status);

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_adjustments_creation_status
    ON public.atelier_fitting_adjustments(creation_id, status);

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_adjustments_verified_session
    ON public.atelier_fitting_adjustments(verified_in_session_id)
    WHERE verified_in_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atelier_fitting_adjustments_waived_session
    ON public.atelier_fitting_adjustments(waived_in_session_id)
    WHERE waived_in_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_media_assets_fitting_session
    ON public.commercial_media_assets(fitting_session_id)
    WHERE fitting_session_id IS NOT NULL;

-- ==============================================================================
-- 7. SEGURIDAD RLS Y PRIVILEGIOS MÍNIMOS
-- ==============================================================================

ALTER TABLE public.atelier_fitting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_fitting_adjustments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
    public.atelier_fitting_sessions,
    public.atelier_fitting_adjustments
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.atelier_fitting_sessions
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
    public.atelier_fitting_adjustments
TO authenticated;

GRANT ALL ON TABLE
    public.atelier_fitting_sessions,
    public.atelier_fitting_adjustments
TO service_role, postgres;

DROP POLICY IF EXISTS "designer_admin_select_atelier_fitting_sessions" ON public.atelier_fitting_sessions;
CREATE POLICY "designer_admin_select_atelier_fitting_sessions"
    ON public.atelier_fitting_sessions FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_insert_atelier_fitting_sessions" ON public.atelier_fitting_sessions;
CREATE POLICY "designer_admin_insert_atelier_fitting_sessions"
    ON public.atelier_fitting_sessions FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_designer() AND created_by IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "designer_admin_update_atelier_fitting_sessions" ON public.atelier_fitting_sessions;
CREATE POLICY "designer_admin_update_atelier_fitting_sessions"
    ON public.atelier_fitting_sessions FOR UPDATE TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_delete_atelier_fitting_sessions" ON public.atelier_fitting_sessions;
CREATE POLICY "designer_admin_delete_atelier_fitting_sessions"
    ON public.atelier_fitting_sessions FOR DELETE TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_select_atelier_fitting_adjustments" ON public.atelier_fitting_adjustments;
CREATE POLICY "designer_admin_select_atelier_fitting_adjustments"
    ON public.atelier_fitting_adjustments FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_insert_atelier_fitting_adjustments" ON public.atelier_fitting_adjustments;
CREATE POLICY "designer_admin_insert_atelier_fitting_adjustments"
    ON public.atelier_fitting_adjustments FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_designer() AND created_by IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "designer_admin_update_atelier_fitting_adjustments" ON public.atelier_fitting_adjustments;
CREATE POLICY "designer_admin_update_atelier_fitting_adjustments"
    ON public.atelier_fitting_adjustments FOR UPDATE TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

COMMIT;
