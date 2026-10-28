-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO 02 — MEDIDAS, TALLAS Y MOTOR DE PATRONAJE
-- Archivo: supabase/migrations/20261014210000_modulo02_measurements_patterns.sql
-- Proyecto: trgoqqvsprknswobvniu
-- ==============================================================================
-- Define la arquitectura de datos relacional y versionada para:
-- 1. Catálogo maestro de medidas corporales y de diseño con validaciones.
-- 2. Sesiones históricas de toma de medidas asociadas a public.clients.
-- 3. Valores individuales de medición por sesión con lateralidad, procedencia y fiabilidad.
-- 4. Perfiles de holgura configurables (entallado, regular, holgado, personalizado).
-- 5. Plantillas de requisitos de medidas por tipo de prenda.
-- 6. Ejecuciones inmutables y versionadas del motor de patronaje (snapshots JSON).
-- 7. Historial de ajustes y correcciones derivados de pruebas de confección.
--
-- SEGURIDAD:
-- - Row Level Security (RLS) estricto en todas las tablas.
-- - Acceso restringido a roles 'admin' y 'designer' vía public.is_admin_or_designer().
-- - Acceso anónimo ('anon') y clientes ('client') completamente revocado.
-- - Claves foráneas con ON DELETE RESTRICT para proteger el historial técnico.
-- - Funciones SECURITY DEFINER con search_path blindado ('') y permisos revocados a PUBLIC/anon.
-- ==============================================================================

BEGIN;

-- 1. TABLA: Catálogo Maestro de Medidas
CREATE TABLE IF NOT EXISTS public.measurement_catalog (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('torso_body', 'arms_sleeves', 'legs_pants', 'fit_adjustment', 'garment_design')),
    scope TEXT NOT NULL CHECK (scope IN ('body', 'finished_garment', 'design_parameter', 'calculated')),
    default_unit TEXT NOT NULL DEFAULT 'cm' CHECK (default_unit IN ('cm', 'mm', 'in')),
    precision_step NUMERIC NOT NULL DEFAULT 0.5,
    min_value_mm NUMERIC NOT NULL,
    max_value_mm NUMERIC NOT NULL,
    instructions TEXT NOT NULL,
    anatomical_landmarks TEXT NOT NULL,
    laterality TEXT NOT NULL DEFAULT 'none' CHECK (laterality IN ('none', 'bilateral', 'left_only', 'right_only')),
    is_calculated BOOLEAN NOT NULL DEFAULT FALSE,
    formula_expression TEXT,
    dependencies TEXT[] DEFAULT '{}',
    block_usage TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.measurement_catalog IS 'Catálogo maestro estandarizado de medidas corporales y de patronaje de Atelier Digital.';

-- 2. TABLA: Sesiones de Toma de Medidas
CREATE TABLE IF NOT EXISTS public.measurement_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    taken_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'verified', 'archived')),
    unit_system TEXT NOT NULL DEFAULT 'cm' CHECK (unit_system IN ('cm', 'mm', 'in')),
    notes TEXT,
    version_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.measurement_sessions IS 'Sesiones de medición corporal fechadas asociadas a una clienta de alta costura.';

CREATE INDEX IF NOT EXISTS idx_meas_sessions_client_id ON public.measurement_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_meas_sessions_date ON public.measurement_sessions(session_date DESC);

-- Trigger para updated_at en measurement_sessions
DROP TRIGGER IF EXISTS set_measurement_sessions_updated_at ON public.measurement_sessions;
CREATE TRIGGER set_measurement_sessions_updated_at
    BEFORE UPDATE ON public.measurement_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para proteger la inmutabilidad de measurement_sessions:
-- 1. La autoría (taken_by) es inmutable.
-- 2. El cliente vinculado (client_id) no puede cambiarse.
-- 3. Una sesión finalizada ('completed', 'verified', 'archived') no puede revertirse a 'draft'.
-- 4. El sistema de unidades no puede alterarse una vez finalizada la sesión.
CREATE OR REPLACE FUNCTION public.protect_measurement_session_immutability()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    IF NEW.taken_by IS DISTINCT FROM OLD.taken_by THEN
        RAISE EXCEPTION 'No está permitido alterar la autoría original (taken_by) de una sesión de medición.';
    END IF;

    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
        RAISE EXCEPTION 'No está permitido alterar el cliente asociado a una sesión de medición.';
    END IF;

    IF OLD.status IN ('completed', 'verified', 'archived') AND NEW.status = 'draft' THEN
        RAISE EXCEPTION 'Una sesión finalizada (estado: %) no puede revertirse a borrador ("draft").', OLD.status;
    END IF;

    IF OLD.status IN ('completed', 'verified', 'archived') AND NEW.unit_system IS DISTINCT FROM OLD.unit_system THEN
        RAISE EXCEPTION 'No está permitido modificar el sistema de unidades de una sesión finalizada.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_measurement_session_authorship ON public.measurement_sessions;
DROP TRIGGER IF EXISTS trg_protect_measurement_session_immutability ON public.measurement_sessions;
CREATE TRIGGER trg_protect_measurement_session_immutability
    BEFORE UPDATE ON public.measurement_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_measurement_session_immutability();

-- Trigger para impedir la eliminación accidental de sesiones finalizadas (incluso por administradores)
CREATE OR REPLACE FUNCTION public.protect_finalized_session_deletion()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    IF OLD.status IN ('completed', 'verified', 'archived') THEN
        RAISE EXCEPTION 'No se permite eliminar una sesión de medición histórica finalizada (estado: %). Solo es posible archivarla para preservar la trazabilidad.', OLD.status;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_finalized_session_deletion ON public.measurement_sessions;
CREATE TRIGGER trg_protect_finalized_session_deletion
    BEFORE DELETE ON public.measurement_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_finalized_session_deletion();

-- 3. TABLA: Valores Individuales de Medición (con soporte de lateralidad y procedencia explícita)
CREATE TABLE IF NOT EXISTS public.measurement_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.measurement_sessions(id) ON DELETE RESTRICT,
    measurement_code TEXT NOT NULL REFERENCES public.measurement_catalog(code) ON DELETE RESTRICT,
    side TEXT NOT NULL DEFAULT 'none' CHECK (side IN ('none', 'left', 'right')),
    value_mm NUMERIC NOT NULL CHECK (value_mm >= 0),
    source TEXT NOT NULL CHECK (source IN ('direct', 'calculated', 'estimated')),
    confidence TEXT NOT NULL CHECK (confidence IN ('confirmed', 'preliminary', 'designer_approved')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_session_measurement_side UNIQUE (session_id, measurement_code, side)
);

COMMENT ON TABLE public.measurement_values IS 'Valores individuales en milímetros capturados en una sesión con lateralidad y trazabilidad.';

CREATE INDEX IF NOT EXISTS idx_meas_values_session ON public.measurement_values(session_id);
CREATE INDEX IF NOT EXISTS idx_meas_values_code ON public.measurement_values(measurement_code);
CREATE INDEX IF NOT EXISTS idx_meas_values_session_code_side ON public.measurement_values(session_id, measurement_code, side);

-- Trigger de validación de valor: distingue medidas corporales (>0) de parámetros de diseño (>=0),
-- valida lateralidad según catálogo y exige coherencia estricta en procedencia y confianza.
CREATE OR REPLACE FUNCTION public.validate_measurement_value()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    v_min NUMERIC;
    v_max NUMERIC;
    v_scope TEXT;
    v_is_calculated BOOLEAN;
    v_laterality TEXT;
