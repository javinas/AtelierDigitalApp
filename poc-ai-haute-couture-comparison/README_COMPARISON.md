# PoC Comparativa Controlada: **OpenAI GPT Image 2.6 Sunburst vs. Google Gemini 3 Pro Image**

Espacio completamente aislado dentro de `poc-ai-haute-couture-comparison/` para comparar con idénticas condiciones ambos proveedores antes de construir el módulo definitivo **AI Haute Couture Simulator**.

---

## 1. Reglas de Aislamiento e Integridad Verificadas
- **Cero modificaciones fuera de este directorio:** Intactos producción, M00–M07, Flujo B de M02, `package.json`, migraciones SQL, [`src/components/mannequin3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/Mannequin3DViewer.tsx) y [`poc-simulador-3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/T5_2_CORRECTIVE_BENCHMARK.md).
- **Cero PII / datos reales de clientas:** El caso canónico [`inputs/canonical_test_case.json`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/inputs/canonical_test_case.json) emplea exclusivamente el maniquí sintético `SYNTH_COUTURE_HOURGLASS_01` (`168 cm / 96-68-102 cm / espalda 38 cm`).
- **Cero resultados o precios inventados:** Si falta `OPENAI_API_KEY` o `GEMINI_API_KEY`, el runner registra `WAITING_FOR_API_KEYS` y se detiene limpiamente. Los costos en USD solo se calculan si configuras las tarifas verificadas en `.env`; en caso contrario se reportan los tokens/imágenes brutos devueltos por cada API.

---

## 2. Cómo Configurar y Ejecutar la Prueba Real

1. Copia la plantilla [`.env.example`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/.env.example) a `poc-ai-haute-couture-comparison/.env` (excluido de Git por [`.gitignore`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/.gitignore)):
   ```dotenv
   OPENAI_API_KEY=sk-...
   GEMINI_API_KEY=AIza...
   ```
   *(Opcional: completa las variables `OPENAI_*_USD*` y `GEMINI_*_USD*` desde tus paneles oficiales de facturación para obtener el cálculo USD automático).*
2. Ejecuta la comparativa desde PowerShell:
   ```powershell
   node poc-ai-haute-couture-comparison/run_comparison.cjs
   ```
3. Abre el reporte generado:
   - Resumen cuantitativo y citas: `poc-ai-haute-couture-comparison/BENCHMARK_COMPARATIVO_OPENAI_VS_GEMINI.md`
   - Visor visual comparativo lado a lado con Jaula Antropométrica SVG 1:1 (`1024×1536`): levanta un servidor estático local dentro de `poc-ai-haute-couture-comparison/` y abre `/viewer/comparison_viewer.html`.

---

## 3. Verificación Dinámica de Modelos e Igualdad de Condiciones
- Al arrancar con credenciales válidas, `run_comparison.cjs` consulta primero `GET /v1/models` (OpenAI) y `GET /v1beta/models` (Google Gemini) para comprobar qué identificadores están activos en cada cuenta:
  - OpenAI imagen: `gpt-image-2.6-sunburst` (con fallback controlado `gpt-image-2.5-sunburst`, `gpt-image-2.5`, `gpt-image-1` solo si el primero no existe en la cuenta, documentando cuál se ejecutó realmente).
  - Gemini imagen: `gemini-3-pro-image` (con fallback `gemini-3-pro-image-preview`, `gemini-2.5-flash-image`).
- Condiciones fijadas para paridad estricta:
  - Tamaño/proporción: `1024x1536` (`2:3`), calidad `high`.
  - Mismas imágenes de referencia: `inputs/reference_mannequin_1024x1536.png` + `inputs/reference_fabric_swatch_512x512.png`.
  - Separación estricta de fases: Fase 1 (Investigación + citas web) -> Fase 2 (Render `v1`) -> Fase 3 (Edición conversacional `v2` con cambio a escote barco asimétrico, mangas 3/4 de tul ilusión bordado y tono `#1B3B4B`).
