# T3 — Benchmark Comparativo de Colisión Corporal (A vs. B vs. C)

**Estado:** COMPLETADO (aislado en `poc-simulador-3d/`, sin modificar producción, M00–M07, BD ni `results/t2*`)  
**Fecha:** 2026-11-15  
**Solver de referencia:** `H1B_VCYCLE_12SUB` (`HierarchicalXpbdClothSolver`: 12 subpasos/frame a 60 Hz, SoA + pirámide `V-cycle [16,8,4,2]`, 3 iter grueso, 2 finas bidireccionales, 1 flexión diédrica con signo, colisión en fase `before-fine-solve`)  
**Geometría corporal canónica:** Torso paramétrico cerrado derivado de `DEFAULT_FEMALE_MEASUREMENTS` (`estatura=1680 mm`, `talle=430 mm`, `busto=920 mm`, `cintura=700 mm`, `cadera=980 mm`, `espalda=380 mm`, altura `y ∈ [-0.460, +0.888] m`) evaluado con Ground Truth independiente de 96×108 (`20,736` triángulos + BVH exacto fuera de medición)  
**Parámetros físicos y de contacto idénticos:** Tela `160 g/m²` (`0.160 kg/m²`), `k_warp/weft = 1200 N/m`, `k_shear = 250 N/m`, `B = 20 µN·m` (`SYMMETRIC`), amortiguamiento aéreo `1.8 s⁻¹`, espesor de contacto `2.0 mm` (`0.002 m`), fricción de Coulomb `μ = 0.35`, malla `32 × 32` (`1,024` vértices, `1,922` triángulos), `300` frames (`5.0 s`, equilibrio en `[3.5 s, 5.0 s]`).

---

## 1. Implementación Evaluada

1. **Alternativa A (`ALT_A_MESH_SPATIAL_HASH`)** — [`torsoCollisionSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/collision/torsoCollisionSolvers.ts):  
   Malla refinada del torso (`64 × 72` = `9,216` triángulos) indexada en un *Spatial Hash* 3D estático CSR (`20 × 59 × 18` celdas de `24 mm`, margen de búsqueda `7 mm`, filtrado AABB por triángulo y máscara de celdas interiores `< +1 mm` con fallback BVH).
2. **Alternativa B (`ALT_B_CAPSULES_ELLIPSOIDS`)** — [`torsoCollisionSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/collision/torsoCollisionSolvers.ts):  
   Jerarquía analítica de **10 primitivas** (`2` cápsulas: cuello y barra clavicular; `8` elipsoides: hombros izq/der, tórax superior, torso medio-busto, copas busto izq/der, cintura y pelvis-cadera) evaluadas por distancia euclídea / aproximación suave de Quílez y gradiente analítico exacto sin asignaciones de memoria en bucle.
3. **Alternativa C (`ALT_C_SDF_GRID_3D`)** — [`torsoCollisionSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/collision/torsoCollisionSolvers.ts):  
   Grid SDF 3D uniforme (`43 × 121 × 38 = 197,714` voxeles a paso de `12 mm`, precalculado desde la malla `64 × 72`) con descarte rápido por cota de 8 esquinas, interpolación trilineal y gradiente analítico continuo por voxel.

### Escenas reproducibles de prueba (`T3`)

- **`T3_SHOULDER_DROP` (Caída libre sin pines):** Paño `62 × 62 cm` (`32 × 32`) centrado sobre cuello y hombros a `y = 0.918 m` (`+30.7 mm` sobre cúpula cervical), soltado en caída libre durante `5.0 s` (`300` frames).
- **`T3_FRONT_BODICE_PANEL` (Panel frontal con 2 tirantes):** Panel `36 × 72 cm` (`32 × 32`) sujeto en dos tirantes superiores de hombro (`~3.5 cm` cada lado, `4` nodos por tirante), inclinado `+21°` (`sd_min(t=0) = +5.3 mm` fuera del torso) apoyándose progresivamente sobre clavícula, busto, sub-busto, cintura y cadera alta durante `5.0 s`.

---

## 2. Precisión Geométrica Estática vs. Torso Canónico (`96 × 108`)

| Alternativa | Tiempo init [ms] | Memoria [KB] | MAE [mm] | RMSE [mm] | Error Máximo [mm] |
| --- | ---: | ---: | ---: | ---: | ---: |
| **A · Malla `9,216` tris + Spatial Hash (`24 mm`)** | `219.98` | `1,647.4` | **`0.1844`** | **`0.3881`** | **`3.1817`** |
| **B · 10 Primitivas (Cápsulas + Elipsoides)** | **`0.01`** | **`0.6`** | `12.7937` | `17.6044` | `70.2408` |
| **C · Grid SDF 3D Uniforme (`12 mm`)** | `1,930.58` | `772.3` | `0.2969` | `0.5146` | `3.6333` |

---

## 3. Métricas Experimentales por Escena y Alternativa

Fuente exacta: [`t3_summary_report.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/t3_summary_report.json).

