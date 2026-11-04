# AUDITORÍA Y OPTIMIZACIÓN DEL CONSUMO DE TOKENS Y CRÉDITOS EN ANTIGRAVITY

**Proyecto:** Atelier Digital App (Expo / React Native / TypeScript)  
**Módulo Principal Auditado:** Módulo 02 — Patronaje, Medidas y Clientes Institucionales  
**Fecha de Auditoría:** 2026-11-03  
**Rol del Auditor:** Arquitecto de Software Senior & Especialista en Optimización de Contexto e Ingeniería de Prompts  
**Estado de la Auditoría:** Diagnóstico Completado — Plan de Optimización para Autorización  

---

## 1. Resumen Ejecutivo

Esta auditoría técnica examina exhaustivamente la interacción entre el usuario, el entorno de Antigravity, los agentes auxiliares y el repositorio de código de *Atelier Digital App*. El objetivo no es reducir la calidad ni la seguridad del software, sino erradicar el desperdicio sistemático de contexto, tokens de entrada/salida y créditos de cómputo.

### Cifras Globales Medidas en la Sesión Activa:
- **Total de eventos/turnos registrados en el transcript:** 7,723 líneas JSONL.
- **Turnos interactivos con el modelo (LLM Turns):** 3,615 turnos.
- **Tokens de Entrada (Input Tokens medidos):** **28,757,921 tokens** (~28.75 Millones).
- **Tokens de Salida (Output Tokens medidos):** **2,025,856 tokens** (~2.02 Millones).
- **Tokens leídos desde Caché de Contexto (Cache Read Tokens):** **468,080,583 tokens** (~468.08 Millones).
- **Pico máximo de entrada en un solo turno:** **250,185 tokens**.
- **Pico máximo de salida en un solo turno:** **25,114 tokens**.
- **Promedio de entrada por turno:** **7,955 tokens/turno**.
- **Promedio de salida por turno:** **560 tokens/turno**.
- **Herramientas más utilizadas:** `read_file` (1,345 llamadas), `run_command` (1,071 llamadas), `edit_file` (387 llamadas), `manage_task` (378 llamadas).

### Diagnóstico Sintético:
El consumo se concentra principalmente en tres factores:
1. **Arquitectura frontend hiper-monolítica:** Componentes que van de 2,000 a 14,900 líneas en un solo archivo (`PatternModule.tsx`: 14,941 líneas; `ClientDossierView.tsx`: 4,903 líneas; `PersonGroupSection.tsx`: 3,339 líneas). Solo dos archivos acumulan 425 operaciones de lectura profunda.
2. **Prompts no delimitados y prompts de continuidad pasiva:** Prompts como *"sigamos"* o *"corrige lo que no se ve"* fuerzan al agente a buscar a ciegas en miles de líneas, consumir decenas de comandos de búsqueda y releer transcripts completos.
3. **Pegado repetido de prompts maestros extensos:** Prompts de más de 1,800 tokens que se reinyectan en el contexto repetidamente sin necesidad, acelerando la compactación y pérdida de memoria de trabajo.

---

## 2. Alcance de la Auditoría

- **Ámbito analizado:** Repositorio completo de código (`src/`, `assets/`, configuración raíz, logs y transcript de sesión de Antigravity).
- **Periodo evaluado:** Sesión activa y ciclos de desarrollo de las Fases B1, B2 y B3 del Módulo 02.
- **Sujetos de análisis:**
  1. Eficiencia de prompts y directrices operativas.
  2. Estructura y tamaño de los archivos fuente.
  3. Comportamiento y patrones de llamadas a herramientas (`tool_calls`).
  4. Gobernanza del contexto y mecanismos de continuidad entre cuentas/sesiones.
- **Límites estrictos respetados:** No se alteró código fuente, no se eliminaron archivos, no se ejecutaron migraciones ni se implementaron refactorizaciones durante esta fase de diagnóstico.

---

## 3. Métricas Reales Disponibles vs. No Disponibles

