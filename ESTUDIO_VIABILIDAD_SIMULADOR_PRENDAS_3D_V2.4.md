# ESTUDIO DE VIABILIDAD Y ARQUITECTURA TÉCNICA V2.4: SIMULADOR DE PRENDAS 3D E INTELIGENCIA TEXTIL INDEPENDIENTE
**Atelier Digital App — By Katherine Carroll**  
**Versión:** 2.4 (Corrección de Auditoría sobre V2.3)  
**Estado del Documento:** **En revisión / pendiente de aprobación**  
**Fecha:** 2026-11-14  
**Naturaleza:** Estudio de Arquitectura, Modelo Metrológico Completo, Contrato JSON Schema V2.4, Reglas de Runtime y Protocolo Reproducible Gate 3B (Sin modificación de código, dependencias, configuraciones ni base de datos)  
**Documento base revisado:** [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.3.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.3.md)

> [!IMPORTANT]
> **Declaración de Integridad Técnica y Alcance V2.4:**  
> Esta revisión V2.4 preserva todas las decisiones conceptuales y correcciones aceptadas en V2.1, V2.2 y V2.3, resolviendo tres hallazgos de auditoría sobre V2.3. **No modifica código fuente, dependencias, configuraciones, SQL, migraciones ni los módulos M00–M07.** M05 continúa opcional y de solo lectura; M02 y Flujo B permanecen intactos. No se inventan mediciones, acreditaciones, tolerancias experimentales ni resultados. No se selecciona definitivamente XPBD ni ninguna alternativa de maniquí.

---

## 1. Matriz de Correcciones V2.3 → V2.4

| # | Hallazgo de Auditoría sobre V2.3 | Ubicación en V2.3 | Corrección Aplicada en V2.4 |
| :---: | :--- | :--- | :--- |
| **1** | **Falta de categoría específica para mediciones físicas reproducibles de taller:** Las mediciones empíricas simples realizadas en taller (balanza, plantilla de corte, cantilever de mesa sin cámara `ISO 139` ni acreditación) carecían de nivel propio, quedando forzadas entre `TIER_3_ESTIMATED` (estimación subjetiva/IA) y `TIER_1A`/`1B` (laboratorio acreditado o trazable normativo). | §5, §7.1, §7.2, §8.2 | Se incorpora **`TIER_1D_WORKSHOP_MEASURED`** en `evidenceQuality`, emparejado estrictamente con **`dataStatus = "WORKSHOP_MEASURED_RECORD"`**, **`provenance.sourceType = "WORKSHOP_MEASURED_PROTOCOL"`**, **`appliedStandardRef = null`** y un bloque obligatorio **`workshopProtocolMetadata`** (dimensiones de probeta, orientaciones, repeticiones, instrumento/resolución, ambiente e incertidumbre combinada), manteniendo `TIER_3_ESTIMATED` + `WORKSHOP_OVERRIDDEN` (`WORKSHOP_VISUAL_OBSERVATION`) solo para ajustes visuales subjetivos. |
| **2** | **Reglas JSON Schema incompletas para `STALE_RECOMPUTE_REQUIRED`:** V2.3 listaba `STALE_RECOMPUTE_REQUIRED` en `DataStatus` sin cláusula `if`/`then` que garantizara conservación de procedencia, coherencia con la calidad de evidencia previa ni metadatos de caducidad. | §7.1, §7.2.1 | Se añade el sub-objeto obligatorio **`staleMetadata`** (`staleReason`, `markedStaleAt`, `priorDataStatus`, `priorEvidenceQuality`, `priorConverterVersion`) exclusivo para `STALE_RECOMPUTE_REQUIRED` (y `null` en todo otro estado), exigiendo en Schema que `evidenceQuality !== null`, `provenance` conserve íntegramente `sourceType`/`documentRef`/`appliedStandardRef`/`accreditationRef`, y se mantengan los sub-vínculos del `priorDataStatus` (`VERIFIED_RECORD`, `WORKSHOP_MEASURED_RECORD`, `ESTIMATED_RECORD` o `WORKSHOP_OVERRIDDEN`), complementado por la igualdad `priorEvidenceQuality === evidenceQuality` en el validador runtime. |
| **3** | **Protocolo Gate 3B insuficientemente especificado para ser reproducible:** Faltaban dimensiones de probetas, número de repeticiones, tratamiento de orientación (urdimbre/trama/derecho-revés), instrumentación requerida, registro ambiental, fórmula de incertidumbre y criterios objetivos de aceptación. | §8.2, §13 | Se define un **Protocolo Reproducible Completo para Gate 3B** (§8.3) basado en geometrías verificadas de referencia (`ISO 3801` Método 5 / `ASTM D3776` Opción C para masa superficial; `ASTM D1388` Opción A para cantilever a $41.5^\circ$), especificando dimensiones, repeticiones, orientaciones, instrumentos, bitácora ambiental (sin asumir `ISO 139`), propagación formal de incertidumbre ($u_A$, $u_B$, $u_c$) y criterios de aceptación sin inventar mediciones ni tolerancias falsas. |

### Conservación Íntegra de Decisiones y Correcciones Previas (V2.1, V2.2 y V2.3)
- Identificación exacta Kato Tech `KES-FB1`..`FB4` y `CSIRO FAST-1..4` (§4.1).
- Conversiones exactas a unidades SI y reclasificación del mapeo discreto XPBD como pendiente de derivación matemática específica e invarianza bajo remallado (§4.2).
- Desdoblamiento `TIER_1A_ACCREDITED_LAB` (`ISO/IEC 17025:2017`), `TIER_1B_TRACEABLE_LAB`, `TIER_1C_MANUFACTURER_TDS`, `TIER_1D_WORKSHOP_MEASURED`, `TIER_2_DOCUMENTED` y `TIER_3_ESTIMATED`.
- Coherencia estricta `PENDING_SOURCE` ↔ `evidenceQuality: null` ↔ `sourceType: null`, y separación entre `recommendedMethodRefs` y `appliedStandardRef`.
- Alternativas abiertas de geometría y colisión del maniquí sujetas a benchmark en Etapa 1 / Gate 2 (§10.2).
- Etapa 0 en estado **`En revisión / pendiente de aprobación`** (§13).
- M05 estrictamente opcional y de solo lectura; M02 y Flujo B intactos (§2, §9, §11).

---

## 2. Visión Funcional y Separación de Dominios

La visión funcional para *By Katherine Carroll* permanece intacta: habilitar una futura herramienta visual de simulación 3D de prendas que ayude a evaluar caída, volumen, tensión y proporciones textiles antes del corte físico, alimentada por un servicio independiente de inteligencia textil que no exija registro previo en inventario.

```mermaid
flowchart LR
    subgraph Dominio_Existente ["Módulos Existentes (Intactos e Inviolables)"]
        M02["M02: Patronaje CAD 2D & Flujo B
        (Fuente futura de geometría plana)"]
        M05["M05: Catálogo, Stock, Proveedores & TRM
        (Fuente OPCIONAL y SOLO LECTURA)"]
    end

    subgraph Nuevo_Dominio_Independiente ["Dominio Propuesto (Desacoplado · Etapa 0 En Revisión)"]
        TIS["Textile Intelligence Service
        (Investigación, Medición Taller y Caché)"]
        TP["TextileProfile V2.4
        (JSON Schema V2.4 + Invariantes Runtime)"]
        Sim["Motor Físico de Prenda (Por Seleccionar vía Benchmark)
        + Maniquí de Simulación (Alternativas Sujetas a Benchmark)"]
    end

    M05 -.->|"Lectura opcional de pistas
    (name, composition, weight_gsm, drape_profile)"| TIS
    M02 -.->|"Exportación futura no invasiva
    (piezas 2D, costuras, grainline)"| Sim
    TIS --> TP --> Sim
```