### 3.1 Escena `T3_SHOULDER_DROP` (Paño `62 × 62 cm`, `32 × 32`, 0 pines, `5.0 s`)

| Métrica | Umbral | Alt A (Malla+SH) | Alt B (10 Prim.) | Alt C (SDF 3D) |
| --- | --- | ---: | ---: | ---: |
| `collisionMs` media | `<= 6.00 ms` | `14.1755 ms` (FAIL) | `7.3938 ms` (FAIL) | **`1.4019 ms` (PASS)** |
| `collisionMs` p95 / max | — | `24.9250 / 69.2456` | `11.2305 / 33.8019` | `2.2752 / 4.0786` |
| `physicsStepMs` media | — | `13.7788 ms` | `14.7079 ms` | `13.9468 ms` |
| Total (`physics+collision`) media | `<= 16.00 ms` | `27.9543 ms` (FAIL) | `22.1017 ms` (FAIL) | **`15.3487 ms` (PASS)** |
| Total p95 | `<= 25.00 ms` | `44.7868 ms` (FAIL) | `33.9881 ms` (FAIL) | **`22.5242 ms` (PASS)** |
| Penetración real eq max (GT) | `<= 3.00 mm` | `2.0055 mm` (PASS) | `31.9539 mm` (FAIL) | **`2.3174 mm` (PASS)** |
| Frames eq con vértice `> 3 mm` (GT) | `0 / 90` | `0` (PASS) | `90 / 90` (FAIL) | **`0` (PASS)** |
| Penetración máx global (0–5 s, GT) | — | `2.0662 mm` | `34.8687 mm` | `2.3174 mm` |
| Penetración eq reportada por proxy | — | `0.2879 mm` | `0.0000 mm` *(falso 0)* | `0.0000 mm` |
| Elongación media equilibrio | `<= 2.00%` | `0.2976%` (PASS) | `0.3784%` (PASS) | `0.3524%` (PASS) |
| Elongación pico equilibrio | `<= 5.00%` | `10.1855%` (FAIL) | `9.3516%` (FAIL) | `10.4978%` (FAIL) |
| Elongación pico transitorio | `<= 5.00%` | `11.8851%` (FAIL) | `11.5023%` (FAIL) | `13.7819%` (FAIL) |
| Vértices `NaN` totales | `0` | `0` (PASS) | `0` (PASS) | `0` (PASS) |
| **Veredicto Integral Escena** | Todos PASS | **FAIL** | **FAIL** | **FAIL** *(solo por shear/compresión de tela sobre cúpula cervical)* |

### 3.2 Escena `T3_FRONT_BODICE_PANEL` (Panel `36 × 72 cm`, `32 × 32`, 2 tirantes, `5.0 s`)