### 3.1. Métricas Reales Consultadas y Medidas (Evidencia Dura)
A través de la telemetría del archivo de sesión persistente `transcript.jsonl` ubicado en el directorio de la aplicación (`<appDataDir>/brain/<conversation-id>/.system_generated/logs/`), se midieron con precisión matemática:
- Cantidad exacta de turnos de inferencia: `3,615`.
- Conteo exacto de tokens de entrada (`input_tokens`): `28,757,921`.
- Conteo exacto de tokens de salida (`output_tokens`): `2,025,856`.
- Tokens recuperados de memoria de contexto (`cache_read_tokens`): `468,080,583`.
- Frecuencia y argumentos exactos de las herramientas invocadas (1,345 `read_file`, 1,071 `run_command`, etc.).
- Inventario real de archivos por longitud de líneas y tamaño en kilobytes.
- Número de reintentos por fallos de sincronización de hooks de React y comandos de shell en Windows PowerShell.

### 3.2. Métricas No Disponibles / No Expuestas por la Plataforma
- **Consumo directo de Créditos en Dólares/Moneda:** La API interna de Antigravity reporta tokens procesados, pero no expone la tasa de facturación en créditos ni el costo financiero en USD por llamada.
- **Tokens de Razonamiento Interno (CoT Tokens):** Para ciertos modelos (como Gemini Flash / Claude Sonnet), el transcript expone el texto de `thinking`, pero no desglosa un contador separado de tokens de razonamiento frente a tokens de salida ordinarios.
- **Métricas de sesiones previas en otras máquinas/cuentas:** Cada conversación ID aísla sus registros; las sesiones que ocurrieron en otros contextos solo son trazables mediante la documentación que quedó escrita en el repositorio (`ANTIGRAVITY_CONTINUITY.md`).

---

## 4. Diagnóstico de las Principales Fuentes de Consumo Innecesario

### Fuente 1: Componentes Frontend Monolíticos ("Gigantes")
- **Evidencia:** 
  - `src/components/pattern/PatternModule.tsx`: **14,941 líneas (683.4 KB)**.
  - `src/components/clients/ClientDossierView.tsx`: **4,903 líneas (268.7 KB)**.
  - `src/components/clients/PersonGroupSection.tsx`: **3,339 líneas (154.5 KB)**.
  - `src/components/pattern/AtelierGrandAnatomicalMannequin.tsx`: **2,466 líneas (117.0 KB)**.
- **Mecanismo de Desperdicio:** `read_file` lee fragmentos de hasta 800 líneas (46 KB). Para entender o editar una función en `ClientDossierView.tsx`, el agente realiza entre 4 y 8 lecturas consecutivas (`212` lecturas registradas). En cada turno donde este código entra en el historial, la inferencia posterior debe procesar miles de tokens adicionales.

### Fuente 2: Prompts de Continuidad Pasiva ("Sigamos...")
- **Evidencia:** 
  - Prompts del usuario registrados textualmente: `"sigamos."`, `"sigamos por donde quedamos del ultiom prompt"`, `"continua por donde quedaste sin tanta revision..optimiza los tokesn."`.
- **Mecanismo de Desperdicio:** Cuando una solicitud no especifica el archivo ni el objetivo exacto, el agente no puede asumir riesgos a ciegas; está obligado a ejecutar comandos preliminares (`git status`, `git diff`, relectura de `ANTIGRAVITY_CONTINUITY.md`, inspección de logs). Esto consume entre 3 y 6 turnos y entre 35,000 y 60,000 tokens de contexto antes de realizar la primera modificación real.

### Fuente 3: Prompts Maestros Inyectados en Bloque Completo
- **Evidencia:**
  - El "PROMPT MAESTRO — CONTINUIDAD" (1,800 tokens) y el "PROMPT MAESTRO — AUDITORÍA" (2,200 tokens) se copian íntegros en el chat.
