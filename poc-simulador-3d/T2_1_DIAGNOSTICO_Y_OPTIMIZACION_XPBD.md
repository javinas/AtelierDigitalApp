# T2.1 — Diagnóstico de Elongación Local, Concentración en Anclajes y Perfilado de Optimización XPBD

- **Fecha:** 2026-11-15
- **Alcance:** Exclusivamente entorno aislado `poc-simulador-3d/` (Escena 0: paño `0.50 × 0.50 m`, `160 g/m²`, `K_warp = K_weft = 1200 N/m`, `K_shear = 250 N/m`, `B = 20 µN·m`, `g = -9.80665 m/s²`, `airDamping = 1.8 s⁻¹`, 2 esquinas ancladas, `10 s` = `600 frames` a `60 Hz`).
- **Integridad de línea base:** Los resultados originales de T2 ([`T2_BENCHMARK_XPBD_VS_PBD.md`](./T2_BENCHMARK_XPBD_VS_PBD.md) y `poc-simulador-3d/results/t2/`) y los umbrales de aceptación (`meanStretch <= 2%`, `maxStretch <= 5%`, `invariance <= 10%`, `physicsStepMs <= 16 ms`, `0 NaN`) permanecen intactos. No se selecciona motor definitivo ni se ejecutan T3–T6.

---

## 1. Artefactos Generados en T2.1

- Script de diagnóstico y variantes: [`poc-simulador-3d/tests/t21DiagnosticAndVariants.ts`](./tests/t21DiagnosticAndVariants.ts)
- Ejecutor aislado: [`poc-simulador-3d/tests/run_t2_1_diagnostic.cjs`](./tests/run_t2_1_diagnostic.cjs)
- Resumen cuantitativo completo: [`poc-simulador-3d/results/t2_1/t21_diagnostic_summary.json`](./results/t2_1/t21_diagnostic_summary.json)
- Telemetría por variante (10 lotes independientes): `poc-simulador-3d/results/t2_1/*_telemetry.json`

---

## 2. Aristas Críticas Responsables de los Picos de Tensión (`V0_T2_BASELINE`)

Los picos máximos de elongación registrados en la línea base instrumentada (`V0_T2_BASELINE`, idéntica configuración de `8` subpasos, `6` iteraciones stretch y `6` iteraciones diédricas) ocurren de forma sistemática en las aristas `warp` y `shear` inmediatamente conectadas a las dos esquinas ancladas (`[0,0]` y `[0, N-1]`). En `t21_diagnostic_summary.json` se registran las top-10 aristas por instante; las cinco principales por caso son:

### 2.1 Malla `16 × 16` (`L0 = 0.033333 m`, pico transitorio en frame `21`)

| Snapshot | Rango | `edgeIndex` | Tipo | Vértices | ¿Toca esquina anclada? | `L_actual` (m) | Elongación (%) |
| --- | :---: | :---: | --- | --- | :---: | :---: | :---: |
| Transitorio (f. 21) | #1 | `240` | `warp` | `[0,0] -> [1,0]` | Sí | `0.035942` | **7.8268%** |
| Transitorio (f. 21) | #2 | `465` | `warp` | `[0,15] -> [1,15]` | Sí | — | 4.8058% |
| Transitorio (f. 21) | #3 | `480` | `shear` | `[0,0] -> [1,1]` | Sí | — | 4.5560% |
| Transitorio (f. 21) | #4 | `509` | `shear` | `[0,15] -> [1,14]` | Sí | — | 3.7826% |
| Transitorio (f. 21) | #5 | `466` | `warp` | `[1,15] -> [2,15]` | No | — | 3.6800% |
| Equilibrio (f. 600) | #1 | `240` | `warp` | `[0,0] -> [1,0]` | Sí | — | **3.8898%** |
| Equilibrio (f. 600) | #2 | `465` | `warp` | `[0,15] -> [1,15]` | Sí | — | 2.3830% |
| Equilibrio (f. 600) | #3 | `480` | `shear` | `[0,0] -> [1,1]` | Sí | — | 2.1374% |
| Equilibrio (f. 600) | #4 | `466` | `warp` | `[1,15] -> [2,15]` | No | — | 1.8985% |

