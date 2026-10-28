-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: LIMPIEZA SEGURA DE SESIONES EN BORRADOR
-- Archivo: supabase/migrations/20261018080000_cleanup_draft_measurement_sessions.sql
-- ==============================================================================
-- Limpieza auditada y segura de sesiones de medición en estado 'draft' (borrador)
-- que no contengan ejecuciones de patronaje asociadas ni dependencias bloqueantes.
-- Conserva con inmutabilidad absoluta el 100% de las sesiones 'completed',
-- 'verified' y 'archived'.
-- ==============================================================================

DO $$
DECLARE
    v_draft_count INT;
    v_deleted_count INT := 0;
BEGIN
    -- 1. Auditoría previa: Conteo de sesiones en borrador
    SELECT COUNT(*) INTO v_draft_count
    FROM public.measurement_sessions
    WHERE status = 'draft';

    RAISE NOTICE '[Atelier Digital] Sesiones en estado BORRADOR detectadas para auditoría: %', v_draft_count;

    IF v_draft_count > 0 THEN
        -- 2. Desvincular de creaciones que apunten a sesiones en borrador (SET NULL seguro)
        UPDATE public.creations
        SET session_id = NULL
        WHERE session_id IN (
            SELECT id FROM public.measurement_sessions WHERE status = 'draft'
        );

        -- 3. Eliminar valores residuales en measurement_values asociados a sesiones draft
        --    (evita violar FK ON DELETE RESTRICT)
        DELETE FROM public.measurement_values
        WHERE session_id IN (
            SELECT id FROM public.measurement_sessions
            WHERE status = 'draft'
              AND id NOT IN (
                  SELECT session_id FROM public.pattern_executions WHERE session_id IS NOT NULL
              )
        );

        -- 4. Eliminar físicamente las sesiones en borrador huérfanas
        DELETE FROM public.measurement_sessions
        WHERE status = 'draft'
          AND id NOT IN (
              SELECT session_id FROM public.pattern_executions WHERE session_id IS NOT NULL
          );

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '[Atelier Digital] Limpieza completada exitosamente. Sesiones BORRADOR eliminadas: %', v_deleted_count;
    ELSE
        RAISE NOTICE '[Atelier Digital] No existen sesiones BORRADOR para eliminar.';
    END IF;
END $$;
