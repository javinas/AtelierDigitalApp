# MAPA DEL PROYECTO (PROJECT INDEX)

> **Uso:** Guía rápida de localización para evitar búsquedas recursivas (`Get-ChildItem`) y ahorrar tokens.

### 1. Pantallas y Rutas (Expo Router)
- `app/index.tsx`: Portada editorial y Landing Page comercial pública (bilingüe ES/EN).
- `app/(designer)/clients.tsx`: Pantalla principal del módulo de clientes.
- `app/(designer)/patterns.tsx`: Pantalla del taller CAD y patronaje.
- `app/(designer)/creations.tsx`: Pantalla de creaciones y ciclo comercial (Módulo 03).
- `app/(designer)/library.tsx`: Pantalla de Biblioteca de Diseño, Moodboard y Archivo de Autor (Módulo 04).
- `app/(designer)/materials.tsx`: Pantalla independiente de Materiales, Proveedores, Bitácora de Stock y TRM Manual (Módulo 05).
- `app/(designer)/fittings.tsx`: Bandeja transversal de Pruebas, Ajustes y Ceremonial de Entrega (Módulo 06).
- `app/(designer)/finances.tsx`: Bandeja transversal de Finanzas del Atelier y Control de Costos (Módulo 07).
- `app/(designer)/agenda.tsx`: Bandeja transversal de Agenda Unificada del Atelier (Módulo 08 · CERRADO Y APROBADO EN ACEPTACIÓN INTEGRAL).
- `app/(designer)/client-portal.tsx`: Interfaz local de gestión del Portal de Clientes desde el perfil de la diseñadora/administración (M09 · retorno seguro por rol vía `useAuth()`, estado de acceso de clientas, modelo mixto de permisos Zero Trust `DEFAULT false`, sincronización `?client_id=` y bloqueo explícito sin backend E1–E2; integrada en `NavigationGate` de `app/_layout.tsx`).
- `app/(designer)/client-portal-invitations.tsx`: Flujo local de preparación de invitaciones M09 desde diseñadora/admin (`DesignerPortalInvitationsScreen`, mensaje personalizado, resumen en vivo desde `portalLocalMemoryStore.ts`, vista previa correo sin tokens ficticios ni envío real).
- `app/(client)/mi-portal.tsx`: Primera interfaz visual local del Portal Privado de la Clienta (M09 · exclusiva para `role === 'client'` en `NavigationGate`, datos congelados multi-clienta con aislamiento estricto, 5 secciones Inicio/Creaciones/Citas/Seguimiento/Comunicación, estados sin invitación/invitada/activa/suspendida/revocada, Doble Candado, `deny-overrides` y cero Supabase/persistencia simulada).
- `app/(client)/portal-invitation.tsx`: Experiencia local de revisión y aceptación de invitación M09 exclusiva para `role === 'client'` (`ClientPortalInvitationScreen`, guardia multi-clienta, consentimiento Ley 1581, estados `unprepared`/`draft`/`ready_for_preview`/`preview_accepted_local`/`expired_local`/`revoked_local` y acceso condicionado a `/mi-portal` en RAM).
- `app/mannequin-preview.tsx`: Pantalla temporal e independiente de evaluación del Visualizador 3D (Mannequin3DStudioSandbox).
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

### 4. Prototipo Visual 3D — Maniquí Sartorial (`src/components/mannequin3d/`)
- `types.ts`: Contratos TypeScript, límites paramétricos, presets de silueta femenina y ángulos de cámara.
- `mannequinMeshBuilder.ts`: Constructor procedural matemático con Three.js (`BufferGeometry`), deformación en 6 medidas anatómicas y cintas de atelier.
- `Mannequin3DViewer.tsx`: Visor WebGL universal con órbita 360°, zoom, presets y renderizado *on-demand* (0% GPU idle).
- `Mannequin3DStudioSandbox.tsx`: Laboratorio interactivo con barra diagnóstica (FPS, ms deformación, tris), controles finos (+/- 1 cm) y presets.
- `index.ts`: Barrel export limpio del componente.
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
- `FinancialControlTab.tsx`: Pestaña simplificada de control financiero M07: dos acciones (+ Registrar Pago / − Registrar Gasto), sugerencias 1-toque (50% y liquidación), anulación auditada, recarga PT409 y M05 opcional.
- `FinancialStudioScreen.tsx`: Pantalla transversal M07 de finanzas, KPIs de recaudo bimoneda COP/USD, cartera por cobrar y cuadrícula de creaciones.
- `CreationLogbookTab.tsx`: Pestaña de bitácora editorial y trazabilidad cronológica inmutable.

