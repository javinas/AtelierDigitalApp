# T4.1 — Intervención Experimental de Estabilidad y Comparativa de Solvers XPBD

**Estado:** COMPLETADO (aislado en `poc-simulador-3d/`, sin modificar `H1B` original, producción, M00–M07, BD ni históricos `results/t2*`, `results/t3/`, `results/t4/`)  
**Fecha:** 2026-11-15  
**Línea base de comparación:** [`HierarchicalXpbdClothSolver`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts) (`H1B_VCYCLE_12SUB`, intacto)  
**Variantes experimentales independientes:** [`T41ExperimentalXpbdSolver`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/t41ExperimentalSolvers.ts) (`EXP1_BEND_FIRST_CLEANUP`, `EXP2_RAYLEIGH_BEND_FIRST`, `EXP3_SUB16_STRAIN_GUARD_DUAL_COL`)  
**Suite / Runner / Evidencia JSON:** [`t41SolverExperimentsBenchmark.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/t41SolverExperimentsBenchmark.ts) · [`run_t4_1_experiments.cjs`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/run_t4_1_experiments.cjs) · [`t41_summary_report.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4_1/t41_summary_report.json)  
**Clasificación de evidencia:** Los perfiles textiles usados siguen siendo `TIER_3_ESTIMATED` (`SYNTHETIC_CALIBRATION_PLACEHOLDER`), auditados bajo `ALT_C_SDF_GRID_3D` (`voxel = 12 mm`, `contactThickness = 2.0 mm`, `μ = 0.35`) y verificados frame a frame contra Ground Truth `96 × 108` BVH.

---

## 1. Propósito y Alcance Acotado de T4.1

T4 expuso cuatro modos concretos de fallo bajo `H1B_VCYCLE_12SUB` que impedían avanzar con confianza hacia T5 (escena integrada / prototipo):

1. **Inestabilidad severa de micro-mallas (`Δx <= 3 mm`) con flexión rígida:** `8 × 12 cm @ 32 × 32` (`Δx = 2.58 mm`, `B = 180 µN·m`) explotó hasta `~2900%` en T4 (`2831.98%` en la corrida de línea base T4.1).
2. **Picos iniciales y falta de asentamiento en cortina fruncida 82% (`T4_GATHERED_PLEAT_DRAPE`):** choque inicial por proyección flexural *post-stretch* (`8.28%` en `ARCH3`) y residual cinético (`rmsVel ~ 0.177–0.250 m/s` > `0.08 m/s`).
3. **Picos transitorios `> 5%` sobre colisión corporal en panel frontal (`BODICE_ALT_C`):** `5.45%–6.66%` en `ARCH2`/`ARCH4_FACE_UP_STIFF` y `5.53%` de pico en equilibrio en `ARCH4_FACE_UP_STIFF`.
4. **Concentración extrema en hombros y cuello:** `29.17%` transitorio / `12.22%` eq en capa con 2 pines acromiales de 1 vértice (`SHOULDER_ANCHORED_ALT_C`), y `19.10%–22.63%` + 1 frame severo GT (`3.0267 mm`) en capa sin escote ni pines (`SHOULDER_CAPE_0PIN_ALT_C`).

Para diagnosticar causa raíz y separar defectos reales del solver de limitaciones geométricas de las escenas PoC, se evaluaron exactamente **3 alternativas experimentales independientes** frente a `H1B_ORIGINAL` en un único ciclo reproducible de **68 corridas** (`17` configuraciones escena/tejido × `4` solvers).

---

## 2. Arquitectura de las Tres Variantes Comparadas

| Identificador | Substeps (`N_sub`) | Orden en subpaso | Fine Stretch (`N_fine`) | Amortiguamiento Rayleigh interno XPBD | Strain Guard | Colisión por subpaso |
|---|---:|---|---:|---|---|---|
| `H1B_ORIGINAL` (ref. intacta) | `12` | `Coarse -> Col -> FineStretch -> Bending` | `2` bidir (`24/frame`) | No (`0`) | No | 1 pasada (`ALT_C`, `μ=0.35`) |
| `EXP1_BEND_FIRST_CLEANUP` | `12` | `Coarse -> Col -> Bending -> FineStretch` | `4` bidir (`48/frame`) | No (`0`) | No | 1 pasada (`ALT_C`, `μ=0.35`) |
| `EXP2_RAYLEIGH_BEND_FIRST` | `12` | `Coarse -> Col -> Bending -> FineStretch` | `4` bidir (`48/frame`) | Sí: `τ_stretch = 0.0006 s`, `τ_bend = 0.0015 s` | No | 1 pasada (`ALT_C`, `μ=0.35`) |
| `EXP3_SUB16_STRAIN_GUARD_DUAL_COL` | `16` | `Coarse -> Col -> Bending -> FineStretch` | `4` bidir (`64/frame`) | Sí: `τ_stretch = 0.0006 s`, `τ_bend = 0.0015 s` | Sí: `maxRatio = 0.045` (`4.5%`, `2` pasadas activas GS) | 2 pasadas (`Col μ=0.35` + cleanup post-guard `μ=0`) |

