# T5.1 — Intervención Correctiva Acotada (Exclusión/Re-sellado F1 de Costuras y Contorno Conformal F2)

**Estado:** COMPLETADO (aislado en `poc-simulador-3d/`, sin modificar `H1B_ORIGINAL`, `results/t2*`–`results/t5/`, producción, `M00–M07`, `package.json`, BD ni `src/components/mannequin3d/`)  
**Fecha:** 2026-11-15  
**Solver base evaluado:** `T41ExperimentalXpbdSolver` (`EXP2_RAYLEIGH_BEND_FIRST` + `Strain Guard 4.5%`, `12` subpasos/frame @ `60 Hz`, `fineStretchIterationsPerSubstep = 3`, `bendingIterationsPerSubstep = 1`, `τ_stretch = 0.6 ms`, `τ_bend = 1.5 ms`)  
**Colisión de referencia:** `ALT_C_SDF_GRID_3D` (`43×121×38 = 197,714` vóxeles, voxel `12 mm`, `thickness = 2.0 mm`, `μ = 0.35`, auditada contra Ground Truth BVH `96×108`)  
**Clasificación de evidencia:** `TIER_3_ESTIMATED` — Los `5` arquetipos textiles usados provienen de estimaciones sintéticas parametrizadas; **no son ensayos físicos de laboratorio**.  
**Decisión de Gate 1:** **NO APROBADO (`0/5` strict Gate 1; `0/5` todos los criterios correctivos T5.1 simultáneos)** — Se mantienen intactos los umbrales originales de Gate 1 sin relajación y no se inicia T6 sin autorización expresa.

---

## 1. Resumen Ejecutivo

T5.1 implementó y evaluó de manera aislada, reversible y parametrizable los dos ajustes identificados sobre el prototipo de dos paneles de T5:

1. **F1 — Exclusión y re-sellado de costuras (`40` aristas `L0 = 3.00 mm`):**
   - Excluir únicamente las `40` costuras del `Strain Guard 4.5%` **empeoró** el pico transitorio de costura (`3.803 mm → 4.735 mm` en `stepped`; `4.134 mm → 5.045 mm` en `conformal`, elevando `combinedPeak` hasta `68.16%`), porque las proyecciones posteriores del `Strain Guard` sobre aristas adyacentes del panel traccionan los vértices compartidos de la costura después de `solveFineStretchSoA`.
   - Añadir **2 iteraciones finales XPBD exclusivamente sobre las 40 aristas de costura excluidas** (`postGuardExcludedEdgeResealIterations = 2`, configuración `T51_F1_F2_RESEAL`) eliminó **100%** del pico espurio de costura: el gap máximo en equilibrio cayó a `3.003 mm` y el pico transitorio cayó de `5.045 mm` a **`3.008 mm`**, igualando `combinedPeakStretchPct === panelPeakStretchPct` (`10.9403%`) con un overhead mínimo de `+0.32 ms/frame` (`11.0558 ms → 11.3784 ms` promedio global).
2. **F2 — Triangulación conformal de escote y sisas (`contourMode: 'conformal'`):**
   - Eliminó el contorno escalonado en el escote frontal/posterior y en ambas sisas manteniendo `stepped` como valor predeterminado (`DEFAULT_TWO_PANEL_BODICE_SPEC.contourMode = 'stepped'`).
   - Redujo la penetración máxima BVH en equilibrio en **`9.1×`** (`0.7918 mm → 0.0866 mm`, `0` frames `> 3 mm`), mejoró el área mínima triangular (`71.606 mm² → 91.051 mm²`), el ángulo mínimo (`3.63° → 4.69°`), el pico de deformación en equilibrio del panel (`6.1903% → 5.9257%`) y redujo `finalRmsVelocityMS` (`0.0036 m/s → 0.0003–0.0017 m/s` en 4 de 5 perfiles y `0.0021 m/s` en `ARCH4_FACE_DOWN`).
   - Sin embargo, introdujo una arista más corta en el límite curvo del escote/tirante (`minPanelEdgeLenMm: 14.848 mm → 8.089 mm`) cuyo estiramiento pico transitorio en los frames `3–4` subió de `9.1081%` (`CONTROL`) a **`10.9403%`** (`T51_F1_F2_RESEAL`), manteniéndose por encima del umbral estricto de Gate 1 (`≤ 5.0%`) y del objetivo correctivo T5.1 (`≤ 9.11%`).

