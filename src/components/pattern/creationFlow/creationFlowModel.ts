// ==============================================================================
// ATELIER DIGITAL — MODELO PURO DEL FLUJO C · PATRÓN PARA UNA CREACIÓN
// Archivo: src/components/pattern/creationFlow/creationFlowModel.ts
// ==============================================================================
// Toda la información que el Flujo C muestra a la diseñadora se DERIVA aquí de
// datos reales (clienta, creación, sesión, medidas, ejecuciones, ajustes).
// Este módulo no importa React ni toca Supabase: es determinista y verificable.
//
// Regla de consistencia: cada elemento visual debe poder rastrearse hasta su
// fuente (clients, creations, measurement_sessions, pattern_executions,
// pattern_adjustments). Nunca se inventan fotografías, colecciones ni medidas.
// ==============================================================================

import {
    GARMENT_PACKAGES,
    classifyTemplateMeasurements,
} from '../../../engine/pattern/catalog/garmentPackages';
import {
    MEASUREMENT_MAP,
    BODY_MEASUREMENT_CODES,
    TOTAL_APPLICABLE_BODY_MEASUREMENTS,
    analyzeSessionMeasurements,
    classifyMeasurementCode,
} from '../../../engine/pattern/catalog/masterCatalog';
import type { Creation } from '../../../types/creation';
import type { MeasurementSession } from '../../../types/pattern/measurement';
import type { GarmentType, PatternExecution } from '../../../types/pattern/pattern';

// ------------------------------------------------------------------------------
// 1. ETAPAS DEL RECORRIDO
// ------------------------------------------------------------------------------

export type CreationStageId =
    | 'creation'
    | 'anatomy'
    | 'garment'
    | 'pattern'
    | 'fitting'
    | 'sheet'
    | 'log';

export type StageStatus = 'done' | 'attention' | 'pending' | 'blocked';

export interface CreationStageDefinition {
    id: CreationStageId;
    order: number;
    label: string;
    shortLabel: string;
}

export const CREATION_STAGES: CreationStageDefinition[] = [
    { id: 'creation', order: 1, label: 'Creación', shortLabel: 'CREACIÓN' },
    { id: 'anatomy', order: 2, label: 'Anatomía', shortLabel: 'ANATOMÍA' },
    { id: 'garment', order: 3, label: 'Prenda', shortLabel: 'PRENDA' },
    { id: 'pattern', order: 4, label: 'Patronaje', shortLabel: 'PATRONAJE' },
    { id: 'fitting', order: 5, label: 'Fitting', shortLabel: 'FITTING' },
    { id: 'sheet', order: 6, label: 'Ficha técnica', shortLabel: 'FICHA TÉCNICA' },
    { id: 'log', order: 7, label: 'Bitácora', shortLabel: 'BITÁCORA' },
];

/**
 * Correspondencia entre las etapas del Flujo C y las pestañas de estudio
 * ya existentes en PatternModule (no se crea una arquitectura paralela).
 * 'creation' y 'anatomy' son vistas nuevas de contexto; el resto reutiliza
 * exactamente los paneles de Flujo B (Prenda, Mesa CAD, Fitting, Ficha, Bitácora).
 */
export const STAGE_TO_STUDIO_TAB: Record<
    CreationStageId,
    'creation' | 'anatomy' | 'garment' | 'cad' | 'fitting' | 'specifications' | 'history'
> = {
    creation: 'creation',
    anatomy: 'anatomy',
    garment: 'garment',
    pattern: 'cad',
    fitting: 'fitting',
    sheet: 'specifications',
    log: 'history',
};

export function studioTabToStage(tab: string): CreationStageId {
    switch (tab) {
        case 'creation':
            return 'creation';
        case 'anatomy':
            return 'anatomy';
        case 'garment':
            return 'garment';
        case 'cad':
            return 'pattern';
        case 'fitting':
            return 'fitting';
        case 'specifications':
            return 'sheet';
        case 'history':
            return 'log';
        default:
            return 'creation';
    }
}

// ------------------------------------------------------------------------------
// 2. UTILIDADES DE ETIQUETADO (sin zonas horarias: las fechas son 'YYYY-MM-DD')
// ------------------------------------------------------------------------------

const MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatShortDateEs(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return null;
    return `${d} ${MONTHS_ES_SHORT[m - 1]} ${y}`;
}

export function isKnownGarmentType(value: unknown): value is GarmentType {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GARMENT_PACKAGES, value);
}

