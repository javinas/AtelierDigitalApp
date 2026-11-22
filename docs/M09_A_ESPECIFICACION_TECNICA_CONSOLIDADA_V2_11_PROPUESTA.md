# M09-A v2.11 (PROPUESTA E1) — Especificación Técnica Consolidada del Portal de Clientas

> [!CAUTION]
> **ESTADO DOCUMENTAL: PROPUESTA E1 NO EJECUTADA — `0/5` ENTREGAS IMPLEMENTADAS · `0/13` HALLAZGOS REMEDIADOS · `NO APTO PARA DESPLIEGUE`.**
> Esta propuesta **no reemplaza ni modifica** el archivo histórico [M09_A_ESPECIFICACION_TECNICA_CONSOLIDADA.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/docs/M09_A_ESPECIFICACION_TECNICA_CONSOLIDADA.md) (`v2.10`), ni ejecuta SQL ni operaciones remotas en Supabase.
> Los **3 controles empíricos de verificabilidad** (`security_barrier` anti side-channel, guarda `SET LOCAL` en triggers `business` bajo PostgREST/PgBouncer, y confianza de encabezados IP en gateway real) permanecen **`NO VERIFICADOS`** hasta su ejecución en Staging PostgreSQL `17.11`.

---

## 1. Propósito, Alcance y Delta Normativo (`v2.10` → `v2.11 Propuesta`)

La propuesta `M09-A v2.11` consolida las remediaciones estructurales de contrato identificadas en [M09_PREPROD_AUDIT.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/M09_PREPROD_AUDIT.md), [M09_PREPROD_FIX_PLAN.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/M09_PREPROD_FIX_PLAN.md), [M09_IMPLEMENTATION_ROADMAP_FINAL.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/M09_IMPLEMENTATION_ROADMAP_FINAL.md) y [M09_IMPLEMENTATION_ROADMAP_FINAL_REVIEW.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/M09_IMPLEMENTATION_ROADMAP_FINAL_REVIEW.md), manteniendo compatibilidad 1:1 con `M00–M08`, `C15` (`141693a0-01e8-498a-bbb3-1c4f98036543`) y los módulos frontend `M09-B.2–B.7` (`src/types/portal.ts`, `src/services/portalService.ts`, `app/(client)/index.tsx`, `app/portal/invite.tsx`).

### Resumen Exacto de Cambios `v2.10` → `v2.11`