### 2.2 Malla `32 × 32` (`L0 = 0.016129 m`, pico transitorio en frame `22`)

| Snapshot | Rango | `edgeIndex` | Tipo | Vértices | ¿Toca esquina anclada? | `L_actual` (m) | Elongación (%) |
| --- | :---: | :---: | --- | --- | :---: | :---: | :---: |
| Transitorio (f. 22) | #1 | `992` | `warp` | `[0,0] -> [1,0]` | Sí | `0.022845` | **41.6417%** |
| Transitorio (f. 22) | #2 | `1953` | `warp` | `[0,31] -> [1,31]` | Sí | — | 34.1364% |
| Transitorio (f. 22) | #3 | `0` | `weft` | `[0,0] -> [0,1]` | Sí | — | 20.7666% |
| Transitorio (f. 22) | #4 | `1024` | `warp` | `[1,1] -> [2,1]` | No | — | 19.9967% |
| Transitorio (f. 22) | #5 | `1984` | `shear` | `[0,0] -> [1,1]` | Sí | — | 19.0177% |
| Equilibrio (f. 600) | #1 | `992` | `warp` | `[0,0] -> [1,0]` | Sí | `0.019624` | **21.6667%** |
| Equilibrio (f. 600) | #2 | `1953` | `warp` | `[0,31] -> [1,31]` | Sí | — | 17.0027% |
| Equilibrio (f. 600) | #3 | `1024` | `warp` | `[1,1] -> [2,1]` | No | — | 9.6848% |
| Equilibrio (f. 600) | #4 | `1984` | `shear` | `[0,0] -> [1,1]` | Sí | — | 9.3648% |
| Equilibrio (f. 600) | #5 | `2045` | `shear` | `[0,31] -> [1,30]` | Sí | — | 9.2583% |

**Observación de asimetría en orden fijo:** En `V0_T2_BASELINE` (`32×32`), la esquina izquierda (`edgeIndex 992`: `41.6417%` trans., `21.6667%` eq.) presenta mayor pico que la derecha (`edgeIndex 1953`: `34.1364%` trans., `17.0027%` eq.) debido al barrido unidireccional de Gauss-Seidel sobre el orden de almacenamiento de aristas.

---

## 3. Concentración de Esfuerzos y Causas de Deformación (`32 × 32`)

Para separar la singularidad geométrica de los dos anclajes puntuales frente al rezago de propagación de Gauss-Seidel, se ejecutó un barrido de sensibilidad en `32 × 32` (`600 frames`) manteniendo idénticas las propiedades físicas del paño:

| Experimento | Configuración (`substeps × stretchIter`, `bendIter`, orden, anclaje) | Pico transitorio (%) | Máx. equilibrio (%) | Máx. eq. interior sin anclaje (%) | Media equilibrio (%) | `physicsStepMs` medio (ms) |
| --- | --- | :---: | :---: | :---: | :---: | :---: |
| `CONV_SUB8_IT6_POINT1` | `8 × 6`, `1`, bidireccional, `1 nodo/esquina` | 75.3727% | 38.7370% | 38.7370% | 0.4100% | 8.9890 |
| `CONV_SUB32_IT6_POINT1` | `32 × 6`, `1`, bidireccional, `1 nodo/esquina` | 11.0844% | 4.6771% | 4.6771% | 0.0694% | 38.1595 |
| `CONV_SUB64_IT6_POINT1` | `64 × 6`, `1`, bidireccional, `1 nodo/esquina` | 5.1247% | 2.3020% | 1.6087% | 0.0541% | 72.7631 |
| `TAB2_SUB16_BIDIR2_WIDTH32MM` | `16 × 2`, `1`, bidireccional, `2 nodos/esquina` | 25.3303% | 12.2528% | 12.2528% | 0.3005% | 11.9727 |

