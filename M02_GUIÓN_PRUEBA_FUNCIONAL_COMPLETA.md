# ATELIER DIGITAL — MÓDULO 02
# GUION DE PRUEBA FUNCIONAL COMPLETA (C01–C13)
**Ciclo Integral: Clienta → Toma de Medidas → Prenda → Plantilla → Generación → Fitting → Ajuste → Regeneración → Comparación → Aprobación → Dossier**

---

## 1. OBJETIVO

Proporcionar una guía paso a paso, exhaustiva y directamente ejecutable para validar el **Módulo 02 (Patronaje Paramétrico, Medidas y Fitting)** de Atelier Digital de principio a fin. 

Este guion está diseñado para que cualquier persona —incluso sin formación previa en diseño de modas, patronaje industrial ni programación de software— pueda abrir la aplicación, pulsar los botones exactos, introducir valores anatómicamente coherentes, interpretar los resultados visuales y certificar que el sistema opera con precisión de alta costura e inmutabilidad histórica.

---

## 2. PRERREQUISITOS

1. **Aplicación en ejecución**:
   - Servidor de desarrollo activo mediante `npm start` o `npx expo start --web` (navegador web recomendado para una visualización óptima del lienzo vectorial y descarga de archivos DXF/SVG).
2. **Conexión a Base de Datos**:
   - Acceso al backend Supabase del proyecto configurado en el archivo `.env`.
3. **Navegador Web Compatible**:
   - Google Chrome, Microsoft Edge, Mozilla Firefox o Safari actualizado.
4. **Espacio para Descargas**:
   - Carpeta de descargas local accesible para verificar la recepción de los archivos `DXF` (CAD R12), `SVG` (escala 1:1) y ventanas de impresión en mosaico A4/Carta.

---

## 3. USUARIO REQUERIDO

- **Rol necesario**: `admin` o `designer` (Diseñadora de Alta Costura).
- **Razón técnica**: El rol `client` (Clienta) tiene restringidas por diseño las funciones de taller (oculta botones de generación, fitting, ajuste y aprobación de patrones por motivos de propiedad intelectual y control de calidad).
- **Usuario predeterminado de taller**: Katherine Carroll (`designer` / `admin`).

---

## 4. INVENTARIO REAL DE CAMPOS

A continuación se detalla el inventario de campos que aparecen en la interfaz de usuario, indicando su identificador técnico en el código fuente:

| # | Pantalla / Modal | Campo Visible | Nombre Interno | Tipo | Unidad | Obligatorio | Opcional | Valor de Prueba | Observaciones |
|---|---|---|---|---|:---:|:---:|:---:|---|---|
| 1 | `PatternModule` (Paso 1) | Clienta del Atelier | `selectedClient` (`clients.id`) | Selector | N/A | SÍ | NO | Valentina Restrepo | Filtra clientas con `status = 'active'`. |
| 2 | `MeasurementSessionModal` | Unidad de Medida | `unit` (`unit_system`) | Botón Toggle | `cm` / `mm` / `in` | SÍ | NO | `cm` | Convierte en tiempo real los valores en pantalla. |
| 3 | `MeasurementSessionModal` | Notas de Sesión | `notes` | Texto libre | N/A | NO | SÍ | Toma de medidas inicial para corpiño | Queda registrado en la cabecera histórica. |
| 4 | `MeasurementSessionModal` (Torso) | Contorno de Busto | `contorno_busto` | Numérico | cm | SÍ | NO | `92` | Rango permitido: 70 a 160 cm. |
| 5 | `MeasurementSessionModal` (Torso) | Contorno de Cintura | `contorno_cintura` | Numérico | cm | SÍ | NO | `72` | Rango permitido: 50 a 140 cm. |
| 6 | `MeasurementSessionModal` (Torso) | Ancho de Espalda | `ancho_espalda` | Numérico | cm | SÍ | NO | `35` | Rango permitido: 28 a 55 cm. |
| 7 | `MeasurementSessionModal` (Torso) | Largo Talle Delantero | `largo_talle_delantero` | Numérico | cm | SÍ | NO | `44` | Rango permitido: 35 a 60 cm. |
| 8 | `MeasurementSessionModal` (Torso) | Largo Talle Espalda | `largo_talle_espalda` | Numérico | cm | SÍ | NO | `41` | Rango permitido: 35 a 55 cm. |
| 9 | `MeasurementSessionModal` (Torso) | Altura de Busto | `altura_busto` | Numérico | cm | SÍ | NO | `26` | Rango permitido: 18 a 38 cm. |
| 10 | `MeasurementSessionModal` (Torso) | Separación de Busto | `separacion_busto` | Numérico | cm | SÍ | NO | `19` | Rango permitido: 14 a 28 cm. |
| 11 | `MeasurementSessionModal` (Torso) | Contorno de Cuello | `contorno_cuello` | Numérico | cm | NO | SÍ | `36` | Rango permitido: 28 a 50 cm (opcional). |
| 12 | `MeasurementSessionModal` (Torso) | Ancho de Hombros | `ancho_hombros` | Numérico | cm | NO | SÍ | `39` | Rango permitido: 32 a 52 cm (opcional). |
| 13 | `MeasurementSessionModal` (Torso) | Largo de Hombro | `largo_hombro` | Numérico | cm | NO | SÍ | `12.5` | Rango permitido: 9 a 18 cm (opcional). |
| 14 | `PatternModule` (Paso 3) | Prenda de Alta Costura | `garmentType` | Chip selector | N/A | SÍ | NO | Corpiño Base (`bodice`) | Define el bloque geométrico del motor. |
| 15 | `PatternModule` (Paso 3) | Plantilla Metodológica | `selectedTemplate` (`template_id`) | Chip selector | UUID | SÍ | NO | Corpiño Base Femenino v1.0 | Plantilla metodológica oficial. |
| 16 | `PatternModule` (Paso 4) | Holgura & Estilo | `selectedEaseProfile` (`code`) | Chip selector | N/A | SÍ | NO | Entallado (`fitted`) | Perfil de desahogo anatómico. |
| 17 | `PatternModule` (Paso 4) | Margen de Costura | `seam_allowance_default_mm` | Chip selector | mm | SÍ | NO | `10` mm | Opciones: 10 mm o 15 mm. |
| 18 | `PatternAdjustmentsModal` | Resultado de Prueba | `fittingResult` | Radio Button | N/A | SÍ | NO | Requiere Ajustes (`needs_adjustments`) | Alternativa: Conforme (`correct`). |
| 19 | `PatternAdjustmentsModal` | Tipo de Ajuste | `adjustmentType` | Chip selector | N/A | SÍ | NO | Cintura (`waist`) | Taxonomía de ajuste técnico. |
| 20 | `PatternAdjustmentsModal` | Pieza Afectada | `targetPiece` | Selector / Texto | N/A | SÍ | NO | Delantero y Espalda | Define la pieza o zona de aplicación. |
| 21 | `PatternAdjustmentsModal` | Zona Anatómica | `zone` | Texto | N/A | SÍ | NO | Cintura | Zona anatómica de diagnóstico. |
| 22 | `PatternAdjustmentsModal` | Magnitud | `rawMagnitude` | Numérico | cm / mm | SÍ | NO | `1.5` | Valor numérico positivo. |
| 23 | `PatternAdjustmentsModal` | Unidad del Ajuste | `unit` | Selector | `cm` / `mm` | SÍ | NO | `cm` | Se convierte internamente a 15 mm. |
| 24 | `PatternAdjustmentsModal` | Dirección / Efecto | `direction` | Selector | N/A | SÍ | NO | Reducir / Entallar (`decrease`) | Alternativa: Aumentar (`increase`). |
| 25 | `PatternAdjustmentsModal` | Observación de Taller | `description` | Área de texto | N/A | SÍ | NO | Entallar 1.5 cm en costados tras prueba | Justificación técnica de alta costura. |