| Código | Cambio Normativo Introducido en `v2.11 Propuesta` | Referencia en Artefacto SQL Propuesto |
| :--- | :--- | :--- |
| `C-01` | Reordenamiento topológico estricto en **10 fases** (`Preflight` → `Rol` → `Tablas` → `Triggers` → `Funciones` → `RLS M09` → `RLS apr_*` → `Vistas` → `ACLs` → `Post-Check`) y materialización de `20261118000000_client_portal_m09.sql` (no ejecutada). | [20261118000000_client_portal_m09.sql](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/supabase/migrations/20261118000000_client_portal_m09.sql) (Fases 0–9) |
| `C-02` | Preflight admite `idx_atelier_appointments_client` de M08 (`WHERE client_id IS NOT NULL`) y `v_portal_appointments` incluye `AND ap.client_id IS NOT NULL`. | Fase 0 (0.3) y Fase 7 (7.3) |
| `C-03` | `atelier_portal_reader` (`NOBYPASSRLS`, `GRANT ... TO postgres WITH INHERIT FALSE, SET TRUE`) + `7` políticas aditivas `FOR SELECT TO atelier_portal_reader` sin `USING (true)`, `portal_owns_creation(creation_id)` en `commercial_quotes`/`atelier_fitting_sessions`, `REVOKE ALL` de `portal_owns_creation` a `authenticated`/`anon`, `client_visibility` en `GRANT SELECT` de `atelier_fitting_sessions`, y `0` privilegios en `client_portal_permissions`. | Fases 1, 4, 6, 7 y 8 |
| `C-04` | Verificación de `profiles.full_name` y `user_legal_consents` en Preflight; `finalize_portal_invitation` resuelve `full_name` no vacío e inserta consentimientos Ley 1581 de forma idempotente y server-side sin duplicar con `handle_new_user()`. | Fase 0 (0.7) y Fase 4 |
| `C-05` | Sustitución de `admin.getUserByEmail` por RPC privado `_portal_lookup_auth_user_by_email` (`service_role` only); Rama A con JWT obligatorio; Rama B con **NO `deleteUser` + Compensación de Estado + Forward Recovery**. | Fase 4 + Sección 3 de este documento |
| `C-06` | Estandarización Edge `action: 'verify' | 'accept'` (en `verify` anónimo solo `masked_email`, cero PII en claro; `accept` alineado con `mapInvitationAcceptResponse`). | Sección 3 de este documento (ejecución en E2) |
| `C-07` | Revocación de `INSERT`/`UPDATE`/`DELETE` directos sobre `client_portal_activity_log` para `PUBLIC`, `anon` y `authenticated`; eliminación de `cpal_client_insert_telemetry`; `log_portal_event()` única puerta cliente. | Fases 4, 5 y 8 |
| `A-01` | `v_portal_commercial_quotes` y `apr_commercial_quotes_select` restringidos a `cq.status IN ('sent', 'accepted', 'expired')`. | Fases 6 y 7 (7.5) |
| `A-02` | `v_portal_fitting_sessions` y `apr_atelier_fitting_sessions_select` filtrados a `status NOT IN ('cancelled') AND client_visibility = 'summary_ready'` (y ajuste diccionario M06 en `app/(client)/index.tsx` asignado a E3). | Fases 0 (0.4), 6, 7 (7.4) y 8 |
| `A-03` | `chk_cpp_creation_scope_required` en `client_portal_permissions` + triggers `AFTER` `business` con patrón 2 capas (`SECURITY INVOKER` + `SECURITY DEFINER` con `pg_trigger_depth() < 1`), lista blanca fail-closed `SET LOCAL` acoplada a `operation_id` y filtrado de ruido de lease. | Fases 2 (2.3), 3 (3.4) y 4 |
| `A-04` | `chk_cpa_active_requires_auth_user` + trigger `trg_cpa_enforce_immutability` (`id`, `client_id`, `created_by` inmutables; `created_by = auth.uid()` cuando hay JWT). | Fases 2 (2.1) y 3 (3.3) |
| `A-05` | Doble candado `has_portal_permission('creations', 'view', creation_id)` en `v_portal_fitting_sessions` y `v_portal_commercial_quotes` + `apr_*` (y `nullsFirst: false` cliente en E3). | Fases 6 y 7 (7.4, 7.5) |
| `A-06` | Catálogo explícito completo `NEG-01..NEG-23` (definiendo `NEG-16..NEG-18`, alineando `NEG-13` a `'locked'`/`429` y `NEG-20` a perfil ausente/rol inesperado) para ejecución real en Staging (`E5`). | Sección 5 de este documento |

---

## 2. Arquitectura SQL Canónica (`20261118000000_client_portal_m09.sql`)

La materialización SQL completa reside en [20261118000000_client_portal_m09.sql](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/supabase/migrations/20261118000000_client_portal_m09.sql) bajo transacción única (`BEGIN; ... COMMIT;`) en **10 fases topológicas**:

