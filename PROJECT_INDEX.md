# MAPA DEL PROYECTO (PROJECT INDEX)

> **Uso:** Guía rápida de localización para evitar búsquedas recursivas (`Get-ChildItem`) y ahorrar tokens.

### 1. Pantallas y Rutas (Expo Router)
- `app/index.tsx`: Portada editorial y Landing Page comercial pública (bilingüe ES/EN).
- `app/(designer)/clients.tsx`: Pantalla principal del módulo de clientes.
- `app/(designer)/patterns.tsx`: Pantalla del taller CAD y patronaje.
- `app/(designer)/creations.tsx`: Pantalla de creaciones y ciclo comercial (Módulo 03).
- `app/(designer)/library.tsx`: Pantalla de Biblioteca de Diseño, Moodboard y Archivo de Autor (Módulo 04).
- `app/(designer)/materials.tsx`: Pantalla independiente de Materiales, Proveedores, Bitácora de Stock y TRM Manual (Módulo 05).
- `app/(designer)/_layout.tsx`: Navegador principal del diseñador.

### 2. Landing Pública e Internacionalización
- `src/i18n/landingTranslations.ts`: Diccionario bilingüe estricto (ES / EN) de la portada.
- `src/context/LandingLanguageContext.tsx`: Proveedor de estado de idioma y sincronización SEO.
- `src/components/LanguageSelector.tsx`: Selector visual conmutador ES | EN.
- `src/components/PublicFooter.tsx`: Pie de página público institucional bilingüe.

### 3. Clientes y Expedientes (`src/components/clients/`)
- `ClientsModule.tsx`: Listado de clientes B2B/B2C, filtros y métricas.
- `ClientDossierView.tsx`: Expediente del cliente (Orquestador modular - 637 líneas).
- `dossier/`: Subcomponentes modulares de Expediente (`clientDossierStyles.ts`, `PatternDetailModal.tsx`, `DossierClientHeader.tsx`, `DossierPatternsTab.tsx`, `DossierCreationsTab.tsx`, `DossierSessionsTab.tsx`, `DossierOverviewTab.tsx`, `DossierModals.tsx`).
- `PersonGroupSection.tsx`: Orquestador declarativo modular de grupos/alumnos (227 líneas).
- `personGroup/`: Subcomponentes modulares de Personas y Grupos (`usePersonGroupSection.ts`, `PersonGroupHeader.tsx`, `PersonFiltersBar.tsx`, `PersonCardsView.tsx`, `PersonTableView.tsx`, `PersonPaginationBar.tsx`, `GroupsTabContent.tsx`, `CampaignsTabContent.tsx`, `PersonGroupModals.tsx`, `PersonFormModal.tsx`, `GroupFormModal.tsx`, `GroupMembersModal.tsx`, `MeasurementCampaignModal.tsx`, `MeasurementExportModal.tsx`, `personGroupStyles.ts`).
- `MeasurementCampaignFastCaptureModal.tsx`: Estación ergonómica de captura rápida de jornadas (Maniquí + Medidas + Numpad).