### 4.2. Diseño, Moodboard y Biblioteca de Autor — Módulo 04 (`src/components/design/`)
- `designStyles.ts`: Estilos editoriales de alta costura para moodboard, pinboard, paletas y biblioteca.
- `CreationMoodboardTab.tsx`: Mesa de dirección estética por creación (Concepto narrativo con preservación de `creation.notes` M03, Arquitectura de silueta/escote/manga, Paleta cromática, Pinboard reordenable `↑`/`↓` y ciclo Aprobar/Reabrir).
- `ColorPaletteSection.tsx`: Compositor interactivo de armonías cromáticas, acabados textiles y paletas de firma.
- `MoodboardItemModal.tsx`: Modal para fijar o editar bocetos, muestras textiles vinculadas a `atelier_materials` (M03), subida desde dispositivo (`expo-image-picker` + `design-assets`) y detalles de costura.
- `DesignLibraryModal.tsx`: Modal de la Biblioteca Permanente de Autor con importación en 1 clic e indicador `"✓ Ya en este Moodboard"`.
- `DesignLibraryScreen.tsx`: Pantalla completa de la Biblioteca de Diseño (Crear, Editar, Archivar, Subir Imagen, Armonías Cromáticas de Firma y Guía Sartorial).

### 4.3. Pruebas, Ajustes y Calce — Módulo 06 (`src/components/fitting/`)
- `fittingLabels.ts`: Diccionarios canónicos en español, opciones de 5 rondas, zonas, severidades y formateadores.
- `fittingStyles.ts`: Estilos consolidados de calce, tarjetas, badges semánticos y modales editoriales.
- `FittingSessionCard.tsx`: Tarjeta de sesión con número de prueba, estados de calce, balance y tacón.
- `FittingAdjustmentItem.tsx`: Ítem de checklist con badges de severidad, delta mm y bloqueo de dispensa crítica.
- `FittingMediaGallery.tsx`: Galería privada con URLs firmadas, preview modal y subida determinista.
- `FittingSessionModal.tsx`: Modal de programación y edición de sesión física con versión optimista.
- `FittingAdjustmentModal.tsx`: Modal de registro y resolución progresiva de ajustes físicos.
- `FittingApprovalModal.tsx`: Modal con bifurcación obligatoria de aprobación intermedia vs calce final listo para entrega.
- `DeliveryCeremonyModal.tsx`: Modal solemne de entrega con 7 criterios de satisfacción, acta física y sellado definitivo.
- `CreationFittingTab.tsx`: Pestaña orquestadora del expediente de pruebas dentro de cada Creación (modos compacto y completo).
- `FittingQueueScreen.tsx`: Bandeja transversal de taller con filtros, KPIs, alertas CAD y navegación protegida.

### 4.4. Agenda del Atelier — Módulo 08 (`src/components/agenda/`) [ESTADO: CERRADO Y APROBADO EN ACEPTACIÓN INTEGRAL]
- `agendaLabels.ts`: Diccionarios en español, estados, tipos de cita/actividad, espacios físicos y metas de origen.
- `agendaStyles.ts`: Estilos editoriales *Atelier de Autor* responsivos para móvil (`390×844`) y computador.
- `AppointmentCard.tsx`: Tarjeta cronológica con acciones rápidas (Confirmar, Realizada, Reprogramar, Cancelar con motivo, Calendario/PDF) y enlaces a M01/M03/M06.
- `AppointmentFormModal.tsx`: Modal de creación/reprogramación con selectores interactivos no manuales de fecha/calendario y hora/duración, filtro de clientas reales (excluyendo prefijos `[TEST-M...]`), aviso de proveedores M05, alerta preventiva de traslapes y `PT409`.
- `AgendaExportShareModal.tsx`: Modal de exportación editorial (Día, Semana, Mes, Rango personalizado no manual) y compartición manual de calendarios (`.ics` individual/lote, Google Calendar, Outlook, Apple Calendar) con privacidad protegida por defecto y sección honesta de sincronización automática futura no disponible.
- `PrintableAgendaModal.tsx`: Vista previa editorial A4 en modal con cabecera *By Katherine Carroll*, KPIs, deduplicación, proyección `creationDisplay` e impresión directa / PDF.
- `AgendaStudioScreen.tsx`: Pantalla unificada con vistas Día/Semana/Mes en `America/Bogota`, filtros colapsables en móvil, resumen del día, próximas actividades, KPIs y acceso a exportación.

### 5. Motor de Patronaje y Catálogos (`src/engine/pattern/`)
- `catalog/masterCatalog.ts`: Catálogo maestro de cotas anatómicas y rangos biométricos.
- `catalog/measurementTemplates.ts`: Plantillas de medidas por tipo de prenda (Uniforme, Falda, Corpiño, etc.).
- `calculator/`: Algoritmos de cálculo de holguras, escalado y transformaciones geométricas.