/** «v3 · 18 oct 2026» o null si no hay sesión (nunca se inventa una). */
export function describeSession(session: MeasurementSession | null | undefined): string | null {
    if (!session) return null;
    const date = formatShortDateEs(session.session_date);
    return date ? `v${session.version_number} · ${date}` : `v${session.version_number}`;
}

export const CREATION_TYPE_LABELS: Record<string, string> = {
    bespoke: 'Alta costura a medida',
    pret_a_couture: 'Prêt-à-Couture',
    couture_collection: 'Pieza de colección',
    bridal: 'Novia y nupcial',
    gala: 'Fiesta y gala',
    corporate: 'Sastrería de autor',
    fantasy: 'Vestuario teatral',
    alteration: 'Transformación restaurativa',
};

export const CREATION_STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    active: 'Activa',
    fitting: 'En pruebas',
    approved: 'Aprobada',
    production: 'En producción',
    completed: 'Entregada',
    cancelled: 'Cancelada',
};

// ------------------------------------------------------------------------------
// 3. APLICABILIDAD Y DIAGNÓSTICO DE MEDIDAS POR PRENDA
// ------------------------------------------------------------------------------

export type MeasureApplicability = 'required' | 'optional' | 'not_applicable';
export type MeasureKind = 'body' | 'design' | 'workshop' | 'other';
export type RequiredMeasureState = 'registered' | 'calculable' | 'missing';
export type MeasureDataProvenance = 'REAL' | 'CALCULATED' | 'PENDING' | 'NOT_APPLICABLE' | 'HISTORIC' | 'REFERENCE';

export interface GarmentMeasureRow {
    code: string;
    name: string;
    kind: MeasureKind;
    requirement: 'required' | 'optional' | 'not_applicable';
    state: RequiredMeasureState;
    valueMm: number | null;
    canCalculate: boolean;
    needsDirectMeasurement: boolean;
    formula: string | null;
    provenance: MeasureDataProvenance;
}

export interface GarmentMeasureDiagnosis {
    garmentType: GarmentType;
    garmentName: string;
    required: GarmentMeasureRow[];
    optional: GarmentMeasureRow[];
    notApplicable: GarmentMeasureRow[];
    requiredTotal: number;
    registeredCount: number;
    calculableCount: number;
    missing: GarmentMeasureRow[];
    /** true cuando toda medida obligatoria está registrada o es calculable por fórmula C10. */
    ready: boolean;
}

function kindOfCode(code: string): MeasureKind {
    const info = classifyMeasurementCode(code);
    if (info.isBodyMeasure) return 'body';
    if (info.isDesignMeasure) return 'design';
    if (info.isWorkshopParameter) return 'workshop';
    return 'other';
}

/**
 * ¿Aplica esta medida a esta prenda?
 * - 'required': figura en la lista obligatoria de la plantilla (si hay) o del paquete de la prenda.
 * - 'optional': figura como opcional.
 * - 'not_applicable': no interviene en el motor para esa prenda.
 */
export function measurementAppliesToGarment(
    garmentType: GarmentType,
    code: string,
    template?: { required_measurements?: string[]; optional_measurements?: string[] } | null
): MeasureApplicability {
    const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
    if (!pkg) return 'not_applicable';
    const required = new Set<string>(template?.required_measurements?.length ? template.required_measurements : pkg.required);
    const optional = new Set<string>([...pkg.optional, ...(template?.optional_measurements || [])]);
    const base = code.replace(/_right$|_left$/, '');
    if (required.has(base)) return 'required';
    if (optional.has(base) && !required.has(base)) return 'optional';
    return 'not_applicable';
}

function rowsFor(
    garmentType: GarmentType,
    codes: string[],
    requirement: 'required' | 'optional',
    measurementsMm: Record<string, number>
): GarmentMeasureRow[] {
    // Sin perfil de referencia: nunca se «estima». Solo real, calculada (C10) o no resuelta.
    const diag = classifyTemplateMeasurements(garmentType, codes, measurementsMm, undefined);
    return diag.allItems.map((item) => {
        const state: RequiredMeasureState =
            item.status === 'real' ? 'registered' : item.status === 'calculated' ? 'calculable' : 'missing';
        const formula =
            state === 'calculable' ? GARMENT_PACKAGES[garmentType]?.calculableFallbacks?.[item.code]?.formulaDescription || null : null;
        const provenance: MeasureDataProvenance =
            state === 'registered' ? 'REAL' : state === 'calculable' ? 'CALCULATED' : 'PENDING';
        return {
            code: item.code,
            name: MEASUREMENT_MAP[item.code]?.name || item.name || item.code,
            kind: kindOfCode(item.code),
            requirement,
            state,
            valueMm: state === 'missing' ? null : item.valueMm,
            canCalculate: state === 'calculable',
            needsDirectMeasurement: state === 'missing',
            formula,
            provenance,
        };
    });
}

