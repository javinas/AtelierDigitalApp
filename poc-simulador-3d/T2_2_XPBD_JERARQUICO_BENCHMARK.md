# T2.2 — Evaluación de Arquitectura XPBD Acelerada por Propagación Jerárquica Multinivel

- **Fecha:** 2026-11-15
- **Alcance:** Entorno aislado `poc-simulador-3d/` bajo la **Escena 0 obligatoria de T2** (`0.50 × 0.50 m`, `160 g/m²`, $K_{\text{warp/weft}} = 1200\ \text{N/m}$, $K_{\text{shear}} = 250\ \text{N/m}$, $B = 20\ \mu\text{N}\cdot\text{m}$, $g = -9.80665\ \text{m/s}^2$, `airDamping` $= 1.8\ \text{s}^{-1}$, 2 esquinas fijas, `10 s` = `600 frames` a `60 Hz`).
- **Trazabilidad e inmutabilidad:** Los resultados históricos de T2 ([`T2_BENCHMARK_XPBD_VS_PBD.md`](./T2_BENCHMARK_XPBD_VS_PBD.md), `poc-simulador-3d/results/t2/`) y T2.1 ([`T2_1_DIAGNOSTICO_Y_OPTIMIZACION_XPBD.md`](./T2_1_DIAGNOSTICO_Y_OPTIMIZACION_XPBD.md), `poc-simulador-3d/results/t2_1/`) y todos los umbrales originales permanecen intactos. No se utiliza `V4`, no se altera producción, `M00–M07`, `M02/Flujo B`, `M05`, base de datos, SQL ni `src/components/mannequin3d/`, y no se ejecutan T3–T6.

---

## 1. Artefactos Generados en T2.2

- Solver jerárquico multinivel SoA: [`poc-simulador-3d/solvers/hierarchicalXpbdSolver.ts`](./solvers/hierarchicalXpbdSolver.ts)
- Suite comparativa y prueba direccional: [`poc-simulador-3d/tests/t22HierarchicalBenchmark.ts`](./tests/t22HierarchicalBenchmark.ts)
- Ejecutor aislado T2.2: [`poc-simulador-3d/tests/run_t2_2_benchmark.cjs`](./tests/run_t2_2_benchmark.cjs)
- Resumen cuantitativo y telemetría aislada (13 archivos en `poc-simulador-3d/results/t2_2/`): [`t22_benchmark_summary.json`](./results/t2_2/t22_benchmark_summary.json) + 12 JSON de telemetría por corrida (`16×16` y `32×32`, `600` frames cada uno).

---

## 2. Ecuaciones y Arquitectura del Solver Acelerado (`HierarchicalXpbdClothSolver`)

### 2.1 Disposición de memoria *Struct-of-Arrays* (SoA)
Todas las aristas y bisagras se almacenan en arreglos tipados contiguos (`Uint32Array`, `Float64Array`) sin objetos en heap dentro del bucle crítico de simulación ni indirecciones de propiedades.

### 2.2 Jerarquía Multinivel de Estiramiento (`V-cycle` grueso $\to$ fino)
Para una malla de resolución $N \times N$ (`16×16` o `32×32`), se construyen niveles gruesos ordenados de mayor a menor paso $s_l \in \{16, 8, 4, 2\}$ ($3\times 3$, $5\times 5$, $9\times 9$ en `16×16`; $3\times 3$, $5\times 5$, $9\times 9$, $17\times 17$ en `32×32`), conservando siempre ambos extremos `0` y `N-1` (incluidos los dos anclajes puntuales).

1. **Restricción conservativa de masa nodal:**
   Cada vértice fino $v$ distribuye su masa $m_v$ mediante pesos bilineales $\sum_{q=1}^4 w_{v,q}^{(l)} = 1$ sobre sus 4 padres gruesos:
   $$M_I^{(l)} = \sum_{v} w_{v,I}^{(l)}\,m_v\ [\text{kg}], \qquad \sum_I M_I^{(l)} = M_{\text{total}}, \qquad W_I^{(l)} = \begin{cases} 0 & \text{si } w_{\text{fino}}(v_I) = 0, \\ 1 / M_I^{(l)} & \text{en otro caso.} \end{cases}$$

