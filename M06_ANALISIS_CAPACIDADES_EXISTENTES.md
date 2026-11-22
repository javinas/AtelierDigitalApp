# MÓDULO 06 — ANÁLISIS DE CAPACIDADES EXISTENTES Y DEFINICIÓN MVP
**Pruebas y Ajustes (*Fittings, Correcciones en Cuerpo Real y Ceremonial de Entrega*) — Atelier Digital By Katherine Carroll**  
**Fecha de auditoría:** 2026-11-11  
**Tipo de documento:** Auditoría técnica de solo lectura (sin modificaciones a código, SQL, migraciones ni módulos existentes)

---

## 1. Propósito y Criterios de Auditoría

Este documento inventaría lo que **ya existe y opera** en los módulos desplegados (M00–M05 y Componente 13), identifica los **vacíos funcionales reales** para la etapa de pruebas de vestuario y entrega en alta costura, delimita las fronteras con **M02/C13**, **M03**, **M08** y **M09**, y define una **propuesta mínima de alcance MVP para M06** alineada con la identidad *Atelier de Autor* (cuaderno editorial de taller, **no** un ERP industrial).

**Fuentes verificadas en el repositorio:**
- Índice y continuidad: [`PROJECT_INDEX.md`](PROJECT_INDEX.md), [`ANTIGRAVITY_CONTINUITY.md`](ANTIGRAVITY_CONTINUITY.md), [`M04_ALCANCE_FUNCIONAL.md`](M04_ALCANCE_FUNCIONAL.md), [`M04_ARQUITECTURA_TECNICA.md`](M04_ARQUITECTURA_TECNICA.md).
- Esquema SQL desplegado: [`20261014210000_modulo02_measurements_patterns.sql`](supabase/migrations/20261014210000_modulo02_measurements_patterns.sql), [`20261017100000_creations_module.sql`](supabase/migrations/20261017100000_creations_module.sql), [`20261108000000_commercial_cycle_module_03.sql`](supabase/migrations/20261108000000_commercial_cycle_module_03.sql), [`20261109000000_design_moodboard_library_m04.sql`](supabase/migrations/20261109000000_design_moodboard_library_m04.sql).
- Servicios, tipos e interfaces: [`patternService.ts`](src/services/patternService.ts), [`pattern.ts`](src/types/pattern/pattern.ts), [`creationService.ts`](src/services/creationService.ts), [`commercialService.ts`](src/services/commercialService.ts), [`commercial.ts`](src/types/commercial.ts), [`PatternStudioFittingTab.tsx`](src/components/pattern/PatternStudioFittingTab.tsx), [`PatternAdjustmentsModal.tsx`](src/components/pattern/PatternAdjustmentsModal.tsx), [`CreationFlowViews.tsx`](src/components/pattern/creationFlow/CreationFlowViews.tsx), [`CreationDetailView.tsx`](src/components/creations/CreationDetailView.tsx), [`creationsModel.ts`](src/components/creations/creationsModel.ts), [`ProjectExecutionTab.tsx`](src/components/commercial/ProjectExecutionTab.tsx), [`CreationLogbookTab.tsx`](src/components/commercial/CreationLogbookTab.tsx), [`app/(designer)/index.tsx`](app/(designer)/index.tsx), [`app/(client)/index.tsx`](app/(client)/index.tsx).

---

## 2. Inventario de Capacidades Reutilizables Existentes

### 2.1. Módulo 02 y Componente 13 (Patronaje CAD y Fitting Paramétrico)

