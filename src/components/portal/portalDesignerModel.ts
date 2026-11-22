// ==============================================================================
// ATELIER DIGITAL — MODELO Y REGLAS MIXTAS UI: PORTAL DE CLIENTAS (M09)
// Archivo: src/components/portal/portalDesignerModel.ts
// ==============================================================================
// Capa pura local en memoria para la interfaz de gestión del Portal desde el
// perfil de la diseñadora.
//
// GARANTÍAS:
// - Cero imports ni llamadas a Supabase / PostgREST / Edge Functions.
// - Todos los permisos de consulta y acciones inician estrictamente en false
//   (principio Zero Trust DEFAULT false).
// - Implementa el modelo mixto aprobado M09: Nivel 1 Global, Nivel 2 Doble
//   Candado por creación (con precedencia deny-overrides en cotizaciones) y
//   Acciones Habilitadas futuras.
// - Proyección segura de datos: excluye datos reservados del taller.
// ==============================================================================

import {
    PORTAL_ACTIONS,
    PORTAL_RESOURCES,
    PortalAccessStatus,
    PortalAction,
    PortalResource,
} from '../../types/portal';

export type PortalAccessLifecycleViewStatus = PortalAccessStatus | 'unprovisioned';

export type CreationQuoteOverrideMode = 'inherit' | 'allow' | 'deny';

export interface PortalSafeCreationSummary {
    readonly id: string;
    readonly name: string;
    readonly garmentType: string;
    readonly stageLabel: string;
    readonly targetDate: string | null;
}

export interface PortalSafeClientSummary {
    readonly id: string;
    readonly fullName: string;
    readonly email: string;
    readonly city: string;
    readonly clientStatus: 'active' | 'archived';
    readonly accessStatus: PortalAccessLifecycleViewStatus;
    readonly authUserIdMask: string | null;
    readonly lastAccessUpdate: string | null;
    readonly confirmedAt: string | null;
    readonly isLocalReference: true;
    readonly creations: readonly PortalSafeCreationSummary[];
}

export interface PortalPermissionDraftState {
    globalGrants: Record<string, boolean>;
    creationGrants: Record<string, Record<string, boolean>>;
    creationQuoteOverrides: Record<string, CreationQuoteOverrideMode>;
}

export interface PortalAccessStatusUiMeta {
    status: PortalAccessLifecycleViewStatus;
    label: string;
    shortLabel: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    headline: string;
    clientVisibilitySummary: string;
    canPreviewActive: boolean;
}

export interface PortalPermissionCatalogItem {
    key: string;
    resource: PortalResource;
    action: PortalAction;
    title: string;
    subtitle: string;
    scopeLabel: string;
    privacyLimit: string;
    pendingBackendNote?: string;
}

export interface PortalPendingBackendDependency {
    id: string;
    phase: string;
    title: string;
    detail: string;
}

export type PortalDraftEvaluationReason =
    | 'allowed'
    | 'disabled_zero_trust'
    | 'blocked_by_access_status'
    | 'blocked_by_double_lock'
    | 'blocked_global_scope_forbidden'
    | 'denied_by_override';

export interface PortalDraftEvaluationResult {
    draftConfigured: boolean;
    effectiveAllowed: boolean;
    reason: PortalDraftEvaluationReason;
}

export interface PortalDraftSummary {
    globalReadEnabled: number;
    creationReadEnabled: number;
    actionEnabled: number;
    totalEnabled: number;
    effectiveVisibleCount: number;
    isZeroTrustDefault: boolean;
}

export function makePermissionKey(resource: PortalResource, action: PortalAction): string {
    return `${resource}:${action}`;
}

export function isCanonicalResourceAction(resource: PortalResource, action: PortalAction): boolean {
    return PORTAL_RESOURCES.includes(resource) && PORTAL_ACTIONS.includes(action);
}

/**
 * Recursos de consulta de alta costura restringidos estrictamente al Nivel 2
 * (Doble Candado por creation_id). Nunca pueden otorgarse como globales (action = 'view').
 */