- **Fases 0–2:** Preflight compatible con `idx_atelier_appointments_client` de M08; rol `atelier_portal_reader` `NOBYPASSRLS` con membresía `WITH INHERIT FALSE, SET TRUE`; 4 tablas M09 con restricciones `CHECK` `chk_cpa_active_requires_auth_user`, `chk_cpi_lease_state_consistency` y `chk_cpp_creation_scope_required`.
- **Fases 3–4:** Triggers de integridad cruzada, append-only en bitácora, inmutabilidad en `client_portal_access`, y auditoría `business` en **2 capas** (`_portal_audit_business_change()` `SECURITY INVOKER` + `_portal_write_business_audit_row()` `SECURITY DEFINER` con `pg_trigger_depth() < 1`). Funciones `get_portal_access_id()`, `get_portal_client_id()`, `portal_owns_creation()`, `has_portal_permission()`, `_portal_lookup_auth_user_by_email()`, `log_portal_event()`, `claim_portal_invitation()`, `release_portal_invitation()` y `finalize_portal_invitation()`.
- **Fases 5–9:** RLS M09 sin política `INSERT` en bitácora; 7 políticas aditivas `FOR SELECT TO atelier_portal_reader` sin impacto en M00–M08 ni C15; 6 vistas `v_portal_*` (`security_barrier = true, security_invoker = false`, dueño `atelier_portal_reader`); `GRANT SELECT` exacto sobre `56` columnas en `7` tablas; cierre RPC de `portal_owns_creation` a `authenticated`/`anon`; verificación intra-transaccional en Fase 9 (cualificada con `pg_catalog.*` y auditoría de `pg_catalog.pg_auth_members`).
- **Endurecimiento técnico local de E1 (6 defectos reproducibles PG `17.11` corregidos en SQL sin ejecución remota):**
  1. Eliminación de `COALESCE(NEW.*, OLD.*)` en `_portal_audit_business_change()` mediante bifurcación estricta por `TG_OP` (`INSERT`/`UPDATE`/`DELETE`) y retorno explícito `IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;` (evita `SQLSTATE 55000`).
  2. Resolución de `portal_access_id` trasladada dentro de `_portal_write_business_audit_row()` (`SECURITY DEFINER`), retorno limpio cuando `permission_deleted` deriva de `ON DELETE CASCADE` tras eliminarse el padre, y `portal_access_id = NULL` con `deleted_portal_access_id` en `access_deleted` (evita `23503`/`23502`).
  3. Validación IP en `finalize_portal_invitation()` con casteo nativo `pg_catalog.inet` y `OPERATOR(pg_catalog.<<=)` rechazando CIDR `/`, sintaxis inválida (`invalid_rejected`) y rangos no públicos/loopback/RFC1918/CGNAT/IPv4-mapeados `::ffff:...` (`non_public_rejected`), normalizando IPs públicas con `pg_catalog.host()`.
  4. Bloqueo `SELECT ... FOR UPDATE` sobre `client_portal_access` antes de vincular identidad en `finalize_portal_invitation()`, rechazando con `SQLSTATE 23505` cualquier intento de re-vincular silenciosamente un `client_id` ya asociado a otro `auth_user_id`.
  5. Parseo booleano seguro de `p_legal_consents` sin casteo `::boolean` (evita `SQLSTATE 22P02` ante cadenas malformadas).
  6. Preflight `0.8` contra sobrecargas ambiguas en `public.is_admin_or_designer` (`count(*) <= 1`, `pronargs = 0` con `pg_catalog.*`) y validación explícita `inherit_option = false, set_option = true` en `pg_catalog.pg_auth_members` dentro de Fase 9.

---

## 3. Contrato Canónico de Edge Function `accept-portal-invitation` (`E2`)

### 3.1 Acciones e Intercambio JSON (`C-04`, `C-05`, `C-06`)

1. **`POST` `{ action: 'verify', token }` (JWT opcional):**
   - Calcula `SHA-256(token)` sin persistir ni retornar el token en claro.
   - Llama a `_portal_lookup_auth_user_by_email(invitation.email)` para determinar `account_hint` (`'existing_account' | 'new_account'`).
   - **Cero exposición PII a callers anónimos:** retorna `{ valid, status, code, masked_email, client_name, expires_at, account_hint, already_accepted_self, requires_legal_consent }` (nunca email completo en texto plano).