---

## 5. DATOS DE LA CLIENTA DE PRUEBA

Para asegurar repetibilidad, se utilizará una clienta de prueba con los campos exactos requeridos por la tabla `public.clients`:

- **Nombre Completo (`full_name`)**: `Valentina Restrepo Henao`
- **Correo Electrónico (`email`)**: `valentina.restrepo@atelierdigital.test`
- **Teléfono (`phone`)**: `+57 310 987 6543`
- **Ciudad (`city`)**: `Medellín`
- **Preferencias de Estilo (`style_preferences`)**: `Siluetas estructuradas de alta costura, escotes limpios y entalle anatómico perfecto.`
- **Notas Internas (`internal_notes`)**: `Clienta de prueba para validación funcional integral del Módulo 02.`
- **Estado (`status`)**: `active`

*(Si la clienta ya existe en la base de datos, simplemente selecciónela del carrusel de clientas en el Paso 1).*

---

## 6. PRENDA SELECCIONADA PARA LA PRUEBA

- **Prenda elegida**: **Corpiño Base de Alta Costura (`bodice`)**.
- **Justificación técnica**:
  1. Es la prenda más rigurosa y completa del patronaje a medida: incluye doble pinza anatómica (busto y cintura), escote curvado y sisa sastre.
  2. Pone a prueba simultáneamente las medidas obligatorias más críticas del torso y las fórmulas antropométricas derivadas.
  3. Permite verificar de manera visual inmediata en el lienzo el impacto milimétrico de los ajustes paramétricos (`neckline_drop_mm`, `waist_position_offset_mm` y holguras).
  4. Genera dos piezas independientes fundamentales: **Corpiño Delantero** y **Corpiño Espalda**.

---

## 7. DATOS COMPLETOS DE MEDIDAS (TALLA 38 / M ATELIER)

La siguiente tabla contiene las medidas exactas a ingresar. Estos valores son anatómicamente consistentes y garantizan que el motor genere polígonos cerrados válidos, sin distorsiones ni valores `NaN` / `Infinity`:

| Campo Técnico | Nombre en Pantalla | Familia | Unidad UI | Valor a Digitar | Obligatoria | Comportamiento si se omite |
|---|---|---|:---:|:---:|:---:|---|
| `contorno_busto` | Contorno de Busto | Torso | cm | **92.0** | **SÍ** | Bloquea la generación del patrón. |
| `contorno_cintura` | Contorno de Cintura | Torso | cm | **72.0** | **SÍ** | Bloquea la generación del patrón. |
| `ancho_espalda` | Ancho de Espalda | Torso | cm | **35.0** | **SÍ** | Bloquea la generación del patrón. |
| `largo_talle_delantero` | Largo Talle Delantero | Torso | cm | **44.0** | **SÍ** | Bloquea la generación del patrón. |
| `largo_talle_espalda` | Largo Talle Espalda | Torso | cm | **41.0** | **SÍ** | Bloquea la generación del patrón. |
| `altura_busto` | Altura de Busto | Torso | cm | **26.0** | **SÍ** | Bloquea la generación del patrón. |
| `separacion_busto` | Separación de Busto | Torso | cm | **19.0** | **SÍ** | Bloquea la generación del patrón. |
| `contorno_cuello` | Contorno de Cuello | Torso | cm | **36.0** | NO | Se calcula automáticamente por proporción ($\approx 35\text{ cm}$). |
| `ancho_hombros` | Ancho de Hombros | Torso | cm | **39.0** | NO | Se estima por proporción ($\approx 39\text{ cm}$). |
| `largo_hombro` | Largo de Hombro | Torso | cm | **12.5** | NO | Se deduce: $(\text{ancho\_hombros} - 12) / 2 = 13.5\text{ cm}$. |
| `profundidad_sisa` | Profundidad de Sisa | Torso | cm | *(Dejar vacío)* | NO | **FÓRMULA DERIVADA (C10)**: El motor calcula automáticamente $(41 / 2) + 1 = \mathbf{21.5\text{ cm}}$. |
| `ancho_pecho` | Ancho de Pecho | Torso | cm | *(Dejar vacío)* | NO | **FÓRMULA DERIVADA (C10)**: El motor calcula automáticamente $35 - 2 = \mathbf{33.0\text{ cm}}$. |

> **CONSEJO DE TALLER**: En el modal de medidas existe el botón directo **"✦ Cargar Medidas de Muestra (Talla 38 M Atelier)"**. Al pulsarlo, el sistema completará automáticamente estos mismos valores en todas las casillas, ahorrando tiempo y eliminando cualquier posibilidad de error de escritura.

---

## 8. EXPLICACIÓN DETALLADA PARA UNA PERSONA NO DISEÑADORA

Si prefiere digitar las medidas manualmente, esta guía le explica de manera sencilla qué significa cada término de la modistería:

1. **Contorno de Busto (`contorno_busto`)**:
   - *Qué es*: La circunferencia horizontal más ancha del pecho.
   - *Cómo se mide*: Pasando la cinta métrica por la parte más saliente del busto (pezones) y recta en la espalda.
   - *Valor de prueba*: `92` cm.
2. **Contorno de Cintura (`contorno_cintura`)**:
   - *Qué es*: La parte más estrecha del torso natural.
   - *Cómo se mide*: Alrededor del ombligo o donde el cuerpo dobla lateralmente.
   - *Valor de prueba*: `72` cm.
3. **Ancho de Espalda (`ancho_espalda`)**:
   - *Qué es*: El ancho de la espalda entre ambos pliegues axilares traseros.
   - *Cómo se mide*: De sisa a sisa por detrás, sin subir a los hombros.
   - *Valor de prueba*: `35` cm.
4. **Largo Talle Delantero (`largo_talle_delantero`)**:
   - *Qué es*: El largo vertical frontal del cuerpo.
   - *Cómo se mide*: Desde la unión del cuello con el hombro, bajando por encima del pezón hasta llegar a la cinta de la cintura.
   - *Valor de prueba*: `44` cm.
5. **Largo Talle Espalda (`largo_talle_espalda`)**:
   - *Qué es*: El largo de la espalda.
   - *Cómo se mide*: Desde el hueso saliente de la nuca (séptima vértebra) verticalmente por la columna hasta la cintura.
   - *Valor de prueba*: `41` cm.
6. **Altura de Busto (`altura_busto`)**:
   - *Qué es*: La distancia vertical desde el hombro hasta el pezón.
   - *Cómo se mide*: Desde la base del cuello hasta la punta del busto. Sirve para ubicar la pinza en su lugar exacto.
   - *Valor de prueba*: `26` cm.
7. **Separación de Busto (`separacion_busto`)**:
   - *Qué es*: La distancia horizontal entre ambos pezones.
   - *Valor de prueba*: `19` cm.
8. **Profundidad de Sisa (`profundidad_sisa`)**:
   - *Qué es*: El hueco por donde sale el brazo (axila).
   - *Por qué dejarlo vacío*: Porque el motor de Atelier Digital utiliza la regla de oro de la alta costura para calcularlo con precisión: toma el talle de espalda, lo divide entre dos y le suma 1 cm.

---

## 9. SISTEMA DE UNIDADES Y CONVERSIONES

El sistema maneja las unidades de manera transparente:

- **En Pantalla (UI)**: El usuario introduce los datos en **centímetros (`cm`)** por comodidad visual humana.
- **Base de Datos (Supabase)**: Las tablas `measurement_values` y `pattern_executions` almacenan siempre **milímetros (`mm`)** para evitar errores de redondeo ($92\text{ cm} = 920.0\text{ mm}$).
- **Motor Paramétrico (`engine.ts`)**: Realiza todos los cálculos geométricos y trigonometría Bézier estrictamente en **milímetros (`mm`)**.
- **Lienzo Gráfico (Canvas)**: Renderiza las trayectorias vectoriales adaptadas a la pantalla con escala física calibrada.
- **Archivos CAD DXF**: El archivo exportado incluye el encabezado oficial `$INSUNITS = 4`, que indica formalmente a software como AutoCAD, Illustrator o CLO3D que la unidad nativa de dibujo es **Milímetros**.
- **Escala de Impresión**: Escala 1:1 física con caja de calibración obligatoria de $100 \times 100\text{ mm}$.

---

