# MÓDULO 04 — ALCANCE FUNCIONAL Y RECUPERACIÓN HISTÓRICA
**Diseño, Moodboard y Biblioteca de Autor — Atelier Digital By Katherine Carroll**  
**Fecha de auditoría:** 2026-11-09  
**Estado del documento:** Diagnóstico de Alcance (Sujeto a Aprobación de Usuario)

---

## 1. Recuperación de Especificaciones y Decisiones Históricas Confirmadas

De acuerdo con la revisión documental del proyecto (`../Formatos/Cuál es el siguiente módulo.docx`, `../Formatos/Atelier Digital - Presentación.pptx`, `ANTIGRAVITY_CONTINUITY.md` y el código base de los Módulos 00 a 03), las **únicas definiciones históricas expresamente acordadas antes de esta sesión** para el Módulo 04 son:

1. **Ubicación en el Mapa Maestro de 12 Módulos (`Cuál es el siguiente módulo.docx`):**
   - **Módulo 00:** Autenticación y perfiles (*Seguridad y acceso*)
   - **Módulo 01:** Gestión de clientas (*Ficha del cliente*)
   - **Módulo 02:** Medidas, tallas y patronaje (*Cuerpo → medidas → patrones*)
   - **Módulo 03:** Creaciones y ciclo comercial (*Proyectos, propuestas, cotizaciones*)
   - **Módulo 04:** **Diseño, moodboard y biblioteca (*Diseño visual y referencias*)**
   - **Módulo 05:** Materiales y proveedores (*Telas, insumos y proveedores* — integrado operativamente en el ciclo comercial de M03)
   - **Módulo 06:** Pruebas y ajustes (*Fittings y modificaciones*)
   - **Módulo 07:** Costos y pagos (*Costeo y control económico* — integrado operativamente en M03)
   - **Módulo 08:** Agenda (*Citas y calendario*)
   - **Módulo 09:** Portal de clientas y aprobaciones (*Interacción externa*)
   - **Módulo 10:** Copiloto de IA (*Asistencia inteligente — preparar datos estructurados desde M02–M09*)
   - **Módulo 11:** Dashboard e integración (*Indicadores e integraciones*)
   - **Módulo 12:** Almacenamiento de archivos (*Documentos, imágenes, patrones*)

2. **Principio Rector de Identidad (*Atelier de Autor – By Katherine Carroll*):**
   - La plataforma **no es un ERP industrial ni un catálogo masivo de e-commerce**, sino el cuaderno digital de trabajo y dirección artística de alta costura de Katherine Carroll.
   - Estética visual obligatoria: lienzo marfil cálido (`#F8F2E9`), negro atelier (`#171411`), oro champagne (`#A78350` / `#C5A880`), arena (`#E6D9C8`) y tipografía editorial serif/sans.