export const CREATION_SCOPED_ONLY_VIEW_RESOURCES: readonly PortalResource[] = [
    'creations',
    'sketches',
    'fabrics',
    'fittings',
    '3d_viewer',
];

export const ACCESS_STATUS_META: Record<
    PortalAccessLifecycleViewStatus,
    PortalAccessStatusUiMeta
> = {
    active: {
        status: 'active',
        label: 'ACTIVA',
        shortLabel: 'Activa',
        badgeBg: '#EBF4ED',
        badgeText: '#2F5B39',
        badgeBorder: '#B7D4BE',
        headline: 'Cuenta vinculada y habilitada',
        clientVisibilitySummary:
            'La clienta solo puede consultar en su portal los módulos y prendas autorizadas expresamente (por defecto, cero hasta activar interruptores).',
        canPreviewActive: true,
    },
    invited: {
        status: 'invited',
        label: 'INVITADA',
        shortLabel: 'Invitada',
        badgeBg: '#FAF3E5',
        badgeText: '#7D581D',
        badgeBorder: '#E5CE9E',
        headline: 'Invitación pendiente de aceptación',
        clientVisibilitySummary:
            'El enlace aún no ha sido aceptado ni vinculado a una cuenta autenticada. Cero exposición efectiva hasta completar onboarding.',
        canPreviewActive: false,
    },
    unprovisioned: {
        status: 'unprovisioned',
        label: 'SIN APROVISIONAR',
        shortLabel: 'Sin aprovisionar',
        badgeBg: '#F2ECE4',
        badgeText: '#6F645A',
        badgeBorder: '#DED3C4',
        headline: 'Expediente sin acceso al portal emitido',
        clientVisibilitySummary:
            'La clienta no dispone todavía de registro en el portal ni invitación generada. Permisos bloqueados en cero.',
        canPreviewActive: false,
    },
    suspended: {
        status: 'suspended',
        label: 'SUSPENDIDA',
        shortLabel: 'Suspendida',
        badgeBg: '#F9F0E3',
        badgeText: '#8E5617',
        badgeBorder: '#E3C39B',
        headline: 'Acceso pausado temporalmente',
        clientVisibilitySummary:
            'La cuenta permanece suspendida en pausa administrativa: aunque exista borrador configurado, la clienta visualiza pantalla restringida y cero datos.',
        canPreviewActive: false,
    },
    revoked: {
        status: 'revoked',
        label: 'REVOCADA',
        shortLabel: 'Revocada',
        badgeBg: '#FAF0F0',
        badgeText: '#8E2D2D',
        badgeBorder: '#E4BABA',
        headline: 'Acceso revocado definitivamente',
        clientVisibilitySummary:
            'El acceso ha sido cerrado de forma permanente. Cualquier consulta futura queda bloqueada incluso con sesión previa.',
        canPreviewActive: false,
    },
};

export const GLOBAL_READ_ITEMS: readonly PortalPermissionCatalogItem[] = [
    {
        key: makePermissionKey('appointments', 'view'),
        resource: 'appointments',
        action: 'view',
        title: 'Citas y Agenda del Atelier (M08)',
        subtitle:
            'Calendario de citas reservadas para la clienta, horarios en hora local de Colombia y espacio de atención.',
        scopeLabel: 'Nivel 1 · Alcance Global por Clienta',
        privacyLimit: 'Excluye actividades internas del taller y citas sin clienta.',
    },
    {
        key: makePermissionKey('measurements', 'view'),
        resource: 'measurements',
        action: 'view',
        title: 'Sesiones de Toma de Medidas (M02)',
        subtitle:
            'Historial fechado de sesiones completadas o verificadas y sistema de unidades oficial.',
        scopeLabel: 'Nivel 1 · Alcance Global por Clienta',
        privacyLimit: 'Solo resumen de sesiones certificadas · Sin cotas anatómicas ni apuntes reservados.',
    },
    {
        key: makePermissionKey('quotations', 'view'),
        resource: 'quotations',
        action: 'view',
        title: 'Cotizaciones Comerciales Emitidas (M03)',
        subtitle:
            'Documento comercial oficial en estado enviado, aceptado o expirado, con plan de pagos acordado.',
        scopeLabel: 'Nivel 1 · Global heredable por prenda',
        privacyLimit: 'Solo resumen comercial al cliente · Excluye borradores y datos internos reservados.',
    },
];