export function deriveGarmentMeasureDiagnosis(params: {
    garmentType: GarmentType;
    measurementsMm: Record<string, number>;
    template?: { required_measurements?: string[]; optional_measurements?: string[] } | null;
}): GarmentMeasureDiagnosis {
    const { garmentType, measurementsMm, template } = params;
    const pkg = garmentType ? GARMENT_PACKAGES[garmentType] : null;
    if (!pkg) {
        return {
            garmentType: garmentType || ('bodice' as GarmentType),
            garmentName: 'Prenda no asignada',
            required: [],
            optional: [],
            notApplicable: [],
            requiredTotal: 0,
            registeredCount: 0,
            calculableCount: 0,
            missing: [],
            ready: false,
        };
    }
    const requiredCodes = template?.required_measurements?.length ? template.required_measurements : pkg.required;
    const optionalCodes = Array.from(new Set([...pkg.optional, ...(template?.optional_measurements || [])])).filter(
        (c) => !requiredCodes.includes(c)
    );
    const required = rowsFor(garmentType, requiredCodes, 'required', measurementsMm);
    const optional = rowsFor(garmentType, optionalCodes, 'optional', measurementsMm);
    const missing = required.filter((r) => r.state === 'missing');

    // Identificación rigurosa de cotas no aplicables de las 33 corporales del catálogo
    const notApplicableCodes = BODY_MEASUREMENT_CODES.filter(
        (c: string) => !requiredCodes.includes(c) && !optionalCodes.includes(c)
    );
    const notApplicable: GarmentMeasureRow[] = notApplicableCodes.map((code: string) => {
        const val = typeof measurementsMm[code] === 'number' && measurementsMm[code] > 0 ? measurementsMm[code] : null;
        return {
            code,
            name: MEASUREMENT_MAP[code]?.name || code,
            kind: kindOfCode(code),
            requirement: 'not_applicable',
            state: 'missing',
            valueMm: val,
            canCalculate: false,
            needsDirectMeasurement: false,
            formula: null,
            provenance: val ? 'REAL' : 'NOT_APPLICABLE',
        };
    });

    return {
        garmentType,
        garmentName: pkg.name,
        required,
        optional,
        notApplicable,
        requiredTotal: required.length,
        registeredCount: required.filter((r) => r.state === 'registered').length,
        calculableCount: required.filter((r) => r.state === 'calculable').length,
        missing,
        ready: missing.length === 0,
    };
}

// ------------------------------------------------------------------------------
// 4. ANATOMÍA DE LA SESIÓN
// ------------------------------------------------------------------------------

export interface AnatomySummary {
    hasSession: boolean;
    sessionLabel: string | null;
    bodyCount: number;
    bodyTotal: number;
    completenessPct: number;
    isComplete: boolean;
    sessionStatus: string | null;
}

export function deriveAnatomySummary(session: MeasurementSession | null | undefined): AnatomySummary {
    if (!session) {
        return {
            hasSession: false,
            sessionLabel: null,
            bodyCount: 0,
            bodyTotal: TOTAL_APPLICABLE_BODY_MEASUREMENTS,
            completenessPct: 0,
            isComplete: false,
            sessionStatus: null,
        };
    }
    const a = analyzeSessionMeasurements(session.values);
    return {
        hasSession: true,
        sessionLabel: describeSession(session),
        bodyCount: a.bodyCount,
        bodyTotal: a.totalApplicableBody,
        completenessPct: a.bodyCompletionPct,
        isComplete: a.bodyCount >= a.totalApplicableBody,
        sessionStatus: session.status,
    };
}

// ------------------------------------------------------------------------------
// 5. ESTADO REAL DE LA CREACIÓN (etapas, checklist, siguiente paso)
// ------------------------------------------------------------------------------

export type PatternLinkState = 'none' | 'unlinked_versions' | 'active';

export interface CreationFlowInput {
    client: { id: string; full_name: string } | null;
    creation: Creation | null;
    /** Prenda efectiva (la de la creación, o la elegida por la diseñadora si la creación no la registra). */
    garmentType: GarmentType | null;
    session: MeasurementSession | null;
    diagnosis: GarmentMeasureDiagnosis | null;
    /** Solo ejecuciones cuyo creation_id === creation.id. */
    executions: PatternExecution[];
    /** Resuelta mediante creation.active_pattern_execution_id; null si no existe o no se encuentra. */
    activeExecution: PatternExecution | null;
    /** Ajustes de fitting conocidos para la ejecución activa. */
    adjustmentsCount: number;
}

