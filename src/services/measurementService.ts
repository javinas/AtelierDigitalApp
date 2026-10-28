// ==============================================================================
// ATELIER DIGITAL — SERVICIO: GESTIÓN DE SESIONES Y MEDIDAS (MÓDULO 02)
// Archivo: src/services/measurementService.ts
// ==============================================================================
// Gestiona la captura, consulta histórica y versionado de tomas de medidas
// corporales en Supabase, con soporte offline/fallback al catálogo nuclear.
// ==============================================================================

import { supabase } from '../supabase';
import {
    MeasurementCatalogItem,
    MeasurementConfidence,
    MeasurementSession,
    MeasurementSide,
    MeasurementSource,
    MeasurementUnit,
    MeasurementValueItem,
    SessionStatus,
} from '../types/pattern/measurement';
import { MASTER_MEASUREMENT_CATALOG, MEASUREMENT_MAP } from '../engine/pattern/catalog/masterCatalog';
import { cmToMm, inchToMm, mmToCm, mmToInch, roundTo } from '../engine/pattern/geometry/geometry2d';

export async function fetchMeasurementCatalog(): Promise<MeasurementCatalogItem[]> {
    try {
        const { data, error } = await supabase
            .from('measurement_catalog')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true });

        if (error || !data || data.length === 0) {
            // Fallback al catálogo maestro local garantizado
            return MASTER_MEASUREMENT_CATALOG;
        }

        return data as MeasurementCatalogItem[];
    } catch {
        return MASTER_MEASUREMENT_CATALOG;
    }
}

export async function fetchClientMeasurementSessions(
    clientId: string,
    includeDrafts: boolean = false
): Promise<MeasurementSession[]> {
    try {
        let query = supabase
            .from('measurement_sessions')
            .select('*')
            .eq('client_id', clientId);

        if (!includeDrafts) {
            query = query.neq('status', 'draft');
        }

        const { data: sessions, error: sessError } = await query
            .order('version_number', { ascending: false })
            .order('created_at', { ascending: false });

        if (sessError || !sessions) {
            return [];
        }

        // Cargar valores para cada sesión
        const sessionsWithValues: MeasurementSession[] = [];
        for (const sess of sessions) {
            const { data: values } = await supabase
                .from('measurement_values')
                .select('*')
                .eq('session_id', sess.id);

            const valuesMap: Record<string, MeasurementValueItem> = {};
            if (values) {
                for (const v of values) {
                    const side = (v.side as MeasurementSide) || 'none';
                    const item: MeasurementValueItem = {
                        id: v.id,
                        session_id: v.session_id,
                        measurement_code: v.measurement_code,
                        side,
                        value_mm: Number(v.value_mm),
                        source: v.source,
                        confidence: v.confidence,
                        notes: v.notes,
                        created_at: v.created_at,
                    };

                    if (side === 'none') {
                        valuesMap[v.measurement_code] = item;
                    } else {
                        valuesMap[`${v.measurement_code}_${side}`] = item;
                        if (!valuesMap[v.measurement_code]) {
                            valuesMap[v.measurement_code] = item;
                        }
                    }
                }
            }

            sessionsWithValues.push({
                ...sess,
                values: valuesMap,
            });
        }

        return sessionsWithValues;
    } catch (err) {
        console.warn('[MeasurementService] Error al consultar sesiones:', err);
        return [];
    }
}

export interface MeasurementInputRecord {
    value: number;
    side?: MeasurementSide;
    source?: MeasurementSource;
    confidence?: MeasurementConfidence;
    notes?: string;
}