BEGIN
    SELECT min_value_mm, max_value_mm, scope, is_calculated, laterality
    INTO v_min, v_max, v_scope, v_is_calculated, v_laterality
    FROM public.measurement_catalog
    WHERE code = NEW.measurement_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Código de medida inexistente en el catálogo: %', NEW.measurement_code;
    END IF;

    -- 1. Validar compatibilidad de lateralidad con el catálogo maestro
    IF v_laterality = 'none' AND NEW.side <> 'none' THEN
        RAISE EXCEPTION 'La medida % no admite distinción de lateralidad (side debe ser "none", recibido: "%").', NEW.measurement_code, NEW.side;
    ELSIF v_laterality = 'left_only' AND NEW.side NOT IN ('none', 'left') THEN
        RAISE EXCEPTION 'La medida % solo admite lateralidad izquierda ("left" o "none", recibido: "%").', NEW.measurement_code, NEW.side;
    ELSIF v_laterality = 'right_only' AND NEW.side NOT IN ('none', 'right') THEN
        RAISE EXCEPTION 'La medida % solo admite lateralidad derecha ("right" o "none", recibido: "%").', NEW.measurement_code, NEW.side;
    ELSIF v_laterality = 'bilateral' AND NEW.side NOT IN ('none', 'left', 'right') THEN
        RAISE EXCEPTION 'La medida bilateral % solo admite lados "none", "left" o "right" (recibido: "%").', NEW.measurement_code, NEW.side;
    END IF;

    -- 2. Validar coherencia de procedencia y confianza:
    -- Ninguna medida estimada o calculada puede registrarse automáticamente con confianza física "confirmed".
    IF NEW.source IN ('calculated', 'estimated') AND NEW.confidence = 'confirmed' THEN
        RAISE EXCEPTION 'Inconsistencia de procedencia: Una medición de tipo "%" no puede registrarse con confianza "confirmed". Debe ser "preliminary" o "designer_approved".', NEW.source;
    END IF;

    -- 3. Si la medida es clasificada como calculada en catálogo, su procedencia no puede ser "direct"
    IF (v_scope = 'calculated' OR v_is_calculated IS TRUE) AND NEW.source = 'direct' THEN
        RAISE EXCEPTION 'Inconsistencia de catálogo: La medida % es de ámbito calculado (scope="calculated"); su procedencia debe ser "calculated" o "estimated", no "direct".', NEW.measurement_code;
    END IF;

    -- 4. Las medidas corporales deben ser estrictamente positivas (> 0)
    IF v_scope = 'body' AND NEW.value_mm <= 0 THEN
        RAISE EXCEPTION 'La medida corporal % debe ser estrictamente positiva (recibido: % mm).', NEW.measurement_code, NEW.value_mm;
    END IF;

    -- 5. Validar rangos permitidos según catálogo maestro
    IF NEW.value_mm < v_min OR NEW.value_mm > v_max THEN
        RAISE EXCEPTION 'El valor % mm para % está fuera del rango permitido [% mm, % mm].', NEW.value_mm, NEW.measurement_code, v_min, v_max;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_measurement_value ON public.measurement_values;
CREATE TRIGGER trg_validate_measurement_value
    BEFORE INSERT OR UPDATE ON public.measurement_values
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_measurement_value();

-- Trigger para proteger la inmutabilidad de los valores de sesiones finalizadas:
-- 1. Una sesión en estado 'draft' puede completarse o rectificarse progresivamente.
-- 2. Al finalizar ('completed', 'verified', 'archived'), sus valores quedan estrictamente protegidos contra inserción, edición y eliminación.
-- 3. No permite transferir valores entre sesiones distintas.
CREATE OR REPLACE FUNCTION public.protect_finalized_session_measurement_values()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    v_session_status TEXT;
    v_target_session_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_target_session_id := OLD.session_id;
    ELSE
        v_target_session_id := NEW.session_id;
    END IF;

    -- Validar que no se transfiera un valor a otra sesión
    IF TG_OP = 'UPDATE' AND NEW.session_id IS DISTINCT FROM OLD.session_id THEN
        RAISE EXCEPTION 'No está permitido reasignar un valor de medición a otra sesión.';
    END IF;

    SELECT status INTO v_session_status
    FROM public.measurement_sessions
    WHERE id = v_target_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La sesión de medición referenciada no existe: %', v_target_session_id;
    END IF;

    IF v_session_status IN ('completed', 'verified', 'archived') THEN
        IF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'No se pueden añadir valores a una sesión de medidas finalizada (estado: %). Registre una nueva versión de sesión para rectificaciones.', v_session_status;
        ELSIF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'No se permite modificar los valores de una sesión finalizada (estado: %). Los registros históricos son inmutables.', v_session_status;
        ELSIF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'No se permite eliminar los valores de una sesión finalizada (estado: %).', v_session_status;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_finalized_session_measurement_values ON public.measurement_values;
CREATE TRIGGER trg_protect_finalized_session_measurement_values
    BEFORE INSERT OR UPDATE OR DELETE ON public.measurement_values
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_finalized_session_measurement_values();

-- 4. TABLA: Perfiles de Holgura (Ease Profiles)
CREATE TABLE IF NOT EXISTS public.ease_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    ease_values JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.ease_profiles IS 'Perfiles de holgura de uso y estilo para el ajuste de prendas de alta costura.';

-- 5. TABLA: Plantillas de Prenda y Requisitos
CREATE TABLE IF NOT EXISTS public.pattern_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garment_type TEXT NOT NULL CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse')),
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    description TEXT,
    method_reference TEXT NOT NULL,
    required_measurements TEXT[] NOT NULL,
    optional_measurements TEXT[] DEFAULT '{}',
    default_ease_profile_code TEXT REFERENCES public.ease_profiles(code) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_pattern_templates_garment_version UNIQUE (garment_type, version)
);

COMMENT ON TABLE public.pattern_templates IS 'Plantillas base de patronaje con sus especificaciones y requisitos metodológicos.';

-- Trigger para proteger la integridad histórica de plantillas utilizadas:
-- 1. Si una plantilla ya está referenciada por alguna ejecución en pattern_executions,
--    se bloquea cualquier modificación en sus campos técnicos: garment_type, version,
--    method_reference, required_measurements y optional_measurements.
-- 2. Se impide la eliminación de plantillas en uso histórico para preservar la reproducibilidad matemática.
-- 3. Para introducir cambios metodológicos o de requisitos, se deben insertar nuevas versiones como filas independientes.
CREATE OR REPLACE FUNCTION public.protect_referenced_pattern_template()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF EXISTS (
            SELECT 1 FROM public.pattern_executions
            WHERE template_id = OLD.id
        ) THEN
            RAISE EXCEPTION 'No se permite eliminar la plantilla de patronaje "%" (versión: %, id: %) porque está referenciada por ejecuciones históricas de patronaje. Presérvela para garantizar la trazabilidad inmutable.',
                OLD.name, OLD.version, OLD.id;
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF (NEW.garment_type IS DISTINCT FROM OLD.garment_type
            OR NEW.version IS DISTINCT FROM OLD.version
            OR NEW.method_reference IS DISTINCT FROM OLD.method_reference
            OR NEW.required_measurements IS DISTINCT FROM OLD.required_measurements
            OR NEW.optional_measurements IS DISTINCT FROM OLD.optional_measurements)
        THEN
            IF EXISTS (
                SELECT 1 FROM public.pattern_executions
                WHERE template_id = OLD.id
            ) THEN
                RAISE EXCEPTION 'No se permite modificar los campos técnicos (garment_type, version, method_reference, required_measurements, optional_measurements) de la plantilla "%" (versión: %, id: %) porque ya ha sido utilizada en ejecuciones históricas de patronaje. Para introducir cambios metodológicos cree una nueva versión de plantilla.',
                    OLD.name, OLD.version, OLD.id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_referenced_pattern_template ON public.pattern_templates;
