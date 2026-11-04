# MAPA DEL PROYECTO (PROJECT INDEX)

> **Uso:** Guía rápida de localización para evitar búsquedas recursivas (`Get-ChildItem`) y ahorrar tokens.

### 1. Pantallas y Rutas (Expo Router)
- `app/index.tsx`: Portada editorial y Landing Page comercial pública (bilingüe ES/EN).
- `app/(designer)/clients.tsx`: Pantalla principal del módulo de clientes.
- `app/(designer)/patterns.tsx`: Pantalla del taller CAD y patronaje.
- `app/(designer)/_layout.tsx`: Navegador principal del diseñador.

### 2. Landing Pública e Internacionalización
- `src/i18n/landingTranslations.ts`: Diccionario bilingüe estricto (ES / EN) de la portada.
- `src/context/LandingLanguageContext.tsx`: Proveedor de estado de idioma y sincronización SEO.
- `src/components/LanguageSelector.tsx`: Selector visual conmutador ES | EN.
- `src/components/PublicFooter.tsx`: Pie de página público institucional bilingüe.

### 3. Clientes y Expedientes (`src/components/clients/`)
- `ClientsModule.tsx`: Listado de clientes B2B/B2C, filtros y métricas.
- `ClientDossierView.tsx`: Expediente del cliente (Datos, Sesiones, Personas, Historial).
- `PersonGroupSection.tsx`: Gestión de grupos/alumnos (Fichas móviles, Tabla, Jornadas masivas).
- `MeasurementCampaignFastCaptureModal.tsx`: Estación ergonómica de captura rápida de jornadas (Maniquí + Medidas + Numpad).

### 3. Patronaje y Medidas (`src/components/pattern/`)
- `AtelierMannequinDisplay.tsx`: Maniquí interactivo con cotas anatómicas iluminadas.
- `AtelierNumericKeypad.tsx`: Teclado numérico táctil optimizado para captura en vivo.
- `AtelierInteractiveMannequin.tsx`: Maniquí de selección cota por cota.
- `AtelierSizeAdvisor.tsx`: Recomendador de tallas estándar y comparación con medidas reales.
- `PatternModule.tsx`: Taller completo CAD de patronaje digital.

### 4. Motor de Patronaje y Catálogos (`src/engine/pattern/`)
- `catalog/masterCatalog.ts`: Catálogo maestro de cotas anatómicas y rangos biométricos.
- `catalog/measurementTemplates.ts`: Plantillas de medidas por tipo de prenda (Uniforme, Falda, Corpiño, etc.).
- `calculator/`: Algoritmos de cálculo de holguras, escalado y transformaciones geométricas.

### 5. Servicios y Tipos
- `src/services/measurementCampaignService.ts`: CRUD de campañas de medición y participantes.
- `src/services/clientService.ts`: CRUD de clientes y expedientes.
- `src/types/personGroup.ts`: Interfaces de personas medidas, grupos y núcleos.
- `src/types/pattern/measurementCampaign.ts`: Interfaces de jornadas y capturas rápidas.
- `src/types/pattern/measurement.ts`: Interfaces de cotas, valores y unidades.

### 6. Control, Continuidad y Transferencia Louka
- `ANTIGRAVITY_CONTINUITY.md`: Estado actual, últimas modificaciones y tareas pendientes.
- `AGENTS.md`: Reglas del proyecto, Expo, ejecución en Windows y directrices de tokens.
- `ACUERDOS_OPTIMIZACION_TOKENS_Y_PROMPTS.md`: Acuerdos de tokens y plantilla de prompt para Louka.
- `INFORME_CONCEPTUAL_LANDING_PAGE_PROYECTO_LOUKA.md`: Especificación conceptual y Master Prompt de la Landing para Louka.