2. **Compliance XPBD gruesa con escala física consistente:**
   Para cada arista gruesa $(I, J)$ de reposo $L_{0,IJ}^{(l)}$ y ancho tributario dual $b_{e}^{(l)}$ (`weft`, `warp` y diagonales cruzadas `shear`):
   $$k_{\text{edge}, l} = K_{\text{stretch}}\,\frac{b_e^{(l)}}{L_{0,IJ}^{(l)}}\ [\text{N/m}], \qquad \tilde{\alpha}_{e}^{(l)} = \frac{L_{0,IJ}^{(l)}}{K_{\text{stretch}}\,b_e^{(l)}\,\Delta t_s^2}\ [\text{kg}^{-1}].$$

3. **Proyección unilateral gruesa (libre de *locking*):**
   En cada subpaso $\Delta t_s$, para cada nivel $l$ de grueso a fino:
   - Se inyectan posiciones finas actuales $\mathbf{P}_{\text{init}}^{(l)}[I] = \mathbf{p}_{\text{fino}}[v_I]$.
   - Se aplica Gauss-Seidel XPBD bidireccional **únicamente en tracción** ($C_{\text{dist}}^{(l)} = \|\mathbf{P}_I - \mathbf{P}_J\| - L_{0,IJ}^{(l)} > 0$):
     $$\Delta\lambda_e^{(l)} = \frac{-C_{\text{dist}}^{(l)} - \tilde{\alpha}_e^{(l)}\lambda_e^{(l)}}{W_I^{(l)} + W_J^{(l)} + \tilde{\alpha}_e^{(l)}}, \qquad C_{\text{dist}}^{(l)} \le 0 \implies \text{inactivo}.$$
     Al ignorar $C \le 0$ a escala gruesa, los pliegues curvos no reciben fuerza espuria de compresión.

4. **Prolongación bilineal en cascada hacia la malla fina:**
   El incremento $\Delta\mathbf{P}^{(l)} = \mathbf{P}_{\text{solved}}^{(l)} - \mathbf{P}_{\text{init}}^{(l)}$ se transfiere con factor $\omega = 1.0$ a todo vértice fino libre ($w_v > 0$) antes de pasar al siguiente nivel más fino y al suavizado fino bilateral ($L=0$) con multiplicadores finos reiniciados por subpaso ($\lambda_e = 0$ al inicio de $L=0$).

### 2.3 Flexión Diédrica Exacta con Signo (`FACE_UP` / `FACE_DOWN`, sin `V4`)
Se mantiene íntegra la formulación diédrica con signo de T1 (calculada en SoA con $1$ pasada/subpaso):
$$C_{\text{bend}} = \operatorname{atan2}\!\left((\hat{\mathbf{n}}_1 \times \hat{\mathbf{n}}_2)\cdot\hat{\mathbf{e}},\ \hat{\mathbf{n}}_1\cdot\hat{\mathbf{n}}_2\right) - \phi_0, \qquad \tilde{\alpha}_{\text{bend}} = \begin{cases} \tilde{\alpha}_{\text{faceUp}} & \text{si } C_{\text{bend}} \ge 0, \\ \tilde{\alpha}_{\text{faceDown}} & \text{si } C_{\text{bend}} < 0. \end{cases}$$

**Validación direccional explícita en T2.2 (`B_faceUp = 200 µN·m` vs `B_faceDown = 20 µN·m`):**  
Aislando la recuperación elástica pura tras `1` frame (`4` subpasos, restando línea base `1e-12 N·m` para cancelar gravedad/tracción), el solver obtiene razón de recuperación **`9.8212×`** en flexión `FACE_UP` (`0.0014 m` vs `0.0001 m`) y **`9.8138×`** en flexión `FACE_DOWN` (`0.0014 m` vs `0.0001 m`) — `directionalBendingValidation.passed = true`.