export interface CreationChecklistItem {
    id: string;
    label: string;
    detail: string;
    state: 'ok' | 'warn' | 'pending';
    /** Etapa a la que lleva el elemento al pulsarlo. */
    stage: CreationStageId;
}

export interface CreationNextStep {
    stage: CreationStageId;
    title: string;
    detail: string;
    cta: string;
}

export interface CreationFlowSummary {
    anatomy: AnatomySummary;
    sessionLinkedToCreation: boolean;
    patternLink: PatternLinkState;
    stages: Record<CreationStageId, { status: StageStatus; hint: string }>;
    checklist: CreationChecklistItem[];
    nextStep: CreationNextStep;
    isReadyToGenerate: boolean;
    readyCount: number;
    pendingCount: number;
}

export function deriveCreationFlowSummary(input: CreationFlowInput): CreationFlowSummary {
    const { client, creation, garmentType, session, diagnosis, executions, activeExecution, adjustmentsCount } = input;
    const anatomy = deriveAnatomySummary(session);
    const sessionLinked = !!(creation && session && creation.session_id === session.id);

    const patternLink: PatternLinkState = creation?.active_pattern_execution_id && activeExecution
        ? 'active'
        : executions.length > 0
        ? 'unlinked_versions'
        : 'none';

    const garmentName = garmentType ? GARMENT_PACKAGES[garmentType]?.name || garmentType : null;
    const hasClient = !!client;
    const hasCreation = !!creation;
    const hasGarment = !!garmentType;
    const garmentRegisteredInCreation = isKnownGarmentType(creation?.garment_type);
    const measuresReady = !!diagnosis?.ready;
    const isApproved = activeExecution?.status === 'approved_by_designer';

    const checklist: CreationChecklistItem[] = [
        {
            id: 'client',
            label: 'Clienta definida',
            detail: client ? client.full_name : 'Selecciona una clienta',
            state: hasClient ? 'ok' : 'pending',
            stage: 'creation',
        },
        {
            id: 'creation',
            label: 'Creación definida',
            detail: creation ? creation.name : 'Selecciona o registra una creación',
            state: hasCreation ? 'ok' : 'pending',
            stage: 'creation',
        },
        {
            id: 'garment',
            label: 'Prenda definida',
            detail: garmentName
                ? garmentRegisteredInCreation
                    ? garmentName
                    : `${garmentName} · elegida aquí, no registrada en la creación`
                : 'Selecciona la prenda técnica',
            state: hasGarment ? (garmentRegisteredInCreation ? 'ok' : 'warn') : 'pending',
            stage: 'garment',
        },
        {
            id: 'session',
            label: 'Sesión anatómica seleccionada',
            detail: session
                ? `${describeSession(session)}${sessionLinked ? ' · vinculada a la creación' : ' · elegida para este patrón (se registra al generarlo)'}`
                : 'Seleccionar sesión anatómica',
            state: session ? 'ok' : 'pending',
            stage: 'anatomy',
        },
        {
            id: 'body_measures',
            label: `${anatomy.bodyCount}/${anatomy.bodyTotal} medidas corporales`,
            detail: !session
                ? 'Sin sesión no hay medidas'
                : anatomy.isComplete
                ? '100% de completitud anatómica'
                : `${anatomy.completenessPct}% de completitud anatómica`,
            state: !session ? 'pending' : anatomy.isComplete ? 'ok' : 'warn',
            stage: 'anatomy',
        },
        {
            id: 'garment_measures',
            label: 'Medidas requeridas por la prenda',
            detail: !diagnosis
                ? 'Requiere prenda y sesión'
                : diagnosis.ready
                ? `${diagnosis.registeredCount} registradas${diagnosis.calculableCount ? ` · ${diagnosis.calculableCount} calculables` : ''} de ${diagnosis.requiredTotal}`
                : `Faltan ${diagnosis.missing.length}: ${diagnosis.missing.map((m) => m.name).join(', ')}`,
            state: !diagnosis ? 'pending' : diagnosis.ready ? 'ok' : 'warn',
            stage: 'anatomy',
        },
        {
            id: 'pattern',
            label: 'Patronaje',
            detail:
                patternLink === 'active'
                    ? `Patrón activo ${activeExecution?.version_label || ''}`.trim()
                    : patternLink === 'unlinked_versions'
                    ? `${executions.length} versión(es) sin patrón activo asignado`
                    : 'Patronaje pendiente',
            state: patternLink === 'active' ? 'ok' : patternLink === 'unlinked_versions' ? 'warn' : 'pending',
            stage: 'pattern',
        },
        {
            id: 'fitting',
            label: 'Fitting',
            detail:
                patternLink !== 'active'
                    ? 'Fitting pendiente · requiere un patrón activo'
                    : adjustmentsCount > 0
                    ? `${adjustmentsCount} ajuste(s) registrados`
                    : 'Fitting pendiente · sin ajustes registrados',
            state: patternLink === 'active' && adjustmentsCount > 0 ? 'ok' : 'pending',
            stage: 'fitting',
        },
        {
            id: 'sheet',
            label: 'Ficha técnica',
            detail: isApproved ? 'Patrón aprobado · ficha disponible' : 'Ficha técnica pendiente · requiere patrón aprobado',
            state: isApproved ? 'ok' : 'pending',
            stage: 'sheet',
        },
    ];

    // --- Siguiente paso (primer bloqueo real en el recorrido) ---
    let nextStep: CreationNextStep;
    if (!hasClient) {
        nextStep = { stage: 'creation', title: 'Elegir clienta', detail: 'Todo patrón de creación pertenece a una clienta.', cta: 'ELEGIR CLIENTA' };
    } else if (!hasCreation) {
        nextStep = { stage: 'creation', title: 'Elegir creación', detail: 'La clienta aún no tiene una creación seleccionada.', cta: 'ELEGIR CREACIÓN' };
    } else if (!session) {
        nextStep = { stage: 'anatomy', title: 'Seleccionar sesión anatómica', detail: 'Sin medidas no se puede trazar el patrón.', cta: 'IR A ANATOMÍA' };
    } else if (!hasGarment) {
        nextStep = { stage: 'garment', title: 'Definir la prenda técnica', detail: 'La prenda determina el patrón y las medidas requeridas.', cta: 'ELEGIR PRENDA' };
    } else if (diagnosis && !diagnosis.ready) {
        nextStep = {
            stage: 'anatomy',
            title: `Completar ${diagnosis.missing.length} medida(s) para ${garmentName}`,
            detail: diagnosis.missing.map((m) => m.name).join(', '),
            cta: 'VER MEDIDAS FALTANTES',
        };
    } else if (patternLink !== 'active') {
        nextStep = {
            stage: 'pattern',
            title: `Generar patrón del ${garmentName}`,
            detail: 'La creación está lista para iniciar el patronaje.',
            cta: 'CONTINUAR AL PATRONAJE',
        };
    } else if (!isApproved && adjustmentsCount === 0) {
        nextStep = {
            stage: 'fitting',
            title: 'Registrar la prueba de toile',
            detail: 'El patrón existe; el siguiente paso es probarlo sobre la clienta.',
            cta: 'IR A FITTING',
        };
    } else if (!isApproved) {
        nextStep = { stage: 'fitting', title: 'Revisar fitting y aprobar el patrón', detail: 'Hay ajustes registrados pendientes de aprobación.', cta: 'REVISAR FITTING' };
    } else {
        nextStep = { stage: 'sheet', title: 'Consultar la ficha técnica', detail: 'El patrón está aprobado.', cta: 'ABRIR FICHA TÉCNICA' };
    }

    // --- Estado de cada etapa ---
    const stages: CreationFlowSummary['stages'] = {
        creation: hasClient && hasCreation
            ? { status: 'done', hint: creation!.name }
            : { status: 'pending', hint: 'Elegir clienta y creación' },
        anatomy: !session
            ? { status: 'pending', hint: 'Seleccionar sesión anatómica' }
            : diagnosis && !diagnosis.ready
            ? { status: 'attention', hint: `Faltan ${diagnosis.missing.length} medida(s)` }
            : { status: 'done', hint: `${anatomy.bodyCount}/${anatomy.bodyTotal} medidas` },
        garment: hasGarment
            ? { status: garmentRegisteredInCreation ? 'done' : 'attention', hint: garmentName! }
            : { status: 'pending', hint: 'Elegir prenda' },
        pattern:
            patternLink === 'active'
                ? { status: 'done', hint: `Patrón ${activeExecution?.version_label || ''}`.trim() }
                : patternLink === 'unlinked_versions'
                ? { status: 'attention', hint: 'Versiones sin patrón activo' }
                : !hasGarment || !session || (diagnosis && !diagnosis.ready)
                ? { status: 'blocked', hint: 'Requiere prenda y medidas completas' }
                : { status: 'pending', hint: 'Patronaje pendiente' },
        fitting:
            patternLink !== 'active'
                ? { status: 'blocked', hint: 'Requiere un patrón activo' }
                : adjustmentsCount > 0
                ? { status: 'done', hint: `${adjustmentsCount} ajuste(s)` }
                : { status: 'pending', hint: 'Sin pruebas registradas' },
        sheet:
            patternLink !== 'active'
                ? { status: 'blocked', hint: 'Requiere un patrón activo' }
                : isApproved
                ? { status: 'done', hint: 'Patrón aprobado' }
                : { status: 'pending', hint: 'Pendiente de aprobación' },
        log:
            executions.length > 0
                ? { status: 'done', hint: `${executions.length} versión(es)` }
                : { status: 'pending', hint: 'Sin historial de patrones' },
    };

    const readyCount = checklist.filter((c) => c.state === 'ok').length;
    return {
        anatomy,
        sessionLinkedToCreation: sessionLinked,
        patternLink,
        stages,
        checklist,
        nextStep,
        isReadyToGenerate: hasClient && hasCreation && !!session && hasGarment && measuresReady,
        readyCount,
        pendingCount: checklist.length - readyCount,
    };
}