- **Mecanismo de Desperdicio:** Aunque las directrices de continuidad son cruciales, inyectar 10 secciones de prosa en cada reinicio llena el buffer de atención del modelo, forzando al sistema a realizar compactaciones tempranas del contexto (`/compact`) que borran decisiones técnicas previas.

### Fuente 4: Pruebas Globales Pesadas y Reintentos de Shell en Windows
- **Evidencia:**
  - 87 ejecuciones de `tsc --noEmit` y 420 comandos de `git`.
  - En Windows PowerShell, encadenamientos con `&&` o `&` fallaron repetidamente (`ParserError: El token '&&' no es un separador de instrucciones válido`), generando turnos nulos de corrección de sintaxis de shell.
  - Ejecutar `tsc --noEmit` a nivel de proyecto completo tarda entre 30 y 60 segundos por ciclo, cuando para cambios aislados bastaría con validar los archivos modificados.

### Fuente 5: Desactualización de Archivos de Continuidad
- **Evidencia:**
  - `ANTIGRAVITY_CONTINUITY.md` tenía fecha del 2026-11-02T18:52, omitiendo 4 fases de trabajo posteriores.
- **Mecanismo de Desperdicio:** Al comenzar una nueva cuenta o sesión, el agente lee un archivo de continuidad que no coincide con el estado real del código en `git`. Esto fuerza al nuevo agente a dudar del documento y lanzar una auditoría exploratoria desde cero.

---

## 5. Clasificación de Hallazgos (Matriz de Prioridad e Impacto)

| ID | Hallazgo | Prioridad | Impacto en Consumo | Causa Raíz | Tratamiento Recomendado |
|---|---|---|---|---|---|
| **H-01** | Lectura repetitiva de monolitos (>3,000 líneas) | **Crítica** | Muy Alto (~40% del consumo de lectura) | Archivos UI gigantes con lógica, modales y estilos acoplados | Fragmentar componentes en submódulos de <500 líneas |
| **H-02** | Prompts de reinicio ciego ("sigamos") | **Crítica** | Muy Alto (~25% de turnos improductivos) | Falta de delimitación de alcance por prompt | Usar plantilla de prompt puntual de 4 líneas |
| **H-03** | Inyección reiterada de prompts maestros extensos | **Alta** | Elevado Frecuente (1,500–2,500 tokens/prompt) | Re-pegar manual de instrucciones de gobernanza | Convertir reglas maestras en regla fija del sistema (`AGENTS.md`) |
| **H-04** | Errores de sintaxis de terminal (PowerShell vs Bash) | **Media** | Evitable Frecuente (turnos de error de shell) | Uso de operadores incompatibles (`&&`, `&`) en Windows | Adoptar sintaxis estándar `;` o scripts de una sola instrucción |
| **H-05** | Validación global `tsc` para ajustes menores | **Media** | Consumo de tiempo y reintentos asíncronos | Falta de pipeline de validación rápida por archivo | Validación enfocada de ESLint y tipado selectivo |
| **H-06** | Falta de sincronización en tiempo real de continuidad | **Alta** | Provoca re-auditorías completas entre cuentas | Documento de continuidad se actualiza solo al final | Actualización obligatoria al cierre de cada tarea concreta |
| **H-07** | Imágenes de alta resolución acumuladas en historial | **Media** | Carga residual en context window | Carga continua de screenshots sin purgarlos del foco | Instruir consultas visuales puntuales y referenciar componentes |

---

## 6. Análisis Detallado de los Prompts

### 6.1. Patrones Ineficientes Detectados en el Proyecto
1. **Prompt Descriptivo Difuso:**
   > *Ejemplo Real:* "revisa y corrige,,,algo no se ve ...dice borrador..."  
   > *Problema:* El agente debe revisar decenas de archivos buscando dónde aparece la palabra "borrador", examinar vistas de clientes, de patrones, tablas y modales. Se consumen hasta 12 lecturas de archivo antes de saber que se trataba de la columna de estado en `PersonGroupSection.tsx`.