| Capa | Elemento existente | Capacidad real verificada | Uso frente a M06 |
| :--- | :--- | :--- | :--- |
| **SQL** | `public.pattern_executions` | Snapshots técnicos inmutables ligados a `client_id`, `session_id`, `parent_execution_id` y `creation_id` (opcional). Trigger `protect_pattern_execution_snapshot()` permite mutar únicamente `status` (`draft`, `generated`, `needs_revision`, `pending_fitting`, `approved_by_designer`) y `notes`. Exige paso por `pending_fitting` antes de aprobar. | **Reutilizar en lectura** como linaje técnico del patrón asociado a la Creación. |
| **SQL** | `public.pattern_adjustments` | Bitácora ligada obligatoriamente a `execution_id` (`ON DELETE RESTRICT`) con `adjustment_type` (`waist`, `shoulder`, `sleeve`, `length`, `crotch`, `bust_dart`, `custom`), `target_piece`, `delta_mm`, `description`, `fitting_date`, `recorded_by` protegido por `protect_pattern_adjustment_authorship()`. | **No duplicar** para ajustes CAD. M06 debe mostrarlos en lectura/contexto si la Creación tiene patrón CAD. |
| **Tipos** | `FIT_ADJUSTMENT_TYPES`, `FITTING_DIAGNOSTIC_ZONES`, `TECHNICAL_LOCATIONS`, `AdjustmentAction` (`src/types/pattern/pattern.ts`) | Catálogo de 12 códigos de ajuste CAD (`bust`, `waist`, `hip`, `shoulder`, `armhole`, `neckline`, `sleeve`, `sleeve_cap`, `garment_length`, `dart`, `ease`, `other`), 13 zonas de diagnóstico (`escote`, `hombro`, `sisa`, `busto`, `cintura`, `cadera`, `centro_delantero`, `centro_espalda`, `costado`, `manga`, `copa_manga`, `largo`, `ruedo`) y acciones de ajuste. | **Reutilizar nomenclatura/zonas** en el vocabulario de M06 para coherencia futura con M10 (IA). |
| **Servicios** | `patternService.ts` (`validatePatternAdjustmentInput`, `recordPatternAdjustment`, `createAdjustedChildExecution`, `createMultiAdjustedChildExecution`, `approvePatternExecution`, `buildExecutionTraceability`) | Validación numérica estricta (> 0 y ≤ 500 mm; rechazo de `NaN`/`Infinity`), registro de ajustes CAD y regeneración determinística de versiones hijas (`v1.0 → v1.1`) manteniendo intacto el patrón padre y actualizando `creations.active_pattern_execution_id`. | **Permanecen en M02.** M06 enlaza hacia M02 cuando un ajuste requiera re-trazado geométrico CAD. |
| **UI M02** | `PatternStudioFittingTab.tsx`, `PatternAdjustmentsModal.tsx`, `CreationFittingNotebook` (`CreationFlowViews.tsx`) | Tabla de ajustes de fitting CAD, flujo staged de regeneración paramétrica y cuaderno visual interactivo sobre fotografía estática de referencia (`toile_muslin.jpg`) con pines anatómicos y modal de zoom. | **Conservar en M02** para trabajo de patronaje; evitar reescribir la mesa CAD dentro de M06. |

### 2.2. Núcleo de Creaciones y Módulo 03 (Ciclo Comercial, Taller, Medios y Bitácora)