> [!NOTE]
> La formulación Rayleigh usada en [`T41ExperimentalXpbdSolver`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/t41ExperimentalSolvers.ts) implementa el término adimensional de Macklin ($\gamma = \tau / \Delta t_s$) sobre la variación de la restricción respecto a $\mathbf{x}^n$, preservando invarianza de cuerpo rígido y convergencia de reposo ($\Delta \mathbf{x}_{\text{steady}} = 0$). Además, en `BODICE_ALT_C`, `EXP2` corrigió el acoplamiento `Stretch-post-Bending` sin promediar caras asimétricas.

---

## 3. Scorecard Global de Cumplimiento Estricto (Cycle T4.1)

Criterios estrictos evaluados simultáneamente por corrida: `NaN = 0`, `colMean ≤ 6.0 ms`, `totalMean ≤ 16.0 ms`, `totalP95 ≤ 25.0 ms`, `GT eqSevereFrames (>3 mm) = 0`, `eqMeanStretch ≤ 2.0%`, `eqMaxStretch ≤ 5.0%`, `transientPeakStretch ≤ 5.0%` y `eqRmsVel ≤ 0.08 m/s`.

| Solver | `strictPass` Global | `NaN` Fails | `MICRO_32` (`ARCH3`) | `CANTILEVER_16` (`5` corr.) | `SCENE0_32` (`ARCH2`) | `GATHERED_32` (`2` corr.) | `BODICE_32` (`4` corr.) | `SH_ANCH_32` (`2` corr.) | `SH_0PIN_32` (`2` corr.) | Asimetría & Contraste | Peor Mean / P95 | Mean Torso `32×32` (Col) |
|---|---:|---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---:|---:|
| `H1B_ORIGINAL` | **4 / 17** (`23.5%`) | `0` | **FAIL** (`2831.98%`) | `4 / 5` | FAIL (`rmsVel`) | `0 / 2` | `0 / 4` | `0 / 2` | `0 / 2` | **PASS** (`20.6 mm`) | `10.90 / 18.38 ms` | `10.24 ms` (`0.61 ms`) |
| `EXP1_BEND_FIRST_CLEANUP` | **5 / 17** (`29.4%`) | `0` | **FAIL** (`127.45%`) | **`5 / 5`** | FAIL (`rmsVel`) | `0 / 2` | `0 / 4` | `0 / 2` | `0 / 2` | **PASS** (`20.7 mm`) | `16.63 / 23.22 ms` | `13.91 ms` (`0.58 ms`) |
| **`EXP2_RAYLEIGH_BEND_FIRST`** | **6 / 17** (`35.3%`) | `0` | **PASS** (`4.04%`) | **`5 / 5`** | FAIL (`rmsVel`) | `0 / 2` | `0 / 4` | `0 / 2` | `0 / 2` | **PASS** (`14.3 mm`) | `17.29 / 24.61 ms` | `16.33 ms` (`0.61 ms`) |
| `EXP3_SUB16_STRAIN_GUARD_DUAL_COL` | **5 / 17** (`29.4%`) | `0` | **FAIL** (CPU; strain `2.56%`) | **`5 / 5`** | FAIL (`rmsVel` + CPU) | `0 / 2` | `0 / 4` (solo CPU) | `0 / 2` | `0 / 2` | **PASS** (`17.7 mm`) | `25.49 / 38.85 ms` | `23.41 ms` (`1.31 ms`) |

**Desglose clave de `EXP3` en `BODICE_ALT_C`:** `EXP3` cumplió el **100% de las métricas físicas y de deformación** en `BODICE_ALT_C` (`0/4` fallos físicos; `transientPeak = 4.00%–4.50%`, `0` frames `>5%`, `eqMax = 2.01%–3.31%`, `0` penetración GT), pero falló `strictPass` en todas las escenas `32×32` por presupuesto CPU (`22.88–23.47 ms > 16 ms`, `p95 = 29.36–33.66 ms > 25 ms`).

