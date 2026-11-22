# Benchmark Comparativo Controlado: OpenAI (gpt-image-2.6-sunburst) vs. Google Gemini (gemini-3-pro-image)

**Fecha de ejecución:** 2026-11-16T19:30:16.490Z  
**Estado global:** `PARTIAL_BLOCKED_BY_PROVIDER_QUOTA` — Al menos una fase fue bloqueada por cuota/facturación del proveedor (HTTP 429). **No se simularon ni inventaron imágenes, latencias ni costos.**  
**Caso de prueba idéntico:** `SYNTH_COUTURE_HOURGLASS_01__VESTIDO_GALA_KC_01` (maniquí sintético `SYNTH_COUTURE_HOURGLASS_01`: `168 cm / 96-68-102 cm / espalda 38 cm`, Mikado `280 gsm #124E3F`, encaje Chantilly `#C5A880`).  
**Condiciones de salida:** Tamaño `1024x1536`, calidad `high`, fondo `#FAF7F2`.

---

## 1. Investigación Técnica Documentada (Separada de Generación Visual)

| Métrica de Investigación | OpenAI | Google Gemini |
|---|---|---|
| **Estado real** | ERROR HTTP 429 | OK · 0 citas (sin googleSearch por HTTP 429) |
| **Modelo y endpoint** | `gpt-4.1` (`POST /v1/responses (web_search_preview)`) | `gemini-3.1-flash-lite` (`POST /v1beta/models/gemini-3.1-flash-lite:generateContent (sin googleSearch por cuota 429)`) |
| **Tiempo de respuesta** | 1611 ms | 10328 ms |
| **Fuentes web verificadas** | 0 citas | 0 citas |
| **Consumo bruto (in / out / total tokens)** | 0 / 0 / 0 | 307 / 1265 / 1572 |
| **Costo registrado** | N/D (tarifa no configurada) | N/D (tarifa no configurada) |

- Informe OpenAI: [results/openai_research.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/results/openai_research.md)
- Informe Gemini: [results/gemini_research.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/results/gemini_research.md)

### Extracto real obtenido de Gemini (`gemini-3.1-flash-lite`)
> googleSearch bloqueado por cuota (HTTP 429); ejecutado con conocimiento interno del modelo sin inventar citas web

**INFORME TÉCNICO DE TALLER: DESARROLLO DE VESTIDO SIRENA (GALA/ALTA COSTURA)**

**Fecha:** 24 de mayo de 2024
**Asunto:** Especificaciones técnicas para construcción sobre medidas (96-68-102 cm) en tejido Mikado de seda.

---

### 1. Comportamiento mecánico: Mikado de seda 280 gsm
El Mikado de seda (280 gsm) es un tejido de ligamento sarga con alta densidad de trama, lo que le confiere una estructura rígida y gran capacidad de mantener volumen.

*   **Hechos verificados:** Dada su rigidez, el Mikado de 280 gsm no es un tejido que "caiga" por gravedad, sino que "construye" formas. En cortes princesa, la curvatura del panel lateral debe ser precisa; si no se compensa la tensión, el tejido tiende a crear "picos" en las costuras si la curvatur...

---

## 2. Generación Visual Inicial (`v1`) y Modificación Conversacional (`v2`)

| Etapa / Métrica | OpenAI (`gpt-image-2.6-sunburst`) | Google Gemini (`gemini-3-pro-image`) |
|---|---|---|
| **`v1` Estado / Archivo** | **ERROR** (HTTP 429): OpenAI Image Edit HTTP 429: You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/. | **ERROR** (HTTP 429): Gemini Image HTTP 429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.google.com/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro-image, description: Generate content input tokens per minute limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image, description: Generate content requests per minute limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image, description: Generate content requests per day limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.
Please retry in 12h26m34.969773039s. |
| **`v1` Tiempo respuesta** | 2311 ms | 2604 ms |
| **`v1` Auditoría geométrica 96-68-102** | No auditado (OpenAI Image Edit HTTP 429: You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/.) | No auditado (Gemini Image HTTP 429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.google.com/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro-image, description: Generate content input tokens per minute limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image, description: Generate content requests per minute limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image, description: Generate content requests per day limit exceeded on Free Tier. See https://aistudio.google.com/docs/rate-limits.
Please retry in 12h26m34.969773039s.) |
| **`v1` Consumo / Costo** | 0 tokens · N/D (tarifa no configurada) | 0 tokens · N/D (tarifa no configurada) |
| **`v2` Estado / Archivo** | **SKIPPED** (HTTP N/A): Omitido porque v1 falló (HTTP 429) | **SKIPPED** (HTTP N/A): Omitido porque v1 falló (HTTP 429) |
| **`v2` Tiempo respuesta** | 0 ms | 0 ms |
| **`v2` Auditoría geométrica 96-68-102** | No auditado (Omitido porque v1 falló (HTTP 429)) | No auditado (Omitido porque v1 falló (HTTP 429)) |
| **`v2` Consumo / Costo** | 0 tokens · N/D (tarifa no configurada) | 0 tokens · N/D (tarifa no configurada) |

---

## 3. Matriz Evaluativa de los 6 Criterios + Revisión Visual Obligatoria

| Criterio | OpenAI | Gemini | Cómo verificar |
|---|---|---|---|
| **1. Fidelidad corporal** | No evaluable (bloqueado HTTP 429) | No evaluable (bloqueado HTTP 429) | Activar overlay Jaula SVG 1:1 en `viewer/comparison_viewer.html` |
| **2. Fidelidad del diseño** | Sin imagen (ERROR) | Sin imagen (ERROR) | Comparar `v1` y `v2` lado a lado |
| **3. Representación textil** | Sin imagen (ERROR) | Sin imagen (ERROR) | Revisar pliegues y contraste tul ilusión |
| **4. Realismo fotográfico** | Sin imagen (ERROR) | Sin imagen (ERROR) | Zoom sobre costuras y caída inferior |
| **5. Capacidad de edición (`v1->v2`)** | No ejecutado (SKIPPED) | No ejecutado (SKIPPED) | Comparar silueta `v1` vs `v2` |
| **6. Tiempo y costo real** | Total registrado: 3922 ms · N/D (tarifa no configurada) | Total registrado: 12932 ms · N/D (tarifa no configurada) | Datos exactos en `results/comparison_summary.json` |

---

## 4. Trazabilidad de Disponibilidad y Cuotas Registradas

- **OpenAI Fase 1 (Investigación)** (`ERROR`): `gpt-4.1`: HTTP 429 (You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/.)
- **OpenAI Fase 2 (Imagen v1)** (`ERROR`): `gpt-image-2.6-sunburst`: HTTP 429 (You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/.)
- **OpenAI Fase 3 (Edición v2)** (`SKIPPED`): Omitido porque v1 falló (HTTP 429)
- **Gemini Fase 1 (Investigación)** (`OK`): `gemini-3.5-flash` [search=true]: HTTP 429 (You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.g); `gemini-3.5-flash` [search=false]: HTTP 200 (Respuesta vacía del modelo); `gemini-3.1-flash-lite` [search=false]: HTTP 200
- **Gemini Fase 2 (Imagen v1)** (`ERROR`): `gemini-3-pro-image`: HTTP 429 (You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.g); `gemini-3-pro-image-preview`: HTTP 429 (You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.g); `gemini-3.1-flash-image`: HTTP 429 (You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.g); `gemini-2.5-flash-image`: HTTP 429 (You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://aistudio.g)
- **Gemini Fase 3 (Edición v2)** (`SKIPPED`): Omitido porque v1 falló (HTTP 429)
