-- ============================================================================
-- ATELIER DIGITAL | M02 - VERIFICADOR COMPLETO DE DEMOSTRACIÓN (30 ALUMNOS)
-- SOLO LECTURA: contiene exclusivamente SELECT / WITH SELECT.
-- No ejecutar carga ni rollback desde este archivo.
--
-- ESTRUCTURA:
--   SECCIÓN 1 — PRE-FLIGHT  : Ejecutar ANTES de cargar demo_colegio_30_alumnos.sql
--   SECCIÓN 2 — POST-FLIGHT : Ejecutar DESPUÉS de cargar para confirmar integridad
--   SECCIÓN 3 — ROLLBACK    : Ejecutar ANTES del rollback para verificar viabilidad
--
-- Tablas consultadas (todas verificadas contra migraciones locales):
--   public.clients                             (20261013220000_clients_module.sql)
--   public.persons                             (20261026160000_persons_and_groups_module.sql)
--   public.groups                              (20261026160000_persons_and_groups_module.sql)
--   public.group_members                       (20261026160000_persons_and_groups_module.sql)
--   public.measurement_campaigns               (20261026170000_measurement_campaigns_module.sql)
--   public.measurement_campaign_participants   (20261026170000_measurement_campaigns_module.sql)
--   public.measurement_sessions                (20261014210000_modulo02_measurements_patterns.sql)
--   public.measurement_values                  (20261014210000_modulo02_measurements_patterns.sql)
--   public.measurement_catalog                 (20261014210000_modulo02_measurements_patterns.sql)
--   public.creations                           (20261017100000_creations_module.sql)
--   public.pattern_templates                   (20261014210000_modulo02_measurements_patterns.sql)
--   public.pattern_executions                  (20261014210000_modulo02_measurements_patterns.sql)
--   auth.users                                 (Supabase Auth — tabla del sistema)
-- ============================================================================


-- ############################################################################
-- ##                                                                        ##
-- ##   SECCIÓN 1 — PRE-FLIGHT                                               ##
-- ##   Ejecutar ANTES de cargar demo_colegio_30_alumnos.sql                  ##
-- ##   Todas las consultas deben devolver los resultados indicados.          ##
-- ##   Si alguna falla, NO ejecutar el script de carga.                     ##
-- ##                                                                        ##
-- ############################################################################


-- ============================================================================
-- PRE-FLIGHT A: DETECCIÓN DE COLISIONES EN UUIDS RESERVADOS e1*
-- Verifica que ningún registro existente ocupe los rangos UUID del demo.
-- RESULTADO ESPERADO: Todas las filas deben mostrar registros_encontrados = 0
-- ============================================================================

SELECT 'clients (e1a1*)' AS entidad,
       COUNT(*) AS registros_encontrados
FROM public.clients
WHERE id = 'e1a10000-0000-4000-8000-000000000001'

UNION ALL
SELECT 'groups (e1a2*)',
       COUNT(*)
FROM public.groups
WHERE id = 'e1a20000-0000-4000-8000-000000000001'

UNION ALL
SELECT 'campaigns (e1a3*)',
       COUNT(*)
FROM public.measurement_campaigns
WHERE id = 'e1a30000-0000-4000-8000-000000000001'

UNION ALL
SELECT 'persons (e1b*: 30 alumnos)',
       COUNT(*)
FROM public.persons
WHERE id BETWEEN 'e1b00000-0000-4000-8000-000000000001'::uuid
             AND 'e1b00000-0000-4000-8000-000000000030'::uuid

UNION ALL
SELECT 'sessions (e1c*: 30 sesiones)',
       COUNT(*)
FROM public.measurement_sessions
WHERE id BETWEEN 'e1c00000-0000-4000-8000-000000000001'::uuid
             AND 'e1c00000-0000-4000-8000-000000000030'::uuid

UNION ALL
SELECT 'participants (e1d*: 30)',
       COUNT(*)
FROM public.measurement_campaign_participants
WHERE id BETWEEN 'e1d00000-0000-4000-8000-000000000001'::uuid
             AND 'e1d00000-0000-4000-8000-000000000030'::uuid

UNION ALL
SELECT 'creations (e1e*: 45)',
       COUNT(*)