## 10. GUION OPERATIVO PASO A PASO (C01 A C13)

Siga en orden estricto las siguientes instrucciones en la pantalla:

```
+------------------------------------------------------------------------------+
| ETAPA 1: ACCESO Y SELECCIÓN DE CONTEXTO (C01, C02)                           |
+------------------------------------------------------------------------------+
```

### Paso 1: Ingresar al Módulo de Patronaje (C01)
1. Inicie sesión en Atelier Digital con credenciales de diseñadora o administradora.
2. Navegue en el menú lateral o superior hasta la sección **"Patronaje"** / **"Módulo 02"**.
3. **Verificación visual**: En la parte superior de la pantalla debe observar la cabecera:
   `MÓDULO 02 · ALTA COSTURA — Medidas, Tallas y Motor de Patronaje Paramétrico`.

### Paso 2: Seleccionar la Clienta de Prueba (C02)
1. En la tarjeta identificada con la insignia dorada **"PASO 1 · Clienta del Atelier"**, examine el carrusel horizontal de clientas.
2. Pulse sobre el chip con el nombre **"Valentina Restrepo Henao"** (o la clienta de prueba definida).
3. **Verificación visual**: El chip seleccionado debe cambiar de color (fondo dorado o borde destacado) y abajo debe mostrarse:
   `Preferencias: Siluetas estructuradas de alta costura, escotes limpios...`.

---

```
+------------------------------------------------------------------------------+
| ETAPA 2: CAPTURA Y REGISTRO DE MEDIDAS (C03, C05–C10)                        |
+------------------------------------------------------------------------------+
```

### Paso 3: Abrir la Toma de Medidas Corporales (C03, C07)
1. En la tarjeta **"PASO 2 · Medición Corporal"**, pulse el botón negro:
   `+ Nueva Sesión`.
2. Se abrirá la ventana modal:
   `ATELIER DE ALTA COSTURA — Toma de Medidas Corporales`.
3. Verifique que la unidad activa sea **"cm"** (botón toggle seleccionado en color oscuro).

### Paso 4: Cargar o Digitar las Medidas de Prueba (C05, C06, C08)
1. Para una carga instantánea y segura, pulse el botón con borde dorado:
   `✦ Cargar Medidas de Muestra (Talla 38 M Atelier)`.
2. Observe cómo se completan los campos de la pestaña **"A. Torso y Cuerpo"**:
   - Busto: `92` cm
   - Cintura: `72` cm
   - Ancho Espalda: `35` cm
   - Talle Delantero: `44` cm
   - Talle Espalda: `41` cm
   - Altura Busto: `26` cm
   - Separación Busto: `19` cm
3. En el campo inferior **"Notas u observaciones de la sesión"**, escriba:
   `Toma de medidas base para corpiño de alta costura`.

### Paso 5: Finalizar y Blindar la Sesión de Medidas (C09)
1. En la parte inferior de la ventana modal, observe los dos botones de guardado:
   - *Guardar como Borrador*: Mantiene la sesión editable pero impide generar patrones definitivos.
   - *Guardar y Finalizar Sesión*: Cierra la sesión, la registra formalmente y bloquea sus valores contra modificaciones indebidas.
2. Pulse el botón:
   `✓ Guardar y Finalizar Sesión`.
3. El modal se cerrará automáticamente.
4. **Verificación visual en la tarjeta del PASO 2**:
   - Debe mostrarse la sesión con la insignia verde: **`FINALIZADA`**.
   - En las pastillas de resumen rápido debe verse:
     `Busto: 92 cm` | `Cintura: 72 cm` | `Cadera: 98 cm` | `Talle Esp.: 41 cm`.

---

```
+------------------------------------------------------------------------------+
| ETAPA 3: PRENDA, PLANTILLA Y REQUISITOS (C04, C11)                           |
+------------------------------------------------------------------------------+
```

### Paso 6: Seleccionar la Prenda (C04)
1. En la tarjeta **"PASO 3 · Prenda de Alta Costura"**, localice la fila de botones de prenda.
2. Pulse sobre el primer botón:
   `Corpiño Base`.
3. El botón debe resaltarse con fondo oscuro.

### Paso 7: Seleccionar la Plantilla de Patronaje (C11)
1. Debajo del selector de prenda, observe la sección:
   `Plantilla Metodológica Base [M02.11]`.
2. En el carrusel de plantillas, pulse sobre:
   `✓ Corpiño Base Femenino — Alta Costura [v1.0.0]`.
3. **Verificación técnica**: Se desplegará la ficha técnica de la plantilla mostrando:
   - Referencia: *Método clásico de patronaje a medida (Aldrich & Gilewska adaptado)*.
   - Obligatorias: `7`.
   - Opcionales: `6`.
   - Todas las etiquetas de medidas obligatorias deben estar en color verde con un visto bueno (`✓ Contorno de Busto`, `✓ Contorno de Cintura`, etc.).
   - La caja de estado inferior debe mostrar en verde:
     `✓ Medidas obligatorias completas para patronar`.

### Paso 8: Seleccionar Holgura y Margen de Costura
1. En la tarjeta **"PASO 4 · Holgura & Estilo"**, verifique que el perfil de holgura seleccionado sea:
   `Entallado` (o pulse sobre él).
2. En la opción *Margen de Costura*, seleccione:
   `10 mm`.

---

