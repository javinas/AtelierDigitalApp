-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: SOPORTE DE PATRONES LIBRES (MÓDULO 02 · FLUJO D)
-- Archivo: supabase/migrations/20261017150000_pattern_free_executions.sql
-- ==============================================================================
-- Permite que ejecuciones de patrones libres/experimentales en el Banco Global
-- puedan generarse sin pertenecer obligatoriamente a una clienta ni a una sesión
-- de medidas corporales privada.
--
-- REGLAS ARQUITECTÓNICAS Y DE INTEGRIDAD:
-- 1. NO modifica ni rompe datos históricos existentes: todas las filas históricas
--    conservan su client_id y session_id intactos.
-- 2. Claves foráneas: siguen activas; en PostgreSQL una FK permite valores NULL
--    sin violar la restricción referencial.
-- 3. Inmutabilidad: los snapshots geométricos, de medidas de referencia y
--    parámetros se mantienen estrictamente protegidos por los triggers existentes.
-- 4. Linaje: parent_execution_id continúa soportado para patrones libres derivados.
-- 5. RLS: las políticas existentes de diseñadora/admin aplican transparentemente.
-- ==============================================================================

BEGIN;

-- 1. Flexibilizar client_id y session_id a NULLABLE de forma segura
ALTER TABLE public.pattern_executions 
    ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.pattern_executions 
    ALTER COLUMN session_id DROP NOT NULL;

-- 2. Documentación formal en el catálogo de base de datos
COMMENT ON COLUMN public.pattern_executions.client_id IS 'Clienta asociada al patrón. Es NULL para patrones libres, experimentales o de muestra de taller del Banco Global.';
COMMENT ON COLUMN public.pattern_executions.session_id IS 'Sesión de medidas anatómicas asociada. Es NULL para patrones libres generados con medidas estándar de referencia o manuales.';

COMMIT;