FROM public.creations
WHERE id BETWEEN 'e1e00000-0000-4000-8000-000000000001'::uuid
             AND 'e1e00000-0000-4000-8000-000000000045'::uuid

ORDER BY entidad;


-- ============================================================================
-- PRE-FLIGHT B: CONTEO DE PLANTILLAS CAD (pattern_templates)
-- Verifica que las 21 plantillas históricas de M02 existen.
-- Columnas consultadas: garment_type, name, version (confirmadas en migración
-- 20261014210000_modulo02_measurements_patterns.sql).
-- RESULTADO ESPERADO: total_plantillas = 21
-- ============================================================================

SELECT COUNT(*) AS total_plantillas
FROM public.pattern_templates;

-- Detalle complementario: lista las plantillas existentes para inspección.
SELECT garment_type, name, version, created_at
FROM public.pattern_templates
ORDER BY created_at, garment_type;


-- ============================================================================
-- PRE-FLIGHT C: VERIFICACIÓN DE LOS 12 CÓDIGOS DE MEDICIÓN REQUERIDOS
-- Estos son los códigos que usa demo_colegio_30_alumnos.sql para insertar
-- los 300 valores de medidas (10 por alumno × 30 alumnos, donde las niñas
-- usan largo_falda y profundidad_cintura_cadera como 2 de sus 10 valores).
-- Columna consultada: measurement_catalog.code (confirmada en migración
-- 20261014210000_modulo02_measurements_patterns.sql).
-- RESULTADO ESPERADO: 0 filas (ningún código faltante)
-- ============================================================================

WITH expected(code) AS (
  VALUES ('estatura'), ('contorno_cuello'), ('contorno_busto'),
         ('contorno_cintura'), ('contorno_cadera'), ('ancho_hombros'),
         ('largo_talle_espalda'), ('largo_brazo'), ('profundidad_tiro'),
         ('largo_exterior_pierna'), ('largo_falda'), ('profundidad_cintura_cadera')
)
SELECT e.code AS codigo_faltante
FROM expected e
LEFT JOIN public.measurement_catalog mc ON mc.code = e.code
WHERE mc.code IS NULL
ORDER BY e.code;


-- ============================================================================
-- PRE-FLIGHT D: IDENTIDAD DE LA DISEÑADORA EN auth.users
-- Verifica que el UUID configurado en v_designer_user_id del script de carga
-- existe y corresponde al correo esperado.
-- RESULTADO ESPERADO: 1 fila con email = prueba1@bykatherinecarroll.com
-- ============================================================================

SELECT id, email, raw_user_meta_data->>'full_name' AS nombre
FROM auth.users
WHERE id = '262bf83b-c916-4712-bb8a-cea98a1c359b';


-- ============================================================================
-- PRE-FLIGHT E: LÍNEA BASE HISTÓRICA
-- Anote estos valores antes de la carga. Después del demo, los conteos deben
-- incrementarse en: +1 cliente, +30 personas, +1 grupo, +1 campaña,
-- +30 sesiones, +300 valores, +45 creaciones, +0 ejecuciones, +0 plantillas.
-- Después del rollback, deben volver exactamente a estos valores.
-- NOTA: Esta consulta es informativa. No debe usarse sola como prueba de
-- integridad, ya que los conteos pueden variar si se operó la app.
-- RESULTADO ESPERADO (referencia M02):
--   clientes=3, personas=0*, grupos=0*, campanias=0*,
--   sesiones=7, valores=(variable), creaciones=1,
--   ejecuciones_cad=18, plantillas_cad=21
--   (* pueden tener valores si se usaron desde la app)
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM public.clients) AS clientes,
  (SELECT COUNT(*) FROM public.persons) AS personas,
  (SELECT COUNT(*) FROM public.groups) AS grupos,
  (SELECT COUNT(*) FROM public.measurement_campaigns) AS campanias,
  (SELECT COUNT(*) FROM public.measurement_sessions) AS sesiones,
  (SELECT COUNT(*) FROM public.measurement_values) AS valores_medida,
  (SELECT COUNT(*) FROM public.creations) AS creaciones,
  (SELECT COUNT(*) FROM public.pattern_executions) AS ejecuciones_cad,
  (SELECT COUNT(*) FROM public.pattern_templates) AS plantillas_cad;


