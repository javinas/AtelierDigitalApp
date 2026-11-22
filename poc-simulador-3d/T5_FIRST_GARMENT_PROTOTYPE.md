# T5 — Primera Prenda Integrada: Top/Corpiño de Dos Paneles sobre Torso Canónico

**Estado:** COMPLETADO (aislado en `poc-simulador-3d/`, sin modificar producción, M00–M07, BD, `package.json`, `H1B` original ni `results/t2*..t4_1/`)  
**Fecha:** 2026-11-15  
**Solver candidato evaluado:** `EXP2_RAYLEIGH_BEND_FIRST` ([`t41ExperimentalSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/t41ExperimentalSolvers.ts): `12` subpasos/frame a `60 Hz`, orden `Bend-first -> FineStretch` sin pirámide `V-cycle`, amortiguación interna Rayleigh XPBD `τ_stretch = 0.0006 s`, `τ_bend = 0.0015 s`, colisión antes del solve fino + limpieza final sin fricción)  
**Variantes comparadas:** `EXP2_NFINE2_NOGUARD`, `EXP2_NFINE3_NOGUARD`, `EXP2_NFINE2_SG45`, `EXP2_NFINE3_SG45` (`2` vs `3` pasadas finas de estiramiento por subpaso, con y sin *Strain Guard* selectivo al `4.5%` en `2` iteraciones)  
**Proxy de colisión:** `ALT_C_SDF_GRID_3D` ([`torsoCollisionSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/collision/torsoCollisionSolvers.ts), grid `43 × 121 × 38 = 197,714` voxeles a `12 mm`, `initMs = 1281.5917 ms`, `790,856 B`, `thickness = 2.0 mm`, `μ = 0.35`) auditado frame a frame contra Ground Truth BVH (`96 × 108` triángulos del torso canónico)  
**Clasificación de evidencia:** `TIER_3_ESTIMATED` (arquetipos textiles sintéticos heredados de T4/T4.1; sin ensayos de laboratorio KES/FAST y **sin declarar Gate 1 aprobado**)

---

## 1. Alcance y Arquitectura Implementada en T5

Todo el desarrollo de T5 se mantuvo estrictamente aislado dentro de `poc-simulador-3d/`, reutilizando `T41ExperimentalXpbdSolver`, `ALT_C_SDF_GRID_3D`, `evaluateTorsoSurfacePoint`, `generateCanonicalTorsoMesh` y el harness de T1–T4.1:

- **Generador de patrón y prenda ensamblada:** [`twoPanelBodiceGenerator.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/garment/twoPanelBodiceGenerator.ts) (`generateTwoPanelBodiceGarment`, `measureTwoPanelGarmentMetrics`).
- **Suite experimental y runner T5:** [`t5FirstGarmentBenchmark.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/t5FirstGarmentBenchmark.ts) y [`run_t5_benchmark.cjs`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/run_t5_benchmark.cjs).
- **Visualizador Three.js y capturas multiángulo:** [`t5_garment_viewer.html`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/viewer/t5_garment_viewer.html) y [`render_t5_captures.cjs`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/render_t5_captures.cjs).
- **Resultados y capturas:** [`t5_summary_report.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/t5_summary_report.json), `t5_keyframe_meshes.json`, `20` lotes `telemetry_*.json` (`300` frames = `5.0 s` por corrida) y `5` capturas PNG en [`results/t5/captures/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/captures/).

---

## 2. Diseño Geométrico de la Prenda (Top / Corpiño de 2 Paneles)

### 2.1 Patrón 2D y Topología de Malla

