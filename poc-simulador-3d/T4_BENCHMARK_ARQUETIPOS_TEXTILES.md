# T4 — Benchmark de Arquetipos Textiles y Comportamiento Asimétrico `FACE_UP / FACE_DOWN`

**Estado:** COMPLETADO (aislado en `poc-simulador-3d/`, sin modificar producción, M00–M07, BD ni `results/t2*`, `results/t3/`)  
**Fecha:** 2026-11-15  
**Solver de referencia:** `H1B_VCYCLE_12SUB` ([`HierarchicalXpbdClothSolver`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts): 12 subpasos/frame a 60 Hz, SoA + pirámide `V-cycle` unilateral + pasadas finas bidireccionales + flexión diédrica con signo, colisión en fase `before-fine-solve`)  
**Proxy de colisión candidato:** `ALT_C_SDF_GRID_3D` ([`torsoCollisionSolvers.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/collision/torsoCollisionSolvers.ts), voxel `12 mm`, trilineal, `thickness = 2.0 mm`, `μ = 0.35`) auditado frame a frame contra Ground Truth `96 × 108` BVH  
**Clasificación de evidencia:** **100% `TIER_3_ESTIMATED` (`SYNTHETIC_CALIBRATION_PLACEHOLDER_NOT_MEASURED_LAB_DATA`)** — perfiles paramétricos sintéticos de referencia numérica; **no constituyen mediciones reales de laboratorio** ni reemplazan la validación textil de Etapa 3 (`3A / 3B / 3C`).

---

## 1. Perfiles Textiles Evaluados (`TIER_3_ESTIMATED`)

Fuente de configuración y resultados: [`t4TextileArchetypesBenchmark.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/tests/t4TextileArchetypesBenchmark.ts), [`t4_summary_report.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/t4_summary_report.json).

| ID Arquetipo | Etiqueta | Calidad Evidencia | Densidad (`g/m²`) | `K_warp/weft` (`N/m`) | `K_shear` (`N/m`) | Rigidez Flexural `B` (`µN·m`) | Propósito en T4 |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `T4_ARCH1_FLUID_LIGHT` | Fluido Ligero | `TIER_3_ESTIMATED` | `55` | `650` | `90` | `SYMMETRIC: 2.5` | Caída muy fluida, pliegues finos y ceñido al torso |
| `T4_ARCH2_MEDIUM_BALANCED` | Medio Balanceado | `TIER_3_ESTIMATED` | `160` | `1200` | `250` | `SYMMETRIC: 20` | Línea base T2/T3 de equilibrio |
| `T4_ARCH3_STRUCTURED_STIFF` | Estructurado Rígido | `TIER_3_ESTIMATED` | `310` | `2400` | `650` | `SYMMETRIC: 180` | Puenteo estructural, menor curvatura y campana ancha |
| `T4_ARCH4_ASYM_FACE_UP_STIFF` | Asimétrico `FACE_UP` Rígido | `TIER_3_ESTIMATED` | `180` | `1300` | `280` | `ASYMMETRIC: B+ = 180 / B- = 6` | Rígido en curvatura `C >= 0` (`FACE_UP`), flexible en `C < 0` |
| `T4_ARCH4_ASYM_FACE_DOWN_STIFF` | Asimétrico `FACE_DOWN` Rígido | `TIER_3_ESTIMATED` | `180` | `1300` | `280` | `ASYMMETRIC: B+ = 6 / B- = 180` | Tejido volteado (`B+ = 6 / B- = 180`) sin colapsar a promedio |
| `T4_ARCH4_FORBIDDEN_AVG_CONTROL` | Control Negativo Promedio | `TIER_3_ESTIMATED` | `180` | `1300` | `280` | `SYMMETRIC: 93` | Control prohibido `(180+6)/2` para probar no colapso a promedio |

---

## 2. Escenas Experimentales Ejecutadas

1. **`T4_SCENE0_HANGING_DRAPE`** (`50 × 50 cm`, malla `32 × 32`, 2 esquinas superiores fijas, `5.0 s`, sin colisión): Referencia basal de drapeado vertical por gravedad.
2. **`T4_GATHERED_PLEAT_DRAPE`** (`50 × 50 cm`, malla `32 × 32`, fruncido superior al `82%` = `41 cm` mediante onda senoidal isométrica fuera del plano en `+Y` que preserva al `100%` la longitud de arco `L_0`, `3.0 s`, sin colisión): Inducción de pliegues gravitatorios verticales.
3. **`T4_CANTILEVER_OVERHANG`** (`16 × 20 cm`, malla `16 × 16`, escala de elemento tipo prenda `Δx = 10.67 mm`, empotrada en `r = 0..5` -> `13.33 cm` libres en voladizo, normal inicial `+Y` -> `C_bend >= 0`, `3.0 s`, sin colisión): Separación flexural pura y prueba directa `FACE_UP`.
4. **`T4_CONCAVE_HAMMOCK` (Voladizo Invertido `FACE_DOWN`)** (`16 × 20 cm`, malla `16 × 16`, misma geometría invertida cara abajo al inicio vía `(x, 1.0, z) -> (-x, 1.0, z)` preservando `L_0`, normal `-Y` -> `C_bend < 0`, `3.0 s`, sin colisión): Verifica que un mismo perfil asimétrico conmute automáticamente entre `B+` y `B-` al voltear la tela.
5. **`T4_TORSO_FRONT_BODICE_ALT_C`** (`36 × 72 cm`, malla `32 × 32`, 2 tirantes, inclinación `+21°` idéntica a `T3_FRONT_BODICE_PANEL`, `5.0 s`, Alt C SDF): Conformado anatómico sobre clavícula, busto, hueco sub-busto y cintura.
6. **`T4_TORSO_SHOULDER_CAPE_ALT_C`** (`62 × 62 cm`, malla `32 × 32`, `0` pines idéntica a `T3_SHOULDER_DROP`, `5.0 s`, Alt C SDF): Control de caída libre sin sujeción sobre hombros.
7. **`T4_TORSO_SHOULDER_ANCHORED_ALT_C`** (`62 × 62 cm`, malla `32 × 32`, 2 anclajes acromiales en `r = 15, c = 9` y `c = 22`, `5.0 s`, Alt C SDF): Comparación de campana vs. caída envolvente cuando la tela rígida queda sujeta en hombros.

---

## 3. Métricas Cuantitativas por Escena y Arquetipo (`28` corridas principales)

Criterios evaluados por corrida:
- `t4Func`: `zeroNan && equilibriumMeanStretch <= 2% && (no torso o 0/90 frames eq > 3 mm) && (con cuerpo o voladizo: rmsVel <= 0.08 m/s)` (para `T4_GATHERED_PLEAT_DRAPE` se reporta el criterio estricto completo de asentamiento `rmsVel <= 0.08 m/s`, ver detalle abajo).
- `gate1Strict`: Exige adicionalmente `totalStepMean <= 16 ms`, `p95 <= 25 ms`, `collisionMean <= 6 ms`, `equilibriumMaxStretch <= 5%`, `transientPeakStretch <= 5%` y `equilibriumRmsVelocity <= 0.08 m/s`.

### 3.1 Escenas sin colisión corporal

| Escena | Arquetipo | Métrica principal drapeado | `dihedralMean` (°) | `totMean / p95` (ms) | `eqMean / peakEq / peakTrans` (%) | `rmsVel` (m/s) | `E_kin / E_bend` (J) | `NaN` | `t4Func` / `gate1Strict` |
| --- | --- | --- | ---: | ---: | --- | ---: | --- | ---: | --- |
| `T4_SCENE0_HANGING_DRAPE` | Fluido Ligero | `drop = 0.5001 m`, onda `5.38 mm` | `0.5313` | `9.56 / 12.79` | `0.0366 / 1.9794 / 4.3322` | `0.0536` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_SCENE0_HANGING_DRAPE` | Medio | `drop = 0.5002 m`, onda `4.67 mm` | `0.2725` | `9.20 / 11.77` | `0.0356 / 1.0153 / 3.5472` | `0.0549` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_SCENE0_HANGING_DRAPE` | Estructurado | `drop = 0.5002 m`, onda `2.38 mm` | `0.0486` | `9.46 / 12.98` | `0.0300 / 0.7400 / 2.1560` | `0.0342` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_SCENE0_HANGING_DRAPE` | Asim `FACE_UP` Rígido | `drop = 0.5002 m`, onda `4.00 mm` | `0.3224` | `10.31 / 17.32` | `0.0335 / 1.4113 / 3.1271` | `0.0430` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_SCENE0_HANGING_DRAPE` | Asim `FACE_DOWN` Rígido | `drop = 0.5001 m`, onda `4.19 mm` | `0.4294` | `8.96 / 10.69` | `0.0345 / 1.5225 / 3.9916` | `0.0420` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_SCENE0_HANGING_DRAPE` | Control Avg (`93 µN·m`) | `drop = 0.5002 m`, onda `1.59 mm` | `0.0434` | `9.22 / 11.60` | `0.0335 / 0.8001 / 2.1877` | `0.0342` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_GATHERED_PLEAT_DRAPE` | Fluido Ligero | onda `99.89 mm` (`3` ext.) | `3.4633` | `8.98 / 10.91` | `0.1248 / 3.8283 / 8.2099` | `0.1774` | `0.0000 / 0.0001` | `0` | **FAIL / FAIL** *(pendul. a 3 s + pico esquinas)* |
| `T4_GATHERED_PLEAT_DRAPE` | Medio | onda `57.92 mm` (`3` ext.) | `2.7457` | `9.53 / 12.43` | `0.1018 / 1.9991 / 6.0294` | `0.2496` | `0.0006 / 0.0005` | `0` | **FAIL / FAIL** *(pendul. a 3 s + pico esquinas)* |
| `T4_GATHERED_PLEAT_DRAPE` | Estructurado | onda `74.89 mm` (`1` ext.) | `1.1633` | `9.49 / 13.75` | `0.0933 / 1.6075 / 8.2761` | `0.2327` | `0.0010 / 0.0008` | `0` | **FAIL / FAIL** *(pendul. a 3 s + pico esquinas)* |
| `T4_CANTILEVER_OVERHANG` | Fluido Ligero | `tipDrop = 0.1306 m`, alc. `14.32%` (`81.68°`) | `2.1924` | `1.53 / 2.78` | `0.0415 / 0.8948 / 1.5823` | `0.0623` | `0.0000 / 0.0000` | `0` | **PASS / PASS** |
| `T4_CANTILEVER_OVERHANG` | Medio | `tipDrop = 0.1272 m`, alc. `19.51%` (`78.44°`) | `2.1242` | `2.38 / 4.02` | `0.0588 / 1.1439 / 1.9535` | `0.0472` | `0.0000 / 0.0003` | `0` | **PASS / PASS** |
| `T4_CANTILEVER_OVERHANG` | Estructurado | `tipDrop = 0.1169 m`, alc. `35.62%` (`67.89°`) | `2.1425` | `1.48 / 2.34` | `0.1032 / 2.0386 / 4.3215` | `0.0457` | `0.0000 / 0.0014` | `0` | **PASS / PASS** |
| `T4_CANTILEVER_OVERHANG` | Asim `FACE_UP` Rígido | `tipDrop = 0.1109 m`, alc. `44.41%` (`61.90°`) | `2.1233` | `1.43 / 1.81` | `0.1168 / 3.7695 / 9.0261` | `0.0430` | `0.0000 / 0.0012` | `0` | **PASS / FAIL** *(pico trans > 5%)* |
| `T4_CANTILEVER_OVERHANG` | Asim `FACE_DOWN` Rígido | `tipDrop = 0.1315 m`, alc. `11.34%` (`83.44°`) | `2.0456` | `1.42 / 1.76` | `0.0339 / 0.5170 / 1.8702` | `0.0566` | `0.0000 / 0.0001` | `0` | **PASS / PASS** |
| `T4_CANTILEVER_OVERHANG` | Control Avg (`93 µN·m`) | `tipDrop = 0.1186 m`, alc. `32.37%` (`69.99°`) | `2.1858` | `1.48 / 2.14` | `0.1002 / 1.8436 / 3.8701` | `0.0461` | `0.0000 / 0.0008` | `0` | **PASS / PASS** |
| `T4_CONCAVE_HAMMOCK` *(Inv. `-Y`)* | Asim `FACE_UP` Rígido | `tipDrop = 0.1315 m`, alc. `11.34%` (`83.44°`) | `2.0456` | `1.45 / 2.05` | `0.0339 / 0.5170 / 1.8702` | `0.0566` | `0.0000 / 0.0001` | `0` | **PASS / PASS** |
| `T4_CONCAVE_HAMMOCK` *(Inv. `-Y`)* | Asim `FACE_DOWN` Rígido | `tipDrop = 0.1109 m`, alc. `44.41%` (`61.90°`) | `2.1233` | `1.71 / 3.39` | `0.1168 / 3.7695 / 9.0261` | `0.0430` | `0.0000 / 0.0012` | `0` | **PASS / FAIL** *(pico trans > 5%)* |
| `T4_CONCAVE_HAMMOCK` *(Inv. `-Y`)* | Control Avg (`93 µN·m`) | `tipDrop = 0.1186 m`, alc. `32.37%` (`69.99°`) | `2.1858` | `1.39 / 1.74` | `0.1002 / 1.8436 / 3.8701` | `0.0461` | `0.0000 / 0.0008` | `0` | **PASS / PASS** |

> **Nota sobre `T4_GATHERED_PLEAT_DRAPE`:** Con la onda inicial isométrica en `Y` (sin compresión inicial de aristas `L_0`), la curvatura residual separa limpiamente los tres arquetipos (`3.4633° > 2.7457° > 1.1633°`), pero a `t = 3.0 s` el paño libre todavía conserva oscilación pendular (`rmsVel = 0.1774–0.2496 m/s > 0.08`) y picos transitorios en los 2 nodos de esquina (`6.03%–8.28% > 5%`), por lo que queda marcado honestamente como `FAIL`.

### 3.2 Escenas con colisión corporal (`Alt C SDF 3D` + auditoría `BVH 96×108`)

| Escena | Arquetipo | Métrica anatómica / drapeado | `tot / phys / col / p95` (ms) | `eqMean / peakEq / peakTrans` (%) | `gtAllMax / gtEqMax` (mm) | `sevFrames (>3mm)` | `rmsVel` (m/s) | `E_kin / E_bend` (J) | `t4Func` / `gate1Strict` |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `T4_TORSO_FRONT_BODICE_ALT_C` | Fluido Ligero | `airGap = 42.8367 mm`, onda `126.36 mm` | `9.86 / 9.32 / 0.54 / 12.81` | `0.1441 / 4.7084 / 5.7791` | `0.00 / 0.00` | `0 / 90` | `0.0463` | `0.0000 / 0.0001` | **PASS / FAIL** *(trans busto `5.78%`)* |
| `T4_TORSO_FRONT_BODICE_ALT_C` | Medio | `airGap = 45.3904 mm`, onda `122.55 mm` | `10.38 / 9.80 / 0.58 / 14.40` | `0.1520 / 4.0559 / 5.4509` | `0.00 / 0.00` | `0 / 90` | `0.0126` | `0.0000 / 0.0004` | **PASS / FAIL** *(trans busto `5.45%`)* |
| `T4_TORSO_FRONT_BODICE_ALT_C` | Estructurado | `airGap = 48.9580 mm`, onda `106.08 mm` | `9.69 / 9.18 / 0.51 / 12.66` | `0.1705 / 3.6668 / 5.8186` | `0.00 / 0.00` | `0 / 90` | `0.0358` | `0.0001 / 0.0022` | **PASS / FAIL** *(trans busto `5.82%`)* |
| `T4_TORSO_FRONT_BODICE_ALT_C` | Asim `FACE_UP` Rígido | `airGap = 48.2846 mm`, onda `99.68 mm` | `10.23 / 9.70 / 0.53 / 14.02` | `0.1807 / 5.5329 / 6.6621` | `0.00 / 0.00` | `0 / 90` | `0.0718` | `0.0001 / 0.0017` | **PASS / FAIL** *(pico `6.66%`)* |
| `T4_TORSO_FRONT_BODICE_ALT_C` | Asim `FACE_DOWN` Rígido | `airGap = 45.9900 mm`, onda `127.05 mm` | `10.35 / 9.77 / 0.58 / 14.45` | `0.1576 / 3.8250 / 4.8566` | `1.21 / 0.00` | `0 / 90` | `0.0056` | `0.0000 / 0.0004` | **PASS / PASS** |
| `T4_TORSO_SHOULDER_CAPE_ALT_C` | Fluido Ligero (`0` pines) | `rad = 0.1905 m`, `39` lób., amp `165.7 mm` | `10.35 / 9.45 / 0.90 / 13.92` | `0.2918 / 11.7816 / 19.0964` | `3.03 / 3.0159` | **`1 / 90`** | `0.0194` | `0.0000 / 0.0009` | **FAIL / FAIL** *(cuello `3.02 mm` + cizalla)* |
| `T4_TORSO_SHOULDER_CAPE_ALT_C` | Medio (`0` pines) | `rad = 0.2118 m`, `27` lób., amp `167.97 mm` | `10.23 / 9.38 / 0.84 / 14.36` | `0.3524 / 10.4978 / 13.7819` | `2.32 / 2.3174` | `0 / 90` | `0.0317` | `0.0001 / 0.0052` | **PASS / FAIL** *(picos `> 5%`)* |
| `T4_TORSO_SHOULDER_CAPE_ALT_C` | Estructurado (`0` pines) | **Desliza fuera del torso** (`drop = 12.14 m`) | `9.50 / 9.09 / 0.41 / 12.52` | `0.0183 / 1.1197 / 22.6340` | `2.98 / 0.00` | `0 / 90` | **`5.2194`** | **`1.7358 / 0.0000`** | **FAIL / FAIL** *(deslizamiento sin pines)* |
| `T4_TORSO_SHOULDER_ANCHORED_ALT_C` | Fluido (2 acromiales) | `rad = 0.1995 m`, `59` lób., `dih = 9.22°` | `10.02 / 9.31 / 0.71 / 13.33` | `0.3544 / 13.2767 / 23.5441` | `1.21 / 0.7314` | `0 / 90` | `0.0121` | `0.0000 / 0.0010` | **PASS / FAIL** *(tensión acromial/cuello)* |
| `T4_TORSO_SHOULDER_ANCHORED_ALT_C` | Medio (2 acromiales) | `rad = 0.2267 m`, `54` lób., `dih = 6.52°` | `9.84 / 9.25 / 0.59 / 12.67` | `0.3235 / 12.2190 / 29.1694` | `1.44 / 0.4966` | `0 / 90` | `0.0113` | `0.0000 / 0.0040` | **PASS / FAIL** *(tensión acromial/cuello)* |
| `T4_TORSO_SHOULDER_ANCHORED_ALT_C` | Estructurado (2 acromiales) | `rad = 0.2447 m`, `19` lób., `dih = 3.99°` | `9.54 / 9.04 / 0.49 / 12.76` | `0.2882 / 9.3991 / 20.1136` | `1.38 / 0.0235` | `0 / 90` | `0.0070` | `0.0000 / 0.0142` | **PASS / FAIL** *(tensión acromial/cuello)* |

> **Hallazgo físico en hombros:** En `T4_TORSO_SHOULDER_CAPE_ALT_C` (`0` pines sobre hombros curvados con `μ = 0.35`), el paño rígido de `310 g/m²` no abraza la pendiente escapular y resbala por completo fuera del torso (`rmsVel = 5.2194 m/s`, `E_kin = 1.7358 J`). Al añadir 2 puntos de sujeción acromiales (`T4_TORSO_SHOULDER_ANCHORED_ALT_C`), los 3 arquetipos quedan estables (`rmsVel <= 0.0121 m/s`, `0/90` penetraciones `> 3 mm`) y muestran separación clara entre caída ceñida (`0.1995 m`) y campana estructurada (`0.2447 m`), aunque la concentración local alrededor del cuello sin escote y de los 2 pines mantiene picos locales de `20.1%–29.2%`.

---

## 4. Contraste Monotónico y Asimetría Direccional `FACE_UP / FACE_DOWN`

### 4.1 Separación Monotónica entre Arquetipos (`5 / 5 PASS`)

| Escena | Métrica | Fluido (`55 gsm`) | Medio (`160 gsm`) | Estructurado (`310 gsm`) | Separación relativa | Monotónico |
| --- | --- | ---: | ---: | ---: | ---: | :---: |
| `T4_CANTILEVER_OVERHANG` | `tipDropM` (Fluido > Medio > Estruct.) | `0.1306 m` | `0.1272 m` | `0.1169 m` | `10.49%` | **PASS** |
| `T4_GATHERED_PLEAT_DRAPE` | `meanAbsDihedralDeg` (Fluido > Medio > Estruct.) | `3.4633°` | `2.7457°` | `1.1633°` | `66.41%` | **PASS** |
| `T4_TORSO_FRONT_BODICE_ALT_C` | `subBustAirGapMm` (Fluido < Medio < Estruct.) | `42.8367 mm` | `45.3904 mm` | `48.9580 mm` | `12.50%` | **PASS** |
| `T4_TORSO_SHOULDER_ANCHORED_ALT_C` | `perimeterMeanRadiusM` (Fluido < Medio < Estruct.) | `0.1995 m` | `0.2267 m` | `0.2447 m` | `18.47%` | **PASS** |
| `T4_SCENE0_HANGING_DRAPE` | `meanAbsDihedralDeg` (Fluido > Medio > Estruct.) | `0.5313°` | `0.2725°` | `0.0486°` | `90.85%` | **PASS** |

### 4.2 Verificación Direccional Asimétrica sin Colapso a Promedio (`PASS`)

- **Cantilever normal (`+Y`, `C >= 0`):**
  - `T4_ARCH4_ASYM_FACE_UP_STIFF` (`B+ = 180 µN·m` activo): `tipDropM = 0.1109 m` (`alcance 44.41%`).
  - `T4_ARCH4_ASYM_FACE_DOWN_STIFF` (`B+ = 6 µN·m` activo): `tipDropM = 0.1315 m` (`alcance 11.34%`).
  - **Diferencia direccional normal:** **`20.60 mm`** (`PASS > 5.0 mm`).
- **Control negativo prohibido (promedio `B = 93 µN·m`):**
  - `T4_ARCH4_FORBIDDEN_AVG_CONTROL`: `tipDropM = 0.1186 m` — queda estrictamente entre `0.1109 m` y `0.1315 m` (`noAverageCollapsePass = true`).
- **Voladizo invertido cara abajo (`-Y`, `C < 0` en `T4_CONCAVE_HAMMOCK`):**
  - `T4_ARCH4_ASYM_FACE_UP_STIFF` conmuta a `B- = 6 µN·m`: `tipDropM = 0.1315 m`.
  - `T4_ARCH4_ASYM_FACE_DOWN_STIFF` conmuta a `B- = 180 µN·m`: `tipDropM = 0.1109 m`.
  - **Inversión de un mismo perfil (`FACE_UP_STIFF` normal vs. invertido):** pasa de `0.1109 m` a `0.1315 m` (**`+20.60 mm`**, inversión exacta) sin perder la distinción `FACE_UP / FACE_DOWN`.
- **Panel frontal sobre torso (`Alt C SDF`):**
  - `subBustAirGapMm`: `FACE_UP_STIFF = 48.2846 mm` vs. `FACE_DOWN_STIFF = 45.9900 mm` (**`+2.2946 mm`**), demostrando efecto anatómico visible sobre la curvatura convexa del busto.

---

## 5. Análisis de Sensibilidad, Convergencia y Límite de Micro-Malla

1. **Convergencia de flexión en cantilever estructurado (`16 × 16`, `B = 180 µN·m`):**
   - `iter = 1`: `tipDrop = 0.1169 m`, `tot = 1.49 ms`, `peakStretch = 4.3215%`, `E_bend = 0.0014 J`
   - `iter = 2`: `tipDrop = 0.1121 m`, `tot = 2.11 ms`, `peakStretch = 4.0936%`, `E_bend = 0.0011 J`
   - `iter = 4`: `tipDrop = 0.1098 m`, `tot = 3.58 ms`, `peakStretch = 3.6116%`, `E_bend = 0.0010 J`
   - Dispersión `iter=1` vs `iter=4`: **`6.47%`** (`<= 25% PASS`), con menor elongación parásita al iterar bending. Para `B = 350 µN·m`: `0.1061 -> 0.0996 -> 0.0958 m` (`peakStretch = 7.69% -> 6.42%`).
2. **Convergencia en bodice torso (`32 × 32`, `B = 180 µN·m`):**
   - `iter = 1`: `subBustAirGapMm = 48.9580 mm`, `tot = 9.92 ms` (`PASS <= 16 ms`)
   - `iter = 3`: `subBustAirGapMm = 49.3621 mm` (`+0.83%`), pero sube a `tot = 17.71 ms` (`> 16 ms`), justificando mantener `bendingIterationsPerSubstep = 1` en malla `32 × 32` en tiempo real JS.
3. **Barrido de rigidez flexural (`B ∈ [5, 20, 80, 180, 350] µN·m`, `160 gsm` fijo en cantilever):**
   - `tipDropM`: `0.1315 -> 0.1272 -> 0.1189 -> 0.1061 -> 0.1006 m` (monotónico estricto); `E_bend`: `0.0001 -> 0.0003 -> 0.0007 -> 0.0010 -> 0.0017 J`.
   - Nota de diseño: a `gsm = 160`, subir `B >= 180 µN·m` incrementa `peakTrans` de `3.74%` (`B=80`) a `7.68%` (`B=180`) y `10.72%` (`B=350`) porque el paso de flexión es posterior al stretch fino en [`hierarchicalXpbdSolver.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts).
4. **Barrido de masa superficial (`gsm ∈ [80, 160, 320]`, `B = 20 µN·m` fijo):**
   - `tipDropM`: `0.1245 -> 0.1272 -> 0.1296 m`; `peakStretch` baja `2.26% -> 1.95% -> 1.72%` al aumentar la inercia por vértice.
5. **Barrido de cizallamiento (`K_shear ∈ [90, 250, 650] N/m`, Escena 0):**
   - `peakTrans` baja de `5.1287%` (`90 N/m`) -> `3.5472%` (`250 N/m`) -> `2.6748%` (`650 N/m`) a costo prácticamente neutro (`9.11–9.23 ms`).
6. **Hallazgo límite arquitectónico — Micro-malla (`MICRO_MESH_INSTABILITY_LIMIT_CHECK`):**
   - En micro-tira `8 × 12 cm` a resolución `32 × 32` (`Δx = 2.58 mm`, masa nodal `~1–2 mg`) con `B = 180 µN·m`, la corrida `Micro_8x12cm_32x32_dx2.58mm_B=180uNm` exhibe un estallido elástico de aristas (`transientPeakStretchPct = 2900.13%`, `equilibriumMaxStretchPct = 2604.12%`, `rmsVel = 20.36 m/s`, `E_bend = 2.337 J`).
   - **Causa raíz identificada en código:** En `HierarchicalXpbdClothSolver.stepFrameTimed()`, [`solveBendingSoA()`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts#L714-L824) se ejecuta **después** de `solveFineStretchSoA()` y antes del cálculo de velocidades `vel = (pred - pos) * invDt`. Con elementos milimétricos (`Δx <= 3 mm`) y alto `B` sobre masas de miligramos, la proyección diédrica induce correcciones transversales fuertes sin un reproyectado de aristas posterior en el mismo subpaso.

---

## 6. Inspección Visual WebGL Comparativa

Las 5 capturas comparativas renderizadas con Three.js (`headless` Chromium/Edge) en [`results/t4/captures/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/captures) muestran visualmente cada efecto:

1. **Cortina fruncida (`82%`, `t = 3.0 s`):** [`t4_01_gathered_drape_compare_t3s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/captures/t4_01_gathered_drape_compare_t3s.png) — caída angosta y plegada en Fluido (`3.46°`) vs. faldón abierto en Estructurado (`1.16°`).
2. **Voladizo cantilever y asimetría (`t = 3.0 s`):** [`t4_02_cantilever_and_asymmetry_t3s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/captures/t4_02_cantilever_and_asymmetry_t3s.png) — las 6 tiras en fila exhiben progresión de arco desde Fluido (`0.1306 m`) a Estructurado (`0.1169 m`), la arcada rígida de `FACE_UP_STIFF` (`0.1109 m`), la caída libre de `FACE_DOWN_STIFF` (`0.1315 m`) y el control promedio (`0.1186 m`) estrictamente intermedio.
3. **Bodice frontal sobre torso (`Alt C SDF`, `t = 5.0 s`):** [`t4_03_torso_bodice_altC_compare_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/captures/t4_03_torso_bodice_altC_compare_t5s.png) — adherencia sub-mamaria progresiva (`42.84 mm` Fluido < `45.39 mm` Medio < `48.96 mm` Estructurado), `0.00 mm` de penetración en equilibrio y cero solapamientos visuales.
4. **Capa anclada en hombros (`Alt C SDF`, `t = 5.0 s`):** [`t4_04_torso_shoulder_anchored_altC_compare_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/captures/t4_04_torso_shoulder_anchored_altC_compare_t5s.png) — caída ceñida multi-lóbulo en Fluido (`0.1995 m`, `59` lóbulos) frente a campana rígida rectangular en Estructurado (`0.2447 m`, `19` lóbulos).
5. **Perfil lateral asimétrico sobre busto (`t = 5.0 s`):** [`t4_05_torso_bodice_asymmetric_side_t5s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t4/captures/t4_05_torso_bodice_asymmetric_side_t5s.png) — el perfil `FACE_UP` rígido puentea en línea recta bajo el busto (`48.28 mm`), mientras `FACE_DOWN` rígido se adapta al contorno (`45.99 mm`).

---

## 7. Veredicto Honesto T4 y Estado de Gate 1

| Indicador | Resultado T4 | Detalle |
| --- | :---: | --- |
| `t4TextileDifferentiationPass` | **TRUE** (`5 / 5`) | Separación monotónica Fluido / Medio / Estructurado verificada en las 5 métricas contrastadas. |
| `t4AsymmetryDirectionalPass` | **TRUE** | Separación `FACE_UP / FACE_DOWN` (`20.60 mm` cantilever normal e invertido; `+2.29 mm` sub-busto) sin colapso al promedio (`noAverageCollapsePass = true`). |
| `t4StructuredConvergencePass` | **TRUE** | Estable en escala prenda (`0` NaN, dispersión iteración `6.47% <= 25%`), documentando límite en micro-malla `<= 3 mm`. |
| **Aprobación estricta de Gate 1 (`strictGate1CanBeDeclaredApproved`)** | **FALSE (NO APROBABLE AÚN)** | Permanecen **ABIERTOS** los picos locales `> 5%` de T3 y T4 bajo colisión corporal (`5.45%–5.82%` transitorio en bodice frontal, `20.1%–29.2%` en pines acromiales/cuello sin escote), el resbalamiento sin pines con `μ = 0.35`, la oscilación residual en cortina fruncida a `3 s`, el ajuste arquitectónico necesario de orden Stretch-post-Bending para mallas muy finas (`<= 3 mm`) y la ejecución pendiente de **T5 y T6**. |