---

## 4. Comparativa Detallada por Defecto Objetivo

### 4.1 Defecto 1 — Inestabilidad de Micro-Malla (`MICRO_CANTILEVER_32`: `8 × 12 cm`, `Δx = 2.58 mm`, `B = 180 µN·m`)

| Solver | Total Mean / P95 (`ms`) | `peakTrans` (`%`) @ frame | Frames `> 5%` | `eqMean` / `eqMax` (`%`) | `eqRmsVel` (`m/s`) | `E_stretch` final (`J`) | `tipDrop` (`m`) | Veredicto |
|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| `H1B_ORIGINAL` | `9.91 / 14.30` | `2831.98%` @f163 | `178` | `445.18 / 2831.98` | `20.3185` | `1195.3049` | `0.0180` | **FAIL** (explosión sin NaN) |
| `EXP1_BEND_FIRST_CLEANUP` | `13.29 / 16.12` | `127.45%` @f14 | `167` | `17.35 / 125.19` | `2.4848` | `1.4164` | `0.0047` | **FAIL** (reducción 22×, insuficiente sin damping) |
| **`EXP2_RAYLEIGH_BEND_FIRST`** | **`13.61 / 18.13`** | **`4.0416%`** @f8 | **`0`** | **`0.1140 / 2.3458`** | **`0.0524`** | **`0.0002`** | `0.1060` | **PASS** (100% criterios) |
| `EXP3_SUB16_STRAIN_GUARD_DUAL_COL` | `19.31 / 31.02` | `2.5588%` @f8 | `0` | `0.0746 / 1.6774` | `0.0554` | `0.0001` | `0.1053` | **FAIL** (solo CPU `19.31 > 16 ms`) |

**Conclusión causal:** En micro-mallas (`Δx = 2.58 mm`) con rigidez flexural alta (`B = 180 µN·m`), el compliance flexural XPBD escalado como $\Delta x^2 / (\tilde{\alpha}_{\text{bend}} \dots)$ inyecta impulsos de alta frecuencia que en `H1B` se amplifican por ejecutar `Bending` **después** de `Stretch` (`2831.98%`). Invertir el orden (`EXP1`: `Bending -> FineStretch`) corta el pico 22× (`127.45%`), pero solo al sumar **Rayleigh interno XPBD** (`EXP2`) desaparece la oscilación paramétrica por debajo del umbral (`4.0416%`, `E_stretch = 0.0002 J`, `13.61 ms` dentro del presupuesto).

---

### 4.2 Defecto 2 — Cortina Fruncida 82% (`GATHERED_PLEAT_DRAPE`) y Control `SCENE0_HANGING_32` (`3.0 s`, eq `2.0–3.0 s`)

| Escena / Tejido | Solver | Total Mean / P95 (`ms`) | `peakTrans` (`%`) @ frame | Frames `> 5%` | `eqMean` / `eqMax` (`%`) | `eqRmsVel` (`m/s`) | `E_kin` final (`J`) | `|φ|` medio (°) | Estado |
|---|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| `GATHERED` / `ARCH2` | `H1B_ORIGINAL` | `9.40 / 13.04` | `6.0294%` @f50 | `9` | `0.1018 / 1.9991` | `0.2496` | `0.0006` | `2.7457` | FAIL (`peak>5%`, `rmsVel`) |
| `GATHERED` / `ARCH2` | `EXP1` | `16.63 / 23.22` | `5.6270%` @f45 | `3` | `0.0684 / 1.6613` | `0.2347` | `0.0006` | `2.7541` | FAIL (`meanMs`, `peak`, `rmsVel`) |
| `GATHERED` / `ARCH2` | `EXP2` | `14.46 / 18.41` | `5.2825%` @f57 | `3` | `0.0883 / 2.2705` | `0.1741` | `0.0003` | `2.5559` | FAIL (`peak=5.28%`, `rmsVel`) |
| `GATHERED` / `ARCH2` | `EXP3` | `21.39 / 34.26` | **`4.5000%`** @f49 | **`0`** | `0.0678 / 1.9904` | `0.2003` | `0.0005` | `2.6254` | FAIL (`CPU`, `rmsVel`) |
| `GATHERED` / `ARCH3` | `H1B_ORIGINAL` | `9.02 / 13.42` | `8.2761%` @f2 | `5` | `0.0933 / 1.6075` | `0.2327` | `0.0010` | `1.1633` | FAIL (`peak=8.28%`, `rmsVel`) |
| `GATHERED` / `ARCH3` | `EXP1` | `15.06 / 21.78` | `5.0646%` @f6 | `1` | `0.0668 / 1.5964` | `0.2407` | `0.0012` | `1.2501` | FAIL (`peak=5.06%`, `rmsVel`) |
| `GATHERED` / `ARCH3` | `EXP2` | `14.48 / 18.89` | **`4.4645%`** @f34 | **`0`** | `0.0755 / 1.0301` | `0.1740` | `0.0005` | `1.4585` | FAIL (`rmsVel` solamente) |
| `GATHERED` / `ARCH3` | `EXP3` | `20.71 / 26.94` | **`3.8138%`** @f6 | **`0`** | `0.0593 / 1.3710` | `0.2303` | `0.0007` | `1.2146` | FAIL (`CPU`, `rmsVel`) |
| `SCENE0` / `ARCH2` (`control 3s`) | `H1B` / `EXP1` / `EXP2` / `EXP3` | `9.95 / 14.74 / 15.52 / 20.91` | `3.55 / 3.93 / 4.13 / 3.05%` | `0` | `0.04/1.49` .. `0.02/0.94` | `0.186 / 0.180 / 0.182 / 0.178` | `0.0002–0.0003` | `0.20–0.38` | Todos `rmsVel>0.08` a `t=2–3s` |