| Parámetro Geométrico | Valor Verificado | Significado / Función |
| :--- | :--- | :--- |
| Matriz base por panel | `25 × 25` nodos (`strapColCount = 6`, `underarmRow = 11`) | Resolución homogénea en tirantes y torso sin saltos bruscos |
| Vértices totales | `1,165` (`569` delantero + `596` posterior) | Vértices recortados en aberturas de escote y sisas |
| Triángulos totales | `2,132` (`1,038` delantero + `1,094` posterior) | Orientación normal verificada hacia el exterior |
| Aristas internas de paneles | `3,295` (`warp`, `weft` y `shear`) | Clasificadas topológicamente en el plano 2D del patrón |
| Costuras explícitas XPBD | `40` pares (`6` hombro izq + `6` hombro der + `14` costado izq + `14` costado der) | Restricciones de estiramiento directo (`seamRestGapM = 3.0 mm`, ancho tributario `24.0 mm`) |
| Bisagras de flexión diédrica | `3,101` (`panel + costuras`) | Incluye continuidad diédrica cruzada entre paneles en las líneas de costura |
| Sujeciones distribuidas | `16` vértices interiores en cresta de hombro | Evitan deslizamiento lateral rígido sin anclar esquinas ni bordes de escote/sisa |
| Holguras 3D del patrón | `shoulderClearanceM = 6.5 mm`, `bustEaseM = 15.0 mm`, `waistEaseM = 44.0 mm` | `bustEaseGirthRatio = 1.235` sobre el contorno canónico |
| Auditoría inicial GT BVH (`t = 0.00 s`) | `0 / 1,165` penetrados (`> 0 mm`), `0` severos (`> 3 mm`) | Distancia mínima inicial al torso `= +5.4985 mm` |
| Estiramiento inicial de montaje | Media `1.795%`, máximo local `13.217%` | Curvatura 3D residual frente al patrón plano PBD-2D |

### 2.2 Escote, Sisas, Costuras y Sujeciones Distribuidas

1. **Abertura de escote:** Corte parabólico suave (`frontNeckCenterRow = 6` en delantero U profundo y `backNeckCenterRow = 3` en posterior tipo barco) que separa los dos tirantes izquierdo/derecho hasta `col = 5` y `col = 19`.
2. **Abertura de sisas:** Desde `row = 0` hasta `underarmRow = 11`, la columna lateral sigue una transición suave que abre el hueco de la sisa por encima de `underarmYM = 0.56 m`, dejando libre el paso del brazo.
3. **Costuras explícitas XPBD:** Se definen `40` aristas de costura entre bordes homólogos de delantero y posterior: `LEFT_SHOULDER` (`6`), `RIGHT_SHOULDER` (`6`), `LEFT_SIDE` (`14`, de `underarmRow` al bajo `hemYM = 0.24 m`) y `RIGHT_SIDE` (`14`). Cada par se inicializa separado simétricamente `±1.5 mm` respecto al ancla geométrica del torso (`L0 = 3.00 mm`) con ancho tributario `24 mm`, evitando choques iniciales (`0.00%` en `t = 0`).
4. **Sujeciones distribuidas:** En cada cresta de hombro (`2` por lado × delantero/posterior = `4` bandas) se fijan los `4` vértices interiores del tirante (`total = 16` pines), dejando libres las esquinas de costura (`col = 0, 5, 19, 24`) y todos los bordes de escote y sisas para permitir deformación real de la costura y caída anatómica libre.

---

## 3. Comparativa Experimental (`N_fine = 2` vs `3` y *Strain Guard* `4.5%`)

Los `4` candidatos corrieron sobre los `5` perfiles sintéticos `TIER_3_ESTIMATED` (`20` corridas × `300` frames = `5.0 s`, `12` subpasos/frame a `60 Hz`), ejecutándose en `120.34 s` totales. Los umbrales estrictos de Gate 1 se mantuvieron intactos (`panelMean <= 2.0%`, `panelPeak <= 5.0%`, `combinedMean <= 2.0%`, `combinedPeak <= 5.0%`, `gtEqSevereFrames (>3mm) = 0`, `totalStepMean <= 16.0 ms`, `totalStepP95 <= 25.0 ms`, `collisionMean <= 6.0 ms`, `seamGap <= 5.0 mm`).

### 3.1 Scorecard Resumen por Variante

| Variante | Strict PASS | Panel Max Peor (%) | Comb Max Peor (%) | Gap Costura Max (mm) | CPU Mean Global / Peor (ms) | CPU P95 Peor (ms) | Colisión Mean (ms) | GT Eq Frames `>3 mm` | Dif. Textil / Asimetría |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `EXP2_NFINE2_NOGUARD` | `0 / 5` | `22.0361` | `257.5747` | `10.727` | `11.1584` / `14.1565` | `28.1264` | `1.0825` | `0` | `true` / `true` |
| `EXP2_NFINE3_NOGUARD` | `0 / 5` | `16.1778` | `16.1778` | `3.006` | `11.3188` / `12.3266` | `18.1645` | `0.9141` | `0` | `true` / `true` |
| `EXP2_NFINE2_SG45` | `0 / 5` | `13.8388` | `33.4311` | `4.003` | `10.7674` / `12.0698` | `21.6153` | `0.9740` | `0` | `true` / `true` |
| **`EXP2_NFINE3_SG45`** | `0 / 5` | **`9.1081`** | `26.7709` | `3.803` | `12.9431` / `13.9838` | `22.0759` | `1.0389` | **`0`** | **`true` / `true`** |

