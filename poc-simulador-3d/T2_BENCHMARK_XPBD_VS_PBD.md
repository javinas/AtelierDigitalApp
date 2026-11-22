# T2 — BENCHMARK EXPERIMENTAL ESCENA 0: XPBD VS. PBD CLÁSICO (PAÑO 50 × 50 CM, 10 S)
**Directorio PoC:** [`poc-simulador-3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/)  
**Referencias:** [`PLAN_POC_SIMULADOR_3D.md` (§4 T2 y §5)](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/PLAN_POC_SIMULADOR_3D.md#L76-L102) · [`T0_GATE0_BASELINE_FREEZE.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/T0_GATE0_BASELINE_FREEZE.md) · [`T1_MATH_SPEC_XPBD_VS_PBD.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/T1_MATH_SPEC_XPBD_VS_PBD.md)  
**Estado:** **T2 EJECUTADO — DETENIDO ANTES DE T3 EN ESPERA DE AUTORIZACIÓN**  
*(Nota: Ningún motor queda seleccionado definitivamente; los fallos observados se reportan íntegramente sin modificar los umbrales de aceptación).*

---

## 1. Condiciones Experimentales Idénticas

- **Geometría (`Escena 0`):** Paño cuadrado plano de $0.50\ \text{m} \times 0.50\ \text{m}$ inicialmente horizontal en $y = 1.00\ \text{m}$ ($z \in [0, 0.50]\ \text{m}$), con exactamente **2 esquinas fijas** (`w = 0`) en $(x = \pm 0.25\ \text{m}, y = 1.00\ \text{m}, z = 0)$.
- **Resoluciones comparadas:**
  - `16×16` nodos ($15\times 15$ celdas, $256$ vértices, $450$ triángulos, $930$ aristas, $645$ bisagras).
  - `32×32` nodos ($31\times 31$ celdas, $1024$ vértices, $1922$ triángulos, $3906$ aristas, $2821$ bisagras).
- **Integración compartida:** $10.0\ \text{s}$ simulados ($600$ frames a $\Delta t = 1/60\ \text{s}$), $N_{\text{sub}} = 8$ subpasos × $N_{\text{iter}} = 6$ iteraciones Gauss-Seidel por frame ($\Delta t_s \approx 2.083\ \text{ms}$), $\mathbf{g} = (0, -9.80665, 0)\ \text{m/s}^2$, amortiguamiento aéreo exponencial $1.8\ \text{s}^{-1}$, $\rho_A = 0.16\ \text{kg/m}^2$ ($160\ \text{g/m}^2$, marcador de calibración Escena 0).
- **Parámetros por motor:**
  - **XPBD (SI):** $K_{\text{warp/weft}} = 1200\ \text{N/m}$, $K_{\text{shear}} = 250\ \text{N/m}$, $B = 2.0 \times 10^{-5}\ \text{N}\cdot\text{m}$ ($20\ \mu\text{N}\cdot\text{m}$).
  - **PBD Clásico (adimensional comparable):** $k_{\text{stretch}} = 0.99$, $k_{\text{shear}} = 0.85$, $k_{\text{bend}} = 0.12$.
- **Verificación analítica previa:** Error máximo del gradiente diédrico analítico respecto a diferencias finitas centrales ($\varepsilon = 10^{-6}\ \text{m}$): **`5.0503 × 10⁻¹⁰`**.

---

## 2. Resultados Medidos (600 Frames × 4 Corridas + Render WebGL)

| Corrida | `NaN` Total | `physicsStepMs` Media / p95 (Node) | `renderMs` Media / p95 (WebGL Chromium) | Elongación Equilibrio (`t=10s`) Media / Pico | Elongación Transitoria (`0..10s`) Media Máx / Pico | Caída Centro-Bajo $\Delta y$ / Media $\Delta \bar{y}$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`xpbd_16x16`** | `0` | `5.6989` / `8.1663` ms | `0.597` / `1.200` ms | `0.1086%` / `3.8898%` | `0.2652%` / **`7.8268%`** | `0.5028 m` / `0.2526 m` |
| **`xpbd_32x32`** | `0` | **`24.154`** / **`32.895`** ms | `1.240` / `2.900` ms | `0.3341%` / **`21.6667%`** | `0.7820%` / **`41.6417%`** | `0.5096 m` / `0.2592 m` |
| **`pbd_16x16`** | `0` | `5.0934` / `6.1253` ms | `1.142` / `2.000` ms | `0.2737%` / **`5.8118%`** | `0.6464%` / **`11.0001%`** | `0.5065 m` / `0.2559 m` |
| **`pbd_32x32`** | `0` | **`26.8247`** / **`35.561`** ms | `1.813` / `3.500` ms | `1.1382%` / **`37.4295%`** | **`2.2642%`** / **`66.064%`** | `0.5299 m` / `0.2778 m` |

### Prueba de Invarianza bajo Refinamiento de Malla (`16×16` → `32×32`, criterio $\le 10\%$)

| Motor | $\Delta y$ Centro-Bajo (`16×16` → `32×32`) | Var. Caída Centro | $\Delta \bar{y}$ Media (`16×16` → `32×32`) | Var. Caída Media | RMS Forma 3D (% de $0.50\ \text{m}$) | Estado Invarianza ($\le 10\%$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **XPBD** | `0.5028 m` → `0.5096 m` | **`1.334%`** | `0.2526 m` → `0.2592 m` | **`2.546%`** | `0.0099 m` (**`1.983%`**) | **PASS** |
| **PBD Clásico** | `0.5065 m` → `0.5299 m` | **`4.416%`** | `0.2559 m` → `0.2778 m` | **`7.883%`** | `0.0234 m` (**`4.677%`**) | **PASS** *(deriva ~2.4×–3.3× mayor que XPBD)* |

---

## 3. Verificación Estricta de Criterios PASS / FAIL (Sin Ocultar Fallos)

| Criterio Evaluado (`PLAN_POC_SIMULADOR_3D.md` §4 T2 y §5) | XPBD `16×16` | XPBD `32×32` | PBD `16×16` | PBD `32×32` |
| :--- | :---: | :---: | :---: | :---: |
| **1. Cero `NaN` en 10 s simulados** (`nanVertexCountTotal === 0`) | **PASS** (`0`) | **PASS** (`0`) | **PASS** (`0`) | **PASS** (`0`) |
| **2. Elongación media $\le 2\%$** (Equilibrio / Transitorio máx) | **PASS** (`0.11%` / `0.27%`) | **PASS** (`0.33%` / `0.78%`) | **PASS** (`0.27%` / `0.65%`) | **FAIL en transitorio** (`1.14%` eq / `2.26%` trans.) |
| **3. Elongación pico $\le 5\%$** (Equilibrio `t=10s` / Pico 10 s) | **FAIL en transitorio** (`3.89%` eq / `7.83%` trans.) | **FAIL** (`21.67%` eq / `41.64%` trans.) | **FAIL** (`5.81%` eq / `11.00%` trans.) | **FAIL** (`37.43%` eq / `66.06%` trans.) |
| **4. Locking Test (No congelamiento + Inextensibilidad)** | **PARTIAL FAIL** (No congela: cae `0.503 m`; falla pico transitorio `7.83%`) | **FAIL** (No congela: cae `0.510 m`; falla pico `21.67%` eq / `41.64%` trans.) | **FAIL** (No congela; falla pico `5.81%` eq / `11.00%` trans.) | **FAIL** (No congela; falla media transitoria y pico `37.43%` eq / `66.06%` trans.) |
| **5. Variación de caída $\le 10\%$ al duplicar resolución** | **PASS** (`1.33%` / `2.55%` / `1.98%` RMS) | *(par `16×16`/`32×32`)* | **PASS** (`4.42%` / `7.88%` / `4.68%` RMS) | *(par `16×16`/`32×32`)* |
| **6. Presupuesto CPU Desktop ($\le 16.0\ \text{ms}$ `physicsStepMs` media)** | **PASS** (`5.70 ms`) | **FAIL** (`24.15 ms`, p95 `32.90 ms`) | **PASS** (`5.09 ms`) | **FAIL** (`26.82 ms`, p95 `35.56 ms`) |

### Análisis Honesto de los Fallos Observados
1. **Fallo de elongación pico en aristas de esquina (`21.67%` XPBD `32×32`, `37.43%` PBD `32×32`):**  
   Aunque el paño **no sufre *locking* rígido** (cae de forma fluida y su elongación media en XPBD es muy baja: `0.11%` en `16×16` y `0.33%` en `32×32`), suspender todo el peso de $0.04\ \text{kg}$ desde únicamente **2 vértices puntuales** con un solver secuencial Gauss-Seidel local (`8×6 = 48` pasadas/frame) concentra la tensión en las aristas contiguas a las esquinas fijadas, provocando estiramiento local excesivo que empeora al duplicar la cadena de nodos de `16` a `32` (y casi duplica en PBD clásico respecto a XPBD, con deformación catenaria visible en [`07_pbd_32x32_t10s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/07_pbd_32x32_t10s.png)).