**Hallazgo físico crítico sobre `rmsVel`:**
1. **`Bend-First + Rayleigh` (`EXP2`) resolvió el choque flexural inicial de `ARCH3`:** cayó de `8.2761%` @f2 (`H1B`) a `4.4645%` (`0` frames `> 5%`), preservando incluso mejor los pliegues (`|φ|` medio `1.4585°` vs `1.1633°`). En `ARCH2`, el pico bajó de `6.03%` a `5.28%` (`EXP2`) y a `4.50%` con strain guard (`EXP3`).
2. **Por qué `rmsVel ~ 0.174–0.186 m/s` persiste en todos los solvers en `t = 2.0–3.0 s`:** la escena de control `SCENE0_HANGING_32` también marca `0.180–0.186 m/s` con los 4 solvers (`E_kin = 0.0002 J`). Rayleigh interno XPBD es invariante ante movimiento de cuerpo rígido ($\dot{C} = 0$) y, por tanto, **no frena el balanceo pendular macroscópico de una cortina colgante**; ese modo pendular solo decae mediante arrastre aerodinámico externo (`airDampingPerS = 1.8 s^-1`) o mayor horizonte temporal (en T2/T2.2 se midió a `10 s`, no `3 s`). No se trata de vibración numérica interna.

---

### 4.3 Defecto 3 — Panel Frontal sobre Torso (`BODICE_ALT_C`, `5.0 s`, `Alt C SDF` + Auditoría GT BVH `96×108`)