CREATE TRIGGER trg_protect_referenced_pattern_template
    BEFORE UPDATE OR DELETE ON public.pattern_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_referenced_pattern_template();

-- 6. TABLA: Ejecuciones y Versiones de Patrones
CREATE TABLE IF NOT EXISTS public.pattern_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    session_id UUID NOT NULL REFERENCES public.measurement_sessions(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES public.pattern_templates(id) ON DELETE SET NULL,
    parent_execution_id UUID REFERENCES public.pattern_executions(id) ON DELETE RESTRICT,
    garment_type TEXT NOT NULL CHECK (garment_type IN ('bodice', 'sleeve', 'skirt', 'pants', 'dress', 'blouse')),
    version_label TEXT NOT NULL DEFAULT 'v1.0',
    engine_version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'needs_revision', 'pending_fitting', 'approved_by_designer')),
    measurement_snapshot JSONB NOT NULL,
    ease_profile_snapshot JSONB NOT NULL,
    design_parameters JSONB NOT NULL,
    seam_allowance_default_mm NUMERIC NOT NULL DEFAULT 10.0,
    geometry_result JSONB NOT NULL,
    validation_results JSONB NOT NULL,
    generated_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.pattern_executions IS 'Snapshots inmutables de las ejecuciones del motor paramétrico de patronaje.';

CREATE INDEX IF NOT EXISTS idx_pattern_exec_client ON public.pattern_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_pattern_exec_session ON public.pattern_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_pattern_exec_parent ON public.pattern_executions(parent_execution_id);
CREATE INDEX IF NOT EXISTS idx_pattern_exec_status ON public.pattern_executions(status);

-- Trigger para updated_at en pattern_executions
DROP TRIGGER IF EXISTS set_pattern_executions_updated_at ON public.pattern_executions;
CREATE TRIGGER set_pattern_executions_updated_at
    BEFORE UPDATE ON public.pattern_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para garantizar la inmutabilidad de snapshots en pattern_executions:
-- Protege geometría, parámetros, medidas y autoría. Solo permite modificar status y notes.
CREATE OR REPLACE FUNCTION public.protect_pattern_execution_snapshot()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.session_id IS DISTINCT FROM OLD.session_id
       OR NEW.template_id IS DISTINCT FROM OLD.template_id
       OR NEW.parent_execution_id IS DISTINCT FROM OLD.parent_execution_id
       OR NEW.garment_type IS DISTINCT FROM OLD.garment_type
       OR NEW.version_label IS DISTINCT FROM OLD.version_label
       OR NEW.engine_version IS DISTINCT FROM OLD.engine_version
       OR NEW.measurement_snapshot IS DISTINCT FROM OLD.measurement_snapshot
       OR NEW.ease_profile_snapshot IS DISTINCT FROM OLD.ease_profile_snapshot
       OR NEW.design_parameters IS DISTINCT FROM OLD.design_parameters
       OR NEW.seam_allowance_default_mm IS DISTINCT FROM OLD.seam_allowance_default_mm
       OR NEW.geometry_result IS DISTINCT FROM OLD.geometry_result
       OR NEW.validation_results IS DISTINCT FROM OLD.validation_results
       OR NEW.generated_by IS DISTINCT FROM OLD.generated_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'Los snapshots técnicos de pattern_executions son inmutables. Solo se permite actualizar status y notes. Para modificar medidas o geometría genere una nueva versión derivada (parent_execution_id).';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pattern_execution_snapshot ON public.pattern_executions;
CREATE TRIGGER trg_protect_pattern_execution_snapshot
    BEFORE UPDATE ON public.pattern_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_pattern_execution_snapshot();

-- Trigger para verificar consistencia cliente-sesión-patrón y restringir generación desde borradores
CREATE OR REPLACE FUNCTION public.validate_pattern_execution_client_and_session()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    v_session_client_id UUID;
    v_session_status TEXT;
    v_parent_client_id UUID;
BEGIN
    -- 1. Validar correspondencia estricta entre client_id y session_id
    SELECT client_id, status
    INTO v_session_client_id, v_session_status
    FROM public.measurement_sessions
    WHERE id = NEW.session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La sesión de medición referenciada % no existe.', NEW.session_id;
    END IF;

    IF NEW.client_id IS DISTINCT FROM v_session_client_id THEN
        RAISE EXCEPTION 'Inconsistencia de titularidad: La sesión % pertenece a la clienta %, pero el patrón fue asignado a la clienta %.',
            NEW.session_id, v_session_client_id, NEW.client_id;
    END IF;

    -- 2. No se puede generar ni aprobar un patrón definitivo desde una sesión en borrador ('draft') o archivada ('archived')
    IF NEW.status IN ('generated', 'pending_fitting', 'approved_by_designer') AND v_session_status IN ('draft', 'archived') THEN
        RAISE EXCEPTION 'No se permite generar ni aprobar un patrón definitivo utilizando una sesión de medidas en estado "%". La sesión de medidas debe estar formalmente completada ("completed" o "verified").', v_session_status;
    END IF;

    -- 3. Si deriva de una versión previa (parent_execution_id), validar que pertenezca a la misma clienta
    IF NEW.parent_execution_id IS NOT NULL THEN
        SELECT client_id INTO v_parent_client_id
        FROM public.pattern_executions
        WHERE id = NEW.parent_execution_id;

        IF FOUND AND v_parent_client_id IS DISTINCT FROM NEW.client_id THEN
            RAISE EXCEPTION 'Inconsistencia de linaje: El patrón base o predecesor % pertenece a otra clienta.', NEW.parent_execution_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_pattern_execution_client_and_session ON public.pattern_executions;
CREATE TRIGGER trg_validate_pattern_execution_client_and_session
    BEFORE INSERT OR UPDATE ON public.pattern_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pattern_execution_client_and_session();

-- Trigger para validación explícita del patrón: exige objeto JSON auténtico, booleano JSON auténtico,
-- arreglos JSON estrictos en errors y missingRequiredMeasurements, coherencia técnica,
-- impide registro inicial directo como 'approved_by_designer' y valida medidas obligatorias contra el catálogo de plantillas.
CREATE OR REPLACE FUNCTION public.validate_pattern_execution_validation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    v_is_valid BOOLEAN;
    v_errors_count INT;
    v_missing_count INT;
    v_template_rec RECORD;
    v_req_meas TEXT[];
    v_req_code TEXT;
    v_key TEXT;
    v_val_json JSONB;
    v_snap_num NUMERIC;
    v_cat_scope TEXT;
    v_cat_laterality TEXT;
    v_cat_min NUMERIC;
    v_cat_max NUMERIC;
    v_matches_db BOOLEAN;
    v_matches_avg BOOLEAN;
    v_persisted_count INT;
