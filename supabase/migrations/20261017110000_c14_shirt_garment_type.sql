-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: SOPORTE DE CAMISA DE ALTA COSTURA (C14)
-- Archivo: supabase/migrations/20261017110000_c14_shirt_garment_type.sql
-- ==============================================================================
-- Documentación técnica requerida:
-- 1. TABLA: public.pattern_templates
--    COLUMNA: garment_type
--    RAZÓN: Ampliar restricción CHECK para permitir 'shirt' como 7ª prenda base.
--    IMPACTO: 100% no destructivo; plantillas históricas 1.0.0 de las 6 prendas se conservan.
-- 2. TABLA: public.pattern_executions
--    COLUMNA: garment_type
--    RAZÓN: Ampliar restricción CHECK para permitir 'shirt' en ejecuciones de patronaje.
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
    CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt'));

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
    CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt'));

-- 3. Insertar plantilla semilla SHIRT — CLASSIC (v1.0.0)
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
    'shirt',
    'Camisa Clásica de Alta Costura',
    '1.0.0',
    'Camisa clásica femenina estructurada con canesú, cuello camisero de 2 piezas, cruce frontal, manga sastre y puños.',
    'Sastrería clásica y patronaje a medida By Katherine Carroll (Aldrich adaptado)',
    ARRAY[
        'contorno_cuello',
        'contorno_busto',
        'contorno_cintura',
        'largo_talle_delantero',
        'largo_talle_espalda',
        'ancho_espalda',
        'largo_brazo',
        'contorno_muneca'
    ]::text[],
    ARRAY[
        'ancho_hombros',
        'largo_hombro',
        'ancho_pecho',
        'contorno_biceps',
        'contorno_cadera',
        'profundidad_sisa',
        'largo_camisa'
    ]::text[],
    'regular'
)
ON CONFLICT (garment_type, version) DO NOTHING;

COMMIT;
