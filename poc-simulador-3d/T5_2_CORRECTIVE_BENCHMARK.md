# T5.2 — Benchmark Correctivo Geométrico y Strain Guard Dinámico

**Estado:** COMPLETADO (aislado en `poc-simulador-3d/`, sin modificar `H1B_ORIGINAL`, `results/t2*..t5_1/`, producción, M00–M07, BD, `package.json` ni `src/components/mannequin3d/`)  
**Fecha:** 2026-11-15  
**Evidencia textil:** Arquetipos sintéticos `TIER_3_ESTIMATED` (no sustituyen mediciones de laboratorio ni implican aprobación de Gate 1)  
**Restricción de integridad física:** `restLengthM` permanece 100% derivado de [`flatPattern2dM`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/garment/twoPanelBodiceGenerator.ts) (`max(|L_2D - restLengthM|) = 0.000000 mm` verificado en ambas topologías)  
**Veredicto estricto:** **Gate 1 NO APROBADO** (`gate1Approved = false`; **NO iniciar T6**)

---

## 1. Resumen Ejecutivo y Hallazgos Principales

T5.2 evalúa experimentalmente dos intervenciones opt-in y reversibles sobre la configuración ganadora de T5.1 (`T51_F1_F2_RESEAL` = contorno conformal + exclusión de 40 costuras `L0 = 3 mm` del Strain Guard + 2 pasadas XPBD de re-sellado), manteniendo inalterados F1, F2, el re-sellado y todos los umbrales de Gate 1:

1. **Cambio 1 (`conformalRegularized: true` en [`twoPanelBodiceGenerator.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/garment/twoPanelBodiceGenerator.ts)):**
   - Resuelve por completo la calidad geométrica de malla (`minPanelEdgeLenMm`: `8.089 mm -> 10.169 mm`; `minAngleDeg`: `4.69° -> 12.86°`; triángulos `< 12°`: `16 -> 0`; masa nodal mínima: `0.0050 g -> 0.0137 g`, razón `46.54 -> 15.62`).
   - Reduce la pre-deformación geométrica inicial 2D↔3D en **-91.0%** (`244 -> 22` aristas con `|ε_0| >= 5%`; en el panel `BACK` pasa de `-7.9947%` a **`-3.9537%`**, cero aristas `>= 5%`), mediante relajación 3D cuasi-isométrica segura contra colisión (`ALT_C_SDF_GRID_3D`) sobre vértices libres **sin alterar ni sobrescribir jamás `restLengthM`**.
   - Elimina de raíz el pico transitorio del escote posterior (`e = 1652`, `V606–V625`, `10.9403%`) y reduce el peor pico transitorio global en **-41.8%** incluso sin Cambio 2 (`10.9403% -> 6.3691%` en `GEOM_ONLY`).
2. **Cambio 2 (`refreshActivePerGuardIteration: true` con `4` iteraciones + parámetro `gravityScale` en [`t41ExperimentalSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/t41ExperimentalSolvers.ts)):**
   - Elimina la cadena escapular de equilibrio en `BACK` (`e = 1680`, `5.9257%`) y estabiliza 4 de 5 arquetipos por debajo de `4.63%` en equilibrio (`<= 5.0%` PASS).
   - Bajo `GEOM_PLUS_GUARD`, `ARCH1_FLUID_LIGHT` alcanza **`GATE1 PASS` estricto (13/13 criterios)** sin rampa (`pk = 4.8293%`, `eqMax = 4.50%`, `CPU = 13.5559 ms`, `P95 = 18.2676 ms`); y bajo `GEOM_PLUS_GUARD_RAMP10`, `ARCH2_MEDIUM_BALANCED` alcanza **`GATE1 PASS` estricto (13/13 criterios)** (`pk = 4.5656%`, `eqMax = 4.50%`, `CPU = 14.765 ms`, `P95 = 20.2767 ms`).