BEGIN
    -- 1. Requiere que validation_results sea obligatoriamente un objeto JSON auténtico (no null, no primitivo)
    IF NEW.validation_results IS NULL OR pg_catalog.jsonb_typeof(NEW.validation_results) <> 'object' THEN
        RAISE EXCEPTION 'validation_results debe ser un objeto JSON válido (no null ni primitivo).';
    END IF;

    -- 2. Requiere que validation_results contenga explícitamente el campo 'valid' como booleano JSON auténtico
    IF NOT (NEW.validation_results ? 'valid') 
       OR pg_catalog.jsonb_typeof(NEW.validation_results->'valid') <> 'boolean' THEN
        RAISE EXCEPTION 'validation_results debe contener obligatoriamente el campo "valid" como un valor booleano JSON auténtico (true o false).';
    END IF;

    v_is_valid := (NEW.validation_results->>'valid')::BOOLEAN;

    -- 3. Validar tipo estricto de 'errors': si existe, debe ser un arreglo JSON auténtico (rechaza cadenas, números, objetos)
    IF NEW.validation_results ? 'errors' THEN
        IF pg_catalog.jsonb_typeof(NEW.validation_results->'errors') <> 'array' THEN
            RAISE EXCEPTION 'El campo "errors" en validation_results debe ser un arreglo JSON (recibido tipo: %).', pg_catalog.jsonb_typeof(NEW.validation_results->'errors');
        END IF;
        v_errors_count := pg_catalog.jsonb_array_length(NEW.validation_results->'errors');
    ELSE
        v_errors_count := 0;
    END IF;

    -- 4. Validar tipo estricto de 'missingRequiredMeasurements': si existe, debe ser un arreglo JSON auténtico (rechaza cadenas, números, objetos)
    IF NEW.validation_results ? 'missingRequiredMeasurements' THEN
        IF pg_catalog.jsonb_typeof(NEW.validation_results->'missingRequiredMeasurements') <> 'array' THEN
            RAISE EXCEPTION 'El campo "missingRequiredMeasurements" en validation_results debe ser un arreglo JSON (recibido tipo: %).', pg_catalog.jsonb_typeof(NEW.validation_results->'missingRequiredMeasurements');
        END IF;
        v_missing_count := pg_catalog.jsonb_array_length(NEW.validation_results->'missingRequiredMeasurements');
    ELSE
        v_missing_count := 0;
    END IF;

    -- 5. Rechazar resultados contradictorios: no se permite valid=true si hay errores o medidas obligatorias pendientes
    IF v_is_valid IS TRUE AND (v_errors_count > 0 OR v_missing_count > 0) THEN
        RAISE EXCEPTION 'Inconsistencia técnica: validation_results indica valid=true pero contiene % error(es) y % medida(s) obligatoria(s) faltante(s).', v_errors_count, v_missing_count;
    END IF;

    -- 6. Si la validación no es auténticamente válida, impedir que pase a 'generated', 'pending_fitting' o 'approved_by_designer'.
    -- El registro solo puede permanecer en 'draft' o 'needs_revision'.
    IF (v_is_valid IS NOT TRUE OR v_errors_count > 0 OR v_missing_count > 0) 
       AND NEW.status IN ('generated', 'pending_fitting', 'approved_by_designer') THEN
        RAISE EXCEPTION 'No se permite registrar un patrón en estado "%" cuando la validación del motor es inválida o presenta incidencias (% errores, % faltantes). El registro debe permanecer en "draft" o "needs_revision".', NEW.status, v_errors_count, v_missing_count;
    END IF;

    -- 7. Un patrón no puede registrarse directamente como 'approved_by_designer' en su creación inicial (INSERT).
    -- Debe ser generado previamente y someterse a pruebas de vestuario.
    IF TG_OP = 'INSERT' AND NEW.status = 'approved_by_designer' THEN
        RAISE EXCEPTION 'Aprobación técnica denegada: Un patrón no puede registrarse directamente como "approved_by_designer" en su creación inicial. Debe pasar por generación y prueba de vestuario.';
    END IF;

    -- 8. La aprobación formal por diseñadora exige validación verdadera, cero errores y ausencia de medidas obligatorias pendientes
    IF NEW.status = 'approved_by_designer' AND (v_is_valid IS NOT TRUE OR v_errors_count > 0 OR v_missing_count > 0) THEN
        RAISE EXCEPTION 'Aprobación técnica denegada: Un patrón solo puede aprobarse para corte si su validación geométrica es auténticamente válida, sin errores y sin medidas obligatorias pendientes.';
    END IF;

    -- 9. Transición de estado a 'approved_by_designer': en alta costura exige obligatoriamente haber pasado por prueba de vestuario ('pending_fitting')
    -- Se rechaza la aprobación directa desde 'generated', 'draft' o 'needs_revision'.
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved_by_designer' AND OLD.status <> 'pending_fitting' THEN
        RAISE EXCEPTION 'Transición de estado inválida: Un patrón solo puede aprobarse formalmente tras haber pasado por prueba de vestuario ("pending_fitting") (estado anterior: "%"). Envíe el patrón a prueba antes de la aprobación final.', OLD.status;
    END IF;

    -- 10. Validación y vinculación inmutable de la plantilla (template_id)
    IF NEW.template_id IS NOT NULL THEN
        SELECT id, garment_type, version, required_measurements
        INTO v_template_rec
        FROM public.pattern_templates
        WHERE id = NEW.template_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'La plantilla de patronaje especificada (template_id: %) no existe.', NEW.template_id;
        END IF;

        IF v_template_rec.garment_type IS DISTINCT FROM NEW.garment_type THEN
            RAISE EXCEPTION 'Inconsistencia de plantilla: La plantilla % corresponde a garment_type "%", pero la ejecución indica "%".',
                NEW.template_id, v_template_rec.garment_type, NEW.garment_type;
        END IF;

        v_req_meas := v_template_rec.required_measurements;
    ELSE
        -- Comportamiento explícito cuando template_id es NULL:
        -- Resolver de forma determinista la versión 1.0.0 correspondiente al garment_type
        SELECT id, garment_type, version, required_measurements
        INTO v_template_rec
        FROM public.pattern_templates
        WHERE garment_type = NEW.garment_type AND version = '1.0.0';

        IF NOT FOUND THEN
            SELECT id, garment_type, version, required_measurements
            INTO v_template_rec
            FROM public.pattern_templates
            WHERE garment_type = NEW.garment_type
            ORDER BY version ASC
            LIMIT 1;
        END IF;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No se encontró ninguna plantilla de patronaje registrada para el tipo de prenda "%".', NEW.garment_type;
        END IF;

        -- En INSERT, vincular permanentemente el template_id resuelto para proteger el linaje histórico
        NEW.template_id := v_template_rec.id;
        v_req_meas := v_template_rec.required_measurements;
    END IF;

    -- 11. Verificación técnica independiente en servidor:
    -- Para patrones en estado 'generated', 'pending_fitting' o 'approved_by_designer',
    -- la base de datos valida measurement_snapshot contra el catálogo y los registros persistidos de la sesión
    IF NEW.status IN ('generated', 'pending_fitting', 'approved_by_designer') THEN
        IF NEW.measurement_snapshot IS NULL OR pg_catalog.jsonb_typeof(NEW.measurement_snapshot) <> 'object' THEN
            RAISE EXCEPTION 'measurement_snapshot debe ser un objeto JSON válido con los valores de las medidas.';
        END IF;

        -- 11.1 Validar que TODOS los campos presentes en measurement_snapshot sean números JSON auténticos (rechaza cadenas numéricas)
        FOR v_key, v_val_json IN SELECT * FROM pg_catalog.jsonb_each(NEW.measurement_snapshot) LOOP
            IF pg_catalog.jsonb_typeof(v_val_json) <> 'number' THEN
                RAISE EXCEPTION 'El valor de la clave "%" en measurement_snapshot debe ser un número JSON auténtico (recibido tipo: %). No se aceptan cadenas numéricas.',
                    v_key, pg_catalog.jsonb_typeof(v_val_json);
            END IF;

            v_snap_num := (NEW.measurement_snapshot->>v_key)::NUMERIC;

            -- Si la clave está en el catálogo maestro, validar positividad y rangos biológicos/técnicos
            SELECT scope, laterality, min_value_mm, max_value_mm
            INTO v_cat_scope, v_cat_laterality, v_cat_min, v_cat_max
            FROM public.measurement_catalog
            WHERE code = v_key;

            IF FOUND THEN
                IF v_cat_scope = 'body' AND v_snap_num <= 0 THEN
                    RAISE EXCEPTION 'La medida corporal "%" en measurement_snapshot debe ser estrictamente positiva (recibido: % mm).', v_key, v_snap_num;
                ELSIF v_cat_scope = 'design_parameter' AND v_snap_num < 0 THEN
                    RAISE EXCEPTION 'El parámetro de diseño "%" en measurement_snapshot no puede ser negativo (recibido: % mm).', v_key, v_snap_num;
                END IF;

                IF v_snap_num < v_cat_min OR v_snap_num > v_cat_max THEN
                    RAISE EXCEPTION 'El valor % mm para "%" en measurement_snapshot está fuera del rango permitido [% mm, % mm].',
                        v_snap_num, v_key, v_cat_min, v_cat_max;
                END IF;
            END IF;
        END LOOP;

        -- 11.2 Validar correspondencia de las medidas obligatorias de la plantilla
        IF v_req_meas IS NOT NULL THEN
            FOREACH v_req_code IN ARRAY v_req_meas LOOP
                IF NOT (NEW.measurement_snapshot ? v_req_code) THEN
                    RAISE EXCEPTION 'Verificación técnica independiente fallida: Falta la medida obligatoria "%" requerida para la prenda "%" en measurement_snapshot.',
                        v_req_code, NEW.garment_type;
                END IF;

                IF pg_catalog.jsonb_typeof(NEW.measurement_snapshot->v_req_code) <> 'number' THEN
                    RAISE EXCEPTION 'La medida obligatoria "%" en measurement_snapshot debe ser un número JSON auténtico (recibido tipo: %).',
                        v_req_code, pg_catalog.jsonb_typeof(NEW.measurement_snapshot->v_req_code);
                END IF;

                v_snap_num := (NEW.measurement_snapshot->>v_req_code)::NUMERIC;

                -- Consultar alcance y lateralidad en catálogo maestro
                SELECT scope, laterality, min_value_mm, max_value_mm
                INTO v_cat_scope, v_cat_laterality, v_cat_min, v_cat_max
                FROM public.measurement_catalog
                WHERE code = v_req_code;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'La medida obligatoria "%" requerida por la plantilla no existe en el catálogo maestro.', v_req_code;
                END IF;

                -- Medidas corporales: deben estar persistidas en public.measurement_values para session_id y no contradecir los registros
                IF v_cat_scope = 'body' THEN
                    SELECT COUNT(*)
                    INTO v_persisted_count
                    FROM public.measurement_values
                    WHERE session_id = NEW.session_id
                      AND measurement_code = v_req_code;

                    IF v_persisted_count = 0 THEN
                        RAISE EXCEPTION 'Medida corporal obligatoria "%" ausente en los registros persistidos de la sesión %.',
                            v_req_code, NEW.session_id;
                    END IF;

                    -- Verificar coincidencia de valor (tolerancia ±0.5 mm por redondeo decimal)
                    SELECT pg_catalog.bool_or(pg_catalog.abs(v_snap_num - value_mm) <= 0.5)
                    INTO v_matches_db
                    FROM public.measurement_values
                    WHERE session_id = NEW.session_id
                      AND measurement_code = v_req_code;

                    -- Si la medida es bilateral y no coincide exactamente con un lado, comprobar si coincide con el promedio bilateral
                    IF v_matches_db IS NOT TRUE AND v_cat_laterality = 'bilateral' THEN
                        SELECT (COUNT(*) = 2 AND pg_catalog.abs(v_snap_num - pg_catalog.avg(value_mm)) <= 0.5)
                        INTO v_matches_avg
                        FROM public.measurement_values
                        WHERE session_id = NEW.session_id
                          AND measurement_code = v_req_code
                          AND side IN ('left', 'right');

                        IF v_matches_avg IS TRUE THEN
                            v_matches_db := TRUE;
                        END IF;
                    END IF;

                    IF v_matches_db IS NOT TRUE THEN
                        RAISE EXCEPTION 'El valor % mm en measurement_snapshot para la medida "%" contradice los registros persistidos en la sesión %.',
                            v_snap_num, v_req_code, NEW.session_id;
                    END IF;
                END IF;
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_pattern_execution_validation ON public.pattern_executions;
CREATE TRIGGER trg_validate_pattern_execution_validation
    BEFORE INSERT OR UPDATE ON public.pattern_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pattern_execution_validation();

