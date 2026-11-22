-- ==============================================================================
-- ATELIER DIGITAL — MÓDULO 07: COSTOS Y PAGOS (MVP ALTA COSTURA)
-- Migración Aditiva: 20261114000000_costs_payments_m07.sql
-- Descripción: 6 extensiones aditivas en financial_movements, trigger de
--   updated_at + row_version, función interna de recálculo de saldos,
--   2 RPCs de mutación ACID (record y void) y 2 RPCs de lectura pura STABLE.
-- Preservación: M00–M06 intactos. Cero tablas nuevas. Cero borrado de columnas.
-- ==============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: EXTENSIÓN ADITIVA DE public.financial_movements
-- ============================================================================

ALTER TABLE public.financial_movements
    ADD COLUMN IF NOT EXISTS row_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS void_idempotency_key TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS supplier_id UUID NULL REFERENCES public.atelier_suppliers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS material_id UUID NULL REFERENCES public.atelier_materials(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS media_asset_id UUID NULL REFERENCES public.commercial_media_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now();

-- ============================================================================
-- PARTE 2: ÍNDICES DE RENDIMIENTO ADITIVOS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_financial_movements_supplier_id 
    ON public.financial_movements(supplier_id) WHERE supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_movements_material_id 
    ON public.financial_movements(material_id) WHERE material_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_movements_void_idem 
    ON public.financial_movements(void_idempotency_key) WHERE void_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_movements_active_calc 
    ON public.financial_movements(creation_id, currency, movement_type, is_void) 
    WHERE is_void = FALSE;

-- ============================================================================
-- PARTE 3: TRIGGER DE ACTUALIZACIÓN AUTOMÁTICA updated_at Y row_version
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_m07_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    NEW.row_version = OLD.row_version + 1;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_m07_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_m07_updated_at() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_m07_updated_at() TO authenticated, service_role, postgres;

DROP TRIGGER IF EXISTS trg_financial_movements_updated_at ON public.financial_movements;
CREATE TRIGGER trg_financial_movements_updated_at
    BEFORE UPDATE ON public.financial_movements
    FOR EACH ROW EXECUTE FUNCTION public.handle_m07_updated_at();

-- ============================================================================
-- PARTE 4: FUNCIÓN INTERNA ATÓMICA DE RECÁLCULO DE SALDOS
-- USO INTERNO EXCLUSIVO dentro de transacciones de mutación bajo Lock 1->2->4.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.m07_recalculate_creation_financial_state(
    p_creation_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_contract_currency TEXT := 'COP';
    v_total_income_contract NUMERIC(14,2) := 0;
    v_total_expenses_cop NUMERIC(14,2) := 0;
    v_total_expenses_usd NUMERIC(14,2) := 0;
    v_quote public.commercial_quotes%ROWTYPE;
    v_profile public.creation_commercial_profiles%ROWTYPE;
    v_new_payment_status TEXT := 'unpaid';
    v_balance_pending NUMERIC(14,2) := 0;
    v_quoted_total NUMERIC(14,2) := 0;
    v_is_cleared BOOLEAN := FALSE;
BEGIN
    -- 1. Identificar cotización formal aceptada (o más reciente)
    SELECT * INTO v_quote
    FROM public.commercial_quotes
    WHERE creation_id = p_creation_id
      AND status = 'accepted'
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT * INTO v_quote
        FROM public.commercial_quotes
        WHERE creation_id = p_creation_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- 2. Resolver moneda contractual del encargo
    IF v_quote.id IS NOT NULL THEN
        v_contract_currency := v_quote.currency;
        v_quoted_total := COALESCE(v_quote.total_price, 0);
    ELSE
        SELECT currency INTO v_contract_currency
        FROM public.creation_commercial_profiles
        WHERE creation_id = p_creation_id;
        v_contract_currency := COALESCE(v_contract_currency, 'COP');
    END IF;

    -- 3. Calcular ingresos netos en la moneda contractual (anticipos y pagos menos reembolsos)
    SELECT 
        GREATEST(0, COALESCE(SUM(CASE 
            WHEN movement_type IN ('advance', 'installment', 'final_payment') THEN amount 
            WHEN movement_type = 'refund' THEN -amount 
            ELSE 0 
        END), 0))
    INTO v_total_income_contract
    FROM public.financial_movements
    WHERE creation_id = p_creation_id
      AND currency = v_contract_currency
      AND is_void = FALSE;

    -- 4. Calcular egresos de taller discriminados por moneda
    SELECT 
        COALESCE(SUM(CASE WHEN currency = 'COP' AND movement_type IN ('material_purchase', 'workshop_expense') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN currency = 'USD' AND movement_type IN ('material_purchase', 'workshop_expense') THEN amount ELSE 0 END), 0)
    INTO v_total_expenses_cop, v_total_expenses_usd
    FROM public.financial_movements
    WHERE creation_id = p_creation_id
      AND is_void = FALSE;

    -- 5. Calcular saldo pendiente y amortización de la cotización
    IF v_quoted_total > 0 THEN
        v_balance_pending := GREATEST(0, v_quoted_total - v_total_income_contract);
    ELSE
        v_balance_pending := 0;
    END IF;

    -- 6. Actualizar cotización formal aceptada si existe (Lock 2 ya adquirido por el caller)
    IF v_quote.id IS NOT NULL THEN
        UPDATE public.commercial_quotes
        SET
            advance_paid_amount = LEAST(v_quoted_total, v_total_income_contract),
            balance_pending_amount = v_balance_pending,
            updated_at = pg_catalog.now()
        WHERE id = v_quote.id;
    END IF;

    -- 7. Determinar estado de pago formal del encargo
    IF v_total_income_contract <= 0 THEN
        v_new_payment_status := 'unpaid';
    ELSIF v_quoted_total > 0 AND v_total_income_contract >= v_quoted_total THEN
        v_new_payment_status := 'paid_in_full';
    ELSE
        v_new_payment_status := 'partially_paid';
    END IF;

    -- 8. Actualizar satélite creation_commercial_profiles (Lock 4 implícito)
    UPDATE public.creation_commercial_profiles
    SET
        payment_status = v_new_payment_status,
        updated_at = pg_catalog.now()
    WHERE creation_id = p_creation_id;

    v_is_cleared := (v_new_payment_status = 'paid_in_full' OR (v_quoted_total > 0 AND v_balance_pending = 0));

    RETURN pg_catalog.jsonb_build_object(
        'contract_currency', v_contract_currency,
        'total_income', v_total_income_contract,
        'quoted_total', v_quoted_total,
        'balance_pending', v_balance_pending,
        'total_expenses_cop', v_total_expenses_cop,
        'total_expenses_usd', v_total_expenses_usd,
        'payment_status', v_new_payment_status,
        'is_financially_cleared', v_is_cleared
    );
END;
$$;

REVOKE ALL ON FUNCTION public.m07_recalculate_creation_financial_state(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.m07_recalculate_creation_financial_state(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.m07_recalculate_creation_financial_state(UUID, UUID) TO authenticated, service_role, postgres;

-- ============================================================================
-- PARTE 5: RPC 1/4 — record_financial_movement_m07 (Mutación ACID)
-- Registra pagos o gastos con locks 1->5, idempotencia y evento comercial.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_financial_movement_m07(
    p_creation_id UUID,
    p_movement_type TEXT,
    p_amount NUMERIC,
    p_currency TEXT,
    p_payment_method TEXT,
    p_idempotency_key TEXT,
    p_movement_date DATE DEFAULT NULL,
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_quote_id UUID DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL,
    p_material_id UUID DEFAULT NULL,
    p_receipt_asset JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_effective_date DATE := COALESCE(p_movement_date, CURRENT_DATE);
    v_existing public.financial_movements%ROWTYPE;
    v_inserted public.financial_movements%ROWTYPE;
    v_media_id UUID := NULL;
    v_summary JSONB;
BEGIN
    -- 0. Guarda de Seguridad y Roles
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M07: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    -- Validaciones de Dominio
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Regla M07: el monto debe ser estrictamente superior a cero.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Regla M07: p_idempotency_key es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    IF p_currency NOT IN ('COP', 'USD') THEN
        RAISE EXCEPTION 'Regla M07: la divisa debe ser COP o USD.'
            USING ERRCODE = '23514';
    END IF;

    IF p_movement_type NOT IN ('advance', 'installment', 'final_payment', 'material_purchase', 'workshop_expense', 'refund') THEN
        RAISE EXCEPTION 'Regla M07: tipo de movimiento no válido.'
            USING ERRCODE = '23514';
    END IF;

    -- [ORDEN DE BLOQUEOS 1 -> 2 -> 3 -> 4 -> 5]
    -- Nivel 1: Lock en Creación raíz
    PERFORM 1 FROM public.creations WHERE id = p_creation_id FOR UPDATE;

    -- Nivel 2: Lock en Cotización si aplica
    IF p_quote_id IS NOT NULL THEN
        PERFORM 1 FROM public.commercial_quotes WHERE id = p_quote_id FOR UPDATE;
    END IF;

    -- Nivel 3: Evaluar Idempotencia bajo lock
    SELECT * INTO v_existing
    FROM public.financial_movements
    WHERE idempotency_key = v_clean_idem
    LIMIT 1;

    IF FOUND THEN
        -- Validar coincidencia de payload (detección de divergencia)
        IF v_existing.creation_id IS DISTINCT FROM p_creation_id
           OR v_existing.movement_type IS DISTINCT FROM p_movement_type
           OR v_existing.amount IS DISTINCT FROM p_amount
           OR v_existing.currency IS DISTINCT FROM p_currency
        THEN
            RAISE EXCEPTION 'Conflicto de idempotencia M07: la llave ya fue utilizada con otro payload.'
                USING ERRCODE = '23505';
        END IF;

        -- Replay idéntico seguro: recalcular saldos y retornar
        v_summary := public.m07_recalculate_creation_financial_state(p_creation_id, v_actor_id);

        RETURN pg_catalog.jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'movement', pg_catalog.to_jsonb(v_existing),
            'summary', v_summary
        );
    END IF;

    -- Registrar comprobante opcional en commercial_media_assets si viene en payload
    IF p_receipt_asset IS NOT NULL AND pg_catalog.jsonb_typeof(p_receipt_asset) = 'object' THEN
        INSERT INTO public.commercial_media_assets (
            creation_id, quote_id, project_id, asset_type,
            file_path, file_name, mime_type, file_size_bytes, description,
            idempotency_key, created_by
        )
        VALUES (
            p_creation_id, p_quote_id, p_project_id, 'payment_receipt',
            p_receipt_asset->>'file_path',
            COALESCE(p_receipt_asset->>'file_name', 'comprobante_pago'),
            p_receipt_asset->>'mime_type',
            (p_receipt_asset->>'file_size_bytes')::bigint,
            p_receipt_asset->>'description',
            'receipt:' || v_clean_idem,
            v_actor_id
        )
        RETURNING id INTO v_media_id;
    END IF;

    -- Nivel 3: Inserción del Movimiento
    INSERT INTO public.financial_movements (
        creation_id, quote_id, project_id, movement_type, amount, currency,
        payment_method, reference_number, receipt_url, movement_date, notes,
        idempotency_key, is_void, supplier_id, material_id, media_asset_id,
        created_by, created_at, row_version
    )
    VALUES (
        p_creation_id, p_quote_id, p_project_id, p_movement_type, p_amount, p_currency,
        p_payment_method, NULLIF(pg_catalog.btrim(p_reference_number), ''),
        p_receipt_asset->>'file_path', v_effective_date, NULLIF(pg_catalog.btrim(p_notes), ''),
        v_clean_idem, FALSE, p_supplier_id, p_material_id, v_media_id,
        v_actor_id, pg_catalog.now(), 1
    )
    RETURNING * INTO v_inserted;

    -- Nivel 4: Recálculo atómico de saldos y payment_status
    v_summary := public.m07_recalculate_creation_financial_state(p_creation_id, v_actor_id);

    -- Nivel 5: Evento de auditoría en commercial_events
    INSERT INTO public.commercial_events (
        creation_id, quote_id, project_id, event_type, title, description, metadata, created_by
    )
    VALUES (
        p_creation_id, p_quote_id, p_project_id, 'payment_registered',
        'Movimiento financiero registrado · ' || p_movement_type,
        COALESCE(p_notes, 'Registro formal en caja de taller'),
        pg_catalog.jsonb_build_object(
            'movement_id', v_inserted.id,
            'movement_type', v_inserted.movement_type,
            'amount', v_inserted.amount,
            'currency', v_inserted.currency,
            'payment_method', v_inserted.payment_method,
            'reference_number', v_inserted.reference_number,
            'idempotency_key', v_clean_idem
        ),
        v_actor_id
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'movement', pg_catalog.to_jsonb(v_inserted),
        'summary', v_summary
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_financial_movement_m07(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_financial_movement_m07(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_financial_movement_m07(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) TO authenticated, service_role, postgres;

-- ============================================================================
-- PARTE 6: RPC 2/4 — void_financial_movement_m07 (Mutación ACID)
-- Anulación auditada con locks 1->5 unificados, PT409 e idempotencia formal.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_financial_movement_m07(
    p_movement_id UUID,
    p_expected_row_version INT,
    p_idempotency_key TEXT,
    p_void_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_clean_idem TEXT := NULLIF(pg_catalog.btrim(p_idempotency_key), '');
    v_clean_reason TEXT := NULLIF(pg_catalog.btrim(p_void_reason), '');
    v_creation_id UUID;
    v_quote_id UUID;
    v_current public.financial_movements%ROWTYPE;
    v_updated public.financial_movements%ROWTYPE;
    v_summary JSONB;
BEGIN
    -- 0. Guarda de Seguridad y Roles
    IF v_actor_id IS NULL OR NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M07: requiere rol admin o designer autenticado.'
            USING ERRCODE = '42501';
    END IF;

    IF v_clean_reason IS NULL THEN
        RAISE EXCEPTION 'Regla M07: debe proporcionar un motivo detallado para anular el movimiento.'
            USING ERRCODE = '23514';
    END IF;

    IF v_clean_idem IS NULL THEN
        RAISE EXCEPTION 'Regla M07: p_idempotency_key de anulación es obligatorio.'
            USING ERRCODE = '23514';
    END IF;

    -- Resolución previa de IDs para orden consistente de locks (sin bloquear todavía)
    SELECT creation_id, quote_id INTO v_creation_id, v_quote_id
    FROM public.financial_movements
    WHERE id = p_movement_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Movimiento financiero no encontrado.'
            USING ERRCODE = '23503';
    END IF;

    -- [ORDEN DE BLOQUEOS JERÁRQUICO UNIFICADO: 1 -> 2 -> 3 -> 4 -> 5]
    -- Nivel 1: Lock en Creación padre
    PERFORM 1 FROM public.creations WHERE id = v_creation_id FOR UPDATE;

    -- Nivel 2: Lock en Cotización si aplica
    IF v_quote_id IS NOT NULL THEN
        PERFORM 1 FROM public.commercial_quotes WHERE id = v_quote_id FOR UPDATE;
    END IF;

    -- Nivel 3: Lock sobre el movimiento objetivo
    SELECT * INTO v_current
    FROM public.financial_movements
    WHERE id = p_movement_id
    FOR UPDATE;

    -- Idempotencia Formal de Anulación
    IF v_current.is_void THEN
        IF v_current.void_idempotency_key = v_clean_idem THEN
            -- Replay idéntico de anulación ya procesada
            v_summary := public.m07_recalculate_creation_financial_state(v_creation_id, v_actor_id);
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'movement', pg_catalog.to_jsonb(v_current),
                'summary', v_summary
            );
        ELSE
            RAISE EXCEPTION 'Conflicto de anulación M07: el movimiento ya fue anulado previamente bajo otra operación.'
                USING ERRCODE = '23505';
        END IF;
    END IF;

    -- Control optimista estricto con PT409
    IF v_current.row_version IS DISTINCT FROM p_expected_row_version THEN
        RAISE EXCEPTION 'Conflicto de concurrencia M07: el movimiento fue modificado por otra sesión (esperada v%, actual v%).', p_expected_row_version, v_current.row_version
            USING ERRCODE = 'PT409';
    END IF;

    -- Anulación auditada sin borrado físico (estampa void_idempotency_key)
    UPDATE public.financial_movements
    SET
        is_void = TRUE,
        voided_at = pg_catalog.now(),
        voided_by = v_actor_id,
        void_reason = v_clean_reason,
        void_idempotency_key = v_clean_idem,
        notes = COALESCE(notes || ' · ', '') || '[ANULADO: ' || v_clean_reason || ']'
    WHERE id = p_movement_id
    RETURNING * INTO v_updated;

    -- Nivel 4: Reversión atómica de saldos
    v_summary := public.m07_recalculate_creation_financial_state(v_creation_id, v_actor_id);

    -- Nivel 5: Evento de auditoría en commercial_events
    INSERT INTO public.commercial_events (
        creation_id, quote_id, project_id, event_type, title, description, metadata, created_by
    )
    VALUES (
        v_creation_id, v_quote_id, v_current.project_id, 'payment_voided',
        'Movimiento financiero anulado · ' || v_current.movement_type,
        v_clean_reason,
        pg_catalog.jsonb_build_object(
            'movement_id', v_updated.id,
            'void_reason', v_clean_reason,
            'previous_amount', v_current.amount,
            'void_idempotency_key', v_clean_idem
        ),
        v_actor_id
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'movement', pg_catalog.to_jsonb(v_updated),
        'summary', v_summary
    );
END;
$$;

REVOKE ALL ON FUNCTION public.void_financial_movement_m07(UUID, INT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_financial_movement_m07(UUID, INT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_financial_movement_m07(UUID, INT, TEXT, TEXT) TO authenticated, service_role, postgres;

-- ============================================================================
-- PARTE 7: RPC 3/4 — get_creation_financial_summary_m07 (Lectura Pura STABLE)
-- Cero sentencias UPDATE/INSERT. Puede ejecutarse concurrentemente sin locks.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_creation_financial_summary_m07(
    p_creation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_contract_currency TEXT := 'COP';
    v_total_income_contract NUMERIC(14,2) := 0;
    v_total_expenses_cop NUMERIC(14,2) := 0;
    v_total_expenses_usd NUMERIC(14,2) := 0;
    v_quote_total NUMERIC(14,2) := 0;
    v_quote_balance NUMERIC(14,2) := 0;
    v_quote_advance_paid NUMERIC(14,2) := 0;
    v_payment_status TEXT := 'unpaid';
    v_is_cleared BOOLEAN := FALSE;
    v_projected_gross_margin NUMERIC(14,2) := 0;
    v_cash_flow_margin NUMERIC(14,2) := 0;
BEGIN
    IF NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M07.' USING ERRCODE = '42501';
    END IF;

    -- 1. Leer cotización formal aceptada (o más reciente)
    SELECT currency, total_price, advance_paid_amount, balance_pending_amount
    INTO v_contract_currency, v_quote_total, v_quote_advance_paid, v_quote_balance
    FROM public.commercial_quotes
    WHERE creation_id = p_creation_id
      AND status = 'accepted'
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT currency, total_price, advance_paid_amount, balance_pending_amount
        INTO v_contract_currency, v_quote_total, v_quote_advance_paid, v_quote_balance
        FROM public.commercial_quotes
        WHERE creation_id = p_creation_id
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- Si no hay cotización, leer divisa del perfil comercial
    IF v_contract_currency IS NULL THEN
        SELECT currency, payment_status INTO v_contract_currency, v_payment_status
        FROM public.creation_commercial_profiles
        WHERE creation_id = p_creation_id;
        v_contract_currency := COALESCE(v_contract_currency, 'COP');
    ELSE
        SELECT payment_status INTO v_payment_status
        FROM public.creation_commercial_profiles
        WHERE creation_id = p_creation_id;
    END IF;

    v_payment_status := COALESCE(v_payment_status, 'unpaid');
    v_quote_total := COALESCE(v_quote_total, 0);

    -- 2. Calcular ingresos en moneda contractual (menos reembolsos)
    SELECT 
        GREATEST(0, COALESCE(SUM(CASE 
            WHEN movement_type IN ('advance', 'installment', 'final_payment') THEN amount 
            WHEN movement_type = 'refund' THEN -amount 
            ELSE 0 
        END), 0))
    INTO v_total_income_contract
    FROM public.financial_movements
    WHERE creation_id = p_creation_id
      AND currency = v_contract_currency
      AND is_void = FALSE;

    -- 3. Calcular egresos de taller por divisa
    SELECT 
        COALESCE(SUM(CASE WHEN currency = 'COP' AND movement_type IN ('material_purchase', 'workshop_expense') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN currency = 'USD' AND movement_type IN ('material_purchase', 'workshop_expense') THEN amount ELSE 0 END), 0)
    INTO v_total_expenses_cop, v_total_expenses_usd
    FROM public.financial_movements
    WHERE creation_id = p_creation_id
      AND is_void = FALSE;

    -- 4. Métricas de Margen (en la divisa contractual cuando no hay mezcla de monedas)
    IF v_contract_currency = 'COP' THEN
        v_projected_gross_margin := v_quote_total - v_total_expenses_cop;
        v_cash_flow_margin := v_total_income_contract - v_total_expenses_cop;
    ELSE
        v_projected_gross_margin := v_quote_total - v_total_expenses_usd;
        v_cash_flow_margin := v_total_income_contract - v_total_expenses_usd;
    END IF;

    v_is_cleared := (v_payment_status = 'paid_in_full' OR (v_quote_total > 0 AND v_quote_balance = 0));

    RETURN pg_catalog.jsonb_build_object(
        'contract_currency', v_contract_currency,
        'quoted_total', v_quote_total,
        'total_income', v_total_income_contract,
        'balance_pending', COALESCE(v_quote_balance, 0),
        'total_expenses_cop', v_total_expenses_cop,
        'total_expenses_usd', v_total_expenses_usd,
        'projected_gross_margin', v_projected_gross_margin,
        'cash_flow_margin', v_cash_flow_margin,
        'payment_status', v_payment_status,
        'is_financially_cleared', v_is_cleared
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_creation_financial_summary_m07(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_creation_financial_summary_m07(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_creation_financial_summary_m07(UUID) TO authenticated, service_role, postgres;

-- ============================================================================
-- PARTE 8: RPC 4/4 — get_atelier_financial_overview_m07 (Lectura Pura STABLE)
-- Consulta analítica agregada para la bandeja transversal de finanzas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_atelier_financial_overview_m07()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT public.is_admin_or_designer() THEN
        RAISE EXCEPTION 'Acceso denegado M07.' USING ERRCODE = '42501';
    END IF;

    SELECT pg_catalog.jsonb_build_object(
        'total_revenue_month_cop', COALESCE(SUM(CASE WHEN currency = 'COP' AND movement_type IN ('advance', 'installment', 'final_payment') AND movement_date >= date_trunc('month', CURRENT_DATE) THEN amount WHEN currency = 'COP' AND movement_type = 'refund' AND movement_date >= date_trunc('month', CURRENT_DATE) THEN -amount ELSE 0 END), 0),
        'total_revenue_month_usd', COALESCE(SUM(CASE WHEN currency = 'USD' AND movement_type IN ('advance', 'installment', 'final_payment') AND movement_date >= date_trunc('month', CURRENT_DATE) THEN amount WHEN currency = 'USD' AND movement_type = 'refund' AND movement_date >= date_trunc('month', CURRENT_DATE) THEN -amount ELSE 0 END), 0),
        'total_expenses_month_cop', COALESCE(SUM(CASE WHEN currency = 'COP' AND movement_type IN ('material_purchase', 'workshop_expense') AND movement_date >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0),
        'total_expenses_month_usd', COALESCE(SUM(CASE WHEN currency = 'USD' AND movement_type IN ('material_purchase', 'workshop_expense') AND movement_date >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0),
        'total_pending_receivables_cop', (SELECT COALESCE(SUM(balance_pending_amount), 0) FROM public.commercial_quotes WHERE status = 'accepted' AND currency = 'COP'),
        'total_pending_receivables_usd', (SELECT COALESCE(SUM(balance_pending_amount), 0) FROM public.commercial_quotes WHERE status = 'accepted' AND currency = 'USD'),
        'active_creations_count', (SELECT COUNT(*) FROM public.creations WHERE status NOT IN ('completed', 'cancelled')),
        'unpaid_creations_count', (SELECT COUNT(*) FROM public.creation_commercial_profiles WHERE payment_status = 'unpaid'),
        'partially_paid_creations_count', (SELECT COUNT(*) FROM public.creation_commercial_profiles WHERE payment_status = 'partially_paid'),
        'paid_in_full_creations_count', (SELECT COUNT(*) FROM public.creation_commercial_profiles WHERE payment_status = 'paid_in_full')
    ) INTO v_result
    FROM public.financial_movements
    WHERE is_void = FALSE;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_atelier_financial_overview_m07() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_atelier_financial_overview_m07() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_atelier_financial_overview_m07() TO authenticated, service_role, postgres;

-- ============================================================================
-- PARTE 9: VERIFICACIÓN ATÓMICA DE INTEGRIDAD POST-DESPLIEGUE
-- ============================================================================

DO $$
DECLARE
    v_col_count INT;
    v_fn_count INT;
    v_trg_count INT;
    v_idx_count INT;
BEGIN
    -- Verificar que las 6 columnas aditivas existen
    SELECT COUNT(*) INTO v_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_movements'
      AND column_name IN ('row_version', 'void_idempotency_key', 'supplier_id', 'material_id', 'media_asset_id', 'updated_at');

    IF v_col_count < 6 THEN
        RAISE EXCEPTION 'M07 VERIFICACIÓN FALLIDA: Solo % de 6 columnas aditivas encontradas.', v_col_count;
    END IF;

    -- Verificar que las 6 funciones M07 existen
    SELECT COUNT(*) INTO v_fn_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_m07_updated_at',
        'm07_recalculate_creation_financial_state',
        'record_financial_movement_m07',
        'void_financial_movement_m07',
        'get_creation_financial_summary_m07',
        'get_atelier_financial_overview_m07'
      );

    IF v_fn_count < 6 THEN
        RAISE EXCEPTION 'M07 VERIFICACIÓN FALLIDA: Solo % de 6 funciones encontradas.', v_fn_count;
    END IF;

    -- Verificar trigger activo
    SELECT COUNT(*) INTO v_trg_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'financial_movements'
      AND t.tgname = 'trg_financial_movements_updated_at'
      AND t.tgenabled = 'O';

    IF v_trg_count < 1 THEN
        RAISE EXCEPTION 'M07 VERIFICACIÓN FALLIDA: Trigger trg_financial_movements_updated_at no activo.';
    END IF;

    -- Verificar índices aditivos
    SELECT COUNT(*) INTO v_idx_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'financial_movements'
      AND indexname IN (
        'idx_financial_movements_supplier_id',
        'idx_financial_movements_material_id',
        'idx_financial_movements_void_idem',
        'idx_financial_movements_active_calc'
      );

    IF v_idx_count < 4 THEN
        RAISE EXCEPTION 'M07 VERIFICACIÓN FALLIDA: Solo % de 4 índices aditivos encontrados.', v_idx_count;
    END IF;

    RAISE NOTICE 'M07 VERIFICACIÓN EXITOSA: 6 columnas, 6 funciones, 1 trigger, 4 índices — APTO.';
END;
$$;

COMMIT;