### 6. Servicios y Tipos
- `src/services/designService.ts`: CRUD del Módulo 04 (moodboards por creación, pinboard items, aprobación conceptual y biblioteca de autor).
- `src/services/designMockData.ts`: Catálogo maestro de siluetas, escotes, mangas, paletas de firma y archivo histórico By Katherine Carroll.
- `src/services/commercialService.ts`: CRUD y cálculos del ciclo comercial (materiales, propuestas, cotizaciones, proyectos y finanzas).
- `src/services/fittingService.ts`: Envoltorios de las 8 RPCs de fitting, concurrencia optimista PT409, consultas de cola transversal y contexto M02 CAD.
- `src/services/agendaService.ts`: Envoltorios de las 4 RPCs de M08 (`fetch_atelier_agenda_m08`, `schedule`, `update`, `cancel`), helpers de zona horaria `America/Bogota`, capitalización en español, filtro `[TEST-M...]` y prevención de traslapes.
- `src/services/agendaExportService.ts`: Motor puro de exportación A4 PDF/Impresión, Excel `.xlsx` (`xlsx`), archivos `.ics` RFC 5545 individual/lote, deduplicación, enmascaramiento por privacidad (`maskCreationNameForExternal`), proyección `creationDisplay` y enlaces profundos Google/Outlook.
- `src/services/measurementCampaignService.ts`: CRUD de campañas de medición y participantes.
- `src/services/clientService.ts`: CRUD de clientes y expedientes.
- `src/types/agenda.ts`: Interfaces y contratos canónicos del Módulo 08 (citas, ítems consolidados M08/M06/M03/M02, `PrivacyProjectedAgendaFields`, DTOs RPC y códigos `PT409`/`23P01`).
- `src/types/design.ts`: Interfaces y contratos del Módulo 04 (moodboards, swatches textiles, pinboard y biblioteca de diseño).
- `src/types/commercial.ts`: Interfaces y contratos del ciclo comercial (materiales, propuestas, cotizaciones, proyectos y finanzas).
- `src/types/fitting.ts`: Interfaces y contratos canónicos del Módulo 06 (sesiones, ajustes, ceremonial de entrega, cola de taller y DTOs RPC).
- `src/types/personGroup.ts`: Interfaces de personas medidas, grupos y núcleos.
- `src/types/pattern/measurementCampaign.ts`: Interfaces de jornadas y capturas rápidas.
- `src/types/pattern/measurement.ts`: Interfaces de cotas, valores y unidades.

