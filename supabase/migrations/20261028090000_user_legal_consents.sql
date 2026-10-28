-- ==============================================================================
-- ATELIER DIGITAL · BY KATHERINE CARROLL
-- MIGRACIÓN: TRAZABILIDAD DE CONSENTIMIENTOS LEGALES, PRIVACIDAD Y MAYORÍA DE EDAD
-- Archivo: supabase/migrations/20261028090000_user_legal_consents.sql
-- ==============================================================================
-- Propósito:
-- 1. Crear la tabla no destructiva `public.user_legal_consents` para conservar
--    la prueba y trazabilidad de la autorización de tratamiento de datos personales
--    (Ley 1581 de 2012 / Decreto 1074 de 2015), aceptación de Términos y Condiciones,
--    declaración de mayoría de edad (+18 años, Ley 27 de 1977) y consentimiento
--    comercial opcional separado.
-- 2. Habilitar Row Level Security (RLS) con principio de mínimo privilegio:
--    los usuarios autenticados pueden consultar e insertar sus propios registros
--    de consentimiento, pero NO pueden modificar ni eliminar registros históricos
--    (bitácora de auditoría inmutable).
-- 3. Extender de manera retrocompatible `public.handle_new_user()` para que al
--    registrarse un usuario en `auth.users`, además de crear su perfil en
--    `public.profiles`, registre automáticamente los consentimientos iniciales
--    enviados en `raw_user_meta_data` (incluso cuando la confirmación de correo
--    esté pendiente).
-- ==============================================================================

BEGIN;

-- 1. Tabla de trazabilidad de consentimientos legales
CREATE TABLE IF NOT EXISTS public.user_legal_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (
        consent_type IN (
            'TERMS_OF_SERVICE',
            'PRIVACY_POLICY',
            'AGE_CONFIRMATION',
            'MARKETING_OPT_IN'
        )
    ),
    document_version TEXT NOT NULL DEFAULT '1.0',
    status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'revoked')),
    ip_address TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    revoked_at TIMESTAMPTZ
);

COMMENT ON TABLE public.user_legal_consents IS 'Bitácora auditable de consentimientos legales, privacidad (Ley 1581/2012) y confirmación de mayoría de edad (+18) en Atelier Digital.';
COMMENT ON COLUMN public.user_legal_consents.consent_type IS 'Tipo de consentimiento: TERMS_OF_SERVICE, PRIVACY_POLICY, AGE_CONFIRMATION o MARKETING_OPT_IN.';
COMMENT ON COLUMN public.user_legal_consents.document_version IS 'Versión del documento legal aceptado por el titular.';

-- 2. Índices para consultas por titular y auditoría cronológica
CREATE INDEX IF NOT EXISTS idx_user_legal_consents_user_type
    ON public.user_legal_consents(user_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_user_legal_consents_accepted_at
    ON public.user_legal_consents(accepted_at DESC);

-- 3. Habilitación obligatoria de Row Level Security (RLS)
ALTER TABLE public.user_legal_consents ENABLE ROW LEVEL SECURITY;

-- 4. Privilegios explícitos (defensa en profundidad: bitácora inmutable para clientes)
REVOKE ALL ON TABLE public.user_legal_consents FROM PUBLIC;
REVOKE ALL ON TABLE public.user_legal_consents FROM anon;

-- El rol authenticated solo puede consultar e insertar nuevos eventos de consentimiento
GRANT SELECT, INSERT ON TABLE public.user_legal_consents TO authenticated;
GRANT ALL ON TABLE public.user_legal_consents TO service_role, postgres;

-- 5. Políticas RLS para public.user_legal_consents
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios consentimientos" ON public.user_legal_consents;
DROP POLICY IF EXISTS "Administración y diseñadora pueden auditar consentimientos" ON public.user_legal_consents;
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios consentimientos" ON public.user_legal_consents;

CREATE POLICY "Los usuarios pueden ver sus propios consentimientos"
    ON public.user_legal_consents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Administración y diseñadora pueden auditar consentimientos"
    ON public.user_legal_consents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'designer')
        )
    );

CREATE POLICY "Los usuarios pueden insertar sus propios consentimientos"
    ON public.user_legal_consents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 6. Extensión retrocompatible del trigger handle_new_user()
-- Crea el perfil en public.profiles (rol 'client' forzoso) y, si vienen metadatos
-- de consentimiento desde el formulario de registro, inserta la trazabilidad inicial.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_name TEXT;
    v_terms_version TEXT;
    v_privacy_version TEXT;
    v_user_agent TEXT;
    v_age_confirmed BOOLEAN;
    v_terms_accepted BOOLEAN;
    v_privacy_accepted BOOLEAN;
    v_marketing_opt_in BOOLEAN;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        pg_catalog.split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, full_name, role, email)
    VALUES (
        NEW.id,
        user_name,
        'client',
        NEW.email
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = CASE
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = ''
            THEN EXCLUDED.full_name
            ELSE public.profiles.full_name
        END;

    -- Extracción segura de metadatos de consentimiento legal
    v_terms_version := COALESCE(NEW.raw_user_meta_data->>'terms_version', '1.0');
    v_privacy_version := COALESCE(NEW.raw_user_meta_data->>'privacy_version', '1.0');
    v_user_agent := NEW.raw_user_meta_data->>'user_agent';

    v_age_confirmed := COALESCE((NEW.raw_user_meta_data->>'age_confirmed')::boolean, false);
    v_terms_accepted := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false);
    v_privacy_accepted := COALESCE((NEW.raw_user_meta_data->>'privacy_accepted')::boolean, false);
    v_marketing_opt_in := COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean, false);

    IF v_age_confirmed THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, user_agent
        ) VALUES (
            NEW.id, 'AGE_CONFIRMATION', '1.0', 'granted', v_user_agent
        );
    END IF;

    IF v_terms_accepted THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, user_agent
        ) VALUES (
            NEW.id, 'TERMS_OF_SERVICE', v_terms_version, 'granted', v_user_agent
        );
    END IF;

    IF v_privacy_accepted THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, user_agent
        ) VALUES (
            NEW.id, 'PRIVACY_POLICY', v_privacy_version, 'granted', v_user_agent
        );
    END IF;

    IF v_marketing_opt_in THEN
        INSERT INTO public.user_legal_consents (
            user_id, consent_type, document_version, status, user_agent
        ) VALUES (
            NEW.id, 'MARKETING_OPT_IN', '1.0', 'granted', v_user_agent
        );
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin';
    END IF;
END;
$$;

COMMIT;

