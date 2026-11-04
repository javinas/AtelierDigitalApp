-- ==============================================================================
-- ATELIER DIGITAL — ESCENARIO SINTÉTICO DE DEMOSTRACIÓN: COLEGIO CON 30 ALUMNOS
-- Archivo: supabase/demo/demo_colegio_30_alumnos.sql
-- Base de Datos: trgoqqvsprknswobvniu
-- Propósito: Carga del escenario institucional M02 (Colegio, Grupo, Jornada, 30 Alumnos, 30 Sesiones, 300 Valores, 45 Creaciones).
-- SEGURIDAD:
--   * Validación pre-vuelo exhaustiva de los 138 UUIDs e1* contrastando atributos identificadores y relaciones.
--   * Detección estricta de colisiones: si existe un registro modificado o ajeno, la transacción aborta (Zero Stomp).
--   * Sin 'ON CONFLICT DO UPDATE' silencioso: inserciones directas y atómicas para preservar modificaciones de usuario.
--   * Autoría explícita mediante v_designer_user_id (cuenta de diseñadora) con marcador seguro.
--   * Sesiones en 'draft' por defecto para permitir pruebas completas y reversión física sin violar triggers.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- ==========================================================================
    -- CONFIGURACIÓN DE SEGURIDAD OBLIGATORIA:
    -- Ingrese a Supabase Dashboard > Authentication > Users, copie el UUID exacto
    -- de la cuenta de Diseñadora (Katherine Carroll) y asígnelo en la variable.
    -- ==========================================================================
    v_designer_user_id UUID := '262bf83b-c916-4712-bb8a-cea98a1c359b'::UUID;

    -- ==========================================================================
    -- OPCIÓN DE ESTADO DE SESIONES:
    -- FALSE (Predeterminado y Seguro): Las 30 sesiones permanecen en estado 'draft',
    -- permitiendo interactuar en la app y ejecutar un rollback 100% físico y limpio.
    -- TRUE: Promueve las 30 sesiones a 'completed', activando la inmutabilidad de
    -- producción (triggers protect_finalized_session_*), lo cual impedirá el borrado
    -- físico mediante SQL estándar sin intervención administrativa del DBA.
    -- ==========================================================================
    v_finalize_sessions BOOLEAN := FALSE;

    v_now TIMESTAMPTZ := pg_catalog.now();
    v_alien_collision_count INT := 0;
    v_existing_demo_count INT := 0;
    v_modified_record_detail TEXT := NULL;
