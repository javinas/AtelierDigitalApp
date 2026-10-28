// ==============================================================================
// ATELIER DIGITAL — UTILIDAD: LINAJE Y AGRUPACIÓN DE PATRONES CAD DE CLIENTA
// Archivo: src/utils/clientPatternLineageHelper.ts
// ==============================================================================
// Provee la lógica canónica de agrupación conceptual:
// Prenda / Creación → Patrón Conceptual → Versiones / Ejecuciones → Linaje → Versión Vigente
// Resuelve la ontología:
// 1. Patrón: Unidad conceptual de diseño y patronaje para la clienta.
// 2. Versión: Revisión específica en el árbol de linaje (v1.0, v1.1, etc.).
// 3. Ejecución: Fila inmutable en pattern_executions (snapshot de motor CAD).
// 4. Linaje: Cadena padre-hijo mediante parent_execution_id.
// 5. Patrón Vigente: La última versión válida de cada linaje que no ha sido reemplazada.
// 6. Patrón Histórico: Versiones anteriores conservadas para trazabilidad inmutable.
// ==============================================================================

import { Creation } from '../types/creation';
import { GarmentType, PatternExecution, PatternStatus } from '../types/pattern/pattern';

export interface ConceptualPatternGroup {
    /** Identificador único del grupo (ID de creación o clave de patronaje directo) */
    id: string;
    /** Clave de agrupación */
    key: string;
    /** Tipo de prenda */
    garmentType: GarmentType;
    /** ID de la creación vinculada, si existe */
    creationId: string | null;
    /** Nombre de la creación vinculada, si existe */
    creationName: string | null;
    /** Indica si es un patrón independiente (sin creación) */
    isIndependent: boolean;
    /** La versión activa / vigente de este patrón */
    activeExecution: PatternExecution;
    /** Lista de todas las ejecuciones de este linaje ordenadas cronológicamente descendente (más reciente primero) */
    executions: PatternExecution[];
    /** Total de versiones / ejecuciones en este linaje */
    totalVersions: number;
    /** Estado del patrón vigente */
    status: PatternStatus;
    /** Indica si la versión vigente está aprobada por la diseñadora */
    isApproved: boolean;
    /** Raíz original del árbol de linaje */
    rootExecution: PatternExecution;
}

export interface ClientPatternSummaryStats {
    /** Total de patrones conceptuales distintos */
    patternsCount: number;
    /** Total de versiones / ejecuciones técnicas registradas */
    totalExecutionsCount: number;
    /** Total de patrones vigentes / activos (1 por cada linaje válido) */
    activePatternsCount: number;
    /** Total de patrones aprobados para corte final */
    approvedPatternsCount: number;
}

/**
 * Agrupa una lista plana de ejecuciones de patrón de una clienta en patrones conceptuales con linaje.
 */