| Tejido | Solver | Mean / P95 (`ms`) | Col (`ms`) | `peakTrans` (`%`) @f | Frames `>5%` | `eqMean` / `eqMax` (`%`) | `eqRmsVel` (`m/s`) | GT Eq Max (`mm`) / Sev (`>3mm`) | Gap Sub-busto (`mm`) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `ARCH1` (55 gsm) | `H1B` | `10.61 / 15.26` | `0.63` | `5.7791%` @22 | `3` | `0.1441 / 4.7084` | `0.0463` | `0.0000 / 0` | `10.25` |
| `ARCH1` (55 gsm) | `EXP1` | `14.26 / 20.26` | `0.59` | `5.1404%` @22 | `1` | `0.1044 / 4.3146` | `0.0494` | `0.0000 / 0` | `10.65` |
| `ARCH1` (55 gsm) | `EXP2` | `15.81 / 19.41` | `0.55` | `6.0477%` @22 | `2` | `0.1179 / 4.8026` | `0.0449` | `0.0000 / 0` | `11.11` |
| `ARCH1` (55 gsm) | `EXP3` | `23.20 / 29.36` | `1.29` | **`4.0002%`** @21 | **`0`** | `0.0953 / 3.3122` | `0.0460` | `0.0000 / 0` | `10.80` |
| `ARCH2` (160 gsm) | `H1B` | `9.96 / 13.31` | `0.54` | `5.4509%` @22 | `2` | `0.1520 / 4.0559` | `0.0126` | `0.0000 / 0` | `11.32` |
| `ARCH2` (160 gsm) | `EXP1` | `13.66 / 17.38` | `0.55` | `5.0633%` @21 | `1` | `0.1069 / 2.5907` | `0.0059` | `0.0000 / 0` | `11.56` |
| `ARCH2` (160 gsm) | `EXP2` | `16.76 / 24.25` | `0.60` | **`4.7520%`** @21 | **`0`** | `0.1225 / 2.8228` | `0.0058` | `0.0000 / 0` | `11.38` |
| `ARCH2` (160 gsm) | `EXP3` | `23.47 / 33.66` | `1.27` | **`4.0519%`** @21 | **`0`** | `0.0988 / 2.0134` | `0.0054` | `0.0000 / 0` | `11.74` |
| `ARCH3` (310 gsm) | `H1B` | `10.27 / 18.38` | `0.54` | `5.8186%` @21 | `4` | `0.1705 / 3.6668` | `0.0358` | `0.0000 / 0` | `12.34` |
| `ARCH3` (310 gsm) | `EXP1` | `13.78 / 18.44` | `0.53` | `5.6862%` @20 | `1` | `0.1141 / 2.9212` | `0.0224` | `0.0000 / 0` | `12.64` |
| `ARCH3` (310 gsm) | `EXP2` | `17.29 / 22.03` | `0.58` | `5.9942%` @20 | `2` | `0.1305 / 2.8796` | `0.0074` | `0.0000 / 0` | `12.44` |
| `ARCH3` (310 gsm) | `EXP3` | `23.38 / 30.71` | `1.24` | **`4.1915%`** @20 | **`0`** | `0.1043 / 2.4394` | `0.0186` | `0.0000 / 0` | `12.89` |
| `ARCH4_FACE_UP` | `H1B` | `9.99 / 13.60` | `0.53` | `6.6621%` @20 | `21` | `0.1807 / 5.5329` ❌ | `0.0718` | `0.0000 / 0` | `11.99` |
| `ARCH4_FACE_UP` | `EXP1` | `13.46 / 16.81` | `0.51` | `5.8390%` @22 | `10` | `0.1254 / 5.6093` ❌ | `0.0761` | `0.0000 / 0` | `12.54` |
| `ARCH4_FACE_UP` | `EXP2` | `16.20 / 22.52` | `0.56` | `6.1287%` @34 | `3` | `0.1295 / 3.1336` ✅ | **`0.0072`** | `0.0000 / 0` | `12.12` |
| `ARCH4_FACE_UP` | `EXP3` | `22.88 / 30.18` | `1.24` | **`4.5000%`** @20 | **`0`** | `0.1066 / 2.5849` ✅ | `0.0166` | `0.0000 / 0` | `12.55` |

**Interpretación cuantitativa de `BODICE_ALT_C`:**
- **Calidad física y penetración GT:** En **todos** los solvers `GT Eq Max = 0.0000 mm` y `0` frames severos. El contraste estructural (`subBustAirGapMm`: `ARCH1 < ARCH2 < ARCH3`) se mantiene estrictamente monótono en los cuatro solvers.
- **Efecto de `EXP2`:** Bajó `ARCH2` debajo de `5%` (`4.7520%`, `0` frames `>5%`), desplomó el `rmsVel` de `ARCH4_FACE_UP` en `10×` (`0.0718 -> 0.0072 m/s`) y bajó su máximo de equilibrio de `5.5329%` (**FAIL**) a `3.1336%` (**PASS**), reduciendo frames `>5%` de `21` a `3`. Sin embargo, quedó justo en el límite o levemente por encima de `16 ms` (`15.81–17.29 ms`) porque `4 bidir fine sweeps × 12 substeps` duplicó las pasadas finas frente a `H1B` (`7.2–8.0 ms` solo en `stretchMean` vs `3.0 ms` en `H1B`).
- **Efecto de `EXP3` (`Strain Guard` + `16 substeps`):** Demostró que el pico de impacto contra busto (`4.00%–4.50%`, `0` frames `> 5%`) sí es físicamente acotable sin crear penetraciones GT (`0.0000 mm`). El exceso de tiempo en `EXP3` (`23 ms`) provino de combinar `16` subpasos con `4` iteraciones finas (`64` pasadas/frame, `stretchMean = 9.9 ms`, `bendingMean = 6.0 ms`); el *Strain Guard activo* en sí apenas costó **`0.70–0.74 ms`**.