---

## 3. Resultados Comparativos (`16×16` y `32×32`, `600 frames` = `10 s`)

| Variante | Malla | `NaN` | CPU Media / `p95` (ms) | Elong. Media Eq. / Trans. Máx. (%) | Elong. Pico Eq. / Trans. Máx. (%) | Caída Centro / Media (m) | Invariancia `16 vs 32` (`centro` / `media` / `RMS 3D`) | Veredicto Global |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`C0_CURRENT_SOA_8X6`** *(actual `8×6`, sin jerarquía)* | `16×16` | `0` | `6.5733` / `11.6885` | `0.1087%` / `0.2650%` | `3.8898%` / `7.8256%` | `0.5028` / `0.2526` | `1.3344%` / `2.5463%` / `1.9849%` (PASS) | **FAIL** *(pico trans. > 5%)* |
| **`C0_CURRENT_SOA_8X6`** | `32×32` | `0` | **`27.6297`** / `44.3802` | `0.3343%` / `0.7819%` | **`21.6659%`** / **`41.6392%`** | `0.5096` / `0.2592` | — | **FAIL** *(CPU y pico > umbral)* |
| **`C1_SOA_NOHIER_16X2`** *(SoA `16×2`, `1` diéd., sin jerarquía)* | `16×16` | `0` | `2.0603` / `2.5042` | `0.1222%` / `0.3134%` | `5.5291%` / `11.5212%` | `0.5031` / `0.2529` | `1.2561%` / `2.3929%` / `1.8325%` (PASS) | **FAIL** *(pico > 5%)* |
| **`C1_SOA_NOHIER_16X2`** | `32×32` | `0` | `9.3416` / `12.5055` | `0.3302%` / `0.7824%` | **`32.5610%`** / **`64.0056%`** | `0.5095` / `0.2591` | — | **FAIL** *(pico eq. y trans. > 5%)* |
| **`H1_VCYCLE_8SUB`** *(V-cycle `8` sub, `4` gr., `4` fin., `1` diéd.)* | `16×16` | `0` | `2.0400` / `3.8436` | `0.0211%` / `0.0836%` | `0.4093%` / `2.1907%` | `0.5003` / `0.2503` | `0.0000%` / `0.0000%` / `1.1450%` (PASS) | `16×16` PASS |
| **`H1_VCYCLE_8SUB`** | `32×32` | `0` | `8.4041` / `11.5665` | `0.0315%` / `0.1482%` | `0.7209%` / **`5.1716%`** | `0.5003` / `0.2503` | — | **FAIL** *(trans. pico 5.1716% > 5%)* |
| **`H1B_VCYCLE_12SUB`** *(V-cycle `12` sub, `3` gr., `2` fin., `1` diéd.)* | `16×16` | `0` | `2.0546` / `2.5808` | `0.0197%` / `0.0906%` | `0.3139%` / `2.0624%` | `0.5002` / `0.2502` | **`0.0200%` / `0.0400%` / `0.5878%`** (**PASS**) | **PASS (100% CUMPLE TODOS)** |
| **`H1B_VCYCLE_12SUB`** | `32×32` | `0` | **`9.5112`** / **`12.7459`** | **`0.0349%`** / **`0.1356%`** | **`0.7737%`** / **`3.5472%`** | `0.5003` / `0.2503` | — | **PASS (100% CUMPLE TODOS)** |
| **`H2_VCYCLE_16SUB`** *(V-cycle `16` sub, `4` gr., `2` fin., `1` diéd.)* | `16×16` | `0` | `3.0573` / `4.2534` | `0.0191%` / `0.0873%` | `0.3551%` / `1.6402%` | `0.5002` / `0.2502` | `0.0200%` / `0.0000%` / `0.9549%` (**PASS**) | **PASS (100% CUMPLE TODOS)** |
| **`H2_VCYCLE_16SUB`** | `32×32` | `0` | **`13.1789`** / `17.3741` | **`0.0252%`** / **`0.1005%`** | **`0.5457%`** / **`2.6972%`** | `0.5003` / `0.2502` | — | **PASS (100% CUMPLE TODOS)** |
| **`H3_VCYCLE_24SUB`** *(V-cycle `24` sub, `4` gr., `2` fin., `1` diéd.)* | `16×16` | `0` | `4.3848` / `5.9132` | `0.0164%` / `0.0753%` | `0.2710%` / `1.2978%` | `0.5002` / `0.2502` | `0.0000%` / `0.0000%` / `0.3769%` (PASS) | `16×16` PASS |
| **`H3_VCYCLE_24SUB`** | `32×32` | `0` | **`19.6354`** / `24.0392` | `0.0180%` / `0.0730%` | `0.3841%` / `2.5560%` | `0.5002` / `0.2502` | — | **FAIL** *(CPU media 19.64 ms > 16 ms)* |

