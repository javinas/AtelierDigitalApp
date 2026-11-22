# PROCEDIMIENTO OPERATIVO DE DESPLIEGUE CONTROLADO: ENTREGA E2
**Edge Function `accept-portal-invitation` — Módulo M09**  
**Atelier Digital App — By Katherine Carroll**  
**Proyecto Destino:** `trgoqqvsprknswobvniu` (`atelier-digital`, Entorno: Producción, PostgreSQL `17.11`)  
**Estado:** **PREPARACIÓN COMPLETA · CANDADOS FAIL-CLOSED ACTIVOS · DETENIDO ANTES DE DESPLIEGUE**  
**Fecha de Elaboración:** 2026-11-21  

---

## 1. Comprobaciones Previas de Plataforma y Entorno

| Verificación | Herramienta / Fuente | Valor Comprobado | Estado |
| :--- | :--- | :--- | :---: |
| **Versión Supabase CLI** | `npx supabase --version` | `3.2.0` | **APTO** |
| **Proyecto Vinculado** | `supabase/.temp/linked-project.json` | `trgoqqvsprknswobvniu` (org: `kxgrwgqmbwfkdptlrhqw`) | **APTO** |
| **Entorno de Ejecución** | PostgreSQL Catálogo | PostgreSQL `17.11` (Fase E1 aplicada con COMMIT verificado) | **APTO** |
| **Runtime de Edge Function** | Deno Standard / ESM | Deno runtime (`deno.json`: `allowJs: true`, `strict: true`, `deno.window`) | **APTO** |
| **Compatibilidad de Módulos** | `index.ts` / `emailService.ts` | `https://deno.land/std@0.177.0/http/server.ts`, `@supabase/supabase-js@2.39.0` (ESM) | **APTO** |
| **Compilación TypeScript** | `npx tsc --noEmit` | `Exit Code 0` (0 errores de tipos en todo el proyecto) | **APTO** |
| **Regresión de Pruebas E2** | `verify_m09_e2_edge_function.cjs` | **90 / 90 PASS (100%)** | **APTO** |

---

## 2. Inventario de Variables de Seguridad y Secretos

> [!IMPORTANT]
> **Principio de Mínima Exposición:** Únicamente se catalogan los **nombres** de las variables de entorno y secretos requeridos. Sus valores confidenciales no se almacenan en archivos de versión ni se imprimen en bitácoras.

### A. Variables Autoinyectadas por Supabase Platform (No requieren configuración manual)
- `SUPABASE_URL`: URL base del proyecto para conexión interna.
- `SUPABASE_ANON_KEY`: Llave pública anónima de la plataforma.
- `SUPABASE_SERVICE_ROLE_KEY`: Llave administrativa para ejecutar los RPCs autorizados (`claim`, `release`, `finalize`).
- `DENO_DEPLOYMENT_ID`: Identificador de despliegue en Deno Deploy.

### B. Variables de Seguridad Operativa y Candados (Fail-Closed)
- `PORTAL_ACCEPTANCE_ACTIVE`:  
  - **Valor Requerido:** `'false'` (o no definida).  
  - **Función:** Bloquea de forma preventiva cualquier aceptación real de invitaciones (`HTTP 503 preflight`), permitiendo desplegar y auditar la función sin riesgo de mutaciones prematuras.
- `PORTAL_EMAIL_DISPATCH_ENABLED`:  
  - **Valor Requerido:** `'false'` (o no definida).  
  - **Función:** Bloquea todo intento de despacho de correo hacia proveedores externos, forzando modo simulado seguro con cero PII en logs.
- `PORTAL_IP_GATEWAY_CERTIFIED`:  
  - **Valor Inicial:** `'false'`.  
  - **Función:** Indica si el Edge Gateway ya superó los 4 vectores de spoofing desde 2 orígenes reales.
- `PORTAL_TEST_BYPASS_SECRET`:  
  - **Valor Inicial:** *No configurado* en producción (asegura que no exista ningún atajo ni bypass de prueba).
