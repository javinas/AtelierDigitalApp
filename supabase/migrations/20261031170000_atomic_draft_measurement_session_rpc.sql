-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: ACTUALIZACIÓN TRANSACCIONAL ATÓMICA DE BORRADORES
-- Archivo: supabase/migrations/20261031170000_atomic_draft_measurement_session_rpc.sql
-- Proyecto: trgoqqvsprknswobvniu
-- Módulo: M02 — Patronaje y Medidas (Fase D0.1: Resolución Hallazgo H-CV-01)
-- ==============================================================================
-- Resuelve la vulnerabilidad de no-atomicidad en la reanudación y actualización
-- de sesiones de medición en borrador ('draft').
-- Sustituye el patrón desacoplado (DELETE + INSERT + UPDATE vía REST) por una
-- única función almacenada PostgreSQL que ejecuta todas las mutaciones dentro de
-- una transacción ACID estricta con ROLLBACK automático ante cualquier fallo.
--
-- REGLAS DE SEGURIDAD:
-- 1. SECURITY DEFINER con search_path blindado ('') para prevenir hijacking.
-- 2. Verificación estricta de auth.uid() e is_admin_or_designer().
-- 3. Validación de estado: Exclusivamente sesiones en estado 'draft'.
-- 4. Validación ontológica: Integridad referencial con measurement_catalog,
--    lateralidad, valores no negativos y prevención de duplicados.
-- 5. Atomicidad total: Si cualquier inserción o validación falla, PostgreSQL revierte
--    completamente el DELETE previo y restaura la sesión a su estado anterior.
-- 6. Permisos: Revocado para anon/PUBLIC; concedido exclusivamente a authenticated y service_role.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_draft_measurement_session_atomic(
    p_session_id UUID,
    p_unit_system TEXT DEFAULT 'cm',
    p_notes TEXT DEFAULT NULL,
    p_values JSONB DEFAULT '[]'::jsonb,
    p_target_status TEXT DEFAULT 'draft'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_session RECORD;
    v_updated_session RECORD;
    v_dup_code TEXT;
    v_dup_side TEXT;
    v_invalid_code TEXT;
    v_invalid_val NUMERIC;
    v_invalid_side TEXT;
    v_inserted_count INT := 0;
BEGIN
    -- 1. Verificación de Autenticación y Autorización
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    IF NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado: solo personal de diseño o administración puede actualizar sesiones de medición.';
    END IF;

    -- 2. Verificación de Existencia de la Sesión
    SELECT id, client_id, person_id, taken_by, status, unit_system, notes, version_number
    INTO v_session
    FROM public.measurement_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión de medición no encontrada (ID: %).', p_session_id;
    END IF;

    -- 3. Verificación de Estado Estrictamente 'draft'
    IF v_session.status <> 'draft' THEN
        RAISE EXCEPTION 'La sesión se encuentra en estado "%" y es inmutable. Solo se pueden actualizar sesiones en borrador ("draft").', v_session.status;
    END IF;

    -- 4. Validación de Estado Objetivo
    IF p_target_status IS NOT NULL AND p_target_status NOT IN ('draft', 'completed', 'verified') THEN
        RAISE EXCEPTION 'Estado objetivo no válido: "%". Solo se permite "draft", "completed" o "verified".', p_target_status;
    END IF;

    -- 5. Validación del Sistema de Unidades
    IF p_unit_system IS NOT NULL AND p_unit_system NOT IN ('cm', 'mm', 'in') THEN
        RAISE EXCEPTION 'Sistema de unidades no válido: "%". Solo se admite "cm", "mm" o "in".', p_unit_system;
    END IF;

    -- 6. Validación de Mediciones (Array JSONB)
    IF p_values IS NOT NULL AND pg_catalog.jsonb_typeof(p_values) <> 'array' THEN
        RAISE EXCEPTION 'El parámetro de mediciones corporales debe ser un arreglo JSON válido.';
    END IF;

    IF p_values IS NOT NULL AND pg_catalog.jsonb_array_length(p_values) > 0 THEN
        -- a) Verificar unicidad de (measurement_code, side) en el lote entrante
        SELECT x.measurement_code, COALESCE(x.side, 'none')
        INTO v_dup_code, v_dup_side
        FROM pg_catalog.jsonb_to_recordset(p_values) AS x(
            measurement_code TEXT,
            side TEXT
        )
        GROUP BY x.measurement_code, COALESCE(x.side, 'none')
        HAVING pg_catalog.count(*) > 1
        LIMIT 1;

        IF v_dup_code IS NOT NULL THEN
            RAISE EXCEPTION 'Medición duplicada detectada: código "%" con lateralidad "%". Cada cota anatómica debe ser única en la sesión.', v_dup_code, v_dup_side;
        END IF;

        -- b) Verificar existencia de cada código en el catálogo maestro
        SELECT x.measurement_code
        INTO v_invalid_code
        FROM pg_catalog.jsonb_to_recordset(p_values) AS x(
            measurement_code TEXT
        )
        LEFT JOIN public.measurement_catalog c ON c.code = x.measurement_code
        WHERE c.code IS NULL
        LIMIT 1;

        IF v_invalid_code IS NOT NULL THEN
            RAISE EXCEPTION 'Código de medición "%" no reconocido en el catálogo maestro de alta costura.', v_invalid_code;
        END IF;

        -- c) Verificar que los valores en mm sean no nulos y >= 0
        SELECT x.measurement_code, x.value_mm
        INTO v_invalid_code, v_invalid_val
        FROM pg_catalog.jsonb_to_recordset(p_values) AS x(
            measurement_code TEXT,
            value_mm NUMERIC
        )
        WHERE x.value_mm IS NULL OR x.value_mm < 0
        LIMIT 1;

        IF v_invalid_code IS NOT NULL THEN
            RAISE EXCEPTION 'Valor no válido para la medida "%" (% mm). Debe ser un número mayor o igual a cero.', v_invalid_code, v_invalid_val;
        END IF;

        -- d) Validar lateralidad conforme al catálogo
        SELECT x.measurement_code, x.side
        INTO v_invalid_code, v_invalid_side
        FROM pg_catalog.jsonb_to_recordset(p_values) AS x(
            measurement_code TEXT,
            side TEXT
        )
        WHERE x.side IS NOT NULL AND x.side NOT IN ('none', 'left', 'right')
        LIMIT 1;

        IF v_invalid_code IS NOT NULL THEN
            RAISE EXCEPTION 'Lateralidad inválida "%" para la medida "%". Solo se admite "none", "left" o "right".', v_invalid_side, v_invalid_code;
        END IF;
    END IF;

    -- 7. Eliminación Atómica de Valores Anteriores de la Sesión
    DELETE FROM public.measurement_values
    WHERE session_id = p_session_id;

    -- 8. Inserción Atómica del Nuevo Conjunto de Valores
    IF p_values IS NOT NULL AND pg_catalog.jsonb_array_length(p_values) > 0 THEN
        INSERT INTO public.measurement_values (
            session_id,
            measurement_code,
            side,
            value_mm,
            source,
            confidence,
            notes
        )
        SELECT
            p_session_id,
            x.measurement_code,
            COALESCE(x.side, 'none'),
            x.value_mm,
            COALESCE(x.source, 'direct'),
            COALESCE(x.confidence, 'confirmed'),
            x.notes
        FROM pg_catalog.jsonb_to_recordset(p_values) AS x(
            measurement_code TEXT,
            side TEXT,
            value_mm NUMERIC,
            source TEXT,
            confidence TEXT,
            notes TEXT
        );

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    END IF;

    -- 9. Actualización Atómica de Metadatos de la Sesión
    UPDATE public.measurement_sessions
    SET
        notes = NULLIF(pg_catalog.trim(p_notes), ''),
        unit_system = COALESCE(p_unit_system, unit_system),
        status = CASE
            WHEN p_target_status IN ('completed', 'verified') THEN p_target_status
            ELSE 'draft'
        END,
        updated_at = pg_catalog.now()
    WHERE id = p_session_id
    RETURNING * INTO v_updated_session;

    -- 10. Retorno Estructurado y Verificable
    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'session', pg_catalog.to_jsonb(v_updated_session),
        'inserted_count', v_inserted_count
    );
END;
$$;

-- Permisos y Documentación
COMMENT ON FUNCTION public.update_draft_measurement_session_atomic(UUID, TEXT, TEXT, JSONB, TEXT)
IS 'Actualiza de forma atómica y transaccional una sesión en borrador, eliminando valores anteriores, insertando los nuevos y actualizando metadatos bajo una única transacción ACID.';

REVOKE ALL ON FUNCTION public.update_draft_measurement_session_atomic(UUID, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_draft_measurement_session_atomic(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated, service_role;

COMMIT;