*(Nota comparativa sobre el orden de Gauss-Seidel: `V2_SUBSTEP16_BIDIR2_BEND1` tiene la misma cadencia `16 × 2, 1, bidireccional` que `TAB2_SUB16_BIDIR2_WIDTH32MM`, pero con `1 nodo/esquina`, donde arroja `64.0148%` transitorio y `32.5643%` equilibrio).*

### Separación explícita entre resultados demostrados e hipótesis

#### Resultados experimentales demostrados en T2.1
1. **El rezago de convergencia temporal/Gauss-Seidel domina la sobreelevación de estiramiento en `32 × 32`:** Al subir de `8` a `64` subpasos con idéntico modelo físico y `1 nodo/esquina`, el máximo en equilibrio cae monotónicamente de `38.7370%` (`CONV_SUB8_IT6_POINT1`) a `4.6771%` (`CONV_SUB32_IT6_POINT1`) y **`2.3020%`** (`CONV_SUB64_IT6_POINT1`, con máximo interior sin anclaje de `1.6087%` y pico transitorio de `5.1247%`). Esto demuestra experimentalmente que la mayor parte del `21.6667%` de `V0_T2_BASELINE` (`38.7370%` en `CONV_SUB8`) es falta de convergencia de propagación a lo largo de `31` saltos de arista desde los anclajes, más que deformación elástica real del paño.
2. **Existe además una concentración física en anclajes de 1 nodo:** Duplicar la zona fijada de `1` a `2` nodos por esquina (`TAB2_SUB16_BIDIR2_WIDTH32MM` vs `V2_SUBSTEP16_BIDIR2_BEND1`) reduce el pico transitorio de `64.0148%` a `25.3303%` y el máximo en equilibrio de `32.5643%` a `12.2528%` bajo el mismo presupuesto de iteraciones (`16 × 2`), mientras que en estado cuasi-convergido (`CONV_SUB64`) persiste un piso de `2.3020%` en la arista anclada frente a `1.6087%` en el interior.
3. **La flexión diédrica representa ~74% del coste CPU de `V0_T2_BASELINE`:** En `V0_T2_BASELINE` (`6` iteraciones diédricas/subpaso), el cálculo de flexión consume `4.8057 ms` (`74.6%`) en `16 × 16` y `18.3435 ms` (`74.2%`) en `32 × 32`.
4. **Ninguna variante `V0..V4` probada en JavaScript monohilo cumple simultáneamente todos los criterios en `32 × 32`:** Aunque `V1`, `V2` y `V4` bajan `physicsStepMsMean` por debajo de `16 ms` (`11.3826 ms`, `11.4531 ms` y `5.5738 ms`) sin locking y cumplen invariancia (`<= 10%`), `eqMean` (`<= 2%`) y `0 NaN`, todas superan ampliamente `maxStretch <= 5%` en `32 × 32`. Inversamente, `CONV_SUB64_IT6_POINT1` reduce equilibrio a `2.3020%` (transitorio `5.1247%`), pero requiere `72.7631 ms/frame` (> `4.5×` el presupuesto de `16 ms`).

#### Hipótesis técnicas (no demostradas experimentalmente aún)
- **Hipótesis 1 (aceleración numérica/paralelismo):** Esquemas con mejor tasa de propagación por milisegundo (p. ej., compilación a WebAssembly/SIMD, coloración paralela, aceleración Chebyshev o precondicionamiento jerárquico/multimalla) podrían alcanzar una convergencia equivalente a `32–64` subpasos efectivos dentro de `<= 16 ms` en `32 × 32`. No evaluado todavía.
- **Hipótesis 2 (condiciones de contorno en prendas):** En prendas reales sobre torso (Escena 1 en adelante), la sustentación distribuida por hombros y costuras evitaría la carga puntual sobre un único vértice presente en Escena 0. Pendiente de verificación en etapas posteriores cuando corresponda.
- **Hipótesis 3 (sustituto de distancia opuesta y asimetría de caras):** El sustituto `V4` sin signo pierde por formulación la capacidad de distinguir flexión `FACE_UP` frente a `FACE_DOWN` requerida para telas `ASYMMETRIC` (V2.6) salvo incorporación de término orientado por normal. No verificado en pruebas de curvatura asimétrica.