2. **Prompt de Continuidad Pasiva:**
   > *Ejemplo Real:* "sigamos por donde quedamos del ultiom prompt"  
   > *Problema:* No aclara qué parte del prompt quedó pendiente ni qué archivo se estaba editando, forzando la relectura de logs de tareas.
3. **Prompt de Bloque Masivo:**
   > *Ejemplo Real:* Copiar 10 páginas de especificación de arquitectura juntas con preguntas sobre ergonomía y flujo de negocio.

### 6.2. Comparativa: Prompts Antes vs. Después de la Optimización

#### Caso 1: Reporte de Error Visual
- **Antes (Ineficiente - ~35,000 tokens consumidos en búsqueda):**
  > *"revisa y corrige,,,algo no se ve ...dice borrador..."*
- **Después (Optimizado - ~4,500 tokens consumidos):**
  > *"En `PersonGroupSection.tsx`, la pastilla de estado `⏳ BORRADOR` en la columna 5 de la tabla de personas no muestra el texto completo en pantallas móviles. Ajusta el estilo `statusBadgeDraft` para que tenga `paddingHorizontal: 6` y `minWidth: 80`. Valida con eslint."*

#### Caso 2: Continuidad entre Sesiones
- **Antes (Ineficiente - Requiere auditoría de contexto de ~50,000 tokens):**
  > *"sigamos. revisa qué falta y continúa."*
- **Después (Optimizado - Consumo directo < 5,000 tokens):**
  > *"CONTINUIDAD: Módulo 02, Tarea: Agregar tooltips nativos en los botones de acción rápida de `PersonGroupSection.tsx`. El archivo de continuidad es `ANTIGRAVITY_CONTINUITY.md`. Modifica únicamente esa botonera y valida `tsc`."*

---

## 7. Análisis de la Estructura Documental y de Repositorio

### Diagnóstico de los Archivos Existentes:
- `AGENTS.md` (2.5 KB): **Excelente.** Muy conciso, contiene las reglas fundamentales de Expo, Bunx/Npx y CNG.
- `ANTIGRAVITY_CONTINUITY.md` (4.2 KB): **Esencial.** Funciona muy bien como bitácora de entrega de guardia. Su única debilidad era el desfase temporal cuando no se actualizaba al concluir cada tarea.
- `M02_GUIÓN_PRUEBA_FUNCIONAL_COMPLETA.md` (36.9 KB): **Muy extenso.** Cargar este archivo completo en un turno consume ~9,000 tokens. Debe consultarse mediante búsqueda de fragmentos (`grep` / `Select-String`), nunca con `read_file` de 800 líneas de principio a fin.

### Estructura Documental Recomendada (Ligera y Jerárquica):
Para que un agente nuevo no tenga que cargar miles de líneas de contexto, se propone una arquitectura documental mínima:
1. `ANTIGRAVITY_CONTINUITY.md`: Bitácora viva del estado actual, última tarea terminada, próxima tarea y archivos tocados (<150 líneas).
2. `PROJECT_INDEX.md`: Mapa de navegación del repositorio que asocia cada módulo con sus archivos fuente principales (<100 líneas). Permite al agente saber qué archivo tocar sin buscar a ciegas.

---

## 8. Análisis de los Procesos de Desarrollo

### 8.1. Procesos Repetitivos Identificados
- **Revisión de ESLint repetitiva por reglas de React Compiler:**
  En `MeasurementCampaignFastCaptureModal.tsx` y `ClientDossierView.tsx`, se ejecutó ESLint hasta 8 veces para resolver advertencias de `react-hooks/set-state-in-effect`. Si la regla de linting se conoce de antemano (no invocar `setState` sincrónicamente dentro de un `useEffect` que sincroniza props), se evita el ciclo de 4 reintentos.
- **Búsqueda ciega con scripts auxiliares:**
  Se registraron 327 comandos PowerShell de búsqueda (`Select-String`) para localizar bloques en los archivos de 5,000 y 14,000 líneas. Si los componentes estuvieran divididos en archivos pequeños de propósito único, la ubicación sería inmediata.