### 7. Control, Continuidad, Auditorías de Módulo y Transferencia Louka
- `ANTIGRAVITY_CONTINUITY.md`: Estado actual, últimas modificaciones y tareas pendientes.
- `AGENTS.md`: Reglas del proyecto, Expo, ejecución en Windows y directrices de tokens.
- `ACTA_DE_CIERRE_M08_AGENDA.md`: Acta formal de cierre técnico y funcional del Módulo 08 — Agenda del Atelier (CERRADO Y APROBADO: E2E 16/16 PASS, Test Suite 31/31 PASS, Colisiones 14/14 COINCIDE, TypeScript 0 errores, ESLint 0 errores, M00–M07 intactos).
- `AUDITORIA_INTEGRAL_FINAL_ACEPTACION_M08.md`: Informe de auditoría integral final de aceptación del Módulo 08 (dictamen APROBADO, 11 escenarios verificados en escritorio 1440×900 y móvil 390×844, 0 escrituras remotas).
- `INFORME_ETAPA1_RESPONSIVE_M08.md`: Informe de correcciones responsive (D1–D3), usabilidad móvil (D6), capitalización (D7), proveedores (D5) y exclusión selectores D4.
- `INFORME_ETAPA2_EXPORTACION_Y_CALENDARIOS_M08.md`: Informe de exportación editorial A4/Excel/ICS y compartición manual con privacidad por defecto.
- `scratch/verify_m08_e2e_acceptance.cjs`: Suite de aceptación remota E2E transaccional M08 (16/16 PASS, Run ID `7e039f88`, locking `pg_advisory_xact_lock` `23P01`, concurrencia `PT409`, C15 protegida, 0 residuos).
- `scratch/test_m08_creation_privacy_verification.cjs`: Suite automatizada de privacidad `creation_name` y proyección `creationDisplay` en 7 canales (31/31 PASS).
- `scratch/audit_m08_sartorial_collisions.cjs`: Auditoría de colisiones homónimas frente a atributos de alta costura (14/14 COINCIDE, 0 filtraciones).
- `supabase/migrations/20261116000000_atelier_agenda_m08.sql`: Migración aditiva M08 aplicada en producción remota (tabla `atelier_appointments`, trigger versionador, RLS estricto y 4 RPCs).
- `ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D.md`: Estudio de viabilidad técnica y arquitectura del Simulador de Prendas 3D y el Servicio de Inteligencia Textil (XPBD, taxonomía mecánica, tripartición de confianza y desacoplamiento de M05).
- `M07_INFORME_ACEPTACION_E2E_USABILIDAD.md`: Informe formal de aceptación integral E2E y usabilidad del Módulo 07 (Run ID `252f0d86`, 25/25 PASS, TypeScript 0 errores, certificación de cero residuos, C15 protegida, mejoras D-01 a D-03 registradas sin implementar). Estado: IMPLEMENTADO Y APROBADO EN ACEPTACIÓN E2E.
- `scratch/verify_m07_e2e_acceptance.cjs`: Suite integral de aceptación E2E y usabilidad del flujo de Katherine Carroll (25 pasos PASS, auto-limpieza atómica 0 residuos, C15 protegida).
- `supabase/migrations/20261114000000_costs_payments_m07.sql`: Migración aditiva M07 Costos y Pagos (6 columnas, 4 índices, trigger versionador, recálculo atómico y 4 RPCs).
- `scratch/verify_m07_stage1_remote.cjs`: Suite de aceptación remota M07 Bloque 1 (36 pasos PASS, auto-limpieza 0 residuos, C15 protegida).
- `scratch/verify_m07_bloque2_static.cjs`: Suite de verificación de contratos, servicios y UI simplificada M07 Bloque 2 (72/72 PASS).
- `scratch/verify_m07_bloque3_static.cjs`: Suite de verificación de bandeja transversal, NavigationGate, Home y paz y salvo M06 (60/60 PASS).
- `M07_DISENO_TECNICO_MVP.md`: Especificación técnica definitiva, DDL aditivo, 4 RPCs ACID, resolución G-01 a G-07 y plan E2E de M07.
- `M07_ANALISIS_CAPACIDADES_EXISTENTES.md`: Análisis funcional y técnico de M07 (Costos y Pagos, inventario, mapa relacional y vacíos).
- `M06_DISENO_TECNICO_MVP.md`: Diseño técnico canónico, modelo DDL, 8 RPCs transaccionales y matriz de pruebas de M06.
- `scratch/test_m06_e2e_full_cycle.cjs`: Suite de aceptación funcional E2E (13 pasos, auto-limpieza 0 residuos, C15 protegida).
- `M04_ALCANCE_FUNCIONAL.md`, `M04_ARQUITECTURA_TECNICA.md`, `M04_MATRIZ_TRAZABILIDAD.md`, `M04_MATRIZ_PRUEBAS.md`, `M04_PLAN_IMPLEMENTACION.md`: Documentación oficial de auditoría, trazabilidad (`R04-01` a `R04-14`), pruebas (`T04-01` a `T04-14`) y plan por fases del Módulo 04.
- `ACUERDOS_OPTIMIZACION_TOKENS_Y_PROMPTS.md`: Acuerdos de tokens y plantilla de prompt para Louka.
- `INFORME_CONCEPTUAL_LANDING_PAGE_PROYECTO_LOUKA.md`: Especificación conceptual y Master Prompt de la Landing para Louka.
- `docs/M09_A_ESPECIFICACION_TECNICA_CONSOLIDADA.md`: Especificación técnica canónica y consolidada del Módulo 09-A (Versión 2.10 Canónica Definitiva — Seguridad nuclear, RLS, invitaciones criptográficas, conciliación tripartita de Saga con validación estricta de status === 'active' y firma p_mark_failed, preflight exhaustivo con tipos únicos de M00–M08, FKs monocolumna convalidated, índices totales y puros sin indpred/indexprs ni INCLUDE, helper is_admin_or_designer con validación canónica estricta de search_path en proconfig restringido exclusivamente a representaciones legítimas ('', '""', 'pg_catalog') sin normalizaciones permisivas con trim y rechazando identificadores con espacios " pg_catalog ", pg_temp, public y $user, propietario confiable, gen_random_uuid validado en esquema/firma/retorno, resolución canónica de nombres M03 en vistas y verificación de C15 vía FOUND).
- `docs/M09_A_ESPECIFICACION_TECNICA_CONSOLIDADA_V2_5.md`: Espejo sincronizado idéntico de la especificación técnica M09-A (v2.10 Canónica Definitiva).
- `src/types/portal.ts`: Contratos TypeScript canónicos del Portal de Clientes (M09-B) alineados 1:1 con M09-A v2.10: `ClientPortalAccess` (8 cols canónicas), `PORTAL_RESOURCES` (9), `PORTAL_ACTIONS` (4), `ClientPortalPermission`, `UpdatePortalAccessStatusDTO`, `SetPortalPermissionDTO`, `PortalPermissionMutationResult`, `PortalBatchRevokeResult`, `PortalPermissionsProjection`, `ClientPortalActivityLog`, contratos `/portal/invite` (M09-B.4), ciclo M09-B.5 y contratos de lectura segura M09-B.7 sobre las 6 vistas canónicas (`PORTAL_CANONICAL_VIEWS`, `PORTAL_TELEMETRY_EVENTS` 8 eventos, `PortalClientProfileView`, `PortalCreationView`, `PortalMeasurementSessionView`, `PortalCommercialQuoteView`, `PortalAppointmentView`, `PortalFittingSessionView` vinculado formalmente en E3.1 a `FittingRoundType` y `FittingSessionStatus` de `src/types/fitting.ts`, `PortalViewReadResult`, `ClientPortalDashboardData` y `PortalTelemetryLogResult`).
- `src/services/portalService.ts`: Capa de servicio del Portal de Clientes (M09-B) normalizada sobre `public.client_portal_permissions`: evaluación pura `evaluatePortalPermission` (paridad SQL `has_portal_permission`), proyector `buildPortalPermissionsProjection`, lectura/escritura idempotente sobre `client_portal_permissions`, aislamiento `fetchMyPortalContext` (estado `active`), ciclo criptográfico M09-B.5, motor `/portal/invite` M09-B.4, lectores dedicados M09-B.7 sobre las 6 vistas canónicas `v_portal_*` (`fetchPortalClientProfile`, `fetchPortalCreationsView`, `fetchPortalMeasurementSessionsView`, `fetchPortalCommercialQuotesView`, `fetchPortalAppointmentsView`, `fetchPortalFittingSessionsView`), saneador `sanitizeFittingSessionView` (E3.1 tipo-seguro con `isFittingRoundType` e `isFittingSessionStatus`), orquestador `fetchClientPortalDashboardData` (0 lecturas en inactivo/DEMO/`42501`, intersección de permisos) y telemetría `logPortalTelemetryEvent` (`public.log_portal_event` sin simulación en DEMO).
- `src/components/clients/dossier/DossierPortalTab.tsx`: Centro de Control de Permisos del Portal de Clienta en Expediente de Diseñadora (M09-B.2 + M09-B.5 + M09-B.6), operando sobre `ClientPortalPermission[]` y `PortalPermissionsProjection` sin duplicar permisos, compuertas Nivel 1 para Creaciones/Fittings con revocación masiva y autorización granular Nivel 2 por creación (`creations:view`, `sketches:view`, `fabrics:view`, `fittings:view`, eliminando `allow_timeline`), ciclo de 6 estados de invitación + entrega única Zero-Knowledge, indicador `auth_user_id` + `used_at`, bloqueo de activación huérfana y bitácora `client_portal_activity_log`.
- `app/(client)/index.tsx`: Dashboard Web de Clienta Autenticada (M09-B.3 + M09-B.6 + M09-B.7) leyendo exclusivamente desde las 6 vistas canónicas M09-A v2.10 (`v_portal_client_profile`, `v_portal_creations`, `v_portal_measurement_sessions`, `v_portal_commercial_quotes`, `v_portal_appointments`, `v_portal_fitting_sessions`) vía `fetchClientPortalDashboardData` y telemetría `logPortalTelemetryEvent` (`view_portal_home`, `auth_logout`). Formateadores de fittings conciliados en E3.1 (`formatFittingRoundLabel` con los 5 `round_type` canónicos y `formatFittingStatusLabel` con los 5 estados canónicos de M06). Cero lectores heredados (`fetchCreations`, `fetchClientMeasurementSessions`, `fetchAtelierAgenda`), cero `SAMPLE_QUOTES`, cero `DEMO_FALLBACK_CREATIONS` y cero medidas anatómicas hardcodeadas (expone estrictamente historial de sesiones verificadas de `v_portal_measurement_sessions` y fechas en `America/Bogota`).
- `app/portal/invite.tsx`: Pantalla ceremonial de alta costura para aceptación segura de invitaciones del Portal de Clientas (`/portal/invite`, M09-B.4), con higiene inmediata de token en URL (`history.replaceState`), validación de sintaxis local, verificación criptográfica remota vía Edge Function, protección nuclear contra roles privilegiados (`admin`/`designer`) y discrepancias multi-tenant sin sobrescribir perfiles, soporte de activación nueva o vinculación con cuenta existente, deduplicación Saga idempotente por `operationId` y transparencia explícita de MODO DEMO cuando el backend no está desplegado.
- `scratch/verify_m09_b4_invite_flow.cjs`: Suite automatizada local M09-B.4 (15/15 PASS) que ejecuta la lógica TypeScript compilada de `portalService.ts` sobre transporte Edge mockeado (0 escrituras remotas) y audita invariantes estáticos en `app/portal/invite.tsx` y `app/_layout.tsx`.
- `scratch/qa_m09_b4_browser_audit.cjs`: Auditoría funcional y visual de solo lectura en navegador local (Playwright Desktop `1440×900` y Móvil `390×844`) sobre `http://localhost:8082/portal/invite`, con bloqueo estricto de escrituras remotas REST/Signup y captura de evidencias PNG en Brain.
- `scratch/verify_m09_b5_invitation_lifecycle.cjs`: Suite automatizada local M09-B.5 (11/11 PASS) que ejecuta la lógica TypeScript compilada de `portalService.ts` contra un cliente PostgREST M09-A v2.10 en memoria (0 escrituras remotas), verificando generación CSPRNG + hash SHA-256, revocación atómica, reemisión secuencial, desacoplamiento Edge/PostgREST, bloqueo de activación huérfana y cierre E2E M09-B.2 ↔ M09-B.4 ↔ M09-B.2.
- `scratch/qa_m09_b5_dossier_visual.cjs`: Auditoría funcional y visual de solo lectura en navegador local (Playwright Desktop `1440×900` y Móvil `390×844`) sobre `/(designer)/clients?client_id=...` → `"Portal de Clienta"` y `/(client)`, validando ciclo M09-B.5, permisos M09-B.6, lectura canónica M09-B.7 sobre las 6 vistas `v_portal_*` (con bloqueo de tablas base `clients`/`creations`/etc.), telemetría `log_portal_event` y diseño responsive sin desbordamiento (`0` escrituras remotas).
- `scratch/verify_m09_b6_permissions_canonical.cjs`: Suite automatizada local M09-B.6 (12/12 PASS) sobre mock PostgREST M09-A v2.10 (8 cols `client_portal_access`, 9 cols `client_portal_permissions`, índice expresional `COALESCE`, carrera `23505`, errores `42501`/`23514`/`23503`, `PGRST205` DEMO, paridad SQL `has_portal_permission`, revocación en sentencia única `DELETE`, aislamiento `fetchMyPortalContext` y auditoría estática cero legacy).
- `scratch/verify_m09_b7_portal_readers.cjs`: Suite automatizada local M09-B.7 (14/14 PASS) sobre simulador PostgREST/RPC M09-A v2.10 (6 vistas `v_portal_*` + `log_portal_event`), verificando 0 lecturas a tablas base, sanitización anti-fuga de columnas privadas, bloqueo ante estados inactivos (`invited`/`suspended`/`revoked`/`null`), aislamiento multi-clienta, intersección sin ampliación, errores `42501`/`22023`/`PGRST205` sin contaminación DEMO y auditoría estática cero legacy en `app/(client)/index.tsx`.
- **Cierre Etapa 1 — Frontend Local M09 (COMPLETADO Y VERIFICADO LOCALMENTE EN RAM · BACKEND E1–E5 PENDIENTE · SIN CREAR STAGING NI OTRO PROYECTO SUPABASE · `trgoqqvsprknswobvniu` PRODUCCIÓN INTOCABLE):** Comprende las 4 rutas locales (`/client-portal`, `/client-portal-invitations`, `/mi-portal`, `/portal-invitation`), `app/_layout.tsx` (`NavigationGate`), los 3 módulos UI (`src/components/portal/` 7 archivos, `src/components/clientPortal/` 6 archivos, `src/components/portalInvitations/` 6 archivos) y sus 8 suites locales (unitarias + Playwright E2E/responsive).
- `src/components/portal/`: Subcomponentes modulares UI de gestión del Portal desde el perfil de la diseñadora (`portalDesignerModel.ts` con congelamiento profundo `Object.freeze`, `portalLocalMemoryStore.ts` store volátil RAM compartido entre `/client-portal` y `/mi-portal` sin almacenamiento web ni Supabase, `portalDesignerStyles.ts`, `PortalClientAccessCard.tsx`, `PortalPermissionsMatrix.tsx`, `PortalDesignerStudioScreen.tsx`, `index.ts`), operando en memoria local con `DEFAULT false`, búsqueda/filtros, modelo mixto `Nivel 1 / Nivel 2 / Acciones Habilitadas` y cero llamadas a Supabase.
- `scratch/verify_m09_designer_portal_ui.cjs`: Suite automatizada local (9/9 PASS) que valida Zero Trust inicial, bloqueo global, cascada Doble Candado, `deny-overrides`, estados inactivos, acciones habilitadas, integración estática de `NavigationGate` (`app/_layout.tsx` / `client-portal.tsx`), congelamiento profundo `Object.freeze` y auditoría estática anti-simulación/privacidad.
- `scratch/qa_m09_designer_portal_visual.cjs`: Auditoría integral Playwright en navegador local (Desktop `1440×900` y Móvil `390×844`) sobre `/client-portal`, verificando los 4 roles en `NavigationGate` (`designer`, `admin`, `client`, `anon`), búsqueda/filtros, cascada de permisos, 5 estados de acceso, cero overflow horizontal y cero llamadas remotas M09.
- `src/components/clientPortal/`: Subcomponentes modulares UI de la primera experiencia visual del Portal de la Clienta (`clientPortalModel.ts` con `Object.freeze` profundo y 5 clientas canónicas alineadas con aislamiento estricto por `clientId`, `clientPortalStyles.ts`, `ClientPortalAccessGateView.tsx`, `ClientPortalSectionViews.tsx`, `ClientPortalExperienceScreen.tsx` conectado a `portalLocalMemoryStore.ts`, `index.ts`), cubriendo Inicio, Creaciones, Citas, Seguimiento y Comunicación bajo modelo mixto Zero Trust `DEFAULT false`, Doble Candado, `deny-overrides` y cero llamadas a Supabase.
- `scratch/verify_m09_client_portal_ui.cjs`: Suite automatizada local (8/8 PASS) que valida Zero Trust `DEFAULT false`, bloqueo en estados sin invitación/invitada/suspendida/revocada, Doble Candado, `deny-overrides`, aislamiento estricto multi-clienta, `Object.freeze`, auditoría cero Supabase/datos reservados y exclusividad `role === 'client'` en `NavigationGate`.
- `scratch/qa_m09_client_portal_visual.cjs`: Auditoría integral Playwright en navegador local (Desktop `1440×900` y Móvil `390×844`) sobre `/mi-portal`, verificando `NavigationGate` en los 4 roles (`client` permitido; `designer`, `admin` y `anon` excluidos), 5 estados de ciclo de vida, 5 secciones, Doble Candado + `deny-overrides`, aislamiento Valeria vs Camila, cero overflow horizontal (`scrollWidth === innerWidth`) y cero llamadas Supabase en `/mi-portal`.
- `scratch/verify_m09_portal_integration.cjs`: Suite determinista de integración local (7/7 PASS, `0` llamadas Supabase) que verifica paridad canónica de 5 clientas entre modelos, propagación 1:1 desde diseñadora hacia clienta vía `portalLocalMemoryStore.ts`, cascada Doble Candado, precedencia `deny-overrides`, aislamiento Valeria/Camila, los 5 estados de ciclo de vida y auditoría estática del origen de `POST /functions/v1/admin-users`.
- `scratch/qa_m09_portal_integration_e2e.cjs`: Suite E2E Playwright en navegador local en un único contexto SPA sin recarga (`/client-portal` diseñadora → cierre de sesión → login SPA clienta → `/mi-portal`), verificando propagación real en RAM de permisos mixtos, `deny-overrides`, aislamiento Valeria/Camila, 5 estados y traza cronológica exacta de `POST /functions/v1/admin-users` post-redirección en `/(admin)`.
- `src/components/portalInvitations/`: Subcomponentes del flujo local completo de invitaciones M09 conectado en RAM a `portalLocalMemoryStore.ts` (`portalInvitationModel.ts`, `portalInvitationStyles.ts`, `InvitationEmailPreviewCard.tsx`, `DesignerPortalInvitationsScreen.tsx`, `ClientPortalInvitationScreen.tsx`, `index.ts`), diferenciando estados locales de persistentes pendientes de E1/E2 sin tokens ficticios ni envío real.
- `scratch/verify_m09_portal_invitations_flow.cjs`: Suite automatizada local (5/5 PASS, `0` llamadas Supabase) que verifica estado inicial `unprepared`, resumen de permisos con Doble Candado y `deny-overrides`, vista previa de correo, ciclo de vida (`draft`/`ready_for_preview`/`preview_accepted_local`/`expired_local`/`revoked_local`), bloqueo multi-clienta `mismatch_blocked` y auditoría estática.
- `scratch/qa_m09_portal_invitations_visual.cjs`: Auditoría integral Playwright en navegador local (`1440×900` y `390×844`) cubriendo `NavigationGate` en 4 roles para `/client-portal-invitations` y `/portal-invitation`, recorrido SPA RAM `/client-portal` → `/client-portal-invitations` → login clienta → `/portal-invitation` → `/mi-portal`, bloqueo mismatch/sin consentimiento/expirada/revocada, cero overflow horizontal y cero llamadas Supabase M09.
- `docs/M09_A_ESPECIFICACION_TECNICA_CONSOLIDADA_V2_11_PROPUESTA.md`: Propuesta técnica E1 (`v2.11 Propuesta`, sin modificar `v2.10` / `V2_5`), catálogo `NEG-01..NEG-23` y estado pendiente (`E1 NO EJECUTADA`, 3 controles `NO VERIFICADOS`).
- `supabase/migrations/20261118000000_client_portal_m09.sql`: Migración SQL canónica M09-A (Entrega E1 ejecutada y verificada en producción `trgoqqvsprknswobvniu` con COMMIT verificado; 4 tablas nuevas con RLS, rol `atelier_portal_reader`, 6 vistas `v_portal_*` con `security_barrier=true`, 7 políticas `apr_*`, 56 column grants, 10 constraints CHECK validadas, C15 `approved` y M00–M08 intactos; portal de clientes no activado hacia clientas).
- `scratch/verify_m09_migration_static.cjs`: Verificador estático local (20/20 PASS) sobre la migración propuesta M09, paridad SHA-256 `v2.10`/`V2_5` e integridad del script de sondas offline.
- `scratch/verify_m09_e1_empirical_probes.sql`: Batería de sondas empíricas SQL/RLS PG `17.11` (certificación runtime parcial completada en producción: `security_barrier` anti side-channel con calibración positiva/negativa y `EXPLAIN VERBOSE` PASS; aislamiento `SET LOCAL` bajo transacciones y mismo backend PID `189164` PASS; sin escrituras en tablas reales).
- `scratch/M09_E1_TRACEABILITY_MATRIX.md`: Matriz de trazabilidad y reconciliación M09 (E1 aplicada en producción con COMMIT, E2 desplegada en producción con ID `22a72b4f-1eb0-4bc1-8360-48b3b0951835` y smoke tests 4/4 PASS con 404 limpio sin PII, Control 1 runtime parcial validado pendiente lectura autorizada E3, Control 2 aislamiento PostgreSQL validado con integración PgBouncer/PostgREST pendiente de evidencia, IP Gateway ejecutado en vivo y declarado NO CERTIFICADO fail-closed con `client_ip = NULL` condicionado a `PORTAL_IP_GATEWAY_CERTIFIED = false` sin afirmar certificación global, C15 aprobada intacta y catálogo de riesgos/pendientes de E3–E5 preservado).
- `scratch/PROTOCOL_VERIFICACION_IP_GATEWAY_E2.md`: Protocolo de verificación de IP Gateway para Entrega E2 (ejecutado en vivo: Vector 1 CF-Connecting-IP bloqueado por Cloudflare con HTTP 403, Vectores 2–4 procesados por Edge Function sin lograr establecer IP inyectada confiable; al no contar con segunda conexión pública independiente EGRESS_IP_2 y sin certificación global de la infraestructura, el control se declara NO CERTIFICADO y se conserva client_ip = NULL fail-closed mientras PORTAL_IP_GATEWAY_CERTIFIED=false).
- `scratch/test_m09_ip_gateway_empirical.cjs`: Script ejecutor del protocolo empírico de IP Gateway en caliente contra el endpoint desplegado en Supabase producción (captura de cabeceras, EGRESS_IP_1 detectada 181.63.26.126 y respuestas HTTP).
- `supabase/functions/accept-portal-invitation/index.ts`: Edge Function server-side M09-E2 (desplegada en versión 1 en producción `trgoqqvsprknswobvniu` con verify_jwt=false y candados activos; acciones `verify` con cero PII / `masked_email` y `accept` con máquina de estados Saga, Forward Recovery sin `deleteUser`, validación Rama A con JWT y Rama B con Ley 1581, extracción fail-closed de IP y candado operativo de seguridad `PORTAL_ACCEPTANCE_ACTIVE = false` verificado en vivo con HTTP 503).
- `supabase/functions/accept-portal-invitation/emailService.ts`: Módulo editorial de correo M09-E2 (plantillas de alta costura HTML y texto plano con estética Katherine Carroll, Ley 1581 y candado fail-closed `PORTAL_EMAIL_DISPATCH_ENABLED` que mantiene desactivado el envío real).
- `supabase/functions/accept-portal-invitation/deno.json`: Configuración de compilación Deno para la Edge Function `accept-portal-invitation`.
- `scratch/verify_m09_e2_edge_function.cjs`: Suite exhaustiva de pruebas unitarias y mockeadas de la Entrega E2 (90/90 PASS: 10,000 muestras CSPRNG, Shannon 7.999 bits/byte, SHA-256 NIST, validación de tokens, cero PII en logs/verify, Saga claim/finalize/release, Forward Recovery sin `deleteUser`, 4 vectores de spoofing IP y paridad con traductores).
- `docs/INFORME_TECNICO_E2_BACKEND_M09.md`: Informe técnico de auditoría y cierre de la Entrega E2 (90/90 PASS, reconciliación completa de pruebas, Forward Recovery sin deleteUser, candados fail-closed y veredicto APTO para despliegue técnico).
- `docs/PROCEDIMIENTO_DESPLIEGUE_CONTROLADO_E2.md`: Procedimiento operativo de despliegue controlado de la Edge Function `accept-portal-invitation` en producción `trgoqqvsprknswobvniu` (comprobaciones previas, variables, candados, comando de despliegue, rollback, smoke tests HTTP y protocolo IP Gateway).
- `backups/M09_PRE_MIGRATION/`: Directorio de respaldos lógicos pre-migración M09 de `trgoqqvsprknswobvniu` (producción) generados el 2026-11-20 (8 archivos: DDL 36 tablas, inserts 100% filas con `json_populate_recordset`, RLS/grants, consolidado, snapshot JSON, README, manifiesto formal y sumas SHA-256).
- `scratch/generate_m09_pre_migration_backup.cjs`: Generador de backup de solo lectura (`supabase db query --remote --read-only`) con verificación fail-closed de ref de proyecto, delimitadores seguros y salida formateada sin credenciales.
- `scratch/verify_m09_pre_migration_backup.cjs`: Suite de verificación de integridad de backup pre-migración (31/31 PASS: existencia, hashes criptográficos SHA-256, cero credenciales, paridad de 36 tablas y catálogo, C15 aprobada preservada y coherencia SQL).
- `INFORME_TECNICO_PREPARACION_E3_FRONTEND_CLIENTAS.md`: Informe técnico de auditoría y cierre de preparación para la Entrega E3 (Frontend de Clientas). Inventario exhaustivo de archivos en `app/(client)/`, `src/components/clientPortal/` y `portalService.ts`; resolución de la dualidad `index.tsx` vs `mi-portal.tsx`; auditoría de `fetchMyPortalContext` y compatibilidad RLS E1; verificación de privilegios de solo lectura efectivos de `authenticated` en `client_portal_access` y `client_portal_permissions` (mutaciones bloqueadas por RLS); análisis de `client_portal_activity_log` como consulta exclusiva de diseñadora (`DossierPortalTab.tsx`) y emisión de telemetría por clientas mediante RPC `log_portal_event` (C-07 blindado); especificación rigurosa de ordenamiento PostgreSQL (`NULLS LAST` en `ASC` y `NULLS FIRST` en `DESC`); propuesta de ordenación funcional de cotizaciones comerciales que prioriza propuestas `'sent'` sin aprobación sobre el histórico aprobado; conciliación de enums M06 (`A-02`); y plan de implementación en 5 etapas sin escrituras en producción.