2. **Fallo de presupuesto temporal en `32×32` en JavaScript puro (`24.15 ms` XPBD, `26.82 ms` PBD):**  
   Confirma el riesgo advertido en V2.6 §3: evaluar `2,821` bisagras diédricas × `48` pasadas/frame (`135,408` evaluaciones `atan2`/frame) en JS monohilo supera el límite de `16.0 ms/frame` incluso **antes** de añadir detección de colisiones corporal (T3).
3. **Comparación objetiva XPBD vs. PBD en T2:**  
   Bajo condiciones idénticas, **XPBD supera claramente a PBD clásico** en control de elongación media (`0.33%` vs `1.14%` en `32×32`), estiramiento pico (`21.67%` vs `37.43%`) e invarianza de caída al duplicar malla (`1.33%` vs `4.42%` centro; `1.98%` vs `4.68%` RMS 3D). Sin embargo, **ninguno aprueba T2 completo en `32×32`** sin resolver el cuello de botella de convergencia en picos de tensión y cómputo (p. ej. restricción global / jerárquica o Wasm/isométrico de flexión cuadrática sin `atan2` en el bucle interno).

---

## 4. Artefactos Generados en T2 (JSON por Frame y Capturas Reales WebGL)

- **Exportaciones JSON por frame (600 frames cada uno) y métricas consolidadas:**
  - [`xpbd_16x16_telemetry.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/xpbd_16x16_telemetry.json)
  - [`xpbd_32x32_telemetry.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/xpbd_32x32_telemetry.json)
  - [`pbd_16x16_telemetry.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/pbd_16x16_telemetry.json)
  - [`pbd_32x32_telemetry.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/pbd_32x32_telemetry.json)
  - [`t2_comparison_summary.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/t2_comparison_summary.json)
  - [`t2_webgl_render_metrics.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/t2_webgl_render_metrics.json)
- **Capturas WebGL 3D reales (`poc-simulador-3d/results/t2/captures/`):**
  - [`01_compare_t050s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/01_compare_t050s.png) (transitorio `t = 0.50 s`)
  - [`02_compare_t200s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/02_compare_t200s.png) (`t = 2.00 s`)
  - [`03_compare_t1000s_equilibrium.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/03_compare_t1000s_equilibrium.png) (equilibrio `t = 10.00 s`)
  - [`04_xpbd_16x16_t10s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/04_xpbd_16x16_t10s.png) · [`05_xpbd_32x32_t10s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/05_xpbd_32x32_t10s.png) · [`06_pbd_16x16_t10s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/06_pbd_16x16_t10s.png) · [`07_pbd_32x32_t10s.png`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/results/t2/captures/07_pbd_32x32_t10s.png)