---

### 4.4 Defecto 4 — Hombros Anclados (`SHOULDER_ANCHORED`) y Capa Libre 0-Pines sobre Cuello (`SHOULDER_CAPE_0PIN`)

| Escena / Tejido | Solver | Mean / P95 (`ms`) | `peakTrans` (`%`) | Frames `>5%` | `eqMean` / `eqMax` (`%`) | `eqRmsVel` (`m/s`) | GT Max All / Eq (`mm`) | GT Sev Frames | Caída Centro (`m`) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `SH_ANCH` / `ARCH2` | `H1B` | `9.47 / 11.99` | `29.1694%` | `297` | `0.3235 / 12.2190` | `0.0113` | `1.44 / 0.50` | `0` | `0.2715` |
| `SH_ANCH` / `ARCH2` | `EXP1` | `13.44 / 16.60` | `17.6611%` | `296` | `0.2237 / 9.0355` | `0.0178` | `1.26 / 0.20` | `0` | `0.2657` |
| `SH_ANCH` / `ARCH2` | `EXP2` | `16.75 / 24.61` | `26.0469%` | `297` | `0.2561 / 11.8806` | `0.0235` | `1.28 / 0.00` | `0` | `0.2674` |
| `SH_ANCH` / `ARCH2` | `EXP3` | `23.20 / 30.65` | `8.8052%` | `38` | `0.2064 / 4.5163` ✅ | `0.0044` | `0.79 / 0.00` | `0` | `0.2656` |
| `SH_ANCH` / `ARCH3` | `H1B` | `10.20 / 13.89` | `20.1136%` | `297` | `0.2882 / 9.3991` | `0.0070` | `1.38 / 0.02` | `0` | `0.2740` |
| `SH_ANCH` / `ARCH3` | `EXP1` | `14.22 / 19.08` | `13.9264%` | `297` | `0.1877 / 6.6154` | `0.0079` | `1.57 / 0.00` | `0` | `0.2698` |
| `SH_ANCH` / `ARCH3` | `EXP2` | `15.86 / 22.50` | `14.2791%` | `297` | `0.2192 / 7.9420` | `0.0053` | `1.49 / 0.00` | `0` | `0.2701` |
| `SH_ANCH` / `ARCH3` | `EXP3` | `23.43 / 30.03` | `7.4163%` | `8` | `0.1778 / 4.5000` ✅ | `0.0065` | `0.73 / 0.00` | `0` | `0.2688` |
| `SH_0PIN` / `ARCH1` | `H1B` | `10.56 / 14.19` | `19.0964%` | `291` | `0.2918 / 11.7816` | `0.0194` | `3.03 / 3.02` ❌ | **`1`❌** | `0.2936` |
| `SH_0PIN` / `ARCH1` | `EXP1` | `14.52 / 18.63` | `13.8779%` | `289` | `0.2318 / 13.3171` | `0.0009` | `2.44 / 1.32` ✅ | **`0`✅** | `0.2568` |
| `SH_0PIN` / `ARCH1` | `EXP2` | `16.01 / 20.13` | `14.2684%` | `289` | `0.2444 / 11.3414` | `0.0172` | `2.30 / 2.30` ✅ | **`0`✅** | `0.2861` |
| `SH_0PIN` / `ARCH1` | `EXP3` | `25.49 / 38.85` | `10.2251%` | `290` | `0.2424 / 9.1743` | `0.0213` | `1.38 / 1.17` ✅ | **`0`✅** | `0.2489` |
| `SH_0PIN` / `ARCH3` | `H1B` / `EXP1` / `EXP2` / `EXP3` | `10.90` .. `22.21` | `22.63` .. `7.48%` | `121..14` | `0.002–0.018 / 0.08–1.12` | `5.20–5.42` (resbala) | `0.00 mm` eq | `0` | `11.9–18.3 m` (desliza) |