| Métrica | Umbral | Alt A (Malla+SH) | Alt B (10 Prim.) | Alt C (SDF 3D) |
| --- | --- | ---: | ---: | ---: |
| `collisionMs` media | `<= 6.00 ms` | **`5.0158 ms` (PASS)** | `6.8864 ms` (FAIL) | **`0.9205 ms` (PASS)** |
| `collisionMs` p95 / max | — | `9.5187 / 20.7918` | `9.9227 / 83.7563` | `1.3386 / 14.5552` |
| `physicsStepMs` media | — | `15.2629 ms` | `14.3513 ms` | `13.6297 ms` |
| Total (`physics+collision`) media | `<= 16.00 ms` | `20.2787 ms` (FAIL) | `21.2377 ms` (FAIL) | **`14.5502 ms` (PASS)** |
| Total p95 | `<= 25.00 ms` | `31.2748 ms` (FAIL) | `33.8701 ms` (FAIL) | **`21.0092 ms` (PASS)** |
| Penetración real eq max (GT) | `<= 3.00 mm` | **`0.0000 mm` (PASS)** | `9.5164 mm` (FAIL) | **`0.0000 mm` (PASS)** |
| Frames eq con vértice `> 3 mm` (GT) | `0 / 90` | **`0` (PASS)** | `90 / 90` (FAIL) | **`0` (PASS)** |
| Penetración máx global (0–5 s, GT) | — | `0.0000 mm` | `15.6672 mm` | `0.0000 mm` |
| Penetración eq reportada por proxy | — | `0.0000 mm` | `0.0000 mm` *(falso 0)* | `0.0000 mm` |
| Elongación media equilibrio | `<= 2.00%` | `0.1526%` (PASS) | `0.1421%` (PASS) | `0.1520%` (PASS) |
| Elongación pico equilibrio | `<= 5.00%` | **`4.1352%` (PASS)** | `4.0746%` (PASS) | **`4.0559%` (PASS)** |
| Elongación pico transitorio | `<= 5.00%` | `5.4229%` (FAIL, frame 22) | `6.0266%` (FAIL) | `5.4509%` (FAIL, frame 22) |
| Vértices `NaN` totales | `0` | `0` (PASS) | `0` (PASS) | `0` (PASS) |
| **Veredicto Integral Escena** | Todos PASS | **FAIL** | **FAIL** | **FAIL** *(cumple 7/8 checks; único fallo `+0.45%` transitorio en frame 22)* |

---

## 4. Evidencia Visual WebGL Real

Capturas generadas mediante Playwright + MS Edge WebGL (`ANGLE/SwiftShader`) en [`poc-simulador-3d/results/t3/captures/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/captures/):

- [`t3_01_shoulder_drop_compare_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/captures/t3_01_shoulder_drop_compare_t5s.png): Comparativa lado a lado en caída libre sobre cuello/hombros (`t = 5.0 s`). Se observa perforación severa clavicular/escapular en Alt B (`31.95 mm`), deslizamiento frontal de Alt A por micro-normales facetadas en la cúpula cervical y drapeado estable sin penetración `> 3 mm` en Alt C.
- [`t3_02_front_bodice_compare_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/captures/t3_02_front_bodice_compare_t5s.png): Comparativa frontal en `T3_FRONT_BODICE_PANEL` (`t = 5.0 s`). Alt A y Alt C envuelven el busto limpiamente (`0.00 mm` de penetración real), mientras Alt B deja sobresalir el esternón/busto (`9.52 mm` en equilibrio, `15.67 mm` transitorio).
- [`t3_03_bodice_altA_side_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/captures/t3_03_bodice_altA_side_t5s.png): Vista lateral Alt A (`0.00 mm` penetración).
- [`t3_04_bodice_altB_side_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/captures/t3_04_bodice_altB_side_t5s.png): Vista lateral Alt B mostrando la envolvente elipsoidal interna respecto al busto real.
- [`t3_05_bodice_altC_side_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t3/captures/t3_05_bodice_altC_side_t5s.png): Vista lateral Alt C (`Grid SDF 3D`, `0.00 mm` penetración, `0.92 ms` colisión).

---

## 5. Análisis de Limitaciones y Trade-offs

1. **Por qué falla la Alternativa B (`10 Cápsulas/Elipsoides`):**  
   Aunque su inicialización es instantánea (`0.01 ms`) y su memoria despreciable (`640 B`), un máximo de 8–12 primitivas analíticas no reproduce la anatomía asimétrica entre clavículas, depresión esternal inter-mamaria y caída sub-mamaria (`MAE = 12.79 mm`, error pico estático `70.24 mm`). En simulación, **reporta falsa ausencia de colisión (`proxy = 0.00 mm`) mientras perfora hasta `31.95 mm`** el torso canónico, además de consumir `6.89–7.39 ms/frame` al evaluar las 10 primitivas sobre `1,024 × 12` vértices-subpaso en JS.