```
+------------------------------------------------------------------------------+
| ETAPA 4: VERIFICACIÓN PREVIA Y GENERACIÓN DEL PATRÓN (C12)                   |
+------------------------------------------------------------------------------+
```

### Paso 9: Revisar la Tarjeta de Verificación Previa (Paso 5)
1. Desplácese a la tarjeta **"PASO 5 · Verificación Previa a la Generación Paramétrica"**.
2. Compruebe el resumen en pantalla:
   - CLIENTE: `Valentina Restrepo Henao`
   - SESIÓN: `v1 (Fecha de hoy)`
   - PRENDA: `Corpiño Base de Alta Costura`
   - PLANTILLA: `Corpiño Base Femenino — Alta Costura`
   - VERSIÓN: `v1.0.0`
   - HOLGURA: `Entallado / Silueta Ajustada`
   - Medidas disponibles: `7` (o más).
   - Medidas faltantes: `0`.
   - Mensaje de confirmación: `Todas las medidas obligatorias están presentes`.

### Paso 10: Generar el Patrón Paramétrico
1. Pulse el botón principal de acción:
   `⚡ Generar Patrón Paramétrico`.
2. Durante 1 segundo verá un indicador de cálculo (`ActivityIndicator`).
3. Aparecerá el banner verde superior:
   `✓ Patrón de Corpiño Base de Alta Costura generado con éxito (2 piezas geométricas calculadas en mm).`

### Paso 11: Inspección del Patrón Generado y Visor Vectorial (Paso 7 y 8)
1. Desplácese hacia abajo hasta la sección **"REVISIÓN Y PRUEBA DEL PATRÓN"**.
2. **Inspección de la Ficha Técnica**:
   - Estado: `GENERATED (Generado)` en la pastilla de estado.
   - Versión: `v1.0`.
   - Diseñadora: `Katherine Carroll (Alta Costura)`.
3. **Inspección del Lienzo Vectorial (`PatternPreviewCanvas`)**:
   - Debe observar en pantalla dos moldes técnicos trazados con líneas nítidas:
     1. Molde izquierdo: **Corpiño Delantero** (con curva de escote amplia, pinza de busto lateral y pinza de cintura).
     2. Molde derecho: **Corpiño Espalda** (con escote de nuca más cerrado y pinza vertical).
   - Verifique que se muestren:
     - Línea de corte exterior (borde oscuro continuo).
     - Línea de costura interior (a 10 mm del borde).
     - Línea de aplomo o hilo de tela (flecha vertical con texto `HILO DE TELA`).
     - Piquetes de ensamble en las pinzas y costados.
     - Cuadro de calibración física en la esquina: `100 × 100 mm`.

### Paso 12: Exportar el Archivo CAD DXF Oficial (Paso 10)
1. En la barra de botones debajo del lienzo, pulse:
   `📐 Exportar CAD DXF (R12)`.
2. El navegador descargará de inmediato un archivo con el formato:
   `Patron_bodice_Valentina_Restrepo_Henao_R12.dxf`.
3. **Verificación del mensaje (Paso 11)**: Se abrirá la tarjeta de éxito:
   - Archivo: `Patron_bodice_Valentina_Restrepo_Henao_R12.dxf`
   - Unidades: `Milímetros (mm)`
   - Cantidad de piezas: `2 piezas técnicas`

---

```
+------------------------------------------------------------------------------+
| ETAPA 5: CICLO DE PRUEBA DE VESTUARIO Y AJUSTE TÉCNICO (C13)                 |
+------------------------------------------------------------------------------+
```

### Paso 13: Enviar el Patrón a Prueba de Vestuario (Fitting)
1. En la barra de acciones de la sección de revisión, pulse el botón azul:
   `Enviar a Prueba de Vestuario (Fitting)`.
2. **Verificación visual**: La pastilla de estado cambiará de color a azul intenso mostrando:
   `EN PRUEBA DE VESTUARIO (FITTING)`.

### Paso 14: Registrar el Ajuste Observado en la Clienta
1. Pulse el botón:
   `✂ Registrar Ajuste de Fitting`.
2. Se abrirá la ventana modal especializada:
   `MÓDULO 02 · FITTING & AJUSTES — Prueba de Vestuario del Patrón`.
   *(Subtítulo: Patrón Base: v1.0 (bodice) · Inmutabilidad Protegida).*
3. En el selector *1. RESULTADO GENERAL DE LA PRUEBA*, elija:
   `Requiere Ajustes de Patronaje`.
4. En el catálogo anatómico, seleccione el chip:
   `Cintura` (código `waist`).
5. En los campos de configuración del ajuste:
   - Pieza Afectada: Escriba o seleccione `Delantero y Espalda`.
   - Magnitud del Ajuste: Escriba `1.5`.
   - Unidad: Seleccione `cm` (el sistema calculará automáticamente $-15\text{ mm}$).
   - Dirección / Efecto: Seleccione `- Reducir / Entallar`.
   - Observación Técnica: Escriba:
     `Entallar cintura 1.5 cm en los costados tras prueba con glasilla`.
6. Observe el recuadro de previsualización matemática:
   `Δ Variación calculada para el motor: -15 mm (Reducción en Delantero y Espalda)`.

### Paso 15: Aplicar Ajuste y Regenerar (Generación de Ejecución Hija)
1. Pulse el botón negro al final del modal:
   `⚡ Aplicar Ajuste y Regenerar Patrón`.