---

## 2. Implementación Técnica y Garantía de Reversibilidad

### 2.1 Cambios en Código (exclusivamente en `poc-simulador-3d/`)

| Componente | Archivo | Modificaciones T5.1 | Reversibilidad / Default |
| :--- | :--- | :--- | :--- |
| **F1 (Solver)** | [`t41ExperimentalSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/t41ExperimentalSolvers.ts) | Campos opcionales `strainGuardExcludedEdgeIndices?: ReadonlySet<number>` y `postGuardExcludedEdgeResealIterations?: number` en `T41ExperimentalConfig`; máscara `fineEdgeAllowStrainGuard` y lista `strainGuardExcludedEdges`; helper compartido `solveXpbdEdgesSlice` usado por `solveFineStretchSoA` y por el pase opcional de re-sellado post-guardia. | Sin esos campos opcionales (`undefined`/`0`), ejecuta exactamente el flujo T5/T4.1 original. `H1B_ORIGINAL` ([`hierarchicalXpbdSolver.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts)) no fue modificado. |
| **F2 (Generador)** | [`twoPanelBodiceGenerator.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/garment/twoPanelBodiceGenerator.ts) | `contourMode?: 'stepped' \| 'conformal'` y `armholeScoopMaxCols?: number` (`1.15`); funciones continuas `evaluateNecklineRowFloat`, `evaluateArmholeColInsetFloat`, `evaluateContinuousWrappedPoint`; algoritmo conformal watertight `buildConformalPanelGeometry` (*Marching-Quads* con `snapEps = 0.28`, cortes acotados a `[0.24, 0.76]` y triangulación de pentágonos por área mínima máxima); aplanado 2D `flattenConformalPattern2d`; clasificación direccional `'warp' \| 'weft' \| 'shear'` por ángulo tangente; y `inspectGarmentMeshQuality`. | `DEFAULT_TWO_PANEL_BODICE_SPEC.contourMode` permanece `'stepped'`. Invocar el generador con `{ contourMode: 'stepped' }` o sin opciones produce la topología escalonada T5 idéntica (`569 + 596` vértices). |
| **Benchmark & Capturas** | [`t51CorrectiveBenchmark.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/t51CorrectiveBenchmark.ts), [`run_t5_1_benchmark.cjs`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/run_t5_1_benchmark.cjs), [`t5_1_garment_viewer.html`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/viewer/t5_1_garment_viewer.html), [`render_t5_1_captures.cjs`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/render_t5_1_captures.cjs) | Matriz `5 × 5 = 25` corridas a `5.0 s` (`300` frames @ `60 Hz`) guardadas en `poc-simulador-3d/results/t5_1/` sin sobrescribir `results/t5/`. | Completamente aislado en scripts dedicados T5.1. |

---

## 3. Comparación Geométrica y Calidad de Malla (`stepped` vs `conformal`)

Medición directa sobre el torso canónico (auditada contra BVH `96 × 108`):

| Métrica Geométrica Inicial (`t = 0.00 s`) | `stepped` (Control T5) | `conformal` (F2 T5.1) | Cambio / Impacto |
| :--- | :---: | :---: | :--- |
| Vértices panel delantero / trasero | `569` / `596` (`1,165`) | `559` / `586` (`1,145`) | `-20` vértices totales (`-1.7%`) |
| Triángulos panel delantero / trasero | `1,038` / `1,094` (`2,132`) | `1,018` / `1,074` (`2,092`) | `-40` triángulos |
| Aristas internas de panel (`warp / weft / shear`) | `3,295` (`1,115 / 1,106 / 1,074`) | `3,235` (`1,073 / 1,078 / 1,084`) | Balance direccional conservado |
| Aristas de costura (`L0 = 3.00 mm`) / Sujeciones hombro | `40` / `16` | `40` / `16` | Topología de costuras y pines intacta |
| Bisagras diédricas | `3,101` | `3,041` | `-60` bisagras |
| Estiramiento inicial máx. / medio (`t = 0.00 s`) | `13.217%` / `1.795%` | `12.668%` / `1.683%` | Mejor conformación inicial (`-0.549%` máx.) |
| Ratio de holgura de busto (`bustEaseGirthRatio`) | `1.235` | `1.239` | Holgura equivalente |
| Arista mínima / máxima de panel | `14.848 mm` / `81.282 mm` | `8.089 mm` / `79.749 mm` | Borde conformal introduce arista corta (`8.09 mm`) en curva |
| Área mínima de triángulo / Triángulos degenerados | `71.606 mm²` / `0` | `91.051 mm²` / `0` | **`+27.2%`** en área mínima; `0` degenerados |
| Ángulo mínimo interior | `3.63°` | `4.69°` | **`+1.06°`** mejor condicionamiento |
| Auditoría GT BVH inicial (`>0 mm` / `>3 mm` / `minSd`) | `0` / `0` / `5.4985 mm` | `0` / `0` / `5.4985 mm` | Holgura inicial segura idéntica |