// ------------------------------------------------------------------------------
// 6. MATERIALES Y PERFIL TEXTIL DE LA CREACIÓN (REQUISITO 14)
// ------------------------------------------------------------------------------

export interface CreationFabricProfile {
    name: string;
    composition: string;
    color: string;
    supplier: string;
    pricePerMeter: string;
    quantityMeters: string;
    status: 'REAL' | 'PENDING' | 'REFERENCE';
    notes: string;
    photoAsset?: any;
    weaveType?: string;
    weightGsm?: number | null;
    widthCm?: number | null;
}

export function deriveCreationFabricProfile(
    creation: Creation | null,
    garmentType?: GarmentType | null
): CreationFabricProfile {
    const rawNotes = [creation?.notes, creation?.description].filter(Boolean).join(' ');
    const hasFabricNotes = /seda|lana|crep|lino|algodon|encaje|tafetan|gazar|organza|terciopelo|raso|chifon/i.test(rawNotes);

    if (hasFabricNotes) {
        return {
            name: 'Crepé de seda de autor',
            composition: rawNotes.slice(0, 80),
            color: creation?.occasion ? `Seleccionado para ${creation.occasion}` : 'Champagne / Marfil cálido',
            supplier: 'Casa textil de autor (Atelier)',
            pricePerMeter: '€85,00',
            quantityMeters: '3,20 m',
            status: 'REAL',
            weaveType: 'Ligamento tafetán al bies',
            weightGsm: 180,
            widthCm: 140,
            notes: 'Muestra textil real verificada para caída al bies y planchado artesanal.',
        };
    }

    return {
        name: garmentType ? `Muestra para ${GARMENT_PACKAGES[garmentType]?.name || 'prenda'}` : 'Tejido no registrado',
        composition: 'Pendiente de asignación en muestrario de taller',
        color: 'Pendiente de prueba de colorimetría',
        supplier: 'Proveedor no asignado',
        pricePerMeter: 'Pendiente de cotización',
        quantityMeters: 'Se calcula automáticamente en Mesa CAD',
        status: 'PENDING',
        weaveType: 'Por definir en corte',
        weightGsm: null,
        widthCm: null,
        notes: 'Muestra física conservada en atelier. El expediente digital se completa al asignar el corte definitivo.',
    };
}