---

## 4. Perfilado de CPU y Comparativa de Variantes de Optimización (`V0..V4`)

### 4.1 Desglose por fase de CPU (`ms` y `%` del tiempo de paso físico)

| Variante | Malla | `predictMs` | `stretchMs` | `bendingMs` | `commitMs` | `total physicsStepMs` medio (`p95`) |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `V0_T2_BASELINE` (`8×6` unidir, `6` diédrico) | `16×16` | 0.0456 (0.7%) | 1.5608 (24.2%) | **4.8057 (74.6%)** | 0.0290 (0.5%) | 6.4972 (`p95`: 9.2048) |
| `V0_T2_BASELINE` (`8×6` unidir, `6` diédrico) | `32×32` | 0.1167 (0.5%) | 6.1621 (24.9%) | **18.3435 (74.2%)** | 0.0912 (0.4%) | 24.7497 (`p95`: 34.7860) |
| `V1_BIDIR_BEND1` (`8×6` bidir, `1` diédrico) | `16×16` | 0.0284 (1.4%) | 1.3372 (64.2%) | 0.6912 (33.2%) | 0.0257 (1.2%) | 2.0965 (`p95`: 3.0141) |
| `V1_BIDIR_BEND1` (`8×6` bidir, `1` diédrico) | `32×32` | 0.1307 (1.2%) | 7.2913 (64.2%) | 3.8315 (33.7%) | 0.1051 (0.9%) | **11.3826** (`p95`: 17.7136) |
| `V2_SUBSTEP16_BIDIR2_BEND1` (`16×2` bidir, `1` diédrico) | `16×16` | 0.0490 (2.1%) | 0.8968 (38.1%) | 1.3669 (58.1%) | 0.0406 (1.7%) | 2.3644 (`p95`: 3.5198) |
| `V2_SUBSTEP16_BIDIR2_BEND1` (`16×2` bidir, `1` diédrico) | `32×32` | 0.2139 (1.9%) | 4.3938 (38.4%) | 6.6418 (58.1%) | 0.1843 (1.6%) | **11.4531** (`p95`: 20.2044) |
| `V3_SUBSTEP24_BIDIR2_BEND1` (`24×2` bidir, `1` diédrico) | `16×16` | 0.0965 (2.3%) | 1.5352 (36.9%) | 2.4529 (59.0%) | 0.0746 (1.8%) | 4.1861 (`p95`: 6.3350) |
| `V3_SUBSTEP24_BIDIR2_BEND1` (`24×2` bidir, `1` diédrico) | `32×32` | 0.3615 (2.0%) | 6.4503 (36.1%) | 10.7474 (60.2%) | 0.3059 (1.7%) | 17.9013 (`p95`: 24.0196) |
| `V4_SUBSTEP16_SURROGATE_BEND` (`16×2` bidir, `1` sustituto dist.) | `16×16` | 0.0595 (4.5%) | 0.9199 (69.0%) | 0.3078 (23.1%) | 0.0459 (3.4%) | 1.3467 (`p95`: 2.0315) |
| `V4_SUBSTEP16_SURROGATE_BEND` (`16×2` bidir, `1` sustituto dist.) | `32×32` | 0.2130 (3.8%) | 3.7786 (68.0%) | 1.3987 (25.2%) | 0.1666 (3.0%) | **5.5738** (`p95`: 8.3353) |

