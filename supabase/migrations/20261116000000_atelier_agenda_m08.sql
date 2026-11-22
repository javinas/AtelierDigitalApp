-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 08: AGENDA DEL ATELIER (MVP)
-- Archivo: supabase/migrations/20261116000000_atelier_agenda_m08.sql
-- Proyecto: trgoqqvsprknswobvniu
-- ==============================================================================
-- Implementación 100% aditiva y aislada (CERO ALTER TABLE sobre M00–M07).
-- Cumple obligatoriamente los 4 ajustes aprobados:
--   1. client_id NULLABLE (permite reuniones con proveedores y tareas internas).
--   2. creation_id NULLABLE con ON DELETE SET NULL (preserva historial si se
--      elimina un borrador de creación, sin borrados en cascada).
--   3. Bloqueo transaccional de traslapes horarios en el mismo location_space
--      mediante pg_advisory_xact_lock + verificación concurrente.
--   4. Consolidación sin duplicados de citas M08, pruebas M06, compromisos de
--      entrega M03 (máx. 1 por Creación) y jornadas de medición M02 en
--      zona horaria America/Bogota.
-- Acceso RLS restringido exclusivamente a public.is_admin_or_designer().
-- Deja columna client_visibility preparada para futuro M09.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. HELPERS INTERNOS DE AUDITORÍA Y NOMBRES M08
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.m08_resolve_actor_name(p_user_id UUID)
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

REVOKE ALL ON FUNCTION public.m08_resolve_actor_name(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m08_resolve_actor_name(UUID) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.update_m08_appointment_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_is_fk_set_null_only BOOLEAN := FALSE;
BEGIN
    -- Permitir acciones referenciales internas ON DELETE SET NULL en FKs opcionales
    -- incluso cuando la cita ya estaba cancelada o completada, preservando historial.
    IF TG_OP = 'UPDATE' AND pg_catalog.pg_trigger_depth() > 0 THEN
        v_is_fk_set_null_only :=
            NEW.id IS NOT DISTINCT FROM OLD.id
            AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id
            AND NEW.appointment_type IS NOT DISTINCT FROM OLD.appointment_type
            AND NEW.status IS NOT DISTINCT FROM OLD.status
            AND NEW.title IS NOT DISTINCT FROM OLD.title
            AND NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
            AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at
            AND NEW.location_space IS NOT DISTINCT FROM OLD.location_space
            AND NEW.assigned_staff IS NOT DISTINCT FROM OLD.assigned_staff
            AND NEW.preparation_notes IS NOT DISTINCT FROM OLD.preparation_notes
            AND NEW.outcome_notes IS NOT DISTINCT FROM OLD.outcome_notes
            AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at
            AND NEW.cancelled_at IS NOT DISTINCT FROM OLD.cancelled_at
            AND NEW.cancelled_by IS NOT DISTINCT FROM OLD.cancelled_by
            AND NEW.cancellation_reason IS NOT DISTINCT FROM OLD.cancellation_reason
            AND NEW.client_visibility IS NOT DISTINCT FROM OLD.client_visibility
            AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
            AND NEW.last_update_idempotency_key IS NOT DISTINCT FROM OLD.last_update_idempotency_key
            AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
            AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
            AND (NEW.creation_id IS NULL OR NEW.creation_id IS NOT DISTINCT FROM OLD.creation_id)
            AND (NEW.person_id IS NULL OR NEW.person_id IS NOT DISTINCT FROM OLD.person_id)
            AND (NEW.fitting_session_id IS NULL OR NEW.fitting_session_id IS NOT DISTINCT FROM OLD.fitting_session_id)
            AND (NEW.campaign_id IS NULL OR NEW.campaign_id IS NOT DISTINCT FROM OLD.campaign_id)
            AND (NEW.supplier_id IS NULL OR NEW.supplier_id IS NOT DISTINCT FROM OLD.supplier_id)
            AND (
                NEW.creation_id IS DISTINCT FROM OLD.creation_id
                OR NEW.person_id IS DISTINCT FROM OLD.person_id
                OR NEW.fitting_session_id IS DISTINCT FROM OLD.fitting_session_id
                OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
                OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
            );

        IF v_is_fk_set_null_only THEN
            NEW.updated_at = pg_catalog.now();
            NEW.row_version = OLD.row_version + 1;
            RETURN NEW;
        END IF;
    END IF;

    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Ciclo M08: una cita cancelada es inmutable y no puede modificarse.'
            USING ERRCODE = '23514';
    END IF;

    NEW.updated_at = pg_catalog.now();
    NEW.row_version = OLD.row_version + 1;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_m08_appointment_audit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_m08_appointment_audit() TO authenticated, service_role, postgres;

-- ==============================================================================
-- 2. NUEVA TABLA PRINCIPAL: public.atelier_appointments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.atelier_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    person_id UUID NULL REFERENCES public.persons(id) ON DELETE SET NULL,
    creation_id UUID NULL REFERENCES public.creations(id) ON DELETE SET NULL,
    fitting_session_id UUID NULL UNIQUE REFERENCES public.atelier_fitting_sessions(id) ON DELETE SET NULL,
    campaign_id UUID NULL REFERENCES public.measurement_campaigns(id) ON DELETE SET NULL,
    supplier_id UUID NULL REFERENCES public.atelier_suppliers(id) ON DELETE SET NULL,

    appointment_type TEXT NOT NULL DEFAULT 'consultation'
        CHECK (appointment_type IN (
            'consultation',        -- Consulta inicial / asesoría personalizada
            'measurement_session', -- Toma de medidas anatómicas
            'design_presentation', -- Presentación de bocetos, telas y propuesta
            'toile_fitting',       -- Prueba en glasilla (toile)
            'garment_fitting',     -- Prueba en tela definitiva
            'final_fitting',       -- Prueba final con calzado y acabados
            'delivery_ceremony',   -- Entrega solemne / recogida de prenda
            'pickup_return',       -- Recogida / devolución o compostura rápida
            'alteration_review',   -- Revisión de ajuste o transformación
            'supplier_meeting',    -- Reunión con proveedor / casa textil (sin clienta)
            'group_campaign',      -- Jornada de medición grupal
            'internal_activity',   -- Actividad interna de taller (sin clienta)
            'other'                -- Otra actividad del atelier
        )),
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN (
            'scheduled',   -- Programada (ocupa espacio horario)
            'confirmed',   -- Confirmada por clienta/participante (ocupa espacio)
            'rescheduled', -- Reprogramada a nuevo horario activo (ocupa espacio)
            'completed',   -- Realizada / cerrada
            'cancelled',   -- Cancelada auditadamente (libera espacio, inmutable)
            'no_show'      -- Inasistencia registrada (libera espacio)
        )),

    title TEXT NOT NULL CHECK (pg_catalog.btrim(title) <> ''),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    location_space TEXT NOT NULL DEFAULT 'probador_principal'
        CHECK (location_space IN (
            'probador_principal', -- Probador Principal By Katherine Carroll
            'salon_privado',      -- Salón Privado / Atención Editorial
            'mesa_corte_taller',  -- Mesa de Corte & Patronaje
            'taller_general',     -- Taller Interno de Confección
            'visita_externa',     -- Visita Externa / Domicilio / Evento
            'virtual'             -- Videollamada / Sesión Remota (no bloquea espacio físico)
        )),

    assigned_staff TEXT,
    preparation_notes TEXT,
    outcome_notes TEXT,
    completed_at TIMESTAMPTZ,

    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    cancelled_by_name TEXT,
    cancellation_reason TEXT,

    client_visibility TEXT NOT NULL DEFAULT 'internal_only'
        CHECK (client_visibility IN ('internal_only', 'client_visible')),

    idempotency_key TEXT UNIQUE,
    last_update_idempotency_key TEXT UNIQUE,
    row_version INT NOT NULL DEFAULT 1 CHECK (row_version >= 1),

    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

    CONSTRAINT chk_m08_ends_after_starts CHECK (ends_at > starts_at),
    CONSTRAINT chk_m08_max_duration CHECK (ends_at <= starts_at + interval '12 hours'),
    CONSTRAINT chk_m08_completed_timestamp CHECK (
        status <> 'completed' OR completed_at IS NOT NULL
    ),
    CONSTRAINT chk_m08_cancelled_fields CHECK (
        (status <> 'cancelled')
        OR (
            cancelled_at IS NOT NULL
            AND cancelled_by IS NOT NULL
            AND pg_catalog.btrim(COALESCE(cancellation_reason, '')) <> ''
        )
    )
);