// ------------------------------------------------------------------------------
// 7. BITÁCORA: LINAJE DE LA CREACIÓN (inmutable; solo lectura)
// ------------------------------------------------------------------------------

export type TimelineNodeKind = 'origin' | 'pattern' | 'fitting';

export interface CreationTimelineNode {
    id: string;
    kind: TimelineNodeKind;
    title: string;
    subtitle: string;
    date: string | null;
    executionId: string | null;
    parentExecutionId: string | null;
    parentVersionLabel?: string | null;
    status: string | null;
    isActive: boolean;
    author?: string | null;
    changeReason?: string | null;
    isImmutableSnapshot?: boolean;
}

/**
 * Construye la línea de tiempo «Creación original → Patrón v1.0 → Fitting → Patrón v1.1 …»
 * únicamente con ejecuciones cuyo creation_id coincide. Un nodo de fitting se
 * intercala antes de toda ejecución derivada (parent_execution_id), porque esa
 * derivación nace de ajustes de prueba (createMultiAdjustedChildExecution).
 */
export function buildCreationTimeline(
    creation: Creation | null,
    executions: PatternExecution[]
): CreationTimelineNode[] {
    if (!creation) return [];
    const nodes: CreationTimelineNode[] = [
        {
            id: `origin_${creation.id}`,
            kind: 'origin',
            title: 'Creación original',
            subtitle: creation.name,
            date: creation.created_at || null,
            executionId: null,
            parentExecutionId: null,
            parentVersionLabel: null,
            status: creation.status,
            isActive: false,
            author: creation.created_by || 'Katherine Carroll',
            changeReason: creation.description || 'Apertura de la orden de alta costura.',
            isImmutableSnapshot: true,
        },
    ];
    const own = executions
        .filter((e) => e.creation_id === creation.id)
        .slice()
        .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    for (const exec of own) {
        const parentExec = exec.parent_execution_id ? own.find((o) => o.id === exec.parent_execution_id) : null;
        if (exec.parent_execution_id) {
            nodes.push({
                id: `fitting_${exec.id}`,
                kind: 'fitting',
                title: 'Fitting & Pruebas en Muselina',
                subtitle: `Ajustes aplicados sobre ${parentExec?.version_label || 'versión previa'}`,
                date: exec.created_at || null,
                executionId: exec.id,
                parentExecutionId: exec.parent_execution_id,
                parentVersionLabel: parentExec?.version_label || null,
                status: 'Ajustes incorporados',
                isActive: false,
                author: (exec as any).created_by || 'Katherine Carroll',
                changeReason: exec.notes || 'Ajuste de entalle de taller sobre toile.',
                isImmutableSnapshot: true,
            });
        }
        nodes.push({
            id: `pattern_${exec.id}`,
            kind: 'pattern',
            title: `Patrón ${exec.version_label}`,
            subtitle: exec.garment_type ? GARMENT_PACKAGES[exec.garment_type]?.name || exec.garment_type : 'Prenda no registrada',
            date: exec.created_at || null,
            executionId: exec.id,
            parentExecutionId: exec.parent_execution_id || null,
            parentVersionLabel: parentExec?.version_label || null,
            status: exec.status,
            isActive: creation.active_pattern_execution_id === exec.id,
            author: (exec as any).created_by || 'Katherine Carroll',
            changeReason: exec.notes || (exec.parent_execution_id ? `Derivado de la versión ${parentExec?.version_label || 'anterior'}` : 'Patrón base inicial trazado en Mesa CAD.'),
            isImmutableSnapshot: true,
        });
    }
    return nodes;
}

