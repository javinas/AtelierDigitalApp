# T0 — CIERRE FORMAL DE GATE 0 Y CONGELAMIENTO DE LÍNEA BASE (PoC ETAPA 1)
**Proyecto:** Atelier Digital App — By Katherine Carroll  
**Fecha de registro:** 2026-11-14  
**Directorio aislado PoC:** [`poc-simulador-3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/)  
**Estado:** **T0 COMPLETADO — Línea Base Congelada (Gate 0 cerrado para ejecución exclusiva de PoC aislada)**

---

## 1. Documentos y Artefactos Congelados (Línea Base Inmutable)

Se congelan sin modificación los siguientes artefactos normativos y de referencia visual como línea base de Etapa 1:

| Artefacto Congelado | Rol en la PoC | Tamaño (bytes) | SHA-256 Verificado |
| :--- | :--- | :---: | :--- |
| [`ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/ESTUDIO_VIABILIDAD_SIMULADOR_PRENDAS_3D_V2.6.md) | Estudio maestro cerrado de Etapa 0 (`schemaVersion: 2.6.0-draft`; **no existe V2.7**) | `123395` | `d05b278af37cbd6d3cbbe72e8594b7eee7c67b5c93f7aa54c6b4541879a89e85` |
| [`PLAN_POC_SIMULADOR_3D.md`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/PLAN_POC_SIMULADOR_3D.md) | Plan ejecutable de Etapa 1 (`T0`–`T6`) y métricas PASS/FAIL de Gate 1 | `20133` | `199cd3b640db202494071f0735cb4387af957728066568a6891cdbc5d6f9f870` |
| [`src/components/mannequin3d/types.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/types.ts) | Cotas anatómicas de referencia (`DEFAULT_FEMALE_MEASUREMENTS`, presets de cámara y silueta; **solo lectura**) | `5071` | `fab312c9dfb23737ca22c824f7d49fa88a8ece6fb47a681357082968f3edf42a` |
| [`src/components/mannequin3d/mannequinMeshBuilder.ts`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/mannequinMeshBuilder.ts) | Referencia geométrica del torso actual de 720 triángulos (**intacto, solo lectura**) | `14249` | `37c21a78b42f2d7d966edd682c8df244a9f85ec11309f5a9226d73ec8d406f92` |
| [`src/components/mannequin3d/Mannequin3DViewer.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/Mannequin3DViewer.tsx) | Referencia visual WebGL (`three ^0.170.0`, **intacto, solo lectura**) | `17190` | `31048004e777e03f2d25db9311fe663efe11fed6b3a659da132b8ea838936146` |
| [`src/components/mannequin3d/Mannequin3DStudioSandbox.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/src/components/mannequin3d/Mannequin3DStudioSandbox.tsx) | Prototipo UI sandbox previo (**intacto, solo lectura**) | `17648` | `b71721d520babc2d645954a8f9bc7ea34cf19b0d64d3bee8baba79c9ed6c4009` |
| [`app/mannequin-preview.tsx`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/app/mannequin-preview.tsx) | Ruta temporal de evaluación visual (**intacta, solo lectura**) | `1312` | `55a0a11f3c82d0b524e9bbef1e63eff72d974f1220659f46e1db21a5df3fc99a` |

---

## 2. Alcance Autorizado en T0 y Fronteras Inviolables

- **Alcance actual ejecutado:** Exclusivamente **T0** (congelamiento de línea base) y **T1** (especificación matemática SI XPBD vs. PBD + harness aislado de telemetría y sus pruebas de consistencia).
- **Tareas explícitamente detenidas en espera de autorización:** **T2** (paño Escena 0), **T3** (benchmark colisión A/B/C), **T4** (contraste 3 arquetipos + caso asimétrico), **T5** (primera prenda simulada Escena 1) y **T6** (sonda móvil y Gate 1).
- **Fronteras inviolables:**
  1. Cero alteraciones en módulos **M00–M07**, **M02**, **Flujo B**, base de datos, SQL, migraciones, `package.json` de producción, `tsconfig.json`, `app/` y `src/components/mannequin3d/`.
  2. **M05** permanece opcional y estrictamente de solo lectura (la PoC opera 100% desacoplada).
  3. Sin instalación de dependencias nuevas en `node_modules`.
  4. Sin selección definitiva de XPBD, PBD ni alternativa de colisión antes de completar los benchmarks de Etapa 1.

---

## 3. Deuda Contractual Abierta Heredada de V2.6 (Registrada como Pendiente)

Se mantiene congelada como requisito bloqueante para **Etapa 4 / Gate 4** (en el validador determinista de runtime `validateTextileProfileInvariants`, fuera de JSON Schema Draft 2020-12 `TextileProfileV2_6`):
1. En `REDUCED_REPETITIONS_SWATCH_LIMIT` y `COMBINED_SWATCH_CONSTRAINT` sobre telas `ASYMMETRIC`, JSON Schema **no** valida `Math.min(faceUp.repetitionsCount, faceDown.repetitionsCount) === repetitionsCount` ni que al menos una cara tenga `<= 4` repeticiones.
2. Entre `faceDirectionalResults` (`faceUp` / `faceDown`) y `PhysicalProperty`, JSON Schema **no** valida `range.min === Math.min(B_up, B_down)`, `range.max === Math.max(B_up, B_down)`, `asymmetryRatio_faceUpOverFaceDown`, `bendingLengthMean_cm = cantileverLengthMean_cm / 2` ni la cuadratura Tipo A / Tipo B / combinada independiente por cara.

---

## 4. Criterio de Aceptación T0

- **Estado:** **PASS** — Línea base V2.6 + `PLAN_POC_SIMULADOR_3D.md` congelada con checksums verificados, pendiente cruzado por cara registrado y aislamiento total del workspace en [`poc-simulador-3d/`](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-simulador-3d/).