export function groupClientPatternsByLineage(
    patterns: PatternExecution[],
    creations: Creation[] = []
): ConceptualPatternGroup[] {
    if (!patterns || patterns.length === 0) return [];

    const creationMap = new Map<string, Creation>();
    creations.forEach((c) => creationMap.set(c.id, c));

    // Mapa rápido de ejecuciones por ID
    const executionMap = new Map<string, PatternExecution>();
    patterns.forEach((p) => executionMap.set(p.id, p));

    // Mapa de grupos intermedios
    const groupsMap = new Map<string, {
        garmentType: GarmentType;
        creationId: string | null;
        creationName: string | null;
        isIndependent: boolean;
        executions: PatternExecution[];
    }>();

    // 1. Asignar cada ejecución a su grupo conceptual
    for (const p of patterns) {
        let groupKey: string;
        let cId: string | null = p.creation_id || null;
        let cName: string | null = null;
        let isIndep = true;

        if (cId) {
            // Vinculado a Creación
            groupKey = `creation_${cId}`;
            const linkedCreation = creationMap.get(cId) || (p.creation as Creation | undefined);
            cName = linkedCreation?.name || (p.creation ? p.creation.name : 'Creación vinculada');
            isIndep = false;
        } else {
            // Patrón Independiente / Patronaje Directo:
            // Agrupar por la raíz del árbol de linaje si tiene ancestros
            const rootId = resolveRootExecutionId(p, executionMap);
            groupKey = `direct_${p.garment_type}_${rootId}`;
        }

        if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, {
                garmentType: p.garment_type,
                creationId: cId,
                creationName: cName,
                isIndependent: isIndep,
                executions: [],
            });
        }

        groupsMap.get(groupKey)!.executions.push(p);
    }

    // 2. Consolidar grupos independientes del mismo tipo de prenda si comparten linaje o contexto
    // (Por ejemplo, dos generaciones directas de la misma prenda sin creación)
    const consolidatedList: ConceptualPatternGroup[] = [];

    groupsMap.forEach((grp, key) => {
        // Ordenar ejecuciones: más reciente primero (por created_at descendente)
        const sorted = [...grp.executions].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return timeB - timeA;
        });

        // Determinar la versión vigente / activa del linaje
        // A. Si una creación define explícitamente active_pattern_execution_id
        let activeExec: PatternExecution | undefined;
        if (grp.creationId && creationMap.has(grp.creationId)) {
            const cr = creationMap.get(grp.creationId)!;
            if (cr.active_pattern_execution_id) {
                activeExec = sorted.find((e) => e.id === cr.active_pattern_execution_id);
            }
        }

        // B. Si no se encontró por creación, buscar la versión más reciente aprobada
        if (!activeExec) {
            activeExec = sorted.find((e) => e.status === 'approved_by_designer');
        }

        // C. Si ninguna está aprobada, la versión más reciente en la punta del árbol es la vigente
        if (!activeExec) {
            activeExec = sorted[0];
        }

        // Determinar la raíz original del linaje (la más antigua o sin parent_execution_id)
        const rootExec = sorted.find((e) => !e.parent_execution_id) || sorted[sorted.length - 1];

        consolidatedList.push({
            id: key,
            key,
            garmentType: grp.garmentType,
            creationId: grp.creationId,
            creationName: grp.creationName,
            isIndependent: grp.isIndependent,
            activeExecution: activeExec,
            executions: sorted,
            totalVersions: sorted.length,
            status: activeExec.status,
            isApproved: activeExec.status === 'approved_by_designer',
            rootExecution: rootExec,
        });
    });

    // Ordenar los patrones conceptuales: más recientes primero
    return consolidatedList.sort((a, b) => {
        const timeA = new Date(a.activeExecution.created_at).getTime();
        const timeB = new Date(b.activeExecution.created_at).getTime();
        return timeB - timeA;
    });
}

/**
 * Calcula las estadísticas resumidas para la ficha de la clienta.
 */
export function calculateClientPatternStats(
    patterns: PatternExecution[],
    creations: Creation[] = []
): ClientPatternSummaryStats {
    const groups = groupClientPatternsByLineage(patterns, creations);

    const patternsCount = groups.length;
    const totalExecutionsCount = patterns.length;
    const activePatternsCount = groups.filter((g) => Boolean(g.activeExecution)).length;
    const approvedPatternsCount = groups.filter((g) => g.isApproved).length;

    return {
        patternsCount,
        totalExecutionsCount,
        activePatternsCount,
        approvedPatternsCount,
    };
}

/**
 * Resuelve el ID de la ejecución raíz siguiendo la cadena parent_execution_id.
 */
export function resolveRootExecutionId(
    exec: PatternExecution,
    map: Map<string, PatternExecution>
): string {
    let curr = exec;
    const visited = new Set<string>([curr.id]);

    while (curr.parent_execution_id && map.has(curr.parent_execution_id)) {
        const parent = map.get(curr.parent_execution_id)!;
        if (visited.has(parent.id)) break; // Prevención de ciclos
        visited.add(parent.id);
        curr = parent;
    }

    return curr.id;
}

/**
 * Construye la cadena de linaje completa y ordenada de un patrón inspeccionado.
 * Retorna [raíz, hijo_1, ..., hoja_actual].
 */