| Capa | Elemento existente | Capacidad real verificada | Uso frente a M06 |
| :--- | :--- | :--- | :--- |
| **SQL** | `public.creations` | `status` ya contempla `'fitting'` (*En Fitting*), `'approved'` (*Aprobada*), `'production'` (*En Confección*), `'completed'` (*Finalizada*); `creation_type` incluye `'alteration'` (*Restauración & Transformación*); puntero opcional `active_pattern_execution_id`. | **Entidad ancla de M06** (`creation_id`), manteniendo compatible las creaciones sin patrón CAD. |
| **SQL** | `public.creation_commercial_profiles` | Satélite 1:1 con `delivery_status` (`'pending'`, `'in_fitting'`, `'ready'`, `'delivered'`) y `delivery_date_actual`. | **Sincronizar desde M06** al avanzar pruebas y confirmar entrega, sin alterar su estructura salvo adiciones estrictas si hicieran falta. |
| **SQL** | `public.atelier_projects` | Proyecto operativo único por cotización (o directo) con 8 etapas en `current_stage`: incluye `'first_fitting'`, `'adjustments'`/`'fitting_adjustments'`, `'second_fitting'`, `'finishing'`/`'hand_finishing'`, `'delivered'`/`'final_delivery'`, `assigned_tailor`, `estimated_delivery_date` y `actual_delivery_date`. | **Reutilizar como eje de taller M03.** M06 aporta profundidad de sesiones/fotos/checklist en lugar de duplicar etapas. |
| **SQL** | `public.commercial_media_assets` | Tabla desplegada y protegida con RLS (`is_admin_or_designer()`), con `creation_id`, `proposal_id`, `quote_id`, `project_id`, `asset_type` (`'sketch'`, `'fabric_swatch'`, **`'fitting_photo'`**, `'payment_receipt'`, **`'delivery_note'`**, `'other'`), `file_path`, `file_name`, `mime_type`, `file_size_bytes`, `description`. | **Reutilizable directamente en M06** para fotografías reales de fitting y soporte documental de entrega (evaluar columna opcional de enlace a sesión de prueba si se agrupa por ronda). |
| **SQL** | `public.commercial_events` | Bitácora inmutable por creación con `event_type` CHECK ya preparado con **`'fitting_scheduled'`**, **`'fitting_completed'`**, **`'fitting'`**, `'stage_advanced'` y **`'delivery_completed'`**. | **Reutilizar directamente** para registrar hitos auditables de cada sesión de prueba, aprobación de calce y entrega. |
| **Storage** | Bucket privado `commercial-assets` | `public = false`, límite 10 MB (`10485760` bytes), MIME `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, políticas RLS `designer/admin`. | **Reutilizar directamente** (evitar proliferar buckets); ampliar scopes lógicos de ruta (ej. `fittings`, `deliveries`). |
| **Servicios** | `commercialService.ts` | Ya expone `fetchMediaAssetsByCreation`, `createMediaAsset`, `recordCommercialEvent`, `fetchCommercialEventsByCreation`, `fetchProjectByCreation`, `updateProject`, `upsertCommercialProfile`, además de la infraestructura probada en M05 de Storage (`pickAndUploadCommercialAssetImage`, `uploadCommercialAsset`, `createCommercialAssetSignedUrl`, `createCommercialAssetSignedUrls`, `cleanupUnusedCommercialAsset`). | **Base directa para M06** (evitando duplicar lógica de subida, firmado URL y borrado seguro tras reemplazo). |
| **UI M03 / Creaciones** | `CreationDetailView.tsx`, `creationsModel.ts`, `ProjectExecutionTab.tsx`, `CreationLogbookTab.tsx` | Stepper editorial de 7 pasos (`Concepto`, `Medidas`, `Patronaje`, `Fitting`, `Aprobación`, `Confección`, `Finalizada`), pestaña `'fitting'` y Sección 4 dedicada en la ficha de creación, más stepper operativo de 8 etapas en `ProjectExecutionTab.tsx`. | **Reemplazar la Sección 4 estática** por el módulo real de M06 e integrar visualmente con Confección y Bitácora. |

### 2.3. Navegación Home y Portal Clienta (M09 futuro)

- **Home Diseñadora ([`app/(designer)/index.tsx`](app/(designer)/index.tsx)):** Existe la tarjeta placeholder **`Pruebas & Entregas`** (`PRÓXIMO`): *"Agenda de fitting sobre glasilla (toile), seguimiento de correcciones en cuerpo real y ceremonial de entrega"*.
- **Portal Clienta ([`app/(client)/index.tsx`](app/(client)/index.tsx)):** Vista informativa estática para el rol `client` anunciando futuro seguimiento de medidas, estado de confección y citas de pruebas; actualmente todas las tablas de M01–M05 limitan acceso RLS a `public.is_admin_or_designer()`.

---

## 3. Vacíos Funcionales Reales Detectados

1. **Sección 4 de `CreationDetailView.tsx` es texto fijo simulado (Gap crítico):**
   - En [`CreationDetailView.tsx`](src/components/creations/CreationDetailView.tsx#L569-L614), la sección `4. FITTING & PRUEBAS DE VESTUARIO` muestra texto hardcodeado en todas las creaciones (*"Chaqueta Sastre Base · Retor de algodón"*, *"2 pruebas registradas con clienta Laura Martínez"*, *"Sisa reducida 5 mm..."*, *"v1.1 Aprobada"*), sin leer datos reales de Supabase ni ofrecer acciones.
2. **Inexistencia de entidad "Sesión / Ronda de Prueba de Vestuario" (`fitting_sessions`):**
   - Hoy no existe tabla ni modelo para distinguir **Prueba 1 (glasilla/toile)**, **Prueba 2 (tela definitiva/caída)** y **Prueba Final**, ni para guardar fecha prevista/real, estado de la sesión (*programada / realizada / requiere ajustes / aprobada*), postura/balance general o prendas **sin patrón CAD** (`manual_atelier`, drapeado libre sobre maniquí o alteraciones).
   - `pattern_adjustments` exige `execution_id NOT NULL` en `pattern_executions`, lo que deja sin registro de fitting a las creaciones desacopladas del motor CAD (violando en práctica la Regla 1 de Creaciones: *"Creación no depende obligatoriamente de patronaje"*).
3. **Ausencia de ajustes físicos en prenda real (separados de la regeneración CAD):**
   - En alta costura, tras cortar o hilvanar en tela real, la mayoría de correcciones finales de 2ª prueba (basta/largo con zapatos definitivos, aplomo de hombrera, ajuste de forro, pinzas artesanales, posicionamiento de bordado o broches) se ejecutan a mano en taller **sin regenerar un nuevo patrón DXF**.
   - Hoy no existe seguimiento de estado operativo por ajuste físico (`pendiente` → `aplicado en taller` → `verificado en prueba`) ni diferenciación entre corrección física directa en prenda vs. corrección que requiere volver a M02/C13.
4. **Tabla `commercial_media_assets` sin uso real en interfaz ni Storage:**
   - Una búsqueda integral en `src/` y `app/` confirma **0 componentes** llamando a `createMediaAsset` o `fetchMediaAssetsByCreation`.
   - Tampoco se usa el valor `'fitting_photo'` ni `'delivery_note'`. La diseñadora no puede subir fotografías privadas reales de las pruebas (frente, perfil, espalda, zoom de alfileres/defectos) con URL firmada ni adjuntar comprobante de entrega.
5. **Desconexión entre etapas de fitting, estado comercial y bitácora:**
   - Cambiar etapas en [`ProjectExecutionTab.tsx`](src/components/commercial/ProjectExecutionTab.tsx) (`first_fitting`, `adjustments`, `second_fitting`, `delivered`) actualiza únicamente `atelier_projects`, pero **no** actualiza `creation_commercial_profiles.delivery_status`, **no** genera eventos automáticos en `commercial_events` (`fitting_scheduled`, `fitting_completed`, `delivery_completed`) y **no** verifica si quedaron ajustes abiertos antes de pasar a entrega.
   - Además, `ProjectExecutionTab.tsx` aún usa `Alert.alert(...)` (silencioso en Web según hallazgo P1 de M05) y `toISOString().split('T')[0]` en UTC (hallazgo P5) al marcar entrega.
6. **Sin checklist de aprobación de calce ni acta/ceremonial de entrega:**
   - Falta un cierre formal de atelier para validar que el calce fue aprobado y documentar la entrega final (checklist de terminación, fecha real, observaciones de entrega, nota/soporte `'delivery_note'` y enlace con estado financiero/saldo informativo sin duplicar caja M03/M07).
7. **Sin vista transversal de agenda operativa de pruebas y entregas para la diseñadora:**
   - La diseñadora no tiene un tablero consolidado (desde la tarjeta de Home `Pruebas & Entregas`) para ver de un vistazo qué encargos están en `first_fitting` / `second_fitting`, qué ajustes siguen pendientes antes de la próxima cita o qué prendas están listas para entrega.

---

## 4. Fronteras y Relaciones con Otros Módulos

### 4.1. Relación M06 ↔ M02 / C13 (Patronaje CAD)
- **Propiedad de M02/C13:** Generación geométrica, curvas Bézier, medidas antropométricas, `pattern_executions`, `pattern_adjustments`, validación matemática de `createMultiAdjustedChildExecution`, exportación DXF/SVG/PDF y `approvePatternExecution`.
- **Cómo integra M06 sin duplicar:**
  - M06 muestra un bloque de contexto **solo lectura** cuando `creation.active_pattern_execution_id` existe (versión activa `v1.x`, estado `'pending_fitting'`/`'approved_by_designer'` y los `pattern_adjustments` ya guardados en M02).
  - Si durante una prueba física la diseñadora detecta un error estructural que exige nuevo trazado geométrico, M06 registra la observación en la sesión y ofrece acceso directo `"Ir a Fitting CAD (M02)"` sin duplicar formularios ni lógica del motor paramétrico.
  - Si la creación no usa patrón CAD (drapeado directo, transformación `alteration` o patronaje externo), M06 funciona al **100%** sin exigir `pattern_executions`.

### 4.2. Relación M06 ↔ M03 (Ciclo Comercial y Taller)
- **Propiedad de M03:** Propuestas económicas v1..vn, cotizaciones A4, pagos/caja (`financial_movements`), asignación de sastre/prioridad en `atelier_projects`, catálogo de materiales y stock (M05).
- **Cómo integra M06 sin duplicar y sin convertirse en ERP:**
  - **Storage y medios:** Reutiliza `commercial_media_assets` + bucket privado `commercial-assets` con URLs firmadas y limpieza post-confirmación.
  - **Bitácora inmutable:** Emite eventos en `commercial_events` (`fitting_scheduled`, `fitting_completed`, `delivery_completed`) reutilizando los tipos ya contemplados en la restricción `CHECK` de M03.
  - **Estados sincronizados (coherencia sin rigidez):** Al completar rondas o entrega en M06, actualiza de forma limpia `creation_commercial_profiles.delivery_status` (`in_fitting` / `ready` / `delivered`) y opcionalmente sugiere/sincroniza la etapa correspondiente en `atelier_projects` si existe proyecto activo, sin bloquear creaciones que aún no tengan cotización formal.
  - **Exclusiones anti-ERP:** M06 **no** gestiona partes de horas, capacidad de planta, órdenes de trabajo por operario, códigos de barras, logística de envíos externos ni facturación.

### 4.3. Relación M06 ↔ M08 (Agenda) y M09 (Portal de Clientas)
- **Frontera con M08 (Agenda):** M06 registra las fechas/horas de cada prueba (`scheduled_at` / `conducted_at`) como atributo propio del ciclo de fitting de la Creación, pero **no** construye calendarios complejos, bloqueos por sala ni sincronización con Google Calendar.
- **Preparación limpia para M09 (Portal de Clientas y Aprobaciones):**
  - Todo el acceso RLS en M06 permanecerá restringido a `public.is_admin_or_designer()` mientras M09 no se diseñe explícitamente (consistente con M01–M05).
  - Sin embargo, el modelo de datos de M06 debe estructurar de origen:
    1. Resumen legible por sesión de prueba (ronda, fecha, estado).
    2. Galería tipada en `commercial_media_assets` (distinguiendo fotos internas de trabajo vs. aptas para mostrar luego a clienta, o metadatos estructurados).
    3. Hito explícito de **Aprobación de Calce / Conformidad de Entrega** (quién confirma, cuándo y resumen), para que M09 pueda consultar y permitir aprobación remota de la clienta sin migrar ni reescribir tablas base de M06.
- **Preparación para M10 (Copiloto IA):** Usar códigos estructurados de zona anatómica (alineados con `FITTING_DIAGNOSTIC_ZONES`), tipo de ronda (`toile`, `second_fitting`, `final_fitting`) y severidad/resolución, evitando texto libre sin categorizar.

---

## 5. Propuesta Mínima de Alcance MVP para M06 (`Pruebas y Ajustes`)

El MVP recomendado para **M06 — Pruebas y Ajustes** se limita estrictamente a **cuatro capacidades nucleares de alta costura**:

### 5.1. Modelo de Datos Mínimo (Aditivo, No Destructivo)
- **No tocar** `public.creations`, `public.pattern_executions` ni `public.pattern_adjustments`.
- **2 tablas satélite nuevas** (o 1 tabla de sesiones + 1 de correcciones físicas en prenda, enlazadas a `creations.id` `ON DELETE CASCADE` y opcionalmente a `atelier_projects.id` / `pattern_executions.id` `ON DELETE SET NULL`):
  1. `atelier_fitting_sessions`: ronda (`toile_first`, `second_fitting`, `final_fitting`, `alteration_check`), número de prueba, título/objetivo, estado (`scheduled`, `completed`, `adjustments_required`, `approved`), fecha programada y fecha ejecutada, notas de postura/caída/escote/ruedo, indicación de conformidad en cuerpo real (`client_satisfied` / `approved_at`) y metadata estructurada.
  2. `atelier_fitting_adjustments` (correcciones físicas de prenda en prueba, distintas de `pattern_adjustments`): vinculada a `fitting_session_id` y `creation_id`, zona anatómica estructurada (alineada a `FITTING_DIAGNOSTIC_ZONES`), tipo de ajuste físico (`hem`, `silhouette_pin`, `shoulder_pad`, `lining`, `closure`, `drape`, `embroidery_fit`, `cad_repattern_needed`, `other`), descripción concreta, estado de taller (`pending`, `applied`, `verified`) y referencia opcional si derivó en una revisión CAD M02.
- **Reutilización directa de `commercial_media_assets`:** vincular fotos de fitting (`asset_type = 'fitting_photo'`) y soporte de entrega (`asset_type = 'delivery_note'`) agregando únicamente una columna nullable `fitting_session_id` (aditiva con `ON DELETE SET NULL`), almacenando archivos privados en el bucket existente `commercial-assets` (p. ej. scopes `fittings` y `deliveries`).
- **Aprobación / Ceremonial de Entrega en perfil/sesión:** aprovechar `creation_commercial_profiles.delivery_status` / `delivery_date_actual` + un resumen estructurado de entrega (fecha, observaciones de entrega, confirmación de conformidad de calce y acta/soporte `'delivery_note'`), emitiendo eventos reales en `commercial_events`.

### 5.2. Superficies de Interfaz Mínimas (Estética *Atelier de Autor*)
1. **Pestaña `Fitting` y Sección 4 real dentro de `CreationDetailView.tsx` (reemplazando la tarjeta estática actual):**
   - Línea de sesiones de prueba de la Creación (crear/programar prueba, marcar realizada, editar notas de calce, aprobar calce).
   - Galería fotográfica privada de cada prueba (`commercial-assets` con URL firmada, subir/ver/eliminar con confirmación).
   - Checklist de correcciones físicas en prenda por zona con estado `Pendiente → Aplicado → Verificado` + bloque de lectura de los ajustes CAD de M02 (`pattern_adjustments`) si existen.
   - Bloque de **Cierre y Ceremonial de Entrega** (verificación de ajustes cerrados, registro de entrega conforme, foto/nota de entrega y sincronización limpia con `delivery_status` / `commercial_events`).
2. **Pantalla transversal ligera `app/(designer)/fittings.tsx` (conectada a la tarjeta *Pruebas & Entregas* en Home):**
   - KPIs sobrios de taller (pruebas próximas/activas, prendas con ajustes pendientes, listas para entrega).
   - Tres vistas filtrables por estado: *En Pruebas (Fitting)*, *Ajustes Pendientes* y *Listas para Entrega / Entregadas*, permitiendo abrir el detalle de la Creación directamente en la pestaña `Fitting`.
   - Uso obligatorio de banners inline compatibles con Web/iOS/Android (evitando `Alert.alert`), fechas locales y limpieza segura en Storage siguiendo los aprendizajes de M05 Bloque 2.1.

---

## 6. Resumen Ejecutivo: Qué se Reutiliza vs. Qué se Construye en M06

| Capacidad | Decisión arquitectónica |
| :--- | :--- |
| Patronaje paramétrico, deltas CAD y regeneración `v1.0 → v1.1` | **Se mantiene en M02 / C13** (M06 solo enlaza y muestra en lectura). |
| Bucket `commercial-assets`, firmado URL y `cleanupUnusedCommercialAsset` | **Se reutiliza desde M03 / M05** sin crear nuevos buckets. |
| `commercial_media_assets` (`fitting_photo`, `delivery_note`) y `commercial_events` | **Se activa su uso real** desde M06 (hoy no tienen UI). |
| `creation_commercial_profiles.delivery_status` y `atelier_projects.current_stage` | **Se sincronizan desde M06** respetando flujos M03 existentes. |
| Registro de rondas de prueba (toile/definitiva/final), fotos y ajustes físicos en prenda | **Se construye nuevo en M06** (vacío funcional real confirmado). |
| Checklist de aprobación de calce, ceremonial de entrega y bandeja Home `Pruebas & Entregas` | **Se construye nuevo en M06** con alcance MVP sobrio de alta costura. |
| Agenda multi-calendario, pagos/finanzas y vista autenticada de clienta | **Fuera de M06** (M03/M07 ya cubre pagos; agenda avanzada es M08; portal clienta es M09). |