BEGIN
    -- 0.1 Validación de seguridad de autoría
    IF v_designer_user_id IS NULL THEN
        RAISE EXCEPTION 'DETENCIÓN DE SEGURIDAD: Debe especificar un UUID de usuario válido en v_designer_user_id.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_designer_user_id) THEN
        RAISE EXCEPTION 'DETENCIÓN DE SEGURIDAD: El usuario con UUID % no existe en auth.users.', v_designer_user_id;
    END IF;

    -- ==========================================================================
    -- 0.2 VALIDACIÓN PRE-VUELO EXHAUSTIVA DE LOS 138 UUIDs (IDENTIDAD Y RELACIONES)
    -- ==========================================================================
    -- No se asume que un registro pertenece al demo únicamente por su UUID o una nota.
    -- Se validan sus atributos esenciales y sus relaciones relacionales completas.

    -- A. Cliente Titular Institucional
    IF EXISTS (
        SELECT 1 FROM public.clients
        WHERE id = 'e1a10000-0000-4000-8000-000000000001'
          AND (full_name <> 'COLEGIO DEMOSTRACIÓN ATELIER - BARRANQUILLA'
               OR email <> 'rectoria.demo@colegioatelier.edu.co'
)
    ) THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: El UUID de cliente % ya existe con datos o tipo ajenos a esta demostración.', 'e1a10000-0000-4000-8000-000000000001';
    END IF;

    -- B. Grupo Escolar
    IF EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = 'e1a20000-0000-4000-8000-000000000001'
          AND (client_id <> 'e1a10000-0000-4000-8000-000000000001'
               OR name <> 'CURSO DEMOSTRACIÓN 30 ALUMNOS'
               OR type <> 'school')
    ) THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: El UUID de grupo % ya existe con datos o vinculación ajena.', 'e1a20000-0000-4000-8000-000000000001';
    END IF;

    -- C. Campaña / Jornada de Medición
    IF EXISTS (
        SELECT 1 FROM public.measurement_campaigns
        WHERE id = 'e1a30000-0000-4000-8000-000000000001'
          AND (client_id <> 'e1a10000-0000-4000-8000-000000000001'
               OR group_id <> 'e1a20000-0000-4000-8000-000000000001'
               OR title <> 'JORNADA DE MEDIDAS - CURSO DEMOSTRACIÓN'
               OR template_id <> 'uniforme_escolar')
    ) THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: El UUID de campaña % ya existe con datos o vinculación ajena.', 'e1a30000-0000-4000-8000-000000000001';
    END IF;

    -- D. 30 Alumnos (Beneficiarios en public.persons)
    SELECT COUNT(*) INTO v_alien_collision_count
    FROM public.persons
    WHERE id IN (
        'e1b00000-0000-4000-8000-000000000001',
        'e1b00000-0000-4000-8000-000000000002',
        'e1b00000-0000-4000-8000-000000000003',
        'e1b00000-0000-4000-8000-000000000004',
        'e1b00000-0000-4000-8000-000000000005',
        'e1b00000-0000-4000-8000-000000000006',
        'e1b00000-0000-4000-8000-000000000007',
        'e1b00000-0000-4000-8000-000000000008',
        'e1b00000-0000-4000-8000-000000000009',
        'e1b00000-0000-4000-8000-000000000010',
        'e1b00000-0000-4000-8000-000000000011',
        'e1b00000-0000-4000-8000-000000000012',
        'e1b00000-0000-4000-8000-000000000013',
        'e1b00000-0000-4000-8000-000000000014',
        'e1b00000-0000-4000-8000-000000000015',
        'e1b00000-0000-4000-8000-000000000016',
        'e1b00000-0000-4000-8000-000000000017',
        'e1b00000-0000-4000-8000-000000000018',
        'e1b00000-0000-4000-8000-000000000019',
        'e1b00000-0000-4000-8000-000000000020',
        'e1b00000-0000-4000-8000-000000000021',
        'e1b00000-0000-4000-8000-000000000022',
        'e1b00000-0000-4000-8000-000000000023',
        'e1b00000-0000-4000-8000-000000000024',
        'e1b00000-0000-4000-8000-000000000025',
        'e1b00000-0000-4000-8000-000000000026',
        'e1b00000-0000-4000-8000-000000000027',
        'e1b00000-0000-4000-8000-000000000028',
        'e1b00000-0000-4000-8000-000000000029',
        'e1b00000-0000-4000-8000-000000000030'
    )
    AND (client_id <> 'e1a10000-0000-4000-8000-000000000001'
         OR demographic_category NOT IN ('boy','girl')
         OR reference_id IS NULL
         OR notes NOT LIKE '%DATOS SINTÉTICOS DE PRUEBA M02%');

    IF v_alien_collision_count > 0 THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: Se detectaron % registro(s) en persons con UUIDs del demo pero con datos o cliente ajeno.', v_alien_collision_count;
    END IF;

    -- E. 30 Sesiones de Medición (public.measurement_sessions)
    SELECT COUNT(*) INTO v_alien_collision_count
    FROM public.measurement_sessions
    WHERE id IN (
        'e1c00000-0000-4000-8000-000000000001',
        'e1c00000-0000-4000-8000-000000000002',
        'e1c00000-0000-4000-8000-000000000003',
        'e1c00000-0000-4000-8000-000000000004',
        'e1c00000-0000-4000-8000-000000000005',
        'e1c00000-0000-4000-8000-000000000006',
        'e1c00000-0000-4000-8000-000000000007',
        'e1c00000-0000-4000-8000-000000000008',
        'e1c00000-0000-4000-8000-000000000009',
        'e1c00000-0000-4000-8000-000000000010',
        'e1c00000-0000-4000-8000-000000000011',
        'e1c00000-0000-4000-8000-000000000012',
        'e1c00000-0000-4000-8000-000000000013',
        'e1c00000-0000-4000-8000-000000000014',
        'e1c00000-0000-4000-8000-000000000015',
        'e1c00000-0000-4000-8000-000000000016',
        'e1c00000-0000-4000-8000-000000000017',
        'e1c00000-0000-4000-8000-000000000018',
        'e1c00000-0000-4000-8000-000000000019',
        'e1c00000-0000-4000-8000-000000000020',
        'e1c00000-0000-4000-8000-000000000021',
        'e1c00000-0000-4000-8000-000000000022',
        'e1c00000-0000-4000-8000-000000000023',
        'e1c00000-0000-4000-8000-000000000024',
        'e1c00000-0000-4000-8000-000000000025',
        'e1c00000-0000-4000-8000-000000000026',
        'e1c00000-0000-4000-8000-000000000027',
        'e1c00000-0000-4000-8000-000000000028',
        'e1c00000-0000-4000-8000-000000000029',
        'e1c00000-0000-4000-8000-000000000030'
    )
    AND (client_id <> 'e1a10000-0000-4000-8000-000000000001'
         OR campaign_id <> 'e1a30000-0000-4000-8000-000000000001'
         OR notes NOT LIKE '%DATOS SINTÉTICOS DE PRUEBA M02%');

    IF v_alien_collision_count > 0 THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: Se detectaron % registro(s) en measurement_sessions con UUIDs del demo pero con datos o relaciones ajenas.', v_alien_collision_count;
    END IF;

    -- F. 30 Participantes en Campaña (public.measurement_campaign_participants)
    SELECT COUNT(*) INTO v_alien_collision_count
    FROM public.measurement_campaign_participants
    WHERE id IN (
        'e1d00000-0000-4000-8000-000000000001',
        'e1d00000-0000-4000-8000-000000000002',
        'e1d00000-0000-4000-8000-000000000003',
        'e1d00000-0000-4000-8000-000000000004',
        'e1d00000-0000-4000-8000-000000000005',
        'e1d00000-0000-4000-8000-000000000006',
        'e1d00000-0000-4000-8000-000000000007',
        'e1d00000-0000-4000-8000-000000000008',
        'e1d00000-0000-4000-8000-000000000009',
        'e1d00000-0000-4000-8000-000000000010',
        'e1d00000-0000-4000-8000-000000000011',
        'e1d00000-0000-4000-8000-000000000012',
        'e1d00000-0000-4000-8000-000000000013',
        'e1d00000-0000-4000-8000-000000000014',
        'e1d00000-0000-4000-8000-000000000015',
        'e1d00000-0000-4000-8000-000000000016',
        'e1d00000-0000-4000-8000-000000000017',
        'e1d00000-0000-4000-8000-000000000018',
        'e1d00000-0000-4000-8000-000000000019',
        'e1d00000-0000-4000-8000-000000000020',
        'e1d00000-0000-4000-8000-000000000021',
        'e1d00000-0000-4000-8000-000000000022',
        'e1d00000-0000-4000-8000-000000000023',
        'e1d00000-0000-4000-8000-000000000024',
        'e1d00000-0000-4000-8000-000000000025',
        'e1d00000-0000-4000-8000-000000000026',
        'e1d00000-0000-4000-8000-000000000027',
        'e1d00000-0000-4000-8000-000000000028',
        'e1d00000-0000-4000-8000-000000000029',
        'e1d00000-0000-4000-8000-000000000030'
    )
    AND (campaign_id <> 'e1a30000-0000-4000-8000-000000000001'
         OR notes NOT LIKE '%DATOS SINTÉTICOS DE PRUEBA M02%');

    IF v_alien_collision_count > 0 THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: Se detectaron % participante(s) con UUIDs del demo pero vinculados a campañas ajenas.', v_alien_collision_count;
    END IF;

    -- G. 45 Creaciones (public.creations)
    SELECT COUNT(*) INTO v_alien_collision_count
    FROM public.creations
    WHERE id IN (
        'e1e00000-0000-4000-8000-000000000001',
        'e1e00000-0000-4000-8000-000000000002',
        'e1e00000-0000-4000-8000-000000000003',
        'e1e00000-0000-4000-8000-000000000004',
        'e1e00000-0000-4000-8000-000000000005',
        'e1e00000-0000-4000-8000-000000000006',
        'e1e00000-0000-4000-8000-000000000007',
        'e1e00000-0000-4000-8000-000000000008',
        'e1e00000-0000-4000-8000-000000000009',
        'e1e00000-0000-4000-8000-000000000010',
        'e1e00000-0000-4000-8000-000000000011',
        'e1e00000-0000-4000-8000-000000000012',
        'e1e00000-0000-4000-8000-000000000013',
        'e1e00000-0000-4000-8000-000000000014',
        'e1e00000-0000-4000-8000-000000000015',
        'e1e00000-0000-4000-8000-000000000016',
        'e1e00000-0000-4000-8000-000000000017',
        'e1e00000-0000-4000-8000-000000000018',
        'e1e00000-0000-4000-8000-000000000019',
        'e1e00000-0000-4000-8000-000000000020',
        'e1e00000-0000-4000-8000-000000000021',
        'e1e00000-0000-4000-8000-000000000022',
        'e1e00000-0000-4000-8000-000000000023',
        'e1e00000-0000-4000-8000-000000000024',
        'e1e00000-0000-4000-8000-000000000025',
        'e1e00000-0000-4000-8000-000000000026',
        'e1e00000-0000-4000-8000-000000000027',
        'e1e00000-0000-4000-8000-000000000028',
        'e1e00000-0000-4000-8000-000000000029',
        'e1e00000-0000-4000-8000-000000000030',
        'e1e00000-0000-4000-8000-000000000031',
        'e1e00000-0000-4000-8000-000000000032',
        'e1e00000-0000-4000-8000-000000000033',
        'e1e00000-0000-4000-8000-000000000034',
        'e1e00000-0000-4000-8000-000000000035',
        'e1e00000-0000-4000-8000-000000000036',
        'e1e00000-0000-4000-8000-000000000037',
        'e1e00000-0000-4000-8000-000000000038',
        'e1e00000-0000-4000-8000-000000000039',
        'e1e00000-0000-4000-8000-000000000040',
        'e1e00000-0000-4000-8000-000000000041',
        'e1e00000-0000-4000-8000-000000000042',
        'e1e00000-0000-4000-8000-000000000043',
        'e1e00000-0000-4000-8000-000000000044',
        'e1e00000-0000-4000-8000-000000000045'
    )
    AND (client_id <> 'e1a10000-0000-4000-8000-000000000001'
         OR notes NOT LIKE '%DATOS SINTÉTICOS DE PRUEBA M02%');

    IF v_alien_collision_count > 0 THEN
        RAISE EXCEPTION 'DETENCIÓN PRE-FLIGHT: Se detectaron % creación(es) con UUIDs del demo pero con vinculaciones ajenas.', v_alien_collision_count;
    END IF;

    -- ==========================================================================
    -- 0.3 DETECCIÓN DE REEJECUCIÓN Y PROTECCIÓN CONTRA SOBRESCRITURA DE DATOS MODIFICADOS
    -- ==========================================================================
    -- Si el cliente ya existe, comprobar si ha sufrido modificaciones en la app.
    -- Si cualquier dato fue modificado (ej: sesión promovida a completed, creaciones
    -- modificadas, valores cambiados), se aborta la ejecución para no sobrescribir trabajo.
    IF EXISTS (SELECT 1 FROM public.clients WHERE id = 'e1a10000-0000-4000-8000-000000000001') THEN
        -- Comprobar si las sesiones del demo sufrieron cambios de estado desde la app
        SELECT id::text || ' (estado: ' || status || ')'
        INTO v_modified_record_detail
        FROM public.measurement_sessions
        WHERE id IN ('e1c00000-0000-4000-8000-000000000001','e1c00000-0000-4000-8000-000000000002','e1c00000-0000-4000-8000-000000000003','e1c00000-0000-4000-8000-000000000004','e1c00000-0000-4000-8000-000000000005','e1c00000-0000-4000-8000-000000000006','e1c00000-0000-4000-8000-000000000007','e1c00000-0000-4000-8000-000000000008','e1c00000-0000-4000-8000-000000000009','e1c00000-0000-4000-8000-000000000010','e1c00000-0000-4000-8000-000000000011','e1c00000-0000-4000-8000-000000000012','e1c00000-0000-4000-8000-000000000013','e1c00000-0000-4000-8000-000000000014','e1c00000-0000-4000-8000-000000000015','e1c00000-0000-4000-8000-000000000016','e1c00000-0000-4000-8000-000000000017','e1c00000-0000-4000-8000-000000000018','e1c00000-0000-4000-8000-000000000019','e1c00000-0000-4000-8000-000000000020','e1c00000-0000-4000-8000-000000000021','e1c00000-0000-4000-8000-000000000022','e1c00000-0000-4000-8000-000000000023','e1c00000-0000-4000-8000-000000000024','e1c00000-0000-4000-8000-000000000025','e1c00000-0000-4000-8000-000000000026','e1c00000-0000-4000-8000-000000000027','e1c00000-0000-4000-8000-000000000028','e1c00000-0000-4000-8000-000000000029','e1c00000-0000-4000-8000-000000000030')
          AND status <> 'draft'
        LIMIT 1;

        IF v_modified_record_detail IS NOT NULL THEN
            RAISE EXCEPTION 'DETENCIÓN DE SEGURIDAD (ANTI-OVERWRITE): La sesión % ya existe y fue modificada en la app. Para no destruir cambios de prueba, el script se detiene. Ejecute primero el rollback si desea un reinicio.', v_modified_record_detail;
        END IF;

        -- Comprobar si el escenario completo ya está presente
        SELECT COUNT(*) INTO v_existing_demo_count
        FROM public.clients
        WHERE id = 'e1a10000-0000-4000-8000-000000000001';

        IF v_existing_demo_count > 0 THEN
            RAISE EXCEPTION 'DETENCIÓN: El escenario ya se encuentra cargado en la base de datos. Para evitar operaciones redundantes o inconsistencias, el script no reescribirá datos existentes. Si requiere recargarlo, ejecute previamente supabase/demo/rollback_demo_colegio_30_alumnos.sql.';
        END IF;
    END IF;

    -- ==========================================================================
    -- 1. CLIENTE INSTITUCIONAL TITULAR (El colegio es el cliente comercial)
    -- ==========================================================================
    INSERT INTO public.clients (
        id,
        full_name,
        email,
        phone,
        city,
        style_preferences,
        internal_notes,
        status,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        'e1a10000-0000-4000-8000-000000000001',
        'COLEGIO DEMOSTRACIÓN ATELIER - BARRANQUILLA',
        'rectoria.demo@colegioatelier.edu.co',
        '+57 (5) 350-0000',
        'Barranquilla',
        'Uniformes institucionales de gala y diario: corte sastre clásico, telas de alta resistencia y durabilidad.',
        'DATOS SINTÉTICOS DE PRUEBA M02 — Cliente institucional titular para demostración de 30 alumnos (15 niños y 15 niñas).',
        'active',
        v_designer_user_id,
        v_now,
        v_now
    );

    -- ==========================================================================
    -- 2. GRUPO / NÚCLEO ESCOLAR
    -- ==========================================================================
    INSERT INTO public.groups (
        id,
        client_id,
        name,
        type,
        notes,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'e1a20000-0000-4000-8000-000000000001',
        'e1a10000-0000-4000-8000-000000000001',
        'CURSO DEMOSTRACIÓN 30 ALUMNOS',
        'school',
        'DATOS SINTÉTICOS DE PRUEBA M02 — Curso escolar 9º Grado (15 niños y 15 niñas de 14 y 15 años).',
        true,
        v_now,
        v_now
    );

    -- ==========================================================================
    -- 3. JORNADA DE MEDICIÓN (CAMPAÑA)
    -- ==========================================================================
    INSERT INTO public.measurement_campaigns (
        id,
        client_id,
        group_id,
        title,
        campaign_date,
        template_id,
        mode,
        status,
        unit_system,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'e1a30000-0000-4000-8000-000000000001',
        'e1a10000-0000-4000-8000-000000000001',
        'e1a20000-0000-4000-8000-000000000001',
        'JORNADA DE MEDIDAS - CURSO DEMOSTRACIÓN',
        CURRENT_DATE,
        'uniforme_escolar',
        'standard_with_adjustments',
        'completed',
        'cm',
        'DATOS SINTÉTICOS DE PRUEBA M02 — Jornada institucional para 30 alumnos (15 niños y 15 niñas).',
        v_now,
        v_now
    );

    -- ==========================================================================
    -- 4. PERSONAS BENEFICIARIAS / ALUMNOS (30 Registros: NO son clientes)
    -- ==========================================================================
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000001', 'e1a10000-0000-4000-8000-000000000001', 'Mateo Alejandro Rodríguez Gómez', 'boy', 'ALUM-M01', '2012-03-15', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M01. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000002', 'e1a10000-0000-4000-8000-000000000001', 'Santiago Andrés Castro Navarro', 'boy', 'ALUM-M02', '2012-05-22', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M02. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000003', 'e1a10000-0000-4000-8000-000000000001', 'Samuel David Polo Arteta', 'boy', 'ALUM-M03', '2011-08-10', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M03. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000004', 'e1a10000-0000-4000-8000-000000000001', 'Nicolás Eduardo Meza Char', 'boy', 'ALUM-M04', '2011-11-04', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M04. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000005', 'e1a10000-0000-4000-8000-000000000001', 'Sebastián José Mendoza Vives', 'boy', 'ALUM-M05', '2012-01-28', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M05. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000006', 'e1a10000-0000-4000-8000-000000000001', 'Daniel Felipe Herrera Daza', 'boy', 'ALUM-M06', '2011-09-17', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M06. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000007', 'e1a10000-0000-4000-8000-000000000001', 'Gabriel Antonio De la Hoz Ruiz', 'boy', 'ALUM-M07', '2012-06-30', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M07. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000008', 'e1a10000-0000-4000-8000-000000000001', 'Lucas Emmanuel Pinedo Barros', 'boy', 'ALUM-M08', '2012-07-12', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M08. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000009', 'e1a10000-0000-4000-8000-000000000001', 'Alejandro Rafael Salcedo Noguera', 'boy', 'ALUM-M09', '2011-10-25', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M09. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000010', 'e1a10000-0000-4000-8000-000000000001', 'Diego Armando Tarud Ceballos', 'boy', 'ALUM-M10', '2011-12-03', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M10. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000011', 'e1a10000-0000-4000-8000-000000000001', 'Tomás Ignacio Obregón Llinás', 'boy', 'ALUM-M11', '2012-04-18', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M11. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000012', 'e1a10000-0000-4000-8000-000000000001', 'Emilio Javier Danies Pumarejo', 'boy', 'ALUM-M12', '2011-07-09', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M12. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000013', 'e1a10000-0000-4000-8000-000000000001', 'Joaquín Andrés Carbonell Vega', 'boy', 'ALUM-M13', '2012-02-14', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M13. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000014', 'e1a10000-0000-4000-8000-000000000001', 'Matías Esteban Bula Donado', 'boy', 'ALUM-M14', '2011-06-21', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M14. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000015', 'e1a10000-0000-4000-8000-000000000001', 'Simón Leonardo Roncallo Cortissoz', 'boy', 'ALUM-M15', '2012-09-08', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M15. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000016', 'e1a10000-0000-4000-8000-000000000001', 'Valentina Sofía Abuchaibe Cepeda', 'girl', 'ALUM-F01', '2012-04-11', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F01. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000017', 'e1a10000-0000-4000-8000-000000000001', 'Mariana Lucía Benedetti Dangond', 'girl', 'ALUM-F02', '2011-09-14', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F02. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000018', 'e1a10000-0000-4000-8000-000000000001', 'Isabella Marie Cure Caridi', 'girl', 'ALUM-F03', '2012-02-20', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F03. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000019', 'e1a10000-0000-4000-8000-000000000001', 'Camila Andrea Daes Insignares', 'girl', 'ALUM-F04', '2011-12-05', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F04. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000020', 'e1a10000-0000-4000-8000-000000000001', 'Luciana Victoria Echeverría Manotas', 'girl', 'ALUM-F05', '2012-06-17', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F05. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000021', 'e1a10000-0000-4000-8000-000000000001', 'Salomé Patricia Faciolince Sarabia', 'girl', 'ALUM-F06', '2011-08-29', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F06. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000022', 'e1a10000-0000-4000-8000-000000000001', 'Gabriela Elena Gerlein Rosado', 'girl', 'ALUM-F07', '2012-03-03', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F07. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000023', 'e1a10000-0000-4000-8000-000000000001', 'Daniela Cristina Hazbún Slebi', 'girl', 'ALUM-F08', '2011-10-19', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F08. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000024', 'e1a10000-0000-4000-8000-000000000001', 'Paulina Beatriz Juliao Lafaurie', 'girl', 'ALUM-F09', '2012-05-08', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F09. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000025', 'e1a10000-0000-4000-8000-000000000001', 'Antonella María Lacouture Muvdi', 'girl', 'ALUM-F10', '2011-07-22', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F10. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000026', 'e1a10000-0000-4000-8000-000000000001', 'Martina Inés Nule Amastha', 'girl', 'ALUM-F11', '2012-08-14', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F11. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000027', 'e1a10000-0000-4000-8000-000000000001', 'Elena Isabel Palacio Segebre', 'girl', 'ALUM-F12', '2011-11-30', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F12. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000028', 'e1a10000-0000-4000-8000-000000000001', 'Catalina Rosa Santo Domingo Vilar', 'girl', 'ALUM-F13', '2012-01-19', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F13. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000029', 'e1a10000-0000-4000-8000-000000000001', 'Emma Celeste Vengoechea Celia', 'girl', 'ALUM-F14', '2011-06-12', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F14. Grado 9A.', v_now, v_now);
    INSERT INTO public.persons (id, client_id, full_name, demographic_category, reference_id, birth_date, is_active, notes, created_at, updated_at)
    VALUES ('e1b00000-0000-4000-8000-000000000030', 'e1a10000-0000-4000-8000-000000000001', 'Miranda Clara Zúñiga Caballero', 'girl', 'ALUM-F15', '2012-09-27', true, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F15. Grado 9A.', v_now, v_now);

    -- ==========================================================================
    -- 5. MIEMBROS DEL GRUPO ESCOLAR (30 Asignaciones)
    -- ==========================================================================
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000001', 1, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000002', 2, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000003', 3, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000004', 4, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000005', 5, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000006', 6, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000007', 7, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000008', 8, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000009', 9, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000010', 10, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000011', 11, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000012', 12, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000013', 13, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000014', 14, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000015', 15, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000016', 16, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000017', 17, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000018', 18, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000019', 19, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000020', 20, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000021', 21, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000022', 22, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000023', 23, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000024', 24, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000025', 25, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000026', 26, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000027', 27, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000028', 28, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000029', 29, true, v_now);
    INSERT INTO public.group_members (group_id, person_id, order_index, is_active, created_at)
    VALUES ('e1a20000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000030', 30, true, v_now);

    -- ==========================================================================
    -- 6. SESIONES DE MEDIDAS INDIVIDUALES (30 Sesiones en 'draft' por defecto)
    -- ==========================================================================
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000001', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M01 (Mateo Alejandro Rodríguez Gómez). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000002', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M02 (Santiago Andrés Castro Navarro). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000003', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M03 (Samuel David Polo Arteta). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000004', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M04 (Nicolás Eduardo Meza Char). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000005', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M05 (Sebastián José Mendoza Vives). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000006', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M06 (Daniel Felipe Herrera Daza). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000007', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M07 (Gabriel Antonio De la Hoz Ruiz). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000008', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M08 (Lucas Emmanuel Pinedo Barros). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000009', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M09 (Alejandro Rafael Salcedo Noguera). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000010', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M10 (Diego Armando Tarud Ceballos). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000011', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M11 (Tomás Ignacio Obregón Llinás). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000012', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M12 (Emilio Javier Danies Pumarejo). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000013', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M13 (Joaquín Andrés Carbonell Vega). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000014', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M14 (Matías Esteban Bula Donado). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000015', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M15 (Simón Leonardo Roncallo Cortissoz). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000016', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F01 (Valentina Sofía Abuchaibe Cepeda). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000017', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F02 (Mariana Lucía Benedetti Dangond). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000018', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F03 (Isabella Marie Cure Caridi). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000019', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F04 (Camila Andrea Daes Insignares). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000020', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F05 (Luciana Victoria Echeverría Manotas). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000021', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F06 (Salomé Patricia Faciolince Sarabia). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000022', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F07 (Gabriela Elena Gerlein Rosado). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000023', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F08 (Daniela Cristina Hazbún Slebi). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000024', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F09 (Paulina Beatriz Juliao Lafaurie). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000025', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F10 (Antonella María Lacouture Muvdi). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000026', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F11 (Martina Inés Nule Amastha). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000027', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F12 (Elena Isabel Palacio Segebre). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000028', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F13 (Catalina Rosa Santo Domingo Vilar). Talla sugerida: 14.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000029', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F14 (Emma Celeste Vengoechea Celia). Talla sugerida: 16.', 1, v_now, v_now);
    INSERT INTO public.measurement_sessions (id, client_id, person_id, campaign_id, session_date, taken_by, status, unit_system, notes, version_number, created_at, updated_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000030', 'e1a30000-0000-4000-8000-000000000001', CURRENT_DATE, v_designer_user_id, 'draft', 'cm', 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F15 (Miranda Clara Zúñiga Caballero). Talla sugerida: 14.', 1, v_now, v_now);

    -- ==========================================================================
    -- 7. VALORES INDIVIDUALES DE MEDICIÓN (300 Registros en mm: 150 Niños + 150 Niñas)
    -- ==========================================================================
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'estatura', 'none', 1640, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'contorno_cuello', 'none', 350, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'contorno_busto', 'none', 820, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'contorno_cintura', 'none', 700, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'contorno_cadera', 'none', 840, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'ancho_hombros', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'largo_talle_espalda', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'largo_brazo', 'none', 580, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'profundidad_tiro', 'none', 250, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000001', 'largo_exterior_pierna', 'none', 980, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'estatura', 'none', 1620, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'contorno_cuello', 'none', 345, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'contorno_busto', 'none', 805, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'contorno_cintura', 'none', 685, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'contorno_cadera', 'none', 830, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'ancho_hombros', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'largo_talle_espalda', 'none', 405, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'largo_brazo', 'none', 570, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'profundidad_tiro', 'none', 245, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000002', 'largo_exterior_pierna', 'none', 970, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'estatura', 'none', 1720, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'contorno_cuello', 'none', 370, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'contorno_busto', 'none', 880, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'contorno_cintura', 'none', 750, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'contorno_cadera', 'none', 900, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'ancho_hombros', 'none', 420, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'largo_talle_espalda', 'none', 440, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'largo_brazo', 'none', 620, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'profundidad_tiro', 'none', 270, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000003', 'largo_exterior_pierna', 'none', 1030, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'estatura', 'none', 1700, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'contorno_cuello', 'none', 365, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'contorno_busto', 'none', 865, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'contorno_cintura', 'none', 740, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'contorno_cadera', 'none', 890, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'ancho_hombros', 'none', 415, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'largo_talle_espalda', 'none', 435, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'largo_brazo', 'none', 610, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'profundidad_tiro', 'none', 265, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000004', 'largo_exterior_pierna', 'none', 1020, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'estatura', 'none', 1660, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'contorno_cuello', 'none', 355, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'contorno_busto', 'none', 830, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'contorno_cintura', 'none', 710, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'contorno_cadera', 'none', 855, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'ancho_hombros', 'none', 395, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'largo_talle_espalda', 'none', 415, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'largo_brazo', 'none', 590, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'profundidad_tiro', 'none', 255, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000005', 'largo_exterior_pierna', 'none', 990, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'estatura', 'none', 1740, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'contorno_cuello', 'none', 375, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'contorno_busto', 'none', 900, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'contorno_cintura', 'none', 765, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'contorno_cadera', 'none', 920, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'ancho_hombros', 'none', 430, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'largo_talle_espalda', 'none', 450, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'largo_brazo', 'none', 630, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'profundidad_tiro', 'none', 275, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000006', 'largo_exterior_pierna', 'none', 1045, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'estatura', 'none', 1650, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'contorno_cuello', 'none', 350, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'contorno_busto', 'none', 825, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'contorno_cintura', 'none', 705, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'contorno_cadera', 'none', 850, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'ancho_hombros', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'largo_talle_espalda', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'largo_brazo', 'none', 585, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'profundidad_tiro', 'none', 250, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000007', 'largo_exterior_pierna', 'none', 985, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'estatura', 'none', 1630, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'contorno_cuello', 'none', 345, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'contorno_busto', 'none', 810, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'contorno_cintura', 'none', 690, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'contorno_cadera', 'none', 835, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'ancho_hombros', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'largo_talle_espalda', 'none', 405, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'largo_brazo', 'none', 575, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'profundidad_tiro', 'none', 245, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000008', 'largo_exterior_pierna', 'none', 975, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'estatura', 'none', 1750, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'contorno_cuello', 'none', 380, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'contorno_busto', 'none', 910, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'contorno_cintura', 'none', 770, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'contorno_cadera', 'none', 930, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'ancho_hombros', 'none', 435, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'largo_talle_espalda', 'none', 455, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'largo_brazo', 'none', 635, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'profundidad_tiro', 'none', 280, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000009', 'largo_exterior_pierna', 'none', 1050, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'estatura', 'none', 1690, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'contorno_cuello', 'none', 360, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'contorno_busto', 'none', 850, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'contorno_cintura', 'none', 730, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'contorno_cadera', 'none', 880, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'ancho_hombros', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'largo_talle_espalda', 'none', 430, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'largo_brazo', 'none', 605, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'profundidad_tiro', 'none', 260, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000010', 'largo_exterior_pierna', 'none', 1010, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'estatura', 'none', 1670, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'contorno_cuello', 'none', 355, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'contorno_busto', 'none', 840, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'contorno_cintura', 'none', 715, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'contorno_cadera', 'none', 860, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'ancho_hombros', 'none', 400, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'largo_talle_espalda', 'none', 420, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'largo_brazo', 'none', 595, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'profundidad_tiro', 'none', 255, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000011', 'largo_exterior_pierna', 'none', 995, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'estatura', 'none', 1760, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'contorno_cuello', 'none', 380, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'contorno_busto', 'none', 915, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'contorno_cintura', 'none', 775, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'contorno_cadera', 'none', 940, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'ancho_hombros', 'none', 440, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'largo_talle_espalda', 'none', 460, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'largo_brazo', 'none', 640, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'profundidad_tiro', 'none', 280, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000012', 'largo_exterior_pierna', 'none', 1060, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'estatura', 'none', 1655, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'contorno_cuello', 'none', 350, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'contorno_busto', 'none', 830, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'contorno_cintura', 'none', 705, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'contorno_cadera', 'none', 850, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'ancho_hombros', 'none', 395, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'largo_talle_espalda', 'none', 415, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'largo_brazo', 'none', 590, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'profundidad_tiro', 'none', 250, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000013', 'largo_exterior_pierna', 'none', 985, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'estatura', 'none', 1710, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'contorno_cuello', 'none', 370, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'contorno_busto', 'none', 870, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'contorno_cintura', 'none', 745, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'contorno_cadera', 'none', 895, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'ancho_hombros', 'none', 420, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'largo_talle_espalda', 'none', 440, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'largo_brazo', 'none', 615, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'profundidad_tiro', 'none', 265, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000014', 'largo_exterior_pierna', 'none', 1025, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'estatura', 'none', 1635, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'contorno_cuello', 'none', 345, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'contorno_busto', 'none', 815, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'contorno_cintura', 'none', 695, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'contorno_cadera', 'none', 840, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'ancho_hombros', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'largo_talle_espalda', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'largo_brazo', 'none', 580, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'profundidad_tiro', 'none', 250, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000015', 'largo_exterior_pierna', 'none', 980, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-M15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'estatura', 'none', 1580, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'contorno_cuello', 'none', 320, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'contorno_busto', 'none', 800, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'contorno_cintura', 'none', 640, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'contorno_cadera', 'none', 860, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'ancho_hombros', 'none', 360, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'largo_talle_espalda', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'largo_brazo', 'none', 530, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'largo_falda', 'none', 520, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000016', 'profundidad_cintura_cadera', 'none', 190, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F01', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'estatura', 'none', 1650, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'contorno_cuello', 'none', 340, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'contorno_busto', 'none', 860, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'contorno_cintura', 'none', 690, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'contorno_cadera', 'none', 930, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'ancho_hombros', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'largo_talle_espalda', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'largo_brazo', 'none', 560, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'largo_falda', 'none', 550, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000017', 'profundidad_cintura_cadera', 'none', 205, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F02', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'estatura', 'none', 1560, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'contorno_cuello', 'none', 315, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'contorno_busto', 'none', 785, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'contorno_cintura', 'none', 625, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'contorno_cadera', 'none', 850, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'ancho_hombros', 'none', 355, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'largo_talle_espalda', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'largo_brazo', 'none', 525, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'largo_falda', 'none', 510, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000018', 'profundidad_cintura_cadera', 'none', 185, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F03', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'estatura', 'none', 1670, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'contorno_cuello', 'none', 345, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'contorno_busto', 'none', 880, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'contorno_cintura', 'none', 705, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'contorno_cadera', 'none', 950, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'ancho_hombros', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'largo_talle_espalda', 'none', 415, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'largo_brazo', 'none', 570, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'largo_falda', 'none', 560, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000019', 'profundidad_cintura_cadera', 'none', 210, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F04', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'estatura', 'none', 1600, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'contorno_cuello', 'none', 325, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'contorno_busto', 'none', 815, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'contorno_cintura', 'none', 650, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'contorno_cadera', 'none', 880, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'ancho_hombros', 'none', 365, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'largo_talle_espalda', 'none', 395, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'largo_brazo', 'none', 540, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'largo_falda', 'none', 530, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000020', 'profundidad_cintura_cadera', 'none', 195, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F05', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'estatura', 'none', 1640, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'contorno_cuello', 'none', 335, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'contorno_busto', 'none', 850, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'contorno_cintura', 'none', 680, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'contorno_cadera', 'none', 920, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'ancho_hombros', 'none', 380, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'largo_talle_espalda', 'none', 405, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'largo_brazo', 'none', 555, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'largo_falda', 'none', 545, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000021', 'profundidad_cintura_cadera', 'none', 200, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F06', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'estatura', 'none', 1590, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'contorno_cuello', 'none', 320, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'contorno_busto', 'none', 810, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'contorno_cintura', 'none', 645, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'contorno_cadera', 'none', 870, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'ancho_hombros', 'none', 360, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'largo_talle_espalda', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'largo_brazo', 'none', 535, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'largo_falda', 'none', 525, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000022', 'profundidad_cintura_cadera', 'none', 190, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F07', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'estatura', 'none', 1660, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'contorno_cuello', 'none', 340, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'contorno_busto', 'none', 870, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'contorno_cintura', 'none', 700, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'contorno_cadera', 'none', 940, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'ancho_hombros', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'largo_talle_espalda', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'largo_brazo', 'none', 565, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'largo_falda', 'none', 555, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000023', 'profundidad_cintura_cadera', 'none', 210, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F08', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'estatura', 'none', 1570, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'contorno_cuello', 'none', 315, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'contorno_busto', 'none', 790, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'contorno_cintura', 'none', 630, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'contorno_cadera', 'none', 855, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'ancho_hombros', 'none', 355, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'largo_talle_espalda', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'largo_brazo', 'none', 525, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'largo_falda', 'none', 515, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000024', 'profundidad_cintura_cadera', 'none', 185, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F09', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'estatura', 'none', 1680, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'contorno_cuello', 'none', 350, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'contorno_busto', 'none', 890, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'contorno_cintura', 'none', 715, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'contorno_cadera', 'none', 960, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'ancho_hombros', 'none', 395, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'largo_talle_espalda', 'none', 420, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'largo_brazo', 'none', 575, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'largo_falda', 'none', 565, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000025', 'profundidad_cintura_cadera', 'none', 215, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F10', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'estatura', 'none', 1610, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'contorno_cuello', 'none', 330, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'contorno_busto', 'none', 825, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'contorno_cintura', 'none', 660, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'contorno_cadera', 'none', 890, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'ancho_hombros', 'none', 370, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'largo_talle_espalda', 'none', 400, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'largo_brazo', 'none', 545, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'largo_falda', 'none', 535, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000026', 'profundidad_cintura_cadera', 'none', 195, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F11', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'estatura', 'none', 1655, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'contorno_cuello', 'none', 340, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'contorno_busto', 'none', 865, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'contorno_cintura', 'none', 695, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'contorno_cadera', 'none', 935, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'ancho_hombros', 'none', 385, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'largo_talle_espalda', 'none', 410, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'largo_brazo', 'none', 560, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'largo_falda', 'none', 550, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000027', 'profundidad_cintura_cadera', 'none', 205, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F12', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'estatura', 'none', 1585, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'contorno_cuello', 'none', 320, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'contorno_busto', 'none', 805, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'contorno_cintura', 'none', 640, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'contorno_cadera', 'none', 865, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'ancho_hombros', 'none', 360, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'largo_talle_espalda', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'largo_brazo', 'none', 530, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'largo_falda', 'none', 520, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000028', 'profundidad_cintura_cadera', 'none', 190, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F13', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'estatura', 'none', 1675, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'contorno_cuello', 'none', 345, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'contorno_busto', 'none', 885, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'contorno_cintura', 'none', 710, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'contorno_cadera', 'none', 955, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'ancho_hombros', 'none', 390, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'largo_talle_espalda', 'none', 420, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'largo_brazo', 'none', 570, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'largo_falda', 'none', 560, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000029', 'profundidad_cintura_cadera', 'none', 210, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F14', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'estatura', 'none', 1620, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'contorno_cuello', 'none', 330, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'contorno_busto', 'none', 830, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'contorno_cintura', 'none', 665, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'contorno_cadera', 'none', 900, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'ancho_hombros', 'none', 375, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'largo_talle_espalda', 'none', 400, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'largo_brazo', 'none', 550, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'largo_falda', 'none', 540, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);
    INSERT INTO public.measurement_values (session_id, measurement_code, side, value_mm, source, confidence, notes, created_at)
    VALUES ('e1c00000-0000-4000-8000-000000000030', 'profundidad_cintura_cadera', 'none', 200, 'direct', 'confirmed', 'DATOS SINTÉTICOS DE PRUEBA M02 — ALUM-F15', v_now);

    -- ==========================================================================
    -- 8. ESTADO DE SESIONES (CONDICIONADO POR v_finalize_sessions)
    -- ==========================================================================
    IF v_finalize_sessions THEN
        UPDATE public.measurement_sessions
        SET status = 'completed', updated_at = v_now
        WHERE id IN (
            'e1c00000-0000-4000-8000-000000000001',
            'e1c00000-0000-4000-8000-000000000002',
            'e1c00000-0000-4000-8000-000000000003',
            'e1c00000-0000-4000-8000-000000000004',
            'e1c00000-0000-4000-8000-000000000005',
            'e1c00000-0000-4000-8000-000000000006',
            'e1c00000-0000-4000-8000-000000000007',
            'e1c00000-0000-4000-8000-000000000008',
            'e1c00000-0000-4000-8000-000000000009',
            'e1c00000-0000-4000-8000-000000000010',
            'e1c00000-0000-4000-8000-000000000011',
            'e1c00000-0000-4000-8000-000000000012',
            'e1c00000-0000-4000-8000-000000000013',
            'e1c00000-0000-4000-8000-000000000014',
            'e1c00000-0000-4000-8000-000000000015',
            'e1c00000-0000-4000-8000-000000000016',
            'e1c00000-0000-4000-8000-000000000017',
            'e1c00000-0000-4000-8000-000000000018',
            'e1c00000-0000-4000-8000-000000000019',
            'e1c00000-0000-4000-8000-000000000020',
            'e1c00000-0000-4000-8000-000000000021',
            'e1c00000-0000-4000-8000-000000000022',
            'e1c00000-0000-4000-8000-000000000023',
            'e1c00000-0000-4000-8000-000000000024',
            'e1c00000-0000-4000-8000-000000000025',
            'e1c00000-0000-4000-8000-000000000026',
            'e1c00000-0000-4000-8000-000000000027',
            'e1c00000-0000-4000-8000-000000000028',
            'e1c00000-0000-4000-8000-000000000029',
            'e1c00000-0000-4000-8000-000000000030'
        );
        RAISE NOTICE 'Las 30 sesiones de medidas han sido promovidas a "completed" (inmutabilidad activada).';
    ELSE
        RAISE NOTICE 'Las 30 sesiones de medidas se conservan en "draft" (reversibles para rollback seguro).';
    END IF;

    -- ==========================================================================
    -- 9. PARTICIPANTES EN LA JORNADA (30 Registros)
    -- ==========================================================================
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000001', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000001', 'e1c00000-0000-4000-8000-000000000001', 'completed', '14', '{"estatura":164,"contorno_cuello":35,"contorno_busto":82,"contorno_cintura":70,"contorno_cadera":84,"ancho_hombros":39,"largo_talle_espalda":41,"largo_brazo":58,"profundidad_tiro":25,"largo_exterior_pierna":98}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M01', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000002', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000002', 'e1c00000-0000-4000-8000-000000000002', 'completed', '14', '{"estatura":162,"contorno_cuello":34.5,"contorno_busto":80.5,"contorno_cintura":68.5,"contorno_cadera":83,"ancho_hombros":38.5,"largo_talle_espalda":40.5,"largo_brazo":57,"profundidad_tiro":24.5,"largo_exterior_pierna":97}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M02', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000003', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000003', 'e1c00000-0000-4000-8000-000000000003', 'completed', '16', '{"estatura":172,"contorno_cuello":37,"contorno_busto":88,"contorno_cintura":75,"contorno_cadera":90,"ancho_hombros":42,"largo_talle_espalda":44,"largo_brazo":62,"profundidad_tiro":27,"largo_exterior_pierna":103}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M03', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000004', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000004', 'e1c00000-0000-4000-8000-000000000004', 'completed', '16', '{"estatura":170,"contorno_cuello":36.5,"contorno_busto":86.5,"contorno_cintura":74,"contorno_cadera":89,"ancho_hombros":41.5,"largo_talle_espalda":43.5,"largo_brazo":61,"profundidad_tiro":26.5,"largo_exterior_pierna":102}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M04', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000005', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000005', 'e1c00000-0000-4000-8000-000000000005', 'completed', '14', '{"estatura":166,"contorno_cuello":35.5,"contorno_busto":83,"contorno_cintura":71,"contorno_cadera":85.5,"ancho_hombros":39.5,"largo_talle_espalda":41.5,"largo_brazo":59,"profundidad_tiro":25.5,"largo_exterior_pierna":99}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M05', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000006', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000006', 'e1c00000-0000-4000-8000-000000000006', 'completed', '16', '{"estatura":174,"contorno_cuello":37.5,"contorno_busto":90,"contorno_cintura":76.5,"contorno_cadera":92,"ancho_hombros":43,"largo_talle_espalda":45,"largo_brazo":63,"profundidad_tiro":27.5,"largo_exterior_pierna":104.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M06', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000007', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000007', 'e1c00000-0000-4000-8000-000000000007', 'completed', '14', '{"estatura":165,"contorno_cuello":35,"contorno_busto":82.5,"contorno_cintura":70.5,"contorno_cadera":85,"ancho_hombros":39,"largo_talle_espalda":41,"largo_brazo":58.5,"profundidad_tiro":25,"largo_exterior_pierna":98.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M07', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000008', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000008', 'e1c00000-0000-4000-8000-000000000008', 'completed', '14', '{"estatura":163,"contorno_cuello":34.5,"contorno_busto":81,"contorno_cintura":69,"contorno_cadera":83.5,"ancho_hombros":38.5,"largo_talle_espalda":40.5,"largo_brazo":57.5,"profundidad_tiro":24.5,"largo_exterior_pierna":97.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M08', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000009', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000009', 'e1c00000-0000-4000-8000-000000000009', 'completed', '16', '{"estatura":175,"contorno_cuello":38,"contorno_busto":91,"contorno_cintura":77,"contorno_cadera":93,"ancho_hombros":43.5,"largo_talle_espalda":45.5,"largo_brazo":63.5,"profundidad_tiro":28,"largo_exterior_pierna":105}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M09', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000010', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000010', 'e1c00000-0000-4000-8000-000000000010', 'completed', '16', '{"estatura":169,"contorno_cuello":36,"contorno_busto":85,"contorno_cintura":73,"contorno_cadera":88,"ancho_hombros":41,"largo_talle_espalda":43,"largo_brazo":60.5,"profundidad_tiro":26,"largo_exterior_pierna":101}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M10', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000011', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000011', 'e1c00000-0000-4000-8000-000000000011', 'completed', '14', '{"estatura":167,"contorno_cuello":35.5,"contorno_busto":84,"contorno_cintura":71.5,"contorno_cadera":86,"ancho_hombros":40,"largo_talle_espalda":42,"largo_brazo":59.5,"profundidad_tiro":25.5,"largo_exterior_pierna":99.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M11', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000012', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000012', 'e1c00000-0000-4000-8000-000000000012', 'completed', '16', '{"estatura":176,"contorno_cuello":38,"contorno_busto":91.5,"contorno_cintura":77.5,"contorno_cadera":94,"ancho_hombros":44,"largo_talle_espalda":46,"largo_brazo":64,"profundidad_tiro":28,"largo_exterior_pierna":106}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M12', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000013', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000013', 'e1c00000-0000-4000-8000-000000000013', 'completed', '14', '{"estatura":165.5,"contorno_cuello":35,"contorno_busto":83,"contorno_cintura":70.5,"contorno_cadera":85,"ancho_hombros":39.5,"largo_talle_espalda":41.5,"largo_brazo":59,"profundidad_tiro":25,"largo_exterior_pierna":98.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M13', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000014', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000014', 'e1c00000-0000-4000-8000-000000000014', 'completed', '16', '{"estatura":171,"contorno_cuello":37,"contorno_busto":87,"contorno_cintura":74.5,"contorno_cadera":89.5,"ancho_hombros":42,"largo_talle_espalda":44,"largo_brazo":61.5,"profundidad_tiro":26.5,"largo_exterior_pierna":102.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M14', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000015', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000015', 'e1c00000-0000-4000-8000-000000000015', 'completed', '14', '{"estatura":163.5,"contorno_cuello":34.5,"contorno_busto":81.5,"contorno_cintura":69.5,"contorno_cadera":84,"ancho_hombros":39,"largo_talle_espalda":41,"largo_brazo":58,"profundidad_tiro":25,"largo_exterior_pierna":98}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumno: ALUM-M15', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000016', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000016', 'e1c00000-0000-4000-8000-000000000016', 'completed', '14', '{"estatura":158,"contorno_cuello":32,"contorno_busto":80,"contorno_cintura":64,"contorno_cadera":86,"ancho_hombros":36,"largo_talle_espalda":39,"largo_brazo":53,"largo_falda":52,"profundidad_cintura_cadera":19}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F01', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000017', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000017', 'e1c00000-0000-4000-8000-000000000017', 'completed', '16', '{"estatura":165,"contorno_cuello":34,"contorno_busto":86,"contorno_cintura":69,"contorno_cadera":93,"ancho_hombros":38.5,"largo_talle_espalda":41,"largo_brazo":56,"largo_falda":55,"profundidad_cintura_cadera":20.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F02', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000018', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000018', 'e1c00000-0000-4000-8000-000000000018', 'completed', '14', '{"estatura":156,"contorno_cuello":31.5,"contorno_busto":78.5,"contorno_cintura":62.5,"contorno_cadera":85,"ancho_hombros":35.5,"largo_talle_espalda":38.5,"largo_brazo":52.5,"largo_falda":51,"profundidad_cintura_cadera":18.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F03', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000019', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000019', 'e1c00000-0000-4000-8000-000000000019', 'completed', '16', '{"estatura":167,"contorno_cuello":34.5,"contorno_busto":88,"contorno_cintura":70.5,"contorno_cadera":95,"ancho_hombros":39,"largo_talle_espalda":41.5,"largo_brazo":57,"largo_falda":56,"profundidad_cintura_cadera":21}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F04', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000020', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000020', 'e1c00000-0000-4000-8000-000000000020', 'completed', '14', '{"estatura":160,"contorno_cuello":32.5,"contorno_busto":81.5,"contorno_cintura":65,"contorno_cadera":88,"ancho_hombros":36.5,"largo_talle_espalda":39.5,"largo_brazo":54,"largo_falda":53,"profundidad_cintura_cadera":19.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F05', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000021', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000021', 'e1c00000-0000-4000-8000-000000000021', 'completed', '16', '{"estatura":164,"contorno_cuello":33.5,"contorno_busto":85,"contorno_cintura":68,"contorno_cadera":92,"ancho_hombros":38,"largo_talle_espalda":40.5,"largo_brazo":55.5,"largo_falda":54.5,"profundidad_cintura_cadera":20}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F06', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000022', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000022', 'e1c00000-0000-4000-8000-000000000022', 'completed', '14', '{"estatura":159,"contorno_cuello":32,"contorno_busto":81,"contorno_cintura":64.5,"contorno_cadera":87,"ancho_hombros":36,"largo_talle_espalda":39,"largo_brazo":53.5,"largo_falda":52.5,"profundidad_cintura_cadera":19}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F07', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000023', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000023', 'e1c00000-0000-4000-8000-000000000023', 'completed', '16', '{"estatura":166,"contorno_cuello":34,"contorno_busto":87,"contorno_cintura":70,"contorno_cadera":94,"ancho_hombros":38.5,"largo_talle_espalda":41,"largo_brazo":56.5,"largo_falda":55.5,"profundidad_cintura_cadera":21}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F08', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000024', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000024', 'e1c00000-0000-4000-8000-000000000024', 'completed', '14', '{"estatura":157,"contorno_cuello":31.5,"contorno_busto":79,"contorno_cintura":63,"contorno_cadera":85.5,"ancho_hombros":35.5,"largo_talle_espalda":38.5,"largo_brazo":52.5,"largo_falda":51.5,"profundidad_cintura_cadera":18.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F09', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000025', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000025', 'e1c00000-0000-4000-8000-000000000025', 'completed', '16', '{"estatura":168,"contorno_cuello":35,"contorno_busto":89,"contorno_cintura":71.5,"contorno_cadera":96,"ancho_hombros":39.5,"largo_talle_espalda":42,"largo_brazo":57.5,"largo_falda":56.5,"profundidad_cintura_cadera":21.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F10', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000026', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000026', 'e1c00000-0000-4000-8000-000000000026', 'completed', '14', '{"estatura":161,"contorno_cuello":33,"contorno_busto":82.5,"contorno_cintura":66,"contorno_cadera":89,"ancho_hombros":37,"largo_talle_espalda":40,"largo_brazo":54.5,"largo_falda":53.5,"profundidad_cintura_cadera":19.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F11', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000027', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000027', 'e1c00000-0000-4000-8000-000000000027', 'completed', '16', '{"estatura":165.5,"contorno_cuello":34,"contorno_busto":86.5,"contorno_cintura":69.5,"contorno_cadera":93.5,"ancho_hombros":38.5,"largo_talle_espalda":41,"largo_brazo":56,"largo_falda":55,"profundidad_cintura_cadera":20.5}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F12', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000028', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000028', 'e1c00000-0000-4000-8000-000000000028', 'completed', '14', '{"estatura":158.5,"contorno_cuello":32,"contorno_busto":80.5,"contorno_cintura":64,"contorno_cadera":86.5,"ancho_hombros":36,"largo_talle_espalda":39,"largo_brazo":53,"largo_falda":52,"profundidad_cintura_cadera":19}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F13', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000029', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000029', 'e1c00000-0000-4000-8000-000000000029', 'completed', '16', '{"estatura":167.5,"contorno_cuello":34.5,"contorno_busto":88.5,"contorno_cintura":71,"contorno_cadera":95.5,"ancho_hombros":39,"largo_talle_espalda":42,"largo_brazo":57,"largo_falda":56,"profundidad_cintura_cadera":21}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F14', v_now, v_now);
    INSERT INTO public.measurement_campaign_participants (id, campaign_id, person_id, session_id, status, standard_size, captured_values, notes, completed_at, created_at)
    VALUES ('e1d00000-0000-4000-8000-000000000030', 'e1a30000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000030', 'e1c00000-0000-4000-8000-000000000030', 'completed', '14', '{"estatura":162,"contorno_cuello":33,"contorno_busto":83,"contorno_cintura":66.5,"contorno_cadera":90,"ancho_hombros":37.5,"largo_talle_espalda":40,"largo_brazo":55,"largo_falda":54,"profundidad_cintura_cadera":20}'::jsonb, 'DATOS SINTÉTICOS DE PRUEBA M02 — Alumna: ALUM-F15', v_now, v_now);

    -- ==========================================================================
    -- 10. CREACIONES / PRENDAS (45 Registros: 15 Niños x 2 prendas + 15 Niñas x 1 prenda)
    -- ==========================================================================
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000001', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000001', 'Pantalón Clásico Escolar — Mateo Alejandro Rodríguez Gómez', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000001', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M01.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000002', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000002', 'Pantalón Clásico Escolar — Santiago Andrés Castro Navarro', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000002', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M02.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000003', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000003', 'Pantalón Clásico Escolar — Samuel David Polo Arteta', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000003', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M03.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000004', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000004', 'Pantalón Clásico Escolar — Nicolás Eduardo Meza Char', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000004', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M04.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000005', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000005', 'Pantalón Clásico Escolar — Sebastián José Mendoza Vives', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000005', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M05.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000006', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000006', 'Pantalón Clásico Escolar — Daniel Felipe Herrera Daza', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000006', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M06.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000007', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000007', 'Pantalón Clásico Escolar — Gabriel Antonio De la Hoz Ruiz', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000007', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M07.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000008', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000008', 'Pantalón Clásico Escolar — Lucas Emmanuel Pinedo Barros', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000008', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M08.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000009', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000009', 'Pantalón Clásico Escolar — Alejandro Rafael Salcedo Noguera', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000009', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M09.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000010', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000010', 'Pantalón Clásico Escolar — Diego Armando Tarud Ceballos', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000010', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M10.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000011', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000011', 'Pantalón Clásico Escolar — Tomás Ignacio Obregón Llinás', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000011', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M11.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000012', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000012', 'Pantalón Clásico Escolar — Emilio Javier Danies Pumarejo', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000012', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M12.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000013', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000013', 'Pantalón Clásico Escolar — Joaquín Andrés Carbonell Vega', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000013', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M13.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000014', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000014', 'Pantalón Clásico Escolar — Matías Esteban Bula Donado', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000014', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M14.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000015', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000015', 'Pantalón Clásico Escolar — Simón Leonardo Roncallo Cortissoz', 'Pantalón sastre escolar de uniforme para alumno institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'pants', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000015', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M15.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000016', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000001', 'Camisa Clásica Escolar — Mateo Alejandro Rodríguez Gómez', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000001', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M01.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000017', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000002', 'Camisa Clásica Escolar — Santiago Andrés Castro Navarro', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000002', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M02.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000018', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000003', 'Camisa Clásica Escolar — Samuel David Polo Arteta', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000003', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M03.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000019', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000004', 'Camisa Clásica Escolar — Nicolás Eduardo Meza Char', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000004', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M04.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000020', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000005', 'Camisa Clásica Escolar — Sebastián José Mendoza Vives', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000005', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M05.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000021', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000006', 'Camisa Clásica Escolar — Daniel Felipe Herrera Daza', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000006', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M06.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000022', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000007', 'Camisa Clásica Escolar — Gabriel Antonio De la Hoz Ruiz', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000007', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M07.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000023', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000008', 'Camisa Clásica Escolar — Lucas Emmanuel Pinedo Barros', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000008', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M08.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000024', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000009', 'Camisa Clásica Escolar — Alejandro Rafael Salcedo Noguera', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000009', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M09.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000025', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000010', 'Camisa Clásica Escolar — Diego Armando Tarud Ceballos', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000010', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M10.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000026', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000011', 'Camisa Clásica Escolar — Tomás Ignacio Obregón Llinás', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000011', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M11.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000027', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000012', 'Camisa Clásica Escolar — Emilio Javier Danies Pumarejo', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000012', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M12.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000028', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000013', 'Camisa Clásica Escolar — Joaquín Andrés Carbonell Vega', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000013', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M13.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000029', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000014', 'Camisa Clásica Escolar — Matías Esteban Bula Donado', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000014', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumno: ALUM-M14.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000030', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000015', 'Camisa Clásica Escolar — Simón Leonardo Roncallo Cortissoz', 'Camisa clásica manga corta de uniforme con canesú y bordado institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'shirt', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000015', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumno: ALUM-M15.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000031', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000016', 'Vestido Clásico Sencillo — Valentina Sofía Abuchaibe Cepeda', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000016', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F01.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000032', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000017', 'Vestido Clásico Sencillo — Mariana Lucía Benedetti Dangond', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000017', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F02.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000033', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000018', 'Vestido Clásico Sencillo — Isabella Marie Cure Caridi', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000018', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F03.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000034', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000019', 'Vestido Clásico Sencillo — Camila Andrea Daes Insignares', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000019', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F04.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000035', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000020', 'Vestido Clásico Sencillo — Luciana Victoria Echeverría Manotas', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000020', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F05.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000036', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000021', 'Vestido Clásico Sencillo — Salomé Patricia Faciolince Sarabia', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000021', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F06.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000037', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000022', 'Vestido Clásico Sencillo — Gabriela Elena Gerlein Rosado', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000022', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F07.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000038', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000023', 'Vestido Clásico Sencillo — Daniela Cristina Hazbún Slebi', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000023', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F08.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000039', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000024', 'Vestido Clásico Sencillo — Paulina Beatriz Juliao Lafaurie', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000024', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F09.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000040', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000025', 'Vestido Clásico Sencillo — Antonella María Lacouture Muvdi', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000025', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F10.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000041', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000026', 'Vestido Clásico Sencillo — Martina Inés Nule Amastha', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000026', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F11.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000042', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000027', 'Vestido Clásico Sencillo — Elena Isabel Palacio Segebre', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000027', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F12.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000043', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000028', 'Vestido Clásico Sencillo — Catalina Rosa Santo Domingo Vilar', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000028', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F13.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000044', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000029', 'Vestido Clásico Sencillo — Emma Celeste Vengoechea Celia', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000029', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 16. Alumna: ALUM-F14.', v_designer_user_id, v_now, v_now);
    INSERT INTO public.creations (id, client_id, person_id, name, description, creation_type, status, occasion, garment_type, target_date, session_id, notes, created_by, created_at, updated_at)
    VALUES ('e1e00000-0000-4000-8000-000000000045', 'e1a10000-0000-4000-8000-000000000001', 'e1b00000-0000-4000-8000-000000000030', 'Vestido Clásico Sencillo — Miranda Clara Zúñiga Caballero', 'Vestido escolar de falda plisada y corpiño base institucional.', 'corporate', 'active', 'Uniforme Escolar Institucional', 'dress', CURRENT_DATE + INTERVAL '30 days', 'e1c00000-0000-4000-8000-000000000030', 'DATOS SINTÉTICOS DE PRUEBA M02 — Talla de referencia: 14. Alumna: ALUM-F15.', v_designer_user_id, v_now, v_now);

    RAISE NOTICE 'CARGA EXITOSA: 1 Colegio, 1 Grupo, 1 Campaña, 30 Alumnos, 30 Sesiones, 300 Valores y 45 Creaciones insertadas con éxito.';
END $$;

COMMIT;