export function buildLineagePath(
    target: PatternExecution,
    allExecutions: PatternExecution[]
): PatternExecution[] {
    const map = new Map<string, PatternExecution>();
    allExecutions.forEach((e) => map.set(e.id, e));

    // 1. Buscar hacia atrás (ancestros)
    const ancestors: PatternExecution[] = [];
    let curr = target;
    const visited = new Set<string>([curr.id]);

    while (curr.parent_execution_id && map.has(curr.parent_execution_id)) {
        const parent = map.get(curr.parent_execution_id)!;
        if (visited.has(parent.id)) break;
        visited.add(parent.id);
        ancestors.unshift(parent);
        curr = parent;
    }

    // 2. Buscar hacia adelante (descendientes de target)
    const descendants: PatternExecution[] = [];
    const queue = [target.id];
    const visitedDesc = new Set<string>([target.id]);

    while (queue.length > 0) {
        const parentId = queue.shift()!;
        const children = allExecutions.filter((e) => e.parent_execution_id === parentId);
        for (const child of children) {
            if (!visitedDesc.has(child.id)) {
                visitedDesc.add(child.id);
                descendants.push(child);
                queue.push(child.id);
            }
        }
    }

    return [...ancestors, target, ...descendants];
}

export interface GlobalPatternCadGroup {
    /** Identificador único del grupo (e.g. creation_xxx, direct_xxx, free_xxx) */
    id: string;
    key: string;
    /** Tipo de prenda */
    garmentType: GarmentType;
    /** Nombre formal de alta costura */
    patternTitle: string;
    /** Creación vinculada */
    creationId: string | null;
    creationName: string | null;
    creationStatus?: string | null;
    creationPhotoUrl?: string | null;
    /** Clienta vinculada */
    clientId: string | null;
    clientName: string | null;
    clientEmail?: string | null;
    clientCity?: string | null;
    /** Clasificación canónica de origen */
    originType: 'creation' | 'direct' | 'free';
    badgeText: string;
    badgeColor: string;
    badgeBg: string;
    isFree: boolean;
    isDirect: boolean;
    isCreation: boolean;
    isDerived: boolean;
    /** Versión activa / vigente */
    activeExecution: PatternExecution;
    /** Raíz original del linaje */
    rootExecution: PatternExecution;
    /** Todas las ejecuciones históricas del patrón (orden cronológico descendente) */
    executions: PatternExecution[];
    /** Total de ejecuciones técnicas históricas (e.g. 16) */
    totalExecutions: number;
    /** Total de versiones / revisiones distintas (e.g. 2: v1.0 y v1.1) */
    totalVersions: number;
    /** Desglose de versiones para el timeline/historial */
    versionNodes: {
        versionLabel: string;
        isCurrent: boolean;
        isApproved: boolean;
        status: PatternStatus;
        date: string;
        description: string;
        execution: PatternExecution;
        preliminaryCount: number;
    }[];
    /** Estado vigente */
    status: PatternStatus;
    /** Aprobado formalmente */
    isApproved: boolean;
    /** Conteo de piezas geométricas CAD */
    piecesCount: number;
    /** Fecha de última actualización */
    updatedAt: string;
}

export interface GlobalPatternBankStats {
    /** Total de patrones CAD lógicos (entidades únicas de diseño) */
    logicalPatternsCount: number;
    /** Total de ejecuciones técnicas históricas del motor CAD */
    totalExecutionsCount: number;
    /** Patrones con versión vigente aprobada */
    approvedCount: number;
    /** Patrones con versión vigente en fitting */
    fittingCount: number;
    /** Patrones vinculados a una creación */
    withCreationCount: number;
    /** Patrones de patronaje directo con clienta sin creación */
    directCount: number;
    /** Patrones libres experimentales sin clienta */
    freeCount: number;
    /** Patrones con linaje derivado de fitting */
    derivedCount: number;
}