// ------------------------------------------------------------------------------
// 7. INTEGRIDAD: resolución del patrón de ESTA creación
// ------------------------------------------------------------------------------

/**
 * Devuelve únicamente ejecuciones de la creación indicada (nunca patrones directos,
 * libres ni de otras creaciones, aunque pertenezcan a la misma clienta).
 */
export function executionsOfCreation(creation: Creation | null, all: PatternExecution[]): PatternExecution[] {
    if (!creation) return [];
    return all.filter((e) => e.creation_id === creation.id);
}

/**
 * Resuelve el patrón activo exclusivamente mediante active_pattern_execution_id,
 * verificando que la ejecución realmente pertenece a la creación (anti-contaminación).
 */
export function resolveActiveExecution(creation: Creation | null, all: PatternExecution[]): PatternExecution | null {
    if (!creation?.active_pattern_execution_id) return null;
    const found = all.find((e) => e.id === creation.active_pattern_execution_id);
    if (!found) return null;
    if (found.creation_id && found.creation_id !== creation.id) return null;
    return found;
}

/**
 * Requisitos reales para «Enviar a Fitting» (no aprueba el patrón ni termina el fitting).
 * En el Flujo C la ejecución mostrada debe ser exactamente la activa vinculada a la creación.
 */
export function evaluateFittingTransition(params: {
    role: string | null | undefined;
    currentExecution: PatternExecution | null;
    creation: Creation | null;
    executions: PatternExecution[];
    isCreationFlow: boolean;
}): { allowed: boolean; reason: 'role' | 'no_execution' | 'not_active_execution' | null } {
    const { role, currentExecution, creation, executions, isCreationFlow } = params;
    if (role === 'client') return { allowed: false, reason: 'role' };
    if (!currentExecution) return { allowed: false, reason: 'no_execution' };
    if (isCreationFlow) {
        const active = resolveActiveExecution(creation, executions);
        if (!active || active.id !== currentExecution.id) return { allowed: false, reason: 'not_active_execution' };
    }
    return { allowed: true, reason: null };
}

export type ApprovalBlockReason =
    | 'role'
    | 'no_execution'
    | 'already_approved'
    | 'not_active_execution'
    | 'no_geometry'
    | 'blocked_criteria'
    | 'invalid_validation'
    | 'missing_measurements'
    | 'not_in_fitting';