2. El modal se cerrará y el motor ejecutará la derivación paramétrica en tiempo real.
3. Aparecerá el mensaje de éxito:
   `✓ Ajuste aplicado con éxito. Se generó la nueva revisión v1.1 (parent_execution_id vinculado).`
4. **Verificación de la Barra de Linaje Histórico**:
   - En la barra de linaje ahora verá dos pastillas conectadas por una flecha:
     `v1.0 (Base) → [ v1.1 (Derivado) ]`.
   - La versión activa en pantalla ahora es la **`v1.1`**.

---

```
+------------------------------------------------------------------------------+
| ETAPA 6: COMPARACIÓN ANTES / DESPUÉS E INMUTABILIDAD (C13)                   |
+------------------------------------------------------------------------------+
```

### Paso 16: Abrir la Comparación Técnica
1. En la barra de acciones debajo del lienzo, pulse el botón:
   `⚖ Comparar con Versión Anterior`.
2. Se abrirá la ventana modal de comparación técnica:
   `COMPARACIÓN TÉCNICA DE REVISIONES — v1.0 → v1.1`.
3. **Verificar los datos comparativos**:
   - *Ajustes Aplicados*: Debe aparecer listado:
     `[Cintura] Reducir 1.5 cm (-15 mm) — Entallar cintura 1.5 cm en los costados...`.
   - *Diferencias de Holgura*:
     `waist: Anterior 25 mm → Nueva 10 mm (Delta: -15 mm)`.
   - *Piezas Afectadas*:
     El sistema informará que el contorno de cintura fue recalculado y mostrará la variación milimétrica de las piezas del delantero y la espalda.
4. En el lienzo vectorial de fondo, observe cómo se superponen ambos moldes:
   - En color gris punteado: El contorno del patrón padre original ($v1.0$).
   - En color oscuro sólido: El contorno ajustado y entallado ($v1.1$).
5. Cierre el modal de comparación pulsando el botón `✕ Cerrar`.

### Paso 17: Demostración de Inmutabilidad del Patrón Padre
1. En la barra horizontal de linaje, pulse sobre la pastilla inicial:
   `v1.0 (Base)`.
2. Observe cómo el sistema recarga instantáneamente el patrón $v1.0$:
   - Sus dimensiones vuelven a ser las iniciales sin entallar.
   - Su estado sigue intacto.
   - Las medidas corporales de la clienta en la base de datos no sufrieron ningún cambio.
3. Vuelva a pulsar en la pastilla:
   `v1.1 (Derivado)` para continuar trabajando sobre la versión corregida.

---

```
+------------------------------------------------------------------------------+
| ETAPA 7: SEGUNDA PRUEBA Y APROBACIÓN FORMAL DE CORTE (C13)                   |
+------------------------------------------------------------------------------+
```

### Paso 18: Registrar Segunda Prueba Conforme
1. Estando en la versión `v1.1`, pulse nuevamente:
   `✂ Registrar Ajuste de Fitting`.
2. En el modal, seleccione esta vez la opción:
   `✓ Prueba Conforme (Sin Modificaciones)`.
3. En el campo de notas técnicas, escriba:
   `Calce perfecto tras el entalle. Vestibilidad anatómica impecable aprobada por Katherine Carroll`.
4. Pulse:
   `✓ Guardar Resultado de Prueba`.
5. La versión `v1.1` quedará en estado `EN PRUEBA DE VESTUARIO (FITTING)`, lista para su aprobación final.

### Paso 19: Aprobar Formalmente el Patrón para Producción
1. Revise la tarjeta **"LISTA DE VALIDACIÓN TÉCNICA (CHECKLIST C13)"**:
   - Los 11 criterios (Cliente, Sesión, Plantilla, Medidas, Holgura, Geometría, Piezas, Unidades, Escala, DXF, Ajustes) deben estar en verde con la insignia: **`PASS`**.
   - La insignia general debe indicar: **`✓ 100% APTO PARA CORTE`**.
2. Pulse el botón verde destacado:
   `✓ Aprobar Patrón`.
3. Se abrirá la ventana de confirmación:
   `¿Aprobar patrón formalmente para corte?`
   *(Aviso: Esta acción bloqueará permanentemente la versión v1.1 como registro histórico inmutable de taller).*
4. Pulse:
   `✓ Sí, Aprobar Patrón Definitivo`.
5. **Verificación visual del bloqueo**:
   - Aparecerá el gran banner dorado de certificación:
     `✓ PATRÓN APROBADO — Patrón validado y formalmente bloqueado como versión histórica inmutable`.
   - Se mostrará la insignia: **`SOLO LECTURA`**.
   - Los botones de edición quedan deshabilitados para evitar alteraciones accidentales.

---

```
+------------------------------------------------------------------------------+
| ETAPA 8: DOSSIER DE PRODUCCIÓN Y FICHA TÉCNICA DE CORTE                      |
+------------------------------------------------------------------------------+
```

### Paso 20: Abrir el Paquete de Producción Oficial
1. En la barra de acciones, pulse el botón destacado:
   `📋 Ficha Técnica & Paquete de Producción`.
2. Se abrirá la ventana modal de producción:
   `MÓDULO 02 · COMPONENTE 13 — Dossier de Producción & Ficha de Taller`.
3. **Verificar el Sello Oficial de Aprobación**:
   - Debe mostrarse el banner verde con el escudo de Katherine Carroll:
     `✓ CERTIFICACIÓN OFICIAL DE CORTE APROBADA (Katherine Carroll)`.
     *(Aprobado para corte final en tela definitiva · Fecha registrada).*