### 4.2 Deformación, invariancia y cumplimiento estricto de umbrales (`<= 2%` media, `<= 5%` máx., `<= 10%` invariancia, `<= 16 ms`)

| Variante | Malla | Transitorio máx. (%) | Equilibrio máx. (%) | Equilibrio media (%) | `physicsStepMs` medio <= 16 ms | `maxStretch <= 5%` | Invariancia `16 vs 32` (`centerDrop` / `meanDrop` / `rms`) |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| `V0_T2_BASELINE` | `16×16` | 7.8268% | 3.8898% | 0.1086% | PASS (6.4972) | FAIL (trans. > 5%) | 1.334% / 2.546% / 1.983% (**PASS**) |
| `V0_T2_BASELINE` | `32×32` | 41.6417% | 21.6667% | 0.3341% | FAIL (24.7497) | FAIL | — |
| `V1_BIDIR_BEND1` | `16×16` | 12.8375% | 6.4343% | 0.1369% | PASS (2.0965) | FAIL | 1.545% / 2.913% / 2.156% (**PASS**) |
| `V1_BIDIR_BEND1` | `32×32` | 75.3727% | 38.7370% | 0.4100% | **PASS** (11.3826) | FAIL (locking: false) | — |
| `V2_SUBSTEP16_BIDIR2_BEND1` | `16×16` | 11.5220% | 5.5293% | 0.1222% | PASS (2.3644) | FAIL | 1.256% / 2.393% / 1.829% (**PASS**) |
| `V2_SUBSTEP16_BIDIR2_BEND1` | `32×32` | 64.0148% | 32.5643% | 0.3301% | **PASS** (11.4531) | FAIL (locking: false) | — |
| `V3_SUBSTEP24_BIDIR2_BEND1` | `16×16` | 6.6640% | 2.9282% | 0.0818% | PASS (4.1861) | FAIL (trans. > 5%) | 0.673% / 1.293% / 1.223% (**PASS**) |
| `V3_SUBSTEP24_BIDIR2_BEND1` | `32×32` | 35.7964% | 17.9184% | 0.1750% | FAIL (17.9013) | FAIL | — |
| `V4_SUBSTEP16_SURROGATE_BEND` | `16×16` | 11.2277% | 5.4112% | 0.1266% | PASS (1.3467) | FAIL | 1.217% / 2.542% / 2.243% (**PASS**) |
| `V4_SUBSTEP16_SURROGATE_BEND` | `32×32` | 62.8950% | 30.6419% | 0.3442% | **PASS** (5.5738) | FAIL (locking: false) | — |

---

## 5. Conclusión Técnica de T2.1 y Puerta de Decisión

1. **Cuello de botella resuelto en cómputo de flexión:** Reducir la pasada diédrica de `6` a `1` por subpaso (`V1`, `V2`) reduce la flexión de `18.3435 ms` a `3.8315–6.6418 ms` en `32×32`, colocando `physicsStepMsMean` en `~11.4 ms` (`V4` logra `5.57 ms`).
2. **Brecha abierta en propagación/estiramiento pico bajo presupuesto de `16 ms`:** En `32×32`, los `16–24` subpasos × `2` iteraciones en JS monohilo siguen dejando entre `17.92%` y `38.74%` de elongación máxima en equilibrio junto a las esquinas, mientras que alcanzar `~2.30%` en equilibrio (`5.12%` transitorio) con el solver Gauss-Seidel actual exige `64×6` subpasos (`72.76 ms/frame`).
3. **Estado de la PoC:** T2.1 queda cerrado con evidencia diagnóstica sin modificar resultados de T2 ni código de producción. Se detiene la ejecución aquí en espera de autorización explícita para decidir si se evalúa una arquitectura de solver más rápida (p. ej., Wasm/SIMD, Chebyshev o subpasos locales/jerárquicos) antes de retomar T3.