2. **`POST` `{ action: 'accept', token, operation_id, password?, full_name?, consents? }`:**
   - **Rama A (Cuenta ya existente en `auth.users`):** exige **obligatoriamente** `Authorization: Bearer <JWT>` verificado vía `auth.getUser(jwt)`. Sin JWT válido devuelve `401` (`code: 'requires_sign_in'`); si el email no coincide devuelve `409` (`code: 'account_mismatch'`); si `profiles.role` o `app_metadata.role` es privilegiado devuelve `403`.
   - **Rama B (Cuenta nueva):** exige server-side `ageConfirmed === true && termsAccepted === true && privacyAccepted === true` (`400 legal_consent_required`) y contraseña conforme (`>= 8`). Ejecuta `claim_portal_invitation` → `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })` **sin banderas booleanas de consentimiento** para evitar filas parciales/duplicadas en `handle_new_user()` → `finalize_portal_invitation(...)`.
   - **Saga y *Forward Recovery* (`M09-A:74`):** **PROHIBIDO invocar `auth.admin.deleteUser(...)`.** Cualquier fallo en `createUser` llama `release_portal_invitation(..., false)` (o autosana a los `15` minutos); errores SQL deterministas llaman `release_portal_invitation(..., true)`; timeouts/5xx ejecutan `reconcilePortalInvitationSaga` tripartita y, si persiste incertidumbre, retienen el lease devolviendo `504` (`Retry-After: 5`). Cualquier cuenta recién creada cuya vinculación no cerrase permanece `100%` inerte sin acceso `'active'` y converge en visita posterior mediante Rama A.
   - **Payload de respuesta compatible con `mapInvitationAcceptResponse` (`portalService.ts:2502`):** `{ accepted: true, status: 'accepted', idempotent: boolean, code: 'accepted' | 'already_accepted_self', access_status: 'active', requires_sign_in: boolean, session?: ... }`.

### 3.2 Identificación Confiable de IP para Consentimiento Legal (`C-04`)

- Ignorar cualquier `ip_address` enviada en el body JSON o en `user_metadata`.
- Extraer `ip_address` únicamente de encabezados de borde **que hayan superado la sonda de 4 vectores + 2 orígenes reales (`EGRESS_IP_1`, `EGRESS_IP_2`)** en Staging: `cf-connecting-ip` > `x-real-ip` > salto derecho confiable de `x-forwarded-for`. Si el gateway del entorno no supera spoofing con coincidencia exacta `=== EGRESS_IP_k`, persistir **`ip_address = NULL`** con `ip_source = 'untrusted_gateway_fallback'`.
- Fijar `accepted_at = pg_catalog.now()` en SQL y sanitizar `user_agent` HTTP (`<= 512` caracteres).

---

## 4. Protocolos Obligatorios en Staging Real (Controles `NO VERIFICADOS`)

Los tres controles críticos documentados en [M09_IMPLEMENTATION_ROADMAP_FINAL_REVIEW.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/M09_IMPLEMENTATION_ROADMAP_FINAL_REVIEW.md) permanecen **`NO VERIFICADOS`** hasta completar en PostgreSQL `17.11` / Staging real (batería SQL offline preparada y **NO EJECUTADA** en [verify_m09_e1_empirical_probes.sql](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/verify_m09_e1_empirical_probes.sql)):

1. **Control 1 — `security_barrier = true` anti side-channel (`NO VERIFICADO`):** Sonda no-`LEAKPROOF` dependiente de columna (`Var` con `int4div` confirmado `proleakproof = false`) calibrada positivamente sobre fila autorizada de Clienta A (`22012`), corrida contra fila oculta de Clienta B (`0` filas sin `22012`) y verificada con `EXPLAIN (VERBOSE)`.
2. **Control 2 — Guarda `SET LOCAL` en triggers `business` bajo PostgREST/PgBouncer (`NO VERIFICADO`):** Sonda empírica de 4 contextos reales (`anon`, `authenticated`, `service_role`, `postgres`), prueba de rechazo de GUCs bajo `authenticated`/`anon`, prueba de acoplamiento `skip_trigger` sin `operation_id`, y verificación de limpieza tras `COMMIT` y `ROLLBACK` sobre el **mismo `pg_backend_pid()`** en PgBouncer.
3. **Control 3 — Confianza de encabezados IP en gateway real (`NO VERIFICADO`):** Ejecución de los 4 vectores de spoofing (`CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For` simple/multicapa, body JSON + loopback/RFC1918) desde `EGRESS_IP_1` y `EGRESS_IP_2` contra Edge en Staging exigiendo coincidencia `=== EGRESS_IP_k` (o `NULL` fail-closed).

---

## 5. Catálogo Completo de Certificación Negativa `NEG-01..NEG-23` (`E5`, `A-06`)

> Estado actual de ejecución: **`0/23` ejecutadas (`PENDIENTE POST-MIGRACIÓN`)**.