3. **Anclaje Preexistente en el Código Base (M01, M02 y M03):**
   - En [CreationDetailView.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/CreationDetailView.tsx#L256-L267) ya existía la pestaña `'concepto'` y la etapa `1. Concepto` dentro del stepper de progreso editorial de la prenda (`getCreationStages` en [creationsModel.ts](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/creations/creationsModel.ts#L120-L158)).
   - En [app/(designer)/index.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/(designer)/index.tsx#L518-L549) existía la tarjeta reservada para el muestrario visual, figurines y memorias de diseño de autor.
   - En el documento histórico `Cuál es el siguiente módulo.docx` se estableció la directriz transversal: *"Diseñar desde ahora los módulos 02–09 para que posteriormente la IA (Módulo 10) pueda actuar sobre ellos"*, lo que exige que las decisiones estéticas (silueta, escote, manga, paleta de color, etiquetas) se almacenen como metadatos estructurados y no únicamente como texto libre.

---

## 2. Diferenciación Estricta de Requisitos: Históricos vs. Implementados en Base M04 vs. Propuestas Pendientes de Aprobación

Para evitar ambigüedades, se clasifica el alcance funcional en tres categorías diferenciadas:

### A. Requisitos Históricos Confirmados (Base Documental Previa)
- **RF-M04-01 (Pestaña de Concepto y Diseño en la Creación):** Cada Creación (`public.creations`) debe contar con un espacio dedicado a su dirección visual, notas conceptuales y referencias estéticas sin alterar la tabla núcleo `public.creations`.
- **RF-M04-02 (Moodboard Visual por Encargo):** Tablero de inspiración asociado a una creación donde la diseñadora reúne bocetos, figurines, referencias de caída textil y notas de estilo para la clienta.
- **RF-M04-03 (Biblioteca de Diseño y Archivo de Autor):** Repositorio transversal del atelier donde se conservan siluetas, escotes, mangas, acabados artesanales y referencias históricas reutilizables en futuros encargos.
- **RF-M04-04 (Preparación Estructurada para Copiloto IA - M10):** Codificación estructurada de atributos de diseño (códigos de silueta, escote, manga, paleta HEX y acabados textiles) apta para consulta semántica posterior.

### B. Funcionalidades Implementadas en el Prototipo Operativo Actual (Sujetas a Validación y Cierre de Brechas)
Durante la sesión actual se construyó la primera versión funcional de M04 en el repositorio local:
- **RF-M04-05 (Arquitectura Sartorial de la Prenda):** Selección interactiva de Silueta Estructural (`SILHOUETTE_OPTIONS`), Escote & Cuello (`NECKLINE_OPTIONS`) y Manga & Hombro (`SLEEVE_OPTIONS`) por creación en [CreationMoodboardTab.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/design/CreationMoodboardTab.tsx#L305-L370).
- **RF-M04-06 (Compositor de Paleta Cromática y Acabados Textiles):** Gestión de tonos HEX con rol en la prenda (`primary`, `secondary`, `accent`, `lining`, `embroidery`), acabado superficial (`silk_sheen`, `satin`, `matte`, `metallic`, `translucent`, `velvet`) y carga rápida de 4 armonías cromáticas de firma en [ColorPaletteSection.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/design/ColorPaletteSection.tsx#L1-L245).
- **RF-M04-07 (Pinboard de Referencias Visuales):** Fijación, edición, marcado de destacados (`📌`), filtrado por categoría (`sketch`, `fabric_swatch`, `silhouette_ref`, `detail_finish`, `color_inspiration`, `editorial_note`) y eliminación de tarjetas en [MoodboardItemModal.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/design/MoodboardItemModal.tsx#L1-L265).
- **RF-M04-08 (Importación 1-Clic desde Biblioteca de Autor hacia Creación):** Vinculación directa de un recurso de la Biblioteca de Diseño hacia el Pinboard de una creación activa conservando `library_item_id` y notas técnicas en [DesignLibraryModal.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/design/DesignLibraryModal.tsx#L90-L100).
- **RF-M04-09 (Pantalla Independiente de Biblioteca de Diseño):** Explorador global en [DesignLibraryScreen.tsx](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/design/DesignLibraryScreen.tsx#L1-L505) accesible desde `/(designer)/library` con catálogo filtrable, buscador, armonías cromáticas de firma, guía sartorial y alta de nuevos recursos.
- **RF-M04-10 (Aprobación Estética y Trazabilidad en Bitácora M03):** Congelación conceptual del moodboard (`status = 'approved'`) que registra automáticamente un evento auditable en `commercial_events` (M03) mediante `recordCommercialEvent`.

### C. Brechas Identificadas y Propuestas que Requieren Aprobación Formal
La auditoría exhaustiva del código actual frente a un entorno productivo real revela las siguientes funcionalidades **incompletas (`PARCIAL`), pendientes (`PENDIENTE`) o que requieren decisión (`REQUIERE APROBACIÓN`)**:

1. **GAP-01 · Ejecución Remota en Supabase (`BLOQUEADO` / `REQUIERE APROBACIÓN`):**
   - El archivo de migración [20261109000000_design_moodboard_library_m04.sql](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/supabase/migrations/20261109000000_design_moodboard_library_m04.sql) existe localmente, pero **no ha sido ejecutado en el proyecto remoto de Supabase**. Actualmente la persistencia opera mediante el fallback en memoria de `designService.ts`.

2. **GAP-02 · Carga Real de Archivos Binarios (Imágenes/Bocetos) a Supabase Storage (`PENDIENTE`):**
   - Aunque la migración SQL define el bucket privado `design-assets` y la tabla `moodboard_items` incluye la columna `storage_path`, ni `designService.ts` ni `MoodboardItemModal.tsx` ni `DesignLibraryScreen.tsx` implementan aún la selección de imagen desde el dispositivo (`expo-image-picker` / `expo-document-picker`) ni la subida binaria real a `supabase.storage.from('design-assets')` con generación de URL firmada (`createSignedUrl`). Hoy solo permiten elegir entre las 8 fotografías editoriales precargadas (`image_key`) o pegar una URL externa (`image_url`).

3. **GAP-03 · Edición, Archivo y Reordenamiento Completo de Recursos (`PARCIAL`):**
   - En `DesignLibraryScreen.tsx` y `DesignLibraryModal.tsx` se pueden crear recursos (`createDesignLibraryItem`) y alternar el sello de autor (`toggleDesignLibrarySignature`), pero **no existe opción en UI ni servicio para editar un recurso existente de la biblioteca (`updateDesignLibraryItem`) ni para desactivarlo/archivarlo (`archiveDesignLibraryItem`)**.
   - En `CreationMoodboardTab.tsx`, una vez que el Moodboard pasa a estado `approved`, **no existe acción para reabrirlo (`Reabrir para ajuste estético`)** en caso de que la clienta solicite cambios antes del corte, ni controles manuales (`↑` / `↓`) para alterar `sort_order`.

4. **GAP-04 · Integración con Módulo 02 — Taller de Patronaje CAD (`NO EXISTE` / `REQUIERE APROBACIÓN`):**
   - Cuando la diseñadora define en M04 la arquitectura de la prenda (`silhouette_code`, `neckline_code`, `sleeve_code`) y aprueba el Moodboard, esa información **no se muestra como ficha de referencia visual en el Taller de Patronaje CAD (`PatternStudioCreationFlow.tsx` / `PatternStudioGarmentTab.tsx` de M02)**. Conectar en modo lectura la arquitectura aprobada del Moodboard M04 dentro del Flujo C de Patronaje (M02) evitaría discrepancias entre el diseño aprobado y el trazado geométrico.

5. **GAP-05 · Integración con Módulo 03 — Catálogo Textil `atelier_materials` (`NO EXISTE` / `REQUIERE APROBACIÓN`):**
   - En M04 se registran muestras visuales de tela (`fabric_swatch`) y tonos textiles con rol (`primary`, `lining`, `embroidery`), pero no existe un selector opcional para vincular una tarjeta `fabric_swatch` del Moodboard con una tela real del catálogo `atelier_materials` (M03), lo cual permitiría que las telas elegidas en el Moodboard se pre-carguen o consulten directamente al armar la Propuesta Económica en `CreationMaterialsTab.tsx`.

6. **GAP-06 · Sincronización Bidireccional con Notas de Creación (`PARCIAL`):**
   - `CreationMoodboardTab.tsx` sustituyó la antigua tarjeta estática `2. DISEÑO & NOTAS` de `CreationDetailView.tsx`. Aunque lee `creation.notes` como fallback inicial de `artistic_notes`, al guardar cambios en el Moodboard no sincroniza opcionalmente `public.creations.notes` en memoria/BD ni muestra un bloque separado si `creation.notes` tenía observaciones previas distintas.

---

## 3. Límites del Módulo (Lo que NO pertenece a M04)
- **No duplica M02 (Patronaje CAD):** M04 define la intención estética, silueta conceptual, escote, manga y referencias visuales; el cálculo matemático en milímetros, curvas Bézier y exportación DXF pertenecen exclusivamente a M02.
- **No duplica M03 (Ciclo Comercial y Costeo):** M04 define la atmósfera cromática y el comportamiento textil (caída, brillo, textura); el cálculo de metraje facturable, compra mínima de proveedor, precios COP/USD, cotizaciones A4 y pagos pertenecen exclusivamente a M03.
- **No incluye Portal Externo de Clienta (Módulo 09):** En M04 la aprobación del Moodboard la registra la diseñadora durante o tras la cita de diseño; la firma remota desde sesión de clienta corresponde al Módulo 09.