-- ############################################################################
-- ##                                                                        ##
-- ##   SECCIÓN 2 — POST-FLIGHT                                              ##
-- ##   Ejecutar DESPUÉS de cargar demo_colegio_30_alumnos.sql                ##
-- ##   Verifica que los datos del demo fueron insertados correctamente.      ##
-- ##                                                                        ##
-- ############################################################################


-- ============================================================================
-- POST-FLIGHT 1: Cliente institucional.
-- RESULTADO ESPERADO: 1 fila con el colegio de demostración.
-- ============================================================================

SELECT id, full_name, email, city, status, created_by
FROM public.clients
WHERE id = 'e1a10000-0000-4000-8000-000000000001';


-- ============================================================================
-- POST-FLIGHT 2: Alumnos por categoría demográfica.
-- RESULTADO ESPERADO: boy=15, girl=15
-- ============================================================================

SELECT demographic_category, COUNT(*) AS cantidad
FROM public.persons
WHERE client_id = 'e1a10000-0000-4000-8000-000000000001'
  AND id BETWEEN 'e1b00000-0000-4000-8000-000000000001'::uuid
             AND 'e1b00000-0000-4000-8000-000000000030'::uuid
GROUP BY demographic_category
ORDER BY demographic_category;


-- ============================================================================
-- POST-FLIGHT 3: Detalle de los 30 alumnos y su referencia escolar.
-- RESULTADO ESPERADO: 30 filas con reference_id ALUM-M01..M15 y ALUM-F01..F15
-- ============================================================================

SELECT id, full_name, demographic_category, reference_id, birth_date, is_active
FROM public.persons
WHERE client_id = 'e1a10000-0000-4000-8000-000000000001'
  AND id BETWEEN 'e1b00000-0000-4000-8000-000000000001'::uuid
             AND 'e1b00000-0000-4000-8000-000000000030'::uuid
ORDER BY id;


-- ============================================================================
-- POST-FLIGHT 4: Grupo escolar y conteo de miembros.
-- RESULTADO ESPERADO: 1 fila, type='school', miembros=30
-- ============================================================================

SELECT g.id, g.name, g.type, g.client_id, COUNT(gm.person_id) AS miembros
FROM public.groups g
LEFT JOIN public.group_members gm ON gm.group_id = g.id
WHERE g.id = 'e1a20000-0000-4000-8000-000000000001'
GROUP BY g.id, g.name, g.type, g.client_id;


-- ============================================================================
-- POST-FLIGHT 5: Jornada de medición y participantes.
-- RESULTADO ESPERADO: 1 fila, participantes=30
-- ============================================================================

SELECT mc.id, mc.title, mc.status, mc.client_id, mc.group_id,
       COUNT(mcp.id) AS participantes
FROM public.measurement_campaigns mc
LEFT JOIN public.measurement_campaign_participants mcp ON mcp.campaign_id = mc.id
WHERE mc.id = 'e1a30000-0000-4000-8000-000000000001'
GROUP BY mc.id, mc.title, mc.status, mc.client_id, mc.group_id;


-- ============================================================================
-- POST-FLIGHT 6: Sesiones de medidas por estado.
-- RESULTADO ESPERADO: draft=30 (si v_finalize_sessions=FALSE)
--                     completed=30 (si v_finalize_sessions=TRUE)
-- ============================================================================

SELECT status, COUNT(*) AS cantidad
FROM public.measurement_sessions
WHERE id BETWEEN 'e1c00000-0000-4000-8000-000000000001'::uuid
             AND 'e1c00000-0000-4000-8000-000000000030'::uuid
GROUP BY status
ORDER BY status;


-- ============================================================================
-- POST-FLIGHT 6b: Detalle de sesiones con alumno y valores.
-- RESULTADO ESPERADO: 30 filas, cada una con valores_medida=10
-- ============================================================================

SELECT ms.id AS session_id, ms.person_id, p.full_name, ms.campaign_id, ms.status,
       COUNT(mv.*) AS valores_medida
FROM public.measurement_sessions ms
JOIN public.persons p ON p.id = ms.person_id
LEFT JOIN public.measurement_values mv ON mv.session_id = ms.id
WHERE ms.id BETWEEN 'e1c00000-0000-4000-8000-000000000001'::uuid
                AND 'e1c00000-0000-4000-8000-000000000030'::uuid
