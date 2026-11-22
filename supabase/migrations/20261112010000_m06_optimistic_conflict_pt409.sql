-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 06: MIGRACIÓN CORRECTIVA ADITIVA (CONFLICTO OPTIMISTA PT409)
-- Archivo: supabase/migrations/20261112010000_m06_optimistic_conflict_pt409.sql
-- ==============================================================================
-- Motivo: PostgREST 14.18 trata SQLSTATE de la clase 40 (serialization_failure) como
-- fallo transitorio y reintenta la RPC hasta HTTP 504. Los conflictos de row_version
-- de M06 son conflictos de NEGOCIO (no transitorios), por lo que deben devolverse al
-- cliente de inmediato. PostgREST mapea SQLSTATE 'PT409' directamente a HTTP 409.
--
-- Alcance estricto:
--   * No edita ni reejecuta 20261112000000_fittings_adjustments_m06.sql.
--   * Reemplaza (CREATE OR REPLACE) únicamente las 7 RPCs que contienen conflictos
--     optimistas, cambiando ERRCODE '40001' -> 'PT409' (8 ocurrencias).
--     create_fitting_session_m06 no usa row_version y no se toca.
--   * Cuerpo, firmas, SECURITY DEFINER, SET search_path = '', orden de bloqueos 1->7,
--     idempotencia, row_version, RLS y REVOKE/GRANT permanecen idénticos.
--   * Los códigos genuinos de PostgreSQL (23505, 23514, 23503, 42501) no se modifican.
-- ==============================================================================

BEGIN;

-- update_fitting_session_m06: 1 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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

-- add_fitting_adjustment_m06: 1 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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

-- resolve_fitting_adjustment_m06: 1 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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

-- approve_fitting_session_m06: 1 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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

-- confirm_creation_delivery_m06: 1 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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

-- register_fitting_media_asset_m06: 1 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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

-- delete_fitting_media_asset_m06: 2 conflicto(s) optimista(s) 40001 -> PT409
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
            USING ERRCODE = 'PT409';
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
                USING ERRCODE = 'PT409';
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

-- Post-condición atómica: ninguna de las 7 RPCs conserva '40001' y todas usan 'PT409'.
DO $$
DECLARE
    v_name TEXT;
    v_src TEXT;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
        'update_fitting_session_m06',
        'add_fitting_adjustment_m06',
        'resolve_fitting_adjustment_m06',
        'approve_fitting_session_m06',
        'confirm_creation_delivery_m06',
        'register_fitting_media_asset_m06',
        'delete_fitting_media_asset_m06'
    ]
    LOOP
        SELECT p.prosrc INTO v_src
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = v_name;

        IF v_src IS NULL THEN
            RAISE EXCEPTION 'Post-condición PT409: la función public.% no existe.', v_name;
        END IF;

        IF v_src LIKE '%ERRCODE = ''40001''%' OR v_src NOT LIKE '%ERRCODE = ''PT409''%' THEN
            RAISE EXCEPTION 'Post-condición PT409: la función public.% no usa PT409 de forma exclusiva en conflictos optimistas.', v_name;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