export async function createMeasurementSession(
    clientId: string,
    unitSystem: MeasurementUnit,
    notes: string,
    rawValues: Record<string, number | MeasurementInputRecord>,
    status: SessionStatus = 'completed',
    versionNumber?: number,
    personId?: string | null
): Promise<{ success: boolean; session?: MeasurementSession; error?: string }> {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
            return {
                success: false,
                error: 'Usuario no autenticado para registrar medidas corporales.',
            };
        }

        // Si no se proporcionó versión, calcular la siguiente versión monótona consultando el historial de la clienta
        let resolvedVersion = versionNumber;
        if (!resolvedVersion || resolvedVersion < 1) {
            const { data: latestSess } = await supabase
                .from('measurement_sessions')
                .select('version_number')
                .eq('client_id', clientId)
                .order('version_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            resolvedVersion = (latestSess?.version_number || 0) + 1;
        }

        // 1. Normalizar valores individuales respetando lateralidad, procedencia y fiabilidad
        interface ProcessedValue {
            code: string;
            side: MeasurementSide;
            valMm: number;
            source: MeasurementSource;
            confidence: MeasurementConfidence;
            notes?: string | null;
        }

        const processedList: ProcessedValue[] = [];
        const seenCombos = new Set<string>();

        for (const [key, rawEntry] of Object.entries(rawValues)) {
            let valNum: number;
            let side: MeasurementSide = 'none';
            let source: MeasurementSource = 'direct';
            let confidence: MeasurementConfidence = 'confirmed';
            let itemNotes: string | null = null;
            let code = key;

            if (typeof rawEntry === 'number') {
                valNum = rawEntry;
                if (key.endsWith('_left')) {
                    code = key.slice(0, -5);
                    side = 'left';
                } else if (key.endsWith('_right')) {
                    code = key.slice(0, -6);
                    side = 'right';
                }
            } else if (rawEntry && typeof rawEntry === 'object') {
                valNum = rawEntry.value;
                side = rawEntry.side || (key.endsWith('_left') ? 'left' : key.endsWith('_right') ? 'right' : 'none');
                source = rawEntry.source || 'direct';
                confidence = rawEntry.confidence || 'confirmed';
                itemNotes = rawEntry.notes || null;
                if (key.endsWith('_left') || key.endsWith('_right')) {
                    code = key.replace(/_(left|right)$/, '');
                }
            } else {
                continue;
            }

            const cat = MEASUREMENT_MAP[code];
            const allowZero = cat?.scope === 'design_parameter' && cat.min_value_mm <= 0;

            if (valNum === undefined || valNum === null || isNaN(valNum) || (!allowZero && valNum <= 0)) {
                continue;
            }

            // Reglas de procedencia: medidas catalogadas como calculadas no pueden ser 'direct'
            if (cat?.is_calculated || cat?.scope === 'calculated') {
                source = 'calculated';
                if (confidence === 'confirmed') {
                    confidence = 'designer_approved';
                }
            } else if (source === 'estimated' && confidence === 'confirmed') {
                // Estimadas no pueden ser físicamente confirmadas
                confidence = 'preliminary';
            }

            // Convertir a mm
            let valMm = valNum;
            if (unitSystem === 'cm') valMm = cmToMm(valNum);
            else if (unitSystem === 'in') valMm = inchToMm(valNum);

            const comboKey = `${code}__${side}`;
            if (!seenCombos.has(comboKey)) {
                seenCombos.add(comboKey);
                processedList.push({
                    code,
                    side,
                    valMm: roundTo(valMm, 1),
                    source,
                    confidence,
                    notes: itemNotes,
                });
            }
        }

        // 2. Insertar sesión inicialmente en estado 'draft'
        // Esto garantiza que el trigger de inmutabilidad permita la inserción inicial de los valores
        // y que administradores o diseñadoras puedan capturar medidas progresivamente.
        const sessionInsertPayload: any = {
            client_id: clientId,
            session_date: new Date().toISOString().split('T')[0],
            taken_by: user.id,
            status: 'draft',
            unit_system: unitSystem,
            notes: notes.trim() || null,
            version_number: resolvedVersion,
        };
        if (personId) {
            sessionInsertPayload.person_id = personId;
        }

        const { data: session, error: sessError } = await supabase
            .from('measurement_sessions')
            .insert(sessionInsertPayload)
            .select()
            .single();

        if (sessError || !session) {
            return {
                success: false,
                error: sessError?.message || 'No se pudo crear la sesión de medidas.',
            };
        }

        // 3. Insertar valores individuales con su lateralidad y procedencia explícita
        const valueInserts = processedList.map((p) => ({
            session_id: session.id,
            measurement_code: p.code,
            side: p.side,
            value_mm: p.valMm,
            source: p.source,
            confidence: p.confidence,
            notes: p.notes,
        }));

        if (valueInserts.length > 0) {
            const { error: valError } = await supabase
                .from('measurement_values')
                .insert(valueInserts);

            if (valError) {
                console.warn('[MeasurementService] Error guardando valores individuales:', valError);
                // Limpiar la sesión draft recién creada para no dejar registros zombie vacíos
                await supabase.from('measurement_sessions').delete().eq('id', session.id);
                return {
                    success: false,
                    error: valError.message || 'Error al guardar los valores individuales.',
                };
            }
        }

        // 4. Si el estado solicitado es definitivo ('completed', 'verified', 'archived'),
        // promover la sesión de 'draft' a su estado final.
        let finalStatus = 'draft' as SessionStatus;
        if (status !== 'draft') {
            const { data: updatedSession, error: updateError } = await supabase
                .from('measurement_sessions')
                .update({ status })
                .eq('id', session.id)
                .select()
                .single();

            if (updateError) {
                console.warn('[MeasurementService] Error finalizando sesión:', updateError);
            } else if (updatedSession) {
                finalStatus = updatedSession.status as SessionStatus;
            }
        }

        return {
            success: true,
            session: {
                ...session,
                status: finalStatus,
                values: processedList.reduce((acc, p) => {
                    const item: MeasurementValueItem = {
                        session_id: session.id,
                        measurement_code: p.code,
                        side: p.side,
                        value_mm: p.valMm,
                        source: p.source,
                        confidence: p.confidence,
                        notes: p.notes,
                    };
                    if (p.side === 'none') {
                        acc[p.code] = item;
                    } else {
                        acc[`${p.code}_${p.side}`] = item;
                        if (!acc[p.code]) {
                            acc[p.code] = item;
                        }
                    }
                    return acc;
                }, {} as Record<string, MeasurementValueItem>),
            },
        };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Error inesperado al guardar sesión de medidas.',
        };
    }
}

