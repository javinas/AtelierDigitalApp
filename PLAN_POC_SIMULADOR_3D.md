# PLAN DE EJECUCIÓN PoC (ETAPA 1): SIMULADOR DE PRENDAS 3D AISLADO
**Atelier Digital App — By Katherine Carroll**  
**Fecha:** 2026-11-14  
**Base normativa y arquitectónica cerrada:** [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md) (Estado: **En revisión / pendiente de aprobación — Gate 0**)  
**Estado de este plan:** Plan operativo ejecutable de Etapa 1 (sin modificación de código, dependencias, configuraciones, SQL, migraciones ni módulos M00–M07).

---

## 1. Cierre de Revisión V2.6 y Pendiente Contractual Registrado

1. **Cierre de la serie documental V2.x:** Con [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md) se cierra el diseño conceptual y contractual de Etapa 0. **No se crea V2.7.** Cualquier ajuste posterior al contrato ocurre únicamente tras la ejecución de benchmarks reales o durante Etapa 4.
2. **Registro obligatorio de pendiente — Validación cruzada por cara NO cubierta por JSON Schema V2.6:**  
   Aunque el JSON Schema Draft 2020-12 de V2.6 (`TextileProfileV2_6`) ya valida `faceUp.repetitionsCount >= 5` y `faceDown.repetitionsCount >= 5` en `COMPLETE_GATE_3B` y `SHORTENED_CANTILEVER_STRIP_SWATCH_LIMIT`, quedan **explícitamente pendientes de validación fuera de JSON Schema** (actualmente delegadas solo al validador determinista de runtime `validateTextileProfileInvariants` en [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md#L1675-L1700)) las siguientes reglas cruzadas por cara en telas `ASYMMETRIC`:
   - En `REDUCED_REPETITIONS_SWATCH_LIMIT` y `COMBINED_SWATCH_CONSTRAINT`, JSON Schema **no** verifica `Math.min(faceUp.repetitionsCount, faceDown.repetitionsCount) === repetitionsCount`, ni que al menos una de las dos caras (`faceUp` o `faceDown`) tenga `<= 4` repeticiones.
   - Entre `faceDirectionalResults` (`faceUp` / `faceDown`) y el `PhysicalProperty` padre, JSON Schema **no** verifica `range.min === Math.min(B_up, B_down)`, `range.max === max(B_up, B_down)`, `asymmetryRatio_faceUpOverFaceDown === B_up / B_down` (o `null` si `B_down === 0`), ni las ecuaciones por cara (`bendingLengthMean_cm = cantileverLengthMean_cm / 2`, `B = G * c^3` y cuadratura independiente $u_c = \sqrt{u_{\mathrm{A}}^2 + u_{\mathrm{B}}^2}$, $U = k \cdot u_c$).
   - **Acción:** Mantener estas reglas como requisito bloqueante del validador runtime `validateTextileProfileInvariants` en Etapa 4 / Gate 4 y cubrirlas con pruebas unitarias negativas específicas antes de cualquier uso productivo.
3. **Principios inviolables durante toda la PoC:**
   - **Cero impacto en producción:** M00–M07, M02, Flujo B, SQL, migraciones, `package.json` de producción y el prototipo visual actual [`src/components/mannequin3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/) permanecen intactos hasta aprobación expresa.
   - **M05 opcional y de solo lectura:** La PoC funcionará sin conectarse a Supabase ni leer tablas de M05.
   - **Sin selección anticipada ni falsa validación:** Ningún motor ni proxy de colisión queda seleccionado antes de completar los benchmarks de esta PoC. Una tela cayendo visualmente de forma convincente **no** constituye validación física textil (reservada a Etapa 3: 3A/3B/3C).

---

## 2. Línea Base Real Observada en `mannequin3d` y el Entorno

De la inspección directa del repositorio ([`package.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/package.json), [`src/components/mannequin3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/) y [`app/mannequin-preview.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/mannequin-preview.tsx)):

| Componente Actual | Capacidad Existente Verificada | Brecha para Simulación Física (PoC Etapa 1) |
| :--- | :--- | :--- |
| [`mannequinMeshBuilder.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/mannequinMeshBuilder.ts#L67-L311) | Torso paramétrico femenino de **11 capas × 36 segmentos = 720 triángulos** (`estatura`, `talle`, `busto`, `cintura`, `cadera`, `espalda`), pedestal y 3 cintas visuales. | Baja densidad superficial, sin extremidades, sin *landmarks* 3D exportables y sin estructura de colisión (BVH, cápsulas o SDF). |
| [`Mannequin3DViewer.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/Mannequin3DViewer.tsx#L78-L178) | `THREE.WebGLRenderer` (`three ^0.170.0`), órbita 360°, presets de cámara y render bajo demanda (`requestRender()`). | Solo corre en `Platform.OS === 'web'` (no renderiza en iOS/Android nativo) y no tiene bucle continuo desacoplado de física (`substeps` con $\Delta t$ fijo). |
| [`Mannequin3DStudioSandbox.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/Mannequin3DStudioSandbox.tsx#L30-L100) y [`mannequin-preview.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/mannequin-preview.tsx#L17-L26) | Ruta aislada `/mannequin-preview`, 4 siluetas preset y telemetría básica (`fps`, `trianglesCount`, `deformationTimeMs`). | Sin soporte para malla deformable de prenda, métricas de energía/elongación ni alternancia de telas/motores. |
| Dependencias en [`package.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/package.json#L5-L34) | `expo ~57.0.31`, `react 19.2.3`, `react-native 0.86.3`, `three ^0.170.0`, `@playwright/test ^1.64.1`. | **No** incluye `expo-gl`, `@react-three/fiber` ni librerías físicas externas. |

---

## 3. Definición Técnica de la PoC (Etapa 1)

### 3.1 Motor Candidato y Línea Base de Comparación
- **Candidato principal a evaluar:** **XPBD** (*Extended Position-Based Dynamics*, Macklin et al., 2016) con *compliance* elástico $\alpha$ escalado por área/longitud de elemento, restricciones de distancia estructural/trama/sesgo y restricción diédrica de flexión (*bending*).
- **Línea base de contraste:** **PBD clásico** (Müller et al., 2007) en la misma escena para cuantificar empíricamente sensibilidad a $\Delta t$, número de iteraciones y densidad de malla.
- **Regla Gate 1:** Ninguno queda elegido a priori; si XPBD en JS puro no sostiene métricas en mallas medias, se medirá el cuello de botella (solver vs. colisión) antes de decidir aceleración (WebAssembly / Web Worker / compute).

### 3.2 Geometría Corporal Mínima para la PoC
En la PoC se trabajará sobre un **volumen mínimo de torso + hombros + cadera alta** derivado paramétricamente de las cotas de [`DEFAULT_FEMALE_MEASUREMENTS`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/types.ts#L63-L70) (`busto`, `cintura`, `cadera`, `espalda`, `talle`), comparando en benchmark controlado las **tres alternativas abiertas en V2.6 §10**:
- **Alternativa A:** Malla de torso refinada (evaluando densidad mínima suficiente sin facetado) + aceleración espacial (Spatial Hash / BVH ligero).
- **Alternativa B:** Jerarquía analítica mínima de **8–12 cápsulas / elipsoides** alineados al perfil de torso-hombros-cadera (colisión analítica continua) + malla visual separada.
- **Alternativa C:** Campo de distancia con signo (**SDF**) precalculado en grilla 3D uniforme sobre el volumen del torso.

*(La cabeza, antebrazos y piernas completas quedan fuera del alcance mínimo de esta PoC inicial).*

### 3.3 Primera Prenda de Prueba (Dos Escalones Secuenciales)
1. **Escena 0 — Paño de calibración física:** Paño rectangular plano ($50 \times 50\ \text{cm}$ simulados) en dos pruebas: (a) caída libre con 2 esquinas fijas (bandera/colgante para *Locking Test* e invarianza de remallado) y (b) paño centrado cayendo sobre esfera/hombro sintético (para verificar pliegues y fricción de contacto).
2. **Escena 1 — Primera prenda funcional (cuerpo/falda sin tocar M02):** Prenda simple construida procedimentalmente en el sandbox PoC (en este orden de complejidad):
   - **Objetivo visual-físico mínimo:** **Top / corpiño suelto sin mangas (2 paneles: delantero + espalda con costuras de hombro y costados)** o **falda evasé de cintura cerrada en 2 paneles**, con holgura inicial (*ease*) sobre el proxy corporal, cerrada mediante **restricciones de costura temporal** durante los primeros $0.5\text{–}1.0\ \text{s}$ y posterior asentamiento gravitatorio estable ($\mathbf{g} = -9.81\ \text{m/s}^2$).
   - **Prohibición explícita:** Esta geometría se genera en la PoC como malla paramétrica de prueba; **no** importa archivos ni modifica la lógica CAD de M02 ni Flujo B.

### 3.4 Telas de Contraste (Arquetipos Sintéticos de Prueba)
Para probar sensibilidad física real del motor sin inventar datos de catálogo ni ensayos falsos, la PoC usará **3 arquetipos sintéticos contrastados + 1 caso de asimetría direccional**, etiquetados explícitamente como `TIER_3_ESTIMATED` / *calibration-placeholder* (nunca como ensayos reales):
1. **Arquetipo Fluido Ligero (ref. conceptual tipo chifón / seda liviana):** densidad superficial baja, flexión muy baja (caída pegada y pliegues finos múltiples).
2. **Arquetipo Medio Balanceado (ref. conceptual tipo popelina / crepé medio):** densidad y flexión intermedias, equilibrio entre fluidez y soporte.
3. **Arquetipo Estructurado Rígido (ref. conceptual tipo tafetán grueso / mikado o entretelado):** alta rigidez flexural $B$ relativa respecto al Arquetipo 1 (pliegues amplios, campana abierta, menor deformación vertical).
4. **Caso Opcional Asimétrico (`FACE_UP` vs. `FACE_DOWN`):** verificación en Escena 0 de que el modelo de flexión direccional admite distinta rigidez por orientación de curvatura (alineado con `faceDirectionalResults` de V2.6) sin colapsar ambas caras en un promedio único.

### 3.5 Entorno de Ejecución
- **Entorno principal de ejecución PoC:** **Sandbox aislado en navegador Web** (Three.js `^0.170.0` ya presente en el proyecto + bucle fijo de simulación $\Delta t \le 1/60\ \text{s}$ con subpasos en Web Worker o loop desacoplado) ejecutado en entorno aislado para evitar contaminar rutas de producción, medido de forma automatizada con **Playwright (`@playwright/test ^1.64.1`)**.
- **Sonda de contraste móvil (sin instalar dependencias permanentes):** Evaluación de viabilidad técnica al final de Etapa 1 sobre **Web móvil (viewport/dispositivo real)** y análisis documental/benchmark mínimo de **WebView vs. `expo-gl`** antes de decidir en Gate 1 si Etapa 2 requiere módulo nativo o Wasm.

---

## 4. Plan Ejecutable por Tareas Pequeñas (Ruta Directa a la Primera Prenda Simulada)

> [!IMPORTANT]
> Cada tarea siguiente solo se considera cerrada cuando cumple su criterio **PASS**. Si falla, se ajusta en alcance PoC sin tocar código de producción (`src/services/`, M00–M07, BD).

| ID | Tarea Concreta y Acotada | Entregable / Evidencia | Criterio Objetivo PASS / FAIL |
| :---: | :--- | :--- | :--- |
| **T0** | **Aprobación Gate 0 y congelamiento de línea base** | Acta/confirmación de usuario sobre V2.6 + este plan; confirmación de pendiente de validación cruzada por cara fuera de JSON Schema. | **PASS:** V2.6 aprobada para PoC; cero cambios en M00–M07, M02/Flujo B, M05 y BD.<br>**FAIL:** Falta aprobación Gate 0 o intento de modificar módulos de producción. |
| **T1** | **Especificación matemática mínima XPBD vs. PBD + Harness de telemetría PoC** | Nota técnica breve con ecuaciones discretas XPBD (distancia + *bending* diédrico + escala de *compliance* por área de triángulo) + cronómetro de `physicsStepMs`, `collisionMs`, `renderMs`, `maxStretchPct` y `penetrationCount`. | **PASS:** Ecuaciones dimensionalmente consistentes en unidades SI y telemetría capaz de exportar JSON por frame.<br>**FAIL:** Parámetros adimensionales sin relación explícita con $\Delta t$ o métricas ausentes. |
| **T2** | **PoC Escena 0: Paño de prueba (XPBD vs. PBD) — Locking e Invarianza de Malla** | Simulación aislada de paño $50\times 50\ \text{cm}$ con 2 resoluciones de malla (ej. $16\times 16$ vs. $32\times 32$ nodos) bajo $\mathbf{g} = -9.81\ \text{m/s}^2$. | **PASS:** Cero `NaN`/inestabilidad en $10\ \text{s}$ simulados; elongación media en tejido inelástico $\le 2\%$ (máxima puntual $\le 5\%$); perfil de caída entre $16\times 16$ y $32\times 32$ converge dentro de $\le 10\%$ de diferencia geométrica.<br>**FAIL:** Explosión numérica, estiramiento gomoso $> 5\%$ o caída radicalmente distinta al duplicar resolución. |
| **T3** | **Benchmark de Geometría Corporal Mínima (Alternativas A vs. B vs. C)** | Comparativa cronometrada de colisión paño-sobre-torso usando medidas de `DEFAULT_FEMALE_MEASUREMENTS` para: **A** (malla refinada + spatial hash), **B** (cápsulas/elipsoides analíticos) y **C** (SDF 3D). | **PASS:** Mínimo 1 alternativa logra $0\%$ de penetración severa sostenida (`depth > 3 mm` al equilibrio) y presupuesto de colisión $\le 6\ \text{ms/frame}$ en Desktop Web.<br>**FAIL:** Penetraciones visibles tras asentamiento o `collisionMs` que desploma el frame por debajo de 30 FPS. |
| **T4** | **Prueba de Telas de Contraste (3 Arquetipos + Caso Asimétrico)** | Capturas comparativas lado a lado + métricas de altura de caída, número de pliegues y energía residual sobre Escena 0 con los 3 arquetipos (§3.4) y 1 ensayo comparativo `FACE_UP` vs. `FACE_DOWN`. | **PASS:** Diferencia visual y numérica clara y monótona entre Arquetipo 1 (fluido), Arquetipo 2 (medio) y Arquetipo 3 (rígido); `FACE_UP` y `FACE_DOWN` producen respuestas diferenciadas en caso asimétrico.<br>**FAIL:** Los 3 arquetipos lucen iguales o el arquetipo rígido colapsa por falta de convergencia de *bending*. |
| **T5** | **Hito Central — Primera Prenda Simulada Funcional (Escena 1)** | Escena 3D interactiva aislada con el **top/corpiño 2 paneles (o falda evasé)** cosiéndose alrededor del proxy corporal mínimo ganador en T3, estabilizándose por gravedad y permitiendo rotación orbital 360° + cambio entre los 3 arquetipos textiles. | **PASS:** Cierre completo de costuras sin atrapamiento ni inversión de normales; estabilización en $\le 3\ \text{s}$ simulados; $\ge 30\ \text{FPS}$ sostenidos en Desktop Web; cero penetración visible en busto/cintura/cadera.<br>**FAIL:** Costuras rasgadas, prenda deslizándose fuera del cuerpo, interpenetración visible o $< 24\ \text{FPS}$. |
| **T6** | **Sonda Móvil + Paquete de Decisión Gate 1 (Go / No-Go)** | Medición de la Escena 1 en perfil móvil (Web móvil / hardware limitado) + informe técnico objetivo comparando JS puro vs. necesidad de Wasm/WebView/`expo-gl`. | **PASS:** Evidencia empírica medida para decidir en Gate 1: (1) motor seleccionado, (2) alternativa de colisión A/B/C elegida, (3) estrategia de ejecución móvil para Etapa 2.<br>**FAIL:** Recomendar tecnologías sin mediciones o mezclar validación estética con precisión física textil. |

---

## 5. Criterios Consolidados de Aceptación de la PoC (Métricas Gate 1)

Para considerar **APROBADA** la PoC de Etapa 1 y habilitar una eventual Etapa 2, deberán cumplirse **simultáneamente**:

| Dimensión | Métrica Medida | Umbral PASS (Desktop Web) | Referencia de Observación Móvil (T6) |
| :--- | :--- | :--- | :--- |
| **Fluidez visual** | FPS sostenido durante simulación activa (Escena 1) | **$\ge 30\ \text{FPS}$** (ideal $\ge 45\ \text{FPS}$) | Medir real ($\ge 24\ \text{FPS}$ mínimo o documentar paso necesario a Wasm/nativo). |
| **Presupuesto por paso** | Tiempo de cómputo física + colisión por frame (`16.6 ms` / `33.3 ms`) | **$\le 16\ \text{ms/frame}$** promedio (p95 $\le 25\ \text{ms}$) | Reportar p50 y p95 medidos; prohibido extrapolar sin correr prueba. |
| **Estabilidad numérica** | Conteo de `NaN`, vértices divergentes o saltos de velocidad | **$0$ incidencias** en 3 ejecuciones de $15\ \text{s}$ | **$0$ incidencias**. |
| **Inextensibilidad (*Locking*)** | Elongación en paño inelástico bajo gravedad (`T2`) | Media **$\le 2\%$**, pico **$\le 5\%$** | Idéntico criterio físico independiente de dispositivo. |
| **Invarianza de remallado** | Variación de flecha/caída al duplicar densidad de malla (`T2`) | Diferencia **$\le 10\%$** | Idéntico criterio. |
| **Calidad de colisión** | Vértices de prenda penetrando el proxy corporal $> 3\ \text{mm}$ tras asentamiento | **$0$ vértices penetrantes visibles** | Idéntico criterio. |
| **Contraste textil** | Diferenciación mensurable entre 3 arquetipos + caso asimétrico (`T4`) | Separación clara sin colapso ni oscilación perpetua | Mismos arquetipos. |
| **Aislamiento de arquitectura** | `git diff` en M00–M07, M02, M05, SQL, BD y `V2.6` | **$0$ cambios en producción** | Verificable por `git status --short`. |

> [!CAUTION]
> **Límite estricto de interpretación:** Superar estas métricas valida la **viabilidad mecánica y computacional** del motor y del proxy de colisión (**Gate 1**). **No** certifica fidelidad física contra telas reales del taller ni sustituye a Etapa 3 (comparación presencial 3A, medición física reproducible 3B ni contraste instrumental 3C).

---

## 6. Ruta Directa al Primer Resultado Visual y Físico Funcional

La secuencia más corta para ver y medir la **primera prenda simulada funcional** sigue estrictamente esta ruta crítica de 6 pasos sin desvíos:

```mermaid
flowchart LR
    T0["T0: Gate 0 V2.6
    + Pendiente Schema por Cara"] --> T1["T1: Ecuaciones XPBD/PBD
    + Harness Métricas PoC"]
    T1 --> T2["T2: Escena 0 Paño
    Locking + Invarianza Malla"]
    T2 --> T3["T3: Benchmark Colisión
    Torso Mínimo A vs B vs C"]
    T3 --> T4["T4: 3 Telas de Contraste
    + Caso Asimétrico"]
    T4 --> T5["T5: HITO ESCENA 1
    Primera Prenda Simulada"]
    T5 --> T6["T6: Sonda Móvil
    + Decisión Gate 1"]
```

1. **T0 → T1:** Congelar V2.6 (incluyendo el pendiente de validación cruzada por cara fuera de JSON Schema) y levantar un sandbox aislado de medición con bucle fijo $\Delta t$ sobre Three.js Web.
2. **T2:** Validar físicamente un paño simple antes de construir ninguna prenda (*Locking Test* + invarianza de malla).
3. **T3:** Elegir mediante tiempo real y cero penetración cuál proxy mínimo del torso (`A`, `B` o `C`) responde mejor sobre las cotas de [`mannequinMeshBuilder.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/mannequinMeshBuilder.ts).
4. **T4:** Verificar contraste visual/físico claro entre los 3 arquetipos textiles y la capacidad direccional cara/envés.
5. **T5 (Primer resultado visual y físico funcional completo):** Renderizar el top/corpiño de 2 paneles (o falda evasé) cosiéndose en tiempo real sobre el proxy corporal mínimo, alcanzando equilibrio estable sin penetraciones, con rotación 360° y cambio interactivo entre los 3 arquetipos de tela.
6. **T6 (Cierre de Etapa 1):** Ejecutar la sonda de rendimiento móvil y presentar métricas reales para votación **Gate 1 (Go / No-Go)** hacia Etapa 2.

---

## 7. Confirmación de No Alteración

Durante la elaboración de este plan [`PLAN_POC_SIMULADOR_3D.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/PLAN_POC_SIMULADOR_3D.md):
- **NO** se creó V2.7 ni se alteró V1–V2.6.
- **NO** se modificó código (`src/`, `app/`), dependencias (`package.json`), configuraciones, SQL, migraciones ni los módulos M00–M07.
- M02, Flujo B y M05 (opcional y solo lectura) permanecen intactos.