const CANONICAL_GARMENT_TITLES: Record<string, string> = {
    jacket: 'Chaqueta Sastre de Alta Costura',
    corset: 'Corset Haute Couture',
    bodice: 'Corpiño Base de Alta Costura',
    coat: 'Abrigo Sastre Estructurado',
    dress: 'Vestido de Alta Costura',
    skirt: 'Falda Sastre de Atelier',
    pants: 'Pantalón Sastre Haute Couture',
    blouse: 'Blusa de Seda Estructurada',
    shirt: 'Camisa Clásica de Atelier',
    sleeve: 'Manga Sastre Dos Piezas',
};

/**
 * Agrupa la totalidad de ejecuciones técnicas del Banco Global en Patrones CAD Lógicos.
 * Respeta la jerarquía canónica: CREACIÓN → PATRÓN CAD LÓGICO → VERSIÓN / REVISIÓN → EJECUCIÓN TÉCNICA.
 * Nunca convierte ejecuciones históricas en patrones independientes.
 */
export function groupGlobalPatternsByLineage(
    executions: PatternExecution[],
    creations: Creation[] = []
): GlobalPatternCadGroup[] {
    if (!executions || executions.length === 0) return [];

    const creationMap = new Map<string, Creation>();
    creations.forEach((c) => creationMap.set(c.id, c));

    const executionMap = new Map<string, PatternExecution>();
    executions.forEach((e) => executionMap.set(e.id, e));

    const groupsMap = new Map<string, PatternExecution[]>();

    for (const exec of executions) {
        let key: string;
        if (exec.creation_id) {
            key = `creation_${exec.creation_id}`;
        } else if (exec.client_id) {
            const rootId = resolveRootExecutionId(exec, executionMap);
            key = `direct_${exec.client_id}_${exec.garment_type}_${rootId}`;
        } else {
            const rootId = resolveRootExecutionId(exec, executionMap);
            key = `free_${exec.garment_type}_${rootId}`;
        }

        if (!groupsMap.has(key)) {
            groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(exec);
    }

    const logicalPatterns: GlobalPatternCadGroup[] = [];

    groupsMap.forEach((execs, key) => {
        // Ordenar más reciente primero
        const sorted = [...execs].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return timeB - timeA;
        });

        const first = sorted[0];
        const garmentType = first.garment_type;
        const creationId = first.creation_id || null;
        const linkedCreation = creationId ? creationMap.get(creationId) || (first.creation as Creation | undefined) : null;
        const creationName = linkedCreation?.name || (first.creation ? first.creation.name : null);
        const creationStatus = linkedCreation?.status || (first.creation ? (first.creation as any).status : null);
        const creationPhotoUrl = (linkedCreation as any)?.photo_url || (first.creation as any)?.photo_url || null;

        const clientId = first.client_id || null;
        const clientName = first.client?.full_name || (clientId ? 'Clienta no determinada' : null);
        const clientEmail = first.client?.email || null;
        const clientCity = first.client?.city || null;

        const isFree = !clientId;
        const isDirect = Boolean(clientId) && !creationId;
        const isCreation = Boolean(creationId);
        const isDerived = sorted.some((e) => Boolean(e.parent_execution_id));

        let originType: 'creation' | 'direct' | 'free' = 'free';
        let badgeText = 'PATRÓN LIBRE';
        let badgeColor = '#6A1B9A';
        let badgeBg = '#F3E5F5';

        if (isCreation) {
            originType = 'creation';
            badgeText = isDerived ? 'CREACIÓN · DERIVADO' : 'CREACIÓN';
            badgeColor = isDerived ? '#B37D14' : '#8A5D10';
            badgeBg = isDerived ? '#FFF8E7' : '#FDF6E2';
        } else if (isDirect) {
            originType = 'direct';
            badgeText = isDerived ? 'PATRONAJE DIRECTO · DERIVADO' : 'PATRONAJE DIRECTO';
            badgeColor = isDerived ? '#2E7D32' : '#4A5568';
            badgeBg = isDerived ? '#E8F5E9' : '#EDF2F7';
        }

        // Determinar versión activa / vigente
        let activeExec: PatternExecution | undefined;
        if (creationId && linkedCreation?.active_pattern_execution_id) {
            activeExec = sorted.find((e) => e.id === linkedCreation.active_pattern_execution_id);
        }
        if (!activeExec) {
            activeExec = sorted.find((e) => e.status === 'approved_by_designer');
        }
        if (!activeExec) {
            activeExec = sorted.find((e) => e.status === 'pending_fitting');
        }
        if (!activeExec) {
            activeExec = sorted[0];
        }

        const rootExec = sorted.find((e) => !e.parent_execution_id) || sorted[sorted.length - 1];

        // Desglose de nodos de versión
        const versionMap = new Map<string, PatternExecution[]>();
        sorted.forEach((e) => {
            const vLabel = e.version_label || 'v1.0';
            if (!versionMap.has(vLabel)) {
                versionMap.set(vLabel, []);
            }
            versionMap.get(vLabel)!.push(e);
        });

        const versionNodes = Array.from(versionMap.entries()).map(([vLabel, vExecs]) => {
            const latest = vExecs[0];
            const isCurrent = latest.id === activeExec!.id || vExecs.some((x) => x.id === activeExec!.id);
            const isApproved = latest.status === 'approved_by_designer' || vExecs.some((x) => x.status === 'approved_by_designer');

            let description = 'Trazado base';
            if (isCurrent && isApproved) {
                description = 'Revisión aprobada y vigente · Lista para producción';
            } else if (latest.parent_execution_id) {
                description = 'Revisión derivada de fitting';
            } else if (latest.status === 'pending_fitting') {
                description = 'Trazado base · En prueba de vestuario';
            }

            return {
                versionLabel: vLabel,
                isCurrent,
                isApproved,
                status: latest.status,
                date: latest.created_at,
                description,
                execution: latest,
                preliminaryCount: vExecs.length,
            };
        });

        const patternTitle = CANONICAL_GARMENT_TITLES[garmentType] || `${garmentType.toUpperCase()} DE ALTA COSTURA`;
        const piecesCount = activeExec.geometry_result?.pieces?.length || 0;

        logicalPatterns.push({
            id: key,
            key,
            garmentType,
            patternTitle,
            creationId,
            creationName,
            creationStatus,
            creationPhotoUrl,
            clientId,
            clientName,
            clientEmail,
            clientCity,
            originType,
            badgeText,
            badgeColor,
            badgeBg,
            isFree,
            isDirect,
            isCreation,
            isDerived,
            activeExecution: activeExec,
            rootExecution: rootExec,
            executions: sorted,
            totalExecutions: sorted.length,
            totalVersions: versionNodes.length,
            versionNodes,
            status: activeExec.status,
            isApproved: activeExec.status === 'approved_by_designer',
            piecesCount,
            updatedAt: activeExec.created_at,
        });
    });

    return logicalPatterns.sort((a, b) => {
        const timeA = new Date(a.activeExecution.created_at).getTime();
        const timeB = new Date(b.activeExecution.created_at).getTime();
        return timeB - timeA;
    });
}

/**
 * Calcula las estadísticas globales distinguiendo Patrones CAD de Ejecuciones Técnicas.
 */
export function calculateGlobalPatternStats(
    patterns: GlobalPatternCadGroup[],
    rawExecutionsCount: number
): GlobalPatternBankStats {
    const logicalPatternsCount = patterns.length;
    const totalExecutionsCount = rawExecutionsCount;
    const approvedCount = patterns.filter((p) => p.isApproved).length;
    const fittingCount = patterns.filter((p) => p.status === 'pending_fitting').length;
    const withCreationCount = patterns.filter((p) => p.isCreation).length;
    const directCount = patterns.filter((p) => p.isDirect).length;
    const freeCount = patterns.filter((p) => p.isFree).length;
    const derivedCount = patterns.filter((p) => p.isDerived).length;

    return {
        logicalPatternsCount,
        totalExecutionsCount,
        approvedCount,
        fittingCount,
        withCreationCount,
        directCount,
        freeCount,
        derivedCount,
    };
}