3. **Brechas honestas que impiden aprobar Gate 1 (`gate1StrictPassCount = 1/5`):**
   - Persisten picos de `5.25%–5.6478%` (margen `+0.25%` a `+0.65%` sobre `5.0%`) en 3 arquetipos (`ARCH3`, `FACE_UP`, `FACE_DOWN`) localizados en aristas de panel adyacentes a costuras tras el re-sellado XPBD post-guardia (`FRONT e=608 [13, 253]`, `e=539 [12, 231]`, `e=135 [71, 86]` / `e=132 [70, 85]`), porque el re-sellado de las 40 costuras y la colisión final ocurren *después* de `solveOverstrainGuard`.
   - Re-escanear las `3,201` aristas en cada subiteración eleva `strainGuardMean` de `~0.62 ms` (`GEOM_ONLY`) a `2.46–3.47 ms` (`GEOM_PLUS_GUARD`), llevando la media CPU de `12.71 ms` (`GEOM_ONLY`, todo `<= 16 ms`) a `17.76 ms` (peor `22.61 ms`, P95 `36.65 ms`).
   - La **rampa gravitacional de 10 frames (`RAMP10`)** amortigua P95 (`36.65 -> 26.14 ms`), pero **empeora ligeramente los picos (`5.3417% -> 5.6478%`) y `rmsVel` de `FACE_DOWN` (`0.0006 -> 0.0022 m/s`)** al retardar el acoplamiento de contacto/deslizamiento hasta frames `10..37`.

---

## 2. Auditoría Geométrica y Trazabilidad Física 2D ↔ 3D (`NO restLengthM Override`)

Medido en malla de referencia (`0.16 kg/m²`) auditada contra `ReferenceTorsoGroundTruth (96 × 108)` y [`inspectGarmentMeshQuality`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/garment/twoPanelBodiceGenerator.ts):

| Métrica Geométrica | `conformal_base` (T5.1) | `conformal_regularized` (T5.2 Cambio 1) | Delta / Estado |
|---|---:|---:|---|
| Vértices (`FRONT` + `BACK`) | `559 + 586 = 1,145` | `553 + 580 = 1,133` | `-12` |
| Triángulos (`FRONT` + `BACK`) | `1,018 + 1,074 = 2,092` | `1,008 + 1,062 = 2,070` | `-22` |
| Aristas panel + costuras | `3,235 + 40` | `3,201 + 40` | F1/costuras intactas |
| `minPanelEdgeLenMm` (Gate 1 `>= 5`, Obj `>= 10`) | `8.089 mm` | **`10.169 mm`** | `+25.7%` (**OBJETIVO PASS**) |
| `maxPanelEdgeLenMm` | `79.749 mm` | `95.978 mm` | `+16.2 mm` (salto `r=0->1` clavícula) |
| `minTriangleAreaMm2` | `91.051 mm²` | **`111.168 mm²`** | `+22.1%` |
| `minAngleDeg` 3D (Gate 1 `>= 12.0°`) | `4.69°` (**FAIL**) | **`12.86°`** (**PASS**) | `+8.17°` |
| Triángulos `< 12°` / `< 14°` | `16` / `34` | **`0`** / `10` | `0` astillas `< 12°` |
| `degenerateTriangleCount` | `0` | `0` | **PASS** |
| **`max(\|L_flatPattern2dM - edge.restLengthM\|)`** | **`0.000000 mm`** | **`0.000000 mm`** | **Trazabilidad 100% intacta** |
| Pre-strain 2D↔3D min / max | `-12.6679% / +10.4333%` | `-9.0554% / +6.6588%` | Reducido en ambos extremos |
| Pre-strain medio absoluto | `1.7035%` | **`0.7269%`** | `-57.3%` |
| Aristas con `\|ε_0\| >= 3%` / `>= 5%` | `606` / `244` | **`88` / `22`** | **`-85.5%` / `-91.0%`** |
| Peor pre-strain `FRONT` / `BACK` | `-12.6679% (e308)` / `-7.9947% (e1647)` | `-9.0554% (e1526)` / **`-3.9537% (e1620)`** | **`BACK` 100% `< 4%`** |
| Masa nodal `minMassG` / razón `max/min` | `0.0050 g` (`V559`) / `46.5434` | **`0.0137 g`** (`V632`) / **`15.6154`** | **`+174%` masa min** |
| Clearance GT inicial (`minSd` / pen `> 0` / `> 3 mm`) | `5.4985 mm` / `0` / `0` | `5.1511 mm` / `0` / `0` | **0 penetración inicial** |