export const CREATION_READ_ITEMS: readonly PortalPermissionCatalogItem[] = [
    {
        key: makePermissionKey('sketches', 'view'),
        resource: 'sketches',
        action: 'view',
        title: 'Bocetos y Concepto Estético',
        subtitle: 'Láminas de ilustración, silueta y dirección artística de la prenda.',
        scopeLabel: 'Nivel 2 · Requiere prenda visible',
        privacyLimit: 'Solo recursos visuales aprobados para curaduría de clienta.',
    },
    {
        key: makePermissionKey('fabrics', 'view'),
        resource: 'fabrics',
        action: 'view',
        title: 'Telas y Materialidad Seleccionada',
        subtitle: 'Muestras textiles asignadas a la creación y acabados sartoriales.',
        scopeLabel: 'Nivel 2 · Requiere prenda visible',
        privacyLimit: 'Solo nombre y acabado estético · Sin datos comerciales de adquisición ni existencias.',
    },
    {
        key: makePermissionKey('fittings', 'view'),
        resource: 'fittings',
        action: 'view',
        title: 'Pruebas y Calce (M06)',
        subtitle: 'Rondas de prueba físicas confirmadas con resumen apto para clienta.',
        scopeLabel: 'Nivel 2 · Doble candado M06 + Creación',
        privacyLimit: 'Solo rondas en visibilidad pública resumida · Excluye sesiones canceladas o internas.',
    },
    {
        key: makePermissionKey('3d_viewer', 'view'),
        resource: '3d_viewer',
        action: 'view',
        title: 'Visor 3D de Silueta Sartorial',
        subtitle: 'Visualización volumétrica interactiva de la silueta autorizada.',
        scopeLabel: 'Nivel 2 · Requiere prenda visible',
        privacyLimit: 'Solo silueta autorizada · Pendiente integración backend de escena.',
        pendingBackendNote: 'Pendiente servicio 3D M09',
    },
];

export const ENABLED_ACTION_ITEMS: readonly PortalPermissionCatalogItem[] = [
    {
        key: makePermissionKey('sketches', 'approve'),
        resource: 'sketches',
        action: 'approve',
        title: 'Aprobación Digital de Bocetos',
        subtitle: 'Habilita el visto bueno formal de la clienta sobre propuestas visuales de diseño.',
        scopeLabel: 'Acción Mixta · Por creación autorizada o global',
        privacyLimit: 'Requiere flujo transaccional auditado para registrar conformidad.',
        pendingBackendNote: 'Dependiente de M09-C (sin persistencia aún)',
    },
    {
        key: makePermissionKey('messaging', 'observe'),
        resource: 'messaging',
        action: 'observe',
        title: 'Observaciones y Comentarios de Diseño',
        subtitle: 'Habilita el envío de notas editoriales de la clienta respecto a su prenda.',
        scopeLabel: 'Acción Mixta · Hilo moderado',
        privacyLimit: 'Aislado de notas privadas de taller.',
        pendingBackendNote: 'Dependiente de M09-D (sin persistencia aún)',
    },
    {
        key: makePermissionKey('sketches', 'download'),
        resource: 'sketches',
        action: 'download',
        title: 'Descarga de Dossier / Bocetos',
        subtitle: 'Autoriza emisión de enlaces firmados de corta duración para archivos visuales.',
        scopeLabel: 'Acción Mixta · URL firmada',
        privacyLimit: 'Sin exposición directa de buckets privados del taller.',
        pendingBackendNote: 'Dependiente de Edge Storage firmado',
    },
    {
        key: makePermissionKey('quotations', 'download'),
        resource: 'quotations',
        action: 'download',
        title: 'Descarga de Cotización Formal (PDF)',
        subtitle: 'Permite descargar copia del resumen comercial oficial emitido.',
        scopeLabel: 'Acción Mixta · Solo cotización aprobada',
        privacyLimit: 'Únicamente resumen comercial público para la clienta.',
        pendingBackendNote: 'Dependiente de generador PDF firmado',
    },
];