-- 7. TABLA: Historial de Ajustes de Patronaje
CREATE TABLE IF NOT EXISTS public.pattern_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.pattern_executions(id) ON DELETE RESTRICT,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waist', 'shoulder', 'sleeve', 'length', 'crotch', 'bust_dart', 'custom')),
    target_piece TEXT NOT NULL,
    delta_mm NUMERIC NOT NULL,
    description TEXT NOT NULL,
    fitting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.pattern_adjustments IS 'Registro de modificaciones y correcciones observadas en pruebas de vestuario.';

CREATE INDEX IF NOT EXISTS idx_pattern_adj_execution ON public.pattern_adjustments(execution_id);

-- Trigger para proteger la autoría de pattern_adjustments
CREATE OR REPLACE FUNCTION public.protect_pattern_adjustment_authorship()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    IF NEW.recorded_by IS DISTINCT FROM OLD.recorded_by THEN
        RAISE EXCEPTION 'No está permitido alterar la autoría original (recorded_by) de un ajuste.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pattern_adjustment_authorship ON public.pattern_adjustments;
CREATE TRIGGER trg_protect_pattern_adjustment_authorship
    BEFORE UPDATE ON public.pattern_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_pattern_adjustment_authorship();

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS) Y PRIVILEGIOS DE FUNCIONES
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.measurement_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ease_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_adjustments ENABLE ROW LEVEL SECURITY;

-- Revocar accesos anónimos y públicos a las tablas
REVOKE ALL ON TABLE public.measurement_catalog FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.measurement_sessions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.measurement_values FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.ease_profiles FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.pattern_templates FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.pattern_executions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.pattern_adjustments FROM PUBLIC, anon;

-- Conceder permisos de tablas a usuarios autenticados (restringidos por políticas) y administradores/servicio
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.measurement_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.measurement_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.measurement_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ease_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pattern_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pattern_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pattern_adjustments TO authenticated;

GRANT ALL ON TABLE public.measurement_catalog TO service_role, postgres;
GRANT ALL ON TABLE public.measurement_sessions TO service_role, postgres;
GRANT ALL ON TABLE public.measurement_values TO service_role, postgres;
GRANT ALL ON TABLE public.ease_profiles TO service_role, postgres;
GRANT ALL ON TABLE public.pattern_templates TO service_role, postgres;
GRANT ALL ON TABLE public.pattern_executions TO service_role, postgres;
GRANT ALL ON TABLE public.pattern_adjustments TO service_role, postgres;

-- Revocar ejecución directa de funciones trigger SECURITY DEFINER a roles cliente (PUBLIC, anon, authenticated)
REVOKE ALL ON FUNCTION public.protect_measurement_session_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_finalized_session_deletion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_measurement_value() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_finalized_session_measurement_values() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_pattern_execution_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_pattern_execution_client_and_session() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_pattern_execution_validation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_pattern_adjustment_authorship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_referenced_pattern_template() FROM PUBLIC, anon, authenticated;

-- Conceder permisos de ejecución únicamente a los roles de infraestructura y servicio (propietario de migración)
GRANT EXECUTE ON FUNCTION public.protect_measurement_session_immutability() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.protect_finalized_session_deletion() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.validate_measurement_value() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.protect_finalized_session_measurement_values() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.protect_pattern_execution_snapshot() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.validate_pattern_execution_client_and_session() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.validate_pattern_execution_validation() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.protect_pattern_adjustment_authorship() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.protect_referenced_pattern_template() TO service_role, postgres;

-- 1. measurement_catalog: Lectura para diseñadora y admin; inserción/modificación para admin
DROP POLICY IF EXISTS "Catalog visible para admin y diseñadora" ON public.measurement_catalog;
CREATE POLICY "Catalog visible para admin y diseñadora"
    ON public.measurement_catalog FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Catalog editable por administradores" ON public.measurement_catalog;