---

## 3. Comparación Global de Configuraciones (Separación Explícita SIN vs CON Rampa 10f)

Proxy de colisión constante en las 25 corridas (`5 configs × 5 arquetipos @ 300 frames / 5.0 s`): `ALT_C_SDF_GRID_3D` (`43×121×38 = 197,714` voxeles `12 mm`, `790,856 bytes`, `thickness = 2.0 mm`, `μ = 0.35`), auditado frame a frame contra GT BVH `96 × 108`.

### 3.1 Variantes SIN Rampa Gravitacional (`gravityRampFrames = 0`)

| Config | Gate1 Estricto | `panelEqMean` Peor | `panelPk` Peor | `panelEqMax` Peor | `combPk` Peor | Costura `Eq / Pk` [mm] | `rmsVel` Peor [m/s] | CPU Mean / Peor / P95 [ms] | `GT Eq >3mm` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `BASE_T51_RESEAL` | `0/5` | `0.4831%` | `10.9403%` | `5.9257%` | `10.9403%` | `3.003 / 3.008` | `0.0021` | `15.47 / 18.36 / 38.31` | `0` |
| `GEOM_ONLY` | `0/5` | `0.3937%` | `6.3691%` | `6.0666%` | `6.3691%` | `3.008 / 3.009` | `0.0013` | **`12.71 / 14.24`** / `30.30` | `0` |
| **`GEOM_PLUS_GUARD`** | **`1/5`** | `0.3937%` | **`5.3417%`** | **`5.1816%`** | **`5.3417%`** | `3.008 / 3.009` | **`0.0006`** | `17.76 / 22.61 / 36.65` | `0` |

### 3.2 Variantes CON Rampa Gravitacional de 10 Frames (`gravityRampFrames = 10`)

| Config | Gate1 Estricto | `panelEqMean` Peor | `panelPk` Peor | `panelEqMax` Peor | `combPk` Peor | Costura `Eq / Pk` [mm] | `rmsVel` Peor [m/s] | CPU Mean / Peor / P95 [ms] | `GT Eq >3mm` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `GEOM_ONLY_RAMP10` | `0/5` | `0.3939%` | `6.6620%` | `6.6336%` | `6.6620%` | `3.006 / 3.007` | `0.0055` | `16.30 / 17.60 / 29.82` | `0` |
| **`GEOM_PLUS_GUARD_RAMP10`** | **`1/5`** | `0.3939%` | `5.6478%` | `5.4780%` | `5.6478%` | `3.006 / 3.007` | `0.0022` | `15.94 / 17.03` / **`26.14`** | `0` |

> **Conclusión directa SIN vs CON Rampa 10f:** Sin rampa (`GEOM_PLUS_GUARD`) logra mejor control de deformación pico (`5.3417%` vs `5.6478%`), equilibrio (`5.1816%` vs `5.4780%`) y velocidad residual (`0.0006` vs `0.0022 m/s`), mientras `RAMP10` suaviza P95 (`36.65 -> 26.14 ms`) a costa de retardar el asentamiento transitorio en `FACE_DOWN`. Ninguna de las dos elimina aún el rebase residual de `+0.25%..+0.65%` en aristas ligadas al re-sellado/deslizamiento sobre busto.

---

## 4. Detalle Completo de las 25 Corridas y Localización Forense de Picos

