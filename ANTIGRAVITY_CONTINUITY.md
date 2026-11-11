# ANTIGRAVITY CONTINUITY — ATELIER DIGITAL APP

## A. Identificación
- **Proyecto:** Atelier Digital App (Expo / React Native)
- **Módulo:** Módulo 05 — Materiales y Proveedores (**ETAPA 1 BD + BLOQUE 1 SERVICIOS + BLOQUE 2 UI + BLOQUE 2.1 PULIDO Y CORRECCIONES P1–P6 COMPLETADOS**)
- **Fecha actualización:** 2026-11-11T10:38:00-05:00
- **Objetivo general:** Desplegada en producción (`trgoqqvsprknswobvniu`) la migración aditiva M05 (`20261110000000_materials_suppliers_m05.sql`) y completados el **Bloque 1** (contratos/servicios), **Bloque 2** (UI independiente + integración M03) y **Bloque 2.1** (corrección de P1–P6, fricciones móviles de pestañas/KPIs/categorías, señalización `"Sin tarifa USD"` en modal y reubicación de **Materiales y Proveedores** junto a **Creaciones** en Home), sin modificar SQL, migraciones, RLS, datos de producción, contratos de [`src/types/commercial.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/types/commercial.ts), M00–M04, C15 ni implementar las mejoras aplazadas. Validados `cmd /c npx tsc --noEmit` (código `0`), `cmd /c npx eslint` focalizado (0 errores, 0 advertencias), `cmd /c npx expo export -p web` (`dist/`), `verify_m05_stage0_contracts.cjs` (`ALL_M05_BLOQUE1_CONTRACT_ASSERTIONS_PASSED`), `verify_m05_bloque2_e2e.cjs` (`ALL_M05_BLOQUE2_E2E_VERIFICATIONS_PASSED`) con `0` registros residuales en producción y capturas reales de escritorio/móvil (`capture_m05_ux_screenshots.cjs` -> `ALL_UX_SCREENSHOTS_CAPTURED`).

## B. Implementaciones y Mejoras Aplicadas

- **0. Módulo 05 — Bloque 2.1: Correcciones P1–P6, Usabilidad Móvil, Guarda USD y Reubicación Home (SIN CAMBIOS DE SQL/CONTRATOS/MEJORAS APLAZADAS):**
  - **P1 · Avisos Web inline en reemplazo de `Alert.alert` ([`CreationMaterialsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationMaterialsTab.tsx), [`CreationQuotesTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationQuotesTab.tsx), [`MaterialsCatalogModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsCatalogModal.tsx)):**
    - Reemplazados todos los llamados `Alert.alert` en `CreationMaterialsTab.tsx` (propuesta aprobada bloqueada, conversión USD deshabilitada, errores de actualización/creación/aprobación/perfil) y `CreationQuotesTab.tsx` (cambio de estado, conversión a proyecto de taller y errores) por banners inline descartables (`feedbackNotice`).
    - Propagado `targetCurrency={currency}` a `MaterialsCatalogModal.tsx`; en propuestas `USD`, los materiales sin `unit_price_usd > 0` muestran la insignia **`Sin tarifa USD`**, el botón **`Requiere USD`** y un banner inline `usdWarningNotice` evitando cierres silenciosos del modal al seleccionarlos o al crear material sin tarifa USD.
  - **P2 · Home — Imagen limpia M04 y reubicación de Materiales y Proveedores ([`app/(designer)/index.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/(designer)/index.tsx)):**
    - Reemplazado `assets/reference_design.jpg` por `assets/editorial/legal_atelier_workspace.jpg` (sin texto promocional incrustado) en la tarjeta **Diseño, Moodboard & Biblioteca (M04)**.
    - Agregado el acceso directo **`✦ Materiales & Proveedores →`** dentro de la tarjeta **`02 CREACIONES`** y el botón **`Materiales y Proveedores`** junto a `Ver Expediente` en **`Continuar en el Atelier`**, retirando la tarjeta M05 de la sección inferior y restaurando la cuadrícula de 3 columnas (`colThird`).
  - **P3 · Confirmación explícita antes de Archivar ([`MaterialsStudioScreen.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsStudioScreen.tsx)):**
    - Pulsando `Archivar` sobre un material o proveedor activo se abre un `<Modal>` de confirmación (`¿Archivar material del catálogo?` / `¿Archivar proveedor del directorio?`) con opciones `Cancelar` y `Sí, archivar`, manteniendo la reactivación directa sobre registros ya archivados.
  - **P4 · Limpieza segura de Storage post-guardado ([`commercialService.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/services/commercialService.ts), [`MaterialFormModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialFormModal.tsx), [`SupplierFormModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/SupplierFormModal.tsx)):**
    - Implementado `cleanupUnusedCommercialAsset(storagePath, exclude)` en `commercialService.ts`: consulta `atelier_materials` y `atelier_suppliers` excluyendo el ID editado y elimina de `commercial-assets` únicamente si el conteo de otras referencias es `0` y las consultas no fallan.
    - En `MaterialFormModal.tsx` y `SupplierFormModal.tsx`, `cleanupUnusedCommercialAsset` se invoca exclusivamente tras confirmar la persistencia exitosa de `updateMaterial` / `updateSupplier` cuando `initialSavedPath !== (res.data.storage_path || null)`. Al cancelar edición, las fotos previas permanecen intactas.
  - **P5 · Fecha local en TRM Manual ([`ManualTrmPanel.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/ManualTrmPanel.tsx)):**
    - Corregido `getTodayIsoDate()` para calcular `YYYY-MM-DD` usando fecha local (`getFullYear`, `getMonth`, `getDate`) en lugar de `toISOString().slice(0, 10)` UTC.
  - **P6 y Fricciones Móviles ([`materialLabels.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/materialLabels.ts), [`MaterialsStudioScreen.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsStudioScreen.tsx), [`MaterialsCatalogModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsCatalogModal.tsx)):**
    - Agregado `getSwatchContrastTextColor(hex)` (`#171411` sobre tonos claros/dorados como `#A78350`, `#FAF7F2` sobre tonos oscuros como `#171411`, fallback `#A78350`) para los placeholder `✦`.
    - En `MaterialsStudioScreen.tsx`, las 4 pestañas (`Catálogo Textil`, `Proveedores`, `Bitácora de Stock`, `TRM Manual`) usan `flexWrap: 'wrap'` y los KPIs pasan a cuadrícula compacta 2×2 en móvil (`width < 720`). En `MaterialsCatalogModal.tsx`, las 8 categorías usan `flexWrap: 'wrap'` sin recorte horizontal.
  - **Validación Bloque 2.1:** `cmd /c npx tsc --noEmit` (`0`), `cmd /c npx eslint` focalizado (`0` errores, `0` advertencias), `cmd /c npx expo export -p web` (`dist/`), `verify_m05_stage0_contracts.cjs` (`ALL_M05_BLOQUE1_CONTRACT_ASSERTIONS_PASSED`), `verify_m05_bloque2_e2e.cjs` (`ALL_M05_BLOQUE2_E2E_VERIFICATIONS_PASSED`) y `capture_m05_ux_screenshots.cjs` (`ALL_UX_SCREENSHOTS_CAPTURED`).


- **0. Módulo 05 — Bloque 2: Pantalla Independiente, Navegación Home e Integración Visual:**
  - **Ruta Independiente y Seguridad de Navegación ([`app/(designer)/materials.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/(designer)/materials.tsx), [`app/(designer)/index.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/(designer)/index.tsx), [`app/_layout.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/_layout.tsx)):**
    - Agregada tarjeta interactiva **Módulo 05 · Activo (`Materiales, Proveedores & TRM`)** en el Home de diseñadora con layout responsivo de 4/2/1 columnas.
    - Incorporadas rutas `materials`/`library` en `NavigationGate` de `app/_layout.tsx` y guarda de rol `designer`/`admin` en `MaterialsStudioScreen.tsx` bloqueando el acceso al rol `client`.
  - **Componentes Modulares M05 (`src/components/commercial/`):**
    - [`materialLabels.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/materialLabels.ts): Diccionarios canónicos compartidos (8 categorías, 7 unidades, 7 perfiles de caída, 7 tipos de proveedor, 5 tipos de ajuste de stock y pares TRM) y formateadores de visualización.
    - [`MaterialsStudioScreen.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsStudioScreen.tsx): Pantalla completa con 4 KPIs y 4 pestañas (`Catálogo Textil`, `Proveedores`, `Bitácora de Stock`, `TRM Manual`), filtros avanzados, archivado/reactivación y firma en lote de imágenes privadas mediante `createCommercialAssetSignedUrls`.
    - [`MaterialFormModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialFormModal.tsx) y [`SupplierFormModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/SupplierFormModal.tsx): Modales responsivos de creación y edición con selector de proveedor M05, campos técnicos y carga de fotografía privada en `commercial-assets` con URL firmada (`pickAndUploadCommercialAssetImage`).
    - [`StockAdjustmentModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/StockAdjustmentModal.tsx): Modal de registro manual e historial cronológico estrictamente append-only (`purchase_entry`, `manual_in`, `manual_out`, `manual_count`, `initial_load`) sin botones de edición o borrado.
    - [`ManualTrmPanel.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/ManualTrmPanel.tsx): Gestión de TRM manual por par de divisas (`saveManualCurrencyRate`, `deactivateCurrencyRate`, historial) sin tasas quemadas ni reconversión automática.
  - **Integración Comercial M03 ([`MaterialsCatalogModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsCatalogModal.tsx), [`CreationMaterialsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationMaterialsTab.tsx), [`CreationQuotesTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationQuotesTab.tsx)):**
    - `MaterialsCatalogModal.tsx` reutiliza `MaterialFormModal`, `materialLabels.ts`, proveedores activos e imágenes con URL firmada en `commercial-assets`.
    - `CreationMaterialsTab.tsx` y `CreationQuotesTab.tsx` consultan `getActiveCurrencyRate('USD', 'COP')` como referencia visual informativa, preservando intactos presupuestos, moneda fija y ausencia de descuentos automáticos de stock.
  - **Validación Bloque 2:** `cmd /c npx tsc --noEmit` (código `0`), `cmd /c npx eslint` focalizado sobre los 14 archivos M05 (`0` errores, `0` advertencias), `cmd /c npx expo export -p web` (exitoso `dist/`), y suite Playwright `verify_m05_bloque2_e2e.cjs` (`ALL_M05_BLOQUE2_E2E_VERIFICATIONS_PASSED`) verificando flujos reales en producción + limpieza `0` residuales, aislamiento `client`, vistas responsivas Desktop/Tablet/Mobile y bitácora append-only de stock sin auto-descuentos.

- **0. Módulo 05 — Bloque 1: Contratos TypeScript y Capa de Servicios (SIN CAMBIOS DE UI/SQL):**
  - **Contratos Canónicos y DTOs M05 ([`src/types/commercial.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/types/commercial.ts)):**
    - Habilitadas las **8 categorías** (`REMOTE_SQL_SUPPORTED_MATERIAL_CATEGORIES = CANONICAL_MATERIAL_CATEGORIES`, desbloqueando `'embroidery'`) y **7 unidades** (`REMOTE_SQL_SUPPORTED_MATERIAL_UNITS = CANONICAL_MATERIAL_UNITS`, desbloqueando `'pkg'`) en `validateMaterialRemotePersistence` preservando aliases históricos `notion → notions` y `trim → trims`.
    - Incorporados `MATERIAL_DRAPE_PROFILES` / `normalizeMaterialDrapeProfile`, expansión aditiva de `MaterialItem`, `CreateMaterialDTO`, `UpdateMaterialDTO` y `MaterialFilter` (`supplier_id`, `supplier`, `sku_code`, `weight_gsm`, `drape_profile`, `care_instructions`, `storage_path`, `photo_url`, `tags`, `last_stock_check_at`, `created_by`, `unit_price_cop`).
    - Contratos M05 completos para Storage privado `commercial-assets` (`COMMERCIAL_ASSETS_BUCKET`, `COMMERCIAL_ASSET_MAX_BYTES = 10485760`, `COMMERCIAL_ASSET_ALLOWED_MIME_TYPES`, `CommercialStorageUploadInput`, `CommercialStorageUploadResult`), Proveedores (`SUPPLIER_TYPES`, `SUPPLIER_CURRENCIES`, `AtelierSupplierSummary`, `AtelierSupplier`, `CreateSupplierDTO`, `UpdateSupplierDTO`, `SupplierFilter`), Bitácora append-only de stock (`STOCK_ADJUSTMENT_TYPES`, `MaterialStockAdjustment`, `CreateStockAdjustmentDTO`) y TRM manual (`CURRENCY_RATE_BASE_CURRENCIES`, `CURRENCY_RATE_TARGET_CURRENCIES`, `AtelierCurrencyRate`, `CreateCurrencyRateDTO`, `UpdateCurrencyRateDTO`).
  - **Servicios M05 y Compatibilidad M03 ([`src/services/commercialService.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/services/commercialService.ts)):**
    - Ampliados `fetchMaterials`, `fetchMaterialById`, `createMaterial` y `updateMaterial` con soporte de las 8 categorías, 7 unidades, join ligero `supplier:atelier_suppliers(...)`, filtros M05 (`supplierId`, `drapeProfile`, `tag`, `withStockOnly`, búsqueda en `sku_code`), mapeo de `23505` en `sku_code` y fallback legado limitado a `PGRST205`.
    - Storage privado `commercial-assets`: `validateCommercialAssetFile`, `uploadCommercialAsset`, `pickAndUploadCommercialAssetImage` (importación dinámica de `expo-image-picker`), `createCommercialAssetSignedUrl`, `createCommercialAssetSignedUrls` y `removeCommercialAsset`.
    - Directorio `atelier_suppliers`: `fetchSuppliers`, `getSupplierById`, `createSupplier`, `updateSupplier` y `archiveSupplier` (sin escribir `photo_url`, mapeando duplicidad de `code`).
    - Bitácora estrictamente append-only `atelier_material_stock_adjustments`: `fetchStockAdjustmentsByMaterial`, `fetchRecentStockAdjustments` y `recordStockAdjustment` (soporta `quantity_delta` o `target_new_stock`, valida matemática no negativa y omite `created_by` para `DEFAULT auth.uid()`; cero funciones update/delete y cero descuentos automáticos en propuestas/cotizaciones/proyectos).
    - TRM manual `atelier_currency_rates`: `fetchActiveCurrencyRates`, `fetchCurrencyRateHistory`, `getActiveCurrencyRate`, `saveManualCurrencyRate` (desactiva par activo previo antes de insertar) y `deactivateCurrencyRate` (cero valores quemados como `4100` y cero conversiones automáticas).
  - **Validación Bloque 1:** `cmd /c npx tsc --noEmit` (código `0`), `cmd /c npx eslint src/types/commercial.ts src/services/commercialService.ts` (`0` errores, `0` advertencias), `verify_m05_stage0_contracts.cjs` (`ALL_M05_BLOQUE1_CONTRACT_ASSERTIONS_PASSED`) y `verify_m05_stage1_migration_static.cjs` (`ALL_M05_STAGE1_MIGRATION_STATIC_ASSERTIONS_PASSED`).

- **0. Módulo 05 — Etapa 1 (Auditoría Final Local de Privilegios y Trazabilidad — `20261110000000_materials_suppliers_m05.sql` DESPLEGADA Y VALIDADA):**
  - **Funciones Trigger Endurecidas (`SET search_path = ''`, revocadas a `PUBLIC, anon`):**
    - `public.update_m05_updated_at_column()`: actualización automática de `updated_at` en `atelier_suppliers` y `atelier_currency_rates`.
    - `public.prevent_m05_stock_adjustment_mutation()`: trigger `BEFORE UPDATE OR DELETE` en `atelier_material_stock_adjustments` que prohíbe todo `DELETE` y cualquier `UPDATE` ordinario proveniente de `authenticated`/`anon` (permite únicamente cascadas internas RI `ON DELETE SET NULL` con `pg_trigger_depth() > 0` sobre `creation_id`/`supplier_id`/`financial_movement_id` dejando intactos importes, `created_by` y auditoría, además de mantenimiento explícito vía `postgres`/`service_role`).
  - **Tabla `public.atelier_suppliers`:** Directorio de casas textiles, mercerías y talleres con `created_by DEFAULT auth.uid()`, clasificación `supplier_type`, contacto, moneda por defecto (`COP`/`USD`/`EUR`), `lead_time_days`, políticas de mínimo de compra, `specialty_tags`, `storage_path` (en `'commercial-assets'`), `is_preferred` e `is_active`.
  - **Evolución Aditiva de `public.atelier_materials` (Sin Duplicación):**
    - Normalización defensiva `btrim(lower(category)) = 'notion'` → `'notions'` y `'trim'` → `'trims'`.
    - Reemplazo idempotente de restricciones `CHECK` de columna única (`category` y `unit`) consultando `pg_constraint` + `pg_attribute`, habilitando las 8 categorías (`fabric`, `lining`, `interfacing`, `notions`, `trims`, `hardware`, `beading`, `embroidery`) y las 7 unidades (`m`, `cm`, `unit`, `pair`, `dozen`, `roll`, `pkg`), más checks no negativos para precios, compra mínima y stock.
    - Columnas aditivas: `supplier_id` (`FK -> atelier_suppliers ON DELETE SET NULL`), `sku_code`, `weight_gsm`, `drape_profile`, `care_instructions`, `storage_path`, `photo_url`, `tags`, `last_stock_check_at`, `created_by` (`DEFAULT auth.uid()`). Conservados `supplier_name`, `supplier_ref`, `trg_atelier_materials_updated_at` y política RLS de M03.
  - **Tabla `public.atelier_material_stock_adjustments` (Bitácora Append-Only):** Control estrictamente manual e informativo (`manual_count`, `manual_in`, `manual_out`, `purchase_entry`, `initial_load`), `material_id` con **`ON DELETE RESTRICT`**, `material_name_snapshot`, `unit_snapshot`, `created_by DEFAULT auth.uid()`, `CONSTRAINT chk_atelier_stock_adj_math CHECK (new_stock = previous_stock + quantity_delta)` y FKs contextuales opcionales (`creations`, `atelier_suppliers`, `financial_movements` con `ON DELETE SET NULL`), sin reservas ni descuentos automáticos.
  - **Tabla `public.atelier_currency_rates`:** Tasa de cambio manual configurable (`USD`/`EUR`/`COP`) con `updated_by DEFAULT auth.uid()` e índice único parcial para par activo (`is_active = TRUE`), sin tasas predeterminadas (`rate_value` sin `DEFAULT` ni `INSERT` semilla), sin conversiones automáticas ni API externa y sin tocar `public.atelier_settings`.
  - **Seguridad RLS y Privilegios Efectivos PostgreSQL:** `ENABLE ROW LEVEL SECURITY` y **`REVOKE ALL FROM PUBLIC, anon, authenticated`** en las 3 tablas nuevas (neutralizando `ALTER DEFAULT PRIVILEGES` de Supabase); `GRANT SELECT, INSERT, UPDATE, DELETE` (`TO authenticated`) + `GRANT ALL` (`TO service_role, postgres`) + `FOR ALL` (`is_admin_or_designer()`) en `atelier_suppliers` y `atelier_currency_rates`; en `atelier_material_stock_adjustments`, **`REVOKE ALL ... FROM PUBLIC, anon, authenticated` → `GRANT SELECT, INSERT TO authenticated`** (`GRANT ALL TO service_role, postgres`), políticas divididas `designer_admin_select_material_stock_adjustments` (`FOR SELECT`) y `designer_admin_insert_material_stock_adjustments` (`FOR INSERT` exigiendo `is_admin_or_designer() AND created_by IS NOT NULL AND created_by = auth.uid()`), sin políticas `UPDATE`/`DELETE` ni `FOR ALL`, reforzado por `trg_atelier_stock_adj_immutable`.

- **0. Módulo 05 — Etapa 0: Saneamiento de Contratos, Cero Mocks Reales y Sincronización Propuestas ↔ Cotizaciones:**
  - **Contratos Canónicos y Compatibilidad Temporal ([`src/types/commercial.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/types/commercial.ts)):**
    - Definidas las 8 categorías canónicas (`CANONICAL_MATERIAL_CATEGORIES`) y 7 unidades canónicas (`CANONICAL_MATERIAL_UNITS`).
    - Implementados `normalizeMaterialCategory`, `normalizeMaterialUnit`, `validateMaterialRemotePersistence` y `calculateBillableMaterialQuantity` (`MAX(requiredQty, minPurchaseUnit)` sin múltiplos).
    - Normalización `notion → notions` y `trim → trims`; bloqueo explícito previo a Supabase para `embroidery` y `pkg` (sin convertir `embroidery → beading` ni `pkg → unit/roll`).
    - Ampliados DTOs con `active_proposal_id`/`accepted_quote_id`/`active_project_id` en `UpdateCommercialProfileDTO`, `version_number`/`approved_at` en `DesignProposal`/`UpdateProposalDTO`, y `proposal_snapshot`/`accepted_at`/`rejected_at` en `CommercialQuote`/`CreateQuoteDTO`.
  - **Servicios y Cero Mocks en Consultas Reales ([`src/services/commercialService.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/services/commercialService.ts), [`src/services/commercialMockData.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/services/commercialMockData.ts)):**
    - Eliminado el fallback hacia `SAMPLE_MATERIALS_CATALOG` en `fetchMaterials()` (cuando `atelier_materials` está vacía o falla, devuelve `[]` y/o el error real; búsqueda ampliada a `supplier_name` y `composition`; fallback legado restringido exclusivamente a `PGRST205`).
    - Validación contractual y preservación independiente COP/USD en `createMaterial()` y `updateMaterial()`.
    - Versionado incremental real (`max(version_number) + 1`) en `createProposal()`, bloqueo de mutación sobre propuestas `approved`, preservación de `labor`/`currency` y sincronización completa de `creation_proposal_items` (ítems `material` y `labor`) en `createProposal()` y `updateProposal()`.
    - Al aprobar propuesta (`status: 'approved'`): registro de `approved_at`, transición de aprobadas previas a `superseded`, enlace de `active_proposal_id` en `creation_commercial_profiles` conservando monto/moneda originales (sin conversión TRM `4100`).
    - En `createQuote()` y `updateQuote()`: congelamiento de `proposal_snapshot` en `snapshot_data`, población de `commercial_quote_items`, registro de `accepted_at`/`rejected_at` y enlace de `accepted_quote_id`.
    - Alineados datos de demostración en `commercialMockData.ts` sin precios sintéticos USD por `4100`.
  - **UI de Materiales, Propuestas y Cotizaciones ([`MaterialsCatalogModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/MaterialsCatalogModal.tsx), [`CreationMaterialsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationMaterialsTab.tsx), [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx), [`CreationQuotesTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationQuotesTab.tsx), [`QuoteEditorModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/QuoteEditorModal.tsx), [`PrintableQuoteModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/PrintableQuoteModal.tsx)):**
    - Expuestas las 8 categorías y 7 unidades en `MaterialsCatalogModal.tsx`, eliminada la división `/ 4100` y visible `loadError`.
    - En `CreationMaterialsTab.tsx`: eliminada conversión `4100`, bloqueo de modificación en propuesta aprobada, guarda contra copia silenciosa COP→USD cuando falta `unit_price_usd`, conmutación de divisa protegida sin conversión automática y debounce en edición de metrajes (`450 ms`).
    - En `CreationDetailView.tsx`: resolución y propagación reactiva de `activeProposal` hacia `CreationQuotesTab` y `QuoteEditorModal`, con desglose congelado en `PrintableQuoteModal.tsx`.

- **0. Ciclo Funcional Autenticado y Auto-Limpieza Quirúrgica del Módulo 04 (RUN ID `0aee0574-8631-461d-83ff-3aa9e66402d1` — VEREDICTO: APTO):**
  - **Ejecución y Persistencia Real de Extremo a Extremo:**
    - Se ejecutó `scratch/test_m04_functional_cycle.js` sobre Supabase producción (`trgoqqvsprknswobvniu`) cubriendo el ciclo creativo de diseño de alta costura.
    - **Fase 0 (Preflight y Roles):** Autenticación verificada de diseñadora (`UID: 262bf83b...`, rol `designer`) y clienta (`UID: bbbad428...`, rol `client`). Confirmada presencia y estado `approved` de la creación de prueba C15 (`141693a0-01e8-498a-bbb3-1c4f98036543`).
    - **Fase 1 (Storage Privado `design-assets`):** Subida de archivo PNG válido a `audit_runs_m04/0aee0574.../sketch_0AEE0574.png`. Generación y verificación de URL firmada temporal (60 segundos).
    - **Fase 2 (CRUD en `design_library_items`):** Creación de recurso de autor temporal `[TEST-M04-0AEE0574]`, actualización de título y notas técnicas, comprobando persistencia en PostgreSQL.
    - **Fase 3 (Cabecera de Moodboard 1:1 en `creation_moodboards`):** Creación de tablero conceptual vinculado a C15. Verificación de restricción `UNIQUE (creation_id)`: el intento de duplicar la cabecera fue rechazado nativamente por PostgreSQL con error `23505 (unique_violation)`.
    - **Fase 4 (Tarjetas Pinboard 1:N en `moodboard_items`):** Inserción de 2 tarjetas (Boceto referenciando a Storage y Muestra Textil referenciando con FK a `design_library_items`). Verificación de la relación 1:N y ejecución de reordenamiento de tarjetas persistido en base de datos.
    - **Fase 5 (Integración con Módulo 03):** Aprobación de moodboard (`status: 'approved'`) y emisión de evento `'moodboard_approved'` a `public.commercial_events`. Reapertura de moodboard (`status: 'in_review'`) y emisión de evento `'moodboard_reopened'`.
    - **Fase 6 (Seguridad RLS):** Bloqueo a peticiones anónimas (`42501`) en `SELECT` e `INSERT`. Bloqueo a peticiones de rol clienta (`42501` en `INSERT` y 0 registros afectados en `UPDATE`).
  - **Auto-Limpieza Quirúrgica (7 Artefactos Eliminados en Orden Inverso):**
    - 1 archivo en Storage privado `design-assets`.
    - 2 eventos comerciales en `public.commercial_events`.
    - 2 tarjetas de moodboard en `public.moodboard_items`.
    - 1 cabecera de moodboard en `public.creation_moodboards` (liberando C15).
    - 1 ítem temporal de biblioteca en `public.design_library_items`.
  - **Auditoría Remota de Cero Huérfanos Residuales:**
    - Storage `audit_runs_m04/0aee0574...`: **0 archivos**.
    - `public.commercial_events` (`runId`): **0 registros**.
    - `public.moodboard_items` (C15): **0 registros**.
    - `public.creation_moodboards` (C15): **0 registros**.
    - `public.design_library_items` (`TEST-M04-0AEE0574`): **0 registros**.
    - Catálogo permanente de autor: **9 de 9 piezas preservadas intactas**.
    - Creación C15: **Intacta y preservada en `public.creations`**.
  - **Trazabilidad y Respaldo:**
    - Ledger persistido en `scratch/last_test_m04_run_ledger.json` e histórico inmutable `scratch/ledgers_m04/ledger_0aee0574-8631-461d-83ff-3aa9e66402d1.json` con `status: 'cleaned'`, `orphanCount: 0`, `verifiedZeroOrphans: true`.
    - Script SQL de emergencia parametrizado en `scratch/manual_recovery_last_m04_run.sql`.
    - `tsc --noEmit` completado con código 0 y 0 errores.

- **0. Auditoría Remota Post-Despliegue del Módulo 04 (`scratch/verify_m04_remote_postdeploy.js` — VEREDICTO: APTO):**
  - **Fase 1: Verificación de Bloqueo RLS para Peticiones Anónimas:**
    - `public.design_library_items`: Código nativo `42501 (permission denied for table design_library_items)` confirmado.
    - `public.creation_moodboards`: Código nativo `42501 (permission denied for table creation_moodboards)` confirmado.
    - `public.moodboard_items`: Código nativo `42501 (permission denied for table moodboard_items)` confirmado.
    - Certifica que `REVOKE ALL ON TABLE ... FROM anon, PUBLIC` y RLS operan al 100%.
  - **Fase 2: Acceso Autenticado de Diseñadora (`public.profiles`):**
    - Sesión activa establecida para `UID: 262bf83b-c916-4712-bb8a-cea98a1c359b`.
    - Rol `"designer"` verificado en `public.profiles`.
    - Lectura permitida a través de la política `designer_admin_manage_*` evaluando `public.is_admin_or_designer()`.
  - **Fase 3: Verificación de Estructura de Tablas y 9 Semillas de Biblioteca:**
    - `public.design_library_items`: 9 registros recuperados.
    - Verificados 9/9 códigos canónicos: `SIL-KC-001`, `SIL-KC-002`, `ESC-KC-001`, `ESC-KC-002`, `MNG-KC-001`, `MNG-KC-002`, `TEX-KC-001`, `BOR-KC-001`, `ARC-KC-001`.
    - Categorías validadas: `silhouette`, `neckline`, `sleeve`, `fabric_drape`, `embroidery_finish`, `historical_archive`.
    - Insignias de autor (`is_signature`) y estado activo (`is_active: true`) confirmados.
    - `public.creation_moodboards`: Operativa y accesible (0 registros existentes, esquema intacto).
    - `public.moodboard_items`: Operativa y accesible (0 registros existentes, esquema intacto).
  - **Fase 4: Verificación de Aislamiento RLS para Rol Client:**
    - Sesión autenticada para clienta (`UID: bbbad428-eb3b-4229-b0a5-b8b77919262a`, rol `"client"` en `public.profiles`).
    - Al consultar `public.design_library_items`: clienta visualiza **0 filas** de las 9 existentes, certificando que el predicado RLS `USING (public.is_admin_or_designer())` filtra el 100% de los registros para cuentas no autorizadas.
    - Al consultar `creation_moodboards` y `moodboard_items`: clienta visualiza **0 filas**.
  - **Fase 5: Verificación del Bucket Privado `design-assets`:**
    - Consulta de listado en Supabase Storage mediante sesión autenticada de diseñadora: responde exitosamente (`status: 200`, 0 objetos).
    - Política RLS `designer_admin_storage_design_assets_select` en `storage.objects` operativa.
  - **Fase 6: Conservación e Integridad de M00–M03 y Creación C15:**
    - Creación C15 (`141693a0-01e8-498a-bbb3-1c4f98036543`, `"Chaqueta Sastre de Prueba C15"`, status: `approved`): intacta y preservada.
    - Tablas satélite M03 `public.atelier_materials` y `public.commercial_events`: operativas y limpias.
    - Bucket privado `commercial-assets`: preservado e inalterado.
  - **Garantía Estricta:** Cero mutaciones, escrituras o pruebas destructivas ejecutadas. `tsc --noEmit` completado con código 0 y 0 errores.

- **0. Preflight Remoto de Solo Lectura del Módulo 04 (`scratch/verify_m04_remote_preflight.js` — VEREDICTO: APTO):**
  - **Ejecución y Verificación de Conectividad Remota:**
    - Conexión verificada al proyecto Supabase `trgoqqvsprknswobvniu` (`https://trgoqqvsprknswobvniu.supabase.co`).
    - Carga segura de credenciales de prueba desde `.env.test.local` sin exposición de tokens ni contraseñas.
  - **Fase 1: Verificación de Restricciones RLS Anónimas:**
    - `public.creations`: Código `42501 (permission denied for table creations)` confirmado.
    - `public.design_library_items`: Código `PGRST205 (Could not find the table ... in the schema cache)` confirmado.
  - **Fase 2: Autenticación y Verificación de Roles:**
    - Sesión activa establecida para la diseñadora (`262bf83b-c916-4712-bb8a-cea98a1c359b`).
    - Consulta a `public.profiles` certifica rol `"designer"` con permisos plenos para evaluar `public.is_admin_or_designer()`.
  - **Fase 3: Estado de Dependencias Existentes (M00–M03):**
    - `public.creations`: Operativa (lectura exitosa de registros con rol designer).
    - Creación de prueba `"Chaqueta Sastre de Prueba C15"` (`141693a0-01e8-498a-bbb3-1c4f98036543`, status: `approved`): intacta y preservada.
    - `public.atelier_materials`: Operativa (0 registros tras la auto-limpieza quirúrgica del ciclo M03).
    - `public.commercial_events`: Operativa (0 registros tras la auto-limpieza).
    - Bucket `commercial-assets`: Operativo y limpio.
  - **Fase 4: Inspección de Objetos Destino M04 (Ausencia de Conflictos):**
    - `public.design_library_items`: **NO EXISTE** (`PGRST205`) ➔ Libre para despliegue.
    - `public.creation_moodboards`: **NO EXISTE** (`PGRST205`) ➔ Libre para despliegue.
    - `public.moodboard_items`: **NO EXISTE** (`PGRST205`) ➔ Libre para despliegue.
    - Bucket `design-assets`: Idempotencia garantizada por `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` en el DDL.
    - Semilla de 9 piezas icónicas: Idempotencia garantizada por `ON CONFLICT (code) DO NOTHING`.
  - **Restricción Cumplida:** Cero mutaciones, escrituras, migraciones o alteraciones de políticas ejecutadas.

- **0. Auditoría Integral de Preparación para Despliegue del Módulo 04 (VEREDICTO: APTO PARA DESPLIEGUE):**
  - **Eje 1 — Esquema DDL y Orden Relacional:**
    - Verificado el orden estricto en `supabase/migrations/20261109000000_design_moodboard_library_m04.sql`: 1. `design_library_items`; 2. `creation_moodboards`; 3. `moodboard_items`.
    - Garantiza resolución de claves foráneas sin dependencias circulares. `public.creations` permanece 100% inalterada.
  - **Eje 2 — Claves Foráneas (FK) e Integridad Referencial:**
    - `creation_moodboards.creation_id` UNIQUE REFERENCES `public.creations(id)` ON DELETE CASCADE.
    - `moodboard_items.creation_id` REFERENCES `public.creations(id)` ON DELETE CASCADE.
    - `moodboard_items.moodboard_id` REFERENCES `public.creation_moodboards(id)` ON DELETE CASCADE.
    - `moodboard_items.library_item_id` REFERENCES `public.design_library_items(id)` ON DELETE SET NULL (preserva tarjetas al archivar o desvincular items de biblioteca).
  - **Eje 3 — Seguridad RLS y Permisos:**
    - RLS activado en las 3 tablas satélite.
    - Permisos endurecidos: `REVOKE ALL ON TABLE ... FROM anon, PUBLIC; GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ... TO authenticated, service_role, postgres;`.
    - Políticas RLS unificadas con `TO authenticated USING (public.is_admin_or_designer()) WITH CHECK (public.is_admin_or_designer())`.
    - Trigger `update_m04_updated_at_column()` asegurado con `SET search_path = ''` y permisos revocados a `anon, PUBLIC`.
  - **Eje 4 — Almacenamiento Privado en Supabase Storage (`design-assets`):**
    - Bucket creado en `storage.buckets` con `public = false`, límite 15MB (`15728640`), y tipos MIME admitidos `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
    - 4 políticas de `storage.objects` (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) con `TO authenticated` restringidas a `bucket_id = 'design-assets' AND public.is_admin_or_designer()`.
  - **Eje 5 — Capa de Servicios y Resiliencia (`designService.ts`):**
    - Validación de UUIDs estrictos con `isValidUuid()` antes de cualquier operación remota.
    - Retorno fiel de errores de base de datos (`error`), eliminando falsas confirmaciones visuales.
    - Cero inyección de mocks o IDs no-UUID en creaciones reales.
  - **Eje 6 — Integración Funcional con Módulo 03:**
    - Preservación íntegra de `creation.notes` mediante bloque diferenciado en UI (`CreationMoodboardTab.tsx`).
    - Eventos comerciales estéticos `'moodboard_approved'` y `'moodboard_reopened'` emitidos a `commercial_events` (ya soportados en el CHECK de M03).
    - Selector opcional de catálogo de telas (`atelier_materials`) para muestras textiles vinculadas vía `metadata.material_id`.
  - **Eje 7 — Integración No Intrusiva con Módulo 02 (Patronaje CAD):**
    - Barra de referencia arquitectónica de solo lectura en `CreationDetailView.tsx` (`✦ ARQUITECTURA SARTORIAL M04`).
    - Cero modificaciones a `PatternModule.tsx` y cero alteraciones al Flujo B de M02.
  - **Eje 8 — Cumplimiento de Límites del MVP de Alta Costura:**
    - Enfoque puro en inspiración visual, moodboard de autor y arquitectura de prenda.
    - Evita complejidad de ERP, compras, inventarios masivos o contabilidad corporativa.
  - **Validación Técnica:** `tsc --noEmit` completado con código 0 y 0 errores.

- **0. Auditoría Final de Cierre Funcional del Módulo 03 (RUN ID `7f7863cb-d3b7-4cb5-a05c-fedd8181d421` — VEREDICTO: APTO / CERRADO):**
  - **Ejecución y Ciclo Comercial Remoto Completo:**
    - Se ejecutó el ciclo funcional completo autenticado en Supabase (`trgoqqvsprknswobvniu`), validando: 1. Auth Diseñadora y Clienta; 2. Inserción de material y trigger `handle_updated_at` en `atelier_materials`; 3. Propuesta económica versionada e ítems relacionales 1:N en `creation_proposals` y `creation_proposal_items`; 4. Cotización formal A4 inmutable con snapshot congelado en `commercial_quotes` y `commercial_quote_items`; 5. Conversión a proyecto en `atelier_projects` e idempotencia con `quote_id UNIQUE` (error 23505 verificado); 6. Anticipo 50% y anulación auditada (`is_void: true`) en `financial_movements`; 7. Hitos en bitácora inmutable en `commercial_events`; 8. Subida de PDF y generación de URL firmada (60s) en Storage `commercial-assets` y `commercial_media_assets`; 9. Restricción RLS para cuenta con rol `client` (bloqueo `42501` confirmado).
  - **Verificación Remota de Auto-Limpieza Quirúrgica (0 Residuos):**
    - Se ejecutó `scratch/verify_run_cleaned_read_only.js` mediante consultas `SELECT` directas contra el entorno remoto autenticado:
      - `atelier_materials` (`supplier_ref = TEST-7f7863cb-d3b7-4cb5-a05c-fedd8181d421`): **0 registros**.
      - `creation_proposals` (`proposal_number = PROP-7F7863CB`): **0 registros**.
      - `commercial_quotes` (`quote_number = COT-7F7863CB`): **0 registros**.
      - `atelier_projects` (`project_number = PRJ-7F7863CB`): **0 registros**.
      - `financial_movements` (`idempotency_key = IDEM-PAY-7f7863cb-d3b7-4cb5-a05c-fedd8181d421`): **0 registros**.
      - `commercial_media_assets` (`file_name = test_run_7f7863cb-d3b7-4cb5-a05c-fedd8181d421.pdf`): **0 registros**.
      - `commercial_events` (`metadata->>'runId' = 7f7863cb-d3b7-4cb5-a05c-fedd8181d421`): **0 registros**.
      - Storage `commercial-assets` (`audit_runs/*7f7863cb-d3b7-4cb5-a05c-fedd8181d421*`): **0 archivos**.
      - `public.creations` (`id = 141693a0-01e8-498a-bbb3-1c4f98036543`): **Intacta y preservada** ("Chaqueta Sastre de Prueba C15", status: `approved`).
  - **Integridad y Trazabilidad del Ledger en Disco:**
    - Persistido con éxito en [`scratch/last_test_run_ledger.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/last_test_run_ledger.json) e historial inmutable [`scratch/ledgers/ledger_7f7863cb-d3b7-4cb5-a05c-fedd8181d421.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/ledgers/ledger_7f7863cb-d3b7-4cb5-a05c-fedd8181d421.json):
      - `status: "cleaned"`
      - `deletedCount: 10`
      - `orphanCount: 0`
      - `verifiedZeroOrphans: true`
      - `timestamp: "2026-11-10T02:19:18.945Z"`
  - **Seguridad del Script de Recuperación Manual:**
    - Archivo [`scratch/manual_recovery_last_run.sql`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/scratch/manual_recovery_last_run.sql) generado y parametrizado con `v_run_id = '7f7863cb-d3b7-4cb5-a05c-fedd8181d421'` y `v_short_code = '7F7863CB'`, sin cláusulas `LIKE` abiertas ni comodines.
  - **Protección de Credenciales y No Regresión:**
    - `.env.test.local` protegido y verificado fuera de Git. Cero contraseñas, tokens o JWTs expuestos en logs o trazabilidad.
    - `tsc --noEmit` completado con código 0 y 0 errores. Módulos M00–M02 y M02 Flow B 100% preservados. M04 permanece local y protegido.

- **0. Corrección de Inconsistencia y Blindaje de Pre-flight M03 (`scratch/test_m03_functional_cycle.js`):**
  - **Exigencia Estricta de Credenciales de Clienta:**
    - Se eliminó el carácter opcional de `TEST_CLIENT_EMAIL` y `TEST_CLIENT_PASSWORD`.
    - Si alguna variable falta en `.env.test.local`, el script reporta con precisión: `❌ DETENCIÓN DE PREFLIGHT: Credenciales de Clienta incompletas o ausentes en .env.test.local` y `⚠️ La cuenta clienta NO fue validada`, saliendo con código 1 sin intentar mutaciones ni declarar condiciones seguras.
  - **Autenticación Real y Comprobación de Roles en `public.profiles`:**
    - Se exige autenticación real y lectura de `public.profiles` tanto para Diseñadora (rol `designer` o `admin`) como para Clienta (rol `client`).
    - Si la cuenta clienta no existe, tiene contraseña errónea o su rol es distinto a `client`, el pre-flight se aborta con error fatal explícito.
  - **Garantía en Resumen Final (`--validate-only`):**
    - El banner `✅ PRE-FLIGHT COMPLETADO: CONDICIONES SEGURAS CONFIRMADAS AL 100%` ahora evalúa una condición booleana estricta: `isDesignerVerified && isClientVerified && isCreationVerified`.
    - Si la cuenta clienta no fue validada, es imposible que se imprima la confirmación de éxito.
  - **Verificación Funcional en Modo `--validate-only`:**
    - Probado con la configuración actual de `.env.test.local` (donde las credenciales de clienta estaban vacías): el script se detuvo de inmediato en 0.7 segundos indicando las variables faltantes y prohibiendo el avance.
    - Cero contraseñas o tokens expuestos. Cero mutaciones ejecutadas.
    - `tsc --noEmit` completado con código 0 y 0 errores.

- **0. Auditoría de Seguridad de 5 Riesgos Residuales en `cleanupRunArtifacts` (`scratch/test_m03_functional_cycle.js`, `scratch/manual_recovery_last_run.sql`):**
  - **Riesgo 1 — Generación Criptográfica del `runId` (CSPRNG):**
    - Se implementó `generateSecureRunId()` utilizando `crypto.randomUUID()` nativo con fallback de entropía criptográfica estricta mediante `crypto.randomBytes(16)` formateado como UUID v4 (RFC 4122).
    - Se verifica mediante `isValidUuid(runId)` previo al uso, impidiendo cualquier ejecución con entropía insuficiente o prefijos predecibles.
    - Se calcula `shortCode = runId.slice(0, 8).toUpperCase()` aportando 32 bits de entropía para los códigos de negocio (`PROP-`, `COT-`, `PRJ-`, `TRF-`).
  - **Riesgo 2 — Consistencia del Ledger, Escritura Atómica y Concurrencia:**
    - Se implementó `atomicWriteJson()` que escribe primero en un archivo temporal único por proceso (`.tmp`) y luego ejecuta el reemplazo atómico, evitando que una terminación abrupta deje el archivo `last_test_run_ledger.json` truncado o corrupto.
    - Se introdujo persistencia dual: en el archivo global `last_test_run_ledger.json` y en un archivo de historial inmutable por corrida `scratch/ledgers/ledger_<runId>.json`, protegiendo los artefactos de ejecuciones concurrentes.
    - Se añadió comprobación de ejecuciones activas: si el ledger previo tiene estado `'in_progress'` y tiene menos de 10 minutos de iniciado, la prueba se detiene preventivamente salvo que se especifique `--force` o `--cleanup-last-run`.
    - Se mitigó la ventana de vulnerabilidad entre inserción en BD y registro en ledger mediante un mecanismo dual de limpieza: `cleanupRunArtifacts` elimina por los IDs registrados en el ledger y ejecuta un barrido complementario por la clave de negocio exacta de la corrida (`runId` / `shortCode`).
  - **Riesgo 3 — Recuperación y Compatibilidad de Archivos Storage:**
    - Se auditó la restricción `allowed_mime_types` del bucket privado `commercial-assets` (`ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']`), detectando que el borrador anterior intentaba subir `text/plain`.
    - Se corrigió la prueba para subir un archivo `test_run_<runId>.pdf` con contenido PDF 1.4 minimalista válido y `contentType: 'application/pdf'`.
    - La rutina `cleanupRunArtifacts` elimina tanto las rutas registradas como las rutas canónicas del `runId` en Storage.
    - La verificación post-cleanup audita `client.storage.from('commercial-assets').list('audit_runs', { search: runId })` exigiendo 0 archivos residuales.
    - El script SQL de emergencia `scratch/manual_recovery_last_run.sql` incluye la eliminación directa sobre `storage.objects` para el bucket `commercial-assets`.
  - **Riesgo 4 — Correspondencia Exacta de Columnas SQL contra el DDL:**
    - Verificadas las 10 tablas de M03 contra `20261108000000_commercial_cycle_module_03.sql`: todas las columnas utilizadas en las mutaciones y en el script de recuperación (`supplier_ref`, `notes`, `proposal_number`, `quote_number`, `client_name_snapshot`, `snapshot_data`, `project_number`, `current_stage`, `idempotency_key`, `reference_number`, `file_name`, `metadata`) existen exactamente con sus tipos de datos y restricciones NOT NULL respetadas.
  - **Riesgo 5 — Integridad en Eventos y Movimientos Financieros:**
    - Se comprobó que ninguna tabla en PostgreSQL posee claves foráneas que apunten hacia `financial_movements(id)` o `commercial_events(id)`.
    - Se comprobó que no existen triggers `BEFORE DELETE` o `AFTER DELETE` en ambas tablas.
    - Se certificó que las políticas RLS `designer_admin_manage_financial_movements` y `designer_admin_manage_commercial_events` están definidas con `FOR ALL TO authenticated USING (public.is_admin_or_designer())`, permitiendo la eliminación controlada de registros temporales generados por la prueba.
    - Se mantiene el orden de eliminación estricto: Storage → Events → Media → Finanzas → Proyectos (liberando FK restrict hacia quotes) → Cotizaciones → Propuestas → Telas.
  - **Estado Técnico:** `tsc --noEmit` verificado con código de salida 0. Cero mutaciones remotas ejecutadas. Modo `--validate-only` probado exitosamente con salida segura.

- **0. Auditoría de Seguridad y Blindaje de Limpieza Quirúrgica (`scratch/test_m03_functional_cycle.js`):**
  - **Aislamiento Criptográfico por `runId` Único:**
    - Se sustituyó el slice numérico por un prefijo formal `M03_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, garantizando unicidad estricta y evitando cualquier colisión entre corridas.
    - Todos los registros insertados llevan el `runId` en sus campos de negocio (`supplier_ref`, `proposal_number`, `quote_number`, `project_number`, `reference_number`, `idempotency_key`, `file_name` y `metadata->>'runId'`).
  - **Orden Inverso Exacto de Dependencias Relacionales:**
    - Se auditó exhaustivamente el esquema DDL y se dispuso el orden estricto de eliminación:
      1. `Storage: commercial-assets` (archivos `audit_runs/test_run_<runId>.txt`).
      2. `commercial_events` (FK hacia proposals, quotes, projects).
      3. `commercial_media_assets` (FK hacia proposals, quotes, projects).
      4. `financial_movements` (FK hacia projects, quotes).
      5. `atelier_projects` (**FK `quote_id UNIQUE REFERENCES commercial_quotes(id) ON DELETE RESTRICT`**; se elimina antes de quotes para evitar violaciones de clave foránea).
      6. `commercial_quote_items` (FK quote_id ON DELETE CASCADE).
      7. `commercial_quotes` (FK proposal_id ON DELETE SET NULL).
      8. `creation_proposal_items` (FK proposal_id ON DELETE CASCADE, material_id ON DELETE SET NULL).
      9. `creation_proposals` (FK creation_id ON DELETE CASCADE).
      10. `atelier_materials` (independiente).
  - **Persistencia en Disco del Ledger y Recuperación de Emergencia (`--cleanup-last-run`):**
    - Cada inserción persiste el estado en `scratch/last_test_run_ledger.json`. Si el proceso se cae o se cierra la terminal, el comando `node scratch/test_m03_functional_cycle.js --cleanup-last-run` lee los IDs del disco y ejecuta la limpieza sin rehacer la prueba.
  - **Manejo de Señales de Interrupción (`SIGINT`, `SIGTERM`):**
    - Se agregaron escuchadores para capturar `Ctrl+C` y señales del sistema operativo, ejecutando la limpieza de emergencia del `runId` activo antes de salir.
  - **Generación Automática de SQL de Recuperación Manual Exacto:**
    - El script genera automáticamente `scratch/manual_recovery_last_run.sql` parametrizado con `v_run_id = '<runId>'`. Se eliminaron todas las cláusulas `LIKE` abiertas o filtros `IS NOT NULL`, sustituyéndolas por igualdad estricta de cadenas y comprobación previa de que `v_run_id` no esté vacío.
  - **Detención de Seguridad:** Ninguna operación remota de escritura fue ejecutada. Todo el código quedó verificado con `tsc --noEmit` en código de salida 0.

- **0. Pruebas de Integración Funcional M03 (`trgoqqvsprknswobvniu`):**
  - **Validación RLS Remota Anónima (`scratch/test_unauthenticated_integration.js` — EJECUTADA Y APROBADA):**
    - Comprobadas en vivo las 10 tablas satélite (`creation_commercial_profiles`, `atelier_materials`, `creation_proposals`, `creation_proposal_items`, `commercial_quotes`, `commercial_quote_items`, `atelier_projects`, `financial_movements`, `commercial_media_assets`, `commercial_events`): todas retornan error nativo PostgreSQL `42501 (permission denied for table ...)`.
    - Storage privado `commercial-assets`: lista 0 objetos sin sesión activa.
    - Tabla base `public.creations`: responde `42501`, certificando que los datos existentes están intactos y blindados.
  - **Suite de Ciclo Comercial Autenticado (`scratch/test_m03_functional_cycle.js` — LISTA Y PREPARADA):**
    - Diseñada para validar en secuencia real: 1. Auth Designer; 2. CRUD `atelier_materials` y trigger `handle_updated_at`; 3. Propuesta v1 + items relacionales 1:N; 4. Cotización formal A4 congelada; 5. Conversión a proyecto + idempotencia (`quote_id UNIQUE` rechazo `23505`); 6. Anticipo 50% + anulación auditada (`is_void: true`); 7. Hitos en `commercial_events`; 8. Subida y URL firmada en Storage; 9. Bloqueo RLS para rol `client`.
    - Detención de seguridad aplicada conforme a restricciones: no se realizan suposiciones de contraseñas ni fuerza bruta sobre cuentas existentes. En espera de credenciales de prueba.

- **0. Verificación Post-Despliegue Remoto del Módulo 03 (`trgoqqvsprknswobvniu` — VEREDICTO: APTO):**
  - **Reconocimiento en PostgREST y RLS Activo (`scratch/verify_remote_preflight.js`):**
    - Las 10 tablas satélite (`creation_commercial_profiles`, `atelier_materials`, `creation_proposals`, `creation_proposal_items`, `commercial_quotes`, `commercial_quote_items`, `atelier_projects`, `financial_movements`, `commercial_media_assets`, `commercial_events`) pasaron de `PGRST205` a `42501` (`permission denied for table ...`), certificando que PostgREST recargó su schema cache y que `REVOKE ALL FROM anon, PUBLIC` y RLS operan al 100%.
    - `public.creations` se mantiene respondiendo `42501`, certificando que no fue modificada ni degradada.
  - **Integridad Atómica de Objetos (`BEGIN; ... COMMIT;`):**
    - Consolidada la creación de las 3 secuencias oficiales (`seq_proposal_number`, `seq_quote_number`, `seq_project_code`).
    - Consolidada la creación de los 5 triggers `updated_at` (`trg_*_updated_at`) ejecutando `public.handle_updated_at()`.
    - Consolidada la creación de los 12 índices relacionales (`idx_*`).
    - Consolidada la creación de las 10 políticas RLS con `TO authenticated` y `public.is_admin_or_designer()`.
    - Consolidada la configuración del bucket privado `commercial-assets` en `storage.buckets` y sus 4 políticas RLS en `storage.objects`.
  - **Integridad de Código Local:**
    - `commercialService.ts` y componentes UI validados con `tsc --noEmit` en código de salida 0. M04 permanece local y protegido.

- **0. Corrección de Regresiones y Defectos de Auditoría Independiente (`REG-AUD-01`, `REG-AUD-02`, `REG-AUD-03`, `REG-AUD-04`):**
  - **`REG-AUD-01` — Eliminación de registros mock en Creaciones reales con UUID válido (`commercialService.ts`, `designService.ts`):**
    - En `commercialService.ts`: `fetchProposalsByCreation`, `fetchQuotesByCreation`, `fetchProjectByCreation`, `fetchTransactionsByCreation` y `fetchCommercialEventsByCreation` devuelven arreglos vacíos `[]` o `null` cuando la consulta responde exitosa (`!error`), impidiendo inyectar registros con IDs no-UUID (`prop-sample-001`, `quote-sample-001`, `proj-sample-001`) en Creaciones reales recién creadas.
    - En `designService.ts`: `fetchMoodboardByCreation` y `fetchMoodboardItems` devuelven cabecera limpia o arreglo vacío `[]` para creaciones reales sin sembrar tarjetas mock con IDs `mbi-${creationId}-1`.
  - **`REG-AUD-02` — Supresión de falsas confirmaciones visuales y mutación fantasma de mocks (`designService.ts`, `commercialService.ts`, UI):**
    - `recordCommercialEvent`, `upsertCreationMoodboard`, `addMoodboardItem`, `updateMoodboardItem`, `deleteMoodboardItem`, `reorderMoodboardItem`, `createDesignLibraryItem`, `toggleDesignLibrarySignature`, `updateDesignLibraryItem` y `archiveDesignLibraryItem` retornan `{ data: null, error }` (o `{ success: false, error }`) sin mutar los arreglos en memoria cuando se trata de IDs mock o hay error de base de datos.
    - `CreationMoodboardTab.tsx`, `DesignLibraryScreen.tsx`, `DesignLibraryModal.tsx` y `CreationMaterialsTab.tsx` verifican estrictamente el campo `error`, despliegan avisos y alertas en pantalla y no alteran la interfaz con falsas confirmaciones cuando la operación falla.
  - **`REG-AUD-03` — Preservación de errores reales de PostgreSQL en servicios (`commercialService.ts`):**
    - Los fallbacks de compatibilidad en `createMaterial`, `updateMaterial`, `createDirectProject`, `createProjectFromQuote`, `updateProject`, `createTransaction` y `voidTransaction` sólo se activan si `error.code === 'PGRST205'`, propagando fielmente los errores reales de PostgreSQL (como violaciones de constraints, RLS o triggers) sin sobrescribirlos.
    - En `createProposal`, se valida y propaga `error.message` en la inserción de `creation_proposal_items`.
  - **`REG-AUD-04` — Eliminación de falsas confirmaciones de Storage (`designService.ts`):**
    - `pickAndUploadDesignImage` valida `uploadErr` y `signedErr`. Ante fallos en el bucket `design-assets`, retorna el error real y campos nulos (`uri: null`, `storagePath: null`), impidiendo guardar paths inexistentes.
  - **`AUD-PRE-01` — Políticas RLS de Tablas y Storage con `TO authenticated` y `WITH CHECK` (`20261108000000_commercial_cycle_module_03.sql`, `20261109000000_design_moodboard_library_m04.sql`):**
    - Añadido `TO authenticated` explícito en las 10 políticas de tablas de M03, las 3 políticas de tablas de M04 y las 8 políticas de `storage.objects` (`commercial-assets` y `design-assets`), evitando que peticiones `anon` evalúen `public.is_admin_or_designer()` (cuyo permiso `EXECUTE` está revocado para `anon` en remoto).
    - Añadido `WITH CHECK (bucket_id = '...' AND public.is_admin_or_designer())` explícito en las políticas `FOR UPDATE` sobre `storage.objects` de ambos buckets.
  - **`AUD-PRE-02` — Validación `isValidUuid` y Error Controlado ante Identificadores Mock (`src/services/commercialService.ts`, `src/services/designService.ts`):**
    - Incorporados `isValidUuid` y `MOCK_UUID_PERSISTENCE_ERROR` en `commercialService.ts` cubriendo `fetchCommercialProfile`, `upsertCommercialProfile`, `updateMaterial`, `fetchProposalsByCreation`, `createProposal` (incluyendo sanitización UUID de `material_id` en `creation_proposal_items`), `updateProposal`, `fetchQuotesByCreation`, `createQuote`, `updateQuote`, `fetchProjectByCreation`, `createDirectProject`, `createProjectFromQuote`, `updateProject`, `fetchTransactionsByCreation`, `createTransaction`, `voidTransaction`, `fetchMediaAssetsByCreation`, `createMediaAsset`, `fetchCommercialEventsByCreation` y `recordCommercialEvent` (eliminando `'22P02'` de errores silenciados).
    - Completada la validación `isValidUuid` y retorno de `MOCK_UUID_PERSISTENCE_ERROR` en `designService.ts` para `fetchMoodboardByCreation`, `upsertCreationMoodboard`, `fetchMoodboardItems`, `addMoodboardItem`, `updateMoodboardItem`, `deleteMoodboardItem`, `reorderMoodboardItem`, `toggleDesignLibrarySignature`, `updateDesignLibraryItem` y `archiveDesignLibraryItem`. Ningún identificador mock produce una falsa confirmación de persistencia (`error: null`).
  - **`AUD-PRE-03` — Blindaje de Función Trigger, Secuencias, Índices FK y Documentación (`20261108000000_commercial_cycle_module_03.sql`, `20261109000000_design_moodboard_library_m04.sql`, `M04_ARQUITECTURA_TECNICA.md`):**
    - Añadido `SET search_path = ''` y `REVOKE ALL ON FUNCTION public.update_m04_updated_at_column() FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated, service_role, postgres;` en M04.
    - Añadido `REVOKE ALL ON SEQUENCE ... FROM anon, PUBLIC; GRANT USAGE, SELECT ... TO authenticated, service_role, postgres;` en las 3 secuencias de M03 (`seq_proposal_number`, `seq_quote_number`, `seq_project_code`).
    - Asociados los 5 triggers `BEFORE UPDATE ... EXECUTE FUNCTION public.handle_updated_at()` en las tablas con `updated_at` de M03 y creados 12 índices `CREATE INDEX IF NOT EXISTS` en claves foráneas de M03 y 1 índice adicional (`idx_moodboard_items_moodboard_id`) en M04.
    - Actualizada la línea 79 de `M04_ARQUITECTURA_TECNICA.md` eliminando la mención residual a `public.user_profiles` y documentando `public.is_admin_or_designer()` sobre `public.profiles`.

- **0. Resolución Integral de Hallazgos de Auditoría (`DEF-M03-01..05`, `OBS-M04-01..04` y `DEF-E2E-01..03`):**
  - **Defectos SQL y Mapeo M03 Resueltos (`20261108000000_commercial_cycle_module_03.sql`, `commercialService.ts`):**
    - `DEF-M03-01`: Añadida columna `notes TEXT` en `public.creation_proposals`.
    - `DEF-M03-02`: Añadidas columnas `client_id_snapshot UUID`, `creation_name_snapshot TEXT` y `notes TEXT` en `public.commercial_quotes`.
    - `DEF-M03-03`: Ajustado `quote_id UUID UNIQUE` (nullable) en `public.atelier_projects` para permitir proyectos directos sin cotización previa manteniendo idempotencia cuando existe cotización.
    - `DEF-M03-04`: Unificado el `CHECK (current_stage IN (...))` de `public.atelier_projects` para aceptar tanto los estados de `ProjectOperationalStatus` (`'cutting'`, `'assembly'`, `'adjustments'`, `'finishing'`, `'delivered'`, `'cancelled'`) como los alias del DDL.
    - `DEF-M03-05`: Añadida columna `receipt_url TEXT` en `public.financial_movements` e implementados normalizadores bidireccionales (`normalizeMaterialRow`, `normalizeProposalRow`, `normalizeQuoteRow`, `normalizeProjectRow`, `normalizeTransactionRow`) en `commercialService.ts`.
  - **Observaciones Técnicas M04 Resueltas (`20261109000000_design_moodboard_library_m04.sql`, `design.ts`, `designService.ts`, `DesignLibraryScreen.tsx`, `DesignLibraryModal.tsx`):**
    - `OBS-M04-01`: Incluido `approved_at` en `UpsertMoodboardDTO` y en el `upsert` de `creation_moodboards`; `approveCreationMoodboard` y `reopenCreationMoodboard` registran `'moodboard_approved'` y `'moodboard_reopened'` en `commercial_events`.
    - `OBS-M04-02`: Implementado `isValidUuid` en `designService.ts` para evitar enviar IDs mock (`'cr-sample-001'`, `'lib-001'`) a columnas PostgreSQL `UUID`, preservando `source_library_id` y `source_library_code` en `metadata`.
    - `OBS-M04-03`: Añadida columna `storage_path TEXT` en `public.design_library_items` y propagada en `DesignLibraryScreen.tsx` y `designService.ts`.
    - `OBS-M04-04`: Implementado `logSupabaseFallback` que distingue modo preview/migración pendiente (`PGRST205`, `42501`) de errores reales de Supabase, registrándolos y retornándolos en `error` sin ocultarlos.
  - **Defectos de Evidencia E2E Resueltos (`CreationDetailView.tsx`, `MoodboardItemModal.tsx`, `DesignLibraryModal.tsx`, `scratch/verify_m04.js`):**
    - `DEF-E2E-01`: Añadidos `testID="detail-tab-*"` en `CreationDetailView.tsx`; regenerada `16_m04_patronaje_bridge.png` mostrando la pestaña `Patronaje` y el bloque `✦ ARQUITECTURA SARTORIAL M04`.
    - `DEF-E2E-02`: Añadidos `testID="item-type-*"` en `MoodboardItemModal.tsx`; regenerada `14_m04_moodboard_item_modal.png` con `Muestra de Tela` seleccionada y el catálogo textil M03 desplegado.
    - `DEF-E2E-03`: Capturas `12` y `15` regeneradas con `fullPage: true` y `13` con la insignia `"✓ Ya en este Moodboard"` visible en la cabecera de la tarjeta.

- **0. Cierre Local Integral de Brechas GAP-01 a GAP-06 del Módulo 04 y Alineación de Dependencia M03:**
  - **Alineación SQL de M03 (`supabase/migrations/20261108000000_commercial_cycle_module_03.sql`):** Añadidas las columnas `proposal_id`, `quote_id` y `project_id` requeridas por `recordCommercialEvent` en `public.commercial_events`, incorporados los tipos de evento `'moodboard_approved'` y `'moodboard_reopened'`, y añadido endurecimiento `REVOKE ALL FROM anon, PUBLIC; GRANT ... TO authenticated, service_role, postgres;` e idempotencia `DROP POLICY IF EXISTS` en las 10 tablas y en `commercial-assets`.
  - **Corrección SQL de M04 — GAP-01 (`supabase/migrations/20261109000000_design_moodboard_library_m04.sql`):**
    - `SQL-01`: Reordenado el DDL para crear primero `public.design_library_items` y añadir `library_item_id UUID REFERENCES public.design_library_items(id) ON DELETE SET NULL` en `public.moodboard_items`.
    - `SQL-02`: Sustituidas subconsultas inline por `public.is_admin_or_designer()` con `REVOKE ALL FROM anon, PUBLIC`.
    - `SQL-03`: Añadidas las 4 políticas RLS (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) sobre `storage.objects` para el bucket privado `design-assets`.
    - `SQL-04`: Añadida transacción `BEGIN ... COMMIT`, triggers `updated_at` y semilla idempotente `ON CONFLICT (code) DO NOTHING` para las 9 piezas insignia del archivo de autor.
  - **Subida de Imágenes desde Dispositivo — GAP-02 (`designService.ts`, `MoodboardItemModal.tsx`, `DesignLibraryScreen.tsx`):** Implementado `pickAndUploadDesignImage` usando `expo-image-picker` con subida a `design-assets` y fallback resiliente al URI local mientras el bucket remoto no esté desplegado.
  - **Ciclo Completo de Moodboard y Biblioteca — GAP-03 (`designService.ts`, `CreationMoodboardTab.tsx`, `DesignLibraryModal.tsx`, `DesignLibraryScreen.tsx`):** Implementados `reopenCreationMoodboard` (`↺ Reabrir para Ajuste Estético`), `reorderMoodboardItem` (`↑`/`↓`), edición de tarjeta en `MoodboardItemModal`, indicador `"✓ Ya en este Moodboard"` en `DesignLibraryModal`, y acciones `✎ Editar` (`updateDesignLibraryItem`) y `🗄 Archivar` (`archiveDesignLibraryItem`) en `DesignLibraryScreen`.
  - **Puente No Intrusivo M04 → M02 — GAP-04 (`CreationDetailView.tsx`):** Incorporada barra de referencia de solo lectura `✦ ARQUITECTURA SARTORIAL M04` en la sección `3. PATRONAJE CAD PARAMÉTRICO` mostrando Silueta, Escote, Manga, estado del Moodboard y Paleta Cromática sin tocar `PatternModule.tsx` ni M02 Flow B.
  - **Puente M04 ↔ M03 — GAP-05 (`MoodboardItemModal.tsx`, `CreationMoodboardTab.tsx`):** Selector opcional de insumo textil del catálogo `atelier_materials` (`fetchMaterials()`) al crear/editar una `fabric_swatch`, autocompletando datos técnicos y guardando `material_id` en `metadata`.
  - **Preservación de Notas Originales — GAP-06 (`CreationMoodboardTab.tsx`):** Visualización diferenciada de `creation.notes` (*"📋 Notas originales del Expediente de Creación (M03 preservadas)"*) junto a `moodboard.artistic_notes` sin sobrescritura.
  - **Validación Técnica y E2E:** `cmd /c npx tsc --noEmit` en código `0` (`task-903`) y suite Playwright E2E (`task-913`, código `0`) con capturas actualizadas `12_m04_creation_moodboard_tab.png` a `16_m04_patronaje_bridge.png` y no-regresión verificada en M02/M03.

- **0. Auditoría Integral de Alcance, Trazabilidad y Preparación del Módulo 04 (`M04_*.md`):**
  - **`M04_ALCANCE_FUNCIONAL.md`:** Recuperación histórica documental (`Cuál es el siguiente módulo.docx`, `Atelier Digital - Presentación.pptx`), separación estricta entre requisitos históricos confirmados, funcionalidades ya operativas y 6 brechas identificadas (`GAP-01` a `GAP-06`).
  - **`M04_ARQUITECTURA_TECNICA.md`:** Diagrama ER y flujo entre M01–M04, especificación de las 3 tablas satélite (`creation_moodboards`, `moodboard_items`, `design_library_items`), bucket privado `design-assets`, políticas RLS y mapa de las 10 piezas de código de M04.
  - **`M04_MATRIZ_TRAZABILIDAD.md`:** Matriz de 14 requisitos (`R04-01` a `R04-14`) clasificados con rigor verificable en `COMPLETADO` (3), `PARCIAL` (7), `PENDIENTE` (1: carga de archivos desde dispositivo a `design-assets`) y `REQUIERE APROBACIÓN` (3: ejecución remota de migración SQL en Supabase, puente de referencia con Patronaje M02 y selector de tela con `atelier_materials` M03).
  - **`M04_MATRIZ_PRUEBAS.md`:** Catálogo de 14 escenarios de prueba (`T04-01` a `T04-14`) con pasos, criterios de aceptación y artefactos de evidencia.
  - **`M04_PLAN_IMPLEMENTACION.md`:** Plan incremental en 4 fases cortas y puntos de decisión explícitos para aprobación del usuario antes de tocar código o Supabase.

- **0. Módulo 04 — Diseño, Moodboard y Biblioteca de Autor By Katherine Carroll (Base Operativa Inicial):**
  - **Recuperación Histórica y Arquitectura Satélite:** Consolidado el alcance funcional de M04 (*"Diseño, moodboard y biblioteca — Diseño visual y referencias"*) conectado directamente con las Creaciones del Módulo 03 sin alterar `public.creations`.
  - **Esquema SQL y Seguridad (`supabase/migrations/20261109000000_design_moodboard_library_m04.sql`):** Tablas `creation_moodboards` (1:1 por creación con arquitectura de prenda y paleta JSONB), `moodboard_items` (1:N tarjetas pinboard con ordenamiento y fijado) y `design_library_items` (catálogo permanente de recursos de autor), con RLS para `designer`/`admin` y bucket privado `design-assets`.
  - **Tipos, Catálogo Maestro y Servicio Resiliente (`src/types/design.ts`, `src/services/designMockData.ts`, `src/services/designService.ts`):** Contratos tipados para siluetas, escotes, mangas, acabados textiles (`silk_sheen`, `matte`, `satin`, `metallic`, `translucent`, `velvet`), paletas cromáticas de firma (`SIGNATURE_COLOR_PALETTES`), CRUD completo con respaldo en memoria e importación en 1 clic desde la Biblioteca hacia el Moodboard de una creación (`importLibraryItemToCreation`), registrando hitos de aprobación estética en la bitácora del Módulo 03 (`recordCommercialEvent`).
  - **Mesa de Trabajo de Moodboard por Creación (`src/components/design/CreationMoodboardTab.tsx`):** Integrada en `CreationDetailView.tsx` tanto en vista ejecutiva compacta (pestaña `Resumen`) como en vista completa (pestaña `Concepto & Moodboard`). Incluye edición de concepto narrativo, selectores interactivos de arquitectura sartorial (Silueta, Escote y Manga), compositor de paleta cromática (`ColorPaletteSection.tsx`), galería Pinboard filtrable por tipo de pieza y aprobación formal del concepto estético.
  - **Biblioteca Permanente de Diseño (`DesignLibraryModal.tsx`, `DesignLibraryScreen.tsx`, `app/(designer)/library.tsx`):** Accesible tanto desde dentro de cada creación (para importar siluetas, escotes, mangas, caídas textiles y bordados en 1 clic) como desde el Home de Diseñadora (`app/(designer)/index.tsx` → `/(designer)/library`), con buscador, filtros por categoría y sello de autor (`★`), visor de armonías cromáticas y formulario para catalogar nuevos recursos permanentes.
  - **Validación Técnica y E2E:** `cmd /c npx tsc --noEmit` superado con 0 errores (código 0) y evidencias visuales generadas en navegador (`12_m04_creation_moodboard_tab.png`, `13_m04_design_library_modal.png`, `14_m04_moodboard_item_modal.png`, `15_m04_standalone_design_library.png`).

- **0. Módulo 03 — Fase 4: Cotizaciones Formales A4 Congeladas, Consecutivo Oficial y Multidivisa (Escenario T03):**
  - **Selector Multidivisa en Editor (`QuoteEditorModal.tsx`):** Selector segmentado `[COP ($)]` / `[USD ($)]` sincronizado automáticamente con la divisa de la propuesta activa (`activeProposal.currency`). Etiquetas y formateo de subtotales, descuentos, IVA (0% ó 19%) y anticipo sugerido del 50% adaptados a la moneda seleccionada.
  - **Snapshot JSONB Inmutable:** Al emitir la cotización, se congela la estructura completa de cálculo, divisa y timestamp de emisión (`frozen_at`), garantizando que variaciones futuras en el catálogo textil no alteren el histórico formal.
  - **Hoja Editorial A4 Imprimible (`PrintableQuoteModal.tsx`):** Visualización formal con branding de alta costura, desglose de conceptos (Telas e Insumos, Modelado Anatómico CAD), programa de pagos (50% anticipo / 50% contra entrega) y títulos monetarios dinámicos (*Pesos Colombianos (COP)* vs *Dólares Americanos (USD)*).
  - **Pestaña de Cotizaciones (`CreationQuotesTab.tsx`):** Pastilla distintiva de divisa (`COP` o `USD`) en cada oferta, formateo monetario reactivo, flujo de estados (`draft` → `sent` → `accepted`) e iniciación idempotente de proyecto de confección.
  - **Resiliencia en Servicios (`commercialService.ts`):** `createQuote`, `updateQuote` y `createProjectFromQuote` optimizados con respaldo en memoria ante contingencias de conectividad y unicidad estricta por `quote_id`.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` superado con 0 errores (código de salida 0) y capturas `05_quotes_tab.png`, `06_quote_editor_modal.png` y `07_printable_quote_a4.png` actualizadas en el navegador real.

- **0. Módulo 03 — Fase 3: Creaciones, Materiales y Propuestas Versionadas (T01 & T02):**
  - **Versionado de Propuestas (`CreationMaterialsTab.tsx`):** Selector de versiones de propuesta (`v1`, `v2`, etc.) con creación de nuevas variantes (`+ Nueva Versión`) sin destruir el histórico previo.
  - **Cálculo de Metraje Requerido vs Facturable (T01):** Validación automática de cantidades mínimas de proveedor (si el patronaje requiere 1.5 m pero el proveedor exige 3.0 m, se factura 3.0 m indicando la regla del proveedor).
  - **Soporte Multidivisa COP / USD:** Selector interactivo de moneda que recalcula costos y subtotales en tiempo real.
  - **Desglose de Mano de Obra:** Inclusión de fases de taller (Patronaje CAD 1:1, Corte y Confección) en la propuesta económica.
  - **Aprobación Formal con Snapshot Inmutable (T02):** Acción `✓ Aprobar Propuesta` que congela los precios, actualiza el perfil comercial satélite (`creation_commercial_profiles`) y genera trazabilidad en la bitácora (`commercial_events`).
  - **Catálogo Multidivisa (`MaterialsCatalogModal.tsx`):** Registro y visualización de precios unitarios en COP y USD, compra mínima y stock.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Fase 2: Arquitectura Satélite de 10 Tablas, Seguridad y Servicios:**
  - **Migración SQL Integral (`20261108000000_commercial_cycle_module_03.sql`):** Creadas las 10 tablas satélite requeridas sin alterar `public.creations`: `creation_commercial_profiles`, `atelier_materials`, `creation_proposals`, `creation_proposal_items`, `commercial_quotes`, `commercial_quote_items`, `atelier_projects`, `financial_movements`, `commercial_media_assets` y `commercial_events`.
  - **Seguridad RLS y Storage:** Políticas restrictivas para `designer` y `admin`, creación del bucket privado `commercial-assets` para adjuntos comerciales y fotos textiles.
  - **Tipado Estricto Multidivisa (`src/types/commercial.ts`):** Modelado completo para las 10 entidades, contratos COP/USD, perfiles satélite, desglose de ítems 1:N y soporte de anulación auditada de transacciones.
  - **Servicio Comercial Resiliente (`src/services/commercialService.ts`):** Implementados métodos para perfiles satélite (`fetchCommercialProfile`, `upsertCommercialProfile`), consulta con fallback transparente a tablas y mocks, registro de ítems normalizados, anulación auditada (`voidTransaction`), cálculo de resumen ignorando anulados y gestión de medios en storage.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Optimización de Cuadrícula y Legibilidad en Modal Financiero (`FinancialControlTab.tsx`, `commercialStyles.ts`):**
  - **Eliminación de Scroll Horizontal Trunco:** Se sustituyó el `ScrollView horizontal` que recortaba los chips por una cuadrícula de 2 columnas con `flexWrap: 'wrap'` y `flexBasis: '48%'`.
  - **Identificación Inmediata de Flujo de Caja:** Cada concepto muestra pastilla de flujo (`+ INGRESO CLIENTA` en verde esmeralda o `- EGRESO TALLER` en terracota oscuro) y checkmark dorado al seleccionarse.
  - **Canales de Pago con Iconografía:** Los medios de pago ahora presentan icono distintivo (🏦 Transferencia, ⚡ Wompi, 📱 Bold, 💵 Efectivo, 💳 Tarjeta, 🏷️ Consignación) y texto íntegro sin recortes.
  - **Captura Actualizada:** Regenerada la evidencia [`10_transaction_modal.png`](file:///C:/Users/jvinas/.gemini/antigravity/brain/07072a2c-7646-45a6-b977-172ea10df557/10_transaction_modal.png) verificando legibilidad al 100%.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Validación Funcional E2E de Inicio a Fin en Navegador (11 Evidencias):**
  - **Recorrido Completo Automatizado:** Suite de validación en navegador real (Edge/Chromium vía Playwright) ejecutada sobre `http://localhost:8082/preview-modulo3` cubriendo el 100% del ciclo de vida comercial y operativo de alta costura.
  - **11 Capturas de Pantalla Generadas:**
    1. `01_creations_list.png`: Lista de creaciones de alta costura, buscador interactivo, filtros facetados y tarjetas KPI.
    2. `02_creation_detail.png`: Vista detallada de encargo con fotografía editorial de prenda y stepper de 7 etapas.
    3. `03_materials_tab.png`: Pestaña de insumos con metraje requerido vs mínimo facturable por proveedor.
    4. `04_materials_catalog_modal.png`: Catálogo interactivo de telas con buscador y formulario de registro.
    5. `05_quotes_tab.png`: Pestaña de ofertas económicas con histórico y estados comerciales.
    6. `06_quote_editor_modal.png`: Editor de cotizaciones con desglose de insumos, confección, IVA y anticipo del 50%.
    7. `07_printable_quote_a4.png`: Hoja editorial formal A4 con branding *Atelier de Autor — By Katherine Carroll*.
    8. `08_workshop_project_tab.png`: Pipeline interactivo de 8 etapas de taller (Planificación → Entrega Final).
    9. `09_financial_control_tab.png`: Panel financiero con 5 tarjetas KPI (Total, Recaudado, Saldo, Egresos, Margen).
    10. `10_transaction_modal.png`: Formulario de registro de anticipos, abonos y egresos con validación.
    11. `11_logbook_tab.png`: Bitácora histórica unificada con línea de tiempo cronológica y trazabilidad inmutable.
  - **Validación Exitosa:** Suite completada con código 0 y `tsc --noEmit` con 0 errores de compilación.

- **0. Módulo 03 — Fase 7: Bitácora Editorial y Trazabilidad Comercial (`CreationLogbookTab.tsx`):**
  - **Componente Modular de Bitácora:** Creado [`src/components/commercial/CreationLogbookTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/CreationLogbookTab.tsx) e integrado en [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx), sustituyendo el código hardcoded por una línea de tiempo dinámica e interactiva.
  - **Línea de Tiempo Unificada:** Fusión cronológica de eventos nativos del encargo (creación, asignación de clienta, vinculación de sesión biométrica, linaje CAD paramétrico y versiones aprobadas) con los eventos comerciales registrados en Supabase (`commercial_events`).
  - **Registro Interactivo de Eventos:** Modal para agregar anotaciones históricas inmutables (Decisiones de Diseño, Pruebas de Fitting, Acuerdos con la Clienta y Notas de Taller).
  - **Reducción de Líneas en el Orquestador:** [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx) bajó de 608 a **552 líneas** (ahorro neto de 56 líneas y meta < 700 líneas ampliamente superada).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Fase 6: Control Financiero, Anticipos (50%) y Resumen Económico (`FinancialControlTab.tsx`):**
  - **Componente Modular de Finanzas:** Creado [`src/components/commercial/FinancialControlTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/FinancialControlTab.tsx) e integrado en [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx).
  - **Tarjetas KPI de Resumen Económico:** Visualización en tiempo real de Total Cotizado, Recaudado (Anticipos + Abonos), Saldo Pendiente por Cobrar, Egresos Reales de Taller (Telas + Servicios de Confección) y Margen Bruto Real del Proyecto.
  - **Historial y Registro de Transacciones:** Tabla de movimientos clasificados por tipo (Anticipo 50%, Abono, Pago Final, Compra de Telas, Gasto de Taller, Reembolso), medios de pago (Transferencia, Wompi, Bold, Efectivo, Tarjeta), números de comprobante/referencia y montos coloreados por flujo de caja.
  - **Modal de Registro de Pagos/Egresos:** Formulario interactivo con validación de montos superiores a cero y recálculo automático de saldos y márgenes.
  - **Límites Arquitectónicos Preservados:** [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx) en **598 líneas** (< 700 líneas).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Fase 5: Proyectos Operativos de Confección y Taller (`ProjectExecutionTab.tsx`):**
  - **Reemplazo de Placeholder:** Sustituido el contenedor `PRÓXIMAMENTE` de la pestaña Confección en [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx) por [`src/components/commercial/ProjectExecutionTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/ProjectExecutionTab.tsx).
  - **Pipeline de 8 Etapas de Taller:** Stepper interactivo para seguimiento de confección: 1. Planificación → 2. Trazado & Corte → 3. Armado & Hilván → 4. Primera Prueba (Glasilla) → 5. Ajustes de Calce → 6. Segunda Prueba → 7. Acabados a Mano → 8. Entrega Final.
  - **Gestión Operativa de Taller:** Asignación de sastre/confeccionista responsable, fecha estimada de entrega, prioridad (Normal / Alta / Urgente), bitácora de observaciones técnicas de fitting y activación directa/conversión desde cotización aceptada.
  - **Optimización de Líneas:** [`CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx) se mantiene en **591 líneas** (< 700 líneas).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Fase 4: Propuestas de Diseño y Cotizaciones Formales A4 (`QuoteEditorModal.tsx`, `PrintableQuoteModal.tsx`, `CreationQuotesTab.tsx`):**
  - **Modal de Emisión de Cotización (`QuoteEditorModal.tsx`):** Interfaz para estructurar ofertas económicas formales con cálculo automático de subtotal bruto, descuentos comerciales, IVA configurable (0% o 19%), total cotizado en COP y anticipo sugerido del 50%.
  - **Documento Formal A4 Imprimible (`PrintableQuoteModal.tsx`):** Hoja A4 con tipografía serif y branding *Atelier de Autor — By Katherine Carroll*, numeración oficial `COT-YYYY-XXXX`, desglose de conceptos, calendario de pagos (50% anticipo / 50% saldo), condiciones comerciales, firmas formales y soporte nativo para impresión/exportación PDF web (`window.print()`).
  - **Pestaña de Cotizaciones de la Creación (`CreationQuotesTab.tsx`):** Lista reactiva de cotizaciones por creación con filtros de estado (`draft`, `sent`, `accepted`, `rejected`, `expired`), visor directo del A4 y botón de conversión directa a Proyecto de Taller al aceptar la oferta.
  - **Integración en Vista de Detalle (`CreationDetailView.tsx`):** Agregada pestaña 'Cotizaciones' y renderizado modular sin inflar el orquestador (603 líneas, < 700 líneas).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de inmutabilidad y snapshots 100% preservados.

- **0. Corrección de Empaquetado Web — Resolución de Rutas de Assets (`dossier/`):**
  - **Diagnóstico:** El empaquetador web de Expo Router reportó error al resolver `mannequin_woman_real.jpg` debido a que `DossierSessionsTab.tsx` y `DossierModals.tsx` se encuentran en `src/components/clients/dossier/` (4 niveles de profundidad) y apuntaban erróneamente a `../../../assets/` (3 niveles).
  - **Ajuste:** Se corrigieron todas las referencias de maniquí en ambos archivos a `../../../../assets/mannequin_woman_real.jpg` y `mannequin_man_real.jpg`.
  - **Validación:** Empaquetado web restablecido y `tsc --noEmit` completado con código 0 y 0 errores.

- **0. Módulo 03 — Fases 2 y 3: Migración SQL, Servicio Comercial y Catálogo de Materiales (`commercialService.ts`, `CreationMaterialsTab.tsx`):**
  - **Migración SQL Aditiva (`20261108000000_commercial_cycle_module_03.sql`):** Generada la especificación completa para Supabase con secuencias de negocio (`CR-`, `PROP-`, `COT-`, `PRJ-`), extensión aditiva en `creations`, y tablas completas con RLS (`materials`, `creation_proposals`, `commercial_quotes`, `commercial_projects`, `financial_transactions`, `commercial_events`).
  - **Servicio Comercial Integral (`src/services/commercialService.ts`):** Métodos CRUD tipados y cálculo financiero para materiales, propuestas con snapshot inmutable, cotizaciones A4, proyectos de confección y transacciones con validación de idempotencia.
  - **Catálogo de Materiales y Pestaña de Creación (`src/components/commercial/`):** Creados `commercialStyles.ts`, `MaterialsCatalogModal.tsx` y `CreationMaterialsTab.tsx`. Reemplazado el placeholder `PRÓXIMAMENTE` en `CreationDetailView.tsx` por la gestión reactiva de telas y cálculo de metraje requerido vs facturable.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Orquestadores en tamaño óptimo (`CreationsModule.tsx` en 230 líneas, `CreationDetailView.tsx` en 596 líneas).

- **0. Módulo 03 — Fase 1: Tipado Integral del Ciclo Comercial (`src/types/commercial.ts`):**
  - **Modelado Exhaustivo:** Creado [`src/types/commercial.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/types/commercial.ts) con tipado estricto para las 5 entidades del ciclo comercial:
    1. Catálogo de Materiales (`MaterialItem`, `MaterialCategory`: telas, forros, entretelas, avíos, pedrería, herrajes).
    2. Propuestas de Diseño (`DesignProposal`, metrajes requeridos vs. facturables por compra mínima, avíos, fases de mano de obra).
    3. Cotizaciones Formales A4 (`CommercialQuote`, snapshot inmutable de costos, descuentos, IVA configurable y cálculo de anticipos).
    4. Proyectos de Confección (`CommercialProject`, vinculación con creaciones, clientas y estados de taller).
    5. Control Financiero y Egresos (`FinancialTransaction`, `FinancialSummary`, separación de anticipos, cobros y compras de insumos).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos 100% compatibles con la arquitectura modular existente.

- **0. Modularización Gradual Paso 4.5 y CULMINACIÓN FASE 4 (`CreationsModule.tsx`):**
  - **Desacoplamiento a `useCreationsState.ts`:** Se extrajo toda la gestión reactiva de estado (creaciones, filtros, búsqueda, detalle seleccionado, pestañas, modales de creación/edición/enlace de medidas, asignación de personas físicas, apertura de Taller CAD y notificaciones flotantes toast) hacia [`src/components/creations/useCreationsState.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/useCreationsState.ts) (433 líneas).
  - **Reducción Final Extraordinaria:** [`CreationsModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsModule.tsx) bajó de **553 líneas a 230 líneas** (reducción acumulada de **3,403 líneas**, **–93.7%** desde las 3,633 iniciales), transformándose en un orquestador puramente declarativo y ultra-legible.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de creación, edición, vinculación de medidas y apertura de CAD 100% preservados.

- **0. Modularización Gradual Paso 4.4 — Vista de Lista, Filtros y Cuadrícula (`CreationsModule.tsx`):**
  - **Desacoplamiento a `CreationsListView.tsx`:** Se extrajo la barra de búsqueda reactiva por título/clienta/referencia, los chips de filtro por estado de creación, el resumen editorial con tarjetas KPI de encargo (total creaciones, en fitting, aprobadas, confección, finalizadas y patrones CAD vigentes con contador de iteraciones) y la cuadrícula responsive de tarjetas de creación con marca de agua Katherine Carroll hacia [`src/components/creations/CreationsListView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsListView.tsx) (410 líneas).
  - **Reducción a Meta Arquitectónica:** [`CreationsModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsModule.tsx) bajó de **896 líneas a 553 líneas** (reducción acumulada de **3,080 líneas**, **–84.8%** desde las 3,633 iniciales), superando holgadamente la meta de `< 700 líneas`.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de búsqueda, filtrado, tarjetas de creaciones y apertura de detalle 100% preservados.

- **0. Modularización Gradual Paso 4.3 — Vista Detallada de Creación y Modelo de Dominio (`CreationsModule.tsx`):**
  - **Desacoplamiento a `CreationDetailView.tsx` y `creationsModel.ts`:** Se extrajo la vista detallada de la creación (cabecera con fotografía editorial, stepper de etapas editoriales, selector rápido de estados, pastillas de tipo/estado, datos de clienta titular o sujeto medido, y pestañas de concepto, medidas vinculadas, linaje CAD y cuaderno de fitting) hacia [`src/components/creations/CreationDetailView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx) (608 líneas). Asimismo, se consolidaron los tipos, etiquetas y catálogo de imágenes editoriales hacia [`src/components/creations/creationsModel.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/creationsModel.ts) (159 líneas).
  - **Reducción Masiva de Líneas:** [`CreationsModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsModule.tsx) bajó de **1,557 líneas a 896 líneas** (reducción acumulada de **2,737 líneas**, **–75.3%** desde las 3,633 iniciales).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de navegación, apertura CAD, vinculación de sesiones y conmutación de pestañas 100% preservados.

- **0. Modularización Gradual Paso 4.2 — Modales de Creaciones (`CreationsModule.tsx`):**
  - **Desacoplamiento a `CreationsModals.tsx`:** Se extrajeron los 3 modales de taller (Creación de Encargo con selector de clienta y persona física asociada, Edición de Metadatos de la Creación y Vinculación de Sesión de Medidas anatómicas) hacia [`src/components/creations/CreationsModals.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsModals.tsx) (549 líneas).
  - **Reducción de Líneas:** [`CreationsModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsModule.tsx) bajó de **1,952 líneas a 1,557 líneas** (reducción acumulada de **2,076 líneas**, **–57.1%** desde las 3,633 iniciales).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de asignación de clientas, selección de personas y enlace de sesiones 100% preservados.

- **0. Modularización Gradual Paso 4.1 — Estilos de Creaciones y Alta Costura (`CreationsModule.tsx`):**
  - **Desacoplamiento a `creationsModuleStyles.ts`:** Se extrajeron 1,690 líneas de estilos monolíticos de tarjetas editoriales de creaciones, filtros de estado, cabecera de taller, pestañas de concepto/medidas/fitting, modales de formulario y cuadrículas responsive hacia [`src/components/creations/creationsModuleStyles.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/creationsModuleStyles.ts).
  - **Reducción Inmediata de Líneas:** [`CreationsModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationsModule.tsx) bajó de **3,633 líneas a 1,952 líneas** (ahorro inmediato de **1,681 líneas**, **–46.3%**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos visuales, responsividad, paleta cromática y tipografía 100% preservados.

- **0. Modularización Gradual Paso 3.15 y CULMINACIÓN FASE 3 (`PatternModule.tsx`):**
  - **Desacoplamiento a `usePatternEngineActions.tsx` y `PatternStudioWorkspace.tsx`:** Se extrajo la orquestación del motor CAD y acciones de exportación hacia [`src/components/pattern/usePatternEngineActions.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/usePatternEngineActions.tsx) (771 líneas) y el espacio de trabajo modular del taller (panel lateral izquierdo, banners de flujos B/D, cabecera de creaciones C y las 5 pestañas de estudio) hacia [`src/components/pattern/PatternStudioWorkspace.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioWorkspace.tsx) (555 líneas).
  - **Limpieza de Imports y Declaraciones Obsoletas:** Se removieron ~150 imports no utilizados y constantes locales duplicadas en [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx).
  - **Reducción Histórica Final:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **1,883 líneas a 575 líneas** (meta arquitectónica de < 700 líneas superada; reducción total acumulada de **14,819 líneas**, **–96.3% de reducción global** desde las 15,394 líneas iniciales).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de reactividad biométrica, motor CAD, exportaciones SVG/DXF/PDF, inmutabilidad de patrones y ciclo de vida de fitting 100% preservados.

- **0. Modularización Gradual Paso 3.14 — Hook de Estados, Reactividad y Diagnósticos (`PatternModule.tsx`):**
  - **Desacoplamiento a `usePatternStudioState.ts`:** Se extrajo toda la gestión reactiva de estado (flujos A/B/C/D, creaciones, perfiles antropométricos, clientas, sesiones, holguras, plantillas, responsive/tableta, modales de fitting/revisión, staged adjustments, diagnósticos estructurados de medidas C10/estimaciones, resumen editorial de creaciones, checklist de auditoría C13 y sincronización con Supabase) hacia [`src/components/pattern/usePatternStudioState.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/usePatternStudioState.ts) (1,778 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **3,112 líneas a 1,883 líneas** (reducción masiva de **1,229 líneas**; reducción acumulada de **13,511 líneas** desde las 15,394 originales; **87.8% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de inmutabilidad, ciclo de vida de fitting y reactividad biométrica 100% preservados.

- **0. Modularización Gradual Paso 3.13 — Cabecera de Taller y Selector de Pestañas (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioHeaderBar.tsx`:** Se extrajeron la cabecera principal de taller (`PatternStudioMainHeader` con marca Katherine Carroll, botón de retorno, títulos dinámicos, accesos al Banco Global de Patrones y Copiloto Consultivo), la subcabecera de navegación de flujos (`PatternStudioWorkflowSubHeader` con pill cromático A/B/C/D, resumen contextual y switch de flujo) y la barra de 5 pestañas de estudio (`PatternStudioTabBar` con selectores para Prenda & Silueta, Mesa CAD, Fitting & Ajustes con contador, Ficha & Auditoría C13 y Bitácora con historial) hacia [`src/components/pattern/PatternStudioHeaderBar.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioHeaderBar.tsx) (277 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **3,276 líneas a 3,112 líneas** (reducción acumulada de **12,282 líneas** desde las 15,394 originales; **79.8% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de navegación entre flujos, sincronización de pestañas y botones de acción 100% preservados.

- **0. Modularización Gradual Paso 3.12 — Banners Persistentes de Taller Flujos B y D (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioWorkflowBanners.tsx`:** Se extrajeron los banners persistentes de taller: Flujo B (`PatternStudioDirectWorkflowBanner` con pill de patronaje directo, toggle colapsable de anatomía completa, grid de atributos técnicos [clienta, sesión, prenda, plantilla, generación, validación C10], alerta de desincronización de sesión y espacio biométrico de trabajo `AtelierClientAnatomyWorkspace`) y Flujo D (`PatternStudioFreeWorkflowBanner` con Hero editorial exclusivo "Del gesto a la geometría", tarjeta persistente de identidad/origen/perfil/destino, estado de ciclo de vida con badges cromáticos y acciones opcionales de asociar clienta/creación) hacia [`src/components/pattern/PatternStudioWorkflowBanners.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioWorkflowBanners.tsx) (489 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **3,553 líneas a 3,276 líneas** (reducción acumulada de **12,118 líneas** desde las 15,394 originales; **78.7% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de reactividad anatómica, trazado paramétrico puro e inmutabilidad de patrones 100% preservados.

- **0. Modularización Gradual Paso 3.11 — Columna Lateral Izquierda y Drawer Anatómico (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioLeftSidebar.tsx`:** Se extrajo la barra de activación superior para tableta vertical con avatar monograma y resumen biométrico, el drawer modal deslizable completo para inspección de clientas y maniquí interactivo, y la columna lateral izquierda de taller (con soporte para vista dual en patrón libre con `AtelierGrandAnatomicalMannequin` y para clientas con `AtelierClientSelector` + `AtelierMannequinDisplay` + historial de sesiones) hacia [`src/components/pattern/PatternStudioLeftSidebar.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioLeftSidebar.tsx) (331 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **3,746 líneas a 3,553 líneas** (reducción acumulada de **11,841 líneas** desde las 15,394 originales; **76.9% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de reactividad anatómica, soporte ergonómico para tableta vertical y sincronización de sesiones 100% preservados.

- **0. Modularización Gradual Paso 3.10 — Vistas y Stepper de Creaciones de Alta Costura (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioCreationFlow.tsx`:** Se extrajo el selector de entrada explícita clienta-creación (`CreationEntrySelector`), la barra contextual superior con metadata y badge de estado activo (`CreationContextBar`), el stepper de 7 etapas editoriales (`CreationStepper`), la vista editorial protagonista de la prenda (`CreationHero` + `ReadinessCard` en etapa 'creation'), y el diagnóstico anatómico y espacio de trabajo biométrico (`AnatomyDiagnosisCard` + `AtelierClientAnatomyWorkspace` en etapa 'anatomy') hacia [`src/components/pattern/PatternStudioCreationFlow.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioCreationFlow.tsx) (325 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **3,815 líneas a 3,746 líneas** (reducción acumulada de **11,648 líneas** desde las 15,394 originales; **75.7% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de navegación editorial del Flujo C, sincronización de la clienta, inmutabilidad anatómica y maniquí 100% preservados.

- **0. Modularización Gradual Paso 3.9 — Pestaña de Prenda, Silueta y Medidas de Referencia (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioGarmentTab.tsx`:** Se extrajo la sección completa de medidas de referencia antropométrica y perfiles normalizados para patrón libre (Flujo D), selector de categorías demográficas (Mujer, Hombre, Niña, Niño, Cotas Libres), selector de tallas y equivalencias, ficha anatómica del perfil seleccionado con cotas en cm (busto, cintura, cadera, cuello, talle, hombro, brazo, tiro), tarjeta editorial de alta costura de prenda para creaciones (`CreationGarmentCard` en Flujo C) y la cuadrícula interactiva de selección de prendas y siluetas técnicas (`GarmentSelectionGrid`) hacia [`src/components/pattern/PatternStudioGarmentTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioGarmentTab.tsx) (409 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **4,103 líneas a 3,815 líneas** (reducción acumulada de **11,579 líneas** desde las 15,394 originales; **75.2% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de perfiles antropométricos, navegación hacia Mesa CAD, selección de siluetas y reactividad biométrica 100% preservados.

- **0. Modularización Gradual Paso 3.8 — Pestaña de Bitácora y Linaje Histórico de Taller (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioHistoryTab.tsx`:** Se extrajo el árbol genealógico inmutable de creaciones (`CreationTimeline`), estado vacío con redirección hacia Mesa CAD, guía de seguridad de corte total y linaje de versiones, árbol jerárquico de versiones padre/hija con tags de estado (aprobado, fitting, generado), cabecera tabular estructurada C13 (fecha, clienta/destino, prenda, plantilla, versión, estado, diseñadora), tarjetas de versiones con motivo descriptivo y botones de acción (cargar vista y comparación delta geométrica) hacia [`src/components/pattern/PatternStudioHistoryTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioHistoryTab.tsx) (328 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **4,355 líneas a 4,103 líneas** (reducción acumulada de **11,291 líneas** desde las 15,394 originales; **73.3% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de inmutabilidad de patrones, comparación histórica, linaje M02.15 y selección de ejecuciones 100% preservados.

- **0. Modularización Gradual Paso 3.7 — Pestaña de Ficha Técnica, Auditoría C13 y Ciclo de Vida (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioSpecsTab.tsx`:** Se extrajo el dossier técnico editorial de creaciones (`CreationDossierOverview`), estado vacío con redirección hacia Mesa CAD, ficha técnica completa del patrón a escala 1:1 mm con metadata biométrica, desglose de piezas geométricas (dimensiones, aplomos, piquetes, márgenes), banner de auditoría C13 con checklist de 11 criterios obligatorios, indicador visual de pasos del ciclo de vida técnico (C13.14), panel de aprobación inmutable y botones de acción RBAC (enviar a fitting, registrar ajuste, devolver y aprobar) hacia [`src/components/pattern/PatternStudioSpecsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioSpecsTab.tsx) (560 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **4,799 líneas a 4,355 líneas** (reducción acumulada de **11,039 líneas** desde las 15,394 originales; **71.7% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de aprobación de alta costura, inmutabilidad de patrones, 11 criterios de corte y permisos RBAC 100% preservados.

- **0. Modularización Gradual Paso 3.6 — Pestaña de Fitting y Pruebas de Calce (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioFittingTab.tsx`:** Se extrajo el cuaderno de fitting editorial (`CreationFittingNotebook`), estado vacío con redirección hacia Mesa CAD, historial cronológico de ajustes de prueba registrados (C12), tarjeta técnica de la ejecución base con metadata completa (clienta, prenda, versión, fecha, diseñadora, destino), tabla de ajustes escenificados (`stagedAdjustments`) con borrado individual, bitácora de observaciones de fitting y botón de regeneración paramétrica hacia [`src/components/pattern/PatternStudioFittingTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioFittingTab.tsx) (384 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **5,081 líneas a 4,799 líneas** (reducción acumulada de **10,595 líneas** desde las 15,394 originales; **68.8% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de regeneración paramétrica, inmutabilidad de patrones, permisos RBAC de taller y trazabilidad delta 100% preservados.

- **0. Modularización Gradual Paso 3.5 — Modales de Estudio, Trazabilidad y Auditoría (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioModals.tsx`:** Se extrajeron los 15 modales de taller, confirmación, trazabilidad geométrica y auditoría (sesión derivada, ajustes de prueba M02.12, copiloto IA M02.10, dossier técnico de producción M02.14, confirmación de aprobación inmutable M02.09, comparación geométrica antes/después M02.12, retorno a revisión de taller, registro de nuevo ajuste, confirmación de regeneración paramétrica, confirmación de generación con estimaciones normalizadas, visor de zoom de bocetos de alta costura, panel contextual InfoSheet, diálogo de cotas para patrón libre, selector modal de clienta y selector modal de creación) hacia [`src/components/pattern/PatternStudioModals.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioModals.tsx) (1,649 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **6,287 líneas a 5,081 líneas** (reducción acumulada de **10,313 líneas** desde las 15,394 originales; **67.0% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de tipado estricto (`PatternStudioModalsProps`), inmutabilidad de patrones, trazabilidad delta y enlace de creaciones 100% preservados.

- **0. Modularización Gradual Paso 3.4 — Mesa CAD, Trazado y Exportaciones (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioCadTab.tsx`:** Se extrajo la configuración técnica de prendas, selector de perfiles de holgura (`EaseProfile`), cálculo de márgenes de costura, control de trazado en vivo, lienzo interactivo vectorial (`PatternPreviewCanvas`), botones de exportación profesional (DXF, SVG, PDF mosaico A4), diagnóstico de cobertura biométrica y cierre en Banco Global hacia [`src/components/pattern/PatternStudioCadTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioCadTab.tsx) (980 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **7,055 líneas a 6,287 líneas** (reducción acumulada de **9,107 líneas** desde las 15,394 originales; **59.2% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de renderizado vectorial, cálculo de holguras, linaje inmutable y exportaciones CAD 100% preservados.

- **0. Modularización Gradual Paso 3.3 — Flujo de Medidas y Maniquí Anatómico (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioMeasuresFlow.tsx`:** Se extrajo el selector de clientas y sesiones, resumen anatómico, histórico de sesiones derivadas, maniquí maestro interactivo (`AtelierGrandAnatomicalMannequin`), tabla de medidas agrupadas por categorías canónicas y menú de exportación hacia [`src/components/pattern/PatternStudioMeasuresFlow.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioMeasuresFlow.tsx) (864 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **7,749 líneas a 7,055 líneas** (reducción acumulada de **8,339 líneas** desde las 15,394 originales; **54.2% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de reactividad anatómica, equivalencias mm, exportación PDF/SVG/CSV y maniquí 100% preservados.

- **0. Modularización Gradual Paso 3.2 — Hub Editorial Principal (`PatternModule.tsx`):**
  - **Desacoplamiento a `PatternStudioHub.tsx`:** Se extrajo la portada asimétrica de alta costura, tarjetas protagonistas (01 Clientas, 02 Directo, 03 Creaciones), tarjetas secundarias (04 Banco, 05 Patrón Libre) y accesos directos al archivo hacia [`src/components/pattern/PatternStudioHub.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternStudioHub.tsx) (467 líneas).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **8,171 líneas a 7,749 líneas** (reducción acumulada de **7,645 líneas** desde las 15,394 originales; –49.7%).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de navegación entre workflows, resets de contexto y grids responsivos 100% preservados.

- **0. Modularización Gradual Paso 3.1 — Estilos de Taller CAD (`PatternModule.tsx`):**
  - **Desacoplamiento a `patternModuleStyles.ts`:** Se extrajeron 7,232 líneas de estilos monolíticos de taller CAD, alta costura, maniquí y panel editorial hacia [`src/components/pattern/patternModuleStyles.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/patternModuleStyles.ts).
  - **Reducción de Líneas:** [`PatternModule.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/pattern/PatternModule.tsx) bajó de **15,394 líneas a 8,171 líneas** (reducción inmediata de **7,223 líneas**, –46.9%).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Plataforma, tipografía y paleta cromática 100% preservadas.

- **0. Modularización Gradual Paso 2.8 — Modales del Expediente (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `DossierModals.tsx`:** Se extrajo el contenedor integral de modales (Inspector Anatómico con Maniquí Interactivo y cotas, Comparador Histórico de Sesiones con cálculo delta, Captura Rápida de Medidas y Wizard Puente Medidas-CAD) hacia [`src/components/clients/dossier/DossierModals.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/DossierModals.tsx) (620 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **1,148 líneas a 637 líneas** (reducción acumulada de 4,511 líneas desde las 5,148 originales; **87.6% de reducción global**).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Inmutabilidad anatómica, sincronización reactiva del maniquí y linaje CAD 100% preservados.

- **0. Modularización Gradual Paso 2.7 — Pestaña de Resumen General (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `DossierOverviewTab.tsx`:** Se extrajo la arquitectura relacional de la clienta, tarjetas resumen de anatomía/institución, lista compacta de creaciones y linaje editorial de patrones CAD hacia [`src/components/clients/dossier/DossierOverviewTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/DossierOverviewTab.tsx) (355 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **1,427 líneas a 1,148 líneas** (reducción acumulada de 4,000 líneas desde las 5,148 originales; >77.7% de ahorro).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de navegación cruzada hacia patrones, creaciones y sesiones 100% preservados.

- **0. Modularización Gradual Paso 2.6 — Pestaña de Sesiones de Medidas Anatómicas (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `DossierSessionsTab.tsx`:** Se extrajo el historial de sesiones de medidas, selector de sujeto anatómico, métricas KPI de estados, barra de búsqueda reactiva, filtros y acciones de captura/comparación/CAD hacia [`src/components/clients/dossier/DossierSessionsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/DossierSessionsTab.tsx) (495 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **1,983 líneas a 1,427 líneas** (reducción acumulada de 3,721 líneas desde las 5,148 originales; >72.2% de ahorro).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos con modales de captura rápida, inspector anatómico, comparador y Wizard CAD 100% preservados.

- **0. Modularización Gradual Paso 2.5 — Pestaña de Creaciones de Alta Costura (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `DossierCreationsTab.tsx`:** Se extrajo la pestaña completa de creaciones, selector facetado por alumno/titular, métricas KPI reactivas, barra de búsqueda, filtros de estado y orden cronológico hacia [`src/components/clients/dossier/DossierCreationsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/DossierCreationsTab.tsx) (485 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **2,460 líneas a 1,983 líneas** (reducción acumulada de 3,165 líneas desde las 5,148 originales; >61.5% de ahorro).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos de navegación, apertura CAD y vinculación con personas y medidas 100% preservados.

- **0. Modularización Gradual Paso 2.4 — Pestaña de Patrones y Linaje Inmutable (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `DossierPatternsTab.tsx`:** Se extrajo el directorio de patrones CAD, árbol genealógico inmutable, estados de aprobación/fitting, desglose de ejecuciones y apertura de taller CAD hacia [`src/components/clients/dossier/DossierPatternsTab.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/DossierPatternsTab.tsx) (360 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **2,780 líneas a 2,460 líneas** (ahorro acumulado de 2,688 líneas desde las 5,148 originales; reducción de más del 52%).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos CAD, filtros por sesión y navegación técnica 100% preservados.

- **0. Modularización Gradual Paso 2.3 — Cabecera Editorial y Selector de Pestañas (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `DossierClientHeader.tsx`:** Se extrajo la cabecera editorial de identidad, avatar, notas de estilo, resumen ontológico/institucional y el selector de pestañas hacia [`src/components/clients/dossier/DossierClientHeader.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/DossierClientHeader.tsx) (215 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **2,954 líneas a 2,780 líneas** (ahorro acumulado de 2,368 líneas desde las 5,148 originales).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Navegación entre pestañas, contadores y badges 100% preservados.

- **0. Modularización Gradual Paso 2.2 — Modal de Inspección Técnica de Patrón (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `PatternDetailModal.tsx`:** Se extrajo el modal de inspección técnica, linaje inmutable y ajustes de taller hacia [`src/components/clients/dossier/PatternDetailModal.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/PatternDetailModal.tsx) (389 líneas).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **3,220 líneas a 2,954 líneas** (ahorro acumulado de 2,194 líneas desde las 5,148 originales).
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Inmutabilidad y contratos CAD 100% preservados.

- **0. Modularización Gradual Paso 2.1 — Estilos de Expediente de Clienta (`ClientDossierView.tsx`):**
  - **Desacoplamiento a `clientDossierStyles.ts`:** Se extrajeron 1,928 líneas de estilos monolíticos hacia [`src/components/clients/dossier/clientDossierStyles.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/dossier/clientDossierStyles.ts).
  - **Reducción de Líneas:** [`ClientDossierView.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/clients/ClientDossierView.tsx) bajó de **5,148 líneas a 3,220 líneas** (reducción inmediata de 1,928 líneas) sin alterar ninguna regla visual ni interfaz responsive.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Modularización Gradual Fase 1B — Cierre de Personas y Grupos (`PersonGroupSection.tsx`):**
  - **Desacoplamiento Integral en `src/components/clients/personGroup/`:**
    - `usePersonGroupSection.ts` (360 líneas): Hook de negocio que encapsula la carga paralela resiliente de Supabase, filtros facetados, ordenamiento dinámico, paginación y handlers de formularios/exportaciones.
    - `PersonGroupHeader.tsx` (65 líneas): Cabecera editorial con acciones principales (`[+ Nueva Persona]`, `[+ Nuevo Grupo]`, `[+ Nueva Jornada]`, `[📥 Importar]`, `[📤 Exportar]`).
    - `PersonFiltersBar.tsx` (170 líneas): Toolbar de búsqueda reactiva, filtros rápidos por estado, selector horizontal de grupos, botones de categorías demográficas, conteo y alternador de vista (`[📋 Tabla]` vs `[🗂️ Fichas]`).
    - `PersonCardsView.tsx` (150 líneas): Vista responsive en tarjetas/fichas táctiles para tabletas y móviles con avatares, referencias, grupos, badges de estado y botones ergonómicos al alcance del pulgar.
    - `PersonTableView.tsx` (260 líneas): Tabla editorial de escritorio con doble barra de desplazamiento horizontal sincronizada (superior e inferior), ordenamiento interactivo por columnas y acciones compactas.
    - `PersonPaginationBar.tsx` (45 líneas): Controles de paginación limpios y accesibles.
    - `GroupsTabContent.tsx` (70 líneas): Cuadrícula editorial de núcleos y grupos familiares/escolares con contador de integrantes y gestión.
    - `CampaignsTabContent.tsx` (110 líneas): Cuadrícula de jornadas de medición con barras de progreso, accesos a captura rápida (`⚡ Captura Rápida`) y generación de fichas A4.
    - `PersonGroupModals.tsx` (160 líneas): Contenedor unificado para los 5 modales de la sección y los diálogos especializados del atelier.
    - `personGroupStyles.ts` (1,338 líneas): Estilos consolidados de alta costura.
  - **Reducción Histórica de Tamaño:** `PersonGroupSection.tsx` pasó de **3,504 líneas a tan solo 227 líneas** (reducción del **93.5%**), quedando estrictamente en **< 300 líneas** como un orquestador declarativo ultra-liviano.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores. Contratos y props públicas (`client`, `onSessionCreated`, `onViewPersonHistory`) 100% preservadas.

- **0. Modularización Gradual Fase 1A — Modales y Estilos (`PersonGroupSection.tsx`):**
  - **Desacoplamiento Estructural Completo:** Se extrajeron los 5 modales y la totalidad de los estilos monolíticos de `PersonGroupSection.tsx` hacia la subcarpeta modular dedicada `src/components/clients/personGroup/`:
    - `personGroupStyles.ts` (1,338 líneas): Estilos unificados con identidad de Alta Costura, exportados para consumo del componente principal y submódulos.
    - `PersonFormModal.tsx`: Modal para registro y edición de personas medidas.
    - `GroupFormModal.tsx`: Modal para creación y configuración de núcleos/grupos.
    - `GroupMembersModal.tsx`: Modal de gestión interactiva de miembros por grupo con tipado estricto.
    - `MeasurementCampaignModal.tsx`: Modal de planificación de jornadas de medición con selección de plantillas y unidades.
    - `MeasurementExportModal.tsx`: Modal editorial para exportación (Excel estilizado, CSV crudo y plantilla en blanco).
  - **Reducción Drástica de Líneas:** `PersonGroupSection.tsx` se redujo de **3,504 líneas a 1,735 líneas** (ahorro superior al 50%), manteniendo el 100% de los contratos de props, estados y persistencia en Supabase.
  - **Validación Exitosa:** `cmd /c npx tsc --noEmit` completado con código 0 y 0 errores.

- **0. Directorio de Patrones Visual con Fotografía de Prenda (`ClientDossierView.tsx`):**
  - **Identificación Visual Inmediata:** Integrada fotografía editorial de la prenda correspondiente a cada grupo de patrón (`patternGarmentPhoto` en 64×64 px con borde redondeado y marco arena `#EFECE6`), obtenida dinámicamente desde la creación vinculada (`getCreationPhoto`) o del catálogo editorial canónico (`CREATION_EDITORIAL_IMAGES` / `jacket`, `bodice`, `skirt`, `pants`, `dress`, `coat`, etc.).
  - **Cabecera Armonizada y Responsiva (`groupMasterHeader`):** Alineación horizontal fluida (`groupMasterHeaderLeft` con `flexWrap: 'wrap'`), manteniendo el título en serif/bold, insignia de conteo de ejecuciones, badge de creación vinculada y estado de vigencia sin desbordamientos.
  - **Ficha de Trazabilidad en Modal (`modalGarmentPhoto`):** La inspección técnica de detalle y linaje inmutable ahora también exhibe la fotografía de la prenda en la cabecera del modal para coherencia visual completa.

- **0. Internacionalización Bilingüe de la Landing Page Pública (ES / EN):**
  - **Alcance Estricto Landing Pública:** Implementado soporte bilingüe integral exclusivamente para la landing comercial (`app/index.tsx`) y el pie de página público (`src/components/PublicFooter.tsx`), sin alterar módulos internos ni backend.
  - **Español Predeterminado y Fallback Robusto:** Configurado `es` como idioma nativo predeterminado en primera visita, con lectura asíncrona de storage (`@atelier_landing_language`) sin bloqueo de renderizado.
  - **Selector de Idioma Elegante (`LanguageSelector.tsx`):** Cápsula conmutadora estilizada con estética de alta costura (`#171411`, champagne gold `#C5A880`, tipografía serif) integrada en la cabecera superior y adaptable a móvil y escritorio sin provocar saltos de diseño.
  - **Diccionario Tipado 100% Cobertura (`landingTranslations.ts`):** Traducción profesional al inglés de terminología de alta costura, navegación, titulares, 3 especialidades, tarjeta de acceso, 3 pilares, cuadrícula de 4 servicios destacados, sección de confidencialidad / Ley 1581 / Transparencia IA, banner de contacto y pie de página completo.
  - **Sincronización Dinámica de Metadatos Web:** `LandingLanguageContext` actualiza de inmediato `document.documentElement.lang`, `document.title` y la etiqueta `meta[name="description"]` al alternar entre ES y EN.

- **1. Optimización Permanente de Tokens y Continuidad (ACT-01, ACT-04 y Estándar Louka):**
  - **Directrices en `AGENTS.md` (ACT-01):** Integradas permanentemente las directrices de continuidad, comandos en Windows (`cmd /c npx`, no operadores bash) y lectura selectiva de bloques (≤ 150 líneas) para no volver a pegar prompts extensos en cada sesión.
  - **Mapa Sintético `PROJECT_INDEX.md` (ACT-04):** Creado índice ligero (<40 líneas) como referencia directa de carpetas y archivos críticos para evitar exploraciones recursivas que gastan contexto.
  - **Manual de Transferencia (`ACUERDOS_OPTIMIZACION_TOKENS_Y_PROMPTS.md`):** Creada la guía maestra transferible con los 5 acuerdos fundamentales, la plantilla del "Prompt de 4 Líneas", la guía paso a paso de adopción para el Proyecto Louka y la tabla comparativa de ahorro del 94%–96%.
  - **Informe Conceptual y Master Prompt para Louka (`INFORME_CONCEPTUAL_LANDING_PAGE_PROYECTO_LOUKA.md`):** Generada la especificación conceptual y técnica completa de la Landing Page (Hero split-screen 70/30 locked at 100vh, 3 pilares, grid 4 servicios, gobernanza de datos Ley 1581 / IA y módulo bilingüe ES/EN) junto con el Master Prompt listo para copiar y pegar en el Proyecto Louka.

- **1. Desbloqueo y Procesamiento Real de Importación (TC-03, TC-05, TC-07):**
  - **Parser Real Excel/CSV (TC-03 - APROBADO):** Implementado `parseExcelOrCsvFile` mediante `xlsx`. Soporta libros `.xlsx` con múltiples hojas, `.xls` (SpreadsheetML) y `.csv` con delimitadores `,` y `;`. Normaliza automáticamente sinónimos de columnas anatómicas en español, detecta duplicados contra `existingPersons` y alerta sobre medidas faltantes o valores biométricos sospechosos.
  - **Extracción Estructurada de PDF (TC-05 - APROBADO):** Implementado `parsePdfFile` con `pdfjs-dist`, extrayendo texto por página y mapeando mediante expresiones regulares los datos de identidad y cotas corporales de fichas A4.
  - **Reconocimiento OCR Local de Fotos (TC-07 - APROBADO):** Implementado `parsePhotoOcr` con `tesseract.js` (WebAssembly cliente en español), reconociendo imágenes seleccionadas sin API keys ni costos comerciales.
  - **Revisión Humana Obligatoria Preservada:** Todos los flujos reales alimentan la misma tabla de auditoría editable y requieren confirmación manual expresa antes de insertar en Supabase.

- **2. Visualización Completa y Adaptable en Tabletas y Celulares (`PersonGroupSection.tsx`):**
  - **Detección Automática Responsive:** Mediante `useWindowDimensions()`, con umbral exacto (`<= 768px`) o a elección del usuario, la vista activa automáticamente **Fichas / Tarjetas Adaptables de Alta Costura**.
  - **Ficha Integral por Persona:** Toda la información (Avatar, Nombre completo en serif, categoría demográfica, referencia, grupo asignado, fecha de última medición y pastilla de estado `BORRADOR / VERIFICADA / FINALIZADA`) se muestra en un solo bloque 100% visible, sin recortes horizontales a la derecha.
  - **Botones de Acción Táctiles Ampliados:** En la tabla editorial, los botones de acción se ampliaron a dimensiones táctiles cómodas de 34×34 px (`actionIconBtn` y `actionIconBtnCad`), el botón `[📐 Medir]` a 34 px de alto con padding ergonómico, y el ancho de la columna de acciones se amplió de 185 px a 225 px con separación `gap: 6`, evitando botones pisados o solapados.
  - **Selector de Modo de Vista:** Botones `[📋 Tabla]` y `[🗂️ Fichas]` integrados en la cabecera para permitir al usuario alternar la vista en cualquier momento.

- **2. Optimización Antidesbordamiento del Maniquí (`AtelierMannequinDisplay.tsx`):**
  - **Prevención de Quiebre Vertical de Texto:** En `sessionActiveBanner`, se incorporaron propiedades `numberOfLines={1}` y `ellipsizeMode="tail"` en todos los textos de perfil y sesión (`sessionActiveLabel`, `sessionActiveTitle`, `sessionActiveClientText`, `registeredCountBadgeText`).
  - **Ajuste de Escenario en Modo Compacto:** Se definieron estilos `sessionActiveBannerCompact`, `stageCompact` (altura 360 px) e imagen proporcional `mannequinImageCompact` (250×360 px), previniendo desbordamientos y aplastamiento de cotas.

- **3. Responsividad y Ergonomía de la Estación de Captura (`MeasurementCampaignFastCaptureModal.tsx` y `AtelierNumericKeypad.tsx`):**
  - **Densidad Alta para Mostrar 10 Cotas Simultáneas:** Cabecera de medidas rediseñada en una sola línea ultra-compacta (`MEDIDAS REQUERIDAS (12)` + botones en 30 px de alto), reduciendo el padding de cada fila de cota a `paddingVertical: 3.5` y brechas a 3 px. Ahora caben hasta 10 medidas completas en pantalla sin requerir desplazamiento.
  - **Maniquí Oculto por Defecto:** Configurado `showMannequin: false` por defecto en todos los dispositivos para priorizar el espacio de las cotas y el teclado numérico, con botón `[👗 Ver Maniquí]` disponible para abrirlo a elección del sastre.
  - **Activación de Scroll Vertical Interno:** Altura acotada `height: 485, maxHeight: 500` con `showsVerticalScrollIndicator={true}` y `nestedScrollEnabled={true}` en `measuresScroll`, permitiendo desplazamiento suave de las cotas restantes y cuadro de observaciones.
  - **Eliminación de Solapamiento Inferior del Teclado:** Altura compactada en `AtelierNumericKeypad` liberando más de 65 px verticales, con botones de cota completamente despegados de la barra inferior.
  - **Barra Inferior Fluida para Tablets/Móviles:** `bottomBar` configurada con `flexWrap: 'wrap'`, padding reducido y espaciado proporcional.

## C. Estado de Validación
- **TypeScript (`cmd /c npx tsc --noEmit`):** ✅ Exit code 0 (0 errores de tipos tras despliegue M05).
- **ESLint global (`cmd /c npx expo lint`):** Exit code 1 por hallazgos preexistentes en otros módulos del repositorio (`359 problems: 64 errors, 295 warnings`; 0 archivos de código app/migraciones modificados durante este despliegue).
- **Pruebas de Contrato en Memoria (`verify_m05_stage0_contracts.cjs`):** ✅ `ALL_M05_STAGE0_CONTRACT_ASSERTIONS_PASSED` (verificadas 8 categorías, 7 unidades, bloqueo `embroidery`/`pkg`, normalización `notion`/`trim`, ausencia de mocks en `fetchMaterials`, sync de `creation_proposal_items`, versionado incremental, `active_proposal_id`, inmutabilidad de snapshot y `commercial_quote_items`).
- **Auditoría Estática SQL Etapa 1 (`verify_m05_stage1_migration_static.cjs`):** ✅ `ALL_M05_STAGE1_MIGRATION_STATIC_ASSERTIONS_PASSED` (sincronía exacta 8 categorías / 7 unidades entre SQL y `src/types/commercial.ts`, 460 líneas verificadas).
- **Despliegue y Aceptación Remota M05 (`trgoqqvsprknswobvniu`):**
  - Migración aplicada verbatim (`supabase/migrations/20261110000000_materials_suppliers_m05.sql` via `supabase db query --yes`, exit code 0).
  - Auditoría de catálogo `--read-only`: 4 tablas (`atelier_suppliers` 26 cols, `atelier_materials` 28 cols, `atelier_material_stock_adjustments` 15 cols, `atelier_currency_rates` 10 cols), todas las restricciones `convalidated = true`, índices `indisvalid = true`, triggers `enabled = O`, `relrowsecurity = true`, 0 tablas en `public` con acceso `anon` o `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` en `authenticated`, `atelier_material_stock_adjustments` estrictamente `ar` (`SELECT, INSERT`) sin `UPDATE`/`DELETE`.
  - Aceptación funcional y aislamiento (`verify_m05_remote_acceptance.cjs`, `runId: 52d517e6`, exit code 0): `anonBlocked42501=true`, `suppliersCrudUniqueTriggerAndClientIsolation=true`, `materialsAdditiveColumnsChecksAndClientIsolation=true`, `stockLogImmutableRestrictAndCascadeVerified=true`, `trmManualUniqueActiveAndClientIsolation=true`, `storageCommercialAssetsVerified=true`, `c15Preserved=true`.
  - No-regresión M04 (`verify_m04_remote_postdeploy.js`): ✅ `APTO` (7/7 bloques aprobados, C15 intacta y 9 semillas de biblioteca preservadas).
  - Limpieza quirúrgica post-prueba verificada (`--read-only`): `0` filas en `atelier_suppliers`, `atelier_materials`, `atelier_material_stock_adjustments`, `atelier_currency_rates` y `0` objetos en `commercial-assets`.
- **Nota de alcance remoto:** `supabase_migrations.schema_migrations` en producción conserva solo hasta `20261014210000` (el historial M03/M04/M05 fue desplegado por ejecución SQL directa sin `supabase db push`); M00–M04, C15 y datos históricos permanecen 100 % preservados.