---

## 4. Comparación de las 5 Configuraciones (5 arquetipos × 5 configs = 25 corridas)

Proxy `ALT_C_SDF_GRID_3D`: `initMs = 1677.96 ms`, memoria `790,856 bytes`.

| Config ID | Contorno | SG excluye costuras | Re-sellado post-SG | Peor Panel Eq / Pico (%) | Peor Comb. Pico (%) | Peor Costura Eq / Pico (mm) | Peor `finalRmsVel` (m/s) | CPU Global Mean / Peor / P95 (ms) | SDF Mean (ms) | GT Eq Frames `>3mm` / Max Eq (mm) | Gate 1 Estricto | Checks T5.1 (`0–5`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`T51_CONTROL`** | `stepped` | No | `0` | `6.1903` / **`9.1081`** | `26.7709` | `3.062` / `3.803` | `0.0036` | `11.6900` / `12.6539` / `17.6712` | `0.8895` | `0` / `0.7918` | `0/5` | `0/5` |
| **`T51_F1_EX_SEAMS`** | `stepped` | Sí (`40`) | `0` | `6.1909` / `9.1072` | `57.8389` | `3.062` / `4.735` | `0.0036` | `11.2157` / `11.6085` / `16.0653` | `0.8231` | `0` / `0.7919` | `0/5` | `0/5` |
| **`T51_F2_CONFORMAL`** | `conformal` | No | `0` | `5.9258` / `10.9937` | `37.7952` | `3.023` / `4.134` | **`0.0017`** | `11.0797` / `11.4204` / `15.5620` | `0.7989` | `0` / **`0.0865`** | `0/5` | `0/5` |
| **`T51_F1_F2_COMBINED`** | `conformal` | Sí (`40`) | `0` | **`5.9251`** / `10.6715` | `68.1578` | `3.023` / `5.045` | **`0.0017`** | **`11.0558`** / **`11.3778`** / `15.5795` | `0.8085` | `0` / **`0.0865`** | `0/5` | `0/5` |
| **`T51_F1_F2_RESEAL`** | `conformal` | Sí (`40`) | `2 iters` | `5.9257` / `10.9403` | **`10.9403`** | **`3.003`** / **`3.008`** | `0.0021` | `11.3784` / `11.7186` / `16.2003` | `0.8245` | `0` / `0.0866` | `0/5` | `0/5` |

> [!IMPORTANT]
> **Diagnóstico clave de F1:** Excluir las `40` costuras del `Strain Guard` sin re-sellado final (`T51_F1_EX_SEAMS`, `T51_F1_F2_COMBINED`) empeora el estiramiento transitorio de costura porque el propio `Strain Guard` proyecta las aristas largas vecinas de cada panel al `4.5%` después de `solveFineStretchSoA`, separando los extremos de la costura. Agregar `2` iteraciones XPBD exclusivamente sobre esas `40` costuras tras el `Strain Guard` (`T51_F1_F2_RESEAL`) corrige por completo el desfase: el gap transitorio cae de `5.045 mm` a **`3.008 mm`** (`0.008 mm` sobre `L0 = 3.000 mm`) y el pico combinado queda acotado al del panel (`10.9403%`).

---

## 5. Detalle por Arquetipo (`T51_F1_F2_RESEAL` vs `T51_CONTROL`)

### 5.1 Resultados por arquetipo en `T51_F1_F2_RESEAL` (TIER_3_ESTIMATED)

| Arquetipo (`TIER_3_ESTIMATED`) | Panel Eq Mean / Max (%) | Panel Pico / Comb. Pico (%) | Frame Pico | Costura Eq Max / Pico (mm) | Sub-Busto Air Gap (mm) | Caída Bajo / Escote (mm) | `finalRmsVel` (m/s) | Diédrico Abs (°) / `E_bend` (J) | GT Max All / Eq (mm) | CPU Mean / P95 (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `ARCH1_FLUID_LIGHT` | `0.3813` / `5.8106` | `10.1975` / `10.1975` | `f4` | `3.001` / `3.003` | `49.061` | `11.8` / `6.983` | `0.0004` | `4.6036` / `0.0003` | `1.1146` / `0.0000` | `11.7184` / `15.8846` |
| `ARCH2_MEDIUM_BALANCED` | `0.4210` / `5.8728` | `10.4356` / `10.4356` | `f4` | `3.002` / `3.006` | `52.694` | `12.0` / `3.446` | `0.0013` | `3.7678` / `0.0012` | `1.1213` / `0.0000` | `10.8822` / `13.7585` |
| `ARCH3_STRUCTURED_STIFF` | `0.4712` / `5.8336` | `10.3179` / `10.3179` | `f4` | `3.003` / `3.007` | `53.463` | `11.9` / `1.604` | `0.0017` | `3.1759` / `0.0070` | `0.9599` / `0.0480` | `11.7186` / `15.7822` |
| `ARCH4_ASYM_FACE_UP_STIFF` | `0.4831` / `5.9251` | `10.9403` / `10.9403` | `f4` | `3.003` / `3.008` | `53.458` | `12.3` / `1.384` | `0.0003` | `3.3971` / `0.0056` | `1.0429` / `0.0866` | `11.0486` / `14.0183` |
| `ARCH4_ASYM_FACE_DOWN_STIFF` | `0.4266` / `5.9257` | `9.8323` / `9.8323` | `f3` | `3.002` / `3.006` | `52.460` | `11.9` / `3.700` | `0.0021` | `3.5450` / `0.0015` | `0.9244` / `0.0000` | `11.5240` / `16.2003` |

- **Diferenciación textil (`textileDifferentiationPass = true`):** Progresión monótona clara desde fluido hasta estructurado tanto en separación sub-busto (`49.061 → 52.694 → 53.463 mm`), caída del escote (`6.983 → 3.446 → 1.604 mm`) como en ángulo diédrico medio (`4.6036° → 3.7678° → 3.1759°`) y energía de flexión (`0.0003 → 0.0012 → 0.0070 J`).
- **Respuesta asimétrica `FACE_UP / FACE_DOWN` (`asymmetryContrastPass = true`):** En `T51_F1_F2_RESEAL`, `FACE_UP` preserva más resistencia a flexión hacia el cuerpo (`E_bend = 0.0056 J`, escote cae `1.384 mm`, sub-busto `53.458 mm`) frente a `FACE_DOWN` (`E_bend = 0.0015 J`, escote cae `3.700 mm`, sub-busto `52.460 mm`).

### 5.2 Comparación directa contra `T51_CONTROL` (`stepped` sin F1/F2)

| Arquetipo | Costura Pico: Control → Reseal | Comb. Pico: Control → Reseal | Panel Pico: Control → Reseal | GT Eq Max: Control → Reseal | `finalRmsVel`: Control → Reseal |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `ARCH1_FLUID_LIGHT` | `3.637 → 3.003 mm` | `21.24% → 10.20%` | `8.68% → 10.20%` | `0.4666 → 0.0000 mm` | `0.0036 → 0.0004 m/s` |
| `ARCH2_MEDIUM_BALANCED` | `3.664 → 3.006 mm` | `22.15% → 10.44%` | `9.11% → 10.44%` | `0.5172 → 0.0000 mm` | `0.0035 → 0.0013 m/s` |
| `ARCH3_STRUCTURED_STIFF` | `3.803 → 3.007 mm` | `26.77% → 10.32%` | `8.11% → 10.32%` | `0.7140 → 0.0480 mm` | `0.0024 → 0.0017 m/s` |
| `ARCH4_ASYM_FACE_UP_STIFF` | `3.684 → 3.008 mm` | `22.81% → 10.94%` | `8.03% → 10.94%` | `0.7918 → 0.0866 mm` | `0.0030 → 0.0003 m/s` |
| `ARCH4_ASYM_FACE_DOWN_STIFF` | `3.731 → 3.006 mm` | `24.37% → 9.83%` | `8.45% → 9.83%` | `0.6084 → 0.0000 mm` | `0.0035 → 0.0021 m/s` |

---

## 6. Inspección Visual (6 Capturas WebGL en `results/t5_1/captures/`)

Todas las capturas fueron generadas mediante Chromium/Playwright sobre [`t5_1_garment_viewer.html`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/viewer/t5_1_garment_viewer.html) leyendo [`t51_keyframe_meshes.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/t51_keyframe_meshes.json):

1. [`01_t51_compare4_configs_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/captures/01_t51_compare4_configs_5s.png): Vista comparativa a `t = 5.00 s` (`ARCH2_MEDIUM_BALANCED`). Muestra la transición visual desde el escote dentado (`Control Stepped` y `F1 Aislada`) hacia el arco continuo y limpio (`F2 Aislada` y `Ganadora T51_F1_F2_RESEAL`), reduciendo `Costura Eq/Pk` a `3.00 / 3.01 mm` y `GT eq max` a `0.00 mm`.
2. [`02_t51_neck_clavicle_closeup_stepped_vs_conformal.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/captures/02_t51_neck_clavicle_closeup_stepped_vs_conformal.png): Primer plano escote/clavícula. En el lado izquierdo (`stepped`) destacan escalones marcados en el borde inferior del escote y micro-penetraciones frontales en pecho/esternón (`GT max eq: 0.52 mm`); en el lado derecho (`conformal`) la línea de escote queda continua (`GT max eq: 0.00 mm` en `ARCH2`), con pequeñas marcas visuales de proximidad superficial junto a las clavículas sin perforación sostenida (`0.00 mm` en BVH).
3. [`03_t51_views4_initial_conformal_t0.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/captures/03_t51_views4_initial_conformal_t0.png): Cuatro vistas (`t = 0.00 s`) de `T51_F1_F2_RESEAL` confirmando contorno curvo tanto en escote delantero, sisa ovalada lateral, unión de costura lateral y escote barco posterior, sin penetración inicial (`minSd = 5.4985 mm`).
4. [`04_t51_views4_equilibrium_conformal_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/captures/04_t51_views4_equilibrium_conformal_5s.png): Cuatro vistas (`t = 5.00 s`) confirmando caída estable, costuras selladas (`3.00 / 3.01 mm`), sujeciones de hombros íntegras y ausencia de desgarros en sisas.
5. [`05_t51_compare3_textiles_conformal_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/captures/05_t51_compare3_textiles_conformal_5s.png): Comparativa de `Fluido Ligero (55 gsm)`, `Medio Balanceado (160 gsm)` y `Estructurado Rígido (310 gsm)`, verificando diferenciación progresiva de caída y rigidez.
6. [`06_t51_asym_face_up_vs_down_conformal.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_1/captures/06_t51_asym_face_up_vs_down_conformal.png): Contraste asimétrico `FACE_UP` vs `FACE_DOWN`, evidenciando menor caída de escote y mayor energía diédrica en `FACE_UP` (`0.00560 J`) frente a `FACE_DOWN` (`0.00150 J`).

---

## 7. Evaluación Explícita de Criterios: qué PASA y qué NO PASA

### 7.1 Criterios Correctivos T5.1 sobre `T51_F1_F2_RESEAL`

| Criterio Correctivo T5.1 | Umbral | Resultado Observado (`T51_F1_F2_RESEAL`) | Estado |
| :--- | :---: | :---: | :---: |
| Costura equilibrio máx. (`seamEqMaxLe305Mm`) | `≤ 3.05 mm` | `3.001–3.003 mm` | **PASS (`5/5`)** |
| Costura pico transitorio (`seamPeakLe320Mm`) | `≤ 3.20 mm` | `3.003–3.008 mm` | **PASS (`5/5`)** |
| Cero penetración GT sostenida `> 3 mm` (`zeroSustainedGtOver3mm`) | `0 frames` | `0 frames` (`max eq = 0.0866 mm`) | **PASS (`5/5`)** |
| Presupuesto CPU (`cpuMeanLe16msAndP95Le25ms`) | Mean `≤ 16 ms`, P95 `≤ 25 ms` | Mean `10.88–11.72 ms`, P95 `13.76–16.20 ms` | **PASS (`5/5`)** |
| Reposo terminal (`finalRmsVelLe00020MS`) | `≤ 0.0020 m/s` | `0.0003–0.0017 m/s` en 4/5; `0.0021 m/s` en `ARCH4_FACE_DOWN` | **PASS (`4/5`) / FAIL (`1/5`)** |
| Pico combinado (`combinedPeakLe10Pct`) | `≤ 10.0%` | `9.8323%` en `ARCH4_FACE_DOWN`; `10.1975%–10.9403%` en 4/5 | **PASS (`1/5`) / FAIL (`4/5`)** |
| Paridad/mejora pico panel vs T5 (`panelPeakImprovedOrParityVs911Pct`) | `≤ 9.11%` | `9.8323%–10.9403%` | **FAIL (`0/5`)** |

### 7.2 Criterios Estrictos Gate 1 sobre `T51_F1_F2_RESEAL`

| Criterio Gate 1 (sin relajar) | Umbral | Resultado `T51_F1_F2_RESEAL` | Estado |
| :--- | :---: | :---: | :---: |
| Cero NaN (`zeroNan`) | `0` | `0` | **PASS (`5/5`)** |
| Cero penetración inicial (`zeroInitialPenetration`) | `0 vértices > 0 mm` | `0` (`minSd = 5.4985 mm`) | **PASS (`5/5`)** |
| Estiramiento medio equilibrio (`panelMeanStretchLe2Pct` & `combinedMeanStretchLe2Pct`) | `≤ 2.0%` | `0.3813%–0.4831%` | **PASS (`5/5`)** |
| Cero penetración severa sostenida `> 3 mm` (`zeroSustainedSeverePenetrationGt3mm`) | `0 frames` | `0 frames` | **PASS (`5/5`)** |
| Presupuesto CPU (`totalStepBudgetMeanLe16ms`, `totalStepBudgetP95Le25ms`, `collisionBudgetLe6ms`) | Mean `≤ 16 ms`, P95 `≤ 25 ms`, SDF `≤ 6 ms` | `11.72 ms` máx. / `16.20 ms` / `0.86 ms` máx. | **PASS (`5/5`)** |
| Costura cerrada en equilibrio (`seamGapTightLe5mm`) | `≤ 5.0 mm` | `3.001–3.003 mm` | **PASS (`5/5`)** |
| **Estiramiento pico panel y combinado (`panelPeakStretchLe5Pct`, `combinedPeakStretchLe5Pct`)** | **`≤ 5.0%` (transitorio y eq.)** | **Equilibrio `5.8106%–5.9257%`; transitorio `9.8323%–10.9403%`** | **FAIL (`0/5`)** |

---

## 8. Limitaciones, Riesgos y Próximo Paso Recomendado

1. **Pico transitorio y de equilibrio del panel (`10.94%` / `5.93%` vs `5.0%`):**
   - La malla conformal reduce la arista mínima de borde de `14.85 mm` a `8.09 mm` en la curva superior del escote/tirante. Bajo choque gravitacional instantáneo en los frames `3–4`, esa arista corta absorbe un estiramiento relativo ligeramente mayor (`+1.83%` respecto a `9.11%` en `CONTROL`), y en equilibrio la tensión cercana a los `16` pines de hombro estabiliza en `5.81%–5.93%` (donde `Strain Guard 4.5%` con `2` iteraciones converge asintóticamente pero no fuerza `< 5.0%` en vecindad de masa infinita).
2. **Proximidad clavicular en `ARCH4_FACE_UP_STIFF` y `ARCH3`:**
   - Aunque la penetración máxima en equilibrio se redujo `9.1×` (`0.7918 mm → 0.0866 mm`), en vistas muy cercanas se observan leves artefactos de proximidad clavicular sub-milimétricos (`< 0.09 mm`, muy lejos de `3.0 mm`).
3. **Resolución visual e integración:**
   - **No se declara Gate 1 aprobado (`0/5` strict Gate 1)** y **no se inicia T6**.
   - Antes de T6 o de ampliar prendas, si el cliente autoriza una micro-iteración o abordar el pico local `≤ 5.0%`, el foco exacto está acotado: suavizar los saltos de gravedad iniciales (rampa gravitacional en `0–150 ms` o pre-relajación de los `4–6` vértices adyacentes a pines de hombro) y evaluar el ajuste de longitud de reposo en las aristas cortas del escote conformal, **sin tocar F1 re-sellado ni F2 conformal** que resolvieron los dos defectos estructurales de T5.

