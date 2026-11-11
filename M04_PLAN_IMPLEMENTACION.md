# MÓDULO 04 — PLAN DE IMPLEMENTACIÓN Y PUNTOS DE APROBACIÓN
**Diseño, Moodboard y Biblioteca de Autor — Atelier Digital By Katherine Carroll**  
**Fecha de auditoría:** 2026-11-09

---

## 1. Diagnóstico del Punto de Partida Actual

El Módulo 04 cuenta ya con una **base estructural implementada y compilando sin errores (`tsc --noEmit` = 0)**:
- Migración SQL preparada en local: [20261109000000_design_moodboard_library_m04.sql](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/supabase/migrations/20261109000000_design_moodboard_library_m04.sql).
- Contratos, catálogo maestro y servicio dual: `src/types/design.ts`, `src/services/designMockData.ts`, `src/services/designService.ts`.
- Interfaz modular: `CreationMoodboardTab.tsx`, `ColorPaletteSection.tsx`, `MoodboardItemModal.tsx`, `DesignLibraryModal.tsx`, `DesignLibraryScreen.tsx`, ruta `app/(designer)/library.tsx` y `app/preview-modulo4.tsx`.

Para alcanzar el **100% de completitud verificable en todos los requisitos (`R04-01` a `R04-14`)** sin brechas ni funcionalidades parciales, se propone el siguiente plan incremental en **4 Fases Cortas**.

---

## 2. Fases de Implementación para Cierre 100% del Módulo 04

### Fase 1 — Pre-Flight y Persistencia Real en Supabase (`R04-01`, `R04-02`)
- **Objetivo:** Verificar el estado remoto de Supabase y aplicar de forma no destructiva la migración `20261109000000_design_moodboard_library_m04.sql` (tablas `creation_moodboards`, `moodboard_items`, `design_library_items`, políticas RLS para `designer`/`admin` y bucket privado `design-assets`).
- **Archivos:** `supabase/migrations/20261109000000_design_moodboard_library_m04.sql`.
- **Criterio de aceptación (`T04-01`, `T04-02`):** Tablas y bucket creados en Supabase remoto sin tocar `public.creations` ni ninguna tabla de M00–M03; verificación de inserción y lectura real.

### Fase 2 — Carga Real de Archivos Visuales (`design-assets`) y Ciclo Completo de Pinboard (`R04-04`, `R04-07`, `R04-08`, `R04-09`)
- **Objetivo:**
  1. Incorporar en `designService.ts` la función `uploadDesignAsset(creationId, file)` que sube imágenes/bocetos seleccionados desde el dispositivo (`expo-document-picker` / selector de archivos Web/Mobile) al bucket privado `design-assets` (con generación de URL firmada y fallback inmediato a DataURL/ObjectURL local).
  2. Añadir botón `[📤 Subir Boceto / Imagen desde Dispositivo]` en `MoodboardItemModal.tsx` y `DesignLibraryScreen.tsx`.
  3. Añadir controles de reordenamiento (`↑` / `↓` sobre `sort_order`) en las tarjetas de `CreationMoodboardTab.tsx`.
  4. Añadir botón `↺ Reabrir para Ajuste Estético` cuando el Moodboard está en estado `approved`, registrando el evento de reapertura en `commercial_events` (M03).
  5. Mostrar en `CreationMoodboardTab.tsx` las notas originales del encargo (`creation.notes`) si existen y difieren de `artistic_notes`, garantizando conservación histórica total.
- **Archivos:** `src/services/designService.ts`, `src/components/design/MoodboardItemModal.tsx`, `src/components/design/CreationMoodboardTab.tsx`, `src/components/design/DesignLibraryScreen.tsx`.
- **Criterio de aceptación (`T04-04`, `T04-07`, `T04-08`, `T04-09`):** Carga de imagen desde dispositivo operativa, reordenamiento de tarjetas, reapertura auditada de moodboard y preservación de `creation.notes`.

### Fase 3 — Gestión Integral de Biblioteca de Autor e Integraciones con M02 y M03 (`R04-10`, `R04-11`, `R04-12`, `R04-13`)
- **Objetivo:**
  1. Completar en `designService.ts` y `DesignLibraryScreen.tsx` las funciones **Editar recurso (`updateDesignLibraryItem`)** y **Archivar/Desactivar recurso (`archiveDesignLibraryItem`)**.
  2. Mostrar en `DesignLibraryModal.tsx` la insignia `"✓ Ya vinculado a este Moodboard"` para los ítems cuyo `library_item_id` ya forme parte de la creación activa (`R04-11`).
  3. **Puente M04 ↔ M03 (`R04-13`):** En `MoodboardItemModal.tsx`, cuando la categoría es `Muestra de Tela` (`fabric_swatch`), mostrar un selector opcional del catálogo textil `atelier_materials` (M03) que autocompleta nombre, composición y color, guardando `material_id` en `metadata`.
  4. **Puente M04 → M02 (`R04-12`):** En la sección `3. PATRONAJE CAD PARAMÉTRICO` de `CreationDetailView.tsx`, mostrar una franja de referencia de solo lectura con la **Arquitectura Sartorial y Paleta aprobadas en M04** (Silueta, Escote, Manga y tonos) para que la diseñadora las tenga a la vista al iniciar o revisar el patronaje CAD sin modificar ningún archivo interno de M02.
- **Archivos:** `src/services/designService.ts`, `src/components/design/DesignLibraryScreen.tsx`, `src/components/design/DesignLibraryModal.tsx`, `src/components/design/MoodboardItemModal.tsx`, `src/components/creations/CreationDetailView.tsx`.
- **Criterio de aceptación (`T04-10` a `T04-13`):** Edición y archivado en Biblioteca, indicador de ítem ya importado, vinculación opcional con `atelier_materials` y franja de referencia M04 visible en la pestaña `Patronaje`.

### Fase 4 — Suite E2E Verificable (`T04-01` a `T04-14`) y Cierre Documental (`R04-14`)
- **Objetivo:** Ejecutar `cmd /c npx tsc --noEmit` (0 errores), correr el script automatizado Playwright que valide de inicio a fin los escenarios `T04-01` a `T04-14`, regenerar las capturas de evidencia y actualizar `ANTIGRAVITY_CONTINUITY.md` y `PROJECT_INDEX.md`.
- **Criterio de aceptación (`T04-14`):** 14/14 pruebas en estado `COMPLETADO`, 0 errores de tipos y 0 regresiones en M00–M03.

---

## 3. Decisiones que Requieren tu Aprobación Antes de Continuar

Antes de realizar cualquier modificación de código o base de datos, confirma por favor:
1. **¿Autorizas ejecutar las Fases 2, 3 y 4** para cerrar al 100% los elementos hoy en estado `PARCIAL` / `PENDIENTE` (subida de imagen desde dispositivo, edición/archivo en biblioteca, reordenamiento/reapertura de moodboard, vínculo opcional de muestra textil con `atelier_materials` de M03 y franja de referencia en la pestaña `Patronaje`)?
2. **¿Autorizas verificar el Pre-Flight y aplicar en Supabase remoto la migración no destructiva `20261109000000_design_moodboard_library_m04.sql`** (Fase 1), o prefieres mantener la migración únicamente en archivo local por ahora?