### 3. Patronaje y Medidas (`src/components/pattern/`)
- `AtelierMannequinDisplay.tsx`: Maniquí interactivo con cotas anatómicas iluminadas.
- `AtelierNumericKeypad.tsx`: Teclado numérico táctil optimizado para captura en vivo.
- `AtelierInteractiveMannequin.tsx`: Maniquí de selección cota por cota.
- `AtelierSizeAdvisor.tsx`: Recomendador de tallas estándar y comparación con medidas reales.
- `PatternModule.tsx`: Taller completo CAD de patronaje digital (Orquestador modular - 575 líneas).
- `usePatternStudioState.ts`: Custom hook de estados reactivos de taller, sincronización de sesiones y diagnósticos (1,778 líneas).
- `usePatternEngineActions.tsx`: Custom hook de orquestación del motor CAD y exportaciones SVG/DXF/PDF (771 líneas).
- `PatternStudioWorkspace.tsx`: Espacio de trabajo modular de taller (panel lateral, banners B/D, cabecera C y 5 pestañas de estudio - 555 líneas).
- `PatternStudioHeaderBar.tsx`: Cabecera editorial de taller, subcabecera de navegación de flujos y barra de 5 pestañas de estudio (277 líneas).
- `PatternStudioWorkflowBanners.tsx`: Banners persistentes de taller Flujos B y D, Hero editorial y espacio de trabajo biométrico (489 líneas).
- `PatternStudioHub.tsx`: Hub editorial principal y vías de acceso (01 Clientas, 02 Directo, 03 Creaciones, 04 Banco, 05 Libre - 467 líneas).
- `PatternStudioLeftSidebar.tsx`: Barra de activación, drawer modal de tableta y columna lateral anatómica (331 líneas).
- `PatternStudioMeasuresFlow.tsx`: Flujo de medidas, selector de clientas/sesiones, maniquí maestro y catálogo anatómico (864 líneas).
- `PatternStudioCreationFlow.tsx`: Vistas y Stepper de Creaciones Flujo C (Cabecera contextual, Creación Hero, Diagnóstico y Anatomía - 325 líneas).
- `PatternStudioGarmentTab.tsx`: Pestaña de prenda, silueta técnica, medidas de referencia antropométrica y tallas (409 líneas).
- `PatternStudioCadTab.tsx`: Mesa de corte y trazado CAD, canvas vectorial, exportaciones DXF/SVG/PDF y diagnóstico técnico (980 líneas).
- `PatternStudioFittingTab.tsx`: Pestaña de fitting, pruebas de calce, bitácora y regeneración paramétrica (384 líneas).
- `PatternStudioSpecsTab.tsx`: Ficha técnica del patrón 1:1, auditoría C13 (11 criterios) y ciclo de vida (560 líneas).
- `PatternStudioHistoryTab.tsx`: Pestaña de bitácora y linaje histórico, árbol genealógico inmutable y comparador delta (328 líneas).
- `PatternStudioModals.tsx`: Contenedor integral de los 15 modales de taller, auditoría, trazabilidad y confirmación (1,649 líneas).
- `patternModuleStyles.ts`: Estilos consolidados de taller CAD y alta costura (7,232 líneas).

### 4. Creaciones de Alta Costura (`src/components/creations/`)
- `CreationsModule.tsx`: Módulo de creaciones de alta costura (Orquestador declarativo - 230 líneas).
- `useCreationsState.ts`: Custom hook de estado, efectos y mutaciones de creaciones (433 líneas).
- `creationsModel.ts`: Modelo de dominio, catálogo de fotografías y etapas editoriales (159 líneas).
- `CreationDetailView.tsx`: Vista detallada de la creación, pestañas y ficha técnica (608 líneas).
- `CreationsListView.tsx`: Barra de búsqueda, filtros de estado y cuadrícula de creaciones (410 líneas).
- `CreationsModals.tsx`: Modales de nueva creación, edición y enlace de sesión anatómica (549 líneas).
- `creationsModuleStyles.ts`: Estilos consolidados de creaciones y talleres (1,690 líneas).

### 4.1. Ciclo Comercial y Materiales (`src/components/commercial/`)
- `commercialStyles.ts`: Estilos editoriales de materiales, propuestas, cotizaciones A4 y finanzas.
- `materialLabels.ts`: Diccionarios canónicos compartidos (8 categorías, 7 unidades, caída, proveedores, stock, TRM) y formateadores.
- `MaterialsStudioScreen.tsx`: Pantalla maestra M05 (`Catálogo Textil`, `Proveedores`, `Bitácora de Stock`, `TRM Manual`).
- `MaterialFormModal.tsx`: Modal creación/edición de materiales con proveedor, campos técnicos y foto privada en `commercial-assets`.
- `SupplierFormModal.tsx`: Modal creación/edición de proveedores y logotipo privado en `commercial-assets`.
- `StockAdjustmentModal.tsx`: Modal manual e historial cronológico append-only de inventario.
- `ManualTrmPanel.tsx`: Panel de gestión de TRM manual e historial por par de divisas.
- `MaterialsCatalogModal.tsx`: Catálogo visual textil y selector de telas/insumos conectado a `MaterialFormModal` y URLs firmadas.
- `CreationMaterialsTab.tsx`: Pestaña de materiales de la creación con metrajes requeridos vs facturables y referencia TRM manual.
- `QuoteEditorModal.tsx`: Editor de cotizaciones formales con cálculo de descuentos, IVA y 50% anticipo.
- `PrintableQuoteModal.tsx`: Documento oficial A4 imprimible con identidad *By Katherine Carroll*.
- `CreationQuotesTab.tsx`: Pestaña de cotizaciones emitidas, estados, referencia TRM manual e inicio de taller.
- `ProjectExecutionTab.tsx`: Pestaña de confección y seguimiento de etapas de taller (8 etapas).
- `FinancialControlTab.tsx`: Pestaña de control financiero, anticipos (50%), recaudos y margen real.
- `CreationLogbookTab.tsx`: Pestaña de bitácora editorial y trazabilidad cronológica inmutable.