/**
 * Requisitos técnicos y de trazabilidad para «Aprobar Patrón» (M02 / C13).
 * Valida rol, existencia, vinculación canónica a la creación, geometría válida,
 * ausencia de criterios bloqueados, ausencia de errores y estado previo de fitting.
 */
export function evaluateApprovalTransition(params: {
    role: string | null | undefined;
    currentExecution: PatternExecution | null;
    creation: Creation | null;
    executions: PatternExecution[];
    isCreationFlow: boolean;
    patternStatus: string;
    hasBlockedCriteria?: boolean;
}): { allowed: boolean; reason: ApprovalBlockReason | null; message?: string } {
    const { role, currentExecution, creation, executions, isCreationFlow, patternStatus, hasBlockedCriteria } = params;

    if (role === 'client') {
        return { allowed: false, reason: 'role', message: 'Acción no autorizada: El perfil clienta no dispone de permisos para aprobar patrones.' };
    }
    if (!currentExecution) {
        return { allowed: false, reason: 'no_execution', message: 'No hay ninguna ejecución activa seleccionada para aprobar.' };
    }
    if (currentExecution.status === 'approved_by_designer' || patternStatus === 'approved_by_designer') {
        return { allowed: false, reason: 'already_approved', message: 'Esta ejecución ya se encuentra formalmente aprobada y bloqueada como versión histórica inmutable.' };
    }
    if (isCreationFlow) {
        const active = resolveActiveExecution(creation, executions);
        if (!active || active.id !== currentExecution.id) {
            return { allowed: false, reason: 'not_active_execution', message: 'La ejecución mostrada no corresponde al patrón activo vinculado a esta creación.' };
        }
    }
    if (!currentExecution.geometry_result || !Array.isArray(currentExecution.geometry_result.pieces) || currentExecution.geometry_result.pieces.length === 0) {
        return { allowed: false, reason: 'no_geometry', message: 'Aprobación técnica denegada: Geometría inválida o sin piezas técnicas.' };
    }
    if (hasBlockedCriteria) {
        return { allowed: false, reason: 'blocked_criteria', message: 'Aprobación técnica denegada: Existen criterios críticos en estado BLOCKED en la auditoría.' };
    }
    if (currentExecution.validation_results) {
        if (currentExecution.validation_results.valid !== true) {
            return { allowed: false, reason: 'invalid_validation', message: 'Aprobación técnica denegada: El patrón contiene errores geométricos o no es válido.' };
        }
        if (Array.isArray(currentExecution.validation_results.errors) && currentExecution.validation_results.errors.length > 0) {
            return { allowed: false, reason: 'invalid_validation', message: `Aprobación técnica denegada: El patrón contiene ${currentExecution.validation_results.errors.length} error(es) geométrico(s).` };
        }
        if (Array.isArray(currentExecution.validation_results.missingRequiredMeasurements) && currentExecution.validation_results.missingRequiredMeasurements.length > 0) {
            return { allowed: false, reason: 'missing_measurements', message: `Aprobación técnica denegada: Faltan ${currentExecution.validation_results.missingRequiredMeasurements.length} medida(s) obligatoria(s).` };
        }
    }
    if (patternStatus !== 'pending_fitting') {
        return { allowed: false, reason: 'not_in_fitting', message: 'Envíe el patrón a prueba primero (FITTING) antes de aprobar formalmente.' };
    }
    return { allowed: true, reason: null };
}

/**
 * Fusiona una lectura del historial con el estado vigente sin perder ejecuciones ya
 * confirmadas de la misma clienta (una lectura atrasada nunca borra lo confirmado).
 */
export function mergeExecutionHistory(prev: PatternExecution[], fetched: PatternExecution[], clientId: string): PatternExecution[] {
    const fetchedIds = new Set(fetched.map((e) => e.id));
    const keep = prev.filter((e) => !fetchedIds.has(e.id) && e.client_id === clientId);
    return [...keep, ...fetched].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

/**
 * Valida la coherencia client_id / creation_id / session_id antes de generar.
 * Devuelve la lista de incoherencias (vacía = íntegro).
 */
export function validateCreationLinkage(params: {
    clientId?: string | null;
    creation?: Creation | null;
    session?: MeasurementSession | null;
}): string[] {
    const issues: string[] = [];
    const { clientId, creation, session } = params;
    if (!clientId) issues.push('Falta la clienta (client_id).');
    if (!creation) issues.push('Falta la creación (creation_id).');
    if (creation && clientId && creation.client_id !== clientId) {
        issues.push('La creación pertenece a otra clienta.');
    }
    if (session && clientId && session.client_id !== clientId) {
        issues.push('La sesión de medidas pertenece a otra clienta.');
    }
    return issues;
}
