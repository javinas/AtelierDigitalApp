-- ==============================================================================
-- ATELIER DIGITAL — MIGRACIÓN: MÓDULO 02 · FASE 4
-- Archivo: supabase/migrations/20261026210000_creations_person_cad_flow.sql
-- ==============================================================================
-- Conecta las creaciones de alta costura directamente con la persona medida
-- (public.persons) sin alterar la relación comercial con el cliente responsable
-- (public.clients), soportando el flujo canónico:
-- PERSONA -> MEDICIÓN -> CREACIÓN -> PRENDA -> PATRÓN CAD -> EJECUCIÓN
-- ==============================================================================

BEGIN;

-- 1. Agregar columna person_id a creations (NULLABLE para compatibilidad retroactiva)
ALTER TABLE public.creations
    ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.creations.person_id IS 'Persona o sujeto medido destinatario de la prenda (opcional para encargos directos del cliente).';

-- 2. Índice para consultas optimizadas por persona
CREATE INDEX IF NOT EXISTS idx_creations_person_id ON public.creations(person_id);

-- 3. Índice compuesto para consultas por cliente y persona
CREATE INDEX IF NOT EXISTS idx_creations_client_person ON public.creations(client_id, person_id);

COMMIT;