- `RESEND_API_KEY`:  
  - **Estado:** Secreto para envío SMTP/API (inactivo mientras `PORTAL_EMAIL_DISPATCH_ENABLED = false`).
- `PORTAL_EMAIL_FROM`:  
  - **Valor por defecto:** `'Katherine Carroll <invitaciones@atelierdigital.co>'`.

---

## 3. Verificación de Inexistencia de Rutas Alternativas

1. **Candado de Aceptación (`index.ts`):**  
   Evaluado en la línea de entrada de `action === 'accept'`. Si `PORTAL_ACCEPTANCE_ACTIVE !== 'true'`, el servidor aborta inmediatamente con `HTTP 503` y código `acceptance_disabled_preflight`, sin consultar la base de datos ni invocar `claim_portal_invitation`. La condición de bypass exige un secreto explícito de al menos 16 caracteres configurado en las variables del servidor; al no existir en producción, es matemáticamente imposible eludir el bloqueo.
2. **Candado de Despacho de Correo (`emailService.ts`):**  
   Evaluado al inicio de `dispatchPortalInvitationEmail`. Si `PORTAL_EMAIL_DISPATCH_ENABLED !== 'true'`, retorna inmediatamente `{ sent: false, simulated: true, reason: 'dispatch_disabled_by_protocol' }` sin instanciar peticiones de red hacia Resend u otros proveedores.

---

## 4. Comando Exacto de Despliegue Técnico

```powershell
# Ejecución exclusiva en ventana de mantenimiento autorizada:
cmd /c "npx supabase functions deploy accept-portal-invitation --project-ref trgoqqvsprknswobvniu --no-verify-jwt"
```

*Justificación técnica de `--no-verify-jwt`:*  
La Edge Function gestiona la acción `verify` (completamente anónima) y la Rama B de la acción `accept` (onboarding de clienta nueva sin cuenta previa en `auth.users`). La autenticación para la Rama A (clientas con cuenta existente) se verifica criptográficamente dentro del código mediante `auth.getUser(token)`.

---

## 5. Procedimiento de Reversión Inmediata (Rollback)

En caso de detección de anomalías, fallos de compilación en el Edge o comportamiento inesperado del gateway:

### Paso 1: Kill-Switch Instantáneo (0 Downtime)
Desactivar de inmediato cualquier procesamiento forzando los candados fail-closed:
```powershell
cmd /c "npx supabase secrets set PORTAL_ACCEPTANCE_ACTIVE=false PORTAL_EMAIL_DISPATCH_ENABLED=false --project-ref trgoqqvsprknswobvniu"
```

### Paso 2: Retiro de la Edge Function
Eliminar la Edge Function del gateway público de Supabase:
```powershell
cmd /c "npx supabase functions delete accept-portal-invitation --project-ref trgoqqvsprknswobvniu"
```

### Paso 3: Integridad de Base de Datos
- Las tablas y vistas creadas en la Entrega E1 (`client_portal_access`, `client_portal_invitations`, `client_portal_permissions`, `client_portal_activity_log`, `v_portal_*`) permanecerán **completamente intactas** con cero registros de clientes.
- La prenda protegida `C15` (`141693a0-01e8-498a-bbb3-1c4f98036543`) y las tablas M00–M08 no sufren ningún impacto, por lo que **no se requiere restauración de backup SQL**.

---

## 6. Comprobaciones HTTP Posteriores al Despliegue (Smoke Tests)

Una vez desplegada la función, se deben ejecutar secuencialmente las siguientes 4 pruebas sobre el endpoint público:  
`ENDPOINT = https://trgoqqvsprknswobvniu.supabase.co/functions/v1/accept-portal-invitation`