**Evidencia definitiva obtenida en T4.1 sobre Hombros y Cuello:**
1. **`EXP1`, `EXP2` y `EXP3` eliminaron la penetración severa GT (`> 3 mm`) que `H1B` arrastraba desde T3** en `SHOULDER_CAPE_0PIN` (`3.0267 mm / 1 frame severo` en `H1B` bajó a `1.32 mm`, `2.30 mm` y `1.17 mm` con `0` frames severos en `EXP1/2/3`).
2. **`EXP3` demostró que el remanente en equilibrio (`~11%`) en `SHOULDER_ANCHORED` es singularidad geométrica de pines puntuales, no divergencia numérica:** bajo strain guard duro a `4.5%` + doble colisión, el equilibrio baja a `4.50%–4.52%` sin penetración (`0.00 mm` GT eq), mientras el pico transitorio al tensar en `f14–16` (`7.42%–8.81%`) refleja la carga concentrada de todo un cuadrante sobre un único vértice anclado (`invMass = 0`) sin distribución de costura/hombro.
3. **Capa rígida sin escote ni pines (`SH_0PIN / ARCH3`):** desliza del torso en los 4 solvers (`11.9–18.3 m` de caída libre por gravedad sobre geometría de silla de montar con `μ = 0.35`, sin sisa ni escote). **No es un fallo numérico del solver**: un tablero rígido plano sin patrón cerrado cae físicamente de unos hombros inclinados.

---

## 5. Control de No Regresión: Asimetría Direccional `FACE_UP / FACE_DOWN` y Contraste

Resultados de `CANTILEVER_16` (`16 × 20 cm @ 16 × 16`, `180 frames`):

| Solver | `FACE_UP` Tip Drop (`m`) | `FORBIDDEN_AVG` Tip Drop (`m`) | `FACE_DOWN` Tip Drop (`m`) | Separación `Diff` (`mm`) | `FACE_UP` Peak Trans (`%`) | Todos `5` perfiles `CANTILEVER_16` | Contraste `BODICE` (`Gap`: Fluid < Med < Struct) |
|---|---:|---:|---:|---:|---:|:---:|:---:|
| `H1B_ORIGINAL` | `0.1109` | `0.1186` | `0.1315` | `20.6` | `9.0261%` ❌ (`18f`) | `4 / 5` (falla `FACE_UP`) | **PASS** (`10.25 < 11.32 < 12.34`) |
| `EXP1_BEND_FIRST_CLEANUP` | `0.1109` | `0.1185` | `0.1316` | `20.7` | `1.4011%` ✅ (`0f`) | **`5 / 5`** | **PASS** (`10.65 < 11.56 < 12.64`) |
| `EXP2_RAYLEIGH_BEND_FIRST` | `0.1172` | `0.1204` | `0.1315` | `14.3` | `1.7566%` ✅ (`0f`) | **`5 / 5`** | **PASS** (`11.11 < 11.38 < 12.44`) |
| `EXP3_SUB16_STRAIN_GUARD_DUAL_COL` | `0.1138` | `0.1194` | `0.1315` | `17.7` | `1.1921%` ✅ (`0f`) | **`5 / 5`** | **PASS** (`10.80 < 11.74 < 12.89`) |

> [!TIP]
> Incluso en `CANTILEVER_16` `ARCH4_ASYM_FACE_UP_STIFF`, `H1B_ORIGINAL` registraba un pico transitorio de `9.03%` (`18` frames `>5%`), mientras `EXP1`, `EXP2` y `EXP3` eliminaron el fallo por completo (`1.19%–1.76%`, `0` frames `>5%`) preservando estrictamente `FACE_UP < FORBIDDEN_AVG < FACE_DOWN` sin colapso al promedio.

---

## 6. Recomendación Técnica para T5 y Separación de Defectos

### 6.1 Candidato Base Recomendado para Avanzar a T5

**Candidato recomendado:** **`EXP2_RAYLEIGH_BEND_FIRST` (orden `Coarse V-cycle -> Colisión -> Bending -> FineStretch bidireccional` + amortiguamiento Rayleigh interno XPBD)**, con un ajuste acotado en T5 para cumplir cómodamente `< 16.0 ms` en torso `32×32`:

- **Por qué gana `EXP2`:** Fue el **único** candidato en lograr cumplimiento estricto en micro-malla (`4.04%`, `13.61 ms`), `5/5` en `CANTILEVER_16` (eliminando el pico `9.03%` en `FACE_UP`), eliminación de penetraciones GT severas (`0` frames `>3 mm` en todas las escenas corporales), reducción de picos en `GATHERED` `ARCH3` (`8.28% -> 4.46%`) y `BODICE` `ARCH2` (`5.45% -> 4.75%`), sin el sobrecosto prohibitivo de `EXP3` (`23.4 ms`).
- **Ajuste exacto sugerido al pasar a T5 (fuera de alcance T4.1, sin agregar más rondas aquí):**
  1. Reducir `fineStretchIterationsPerSubstep` de `4` a **`2`** (como `H1B`, ahorrando `~3.8 ms/frame` para bajar `BODICE 32×32` de `16.2–17.3 ms` a `~12.5–13.5 ms` en JS) **o** activar el *Strain Guard activo* observado en `EXP3` (`0.71 ms` de costo real) solo cuando una arista supere `4.5%` en lugar de duplicar `substeps` a `16`.
  2. Mantener **1 pasada de colisión SDF** (`0.58–0.61 ms`); solo añadir pasada cleanup `μ=0` si el Strain Guard llega a disparar re-penetración (lo cual no ocurrió en `BODICE`, donde ya es `0.0000 mm` GT).

