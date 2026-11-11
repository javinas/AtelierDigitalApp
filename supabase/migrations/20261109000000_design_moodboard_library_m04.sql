-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 04: DISEÑO, MOODBOARD Y BIBLIOTECA DE AUTOR
-- Archivo: supabase/migrations/20261109000000_design_moodboard_library_m04.sql
-- Descripción: Tablas satélite para gestión de moodboards por creación, tarjetas
--              visuales de inspiración/bocetos, paletas cromáticas y biblioteca
--              permanente de recursos de alta costura By Katherine Carroll.
--              NO altera public.creations ni tablas de M00, M01, M02 o M03.
-- Orden de despliegue: Ejecutar DESPUÉS de 20261108000000_commercial_cycle_module_03.sql
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. FUNCIÓN Y TRIGGERS AUTOMÁTICOS DE AUDITORÍA TEMPORAL (updated_at)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_m04_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_m04_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_m04_updated_at_column() TO authenticated, service_role, postgres;

-- ==============================================================================
-- 2. TABLA 1/3: Biblioteca Permanente de Recursos de Autor (design_library_items)
--    (Declarada primero para integridad referencial con moodboard_items)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.design_library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL
        CHECK (category IN ('silhouette', 'neckline', 'sleeve', 'fabric_drape', 'embroidery_finish', 'color_palette', 'historical_archive')),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT NOT NULL,
    technical_notes TEXT,
    compatible_garments TEXT[] DEFAULT '{}',
    image_key TEXT,
    image_url TEXT,
    storage_path TEXT,
    accent_hex TEXT,
    palette_swatches JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    is_signature BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.design_library_items IS 'Archivo maestro de siluetas, escotes, mangas, bordados y paletas reutilizables de la Casa By Katherine Carroll.';

-- ==============================================================================
-- 3. TABLA 2/3: Cabecera de Moodboard por Creación (creation_moodboards)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.creation_moodboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creation_id UUID NOT NULL UNIQUE REFERENCES public.creations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    theme_concept TEXT,
    silhouette_code TEXT,
    neckline_code TEXT,
    sleeve_code TEXT,
    color_palette JSONB NOT NULL DEFAULT '[]'::jsonb,
    artistic_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_review', 'approved', 'archived')),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.creation_moodboards IS 'Cabecera de dirección estética, arquitectura visual y paleta cromática vinculada 1:1 a una Creación.';

-- ==============================================================================
-- 4. TABLA 3/3: Elementos Visuales Fijados en el Moodboard (moodboard_items)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.moodboard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moodboard_id UUID REFERENCES public.creation_moodboards(id) ON DELETE CASCADE,
    creation_id UUID NOT NULL REFERENCES public.creations(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL
        CHECK (item_type IN ('sketch', 'fabric_swatch', 'silhouette_ref', 'detail_finish', 'color_inspiration', 'editorial_note')),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_key TEXT,
    image_url TEXT,
    storage_path TEXT,
    color_hex TEXT,
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    library_item_id UUID REFERENCES public.design_library_items(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.moodboard_items IS 'Tarjetas visuales del moodboard: bocetos, figurines, muestras textiles, detalles constructivos y notas.';

-- Garantía idempotente de FK si la tabla moodboard_items existía previamente sin restricción
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_moodboard_items_library_item'
    ) THEN
        ALTER TABLE public.moodboard_items
            ADD CONSTRAINT fk_moodboard_items_library_item
            FOREIGN KEY (library_item_id) REFERENCES public.design_library_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==============================================================================
-- 5. TRIGGERS updated_at E ÍNDICES DE RENDIMIENTO
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_creation_moodboards_updated_at ON public.creation_moodboards;
CREATE TRIGGER trg_creation_moodboards_updated_at
    BEFORE UPDATE ON public.creation_moodboards
    FOR EACH ROW EXECUTE FUNCTION public.update_m04_updated_at_column();

DROP TRIGGER IF EXISTS trg_moodboard_items_updated_at ON public.moodboard_items;
CREATE TRIGGER trg_moodboard_items_updated_at
    BEFORE UPDATE ON public.moodboard_items
    FOR EACH ROW EXECUTE FUNCTION public.update_m04_updated_at_column();

DROP TRIGGER IF EXISTS trg_design_library_items_updated_at ON public.design_library_items;
CREATE TRIGGER trg_design_library_items_updated_at
    BEFORE UPDATE ON public.design_library_items
    FOR EACH ROW EXECUTE FUNCTION public.update_m04_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_creation_moodboards_creation_id ON public.creation_moodboards(creation_id);
CREATE INDEX IF NOT EXISTS idx_moodboard_items_creation_id ON public.moodboard_items(creation_id);
CREATE INDEX IF NOT EXISTS idx_moodboard_items_moodboard_id ON public.moodboard_items(moodboard_id);
CREATE INDEX IF NOT EXISTS idx_moodboard_items_type ON public.moodboard_items(item_type);
CREATE INDEX IF NOT EXISTS idx_moodboard_items_library_id ON public.moodboard_items(library_item_id);
CREATE INDEX IF NOT EXISTS idx_design_library_category ON public.design_library_items(category);
CREATE INDEX IF NOT EXISTS idx_design_library_active ON public.design_library_items(is_active);

-- ==============================================================================
-- 6. PRIVILEGIOS Y POLÍTICAS ROW LEVEL SECURITY (RLS) CON is_admin_or_designer()
-- ==============================================================================

ALTER TABLE public.creation_moodboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodboard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_library_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
    public.creation_moodboards,
    public.moodboard_items,
    public.design_library_items
FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.creation_moodboards,
    public.moodboard_items,
    public.design_library_items
TO authenticated, service_role, postgres;

DROP POLICY IF EXISTS "designer_admin_all_creation_moodboards" ON public.creation_moodboards;
CREATE POLICY "designer_admin_all_creation_moodboards"
    ON public.creation_moodboards
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_all_moodboard_items" ON public.moodboard_items;
CREATE POLICY "designer_admin_all_moodboard_items"
    ON public.moodboard_items
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_all_design_library_items" ON public.design_library_items;
CREATE POLICY "designer_admin_all_design_library_items"
    ON public.design_library_items
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_designer())
    WITH CHECK (public.is_admin_or_designer());

