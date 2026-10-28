-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: SOPORTE DE CHAQUETA SASTRE DE ALTA COSTURA (C15)
-- Archivo: supabase/migrations/20261017130000_c15_jacket_garment_type.sql
-- ==============================================================================
-- Documentación técnica requerida:
-- 1. TABLA: public.pattern_templates
--    COLUMNA: garment_type
--    RAZÓN: Ampliar restricción CHECK para permitir 'jacket' como 9ª prenda base del catálogo.
--    IMPACTO: 100% no destructivo; plantillas históricas 1.0.0 de las 8 prendas anteriores se conservan intactas.
-- 2. TABLA: public.pattern_executions
--    COLUMNA: garment_type
--    RAZÓN: Ampliar restricción CHECK para permitir 'jacket' en ejecuciones de patronaje.
--    IMPACTO: 100% no destructivo; ejecuciones históricas se conservan inmutables.
-- 3. RLS: Las políticas de seguridad vigentes (is_admin_or_designer) aplican sin modificación.
-- 4. TRIGGERS: Los triggers de inmutabilidad y auditoría permanecen activos.
-- 5. COMPATIBILIDAD HISTÓRICA: Se preserva la coexistencia de ejecuciones previas y creaciones (creation_id).
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
    CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset', 'jacket'));

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
    CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset', 'jacket'));

-- 3. Insertar plantilla semilla JACKET — TAILORED COUTURE (v1.0.0)
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
    'jacket',
    'Chaqueta Sastre de Alta Costura',
    '1.0.0',
    'Chaqueta sastre femenina estructurada con solapa de muesca, costadillos, manga de dos hojas y bolsillos de cartera.',
    'Sastrería femenina By Katherine Carroll (Savile Row & French Couture adaptado)',
    ARRAY[
        'contorno_busto',
        'contorno_cintura',
        'contorno_cadera',
        'largo_talle_delantero',
        'largo_talle_espalda',
        'ancho_espalda',
        'largo_brazo',
        'contorno_biceps'
    ]::text[],
    ARRAY[
        'contorno_cuello',
        'ancho_pecho',
        'ancho_hombros',
        'largo_hombro',
        'altura_busto',
        'separacion_busto',
        'contorno_muneca',
        'profundidad_sisa',
        'largo_chaqueta'
    ]::text[],
    'regular'
)
ON CONFLICT (garment_type, version) DO NOTHING;

COMMIT;