---

## 4. Costo por Fase en `32 × 32` (`ms` medios y `%`)

| Variante (`32×32`) | `predictMs` | `hierarchyMs` | `stretchMs` | `bendingMs` | `commitMs` | Total `physicsStepMs` (`p95`) |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `C0_CURRENT_SOA_8X6` | 0.1053 (0.38%) | 0.0026 (0.01%) | 7.7528 (28.06%) | 19.5681 (70.82%) | 0.2009 (0.73%) | 27.6297 (44.3802) |
| `C1_SOA_NOHIER_16X2` | 0.1510 (1.62%) | 0.0024 (0.03%) | 3.9563 (42.35%) | 5.0637 (54.21%) | 0.1682 (1.80%) | 9.3416 (12.5055) |
| `H1_VCYCLE_8SUB` | 0.0740 (0.88%) | 1.8591 (22.12%) | 3.8640 (45.98%) | 2.5179 (29.96%) | 0.0891 (1.06%) | 8.4041 (11.5665) |
| **`H1B_VCYCLE_12SUB`** | **0.1165 (1.22%)** | **2.4255 (25.50%)** | **3.0032 (31.58%)** | **3.8379 (40.35%)** | **0.1281 (1.35%)** | **9.5112 (12.7459)** |
| **`H2_VCYCLE_16SUB`** | **0.1502 (1.14%)** | **3.7586 (28.52%)** | **3.9754 (30.16%)** | **5.1214 (38.86%)** | **0.1734 (1.32%)** | **13.1789 (17.3741)** |
| `H3_VCYCLE_24SUB` | 0.2275 (1.16%) | 5.5728 (28.38%) | 5.9625 (30.37%) | 7.6156 (38.79%) | 0.2570 (1.31%) | 19.6354 (24.0392) |

---

## 5. Evaluación Estabilidad, Criterios PASS/FAIL y Limitaciones

### 5.1 Estabilidad observada y efecto aislado de la jerarquía
- Comparando **`C1_SOA_NOHIER_16X2`** vs **`H2_VCYCLE_16SUB`** en `32×32` (mismos `16` subpasos, mismas `2` iteraciones finas y `1` diédrica): añadir la propagación jerárquica reduce la elongación pico en equilibrio de **`32.5610%` a `0.5457%`** (~`60×` menor) y el pico transitorio de **`64.0056%` a `2.6972%`** (~`24×` menor), con un sobrecoste de jerarquía de solo `3.7586 ms`.
- En todas las variantes jerárquicas (`H1..H3`), el paño cae suavemente (`centerBottomDropM = 0.5002–0.5003 m`, `meanDropM = 0.2502–0.2503 m`), con `0` vértices `NaN` y caída casi invariante bajo refinamiento `16×16 → 32×32` (`RMS 3D <= 1.15%`, y **`0.5878%`** en `H1B_VCYCLE_12SUB`).

### 5.2 Matriz estricta PASS / FAIL (umbrales originales sin excepción)