function freezeSafeClients(clients: PortalSafeClientSummary[]): readonly PortalSafeClientSummary[] {
    return Object.freeze(
        clients.map((client) =>
            Object.freeze({
                ...client,
                creations: Object.freeze(client.creations.map((cr) => Object.freeze({ ...cr }))),
            })
        )
    );
}

export const LOCAL_REFERENCE_PORTAL_CLIENTS: readonly PortalSafeClientSummary[] = freezeSafeClients([
    {
        id: 'ref-client-valeria-01',
        fullName: 'Valeria Mendoza Restrepo',
        email: 'valeria.mendoza@clientas.example',
        city: 'Bogotá D. C.',
        clientStatus: 'active',
        accessStatus: 'active',
        authUserIdMask: '···8f41c2',
        lastAccessUpdate: '2026-11-18',
        confirmedAt: '2026-11-12',
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-01a',
                name: 'Vestido Novia Alabastro — Corte Imperio',
                garmentType: 'Alta Costura Nupcial',
                stageLabel: 'Prueba en tela definitiva',
                targetDate: '2026-12-18',
            },
            {
                id: 'ref-creation-01b',
                name: 'Capa Ceremonial Organza de Seda',
                garmentType: 'Sobremedida Gala',
                stageLabel: 'Diseño conceptual aprobado',
                targetDate: '2026-12-18',
            },
        ],
    },
    {
        id: 'ref-client-camila-02',
        fullName: 'Camila Valencia Ospina',
        email: 'camila.valencia@clientas.example',
        city: 'Medellín',
        clientStatus: 'active',
        accessStatus: 'invited',
        authUserIdMask: null,
        lastAccessUpdate: '2026-11-19',
        confirmedAt: null,
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-02a',
                name: 'Traje Sastre Crepé Marfil',
                garmentType: 'Sastrería Femenina',
                stageLabel: 'Primera prueba en glasilla',
                targetDate: '2027-01-24',
            },
        ],
    },
    {
        id: 'ref-client-sofia-03',
        fullName: 'Sofía Arango Londoño',
        email: 'sofia.arango@clientas.example',
        city: 'Cartagena',
        clientStatus: 'active',
        accessStatus: 'unprovisioned',
        authUserIdMask: null,
        lastAccessUpdate: null,
        confirmedAt: null,
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-03a',
                name: 'Vestido Gala Lino Noche',
                garmentType: 'Edición de Autor',
                stageLabel: 'Consulta inicial',
                targetDate: '2027-02-10',
            },
        ],
    },
    {
        id: 'ref-client-isabela-04',
        fullName: 'Isabela Duarte Samper',
        email: 'isabela.duarte@clientas.example',
        city: 'Bogotá D. C.',
        clientStatus: 'active',
        accessStatus: 'suspended',
        authUserIdMask: '···39a0e4',
        lastAccessUpdate: '2026-11-15',
        confirmedAt: '2026-10-29',
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-04a',
                name: 'Conjunto Gala Satén Duquesa',
                garmentType: 'Alta Costura Gala',
                stageLabel: 'Pausa administrativa',
                targetDate: null,
            },
        ],
    },
    {
        id: 'ref-client-lucia-05',
        fullName: 'Lucía Peñaranda Gómez',
        email: 'lucia.penaranda@clientas.example',
        city: 'Cali',
        clientStatus: 'archived',
        accessStatus: 'revoked',
        authUserIdMask: '···7c19b8',
        lastAccessUpdate: '2026-11-04',
        confirmedAt: '2026-09-14',
        isLocalReference: true,
        creations: [],
    },
]);