CREATE POLICY "Catalog editable por administradores"
    ON public.measurement_catalog FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. measurement_sessions: Gestión completa para admin y diseñadora
DROP POLICY IF EXISTS "Sesiones visibles para diseñadora y admin" ON public.measurement_sessions;
CREATE POLICY "Sesiones visibles para diseñadora y admin"
    ON public.measurement_sessions FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden crear sesiones" ON public.measurement_sessions;
CREATE POLICY "Diseñadora y admin pueden crear sesiones"
    ON public.measurement_sessions FOR INSERT
    TO authenticated WITH CHECK (
        public.is_admin_or_designer()
        AND taken_by = auth.uid()
    );

DROP POLICY IF EXISTS "Diseñadora y admin pueden actualizar sesiones" ON public.measurement_sessions;
CREATE POLICY "Diseñadora y admin pueden actualizar sesiones"
    ON public.measurement_sessions FOR UPDATE
    TO authenticated USING (public.is_admin_or_designer()) WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Solo administradores pueden eliminar sesiones" ON public.measurement_sessions;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar sesiones en borrador" ON public.measurement_sessions;
CREATE POLICY "Solo administradores pueden eliminar sesiones en borrador"
    ON public.measurement_sessions FOR DELETE
    TO authenticated USING (
        public.is_admin()
        AND status = 'draft'
    );

-- 3. measurement_values: Acceso completo para admin y diseñadora condicionado a inmutabilidad de sesión
DROP POLICY IF EXISTS "Valores visibles para diseñadora y admin" ON public.measurement_values;
CREATE POLICY "Valores visibles para diseñadora y admin"
    ON public.measurement_values FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden registrar valores" ON public.measurement_values;
CREATE POLICY "Diseñadora y admin pueden registrar valores"
    ON public.measurement_values FOR INSERT
    TO authenticated WITH CHECK (
        public.is_admin_or_designer()
        AND EXISTS (
            SELECT 1 FROM public.measurement_sessions s
            WHERE s.id = measurement_values.session_id AND s.status = 'draft'
        )
    );

DROP POLICY IF EXISTS "Diseñadora y admin pueden modificar valores" ON public.measurement_values;
DROP POLICY IF EXISTS "Diseñadora y admin pueden modificar valores de sesiones en borrador" ON public.measurement_values;
CREATE POLICY "Diseñadora y admin pueden modificar valores de sesiones en borrador"
    ON public.measurement_values FOR UPDATE
    TO authenticated USING (
        public.is_admin_or_designer()
        AND EXISTS (
            SELECT 1 FROM public.measurement_sessions s
            WHERE s.id = measurement_values.session_id AND s.status = 'draft'
        )
    ) WITH CHECK (
        public.is_admin_or_designer()
        AND EXISTS (
            SELECT 1 FROM public.measurement_sessions s
            WHERE s.id = measurement_values.session_id AND s.status = 'draft'
        )
    );

DROP POLICY IF EXISTS "Solo admin puede eliminar valores" ON public.measurement_values;
DROP POLICY IF EXISTS "Solo admin puede eliminar valores de sesiones en borrador" ON public.measurement_values;
CREATE POLICY "Solo admin puede eliminar valores de sesiones en borrador"
    ON public.measurement_values FOR DELETE
    TO authenticated USING (
        public.is_admin()
        AND EXISTS (
            SELECT 1 FROM public.measurement_sessions s
            WHERE s.id = measurement_values.session_id AND s.status = 'draft'
        )
    );

-- 4. ease_profiles: Lectura para diseñadora y admin; inserción/modificación/eliminación exclusivamente para administradores
DROP POLICY IF EXISTS "Perfiles holgura visibles" ON public.ease_profiles;
DROP POLICY IF EXISTS "Perfiles visibles para diseñadora y admin" ON public.ease_profiles;
CREATE POLICY "Perfiles holgura visibles"
    ON public.ease_profiles FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Perfiles holgura gestionables" ON public.ease_profiles;
DROP POLICY IF EXISTS "Perfiles editables por diseñadora y admin" ON public.ease_profiles;
DROP POLICY IF EXISTS "Perfiles editables por administradores" ON public.ease_profiles;
CREATE POLICY "Perfiles editables por administradores"
    ON public.ease_profiles FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. pattern_templates: Lectura para ambos
DROP POLICY IF EXISTS "Plantillas visibles" ON public.pattern_templates;
CREATE POLICY "Plantillas visibles"
    ON public.pattern_templates FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Plantillas editables por admin" ON public.pattern_templates;
CREATE POLICY "Plantillas editables por admin"
    ON public.pattern_templates FOR ALL
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. pattern_executions: Snapshots inmutables
DROP POLICY IF EXISTS "Ejecuciones visibles para admin y diseñadora" ON public.pattern_executions;
CREATE POLICY "Ejecuciones visibles para admin y diseñadora"
    ON public.pattern_executions FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden guardar ejecuciones" ON public.pattern_executions;
CREATE POLICY "Diseñadora y admin pueden guardar ejecuciones"
    ON public.pattern_executions FOR INSERT
    TO authenticated WITH CHECK (
        public.is_admin_or_designer()
        AND generated_by = auth.uid()
    );