GROUP BY ms.id, ms.person_id, p.full_name, ms.campaign_id, ms.status
ORDER BY ms.id;


-- ============================================================================
-- POST-FLIGHT 7: Total de valores de medición.
-- RESULTADO ESPERADO: total_valores = 300
-- ============================================================================

SELECT COUNT(*) AS total_valores
FROM public.measurement_values
WHERE session_id BETWEEN 'e1c00000-0000-4000-8000-000000000001'::uuid
                     AND 'e1c00000-0000-4000-8000-000000000030'::uuid;


-- ============================================================================
-- POST-FLIGHT 8: Creaciones por tipo de prenda y categoría demográfica.
-- RESULTADO ESPERADO: boy/pantalon=15, boy/camisa=15, girl/vestido=15
-- ============================================================================

SELECT p.demographic_category, c.garment_type, COUNT(*) AS cantidad
FROM public.creations c
JOIN public.persons p ON p.id = c.person_id
WHERE c.id BETWEEN 'e1e00000-0000-4000-8000-000000000001'::uuid
               AND 'e1e00000-0000-4000-8000-000000000045'::uuid
GROUP BY p.demographic_category, c.garment_type
ORDER BY p.demographic_category, c.garment_type;


-- ############################################################################
-- ##                                                                        ##
-- ##   SECCIÓN 3 — ROLLBACK CHECKS                                          ##
-- ##   Ejecutar ANTES del rollback para verificar que es seguro revertir.    ##
-- ##   Si alguna consulta devuelve un resultado inesperado, NO ejecutar      ##
-- ##   rollback_demo_colegio_30_alumnos.sql sin investigar primero.          ##
-- ##                                                                        ##
-- ############################################################################


-- ============================================================================
-- ROLLBACK CHECK 1: Estado de las 30 sesiones.
-- El rollback requiere que el 100% esté en 'draft'. Si alguna fue promovida
-- a 'completed', 'verified' o 'archived', el rollback abortará porque los
-- triggers de producción impiden DELETE sobre sesiones finalizadas.
-- RESULTADO ESPERADO: draft=30, sin otras filas
-- ============================================================================

SELECT status, COUNT(*) AS cantidad
FROM public.measurement_sessions
WHERE id BETWEEN 'e1c00000-0000-4000-8000-000000000001'::uuid
             AND 'e1c00000-0000-4000-8000-000000000030'::uuid
GROUP BY status
ORDER BY status;


-- ============================================================================
-- ROLLBACK CHECK 2: Dependencias CAD sobre creaciones y sesiones del demo.
-- Si existen pattern_executions vinculadas, deben eliminarse antes del rollback
-- para no violar las FKs.
-- RESULTADO ESPERADO: ejecuciones_cad_dependientes = 0
-- ============================================================================

SELECT COUNT(*) AS ejecuciones_cad_dependientes
FROM public.pattern_executions
WHERE creation_id BETWEEN 'e1e00000-0000-4000-8000-000000000001'::uuid
                      AND 'e1e00000-0000-4000-8000-000000000045'::uuid
   OR session_id BETWEEN 'e1c00000-0000-4000-8000-000000000001'::uuid
                     AND 'e1c00000-0000-4000-8000-000000000030'::uuid;


-- ============================================================================
-- ROLLBACK CHECK 3: Verificación del catálogo de medición (integridad).
-- Confirma que los 12 códigos siguen existiendo. Si algún código fue eliminado
-- del catálogo después de la carga, los measurement_values quedarían huérfanos.
-- RESULTADO ESPERADO: 0 filas (ningún código faltante)
-- ============================================================================

WITH expected(code) AS (
  VALUES ('estatura'), ('contorno_cuello'), ('contorno_busto'),
         ('contorno_cintura'), ('contorno_cadera'), ('ancho_hombros'),
         ('largo_talle_espalda'), ('largo_brazo'), ('profundidad_tiro'),
         ('largo_exterior_pierna'), ('largo_falda'), ('profundidad_cintura_cadera')
)
SELECT e.code AS codigo_faltante
FROM expected e
LEFT JOIN public.measurement_catalog mc ON mc.code = e.code
WHERE mc.code IS NULL
ORDER BY e.code;
