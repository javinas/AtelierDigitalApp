-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO CENTRALIZADO DE COMUNICACIONES (SMTP ZIMBRA)
-- Archivo: supabase/migrations/20261123120000_atelier_communications_email.sql
-- ==============================================================================
-- Alcance (Etapa B — Implementación Local, sin cambios en tablas M00–M09):
-- 1. Crea public.atelier_email_accounts para administrar 5 propósitos canónicos:
--    portal_invitations, commercial_quotes, agenda_reminders, contact_support,
--    billing_notifications (inactiva y sin cuenta emisora hasta definirla).
-- 2. Crea public.atelier_email_logs con 7 estados explícitos de entrega
--    (queued, sending, smtp_accepted, delivered, bounced, failed, delivery_unknown).
-- 3. Integra Supabase Vault (supabase_vault v0.3.1) mediante 3 RPCs privados
--    SECURITY DEFINER exclusivos para service_role (cero contraseñas en texto plano).
-- 4. Aplica RLS restrictivo (public.is_admin()) y protección anti-manipulación en logs.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- FASE 0: PREFLIGHT DE DEPENDENCIAS (supabase_vault + public.is_admin)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'supabase_vault'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la extensión supabase_vault no está instalada.'
            USING ERRCODE = '0A000';
    END IF;

    IF to_regprocedure('public.is_admin()') IS NULL THEN
        RAISE EXCEPTION 'Preflight fallido: la función public.is_admin() no existe.'
            USING ERRCODE = '42883';
    END IF;

    IF to_regprocedure('public.handle_updated_at()') IS NULL THEN
        RAISE EXCEPTION 'Preflight fallido: la función public.handle_updated_at() no existe.'
            USING ERRCODE = '42883';
    END IF;
END;
$$;

-- ==============================================================================
-- FASE 1: TABLA public.atelier_email_accounts
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.atelier_email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose TEXT NOT NULL UNIQUE
        CONSTRAINT chk_aea_purpose CHECK (
            purpose IN (
                'portal_invitations',
                'commercial_quotes',
                'agenda_reminders',
                'contact_support',
                'billing_notifications'
            )
        ),
    display_name TEXT NOT NULL
        CONSTRAINT chk_aea_display_name CHECK (
            char_length(btrim(display_name)) >= 2
            AND display_name !~ E'[\\r\\n]'
        ),
    from_email TEXT NULL
        CONSTRAINT chk_aea_from_email CHECK (
            from_email IS NULL
            OR (
                from_email !~ E'[\\r\\n]'
                AND from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            )
        ),
    reply_to_email TEXT NULL
        CONSTRAINT chk_aea_reply_to_email CHECK (
            reply_to_email IS NULL
            OR (
                reply_to_email !~ E'[\\r\\n]'
                AND reply_to_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            )
        ),
    smtp_host TEXT NOT NULL DEFAULT 'mail.itss-proactive.com'
        CONSTRAINT chk_aea_smtp_host CHECK (
            char_length(btrim(smtp_host)) >= 4
            AND smtp_host !~ E'[\\r\\n\\s]'
        ),
    smtp_port INT NOT NULL DEFAULT 465
        CONSTRAINT chk_aea_smtp_port CHECK (smtp_port = 465),
    smtp_secure BOOLEAN NOT NULL DEFAULT true
        CONSTRAINT chk_aea_smtp_secure CHECK (smtp_secure = true),
    smtp_user TEXT NULL
        CONSTRAINT chk_aea_smtp_user CHECK (
            smtp_user IS NULL
            OR (
                smtp_user !~ E'[\\r\\n]'
                AND smtp_user ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            )
        ),
    vault_secret_id UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    last_verified_at TIMESTAMPTZ NULL,
    last_verification_status TEXT NOT NULL DEFAULT 'untested'
        CONSTRAINT chk_aea_verification_status CHECK (
            last_verification_status IN ('untested', 'verified', 'failed')
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_aea_active_requires_complete_config CHECK (
        NOT is_active
        OR (
            from_email IS NOT NULL
            AND smtp_user IS NOT NULL
            AND vault_secret_id IS NOT NULL
        )
    )
);

COMMENT ON TABLE public.atelier_email_accounts IS
    'Configuración centralizada de cuentas SMTP Zimbra por propósito en Atelier Digital. Las contraseñas residen exclusivamente cifradas en Supabase Vault (vault_secret_id).';