export const M09_PENDING_BACKEND_DEPENDENCIES: readonly PortalPendingBackendDependency[] = [
    {
        id: 'dep-e1-sql',
        phase: 'Entrega E1',
        title: 'Migración SQL y Políticas RLS de M09 sin Ejecutar',
        detail:
            'Tablas client_portal_access, client_portal_permissions, client_portal_invitations y 6 vistas protegidas pendientes de validación en Staging PostgreSQL 17.11.',
    },
    {
        id: 'dep-persist-perms',
        phase: 'Entrega E1 / E4',
        title: 'Persistencia Real y Transaccionalidad de Cambios',
        detail:
            'Guardar configuración de acceso, modificar estados de ciclo de vida y auditar cambios business en client_portal_activity_log permanecen bloqueados hasta desplegar E1.',
    },
    {
        id: 'dep-e2-edge',
        phase: 'Entrega E2',
        title: 'Edge Function de Invitaciones y Correo Automático',
        detail:
            'La emisión criptográfica, reserva temporal Saga (claim/release/finalize), vinculación JWT y envío de correo aún no cuentan con Edge Function desplegada.',
    },
    {
        id: 'dep-e3-views',
        phase: 'Entrega E3',
        title: 'Lectura Protegida en Vistas Canónicas y Telemetría',
        detail:
            'Consumo remoto real en v_portal_* bajo atelier_portal_reader con security_barrier=true y registro por log_portal_event() pendientes de entorno Staging.',
    },
    {
        id: 'dep-future-actions',
        phase: 'M09-C / M09-D',
        title: 'Flujos Interactivos de Aprobación, Mensajería, 3D y Descargas',
        detail:
            'Las acciones sketches:approve, messaging:observe, 3d_viewer:view y descargas firmadas son configurables en borrador visual, pendientes de backend específico.',
    },
];

export function createEmptyDraftPermissions(): PortalPermissionDraftState {
    return {
        globalGrants: {},
        creationGrants: {},
        creationQuoteOverrides: {},
    };
}

export function toggleGlobalDraftPermission(
    draft: PortalPermissionDraftState,
    resource: PortalResource,
    action: PortalAction
): PortalPermissionDraftState {
    if (!isCanonicalResourceAction(resource, action)) {
        return draft;
    }
    if (action === 'view' && CREATION_SCOPED_ONLY_VIEW_RESOURCES.includes(resource)) {
        return draft;
    }
    const key = makePermissionKey(resource, action);
    const current = Boolean(draft.globalGrants[key]);
    const nextGlobalGrants = { ...draft.globalGrants };
    if (current) {
        delete nextGlobalGrants[key];
    } else {
        nextGlobalGrants[key] = true;
    }
    return {
        ...draft,
        globalGrants: nextGlobalGrants,
    };
}

export function toggleCreationDraftPermission(
    draft: PortalPermissionDraftState,
    creationId: string,
    resource: PortalResource,
    action: PortalAction
): PortalPermissionDraftState {
    if (!creationId || !isCanonicalResourceAction(resource, action)) {
        return draft;
    }

    const key = makePermissionKey(resource, action);
    const currentForCreation = draft.creationGrants[creationId] || {};
    const masterVisible = Boolean(currentForCreation[makePermissionKey('creations', 'view')]);

    // Regla Doble Candado: desactivar creations:view limpia todos los subpermisos dependientes
    if (resource === 'creations' && action === 'view') {
        if (masterVisible) {
            const nextCreationGrants = { ...draft.creationGrants };
            delete nextCreationGrants[creationId];
            const nextQuoteOverrides = { ...draft.creationQuoteOverrides };
            delete nextQuoteOverrides[creationId];
            return {
                ...draft,
                creationGrants: nextCreationGrants,
                creationQuoteOverrides: nextQuoteOverrides,
            };
        }

        return {
            ...draft,
            creationGrants: {
                ...draft.creationGrants,
                [creationId]: {
                    ...currentForCreation,
                    [key]: true,
                },
            },
        };
    }

    // Bloqueo Zero Trust: ningun subpermiso por prenda puede activarse si creations:view esta apagado
    if (!masterVisible) {
        return draft;
    }

    const nextForCreation = { ...currentForCreation };
    if (nextForCreation[key]) {
        delete nextForCreation[key];
    } else {
        nextForCreation[key] = true;
    }

    return {
        ...draft,
        creationGrants: {
            ...draft.creationGrants,
            [creationId]: nextForCreation,
        },
    };
}