2. **Por qué Alternativa A (`Malla + Spatial Hash 3D`) excede el presupuesto de colisión:**  
   Ofrece la mejor fidelidad estática (`MAE = 0.1844 mm`, `0` frames `> 3 mm`), pero el costo por frame depende fuertemente del número de vértices cercanos a la superficie (`5.02 ms` cuando solo apoya parte del panel frontal vs. **`14.18 ms` media / `24.93 ms` p95** cuando gran parte del paño envuelve celdas superficiales en `T3_SHOULDER_DROP`). Esto rompe el límite de `<= 6 ms` de colisión y eleva el paso total a `20.28–27.95 ms` (`p95 = 31.27–44.79 ms`).
3. **Comportamiento y limitaciones de Alternativa C (`Grid SDF 3D Uniforme 12 mm`):**  
   - **Ventaja decisiva en runtime:** Al reducir cada consulta de contacto a una lectura O(1) de 8 voxeles con rechazo rápido y gradiente analítico trilineal suave, mantiene `collisionMs` en **`0.92–1.40 ms/frame`** (`p95 = 1.34–2.28 ms`), cumpliendo simultáneamente el presupuesto de colisión (`<= 6 ms`), paso total desktop (`14.55–15.35 ms <= 16 ms`, `p95 = 21.01–22.52 ms <= 25 ms`) y cero penetraciones severas sostenidas (`0` frames `> 3 mm`, `2.32 mm` máx en hombros y `0.00 mm` en panel frontal).
   - **Costo de construcción inicial (`initMs = 1,930.58 ms`):** Construir los `197,714` voxeles evaluando BVH toma `~1.93 s` una sola vez por conjunto de medidas. Cuando el usuario cambie medidas corporales en tiempo real, requerirá cálculo de banda estrecha (*narrow-band SDF*), evaluación en *Worker*/C++ o reconstrucción diferida al soltar el control deslizante.
4. **Causa real de los fallos residuales de elongación en tela (compartidos por A, B y C):**  
   - En `T3_SHOULDER_DROP`, una malla plana cuadrada sin abertura cervical depositada directamente sobre un cilindro estrecho (`r_cuello = 6.5 cm`) introduce una singularidad de curvatura gaussiana donde `shearStiffness = 250 N/m` y la compresión geométrica del pliegue generan `10.50%–13.78%` en aristas diagonales/vecinas (`measureEdgeStretchStats` mide `|L - L0| / L0`, contabilizando también compresión por plegado).
   - En `T3_FRONT_BODICE_PANEL`, el equilibrio ya aprueba (`0.15%` media, `4.06% <= 5%` pico), quedando únicamente un pico transitorio de `5.45%` en el impacto del frame `22` (`t = 0.37 s`) debido a compresión en el primer contacto sobre el busto.

---

## 6. Veredicto Objetivo T3

- **Veredicto estricto de la suite completa:** `FAIL` (`0 / 2` escenas completas con todos los checks en verde simultáneamente), porque bajo las métricas sin modificar (`|L - L0|/L0 <= 5%` en todo instante incluyendo compresión de plegado) los picos de tela en impacto frontal (`5.42%–5.45%`) y plegado sobre cúpula cervical sin escote (`11.89%–13.78%`) superan el `5%`.
- **Veredicto comparativo del componente evaluado en T3 (Proxy de Colisión Corporal):**
  - **Alternativa B (`10 Cápsulas/Elipsoides`):** **RECHAZADA** (falla gravemente geometría con `9.52–31.95 mm` de penetración real y también falla tiempo `6.89–7.39 ms`).
  - **Alternativa A (`Malla + Spatial Hash 3D`):** **NO APTO EN DESKTOP MONOHILO JS** para cobertura amplia (`14.18 ms` colisión media en hombros, `20.28–27.95 ms` paso total).
  - **Alternativa C (`Grid SDF 3D Uniforme 12 mm trilineal`):** **CANDIDATA PRINCIPAL PARA COLISIÓN CORPORAL**, única que cumple holgadamente los criterios propios de colisión y cómputo (`0.92–1.40 ms <= 6 ms`, `total <= 16 ms`, `p95 <= 25 ms`, `0` penetraciones `> 3 mm`), dejando documentado el coste inicial `initMs ≈ 1.93 s` para optimización (*narrow-band* / *caching*) si es necesario en etapas posteriores.

> *Nota de alcance:* Ejecución detenida estrictamente al cierre de T3. No se ejecutaron T4–T6 ni se modificaron archivos de producción, BD ni resultados históricos `T2/T2.1/T2.2`.