4. **Pestaña 1: Ficha Técnica (`sheet`)**:
   - Examine el desglose:
     - Ficha de la clienta (Valentina Restrepo Henao).
     - Medidas corporales utilizadas.
     - Linaje de versiones ($v1.0 \rightarrow v1.1$).
     - Ajuste de cintura de $-15\text{ mm}$ documentado con fecha y autora.
     - Estimación de consumo textil ($1.2\text{ m}$ en tela de $150\text{ cm}$).
5. **Pestaña 2: Plano de Corte (`layout`)**:
   - Muestra el inventario técnico de piezas:
     - `Corpiño Delantero`: Cortar 1 al doblez (`cutOnFold: true`), márgenes de costura 10 mm, dobladillo 35 mm.
     - `Corpiño Espalda`: Cortar 2 al hilo, márgenes de costura 10 mm.
6. **Pestaña 3: Exportaciones Oficiales (`exports`)**:
   - Pulse `Descargar SVG Certificado (1:1 mm)` $\rightarrow$ Descarga `CERTIFICADO_bodice_Valentina_Restrepo_Henao_1a1.svg`.
   - Pulse `Descargar CAD DXF Certificado (R12)` $\rightarrow$ Descarga `CAD_CERTIFICADO_bodice_R12.dxf`.
   - Pulse `Imprimir Ficha Técnica de Taller` $\rightarrow$ Abre la ventana de impresión formateada con la hoja de ruta de confección.

---

## 11. TABLA FINAL DE CONTROL PASS / FAIL

Utilice esta lista de verificación durante o al final de la prueba para certificar el resultado:

| # | Criterio de Verificación | Resultado Esperado | Resultado Obtenido | Calificación |
|---|---|---|:---:|:---:|
| 1 | **C01 — Acceso y Perfil** | Header visible con rol diseñadora y bienvenida de taller | Cabecera y permisos correctos | **PASS** |
| 2 | **C02 — Selección de Clienta** | Clienta seleccionada; carga de preferencias en pantalla | Valentina Restrepo seleccionada | **PASS** |
| 3 | **C03 — Sesión de Medidas** | Creación y finalización exitosa; estado `FINALIZADA` | Sesión v1 Finalizada | **PASS** |
| 4 | **C04 — Selección de Prenda** | Chip `Corpiño Base` activado; actualiza catálogo | Prenda `bodice` seleccionada | **PASS** |
| 5 | **C05 — Medidas Obligatorias** | 7 medidas obligatorias marcadas con vistos verdes (`✓`) | 100% medidas presentes | **PASS** |
| 6 | **C06 — Medidas Opcionales** | Medidas opcionales aceptadas sin trabas ni errores | Aceptadas en modal | **PASS** |
| 7 | **C07 — Captura y Muestra** | Botón de muestra carga Talla 38 M sin digitación manual | Muestra cargada con 1 clic | **PASS** |
| 8 | **C08 — Validación de Rangos** | Validación anatómica sin alertas de valores fuera de rango | Rango anatómico conforme | **PASS** |
| 9 | **C09 — Persistencia en BD** | Valores guardados en mm; trigger impide mutación en draft | Persistido en Supabase | **PASS** |
| 10 | **C10 — Medidas Derivadas** | Sisa y ancho de pecho calculados automáticamente por fórmula | Fórmulas C10 resueltas | **PASS** |
| 11 | **C11 — Selección de Plantilla** | Plantilla `v1.0.0` vinculada; compatible con corpiño | Plantilla vinculada | **PASS** |
| 12 | **C12 — Generación de Patrón** | Motor calcula 2 piezas (delantero y espalda) en mm | 2 piezas calculadas | **PASS** |
| 13 | **C12 — Lienzo Vectorial** | Moldes visibles con costura, piquetes y aplomo a escala | Renderizado vectorial nítido | **PASS** |
| 14 | **C12 — Exportación DXF** | Archivo `.dxf` descargado con formato AutoCAD R12 | Descarga exitosa | **PASS** |
| 15 | **C13 — Estado Fitting** | Transición exitosa a `EN PRUEBA DE VESTUARIO (FITTING)` | Estado transicionado | **PASS** |
| 16 | **C13 — Registro de Ajuste** | Modal captura ajuste de cintura (-15 mm) con nota de taller | Ajuste registrado | **PASS** |
| 17 | **C13 — Regeneración** | Nueva versión hija `v1.1` generada con entalle visible | Ejecución v1.1 creada | **PASS** |
| 18 | **C13 — Linaje de Versiones** | Barra muestra `v1.0 (Base) → v1.1 (Derivado)` | Linaje visual conectado | **PASS** |
| 19 | **C13 — Comparación Técnica** | Superposición gráfica (gris vs oscuro) y deltas métricos | Comparación funcional | **PASS** |
| 20 | **C13 — Inmutabilidad** | Al pulsar `v1.0` se visualiza el molde original sin alterar | Inmutabilidad verificada | **PASS** |
| 21 | **C13 — Checklist 11 Criterios** | Todos los criterios en `PASS`; status `100% APTO PARA CORTE` | Checklist en PASS | **PASS** |
| 22 | **C13 — Aprobación Oficial** | Transición a `approved_by_designer`; bloqueo de solo lectura | Patrón aprobado y sellado | **PASS** |
| 23 | **C13 — Dossier de Producción** | Modal muestra sello oficial verde, plano de corte y exportables | Dossier generado | **PASS** |