### 3.2 Resultados Detallados por Arquetipo Textil (`TIER_3_ESTIMATED`)

#### `EXP2_NFINE3_SG45` (Candidato Recomendado)

| Arquetipo (`TIER_3_ESTIMATED`) | Panel Eq Mean / Max (%) | Panel Pico Trans. (%) | Comb Pico (%) | Costura Eq Max / Pico (mm) | GT Eq Max / Pico (mm) | Final rmsVel (m/s) | Sub-busto Gap (mm) | CPU Mean / P95 (ms) | Col Mean (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ARCH1_FLUID_LIGHT` (`55 gsm, B=2.5`) | `0.3870 / 6.1677` | `8.6809` | `21.2411` | `3.007 / 3.637` | `0.4666 / 1.1732` | `0.0036` | `48.896` | `11.3070 / 14.4982` | `0.9338` |
| `ARCH2_MEDIUM_BALANCED` (`160 gsm, B=20`) | `0.4282 / 6.1903` | `9.1081` | `22.1498` | `3.002 / 3.664` | `0.5172 / 1.1603` | `0.0035` | `52.039` | `13.7888 / 22.0759` | `1.1263` |
| `ARCH3_STRUCTURED_STIFF` (`310 gsm, B=180`) | `0.4902 / 6.0334` | `8.1111` | `26.7709` | `3.006 / 3.803` | `0.7140 / 1.1051` | `0.0024` | `52.901` | `12.4113 / 17.0256` | `0.9455` |
| `ARCH4_ASYM_FACE_UP_STIFF` (`B+=180, B-=6`) | `0.5039 / 6.1120` | `8.0346` | `22.8088` | `3.062 / 3.684` | `0.7918 / 1.1948` | `0.0030` | `53.205` | `13.2247 / 17.9152` | `1.0392` |
| `ARCH4_ASYM_FACE_DOWN_STIFF` (`B+=6, B-=180`) | `0.4374 / 6.1406` | `8.4541` | `24.3683` | `3.002 / 3.731` | `0.6084 / 1.0675` | `0.0035` | `52.232` | `13.9838 / 21.5939` | `1.1496` |

#### `EXP2_NFINE3_NOGUARD` (Alternativa Sin Strain Guard — Mejor Estabilidad Estática y Cierre de Costura)

| Arquetipo (`TIER_3_ESTIMATED`) | Panel Eq Mean / Max (%) | Panel Pico Trans. (%) | Comb Pico (%) | Costura Eq Max / Pico (mm) | GT Eq Max / Pico (mm) | Final rmsVel (m/s) | Sub-busto Gap (mm) | CPU Mean / P95 (ms) | Col Mean (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ARCH1_FLUID_LIGHT` | `0.3870 / 10.1682` | `16.1778` | `16.1778` | `3.001 / 3.003` | `0.5205 / 1.0837` | `0.0003` | `48.904` | `11.6939 / 16.5088` | `0.9509` |
| `ARCH2_MEDIUM_BALANCED` | `0.4343 / 10.1367` | `16.0790` | `16.0790` | `3.002 / 3.005` | `0.5602 / 1.1734` | `0.0004` | `52.178` | `12.3266 / 18.1645` | `1.0735` |
| `ARCH3_STRUCTURED_STIFF` | `0.4929 / 9.6310` | `15.3130` | `15.3130` | `3.003 / 3.006` | `0.7439 / 1.1997` | `0.0001` | `52.977` | `10.8274 / 13.5563` | `0.8477` |
| `ARCH4_ASYM_FACE_UP_STIFF` | `0.5072 / 9.8630` | `14.1895` | `14.1895` | `3.003 / 3.006` | `0.8089 / 1.2290` | `0.0009` | `53.296` | `10.8095 / 14.5907` | `0.7942` |
| `ARCH4_ASYM_FACE_DOWN_STIFF` | `0.4399 / 9.8824` | `15.1564` | `15.1564` | `3.002 / 3.006` | `0.6562 / 1.1580` | `0.0016` | `52.290` | `10.9365 / 14.8134` | `0.9043` |

### 3.3 Hallazgos Técnicos Clave de la Comparativa

1. **`N_fine = 2` vs `N_fine = 3` en costuras XPBD:** Con `N_fine = 2` sin guardia (`EXP2_NFINE2_NOGUARD`), las aristas de costura (`L0 = 3.00 mm`, rigidez muy superior a la de panel por su corta longitud de reposo) sufren apertura transitoria severa (`9.077–10.727 mm`, hasta `257.57%` de deformación relativa en costura) y pico de CPU `P95 = 28.1264 ms > 25 ms`. Subir a `N_fine = 3` resuelve completamente la convergencia de costura: en `EXP2_NFINE3_NOGUARD`, la costura permanece sellada en **`3.001–3.006 mm`** durante todos los `300` frames (`combPeak = panelPeak`, `0%` discrepancia costura/panel), con `finalRmsVel = 0.0001–0.0016 m/s` y `E_kin = 0.0000 J`.
2. **Efecto del *Strain Guard* `4.5%` (2 iteraciones):** Reduce casi a la mitad los picos locales y de equilibrio en los paneles (`16.18% -> 9.11%` en pico transitorio; `10.17% -> 6.19%` en equilibrio) con una sobrecarga media moderada de **`0.46–0.59 ms/frame`**, manteniendo todos los runs dentro del presupuesto de cómputo (`worst mean = 13.9838 ms <= 16.0 ms`, `worst P95 = 22.0759 ms <= 25.0 ms`). Como efecto colateral documentado, proyectar indiscriminadamente aristas de `3.00 mm` de costura junto con aristas de panel introduce micro-perturbación transitoria de costura (`3.637–3.803 mm`) y una velocidad residual ligera en `SG45` (`0.0134–0.0143 m/s` en `N_fine=2`, mitigada a `0.0024–0.0036 m/s` en `N_fine=3`). Aplicar el *Strain Guard* exclusivamente a aristas de panel (excluyendo costuras de `3 mm`) es la mejora directa recomendada para T6.
3. **Colisión SDF `ALT_C_SDF_GRID_3D` y auditoría Ground Truth BVH:** Todas las `20` corridas obtuvieron **`gtEqSevereFrames (> 3.0 mm) = 0`** y `initialPenetratedCountGt0 = 0` (`+5.4985 mm`). En `EXP2_NFINE3_SG45`, la penetración máxima en equilibrio frente a la malla BVH exacta osciló entre **`0.4666 mm`** (`ARCH1`) y **`0.7918 mm`** (`ARCH4_FACE_UP`), con `0` vértices `> 3 mm` y costo de colisión de `0.93–1.15 ms/frame` (`<< 6.0 ms`).
4. **Diferenciación textil y asimetría `FACE_UP / FACE_DOWN`:** Todas las variantes pasan ambos criterios sin colapso: en `EXP2_NFINE3_SG45`, la holgura sub-busto crece monotónicamente con la rigidez (`48.896 < 52.039 < 52.901 mm`) mientras el ángulo diédrico medio decrece monotónicamente (`4.968° > 4.015° > 3.235°`), y la caída en escote delantero distingue claramente la suavidad del tejido (`8.384 mm` fluido vs `4.759 mm` medio vs `2.642 mm` estructurado). Entre `FACE_UP` y `FACE_DOWN`, la energía de flexión final difiere **`3.63×`** (`0.0058 J` vs `0.0016 J`) con diferencia en separación sub-busto (`53.205` vs `52.232 mm`) y caída de escote (`2.391` vs `4.967 mm`).

---

## 4. Verificación Visual Multiángulo (Three.js + WebGL)

Capturas generadas automáticamente tras los ajustes finales desde [`t5_garment_viewer.html`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/viewer/t5_garment_viewer.html):

1. [`01_t5_bodice_views4_initial_t0.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/captures/01_t5_bodice_views4_initial_t0.png) — 4 vistas en `t = 0.00 s` (`frontal, 35°, lateral 90°, posterior`): ajuste limpio sin penetraciones (`minSignedDistance = +5.4985 mm`), escote delantero U, escote posterior barco, sisas libres y costura lateral alineada a `3.00 mm`.
2. [`02_t5_bodice_views4_medium_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/captures/02_t5_bodice_views4_medium_5s.png) — 4 vistas en equilibrio (`t = 5.00 s`, `ARCH2_MEDIUM_BALANCED`, `EXP2_NFINE3_SG45`): caída del bajo `11.9 mm`, abertura natural de sisa y contorno sub-busto separado.
3. [`03_t5_bodice_compare3_textiles_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/captures/03_t5_bodice_compare3_textiles_5s.png) — Comparativa paralela `Fluido Ligero (55 gsm)` vs `Medio (160 gsm)` vs `Estructurado (310 gsm)` a `t = 5.00 s`: progresión visual clara de caída de escote y volumen sub-busto (`48.90 < 52.04 < 52.90 mm`).
4. [`04_t5_bodice_side_armhole_closeup.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/captures/04_t5_bodice_side_armhole_closeup.png) — Primer plano lateral de sisa, hombro y costura lateral (`ARCH3_STRUCTURED_STIFF`): cierre uniforme de costura lateral a `3.00 mm` desde la axila hasta el bajo y separación ovalada superior correspondiente al hueco de sisa.
5. [`05_t5_bodice_asym_face_up_vs_down.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5/captures/05_t5_bodice_asym_face_up_vs_down.png) — Contraste asimétrico `FACE_UP (B+=180, B-=6 µN·m)` vs `FACE_DOWN (B+=6, B-=180 µN·m)` a `t = 5.00 s`.

**Observación honesta de inspección visual en `02`, `03` y `05`:** aunque no existen penetraciones severas (`max GT = 0.47–0.79 mm << 3.0 mm`), en las vistas de equilibrio (`t = 5.00 s`) se observa:
- Un ligero afloramiento rasante en la esquina interior del hombro/clavícula donde convergen los vértices de tirante no fijados más próximos al cuello.
- Contorno escalonado (*stair-stepping*) visible en los bordes de escote delantero y posterior debido a la discretización entera por fila/columna de una rejilla `25 × 25` (`~2 cm/celda`) sin recorte poligonal suave.

---

## 5. Limitaciones Anatómicas, Físicas y Estado frente a Gate 1

1. **Veredicto estricto de Gate 1: `FAIL` (`0 / 5` strict PASS) — Gate 1 NO aprobado.** Las elongaciones máximas locales en paneles (`6.03%–6.19%` en equilibrio; `8.03%–9.11%` transitorio bajo `EXP2_NFINE3_SG45`) siguen superando el techo estricto del `5.0%` en la transición curva del tirante superior / hombro bajo los `16` anclajes distribuidos, por lo que no se relajan los umbrales ni se declara Gate 1 aprobado.
2. **Discretización del escote en malla estructurada `25 × 25`:** Genera bordes en escalera en escotes curvos y pequeños triángulos rasantes junto al vértice interior del hombro; una malla triangular conformada al patrón 2D (*Delaunay / contour-aligned*) resolvería simultáneamente el borde curvo y el contacto suave en clavícula.
3. **Sujeciones distribuidas en hombro (`16` nodos):** Modelan el apoyo/fricción estática del tirante sobre el trapecio superior sin requerir malla sub-milimétrica ni `μ > 1`, pero concentran carga gravitatoria del corpiño en las filas superiores del tirante.
4. **Cobertura de prenda:** Prenda única sin mangas (`corpiño 2 paneles`); mangas montadas, pinzas de busto cosidas y capas múltiples superpuestas permanecen fuera del alcance de T5.
5. **Propiedades textiles `TIER_3_ESTIMATED`:** Todos los parámetros (`55 / 160 / 310 gsm` y asimétricos) siguen siendo estimaciones sintéticas sin calibración de laboratorio KES/FAST.

---

## 6. Recomendación Técnica y Próximo Paso (Pendiente de Autorización para T6)

- **Configuración recomendada para continuar hacia T6:** **`EXP2_NFINE3_SG45`** (`EXP2_RAYLEIGH_BEND_FIRST`, `12` subpasos, `N_fine = 3`, `Strain Guard = 4.5%` en `2` iteraciones + `ALT_C_SDF_GRID_3D` `μ = 0.35`), manteniendo las optimizaciones puntuales recomendadas antes de T6:
  1. Excluir las aristas de costura (`L0 = 3 mm`) del *Strain Guard* directo (manteniendo `N_fine = 3`, que por sí solo sella costuras a `3.001–3.006 mm` sin micro-vibración residual).
  2. Sustituir el recorte en escalera por triangulación adaptada al contorno del escote/sisa o malla conformal para eliminar la esquina interior rasante del tirante.
- **Estado del plan:** Ejecución detenida estrictamente al término de **T5**. No se ha iniciado T6 ni se ha modificado código de producción (`src/`, `M00–M07`, BD). Queda a la espera de revisión visual/métrica y autorización expresa para iniciar **T6**.