COMMENT ON COLUMN public.atelier_email_accounts.vault_secret_id IS
    'Referencia UUID a vault.secrets.id; jamás se almacenan contraseñas en texto plano en esta tabla.';

DROP TRIGGER IF EXISTS set_atelier_email_accounts_updated_at ON public.atelier_email_accounts;
CREATE TRIGGER set_atelier_email_accounts_updated_at
    BEFORE UPDATE ON public.atelier_email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Semilla idempotente de los 5 propósitos iniciales (todos nacen inactivos y sin credencial)
INSERT INTO public.atelier_email_accounts (
    purpose,
    display_name,
    from_email,
    reply_to_email,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_user,
    vault_secret_id,
    is_active,
    last_verification_status
)
VALUES
    (
        'portal_invitations',
        'Atelier Katherine Carroll',
        'invitaciones@bykatherinecarroll.com',
        'info@bykatherinecarroll.com',
        'mail.itss-proactive.com',
        465,
        true,
        'invitaciones@bykatherinecarroll.com',
        NULL,
        false,
        'untested'
    ),
    (
        'commercial_quotes',
        'Atelier Katherine Carroll · Gerencia',
        'gerente@bykatherinecarroll.com',
        'gerente@bykatherinecarroll.com',
        'mail.itss-proactive.com',
        465,
        true,
        'gerente@bykatherinecarroll.com',
        NULL,
        false,
        'untested'
    ),
    (
        'agenda_reminders',
        'Atelier Katherine Carroll · Agenda',
        'info@bykatherinecarroll.com',
        'info@bykatherinecarroll.com',
        'mail.itss-proactive.com',
        465,
        true,
        'info@bykatherinecarroll.com',
        NULL,
        false,
        'untested'
    ),
    (
        'contact_support',
        'Atelier Katherine Carroll',
        'info@bykatherinecarroll.com',
        'info@bykatherinecarroll.com',
        'mail.itss-proactive.com',
        465,
        true,
        'info@bykatherinecarroll.com',
        NULL,
        false,
        'untested'
    ),
    (
        'billing_notifications',
        'Atelier Katherine Carroll · Facturación',
        NULL,
        'info@bykatherinecarroll.com',
        'mail.itss-proactive.com',
        465,
        true,
        NULL,
        NULL,
        false,
        'untested'
    )
ON CONFLICT (purpose) DO NOTHING;