---

## 9. Plan de Optimización Priorizado (4 Niveles)

### Nivel 1: Acciones Inmediatas (Cero Riesgo Arquitectónico)
1. **Adoptar la Regla de "Prompt de 4 Líneas" para el Usuario:**
   Cada solicitud debe contener:
   - `OBJETIVO:` Qué corregir o construir.
   - `ARCHIVO(S):` Ruta exacta del componente.
   - `RESTRICCIÓN:` Qué no debe tocarse o límites de tokens.
   - `CRITERIO DE ÉXITO:` Qué comando o prueba valida la finalización.
2. **Actualización Obligatoria en Tiempo Real de `ANTIGRAVITY_CONTINUITY.md`:**
   Al terminar una tarea, el agente actualiza la bitácora antes de dar la palabra al usuario, garantizando que el siguiente agente tenga el contexto listo en 1 lectura de 60 líneas.
3. **Estandarización de Comandos de Terminal para Windows:**
   Evitar encadenamientos bash (`&&`, `&`). Utilizar punto y coma `;` o comandos independientes para evitar turnos de error sintáctico.

### Nivel 2: Organización del Contexto (Bajo Riesgo)
1. **Creación de `PROJECT_INDEX.md`:**
   Documento índice que mapee componentes clave con sus responsabilidades, evitando búsquedas recursivas en todo el árbol de carpetas.
2. **Acceso Quirúrgico a Documentación Extensa:**
   Prohibir la lectura integral de guiones de prueba de más de 30 KB. Usar búsquedas de palabras clave puntuales para extraer solo el escenario relevante.

### Nivel 3: Optimización de la Interacción con el Modelo
1. **Incorporar las Reglas Maestras a `AGENTS.md` o Rulebook Permanente:**
   En lugar de que el usuario copie y pegue 1,800 tokens de "PROMPT MAESTRO" en cada sesión, estas reglas se colocan una sola vez en el archivo de reglas de Antigravity (`AGENTS.md`), donde el motor las carga de forma nativa optimizada mediante caché del sistema.
2. **Respuestas de Estado Concisas:**
   Eliminar resúmenes explicativos redundantes de código en el chat cuando el cambio ya está reflejado en el diff o en el archivo de continuidad.

### Nivel 4: Modularización Gradual del Código (Mediano Plazo — Requiere Autorización)
1. **Desacoplar Monolitos Críticos:**
   Extraer los modales y componentes secundarios de `PersonGroupSection.tsx` (3,339 líneas) y `ClientDossierView.tsx` (4,903 líneas) a subcarpetas dedicadas (`src/components/clients/personGroup/`, `src/components/clients/dossier/`). Esto reducirá el tamaño medio de archivo de 3,500 líneas a ~350 líneas, desplomando el costo de lectura en un 70%.

---

## 10. Tabla de Acciones de Optimización

