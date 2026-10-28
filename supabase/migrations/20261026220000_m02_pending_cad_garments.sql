-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: 11 PRENDAS CAD PENDIENTES DEL MÓDULO 02
-- Archivo: supabase/migrations/20261026220000_m02_pending_cad_garments.sql
-- ==============================================================================
-- Expande las restricciones CHECK de tipos de prenda en pattern_templates y
-- pattern_executions para incorporar formalmente las 11 prendas y variantes CAD:
-- 1. shirt_dress (Vestido Camisero)
-- 2. tailored_vest (Chaleco Sastre)
-- 3. short (Short Sastre / Bermuda)
-- 4. cargo_pants (Pantalón Cargo / Safari)
-- 5. trench_coat (Gabardina / Trench)
-- 6. atelier_robe (Bata de Taller)
-- 7. evening_gown (Vestido de Gala)
-- 8. bridal_gown (Vestido de Novia)
-- 9. draped_asymmetric_dress (Vestido Drapeado / Asimétrico)
-- 10. bomber_jacket (Cazadora)
-- 11. denim_couture_jacket (Chaqueta Vaquera)
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
    CHECK (garment_type IN (
        'bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset', 'jacket', 'coat',
        'shirt_dress', 'tailored_vest', 'short', 'cargo_pants', 'trench_coat', 'atelier_robe',
        'evening_gown', 'bridal_gown', 'draped_asymmetric_dress', 'bomber_jacket', 'denim_couture_jacket'
    ));

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
    CHECK (garment_type IN (
        'bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse', 'shirt', 'corset', 'jacket', 'coat',
        'shirt_dress', 'tailored_vest', 'short', 'cargo_pants', 'trench_coat', 'atelier_robe',
        'evening_gown', 'bridal_gown', 'draped_asymmetric_dress', 'bomber_jacket', 'denim_couture_jacket'
    ));