| Criterio (`16×16` y `32×32` + invarianza) | `C0_CURRENT_SOA_8X6` | `C1_SOA_NOHIER_16X2` | `H1_VCYCLE_8SUB` | **`H1B_VCYCLE_12SUB`** | **`H2_VCYCLE_16SUB`** | `H3_VCYCLE_24SUB` |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Cero `NaN` (`0`) | PASS | PASS | PASS | **PASS** | **PASS** | PASS |
| Elongación media $\le 2\%$ (eq. y trans.) | PASS | PASS | PASS | **PASS** | **PASS** | PASS |
| Elongación pico eq. $\le 5\%$ (`32×32`) | FAIL (`21.67%`) | FAIL (`32.56%`) | PASS (`0.72%`) | **PASS (`0.77%`)** | **PASS (`0.55%`)** | PASS (`0.38%`) |
| Elongación pico trans. $\le 5\%$ (`32×32`) | FAIL (`41.64%`) | FAIL (`64.01%`) | FAIL (`5.17%`) | **PASS (`3.55%`)** | **PASS (`2.70%`)** | PASS (`2.56%`) |
| Locking Test (`32×32`) | FAIL | FAIL | FAIL | **PASS** | **PASS** | PASS |
| CPU media $\le 16.0\ \text{ms}$ (`32×32`) | FAIL (`27.63`) | PASS (`9.34`) | PASS (`8.40`) | **PASS (`9.51`)** | **PASS (`13.18`)** | FAIL (`19.64`) |
| Invariancia `16×16 vs 32×32` ($\le 10\%$) | PASS (`1.98%`) | PASS (`1.83%`) | PASS (`1.15%`) | **PASS (`0.59%`)** | **PASS (`0.95%`)** | PASS (`0.38%`) |
| Asimetría `FACE_UP/FACE_DOWN` | N/A | PASS | PASS | **PASS (`9.82×`/`9.81×`)** | **PASS** | PASS |
| **VEREDICTO GLOBAL (`32×32` + Invariancia)** | **FAIL** | **FAIL** | **FAIL** | **PASS** | **PASS** | **FAIL** |

### 5.3 Mejor candidato y limitaciones documentadas
- **Mejor candidato técnico:** **`H1B_VCYCLE_12SUB`** (`12` subpasos, `V-cycle [16,8,4,2]` con `3` iteraciones gruesas, `2` finas bidireccionales y `1` pasada diédrica exacta con signo). Cumple todos los criterios en `16×16` y `32×32` con **`9.5112 ms`** medios (`p95 = 12.7459 ms`), dejando **`6.4888 ms`** de margen por frame antes de incorporar colisiones en T3.
- **Limitaciones y riesgos abiertos:**
  1. **Generalización topológica para prendas reales (T4):** `buildCoarseLevel` construye la pirámide sobre rejilla estructurada `gridSize × gridSize`. Para paneles de patronaje con triangulación irregular en T4 se requerirá coarsening basado en grafos (p. ej., agregación geodésica o *Maximal Independent Set*) con mapeo baricéntrico.
  2. **Margen de colisión pendiente de validar en T3:** El benchmark Escena 0 opera con `collisionMs = 0`; el margen real de `6.49 ms` en `32×32` deberá confirmarse cuando se integre detección/respuesta cuerpo–prenda en T3.
  3. **Sensibilidad temporal mínima:** Con `8` subpasos (`H1_VCYCLE_8SUB`), el pico transitorio (`5.1716%`) excede ligeramente el umbral de `5%`, indicando que este régimen requiere $\ge 12$ subpasos ($\Delta t_s \le 1.389\ \text{ms}$).
  4. **Compresión local delegada al nivel fino:** La proyección unilateral en niveles gruesos ($C > 0$) evita *locking* en pliegues pero delega la resistencia a compresión local exclusivamente a las pasadas finas ($L = 0$).

---

**Estado de ejecución:** T2.2 cerrado con cumplimiento simultáneo en `32×32` (`H1B_VCYCLE_12SUB` y `H2_VCYCLE_16SUB`). Ejecución detenida en espera de autorización explícita para proceder con T3.