### 4.2. Diseño, Moodboard y Biblioteca de Autor — Módulo 04 (`src/components/design/`)
- `designStyles.ts`: Estilos editoriales de alta costura para moodboard, pinboard, paletas y biblioteca.
- `CreationMoodboardTab.tsx`: Mesa de dirección estética por creación (Concepto narrativo con preservación de `creation.notes` M03, Arquitectura de silueta/escote/manga, Paleta cromática, Pinboard reordenable `↑`/`↓` y ciclo Aprobar/Reabrir).
- `ColorPaletteSection.tsx`: Compositor interactivo de armonías cromáticas, acabados textiles y paletas de firma.
- `MoodboardItemModal.tsx`: Modal para fijar o editar bocetos, muestras textiles vinculadas a `atelier_materials` (M03), subida desde dispositivo (`expo-image-picker` + `design-assets`) y detalles de costura.
- `DesignLibraryModal.tsx`: Modal de la Biblioteca Permanente de Autor con importación en 1 clic e indicador `"✓ Ya en este Moodboard"`.
- `DesignLibraryScreen.tsx`: Pantalla completa de la Biblioteca de Diseño (Crear, Editar, Archivar, Subir Imagen, Armonías Cromáticas de Firma y Guía Sartorial).

### 5. Motor de Patronaje y Catálogos (`src/engine/pattern/`)
- `catalog/masterCatalog.ts`: Catálogo maestro de cotas anatómicas y rangos biométricos.
- `catalog/measurementTemplates.ts`: Plantillas de medidas por tipo de prenda (Uniforme, Falda, Corpiño, etc.).
- `calculator/`: Algoritmos de cálculo de holguras, escalado y transformaciones geométricas.

### 6. Servicios y Tipos
- `src/services/designService.ts`: CRUD del Módulo 04 (moodboards por creación, pinboard items, aprobación conceptual y biblioteca de autor).
- `src/services/designMockData.ts`: Catálogo maestro de siluetas, escotes, mangas, paletas de firma y archivo histórico By Katherine Carroll.
- `src/services/commercialService.ts`: CRUD y cálculos del ciclo comercial (materiales, propuestas, cotizaciones, proyectos y finanzas).
- `src/services/measurementCampaignService.ts`: CRUD de campañas de medición y participantes.
- `src/services/clientService.ts`: CRUD de clientes y expedientes.
- `src/types/design.ts`: Interfaces y contratos del Módulo 04 (moodboards, swatches textiles, pinboard y biblioteca de diseño).
- `src/types/commercial.ts`: Interfaces y contratos del ciclo comercial (materiales, propuestas, cotizaciones, proyectos y finanzas).
- `src/types/personGroup.ts`: Interfaces de personas medidas, grupos y núcleos.
- `src/types/pattern/measurementCampaign.ts`: Interfaces de jornadas y capturas rápidas.
- `src/types/pattern/measurement.ts`: Interfaces de cotas, valores y unidades.

### 7. Control, Continuidad, Auditorías de Módulo y Transferencia Louka
- `ANTIGRAVITY_CONTINUITY.md`: Estado actual, últimas modificaciones y tareas pendientes.
- `AGENTS.md`: Reglas del proyecto, Expo, ejecución en Windows y directrices de tokens.
- `M04_ALCANCE_FUNCIONAL.md`, `M04_ARQUITECTURA_TECNICA.md`, `M04_MATRIZ_TRAZABILIDAD.md`, `M04_MATRIZ_PRUEBAS.md`, `M04_PLAN_IMPLEMENTACION.md`: Documentación oficial de auditoría, trazabilidad (`R04-01` a `R04-14`), pruebas (`T04-01` a `T04-14`) y plan por fases del Módulo 04.
- `ACUERDOS_OPTIMIZACION_TOKENS_Y_PROMPTS.md`: Acuerdos de tokens y plantilla de prompt para Louka.
- `INFORME_CONCEPTUAL_LANDING_PAGE_PROYECTO_LOUKA.md`: Especificación conceptual y Master Prompt de la Landing para Louka.

