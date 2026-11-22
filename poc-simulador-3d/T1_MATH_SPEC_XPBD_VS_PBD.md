# T1 — ESPECIFICACIÓN MATEMÁTICA MÍNIMA (SI) PARA COMPARAR XPBD VS. PBD Y ESQUEMA DEL HARNESS DE TELEMETRÍA
**Directorio PoC:** [`poc-simulador-3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/)  
**Referencia normativa:** [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md` §4.2](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md#L117-L131) · [`PLAN_POC_SIMULADOR_3D.md` §4 (T1)](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/PLAN_POC_SIMULADOR_3D.md#L76-L85)  
**Estado:** T1 preparado para evaluación comparativa (sin selección definitiva de motor; **T2 no ejecutado aún**).

---

## 1. Variables de Estado, Masa Nodal y Paso Temporal (Unidades SI)

| Símbolo | Magnitud Física | Unidad SI | Conversión desde Parámetros Textiles V2.6 |
| :--- | :--- | :---: | :--- |
| $\mathbf{x}_i, \mathbf{p}_i$ | Posición actual y predicha del vértice $i$ | $\text{m}$ | Coordenadas geométricas en metros |
| $\mathbf{v}_i$ | Velocidad del vértice $i$ | $\text{m/s}$ | Derivada temporal tras proyección: $(\mathbf{x}_i^{n+1} - \mathbf{x}_i^n)/\Delta t_s$ |
| $\mathbf{g}$ | Aceleración gravitatoria | $\text{m/s}^2$ | $(0,\ -9.80665,\ 0)\ \text{m/s}^2$ |
| $\rho_{\text{gsm}} \to \rho_A$ | Masa superficial (*areal mass*) | $\text{kg/m}^2$ | $\rho_A = \rho_{\text{gsm}} \times 10^{-3}$ |
| $A_T^0$ | Área en reposo del triángulo $T$ | $\text{m}^2$ | $\frac{1}{2}\|(\mathbf{x}_b^0 - \mathbf{x}_a^0) \times (\mathbf{x}_c^0 - \mathbf{x}_a^0)\|$ |
| $m_i,\ w_i$ | Masa nodal acumulada y masa inversa | $\text{kg},\ \text{kg}^{-1}$ | $m_i = \frac{1}{3} \sum_{T \ni i} \rho_A A_T^0$; si nodo fijado (*pinned*), $w_i = 0$, si libre $w_i = 1/m_i$ |
| $\Delta t,\ N_{\text{sub}},\ \Delta t_s$ | Paso de frame, subpasos y paso interno | $\text{s},\ -,\ \text{s}$ | $\Delta t_s = \Delta t / N_{\text{sub}}$ ($N_{\text{iter}}$ iteraciones de proyección por subpaso) |

---

## 2. Restricción de Estiramiento / Membrana ($C_{\text{dist}}$): XPBD vs. PBD

Para cada arista $(i, j)$ con longitud de reposo $L_0 = \|\mathbf{x}_i^0 - \mathbf{x}_j^0\| > 0\ [\text{m}]$:
$$C_{\text{dist}}(\mathbf{x}_i, \mathbf{x}_j) = \|\mathbf{x}_i - \mathbf{x}_j\| - L_0\ [\text{m}], \qquad \mathbf{n}_{ij} = \frac{\mathbf{x}_i - \mathbf{x}_j}{\|\mathbf{x}_i - \mathbf{x}_j\|}\ [1]$$

### 2.1 Formulación XPBD (Macklin et al., 2016)
Partiendo de una rigidez planar lineal equivalente $K_{\text{stretch}}\ [\text{N/m}]$ (por ancho unitario de tela, por ejemplo aproximación inicial de baja carga en V2.6 §4.2, sujeta a validación de curva en Etapa 3), sobre una franja tributaria de ancho dual $b_e\ [\text{m}]$ y área de arista $A_e = b_e L_0\ [\text{m}^2]$:

$$k_{\text{edge}} = \frac{K_{\text{stretch}}\ A_e}{L_0^2} = K_{\text{stretch}} \frac{b_e}{L_0}\ [\text{N/m}]$$

$$\alpha_{\text{stretch}} = \frac{1}{k_{\text{edge}}} = \frac{L_0^2}{K_{\text{stretch}}\ A_e}\ [\text{m/N}], \qquad \tilde{\alpha}_{\text{stretch}} = \frac{\alpha_{\text{stretch}}}{\Delta t_s^2}\ [\text{kg}^{-1}]$$

Actualización de multiplicador $\lambda$ (reiniciado a $0$ al inicio de cada subpaso $\Delta t_s$) y desplazamientos:
$$\Delta \lambda = \frac{-C_{\text{dist}}(\mathbf{x}) - \tilde{\alpha}_{\text{stretch}}\,\lambda}{(w_i + w_j) + \tilde{\alpha}_{\text{stretch}}}\ [\text{kg}\cdot\text{m}], \qquad \lambda \leftarrow \lambda + \Delta \lambda$$
$$\Delta \mathbf{x}_i = +w_i\,\Delta \lambda\,\mathbf{n}_{ij}\ [\text{m}], \qquad \Delta \mathbf{x}_j = -w_j\,\Delta \lambda\,\mathbf{n}_{ij}\ [\text{m}]$$

**Verificación dimensional:**
- Numerador: $[C_{\text{dist}}] = \text{m}$ y $[\tilde{\alpha}_{\text{stretch}} \lambda] = \text{kg}^{-1} \cdot (\text{kg}\cdot\text{m}) = \text{m}$.
- Denominador: $[w_i + w_j] = \text{kg}^{-1}$ y $[\tilde{\alpha}_{\text{stretch}}] = \frac{\text{m}}{\text{N}\cdot\text{s}^2} = \frac{\text{m}}{(\text{kg}\cdot\text{m}/\text{s}^2)\cdot\text{s}^2} = \text{kg}^{-1}$.
- Cociente: $[\Delta \lambda] = \text{kg}\cdot\text{m}$, por lo tanto $[w_i \Delta \lambda \mathbf{n}_{ij}] = \text{m}$.
- Energía potencial discreta $\Psi_{\text{dist}} = \frac{1}{2\alpha_{\text{stretch}}} C_{\text{dist}}^2 = \frac{1}{2} K_{\text{stretch}} A_e \left(\frac{\|\mathbf{x}_i - \mathbf{x}_j\| - L_0}{L_0}\right)^2\ [\text{J}]$: **escala correctamente con el área de elemento $A_e$ al refinar la malla** (sujeto a verificación empírica en **T2**).

### 2.2 Línea Base PBD Clásico (Müller et al., 2007)
Usa rigidez adimensional $k_{\text{PBD}} \in [0, 1]$ independiente de $K_{\text{stretch}}\ [\text{N/m}]$, escalada solo heurísticamente por número de iteraciones:
$$k'_{\text{PBD}} = 1 - (1 - k_{\text{PBD}})^{1/N_{\text{iter}}}, \qquad \Delta \mathbf{x}_i = -k'_{\text{PBD}}\frac{w_i}{w_i + w_j} C_{\text{dist}}(\mathbf{x})\,\mathbf{n}_{ij}, \qquad \Delta \mathbf{x}_j = +k'_{\text{PBD}}\frac{w_j}{w_i + w_j} C_{\text{dist}}(\mathbf{x})\,\mathbf{n}_{ij}$$
*(Sensibilidad conocida a $\Delta t_s$, $N_{\text{iter}}$ y resolución de malla; incluida precisamente como contraste cuantitativo contra XPBD en T2).*

---

## 3. Restricción de Flexión Diédrica ($C_{\text{bend}}$): XPBD vs. PBD y Soporte Asimétrico

Para una arista interior de bisagra $\mathbf{e} = \mathbf{x}_2 - \mathbf{x}_1$ de longitud en reposo $l_e = \|\mathbf{x}_2^0 - \mathbf{x}_1^0\|\ [\text{m}]$, compartida por dos triángulos $T_1, T_2$ con vértices opuestos $\mathbf{x}_3, \mathbf{x}_4$, normales unitarias $\hat{\mathbf{n}}_1, \hat{\mathbf{n}}_2$ y suma de áreas en reposo $A_{12}^0 = A_1^0 + A_2^0\ [\text{m}^2]$:

$$C_{\text{bend}}(\mathbf{x}_1, \mathbf{x}_2, \mathbf{x}_3, \mathbf{x}_4) = \phi_{\text{signed}} - \phi_0\ [\text{rad}]$$

donde $\phi_{\text{signed}} = \text{atan2}\!\left((\hat{\mathbf{n}}_1 \times \hat{\mathbf{n}}_2)\cdot \hat{\mathbf{e}},\ \hat{\mathbf{n}}_1 \cdot \hat{\mathbf{n}}_2\right)$ mantiene el **signo de curvatura** necesario para distinguir flexión hacia cara (`FACE_UP`, $C_{\text{bend}} \ge 0$) frente a envés (`FACE_DOWN`, $C_{\text{bend}} < 0$).

### 3.1 Formulación XPBD para Rigidez Flexural $B\ [\text{N}\cdot\text{m}]$
Según V2.6 §4.2, $B\ [\text{N}\cdot\text{m}] = B_{\mu\text{Nm}} \times 10^{-6} = B_{\text{KES}} \times 9.80665 \times 10^{-5}$.
Con longitud dual de bisagra $h_e = \frac{A_{12}^0}{3 l_e}\ [\text{m}]$ y área dual tributaria $A_{\text{dual}} = \frac{A_{12}^0}{3}\ [\text{m}^2]$, la curvatura discreta es $\kappa_e \approx \frac{\phi_{\text{signed}} - \phi_0}{h_e}\ [\text{m}^{-1}]$ y la energía de flexión discreta es:

$$\Psi_{\text{bend}} = \frac{1}{2} B_{\text{dir}}\,\kappa_e^2\,A_{\text{dual}} = \frac{1}{2}\left(\frac{3\,B_{\text{dir}}\,l_e^2}{A_{12}^0}\right)(\phi_{\text{signed}} - \phi_0)^2\ [\text{J}]$$

Por tanto, el *compliance* de flexión XPBD y su valor regularizado son:
$$k_{\text{bend}, e} = \frac{3\,B_{\text{dir}}\,l_e^2}{A_{12}^0}\ [\text{N}\cdot\text{m}], \qquad \alpha_{\text{bend}, e} = \frac{1}{k_{\text{bend}, e}} = \frac{A_{12}^0}{3\,B_{\text{dir}}\,l_e^2}\ [\text{N}^{-1}\cdot\text{m}^{-1}], \qquad \tilde{\alpha}_{\text{bend}, e} = \frac{\alpha_{\text{bend}, e}}{\Delta t_s^2}\ [\text{kg}^{-1}\cdot\text{m}^{-2}]$$

$$\Delta \lambda_{\text{bend}} = \frac{-C_{\text{bend}}(\mathbf{x}) - \tilde{\alpha}_{\text{bend}, e}\,\lambda_{\text{bend}}}{\sum_{k=1}^{4} w_k \|\nabla_{\mathbf{x}_k} C_{\text{bend}}\|^2 + \tilde{\alpha}_{\text{bend}, e}}, \qquad \Delta \mathbf{x}_k = w_k\,\Delta \lambda_{\text{bend}}\,\nabla_{\mathbf{x}_k} C_{\text{bend}}\ [\text{m}]$$

**Verificación dimensional:**
- $[\nabla_{\mathbf{x}_k} C_{\text{bend}}] = \text{rad}/\text{m} = \text{m}^{-1}$, luego $[w_k \|\nabla C\|^2] = \text{kg}^{-1}\cdot\text{m}^{-2}$.
- $[\alpha_{\text{bend},e} / \Delta t_s^2] = \frac{\text{m}^2}{(\text{N}\cdot\text{m})\cdot\text{m}^2\cdot\text{s}^2} = \frac{1}{(\text{kg}\cdot\text{m}^2/\text{s}^2)\cdot\text{s}^2} = \text{kg}^{-1}\cdot\text{m}^{-2}$. Coincide exactamente.
- **Regla V2.6 para telas `ASYMMETRIC`:** $B_{\text{dir}}$ se selecciona dinámicamente sin promediar: $B_{\text{dir}} = B_{\text{faceUp}}$ si $C_{\text{bend}} \ge 0$, o $B_{\text{faceDown}}$ si $C_{\text{bend}} < 0$.
- **Nota de alcance T1 → T2:** El factor geométrico $3\,l_e^2 / A_{12}^0$ queda sujeto a verificación de convergencia numérica en **T2** comparando mallas $16\times 16$ vs. $32\times 32$ bajo flexión pura.

### 3.2 Línea Base PBD Clásico para Flexión
Usa $k'_{\text{bend,PBD}} = 1 - (1 - k_{\text{bend,PBD}})^{1/N_{\text{iter}}} \in [0, 1]$ multiplicando la proyección geométrica pura ($\tilde{\alpha}_{\text{bend}} = 0$), sin relación con $B\ [\text{N}\cdot\text{m}]$ ni invarianza por área $A_{12}^0$.

---

## 4. Métricas Obligatorias y Formato de Exportación JSON del Harness

El harness aislado [`telemetryHarness.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/harness/telemetryHarness.ts) registra e exporta por cada frame los siguientes campos (y calcula `p50`, `p95`, `mean`, `max` por lote):

| Campo Exportado | Unidad | Definición Exacta | Umbral Gate 1 (Desktop Web) |
| :--- | :---: | :--- | :---: |
| `physicsStepMs` | $\text{ms}$ | Tiempo de reloj de predicción + proyección de restricciones + actualización de velocidad (incluye todos los subpasos del frame). | `physicsStepMs + collisionMs` $\le 16\ \text{ms}$ media ($\text{p95} \le 25\ \text{ms}$) |
| `collisionMs` | $\text{ms}$ | Tiempo de detección y resolución de colisiones cuerpo–prenda por frame. | $\le 6\ \text{ms/frame}$ en T3 |
| `renderMs` | $\text{ms}$ | Tiempo de sincronización de buffers WebGL + `renderer.render()` (`0` en modo `headless-dry-run` claramente marcado). | Contabilizado dentro de presupuesto $\ge 30\ \text{FPS}$ |
| `maxStretchPct` | $\%$ | $\max_{(i,j)\in E}\ \frac{\left|\|\mathbf{x}_i - \mathbf{x}_j\| - L_{0,ij}\right|}{L_{0,ij}} \times 100$ (acompañado de `meanStretchPct` y `nanVertexCount`). | En tejido inelástico: media $\le 2\%$, pico $\le 5\%$; `nanVertexCount === 0` |
| `penetrationCount` | conteo | Vértices con distancia con signo $d(\mathbf{x}_i, \mathcal{B}) < -0.003\ \text{m}$ (profundidad $> 3\ \text{mm}$, más `rawContactViolationCount` para $d < 0$ y `maxPenetrationDepthMm`). | **$0$** al asentamiento |

