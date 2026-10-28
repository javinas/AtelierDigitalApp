-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: SOPORTE DE CORSÉ DE ALTA COSTURA (C14-C)
-- Archivo: supabase/migrations/20261017120000_c14_corset_garment_type.sql
-- ==============================================================================
-- Documentación técnica requerida:
-- 1. TABLA: public.pattern_templates
--    COLUMNA: garment_type
--    RAZÓN: Ampliar restricción CHECK para permitir 'corset' como 8ª prenda base del catálogo.
--    IMPACTO: 100% no destructivo; plantillas históricas 1.0.0 de las 7 prendas se conservan.
-- 2. TABLA: public.pattern_executions
--    COLUMNA: garment_type
--    RAZÓN: Ampliar restricción CHECK para permitir 'corset' en ejecuciones de patronaje.
--    IMPACTO: 100% no destructivo; ejecuciones históricas se conservan inmutables.
-- 3. RLS: Las políticas de seguridad vigentes (is_admin_or_designer) aplican sin modificación.
-- 4. TRIGGERS: Los triggers de inmutabilidad y auditoría permanecen activos.
-- 5. COMPATIBILIDAD HISTÓRICA: Se preserva la coexistencia de ejecuciones previas y creaciones.
-- ==============================================================================

BEGIN;

-- 1. Actualizar restricción CHECK en public.pattern_templates
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.pattern_templates'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%garment_type%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.pattern_templates DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.pattern_templates
    ADD CONSTRAINT chk_pattern_templates_garment_type
    CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset'));

-- 2. Actualizar restricción CHECK en public.pattern_executions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.pattern_executions'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%garment_type%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.pattern_executions DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.pattern_executions
    ADD CONSTRAINT chk_pattern_executions_garment_type
    CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset'));

-- 3. Insertar plantilla semilla CORSET — STRUCTURED COUTURE (v1.0.0)
INSERT INTO public.pattern_templates (
    garment_type,
    name,
    version,
    description,
    method_reference,
    required_measurements,
    optional_measurements,
    default_ease_profile_code
) VALUES (
    'corset',
    'Corsé Estructurado de Alta Costura',
    '1.0.0',
    'Corsé anatómico de 5 paneles con reducción activa de cintura, soporte óseo y contorno bajo busto.',
    'Corsetería tradicional By Katherine Carroll (Couture Victorian & Modern Corsetry)',
    ARRAY[
        'contorno_busto',
        'contorno_cintura',
        'largo_talle_delantero',
        'largo_talle_espalda',
        'altura_busto',
        'separacion_busto'
    ]::text[],
    ARRAY[
        'contorno_bajo_busto',
        'contorno_cadera_alta',
        'contorno_cadera',
        'ancho_espalda',
        'ancho_pecho',
        'profundidad_sisa'
    ]::text[],
    'fitted'
)
ON CONFLICT (garment_type, version) DO NOTHING;

COMMIT;