/**
 * Crea una nueva versión de sesión para rectificaciones o pruebas posteriores,
 * preservando la sesión histórica anterior de forma inmutable.
 */
export async function createCorrectedMeasurementSession(
    previousSession: MeasurementSession,
    unitSystem: MeasurementUnit,
    notes: string,
    rawValues: Record<string, number | MeasurementInputRecord>,
    status: SessionStatus = 'completed'
): Promise<{ success: boolean; session?: MeasurementSession; error?: string }> {
    // Determinar la versión máxima existente para evitar duplicar versiones
    const { data: latestSess } = await supabase
        .from('measurement_sessions')
        .select('version_number')
        .eq('client_id', previousSession.client_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

    const maxVer = Math.max(previousSession.version_number || 1, latestSess?.version_number || 1);
    const nextVersion = maxVer + 1;

    const notesWithHistory = notes.trim()
        ? `${notes.trim()} (Rectificación v${nextVersion} basada en sesión previa v${previousSession.version_number})`
        : `Rectificación de medidas basada en sesión previa v${previousSession.version_number}`;

    return createMeasurementSession(
        previousSession.client_id,
        unitSystem,
        notesWithHistory,
        rawValues,
        status,
        nextVersion,
        previousSession.person_id || null
    );
}

/**
 * Finaliza formalmente una sesión que estaba en borrador ('draft'), bloqueándola para el motor.
 */
export async function finalizeMeasurementSession(
    sessionId: string,
    targetStatus: 'completed' | 'verified' = 'completed'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('measurement_sessions')
            .update({ status: targetStatus })
            .eq('id', sessionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Error al finalizar sesión.' };
    }
}

/**
 * Elimina de forma segura y auditada una sesión que se encuentra en borrador ('draft'),
 * respetando los triggers de inmutabilidad y eliminando sus valores residuales.
 */
export async function deleteDraftMeasurementSession(
    sessionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Verificar que la sesión exista y esté en estado 'draft'
        const { data: session, error: fetchErr } = await supabase
            .from('measurement_sessions')
            .select('id, status')
            .eq('id', sessionId)
            .single();

        if (fetchErr || !session) {
            return { success: false, error: 'Sesión no encontrada.' };
        }

        if (session.status !== 'draft') {
            return {
                success: false,
                error: `No es posible eliminar una sesión en estado \"${session.status}\". Solo se permite eliminar borradores.`,
            };
        }

        // 1. Eliminar valores residuales en measurement_values
        await supabase
            .from('measurement_values')
            .delete()
            .eq('session_id', sessionId);

        // 2. Desvincular de creaciones si estuviera referenciada
        await supabase
            .from('creations')
            .update({ session_id: null })
            .eq('session_id', sessionId);

        // 3. Eliminar la sesión en borrador
        const { error: delErr } = await supabase
            .from('measurement_sessions')
            .delete()
            .eq('id', sessionId);

        if (delErr) {
            return { success: false, error: delErr.message };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Error al eliminar sesión en borrador.' };
    }
}

export function convertMmToUnit(valueMm: number, targetUnit: MeasurementUnit): number {
    if (targetUnit === 'cm') return roundTo(mmToCm(valueMm), 1);
    if (targetUnit === 'in') return roundTo(mmToInch(valueMm), 2);
    return roundTo(valueMm, 1);
}

export function convertUnitToMm(value: number, sourceUnit: MeasurementUnit): number {
    if (sourceUnit === 'cm') return roundTo(cmToMm(value), 1);
    if (sourceUnit === 'in') return roundTo(inchToMm(value), 1);
    return roundTo(value, 1);
}