### Principios Inquebrantables de Frontera
1. **Independencia total de M05:** El simulador y el *Textile Intelligence Service* operan al 100% incluso con el inventario de M05 vacío o desvinculado.
2. **Preservación de M02 y Flujo B:** El motor CAD 2D de M02 y el Flujo B conservan la autoridad geométrica y milimétrica para el corte físico de tela. No se rediseña M02.
3. **Separación entre torso visual y maniquí de simulación:** El prototipo aislado [`src/components/mannequin3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/) es exclusivamente un busto visual exploratorio (no integrado en producción) y no es apto para simulación física de prendas.

---

## 3. Motores Físicos de Simulación Textil: Evaluación Comparativa y Pruebas Pendientes

> [!CAUTION]
> **Estado de Verificación:** Ninguno de los motores siguientes ha sido ejecutado ni medido dentro de Atelier Digital (Web o móvil Expo). Toda caracterización corresponde a literatura externa y constituye hipótesis sujeta a benchmark antes de elegir motor definitivo.

| Candidato / Familia | Fundamento Teórico | Ventajas Reportadas en Literatura | Riesgos y Limitaciones en Web/Expo | Estado en Atelier Digital |
| :--- | :--- | :--- | :--- | :--- |
| **XPBD** (*Extended Position-Based Dynamics*, Macklin et al., 2016) | Proyección de restricciones con *compliance* elástico ($\alpha$) y multiplicadores de Lagrange regularizados respecto a $\Delta t$ e iteraciones. | Estabilidad numérica alta; soporte de restricciones de distancia, flexión y anisotropía; menor sensibilidad a iteraciones que PBD clásico. | La alta rigidez planar de sedas/tafetanes exige subpasos suficientes o aceleración en Wasm/GPU Compute para evitar estiramiento artificial o caída de FPS en móvil. | **Candidato Principal a Evaluar (No seleccionado definitivamente).** |
| **PBD Clásico** (Müller et al., 2007) | Proyección geométrica directa sin *compliance* físico en unidades SI. | Ligero en JS puro; estable. | Coeficientes ($k \in [0,1]$) dependientes de $\Delta t$ e iteraciones, sin correspondencia dimensional directa con $\text{N/m}$ o $\mu\text{N}\cdot\text{m}$. | **Candidato Secundario de Contraste.** |
| **Mass-Spring Implícito / Semi-Implícito** | Fuerzas elásticas integradas mediante esquemas implícitos o Verlet amortiguado. | Expresión directa de ley de Hooke. | Inestabilidad ante altas rigideces o alto coste lineal disperso por paso en JS. | **Descartado preliminarmente para JS directo** (opcional en Wasm). |
| **FEM Continuo** | Elementos finitos no lineales del medio continuo. | Referencia de precisión en análisis estructural. | Inviable en tiempo real en clientes móviles convencionales. | **Fuera de alcance interactivo.** |
| **Runtime (JS vs. Wasm vs. WebGPU/WebGL Compute)** | Entorno de ejecución del bucle físico y colisiones. | Wasm acelera cálculo numérico/BVH; WebGPU ofrece paralelismo masivo. | Expo móvil limita WebGPU y exige evaluar `WebView` vs. `expo-gl` vs. módulos nativos JSI. | **Asunto Técnico Abierto (Etapa 1).** |

### Batería Obligatoria de Pruebas Comparativas de Motores (Previa a Selección Definitiva)
1. **Escalamiento por densidad de malla:** `ms/step` y FPS sostenidos en matriz escalonada definida en Etapa 1.
2. **Entornos reales:** Web Desktop, Web Móvil y runtime móvil Expo evaluado (`WebView` vs. `expo-gl`).
3. **Prueba de no-estiramiento (*Locking Test*):** Verificar bajo gravedad $\mathbf{g} = -9.81\ \text{m/s}^2$ que un tejido no elástico cumpla el criterio de elongación máxima fijado al aprobar el protocolo de Gate 1.
4. **Prueba de flexión diferencial (*Drape Contrast*):** Contraste claro entre tejidos rígido, intermedio y fluido frente a muestras de Etapa 3.
5. **Auto-colisión multicapa:** Ausencia de penetración severa en pliegues y conjuntos tela principal + forro.

---

## 4. Taxonomía Textil Corregida: Normas, Unidades y Conversión Física

### 4.1 Tabla Maestra de Propiedades Físicas, Instrumentación, Normas de Referencia y Unidades

*(Nota: Las normas e instrumentos siguientes son **métodos de referencia aplicables**; su cita no implica que se hayan ejecutado en un material dado sin informe o protocolo explícito).*

| Propiedad Requerida | Métodos Normativos e Instrumentos de Referencia | Unidad de Laboratorio / SI | Qué Mide Realmente el Ensayo (y Alcance) | Rol en el Simulador de Prenda |
| :--- | :--- | :---: | :--- | :--- |
| **Composición** | **ISO 1833** · **AATCC TM20 / TM20A** · Declaración comercial | `%` en masa por fibra | Identidad y proporción de fibras. | Condiciona densidad estimada, elasticidad, recuperación y acabado PBR. |
| **Construcción / Ligamento** | **ISO 3572** · **ASTM D3775** · Inspección macroscópica | Hilos/cm (urdimbre × trama) y clase | Tipo estructural (tafetán, sarga, raso, punto) y densidad de hilos. | Determina **anisotropía** urdimbre / trama / bies (45°) y resistencia al cizallamiento. |
| **Peso / Masa Superficial** | **ISO 3801** · **ASTM D3776 / D3776M** (acondicionamiento **ISO 139** en laboratorio) | $\text{g/m}^2$ ($\text{GSM}$) o $\text{oz/yd}^2$ ($1\ \text{oz/yd}^2 \approx 33.906\ \text{g/m}^2$) | Masa por unidad de área. | Define masa nodal $m_i$ bajo gravedad. |
| **Grosor / Compresión** | **ISO 5084** · **ASTM D1777** · **KES-FB3** (*Compression Tester*: $T_0, T_m, EMC, WC, RC$) · **CSIRO FAST-1** (*Compression Meter*) | $\text{mm}$; `%` ($EMC$, $RC$); $\text{gf}\cdot\text{cm/cm}^2$ ($WC$) | Espesor bajo presión normal definida y compresibilidad. | Margen mínimo de separación (*collision thickness offset*) cuerpo-tela y entre capas. |
| **Flexión / Rigidez Flexural** | **ASTM D1388** · **ISO 9073-7** · **KES-FB2** (*Pure Bending Tester*: $B, 2HB$) · **CSIRO FAST-2** (*Bending Meter*) | $c$ ($\text{cm}$); $G_{\text{D1388}}$ ($\text{mg}\cdot\text{cm}$); $B_{\text{KES}}$ ($\text{gf}\cdot\text{cm}^2/\text{cm} = \text{gf}\cdot\text{cm}$); SI ($\mu\text{N}\cdot\text{m}$ o $\text{N}\cdot\text{m}$) | Resistencia pura del tejido a curvarse fuera de su plano por peso propio o momento flector. | Controla radio de curvatura de pliegues y volumen estructural. |
| **Elasticidad (Tracción de baja y alta carga)** | **Baja carga:** **KES-FB1** (*Tensile & Shear Tester*: $EMT, WT, LT$) · **CSIRO FAST-3** ($E_5, E_{20}, E_{100}$). **Elásticos:** **ASTM D3107**, **ASTM D2594 / D2594M**, **ISO 20932-1**. **Rotura:** **ISO 13934-1/-2**, **ASTM D5034 / D5035**. | Extensión `%` bajo carga definida ($\text{gf/cm}$ o $\text{N}$); rigidez equivalente ($\text{N/m}$) | ⚠️ `ASTM D5034/D5035` e `ISO 13934` miden rotura en `N`, órdenes de magnitud por encima del régimen de caída en prenda. | Restricciones de extensión en urdimbre, trama y bies. |
| **Recuperación Elástica** | **ASTM D3107** · **ASTM D2594 / D2594M** · **ISO 20932-1** · **KES-FB1** ($RT$ %) | `%` recuperación y `%` deformación residual | Capacidad de recuperación tras retirar carga cíclica. | Histéresis de ajuste y cedimiento en prendas entalladas. |
| **Cizallamiento (Shear)** | **KES-FB1** ($G$, $2HG$, $2HG5$) · **CSIRO FAST-3** ($EB_5$) | $\text{gf}/(\text{cm}\cdot^\circ)$ o $\text{N}/(\text{m}\cdot\text{rad})$; `%` al bies | Resistencia angular de los hilos a deslizarse en paralelogramo bajo carga diagonal. | Adaptación suave a busto, cadera y cortes al bies. |
| **Caída (Drape)** | **ISO 9073-9** · **BS 5058** (Cusick Drapemeter) | $DC$ (`%`) y nodos (*nodes*) | Área proyectada de sombra de disco suspendido bajo peso propio. | **Métrica de validación, NO entrada independiente:** emerge de peso + flexión + cizallamiento. |
| **Fricción y Rugosidad Superficial** | **KES-FB4** (*Surface Tester*: $MIU$, $MMD$, $SMD$) · **ASTM D1894** / **ISO 8295** (solo recubiertos/láminas) | $MIU$, $MMD$ adimensionales; $SMD$ ($\mu\text{m}$) | Resistencia al deslizamiento superficial bajo carga normal baja y rugosidad geométrica. | Deslizamiento tela-tela, tela-forro y tela-maniquí. |

> [!NOTE]
> **Kawabata (KES-FB, Kato Tech Co., Ltd.):** **KES-FB1** (*Tensile & Shear*), **KES-FB2** (*Pure Bending*), **KES-FB3** (*Compression*), **KES-FB4** (*Surface*).  
> **CSIRO FAST:** **FAST-1** (*Compression*), **FAST-2** (*Bending*), **FAST-3** (*Extension & bias shear*), **FAST-4** (*Dimensional Stability*).

---

### 4.2 Conversiones Dimensionales a SI y Ecuaciones Discretas Pendientes de Derivación

#### A. Conversiones Dimensionales Exactas a SI (Verificadas Algebraicamente)
1. **Flexión a SI ($\text{N}\cdot\text{m}$ y $\mu\text{N}\cdot\text{m}$):**
   $$B_{\text{SI}}\ [\text{N}\cdot\text{m}] = B_{\text{KES}}\ [\text{gf}\cdot\text{cm}] \times 9.80665 \times 10^{-5}, \qquad B_{\mu\text{Nm}} = B_{\text{KES}} \times 98.0665$$
   $$G_{\text{D1388}}\ [\text{mg}\cdot\text{cm}] = 0.1 \cdot \rho_{\text{gsm}} \cdot c_{\text{cm}}^3, \qquad B_{\mu\text{Nm}} = G_{\text{D1388}} \times 0.0980665$$
2. **Cizallamiento (KES-FB1 $G$) a SI ($\text{N}/(\text{m}\cdot\text{rad})$):**
   $$G_{\text{SI}}\ [\text{N}/(\text{m}\cdot\text{rad})] = G_{\text{KES}}\ [\text{gf}/(\text{cm}\cdot^\circ)] \times \frac{0.980665}{\pi / 180} \approx G_{\text{KES}} \times 56.1879$$
3. **Rigidez Lineal Equivalente de Tracción de Baja Carga ($\text{N/m}$):**
   $$K_{\text{stretch}}\ [\text{N/m}] \approx \frac{F_w}{E_w / 100} \qquad (\text{ej. } F_w = 100\ \text{gf/cm} = 98.0665\ \text{N/m})$$
   - ⚠️ **Limitación física:** Comportamiento no lineal; un escalar lineal único es solo una primera aproximación sujeta a calibración según el motor elegido.

#### B. Mapeo a *Compliance* XPBD ($\alpha$) — **PENDIENTE DE DERIVACIÓN Y VERIFICACIÓN ESPECÍFICA**
En **XPBD** (Macklin et al., 2016), $\tilde{\alpha}_j = \alpha_j / \Delta t^2$ depende del operador discreto específico $C_j(\mathbf{x})$ elegido para membrana y flexión. Todas las ecuaciones discretas permanecen clasificadas como **pendientes de derivación formal vinculada al operador elegido en Etapa 1** y sujetas a prueba de invarianza bajo remallado antes de codificar el solver.

---

## 5. Arquitectura del *Textile Intelligence Service* (Independiente de M05)

```mermaid
flowchart TD
    subgraph Entradas ["1. Entradas Flexibles (Al menos 1 requerida)"]
        E1["Nombre / Referencia de Tela"]
        E2["Descripción de Mano / Comportamiento"]
        E3["Fotografía de Muestra / Pliegue"]
        E4["ID Material M05 (Read-Only Opcional)"]
        E5["Protocolo Físico de Taller (Gate 3B)"]
    end

    subgraph Resolucion ["2. Normalización y Caché Canónico"]
        Norm["Normalizador Semántico de Consulta"]
        Cache{"¿Acierto vigente o marcado
        STALE_RECOMPUTE_REQUIRED?"}
    end

    subgraph Evidencia ["3. Niveles Diferenciados de Evidencia"]
        F1A["1A: Laboratorio Acreditado (ISO/IEC 17025) → TIER_1A_ACCREDITED_LAB"]
        F1B["1B: Ensayo Trazable No Acreditado → TIER_1B_TRACEABLE_LAB"]
        F1C["1C: Ficha Técnica Comercial (TDS) → TIER_1C_MANUFACTURER_TDS"]
        F1D["1D: Medición Física Reproducible Taller (Gate 3B) → TIER_1D_WORKSHOP_MEASURED"]
        F2["2: Literatura Textil Verificada → TIER_2_DOCUMENTED"]
        F3["3: Heurística IA / Foto / Visual Subjetivo → TIER_3_ESTIMATED"]
        F0["Sin respaldo ni estimación → dataStatus: PENDING_SOURCE, evidenceQuality: null"]
    end

    subgraph Ensamblaje ["4. Modelo Ortogonal + Validador V2.4"]
        PropBuilder["Envolvente V2.4:
        provenance + evidenceQuality + dataStatus + workshopProtocolMetadata + staleMetadata"]
        Validator["Validador JSON Schema V2.4 + Invariantes Runtime"]
    end

    E1 & E2 & E3 & E5 --> Norm
    E4 -.->|Solo lectura| Norm
    Norm --> Cache
    Cache -- Hit vigente --> Out["TextileProfile V2.4"]
    Cache -- Miss / Stale --> F1A
    F1A --> F1B --> F1C --> F1D --> F2 --> F3 --> F0
    F1A & F1B & F1C & F1D & F2 & F3 & F0 --> PropBuilder --> Validator --> Out
```

### Reglas de Operación del Servicio
1. **Independencia de M05:** Funciona íntegramente sin consultar M05.
2. **Separación de seis niveles de evidencia (`evidenceQuality`):**
   - `TIER_1A_ACCREDITED_LAB`: Laboratorio acreditado (`ISO/IEC 17025:2017` o equivalente) con `accreditationRef` y `appliedStandardRef`.
   - `TIER_1B_TRACEABLE_LAB`: Laboratorio no acreditado con ensayo normado trazable (`appliedStandardRef` y `documentRef`, `accreditationRef = null`).
   - `TIER_1C_MANUFACTURER_TDS`: Ficha comercial nominal de fabricante (`documentRef` del TDS, `accreditationRef = null`).
   - **`TIER_1D_WORKSHOP_MEASURED`**: Medición física reproducible ejecutada en el taller bajo el Protocolo Gate 3B (§8.3), con **`dataStatus = WORKSHOP_MEASURED_RECORD`**, **`sourceType = WORKSHOP_MEASURED_PROTOCOL`**, **`appliedStandardRef = null`** y bloque obligatorio **`workshopProtocolMetadata`**. No se confunde ni con estimaciones `TIER_3` ni con ensayos `TIER_1A/1B`.
   - `TIER_2_DOCUMENTED`: Literatura técnica verificable.
   - `TIER_3_ESTIMATED`: Estimación heurística IA, pista visual o ajuste subjetivo (`WORKSHOP_OVERRIDDEN` + `WORKSHOP_VISUAL_OBSERVATION`).
3. **Conservación íntegra al transicionar a `STALE_RECOMPUTE_REQUIRED`:** Cuando vence un TTL, cambia `converterVersion` o una fuente queda obsoleta, el registro **nunca** pierde su `evidenceQuality`, `provenance`, `measuredValue`/`range` previos ni sus metadatos de auditoría (`workshopProtocolMetadata` o `previousValueAudit`); simplemente cambia `dataStatus` a `STALE_RECOMPUTE_REQUIRED` y puebla `staleMetadata`.

---

## 6. Análisis por Fotografía: Alcances Reales y Límites Físicos

| Capacidad | Viable por Fotografía | Evidencia Máxima | Justificación Física |
| :--- | :---: | :---: | :--- |
| **Acabado óptico superficial y PBR** (color, brillo, relieve, transparencia) | ✅ Sí (Orientativo) | Visual / PBR (`TIER_3_ESTIMATED`) | Propiedades ópticas de superficie sin impacto directo en constantes SI. |
| **Apariencia macroscópica de ligamento** | ✅ Sí (foto enfocada) | `TIER_3_ESTIMATED` | Orienta clase constructiva probable sin confirmar densidad real ni fibra. |
| **Medición de masa superficial, flexión, tracción o cizallamiento** | ❌ **NO** | No aplicable | Sin escala metrológica ni fuerzas conocidas, una imagen no mide constantes mecánicas. |
| **Identificación química de fibra** | ❌ **NO** | No aplicable | Requiere ficha técnica, etiqueta o análisis químico (`ISO 1833` / `AATCC TM20`). |

---

## 7. Modelo Ortogonal V2.4, JSON Schema Draft 2020-12, Ejemplos y Reglas de Runtime

### 7.1 Matriz Completa de Coherencia (`dataStatus` ↔ `evidenceQuality` ↔ `provenance.sourceType`)

| `dataStatus` | `evidenceQuality` Permitido | `provenance.sourceType` Permitido | Reglas de Valor y Sub-objetos Obligatorios | `appliedStandardRef` / `accreditationRef` |
| :--- | :--- | :--- | :--- | :--- |
| **`PENDING_SOURCE`** | Exclusivamente **`null`** | Exclusivamente **`null`** | `measuredValue = null`, `range = null`, `workshopProtocolMetadata = null`, `staleMetadata = null`. | Ambos **`null`** (normas sugeridas solo en `recommendedMethodRefs`). |
| **`VERIFIED_RECORD`** | `TIER_1A_ACCREDITED_LAB`, `TIER_1B_TRACEABLE_LAB`, `TIER_1C_MANUFACTURER_TDS`, `TIER_2_DOCUMENTED` | `ACCREDITED_LAB` ↔ `1A`, `TRACEABLE_LAB` ↔ `1B`, `MANUFACTURER_TDS` ↔ `1C`, `SCIENTIFIC_LITERATURE` ↔ `2` | Al menos `measuredValue` o `range` no nulo + `documentRef` no nulo; `workshopProtocolMetadata = null`, `staleMetadata = null`. | `appliedStandardRef` obligatorio en `1A`/`1B`; `accreditationRef` obligatorio solo en `1A`. |
| **`WORKSHOP_MEASURED_RECORD`** | Exclusivamente **`TIER_1D_WORKSHOP_MEASURED`** | Exclusivamente **`WORKSHOP_MEASURED_PROTOCOL`** | Al menos `measuredValue` o `range` no nulo; **`workshopProtocolMetadata` obligatorio no nulo**; `staleMetadata = null`. | Ambos **`null`** (la referencia metodológica inspiradora va en `workshopProtocolMetadata.adaptedFromMethodRef`). |
| **`ESTIMATED_RECORD`** | Exclusivamente **`TIER_3_ESTIMATED`** | `AI_HEURISTIC`, `M05_READONLY_HINT` o `WORKSHOP_VISUAL_OBSERVATION` | `measuredValue = null`, `range` no nulo + `assumptionNote` obligatorio; `workshopProtocolMetadata = null`, `staleMetadata = null`. | Ambos **`null`**. |
| **`WORKSHOP_OVERRIDDEN`** | Exclusivamente **`TIER_3_ESTIMATED`** | Exclusivamente **`WORKSHOP_VISUAL_OBSERVATION`** | Al menos `measuredValue` o `range` no nulo + **`previousValueAudit` obligatorio**; `workshopProtocolMetadata = null`, `staleMetadata = null`. | Ambos **`null`**. |
| **`STALE_RECOMPUTE_REQUIRED`** | **No nulo** (`TIER_1A` .. `TIER_3`) | Coherente con su `evidenceQuality` previo (vía `EvidenceProvenanceCoherenceRules`) | **`staleMetadata` obligatorio no nulo**; conserva `measuredValue`/`range`, `provenance` completo y sub-vínculos coherentes con `staleMetadata.priorDataStatus` (incluyendo `workshopProtocolMetadata` si `priorDataStatus = WORKSHOP_MEASURED_RECORD` o `previousValueAudit` si `priorDataStatus = WORKSHOP_OVERRIDDEN`). | Coherente íntegramente con `evidenceQuality` previo (conservado sin pérdida). |

---

### 7.2 Contrato JSON Schema Draft 2020-12 (`TextileProfileV2_4`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://atelierdigital.local/schemas/textile-profile-v2.4.schema.json",
  "title": "TextileProfileV2_4",
  "description": "Contrato V2.4 con nivel TIER_1D_WORKSHOP_MEASURED, estado WORKSHOP_MEASURED_RECORD y reglas completas de conservacion de procedencia y evidencia para STALE_RECOMPUTE_REQUIRED.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "profileId",
    "cacheKey",
    "createdAt",
    "identification",
    "overallSummary",
    "physicalProperties",
    "solverTranslationMetadata",
    "optionalM05Link",
    "serviceProvenance"
  ],
  "properties": {
    "schemaVersion": { "const": "2.4.0-draft" },
    "profileId": { "type": "string", "minLength": 1 },
    "cacheKey": { "type": "string", "minLength": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "identification": {
      "type": "object",
      "additionalProperties": false,
      "required": ["displayName", "composition", "weaveType"],
      "properties": {
        "displayName": { "type": "string", "minLength": 1 },
        "composition": { "$ref": "#/$defs/StringMetadataEnvelope" },
        "weaveType": { "$ref": "#/$defs/StringMetadataEnvelope" }
      }
    },
    "overallSummary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "highestEvidenceQuality",
        "lowestEvidenceQuality",
        "countsByEvidenceQuality",
        "countsByDataStatus",
        "requiresPhysicalCalibration"
      ],
      "properties": {
        "highestEvidenceQuality": { "$ref": "#/$defs/NullableEvidenceQualityTier" },
        "lowestEvidenceQuality": { "$ref": "#/$defs/NullableEvidenceQualityTier" },
        "countsByEvidenceQuality": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "TIER_1A_ACCREDITED_LAB",
            "TIER_1B_TRACEABLE_LAB",
            "TIER_1C_MANUFACTURER_TDS",
            "TIER_1D_WORKSHOP_MEASURED",
            "TIER_2_DOCUMENTED",
            "TIER_3_ESTIMATED",
            "UNASSIGNED_PENDING"
          ],
          "properties": {
            "TIER_1A_ACCREDITED_LAB": { "type": "integer", "minimum": 0 },
            "TIER_1B_TRACEABLE_LAB": { "type": "integer", "minimum": 0 },
            "TIER_1C_MANUFACTURER_TDS": { "type": "integer", "minimum": 0 },
            "TIER_1D_WORKSHOP_MEASURED": { "type": "integer", "minimum": 0 },
            "TIER_2_DOCUMENTED": { "type": "integer", "minimum": 0 },
            "TIER_3_ESTIMATED": { "type": "integer", "minimum": 0 },
            "UNASSIGNED_PENDING": { "type": "integer", "minimum": 0 }
          }
        },
        "countsByDataStatus": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "PENDING_SOURCE",
            "VERIFIED_RECORD",
            "WORKSHOP_MEASURED_RECORD",
            "ESTIMATED_RECORD",
            "WORKSHOP_OVERRIDDEN",
            "STALE_RECOMPUTE_REQUIRED"
          ],
          "properties": {
            "PENDING_SOURCE": { "type": "integer", "minimum": 0 },
            "VERIFIED_RECORD": { "type": "integer", "minimum": 0 },
            "WORKSHOP_MEASURED_RECORD": { "type": "integer", "minimum": 0 },
            "ESTIMATED_RECORD": { "type": "integer", "minimum": 0 },
            "WORKSHOP_OVERRIDDEN": { "type": "integer", "minimum": 0 },
            "STALE_RECOMPUTE_REQUIRED": { "type": "integer", "minimum": 0 }
          }
        },
        "requiresPhysicalCalibration": { "type": "boolean" }
      }
    },
    "physicalProperties": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "arealDensity_gsm",
        "thickness_mm",
        "bendingStiffness_warp_uNm",
        "bendingStiffness_weft_uNm",
        "stretchStiffness_lowStrain_warp_N_per_m",
        "stretchStiffness_lowStrain_weft_N_per_m",
        "elasticRecovery_percent",
        "shearStiffness_N_per_m_rad",
        "frictionCoefficient_clothToCloth"
      ],
      "properties": {
        "arealDensity_gsm": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "thickness_mm": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "bendingStiffness_warp_uNm": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "bendingStiffness_weft_uNm": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "stretchStiffness_lowStrain_warp_N_per_m": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "stretchStiffness_lowStrain_weft_N_per_m": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "elasticRecovery_percent": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "shearStiffness_N_per_m_rad": { "$ref": "#/$defs/PhysicalPropertyEnvelope" },
        "frictionCoefficient_clothToCloth": { "$ref": "#/$defs/PhysicalPropertyEnvelope" }
      }
    },
    "solverTranslationMetadata": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "targetSolverCandidate",
        "discreteFormulationStatus",
        "converterVersion",
        "notes"
      ],
      "properties": {
        "targetSolverCandidate": {
          "enum": ["PENDING_BENCHMARK_SELECTION", "XPBD", "PBD", "MASS_SPRING_IMPLICIT"]
        },
        "discreteFormulationStatus": {
          "enum": ["PENDING_OPERATOR_DERIVATION", "DERIVED_AND_REMESH_VERIFIED"]
        },
        "converterVersion": { "type": "string", "minLength": 1 },
        "notes": { "type": "string" }
      }
    },
    "optionalM05Link": {
      "type": "object",
      "additionalProperties": false,
      "required": ["linked", "materialId", "readOnlyFieldsUsed"],
      "properties": {
        "linked": { "type": "boolean" },
        "materialId": { "type": ["string", "null"] },
        "readOnlyFieldsUsed": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "serviceProvenance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["aiAssisted", "aiModelId", "aiPromptVersion", "timestamp"],
      "properties": {
        "aiAssisted": { "type": "boolean" },
        "aiModelId": { "type": ["string", "null"] },
        "aiPromptVersion": { "type": ["string", "null"] },
        "timestamp": { "type": "string", "format": "date-time" }
      }
    }
  },
  "$defs": {
    "EvidenceQualityTier": {
      "type": "string",
      "enum": [
        "TIER_1A_ACCREDITED_LAB",
        "TIER_1B_TRACEABLE_LAB",
        "TIER_1C_MANUFACTURER_TDS",
        "TIER_1D_WORKSHOP_MEASURED",
        "TIER_2_DOCUMENTED",
        "TIER_3_ESTIMATED"
      ]
    },
    "NullableEvidenceQualityTier": {
      "type": ["string", "null"],
      "enum": [
        "TIER_1A_ACCREDITED_LAB",
        "TIER_1B_TRACEABLE_LAB",
        "TIER_1C_MANUFACTURER_TDS",
        "TIER_1D_WORKSHOP_MEASURED",
        "TIER_2_DOCUMENTED",
        "TIER_3_ESTIMATED",
        null
      ]
    },
    "DataStatus": {
      "type": "string",
      "enum": [
        "PENDING_SOURCE",
        "VERIFIED_RECORD",
        "WORKSHOP_MEASURED_RECORD",
        "ESTIMATED_RECORD",
        "WORKSHOP_OVERRIDDEN",
        "STALE_RECOMPUTE_REQUIRED"
      ]
    },
    "PriorActiveDataStatus": {
      "type": "string",
      "enum": [
        "VERIFIED_RECORD",
        "WORKSHOP_MEASURED_RECORD",
        "ESTIMATED_RECORD",
        "WORKSHOP_OVERRIDDEN"
      ]
    },
    "NullableSourceType": {
      "type": ["string", "null"],
      "enum": [
        "ACCREDITED_LAB",
        "TRACEABLE_LAB",
        "MANUFACTURER_TDS",
        "WORKSHOP_MEASURED_PROTOCOL",
        "SCIENTIFIC_LITERATURE",
        "M05_READONLY_HINT",
        "AI_HEURISTIC",
        "WORKSHOP_VISUAL_OBSERVATION",
        null
      ]
    },
    "NumericRange": {
      "type": "object",
      "additionalProperties": false,
      "required": ["min", "max"],
      "properties": {
        "min": { "type": "number", "minimum": 0 },
        "typical": { "type": ["number", "null"], "minimum": 0 },
        "max": { "type": "number", "minimum": 0 }
      }
    },
    "PreviousValueAudit": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "previousDataStatus",
        "previousEvidenceQuality",
        "previousMeasuredValue",
        "previousRange",
        "overrideReason",
        "overriddenAt"
      ],
      "properties": {
        "previousDataStatus": { "$ref": "#/$defs/DataStatus" },
        "previousEvidenceQuality": { "$ref": "#/$defs/NullableEvidenceQualityTier" },
        "previousMeasuredValue": { "type": ["number", "null"], "minimum": 0 },
        "previousRange": {
          "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/NumericRange" }]
        },
        "overrideReason": { "type": "string", "minLength": 1 },
        "overriddenAt": { "type": "string", "format": "date-time" }
      }
    },
    "WorkshopProtocolMetadata": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "protocolVersion",
        "adaptedFromMethodRef",
        "specimenDimensions_mm",
        "orientationsTested",
        "repetitionsCount",
        "instrumentNameAndResolution",
        "ambientTemperature_C",
        "relativeHumidity_percent",
        "combinedUncertainty",
        "uncertaintyUnit",
        "uncertaintyCalculationNote"
      ],
      "properties": {
        "protocolVersion": { "type": "string", "minLength": 1 },
        "adaptedFromMethodRef": { "type": ["string", "null"] },
        "specimenDimensions_mm": { "type": "string", "minLength": 1 },
        "orientationsTested": {
          "type": "array",
          "minItems": 1,
          "items": {
            "enum": ["WARP", "WEFT", "BIAS_45", "FACE_UP", "FACE_DOWN", "UNORIENTED_AREA"]
          }
        },
        "repetitionsCount": { "type": "integer", "minimum": 1 },
        "instrumentNameAndResolution": { "type": "string", "minLength": 1 },
        "ambientTemperature_C": { "type": ["number", "null"] },
        "relativeHumidity_percent": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
        "combinedUncertainty": { "type": ["number", "null"], "minimum": 0 },
        "uncertaintyUnit": { "type": ["string", "null"] },
        "uncertaintyCalculationNote": { "type": "string", "minLength": 1 }
      }
    },
    "StaleMetadata": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "staleReason",
        "markedStaleAt",
        "priorDataStatus",
        "priorEvidenceQuality",
        "priorConverterVersion"
      ],
      "properties": {
        "staleReason": {
          "enum": [
            "CONVERTER_VERSION_CHANGED",
            "CACHE_TTL_EXPIRED",
            "SOURCE_SUPERSEDED",
            "WORKSHOP_RECALIBRATION_NEEDED"
          ]
        },
        "markedStaleAt": { "type": "string", "format": "date-time" },
        "priorDataStatus": { "$ref": "#/$defs/PriorActiveDataStatus" },
        "priorEvidenceQuality": { "$ref": "#/$defs/EvidenceQualityTier" },
        "priorConverterVersion": { "type": ["string", "null"] }
      }
    },
    "Provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sourceType",
        "sourceName",
        "documentRef",
        "appliedStandardRef",
        "accreditationRef",
        "conditioningProtocol",
        "actorOrModelId",
        "recordedAt",
        "previousValueAudit"
      ],
      "properties": {
        "sourceType": { "$ref": "#/$defs/NullableSourceType" },
        "sourceName": { "type": ["string", "null"] },
        "documentRef": { "type": ["string", "null"] },
        "appliedStandardRef": { "type": ["string", "null"] },
        "accreditationRef": { "type": ["string", "null"] },
        "conditioningProtocol": { "type": ["string", "null"] },
        "actorOrModelId": { "type": ["string", "null"] },
        "recordedAt": { "type": ["string", "null"], "format": "date-time" },
        "previousValueAudit": {
          "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/PreviousValueAudit" }]
        }
      }
    },
    "EvidenceProvenanceCoherenceRules": {
      "allOf": [
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_1A_ACCREDITED_LAB" } } },
          "then": {
            "properties": {
              "provenance": {
                "properties": {
                  "sourceType": { "const": "ACCREDITED_LAB" },
                  "sourceName": { "type": "string", "minLength": 1 },
                  "accreditationRef": { "type": "string", "minLength": 1 },
                  "appliedStandardRef": { "type": "string", "minLength": 1 },
                  "documentRef": { "type": "string", "minLength": 1 },
                  "recordedAt": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_1B_TRACEABLE_LAB" } } },
          "then": {
            "properties": {
              "provenance": {
                "properties": {
                  "sourceType": { "const": "TRACEABLE_LAB" },
                  "sourceName": { "type": "string", "minLength": 1 },
                  "accreditationRef": { "type": "null" },
                  "appliedStandardRef": { "type": "string", "minLength": 1 },
                  "documentRef": { "type": "string", "minLength": 1 },
                  "recordedAt": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_1C_MANUFACTURER_TDS" } } },
          "then": {
            "properties": {
              "provenance": {
                "properties": {
                  "sourceType": { "const": "MANUFACTURER_TDS" },
                  "sourceName": { "type": "string", "minLength": 1 },
                  "accreditationRef": { "type": "null" },
                  "documentRef": { "type": "string", "minLength": 1 },
                  "recordedAt": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_1D_WORKSHOP_MEASURED" } } },
          "then": {
            "properties": {
              "provenance": {
                "properties": {
                  "sourceType": { "const": "WORKSHOP_MEASURED_PROTOCOL" },
                  "sourceName": { "type": "string", "minLength": 1 },
                  "accreditationRef": { "type": "null" },
                  "appliedStandardRef": { "type": "null" },
                  "documentRef": { "type": "string", "minLength": 1 },
                  "recordedAt": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_2_DOCUMENTED" } } },
          "then": {
            "properties": {
              "provenance": {
                "properties": {
                  "sourceType": { "const": "SCIENTIFIC_LITERATURE" },
                  "sourceName": { "type": "string", "minLength": 1 },
                  "accreditationRef": { "type": "null" },
                  "documentRef": { "type": "string", "minLength": 1 },
                  "recordedAt": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_3_ESTIMATED" } } },
          "then": {
            "properties": {
              "provenance": {
                "properties": {
                  "sourceType": {
                    "type": "string",
                    "enum": ["AI_HEURISTIC", "M05_READONLY_HINT", "WORKSHOP_VISUAL_OBSERVATION"]
                  },
                  "accreditationRef": { "type": "null" },
                  "appliedStandardRef": { "type": "null" },
                  "recordedAt": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        }
      ]
    },
    "StringMetadataEnvelope": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "value",
        "recommendedMethodRefs",
        "evidenceQuality",
        "dataStatus",
        "provenance",
        "staleMetadata"
      ],
      "properties": {
        "value": { "type": ["string", "null"] },
        "recommendedMethodRefs": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        },
        "evidenceQuality": { "$ref": "#/$defs/NullableEvidenceQualityTier" },
        "dataStatus": { "$ref": "#/$defs/DataStatus" },
        "provenance": { "$ref": "#/$defs/Provenance" },
        "staleMetadata": {
          "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/StaleMetadata" }]
        }
      },
      "allOf": [
        { "$ref": "#/$defs/EvidenceProvenanceCoherenceRules" },
        {
          "if": { "properties": { "dataStatus": { "const": "PENDING_SOURCE" } } },
          "then": {
            "properties": {
              "value": { "type": "null" },
              "evidenceQuality": { "type": "null" },
              "staleMetadata": { "type": "null" },
              "provenance": {
                "properties": {
                  "sourceType": { "type": "null" },
                  "sourceName": { "type": "null" },
                  "documentRef": { "type": "null" },
                  "appliedStandardRef": { "type": "null" },
                  "accreditationRef": { "type": "null" },
                  "conditioningProtocol": { "type": "null" },
                  "previousValueAudit": { "type": "null" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "VERIFIED_RECORD" } } },
          "then": {
            "properties": {
              "value": { "type": "string", "minLength": 1 },
              "staleMetadata": { "type": "null" },
              "evidenceQuality": {
                "type": "string",
                "enum": [
                  "TIER_1A_ACCREDITED_LAB",
                  "TIER_1B_TRACEABLE_LAB",
                  "TIER_1C_MANUFACTURER_TDS",
                  "TIER_2_DOCUMENTED"
                ]
              }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "WORKSHOP_MEASURED_RECORD" } } },
          "then": {
            "properties": {
              "value": { "type": "string", "minLength": 1 },
              "staleMetadata": { "type": "null" },
              "evidenceQuality": { "const": "TIER_1D_WORKSHOP_MEASURED" }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "ESTIMATED_RECORD" } } },
          "then": {
            "properties": {
              "value": { "type": "string", "minLength": 1 },
              "staleMetadata": { "type": "null" },
              "evidenceQuality": { "const": "TIER_3_ESTIMATED" }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "WORKSHOP_OVERRIDDEN" } } },
          "then": {
            "properties": {
              "value": { "type": "string", "minLength": 1 },
              "staleMetadata": { "type": "null" },
              "evidenceQuality": { "const": "TIER_3_ESTIMATED" },
              "provenance": {
                "properties": {
                  "sourceType": { "const": "WORKSHOP_VISUAL_OBSERVATION" },
                  "previousValueAudit": { "$ref": "#/$defs/PreviousValueAudit" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "STALE_RECOMPUTE_REQUIRED" } } },
          "then": {
            "properties": {
              "value": { "type": "string", "minLength": 1 },
              "evidenceQuality": { "$ref": "#/$defs/EvidenceQualityTier" },
              "staleMetadata": { "$ref": "#/$defs/StaleMetadata" }
            }
          }
        }
      ]
    },
    "PhysicalPropertyEnvelope": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "unit",
        "recommendedMethodRefs",
        "measuredValue",
        "range",
        "evidenceQuality",
        "dataStatus",
        "provenance",
        "workshopProtocolMetadata",
        "staleMetadata",
        "assumptionNote"
      ],
      "properties": {
        "unit": { "type": "string", "minLength": 1 },
        "recommendedMethodRefs": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        },
        "measuredValue": { "type": ["number", "null"], "minimum": 0 },
        "range": {
          "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/NumericRange" }]
        },
        "evidenceQuality": { "$ref": "#/$defs/NullableEvidenceQualityTier" },
        "dataStatus": { "$ref": "#/$defs/DataStatus" },
        "provenance": { "$ref": "#/$defs/Provenance" },
        "workshopProtocolMetadata": {
          "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/WorkshopProtocolMetadata" }]
        },
        "staleMetadata": {
          "oneOf": [{ "type": "null" }, { "$ref": "#/$defs/StaleMetadata" }]
        },
        "assumptionNote": { "type": ["string", "null"] }
      },
      "allOf": [
        { "$ref": "#/$defs/EvidenceProvenanceCoherenceRules" },
        {
          "if": { "properties": { "dataStatus": { "const": "PENDING_SOURCE" } } },
          "then": {
            "properties": {
              "measuredValue": { "type": "null" },
              "range": { "type": "null" },
              "evidenceQuality": { "type": "null" },
              "workshopProtocolMetadata": { "type": "null" },
              "staleMetadata": { "type": "null" },
              "provenance": {
                "properties": {
                  "sourceType": { "type": "null" },
                  "sourceName": { "type": "null" },
                  "documentRef": { "type": "null" },
                  "appliedStandardRef": { "type": "null" },
                  "accreditationRef": { "type": "null" },
                  "conditioningProtocol": { "type": "null" },
                  "previousValueAudit": { "type": "null" }
                }
              }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "VERIFIED_RECORD" } } },
          "then": {
            "properties": {
              "workshopProtocolMetadata": { "type": "null" },
              "staleMetadata": { "type": "null" },
              "evidenceQuality": {
                "type": "string",
                "enum": [
                  "TIER_1A_ACCREDITED_LAB",
                  "TIER_1B_TRACEABLE_LAB",
                  "TIER_1C_MANUFACTURER_TDS",
                  "TIER_2_DOCUMENTED"
                ]
              }
            },
            "anyOf": [
              { "properties": { "measuredValue": { "type": "number", "minimum": 0 } } },
              { "properties": { "range": { "$ref": "#/$defs/NumericRange" } } }
            ]
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "WORKSHOP_MEASURED_RECORD" } } },
          "then": {
            "properties": {
              "evidenceQuality": { "const": "TIER_1D_WORKSHOP_MEASURED" },
              "workshopProtocolMetadata": { "$ref": "#/$defs/WorkshopProtocolMetadata" },
              "staleMetadata": { "type": "null" }
            },
            "anyOf": [
              { "properties": { "measuredValue": { "type": "number", "minimum": 0 } } },
              { "properties": { "range": { "$ref": "#/$defs/NumericRange" } } }
            ]
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "ESTIMATED_RECORD" } } },
          "then": {
            "properties": {
              "evidenceQuality": { "const": "TIER_3_ESTIMATED" },
              "measuredValue": { "type": "null" },
              "range": { "$ref": "#/$defs/NumericRange" },
              "workshopProtocolMetadata": { "type": "null" },
              "staleMetadata": { "type": "null" },
              "assumptionNote": { "type": "string", "minLength": 1 }
            }
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "WORKSHOP_OVERRIDDEN" } } },
          "then": {
            "properties": {
              "evidenceQuality": { "const": "TIER_3_ESTIMATED" },
              "workshopProtocolMetadata": { "type": "null" },
              "staleMetadata": { "type": "null" },
              "provenance": {
                "properties": {
                  "sourceType": { "const": "WORKSHOP_VISUAL_OBSERVATION" },
                  "previousValueAudit": { "$ref": "#/$defs/PreviousValueAudit" }
                }
              }
            },
            "anyOf": [
              { "properties": { "measuredValue": { "type": "number", "minimum": 0 } } },
              { "properties": { "range": { "$ref": "#/$defs/NumericRange" } } }
            ]
          }
        },
        {
          "if": { "properties": { "dataStatus": { "const": "STALE_RECOMPUTE_REQUIRED" } } },
          "then": {
            "properties": {
              "evidenceQuality": { "$ref": "#/$defs/EvidenceQualityTier" },
              "staleMetadata": { "$ref": "#/$defs/StaleMetadata" }
            },
            "anyOf": [
              { "properties": { "measuredValue": { "type": "number", "minimum": 0 } } },
              { "properties": { "range": { "$ref": "#/$defs/NumericRange" } } }
            ],
            "allOf": [
              {
                "if": {
                  "properties": {
                    "staleMetadata": {
                      "properties": { "priorDataStatus": { "const": "VERIFIED_RECORD" } }
                    }
                  }
                },
                "then": {
                  "properties": {
                    "workshopProtocolMetadata": { "type": "null" },
                    "evidenceQuality": {
                      "type": "string",
                      "enum": [
                        "TIER_1A_ACCREDITED_LAB",
                        "TIER_1B_TRACEABLE_LAB",
                        "TIER_1C_MANUFACTURER_TDS",
                        "TIER_2_DOCUMENTED"
                      ]
                    }
                  }
                }
              },
              {
                "if": {
                  "properties": {
                    "staleMetadata": {
                      "properties": { "priorDataStatus": { "const": "WORKSHOP_MEASURED_RECORD" } }
                    }
                  }
                },
                "then": {
                  "properties": {
                    "evidenceQuality": { "const": "TIER_1D_WORKSHOP_MEASURED" },
                    "workshopProtocolMetadata": { "$ref": "#/$defs/WorkshopProtocolMetadata" }
                  }
                }
              },
              {
                "if": {
                  "properties": {
                    "staleMetadata": {
                      "properties": { "priorDataStatus": { "const": "ESTIMATED_RECORD" } }
                    }
                  }
                },
                "then": {
                  "properties": {
                    "evidenceQuality": { "const": "TIER_3_ESTIMATED" },
                    "measuredValue": { "type": "null" },
                    "range": { "$ref": "#/$defs/NumericRange" },
                    "workshopProtocolMetadata": { "type": "null" },
                    "assumptionNote": { "type": "string", "minLength": 1 }
                  }
                }
              },
              {
                "if": {
                  "properties": {
                    "staleMetadata": {
                      "properties": { "priorDataStatus": { "const": "WORKSHOP_OVERRIDDEN" } }
                    }
                  }
                },
                "then": {
                  "properties": {
                    "evidenceQuality": { "const": "TIER_3_ESTIMATED" },
                    "workshopProtocolMetadata": { "type": "null" },
                    "provenance": {
                      "properties": {
                        "sourceType": { "const": "WORKSHOP_VISUAL_OBSERVATION" },
                        "previousValueAudit": { "$ref": "#/$defs/PreviousValueAudit" }
                      }
                    }
                  }
                }
              }
            ]
          }
        },
        {
          "if": { "properties": { "evidenceQuality": { "const": "TIER_3_ESTIMATED" } } },
          "then": {
            "properties": {
              "assumptionNote": { "type": "string", "minLength": 1 }
            }
          }
        }
      ]
    }
  }
}
```

---

### 7.3 Reglas Obligatorias del Validador Determinista de Runtime (`validateTextileProfileInvariants`)

Dado que **JSON Schema Draft 2020-12** no evalúa relaciones aritméticas ni igualdad entre campos hermanos, toda implementación deberá ejecutar obligatoriamente las cinco reglas de runtime siguientes tras superar el Schema:

1. **Invariante de rangos (`NumericRange`):** Para cualquier `range !== null` (y `previousRange !== null`), exigir `range.min <= range.max` y, si `range.typical !== null`, `range.min <= range.typical <= range.max`. En `elasticRecovery_percent`, exigir además valores en el intervalo `[0, 100]`.
2. **Igualdad de conservación en `STALE_RECOMPUTE_REQUIRED`:** Cuando `dataStatus === "STALE_RECOMPUTE_REQUIRED"`, verificar estrictamente que `staleMetadata.priorEvidenceQuality === evidenceQuality` (garantizando que el marcado como obsoleto no mutó ni degradó silenciosamente la evidencia documentada original).
3. **Cuadre exacto de `overallSummary`:**
   - La suma de `countsByEvidenceQuality` debe igualar exactamente al número de claves en `physicalProperties` (`9`), y cada contador debe coincidir exactamente con el conteo real sobre las 9 propiedades (asignando `evidenceQuality === null` a `UNASSIGNED_PENDING`).
   - La suma de `countsByDataStatus` debe igualar exactamente `9` y coincidir por estado.
   - Si todas las propiedades tienen `evidenceQuality === null`, entonces `highestEvidenceQuality === null` y `lowestEvidenceQuality === null`; en caso contrario, ambos corresponden al nivel máximo y mínimo presente según la jerarquía `TIER_1A_ACCREDITED_LAB > TIER_1B_TRACEABLE_LAB > TIER_1C_MANUFACTURER_TDS > TIER_1D_WORKSHOP_MEASURED > TIER_2_DOCUMENTED > TIER_3_ESTIMATED`.
4. **Coherencia de vínculo opcional M05:** Si `optionalM05Link.linked === false`, exigir `optionalM05Link.materialId === null` y `optionalM05Link.readOnlyFieldsUsed.length === 0`; si `linked === true`, exigir `materialId` no vacío.
5. **Rechazo de fabricación de fuentes:** Prohibir en validación de servicio el paso a `VERIFIED_RECORD` o `WORKSHOP_MEASURED_RECORD` si `documentRef` no apunta a un artefacto existente en almacén de bitácoras, TDS o informes adjuntos.

---

### 7.4 Ejemplos Coherentes para Todas las Categorías de Evidencia y Estados

#### Ejemplo 1: Perfil Inicial Sin Datos (`PENDING_SOURCE`, cero cifras físicas)

```json
{
  "schemaVersion": "2.4.0-draft",
  "profileId": "example-pending-v24-001",
  "cacheKey": "norm:silk_mikado|weave:unknown|gsm:unknown|v2.4",
  "createdAt": "2026-11-14T21:30:00Z",
  "identification": {
    "displayName": "Consulta inicial sin datos ni estimacion",
    "composition": {
      "value": null,
      "recommendedMethodRefs": ["ISO 1833", "AATCC TM20"],
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "staleMetadata": null
    },
    "weaveType": {
      "value": null,
      "recommendedMethodRefs": ["ISO 3572", "ASTM D3775"],
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "staleMetadata": null
    }
  },
  "overallSummary": {
    "highestEvidenceQuality": null,
    "lowestEvidenceQuality": null,
    "countsByEvidenceQuality": {
      "TIER_1A_ACCREDITED_LAB": 0,
      "TIER_1B_TRACEABLE_LAB": 0,
      "TIER_1C_MANUFACTURER_TDS": 0,
      "TIER_1D_WORKSHOP_MEASURED": 0,
      "TIER_2_DOCUMENTED": 0,
      "TIER_3_ESTIMATED": 0,
      "UNASSIGNED_PENDING": 9
    },
    "countsByDataStatus": {
      "PENDING_SOURCE": 9,
      "VERIFIED_RECORD": 0,
      "WORKSHOP_MEASURED_RECORD": 0,
      "ESTIMATED_RECORD": 0,
      "WORKSHOP_OVERRIDDEN": 0,
      "STALE_RECOMPUTE_REQUIRED": 0
    },
    "requiresPhysicalCalibration": true
  },
  "physicalProperties": {
    "arealDensity_gsm": {
      "unit": "g/m2",
      "recommendedMethodRefs": ["ISO 3801", "ASTM D3776"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Sin medicion ni estimacion todavia."
    },
    "thickness_mm": {
      "unit": "mm",
      "recommendedMethodRefs": ["ISO 5084", "ASTM D1777", "KES-FB3", "CSIRO FAST-1"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "bendingStiffness_warp_uNm": {
      "unit": "uN*m",
      "recommendedMethodRefs": ["ASTM D1388", "KES-FB2", "CSIRO FAST-2"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "bendingStiffness_weft_uNm": {
      "unit": "uN*m",
      "recommendedMethodRefs": ["ASTM D1388", "KES-FB2", "CSIRO FAST-2"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "stretchStiffness_lowStrain_warp_N_per_m": {
      "unit": "N/m",
      "recommendedMethodRefs": ["KES-FB1", "CSIRO FAST-3", "ASTM D3107", "ISO 20932-1"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "stretchStiffness_lowStrain_weft_N_per_m": {
      "unit": "N/m",
      "recommendedMethodRefs": ["KES-FB1", "CSIRO FAST-3", "ASTM D3107", "ISO 20932-1"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "elasticRecovery_percent": {
      "unit": "%",
      "recommendedMethodRefs": ["ISO 20932-1", "ASTM D3107", "ASTM D2594", "KES-FB1"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "shearStiffness_N_per_m_rad": {
      "unit": "N/(m*rad)",
      "recommendedMethodRefs": ["KES-FB1", "CSIRO FAST-3"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    },
    "frictionCoefficient_clothToCloth": {
      "unit": "dimensionless",
      "recommendedMethodRefs": ["KES-FB4"],
      "measuredValue": null,
      "range": null,
      "evidenceQuality": null,
      "dataStatus": "PENDING_SOURCE",
      "provenance": {
        "sourceType": null,
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": null,
        "recordedAt": null,
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Pendiente."
    }
  },
  "solverTranslationMetadata": {
    "targetSolverCandidate": "PENDING_BENCHMARK_SELECTION",
    "discreteFormulationStatus": "PENDING_OPERATOR_DERIVATION",
    "converterVersion": "0.1.0-spec",
    "notes": "Sin estimacion ni datos aun."
  },
  "optionalM05Link": {
    "linked": false,
    "materialId": null,
    "readOnlyFieldsUsed": []
  },
  "serviceProvenance": {
    "aiAssisted": false,
    "aiModelId": null,
    "aiPromptVersion": null,
    "timestamp": "2026-11-14T21:30:00Z"
  }
}
```

#### Ejemplo 2: Fixture Sintético de Cobertura Completa de Categorías de Evidencia y Estados (`TIER_1A`, `TIER_1B`, `TIER_1C`, `TIER_1D`, `TIER_2`, `TIER_3` + `WORKSHOP_OVERRIDDEN` + `STALE_RECOMPUTE_REQUIRED`)

> [!NOTE]
> **Advertencia Explícita sobre Datos Sintéticos de Validación:**  
> El JSON siguiente es exclusivamente un **fixture sintético de prueba del contrato Schema V2.4** para validar conjuntamente las 6 categorías de `evidenceQuality` (`1A`, `1B`, `1C`, `1D`, `2`, `3`) y todos los estados activos/caducados (`VERIFIED_RECORD`, `WORKSHOP_MEASURED_RECORD`, `ESTIMATED_RECORD`, `WORKSHOP_OVERRIDDEN`, `STALE_RECOMPUTE_REQUIRED`). Todos los identificadores `"SYNTHETIC_FIXTURE_..."` y el valor numérico neutro `0` son marcadores de prueba sintáctica, **no** mediciones reales ni acreditaciones existentes.

```json
{
  "schemaVersion": "2.4.0-draft",
  "profileId": "SYNTHETIC-FIXTURE-ALL-TIERS-V24",
  "cacheKey": "fixture:synthetic:all_tiers:v2.4",
  "createdAt": "2026-11-14T21:35:00Z",
  "identification": {
    "displayName": "SYNTHETIC_FIXTURE_COBERTURA_COMPLETA_ESQUEMA_V24",
    "composition": {
      "value": "SYNTHETIC_FIXTURE_FIBRA",
      "recommendedMethodRefs": ["ISO 1833"],
      "evidenceQuality": "TIER_1C_MANUFACTURER_TDS",
      "dataStatus": "VERIFIED_RECORD",
      "provenance": {
        "sourceType": "MANUFACTURER_TDS",
        "sourceName": "SYNTHETIC_FIXTURE_TDS_NAME",
        "documentRef": "SYNTHETIC_FIXTURE_TDS_DOC_REF",
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "fixture-validator",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "staleMetadata": null
    },
    "weaveType": {
      "value": "SYNTHETIC_FIXTURE_LIGAMENTO",
      "recommendedMethodRefs": ["ISO 3572"],
      "evidenceQuality": "TIER_3_ESTIMATED",
      "dataStatus": "ESTIMATED_RECORD",
      "provenance": {
        "sourceType": "AI_HEURISTIC",
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "SYNTHETIC_FIXTURE_MODEL",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "staleMetadata": null
    }
  },
  "overallSummary": {
    "highestEvidenceQuality": "TIER_1A_ACCREDITED_LAB",
    "lowestEvidenceQuality": "TIER_3_ESTIMATED",
    "countsByEvidenceQuality": {
      "TIER_1A_ACCREDITED_LAB": 1,
      "TIER_1B_TRACEABLE_LAB": 2,
      "TIER_1C_MANUFACTURER_TDS": 1,
      "TIER_1D_WORKSHOP_MEASURED": 1,
      "TIER_2_DOCUMENTED": 1,
      "TIER_3_ESTIMATED": 3,
      "UNASSIGNED_PENDING": 0
    },
    "countsByDataStatus": {
      "PENDING_SOURCE": 0,
      "VERIFIED_RECORD": 4,
      "WORKSHOP_MEASURED_RECORD": 1,
      "ESTIMATED_RECORD": 1,
      "WORKSHOP_OVERRIDDEN": 1,
      "STALE_RECOMPUTE_REQUIRED": 2
    },
    "requiresPhysicalCalibration": true
  },
  "physicalProperties": {
    "arealDensity_gsm": {
      "unit": "g/m2",
      "recommendedMethodRefs": ["ISO 3801", "ASTM D3776"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_1A_ACCREDITED_LAB",
      "dataStatus": "VERIFIED_RECORD",
      "provenance": {
        "sourceType": "ACCREDITED_LAB",
        "sourceName": "SYNTHETIC_FIXTURE_ACCREDITED_LAB",
        "documentRef": "SYNTHETIC_FIXTURE_LAB_REPORT_1A",
        "appliedStandardRef": "ISO 3801",
        "accreditationRef": "SYNTHETIC_FIXTURE_ISO_IEC_17025_ACCREDITATION",
        "conditioningProtocol": "ISO 139",
        "actorOrModelId": "fixture-lab-1a",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico TIER_1A_ACCREDITED_LAB; valor 0 neutro no representa dato fisico."
    },
    "thickness_mm": {
      "unit": "mm",
      "recommendedMethodRefs": ["ISO 5084", "ASTM D1777", "KES-FB3", "CSIRO FAST-1"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_1B_TRACEABLE_LAB",
      "dataStatus": "VERIFIED_RECORD",
      "provenance": {
        "sourceType": "TRACEABLE_LAB",
        "sourceName": "SYNTHETIC_FIXTURE_TRACEABLE_UNACCREDITED_LAB",
        "documentRef": "SYNTHETIC_FIXTURE_LAB_REPORT_1B",
        "appliedStandardRef": "ISO 5084",
        "accreditationRef": null,
        "conditioningProtocol": "ISO 139",
        "actorOrModelId": "fixture-lab-1b",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico TIER_1B_TRACEABLE_LAB (accreditationRef nulo); valor 0 neutro."
    },
    "bendingStiffness_warp_uNm": {
      "unit": "uN*m",
      "recommendedMethodRefs": ["ASTM D1388", "KES-FB2", "CSIRO FAST-2"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_1C_MANUFACTURER_TDS",
      "dataStatus": "VERIFIED_RECORD",
      "provenance": {
        "sourceType": "MANUFACTURER_TDS",
        "sourceName": "SYNTHETIC_FIXTURE_MILL_TDS",
        "documentRef": "SYNTHETIC_FIXTURE_TDS_REF_1C",
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "fixture-tds",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico TIER_1C_MANUFACTURER_TDS; valor 0 neutro."
    },
    "bendingStiffness_weft_uNm": {
      "unit": "uN*m",
      "recommendedMethodRefs": ["ASTM D1388", "KES-FB2", "CSIRO FAST-2"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_1D_WORKSHOP_MEASURED",
      "dataStatus": "WORKSHOP_MEASURED_RECORD",
      "provenance": {
        "sourceType": "WORKSHOP_MEASURED_PROTOCOL",
        "sourceName": "SYNTHETIC_FIXTURE_ATELIER_WORKSHOP_PROTOCOL",
        "documentRef": "SYNTHETIC_FIXTURE_WORKSHOP_LOG_3B",
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "fixture-atelier-operator",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": {
        "protocolVersion": "Gate3B-v1.0",
        "adaptedFromMethodRef": "Principio geometrico ASTM D1388 Opcion A (no certificado)",
        "specimenDimensions_mm": "25x200",
        "orientationsTested": ["WEFT", "FACE_UP", "FACE_DOWN"],
        "repetitionsCount": 5,
        "instrumentNameAndResolution": "SYNTHETIC_FIXTURE_CANTILEVER_RULER_MM",
        "ambientTemperature_C": null,
        "relativeHumidity_percent": null,
        "combinedUncertainty": 0,
        "uncertaintyUnit": "uN*m",
        "uncertaintyCalculationNote": "Propagacion simbolica Tipo A + Tipo B sin medicion real."
      },
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico TIER_1D_WORKSHOP_MEASURED; valor 0 neutro."
    },
    "stretchStiffness_lowStrain_warp_N_per_m": {
      "unit": "N/m",
      "recommendedMethodRefs": ["KES-FB1", "CSIRO FAST-3", "ASTM D3107", "ISO 20932-1"],
      "measuredValue": null,
      "range": { "min": 0, "typical": 0, "max": 0 },
      "evidenceQuality": "TIER_2_DOCUMENTED",
      "dataStatus": "VERIFIED_RECORD",
      "provenance": {
        "sourceType": "SCIENTIFIC_LITERATURE",
        "sourceName": "SYNTHETIC_FIXTURE_LITERATURE_SOURCE",
        "documentRef": "SYNTHETIC_FIXTURE_DOI_REF",
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "fixture-literature",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico TIER_2_DOCUMENTED; rango neutro 0."
    },
    "stretchStiffness_lowStrain_weft_N_per_m": {
      "unit": "N/m",
      "recommendedMethodRefs": ["KES-FB1", "CSIRO FAST-3", "ASTM D3107", "ISO 20932-1"],
      "measuredValue": null,
      "range": { "min": 0, "typical": 0, "max": 0 },
      "evidenceQuality": "TIER_3_ESTIMATED",
      "dataStatus": "ESTIMATED_RECORD",
      "provenance": {
        "sourceType": "AI_HEURISTIC",
        "sourceName": null,
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "SYNTHETIC_FIXTURE_MODEL",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico TIER_3_ESTIMATED + ESTIMATED_RECORD (measuredValue nulo)."
    },
    "elasticRecovery_percent": {
      "unit": "%",
      "recommendedMethodRefs": ["ISO 20932-1", "ASTM D3107", "ASTM D2594", "KES-FB1"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_3_ESTIMATED",
      "dataStatus": "WORKSHOP_OVERRIDDEN",
      "provenance": {
        "sourceType": "WORKSHOP_VISUAL_OBSERVATION",
        "sourceName": "SYNTHETIC_FIXTURE_VISUAL_WORKSHOP",
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "KatherineCarroll-Fixture",
        "recordedAt": "2026-11-14T21:35:00Z",
        "previousValueAudit": {
          "previousDataStatus": "ESTIMATED_RECORD",
          "previousEvidenceQuality": "TIER_3_ESTIMATED",
          "previousMeasuredValue": null,
          "previousRange": { "min": 0, "typical": 0, "max": 0 },
          "overrideReason": "SYNTHETIC_FIXTURE_AJUSTE_VISUAL_3A",
          "overriddenAt": "2026-11-14T21:35:00Z"
        }
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": null,
      "assumptionNote": "Fixture sintactico WORKSHOP_OVERRIDDEN con auditoria previa conservada."
    },
    "shearStiffness_N_per_m_rad": {
      "unit": "N/(m*rad)",
      "recommendedMethodRefs": ["KES-FB1", "CSIRO FAST-3"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_1B_TRACEABLE_LAB",
      "dataStatus": "STALE_RECOMPUTE_REQUIRED",
      "provenance": {
        "sourceType": "TRACEABLE_LAB",
        "sourceName": "SYNTHETIC_FIXTURE_TRACEABLE_LAB_PRESERVED",
        "documentRef": "SYNTHETIC_FIXTURE_LAB_REPORT_PRESERVED",
        "appliedStandardRef": "KES-FB1",
        "accreditationRef": null,
        "conditioningProtocol": "ISO 139",
        "actorOrModelId": "fixture-lab-1b",
        "recordedAt": "2026-11-14T21:00:00Z",
        "previousValueAudit": null
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": {
        "staleReason": "CONVERTER_VERSION_CHANGED",
        "markedStaleAt": "2026-11-14T21:35:00Z",
        "priorDataStatus": "VERIFIED_RECORD",
        "priorEvidenceQuality": "TIER_1B_TRACEABLE_LAB",
        "priorConverterVersion": "0.0.9-spec"
      },
      "assumptionNote": "Fixture STALE_RECOMPUTE_REQUIRED sobre TIER_1B conservando procedencia original."
    },
    "frictionCoefficient_clothToCloth": {
      "unit": "dimensionless",
      "recommendedMethodRefs": ["KES-FB4"],
      "measuredValue": 0,
      "range": null,
      "evidenceQuality": "TIER_3_ESTIMATED",
      "dataStatus": "STALE_RECOMPUTE_REQUIRED",
      "provenance": {
        "sourceType": "WORKSHOP_VISUAL_OBSERVATION",
        "sourceName": "SYNTHETIC_FIXTURE_VISUAL_WORKSHOP_PRESERVED",
        "documentRef": null,
        "appliedStandardRef": null,
        "accreditationRef": null,
        "conditioningProtocol": null,
        "actorOrModelId": "KatherineCarroll-Fixture",
        "recordedAt": "2026-11-14T21:00:00Z",
        "previousValueAudit": {
          "previousDataStatus": "PENDING_SOURCE",
          "previousEvidenceQuality": null,
          "previousMeasuredValue": null,
          "previousRange": null,
          "overrideReason": "SYNTHETIC_FIXTURE_OVERRIDE_PRESERVED",
          "overriddenAt": "2026-11-14T21:00:00Z"
        }
      },
      "workshopProtocolMetadata": null,
      "staleMetadata": {
        "staleReason": "CACHE_TTL_EXPIRED",
        "markedStaleAt": "2026-11-14T21:35:00Z",
        "priorDataStatus": "WORKSHOP_OVERRIDDEN",
        "priorEvidenceQuality": "TIER_3_ESTIMATED",
        "priorConverterVersion": "0.1.0-spec"
      },
      "assumptionNote": "Fixture STALE_RECOMPUTE_REQUIRED sobre WORKSHOP_OVERRIDDEN preservando auditoria."
    }
  },
  "solverTranslationMetadata": {
    "targetSolverCandidate": "PENDING_BENCHMARK_SELECTION",
    "discreteFormulationStatus": "PENDING_OPERATOR_DERIVATION",
    "converterVersion": "0.1.0-spec",
    "notes": "Fixture multi-categoria validado contra Schema V2.4."
  },
  "optionalM05Link": {
    "linked": false,
    "materialId": null,
    "readOnlyFieldsUsed": []
  },
  "serviceProvenance": {
    "aiAssisted": true,
    "aiModelId": "SYNTHETIC_FIXTURE_MODEL",
    "aiPromptVersion": "SYNTHETIC_FIXTURE_PROMPT",
    "timestamp": "2026-11-14T21:35:00Z"
  }
}
```

---

## 8. Estrategia de Caché, Niveles de Validación y Protocolo Reproducible Gate 3B

### 8.1 Caché Canónico Versionado
1. **Clave Canónica Normalizada (`CanonicalCacheKey`):** Tokenización ordenada de texto + hash de imagen si aplica.
2. **Versionado Triple `(schemaVersion, converterVersion, aiModelId)`:** Al cambiar la versión de conversión o caducar el TTL, las propiedades afectadas transicionan a `dataStatus = STALE_RECOMPUTE_REQUIRED` poblando `staleMetadata` y preservando intactas `evidenceQuality`, `provenance` y mediciones originales.
3. **Política de TTL según `evidenceQuality` y `dataStatus`:**
   - `TIER_1A_ACCREDITED_LAB` y `TIER_1B_TRACEABLE_LAB`: Inmutables por certificado/informe.
   - `TIER_1C_MANUFACTURER_TDS`: Vigente por revisión de TDS.
   - `TIER_1D_WORKSHOP_MEASURED`: Vigente mientras corresponda al mismo rollo/lote medido del taller y versión de convertidor vigente.
   - `TIER_2_DOCUMENTED` y `TIER_3_ESTIMATED` (`ESTIMATED_RECORD`): Sujetos a TTL configurable en Etapa 4.
   - `WORKSHOP_OVERRIDDEN`: Nunca sobrescrito automáticamente desde caché.

### 8.2 Separación entre Comparación Visual (3A), Medición Física de Taller (3B) y Ensayo Instrumental (3C)

| Modalidad en Etapa 3 | Naturaleza y Requisitos | Clasificación Resultante en Schema V2.4 | Límite Explícito |
| :--- | :--- | :--- | :--- |
| **Nivel 3A: Comparación Visual en Taller** | Evaluación cualitativa lado a lado entre caída física del retazo y render 3D junto a Katherine Carroll. | `TIER_3_ESTIMATED` · `WORKSHOP_OVERRIDDEN` · `sourceType = WORKSHOP_VISUAL_OBSERVATION` | No genera mediciones SI ni sustituye pruebas reproducibles ni laboratorio. |
| **Nivel 3B: Medición Física Reproducible en Taller** | Protocolo cuantitativo repetible de taller especificado en §8.3 con bitácora, dimensiones, orientaciones, repeticiones e incertidumbre. | **`TIER_1D_WORKSHOP_MEASURED`** · **`WORKSHOP_MEASURED_RECORD`** · **`sourceType = WORKSHOP_MEASURED_PROTOCOL`** | Al no contar con cámara `ISO 139` ni acreditación `ISO/IEC 17025`, `appliedStandardRef = null` (no equivale a `TIER_1A`/`TIER_1B`). |
| **Nivel 3C: Ensayo Instrumental de Laboratorio (Opcional)** | Ensayos en laboratorio externo acreditado o trazable (`KES-FB1..4`, `CSIRO FAST-1..4`, `ISO 3801`, `ASTM D1388`, `ISO 9073-9`, `ISO 20932-1`) bajo `ISO 139`. | `TIER_1A_ACCREDITED_LAB` o `TIER_1B_TRACEABLE_LAB` · `VERIFIED_RECORD` | Única vía habilitada para declarar `appliedStandardRef` no nulo e incertidumbre acreditada. |

---

### 8.3 Protocolo Reproducible Detallado para Gate 3B (Medición Física de Taller)

Este protocolo rige las mediciones físicas repetibles en taller sobre muestrario testigo sin pretender sustituir un ensayo de laboratorio acreditado:

#### 1. Preparación, Dimensiones de Muestras y Orientación
- **Masa superficial (adaptado del principio geométrico de `ISO 3801` Método 5 / `ASTM D3776` Opción C):**
  - **Dimensiones:** Probetas cuadradas o circulares de **$100\ \text{mm} \times 100\ \text{mm}$ ($100\ \text{cm}^2$)** usando plantilla rígida metálica (cuando el tamaño del retazo no permita $100\ \text{cm}^2$, registrar el área mínima efectiva nunca inferior a $13\ \text{cm}^2$ conforme a la referencia mínima de `ASTM D3776` Opción C, midiendo largo y ancho reales de cada probeta).
  - **Repeticiones y distribución:** Mínimo **$n = 5$ probetas** tomadas de zonas distintas evitando orillos y zonas arrugadas (si el retazo limita $n < 5$, documentar $n$ real e incrementar la incertidumbre declarada).
- **Rigidez flexural aparente (adaptado del principio geométrico Cantilever de `ASTM D1388` Opción A):**
  - **Dimensiones:** Tiras rectangulares de **$25\ \text{mm} \times 200\ \text{mm}$**; únicamente en tejidos con fuerte enrollamiento de borde ampliar ancho hasta **$75\ \text{mm}$**, registrando el ancho exacto.
  - **Orientación obligatoria:** Cortar y medir juegos independientes en **urdimbre (*warp*)** y **trama (*weft*)** (y opcionalmente diagonal al bies $45^\circ$ solo como registro auxiliar comparativo). En telas con caras asimétricas (satén, crepé marcado, recubiertos), medir cada tira tanto **cara arriba (*face-up*)** como **envés arriba (*face-down*)** y ambos extremos de la tira.
  - **Repeticiones:** Mínimo **$n = 5$ probetas en urdimbre y $n = 5$ en trama** por tejido (salvo restricción física documentada del retazo).
- **Espesor opcional (si se dispone de instrumento de espesor):** Al menos $n = 5$ puntos distintos alejados del borde, registrando diámetro de palpador y método mecánico.

#### 2. Instrumentos Requeridos y Registro de Resolución
1. **Balanza digital calibrada de taller:** Registrar modelo, fecha de verificación/calibración con pesa patrón y legibilidad $d$ (se recomienda sensibilidad acorde al tamaño de probeta, idealmente $0.001\ \text{g}$ para `ISO 3801` Método 5 o $\le 0.01\ \text{g}$ documentando el impacto en $u_B$).
2. **Dispositivo Cantilever de sobremesa con plano inclinado a $41.5^\circ$ ($0.724\ \text{rad}$):** Superficie plana horizontal de baja fricción y regla milimetrada fija (resolución $\pm 0.5\ \text{mm}$), midiendo la longitud en voladizo $L$ al contacto de la punta con el plano inclinado ($c = L / 2$).
3. **Plantilla metálica de corte y calibre/regla metálica** (resolución $\pm 0.5\ \text{mm}$) para verificar dimensiones reales post-corte.
4. **Termohigrómetro digital de taller** para registro ambiental.

#### 3. Condiciones Ambientales en Bitácora (Sin Cámara `ISO 139`)
- Antes de medir, reposar los retazos extendidos sin tensión sobre superficie plana en el taller durante un tiempo documentado (p. ej. estabilización previa en el ambiente del taller).
- Registrar obligatoriamente al **inicio y al cierre** de cada sesión: temperatura ambiente ($T$ en $^\circ\text{C}$), humedad relativa ($\text{HR}$ en $\%$) y eventuales corrientes de aire o manipulación con vapor/planchado previo. Se declara expresamente la ausencia de atmósfera normalizada `ISO 139`.

#### 4. Cómputo de Propiedades y Propagación de Incertidumbre (Sin Inventar Valores)
- Masa superficial observada: $\bar{\rho}_{\text{gsm}} = \frac{1}{n} \sum_{i=1}^{n} \frac{m_i\ [\text{g}]}{A_i\ [\text{m}^2]}$.
- Rigidez flexural aparente por dirección: $c = \bar{L} / 2\ [\text{cm}]$, $G_{\text{aparente}} = 0.1 \cdot \bar{\rho}_{\text{gsm}} \cdot c^3\ [\text{mg}\cdot\text{cm}]$, $B_{\mu\text{Nm}} = G_{\text{aparente}} \times 0.0980665$.
- **Incertidumbre combinada ($u_c$) obligatoria en `workshopProtocolMetadata`:**
  - Componente Tipo A (dispersión experimental): $u_A(x) = \frac{s_x}{\sqrt{n}}$.
  - Componente Tipo B (resolución instrumental + tolerancia dimensional de corte): $u_B(\rho) = \bar{\rho} \sqrt{\left(\frac{u_m}{\bar{m}}\right)^2 + \left(\frac{u_A}{\bar{A}}\right)^2}$ y propagación de derivadas parciales para $B_{\mu\text{Nm}}(\rho, c)$:
    $$u_c(B) = B \sqrt{\left(\frac{u_c(\rho)}{\bar{\rho}}\right)^2 + \left(3\,\frac{u_c(c)}{\bar{c}}\right)^2}$$
  - Registrar $u_c$ (o cobertura $U = 2\,u_c$) en `combinedUncertainty` y `uncertaintyCalculationNote`. *(Ninguna tolerancia numérica a priori se inventa antes de contar con instrumentos reales asignados en el taller).*

#### 5. Criterios Objetivos de Aceptación (Pass / No-Go de Gate 3B)
1. **Completitud documental:** El 100% de las muestras del muestrario piloto cuenta con bitácora completa (`workshopProtocolMetadata` validado contra Schema V2.4, dimensiones reales, $T$, $\text{HR}$, orientaciones urdimbre/trama y derecho/revés cuando aplique, $n$ e incertidumbre $u_c$).
2. **Validez de repetibilidad operativa:** Ausencia de muestras dañadas/enrolladas sin compensar; si la dispersión empírica evidencia defecto de corte o corriente de aire durante una tirada, dicha lectura se repite y documenta antes de aprobar el registro.
3. **Consistencia de ordenamiento mecánico:** La jerarquía ordinal medida en taller (fluida < intermedia < rígida en $B_{\mu\text{Nm}}$ y $\bar{\rho}_{\text{gsm}}$) coincide monotónicamente con la respuesta simulada calibrada para el motor evaluado, sin inversión de rangos entre arquetipos.
4. **Fidelidad de clasificación:** Ningún registro de Gate 3B figura como `TIER_1A_ACCREDITED_LAB`, `TIER_1B_TRACEABLE_LAB` ni con `appliedStandardRef` no nulo.

---

## 9. Integración Opcional y de Solo Lectura con M05 (`src/types/commercial.ts`)

Verificado directamente sobre [`src/types/commercial.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/types/commercial.ts#L223-L254) (`MaterialItem`) y [`src/components/commercial/materialLabels.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/materialLabels.ts#L49-L67):

| Campo Real en `MaterialItem` (M05) | Tipo Actual en M05 | Uso Opcional en Textile Intelligence Service | Procedencia (`sourceType`) y Calidad Máxima (`evidenceQuality`) |
| :--- | :--- | :--- | :--- |
| `name`, `category` | `string` / `MaterialCategory` | Semilla de búsqueda y distinción tela/forro/entretela. | `M05_READONLY_HINT` · Informativo |
| `composition`, `weight_gsm`, `drape_profile` | `string \| null`, `number \| null`, `MaterialDrapeProfile \| null` | Pistas iniciales no certificadas de composición, masa y comportamiento cualitativo. | `M05_READONLY_HINT` · `TIER_3_ESTIMATED` (`appliedStandardRef: null`, salvo enlace verificable a TDS `TIER_1C` o informe externo `TIER_1A/1B`) |
| `supplier_name`, `supplier_ref`, `sku_code` | `string \| null` | Pistas comerciales para localizar TDS verificable (`TIER_1C_MANUFACTURER_TDS`). | `M05_READONLY_HINT` · Pista de búsqueda |
| `width_cm`, `photo_url`, `tags`, `notes` | varios | Contexto auxiliar y PBR visual. | `M05_READONLY_HINT` · Visual / `TIER_3_ESTIMATED` |

---

## 10. Maniquí de Simulación: Brechas del Prototipo Actual y Alternativas Sujetas a Benchmark

Según [`src/components/mannequin3d/mannequinMeshBuilder.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/mannequinMeshBuilder.ts#L80-L243), el prototipo actual posee **720 triángulos** totales en el torso (11 capas × 36 segmentos), sin extremidades, sin *landmarks* 3D, sin estructura de colisión y solo silueta femenina adulta. En Etapa 1 / Gate 2 permanecen abiertas y sujetas a benchmark tres alternativas (**no** se selecciona ninguna definitivamente en este documento):
- **Alternativa A:** Malla paramétrica refinada (densidad determinada por convergencia en benchmark) + BVH / Spatial Hash.
- **Alternativa B:** Jerarquía analítica de cápsulas / elipsoides sincronizada + malla visual separada.
- **Alternativa C:** Campo de distancia con signo (SDF) en grilla 3D o esquema híbrido SDF + cápsulas.

---

## 11. Conexión Futura con M02 CAD (Sin Alterar Flujo B)

Operará mediante un **adaptador unidireccional de solo lectura (*Export Bridge*)** sobre piezas 2D ya generadas en M02 (contornos cerrados en milímetros, costuras pareadas y vector de hilo *grainline*), resolviendo el remallado interno en Etapa 2 sin modificar Flujo B.

---

## 12. Decisiones Conceptuales, Asuntos Pendientes y Riesgos

1. **Decisiones base conservadas:** Servicio textil desacoplado de M05; M05 opcional/solo lectura; separación estricta `provenance` / `evidenceQuality` (`TIER_1A`, `1B`, `1C`, `1D`, `2`, `3`) / `dataStatus` (incluido `WORKSHOP_MEASURED_RECORD` y `STALE_RECOMPUTE_REQUIRED`); foto no mide física; M02 y Flujo B inviolables.
2. **Asuntos pendientes:** Aprobación formal de Etapa 0 (V2.4); benchmark de motores físicos (sin seleccionar XPBD aún); derivación matemática formal XPBD e invarianza por remallado; benchmark de Alternativas A/B/C de maniquí; remallador CAD; ejecución diferenciada de Etapa 3A/3B/3C.

---

## 13. Plan de Validación por Etapas (Puertas Go / No-Go)

```mermaid
flowchart LR
    E0["Etapa 0 (ACTUAL)
    Estudio V2.4: En revisión /
    pendiente de aprobación"] -->|"Gate 0: Aprobación
    formal del estudio V2.4"| E1["Etapa 1: Benchmark Motor + Colisión
    PoC aislada Web + Móvil
    Derivación discreta e invarianza"]
    E1 -->|"Gate 1: FPS, estabilidad,
    invarianza de malla y proxy colisión"| E2["Etapa 2: Remallador CAD & Maniquí
    Export Bridge M02 + Landmarks
    (sin tocar Flujo B)"]
    E2 -->|"Gate 2: Cero impacto CAD,
    costura coherente sin penetración"| E3["Etapa 3: Validación Textil Diferenciada
    3A Visual Taller + 3B Protocolo Físico
    Reproducible + 3C Instrumental Opcional"]
    E3 -->|"Gate 3: Aprobación 3A + 3B
    (y contraste 3C si aplica)"| E4["Etapa 4: Textile Intelligence Service
    Pipeline IA + caché + JSON Schema V2.4
    + validador runtime + puente M05"]
```

- **Gate 0:** Aprobación formal de V2.4 antes de iniciar prototipos o código.
- **Gate 1:** Medición empírica Web + móvil; estabilidad sin elongación excesiva; derivación matemática formal verificada bajo remallado; benchmark comparativo de Alternativas A/B/C del maniquí.
- **Gate 2:** Maniquí elegido con *landmarks* 3D y costura virtual estable de patrones base sin tocar M02 ni Flujo B.
- **Gate 3 (Diferenciado):**
  - **3A (Visual):** Aprobación presencial de Katherine Carroll frente a muestras físicas.
  - **3B (Medición Física Reproducible en Taller):** Cumplimiento íntegro del protocolo §8.3 (`TIER_1D_WORKSHOP_MEASURED` / `WORKSHOP_MEASURED_RECORD`) con bitácora completa, $u_c$ calculada y consistencia de ordenamiento mecánico.
  - **3C (Instrumental Opcional):** Contraste cuantitativo con ensayos `TIER_1A` / `TIER_1B` si se envían testigos a laboratorio.
- **Gate 4:** Auditoría comprobando validación positiva/negativa completa contra JSON Schema V2.4 + validador runtime (§7.3) e independencia total de M05.

---

## 14. Referencias Técnicas Verificables

1. **ISO/IEC 17025:2017:** *General requirements for the competence of testing and calibration laboratories.* https://www.iso.org/
2. **ISO 139:** *Textiles — Standard atmospheres for conditioning and testing.* https://www.iso.org/
3. **ISO 1833 (serie)**, **ISO 3572**, **ASTM D3775**, **ISO 3801** (incl. Método 5 $100\ \text{cm}^2$, $0.001\ \text{g}$), **ASTM D3776 / D3776M** (incl. Opción C $\ge 13\ \text{cm}^2$, $\pm 0.1\%$), **ISO 5084**, **ASTM D1777**, **ASTM D1388** (incl. Opción A $25 \times 200\ \text{mm}$, $41.5^\circ$), **ISO 9073-7**, **ISO 9073-9**, **BS 5058**, **ISO 13934-1/-2**, **ASTM D5034/D5035**, **ASTM D3107**, **ASTM D2594/D2594M**, **ISO 20932-1**, **ASTM D1894** / **ISO 8295** (solo recubiertos/láminas): https://www.iso.org/ · https://www.astm.org/ · https://www.bsigroup.com/
4. **Kato Tech Co., Ltd. (`KES-FB1`..`KES-FB4`):** https://www.keskato.co.jp/en/
5. **CSIRO FAST (`FAST-1`..`FAST-4`):** CSIRO (Australia).
6. **JSON Schema Draft 2020-12:** https://json-schema.org/draft/2020-12/schema
7. **Macklin et al. (2016) XPBD:** ACM DOI [`10.1145/2994258.2994272`](https://dl.acm.org/doi/10.1145/2994258.2994272) · **Müller et al. (2007) PBD:** DOI [`10.1016/j.jvcir.2007.01.005`](https://doi.org/10.1016/j.jvcir.2007.01.005)
8. **Referencias internas del proyecto:** [`src/types/commercial.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/types/commercial.ts#L101-L254), [`src/components/commercial/materialLabels.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/commercial/materialLabels.ts#L17-L68), [`src/components/mannequin3d/mannequinMeshBuilder.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/mannequinMeshBuilder.ts#L80-L243), [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.3.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.3.md).

---

## 15. Confirmación de No Alteración

Se confirma expresamente que durante la elaboración de esta versión **V2.4**:
- ✅ **NO** se modificó código fuente (`src/`, `app/`), `package.json`, configuraciones, SQL, migraciones ni módulos M00–M07.
- ✅ **NO** se modificaron los documentos previos `V1`, `V2`, `V2.1`, `V2.2` ni `V2.3`.
- ✅ Se creó únicamente `ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.4.md`.