-- ==============================================================================
-- FASE 2: TABLA public.atelier_email_logs (SEGUIMIENTO HONESTO DE ESTADOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.atelier_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose TEXT NOT NULL
        CONSTRAINT chk_ael_purpose CHECK (
            purpose IN (
                'portal_invitations',
                'commercial_quotes',
                'agenda_reminders',
                'contact_support',
                'billing_notifications'
            )
        ),
    module_origin TEXT NOT NULL
        CONSTRAINT chk_ael_module_origin CHECK (
            module_origin IN ('M09', 'M03', 'M08', 'contact', 'billing', 'admin_test')
        ),
    account_id UUID NULL REFERENCES public.atelier_email_accounts(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL
        CONSTRAINT chk_ael_recipient_email CHECK (
            recipient_email !~ E'[\\r\\n]'
            AND recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        ),
    from_email TEXT NOT NULL
        CONSTRAINT chk_ael_from_email CHECK (
            from_email !~ E'[\\r\\n]'
            AND from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        ),
    message_id TEXT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
        CONSTRAINT chk_ael_status CHECK (
            status IN (
                'queued',
                'sending',
                'smtp_accepted',
                'delivered',
                'bounced',
                'failed',
                'delivery_unknown'
            )
        ),
    smtp_response TEXT NULL,
    sent_at TIMESTAMPTZ NULL,
    delivered_at TIMESTAMPTZ NULL,
    bounced_at TIMESTAMPTZ NULL,
    error_code TEXT NULL,
    error_description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.atelier_email_logs IS
    'Bitácora protegida de correos transaccionales despachados por Atelier Digital. Distingue aceptación SMTP (smtp_accepted) de entrega confirmada (delivered); jamás almacena contraseñas, tokens ni contenido sensible.';

CREATE INDEX IF NOT EXISTS idx_ael_filters
    ON public.atelier_email_logs (purpose, module_origin, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ael_created_at
    ON public.atelier_email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ael_account_id
    ON public.atelier_email_logs (account_id);
CREATE INDEX IF NOT EXISTS idx_ael_message_id
    ON public.atelier_email_logs (message_id)
    WHERE message_id IS NOT NULL;

-- ==============================================================================
-- FASE 3: TRIGGERS DE INTEGRIDAD Y PROTECCIÓN ANTI-MANIPULACIÓN DE LOGS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_atelier_email_logs_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Operación prohibida: los registros de public.atelier_email_logs no pueden eliminarse.'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_atelier_email_logs_delete ON public.atelier_email_logs;
CREATE TRIGGER trg_protect_atelier_email_logs_delete
    BEFORE DELETE ON public.atelier_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_atelier_email_logs_delete();

CREATE OR REPLACE FUNCTION public.guard_atelier_email_logs_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Los metadatos de identidad del registro son inmutables tras su creación
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.purpose IS DISTINCT FROM OLD.purpose
       OR NEW.module_origin IS DISTINCT FROM OLD.module_origin
       OR NEW.account_id IS DISTINCT FROM OLD.account_id
       OR NEW.recipient_email IS DISTINCT FROM OLD.recipient_email
       OR NEW.from_email IS DISTINCT FROM OLD.from_email
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Operación prohibida: los campos base de public.atelier_email_logs son inmutables.'
            USING ERRCODE = '42501';
    END IF;

    -- Validar máquina de transiciones de estado
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status = 'queued' AND NEW.status NOT IN ('sending', 'failed') THEN
            RAISE EXCEPTION 'Transición de estado inválida en atelier_email_logs: % -> %.', OLD.status, NEW.status
                USING ERRCODE = '22023';
        ELSIF OLD.status = 'sending' AND NEW.status NOT IN ('smtp_accepted', 'failed') THEN
            RAISE EXCEPTION 'Transición de estado inválida en atelier_email_logs: % -> %.', OLD.status, NEW.status
                USING ERRCODE = '22023';
        ELSIF OLD.status = 'smtp_accepted' AND NEW.status NOT IN ('delivery_unknown', 'bounced', 'delivered') THEN
            RAISE EXCEPTION 'Transición de estado inválida en atelier_email_logs: % -> %.', OLD.status, NEW.status
                USING ERRCODE = '22023';
        ELSIF OLD.status = 'delivery_unknown' AND NEW.status NOT IN ('bounced', 'delivered') THEN
            RAISE EXCEPTION 'Transición de estado inválida en atelier_email_logs: % -> %.', OLD.status, NEW.status
                USING ERRCODE = '22023';
        ELSIF OLD.status IN ('delivered', 'bounced', 'failed') THEN
            RAISE EXCEPTION 'Estado terminal inmutable en atelier_email_logs: %.', OLD.status
                USING ERRCODE = '22023';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_atelier_email_logs_update ON public.atelier_email_logs;
CREATE TRIGGER trg_guard_atelier_email_logs_update
    BEFORE UPDATE ON public.atelier_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_atelier_email_logs_update();

-- ==============================================================================
-- FASE 4: ROW LEVEL SECURITY (RLS) Y PRIVILEGIOS ESTRICTOS
-- ==============================================================================
ALTER TABLE public.atelier_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_email_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.atelier_email_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.atelier_email_logs FROM PUBLIC, anon, authenticated;

-- Los administradores autenticados solo consultan por RLS; las escrituras pasan por Edge Function (service_role)
GRANT SELECT ON TABLE public.atelier_email_accounts TO authenticated;
GRANT SELECT ON TABLE public.atelier_email_logs TO authenticated;

GRANT ALL ON TABLE public.atelier_email_accounts TO service_role, postgres;
GRANT SELECT, INSERT, UPDATE ON TABLE public.atelier_email_logs TO service_role, postgres;

DROP POLICY IF EXISTS "aea_admin_select" ON public.atelier_email_accounts;
CREATE POLICY "aea_admin_select"
    ON public.atelier_email_accounts
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "ael_admin_select" ON public.atelier_email_logs;
CREATE POLICY "ael_admin_select"
    ON public.atelier_email_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ==============================================================================
-- FASE 5: RPCs PRIVADOS DE SUPABASE VAULT (EXCLUSIVOS PARA service_role)
-- ==============================================================================

-- 5.1 Alta o rotación write-only de contraseña SMTP en Supabase Vault
CREATE OR REPLACE FUNCTION public._atelier_email_upsert_secret(
    p_account_id UUID,
    p_secret_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_purpose TEXT;
    v_existing_secret_id UUID;
    v_new_secret_id UUID;
    v_secret_name TEXT;
    v_secret_desc TEXT;
BEGIN
    IF p_account_id IS NULL OR p_secret_value IS NULL OR btrim(p_secret_value) = '' THEN
        RAISE EXCEPTION 'Parámetros inválidos para almacenar credencial SMTP en Vault.'
            USING ERRCODE = '22023';
    END IF;

    SELECT purpose, vault_secret_id
    INTO v_purpose, v_existing_secret_id
    FROM public.atelier_email_accounts
    WHERE id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta de correo % no encontrada.', p_account_id
            USING ERRCODE = 'P0002';
    END IF;

    v_secret_name := 'atelier_smtp_' || v_purpose || '_' || replace(p_account_id::TEXT, '-', '');
    v_secret_desc := 'Credencial SMTP Zimbra write-only para propósito ' || v_purpose;

    IF v_existing_secret_id IS NULL THEN
        v_new_secret_id := vault.create_secret(
            p_secret_value,
            v_secret_name,
            v_secret_desc,
            NULL
        );

        UPDATE public.atelier_email_accounts
        SET vault_secret_id = v_new_secret_id,
            updated_at = pg_catalog.now()
        WHERE id = p_account_id;

        RETURN v_new_secret_id;
    ELSE
        PERFORM vault.update_secret(
            v_existing_secret_id,
            p_secret_value,
            v_secret_name,
            v_secret_desc,
            NULL
        );

        UPDATE public.atelier_email_accounts
        SET updated_at = pg_catalog.now()
        WHERE id = p_account_id;

        RETURN v_existing_secret_id;
    END IF;
END;
$$;

-- 5.2 Resolución server-side de cuenta activa + credencial descifrada por propósito
CREATE OR REPLACE FUNCTION public._atelier_email_resolve_account(
    p_purpose TEXT
)
RETURNS TABLE (
    id UUID,
    purpose TEXT,
    display_name TEXT,
    from_email TEXT,
    reply_to_email TEXT,
    smtp_host TEXT,
    smtp_port INT,
    smtp_secure BOOLEAN,
    smtp_user TEXT,
    is_active BOOLEAN,
    smtp_password TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.purpose,
        a.display_name,
        a.from_email,
        a.reply_to_email,
        a.smtp_host,
        a.smtp_port,
        a.smtp_secure,
        a.smtp_user,
        a.is_active,
        ds.decrypted_secret AS smtp_password
    FROM public.atelier_email_accounts a
    LEFT JOIN vault.decrypted_secrets ds
        ON ds.id = a.vault_secret_id
    WHERE a.purpose = p_purpose
    LIMIT 1;
END;
$$;

-- 5.3 Resolución server-side por account_id para prueba administrativa controlada (verify/test)
CREATE OR REPLACE FUNCTION public._atelier_email_get_account_with_secret(
    p_account_id UUID
)
RETURNS TABLE (
    id UUID,
    purpose TEXT,
    display_name TEXT,
    from_email TEXT,
    reply_to_email TEXT,
    smtp_host TEXT,
    smtp_port INT,
    smtp_secure BOOLEAN,
    smtp_user TEXT,
    is_active BOOLEAN,
    smtp_password TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.purpose,
        a.display_name,
        a.from_email,
        a.reply_to_email,
        a.smtp_host,
        a.smtp_port,
        a.smtp_secure,
        a.smtp_user,
        a.is_active,
        ds.decrypted_secret AS smtp_password
    FROM public.atelier_email_accounts a
    LEFT JOIN vault.decrypted_secrets ds
        ON ds.id = a.vault_secret_id
    WHERE a.id = p_account_id
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public._atelier_email_upsert_secret(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._atelier_email_resolve_account(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._atelier_email_get_account_with_secret(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public._atelier_email_upsert_secret(UUID, TEXT) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public._atelier_email_resolve_account(TEXT) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public._atelier_email_get_account_with_secret(UUID) TO service_role, postgres;

COMMIT;