| Config | Arquetipo | `panelPk` % (Arista / Verts / Panel / Frame) | `panelEqMax` % (Arista / Verts / Panel) | `panelEqMean` % | Costura Eq/Pk [mm] | `rmsVel` [m/s] | CPU Mean / P95 [ms] | `GT EqMax` [mm] | Veredicto Gate 1 (Fallas) |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| `BASE_T51_RESEAL` | `ARCH1_FLUID_LIGHT` | `10.1975` (`e1652 [606,625] BACK F4`) | `5.8106` (`e1680 [616,636] BACK`) | `0.3813` | `3.001 / 3.003` | `0.0004` | `16.76 / 29.77` | `0.000` | **FAIL** (`ang<12`, `pk>5`, `cpuMean`, `cpuP95`) |
| `BASE_T51_RESEAL` | `ARCH2_MEDIUM_BALANCED` | `10.4356` (`e1652 [606,625] BACK F4`) | `5.8728` (`e1680 [616,636] BACK`) | `0.4210` | `3.002 / 3.006` | `0.0013` | `17.51 / 31.70` | `0.000` | **FAIL** (`ang<12`, `pk>5`, `cpuMean`, `cpuP95`) |
| `BASE_T51_RESEAL` | `ARCH3_STRUCTURED_STIFF` | `10.3179` (`e1652 [606,625] BACK F4`) | `5.8336` (`e1680 [616,636] BACK`) | `0.4712` | `3.003 / 3.007` | `0.0017` | `18.36 / 38.31` | `0.048` | **FAIL** (`ang<12`, `pk>5`, `cpuMean`, `cpuP95`) |
| `BASE_T51_RESEAL` | `ARCH4_ASYM_FACE_UP_STIFF` | `10.9403` (`e1652 [606,625] BACK F4`) | `5.9251` (`e1680 [616,636] BACK`) | `0.4831` | `3.003 / 3.008` | `0.0003` | `12.43 / 18.66` | `0.087` | **FAIL** (`ang<12`, `pk>5`) |
| `BASE_T51_RESEAL` | `ARCH4_ASYM_FACE_DOWN_STIFF` | `9.8323` (`e1652 [606,625] BACK F3`) | `5.9257` (`e1680 [616,636] BACK`) | `0.4266` | `3.002 / 3.006` | `0.0021` | `12.29 / 20.40` | `0.000` | **FAIL** (`ang<12`, `pk>5`, `rmsV`) |
| `GEOM_ONLY` | `ARCH1_FLUID_LIGHT` | `5.9652` (`e1653 [609,626] BACK F4`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3253` | `3.000 / 3.001` | `0.0002` | `11.84 / 15.97` | `0.000` | **FAIL** (`pk>5`) |
| `GEOM_ONLY` | `ARCH2_MEDIUM_BALANCED` | `5.9691` (`e1653 [609,626] BACK F4`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3466` | `3.001 / 3.002` | `0.0001` | `11.62 / 16.05` | `0.000` | **FAIL** (`pk>5`) |
| `GEOM_ONLY` | `ARCH3_STRUCTURED_STIFF` | `5.7674` (`e1653 [609,626] BACK F3`) | `4.8813` (`e65 [50,60] FRONT`) | `0.3831` | `3.004 / 3.004` | `0.0013` | `11.73 / 16.05` | `0.199` | **FAIL** (`pk>5`) |
| `GEOM_ONLY` | `ARCH4_ASYM_FACE_UP_STIFF` | `5.7052` (`e1653 [609,626] BACK F4`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3937` | `3.001 / 3.002` | `0.0002` | `14.24 / 23.87` | `0.000` | **FAIL** (`pk>5`) |
| `GEOM_ONLY` | `ARCH4_ASYM_FACE_DOWN_STIFF` | `6.3691` (`e180 [86,103] FRONT F24`) | `6.0666` (`e180 [86,103] FRONT`) | `0.3517` | `3.008 / 3.009` | `0.0003` | `14.09 / 30.30` | `1.775` | **FAIL** (`pk>5`, `cpuP95`) |
| `GEOM_ONLY_RAMP10` | `ARCH1_FLUID_LIGHT` | `4.8558` (`e539 [12,231] FRONT F0`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3259` | `3.000 / 3.001` | `0.0003` | `17.60 / 28.90` | `0.000` | **FAIL** (`cpuMean`, `cpuP95`) |
| `GEOM_ONLY_RAMP10` | `ARCH2_MEDIUM_BALANCED` | `4.5676` (`e539 [12,231] FRONT F0`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3466` | `3.001 / 3.002` | `0.0002` | `16.81 / 23.72` | `0.000` | **FAIL** (`cpuMean`) |
| `GEOM_ONLY_RAMP10` | `ARCH3_STRUCTURED_STIFF` | `5.5940` (`e129 [69,84] FRONT F22`) | `4.8811` (`e65 [50,60] FRONT`) | `0.3831` | `3.004 / 3.005` | `0.0013` | `17.09 / 29.82` | `0.199` | **FAIL** (`pk>5`, `cpuMean`, `cpuP95`) |
| `GEOM_ONLY_RAMP10` | `ARCH4_ASYM_FACE_UP_STIFF` | `5.6498` (`e539 [12,231] FRONT F4`) | `4.5000` (`e13 [43,44] FRONT`) | `0.3939` | `3.001 / 3.003` | `0.0002` | `13.72 / 24.18` | `0.000` | **FAIL** (`pk>5`) |
| `GEOM_ONLY_RAMP10` | `ARCH4_ASYM_FACE_DOWN_STIFF` | `6.6620` (`e177 [85,102] FRONT F26`) | `6.6336` (`e177 [85,102] FRONT`) | `0.3528` | `3.006 / 3.007` | `0.0055` | `16.30 / 23.92` | `1.051` | **FAIL** (`pk>5`, `cpuMean`, `rmsV`) |
| **`GEOM_PLUS_GUARD`** | **`ARCH1_FLUID_LIGHT`** | **`4.8293`** (`e539 [12,231] FRONT F0`) | **`4.5000`** (`e1611 [595,609] BACK`) | **`0.3253`** | `3.000 / 3.001` | **`0.0002`** | **`13.56 / 18.27`** | **`0.000`** | **GATE 1 PASS (13/13)** |
| `GEOM_PLUS_GUARD` | `ARCH2_MEDIUM_BALANCED` | `4.6913` (`e1656 [610,627] BACK F3`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3466` | `3.001 / 3.002` | `0.0001` | `22.61 / 36.65` | `0.000` | **FAIL** (`cpuMean`, `cpuP95`) |
| `GEOM_PLUS_GUARD` | `ARCH3_STRUCTURED_STIFF` | `5.2899` (`e608 [13,253] FRONT F1`) | `4.6206` (`e33 [49,50] FRONT`) | `0.3828` | `3.004 / 3.004` | `0.0002` | `20.16 / 35.29` | `0.201` | **FAIL** (`pk>5`, `cpuMean`, `cpuP95`) |
| `GEOM_PLUS_GUARD` | `ARCH4_ASYM_FACE_UP_STIFF` | `5.3417` (`e608 [13,253] FRONT F1`) | `4.5000` (`e13 [43,44] FRONT`) | `0.3937` | `3.001 / 3.002` | `0.0002` | `16.17 / 26.39` | `0.000` | **FAIL** (`pk>5`, `cpuMean`, `cpuP95`) |
| `GEOM_PLUS_GUARD` | `ARCH4_ASYM_FACE_DOWN_STIFF` | `5.2500` (`e135 [71,86] FRONT F21`) | `5.1816` (`e135 [71,86] FRONT`) | `0.3514` | `3.008 / 3.009` | `0.0006` | `16.31 / 28.97` | `1.779` | **FAIL** (`pk>5`, `cpuMean`, `cpuP95`) |
| `GEOM_PLUS_GUARD_RAMP10` | `ARCH1_FLUID_LIGHT` | `4.8545` (`e539 [12,231] FRONT F0`) | `4.5000` (`e1611 [595,609] BACK`) | `0.3259` | `3.000 / 3.001` | `0.0003` | `16.51 / 24.37` | `0.000` | **FAIL** (`cpuMean`) |
| **`GEOM_PLUS_GUARD_RAMP10`** | **`ARCH2_MEDIUM_BALANCED`** | **`4.5656`** (`e539 [12,231] FRONT F0`) | **`4.5000`** (`e1611 [595,609] BACK`) | **`0.3466`** | `3.001 / 3.002` | **`0.0002`** | **`14.77 / 20.28`** | **`0.000`** | **GATE 1 PASS (13/13)** |
| `GEOM_PLUS_GUARD_RAMP10` | `ARCH3_STRUCTURED_STIFF` | `5.4612` (`e608 [13,253] FRONT F1`) | `4.6206` (`e33 [49,50] FRONT`) | `0.3828` | `3.004 / 3.005` | `0.0002` | `15.17 / 22.52` | `0.201` | **FAIL** (`pk>5`) |
| `GEOM_PLUS_GUARD_RAMP10` | `ARCH4_ASYM_FACE_UP_STIFF` | `5.6478` (`e539 [12,231] FRONT F4`) | `4.5000` (`e13 [43,44] FRONT`) | `0.3939` | `3.001 / 3.003` | `0.0002` | `17.03 / 26.14` | `0.000` | **FAIL** (`pk>5`, `cpuMean`, `cpuP95`) |
| `GEOM_PLUS_GUARD_RAMP10` | `ARCH4_ASYM_FACE_DOWN_STIFF` | `5.5443` (`e132 [70,85] FRONT F37`) | `5.4780` (`e132 [70,85] FRONT`) | `0.3530` | `3.006 / 3.007` | `0.0022` | `16.25 / 22.25` | `1.099` | **FAIL** (`pk>5`, `cpuMean`, `rmsV`) |

---

## 5. Diferenciación Textil y Asimetría `FACE_UP / FACE_DOWN`

- **Diferenciación física de los 3 arquetipos base (`textileDifferentiationPass = true` en 5/5 configs):**
  - Bajo `GEOM_PLUS_GUARD_RAMP10`: `ARCH1` (gap sub-busto `51.482 mm`, diédrico `4.6555°`) < `ARCH2` (`54.595 mm`, `3.5308°`) < `ARCH3` (`55.071 mm`, `3.2070°`).
- **Respuesta asimétrica `FACE_UP / FACE_DOWN` (`asymmetryContrastPass = true` en 5/5 configs):**
  - `GEOM_PLUS_GUARD` (sin rampa): `E_bend = 0.0158 J` (`FACE_UP`) vs `0.0041 J` (`FACE_DOWN`), razón `3.85×`; caída escote anterior `-0.233 mm` vs `3.858 mm`.
  - `GEOM_PLUS_GUARD_RAMP10`: `E_bend = 0.0158 J` vs `0.0028 J` (`5.64×`); `subBust = 54.480 mm` vs `53.070 mm`; caída escote anterior `-0.231 mm` vs `7.844 mm`.

---

## 6. Inspección Visual (Capturas 3D Three.js + Playwright)

Todas las capturas están generadas en `poc-simulador-3d/results/t5_2/captures/`:
- [`01_t52_compare4_posterior_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_2/captures/01_t52_compare4_posterior_5s.png) y [`02_t52_back_neck_scapula_closeup.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_2/captures/02_t52_back_neck_scapula_closeup.png): eliminan las arrugas agudas/pinzamientos escapulares y del borde de escote posterior observados en `BASE_T51_RESEAL` (`10.20% -> 4.83%`); se observa aún una pequeña franja superficial del hombro derecho debajo de la banda superior del tirante por tolerancia rasterizada del voxel SDF `12 mm`, sin penetración GT `> 3 mm`.
- [`03_t52_views4_initial_t0.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_2/captures/03_t52_views4_initial_t0.png) y [`04_t52_views4_equilibrium_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_2/captures/04_t52_views4_equilibrium_5s.png): muestran envoltura inicial limpia (`minClearance = 5.15 mm`), contorno conformal regularizado de escote y sisas, costuras XPBD cerradas (`3.00 mm`) y caída en equilibrio `5.0 s` en `ARCH2_MEDIUM_BALANCED`. En vista frontal inferior al busto se aprecia un micro-artefacto visual de sombreado triangular en el pliegue central del esternón, coherente con `gtMax = 0.00 mm` (pliegue de tela sobre tela, no penetración corporal).
- [`05_t52_compare3_textiles_5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_2/captures/05_t52_compare3_textiles_5s.png) y [`06_t52_asym_face_up_vs_down.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t5_2/captures/06_t52_asym_face_up_vs_down.png): confirman diferenciación visual entre rigideces textiles y entre `FACE_UP` vs `FACE_DOWN`.

---

## 7. Checklist Estricta de Gate 1 (Sin Relajar Umbrales)

| Criterio Gate 1 | Umbral | `GEOM_PLUS_GUARD` (Sin Rampa) | `GEOM_PLUS_GUARD_RAMP10` (Con Rampa 10f) | Estado |
|---|---|---:|---:|---|
| Estabilidad numérica (`NaN = 0`) | `0` | `0` en `5/5` | `0` en `5/5` | **PASS** |
| Penetración inicial GT (`sd < 0`) | `0` | `0` en `5/5` | `0` en `5/5` | **PASS** |
| Calidad malla (`minEdge >= 5 mm`, `minAngle >= 12°`, `deg = 0`) | `>= 5 / >= 12 / 0` | `10.169 mm / 12.86° / 0` | `10.169 mm / 12.86° / 0` | **PASS** |
| Deformación media equilibrio (panel y combinada) | `<= 2.0%` | `0.3937%` en `5/5` | `0.3939%` en `5/5` | **PASS** |
| **Deformación pico transitoria & máx eq (`<= 5.0%`)** | `<= 5.0%` | `5.3417% pk / 5.1816% eq` (`2/5` pass) | `5.6478% pk / 5.4780% eq` (`2/5` pass) | **FAIL** |
| Costuras (`Eq <= 3.05 mm`, `Pk <= 3.20 mm`) | `<= 3.05 / 3.20 mm` | `3.008 / 3.009 mm` (`5/5`) | `3.006 / 3.007 mm` (`5/5`) | **PASS** |
| Penetración GT sostenida `> 3 mm` en equilibrio | `0 frames` | `0 frames` en `5/5` | `0 frames` en `5/5` | **PASS** |
| Estabilidad `finalRmsVelocity <= 0.0020 m/s` | `<= 0.0020 m/s` | `0.0006 m/s` (`5/5`) | `0.0022 m/s` (`4/5`) | **PASS (sin) / FAIL (con)** |
| **Presupuesto CPU (`mean <= 16 ms`, `P95 <= 25 ms`)** | `<= 16 / 25 ms` | `17.76 mean / 36.65 P95` (`1/5`) | `15.94 mean / 26.14 P95` (`2/5`) | **FAIL** |
| Presupuesto colisión `<= 6 ms` | `<= 6.0 ms` | `1.3337 ms` (`5/5`) | `1.2412 ms` (`5/5`) | **PASS** |
| Diferenciación textil & asimetría `FACE_UP/DOWN` | Cualitativa + cuantitativa | `PASS / PASS` | `PASS / PASS` | **PASS** |

**Veredicto final T5.2:** T5.2 queda **completado** con evidencia verificable (`tsc`, `eslint`, T1 y 25 corridas aisladas). Cambio 1 + Cambio 2 reducen casi a la mitad el pico anterior y ya alcanzan `GATE1 PASS (13/13)` en `ARCH1` (sin rampa) y `ARCH2` (con rampa), pero **Gate 1 NO se declara aprobado** (`1/5` global) y **no se inicia T6**. El siguiente paso técnico recomendado antes de re-evaluar Gate 1 (requiere autorización explícita) sería mantener `conformalRegularized: true`, optimizar `solveOverstrainGuard` con re-escaneo incremental por vecindad 1-ring (`O(k)` en lugar de `O(E)`) para bajar CPU a `< 13 ms`, y ejecutar una pasada local final de `OverstrainGuard` posterior al re-sellado XPBD de costuras.