| ID | Vector / Caso | Resultado Esperado y Criterio Verificable |
| :---: | :--- | :--- |
| `NEG-01` | Aislamiento multi-tenant en vistas + barrera `security_barrier` calibrada | `0` filas ajenas; sonda dependiente de `Var` dispara `22012` en Clienta A y retorna `0` filas sin `22012` en Clienta B; `EXPLAIN (VERBOSE)` limpio |
| `NEG-02` | Escalamiento horizontal DML en `client_portal_permissions` por clienta | Error PostgreSQL `42501` |
| `NEG-03` | Evento `business` vía `log_portal_event()` | Rechazo `42501` (`evento de telemetría no autorizado`) |
| `NEG-04` | `INSERT`/`UPDATE`/`DELETE` directo por PostgREST en `client_portal_activity_log` | Error `42501` (cero `GRANT` de escritura + trigger append-only) |
| `NEG-05` | Precedencia `deny-overrides` | Permiso específico `false` prevalece sobre global `true` |
| `NEG-06` | Invocación directa de RPCs Saga / `_portal_lookup_auth_user_by_email` / `portal_owns_creation` por `authenticated` | Error `42501` |
| `NEG-07` | Inyección cross-tenant de `creation_id` ajeno en `client_portal_permissions` | Error `23514` (`trg_validate_portal_permission_creation`) |
| `NEG-08` | Suplantación de correo entre invitación y `auth.users` | Error `23514` en `finalize_portal_invitation` |
| `NEG-09` | Fallo SQL con cuenta Auth preexistente | **NO `deleteUser`**; cuenta Auth preservada inerte sin acceso al portal |
| `NEG-10` | Sobrecarga de `metadata` > `2048` bytes en `log_portal_event` | Error `22023` |
| `NEG-11` | Replay de invitación con `status = 'accepted'` por operación/usuario distinto | Rechazo transaccional (`23505` / estado terminal) |
| `NEG-12` | Token vencido (`expires_at <= now()`) | Transición persistida a `'expired'` y rechazo sin vínculo |
| `NEG-13` | Concurrencia en aceptación (`A-06` alineado) | Lease activo retorna estado `'locked'` (HTTP `409`/`429`), no `55P03` |
| `NEG-14` | Escalamiento vertical en `profiles.role = 'designer'` por clienta | Bloqueado por `prevent_role_escalation()` (`42501`) |
| `NEG-15` | Revocación en caliente (`status = 'suspended'`/`'revoked'`) | `0` filas inmediatas en las 6 vistas con el mismo JWT vigente |
| `NEG-16` | Acceso directo de clienta al bucket privado `client-photos` (`A-06` nuevo) | Denegado (`42501`/`403`) por Storage RLS M01 (`is_admin_or_designer()`) |
| `NEG-17` | Mutación de `client_id` / `created_by` en `client_portal_access` (`A-04`, `A-06` nuevo) | Rechazado (`42501`) incluso para `designer`/`admin` o `service_role` |
| `NEG-18` | Inserción global (`creation_id IS NULL`) en `'creations'/'sketches'/'fabrics'/'fittings'` `'view'` (`A-03`, `A-06` nuevo) | Rechazado con `23514` (`chk_cpp_creation_scope_required`) |
| `NEG-19` | Persistencia real de caducidad sin rollback accidental | `status = 'expired'` y `lease_until IS NULL` confirmados tras `claim` vencido |
| `NEG-20` | Usuario sin fila en `profiles` o perfil preexistente válido (`A-06` alineado a M00 `NOT NULL`) | Inserta `profiles.full_name NOT NULL` sin `23502` o preserva perfil `client` existente sin sobrescribir roles ni causar `23505` |
| `NEG-21` | Consistencia `CHECK` `chk_cpi_lease_state_consistency` validado | `convalidated = true` en `pg_constraint` y `23514` ante estado inconsistente |
| `NEG-22` | Conciliación Saga tripartita post-timeout | `200` solo con terna verificada `'accepted' + 'active' + auth_user_id`; `403`/`409`/`504` según anomalía |
| `NEG-23` | Preflight M09 compatible con `idx_atelier_appointments_client` (`C-02`) + C15 + Post-Check | Notificación exitosa sin errores con M00–M08 e índice parcial M08 intactos |