export function setCreationQuoteOverride(
    draft: PortalPermissionDraftState,
    creationId: string,
    mode: CreationQuoteOverrideMode
): PortalPermissionDraftState {
    if (!creationId) {
        return draft;
    }

    const nextOverrides = { ...draft.creationQuoteOverrides };
    if (mode === 'inherit') {
        delete nextOverrides[creationId];
    } else {
        nextOverrides[creationId] = mode;
    }

    return {
        ...draft,
        creationQuoteOverrides: nextOverrides,
    };
}

export function evaluateMixedDraftPermission(params: {
    accessStatus: PortalAccessLifecycleViewStatus;
    draft: PortalPermissionDraftState;
    resource: PortalResource;
    action: PortalAction;
    creationId?: string | null;
}): PortalDraftEvaluationResult {
    const { accessStatus, draft, resource, action, creationId = null } = params;
    const isActiveAccess = accessStatus === 'active';
    const key = makePermissionKey(resource, action);

    if (creationId === null) {
        if (action === 'view' && CREATION_SCOPED_ONLY_VIEW_RESOURCES.includes(resource)) {
            return {
                draftConfigured: false,
                effectiveAllowed: false,
                reason: 'blocked_global_scope_forbidden',
            };
        }
        const draftConfigured = Boolean(draft.globalGrants[key]);
        if (!draftConfigured) {
            return { draftConfigured: false, effectiveAllowed: false, reason: 'disabled_zero_trust' };
        }
        if (!isActiveAccess) {
            return { draftConfigured: true, effectiveAllowed: false, reason: 'blocked_by_access_status' };
        }
        return { draftConfigured: true, effectiveAllowed: true, reason: 'allowed' };
    }

    const creationMap = draft.creationGrants[creationId] || {};
    const masterVisible = Boolean(creationMap[makePermissionKey('creations', 'view')]);

    // Precedencia deny-overrides explícita para cotizaciones por creación
    if (resource === 'quotations' && action === 'view') {
        const overrideMode = draft.creationQuoteOverrides[creationId] || 'inherit';
        if (overrideMode === 'deny') {
            return {
                draftConfigured: false,
                effectiveAllowed: false,
                reason: 'denied_by_override',
            };
        }
        if (!masterVisible) {
            return {
                draftConfigured: overrideMode === 'allow',
                effectiveAllowed: false,
                reason: 'blocked_by_double_lock',
            };
        }
        const globalQuoteEnabled = Boolean(draft.globalGrants[makePermissionKey('quotations', 'view')]);
        const quoteAllowedByModel = overrideMode === 'allow' ? true : globalQuoteEnabled;
        if (!quoteAllowedByModel) {
            return { draftConfigured: false, effectiveAllowed: false, reason: 'disabled_zero_trust' };
        }
        if (!isActiveAccess) {
            return { draftConfigured: true, effectiveAllowed: false, reason: 'blocked_by_access_status' };
        }
        return { draftConfigured: true, effectiveAllowed: true, reason: 'allowed' };
    }

    if (resource === 'creations' && action === 'view') {
        if (!masterVisible) {
            return { draftConfigured: false, effectiveAllowed: false, reason: 'disabled_zero_trust' };
        }
        if (!isActiveAccess) {
            return { draftConfigured: true, effectiveAllowed: false, reason: 'blocked_by_access_status' };
        }
        return { draftConfigured: true, effectiveAllowed: true, reason: 'allowed' };
    }

    if (!masterVisible) {
        return {
            draftConfigured: Boolean(creationMap[key]),
            effectiveAllowed: false,
            reason: 'blocked_by_double_lock',
        };
    }

    const specificGranted = Boolean(creationMap[key]);
    if (!specificGranted) {
        return { draftConfigured: false, effectiveAllowed: false, reason: 'disabled_zero_trust' };
    }
    if (!isActiveAccess) {
        return { draftConfigured: true, effectiveAllowed: false, reason: 'blocked_by_access_status' };
    }
    return { draftConfigured: true, effectiveAllowed: true, reason: 'allowed' };
}