### 6.2 Separación Explícita: Defectos Bloqueantes vs. Limitaciones Documentables

#### A. Aspectos resueltos en T4.1 (ya NO bloquean T5 con `EXP2`)
- **Inestabilidad de micro-mallas (`Δx = 2.58 mm`, `B = 180 µN·m`):** RESUELTO (`2831.98% -> 4.0416%`, `rmsVel = 0.0524 m/s`, `PASS`).
- **Penetraciones GT severas `> 3 mm` en colisión corporal `Alt C SDF`:** RESUELTO (`0` frames severos en las 4 arquitecturas en `BODICE`, `SHOULDER_ANCHORED` y `SHOULDER_CAPE_0PIN` con `EXP1/2/3`, cerrando el último `3.0267 mm` de `H1B`).
- **Pico flexural `FACE_UP` en `CANTILEVER_16` y choque inicial de `GATHERED ARCH3`:** RESUELTO (`9.03% -> 1.76%` y `8.28% -> 4.46%`).

#### B. Defectos abiertos reales (a vigilar/acotar en T5 — NO permiten declarar Gate 1 cerrado aún)
1. **Presupuesto CPU límite (`15.81–17.29 ms` vs `16.0 ms`) en `EXP2` con `4 bidir fine iters` sobre torso `32×32`:** superable reduciendo `N_fine` a `2–3` o aplicando `Strain Guard` ligero (`0.71 ms`) sin subir a `16` substeps.
2. **Picos de impacto breves (`5.99%–6.13%` durante `2–3` frames) en `BODICE` `ARCH3/ARCH4_FACE_UP` y `5.28%` en `GATHERED ARCH2` bajo `EXP2`:** quedan inmediatamente resueltos cuando se activa el *Strain Guard* acotado (probado en `EXP3`: `4.00%–4.50%`, `0` frames `>5%`, costo aislable `~0.71 ms`), quedando pendiente probar en T5 esa combinación (`12 sub + 2/3 fine + Rayleigh + StrainGuard`) si se exige tolerancia estricta en todos los frames transitorios.
3. **Asentamiento de cortina colgante en ventanas cortas de `3.0 s` (`rmsVel = 0.174–0.182 m/s`):** obedece al balanceo pendular macroscópico con `airDampingPerS = 1.8 s^-1` (incluso en `SCENE0` de control con todos los solvers); en T5/escenas de prenda debe evaluarse equilibrio tras asentamiento suficiente (`≥ 5 s`) o con fricción corporal / arrastre acorde al entorno.

#### C. Limitaciones geométricas documentables de escenas PoC T3/T4 (NO son fallos del solver XPBD)
1. **`SHOULDER_ANCHORED_ALT_C` (2 pines puntuales de 1 vértice cargando un paño de `62×62 cm`):** incluso con `16 substeps + Strain Guard 4.5% + doble colisión` (`EXP3`), el transitorio en la arista adyacente al pin alcanza `7.42%–8.81%`. Es una singularidad discreta de condición de contorno de punto único (`invMass = 0`), no corregible por el integrador sin distribuir el soporte (banda acromial de varios vértices o costura anatómica en T5).
2. **`SHOULDER_CAPE_0PIN_ALT_C` (paño cuadrado plano cerrado sobre cuello/hombros sin escote):**
   - En tela fluida (`ARCH1`), cubrir una silla de montar doblemente curva sin pinzas ni abertura de escote fuerza acortamiento geodésico local (`9.17%–11.34%` en `EXP2/EXP3`).
   - En tela estructurada rígida (`ARCH3`, `310 gsm`, `0` pines), un tablero plano sin forma resbala físicamente de los hombros (`11.9–18.3 m`, `5.2 m/s`) en todos los solvers. Ambos comportamientos confirman física coherente del contacto y la necesidad de usar patrones reales con abertura de cuello/sisas en T5.