-- ==============================================================================
-- 7. BUCKET PRIVADO DE RECURSOS DE DISEÑO (design-assets) Y POLÍTICAS STORAGE
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'design-assets',
    'design-assets',
    false,
    15728640, -- 15 MB por boceto o fotografía de alta resolución
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "designer_admin_storage_design_assets_select" ON storage.objects;
CREATE POLICY "designer_admin_storage_design_assets_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'design-assets' AND public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_storage_design_assets_insert" ON storage.objects;
CREATE POLICY "designer_admin_storage_design_assets_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'design-assets' AND public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_storage_design_assets_update" ON storage.objects;
CREATE POLICY "designer_admin_storage_design_assets_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'design-assets' AND public.is_admin_or_designer())
    WITH CHECK (bucket_id = 'design-assets' AND public.is_admin_or_designer());

DROP POLICY IF EXISTS "designer_admin_storage_design_assets_delete" ON storage.objects;
CREATE POLICY "designer_admin_storage_design_assets_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'design-assets' AND public.is_admin_or_designer());

-- ==============================================================================
-- 8. SEMILLA IDEMPOTENTE DEL ARCHIVO DE AUTOR BY KATHERINE CARROLL
-- ==============================================================================

INSERT INTO public.design_library_items (
    category, code, title, subtitle, description, technical_notes,
    compatible_garments, image_key, accent_hex, tags, is_signature, is_active
)
VALUES
(
    'silhouette', 'SIL-KC-001',
    'Corpiño Estructurado con Falda Evasé al Bies',
    'Arquitectura Reloj de Arena · Sello de Autor',
    'Torso anatómico entallado mediante 10 ballenas espirales internas y falda evasé cortada a 45° para caída fluida sin volumen excesivo en cadera.',
    'Requiere entretela de algodón orgánico fusionada en forro base y margen de costura de 15 mm en costadillos para ajustes de fitting.',
    ARRAY['dress', 'bodice', 'skirt'], 'dress', '#C5A880',
    ARRAY['Alta Costura', 'Gala', 'Corsetería', 'Bies 45°'], true, true
),
(
    'silhouette', 'SIL-KC-002',
    'Chaqueta Sastre Bespoke de Hombro Escultórico',
    'Sastrería Femenina de Autor',
    'Línea de hombro definida con hombrera artesanal en crin, pinza Dior frontal que estiliza el busto y faldón ligeramente acampanado sobre cadera.',
    'Trazar con desahogo Regular (+80 mm busto). Aplicar picado manual en solapa para lograr vuelta natural sin quiebre rígido.',
    ARRAY['jacket', 'coat'], 'jacket', '#1C1C22',
    ARRAY['Sastrería', 'Bespoke', 'Pinza Dior', 'Crin'], true, true
),
(
    'neckline', 'ESC-KC-001',
    'Escote Corazón Profundo con Tul Ilusión Invisible',
    'Sujeción Anatómica Invisible',
    'Curva corazón orgánica que realza el escote manteniendo soporte lateral absoluto gracias a una pieza central en tul ilusión suizo al tono de piel.',
    'Embebido de 8 mm en el borde superior del escote durante el armado de la glasilla (toile) para evitar bocado al sentarse.',
    ARRAY['dress', 'bodice', 'corset'], 'corset', '#E8D8C8',
    ARRAY['Escote Corazón', 'Tul Ilusión', 'Novias', 'Gala'], true, true
),
(
    'neckline', 'ESC-KC-002',
    'Solapa en Punta de Lanza con Ojal Milanés',
    'Sastrería Imperial',
    'Solapa ascendente de 8.5 cm de ancho con quiebre bajo a la altura del talle y ojal bordado a mano con torzal de seda.',
    'Reforzar línea de quiebre con cinta de lino de 6 mm ligeramente tensada (3 mm por tramo de 20 cm).',
    ARRAY['jacket', 'coat'], 'coat', '#2C2A29',
    ARRAY['Solapa Lanza', 'Ojal Milanés', 'Sastrería'], true, true
),
(
    'sleeve', 'MNG-KC-001',
    'Manga Sastre de Dos Hojas con Caída Adelantada',
    'Ergonomía de Brazo en Movimiento',
    'Construcción clásica de hoja superior y bajera con rotación de aplomo de +12 mm hacia el delantero para acompañar la postura natural del brazo.',
    'Embebido de copa controlado entre 22 mm y 28 mm distribuido con hilván doble en la cabeza de manga.',
    ARRAY['jacket', 'coat', 'dress'], 'sleeve', '#8A6A4A',
    ARRAY['Manga 2 Hojas', 'Embebido Copa', 'Sastrería'], true, true
),
(
    'sleeve', 'MNG-KC-002',
    'Manga Obispo en Chiffon de Seda con Puño Joya',
    'Volumen Etéreo Translúcido',
    'Manga amplia fruncida suavemente en la muñeca sobre un puño alto de 9 cm abotonado con 6 botones forrados en charmeuse.',
    'Cortar la hoja de manga al hilo con factor de frunce 1.8x en el contorno de muñeca.',
    ARRAY['blouse', 'dress'], 'blouse', '#EFE6D5',
    ARRAY['Manga Obispo', 'Chiffon Seda', 'Puño Joya'], false, true
),
(
    'fabric_drape', 'TEX-KC-001',
    'Comportamiento de Mikado de Seda Natural (240 g/m²)',
    'Arquitectura con Cuerpo y Brillo Perlado',
    'Tejido de grano sutil con memoria estructural ideal para faldas esculturales, pliegues encontrados y colas catedral.',
    'Planchar exclusivamente por el revés con paño de organza seca y vapor moderado; no usar alfileres gruesos fuera del margen de costura.',
    ARRAY['dress', 'skirt', 'jacket'], 'skirt', '#F7F2E7',
    ARRAY['Mikado Seda', 'Arquitectónico', 'Gala'], true, true
),
(
    'embroidery_finish', 'BOR-KC-001',
    'Bordado Luneville en Hilo de Oro Viejo y Canutillo Francés',
    'Artesanía de Bastidor',
    'Aplicación sobre tul u organza mediante aguja de crochet Luneville por el revés, creando relieves florales y destellos cálidos bajo luz tenue.',
    'Realizar el bordado sobre las piezas marcadas en el patrón antes de cerrar costuras laterales para mantener tensión uniforme en el bastidor.',
    ARRAY['dress', 'bodice', 'corset', 'jacket'], 'bodice', '#C5A880',
    ARRAY['Luneville', 'Pedrería', 'Hecho a Mano', 'Oro Viejo'], true, true
),
(
    'historical_archive', 'ARC-KC-001',
    'Archivo 2024 · Vestido Ópera Imperial en Crepé Marrocain',
    'Pieza Insignia By Katherine Carroll',
    'Diseño icónico del atelier con drapeado asimétrico desde el hombro izquierdo hacia la cintura y abertura lateral forrada en satén duchesse.',
    'Patrón base: Corpiño + Falda integrados con traslado de pinza de busto hacia los 3 pliegues del hombro izquierdo.',
    ARRAY['dress'], 'dress', '#6E1E2A',
    ARRAY['Archivo KC', 'Drapeado Moulage', 'Ópera'], true, true
)
ON CONFLICT (code) DO NOTHING;

COMMIT;