export function summarizeDraftPermissions(
    draft: PortalPermissionDraftState,
    client: PortalSafeClientSummary
): PortalDraftSummary {
    let globalReadEnabled = 0;
    let actionEnabled = 0;
    let creationReadEnabled = 0;
    let effectiveVisibleCount = 0;

    for (const item of GLOBAL_READ_ITEMS) {
        const evalRes = evaluateMixedDraftPermission({
            accessStatus: client.accessStatus,
            draft,
            resource: item.resource,
            action: item.action,
            creationId: null,
        });
        if (evalRes.draftConfigured) {
            globalReadEnabled += 1;
        }
        if (evalRes.effectiveAllowed) {
            effectiveVisibleCount += 1;
        }
    }

    for (const item of ENABLED_ACTION_ITEMS) {
        const evalRes = evaluateMixedDraftPermission({
            accessStatus: client.accessStatus,
            draft,
            resource: item.resource,
            action: item.action,
            creationId: null,
        });
        if (evalRes.draftConfigured) {
            actionEnabled += 1;
        }
        if (evalRes.effectiveAllowed) {
            effectiveVisibleCount += 1;
        }
    }

    for (const creation of client.creations) {
        const masterEval = evaluateMixedDraftPermission({
            accessStatus: client.accessStatus,
            draft,
            resource: 'creations',
            action: 'view',
            creationId: creation.id,
        });
        if (masterEval.draftConfigured) {
            creationReadEnabled += 1;
        }
        if (masterEval.effectiveAllowed) {
            effectiveVisibleCount += 1;
        }

        for (const subItem of CREATION_READ_ITEMS) {
            const subEval = evaluateMixedDraftPermission({
                accessStatus: client.accessStatus,
                draft,
                resource: subItem.resource,
                action: subItem.action,
                creationId: creation.id,
            });
            if (subEval.draftConfigured) {
                creationReadEnabled += 1;
            }
            if (subEval.effectiveAllowed) {
                effectiveVisibleCount += 1;
            }
        }

        const quoteOverride = draft.creationQuoteOverrides[creation.id] || 'inherit';
        if (quoteOverride === 'allow') {
            creationReadEnabled += 1;
            const quoteEval = evaluateMixedDraftPermission({
                accessStatus: client.accessStatus,
                draft,
                resource: 'quotations',
                action: 'view',
                creationId: creation.id,
            });
            if (quoteEval.effectiveAllowed) {
                effectiveVisibleCount += 1;
            }
        }
    }

    const totalEnabled = globalReadEnabled + creationReadEnabled + actionEnabled;
    const hasCustomQuoteOverrides = Object.values(draft.creationQuoteOverrides).some(
        (mode) => mode !== 'inherit'
    );

    return {
        globalReadEnabled,
        creationReadEnabled,
        actionEnabled,
        totalEnabled,
        effectiveVisibleCount,
        isZeroTrustDefault: totalEnabled === 0 && !hasCustomQuoteOverrides,
    };
}