COMMENT ON TABLE public.atelier_appointments IS 'M08: Agenda unificada del atelier con soporte para citas de clientas, pruebas, entregas, proveedores y actividades internas.';
COMMENT ON COLUMN public.atelier_appointments.client_id IS 'Opcional (NULLABLE) para permitir reuniones con proveedores y actividades internas sin clienta.';
COMMENT ON COLUMN public.atelier_appointments.creation_id IS 'Opcional (ON DELETE SET NULL) para preservar el historial de agenda si se descarta un borrador de creación.';
COMMENT ON COLUMN public.atelier_appointments.client_visibility IS 'Preparación M09 (Portal de Clientas): visibilidad futura en portal sin abrir acceso actual al rol client.';

-- Índices de consulta, consolidación y verificación rápida de traslapes
CREATE INDEX IF NOT EXISTS idx_atelier_appointments_window
    ON public.atelier_appointments(starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_atelier_appointments_space_active
    ON public.atelier_appointments(location_space, starts_at, ends_at)
    WHERE status IN ('scheduled', 'confirmed', 'rescheduled');

CREATE INDEX IF NOT EXISTS idx_atelier_appointments_client
    ON public.atelier_appointments(client_id)
    WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atelier_appointments_creation
    ON public.atelier_appointments(creation_id)
    WHERE creation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atelier_appointments_campaign
    ON public.atelier_appointments(campaign_id)
    WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atelier_appointments_supplier
    ON public.atelier_appointments(supplier_id)
    WHERE supplier_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_atelier_appointments_audit ON public.atelier_appointments;
CREATE TRIGGER trg_atelier_appointments_audit
    BEFORE UPDATE ON public.atelier_appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_m08_appointment_audit();

-- ==============================================================================
-- 3. SEGURIDAD RLS Y PERMISOS (SOLO ADMIN Y DESIGNER)
-- ==============================================================================

ALTER TABLE public.atelier_appointments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.atelier_appointments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.atelier_appointments TO authenticated;
GRANT ALL ON TABLE public.atelier_appointments TO service_role, postgres;

DROP POLICY IF EXISTS "designer_admin_select_atelier_appointments" ON public.atelier_appointments;
CREATE POLICY "designer_admin_select_atelier_appointments"
    ON public.atelier_appointments FOR SELECT TO authenticated
    USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_insert_atelier_appointments" ON public.atelier_appointments;
CREATE POLICY "designer_admin_insert_atelier_appointments"
    ON public.atelier_appointments FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_designer() AND created_by IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "designer_admin_update_atelier_appointments" ON public.atelier_appointments;
CREATE POLICY "designer_admin_update_atelier_appointments"
    ON public.atelier_appointments FOR UPDATE TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "admin_only_delete_atelier_appointments" ON public.atelier_appointments;
CREATE POLICY "admin_only_delete_atelier_appointments"
    ON public.atelier_appointments FOR DELETE TO authenticated
    USING (public.is_admin());

-- ==============================================================================
-- 4. HELPER TRANSACCIONAL INTERNO DE VALIDACIÓN DE TRASLAPE POR ESPACIO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.m08_assert_no_space_overlap(
    p_location_space TEXT,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_conflict RECORD;
    v_start_bog TEXT;
    v_end_bog TEXT;
BEGIN
    IF p_location_space = 'virtual' THEN
        RETURN;
    END IF;

    SELECT id, title, starts_at, ends_at, status
    INTO v_conflict
    FROM public.atelier_appointments
    WHERE location_space = p_location_space
      AND status IN ('scheduled', 'confirmed', 'rescheduled')
      AND (p_exclude_appointment_id IS NULL OR id <> p_exclude_appointment_id)
      AND starts_at < p_ends_at
      AND ends_at > p_starts_at
    ORDER BY starts_at ASC
    LIMIT 1;

    IF FOUND THEN
        v_start_bog := pg_catalog.to_char(v_conflict.starts_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI');
        v_end_bog := pg_catalog.to_char(v_conflict.ends_at AT TIME ZONE 'America/Bogota', 'HH24:MI');
        RAISE EXCEPTION 'M08_OVERLAP_CONFLICT: El espacio "%" ya tiene reservada la actividad "%" (% a % hora Bogotá). Elige otro horario o espacio.',
            p_location_space, v_conflict.title, v_start_bog, v_end_bog
            USING ERRCODE = '23P01';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.m08_assert_no_space_overlap(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.m08_assert_no_space_overlap(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO service_role, postgres;

-- ==============================================================================
-- 5. RPC 1/4: PROGRAMAR CITA O ACTIVIDAD (schedule_atelier_appointment_m08)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.schedule_atelier_appointment_m08(
    p_title TEXT,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_idempotency_key TEXT,
    p_appointment_type TEXT DEFAULT 'consultation',
    p_location_space TEXT DEFAULT 'probador_principal',
    p_client_id UUID DEFAULT NULL,
    p_person_id UUID DEFAULT NULL,
    p_creation_id UUID DEFAULT NULL,
    p_fitting_session_id UUID DEFAULT NULL,
    p_campaign_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL,
    p_assigned_staff TEXT DEFAULT NULL,
    p_preparation_notes TEXT DEFAULT NULL,
    p_client_visibility TEXT DEFAULT 'internal_only',
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
    v_clean_title TEXT := NULLIF(pg_catalog.btrim(p_title), '');
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_space TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_location_space), ''), 'probador_principal');
    v_type TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_appointment_type), ''), 'consultation');
    v_status TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_initial_status), ''), 'scheduled');
    v_visibility TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_client_visibility), ''), 'internal_only');
    v_existing public.atelier_appointments%ROWTYPE;
    v_inserted public.atelier_appointments%ROWTYPE;
    v_creation_client_id UUID;
    v_resolved_client_id UUID := p_client_id;
    v_person_client_id UUID;
    v_fitting_creation_id UUID;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M08: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF v_clean_title IS NULL THEN
        RAISE EXCEPTION 'Validación M08: el título de la cita o actividad es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M08: p_idempotency_key es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
        RAISE EXCEPTION 'Validación M08: la hora de finalización debe ser posterior a la hora de inicio.'
            USING ERRCODE = '23514';
    END IF;

    IF p_ends_at > p_starts_at + interval '12 hours' THEN
        RAISE EXCEPTION 'Validación M08: la duración máxima permitida por bloque es de 12 horas.'
            USING ERRCODE = '23514';
    END IF;

    IF v_status NOT IN ('scheduled', 'confirmed') THEN
        RAISE EXCEPTION 'Ciclo M08: estado inicial inválido (%) para una nueva cita.', v_status
            USING ERRCODE = '23514';
    END IF;

    -- Bloqueo transaccional por espacio físico para serializar reservas simultáneas
    IF v_space <> 'virtual' THEN
        PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('m08_space_lock:' || v_space));
    END IF;

    -- 1º Evaluar idempotencia bajo bloqueo
    SELECT * INTO v_existing
    FROM public.atelier_appointments
    WHERE idempotency_key = v_clean_idem
    LIMIT 1;

    IF FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'appointment', pg_catalog.to_jsonb(v_existing)
        );
    END IF;

    -- 2º Validar coherencia de FKs opcionales
    IF p_creation_id IS NOT NULL THEN
        SELECT client_id INTO v_creation_client_id
        FROM public.creations
        WHERE id = p_creation_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Integridad M08: la creación (%) no existe.', p_creation_id
                USING ERRCODE = '23503';
        END IF;
        IF v_resolved_client_id IS NULL THEN
            v_resolved_client_id := v_creation_client_id;
        ELSIF v_resolved_client_id <> v_creation_client_id THEN
            RAISE EXCEPTION 'Integridad M08: la creación seleccionada pertenece a otra clienta.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF p_person_id IS NOT NULL THEN
        SELECT client_id INTO v_person_client_id
        FROM public.persons
        WHERE id = p_person_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Integridad M08: el sujeto medido (%) no existe.', p_person_id
                USING ERRCODE = '23503';
        END IF;
        IF v_resolved_client_id IS NOT NULL AND v_resolved_client_id <> v_person_client_id THEN
            RAISE EXCEPTION 'Integridad M08: la persona medida no pertenece a la clienta seleccionada.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF p_fitting_session_id IS NOT NULL THEN
        SELECT creation_id INTO v_fitting_creation_id
        FROM public.atelier_fitting_sessions
        WHERE id = p_fitting_session_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Integridad M08: la sesión de fitting M06 (%) no existe.', p_fitting_session_id
                USING ERRCODE = '23503';
        END IF;
        IF p_creation_id IS NOT NULL AND p_creation_id <> v_fitting_creation_id THEN
            RAISE EXCEPTION 'Integridad M08: la sesión de fitting M06 pertenece a otra creación.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    -- 3º Validar que no exista traslape horario en el mismo espacio físico
    PERFORM public.m08_assert_no_space_overlap(v_space, p_starts_at, p_ends_at, NULL);

    v_actor_name := public.m08_resolve_actor_name(v_actor_id);

    INSERT INTO public.atelier_appointments (
        client_id, person_id, creation_id, fitting_session_id, campaign_id, supplier_id,
        appointment_type, status, title, starts_at, ends_at, location_space,
        assigned_staff, preparation_notes, client_visibility,
        idempotency_key, created_by, created_by_name
    )
    VALUES (
        v_resolved_client_id,
        p_person_id,
        p_creation_id,
        p_fitting_session_id,
        p_campaign_id,
        p_supplier_id,
        v_type,
        v_status,
        v_clean_title,
        p_starts_at,
        p_ends_at,
        v_space,
        NULLIF(pg_catalog.btrim(p_assigned_staff), ''),
        NULLIF(pg_catalog.btrim(p_preparation_notes), ''),
        v_visibility,
        v_clean_idem,
        v_actor_id,
        v_actor_name
    )
    RETURNING * INTO v_inserted;

    -- Trazabilidad en bitácora M03 únicamente si la cita pertenece a una Creación
    IF p_creation_id IS NOT NULL THEN
        INSERT INTO public.commercial_events (
            creation_id,
            event_type,
            title,
            description,
            metadata,
            created_by
        )
        VALUES (
            p_creation_id,
            'milestone',
            'Agenda M08 · ' || v_inserted.title,
            'Cita programada en ' || v_inserted.location_space || ' para ' ||
                pg_catalog.to_char(v_inserted.starts_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI') || ' (hora Bogotá).',
            pg_catalog.jsonb_build_object(
                'm08_action', 'appointment_scheduled',
                'appointment_id', v_inserted.id,
                'appointment_type', v_inserted.appointment_type,
                'starts_at', v_inserted.starts_at,
                'ends_at', v_inserted.ends_at,
                'location_space', v_inserted.location_space
            ),
            v_actor_id
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'appointment', pg_catalog.to_jsonb(v_inserted)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_atelier_appointment_m08(
    TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.schedule_atelier_appointment_m08(
    TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role, postgres;

-- ==============================================================================
-- 6. RPC 2/4: ACTUALIZAR / CONFIRMAR / REPROGRAMAR / COMPLETAR CITA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_atelier_appointment_m08(
    p_appointment_id UUID,
    p_expected_row_version INT,
    p_idempotency_key TEXT,
    p_title TEXT DEFAULT NULL,
    p_appointment_type TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_starts_at TIMESTAMPTZ DEFAULT NULL,
    p_ends_at TIMESTAMPTZ DEFAULT NULL,
    p_location_space TEXT DEFAULT NULL,
    p_assigned_staff TEXT DEFAULT NULL,
    p_preparation_notes TEXT DEFAULT NULL,
    p_outcome_notes TEXT DEFAULT NULL,
    p_client_visibility TEXT DEFAULT NULL,
    p_clear_creation BOOLEAN DEFAULT FALSE,
    p_creation_id UUID DEFAULT NULL,
    p_clear_client BOOLEAN DEFAULT FALSE,
    p_client_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_current public.atelier_appointments%ROWTYPE;
    v_updated public.atelier_appointments%ROWTYPE;
    v_old_space TEXT;
    v_target_space TEXT;
    v_target_status TEXT;
    v_target_starts TIMESTAMPTZ;
    v_target_ends TIMESTAMPTZ;
    v_lock_1 TEXT;
    v_lock_2 TEXT;
    v_target_client_id UUID;
    v_target_creation_id UUID;
    v_creation_client_id UUID;
    v_completed_at TIMESTAMPTZ;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M08: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M08: p_expected_row_version es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M08: p_idempotency_key es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    -- Lectura previa para determinar locks determinísticos de espacio
    SELECT location_space INTO v_old_space
    FROM public.atelier_appointments
    WHERE id = p_appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agenda M08: cita (%) no encontrada.', p_appointment_id
            USING ERRCODE = '23503';
    END IF;

    v_target_space := COALESCE(NULLIF(pg_catalog.btrim(p_location_space), ''), v_old_space);

    -- Adquirir advisory locks en orden lexicográfico estricto (cero deadlocks)
    IF v_old_space <> 'virtual' OR v_target_space <> 'virtual' THEN
        v_lock_1 := LEAST(v_old_space, v_target_space);
        v_lock_2 := GREATEST(v_old_space, v_target_space);
        IF v_lock_1 <> 'virtual' THEN
            PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('m08_space_lock:' || v_lock_1));
        END IF;
        IF v_lock_2 <> v_lock_1 AND v_lock_2 <> 'virtual' THEN
            PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('m08_space_lock:' || v_lock_2));
        END IF;
    END IF;

    SELECT * INTO v_current
    FROM public.atelier_appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    -- 1º Evaluar idempotencia bajo bloqueo antes de row_version
    IF v_current.last_update_idempotency_key = v_clean_idem THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'appointment', pg_catalog.to_jsonb(v_current)
        );
    END IF;

    -- 2º Control estricto de versión optimista PT409
    IF v_current.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M08: esta cita fue modificada en otro dispositivo o pestaña (esperada v%, actual v%). Recarga la agenda.',
            p_expected_row_version, v_current.row_version
            USING ERRCODE = 'PT409';
    END IF;

    IF v_current.status = 'cancelled' THEN
        RAISE EXCEPTION 'Ciclo M08: una cita cancelada no puede modificarse; programa una nueva cita.'
            USING ERRCODE = '23514';
    END IF;

    v_target_status := COALESCE(NULLIF(pg_catalog.btrim(p_status), ''), v_current.status);
    IF v_target_status = 'cancelled' THEN
        RAISE EXCEPTION 'Ciclo M08: utiliza cancel_atelier_appointment_m08 con motivo obligatorio para cancelar.'
            USING ERRCODE = '23514';
    END IF;

    v_target_starts := COALESCE(p_starts_at, v_current.starts_at);
    v_target_ends := COALESCE(p_ends_at, v_current.ends_at);
    v_target_space := COALESCE(NULLIF(pg_catalog.btrim(p_location_space), ''), v_current.location_space);

    IF v_target_ends <= v_target_starts THEN
        RAISE EXCEPTION 'Validación M08: la hora de finalización debe ser posterior a la hora de inicio.'
            USING ERRCODE = '23514';
    END IF;

    -- Si se está reprogramando fecha/hora y no se pasó status explícito, mantener activo o marcar rescheduled
    IF p_status IS NULL AND (v_target_starts IS DISTINCT FROM v_current.starts_at OR v_target_ends IS DISTINCT FROM v_current.ends_at) THEN
        IF v_current.status IN ('scheduled', 'confirmed') THEN
            v_target_status := 'rescheduled';
        END IF;
    END IF;

    IF v_target_status IN ('scheduled', 'confirmed', 'rescheduled') THEN
        PERFORM public.m08_assert_no_space_overlap(v_target_space, v_target_starts, v_target_ends, v_current.id);
    END IF;

    v_target_client_id := CASE WHEN p_clear_client THEN NULL ELSE COALESCE(p_client_id, v_current.client_id) END;
    v_target_creation_id := CASE WHEN p_clear_creation THEN NULL ELSE COALESCE(p_creation_id, v_current.creation_id) END;

    IF v_target_creation_id IS NOT NULL THEN
        SELECT client_id INTO v_creation_client_id FROM public.creations WHERE id = v_target_creation_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Integridad M08: la creación (%) no existe.', v_target_creation_id USING ERRCODE = '23503';
        END IF;
        IF v_target_client_id IS NULL THEN
            v_target_client_id := v_creation_client_id;
        ELSIF v_target_client_id <> v_creation_client_id THEN
            RAISE EXCEPTION 'Integridad M08: la creación seleccionada pertenece a otra clienta.' USING ERRCODE = '23514';
        END IF;
    END IF;

    v_completed_at := CASE
        WHEN v_target_status = 'completed' THEN COALESCE(v_current.completed_at, pg_catalog.now())
        ELSE NULL
    END;

    UPDATE public.atelier_appointments
    SET title = COALESCE(NULLIF(pg_catalog.btrim(p_title), ''), v_current.title),
        appointment_type = COALESCE(NULLIF(pg_catalog.btrim(p_appointment_type), ''), v_current.appointment_type),
        status = v_target_status,
        starts_at = v_target_starts,
        ends_at = v_target_ends,
        location_space = v_target_space,
        client_id = v_target_client_id,
        creation_id = v_target_creation_id,
        supplier_id = COALESCE(p_supplier_id, v_current.supplier_id),
        assigned_staff = COALESCE(p_assigned_staff, v_current.assigned_staff),
        preparation_notes = COALESCE(p_preparation_notes, v_current.preparation_notes),
        outcome_notes = COALESCE(p_outcome_notes, v_current.outcome_notes),
        client_visibility = COALESCE(NULLIF(pg_catalog.btrim(p_client_visibility), ''), v_current.client_visibility),
        completed_at = v_completed_at,
        last_update_idempotency_key = v_clean_idem
    WHERE id = v_current.id
    RETURNING * INTO v_updated;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'appointment', pg_catalog.to_jsonb(v_updated)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_atelier_appointment_m08(
    UUID, INT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, UUID, UUID
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_atelier_appointment_m08(
    UUID, INT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, UUID, UUID
) TO authenticated, service_role, postgres;

-- ==============================================================================
-- 7. RPC 3/4: CANCELACIÓN AUDITADA SIN BORRADO FÍSICO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cancel_atelier_appointment_m08(
    p_appointment_id UUID,
    p_expected_row_version INT,
    p_cancellation_reason TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_name TEXT;
    v_clean_reason TEXT := NULLIF(pg_catalog.btrim(p_cancellation_reason), '');
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_current public.atelier_appointments%ROWTYPE;
    v_updated public.atelier_appointments%ROWTYPE;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M08: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF p_expected_row_version IS NULL THEN
        RAISE EXCEPTION 'Concurrencia M08: p_expected_row_version es obligatorio al cancelar.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_reason IS NULL THEN
        RAISE EXCEPTION 'Auditoría M08: debes ingresar el motivo de cancelación.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Idempotencia M08: p_idempotency_key es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_current
    FROM public.atelier_appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agenda M08: cita (%) no encontrada.', p_appointment_id
            USING ERRCODE = '23503';
    END IF;

    IF v_current.last_update_idempotency_key = v_clean_idem THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'appointment', pg_catalog.to_jsonb(v_current)
        );
    END IF;

    IF v_current.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M08: esta cita fue modificada antes de cancelar (esperada v%, actual v%).',
            p_expected_row_version, v_current.row_version
            USING ERRCODE = 'PT409';
    END IF;

    IF v_current.status = 'cancelled' THEN
        RAISE EXCEPTION 'Ciclo M08: la cita ya se encontraba cancelada.'
            USING ERRCODE = '23514';
    END IF;

    IF v_current.status = 'completed' THEN
        RAISE EXCEPTION 'Ciclo M08: no puede cancelarse una cita que ya fue completada.'
            USING ERRCODE = '23514';
    END IF;

    v_actor_name := public.m08_resolve_actor_name(v_actor_id);

    UPDATE public.atelier_appointments
    SET status = 'cancelled',
        cancelled_at = pg_catalog.now(),
        cancelled_by = v_actor_id,
        cancelled_by_name = v_actor_name,
        cancellation_reason = v_clean_reason,
        last_update_idempotency_key = v_clean_idem
    WHERE id = v_current.id
    RETURNING * INTO v_updated;

    IF v_updated.creation_id IS NOT NULL THEN
        INSERT INTO public.commercial_events (
            creation_id,
            event_type,
            title,
            description,
            metadata,
            created_by
        )
        VALUES (
            v_updated.creation_id,
            'milestone',
            'Agenda M08 · Cita cancelada: ' || v_updated.title,
            'Motivo: ' || v_clean_reason,
            pg_catalog.jsonb_build_object(
                'm08_action', 'appointment_cancelled',
                'appointment_id', v_updated.id,
                'cancellation_reason', v_clean_reason
            ),
            v_actor_id
        );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'appointment', pg_catalog.to_jsonb(v_updated)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_atelier_appointment_m08(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_atelier_appointment_m08(UUID, INT, TEXT, TEXT) TO authenticated, service_role, postgres;

-- ==============================================================================
-- 8. RPC 4/4: LECTURA CONSOLIDADA SIN DUPLICACIONES (fetch_atelier_agenda_m08)
-- ==============================================================================
-- Reúne en zona horaria America/Bogota:
--   1. Citas propias de M08 (public.atelier_appointments)
--   2. Pruebas físicas M06 (public.atelier_fitting_sessions) no enlazadas aún en M08
--   3. Entregas consolidadas M03 (máx. 1 por Creación: priority
--      delivery_date_actual -> actual_delivery_date -> estimated_delivery_date -> target_date)
--      omitidas si ya existe cita activa delivery_ceremony/pickup_return en M08
--   4. Jornadas grupales M02 (public.measurement_campaigns) no enlazadas en M08
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fetch_atelier_agenda_m08(
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_items JSONB;
BEGIN
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M08: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    WITH m08_rows AS (
        SELECT
            'm08:' || a.id::text AS agenda_item_id,
            'm08_appointment'::text AS source_kind,
            a.id AS source_id,
            a.id AS appointment_id,
            a.row_version,
            true AS is_editable,
            a.title,
            a.appointment_type,
            a.status,
            a.starts_at,
            a.ends_at,
            pg_catalog.to_char(a.starts_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS bogota_date,
            pg_catalog.to_char(a.starts_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS bogota_start_time,
            pg_catalog.to_char(a.ends_at AT TIME ZONE 'America/Bogota', 'HH24:MI') AS bogota_end_time,
            a.location_space,
            NULL::text AS location_label_override,
            a.client_id,
            cl.full_name AS client_name,
            cl.phone AS client_phone,
            a.person_id,
            p.full_name AS person_name,
            a.creation_id,
            c.name AS creation_name,
            a.fitting_session_id,
            a.campaign_id,
            a.supplier_id,
            sup.name AS supplier_name,
            a.assigned_staff,
            a.preparation_notes,
            a.outcome_notes,
            a.cancellation_reason,
            a.client_visibility,
            a.completed_at,
            a.cancelled_at,
            a.created_at
        FROM public.atelier_appointments a
        LEFT JOIN public.clients cl ON cl.id = a.client_id
        LEFT JOIN public.persons p ON p.id = a.person_id
        LEFT JOIN public.creations c ON c.id = a.creation_id
        LEFT JOIN public.atelier_suppliers sup ON sup.id = a.supplier_id
        WHERE (p_from IS NULL OR a.ends_at >= p_from)
          AND (p_to IS NULL OR a.starts_at <= p_to)
    ),
    m06_rows AS (
        SELECT
            'm06:' || fs.id::text AS agenda_item_id,
            'm06_fitting_session'::text AS source_kind,
            fs.id AS source_id,
            NULL::uuid AS appointment_id,
            fs.row_version,
            false AS is_editable,
            fs.title || ' · ' || c.name AS title,
            CASE fs.round_type
                WHEN 'toile_first' THEN 'toile_fitting'
                WHEN 'second_fitting' THEN 'garment_fitting'
                WHEN 'final_fitting' THEN 'final_fitting'
                WHEN 'alteration_check' THEN 'alteration_review'
                ELSE 'garment_fitting'
            END AS appointment_type,
            CASE fs.status
                WHEN 'scheduled' THEN 'scheduled'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'completed'
            END AS status,
            COALESCE(fs.scheduled_at, fs.conducted_at) AS starts_at,
            COALESCE(fs.scheduled_at, fs.conducted_at) + interval '60 minutes' AS ends_at,
            pg_catalog.to_char(COALESCE(fs.scheduled_at, fs.conducted_at) AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS bogota_date,
            pg_catalog.to_char(COALESCE(fs.scheduled_at, fs.conducted_at) AT TIME ZONE 'America/Bogota', 'HH24:MI') AS bogota_start_time,
            pg_catalog.to_char((COALESCE(fs.scheduled_at, fs.conducted_at) + interval '60 minutes') AT TIME ZONE 'America/Bogota', 'HH24:MI') AS bogota_end_time,
            'probador_principal'::text AS location_space,
            NULLIF(pg_catalog.btrim(fs.location_note), '') AS location_label_override,
            c.client_id,
            cl.full_name AS client_name,
            cl.phone AS client_phone,
            c.person_id,
            p.full_name AS person_name,
            c.id AS creation_id,
            c.name AS creation_name,
            fs.id AS fitting_session_id,
            NULL::uuid AS campaign_id,
            NULL::uuid AS supplier_id,
            NULL::text AS supplier_name,
            NULL::text AS assigned_staff,
            fs.garment_state_note AS preparation_notes,
            fs.summary_notes AS outcome_notes,
            fs.cancellation_reason,
            CASE WHEN fs.client_visibility = 'summary_ready' THEN 'client_visible' ELSE 'internal_only' END AS client_visibility,
            fs.conducted_at AS completed_at,
            fs.cancelled_at,
            fs.created_at
        FROM public.atelier_fitting_sessions fs
        INNER JOIN public.creations c ON c.id = fs.creation_id
        INNER JOIN public.clients cl ON cl.id = c.client_id
        LEFT JOIN public.persons p ON p.id = c.person_id
        WHERE COALESCE(fs.scheduled_at, fs.conducted_at) IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.atelier_appointments a
              WHERE a.fitting_session_id = fs.id
          )
          AND (p_from IS NULL OR (COALESCE(fs.scheduled_at, fs.conducted_at) + interval '60 minutes') >= p_from)
          AND (p_to IS NULL OR COALESCE(fs.scheduled_at, fs.conducted_at) <= p_to)
    ),
    m03_candidates AS (
        SELECT
            c.id AS creation_id,
            c.name AS creation_name,
            c.status AS creation_status,
            c.client_id,
            cl.full_name AS client_name,
            cl.phone AS client_phone,
            c.person_id,
            p.full_name AS person_name,
            c.created_at,
            ap.assigned_tailor,
            cp.delivery_status,
            COALESCE(cp.delivery_date_actual, ap.actual_delivery_date, ap.estimated_delivery_date, c.target_date) AS consolidated_date,
            CASE
                WHEN cp.delivery_date_actual IS NOT NULL OR ap.actual_delivery_date IS NOT NULL OR cp.delivery_status = 'delivered' THEN 'completed'
                ELSE 'scheduled'
            END AS milestone_status,
            CASE
                WHEN cp.delivery_date_actual IS NOT NULL OR ap.actual_delivery_date IS NOT NULL THEN 'Entrega realizada (M03/M06)'
                WHEN ap.estimated_delivery_date IS NOT NULL THEN 'Fecha estimada de entrega de taller (' || ap.project_number || ')'
                ELSE 'Fecha objetivo de entrega de la creación (M03)'
            END AS source_note
        FROM public.creations c
        INNER JOIN public.clients cl ON cl.id = c.client_id
        LEFT JOIN public.persons p ON p.id = c.person_id
        LEFT JOIN public.creation_commercial_profiles cp ON cp.creation_id = c.id
        LEFT JOIN LATERAL (
            SELECT ap0.project_number, ap0.estimated_delivery_date, ap0.actual_delivery_date, ap0.current_stage, ap0.assigned_tailor
            FROM public.atelier_projects ap0
            WHERE ap0.creation_id = c.id
            ORDER BY ap0.created_at DESC
            LIMIT 1
        ) ap ON TRUE
        WHERE c.status <> 'cancelled'
          AND COALESCE(ap.current_stage, '') <> 'cancelled'
          AND COALESCE(cp.delivery_date_actual, ap.actual_delivery_date, ap.estimated_delivery_date, c.target_date) IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.atelier_appointments a
              WHERE a.creation_id = c.id
                AND a.appointment_type IN ('delivery_ceremony', 'pickup_return')
                AND a.status <> 'cancelled'
          )
    ),
    m03_rows AS (
        SELECT
            'm03:' || mc.creation_id::text AS agenda_item_id,
            'm03_delivery_milestone'::text AS source_kind,
            mc.creation_id AS source_id,
            NULL::uuid AS appointment_id,
            1 AS row_version,
            false AS is_editable,
            'Entrega comprometida · ' || mc.creation_name AS title,
            'delivery_ceremony'::text AS appointment_type,
            mc.milestone_status AS status,
            ((mc.consolidated_date::text || ' 09:00:00')::timestamp AT TIME ZONE 'America/Bogota') AS starts_at,
            ((mc.consolidated_date::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Bogota') AS ends_at,
            mc.consolidated_date::text AS bogota_date,
            '09:00'::text AS bogota_start_time,
            '10:00'::text AS bogota_end_time,
            'salon_privado'::text AS location_space,
            NULL::text AS location_label_override,
            mc.client_id,
            mc.client_name,
            mc.client_phone,
            mc.person_id,
            mc.person_name,
            mc.creation_id,
            mc.creation_name,
            NULL::uuid AS fitting_session_id,
            NULL::uuid AS campaign_id,
            NULL::uuid AS supplier_id,
            NULL::text AS supplier_name,
            mc.assigned_tailor AS assigned_staff,
            mc.source_note AS preparation_notes,
            NULL::text AS outcome_notes,
            NULL::text AS cancellation_reason,
            'internal_only'::text AS client_visibility,
            CASE WHEN mc.milestone_status = 'completed'
                THEN ((mc.consolidated_date::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Bogota')
                ELSE NULL
            END AS completed_at,
            NULL::timestamptz AS cancelled_at,
            mc.created_at
        FROM m03_candidates mc
        WHERE (p_from IS NULL OR ((mc.consolidated_date::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Bogota') >= p_from)
          AND (p_to IS NULL OR ((mc.consolidated_date::text || ' 09:00:00')::timestamp AT TIME ZONE 'America/Bogota') <= p_to)
    ),
    m02_rows AS (
        SELECT
            'm02:' || camp.id::text AS agenda_item_id,
            'm02_measurement_campaign'::text AS source_kind,
            camp.id AS source_id,
            NULL::uuid AS appointment_id,
            1 AS row_version,
            false AS is_editable,
            'Jornada de medición · ' || camp.title AS title,
            'group_campaign'::text AS appointment_type,
            CASE camp.status
                WHEN 'completed' THEN 'completed'
                WHEN 'in_progress' THEN 'confirmed'
                ELSE 'scheduled'
            END AS status,
            ((camp.campaign_date::text || ' 08:30:00')::timestamp AT TIME ZONE 'America/Bogota') AS starts_at,
            ((camp.campaign_date::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Bogota') AS ends_at,
            camp.campaign_date::text AS bogota_date,
            '08:30'::text AS bogota_start_time,
            '10:00'::text AS bogota_end_time,
            'visita_externa'::text AS location_space,
            NULL::text AS location_label_override,
            camp.client_id,
            cl.full_name AS client_name,
            cl.phone AS client_phone,
            NULL::uuid AS person_id,
            NULL::text AS person_name,
            NULL::uuid AS creation_id,
            NULL::text AS creation_name,
            NULL::uuid AS fitting_session_id,
            camp.id AS campaign_id,
            NULL::uuid AS supplier_id,
            NULL::text AS supplier_name,
            NULL::text AS assigned_staff,
            camp.notes AS preparation_notes,
            NULL::text AS outcome_notes,
            NULL::text AS cancellation_reason,
            'internal_only'::text AS client_visibility,
            CASE WHEN camp.status = 'completed'
                THEN ((camp.campaign_date::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Bogota')
                ELSE NULL
            END AS completed_at,
            NULL::timestamptz AS cancelled_at,
            camp.created_at
        FROM public.measurement_campaigns camp
        INNER JOIN public.clients cl ON cl.id = camp.client_id
        WHERE camp.status <> 'archived'
          AND NOT EXISTS (
              SELECT 1
              FROM public.atelier_appointments a
              WHERE a.campaign_id = camp.id
                AND a.status <> 'cancelled'
          )
          AND (p_from IS NULL OR ((camp.campaign_date::text || ' 10:00:00')::timestamp AT TIME ZONE 'America/Bogota') >= p_from)
          AND (p_to IS NULL OR ((camp.campaign_date::text || ' 08:30:00')::timestamp AT TIME ZONE 'America/Bogota') <= p_to)
    ),
    combined AS (
        SELECT * FROM m08_rows
        UNION ALL
        SELECT * FROM m06_rows
        UNION ALL
        SELECT * FROM m03_rows
        UNION ALL
        SELECT * FROM m02_rows
    )
    SELECT COALESCE(
        pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) ORDER BY c.starts_at ASC, c.agenda_item_id ASC),
        '[]'::jsonb
    )
    INTO v_items
    FROM combined c;

    RETURN pg_catalog.jsonb_build_object(
        'timezone', 'America/Bogota',
        'generated_at', pg_catalog.now(),
        'today_bogota', pg_catalog.to_char(pg_catalog.now() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD'),
        'items', v_items
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_atelier_agenda_m08(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_atelier_agenda_m08(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role, postgres;

COMMIT;