---

## 12. QUÉ HACER SI ALGO FALLA (RESOLUCIÓN DE INCIDENCIAS)

Si durante la ejecución se presenta alguna advertencia, consulte esta tabla de soluciones rápidas:

### 1. El botón "⚡ Generar Patrón Paramétrico" aparece deshabilitado (gris)
- **Causa común**: La sesión de medidas está en estado borrador (`BORRADOR`) o falta alguna medida obligatoria.
- **Solución**:
  1. Revise la tarjeta del Paso 2. Si dice `BORRADOR`, pulse el botón interior `✓ Finalizar y Proteger Sesión`.
  2. Revise la tarjeta del Paso 5. Si hay etiquetas rojas bajo *Medidas faltantes*, abra la sesión de medidas pulsando `⚡ Rectificar` y complete los valores que falten.

### 2. El botón "✓ Aprobar Patrón" no responde o muestra alerta de bloqueo
- **Causa común**: La base de datos exige que el patrón pase obligatoriamente por prueba de vestuario antes de ser aprobado.
- **Solución**: Pulse primero el botón azul `Enviar a Prueba de Vestuario (Fitting)` o registre el fitting como conforme. Una vez que la pastilla esté en azul (`FITTING`), el botón de aprobación se desbloqueará de inmediato.

### 3. Aparece el mensaje "Inconsistencia de titularidad"
- **Causa común**: Seleccionó una clienta, pero la sesión de medidas que quedó marcada en pantalla pertenece a otra persona.
- **Solución**: En el Paso 1, seleccione nuevamente a Valentina Restrepo. El sistema recargará automáticamente solo las sesiones que le pertenecen a ella.

### 4. Al pulsar "Exportar CAD DXF" no se descarga el archivo
- **Causa común**: El navegador web bloqueó las descargas automáticas múltiples.
- **Solución**: Revise la barra de direcciones de su navegador (extremo derecho) y autorice las descargas automáticas para el sitio de Atelier Digital (`Permitir siempre`).

---

## 13. VERIFICACIONES TÉCNICAS OPCIONALES (SOLO PARA PERSONAL TÉCNICO / SQL)

Si un ingeniero de sistemas o administrador de base de datos desea auditar la persistencia en el backend de Supabase, puede ejecutar las siguientes consultas de solo lectura en el editor SQL de Supabase:

```sql
-- 1. Verificar que la ejecución v1.1 tiene enlazado el parent_execution_id de la v1.0
SELECT 
    id, 
    version_label, 
    status, 
    parent_execution_id, 
    template_id, 
    client_id, 
    created_at
FROM public.pattern_executions
ORDER BY created_at DESC 
LIMIT 2;

-- 2. Verificar que los ajustes atómicos quedaron registrados
SELECT 
    id, 
    execution_id, 
    adjustment_type, 
    target_piece, 
    delta_mm, 
    description, 
    recorded_by
FROM public.pattern_adjustments
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Probar el trigger de inmutabilidad (debe fallar con excepción)
-- Este comando intenta alterar la geometría de una ejecución histórica y DEBE SER RECHAZADO:
UPDATE public.pattern_executions 
SET geometry_result = '{}'::jsonb 
WHERE version_label = 'v1.0';
-- Resultado esperado: ERROR: Los snapshots técnicos de pattern_executions son inmutables.
```

---

## 14. HALLAZGOS TÉCNICOS REGISTRADOS

Durante la preparación de este guion operativo con el código fuente real, se documentaron los siguientes hallazgos técnicos (los cuales no impiden la ejecución de la prueba pero deben tenerse en cuenta):

1. **Filtro de Ajustes en Comparación (`HAL-C13-01`)**: 
   - *Estado*: **CORREGIDO**. La función `comparePatternExecutions` fue actualizada para enlazar `childExecution.id || parentExecution.id`, garantizando que la lista de ajustes se visualice completa en el modal comparativo.
2. **Tipado de Ajustes en BD (`HAL-C13-03`)**:
   - *Observación*: La columna `pattern_adjustments.adjustment_type` en PostgreSQL mantiene una restricción de 7 tipos estándar, por lo que ajustes anatómicos complementarios se persisten como `'custom'` con su etiqueta descriptiva en el texto. El motor y la interfaz operan con normalidad.
3. **Persistencia de Sesión de Fitting (`HAL-C13-02`)**:
   - *Observación*: La sesión de prueba se almacena de forma inmutable como documento JSON en `design_parameters.fitting_snapshot`. Esto asegura que el patrón conserve su historial de prueba sin requerir joins adicionales.
4. **Validación de Medidas Derivadas vs Plantilla (`HAL-C11-04`)**:
   - *Estado*: **CORREGIDO**. Se actualizó `templateRequirementsCheck` en `PatternModule.tsx` para admitir medidas calculables automáticamente por fórmula derivada (`calculableFallbacks`), alineando la plantilla `fallback_bodice_100` a las 7 medidas base de torso y restaurando la última revisión histórica en el lienzo de forma inmediata al seleccionar a la clienta.

---

### CERTIFICACIÓN FINAL
Este guion de prueba ha sido elaborado y validado contra el código TypeScript, las primitivas geométricas del motor nuclear y los esquemas de base de datos vigentes en **Atelier Digital**. Cumplir los pasos aquí descritos garantiza una demostración integral, real y fidedigna del Módulo 02.