DROP POLICY IF EXISTS "Diseñadora y admin pueden actualizar estado de ejecuciones" ON public.pattern_executions;
CREATE POLICY "Diseñadora y admin pueden actualizar estado de ejecuciones"
    ON public.pattern_executions FOR UPDATE
    TO authenticated USING (public.is_admin_or_designer()) WITH CHECK (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Solo admin puede eliminar ejecuciones" ON public.pattern_executions;
CREATE POLICY "Solo admin puede eliminar ejecuciones"
    ON public.pattern_executions FOR DELETE
    TO authenticated USING (public.is_admin());

-- 7. pattern_adjustments:
DROP POLICY IF EXISTS "Ajustes visibles para admin y diseñadora" ON public.pattern_adjustments;
CREATE POLICY "Ajustes visibles para admin y diseñadora"
    ON public.pattern_adjustments FOR SELECT
    TO authenticated USING (public.is_admin_or_designer());

DROP POLICY IF EXISTS "Diseñadora y admin pueden registrar ajustes" ON public.pattern_adjustments;
CREATE POLICY "Diseñadora y admin pueden registrar ajustes"
    ON public.pattern_adjustments FOR INSERT
    TO authenticated WITH CHECK (
        public.is_admin_or_designer()
        AND recorded_by = auth.uid()
    );

-- ==============================================================================
-- DATOS SEMILLA (SEED DATA)
-- ==============================================================================

-- Semilla de Perfiles de Holgura Iniciales
INSERT INTO public.ease_profiles (code, name, description, ease_values, is_default)
VALUES
    ('fitted', 'Entallado Alta Costura', 'Holgura mínima para prendas ceñidas y corsetería estructurada.', '{"bust": 25, "waist": 15, "hip": 25, "biceps": 25, "crotch": 15, "wrist": 20}', FALSE),
    ('regular', 'Clásico Atelier (Recomendado)', 'Holgura estándar de confort y elegancia para siluetas de alta costura.', '{"bust": 45, "waist": 25, "hip": 45, "biceps": 40, "crotch": 25, "wrist": 30}', TRUE),
    ('relaxed', 'Holgado Fluido', 'Holgura generosa para caídas suaves, sedas y prendas de fiesta vaporosas.', '{"bust": 75, "waist": 50, "hip": 75, "biceps": 60, "crotch": 40, "wrist": 40}', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Semilla de Plantillas Base de Patronaje
INSERT INTO public.pattern_templates (garment_type, name, version, description, method_reference, required_measurements, optional_measurements, default_ease_profile_code)
VALUES
    ('bodice', 'Corpiño Base de Alta Costura', '1.0.0', 'Bloque base delantero y espalda con pinzas de busto y cintura.', 'Método clásico de patronaje a medida (Aldrich & Gilewska modificado)', ARRAY['contorno_busto', 'contorno_cintura', 'ancho_espalda', 'ancho_pecho', 'largo_talle_delantero', 'largo_talle_espalda', 'altura_busto', 'separacion_busto', 'ancho_hombros', 'profundidad_sisa'], ARRAY['contorno_cuello', 'largo_hombro'], 'regular'),
    ('sleeve', 'Manga Sastre Enlazada', '1.0.0', 'Manga anatómica con copa adaptada al perímetro real de la sisa del corpiño.', 'Cálculo geométrico de copa con embebido proporcional de 20-30 mm', ARRAY['largo_brazo', 'contorno_biceps', 'contorno_muneca'], ARRAY['distancia_hombro_codo', 'contorno_codo_flexionado'], 'regular'),
    ('skirt', 'Falda Base y Transformación Línea A', '1.0.0', 'Falda de dos piezas con control de pinzas lumbares y distribución de volumen.', 'Proporción cintura-cadera de alta costura con desahogo anatómico', ARRAY['contorno_cintura', 'contorno_cadera', 'profundidad_cintura_cadera', 'largo_falda'], ARRAY['contorno_cadera_alta'], 'regular'),
    ('pants', 'Pantalón Sastre Femenino', '1.0.0', 'Pantalón clásico con línea de aplomo, tiro anatómico y entrepierna.', 'Trazado clásico de tiro con compensación glútea y holgura de movimiento', ARRAY['contorno_cintura', 'contorno_cadera', 'profundidad_tiro', 'largo_exterior_pierna', 'largo_entrepierna', 'contorno_muslo', 'contorno_rodilla', 'contorno_tobillo'], ARRAY['contorno_pantorrilla'], 'regular'),
    ('dress', 'Vestido Atelier Compuesto', '1.0.0', 'Vestido integrado con corpiño y falda unidos con alineación de cintura.', 'Composición armónica de bloques con preservación de aplomos', ARRAY['contorno_busto', 'contorno_cintura', 'contorno_cadera', 'largo_talle_delantero', 'largo_talle_espalda', 'altura_busto', 'separacion_busto', 'ancho_espalda', 'profundidad_cintura_cadera', 'largo_falda'], ARRAY['ancho_hombros', 'largo_brazo', 'contorno_biceps'], 'regular'),
    ('blouse', 'Blusa Fluida Derivada', '1.0.0', 'Blusa liviana con desahogo ampliado en busto y sisa holgada.', 'Derivación del corpiño base con desahogo fluido', ARRAY['contorno_busto', 'contorno_cintura', 'largo_talle_delantero', 'largo_talle_espalda', 'ancho_espalda', 'largo_blusa'], ARRAY['contorno_cadera'], 'relaxed')
ON CONFLICT (garment_type, version) DO NOTHING;

-- Semilla de Catálogo Maestro de Medidas (37 Medidas Estandarizadas con Lateralidad Anatómica)
INSERT INTO public.measurement_catalog (code, name, category, scope, default_unit, precision_step, min_value_mm, max_value_mm, instructions, anatomical_landmarks, laterality, is_calculated, formula_expression, dependencies, block_usage)
VALUES
    -- A. Identificación corporal y torso
    ('estatura', 'Estatura Total', 'torso_body', 'body', 'cm', 0.5, 1200, 2200, 'Medir descalza desde la coronilla hasta el suelo en posición erguida.', 'Vértice de la cabeza a superficie del suelo.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'pants', 'dress']),
    ('contorno_cuello', 'Contorno de Cuello', 'torso_body', 'body', 'cm', 0.5, 280, 500, 'Medir alrededor de la base del cuello pasando sobre la séptima vértebra cervical.', 'Base del cuello y horquilla esternal.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'blouse']),
    ('contorno_alto_busto', 'Contorno Alto de Busto', 'torso_body', 'body', 'cm', 0.5, 650, 1500, 'Medir por encima del busto pasando justo por debajo de las axilas y recto en la espalda.', 'Pliegues axilares anteriores y posteriores.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress']),
    ('contorno_busto', 'Contorno de Busto', 'torso_body', 'body', 'cm', 0.5, 700, 1600, 'Medir horizontalmente sobre la parte más prominente del busto con cinta nivelada.', 'Crestas de ambos pezones y omóplatos.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress', 'blouse']),
    ('contorno_bajo_busto', 'Contorno Bajo Busto', 'torso_body', 'body', 'cm', 0.5, 600, 1400, 'Medir directamente debajo del pliegue inframamario, ajustado pero confortable.', 'Surco inframamario.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress']),
    ('contorno_cintura', 'Contorno de Cintura', 'torso_body', 'body', 'cm', 0.5, 500, 1400, 'Medir sobre la cintura natural más estrecha, generalmente sobre el ombligo.', 'Depresión natural lateral entre costillas y cresta ilíaca.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'skirt', 'pants', 'dress', 'blouse']),
    ('contorno_cadera_alta', 'Contorno de Cadera Alta', 'torso_body', 'body', 'cm', 0.5, 650, 1600, 'Medir alrededor de los huesos de las caderas, aproximadamente a 10 cm bajo la cintura.', 'Espinas ilíacas anterosuperiores.', 'none', FALSE, NULL, '{}', ARRAY['skirt', 'pants', 'dress']),
    ('contorno_cadera', 'Contorno de Cadera', 'torso_body', 'body', 'cm', 0.5, 750, 1800, 'Medir en la parte más prominente de los glúteos manteniendo la cinta horizontal.', 'Máxima prominencia trocantérica y glútea.', 'none', FALSE, NULL, '{}', ARRAY['skirt', 'pants', 'dress']),
    ('profundidad_cintura_cadera', 'Profundidad Cintura-Cadera', 'torso_body', 'body', 'cm', 0.5, 140, 280, 'Distancia vertical por el costado desde la cintura natural hasta la línea de cadera máxima.', 'Costado: cinta de cintura a nivel trocantérico.', 'none', FALSE, NULL, '{}', ARRAY['skirt', 'dress']),
    ('ancho_hombros', 'Ancho de Hombros', 'torso_body', 'body', 'cm', 0.5, 300, 550, 'Distancia de acromion a acromion a través de la espalda.', 'Puntos acromiales derecho e izquierdo.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'blouse', 'dress']),
    ('largo_hombro', 'Largo de Hombro', 'torso_body', 'body', 'cm', 0.5, 80, 200, 'Desde la base lateral del cuello hasta el punto extremo del hueso acromion.', 'Base del cuello hasta acromion.', 'bilateral', FALSE, NULL, '{}', ARRAY['bodice', 'blouse']),
    ('ancho_pecho', 'Ancho de Pecho', 'torso_body', 'body', 'cm', 0.5, 260, 500, 'Distancia horizontal entre los pliegues axilares anteriores a través del pecho.', 'Pliegues axilares anteriores sobre el busto.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'blouse']),
    ('ancho_espalda', 'Ancho de Espalda', 'torso_body', 'body', 'cm', 0.5, 280, 550, 'Distancia horizontal entre los pliegues axilares posteriores sobre los omóplatos.', 'Pliegues axilares posteriores.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'blouse', 'dress']),
    ('largo_talle_delantero', 'Largo de Talle Delantero', 'torso_body', 'body', 'cm', 0.5, 350, 600, 'Desde el punto de unión cuello-hombro pasando sobre el pezón hasta la cintura.', 'Unión cuello-hombro a cinta en cintura delantera.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress', 'blouse']),
    ('largo_talle_espalda', 'Largo de Talle Espalda', 'torso_body', 'body', 'cm', 0.5, 330, 550, 'Desde la séptima vértebra cervical por el centro de la espalda hasta la cintura.', 'C7 a centro de cinta en cintura trasera.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress', 'blouse']),
    ('altura_busto', 'Altura de Busto', 'torso_body', 'body', 'cm', 0.5, 200, 400, 'Desde el punto de unión cuello-hombro hasta la punta o cresta del pezón.', 'Unión cuello-hombro hasta vértice mamario.', 'bilateral', FALSE, NULL, '{}', ARRAY['bodice', 'dress']),
    ('separacion_busto', 'Separación de Puntos de Busto', 'torso_body', 'body', 'cm', 0.5, 140, 280, 'Distancia horizontal directa entre los vértices de ambos pezones.', 'Ápex mamario izquierdo a ápex mamario derecho.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress']),
    ('profundidad_sisa', 'Profundidad de Sisa', 'torso_body', 'body', 'cm', 0.5, 160, 300, 'Distancia vertical desde la base del cuello posterior (C7) hasta el nivel axilar.', 'C7 vertical hasta regla bajo la axila.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'blouse', 'dress']),

    -- B. Brazos y mangas (con lateralidad bilateral para ajuste asimétrico de alta costura)
    ('largo_brazo', 'Largo de Brazo', 'arms_sleeves', 'body', 'cm', 0.5, 450, 750, 'Con brazo ligeramente flexionado, desde acromion pasando por codo hasta la muñeca.', 'Acromion a apófisis estiloides cubital.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve', 'dress']),
    ('largo_brazo_flexionado', 'Largo Brazo Flexionado', 'arms_sleeves', 'body', 'cm', 0.5, 480, 800, 'Con brazo en ángulo de 90 grados, acromion pasando por vértice de codo a muñeca.', 'Acromion pasando sobre olecranon hasta muñeca.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve']),
    ('distancia_hombro_codo', 'Distancia Hombro-Codo', 'arms_sleeves', 'body', 'cm', 0.5, 250, 450, 'Desde acromion hasta el hueso del codo (olecranon).', 'Acromion hasta olecranon.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve']),
    ('contorno_biceps', 'Contorno de Bíceps', 'arms_sleeves', 'body', 'cm', 0.5, 200, 550, 'Alrededor de la parte más ancha del brazo con el músculo relajado.', 'Vientre muscular del bíceps braquial.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve', 'dress']),
    ('contorno_codo_flexionado', 'Contorno de Codo Flexionado', 'arms_sleeves', 'body', 'cm', 0.5, 180, 420, 'Alrededor del codo flexionado en 90 grados.', 'Sobre el olécranon y flexura del codo.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve']),
    ('contorno_antebrazo', 'Contorno de Antebrazo', 'arms_sleeves', 'body', 'cm', 0.5, 160, 400, 'Alrededor de la parte más gruesa del antebrazo bajo el codo.', 'Músculos extensores y flexores del antebrazo.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve']),
    ('contorno_muneca', 'Contorno de Muñeca', 'arms_sleeves', 'body', 'cm', 0.5, 120, 260, 'Alrededor de la articulación de la muñeca sobre los huesos prominentes.', 'Sobre apófisis estiloides del radio y cúbito.', 'bilateral', FALSE, NULL, '{}', ARRAY['sleeve']),

    -- C. Piernas y pantalón (con lateralidad bilateral para compensación ortostática de alta costura)
    ('profundidad_tiro', 'Profundidad Corporal de Tiro', 'legs_pants', 'body', 'cm', 0.5, 200, 380, 'Sentada en silla rígida plana, distancia vertical desde la cintura hasta la superficie del asiento.', 'Cintura lateral hasta superficie de asiento firme.', 'none', FALSE, NULL, '{}', ARRAY['pants']),
    ('largo_entrepierna', 'Largo de Entrepierna', 'legs_pants', 'body', 'cm', 0.5, 600, 950, 'Por el interior de la pierna desde la ingle hasta el suelo descalza.', 'Sínfisis púbica/periné hasta suelo.', 'bilateral', FALSE, NULL, '{}', ARRAY['pants']),
    ('largo_exterior_pierna', 'Largo Exterior de Pierna', 'legs_pants', 'body', 'cm', 0.5, 850, 1300, 'Por el costado desde la cintura natural hasta el suelo.', 'Cintura lateral sobre cadera hasta suelo.', 'bilateral', FALSE, NULL, '{}', ARRAY['pants']),
    ('contorno_muslo', 'Contorno de Muslo', 'legs_pants', 'body', 'cm', 0.5, 380, 900, 'Alrededor de la parte más gruesa del muslo justo debajo del pliegue glúteo.', 'Subtrocantérico inmediatamente bajo glúteo.', 'bilateral', FALSE, NULL, '{}', ARRAY['pants']),
    ('contorno_rodilla', 'Contorno de Rodilla', 'legs_pants', 'body', 'cm', 0.5, 260, 550, 'Alrededor de la rótula con pierna recta y relajada.', 'Centro de la rótula y fosa poplítea.', 'bilateral', FALSE, NULL, '{}', ARRAY['pants']),
    ('contorno_pantorrilla', 'Contorno de Pantorrilla', 'legs_pants', 'body', 'cm', 0.5, 240, 520, 'Alrededor de la máxima protuberancia de los gemelos.', 'Vientre muscular de los gemelos.', 'bilateral', FALSE, NULL, '{}', ARRAY['pants']),
    ('contorno_tobillo', 'Contorno de Tobillo', 'legs_pants', 'body', 'cm', 0.5, 160, 360, 'Alrededor de la articulación del tobillo sobre los maléolos.', 'Sobre maléolos tibial y peroneo.', 'bilateral', FALSE, NULL, '{}', ARRAY['pants']),

    -- D. Medidas adicionales para ajuste
    ('inclinacion_hombros', 'Inclinación de Hombros', 'fit_adjustment', 'body', 'cm', 0.2, 10, 60, 'Caída vertical del hombro desde la base del cuello hasta el acromion.', 'Proyección vertical base cuello a acromion.', 'bilateral', FALSE, NULL, '{}', ARRAY['bodice']),

    -- E. Medidas de diseño y prenda
    ('largo_falda', 'Largo de Falda de Diseño', 'garment_design', 'design_parameter', 'cm', 1.0, 300, 1200, 'Largo deseado desde la cintura hasta el bajo de la falda.', 'Cintura al borde inferior deseado.', 'none', FALSE, NULL, '{}', ARRAY['skirt', 'dress']),
    ('largo_blusa', 'Largo de Blusa', 'garment_design', 'design_parameter', 'cm', 1.0, 400, 800, 'Largo deseado desde el hombro hasta el bajo de la blusa.', 'Hombro a borde de blusa.', 'none', FALSE, NULL, '{}', ARRAY['blouse']),
    ('profundidad_escote_diseno', 'Profundidad de Escote', 'garment_design', 'design_parameter', 'cm', 0.5, 0, 300, 'Profundidad adicional deseada respecto a la base del cuello.', 'Horquilla esternal hacia abajo.', 'none', FALSE, NULL, '{}', ARRAY['bodice', 'dress', 'blouse']),
    ('ancho_bajo_pantalon', 'Ancho de Bajo de Pantalón', 'garment_design', 'design_parameter', 'cm', 0.5, 200, 600, 'Contorno deseado para el dobladillo final del pantalón.', 'Bajo terminado de botamanga.', 'none', FALSE, NULL, '{}', ARRAY['pants'])
ON CONFLICT (code) DO NOTHING;

COMMIT;