-- 3. Insertar plantillas semilla oficiales para las 11 prendas
INSERT INTO public.pattern_templates (
    garment_type,
    name,
    version,
    description,
    method_reference,
    required_measurements,
    optional_measurements,
    default_ease_profile_code
) VALUES
(
    'shirt_dress',
    'Vestido Camisero de Alta Costura',
    '1.0.0',
    'Composición anatómica de cuerpo camisero, falda fluida, cuello camisero 2 piezas, tapeta y mangas.',
    'Método clásico de composición camisera y vestido By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'contorno_cuello', 'largo_talle_delantero', 'largo_talle_espalda', 'ancho_espalda', 'largo_brazo', 'contorno_muneca'],
    ARRAY['largo_falda', 'ancho_hombros', 'contorno_biceps', 'altura_busto'],
    'regular'
),
(
    'tailored_vest',
    'Chaleco Sastre de Autor',
    '1.0.0',
    'Torso sastre entallado sin mangas, escote V con solapa, costadillos anatómicos y ceñidor dorsal.',
    'Sastrería femenina de chaleco estructurado By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'ancho_espalda', 'largo_talle_delantero', 'largo_talle_espalda'],
    ARRAY['contorno_cadera', 'ancho_pecho', 'profundidad_sisa', 'ancho_hombros'],
    'fitted'
),
(
    'short',
    'Short Sastre / Bermuda de Taller',
    '1.0.0',
    'Derivación corta de pantalón sastre con línea de aplomo, tiro anatómico y pernera terminada en bastilla.',
    'Técnica sastre de bermudas y shorts paramétricos By Katherine Carroll',
    ARRAY['contorno_cintura', 'contorno_cadera', 'profundidad_tiro', 'largo_entrepierna', 'contorno_muslo'],
    ARRAY['contorno_rodilla', 'largo_exterior_pierna'],
    'regular'
),
(
    'cargo_pants',
    'Pantalón Cargo / Safari',
    '1.0.0',
    'Pantalón estructurado con bolsillos de parche fuelle lateral, tapas sastre y pretina safari.',
    'Patronaje utilitario de alta costura con módulos de fuelle By Katherine Carroll',
    ARRAY['contorno_cintura', 'contorno_cadera', 'profundidad_tiro', 'largo_exterior_pierna', 'largo_entrepierna', 'contorno_muslo', 'contorno_rodilla', 'contorno_tobillo'],
    ARRAY['contorno_pantorrilla'],
    'relaxed'
),
(
    'trench_coat',
    'Gabardina / Trench Coat',
    '1.0.0',
    'Abrigo exterior cruzado de doble botonadura con solapa convertible, canesú de tormenta, charreteras y cinturón.',
    'Sastrería clásica de trench coat militar de atelier By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'contorno_cuello', 'largo_talle_delantero', 'largo_talle_espalda', 'ancho_espalda', 'largo_brazo', 'contorno_biceps'],
    ARRAY['ancho_hombros', 'profundidad_sisa', 'largo_abrigo'],
    'relaxed'
),
(
    'atelier_robe',
    'Bata de Taller de Alta Costura',
    '1.0.0',
    'Prenda envolvente funcional de atelier con cuello esmoquin, cruce generoso, mangas amplias y cinturón de lazada.',
    'Patronaje de abrigo envolvente ligero con holgura funcional By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'largo_talle_espalda', 'ancho_espalda', 'largo_brazo'],
    ARRAY['ancho_hombros', 'contorno_biceps', 'largo_abrigo'],
    'relaxed'
),
(
    'evening_gown',
    'Vestido de Gala y Alfombra Roja',
    '1.0.0',
    'Cuerpo ceñido con escote de fiesta, costadillos anatómicos, falda maxi con cola y godets de vuelo.',
    'Alta costura de gala para ocasiones especiales By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'altura_busto', 'separacion_busto', 'largo_talle_delantero', 'largo_talle_espalda'],
    ARRAY['largo_falda', 'contorno_bajo_busto', 'profundidad_cintura_cadera'],
    'fitted'
),
(
    'bridal_gown',
    'Vestido de Novia Nupcial',
    '1.0.0',
    'Estructura de bustier nupcial emballenado de 6 paneles, falda princesa con cola de capilla y peplum interior.',
    'Técnica nupcial de atelier con soporte estructural By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'altura_busto', 'separacion_busto', 'largo_talle_delantero', 'largo_talle_espalda'],
    ARRAY['contorno_bajo_busto', 'largo_falda', 'profundidad_cintura_cadera'],
    'fitted'
),
(
    'draped_asymmetric_dress',
    'Vestido Drapeado / Asimétrico',
    '1.0.0',
    'Desarrollo geométrico asimétrico un solo hombro con pliegues drapeados convergentes y falda en cascada.',
    'Modelado y rotación asimétrica de pinzas a pliegues By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'altura_busto', 'separacion_busto', 'largo_talle_delantero', 'largo_talle_espalda', 'ancho_espalda'],
    ARRAY['ancho_pecho', 'profundidad_sisa', 'largo_falda'],
    'regular'
),
(
    'bomber_jacket',
    'Cazadora Sport-Couture',
    '1.0.0',
    'Chaqueta corta a la cintura con cremallera, mangas amplias, cuello rib y pretina elástica sastre.',
    'Sastrería sport-couture corta con remates ajustados By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'largo_talle_delantero', 'largo_talle_espalda', 'ancho_espalda', 'largo_brazo', 'contorno_biceps', 'contorno_muneca'],
    ARRAY['ancho_hombros', 'profundidad_sisa'],
    'relaxed'
),
(
    'denim_couture_jacket',
    'Chaqueta Vaquera de Alta Costura',
    '1.0.0',
    'Sastrería denim articulada con canesús dobles, costadillos rectos, bolsillos con cartera en pico y pretina.',
    'Patronaje de precisión denim sastre con pespunte estructurado By Katherine Carroll',
    ARRAY['contorno_busto', 'contorno_cintura', 'largo_talle_delantero', 'largo_talle_espalda', 'ancho_espalda', 'largo_brazo', 'contorno_biceps', 'contorno_muneca', 'contorno_cuello'],
    ARRAY['ancho_hombros', 'ancho_pecho', 'profundidad_sisa'],
    'regular'
)
ON CONFLICT (garment_type, version) DO NOTHING;

COMMIT;