```powershell
# 1. Comprobación CORS (Preflight OPTIONS)
curl -i -X OPTIONS https://trgoqqvsprknswobvniu.supabase.co/functions/v1/accept-portal-invitation
# Criterio de Éxito: HTTP 200 OK con Access-Control-Allow-Origin: * y Access-Control-Allow-Methods: POST, OPTIONS

# 2. Comprobación Método No Permitido (GET)
curl -i -X GET https://trgoqqvsprknswobvniu.supabase.co/functions/v1/accept-portal-invitation
# Criterio de Éxito: HTTP 405 Method Not Allowed

# 3. Comprobación de Higiene en 'verify' (Token Inexistente)
curl -i -X POST https://trgoqqvsprknswobvniu.supabase.co/functions/v1/accept-portal-invitation `
  -H "Content-Type: application/json" `
  -d '{\"action\":\"verify\",\"token\":\"0000000000000000000000000000000000000000000\"}'
# Criterio de Éxito: HTTP 404 Not Found con JSON limpio {"valid":false,"code":"not_found"} sin errores de base de datos ni PII

# 4. Comprobación del Candado de Seguridad en 'accept'
curl -i -X POST https://trgoqqvsprknswobvniu.supabase.co/functions/v1/accept-portal-invitation `
  -H "Content-Type: application/json" `
  -d '{\"action\":\"accept\",\"token\":\"0000000000000000000000000000000000000000000\",\"operation_id\":\"a0000000-0000-4000-8000-000000000001\"}'
# Criterio de Éxito: HTTP 503 Service Unavailable con código "acceptance_disabled_preflight"
```

---

## 7. Plan de Ejecución del Protocolo de IP Gateway (4 Vectores / 2 Orígenes)

Conforme a `scratch/PROTOCOL_VERIFICACION_IP_GATEWAY_E2.md`:

### A. Detección de Orígenes de Salida
1. **`EGRESS_IP_1`:** Detectar IP pública de la conexión de desarrollo (e.g. `curl -s https://api.ipify.org`).
2. **`EGRESS_IP_2`:** Detectar IP pública de una segunda red independiente (e.g. hotspot móvil 4G/5G).

### B. Pruebas Adversarias de Spoofing (Ejecutadas desde ambos orígenes)
- **Vector 1 (`CF-Connecting-IP` inyectada):** Inyectar cabecera `CF-Connecting-IP: 203.0.113.199`. Comprobar que el reverse proxy sobrescribe el valor y la función extrae la IP real de egreso (`EGRESS_IP_k`).
- **Vector 2 (`X-Real-IP` inyectada):** Inyectar cabecera `X-Real-IP: 198.51.100.77`. Comprobar que no es priorizada.
- **Vector 3 (`X-Forwarded-For` multicapa):** Inyectar `X-Forwarded-For: 198.51.100.1, 203.0.113.50, 1.2.3.4`. Comprobar que el salto derecho corresponde a `EGRESS_IP_k`.
- **Vector 4 (Inyección privada / RFC 1918):** Inyectar `127.0.0.1` o `192.168.1.1`. Comprobar rechazo a `null` con `ip_source = 'non_public_rejected'`.

---

## 8. Checklist de Despliegue Técnico: APTO / NO APTO

| Criterio | Estado Actual | Veredicto |
| :--- | :---: | :---: |
| 90/90 Pruebas Unitarias E2 Aprobadas | **PASS** | **APTO** |
| Compilación TypeScript General (`tsc --noEmit`) | **Exit 0** | **APTO** |
| Migración E1 Aplicada y Verificada en Producción | **COMMIT Confirmado** | **APTO** |
| CLI Supabase `3.2.0` Autenticada y Proyecto Vinculado | **trgoqqvsprknswobvniu** | **APTO** |
| Candado de Aceptación Activo (`PORTAL_ACCEPTANCE_ACTIVE = false`) | **Verificado** | **APTO** |
| Candado de Correo Activo (`PORTAL_EMAIL_DISPATCH_ENABLED = false`) | **Verificado** | **APTO** |
| Procedimiento de Reversión Inmediata Formalizado | **Documentado** | **APTO** |
| Autorización Expresa del Usuario para Escritura Remota | **PENDIENTE** | **NO APTO (Detenido)** |

**DICTAMEN TÉCNICO:**  
La infraestructura se encuentra **ESTRICTAMENTE APTA** para el despliegue técnico con candados cerrados. Se detiene el proceso antes de invocar cualquier comando de despliegue remoto hasta contar con la autorización interactiva expresa del usuario.