| ID | Acción | Nivel | Prioridad | Beneficio Esperado | Tipo de Ahorro | Riesgo | Dependencia |
|---|---|---|---|---|---|---|---|
| **ACT-01** | Integrar directrices de continuidad en `AGENTS.md` para no re-pegar el prompt maestro | Nivel 3 | **Crítica** | Ahorro de ~2,000 tokens de entrada en cada reinicio | **Medido** (~1,800 tokens/reinicio) | Nulo | Ninguna |
| **ACT-02** | Plantilla de prompts estructurados (Objetivo, Archivo, Validación) | Nivel 1 | **Crítica** | Reducción del 50% de lecturas exploratorias a ciegas | **Estimado** (Ahorro de ~30k tokens/tarea) | Nulo | Compromiso de usuario |
| **ACT-03** | Mantener `ANTIGRAVITY_CONTINUITY.md` al día en cada cierre de turno | Nivel 1 | **Crítica** | Elimina re-auditorías completas entre cuentas | **Medido** (Evita re-inspección de 7k tokens) | Nulo | Ninguna |
| **ACT-04** | Creación de `PROJECT_INDEX.md` como mapa rápido de rutas | Nivel 2 | **Alta** | Reduce comandos `Get-ChildItem` y `Select-String` | **Estimado** (Ahorro de ~15k tokens/sesión) | Muy bajo | Aprobación de formato |
| **ACT-05** | Estandarizar sintaxis PowerShell en comandos de validación | Nivel 1 | **Alta** | Cero turnos perdidos por error de operador `&&` | **Medido** (Ahorro de 3–5 turnos por sesión) | Nulo | Ninguna |
| **ACT-06** | Validación incremental de tipos (ESLint puntual antes de `tsc` completo) | Nivel 1 | **Media** | Validación 4x más rápida sin background tasks colgadas | **Estimado** (Ahorro de tiempo y contexto) | Nulo | Ninguna |
| **ACT-07** | Modularización gradual de `PersonGroupSection.tsx` (dividir modales) | Nivel 4 | **Alta** | Lecturas de archivo 80% más pequeñas y baratas | **Estimado** (Ahorro masivo en Fases B3/B4) | Bajo (requiere tests) | **Requiere Autorización Expresa** |
| **ACT-08** | Modularización gradual de `ClientDossierView.tsx` (extraer pestañas) | Nivel 4 | **Media** | Pasa de 4,900 líneas a submódulos de 400 líneas | **Estimado** (Ahorro masivo a largo plazo) | Bajo (requiere tests) | **Requiere Autorización Expresa** |

---

## 11. Indicadores de Seguimiento (KPIs de Eficiencia)

Para monitorear objetivamente que estas optimizaciones funcionen en las siguientes sesiones, se registrarán:
1. **Llamadas a `read_file` por tarea resuelta:** Meta ≤ 8 llamadas (actualmente promedia entre 15 y 30 en archivos monolíticos).
2. **Tokens de entrada promedio por turno:** Meta ≤ 5,000 tokens (actualmente en 7,955 tokens, con picos de 250,000).
3. **Turnos requeridos para iniciar trabajo tras cambio de cuenta:** Meta = 1 turno (lectura de `ANTIGRAVITY_CONTINUITY.md` y ejecución directa).
4. **Comandos de terminal fallidos por sintaxis de shell:** Meta = 0 fallos por sesión.
5. **Porcentaje de tareas completadas en primer intento sin cascading renders de ESLint:** Meta ≥ 90%.

---

## 12. Riesgos y Mecanismos de Control

| Riesgo Posible | Causa | Mecanismo de Control |
|---|---|---|
| Perder contexto histórico por no leer archivos completos | Lectura parcial por rangos de líneas | Mantener `ANTIGRAVITY_CONTINUITY.md` con enlaces de símbolos y decisiones técnicas aprobadas. |
| Errores de regresión por modularización de código | Separar componentes grandes en submódulos | Ejecutar `tsc --noEmit` y suite de pruebas (`fase_b2_validation.spec.ts`) tras cada desacoplamiento. |
| Incomodidad del usuario al redactar prompts estructurados | Exigencia de formato estricto | Usar una plantilla ultra-simple de 3 datos clave (Qué, Dónde y Cómo validar). |

---

## 13. Orden Recomendado de Implementación

1. **Paso 1 (Inmediato):** Aplicar las reglas de prompts estructurados y estandarización de PowerShell.
2. **Paso 2 (Inmediato):** Integrar los principios del Prompt Maestro de Continuidad permanentemente en `AGENTS.md` para evitar volver a pegarlo.
3. **Paso 3 (Inmediato):** Crear `PROJECT_INDEX.md` con el mapa de los componentes clave.
4. **Paso 4 (Mediano plazo, bajo autorización):** Planificar la descomposición modular de los archivos que superen las 2,000 líneas (`PersonGroupSection.tsx` y `ClientDossierView.tsx`).

